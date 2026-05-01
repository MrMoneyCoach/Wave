"use client";

import { useState } from "react";
import { findTier, nextTier } from "@/lib/tiers";

export default function UpgradeButton({
  currentTier,
  targetTier,
  block = false,
}: {
  currentTier: string;
  /** Optional explicit target. If omitted, uses the next tier above current. */
  targetTier?: string;
  /** Render full-width. */
  block?: boolean;
}) {
  const target = targetTier ? findTier(targetTier) : nextTier(currentTier);
  const [busy, setBusy] = useState(false);

  if (!target) return null;

  async function upgrade() {
    if (!target) return;
    setBusy(true);
    // Billing isn't wired up yet — surface a friendly notice so the chrome is
    // useful end-to-end. Real Stripe checkout will replace this.
    const subject = `Flowscore upgrade — ${target.name}`;
    const body = `Hi, I'd like to upgrade to the ${target.name} plan.`;
    window.location.href = `mailto:billing@flowscore.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => setBusy(false), 800);
  }

  const cls =
    block
      ? "btn-primary w-full"
      : "btn-primary";

  return (
    <button type="button" onClick={upgrade} disabled={busy} className={cls}>
      {busy
        ? "Opening…"
        : target.contactSales
        ? `Talk to us about ${target.name}`
        : `Upgrade to ${target.name}`}
    </button>
  );
}
