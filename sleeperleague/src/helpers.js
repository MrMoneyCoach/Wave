// DOM + formatting helpers shared across tabs.

import { state } from './state.js';

export const $  = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function clear(node) { node.innerHTML = ''; return node; }

export function fmtNum(n, digits = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(digits);
}
export function fmtInt(n) {
  if (n == null || isNaN(n)) return '—';
  return Math.round(Number(n)).toLocaleString();
}
export function fmtPct(p, digits = 1) {
  if (p == null || isNaN(p)) return '—';
  return `${(p * 100).toFixed(digits)}%`;
}
export function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function teamName(rosterId) {
  const roster = state.rosters.find(r => r.roster_id === rosterId);
  if (!roster) return `Team ${rosterId}`;
  const u = state.leagueUsers.find(u => u.user_id === roster.owner_id);
  if (!u) return `Team ${rosterId}`;
  return u.metadata?.team_name || u.display_name || `Team ${rosterId}`;
}

export function ownerName(userId) {
  const u = state.leagueUsers.find(u => u.user_id === userId);
  return u?.display_name || 'Unknown';
}

export function avatarUrl(avatarId, size = 'thumbs') {
  if (!avatarId) return null;
  return `https://sleepercdn.com/avatars/${size}/${avatarId}`;
}

export function userAvatar(userId) {
  const u = state.leagueUsers.find(u => u.user_id === userId);
  return u?.avatar ? avatarUrl(u.avatar, 'thumbs') : null;
}

export function rosterAvatar(rosterId) {
  const r = state.rosters.find(r => r.roster_id === rosterId);
  return r ? userAvatar(r.owner_id) : null;
}

export function teamCell(rosterId) {
  const av = rosterAvatar(rosterId);
  return el('div', { class: 'team-cell' },
    el('div', { class: 'team-avatar' }, av ? el('img', { src: av, alt: '' }) : null),
    el('div', { style: 'min-width:0;' },
      el('div', { class: 'team-name' }, teamName(rosterId)),
      el('div', { class: 'team-owner' }, '@' + ownerName((state.rosters.find(r => r.roster_id === rosterId) || {}).owner_id)),
    ),
  );
}

export function playerLabel(playerId) {
  if (!playerId || playerId === '0') return 'Unknown';
  const p = state.players?.[playerId];
  if (!p) return playerId;
  return p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || playerId;
}

export function playerMeta(playerId) {
  const p = state.players?.[playerId];
  if (!p) return '';
  return [p.position, p.team].filter(Boolean).join(' · ');
}

export function pickLabel(pick) {
  // pick: { season, round }
  return `${pick.season} R${pick.round}`;
}

export function playerValue(playerId) {
  if (!state.values) return 0;
  return state.values.get(String(playerId)) || 0;
}

// Statistical helpers

export function pearson(xs, ys) {
  const n = xs.length;
  if (!n) return 0;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy || 1);
}

// Toast (small confirmation banner)
let toastTimer;
export function toast(msg, ms = 2500) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

export function showLoader(text = 'Loading…') {
  const l = $('#loader'); if (!l) return;
  $('#loaderText').textContent = text;
  l.hidden = false;
}
export function hideLoader() {
  const l = $('#loader'); if (l) l.hidden = true;
}
