"use client";

import { useState } from "react";
import { Tier, annualPricing } from "@/lib/tiers";
import UpgradeButton from "@/components/UpgradeButton";

type Cycle = "monthly" | "yearly";

export default function UpgradeOptions({
  currentTier,
  options,
}: {
  currentTier: string;
  options: Tier[];
}) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const anyAnnual = options.some((t) => annualPricing(t));

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
                    cycle === c ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700"
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
        {options.map((t) => {
          const annual = annualPricing(t);
          const showAnnual = cycle === "yearly" && annual !== null;
          return (
            <div key={t.id} className="card flex flex-col">
              <h3 className="text-lg font-semibold">{t.name}</h3>
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
                    {!annual && t.contactSales && (
                      <p className="mt-1 text-xs text-slate-500">
                        Custom contract — talk to us about a fit.
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
                <UpgradeButton
                  currentTier={currentTier}
                  targetTier={t.id}
                  cycle={cycle}
                  block
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
