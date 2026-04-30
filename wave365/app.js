// wave 365 — main app
// Three engines, 22 hrs/week, from zero. Local-only. PWA installable.

(function () {
  'use strict';
  const PLAN = window.PLAN;

  // ---------- Storage --------------------------------------------------------
  const LS_DONE   = 'wave365.done';      // { "<day>:<taskIdx>": true }
  const LS_METRIC = 'wave365.metrics';   // { "W<n>": { "<metricNum>": "value" } }
  const LS_OVRIDE = 'wave365.todayOverride'; // ISO date or empty

  function loadJSON(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) || fallback; }
    catch { return fallback; }
  }
  function saveJSON(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

  let DONE = loadJSON(LS_DONE, {});
  let METRICS = loadJSON(LS_METRIC, {});

  // ---------- Calendar / day lookup -----------------------------------------
  // The plan's default day 1 is Mon 27 Apr 2026 (from the spreadsheet).
  // The user can override this in Settings → Start date.
  const LS_START   = 'wave365.startDate';   // ISO YYYY-MM-DD
  const DEFAULT_START = new Date(2026, 3, 27); // months are 0-indexed

  function pad2(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }

  function getStartDate() {
    const raw = localStorage.getItem(LS_START);
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map(Number);
      const out = new Date(y, m - 1, d);
      out.setHours(0, 0, 0, 0);
      return out;
    }
    const d = new Date(DEFAULT_START);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function setStartDate(iso) {
    if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) localStorage.setItem(LS_START, iso);
    else localStorage.removeItem(LS_START);
  }
  // Back-compat: a "DAY1" property recomputed each access.
  Object.defineProperty(window, '__W365_START__', { get: getStartDate, configurable: true });

  function effectiveToday() {
    const override = localStorage.getItem(LS_OVRIDE);
    if (override) {
      const [y, m, d] = override.split('-').map(Number);
      return new Date(y, m-1, d);
    }
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function dayIndexFor(date) {
    const start = getStartDate();
    const ms = date - start;
    return Math.floor(ms / 86400000) + 1; // 1-based
  }

  function dayRecord(idx) {
    if (idx < 1) return null;
    if (idx > PLAN.days.length) return null;
    return PLAN.days[idx - 1];
  }

  function dowOf(date) {
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()];
  }
  function fmtDateLong(date) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dows = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return `${dows[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  function monthTheme(m) {
    const row = (PLAN.monthlyMilestones || []).find(r => r.month === m);
    return row ? row.theme : '';
  }

  // ---------- Engine display helpers ----------------------------------------
  // The data uses BB during sprint months M4-M6 (Days 90-152 per README).
  // We tag those visually as BB-Sprint.
  function effectiveEngine(task, day) {
    if (task.engine === 'BB' && day && day.day >= 90 && day.day <= 152) return 'BB-Sprint';
    return task.engine;
  }
  const ENGINE_LABEL = {
    'LC-Money': 'Legacy · Money',
    'LC-LI':    'Legacy · LinkedIn (landlords)',
    'LC-IG':    'Legacy · Instagram (SEND)',
    'BB':       'Born Bare',
    'BB-Sprint':'Born Bare · Kickstarter sprint',
    'MMP':      'Money Matters Plus',
    'Personal': 'Scott · personal brand',
    'Batch':    'Sunday content batch',
    'Admin':    'Admin / setup',
    'Review':   'Weekly review',
  };
  const RULES = (PLAN.readme && PLAN.readme.rules) || [];

  // Heuristic time-of-day for the standard week, used to render today as a schedule.
  function blockTimeFor(task, dow) {
    const e = task.engine;
    // Sunday batch is the only weekend afternoon block.
    if (dow === 'Sun' && e === 'Batch') return '14:00';
    if (dow === 'Wed' && e === 'MMP') return '17:00';
    if (dow === 'Thu' && e === 'Personal') return '17:00';
    if (dow === 'Fri' && e === 'BB') return '09:00';
    if (dow === 'Fri' && e === 'Review') return '07:00';
    if (dow === 'Sat' && e === 'BB') return '09:00';
    return '07:00';
  }
  function endTimeFor(task, start) {
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + (task.mins || 0);
    return `${pad2(Math.floor(total/60))}:${pad2(total%60)}`;
  }

  // ---------- DOM helpers ----------------------------------------------------
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k.startsWith('data-')) node.setAttribute(k, v);
      else if (v !== false && v != null) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('visible'), 2400);
  }

  // ---------- Done state -----------------------------------------------------
  function doneKey(dayNum, idx) { return `${dayNum}:${idx}`; }
  function isDone(dayNum, idx)   { return !!DONE[doneKey(dayNum, idx)]; }
  function setDone(dayNum, idx, val) {
    if (val) DONE[doneKey(dayNum, idx)] = true;
    else delete DONE[doneKey(dayNum, idx)];
    saveJSON(LS_DONE, DONE);
  }

  function totals() {
    let doneCount = 0, doneMins = 0;
    for (const day of PLAN.days) {
      day.tasks.forEach((t, i) => {
        if (isDone(day.day, i)) {
          doneCount++;
          doneMins += t.mins || 0;
        }
      });
    }
    return { doneCount, doneHours: Math.round(doneMins / 60) };
  }

  function streakDays() {
    // Number of consecutive recent days (ending at "today") with at least one task done.
    const today = effectiveToday();
    const idx = dayIndexFor(today);
    let streak = 0;
    for (let i = idx; i >= 1; i--) {
      const d = dayRecord(i);
      if (!d) break;
      const any = d.tasks.some((_, j) => isDone(d.day, j));
      if (!any) break;
      streak++;
    }
    return streak;
  }

  // ---------- Today view -----------------------------------------------------
  function renderToday() {
    const today = effectiveToday();
    const idx   = dayIndexFor(today);
    const day   = dayRecord(idx);

    if (!day) {
      $('#heroDay').textContent = idx < 1 ? '—' : '✓';
      $('#heroDate').textContent = fmtDateLong(today);
      $('#heroWeek').textContent = idx < 1 ? `Year starts ${fmtDateLong(getStartDate())}` : 'Year complete';
      $('#heroMonth').textContent = '';
      $('#heroRule').textContent = '';
      $('#nextUp').innerHTML = '';
      $('#todayTasks').innerHTML = '';
      $('#tomorrowTasks').innerHTML = '';
      drawProgressWave(idx < 1 ? 0 : 1);
      return;
    }

    $('#heroDay').textContent = day.day;
    $('#heroDate').textContent = fmtDateLong(today);
    $('#heroWeek').textContent = `Week ${day.week}`;
    $('#heroMonth').textContent = `${day.month} · ${monthTheme(day.month)}`;
    const ruleIdx = (day.day - 1) % RULES.length;
    $('#heroRule').textContent = RULES[ruleIdx] ? `“${RULES[ruleIdx]}”` : '';

    // Annotate tasks with effective engine + start/end time
    const dow = day.dow || dowOf(today);
    const enriched = day.tasks.map((t, i) => {
      const eng = effectiveEngine(t, day);
      const start = blockTimeFor(t, dow);
      const end = endTimeFor(t, start);
      return { ...t, idx: i, eng, start, end };
    });
    enriched.sort((a, b) => a.start.localeCompare(b.start));

    // Next-up = first not-yet-done task whose start is in the future or now,
    // else the first not-yet-done task of the day.
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const upcoming = enriched.find(t => {
      if (isDone(day.day, t.idx)) return false;
      const [h, m] = t.start.split(':').map(Number);
      return (h * 60 + m) >= nowMins;
    }) || enriched.find(t => !isDone(day.day, t.idx));

    renderNextUp(upcoming, day);

    // Today blocks list
    const list = $('#todayTasks');
    list.innerHTML = '';
    enriched.forEach((t) => list.appendChild(taskRow(t, day, true)));

    // Tomorrow preview
    const tom = dayRecord(idx + 1);
    const tomList = $('#tomorrowTasks');
    tomList.innerHTML = '';
    if (tom) {
      const tomDate = new Date(today); tomDate.setDate(tomDate.getDate() + 1);
      const tdow = dowOf(tomDate);
      const tomEnriched = tom.tasks.map((t, i) => {
        const eng = effectiveEngine(t, tom);
        const start = blockTimeFor(t, tdow);
        return { ...t, idx: i, eng, start, end: endTimeFor(t, start) };
      }).sort((a, b) => a.start.localeCompare(b.start));
      tomEnriched.forEach((t) => tomList.appendChild(taskRow(t, tom, false)));
    } else {
      tomList.appendChild(el('div', { class: 'muted' }, '—'));
    }

    // Pulse stats
    const t = totals();
    $('#streakNum').textContent = streakDays();
    $('#doneNum').textContent = t.doneCount;
    $('#hoursNum').textContent = t.doneHours;

    drawProgressWave(day.day / 365);

    // Re-arm notifications for today
    if (window.W365notify) {
      window.W365notify.scheduleForToday({
        iso: isoDate(today),
        day: day.day,
        dow,
        tasks: enriched.map(t => ({ headline: t.headline, engine: t.eng, start: t.start })),
      });
    }
  }

  function renderNextUp(t, day) {
    const root = $('#nextUp');
    if (!t) {
      root.innerHTML = '';
      root.appendChild(el('div', { class: 'next-up', 'data-engine': 'Review' }, [
        el('div', { class: 'next-up-eyebrow' }, [el('span', { class: 'pulse-dot' }), 'All clear']),
        el('div', { class: 'next-up-time' }, '✓'),
        el('div', { class: 'next-up-headline' }, 'Every block today is checked off.'),
        el('div', { class: 'next-up-engine' }, 'Rest. Or get a head start on tomorrow.'),
      ]));
      return;
    }
    root.innerHTML = '';
    const engineLbl = ENGINE_LABEL[t.eng] || t.eng;
    root.appendChild(el('div', { class: 'next-up', 'data-engine': t.eng }, [
      el('div', { class: 'next-up-eyebrow' }, [el('span', { class: 'pulse-dot' }), 'Next up']),
      el('div', { class: 'next-up-time' }, `${t.start}–${t.end}`),
      el('div', { class: 'next-up-headline' }, t.headline),
      el('div', { class: 'next-up-engine', html: `${t.mins} min · <strong>${engineLbl}</strong>` }),
      t.detail ? el('div', { class: 'next-up-detail' }, t.detail) : null,
      el('div', { class: 'next-up-actions' }, [
        el('button', {
          class: 'btn primary',
          onclick: () => { setDone(day.day, t.idx, true); toast('Done. Nice.'); renderToday(); }
        }, 'Mark done'),
        el('button', {
          class: 'btn',
          onclick: () => { document.querySelector(`[data-task-id="${day.day}:${t.idx}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }, 'View detail'),
      ]),
    ]));
  }

  function taskRow(t, day, interactive) {
    const dayNum = day.day;
    const done = isDone(dayNum, t.idx);
    const engineLbl = ENGINE_LABEL[t.eng] || t.eng;

    const check = el('button', {
      class: `task-check ${done ? 'done' : ''}`,
      'aria-label': done ? 'Mark not done' : 'Mark done',
      onclick: (ev) => {
        ev.stopPropagation();
        if (!interactive) return;
        const next = !isDone(dayNum, t.idx);
        setDone(dayNum, t.idx, next);
        toast(next ? 'Done.' : 'Reopened.');
        renderToday();
      },
    });

    const row = el('div', {
      class: `task ${done ? 'done' : ''}`,
      'data-engine': t.eng,
      'data-task-id': `${dayNum}:${t.idx}`,
      onclick: (ev) => {
        if (ev.target.closest('.task-check')) return;
        row.classList.toggle('expanded');
      },
    }, [
      el('div', { class: 'task-time' }, [
        document.createTextNode(`${t.start}–${t.end}`),
        el('span', { class: 'mins' }, `${t.mins} min`),
      ]),
      el('div', { class: 'task-body' }, [
        el('div', { class: 'task-engine' }, engineLbl),
        el('div', { class: 'task-headline' }, t.headline),
        t.detail ? el('div', { class: 'task-detail' }, t.detail) : null,
      ]),
      check,
    ]);
    return row;
  }

  // ---------- Progress wave --------------------------------------------------
  function drawProgressWave(frac) {
    frac = Math.max(0, Math.min(1, frac));
    const svg = $('#progressWave');
    if (!svg) return;
    const W = 600, H = 80;
    const cut = W * frac;

    // Three braided waves; the gold one is the active progress.
    const wavePath = (yMid, amp, phase) => {
      const segs = [];
      for (let x = 0; x <= W; x += 20) {
        const y = yMid + Math.sin((x / 60) + phase) * amp;
        segs.push(`${x === 0 ? 'M' : 'L'}${x},${y.toFixed(2)}`);
      }
      return segs.join(' ');
    };

    svg.innerHTML = `
      <defs>
        <linearGradient id="goldFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#fff5d6"/>
          <stop offset="100%" stop-color="#c79a4a"/>
        </linearGradient>
        <clipPath id="cutClip"><rect x="0" y="0" width="${cut}" height="${H}"/></clipPath>
      </defs>
      <path d="${wavePath(50, 6, 0.8)}" stroke="#7fc28f" stroke-width="2" fill="none" opacity=".35"/>
      <path d="${wavePath(44, 8, 0.0)}" stroke="#6ec1d6" stroke-width="2" fill="none" opacity=".45"/>
      <g clip-path="url(#cutClip)">
        <path d="${wavePath(40, 10, 1.6)}" stroke="url(#goldFill)" stroke-width="3" fill="none"/>
      </g>
      <path d="${wavePath(40, 10, 1.6)}" stroke="#1a2c3a" stroke-width="1" fill="none" opacity=".7" stroke-dasharray="2 4"/>
      <line x1="${cut}" y1="14" x2="${cut}" y2="${H-10}" stroke="#e8c97c" stroke-width="1.5"/>
      <circle cx="${cut}" cy="40" r="4.5" fill="#fff5d6"/>
    `;
    $('#progressPct').textContent = `${Math.round(frac * 100)}%`;
  }

  // Continue rendering wiring in part 2 — view router, week/year/milestones/metrics/settings.
  window.W365 = {
    PLAN, DONE, METRICS,
    isoDate, dayIndexFor, dayRecord, effectiveToday, dowOf, fmtDateLong, monthTheme,
    effectiveEngine, ENGINE_LABEL, RULES, blockTimeFor, endTimeFor,
    el, $, $$, toast,
    isDone, setDone, totals, streakDays,
    renderToday, drawProgressWave, taskRow,
    LS_DONE, LS_METRIC, LS_OVRIDE, LS_START,
    saveJSON, loadJSON,
    getStartDate, setStartDate, DEFAULT_START,
  };
})();
