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
| 5 | ✅ Done | **Meeting bot** via [Recall.ai](https://recall.ai) — dispatches a bot to Zoom/Meet/Teams calls, recording is downloaded and pushed through the same pipeline |
| 6 | ✅ Done | **Pro plan**: custom templates and Stripe-powered billing (checkout + customer portal + webhook keeps `profiles.plan` in sync) |
| 7 | ✅ Done | **Sharing, comments & integrations**: public share links, per-teammate sharing by email, comment threads, one-click export to Slack & Notion |

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

## Sharing, comments & integrations (Phase 7)

- **Public links** — toggle a meeting public from its Share panel; it becomes readable at `/share/<token>` with no sign-in. The page uses the service-role client and gates purely on the unguessable token (`robots: noindex`). Disable to revoke instantly.
- **Per-teammate sharing** — add a teammate by email; when they sign in with that email the meeting shows up in their own dashboard. Enforced by RLS policies (`meetings: shared read`, `segments: shared read`) matching `auth.jwt() ->> 'email'` against the `meeting_shares` table. Non-owners get a read-only view — no template switching, speaker renaming, or sharing controls.
- **Comments** — threaded comments on each meeting, visible to everyone with access (owner + shared teammates). RLS lets any viewer insert and only the author delete.
- **Slack export** — paste an Incoming Webhook URL in Settings; "Post to Slack" on any meeting sends the templated summary to that channel.
- **Notion export** — paste an internal-integration token + a parent page ID in Settings; "Export to Notion" creates a child page with the summary as headings + bullet blocks.

All integration credentials live on the user's `profiles` row (readable only by them via RLS) — no extra env vars, no OAuth apps to maintain.

## Billing setup (Stripe)

1. Create a Stripe account at https://stripe.com and grab the secret key.
2. Create a **Product** in Stripe with a **recurring price** (monthly/annual, whatever you want). Copy the price ID (`price_…`).
3. In Stripe → Developers → Webhooks, add an endpoint pointing at `https://<your-recap-domain>/api/billing/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Reveal the signing secret (`whsec_…`).
4. Configure the **Customer portal** in Stripe (Settings → Billing → Customer portal) so users can cancel/update payment methods themselves.
5. Set the env vars:
   - `STRIPE_SECRET_KEY=sk_test_…` (or `sk_live_…`)
   - `STRIPE_PRICE_ID=price_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
6. For local testing use `stripe listen --forward-to localhost:3000/api/billing/webhook` (Stripe CLI) — it overrides the signing secret with a CLI-issued one, which you paste into your `.env.local`.

If those env vars are missing, the Billing page still loads but the Upgrade button errors helpfully. The custom-template editor is gated server-side (`/api/templates` returns 402 if the user isn't on Pro), so users can't bypass billing by hitting the API directly.

## Meeting bot setup (Recall.ai)

The Bot tab dispatches a Recall.ai bot to a Zoom / Google Meet / Microsoft Teams URL. Recall records the call; once it finishes, a webhook pings us, we download the recording to Supabase Storage, then run the existing Deepgram + Claude pipeline.

To enable it:

1. Sign up at https://recall.ai and create a workspace.
2. Set `RECALL_API_KEY` in your env (and optionally `RECALL_BASE_URL` if you need a non-US region).
3. In Recall's dashboard, add a **webhook endpoint** pointing at `https://<your-recap-domain>/api/recall/webhook`. Subscribe to `bot.status_change`. Recall will show you a signing secret prefixed with `whsec_…` — paste it into `RECALL_WEBHOOK_SECRET`.
4. For local development, expose the webhook with a tunnel (e.g. `ngrok http 3000`) and point the endpoint at `https://<ngrok-id>.ngrok.app/api/recall/webhook`.

If `RECALL_API_KEY` is missing, the Bot tab still renders but `POST /api/bots` returns a clear error. If `RECALL_WEBHOOK_SECRET` is missing, signature verification is skipped — fine for local dev, not safe for production. The webhook handler is idempotent: if Recall replays it, already-processed meetings are skipped.

The webhook function downloads the recording and runs transcription inline (`maxDuration = 300`s on Vercel), so meetings up to ~90 minutes fit comfortably. For longer recordings, move the body into a queue worker (e.g. Inngest, Trigger.dev, or a Supabase Edge Function).

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
