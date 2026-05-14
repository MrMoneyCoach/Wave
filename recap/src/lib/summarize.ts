import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Segment, Template, TemplateSection } from "@/lib/types";

const MODEL = "claude-haiku-4-5-20251001";

function formatTranscript(segments: Pick<Segment, "speaker" | "text" | "start_seconds">[]) {
  return segments
    .map((s) => {
      const m = Math.floor(s.start_seconds / 60);
      const sec = Math.floor(s.start_seconds % 60)
        .toString()
        .padStart(2, "0");
      return `[${m}:${sec}] Speaker ${s.speaker}: ${s.text}`;
    })
    .join("\n");
}

export async function summarizeMeeting(meetingId: string, templateId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const admin = supabaseAdmin();

  const [{ data: meeting }, { data: template }, { data: segments }] = await Promise.all([
    admin.from("meetings").select("*").eq("id", meetingId).single(),
    admin.from("templates").select("*").eq("id", templateId).single(),
    admin
      .from("segments")
      .select("speaker, start_seconds, text")
      .eq("meeting_id", meetingId)
      .order("start_seconds", { ascending: true }),
  ]);

  if (!meeting) throw new Error("Meeting not found");
  if (!template) throw new Error("Template not found");

  const t = template as Template;
  const transcript = formatTranscript((segments ?? []) as Segment[]);
  if (!transcript) throw new Error("No transcript to summarize");

  await admin
    .from("meetings")
    .update({ status: "summarizing", template_id: templateId })
    .eq("id", meetingId);

  const sectionKeys = t.sections.map((s: TemplateSection) => s.key);
  const sectionDescriptions = t.sections
    .map((s: TemplateSection) => `- "${s.key}": ${s.label}`)
    .join("\n");

  const system = [
    "You summarise meeting transcripts.",
    "Stay strictly faithful to what speakers actually said — never invent decisions, action items or attendees.",
    "Output one JSON object with the exact keys listed below. Each value is Markdown.",
    "Use short bullet lists where appropriate. Do not include the section labels inside the values — only the content.",
    "If a section has nothing to report based on the transcript, set its value to the single word: None.",
    "",
    "Sections:",
    sectionDescriptions,
    "",
    `Template-specific instructions: ${t.prompt}`,
  ].join("\n");

  const user = [
    `Meeting title: ${meeting.title}`,
    `Language: ${meeting.language ?? "en"}`,
    "",
    "Transcript (with speaker labels and minute:second timestamps):",
    transcript,
  ].join("\n");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system,
    messages: [
      {
        role: "user",
        content: `${user}\n\nReturn ONLY a JSON object with keys: ${sectionKeys
          .map((k) => `"${k}"`)
          .join(", ")}.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";
  const json = extractJsonObject(raw);
  if (!json) throw new Error("Model did not return JSON");

  const summary: Record<string, string> = {};
  for (const key of sectionKeys) {
    const value = json[key];
    summary[key] = typeof value === "string" ? value : "None";
  }

  await admin
    .from("meetings")
    .update({ summary, status: "ready", error: null })
    .eq("id", meetingId);

  return summary;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = (fenceMatch ? fenceMatch[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
