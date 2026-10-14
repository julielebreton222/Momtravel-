// Offline support without stale code:
// - The page itself (index.html) always comes from the network first, so a new version is seen right away.
// - Its scripts and styles carry a version number (?v=…) in index.html, so a new page always loads
//   matching new code; those versioned files can then safely come straight from the cache.
// - Lessons always try the network first, so new stories appear as soon as they are published.
// When changing the app: bump VERSION here and the ?v= numbers in index.html together.
const VERSION = '9';
const CACHE = `cartas-v${VERSION}`;
const ASSETS = ['styles.css', 'i18n.js', 'scene.js', 'tour.js', 'quiz.js', 'app.js'].map((f) => `${f}?v=${VERSION}`);
const SHELL = ['./', 'index.html', 'icon.svg', 'manifest.webmanifest', 'config.json', ...ASSETS];

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
const networkFirst = (req) => fetch(req).then((res) => save(req, res))
  .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./')));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Audio uses range requests; let the browser fetch it directly.
  if (/\.(mp3|m4a)$/.test(url.pathname)) return;

  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.includes('/lessons/') || url.pathname.endsWith('config.json')) {
    e.respondWith(networkFirst(req));
    return;
  }
  // Versioned code and images: cache first (exact URL, so an old version never answers for a new one).
  e.respondWith(caches.match(req).then((cached) => cached || fetch(req).then((res) => save(req, res))));
});
