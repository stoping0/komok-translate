/* Komok Translate service worker.
 * Все пути относительные (от scope воркера), поэтому он работает и на
 * https://stoping0.github.io/komok-translate/, и на собственном сервере (server.js).
 * При изменении файлов оболочки увеличьте CACHE_VERSION, чтобы старый кэш удалился. */
const CACHE_VERSION = "v1";
const SHELL_CACHE = `komok-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `komok-runtime-${CACHE_VERSION}`;
const SHELL_FILES = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "install.css",
  "install.js",
  "manifest.webmanifest",
  "assets/komok-translate-icon.jpeg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "assets/apple-touch-icon.png"
];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES.map((file) => new Request(new URL(file, self.registration.scope), { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("komok-") && key !== SHELL_CACHE && key !== RUNTIME_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match(new URL("index.html", self.registration.scope));
      if (shell) return shell;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => {
    if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Шрифты Google — кэшируем, чтобы офлайн интерфейс выглядел так же.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  // Прочие внешние запросы (API перевода, GitHub) и /api/* сервера не трогаем.
  if (url.origin !== self.location.origin) return;
  const scopePath = new URL(self.registration.scope).pathname;
  if (url.pathname.startsWith(`${scopePath}api/`) || url.pathname.startsWith("/api/")) return;

  // Оболочка: сначала сеть (свежие версии), при офлайне — кэш.
  event.respondWith(networkFirst(request));
});
