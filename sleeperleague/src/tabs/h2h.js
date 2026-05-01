// Head-to-head: pick two teams, see all their matchups + record + scoring summary.

import { el, fmtNum, teamName } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups } from '../data.js';
import { flattenMatchups } from '../analytics.js';

export async function renderH2H(host) {
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
  if (state.activeTab !== 'h2h') return;

  const all = flattenMatchups(maxWeek);
  const rosters = state.rosters.map(r => r.roster_id);

  wrap.innerHTML = '';

  // Pickers
  const aSel = el('select', { class: 'season-switcher' });
  const bSel = el('select', { class: 'season-switcher' });
  for (const r of rosters) {
    aSel.appendChild(el('option', { value: r }, teamName(r)));
    bSel.appendChild(el('option', { value: r }, teamName(r)));
  }
  if (rosters.length >= 2) bSel.value = rosters[1];

  const pickers = el('div', { class: 'h2h-pickers' },
    aSel,
    el('div', { class: 'vs' }, 'VS'),
    bSel,
  );

  const result = el('div');

  function update() {
    const a = Number(aSel.value), b = Number(bSel.value);
    result.innerHTML = '';
    if (a === b) {
      result.appendChild(el('div', { class: 'panel empty-panel' },
        el('p', { class: 'muted' }, 'Pick two different teams.')));
      return;
    }
    const games = all.filter(m =>
      (m.a === a && m.b === b) || (m.a === b && m.b === a)
    ).sort((x, y) => x.week - y.week);

    let aWins = 0, bWins = 0, aPts = 0, bPts = 0;
    games.forEach(g => {
      const aScore = g.a === a ? g.pointsA : g.pointsB;
      const bScore = g.a === b ? g.pointsA : g.pointsB;
      aPts += aScore; bPts += bScore;
      if (aScore > bScore) aWins++; else if (bScore > aScore) bWins++;
    });

    const headerCard = el('section', { class: 'panel' },
      el('h3', {}, 'Series record'),
      el('div', { class: 'h2h-record' },
        el('div', { class: `h2h-side ${aWins < bWins ? 'loser' : ''}` },
          el('div', { class: 'name' }, teamName(a)),
          el('div', { class: 'wins' }, String(aWins)),
          el('div', { class: 'muted small' }, `${fmtNum(aPts, 1)} total pts`),
        ),
        el('div', { class: 'h2h-dash' }, '–'),
        el('div', { class: `h2h-side ${bWins < aWins ? 'loser' : ''}` },
          el('div', { class: 'name' }, teamName(b)),
          el('div', { class: 'wins' }, String(bWins)),
          el('div', { class: 'muted small' }, `${fmtNum(bPts, 1)} total pts`),
        ),
      ),
    );
    result.appendChild(headerCard);

    if (!games.length) {
      result.appendChild(el('section', { class: 'panel empty-panel' },
        el('p', { class: 'muted' }, 'These two teams have not faced each other this season.')));
      return;
    }

    const list = el('div', { class: 'matchup-grid' });
    games.forEach(g => {
      const aScore = g.a === a ? g.pointsA : g.pointsB;
      const bScore = g.a === b ? g.pointsA : g.pointsB;
      const aWinning = aScore >= bScore;
      list.appendChild(el('div', { class: 'matchup-row' },
        el('div', { class: 'matchup-week' }, `W${g.week}`),
        el('div', { class: `matchup-team ${aWinning ? 'winner' : ''}` },
          el('span', { class: 'mt-name' }, teamName(a)),
          el('span', { class: 'mt-score' }, fmtNum(aScore, 1)),
        ),
        el('div', { class: 'matchup-vs' }, 'vs'),
        el('div', { class: `matchup-team ${!aWinning ? 'winner' : ''}` },
          el('span', { class: 'mt-name' }, teamName(b)),
          el('span', { class: 'mt-score' }, fmtNum(bScore, 1)),
        ),
        el('div', { class: 'matchup-margin' }, fmtNum(Math.abs(aScore - bScore), 1) + ' pts'),
      ));
    });
    result.appendChild(el('section', { class: 'panel' },
      el('h3', {}, 'Matchup history'),
      list,
    ));
  }

  aSel.addEventListener('change', update);
  bSel.addEventListener('change', update);

  wrap.innerHTML = '';
  wrap.appendChild(el('section', { class: 'panel' },
    el('h3', {}, 'Pick teams'),
    pickers,
  ));
  wrap.appendChild(result);
  update();
}
