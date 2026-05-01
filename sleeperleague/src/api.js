// API clients: Sleeper + FantasyCalc (direct) + DynastyProcess (for KTC values).

const SLEEPER = 'https://api.sleeper.app/v1';
const FANTASYCALC = 'https://api.fantasycalc.com';
const DYNASTYPROCESS_CSV = 'https://raw.githubusercontent.com/dynastyprocess/data/master/files/values-players.csv';

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

// DynastyProcess values CSV - has both KTC and FC columns.
// Common columns include sleeper_id, ktc_value (or value), fc_value, etc.
async function fetchDynastyProcessRaw() {
  const text = await getTextSoft(DYNASTYPROCESS_CSV);
  if (!text) return [];
  return parseCSV(text);
}

// Build a player_id -> value map from a list of values, given a source.
// source: 'fc' | 'ktc' | 'combined'
//   - 'fc'      : FantasyCalc only (uses FantasyCalc API directly)
//   - 'ktc'     : KeepTradeCut only (uses DynastyProcess CSV - column: value/ktc_value)
//   - 'combined': average of normalized KTC + FC values
//
// For league-aware tuning we still pass numQbs/ppr/etc. to FC.
export const valuesApi = {
  async load({ source = 'combined', isDynasty = true, numQbs = 1, numTeams = 12, ppr = 1 } = {}) {
    const cacheKey = `${VALUES_CACHE_PREFIX}${source}:${isDynasty}:${numQbs}:${numTeams}:${ppr}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.t && Date.now() - cached.t < VALUES_CACHE_MS) {
        return new Map(cached.d);
      }
    } catch {}

    let map = new Map();

    if (source === 'fc') {
      const list = await fetchFantasyCalcRaw({ isDynasty, numQbs, numTeams, ppr });
      for (const v of list) {
        const sid = v.player?.sleeperId || v.player?.sleeper_id;
        if (sid) map.set(String(sid), Math.round(v.value || 0));
      }
    } else if (source === 'ktc') {
      const rows = await fetchDynastyProcessRaw();
      const valueCol = rows[0] && ('value' in rows[0]) ? 'value'
                      : rows[0] && ('ktc_value' in rows[0]) ? 'ktc_value'
                      : null;
      const idCol = rows[0] && ('sleeper_id' in rows[0]) ? 'sleeper_id'
                    : rows[0] && ('sleeperId' in rows[0]) ? 'sleeperId'
                    : null;
      if (valueCol && idCol) {
        for (const r of rows) {
          const id = r[idCol];
          const v = parseFloat(r[valueCol]);
          if (id && !isNaN(v)) map.set(String(id), Math.round(v));
        }
      }
    } else {
      // combined: get both, normalize each to its max, average.
      const [fcList, dpRows] = await Promise.all([
        fetchFantasyCalcRaw({ isDynasty, numQbs, numTeams, ppr }),
        fetchDynastyProcessRaw(),
      ]);

      const fcMap = new Map();
      let fcMax = 1;
      for (const v of fcList) {
        const sid = v.player?.sleeperId || v.player?.sleeper_id;
        const val = v.value || 0;
        if (sid) {
          fcMap.set(String(sid), val);
          if (val > fcMax) fcMax = val;
        }
      }

      const ktcMap = new Map();
      let ktcMax = 1;
      const valueCol = dpRows[0] && ('value' in dpRows[0]) ? 'value'
                      : dpRows[0] && ('ktc_value' in dpRows[0]) ? 'ktc_value'
                      : null;
      const idCol = dpRows[0] && ('sleeper_id' in dpRows[0]) ? 'sleeper_id'
                    : dpRows[0] && ('sleeperId' in dpRows[0]) ? 'sleeperId'
                    : null;
      if (valueCol && idCol) {
        for (const r of dpRows) {
          const id = r[idCol];
          const v = parseFloat(r[valueCol]);
          if (id && !isNaN(v)) {
            ktcMap.set(String(id), v);
            if (v > ktcMax) ktcMax = v;
          }
        }
      }

      // Combine: scale each to a common 0-10000 range, average where both present.
      const allIds = new Set([...fcMap.keys(), ...ktcMap.keys()]);
      const SCALE = 10000;
      for (const id of allIds) {
        const fc = fcMap.has(id) ? (fcMap.get(id) / fcMax) * SCALE : null;
        const k  = ktcMap.has(id) ? (ktcMap.get(id) / ktcMax) * SCALE : null;
        let val;
        if (fc != null && k != null) val = (fc + k) / 2;
        else if (fc != null) val = fc;
        else val = k;
        if (val != null) map.set(id, Math.round(val));
      }

      // If we got nothing from either source, just bail with empty map.
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d: [...map.entries()] }));
    } catch {}
    return map;
  },
};
