import { Suspense } from "react";
import PasswordResetConfirmForm from "@/components/PasswordResetConfirmForm";

export default function PasswordResetConfirmPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black">
        <h1 className="mb-6 text-xl font-semibold text-black dark:text-zinc-50">
          Set new password
        </h1>
        <Suspense
          fallback={
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading…
            </p>
          }
        >
          <PasswordResetConfirmForm />
        </Suspense>
      </div>
    </div>
  );
}
