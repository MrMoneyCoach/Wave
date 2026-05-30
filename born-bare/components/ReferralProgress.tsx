import { milestones, nextMilestone, progressToNext, lastMilestone } from "@/lib/referralRewards";
import { cn } from "@/lib/utils";

type Props = {
  count: number;
  className?: string;
};

export default function ReferralProgress({ count, className }: Props) {
  const next = nextMilestone(count);
  const last = lastMilestone(count);
  const progress = Math.round(progressToNext(count) * 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p className="font-sans text-caption uppercase tracking-[0.24em] text-stone">
          You&rsquo;ve referred {count} {count === 1 ? "friend" : "friends"}
        </p>
        {next && (
          <p className="font-sans text-caption uppercase tracking-[0.24em] text-stone">
            Next: {next.label}
          </p>
        )}
      </div>

      <div
        className="h-1 bg-earth/10 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Progress toward next referral milestone"
      >
        <div
          className="h-full bg-clay transition-[width] duration-700 ease-calm"
          style={{ width: `${progress}%` }}
        />
      </div>

      {next && (
        <p className="mt-4 font-serif italic text-earth/75 text-[clamp(1rem,1.5vw,1.15rem)] leading-snug">
          {next.reward}
        </p>
      )}

      {!next && last && (
        <p className="mt-4 font-serif italic text-earth/85 text-[clamp(1rem,1.5vw,1.15rem)] leading-snug">
          All milestones reached. Thank you — we&rsquo;ll be in touch personally.
        </p>
      )}

      <ul className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-y-3 text-caption">
        {milestones.map((m) => {
          const reached = count >= m.threshold;
          return (
            <li key={m.threshold} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  reached ? "bg-clay" : "bg-earth/15"
                )}
              />
              <span className={reached ? "text-earth" : "text-stone"}>
                {m.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
