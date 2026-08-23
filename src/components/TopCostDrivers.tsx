"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CostDriver } from "@/lib/costAnalysis";

export default function TopCostDrivers({
  drivers,
}: {
  drivers: CostDriver[];
}) {
  const data = drivers.slice(0, 10).map((d) => ({
    name: d.name,
    totalCost: Number(d.totalCost.toFixed(2)),
    pctOfTotal: Number(d.pctOfTotal.toFixed(1)),
  }));

  return (
    <div className="rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <h3 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Top cost drivers
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No active inventory yet.
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={140} />
              <Tooltip
                formatter={(value, name) => [`$${value}`, String(name)]}
              />
              <Bar dataKey="totalCost" fill="#3f3f46" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
