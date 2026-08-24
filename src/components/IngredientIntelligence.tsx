"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import type { Ingredient } from "@/lib/types";
import Modal from "@/components/Modal";
import IngredientRatingForm from "@/components/IngredientRatingForm";

type Comparison = {
  comparedTo: string;
  thisWins: number;
  otherWins: number;
  ties: number;
  preferenceRatio: number;
};

type IntelligenceResponse = {
  ingredientId: string;
  name: string;
  currentCost: number;
  unit: string;
  averageRating: number;
  ratingCount: number;
  priceToQuality: number;
  topPerformances: { text: string; voteCount: number }[];
  comparisons: Comparison[];
  priceTrend: {
    avg30d: number;
    avg90d: number;
    change: number;
    direction: "up" | "down" | "stable";
  };
};

/** Simple win/tie/loss proportion bar — see chunk 7 plan's UI scope note
 *  (folded into this file instead of a separate chart component; 2-3
 *  segments doesn't need axes/tooltips/its own file). */
function ComparisonBar({ comparison }: { comparison: Comparison }) {
  const total = comparison.thisWins + comparison.otherWins + comparison.ties;
  const thisPct = total > 0 ? (comparison.thisWins / total) * 100 : 0;
  const tiePct = total > 0 ? (comparison.ties / total) * 100 : 0;
  const otherPct = total > 0 ? (comparison.otherWins / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        vs. {comparison.comparedTo}:{" "}
        <span className="font-medium text-black dark:text-zinc-50">
          {Math.round(comparison.preferenceRatio * 100)}% prefer this
        </span>{" "}
        ({total} chef{total === 1 ? "" : "s"})
      </p>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {thisPct > 0 && <div className="h-full bg-emerald-600" style={{ width: `${thisPct}%` }} />}
        {tiePct > 0 && <div className="h-full bg-zinc-400 dark:bg-zinc-500" style={{ width: `${tiePct}%` }} />}
        {otherPct > 0 && <div className="h-full bg-amber-600" style={{ width: `${otherPct}%` }} />}
      </div>
    </div>
  );
}

export default function IngredientIntelligence() {
  const { currentUser } = useAuth();

  const [catalog, setCatalog] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [priceHistory, setPriceHistory] = useState<
    { date: string; costPerUnit: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "ingredients"));
      setCatalog(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ingredient));
    })();
  }, []);

  useEffect(() => {
    if (!selectedId || !currentUser) return;
    let cancelled = false;

    (async () => {
      setData(null);
      setError(null);
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch(
          `/api/ingredients/intelligence?ingredientId=${encodeURIComponent(selectedId)}`,
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as IntelligenceResponse;
        if (cancelled) return;
        setData(json);
        // A tiny two-point sparkline from the trend summary — the route
        // doesn't return the raw series, and a full 90-day series isn't
        // needed for a glance widget (PriceTrending.tsx on the Cost
        // Analysis tab already covers the detailed view).
        setPriceHistory([
          { date: "90d avg", costPerUnit: json.priceTrend.avg90d },
          { date: "30d avg", costPerUnit: json.priceTrend.avg30d },
        ]);
      } catch {
        if (!cancelled) setError("Couldn't load ingredient intelligence. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, currentUser, reloadKey]);

  const filtered = search.trim()
    ? catalog.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
    : catalog;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        Ingredient Insights
      </h2>

      <input
        type="text"
        placeholder="Search ingredient name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black dark:border-white/[.145] dark:text-zinc-50"
      />

      <div className="flex flex-wrap gap-2">
        {filtered.slice(0, 30).map((i) => (
          <button
            key={i.id}
            onClick={() => setSelectedId(i.id ?? null)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              selectedId === i.id
                ? "border-foreground bg-foreground text-background"
                : "border-black/[.08] text-zinc-700 hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-[#1a1a1a]"
            }`}
          >
            {i.name}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No matching ingredients.</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {selectedId && !data && !error && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      )}

      {data && (
        <div className="flex flex-col gap-4 rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              {data.name}
            </h3>
            {data.ratingCount > 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                ⭐ {data.averageRating.toFixed(1)} stars ({data.ratingCount} rating
                {data.ratingCount === 1 ? "" : "s"})
              </p>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No ratings yet.</p>
            )}
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              ${data.currentCost.toFixed(2)}/{data.unit}
              {data.ratingCount > 0 && ` · Price-to-quality ${data.priceToQuality.toFixed(1)}/5`}
            </p>
          </div>

          {data.topPerformances.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Performance
              </h4>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400">
                {data.topPerformances.map((p) => (
                  <li key={p.text}>
                    • {p.text} ({p.voteCount} vote{p.voteCount === 1 ? "" : "s"})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.comparisons.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Compared to alternatives
              </h4>
              {data.comparisons.map((c) => (
                <ComparisonBar key={c.comparedTo} comparison={c} />
              ))}
            </div>
          )}

          {data.priceTrend.avg90d > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Price trend
              </h4>
              <div className="h-16 w-40 text-zinc-600 dark:text-zinc-300">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory}>
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, "Avg cost/unit"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="costPerUnit"
                      stroke="currentColor"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                ${data.priceTrend.avg90d.toFixed(2)} → ${data.priceTrend.avg30d.toFixed(2)}
                {" · "}
                {data.priceTrend.direction === "stable"
                  ? "Stable"
                  : `${data.priceTrend.direction === "up" ? "Up" : "Down"} ${Math.abs(data.priceTrend.change).toFixed(0)}%`}{" "}
                over the last 30 days vs. the 90-day average.
              </p>
            </div>
          )}

          <div>
            <button
              onClick={() => setShowRatingForm(true)}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Rate this ingredient
            </button>
          </div>
        </div>
      )}

      {showRatingForm && selectedId && data && (
        <Modal title={`Rate: ${data.name}`} onClose={() => setShowRatingForm(false)}>
          <IngredientRatingForm
            ingredientId={selectedId}
            ingredientName={data.name}
            onSaved={() => {
              setShowRatingForm(false);
              // Re-trigger the fetch effect to pick up the just-updated cache.
              setReloadKey((k) => k + 1);
            }}
            onCancel={() => setShowRatingForm(false)}
          />
        </Modal>
      )}
    </div>
  );
}
