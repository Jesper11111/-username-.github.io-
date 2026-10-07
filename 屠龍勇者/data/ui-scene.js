// 屠龍勇者：中間的即時地圖畫面（ARCHITECTURE.md 第 17 節）（依賴 player、combat、monsters、zones、ui-panels）
// 俯視 RPG 地圖：角色在格子地圖上「上下左右」一格一格走，自己去找怪；怪物在地圖上遊走。
// 只是「看得到的那一層」：戰鬥邏輯仍由 combat.js 決定（尋怪時間、命中、傷害都不變，離線收益也不受影響）。
//   尋怪中 → 角色用 BFS 走向最近的怪
//   開打（hunt.mon 出現）→ 把最近的地圖怪綁定成這隻戰鬥對象，角色走到牠旁邊面對面
//   傷害數字：偵測怪物／玩家 HP 變化；MISS、爆擊、升級、掉寶：讀遊戲訊息的分類
//   村莊：畫建築，點一下打開對應設施
const TILE = 32;
const MAP_W = 28, MAP_H = 28;
const MAP_MON_COUNT = 6;
const PLAYER_SPEED = 5.5;         // 每秒幾格
const MON_WANDER_MS = [900, 2600];

const SCENE_THEMES = {
    town:    { a: '#4b4033', b: '#463b2f', wall: '#2a231b', obst: ['🌳', '🪵', '🌳'], dens: 0.035 },
    field:   { a: '#3c5a2a', b: '#365327', wall: '#1f3318', obst: ['🌲', '🌳', '🪨', '🌲'], dens: 0.09 },
    dungeon: { a: '#2f2c2a', b: '#2a2725', wall: '#151312', obst: ['🪨', '🕯️', '⛓️', '🪨'], dens: 0.08 },
    ivory:   { a: '#3b3644', b: '#35303e', wall: '#1c1922', obst: ['🗿', '🕯️', '📚', '🪨'], dens: 0.07 },
    pyramid: { a: '#7a6441', b: '#715c3b', wall: '#4a3a24', obst: ['🌵', '🏺', '🪨', '🌵'], dens: 0.07 },
    tower:   { a: '#2b2339', b: '#271f34', wall: '#130f1c', obst: ['🕯️', '🪨', '💀', '🕯️'], dens: 0.07 },
    dragon:  { a: '#3b1b14', b: '#351812', wall: '#1a0a07', obst: ['🔥', '🪨', '🦴', '🔥'], dens: 0.06 },
};
const TOWN_BUILDINGS = [
    { icon: '🏪', name: '商店',   x: 11, y: 12, act: () => openTownSub('shop') },
    { icon: '💰', name: '回收',   x: 14, y: 11, act: () => openTownSub('sell') },
    { icon: '🛏️', name: '旅館',   x: 17, y: 12, act: () => openTownSub('inn') },
    { icon: '📦', name: '倉庫',   x: 11, y: 16, act: () => openTownSub('storage') },
    { icon: '⚒️', name: '鍛造',   x: 17, y: 16, act: () => openTownSub('craft') },
    { icon: '🌀', name: '傳送師', x: 14, y: 17, act: () => switchTab('map') },
];

let scene = null;   // { key, grid, theme, pl:{x,y,rx,ry,path,dir,lunge}, mons:[], engaged, floats:[], ... }
let sceneRaf = 0;

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
    if (z.id === 'island') return SCENE_THEMES.field;
    if (z.id === 'ivory') return SCENE_THEMES.ivory;
    if (z.id === 'pyramid') return SCENE_THEMES.pyramid;
    return SCENE_THEMES.dungeon;
}

function buildScene() {
    const key = sceneKey(), theme = themeFor(), rnd = seededRand(hashStr(key));
    const grid = [];   // 0 地板、1 牆、2 障礙物（畫 emoji）、3 建築
    for (let y = 0; y < MAP_H; y++) {
        grid.push([]);
        for (let x = 0; x < MAP_W; x++) {
            const edge = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1;
            const nearCenter = Math.abs(x - MAP_W / 2) < 3 && Math.abs(y - MAP_H / 2) < 3;
            grid[y].push(edge ? 1 : (!nearCenter && rnd() < theme.dens ? 2 : 0));
        }
    }
    const deco = {};   // 障礙物用哪個 emoji
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (grid[y][x] === 2) deco[x + ',' + y] = theme.obst[Math.floor(rnd() * theme.obst.length)];
    const shade = [];  // 地板深淺
    for (let y = 0; y < MAP_H; y++) { shade.push([]); for (let x = 0; x < MAP_W; x++) shade[y].push(rnd() < 0.5); }
    if (player.loc.type === 'town') {
        for (const b of TOWN_BUILDINGS) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (grid[b.y + dy][b.x + dx] === 2) grid[b.y + dy][b.x + dx] = 0; grid[b.y][b.x] = 3; }
    }
    const cx = Math.floor(MAP_W / 2), cy = Math.floor(MAP_H / 2);
    scene = {
        key, theme, grid, deco, shade,
        pl: { x: cx, y: cy, rx: cx, ry: cy, path: [], dir: 'down', lunge: null, idleCd: 1500 },
        mons: [], engaged: null, floats: [], effects: [],
        lastSeq: logSeq, lastPlayerHp: player.hp, critNext: false, spawnCd: 0, w: 0, h: 0,
        cam: { x: cx * TILE, y: cy * TILE },
    };
}

function freeTile(x, y) {
    if (!scene || x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    if (scene.grid[y][x] !== 0) return false;
    if (scene.pl.x === x && scene.pl.y === y) return false;
    return !scene.mons.some(m => m.x === x && m.y === y && !m.dead);
}

// BFS：從 (sx,sy) 走到任一目標格旁邊（上下左右相鄰）的最短路徑
function findPath(sx, sy, tx, ty, adjacent) {
    const key = (x, y) => y * MAP_W + x;
    const prev = new Map([[key(sx, sy), -1]]);
    const q = [[sx, sy]];
    const goal = (x, y) => adjacent ? Math.abs(x - tx) + Math.abs(y - ty) === 1 : (x === tx && y === ty);
    while (q.length) {
        const [x, y] = q.shift();
        if (goal(x, y)) {
            const path = [];
            let k = key(x, y);
            while (k !== key(sx, sy)) { path.unshift([k % MAP_W, Math.floor(k / MAP_W)]); k = prev.get(k); }
            return path;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, nk = key(nx, ny);
            if (prev.has(nk) || !freeTileFor(nx, ny, tx, ty)) continue;
            prev.set(nk, key(x, y));
            q.push([nx, ny]);
            if (prev.size > 900) return [];
        }
    }
    return [];
}
function freeTileFor(x, y) {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    return scene.grid[y][x] === 0 && !scene.mons.some(m => m.x === x && m.y === y && !m.dead);
}

// 地圖上看得到的怪（外觀），依地點與等級挑
function visualMonster() {
    const z = currentZone();
    if (!z || z.type === 'dragon') return null;
    if (z.type === 'tower') {
        const g = Math.min(9, Math.floor((player.loc.floor - 1) / 10));
        return { icon: TOWER_ICONS[g], name: TOWER_THEMES[g][0] };
    }
    let pool = z.mons.filter(id => MONSTERS[id].lv <= player.lv + 3);
    if (!pool.length) pool = [z.mons[0]];
    const id = pool[rand(0, pool.length - 1)];
    return { icon: MONSTERS[id].icon, name: MONSTERS[id].name };
}

function spawnMapMon(near) {
    const look = visualMonster();
    if (!look) return null;
    for (let tries = 0; tries < 40; tries++) {
        const r = near ? rand(2, 4) : rand(3, 9);
        const x = scene.pl.x + rand(-r, r), y = scene.pl.y + rand(-r, r);
        if (freeTile(x, y) && Math.abs(x - scene.pl.x) + Math.abs(y - scene.pl.y) >= 2) {
            const m = { x, y, rx: x, ry: y, icon: look.icon, name: look.name, inst: null, cd: rand(...MON_WANDER_MS), dying: 0, lunge: null };
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

    // 綁定戰鬥中的怪
    if (fighting && (!scene.engaged || scene.engaged.inst !== hunt.mon)) {
        let best = null, bd = 1e9;
        for (const m of scene.mons) {
            if (m.dead || m.inst) continue;
            const d = Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y);
            if (d < bd) { bd = d; best = m; }
        }
        if (!best || bd > 6) best = spawnMapMon(true) || best;
        if (!best) {   // 龍穴：龍出現在角色上方
            best = { x: pl.x, y: Math.max(1, pl.y - 2), rx: pl.x, ry: Math.max(1, pl.y - 2), cd: 1e9, dying: 0 };
            scene.mons.push(best);
        }
        best.inst = hunt.mon;
        best.icon = hunt.mon.icon;
        best.name = hunt.mon.name;
        best.lastHp = hunt.mon.hp;
        scene.engaged = best;
        pl.path = [];
    }
    // 戰鬥對象死亡 → 淡出
    if (scene.engaged && (!fighting || scene.engaged.inst !== hunt.mon)) {
        if (scene.engaged.inst && scene.engaged.inst.hp <= 0) { scene.engaged.dead = true; scene.engaged.dying = 600; }
        else scene.engaged.inst = null;
        scene.engaged = null;
    }

    // 怪物遊走、死亡淡出
    for (const m of scene.mons) {
        if (m.dead) { m.dying -= dt; continue; }
        if (m === scene.engaged) continue;
        m.cd -= dt;
        if (m.cd <= 0) {
            m.cd = rand(...MON_WANDER_MS);
            const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(0, 3)];
            if (freeTile(m.x + dx, m.y + dy)) { m.x += dx; m.y += dy; }
        }
    }
    scene.mons = scene.mons.filter(m => !(m.dead && m.dying <= 0));

    // 角色移動
    if (!pl.path.length) {
        if (fighting && scene.engaged) {
            const e = scene.engaged;
            if (Math.abs(e.x - pl.x) + Math.abs(e.y - pl.y) !== 1) pl.path = findPath(pl.x, pl.y, e.x, e.y, true);
            else pl.dir = e.x > pl.x ? 'right' : e.x < pl.x ? 'left' : e.y > pl.y ? 'down' : 'up';
        } else if (inZone && player.hunting && !walkHome) {
            let best = null, bd = 1e9;
            for (const m of scene.mons) { if (m.dead) continue; const d = Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y); if (d < bd) { bd = d; best = m; } }
            if (best && bd > 1) pl.path = findPath(pl.x, pl.y, best.x, best.y, true).slice(0, 6);
        } else {
            pl.idleCd -= dt;
            if (pl.idleCd <= 0) {
                pl.idleCd = rand(1500, 4000);
                const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(0, 3)];
                if (freeTileFor(pl.x + dx, pl.y + dy)) pl.path = [[pl.x + dx, pl.y + dy]];
            }
        }
    }
    if (pl.path.length) {
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
    for (const m of scene.mons) if (m.lunge) { m.lunge.t += dt; if (m.lunge.t > 180) m.lunge = null; }
}

function addFloat(tx, ty, text, color, big) {
    scene.floats.push({ x: tx * TILE + TILE / 2 + rand(-6, 6), y: ty * TILE, text, color, t: 0, dur: 900, size: big ? 17 : 13 });
}

// 從 HP 變化與遊戲訊息產生傷害數字、MISS、特效
function sceneReadEvents() {
    const pl = scene.pl, e = scene.engaged;
    if (e && e.inst) {
        const hp = Math.max(0, e.inst.hp);
        if (hp < e.lastHp) {
            addFloat(e.rx, e.ry, '-' + fmt(e.lastHp - hp), scene.critNext ? '#ffd34d' : '#ffffff', scene.critNext);
            scene.critNext = false;
            pl.lunge = { dx: e.x - pl.x, dy: e.y - pl.y, t: 0 };
        }
        e.lastHp = hp;
    }
    if (player.hp < scene.lastPlayerHp) {
        addFloat(pl.rx, pl.ry, '-' + fmt(scene.lastPlayerHp - player.hp), '#ff6b5b');
        if (e) e.lunge = { dx: pl.x - e.x, dy: pl.y - e.y, t: 0 };
    } else if (player.hp > scene.lastPlayerHp + 1 && scene.lastPlayerHp > 0) {
        addFloat(pl.rx, pl.ry, '+' + fmt(player.hp - scene.lastPlayerHp), '#7fe07a');
    }
    scene.lastPlayerHp = player.hp;
    for (const l of gameLog) {
        if (l.seq <= scene.lastSeq) continue;
        if (l.cls === 'crit') scene.critNext = true;
        if (l.cls === 'miss') {
            if (l.msg.includes('沒有命中') && e) addFloat(e.rx, e.ry, 'MISS', '#9a9a9a');
            else addFloat(pl.rx, pl.ry, 'MISS', '#9a9a9a');
        }
        if (l.cls === 'magic' && e) scene.effects.push({ x: e.rx, y: e.ry, t: 0, dur: 400, color: '#b48cff' });
        if (l.cls === 'heal' && l.msg.startsWith('✨ 施放')) scene.effects.push({ x: pl.rx, y: pl.ry, t: 0, dur: 500, color: '#8fd0ff' });
        if (l.cls === 'lvup' && l.msg.startsWith('🎉')) addFloat(pl.rx, pl.ry - 0.5, 'LEVEL UP!', '#ffd34d', true);
        if ((l.cls === 'rare' || l.cls === 'loot') && l.msg.startsWith('🎁')) addFloat(pl.rx, pl.ry - 0.8, '🎁', '#fff');
    }
    scene.lastSeq = logSeq;
}

// ───────── 繪圖 ─────────
function sceneDraw(ctx, W, H) {
    const pl = scene.pl, th = scene.theme;
    const camX = clamp(pl.rx * TILE + TILE / 2 - W / 2, 0, Math.max(0, MAP_W * TILE - W));
    const camY = clamp(pl.ry * TILE + TILE / 2 - H / 2, 0, Math.max(0, MAP_H * TILE - H));
    ctx.fillStyle = th.wall;
    ctx.fillRect(0, 0, W, H);
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    const x1 = Math.min(MAP_W - 1, Math.ceil((camX + W) / TILE)), y1 = Math.min(MAP_H - 1, Math.ceil((camY + H) / TILE));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const g = scene.grid[y][x], sx = x * TILE - camX, sy = y * TILE - camY;
        if (g === 1) { ctx.fillStyle = th.wall; ctx.fillRect(sx, sy, TILE, TILE); continue; }
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
    if (player.loc.type === 'town') {
        for (const b of TOWN_BUILDINGS) {
            const sx = b.x * TILE - camX + TILE / 2, sy = b.y * TILE - camY + TILE / 2;
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(sx, sy + 14, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.font = '30px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
            ctx.fillText(b.icon, sx, sy);
            drawLabel(ctx, b.name, sx, sy + 24, '#ffe7a8');
        }
    }
    // 怪物
    const actorFont = '24px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    for (const m of scene.mons) {
        let sx = m.rx * TILE - camX + TILE / 2, sy = m.ry * TILE - camY + TILE / 2;
        if (m.lunge) { const k = Math.sin(m.lunge.t / 180 * Math.PI) * 8; sx += m.lunge.dx * k; sy += m.lunge.dy * k; }
        ctx.globalAlpha = m.dead ? Math.max(0, m.dying / 600) : 1;
        const big = m.inst && (m.inst.boss || m.inst.dragon);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(sx, sy + 11, big ? 16 : 11, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.font = big ? '38px "Segoe UI Emoji","Apple Color Emoji",sans-serif' : actorFont;
        ctx.fillText(m.icon, sx, sy - (big ? 6 : 0));
        if (m === scene.engaged && m.inst) {
            const w = big ? 46 : 32, pct = clamp(m.inst.hp / m.inst.maxHp, 0, 1);
            ctx.fillStyle = '#000a'; ctx.fillRect(sx - w / 2, sy - (big ? 34 : 22), w, 5);
            ctx.fillStyle = '#d64036'; ctx.fillRect(sx - w / 2, sy - (big ? 34 : 22), w * pct, 5);
            drawLabel(ctx, `${m.inst.name} Lv.${m.inst.lv}`, sx, sy - (big ? 42 : 30), m.inst.boss ? '#ff8a6a' : '#e8e0cc');
        }
        ctx.globalAlpha = 1;
    }
    // 角色
    let px = pl.rx * TILE - camX + TILE / 2, py = pl.ry * TILE - camY + TILE / 2;
    if (pl.lunge) { const k = Math.sin(pl.lunge.t / 180 * Math.PI) * 9; px += pl.lunge.dx * k; py += pl.lunge.dy * k; }
    const bob = pl.path.length ? Math.sin(gameNow / 90) * 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(px, py + 12, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '26px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    ctx.save();
    if (pl.dir === 'left') { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
    ctx.fillText(CLASSES[player.cls].icon, px, py - 2 + bob);
    ctx.restore();
    drawLabel(ctx, player.name, px, py - 24, '#9fe0ff');
    // 特效、飄字
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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!document.hidden) { sceneUpdate(dt); sceneDraw(ctx, W, H); }
    sceneRaf = requestAnimationFrame(sceneFrame);
}

function startScene() {
    if (!sceneRaf) { sceneLast = 0; sceneRaf = requestAnimationFrame(sceneFrame); }
}

function sceneClick(ev) {
    if (!scene || player.loc.type !== 'town') return;
    const cv = $('scene-canvas'), r = cv.getBoundingClientRect();
    const tx = Math.floor((ev.clientX - r.left + scene.cam.x) / TILE), ty = Math.floor((ev.clientY - r.top + scene.cam.y) / TILE);
    const b = TOWN_BUILDINGS.find(b => Math.abs(b.x - tx) <= 1 && Math.abs(b.y - ty) <= 1);
    if (b) b.act();
}
