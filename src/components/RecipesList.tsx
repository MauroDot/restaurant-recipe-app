"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import RecipeVersions, { type RecipeLineage, type SavedRecipe } from "@/components/RecipeVersions";

/** Groups a flat recipe list into version lineages, keyed by baseRecipeId ??
 *  id (chunk 7 — recipes stay a flat collection; v1/v2/... link via
 *  baseRecipeId rather than nesting). Each lineage surfaces whichever
 *  version is status:"active" as primary; the rest are "superseded",
 *  newest first. */
function groupIntoLineages(recipes: SavedRecipe[]): RecipeLineage[] {
  const byRoot = new Map<string, SavedRecipe[]>();
  for (const r of recipes) {
    const root = r.baseRecipeId ?? r.id;
    const group = byRoot.get(root) ?? [];
    group.push(r);
    byRoot.set(root, group);
  }

  const lineages: RecipeLineage[] = [];
  for (const group of byRoot.values()) {
    const active = group.find((r) => r.status === "active") ?? group[0];
    const superseded = group
      .filter((r) => r.id !== active.id)
      .sort((a, b) => b.version - a.version);
    lineages.push({ active, superseded });
  }
  return lineages;
}

export default function RecipesList() {
  const { profile } = useAuth();
  const [recipes, setRecipes] = useState<SavedRecipe[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
            instructions: Array.isArray(data.instructions)
            ? data.instructions
            : typeof data.instructions === "string"
            ? data.instructions.split("\n").filter(Boolean)
            : [],
            ingredients: data.ingredients ?? [],
            cuisine: data.cuisine,
            dishType: data.dishType,
            style: data.style,
            totalCost: data.totalCost,
            // Fall back to deriving it if an older doc predates this field
            // (shouldn't happen — the recipes collection was wiped when
            // costPerPortion was introduced — but cheap insurance).
            costPerPortion: data.costPerPortion ?? data.totalCost / data.servings,
            menuPrices: data.menuPrices ?? { price28: 0, price32: 0, price35: 0 },
            createdAt: data.createdAt ?? null,
            version: data.version ?? 1,
            baseRecipeId: data.baseRecipeId ?? null,
            status: data.status ?? "active",
            aggregateRating: data.aggregateRating ?? 0,
            ratingCount: data.ratingCount ?? 0,
            changesSummary: data.changesSummary,
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
  }, [profile, reloadKey]);

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

  const lineages = groupIntoLineages(recipes);
  const refresh = () => setReloadKey((k) => k + 1);

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {lineages.map((lineage) => (
        <RecipeVersions key={lineage.active.id} lineage={lineage} onRefresh={refresh} />
      ))}
    </div>
  );
}
