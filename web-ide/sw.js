const CACHE_NAME = "web-ide-v1";
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
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(FILES))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});



