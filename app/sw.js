// Minimal service worker: lets Chrome treat the app as installable.
// No offline caching on purpose (rides need live data and stale code is worse than none).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
