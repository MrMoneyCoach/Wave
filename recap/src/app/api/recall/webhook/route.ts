import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getBot, pickRecordingUrl, verifyRecallWebhook } from "@/lib/recall";
import { transcribeFromUrl } from "@/lib/deepgram";
import { summarizeMeeting } from "@/lib/summarize";

// Generous timeout: this single function downloads the recording from Recall,
// uploads it to Supabase Storage, runs Deepgram, runs Claude. For meetings up
// to ~90 minutes this comfortably fits under 300s.
export const maxDuration = 300;

// Recall posts JSON payloads with an `event` and `data` field. Signature
// headers are Svix-style (svix-id, svix-timestamp, svix-signature).

type WebhookPayload = {
  event?: string;
  data?: {
    bot?: { id?: string };
    bot_id?: string;
    status?: { code?: string; message?: string };
  };
};

const TERMINAL_OK = new Set(["done"]);
const TERMINAL_FAIL = new Set(["fatal_error", "call_ended_by_host_with_no_recording"]);

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const verified = verifyRecallWebhook({
    body: raw,
    svixId: request.headers.get("svix-id"),
    svixTimestamp: request.headers.get("svix-timestamp"),
    svixSignature: request.headers.get("svix-signature"),
  });

  // In development, allow unsigned requests when RECALL_WEBHOOK_SECRET is unset.
  if (!verified && process.env.RECALL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const botId = payload.data?.bot?.id ?? payload.data?.bot_id;
  const code = payload.data?.status?.code;

  if (!botId) return NextResponse.json({ ok: true, skipped: "no_bot_id" });
  if (!code) return NextResponse.json({ ok: true, skipped: "no_status_code" });

  // Only act on terminal states. All the in-progress chatter (joining,
  // in_call_recording, etc.) is informational.
  const isOk = TERMINAL_OK.has(code);
  const isFail = TERMINAL_FAIL.has(code);
  if (!isOk && !isFail) return NextResponse.json({ ok: true, skipped: code });

  const admin = supabaseAdmin();

  const { data: meeting } = await admin
    .from("meetings")
    .select("id, owner_id, template_id, title, status")
    .eq("recall_bot_id", botId)
    .single();
  if (!meeting) return NextResponse.json({ ok: true, skipped: "no_meeting_for_bot" });

  // Avoid double-processing if Recall replays the webhook.
  if (meeting.status === "ready" || meeting.status === "transcribing" || meeting.status === "summarizing") {
    return NextResponse.json({ ok: true, skipped: "already_processed" });
  }

  if (isFail) {
    await admin
      .from("meetings")
      .update({
        status: "failed",
        error: payload.data?.status?.message ?? `Recall reported ${code}`,
      })
      .eq("id", meeting.id);
    return NextResponse.json({ ok: true });
  }

  // ---- isOk: fetch the bot, download the recording, transcribe, summarise.
  try {
    await admin.from("meetings").update({ status: "transcribing" }).eq("id", meeting.id);

    const bot = await getBot(botId);
    const recordingUrl = pickRecordingUrl(bot);
    if (!recordingUrl) throw new Error("Recall returned no recording URL");

    // Stream the recording into Supabase Storage. We use ArrayBuffer because
    // the recording is bounded (Recall's recordings are at most a few hundred
    // megabytes for typical meetings) and this keeps the upload simple.
    const audioRes = await fetch(recordingUrl);
    if (!audioRes.ok) throw new Error(`Failed to download recording: ${audioRes.status}`);
    const contentType = audioRes.headers.get("content-type") ?? "video/mp4";
    const buffer = await audioRes.arrayBuffer();

    const ext = contentType.includes("audio/m4a") || contentType.includes("audio/mp4") ? "m4a"
              : contentType.includes("audio/mpeg") ? "mp3"
              : contentType.includes("audio/wav") ? "wav"
              : "mp4";
    const audioPath = `${meeting.owner_id}/${crypto.randomUUID()}-recall.${ext}`;

    const { error: upErr } = await admin.storage
      .from("recordings")
      .upload(audioPath, buffer, { contentType, upsert: false });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    await admin
      .from("meetings")
      .update({ audio_path: audioPath })
      .eq("id", meeting.id);

    // Use a Supabase signed URL for Deepgram rather than Recall's URL — the
    // Recall URL can expire mid-job and we want the same path the rest of the
    // pipeline uses.
    const { data: signed, error: signErr } = await admin.storage
      .from("recordings")
      .createSignedUrl(audioPath, 60 * 30);
    if (signErr || !signed) throw new Error(signErr?.message ?? "sign_failed");

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

    if (meeting.template_id) {
      await summarizeMeeting(meeting.id, meeting.template_id);
    } else {
      await admin.from("meetings").update({ status: "ready" }).eq("id", meeting.id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin
      .from("meetings")
      .update({ status: "failed", error: msg })
      .eq("id", meeting.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Recall sometimes verifies the endpoint with a GET.
export function GET() {
  return NextResponse.json({ ok: true });
}
