// Trade grader: every completed trade graded on three pillars:
//  1) Dynasty value of received assets (current values - FC, KTC, or combined)
//  2) Realized fantasy points: sum of points scored by each received player from
//     the week after the trade through the end of that season's regular season.
//  3) Winner = side with higher composite (value + realized points).
//
// Aggregates across every season in state.scope.

import { el, fmtNum, fmtInt, fmtDate, playerLabel, playerMeta, playerValue, pickLabel } from '../helpers.js';
import { state } from '../state.js';
import {
  ensurePlayers, ensureValues, ensureAllScopeMatchups, ensureAllScopeTransactions,
} from '../data.js';

export async function renderTrades(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading trades, players, and values…'));

  await Promise.all([
    ensurePlayers(),
    ensureAllScopeTransactions(),
    ensureValues(),
    ensureAllScopeMatchups(),
  ]);
  if (state.activeTab !== 'trades') return;

  const trades = collectAllScopeTrades();

  wrap.innerHTML = '';

  // Headline cards
  const counts = {};
  for (const t of trades) {
    for (const oid of t._participants) counts[oid] = (counts[oid] || 0) + 1;
  }
  const topTrader = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const seasons = [...new Set(state.scope.map(s => s.season))].sort();
  wrap.appendChild(el('div', { class: 'stat-row' },
    statCard('Total trades', String(trades.length),
      seasons.length > 1 ? `Across ${seasons.length} seasons` : null),
    statCard('Active traders', String(Object.keys(counts).length)),
    statCard('Most active', topTrader ? ownerLabel(topTrader[0]) : '—',
      topTrader ? `${topTrader[1]} trades` : ''),
    statCard('Latest', trades[0] ? `Week ${trades[0]._week}` : '—',
      trades[0] ? `${trades[0]._scope.season}${trades[0].status_updated ? ' · ' + fmtDate(trades[0].status_updated) : ''}` : ''),
  ));

  if (!trades.length) {
    wrap.appendChild(el('section', { class: 'panel empty-panel' },
      el('h3', {}, 'No trades yet'),
      el('p', { class: 'muted' }, 'When teams complete a trade in any selected season, they\'ll appear here graded by value and realized points.'),
    ));
    return;
  }

  const list = el('div', { class: 'trade-list' });
  for (const t of trades) list.appendChild(renderTradeCard(t));
  wrap.appendChild(el('section', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('h3', {}, `All trades (${trades.length})`),
      el('span', { class: 'muted small' },
        `Values from ${valuesLabel(state.valuesSource)}`),
    ),
    list,
  ));
}

function valuesLabel(src) {
  const loaded = state.valuesLoaded || { dynasty: false, redraft: false };
  if (src === 'dynasty') return loaded.dynasty ? 'FantasyCalc dynasty' : 'Dynasty values failed to load';
  if (src === 'redraft') return loaded.redraft ? 'FantasyCalc redraft' : 'Redraft values failed to load';
  // combined
  if (loaded.dynasty && loaded.redraft) return 'FantasyCalc dynasty + redraft (avg)';
  if (loaded.dynasty) return 'Dynasty only (redraft fetch failed)';
  if (loaded.redraft) return 'Redraft only (dynasty fetch failed)';
  return 'No values loaded';
}

// Iterate every scope league, pull its trades, decorate with scope info + owner participants.
// Owner-id (Sleeper user_id) is stable across seasons; roster_id is not.
function collectAllScopeTrades() {
  const all = [];
  for (const sc of state.scope) {
    for (const [week, txns] of Object.entries(sc.transactionsByWeek)) {
      for (const t of (txns || [])) {
        if (t.type !== 'trade' || t.status !== 'complete') continue;
        const participants = (t.roster_ids || [])
          .map(rid => sc.rosters.find(r => r.roster_id === rid)?.owner_id)
          .filter(Boolean);
        all.push({
          ...t,
          _week: Number(week),
          _scope: sc,
          _participants: participants,
        });
      }
    }
  }
  // Newest first: by season desc then status_updated desc.
  all.sort((a, b) => {
    const sa = Number(a._scope.season), sb = Number(b._scope.season);
    if (sa !== sb) return sb - sa;
    return (b.status_updated || 0) - (a.status_updated || 0);
  });
  return all;
}

function ownerLabel(ownerId) {
  // Look up across any scope's users
  for (const sc of state.scope) {
    const u = sc.users.find(u => u.user_id === ownerId);
    if (u) return u.display_name || `User ${ownerId}`;
  }
  return 'Unknown';
}

function teamLabelInScope(rosterId, sc) {
  const r = sc.rosters.find(r => r.roster_id === rosterId);
  if (!r) return `Team ${rosterId}`;
  const u = sc.users.find(u => u.user_id === r.owner_id);
  return u?.metadata?.team_name || u?.display_name || `Team ${rosterId}`;
}

function renderTradeCard(t) {
  const sc = t._scope;
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

  const grades = {};
  // Compute realized within the trade's own season scope.
  const lg = sc.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const lastReg = playoffStart - 1;
  const currentSeason = String(state.nflState?.season) === String(lg.season);
  const maxWeek = currentSeason
    ? Math.min(lastReg, state.nflState?.week || lastReg)
    : lastReg;

  for (const rid of rosters) {
    const r = received[rid];
    const valueSum = r.players.reduce((s, pid) => s + playerValue(pid), 0);
    const realized = r.players.reduce((s, pid) =>
      s + realizedPointsForPlayer(pid, t._week, maxWeek, sc), 0);
    grades[rid] = { value: valueSum, realized };
  }

  // Winner = highest (value + realized).
  let winnerRid = null;
  if (rosters.length === 2) {
    const [a, b] = rosters;
    const aS = grades[a].value + grades[a].realized;
    const bS = grades[b].value + grades[b].realized;
    if (aS > bS) winnerRid = a;
    else if (bS > aS) winnerRid = b;
  }

  const head = el('div', { class: 'trade-head' },
    el('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' },
      el('span', { class: 'year-tag' }, String(sc.season)),
      el('span', { class: 'trade-week' }, `Week ${t._week}`),
      t.status_updated ? el('span', { class: 'muted small' }, fmtDate(t.status_updated)) : null,
    ),
    winnerRid != null
      ? el('div', { class: 'trade-grade' },
          el('span', { class: 'chip good' }, `${teamLabelInScope(winnerRid, sc)} edge`))
      : el('span', { class: 'chip' }, 'Even'),
  );

  const sides = el('div', { class: 'trade-sides' });
  for (const rid of rosters) {
    const r = received[rid] || { players: [], picks: [], faab: 0 };
    const g = grades[rid];
    const side = el('div', { class: `trade-side${rid === winnerRid ? ' winner' : ''}` },
      rid === winnerRid ? el('div', { class: 'winner-badge' }, 'Winner') : null,
      el('div', { class: 'trade-team' }, teamLabelInScope(rid, sc)),
      el('div', { class: 'trade-totals' },
        el('span', {}, el('strong', {}, fmtInt(g.value)), 'Dynasty value'),
        el('span', {}, el('strong', {}, fmtNum(g.realized, 1)), 'Realized pts'),
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

function realizedPointsForPlayer(pid, fromWeek, maxWeek, sc) {
  let total = 0;
  for (let w = fromWeek + 1; w <= maxWeek; w++) {
    const ms = sc.matchupsByWeek[w] || [];
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
