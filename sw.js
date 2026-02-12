/**
 * ZenReader Service Worker
 *
 * Cache Strategy:
 * - Network First: Always try network, fall back to cache on failure
 * - API calls: Never cached (always fresh data)
 * - Static assets: Cached after first successful fetch
 *
 * DEPLOYMENT CHECKLIST:
 * 1. Update CACHE_VERSION below before each deployment
 * 2. Old caches are automatically deleted on activation
 * 3. Users will get fresh UI after browser refreshes
 */

// Cache version - IMPORTANT: Increment this on every deployment to force cache refresh
// Format: zenreader-v{major}.{minor}.{timestamp}
// Update timestamp or increment version when deploying to ensure users get latest UI
const CACHE_VERSION = 'v1.0.20260131'; // Last updated: 2026-01-31
const CACHE_NAME = `zenreader-${CACHE_VERSION}`;

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. Skip caching for API calls (Always Network)
  if (event.request.url.includes('/api/') || event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // 2. Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // 3. Network First Strategy
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith('http')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});