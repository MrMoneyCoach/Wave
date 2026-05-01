"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelSubscriptionButton({
  scheduledToCancel,
  periodEndIso,
}: {
  scheduledToCancel: boolean;
  periodEndIso: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodEnd = periodEndIso
    ? new Date(periodEndIso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  async function cancel() {
    const confirmText = periodEnd
      ? `Cancel your subscription?\n\nYou'll keep full access until ${periodEnd}, then drop back to the Free plan. You can reverse this any time before then.`
      : "Cancel your subscription? You'll keep access until the end of the current billing period, then drop back to the Free plan.";
    if (!confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not cancel");
      return;
    }
    router.refresh();
  }

  async function resume() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/resume", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not resume");
      return;
    }
    router.refresh();
  }

  if (scheduledToCancel) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold text-amber-900">
            Subscription scheduled to cancel
          </p>
          <p className="mt-0.5 text-amber-800">
            You'll keep your current plan until{" "}
            <strong>{periodEnd ?? "the end of your billing period"}</strong>,
            then drop back to Free.
          </p>
          {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
        </div>
        <button
          type="button"
          onClick={resume}
          disabled={busy}
          className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {busy ? "Working…" : "Resume"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-60"
      >
        {busy ? "Cancelling…" : "Cancel subscription"}
      </button>
      <p className="mt-1 text-xs text-slate-500">
        You'll keep access until the end of the current period, then drop back
        to Free.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
