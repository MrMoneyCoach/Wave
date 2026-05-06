// Sleeper Player Value — entry point.
import {
  getUserByName, getUserLeagues, getLeague, getRosters, getLeagueUsers,
  getAllPlayers, getSeasonStats, getSeasonProjections,
} from './src/api.js';
import { buildScoring, pointsFor, normalizeLeagueScoring, PRESETS } from './src/scoring.js';
import {
  ageScore, productionScore, computeOpportunity, compositeValue,
  computeTrend, applyTrendToOpportunity, getVolume, FANTASY_POSITIONS,
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
  // The "current" NFL season label is the year the season starts. Once Feb's
  // Super Bowl is over, the next league year (with new rosters, free agency,
  // draft) is conventionally referred to by the upcoming calendar year — so
  // include it in the dropdown well before September.
  const upcoming = now.getFullYear();
  const seasons = [];
  for (let y = upcoming; y >= upcoming - 6; y--) seasons.push(y);
  sel.innerHTML = seasons.map(y => `<option value="${y}">${y}</option>`).join('');
  // Default to upcoming — that's where dynasty rosters and projections live.
  sel.value = String(upcoming);
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

  const priorSeason = String(Number(state.season) - 1);
  const priorPriorSeason = String(Number(state.season) - 2);
  const nextSeason  = String(Number(state.season) + 1);
  // Real-world upcoming NFL season — typically what projections actually
  // exist for. NFL season is named by its starting calendar year.
  const now = new Date();
  const upcomingSeason = String(now.getMonth() >= 1 ? now.getFullYear() : now.getFullYear() - 1);
  // De-dupe the seasons we'll probe for projections.
  const projSeasonsToTry = [...new Set([upcomingSeason, nextSeason, state.season])];

  const tasks = [
    getAllPlayers(),
    getSeasonStats(state.season),
    getSeasonStats(priorSeason),
    getSeasonStats(priorPriorSeason),
    ...projSeasonsToTry.map(s => getSeasonProjections(s)),
  ];
  if (state.league) {
    tasks.push(getRosters(state.league.league_id));
    tasks.push(getLeagueUsers(state.league.league_id));
  }
  const results = await Promise.all(tasks);
  state.players = results[0];
  const statsSelected = results[1];
  const statsPrior = results[2];
  const statsPriorPrior = results[3];

  // Pick the freshest season whose realized stats are actually populated.
  // The selected season may have no data (offseason / current dynasty year),
  // in which case we fall back to last year for production + opportunity.
  // Trend always compares one season earlier than the production source.
  function statsRichness(s) {
    if (!s) return 0;
    let t = 0;
    for (const pid in s) t += Number(s[pid]?.pts_ppr) || 0;
    return t;
  }
  const STATS_RICH = 1000;  // any real season is in the hundreds of thousands
  if (statsRichness(statsSelected) >= STATS_RICH) {
    state.statsSeason = state.season;
    state.seasonStats = statsSelected;
    state.priorStats = statsPrior;
  } else if (statsRichness(statsPrior) >= STATS_RICH) {
    state.statsSeason = priorSeason;
    state.seasonStats = statsPrior;
    state.priorStats = statsPriorPrior;
  } else {
    state.statsSeason = priorPriorSeason;
    state.seasonStats = statsPriorPrior;
    state.priorStats = null;
  }
  console.log(`[playervalue] Using realized stats from ${state.statsSeason} (selected ${state.season}).`);

  // Pick the projection season — prefer the most-future season whose data
  // is rich enough to be real (not just ADP placeholders). Sleeper sometimes
  // returns thousands of placeholder entries (e.g. {adp_dd_ppr:18000, gp:18}
  // only) before projections are published; those score 0 on pts_ppr.
  function projectionScore(dict) {
    if (!dict) return 0;
    let total = 0;
    for (const pid in dict) {
      const v = dict[pid];
      if (!v) continue;
      const pts = Number(v.pts_ppr) || Number(v.pts_half_ppr) || Number(v.pts_std) || 0;
      total += pts;
    }
    return total;
  }
  const RICH_THRESHOLD = 10000;
  const ranked = projSeasonsToTry
    .map((s, i) => ({ season: s, data: results[4 + i], score: projectionScore(results[4 + i]) }))
    .filter(x => x.score > 0);
  for (const r of ranked) {
    console.log(`[playervalue] projection richness for ${r.season}: ${Math.round(r.score)} pts_ppr summed across ${r.data ? Object.keys(r.data).length : 0} players`);
  }
  // Among candidates with "rich enough" data, take the highest season number
  // (most future). If none are rich enough, fall back to the highest-scoring
  // available data so we still show something.
  const rich = ranked.filter(r => r.score >= RICH_THRESHOLD)
                     .sort((a, b) => Number(b.season) - Number(a.season));
  let chosenProj = null, chosenProjSeason = null;
  if (rich.length > 0) {
    chosenProj = rich[0].data;
    chosenProjSeason = rich[0].season;
  } else if (ranked.length > 0) {
    ranked.sort((a, b) => b.score - a.score);
    chosenProj = ranked[0].data;
    chosenProjSeason = ranked[0].season;
  }
  state.projStats = chosenProj || {};
  state.projSeason = chosenProjSeason || upcomingSeason;
  state.projAvailable = !!chosenProj;

  const offset = 4 + projSeasonsToTry.length;
  if (state.league) {
    state.rosters = results[offset];
    state.leagueUsers = results[offset + 1];
  }

  const useProjEl = document.getElementById('use-projections');
  useProjEl.disabled = !state.projAvailable;
  if (!state.projAvailable) {
    useProjEl.checked = false;
    useProjEl.parentElement.title = `No Sleeper projections returned for ${projSeasonsToTry.join(', ')}.`;
  } else {
    useProjEl.parentElement.title = `Projections loaded from Sleeper for ${chosenProjSeason}.`;
  }

  // If the user loaded an older season's league, check for a successor league
  // (e.g., they picked the 2025 league but a 2026 dynasty league for them
  // exists). Offer to switch — rosters / trades only reflect the season's
  // own snapshot, not subsequent years.
  await checkForSuccessorLeague();
  if (state.league) {
    state.rosters = results[5];
    state.leagueUsers = results[6];
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

  // Populate "Highlight team" dropdown with league rosters.
  const hl = document.getElementById('highlight-team');
  hl.innerHTML = '<option value="">None</option>';
  if (state.rosters && state.leagueUsers) {
    const items = state.rosters.map(r => {
      const u = state.leagueUsers.find(x => x.user_id === r.owner_id);
      const labelText = u?.metadata?.team_name || u?.display_name || `Team ${r.roster_id}`;
      return { rid: String(r.roster_id), label: labelText };
    }).sort((a, b) => a.label.localeCompare(b.label));
    for (const it of items) {
      const o = document.createElement('option');
      o.value = it.rid;
      o.textContent = it.label;
      hl.appendChild(o);
    }
  } else {
    hl.disabled = true;
  }

  bindControls();
  recomputeAndRender();
  status.textContent = '';
}

function bindControls() {
  // Idempotent: this function is called from mountApp(), which can run more
  // than once (league-switch flow). Re-binding listeners would multi-fire.
  if (state.ui.bound) return;
  state.ui.bound = true;
  const ids = ['preset', 'te-premium', 'superflex', 'combine-wrte', 'apply-trend',
              'use-projections', 'w-prod', 'w-opp', 'w-age',
              'filter-pos', 'min-games', 'rostered-only', 'ascending-only',
              'highlight-team', 'search'];
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
    ascendingOnly: document.getElementById('ascending-only').checked,
  };
  state.highlightTeam = document.getElementById('highlight-team').value;
  state.combineWRTE = document.getElementById('combine-wrte').checked;
  state.applyTrend = document.getElementById('apply-trend').checked;
  state.useProjections = document.getElementById('use-projections').checked;
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
  const rosterIdByPid = new Map();
  if (state.rosters) {
    for (const r of state.rosters) {
      const owner = state.leagueUsers?.find(u => u.user_id === r.owner_id);
      const tag = owner?.metadata?.team_name || owner?.display_name || `Team ${r.roster_id}`;
      const all = [...(r.players || []), ...(r.taxi || []), ...(r.reserve || [])];
      for (const pid of all) {
        rosterOwnerByPid.set(pid, tag);
        rosterIdByPid.set(pid, String(r.roster_id));
      }
    }
  }

  // Build candidate list from players.
  const realStats = state.seasonStats || {};
  const projStats = state.projStats || {};
  const useProj = !!state.useProjections;

  // One-time diagnostic: find the projection entry with the most fields
  // (i.e. a populated star player, not the first dict key which tends to be
  // an old/inactive player like player_id "17") and dump it.
  if (!state._projDumped) {
    const ids = Object.keys(projStats);
    let bestId = ids[0], bestSize = 0;
    for (const pid of ids) {
      const n = Object.keys(projStats[pid] || {}).length;
      if (n > bestSize) { bestSize = n; bestId = pid; }
    }
    if (bestId) {
      const player = state.players[bestId];
      console.log(
        `[playervalue] richest projection — player_id=${bestId}`,
        player ? `(${player.full_name}, ${player.position} ${player.team})` : '',
        '· fields:', Object.keys(projStats[bestId] || {}),
        '· values:', projStats[bestId],
      );
    }
    state._projDumped = true;
  }

  // The "primary" stat source drives production AND opportunity; the other
  // is still computed and surfaced as a side column.
  const primary = useProj ? projStats : realStats;
  const candidates = [];
  for (const pid in state.players) {
    const p = state.players[pid];
    if (!p || !p.position) continue;
    if (!FANTASY_POSITIONS.has(p.position)) continue;
    const s = primary[pid];
    const games = (s && s.gp) || 0;
    const pts = pointsFor(s, state.scoring, p.position);
    const ppg = games > 0 ? pts / games : 0;
    const vol = getVolume(s, p.position);
    // Always also compute realized fantasy points + projected fantasy points
    // so the user can see both side by side.
    const realPts = pointsFor(realStats[pid], state.scoring, p.position);
    const projPts = pointsFor(projStats[pid], state.scoring, p.position);
    candidates.push({
      ...p,
      _stats: s || {},
      _games: games,
      _targets: vol.targets,
      _carries: vol.carries,
      _attempts: vol.attempts,
      _pts: pts,
      _ppg: ppg,
      _realPts: realPts,
      _projPts: projPts,
      _projRealRatio: realPts > 5 ? projPts / realPts : null,
      _rostered: rosterOwnerByPid.has(pid),
      _rosteredBy: rosterOwnerByPid.get(pid) || null,
      _rosterId: rosterIdByPid.get(pid) || null,
      _highlight: state.highlightTeam && rosterIdByPid.get(pid) === state.highlightTeam,
    });
  }

  // Compute opportunity (needs full set so team totals are right).
  computeOpportunity(candidates, { combineWRTE: state.combineWRTE });
  // Compute prior-season trend and optionally fold into opportunity.
  computeTrend(candidates, state.priorStats);
  if (state.applyTrend) applyTrendToOpportunity(candidates);

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
    if (f.ascendingOnly) {
      // Show only players whose projection or trend signals upward role.
      // Either Proj is meaningfully higher than Real (>10%), or trend is
      // 'promoted', or the player has no prior-season production at all
      // (rookie/new starter) but does have a current projection.
      const ratio = p._projRealRatio;
      const ratioUp = (typeof ratio === 'number') && ratio > 1.1;
      const trendUp = p._trend === 'promoted';
      const newStarter = p._realPts < 5 && p._projPts > 50;
      if (!(ratioUp || trendUp || newStarter)) return false;
    }
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
  if (state.useProjections) {
    pills.push(`<span class="pill">FP source: projections (${state.projSeason})</span>`);
  } else {
    pills.push(`<span class="pill">FP source: realized (${state.statsSeason})</span>`);
  }
  if (state.statsSeason !== state.season) {
    pills.push(`<span class="pill" title="Selected season has no stats yet — using the most recent completed season for realized data. Rosters are still from your selected league.">Realized fallback: ${state.statsSeason}</span>`);
  }
  return pills.join('');
}

async function checkForSuccessorLeague() {
  if (!state.league || !state.user) return;
  const upcoming = String(new Date().getFullYear());
  if (String(state.season) === upcoming) return;
  try {
    const upcomingLeagues = await getUserLeagues(state.user.user_id, upcoming);
    if (!upcomingLeagues || upcomingLeagues.length === 0) return;
    // Walk the previous_league_id chain backwards from each upcoming league
    // and see if it leads to the currently-loaded league.
    let match = null;
    for (const lg of upcomingLeagues) {
      if (lg.previous_league_id === state.league.league_id) { match = lg; break; }
    }
    if (!match) return;
    const status = document.getElementById('status');
    status.innerHTML = `Showing ${state.season} rosters. A newer league exists for ${upcoming} (<a href="#" id="switch-league">switch to it</a>) — current rosters and trades live there.`;
    document.getElementById('switch-league').addEventListener('click', async (e) => {
      e.preventDefault();
      state.season = upcoming;
      state.league = match;
      saveSession();
      status.textContent = 'Switching league…';
      await mountApp();
    });
  } catch (e) {
    console.warn('successor-league lookup failed', e);
  }
}

function describeScoring(sc) {
  if (!sc) return 'PPR';
  const rec = Number(sc.rec) || 0;
  if (rec >= 1) return 'Full PPR';
  if (rec >= 0.5) return 'Half PPR';
  return 'Standard';
}
