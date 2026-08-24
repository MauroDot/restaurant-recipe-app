"use client";

import { useState } from "react";

type Faq = { q: string; a: string };

/**
 * Three of the given spec's ten answers described capabilities this app
 * doesn't have (manually editing a saved recipe, deleting one) — recipes
 * are immutable by design once saved (allow update, delete: if false in
 * firestore.rules; see chunk 7). Rewrote those three to describe what
 * actually exists instead of publishing a false claim about the product.
 * The rest are close to the given text, checked against real behavior.
 */
const FAQS: Faq[] = [
  {
    q: "What is the target food cost %?",
    a: "Most restaurants aim for 28-35% food cost. If a dish costs $10 to make per portion, a 30% target means selling it for roughly $33. The Generate tab's target cost input and the 28/32/35% menu price suggestions on every recipe are built around this.",
  },
  {
    q: "How does trim loss affect portion costs?",
    a: "Trim loss is waste from prep (e.g. peeling potatoes). If you buy 20 lbs of potatoes at $0.90/lb with 8% trim loss, the usable yield is 18.4 lbs, so the effective cost per usable pound is higher than the sticker price. Every ingredient in the catalog has its own trim loss %, and recipe costing accounts for it automatically.",
  },
  {
    q: "Can I use recipes from other restaurants?",
    a: "No — recipes are scoped to your restaurant; you can't see what another restaurant generated or saved. Everyone draws from the same shared ingredient catalog and pricing, though, so costs are consistent across restaurants.",
  },
  {
    q: "What if I don't have an ingredient the recipe calls for?",
    a: "Recipe generation only chooses from the shared ingredient catalog, plus any custom ingredients you type into the \"custom ingredients\" field on the Generate tab — so if something's missing, add it there and Claude will consider using it. Recipes can't be manually edited after they're generated, but you can always generate a new one with different inputs.",
  },
  {
    q: "How do ingredient ratings work?",
    a: "After using an ingredient, rate it (taste, texture, price-to-quality) from the Inventory tab or the Ingredient Intelligence tab. Ratings from everyone at your restaurant aggregate together — including head-to-head comparisons against alternatives — so you can spot the best suppliers and ingredients over time.",
  },
  {
    q: "What happens to a recipe once it's saved?",
    a: "Recipes can't be deleted or edited once saved — they stay in your Recipes tab permanently, including their full feedback and rating history. If you rate one 3 stars or lower, you can generate an AI-improved version from that feedback; the original stays saved and is simply marked as superseded, so nothing is lost.",
  },
  {
    q: "Can I export recipes to PDF or print them?",
    a: "Not yet — it's on the roadmap. For now you can screenshot or copy recipe details from the app.",
  },
  {
    q: "Is this data secure?",
    a: "Your restaurant's data is isolated from other restaurants by security rules enforced server-side, not just hidden in the UI, and Firebase encrypts data at rest and in transit. This app is still pre-beta, so treat it accordingly, but the isolation itself has been deliberately tested.",
  },
  {
    q: "How often should I rate recipes?",
    a: "Rating right after service, while the feedback is fresh, is most useful. Even one rating per recipe helps the system improve.",
  },
  {
    q: "What's the difference between cost per portion and total cost?",
    a: "Cost per portion is the ingredient cost for one plate (e.g. $3.50). Total cost is cost per portion times the number of servings (e.g. $3.50 x 4 = $14). Menu price recommendations are always based on cost per portion, not total cost.",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {FAQS.map((faq, i) => (
        <div
          key={i}
          className="rounded border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-black"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 text-left font-medium text-black dark:text-zinc-50"
          >
            {faq.q}
            <span className="text-zinc-400">{openIndex === i ? "−" : "+"}</span>
          </button>
          {openIndex === i && (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{faq.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}
