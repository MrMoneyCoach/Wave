"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  email: string;
  children: React.ReactNode;
};

export default function AppShell({ email, children }: Props) {
  const pathname = usePathname();

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="text-sm font-semibold tracking-wide">
            Recap
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/dashboard"
              className={pathname === "/dashboard" ? "font-medium" : "text-ink/60 hover:text-ink"}
            >
              Meetings
            </Link>
            <Link
              href="/dashboard/record"
              className={
                pathname.startsWith("/dashboard/record")
                  ? "font-medium"
                  : "text-ink/60 hover:text-ink"
              }
            >
              Record
            </Link>
            <Link
              href="/dashboard/bot"
              className={
                pathname.startsWith("/dashboard/bot")
                  ? "font-medium"
                  : "text-ink/60 hover:text-ink"
              }
            >
              Bot
            </Link>
            <Link
              href="/dashboard/upload"
              className={
                pathname.startsWith("/dashboard/upload")
                  ? "font-medium"
                  : "text-ink/60 hover:text-ink"
              }
            >
              Upload
            </Link>
            <span className="text-ink/50">{email}</span>
            <button onClick={signOut} className="text-ink/60 hover:text-ink">
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
