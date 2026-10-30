// appvendas Service Worker (PWA) - Version 30 (Hard-Reset & Auto-Recovery)
const CACHE_NAME = 'appvendas-pwa-v30';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

// Install: Skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {}
      }
    })
  );
});

// Activate: Purge ALL caches and force-reload any open/crashed installed app window
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[SW] Deleting stale cache:', name);
          return caches.delete(name);
        })
      );
    })
    .then(() => self.clients.claim())
    .then(async () => {
      // Force reload all open client windows (including uncontrolled/crashed ones)
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        try {
          if ('navigate' in client) {
            client.navigate(client.url || '/');
          } else {
            client.postMessage({ type: 'SW_VERSION_UPDATED', version: 'v30' });
          }
        } catch (e) {}
      }
    })
  );
});

// Message listener
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.type === 'CHECK_FOR_UPDATES')) {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'PURGE_ALL_CACHES') {
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
  }
});

// Fetch router
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // 1. Stale build chunk auto-recovery: If an installed app requests an old build chunk /assets/*.js
  if (url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return valid JS that clears caches and reloads the window
        return new Response(
          "console.warn('[PWA] Stale chunk detected by SW. Clearing caches...');" +
          "if ('caches' in window) { caches.keys().then(function(k){ Promise.all(k.map(function(c){ return caches.delete(c); })); }); }" +
          "if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(r){ Promise.all(r.map(function(reg){ return reg.unregister(); })); }); }" +
          "try { sessionStorage.clear(); } catch(e){}" +
          "window.location.href = '/?atualizado=' + Date.now();",
          {
            headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
            status: 200
          }
        );
      })
    );
    return;
  }

  // 2. Vite development modules, source code, and live scripts: NEVER CACHE
  const isViteLiveResource = (
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.search.includes('v=') ||
    url.search.includes('t=') ||
    url.pathname === '/sw.js'
  );

  if (isViteLiveResource) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 3. Navigation requests (HTML document): Always network-first with fresh reload
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cached) return cached;

          // Offline fallback
          return new Response(
            `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>appvendas</title>
              <style>
                body { background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                button { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 16px; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>⚡ appvendas</h2>
                <p>O aplicativo precisa de internet para atualizar na primeira vez.</p>
                <button onclick="window.location.reload()">Conectar e Atualizar</button>
              </div>
            </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 200
            }
          );
        })
    );
    return;
  }

  // 4. Default: Network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
