// Drafts tab: pick-by-pick view + best value / biggest reach using current dynasty values.

import { el, fmtInt, teamName, playerLabel } from '../helpers.js';
import { state } from '../state.js';
import { ensureDrafts, ensureDraftPicks, ensurePlayers, ensureValues } from '../data.js';

export async function renderDrafts(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading…'));

  await Promise.all([ensurePlayers(), ensureValues(), ensureDrafts()]);
  if (state.activeTab !== 'drafts') return;

  const drafts = state.drafts;
  if (!drafts.length) {
    wrap.innerHTML = '';
    wrap.appendChild(el('section', { class: 'panel empty-panel' },
      el('h3', {}, 'No drafts'),
      el('p', { class: 'muted' }, 'No draft data is available for this league.'),
    ));
    return;
  }

  // Pick the most recent draft
  const draft = drafts.sort((a, b) => (b.start_time || 0) - (a.start_time || 0))[0];
  const picks = await ensureDraftPicks(draft.draft_id);

  // Roster id from draft_slot via draft.slot_to_roster_id
  const slotMap = draft.slot_to_roster_id || {};

  // Annotate with current value.
  // Use p.roster_id (actual drafter after any pick trades) over slotMap (original slot owner).
  const annotated = picks.map(p => ({
    ...p,
    value: state.values?.get(String(p.player_id)) || 0,
    rosterId: p.roster_id || slotMap[p.draft_slot] || null,
  }));

  // Best value: highest current value relative to pick number
  const totalPicks = annotated.length;
  const valuePerPick = annotated.map(p => ({
    ...p,
    deltaScore: (p.value || 0) - (totalPicks - p.pick_no), // crude expected: later picks should have less value
  }));
  const bestValue = [...valuePerPick].sort((a, b) => b.deltaScore - a.deltaScore).slice(0, 5);
  const biggestReach = [...valuePerPick].sort((a, b) => a.deltaScore - b.deltaScore).slice(0, 5);

  wrap.innerHTML = '';

  wrap.appendChild(el('div', { class: 'stat-row' },
    statCard('Type', draft.type || 'Snake'),
    statCard('Rounds', String(draft.settings?.rounds || '—')),
    statCard('Picks made', String(annotated.length)),
    statCard('Status', draft.status || '—'),
  ));

  // Best value
  wrap.appendChild(picksPanel('Best value picks (current value)', bestValue));
  wrap.appendChild(picksPanel('Biggest reaches', biggestReach));

  // Round by round
  const rounds = {};
  annotated.forEach(p => {
    rounds[p.round] = rounds[p.round] || [];
    rounds[p.round].push(p);
  });
  const roundList = Object.keys(rounds).sort((a, b) => Number(a) - Number(b));
  const board = el('section', { class: 'panel' },
    el('h3', {}, 'Draft board'),
  );
  for (const r of roundList) {
    const block = el('div', { class: 'week-block' },
      el('div', { class: 'week-head' }, `Round ${r}`),
      el('div', { class: 'draft-board' },
        ...rounds[r].sort((a, b) => a.pick_no - b.pick_no).map(p => pickRow(p)),
      ),
    );
    board.appendChild(block);
  }
  wrap.appendChild(board);
}

function pickRow(p) {
  const playerName = p.metadata?.first_name && p.metadata?.last_name
    ? `${p.metadata.first_name} ${p.metadata.last_name}`
    : playerLabel(p.player_id);
  return el('div', { class: 'draft-pick' },
    el('div', { class: 'pick-no' }, `${p.round}.${String(p.draft_slot).padStart(2, '0')}`),
    el('div', { class: 'player' }, playerName),
    el('div', { class: 'pos' }, p.metadata?.position || '?'),
    el('div', { class: 'by' }, p.rosterId ? teamName(p.rosterId) : '—'),
  );
}

function picksPanel(title, picks) {
  if (!picks.length) return el('section', { class: 'panel empty-panel' },
    el('h3', {}, title), el('p', { class: 'muted' }, 'No picks.'));
  const list = el('div', { class: 'draft-board' });
  picks.forEach(p => list.appendChild(el('div', { class: 'draft-pick' },
    el('div', { class: 'pick-no' }, `#${p.pick_no}`),
    el('div', { class: 'player' },
      p.metadata?.first_name && p.metadata?.last_name
        ? `${p.metadata.first_name} ${p.metadata.last_name}`
        : playerLabel(p.player_id),
    ),
    el('div', { class: 'pos' }, p.metadata?.position || '?'),
    el('div', { class: 'by' },
      `${p.rosterId ? teamName(p.rosterId) : '—'} · `,
      el('span', { style: 'color: var(--accent); font-weight: 600' }, fmtInt(p.value)),
    ),
  )));
  return el('section', { class: 'panel' }, el('h3', {}, title), list);
}

function statCard(label, value, sub) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value || '—'),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}
