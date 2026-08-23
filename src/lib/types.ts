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
