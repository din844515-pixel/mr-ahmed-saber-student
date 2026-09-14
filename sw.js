const VERSION = 'mr-ahmed-saber-v3-install';
const CACHE = `student-${VERSION}`;

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('student-') && k !== CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(req.url);

  // Keep the existing multi-answer exam patch working.
  if (url.pathname.endsWith('/app.js')) {
    event.respondWith((async () => {
      try {
        const [appRes, patchRes] = await Promise.all([
          fetch(req, { cache: 'no-store' }),
          fetch(
            new URL('/multi_mcq_wrapper.js', self.location.origin),
            { cache: 'no-store' }
          )
        ]);

        if (!appRes.ok) return appRes;

        const app = await appRes.text();
        const patch = patchRes.ok ? await patchRes.text() : '';

        const body = patch
          ? app + '\n\n/* secondary multi-answer patch */\n' + patch
          : app;

        const headers = new Headers(appRes.headers);
        headers.set(
          'content-type',
          'application/javascript; charset=utf-8'
        );

        return new Response(body, {
          status: appRes.status,
          statusText: appRes.statusText,
          headers
        });
      } catch (e) {
        return fetch(req, { cache: 'no-store' });
      }
    })());

    return;
  }

  // Always get the main HTML fresh so updates reach installed apps.
  const isHtml =
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html');

  if (isHtml) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(async res => {
          if (!res.ok) return res;

          let html = await res.text();

          // Add PWA manifest automatically.
          if (!html.includes('rel="manifest"')) {
            html = html.replace(
              '</head>',
              '<link rel="manifest" href="/manifest.webmanifest">' +
              '</head>'
            );
          }

          // Add install button script automatically.
          if (!html.includes('install.js')) {
            html = html.replace(
              '</head>',
              '<script src="/install.js"></script>' +
              '</head>'
            );
          }

          const headers = new Headers(res.headers);
          headers.set('content-type', 'text/html; charset=utf-8');
          headers.set('cache-control', 'no-store');

          return new Response(html, {
            status: res.status,
            statusText: res.statusText,
            headers
          });
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match('/'))
        )
    );

    return;
  }

  // Cache HTML/CSS/manifest for offline fallback.
  const isAppFile =
    url.pathname === '/' ||
    /\.(html|css|webmanifest)$/.test(url.pathname);

  if (!isAppFile) return;

  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() =>
        caches.match(req).then(cached => cached || caches.match('/'))
      )
  );
});
