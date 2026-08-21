"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/authContext";
import { FullPageSpinner } from "@/src/components/Spinner";

// AuthGuard (in the root layout) already redirects "/" based on auth state, but this
// makes the redirect explicit here too, using the auth context directly.
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [loading, isAuthenticated, router]);

  return <FullPageSpinner />;
}
