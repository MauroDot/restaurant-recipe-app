import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

/**
 * Recomputes aggregateRating/ratingCount/lastRatedAt on every recipe doc in
 * a version lineage (v1, v2, ...) whenever feedback is written on ANY of
 * them — the spec's own design decision is that v1/v2/... share one rating
 * ("they're the same recipe improved"). Since recipes are a flat collection
 * (not nested under a lineage), "the lineage" is resolved via baseRecipeId:
 * the root is the doc's own id if it has no baseRecipeId, else its
 * baseRecipeId. The lineage is small (1-2 docs today, bounded even as more
 * versions accumulate) — this stays a handful of reads, not a scan.
 */
export const aggregateRecipeRating = onDocumentWritten(
  { document: "recipes/{recipeId}/feedback/{feedbackId}", region: "us-central1" },
  async (event) => {
    const { recipeId } = event.params;
    const db = getFirestore();

    const recipeRef = db.doc(`recipes/${recipeId}`);
    const recipeSnap = await recipeRef.get();
    if (!recipeSnap.exists) return; // recipe itself was deleted — nothing to do

    const recipeData = recipeSnap.data()!;
    const rootId: string = recipeData.baseRecipeId ?? recipeId;

    // Every doc in the lineage: the root itself, plus anything whose
    // baseRecipeId points at the root.
    const [rootSnap, descendantsSnap] = await Promise.all([
      db.doc(`recipes/${rootId}`).get(),
      db.collection("recipes").where("baseRecipeId", "==", rootId).get(),
    ]);

    const lineageRefs = [
      ...(rootSnap.exists ? [rootSnap.ref] : []),
      ...descendantsSnap.docs.map((d) => d.ref),
    ];
    if (lineageRefs.length === 0) return;

    // Sum feedback across every doc in the lineage.
    let ratingSum = 0;
    let ratingCount = 0;
    let lastRatedAt: Timestamp | null = null;
    for (const ref of lineageRefs) {
      const feedbackSnap = await ref.collection("feedback").get();
      for (const doc of feedbackSnap.docs) {
        const f = doc.data();
        if (typeof f.rating === "number") {
          ratingSum += f.rating;
          ratingCount++;
        }
        const createdAt = f.createdAt as Timestamp | undefined;
        if (createdAt && (!lastRatedAt || createdAt.toMillis() > lastRatedAt.toMillis())) {
          lastRatedAt = createdAt;
        }
      }
    }

    const aggregateRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

    const batch = db.batch();
    for (const ref of lineageRefs) {
      batch.update(ref, {
        aggregateRating,
        ratingCount,
        lastRatedAt, // Timestamp | null — matches RecipeVersionFields in src/lib/types.ts
      });
    }
    await batch.commit();
  }
);
