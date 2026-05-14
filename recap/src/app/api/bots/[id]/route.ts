import { NextResponse, type NextRequest } from "next/server";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";
import { leaveCall } from "@/lib/recall";

export function OPTIONS() {
  return corsPreflight();
}

/** Tell the Recall bot to leave the call early. Recording still finalises. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  const { data: meeting } = await supabase
    .from("meetings")
    .select("recall_bot_id")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .single();
  if (!meeting?.recall_bot_id)
    return NextResponse.json({ error: "no_bot" }, { status: 404, headers: corsHeaders() });

  try {
    await leaveCall(meeting.recall_bot_id);
    return NextResponse.json({ ok: true }, { headers: corsHeaders() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
