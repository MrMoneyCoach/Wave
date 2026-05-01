// Pure analytics functions. Take state slices, return derived data.

import { state } from './state.js';
import { teamName, ownerName } from './helpers.js';

// Standings from roster.settings (Sleeper-provided wins/losses/PF/PA).
export function computeStandings() {
  return state.rosters
    .map(r => {
      const s = r.settings || {};
      const wins = s.wins || 0;
      const losses = s.losses || 0;
      const ties = s.ties || 0;
      const pf = (s.fpts || 0) + (s.fpts_decimal || 0) / 100;
      const pa = (s.fpts_against || 0) + (s.fpts_against_decimal || 0) / 100;
      const ppts = (s.ppts || 0) + (s.ppts_decimal || 0) / 100;
      const games = wins + losses + ties;
      const winPct = games ? (wins + ties * 0.5) / games : 0;
      return {
        roster_id: r.roster_id,
        owner_id: r.owner_id,
        teamName: teamName(r.roster_id),
        owner: ownerName(r.owner_id),
        wins, losses, ties, pf, pa, ppts, winPct, games,
        ppg: games ? pf / games : 0,
        efficiency: ppts ? pf / ppts : 0,
        diff: pf - pa,
      };
    })
    .sort((a, b) => b.winPct - a.winPct || b.pf - a.pf);
}

// Build per-week scores per roster from state.matchupsByWeek (only weeks with data).
// Returns { weeks: [w], byRoster: { rosterId: [{week, points, oppId, oppPoints, win}] } }
export function computeWeeklyScores(maxWeek) {
  const byRoster = {};
  for (const r of state.rosters) byRoster[r.roster_id] = [];
  const weeksUsed = [];
  for (let w = 1; w <= maxWeek; w++) {
    const ms = state.matchupsByWeek[w];
    if (!ms || !ms.length) continue;
    weeksUsed.push(w);
    const byMatch = {};
    for (const m of ms) {
      if (m.matchup_id == null) continue;
      (byMatch[m.matchup_id] = byMatch[m.matchup_id] || []).push(m);
    }
    for (const pair of Object.values(byMatch)) {
      if (pair.length === 2) {
        const [a, b] = pair;
        const aWin = (a.points || 0) > (b.points || 0);
        byRoster[a.roster_id]?.push({
          week: w, points: a.points || 0, oppId: b.roster_id, oppPoints: b.points || 0,
          win: aWin ? 1 : (a.points === b.points ? 0.5 : 0),
        });
        byRoster[b.roster_id]?.push({
          week: w, points: b.points || 0, oppId: a.roster_id, oppPoints: a.points || 0,
          win: !aWin ? 1 : (a.points === b.points ? 0.5 : 0),
        });
      } else if (pair.length === 1) {
        // bye week
      }
    }
  }
  return { weeks: weeksUsed, byRoster };
}

// All-play record: how many teams would you have beaten each week?
// allPlayWins counts wins, allPlayGames counts (n_teams - 1) per week played.
export function computeAllPlay(maxWeek) {
  const map = {};
  for (const r of state.rosters) map[r.roster_id] = { wins: 0, losses: 0, ties: 0, games: 0 };

  for (let w = 1; w <= maxWeek; w++) {
    const ms = state.matchupsByWeek[w];
    if (!ms || !ms.length) continue;
    const playedThisWeek = ms.filter(m => (m.points || 0) > 0);
    if (playedThisWeek.length < 2) continue;
    const sortedAsc = [...playedThisWeek].sort((a, b) => (a.points || 0) - (b.points || 0));
    const n = sortedAsc.length;
    sortedAsc.forEach((m, i) => {
      const beats = i; // teams below me
      const loses = n - 1 - i; // teams above me
      const ties = sortedAsc.filter(x => x !== m && x.points === m.points).length;
      const obj = map[m.roster_id];
      if (!obj) return;
      obj.wins   += Math.max(0, beats - ties);
      obj.losses += Math.max(0, loses - ties);
      obj.ties   += ties;
      obj.games  += (n - 1);
    });
  }

  return Object.entries(map).map(([rid, v]) => ({
    roster_id: Number(rid),
    teamName: teamName(Number(rid)),
    ...v,
    pct: v.games ? (v.wins + v.ties * 0.5) / v.games : 0,
  })).sort((a, b) => b.pct - a.pct);
}

// Expected wins from PF: each week, if you scored above league median, that's +1; below = 0; tie = 0.5.
export function computeExpectedWins(maxWeek) {
  const map = {};
  for (const r of state.rosters) map[r.roster_id] = { exp: 0, weeks: 0 };

  for (let w = 1; w <= maxWeek; w++) {
    const ms = state.matchupsByWeek[w];
    if (!ms || !ms.length) continue;
    const played = ms.filter(m => (m.points || 0) > 0);
    if (played.length < 2) continue;
    const sorted = [...played].sort((a, b) => (b.points || 0) - (a.points || 0));
    const n = sorted.length;
    sorted.forEach((m, i) => {
      // expected wins for week = (teams beaten) / (teams - 1)
      const beats = sorted.filter(x => x !== m && (m.points || 0) > (x.points || 0)).length;
      const tied  = sorted.filter(x => x !== m && (m.points || 0) === (x.points || 0)).length;
      const exp = (beats + tied * 0.5) / (n - 1);
      const o = map[m.roster_id];
      if (o) { o.exp += exp; o.weeks++; }
    });
  }
  return map;
}

// Power score: weighted blend (50% all-play %, 30% PPG percentile, 20% recent 4 weeks PPG percentile).
export function computePowerRankings(allPlay, weekly) {
  const standings = computeStandings();
  const ppgs = standings.map(s => s.ppg);
  const minP = Math.min(...ppgs), maxP = Math.max(...ppgs);

  // Recent 4 weeks
  const recentPPG = {};
  for (const [rid, weeks] of Object.entries(weekly.byRoster)) {
    const last = weeks.slice(-4);
    recentPPG[rid] = last.length ? last.reduce((s, w) => s + w.points, 0) / last.length : 0;
  }
  const recentVals = Object.values(recentPPG);
  const minR = Math.min(...recentVals, 0), maxR = Math.max(...recentVals, 1);

  return standings.map(s => {
    const ap = allPlay.find(a => a.roster_id === s.roster_id);
    const apPct = ap ? ap.pct : 0;
    const ppgPct = (s.ppg - minP) / Math.max(0.001, maxP - minP);
    const recent = recentPPG[s.roster_id] || 0;
    const recentPct = (recent - minR) / Math.max(0.001, maxR - minR);
    const score = apPct * 0.5 + ppgPct * 0.3 + recentPct * 0.2;
    return { ...s, allPlayPct: apPct, recentPPG: recent, powerScore: score };
  }).sort((a, b) => b.powerScore - a.powerScore);
}

// Schedule strength: average PPG of opponents each team has faced.
export function computeScheduleStrength(weekly) {
  const standings = computeStandings();
  const ppgMap = Object.fromEntries(standings.map(s => [s.roster_id, s.ppg]));

  return standings.map(s => {
    const games = weekly.byRoster[s.roster_id] || [];
    const oppPPGs = games.map(g => ppgMap[g.oppId] || 0);
    const avgOppPPG = oppPPGs.length ? oppPPGs.reduce((a, b) => a + b, 0) / oppPPGs.length : 0;
    return {
      roster_id: s.roster_id,
      teamName: s.teamName,
      avgOppPPG,
      games: games.length,
    };
  }).sort((a, b) => b.avgOppPPG - a.avgOppPPG);
}

// "What if you had X's schedule?" matrix.
// For each (rosterA, rosterB), compute rosterA's record if it played rosterB's actual opponents week-by-week using rosterA's actual scores.
export function computeScheduleSwapMatrix(weekly) {
  const rosters = state.rosters.map(r => r.roster_id);
  const byRoster = weekly.byRoster;
  const matrix = {};
  for (const a of rosters) {
    matrix[a] = {};
    const aGames = byRoster[a] || [];
    const aByWeek = {};
    aGames.forEach(g => { aByWeek[g.week] = g.points; });
    for (const b of rosters) {
      const bGames = byRoster[b] || [];
      let wins = 0, losses = 0, ties = 0;
      for (const bg of bGames) {
        // a's opponent that week is whatever b's was, scoring whatever a actually scored.
        const aPts = aByWeek[bg.week];
        if (aPts == null) continue;
        // Pull opponent's score from weekly map: find the opponent's actual score that week.
        const oppGames = byRoster[bg.oppId] || [];
        const oppPts = oppGames.find(g => g.week === bg.week)?.points;
        if (oppPts == null) continue;
        if (bg.oppId === a) continue; // skip self
        if (aPts > oppPts) wins++;
        else if (aPts < oppPts) losses++;
        else ties++;
      }
      matrix[a][b] = { wins, losses, ties };
    }
  }
  return matrix;
}

// Best/worst single-week performances per team.
export function computeWeeklyExtremes(weekly) {
  const out = {};
  for (const [rid, games] of Object.entries(weekly.byRoster)) {
    if (!games.length) continue;
    const best = games.reduce((b, g) => (g.points > b.points ? g : b));
    const worst = games.reduce((b, g) => (g.points < b.points ? g : b));
    out[rid] = { best, worst };
  }
  return out;
}

// All weekly matchups flattened, used by Matchups + Awards + H2H.
export function flattenMatchups(maxWeek) {
  const all = [];
  for (let w = 1; w <= maxWeek; w++) {
    const ms = state.matchupsByWeek[w];
    if (!ms || !ms.length) continue;
    const byMatch = {};
    for (const m of ms) {
      if (m.matchup_id == null) continue;
      (byMatch[m.matchup_id] = byMatch[m.matchup_id] || []).push(m);
    }
    for (const pair of Object.values(byMatch)) {
      if (pair.length !== 2) continue;
      const [a, b] = (pair[0].points || 0) >= (pair[1].points || 0) ? pair : [pair[1], pair[0]];
      all.push({
        week: w,
        a: a.roster_id, b: b.roster_id,
        pointsA: a.points || 0, pointsB: b.points || 0,
        margin: (a.points || 0) - (b.points || 0),
        combined: (a.points || 0) + (b.points || 0),
      });
    }
  }
  return all;
}
