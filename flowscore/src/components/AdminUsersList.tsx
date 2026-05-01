"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { findTier, TIERS } from "@/lib/tiers";

type Item = {
  id: string;
  name: string;
  email: string;
  tier: string;
  isAdmin: boolean;
  createdAt: string;
  scorecardCount: number;
};

function tierTone(id: string) {
  return id === "free"
    ? "bg-slate-100 text-slate-700"
    : id === "starter"
    ? "bg-sky-100 text-sky-800"
    : id === "pro"
    ? "bg-violet-100 text-violet-800"
    : "bg-amber-100 text-amber-800";
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
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

export default function AdminUsersList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (tierFilter !== "all" && it.tier !== tierFilter) return false;
      if (!q) return true;
      return (
        it.email.toLowerCase().includes(q) ||
        it.name.toLowerCase().includes(q)
      );
    });
  }, [items, query, tierFilter]);

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
            placeholder="Search by name or email"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          className="input max-w-[220px]"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
        >
          <option value="all">All tiers</option>
          {TIERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-slate-500 sm:whitespace-nowrap">
          {filtered.length} of {items.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-b-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Tier</th>
              <th className="px-5 py-3">Scorecards</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const tier = findTier(it.tier);
              const limit = tier.scorecardLimit;
              const overLimit = limit !== -1 && it.scorecardCount > limit;
              return (
                <tr
                  key={it.id}
                  className="border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/users/${it.id}`}
                      className="block font-semibold text-slate-900 hover:underline"
                    >
                      {it.name || it.email.split("@")[0]}
                      {it.isAdmin && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Admin
                        </span>
                      )}
                    </Link>
                    <p className="text-xs text-slate-500">{it.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierTone(it.tier)}`}
                    >
                      {tier.name}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={overLimit ? "font-semibold text-red-600" : "text-slate-700"}>
                      {it.scorecardCount}
                      {limit !== -1 && (
                        <span className="text-slate-400"> / {limit}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {relativeTime(it.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/users/${it.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
