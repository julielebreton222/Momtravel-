// The app's own files (code, styles, icons) come straight from the cache and refresh in the
// background, so the app opens instantly. Lessons always try the network first, so a new story
// shows up as soon as it is published; the cached copy is the fallback when offline.
const CACHE = 'cartas-v6';
const SHELL = ['./', 'index.html', 'styles.css', 'scene.js', 'tour.js', 'app.js', 'icon.svg', 'manifest.webmanifest', 'config.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Audio uses range requests; let the browser fetch it directly.
  if (/\.(mp3|m4a)$/.test(url.pathname)) return;

  if (url.pathname.includes('/lessons/')) {
    e.respondWith(fetch(req).then((res) => save(req, res)).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((cached) => {
    const fresh = fetch(req).then((res) => save(req, res));
    if (cached) {
      e.waitUntil(fresh.catch(() => {}));
      return cached;
    }
    return fresh;
  }));
});
