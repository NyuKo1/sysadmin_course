// Офлайн-режим: сохраняем весь сайт на устройство при первом заходе.
// При добавлении новых страниц допишите их в FILES и поднимите VERSION.
const VERSION = "v5";
const CACHE = "pamyatvil-" + VERSION;

const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/css/style.css",
  "./assets/js/app.js",
  "./assets/js/course.js",
  "./assets/js/forms.js",
  "./assets/js/lesson.js",
  "./assets/js/pixel.js",
  "./assets/js/story.js",
  "./assets/js/games/engine.js",
  "./assets/js/games/types.js",
  "./assets/js/content/lesson02.js",
  "./assets/js/content/lesson03.js",
  "./assets/js/content/lesson04.js",
  "./assets/js/content/story02.js",
  "./assets/js/content/story03.js",
  "./assets/js/content/story04.js",
  "./assets/gif/bit-angry.gif",
  "./assets/gif/bit-cool.gif",
  "./assets/gif/bit-dance.gif",
  "./assets/gif/bit-eat.gif",
  "./assets/gif/bit-facepalm.gif",
  "./assets/gif/bit-overheat.gif",
  "./assets/gif/bit-run.gif",
  "./assets/gif/bit-sleep.gif",
  "./assets/gif/bits.gif",
  "./assets/gif/glitch-glitch.gif",
  "./assets/gif/glitch-hurt.gif",
  "./assets/gif/glitch-idle.gif",
  "./assets/gif/glitch-laugh.gif",
  "./assets/gif/idle.gif",
  "./assets/gif/laptop.gif",
  "./assets/gif/mega-idle.gif",
  "./assets/gif/mega-story.gif",
  "./assets/gif/meme-10-types.gif",
  "./assets/gif/meme-47-tabs.gif",
  "./assets/gif/meme-dead-pixel.gif",
  "./assets/gif/meme-nibble-1023.gif",
  "./assets/gif/meme-ram-monster.gif",
  "./assets/gif/meme-router.gif",
  "./assets/gif/meme-this-is-fine.gif",
  "./assets/gif/meme-update-99.gif",
  "./assets/gif/meme-usb.gif",
  "./assets/gif/nibble-idle.gif",
  "./assets/gif/nibble-tease.gif",
  "./assets/gif/party.gif",
  "./assets/gif/sad.gif",
  "./assets/gif/think.gif",
  "./assets/gif/wave.gif",
  "./lessons/02.html",
  "./lessons/03.html",
  "./lessons/04.html",
  "./teacher/02.html",
  "./teacher/03.html",
  "./teacher/04.html",
  "./teacher/index.html",
  "./tools/password.html",
  "./tools/story-preview.html",
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

// Сначала пробуем сеть, чтобы после обновления сайта HTML, CSS и JS были одной версии.
// Нет сети или она висит дольше 3 секунд: отдаём сохранённую копию, урок работает офлайн.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req, { cache: "no-cache" }).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      });
      if (!cached) return fresh;
      const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), 3000));
      return Promise.race([fresh.catch(() => cached), timeout]);
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
