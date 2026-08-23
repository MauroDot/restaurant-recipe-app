"use client";

import type { WasteLogEntry } from "@/lib/types";

export default function WasteLog({ entries }: { entries: WasteLogEntry[] }) {
  return (
    <div className="rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <h3 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Waste log (this week)
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No waste logged this week.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">Qty</th>
              <th className="py-2 pr-4">Reason</th>
              <th className="py-2 pr-4">Cost</th>
            </tr>
          </thead>
          <tbody>
            {entries
              .slice()
              .sort((a, b) => b.date.toMillis() - a.date.toMillis())
              .map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-black/[.04] dark:border-white/[.08]"
                >
                  <td className="py-2 pr-4">
                    {entry.date.toDate().toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 text-black dark:text-zinc-50">
                    {entry.itemName}
                  </td>
                  <td className="py-2 pr-4">
                    {entry.quantity} {entry.unit}
                  </td>
                  <td className="py-2 pr-4">{entry.reason}</td>
                  <td className="py-2 pr-4">
                    ${entry.costImpact.toFixed(2)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
