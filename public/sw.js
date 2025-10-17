const CACHE_NAME = "currency-converter-v1";
const ASSETS_TO_CACHE = ["/", "/index.html", "/src/main.tsx"];

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
                )
            )
    );
});

self.addEventListener("fetch", (event) => {
    // For network requests use network-first for API, cache-first for assets
    const req = event.request;
    if (req.url.includes("api.vatcomply.com")) {
        event.respondWith(fetch(req).catch(() => caches.match(req)));
    } else {
        event.respondWith(
            caches.match(req).then((res) => res || fetch(req).catch(() => caches.match("/")))
        );
    }
});
