import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { summarizeMeeting } from "@/lib/summarize";

export const maxDuration = 120;

const Body = z.object({ template_id: z.string().uuid() });

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = Body.parse(await request.json());

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, owner_id")
    .eq("id", params.id)
    .eq("owner_id", userData.user.id)
    .single();
  if (!meeting) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const summary = await summarizeMeeting(meeting.id, body.template_id);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin()
      .from("meetings")
      .update({ status: "failed", error: msg })
      .eq("id", meeting.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
