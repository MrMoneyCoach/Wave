/**
 * Milestone thresholds + reward copy for the waitlist referral mechanic.
 * Edit freely — the UI re-renders without code changes.
 */

export type Milestone = {
  threshold: number;
  /** Short label shown on the progress bar */
  label: string;
  /** Headline-style reward description shown when reached */
  reward: string;
  /** Subtle accent applied to the progress segment when reached */
  accent?: "skin" | "clay" | "sage";
};

export const milestones: Milestone[] = [
  {
    threshold: 1,
    label: "First friend",
    reward: "An early thank-you card with your first delivery.",
    accent: "skin",
  },
  {
    threshold: 3,
    label: "Three friends",
    reward: "Skip the queue at Kickstarter open.",
    accent: "skin",
  },
  {
    threshold: 5,
    label: "Five friends",
    reward: "A free Born Bare welcome pack with your first order.",
    accent: "clay",
  },
  {
    threshold: 10,
    label: "Ten friends",
    reward: "Founding Family certificate, hand-numbered.",
    accent: "clay",
  },
  {
    threshold: 25,
    label: "Twenty-five",
    reward: "A year of nappies on us.",
    accent: "sage",
  },
];

/** Returns the next milestone the user is working toward, or null if all met. */
export function nextMilestone(count: number): Milestone | null {
  return milestones.find((m) => count < m.threshold) ?? null;
}

/** Returns the most-recently met milestone, or null if none yet. */
export function lastMilestone(count: number): Milestone | null {
  const met = milestones.filter((m) => count >= m.threshold);
  return met.length > 0 ? met[met.length - 1] : null;
}

/** Progress (0–1) toward the next milestone, relative to the previous one. */
export function progressToNext(count: number): number {
  const next = nextMilestone(count);
  if (!next) return 1;
  const prev = lastMilestone(count);
  const floor = prev?.threshold ?? 0;
  const span = next.threshold - floor;
  if (span <= 0) return 1;
  return Math.min(1, (count - floor) / span);
}
