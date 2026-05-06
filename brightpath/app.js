// BrightPath app shell.
// Pulls data from window.BP_DATA and persisted state from window.BP_STATE.

const { COURSES } = window.BP_DATA;
const SS = window.BP_STATE;

const AVATARS = ['🦊','🐻','🐼','🐨','🐰','🐯','🐶','🐱','🦁','🐸','🐵','🐧'];

const STICKER_CATALOG = [
  { id: 'first-step',     name: 'First Step',     emoji: '👣', desc: 'Finish your first lesson.' },
  { id: 'streak-3',       name: '3-Day Streak',   emoji: '🔥', desc: 'Practice 3 days in a row.' },
  { id: 'streak-7',       name: '7-Day Streak',   emoji: '🌟', desc: 'Practice 7 days in a row.' },
  { id: 'goal-keeper',    name: 'Goal Keeper',    emoji: '🎯', desc: 'Hit your daily goal.' },
  { id: 'letter-explorer',name: 'Letter Explorer',emoji: '🔤', desc: 'Finish 5 letter lessons.' },
  { id: 'number-ninja',   name: 'Number Ninja',   emoji: '🔢', desc: 'Finish 5 number lessons.' },
  { id: 'feelings-friend',name: 'Feelings Friend',emoji: '💛', desc: 'Finish 3 feelings lessons.' },
  { id: 'routine-pro',    name: 'Routine Pro',    emoji: '🗓️', desc: 'Finish 3 My Day lessons.' },
  { id: 'gold-crown',     name: 'Gold Crown',     emoji: '👑', desc: 'Earn 5 crowns on any lesson.' },
  { id: 'big-brain',      name: 'Big Brain',      emoji: '🧠', desc: 'Earn 100 XP total.' },
  { id: 'celebrate',      name: 'Celebrate!',     emoji: '🎉', desc: 'Finish a perfect lesson.' },
  { id: 'kindness',       name: 'Kindness',       emoji: '💖', desc: 'Finish a Feelings + My Day lesson.' },
];

let state = SS.rolloverIfNeeded(SS.load());
SS.save(state);
applyPrefs();

// ---------- helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function show(id) {
  ['screen-onboarding','screen-home','screen-path','screen-lesson','screen-result']
    .forEach(s => $('#' + s).classList.add('hidden'));
  $('#' + id).classList.remove('hidden');
  window.scrollTo({ top: 0 });
}

function persist() { SS.save(state); }

function applyPrefs() {
  document.documentElement.setAttribute('data-calm', state.prefs.calmMode ? 'true' : 'false');
  document.documentElement.setAttribute('data-bigtext', state.prefs.bigText ? 'true' : 'false');
}

// ---------- onboarding ----------

function renderOnboarding() {
  const grid = $('#avatar-grid');
  grid.innerHTML = '';
  AVATARS.forEach(a => {
    const btn = document.createElement('button');
    btn.textContent = a;
    if (a === state.avatar) btn.classList.add('selected');
    btn.onclick = () => {
      state.avatar = a;
      $$('button', grid).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
    grid.appendChild(btn);
  });

  $('#name-input').value = state.name || '';

  $$('#goal-tabs button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.goal) === state.dailyGoal);
    b.onclick = () => {
      state.dailyGoal = Number(b.dataset.goal);
      $$('#goal-tabs button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });

  $('#start-btn').onclick = () => {
    state.name = $('#name-input').value.trim() || 'Friend';
    persist();
    enterHome();
  };
}

// ---------- home ----------

function enterHome() {
  show('screen-home');
  refreshHome();
  bindNavTabs();
  $('#open-settings').onclick = openSettings;
  $('#continue-btn').onclick = continueDailyGoal;
}

function bindNavTabs() {
  $$('#screen-home .nav-tabs button').forEach(b => {
    b.onclick = () => {
      $$('#screen-home .nav-tabs button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const tab = b.dataset.tab;
      ['learn','stickers','profile'].forEach(t => {
        $('#tab-' + t).classList.toggle('hidden', t !== tab);
      });
      if (tab === 'stickers') renderStickers();
      if (tab === 'profile') renderProfile();
    };
  });
}

function refreshHome() {
  state = SS.rolloverIfNeeded(state); persist();
  $('#brand-avatar').textContent = state.avatar;
  $('#stat-streak').textContent = state.streak;
  $('#stat-xp').textContent = state.xp;
  $('#stat-hearts').textContent = state.hearts;

  $('#daily-goal-num').textContent = state.dailyGoal;
  const pct = Math.min(100, Math.round((state.todayXp / state.dailyGoal) * 100));
  const ring = $('#goal-ring');
  ring.style.setProperty('--p', pct);
  $('#goal-pct').textContent = pct + '%';
  $('#daily-goal-msg').textContent =
    pct >= 100 ? "You hit today's goal! ⭐" :
    pct === 0  ? "Let's start a lesson!" :
    `Just ${state.dailyGoal - state.todayXp} XP to go.`;

  renderCourses();
}

function renderCourses() {
  const host = $('#course-grid');
  host.innerHTML = '';
  COURSES.forEach(course => {
    const totalLessons = course.units.reduce((n, u) => n + u.lessons.length, 0);
    let done = 0;
    course.units.forEach(u => u.lessons.forEach(l => {
      if (SS.isLessonStarted(state, course.id, u.id, l.id)) done++;
    }));
    const pct = Math.round((done / totalLessons) * 100);

    const card = document.createElement('button');
    card.className = 'course-card';
    card.style.borderColor = course.color;
    card.innerHTML = `
      <div class="ce">${course.emoji}</div>
      <h3>${course.title}</h3>
      <p>${course.description}</p>
      <div class="progress-bar"><div class="fill" style="width:${pct}%; background:${course.color}"></div></div>
      <p class="muted" style="margin-top:6px;">${done} / ${totalLessons} lessons</p>
    `;
    card.onclick = () => openCourse(course.id);
    host.appendChild(card);
  });
}

// ---------- path / course ----------

let currentCourse = null;

function openCourse(courseId) {
  currentCourse = COURSES.find(c => c.id === courseId);
  show('screen-path');
  $('#path-emoji').textContent = currentCourse.emoji;
  $('#path-title').textContent = currentCourse.title;
  $('#path-streak').textContent = state.streak;
  $('#path-xp').textContent = state.xp;
  $('#path-hearts').textContent = state.hearts;

  $('#path-back').onclick = enterHome;

  const host = $('#units-host');
  host.innerHTML = '';

  // Header banner
  const header = document.createElement('div');
  header.className = 'path-header';
  header.style.background = `linear-gradient(135deg, ${currentCourse.color} 0%, ${shade(currentCourse.color, -15)} 100%)`;
  header.style.boxShadow = `0 4px 0 ${shade(currentCourse.color, -25)}`;
  header.innerHTML = `
    <div class="ce">${currentCourse.emoji}</div>
    <div>
      <h2>${currentCourse.title}</h2>
      <p>${currentCourse.description}</p>
    </div>
  `;
  host.appendChild(header);

  // Determine the next available lesson (first not-yet-started, sequential)
  let nextFound = false;
  currentCourse.units.forEach(unit => {
    const u = document.createElement('div');
    u.className = 'unit';
    u.innerHTML = `
      <div class="unit-banner">
        <div style="font-size:36px">${currentCourse.emoji}</div>
        <div>
          <h3>${unit.title}</h3>
          <p>${unit.description}</p>
        </div>
      </div>
      <div class="path-track"></div>
    `;
    const track = $('.path-track', u);
    unit.lessons.forEach((lesson, i) => {
      const row = document.createElement('div');
      row.className = 'path-row r' + (i % 5);

      const node = document.createElement('button');
      const crowns = SS.getCrowns(state, currentCourse.id, unit.id, lesson.id);
      const started = crowns > 0;
      const isNext = !started && !nextFound;

      // gating: lock lessons that come after the next-available one
      // actually: allow re-doing started ones, lock only those past the boundary
      const locked = !started && !isNext;

      node.className = 'node' + (locked ? ' locked' : '') + (crowns >= 5 ? ' gold' : '') + (isNext ? ' next' : '');
      node.style.setProperty('--node-color', currentCourse.color);
      node.style.setProperty('--node-color-dark', shade(currentCourse.color, -20));
      node.textContent = locked ? '🔒' : lesson.emoji;
      if (crowns > 0) {
        const c = document.createElement('span');
        c.className = 'crowns';
        c.textContent = '👑'.repeat(Math.min(3, crowns)) + (crowns > 3 ? '+' : '');
        node.appendChild(c);
      }
      node.onclick = () => {
        if (locked) return;
        if (state.hearts <= 0) return openOutOfHearts();
        startLesson(currentCourse, unit, lesson);
      };

      const label = document.createElement('div');
      label.className = 'node-label';
      label.textContent = lesson.title;

      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.appendChild(node);
      wrap.appendChild(label);

      row.appendChild(wrap);
      track.appendChild(row);

      if (isNext) nextFound = true;
    });

    host.appendChild(u);
  });
}

function shade(hex, percent) {
  // basic hex shade — assumes #RRGGBB
  let h = hex.replace('#','');
  if (h.length === 3) h = h.split('').map(c => c+c).join('');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (percent/100) * 255)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2,'0')).join('');
}

function continueDailyGoal() {
  // Find first started or next-available lesson across all courses; open it
  for (const course of COURSES) {
    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        if (!SS.isLessonStarted(state, course.id, unit.id, lesson.id)) {
          if (state.hearts <= 0) return openOutOfHearts();
          return startLesson(course, unit, lesson);
        }
      }
    }
  }
  // All done — pick one to redo at random
  const course = COURSES[0];
  const unit = course.units[0];
  startLesson(course, unit, unit.lessons[0]);
}

// ---------- lesson runtime ----------

let lessonCtx = null;

function startLesson(course, unit, lesson) {
  // Build questions in original order. For some types we shuffle option order each play.
  const questions = lesson.exercises.map(ex => buildQuestion(ex));
  lessonCtx = {
    course, unit, lesson,
    questions,
    idx: 0,
    correctCount: 0,
    wrongCount: 0,
    perfect: true,
  };
  show('screen-lesson');
  $('#lesson-quit').onclick = () => {
    if (confirm('Quit this lesson? Your progress here will not be saved.')) enterHome();
  };
  renderQuestion();
}

function buildQuestion(ex) {
  if (ex.type === 'choice' && Array.isArray(ex.options)) {
    return { ...ex, options: shuffle(ex.options) };
  }
  if (ex.type === 'match') {
    return { ...ex,
      lefts: shuffle(ex.pairs.map((p, i) => ({ key: i, label: p.left }))),
      rights: shuffle(ex.pairs.map((p, i) => ({ key: i, label: p.right }))),
    };
  }
  if (ex.type === 'sequence') {
    return { ...ex, scrambled: shuffle(ex.items.map((s, i) => ({ k: i, label: s }))) };
  }
  return ex;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderQuestion() {
  const q = lessonCtx.questions[lessonCtx.idx];
  const progress = (lessonCtx.idx / lessonCtx.questions.length) * 100;
  $('#lesson-progress').style.width = progress + '%';
  $('#lesson-hearts').textContent = state.hearts;
  $('#lesson-prompt').textContent = q.prompt;
  hideFeedback();

  const stage = $('#lesson-stage');
  stage.innerHTML = '';
  if (q.type === 'choice')     return renderChoice(stage, q);
  if (q.type === 'count')      return renderCount(stage, q);
  if (q.type === 'match')      return renderMatch(stage, q);
  if (q.type === 'sequence')   return renderSequence(stage, q);
  if (q.type === 'truefalse')  return renderTrueFalse(stage, q);
  if (q.type === 'sayit')      return renderSayIt(stage, q);
}

// --- Choice
function renderChoice(stage, q) {
  const grid = document.createElement('div');
  grid.className = 'choice-grid';
  q.options.forEach((opt, idx) => {
    const b = document.createElement('button');
    b.className = 'opt';
    const inner = [];
    if (opt.emoji) inner.push(`<div class="emoji">${opt.emoji}</div>`);
    if (opt.label) inner.push(`<div class="opt-label">${opt.label}</div>`);
    b.innerHTML = inner.join('');
    b.onclick = () => {
      $$('.opt', grid).forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      $('#fb-continue').dataset.choice = idx;
    };
    grid.appendChild(b);
  });
  stage.appendChild(grid);

  const checkBtn = document.createElement('button');
  checkBtn.className = 'btn btn-block btn-lg';
  checkBtn.style.marginTop = '20px';
  checkBtn.textContent = 'Check';
  checkBtn.onclick = () => {
    const sel = $('.opt.selected', grid);
    if (!sel) return;
    const idx = $$('.opt', grid).indexOf(sel);
    const correct = !!q.options[idx].correct;
    $$('.opt', grid).forEach((el, i) => {
      el.classList.add('disabled');
      if (q.options[i].correct) el.classList.add('correct');
      if (i === idx && !correct) el.classList.add('wrong');
    });
    showFeedback(correct, q.options.find(o => o.correct)?.label);
  };
  stage.appendChild(checkBtn);
}

// --- Count
function renderCount(stage, q) {
  const wrap = document.createElement('div');
  wrap.style.background = 'var(--bg-soft)';
  wrap.style.borderRadius = '24px';
  wrap.style.padding = '24px';
  wrap.style.textAlign = 'center';
  wrap.style.fontSize = '46px';
  wrap.style.lineHeight = '1.2';
  wrap.textContent = q.emoji.repeat(q.answer);
  stage.appendChild(wrap);

  const grid = document.createElement('div');
  grid.className = 'choice-grid';
  grid.style.marginTop = '14px';
  const opts = q.options.length ? q.options : [q.answer, q.answer+1, Math.max(0,q.answer-1)];
  opts.forEach(n => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.innerHTML = `<div class="emoji">${n}</div>`;
    b.onclick = () => {
      $$('.opt', grid).forEach(x => { x.classList.add('disabled'); });
      const correct = n === q.answer;
      b.classList.add(correct ? 'correct' : 'wrong');
      if (!correct) {
        $$('.opt', grid).forEach((el, i) => { if (Number(el.textContent) === q.answer) el.classList.add('correct'); });
      }
      showFeedback(correct, String(q.answer));
    };
    grid.appendChild(b);
  });
  stage.appendChild(grid);
}

// --- Match
function renderMatch(stage, q) {
  const grid = document.createElement('div');
  grid.className = 'match-grid';
  const colA = document.createElement('div'); colA.className = 'match-col';
  const colB = document.createElement('div'); colB.className = 'match-col';
  grid.appendChild(colA); grid.appendChild(colB);
  stage.appendChild(grid);

  let activeLeft = null;
  let matched = 0;

  q.lefts.forEach(item => {
    const t = document.createElement('button');
    t.className = 'match-tile';
    t.textContent = item.label;
    t.dataset.k = item.key;
    t.onclick = () => {
      if (t.classList.contains('matched')) return;
      $$('.match-tile', colA).forEach(x => x.classList.remove('selected'));
      t.classList.add('selected');
      activeLeft = t;
    };
    colA.appendChild(t);
  });

  q.rights.forEach(item => {
    const t = document.createElement('button');
    t.className = 'match-tile emoji';
    t.textContent = item.label;
    t.dataset.k = item.key;
    t.onclick = () => {
      if (t.classList.contains('matched')) return;
      if (!activeLeft) return;
      if (activeLeft.dataset.k === t.dataset.k) {
        activeLeft.classList.remove('selected');
        activeLeft.classList.add('matched');
        t.classList.add('matched');
        activeLeft = null;
        matched++;
        if (matched === q.lefts.length) showFeedback(true, '');
      } else {
        // brief shake
        t.classList.add('wrong');
        setTimeout(() => t.classList.remove('wrong'), 350);
        activeLeft.classList.remove('selected');
        activeLeft = null;
      }
    };
    colB.appendChild(t);
  });
}

// --- Sequence
function renderSequence(stage, q) {
  const placedHost = document.createElement('div');
  placedHost.className = 'seq-list';
  const optsHost = document.createElement('div');
  optsHost.className = 'seq-options';

  // Placeholders
  q.items.forEach((_, i) => {
    const ph = document.createElement('div');
    ph.className = 'seq-item';
    ph.dataset.idx = i;
    ph.innerHTML = `<span class="num">${i+1}</span><span class="lbl muted">…</span>`;
    placedHost.appendChild(ph);
  });

  let placedCount = 0;
  q.scrambled.forEach(s => {
    const b = document.createElement('div');
    b.className = 'seq-item';
    b.dataset.k = s.k;
    b.innerHTML = `<span class="num">·</span><span class="lbl">${s.label}</span>`;
    b.onclick = () => {
      if (b.classList.contains('placed')) return;
      const slot = placedHost.children[placedCount];
      slot.querySelector('.lbl').textContent = s.label;
      slot.querySelector('.lbl').classList.remove('muted');
      slot.dataset.k = s.k;
      slot.classList.add('placed');
      b.classList.add('placed');
      b.style.opacity = 0.4;
      placedCount++;
      if (placedCount === q.items.length) {
        // check
        let ok = true;
        for (let i = 0; i < q.items.length; i++) {
          if (Number(placedHost.children[i].dataset.k) !== i) { ok = false; break; }
        }
        showFeedback(ok, q.items.join(' → '));
      }
    };
    optsHost.appendChild(b);
  });

  stage.appendChild(placedHost);
  stage.appendChild(optsHost);
}

// --- True / False
function renderTrueFalse(stage, q) {
  const wrap = document.createElement('div');
  wrap.className = 'tf-grid';
  const yes = document.createElement('button');
  yes.className = 'tf-card';
  yes.innerHTML = `<div class="ic">✅</div>True`;
  const no = document.createElement('button');
  no.className = 'tf-card';
  no.innerHTML = `<div class="ic">❌</div>False`;
  wrap.appendChild(yes); wrap.appendChild(no);
  stage.appendChild(wrap);

  const choose = (val) => {
    [yes, no].forEach(b => b.style.pointerEvents = 'none');
    const correct = val === q.answer;
    (val ? yes : no).classList.add(correct ? 'matched' : 'wrong');
    if (!correct) (q.answer ? yes : no).classList.add('matched');
    showFeedback(correct, q.answer ? 'True' : 'False');
  };
  yes.onclick = () => choose(true);
  no.onclick = () => choose(false);
}

// --- Say It (no validation; encourages speech)
function renderSayIt(stage, q) {
  const card = document.createElement('div');
  card.className = 'sayit-card';
  card.innerHTML = `
    <div style="font-size:64px">🗣️</div>
    <div class="muted" style="text-transform:uppercase; letter-spacing:1px; font-size:12px;">Say it out loud</div>
    <div class="target">${q.target}</div>
    <div class="muted">When you've said it, tap "I said it!"</div>
  `;
  stage.appendChild(card);
  const btn = document.createElement('button');
  btn.className = 'btn btn-block btn-lg btn-purple';
  btn.style.marginTop = '20px';
  btn.textContent = 'I said it!';
  btn.onclick = () => showFeedback(true, q.target);
  stage.appendChild(btn);
}

// --- Feedback bar
function showFeedback(correct, hint) {
  const bar = $('#feedback-bar');
  bar.classList.remove('hidden', 'correct', 'wrong');
  bar.classList.add(correct ? 'correct' : 'wrong');
  $('#fb-ic').textContent = correct ? '✅' : '🤔';
  $('#fb-msg').textContent = correct
    ? randomCheer()
    : hint ? `Almost! Answer: ${hint}` : 'Not quite — let’s try again.';
  $('#fb-continue').textContent = 'Continue';
  $('#fb-continue').onclick = () => {
    if (correct) {
      lessonCtx.correctCount++;
    } else {
      lessonCtx.wrongCount++;
      lessonCtx.perfect = false;
      SS.loseHeart(state); persist();
      $('#stat-hearts').textContent = state.hearts;
    }
    advanceLesson();
  };
}
function hideFeedback() { $('#feedback-bar').classList.add('hidden'); }

const CHEERS = ['Great job!', 'Awesome!', 'You got it!', 'Nice!', 'Brilliant!', 'Yes!', 'Way to go!'];
function randomCheer() { return CHEERS[Math.floor(Math.random() * CHEERS.length)]; }

function advanceLesson() {
  if (state.hearts <= 0) {
    return openOutOfHearts();
  }
  lessonCtx.idx++;
  if (lessonCtx.idx >= lessonCtx.questions.length) return finishLesson();
  renderQuestion();
}

function finishLesson() {
  const total = lessonCtx.questions.length;
  const acc = Math.round((lessonCtx.correctCount / total) * 100);
  const xpGain = lessonCtx.perfect ? 15 : 10;

  SS.addXp(state, xpGain);
  SS.noteActivity(state);
  SS.recordLessonComplete(state, lessonCtx.course.id, lessonCtx.unit.id, lessonCtx.lesson.id, acc);
  awardStickers();
  persist();

  show('screen-result');
  $('#result-title').textContent = lessonCtx.perfect ? 'Perfect!' : 'Lesson complete!';
  $('#result-sub').textContent = lessonCtx.perfect ? 'No mistakes — amazing.' : `You got ${lessonCtx.correctCount}/${total}.`;
  $('#result-xp').textContent = '+' + xpGain;
  $('#result-acc').textContent = acc + '%';
  $('#result-crowns').textContent = '👑'.repeat(Math.min(5, SS.getCrowns(state, lessonCtx.course.id, lessonCtx.unit.id, lessonCtx.lesson.id)));

  $('#result-home').onclick = enterHome;
  $('#result-next').onclick = () => openCourse(lessonCtx.course.id);

  fireConfetti();
}

function fireConfetti() {
  if (state.prefs.calmMode || state.prefs.reduceConfetti) return;
  const host = $('#confetti');
  host.classList.remove('hidden');
  host.innerHTML = '';
  const colors = ['#58CC02','#1CB0F6','#FF9600','#CE82FF','#FFC800','#FF4B4B'];
  for (let i = 0; i < 60; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = (Math.random() * 0.5) + 's';
    s.style.transform = `rotate(${Math.random() * 360}deg)`;
    host.appendChild(s);
  }
  setTimeout(() => host.classList.add('hidden'), 2000);
}

// ---------- stickers ----------

function awardStickers() {
  // First lesson
  const totalCompleted = countCompleted();
  if (totalCompleted >= 1) SS.awardSticker(state, find('first-step'));
  if (state.streak >= 3) SS.awardSticker(state, find('streak-3'));
  if (state.streak >= 7) SS.awardSticker(state, find('streak-7'));
  if (state.todayXp >= state.dailyGoal) SS.awardSticker(state, find('goal-keeper'));
  if (countCompletedIn('letters') >= 5) SS.awardSticker(state, find('letter-explorer'));
  if (countCompletedIn('numbers') >= 5) SS.awardSticker(state, find('number-ninja'));
  if (countCompletedIn('feelings') >= 3) SS.awardSticker(state, find('feelings-friend'));
  if (countCompletedIn('day') >= 3) SS.awardSticker(state, find('routine-pro'));
  if (anyMaxedCrowns()) SS.awardSticker(state, find('gold-crown'));
  if (state.xp >= 100) SS.awardSticker(state, find('big-brain'));
  if (lessonCtx.perfect) SS.awardSticker(state, find('celebrate'));
  if (countCompletedIn('feelings') >= 1 && countCompletedIn('day') >= 1) SS.awardSticker(state, find('kindness'));
}
function find(id) { return STICKER_CATALOG.find(s => s.id === id); }
function countCompleted() {
  let n = 0;
  COURSES.forEach(c => c.units.forEach(u => u.lessons.forEach(l => {
    if (SS.isLessonStarted(state, c.id, u.id, l.id)) n++;
  })));
  return n;
}
function countCompletedIn(courseId) {
  const course = COURSES.find(c => c.id === courseId);
  let n = 0;
  course.units.forEach(u => u.lessons.forEach(l => {
    if (SS.isLessonStarted(state, course.id, u.id, l.id)) n++;
  }));
  return n;
}
function anyMaxedCrowns() {
  for (const c of COURSES) for (const u of c.units) for (const l of u.lessons) {
    if (SS.getCrowns(state, c.id, u.id, l.id) >= 5) return true;
  }
  return false;
}

function renderStickers() {
  const host = $('#sticker-grid');
  host.innerHTML = '';
  const earned = new Set(state.stickers.map(s => s.id));
  $('#sticker-count').textContent = `${earned.size}/${STICKER_CATALOG.length}`;
  STICKER_CATALOG.forEach(st => {
    const el = document.createElement('div');
    el.className = 'sticker' + (earned.has(st.id) ? '' : ' locked');
    el.title = st.name + ' — ' + st.desc;
    el.textContent = earned.has(st.id) ? st.emoji : '🔒';
    host.appendChild(el);
  });
}

// ---------- profile + settings ----------

function renderProfile() {
  $('#profile-avatar').textContent = state.avatar;
  $('#profile-name').textContent = state.name || 'Friend';
  $('#profile-xp').textContent = state.xp;
  $('#profile-streak').textContent = state.streak;
  $('#weekly-xp').textContent = state.weeklyXp;

  const list = $('#settings-list');
  list.innerHTML = '';
  list.appendChild(toggleRow('Calm mode', 'Softer colors, no big animations.', 'calmMode'));
  list.appendChild(toggleRow('Bigger text', 'Larger size for easier reading.', 'bigText'));
  list.appendChild(toggleRow('Less confetti', 'Quieter celebrations after a lesson.', 'reduceConfetti'));
  list.appendChild(toggleRow('Sound', 'Play small sound effects.', 'sound'));

  // Daily goal picker
  const goalRow = document.createElement('div');
  goalRow.className = 'setting';
  goalRow.innerHTML = `
    <div>
      <div class="label">Daily goal</div>
      <div class="desc">XP target each day.</div>
    </div>
    <select class="input" style="width:auto" id="goal-select">
      <option value="10">10 XP</option>
      <option value="20">20 XP</option>
      <option value="40">40 XP</option>
      <option value="60">60 XP</option>
    </select>
  `;
  list.appendChild(goalRow);
  $('#goal-select', goalRow).value = String(state.dailyGoal);
  $('#goal-select', goalRow).onchange = (e) => {
    state.dailyGoal = Number(e.target.value);
    persist();
    refreshHome();
  };

  const reset = document.createElement('button');
  reset.className = 'btn btn-ghost btn-block';
  reset.style.marginTop = '12px';
  reset.textContent = 'Restart progress';
  reset.onclick = () => {
    if (confirm('Clear all progress, XP, hearts, and stickers? This cannot be undone.')) {
      localStorage.removeItem('brightpath:v1');
      location.reload();
    }
  };
  list.appendChild(reset);
}

function toggleRow(title, desc, key) {
  const row = document.createElement('div');
  row.className = 'setting';
  row.innerHTML = `
    <div>
      <div class="label">${title}</div>
      <div class="desc">${desc}</div>
    </div>
  `;
  const btn = document.createElement('button');
  btn.className = 'toggle' + (state.prefs[key] ? ' on' : '');
  btn.onclick = () => {
    state.prefs[key] = !state.prefs[key];
    btn.classList.toggle('on', state.prefs[key]);
    persist();
    applyPrefs();
  };
  row.appendChild(btn);
  return row;
}

function openSettings() {
  $$('#screen-home .nav-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === 'profile'));
  ['learn','stickers','profile'].forEach(t => $('#tab-' + t).classList.toggle('hidden', t !== 'profile'));
  renderProfile();
  $('#tab-profile').scrollIntoView({ behavior: 'smooth' });
}

// ---------- out of hearts ----------

function openOutOfHearts() {
  const host = $('#modal-host');
  host.innerHTML = '';
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `
    <div class="modal">
      <div style="font-size:64px; text-align:center;">❤️‍🩹</div>
      <h2 style="text-align:center">Out of hearts</h2>
      <p style="text-align:center">Take a little break — hearts come back over time.</p>
      <p class="muted center" id="oh-timer"></p>
      <div class="row" style="gap:10px; margin-top:14px;">
        <button class="btn btn-ghost btn-block" id="oh-home">Home</button>
        <button class="btn btn-block" id="oh-refill">Refill now</button>
      </div>
    </div>
  `;
  host.appendChild(back);
  const updateTimer = () => {
    if (!state.heartRefillAt) { $('#oh-timer').textContent = ''; return; }
    const ms = new Date(state.heartRefillAt).getTime() - Date.now();
    if (ms <= 0) { $('#oh-timer').textContent = 'Hearts ready!'; return; }
    const m = Math.floor(ms/60000), s = Math.floor((ms%60000)/1000);
    $('#oh-timer').textContent = `Next heart in ${m}:${String(s).padStart(2,'0')}`;
  };
  updateTimer();
  const t = setInterval(updateTimer, 1000);
  $('#oh-home').onclick = () => { clearInterval(t); host.innerHTML = ''; enterHome(); };
  $('#oh-refill').onclick = () => {
    state.hearts = state.maxHearts;
    state.heartRefillAt = null;
    persist();
    clearInterval(t);
    host.innerHTML = '';
    refreshHome();
    enterHome();
  };
}

// ---------- boot ----------

if (!state.name) {
  show('screen-onboarding');
  renderOnboarding();
} else {
  enterHome();
}

// Refresh hearts periodically (in case the user idles on the home screen)
setInterval(() => {
  state = SS.rolloverIfNeeded(state);
  persist();
  if (!$('#screen-home').classList.contains('hidden')) refreshHome();
}, 30 * 1000);
