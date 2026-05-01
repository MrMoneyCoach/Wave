// API clients: Sleeper + FantasyCalc.
// Values come from FantasyCalc only — KTC has no public API and forbids
// scraping in their terms, so we deliberately don't go there.

const SLEEPER = 'https://api.sleeper.app/v1';
const FANTASYCALC = 'https://api.fantasycalc.com';

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

// One FantasyCalc fetch. Returns { sleeperId -> rawValue } and the max raw value.
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

// Build a player_id -> value map.
// source: 'dynasty' | 'redraft' | 'combined'
//   - 'dynasty' : FantasyCalc dynasty values (long-term).
//   - 'redraft' : FantasyCalc redraft values (this-season-only).
//   - 'combined': average of normalized dynasty + redraft values.
//
// Returns { map, loaded, source } where loaded is { dynasty, redraft }
// reporting which sources actually came back with data so the UI can show
// a truthful label.
export const valuesApi = {
  async load({ source = 'combined', numQbs = 1, numTeams = 12, ppr = 1 } = {}) {
    const cacheKey = `${VALUES_CACHE_PREFIX}${source}:${numQbs}:${numTeams}:${ppr}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.t && Date.now() - cached.t < VALUES_CACHE_MS) {
        return {
          map: new Map(cached.d),
          loaded: cached.loaded || { dynasty: false, redraft: false },
          source,
        };
      }
    } catch {}

    let map = new Map();
    const loaded = { dynasty: false, redraft: false };

    if (source === 'dynasty') {
      const { map: m } = await fetchFantasyCalcMap({ isDynasty: true,  numQbs, numTeams, ppr });
      for (const [id, v] of m) map.set(id, Math.round(v));
      loaded.dynasty = m.size > 0;
    } else if (source === 'redraft') {
      const { map: m } = await fetchFantasyCalcMap({ isDynasty: false, numQbs, numTeams, ppr });
      for (const [id, v] of m) map.set(id, Math.round(v));
      loaded.redraft = m.size > 0;
    } else {
      // combined: fetch both, normalize to a common 0-10000 scale, average.
      const [dyn, red] = await Promise.all([
        fetchFantasyCalcMap({ isDynasty: true,  numQbs, numTeams, ppr }),
        fetchFantasyCalcMap({ isDynasty: false, numQbs, numTeams, ppr }),
      ]);
      const SCALE = 10000;
      const allIds = new Set([...dyn.map.keys(), ...red.map.keys()]);
      for (const id of allIds) {
        const d = dyn.map.has(id) ? (dyn.map.get(id) / dyn.max) * SCALE : null;
        const r = red.map.has(id) ? (red.map.get(id) / red.max) * SCALE : null;
        let val;
        if (d != null && r != null) val = (d + r) / 2;
        else if (d != null) val = d;
        else val = r;
        if (val != null) map.set(id, Math.round(val));
      }
      loaded.dynasty = dyn.map.size > 0;
      loaded.redraft = red.map.size > 0;
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        t: Date.now(), d: [...map.entries()], loaded,
      }));
    } catch {}
    // eslint-disable-next-line no-console
    console.info(`[values] ${source} → ${map.size} players (dynasty:${loaded.dynasty}, redraft:${loaded.redraft})`);
    return { map, loaded, source };
  },
};
