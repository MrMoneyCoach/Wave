// wave 365 — main app, part 2: views, router, settings, init
(function () {
  'use strict';
  const W = window.W365;
  if (!W) return;
  const PLAN = window.PLAN;
  const { el, $, $$, toast, isoDate, dayIndexFor, dayRecord, effectiveToday, dowOf,
          fmtDateLong, monthTheme, effectiveEngine, ENGINE_LABEL, RULES,
          blockTimeFor, endTimeFor, isDone, totals, drawProgressWave,
          renderToday, getStartDate } = W;

  // ---------- View router ----------------------------------------------------
  function setView(name, opts = {}) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
    if (name === 'today')      renderToday();
    if (name === 'week')       renderWeek(opts.weekOffset || 0);
    if (name === 'year')       renderYear();
    if (name === 'milestones') renderMilestones();
    if (name === 'metrics')    renderMetrics(opts.weekOffset || 0);
    if (name === 'settings')   renderSettings();
  }

  // ---------- WEEK -----------------------------------------------------------
  let weekOffset = 0;
  function renderWeek(offset) {
    weekOffset = offset || 0;
    const today = effectiveToday();
    today.setDate(today.getDate() + weekOffset * 7);
    // Snap to Monday of the week
    const dow = today.getDay(); // Sun=0..Sat=6
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow + 6) % 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const idx = dayIndexFor(d);
      const rec = dayRecord(idx);
      days.push({ date: d, idx, rec });
    }

    // Header — pick week number / theme from first present rec, else infer from today
    const first = days.find(x => x.rec) || days[0];
    if (first.rec) {
      $('#weekNum').textContent   = `Week ${first.rec.week}`;
      $('#weekTheme').textContent = `${first.rec.month} · ${monthTheme(first.rec.month)}`;
    } else {
      $('#weekNum').textContent   = `${monday.toDateString()}`;
      $('#weekTheme').textContent = 'Outside the 365-day window';
    }

    const grid = $('#weekDays');
    grid.innerHTML = '';
    const realToday = effectiveToday();
    days.forEach(({ date, idx, rec }) => {
      const isToday = isoDate(date) === isoDate(realToday);
      const card = el('div', {
        class: `week-day ${isToday ? 'today' : ''}`,
        onclick: () => {
          if (rec) {
            // Setting override would change "today" — instead just jump to today view if it IS today.
            if (isToday) setView('today');
          }
        }
      }, [
        el('div', { class: 'week-day-header' }, [
          el('div', { class: 'week-day-dow' }, dowOf(date)),
          el('div', { class: 'week-day-num' }, rec ? `Day ${rec.day}` : isoDate(date)),
        ]),
      ]);
      if (rec) {
        const dowStr = dowOf(date);
        rec.tasks.forEach((t, i) => {
          const eng = effectiveEngine(t, rec);
          const start = blockTimeFor(t, dowStr);
          card.appendChild(el('div', {
            class: 'week-day-task', 'data-engine': eng,
          }, [
            el('span', { class: 'engine-tag' }, ENGINE_LABEL[eng] || eng),
            el('strong', {}, `${start} · ${t.headline}`),
          ]));
        });
      } else {
        card.appendChild(el('div', { class: 'muted', style: 'font-size:12px;' }, '—'));
      }
      grid.appendChild(card);
    });

    // Weekly Rhythm reference table
    const rhy = $('#rhythmList');
    rhy.innerHTML = '';
    (PLAN.weeklyRhythm || []).forEach(r => {
      rhy.appendChild(el('div', { class: 'rhy-day' }, r.day));
      rhy.appendChild(el('div', { class: 'rhy-block' }, r.block));
      rhy.appendChild(el('div', { class: 'rhy-activity', 'data-engine': r.engine }, r.activity));
    });
  }

  $('#weekPrev').addEventListener('click',  () => renderWeek(weekOffset - 1));
  $('#weekNext').addEventListener('click',  () => renderWeek(weekOffset + 1));
  $('#weekToday').addEventListener('click', () => renderWeek(0));

  // ---------- YEAR -----------------------------------------------------------
  function renderYear() {
    const grid = $('#yearGrid');
    grid.innerHTML = '';
    // Header row: blank corner + 53 week numbers
    grid.appendChild(el('div', { class: 'year-row-label' }, ''));
    for (let w = 1; w <= 53; w++) {
      grid.appendChild(el('div', { class: 'year-row-label', style: 'justify-content:center;' }, w % 4 === 1 ? `W${w}` : ''));
    }

    const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const realTodayIdx = dayIndexFor(effectiveToday());

    for (let r = 0; r < 7; r++) {
      grid.appendChild(el('div', { class: 'year-row-label' }, dows[r]));
      for (let w = 1; w <= 53; w++) {
        const dayNum = (w - 1) * 7 + r + 1;
        if (dayNum > 365) {
          grid.appendChild(el('div', { class: 'year-cell empty' }));
          continue;
        }
        const rec = dayRecord(dayNum);
        if (!rec) { grid.appendChild(el('div', { class: 'year-cell empty' })); continue; }
        const primary = rec.tasks[0];
        const eng = primary ? effectiveEngine(primary, rec) : 'Admin';
        const allDone = rec.tasks.every((_, i) => isDone(rec.day, i));
        const cell = el('div', {
          class: `year-cell ${allDone ? 'done' : ''} ${dayNum === realTodayIdx ? 'today' : ''}`,
          'data-engine': eng,
          'data-day': dayNum,
        });
        cell.addEventListener('mouseenter', (e) => showYearTip(e, rec));
        cell.addEventListener('mousemove', moveYearTip);
        cell.addEventListener('mouseleave', hideYearTip);
        cell.addEventListener('click', () => {
          // Set override and jump to today
          localStorage.setItem(W.LS_OVRIDE, isoDate(new Date(getStartDate().getTime() + (rec.day - 1) * 86400000)));
          setView('today');
          toast(`Viewing day ${rec.day}. Settings → Time travel to clear.`);
        });
        grid.appendChild(cell);
      }
    }

    // Legend
    const legend = $('#yearLegend');
    legend.innerHTML = '';
    [
      ['LC-Money', 'Legacy · Money'],
      ['LC-LI',    'Legacy · LinkedIn'],
      ['LC-IG',    'Legacy · Instagram'],
      ['BB',       'Born Bare'],
      ['BB-Sprint','BB Kickstarter sprint'],
      ['MMP',      'MMP'],
      ['Personal', 'Scott · personal'],
      ['Batch',    'Sunday batch'],
      ['Admin',    'Admin'],
      ['Review',   'Review'],
    ].forEach(([eng, label]) => {
      legend.appendChild(el('span', { class: 'legend-pill', 'data-engine': eng }, [
        el('span', { class: 'swatch' }), label,
      ]));
    });
  }

  function showYearTip(ev, rec) {
    const tip = $('#yearTooltip');
    const lines = rec.tasks.map(t => `• ${t.headline}`).join('<br>');
    tip.innerHTML = `<strong>Day ${rec.day} — ${rec.dow} · ${rec.month}</strong><br>${rec.date}<br><br>${lines}`;
    tip.classList.add('visible');
    moveYearTip(ev);
  }
  function moveYearTip(ev) {
    const tip = $('#yearTooltip');
    const x = Math.min(window.innerWidth - 280, ev.clientX + 14);
    const y = Math.min(window.innerHeight - 140, ev.clientY + 14);
    tip.style.left = x + 'px';
    tip.style.top  = y + 'px';
  }
  function hideYearTip() { $('#yearTooltip').classList.remove('visible'); }

  // ---------- MILESTONES -----------------------------------------------------
  function renderMilestones() {
    const list = $('#milestonesList');
    list.innerHTML = '';
    const today = effectiveToday();
    const idx = dayIndexFor(today);
    const cur = dayRecord(idx);
    const currentMonth = cur ? cur.month : null;

    (PLAN.monthlyMilestones || []).forEach(m => {
      const card = el('div', {
        class: `milestone-card ${m.month === currentMonth ? 'current' : ''}`,
      }, [
        el('div', { class: 'milestone-month' }, [
          el('div', { class: 'milestone-num' }, m.month),
          el('div', { class: 'milestone-theme' }, m.theme || ''),
        ]),
        el('div', { class: 'milestone-engines' }, [
          el('div', { class: 'milestone-engine', 'data-engine': 'LC-Money' }, [
            el('h4', {}, 'Legacy Capital'),
            el('p', {}, m.lc || '—'),
          ]),
          el('div', { class: 'milestone-engine', 'data-engine': 'BB' }, [
            el('h4', {}, 'Born Bare'),
            el('p', {}, m.bb || '—'),
          ]),
          el('div', { class: 'milestone-engine', 'data-engine': 'MMP' }, [
            el('h4', {}, 'MMP'),
            el('p', {}, m.mmp || '—'),
          ]),
        ]),
      ]);
      list.appendChild(card);
    });
  }

  // ---------- METRICS --------------------------------------------------------
  let metricsOffset = 0;
  function metricsWeekKey(offset) {
    const today = effectiveToday();
    const idx = dayIndexFor(today);
    const cur = dayRecord(idx);
    const wkNum = cur ? cur.week : 1;
    return `W${Math.max(1, wkNum + (offset || 0))}`;
  }
  function renderMetrics(offset) {
    metricsOffset = offset || 0;
    const wKey = metricsWeekKey(metricsOffset);
    $('#metricsWeekLabel').textContent = wKey;

    const grid = $('#metricsGrid');
    grid.innerHTML = '';
    const stored = W.METRICS[wKey] || {};

    // Section by section
    let curSection = null;
    (PLAN.metrics || []).forEach(m => {
      if (m.section !== curSection) {
        curSection = m.section;
        const engineHint = sectionEngine(curSection);
        grid.appendChild(el('div', { class: 'metric-section-header', 'data-engine': engineHint }, curSection));
      }
      const input = el('input', {
        type: 'text',
        class: 'metric-value',
        placeholder: '—',
        value: stored[m.num] || '',
        'data-num': m.num,
      });
      input.addEventListener('change', () => {
        if (!W.METRICS[wKey]) W.METRICS[wKey] = {};
        W.METRICS[wKey][m.num] = input.value;
        W.saveJSON(W.LS_METRIC, W.METRICS);
        toast(`${wKey} · ${m.name}: saved`);
      });
      grid.appendChild(el('div', { class: 'metric-row' }, [
        el('div', { class: 'metric-name' }, m.name),
        input,
        el('div', { class: 'metric-target' }, m.target ? `→ ${m.target}` : ''),
      ]));
    });
  }
  function sectionEngine(section) {
    if (!section) return 'Admin';
    const s = section.toUpperCase();
    if (s.includes('LEGACY'))   return 'LC-Money';
    if (s.includes('BORN'))     return 'BB';
    if (s.includes('MMP'))      return 'MMP';
    if (s.includes('PERSONAL')) return 'Personal';
    return 'Admin';
  }
  $('#metricsPrev').addEventListener('click',  () => renderMetrics(metricsOffset - 1));
  $('#metricsNext').addEventListener('click',  () => renderMetrics(metricsOffset + 1));
  $('#metricsToday').addEventListener('click', () => renderMetrics(0));

  // ---------- SETTINGS -------------------------------------------------------
  function renderSettings() {
    // Notification status pill
    const status = (window.W365notify && window.W365notify.permission()) || 'unsupported';
    const pill = $('#notifStatus');
    pill.textContent = status;
    pill.classList.toggle('granted', status === 'granted');
    pill.classList.toggle('denied',  status === 'denied');

    // Pref checkboxes
    const prefs = window.W365notify ? window.W365notify.prefs() : {};
    $('#notifMorning').checked = !!prefs.morning;
    $('#notifBlocks').checked  = !!prefs.blocks;
    $('#notifFriday').checked  = !!prefs.friday;
    $('#notifBatch').checked   = !!prefs.batch;

    // Override
    $('#overrideDate').value = localStorage.getItem(W.LS_OVRIDE) || '';

    // Start date
    const startInput = $('#startDateInput');
    if (startInput) {
      startInput.value = isoDate(getStartDate());
      const start = getStartDate();
      const todayIdx = W.dayIndexFor(W.effectiveToday());
      const info = todayIdx < 1
        ? `Today is ${1 - todayIdx} day(s) before Day 1.`
        : (todayIdx > 365 ? `The 365 days have ended.` : `Today is Day ${todayIdx} of 365.`);
      $('#startDateInfo').textContent = `Day 1 = ${fmtDateLong(start)}. ${info}`;
    }

    // Rules + outcomes
    const rules = $('#rulesList'); rules.innerHTML = '';
    RULES.forEach(r => rules.appendChild(el('li', {}, r)));

    const outcomes = $('#outcomesList'); outcomes.innerHTML = '';
    const o = (PLAN.readme && PLAN.readme.outcomes) || {};
    Object.entries(o).forEach(([k, v]) => {
      outcomes.appendChild(el('li', {}, [el('b', {}, k), document.createTextNode(v)]));
    });
  }

  $('#notifEnable').addEventListener('click', async () => {
    if (!window.W365notify) return;
    const res = await window.W365notify.requestPermission();
    toast(`Permission: ${res}`);
    renderSettings();
    renderToday(); // re-arm scheduling
  });
  $('#notifTest').addEventListener('click', () => window.W365notify && window.W365notify.test());
  ['notifMorning','notifBlocks','notifFriday','notifBatch'].forEach((id) => {
    const map = { notifMorning: 'morning', notifBlocks: 'blocks', notifFriday: 'friday', notifBatch: 'batch' };
    $('#' + id).addEventListener('change', (e) => {
      window.W365notify && window.W365notify.setPref(map[id], e.target.checked);
      renderToday();
    });
  });
  $('#overrideDate').addEventListener('change', (e) => {
    if (e.target.value) localStorage.setItem(W.LS_OVRIDE, e.target.value);
    else localStorage.removeItem(W.LS_OVRIDE);
    toast('Time travel updated.');
    renderToday();
  });
  $('#overrideClear').addEventListener('click', () => {
    localStorage.removeItem(W.LS_OVRIDE);
    $('#overrideDate').value = '';
    toast('Back to today.');
    renderToday();
  });

  // Start-date input
  const startDateInput = $('#startDateInput');
  if (startDateInput) {
    startDateInput.addEventListener('change', (e) => {
      W.setStartDate(e.target.value);
      toast('Start date updated.');
      renderToday(); renderSettings();
    });
  }
  $('#startDateReset')?.addEventListener('click', () => {
    W.setStartDate(null);
    toast('Start date reset to default.');
    renderToday(); renderSettings();
  });

  // Theme toggle
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wave365.theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1f1814' : '#fff7ea');
  }
  $('#themeToggle')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  // ---------- ICS calendar export ------------------------------------------
  // Reliable reminders via the user's native Calendar app. iOS suspends
  // backgrounded PWAs which kills setTimeout-based notifications; importing
  // these as real calendar events bypasses that entirely.
  function pad2n(n) { return String(n).padStart(2, '0'); }
  function escapeICS(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }
  function foldICSLine(line) {
    // RFC 5545: lines longer than 75 octets must be folded.
    if (line.length <= 75) return line;
    const out = [];
    let i = 0;
    while (i < line.length) {
      out.push((i === 0 ? '' : ' ') + line.slice(i, i + 73));
      i += 73;
    }
    return out.join('\r\n');
  }
  function fmtFloating(date, hh, mm) {
    return `${date.getFullYear()}${pad2n(date.getMonth()+1)}${pad2n(date.getDate())}T${pad2n(hh)}${pad2n(mm)}00`;
  }
  function buildICS() {
    const start = W.getStartDate();
    const now = new Date();
    const dtstamp = `${now.getUTCFullYear()}${pad2n(now.getUTCMonth()+1)}${pad2n(now.getUTCDate())}T${pad2n(now.getUTCHours())}${pad2n(now.getUTCMinutes())}${pad2n(now.getUTCSeconds())}Z`;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//wave365//Three Engines 365//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Wave 365 — Three Engines',
      'X-WR-CALDESC:Legacy Capital + Born Bare + MMP — 365-day plan',
      'X-WR-TIMEZONE:Europe/London',
    ];

    PLAN.days.forEach((day) => {
      const date = new Date(start);
      date.setDate(start.getDate() + day.day - 1);
      const dow = day.dow || W.dowOf(date);

      day.tasks.forEach((task, i) => {
        const eng = W.effectiveEngine(task, day);
        const startTime = W.blockTimeFor(task, dow);
        const [sh, sm] = startTime.split(':').map(Number);
        const endTime = W.endTimeFor(task, startTime);
        const [eh, em] = endTime.split(':').map(Number);

        const uid = `wave365-d${day.day}-t${i}@wave365`;
        const engineLabel = W.ENGINE_LABEL[eng] || eng;
        const summary = `[${engineLabel}] ${task.headline || ''}`;
        const descParts = [];
        if (task.detail) descParts.push(task.detail);
        descParts.push(`— Day ${day.day} of 365 · Week ${day.week} · ${day.month}${task.mins ? ` · ${task.mins} min` : ''}`);
        const description = descParts.join('\n\n');

        [
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${fmtFloating(date, sh, sm)}`,
          `DTEND:${fmtFloating(date, eh, em)}`,
          `SUMMARY:${escapeICS(summary)}`,
          `DESCRIPTION:${escapeICS(description)}`,
          `CATEGORIES:${escapeICS(engineLabel)}`,
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'TRIGGER:-PT10M',
          `DESCRIPTION:${escapeICS(task.headline || 'Reminder')}`,
          'END:VALARM',
          'END:VEVENT',
        ].forEach((l) => lines.push(foldICSLine(l)));
      });
    });

    lines.push('END:VCALENDAR');
    // RFC 5545 mandates CRLF.
    return lines.join('\r\n') + '\r\n';
  }

  $('#downloadICS')?.addEventListener('click', () => {
    const ics = buildICS();
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'wave365.ics' });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Calendar file downloaded. On iPhone: open it in Mail and tap "Add All".');
  });

  $('#exportData').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ done: W.DONE, metrics: W.METRICS }, null, 2)],
      { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: `wave365-progress-${isoDate(new Date())}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });
  $('#importData').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.done)    { Object.assign(W.DONE, data.done);       W.saveJSON(W.LS_DONE, W.DONE); }
        if (data.metrics) { Object.assign(W.METRICS, data.metrics); W.saveJSON(W.LS_METRIC, W.METRICS); }
        toast('Imported.'); renderToday();
      } catch { toast('Import failed.'); }
    };
    reader.readAsText(f);
  });
  $('#resetData').addEventListener('click', () => {
    if (!confirm('Reset all progress? This clears done-state and metrics.')) return;
    localStorage.removeItem(W.LS_DONE);
    localStorage.removeItem(W.LS_METRIC);
    Object.keys(W.DONE).forEach(k => delete W.DONE[k]);
    Object.keys(W.METRICS).forEach(k => delete W.METRICS[k]);
    toast('Reset.'); renderToday();
  });

  // ---------- Tabs -----------------------------------------------------------
  $$('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));

  // The #grain canvas is left empty in the new theme — soft watercolor blobs
  // come from CSS gradients on the body. No JS painting needed.
  function paintGrain() { /* no-op in Headspace theme */ }

  // ---------- Service worker -------------------------------------------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
    navigator.serviceWorker.addEventListener('message', (ev) => {
      if (ev.data && ev.data.type === 'navigate' && ev.data.view) setView(ev.data.view);
    });
  }

  // ---------- Init -----------------------------------------------------------
  function init() {
    paintGrain();
    addEventListener('resize', paintGrain);

    // Initial view from URL ?view= param, else Today.
    const params = new URLSearchParams(location.search);
    const initial = params.get('view') || 'today';
    setView(initial);

    // Re-render on focus (e.g. coming back to a tab the next morning)
    window.addEventListener('focus', () => renderToday());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') renderToday();
    });

    // Tick every minute to refresh "next up" countdown logic
    setInterval(() => {
      if (document.querySelector('.view-today.active')) renderToday();
    }, 60_000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
