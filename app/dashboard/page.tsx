"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { ensureIngredientsSeeded } from "@/lib/seedIngredients";
import GenerateRecipeForm from "@/components/GenerateRecipeForm";
import RecipesList from "@/components/RecipesList";
import InventoryTab from "@/components/InventoryTab";
import CostAnalysisTab from "@/components/CostAnalysisTab";
import InvoicesTab from "@/components/InvoicesTab";

type Tab = "generate" | "recipes" | "inventory" | "costAnalysis" | "invoices";

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, loading, profile, profileLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("generate");

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace("/login");
    }
  }, [loading, currentUser, router]);

  // Warm-start the ingredient catalog seed as soon as we have a signed-in
  // user. Fire-and-forget: GenerateRecipeForm awaits the same memoized
  // promise before generating, so a fast submit is still correct even if
  // this hasn't resolved yet.
  useEffect(() => {
    if (currentUser) {
      ensureIngredientsSeeded().catch((err) => {
        console.error("Failed to seed ingredients:", err);
      });
    }
  }, [currentUser]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  if (loading || profileLoading || !currentUser || !profile) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/[.08] bg-white px-6 py-4 dark:border-white/[.145] dark:bg-black">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {currentUser.email}
        </span>
        <button
          onClick={handleLogout}
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Log out
        </button>
      </header>

      <nav className="flex gap-2 border-b border-black/[.08] bg-white px-6 dark:border-white/[.145] dark:bg-black">
        {(
          [
            { key: "generate", label: "Generate Recipe" },
            { key: "recipes", label: "Recipes" },
            { key: "inventory", label: "Inventory" },
            { key: "costAnalysis", label: "Cost Analysis" },
            { key: "invoices", label: "Invoices" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-foreground text-black dark:text-zinc-50"
                : "border-transparent text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-6 py-8">
        {tab === "generate" && <GenerateRecipeForm />}
        {tab === "recipes" && <RecipesList />}
        {tab === "inventory" && <InventoryTab />}
        {tab === "costAnalysis" && <CostAnalysisTab />}
        {tab === "invoices" && <InvoicesTab />}
      </main>
    </div>
  );
}
