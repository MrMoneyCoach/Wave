"use client";

import Link from "next/link";
import { useState } from "react";
import { TIERS, annualPricing } from "@/lib/tiers";

type Cycle = "monthly" | "yearly";

export default function LandingPricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  return (
    <div>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
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
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-5">
        {TIERS.map((t) => {
          const annual = annualPricing(t);
          const showAnnual = cycle === "yearly" && annual !== null;
          const isFeatured = t.id === "grow";
          const ctaHref = t.contactSales
            ? "mailto:sales@flowscore.app?subject=Flowscore%20%E2%80%94%20Unlimited%20plan%20enquiry"
            : "/signup";
          const ctaLabel = t.contactSales
            ? "Contact sales"
            : t.id === "free"
            ? "Start free"
            : `Choose ${t.name}`;

          return (
            <div
              key={t.id}
              className={`flex flex-col rounded-2xl border p-6 transition ${
                isFeatured
                  ? "border-brand-500 bg-white shadow-lg ring-2 ring-brand-200"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900">{t.name}</h3>
                {isFeatured && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-2 min-h-[40px] text-xs text-slate-500">
                {t.tagline}
              </p>
              <div className="mt-4">
                {showAnnual ? (
                  <>
                    <p className="text-3xl font-bold text-slate-900">
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
                    <p className="text-3xl font-bold text-slate-900">
                      {t.price}
                      <span className="text-sm font-medium text-slate-500">
                        {t.priceSuffix}
                      </span>
                    </p>
                    {annual ? (
                      <p className="mt-1 text-xs text-slate-500">
                        or {annual.monthlyEquivalent}/mo billed annually
                      </p>
                    ) : t.contactSales ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Custom contract — talk to us about a fit.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">
                        Free forever
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700"
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {t.contactSales ? (
                  <a
                    href={ctaHref}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {ctaLabel}
                  </a>
                ) : (
                  <Link
                    href={ctaHref}
                    className={
                      isFeatured
                        ? "inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                        : "inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    }
                  >
                    {ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        All paid plans save 20% when billed annually. Cancel any time — Stripe
        handles proration on upgrades and downgrades automatically.
      </p>
    </div>
  );
}
