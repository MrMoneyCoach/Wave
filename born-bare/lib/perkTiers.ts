export type PerkTier = {
  id: string;
  number: number;
  name: string;
  /** Short descriptor under the name */
  tagline: string;
  /** GBP, in whole pounds */
  price: number;
  /** Estimated retail value, used for savings badge */
  retailValue?: number;
  /** Bulleted inclusions shown on the card */
  inclusions: string[];
  /** Optional ribbon copy — "Early bird", "Limited", etc. */
  ribbon?: string;
  /** Highlights this tier with subtle Clay elevation */
  featured?: boolean;
  /** Used to tag waitlist signups on the Coming Soon page */
  waitlistSource: string;
};

/**
 * Placeholder pricing and inclusions — edit freely before launch.
 * Tier numbering ascends with pledge size; the featured tier is the
 * one we expect to be "most popular" once the campaign opens.
 */
export const perkTiers: PerkTier[] = [
  {
    id: "friend",
    number: 1,
    name: "The Friend",
    tagline: "A first taste.",
    price: 15,
    retailValue: 20,
    inclusions: [
      "One trial pack (8 nappies)",
      "Welcome card and brand story",
      "Pre-launch updates",
    ],
    ribbon: "Early bird",
    waitlistSource: "kickstarter-tier-1",
  },
  {
    id: "early-bird",
    number: 2,
    name: "The Early Bird",
    tagline: "A month of better nights.",
    price: 39,
    retailValue: 60,
    inclusions: [
      "One month's supply (size of your choice)",
      "Kraft gift packaging",
      "Welcome card",
    ],
    ribbon: "Early bird",
    waitlistSource: "kickstarter-tier-2",
  },
  {
    id: "believer",
    number: 3,
    name: "The Believer",
    tagline: "Three quiet months.",
    price: 75,
    retailValue: 180,
    inclusions: [
      "Three months' supply",
      "Choose your sizes as baby grows",
      "Free UK delivery",
    ],
    waitlistSource: "kickstarter-tier-3",
  },
  {
    id: "family",
    number: 4,
    name: "The Family",
    tagline: "Six months, sorted.",
    price: 140,
    retailValue: 360,
    inclusions: [
      "Six months' supply",
      "Flexible sizing across the period",
      "Free UK delivery",
      "Early access to new products",
    ],
    waitlistSource: "kickstarter-tier-4",
  },
  {
    id: "founder",
    number: 5,
    name: "The Founding Family",
    tagline: "A year of sleep.",
    price: 225,
    retailValue: 720,
    inclusions: [
      "One year's supply",
      "Flexible sizing across the year",
      "Founding Family certificate, hand-numbered",
      "Free UK delivery for life",
      "Permanent 15% loyalty discount",
    ],
    ribbon: "Most popular",
    featured: true,
    waitlistSource: "kickstarter-tier-5",
  },
  {
    id: "twin",
    number: 6,
    name: "The Twin Pack",
    tagline: "Two years, two babies.",
    price: 420,
    retailValue: 1440,
    inclusions: [
      "Two years' supply — for twins or two children",
      "Flexible sizing throughout",
      "Founding Family certificate",
      "Free UK delivery for life",
      "Permanent 15% loyalty discount",
    ],
    waitlistSource: "kickstarter-tier-6",
  },
  {
    id: "founding-circle",
    number: 7,
    name: "The Founding Circle",
    tagline: "A year, plus a seat at the table.",
    price: 495,
    retailValue: 950,
    inclusions: [
      "One year's supply",
      "Quarterly product roadmap calls with the founders",
      "Hand-written thank you from the team",
      "Free UK delivery for life",
      "Permanent 20% loyalty discount",
    ],
    ribbon: "Limited",
    waitlistSource: "kickstarter-tier-7",
  },
  {
    id: "patron",
    number: 8,
    name: "The Patron",
    tagline: "Two years, with our gratitude.",
    price: 950,
    retailValue: 2400,
    inclusions: [
      "Two years' supply",
      "Your name on the wall at our HQ",
      "Annual studio visit",
      "Founders' direct line",
      "Permanent 25% loyalty discount",
    ],
    ribbon: "Limited",
    waitlistSource: "kickstarter-tier-8",
  },
  {
    id: "inheritance",
    number: 9,
    name: "The Inheritance",
    tagline: "Five years of nights.",
    price: 1800,
    retailValue: 4800,
    inclusions: [
      "Five years' supply — across one or more children",
      "Founders' direct line",
      "Lifetime Founding Family status",
      "Two annual studio visits",
      "Custom bespoke gift on each birthday",
    ],
    ribbon: "Very limited",
    waitlistSource: "kickstarter-tier-9",
  },
];

export function savings(tier: PerkTier): number | null {
  if (!tier.retailValue || tier.retailValue <= tier.price) return null;
  return Math.round(((tier.retailValue - tier.price) / tier.retailValue) * 100);
}
