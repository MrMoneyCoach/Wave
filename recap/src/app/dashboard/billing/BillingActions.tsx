"use client";

import { useState } from "react";

type Props = { plan: "free" | "pro"; hasCustomer: boolean };

export default function BillingActions({ plan, hasCustomer }: Props) {
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(path: "checkout" | "portal") {
    setBusy(path);
    setError(null);
    try {
      const res = await fetch(`/api/billing/${path}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || `Failed to open ${path}`);
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {plan === "pro" ? (
        <button
          onClick={() => go("portal")}
          disabled={busy !== null}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
        >
          {busy === "portal" ? "Opening…" : "Manage subscription"}
        </button>
      ) : (
        <button
          onClick={() => go("checkout")}
          disabled={busy !== null}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
        >
          {busy === "checkout" ? "Opening Stripe…" : "Upgrade to Pro"}
        </button>
      )}
      {plan === "free" && hasCustomer && (
        <button
          onClick={() => go("portal")}
          disabled={busy !== null}
          className="text-xs text-ink/60 hover:text-ink"
        >
          View previous invoices →
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
