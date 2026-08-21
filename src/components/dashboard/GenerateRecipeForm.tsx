"use client";

import { useState, type FormEvent } from "react";
import type { Cuisine, DishType, GeneratedRecipe, Ingredient, RecipeStyle } from "@/src/lib/types";
import { generateRecipes } from "@/src/lib/claude";
import { calculateRecipeCost } from "@/src/lib/pricing";
import Spinner from "@/src/components/Spinner";

const CUISINE_OPTIONS: Cuisine[] = ["italian", "contemporary-american", "other"];
const DISH_TYPE_OPTIONS: DishType[] = ["appetizer", "entree", "salad", "dessert", "other"];
const STYLE_OPTIONS: RecipeStyle[] = ["traditional", "contemporary", "fusion", "innovative", "seasonal"];

export default function GenerateRecipeForm({
  ingredients,
  onSave,
}: {
  ingredients: Ingredient[];
  onSave: (recipe: GeneratedRecipe) => Promise<void>;
}) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [targetCost, setTargetCost] = useState(8);
  const [cuisine, setCuisine] = useState<Cuisine>("italian");
  const [dishType, setDishType] = useState<DishType>("entree");
  const [style, setStyle] = useState<RecipeStyle>("contemporary");
  const [results, setResults] = useState<GeneratedRecipe[] | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleIngredient(name: string) {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (selectedIngredients.length === 0) {
      setError("Select at least one ingredient.");
      return;
    }

    setError(null);
    setLoading(true);
    setResults(null);
    setSavedIndexes(new Set());
    try {
      const recipes = await generateRecipes({
        availableIngredients: selectedIngredients,
        targetCost,
        cuisine,
        dishType,
        style,
      });
      if (recipes.length === 0) {
        setError("Couldn't generate recipes right now. Please try again.");
      } else {
        setResults(recipes);
      }
    } catch (err) {
      console.error("Recipe generation failed:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(recipe: GeneratedRecipe, index: number) {
    await onSave(recipe);
    setSavedIndexes((prev) => new Set(prev).add(index));
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Available ingredients</label>
          <div className="max-h-48 overflow-y-auto rounded-md border border-slate-300 p-2">
            {ingredients.length === 0 ? (
              <p className="p-2 text-sm text-slate-500">Loading ingredients...</p>
            ) : (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {ingredients.map((ingredient) => (
                  <label key={ingredient.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedIngredients.includes(ingredient.name)}
                      onChange={() => toggleIngredient(ingredient.name)}
                      className="accent-blue-600"
                    />
                    {ingredient.name}
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">{selectedIngredients.length} selected</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Target cost per portion: ${targetCost}
          </label>
          <input
            type="range"
            min={2}
            max={30}
            value={targetCost}
            onChange={(e) => setTargetCost(Number(e.target.value))}
            className="accent-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Cuisine</label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value as Cuisine)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {CUISINE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Dish type</label>
            <select
              value={dishType}
              onChange={(e) => setDishType(e.target.value as DishType)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {DISH_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as RecipeStyle)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {STYLE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Spinner size="sm" className="border-white border-t-transparent" />}
          {loading ? "Generating recipes..." : "Generate Recipes"}
        </button>
      </form>

      {results && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {results.map((recipe, index) => {
            const cost = calculateRecipeCost(recipe.ingredients);
            const isSaved = savedIndexes.has(index);
            return (
              <div key={index} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{recipe.name}</h3>
                  <p className="text-sm text-slate-500">
                    {recipe.cookingTime} min &middot; {recipe.difficulty} &middot; ${cost.toFixed(2)}/portion
                  </p>
                </div>
                <ul className="text-sm text-slate-600">
                  {recipe.ingredients.map((ingredient, i) => (
                    <li key={i}>
                      {ingredient.quantity} {ingredient.unit} {ingredient.itemName}
                    </li>
                  ))}
                </ul>
                <p className="whitespace-pre-line text-sm text-slate-600">{recipe.instructions}</p>
                <p className="text-sm italic text-slate-500">{recipe.whyTheseIngredients}</p>
                <p className="text-sm italic text-slate-500">{recipe.platingSuggestions}</p>
                <button
                  type="button"
                  onClick={() => handleSave(recipe, index)}
                  disabled={isSaved}
                  className="mt-auto rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSaved ? "Saved" : "Save Recipe"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
