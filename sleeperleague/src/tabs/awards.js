// Awards tab: season trophies/superlatives.

import { el, fmtNum, fmtPct, teamName, playerLabel } from '../helpers.js';
import { state } from '../state.js';
import { ensureMatchups, ensurePlayers } from '../data.js';
import {
  computeStandings, computeAllPlay, computeExpectedWins, flattenMatchups, computeWeeklyScores,
} from '../analytics.js';

export async function renderAwards(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading…'));

  const lg = state.league;
  const playoffStart = lg.settings?.playoff_week_start || 15;
  const currentWeek = state.nflState?.week || playoffStart - 1;
  const maxWeek = String(state.nflState?.season) === String(lg.season)
    ? Math.min(playoffStart - 1, currentWeek)
    : playoffStart - 1;

  await Promise.all([ensureMatchups(maxWeek), ensurePlayers()]);
  if (state.activeTab !== 'awards') return;

  const standings = computeStandings();
  const allPlay = computeAllPlay(maxWeek);
  const expWins = computeExpectedWins(maxWeek);
  const weekly = computeWeeklyScores(maxWeek);
  const all = flattenMatchups(maxWeek);

  // Most consistent: lowest std dev of weekly scores
  const consistency = standings.map(s => {
    const games = weekly.byRoster[s.roster_id] || [];
    if (!games.length) return { ...s, stddev: Infinity };
    const mean = games.reduce((a, g) => a + g.points, 0) / games.length;
    const variance = games.reduce((a, g) => a + (g.points - mean) ** 2, 0) / games.length;
    return { ...s, stddev: Math.sqrt(variance) };
  }).sort((a, b) => a.stddev - b.stddev);

  // Best single week
  const bestWeek = standings.map(s => {
    const games = weekly.byRoster[s.roster_id] || [];
    return { rosterId: s.roster_id, ...games.reduce((b, g) => g.points > b.points ? g : b, { points: 0, week: 0 }) };
  }).sort((a, b) => b.points - a.points)[0];

  // Worst single week
  const worstWeek = standings.flatMap(s => {
    const games = weekly.byRoster[s.roster_id] || [];
    return games.map(g => ({ rosterId: s.roster_id, ...g }));
  }).filter(g => g.points > 0).sort((a, b) => a.points - b.points)[0];

  // Single-player MVP - highest total points by any player
  const totals = {};
  for (let w = 1; w <= maxWeek; w++) {
    const ms = state.matchupsByWeek[w] || [];
    for (const m of ms) {
      for (const [pid, pts] of Object.entries(m.players_points || {})) {
        if (!totals[pid]) totals[pid] = { total: 0, rosterId: m.roster_id };
        totals[pid].total += pts || 0;
      }
    }
  }
  const mvp = Object.entries(totals).sort((a, b) => b[1].total - a[1].total)[0];

  // Luckiest / unluckiest
  const luckRows = standings.map(s => ({ ...s, luck: s.wins - (expWins[s.roster_id]?.exp ?? 0) }));
  const luckiest = [...luckRows].sort((a, b) => b.luck - a.luck)[0];
  const unluckiest = [...luckRows].sort((a, b) => a.luck - b.luck)[0];

  // Biggest blowout
  const blowout = [...all].sort((a, b) => b.margin - a.margin)[0];

  // Closest game
  const closest = [...all].filter(m => m.pointsA > 0 || m.pointsB > 0)
    .sort((a, b) => a.margin - b.margin)[0];

  // Best lineup setter (highest efficiency)
  const bestEff = [...standings].filter(s => s.efficiency).sort((a, b) => b.efficiency - a.efficiency)[0];

  // Worst lineup setter
  const worstEff = [...standings].filter(s => s.efficiency).sort((a, b) => a.efficiency - b.efficiency)[0];

  wrap.innerHTML = '';

  const grid = el('div', { class: 'awards-grid' });
  awards(grid, [
    { trophy: '🏆', title: 'League leader', team: standings[0]?.teamName, detail: standings[0] ? `${standings[0].wins}-${standings[0].losses}` : '' },
    { trophy: '💯', title: 'Highest scorer', team: standings.sort((a, b) => b.pf - a.pf)[0]?.teamName, detail: `${fmtNum(standings[0]?.pf, 1)} pts` },
    { trophy: '🥶', title: 'Lowest scorer', team: [...standings].sort((a, b) => a.pf - b.pf)[0]?.teamName, detail: `${fmtNum([...standings].sort((a, b) => a.pf - b.pf)[0]?.pf, 1)} pts` },
    { trophy: '🍀', title: 'Luckiest', team: luckiest?.teamName, detail: luckiest ? `+${fmtNum(luckiest.luck, 1)} above expected` : '' },
    { trophy: '☔', title: 'Unluckiest', team: unluckiest?.teamName, detail: unluckiest ? `${fmtNum(unluckiest.luck, 1)} below expected` : '' },
    { trophy: '🧊', title: 'Most consistent', team: consistency[0]?.teamName, detail: `σ = ${fmtNum(consistency[0]?.stddev, 1)} pts` },
    { trophy: '🎢', title: 'Most volatile', team: consistency[consistency.length - 1]?.teamName, detail: `σ = ${fmtNum(consistency[consistency.length - 1]?.stddev, 1)} pts` },
    { trophy: '🎯', title: 'Best lineup setter', team: bestEff?.teamName, detail: bestEff ? `${fmtPct(bestEff.efficiency, 1)} efficient` : '' },
    { trophy: '🤦', title: 'Worst lineup setter', team: worstEff?.teamName, detail: worstEff ? `${fmtPct(worstEff.efficiency, 1)} efficient` : '' },
    { trophy: '🚀', title: 'Best week', team: bestWeek?.rosterId ? teamName(bestWeek.rosterId) : '—', detail: bestWeek ? `${fmtNum(bestWeek.points, 1)} pts (W${bestWeek.week})` : '' },
    { trophy: '🪦', title: 'Worst week', team: worstWeek?.rosterId ? teamName(worstWeek.rosterId) : '—', detail: worstWeek ? `${fmtNum(worstWeek.points, 1)} pts (W${worstWeek.week})` : '' },
    { trophy: '💥', title: 'Biggest blowout', team: blowout ? `${teamName(blowout.a)} vs ${teamName(blowout.b)}` : '—', detail: blowout ? `${fmtNum(blowout.margin, 1)} pts · W${blowout.week}` : '' },
    { trophy: '🎲', title: 'Closest game', team: closest ? `${teamName(closest.a)} vs ${teamName(closest.b)}` : '—', detail: closest ? `${fmtNum(closest.margin, 1)} pts · W${closest.week}` : '' },
    { trophy: '⭐', title: 'League MVP', team: mvp ? playerLabel(mvp[0]) : '—', detail: mvp ? `${fmtNum(mvp[1].total, 1)} pts · ${teamName(mvp[1].rosterId)}` : '' },
    { trophy: '🎰', title: 'Best all-play', team: allPlay[0]?.teamName, detail: allPlay[0] ? fmtPct(allPlay[0].pct, 1) : '' },
  ]);
  wrap.appendChild(grid);
}

function awards(grid, items) {
  for (const a of items) {
    grid.appendChild(el('article', { class: 'award-card' },
      el('div', { class: 'award-trophy' }, a.trophy),
      el('div', { class: 'award-title' }, a.title),
      el('div', { class: 'award-team' }, a.team || '—'),
      a.detail ? el('div', { class: 'award-detail' }, a.detail) : null,
    ));
  }
}
