// Matchups tab: weekly matchup history with bench points + records.

import { el, fmtNum, teamName, ownerName } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups } from '../data.js';
import { flattenMatchups } from '../analytics.js';

export async function renderMatchups(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading…'));

  const lg = state.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const currentWeek = state.nflState?.week || playoffStart - 1;
  const maxWeek = String(state.nflState?.season) === String(lg.season)
    ? Math.min(playoffStart - 1, currentWeek)
    : playoffStart - 1;

  await ensureMatchups(maxWeek);
  if (state.activeTab !== 'matchups') return;

  const all = flattenMatchups(maxWeek);
  const blowouts = [...all].sort((a, b) => b.margin - a.margin).slice(0, 5);
  const closest = [...all].filter(m => m.pointsA > 0 || m.pointsB > 0)
    .sort((a, b) => a.margin - b.margin).slice(0, 5);
  const high = [...all].sort((a, b) => b.combined - a.combined).slice(0, 5);

  wrap.innerHTML = '';

  wrap.appendChild(el('div', { class: 'stat-row' },
    statCard('Weeks played', String(maxWeek)),
    statCard('Total matchups', String(all.length)),
    statCard('Biggest blowout',
      blowouts[0] ? `${fmtNum(blowouts[0].margin, 1)} pts` : '—',
      blowouts[0] ? `${teamName(blowouts[0].a)} vs ${teamName(blowouts[0].b)} · W${blowouts[0].week}` : ''),
    statCard('Closest finish',
      closest[0] ? `${fmtNum(closest[0].margin, 1)} pts` : '—',
      closest[0] ? `${teamName(closest[0].a)} vs ${teamName(closest[0].b)} · W${closest[0].week}` : ''),
  ));

  wrap.appendChild(listPanel('Biggest blowouts', blowouts, true));
  wrap.appendChild(listPanel('Closest finishes', closest, true));
  wrap.appendChild(listPanel('Highest combined scores', high, true));

  // Week by week
  const weekly = el('section', { class: 'panel' }, el('h3', {}, 'Week by week'));
  for (let w = maxWeek; w >= 1; w--) {
    const wm = all.filter(m => m.week === w);
    if (!wm.length) continue;
    weekly.appendChild(el('div', { class: 'week-block' },
      el('div', { class: 'week-head' }, `Week ${w}`),
      el('div', { class: 'matchup-grid' },
        ...wm.sort((a, b) => b.combined - a.combined).map(m => matchupRow(m)),
      ),
    ));
  }
  wrap.appendChild(weekly);
}

function matchupRow(m, showWeek = false) {
  return el('div', { class: 'matchup-row' },
    showWeek ? el('div', { class: 'matchup-week' }, `W${m.week}`) : el('div', {}),
    el('div', { class: 'matchup-team winner' },
      el('span', { class: 'mt-name' }, teamName(m.a)),
      el('span', { class: 'mt-score' }, fmtNum(m.pointsA, 1)),
    ),
    el('div', { class: 'matchup-vs' }, 'vs'),
    el('div', { class: 'matchup-team' },
      el('span', { class: 'mt-name' }, teamName(m.b)),
      el('span', { class: 'mt-score' }, fmtNum(m.pointsB, 1)),
    ),
    el('div', { class: 'matchup-margin' }, fmtNum(m.margin, 1) + ' pts'),
  );
}

function listPanel(title, items, showWeek) {
  if (!items.length) return el('section', { class: 'panel empty-panel' },
    el('h3', {}, title), el('p', { class: 'muted' }, 'No data yet.'));
  const grid = el('div', { class: 'matchup-grid' });
  items.forEach(m => grid.appendChild(matchupRow(m, showWeek)));
  return el('section', { class: 'panel' }, el('h3', {}, title), grid);
}

function statCard(label, value, sub) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value || '—'),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}
