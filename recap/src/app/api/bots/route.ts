import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";
import { createBot } from "@/lib/recall";

const Body = z.object({
  meeting_url: z.string().url(),
  title: z.string().min(1).max(200).optional(),
  template_id: z.string().uuid().nullable().optional(),
  bot_name: z.string().max(80).optional(),
});

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid_body" },
      { status: 400, headers: corsHeaders() },
    );
  }

  // Create the meeting row first so we have something for the webhook to find,
  // even though we don't yet have an audio_path (the bot hasn't finished).
  const { data: meeting, error: insertErr } = await supabase
    .from("meetings")
    .insert({
      owner_id: user.id,
      title: body.title ?? `Meeting bot — ${new Date().toLocaleString()}`,
      source: "meeting_bot",
      status: "queued",
      template_id: body.template_id ?? null,
    })
    .select("id")
    .single();
  if (insertErr || !meeting)
    return NextResponse.json(
      { error: insertErr?.message ?? "insert_failed" },
      { status: 500, headers: corsHeaders() },
    );

  try {
    const bot = await createBot({
      meetingUrl: body.meeting_url,
      botName: body.bot_name || "Recap",
    });

    const { error: updateErr } = await supabase
      .from("meetings")
      .update({ recall_bot_id: bot.id })
      .eq("id", meeting.id)
      .eq("owner_id", user.id);
    if (updateErr) throw new Error(updateErr.message);

    return NextResponse.json(
      { id: meeting.id, recall_bot_id: bot.id },
      { headers: corsHeaders() },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("meetings")
      .update({ status: "failed", error: msg })
      .eq("id", meeting.id)
      .eq("owner_id", user.id);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
