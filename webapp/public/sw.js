// Minimal service worker — enables PWA install. Network-first so users always
// get the latest app; falls back to cache when offline.
const CACHE = "mundial-typy-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle GET navigations/assets from same origin; never cache API calls.
  if (req.method !== "GET" || req.url.includes("/api/")) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match("/")))
  );
});
