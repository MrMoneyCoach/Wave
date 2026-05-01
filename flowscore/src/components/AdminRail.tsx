"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const ICON_OVERVIEW = "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z";
const ICON_USERS = "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75";
const ICON_TIERS = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
const ICON_BACK = "M19 12H5M12 19l-7-7 7-7";
const ICON_LOGOUT = "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";

export default function AdminRail({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const items = [
    {
      label: "Overview",
      href: "/admin",
      match: (p: string) => p === "/admin",
      icon: <Icon d={ICON_OVERVIEW} />,
    },
    {
      label: "Users",
      href: "/admin/users",
      match: (p: string) => p.startsWith("/admin/users"),
      icon: <Icon d={ICON_USERS} />,
    },
    {
      label: "Subscription tiers",
      href: "/admin/tiers",
      match: (p: string) => p.startsWith("/admin/tiers"),
      icon: <Icon d={ICON_TIERS} />,
    },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const railContent = (
    <>
      <div className="border-b border-slate-200 px-5 py-5">
        <Link href="/admin" className="flex items-center gap-2 text-base font-bold text-slate-900">
          <span className="inline-block h-7 w-7 rounded-md bg-slate-900" />
          Flowscore Admin
        </Link>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Master controls
        </p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = item.match(path);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-slate-900 font-semibold text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Icon d={ICON_BACK} />
          Back to my dashboard
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-md px-2 py-2">
          <div
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white"
          >
            {(userName || userEmail).slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {userName || userEmail.split("@")[0]}
            </p>
            <p className="truncate text-xs text-slate-500">{userEmail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Icon d={ICON_LOGOUT} />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/admin" className="flex items-center gap-2 text-base font-bold text-slate-900">
          <span className="inline-block h-6 w-6 rounded-md bg-slate-900" />
          Flowscore Admin
        </Link>
      </div>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {railContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/50"
          />
          <aside className="fade-in relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {railContent}
          </aside>
        </div>
      )}
    </>
  );
}
