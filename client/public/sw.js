// Local FM service worker
// Caches the app shell so the UI still loads when offline / on a flaky
// connection. Deliberately does NOT cache audio streams or API responses
// long-term — radio is live content, and stale station lists are unsafe.

const CACHE_NAME = "local-fm-shell-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept audio stream requests or API calls — always go to
  // the network so playback and data stay live/fresh.
  const isLikelyAudio =
    request.destination === "audio" ||
    /\.(mp3|aac|m3u8|ts)(\?|$)/i.test(url.pathname);
  const isApi = url.pathname.startsWith("/api");

  if (isLikelyAudio || isApi) {
    return; // let the browser handle it normally
  }

  // App shell / static assets: cache-first, fall back to network,
  // and update the cache in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
