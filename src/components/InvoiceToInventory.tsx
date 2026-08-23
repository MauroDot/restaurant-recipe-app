"use client";

import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { addInventoryPurchase } from "@/lib/inventoryActions";
import type { Ingredient, Invoice } from "@/lib/types";

function suggestMatch(itemName: string, ingredients: Ingredient[]): string {
  const needle = itemName.trim().toLowerCase();
  if (!needle) return "";
  const match = ingredients.find((ing) => {
    const name = ing.name.toLowerCase();
    return name.includes(needle) || needle.includes(name);
  });
  return match?.id ?? "";
}

export default function InvoiceToInventory({
  invoice,
  restaurantId,
  ingredients,
  onDone,
}: {
  invoice: Invoice;
  restaurantId: string;
  ingredients: Ingredient[];
  onDone: () => void;
}) {
  const [checked, setChecked] = useState<boolean[]>(
    invoice.lineItems.map(() => true)
  );
  const [matches, setMatches] = useState<string[]>(
    invoice.lineItems.map((li) => suggestMatch(li.itemName, ingredients))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  const anyCheckedUnmatched = invoice.lineItems.some(
    (_, i) => checked[i] && !matches[i]
  );
  const anyChecked = checked.some(Boolean);

  async function handleAddSelected() {
    setError(null);
    setSubmitting(true);
    try {
      const dateReceived = invoice.invoiceDate ?? Timestamp.now();
      const rows = invoice.lineItems
        .map((li, i) => ({ li, ingredientId: matches[i], on: checked[i] }))
        .filter((r) => r.on && r.ingredientId);

      await Promise.all(
        rows.map((row) =>
          addInventoryPurchase({
            restaurantId,
            ingredientId: row.ingredientId,
            itemName: row.li.itemName,
            quantity: row.li.quantity,
            unit: row.li.unit,
            costPerUnit: row.li.unitPrice,
            supplier: invoice.supplier,
            dateReceived,
          })
        )
      );

      setAddedCount(rows.length);
    } catch {
      setError("Couldn't add items to inventory. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (addedCount !== null) {
    return (
      <div className="rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
        <p className="mb-4 text-sm text-black dark:text-zinc-50">
          Added {addedCount} {addedCount === 1 ? "item" : "items"} to
          Inventory.
        </p>
        <button
          onClick={onDone}
          className="h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Quick add to inventory
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-2 pr-4"></th>
              <th className="py-2 pr-4">Parsed item</th>
              <th className="py-2 pr-4">Qty</th>
              <th className="py-2 pr-4">Match to ingredient</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li, i) => (
              <tr
                key={i}
                className="border-b border-black/[.04] dark:border-white/[.08]"
              >
                <td className="py-2 pr-4">
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={(e) =>
                      setChecked((c) =>
                        c.map((v, idx) => (idx === i ? e.target.checked : v))
                      )
                    }
                  />
                </td>
                <td className="py-2 pr-4 text-black dark:text-zinc-50">
                  {li.itemName}
                </td>
                <td className="py-2 pr-4">
                  {li.quantity} {li.unit}
                </td>
                <td className="py-2 pr-4">
                  <select
                    value={matches[i]}
                    onChange={(e) =>
                      setMatches((m) =>
                        m.map((v, idx) => (idx === i ? e.target.value : v))
                      )
                    }
                    className="rounded border border-black/[.08] bg-transparent px-2 py-1 text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
                  >
                    <option value="">Select ingredient…</option>
                    {ingredients
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleAddSelected}
          disabled={submitting || !anyChecked || anyCheckedUnmatched}
          className="h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {submitting ? "Adding…" : "Add Selected Items to Inventory"}
        </button>
        <button
          onClick={onDone}
          className="h-10 rounded-full border border-black/[.08] px-5 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
