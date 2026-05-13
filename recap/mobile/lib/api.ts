import type { MeetingSource } from "./types";

type CreateMeetingArgs = {
  webUrl: string;
  accessToken: string;
  title?: string;
  filename: string;
  templateId?: string | null;
  source?: MeetingSource;
};

export async function createMeeting({
  webUrl,
  accessToken,
  title,
  filename,
  templateId,
  source = "mobile_app",
}: CreateMeetingArgs): Promise<{ id: string; audio_path: string }> {
  const res = await fetch(`${webUrl.replace(/\/$/, "")}/api/meetings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      title,
      filename,
      template_id: templateId ?? null,
      source,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create meeting");
  return json;
}

export async function startTranscription(
  webUrl: string,
  accessToken: string,
  meetingId: string,
): Promise<void> {
  const res = await fetch(
    `${webUrl.replace(/\/$/, "")}/api/meetings/${meetingId}/transcribe`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || "Failed to start transcription");
  }
}
