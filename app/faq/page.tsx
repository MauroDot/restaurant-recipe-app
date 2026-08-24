import Link from "next/link";
import FaqAccordion from "@/components/FaqAccordion";

export default function FaqPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold text-black dark:text-zinc-50">
          Frequently Asked Questions
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Have a question not listed here?{" "}
          <a href="mailto:tmaurodot@gmail.com" className="font-medium underline">
            Contact us
          </a>
          .
        </p>

        <FaqAccordion />

        <p className="mt-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
