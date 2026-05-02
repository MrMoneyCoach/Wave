// Overview tab — mfa-style: stat grid with colored top borders, standings table,
// Awards preview, Trade Highlights summary, Highest/Lowest scoring weeks.

import { el, fmtNum, fmtInt, fmtPct, teamName, playerLabel } from '../helpers.js';
import { state } from '../state.js';
import {
  ensureMatchups, ensureTransactions, ensurePlayers, ensureValues,
} from '../data.js';
import {
  computeStandings, computeAllPlay, computeWeeklyScores, flattenMatchups,
} from '../analytics.js';

export async function renderOverview(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);

  const lg = state.league;
  const playoffStart = lg?.settings?.playoff_week_start || 15;
  const lastReg = playoffStart - 1;
  const currentWeek = state.nflState?.week || lastReg;
  const maxWeek = String(state.nflState?.season) === String(lg?.season)
    ? Math.min(lastReg, currentWeek)
    : lastReg;

  // Stat cards (colored top borders) — uses already-loaded scope data.
  const statGrid = el('div', { class: 'stat-grid' });
  wrap.appendChild(statGrid);

  // Standings panel placeholder while we load matchups in background.
  const standingsPanel = el('section', { class: 'panel' },
    el('div', { class: 'panel-head' }, el('h3', {}, 'Standings')),
    el('div', { class: 'muted small' }, 'Loading…'),
  );
  wrap.appendChild(standingsPanel);

  // Trade Highlights placeholder
  const tradesPanel = el('section', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('h3', {}, 'Trade Highlights'),
      el('a', { href: '#trades', class: 'muted small' }, 'View all trades →'),
    ),
    el('div', { class: 'muted small' }, 'Loading trades…'),
  );
  wrap.appendChild(tradesPanel);

  // Highest/lowest scoring weeks placeholder
  const weeksPanel = el('section', { class: 'panel' },
    el('div', { class: 'panel-head' }, el('h3', {}, 'Highest scoring weeks')),
    el('div', { class: 'muted small' }, 'Loading…'),
  );
  wrap.appendChild(weeksPanel);

  const lowWeeksPanel = el('section', { class: 'panel' },
    el('div', { class: 'panel-head' }, el('h3', {}, 'Lowest scoring weeks')),
    el('div', { class: 'muted small' }, 'Loading…'),
  );
  wrap.appendChild(lowWeeksPanel);

  // Compute standings (no fetch needed)
  const standings = computeStandings();
  const seasonsAnalyzed = state.scope.length;
  const totalGames = state.scope.reduce((sum, sc) => {
    return sum + sc.rosters.reduce((s, r) => {
      const st = r.settings || {};
      return s + (st.wins || 0) + (st.losses || 0) + (st.ties || 0);
    }, 0);
  }, 0) / 2; // each game counted on both rosters

  const top = [...standings].sort((a, b) => b.pf - a.pf)[0];
  const bestEff = [...standings].filter(s => s.efficiency).sort((a, b) => b.efficiency - a.efficiency)[0];
  const bestRecord = [...standings].sort((a, b) => b.wins - a.wins)[0];

  // Render top stat grid
  statGrid.appendChild(statCard('purple', 'Seasons analyzed', String(seasonsAnalyzed),
    `${state.activeFamilies.length} league${state.activeFamilies.length === 1 ? '' : 's'}`));
  statGrid.appendChild(statCard('green',  'Games played', String(Math.round(totalGames)),
    'across all seasons'));
  statGrid.appendChild(statCard('green',  'Best record',
    bestRecord ? `${bestRecord.wins}-${bestRecord.losses}` : '—',
    bestRecord ? bestRecord.teamName : ''));
  statGrid.appendChild(statCard('orange', 'Avg points leader',
    top ? fmtNum(top.ppg, 1) : '—',
    top ? top.teamName : ''));
  statGrid.appendChild(statCard('purple', 'Most efficient',
    bestEff ? fmtPct(bestEff.efficiency, 1) : '—',
    bestEff ? bestEff.teamName : ''));

  // Background fetches for matchups + transactions
  Promise.all([ensureMatchups(maxWeek), ensurePlayers()]).then(() => {
    const allPlay = computeAllPlay(maxWeek);
    const weekly = computeWeeklyScores(maxWeek);

    // Most consistent (lowest stddev)
    const consistency = standings.map(s => {
      const games = weekly.byRoster[s.roster_id] || [];
      if (!games.length) return { ...s, stddev: Infinity };
      const mean = games.reduce((a, g) => a + g.points, 0) / games.length;
      const variance = games.reduce((a, g) => a + (g.points - mean) ** 2, 0) / games.length;
      return { ...s, stddev: Math.sqrt(variance) };
    }).sort((a, b) => a.stddev - b.stddev);

    if (consistency[0]) {
      statGrid.appendChild(statCard('green', 'Most consistent', `±${fmtNum(consistency[0].stddev, 1)}`,
        consistency[0].teamName));
    }

    // Render standings (full table)
    standingsPanel.innerHTML = '';
    standingsPanel.appendChild(el('div', { class: 'panel-head' },
      el('h3', {}, 'Standings'),
      el('a', { href: '#standings', class: 'muted small' }, 'Show all 17 columns →'),
    ));
    standingsPanel.appendChild(buildStandingsTable(standings.slice(0, 12), allPlay));

    // Highest / lowest scoring weeks
    const allWeeks = collectAllWeeklyScores(maxWeek);
    const top5 = [...allWeeks].sort((a, b) => b.points - a.points).slice(0, 5);
    const bottom5 = [...allWeeks].filter(w => w.points > 0).sort((a, b) => a.points - b.points).slice(0, 5);

    weeksPanel.innerHTML = '';
    weeksPanel.appendChild(el('div', { class: 'panel-head' }, el('h3', {}, 'Highest scoring weeks')));
    weeksPanel.appendChild(buildWeeksTable(top5));

    lowWeeksPanel.innerHTML = '';
    lowWeeksPanel.appendChild(el('div', { class: 'panel-head' }, el('h3', {}, 'Lowest scoring weeks')));
    lowWeeksPanel.appendChild(buildWeeksTable(bottom5));
  }).catch(err => {
    console.warn('Overview matchups load failed:', err);
  });

  // Trade highlights
  Promise.all([ensureTransactions(), ensurePlayers(), ensureValues()]).then(() => {
    tradesPanel.innerHTML = '';
    tradesPanel.appendChild(el('div', { class: 'panel-head' },
      el('h3', {}, 'Trade Highlights'),
      el('a', { href: '#trades', class: 'muted small' }, 'View all trades →'),
    ));
    const trades = collectAllTrades();
    if (!trades.length) {
      tradesPanel.appendChild(el('div', { class: 'muted small' }, 'No trades yet.'));
      return;
    }
    // Best traders + worst traders rolled up
    const counts = computeTraderTotals(trades);
    const best = [...counts].sort((a, b) => b.net - a.net).slice(0, 3);
    const worst = [...counts].sort((a, b) => a.net - b.net).slice(0, 3);

    tradesPanel.appendChild(traderBlock('Best Traders', best, 'best'));
    tradesPanel.appendChild(traderBlock('Worst Traders', worst, 'worst'));
  }).catch(err => {
    console.warn('Overview trades load failed:', err);
  });
}

function statCard(tone, label, value, sub = '') {
  return el('div', { class: `stat-card tone-${tone}` },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}

function buildStandingsTable(rows, allPlay = []) {
  const table = el('table', { class: 'data-table' });
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Team'),
    el('th', { class: 'num' }, 'W'),
    el('th', { class: 'num' }, 'L'),
    el('th', { class: 'num' }, 'Win%'),
    el('th', { class: 'num' }, 'PF'),
  )));
  const tbody = el('tbody');
  const userId = state.user?.user_id;
  rows.forEach((r) => {
    const ownerId = state.scope[0]?.rosters.find(x => x.roster_id === r.roster_id)?.owner_id;
    const isYou = ownerId === userId;
    tbody.appendChild(el('tr', isYou ? { class: 'you' } : {},
      el('td', {},
        el('div', { class: 'team-cell' },
          el('span', { class: 'team-name' }, r.teamName),
          isYou ? el('span', { class: 'you-tag' }, 'You') : null,
        ),
      ),
      el('td', { class: 'num' }, String(r.wins)),
      el('td', { class: 'num' }, String(r.losses)),
      el('td', { class: 'num' }, fmtPct(r.winPct, 1)),
      el('td', { class: 'num' }, fmtNum(r.pf, 1)),
    ));
  });
  table.appendChild(tbody);
  return el('div', { class: 'scrollable' }, table);
}

function collectAllWeeklyScores(maxWeek) {
  const out = [];
  for (const sc of state.scope) {
    for (let w = 1; w <= maxWeek; w++) {
      const ms = sc.matchupsByWeek[w] || [];
      for (const m of ms) {
        if ((m.points || 0) <= 0) continue;
        const roster = sc.rosters.find(r => r.roster_id === m.roster_id);
        const u = roster ? sc.users.find(u => u.user_id === roster.owner_id) : null;
        out.push({
          team: u?.metadata?.team_name || u?.display_name || `Team ${m.roster_id}`,
          league: sc.league.name,
          year: sc.season,
          week: w,
          points: m.points || 0,
        });
      }
    }
  }
  return out;
}

function buildWeeksTable(rows) {
  const table = el('table', { class: 'data-table' });
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Team'),
    el('th', {}, 'League'),
    el('th', {}, 'Year'),
    el('th', { class: 'num' }, 'Week'),
    el('th', { class: 'num' }, 'PF'),
  )));
  const tbody = el('tbody');
  rows.forEach(r => tbody.appendChild(el('tr', {},
    el('td', { style: 'font-weight: 600' }, r.team),
    el('td', { class: 'muted' }, r.league),
    el('td', { class: 'muted' }, String(r.year)),
    el('td', { class: 'num' }, String(r.week)),
    el('td', { class: 'num' }, fmtNum(r.points, 1)),
  )));
  table.appendChild(tbody);
  return el('div', { class: 'scrollable' }, table);
}

function collectAllTrades() {
  const all = [];
  for (const sc of state.scope) {
    for (const [week, txns] of Object.entries(sc.transactionsByWeek)) {
      for (const t of (txns || [])) {
        if (t.type !== 'trade' || t.status !== 'complete') continue;
        all.push({ ...t, _week: Number(week), _scope: sc });
      }
    }
  }
  return all;
}

// Compute net value per owner across trades
function computeTraderTotals(trades) {
  const totals = new Map(); // ownerId -> { trades, wins, losses, even, net }
  for (const t of trades) {
    const sides = (t.roster_ids || []).map(rid => {
      const roster = t._scope.rosters.find(r => r.roster_id === rid);
      const ownerId = roster?.owner_id;
      const players = Object.entries(t.adds || {}).filter(([, r]) => r === rid).map(([p]) => p);
      const value = players.reduce((s, p) => s + (state.values?.get(String(p)) || 0), 0);
      return { ownerId, value };
    });
    if (sides.length !== 2) continue;
    const [a, b] = sides;
    if (!a.ownerId || !b.ownerId) continue;
    if (!totals.has(a.ownerId)) totals.set(a.ownerId, { ownerId: a.ownerId, trades: 0, wins: 0, losses: 0, even: 0, net: 0 });
    if (!totals.has(b.ownerId)) totals.set(b.ownerId, { ownerId: b.ownerId, trades: 0, wins: 0, losses: 0, even: 0, net: 0 });
    const aT = totals.get(a.ownerId), bT = totals.get(b.ownerId);
    aT.trades++; bT.trades++;
    aT.net += (a.value - b.value);
    bT.net += (b.value - a.value);
    if (a.value > b.value)      { aT.wins++;  bT.losses++; }
    else if (b.value > a.value) { bT.wins++;  aT.losses++; }
    else                        { aT.even++;  bT.even++; }
  }
  return [...totals.values()].map(t => ({
    ...t,
    name: ownerName(t.ownerId),
  }));
}

function ownerName(ownerId) {
  for (const sc of state.scope) {
    const u = sc.users.find(u => u.user_id === ownerId);
    if (u) return u.display_name || `User ${ownerId}`;
  }
  return 'Unknown';
}

function traderBlock(title, list, kind) {
  const wrap = el('div', { class: `traders-block ${kind}`, style: 'margin-bottom: 12px;' },
    el('div', { class: 'traders-head' }, title),
  );
  list.forEach((t, i) => {
    const sign = t.net > 0 ? `+${fmtInt(t.net)}` : fmtInt(t.net);
    wrap.appendChild(el('div', { class: 'trader-row' },
      el('div', { class: 'trader-rank' }, String(i + 1)),
      el('div', {},
        el('div', { class: 'trader-name' }, t.name),
        el('div', { class: 'trader-sub' }, `${t.trades} trades · ${t.wins}W-${t.losses}L-${t.even}E`),
      ),
      el('div', {},
        el('div', { class: `trader-net ${t.net > 0 ? 'up' : t.net < 0 ? 'down' : ''}` }, sign),
        el('div', { class: 'trader-net-sub' }, 'net value'),
      ),
    ));
  });
  return wrap;
}
