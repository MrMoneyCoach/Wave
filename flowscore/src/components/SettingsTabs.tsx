"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SettingsTabs({ quizId }: { quizId: string }) {
  const path = usePathname();
  const base = `/dashboard/quizzes/${quizId}/settings`;

  const tabs: { label: string; href: string }[] = [
    { label: "General", href: `${base}/general` },
    { label: "Branding", href: `${base}/branding` },
    { label: "Share Appearance", href: `${base}/share-appearance` },
    { label: "Lead Form", href: `${base}/lead-form` },
    { label: "Notifications", href: `${base}/notifications` },
    { label: "Score Tiers", href: `${base}/score-tiers` },
    { label: "Result Email", href: `${base}/result-email` },
    { label: "Abandon Email", href: `${base}/abandon-email` },
    { label: "Tracking", href: `${base}/tracking` },
  ];

  return (
    <nav
      aria-label="Settings sections"
      className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {tabs.map((t) => {
        const active = path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition ${
              active
                ? "border-brand-600 font-semibold text-brand-700"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
