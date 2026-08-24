import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ingredientSeed } from "@/data/ingredientSeed";

let seedPromise: Promise<void> | null = null;

/**
 * Ensures the shared `ingredients` collection has every entry in
 * ingredientSeed.ts, adding whatever's missing (by normalized name). Safe
 * to call repeatedly and from multiple places (dashboard mount, before
 * generating a recipe) — collapses into the same in-flight/settled promise
 * within a session.
 *
 * Additive by name, not a one-shot "seed once via a meta flag" gate
 * (that was this function's original chunk-1 design) — chunk 10 grew the
 * catalog from 328 to ~600 items, and a one-shot gate would have silently
 * skipped all ~280 new ones on every project that had already seeded.
 * Re-seeding by wiping the collection instead was rejected: existing
 * inventory/recipe/costHistory docs reference an ingredient by its
 * Firestore doc id, and reseeding with fresh doc()-generated ids would
 * orphan every one of those references. Diffing by name and only inserting
 * what's missing preserves every existing id.
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

  const existingSnap = await getDocs(collection(db, "ingredients"));
  const existingNames = new Set(
    existingSnap.docs.map((d) =>
      (d.data().name as string).trim().toLowerCase()
    )
  );
  const missing = ingredientSeed.filter(
    (i) => !existingNames.has(i.name.trim().toLowerCase())
  );
  if (missing.length === 0) return;

  // Firestore batches cap at 500 writes — chunk defensively even though
  // today's ~280-item gap is well under that.
  for (let i = 0; i < missing.length; i += 400) {
    const batch = writeBatch(db);
    for (const ingredient of missing.slice(i, i + 400)) {
      batch.set(doc(collection(db, "ingredients")), ingredient);
    }
    await batch.commit();
  }

  // Informational only now (nothing reads this to decide whether to seed
  // any more — see the additive design above) — kept so meta/ingredientsSeed
  // and its firestore.rules entry stay meaningful rather than going dead.
  const metaRef = doc(db, "meta", "ingredientsSeed");
  await writeBatch(db)
    .set(metaRef, {
      seeded: true,
      seededAt: serverTimestamp(),
      count: existingNames.size + missing.length,
    })
    .commit();
}
