// Sleeper League Analysis - main entry. mfa-inspired flow.

import { sleeper } from './src/api.js';
import {
  state, saveSession, loadSession, clearSession, resetLeagueState,
  savePrefs, loadPrefs, syncPrimary,
} from './src/state.js';
import { $, $$, el, showLoader, hideLoader, toast } from './src/helpers.js';
import { initRouter, setActiveTab } from './src/router.js';
import {
  discoverAvailableSeasons, setScopeLeagues, clearValues, refreshAllScope,
} from './src/data.js';

// ============ Helpers ============

function showView(id) {
  $$('.view').forEach(v => { v.hidden = v.id !== id; });
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',
    theme === 'dark' ? '#0a0f1f' : '#ffffff');
  savePrefs();
}
function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ============ Login ============

async function handleLogin(e) {
  e.preventDefault();
  const username = $('#usernameInput').value.trim();
  if (!username) return;
  $('#loginError').hidden = true;
  $('#loginBtn').disabled = true;
  showLoader(`Looking up ${username}…`);
  try {
    const user = await sleeper.user(username);
    if (!user) throw new Error(`User "${username}" not found`);
    state.user = user;
    saveSession();
    await loadAllUserLeagues();
  } catch (err) {
    $('#loginError').hidden = false;
    $('#loginError').textContent = err.message || 'Something went wrong.';
  } finally {
    $('#loginBtn').disabled = false;
    hideLoader();
  }
}

// Pull every league across the last few seasons and roll up to one entry per
// "league family" (linked via previous_league_id chains). Each family gets
// the most-recent leagueId as its representative + a season count.
async function loadAllUserLeagues() {
  showLoader('Finding leagues…');
  try {
    const userId = state.user.user_id;
    const currentYear = new Date().getFullYear();
    // Walk back up to 6 years.
    const years = [];
    for (let y = currentYear; y >= currentYear - 6; y--) years.push(String(y));

    // Fetch leagues for every year in parallel.
    const lists = await Promise.all(years.map(async y => {
      try { return { year: y, leagues: await sleeper.leaguesForUser(userId, y) || [] }; }
      catch { return { year: y, leagues: [] }; }
    }));

    // Walk previous_league_id chains: starting from each league's leagueId,
    // we form a "family" = all linked seasons. Newest-first ordering.
    const seenFamily = new Map(); // representative leagueId -> {family info}

    // First, index every league we know about by id for quick lookup.
    const byId = new Map();
    for (const { leagues } of lists) for (const lg of leagues) byId.set(lg.league_id, lg);

    // Helper: walk back through previous_league_id, returning the chain.
    async function walkBack(startId) {
      const chain = [];
      let cur = byId.get(startId);
      const visited = new Set();
      let safety = 25;
      while (cur && !visited.has(cur.league_id) && safety-- > 0) {
        visited.add(cur.league_id);
        chain.push(cur);
        const prevId = cur.previous_league_id;
        if (!prevId || prevId === '0') break;
        if (byId.has(prevId)) {
          cur = byId.get(prevId);
        } else {
          // Not in our user's league lists - fetch it directly so multi-season
          // chains that predate the user join still get counted.
          try {
            const lg = await sleeper.league(prevId);
            byId.set(prevId, lg);
            cur = lg;
          } catch { break; }
        }
      }
      return chain;
    }

    // Build families. Iterate newest year first so the representative is
    // always the newest season we have.
    const allLeagues = [];
    for (const lg of byId.values()) allLeagues.push(lg);
    allLeagues.sort((a, b) => Number(b.season) - Number(a.season));

    const claimedIds = new Set();
    for (const lg of allLeagues) {
      if (claimedIds.has(lg.league_id)) continue;
      const chain = await walkBack(lg.league_id);
      const repr = chain[0]; // newest
      const seasonCount = chain.length;
      seenFamily.set(repr.league_id, {
        leagueId: repr.league_id,
        name: repr.name,
        avatar: repr.avatar,
        season: repr.season,
        seasons: seasonCount,
        chain, // [{leagueId, season, ...}, ...]
        totalRosters: repr.total_rosters,
      });
      for (const c of chain) claimedIds.add(c.league_id);
    }

    state.leagueFamilies = [...seenFamily.values()]
      .sort((a, b) => Number(b.season) - Number(a.season));
    renderLeaguePicker();
    showView('view-leagues');
  } catch (err) {
    $('#loginError').hidden = false;
    $('#loginError').textContent = err.message;
    showView('view-login');
  } finally {
    hideLoader();
  }
}

// ============ League picker (multi-select) ============

function renderLeaguePicker() {
  const list = $('#leagueList');
  list.innerHTML = '';
  $('#leagueEmpty').hidden = state.leagueFamilies.length > 0;
  $('#leaguesUserHello').innerHTML = '';
  $('#leaguesUserHello').appendChild(el('span', {},
    'Leagues for ',
    el('strong', {}, state.user.display_name || state.user.username),
  ));

  state.selectedFamilies = new Set();

  for (const fam of state.leagueFamilies) {
    const item = el('div', {
      class: 'league-item',
      onclick: () => toggleFamilySelected(fam.leagueId),
    },
      el('div', { class: 'league-checkbox' }),
      el('div', { class: 'league-info' },
        el('div', { class: 'league-name' }, fam.name || 'Untitled'),
        el('div', { class: 'league-year' }, String(fam.season)),
        el('div', { class: 'seasons-pill' },
          fam.seasons === 1 ? '1 season' : `All ${fam.seasons} seasons`),
      ),
    );
    item.dataset.id = fam.leagueId;
    list.appendChild(item);
  }
  updateAnalyzeButton();
}

function toggleFamilySelected(id) {
  if (state.selectedFamilies.has(id)) state.selectedFamilies.delete(id);
  else state.selectedFamilies.add(id);
  // Refresh visual state.
  $$('.league-item').forEach(node => {
    node.classList.toggle('selected', state.selectedFamilies.has(node.dataset.id));
  });
  updateAnalyzeButton();
}

function updateAnalyzeButton() {
  const n = state.selectedFamilies?.size || 0;
  const btn = $('#analyzeBtn');
  btn.textContent = `Analyze ${n} League${n === 1 ? '' : 's'}`;
  btn.disabled = n === 0;
}

async function analyzeSelected() {
  const ids = [...state.selectedFamilies];
  if (!ids.length) return;
  showLoader(`Loading ${ids.length} league${ids.length === 1 ? '' : 's'}…`);
  try {
    const families = ids.map(id => state.leagueFamilies.find(f => f.leagueId === id)).filter(Boolean);
    state.activeFamilies = families;
    state.activeFamilyIds = new Set();    // empty = "All Leagues" active
    state.activeSeasonFilters = new Set(); // empty = "All seasons" active
    await loadFamilyData(families);
    applyActiveFilter();
    showView('view-dashboard');
    renderDashHead();
    renderScoringBar();
    updateValuesStatus();
    setActiveTab('overview');
  } catch (err) {
    alert(err.message || 'Failed to load leagues');
  } finally {
    hideLoader();
  }
}

// Load each selected family's full chain into scope. Each family contributes
// every linked season into state.scope.
async function loadFamilyData(families) {
  resetLeagueState();
  clearValues();
  // NFL state (for current week reference)
  if (!state.nflState) {
    try { state.nflState = await sleeper.nflState(); } catch {}
  }

  // Track which scope entries belong to which family so we can filter later.
  // Cleanest way: stamp each loaded scope entry with familyId after load.
  const scopeLeagueIds = [];
  const idToFamily = new Map();
  for (const fam of families) {
    for (const link of fam.chain) {
      scopeLeagueIds.push(link.league_id);
      idToFamily.set(link.league_id, fam.leagueId);
    }
  }
  await setScopeLeagues(scopeLeagueIds);
  // Stamp family origin on each loaded scope entry.
  for (const sc of state.scope) {
    sc._familyId = idToFamily.get(sc.leagueId) || null;
  }
  // Capture the full loaded set; state.scope will become a filtered view of it.
  state._allLoadedScope = state.scope.slice();

  state.primaryFamilyId = families[0]?.leagueId || null;
  state.availableSeasons = state.scope.map(s => ({
    leagueId: s.leagueId, season: s.season, name: s.league.name, avatar: s.league.avatar,
  }));
  saveSession();
}

// Apply the multi-select filter sets to derive state.scope from
// state._allLoadedScope. Empty set = "all" for that dimension.
function applyActiveFilter() {
  const all = state._allLoadedScope || [];
  const famSet = state.activeFamilyIds;
  const seasonSet = state.activeSeasonFilters;
  const famActive = famSet && famSet.size > 0;
  const seasonActive = seasonSet && seasonSet.size > 0;
  state.scope = all.filter(sc => {
    if (famActive && !famSet.has(sc._familyId)) return false;
    if (seasonActive && !seasonSet.has(String(sc.season))) return false;
    return true;
  });
  syncPrimary();
}

// ============ Dashboard rendering ============

function renderDashHead() {
  const famSet = state.activeFamilyIds || new Set();
  const seasonSet = state.activeSeasonFilters || new Set();
  const famNames = [...famSet]
    .map(id => state.activeFamilies.find(f => f.leagueId === id)?.name)
    .filter(Boolean);
  const seasonsArr = [...seasonSet].sort();

  // Page title reflects the active filters.
  let title = famNames.length === 0 ? 'All Leagues'
    : famNames.length === 1 ? famNames[0]
    : `${famNames.length} leagues`;
  if (seasonsArr.length === 1) title += ` · ${seasonsArr[0]}`;
  else if (seasonsArr.length > 1) title += ` · ${seasonsArr.length} seasons`;
  $('#leagueName').textContent = title;

  // YOUR STATS always visible. Reflects whatever scope is currently active.
  const card = $('#yourStatsCard');
  card.innerHTML = '';
  card.hidden = false;
  const userName = state.user.display_name || state.user.username;
  const subTitle = famNames.length === 0 ? 'All Leagues' :
    famNames.length === 1 ? famNames[0] : `${famNames.length} leagues`;
  const seasonSuffix = seasonsArr.length === 1 ? ` · ${seasonsArr[0]}` :
    seasonsArr.length > 1 ? ` · ${seasonsArr.length} seasons` : '';
  card.appendChild(el('div', { class: 'your-stats-title' },
    `YOUR STATS — ${userName} · ${subTitle}${seasonSuffix}`));
  const stats = computeYourStats();
  const grid = el('div', { class: 'your-stats-grid' });
  grid.appendChild(yourStatRow('Rank', stats.rank ? `#${stats.rank} of ${stats.outOf}` : '—'));
  grid.appendChild(yourStatRow('Record', `${stats.wins}-${stats.losses}`));
  grid.appendChild(yourStatRow('Avg PF', stats.avgPF.toFixed(1)));
  grid.appendChild(yourStatRow('Eff%', `${(stats.eff * 100).toFixed(1)}%`));
  grid.appendChild(yourStatRow('Luck', signed(stats.luck), stats.luck > 0 ? 'good' : stats.luck < 0 ? 'bad' : ''));
  grid.appendChild(yourStatRow('Avg PA', stats.avgPA.toFixed(1)));
  card.appendChild(grid);

  // League pills + season pills
  renderLeaguePills();
  renderSeasonPills();
}

function yourStatRow(label, value, tone = '') {
  return el('div', { class: 'your-stat' },
    el('span', { class: 'your-stat-label' }, label),
    el('span', { class: `your-stat-value ${tone}` }, value),
  );
}

function signed(n) {
  if (n > 0) return `+${n.toFixed(0)}`;
  if (n < 0) return `${n.toFixed(0)}`;
  return '0';
}

function renderLeaguePills() {
  const wrap = $('#leaguePills');
  wrap.innerHTML = '';
  const famSet = state.activeFamilyIds || new Set();

  // "All Leagues" pill is "active" when no specific families are selected.
  // Click clears the family filter set.
  wrap.appendChild(el('button', {
    class: `league-pill${famSet.size === 0 ? ' active' : ''}`,
    onclick: () => clearFamilyFilter(),
  }, 'All Leagues'));

  for (const fam of state.activeFamilies) {
    wrap.appendChild(el('button', {
      class: `league-pill${famSet.has(fam.leagueId) ? ' active' : ''}`,
      onclick: () => toggleFamily(fam.leagueId),
    }, `${fam.name} (${fam.season})`));
  }
}

function toggleFamily(id) {
  if (!state.activeFamilyIds) state.activeFamilyIds = new Set();
  if (state.activeFamilyIds.has(id)) state.activeFamilyIds.delete(id);
  else state.activeFamilyIds.add(id);
  // When the family selection changes, drop season filters that don't exist
  // in the new scope so the user isn't stuck looking at empty data.
  pruneInvalidSeasonFilters();
  applyActiveFilter();
  renderDashHead();
  setActiveTab(state.activeTab || 'overview');
}

function clearFamilyFilter() {
  state.activeFamilyIds = new Set();
  pruneInvalidSeasonFilters();
  applyActiveFilter();
  renderDashHead();
  setActiveTab(state.activeTab || 'overview');
}

function toggleSeason(year) {
  if (!state.activeSeasonFilters) state.activeSeasonFilters = new Set();
  if (state.activeSeasonFilters.has(year)) state.activeSeasonFilters.delete(year);
  else state.activeSeasonFilters.add(year);
  applyActiveFilter();
  renderDashHead();
  setActiveTab(state.activeTab || 'overview');
}

function clearSeasonFilter() {
  state.activeSeasonFilters = new Set();
  applyActiveFilter();
  renderDashHead();
  setActiveTab(state.activeTab || 'overview');
}

// If the user toggled families and some currently-selected seasons no longer
// exist in the resulting scope, drop them.
function pruneInvalidSeasonFilters() {
  const famSet = state.activeFamilyIds;
  if (!state.activeSeasonFilters || !state.activeSeasonFilters.size) return;
  const sourceScopes = (state._allLoadedScope || []).filter(sc =>
    !famSet || famSet.size === 0 || famSet.has(sc._familyId));
  const validYears = new Set(sourceScopes.map(sc => String(sc.season)));
  for (const y of [...state.activeSeasonFilters]) {
    if (!validYears.has(y)) state.activeSeasonFilters.delete(y);
  }
}

// Render the season filter pill row (multi-select).
function renderSeasonPills() {
  let bar = document.getElementById('seasonPills');
  if (!bar) {
    bar = el('div', { class: 'league-pills small-pills', id: 'seasonPills', style: 'padding-top: 0;' });
    const after = $('#leaguePills');
    after.parentNode.insertBefore(bar, after.nextSibling);
  }
  bar.innerHTML = '';

  // Pool of years to offer: years that exist in the family-filtered scope.
  const famSet = state.activeFamilyIds;
  const sourceScopes = (state._allLoadedScope || []).filter(sc =>
    !famSet || famSet.size === 0 || famSet.has(sc._familyId));
  const years = [...new Set(sourceScopes.map(sc => String(sc.season)))]
    .sort((a, b) => Number(b) - Number(a));

  if (years.length <= 1) { bar.hidden = true; return; }
  bar.hidden = false;

  const seasonSet = state.activeSeasonFilters || new Set();

  // "All seasons" pill is active when no specific seasons are selected.
  bar.appendChild(el('button', {
    class: `league-pill${seasonSet.size === 0 ? ' active' : ''}`,
    onclick: () => clearSeasonFilter(),
  }, 'All seasons'));

  for (const y of years) {
    bar.appendChild(el('button', {
      class: `league-pill${seasonSet.has(y) ? ' active' : ''}`,
      onclick: () => toggleSeason(y),
    }, y));
  }
}

// Compute the user's stats across their primary identity in every active scope.
// Owner_id (Sleeper user_id) is stable across seasons.
function computeYourStats() {
  const userId = state.user.user_id;
  let wins = 0, losses = 0, pf = 0, pa = 0, ppts = 0, games = 0;
  const familyTotals = {}; // for ranking, group by family

  for (const sc of state.scope) {
    const myRoster = sc.rosters.find(r => r.owner_id === userId);
    if (!myRoster) continue;
    const s = myRoster.settings || {};
    wins   += s.wins || 0;
    losses += s.losses || 0;
    const fp = (s.fpts || 0) + (s.fpts_decimal || 0) / 100;
    const pap = (s.fpts_against || 0) + (s.fpts_against_decimal || 0) / 100;
    const pp = (s.ppts || 0) + (s.ppts_decimal || 0) / 100;
    pf += fp; pa += pap; ppts += pp;
    games += (s.wins || 0) + (s.losses || 0) + (s.ties || 0);
  }

  // Rank: vs all rosters across all scope leagues, by win%.
  const ranks = [];
  for (const sc of state.scope) {
    for (const r of sc.rosters) {
      const s = r.settings || {};
      const w = s.wins || 0, l = s.losses || 0, t = s.ties || 0;
      const g = w + l + t;
      const pct = g ? (w + t * 0.5) / g : 0;
      ranks.push({ ownerId: r.owner_id, pct });
    }
  }
  ranks.sort((a, b) => b.pct - a.pct);
  // Find the user's first appearance (best of their entries)
  const myFirst = ranks.findIndex(x => x.ownerId === userId);
  const rank = myFirst >= 0 ? myFirst + 1 : 0;

  return {
    wins, losses,
    avgPF: games ? pf / games : 0,
    avgPA: games ? pa / games : 0,
    eff: ppts ? pf / ppts : 0,
    luck: wins - expectedWinsAcrossScope(userId),
    rank,
    outOf: ranks.length,
  };
}

function expectedWinsAcrossScope(userId) {
  // For each league, compute expected wins by ranking weekly scores against
  // league median. Sum across scope.
  let total = 0;
  for (const sc of state.scope) {
    const myRoster = sc.rosters.find(r => r.owner_id === userId);
    if (!myRoster) continue;
    const myId = myRoster.roster_id;
    for (const [, ms] of Object.entries(sc.matchupsByWeek || {})) {
      if (!ms?.length) continue;
      const played = ms.filter(m => (m.points || 0) > 0);
      if (played.length < 2) continue;
      const me = played.find(m => m.roster_id === myId);
      if (!me) continue;
      const beats = played.filter(m => m !== me && (me.points || 0) > (m.points || 0)).length;
      const tied  = played.filter(m => m !== me && (me.points || 0) === (m.points || 0)).length;
      total += (beats + tied * 0.5) / (played.length - 1);
    }
  }
  return total;
}

// ============ Refresh ============

async function handleRefresh() {
  const btn = $('#refreshBtn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('refreshing');
  try {
    await refreshAllScope();
    renderDashHead();
    setActiveTab(state.activeTab || 'overview');
    toast('Updated from Sleeper');
  } catch (err) {
    toast('Refresh failed: ' + (err.message || 'unknown error'));
  } finally {
    btn.disabled = false;
    btn.classList.remove('refreshing');
  }
}

// ============ Scoring pills (KTC / FC / Combined) ============

function renderScoringBar() {
  const pills = $('#scoringPills');
  if (!pills) return;
  pills.innerHTML = '';
  const options = [
    { id: 'combined', label: 'Combined' },
    { id: 'ktc',      label: 'KeepTradeCut' },
    { id: 'fc',       label: 'FantasyCalc' },
  ];
  for (const o of options) {
    const isActive = state.valuesSource === o.id;
    pills.appendChild(el('button', {
      class: `scope-pill${isActive ? ' active' : ''}`,
      onclick: () => setValuesSource(o.id),
    },
      isActive ? el('span', { class: 'pill-check' }, '✓ ') : null,
      o.label,
    ));
  }
}

function setValuesSource(src) {
  if (state.valuesSource === src) return;
  state.valuesSource = src;
  savePrefs();
  clearValues();
  renderScoringBar();
  updateValuesStatus();
  setActiveTab(state.activeTab || 'overview');
  setTimeout(updateValuesStatus, 1500);
  setTimeout(updateValuesStatus, 4000);
}

function updateValuesStatus() {
  const node = $('#valuesStatus');
  if (!node) return;
  const src = state.valuesSource;
  const loaded = state.valuesLoaded || { ktc: false, fc: false };
  let cls = '', msg;
  if (!state.values) msg = '';
  else if (src === 'ktc') {
    msg = loaded.ktc ? `KTC (${state.values.size} players)` : 'KTC unavailable';
    if (!loaded.ktc) cls = 'warn';
  } else if (src === 'fc') {
    msg = loaded.fc ? `FC (${state.values.size} players)` : 'FC unavailable';
    if (!loaded.fc) cls = 'bad';
  } else {
    if (loaded.ktc && loaded.fc) msg = `KTC + FC (${state.values.size} players)`;
    else if (loaded.fc) { msg = `FC only (${state.values.size})`; cls = 'warn'; }
    else if (loaded.ktc) { msg = `KTC only (${state.values.size})`; cls = 'warn'; }
    else { msg = 'No values loaded'; cls = 'bad'; }
  }
  node.textContent = msg;
  node.className = `scoring-status muted small ${cls}`;
}

// ============ Wire up ============

function wireUp() {
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#changeUserBtn').addEventListener('click', () => {
    showView('view-login');
  });
  $('#analyzeBtn').addEventListener('click', analyzeSelected);
  $('#backBtn').addEventListener('click', () => {
    if (state.leagueFamilies?.length) showView('view-leagues');
    else showView('view-login');
  });
  $('#refreshBtn').addEventListener('click', handleRefresh);

  ['themeToggleLogin', 'themeTogglePicker', 'themeToggleDash'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', toggleTheme);
  });

  // Tab nav
  $$('.tab-link[data-tab]').forEach(b => {
    b.addEventListener('click', () => setActiveTab(b.dataset.tab));
  });

  initRouter();
}

function bootstrap() {
  loadPrefs();
  applyTheme(state.theme || 'light');
  wireUp();
  renderScoringBar();
  const session = loadSession();
  if (session?.username) $('#usernameInput').value = session.username;
  showView('view-login');
}

bootstrap();

// ============ Exposed for router/tabs to use ============

export function refreshDashChrome() {
  renderDashHead();
  renderScoringBar();
  updateValuesStatus();
}
