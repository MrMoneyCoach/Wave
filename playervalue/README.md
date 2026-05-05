# Sleeper Player Value

A static, browser-only fantasy football tool that scores every NFL player on a composite **value** index — combining production, age curves, and opportunity (share of team volume at position) — using the public [Sleeper API](https://docs.sleeper.com/).

## Why

Raw fantasy points only tell you what a player did. This app tells you **who's actually valuable**, factoring in:

- **Production** — fantasy points per game under the scoring format you choose.
- **Opportunity** — what share of their team's positional volume (carries, targets, pass attempts) the player commanded.
- **Age curves** — dynasty-leaning age scoring tuned per position (RBs decline early, QBs hold value longest, etc.).

## Features

- **Log in** with your Sleeper username, pick any of your leagues, or skip and analyze all NFL players.
- **Scoring presets**: League settings (auto from Sleeper), Full PPR, Half PPR, Standard.
- **TE Premium**: 0 / +0.5 / +1.0 / +1.5 added to TE receptions.
- **Superflex** toggle boosts QB composite value.
- **Tunable weights** for Production, Opportunity, and Age.
- **Filters** by position (incl. FLEX), minimum games, league rostership, and search.
- **Sortable table** of every player with FP, PPG, Opp%, Age+, Prod, and Value.

## Run locally

```bash
cd playervalue
python3 -m http.server 5500
# open http://localhost:5500
```

ES modules require a server (`file://` won't work).

## Deploy

Configured for Vercel as a static site (`vercel.json`).

## Stack

- Plain HTML + CSS + ES modules. No build step.
- Sleeper API for users, leagues, rosters, players, and weekly stats.
- Per-week stats are aggregated client-side and cached (24h players, 6h stats) in `localStorage`.

## File layout

```
playervalue/
├── index.html              UI shell
├── styles.css              Dark dashboard
├── app.js                  Login → league pick → table mount
├── vercel.json
└── src/
    ├── api.js              Sleeper client + caching
    ├── scoring.js          Apply scoring settings to stats → fantasy points
    ├── value.js            Age curves, opportunity, composite value
    └── ui.js               Table render & sortable headers
```

## Notes & caveats

- Stats are pulled from Sleeper's per-week endpoints; future weeks return nothing, so in-season totals are partial until the season ends.
- "Opportunity" is computed from realized volume + a fallback boost for depth-chart-1 starters with no recorded volume yet (rookies, returning starters).
- Age curves are heuristic and dynasty-leaning. For redraft, lower the age weight.
- Not affiliated with Sleeper.
