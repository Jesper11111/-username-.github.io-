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
            await assets.add('images/icons/items/curAwaken-v1.png?v=1').catch(() => {});
            await Promise.all(['images/sprites/morph/flame-death-knight-v1/walk.png', 'images/sprites/morph/flame-death-knight-v1/walk-v2.png', 'images/sprites/morph/flame-death-knight-v1/attack.png', 'images/sprites/morph/flame-death-knight-v1/attack-v2.png', 'images/sprites/morph/flame-death-knight-v1/cast.png', 'images/sprites/morph/flame-death-knight-v1/hit.png', 'manifest.json', 'images/icon-192.png?v=2', 'images/cover.jpg?v=2', 'images/icon-512.png?v=2', 'images/frame-notop.jpg?v=1', 'images/frame-pc-notop.jpg?v=1', 'images/frame-pc-notop-mask.png?v=1', 'images/sprites/demon-walk.png', 'images/sprites/demon-attack.png', 'images/sprites/demon-cast.png', 'images/sprites/demon-hit.png', 'images/classes/demon.jpg', 'images/sprites/angel-walk.png', 'images/sprites/angel-attack.png', 'images/sprites/angel-cast.png', 'images/sprites/angel-hit.png', 'images/classes/angel.jpg','images/maps/ruins.jpg', 'images/maps/village.webp', 'images/maps/ash.webp', 'images/maps/darkgold.webp', 'images/maps/aden.webp', 'images/monsters/wakingDrake.png', 'images/monsters/skeleton.png', 'images/monsters/skeletonArcher.png', 'images/monsters/skeletonAxe.png', 'images/monsters/ghoul.png', 'images/monsters/spartoi.png', 'images/monsters/baphomet.png', 'images/monsters/goblin.png', 'images/monsters/orcWarrior.png', 'images/monsters/gandiOrc.png', 'images/monsters/orcxOrc.png', 'images/monsters/lizardman.png', 'images/monsters/beholder.png', 'images/monsters/floatingEye.png', 'images/monsters/castor.png', 'images/monsters/orc.png', 'images/monsters/orcArcher.png', 'images/monsters/dwarf.png', 'images/monsters/wolf.png', 'images/monsters/werewolf.png', 'images/monsters/lycan.png', 'images/monsters/drake.png', 'images/monsters/blackKnight.png', 'images/monsters/giantSpider.png', 'images/monsters/dwarfWarrior.png', 'images/monsters/forestBear.png', 'images/monsters/treant.png', 'images/monsters/elderTreant.png', 'images/monsters/zombie.png', 'images/monsters/stoneGolem.png', 'images/monsters/caveBat.png', 'images/monsters/ghast.png', 'images/monsters/darkElfScout.png', 'images/monsters/giantAnt.png', 'images/monsters/pirate.png', 'images/monsters/pirateKing.png', 'images/monsters/demon.png', 'images/monsters/pirateGunner.png', 'images/monsters/giantCrab.png', 'images/monsters/drownedSailor.png', 'images/monsters/hellhound.png', 'images/monsters/lamia.png', 'images/monsters/ivoryMage.png', 'images/monsters/ivoryGuard.png', 'images/monsters/dvLizard.png', 'images/monsters/cerberus.png', 'images/monsters/wyvernling.png', 'images/monsters/boneDragonKnight.png', 'images/monsters/wyvern.png', 'images/monsters/mummy.png', 'images/monsters/sandScorpion.png', 'images/monsters/sphinx.png', 'images/monsters/anubis.png', 'images/monsters/snowWolf.png', 'images/monsters/yeti.png', 'images/monsters/iceGolem.png', 'images/monsters/frostWitch.png', 'images/monsters/salamander.png', 'images/monsters/fireSpirit.png', 'images/monsters/lavaGolem.png', 'images/monsters/flameKnight.png', 'images/monsters/ifrit.png', 'images/monsters/ancientGiant.png', 'images/monsters/harpy.png', 'images/monsters/forgottenKnight.png', 'images/monsters/chimera.png', 'images/monsters/giantSkeleton.png', 'images/monsters/tombGuardian.png', 'images/monsters/necromancer.png', 'images/monsters/boneDragon.png', 'images/monsters/osiris.png', 'images/monsters/iceGiantKing.png', 'images/monsters/forgottenKing.png', 'images/monsters/giantKingSpirit.png', 'images/monsters/antharas.png', 'images/monsters/fafurion.png', 'images/monsters/lindvior.png', 'images/sprites/magicfighter-walk.png', 'images/sprites/magicfighter-attack.png', 'images/sprites/magicfighter-cast.png', 'images/sprites/magicfighter-hit.png', 'images/classes/magicfighter.jpg', 'images/sprites/paladin-walk.png', 'images/sprites/paladin-attack.png', 'images/sprites/paladin-cast.png', 'images/sprites/paladin-hit.png', 'images/classes/paladin.jpg', 'images/sprites/gunner-walk.png', 'images/sprites/gunner-attack.png', 'images/sprites/gunner-cast.png', 'images/sprites/gunner-hit.png', 'images/classes/gunner.jpg', 'images/sprites/elf-walk.png', 'images/sprites/elf-attack.png', 'images/sprites/elf-cast.png', 'images/sprites/elf-hit.png', 'images/classes/elf.jpg', 'images/sprites/darkelf-walk.png', 'images/sprites/darkelf-attack.png', 'images/sprites/darkelf-cast.png', 'images/sprites/darkelf-hit.png', 'images/classes/darkelf.jpg', 'images/sprites/shura-walk.png', 'images/sprites/shura-attack.png', 'images/sprites/shura-cast.png', 'images/sprites/shura-hit.png', 'images/classes/shura.jpg', 'images/sprites/knight-walk.png', 'images/sprites/knight-attack.png', 'images/sprites/knight-cast.png', 'images/sprites/knight-hit.png', 'images/classes/knight.jpg', 'images/sprites/royal-walk.png', 'images/sprites/royal-attack.png', 'images/sprites/royal-cast.png', 'images/sprites/royal-hit.png', 'images/classes/royal.jpg', 'images/sprites/mage-walk.png', 'images/sprites/mage-attack.png', 'images/sprites/mage-cast.png', 'images/sprites/mage-hit.png', 'images/classes/mage.jpg', 'images/sprites/warrior-walk.png', 'images/sprites/warrior-attack.png', 'images/sprites/warrior-cast.png', 'images/sprites/warrior-hit.png', 'images/classes/warrior.jpg', 'images/classes/all.jpg?v=2', 'images/classes/stage/demon.webp?v=1', 'images/classes/stage/warrior.webp?v=1', 'images/classes/stage/shura.webp?v=1', 'images/classes/stage/angel.webp?v=1', 'images/classes/stage/paladin.webp?v=1', 'images/classes/stage/elf.webp?v=1', 'images/classes/stage/gunner.webp?v=1', 'images/classes/stage/magicfighter.webp?v=1', 'images/classes/stage/darkelf.webp?v=1', 'images/classes/stage/royal.webp?v=1', 'images/classes/stage/knight.webp?v=1', 'images/classes/stage/mage.webp?v=1', 'images/sprites/morph/wolf-ranger-v1/walk.png', 'images/sprites/morph/wolf-ranger-v1/attack.png', 'images/sprites/morph/wolf-ranger-v1/cast.png', 'images/sprites/morph/wolf-ranger-v1/hit.png', 'images/sprites/morph/moon-ranger-v1/walk.png', 'images/sprites/morph/moon-ranger-v1/attack-v2.png', 'images/sprites/morph/moon-ranger-v1/cast.png', 'images/sprites/morph/moon-ranger-v1/hit.png', 'images/sprites/morph/hellfire-archer-v1/walk.png', 'images/sprites/morph/hellfire-archer-v1/attack-v2.png', 'images/sprites/morph/hellfire-archer-v1/cast.png', 'images/sprites/morph/hellfire-archer-v1/hit.png', 'images/sprites/morph/sky-valkyrie-v2/walk.png', 'images/sprites/morph/sky-valkyrie-v2/attack.png', 'images/sprites/morph/sky-valkyrie-v2/cast.png', 'images/sprites/morph/sky-valkyrie-v2/hit.png', 'images/sprites/morph/dwarf-gunner-v1/walk.png', 'images/sprites/morph/dwarf-gunner-v1/attack.png', 'images/sprites/morph/dwarf-gunner-v1/cast.png', 'images/sprites/morph/dwarf-gunner-v1/hit.png', 'images/monsters/venomQueen.png', 'images/icons/items/spiderVenom-v1.png', 'images/icons/items/soul_spiderVenom-v1.png', 'images/vfx/venom-burst-v1.png', 'images/sprites/morph/silent-cave-assassin-v1/walk.png', 'images/sprites/morph/silent-cave-assassin-v1/attack.png', 'images/sprites/morph/silent-cave-assassin-v1/cast.png', 'images/sprites/morph/silent-cave-assassin-v1/hit.png', 'images/sprites/morph/brudika-shadow-v1/walk.png', 'images/sprites/morph/brudika-shadow-v1/attack.png', 'images/sprites/morph/brudika-shadow-v1/cast.png', 'images/sprites/morph/brudika-shadow-v1/hit.png', 'images/sprites/morph/frost-nether-emperor-v1/walk.png', 'images/sprites/morph/frost-nether-emperor-v1/attack.png', 'images/sprites/morph/frost-nether-emperor-v1/cast.png', 'images/sprites/morph/frost-nether-emperor-v1/hit.png', 'images/sprites/morph/infernal-thunder-emperor-v1/walk.png', 'images/sprites/morph/infernal-thunder-emperor-v1/attack.png', 'images/sprites/morph/infernal-thunder-emperor-v1/cast.png', 'images/sprites/morph/infernal-thunder-emperor-v1/hit.png', 'images/sprites/morph/rift-dragon-v1/walk.png', 'images/sprites/morph/rift-dragon-v1/attack.png', 'images/sprites/morph/rift-dragon-v1/cast.png', 'images/sprites/morph/rift-dragon-v1/hit.png'].map(u => assets.add(u).catch(() => {})));
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
    // 背景音樂（<audio> 串流用 Range 分段要，回 206 不能放進快取）：直接走網路，不經過 SW
    if (req.headers.has('range') || url.pathname.includes('/music/')) return;
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
