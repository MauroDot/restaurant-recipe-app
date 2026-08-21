"use client";

import { useMemo, useState } from "react";
import type { Cuisine, DishType, Recipe, RecipeStyle } from "@/src/lib/types";
import RecipeCard from "@/src/components/dashboard/RecipeCard";
import RecipeDetail from "@/src/components/dashboard/RecipeDetail";

const CUISINE_FILTERS: (Cuisine | "all")[] = ["all", "italian", "contemporary-american", "other"];
const DISH_TYPE_FILTERS: (DishType | "all")[] = ["all", "appetizer", "entree", "salad", "dessert", "other"];
const STYLE_FILTERS: (RecipeStyle | "all")[] = [
  "all",
  "traditional",
  "contemporary",
  "fusion",
  "innovative",
  "seasonal",
];

export default function RecipesTab({
  recipes,
  onGenerateClick,
}: {
  recipes: Recipe[];
  onGenerateClick: () => void;
}) {
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState<Cuisine | "all">("all");
  const [dishTypeFilter, setDishTypeFilter] = useState<DishType | "all">("all");
  const [styleFilter, setStyleFilter] = useState<RecipeStyle | "all">("all");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch = recipe.name.toLowerCase().includes(search.toLowerCase());
      const matchesCuisine = cuisineFilter === "all" || recipe.cuisine === cuisineFilter;
      const matchesDishType = dishTypeFilter === "all" || recipe.dishType === dishTypeFilter;
      const matchesStyle = styleFilter === "all" || recipe.style === styleFilter;
      return matchesSearch && matchesCuisine && matchesDishType && matchesStyle;
    });
  }, [recipes, search, cuisineFilter, dishTypeFilter, styleFilter]);

  if (selectedRecipe) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setSelectedRecipe(null)}
          className="w-fit text-sm font-medium text-blue-600 hover:underline"
        >
          &larr; Back to recipes
        </button>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <RecipeDetail recipe={selectedRecipe} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recipes..."
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          type="button"
          onClick={onGenerateClick}
          className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Generate Recipe
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={cuisineFilter}
          onChange={(e) => setCuisineFilter(e.target.value as Cuisine | "all")}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        >
          {CUISINE_FILTERS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All cuisines" : option}
            </option>
          ))}
        </select>
        <select
          value={dishTypeFilter}
          onChange={(e) => setDishTypeFilter(e.target.value as DishType | "all")}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        >
          {DISH_TYPE_FILTERS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All dish types" : option}
            </option>
          ))}
        </select>
        <select
          value={styleFilter}
          onChange={(e) => setStyleFilter(e.target.value as RecipeStyle | "all")}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        >
          {STYLE_FILTERS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All styles" : option}
            </option>
          ))}
        </select>
      </div>

      {filteredRecipes.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No recipes yet. Click &quot;Generate Recipe&quot; to create your first one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onClick={() => setSelectedRecipe(recipe)} />
          ))}
        </div>
      )}
    </div>
  );
}
