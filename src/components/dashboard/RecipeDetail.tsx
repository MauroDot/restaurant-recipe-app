import type { Recipe } from "@/src/lib/types";
import { calculateRecipeCost, recommendMenuPrice } from "@/src/lib/pricing";

export default function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const cost = calculateRecipeCost(recipe.ingredients);
  const prices = recommendMenuPrice(cost);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{recipe.name}</h3>
        <p className="text-sm text-slate-500">
          {recipe.cuisine} &middot; {recipe.dishType} &middot; {recipe.style} &middot;{" "}
          {recipe.cookingTime} min &middot; {recipe.difficulty}
        </p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-700">Ingredients</h4>
        <ul className="mt-1 flex flex-col gap-1 text-sm text-slate-600">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index}>
              {ingredient.quantity} {ingredient.unit} {ingredient.itemName}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-700">Instructions</h4>
        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{recipe.instructions}</p>
      </div>

      <div className="rounded-md bg-blue-50 p-3">
        <h4 className="text-sm font-medium text-blue-900">Cost breakdown</h4>
        <p className="mt-1 text-sm text-blue-800">Recipe cost: ${cost.toFixed(2)} / portion</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm text-blue-900">
          <div className="rounded bg-white py-2">
            <div className="font-semibold">${prices.price28.toFixed(2)}</div>
            <div className="text-xs text-blue-600">28% food cost</div>
          </div>
          <div className="rounded bg-white py-2">
            <div className="font-semibold">${prices.price32.toFixed(2)}</div>
            <div className="text-xs text-blue-600">32% food cost</div>
          </div>
          <div className="rounded bg-white py-2">
            <div className="font-semibold">${prices.price35.toFixed(2)}</div>
            <div className="text-xs text-blue-600">35% food cost</div>
          </div>
        </div>
      </div>
    </div>
  );
}
