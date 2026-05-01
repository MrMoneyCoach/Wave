// Schedule tab: each team's strength of schedule + "what if you had X's schedule?" matrix.

import { el, fmtNum, teamCell, teamName } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups } from '../data.js';
import {
  computeWeeklyScores, computeScheduleStrength, computeScheduleSwapMatrix,
} from '../analytics.js';

export async function renderSchedule(host) {
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
  if (state.activeTab !== 'schedule') return;

  const weekly = computeWeeklyScores(maxWeek);
  const sos = computeScheduleStrength(weekly);
  const swap = computeScheduleSwapMatrix(weekly);

  wrap.innerHTML = '';

  // SoS table
  const sosTable = el('table', { class: 'data-table' });
  sosTable.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Team'),
    el('th', { class: 'num', title: 'Average opponent points per game faced' }, 'Opp PPG'),
    el('th', { class: 'num' }, 'Games'),
  )));
  const sBody = el('tbody');
  sos.forEach((s, i) => {
    sBody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', {}, teamCell(s.roster_id)),
      el('td', { class: 'num' }, fmtNum(s.avgOppPPG, 1)),
      el('td', { class: 'num' }, String(s.games)),
    ));
  });
  sosTable.appendChild(sBody);
  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Strength of schedule (so far)'),
    el('p', { class: 'muted small', style: 'margin: 0 0 12px' },
      'Average points per game scored by the opponents each team has actually faced. Higher = harder schedule.'),
    el('div', { class: 'scrollable' }, sosTable),
  ));

  // Swap matrix
  const rosters = state.rosters.map(r => r.roster_id);
  const matrixTable = el('table', { class: 'data-table' });
  const head = el('tr', {},
    el('th', {}, ''),
    ...rosters.map(rid => el('th', { class: 'num', title: teamName(rid) },
      teamName(rid).slice(0, 8))),
  );
  matrixTable.appendChild(el('thead', {}, head));
  const mBody = el('tbody');
  rosters.forEach(a => {
    const row = el('tr', {},
      el('td', { style: 'font-weight: 600; min-width: 140px' }, teamName(a)),
    );
    rosters.forEach(b => {
      const r = swap[a]?.[b] || { wins: 0, losses: 0, ties: 0 };
      const tot = r.wins + r.losses + r.ties;
      const pct = tot ? r.wins / tot : 0;
      const cls = a === b ? '' : (pct > 0.6 ? 'good' : pct < 0.4 ? 'bad' : '');
      row.appendChild(el('td', {
        class: 'num',
        style: a === b ? 'opacity: 0.4' : '',
        title: a === b ? 'Self' : `${teamName(a)}'s scores against ${teamName(b)}'s schedule: ${r.wins}-${r.losses}${r.ties ? '-' + r.ties : ''}`,
      },
        el('span', { class: `chip ${cls}` }, `${r.wins}-${r.losses}`),
      ));
    });
    mBody.appendChild(row);
  });
  matrixTable.appendChild(mBody);

  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Schedule swap matrix'),
    el('p', { class: 'muted small', style: 'margin: 0 0 12px' },
      'Read the row team\'s record if it had played the column team\'s schedule (using its own actual scores).'),
    el('div', { class: 'scrollable' }, matrixTable),
  ));
}
