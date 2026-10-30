// appvendas Service Worker (PWA) - Version 25 (Instant Auto-Update & Resilient Cache)
const CACHE_NAME = 'appvendas-pwa-v25';
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

// Install: precache essential shell assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          // Non-fatal if optional asset fails
        }
      }
    })
  );
});

// Activate: purge ALL old caches immediately and take control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting stale cache:', name);
            return caches.delete(name);
          })
      );
    })
    .then(() => self.clients.claim())
    .then(async () => {
      const allClients = await self.clients.matchAll({ type: 'window' });
      for (const client of allClients) {
        client.postMessage({ type: 'SW_VERSION_UPDATED', version: 'v25' });
      }
    })
  );
});

// Listen for messages from app
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.type === 'CHECK_FOR_UPDATES')) {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'PURGE_ALL_CACHES') {
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
  }
});

// Fetch: Smart network-first routing with Vite dev-safety
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore non-http requests
  if (!url.protocol.startsWith('http')) return;

  // CRITICAL: NEVER cache Vite dev files or dynamic module chunks (avoids 504 Outdated optimize dep white screen)
  const isViteDevModule = (
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/node_modules/') ||
    url.pathname.includes('.tsx') ||
    url.pathname.includes('.ts') ||
    url.search.includes('v=') ||
    url.search.includes('t=') ||
    url.pathname.startsWith('/src/') ||
    url.pathname === '/sw.js'
  );

  if (isViteDevModule) {
    // Direct network passthrough - do not cache
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('Network fetch failed', { status: 504, statusText: 'Gateway Timeout' });
      })
    );
    return;
  }

  // Network-First for HTML navigation and static assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache if offline
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If it's a page navigation request, return cached index.html or fallback
        if (event.request.mode === 'navigate') {
          const cachedHtml = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedHtml) return cachedHtml;

          // Resilient emergency HTML response if completely offline and nothing cached
          return new Response(
            `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>appvendas - Conectar</title>
              <style>
                body { background: #0f172a; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                button { background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 16px; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>⚡ appvendas</h2>
                <p>Verifique sua conexão com a internet para carregar o aplicativo.</p>
                <button onclick="window.location.reload()">Tentar Novamente</button>
              </div>
            </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 200
            }
          );
        }

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
