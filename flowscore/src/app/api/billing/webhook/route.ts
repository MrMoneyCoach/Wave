import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  getStripe,
  isActiveStatus,
  stripeConfigured,
  tierFromPriceId,
} from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sync whatever a Stripe Subscription object tells us back into our User row.
 *  Called from multiple webhook handlers so the source of truth is always the
 *  Stripe subscription, not our intermediate state. */
async function syncSubscription(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  const mapped = priceId ? tierFromPriceId(priceId) : null;

  const userId =
    (sub.metadata as Record<string, string> | null)?.userId ?? null;

  // Find the user — prefer metadata, fall back to customer ID.
  let user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;
  if (!user && typeof sub.customer === "string") {
    user = await prisma.user.findUnique({
      where: { stripeCustomerId: sub.customer },
    });
  }
  if (!user) {
    console.warn("[stripe webhook] subscription %s has no matching user", sub.id);
    return;
  }

  // If the subscription is active, the user's tier reflects what they're
  // paying for. If it's cancelled / unpaid, drop them back to free.
  const active = isActiveStatus(sub.status);
  const tier = active && mapped ? mapped.tier : "free";
  const cycle = active && mapped ? mapped.cycle : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tier,
      tierUpdatedAt: new Date(),
      stripeSubscriptionId: sub.id,
      stripeSubscriptionStatus: sub.status,
      subscriptionCycle: cycle,
      subscriptionCancelAtPeriodEnd: !!sub.cancel_at_period_end,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
      stripeCustomerId:
        typeof sub.customer === "string"
          ? sub.customer
          : user.stripeCustomerId,
    },
  });
}

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  // Stripe needs the *raw* request body to verify the signature. App Router's
  // request.text() gives us that without parsing.
  const raw = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bad signature";
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          // Pull the full subscription so we have the line items + status.
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (typeof invoice.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await syncSubscription(sub);
        }
        break;
      }
      default:
        // We acknowledge every event with a 200 even if we don't handle it,
        // so Stripe doesn't keep retrying.
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    // Return 500 so Stripe retries — the event will be replayed.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
