"use client";

import type { InventoryItem } from "@/src/lib/types";
import InventoryForm from "@/src/components/dashboard/InventoryForm";

export default function InventoryTab({
  items,
  onAdd,
}: {
  items: InventoryItem[];
  onAdd: (item: Omit<InventoryItem, "id" | "createdAt">) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <InventoryForm onAdd={onAdd} />

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No inventory items yet. Add your first one above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Ingredient</th>
                <th className="px-4 py-2 font-medium">Quantity</th>
                <th className="px-4 py-2 font-medium">Cost/unit</th>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 text-slate-900">{item.ingredientName}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {item.quantityOnHand} {item.unit}
                  </td>
                  <td className="px-4 py-2 text-slate-600">${item.costPerUnit.toFixed(2)}</td>
                  <td className="px-4 py-2 text-slate-600">{item.supplier}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {item.expirationDate
                      ? new Date(item.expirationDate).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
