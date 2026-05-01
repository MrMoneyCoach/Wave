// Lazy data loaders. Each tab calls these as needed; caches per league/season.

import { sleeper, valuesApi } from './api.js';
import { state, syncPrimary } from './state.js';

export function ensurePlayers() {
  if (state.players) return Promise.resolve(state.players);
  if (!state.playersPromise) {
    state.playersPromise = sleeper.players()
      .then(p => { state.players = p; return p; })
      .catch(err => { state.playersPromise = null; throw err; });
  }
  return state.playersPromise;
}

export function ensureValues() {
  if (state.values) return Promise.resolve(state.values);
  if (!state.valuesPromise) {
    const lg = state.league || {};
    const numTeams = lg.total_rosters || 12;
    const ppr = lg.scoring_settings?.rec === 1 ? 1 : lg.scoring_settings?.rec === 0.5 ? 0.5 : 0;
    const numQbs = (lg.roster_positions || []).filter(p => p === 'QB' || p === 'SUPER_FLEX').length || 1;
    state.valuesPromise = valuesApi.load({
        source: state.valuesSource, numQbs, numTeams, ppr,
      })
      .then(({ map, loaded }) => {
        state.values = map;
        state.valuesLoaded = loaded;
        return map;
      })
      .catch(() => {
        state.valuesPromise = null;
        state.values = new Map();
        state.valuesLoaded = { dynasty: false, redraft: false };
        return state.values;
      });
  }
  return state.valuesPromise;
}

// Reset values cache when source changes; tabs will refetch on next render.
export function clearValues() {
  state.values = null;
  state.valuesPromise = null;
  state.valuesLoaded = { dynasty: false, redraft: false };
}

// ---- Scope (multi-year) loaders ----

// Make sure scope[idx] has matchups loaded for weeks 1..maxWeek.
export async function ensureScopeMatchups(idx, maxWeek) {
  const sc = state.scope[idx];
  if (!sc) return;
  const weeks = [];
  for (let w = 1; w <= maxWeek; w++) {
    if (!(w in sc.matchupsByWeek)) weeks.push(w);
  }
  if (!weeks.length) return;
  await Promise.all(weeks.map(async w => {
    sc.matchupsByWeek[w] = await sleeper.matchups(sc.leagueId, w);
  }));
  if (idx === 0) state.matchupsByWeek = sc.matchupsByWeek;
}

// Same but for transactions, sized to season's last regular-season week.
export async function ensureScopeTransactions(idx) {
  const sc = state.scope[idx];
  if (!sc) return;
  const lg = sc.league;
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
    if (!(w in sc.transactionsByWeek)) weeks.push(w);
  }
  if (!weeks.length) return;
  await Promise.all(weeks.map(async w => {
    sc.transactionsByWeek[w] = await sleeper.transactions(sc.leagueId, w);
  }));
  if (idx === 0) state.transactionsByWeek = sc.transactionsByWeek;
}

// Convenience wrappers that use the primary scope (idx 0).
export function ensureMatchups(maxWeek) { return ensureScopeMatchups(0, maxWeek); }
export function ensureTransactions() { return ensureScopeTransactions(0); }

// All-scope variants: load matchups/transactions across every selected season.
export async function ensureAllScopeMatchups() {
  await Promise.all(state.scope.map((sc, i) => {
    const lg = sc.league;
    const playoffStart = lg.settings?.playoff_week_start || 15;
    const lastReg = playoffStart - 1;
    const currentWeek = state.nflState?.week || lastReg;
    const max = String(state.nflState?.season) === String(lg.season)
      ? Math.min(lastReg, currentWeek)
      : lastReg;
    return ensureScopeMatchups(i, max);
  }));
}
export async function ensureAllScopeTransactions() {
  await Promise.all(state.scope.map((_, i) => ensureScopeTransactions(i)));
}

// ---- Drafts ----

export async function ensureDrafts() {
  if (state.drafts.length) return state.drafts;
  state.drafts = await sleeper.leagueDrafts(state.league.league_id);
  if (state.scope[0]) state.scope[0].drafts = state.drafts;
  return state.drafts;
}

export async function ensureDraftPicks(draftId) {
  if (state.draftPicks[draftId]) return state.draftPicks[draftId];
  const picks = await sleeper.draftPicks(draftId);
  state.draftPicks[draftId] = picks;
  if (state.scope[0]) state.scope[0].draftPicks[draftId] = picks;
  return picks;
}

// ---- History (legacy: walk previous_league_id) ----

export async function ensureHistory() {
  if (state.history) return state.history;
  if (state.historyPromise) return state.historyPromise;

  state.historyPromise = (async () => {
    const past = [];
    let prevId = state.league?.previous_league_id;
    let safety = 25;
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
      } catch { break; }
    }
    state.history = past;
    return past;
  })();
  return state.historyPromise;
}

// ---- Available seasons + scope management ----

// Walk previous_league_id from the current league to discover all linked seasons.
// Caches into state.availableSeasons. Each entry: { leagueId, season, name, avatar }.
export async function discoverAvailableSeasons() {
  if (state.availableSeasons.length) return state.availableSeasons;
  const seasons = [{
    leagueId: state.league.league_id,
    season: state.league.season,
    name: state.league.name,
    avatar: state.league.avatar,
  }];
  let prev = state.league.previous_league_id;
  let safety = 25;
  while (prev && prev !== '0' && safety-- > 0) {
    try {
      const lg = await sleeper.league(prev);
      seasons.push({
        leagueId: lg.league_id, season: lg.season, name: lg.name, avatar: lg.avatar,
      });
      prev = lg.previous_league_id;
    } catch { break; }
  }
  state.availableSeasons = seasons;
  return seasons;
}

// Build a fresh scope object (without loading matchups/transactions yet).
function makeScope({ leagueId, league, users, rosters }) {
  return {
    leagueId,
    season: league.season,
    league,
    users,
    rosters,
    matchupsByWeek: {},
    transactionsByWeek: {},
    drafts: [],
    draftPicks: {},
    ready: true,
  };
}

// Ensure the given leagueId is loaded into state.scope and returned.
// If already in scope, returns it. Otherwise fetches league + users + rosters.
export async function loadScopeFor(leagueId) {
  const existing = state.scope.find(s => s.leagueId === leagueId);
  if (existing) return existing;
  const [league, users, rosters] = await Promise.all([
    sleeper.league(leagueId),
    sleeper.leagueUsers(leagueId),
    sleeper.rosters(leagueId),
  ]);
  return makeScope({ leagueId, league, users, rosters });
}

// Force a refetch of every scope's live data: league config, users, rosters,
// matchups, transactions. Leaves players + dynasty values caches alone (they
// have their own TTLs). After this completes, tabs should re-render.
export async function refreshAllScope() {
  await Promise.all(state.scope.map(async sc => {
    const [league, users, rosters] = await Promise.all([
      sleeper.league(sc.leagueId),
      sleeper.leagueUsers(sc.leagueId),
      sleeper.rosters(sc.leagueId),
    ]);
    sc.league = league;
    sc.users = users;
    sc.rosters = rosters;
    sc.matchupsByWeek = {};
    sc.transactionsByWeek = {};
    // Drop draft picks cache for this scope too — slot maps & metadata can shift mid-draft.
    sc.drafts = [];
    sc.draftPicks = {};
  }));
  // Also refresh the global NFL state (current week may have advanced).
  try { state.nflState = await sleeper.nflState(); } catch {}
  // Re-mirror the primary scope into the legacy top-level fields.
  syncPrimary();
  // History is regenerated on next visit if user clears it; we'll leave it.
}

// Set the scope to exactly these league IDs (in the given order, newest first).
// Loads any missing ones, drops any not in the list. Updates state.league mirror.
export async function setScopeLeagues(leagueIds) {
  if (!leagueIds.length) return;
  // Build new scope array, keeping existing entries when possible.
  const next = await Promise.all(leagueIds.map(id => loadScopeFor(id)));
  // Sort by season descending so newest is first regardless of input order.
  next.sort((a, b) => Number(b.season) - Number(a.season));
  state.scope = next;
  syncPrimary();
}
