"use client";

import { useState } from "react";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { FirebaseError } from "firebase/app";
import { db, cloudFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { RECIPE_FEEDBACK_ISSUES, type RecipeFeedbackIssue } from "@/lib/types";
import Modal from "@/components/Modal";
import StarRating from "@/components/StarRating";

type Stage = "form" | "saved" | "improving" | "improved";

export default function RecipeRatingModal({
  recipeId,
  recipeName,
  onClose,
}: {
  recipeId: string;
  recipeName: string;
  onClose: () => void;
}) {
  const { currentUser } = useAuth();

  const [stage, setStage] = useState<Stage>("form");
  const [rating, setRating] = useState(0);
  const [taste, setTaste] = useState<number>();
  const [texture, setTexture] = useState<number>();
  const [executionTime, setExecutionTime] = useState<number>();
  const [costAccuracy, setCostAccuracy] = useState<number>();
  const [wouldMakeAgain, setWouldMakeAgain] = useState(false);
  const [issues, setIssues] = useState<RecipeFeedbackIssue[]>([]);
  const [voiceNote, setVoiceNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleIssue(issue: RecipeFeedbackIssue) {
    setIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  }

  async function handleSubmit() {
    if (!currentUser || rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const feedbackRef = doc(collection(db, "recipes", recipeId, "feedback"));
      await setDoc(feedbackRef, {
        rating,
        ...(taste !== undefined && { taste }),
        ...(texture !== undefined && { texture }),
        ...(executionTime !== undefined && { executionTime }),
        ...(costAccuracy !== undefined && { costAccuracy }),
        wouldMakeAgain,
        issues,
        ...(voiceNote.trim() && { voiceNote: voiceNote.trim() }),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
      setStage("saved");
    } catch {
      setError("Couldn't save feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImprove() {
    setStage("improving");
    setError(null);
    try {
      const improve = httpsCallable<{ recipeId: string }, { recipeId: string }>(
        cloudFunctions,
        "improveRecipe"
      );
      await improve({ recipeId });
      setStage("improved");
    } catch (err) {
      const message =
        err instanceof FirebaseError
          ? err.message
          : "Couldn't generate an improved version. Please try again.";
      setError(message);
      setStage("saved");
    }
  }

  return (
    <Modal title={`How was ${recipeName}?`} onClose={onClose}>
      {stage === "form" && (
        <div className="flex flex-col gap-4">
          <StarRating label="Overall rating" value={rating || undefined} onChange={setRating} />

          <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-500">
            Optional
          </p>
          <StarRating label="Taste" value={taste} onChange={setTaste} />
          <StarRating label="Texture" value={texture} onChange={setTexture} />
          <StarRating
            label="Execution time"
            value={executionTime}
            onChange={setExecutionTime}
            lowLabel="Too slow"
            highLabel="Just right"
          />
          <StarRating
            label="Cost accuracy"
            value={costAccuracy}
            onChange={setCostAccuracy}
            lowLabel="Off"
            highLabel="Spot on"
          />

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={wouldMakeAgain}
              onChange={(e) => setWouldMakeAgain(e.target.checked)}
            />
            Would make again
          </label>

          {rating > 0 && rating <= 3 && (
            <div>
              <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                What went wrong? (check all that apply)
              </p>
              <div className="flex flex-col gap-1">
                {RECIPE_FEEDBACK_ISSUES.map((issue) => (
                  <label
                    key={issue}
                    className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <input
                      type="checkbox"
                      checked={issues.includes(issue)}
                      onChange={() => toggleIssue(issue)}
                    />
                    {issue[0].toUpperCase() + issue.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label
              htmlFor="voiceNote"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Notes (optional)
            </label>
            <input
              id="voiceNote"
              type="text"
              placeholder='e.g. "Reduce salt 15%, use unsalted stock"'
              value={voiceNote}
              onChange={(e) => setVoiceNote(e.target.value)}
              className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black dark:border-white/[.145] dark:text-zinc-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      )}

      {stage === "saved" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-black dark:text-zinc-50">
            Feedback saved
          </p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              Close
            </button>
            <button
              onClick={handleImprove}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Generate improved version
            </button>
          </div>
        </div>
      )}

      {stage === "improving" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Generating an improved version based on the feedback so far… this
          can take a minute.
        </p>
      )}

      {stage === "improved" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-black dark:text-zinc-50">
            Check out the improved version — it&apos;s now in the Recipes tab.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
