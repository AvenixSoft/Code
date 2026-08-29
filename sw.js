/* =========================================================
   TUNEO — Service Worker (offline app shell)
   Cache-first: the app opens instantly and works with no
   network at all (home-screen / airplane mode).
   Bump CACHE version to push an app update.
   ========================================================= */
const CACHE = 'tuneo-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './1.png',
  './1.png',
  './1.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // App launch (navigation): cached shell first, refresh cache in background.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('./index.html');
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => null);
      if (cached) return cached;          // reliable offline launch
      const fresh = await network;         // first visit (online)
      if (fresh) return fresh;
      const fallback = await caches.match('./');
      return fallback || Response.error();
    })());
    return;
  }

  // Everything else: cache first, then network (same-origin only), fill cache.
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && new URL(req.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
