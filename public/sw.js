// appvendas Service Worker (PWA) - Version 21 (Instant Auto-Update & Fresh Network-First Cache)
const CACHE_NAME = 'appvendas-pwa-v21';
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

// Install: precache essential shell assets and skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW] Non-fatal precache item skipped:', asset);
        }
      }
    })
  );
});

// Activate: delete ALL old caches immediately, claim clients, and broadcast update to all open windows/installed apps
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
        client.postMessage({ type: 'SW_VERSION_UPDATED', version: 'v21' });
      }
    })
  );
});

// Listen for messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
    self.skipWaiting();
  }
});

// Fetch: Network-first for ALL requests to ensure live updates on iPhone, Android and web
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore cross-origin non-http protocols
  if (!url.protocol.startsWith('http')) return;

  // Network-First for HTML navigation and JS/CSS code
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache if offline
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
