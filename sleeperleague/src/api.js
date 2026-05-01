// API clients: Sleeper + FantasyCalc (direct) + DynastyProcess (for KTC values).

const SLEEPER = 'https://api.sleeper.app/v1';
const FANTASYCALC = 'https://api.fantasycalc.com';

// DynastyProcess publishes various community CSVs to GitHub. We try them in
// priority order, looking for one that includes KeepTradeCut values keyed by
// Sleeper ID. The FantasyCalc-only file (values-players.csv) doesn't carry
// KTC; db_ktc.csv (or similar) does. If they rename it, add the new path here.
const DP_KTC_CANDIDATES = [
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/db_ktc.csv',
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/values_ktc.csv',
  'https://raw.githubusercontent.com/dynastyprocess/data/master/files/ktc.csv',
];
const DP_VALUES_PLAYERS = 'https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-players.csv';

const PLAYERS_CACHE_KEY = 'sla:players:nfl';
const PLAYERS_CACHE_MS = 24 * 60 * 60 * 1000;
const VALUES_CACHE_PREFIX = 'sla:values:';
const VALUES_CACHE_MS = 12 * 60 * 60 * 1000;

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

// Direct FantasyCalc values: returns array of { player: {...}, value, redraftValue, ... }
async function fetchFantasyCalcRaw({ isDynasty, numQbs, numTeams, ppr }) {
  const url = `${FANTASYCALC}/values/current?isDynasty=${isDynasty}&numQbs=${numQbs}&numTeams=${numTeams}&ppr=${ppr}`;
  return (await getJSONsoft(url)) || [];
}

// Parse a CSV string. Handles simple quoted fields. Returns array of row objects keyed by header.
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.length);
  if (!lines.length) return [];
  const parseLine = (line) => {
    const out = [];
    let cur = '';
    let inQ = false;
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

// Pick the most likely "value" column from a CSV row.
// Prefers explicit KTC column names, then league-shape ones, then a plain "value".
function pickValueColumn(headers, prefer = 'ktc') {
  const lower = headers.map(h => h.toLowerCase());
  const find = (...needles) => {
    for (const n of needles) {
      const i = lower.findIndex(h => h === n);
      if (i >= 0) return headers[i];
    }
    for (const n of needles) {
      const i = lower.findIndex(h => h.includes(n));
      if (i >= 0) return headers[i];
    }
    return null;
  };
  if (prefer === 'ktc') {
    return find('ktc_value', 'ktc_1qb', 'ktc_sf', 'ktc_2qb', 'ktc', 'value_1qb', 'value', '1qb');
  }
  return find('fc_value', 'fc_1qb', 'value_1qb', 'value_2qb', 'value', '1qb');
}

function pickIdColumn(headers) {
  const lower = headers.map(h => h.toLowerCase());
  const candidates = ['sleeper_id', 'sleeperid', 'sleeper'];
  for (const c of candidates) {
    const i = lower.indexOf(c);
    if (i >= 0) return headers[i];
  }
  return null;
}

// Try each KTC candidate URL until one returns data with a usable
// (sleeper_id, ktc-value) pair. Returns parsed rows + identified columns.
async function fetchKtcRaw() {
  for (const url of DP_KTC_CANDIDATES) {
    const text = await getTextSoft(url);
    if (!text) continue;
    const rows = parseCSV(text);
    if (!rows.length) continue;
    const headers = Object.keys(rows[0]);
    const idCol = pickIdColumn(headers);
    const valCol = pickValueColumn(headers, 'ktc');
    if (idCol && valCol) {
      // Sanity-check: at least one row has a numeric value to avoid silently
      // accepting a file that's not what we want.
      const ok = rows.some(r => {
        const v = parseFloat(r[valCol]);
        return r[idCol] && !isNaN(v) && v > 0;
      });
      if (ok) {
        // eslint-disable-next-line no-console
        console.info(`[values] KTC loaded from ${url} via columns ${idCol}/${valCol} (${rows.length} rows)`);
        return { rows, idCol, valCol, sourceUrl: url };
      }
    }
  }
  return { rows: [], idCol: null, valCol: null, sourceUrl: null };
}

// Same idea for the FantasyCalc-derived DynastyProcess CSV (used as a backup
// FC source if the live FantasyCalc API is down).
async function fetchDpFantasyCalcRaw() {
  const text = await getTextSoft(DP_VALUES_PLAYERS);
  if (!text) return { rows: [], idCol: null, valCol: null };
  const rows = parseCSV(text);
  if (!rows.length) return { rows: [], idCol: null, valCol: null };
  const headers = Object.keys(rows[0]);
  return {
    rows,
    idCol: pickIdColumn(headers),
    valCol: pickValueColumn(headers, 'fc'),
  };
}

// Build a player_id -> value map from a list of values, given a source.
// source: 'fc' | 'ktc' | 'combined'
//   - 'fc'      : FantasyCalc only (live FantasyCalc API)
//   - 'ktc'     : KeepTradeCut only (DynastyProcess KTC mirror CSV)
//   - 'combined': average of normalized KTC + FC values
//
// Returns { map, loaded, source } where loaded is { fc, ktc } reporting which
// sources actually returned non-empty data so the UI can show a truthful label.
export const valuesApi = {
  async load({ source = 'combined', isDynasty = true, numQbs = 1, numTeams = 12, ppr = 1 } = {}) {
    const cacheKey = `${VALUES_CACHE_PREFIX}${source}:${isDynasty}:${numQbs}:${numTeams}:${ppr}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.t && Date.now() - cached.t < VALUES_CACHE_MS) {
        return { map: new Map(cached.d), loaded: cached.loaded || { fc: false, ktc: false }, source };
      }
    } catch {}

    let map = new Map();
    const loaded = { fc: false, ktc: false };

    const buildFcMap = async () => {
      const list = await fetchFantasyCalcRaw({ isDynasty, numQbs, numTeams, ppr });
      const m = new Map();
      let max = 1;
      for (const v of list) {
        const sid = v.player?.sleeperId || v.player?.sleeper_id;
        const val = v.value || 0;
        if (sid) {
          m.set(String(sid), val);
          if (val > max) max = val;
        }
      }
      return { map: m, max };
    };

    const buildKtcMap = async () => {
      const { rows, idCol, valCol } = await fetchKtcRaw();
      const m = new Map();
      let max = 1;
      if (rows.length && idCol && valCol) {
        for (const r of rows) {
          const id = r[idCol];
          const v = parseFloat(r[valCol]);
          if (id && !isNaN(v) && v > 0) {
            m.set(String(id), v);
            if (v > max) max = v;
          }
        }
      }
      return { map: m, max };
    };

    if (source === 'fc') {
      const { map: fcMap } = await buildFcMap();
      for (const [id, v] of fcMap) map.set(id, Math.round(v));
      loaded.fc = fcMap.size > 0;
    } else if (source === 'ktc') {
      const { map: ktcMap } = await buildKtcMap();
      for (const [id, v] of ktcMap) map.set(id, Math.round(v));
      loaded.ktc = ktcMap.size > 0;
    } else {
      const [fc, ktc] = await Promise.all([buildFcMap(), buildKtcMap()]);
      const SCALE = 10000;
      const allIds = new Set([...fc.map.keys(), ...ktc.map.keys()]);
      for (const id of allIds) {
        const fcN  = fc.map.has(id)  ? (fc.map.get(id)  / fc.max)  * SCALE : null;
        const ktcN = ktc.map.has(id) ? (ktc.map.get(id) / ktc.max) * SCALE : null;
        let val;
        if (fcN != null && ktcN != null) val = (fcN + ktcN) / 2;
        else if (fcN != null) val = fcN;
        else val = ktcN;
        if (val != null) map.set(id, Math.round(val));
      }
      loaded.fc = fc.map.size > 0;
      loaded.ktc = ktc.map.size > 0;
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        t: Date.now(), d: [...map.entries()], loaded,
      }));
    } catch {}
    return { map, loaded, source };
  },
};
