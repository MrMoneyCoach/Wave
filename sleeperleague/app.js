// Sleeper League Analysis - main entry.

import { sleeper } from './src/api.js';
import { state, saveSession, loadSession, clearSession, resetLeagueState } from './src/state.js';
import { $, $$, el, showLoader, hideLoader, avatarUrl } from './src/helpers.js';
import { initRouter, setActiveTab } from './src/router.js';

// ------ Helpers ------

function showView(id) {
  $$('.view').forEach(v => { v.hidden = v.id !== id; });
}

// ------ Login ------

function fillSeasons() {
  const sel = $('#seasonInput');
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
  showLoader('Loading league…');
  try {
    const [league, users, rosters, nflState] = await Promise.all([
      sleeper.league(leagueId),
      sleeper.leagueUsers(leagueId),
      sleeper.rosters(leagueId),
      state.nflState ? Promise.resolve(state.nflState) : sleeper.nflState(),
    ]);
    state.league = league;
    state.leagueUsers = users;
    state.rosters = rosters;
    state.nflState = nflState;
    saveSession();

    renderDashboardHead();
    initSeasonSwitcher();
    showView('view-dashboard');

    // Default to overview unless URL hash specifies otherwise.
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

  // Sidebar league badge
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

// Build season switcher: current league's season + any seasons reachable via previous_league_id.
async function initSeasonSwitcher() {
  const sw = $('#seasonSwitcher');
  sw.innerHTML = '';

  // Always include the currently loaded league season.
  const seasons = [{ season: state.league.season, leagueId: state.league.league_id }];
  // Walk back lazily (don't await full history here, just chain previous_league_ids).
  let prev = state.league.previous_league_id;
  let safety = 25;
  while (prev && prev !== '0' && safety-- > 0) {
    try {
      const lg = await sleeper.league(prev);
      seasons.push({ season: lg.season, leagueId: lg.league_id });
      prev = lg.previous_league_id;
    } catch { break; }
  }

  for (const s of seasons) {
    const opt = el('option', { value: s.leagueId }, String(s.season));
    if (s.leagueId === state.league.league_id) opt.selected = true;
    sw.appendChild(opt);
  }
  sw.onchange = () => {
    if (sw.value !== state.league.league_id) loadLeague(sw.value);
  };
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
  initRouter();
}

function bootstrap() {
  wireUp();
  const session = loadSession();
  if (session?.username) {
    $('#usernameInput').value = session.username;
  }
  showView('view-login');
}

bootstrap();
