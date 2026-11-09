// Yuksak ta'lim — ilovani telefonda tez ochilishi uchun fayllarni saqlab qo'yadi.
// Ma'lumotlar (o'quvchilar, davomat) har doim serverdan olinadi, bu yerda saqlanmaydi.
const CACHE = "yt-v4";
const CORE = ["./", "./index.html", "./config.js", "./support.js", "./student-analytics.js", "./manifest.webmanifest",
  "./vendor/react.production.min.js", "./vendor/react-dom.production.min.js", "./vendor/qrcode.js",
  "./vendor/phosphor-fill/style.css", "./vendor/phosphor-bold/style.css", "./icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // server so'rovlariga tegmaymiz
  const fresh = req.mode === "navigate" || /\.(html|js)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (fresh) {
    // Avval internetdan (yangi versiya bo'lsa darhol), internet yo'q bo'lsa — saqlanganidan
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; }).catch(() => caches.match(req, { ignoreSearch: true })));
  } else {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })));
  }
});
