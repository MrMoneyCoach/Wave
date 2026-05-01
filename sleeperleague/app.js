// Sleeper League Analysis - main entry.

import { sleeper } from './src/api.js';
import {
  state, saveSession, loadSession, clearSession, resetLeagueState,
  savePrefs, loadPrefs, syncPrimary,
} from './src/state.js';
import { $, $$, el, showLoader, hideLoader, avatarUrl, toast } from './src/helpers.js';
import { initRouter, setActiveTab } from './src/router.js';
import {
  discoverAvailableSeasons, setScopeLeagues, clearValues, refreshAllScope,
} from './src/data.js';

// ------ Helpers ------

function showView(id) {
  $$('.view').forEach(v => { v.hidden = v.id !== id; });
}

// ------ Theme ------

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

// ------ Login ------

function fillSeasons() {
  const sel = $('#seasonInput');
  sel.innerHTML = '';
  const now = new Date();
  const currentYear = now.getFullYear();
  for (let y = currentYear; y >= currentYear - 6; y--) {
    sel.appendChild(el('option', { value: String(y) }, String(y)));
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = $('#usernameInput').value.trim();
  const season = $('#seasonInput').value;
  if (!username) return;
  $('#loginError').hidden = true;
  $('#loginBtn').disabled = true;
  showLoader(`Looking up ${username}…`);
  try {
    const user = await sleeper.user(username);
    if (!user) throw new Error(`User "${username}" not found`);
    state.user = user;
    state.season = season;
    saveSession();
    await showLeaguePicker();
  } catch (err) {
    $('#loginError').hidden = false;
    $('#loginError').textContent = err.message || 'Something went wrong.';
  } finally {
    $('#loginBtn').disabled = false;
    hideLoader();
  }
}

// ------ League picker ------

async function showLeaguePicker() {
  showLoader('Finding leagues…');
  try {
    const leagues = await sleeper.leaguesForUser(state.user.user_id, state.season);
    state.leagues = leagues || [];
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

function renderLeaguePicker() {
  $('#leaguesUserHello').textContent =
    `${state.user.display_name || state.user.username} · ${state.season} · ${state.leagues.length} league${state.leagues.length === 1 ? '' : 's'}`;
  const list = $('#leagueList');
  list.innerHTML = '';
  $('#leagueEmpty').hidden = state.leagues.length > 0;
  for (const lg of state.leagues) {
    const card = el('button', { class: 'card league-card', onclick: () => loadLeague(lg.league_id) },
      el('div', { class: 'league-avatar' }, lg.avatar
        ? el('img', { src: avatarUrl(lg.avatar, 'thumbs'), alt: '' })
        : el('span', { class: 'league-initial' }, (lg.name || '?').charAt(0).toUpperCase())
      ),
      el('div', { class: 'league-meta' },
        el('div', { class: 'league-name' }, lg.name || 'Untitled league'),
        el('div', { class: 'muted small' },
          `${lg.total_rosters} teams · ${lg.scoring_settings?.rec === 1 ? 'Full PPR' : lg.scoring_settings?.rec === 0.5 ? 'Half PPR' : 'Standard'}${lg.status === 'complete' ? ' · complete' : ''}`
        ),
      ),
    );
    list.appendChild(card);
  }
}

// ------ Dashboard ------

async function loadLeague(leagueId) {
  resetLeagueState();
  clearValues();
  showLoader('Loading league…');
  try {
    const [league, users, rosters, nflState] = await Promise.all([
      sleeper.league(leagueId),
      sleeper.leagueUsers(leagueId),
      sleeper.rosters(leagueId),
      state.nflState ? Promise.resolve(state.nflState) : sleeper.nflState(),
    ]);
    state.nflState = nflState;

    // Seed the primary scope.
    state.scope = [{
      leagueId,
      season: league.season,
      league,
      users,
      rosters,
      matchupsByWeek: {},
      transactionsByWeek: {},
      drafts: [],
      draftPicks: {},
      ready: true,
    }];
    syncPrimary();
    saveSession();

    renderDashboardHead();

    // Discover linked past seasons (for the scope picker), then render scope bar.
    discoverAvailableSeasons().then(renderScopeBar).catch(() => renderScopeBar());

    showView('view-dashboard');

    // Default tab.
    const hashTab = location.hash.replace(/^#/, '');
    setActiveTab(hashTab || 'overview');
  } catch (err) {
    alert(err.message || 'Failed to load league');
  } finally {
    hideLoader();
  }
}

function renderDashboardHead() {
  const lg = state.league;
  $('#leagueName').textContent = lg.name || 'League';
  const meta = [
    `${lg.season} season`,
    `${lg.total_rosters} teams`,
    lg.scoring_settings?.rec === 1 ? 'Full PPR' : lg.scoring_settings?.rec === 0.5 ? 'Half PPR' : 'Standard',
    lg.status === 'complete' ? 'Complete' : `Week ${state.nflState?.week || '—'}`,
  ];
  $('#leagueMeta').textContent = meta.filter(Boolean).join(' · ');

  const sb = $('#sidebarLeague');
  sb.innerHTML = '';
  sb.appendChild(el('div', { class: 'league-avatar', style: 'width: 32px; height: 32px;' },
    lg.avatar ? el('img', { src: avatarUrl(lg.avatar, 'thumbs'), alt: '' }) :
      el('span', { class: 'league-initial' }, (lg.name || '?').charAt(0).toUpperCase()),
  ));
  sb.appendChild(el('div', { style: 'min-width: 0; flex: 1' },
    el('div', { class: 'sl-name' }, lg.name || 'League'),
    el('div', { class: 'sl-sub' }, `${lg.season} · ${lg.total_rosters} teams`),
  ));
}

// Render the multi-year scope bar (pills).
function renderScopeBar() {
  const bar = $('#scopeBar');
  const pills = $('#scopePills');
  pills.innerHTML = '';

  const seasons = state.availableSeasons;
  if (seasons.length <= 1) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;

  const activeIds = new Set(state.scope.map(s => s.leagueId));

  for (const s of seasons) {
    const isActive = activeIds.has(s.leagueId);
    const pill = el('button', {
      class: `scope-pill${isActive ? ' active' : ''}`,
      onclick: () => toggleScopeSeason(s.leagueId),
    },
      isActive ? el('span', { class: 'pill-check' }, '✓ ') : null,
      String(s.season),
    );
    pills.appendChild(pill);
  }

  // "All" pill: when not all selected, click to select all; when all selected, click to keep only newest.
  const allActive = activeIds.size === seasons.length;
  pills.appendChild(el('button', {
    class: `scope-pill${allActive ? ' active' : ''}`,
    onclick: async () => {
      if (allActive) {
        await applyScope([seasons[0].leagueId]);
      } else {
        await applyScope(seasons.map(s => s.leagueId));
      }
    },
  }, allActive ? '✓ All' : 'All'));
}

async function toggleScopeSeason(leagueId) {
  const activeIds = state.scope.map(s => s.leagueId);
  const next = activeIds.includes(leagueId)
    ? activeIds.filter(id => id !== leagueId)
    : [...activeIds, leagueId];
  // Always keep at least one season active.
  if (!next.length) return;
  await applyScope(next);
}

async function applyScope(leagueIds) {
  showLoader('Updating selection…');
  try {
    await setScopeLeagues(leagueIds);
    renderDashboardHead();
    renderScopeBar();
    // Re-render the active tab with the new scope.
    setActiveTab(state.activeTab || 'overview');
  } catch (err) {
    console.error(err);
    alert('Failed to update selection: ' + err.message);
  } finally {
    hideLoader();
  }
}

// ------ Refresh ------

async function handleRefresh() {
  const btn = $('#refreshBtn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('refreshing');
  try {
    await refreshAllScope();
    renderDashboardHead();
    setActiveTab(state.activeTab || 'overview');
    toast('Updated from Sleeper');
  } catch (err) {
    toast('Refresh failed: ' + (err.message || 'unknown error'));
  } finally {
    btn.disabled = false;
    btn.classList.remove('refreshing');
  }
}

// ------ Settings (values source) ------

function initValuesSource() {
  const sel = $('#valuesSourceSelect');
  sel.value = state.valuesSource;
  sel.addEventListener('change', () => {
    state.valuesSource = sel.value;
    savePrefs();
    clearValues();
    // Re-render active tab so dependent tabs (Trades/Rosters/Drafts) refresh.
    setActiveTab(state.activeTab || 'overview');
  });
}

// ------ Wire up ------

function wireUp() {
  fillSeasons();
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#changeUserBtn').addEventListener('click', () => {
    state.leagues = [];
    showView('view-login');
  });
  $('#switchLeagueBtn').addEventListener('click', () => {
    showLeaguePicker();
  });
  $('#logoutBtn').addEventListener('click', () => {
    clearSession();
    state.user = null;
    state.league = null;
    state.leagues = [];
    showView('view-login');
  });
  $('#sidebarToggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });
  $('#refreshBtn').addEventListener('click', handleRefresh);

  // Theme toggles in three places: login, picker, sidebar.
  ['themeToggleLogin', 'themeTogglePicker', 'themeToggleSidebar'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', toggleTheme);
  });

  initValuesSource();
  initRouter();
}

function bootstrap() {
  loadPrefs();
  applyTheme(state.theme || 'light');
  wireUp();
  const session = loadSession();
  if (session?.username) {
    $('#usernameInput').value = session.username;
  }
  showView('view-login');
}

bootstrap();
