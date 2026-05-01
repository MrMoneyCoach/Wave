import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getStripe, priceIdFor, stripeConfigured } from "@/lib/stripe";

const schema = z.object({
  tier: z.enum(["starter", "grow", "pro"]),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't configured yet.", code: "stripe_not_configured" },
      { status: 503 },
    );
  }

  if (!user.stripeSubscriptionId) {
    return NextResponse.json(
      {
        error:
          "You don't have an active subscription yet. Choose a plan to start.",
        code: "no_subscription",
      },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tier, cycle } = parsed.data;

  const newPriceId = priceIdFor(tier, cycle);
  if (!newPriceId) {
    return NextResponse.json(
      {
        error: `No Stripe price configured for ${tier} (${cycle}).`,
        code: "missing_price_id",
      },
      { status: 503 },
    );
  }

  const stripe = getStripe();

  // Pull the subscription so we can target the existing item by ID — Stripe
  // requires the item ID, not just a price swap.
  const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  const item = sub.items.data[0];
  if (!item) {
    return NextResponse.json(
      { error: "Subscription has no items — please contact support." },
      { status: 500 },
    );
  }

  if (item.price.id === newPriceId) {
    return NextResponse.json(
      { error: "You're already on this plan.", code: "no_change" },
      { status: 400 },
    );
  }

  // create_prorations is the standard Stripe pattern: upgrades charge the
  // prorated difference today, downgrades credit the unused time to the
  // customer's balance against the next invoice. The webhook fires on
  // subscription.updated and syncs the new tier into our DB.
  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    items: [{ id: item.id, price: newPriceId }],
    proration_behavior: "create_prorations",
    payment_behavior: "allow_incomplete",
  });

  return NextResponse.json({ ok: true });
}
