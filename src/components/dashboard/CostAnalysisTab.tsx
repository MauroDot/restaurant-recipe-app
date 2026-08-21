import type { Recipe } from "@/src/lib/types";
import { calculateRecipeCost } from "@/src/lib/pricing";

export default function CostAnalysisTab({ recipes }: { recipes: Recipe[] }) {
  const costs = recipes.map((recipe) => calculateRecipeCost(recipe.ingredients));
  const averageCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;

  // Recipes don't yet track an actual menu (selling) price, so a true "average food
  // cost %" (cost / actual price) can't be computed from real data. Showing the 32%
  // target here instead, clearly labeled, rather than fabricating a per-recipe average.
  const stats = [
    { label: "Total recipes", value: recipes.length.toString() },
    { label: "Average recipe cost", value: `$${averageCost.toFixed(2)}` },
    { label: "Target food cost %", value: "32%" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-6 text-center">
          <div className="text-3xl font-semibold text-blue-700">{stat.value}</div>
          <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
        </div>
      ))}
      {recipes.length === 0 && (
        <p className="col-span-full rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Save some recipes to see cost analysis.
        </p>
      )}
    </div>
  );
}
