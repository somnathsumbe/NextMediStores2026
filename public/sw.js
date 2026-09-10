const CACHE = "medistores-static-v3";
const BASE_PATH = "/NextMediStores2026";
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.add(`${BASE_PATH}/manifest.webmanifest`)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !["http:", "https:"].includes(url.protocol) || url.pathname.startsWith(`${BASE_PATH}/api/`) || event.request.mode === "navigate") return;
  event.respondWith(fetch(event.request).then(response => { if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone())).catch(() => undefined); return response; }).catch(() => caches.match(event.request)));
});
