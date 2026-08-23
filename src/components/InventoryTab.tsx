"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import type { Ingredient, InventoryItem } from "@/lib/types";
import InventoryForm from "@/components/InventoryForm";
import InventoryTable from "@/components/InventoryTable";
import ExpiryAlert from "@/components/ExpiryAlert";

export default function InventoryTab() {
  const { profile } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    (async () => {
      try {
        const [ingSnap, invSnap] = await Promise.all([
          getDocs(collection(db, "ingredients")),
          getDocs(
            query(
              collection(db, "restaurants", profile.restaurantId, "inventory"),
              where("status", "==", "active")
            )
          ),
        ]);
        if (cancelled) return;

        setIngredients(
          ingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ingredient)
        );

        // Single-field filter only (no orderBy, no composite index needed)
        // — expiryDate is optional, and Firestore's orderBy would silently
        // exclude any doc missing the ordered field, dropping no-expiry
        // items (dry goods, etc.) from the table entirely. Sort
        // client-side instead, nearest expiry first, no-expiry items last.
        const items = invSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as InventoryItem
        );
        items.sort((a, b) => {
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return a.expiryDate.toMillis() - b.expiryDate.toMillis();
        });
        setInventory(items);
      } catch {
        if (!cancelled) {
          setError("Couldn't load inventory. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, reloadKey]);

  if (!profile) return null;

  const refresh = () => setReloadKey((k) => k + 1);

  return (
    <div className="flex flex-col gap-8">
      <InventoryForm
        restaurantId={profile.restaurantId}
        ingredients={ingredients}
        onAdded={refresh}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {inventory === null ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      ) : (
        <>
          <ExpiryAlert inventory={inventory} />
          <InventoryTable
            restaurantId={profile.restaurantId}
            items={inventory}
            onChanged={refresh}
          />
        </>
      )}
    </div>
  );
}
