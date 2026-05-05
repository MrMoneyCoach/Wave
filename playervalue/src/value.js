// Composite value scoring.
// Inputs per player: production (PPG), age, opportunity (volume share within team & position).
// Outputs 0–100 sub-scores and a weighted composite.

const FANTASY_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

// Position-aware age curves (dynasty-leaning). Returns 0–100.
// Higher = more years of expected future production.
export function ageScore(age, position) {
  if (!age || !position) return 50;  // unknown → neutral
  const a = Number(age);
  if (!isFinite(a)) return 50;

  // Each position: { peakStart, peakEnd, hardDecline }
  const curves = {
    QB: { peakStart: 26, peakEnd: 35, hardDecline: 38 },
    RB: { peakStart: 22, peakEnd: 26, hardDecline: 29 },
    WR: { peakStart: 24, peakEnd: 28, hardDecline: 31 },
    TE: { peakStart: 25, peakEnd: 29, hardDecline: 32 },
    K:  { peakStart: 24, peakEnd: 35, hardDecline: 40 },
    DEF:{ peakStart: 0,  peakEnd: 99, hardDecline: 99 },
  };
  const c = curves[position] || curves.WR;

  if (a < c.peakStart) {
    // Pre-peak: ramp from 70 at very young to 95 at peakStart.
    const t = Math.max(0, (a - 19) / Math.max(1, c.peakStart - 19));
    return 70 + 25 * Math.min(1, t);
  }
  if (a <= c.peakEnd) {
    // In peak window: 95–100, with the front of the window scoring slightly higher
    // (more years of peak ahead).
    const t = (a - c.peakStart) / Math.max(1, c.peakEnd - c.peakStart);
    return 100 - 5 * t;
  }
  if (a <= c.hardDecline) {
    // Decline: 90 → 50.
    const t = (a - c.peakEnd) / Math.max(1, c.hardDecline - c.peakEnd);
    return 90 - 40 * t;
  }
  // Post hard-decline: 50 → 10
  const t = Math.min(1, (a - c.hardDecline) / 5);
  return Math.max(10, 50 - 40 * t);
}

// Production score: percentile vs same-position cohort, weighted by total games.
// Sparse/injured seasons get pulled toward neutral.
export function productionScore(player, cohortSorted) {
  // cohortSorted: array of players in same position, sorted ASC by ppg
  const ppg = player._ppg || 0;
  if (!cohortSorted || cohortSorted.length === 0) return 50;
  // Find rank by PPG.
  let rank = 0;
  for (let i = 0; i < cohortSorted.length; i++) {
    if (cohortSorted[i]._ppg <= ppg) rank = i + 1;
    else break;
  }
  const pct = (rank / cohortSorted.length) * 100;
  // Weight by sample size: <4 games pulled toward 40.
  const games = player._games || 0;
  if (games < 4) {
    const w = games / 4;
    return pct * w + 40 * (1 - w);
  }
  return pct;
}

// Opportunity: share of team's positional volume.
// Targets count as full opportunity (not just completed receptions) — a target
// is a chance to produce regardless of whether it was caught.
// QB: pass attempts. RB: rush attempts + targets (1:1, since RB targets are
// high-value touches). WR/TE: targets.
function relevantVolume(stats, position) {
  if (!stats) return 0;
  const ratt = stats.rush_att || 0;
  const tgts = stats.rec_tgt || stats.tgt || 0;
  const patt = stats.pass_att || 0;
  switch (position) {
    case 'QB': return patt + (stats.rush_att || 0) * 0.5;
    case 'RB': return ratt + tgts;          // targets count fully
    case 'WR': return tgts;                  // pure target share
    case 'TE': return tgts;                  // pure target share
    default:   return ratt + tgts + patt;
  }
}

// Convenience: extract raw target / attempt counts for display.
export function getVolume(stats, position) {
  if (!stats) return { targets: 0, carries: 0, attempts: 0 };
  return {
    targets:  stats.rec_tgt || stats.tgt || 0,
    carries:  stats.rush_att || 0,
    attempts: stats.pass_att || 0,
  };
}

export function computeOpportunity(playersWithStats) {
  // Build per-team-per-position totals.
  const teamTotals = new Map();
  for (const p of playersWithStats) {
    if (!p.team || !p.position) continue;
    const key = `${p.team}|${p.position}`;
    const v = relevantVolume(p._stats, p.position);
    teamTotals.set(key, (teamTotals.get(key) || 0) + v);
  }
  // Annotate.
  for (const p of playersWithStats) {
    if (!p.team || !p.position) { p._opportunity = 0; continue; }
    const key = `${p.team}|${p.position}`;
    const total = teamTotals.get(key) || 0;
    const v = relevantVolume(p._stats, p.position);
    let share = total > 0 ? v / total : 0;
    // Boost share for clear depth-chart starters with no recorded volume yet
    // (rookies, returning starters), so we don't punish them with 0.
    if (share === 0 && p.depth_chart_order === 1) share = 0.4;
    // Convert to 0–100. Single-team-share 1.0 → 100.
    p._opportunity = Math.min(100, share * 100);
  }
}

export function compositeValue(prodScore, oppScore, ageS, weights) {
  const wSum = (weights.prod + weights.opp + weights.age) || 1;
  const wp = weights.prod / wSum, wo = weights.opp / wSum, wa = weights.age / wSum;
  return prodScore * wp + oppScore * wo + ageS * wa;
}

export { FANTASY_POSITIONS };
