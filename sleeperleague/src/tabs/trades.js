// Trade grader — mfa-style expandable cards.
// Each trade card shows: who fleeced who (or "Even") in collapsed form;
// expanded form lists "X received" / "Y received" with PICK + position
// badges, then a 3-column "Value at trade | Value now | Realized pts"
// strip with one number per side.

import {
  el, fmtNum, fmtInt, fmtDate, playerLabel, playerMeta, playerValue, pickLabel,
} from '../helpers.js';
import { state } from '../state.js';
import {
  ensurePlayers, ensureValues, ensureAllScopeMatchups, ensureAllScopeTransactions,
  ensurePickValueIndex, ensureAllAvailableDrafts,
  ensureHistoricalValuesForDates,
  pickValueForTrade, pickValueForTradeAtDateShifted,
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
    ensurePickValueIndex(),
    ensureAllAvailableDrafts(),
  ]);
  if (state.activeTab !== 'trades') return;

  const trades = collectAllScopeTrades();

  // Pre-load historical values from DynastyProcess for every unique trade date.
  const tradeDates = trades.map(t => tradeIsoDate(t)).filter(Boolean);
  if (tradeDates.length) {
    wrap.querySelector('.muted')?.replaceChildren(document.createTextNode(
      `Fetching historical values for ${new Set(tradeDates).size} trade date${new Set(tradeDates).size === 1 ? '' : 's'}…`));
    await ensureHistoricalValuesForDates(tradeDates);
    if (state.activeTab !== 'trades') return;
  }

  const draftedIndex = buildDraftedPicksIndex();

  wrap.innerHTML = '';

  // Headline row (kept compact)
  const counts = {};
  for (const t of trades) {
    for (const oid of t._participants) counts[oid] = (counts[oid] || 0) + 1;
  }
  const topTrader = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const seasons = [...new Set(state.scope.map(s => s.season))].sort();
  wrap.appendChild(el('div', { class: 'stat-grid' },
    statCard('blue',   'Total trades', String(trades.length),
      seasons.length > 1 ? `Across ${seasons.length} seasons` : null),
    statCard('purple', 'Active traders', String(Object.keys(counts).length)),
    statCard('green',  'Most active', topTrader ? ownerLabel(topTrader[0]) : '—',
      topTrader ? `${topTrader[1]} trades` : ''),
    statCard('orange', 'Latest', trades[0] ? `Week ${trades[0]._week}` : '—',
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
        `Values: ${valuesLabel(state.valuesSource)}`),
    ),
    list,
  ));
}

function valuesLabel(src) {
  const loaded = state.valuesLoaded || { ktc: false, fc: false };
  if (src === 'ktc') return loaded.ktc ? 'KTC (snapshot)' : 'KTC unavailable';
  if (src === 'fc')  return loaded.fc  ? 'FantasyCalc' : 'FC unavailable';
  if (loaded.ktc && loaded.fc) return 'KTC + FC';
  if (loaded.fc) return 'FC only';
  if (loaded.ktc) return 'KTC only';
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

function ownerNameInScope(rosterId, sc) {
  const r = sc.rosters.find(r => r.roster_id === rosterId);
  if (!r) return '';
  const u = sc.users.find(u => u.user_id === r.owner_id);
  return u?.display_name || '';
}

function tradeIsoDate(t) {
  const ts = t.status_updated;
  if (!ts) return null;
  return new Date(ts).toISOString().slice(0, 10);
}

// ============ Pick → drafted player lookup ============

function findDraftedFor(p, draftedIndex) {
  const originalRoster = p.roster_id;
  if (originalRoster == null) return null;
  const key = `${p.season}|${p.round}|${originalRoster}`;
  const drafted = draftedIndex.get(key);
  if (!drafted || !drafted.player_id) return null;
  return drafted;
}

function pickValueWithDraftAware(p, draftedIndex, tradeDate) {
  const drafted = findDraftedFor(p, draftedIndex);
  if (drafted && drafted.player_id) {
    const pid = drafted.player_id;
    const valueNow = playerValue(pid);
    const valueThen = tradeDate
      ? (playerValueAtDate(pid, tradeDate) || valueNow)
      : valueNow;
    return { valueNow, valueThen, source: 'drafted', drafted, playerId: pid };
  }
  const sr = { season: p.season, round: p.round };
  const valueThen = tradeDate ? pickValueForTradeAtDateShifted(sr, tradeDate) : pickValueForTrade(sr);
  const valueNow = pickValueForTrade(sr);
  return { valueNow, valueThen, source: 'pick', drafted: null };
}

// ============ Render ============

function renderTradeCard(t, draftedIndex) {
  const sc = t._scope;
  const rosters = t.roster_ids || [];
  const tradeDate = tradeIsoDate(t);

  // Build per-roster received (players, picks, faab).
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

  // Compute totals per side: { valueAtTrade, valueNow, realized, assetCount }.
  const sideTotals = {};
  for (const rid of rosters) {
    const r = received[rid];
    let vn = 0, vt = 0, realized = 0;
    let assetCount = 0;
    for (const pid of r.players) {
      vn += playerValue(pid);
      vt += tradeDate ? (playerValueAtDate(pid, tradeDate) || playerValue(pid)) : playerValue(pid);
      realized += realizedPointsForPlayer(pid, t._week, maxWeek, sc);
      assetCount++;
    }
    for (const p of r.picks) {
      const v = pickValueWithDraftAware(p, draftedIndex, tradeDate);
      vn += v.valueNow;
      vt += v.valueThen;
      if (v.source === 'drafted' && v.playerId) {
        realized += realizedPointsForPlayer(v.playerId, t._week, maxWeek, sc);
      }
      assetCount++;
    }
    sideTotals[rid] = { valueAtTrade: vt, valueNow: vn, realized, assetCount };
  }

  // KTC-style Value Adjustment.
  //
  // Trading isn't simple addition. Multiple smaller assets are worth less
  // than their raw sum because of:
  //   - Roster spots (finite)
  //   - Lineup caps (only N starters)
  //   - "Stud" premium (one elite player anchors a position; bench fillers
  //      are at replacement level)
  //
  // KTC reverse-engineers from "the player needed to even the trade." We
  // can't see their formula but we approximate with diminishing returns:
  //
  //     effective = raw × asset_count^(-0.15)
  //
  // Examples (raw = 7,000):
  //     1 stud  → 7,000   (no discount)
  //     2 mids  → 6,307
  //     4 mids  → 5,610
  //     12 picks → 4,807
  //
  // The Value Adjustment shown is the bigger of the two sides' implicit
  // discounts; that's the side which "needs" extra value to even the trade.
  const ADJ_EXPONENT = 0.15;
  function effectiveValue(raw, count) {
    if (!count || count <= 1) return raw;
    return Math.round(raw * Math.pow(count, -ADJ_EXPONENT));
  }

  for (const rid of rosters) {
    const t = sideTotals[rid];
    t.adjValueAtTrade = effectiveValue(t.valueAtTrade, t.assetCount);
    t.adjValueNow     = effectiveValue(t.valueNow,     t.assetCount);
    t.valueAdjustment = t.valueAtTrade - t.adjValueAtTrade;
  }

  // The displayed "Value Adjustment" is the larger of the two side
  // adjustments (typically the side with more assets). Below ~100 we
  // suppress the chip - too small to be meaningful.
  let valueAdj = null;
  if (rosters.length === 2) {
    const [a, b] = rosters;
    const adjA = sideTotals[a].valueAdjustment;
    const adjB = sideTotals[b].valueAdjustment;
    const heavier = adjA > adjB ? a : b;
    const heavierAdj = Math.max(adjA, adjB);
    if (heavierAdj > 100 && Math.abs(adjA - adjB) > 100) {
      valueAdj = {
        side: heavier,
        amount: heavierAdj,
        rawAtTrade: sideTotals[heavier].valueAtTrade,
        effAtTrade: sideTotals[heavier].adjValueAtTrade,
        rawNow:     sideTotals[heavier].valueNow,
        effNow:     sideTotals[heavier].adjValueNow,
        count: sideTotals[heavier].assetCount,
      };
    }
  }

  // Determine winner / fleece headline using the ADJUSTED values.
  let headline = null;
  let cardTone = 'even';
  if (rosters.length === 2) {
    const [a, b] = rosters;
    const aS = sideTotals[a].adjValueAtTrade + sideTotals[a].realized;
    const bS = sideTotals[b].adjValueAtTrade + sideTotals[b].realized;
    const margin = Math.abs(aS - bS);
    const total = aS + bS || 1;
    const winnerRid = aS > bS ? a : (bS > aS ? b : null);
    const loserRid = winnerRid === a ? b : (winnerRid === b ? a : null);
    if (winnerRid != null && margin / total > 0.25) {
      cardTone = 'fleece';
      headline = el('div', { class: 'trade-headline' },
        el('strong', { class: ownerIsYou(winnerRid, sc) ? 'you' : '' }, teamLabelInScope(winnerRid, sc)),
        ' ',
        el('em', {}, 'fleeced'),
        ' ',
        el('strong', {}, teamLabelInScope(loserRid, sc)),
      );
    } else if (winnerRid != null) {
      cardTone = 'win';
      headline = el('div', { class: 'trade-headline' },
        el('strong', { class: ownerIsYou(winnerRid, sc) ? 'you' : '' }, teamLabelInScope(winnerRid, sc)),
        ' ',
        el('em', {}, 'edged'),
        ' ',
        el('strong', {}, teamLabelInScope(loserRid, sc)),
      );
    } else {
      headline = el('div', { class: 'trade-headline' },
        el('strong', {}, teamLabelInScope(a, sc)),
        ' ',
        el('em', {}, '⇄'),
        ' ',
        el('strong', {}, teamLabelInScope(b, sc)),
      );
    }
  }

  // Trade card root (collapsed by default).
  const card = el('article', { class: `trade-card ${cardTone}` });

  const tagText = cardTone === 'fleece' ? 'Fleece' : cardTone === 'win' ? 'Edge' : 'Even';
  const tagClass = cardTone === 'fleece' ? 'fleece' : cardTone === 'win' ? 'win' : 'even';

  const expandBtn = el('button', { class: 'trade-expand', 'aria-label': 'Expand trade' }, '▼');

  const summary = el('div', { class: 'trade-summary',
    onclick: () => card.classList.toggle('expanded'),
  },
    el('div', { class: 'trade-summary-text' },
      headline,
      el('div', { class: 'trade-meta' },
        el('span', { class: 'year-tag' }, String(sc.season)),
        ' Week ', String(t._week),
        t.status_updated ? ` · ${fmtDate(t.status_updated)}` : '',
      ),
    ),
    el('span', { class: `trade-tag ${tagClass}` }, tagText),
    expandBtn,
  );
  card.appendChild(summary);

  // Body: per-side received blocks + totals strip.
  const body = el('div', { class: 'trade-body' });

  for (const rid of rosters) {
    const r = received[rid] || { players: [], picks: [], faab: 0 };
    const teamName = teamLabelInScope(rid, sc);
    const block = el('div', { class: 'trade-side-block received' },
      el('div', { class: 'trade-side-title' }, `${teamName} received:`),
    );
    for (const pid of r.players) block.appendChild(renderPlayerAsset(pid, tradeDate));
    for (const p of r.picks) block.appendChild(renderPickAsset(p, draftedIndex, tradeDate));
    if (r.faab) block.appendChild(el('div', { class: 'trade-asset' },
      el('span', { class: 'asset-tag faab' }, 'FAAB'),
      el('span', { class: 'asset-name' }, `$${r.faab}`),
    ));
    if (!r.players.length && !r.picks.length && !r.faab) {
      block.appendChild(el('div', { class: 'muted small' }, '—'));
    }
    body.appendChild(block);
  }

  // Value Adjustment block. Implements KTC's idea: trading isn't simple
  // addition, the side with more assets has its raw value discounted via
  // diminishing returns. The discount + effective totals are shown so
  // the math behind the verdict is visible.
  if (valueAdj) {
    const heavierName = teamLabelInScope(valueAdj.side, sc);
    body.appendChild(el('div', { class: 'depth-discount',
      title: 'Multiple smaller assets are worth less than their raw sum because of roster spots, lineup caps, and stud premium. We approximate with effective = raw × count^-0.15.',
    },
      el('span', { class: 'depth-discount-label' }, 'VALUE ADJUSTMENT'),
      el('span', { class: 'depth-discount-amount' },
        `−${fmtInt(valueAdj.amount)} from ${heavierName} `,
        el('span', { class: 'muted small' },
          `(${valueAdj.count} assets · diminishing returns)`),
      ),
      el('span', { class: 'depth-discount-effective small' },
        `Effective for ${heavierName}: ${fmtInt(valueAdj.effAtTrade)} at trade · ${fmtInt(valueAdj.effNow)} now. Used to decide the verdict above.`),
    ));
  }

  // 3-column totals strip
  if (rosters.length === 2) {
    const [a, b] = rosters;
    const ta = sideTotals[a], tb = sideTotals[b];
    const aShort = ownerNameShort(rosters[0], sc);
    const bShort = ownerNameShort(rosters[1], sc);
    body.appendChild(el('div', { class: 'trade-totals-grid' },
      totalCell('Value at trade', ta.valueAtTrade, tb.valueAtTrade, aShort, bShort),
      totalCell('Value now',      ta.valueNow,     tb.valueNow,     aShort, bShort),
      totalCell('Realized pts',   ta.realized,     tb.realized,     aShort, bShort, 1),
    ));
  }

  card.appendChild(body);
  return card;
}

function totalCell(label, va, vb, aShort, bShort, decimals = 0) {
  const fmt = decimals ? (v) => fmtNum(v, decimals) : fmtInt;
  return el('div', { class: 'trade-total-cell' },
    el('div', { class: 'trade-total-label' }, label),
    el('div', { class: 'trade-total-pair' },
      el('span', {}, fmt(va)),
      el('span', {}, fmt(vb)),
    ),
    el('div', { class: 'trade-total-names' },
      el('span', {}, aShort),
      el('span', {}, bShort),
    ),
  );
}

function ownerNameShort(rosterId, sc) {
  const name = ownerNameInScope(rosterId, sc) || teamLabelInScope(rosterId, sc);
  return name.length > 9 ? name.slice(0, 8) + '…' : name;
}

function ownerIsYou(rosterId, sc) {
  const r = sc.rosters.find(r => r.roster_id === rosterId);
  return r?.owner_id === state.user?.user_id;
}

function summarizeReceived(received, rosters, sc) {
  // E.g. "Got 2024 Rd 1 (Ladd McConkey) +1 | Gave Tua Tagovailoa +1"
  // For two-sided trades, show top received + count from each side.
  if (rosters.length !== 2) return '';
  const [a, b] = rosters;
  const ra = received[a], rb = received[b];

  function descSide(r) {
    // First asset (player or pick name) + extras count
    const items = [];
    for (const pid of r.players) items.push({ kind: 'p', label: playerLabel(pid) });
    for (const p of r.picks) items.push({ kind: 'k', label: pickLabel(p) });
    if (!items.length && r.faab) items.push({ kind: 'f', label: `$${r.faab} FAAB` });
    if (!items.length) return '—';
    const head = items[0].label;
    const rest = items.length - 1;
    return `${head}${rest > 0 ? ` +${rest}` : ''}`;
  }
  return `Got ${descSide(ra)}  |  Gave ${descSide(rb)}`;
}

function renderPlayerAsset(pid, tradeDate) {
  const p = state.players?.[pid];
  const pos = (p?.position || '').toUpperCase();
  const tagCls = ['QB','RB','WR','TE','K','DEF'].includes(pos) ? pos.toLowerCase() : '';
  const valueNow = playerValue(pid);
  const valueThen = tradeDate ? (playerValueAtDate(pid, tradeDate) || valueNow) : valueNow;
  const showThenAndNow = valueThen && valueNow && Math.abs(valueThen - valueNow) / Math.max(valueThen, valueNow) > 0.05;
  return el('div', { class: 'trade-asset', title: playerMeta(pid) },
    el('span', { class: `asset-tag ${tagCls}` }, pos || '?'),
    el('span', { class: 'asset-name' }, playerLabel(pid)),
    el('span', { class: 'asset-value' },
      showThenAndNow ? `${fmtInt(valueThen)} → ${fmtInt(valueNow)}` : fmtInt(valueNow || valueThen)),
  );
}

function renderPickAsset(p, draftedIndex, tradeDate) {
  const v = pickValueWithDraftAware(p, draftedIndex, tradeDate);
  const baseLabel = pickLabel(p);
  let label = baseLabel;
  if (v.source === 'drafted' && v.drafted) {
    const slot = formatDraftSlot(v.drafted);
    const playerName = playerLabel(v.drafted.player_id);
    label = `${baseLabel} → ${slot ? slot + ' ' : ''}${playerName}`;
  }
  const showThen = v.valueThen && v.valueNow && Math.abs(v.valueThen - v.valueNow) / Math.max(v.valueThen, v.valueNow) > 0.05;
  return el('div', { class: 'trade-asset' },
    el('span', { class: 'asset-tag' }, 'PICK'),
    el('span', { class: 'asset-name' }, label),
    el('span', { class: 'asset-value' },
      showThen ? `${fmtInt(v.valueThen)} → ${fmtInt(v.valueNow)}` : fmtInt(v.valueNow || v.valueThen)),
  );
}

function formatDraftSlot(info) {
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

function statCard(tone, label, value, sub) {
  return el('div', { class: `stat-card tone-${tone}` },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value || '—'),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}
