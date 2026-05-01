import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";

/** Undo a scheduled cancellation. Only works while the current period is
 *  still active. */
export async function POST() {
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
      { error: "No subscription to resume.", code: "no_subscription" },
      { status: 400 },
    );
  }
  const stripe = getStripe();
  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });
  return NextResponse.json({ ok: true });
}
