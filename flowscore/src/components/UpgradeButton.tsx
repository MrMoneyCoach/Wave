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
  /** Billing cycle preference, included in the contact email. */
  cycle?: "monthly" | "yearly";
  /** Render full-width. */
  block?: boolean;
}) {
  const target = targetTier ? findTier(targetTier) : nextTier(currentTier);
  const [busy, setBusy] = useState(false);

  if (!target) return null;

  async function go() {
    if (!target) return;
    setBusy(true);
    // Billing isn't wired up yet — surface a friendly contact email so the
    // chrome is useful end-to-end. Real Stripe checkout will replace this.
    const inbox = target.contactSales ? "sales" : "billing";
    const subject = target.contactSales
      ? `Flowscore — Unlimited plan enquiry`
      : `Flowscore upgrade — ${target.name} (${cycle})`;
    const body = target.contactSales
      ? `Hi, I'd like to talk about the Unlimited plan for my organisation.`
      : `Hi, I'd like to upgrade to the ${target.name} plan, billed ${cycle}.`;
    window.location.href = `mailto:${inbox}@flowscore.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => setBusy(false), 800);
  }

  const cls = block ? "btn-primary w-full" : "btn-primary";
  const label = busy
    ? "Opening…"
    : target.contactSales
    ? `Talk to sales`
    : `Upgrade to ${target.name}`;

  return (
    <button type="button" onClick={go} disabled={busy} className={cls}>
      {label}
    </button>
  );
}
