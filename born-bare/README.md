# Born Bare — wearebornbare.com

Pre-launch marketing site for Born Bare bamboo nappies.
Funding-stage showpiece with waitlist + viral referral mechanic.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** (full brand palette as named tokens)
- **Supabase** (waitlist, contact, referrals — `@supabase/ssr` + `@supabase/supabase-js`)
- **Framer Motion** (restrained scroll motion)
- **Vercel** (deploy target — auto-detect Next.js)

## Local setup

```bash
cd born-bare
npm install
cp .env.example .env.local   # already populated for the dev Supabase project
npm run dev                  # http://localhost:3000
```

## Environment variables

| Var | Purpose | Where to set |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | `.env.local` (dev) + Vercel (prod) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe publishable key | `.env.local` + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for referral increments | Vercel **only** (never in repo) |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for referral links + metadata | Vercel (set to `https://wearebornbare.com`) |

## Project layout

```
born-bare/
├── app/
│   ├── layout.tsx           Root layout, fonts, header, footer
│   ├── globals.css          Tailwind + base type
│   ├── page.tsx             Home
│   ├── our-story/
│   ├── sustainability/
│   ├── the-nappy/
│   ├── kickstarter/         Nine-tier perk teaser (phase 2)
│   ├── faq/
│   ├── contact/
│   ├── privacy/             UK / GDPR
│   ├── terms/
│   ├── not-found.tsx        On-brand 404
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── Header.tsx           Sticky, smooth-scroll nav, mobile drawer
│   ├── Footer.tsx
│   ├── Wordmark.tsx         "born bare" lowercase, +20 tracking
│   ├── Container.tsx        max-w-page (1200px) wrapper
│   ├── Section.tsx          py-section, bg variants
│   ├── Button.tsx           primary / secondary / ghost
│   ├── CookieBanner.tsx     Localstorage-based
│   └── ImagePlaceholder.tsx Named slot for AI/commissioned imagery
├── lib/
│   └── utils.ts             cn() helper
├── brand/
│   └── born-bare-brand-guidelines.pdf
├── tailwind.config.ts       Brand palette + type scale baked in
└── next.config.mjs
```

## Brand tokens

Defined as Tailwind utilities so they apply everywhere consistently.

| Token | Hex | Usage |
|---|---|---|
| `bare` | `#F7F4F0` | Primary background (~80%) |
| `skin` | `#D4C4B5` | Secondary background, dividers (~10%) |
| `earth` | `#3D3632` | Primary text, anchor sections (~8%) |
| `clay` | `#B8917A` | Brand accent (sparingly) |
| `stone` | `#9B9590` | Tertiary text, captions, borders |
| `sage` | `#A8B5A0` | Eco / credential badges only (max ~2%) |

Fonts: `font-serif` = Cormorant Garamond, `font-sans` = DM Sans (both via `next/font/google`).

## Image placeholders

Use `<ImagePlaceholder name="..." prompt="..." />` everywhere imagery is needed.
Each slot describes what the final asset should be so AI generation / a
photographer can produce on-brief work later. Real images drop into
`public/assets/<descriptive-name>.{jpg,png,webp}`.

## Build phases

This repo is being built in five phases. Current state at end of each:

1. ✅ **Foundation** — Next.js shell, brand tokens, type, layout primitives, all routes navigable, 404, sitemap, robots, cookie banner.
2. ⏳ **Home + Coming Soon** — full narrative, three pillars, nine-tier perk grid driven by `perkTiers.ts`.
3. ⏳ **Supabase wiring** — schema, RLS, waitlist endpoint, contact form, server-side helpers.
4. ⏳ **Referral mechanic** — code generation, share UI, milestone progress, `?ref=` persistence.
5. ⏳ **Remaining pages + polish** — content for Our Story / Sustainability / The Nappy / FAQ / Privacy / Terms, structured data, Lighthouse pass.

## Vercel deployment

This sub-app lives at `born-bare/` inside the `MrMoneyCoach/Wave` monorepo.
In the Vercel project settings:

- **Framework preset:** Next.js (auto-detected)
- **Root Directory:** `born-bare`
- **Production Branch:** `claude/alfred-project-bot-zLj9R`
- **Env vars:** add the four above under Settings → Environment Variables
