// Central app state + session persistence.

const SESSION_KEY = 'sla:session';
const PREFS_KEY = 'sla:prefs';

export const state = {
  user: null,
  season: null,           // currently-loaded league season

  leagues: [],            // user's leagues for selected season
  // mfa-style flow:
  leagueFamilies: [],     // [{leagueId, name, season, seasons, chain: [...]}]
  selectedFamilies: null, // Set<leagueId> currently selected on picker
  activeFamilies: [],     // families being analyzed in dashboard
  activeFamilyId: null,   // 'all' or a specific family leagueId
  primaryFamilyId: null,  // representative family for "your" stats

  // The "primary" league (the most-recent one in scope).
  // These mirror state.scope[0] so existing tabs continue to work as-is.
  league: null,
  leagueUsers: [],
  rosters: [],
  matchupsByWeek: {},
  transactionsByWeek: {},
  drafts: [],
  draftPicks: {},

  // Multi-season scope: array of season scopes that the user has selected.
  // Each scope: { leagueId, season, league, users, rosters, matchupsByWeek,
  //              transactionsByWeek, drafts, draftPicks, ready, _loadingPromise }
  // Newest season first.
  scope: [],

  // Available seasons reachable via previous_league_id walk.
  // Each: { leagueId, season, name, avatar }
  availableSeasons: [],

  players: null,
  playersPromise: null,

  // Values (sleeperId -> number). Keyed by valuesSource for cache.
  values: null,
  valuesPromise: null,
  valuesSource: 'combined', // 'combined' | 'ktc' | 'fc'
  // What actually loaded for the current values fetch — used for truthful UI labels.
  valuesLoaded: { ktc: false, fc: false },

  // KTC structured payloads (latest snapshot + per-player history).
  // Set once per session; undefined means "not yet attempted".
  ktcSnapshot: undefined,
  ktcHistory: undefined,
  // pickValueIndex: `${season}|${round}` -> KTC pick value for the active league format.
  pickValueIndex: null,

  history: null,
  historyPromise: null,
  // Auxiliary leagues: rosters + drafts + draft picks for seasons that aren't
  // currently in scope. We load these so the trade grader can look up which
  // player a traded pick was eventually used to draft, even when the draft
  // happened in a season the user hasn't selected. Keyed by leagueId.
  auxLeagues: {},
  nflState: null,
  activeTab: 'overview',

  theme: 'light',
};

// Mirror state.scope[0] into the back-compat top-level fields.
export function syncPrimary() {
  const primary = state.scope[0];
  if (!primary) return;
  state.league = primary.league;
  state.leagueUsers = primary.users;
  state.rosters = primary.rosters;
  state.matchupsByWeek = primary.matchupsByWeek;
  state.transactionsByWeek = primary.transactionsByWeek;
  state.drafts = primary.drafts;
  state.draftPicks = primary.draftPicks;
}

export function resetLeagueState() {
  state.league = null;
  state.leagueUsers = [];
  state.rosters = [];
  state.matchupsByWeek = {};
  state.transactionsByWeek = {};
  state.drafts = [];
  state.draftPicks = {};
  state.scope = [];
  state.availableSeasons = [];
  state.history = null;
  state.historyPromise = null;
  state.auxLeagues = {};
  state.pickValueIndex = null;
  // ktcSnapshot/ktcHistory are session-wide (don't depend on selected league)
  // so we deliberately leave them.
}

// ---- Session persistence ----

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

// ---- Prefs (theme, values source) ----

export function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      theme: state.theme,
      valuesSource: state.valuesSource,
    }));
  } catch {}
}
export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null') || {};
    if (p.theme === 'dark' || p.theme === 'light') state.theme = p.theme;
    if (['combined', 'ktc', 'fc'].includes(p.valuesSource)) state.valuesSource = p.valuesSource;
    // Migrate legacy values used in earlier builds.
    if (p.valuesSource === 'dynasty') state.valuesSource = 'fc';
    if (p.valuesSource === 'redraft') state.valuesSource = 'fc';
  } catch {}
}
