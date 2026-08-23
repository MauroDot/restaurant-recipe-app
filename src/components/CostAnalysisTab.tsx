"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import type { InventoryItem, WasteLogEntry } from "@/lib/types";
import {
  summarizeInventory,
  summarizeWaste,
  summarizeBySupplier,
  type CostDriver,
  type SupplierSummary,
} from "@/lib/costAnalysis";
import CostSummary from "@/components/CostSummary";
import TopCostDrivers from "@/components/TopCostDrivers";
import PriceTrending from "@/components/PriceTrending";
import SupplierComparison from "@/components/SupplierComparison";
import WasteLog from "@/components/WasteLog";

type Summary = {
  totalValue: number;
  itemCount: number;
  topCostDrivers: CostDriver[];
  wasteCost: number;
  wastePct: number;
  suppliers: SupplierSummary[];
  thisWeekWaste: WasteLogEntry[];
};

export default function CostAnalysisTab() {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    (async () => {
      try {
        const [invSnap, wasteSnap] = await Promise.all([
          getDocs(
            collection(db, "restaurants", profile.restaurantId, "inventory")
          ),
          getDocs(
            collection(db, "restaurants", profile.restaurantId, "wasteLog")
          ),
        ]);
        if (cancelled) return;

        const inventory = invSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as InventoryItem
        );
        const wasteLog = wasteSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as WasteLogEntry
        );

        const { totalValue, itemCount, topCostDrivers } =
          summarizeInventory(inventory);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const waste = summarizeWaste(wasteLog, weekAgo);
        const wastePct = totalValue > 0 ? (waste.cost / totalValue) * 100 : 0;
        const suppliers = summarizeBySupplier(inventory);
        const thisWeekWaste = wasteLog.filter(
          (w) => w.date.toDate() >= weekAgo
        );

        setSummary({
          totalValue,
          itemCount,
          topCostDrivers,
          wasteCost: waste.cost,
          wastePct,
          suppliers,
          thisWeekWaste,
        });
      } catch {
        if (!cancelled) {
          setError("Couldn't load cost analysis data. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile) return null;
  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  if (summary === null) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CostSummary
        totalValue={summary.totalValue}
        itemCount={summary.itemCount}
        wasteCost={summary.wasteCost}
        wastePct={summary.wastePct}
      />
      <TopCostDrivers drivers={summary.topCostDrivers} />
      <PriceTrending
        restaurantId={profile.restaurantId}
        ingredients={summary.topCostDrivers}
      />
      <SupplierComparison suppliers={summary.suppliers} />
      <WasteLog entries={summary.thisWeekWaste} />
    </div>
  );
}
