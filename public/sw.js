// Minimal service worker: exists ONLY to satisfy Android PWA installability.
// It performs NO caching — every request goes straight to the network — so it
// can never serve a stale build.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch listener is part of installability criteria. Passthrough only.
self.addEventListener('fetch', () => {
  // Intentionally empty: do not call respondWith, so the browser handles
  // the request normally with no interception or caching.
});
