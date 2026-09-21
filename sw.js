/* Service worker CRV.
   Stratégie réseau d'abord : le magasin récupère toujours la dernière version
   quand il a du réseau, et retombe sur le cache quand il n'en a pas. */
const CACHE = "crv-v31";
const COQUILLE = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // pdf.js et le relais passent en direct

  e.respondWith(
    fetch(req)
      .then(rep => {
        const copie = rep.clone();
        caches.open(CACHE).then(c => c.put(req, copie));
        return rep;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
