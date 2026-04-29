// wave 365 — notification scheduling
// Local browser notifications. While the tab/PWA is open we schedule via setTimeout;
// when the user re-opens the app we re-schedule for the rest of the day.

(function () {
  const NOTIFY_KEY = 'wave365.notifyPrefs';
  const FIRED_KEY = 'wave365.notifyFired';

  const DEFAULTS = {
    morning: true,      // 06:50 daily — "Day N. First block at 07:00"
    blocks: true,       // 10 minutes before each engine time block
    friday: true,       // Friday 09:00 — weekly review
    batch: true,        // Sunday 13:50 — keystone hour
  };

  // Lookup table: which time blocks belong to which engines on which days.
  // Pulled from the Weekly Rhythm sheet (Mon LC-Money 07-10, Tue LC-LI 07-10, etc.)
  const BLOCK_TIMES = {
    Mon: [{ start: '07:00', engine: 'LC-Money', label: 'Outreach Monday' }],
    Tue: [{ start: '07:00', engine: 'LC-LI',    label: 'LinkedIn (landlords)' }],
    Wed: [
      { start: '07:00', engine: 'LC-Money', label: 'Mid-week fact-finds' },
      { start: '17:00', engine: 'MMP',      label: 'MMP outreach + content' },
    ],
    Thu: [
      { start: '07:00', engine: 'LC-IG',    label: 'Instagram (SEND)' },
      { start: '17:00', engine: 'Personal', label: 'Personal brand post' },
    ],
    Fri: [
      { start: '07:00', engine: 'Review',   label: 'Friday review' },
      { start: '09:00', engine: 'BB',       label: 'Born Bare admin' },
    ],
    Sat: [{ start: '09:00', engine: 'BB',    label: 'Born Bare deep work' }],
    Sun: [{ start: '14:00', engine: 'Batch', label: 'Keystone — content batch' }],
  };

  const W365notify = {
    prefs() {
      try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(NOTIFY_KEY)) || {}) }; }
      catch { return { ...DEFAULTS }; }
    },
    setPref(key, value) {
      const p = this.prefs();
      p[key] = value;
      localStorage.setItem(NOTIFY_KEY, JSON.stringify(p));
    },

    permission() {
      if (!('Notification' in window)) return 'unsupported';
      return Notification.permission;
    },

    async requestPermission() {
      if (!('Notification' in window)) return 'unsupported';
      try { return await Notification.requestPermission(); }
      catch { return Notification.permission; }
    },

    async fire(title, options = {}) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, {
            badge: 'icon.svg', icon: 'icon.svg',
            silent: false,
            ...options,
          });
          return;
        }
      } catch {}
      new Notification(title, options);
    },

    test() {
      this.fire('Wave 365 — notifications armed', {
        body: 'You\'ll hear from me at 06:50, 10 min before each block, Friday 09:00, and Sunday 13:50.',
        tag: 'test',
        data: { view: 'today' },
      });
    },

    // ---- Scheduling -------------------------------------------------------
    _timeouts: [],

    clear() {
      this._timeouts.forEach(clearTimeout);
      this._timeouts = [];
    },

    _alreadyFired(key) {
      try { return (JSON.parse(localStorage.getItem(FIRED_KEY)) || {})[key]; }
      catch { return false; }
    },
    _markFired(key) {
      let map = {};
      try { map = JSON.parse(localStorage.getItem(FIRED_KEY)) || {}; } catch {}
      map[key] = Date.now();
      // prune anything older than 36h
      const cutoff = Date.now() - 36 * 3600_000;
      for (const k of Object.keys(map)) if (map[k] < cutoff) delete map[k];
      localStorage.setItem(FIRED_KEY, JSON.stringify(map));
    },

    _at(hh, mm) {
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      return d.getTime();
    },
    _parseHHMM(s) {
      const [h, m] = s.split(':').map(Number);
      return [h, m];
    },

    // Re-schedule everything for the rest of today.
    scheduleForToday(today) {
      this.clear();
      const prefs = this.prefs();
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const now = Date.now();
      const dayKey = today.iso; // YYYY-MM-DD
      const dow = today.dow;     // Mon..Sun

      const queue = (key, atMs, title, body, view) => {
        if (atMs <= now) return;
        if (this._alreadyFired(key)) return;
        const ms = atMs - now;
        const id = setTimeout(() => {
          this._markFired(key);
          this.fire(title, { body, tag: key, data: { view } });
        }, ms);
        this._timeouts.push(id);
      };

      // 06:50 morning kick-off
      if (prefs.morning) {
        const first = (today.tasks || [])[0];
        const body = first
          ? `Today: ${first.headline}`
          : `Day ${today.day} of 365. Open the app to see today's blocks.`;
        queue(`morning:${dayKey}`, this._at(6, 50),
          `Day ${today.day} of 365 — ${dow}`, body, 'today');
      }

      // 10 minutes before each block on this day-of-week
      if (prefs.blocks) {
        const blocks = BLOCK_TIMES[dow] || [];
        for (const b of blocks) {
          const [h, m] = this._parseHHMM(b.start);
          const fireAt = this._at(h, m) - 10 * 60_000;
          queue(`block:${dayKey}:${b.start}`, fireAt,
            `${b.start} — ${b.label}`,
            `${b.engine} block in 10 minutes.`,
            'today');
        }
      }

      // Friday 09:00 weekly review
      if (prefs.friday && dow === 'Fri') {
        queue(`friday:${dayKey}`, this._at(9, 0),
          'Friday review',
          'Update the Metrics sheet. Honest scoring beats optimistic scoring.',
          'metrics');
      }

      // Sunday 13:50 batch keystone
      if (prefs.batch && dow === 'Sun') {
        queue(`batch:${dayKey}`, this._at(13, 50),
          'Keystone hour starts at 14:00',
          "Sunday content batch — next week's posts for all 3 brands. 90 minutes.",
          'today');
      }
    },
  };

  window.W365notify = W365notify;
})();
