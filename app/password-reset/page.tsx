"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { mapPasswordResetError } from "@/lib/passwordReset";

// Shown on success AND on auth/user-not-found — see passwordReset.ts's
// comment on why those two cases are deliberately indistinguishable to the
// caller (revealing which one it was is a user-enumeration leak).
const SENT_MESSAGE =
  "If that email has an account, we've sent a link to reset the password. Check your inbox within the next few minutes — the link expires in 1 hour.";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      if (err instanceof FirebaseError && err.code === "auth/user-not-found") {
        // Same outcome as success, deliberately — see file header comment.
        setSent(true);
      } else {
        setError(mapPasswordResetError(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black">
        <h1 className="mb-2 text-xl font-semibold text-black dark:text-zinc-50">
          Reset your password
        </h1>

        {sent ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {SENT_MESSAGE}
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
              Enter the email address associated with your account. We&apos;ll
              send you a link to set a new password.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-full bg-foreground font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
