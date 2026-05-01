// Trade partners: who trades with who, and who comes out ahead.

import { el, teamName } from '../helpers.js';
import { state } from '../state.js';
import { ensureTransactions, ensurePlayers, ensureValues } from '../data.js';

export async function renderPartners(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading…'));

  await Promise.all([ensurePlayers(), ensureTransactions(), ensureValues()]);
  if (state.activeTab !== 'partners') return;

  // Build pair counts and per-pair winner counts (current value as winner-decider proxy).
  const pairs = {};   // "minId-maxId" -> { count, aWins, bWins, even }
  for (const txns of Object.values(state.transactionsByWeek)) {
    for (const t of txns) {
      if (t.type !== 'trade' || t.status !== 'complete') continue;
      const ids = (t.roster_ids || []).slice().sort((a, b) => a - b);
      if (ids.length !== 2) continue;
      const [a, b] = ids;
      const key = `${a}-${b}`;
      pairs[key] = pairs[key] || { aId: a, bId: b, count: 0, aWins: 0, bWins: 0, even: 0 };
      pairs[key].count++;

      // Compute side values
      const aPlayers = Object.entries(t.adds || {}).filter(([_, rid]) => rid === a).map(([pid]) => pid);
      const bPlayers = Object.entries(t.adds || {}).filter(([_, rid]) => rid === b).map(([pid]) => pid);
      const aVal = aPlayers.reduce((s, pid) => s + (state.values?.get(String(pid)) || 0), 0);
      const bVal = bPlayers.reduce((s, pid) => s + (state.values?.get(String(pid)) || 0), 0);
      if (aVal > bVal) pairs[key].aWins++;
      else if (bVal > aVal) pairs[key].bWins++;
      else pairs[key].even++;
    }
  }

  const list = Object.values(pairs).sort((a, b) => b.count - a.count);

  // Per-team leaderboards
  const totals = {};
  for (const r of state.rosters) totals[r.roster_id] = { trades: 0, wins: 0, losses: 0, even: 0 };
  for (const p of list) {
    totals[p.aId].trades += p.count;
    totals[p.aId].wins += p.aWins; totals[p.aId].losses += p.bWins; totals[p.aId].even += p.even;
    totals[p.bId].trades += p.count;
    totals[p.bId].wins += p.bWins; totals[p.bId].losses += p.aWins; totals[p.bId].even += p.even;
  }
  const leaderboard = Object.entries(totals).map(([rid, v]) => ({
    rosterId: Number(rid),
    teamName: teamName(Number(rid)),
    ...v,
  })).filter(t => t.trades > 0).sort((a, b) => b.wins - a.wins || b.trades - a.trades);

  wrap.innerHTML = '';

  if (!list.length) {
    wrap.appendChild(el('section', { class: 'panel empty-panel' },
      el('h3', {}, 'No trade partners yet'),
      el('p', { class: 'muted' }, 'Trade history will populate here as your league makes trades.'),
    ));
    return;
  }

  // Leaderboard
  const lbTable = el('table', { class: 'data-table' });
  lbTable.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Team'),
    el('th', { class: 'num' }, 'Trades'),
    el('th', { class: 'num' }, 'Won'),
    el('th', { class: 'num' }, 'Lost'),
    el('th', { class: 'num' }, 'Even'),
  )));
  const lbBody = el('tbody');
  leaderboard.forEach((t, i) => {
    lbBody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', { style: 'font-weight: 600' }, t.teamName),
      el('td', { class: 'num' }, String(t.trades)),
      el('td', { class: 'num' }, el('span', { class: 'chip good' }, String(t.wins))),
      el('td', { class: 'num' }, el('span', { class: 'chip bad' }, String(t.losses))),
      el('td', { class: 'num' }, String(t.even)),
    ));
  });
  lbTable.appendChild(lbBody);
  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Trader leaderboard'),
    el('p', { class: 'muted small', style: 'margin: 0 0 12px' },
      'Wins/Losses determined by the side with higher current dynasty value of received players.'),
    el('div', { class: 'scrollable' }, lbTable),
  ));

  // Pair list
  const pairTable = el('table', { class: 'data-table' });
  pairTable.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Pair'),
    el('th', { class: 'num' }, 'Trades'),
    el('th', {}, 'Edge'),
  )));
  const pairBody = el('tbody');
  list.forEach(p => {
    let edge = 'Even';
    let edgeClass = '';
    if (p.aWins > p.bWins) { edge = `${teamName(p.aId)} +${p.aWins - p.bWins}`; edgeClass = 'good'; }
    else if (p.bWins > p.aWins) { edge = `${teamName(p.bId)} +${p.bWins - p.aWins}`; edgeClass = 'good'; }
    pairBody.appendChild(el('tr', {},
      el('td', { style: 'font-weight: 600' }, `${teamName(p.aId)} ⇄ ${teamName(p.bId)}`),
      el('td', { class: 'num' }, String(p.count)),
      el('td', {}, el('span', { class: `chip ${edgeClass}` }, edge)),
    ));
  });
  pairTable.appendChild(pairBody);
  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Trade partner pairs'),
    el('div', { class: 'scrollable' }, pairTable),
  ));
}
