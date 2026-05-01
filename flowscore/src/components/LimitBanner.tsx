import Link from "next/link";

export default function LimitBanner({
  tierName,
  scorecardLimit,
  currentCount,
  variant = "block",
}: {
  tierName: string;
  scorecardLimit: number;
  currentCount: number;
  /** "block" — use as a top-of-page block. "card" — slot inside a card. */
  variant?: "block" | "card";
}) {
  const cls =
    variant === "card"
      ? "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      : "rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900";
  return (
    <div className={cls}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            You've used every scorecard on the {tierName} plan
          </p>
          <p className="mt-0.5 text-amber-800">
            {currentCount} of {scorecardLimit} used. Upgrade your plan to create
            more — your existing scorecards stay live.
          </p>
        </div>
        <Link
          href="/dashboard/account"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
        >
          See upgrade options →
        </Link>
      </div>
    </div>
  );
}
