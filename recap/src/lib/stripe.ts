import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/**
 * Find or create a Stripe customer for the given Supabase user, persisting the
 * customer id on the profile so subsequent calls are a single Postgres lookup.
 */
export async function findOrCreateCustomer(args: {
  userId: string;
  email: string;
}): Promise<string> {
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", args.userId)
    .single();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id;

  const stripe = stripeClient();
  const customer = await stripe.customers.create({
    email: args.email,
    metadata: { recap_user_id: args.userId },
  });
  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", args.userId);
  return customer.id;
}

/** Map a Stripe subscription status to the `plan` we persist on the profile. */
export function planFromStatus(status: Stripe.Subscription.Status | null | undefined): "free" | "pro" {
  if (!status) return "free";
  // `trialing` and `active` count as paying; `past_due` is treated as still
  // pro for a short grace period — Stripe will retry, then cancel, and we'll
  // get a separate event that downgrades us.
  if (status === "active" || status === "trialing" || status === "past_due") return "pro";
  return "free";
}
