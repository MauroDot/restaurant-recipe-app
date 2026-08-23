"use client";

export default function CostSummary({
  totalValue,
  itemCount,
  wasteCost,
  wastePct,
}: {
  totalValue: number;
  itemCount: number;
  wasteCost: number;
  wastePct: number;
}) {
  return (
    <div className="rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <p className="text-2xl font-semibold text-black dark:text-zinc-50">
        Inventory value: ${totalValue.toFixed(2)}
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {itemCount} items · Waste this week: ${wasteCost.toFixed(2)} (
        {wastePct.toFixed(1)}%)
      </p>
    </div>
  );
}
