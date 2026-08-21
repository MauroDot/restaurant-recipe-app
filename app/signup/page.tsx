import Link from "next/link";
import SignupForm from "@/src/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Set up your restaurant to get started.</p>
      </div>
      <SignupForm />
      <p className="text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
