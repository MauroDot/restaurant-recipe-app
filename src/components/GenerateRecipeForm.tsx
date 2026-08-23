"use client";

import { useState, type FormEvent } from "react";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { ensureIngredientsSeeded } from "@/lib/seedIngredients";
import type { Ingredient } from "@/lib/types";
import {
  buildIngredientMap,
  calculateRecipeCost,
  recommendMenuPrice,
  type RecipeCostBreakdown,
  type MenuPrices,
} from "@/lib/pricing";
import {
  CUISINE_OPTIONS,
  DISH_TYPE_OPTIONS,
  STYLE_OPTIONS,
  RecipesResponseSchema,
  type Cuisine,
  type DishType,
  type Style,
  type GeneratedRecipe,
} from "@/lib/recipeSchema";

type SaveState = "idle" | "saving" | "saved" | "error";

type RecipeWithCost = {
  recipe: GeneratedRecipe;
  breakdown: RecipeCostBreakdown;
  menuPrices: MenuPrices;
  /** Portion count this recipe was generated for — captured at generation
   *  time, not read live from the form, so a later edit to the Servings
   *  field can't silently mismatch already-computed costs (chunk 6.1). */
  servings: number;
};

export default function GenerateRecipeForm() {
  const { currentUser, profile } = useAuth();

  const [cuisine, setCuisine] = useState<Cuisine>(CUISINE_OPTIONS[0].value);
  const [dishType, setDishType] = useState<DishType>(
    DISH_TYPE_OPTIONS[0].value
  );
  const [style, setStyle] = useState<Style>(STYLE_OPTIONS[0].value);
  const [targetCost, setTargetCost] = useState("6.00");
  const [servings, setServings] = useState("4");

  const [generating, setGenerating] = useState(false);
  const [progressChars, setProgressChars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecipeWithCost[] | null>(null);
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setSaveStates({});
    setSaveErrors({});
    setGenerating(true);
    setProgressChars(0);

    try {
      // Belt-and-suspenders: the dashboard already warm-starts this on
      // mount, but await the same memoized promise in case this fires
      // before that first attempt has committed.
      await ensureIngredientsSeeded();

      const snap = await getDocs(collection(db, "ingredients"));
      const ingredients: Ingredient[] = snap.docs
        .map((d): Ingredient => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            unit: data.unit,
            currentCost: data.currentCost,
            trimLoss: data.trimLoss,
          };
        })
        // Defensive: ignore any doc that doesn't have the expected shape
        // (e.g. a stray non-ingredient doc in the collection) rather than
        // letting one bad doc break the whole form.
        .filter(
          (i) =>
            typeof i.name === "string" &&
            typeof i.unit === "string" &&
            typeof i.currentCost === "number" &&
            typeof i.trimLoss === "number"
        );
      const ingredientMap = buildIngredientMap(ingredients);

      if (!currentUser) {
        setError("You must be signed in to generate recipes.");
        setGenerating(false);
        return;
      }
      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          cuisine,
          dishType,
          style,
          targetCost: Number(targetCost),
          servings: Number(servings),
          availableIngredients: ingredients.map((i) => ({
            name: i.name,
            unit: i.unit,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        let message = "Recipe generation failed.";
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed?.message === "string") message = parsed.message;
        } catch {
          // ignore — use default message
        }
        setError(message);
        setGenerating(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";
      let jsonBuffer = "";
      let streamError: string | null = null;
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line);
            if (event.type === "text") {
              jsonBuffer += event.text;
              setProgressChars((c) => c + event.text.length);
            } else if (event.type === "error") {
              streamError = event.message;
            }
            // "done" needs no action here — loop exits when reader is done.
          }
        }
      }

      if (streamError) {
        setError(streamError);
        setGenerating(false);
        return;
      }

      // Independent re-validation — don't just trust the server-side
      // structured-output constraint.
      const parsedJson = JSON.parse(jsonBuffer);
      const validated = RecipesResponseSchema.parse(parsedJson);

      const requestedServings = Number(servings);
      const withCost: RecipeWithCost[] = validated.recipes.map((recipe) => {
        const breakdown = calculateRecipeCost(
          recipe.ingredients,
          ingredientMap,
          requestedServings
        );
        return {
          recipe,
          breakdown,
          servings: requestedServings,
          menuPrices: recommendMenuPrice(breakdown.costPerPortion),
        };
      });

      setResults(withCost);
    } catch (err) {
      console.error("Recipe generation failed:", err);
      setError("Generation returned invalid data — please retry.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(index: number) {
    if (!currentUser || !profile || !results) return;
    const { recipe, breakdown, menuPrices, servings: recipeServings } =
      results[index];

    setSaveStates((s) => ({ ...s, [index]: "saving" }));
    setSaveErrors((s) => ({ ...s, [index]: "" }));

    try {
      const recipeRef = doc(collection(db, "recipes"));
      await setDoc(recipeRef, {
        name: recipe.name,
        description: recipe.description,
        servings: recipeServings,
        instructions: recipe.instructions,
        ingredients: recipe.ingredients,
        cuisine,
        dishType,
        style,
        restaurantId: profile.restaurantId,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        totalCost: breakdown.totalCost,
        costPerPortion: breakdown.costPerPortion,
        menuPrices,
      });
      setSaveStates((s) => ({ ...s, [index]: "saved" }));
    } catch (err) {
      const message =
        err instanceof FirebaseError && err.code === "permission-denied"
          ? "Save was denied by security rules."
          : "Save failed — check your connection and try again.";
      setSaveErrors((s) => ({ ...s, [index]: message }));
      setSaveStates((s) => ({ ...s, [index]: "error" }));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cuisine
          </label>
          <select
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value as Cuisine)}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          >
            {CUISINE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Dish type
          </label>
          <select
            value={dishType}
            onChange={(e) => setDishType(e.target.value as DishType)}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          >
            {DISH_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Style
          </label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as Style)}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          >
            {STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Target food cost ($/portion)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={targetCost}
            onChange={(e) => setTargetCost(e.target.value)}
            className="w-32 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Servings
          </label>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            required
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-24 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
          />
        </div>

        <button
          type="submit"
          disabled={generating}
          className="h-11 rounded-full bg-foreground px-6 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {generating ? "Generating…" : "Generate Recipes"}
        </button>
      </form>

      {generating && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Generating recipes… ({progressChars} characters received)
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {results && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ recipe, breakdown, menuPrices, servings: recipeServings }, index) => {
            const saveState = saveStates[index] ?? "idle";
            const hasMissing = breakdown.missingIngredients.length > 0;
            return (
              <div
                key={index}
                className="flex flex-col gap-3 rounded border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black"
              >
                <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
                  {recipe.name}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {recipe.description}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Serves {recipeServings}
                </p>

                <div>
                  <h4 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Ingredients
                  </h4>
                  <ul className="flex flex-col gap-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {breakdown.lineItems.map((li, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>
                          {li.quantity} {li.unit} {li.ingredientName}
                        </span>
                        <span>${li.lineCost.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  {hasMissing && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      Not found in catalog:{" "}
                      {breakdown.missingIngredients.join(", ")}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Instructions
                  </h4>
                  <ol className="list-decimal space-y-1 pl-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {recipe.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="border-t border-black/[.08] pt-3 text-sm dark:border-white/[.145]">
                  <p className="font-medium text-black dark:text-zinc-50">
                    Cost per portion: ${breakdown.costPerPortion.toFixed(2)} ·
                    Total (serves {recipeServings}): $
                    {breakdown.totalCost.toFixed(2)}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Menu price @ 28%: ${menuPrices.price28.toFixed(2)}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Menu price @ 32%: ${menuPrices.price32.toFixed(2)}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Menu price @ 35%: ${menuPrices.price35.toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => handleSave(index)}
                  disabled={
                    hasMissing || saveState === "saving" || saveState === "saved"
                  }
                  className="mt-1 h-10 rounded-full border border-black/[.08] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  {saveState === "saved"
                    ? "Saved"
                    : saveState === "saving"
                      ? "Saving…"
                      : "Save"}
                </button>
                {saveState === "error" && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {saveErrors[index]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
