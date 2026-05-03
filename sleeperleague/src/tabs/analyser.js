// Trade analyser: KTC-style what-if calculator. Pick assets for each side
// and see who wins after the impact-based Value Adjustment is applied.

import { el, fmtInt, playerLabel, playerMeta, playerValue } from '../helpers.js';
import { state } from '../state.js';
import { ensurePlayers, ensureValues, ensurePickValueIndex, pickValueForTrade } from '../data.js';
import {
  playerImpactScore, pickImpactScore, valueAdjustment, isSuperflexLeague,
} from '../impact.js';

// One Set per side, holds asset keys: "p:<sleeperId>" or "k:<season>|<round>|<slot>"
const sides = [new Set(), new Set()];
const sideLabels = ['Team A', 'Team B'];

export async function renderAnalyser(host) {
  const wrap = el('div', { class: 'tab-section analyser' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading players + values…'));

  await Promise.all([ensurePlayers(), ensureValues(), ensurePickValueIndex()]);
  if (state.activeTab !== 'analyser') return;

  wrap.innerHTML = '';

  wrap.appendChild(el('section', { class: 'panel analyser-intro' },
    el('h3', {}, 'Trade analyser'),
    el('p', { class: 'muted small' },
      'Build a hypothetical trade. Search for players or picks to add to either side. ' +
      'The impact-based Value Adjustment is applied just like on the trades page.'),
  ));

  const grid = el('div', { class: 'analyser-grid' });
  const sidePanels = [renderSide(0, refresh), renderSide(1, refresh)];
  grid.appendChild(sidePanels[0].panel);
  grid.appendChild(sidePanels[1].panel);
  wrap.appendChild(grid);

  const result = el('section', { class: 'panel analyser-result' });
  wrap.appendChild(result);

  function refresh() {
    sidePanels[0].refresh();
    sidePanels[1].refresh();
    renderResult(result);
  }
  refresh();
}

// ---- Side panel ----

function renderSide(idx, onChange) {
  const panel = el('div', { class: 'analyser-side panel' });
  const head = el('div', { class: 'analyser-side-head' },
    el('h4', {}, sideLabels[idx] + ' gets…'),
    el('button', { class: 'analyser-clear muted small',
      onclick: () => { sides[idx].clear(); onChange(); },
    }, 'Clear'),
  );
  panel.appendChild(head);

  const search = renderSearch(idx, onChange);
  panel.appendChild(search);

  const list = el('div', { class: 'analyser-asset-list' });
  panel.appendChild(list);

  const totals = el('div', { class: 'analyser-side-totals' });
  panel.appendChild(totals);

  function refresh() {
    list.innerHTML = '';
    const items = [...sides[idx]];
    if (!items.length) {
      list.appendChild(el('div', { class: 'muted small analyser-empty' }, 'No assets yet'));
    }
    let total = 0;
    let players = 0, picks = 0;
    for (const key of items) {
      const asset = decodeAsset(key);
      const v = assetValue(asset);
      total += v;
      if (asset.type === 'player') players++; else picks++;
      list.appendChild(renderAssetRow(asset, v, () => {
        sides[idx].delete(key);
        onChange();
      }));
    }
    totals.innerHTML = '';
    if (items.length) {
      totals.appendChild(el('div', { class: 'analyser-side-total-row' },
        el('div', {},
          el('div', { class: 'analyser-total-count' }, `${items.length} Total Pieces`),
          el('div', { class: 'muted small' }, summarizePieces(players, picks)),
        ),
        el('div', { class: 'analyser-total-value' }, fmtInt(total)),
      ));
    }
  }

  return { panel, refresh };
}

function summarizePieces(players, picks) {
  const parts = [];
  if (players) parts.push(`${players} Player${players === 1 ? '' : 's'}`);
  if (picks)   parts.push(`${picks} Pick${picks === 1 ? '' : 's'}`);
  return parts.join(', ');
}

function renderAssetRow(asset, value, onRemove) {
  const row = el('div', { class: 'analyser-asset' });
  if (asset.type === 'player') {
    const pos = (state.players?.[asset.pid]?.position || '').toUpperCase();
    const cls = ['QB','RB','WR','TE','K','DEF'].includes(pos) ? pos.toLowerCase() : '';
    row.appendChild(el('span', { class: `asset-tag ${cls}` }, pos || '—'));
    row.appendChild(el('span', { class: 'asset-name' }, playerLabel(asset.pid)));
    row.appendChild(el('span', { class: 'muted small analyser-meta' }, playerMeta(asset.pid)));
  } else {
    row.appendChild(el('span', { class: 'asset-tag' }, 'PICK'));
    row.appendChild(el('span', { class: 'asset-name' }, formatPickLabel(asset)));
    row.appendChild(el('span', { class: 'muted small analyser-meta' }, ''));
  }
  row.appendChild(el('span', { class: 'asset-value' }, fmtInt(value)));
  row.appendChild(el('button', { class: 'analyser-remove', 'aria-label': 'Remove', onclick: onRemove }, '×'));
  return row;
}

// ---- Search ----

function renderSearch(idx, onChange) {
  const wrap = el('div', { class: 'analyser-search-wrap' });
  const input = el('input', {
    type: 'text',
    class: 'analyser-search',
    placeholder: 'Search for a player or pick (e.g. Joe Burrow, 2026 1.01)',
    autocomplete: 'off',
  });
  const results = el('div', { class: 'analyser-search-results' });
  wrap.appendChild(input);
  wrap.appendChild(results);

  let activeIdx = -1;
  let currentMatches = [];

  const runQuery = (q) => {
    results.innerHTML = '';
    activeIdx = -1;
    currentMatches = [];
    const trimmed = q.trim();
    if (!trimmed) { results.classList.remove('open'); return; }
    const matches = searchAssets(trimmed, sides[idx]).slice(0, 12);
    currentMatches = matches;
    if (!matches.length) {
      results.classList.add('open');
      results.appendChild(el('div', { class: 'analyser-search-empty muted small' }, 'No matches'));
      return;
    }
    matches.forEach((m, i) => {
      const item = el('div', { class: 'analyser-search-item',
        onclick: () => commit(m),
      },
        m.type === 'player'
          ? renderPlayerOption(m)
          : renderPickOption(m),
      );
      results.appendChild(item);
    });
    results.classList.add('open');
  };

  function commit(m) {
    sides[idx].add(encodeAsset(m));
    input.value = '';
    results.classList.remove('open');
    results.innerHTML = '';
    onChange();
    input.focus();
  }

  input.addEventListener('input', () => runQuery(input.value));
  input.addEventListener('focus', () => { if (input.value.trim()) runQuery(input.value); });
  input.addEventListener('blur', () => setTimeout(() => results.classList.remove('open'), 120));
  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll('.analyser-search-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = Math.min(items.length - 1, activeIdx + 1);
      items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = Math.max(0, activeIdx - 1);
      items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = currentMatches[activeIdx >= 0 ? activeIdx : 0];
      if (pick) commit(pick);
    } else if (e.key === 'Escape') {
      results.classList.remove('open');
    }
  });

  return wrap;
}

function renderPlayerOption(m) {
  const pos = (state.players?.[m.pid]?.position || '').toUpperCase();
  const cls = ['QB','RB','WR','TE','K','DEF'].includes(pos) ? pos.toLowerCase() : '';
  return el('div', { class: 'analyser-option' },
    el('span', { class: `asset-tag ${cls}` }, pos || '—'),
    el('span', { class: 'analyser-option-name' }, playerLabel(m.pid)),
    el('span', { class: 'muted small' }, playerMeta(m.pid)),
    el('span', { class: 'analyser-option-value' }, fmtInt(playerValue(m.pid))),
  );
}

function renderPickOption(m) {
  return el('div', { class: 'analyser-option' },
    el('span', { class: 'asset-tag' }, 'PICK'),
    el('span', { class: 'analyser-option-name' }, formatPickLabel(m)),
    el('span', { class: 'muted small' }, ''),
    el('span', { class: 'analyser-option-value' }, fmtInt(pickValueForTrade({ season: m.season, round: m.round }))),
  );
}

// Synthesize pick options (3 future seasons × 4 rounds × 12 slots) to keep
// the search index small but expressive enough to drive the analyser.
function buildPickOptions() {
  const out = [];
  const baseSeason = state.league?.season ? Number(state.league.season) : new Date().getFullYear();
  for (let yr = baseSeason; yr <= baseSeason + 2; yr++) {
    for (let r = 1; r <= 4; r++) {
      for (let s = 1; s <= 12; s++) {
        out.push({ type: 'pick', season: String(yr), round: r, slot: s });
      }
    }
  }
  return out;
}

let _pickOptionsCache = null;
function pickOptions() {
  if (!_pickOptionsCache) _pickOptionsCache = buildPickOptions();
  return _pickOptionsCache;
}

function searchAssets(query, exclude) {
  const q = query.toLowerCase();
  const out = [];

  // Pick search: match "2026 1.01", "2026 r1 mid", "2026 1st", etc.
  const pickMatches = pickOptions().filter(p => {
    const tokens = [
      `${p.season} ${p.round}.${String(p.slot).padStart(2,'0')}`,
      `${p.season} r${p.round}`,
      `${p.season} ${p.round}`,
      formatPickLabel(p).toLowerCase(),
    ].join(' ').toLowerCase();
    return tokens.includes(q);
  });
  for (const p of pickMatches) {
    if (exclude.has(encodeAsset(p))) continue;
    out.push(p);
  }

  // Player search: name contains query, has a value > 0.
  if (state.players) {
    for (const [pid, p] of Object.entries(state.players)) {
      if (!p) continue;
      const pos = (p.position || '').toUpperCase();
      if (!['QB','RB','WR','TE'].includes(pos)) continue;
      const v = playerValue(pid);
      if (v <= 0) continue;
      const name = (p.full_name || `${p.first_name||''} ${p.last_name||''}`).toLowerCase();
      if (!name.includes(q)) continue;
      if (exclude.has(`p:${pid}`)) continue;
      out.push({ type: 'player', pid });
    }
  }

  // Sort: players first by value desc, then picks by season+pickNo asc.
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'player' ? -1 : 1;
    if (a.type === 'player') return (playerValue(b.pid) || 0) - (playerValue(a.pid) || 0);
    if (a.season !== b.season) return Number(a.season) - Number(b.season);
    const pa = (a.round - 1) * 12 + a.slot;
    const pb = (b.round - 1) * 12 + b.slot;
    return pa - pb;
  });

  return out;
}

// ---- Result ----

function renderResult(host) {
  host.innerHTML = '';
  host.appendChild(el('h3', {}, 'Result'));

  const isSuperflex = isSuperflexLeague(state.league);
  const totals = sides.map((s) => sideTotalsFromKeys([...s], isSuperflex));

  const adjA = valueAdjustment(totals[0], totals[1]);
  const adjB = valueAdjustment(totals[1], totals[0]);
  let adj = null;
  if (adjA > adjB && adjA > 0) adj = { side: 0, amount: adjA };
  else if (adjB > 0) adj = { side: 1, amount: adjB };

  const aTotal = totals[0].rawValue + (adj?.side === 0 ? adj.amount : 0);
  const bTotal = totals[1].rawValue + (adj?.side === 1 ? adj.amount : 0);

  if (adj) {
    const studName = sideLabels[adj.side];
    const otherName = sideLabels[1 - adj.side];
    host.appendChild(el('div', { class: 'value-adj' },
      el('div', { class: 'value-adj-head' },
        el('span', { class: 'value-adj-label' }, 'VALUE ADJUSTMENT'),
        el('span', { class: 'value-adj-amount' }, `+${fmtInt(adj.amount)} to ${studName}`),
      ),
      el('div', { class: 'value-adj-explain muted small' },
        `Impact premium: ${studName}'s top asset scores higher for position scarcity, age, and startability. ` +
        `${otherName} would need roughly ${fmtInt(adj.amount)} more in impact assets to balance the trade.`),
    ));
  }

  const margin = Math.abs(aTotal - bTotal);
  const total = aTotal + bTotal || 1;
  const winnerIdx = aTotal > bTotal ? 0 : (bTotal > aTotal ? 1 : null);
  const verdict = (() => {
    if (winnerIdx == null) return { tone: 'even', text: 'Even trade' };
    const r = margin / total;
    if (r > 0.25) return { tone: 'fleece', text: `${sideLabels[winnerIdx]} fleeces ${sideLabels[1 - winnerIdx]}` };
    if (r > 0.05) return { tone: 'win',    text: `${sideLabels[winnerIdx]} edges ${sideLabels[1 - winnerIdx]}` };
    return { tone: 'even', text: 'Roughly even' };
  })();

  host.appendChild(el('div', { class: `analyser-verdict ${verdict.tone}` }, verdict.text));

  host.appendChild(el('div', { class: 'analyser-totals' },
    sideTotalCol('A', sideLabels[0], totals[0], adj?.side === 0 ? adj.amount : 0, aTotal),
    sideTotalCol('B', sideLabels[1], totals[1], adj?.side === 1 ? adj.amount : 0, bTotal),
  ));
}

function sideTotalCol(letter, label, t, bonus, finalTotal) {
  return el('div', { class: 'analyser-total-col' },
    el('div', { class: 'analyser-total-label' }, label),
    el('div', { class: 'analyser-total-row' },
      el('span', { class: 'muted small' }, 'Pieces'),
      el('span', {}, fmtInt(t.rawValue)),
    ),
    bonus > 0
      ? el('div', { class: 'analyser-total-row analyser-bonus' },
          el('span', { class: 'muted small' }, 'Adjustment'),
          el('span', {}, `+${fmtInt(bonus)}`),
        )
      : null,
    el('div', { class: 'analyser-total-row analyser-grand' },
      el('span', {}, 'Total'),
      el('span', {}, fmtInt(finalTotal)),
    ),
  );
}

function sideTotalsFromKeys(keys, isSuperflex) {
  let rawValue = 0;
  let bestImpactScore = 0;
  let bestAssetValue = 0;
  let assetCount = 0;
  for (const key of keys) {
    const asset = decodeAsset(key);
    const v = assetValue(asset);
    rawValue += v;
    assetCount++;
    if (v > bestAssetValue) bestAssetValue = v;
    let impact;
    if (asset.type === 'player') impact = playerImpactScore(asset.pid, v, isSuperflex);
    else                          impact = pickImpactScore(v, asset.round, asset.slot);
    if (impact > bestImpactScore) bestImpactScore = impact;
  }
  return { rawValue, bestImpactScore, bestAssetValue, assetCount };
}

// ---- Asset key encoding ----

function encodeAsset(a) {
  if (a.type === 'player') return `p:${a.pid}`;
  return `k:${a.season}|${a.round}|${a.slot}`;
}

function decodeAsset(key) {
  if (key.startsWith('p:')) return { type: 'player', pid: key.slice(2) };
  const [season, round, slot] = key.slice(2).split('|');
  return { type: 'pick', season, round: Number(round), slot: Number(slot) };
}

function assetValue(asset) {
  if (asset.type === 'player') return playerValue(asset.pid) || 0;
  return pickValueForTrade({ season: asset.season, round: asset.round, slot: pickSlotName(asset.slot) }) || 0;
}

function pickSlotName(slot) {
  if (slot <= 4) return 'early';
  if (slot >= 9) return 'late';
  return 'mid';
}

function formatPickLabel(p) {
  const slot = String(p.slot).padStart(2, '0');
  return `${p.season} Pick ${p.round}.${slot}`;
}
