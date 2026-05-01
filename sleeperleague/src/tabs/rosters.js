// Rosters tab: each team's full roster grouped by starters/bench/IR/taxi, with current dynasty values.

import { el, fmtInt, teamName, ownerName, playerLabel, playerMeta, playerValue, rosterAvatar } from '../helpers.js';
import { state } from '../state.js';
import { ensurePlayers, ensureValues } from '../data.js';

export async function renderRosters(host) {
  const wrap = el('div', { class: 'tab-section' });
  host.appendChild(wrap);
  wrap.appendChild(el('div', { class: 'muted small' }, 'Loading…'));

  await Promise.all([ensurePlayers(), ensureValues()]);
  if (state.activeTab !== 'rosters') return;

  // Compute roster value totals
  const teams = state.rosters.map(r => {
    const players = (r.players || []).filter(p => p && p !== '0');
    const totalValue = players.reduce((s, pid) => s + playerValue(pid), 0);
    return { roster: r, totalValue };
  }).sort((a, b) => b.totalValue - a.totalValue);

  wrap.innerHTML = '';

  // Headline: roster value leader / lowest
  const top = teams[0], bottom = teams[teams.length - 1];
  wrap.appendChild(el('div', { class: 'stat-row' },
    statCard('Most valuable roster', top ? teamName(top.roster.roster_id) : '—',
      top ? `${fmtInt(top.totalValue)} value` : ''),
    statCard('Least valuable roster', bottom ? teamName(bottom.roster.roster_id) : '—',
      bottom ? `${fmtInt(bottom.totalValue)} value` : ''),
    statCard('League avg value',
      fmtInt(teams.reduce((s, t) => s + t.totalValue, 0) / Math.max(1, teams.length))),
    statCard('Teams', String(teams.length)),
  ));

  const grid = el('div', { class: 'roster-grid' });
  for (const { roster, totalValue } of teams) {
    grid.appendChild(rosterCard(roster, totalValue));
  }
  wrap.appendChild(grid);
}

function rosterCard(roster, totalValue) {
  const players = roster.players || [];
  const startersList = (roster.starters || []).filter(p => p && p !== '0');
  const startersSet = new Set(startersList);
  const ir = new Set(roster.reserve || []);
  const taxi = new Set(roster.taxi || []);
  const bench = players.filter(p => !startersSet.has(p) && !ir.has(p) && !taxi.has(p) && p && p !== '0');

  const av = rosterAvatar(roster.roster_id);
  const head = el('div', { class: 'roster-head' },
    av ? el('img', { src: av, alt: '', class: 'roster-avatar' }) : el('div', { class: 'roster-avatar' }),
    el('div', { class: 'roster-id' },
      el('div', { class: 'roster-team' }, teamName(roster.roster_id)),
      el('div', { class: 'muted small' }, '@' + ownerName(roster.owner_id)),
    ),
    el('div', { class: 'roster-record muted small' },
      `${roster.settings?.wins || 0}-${roster.settings?.losses || 0}${roster.settings?.ties ? '-' + roster.settings.ties : ''}`),
  );

  const valueCard = el('div', { class: 'roster-value' },
    el('span', { class: 'muted' }, 'Dynasty value'),
    el('strong', {}, fmtInt(totalValue)),
  );

  const sections = [];
  if (startersList.length) sections.push(rosterSection('Starters', startersList));
  if (bench.length) sections.push(rosterSection('Bench', bench));
  if (ir.size) sections.push(rosterSection('IR', [...ir]));
  if (taxi.size) sections.push(rosterSection('Taxi', [...taxi]));

  return el('article', { class: 'card roster-card' }, head, valueCard, ...sections);
}

function rosterSection(title, ids) {
  // Sort within section by value desc.
  const sorted = [...ids].sort((a, b) => playerValue(b) - playerValue(a));
  return el('div', { class: 'roster-section' },
    el('div', { class: 'roster-section-title' }, title),
    el('ul', { class: 'roster-players' },
      ...sorted.map(id => el('li', {},
        el('span', { title: playerMeta(id) }, playerLabel(id)),
        el('span', { class: 'pl-val' }, fmtInt(playerValue(id))),
      )),
    ),
  );
}

function statCard(label, value, sub) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-label' }, label),
    el('div', { class: 'stat-value' }, value || '—'),
    sub ? el('div', { class: 'stat-sub' }, sub) : null,
  );
}
