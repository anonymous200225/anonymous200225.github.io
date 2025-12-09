const CACHE_NAME = "web-ide-v11";
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

// INSTALL: cache semua file
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

// ACTIVATE: hapus cache lama
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH: cache-first fallback-to-network
self.addEventListener("fetch", e => {
  const req = e.request;

  // Abaikan permintaan selain GET
  if (req.method !== "GET") return;

  e.respondWith(
    caches.match(req).then(cached => {
      // Jika ada di cache → pakai cache
      if (cached) return cached;

      // Jika tidak ada → fetch jaringan
      return fetch(req).catch(() => cached);
    })
  );
});
