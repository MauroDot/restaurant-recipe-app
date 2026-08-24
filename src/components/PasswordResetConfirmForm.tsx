"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { mapPasswordResetError } from "@/lib/passwordReset";

type VerifyState = "checking" | "valid" | "invalid";

/**
 * The oobCode is verified BEFORE the password form ever renders — a chef
 * should never see (or be able to submit into) a form backed by an
 * expired/invalid code. See the "checking"/"invalid" branches below; the
 * form itself only exists in the "valid" branch.
 */
export default function PasswordResetConfirmForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [verifyState, setVerifyState] = useState<VerifyState>("checking");
  const [email, setEmail] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // No code at all needs no async check — the missing-code case is
    // derived directly in render below (effectiveState), not via a
    // synchronous setState here (react-hooks/set-state-in-effect).
    if (!oobCode) return;
    let cancelled = false;
    verifyPasswordResetCode(auth, oobCode)
      .then((verifiedEmail) => {
        if (cancelled) return;
        setEmail(verifiedEmail);
        setVerifyState("valid");
      })
      .catch(() => {
        if (!cancelled) setVerifyState("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  const effectiveState: VerifyState = oobCode ? verifyState : "invalid";

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => router.push("/login"), 2000);
    return () => clearTimeout(timer);
  }, [done, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!oobCode) return;
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setDone(true);
    } catch (err) {
      setError(mapPasswordResetError(err));
      setSubmitting(false);
    }
  }

  if (effectiveState === "checking") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Checking your reset link…
      </p>
    );
  }

  if (effectiveState === "invalid") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          This reset link has expired or is invalid.
        </p>
        <Link href="/password-reset" className="text-sm font-medium underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Password reset! Redirecting to login…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {email && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Setting a new password for <span className="font-medium">{email}</span>.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="newPassword"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {submitting ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
