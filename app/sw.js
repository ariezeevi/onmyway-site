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

// Notifications: the server sends {title, body, data}; data says which screen it is about.
// (iPhone requires every push to show something, so nothing is hidden when the app is open.)
function urlFor(data) {
  data = data || {};
  if (data.screen === 'friends') return '/app/friends';
  if (data.screen === 'driver') return '/app/driver';
  if (data.screen === 'rider') return '/app/rider';
  if (data.screen === 'publish' && data.recurring) return '/app/publish-now?recurring=' + encodeURIComponent(data.recurring);
  if (data.with) return '/app/chat?with=' + encodeURIComponent(data.with);
  if (data.matchId) return '/app/match?id=' + encodeURIComponent(data.matchId);
  return '/app/';
}

self.addEventListener('push', (e) => {
  let msg = {};
  try {
    msg = e.data ? e.data.json() : {};
  } catch (err) {
    msg = { title: 'On My Way', body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(msg.title || 'On My Way', {
      body: msg.body || '',
      icon: '/app/icons/icon-192.png',
      badge: '/app/icons/icon-192.png',
      dir: 'rtl',
      lang: 'he',
      data: msg.data || {},
      tag: (msg.data && (msg.data.matchId || msg.data.with)) || undefined,
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = urlFor(e.notification.data);
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      for (const c of list) {
        if (c.url.indexOf('/app/') !== -1 && 'focus' in c) {
          await c.focus();
          if ('navigate' in c) {
            try {
              await c.navigate(target);
            } catch (err) {
              // fall through: the app is in front anyway
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    }),
  );
});
