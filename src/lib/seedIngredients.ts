import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ingredientSeed } from "@/data/ingredientSeed";

let seedPromise: Promise<void> | null = null;

/**
 * Seeds the shared `ingredients` collection from src/data/ingredientSeed.ts
 * exactly once, guarded against concurrent double-inserts. Safe to call from
 * multiple places (e.g. on dashboard mount and again before generating a
 * recipe) — repeated calls collapse into the same in-flight/settled promise.
 */
export function ensureIngredientsSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = doSeed().catch((err) => {
      // Allow a retry on the next call if this attempt failed.
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function doSeed(): Promise<void> {
  const seen = new Set<string>();
  for (const ingredient of ingredientSeed) {
    const key = ingredient.name.trim().toLowerCase();
    if (seen.has(key)) {
      throw new Error(
        `Duplicate ingredient name in seed data: "${ingredient.name}"`
      );
    }
    seen.add(key);
  }

  const metaRef = doc(db, "meta", "ingredientsSeed");
  const ingredientRefs = ingredientSeed.map(() =>
    doc(collection(db, "ingredients"))
  );

  await runTransaction(db, async (tx) => {
    const metaSnap = await tx.get(metaRef);
    if (metaSnap.exists() && metaSnap.data()?.seeded === true) {
      return; // Already seeded — no-op.
    }
    ingredientRefs.forEach((ref, i) => {
      tx.set(ref, ingredientSeed[i]);
    });
    tx.set(metaRef, {
      seeded: true,
      seededAt: serverTimestamp(),
      count: ingredientSeed.length,
    });
  });
}
