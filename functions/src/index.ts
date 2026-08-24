import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

/**
 * Mirrors users/{uid}.restaurantId onto the user's Firebase Auth custom
 * claims, so security rules that can't do a cross-service Firestore lookup
 * (e.g. Storage Rules, where firestore.get()/exists() don't work in this
 * project) can check request.auth.token.restaurantId directly instead.
 *
 * A Firestore trigger (not onUserCreate) is required: the Auth account is
 * created before the users/{uid} profile doc exists, so a create-trigger
 * would fire with no restaurantId to read yet.
 */
export const syncRestaurantClaim = onDocumentWritten(
  { document: "users/{uid}", region: "us-central1" },
  async (event) => {
    const { uid } = event.params;
    const after = event.data?.after;
    if (!after?.exists) return; // doc deleted — nothing to sync

    const restaurantId = after.data()?.restaurantId;
    if (!restaurantId) return;

    const auth = getAuth();
    const userRecord = await auth.getUser(uid);
    const claims = userRecord.customClaims ?? {};

    // Idempotency guard — required. The write below targets users/{uid},
    // this trigger's own path; without this check the function would
    // retrigger itself forever.
    if (claims.restaurantId === restaurantId) return;

    await auth.setCustomUserClaims(uid, { ...claims, restaurantId });

    await getFirestore()
      .doc(`users/${uid}`)
      .update({ claimsSyncedAt: FieldValue.serverTimestamp() });
  }
);

export { improveRecipe } from "./improveRecipe";
export { aggregateIngredientIntelligence } from "./aggregateIngredientIntelligence";
export { aggregateRecipeRating } from "./aggregateRecipeRating";
