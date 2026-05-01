export type TierId = "free" | "starter" | "grow" | "pro" | "unlimited";

export type Tier = {
  id: TierId;
  name: string;
  /** Headline monthly price, e.g. "£0", "£19". For sales-only tiers this is
   *  the "from" price. */
  price: string;
  /** Suffix, e.g. "/forever", "/month". */
  priceSuffix: string;
  /** Max number of live scorecards. -1 = unlimited. */
  scorecardLimit: number;
  /** Soft monthly leads cap. -1 = unlimited. */
  leadsPerMonth: number;
  /** Number of seats / team members. -1 = unlimited. */
  userLimit: number;
  /** One-line tagline shown on upgrade cards. */
  tagline: string;
  /** Bullet list shown on upgrade cards. */
  features: string[];
  /** When true, self-serve upgrade is blocked — surface a "Contact sales"
   *  button instead. */
  contactSales?: boolean;
  /** Discount percentage for annual billing (informational). Omit for tiers
   *  that don't offer annual pricing (free, contact-sales). */
  annualDiscountPercent?: number;
};

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    priceSuffix: "/forever",
    scorecardLimit: 1,
    leadsPerMonth: 50,
    userLimit: 1,
    tagline: "Try Flowscore with one live scorecard.",
    features: [
      "1 live scorecard",
      "Up to 50 responses / month",
      "1 user",
      "Branded landing pages",
      "PDF email reports",
      "Flowscore branding shown on output",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "£19",
    priceSuffix: "/month",
    scorecardLimit: 3,
    leadsPerMonth: 100,
    userLimit: 1,
    annualDiscountPercent: 20,
    tagline: "For solo advisors getting started with scorecards.",
    features: [
      "3 live scorecards",
      "Up to 100 responses / month",
      "1 user",
      "Custom domain",
      "Hide Flowscore branding",
      "Full template library",
    ],
  },
  {
    id: "grow",
    name: "Grow",
    price: "£49",
    priceSuffix: "/month",
    scorecardLimit: 10,
    leadsPerMonth: 1000,
    userLimit: 3,
    annualDiscountPercent: 20,
    tagline: "For small teams running scorecards as a real lead engine.",
    features: [
      "10 live scorecards",
      "Up to 1,000 responses / month",
      "3 users",
      "Custom domain",
      "Hide Flowscore branding",
      "All templates",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "£99",
    priceSuffix: "/month",
    scorecardLimit: 25,
    leadsPerMonth: 3000,
    userLimit: 5,
    annualDiscountPercent: 20,
    tagline: "For growing teams scaling scorecard-based marketing.",
    features: [
      "25 live scorecards",
      "Up to 3,000 responses / month",
      "5 users",
      "All Grow features",
      "CRM integrations (when shipped)",
      "Dedicated onboarding",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "From £499",
    priceSuffix: "/month",
    scorecardLimit: -1,
    leadsPerMonth: -1,
    userLimit: -1,
    tagline:
      "Unlimited possibilities — for agencies and large operations. Talk to us about a fit.",
    features: [
      "Unlimited scorecards",
      "Unlimited responses",
      "Unlimited users",
      "White-label",
      "Dedicated account manager",
      "Custom contracts and SLAs",
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

/** Find the next tier above the given one, in display order. Skips
 *  contact-sales tiers since you can't self-upgrade to them. */
export function nextTier(id: string): Tier | null {
  const idx = TIERS.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  for (let i = idx + 1; i < TIERS.length; i += 1) {
    if (!TIERS[i].contactSales) return TIERS[i];
  }
  return null;
}

/** Parse a price string like "£19" or "From £499" into a number, or null
 *  for prices we can't compute on (e.g. "£0"). */
function parsePounds(price: string): number | null {
  const m = price.match(/£\s*([\d,]+(?:\.\d+)?)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(v) && v > 0 ? v : null;
}

export type AnnualPricing = {
  /** Per-month price when billed annually, e.g. "£15.20". */
  monthlyEquivalent: string;
  /** Total annual price, e.g. "£182.40". */
  yearlyTotal: string;
  /** "Save 20%" style label. */
  savingsLabel: string;
  /** Pre-formatted savings line, e.g. "billed £182.40/year, save 20%". */
  description: string;
};

function formatPounds(n: number): string {
  // Drop trailing .00 but keep cents when present.
  const rounded = Math.round(n * 100) / 100;
  return `£${rounded.toFixed(2).replace(/\.00$/, "")}`;
}

/** Compute the annual-billed pricing for a tier. Returns null when the tier
 *  doesn't offer annual billing (Free, contact-sales, or no parsable price). */
export function annualPricing(tier: Tier): AnnualPricing | null {
  const discount = tier.annualDiscountPercent;
  if (!discount || tier.contactSales) return null;
  const monthly = parsePounds(tier.price);
  if (monthly === null) return null;
  const annualMonthly = monthly * (1 - discount / 100);
  const yearly = annualMonthly * 12;
  return {
    monthlyEquivalent: formatPounds(annualMonthly),
    yearlyTotal: formatPounds(yearly),
    savingsLabel: `Save ${discount}%`,
    description: `Billed ${formatPounds(yearly)} / year — save ${discount}%`,
  };
}

/** Tone class set for tier pills, by id. */
export function tierTone(id: string): string {
  switch (id) {
    case "starter":
      return "bg-sky-100 text-sky-800";
    case "grow":
      return "bg-emerald-100 text-emerald-800";
    case "pro":
      return "bg-violet-100 text-violet-800";
    case "unlimited":
      return "bg-amber-100 text-amber-800";
    case "free":
    default:
      return "bg-slate-100 text-slate-700";
  }
}
