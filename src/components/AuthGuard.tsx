"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/authContext";
import { FullPageSpinner } from "@/src/components/Spinner";
import Navigation from "@/src/components/Navigation";

const PUBLIC_ROUTES = ["/login", "/signup"];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && (isPublicRoute || pathname === "/")) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, isPublicRoute, pathname, router]);

  if (loading) {
    return <FullPageSpinner />;
  }

  // Redirects above are in-flight; avoid flashing protected/public content.
  if (!isAuthenticated && !isPublicRoute) return <FullPageSpinner />;
  if (isAuthenticated && (isPublicRoute || pathname === "/")) return <FullPageSpinner />;

  return (
    <>
      {isAuthenticated && <Navigation />}
      {children}
    </>
  );
}
