"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import type { MenuPrices } from "@/lib/pricing";

type SavedRecipe = {
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
  menuPrices: MenuPrices;
  createdAt: { seconds: number } | null;
};

export default function RecipesList() {
  const { profile } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    (async () => {
      try {
        const q = query(
          collection(db, "recipes"),
          where("restaurantId", "==", profile.restaurantId)
        );
        const snap = await getDocs(q);
        const list: SavedRecipe[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            description: data.description,
            servings: data.servings,
            instructions: data.instructions ?? [],
            ingredients: data.ingredients ?? [],
            cuisine: data.cuisine,
            dishType: data.dishType,
            style: data.style,
            totalCost: data.totalCost,
            menuPrices: data.menuPrices,
            createdAt: data.createdAt ?? null,
          };
        });
        // No `orderBy` in the query (would need a composite index alongside
        // the `restaurantId` equality filter) — sort client-side instead.
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        if (!cancelled) setRecipes(list);
      } catch {
        if (!cancelled) setError("Couldn't load recipes. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!recipes) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
    );
  }

  if (recipes.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No recipes saved yet. Generate one from the Generate Recipe tab.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <div
          key={recipe.id}
          className="flex flex-col gap-3 rounded border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black"
        >
          <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
            {recipe.name}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {recipe.description}
          </p>
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
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Serves {recipe.servings}
          </p>

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
              Total cost: ${recipe.totalCost.toFixed(2)}
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
        </div>
      ))}
    </div>
  );
}
