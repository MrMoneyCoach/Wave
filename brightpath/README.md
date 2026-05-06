# BrightPath

A Khan-Academy-style daily-learning app with Duolingo-style gamification, designed
to be friendly to autistic kids. Pure static HTML / CSS / JS — no build step.

## What's inside

- **Courses**: Letters · Numbers · Feelings · My Day (life skills)
- **Path UI**: Duolingo-style winding skill tree with circular lesson nodes and crowns
- **Exercise types**: multiple-choice, tap-to-match, count-the-objects, true/false,
  put-in-order (sequence), and "say it out loud" practice
- **Gamification**: XP, hearts (refill over time), daily goal ring, streak counter,
  weekly XP, sticker collection
- **Autism-friendly options**: calm mode (softer palette, no animations), bigger text,
  reduced confetti, optional sound

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
npx serve brightpath
```

State is saved in `localStorage` under `brightpath:v1`. Open the Profile tab and
tap "Restart progress" to clear it.

## Deploying

This folder ships static. Drop it onto Vercel — `vercel.json` enables
clean URLs. No build command needed.

## Adding content

Edit `data.js`. Each course has units; each unit has lessons; each lesson is
a list of exercises. Letters and numbers are generated programmatically;
the Feelings and My Day courses are hand-authored.

Exercise shapes:

```js
{ type: 'choice',    prompt, options: [{label, emoji?, correct?}] }
{ type: 'count',     prompt, emoji, answer, options: [n,...] }
{ type: 'match',     prompt, pairs: [{left, right}] }
{ type: 'sequence',  prompt, items: ['step 1', 'step 2', ...] }
{ type: 'truefalse', prompt, answer: boolean }
{ type: 'sayit',     prompt, target }
```

## Design notes (autism considerations)

- One question per screen, no time pressure.
- Large tap targets (≥56px) and high-contrast Duolingo palette.
- Predictable lesson structure: prompt → options → feedback bar → continue.
- Sequence exercises mirror visual schedules used at school/home.
- "Say it" exercises encourage speech without requiring mic permissions.
- Calm mode strips animations and softens the palette for sensitive users.
