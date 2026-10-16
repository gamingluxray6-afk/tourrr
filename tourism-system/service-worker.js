const CACHE = 'tourgo-v58';
const SHELL = ['index.html', 'assets/css/styles.css?v=49', 'assets/js/script.js?v=54', 'assets/js/qrgen.js', 'manifest.json', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function pageNetworkFirst(req) {
    const cache = await caches.open(CACHE);
    try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res.ok && res.type === 'basic') cache.put('index.html', res.clone());
        return res;
    } catch (err) {
        return (await cache.match('index.html')) || Response.error();
    }
}
async function filesCacheFirst(req) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
}

self.addEventListener('fetch', e => {
    const r = e.request;
    if (r.method !== 'GET') return;
    const u = new URL(r.url);
    if (u.origin !== location.origin || u.pathname.endsWith('.php')) return;
    if (r.mode === 'navigate') { e.respondWith(pageNetworkFirst(r)); return; }
    e.respondWith(filesCacheFirst(r).catch(() => Response.error()));
});
