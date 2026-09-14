/**
 * Service Worker Suivi CA Narbonne
 *
 * Version : 20260702-1400 (à bump à chaque déploiement pour forcer les MAJ)
 *
 * Stratégie : network-first / pas de cache agressif.
 *   - On ne cache PAS index.html : chaque chargement va sur GitHub Pages
 *     → la dernière version est toujours servie, plus de piège de PWA figée
 *   - Le SW existe juste pour rendre l'app installable (critère PWA)
 *   - Au premier chargement, on cache les icônes et manifest (fixes)
 *
 * Le bouton "MAJ ↻" dans l'app désinstalle ce SW en cas de besoin.
 */

const CACHE_VERSION = 'suivi-ca-v20260702-1400';
const STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Installation : mise en cache des assets statiques (icônes, manifest)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => { /* ignore : le SW s'installe quand même */ })
  );
});

// Activation : suppression des anciens caches pour éviter d'accumuler
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch : network-first pour tout, fallback cache pour les statiques
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignorer les requêtes non-GET (POST vers l'API Apps Script)
  if (req.method !== 'GET') return;

  // Ignorer les requêtes cross-origin (API Google, etc.)
  if (!req.url.startsWith(self.location.origin)) return;

  // Network-first : on va chercher la version fraîche à chaque fois
  event.respondWith(
    fetch(req)
      .then(resp => {
        // Cacher les statiques au passage (icônes, manifest)
        const url = new URL(req.url);
        const isStatic = STATIC_ASSETS.some(a => url.pathname.endsWith(a.replace('./', '')));
        if (isStatic && resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
        }
        return resp;
      })
      .catch(() => {
        // Réseau indisponible : essayer le cache
        return caches.match(req);
      })
  );
});
