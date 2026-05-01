// Central app state + session persistence.

const SESSION_KEY = 'sla:session';

export const state = {
  user: null,
  season: null,           // currently-loaded league season
  leagues: [],            // user's leagues for selected season
  league: null,           // currently-loaded league
  leagueUsers: [],
  rosters: [],
  players: null,
  playersPromise: null,
  values: null,           // FantasyCalc values map (sleeperId -> value)
  valuesPromise: null,
  matchupsByWeek: {},     // week -> matchups
  transactionsByWeek: {}, // week -> transactions
  drafts: [],
  draftPicks: {},         // draft_id -> picks
  history: null,          // array of past leagues (most recent first), excluding current
  historyPromise: null,
  nflState: null,
  activeTab: 'overview',
};

export function resetLeagueState() {
  state.league = null;
  state.leagueUsers = [];
  state.rosters = [];
  state.matchupsByWeek = {};
  state.transactionsByWeek = {};
  state.drafts = [];
  state.draftPicks = {};
  state.history = null;
  state.historyPromise = null;
}

export function saveSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      userId: state.user?.user_id,
      username: state.user?.username,
      displayName: state.user?.display_name,
      season: state.season,
      leagueId: state.league?.league_id,
    }));
  } catch {}
}
export function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}
export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}
