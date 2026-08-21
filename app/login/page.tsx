import Link from "next/link";
import LoginForm from "@/src/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back to Restaurant App.</p>
      </div>
      <LoginForm />
      <p className="text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
