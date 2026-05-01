// API clients for Sleeper + FantasyCalc dynasty values.

const SLEEPER = 'https://api.sleeper.app/v1';
const FANTASYCALC = 'https://api.fantasycalc.com';

const PLAYERS_CACHE_KEY = 'sla:players:nfl';
const PLAYERS_CACHE_MS = 24 * 60 * 60 * 1000;
const VALUES_CACHE_KEY = 'sla:fcvalues';
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

// FantasyCalc dynasty values - public, no auth.
// Returns array of { player: {...}, value, redraftValue, ... }
export const fantasyCalc = {
  async values({ isDynasty = true, numQbs = 1, numTeams = 12, ppr = 1 } = {}) {
    const cacheKey = `${VALUES_CACHE_KEY}:${isDynasty}:${numQbs}:${numTeams}:${ppr}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.t && Date.now() - cached.t < VALUES_CACHE_MS) return cached.d;
    } catch {}
    const url = `${FANTASYCALC}/values/current?isDynasty=${isDynasty}&numQbs=${numQbs}&numTeams=${numTeams}&ppr=${ppr}`;
    const d = await getJSONsoft(url);
    if (!d) return [];
    try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), d })); } catch {}
    return d;
  },

  // Build a quick lookup keyed by Sleeper player_id from the FantasyCalc response.
  buildLookup(values) {
    const byId = new Map();
    for (const v of values || []) {
      const sleeperId = v.player?.sleeperId || v.player?.sleeper_id;
      if (sleeperId) byId.set(String(sleeperId), v.value || 0);
    }
    return byId;
  },
};
