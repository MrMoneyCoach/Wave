"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const base = `/dashboard/quizzes/${quizId}`;

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
        { label: "Result Pages", comingSoon: true, icon: "🎯" },
        { label: "PDF Report", comingSoon: true, icon: "📄" },
      ],
    },
    {
      heading: "Distribute",
      items: [
        { label: "Embed & share", comingSoon: true, icon: "🔗" },
        { label: "Integrate", comingSoon: true, icon: "🔌" },
        { label: "Settings", comingSoon: true, icon: "⚙️" },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
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
    </aside>
  );
}
