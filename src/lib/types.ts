// Shared Firestore document types. Field names/shapes match AGENTS.md section 3 exactly.

export type Cuisine = "italian" | "contemporary-american" | "other";

export type DishType = "appetizer" | "entree" | "salad" | "dessert" | "other";

export type RecipeStyle =
  | "traditional"
  | "contemporary"
  | "fusion"
  | "innovative"
  | "seasonal";

export type IngredientUnit = "lb" | "oz" | "cup" | "tbsp" | "tsp" | "pinch";

export type Difficulty = "easy" | "medium" | "hard";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  restaurantId: string;
  createdAt: number;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  location?: string;
  cuisine: Cuisine;
  subscriptionTier: string;
  createdAt: number;
}

export interface RecipeIngredient {
  itemName: string;
  quantity: number;
  unit: IngredientUnit;
  costPerUnit: number;
  trimLoss: number; // 0-1
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: Cuisine;
  dishType: DishType;
  style: RecipeStyle;
  ingredients: RecipeIngredient[];
  instructions: string;
  cookingTime: number; // minutes
  difficulty: Difficulty;
  imageUrl?: string;
  totalCost: number;
  restaurantId: string;
  createdBy: string;
  createdAt: number;
  rating: number; // 1-5
  uses: number;
}

export interface IngredientSupplier {
  name: string;
  cost: number;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: IngredientUnit;
  currentCost: number;
  trimLoss: number;
  suppliers: IngredientSupplier[];
  createdAt: number;
}

export interface InventoryItem {
  id: string;
  ingredientName: string;
  ingredientId: string;
  quantityOnHand: number;
  unit: IngredientUnit;
  costPerUnit: number;
  dateReceived: number;
  expirationDate?: number;
  supplier: string;
  createdAt: number;
}

// Recipe generation (Claude API) types.

export interface GenerateRecipesInput {
  availableIngredients: string[];
  targetCost: number;
  cuisine: Cuisine;
  dishType: DishType;
  style: RecipeStyle;
}

export interface GeneratedRecipe {
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  cookingTime: number;
  difficulty: Difficulty;
  whyTheseIngredients: string;
  platingSuggestions: string;
}
