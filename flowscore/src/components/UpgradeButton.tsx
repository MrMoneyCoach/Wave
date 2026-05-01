"use client";

import { useState } from "react";
import { findTier, nextTier } from "@/lib/tiers";

export default function UpgradeButton({
  currentTier,
  targetTier,
  cycle = "monthly",
  block = false,
}: {
  currentTier: string;
  /** Optional explicit target. If omitted, uses the next non-contact-sales tier above current. */
  targetTier?: string;
  /** Billing cycle preference. */
  cycle?: "monthly" | "yearly";
  /** Render full-width. */
  block?: boolean;
}) {
  const target = targetTier ? findTier(targetTier) : nextTier(currentTier);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!target) return null;

  function fallbackMailto() {
    if (!target) return;
    const inbox = target.contactSales ? "sales" : "billing";
    const subject = target.contactSales
      ? "Flowscore — Unlimited plan enquiry"
      : `Flowscore upgrade — ${target.name} (${cycle})`;
    const body = target.contactSales
      ? "Hi, I'd like to talk about the Unlimited plan for my organisation."
      : `Hi, I'd like to upgrade to the ${target.name} plan, billed ${cycle}.`;
    window.location.href = `mailto:${inbox}@flowscore.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function go() {
    if (!target) return;
    setBusy(true);
    setError(null);

    // Contact-sales tiers always go through email.
    if (target.contactSales) {
      fallbackMailto();
      setTimeout(() => setBusy(false), 800);
      return;
    }

    // Try Stripe Checkout first; fall back to mailto if billing isn't wired
    // up in this environment.
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: target.id, cycle }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === "string") {
        window.location.href = data.url;
        return;
      }
      if (res.status === 503) {
        // Stripe not configured yet — friendly fallback.
        fallbackMailto();
        return;
      }
      setError(data.error || "Could not start checkout");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  const cls = block ? "btn-primary w-full" : "btn-primary";
  const label = busy
    ? "Opening…"
    : target.contactSales
    ? "Talk to sales"
    : `Upgrade to ${target.name}`;

  return (
    <div className={block ? "w-full" : ""}>
      <button type="button" onClick={go} disabled={busy} className={cls}>
        {label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
