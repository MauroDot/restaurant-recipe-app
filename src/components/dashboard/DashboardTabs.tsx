"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/src/lib/authContext";
import {
  addInventoryItem,
  getIngredients,
  getInventoryItems,
  getRecipes,
  getUserProfile,
  saveRecipe,
} from "@/src/lib/firestore";
import { seedIngredientsToFirestore } from "@/src/data/ingredientSeed";
import { calculateRecipeCost } from "@/src/lib/pricing";
import type { GeneratedRecipe, Ingredient, InventoryItem, Recipe } from "@/src/lib/types";
import { FullPageSpinner } from "@/src/components/Spinner";
import Toast from "@/src/components/Toast";
import RecipesTab from "@/src/components/dashboard/RecipesTab";
import InventoryTab from "@/src/components/dashboard/InventoryTab";
import CostAnalysisTab from "@/src/components/dashboard/CostAnalysisTab";
import GenerateRecipeForm from "@/src/components/dashboard/GenerateRecipeForm";

type Tab = "recipes" | "inventory" | "cost-analysis" | "generate";

const TABS: { id: Tab; label: string }[] = [
  { id: "recipes", label: "Recipes" },
  { id: "inventory", label: "Inventory" },
  { id: "cost-analysis", label: "Cost Analysis" },
  { id: "generate", label: "Generate Recipe" },
];

export default function DashboardTabs() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("recipes");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      await seedIngredientsToFirestore();

      // Right after signup, the profile doc write can lag a beat behind the redirect
      // to /dashboard — retry briefly instead of giving up on the first miss.
      let profile = await getUserProfile(currentUser.uid);
      for (let attempt = 0; !profile && attempt < 3; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        profile = await getUserProfile(currentUser.uid);
      }
      if (!profile) {
        console.error("No restaurant profile found for user.");
        return;
      }
      setRestaurantId(profile.restaurantId);

      const [recipeList, inventoryList, ingredientList] = await Promise.all([
        getRecipes(profile.restaurantId),
        getInventoryItems(profile.restaurantId),
        getIngredients(),
      ]);
      setRecipes(recipeList);
      setInventory(inventoryList);
      setIngredients(ingredientList);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    // loadData only sets state after awaiting the Firestore/Firebase client SDK calls
    // below, never synchronously — this is the standard client-side data-fetch-on-mount
    // pattern, not the synchronous cascading-render case the rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  async function handleAddInventoryItem(item: Omit<InventoryItem, "id" | "createdAt">) {
    if (!restaurantId) return;
    const id = await addInventoryItem(restaurantId, item);
    setInventory((prev) =>
      [...prev, { ...item, id, createdAt: Date.now() }].sort((a, b) => {
        if (a.expirationDate == null && b.expirationDate == null) return 0;
        if (a.expirationDate == null) return 1;
        if (b.expirationDate == null) return -1;
        return a.expirationDate - b.expirationDate;
      }),
    );
  }

  async function handleSaveGeneratedRecipe(generated: GeneratedRecipe) {
    if (!restaurantId || !currentUser) return;
    const totalCost = calculateRecipeCost(generated.ingredients);
    const recipeToSave: Omit<Recipe, "id" | "createdAt"> = {
      name: generated.name,
      cuisine: "other",
      dishType: "other",
      style: "contemporary",
      ingredients: generated.ingredients,
      instructions: generated.instructions,
      cookingTime: generated.cookingTime,
      difficulty: generated.difficulty,
      totalCost,
      restaurantId,
      createdBy: currentUser.uid,
      rating: 0,
      uses: 0,
    };
    const id = await saveRecipe(recipeToSave);
    setRecipes((prev) => [{ ...recipeToSave, id, createdAt: Date.now() }, ...prev]);
    setToast(`"${generated.name}" saved to your recipes.`);
  }

  if (loading) {
    return <FullPageSpinner />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "recipes" && (
        <RecipesTab recipes={recipes} onGenerateClick={() => setActiveTab("generate")} />
      )}
      {activeTab === "inventory" && (
        <InventoryTab items={inventory} onAdd={handleAddInventoryItem} />
      )}
      {activeTab === "cost-analysis" && <CostAnalysisTab recipes={recipes} />}
      {activeTab === "generate" && (
        <GenerateRecipeForm ingredients={ingredients} onSave={handleSaveGeneratedRecipe} />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
