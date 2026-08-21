import { FullPageSpinner } from "@/src/components/Spinner";

// AuthGuard (in the root layout) handles redirecting to /dashboard or /login.
export default function Home() {
  return <FullPageSpinner />;
}
