export type Plan = "free" | "pro";

export type MeetingStatus =
  | "uploading"
  | "queued"
  | "transcribing"
  | "transcribed"
  | "summarizing"
  | "ready"
  | "failed";

export type MeetingSource =
  | "upload"
  | "browser_record"
  | "desktop_app"
  | "mobile_app"
  | "meeting_bot";

export type TemplateSection = { key: string; label: string };

export type Template = {
  id: string;
  owner_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  sections: TemplateSection[];
  prompt: string;
  is_premium: boolean;
};

export type Segment = {
  id: number;
  meeting_id: string;
  speaker: number;
  start_seconds: number;
  end_seconds: number;
  text: string;
};

export type Meeting = {
  id: string;
  owner_id: string;
  title: string;
  source: MeetingSource;
  status: MeetingStatus;
  audio_path: string | null;
  duration_seconds: number | null;
  language: string | null;
  template_id: string | null;
  transcript_text: string | null;
  summary: Record<string, string> | null;
  error: string | null;
  recall_bot_id: string | null;
  public_share_token: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingShare = {
  id: string;
  meeting_id: string;
  shared_with_email: string;
  created_at: string;
};

export type Comment = {
  id: string;
  meeting_id: string;
  author_id: string;
  author_email: string;
  body: string;
  created_at: string;
};

export type IntegrationStatus = {
  slack: boolean;
  notion: boolean;
};
