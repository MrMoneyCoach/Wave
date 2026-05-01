import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";

function appUrl(): string {
  return (process.env.APP_URL ?? "").replace(/\/$/, "");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Billing isn't configured yet.", code: "stripe_not_configured" },
      { status: 503 },
    );
  }
  if (!user.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "No active Stripe customer for this account. Subscribe to a plan first.",
        code: "no_customer",
      },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const base = appUrl() || new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${base}/dashboard/account`,
  });
  return NextResponse.json({ url: session.url });
}
