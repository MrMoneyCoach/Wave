// Standings tab: full standings with PF, PA, max PF, efficiency, all-play, expected wins.

import { el, fmtNum, fmtPct, teamCell } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups } from '../data.js';
import {
  computeStandings, computeAllPlay, computeExpectedWins,
} from '../analytics.js';

export async function renderStandings(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading…'));

  const lg = state.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const lastReg = playoffStart - 1;
  const currentWeek = state.nflState?.week || lastReg;
  const maxWeek = String(state.nflState?.season) === String(lg.season)
    ? Math.min(lastReg, currentWeek)
    : lastReg;

  await ensureMatchups(maxWeek);
  if (state.activeTab !== 'standings') return;

  const standings = computeStandings();
  const allPlay = computeAllPlay(maxWeek);
  const expWins = computeExpectedWins(maxWeek);

  wrap.innerHTML = '';
  const table = el('table', { class: 'data-table' });
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Team'),
    el('th', { class: 'num', title: 'Wins' }, 'W'),
    el('th', { class: 'num', title: 'Losses' }, 'L'),
    el('th', { class: 'num', title: 'Ties' }, 'T'),
    el('th', { class: 'num', title: 'Points for' }, 'PF'),
    el('th', { class: 'num', title: 'Points against' }, 'PA'),
    el('th', { class: 'num', title: 'Points per game' }, 'PPG'),
    el('th', { class: 'num', title: 'Max points possible if optimal lineup played' }, 'Max PF'),
    el('th', { class: 'num', title: 'Lineup efficiency' }, 'Eff%'),
    el('th', { class: 'num', title: 'All-play wins / total all-play games' }, 'AP'),
    el('th', { class: 'num', title: 'Expected wins from points scored' }, 'xW'),
    el('th', { class: 'num', title: 'Actual wins minus expected — positive = lucky' }, 'Luck'),
  )));
  const tbody = el('tbody');
  standings.forEach((t, i) => {
    const ap = allPlay.find(a => a.roster_id === t.roster_id);
    const exp = expWins[t.roster_id]?.exp ?? 0;
    const luck = t.wins - exp;
    tbody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', {}, teamCell(t.roster_id)),
      el('td', { class: 'num' }, String(t.wins)),
      el('td', { class: 'num' }, String(t.losses)),
      el('td', { class: 'num' }, String(t.ties)),
      el('td', { class: 'num' }, fmtNum(t.pf, 1)),
      el('td', { class: 'num' }, fmtNum(t.pa, 1)),
      el('td', { class: 'num' }, fmtNum(t.ppg, 1)),
      el('td', { class: 'num' }, fmtNum(t.ppts, 1)),
      el('td', { class: 'num' }, t.efficiency ? fmtPct(t.efficiency, 1) : '—'),
      el('td', { class: 'num' }, ap ? `${ap.wins}-${ap.losses}` : '—'),
      el('td', { class: 'num' }, fmtNum(exp, 1)),
      el('td', { class: 'num' },
        el('span', { class: `chip ${luck > 0.5 ? 'good' : luck < -0.5 ? 'bad' : ''}` },
          (luck >= 0 ? '+' : '') + fmtNum(luck, 1))
      ),
    ));
  });
  table.appendChild(tbody);

  wrap.appendChild(el('section', { class: 'panel' },
    el('div', { class: 'panel-head' },
      el('h3', {}, 'Standings'),
      el('div', { class: 'muted small' }, 'PF/PA from Sleeper. AP, xW and Luck computed from weekly scores.'),
    ),
    el('div', { class: 'scrollable' }, table),
  ));
}
