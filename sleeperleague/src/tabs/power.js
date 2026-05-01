// Power rankings: composite score = 50% all-play % + 30% PPG percentile + 20% recent 4-week PPG percentile.

import { el, fmtNum, fmtPct, teamCell } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups } from '../data.js';
import {
  computePowerRankings, computeAllPlay, computeWeeklyScores,
} from '../analytics.js';

export async function renderPower(host) {
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
  if (state.activeTab !== 'power') return;

  const weekly = computeWeeklyScores(maxWeek);
  const allPlay = computeAllPlay(maxWeek);
  const power = computePowerRankings(allPlay, weekly);

  wrap.innerHTML = '';

  const explanation = el('p', { class: 'muted small', style: 'margin: 0 0 12px' },
    'Composite score = 50% all-play win % + 30% scoring percentile + 20% last-4-week scoring percentile. ' +
    'Higher score = better team if luck of schedule was removed.'
  );

  const table = el('table', { class: 'data-table' });
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Team'),
    el('th', { class: 'num' }, 'Power'),
    el('th', { class: 'num' }, 'AP %'),
    el('th', { class: 'num' }, 'PPG'),
    el('th', { class: 'num', title: 'Average over last 4 weeks' }, 'Last 4 PPG'),
    el('th', { class: 'num' }, 'Record'),
  )));
  const tbody = el('tbody');
  power.forEach((p, i) => {
    tbody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', {}, teamCell(p.roster_id)),
      el('td', { class: 'num' }, fmtNum(p.powerScore * 100, 1)),
      el('td', { class: 'num' }, fmtPct(p.allPlayPct, 1)),
      el('td', { class: 'num' }, fmtNum(p.ppg, 1)),
      el('td', { class: 'num' }, fmtNum(p.recentPPG, 1)),
      el('td', { class: 'num' }, `${p.wins}-${p.losses}${p.ties ? '-'+p.ties : ''}`),
    ));
  });
  table.appendChild(tbody);

  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Power rankings'),
    explanation,
    el('div', { class: 'scrollable' }, table),
  ));

  // Visual bar chart for power score
  const max = Math.max(...power.map(p => p.powerScore), 0.001);
  const bars = el('div', {});
  power.forEach((p, i) => {
    const pct = (p.powerScore / max) * 100;
    bars.appendChild(el('div', { class: 'bar-row' },
      el('div', { style: 'font-weight:700;color:var(--accent);font-size:12px;' }, String(i + 1)),
      el('div', { class: 'bar-track' },
        el('div', { class: 'bar-fill', style: `width: ${pct}%;` }),
        el('div', { class: 'bar-label' },
          el('span', {}, p.teamName),
          el('span', {}, fmtNum(p.powerScore * 100, 1)),
        ),
      ),
      el('div', { class: 'bar-value muted small' }, `${p.wins}-${p.losses}`),
    ));
  });
  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Power score chart'),
    bars,
  ));
}
