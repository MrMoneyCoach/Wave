import { NextResponse, type NextRequest } from "next/server";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";
import { findOrCreateCustomer, siteUrl, stripeClient } from "@/lib/stripe";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const { user } = await supabaseFromRequest(request);
  if (!user || !user.email)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId)
    return NextResponse.json(
      { error: "STRIPE_PRICE_ID is not configured" },
      { status: 500, headers: corsHeaders() },
    );

  try {
    const customer = await findOrCreateCustomer({ userId: user.id, email: user.email });
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl()}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/dashboard/billing?canceled=1`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { recap_user_id: user.id },
      subscription_data: { metadata: { recap_user_id: user.id } },
    });
    return NextResponse.json({ url: session.url }, { headers: corsHeaders() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
