"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/src/lib/firebase";
import { createUserAndRestaurant } from "@/src/lib/firestore";
import { firebaseAuthErrorMessage, isValidEmail, isValidPassword } from "@/src/lib/validation";
import type { Cuisine } from "@/src/lib/types";
import Spinner from "@/src/components/Spinner";

const CUISINE_OPTIONS: { value: Cuisine; label: string }[] = [
  { value: "italian", label: "Italian" },
  { value: "contemporary-american", label: "Contemporary American" },
  { value: "other", label: "Other" },
];

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisine, setCuisine] = useState<Cuisine>("italian");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!restaurantName.trim()) return "Restaurant name is required.";
    if (!isValidEmail(email)) return "Please enter a valid email address.";
    if (!isValidPassword(password)) return "Password must be at least 8 characters.";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserAndRestaurant({
        uid: credential.user.uid,
        email,
        restaurantName: restaurantName.trim(),
        cuisine,
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("Signup failed:", err);
      setError(firebaseAuthErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="restaurantName" className="text-sm font-medium text-slate-700">
          Restaurant name
        </label>
        <input
          id="restaurantName"
          type="text"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
          placeholder="Trattoria Blu"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cuisine" className="text-sm font-medium text-slate-700">
          Cuisine
        </label>
        <select
          id="cuisine"
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value as Cuisine)}
          disabled={loading}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
        >
          {CUISINE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
          placeholder="you@restaurant.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
          placeholder="At least 8 characters"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <Spinner size="sm" className="border-white border-t-transparent" />}
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
