// 屠龍勇者：中間的即時地圖畫面（ARCHITECTURE.md 第 17 節）（依賴 player、combat、monsters、zones、ui-panels）
// 俯視 RPG 地圖：角色在格子地圖上「上下左右」一格一格走，自己去找怪；怪物在地圖上遊走。
// 只是「看得到的那一層」：戰鬥邏輯仍由 combat.js 決定（尋怪時間、命中、傷害都不變，離線收益也不受影響）。
//   尋怪中 → 角色用 BFS 走向最近的怪
//   開打（hunt.mobs）→ 每隻圍上來的戰鬥怪都綁定一隻地圖怪（m.inst）；目標（hunt.mon）＝scene.engaged，角色走到牠旁邊，
//   其他圍上來的怪自己走到角色旁邊；每隻都顯示血條與傷害數字，範圍技能在所有圍上來的怪身上爆特效
//   傷害數字：偵測怪物／玩家 HP 變化；MISS、爆擊、升級、掉寶：讀遊戲訊息的分類
//   村莊：畫建築，點一下打開對應設施
const TILE = 32;
const MAP_W = 28, MAP_H = 28;     // 格子地圖的大小；背景圖地圖用 SCENE_BGS 的 w/h（scene.mw/mh）
const MAP_MON_COUNT = 10;        // 怪群最多 6 隻，地圖上多放幾隻讓牠們有得綁
const PLAYER_SPEED = 5.5;         // 每秒幾格
const MON_WANDER_MS = [900, 2600];

const SCENE_THEMES = {
    town:    { a: '#4b4033', b: '#463b2f', wall: '#2a231b', obst: ['🌳', '🪵', '🌳'], dens: 0.035, bg: 'village' },
    field:   { a: '#3c5a2a', b: '#365327', wall: '#1f3318', obst: ['🌲', '🌳', '🪨', '🌲'], dens: 0.09, bg: 'ruins' },
    dungeon: { a: '#2f2c2a', b: '#2a2725', wall: '#151312', obst: ['🪨', '🕯️', '⛓️', '🪨'], dens: 0.08 },
    cave:    { a: '#262c33', b: '#22282e', wall: '#0f1316', obst: ['🪨', '🕸️', '💎', '🪨'], dens: 0.09 },
    tomb:    { a: '#2e3330', b: '#292e2b', wall: '#121513', obst: ['🪦', '⚰️', '🦴', '🕯️'], dens: 0.08 },
    ivory:   { a: '#3b3644', b: '#35303e', wall: '#1c1922', obst: ['🗿', '🕯️', '📚', '🪨'], dens: 0.07 },
    pyramid: { a: '#7a6441', b: '#715c3b', wall: '#4a3a24', obst: ['🌵', '🏺', '🪨', '🌵'], dens: 0.07 },
    tower:   { a: '#2b2339', b: '#271f34', wall: '#130f1c', obst: ['🕯️', '🪨', '💀', '🕯️'], dens: 0.07 },
    dragon:  { a: '#3b1b14', b: '#351812', wall: '#1a0a07', obst: ['🔥', '🪨', '🦴', '🔥'], dens: 0.06 },
};
// 背景圖地圖（野外）：整張圖鋪成 w×h 格；block 是擋路的牆（格子座標 [x0,y0,x1,y1] 含頭尾），start 角色出生格
// ruins.jpg 1500×837，每格約 37.5×38 原圖像素
const SCENE_BGS = {
    ruins: {
        src: 'images/maps/ruins.jpg', w: 40, h: 22, start: [20, 11],
        block: [
            [7, 8, 11, 11], [12, 10, 16, 13], [13, 4, 17, 7], [19, 3, 21, 4], [20, 5, 26, 8], [25, 1, 30, 8],
            [25, 9, 31, 12], [30, 13, 34, 16], [20, 13, 23, 18], [19, 17, 22, 20], [24, 17, 26, 20], [36, 10, 38, 15],
        ],
    },
    // 村莊：使用者提供的中世紀村莊俯視圖（1755×896，中間石板廣場＋噴泉），鋪成 30×15 格；使用者要求不放 NPC，
    // 設施從「村莊設施」按鈕或底部格子打開（TOWN_NPCS／TOWN_HOUSES 只在沒有背景圖時使用）
    // walk：可以走的範圍（其他格子都擋住）＝廣場、往南的泥土路、石橋、教堂旁北路、往港口的東側草地；
    // block 再擋掉 walk 裡面的噴泉、市集攤位、推車
    village: {
        src: 'images/maps/village.webp', w: 30, h: 15, start: [13, 10],
        walk: [[8, 6, 19, 10], [10, 10, 20, 11], [16, 12, 21, 13], [12, 2, 14, 5], [19, 7, 22, 9]],
        block: [[12, 7, 14, 8], [8, 8, 10, 9], [15, 6, 17, 6], [17, 7, 18, 7], [17, 9, 18, 9]],
    },};
// 村莊 NPC：站在廣場上，頭上名牌顯示「名字＋功能」，點 NPC 或名牌打開設施；names 依村莊 id
const TOWN_NPCS = [
    { role: '商店',   icon: '👩‍💼', x: 12, y: 12, act: () => openTownSub('shop'),
      names: { talking: '艾琳', gludio: '雷文', giran: '薩拉', aden: '塞琳' } },
    { role: '回收',   icon: '🧔', x: 16, y: 12, act: () => openTownSub('sell'),
      names: { talking: '巴克', gludio: '菲茲', giran: '馬可', aden: '海克' } },
    { role: '旅館',   icon: '👩‍🍳', x: 18, y: 13, act: () => openTownSub('inn'),
      names: { talking: '莫莉', gludio: '蘿絲', giran: '貝拉', aden: '艾瑪' } },
    { role: '倉庫',   icon: '👷', x: 10, y: 13, act: () => openTownSub('storage'), prop: '📦',
      names: { talking: '杜克', gludio: '柏恩', giran: '歐文', aden: '葛雷' } },
    { role: '鍛造',   icon: '🧑‍🏭', x: 17, y: 15, act: () => openTownSub('craft'), prop: '⚒️',
      names: { talking: '葛蘭', gludio: '托爾', giran: '布洛克', aden: '巴恩' } },
    { role: '傳送師', icon: '🧙‍♀️', x: 14, y: 16, act: () => switchTab('map'),
      names: { talking: '露娜', gludio: '希雅', giran: '伊芙', aden: '星語者' } },
    { role: '任務',   icon: '🧓', x: 11, y: 15, act: () => switchTab('quest'),
      names: { talking: '賽恩長老', gludio: '亞瑟隊長', giran: '諾亞祭司', aden: '騎士團長' } },
];
// 村莊房屋（格子座標 x, y, 寬, 高；整塊擋路），畫成石牆＋石板屋頂
const TOWN_HOUSES = [[5, 9, 4, 3], [9, 6, 4, 3], [16, 6, 4, 3], [20, 9, 4, 3], [5, 17, 4, 3], [20, 17, 4, 3], [12, 20, 5, 3]];

let scene = null;   // { key, grid, theme, pl:{x,y,rx,ry,path,dir,lunge}, mons:[], engaged, floats:[], ... }
let sceneRaf = 0;

// 人物模型圖片快取（classes.js 的 sprite.src）；還沒載入完成時先用職業圖示
const spriteCache = {};
function spriteImage(src) {
    let img = spriteCache[src];
    if (!img) { img = spriteCache[src] = new Image(); img.src = src + '?v=' + GAME_VERSION; }
    return img.complete && img.naturalWidth ? img : null;
}

function openTownSub(sub) { townSub = sub; switchTab('town'); }

// ───────── 地圖產生 ─────────
function seededRand(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

function sceneKey() {
    return player.loc.type === 'town' ? 'town:' + player.loc.id : `zone:${player.loc.id}:${player.loc.floor || 0}`;
}

function themeFor() {
    if (player.loc.type === 'town') return SCENE_THEMES.town;
    const z = currentZone();
    if (z.type === 'dragon') return SCENE_THEMES.dragon;
    if (z.type === 'tower') return SCENE_THEMES.tower;
    if (z.type === 'field') return SCENE_THEMES.field;
    return SCENE_THEMES[z.scene] || SCENE_THEMES.dungeon;
}

function buildScene() {
    const key = sceneKey(), theme = themeFor(), rnd = seededRand(hashStr(key));
    const sp = CLASSES[player.cls].sprite;   // 先載入這個職業所有動作圖
    if (sp) ['walk', 'attack', 'cast', 'hit'].forEach(a => { if (sp[a]) spriteImage(sp[a].src); });
    const bg = theme.bg ? SCENE_BGS[theme.bg] : null;
    if (bg) spriteImage(bg.src);
    const mw = bg ? bg.w : MAP_W, mh = bg ? bg.h : MAP_H;
    const cx = bg ? bg.start[0] : Math.floor(mw / 2), cy = bg ? bg.start[1] : Math.floor(mh / 2);
    const grid = [];   // 0 地板、1 牆、2 障礙物（畫 emoji）、3 建築
    for (let y = 0; y < mh; y++) {
        grid.push([]);
        for (let x = 0; x < mw; x++) {
            const edge = x === 0 || y === 0 || x === mw - 1 || y === mh - 1;
            const nearCenter = Math.abs(x - cx) < 3 && Math.abs(y - cy) < 3;
            grid[y].push(edge ? 1 : (!bg && !nearCenter && rnd() < theme.dens ? 2 : 0));
        }
    }
    if (bg && bg.walk) for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        if (!bg.walk.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)) grid[y][x] = 1;
    }
    if (bg) for (const [x0, y0, x1, y1] of bg.block) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
    const deco = {};   // 障礙物用哪個 emoji
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (grid[y][x] === 2) deco[x + ',' + y] = theme.obst[Math.floor(rnd() * theme.obst.length)];
    const shade = [];  // 地板深淺
    for (let y = 0; y < mh; y++) { shade.push([]); for (let x = 0; x < mw; x++) shade[y].push(rnd() < 0.5); }
    if (player.loc.type === 'town' && !bg) {   // 沒有背景圖時才用畫出來的房屋與 NPC
        for (const b of TOWN_NPCS) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (grid[b.y + dy][b.x + dx] === 2) grid[b.y + dy][b.x + dx] = 0; grid[b.y][b.x] = 3; }
        for (const [hx, hy, hw, hh] of TOWN_HOUSES) for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) grid[y][x] = 4;
        // 廣場（中心 9 格內）不放樹
        for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (grid[y][x] === 2 && Math.hypot(x - cx, y - cy) < 9) grid[y][x] = 0;
    }
    const z = player.loc.type === 'zone' ? currentZone() : null;
    scene = {
        key, theme, grid, deco, shade, bg, mw, mh, tint: z && z.tint,
        pl: { x: cx, y: cy, rx: cx, ry: cy, path: [], dir: 'down', lunge: null, idleCd: 1500 },
        mons: [], engaged: null, floats: [], effects: [],
        lastSeq: logSeq, lastPlayerHp: player.hp, critNext: false, spawnCd: 0, w: 0, h: 0,
        cam: { x: cx * TILE, y: cy * TILE }, moveMark: null,
    };
}

function freeTile(x, y) {
    if (!scene || x < 0 || y < 0 || x >= scene.mw || y >= scene.mh) return false;
    if (scene.grid[y][x] !== 0) return false;
    if (scene.pl.x === x && scene.pl.y === y) return false;
    return !scene.mons.some(m => m.x === x && m.y === y && !m.dead);
}

// BFS：從 (sx,sy) 走到任一目標格旁邊（上下左右相鄰）的最短路徑
function findPath(sx, sy, tx, ty, adjacent) {
    const mw = scene.mw, key = (x, y) => y * mw + x;
    const prev = new Map([[key(sx, sy), -1]]);
    const q = [[sx, sy]];
    const goal = (x, y) => adjacent ? Math.abs(x - tx) + Math.abs(y - ty) === 1 : (x === tx && y === ty);
    while (q.length) {
        const [x, y] = q.shift();
        if (goal(x, y)) {
            const path = [];
            let k = key(x, y);
            while (k !== key(sx, sy)) { path.unshift([k % mw, Math.floor(k / mw)]); k = prev.get(k); }
            return path;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, nk = key(nx, ny);
            if (prev.has(nk) || !freeTileFor(nx, ny, tx, ty)) continue;
            prev.set(nk, key(x, y));
            q.push([nx, ny]);
            if (prev.size > 1000) return [];
        }
    }
    return [];
}
function freeTileFor(x, y) {
    if (x < 0 || y < 0 || x >= scene.mw || y >= scene.mh) return false;
    return scene.grid[y][x] === 0 && !scene.mons.some(m => m.x === x && m.y === y && !m.dead);
}

// 地圖上看得到的怪（外觀），依地點與等級挑
function visualMonster() {
    const z = currentZone();
    if (!z || z.type === 'dragon') return null;
    if (z.type === 'tower') {
        const g = Math.min(9, Math.floor((player.loc.floor - 1) / 10));
        return { icon: TOWER_ICONS[g], name: TOWER_THEMES[g][0], mid: null };
    }
    let pool = z.mons.filter(id => MONSTERS[id].lv <= player.lv + 3);
    if (!pool.length) pool = [z.mons[0]];
    const id = pool[rand(0, pool.length - 1)];
    return { icon: MONSTERS[id].icon, name: MONSTERS[id].name, mid: id };
}

function spawnMapMon(near) {
    const look = visualMonster();
    if (!look) return null;
    for (let tries = 0; tries < 40; tries++) {
        const r = near ? rand(2, 4) : rand(3, 9);
        const x = scene.pl.x + rand(-r, r), y = scene.pl.y + rand(-r, r);
        if (freeTile(x, y) && Math.abs(x - scene.pl.x) + Math.abs(y - scene.pl.y) >= 2) {
            const m = { x, y, rx: x, ry: y, icon: look.icon, name: look.name, mid: look.mid, inst: null, cd: rand(...MON_WANDER_MS), dying: 0, lunge: null };
            scene.mons.push(m);
            return m;
        }
    }
    return null;
}

// ───────── 每幀更新 ─────────
function sceneUpdate(dt) {
    const pl = scene.pl, inZone = player.loc.type === 'zone', fighting = inZone && player.hunting && hunt && hunt.state === 'fight' && hunt.mon;

    // 怪物數量維持
    if (inZone && currentZone().type !== 'dragon') {
        scene.spawnCd -= dt;
        if (scene.spawnCd <= 0 && scene.mons.filter(m => !m.dead).length < MAP_MON_COUNT) { spawnMapMon(false); scene.spawnCd = 1200; }
    }

    // 綁定戰鬥中的怪：hunt.mobs 每隻對應一隻地圖怪
    const mobs = fighting ? hunt.mobs : [];
    for (const m of scene.mons) {
        if (!m.inst || m.dead || mobs.includes(m.inst)) continue;
        if (m.inst.hp <= 0) { m.dead = true; m.dying = 600; }   // 被打倒 → 淡出
        else m.inst = null;                                      // 脫離戰鬥（瞬移等）→ 放回遊走
    }
    for (const inst of mobs) {
        if (scene.mons.some(m => m.inst === inst && !m.dead)) continue;
        let best = null, bd = 1e9;
        for (const m of scene.mons) {
            if (m.dead || m.inst) continue;
            const d = Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y);
            if (d < bd) { bd = d; best = m; }
        }
        if (!best || bd > (inst === hunt.mon ? 6 : 4)) best = spawnMapMon(true) || best;
        if (!best) {   // 龍穴：龍出現在角色上方
            best = { x: pl.x, y: Math.max(1, pl.y - 2), rx: pl.x, ry: Math.max(1, pl.y - 2), cd: 1e9, dying: 0 };
            scene.mons.push(best);
        }
        best.inst = inst;
        best.icon = inst.icon;
        best.name = inst.name;
        best.lastHp = inst.hp;
        if (inst === hunt.mon) pl.path = [];
    }
    const target = fighting ? scene.mons.find(m => m.inst === hunt.mon && !m.dead) || null : null;
    if (target !== scene.engaged) { scene.engaged = target; if (target) pl.path = []; }

    // 怪物遊走、死亡淡出
    for (const m of scene.mons) {
        if (m.dead) { m.dying -= dt; continue; }
        if (m === scene.engaged) continue;
        m.cd -= dt;
        if (m.inst) {   // 圍上來的怪：一格一格走到角色旁邊
            if (m.cd > 0) continue;
            m.cd = 300;
            if (Math.abs(pl.x - m.x) + Math.abs(pl.y - m.y) <= 1) continue;
            const step = findPath(m.x, m.y, pl.x, pl.y, true)[0];   // 尋路繞過牆
            if (step && freeTile(step[0], step[1])) { m.x = step[0]; m.y = step[1]; }
            continue;
        }
        if (m.cd <= 0) {
            m.cd = rand(...MON_WANDER_MS);
            const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(0, 3)];
            if (freeTile(m.x + dx, m.y + dy)) { m.x += dx; m.y += dy; }
        }
    }
    scene.mons = scene.mons.filter(m => !(m.dead && m.dying <= 0));

    // 角色移動
    if (!inZone && !pl.path.length) {
        // 村莊：玩家自由控制（方向鍵／WASD 按住連走；點地圖走過去，見 sceneClick）
        const d = sceneKeyDir();
        if (d) {
            pl.dir = d[2];
            if (freeTileFor(pl.x + d[0], pl.y + d[1])) pl.path = [[pl.x + d[0], pl.y + d[1]]];
        }
    }
    if (inZone && !pl.path.length) {
        // 野外也能用方向鍵／WASD 手動走（之後幾秒不會被自動尋怪拉走）
        const d = sceneKeyDir();
        if (d) {
            pl.dir = d[2];
            if (freeTileFor(pl.x + d[0], pl.y + d[1])) pl.path = [[pl.x + d[0], pl.y + d[1]]];
            scene.manualUntil = gameNow + MANUAL_HOLD_MS;
        }
    }
    sceneTeleTick(dt);
    if (scene.moveMark) { scene.moveMark.t += dt; if (scene.moveMark.t > 700 || !pl.path.length) scene.moveMark = null; }
    const manual = inZone && scene.manualUntil > gameNow;
    if (!pl.path.length && !manual && !scene.dodging) {
        if (fighting && scene.engaged) {
            const e = scene.engaged;
            if (Math.abs(e.x - pl.x) + Math.abs(e.y - pl.y) !== 1) pl.path = findPath(pl.x, pl.y, e.x, e.y, true);
            else pl.dir = e.x > pl.x ? 'right' : e.x < pl.x ? 'left' : e.y > pl.y ? 'down' : 'up';
        } else if (inZone && player.hunting && !walkHome) {
            let best = null, bd = 1e9;
            for (const m of scene.mons) { if (m.dead) continue; const d = Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y); if (d < bd) { bd = d; best = m; } }
            if (best && bd > 1) pl.path = findPath(pl.x, pl.y, best.x, best.y, true).slice(0, 6);
        } else if (inZone) {
            // 野外停止掛機：原地附近隨機走動；村莊裡站著不動
            pl.idleCd -= dt;
            if (pl.idleCd <= 0) {
                pl.idleCd = rand(1500, 4000);
                const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(0, 3)];
                if (freeTileFor(pl.x + dx, pl.y + dy)) pl.path = [[pl.x + dx, pl.y + dy]];
            }
        }
    }
    if (pl.path.length) {
        scene.walkClock = (scene.walkClock || 0) + dt;
        const [nx, ny] = pl.path[0];
        if (!freeTileFor(nx, ny)) pl.path = [];
        else {
            const step = PLAYER_SPEED * dt / 1000;
            const ddx = nx - pl.rx, ddy = ny - pl.ry;
            pl.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up');
            const dist = Math.hypot(ddx, ddy);
            if (dist <= step) { pl.rx = nx; pl.ry = ny; pl.x = nx; pl.y = ny; pl.path.shift(); }
            else { pl.rx += ddx / dist * step; pl.ry += ddy / dist * step; }
        }
    } else { pl.rx += (pl.x - pl.rx) * 0.5; pl.ry += (pl.y - pl.ry) * 0.5; }
    for (const m of scene.mons) { m.rx += (m.x - m.rx) * Math.min(1, dt / 150); m.ry += (m.y - m.ry) * Math.min(1, dt / 150); }

    sceneReadEvents();
    for (const f of scene.floats) f.t += dt;
    scene.floats = scene.floats.filter(f => f.t < f.dur);
    for (const e of scene.effects) e.t += dt;
    scene.effects = scene.effects.filter(e => e.t < e.dur);
    if (pl.lunge) { pl.lunge.t += dt; if (pl.lunge.t > 180) pl.lunge = null; }
    if (pl.anim) { pl.anim.t += dt; if (pl.anim.t >= pl.anim.dur) pl.anim = null; }
    for (const m of scene.mons) if (m.lunge) { m.lunge.t += dt; if (m.lunge.t > 180) m.lunge = null; }
}

// ───────── 首領大招紅圈（hunt.tele）與自動閃避 ─────────
const MANUAL_HOLD_MS = 2500;   // 手動移動後幾毫秒內不自動尋怪
function sceneTeleTick(dt) {
    const t = hunt && hunt.tele, pl = scene.pl;
    if (!t || player.loc.type !== 'zone') { scene.tele = null; scene.dodging = false; return; }
    if (!scene.tele || scene.tele.ref !== t) scene.tele = { ref: t, x: pl.x, y: pl.y, r: 1.5, react: rand(350, 900) };
    const c = scene.tele;
    const inside = Math.hypot(pl.rx - c.x, pl.ry - c.y) <= c.r;
    t.dodged = !inside;          // 回報給 combat.js（時間到時用這個判斷有沒有閃開）
    t.seenAt = gameNow;
    if (!inside) { if (!pl.path.length) scene.dodging = false; return; }
    if (!player.settings.autoDodge || scene.manualUntil > gameNow || scene.dodging) return;
    c.react -= dt;               // 自動閃避有反應時間，偶爾會來不及
    if (c.react > 0) return;
    let best = null;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = pl.x + dx, y = pl.y + dy;
        if (Math.hypot(x - c.x, y - c.y) <= c.r + 0.4 || !freeTileFor(x, y)) continue;
        const path = findPath(pl.x, pl.y, x, y, false);
        if (path.length && (!best || path.length < best.length)) best = path;
    }
    if (best) { pl.path = best; scene.dodging = true; }
}

function addFloat(tx, ty, text, color, big) {
    scene.floats.push({ x: tx * TILE + TILE / 2 + rand(-6, 6), y: ty * TILE, text, color, t: 0, dur: 900, size: big ? 17 : 13 });
}

// 從 HP 變化與遊戲訊息產生傷害數字、MISS、特效
// 人物動作：attack 攻擊、cast 施法、hit 受傷（播完回到走路／站立）；攻擊與施法不會被受傷打斷
function playAnim(name) {
    const sp = CLASSES[player.cls].sprite;
    if (!sp || !sp[name]) return;
    const cur = scene.pl.anim;
    if (name === 'hit' && cur && cur.name !== 'hit' && cur.t < cur.dur) return;
    const n = sp[name].frames[animDir(scene.pl.dir)];
    scene.pl.anim = { name, t: 0, dur: n * sp[name].ms };
}
function animDir(dir) { return dir === 'left' ? 'right' : dir; }

function sceneReadEvents() {
    const pl = scene.pl, e = scene.engaged;
    // 先讀遊戲訊息：判斷這次是魔法還是普攻、有沒有爆擊
    let castNow = false, missNow = false;
    for (const l of gameLog) {
        if (l.seq <= scene.lastSeq) continue;
        if (l.cls === 'crit') scene.critNext = true;
        if (l.cls === 'miss') {
            if (l.msg.includes('沒有命中') && e) { addFloat(e.rx, e.ry, 'MISS', '#9a9a9a'); missNow = true; }
            else addFloat(pl.rx, pl.ry, 'MISS', '#9a9a9a');
        }
        if (l.cls === 'magic' && e) {
            // 範圍技能：所有圍上來的怪身上都爆特效
            const list = l.msg.includes('（範圍）') ? scene.mons.filter(m => m.inst && !m.dead) : [e];
            for (const m of list) scene.effects.push({ x: m.rx, y: m.ry, t: 0, dur: l.msg.includes('（範圍）') ? 550 : 400, color: l.msg.startsWith('💥') ? '#ffb347' : '#b48cff' });
            if (l.msg.startsWith('🔮')) castNow = true;
        }
        if (l.cls === 'heal' && l.msg.startsWith('✨')) {
            castNow = true;
            if (l.msg.startsWith('✨ 施放')) scene.effects.push({ x: pl.rx, y: pl.ry, t: 0, dur: 500, color: '#8fd0ff' });
        }
        if (l.cls === 'lvup' && l.msg.startsWith('🎉')) addFloat(pl.rx, pl.ry - 0.5, 'LEVEL UP!', '#ffd34d', true);
        if ((l.cls === 'rare' || l.cls === 'loot') && l.msg.startsWith('🎁')) addFloat(pl.rx, pl.ry - 0.8, '🎁', '#fff');
    }
    // 記住讀過的最大編號（不能只用 logSeq：編號若倒退，同一批訊息會每幀重讀）
    scene.lastSeq = gameLog.reduce((m, l) => Math.max(m, l.seq), Math.max(scene.lastSeq, logSeq));
    let dealt = false;
    // 每隻圍上來的怪：HP 減少就飄傷害數字（爆擊黃色大字只算在目標身上）
    for (const m of scene.mons) {
        if (!m.inst || m.lastHp == null) continue;
        const hp = Math.max(0, m.inst.hp);
        if (hp < m.lastHp) {
            const big = m === e && scene.critNext;
            addFloat(m.rx, m.ry, '-' + fmt(m.lastHp - hp), big ? '#ffd34d' : '#ffffff', big);
            if (m === e) { scene.critNext = false; if (!CLASSES[player.cls].sprite) pl.lunge = { dx: e.x - pl.x, dy: e.y - pl.y, t: 0 }; }
            dealt = true;
        }
        m.lastHp = hp;
    }
    if (castNow) playAnim('cast');
    else if (dealt || missNow) playAnim('attack');
    if (player.hp < scene.lastPlayerHp) {
        addFloat(pl.rx, pl.ry, '-' + fmt(scene.lastPlayerHp - player.hp), '#ff6b5b');
        // 隨機一隻貼在旁邊的怪做出攻擊動作
        const near = scene.mons.filter(m => m.inst && !m.dead && Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y) <= 1);
        const a = near.length ? near[rand(0, near.length - 1)] : e;
        if (a) a.lunge = { dx: pl.x - a.x, dy: pl.y - a.y, t: 0 };
        playAnim('hit');
    } else if (player.hp > scene.lastPlayerHp + 1 && scene.lastPlayerHp > 0) {
        addFloat(pl.rx, pl.ry, '+' + fmt(player.hp - scene.lastPlayerHp), '#7fe07a');
    }
    scene.lastPlayerHp = player.hp;
}

// ───────── 繪圖 ─────────
function sceneDraw(ctx, W, H) {
    const pl = scene.pl, th = scene.theme;
    const mapW = scene.mw * TILE, mapH = scene.mh * TILE;
    // 地圖比畫面小時置中（負的鏡頭位置）
    const camX = mapW <= W ? (mapW - W) / 2 : clamp(pl.rx * TILE + TILE / 2 - W / 2, 0, mapW - W);
    // 很寬的畫面（PC 橫式外框）角色畫在偏下方，避開上方惡魔頭與角色資訊
    const focusY = W > H * 2 ? H * 0.62 : H / 2;
    const camY = mapH <= H ? (mapH - H) / 2 : clamp(pl.ry * TILE + TILE / 2 - focusY, 0, mapH - H);
    ctx.fillStyle = th.wall;
    ctx.fillRect(0, 0, W, H);
    const x0 = Math.max(0, Math.floor(camX / TILE)), y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(scene.mw - 1, Math.ceil((camX + W) / TILE)), y1 = Math.min(scene.mh - 1, Math.ceil((camY + H) / TILE));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 背景圖地圖：整張圖拉滿地圖範圍，再疊地區色調；圖還沒載入時退回畫格子
    const bgImg = scene.bg && spriteImage(scene.bg.src);
    if (bgImg) {
        const cr = scene.bg.crop;   // 只取原圖的一部分（裁掉黑邊）
        if (cr) ctx.drawImage(bgImg, cr[0], cr[1], cr[2], cr[3], -camX, -camY, mapW, mapH);
        else ctx.drawImage(bgImg, -camX, -camY, mapW, mapH);
        if (scene.tint) { ctx.fillStyle = scene.tint; ctx.fillRect(-camX, -camY, mapW, mapH); }
    }
    if (!bgImg) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const g = scene.grid[y][x], sx = x * TILE - camX, sy = y * TILE - camY;
        if (g === 1) { ctx.fillStyle = th.wall; ctx.fillRect(sx, sy, TILE, TILE); continue; }
        if (player.loc.type === 'town') {
            // 村莊：外圍草地、中間泥土廣場（不畫格線，看起來像地面）
            const d = Math.hypot(x - MAP_W / 2, y - MAP_H / 2);
            ctx.fillStyle = d < 6.5 ? (scene.shade[y][x] ? '#7a6548' : '#75614a') : d < 7.5 ? '#5f5a3c' : (scene.shade[y][x] ? '#3f5a2c' : '#3b5529');
            ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
            continue;
        }
        ctx.fillStyle = scene.shade[y][x] ? th.a : th.b;
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
    }
    // 障礙物、建築
    ctx.font = '22px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const sx = x * TILE - camX + TILE / 2, sy = y * TILE - camY + TILE / 2;
        if (scene.grid[y][x] === 2) ctx.fillText(scene.deco[x + ',' + y], sx, sy);
    }
    // 有背景圖的村莊：圖上已畫好房屋與 NPC，不另外畫；可點範圍來自 SCENE_BGS 的 hot
    const inTownNow = player.loc.type === 'town' && !scene.bg;
    if (player.loc.type === 'town' && scene.bg && scene.bg.hot) {
        const kx = mapW / scene.bg.crop[2], ky = mapH / scene.bg.crop[3], ox = scene.bg.crop[0], oy = scene.bg.crop[1];
        scene.npcRects = scene.bg.hot.map(h => ({ x0: (h.r[0] - ox) * kx, y0: (h.r[1] - oy) * ky, x1: (h.r[2] - ox) * kx, y1: (h.r[3] - oy) * ky, npc: { act: h.act } }));
    }
    if (inTownNow) for (const h of TOWN_HOUSES) drawHouse(ctx, h, camX, camY);
    // 首領大招紅圈：外圈閃爍、內圈隨蓄力時間長大，滿了就爆
    if (scene.tele && scene.tele.ref) {
        const c = scene.tele, t = c.ref, k = clamp((gameNow - t.start) / (t.until - t.start), 0, 1);
        const cx = c.x * TILE - camX + TILE / 2, cy = c.y * TILE - camY + TILE / 2, R = (c.r + 0.5) * TILE;
        ctx.fillStyle = `rgba(220,30,20,${0.18 + 0.1 * Math.sin(gameNow / 80)})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.75, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,60,30,0.35)';
        ctx.beginPath(); ctx.ellipse(cx, cy, R * k, R * 0.75 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff3a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.75, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    }
    // 角色與怪物：依 y 由上往下畫（下面的蓋在上面的前面）；名字、血條最後統一畫在最上層
    const labels = [];
    if (inTownNow) scene.npcRects = [];
    const actorFont = '36px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    const drawMon = m => {
        let sx = m.rx * TILE - camX + TILE / 2, sy = m.ry * TILE - camY + TILE / 2;
        if (m.lunge) { const k = Math.sin(m.lunge.t / 180 * Math.PI) * 8; sx += m.lunge.dx * k; sy += m.lunge.dy * k; }
        ctx.globalAlpha = m.dead ? Math.max(0, m.dying / 600) : 1;
        const big = m.inst && (m.inst.boss || m.inst.dragon);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(sx, sy + 11, big ? 16 : 11, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.font = big ? '54px "Segoe UI Emoji","Apple Color Emoji",sans-serif' : actorFont;
        ctx.fillText(m.icon, sx, sy - (big ? 12 : 4));
        ctx.globalAlpha = 1;
        // 圍上來的怪都有血條；名字只標在目標（避免擠在一起），目標腳下加紅圈
        if (m.inst && !m.dead) {
            const tgt = m === scene.engaged;
            const w = big ? 46 : 32, pct = clamp(m.inst.hp / m.inst.maxHp, 0, 1), by = sy - (big ? 44 : 30);
            if (m.inst.elite) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy + 11, 16, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
            if (tgt) { ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(sx, sy + 11, big ? 20 : 14, big ? 6 : 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
            labels.push(() => {
                ctx.fillStyle = '#000a'; ctx.fillRect(sx - w / 2, by, w, 5);
                ctx.fillStyle = tgt ? '#d64036' : '#b0702c'; ctx.fillRect(sx - w / 2, by, w * pct, 5);
                if (tgt || m.inst.elite) drawLabel(ctx, `${m.inst.name} Lv.${m.inst.lv}`, sx, by - 8, m.inst.boss ? '#ff8a6a' : m.inst.elite ? '#ffd34d' : '#e8e0cc');
            });
        }
    };
    const drawPlayer = () => {
        let px = pl.rx * TILE - camX + TILE / 2, py = pl.ry * TILE - camY + TILE / 2;
        if (pl.lunge) { const k = Math.sin(pl.lunge.t / 180 * Math.PI) * 9; px += pl.lunge.dx * k; py += pl.lunge.dy * k; }
        const bob = pl.path.length ? Math.sin(gameNow / 90) * 2 : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(px, py + 12, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
        const sp = CLASSES[player.cls].sprite;
        // 目前動作：攻擊／施法／受傷播放中就用它，否則走路（停下來用中間那格當站立）
        const playing = pl.anim && pl.anim.t < pl.anim.dur && sp && sp[pl.anim.name] && spriteImage(sp[pl.anim.name].src);
        const anim = playing ? sp[pl.anim.name] : sp && sp.walk;
        const img = anim && spriteImage(anim.src);
        let labelY = py - 24;
        if (img) {
            // 列＝方向（向左＝向右鏡像）；縮放成 drawH 身高；腳底對齊所在格子
            const d = animDir(pl.dir), rowIdx = { down: 0, right: 1, up: 2 }[d], n = anim.frames[d];
            let frame;
            if (playing) frame = Math.min(n - 1, Math.floor(pl.anim.t / anim.ms));
            else frame = pl.path.length ? Math.floor(scene.walkClock / anim.ms) % n : Math.floor(n / 2);
            const k = sp.drawH / sp.charH, dw = anim.cellW * k, dh = anim.cellH * k;
            ctx.save();
            if (pl.dir === 'left') { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
            ctx.drawImage(img, frame * anim.cellW, rowIdx * anim.cellH, anim.cellW, anim.cellH, px - dw / 2, py + 14 - dh, dw, dh);
            ctx.restore();
            labelY = py + 14 - sp.drawH - 6;
        } else {
            ctx.font = '40px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
            ctx.save();
            if (pl.dir === 'left') { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
            ctx.fillText(CLASSES[player.cls].icon, px, py - 6 + bob);
            labelY = py - 32;
            ctx.restore();
        }
        labels.push(() => drawLabel(ctx, player.name, px, labelY, '#9fe0ff'));
    };
    const actors = scene.mons.map(m => ({ y: m.ry, draw: () => drawMon(m) }));
    actors.push({ y: pl.ry + 0.01, draw: drawPlayer });
    if (inTownNow) for (const n of TOWN_NPCS) actors.push({ y: n.y, draw: () => {
        const sx = n.x * TILE - camX + TILE / 2, sy = n.y * TILE - camY + TILE / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(sx, sy + 12, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.font = '28px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
        ctx.fillText(n.icon, sx, sy - 2);
        if (n.prop) { ctx.font = '18px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.fillText(n.prop, sx - 20, sy + 6); }
        labels.push(() => drawNpcPlate(ctx, n.names[player.loc.id] || n.role, n.role, sx, sy - 26, camX, camY, n));
    } });
    // 村莊點擊移動的目的地標記（走到就消失）
    const mk = scene.moveMark;
    if (mk && pl.path.length) {
        const sx = mk.x * TILE - camX + TILE / 2, sy = mk.y * TILE - camY + TILE / 2 + 8, k = (gameNow % 900) / 900;
        ctx.strokeStyle = '#ffe7a8'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9 - k * 0.6;
        ctx.beginPath(); ctx.ellipse(sx, sy, 6 + k * 8, 3 + k * 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    } else scene.moveMark = null;
    actors.sort((a, b) => a.y - b.y).forEach(a => a.draw());
    labels.forEach(f => f());
    // 特效、飄字
    if (scene.moveMark) {   // 點地圖移動的目的地標記
        const mk = scene.moveMark, sx = mk.x * TILE - camX + TILE / 2, sy = mk.y * TILE - camY + TILE / 2 + 8, k = Math.min(1, mk.t / 700);
        ctx.strokeStyle = '#ffe7a8'; ctx.globalAlpha = 1 - k * 0.7; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy, 12 - k * 5, 5 - k * 2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    for (const e of scene.effects) {
        const sx = e.x * TILE - camX + TILE / 2, sy = e.y * TILE - camY + TILE / 2, k = e.t / e.dur;
        ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, sy, 8 + k * 18, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    for (const f of scene.floats) {
        const k = f.t / f.dur;
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.font = `bold ${f.size}px sans-serif`;
        ctx.lineWidth = 3; ctx.strokeStyle = '#000';
        const sy = f.y - camY - 4 - k * 26;
        ctx.strokeText(f.text, f.x - camX, sy);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x - camX, sy);
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    // 狀態字（停止、步行回村）
    let msg = '';
    if (walkHome) msg = `🚶 步行回${TOWNS[walkHome.town].name}…${Math.ceil((walkHome.until - gameNow) / 1000)} 秒`;
    else if (player.loc.type === 'zone' && !player.hunting) msg = '⏸ 停止掛機中';
    if (msg) {
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#000a'; ctx.fillRect(W / 2 - 90, H - 34, 180, 24);
        ctx.fillStyle = '#ffe7a8'; ctx.fillText(msg, W / 2, H - 22);
    }
    scene.cam = { x: camX, y: camY };
}

// 村莊房屋：石牆＋深色石板屋頂（屋頂佔上半、牆佔下半，有門窗）
function drawHouse(ctx, [hx, hy, hw, hh], camX, camY) {
    const x = hx * TILE - camX, y = hy * TILE - camY, w = hw * TILE, h = hh * TILE;
    const roofH = h * 0.58, wallY = y + roofH;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 6, y + h - 4, w, 8);
    ctx.fillStyle = '#8a7a62'; ctx.fillRect(x + 4, wallY, w - 8, h - roofH);           // 牆
    ctx.strokeStyle = 'rgba(40,30,20,0.5)'; ctx.lineWidth = 1;
    for (let yy = wallY + 7; yy < y + h; yy += 7) { ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x + w - 4, yy); ctx.stroke(); }
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x + w / 2 - 7, y + h - 18, 14, 18);          // 門
    ctx.fillStyle = '#e8c06a';
    ctx.fillRect(x + 12, wallY + 6, 9, 8); ctx.fillRect(x + w - 21, wallY + 6, 9, 8);   // 窗（暖光）
    ctx.fillStyle = '#4a5260';                                                          // 屋頂
    ctx.beginPath(); ctx.moveTo(x, wallY + 2); ctx.lineTo(x + 10, y); ctx.lineTo(x + w - 10, y); ctx.lineTo(x + w, wallY + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,24,30,0.6)';
    for (let yy = y + 6; yy < wallY; yy += 6) { ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + w - 3, yy); ctx.stroke(); }
    ctx.fillStyle = '#5b6474'; ctx.fillRect(x + 8, y - 2, w - 16, 4);                    // 屋脊
    ctx.fillStyle = '#6b5e50'; ctx.fillRect(x + w - 22, y - 10, 8, 12);                  // 煙囪
}

// NPC 名牌：深藍圓角框＋金邊，名字（亮金）＋功能（灰），記下範圍給點擊用
function drawNpcPlate(ctx, name, role, x, y, camX, camY, npc) {
    ctx.font = 'bold 11px sans-serif';
    const nw = ctx.measureText(name).width;
    ctx.font = '9px sans-serif';
    const rw = ctx.measureText(role).width;
    const w = nw + rw + 16, h = 17, left = x - w / 2, top = y - h / 2;
    ctx.fillStyle = 'rgba(16,24,40,0.88)';
    ctx.strokeStyle = 'rgba(150,170,210,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(left, top, w, h, 4) : ctx.rect(left, top, w, h); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#ffe7a8'; ctx.fillText(name, left + 6, y + 1);
    ctx.font = '9px sans-serif'; ctx.fillStyle = '#b8c0cc'; ctx.fillText(role, left + 10 + nw, y + 1);
    ctx.textAlign = 'center';
    if (scene.npcRects) scene.npcRects.push({ x0: left + camX, y0: top + camY, x1: left + w + camX, y1: top + h + camY, npc });
}

function drawLabel(ctx, text, x, y, color) {
    ctx.font = 'bold 11px sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.lineWidth = 1;
}

// ───────── 迴圈與點擊 ─────────
let sceneLast = 0;
function sceneFrame(ts) {
    sceneRaf = 0;
    const cv = $('scene-canvas');
    if (!cv || !player || !huntVisible()) return;
    if (!scene || scene.key !== sceneKey()) buildScene();
    const dt = Math.min(100, sceneLast ? ts - sceneLast : 16);
    sceneLast = ts;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d');
    // 畫面寬時放大格子（約顯示 28 格寬、最多 1.3 倍；比例對齊天堂 M 參考圖）
    const z = clamp(W / (TILE * 28), 1, 1.3);
    scene.zoom = z;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0);
    if (!document.hidden) { sceneUpdate(dt); sceneDraw(ctx, W / z, H / z); }
    sceneRaf = requestAnimationFrame(sceneFrame);
}

function startScene() {
    if (!sceneRaf) { sceneLast = 0; sceneRaf = requestAnimationFrame(sceneFrame); }
}

function sceneClick(ev) {
    if (!scene) return;
    const cv = $('scene-canvas'), r = cv.getBoundingClientRect();
    const z = scene.zoom || 1;
    const wx = (ev.clientX - r.left) / z + scene.cam.x, wy = (ev.clientY - r.top) / z + scene.cam.y;
    if (player.loc.type === 'zone') { sceneZoneClick(wx, wy); return; }
    const plate = (scene.npcRects || []).find(p => wx >= p.x0 && wx <= p.x1 && wy >= p.y0 && wy <= p.y1);
    if (plate) { plate.npc.act(); return; }
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const b = !scene.bg && TOWN_NPCS.find(b => Math.abs(b.x - tx) <= 1 && Math.abs(b.y - ty) <= 1);
    if (b) { b.act(); return; }
    sceneWalkTo(tx, ty);
}

// 野外點擊（ARPG 手動操作）：點怪＝改打牠／把牠拉進戰鬥（沒掛機會自動開始）；點地面＝走過去，之後 2.5 秒不自動尋怪
function sceneZoneClick(wx, wy) {
    if (walkHome) return;
    let hit = null, bd = 0.85;
    for (const m of scene.mons) {
        if (m.dead) continue;
        const d = Math.hypot(wx / TILE - (m.rx + 0.5), wy / TILE - (m.ry + 0.3));
        if (d < bd) { bd = d; hit = m; }
    }
    if (hit) {
        if (hit.inst) focusMob(hit.inst);
        else {
            const inst = pullMob(hit.mid);
            if (!inst) { showToast('圍上來的怪太多了，先解決眼前的敵人'); return; }
            hit.inst = inst; hit.icon = inst.icon; hit.name = inst.name; hit.lastHp = inst.hp;
        }
        scene.manualUntil = 0;
        scene.effects.push({ x: hit.rx, y: hit.ry, t: 0, dur: 350, color: '#ffe7a8' });
        updateHuntLive();
        return;
    }
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    sceneWalkTo(tx, ty);
    if (scene.pl.path.length) scene.manualUntil = gameNow + MANUAL_HOLD_MS + scene.pl.path.length * 1000 / PLAYER_SPEED;
}

// 村莊自由移動：點到可走的格子就走過去；點到牆／建築就走到最近的旁邊
function sceneWalkTo(tx, ty) {
    const pl = scene.pl;
    if (tx < 0 || ty < 0 || tx >= scene.mw || ty >= scene.mh || (tx === pl.x && ty === pl.y)) return;
    // 正在兩格之間走：從下一格起算，避免倒退
    const sx = pl.path.length ? pl.path[0][0] : pl.x, sy = pl.path.length ? pl.path[0][1] : pl.y;
    let path = freeTileFor(tx, ty) ? findPath(sx, sy, tx, ty, false) : [];
    if (!path.length) path = findPath(sx, sy, tx, ty, true);
    if (!path.length && !(sx === tx && sy === ty)) return;
    pl.path = (pl.path.length ? [pl.path[0]] : []).concat(path);
    const end = pl.path[pl.path.length - 1] || [sx, sy];
    scene.moveMark = { x: end[0], y: end[1], t: 0 };
}

// 方向鍵／WASD：按住的最後一個方向
const sceneKeys = [];
const SCENE_KEY_DIRS = {
    ArrowUp: [0, -1, 'up'], ArrowDown: [0, 1, 'down'], ArrowLeft: [-1, 0, 'left'], ArrowRight: [1, 0, 'right'],
    w: [0, -1, 'up'], s: [0, 1, 'down'], a: [-1, 0, 'left'], d: [1, 0, 'right'],
};
function sceneKeyDir() { return sceneKeys.length ? SCENE_KEY_DIRS[sceneKeys[sceneKeys.length - 1]] : null; }
function sceneKeyName(ev) { return ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; }
document.addEventListener('keydown', ev => {
    const k = sceneKeyName(ev);
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!scene || !player || !huntVisible() || walkHome) return;
    if (!SCENE_KEY_DIRS[k] && !/^[1-4]$/.test(k)) return;
    const t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const dl = $('dialog-layer');
    if (dl && dl.classList.contains('active')) return;
    ev.preventDefault();
    if (/^[1-4]$/.test(k)) { if (!ev.repeat) skillBarCast(+k - 1); return; }   // 技能快捷鍵
    if (!sceneKeys.includes(k)) sceneKeys.push(k);
    scene.pl.path = scene.pl.path.slice(0, 1);   // 改用鍵盤：取消點地圖的路線（走完這一格）
    scene.moveMark = null;
});
document.addEventListener('keyup', ev => {
    const i = sceneKeys.indexOf(sceneKeyName(ev));
    if (i >= 0) sceneKeys.splice(i, 1);
});
window.addEventListener('blur', () => { sceneKeys.length = 0; });
