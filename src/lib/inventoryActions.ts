import {
  Timestamp,
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AddInventoryPurchaseInput = {
  restaurantId: string;
  ingredientId: string;
  itemName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  dateReceived: Timestamp;
  expiryDate?: Timestamp | null;
};

/**
 * Writes one `inventory` doc plus a matching `costHistory` doc in a single
 * batch — the shared "record a purchase" write shape used both by manual
 * adds (InventoryForm.tsx) and by quick-adding parsed invoice line items
 * (InvoiceToInventory.tsx), so the write shape only exists in one place.
 */
export async function addInventoryPurchase(
  input: AddInventoryPurchaseInput
): Promise<void> {
  const inventoryRef = doc(
    collection(db, "restaurants", input.restaurantId, "inventory")
  );
  const costHistoryRef = doc(
    collection(db, "restaurants", input.restaurantId, "costHistory")
  );

  const batch = writeBatch(db);
  batch.set(inventoryRef, {
    ingredientId: input.ingredientId,
    itemName: input.itemName,
    quantity: input.quantity,
    unit: input.unit,
    costPerUnit: input.costPerUnit,
    supplier: input.supplier,
    dateReceived: input.dateReceived,
    expiryDate: input.expiryDate ?? null,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(costHistoryRef, {
    ingredientId: input.ingredientId,
    date: input.dateReceived,
    costPerUnit: input.costPerUnit,
    supplier: input.supplier,
    quantity: input.quantity,
  });
  await batch.commit();
}
