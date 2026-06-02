const CACHE_NAME = 'ig-dashboard-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/style.css',
  '/js/api.js',
  '/js/storage.js',
  '/js/metrics.js',
  '/js/ui.js',
  '/js/wizard.js',
  '/js/dashboard-main.js',
  '/js/history-store.js',
  '/js/pdf-report.js',
  '/js/supabase-client.js',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first (never serve stale API data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: { message: 'Offline' } }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
