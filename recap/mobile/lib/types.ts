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

export type MeetingRow = {
  id: string;
  title: string;
  status: MeetingStatus;
  source: MeetingSource;
  duration_seconds: number | null;
  created_at: string;
  error: string | null;
};

export type Template = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_premium: boolean;
};

export type RecapConfig = {
  webUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};
