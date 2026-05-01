"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = {
  label: string;
  href?: string;
  match?: (path: string) => boolean;
  comingSoon?: boolean;
  icon: React.ReactNode;
};

type Group = {
  heading?: string;
  items: Item[];
};

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

const ICON_SCORECARD = "M3 4h18v4H3zM3 12h12v4H3zM3 20h7";
const ICON_TEMPLATE = "M4 4h16v6H4zM4 14h7v6H4zM13 14h7v6h-7z";
const ICON_HELP = "M9 9a3 3 0 1 1 4 2.83V14M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z";
const ICON_REFERRAL = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
const ICON_LOGOUT = "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";
const ICON_ADMIN = "M12 1l3 6 6 .87-4.5 4.39 1 6.24L12 15.5 6.5 18.5l1-6.24L3 7.87 9 7l3-6z";

export default function DashboardRail({
  userName,
  userEmail,
  isAdmin = false,
}: {
  userName: string;
  userEmail: string;
  isAdmin?: boolean;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer when the user navigates.
  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Lock body scroll while drawer is open on mobile.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const groups: Group[] = [
    {
      items: [
        {
          label: "Scorecards",
          href: "/dashboard",
          match: (p) => p === "/dashboard" || p.startsWith("/dashboard/quizzes"),
          icon: <Icon d={ICON_SCORECARD} />,
        },
        {
          label: "Templates",
          href: "/dashboard/templates",
          match: (p) => p.startsWith("/dashboard/templates"),
          icon: <Icon d={ICON_TEMPLATE} />,
        },
      ],
    },
    {
      heading: "Help",
      items: [
        {
          label: "Help centre",
          comingSoon: true,
          icon: <Icon d={ICON_HELP} />,
        },
        {
          label: "Refer a friend",
          comingSoon: true,
          icon: <Icon d={ICON_REFERRAL} />,
        },
      ],
    },
  ];

  if (isAdmin) {
    groups.push({
      heading: "Master admin",
      items: [
        {
          label: "Admin console",
          href: "/admin",
          match: (p) => p.startsWith("/admin"),
          icon: <Icon d={ICON_ADMIN} />,
        },
      ],
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const railContent = (
    <>
      <div className="border-b border-slate-200 px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-bold text-slate-900">
          <span className="inline-block h-7 w-7 rounded-md bg-brand-600" />
          Flowscore
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.heading && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {g.heading}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active =
                  item.href &&
                  (item.match ? item.match(path) : path.startsWith(item.href));
                if (item.comingSoon) {
                  return (
                    <li key={item.label}>
                      <span
                        className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-400"
                        title="Coming soon"
                      >
                        <span aria-hidden>{item.icon}</span>
                        {item.label}
                        <span className="ml-auto rounded-full bg-slate-100 px-1.5 text-[10px] font-medium text-slate-500">
                          soon
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href!}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                        active
                          ? "bg-brand-50 font-semibold text-brand-700"
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
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
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
      {/* Mobile top bar */}
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
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-bold text-slate-900">
          <span className="inline-block h-6 w-6 rounded-md bg-brand-600" />
          Flowscore
        </Link>
        <span className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {(userName || userEmail).slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* Desktop rail */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        {railContent}
      </aside>

      {/* Mobile drawer */}
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
