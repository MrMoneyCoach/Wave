// Trade grader: every completed trade graded on three pillars:
//  1) Dynasty value at trade (FantasyCalc current values as proxy - historical not available free)
//  2) Value differential (proxy: current value diff between sides)
//  3) Realized points: total fantasy points each side scored from received players in weeks AFTER the trade.
// Winner = side with higher composite (50% value, 50% realized points if season has games after).

import { el, fmtNum, fmtInt, fmtDate, teamName, playerLabel, playerMeta, playerValue, pickLabel } from '../helpers.js';
import { state } from '../state.js';
import { ensureTransactions, ensurePlayers, ensureValues, ensureMatchups } from '../data.js';

export async function renderTrades(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading trades, players, and dynasty values…'));

  const lg = state.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const currentWeek = state.nflState?.week || playoffStart - 1;
  const maxWeek = String(state.nflState?.season) === String(lg.season)
    ? Math.min(playoffStart - 1, currentWeek)
    : playoffStart - 1;

  await Promise.all([
    ensurePlayers(),
    ensureTransactions(),
    ensureValues(),
    ensureMatchups(maxWeek), // for realized points
  ]);
  if (state.activeTab !== 'trades') return;

  const trades = collectTrades();

  wrap.innerHTML = '';

  // Headline cards
  const counts = {};
  for (const t of trades) {
    for (const rid of t.roster_ids || []) counts[rid] = (counts[rid] || 0) + 1;
  }
  const topTrader = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  wrap.appendChild(el('div', { class: 'stat-row' },
    statCard('Total trades', String(trades.length)),
    statCard('Active traders', String(Object.keys(counts).length)),
    statCard('Most active', topTrader ? teamName(Number(topTrader[0])) : '—', topTrader ? `${topTrader[1]} trades` : ''),
    statCard('Latest', trades[0] ? `Week ${trades[0]._week}` : '—',
      trades[0]?.status_updated ? fmtDate(trades[0].status_updated) : ''),
  ));

  if (!trades.length) {
    wrap.appendChild(el('section', { class: 'panel empty-panel' },
      el('h3', {}, 'No trades yet'),
      el('p', { class: 'muted' }, 'When teams complete a trade, each side will be graded by dynasty value and realized points.'),
    ));
    return;
  }

  const list = el('div', { class: 'trade-list' });
  for (const t of trades) list.appendChild(renderTradeCard(t, maxWeek));
  wrap.appendChild(el('section', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('h3', {}, `All trades (${trades.length})`),
      el('span', { class: 'muted small' }, 'Values powered by FantasyCalc'),
    ),
    list,
  ));
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

function renderTradeCard(t, maxWeek) {
  const rosters = t.roster_ids || [];
  const received = {}; // rosterId -> { players: [pid], picks: [], faab: 0 }
  for (const rid of rosters) received[rid] = { players: [], picks: [], faab: 0 };
  for (const [pid, rid] of Object.entries(t.adds || {})) {
    if (!received[rid]) received[rid] = { players: [], picks: [], faab: 0 };
    received[rid].players.push(pid);
  }
  for (const p of (t.draft_picks || [])) {
    const rid = p.owner_id;
    if (!received[rid]) received[rid] = { players: [], picks: [], faab: 0 };
    received[rid].picks.push(p);
  }
  for (const w of (t.waiver_budget || [])) {
    const rid = w.receiver;
    if (!received[rid]) received[rid] = { players: [], picks: [], faab: 0 };
    received[rid].faab += w.amount || 0;
  }

  // Compute totals: dynasty value (current proxy) + realized points (from week+1 onward).
  const grades = {};
  for (const rid of rosters) {
    const r = received[rid];
    const valueSum = r.players.reduce((s, pid) => s + playerValue(pid), 0);
    const realized = r.players.reduce((s, pid) => s + realizedPointsForPlayer(pid, t._week, maxWeek), 0);
    grades[rid] = { value: valueSum, realized, faab: r.faab };
  }

  // Winner: highest combined score (z-score of value + z-score of realized within this trade)
  const ridList = rosters;
  let winnerRid = null;
  if (ridList.length === 2) {
    const [a, b] = ridList;
    // Higher value AND/OR higher realized → winner; tie if equal
    const aScore = grades[a].value + grades[a].realized;
    const bScore = grades[b].value + grades[b].realized;
    if (aScore > bScore) winnerRid = a;
    else if (bScore > aScore) winnerRid = b;
  }

  const head = el('div', { class: 'trade-head' },
    el('div', {},
      el('div', { class: 'trade-week' }, `Week ${t._week}`),
      t.status_updated ? el('div', { class: 'muted small' }, fmtDate(t.status_updated)) : null,
    ),
    winnerRid != null
      ? el('div', { class: 'trade-grade' },
          el('span', { class: 'chip good' }, `${teamName(winnerRid)} edge`))
      : el('span', { class: 'chip' }, 'Even'),
  );

  const sides = el('div', { class: 'trade-sides' });
  for (const rid of rosters) {
    const r = received[rid] || { players: [], picks: [], faab: 0 };
    const g = grades[rid];
    const side = el('div', { class: `trade-side${rid === winnerRid ? ' winner' : ''}` },
      rid === winnerRid ? el('div', { class: 'winner-badge' }, 'Winner') : null,
      el('div', { class: 'trade-team' }, teamName(rid)),
      el('div', { class: 'trade-totals' },
        el('span', {},
          el('strong', {}, fmtInt(g.value)),
          'Dynasty value',
        ),
        el('span', {},
          el('strong', {}, fmtNum(g.realized, 1)),
          'Realized pts',
        ),
      ),
      el('div', { class: 'trade-received' },
        ...r.players.map(pid => el('div', { class: 'asset asset-player', title: playerMeta(pid) },
          playerLabel(pid),
          el('span', { class: 'val' }, fmtInt(playerValue(pid))),
        )),
        ...r.picks.map(p => el('div', { class: 'asset asset-pick' }, pickLabel(p))),
        r.faab ? el('div', { class: 'asset asset-faab' }, `$${r.faab} FAAB`) : null,
        (!r.players.length && !r.picks.length && !r.faab) ? el('div', { class: 'asset asset-empty' }, '—') : null,
      ),
    );
    sides.appendChild(side);
  }
  return el('article', { class: 'trade-card' }, head, sides);
}

function realizedPointsForPlayer(pid, fromWeek, maxWeek) {
  // Sum points from week (fromWeek+1) to maxWeek across all matchups (player only counts when on a roster).
  let total = 0;
  for (let w = fromWeek + 1; w <= maxWeek; w++) {
    const ms = state.matchupsByWeek[w] || [];
    for (const m of ms) {
      const pp = m.players_points || {};
      if (pid in pp) total += pp[pid] || 0;
    }
  }
  return total;
}

function statCard(label, value, sub) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value || '—'),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}
