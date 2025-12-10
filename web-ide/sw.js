const CACHE_NAME = "web-ide-v5";
const BASE = "";

const FILES = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/manifest.json`,
  `${BASE}/icon-192.png`,
  `${BASE}/icon-512.png`,
  `${BASE}/css/app.css`,
  `${BASE}/js/app.js`,
  `${BASE}/css/modal.css`,
  `${BASE}/css/all.min.css`,
  `${BASE}/js/beautify.min.js`,
  `${BASE}/js/beautify-css.min.js`,
  `${BASE}/js/beautify-html.min.js`,
  `${BASE}/webfonts/fa-brands-400.woff2`,
  `${BASE}/webfonts/fa-regular-400.woff2`,
  `${BASE}/webfonts/fa-solid-900.woff2`,
  `${BASE}/webfonts/fa-v4compatibility.woff2`
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) {

        // Kirim pesan ke halaman bahwa file diambil dari cache
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage("CACHE: " + req.url);
          });
       });

        return cached;
      }

      return fetch(req).catch(() => cached);
    })
  );
});
