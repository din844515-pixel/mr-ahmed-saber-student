const VERSION = 'mr-ahmed-saber-v1';
const CACHE = `student-${VERSION}`;

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('student-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  const url = new URL(req.url);
  const isAppFile = url.pathname === '/' || /\.(html|js|css|webmanifest)$/.test(url.pathname);
  if (!isAppFile) return;

  // Network-first: every opening checks Vercel for the newest version.
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/')))
  );
});
