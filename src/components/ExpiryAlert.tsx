"use client";

import type { InventoryItem } from "@/lib/types";
import { daysUntilExpiry, expiringItems } from "@/lib/costAnalysis";

export default function ExpiryAlert({
  inventory,
}: {
  inventory: InventoryItem[];
}) {
  const items = expiringItems(inventory, 7);
  if (items.length === 0) return null;

  return (
    <div className="rounded border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <h3 className="mb-2 text-sm font-medium text-amber-900 dark:text-amber-200">
        Expiring soon
      </h3>
      <ul className="flex flex-col gap-1 text-sm text-amber-800 dark:text-amber-300">
        {items.map((item) => {
          const remaining = item.expiryDate
            ? daysUntilExpiry(item.expiryDate.toDate())
            : null;
          return (
            <li key={item.id}>
              {item.itemName} – expires in {remaining}{" "}
              {remaining === 1 ? "day" : "days"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
