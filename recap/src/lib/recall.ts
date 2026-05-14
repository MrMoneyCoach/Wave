import crypto from "node:crypto";

// Recall.ai REST client (https://docs.recall.ai/)
// ----------------------------------------------------------------------------
// Recall sends a single bot to a Zoom / Google Meet / Microsoft Teams meeting
// URL, records the call as a mixed audio+video MP4, and posts webhooks on
// status changes. We wire those webhooks to /api/recall/webhook below.
//
// All keys/secrets are server-only. Surface area is intentionally tiny.

const DEFAULT_BASE_URL = "https://us-east-1.recall.ai";

function baseUrl(): string {
  return process.env.RECALL_BASE_URL || DEFAULT_BASE_URL;
}

function apiKey(): string {
  const key = process.env.RECALL_API_KEY;
  if (!key) throw new Error("RECALL_API_KEY is not configured");
  return key;
}

type CreateBotInput = {
  meetingUrl: string;
  botName?: string;
  /** Optional per-bot webhook URL — usually set globally in the dashboard. */
  webhookUrl?: string;
};

export type RecallBot = {
  id: string;
  meeting_url: { meeting_id?: string; platform?: string; meeting_url?: string };
  status_changes?: Array<{ code: string; created_at: string }>;
  recordings?: Array<RecallRecording>;
};

export type RecallRecording = {
  id: string;
  media_shortcuts?: {
    video_mixed?: { data?: { download_url?: string } };
    audio_mixed?: { data?: { download_url?: string } };
  };
};

async function recallFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${apiKey()}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Recall ${res.status}: ${text.slice(0, 400)}`);
  }
  return (text ? JSON.parse(text) : ({} as T)) as T;
}

export async function createBot({
  meetingUrl,
  botName = "Recap",
  webhookUrl,
}: CreateBotInput): Promise<RecallBot> {
  return await recallFetch<RecallBot>("/api/v1/bot/", {
    method: "POST",
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: botName,
      // Ask Recall to produce a mixed video+audio MP4 recording. The audio
      // track inside the MP4 is what we'll hand to Deepgram.
      recording_config: {
        video_mixed_mp4: {},
      },
      ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
    }),
  });
}

export async function getBot(botId: string): Promise<RecallBot> {
  return await recallFetch<RecallBot>(`/api/v1/bot/${botId}/`);
}

export async function leaveCall(botId: string): Promise<void> {
  // The bot leaves the call immediately; the recording is still produced and
  // a "done" webhook fires once it's finalised.
  await recallFetch<unknown>(`/api/v1/bot/${botId}/leave_call/`, { method: "POST" });
}

/**
 * Pick the best download URL Recall has produced for a finished bot.
 * Prefers `audio_mixed` (smaller) over `video_mixed_mp4`.
 */
export function pickRecordingUrl(bot: RecallBot): string | null {
  const r = bot.recordings?.[0];
  if (!r?.media_shortcuts) return null;
  return (
    r.media_shortcuts.audio_mixed?.data?.download_url ??
    r.media_shortcuts.video_mixed?.data?.download_url ??
    null
  );
}

/**
 * Verify a Recall webhook signed by Svix. Header conventions:
 *   svix-id: msg_xxx
 *   svix-timestamp: 1700000000
 *   svix-signature: "v1,base64sig v1,base64sig ..."
 *
 * The secret is a base64 string prefixed with `whsec_`.
 *
 * We implement HMAC-SHA256 verification directly rather than pulling in the
 * `svix` SDK — this keeps the dependency surface small.
 */
export function verifyRecallWebhook(opts: {
  body: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  secret?: string;
  toleranceSeconds?: number;
}): boolean {
  const secret = opts.secret ?? process.env.RECALL_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = opts.svixId;
  const timestamp = opts.svixTimestamp;
  const signatureHeader = opts.svixSignature;
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  const tolerance = opts.toleranceSeconds ?? 60 * 5;
  if (Math.abs(now - ts) > tolerance) return false;

  const rawSecret = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let keyBytes: Buffer;
  try {
    keyBytes = Buffer.from(rawSecret, "base64");
  } catch {
    return false;
  }

  const signedPayload = `${id}.${timestamp}.${opts.body}`;
  const expected = crypto.createHmac("sha256", keyBytes).update(signedPayload).digest("base64");

  const provided = signatureHeader
    .split(" ")
    .map((part) => part.trim())
    .filter((p) => p.startsWith("v1,"))
    .map((p) => p.slice("v1,".length));

  return provided.some((sig) => safeEqual(sig, expected));
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
