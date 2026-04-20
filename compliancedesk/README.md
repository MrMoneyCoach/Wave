# ComplianceDesk

AI-powered suitability letter generator for UK financial advisers. SaaS web app
with network-aware compliance templates (SJP, Quilter, Openwork, Sesame,
FCA-direct), Stripe subscriptions, Supabase auth, and streaming Claude output.

## Stack

- **Frontend** — React 18, Vite, Tailwind, React Router, `@supabase/supabase-js`, `docx`, `file-saver`
- **Backend** — Node.js / Express (ES modules), Anthropic SDK (`claude-sonnet-4-20250514`), Stripe, Supabase service-role client
- **Database & Auth** — Supabase (Postgres + Auth + RLS)
- **Payments** — Stripe Checkout + Customer Portal + webhook
- **Hosting-ready** — Vercel (client), Railway / Render (server)

```
compliancedesk/
├─ client/                React + Vite frontend
│  └─ src/
│     ├─ pages/           Landing, Login, Signup, Dashboard, Generate, History, LetterView, Settings
│     ├─ components/      Layout, ProtectedRoute, FormSection, LetterPanel
│     ├─ context/         AuthContext
│     └─ lib/             supabase client, api helper, networks
├─ server/                Express API
│  ├─ routes/             generate, stripe, letters, profile
│  ├─ prompts/            sjp, independent, quilter, openwork, sesame
│  ├─ middleware/auth.js  Supabase JWT verification
│  └─ lib/supabase.js
└─ supabase/schema.sql    profiles + letters tables, RLS, auto-profile trigger
```

## Quick start

```bash
# 1. install workspaces
npm install

# 2. set up env
cp .env.example .env
cp .env.example client/.env
# fill in Supabase, Anthropic, Stripe keys

# 3. apply Supabase schema
# Copy supabase/schema.sql into the Supabase SQL editor and run.

# 4. dev
npm run dev          # runs client (5173) and server (4000) in parallel
```

## Environment variables

| Var | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | server | Claude API |
| `SUPABASE_URL` | server | Supabase project URL |
| `SUPABASE_ANON_KEY` | server | (optional) for token-scoped client |
| `SUPABASE_SERVICE_ROLE_KEY` | server | bypasses RLS for trusted writes |
| `STRIPE_SECRET_KEY` | server | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | server | verifies `/api/stripe/webhook` payloads |
| `STRIPE_PRICE_ID` | server | the £99/month recurring price ID |
| `CLIENT_URL` | server | used for Checkout success/cancel + CORS |
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client | Supabase anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | client | (optional, for future Stripe Elements) |
| `VITE_API_URL` | client | API origin (defaults to Vite proxy in dev) |

## Subscription model

- **Free tier** — 3 letters lifetime per user (enforced server-side in `routes/generate.js`)
- **Paid tier** — £99 / month for unlimited letters via Stripe subscription
- Stripe Checkout creates the subscription; webhook updates `profiles.subscription_status`
- `routes/generate.js` blocks generation with `402 / UPGRADE_REQUIRED` once free allowance is exhausted

## Stripe webhook

Mounted at `POST /api/stripe/webhook` with `express.raw()` (registered before `express.json` so the
raw body is preserved for signature verification). Locally, run:

```bash
stripe listen --forward-to localhost:4000/api/stripe/webhook
```

Events handled:

- `checkout.session.completed` — links Stripe customer & subscription to the Supabase user
- `customer.subscription.created | updated | deleted` — keeps `subscription_status` in sync

## Network templates

System prompts live in `server/prompts/`. Each network exports a tuned prompt
that is selected per-user from the `profiles.network` column. SJP and
Independent are fully implemented; Quilter, Openwork, and Sesame ship with a
generic fallback labelled "Coming Soon" in the UI.

## Letter generation flow

1. Adviser fills out form (`/generate`) — client details, financial position, objectives, recommendation, vulnerability, risks
2. Client `POST /api/generate` with the form payload + Supabase JWT
3. Server checks subscription / free-tier counter, picks the system prompt, builds the user prompt
4. Anthropic SDK streams the response — server forwards each delta as an SSE `delta` event
5. On completion, the full letter is saved to `letters` and an SSE `saved` event is emitted with the new id
6. Client renders the letter in real time, then exposes Copy / Download .docx / Regenerate / Edit

## Notes

- All outputs are drafts — advisers must review before sending. The footer
  reminds users of this.
- RLS protects `letters` and `profiles` so the anon key cannot read other
  users' data, even if the client is compromised. The server uses the
  service-role key only inside trusted routes.
