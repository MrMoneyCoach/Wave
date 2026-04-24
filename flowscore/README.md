# Flowscore

A quiz funnel & lead scoring platform — a scoreapp.com-style scorecard builder.

Build branded scorecard quizzes, score every respondent, deliver a personalised result, and capture qualified leads.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **Prisma** + **PostgreSQL** (Neon / Supabase / Vercel Postgres)
- **bcryptjs** + HMAC-signed cookie session (no external auth service)
- **SheetJS (xlsx)** for Excel uploads

## Features (v1)

- Marketing landing page
- Email/password signup and login
- Dashboard with quizzes list
- Quiz builder
  - Title, intro, CTA label
  - Single choice / multiple choice / scale (0–10) questions
  - Per-answer scoring
  - Outcome bands (min–max percentage, title, description)
  - **Upload questions from an Excel spreadsheet**
  - Publish / unpublish
- Public quiz player at `/q/<slug>`
  - Question-by-question flow with progress bar
  - Optional email capture before results
  - Personalised results page with score dial and outcome
- Leads table + CSV export (answers included)
- Analytics (submissions over 30 days, average score, email-capture rate, outcome distribution)

## Excel upload format

Create a workbook with a **Questions** sheet (one row per option):

| Question                          | Type   | Option                | Score | Required |
| --------------------------------- | ------ | --------------------- | ----- | -------- |
| Are you tracking KPIs weekly?     | single | Yes, every week       | 10    | yes      |
| Are you tracking KPIs weekly?     | single | Roughly monthly       | 5     | yes      |
| Are you tracking KPIs weekly?     | single | Not really            | 0     | yes      |
| Which processes are automated?    | multi  | Email marketing       | 3     | no       |
| Which processes are automated?    | multi  | Invoicing             | 3     | no       |

Rows that share the same question text are grouped into one question. Column names are matched loosely (case-insensitive, punctuation ignored).

Valid `Type` values:
- `single` — one answer per question
- `multi` — pick any that apply
- `scale` — respondents pick 0–10 (no options needed)

Optionally add an **Outcomes** sheet:

| Min Score | Max Score | Title          | Description                     |
| --------- | --------- | -------------- | ------------------------------- |
| 0         | 33        | Early days     | Lots of headroom…               |
| 34        | 66        | On your way    | You've started — focus next on… |
| 67        | 100       | Ready to scale | You're in strong shape…         |

## Getting started (local)

```bash
cd flowscore
cp .env.example .env
# Edit .env:
#   DATABASE_URL   — a Postgres connection string (Neon free tier is quickest)
#   SESSION_SECRET — openssl rand -hex 32

npm install
npx prisma db push          # creates tables in your Postgres
npm run db:seed             # optional demo data: demo@flowscore.local / password123
npm run dev
```

Open http://localhost:3000.

## Project layout

```
flowscore/
├── prisma/
│   ├── schema.prisma        # User, Quiz, Question, AnswerOption, Outcome, Submission
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── page.tsx                        # marketing landing
│   │   ├── login/, signup/                 # auth pages
│   │   ├── dashboard/                      # owner dashboard
│   │   │   ├── page.tsx                    # quizzes list
│   │   │   └── quizzes/
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/
│   │   │           ├── edit/page.tsx       # builder
│   │   │           ├── leads/page.tsx      # leads table
│   │   │           └── analytics/page.tsx
│   │   ├── q/[slug]/                       # public quiz player
│   │   │   ├── page.tsx
│   │   │   └── result/[submissionId]/page.tsx
│   │   └── api/
│   │       ├── auth/{signup,login,logout}/route.ts
│   │       ├── quizzes/route.ts            # POST (create)
│   │       ├── quizzes/[id]/route.ts       # GET/PUT/DELETE
│   │       ├── quizzes/[id]/upload/route.ts         # Excel upload
│   │       ├── quizzes/[id]/leads-export/route.ts   # CSV export
│   │       └── q/[slug]/submit/route.ts    # public submission
│   ├── components/
│   │   ├── QuizEditor.tsx
│   │   ├── QuizPlayer.tsx
│   │   └── LogoutButton.tsx
│   └── lib/
│       ├── prisma.ts
│       ├── session.ts          # HMAC-signed cookie, no NextAuth
│       ├── slug.ts
│       ├── scoring.ts          # percentage scoring across question types
│       └── excel.ts            # SheetJS-based workbook parser
└── tailwind.config.ts
```

## Scoring model

- **single** — score of the chosen option; max is the highest-scored option
- **multi** — sum of chosen options; max is either the highest option or the sum of all positive options (whichever is larger)
- **scale** — raw 0–10 value; max 10

Percent = `score / maxScore * 100`. Outcome bands are matched against the percent.

## Deploying to Vercel

1. Create a free Postgres database (Neon is one click from the Vercel marketplace).
2. In Vercel → your project → **Settings → Environment Variables**, set:
   - `DATABASE_URL` — the **pooled** Postgres connection string
   - `SESSION_SECRET` — long random string (`openssl rand -hex 32`)
3. Set **Root Directory** to `flowscore` (Settings → General).
4. Redeploy. The build runs `prisma db push` automatically, so tables are created on the first deploy.

For production at scale, replace `prisma db push` in `package.json` with proper migrations (`prisma migrate dev` locally to create them, `prisma migrate deploy` in the build).

## Explicitly deferred

Not in v1 — open to adding next:
- Drag-and-drop builder UX
- Per-quiz branding / themes
- Stripe billing + plan enforcement
- Mailchimp / HubSpot / Zapier integrations
- A/B testing
- Multi-user teams
- AI-generated quizzes (scorecard from a URL or topic)
- Custom domains
