import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { TIERS, computeUsage, findTier } from "@/lib/tiers";
import { isActiveStatus } from "@/lib/stripe";
import UpgradeButton from "@/components/UpgradeButton";
import UpgradeOptions from "@/components/UpgradeOptions";
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: { upgraded?: string };
}) {
  const user = await requireUser();
  const justUpgraded = searchParams?.upgraded === "1";
  const cancelledCheckout = searchParams?.upgraded === "0";

  const [scorecardCount, submissionCount] = await Promise.all([
    prisma.quiz.count({ where: { userId: user.id } }),
    prisma.submission.count({ where: { quiz: { userId: user.id } } }),
  ]);

  const tier = findTier(user.tier);
  const usage = computeUsage(tier, scorecardCount);
  const usagePct =
    tier.scorecardLimit === -1
      ? 0
      : Math.min(100, (scorecardCount / tier.scorecardLimit) * 100);

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Account
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
          {user.name || user.email.split("@")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
      </div>

      {justUpgraded && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span aria-hidden className="mt-0.5">✓</span>
          <div>
            <p className="font-semibold">You're on a new plan — welcome!</p>
            <p className="mt-0.5 text-emerald-800">
              Your subscription is being activated. If your plan still shows as
              the old tier in a moment, give it a few seconds to sync from Stripe
              and refresh the page.
            </p>
          </div>
        </div>
      )}
      {cancelledCheckout && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Checkout cancelled. No payment was taken — try again whenever you're
          ready.
        </div>
      )}

      {/* Current plan */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current plan
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {tier.name}{" "}
              <span className="ml-1 text-base font-medium text-slate-500">
                {tier.price}
                {tier.priceSuffix}
              </span>
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">{tier.tagline}</p>
          </div>
          <div className="flex gap-2">
            {user.stripeSubscriptionId &&
              isActiveStatus(user.stripeSubscriptionStatus) && (
                <ManageSubscriptionButton />
              )}
            {tier.id !== "unlimited" && <UpgradeButton currentTier={tier.id} />}
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Scorecard usage
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">{scorecardCount}</p>
              {tier.scorecardLimit !== -1 ? (
                <p className="text-slate-500">/ {tier.scorecardLimit}</p>
              ) : (
                <p className="text-slate-500">/ unlimited</p>
              )}
            </div>
            {tier.scorecardLimit !== -1 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    usage.atLimit
                      ? "bg-red-500"
                      : usage.nearLimit
                      ? "bg-amber-500"
                      : "bg-brand-500"
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
            {usage.atLimit && (
              <p className="mt-2 text-sm text-red-600">
                You've used every scorecard on your plan. Upgrade to add more.
              </p>
            )}
            {!usage.atLimit && usage.nearLimit && (
              <p className="mt-2 text-sm text-amber-700">
                Heads up — you're close to your scorecard limit on this plan.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total submissions
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-slate-900">
                {submissionCount}
              </p>
              <p className="text-slate-500">across all scorecards</p>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {tier.leadsPerMonth === -1
                ? "Unlimited leads on this plan."
                : `Soft cap of ${tier.leadsPerMonth} leads / month on this plan.`}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What's included
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {tier.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700"
                >
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Upgrade options */}
      {tier.id !== "unlimited" && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Upgrade options</h2>
          <p className="mt-1 text-sm text-slate-500">
            Higher tiers unlock more scorecards, more responses, more team
            seats, and remove Flowscore branding from public pages. Save 20%
            when you pay annually.
          </p>
          <UpgradeOptions
            currentTier={tier.id}
            options={TIERS.filter(
              (t) => tierIndex(t.id) > tierIndex(tier.id),
            )}
          />
        </section>
      )}

      {/* Sign-in info */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Sign-in</h2>
        <div className="card mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </p>
            <p className="mt-1 text-sm text-slate-900">{user.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Member since
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {user.createdAt.toLocaleDateString()}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Need to change your email or password?{" "}
          <Link href="/dashboard" className="font-medium text-brand-600 hover:underline">
            Contact support
          </Link>{" "}
          (account-level edits aren't self-serve yet).
        </p>
      </section>
    </div>
  );
}

function tierIndex(id: string): number {
  return TIERS.findIndex((t) => t.id === id);
}
