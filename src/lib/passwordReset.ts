import { FirebaseError } from "firebase/app";

/**
 * Shared between password-reset/page.tsx (request) and
 * password-reset/confirm/page.tsx (confirm) — the two pages between them
 * hit every one of these codes, and keeping the mapping in one place avoids
 * two copies drifting apart. The actual Firebase Auth calls
 * (sendPasswordResetEmail / confirmPasswordReset / verifyPasswordResetCode)
 * are called directly from each page with the modular `firebase/auth`
 * functions + the shared `auth` instance from src/lib/firebase.ts, matching
 * how every other page in this app calls Auth (see signup/page.tsx,
 * dashboard/page.tsx) — a wrapper that just renamed those three calls
 * would've added nothing and shadowed their own names.
 *
 * auth/user-not-found is deliberately mapped to the SAME generic message as
 * success, not a distinct "email not found" — telling a caller definitively
 * whether an email has an account is a user-enumeration leak. See
 * password-reset/page.tsx's handleSubmit for where this matters: that
 * branch is treated as success, not surfaced as an error at all.
 */
export function mapPasswordResetError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/invalid-oob-code":
      case "auth/expired-action-code":
        return "This reset link has expired or is invalid. Request a new one.";
      case "auth/operation-not-allowed":
        return "Password reset is not enabled for this account.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      default:
        return "Something went wrong. Try again.";
    }
  }
  return "Something went wrong. Try again.";
}
