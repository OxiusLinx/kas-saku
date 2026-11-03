// Service worker Kas Saku: membuat aplikasi tetap bisa dibuka tanpa internet.
// Naikkan VERSION setiap kali file aplikasi diubah agar HP mengambil versi baru.
const VERSION = "kas-saku-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png"
];
const FONTS = "kas-saku-fonts";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Font Google: simpan setelah pertama kali dimuat.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONTS).then(async cache => {
        const hit = await cache.match(req);
        const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Halaman utama: coba internet dulu supaya pembaruan masuk, kalau offline pakai simpanan.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // File lain (ikon, manifest): pakai simpanan dulu.
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
