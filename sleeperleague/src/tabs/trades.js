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
  // Asset journey index: maps each asset to every trade it appeared in.
  const assetTradeIndex = buildAssetTradeIndex(trades);

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
  for (const t of trades) list.appendChild(renderTradeCard(t, draftedIndex, assetTradeIndex));
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

// Build a map from "asset key" to the chronological list of trades that
// involved that asset. Used to mark re-traded assets and to render the
// trade journey when the user clicks the * marker.
//   player:<sleeper_id>
//   pick:<season>|<round>|<original_roster_id_within_family>
function buildAssetTradeIndex(trades) {
  const idx = new Map();
  const push = (key, t) => {
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(t);
  };
  for (const t of trades) {
    for (const pid of Object.keys(t.adds || {})) push(`player:${pid}`, t);
    for (const p of (t.draft_picks || [])) {
      if (p.season && p.round != null && p.roster_id != null) {
        push(`pick:${p.season}|${p.round}|${p.roster_id}`, t);
      }
    }
  }
  // Sort each chain chronologically (by status_updated, falling back to week).
  for (const list of idx.values()) {
    list.sort((a, b) => (a.status_updated || a._week) - (b.status_updated || b._week));
  }
  return idx;
}

// Look up how many trades an asset has appeared in (across all loaded trades).
function tradesForPlayer(pid, idx) { return idx.get(`player:${pid}`) || []; }
function tradesForPick(p, idx) {
  if (!p.season || p.round == null || p.roster_id == null) return [];
  return idx.get(`pick:${p.season}|${p.round}|${p.roster_id}`) || [];
}

function renderTradeCard(t, draftedIndex, assetTradeIndex) {
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

  // Compute totals per side. bestPlayerValue is the largest single-PLAYER
  // value (picks excluded) and drives the stud-premium Value Adjustment
  // below — picks aren't "studs" in the lineup-anchoring sense, so they
  // don't earn the premium.
  const sideTotals = {};
  for (const rid of rosters) {
    const r = received[rid];
    let vn = 0, vt = 0, realized = 0;
    let assetCount = 0;
    let bestPlayerValue = 0;
    let bestAssetValue = 0;
    for (const pid of r.players) {
      const v = playerValue(pid);
      vn += v;
      vt += tradeDate ? (playerValueAtDate(pid, tradeDate) || v) : v;
      realized += realizedPointsForPlayer(pid, t._week, maxWeek, sc);
      assetCount++;
      if (v > bestPlayerValue) bestPlayerValue = v;
      if (v > bestAssetValue) bestAssetValue = v;
    }
    for (const p of r.picks) {
      const pv = pickValueWithDraftAware(p, draftedIndex, tradeDate);
      vn += pv.valueNow;
      vt += pv.valueThen;
      if (pv.source === 'drafted' && pv.playerId) {
        realized += realizedPointsForPlayer(pv.playerId, t._week, maxWeek, sc);
        // Drafted picks count as players for stud-premium purposes.
        const dv = playerValue(pv.playerId);
        if (dv > bestPlayerValue) bestPlayerValue = dv;
      }
      assetCount++;
      if (pv.valueNow > bestAssetValue) bestAssetValue = pv.valueNow;
    }
    sideTotals[rid] = { valueAtTrade: vt, valueNow: vn, realized, assetCount, bestPlayerValue, bestAssetValue };
  }

  // KTC-style Value Adjustment (stud premium).
  //
  // The side with the meaningfully bigger best PLAYER asset gets a bonus.
  // Picks alone don't trigger the premium - one elite player anchors a
  // starting lineup; future picks don't (yet).
  //
  // Formula:
  //   gap = self.bestPlayer - other.bestPlayer
  //   countAdvantage = max(0, other.assetCount - self.assetCount)
  //   bonus = min(self.bestPlayer * 0.6, gap * 0.5 + countAdvantage * 1500)
  //
  // Triggers when self.bestPlayer is at least 1.2x other.bestPlayer (or the
  // other side has zero players). No trigger if both sides have similar
  // best-player values - the trade is already balanced in star quality.
  function computeValueAdjustment(self, other) {
    const selfBest = self.bestPlayerValue || 0;
    const otherBest = other.bestPlayerValue || 0;
    if (selfBest <= 0) return 0;
    if (otherBest > 0 && selfBest <= otherBest * 1.2) return 0;
    const gap = selfBest - otherBest;
    const countAdvantage = Math.max(0, other.assetCount - self.assetCount);
    const raw = gap * 0.5 + countAdvantage * 1500;
    const cap = selfBest * 0.6;
    return Math.round(Math.min(raw, cap));
  }

  let valueAdjustment = null;
  if (rosters.length === 2) {
    const [a, b] = rosters;
    const adjA = computeValueAdjustment(sideTotals[a], sideTotals[b]);
    const adjB = computeValueAdjustment(sideTotals[b], sideTotals[a]);
    if (adjA > adjB && adjA > 0) valueAdjustment = { side: a, amount: adjA };
    else if (adjB > 0) valueAdjustment = { side: b, amount: adjB };
  }

  // Determine winner / fleece headline using value-at-trade + realized,
  // PLUS the Value Adjustment bonus (added to the stud side, if any).
  let headline = null;
  let cardTone = 'even';
  if (rosters.length === 2) {
    const [a, b] = rosters;
    const adjA = (valueAdjustment && valueAdjustment.side === a) ? valueAdjustment.amount : 0;
    const adjB = (valueAdjustment && valueAdjustment.side === b) ? valueAdjustment.amount : 0;
    const aS = sideTotals[a].valueAtTrade + sideTotals[a].realized + adjA;
    const bS = sideTotals[b].valueAtTrade + sideTotals[b].realized + adjB;
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

  // Value Adjustment: KTC-style stud premium box.
  if (valueAdjustment) {
    const studSideName = teamLabelInScope(valueAdjustment.side, sc);
    const otherSide = rosters.find(r => r !== valueAdjustment.side);
    const otherName = teamLabelInScope(otherSide, sc);
    body.appendChild(el('div', { class: 'value-adj',
      title: 'Bonus added to the side getting the elite asset. Reverse-engineered from "the player needed to even the trade." Inspired by KTC\'s Value Adjustment.',
    },
      el('div', { class: 'value-adj-head' },
        el('span', { class: 'value-adj-label' }, 'VALUE ADJUSTMENT'),
        el('span', { class: 'value-adj-amount' }, `+${fmtInt(valueAdjustment.amount)} to ${studSideName}`),
      ),
      el('div', { class: 'value-adj-explain muted small' },
        `Stud premium: ${studSideName}'s top player is significantly more valuable than ${otherName}'s. ` +
        `${otherName} would need a player worth around ${fmtInt(valueAdjustment.amount)} to even the trade.`),
    ));
  }

  for (const rid of rosters) {
    const r = received[rid] || { players: [], picks: [], faab: 0 };
    const teamName = teamLabelInScope(rid, sc);
    const block = el('div', { class: 'trade-side-block received' },
      el('div', { class: 'trade-side-title' }, `${teamName} received:`),
    );
    for (const pid of r.players) block.appendChild(renderPlayerAsset(pid, tradeDate, assetTradeIndex, t));
    for (const p of r.picks) block.appendChild(renderPickAsset(p, draftedIndex, tradeDate, assetTradeIndex, t));
    if (r.faab) block.appendChild(el('div', { class: 'trade-asset' },
      el('span', { class: 'asset-tag faab' }, 'FAAB'),
      el('span', { class: 'asset-name' }, `$${r.faab}`),
    ));
    if (!r.players.length && !r.picks.length && !r.faab) {
      block.appendChild(el('div', { class: 'muted small' }, '—'));
    }
    body.appendChild(block);
  }

  // (Value Adjustment block removed - see note above.)

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

function renderPlayerAsset(pid, tradeDate, assetTradeIndex, currentTrade) {
  const p = state.players?.[pid];
  const pos = (p?.position || '').toUpperCase();
  const tagCls = ['QB','RB','WR','TE','K','DEF'].includes(pos) ? pos.toLowerCase() : '';
  const valueNow = playerValue(pid);
  const valueThen = tradeDate ? (playerValueAtDate(pid, tradeDate) || valueNow) : valueNow;
  const showThenAndNow = valueThen && valueNow && Math.abs(valueThen - valueNow) / Math.max(valueThen, valueNow) > 0.05;

  const journey = assetTradeIndex ? tradesForPlayer(pid, assetTradeIndex) : [];
  const reTraded = journey.length > 1;
  const journeyMarker = reTraded ? journeyStarFor({
    type: 'player', label: playerLabel(pid), pid, journey, currentTrade,
  }) : null;

  return el('div', { class: 'trade-asset', title: playerMeta(pid) },
    el('span', { class: `asset-tag ${tagCls}` }, pos || '?'),
    el('span', { class: 'asset-name' }, playerLabel(pid), journeyMarker),
    el('span', { class: 'asset-value' },
      showThenAndNow ? `${fmtInt(valueThen)} → ${fmtInt(valueNow)}` : fmtInt(valueNow || valueThen)),
  );
}

function renderPickAsset(p, draftedIndex, tradeDate, assetTradeIndex, currentTrade) {
  const v = pickValueWithDraftAware(p, draftedIndex, tradeDate);
  const baseLabel = pickLabel(p);
  let label = baseLabel;
  if (v.source === 'drafted' && v.drafted) {
    const slot = formatDraftSlot(v.drafted);
    const playerName = playerLabel(v.drafted.player_id);
    label = `${baseLabel} → ${slot ? slot + ' ' : ''}${playerName}`;
  }
  const showThen = v.valueThen && v.valueNow && Math.abs(v.valueThen - v.valueNow) / Math.max(v.valueThen, v.valueNow) > 0.05;

  const journey = assetTradeIndex ? tradesForPick(p, assetTradeIndex) : [];
  const reTraded = journey.length > 1;
  const journeyMarker = reTraded ? journeyStarFor({
    type: 'pick', label: baseLabel, pickKey: p, draftedInfo: v.drafted, journey, currentTrade,
  }) : null;

  return el('div', { class: 'trade-asset' },
    el('span', { class: 'asset-tag' }, 'PICK'),
    el('span', { class: 'asset-name' }, label, journeyMarker),
    el('span', { class: 'asset-value' },
      showThen ? `${fmtInt(v.valueThen)} → ${fmtInt(v.valueNow)}` : fmtInt(v.valueNow || v.valueThen)),
  );
}

// Click target: a small * after the asset name. Tap to open the journey modal.
function journeyStarFor(payload) {
  const star = el('button', {
    class: 'asset-journey-star',
    title: `Re-traded ${payload.journey.length} times — tap to see the journey`,
    'aria-label': 'Show trade journey',
    onclick: (e) => {
      e.stopPropagation();
      openJourneyModal(payload);
    },
  }, '*');
  return star;
}

// Build and show a modal popup with the asset's trade journey.
function openJourneyModal(payload) {
  closeJourneyModal();
  const { type, label, journey, draftedInfo } = payload;

  const overlay = el('div', { class: 'journey-overlay', id: 'journeyOverlay',
    onclick: (e) => { if (e.target.id === 'journeyOverlay') closeJourneyModal(); },
  });

  const dialog = el('div', { class: 'journey-dialog' });

  const head = el('div', { class: 'journey-head' },
    el('div', {},
      el('div', { class: 'journey-kicker' }, type === 'pick' ? 'PICK JOURNEY' : 'PLAYER JOURNEY'),
      el('div', { class: 'journey-title' }, label),
    ),
    el('button', {
      class: 'journey-close',
      'aria-label': 'Close',
      onclick: closeJourneyModal,
    }, '×'),
  );
  dialog.appendChild(head);

  const chain = el('ol', { class: 'journey-chain' });
  journey.forEach((trade, i) => {
    chain.appendChild(renderJourneyStep(trade, i + 1, type, payload));
  });

  // If this is a pick that was eventually drafted, add a final "Drafted" node.
  if (type === 'pick' && draftedInfo && draftedInfo.player_id) {
    chain.appendChild(renderJourneyDraftStep(draftedInfo, journey.length + 1));
  }
  dialog.appendChild(chain);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

function closeJourneyModal() {
  const o = document.getElementById('journeyOverlay');
  if (o) o.remove();
}

function renderJourneyStep(trade, idx, type, payload) {
  const sc = trade._scope;
  const dateStr = trade.status_updated ? fmtDate(trade.status_updated) : `Week ${trade._week}`;
  const rosters = trade.roster_ids || [];

  // Figure out from→to for this asset in this trade.
  let fromName = '?', toName = '?';
  if (type === 'player') {
    const toRid = trade.adds?.[payload.pid];
    const fromRid = trade.drops?.[payload.pid];
    if (toRid != null) toName = teamLabelInScope(toRid, sc);
    if (fromRid != null) fromName = teamLabelInScope(fromRid, sc);
    else if (rosters.length === 2 && toRid != null) {
      // Fallback: the other roster gave the player.
      const other = rosters.find(r => r !== toRid);
      if (other != null) fromName = teamLabelInScope(other, sc);
    }
  } else if (type === 'pick') {
    // Find the matching draft_pick entry in this trade.
    const dp = (trade.draft_picks || []).find(dp =>
      String(dp.season) === String(payload.pickKey.season) &&
      Number(dp.round) === Number(payload.pickKey.round) &&
      Number(dp.roster_id) === Number(payload.pickKey.roster_id));
    if (dp) {
      if (dp.previous_owner_id != null) fromName = teamLabelInScope(dp.previous_owner_id, sc);
      if (dp.owner_id != null) toName = teamLabelInScope(dp.owner_id, sc);
    }
  }

  return el('li', { class: 'journey-step' },
    el('div', { class: 'journey-step-num' }, String(idx)),
    el('div', { class: 'journey-step-body' },
      el('div', { class: 'journey-step-meta' },
        el('span', { class: 'year-tag' }, String(sc.season)),
        ' Week ', String(trade._week),
        ' · ', dateStr,
      ),
      el('div', { class: 'journey-step-arrow' },
        el('strong', {}, fromName),
        el('span', { class: 'muted' }, ' → '),
        el('strong', {}, toName),
      ),
      // Brief context: what else was in the trade.
      tradeContextLine(trade),
    ),
  );
}

function tradeContextLine(trade) {
  // List up to 4 assets total (players + picks) on either side, comma-separated.
  const items = [];
  for (const pid of Object.keys(trade.adds || {})) items.push(playerLabel(pid));
  for (const p of (trade.draft_picks || [])) items.push(pickLabel(p));
  if (!items.length) return null;
  const display = items.slice(0, 4).join(', ') + (items.length > 4 ? ` +${items.length - 4}` : '');
  return el('div', { class: 'journey-step-context muted small' }, 'Other assets: ', display);
}

function renderJourneyDraftStep(drafted, idx) {
  const slot = formatDraftSlot(drafted);
  const playerName = playerLabel(drafted.player_id);
  return el('li', { class: 'journey-step journey-step-draft' },
    el('div', { class: 'journey-step-num' }, String(idx)),
    el('div', { class: 'journey-step-body' },
      el('div', { class: 'journey-step-meta' },
        el('span', { class: 'chip good' }, 'DRAFTED'),
        ' ', drafted.season, ' rookie draft',
      ),
      el('div', { class: 'journey-step-arrow' },
        el('strong', {}, slot ? `${slot} ${playerName}` : playerName),
      ),
    ),
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

// Trade Adjustment box - shows value gained / lost per side since the trade.
function adjustmentBox(rosterA, deltaA, rosterB, deltaB, sc) {
  const nameA = teamLabelInScope(rosterA, sc);
  const nameB = teamLabelInScope(rosterB, sc);
  const winnerSide = deltaA > deltaB ? rosterA : (deltaB > deltaA ? rosterB : null);
  const winnerName = winnerSide === rosterA ? nameA : nameB;
  const margin = Math.abs(deltaA - deltaB);
  return el('div', { class: 'trade-adjust',
    title: 'Change in dynasty value of received assets since the trade.',
  },
    el('div', { class: 'trade-adjust-head' },
      el('span', { class: 'trade-adjust-label' }, 'TRADE ADJUSTMENT'),
      winnerSide
        ? el('span', { class: 'trade-adjust-summary' },
            `${winnerName} winning by ${fmtInt(margin)}`)
        : el('span', { class: 'trade-adjust-summary' }, 'Balanced'),
    ),
    el('div', { class: 'trade-adjust-rows' },
      adjustmentRow(nameA, deltaA),
      adjustmentRow(nameB, deltaB),
    ),
  );
}

function adjustmentRow(name, delta) {
  const sign = delta > 0 ? `+${fmtInt(delta)}` : (delta < 0 ? `${fmtInt(delta)}` : '0');
  const cls = delta > 0 ? 'up' : (delta < 0 ? 'down' : '');
  return el('div', { class: 'trade-adjust-row' },
    el('span', { class: 'trade-adjust-name' }, name),
    el('span', { class: `trade-adjust-delta ${cls}` }, sign),
    el('span', { class: 'trade-adjust-sub muted' }, 'value since trade'),
  );
}

function statCard(tone, label, value, sub) {
  return el('div', { class: `stat-card tone-${tone}` },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value || '—'),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}
