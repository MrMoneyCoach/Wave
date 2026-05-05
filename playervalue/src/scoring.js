// Apply Sleeper-style scoring settings to a player's stat totals
// to compute fantasy points. Sleeper's stat keys (pass_yd, rec, rec_yd, ...)
// match the keys used in scoring_settings.

export const PRESETS = {
  ppr: {
    pass_yd: 0.04, pass_td: 4, pass_int: -2, pass_2pt: 2,
    rush_yd: 0.1, rush_td: 6, rush_2pt: 2,
    rec: 1, rec_yd: 0.1, rec_td: 6, rec_2pt: 2,
    fum_lost: -2, fum_rec_td: 6,
    bonus_rec_te: 0,
  },
  half: {
    pass_yd: 0.04, pass_td: 4, pass_int: -2, pass_2pt: 2,
    rush_yd: 0.1, rush_td: 6, rush_2pt: 2,
    rec: 0.5, rec_yd: 0.1, rec_td: 6, rec_2pt: 2,
    fum_lost: -2, fum_rec_td: 6,
    bonus_rec_te: 0,
  },
  std: {
    pass_yd: 0.04, pass_td: 4, pass_int: -2, pass_2pt: 2,
    rush_yd: 0.1, rush_td: 6, rush_2pt: 2,
    rec: 0, rec_yd: 0.1, rec_td: 6, rec_2pt: 2,
    fum_lost: -2, fum_rec_td: 6,
    bonus_rec_te: 0,
  },
};

export function buildScoring({ preset, leagueScoring, tePremium = 0, superflex = false }) {
  let base;
  if (preset === 'league' && leagueScoring) {
    base = { ...leagueScoring };
  } else {
    base = { ...(PRESETS[preset] || PRESETS.ppr) };
  }
  // TE premium is added on top of league rec value for TEs only.
  base._tePremium = Number(tePremium) || 0;
  base._superflex = !!superflex;
  return base;
}

// Apply scoring to one player. `player` must have .position.
// If the line-item scoring produces 0 but Sleeper's precomputed pts_* total
// is present (common in projections, which often only carry the bottom-line
// scoring totals), fall back to that based on PPR value in the scoring set.
export function pointsFor(stats, scoring, position) {
  if (!stats) return 0;
  let pts = 0;
  for (const key in scoring) {
    if (key.startsWith('_')) continue;
    const w = scoring[key];
    if (typeof w !== 'number') continue;
    const v = stats[key];
    if (typeof v !== 'number' || !isFinite(v)) continue;
    pts += v * w;
  }
  // TE premium
  if (position === 'TE' && scoring._tePremium && typeof stats.rec === 'number') {
    pts += stats.rec * scoring._tePremium;
  }
  if (pts === 0) {
    const fallback = pickPrecomputedPts(stats, scoring);
    if (fallback) {
      let bonus = 0;
      if (position === 'TE' && scoring._tePremium && typeof stats.rec === 'number') {
        bonus = stats.rec * scoring._tePremium;
      }
      return fallback + bonus;
    }
  }
  return pts;
}

// Pick whichever pre-aggregated points field most closely matches the
// scoring's PPR setting.
function pickPrecomputedPts(stats, scoring) {
  const rec = Number(scoring.rec) || 0;
  const ppr = Number(stats.pts_ppr);
  const half = Number(stats.pts_half_ppr);
  const std = Number(stats.pts_std);
  let chosen = null;
  if (rec >= 0.75 && isFinite(ppr)) chosen = ppr;
  else if (rec >= 0.25 && isFinite(half)) chosen = half;
  else if (isFinite(std)) chosen = std;
  // Fall through if the preferred bucket is missing.
  if (!isFinite(chosen)) {
    chosen = isFinite(ppr) ? ppr : (isFinite(half) ? half : (isFinite(std) ? std : 0));
  }
  return chosen || 0;
}

// Sleeper's scoring_settings sometimes uses different keys; this maps
// the most common ones we care about. Unknown keys still apply.
export function normalizeLeagueScoring(scoring_settings) {
  if (!scoring_settings || typeof scoring_settings !== 'object') return null;
  // Just return a shallow copy; Sleeper keys are already aligned.
  return { ...scoring_settings };
}
