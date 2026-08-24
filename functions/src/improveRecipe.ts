import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  buildIngredientMap,
  calculateRecipeCost,
  recommendMenuPrice,
  type Ingredient,
  type RecipeIngredientInput,
} from "./pricing";

const ImprovedRecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  instructions: z.array(z.string()).min(1),
  ingredients: z
    .array(
      z.object({
        ingredientName: z.string(),
        quantity: z.number().positive(),
        unit: z.string(),
      })
    )
    .min(1),
  /** Concrete, chef-facing bullet list of what changed and why. */
  changesSummary: z.array(z.string()).min(1).max(8),
});

/**
 * Regenerates a recipe (v1 -> v2, or v2 -> v3, ...) from real feedback.
 * Callable, not an HTTP route — this gets `request.auth` for free from
 * firebase-admin with no manual JWT verification, unlike the Next.js API
 * routes (which can't use firebase-admin on Vercel — see verifyIdToken.ts).
 *
 * Input is deliberately just { recipeId } — the feedback used to drive the
 * (paid) Claude call is read server-side from Firestore, not accepted from
 * the client, so a buggy or malicious client can't fabricate what feeds the
 * prompt. restaurantId is likewise derived from the caller's own users/{uid}
 * doc, never trusted from the client. See chunk 7 plan, correction #4.
 */
export const improveRecipe = onCall(
  { region: "us-central1", secrets: ["CLAUDE_API_KEY"], timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const recipeId = request.data?.recipeId;
    if (typeof recipeId !== "string" || !recipeId) {
      throw new HttpsError("invalid-argument", "recipeId is required.");
    }

    const db = getFirestore();
    const uid = request.auth.uid;

    const userSnap = await db.doc(`users/${uid}`).get();
    const restaurantId = userSnap.data()?.restaurantId;
    if (!restaurantId) {
      throw new HttpsError("failed-precondition", "No restaurant profile found for this account.");
    }

    const recipeRef = db.doc(`recipes/${recipeId}`);
    const recipeSnap = await recipeRef.get();
    if (!recipeSnap.exists) {
      throw new HttpsError("not-found", "Recipe not found.");
    }
    const recipe = recipeSnap.data()!;

    // Admin SDK bypasses Firestore rules entirely — this check IS the
    // authorization here, not a redundant belt-and-suspenders one.
    if (recipe.restaurantId !== restaurantId) {
      throw new HttpsError("permission-denied", "This recipe doesn't belong to your restaurant.");
    }
    if (recipe.status === "superseded") {
      throw new HttpsError(
        "failed-precondition",
        "This recipe has already been improved — rate the newer version instead."
      );
    }

    const feedbackSnap = await recipeRef.collection("feedback").get();
    if (feedbackSnap.empty) {
      throw new HttpsError("failed-precondition", "No feedback yet to improve this recipe from.");
    }
    const feedbackDocs = feedbackSnap.docs.map((d) => d.data());

    // Aggregate feedback into a plain-text summary for the prompt.
    const issueCounts = new Map<string, number>();
    let tasteSum = 0, tasteN = 0;
    let textureSum = 0, textureN = 0;
    let execSum = 0, execN = 0;
    let costSum = 0, costN = 0;
    let ratingSum = 0;
    let lastRatedAt: FirebaseFirestore.Timestamp | null = null;
    const voiceNotes: string[] = [];
    for (const f of feedbackDocs) {
      ratingSum += typeof f.rating === "number" ? f.rating : 0;
      const createdAt = f.createdAt as FirebaseFirestore.Timestamp | undefined;
      if (createdAt && (!lastRatedAt || createdAt.toMillis() > lastRatedAt.toMillis())) {
        lastRatedAt = createdAt;
      }
      for (const issue of Array.isArray(f.issues) ? f.issues : []) {
        issueCounts.set(issue, (issueCounts.get(issue) ?? 0) + 1);
      }
      if (typeof f.taste === "number") { tasteSum += f.taste; tasteN++; }
      if (typeof f.texture === "number") { textureSum += f.texture; textureN++; }
      if (typeof f.executionTime === "number") { execSum += f.executionTime; execN++; }
      if (typeof f.costAccuracy === "number") { costSum += f.costAccuracy; costN++; }
      if (typeof f.voiceNote === "string" && f.voiceNote.trim()) {
        voiceNotes.push(f.voiceNote.trim());
      }
    }
    const topIssues = [...issueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([issue, count]) => `${issue} (${count}x)`);

    const feedbackSummary = [
      `Average overall rating: ${(ratingSum / feedbackDocs.length).toFixed(1)}/5 across ${feedbackDocs.length} rating(s).`,
      topIssues.length ? `Most common issues reported: ${topIssues.join(", ")}.` : "",
      tasteN ? `Average taste rating: ${(tasteSum / tasteN).toFixed(1)}/5.` : "",
      textureN ? `Average texture rating: ${(textureSum / textureN).toFixed(1)}/5.` : "",
      execN ? `Average execution-time rating: ${(execSum / execN).toFixed(1)}/5 (low = took too long).` : "",
      costN ? `Average cost-accuracy rating: ${(costSum / costN).toFixed(1)}/5 (low = actual cost was off from target).` : "",
      voiceNotes.length ? `Chef notes:\n${voiceNotes.map((n) => `- ${n}`).join("\n")}` : "",
    ].filter(Boolean).join("\n");

    const ingredientLines = (recipe.ingredients as RecipeIngredientInput[])
      .map((i) => `- ${i.quantity} ${i.unit} ${i.ingredientName}`)
      .join("\n");
    const instructionLines = (recipe.instructions as string[])
      .map((step, i) => `${i + 1}. ${step}`)
      .join("\n");

    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(ImprovedRecipeSchema) },
      system:
        "You are a professional recipe developer improving an existing restaurant recipe based on real feedback from kitchen staff who cooked and served it. Keep the dish's essence — same core format and cuisine — while directly and concretely addressing the issues raised.",
      messages: [
        {
          role: "user",
          content: `Original recipe: ${recipe.name}
${recipe.description}

Ingredients (serves ${recipe.servings}):
${ingredientLines}

Instructions:
${instructionLines}

Feedback from the kitchen:
${feedbackSummary}

Improve this recipe to directly address the feedback above while keeping its essence and still serving ${recipe.servings} portions. Only introduce a new ingredient if it's clearly needed to fix a named issue, and keep to common, likely-available ingredients if so. Return the improved name, description, full ingredient list (ingredientName/quantity/unit — no cost or price info), full instructions, and changesSummary: a short, concrete bullet list (3-6 items) of what changed and why, written for a chef (e.g. "Reduced salt ~15% — several notes flagged it as too salty").`,
        },
      ],
    });

    if (!response.parsed_output) {
      throw new HttpsError("internal", "Model did not return a parseable recipe.");
    }
    const improved = response.parsed_output;

    // Cost is server-authoritative here too (chunk 6.1's rule: never trust
    // the model for cost, only our own catalog data) — recipes stay
    // client-immutable, so this must land fully-priced in one write.
    const ingredientsSnap = await db.collection("ingredients").get();
    const catalog: Ingredient[] = ingredientsSnap.docs.map((d) => {
      const data = d.data();
      return {
        name: data.name,
        unit: data.unit,
        currentCost: data.currentCost,
        trimLoss: data.trimLoss,
      };
    });
    const ingredientMap = buildIngredientMap(catalog);
    const breakdown = calculateRecipeCost(improved.ingredients, ingredientMap, recipe.servings);
    const menuPrices = recommendMenuPrice(breakdown.costPerPortion);

    const newRef = db.collection("recipes").doc();
    const batch = db.batch();
    batch.set(newRef, {
      name: improved.name,
      description: improved.description,
      instructions: improved.instructions,
      ingredients: improved.ingredients,
      changesSummary: improved.changesSummary,
      cuisine: recipe.cuisine,
      dishType: recipe.dishType,
      style: recipe.style,
      servings: recipe.servings,
      restaurantId,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      version: (recipe.version ?? 1) + 1,
      baseRecipeId: recipe.baseRecipeId ?? recipeId,
      status: "active",
      // Computed fresh from the feedback just read above, NOT copied from
      // recipe.aggregateRating — that field is only kept current by the
      // aggregateRecipeRating trigger, which runs asynchronously off of
      // feedback writes and isn't guaranteed to have completed by the time
      // this callable reads the doc. Using our own just-read feedbackDocs
      // avoids a race that would otherwise let v2 launch with a stale (or
      // 0/0) rating while v1 shows the real one. aggregateRecipeRating
      // still keeps both docs in sync for any feedback added after this.
      aggregateRating: feedbackDocs.length > 0 ? ratingSum / feedbackDocs.length : 0,
      ratingCount: feedbackDocs.length,
      lastRatedAt,
      totalCost: breakdown.totalCost,
      costPerPortion: breakdown.costPerPortion,
      menuPrices,
    });
    batch.update(recipeRef, { status: "superseded" });
    await batch.commit();

    return { recipeId: newRef.id };
  }
);
