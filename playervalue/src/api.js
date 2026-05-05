// Sleeper API client (browser-only, public endpoints).
// Docs: https://docs.sleeper.com/

const BASE = 'https://api.sleeper.app/v1';

const PLAYERS_KEY = 'pv:players:nfl';
const PLAYERS_TTL = 24 * 60 * 60 * 1000;  // 24h
const STATS_KEY = (season) => `pv:stats:${season}`;
const STATS_TTL = 6 * 60 * 60 * 1000;     // 6h
// v3 — added multi-URL probe and upcoming-season fetch.
const PROJ_KEY  = (season) => `pv:proj3:${season}`;
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

// Sleeper's projections endpoint is undocumented and lives under TWO different
// hostnames with different response shapes:
//   1) api.sleeper.com (newer, used by web app) — returns an ARRAY of objects:
//      [{ player_id, stats: {...}, ... }, ...]. Requires position[] filters
//      or you get an empty array.
//   2) api.sleeper.app/projections/... (older, no /v1) — returns a DICT keyed
//      by player_id: { "1234": {...stats...}, ... }
// We try (1) first, fall back to (2). We aggregate season totals client-side.
const PROJ_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

function projUrls(season, week) {
  const qs = PROJ_POSITIONS.map(p => `position[]=${p}`).join('&');
  return [
    // 1) api.sleeper.com — returns ARRAY of projection rows. Newest endpoint.
    { kind: 'array', url: `https://api.sleeper.com/projections/nfl/${season}/${week}?season_type=regular&${qs}` },
    // 2) api.sleeper.app /v1 — referenced by older community libraries.
    { kind: 'dict',  url: `https://api.sleeper.app/v1/projections/nfl/regular/${season}/${week}` },
    // 3) api.sleeper.app no /v1 — sometimes works.
    { kind: 'dict',  url: `https://api.sleeper.app/projections/nfl/regular/${season}/${week}` },
  ];
}

function normalizeProjResponse(kind, data) {
  if (!data) return null;
  if (kind === 'array') {
    if (!Array.isArray(data) || data.length === 0) return null;
    const dict = {};
    for (const row of data) {
      if (row && row.player_id) dict[row.player_id] = row.stats || row;
    }
    return dict;
  }
  if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0) return data;
  return null;
}

// Probe URLs once for week 1 to pick the working pattern; then reuse it for
// all subsequent weeks of that season.
async function pickProjectionPattern(season) {
  const urls = projUrls(season, 1);
  for (const u of urls) {
    const data = await getJSONsoft(u.url);
    const norm = normalizeProjResponse(u.kind, data);
    console.log(`[playervalue] projections probe ${u.url} → ${norm ? Object.keys(norm).length + ' players' : 'empty'}`);
    if (norm) {
      // Dump one raw row so we can see the actual shape Sleeper sends.
      const sampleRaw = Array.isArray(data) ? data.find(r => r && r.stats && Object.keys(r.stats).length > 3) || data[0] : Object.values(data)[0];
      console.log(`[playervalue] sample raw projection row for ${season}:`, sampleRaw);
      return u;
    }
  }
  return null;
}

export async function getSeasonProjections(season, { weeks = 18 } = {}) {
  const cacheKey = PROJ_KEY(season);
  const cached = readCache(cacheKey, PROJ_TTL);
  if (cached && Object.keys(cached).length > 0) return cached;

  // Pick a working URL pattern once for week 1; reuse for the rest.
  const pattern = await pickProjectionPattern(season);
  if (!pattern) {
    console.warn(`[playervalue] No Sleeper projections endpoint returned data for season ${season}.`);
    writeCache(cacheKey, {});
    return {};
  }
  console.log(`[playervalue] Using projections pattern for ${season}: ${pattern.url.split('?')[0]}`);

  // Build URLs for weeks 2..N from the same kind.
  const requests = [];
  for (let w = 2; w <= weeks; w++) {
    const u = projUrls(season, w).find(x => x.kind === pattern.kind && x.url.startsWith(pattern.url.split('/').slice(0, 4).join('/')));
    requests.push(getJSONsoft(u.url).then(d => normalizeProjResponse(u.kind, d)));
  }
  const week1 = await getJSONsoft(pattern.url).then(d => normalizeProjResponse(pattern.kind, d));
  const rest = await Promise.all(requests);
  const weekly = [week1, ...rest];

  const totals = {};
  let weeksWithData = 0;
  for (const wk of weekly) {
    if (!wk || typeof wk !== 'object') continue;
    let any = false;
    for (const pid in wk) {
      const entry = wk[pid];
      if (!entry) continue;
      const flat = entry.stats && typeof entry.stats === 'object' ? entry.stats : entry;
      const dest = totals[pid] || (totals[pid] = {});
      let pany = false;
      for (const k in flat) {
        const v = flat[k];
        if (typeof v !== 'number' || !isFinite(v)) continue;
        dest[k] = (dest[k] || 0) + v;
        pany = true;
      }
      if (pany) { dest.gp = (dest.gp || 0) + 1; any = true; }
    }
    if (any) weeksWithData++;
  }

  console.log(`[playervalue] Projections ${season}: ${weeksWithData}/${weeks} weeks with data, ${Object.keys(totals).length} players.`);
  writeCache(cacheKey, totals);
  return totals;
}
