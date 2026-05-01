"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = {
  label: string;
  href?: string;
  match?: (path: string) => boolean;
  comingSoon?: boolean;
  icon: string;
};

type Group = {
  heading: string;
  items: Item[];
};

export default function QuizSidebar({
  quizId,
  quizTitle,
  published,
  slug,
}: {
  quizId: string;
  quizTitle: string;
  published: boolean;
  slug: string;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/dashboard/quizzes/${quizId}`;

  // Close drawer when the user navigates.
  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Lock body scroll while drawer is open.
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
      heading: "Overview",
      items: [
        {
          label: "Scorecard Home",
          href: base,
          match: (p) => p === base,
          icon: "🏠",
        },
        { label: "Leads", href: `${base}/leads`, icon: "👥" },
        { label: "Analytics", href: `${base}/analytics`, icon: "📊" },
      ],
    },
    {
      heading: "Build",
      items: [
        {
          label: "Landing Pages",
          href: `${base}/landing-pages`,
          match: (p) => p.startsWith(`${base}/landing-pages`),
          icon: "🪧",
        },
        {
          label: "Questions",
          href: `${base}/questions`,
          match: (p) => p.startsWith(`${base}/questions`),
          icon: "✍️",
        },
        { label: "Result Pages", href: `${base}/result-pages`, match: (p) => p.startsWith(`${base}/result-pages`), icon: "🎯" },
        { label: "PDF Report", href: `${base}/pdf-reports`, match: (p) => p.startsWith(`${base}/pdf-reports`), icon: "📄" },
      ],
    },
    {
      heading: "Distribute",
      items: [
        {
          label: "Embed & share",
          href: `${base}/share`,
          match: (p) => p.startsWith(`${base}/share`),
          icon: "🔗",
        },
        {
          label: "Integrate",
          href: `${base}/integrate`,
          match: (p) => p.startsWith(`${base}/integrate`),
          icon: "🔌",
        },
        {
          label: "Settings",
          href: `${base}/settings`,
          match: (p) => p.startsWith(`${base}/settings`),
          icon: "⚙️",
        },
      ],
    },
  ];

  const sidebarPanel = (
    <>
      <div className="border-b border-slate-200 p-4">
        <Link
          href="/dashboard"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← All quizzes
        </Link>
        <h2 className="mt-2 line-clamp-2 text-base font-semibold text-slate-900">
          {quizTitle || "Untitled scorecard"}
        </h2>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              published
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {published ? "Published" : "Draft"}
          </span>
          {published && (
            <a
              href={`/q/${slug}`}
              target="_blank"
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              View live ↗
            </a>
          )}
        </div>
      </div>

      <nav className="space-y-6 p-4">
        {groups.map((g) => (
          <div key={g.heading}>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {g.heading}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active =
                  item.href &&
                  (item.match ? item.match(path) : path.startsWith(item.href));
                if (item.comingSoon) {
                  return (
                    <li key={item.label}>
                      <span
                        className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-400"
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
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
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
    </>
  );

  return (
    <>
      {/* Mobile top bar — hidden on md and up */}
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
        <h2 className="line-clamp-1 flex-1 text-sm font-semibold text-slate-900">
          {quizTitle || "Untitled scorecard"}
        </h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            published
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {published ? "Published" : "Draft"}
        </span>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
        {sidebarPanel}
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
          <aside className="fade-in relative h-full w-72 max-w-[85vw] overflow-y-auto bg-white shadow-2xl">
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
            {sidebarPanel}
          </aside>
        </div>
      )}
    </>
  );
}
