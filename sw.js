/* GolBit PWA: offline landing only. Authentication, fixtures, rooms and balances
 * are NEVER cached; all gameplay requires the live Supabase service. */
const CACHE_NAME = "golbit-static-v2026-10-22-02";
const CACHE_PREFIX = "golbit-static-";
const root = new URL("./", self.location.href);
const staticPaths = [
  "offline.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon-180.png"
];
const staticURLs = staticPaths.map((path) => new URL(path, root).href);
const offlineURL = new URL("offline.html", root).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(staticURLs))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Never intercept Supabase/API requests.

  if (request.mode === "navigate") {
    // Network first: never serve a stale authenticated app shell.
    event.respondWith(fetch(request).catch(() => caches.match(offlineURL)));
    return;
  }
  if (staticURLs.includes(url.href)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
