// Lazy data loaders. Each tab calls these as needed; caches per league/season.

import {
  sleeper, valuesApi,
  fetchKtcLatest, fetchKtcHistory, fetchKtcSnapshotForDate, clearKtcCaches,
  ktcFormatKey, ktcPickIndex, valueOnOrBefore,
  dpValuesForDate,
} from './api.js';
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
    const isDynasty = lg.settings?.type === 2 || /dynasty|keeper/i.test(lg.name || '');
    const numTeams = lg.total_rosters || 12;
    const ppr = lg.scoring_settings?.rec === 1 ? 1 : lg.scoring_settings?.rec === 0.5 ? 0.5 : 0;
    const sfCount = (lg.roster_positions || []).filter(p => p === 'SUPER_FLEX').length;
    const qbCount = (lg.roster_positions || []).filter(p => p === 'QB').length;
    const isSuperflex = sfCount > 0 || qbCount >= 2;
    const numQbs = isSuperflex ? 2 : 1;
    state.valuesPromise = valuesApi.load({
        source: state.valuesSource, isDynasty, isSuperflex, numQbs, numTeams, ppr,
      })
      .then(({ map, loaded }) => {
        state.values = map;
        state.valuesLoaded = loaded;
        return map;
      })
      .catch(() => {
        state.valuesPromise = null;
        state.values = new Map();
        state.valuesLoaded = { ktc: false, fc: false };
        return state.values;
      });
  }
  return state.valuesPromise;
}

// Reset values cache when source changes; tabs will refetch on next render.
export function clearValues() {
  state.values = null;
  state.valuesPromise = null;
  state.valuesLoaded = { ktc: false, fc: false };
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

// Make sure every scope league has its drafts + draft picks loaded.
// Used so the trade grader can answer "what player was this pick used to draft?".
export async function ensureAllScopeDrafts() {
  await Promise.all(state.scope.map(async sc => {
    if (!sc.drafts || !sc.drafts.length) {
      sc.drafts = await sleeper.leagueDrafts(sc.leagueId);
    }
    await Promise.all((sc.drafts || []).map(async d => {
      if (!sc.draftPicks[d.draft_id]) {
        sc.draftPicks[d.draft_id] = await sleeper.draftPicks(d.draft_id);
      }
    }));
  }));
}

// Load drafts/users/rosters for every season the league has played, regardless
// of what's currently in scope. The pick->player join needs the draft of the
// pick's *target* season (e.g. a 2024 trade for a 2025 R4 pick needs the 2025
// rookie draft, which lives in the 2025 league). Without this, picks from
// past trades can't be matched to the players they became.
//
// Stores results in state.auxLeagues keyed by leagueId. Skips seasons that
// are already loaded as part of the active scope. Self-discovers if
// availableSeasons hasn't been populated yet.
export async function ensureAllAvailableDrafts() {
  if (!state.availableSeasons || !state.availableSeasons.length) {
    await discoverAvailableSeasons();
  }
  const seasons = state.availableSeasons || [];
  await Promise.all(seasons.map(async s => {
    // Already loaded fully via scope? Make sure its drafts are loaded.
    const inScope = state.scope.find(sc => sc.leagueId === s.leagueId);
    if (inScope) {
      if (!inScope.drafts || !inScope.drafts.length) {
        inScope.drafts = await sleeper.leagueDrafts(inScope.leagueId);
      }
      await Promise.all((inScope.drafts || []).map(async d => {
        if (!inScope.draftPicks[d.draft_id]) {
          inScope.draftPicks[d.draft_id] = await sleeper.draftPicks(d.draft_id);
        }
      }));
      return;
    }
    // Otherwise load minimal data into auxLeagues.
    const existing = state.auxLeagues[s.leagueId];
    if (existing && existing.drafts?.length) return;
    const [users, rosters, drafts] = await Promise.all([
      sleeper.leagueUsers(s.leagueId),
      sleeper.rosters(s.leagueId),
      sleeper.leagueDrafts(s.leagueId),
    ]);
    const draftPicks = {};
    await Promise.all((drafts || []).map(async d => {
      draftPicks[d.draft_id] = await sleeper.draftPicks(d.draft_id);
    }));
    state.auxLeagues[s.leagueId] = {
      leagueId: s.leagueId,
      season: s.season,
      users,
      rosters,
      drafts: drafts || [],
      draftPicks,
    };
  }));

  // Diagnostic: surface what got loaded so we can spot missing years.
  const loaded = [
    ...state.scope.map(s => `${s.season} (scope)`),
    ...Object.values(state.auxLeagues).map(s => `${s.season} (aux)`),
  ];
  // eslint-disable-next-line no-console
  console.info(`[drafts] loaded ${loaded.length} season(s): ${loaded.join(', ')}`);
}

// Load + cache the KTC history payload (per-player daily values).
// Returns null if the workflow hasn't published it yet.
export async function ensureKtcHistory() {
  if (state.ktcHistory !== undefined) return state.ktcHistory;
  state.ktcHistory = await fetchKtcHistory().catch(() => null);
  return state.ktcHistory;
}

// Load + cache the latest snapshot specifically (used for picks lookup).
export async function ensureKtcSnapshot() {
  if (state.ktcSnapshot !== undefined) return state.ktcSnapshot;
  state.ktcSnapshot = await fetchKtcLatest().catch(() => null);
  return state.ktcSnapshot;
}

// Build a pick-value lookup matching the active league format.
export async function ensurePickValueIndex() {
  if (state.pickValueIndex) return state.pickValueIndex;
  const snap = await ensureKtcSnapshot();
  if (!snap) { state.pickValueIndex = {}; return {}; }
  const lg = state.league || {};
  const isDynasty = lg.settings?.type === 2 || /dynasty|keeper/i.test(lg.name || '');
  const sfCount = (lg.roster_positions || []).filter(p => p === 'SUPER_FLEX').length;
  const qbCount = (lg.roster_positions || []).filter(p => p === 'QB').length;
  const isSuperflex = sfCount > 0 || qbCount >= 2;
  const fmt = ktcFormatKey({ isDynasty, isSuperflex });
  state.pickValueIndex = ktcPickIndex(snap, fmt);
  return state.pickValueIndex;
}

// Lookup helpers - safe if the underlying data hasn't been loaded yet.
// If the requested season isn't in the index (e.g. 2029 when KTC only has
// 2026-2028), walk backward through seasons up to 6 years to use the latest
// available year as a fallback. Returns 0 if nothing matches.
const FALLBACK_MAX_YEARS = 6;

function _lookupPickFromIndex(idx, season, round, slot) {
  if (!idx || !season || !round) return 0;
  return idx[`${season}|${round}|${slot || 'mid'}`] || idx[`${season}|${round}`] || 0;
}

function _lookupPickWithFallback(idx, season, round, slot) {
  if (!season) return { value: 0, fromSeason: null };
  const exact = _lookupPickFromIndex(idx, season, round, slot);
  if (exact) return { value: exact, fromSeason: season };
  // Walk backward (older years) - if the requested year isn't ranked yet,
  // use the latest year that IS. Don't walk forward (would back-cast wrong).
  const startYear = parseInt(season, 10);
  if (Number.isFinite(startYear)) {
    for (let i = 1; i <= FALLBACK_MAX_YEARS; i++) {
      const y = String(startYear - i);
      const v = _lookupPickFromIndex(idx, y, round, slot);
      if (v) return { value: v, fromSeason: y };
    }
  }
  return { value: 0, fromSeason: null };
}

export function pickValueForTrade(seasonRoundSlot) {
  return _lookupPickWithFallback(state.pickValueIndex, seasonRoundSlot?.season, seasonRoundSlot?.round, seasonRoundSlot?.slot).value;
}

export function pickValueInfoForTrade(seasonRoundSlot) {
  return _lookupPickWithFallback(state.pickValueIndex, seasonRoundSlot?.season, seasonRoundSlot?.round, seasonRoundSlot?.slot);
}

// Per-date pick value indexes, populated lazily by ensurePickValueIndexAtDate.
const _pickIndexByDate = new Map();

export async function ensurePickValueIndexAtDate(isoDate) {
  if (!isoDate) return state.pickValueIndex || {};
  if (_pickIndexByDate.has(isoDate)) return _pickIndexByDate.get(isoDate);
  const snap = await fetchKtcSnapshotForDate(isoDate);
  if (!snap) {
    const idx = await ensurePickValueIndex();
    _pickIndexByDate.set(isoDate, idx);
    return idx;
  }
  const lg = state.league || {};
  const isDynasty = lg.settings?.type === 2 || /dynasty|keeper/i.test(lg.name || '');
  const sfCount = (lg.roster_positions || []).filter(p => p === 'SUPER_FLEX').length;
  const qbCount = (lg.roster_positions || []).filter(p => p === 'QB').length;
  const isSuperflex = sfCount > 0 || qbCount >= 2;
  const fmt = ktcFormatKey({ isDynasty, isSuperflex });
  const idx = ktcPickIndex(snap, fmt);
  _pickIndexByDate.set(isoDate, idx);
  return idx;
}

export function pickValueForTradeAtDate(seasonRoundSlot, isoDate) {
  const idx = (isoDate && _pickIndexByDate.get(isoDate)) || state.pickValueIndex || {};
  return _lookupPickWithFallback(idx, seasonRoundSlot?.season, seasonRoundSlot?.round, seasonRoundSlot?.slot).value;
}

export function pickValueInfoForTradeAtDate(seasonRoundSlot, isoDate) {
  const idx = (isoDate && _pickIndexByDate.get(isoDate)) || state.pickValueIndex || {};
  return _lookupPickWithFallback(idx, seasonRoundSlot?.season, seasonRoundSlot?.round, seasonRoundSlot?.slot);
}

// Per-date player value cache. Populated by ensureHistoricalValuesForDates()
// before any trade is rendered, so playerValueAtDate() can stay synchronous.
const _playerValuesAtDate = new Map(); // isoDate -> Map<sleeperId, value>

// Pre-load historical values from DynastyProcess for each unique trade date.
// Call before rendering trades. After this resolves, playerValueAtDate()
// returns real historical numbers for any requested (sleeperId, isoDate).
export async function ensureHistoricalValuesForDates(isoDates) {
  const lg = state.league || {};
  const sfCount = (lg.roster_positions || []).filter(p => p === 'SUPER_FLEX').length;
  const qbCount = (lg.roster_positions || []).filter(p => p === 'QB').length;
  const isSuperflex = sfCount > 0 || qbCount >= 2;

  const todo = [...new Set(isoDates)].filter(d => d && !_playerValuesAtDate.has(d));
  if (!todo.length) return;
  // Throttle to a small concurrency so we don't fan out 50 GitHub API calls
  // at once and trip the unauth rate limit (60/hr).
  const concurrency = 4;
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < todo.length) {
      const idx = cursor++;
      const date = todo[idx];
      try {
        const map = await dpValuesForDate(date, { superflex: isSuperflex });
        _playerValuesAtDate.set(date, map);
      } catch (err) {
        _playerValuesAtDate.set(date, new Map());
      }
    }
  }));
}

// Player value at a specific date (best available — falls back to current).
// Reads from the per-date cache populated by ensureHistoricalValuesForDates().
export function playerValueAtDate(sleeperId, isoDate) {
  if (isoDate && _playerValuesAtDate.has(isoDate)) {
    const v = _playerValuesAtDate.get(isoDate).get(String(sleeperId));
    if (v != null && v > 0) return v;
  }
  // Legacy KTC history path (left in for back-compat; usually empty).
  if (state.ktcHistory) {
    const v = valueOnOrBefore(state.ktcHistory, sleeperId, isoDate);
    if (v != null) return v;
  }
  return state.values?.get(String(sleeperId)) || 0;
}

// Pick value at trade date using the year-shift trick, with year-fallback
// as a final safety net so that "2029 R1" never returns 0 just because KTC
// hasn't ranked 2029 picks yet.
//
// "2024 R2 mid" pick traded in 2024 was 0 years out at the time. We look up
// today's "0 years out R2 mid" (i.e. current-year R2 mid) and use that as a
// proxy. Pick values for "Mid Nth" don't change much year-over-year, so this
// is a reasonable approximation when we don't have a historical KTC archive.
// If the shifted year still isn't in the snapshot, walk back through years
// until we find a hit (same logic as pickValueForTrade).
export function pickValueForTradeAtDateShifted({ season, round, slot }, tradeIsoDate) {
  const idx = state.pickValueIndex || {};
  if (!season || !round) return 0;
  // Compute the year-shifted equivalent season.
  let lookupSeason = season;
  if (tradeIsoDate) {
    const tradeYear = parseInt(tradeIsoDate.slice(0, 4), 10);
    const pickYear = parseInt(season, 10);
    if (Number.isFinite(tradeYear) && Number.isFinite(pickYear)) {
      const yearsOut = pickYear - tradeYear;
      if (yearsOut >= 0 && yearsOut <= 5) {
        const currentYear = state.nflState?.season ? parseInt(state.nflState.season, 10) : new Date().getFullYear();
        lookupSeason = String(currentYear + yearsOut);
      }
    }
  }
  // Apply standard fallback against the (possibly shifted) season.
  return _lookupPickWithFallback(idx, lookupSeason, round, slot).value
      || _lookupPickWithFallback(idx, season, round, slot).value;
}

// For every season we know about (scope + auxLeagues), build a lookup
//   `(season, round, original_roster_id) -> {player_id, pick_no, draft_slot}`
// where `original_roster_id` is the team that *originally* owned the pick (its
// slot in the draft). Sleeper's draft objects expose `slot_to_roster_id`
// keyed by draft slot; we invert that to resolve "which slot belongs to
// roster X" so each traded pick lands on its actual draft position rather
// than collapsing to the first season+round match.
export function buildDraftedPicksIndex() {
  const out = new Map();
  const sources = [
    ...state.scope,
    ...Object.values(state.auxLeagues || {}),
  ];
  let withPlayer = 0;
  for (const src of sources) {
    const drafts = src.drafts || [];
    for (const d of drafts) {
      const season = d.season;
      const slotToRoster = d.slot_to_roster_id || {};
      const picks = src.draftPicks?.[d.draft_id] || [];
      for (const p of picks) {
        // The pick's *original* owner is whichever roster owns its slot in
        // the draft. Falls back to the actual drafter (p.roster_id) when
        // the mapping is missing - imperfect, but better than nothing.
        const originalRosterId = slotToRoster[p.draft_slot] ?? p.roster_id;
        if (originalRosterId == null) continue;
        const key = `${season}|${p.round}|${originalRosterId}`;
        // Don't clobber a populated entry with an empty one.
        const existing = out.get(key);
        if (existing && existing.player_id && !p.player_id) continue;
        out.set(key, {
          player_id: p.player_id,
          pick_no: p.pick_no,
          draft_slot: p.draft_slot,
          season,
          round: p.round,
        });
        if (p.player_id) withPlayer++;
      }
    }
  }
  // eslint-disable-next-line no-console
  console.info(`[drafts] index built: ${out.size} entries (${withPlayer} with players)`);
  return out;
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
// matchups, transactions. Also busts the KTC snapshot/history caches so the
// "Values from..." panel reflects whatever the GitHub Action last published.
// Leaves the Sleeper players DB cache alone (5 MB; rarely changes mid-season).
export async function refreshAllScope() {
  // Clear the cached KTC payloads + force re-fetch on next ensure*() call.
  clearKtcCaches();
  state.ktcSnapshot = undefined;
  state.ktcHistory = undefined;
  state.pickValueIndex = null;
  // Bust the per-source values cache too so the Trades / Rosters tabs
  // pull fresh KTC values on next render.
  state.values = null;
  state.valuesPromise = null;
  state.valuesLoaded = { ktc: false, fc: false };

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
    sc.drafts = [];
    sc.draftPicks = {};
  }));
  try { state.nflState = await sleeper.nflState(); } catch {}
  syncPrimary();
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
