import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getStripe, priceIdFor, stripeConfigured } from "@/lib/stripe";

const schema = z.object({
  tier: z.enum(["starter", "grow", "pro"]),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

function appUrl(): string {
  return (process.env.APP_URL ?? "").replace(/\/$/, "");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "Billing isn't configured yet.",
        code: "stripe_not_configured",
      },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 400 });
  }

  const { tier, cycle } = parsed.data;
  const priceId = priceIdFor(tier, cycle);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `No Stripe price configured for ${tier} (${cycle}). Set STRIPE_PRICE_${tier.toUpperCase()}_${cycle.toUpperCase()} in your environment.`,
        code: "missing_price_id",
      },
      { status: 503 },
    );
  }

  const stripe = getStripe();

  // Reuse the user's Stripe customer if we've already seen them; otherwise
  // create one and persist the ID. Using customer + customer_email lets
  // returning users pick up existing payment methods automatically.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const base = appUrl() || new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${base}/dashboard/account?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/dashboard/account?upgraded=0`,
    subscription_data: {
      metadata: { userId: user.id, tier, cycle },
    },
    metadata: { userId: user.id, tier, cycle },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe didn't return a checkout URL" },
      { status: 500 },
    );
  }
  return NextResponse.json({ url: session.url });
}
