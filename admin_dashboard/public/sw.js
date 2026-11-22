// PointagePro Enterprise • Service Worker PWA & OTA Auto-Update Engine
const CACHE_VERSION = 'pointagepro-ota-v2.4.0';
const STATIC_ASSETS = [
  '/',
  '/gerant',
  '/maquette-gerant',
  '/manifest.json',
  '/barouba-group-logo.png'
];

self.addEventListener('install', (event) => {
  // Activation immédiate de la nouvelle version sans bloquer sur les anciens onglets
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA cache addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // Prise de contrôle immédiate de tous les clients ouverts
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge des anciens caches obsolètes
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_VERSION) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

// Écoute des ordres de mise à jour envoyés depuis l'application gérant
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    });
  }
});

self.addEventListener('fetch', (event) => {
  // Pour les requêtes API et Supabase, toujours aller chercher sur le réseau direct
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') || 
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/auth')
  ) {
    return; // Pass through straight to network
  }

  // Network-first pour les pages, avec fallback sur cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
