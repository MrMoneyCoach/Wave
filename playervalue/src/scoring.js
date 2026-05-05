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
  return pts;
}

// Sleeper's scoring_settings sometimes uses different keys; this maps
// the most common ones we care about. Unknown keys still apply.
export function normalizeLeagueScoring(scoring_settings) {
  if (!scoring_settings || typeof scoring_settings !== 'object') return null;
  // Just return a shallow copy; Sleeper keys are already aligned.
  return { ...scoring_settings };
}
