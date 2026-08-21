import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { Ingredient, IngredientSupplier, IngredientUnit } from "@/src/lib/types";

// Reserved doc id inside the `ingredients` collection used to atomically claim the
// seeding operation (see seedIngredientsToFirestore below). Not a real ingredient —
// getIngredients() filters it out.
export const INGREDIENT_SEED_MARKER_ID = "_seed_marker";

export type SeedIngredient = Omit<Ingredient, "id" | "createdAt">;

// [name, unit, currentCost, trimLoss, suppliers]
type Row = [string, IngredientUnit, number, number, IngredientSupplier[]];

function suppliers(...entries: [string, number][]): IngredientSupplier[] {
  return entries.map(([name, cost]) => ({ name, cost }));
}

// Two commonly-used broadline distributors, priced slightly apart, cover most rows.
const sysco = (cost: number) => ["Sysco", cost] as [string, number];
const usFoods = (cost: number, delta = 0.05) => ["US Foods", Number((cost + delta).toFixed(2))] as [string, number];

function row(
  name: string,
  unit: IngredientUnit,
  currentCost: number,
  trimLoss: number,
  extra?: [string, number],
): Row {
  const supplierEntries: [string, number][] = [sysco(currentCost), usFoods(currentCost)];
  if (extra) supplierEntries.push(extra);
  return [name, unit, currentCost, trimLoss, suppliers(...supplierEntries)];
}

// ---------- Produce: vegetables ----------
const VEGETABLES: Row[] = [
  row("Yellow Onion", "lb", 0.89, 0.1, ["Local Farm Co-op", 0.95]),
  row("Red Onion", "lb", 1.19, 0.1),
  row("Shallot", "lb", 3.49, 0.15),
  row("Garlic", "lb", 4.99, 0.13),
  row("Scallion", "lb", 2.29, 0.15),
  row("Leek", "lb", 2.79, 0.25),
  row("Carrot", "lb", 0.79, 0.12),
  row("Celery", "lb", 1.59, 0.15),
  row("Celery Root (Celeriac)", "lb", 2.49, 0.3),
  row("Russet Potato", "lb", 0.69, 0.15),
  row("Yukon Gold Potato", "lb", 0.99, 0.12),
  row("Fingerling Potato", "lb", 2.29, 0.05),
  row("Sweet Potato", "lb", 1.19, 0.15),
  row("Beet", "lb", 1.79, 0.25),
  row("Turnip", "lb", 1.29, 0.2),
  row("Parsnip", "lb", 1.99, 0.2),
  row("Radish", "lb", 2.19, 0.1),
  row("Fennel Bulb", "lb", 2.99, 0.25),
  row("Roma Tomato", "lb", 1.79, 0.08),
  row("Beefsteak Tomato", "lb", 1.99, 0.08),
  row("Cherry Tomato", "lb", 3.49, 0.03),
  row("San Marzano Tomato (canned)", "lb", 3.99, 0),
  row("Cucumber", "lb", 1.29, 0.1),
  row("Bell Pepper, Red", "lb", 2.49, 0.15),
  row("Bell Pepper, Green", "lb", 1.99, 0.15),
  row("Bell Pepper, Yellow", "lb", 2.59, 0.15),
  row("Jalapeño", "lb", 2.29, 0.1),
  row("Serrano Pepper", "lb", 2.79, 0.1),
  row("Poblano Pepper", "lb", 2.49, 0.15),
  row("Zucchini", "lb", 1.69, 0.1),
  row("Yellow Squash", "lb", 1.69, 0.1),
  row("Butternut Squash", "lb", 1.49, 0.3),
  row("Acorn Squash", "lb", 1.59, 0.3),
  row("Eggplant", "lb", 1.99, 0.15),
  row("Broccoli", "lb", 1.89, 0.25),
  row("Broccolini", "lb", 3.99, 0.15),
  row("Cauliflower", "lb", 1.79, 0.3),
  row("Brussels Sprouts", "lb", 3.29, 0.1),
  row("Green Cabbage", "lb", 0.89, 0.2),
  row("Red Cabbage", "lb", 1.09, 0.2),
  row("Napa Cabbage", "lb", 1.49, 0.15),
  row("Spinach", "lb", 3.49, 0.15),
  row("Baby Spinach", "lb", 4.49, 0.05),
  row("Kale", "lb", 2.49, 0.2),
  row("Arugula", "lb", 4.99, 0.05),
  row("Romaine Lettuce", "lb", 1.79, 0.2),
  row("Butter Lettuce", "lb", 2.99, 0.15),
  row("Mesclun Mix", "lb", 5.99, 0),
  row("Radicchio", "lb", 3.99, 0.15),
  row("Endive", "lb", 4.49, 0.1),
  row("Mushroom, Button", "lb", 2.99, 0.1),
  row("Mushroom, Cremini", "lb", 3.49, 0.1),
  row("Mushroom, Portobello", "lb", 4.49, 0.15),
  row("Mushroom, Shiitake", "lb", 6.99, 0.15),
  row("Mushroom, Oyster", "lb", 7.99, 0.1),
  row("Corn, Sweet", "lb", 1.29, 0.35),
  row("Green Bean", "lb", 2.49, 0.08),
  row("Snap Pea", "lb", 3.49, 0.05),
  row("Asparagus", "lb", 3.99, 0.2),
  row("Artichoke", "lb", 3.29, 0.4),
];

// ---------- Produce: fruits ----------
const FRUITS: Row[] = [
  row("Lemon", "lb", 1.99, 0.3),
  row("Lime", "lb", 2.29, 0.3),
  row("Orange", "lb", 1.49, 0.3),
  row("Blood Orange", "lb", 2.99, 0.3),
  row("Grapefruit", "lb", 1.79, 0.35),
  row("Avocado", "lb", 2.49, 0.35),
  row("Apple, Granny Smith", "lb", 1.69, 0.1),
  row("Apple, Honeycrisp", "lb", 2.49, 0.1),
  row("Pear", "lb", 1.99, 0.1),
  row("Banana", "lb", 0.59, 0.35),
  row("Strawberry", "lb", 3.99, 0.08),
  row("Blueberry", "lb", 5.99, 0),
  row("Raspberry", "lb", 8.99, 0),
  row("Blackberry", "lb", 6.99, 0),
  row("Fig", "lb", 6.99, 0.05),
  row("Peach", "lb", 2.49, 0.15),
  row("Plum", "lb", 2.29, 0.1),
  row("Cherry", "lb", 5.99, 0.12),
  row("Grape, Red Seedless", "lb", 3.49, 0.03),
  row("Pomegranate", "lb", 2.99, 0.55),
  row("Mango", "lb", 1.99, 0.4),
  row("Pineapple", "lb", 1.29, 0.5),
  row("Cantaloupe", "lb", 0.99, 0.35),
  row("Watermelon", "lb", 0.49, 0.35),
  row("Cranberry, Fresh", "lb", 3.99, 0.02),
];

// ---------- Dairy & eggs ----------
const DAIRY: Row[] = [
  row("Unsalted Butter", "lb", 4.29, 0),
  row("Salted Butter", "lb", 4.19, 0),
  row("Heavy Cream", "cup", 0.89, 0),
  row("Whole Milk", "cup", 0.29, 0),
  row("Half and Half", "cup", 0.49, 0),
  row("Buttermilk", "cup", 0.39, 0),
  row("Sour Cream", "cup", 0.79, 0),
  row("Crème Fraîche", "cup", 1.99, 0),
  row("Plain Greek Yogurt", "cup", 1.29, 0),
  row("Cream Cheese", "lb", 3.49, 0),
  row("Mascarpone", "lb", 6.99, 0),
  row("Ricotta", "lb", 4.49, 0),
  row("Mozzarella, Fresh", "lb", 5.99, 0),
  row("Mozzarella, Low-Moisture", "lb", 4.49, 0),
  row("Parmigiano-Reggiano", "lb", 14.99, 0.05),
  row("Pecorino Romano", "lb", 12.99, 0.05),
  row("Cheddar, Sharp", "lb", 5.49, 0.03),
  row("Gruyère", "lb", 13.99, 0.05),
  row("Blue Cheese", "lb", 9.99, 0.05),
  row("Goat Cheese", "lb", 8.99, 0),
  row("Feta", "lb", 6.49, 0),
  row("Burrata", "lb", 9.99, 0),
  row("Egg, Large", "lb", 3.99, 0.02),
];

// ---------- Proteins ----------
const PROTEINS: Row[] = [
  row("Chicken Breast, Boneless Skinless", "lb", 3.99, 0.1),
  row("Chicken Thigh, Boneless Skinless", "lb", 3.49, 0.08),
  row("Chicken, Whole", "lb", 1.99, 0.25),
  row("Chicken Wing", "lb", 2.99, 0.05),
  row("Duck Breast", "lb", 12.99, 0.15),
  row("Ground Beef, 80/20", "lb", 5.49, 0),
  row("Beef Chuck Roast", "lb", 6.99, 0.15),
  row("Beef Short Rib", "lb", 8.99, 0.2),
  row("Beef Tenderloin", "lb", 24.99, 0.15),
  row("Beef Ribeye", "lb", 16.99, 0.1),
  row("Beef Striploin (NY Strip)", "lb", 14.99, 0.1),
  row("Beef Brisket", "lb", 6.49, 0.2),
  row("Beef Flank Steak", "lb", 9.99, 0.1),
  row("Beef Oxtail", "lb", 7.99, 0.1),
  row("Pork Belly", "lb", 5.99, 0.1),
  row("Pork Loin", "lb", 4.49, 0.1),
  row("Pork Shoulder (Butt)", "lb", 3.49, 0.15),
  row("Pork Tenderloin", "lb", 6.99, 0.08),
  row("Pork Chop, Bone-In", "lb", 4.99, 0.05),
  row("Bacon", "lb", 6.99, 0.15),
  row("Pancetta", "lb", 9.99, 0.05),
  row("Prosciutto", "lb", 19.99, 0.02),
  row("Italian Sausage", "lb", 5.49, 0),
  row("Chorizo", "lb", 6.49, 0),
  row("Ground Pork", "lb", 4.99, 0),
  row("Lamb Rack", "lb", 19.99, 0.15),
  row("Lamb Shoulder", "lb", 8.99, 0.15),
  row("Ground Lamb", "lb", 8.49, 0),
  row("Salmon Fillet", "lb", 12.99, 0.1),
  row("Tuna, Ahi Grade", "lb", 18.99, 0.05),
  row("Halibut", "lb", 19.99, 0.1),
  row("Cod", "lb", 10.99, 0.1),
  row("Branzino, Whole", "lb", 11.99, 0.45),
  row("Trout, Whole", "lb", 8.99, 0.4),
  row("Shrimp, 16/20", "lb", 11.99, 0.15),
  row("Scallop, U10", "lb", 21.99, 0.05),
  row("Mussel", "lb", 4.99, 0.4),
  row("Clam, Littleneck", "lb", 5.99, 0.4),
  row("Lobster Tail", "lb", 24.99, 0.35),
  row("Crab, Lump", "lb", 22.99, 0.05),
  row("Octopus", "lb", 10.99, 0.2),
  row("Squid (Calamari)", "lb", 6.99, 0.1),
  row("Firm Tofu", "lb", 2.49, 0),
  row("Tempeh", "lb", 3.99, 0),
];

// ---------- Pantry: grains, pasta, legumes ----------
const PANTRY: Row[] = [
  row("All-Purpose Flour", "lb", 0.59, 0),
  row("00 Flour", "lb", 1.29, 0),
  row("Semolina Flour", "lb", 0.99, 0),
  row("Bread Flour", "lb", 0.69, 0),
  row("Cornmeal", "lb", 0.79, 0),
  row("Cornstarch", "lb", 1.49, 0),
  row("White Rice", "lb", 0.79, 0),
  row("Arborio Rice", "lb", 2.49, 0),
  row("Jasmine Rice", "lb", 0.99, 0),
  row("Basmati Rice", "lb", 1.49, 0),
  row("Wild Rice", "lb", 4.99, 0),
  row("Farro", "lb", 3.49, 0),
  row("Quinoa", "lb", 3.99, 0),
  row("Barley", "lb", 1.49, 0),
  row("Polenta (Cornmeal, Coarse)", "lb", 1.29, 0),
  row("Spaghetti", "lb", 1.49, 0),
  row("Penne", "lb", 1.49, 0),
  row("Fettuccine", "lb", 1.79, 0),
  row("Orecchiette", "lb", 2.29, 0),
  row("Lasagna Sheet", "lb", 2.49, 0),
  row("Gnocchi", "lb", 2.99, 0),
  row("Panko Breadcrumbs", "lb", 1.99, 0),
  row("Dried Breadcrumbs", "lb", 1.49, 0),
  row("Black Beans, Dried", "lb", 1.29, 0),
  row("Cannellini Beans, Dried", "lb", 1.79, 0),
  row("Chickpeas, Dried", "lb", 1.29, 0),
  row("Lentils, Green", "lb", 1.49, 0),
  row("Lentils, Red", "lb", 1.49, 0),
  row("Split Peas", "lb", 1.29, 0),
];

// ---------- Herbs & spices ----------
const HERBS_SPICES: Row[] = [
  row("Basil, Fresh", "oz", 0.79, 0.05),
  row("Parsley, Flat-Leaf", "oz", 0.29, 0.05),
  row("Cilantro", "oz", 0.29, 0.05),
  row("Mint", "oz", 0.49, 0.05),
  row("Dill", "oz", 0.59, 0.05),
  row("Chive", "oz", 0.69, 0.05),
  row("Tarragon", "oz", 0.99, 0.05),
  row("Rosemary", "oz", 0.49, 0.1),
  row("Thyme", "oz", 0.49, 0.1),
  row("Sage", "oz", 0.59, 0.1),
  row("Oregano, Fresh", "oz", 0.49, 0.1),
  row("Bay Leaf", "oz", 1.99, 0),
  row("Kosher Salt", "lb", 0.89, 0),
  row("Sea Salt, Fine", "lb", 1.99, 0),
  row("Flaky Sea Salt", "oz", 0.99, 0),
  row("Black Pepper, Ground", "lb", 8.99, 0),
  row("Black Peppercorn, Whole", "lb", 9.99, 0),
  row("White Pepper", "lb", 11.99, 0),
  row("Red Pepper Flake", "lb", 6.99, 0),
  row("Cayenne Pepper", "lb", 6.49, 0),
  row("Paprika, Sweet", "lb", 5.99, 0),
  row("Paprika, Smoked", "lb", 7.99, 0),
  row("Cumin, Ground", "lb", 5.49, 0),
  row("Coriander, Ground", "lb", 5.49, 0),
  row("Chili Powder", "lb", 5.99, 0),
  row("Garlic Powder", "lb", 4.99, 0),
  row("Onion Powder", "lb", 4.49, 0),
  row("Cinnamon, Ground", "lb", 6.99, 0),
  row("Nutmeg, Ground", "lb", 12.99, 0),
  row("Cloves, Ground", "lb", 11.99, 0),
  row("Allspice, Ground", "lb", 9.99, 0),
  row("Cardamom, Ground", "lb", 16.99, 0),
  row("Turmeric, Ground", "lb", 6.99, 0),
  row("Curry Powder", "lb", 6.49, 0),
  row("Fennel Seed", "lb", 6.99, 0),
  row("Mustard Seed", "lb", 5.99, 0),
  row("Sesame Seed", "lb", 5.49, 0),
  row("Star Anise", "lb", 14.99, 0),
  row("Saffron", "oz", 89.99, 0),
  row("Vanilla Bean", "oz", 9.99, 0),
];

// ---------- Oils, vinegars, condiments ----------
const OILS_CONDIMENTS: Row[] = [
  row("Extra Virgin Olive Oil", "cup", 3.49, 0),
  row("Pure Olive Oil", "cup", 2.49, 0),
  row("Vegetable Oil", "cup", 0.89, 0),
  row("Canola Oil", "cup", 0.99, 0),
  row("Grapeseed Oil", "cup", 2.29, 0),
  row("Sesame Oil", "cup", 3.99, 0),
  row("Truffle Oil", "cup", 12.99, 0),
  row("Red Wine Vinegar", "cup", 1.49, 0),
  row("White Wine Vinegar", "cup", 1.49, 0),
  row("Balsamic Vinegar", "cup", 3.99, 0),
  row("Aged Balsamic Vinegar", "cup", 9.99, 0),
  row("Sherry Vinegar", "cup", 2.99, 0),
  row("Apple Cider Vinegar", "cup", 1.29, 0),
  row("Rice Vinegar", "cup", 1.99, 0),
  row("Dijon Mustard", "cup", 2.49, 0),
  row("Whole Grain Mustard", "cup", 2.99, 0),
  row("Yellow Mustard", "cup", 1.49, 0),
  row("Mayonnaise", "cup", 1.99, 0),
  row("Ketchup", "cup", 1.29, 0),
  row("Hot Sauce", "cup", 2.99, 0),
  row("Worcestershire Sauce", "cup", 2.49, 0),
  row("Soy Sauce", "cup", 1.99, 0),
  row("Fish Sauce", "cup", 3.49, 0),
  row("Oyster Sauce", "cup", 3.99, 0),
  row("Hoisin Sauce", "cup", 3.49, 0),
  row("Sriracha", "cup", 2.99, 0),
  row("Tomato Paste", "cup", 1.99, 0),
  row("Capers", "oz", 1.49, 0),
  row("Kalamata Olives", "lb", 5.99, 0.1),
  row("Green Olives", "lb", 4.99, 0.1),
  row("Sun-Dried Tomato", "lb", 8.99, 0),
  row("Honey", "cup", 4.99, 0),
  row("Maple Syrup", "cup", 6.99, 0),
];

// ---------- Stocks & bases ----------
const STOCKS: Row[] = [
  row("Chicken Stock", "cup", 0.59, 0),
  row("Beef Stock", "cup", 0.69, 0),
  row("Vegetable Stock", "cup", 0.49, 0),
  row("Fish Stock", "cup", 0.99, 0),
  row("Lobster Stock", "cup", 2.49, 0),
  row("Demi-Glace", "cup", 4.99, 0),
  row("Coconut Milk", "cup", 1.29, 0),
  row("White Wine, Cooking", "cup", 1.49, 0),
  row("Red Wine, Cooking", "cup", 1.49, 0),
  row("Marsala Wine", "cup", 2.49, 0),
  row("Sherry, Cooking", "cup", 1.99, 0),
  row("Brandy", "cup", 3.99, 0),
];

// ---------- Baking ----------
const BAKING: Row[] = [
  row("Granulated Sugar", "lb", 0.79, 0),
  row("Brown Sugar", "lb", 0.99, 0),
  row("Powdered Sugar", "lb", 1.19, 0),
  row("Baking Powder", "lb", 3.99, 0),
  row("Baking Soda", "lb", 1.49, 0),
  row("Active Dry Yeast", "lb", 6.99, 0),
  row("Dark Chocolate, 70%", "lb", 9.99, 0),
  row("Milk Chocolate", "lb", 8.49, 0),
  row("White Chocolate", "lb", 9.49, 0),
  row("Cocoa Powder", "lb", 6.99, 0),
  row("Almond Flour", "lb", 5.99, 0),
  row("Almond, Sliced", "lb", 6.99, 0),
  row("Walnut, Chopped", "lb", 7.99, 0),
  row("Pecan, Chopped", "lb", 8.99, 0),
  row("Pine Nut", "lb", 19.99, 0),
  row("Pistachio, Shelled", "lb", 12.99, 0),
  row("Hazelnut", "lb", 9.99, 0.1),
  row("Gelatin Sheet", "oz", 2.99, 0),
  row("Puff Pastry", "lb", 4.99, 0),
  row("Phyllo Dough", "lb", 3.99, 0),
];

export const ingredientSeed: SeedIngredient[] = [
  ...VEGETABLES,
  ...FRUITS,
  ...DAIRY,
  ...PROTEINS,
  ...PANTRY,
  ...HERBS_SPICES,
  ...OILS_CONDIMENTS,
  ...STOCKS,
  ...BAKING,
].map(([name, unit, currentCost, trimLoss, ingredientSuppliers]) => ({
  name,
  unit,
  currentCost,
  trimLoss,
  suppliers: ingredientSuppliers,
}));

const FIRESTORE_BATCH_LIMIT = 450; // stay comfortably under Firestore's 500-write cap

/**
 * Seeds the `ingredients` collection from `ingredientSeed` if it's currently empty.
 * Called once from the dashboard on first load. Safe to call repeatedly, and safe to
 * call concurrently from multiple clients — a transaction on a reserved marker doc
 * ensures only one caller actually runs the batch writes.
 */
export async function seedIngredientsToFirestore(): Promise<boolean> {
  const existing = await getDocs(collection(db, "ingredients"));
  if (!existing.empty) return false;

  const markerRef = doc(db, "ingredients", INGREDIENT_SEED_MARKER_ID);
  const claimed = await runTransaction(db, async (tx) => {
    const marker = await tx.get(markerRef);
    if (marker.exists()) return false;
    tx.set(markerRef, { seededAt: serverTimestamp() });
    return true;
  });
  if (!claimed) return false;

  for (let start = 0; start < ingredientSeed.length; start += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    const chunk = ingredientSeed.slice(start, start + FIRESTORE_BATCH_LIMIT);
    for (const ingredient of chunk) {
      const ref = doc(collection(db, "ingredients"));
      batch.set(ref, { ...ingredient, createdAt: serverTimestamp() });
    }
    await batch.commit();
  }

  return true;
}
