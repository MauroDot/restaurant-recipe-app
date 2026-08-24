"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import FaqAccordion from "@/components/FaqAccordion";

/**
 * Same content as the public /faq page — this is the "accessible from
 * dashboard without logging out first" version (chunk 12, marked optional
 * in the spec). No shared dashboard layout/nav exists to plug into (the
 * tab bar lives inline in app/dashboard/page.tsx, not a layout.tsx), so
 * this is a standalone authenticated page with its own minimal header
 * rather than replicating the full tab chrome for a simple reference page.
 */
export default function DashboardFaqPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace("/login");
    }
  }, [loading, currentUser, router]);

  if (loading || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/[.08] bg-white px-6 py-4 dark:border-white/[.145] dark:bg-black">
        <h1 className="text-lg font-semibold text-black dark:text-zinc-50">FAQ</h1>
        <Link href="/dashboard" className="text-sm font-medium underline">
          Back to dashboard
        </Link>
      </header>
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <FaqAccordion />
        </div>
      </main>
    </div>
  );
}
