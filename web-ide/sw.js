const CACHE_NAME = "web-ide-v3";

const FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/css/app.css",
  "/js/app.js",
  "/css/modal.css",
  "/css/all.min.css",
  "/js/beautify.min.js",
  "/js/beautify-css.min.js",
  "/js/beautify-html.min.js",
  "/webfonts/fa-brands-400.woff2",
  "/webfonts/fa-regular-400.woff2",
  "/webfonts/fa-solid-900.woff2",
  "/webfonts/fa-v4compatibility.woff2"
];

// INSTALL
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() => cached);
    })
  );
});
