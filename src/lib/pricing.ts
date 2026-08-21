import type { RecipeIngredient } from "@/src/lib/types";

/**
 * Cost of a single ingredient line, accounting for trim loss.
 * adjustedCost = costPerUnit / (1 - trimLoss); total = adjustedCost * quantity
 */
export function calculateIngredientCost(
  quantity: number,
  unit: string,
  costPerUnit: number,
  trimLoss: number,
): number {
  const clampedTrimLoss = Math.min(Math.max(trimLoss, 0), 0.99);
  const adjustedCost = costPerUnit / (1 - clampedTrimLoss);
  return adjustedCost * quantity;
}

/** Sum of all ingredient costs for a recipe (cost per portion). */
export function calculateRecipeCost(ingredients: RecipeIngredient[]): number {
  return ingredients.reduce(
    (total, ingredient) =>
      total +
      calculateIngredientCost(
        ingredient.quantity,
        ingredient.unit,
        ingredient.costPerUnit,
        ingredient.trimLoss,
      ),
    0,
  );
}

export interface RecommendedMenuPrices {
  price28: number;
  price32: number;
  price35: number;
}

/**
 * menuPrice = recipeCost / (targetFoodCostPercent / 100)
 * Returns the standard 28/32/35% food-cost target prices. `targetFoodCostPercent`
 * is accepted per the spec's signature but the three standard targets are always
 * returned; pass it if a custom target price is ever needed via the formula above.
 */
export function recommendMenuPrice(
  recipeCost: number,
  targetFoodCostPercent?: number,
): RecommendedMenuPrices & { priceCustom?: number } {
  const result: RecommendedMenuPrices & { priceCustom?: number } = {
    price28: recipeCost / (28 / 100),
    price32: recipeCost / (32 / 100),
    price35: recipeCost / (35 / 100),
  };

  if (targetFoodCostPercent !== undefined) {
    result.priceCustom = recipeCost / (targetFoodCostPercent / 100);
  }

  return result;
}
