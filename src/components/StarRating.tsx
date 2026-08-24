"use client";

/**
 * A 1-5 star input, shared by RecipeRatingModal and IngredientRatingForm
 * (chunk 7). `value` of 0/undefined renders all-empty ("not set yet") —
 * used for the optional sub-scores, which are plain "leave it unset to
 * skip" fields rather than a separate checkbox-gated widget (see chunk 7
 * plan's UI scope note).
 */
export default function StarRating({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  /** Optional endpoint captions, e.g. "Too slow" / "Just right". */
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        {lowLabel && <span className="text-xs">{lowLabel}</span>}
        <div role="radiogroup" aria-label={label} className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              onClick={() => onChange(n)}
              className="text-xl leading-none"
            >
              {value !== undefined && n <= value ? "⭐" : "☆"}
            </button>
          ))}
        </div>
        {highLabel && <span className="text-xs">{highLabel}</span>}
      </div>
    </div>
  );
}
