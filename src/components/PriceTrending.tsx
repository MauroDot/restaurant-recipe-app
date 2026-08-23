"use client";

import { useEffect, useState } from "react";
import {
  Timestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "@/lib/firebase";
import type { CostDriver } from "@/lib/costAnalysis";
import type { CostHistoryEntry } from "@/lib/types";

export default function PriceTrending({
  restaurantId,
  ingredients,
}: {
  restaurantId: string;
  ingredients: CostDriver[];
}) {
  const [selectedId, setSelectedId] = useState(
    ingredients[0]?.ingredientId ?? ""
  );
  const [history, setHistory] = useState<CostHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    (async () => {
      try {
        const ninetyDaysAgo = Timestamp.fromDate(
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        );
        const q = query(
          collection(db, "restaurants", restaurantId, "costHistory"),
          where("ingredientId", "==", selectedId),
          where("date", ">=", ninetyDaysAgo)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const entries = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as CostHistoryEntry
        );
        entries.sort((a, b) => a.date.toMillis() - b.date.toMillis());
        setHistory(entries);
      } catch {
        if (!cancelled) {
          setError("Couldn't load price history. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, selectedId]);

  const data = (history ?? []).map((h) => ({
    date: h.date.toDate().toLocaleDateString(),
    costPerUnit: h.costPerUnit,
  }));

  return (
    <div className="rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Price trending (last 90 days)
        </h3>
        {ingredients.length > 0 && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded border border-black/[.08] bg-transparent px-2 py-1 text-sm text-black dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
          >
            {ingredients.map((i) => (
              <option key={i.ingredientId} value={i.ingredientId}>
                {i.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {ingredients.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No active inventory yet.
        </p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : history === null ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No purchase history in the last 90 days.
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, "Cost/unit"]} />
              <Line
                type="monotone"
                dataKey="costPerUnit"
                stroke="#3f3f46"
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
