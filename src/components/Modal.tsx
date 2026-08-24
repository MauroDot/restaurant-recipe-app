"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * The app's first modal (chunk 7) — no UI library exists in this project
 * (confirmed via package.json), so this is a small hand-rolled overlay
 * matching the rest of the app's Tailwind styling conventions. Both
 * RecipeRatingModal and the Inventory-triggered IngredientRatingForm use it.
 */
export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-2 py-1 text-sm text-zinc-600 hover:bg-black/[.04] dark:text-zinc-400 dark:hover:bg-[#1a1a1a]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
