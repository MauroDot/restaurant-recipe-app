"use client";

import { useState, type FormEvent } from "react";
import {
  Timestamp,
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import type { Ingredient } from "@/lib/types";

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function InventoryForm({
  restaurantId,
  ingredients,
  onAdded,
}: {
  restaurantId: string;
  ingredients: Ingredient[];
  onAdded: () => void;
}) {
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [supplier, setSupplier] = useState("");
  const [dateReceived, setDateReceived] = useState(todayInputValue());
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleIngredientChange(id: string) {
    setIngredientId(id);
    const ingredient = ingredients.find((i) => i.id === id);
    if (ingredient) {
      setUnit(ingredient.unit);
      setCostPerUnit(String(ingredient.currentCost));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const ingredient = ingredients.find((i) => i.id === ingredientId);
    if (!ingredient) {
      setError("Choose an ingredient.");
      return;
    }

    setSubmitting(true);
    try {
      const inventoryRef = doc(
        collection(db, "restaurants", restaurantId, "inventory")
      );
      const costHistoryRef = doc(
        collection(db, "restaurants", restaurantId, "costHistory")
      );

      const receivedTimestamp = Timestamp.fromDate(new Date(dateReceived));
      const expiryTimestamp = expiryDate
        ? Timestamp.fromDate(new Date(expiryDate))
        : null;
      const parsedQuantity = Number(quantity);
      const parsedCost = Number(costPerUnit);

      const batch = writeBatch(db);
      batch.set(inventoryRef, {
        ingredientId,
        itemName: ingredient.name,
        quantity: parsedQuantity,
        unit,
        costPerUnit: parsedCost,
        supplier,
        dateReceived: receivedTimestamp,
        expiryDate: expiryTimestamp,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(costHistoryRef, {
        ingredientId,
        date: receivedTimestamp,
        costPerUnit: parsedCost,
        supplier,
        quantity: parsedQuantity,
      });
      await batch.commit();

      setIngredientId("");
      setQuantity("1");
      setUnit("");
      setCostPerUnit("");
      setSupplier("");
      setDateReceived(todayInputValue());
      setExpiryDate("");
      onAdded();
    } catch (err) {
      setError(
        err instanceof FirebaseError && err.code === "permission-denied"
          ? "Add was denied by security rules."
          : "Couldn't add inventory item. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Item
        </label>
        <select
          required
          value={ingredientId}
          onChange={(e) => handleIngredientChange(e.target.value)}
          className="w-48 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
        >
          <option value="" disabled>
            Select an ingredient…
          </option>
          {ingredients
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Quantity
        </label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-24 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Unit
        </label>
        <input
          type="text"
          required
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-20 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Cost/unit ($)
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={costPerUnit}
          onChange={(e) => setCostPerUnit(e.target.value)}
          className="w-24 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Supplier
        </label>
        <input
          type="text"
          required
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="e.g. Sysco"
          className="w-32 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Date received
        </label>
        <input
          type="date"
          required
          value={dateReceived}
          onChange={(e) => setDateReceived(e.target.value)}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Expiry (optional)
        </label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="h-11 rounded-full bg-foreground px-6 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {submitting ? "Adding…" : "+ Add item"}
      </button>

      {error && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
