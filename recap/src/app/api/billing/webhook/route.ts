import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { planFromStatus, stripeClient } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

// Stripe needs the raw body to verify signatures. App Router gives us that
// via `request.text()` before any JSON parsing.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = stripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `invalid_signature: ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncSession(session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      default:
        // Other events (invoice.paid, etc.) — not needed for plan state.
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function syncSession(session: Stripe.Checkout.Session) {
  // We rely on subscription.* events for the canonical state, but if we get
  // here before those land we can flip the user to Pro on first checkout
  // completion to remove the awkward "I just paid, why am I still free?" gap.
  const userId =
    session.metadata?.recap_user_id ?? session.client_reference_id ?? null;
  if (!userId) return;
  const admin = supabaseAdmin();
  const update: Record<string, unknown> = {};
  if (typeof session.customer === "string") update.stripe_customer_id = session.customer;
  if (typeof session.subscription === "string") update.stripe_subscription_id = session.subscription;
  if (session.payment_status === "paid") update.plan = "pro";
  if (Object.keys(update).length === 0) return;
  await admin.from("profiles").update(update).eq("id", userId);
}

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const plan = planFromStatus(sub.status);
  // Match by customer id (preferred) or by recap_user_id metadata as a fallback.
  const userId = (sub.metadata?.recap_user_id as string | undefined) ?? null;

  const admin = supabaseAdmin();
  const update = {
    plan,
    stripe_subscription_id: plan === "free" ? null : sub.id,
    plan_current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
  };

  // Prefer the canonical Stripe customer match.
  const { data: byCustomer } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (byCustomer?.id) {
    await admin.from("profiles").update(update).eq("id", byCustomer.id);
    return;
  }
  if (userId) {
    await admin
      .from("profiles")
      .update({ ...update, stripe_customer_id: customerId })
      .eq("id", userId);
  }
}
