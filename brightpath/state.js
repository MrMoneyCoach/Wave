// BrightPath persistent state.
// Stored in localStorage under 'brightpath:v1'.
// Tracks: profile, XP, hearts (with refill), streak, daily goal, lesson progress (crowns),
// stickers, and preferences (calmMode, sound).

const KEY = 'brightpath:v1';

const DEFAULT_STATE = {
  version: 1,
  name: '',
  avatar: '🦊',
  xp: 0,
  weeklyXp: 0,
  weekStart: dateOnly(weekStartFor(new Date())),
  streak: 0,
  lastActiveDate: '',           // YYYY-MM-DD
  dailyGoal: 20,                // XP/day
  todayXp: 0,
  todayDate: '',
  hearts: 5,
  maxHearts: 5,
  heartRefillAt: null,          // ISO timestamp when next heart refills (one heart at a time)
  progress: {},                 // courseId -> unitId -> lessonId -> { crowns: 0..5, lastScore }
  stickers: [],                 // [{id, name, emoji, earnedOn}]
  prefs: {
    calmMode: false,            // reduces motion/animation, softens accent
    sound: true,
    bigText: false,
    reduceConfetti: false,
  },
};

function dateOnly(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayStr() { return dateOnly(new Date()); }
function weekStartFor(d) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun..6 Sat
  x.setDate(x.getDate() - day);
  x.setHours(0,0,0,0);
  return x;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return Object.assign(clone(DEFAULT_STATE), parsed, {
      prefs: Object.assign({}, DEFAULT_STATE.prefs, parsed.prefs || {}),
    });
  } catch (_) {
    return clone(DEFAULT_STATE);
  }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

// --- Lifecycle ---

function rolloverIfNeeded(state) {
  const today = todayStr();
  if (state.todayDate !== today) {
    state.todayXp = 0;
    state.todayDate = today;
  }
  // Weekly XP rollover (Sunday)
  const ws = dateOnly(weekStartFor(new Date()));
  if (state.weekStart !== ws) {
    state.weekStart = ws;
    state.weeklyXp = 0;
  }
  refillHeartsIfDue(state);
  return state;
}

function refillHeartsIfDue(state) {
  if (state.hearts >= state.maxHearts) {
    state.heartRefillAt = null;
    return;
  }
  if (!state.heartRefillAt) {
    state.heartRefillAt = new Date(Date.now() + 30*60*1000).toISOString();
    return;
  }
  let due = new Date(state.heartRefillAt).getTime();
  while (state.hearts < state.maxHearts && Date.now() >= due) {
    state.hearts += 1;
    due += 30*60*1000;
  }
  state.heartRefillAt = state.hearts >= state.maxHearts ? null : new Date(due).toISOString();
}

// --- Mutations ---

function addXp(state, amount) {
  state.xp += amount;
  state.weeklyXp += amount;
  state.todayXp += amount;
}

function noteActivity(state) {
  const today = todayStr();
  if (state.lastActiveDate === today) return;
  if (!state.lastActiveDate) {
    state.streak = 1;
  } else {
    const last = new Date(state.lastActiveDate);
    const diff = Math.round((new Date(today) - last) / (24*3600*1000));
    if (diff === 1) state.streak += 1;
    else state.streak = 1;
  }
  state.lastActiveDate = today;
}

function loseHeart(state) {
  state.hearts = Math.max(0, state.hearts - 1);
  if (state.hearts < state.maxHearts && !state.heartRefillAt) {
    state.heartRefillAt = new Date(Date.now() + 30*60*1000).toISOString();
  }
}

function recordLessonComplete(state, courseId, unitId, lessonId, score) {
  state.progress[courseId] = state.progress[courseId] || {};
  state.progress[courseId][unitId] = state.progress[courseId][unitId] || {};
  const cur = state.progress[courseId][unitId][lessonId] || { crowns: 0, lastScore: 0 };
  cur.crowns = Math.min(5, cur.crowns + 1);
  cur.lastScore = score;
  state.progress[courseId][unitId][lessonId] = cur;
}

function getCrowns(state, courseId, unitId, lessonId) {
  return state.progress?.[courseId]?.[unitId]?.[lessonId]?.crowns ?? 0;
}

function isLessonStarted(state, courseId, unitId, lessonId) {
  return getCrowns(state, courseId, unitId, lessonId) > 0;
}

function awardSticker(state, sticker) {
  if (state.stickers.find(s => s.id === sticker.id)) return false;
  state.stickers.push({ ...sticker, earnedOn: todayStr() });
  return true;
}

window.BP_STATE = {
  load, save, rolloverIfNeeded,
  addXp, noteActivity, loseHeart,
  recordLessonComplete, getCrowns, isLessonStarted,
  awardSticker,
  todayStr,
};
