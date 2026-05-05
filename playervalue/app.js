// Sleeper Player Value — entry point.
import {
  getUserByName, getUserLeagues, getLeague, getRosters, getLeagueUsers,
  getAllPlayers, getSeasonStats,
} from './src/api.js';
import { buildScoring, pointsFor, normalizeLeagueScoring, PRESETS } from './src/scoring.js';
import {
  ageScore, productionScore, computeOpportunity, compositeValue, FANTASY_POSITIONS,
} from './src/value.js';
import { renderTable, setupSortableHeaders } from './src/ui.js';

// --- Session state ---
const state = {
  user: null,
  season: null,
  league: null,           // selected league object (or null = all-NFL mode)
  rosters: null,
  leagueUsers: null,
  players: null,          // { player_id: minimal player obj }
  seasonStats: null,      // { player_id: stat totals }
  rows: [],               // enriched rows for the table
  scoring: null,
  weights: { prod: 60, opp: 25, age: 15 },
  filters: { pos: 'ALL', minGames: 4, rosteredOnly: false, search: '' },
  ui: {},
};

const SS_KEY = 'pv:session';
function saveSession() {
  try {
    localStorage.setItem(SS_KEY, JSON.stringify({
      username: state.user?.username,
      userId: state.user?.user_id,
      season: state.season,
      leagueId: state.league?.league_id || null,
    }));
  } catch {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SS_KEY) || 'null'); } catch { return null; }
}
function clearSession() { localStorage.removeItem(SS_KEY); }

// --- Boot ---
init().catch(err => { console.error(err); alert(err.message); });

async function init() {
  populateSeasons();
  bindLogin();
  // Restore session if any.
  const sess = loadSession();
  if (sess?.username && sess?.season) {
    document.getElementById('username').value = sess.username;
    document.getElementById('season').value = sess.season;
    if (sess.leagueId) {
      try {
        await loginFlow({ username: sess.username, season: sess.season, autoLeagueId: sess.leagueId });
        return;
      } catch (e) { console.warn('session restore failed', e); clearSession(); }
    }
  }
}

function populateSeasons() {
  const sel = document.getElementById('season');
  const now = new Date();
  // NFL season is conventionally labeled by the year it starts in (Sep–Feb).
  // If we're past August, current season is this year; else last year.
  const currentSeason = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const seasons = [];
  for (let y = currentSeason; y >= currentSeason - 5; y--) seasons.push(y);
  sel.innerHTML = seasons.map(y => `<option value="${y}">${y}</option>`).join('');
  // Default to most recent fully-completed season (last year).
  sel.value = String(currentSeason - 1);
}

function bindLogin() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const season = document.getElementById('season').value;
    const err = document.getElementById('login-error');
    err.textContent = '';
    if (!username) return;
    try {
      await loginFlow({ username, season });
    } catch (ex) {
      err.textContent = ex.message || String(ex);
    }
  });
  document.getElementById('skip-league').addEventListener('click', async (e) => {
    e.preventDefault();
    const season = document.getElementById('season').value;
    state.user = null;
    state.season = season;
    state.league = null;
    await mountApp();
  });
  document.getElementById('back-to-login').addEventListener('click', () => {
    document.getElementById('league-pick').classList.add('hidden');
    document.getElementById('login').classList.remove('hidden');
  });
  document.getElementById('logout').addEventListener('click', () => {
    clearSession();
    location.reload();
  });
}

async function loginFlow({ username, season, autoLeagueId }) {
  const user = await getUserByName(username);
  if (!user || !user.user_id) throw new Error(`User "${username}" not found`);
  state.user = user;
  state.season = season;
  const leagues = await getUserLeagues(user.user_id, season);
  if (autoLeagueId) {
    const lg = leagues.find(l => l.league_id === autoLeagueId) || await getLeague(autoLeagueId);
    state.league = lg;
    await mountApp();
    return;
  }
  if (!leagues || leagues.length === 0) {
    throw new Error(`No leagues for ${username} in ${season}.`);
  }
  showLeaguePicker(leagues);
}

function showLeaguePicker(leagues) {
  const ul = document.getElementById('league-list');
  ul.innerHTML = '';
  for (const lg of leagues) {
    const li = document.createElement('li');
    li.textContent = `${lg.name} — ${lg.total_rosters} teams · ${lg.scoring_settings?.rec ?? 0} PPR`;
    li.addEventListener('click', async () => {
      state.league = lg;
      await mountApp();
    });
    ul.appendChild(li);
  }
  document.getElementById('login').classList.add('hidden');
  document.getElementById('league-pick').classList.remove('hidden');
}

async function mountApp() {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('league-pick').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  saveSession();

  const status = document.getElementById('status');
  status.textContent = 'Loading players & stats…';

  const tasks = [getAllPlayers(), getSeasonStats(state.season)];
  if (state.league) {
    tasks.push(getRosters(state.league.league_id));
    tasks.push(getLeagueUsers(state.league.league_id));
  }
  const results = await Promise.all(tasks);
  state.players = results[0];
  state.seasonStats = results[1];
  if (state.league) {
    state.rosters = results[2];
    state.leagueUsers = results[3];
  }

  // Configure preset selector for league mode.
  const preset = document.getElementById('preset');
  preset.querySelector('option[value="league"]').disabled = !state.league;
  preset.value = state.league ? 'league' : 'ppr';

  // League label.
  const label = document.getElementById('league-label');
  if (state.league) {
    label.textContent = `${state.league.name} · ${state.season} · ${state.user?.display_name || state.user?.username || ''}`;
  } else {
    label.textContent = `All NFL · ${state.season}`;
    document.getElementById('rostered-only').disabled = true;
  }

  bindControls();
  recomputeAndRender();
  status.textContent = '';
}

function bindControls() {
  const ids = ['preset', 'te-premium', 'superflex', 'w-prod', 'w-opp', 'w-age',
              'filter-pos', 'min-games', 'rostered-only', 'search'];
  for (const id of ids) {
    const el = document.getElementById(id);
    el.addEventListener('input', recomputeAndRender);
    el.addEventListener('change', recomputeAndRender);
  }
  // Slider live labels.
  const live = (id, suffix = '%') => {
    const el = document.getElementById(id);
    const lbl = document.getElementById(id + '-label');
    if (lbl) {
      const update = () => lbl.textContent = el.value + suffix;
      el.addEventListener('input', update); update();
    }
  };
  live('w-prod'); live('w-opp'); live('w-age');
  const mg = document.getElementById('min-games');
  const mgl = document.getElementById('min-games-label');
  mg.addEventListener('input', () => mgl.textContent = mg.value);

  // Sortable columns.
  const table = document.getElementById('players');
  const tbody = table.querySelector('tbody');
  state.ui.sorter = setupSortableHeaders(table, () => state.rows, (rows) => renderTable(tbody, rows));
}

function readControls() {
  const preset = document.getElementById('preset').value;
  const tePremium = parseFloat(document.getElementById('te-premium').value);
  const superflex = document.getElementById('superflex').checked;
  state.scoring = buildScoring({
    preset,
    leagueScoring: state.league ? normalizeLeagueScoring(state.league.scoring_settings) : null,
    tePremium,
    superflex,
  });
  state.weights = {
    prod: +document.getElementById('w-prod').value,
    opp:  +document.getElementById('w-opp').value,
    age:  +document.getElementById('w-age').value,
  };
  state.filters = {
    pos: document.getElementById('filter-pos').value,
    minGames: +document.getElementById('min-games').value,
    rosteredOnly: document.getElementById('rostered-only').checked,
    search: document.getElementById('search').value.trim().toLowerCase(),
  };
}

function recomputeAndRender() {
  readControls();
  const rows = buildRows();
  state.rows = rows;
  // Title + summary pills.
  const title = document.getElementById('title');
  title.textContent = state.league
    ? `Player Value — ${state.league.name}`
    : `Player Value — All NFL`;
  document.getElementById('summary').innerHTML = summaryPills(rows);
  // Default sort by value desc.
  state.ui.sorter.resort();
}

function buildRows() {
  const playerIdsByRoster = new Map();
  const rosterOwnerByPid = new Map();
  if (state.rosters) {
    for (const r of state.rosters) {
      const owner = state.leagueUsers?.find(u => u.user_id === r.owner_id);
      const tag = owner?.metadata?.team_name || owner?.display_name || `Team ${r.roster_id}`;
      const all = [...(r.players || []), ...(r.taxi || []), ...(r.reserve || [])];
      for (const pid of all) {
        rosterOwnerByPid.set(pid, tag);
      }
    }
  }

  // Build candidate list from players.
  const stats = state.seasonStats || {};
  const candidates = [];
  for (const pid in state.players) {
    const p = state.players[pid];
    if (!p || !p.position) continue;
    if (!FANTASY_POSITIONS.has(p.position)) continue;
    const s = stats[pid];
    const games = (s && s.gp) || 0;
    // We still include 0-game players for opportunity-driven (rookie/starter) appearances.
    const pts = pointsFor(s, state.scoring, p.position);
    const ppg = games > 0 ? pts / games : 0;
    candidates.push({
      ...p,
      _stats: s || {},
      _games: games,
      _pts: pts,
      _ppg: ppg,
      _rostered: rosterOwnerByPid.has(pid),
      _rosteredBy: rosterOwnerByPid.get(pid) || null,
    });
  }

  // Compute opportunity (needs full set so team totals are right).
  computeOpportunity(candidates);

  // Group by position to compute production percentile.
  const byPos = new Map();
  for (const p of candidates) {
    const arr = byPos.get(p.position) || byPos.set(p.position, []).get(p.position);
    arr.push(p);
  }
  for (const arr of byPos.values()) arr.sort((a, b) => a._ppg - b._ppg);

  // Annotate sub-scores and composite.
  for (const p of candidates) {
    const cohort = byPos.get(p.position) || [];
    p._prodScore = productionScore(p, cohort);
    p._ageScore = ageScore(p.age, p.position);
    // Superflex bumps QBs' production and opportunity weighting effectively
    // by giving them a small composite boost (their cohort is QB-only so
    // production score is already calibrated; superflex makes them more
    // valuable across positions).
    let value = compositeValue(p._prodScore, p._opportunity, p._ageScore, state.weights);
    if (state.scoring._superflex && p.position === 'QB') {
      value *= 1.15;
    }
    p._value = value;
  }

  // Filter.
  const f = state.filters;
  return candidates.filter(p => {
    if (f.pos !== 'ALL') {
      if (f.pos === 'FLEX') {
        if (!['RB','WR','TE'].includes(p.position)) return false;
      } else if (p.position !== f.pos) {
        return false;
      }
    }
    if (p._games < f.minGames) {
      // Allow 0-game starters in opportunity flow only when min-games is 0.
      return false;
    }
    if (f.rosteredOnly && !p._rostered) return false;
    if (f.search) {
      const name = (p.full_name || `${p.first_name} ${p.last_name}`).toLowerCase();
      if (!name.includes(f.search)) return false;
    }
    return true;
  });
}

function summaryPills(rows) {
  const pills = [];
  pills.push(`<span class="pill">${rows.length} players</span>`);
  pills.push(`<span class="pill">Scoring: ${describeScoring(state.scoring)}</span>`);
  pills.push(`<span class="pill">Weights: prod ${state.weights.prod} · opp ${state.weights.opp} · age ${state.weights.age}</span>`);
  if (state.scoring._superflex) pills.push(`<span class="pill">Superflex</span>`);
  if (state.scoring._tePremium) pills.push(`<span class="pill">TE +${state.scoring._tePremium}</span>`);
  return pills.join('');
}

function describeScoring(sc) {
  if (!sc) return 'PPR';
  const rec = Number(sc.rec) || 0;
  if (rec >= 1) return 'Full PPR';
  if (rec >= 0.5) return 'Half PPR';
  return 'Standard';
}
