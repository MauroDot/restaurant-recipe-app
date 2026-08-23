"use client";

import type { SupplierSummary } from "@/lib/costAnalysis";

export default function SupplierComparison({
  suppliers,
}: {
  suppliers: SupplierSummary[];
}) {
  return (
    <div className="rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <h3 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Supplier comparison
      </h3>
      {suppliers.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No active inventory yet.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-2 pr-4">Supplier</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Avg cost/item</th>
            </tr>
          </thead>
          <tbody>
            {suppliers
              .slice()
              .sort((a, b) => b.avgCostPerItem - a.avgCostPerItem)
              .map((s) => (
                <tr
                  key={s.supplier}
                  className="border-b border-black/[.04] dark:border-white/[.08]"
                >
                  <td className="py-2 pr-4 text-black dark:text-zinc-50">
                    {s.supplier}
                  </td>
                  <td className="py-2 pr-4">{s.itemCount}</td>
                  <td className="py-2 pr-4">
                    ${s.avgCostPerItem.toFixed(2)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
