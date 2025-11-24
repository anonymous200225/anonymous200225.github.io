/*
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.map(key => {
          if (key !== "demo-cache") {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("demo-cache").then(c => 
      c.addAll([
        "/",
        "/index.html"
      ])
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
*/
