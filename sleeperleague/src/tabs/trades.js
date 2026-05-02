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
  ensureKtcHistory, ensurePickValueIndex, ensureAllAvailableDrafts,
  ensurePickValueIndexAtDate,
  pickValueForTrade, pickValueForTradeAtDate,
  pickValueInfoForTrade, pickValueInfoForTradeAtDate,
  playerValueAtDate, buildDraftedPicksIndex,
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
    ensureAllAvailableDrafts(),
  ]);
  if (state.activeTab !== 'trades') return;

  const trades = collectAllScopeTrades();
  const draftedIndex = buildDraftedPicksIndex();

  // For every trade date that has picks, preload the historical pick-value
  // index so renderPickAsset can show "value-then" for picks too.
  const datesWithPicks = new Set();
  for (const t of trades) {
    if ((t.draft_picks || []).length === 0) continue;
    const d = tradeIsoDate(t);
    if (d) datesWithPicks.add(d);
  }
  await Promise.all([...datesWithPicks].map(d => ensurePickValueIndexAtDate(d)));
  if (state.activeTab !== 'trades') return;

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

  // Compute side totals (now + at-trade-date) for both players and picks.
  const grades = {};
  for (const rid of rosters) {
    const r = received[rid];
    let playerValueNow = 0, playerValueThen = 0;
    for (const pid of r.players) {
      playerValueNow += playerValue(pid);
      playerValueThen += tradeDate ? (playerValueAtDate(pid, tradeDate) || playerValue(pid)) : playerValue(pid);
    }
    let pickValueNow = 0, pickValueThen = 0;
    for (const p of r.picks) {
      const v = pickValueWithDraftAware(p, rid, sc, draftedIndex, tradeDate);
      pickValueNow += v.valueNow;
      pickValueThen += v.valueThen;
    }
    const realized = r.players.reduce((s, pid) =>
      s + realizedPointsForPlayer(pid, t._week, maxWeek, sc), 0);
    grades[rid] = {
      valueNow: playerValueNow + pickValueNow,
      valueAtTrade: playerValueThen + pickValueThen,
      realized,
    };
  }

  // Winner = side with higher (valueAtTrade + realized). valueAtTrade
  // already includes pick value at the trade date.
  let winnerRid = null;
  if (rosters.length === 2) {
    const [a, b] = rosters;
    const aS = grades[a].valueAtTrade + grades[a].realized;
    const bS = grades[b].valueAtTrade + grades[b].realized;
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

    // Totals: show value at trade and value now separately. The grader's
    // verdict is based on value-at-trade (i.e. "was this fair on the day?").
    const totalsRow = el('div', { class: 'trade-totals' },
      el('span', {},
        el('strong', {}, fmtInt(g.valueAtTrade)),
        'Value at trade',
      ),
      el('span', {},
        el('strong', {}, fmtInt(g.valueNow)),
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

    const pickNodes = r.picks.map(p => renderPickAsset(p, rid, sc, draftedIndex, tradeDate));

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

// Locate the actual draft pick that resulted from this traded pick.
// Match by (season, round, owner_id at draft time). Receiving owner is the
// best guess; if it misses (pick was traded again), fall back to anything
// with the same season+round that resulted in a player.
function findDraftedFor(p, receivingRosterId, sc, draftedIndex) {
  const receivingRoster = sc.rosters.find(r => r.roster_id === receivingRosterId);
  const receivingOwner = receivingRoster?.owner_id;
  const key = receivingOwner ? `${p.season}|${p.round}|${receivingOwner}` : null;
  let drafted = key ? draftedIndex.get(key) : null;
  if (!drafted) {
    for (const [k, info] of draftedIndex.entries()) {
      const [s, r] = k.split('|');
      if (s === String(p.season) && r === String(p.round) && info.player_id) {
        drafted = info; break;
      }
    }
  }
  return drafted;
}

// Unified pick valuation:
//   - If the pick has been used to draft a player, use that player's value
//     (now & at trade date). This is the truthful value of the asset.
//   - Otherwise use the KTC pick value with year fallback (2029 -> 2028 etc).
function pickValueWithDraftAware(p, receivingRosterId, sc, draftedIndex, tradeDate) {
  const drafted = findDraftedFor(p, receivingRosterId, sc, draftedIndex);
  if (drafted && drafted.player_id) {
    const valueNow = playerValue(drafted.player_id);
    const valueThen = tradeDate
      ? (playerValueAtDate(drafted.player_id, tradeDate) || valueNow)
      : valueNow;
    return { valueNow, valueThen, source: 'drafted', drafted };
  }
  const sr = { season: p.season, round: p.round };
  const nowInfo = pickValueInfoForTrade(sr);
  const thenInfo = tradeDate ? pickValueInfoForTradeAtDate(sr, tradeDate) : nowInfo;
  return {
    valueNow: nowInfo.value,
    valueThen: thenInfo.value || nowInfo.value,
    source: 'pick',
    drafted: null,
    fallbackFromSeason:
      (nowInfo.fromSeason && nowInfo.fromSeason !== p.season) ? nowInfo.fromSeason : null,
  };
}

// Render a draft pick asset.
function renderPickAsset(p, receivingRosterId, sc, draftedIndex, tradeDate) {
  const v = pickValueWithDraftAware(p, receivingRosterId, sc, draftedIndex, tradeDate);
  const baseLabel = pickLabel(p);

  let label = baseLabel;
  let titleParts = [];

  if (v.source === 'drafted' && v.drafted) {
    const slot = formatDraftSlot(v.drafted);
    const playerName = playerLabel(v.drafted.player_id);
    label = `${baseLabel} → ${slot ? slot + ' ' : ''}${playerName}`;
    titleParts.push(`Pick used to draft ${playerName}`);
    titleParts.push(`Player value at trade: ${fmtInt(v.valueThen)} · now: ${fmtInt(v.valueNow)}`);
  } else if (v.fallbackFromSeason) {
    titleParts.push(`KTC has no value for ${p.season}; using ${v.fallbackFromSeason} value as estimate`);
  } else {
    titleParts.push(`KTC pick value`);
  }

  // Value chip
  let valueChip = null;
  if (v.valueThen && v.valueNow && v.valueThen !== v.valueNow) {
    valueChip = el('span', { class: 'val', title: 'value at trade · value now' },
      `${fmtInt(v.valueThen)} → ${fmtInt(v.valueNow)}`);
  } else if (v.valueNow) {
    valueChip = el('span', { class: 'val' }, (v.fallbackFromSeason ? '~' : '') + fmtInt(v.valueNow));
  } else if (v.valueThen) {
    valueChip = el('span', { class: 'val' }, fmtInt(v.valueThen));
  }

  return el('div', {
    class: 'asset asset-pick',
    title: titleParts.join(' · '),
  },
    label,
    valueChip,
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
