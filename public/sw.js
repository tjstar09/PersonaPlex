// PersonaPlex PWA — app-shell cache (network-first for API, cache-first for shell)
const CACHE_NAME = "personaplex-shell-v1";
const SHELL_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache LLM / API calls — always go to network
  if (url.pathname.startsWith("/api/") || req.headers.get("accept")?.includes("text/event-stream")) {
    return;
  }

  // For navigations and same-origin shell assets: cache-first, fallback to network
  if (req.mode === "navigate" || url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            // Cache successful same-origin responses
            if (res.ok && url.origin === self.location.origin) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
