# Sleeper League Analysis

A static web app that pulls everything we can from the public [Sleeper API](https://docs.sleeper.com/) to give fantasy football players stats, standings, and a full **trade history** for any league they're in.

Inspired by [myfantasyanalyzer.com](https://myfantasyanalyzer.com/), with trade tracking as a first-class feature.

## What it does today (base build)

- **Sign in by Sleeper username** — no password, no signup. Sleeper data is public.
- **League picker** — every league the user is in for a given season.
- **Overview tab** — standings table with W/L, points for/against, max points, and lineup efficiency. Top scorer, lowest scorer, most efficient lineup.
- **Trades tab** — every completed trade in the league, with player names, draft picks, and FAAB exchanged. Counters for total trades, most active trader, and latest trade.
- **Matchups tab** — biggest blowouts, closest finishes, highest combined scores, and a week-by-week scoreboard.
- **Rosters tab** — every team's full roster grouped by starters / bench / IR / taxi.

## Stack

- Plain HTML + ES module JS + CSS. No build step.
- Calls the Sleeper API directly from the browser.
- Caches the NFL players JSON (~5 MB) in `localStorage` for 24 hours so it only downloads once per day.

## Run locally

```bash
cd sleeperleague
python3 -m http.server 5500
# then open http://localhost:5500
```

(Any static file server works — `npx serve`, etc.)

## Deploy

Configured for Vercel as a static site (see `vercel.json`). Set the project root to `sleeperleague/` and deploy.

## Roadmap

The base is intentionally small and obvious so we can layer features on top. Likely next:

- **Trade analyzer** — value of each side using FantasyPros / KTC values, "winner" call, points scored by traded players after the trade.
- **Power rankings** — rolling rankings combining record, PF, all-play record, and Pythagorean wins.
- **Player performance** — best / worst weekly performances by position, trade asset value over time.
- **Head-to-head history** — rivalry pages between any two teams.
- **Draft review** — pick-by-pick draft grades using player season totals.
- **Multi-season** — pull dynasty league history across years.
- **Saved leagues** — bookmark and resume without re-entering username.

## Notes

- Not affiliated with Sleeper.
- The Sleeper API has no auth and is rate-limited at ~1000 calls/minute per IP, which is more than enough for this use case.
