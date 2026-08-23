import type { InventoryItem, WasteLogEntry } from "@/lib/types";

/** Days between now and an expiry date (negative if already past). */
export function daysUntilExpiry(expiryDate: Date): number {
  const now = new Date();
  return Math.floor(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/** Detects a price trend from the two most recent cost-history entries. */
export function detectTrend(
  costHistory: { costPerUnit: number }[]
): "up" | "down" | "stable" {
  if (costHistory.length < 2) return "stable";
  const [prev, current] = costHistory.slice(-2);
  const change = ((current.costPerUnit - prev.costPerUnit) / prev.costPerUnit) * 100;
  if (change > 2) return "up";
  if (change < -2) return "down";
  return "stable";
}

/** Active inventory items expiring within `days` (and not already past). */
export function expiringItems(
  inventory: InventoryItem[],
  days = 7
): InventoryItem[] {
  return inventory.filter((item) => {
    if (!item.expiryDate) return false;
    const remaining = daysUntilExpiry(item.expiryDate.toDate());
    return remaining <= days && remaining > 0;
  });
}

export type CostDriver = {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  totalCost: number;
  pctOfTotal: number;
};

/** Total inventory value, item count, and ingredients ranked by cost share. */
export function summarizeInventory(inventory: InventoryItem[]): {
  totalValue: number;
  itemCount: number;
  topCostDrivers: CostDriver[];
} {
  const active = inventory.filter((item) => item.status === "active");
  const totalValue = active.reduce(
    (sum, item) => sum + item.quantity * item.costPerUnit,
    0
  );

  const byIngredient = new Map<
    string,
    {
      ingredientId: string;
      name: string;
      quantity: number;
      unit: string;
      totalCost: number;
    }
  >();
  for (const item of active) {
    const cost = item.quantity * item.costPerUnit;
    const existing = byIngredient.get(item.ingredientId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.totalCost += cost;
    } else {
      byIngredient.set(item.ingredientId, {
        ingredientId: item.ingredientId,
        name: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        totalCost: cost,
      });
    }
  }

  const topCostDrivers: CostDriver[] = Array.from(byIngredient.values())
    .map((d) => ({
      ...d,
      pctOfTotal: totalValue > 0 ? (d.totalCost / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  return { totalValue, itemCount: active.length, topCostDrivers };
}

/** Waste item count and total cost impact since `sinceDate`. */
export function summarizeWaste(
  wasteLog: WasteLogEntry[],
  sinceDate: Date
): { items: number; cost: number } {
  const recent = wasteLog.filter((w) => w.date.toDate() >= sinceDate);
  return {
    items: recent.length,
    cost: recent.reduce((sum, w) => sum + w.costImpact, 0),
  };
}

export type SupplierSummary = {
  supplier: string;
  itemCount: number;
  avgCostPerItem: number;
};

/** Active inventory grouped by supplier, with average cost per item. */
export function summarizeBySupplier(
  inventory: InventoryItem[]
): SupplierSummary[] {
  const active = inventory.filter((item) => item.status === "active");
  const bySupplier = new Map<string, { itemCount: number; totalCost: number }>();
  for (const item of active) {
    const cost = item.quantity * item.costPerUnit;
    const existing = bySupplier.get(item.supplier);
    if (existing) {
      existing.itemCount += 1;
      existing.totalCost += cost;
    } else {
      bySupplier.set(item.supplier, { itemCount: 1, totalCost: cost });
    }
  }
  return Array.from(bySupplier.entries()).map(([supplier, d]) => ({
    supplier,
    itemCount: d.itemCount,
    avgCostPerItem: d.totalCost / d.itemCount,
  }));
}
