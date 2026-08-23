import type { Timestamp } from "firebase/firestore";

export type Ingredient = {
  /** Firestore doc id; absent for raw seed data before it's been inserted. */
  id?: string;
  name: string;
  /** e.g. "lb", "oz", "each", "bunch", "qt", "gal" */
  unit: string;
  /** USD per `unit`, before trim loss is applied. */
  currentCost: number;
  /** Fraction in [0, 1) representing loss during trimming/prep. */
  trimLoss: number;
};

export type InventoryStatus = "active" | "spoiled" | "expired";

export type InventoryItem = {
  /** Firestore doc id; absent before insert. */
  id?: string;
  /** References ingredients/{id} from the shared catalog. */
  ingredientId: string;
  /** Snapshot of the ingredient's name at add-time. */
  itemName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  dateReceived: Timestamp;
  expiryDate?: Timestamp | null;
  status: InventoryStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type CostHistoryEntry = {
  id?: string;
  ingredientId: string;
  date: Timestamp;
  costPerUnit: number;
  supplier: string;
  quantity: number;
  notes?: string;
};

export type WasteLogEntry = {
  id?: string;
  ingredientId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  date: Timestamp;
  costImpact: number;
  notes?: string;
};
