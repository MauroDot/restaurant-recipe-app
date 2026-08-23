import { z } from "zod";

// Client-safe — no Anthropic SDK import here, so this can be imported from
// both server-only code (src/lib/claude.ts) and Client Components.

export const RecipeIngredientSchema = z.object({
  ingredientName: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
});

// Deliberately no `servings` here — servings is a fixed input the caller
// dictates (see GenerateRecipeParamsSchema below), not something the model
// is free to choose. Letting it choose independently of the cost target
// was exactly the chunk 6.1 bug: two uncoupled guesses (a "cost-ish" recipe
// size and an unrelated serving count) landing at an uncorrelated total.
export const RecipeSchema = z.object({
  name: z.string(),
  description: z.string(),
  instructions: z.array(z.string()).min(1),
  ingredients: z.array(RecipeIngredientSchema).min(1),
});

export const RecipesResponseSchema = z.object({
  recipes: z.array(RecipeSchema).length(3),
});

export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;
export type GeneratedRecipe = z.infer<typeof RecipeSchema>;
export type RecipesResponse = z.infer<typeof RecipesResponseSchema>;

export const CUISINE_VALUES = [
  "italian",
  "contemporary-american",
  "other",
] as const;
export const DISH_TYPE_VALUES = [
  "appetizer",
  "entree",
  "side",
  "dessert",
  "beverage",
] as const;
export const STYLE_VALUES = [
  "casual",
  "rustic",
  "refined-fine-dining",
  "family-style",
] as const;

export type Cuisine = (typeof CUISINE_VALUES)[number];
export type DishType = (typeof DISH_TYPE_VALUES)[number];
export type Style = (typeof STYLE_VALUES)[number];

/** Labeled options for form selects. */
export const CUISINE_OPTIONS = [
  { value: "italian", label: "Italian" },
  { value: "contemporary-american", label: "Contemporary American" },
  { value: "other", label: "Other" },
] as const satisfies { value: Cuisine; label: string }[];

export const DISH_TYPE_OPTIONS = [
  { value: "appetizer", label: "Appetizer" },
  { value: "entree", label: "Entrée" },
  { value: "side", label: "Side" },
  { value: "dessert", label: "Dessert" },
  { value: "beverage", label: "Beverage" },
] as const satisfies { value: DishType; label: string }[];

export const STYLE_OPTIONS = [
  { value: "casual", label: "Casual" },
  { value: "rustic", label: "Rustic" },
  { value: "refined-fine-dining", label: "Refined / Fine Dining" },
  { value: "family-style", label: "Family Style" },
] as const satisfies { value: Style; label: string }[];

/** Shared by the client fetch call and the route handler's input validation. */
export const GenerateRecipeParamsSchema = z.object({
  cuisine: z.enum(CUISINE_VALUES),
  dishType: z.enum(DISH_TYPE_VALUES),
  style: z.enum(STYLE_VALUES),
  /** Target food cost PER PORTION, in dollars — see src/lib/pricing.ts. */
  targetCost: z.number().positive(),
  /** Fixed portion count the recipe must be designed for — an input to the
   *  cost constraint, not something the model chooses (chunk 6.1). */
  servings: z.number().int().positive().max(100),
  availableIngredients: z
    .array(z.object({ name: z.string(), unit: z.string() }))
    .min(1),
});
export type GenerateRecipeParams = z.infer<typeof GenerateRecipeParamsSchema>;
