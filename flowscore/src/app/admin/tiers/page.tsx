import { requireAdmin } from "@/lib/session";
import { TIERS, annualPricing } from "@/lib/tiers";

export const dynamic = "force-dynamic";

export default async function AdminTiersPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Master admin
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
          Subscription tiers
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Tier definitions are code-managed for now (in <code>src/lib/tiers.ts</code>),
          which keeps it simple while the pricing model settles. Once it's
          stable we'll move them into the database for live editing. Annual
          pricing is currently a flat 20% discount on each paid tier.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {TIERS.map((t) => {
          const annual = annualPricing(t);
          return (
            <div key={t.id} className="card flex flex-col">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">{t.name}</h2>
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-900">{t.price}</span>
                  {t.priceSuffix}
                </p>
              </div>
              <p className="mt-2 text-sm text-slate-500">{t.tagline}</p>

              {annual ? (
                <p className="mt-2 text-xs text-emerald-700">
                  Annual: <span className="font-semibold">{annual.monthlyEquivalent}/mo</span>{" "}
                  ({annual.yearlyTotal}/yr) — {annual.savingsLabel}
                </p>
              ) : t.contactSales ? (
                <p className="mt-2 text-xs text-slate-500">
                  Contact sales — custom contract.
                </p>
              ) : null}

              <ul className="mt-4 space-y-2 text-sm">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500"
                    />
                    <span className="text-slate-700">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <div>
                  <p className="font-semibold uppercase tracking-wide text-slate-500">
                    Scorecards
                  </p>
                  <p className="mt-0.5 text-sm text-slate-900">
                    {t.scorecardLimit === -1 ? "Unlimited" : t.scorecardLimit}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-slate-500">
                    Responses / mo
                  </p>
                  <p className="mt-0.5 text-sm text-slate-900">
                    {t.leadsPerMonth === -1
                      ? "Unlimited"
                      : t.leadsPerMonth.toLocaleString("en-GB")}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-slate-500">
                    Users
                  </p>
                  <p className="mt-0.5 text-sm text-slate-900">
                    {t.userLimit === -1 ? "Unlimited" : t.userLimit}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
