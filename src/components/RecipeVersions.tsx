"use client";

import { useState } from "react";
import type { MenuPrices } from "@/lib/pricing";
import RecipeRatingModal from "@/components/RecipeRatingModal";

export type SavedRecipe = {
  id: string;
  name: string;
  description: string;
  servings: number;
  instructions: string[];
  ingredients: { ingredientName: string; quantity: number; unit: string }[];
  cuisine: string;
  dishType: string;
  style: string;
  totalCost: number;
  costPerPortion: number;
  menuPrices: MenuPrices;
  createdAt: { seconds: number } | null;
  version: number;
  baseRecipeId: string | null;
  status: "active" | "superseded";
  aggregateRating: number;
  ratingCount: number;
  changesSummary?: string[];
};

/** One version lineage: the current active recipe plus any superseded ones. */
export type RecipeLineage = {
  active: SavedRecipe;
  superseded: SavedRecipe[];
};

function RecipeCard({ recipe, onRefresh }: { recipe: SavedRecipe; onRefresh: () => void }) {
  const [showRating, setShowRating] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
          {recipe.name}
        </h3>
        {recipe.version > 1 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
            v{recipe.version} · Improved based on feedback
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{recipe.description}</p>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {recipe.ratingCount > 0
          ? `⭐ ${recipe.aggregateRating.toFixed(1)} (${recipe.ratingCount} rating${recipe.ratingCount === 1 ? "" : "s"})`
          : "No ratings yet"}
      </p>

      {recipe.changesSummary && recipe.changesSummary.length > 0 && (
        <div>
          <h4 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Improvements from v{recipe.version - 1}
          </h4>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400">
            {recipe.changesSummary.map((c, i) => (
              <li key={i}>• {c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full border border-black/[.08] px-2 py-0.5 text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
          {recipe.cuisine}
        </span>
        <span className="rounded-full border border-black/[.08] px-2 py-0.5 text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
          {recipe.dishType}
        </span>
        <span className="rounded-full border border-black/[.08] px-2 py-0.5 text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
          {recipe.style}
        </span>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Serves {recipe.servings}</p>

      <div>
        <h4 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Ingredients
        </h4>
        <ul className="text-sm text-zinc-600 dark:text-zinc-400">
          {recipe.ingredients.map((ri, i) => (
            <li key={i}>
              {ri.quantity} {ri.unit} {ri.ingredientName}
            </li>
          ))}
        </ul>
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
          Cost per portion: ${recipe.costPerPortion.toFixed(2)} · Total
          (serves {recipe.servings}): ${recipe.totalCost.toFixed(2)}
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          Menu price @ 28%: ${recipe.menuPrices.price28.toFixed(2)}
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          Menu price @ 32%: ${recipe.menuPrices.price32.toFixed(2)}
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          Menu price @ 35%: ${recipe.menuPrices.price35.toFixed(2)}
        </p>
      </div>

      <button
        onClick={() => setShowRating(true)}
        className="mt-1 h-10 rounded-full border border-black/[.08] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        Rate this recipe
      </button>

      {showRating && (
        <RecipeRatingModal
          recipeId={recipe.id}
          recipeName={recipe.name}
          onClose={() => {
            setShowRating(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

export default function RecipeVersions({
  lineage,
  onRefresh,
}: {
  lineage: RecipeLineage;
  onRefresh: () => void;
}) {
  const [showOlder, setShowOlder] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <RecipeCard recipe={lineage.active} onRefresh={onRefresh} />
      {lineage.superseded.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowOlder((s) => !s)}
            className="self-start text-xs font-medium text-zinc-600 underline dark:text-zinc-400"
          >
            {showOlder ? "Hide" : "View"} v{lineage.superseded[0].version}
            {lineage.superseded.length > 1 ? "s" : ""}
          </button>
          {showOlder &&
            lineage.superseded.map((r) => (
              <div key={r.id} className="opacity-75">
                <RecipeCard recipe={r} onRefresh={onRefresh} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
