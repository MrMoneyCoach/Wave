// wave 365 — service worker
// Offline cache + notification click routing.

const CACHE = 'wave365-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './notify.js',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const view = event.notification.data && event.notification.data.view;
  const url = './' + (view ? `?view=${view}` : '');
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.postMessage({ type: 'navigate', view });
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Allow the page to schedule notifications via the SW so they survive tab close briefly.
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'show-notification') {
    self.registration.showNotification(msg.title, msg.options || {});
  }
});
