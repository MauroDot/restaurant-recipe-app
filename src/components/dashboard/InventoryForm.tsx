"use client";

import { useState, type FormEvent } from "react";
import type { IngredientUnit, InventoryItem } from "@/src/lib/types";
import Spinner from "@/src/components/Spinner";

const UNITS: IngredientUnit[] = ["lb", "oz", "cup", "tbsp", "tsp", "pinch"];

interface FormState {
  ingredientName: string;
  quantityOnHand: string;
  unit: IngredientUnit;
  costPerUnit: string;
  supplier: string;
  expirationDate: string;
}

const EMPTY_FORM: FormState = {
  ingredientName: "",
  quantityOnHand: "",
  unit: "lb",
  costPerUnit: "",
  supplier: "",
  expirationDate: "",
};

export default function InventoryForm({
  onAdd,
}: {
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt">) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (
      !form.ingredientName.trim() ||
      !form.quantityOnHand ||
      !form.costPerUnit ||
      !form.supplier.trim()
    ) {
      setError("All fields except expiration date are required.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onAdd({
        ingredientName: form.ingredientName.trim(),
        ingredientId: "",
        quantityOnHand: Number(form.quantityOnHand),
        unit: form.unit,
        costPerUnit: Number(form.costPerUnit),
        dateReceived: Date.now(),
        expirationDate: form.expirationDate ? new Date(form.expirationDate).getTime() : undefined,
        supplier: form.supplier.trim(),
      });
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Failed to add inventory item:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Ingredient</label>
        <input
          type="text"
          value={form.ingredientName}
          onChange={(e) => update("ingredientName", e.target.value)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Quantity</label>
        <input
          type="number"
          min="0"
          step="any"
          value={form.quantityOnHand}
          onChange={(e) => update("quantityOnHand", e.target.value)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Unit</label>
        <select
          value={form.unit}
          onChange={(e) => update("unit", e.target.value as IngredientUnit)}
          disabled={loading}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        >
          {UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Cost per unit</label>
        <input
          type="number"
          min="0"
          step="any"
          value={form.costPerUnit}
          onChange={(e) => update("costPerUnit", e.target.value)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Supplier</label>
        <input
          type="text"
          value={form.supplier}
          onChange={(e) => update("supplier", e.target.value)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Expiration date (optional)</label>
        <input
          type="date"
          value={form.expirationDate}
          onChange={(e) => update("expirationDate", e.target.value)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        />
      </div>

      {error && (
        <p role="alert" className="col-span-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="col-span-full">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Spinner size="sm" className="border-white border-t-transparent" />}
          {loading ? "Adding..." : "Add item"}
        </button>
      </div>
    </form>
  );
}
