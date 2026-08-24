import Link from "next/link";

/**
 * Shared between login/page.tsx and signup/page.tsx (chunk 12). Plain
 * `underline` links, no accent color — this app has never used one
 * anywhere else (every existing link across the codebase is bare
 * `font-medium underline`), so this matches rather than introducing blue.
 */
export default function AuthFooter() {
  return (
    <footer className="mt-12 w-full max-w-sm border-t border-black/[.08] px-4 py-6 text-center text-sm text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
      <h2 className="mb-2 font-semibold text-black dark:text-zinc-50">About</h2>
      <p className="mb-4">
        Restaurant Recipe &amp; Menu Management Platform — helping
        restaurants reduce food costs through AI-powered recipe generation,
        cost tracking, and community ingredient intelligence.
      </p>
      <p className="mb-4">
        Questions?{" "}
        <a href="mailto:tmaurodot@gmail.com" className="font-medium underline">
          tmaurodot@gmail.com
        </a>
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/faq" className="font-medium underline">
          FAQ
        </Link>
        <Link href="/privacy" className="font-medium underline">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
