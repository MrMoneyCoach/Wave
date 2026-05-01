// Trade partners: who trades with whom (across all selected seasons), and who has the edge.
// Aggregation key is owner_id (Sleeper user_id), which is stable across seasons.

import { el } from '../helpers.js';
import { state } from '../state.js';
import {
  ensurePlayers, ensureValues, ensureAllScopeTransactions,
} from '../data.js';

export async function renderPartners(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading…'));

  await Promise.all([ensurePlayers(), ensureAllScopeTransactions(), ensureValues()]);
  if (state.activeTab !== 'partners') return;

  // pairs keyed by sorted "ownerA|ownerB"
  const pairs = {};
  // totals per owner_id
  const totals = {};

  for (const sc of state.scope) {
    for (const txns of Object.values(sc.transactionsByWeek)) {
      for (const t of (txns || [])) {
        if (t.type !== 'trade' || t.status !== 'complete') continue;
        const rids = t.roster_ids || [];
        if (rids.length !== 2) continue;
        const owners = rids.map(rid => sc.rosters.find(r => r.roster_id === rid)?.owner_id);
        if (owners.some(o => !o)) continue;
        const [oA, oB] = owners.slice().sort();

        // Per-side received values
        const aPlayers = Object.entries(t.adds || {}).filter(([_, rid]) => owners[0] === sc.rosters.find(r => r.roster_id === rid)?.owner_id).map(([pid]) => pid);
        const bPlayers = Object.entries(t.adds || {}).filter(([_, rid]) => owners[1] === sc.rosters.find(r => r.roster_id === rid)?.owner_id).map(([pid]) => pid);
        const aVal = aPlayers.reduce((s, pid) => s + (state.values?.get(String(pid)) || 0), 0);
        const bVal = bPlayers.reduce((s, pid) => s + (state.values?.get(String(pid)) || 0), 0);

        const key = `${oA}|${oB}`;
        pairs[key] = pairs[key] || { aId: oA, bId: oB, count: 0, aWins: 0, bWins: 0, even: 0 };
        pairs[key].count++;

        // Map back to which owner is "first" in the sorted pair
        const firstIsOwners0 = owners[0] === oA;
        const aGot = firstIsOwners0 ? aVal : bVal;
        const bGot = firstIsOwners0 ? bVal : aVal;
        if (aGot > bGot) pairs[key].aWins++;
        else if (bGot > aGot) pairs[key].bWins++;
        else pairs[key].even++;

        totals[oA] = totals[oA] || { trades: 0, wins: 0, losses: 0, even: 0 };
        totals[oB] = totals[oB] || { trades: 0, wins: 0, losses: 0, even: 0 };
        totals[oA].trades++;
        totals[oB].trades++;
        if (aGot > bGot) { totals[oA].wins++; totals[oB].losses++; }
        else if (bGot > aGot) { totals[oB].wins++; totals[oA].losses++; }
        else { totals[oA].even++; totals[oB].even++; }
      }
    }
  }

  const pairList = Object.values(pairs).sort((a, b) => b.count - a.count);
  const leaderboard = Object.entries(totals)
    .map(([oid, v]) => ({ ownerId: oid, name: ownerName(oid), ...v }))
    .filter(t => t.trades > 0)
    .sort((a, b) => b.wins - a.wins || b.trades - a.trades);

  wrap.innerHTML = '';

  if (!pairList.length) {
    wrap.appendChild(el('section', { class: 'panel empty-panel' },
      el('h3', {}, 'No trade partners yet'),
      el('p', { class: 'muted' }, 'Trade partner stats will populate as your league makes trades.'),
    ));
    return;
  }

  // Leaderboard
  const lbTable = el('table', { class: 'data-table' });
  lbTable.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Owner'),
    el('th', { class: 'num' }, 'Trades'),
    el('th', { class: 'num' }, 'Won'),
    el('th', { class: 'num' }, 'Lost'),
    el('th', { class: 'num' }, 'Even'),
  )));
  const lbBody = el('tbody');
  leaderboard.forEach((t, i) => {
    lbBody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', { style: 'font-weight: 600' }, t.name),
      el('td', { class: 'num' }, String(t.trades)),
      el('td', { class: 'num' }, el('span', { class: 'chip good' }, String(t.wins))),
      el('td', { class: 'num' }, el('span', { class: 'chip bad' }, String(t.losses))),
      el('td', { class: 'num' }, String(t.even)),
    ));
  });
  lbTable.appendChild(lbBody);

  const seasonsLabel = state.scope.length === 1
    ? `${state.scope[0].season} season`
    : `${state.scope.length} seasons (${state.scope.map(s => s.season).sort().join(', ')})`;

  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Trader leaderboard'),
    el('p', { class: 'muted small', style: 'margin: 0 0 12px' },
      `Wins/Losses by side with higher current dynasty value of received players. Aggregated across ${seasonsLabel}.`),
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
  pairList.forEach(p => {
    let edge = 'Even', edgeClass = '';
    if (p.aWins > p.bWins) { edge = `${ownerName(p.aId)} +${p.aWins - p.bWins}`; edgeClass = 'good'; }
    else if (p.bWins > p.aWins) { edge = `${ownerName(p.bId)} +${p.bWins - p.aWins}`; edgeClass = 'good'; }
    pairBody.appendChild(el('tr', {},
      el('td', { style: 'font-weight: 600' }, `${ownerName(p.aId)} ⇄ ${ownerName(p.bId)}`),
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

function ownerName(ownerId) {
  for (const sc of state.scope) {
    const u = sc.users.find(u => u.user_id === ownerId);
    if (u) return u.display_name || `User ${ownerId}`;
  }
  return 'Unknown';
}
