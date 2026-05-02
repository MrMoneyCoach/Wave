// API clients: Sleeper + FantasyCalc + KeepTradeCut snapshot.
// KTC values come from our own daily snapshot committed by .github/workflows/ktc-daily.yml.

const SLEEPER = 'https://api.sleeper.app/v1';
const FANTASYCALC = 'https://api.fantasycalc.com';
// raw.githubusercontent supports `refs/heads/<branch-with-slashes>` for branches that contain slashes.
const KTC_LATEST = 'https://raw.githubusercontent.com/MrMoneyCoach/Wave/refs/heads/claude/alfred-project-bot-zLj9R/sleeperleague/data/ktc_latest.json';
const KTC_SNAPSHOT_PREFIX = 'https://raw.githubusercontent.com/MrMoneyCoach/Wave/refs/heads/claude/alfred-project-bot-zLj9R/sleeperleague/data/snapshots/ktc_';
const KTC_HISTORY = 'https://raw.githubusercontent.com/MrMoneyCoach/Wave/refs/heads/claude/alfred-project-bot-zLj9R/sleeperleague/data/ktc_history.json';

const PLAYERS_CACHE_KEY = 'sla:players:nfl';
const PLAYERS_CACHE_MS = 24 * 60 * 60 * 1000;
const VALUES_CACHE_PREFIX = 'sla:values:';
const VALUES_CACHE_MS = 12 * 60 * 60 * 1000;
const KTC_SNAPSHOT_CACHE_PREFIX = 'sla:ktcsnap:';
// 1 hour. Picks/values data is small and the workflow updates daily, so
// catching a fresh snapshot inside an hour is the right balance.
const KTC_SNAPSHOT_CACHE_MS = 60 * 60 * 1000;

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}
async function getJSONsoft(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function getTextSoft(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

// Simple CSV parser (handles quoted fields).
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.length);
  if (!lines.length) return [];
  const parseLine = (line) => {
    const out = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const obj = {};
    headers.forEach((h, j) => obj[h] = cols[j]);
    rows.push(obj);
  }
  return rows;
}

// ============ DynastyProcess historical values via git history ============
// DP commits values-players.csv frequently (~daily). We fetch any past commit
// by SHA via raw.githubusercontent.com to read player values as of that date.
// This gives us per-player historical values for the last several years
// without scraping anyone.

const DP_REPO = 'dynastyprocess/data';
const DP_VALUES_PATH = 'files/values-players.csv';
const DP_PLAYERIDS_URL = `https://raw.githubusercontent.com/${DP_REPO}/master/files/db_playerids.csv`;
const HIST_CACHE_PREFIX = 'sla:hist:';
const HIST_BRIDGE_KEY = 'sla:hist:bridge';
const HIST_BRIDGE_MS = 30 * 24 * 60 * 60 * 1000;

const _commitForDate = new Map();
const _valuesAtCommit = new Map();
let _bridgePromise = null;

async function ensureFpToSleeperBridge() {
  if (_bridgePromise) return _bridgePromise;
  _bridgePromise = (async () => {
    try {
      const cached = JSON.parse(localStorage.getItem(HIST_BRIDGE_KEY) || 'null');
      if (cached?.t && Date.now() - cached.t < HIST_BRIDGE_MS) return new Map(cached.d);
    } catch {}
    const text = await getTextSoft(DP_PLAYERIDS_URL);
    if (!text) return new Map();
    const rows = parseCSV(text);
    const map = new Map();
    for (const r of rows) {
      const fp = r.fantasypros_id;
      const sl = r.sleeper_id;
      if (fp && sl) map.set(String(fp), String(sl));
    }
    try {
      localStorage.setItem(HIST_BRIDGE_KEY, JSON.stringify({ t: Date.now(), d: [...map.entries()] }));
    } catch {}
    return map;
  })();
  return _bridgePromise;
}

async function dpCommitForDate(isoDate) {
  if (_commitForDate.has(isoDate)) return _commitForDate.get(isoDate);
  const cacheKey = `${HIST_CACHE_PREFIX}commit:${isoDate}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached?.sha) { _commitForDate.set(isoDate, cached.sha); return cached.sha; }
    if (cached?.miss) { _commitForDate.set(isoDate, null); return null; }
  } catch {}
  const url = `https://api.github.com/repos/${DP_REPO}/commits?path=${encodeURIComponent(DP_VALUES_PATH)}&until=${isoDate}T23:59:59Z&per_page=1`;
  let sha = null;
  try {
    const r = await fetch(url);
    if (r.ok) {
      const list = await r.json();
      sha = list?.[0]?.sha || null;
    }
  } catch {}
  _commitForDate.set(isoDate, sha);
  try {
    localStorage.setItem(cacheKey, sha ? JSON.stringify({ sha }) : JSON.stringify({ miss: true, t: Date.now() }));
  } catch {}
  return sha;
}

async function dpValuesAtCommit(sha) {
  if (!sha) return new Map();
  if (_valuesAtCommit.has(sha)) return _valuesAtCommit.get(sha);
  const cacheKey = `${HIST_CACHE_PREFIX}vals:${sha}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached?.d) {
      const map = new Map(cached.d);
      _valuesAtCommit.set(sha, map);
      return map;
    }
  } catch {}
  const url = `https://raw.githubusercontent.com/${DP_REPO}/${sha}/${DP_VALUES_PATH}`;
  const text = await getTextSoft(url);
  if (!text) return new Map();
  const rows = parseCSV(text);
  const bridge = await ensureFpToSleeperBridge();
  const map = new Map();
  for (const r of rows) {
    const fp = r.fp_id;
    if (!fp) continue;
    const sleeperId = bridge.get(String(fp));
    if (!sleeperId) continue;
    map.set(String(sleeperId), {
      v1: parseFloat(r.value_1qb) || 0,
      v2: parseFloat(r.value_2qb) || 0,
    });
  }
  _valuesAtCommit.set(sha, map);
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ d: [...map.entries()] }));
  } catch { /* over quota; in-memory only */ }
  return map;
}

// Public: get historical values map keyed by sleeperId for a given date.
// `superflex: true` returns 2QB values, otherwise 1QB.
export async function dpValuesForDate(isoDate, { superflex = false } = {}) {
  if (!isoDate) return new Map();
  const sha = await dpCommitForDate(isoDate);
  if (!sha) return new Map();
  const raw = await dpValuesAtCommit(sha);
  const out = new Map();
  for (const [id, row] of raw) {
    out.set(id, superflex ? row.v2 : row.v1);
  }
  return out;
}

export const sleeper = {
  user(username) { return getJSON(`${SLEEPER}/user/${encodeURIComponent(username)}`); },
  leaguesForUser(userId, season) { return getJSON(`${SLEEPER}/user/${userId}/leagues/nfl/${season}`); },
  league(leagueId) { return getJSON(`${SLEEPER}/league/${leagueId}`); },
  leagueUsers(leagueId) { return getJSON(`${SLEEPER}/league/${leagueId}/users`); },
  rosters(leagueId) { return getJSON(`${SLEEPER}/league/${leagueId}/rosters`); },
  matchups(leagueId, week) { return getJSONsoft(`${SLEEPER}/league/${leagueId}/matchups/${week}`).then(d => d || []); },
  transactions(leagueId, week) { return getJSONsoft(`${SLEEPER}/league/${leagueId}/transactions/${week}`).then(d => d || []); },
  nflState() { return getJSON(`${SLEEPER}/state/nfl`); },
  leagueDrafts(leagueId) { return getJSONsoft(`${SLEEPER}/league/${leagueId}/drafts`).then(d => d || []); },
  draftPicks(draftId) { return getJSONsoft(`${SLEEPER}/draft/${draftId}/picks`).then(d => d || []); },
  winnersBracket(leagueId) { return getJSONsoft(`${SLEEPER}/league/${leagueId}/winners_bracket`).then(d => d || []); },
  losersBracket(leagueId) { return getJSONsoft(`${SLEEPER}/league/${leagueId}/losers_bracket`).then(d => d || []); },
  tradedPicks(leagueId) { return getJSONsoft(`${SLEEPER}/league/${leagueId}/traded_picks`).then(d => d || []); },

  async players() {
    try {
      const cached = JSON.parse(localStorage.getItem(PLAYERS_CACHE_KEY) || 'null');
      if (cached && cached.t && Date.now() - cached.t < PLAYERS_CACHE_MS) return cached.d;
    } catch {}
    const d = await getJSON(`${SLEEPER}/players/nfl`);
    try { localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify({ t: Date.now(), d })); } catch {}
    return d;
  },
};

// ---- FantasyCalc ----

async function fetchFantasyCalcMap({ isDynasty, numQbs, numTeams, ppr }) {
  const url = `${FANTASYCALC}/values/current?isDynasty=${isDynasty}&numQbs=${numQbs}&numTeams=${numTeams}&ppr=${ppr}`;
  const list = (await getJSONsoft(url)) || [];
  const map = new Map();
  let max = 1;
  for (const v of list) {
    const sid = v.player?.sleeperId || v.player?.sleeper_id;
    const val = v.value || 0;
    if (sid && val > 0) {
      map.set(String(sid), val);
      if (val > max) max = val;
    }
  }
  return { map, max };
}

// ---- KTC snapshot ----

// One-time fetch of the latest KTC snapshot, cached in localStorage.
// Pass {force: true} to bypass cache (used by the manual refresh button).
export async function fetchKtcLatest({ force = false } = {}) {
  const cacheKey = `${KTC_SNAPSHOT_CACHE_PREFIX}latest`;
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.t && Date.now() - cached.t < KTC_SNAPSHOT_CACHE_MS) return cached.d;
    } catch {}
  }
  // Bust HTTP cache too with a query string so we don't get a 304 from
  // a CDN edge that's still serving the old file.
  const url = force ? `${KTC_LATEST}?t=${Date.now()}` : KTC_LATEST;
  const d = await getJSONsoft(url);
  if (d) {
    try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d })); } catch {}
  }
  return d;
}

// Optional: per-day snapshot for "value at trade date" lookups.
// Tries the requested date, then walks backward up to 7 days.
export async function fetchKtcSnapshotForDate(isoDate) {
  const tryOne = async (d) => {
    const cacheKey = `${KTC_SNAPSHOT_CACHE_PREFIX}${d}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached) return cached.d;
    } catch {}
    const data = await getJSONsoft(`${KTC_SNAPSHOT_PREFIX}${d}.json`);
    if (data) {
      try { localStorage.setItem(cacheKey, JSON.stringify({ d: data })); } catch {}
    }
    return data;
  };
  let d = isoDate;
  for (let i = 0; i < 8; i++) {
    const result = await tryOne(d);
    if (result) return result;
    // step backwards one day
    const dt = new Date(d + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() - 1);
    d = dt.toISOString().slice(0, 10);
  }
  return null;
}

// Pick the right format block from a snapshot based on league shape.
export function ktcFormatKey({ isDynasty, isSuperflex }) {
  if (!isDynasty) return 'redraft';
  return isSuperflex ? 'dynasty_sf' : 'dynasty_1qb';
}

// Build a quick pick-value lookup keyed by `${season}|${round}|${slot}` and
// `${season}|${round}` (slot = 'mid' fallback). For Sleeper trades, we only
// know season + round, so use slot='mid' as default.
export function ktcPickIndex(snapshot, fmtKey) {
  const out = {};
  const block = snapshot?.formats?.[fmtKey];
  if (!block) return out;
  const picks = block.picks || [];
  for (const p of picks) {
    if (!p.season || !p.round) continue;
    const slot = p.slot || 'mid';
    out[`${p.season}|${p.round}|${slot}`] = p.value || 0;
    // Keep an overall mid value as the default for the (season, round) pair.
    if (slot === 'mid' || !out[`${p.season}|${p.round}`]) {
      out[`${p.season}|${p.round}`] = p.value || 0;
    }
  }
  return out;
}

// One-time fetch of the per-player history file. May be very large
// (thousands of players × hundreds of dates) so we cache for 24h. Pass
// {force: true} to bypass cache.
const HISTORY_CACHE_KEY = 'sla:ktchistory';
const HISTORY_CACHE_MS = 24 * 60 * 60 * 1000;
export async function fetchKtcHistory({ force = false } = {}) {
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(HISTORY_CACHE_KEY) || 'null');
      if (cached && cached.t && Date.now() - cached.t < HISTORY_CACHE_MS) return cached.d;
    } catch {}
  }
  const url = force ? `${KTC_HISTORY}?t=${Date.now()}` : KTC_HISTORY;
  const d = await getJSONsoft(url);
  if (d) {
    try { localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify({ t: Date.now(), d })); }
    catch { /* may exceed 5MB localStorage quota */ }
  }
  return d;
}

// Clear all KTC localStorage caches. Used by the manual refresh button.
export function clearKtcCaches() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(KTC_SNAPSHOT_CACHE_PREFIX) || k === HISTORY_CACHE_KEY)) {
        keys.push(k);
      }
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {}
}

// Given a history payload + sleeper_id + ISO date, return the value on or
// just before that date. Returns null if no history for that player.
export function valueOnOrBefore(history, sleeperId, isoDate) {
  if (!history || !history.history) return null;
  const series = history.history[String(sleeperId)];
  if (!series || !series.length) return null;
  // Series is chronological; find the latest entry with d <= isoDate.
  let lo = 0, hi = series.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].d <= isoDate) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best >= 0 ? series[best].v : null;
}

function ktcMapFromSnapshot(snapshot, fmtKey) {
  const block = snapshot?.formats?.[fmtKey];
  if (!block) return { map: new Map(), max: 1 };
  const map = new Map();
  let max = 1;
  for (const [sid, row] of Object.entries(block.players || {})) {
    const v = row?.value || 0;
    if (sid && v > 0) {
      map.set(String(sid), v);
      if (v > max) max = v;
    }
  }
  return { map, max };
}

// ---- Unified values loader ----

// source: 'ktc' | 'fc' | 'combined'
//   - 'ktc'     : KeepTradeCut snapshot (our daily JSON)
//   - 'fc'      : FantasyCalc live API
//   - 'combined': average of normalized KTC + FC values
//
// Returns { map, loaded, source } where loaded is { ktc, fc } reporting
// which sources actually came back with data.
export const valuesApi = {
  async load({ source = 'combined', isDynasty = true, isSuperflex = false, numQbs = 1, numTeams = 12, ppr = 1 } = {}) {
    const fmtKey = ktcFormatKey({ isDynasty, isSuperflex });
    const cacheKey = `${VALUES_CACHE_PREFIX}${source}:${fmtKey}:${numTeams}:${ppr}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.t && Date.now() - cached.t < VALUES_CACHE_MS) {
        return {
          map: new Map(cached.d),
          loaded: cached.loaded || { ktc: false, fc: false },
          source,
        };
      }
    } catch {}

    const fcShape = { isDynasty, numQbs, numTeams, ppr };

    let map = new Map();
    const loaded = { ktc: false, fc: false };

    if (source === 'ktc') {
      const snap = await fetchKtcLatest();
      const { map: m } = ktcMapFromSnapshot(snap, fmtKey);
      for (const [id, v] of m) map.set(id, Math.round(v));
      loaded.ktc = m.size > 0;
    } else if (source === 'fc') {
      const { map: m } = await fetchFantasyCalcMap(fcShape);
      for (const [id, v] of m) map.set(id, Math.round(v));
      loaded.fc = m.size > 0;
    } else {
      const [snap, fc] = await Promise.all([fetchKtcLatest(), fetchFantasyCalcMap(fcShape)]);
      const ktc = ktcMapFromSnapshot(snap, fmtKey);
      const SCALE = 10000;
      const allIds = new Set([...ktc.map.keys(), ...fc.map.keys()]);
      for (const id of allIds) {
        const k = ktc.map.has(id) ? (ktc.map.get(id) / ktc.max) * SCALE : null;
        const f = fc.map.has(id)  ? (fc.map.get(id)  / fc.max)  * SCALE : null;
        let val;
        if (k != null && f != null) val = (k + f) / 2;
        else if (k != null) val = k;
        else val = f;
        if (val != null) map.set(id, Math.round(val));
      }
      loaded.ktc = ktc.map.size > 0;
      loaded.fc = fc.map.size > 0;
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        t: Date.now(), d: [...map.entries()], loaded,
      }));
    } catch {}
    // eslint-disable-next-line no-console
    console.info(`[values] ${source} ${fmtKey} → ${map.size} players (ktc:${loaded.ktc}, fc:${loaded.fc})`);
    return { map, loaded, source };
  },
};
