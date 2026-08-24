import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Recomputes the intelligence cache for ONE ingredient whenever a rating for
 * it is written, in ONE restaurant (ratings are siloed per restaurant — see
 * chunk 7 design decision "not shared across restaurants"). Scoped to just
 * that ingredient's own ratings within that restaurant, not a whole-
 * restaurant scan — this is the "batch reads, not a write per rating"
 * requirement: one query, one write, per triggered change.
 */
export const aggregateIngredientIntelligence = onDocumentWritten(
  { document: "restaurants/{restaurantId}/ingredientRatings/{ratingId}", region: "us-central1" },
  async (event) => {
    const { restaurantId } = event.params;
    const after = event.data?.after;
    const before = event.data?.before;
    const ingredientId =
      (after?.exists ? after.data()?.ingredientId : undefined) ??
      (before?.exists ? before.data()?.ingredientId : undefined);
    if (!ingredientId) return;

    const db = getFirestore();
    const cacheRef = db.doc(
      `restaurants/${restaurantId}/ingredientIntelligenceCache/${ingredientId}`
    );

    const ratingsSnap = await db
      .collection(`restaurants/${restaurantId}/ingredientRatings`)
      .where("ingredientId", "==", ingredientId)
      .get();

    if (ratingsSnap.empty) {
      await cacheRef.set({
        lastUpdated: FieldValue.serverTimestamp(),
        ratingCount: 0,
        averageRating: 0,
        priceToQuality: 0,
        topPerformances: [],
        comparisons: [],
      });
      return;
    }

    let tasteSum = 0;
    let textureSum = 0;
    let ptqSum = 0;
    const performanceCounts = new Map<string, number>();
    const comparisonMap = new Map<
      string,
      { thisWins: number; otherWins: number; ties: number }
    >();

    for (const doc of ratingsSnap.docs) {
      const r = doc.data();
      tasteSum += typeof r.taste === "number" ? r.taste : 0;
      textureSum += typeof r.texture === "number" ? r.texture : 0;
      ptqSum += typeof r.priceToQuality === "number" ? r.priceToQuality : 0;

      if (typeof r.performance === "string" && r.performance.trim()) {
        const key = r.performance.trim();
        performanceCounts.set(key, (performanceCounts.get(key) ?? 0) + 1);
      }

      const comparedTo = r.comparison?.comparedTo;
      if (typeof comparedTo === "string" && comparedTo.trim()) {
        const key = comparedTo.trim();
        const c = comparisonMap.get(key) ?? { thisWins: 0, otherWins: 0, ties: 0 };
        if (r.comparison.winner === "this") c.thisWins++;
        else if (r.comparison.winner === "other") c.otherWins++;
        else c.ties++;
        comparisonMap.set(key, c);
      }
    }

    const n = ratingsSnap.size;
    const topPerformances = [...performanceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([text, voteCount]) => ({ text, voteCount }));
    const comparisons = [...comparisonMap.entries()].map(([comparedTo, c]) => {
      const decided = c.thisWins + c.otherWins;
      return {
        comparedTo,
        thisWins: c.thisWins,
        otherWins: c.otherWins,
        ties: c.ties,
        preferenceRatio: decided > 0 ? c.thisWins / decided : 0,
      };
    });

    await cacheRef.set({
      lastUpdated: FieldValue.serverTimestamp(),
      ratingCount: n,
      // Mean of taste and texture — see types.ts's IngredientIntelligenceCache
      // doc comment for why these two (not priceToQuality, reported separately).
      averageRating: (tasteSum + textureSum) / (2 * n),
      priceToQuality: ptqSum / n,
      topPerformances,
      comparisons,
    });
  }
);
