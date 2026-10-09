// 屠龍勇者 Service Worker（ARCHITECTURE.md 第 12 節）：可安裝到主畫面、離線也能開
// 由 data/pwa.js 以 sw.js?v=版本號 註冊，範圍只有 屠龍勇者/ 資料夾（比修仙的根目錄 SW 更精確，所以由這支接手）
// 快取名稱一律 dragon- 開頭：同網域的 caches 是共用的，修仙的 SW 只會清 fanchen- 開頭的快取，兩邊互不影響
// 快取策略：
//   ① 頁面：網路優先，沒網路才用快取（index.html 決定所有 JS 版本號，不能先用舊的）
//   ② 帶 ?v= 的 JS：快取優先（版本號沒變內容就不變），存在 dragon-core-版本
//   ③ 其他（圖示、manifest）：先給快取、背景更新，存在 dragon-assets
const VER = new URL(self.location).searchParams.get('v') || 'dev';
const CORE = 'dragon-core-' + VER;
const ASSETS = 'dragon-assets';
const INDEX_URL = new URL('./index.html', self.location).href;

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CORE);
        const res = await fetch(INDEX_URL, { cache: 'no-cache' });
        if (res.ok) {
            const html = await res.clone().text();
            await cache.put(INDEX_URL, res);
            const urls = [...html.matchAll(/src="(data\/[^"]+\?v=[^"]+)"/g)].map(m => new URL(m[1], self.location).href);
            await Promise.all(urls.map(u => cache.add(u).catch(() => {})));
            const assets = await caches.open(ASSETS);
            await Promise.all(['manifest.json', 'images/icon-192.png', 'images/icon-512.png', 'images/frame.jpg?v=1', 'images/frame-pc-slim.jpg?v=1', 'images/frame-pc-slim-mask.png?v=1', 'images/sprites/demon-walk.png', 'images/sprites/demon-attack.png', 'images/sprites/demon-cast.png', 'images/sprites/demon-hit.png', 'images/classes/demon.jpg', 'images/sprites/angel-walk.png', 'images/sprites/angel-attack.png', 'images/sprites/angel-cast.png', 'images/sprites/angel-hit.png', 'images/classes/angel.jpg','images/maps/ruins.jpg', 'images/maps/village.webp', 'images/sprites/magicfighter-walk.png', 'images/sprites/magicfighter-attack.png', 'images/sprites/magicfighter-cast.png', 'images/sprites/magicfighter-hit.png', 'images/classes/magicfighter.jpg', 'images/sprites/paladin-walk.png', 'images/sprites/paladin-attack.png', 'images/sprites/paladin-cast.png', 'images/sprites/paladin-hit.png', 'images/classes/paladin.jpg', 'images/sprites/gunner-walk.png', 'images/sprites/gunner-attack.png', 'images/sprites/gunner-cast.png', 'images/sprites/gunner-hit.png', 'images/classes/gunner.jpg'].map(u => assets.add(u).catch(() => {})));
        }
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const k of await caches.keys()) if (k.startsWith('dragon-core-') && k !== CORE) await caches.delete(k);
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (req.mode === 'navigate' || /\.html$/i.test(url.pathname) || url.pathname.endsWith('/')) {
        event.respondWith(networkFirst(url));
    } else if (url.searchParams.has('v') && /\.js$/i.test(url.pathname)) {
        event.respondWith(cacheFirst(req));
    } else {
        event.respondWith(staleWhileRevalidate(req, event));
    }
});

async function networkFirst(url) {
    const cache = await caches.open(CORE);
    // 本資料夾的首頁（/ 或 index.html，可能帶參數）統一存成完整網址的 index.html
    const isIndex = url.pathname.endsWith('/') || /\/index\.html$/i.test(url.pathname);
    const key = isIndex ? INDEX_URL : url.origin + url.pathname;
    try {
        const res = await fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' });
        if (res.ok) cache.put(key, res.clone());
        return res;
    } catch (e) {
        const hit = await cache.match(key) || await caches.match(key, { ignoreSearch: true });
        if (hit) return hit;
        throw e;
    }
}

async function cacheFirst(req) {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) (await caches.open(CORE)).put(req, res.clone());
    return res;
}

async function staleWhileRevalidate(req, event) {
    const cache = await caches.open(ASSETS);
    const hit = await cache.match(req);
    const update = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    if (hit) { event.waitUntil(update.catch(() => {})); return hit; }
    return update;
}
