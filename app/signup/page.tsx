"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";

const CUISINE_OPTIONS = [
  { value: "italian", label: "Italian" },
  { value: "contemporary-american", label: "Contemporary American" },
  { value: "other", label: "Other" },
] as const;

type Cuisine = (typeof CUISINE_OPTIONS)[number]["value"];

function mapAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      default:
        return err.message;
    }
  }
  return "Something went wrong. Please try again.";
}

export default function SignupPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisine, setCuisine] = useState<Cuisine>("italian");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A ref, not state — it must be true *synchronously* the instant
  // handleSubmit starts, with no render/effect gap where the "already
  // logged in" redirect below could still see it as false. currentUser
  // flips non-null the moment createUserWithEmailAndPassword succeeds,
  // independent of and typically before the profile-doc write below
  // resolves; without this guard that transition looks identical to "a
  // signed-in user navigated to /signup directly" and the effect races
  // handleSubmit's own navigation (chunk 6.2).
  const signupAttemptedRef = useRef(false);

  useEffect(() => {
    // Only meant for a user who lands on /signup while already
    // authenticated. Once a signup attempt has started on this page
    // instance, this effect must stay out of the way for good — the
    // explicit navigation at the end of handleSubmit is the only thing
    // allowed to leave this page from here on.
    if (!loading && currentUser && !signupAttemptedRef.current) {
      router.replace("/dashboard");
    }
  }, [loading, currentUser, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    signupAttemptedRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      try {
        const restaurantRef = doc(collection(db, "restaurants"));
        const userRef = doc(db, "users", credential.user.uid);

        const batch = writeBatch(db);
        batch.set(restaurantRef, {
          name: restaurantName,
          cuisine,
          ownerId: credential.user.uid,
          createdAt: serverTimestamp(),
        });
        batch.set(userRef, {
          email: credential.user.email,
          restaurantId: restaurantRef.id,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
      } catch (writeErr) {
        // Roll back the orphaned auth account so it doesn't end up with no profile doc.
        let rollbackFailed = false;
        try {
          await deleteUser(credential.user);
        } catch {
          rollbackFailed = true;
        }
        if (rollbackFailed) {
          // The account still exists with no profile doc, and we couldn't
          // clean it up either. signupAttemptedRef keeps the redirect
          // effect above from sweeping this half-created user to
          // /dashboard, where they'd hang on "Loading…" forever with no
          // explanation — surface it plainly here instead and stay put.
          setError(
            "Your account was created but setup didn't finish, and we couldn't automatically clean it up. Please try logging in — if that doesn't work, contact support."
          );
          setSubmitting(false);
          return;
        }
        throw writeErr;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(mapAuthError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black">
        <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
          Sign up
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="restaurantName"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Restaurant name
            </label>
            <input
              id="restaurantName"
              type="text"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
            />
          </div>
          <div>
            <label
              htmlFor="cuisine"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Cuisine
            </label>
            <select
              id="cuisine"
              required
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value as Cuisine)}
              className="w-full rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
            >
              {CUISINE_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-black dark:bg-black dark:text-zinc-50"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
