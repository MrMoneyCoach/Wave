import type { Comment, Meeting, MeetingShare, Segment, Template } from "@/lib/types";

// Hardcoded data for the /preview tour. Nothing here touches the backend —
// this lets the whole UI be clicked through on a Vercel deploy with zero env
// vars configured.

export const DEMO_TEMPLATES: Template[] = [
  {
    id: "tpl-general",
    owner_id: null,
    slug: "general",
    name: "General meeting",
    description: "Balanced summary, decisions and action items — works for almost any call.",
    sections: [
      { key: "overview", label: "Overview" },
      { key: "decisions", label: "Decisions" },
      { key: "actions", label: "Action items" },
      { key: "questions", label: "Open questions" },
    ],
    prompt: "Write a balanced summary of the meeting…",
    is_premium: false,
  },
  {
    id: "tpl-sales",
    owner_id: null,
    slug: "sales-call",
    name: "Sales call",
    description: "BANT-style write-up for a discovery or qualification call.",
    sections: [
      { key: "prospect", label: "Prospect & company" },
      { key: "pain", label: "Pain points" },
      { key: "budget", label: "Budget & authority" },
      { key: "timing", label: "Timing & next step" },
      { key: "objections", label: "Objections" },
    ],
    prompt: "Treat this as a sales call…",
    is_premium: false,
  },
  {
    id: "tpl-standup",
    owner_id: null,
    slug: "standup",
    name: "Standup",
    description: "Yesterday / today / blockers per person.",
    sections: [
      { key: "updates", label: "Per-person updates" },
      { key: "blockers", label: "Blockers" },
      { key: "asks", label: "Asks for the team" },
    ],
    prompt: "Summarise as a standup…",
    is_premium: false,
  },
  {
    id: "tpl-1on1",
    owner_id: null,
    slug: "one-on-one",
    name: "1:1",
    description: "Manager / report check-in: themes, growth, follow-ups.",
    sections: [
      { key: "themes", label: "Themes" },
      { key: "growth", label: "Growth & feedback" },
      { key: "followups", label: "Follow-ups" },
    ],
    prompt: "This is a 1:1…",
    is_premium: false,
  },
  {
    id: "tpl-interview",
    owner_id: null,
    slug: "interview",
    name: "Interview",
    description: "Candidate evaluation: signals, concerns, recommendation.",
    sections: [
      { key: "role", label: "Role & candidate" },
      { key: "signals", label: "Positive signals" },
      { key: "concerns", label: "Concerns" },
      { key: "recommendation", label: "Recommendation" },
    ],
    prompt: "Treat this as a hiring interview…",
    is_premium: false,
  },
  {
    id: "tpl-discovery",
    owner_id: null,
    slug: "customer-discovery",
    name: "Customer discovery",
    description: "Jobs-to-be-done style notes from a research interview.",
    sections: [
      { key: "job", label: "Job-to-be-done" },
      { key: "pain", label: "Pain points & frustrations" },
      { key: "quotes", label: "Memorable quotes" },
    ],
    prompt: "You are taking notes for a customer discovery interview…",
    is_premium: false,
  },
  {
    id: "tpl-board",
    owner_id: null,
    slug: "board",
    name: "Board meeting",
    description: "Minutes-style: attendance, motions, decisions, follow-ups.",
    sections: [
      { key: "attendance", label: "Attendance" },
      { key: "matters", label: "Matters discussed" },
      { key: "decisions", label: "Resolutions & decisions" },
      { key: "followups", label: "Follow-ups" },
    ],
    prompt: "Produce minutes in a formal register…",
    is_premium: false,
  },
  {
    id: "tpl-retro",
    owner_id: null,
    slug: "retro",
    name: "Retro",
    description: "What went well / what didn't / experiments to try.",
    sections: [
      { key: "went-well", label: "Went well" },
      { key: "didnt", label: "Didn't go well" },
      { key: "experiments", label: "Experiments to try" },
    ],
    prompt: "Summarise as a retrospective…",
    is_premium: false,
  },
  // One example custom (Pro) template, owned by the demo user.
  {
    id: "tpl-custom-qbr",
    owner_id: "demo-user",
    slug: "acme-qbr",
    name: "Acme QBR",
    description: "Our quarterly business review format — health, expansion, risks.",
    sections: [
      { key: "health", label: "Account health" },
      { key: "wins", label: "Wins this quarter" },
      { key: "expansion", label: "Expansion opportunities" },
      { key: "risks", label: "Churn risks" },
      { key: "next", label: "Next quarter plan" },
    ],
    prompt: "Treat this as a quarterly business review with a customer…",
    is_premium: false,
  },
];

export const DEMO_SUMMARY: Record<string, string> = {
  prospect:
    "Northwind Traders — mid-market logistics company, ~400 employees. Spoke with **Priya Anand** (VP Operations) and **Tom Becker** (Ops Analyst).",
  pain:
    "- Manual handoffs between the warehouse and dispatch teams cause 2-3 hour delays daily.\n" +
    "- No single source of truth for shipment status; Priya's team rebuilds a spreadsheet every morning.\n" +
    "- Tried a competitor last year but rolled it back — \"too rigid, our routes change weekly.\"",
  budget:
    "Priya owns a 2024 tooling budget and confirmed she can approve up to **$30k/yr** without further sign-off. Anything larger needs the COO.",
  timing:
    "Wants a decision before the Q3 peak season. **Next step:** Priya will loop in two warehouse leads for a 45-min demo the week of the 15th — Tom to send availability.",
  objections:
    "- Worried about another rigid rollout — needs to see the route-editing flow specifically.\n" +
    "- Asked about SOC 2; we confirmed Type II is in progress, report expected next month.",
};

export const DEMO_SEGMENTS: Segment[] = [
  { id: 1, meeting_id: "demo", speaker: 0, start_seconds: 4.2, end_seconds: 11.8, text: "Thanks for making the time, Priya. Before we dive in — how are things going on the operations side right now?" },
  { id: 2, meeting_id: "demo", speaker: 1, start_seconds: 12.5, end_seconds: 31.0, text: "Honestly, a bit chaotic. Every morning my team basically rebuilds a spreadsheet of where every shipment is, because the warehouse system and dispatch don't talk to each other. We lose two, three hours a day just on that handoff." },
  { id: 3, meeting_id: "demo", speaker: 0, start_seconds: 31.8, end_seconds: 36.4, text: "That handoff gap comes up a lot. Tom, you're closest to it — what does that actually look like day to day?" },
  { id: 4, meeting_id: "demo", speaker: 2, start_seconds: 37.0, end_seconds: 52.3, text: "Yeah, so dispatch waits on a printed manifest from the floor. If a route changes — which happens basically every week — we're re-keying everything by hand. That's where the delays creep in." },
  { id: 5, meeting_id: "demo", speaker: 1, start_seconds: 53.1, end_seconds: 68.9, text: "We did try Meridian last year, actually. Rolled it back after a quarter. It was too rigid — our routes change constantly and it just couldn't keep up. So I'm a little cautious about another big rollout." },
  { id: 6, meeting_id: "demo", speaker: 0, start_seconds: 69.5, end_seconds: 79.2, text: "That's fair, and it's exactly the thing I'd want to show you — the route editing is drag-and-drop and updates downstream instantly. Can we get your warehouse leads in for a proper demo?" },
  { id: 7, meeting_id: "demo", speaker: 1, start_seconds: 80.0, end_seconds: 94.6, text: "Yes — let's do it before peak season hits in Q3. I can pull in two of the warehouse leads. Budget-wise I've got room up to about thirty thousand a year without going to the COO, so we're in the right range." },
  { id: 8, meeting_id: "demo", speaker: 2, start_seconds: 95.3, end_seconds: 101.1, text: "One thing — do you have a SOC 2 report? Our security team will ask before we get too far." },
  { id: 9, meeting_id: "demo", speaker: 0, start_seconds: 101.8, end_seconds: 110.4, text: "Type II is in progress, we expect the report next month. I'll send what we can share now. Tom, want to send me your availability for the week of the 15th?" },
  { id: 10, meeting_id: "demo", speaker: 2, start_seconds: 111.0, end_seconds: 114.7, text: "Will do — I'll get that over to you this afternoon." },
];

export const DEMO_COMMENTS: Comment[] = [
  {
    id: "c1",
    meeting_id: "demo",
    author_id: "demo-user",
    author_email: "you@yourcompany.com",
    body: "Strong call. The Meridian rollback is our opening — let's lead the demo with route editing.",
    created_at: "2026-05-12T16:40:00.000Z",
  },
  {
    id: "c2",
    meeting_id: "demo",
    author_id: "teammate",
    author_email: "alex@yourcompany.com",
    body: "I'll prep the SOC 2 one-pager so we're ready when their security team asks.",
    created_at: "2026-05-12T17:05:00.000Z",
  },
];

export const DEMO_SHARES: MeetingShare[] = [
  {
    id: "s1",
    meeting_id: "demo",
    shared_with_email: "alex@yourcompany.com",
    created_at: "2026-05-12T16:30:00.000Z",
  },
];

export const DEMO_MEETING: Meeting = {
  id: "demo",
  owner_id: "demo-user",
  title: "Customer call — Northwind Traders",
  source: "meeting_bot",
  status: "ready",
  audio_path: "demo/northwind.mp4",
  duration_seconds: 1920,
  language: "en",
  template_id: "tpl-sales",
  transcript_text: DEMO_SEGMENTS.map((s) => s.text).join(" "),
  summary: DEMO_SUMMARY,
  error: null,
  recall_bot_id: "bot_demo",
  public_share_token: "demo-share-token",
  created_at: "2026-05-12T16:00:00.000Z",
  updated_at: "2026-05-12T16:34:00.000Z",
};

type MeetingListRow = Pick<
  Meeting,
  "id" | "title" | "status" | "source" | "duration_seconds" | "created_at"
>;

export const DEMO_MEETING_LIST: MeetingListRow[] = [
  {
    id: "demo",
    title: "Customer call — Northwind Traders",
    status: "ready",
    source: "meeting_bot",
    duration_seconds: 1920,
    created_at: "2026-05-12T16:00:00.000Z",
  },
  {
    id: "m2",
    title: "Weekly product standup",
    status: "ready",
    source: "browser_record",
    duration_seconds: 840,
    created_at: "2026-05-12T09:05:00.000Z",
  },
  {
    id: "m3",
    title: "1:1 — Jordan",
    status: "summarizing",
    source: "desktop_app",
    duration_seconds: 1560,
    created_at: "2026-05-11T14:30:00.000Z",
  },
  {
    id: "m4",
    title: "Candidate interview — Senior RN",
    status: "transcribing",
    source: "upload",
    duration_seconds: 2730,
    created_at: "2026-05-11T11:00:00.000Z",
  },
  {
    id: "m5",
    title: "Site visit notes — Riverside clinic",
    status: "ready",
    source: "mobile_app",
    duration_seconds: 600,
    created_at: "2026-05-10T13:20:00.000Z",
  },
  {
    id: "m6",
    title: "Board prep sync",
    status: "failed",
    source: "upload",
    duration_seconds: null,
    created_at: "2026-05-09T18:00:00.000Z",
  },
];

export type { MeetingListRow };
