import type { Recipe } from "@/src/lib/types";
import { calculateRecipeCost } from "@/src/lib/pricing";

export default function RecipeCard({
  recipe,
  onClick,
}: {
  recipe: Recipe;
  onClick: () => void;
}) {
  const cost = calculateRecipeCost(recipe.ingredients);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
    >
      <h3 className="font-semibold text-slate-900">{recipe.name}</h3>
      <p className="text-sm text-slate-500">
        {recipe.cuisine} &middot; {recipe.dishType} &middot; {recipe.style}
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{recipe.cookingTime} min &middot; {recipe.difficulty}</span>
        <span className="font-medium text-blue-700">${cost.toFixed(2)}/portion</span>
      </div>
    </button>
  );
}
