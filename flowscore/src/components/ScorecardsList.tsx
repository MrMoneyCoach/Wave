"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ScorecardActionsMenu from "./ScorecardActionsMenu";

type Item = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  brandColor: string | null;
  questionCount: number;
  submissionCount: number;
  lastActivity: string;
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.round(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.round(day / 365);
  return `${year}y ago`;
}

function pickTextOn(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "white";
  const r = parseInt(m.substr(0, 2), 16);
  const g = parseInt(m.substr(2, 2), 16);
  const b = parseInt(m.substr(4, 2), 16);
  const luma = (r * 299 + g * 587 + b * 114) / 1000;
  return luma > 155 ? "#0f172a" : "#ffffff";
}

function Thumbnail({ title, brandColor }: { title: string; brandColor: string | null }) {
  const bg = brandColor || "#345ff2";
  const fg = pickTextOn(bg);
  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div
      className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg text-sm font-bold"
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden
    >
      {initials || "—"}
    </div>
  );
}

export default function ScorecardsList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "draft">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter === "live" && !it.published) return false;
      if (filter === "draft" && it.published) return false;
      if (!q) return true;
      return it.title.toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M14 14l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scorecards"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
          {(["all", "live", "draft"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-md px-3 py-1.5 capitalize transition ${
                filter === k
                  ? "bg-brand-50 font-semibold text-brand-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500 sm:whitespace-nowrap">
          {filtered.length} of {items.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-b-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">
            No scorecards match your search.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-b-xl border border-slate-200 bg-white">
          {/* Table on md+, stacked cards on mobile */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Leads</th>
                  <th className="px-5 py-3">Last activity</th>
                  <th className="px-5 py-3 text-right" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/quizzes/${it.id}`}
                        className="flex items-center gap-3"
                      >
                        <Thumbnail title={it.title} brandColor={it.brandColor} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {it.title || "Untitled"}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {it.questionCount} question
                            {it.questionCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                          it.published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            it.published ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {it.published ? "Live" : "Draft"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {it.submissionCount}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {relativeTime(it.lastActivity)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ScorecardActionsMenu
                        quizId={it.id}
                        quizTitle={it.title}
                        slug={it.slug}
                        published={it.published}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {filtered.map((it) => (
              <li key={it.id} className="flex items-center gap-3 p-4">
                <Link
                  href={`/dashboard/quizzes/${it.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Thumbnail title={it.title} brandColor={it.brandColor} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {it.title || "Untitled"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          it.published
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {it.published ? "Live" : "Draft"}
                      </span>
                      <span>{it.submissionCount} leads</span>
                      <span>· {relativeTime(it.lastActivity)}</span>
                    </div>
                  </div>
                </Link>
                <ScorecardActionsMenu
                  quizId={it.id}
                  quizTitle={it.title}
                  slug={it.slug}
                  published={it.published}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
