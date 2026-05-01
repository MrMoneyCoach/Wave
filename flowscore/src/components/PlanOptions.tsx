"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tier, TIERS, annualPricing } from "@/lib/tiers";

type Cycle = "monthly" | "yearly";

type Props = {
  /** Current tier id. */
  currentTier: string;
  /** Current billing cycle if subscribed; null for free users. */
  currentCycle: Cycle | null;
  /** True when the user already has a Stripe subscription — plan changes go
   *  through change-plan. False = first-time purchase, goes through
   *  Checkout. */
  hasSubscription: boolean;
};

function tierIndex(id: string): number {
  return TIERS.findIndex((t) => t.id === id);
}

/** All paid tiers below Unlimited. Free is the baseline; Unlimited is sales. */
const PAID_TIERS: Tier[] = TIERS.filter(
  (t) => t.id !== "free" && !t.contactSales,
);

export default function PlanOptions({
  currentTier,
  currentCycle,
  hasSubscription,
}: Props) {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>(currentCycle ?? "monthly");
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickPlan(target: Tier, targetCycle: Cycle) {
    // Same tier and same cycle => no-op.
    if (target.id === currentTier && targetCycle === currentCycle) return;

    setError(null);
    setBusyTier(target.id);
    try {
      if (hasSubscription) {
        const directionLabel =
          tierIndex(target.id) > tierIndex(currentTier) ? "Upgrade" : "Switch";
        const ok = confirm(
          `${directionLabel} to ${target.name} (${targetCycle})?\n\nYour plan changes immediately. Stripe will charge any prorated difference today, or credit unused time on your current plan against your next invoice.`,
        );
        if (!ok) {
          setBusyTier(null);
          return;
        }
        const res = await fetch("/api/billing/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: target.id, cycle: targetCycle }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Could not change plan");
          setBusyTier(null);
          return;
        }
        router.refresh();
        setBusyTier(null);
      } else {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: target.id, cycle: targetCycle }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && typeof data.url === "string") {
          window.location.href = data.url;
          return;
        }
        if (res.status === 503) {
          // Stripe not configured — fallback to mailto.
          const inbox = "billing";
          const subject = `Flowscore upgrade — ${target.name} (${targetCycle})`;
          const body = `Hi, I'd like to upgrade to the ${target.name} plan, billed ${targetCycle}.`;
          window.location.href = `mailto:${inbox}@flowscore.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          return;
        }
        setError(data.error || "Could not start checkout");
        setBusyTier(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setBusyTier(null);
    }
  }

  const anyAnnual = PAID_TIERS.some((t) => annualPricing(t));

  return (
    <div>
      {anyAnnual && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition ${
                cycle === c
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="capitalize">{c}</span>
              {c === "yearly" && (
                <span
                  className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    cycle === c
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  −20%
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {PAID_TIERS.map((t) => {
          const annual = annualPricing(t);
          const showAnnual = cycle === "yearly" && annual !== null;
          const isCurrent = t.id === currentTier && cycle === currentCycle;
          const isUpgrade = tierIndex(t.id) > tierIndex(currentTier);
          const isDowngrade =
            tierIndex(t.id) < tierIndex(currentTier) && currentTier !== "free";
          const isCycleSwap =
            t.id === currentTier && cycle !== currentCycle;
          const busy = busyTier === t.id;

          let actionLabel: string;
          if (isCurrent) {
            actionLabel = "Current plan";
          } else if (isCycleSwap) {
            actionLabel = `Switch to ${cycle}`;
          } else if (isUpgrade) {
            actionLabel = `Upgrade to ${t.name}`;
          } else if (isDowngrade) {
            actionLabel = `Downgrade to ${t.name}`;
          } else {
            // First-time purchase from free.
            actionLabel = `Choose ${t.name}`;
          }

          return (
            <div
              key={t.id}
              className={`card flex flex-col ${
                isCurrent ? "ring-2 ring-brand-500" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold">{t.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">{t.tagline}</p>
              <div className="mt-3">
                {showAnnual ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900">
                      {annual!.monthlyEquivalent}
                      <span className="text-sm font-medium text-slate-500">
                        {t.priceSuffix}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      {annual!.description}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-900">
                      {t.price}
                      <span className="text-sm font-medium text-slate-500">
                        {t.priceSuffix}
                      </span>
                    </p>
                    {annual && (
                      <p className="mt-1 text-xs text-slate-500">
                        or {annual.monthlyEquivalent}/mo billed annually
                      </p>
                    )}
                  </>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1 inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500"
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <button
                  type="button"
                  disabled={isCurrent || busy}
                  onClick={() => pickPlan(t, cycle)}
                  className={
                    isCurrent
                      ? "btn-secondary w-full cursor-default opacity-60"
                      : isDowngrade
                      ? "inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                      : "btn-primary w-full"
                  }
                >
                  {busy ? "Working…" : actionLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
