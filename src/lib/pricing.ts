import type { Ingredient } from "@/lib/types";

/**
 * Effective cost of using `quantity` units of an ingredient, accounting for
 * trim loss: you pay for the whole unit but only `1 - trimLoss` of it is
 * usable, so the effective per-unit cost rises accordingly.
 */
export function calculateIngredientCost(
  ingredient: Ingredient,
  quantity: number
): number {
  if (ingredient.trimLoss >= 1) {
    throw new Error(
      `Invalid trimLoss for "${ingredient.name}": must be less than 1 (got ${ingredient.trimLoss})`
    );
  }
  const effectiveUnitCost = ingredient.currentCost / (1 - ingredient.trimLoss);
  return effectiveUnitCost * quantity;
}

export type RecipeIngredientInput = {
  ingredientName: string;
  quantity: number;
  unit: string;
};

export type RecipeCostLineItem = {
  ingredientName: string;
  quantity: number;
  unit: string;
  lineCost: number;
};

export type RecipeCostBreakdown = {
  totalCost: number;
  lineItems: RecipeCostLineItem[];
  /** Ingredient names the recipe referenced that weren't found in the catalog map. */
  missingIngredients: string[];
};

/**
 * Sums the cost of every ingredient line in a recipe, looking each one up in
 * `ingredientMap` by normalized (trimmed, lowercased) name. Never trusts a
 * cost supplied by the recipe itself — only the catalog's `currentCost`.
 */
export function calculateRecipeCost(
  recipeIngredients: RecipeIngredientInput[],
  ingredientMap: Map<string, Ingredient>
): RecipeCostBreakdown {
  const lineItems: RecipeCostLineItem[] = [];
  const missingIngredients: string[] = [];
  let totalCost = 0;

  for (const ri of recipeIngredients) {
    const key = ri.ingredientName.trim().toLowerCase();
    const ingredient = ingredientMap.get(key);
    if (!ingredient) {
      missingIngredients.push(ri.ingredientName);
      continue;
    }
    const lineCost = calculateIngredientCost(ingredient, ri.quantity);
    totalCost += lineCost;
    lineItems.push({
      ingredientName: ri.ingredientName,
      quantity: ri.quantity,
      unit: ri.unit,
      lineCost,
    });
  }

  return { totalCost, lineItems, missingIngredients };
}

export type MenuPrices = {
  price28: number;
  price32: number;
  price35: number;
};

/**
 * Recommended menu prices at 28%, 32%, and 35% food cost:
 * price = totalIngredientCost / foodCostPercent
 */
export function recommendMenuPrice(totalCost: number): MenuPrices {
  return {
    price28: totalCost / 0.28,
    price32: totalCost / 0.32,
    price35: totalCost / 0.35,
  };
}

/** Builds a name-normalized lookup map from a list of catalog ingredients. */
export function buildIngredientMap(
  ingredients: Ingredient[]
): Map<string, Ingredient> {
  const map = new Map<string, Ingredient>();
  for (const ingredient of ingredients) {
    map.set(ingredient.name.trim().toLowerCase(), ingredient);
  }
  return map;
}
