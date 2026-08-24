"use client";

import { useState } from "react";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import StarRating from "@/components/StarRating";

const PERFORMANCE_SUGGESTIONS = [
  "Melts smoothly",
  "Emulsifies well",
  "Good color",
  "Consistent quality",
];

/**
 * Rates one ingredient for the current restaurant. Used both standalone
 * (Ingredient Intelligence tab, given an ingredient the chef picked) and
 * inside a Modal from an Inventory row (chunk 7) — the caller decides how
 * it's presented, this component just needs the ingredient identity and a
 * save/cancel callback pair.
 */
export default function IngredientRatingForm({
  ingredientId,
  ingredientName,
  defaultSupplier,
  onSaved,
  onCancel,
}: {
  ingredientId: string;
  ingredientName: string;
  defaultSupplier?: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { currentUser, profile } = useAuth();

  const [taste, setTaste] = useState(0);
  const [texture, setTexture] = useState(0);
  const [priceToQuality, setPriceToQuality] = useState(0);
  const [performance, setPerformance] = useState("");
  const [supplier, setSupplier] = useState(defaultSupplier ?? "");
  const [comparedTo, setComparedTo] = useState("");
  const [winner, setWinner] = useState<"this" | "other" | "tie" | "">("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = taste > 0 && texture > 0 && priceToQuality > 0 && supplier.trim() !== "";

  async function handleSubmit() {
    if (!currentUser || !profile || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const ratingRef = doc(
        collection(db, "restaurants", profile.restaurantId, "ingredientRatings")
      );
      await setDoc(ratingRef, {
        ingredientId,
        taste,
        texture,
        priceToQuality,
        performance: performance.trim(),
        supplier: supplier.trim(),
        ...(comparedTo.trim() && winner
          ? { comparison: { comparedTo: comparedTo.trim(), winner } }
          : {}),
        ...(notes.trim() && { notes: notes.trim() }),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
      onSaved();
    } catch {
      setError("Couldn't save rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Rate: <span className="font-medium text-black dark:text-zinc-50">{ingredientName}</span>
      </p>

      <StarRating label="Taste / quality" value={taste || undefined} onChange={setTaste} />
      <StarRating label="Texture / feel" value={texture || undefined} onChange={setTexture} />
      <StarRating label="Price to quality" value={priceToQuality || undefined} onChange={setPriceToQuality} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          How did it perform?
        </label>
        <div className="flex flex-wrap gap-2">
          {PERFORMANCE_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPerformance(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                performance === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-black/[.08] text-zinc-700 hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-[#1a1a1a]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Or describe it (other...)"
          value={performance}
          onChange={(e) => setPerformance(e.target.value)}
          className="mt-1 rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="supplier" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Supplier
        </label>
        <input
          id="supplier"
          type="text"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-2 rounded border border-black/[.08] p-3 dark:border-white/[.145]">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Compare to alternative (optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Cabot butter"
          value={comparedTo}
          onChange={(e) => setComparedTo(e.target.value)}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black dark:border-white/[.145] dark:text-zinc-50"
        />
        {comparedTo.trim() && (
          <div className="flex gap-4 text-sm text-zinc-700 dark:text-zinc-300">
            {(["this", "tie", "other"] as const).map((w) => (
              <label key={w} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="winner"
                  checked={winner === w}
                  onChange={() => setWinner(w)}
                />
                {w === "this" ? "This is better" : w === "tie" ? "Tie" : "Other is better"}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ingNotes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Notes
        </label>
        <input
          id="ingNotes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black dark:border-white/[.145] dark:text-zinc-50"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
