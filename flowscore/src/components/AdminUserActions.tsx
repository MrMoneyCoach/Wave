"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIERS, findTier } from "@/lib/tiers";

export default function AdminUserActions({
  userId,
  currentTier,
  currentIsAdmin,
  isSelf,
}: {
  userId: string;
  currentTier: string;
  currentIsAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(currentTier);
  const [isAdmin, setIsAdmin] = useState(currentIsAdmin);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = tier !== currentTier || isAdmin !== currentIsAdmin;

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, isAdmin }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not save");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1800);
  }

  const tierObj = findTier(tier);

  return (
    <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Manage account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Change this user's subscription tier or grant master admin access.
          </p>
        </div>
        {saved && <span className="text-sm text-emerald-600">✓ Saved</span>}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Subscription tier
          </label>
          <select
            className="input mt-2"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
          >
            {TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.price}
                {t.priceSuffix}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">{tierObj.tagline}</p>
        </div>

        <div>
          <p className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Admin access
          </p>
          <label
            className={`mt-2 flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition ${
              isAdmin ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
            } ${isSelf ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              disabled={isSelf}
            />
            <span>
              <span className="font-medium text-slate-900">
                Grant master admin
              </span>
              <span className="block text-xs text-slate-500">
                Admins can see every user, change subscription tiers, and access
                every scorecard. {isSelf && "(You can't revoke your own admin from here.)"}
              </span>
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || busy}
          className="btn-primary"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}
