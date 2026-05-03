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
// Also clear the per-date historical cache because it's keyed on whichever
// source was active at fetch time.
export function clearValues() {
  state.values = null;
  state.valuesPromise = null;
  state.valuesLoaded = { ktc: false, fc: false };
  _playerValuesAtDate.clear();
  _pickIndexByDate.clear();
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
// of what's currently in scope OR currently in the active filter view. The
// pick->player join needs the draft of the pick's *target* season (e.g. a
// 2024 trade for a 2025 R4 pick needs the 2025 rookie draft, which lives in
// the 2025 league). Without this, picks from past trades can't be matched
// to the players they became.
//
// Stores results into the matching scope entry from state._allLoadedScope
// (the FULL loaded set, not the filter-derived state.scope) so that
// filtering doesn't lose draft data for filtered-out years.
export async function ensureAllAvailableDrafts() {
  if (!state.availableSeasons || !state.availableSeasons.length) {
    await discoverAvailableSeasons();
  }
  const seasons = state.availableSeasons || [];
  const fullScope = state._allLoadedScope || state.scope || [];
  await Promise.all(seasons.map(async s => {
    // Try to find this season in the full loaded set first - that's where
    // the data lives even when filtering hides it from state.scope.
    const inLoaded = fullScope.find(sc => sc.leagueId === s.leagueId);
    if (inLoaded) {
      if (!inLoaded.drafts || !inLoaded.drafts.length) {
        inLoaded.drafts = await sleeper.leagueDrafts(inLoaded.leagueId);
      }
      await Promise.all((inLoaded.drafts || []).map(async d => {
        if (!inLoaded.draftPicks[d.draft_id]) {
          inLoaded.draftPicks[d.draft_id] = await sleeper.draftPicks(d.draft_id);
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
    ...((state._allLoadedScope || state.scope || []).map(s => `${s.season}`)),
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

// KTC doesn't publish values for 5th-round picks (or later). When asked for
// an R5 value, use that year's R4 LATE value × 0.9 as a sensible proxy.
// Year-fallback (above) still applies if the requested year isn't in the
// snapshot — it'll walk back through years and synthesize R5 from whichever
// year's R4 late we DO have.
function _lookupPickFromIndex(idx, season, round, slot) {
  if (!idx || !season || !round) return 0;
  const direct = idx[`${season}|${round}|${slot || 'mid'}`] || idx[`${season}|${round}`];
  if (direct) return direct;
  // Synthesize R5+ from R4 late.
  if (round >= 5) {
    const r4Late = idx[`${season}|4|late`] || idx[`${season}|4`];
    if (r4Late) {
      // Each extra round below R4 takes a further 10% off cumulatively.
      const multiplier = Math.pow(0.9, round - 4);
      return Math.round(r4Late * multiplier);
    }
  }
  return 0;
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

// Pre-load historical values for each unique trade date. The values come
// from whichever source the user has picked (KTC, FC, or Combined) so that
// "Value at trade" and "Value now" are on the same scale - mixing DP/FC
// with KTC would create artificial drift even for trades made today.
//
// Source-by-source:
//   - 'fc'       → DynastyProcess git history (FantasyCalc-derived)
//   - 'ktc'      → KTC daily snapshot from /data/snapshots/ktc_<date>.json
//                  (falls back to current snapshot if a dated one is missing)
//   - 'combined' → average of normalized FC + KTC at that date
export async function ensureHistoricalValuesForDates(isoDates) {
  const lg = state.league || {};
  const sfCount = (lg.roster_positions || []).filter(p => p === 'SUPER_FLEX').length;
  const qbCount = (lg.roster_positions || []).filter(p => p === 'QB').length;
  const isSuperflex = sfCount > 0 || qbCount >= 2;
  const isDynasty = lg.settings?.type === 2 || /dynasty|keeper/i.test(lg.name || '');
  const fmtKey = ktcFormatKey({ isDynasty, isSuperflex });
  const source = state.valuesSource || 'combined';

  const todo = [...new Set(isoDates)].filter(d => d && !_playerValuesAtDate.has(d));
  if (!todo.length) return;

  const concurrency = 4;
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < todo.length) {
      const idx = cursor++;
      const date = todo[idx];
      try {
        const map = await loadValuesAtDate(date, { source, fmtKey, isSuperflex });
        _playerValuesAtDate.set(date, map);
      } catch {
        _playerValuesAtDate.set(date, new Map());
      }
    }
  }));
}

// Build a sleeperId -> value map for one date in the active source's terms.
async function loadValuesAtDate(isoDate, { source, fmtKey, isSuperflex }) {
  const out = new Map();

  // KTC at date: try the dated snapshot, walk back up to a week if missing.
  // If even that fails, fall back to the current KTC snapshot's values so
  // a today's-trade still shows a sensible number rather than zero.
  async function ktcMapForDate() {
    const snap = await fetchKtcSnapshotForDate(isoDate)
      || await fetchKtcSnapshotForDate(new Date().toISOString().slice(0, 10));
    if (!snap) return new Map();
    const block = snap?.formats?.[fmtKey];
    if (!block) return new Map();
    const m = new Map();
    for (const [sid, row] of Object.entries(block.players || {})) {
      if (row?.value > 0) m.set(String(sid), row.value);
    }
    return m;
  }

  if (source === 'fc') {
    return await dpValuesForDate(isoDate, { superflex: isSuperflex });
  }

  if (source === 'ktc') {
    return await ktcMapForDate();
  }

  // combined: average normalized FC + KTC at the date.
  const [fc, ktc] = await Promise.all([
    dpValuesForDate(isoDate, { superflex: isSuperflex }),
    ktcMapForDate(),
  ]);
  const SCALE = 10000;
  const fcMax = [...fc.values()].reduce((m, v) => Math.max(m, v), 1);
  const ktcMax = [...ktc.values()].reduce((m, v) => Math.max(m, v), 1);
  const allIds = new Set([...fc.keys(), ...ktc.keys()]);
  for (const id of allIds) {
    const f = fc.has(id) ? (fc.get(id) / fcMax) * SCALE : null;
    const k = ktc.has(id) ? (ktc.get(id) / ktcMax) * SCALE : null;
    let val;
    if (f != null && k != null) val = (f + k) / 2;
    else if (f != null) val = f;
    else val = k;
    if (val != null) out.set(id, Math.round(val));
  }
  return out;
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

// For every season we know about (FULL loaded scope + auxLeagues), build a
// lookup `(season, round, original_roster_id) -> {player_id, pick_no, draft_slot}`.
//
// We rely on Sleeper's `slot_to_roster_id` mapping (slot -> original owner)
// to produce a stable key. We deliberately DON'T fall back to the pick's
// drafter (`p.roster_id`) when the mapping is missing - that fallback
// causes wrong-player matches when a single team made multiple picks in
// the same round. Better to leave the pick unresolved than to mislabel.
//
// Reads from state._allLoadedScope (full set, including filter-hidden years).
export function buildDraftedPicksIndex() {
  const out = new Map();
  const sources = [
    ...(state._allLoadedScope || state.scope || []),
    ...Object.values(state.auxLeagues || {}),
  ];
  let withPlayer = 0;
  let missingMapping = [];
  for (const src of sources) {
    const drafts = src.drafts || [];
    for (const d of drafts) {
      const season = d.season;
      const slotToRoster = d.slot_to_roster_id || null;
      const picks = src.draftPicks?.[d.draft_id] || [];
      if (!slotToRoster || Object.keys(slotToRoster).length === 0) {
        if (picks.length) missingMapping.push(`${season} (${picks.length} picks)`);
        continue;
      }
      for (const p of picks) {
        const originalRosterId = slotToRoster[p.draft_slot];
        if (originalRosterId == null) continue;
        const key = `${season}|${p.round}|${originalRosterId}`;
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
  if (missingMapping.length) {
    // eslint-disable-next-line no-console
    console.warn(`[drafts] missing slot_to_roster_id for: ${missingMapping.join(', ')} - traded picks for those drafts won't resolve to drafted players`);
  }
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
