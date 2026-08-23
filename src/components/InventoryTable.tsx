"use client";

import { useState } from "react";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { InventoryItem } from "@/lib/types";
import { daysUntilExpiry } from "@/lib/costAnalysis";

export default function InventoryTable({
  restaurantId,
  items,
  onChanged,
}: {
  restaurantId: string;
  items: InventoryItem[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalCost = items.reduce(
    (sum, item) => sum + item.quantity * item.costPerUnit,
    0
  );

  function startEdit(item: InventoryItem) {
    setEditingId(item.id ?? null);
    setEditQuantity(String(item.quantity));
    setError(null);
  }

  async function saveEdit(item: InventoryItem) {
    if (!item.id) return;
    setBusyId(item.id);
    setError(null);
    try {
      await updateDoc(
        doc(db, "restaurants", restaurantId, "inventory", item.id),
        { quantity: Number(editQuantity), updatedAt: serverTimestamp() }
      );
      setEditingId(null);
      onChanged();
    } catch {
      setError("Couldn't update quantity. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function markSpoiled(item: InventoryItem) {
    if (!item.id) return;
    setBusyId(item.id);
    setError(null);
    try {
      const inventoryRef = doc(
        db,
        "restaurants",
        restaurantId,
        "inventory",
        item.id
      );
      const wasteRef = doc(
        collection(db, "restaurants", restaurantId, "wasteLog")
      );
      const costImpact = item.quantity * item.costPerUnit;

      const batch = writeBatch(db);
      batch.update(inventoryRef, {
        status: "spoiled",
        updatedAt: serverTimestamp(),
      });
      batch.set(wasteRef, {
        ingredientId: item.ingredientId,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        reason: "spoiled",
        date: Timestamp.now(),
        costImpact,
      });
      await batch.commit();
      onChanged();
    } catch {
      setError("Couldn't mark item spoiled. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: InventoryItem) {
    if (!item.id) return;
    setBusyId(item.id);
    setError(null);
    try {
      await deleteDoc(
        doc(db, "restaurants", restaurantId, "inventory", item.id)
      );
      onChanged();
    } catch {
      setError("Couldn't delete item. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <h3 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Current stock ({items.length} items, ${totalCost.toFixed(2)} total)
      </h3>
      {error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No active inventory. Add an item above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">$/Unit</th>
                <th className="py-2 pr-4">Supplier</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isEditing = editingId === item.id;
                const isBusy = busyId === item.id;
                const remaining = item.expiryDate
                  ? daysUntilExpiry(item.expiryDate.toDate())
                  : null;
                return (
                  <tr
                    key={item.id}
                    className="border-b border-black/[.04] dark:border-white/[.08]"
                  >
                    <td className="py-2 pr-4 text-black dark:text-zinc-50">
                      {item.itemName}
                    </td>
                    <td className="py-2 pr-4">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-20 rounded border border-black/[.08] bg-transparent px-2 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="py-2 pr-4">{item.unit}</td>
                    <td className="py-2 pr-4">
                      ${item.costPerUnit.toFixed(2)}
                    </td>
                    <td className="py-2 pr-4">{item.supplier}</td>
                    <td className="py-2 pr-4">
                      {remaining === null
                        ? "—"
                        : remaining < 0
                          ? "Expired"
                          : `${remaining}d`}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <button
                            onClick={() => saveEdit(item)}
                            disabled={isBusy}
                            className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            disabled={isBusy}
                            className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => markSpoiled(item)}
                          disabled={isBusy}
                          className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                        >
                          Spoiled
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={isBusy}
                          className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
