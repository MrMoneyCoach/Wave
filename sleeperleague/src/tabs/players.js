// Players tab: top performers across the league, by position and overall.

import { el, fmtNum, playerLabel, playerMeta, teamName } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups, ensurePlayers } from '../data.js';

export async function renderPlayers(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading…'));

  const lg = state.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const currentWeek = state.nflState?.week || playoffStart - 1;
  const maxWeek = String(state.nflState?.season) === String(lg.season)
    ? Math.min(playoffStart - 1, currentWeek)
    : playoffStart - 1;

  await Promise.all([ensurePlayers(), ensureMatchups(maxWeek)]);
  if (state.activeTab !== 'players') return;

  // Aggregate per-player from matchups[week][n].players_points
  // Each matchup record has players_points: { player_id: pts } (player's full week score regardless of starter)
  // and starters: [player_ids] (whose points counted).
  const totals = {};       // playerId -> { total, starts, weeks, rosterId, bestWeek }
  for (let w = 1; w <= maxWeek; w++) {
    const ms = state.matchupsByWeek[w];
    if (!ms || !ms.length) continue;
    for (const m of ms) {
      const pp = m.players_points || {};
      const startersSet = new Set(m.starters || []);
      for (const [pid, pts] of Object.entries(pp)) {
        if (!totals[pid]) totals[pid] = { total: 0, starts: 0, weeks: 0, rosterId: m.roster_id, bestWeek: { week: 0, pts: 0 } };
        totals[pid].total += pts || 0;
        totals[pid].weeks++;
        if (startersSet.has(pid)) totals[pid].starts++;
        if ((pts || 0) > totals[pid].bestWeek.pts) {
          totals[pid].bestWeek = { week: w, pts: pts || 0 };
        }
      }
    }
  }

  const all = Object.entries(totals).map(([pid, v]) => {
    const p = state.players?.[pid] || {};
    return {
      pid,
      name: playerLabel(pid),
      pos: p.position || '?',
      team: p.team || '',
      total: v.total,
      starts: v.starts,
      weeks: v.weeks,
      rosterId: v.rosterId,
      bestWeek: v.bestWeek,
      ppg: v.weeks ? v.total / v.weeks : 0,
    };
  }).filter(p => p.total > 0);

  wrap.innerHTML = '';

  // Top 25 overall
  wrap.appendChild(playerTable('Top 25 scorers (rostered)',
    [...all].sort((a, b) => b.total - a.total).slice(0, 25)));

  // Top 5 per position
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
  const posPanel = el('section', { class: 'panel' },
    el('h3', {}, 'Top 5 by position'),
  );
  const posGrid = el('div', { class: 'three-col' });
  positions.forEach(pos => {
    const top = all.filter(p => p.pos === pos).sort((a, b) => b.total - a.total).slice(0, 5);
    if (!top.length) return;
    posGrid.appendChild(el('div', { class: 'panel', style: 'background: var(--bg-2);' },
      el('h4', {}, pos),
      el('table', { class: 'data-table' },
        el('tbody', {},
          ...top.map((p, i) => el('tr', {},
            el('td', { class: 'rank' }, String(i + 1)),
            el('td', {},
              el('div', { style: 'font-weight: 600' }, p.name),
              el('div', { class: 'muted small' }, p.team + ' · ' + teamName(p.rosterId)),
            ),
            el('td', { class: 'num' }, fmtNum(p.total, 1)),
          )),
        ),
      ),
    ));
  });
  posPanel.appendChild(posGrid);
  wrap.appendChild(posPanel);

  // Best single-week performances
  const bestWeeks = [...all].map(p => ({
    name: p.name, pos: p.pos, week: p.bestWeek.week, pts: p.bestWeek.pts,
    rosterId: p.rosterId,
  })).filter(p => p.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 15);

  const bwTable = el('table', { class: 'data-table' });
  bwTable.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Player'),
    el('th', {}, 'Pos'),
    el('th', {}, 'Team'),
    el('th', { class: 'num' }, 'Week'),
    el('th', { class: 'num' }, 'Points'),
  )));
  const bwBody = el('tbody');
  bestWeeks.forEach((p, i) => {
    bwBody.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', { style: 'font-weight: 600' }, p.name),
      el('td', {}, el('span', { class: 'chip' }, p.pos)),
      el('td', {}, teamName(p.rosterId)),
      el('td', { class: 'num' }, String(p.week)),
      el('td', { class: 'num' }, fmtNum(p.pts, 1)),
    ));
  });
  bwTable.appendChild(bwBody);
  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Best single-week performances'),
    el('div', { class: 'scrollable' }, bwTable),
  ));
}

function playerTable(title, list) {
  const t = el('table', { class: 'data-table' });
  t.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Player'),
    el('th', {}, 'Pos'),
    el('th', {}, 'Rostered by'),
    el('th', { class: 'num' }, 'Total'),
    el('th', { class: 'num' }, 'Wks'),
    el('th', { class: 'num' }, 'PPG'),
    el('th', { class: 'num' }, 'Started'),
  )));
  const body = el('tbody');
  list.forEach((p, i) => {
    body.appendChild(el('tr', {},
      el('td', { class: 'rank' }, String(i + 1)),
      el('td', { style: 'font-weight: 600' }, p.name),
      el('td', {}, el('span', { class: 'chip' }, p.pos)),
      el('td', { class: 'muted' }, teamName(p.rosterId)),
      el('td', { class: 'num' }, fmtNum(p.total, 1)),
      el('td', { class: 'num' }, String(p.weeks)),
      el('td', { class: 'num' }, fmtNum(p.ppg, 1)),
      el('td', { class: 'num' }, `${p.starts}/${p.weeks}`),
    ));
  });
  t.appendChild(body);
  return el('section', { class: 'panel' },
    el('h3', {}, title),
    el('div', { class: 'scrollable' }, t),
  );
}
