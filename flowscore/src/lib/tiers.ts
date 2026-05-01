export type TierId = "free" | "starter" | "pro" | "agency";

export type Tier = {
  id: TierId;
  name: string;
  /** Headline price, e.g. "£0", "£29". */
  price: string;
  /** Suffix, e.g. "/forever", "/month". */
  priceSuffix: string;
  /** Max number of scorecards the user can have on this tier. -1 = unlimited. */
  scorecardLimit: number;
  /** Soft monthly leads cap. -1 = unlimited. Currently informational only. */
  leadsPerMonth: number;
  /** One-line tagline shown on upgrade cards. */
  tagline: string;
  /** Bullet list shown on upgrade cards. */
  features: string[];
  /** When true, show "Contact us" instead of self-serve. */
  contactSales?: boolean;
};

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    priceSuffix: "/forever",
    scorecardLimit: 1,
    leadsPerMonth: 50,
    tagline: "Try Flowscore with one live scorecard.",
    features: [
      "1 scorecard",
      "Up to 50 leads / month",
      "Branded landing pages",
      "PDF email reports",
      "Flowscore branding shown on output",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "£29",
    priceSuffix: "/month",
    scorecardLimit: 3,
    leadsPerMonth: 500,
    tagline: "For solo advisors and small agencies running a few scorecards.",
    features: [
      "3 scorecards",
      "Up to 500 leads / month",
      "Custom domain",
      "Hide Flowscore branding",
      "Full template library",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "£79",
    priceSuffix: "/month",
    scorecardLimit: 10,
    leadsPerMonth: -1,
    tagline: "For teams running scorecards as a real lead engine.",
    features: [
      "10 scorecards",
      "Unlimited leads",
      "All templates",
      "CRM integrations (when shipped)",
      "Priority support",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    price: "£249",
    priceSuffix: "/month",
    scorecardLimit: -1,
    leadsPerMonth: -1,
    tagline: "White-labelled, multi-seat — for agencies running scorecards for clients.",
    features: [
      "Unlimited scorecards",
      "Unlimited leads",
      "White-label",
      "Multiple seats (when shipped)",
      "Dedicated support",
    ],
    contactSales: true,
  },
];

export function findTier(id: string): Tier {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

export function isWithinScorecardLimit(tier: Tier, currentCount: number): boolean {
  if (tier.scorecardLimit === -1) return true;
  return currentCount < tier.scorecardLimit;
}

export type UsageState = {
  currentCount: number;
  limit: number; // -1 = unlimited
  atLimit: boolean;
  nearLimit: boolean; // 80%+ of limit
};

export function computeUsage(tier: Tier, currentCount: number): UsageState {
  const limit = tier.scorecardLimit;
  if (limit === -1) {
    return { currentCount, limit, atLimit: false, nearLimit: false };
  }
  return {
    currentCount,
    limit,
    atLimit: currentCount >= limit,
    nearLimit: currentCount >= Math.max(1, Math.floor(limit * 0.8)),
  };
}

/** Find the next tier above the given one, in display order. */
export function nextTier(id: string): Tier | null {
  const idx = TIERS.findIndex((t) => t.id === id);
  if (idx === -1 || idx === TIERS.length - 1) return null;
  return TIERS[idx + 1];
}
