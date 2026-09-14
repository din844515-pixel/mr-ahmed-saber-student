const VERSION = 'mr-ahmed-saber-v2-multi';
const CACHE = `student-${VERSION}`;

self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('student-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  const url = new URL(req.url);

  if (url.pathname.endsWith('/app.js')) {
    event.respondWith((async () => {
      try {
        const [appRes, patchRes] = await Promise.all([
          fetch(req, {cache:'no-store'}),
          fetch(new URL('/multi_mcq_wrapper.js', self.location.origin), {cache:'no-store'})
        ]);
        if (!appRes.ok) return appRes;
        const app = await appRes.text();
        const patch = patchRes.ok ? await patchRes.text() : '';
        const body = patch ? app + '\n\n/* secondary multi-answer patch */\n' + patch : app;
        const headers = new Headers(appRes.headers);
        headers.set('content-type','application/javascript; charset=utf-8');
        return new Response(body,{status:appRes.status,statusText:appRes.statusText,headers});
      } catch (e) {
        return fetch(req,{cache:'no-store'});
      }
    })());
    return;
  }

  const isAppFile = url.pathname === '/' || /\.(html|css|webmanifest)$/.test(url.pathname);
  if (!isAppFile) return;
  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(res => { const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return res; })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/')))
  );
});
