/**
 * Deliberate, small, documented duplicate of src/lib/pricing.ts's
 * calculateRecipeCost/recommendMenuPrice, for improveRecipe.ts.
 *
 * Why duplicated rather than shared: functions/ is a separate npm subproject
 * with its own tsconfig/node_modules (see functions/tsconfig.json's
 * `include: ["src"]` and root tsconfig.json's `exclude: ["functions"]`) —
 * there's no workspace boundary set up between it and the Next.js app to
 * import across. This logic is pure, ~20 lines, and has been stable since
 * chunk 6.1 (the totalCost/costPerPortion split was the actual bug fix that
 * chunk made — see src/lib/pricing.ts's own comments) — low drift risk. If
 * this ever needs to change, change both files.
 */

export type Ingredient = {
  name: string;
  unit: string;
  currentCost: number;
  trimLoss: number;
};

export type RecipeIngredientInput = {
  ingredientName: string;
  quantity: number;
  unit: string;
};

export type RecipeCostBreakdown = {
  totalCost: number;
  costPerPortion: number;
  missingIngredients: string[];
};

export type MenuPrices = {
  price28: number;
  price32: number;
  price35: number;
};

export function buildIngredientMap(
  ingredients: Ingredient[]
): Map<string, Ingredient> {
  const map = new Map<string, Ingredient>();
  for (const ingredient of ingredients) {
    map.set(ingredient.name.trim().toLowerCase(), ingredient);
  }
  return map;
}

function calculateIngredientCost(ingredient: Ingredient, quantity: number): number {
  if (ingredient.trimLoss >= 1) {
    throw new Error(
      `Invalid trimLoss for "${ingredient.name}": must be less than 1 (got ${ingredient.trimLoss})`
    );
  }
  const effectiveUnitCost = ingredient.currentCost / (1 - ingredient.trimLoss);
  return effectiveUnitCost * quantity;
}

export function calculateRecipeCost(
  recipeIngredients: RecipeIngredientInput[],
  ingredientMap: Map<string, Ingredient>,
  servings: number
): RecipeCostBreakdown {
  const missingIngredients: string[] = [];
  let totalCost = 0;

  for (const ri of recipeIngredients) {
    const key = ri.ingredientName.trim().toLowerCase();
    const ingredient = ingredientMap.get(key);
    if (!ingredient) {
      missingIngredients.push(ri.ingredientName);
      continue;
    }
    totalCost += calculateIngredientCost(ingredient, ri.quantity);
  }

  return { totalCost, costPerPortion: totalCost / servings, missingIngredients };
}

export function recommendMenuPrice(costPerPortion: number): MenuPrices {
  return {
    price28: costPerPortion / 0.28,
    price32: costPerPortion / 0.32,
    price35: costPerPortion / 0.35,
  };
}
