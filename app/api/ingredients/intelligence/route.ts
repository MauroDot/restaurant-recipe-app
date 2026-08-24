import { verifyFirebaseIdToken } from "@/lib/verifyIdToken";
import { getDocument, runQuery } from "@/lib/firestoreRest";
import { computePriceTrend } from "@/lib/costAnalysis";
import type { IngredientIntelligenceCache } from "@/lib/types";

function unauthorized(): Response {
  return new Response(JSON.stringify({ message: "Unauthorized." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * GET /api/ingredients/intelligence?ingredientId=Y
 *
 * No `restaurantId` param — deliberately derived server-side from the
 * caller's own token (see chunk 7 plan, correction #5), not accepted from
 * the client. All Firestore reads here go through the caller's own ID
 * token (src/lib/firestoreRest.ts), so firestore.rules' isRestaurantMember()
 * is what actually enforces restaurant scoping — this route doesn't
 * re-implement that check.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;
  if (!idToken) return unauthorized();

  let uid: string;
  try {
    ({ uid } = await verifyFirebaseIdToken(idToken));
  } catch {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const ingredientId = searchParams.get("ingredientId");
  if (!ingredientId) return badRequest("ingredientId is required.");

  const userDoc = await getDocument(idToken, `users/${uid}`);
  const restaurantId = userDoc?.restaurantId;
  if (typeof restaurantId !== "string" || !restaurantId) {
    return badRequest("No restaurant profile found for this account.");
  }

  const [cacheDoc, ingredientDoc, costHistoryRows] = await Promise.all([
    getDocument(
      idToken,
      `restaurants/${restaurantId}/ingredientIntelligenceCache/${ingredientId}`
    ),
    getDocument(idToken, `ingredients/${ingredientId}`),
    runQuery(idToken, `restaurants/${restaurantId}`, "costHistory", [
      { field: "ingredientId", op: "EQUAL", value: ingredientId },
      {
        field: "date",
        op: "GREATER_THAN_OR_EQUAL",
        value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]),
  ]);

  if (!ingredientDoc) {
    return new Response(JSON.stringify({ message: "Ingredient not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cache = (cacheDoc as unknown as IngredientIntelligenceCache | null) ?? {
    ratingCount: 0,
    averageRating: 0,
    priceToQuality: 0,
    topPerformances: [],
    comparisons: [],
  };

  const costHistoryEntries = costHistoryRows.map((row) => ({
    costPerUnit: Number(row.data.costPerUnit),
    date: new Date(row.data.date as string),
  }));
  const priceTrend = computePriceTrend(costHistoryEntries, new Date());

  return Response.json({
    ingredientId,
    name: ingredientDoc.name,
    currentCost: ingredientDoc.currentCost,
    unit: ingredientDoc.unit,
    averageRating: cache.averageRating,
    ratingCount: cache.ratingCount,
    priceToQuality: cache.priceToQuality,
    topPerformances: cache.topPerformances,
    comparisons: cache.comparisons,
    priceTrend,
  });
}
