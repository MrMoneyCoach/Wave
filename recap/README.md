# Recap

Meeting transcripts with speaker labels — and the summary your team will actually read. Recap is a Marloo-style meeting assistant: upload (later record or have a bot join) a meeting, get a clean diarized transcript and a template-driven summary in minutes.

Working name. Feel free to rebrand.

## What's here (Phase 1 — web app foundation)

Everything below is implemented and builds cleanly:

- **Next.js 14 (App Router) + Tailwind** in this folder.
- **Supabase** for Postgres, Auth (magic-link), and Storage. Schema in [`supabase/schema.sql`](supabase/schema.sql) with RLS, per-user storage policies, automatic profile creation, and seeded built-in templates.
- **Deepgram Nova-3** for transcription with built-in speaker diarization (cheaper than AssemblyAI, ~$0.26/hr). Word-level output is grouped into utterances per speaker.
- **Claude Haiku 4.5** for template-driven summaries. The transcript is fed in with speaker labels and timestamps; the model returns JSON keyed by the template's sections.
- **8 built-in templates**: General, Sales call, Standup, 1:1, Interview, Customer discovery, Board meeting, Retro. Custom templates are gated behind `plan = 'pro'` (build that flow in Phase 6).
- **Dashboard**: list of meetings, status pills, and upload flow.
- **Meeting detail page**: live status polling while Deepgram and Claude work, transcript with renamable speaker chips, summary panel with a live template switcher that re-runs summarisation.

## Phase plan

| Phase | Status | Scope |
| --- | --- | --- |
| 1 | ✅ Done | Web app foundation: upload → transcribe → templated summary |
| 2 | ✅ Done | Live recording in the browser at `/dashboard/record` (system audio via `getDisplayMedia`, mic via `getUserMedia`, mixed, uploaded) |
| 3 | ✅ Done | Downloadable **desktop recorder** (Electron) under [`recap/desktop/`](desktop/) — native system audio + mic capture, signs in via Supabase OTP, uploads to this app via Bearer-authed API |
| 4 | ✅ Done | **Mobile app** (Expo / React Native) under [`recap/mobile/`](mobile/) — mic-only recorder for in-person meetings (iOS/Android don't allow third-party system-audio capture) |
| 5 | Next | **Meeting bot** that joins Zoom/Meet/Teams, via Recall.ai |
| 6 | | Premium plan: custom templates, Stripe billing |
| 7 | | Sharing, comments, integrations (Slack/Notion export, Hubspot etc.) |

## Setup

1. Create a Supabase project, copy the URL, anon key, and service-role key.
2. Run the SQL in `supabase/schema.sql` against that project (psql, Supabase SQL editor, or `apply_migration` via MCP).
3. Get a [Deepgram](https://console.deepgram.com/) API key.
4. Get an [Anthropic](https://console.anthropic.com/) API key.
5. Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DEEPGRAM_API_KEY=...
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

6. `npm install && npm run dev`, then visit http://localhost:3000.

## Folder map

```
recap/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # landing
│   │   ├── login/                   # magic-link sign-in
│   │   ├── dashboard/               # protected: meeting list + upload form
│   │   ├── meetings/[id]/           # protected: transcript + summary
│   │   └── api/
│   │       ├── auth/                # callback + signout
│   │       └── meetings/            # CRUD + /transcribe + /summarize
│   ├── components/AppShell.tsx
│   ├── lib/
│   │   ├── supabase/{server,browser}.ts
│   │   ├── deepgram.ts              # Nova-3 + utterance grouping
│   │   ├── summarize.ts             # Claude Haiku 4.5 templated summaries
│   │   ├── format.ts                # speaker chips, timestamps
│   │   └── types.ts
│   └── middleware.ts                # auth gate for /dashboard, /meetings
└── supabase/schema.sql              # canonical schema + RLS + seeds
```

## How auth works (web vs. desktop / mobile)

The web app uses Supabase cookies (magic-link → session in cookies, gated by `src/middleware.ts`). The desktop and (future) mobile apps can't use cookies, so every API route also accepts an `Authorization: Bearer <access_token>` header — see [`src/lib/supabase/auth.ts`](src/lib/supabase/auth.ts). The same routes also emit CORS headers and an `OPTIONS` handler, so cross-origin calls from `file://` (Electron) and from Expo Web work without proxying.

## How transcription works

1. Browser uploads the file directly to Supabase Storage (`recordings` bucket, scoped to the user's folder by RLS).
2. POST `/api/meetings/:id/transcribe` mints a signed URL and hands it to Deepgram Nova-3 (`diarize: true, smart_format: true, detect_language: true`).
3. Word-level output is grouped into one row per speaker turn and inserted into `segments`.
4. If a template was chosen on upload, the route continues straight into summarisation via `summarizeMeeting()`; otherwise the meeting is marked `transcribed` and the user can pick a template later.
5. The meeting detail page polls every 4s until status is `ready` or `failed`.

## How summarisation works

`src/lib/summarize.ts` formats the diarized transcript like `[m:ss] Speaker N: text`, then asks Claude Haiku 4.5 to return a single JSON object whose keys are exactly the template's `sections`. Per-template `prompt` text is appended to the system message, so each template can shape tone, evidence requirements, and structure (e.g. the Sales template enforces BANT, the Interview template enforces evidence-based recommendations).

Re-running summarisation with a different template just calls `POST /api/meetings/:id/summarize` with the new `template_id`. No re-transcription needed.

## Cost rough-cut (per hour of meeting)

- Deepgram Nova-3 batch + diarization: ~$0.26
- Claude Haiku 4.5 summary (~10k input tokens, ~1k output): a few cents

So well under $0.50 per hour of meeting — leaves plenty of room under a $20/mo Pro plan even at heavy usage.
