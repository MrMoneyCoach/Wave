import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-bold">
            <span className="inline-block h-6 w-6 rounded-md bg-brand-600" />
            Flowscore
          </Link>
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="hidden truncate text-slate-600 sm:inline">
              {user.name || user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
