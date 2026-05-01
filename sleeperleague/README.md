# Sleeper League Analysis

A static, browser-only fantasy football league dashboard built on the public [Sleeper API](https://docs.sleeper.com/) and [FantasyCalc](https://fantasycalc.com/) dynasty values. Inspired by [myfantasyanalyzer.com](https://myfantasyanalyzer.com/), with a sidebar layout instead of top tabs.

No signup, no password. All Sleeper data is public, and this app calls the API directly from your browser.

## Features

**League**
- **Overview** — at-a-glance leader, top scorer, average PPG, most efficient team, recent matchups, recent trades.
- **Standings** — full table with W/L, PF, PA, PPG, max PF (best-possible-lineup points), efficiency %, all-play record, expected wins, and luck rating.
- **Power rankings** — composite score = 50% all-play % + 30% scoring percentile + 20% last-4-week scoring percentile, with a bar chart.
- **Luck & all-play** — luck = actual wins minus expected wins (computed from how each team's score ranked each week); full all-play table.
- **Schedule strength** — average opponent PPG faced, plus a "schedule swap" matrix that shows what each team's record would have been with another team's schedule.

**Weeks**
- **Matchups** — biggest blowouts, closest finishes, highest combined scores, week-by-week scoreboard.
- **Players** — top 25 league-wide scorers, top 5 per position (QB/RB/WR/TE/K/DEF), best single-week performances.
- **Awards** — 15 season trophies including league leader, highest scorer, lowest scorer, luckiest, unluckiest, most consistent, most volatile, best/worst lineup setter, biggest blowout, closest game, MVP, all-play champion.

**Trades & rosters**
- **Trade grader** — every completed trade graded on dynasty value of received assets and realized fantasy points scored after the trade. Winner declared per deal.
- **Trade partners** — leaderboard of who wins / loses trades; pair list of who trades with who and which side has the edge.
- **Rosters** — every team's full roster with starters / bench / IR / taxi groupings, sorted by dynasty value.
- **Drafts** — pick-by-pick board, best value picks, biggest reaches (using current dynasty values).

**Special**
- **Head-to-head** — pick any two teams; see series record, total points, and full matchup history.
- **League history** — auto-walks `previous_league_id` to discover every prior season; champions, top scorer, regular-season #1 by season.

## Stack

- Plain HTML + CSS + ES modules. No build step.
- Sleeper API for league/roster/matchup/transaction/draft data.
- FantasyCalc public API for current dynasty values (cached 12h in `localStorage`).
- Sleeper player DB (~5 MB) cached 24h in `localStorage`.

## File layout

```
sleeperleague/
├── index.html              UI shell + login + league picker + dashboard chrome
├── styles.css              All styles
├── app.js                  Entry point: login, league pick, dashboard mount
├── icon.svg
├── vercel.json
└── src/
    ├── api.js              Sleeper + FantasyCalc clients (with caching)
    ├── state.js            App state + session persistence
    ├── helpers.js          DOM, formatting, team/player labels
    ├── data.js             Lazy ensure-loaded helpers (players, values, matchups, ...)
    ├── analytics.js        Pure functions: standings, all-play, expected wins, schedule, power, ...
    ├── router.js           Tab dispatch
    └── tabs/
        ├── overview.js
        ├── standings.js
        ├── power.js
        ├── luck.js
        ├── schedule.js
        ├── matchups.js
        ├── players.js
        ├── awards.js
        ├── trades.js       Headline trade grader
        ├── partners.js
        ├── rosters.js
        ├── drafts.js
        ├── h2h.js
        └── history.js
```

## Run locally

```bash
cd sleeperleague
python3 -m http.server 5500
# open http://localhost:5500
```

ES modules require a server (file://  won't work).

## Deploy

Configured for Vercel as a static site (see `vercel.json`).

## Notes & caveats

- Trade grader uses **current** dynasty values as a proxy for "value at time of trade." Sleeper doesn't expose historical values and FantasyCalc only serves current values via its free API. Realized fantasy points (the second pillar) are computed exactly: sum of points scored by each received player from the week after the trade through the present.
- Multi-season history relies on the commissioner having linked each season in Sleeper via `previous_league_id`. If that wasn't done, this app can only see the current season.
- Not affiliated with Sleeper, FantasyCalc, or myfantasyanalyzer.com.
