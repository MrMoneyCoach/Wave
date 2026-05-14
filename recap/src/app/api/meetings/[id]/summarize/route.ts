import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { summarizeMeeting } from "@/lib/summarize";

export const maxDuration = 120;

const Body = z.object({ template_id: z.string().uuid() });

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  const body = Body.parse(await request.json());

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, owner_id")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .single();
  if (!meeting)
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: corsHeaders() });

  try {
    const summary = await summarizeMeeting(meeting.id, body.template_id);
    return NextResponse.json({ ok: true, summary }, { headers: corsHeaders() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin()
      .from("meetings")
      .update({ status: "failed", error: msg })
      .eq("id", meeting.id);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
