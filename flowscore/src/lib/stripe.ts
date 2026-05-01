import Stripe from "stripe";
import { TierId } from "./tiers";

/** True when the Stripe secret key is set. When false, billing endpoints
 *  fall back to a "billing not configured yet" 503 so the chrome stays
 *  usable in environments that haven't been wired up to Stripe. */
export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let _stripe: Stripe | null = null;

/** Returns the lazily-initialised Stripe client, or throws if not configured. */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — Stripe billing is disabled.",
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
  });
  return _stripe;
}

export type BillingCycle = "monthly" | "yearly";

/** Map (tier, cycle) to a Stripe price ID via env vars. The Free and
 *  Unlimited tiers don't have Stripe prices — Free is the default state and
 *  Unlimited goes through sales. */
export function priceIdFor(tier: TierId, cycle: BillingCycle): string | null {
  const KEY: Partial<Record<TierId, Record<BillingCycle, string | undefined>>> = {
    starter: {
      monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      yearly: process.env.STRIPE_PRICE_STARTER_YEARLY,
    },
    grow: {
      monthly: process.env.STRIPE_PRICE_GROW_MONTHLY,
      yearly: process.env.STRIPE_PRICE_GROW_YEARLY,
    },
    pro: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
    },
  };
  return KEY[tier]?.[cycle] || null;
}

/** Reverse-map: given a Stripe price ID (from a webhook payload), figure out
 *  which (tier, cycle) it represents. Returns null if the price isn't one we
 *  recognise. */
export function tierFromPriceId(
  priceId: string,
): { tier: TierId; cycle: BillingCycle } | null {
  const all: { id: string | undefined; tier: TierId; cycle: BillingCycle }[] = [
    { id: process.env.STRIPE_PRICE_STARTER_MONTHLY, tier: "starter", cycle: "monthly" },
    { id: process.env.STRIPE_PRICE_STARTER_YEARLY, tier: "starter", cycle: "yearly" },
    { id: process.env.STRIPE_PRICE_GROW_MONTHLY, tier: "grow", cycle: "monthly" },
    { id: process.env.STRIPE_PRICE_GROW_YEARLY, tier: "grow", cycle: "yearly" },
    { id: process.env.STRIPE_PRICE_PRO_MONTHLY, tier: "pro", cycle: "monthly" },
    { id: process.env.STRIPE_PRICE_PRO_YEARLY, tier: "pro", cycle: "yearly" },
  ];
  const hit = all.find((row) => row.id && row.id === priceId);
  return hit ? { tier: hit.tier, cycle: hit.cycle } : null;
}

/** Whether a Stripe subscription status counts as "the user is paid up". */
export function isActiveStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return status === "active" || status === "trialing";
}
