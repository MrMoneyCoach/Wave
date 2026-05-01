// Lazy data loaders. Each tab calls these as needed; caches per league/season.

import { sleeper, fantasyCalc } from './api.js';
import { state } from './state.js';

export function ensurePlayers() {
  if (state.players) return Promise.resolve(state.players);
  if (!state.playersPromise) {
    state.playersPromise = sleeper.players()
      .then(p => { state.players = p; return p; })
      .catch(err => { state.playersPromise = null; throw err; });
  }
  return state.playersPromise;
}

export function ensureValues(leagueOpts = {}) {
  if (state.values) return Promise.resolve(state.values);
  if (!state.valuesPromise) {
    const lg = state.league || {};
    const isDynasty = lg.settings?.type === 2 || /dynasty|keeper/i.test(lg.name || '');
    const numTeams = lg.total_rosters || 12;
    const ppr = lg.scoring_settings?.rec === 1 ? 1 : lg.scoring_settings?.rec === 0.5 ? 0.5 : 0;
    const numQbs = (lg.roster_positions || []).filter(p => p === 'QB' || p === 'SUPER_FLEX').length || 1;
    state.valuesPromise = fantasyCalc.values({ isDynasty, numQbs, numTeams, ppr, ...leagueOpts })
      .then(v => { state.values = fantasyCalc.buildLookup(v); return state.values; })
      .catch(err => { state.valuesPromise = null; state.values = new Map(); return state.values; });
  }
  return state.valuesPromise;
}

export async function ensureMatchups(maxWeek) {
  const weeks = [];
  for (let w = 1; w <= maxWeek; w++) {
    if (!(w in state.matchupsByWeek)) weeks.push(w);
  }
  if (!weeks.length) return;
  await Promise.all(weeks.map(async w => {
    state.matchupsByWeek[w] = await sleeper.matchups(state.league.league_id, w);
  }));
}

export async function ensureTransactions() {
  const lg = state.league;
  const seasonComplete = lg.status === 'complete';
  const playoffEnd = (lg.settings?.playoff_week_start || 15) + 3;
  const currentSeason = String(state.nflState?.season) === String(lg.season);
  const lastWeek = seasonComplete
    ? playoffEnd
    : currentSeason
      ? Math.min(playoffEnd, (state.nflState?.week || 1))
      : playoffEnd;
  const weeks = [];
  for (let w = 1; w <= lastWeek; w++) {
    if (!(w in state.transactionsByWeek)) weeks.push(w);
  }
  if (!weeks.length) return;
  await Promise.all(weeks.map(async w => {
    state.transactionsByWeek[w] = await sleeper.transactions(state.league.league_id, w);
  }));
}

export async function ensureDrafts() {
  if (state.drafts.length) return state.drafts;
  state.drafts = await sleeper.leagueDrafts(state.league.league_id);
  return state.drafts;
}

export async function ensureDraftPicks(draftId) {
  if (state.draftPicks[draftId]) return state.draftPicks[draftId];
  const picks = await sleeper.draftPicks(draftId);
  state.draftPicks[draftId] = picks;
  return picks;
}

// Walk league.previous_league_id back through history.
// Returns array of {league, users, rosters, brackets} for past seasons (most recent first).
export async function ensureHistory() {
  if (state.history) return state.history;
  if (state.historyPromise) return state.historyPromise;

  state.historyPromise = (async () => {
    const past = [];
    let prevId = state.league?.previous_league_id;
    let safety = 25; // sane stop in case of cycles
    while (prevId && prevId !== '0' && safety-- > 0) {
      try {
        const [lg, users, rosters, winnersBracket] = await Promise.all([
          sleeper.league(prevId),
          sleeper.leagueUsers(prevId),
          sleeper.rosters(prevId),
          sleeper.winnersBracket(prevId),
        ]);
        past.push({ league: lg, users, rosters, winnersBracket });
        prevId = lg?.previous_league_id;
      } catch {
        break;
      }
    }
    state.history = past;
    return past;
  })();
  return state.historyPromise;
}
