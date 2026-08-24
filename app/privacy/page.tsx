import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold text-black dark:text-zinc-50">
          Privacy
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          This app is pre-beta. This page is a plain, factual description of
          what data it handles today, not a legal document — treat it
          accordingly, and reach out with any questions.
        </p>

        <div className="flex flex-col gap-6 text-sm text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="mb-1 font-semibold text-black dark:text-zinc-50">
              What&apos;s collected
            </h2>
            <p>
              Your account email, restaurant name and cuisine, recipes you
              generate or save, inventory and purchase records you enter,
              ratings and feedback you submit on recipes and ingredients,
              and any invoice files you upload for OCR processing.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-black dark:text-zinc-50">
              Where it&apos;s stored
            </h2>
            <p>
              In Firebase (Firestore and Cloud Storage), a Google Cloud
              product that encrypts data at rest and in transit. Your
              restaurant&apos;s data is isolated from other restaurants by
              security rules enforced on the server, not just hidden in the
              app&apos;s interface.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-black dark:text-zinc-50">
              Third parties
            </h2>
            <p>
              Recipe generation and invoice OCR are processed by
              Anthropic&apos;s Claude API — the ingredient list, recipe
              details, and invoice images you submit for those features are
              sent there to produce the result.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-black dark:text-zinc-50">
              Questions or data removal
            </h2>
            <p>
              Contact{" "}
              <a
                href="mailto:tmaurodot@gmail.com"
                className="font-medium underline"
              >
                tmaurodot@gmail.com
              </a>{" "}
              with any questions, or to request your account and its data be
              removed.
            </p>
          </section>
        </div>

        <p className="mt-12 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/login" className="font-medium underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
