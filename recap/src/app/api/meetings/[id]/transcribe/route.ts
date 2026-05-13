import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { transcribeFromUrl } from "@/lib/deepgram";
import { summarizeMeeting } from "@/lib/summarize";

export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: meeting, error: getErr } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", userData.user.id)
    .single();
  if (getErr || !meeting) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!meeting.audio_path)
    return NextResponse.json({ error: "no_audio" }, { status: 400 });

  const admin = supabaseAdmin();

  // Signed URL Deepgram can fetch.
  const { data: signed, error: signErr } = await admin.storage
    .from("recordings")
    .createSignedUrl(meeting.audio_path, 60 * 30);
  if (signErr || !signed)
    return NextResponse.json({ error: signErr?.message ?? "sign_failed" }, { status: 500 });

  await admin.from("meetings").update({ status: "transcribing" }).eq("id", meeting.id);

  try {
    const { utterances, transcriptText, duration, language } = await transcribeFromUrl(
      signed.signedUrl,
    );

    await admin.from("segments").delete().eq("meeting_id", meeting.id);
    if (utterances.length) {
      const rows = utterances.map((u) => ({
        meeting_id: meeting.id,
        speaker: u.speaker,
        start_seconds: u.start,
        end_seconds: u.end,
        text: u.text,
      }));
      const { error: segErr } = await admin.from("segments").insert(rows);
      if (segErr) throw new Error(`Failed to insert segments: ${segErr.message}`);
    }

    await admin
      .from("meetings")
      .update({
        status: "transcribed",
        transcript_text: transcriptText,
        duration_seconds: duration ? Math.round(duration) : null,
        language,
      })
      .eq("id", meeting.id);

    // Kick off the summary in the same request — for short calls this is fine
    // and gives us a fully-ready meeting on first page load.
    if (meeting.template_id) {
      try {
        await summarizeMeeting(meeting.id, meeting.template_id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await admin.from("meetings").update({ status: "failed", error: msg }).eq("id", meeting.id);
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    } else {
      await admin.from("meetings").update({ status: "ready" }).eq("id", meeting.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("meetings").update({ status: "failed", error: msg }).eq("id", meeting.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
