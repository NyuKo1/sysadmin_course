// Офлайн-режим: сохраняем весь сайт на устройство при первом заходе.
// При добавлении новых страниц допишите их в FILES и поднимите VERSION.
const VERSION = "v3";
const CACHE = "pamyatvil-" + VERSION;

const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/css/style.css",
  "./assets/js/pixel.js",
  "./assets/js/course.js",
  "./assets/js/forms.js",
  "./assets/js/app.js",
  "./assets/js/lesson.js",
  "./assets/js/games/engine.js",
  "./assets/js/games/types.js",
  "./assets/js/content/lesson02.js",
  "./assets/js/content/lesson03.js",
  "./assets/js/content/lesson04.js",
  "./assets/gif/bits.gif",
  "./assets/gif/idle.gif",
  "./assets/gif/laptop.gif",
  "./assets/gif/party.gif",
  "./assets/gif/sad.gif",
  "./assets/gif/think.gif",
  "./assets/gif/wave.gif",
  "./lessons/02.html",
  "./lessons/03.html",
  "./lessons/04.html",
  "./teacher/index.html",
  "./teacher/02.html",
  "./teacher/03.html",
  "./teacher/04.html",
];

async function cacheAll() {
  const cache = await caches.open(CACHE);
  await cache.addAll(FILES);
}

self.addEventListener("install", (e) => {
  e.waitUntil(cacheAll().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала из кэша (урок работает без сети), в фоне обновляем с сервера.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "cache-all") {
    cacheAll().then(() => {
      self.clients.matchAll().then((clients) =>
        clients.forEach((c) => c.postMessage({ type: "cached" }))
      );
    });
  }
});
