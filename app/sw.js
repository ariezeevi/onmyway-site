// Service worker: makes the app installable and keeps its code on the phone, so it opens at once
// from the second launch on.
// - /app/_expo/static/ and /app/assets/ have a content hash in every file name, so a stored copy
//   is never stale: cache first.
// - Pages (the HTML) always come from the network, so a new version is picked up on the next
//   launch; the stored page is used only when there is no connection.
// - Nothing else (Supabase, maps, routing) is touched: live data stays live.
const CACHE = 'omw-v1';
const HASHED = ['/app/_expo/static/', '/app/assets/'];

// Every new version adds files with new names: keep the newest MAX_FILES, drop the oldest.
const MAX_FILES = 200;
async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_FILES; i++) await cache.delete(keys[i]);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (HASHED.some((p) => url.pathname.startsWith(p))) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          trim(cache);
        }
        return res;
      }),
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || Response.error())),
    );
  }
});
