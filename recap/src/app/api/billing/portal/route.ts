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

  try {
    const customer = await findOrCreateCustomer({ userId: user.id, email: user.email });
    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${siteUrl()}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url }, { headers: corsHeaders() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
