// Trade grader. Three-pillar grading:
//   1. Dynasty value of received assets (current + at trade date when available)
//   2. Realized fantasy points scored after the trade
//   3. Pick values + drafted-for player tags when picks have been used in a draft
//
// Aggregates across every season in state.scope. Uses KTC history file (when
// the weekly workflow has populated it) for value-at-trade-date; otherwise
// falls back to current values.

import {
  el, fmtNum, fmtInt, fmtDate, playerLabel, playerMeta, playerValue, pickLabel,
} from '../helpers.js';
import { state } from '../state.js';
import {
  ensurePlayers, ensureValues, ensureAllScopeMatchups, ensureAllScopeTransactions,
  ensureKtcHistory, ensurePickValueIndex, ensureAllScopeDrafts,
  pickValueForTrade, playerValueAtDate, buildDraftedPicksIndex,
} from '../data.js';

export async function renderTrades(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading trades, players, values, drafts…'));

  await Promise.all([
    ensurePlayers(),
    ensureAllScopeTransactions(),
    ensureValues(),
    ensureAllScopeMatchups(),
    ensureKtcHistory(),
    ensurePickValueIndex(),
    ensureAllScopeDrafts(),
  ]);
  if (state.activeTab !== 'trades') return;

  const trades = collectAllScopeTrades();
  const draftedIndex = buildDraftedPicksIndex();

  wrap.innerHTML = '';

  // Headline cards.
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
      el('p', { class: 'muted' }, 'When teams complete a trade in any selected season, they\'ll appear here graded by value, picks, and realized points.'),
    ));
    return;
  }

  const list = el('div', { class: 'trade-list' });
  for (const t of trades) list.appendChild(renderTradeCard(t, draftedIndex));
  wrap.appendChild(el('section', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('h3', {}, `All trades (${trades.length})`),
      el('span', { class: 'muted small' },
        `Values from ${valuesLabel(state.valuesSource)}${state.ktcHistory ? ' · history available' : ''}`),
    ),
    list,
  ));
}

function valuesLabel(src) {
  const loaded = state.valuesLoaded || { ktc: false, fc: false };
  if (src === 'ktc') return loaded.ktc ? 'KeepTradeCut (daily snapshot)' : 'KTC snapshot unavailable';
  if (src === 'fc')  return loaded.fc  ? 'FantasyCalc' : 'FC returned no data';
  if (loaded.ktc && loaded.fc) return 'Combined: KTC + FC (avg)';
  if (loaded.fc) return 'FC only (KTC snapshot unavailable)';
  if (loaded.ktc) return 'KTC only (FC fetch failed)';
  return 'No values loaded';
}

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
  all.sort((a, b) => {
    const sa = Number(a._scope.season), sb = Number(b._scope.season);
    if (sa !== sb) return sb - sa;
    return (b.status_updated || 0) - (a.status_updated || 0);
  });
  return all;
}

function ownerLabel(ownerId) {
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

function tradeIsoDate(t) {
  const ts = t.status_updated;
  if (!ts) return null;
  return new Date(ts).toISOString().slice(0, 10);
}

function renderTradeCard(t, draftedIndex) {
  const sc = t._scope;
  const rosters = t.roster_ids || [];

  // Build per-roster `received` maps: players, picks, faab.
  const received = {};
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

  // Realized points: weeks after trade through end of regular season.
  const lg = sc.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const lastReg = playoffStart - 1;
  const currentSeason = String(state.nflState?.season) === String(lg.season);
  const maxWeek = currentSeason
    ? Math.min(lastReg, state.nflState?.week || lastReg)
    : lastReg;

  const tradeDate = tradeIsoDate(t);

  // Compute side totals (now + at-trade-date).
  const grades = {};
  for (const rid of rosters) {
    const r = received[rid];
    let valueNow = 0, valueAtTrade = 0;
    for (const pid of r.players) {
      valueNow += playerValue(pid);
      valueAtTrade += tradeDate ? (playerValueAtDate(pid, tradeDate) || playerValue(pid)) : playerValue(pid);
    }
    let pickValue = 0;
    for (const p of r.picks) {
      pickValue += pickValueForTrade({ season: p.season, round: p.round });
    }
    const realized = r.players.reduce((s, pid) =>
      s + realizedPointsForPlayer(pid, t._week, maxWeek, sc), 0);
    grades[rid] = { valueNow, valueAtTrade, pickValue, realized };
  }

  // Winner = side with higher (valueAtTrade + pickValue + realized).
  // valueAtTrade gets priority because it answers "was this fair on the day?".
  let winnerRid = null;
  if (rosters.length === 2) {
    const [a, b] = rosters;
    const aS = grades[a].valueAtTrade + grades[a].pickValue + grades[a].realized;
    const bS = grades[b].valueAtTrade + grades[b].pickValue + grades[b].realized;
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

    // Totals: prefer "value then" labelling when we have history; show now + delta.
    const haveHistory = !!state.ktcHistory && tradeDate &&
      r.players.some(pid => state.ktcHistory.history?.[String(pid)]);
    const totalsRow = el('div', { class: 'trade-totals' },
      el('span', {},
        el('strong', {}, fmtInt(g.valueAtTrade + g.pickValue)),
        haveHistory ? 'Value at trade' : 'Dynasty value',
      ),
      el('span', {},
        el('strong', {}, fmtInt(g.valueNow + g.pickValue)),
        'Value now',
      ),
      el('span', {},
        el('strong', {}, fmtNum(g.realized, 1)),
        'Realized pts',
      ),
    );

    const playerNodes = r.players.map(pid => {
      const vNow = playerValue(pid);
      const vThen = tradeDate ? playerValueAtDate(pid, tradeDate) : null;
      const showThen = vThen != null && vThen !== vNow;
      return el('div', { class: 'asset asset-player', title: playerMeta(pid) },
        playerLabel(pid),
        showThen
          ? el('span', { class: 'val', title: 'value at trade · value now' },
              `${fmtInt(vThen)} → ${fmtInt(vNow)}`)
          : el('span', { class: 'val' }, fmtInt(vNow)),
      );
    });

    const pickNodes = r.picks.map(p => renderPickAsset(p, rid, sc, draftedIndex));

    const side = el('div', { class: `trade-side${rid === winnerRid ? ' winner' : ''}` },
      rid === winnerRid ? el('div', { class: 'winner-badge' }, 'Winner') : null,
      el('div', { class: 'trade-team' }, teamLabelInScope(rid, sc)),
      totalsRow,
      el('div', { class: 'trade-received' },
        ...playerNodes,
        ...pickNodes,
        r.faab ? el('div', { class: 'asset asset-faab' }, `$${r.faab} FAAB`) : null,
        (!r.players.length && !r.picks.length && !r.faab) ? el('div', { class: 'asset asset-empty' }, '—') : null,
      ),
    );
    sides.appendChild(side);
  }
  return el('article', { class: 'trade-card' }, head, sides);
}

// Render a draft pick asset. If we have draft data showing the pick was used,
// show the player who was selected with it (e.g. "2026 1.01 (Jeremiah Love)").
function renderPickAsset(p, receivingRosterId, sc, draftedIndex) {
  const value = pickValueForTrade({ season: p.season, round: p.round });

  // Look up who actually drafted this pick. The pick's *current* owner at the
  // time of the draft is what matters. We approximate using the trade record:
  // the receiver of this pick (p.owner_id in the transaction) is the new owner.
  // If the receiver later traded it away, our pickInfo for the same key
  // should reflect whoever made the pick - because the index is keyed by the
  // owner who actually drafted it.
  const receivingRoster = sc.rosters.find(r => r.roster_id === receivingRosterId);
  const receivingOwner = receivingRoster?.owner_id;
  const key = receivingOwner ? `${p.season}|${p.round}|${receivingOwner}` : null;
  let drafted = key ? draftedIndex.get(key) : null;

  // If the receiver isn't who actually drafted, scan the index for any pick
  // matching season+round with non-empty player_id and pick_no - imperfect
  // fallback but better than nothing.
  if (!drafted) {
    for (const [k, info] of draftedIndex.entries()) {
      const [s, r] = k.split('|');
      if (s === String(p.season) && r === String(p.round) && info.player_id) {
        drafted = info; break;
      }
    }
  }

  const baseLabel = pickLabel(p);
  const draftedSuffix = drafted && drafted.player_id
    ? ` (${formatDraftSlot(drafted)} ${playerLabel(drafted.player_id)})`
    : '';

  return el('div', { class: 'asset asset-pick', title: `Pick value: ${fmtInt(value)}` },
    baseLabel + draftedSuffix,
    value ? el('span', { class: 'val' }, fmtInt(value)) : null,
  );
}

function formatDraftSlot(info) {
  // info: {pick_no, draft_slot, season, round}. Show "1.01" style.
  if (info.round && info.draft_slot != null) {
    return `${info.round}.${String(info.draft_slot).padStart(2, '0')}`;
  }
  return '';
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
