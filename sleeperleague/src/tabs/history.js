// League history: walk previous_league_id back through every past season.
// Show champion, runner-up, regular-season leader for each.

import { el, fmtNum } from '../helpers.js';
import { state } from '../state.js';
import { ensureHistory } from '../data.js';

export async function renderHistory(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Walking through past seasons…'));

  const past = await ensureHistory();
  if (state.activeTab !== 'history') return;

  // Build entries: [current league, ...past] all standardized.
  const entries = [];
  // Current
  entries.push({
    season: state.league.season,
    leagueName: state.league.name,
    leagueId: state.league.league_id,
    users: state.leagueUsers,
    rosters: state.rosters,
    bracket: null,
    isCurrent: true,
  });
  for (const h of past) {
    entries.push({
      season: h.league.season,
      leagueName: h.league.name,
      leagueId: h.league.league_id,
      users: h.users,
      rosters: h.rosters,
      bracket: h.winnersBracket,
      isCurrent: false,
    });
  }

  wrap.innerHTML = '';

  if (entries.length === 1) {
    wrap.appendChild(el('section', { class: 'panel empty-panel' },
      el('h3', {}, 'No prior seasons'),
      el('p', { class: 'muted' }, 'This league has no previous_league_id linked. If your league existed before, the commissioner may not have linked the seasons in Sleeper.'),
    ));
    return;
  }

  // Champions list
  const champCard = el('section', { class: 'panel' },
    el('h3', {}, 'Champions by season'),
  );
  const list = el('div');
  entries.slice().reverse().forEach(e => {
    const champ = findChampion(e);
    list.appendChild(el('div', { class: 'history-row' },
      el('div', { class: 'history-season' }, String(e.season)),
      el('div', {},
        el('div', { style: 'font-weight: 600' }, e.leagueName),
        el('div', { class: 'muted small' }, e.isCurrent ? 'Current season (in progress unless complete)' : ''),
      ),
      el('div', {},
        champ
          ? el('span', { class: 'history-champ' }, '🏆 ' + champ)
          : el('span', { class: 'muted' }, 'No champion yet'),
      ),
    ));
  });
  champCard.appendChild(list);
  wrap.appendChild(champCard);

  // Top scorer all-time (by season)
  const topCard = el('section', { class: 'panel' },
    el('h3', {}, 'Top scorer per season'),
  );
  const topList = el('div');
  entries.slice().reverse().forEach(e => {
    const standings = computeFromEntry(e);
    const top = [...standings].sort((a, b) => b.pf - a.pf)[0];
    topList.appendChild(el('div', { class: 'history-row' },
      el('div', { class: 'history-season' }, String(e.season)),
      el('div', {},
        el('div', { style: 'font-weight: 600' }, top ? top.teamName : '—'),
        el('div', { class: 'muted small' }, top ? `${fmtNum(top.pf, 1)} pts · ${top.wins}-${top.losses}` : ''),
      ),
      el('div', { class: 'muted small' }, e.leagueName),
    ));
  });
  topCard.appendChild(topList);
  wrap.appendChild(topCard);

  // Regular-season leader by season
  const regCard = el('section', { class: 'panel' },
    el('h3', {}, 'Regular-season #1 by season'),
  );
  const regList = el('div');
  entries.slice().reverse().forEach(e => {
    const standings = computeFromEntry(e);
    const leader = standings[0];
    regList.appendChild(el('div', { class: 'history-row' },
      el('div', { class: 'history-season' }, String(e.season)),
      el('div', {},
        el('div', { style: 'font-weight: 600' }, leader ? leader.teamName : '—'),
        el('div', { class: 'muted small' }, leader ? `${leader.wins}-${leader.losses} · ${fmtNum(leader.pf, 1)} PF` : ''),
      ),
      el('div', { class: 'muted small' }, ''),
    ));
  });
  regCard.appendChild(regList);
  wrap.appendChild(regCard);
}

function findChampion(e) {
  if (!e.bracket || !e.bracket.length) return null;
  // The champion is the winner of the highest-round match (the championship game).
  const maxRound = Math.max(...e.bracket.map(b => b.r || 0));
  const finals = e.bracket.filter(b => b.r === maxRound);
  if (!finals.length) return null;
  // Take the latest match in the finals (sometimes multiple at max round; take first)
  const final = finals[0];
  const winnerRid = final.w;
  if (!winnerRid) return null;
  const roster = e.rosters.find(r => r.roster_id === winnerRid);
  if (!roster) return null;
  const u = e.users.find(u => u.user_id === roster.owner_id);
  return u?.metadata?.team_name || u?.display_name || `Team ${winnerRid}`;
}

// Build standings for a history entry (re-uses analytics shape but only what we need)
function computeFromEntry(e) {
  return e.rosters.map(r => {
    const s = r.settings || {};
    const pf = (s.fpts || 0) + (s.fpts_decimal || 0) / 100;
    const pa = (s.fpts_against || 0) + (s.fpts_against_decimal || 0) / 100;
    const u = e.users.find(u => u.user_id === r.owner_id);
    const tn = u?.metadata?.team_name || u?.display_name || `Team ${r.roster_id}`;
    return {
      teamName: tn,
      wins: s.wins || 0, losses: s.losses || 0, ties: s.ties || 0,
      pf, pa,
      winPct: ((s.wins || 0) + (s.ties || 0) * 0.5) / Math.max(1, (s.wins || 0) + (s.losses || 0) + (s.ties || 0)),
    };
  }).sort((a, b) => b.winPct - a.winPct || b.pf - a.pf);
}
