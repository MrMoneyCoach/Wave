// Impact scoring: how much an asset contributes to a starting lineup.
// Used by the trade card (auto-graded historical trades) and the trade
// analyser (interactive what-if calculator).
//
// score = rawValue × positionWeight × ageWeight × startabilityWeight
//
// Picks have their own multiplier (early picks → elite starter impact,
// late picks → depth) since they don't carry an age or position yet.

import { state } from './state.js';

let _posMaxCache = null;
let _posMaxTag = null;
function _posMaxValues() {
  const tag = state.values?.size ?? 0;
  if (_posMaxCache && _posMaxTag === tag) return _posMaxCache;
  const maxes = {};
  if (state.players && state.values) {
    for (const [sid, val] of state.values) {
      const pos = state.players[sid]?.position?.toUpperCase();
      if (pos && ['QB','WR','RB','TE'].includes(pos))
        if (!(pos in maxes) || val > maxes[pos]) maxes[pos] = val;
    }
  }
  _posMaxTag = tag;
  return (_posMaxCache = maxes);
}

export function positionWeight(pos, isSuperflex) {
  if (pos === 'QB') return isSuperflex ? 1.35 : 0.80;
  if (pos === 'TE') return 1.20;
  if (pos === 'WR') return 1.10;
  if (pos === 'RB') return 1.05;
  return 0.40;
}

export function ageWeight(pos, age) {
  if (!age || age < 18) return 0.80;
  // [rampStart, peakStart, peakEnd, declineEnd]
  const c = ({
    QB: [22, 26, 34, 40], RB: [21, 22, 26, 31],
    WR: [21, 23, 29, 35], TE: [22, 25, 30, 36],
  })[pos] || [21, 23, 29, 35];
  if (age < c[0]) return 0.78;
  if (age < c[1]) return 0.78 + 0.22 * (age - c[0]) / (c[1] - c[0]);
  if (age <= c[2]) return 1.00;
  if (age <= c[3]) return Math.max(0.45, 1.00 - 0.55 * (age - c[2]) / (c[3] - c[2]));
  return 0.35;
}

export function startabilityWeight(rawValue, pos) {
  const max = _posMaxValues()[pos] || 1;
  const pct = rawValue / max;
  if (pct >= 0.65) return 1.00;
  if (pct >= 0.40) return 0.88;
  if (pct >= 0.22) return 0.75;
  if (pct >= 0.10) return 0.62;
  return 0.50;
}

export function playerImpactScore(pid, rawValue, isSuperflex) {
  const p = state.players?.[pid];
  if (!p || !rawValue) return rawValue || 0;
  const pos = (p.position || '').toUpperCase();
  return rawValue * positionWeight(pos, isSuperflex) * ageWeight(pos, p.age) * startabilityWeight(rawValue, pos);
}

export function pickImpactScore(pickValue, round, draftSlot) {
  if (!pickValue || !round) return pickValue || 0;
  const slot = draftSlot != null ? Math.max(1, Math.min(12, draftSlot)) : 6.5;
  const effectivePick = (round - 1) * 12 + slot;
  const normed = Math.min(1, (effectivePick - 1) / 47);
  const mult = 1.40 - normed * 0.80;
  return pickValue * mult;
}

// Compute the bonus to award `self` over `other`. Mirrors KTC's value
// adjustment: triggers when the side's best-impact asset materially
// outclasses the other side's, scaled by the impact gap and any
// asset-count disadvantage.
//
// Returns 0 when no adjustment applies.
export function valueAdjustment(self, other) {
  const selfImpact = self.bestImpactScore || 0;
  const otherImpact = other.bestImpactScore || 0;
  if (selfImpact <= 0) return 0;
  if (otherImpact > 0 && selfImpact <= otherImpact * 1.25) return 0;
  const gap = selfImpact - otherImpact;
  const countAdv = Math.max(0, (other.assetCount || 0) - (self.assetCount || 0));
  const avgImpact = (selfImpact + otherImpact) / 2;
  const raw = gap * 0.45 + countAdv * avgImpact * 0.20;
  const cap = (self.bestAssetValue || 0) * 0.50;
  return Math.round(Math.min(raw, cap));
}

// Detect a league's superflex setup from its roster_positions array.
export function isSuperflexLeague(league) {
  if (!league) return false;
  const rp = league.roster_positions || [];
  const sfCount = rp.filter(p => p === 'SUPER_FLEX').length;
  const qbCount = rp.filter(p => p === 'QB').length;
  return sfCount > 0 || qbCount >= 2;
}
