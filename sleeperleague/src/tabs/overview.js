// Overview tab: top-level summary card + recent activity.

import { el, fmtNum, fmtInt, fmtPct, teamCell, teamName } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups, ensureTransactions, ensurePlayers } from '../data.js';
import { computeStandings, computeAllPlay, flattenMatchups } from '../analytics.js';
import { playerLabel } from '../helpers.js';

export async function renderOverview(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);

  const lg = state.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const lastReg = playoffStart - 1;
  const currentWeek = state.nflState?.week || lastReg;
  const maxWeek = String(state.nflState?.season) === String(lg.season)
    ? Math.min(lastReg, currentWeek)
    : lastReg;

  // Quick standings snapshot (no extra fetch needed)
  const standings = computeStandings();
  const top = [...standings].sort((a, b) => b.pf - a.pf)[0];
  const leader = standings[0];

  wrap.appendChild(el('div', { class: 'stat-row' },
    statCard('Leader', leader ? leader.teamName : '—', leader ? `${leader.wins}–${leader.losses}${leader.ties ? '–'+leader.ties : ''}` : ''),
    statCard('Top scorer', top ? top.teamName : '—', top ? `${fmtNum(top.pf, 1)} pts` : ''),
    statCard('Avg PPG (league)', fmtNum(standings.reduce((s, t) => s + t.ppg, 0) / Math.max(1, standings.length), 1)),
    statCard('Most efficient', mostEff(standings), ''),
  ));

  // Show standings table inline so the user lands on something useful immediately.
  wrap.appendChild(standingsPanel(standings));

  // Below: weekly highlights (load matchups in background) + recent trades.
  const sideBySide = el('div', { class: 'two-col' });
  wrap.appendChild(sideBySide);

  const matchupsPanel = el('section', { class: 'panel' },
    el('h3', {}, 'Recent matchups'),
    el('div', { class: 'muted small' }, 'Loading…'),
  );
  sideBySide.appendChild(matchupsPanel);

  const tradesPanel = el('section', { class: 'panel' },
    el('h3', {}, 'Recent trades'),
    el('div', { class: 'muted small' }, 'Loading…'),
  );
  sideBySide.appendChild(tradesPanel);

  // Fire both in parallel.
  ensureMatchups(maxWeek).then(() => {
    matchupsPanel.innerHTML = '';
    matchupsPanel.appendChild(el('h3', {}, 'Recent matchups'));
    const all = flattenMatchups(maxWeek);
    if (!all.length) {
      matchupsPanel.appendChild(el('div', { class: 'muted small' }, 'No matchups played yet.'));
      return;
    }
    const recent = all.filter(m => m.week === all[all.length - 1]?.week)
      .sort((a, b) => b.combined - a.combined);
    const grid = el('div', { class: 'matchup-grid' });
    recent.forEach(m => grid.appendChild(matchupRow(m)));
    matchupsPanel.appendChild(el('div', { class: 'week-head' }, `Week ${recent[0]?.week ?? '—'}`));
    matchupsPanel.appendChild(grid);
  }).catch(() => {});

  Promise.all([ensurePlayers(), ensureTransactions()]).then(() => {
    tradesPanel.innerHTML = '';
    tradesPanel.appendChild(el('h3', {}, 'Recent trades'));
    const trades = collectTrades();
    if (!trades.length) {
      tradesPanel.appendChild(el('div', { class: 'muted small' }, 'No trades yet this season.'));
      return;
    }
    const list = el('div', { class: 'trade-list' });
    trades.slice(0, 4).forEach(t => list.appendChild(simpleTradeRow(t)));
    tradesPanel.appendChild(list);
  }).catch(() => {});
}

function statCard(label, value, sub) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value || '—'),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}

function mostEff(standings) {
  const best = [...standings].filter(s => s.efficiency).sort((a, b) => b.efficiency - a.efficiency)[0];
  return best ? `${best.teamName} · ${fmtPct(best.efficiency, 1)}` : '—';
}

function standingsPanel(standings) {
  const table = el('table', { class: 'data-table' });
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Team'),
    el('th', { class: 'num' }, 'W'),
    el('th', { class: 'num' }, 'L'),
    el('th', { class: 'num' }, 'PF'),
    el('th', { class: 'num' }, 'PA'),
    el('th', { class: 'num' }, 'PPG'),
  )));
  const tbody = el('tbody');
  standings.forEach((t, i) => {
    tbody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', {}, teamCell(t.roster_id)),
      el('td', { class: 'num' }, String(t.wins)),
      el('td', { class: 'num' }, String(t.losses + (t.ties ? '·' + t.ties : ''))),
      el('td', { class: 'num' }, fmtNum(t.pf, 1)),
      el('td', { class: 'num' }, fmtNum(t.pa, 1)),
      el('td', { class: 'num' }, fmtNum(t.ppg, 1)),
    ));
  });
  table.appendChild(tbody);
  return el('section', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('h3', {}, 'Standings'),
      el('a', { href: '#standings', class: 'muted small' }, 'Full table →'),
    ),
    el('div', { class: 'scrollable' }, table),
  );
}

function matchupRow(m) {
  return el('div', { class: 'matchup-row' },
    el('div', { class: 'matchup-week' }, `W${m.week}`),
    el('div', { class: 'matchup-team winner' },
      el('span', { class: 'mt-name' }, teamName(m.a)),
      el('span', { class: 'mt-score' }, fmtNum(m.pointsA, 1)),
    ),
    el('div', { class: 'matchup-vs' }, 'vs'),
    el('div', { class: 'matchup-team' },
      el('span', { class: 'mt-name' }, teamName(m.b)),
      el('span', { class: 'mt-score' }, fmtNum(m.pointsB, 1)),
    ),
    el('div', { class: 'matchup-margin' }, `${fmtNum(m.margin, 1)}`),
  );
}

function collectTrades() {
  const trades = [];
  for (const [week, txns] of Object.entries(state.transactionsByWeek)) {
    for (const t of txns) {
      if (t.type === 'trade' && t.status === 'complete') {
        trades.push({ ...t, _week: Number(week) });
      }
    }
  }
  trades.sort((a, b) => (b.status_updated || 0) - (a.status_updated || 0));
  return trades;
}

function simpleTradeRow(t) {
  // Compact summary: "Team A ⇄ Team B · W5"
  const teams = (t.roster_ids || []).map(id => teamName(id));
  const players = Object.keys(t.adds || {}).slice(0, 3).map(playerLabel);
  return el('article', { class: 'trade-card', style: 'padding: 10px 12px;' },
    el('div', { class: 'trade-head' },
      el('div', {},
        el('div', { class: 'trade-week' }, `W${t._week}`),
        el('div', { style: 'font-weight:600;font-size:13px;margin-top:2px;' }, teams.join(' ⇄ ')),
      ),
      el('a', { href: '#trades', class: 'muted small' }, 'Details →'),
    ),
    players.length
      ? el('div', { class: 'muted small' }, players.join(', ') + (Object.keys(t.adds || {}).length > 3 ? ` +${Object.keys(t.adds).length - 3}` : ''))
      : null,
  );
}
