// Luck & all-play tab: actual record vs expected record; full all-play table.

import { el, fmtNum, fmtPct, teamCell, teamName } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups } from '../data.js';
import {
  computeStandings, computeAllPlay, computeExpectedWins,
} from '../analytics.js';

export async function renderLuck(host) {
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
  if (state.activeTab !== 'luck') return;

  const standings = computeStandings();
  const allPlay = computeAllPlay(maxWeek);
  const expWins = computeExpectedWins(maxWeek);

  // Sort by luck (actual - expected)
  const luckRows = standings.map(s => ({
    ...s,
    expected: expWins[s.roster_id]?.exp ?? 0,
    luck: s.wins - (expWins[s.roster_id]?.exp ?? 0),
  })).sort((a, b) => b.luck - a.luck);

  wrap.innerHTML = '';

  // Headline cards
  const luckiest = luckRows[0];
  const unluckiest = luckRows[luckRows.length - 1];
  wrap.appendChild(el('div', { class: 'stat-row' },
    statCard('Luckiest team', luckiest?.teamName || '—', luckiest ? `+${fmtNum(luckiest.luck, 1)} wins above expected` : ''),
    statCard('Unluckiest team', unluckiest?.teamName || '—', unluckiest ? `${fmtNum(unluckiest.luck, 1)} wins below expected` : ''),
    statCard('Best all-play', allPlay[0]?.teamName || '—', allPlay[0] ? `${fmtPct(allPlay[0].pct, 1)}` : ''),
    statCard('Worst all-play', allPlay[allPlay.length - 1]?.teamName || '—', allPlay[allPlay.length - 1] ? `${fmtPct(allPlay[allPlay.length - 1].pct, 1)}` : ''),
  ));

  // Luck table
  const luckTable = el('table', { class: 'data-table' });
  luckTable.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Team'),
    el('th', { class: 'num' }, 'Actual W'),
    el('th', { class: 'num', title: 'Expected wins from points scored each week' }, 'xW'),
    el('th', { class: 'num' }, 'Luck'),
    el('th', {}, ''),
  )));
  const lTbody = el('tbody');
  const maxLuck = Math.max(...luckRows.map(r => Math.abs(r.luck)), 1);
  luckRows.forEach((r, i) => {
    const pct = Math.min(100, (Math.abs(r.luck) / maxLuck) * 100);
    lTbody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', {}, teamCell(r.roster_id)),
      el('td', { class: 'num' }, String(r.wins)),
      el('td', { class: 'num' }, fmtNum(r.expected, 1)),
      el('td', { class: 'num' },
        el('span', { class: `chip ${r.luck > 0.5 ? 'good' : r.luck < -0.5 ? 'bad' : ''}` },
          (r.luck >= 0 ? '+' : '') + fmtNum(r.luck, 1)),
      ),
      el('td', { style: 'min-width: 140px' },
        el('div', { class: 'bar-track', style: 'height: 14px' },
          el('div', { class: `bar-fill ${r.luck >= 0 ? 'good' : 'bad'}`, style: `width: ${pct}%` }),
        ),
      ),
    ));
  });
  luckTable.appendChild(lTbody);
  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Luck index'),
    el('p', { class: 'muted small', style: 'margin: 0 0 12px' },
      'Each week we compute "expected wins" based on how your score stacks up against the rest of the league. ' +
      'A score above the median earns 1 expected win that week, between teams in a tie split it. ' +
      'Luck = actual wins − expected wins.'),
    el('div', { class: 'scrollable' }, luckTable),
  ));

  // All-play table
  const apTable = el('table', { class: 'data-table' });
  apTable.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Team'),
    el('th', { class: 'num' }, 'AP W'),
    el('th', { class: 'num' }, 'AP L'),
    el('th', { class: 'num' }, 'AP T'),
    el('th', { class: 'num' }, 'AP %'),
  )));
  const aTbody = el('tbody');
  allPlay.forEach((a, i) => {
    aTbody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', {}, teamCell(a.roster_id)),
      el('td', { class: 'num' }, String(a.wins)),
      el('td', { class: 'num' }, String(a.losses)),
      el('td', { class: 'num' }, String(a.ties)),
      el('td', { class: 'num' }, fmtPct(a.pct, 1)),
    ));
  });
  apTable.appendChild(aTbody);
  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'All-play (if everyone played everyone every week)'),
    el('div', { class: 'scrollable' }, apTable),
  ));
}

function statCard(label, value, sub) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value || '—'),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}
