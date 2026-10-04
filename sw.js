// Service Worker（ARCHITECTURE.md 第 64 節）：讓遊戲可以安裝到主畫面、離線也能開
// 由 data/pwa.js 以 sw.js?v=版本號 註冊；版本號＝index.html 裡的 ?v=，每次發佈換版本就會裝新的 SW 並清掉舊的程式快取
// 快取策略：
//   ① 頁面（index.html、gm.html）：網路優先（cache: 'no-cache' 每次向 GitHub Pages 確認），沒網路才用手機上的那份
//      ——index.html 決定所有 JS 的版本號，絕不能先用舊的（2026-09-23 新舊檔案混用事故，第 30 節）
//   ② 帶 ?v= 的 JS：快取優先（版本號沒變內容就不會變），存在「本版程式快取」fanchen-core-版本
//   ③ 其他同網域檔案（圖片、manifest）：先給快取、背景更新（圖片可能同檔名替換，例：鎮魔塔 BOSS 圖），存在 fanchen-assets（跨版本保留）
//   不攔：影片（太大、有分段請求）、外部網域（Firebase 等）、非 GET
const VER = new URL(self.location).searchParams.get('v') || 'dev';
const CORE = 'fanchen-core-' + VER;
const ASSETS = 'fanchen-assets';

// 安裝：抓最新的 index.html，把裡面列出的 JS 全部預先存好（離線第一次開也有完整程式）
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CORE);
        const res = await fetch('./index.html', { cache: 'no-cache' });
        if (res.ok) {
            const html = await res.clone().text();
            await cache.put('./index.html', res);
            const urls = [...html.matchAll(/(?:src|href)="(data\/[^"]+\?v=[^"]+)"/g)].map(m => m[1]);
            await Promise.all(urls.map(u => cache.add(u).catch(() => {})));
            // index.html 直接引用的圖片（封面、洞府背景、頭像等約 10 張、1.9MB）存進圖片快取，第一次離線開也不缺圖；已有的不重抓
            const assets = await caches.open(ASSETS);
            const imgs = [...new Set([...html.matchAll(/(?:src|href)="(images\/[^"]+)"/g)].map(m => m[1]))];
            await Promise.all(imgs.map(async u => { if (!(await assets.match(u))) await assets.add(u).catch(() => {}); }));
        }
        await self.skipWaiting();   // index.html 一律網路優先，新 SW 立刻接手不會造成新舊混用
    })());
});

// 啟用：刪掉舊版的程式快取（圖片快取保留）
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const k of await caches.keys()) if (k.startsWith('fanchen-core-') && k !== CORE) await caches.delete(k);
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (/\.(mp4|webm|mov|m4a|mp3|ogg)$/i.test(url.pathname)) return;   // 影片、音樂（背景音樂 audio/bgm-main.m4a）不進快取：檔案大、播放器會用分段請求
    if (req.mode === 'navigate' || /\.html$/i.test(url.pathname) || url.pathname.endsWith('/')) {
        event.respondWith(networkFirst(req, url));
    } else if (url.searchParams.has('v') && /\.js$/i.test(url.pathname)) {
        event.respondWith(cacheFirst(req));
    } else {
        event.respondWith(staleWhileRevalidate(req, event));
    }
});

async function networkFirst(req, url) {
    const cache = await caches.open(CORE);
    // 首頁（/ 或 index.html，可能帶 ?reload= 之類的參數）統一存成 ./index.html
    const isIndex = url.pathname.endsWith('/') || /\/index\.html$/i.test(url.pathname);
    const key = isIndex ? './index.html' : url.pathname;
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
