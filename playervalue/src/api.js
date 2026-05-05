// Sleeper API client (browser-only, public endpoints).
// Docs: https://docs.sleeper.com/

const BASE = 'https://api.sleeper.app/v1';

const PLAYERS_KEY = 'pv:players:nfl';
const PLAYERS_TTL = 24 * 60 * 60 * 1000;  // 24h
const STATS_KEY = (season) => `pv:stats:${season}`;
const STATS_TTL = 6 * 60 * 60 * 1000;     // 6h
const PROJ_KEY  = (season) => `pv:proj:${season}`;
const PROJ_TTL  = 6 * 60 * 60 * 1000;     // 6h

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

function readCache(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (Date.now() - t > ttl) return null;
    return v;
  } catch { return null; }
}
function writeCache(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), v }));
  } catch { /* quota */ }
}

export async function getUserByName(username) {
  return getJSON(`${BASE}/user/${encodeURIComponent(username)}`);
}

export async function getUserLeagues(userId, season) {
  return getJSON(`${BASE}/user/${userId}/leagues/nfl/${season}`);
}

export async function getLeague(leagueId) {
  return getJSON(`${BASE}/league/${leagueId}`);
}

export async function getRosters(leagueId) {
  return getJSON(`${BASE}/league/${leagueId}/rosters`);
}

export async function getLeagueUsers(leagueId) {
  return getJSON(`${BASE}/league/${leagueId}/users`);
}

export async function getAllPlayers() {
  const cached = readCache(PLAYERS_KEY, PLAYERS_TTL);
  if (cached) return cached;
  const data = await getJSON(`${BASE}/players/nfl`);
  // Trim each player to fields we use, to fit in localStorage.
  const trimmed = {};
  for (const id in data) {
    const p = data[id];
    if (!p) continue;
    trimmed[id] = {
      player_id: p.player_id || id,
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
      position: p.position,
      fantasy_positions: p.fantasy_positions,
      team: p.team,
      age: p.age,
      years_exp: p.years_exp,
      depth_chart_order: p.depth_chart_order,
      depth_chart_position: p.depth_chart_position,
      injury_status: p.injury_status,
      status: p.status,
      number: p.number,
    };
  }
  writeCache(PLAYERS_KEY, trimmed);
  return trimmed;
}

// Season totals. We aggregate weekly stats; the per-week endpoint is the
// most reliable on Sleeper. Returns { player_id: { stat_key: number } }.
export async function getSeasonStats(season, { weeks = 18 } = {}) {
  const cacheKey = STATS_KEY(season);
  const cached = readCache(cacheKey, STATS_TTL);
  if (cached) return cached;

  // Fetch weeks in parallel; tolerate missing weeks (early season / future).
  const requests = [];
  for (let w = 1; w <= weeks; w++) {
    requests.push(getJSONsoft(`${BASE}/stats/nfl/regular/${season}/${w}`));
  }
  const weekly = await Promise.all(requests);

  const totals = {};
  for (const wk of weekly) {
    if (!wk || typeof wk !== 'object') continue;
    for (const pid in wk) {
      const stats = wk[pid];
      if (!stats) continue;
      // Some entries are { stats: {...}, player: {...} } shape, others are flat.
      const flat = stats.stats && typeof stats.stats === 'object' ? stats.stats : stats;
      const dest = totals[pid] || (totals[pid] = {});
      let played = false;
      for (const k in flat) {
        const v = flat[k];
        if (typeof v !== 'number' || !isFinite(v)) continue;
        dest[k] = (dest[k] || 0) + v;
        played = true;
      }
      if (played) dest.gp = (dest.gp || 0) + 1;
    }
  }

  // If the per-week endpoint produced nothing, fall back to season endpoint.
  if (Object.keys(totals).length === 0) {
    const season_only = await getJSONsoft(`${BASE}/stats/nfl/regular/${season}`);
    if (season_only) {
      for (const pid in season_only) {
        const s = season_only[pid];
        const flat = s && s.stats ? s.stats : s;
        if (flat && typeof flat === 'object') totals[pid] = { ...flat };
      }
    }
  }

  writeCache(cacheKey, totals);
  return totals;
}

// Sleeper's projections endpoint — undocumented but stable. Same shape as
// the per-week stats endpoint. We aggregate season totals client-side.
export async function getSeasonProjections(season, { weeks = 18 } = {}) {
  const cacheKey = PROJ_KEY(season);
  const cached = readCache(cacheKey, PROJ_TTL);
  if (cached) return cached;

  const requests = [];
  for (let w = 1; w <= weeks; w++) {
    requests.push(getJSONsoft(`${BASE}/projections/nfl/regular/${season}/${w}`));
  }
  const weekly = await Promise.all(requests);

  const totals = {};
  for (const wk of weekly) {
    if (!wk || typeof wk !== 'object') continue;
    for (const pid in wk) {
      const entry = wk[pid];
      if (!entry) continue;
      const flat = entry.stats && typeof entry.stats === 'object' ? entry.stats : entry;
      const dest = totals[pid] || (totals[pid] = {});
      let any = false;
      for (const k in flat) {
        const v = flat[k];
        if (typeof v !== 'number' || !isFinite(v)) continue;
        dest[k] = (dest[k] || 0) + v;
        any = true;
      }
      if (any) dest.gp = (dest.gp || 0) + 1;
    }
  }

  writeCache(cacheKey, totals);
  return totals;
}
