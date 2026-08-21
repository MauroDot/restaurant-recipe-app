import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { INGREDIENT_SEED_MARKER_ID } from "@/src/data/ingredientSeed";
import type {
  Cuisine,
  Ingredient,
  InventoryItem,
  Recipe,
  Restaurant,
  UserProfile,
} from "@/src/lib/types";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return Date.now();
}

// ---------- Users / restaurants (signup flow) ----------

export async function createUserAndRestaurant(params: {
  uid: string;
  email: string;
  restaurantName: string;
  cuisine: Cuisine;
}): Promise<string> {
  const restaurantRef = doc(collection(db, "restaurants"));

  await setDoc(restaurantRef, {
    ownerId: params.uid,
    name: params.restaurantName,
    cuisine: params.cuisine,
    subscriptionTier: "starter",
    createdAt: serverTimestamp(),
  } satisfies Omit<Restaurant, "id" | "createdAt"> & { createdAt: unknown });

  await setDoc(doc(db, "users", params.uid), {
    email: params.email,
    displayName: params.restaurantName,
    restaurantId: restaurantRef.id,
    createdAt: serverTimestamp(),
  } satisfies Omit<UserProfile, "uid" | "createdAt"> & { createdAt: unknown });

  return restaurantRef.id;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, "users", uid));
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    uid: docSnap.id,
    email: data.email,
    displayName: data.displayName,
    restaurantId: data.restaurantId,
    createdAt: toMillis(data.createdAt),
  };
}

// ---------- Recipes ----------

function mapRecipe(snap: QueryDocumentSnapshot<DocumentData>): Recipe {
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    cuisine: data.cuisine,
    dishType: data.dishType,
    style: data.style,
    ingredients: data.ingredients ?? [],
    instructions: data.instructions,
    cookingTime: data.cookingTime,
    difficulty: data.difficulty,
    imageUrl: data.imageUrl,
    totalCost: data.totalCost,
    restaurantId: data.restaurantId,
    createdBy: data.createdBy,
    createdAt: toMillis(data.createdAt),
    rating: data.rating ?? 0,
    uses: data.uses ?? 0,
  };
}

export async function getRecipes(restaurantId: string): Promise<Recipe[]> {
  // Sorted client-side (rather than via `orderBy("createdAt")` alongside the
  // `restaurantId` equality filter) to avoid requiring a composite Firestore index —
  // fine at the per-restaurant recipe volumes this app deals with.
  const q = query(collection(db, "recipes"), where("restaurantId", "==", restaurantId));
  const snap = await getDocs(q);
  return snap.docs.map(mapRecipe).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveRecipe(
  recipe: Omit<Recipe, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, "recipes"), {
    ...recipe,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ---------- Inventory ----------

function mapInventoryItem(
  snap: QueryDocumentSnapshot<DocumentData>,
): InventoryItem {
  const data = snap.data();
  return {
    id: snap.id,
    ingredientName: data.ingredientName,
    ingredientId: data.ingredientId,
    quantityOnHand: data.quantityOnHand,
    unit: data.unit,
    costPerUnit: data.costPerUnit,
    dateReceived: toMillis(data.dateReceived),
    expirationDate: data.expirationDate ? toMillis(data.expirationDate) : undefined,
    supplier: data.supplier,
    createdAt: toMillis(data.createdAt),
  };
}

export async function getInventoryItems(
  restaurantId: string,
): Promise<InventoryItem[]> {
  const snap = await getDocs(
    collection(db, "restaurants", restaurantId, "inventory"),
  );
  const items = snap.docs.map(mapInventoryItem);
  // Soonest expiration first; items with no expiration sort last.
  return items.sort((a, b) => {
    if (a.expirationDate == null && b.expirationDate == null) return 0;
    if (a.expirationDate == null) return 1;
    if (b.expirationDate == null) return -1;
    return a.expirationDate - b.expirationDate;
  });
}

export async function addInventoryItem(
  restaurantId: string,
  item: Omit<InventoryItem, "id" | "createdAt">,
): Promise<string> {
  // Firestore's addDoc rejects `undefined` field values outright, so the optional
  // expirationDate must be omitted entirely rather than set to undefined.
  const { expirationDate, ...rest } = item;
  const ref = await addDoc(collection(db, "restaurants", restaurantId, "inventory"), {
    ...rest,
    ...(expirationDate !== undefined ? { expirationDate } : {}),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ---------- Ingredients ----------

export async function getIngredients(): Promise<Ingredient[]> {
  const snap = await getDocs(collection(db, "ingredients"));
  return snap.docs
    .filter((docSnap) => docSnap.id !== INGREDIENT_SEED_MARKER_ID)
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        unit: data.unit,
        currentCost: data.currentCost,
        trimLoss: data.trimLoss,
        suppliers: data.suppliers ?? [],
        createdAt: toMillis(data.createdAt),
      };
    });
}

export async function incrementRecipeUses(recipeId: string): Promise<void> {
  await updateDoc(doc(db, "recipes", recipeId), { uses: increment(1) });
}
