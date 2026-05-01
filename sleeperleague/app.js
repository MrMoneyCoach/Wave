// Sleeper League Analysis - vanilla JS, no build step.
// All data comes from the public Sleeper API: https://docs.sleeper.com/

const API = 'https://api.sleeper.app/v1';
const PLAYERS_CACHE_KEY = 'sla:players:nfl';
const PLAYERS_CACHE_MS = 24 * 60 * 60 * 1000; // 24h
const SESSION_KEY = 'sla:session';

// -------------------- Sleeper API client --------------------

const api = {
  async user(username) {
    const r = await fetch(`${API}/user/${encodeURIComponent(username)}`);
    if (!r.ok) throw new Error(`User "${username}" not found`);
    return r.json();
  },
  async leaguesForUser(userId, season) {
    const r = await fetch(`${API}/user/${userId}/leagues/nfl/${season}`);
    if (!r.ok) throw new Error('Could not load leagues');
    return r.json();
  },
  async league(leagueId) {
    const r = await fetch(`${API}/league/${leagueId}`);
    if (!r.ok) throw new Error('Could not load league');
    return r.json();
  },
  async leagueUsers(leagueId) {
    const r = await fetch(`${API}/league/${leagueId}/users`);
    if (!r.ok) throw new Error('Could not load league users');
    return r.json();
  },
  async rosters(leagueId) {
    const r = await fetch(`${API}/league/${leagueId}/rosters`);
    if (!r.ok) throw new Error('Could not load rosters');
    return r.json();
  },
  async matchups(leagueId, week) {
    const r = await fetch(`${API}/league/${leagueId}/matchups/${week}`);
    if (!r.ok) return [];
    return r.json();
  },
  async transactions(leagueId, week) {
    const r = await fetch(`${API}/league/${leagueId}/transactions/${week}`);
    if (!r.ok) return [];
    return r.json();
  },
  async nflState() {
    const r = await fetch(`${API}/state/nfl`);
    if (!r.ok) throw new Error('Could not load NFL state');
    return r.json();
  },
  async draftPicks(draftId) {
    const r = await fetch(`${API}/draft/${draftId}/picks`);
    if (!r.ok) return [];
    return r.json();
  },
  async leagueDrafts(leagueId) {
    const r = await fetch(`${API}/league/${leagueId}/drafts`);
    if (!r.ok) return [];
    return r.json();
  },
  async players() {
    try {
      const cached = JSON.parse(localStorage.getItem(PLAYERS_CACHE_KEY) || 'null');
      if (cached && cached.t && Date.now() - cached.t < PLAYERS_CACHE_MS) {
        return cached.d;
      }
    } catch {}
    const r = await fetch(`${API}/players/nfl`);
    if (!r.ok) throw new Error('Could not load players');
    const d = await r.json();
    try {
      localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify({ t: Date.now(), d }));
    } catch {
      // 5MB+ may exceed quota in some browsers - silently skip caching.
    }
    return d;
  },
};

// -------------------- App state --------------------

const state = {
  user: null,
  season: null,
  leagues: [],
  league: null,
  leagueUsers: [],
  rosters: [],
  players: null,
  matchupsByWeek: {},   // week -> [matchups]
  transactionsByWeek: {}, // week -> [transactions]
  nflState: null,
  activeTab: 'overview',
};

// -------------------- DOM helpers --------------------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function showLoader(text = 'Loading…') {
  $('#loaderText').textContent = text;
  $('#loader').hidden = false;
}
function hideLoader() {
  $('#loader').hidden = true;
}

function showView(id) {
  $$('.view').forEach(v => { v.hidden = v.id !== id; });
  $('#topnav').hidden = id !== 'view-dashboard';
}

function fmtNum(n, digits = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(digits);
}

function teamName(rosterId) {
  const roster = state.rosters.find(r => r.roster_id === rosterId);
  if (!roster) return `Team ${rosterId}`;
  const u = state.leagueUsers.find(u => u.user_id === roster.owner_id);
  if (!u) return `Team ${rosterId}`;
  return u.metadata?.team_name || u.display_name || `Team ${rosterId}`;
}

function ownerName(userId) {
  const u = state.leagueUsers.find(u => u.user_id === userId);
  return u?.display_name || 'Unknown';
}

function avatarUrl(avatarId, size = 'thumbs') {
  if (!avatarId) return null;
  return `https://sleepercdn.com/avatars/${size}/${avatarId}`;
}

function playerLabel(playerId) {
  if (!playerId) return 'Unknown';
  const p = state.players?.[playerId];
  if (!p) return playerId;
  const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || playerId;
  const meta = [p.position, p.team].filter(Boolean).join(' · ');
  return meta ? `${name} (${meta})` : name;
}

function pickLabel(pick) {
  // pick: { season, round, roster_id, owner_id, previous_owner_id }
  return `${pick.season} Round ${pick.round}`;
}

// -------------------- Session persistence --------------------

function saveSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId: state.user?.user_id,
      username: state.user?.username,
      displayName: state.user?.display_name,
      avatar: state.user?.avatar,
      season: state.season,
      leagueId: state.league?.league_id,
    }));
  } catch {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// -------------------- Login flow --------------------

function fillSeasons() {
  const sel = $('#seasonInput');
  const now = new Date();
  // Sleeper season rolls over in the summer; default to current year.
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
    const user = await api.user(username);
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

async function showLeaguePicker() {
  showLoader('Finding leagues…');
  try {
    const leagues = await api.leaguesForUser(state.user.user_id, state.season);
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
    `${state.user.display_name || state.user.username} · ${state.season} season · ${state.leagues.length} league${state.leagues.length === 1 ? '' : 's'}`;
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
          `${lg.total_rosters} teams · ${lg.settings?.playoff_week_start ? `playoffs week ${lg.settings.playoff_week_start}` : 'standard'}${lg.status === 'complete' ? ' · season complete' : ''}`
        ),
      ),
    );
    list.appendChild(card);
  }
}

async function loadLeague(leagueId) {
  showLoader('Loading league…');
  try {
    const [league, users, rosters, nflState] = await Promise.all([
      api.league(leagueId),
      api.leagueUsers(leagueId),
      api.rosters(leagueId),
      state.nflState ? Promise.resolve(state.nflState) : api.nflState(),
    ]);
    state.league = league;
    state.leagueUsers = users;
    state.rosters = rosters;
    state.nflState = nflState;
    state.matchupsByWeek = {};
    state.transactionsByWeek = {};
    saveSession();

    // Load players in background (cached, big file).
    if (!state.players) {
      showLoader('Loading player database (one-time, cached)…');
      state.players = await api.players();
    }

    renderDashboard();
    setActiveTab('overview');
    showView('view-dashboard');
  } catch (err) {
    alert(err.message || 'Failed to load league');
  } finally {
    hideLoader();
  }
}

// -------------------- Dashboard shell --------------------

function renderDashboard() {
  const lg = state.league;
  $('#leagueName').textContent = lg.name || 'League';
  const meta = [
    `${lg.season} season`,
    `${lg.total_rosters} teams`,
    lg.scoring_settings?.rec === 1 ? 'Full PPR' : lg.scoring_settings?.rec === 0.5 ? 'Half PPR' : 'Standard',
    lg.status === 'complete' ? 'Complete' : `Week ${state.nflState?.week || '—'}`,
  ];
  $('#leagueMeta').textContent = meta.filter(Boolean).join(' · ');
}

function setActiveTab(tab) {
  state.activeTab = tab;
  $$('.nav-btn[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab-panel').forEach(p => { p.hidden = p.id !== `tab-${tab}`; });
  if (tab === 'overview') renderOverview();
  else if (tab === 'trades') renderTrades();
  else if (tab === 'matchups') renderMatchups();
  else if (tab === 'rosters') renderRosters();
}

// -------------------- Standings calc --------------------

function computeStandings() {
  return state.rosters
    .map(r => {
      const s = r.settings || {};
      const wins = s.wins || 0;
      const losses = s.losses || 0;
      const ties = s.ties || 0;
      const pf = (s.fpts || 0) + (s.fpts_decimal || 0) / 100;
      const pa = (s.fpts_against || 0) + (s.fpts_against_decimal || 0) / 100;
      const ppts = (s.ppts || 0) + (s.ppts_decimal || 0) / 100;
      const games = wins + losses + ties;
      const winPct = games ? (wins + ties * 0.5) / games : 0;
      return {
        roster_id: r.roster_id,
        owner_id: r.owner_id,
        teamName: teamName(r.roster_id),
        owner: ownerName(r.owner_id),
        wins, losses, ties, pf, pa, ppts, winPct,
        efficiency: ppts ? pf / ppts : 0,
      };
    })
    .sort((a, b) => b.winPct - a.winPct || b.pf - a.pf);
}

// -------------------- OVERVIEW tab --------------------

function renderOverview() {
  const panel = $('#tab-overview');
  const standings = computeStandings();
  const totalPF = standings.reduce((s, t) => s + t.pf, 0);
  const avgPF = standings.length ? totalPF / standings.length : 0;
  const top = [...standings].sort((a, b) => b.pf - a.pf)[0];
  const lowest = [...standings].sort((a, b) => a.pf - b.pf)[0];
  const bestEff = [...standings].sort((a, b) => b.efficiency - a.efficiency)[0];

  panel.innerHTML = '';
  panel.appendChild(el('div', { class: 'stat-row' },
    statCard('League average PF', fmtNum(avgPF, 1)),
    statCard('Top scorer', top ? top.teamName : '—', top ? `${fmtNum(top.pf, 1)} pts` : ''),
    statCard('Lowest scorer', lowest ? lowest.teamName : '—', lowest ? `${fmtNum(lowest.pf, 1)} pts` : ''),
    statCard('Most efficient lineup', bestEff ? bestEff.teamName : '—', bestEff ? `${fmtNum(bestEff.efficiency * 100, 1)}% of max` : ''),
  ));

  const table = el('table', { class: 'data-table' });
  table.appendChild(el('thead', {},
    el('tr', {},
      el('th', {}, '#'),
      el('th', {}, 'Team'),
      el('th', { class: 'num' }, 'W'),
      el('th', { class: 'num' }, 'L'),
      el('th', { class: 'num' }, 'T'),
      el('th', { class: 'num' }, 'PF'),
      el('th', { class: 'num' }, 'PA'),
      el('th', { class: 'num', title: 'Maximum points possible if optimal lineup played' }, 'Max PF'),
      el('th', { class: 'num', title: 'Points scored / max points' }, 'Eff %'),
    )
  ));
  const tbody = el('tbody');
  standings.forEach((t, i) => {
    tbody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', {},
        el('div', { class: 'team-cell' },
          el('div', { class: 'team-name' }, t.teamName),
          el('div', { class: 'muted small' }, '@' + t.owner),
        )
      ),
      el('td', { class: 'num' }, String(t.wins)),
      el('td', { class: 'num' }, String(t.losses)),
      el('td', { class: 'num' }, String(t.ties)),
      el('td', { class: 'num' }, fmtNum(t.pf, 1)),
      el('td', { class: 'num' }, fmtNum(t.pa, 1)),
      el('td', { class: 'num' }, fmtNum(t.ppts, 1)),
      el('td', { class: 'num' }, t.efficiency ? fmtNum(t.efficiency * 100, 1) + '%' : '—'),
    ));
  });
  table.appendChild(tbody);

  panel.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Standings'),
    table,
  ));
}

function statCard(label, value, sub = '') {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value),
    sub && el('div', { class: 'stat-sub muted small' }, sub),
  );
}

// -------------------- TRADES tab --------------------

async function ensureTransactionsLoaded() {
  // Pull transactions for all played weeks (1..currentWeek or playoff_week_start - 1 + a buffer).
  const lg = state.league;
  const lastWeek = Math.max(
    lg.settings?.playoff_week_start ? lg.settings.playoff_week_start + 4 : 17,
    state.nflState?.week || 0,
    18,
  );
  const weeks = [];
  for (let w = 1; w <= lastWeek; w++) {
    if (!(w in state.transactionsByWeek)) weeks.push(w);
  }
  if (!weeks.length) return;
  showLoader(`Loading transactions for ${weeks.length} weeks…`);
  await Promise.all(weeks.map(async w => {
    state.transactionsByWeek[w] = await api.transactions(state.league.league_id, w);
  }));
  hideLoader();
}

async function renderTrades() {
  const panel = $('#tab-trades');
  panel.innerHTML = '';
  panel.appendChild(el('div', { class: 'muted' }, 'Loading trades…'));
  await ensureTransactionsLoaded();

  // Flatten all trades across weeks.
  const trades = [];
  for (const [week, txns] of Object.entries(state.transactionsByWeek)) {
    for (const t of txns) {
      if (t.type === 'trade' && t.status === 'complete') {
        trades.push({ ...t, _week: Number(week) });
      }
    }
  }
  trades.sort((a, b) => (b.status_updated || 0) - (a.status_updated || 0));

  panel.innerHTML = '';

  // Header: count + per-team trade counts.
  const counts = {};
  for (const t of trades) {
    for (const rid of (t.roster_ids || [])) counts[rid] = (counts[rid] || 0) + 1;
  }
  const topTraders = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  panel.appendChild(el('div', { class: 'stat-row' },
    statCard('Total trades', String(trades.length)),
    statCard('Active traders', String(Object.keys(counts).length)),
    statCard('Most active trader',
      topTraders[0] ? teamName(Number(topTraders[0][0])) : '—',
      topTraders[0] ? `${topTraders[0][1]} trades` : ''),
    statCard('Latest trade',
      trades[0] ? `Week ${trades[0]._week}` : '—',
      trades[0] && trades[0].status_updated ? new Date(trades[0].status_updated).toLocaleDateString() : ''),
  ));

  if (!trades.length) {
    panel.appendChild(el('div', { class: 'panel empty-panel' },
      el('h3', {}, 'No trades yet'),
      el('p', { class: 'muted' }, 'When teams in this league complete a trade, it will show up here with a full breakdown of players and picks exchanged.'),
    ));
    return;
  }

  const list = el('div', { class: 'trade-list' });
  for (const t of trades) {
    list.appendChild(renderTradeCard(t));
  }
  panel.appendChild(el('section', { class: 'panel' },
    el('h3', {}, `All trades (${trades.length})`),
    list,
  ));
}

function renderTradeCard(t) {
  // Build received/sent map per roster.
  const rosters = t.roster_ids || [];
  const received = {}; // roster_id -> { players: [], picks: [], faab: 0 }
  for (const rid of rosters) received[rid] = { players: [], picks: [], faab: 0 };

  // adds: { player_id: roster_id_who_received } - this is where "who got what player" comes from
  if (t.adds) {
    for (const [pid, rid] of Object.entries(t.adds)) {
      if (!received[rid]) received[rid] = { players: [], picks: [], faab: 0 };
      received[rid].players.push(pid);
    }
  }
  // draft picks
  if (Array.isArray(t.draft_picks)) {
    for (const p of t.draft_picks) {
      const rid = p.owner_id;
      if (!received[rid]) received[rid] = { players: [], picks: [], faab: 0 };
      received[rid].picks.push(p);
    }
  }
  // FAAB budget moved
  if (Array.isArray(t.waiver_budget)) {
    for (const w of t.waiver_budget) {
      const rid = w.receiver;
      if (!received[rid]) received[rid] = { players: [], picks: [], faab: 0 };
      received[rid].faab += w.amount || 0;
    }
  }

  const date = t.status_updated ? new Date(t.status_updated) : null;
  const head = el('div', { class: 'trade-head' },
    el('div', { class: 'trade-week' }, `Week ${t._week}`),
    date && el('div', { class: 'muted small' }, date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })),
  );

  const sides = el('div', { class: 'trade-sides' });
  for (const rid of rosters) {
    const r = received[rid] || { players: [], picks: [], faab: 0 };
    const side = el('div', { class: 'trade-side' },
      el('div', { class: 'trade-team' }, teamName(rid)),
      el('div', { class: 'trade-received' },
        el('div', { class: 'muted small' }, 'Received'),
        ...r.players.map(pid => el('div', { class: 'asset asset-player' }, playerLabel(pid))),
        ...r.picks.map(p => el('div', { class: 'asset asset-pick' }, pickLabel(p))),
        r.faab ? el('div', { class: 'asset asset-faab' }, `$${r.faab} FAAB`) : null,
        (!r.players.length && !r.picks.length && !r.faab) ? el('div', { class: 'asset asset-empty' }, '—') : null,
      ),
    );
    sides.appendChild(side);
  }

  return el('article', { class: 'trade-card' }, head, sides);
}

// -------------------- MATCHUPS tab --------------------

async function ensureMatchupsLoaded(maxWeek) {
  const weeks = [];
  for (let w = 1; w <= maxWeek; w++) {
    if (!(w in state.matchupsByWeek)) weeks.push(w);
  }
  if (!weeks.length) return;
  showLoader(`Loading matchups for ${weeks.length} weeks…`);
  await Promise.all(weeks.map(async w => {
    state.matchupsByWeek[w] = await api.matchups(state.league.league_id, w);
  }));
  hideLoader();
}

async function renderMatchups() {
  const panel = $('#tab-matchups');
  panel.innerHTML = '';
  panel.appendChild(el('div', { class: 'muted' }, 'Loading matchups…'));

  const lg = state.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const lastRegSeasonWeek = playoffStart - 1;
  const currentWeek = state.nflState?.week || 18;
  const maxWeek = Math.min(lastRegSeasonWeek, currentWeek);

  await ensureMatchupsLoaded(Math.max(maxWeek, 1));

  // Build pairings per week.
  const allMatchups = []; // [{week, a, b, pointsA, pointsB, margin}]
  for (let w = 1; w <= maxWeek; w++) {
    const mus = state.matchupsByWeek[w] || [];
    if (!mus.length) continue;
    const byMatch = {};
    for (const m of mus) {
      if (m.matchup_id == null) continue;
      (byMatch[m.matchup_id] = byMatch[m.matchup_id] || []).push(m);
    }
    for (const [, pair] of Object.entries(byMatch)) {
      if (pair.length !== 2) continue;
      const [a, b] = pair[0].points >= pair[1].points ? pair : [pair[1], pair[0]];
      allMatchups.push({
        week: w,
        a: a.roster_id, b: b.roster_id,
        pointsA: a.points || 0, pointsB: b.points || 0,
        margin: (a.points || 0) - (b.points || 0),
        combined: (a.points || 0) + (b.points || 0),
      });
    }
  }

  const blowouts = [...allMatchups].sort((x, y) => y.margin - x.margin).slice(0, 5);
  const closest = [...allMatchups].filter(m => m.pointsA > 0 || m.pointsB > 0)
    .sort((x, y) => x.margin - y.margin).slice(0, 5);
  const highScoring = [...allMatchups].sort((x, y) => y.combined - x.combined).slice(0, 5);

  panel.innerHTML = '';

  panel.appendChild(el('div', { class: 'stat-row' },
    statCard('Weeks played', String(maxWeek)),
    statCard('Total matchups', String(allMatchups.length)),
    statCard('Biggest blowout',
      blowouts[0] ? `${fmtNum(blowouts[0].margin, 1)} pts` : '—',
      blowouts[0] ? `${teamName(blowouts[0].a)} vs ${teamName(blowouts[0].b)} · W${blowouts[0].week}` : ''),
    statCard('Closest finish',
      closest[0] ? `${fmtNum(closest[0].margin, 1)} pts` : '—',
      closest[0] ? `${teamName(closest[0].a)} vs ${teamName(closest[0].b)} · W${closest[0].week}` : ''),
  ));

  panel.appendChild(matchupListPanel('Biggest blowouts', blowouts));
  panel.appendChild(matchupListPanel('Closest finishes', closest));
  panel.appendChild(matchupListPanel('Highest combined scores', highScoring));

  // Per-week table.
  const weekly = el('section', { class: 'panel' }, el('h3', {}, 'Week by week'));
  for (let w = maxWeek; w >= 1; w--) {
    const wMatchups = allMatchups.filter(m => m.week === w);
    if (!wMatchups.length) continue;
    const wDiv = el('div', { class: 'week-block' },
      el('div', { class: 'week-head' }, `Week ${w}`),
      el('div', { class: 'matchup-grid' },
        ...wMatchups.sort((x, y) => y.combined - x.combined).map(m => matchupRow(m))
      ),
    );
    weekly.appendChild(wDiv);
  }
  panel.appendChild(weekly);
}

function matchupListPanel(title, items) {
  if (!items.length) return el('section', { class: 'panel empty-panel' }, el('h3', {}, title), el('p', { class: 'muted' }, 'No data yet.'));
  const grid = el('div', { class: 'matchup-grid' });
  items.forEach(m => grid.appendChild(matchupRow(m, true)));
  return el('section', { class: 'panel' }, el('h3', {}, title), grid);
}

function matchupRow(m, showWeek = false) {
  return el('div', { class: 'matchup-row' },
    showWeek && el('div', { class: 'matchup-week' }, `W${m.week}`),
    el('div', { class: 'matchup-team winner' },
      el('span', { class: 'mt-name' }, teamName(m.a)),
      el('span', { class: 'mt-score' }, fmtNum(m.pointsA, 1)),
    ),
    el('div', { class: 'matchup-vs' }, 'vs'),
    el('div', { class: 'matchup-team' },
      el('span', { class: 'mt-name' }, teamName(m.b)),
      el('span', { class: 'mt-score' }, fmtNum(m.pointsB, 1)),
    ),
    el('div', { class: 'matchup-margin' }, `${fmtNum(m.margin, 1)} pts`),
  );
}

// -------------------- ROSTERS tab --------------------

function renderRosters() {
  const panel = $('#tab-rosters');
  panel.innerHTML = '';
  const grid = el('div', { class: 'roster-grid' });
  const sorted = [...state.rosters].sort((a, b) => {
    const tnA = teamName(a.roster_id).toLowerCase();
    const tnB = teamName(b.roster_id).toLowerCase();
    return tnA.localeCompare(tnB);
  });
  for (const roster of sorted) {
    grid.appendChild(rosterCard(roster));
  }
  panel.appendChild(grid);
}

function rosterCard(roster) {
  const players = roster.players || [];
  const starters = new Set(roster.starters || []);
  const ir = new Set(roster.reserve || []);
  const taxi = new Set(roster.taxi || []);

  // Group players by position; starters first.
  const startersList = (roster.starters || []).filter(p => p && p !== '0');
  const benchList = players.filter(p => !starters.has(p) && !ir.has(p) && !taxi.has(p));
  const irList = [...ir];
  const taxiList = [...taxi];

  const u = state.leagueUsers.find(u => u.user_id === roster.owner_id);
  const avatar = u?.avatar ? avatarUrl(u.avatar, 'thumbs') : null;

  const head = el('div', { class: 'roster-head' },
    avatar ? el('img', { src: avatar, alt: '', class: 'roster-avatar' }) : el('div', { class: 'roster-avatar placeholder' }),
    el('div', { class: 'roster-id' },
      el('div', { class: 'roster-team' }, teamName(roster.roster_id)),
      el('div', { class: 'muted small' }, '@' + ownerName(roster.owner_id)),
    ),
    el('div', { class: 'roster-record muted small' },
      `${roster.settings?.wins || 0}–${roster.settings?.losses || 0}${roster.settings?.ties ? '–' + roster.settings.ties : ''}`
    ),
  );

  const sections = [];
  if (startersList.length) sections.push(rosterSection('Starters', startersList));
  if (benchList.length) sections.push(rosterSection('Bench', benchList));
  if (irList.length) sections.push(rosterSection('IR', irList));
  if (taxiList.length) sections.push(rosterSection('Taxi', taxiList));

  return el('article', { class: 'card roster-card' }, head, ...sections);
}

function rosterSection(title, ids) {
  return el('div', { class: 'roster-section' },
    el('div', { class: 'roster-section-title' }, title),
    el('ul', { class: 'roster-players' },
      ...ids.map(id => el('li', {}, playerLabel(id))),
    ),
  );
}

// -------------------- Wire up --------------------

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
  $$('.nav-btn[data-tab]').forEach(b => {
    b.addEventListener('click', () => setActiveTab(b.dataset.tab));
  });
}

async function bootstrap() {
  wireUp();
  const session = loadSession();
  if (session?.username) {
    $('#usernameInput').value = session.username;
  }
  // Don't auto-login - let user kick it off so they see the landing page.
  // (Could add ?auto=1 to URL to auto-resume in the future.)
  showView('view-login');
}

bootstrap();
