import LogoutButton from "@/src/components/auth/LogoutButton";

export default function Navigation() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-lg font-semibold text-blue-700">Restaurant App</span>
        <LogoutButton />
      </div>
    </header>
  );
}
