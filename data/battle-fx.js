// 戰鬥面板打擊感（第 59 節）：人物立繪、敵方「爆擊血條」（受擊殘影＋爆點閃光）、飄字、爆擊震屏
// 戰鬥程式只呼叫 battleFxHit()／battleFxHurt()／battleFxDot() 把事件排進佇列；updateCombatVisualPanel()（ui.js）每次更新畫面時呼叫 flushBattleFx() 播放。
// 面板看不到（別的分頁／視窗在背景）時不排佇列，不影響戰鬥結算。
// 2026-09-28 玩家要求：傷害數字落在「受傷的那一方」身上（打怪的字在右半敵方圖上、受傷的字在左半立繪上）；
//   依屬性上色（冰藍、毒綠、火紅、雷紫、金黃…）；暴擊時血條閃光震動＋放射爆點，數字放大跳動。

const BATTLE_HERO_IMG = { male: "images/battle/hero-male.jpg", female: "images/battle/hero-female.jpg" };
// 立繪上劍身的位置（圖片寬高的 %：護手 x1,y1 → 劍尖 x2,y2），武器火焰（buildBladeFire）沿這條線排（2026-09-28 依玩家提供的新立繪量測）
const BATTLE_HERO_BLADE = { male: [72, 55, 95, 80], female: [66, 52, 93, 88] };
// 本命五行 → 屬性特效 class（index.html 的 .bf-hero-box.el-*：武器火焰顏色、氣焰、粒子、光暈）
const BATTLE_HERO_ELEM_CLASS = { "金": "el-metal", "木": "el-wood", "水": "el-water", "火": "el-fire", "土": "el-earth" };
const BATTLE_FX_MAX_FLOATS = 5;      // 每次更新最多幾個飄字（多的合併）
const BATTLE_FX_STAGGER_MS = 110;    // 同一批飄字的間隔
// 飄字的屬性（resolveHit 的標籤）→ 顏色 class（index.html 的 .bf-el-*）與圖示；優先序由前到後
const BATTLE_FX_ELEMS = [
    ["thunder", "⚡"], ["ice", "❄️"], ["fire", "🔥"], ["poison", "☠️"], ["metal", "⚔️"],
    ["wind", "🌪️"], ["light", "☀️"], ["dark", "🌑"]
];

let battleFxQueue = [];

function battleFxActive() {
    if (document.hidden) return false;
    const stage = document.getElementById('combat-visual-panel');
    return !!(stage && stage.offsetParent !== null);
}
function battleFxElemOf(tags) {
    if (!tags) return null;
    const hit = BATTLE_FX_ELEMS.find(([k]) => tags.includes(k));
    return hit ? hit[0] : null;
}

// 玩家打中敵人：tags 用 resolveHit() 的標籤（crit 暴擊、metal 重擊、thunder 雷擊、ice／fire／poison 觸發、dodge 被閃避）
function battleFxHit(dmg, tags) {
    if (!battleFxActive()) return;
    if (tags && tags.includes("dodge")) { battleFxQueue.push({ kind: "miss", side: "foe" }); return; }
    if (!(dmg > 0)) return;
    const kind = tags && tags.includes("crit") ? "crit" : (tags && (tags.includes("metal") || tags.includes("thunder")) ? "heavy" : "hit");
    battleFxQueue.push({ kind, side: "foe", dmg, elem: battleFxElemOf(tags),
        label: kind === "crit" ? "暴擊" : (kind === "heavy" ? (tags.includes("thunder") ? "雷擊" : "重擊") : "") });
}

// 玩家受到傷害（dodged：全部閃掉）；tags＝對方攻擊觸發的屬性（上色用）
function battleFxHurt(dmg, dodged, tags) {
    if (!battleFxActive()) return;
    if (dodged) { battleFxQueue.push({ kind: "dodge", side: "hero" }); return; }
    // 多隻妖獸時：閃掉其中幾隻、仍被其他隻打中 → 同時顯示「閃避」（立繪往左閃）與受傷數字
    if (tags && tags.includes("dodge")) battleFxQueue.push({ kind: "dodge", side: "hero" });
    if (dmg > 0) battleFxQueue.push({ kind: "hurt", side: "hero", dmg, elem: battleFxElemOf(tags) });
}

// 持續傷害（elements.js 的 tickStatus 回傳 { burn, poison }）：燒傷紅字、中毒綠字；onPlayer＝發作在玩家身上
function battleFxDot(t, onPlayer) {
    if (!battleFxActive() || !t) return;
    [["burn", "fire", "燒傷"], ["poison", "poison", "中毒"]].forEach(([k, elem, label]) => {
        const v = roundDmg(t[k] || 0);
        if (v > 0) battleFxQueue.push({ kind: "dot", side: onPlayer ? "hero" : "foe", dmg: v, elem, label });
    });
}

function fmtFxNum(v) {
    return v >= 10000 ? Math.floor(v).toWan() : (v < 10 ? Math.round(v * 10) / 10 : Math.floor(v));
}

// 播放佇列：飄字、爆擊震屏與血條爆點
function flushBattleFx() {
    if (battleFxQueue.length === 0) return;
    let list = battleFxQueue;
    battleFxQueue = [];
    const layer = document.getElementById('bf-float');
    const stage = document.getElementById('combat-visual-panel');
    if (!layer || !stage) return;

    // 太多就合併：玩家打出的一般／重擊合成一個（保留最高等級與其屬性色）；暴擊一律單獨顯示
    const rank = { heavy: 2, hit: 1 };
    const crits = list.filter(e => e.kind === "crit");
    let hits = list.filter(e => rank[e.kind]);
    const others = list.filter(e => e.kind !== "crit" && !rank[e.kind]);
    if (hits.length > 2) {
        const top = hits.reduce((a, b) => rank[b.kind] > rank[a.kind] ? b : a);
        hits = [Object.assign({}, top, { dmg: hits.reduce((s, e) => s + e.dmg, 0), combo: hits.length })];
    }
    const out = crits.slice(0, 2).concat(hits, others).slice(0, BATTLE_FX_MAX_FLOATS);

    // 同一批的字分配不同高度，避免疊在一起（各方各自排：第 1、2、3 個…）
    const slotN = { foe: 0, hero: 0 };
    out.forEach(e => { if (e.kind !== "crit") e.slot = slotN[e.side]++; });
    out.forEach((e, i) => setTimeout(() => spawnBattleFloat(layer, e), i * BATTLE_FX_STAGGER_MS));
    const crit = crits.length > 0;
    if (crit) {
        restartAnim(stage, 'bf-crit-quake');   // 暴擊：整個戰鬥面板（含血條）明顯震動（2026-09-28 玩家要求）
        spawnCritShatter(stage.querySelector('.bf-scene'));   // 畫面破碎：裂痕＋碎片
        restartAnim(document.getElementById('bf-enemy-bar'), 'crit-hit');     // 血條閃光＋震動
        restartAnim(document.getElementById('bf-enemy-spark'), 'big');        // 切口放射爆點
        restartAnim(document.getElementById('bf-flash'), 'on');
    } else if (out.some(e => e.kind === "heavy")) {
        // 重擊／雷擊：血條切口小爆點＋中段圖片小震一下（2026-09-28 曾加過輕量版裂痕碎片，玩家覺得太假已移除；破碎只留給暴擊）
        restartAnim(document.getElementById('bf-enemy-spark'), 'on');
        restartAnim(stage.querySelector('.bf-scene'), 'bf-shake');
    }
    const heroEl = document.getElementById('bf-hero-box'), foeEl = document.getElementById('bf-foe');
    const foeHit = out.some(e => e.side === "foe" && e.kind !== "miss");
    if (foeHit) restartAnim(heroEl, 'bf-lunge', ['bf-evade']);
    // 閃避動作（2026-09-28 玩家要求）：敵方閃掉我的攻擊 → 敵方圖往右閃；我閃掉敵方攻擊 → 立繪往左閃。閃避優先於受擊動作
    if (out.some(e => e.kind === "miss")) restartAnim(foeEl, 'bf-evade', ['bf-foe-hit']);
    else if (foeHit) restartAnim(foeEl, 'bf-foe-hit', ['bf-evade']);   // 敵方受擊閃白＋後退
    if (out.some(e => e.kind === "dodge")) restartAnim(heroEl, 'bf-evade', ['bf-lunge']);
    if (out.some(e => e.side === "hero" && (e.kind === "hurt" || e.kind === "dot"))) restartAnim(document.getElementById('bf-hurt'), 'on');
}

// 暴擊的畫面破碎感：以敵方中央為撞擊點，隨機畫 7 條鋸齒裂痕（SVG）＋ 9 片玻璃碎片往外飛，約 0.8 秒後移除
function spawnCritShatter(scene) {
    if (!scene) return;
    const cx = 70 + Math.random() * 8, cy = 38 + Math.random() * 10;   // 撞擊點（中段圖片的 %）
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'bf-crack');
    for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
        let x = cx, y = cy, pts = [`${x},${y}`];
        const len = 18 + Math.random() * 26, steps = 4;
        for (let s = 1; s <= steps; s++) {
            const a = ang + (Math.random() - 0.5) * 0.7;
            x += Math.cos(a) * len / steps * 0.9;   // 橫向稍短（圖片比較寬）
            y += Math.sin(a) * len / steps * 1.6;
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        const pl = document.createElementNS(NS, 'polyline');
        pl.setAttribute('points', pts.join(' '));
        svg.appendChild(pl);
    }
    const ring = document.createElementNS(NS, 'ellipse');   // 撞擊點的小碎裂圈
    ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('rx', 3.5); ring.setAttribute('ry', 6);
    svg.appendChild(ring);
    scene.appendChild(svg);
    setTimeout(() => svg.remove(), 850);
    for (let i = 0; i < 9; i++) {
        const sh = document.createElement('div');
        sh.className = 'bf-shard';
        const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 70;
        sh.style.left = cx + '%'; sh.style.top = cy + '%';
        sh.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(0) + 'px');
        sh.style.setProperty('--dy', (Math.sin(ang) * dist * 0.8).toFixed(0) + 'px');
        sh.style.setProperty('--rot', ((Math.random() - 0.5) * 540).toFixed(0) + 'deg');
        sh.style.width = sh.style.height = (8 + Math.random() * 10).toFixed(0) + 'px';
        scene.appendChild(sh);
        setTimeout(() => sh.remove(), 800);
    }
}

// 移除再加回 class，讓 CSS 動畫重播；clear＝同時移除的其他動畫 class（例：閃避與受擊不同時播）
function restartAnim(el, cls, clear) {
    if (!el) return;
    el.classList.remove(cls);
    if (clear) clear.forEach(c => el.classList.remove(c));
    void el.offsetWidth;
    el.classList.add(cls);
}

// 飄字落點：受傷的那一方身上。敵方＝右半圖片中央（約 60～86%）、我方＝左半立繪中央（約 12～38%）；暴擊固定在敵方正中偏上
function spawnBattleFloat(layer, e) {
    const d = document.createElement('div');
    d.className = 'bf-num bf-' + e.kind + (e.elem ? ' bf-el-' + e.elem : '');
    if (e.kind === "miss" || e.kind === "dodge") d.textContent = "閃避";
    else {
        const icon = e.elem ? (BATTLE_FX_ELEMS.find(x => x[0] === e.elem) || [])[1] || '' : '';
        const small = [e.label, e.combo ? '×' + e.combo : ''].filter(Boolean).join(' ');
        d.innerHTML = `${small ? `<small>${small}</small>` : ''}${icon && e.kind !== 'crit' ? `<i>${icon}</i>` : ''}-${fmtFxNum(e.dmg)}`;
    }
    const onFoe = e.side === "foe";
    // 暴擊在敵方圖片中央偏上；其他字依 slot 輪流排在下方／上方／更下方，左右稍微錯開
    const ROWS = [58, 78, 14, 68, 36];
    if (e.kind === "crit") { d.style.left = (73 + Math.random() * 3) + '%'; d.style.top = (24 + Math.random() * 6) + '%'; }
    else {
        const s = e.slot || 0;
        d.style.left = (onFoe ? 66 + (s % 2 ? 12 : 0) + Math.random() * 6 : 18 + (s % 2 ? 12 : 0) + Math.random() * 6) + '%';
        d.style.top = ROWS[s % ROWS.length] + '%';
    }
    layer.appendChild(d);
    setTimeout(() => d.remove(), e.kind === "crit" ? 1500 : 1050);
}
// 血條：fill 立即變化、trail（殘影）延遲跟上；回血或換一波時殘影直接對齊
function setBattleBar(fillId, trailId, cur, max) {
    const f = document.getElementById(fillId);
    if (!f) return;
    let pct = max > 0 ? Math.max(0, Math.min(100, cur / max * 100)) : 0;
    let prev = f.dataset.pct === undefined ? pct : parseFloat(f.dataset.pct);
    f.style.width = pct + '%';
    f.dataset.pct = pct;
    const t = trailId && document.getElementById(trailId);
    if (t) {
        if (pct >= prev) { t.style.transition = 'none'; t.style.width = pct + '%'; void t.offsetWidth; t.style.transition = ''; }
        else t.style.width = pct + '%';
    }
    if (fillId === 'bf-enemy-fill') {
        const s = document.getElementById('bf-enemy-spark');
        if (s) s.style.left = pct + '%';
    }
}

// 敵方圖片（右半邊）：對手物件有 img 就用（野外妖獸由 FIELD_MONSTERS 帶入，config-maps.js）；
// 地圖也可設選填的 monsterImg 蓋過；都沒有（野外修士、暗殺者、心魔、懸賞對手）就顯示大號 emoji
// 回傳 { src, pos } 或 null
function getBattleFoeImg() {
    if (inTribulation && heartDemon) return heartDemon.img ? { src: heartDemon.img, pos: heartDemon.imgPos } : null;
    if (inBountyDuel && duelOpponent) return duelOpponent.img ? { src: duelOpponent.img, pos: duelOpponent.imgPos } : null;
    if (player.currentMapIsSafe || respawnTimer > 0 || enemies.length === 0) return null;
    let e = enemies.find(x => x.hp > 0) || enemies[0];
    if (player.currentMap && player.currentMap.monsterImg && !e.cultivator) return { src: player.currentMap.monsterImg };
    return e.img ? { src: e.img, pos: e.imgPos } : null;
}

function updateBattleFoe() {
    const foe = document.getElementById('bf-foe');
    if (!foe) return;
    const look = getBattleFoeImg();
    const src = look ? look.src : '';
    const img = document.getElementById('bf-foe-img');
    if ((img.dataset.src || '') !== src) {
        img.dataset.src = src;
        if (src) img.src = src; else img.removeAttribute('src');
        img.style.objectPosition = (look && look.pos) || '';
    }
    foe.classList.toggle('has-img', !!src);
    // 換了一隻（前一隻被打倒）時淡入
    if (src && foe.dataset.src !== src) { foe.dataset.src = src; restartAnim(foe, 'bf-foe-in'); }
    if (!src) foe.dataset.src = '';
    const icon = document.getElementById('battle-enemy-icon');
    const emoji = icon.innerText;
    const em = document.getElementById('bf-foe-emoji');
    if (em.textContent !== emoji) em.textContent = emoji;
    // 上方血條列的圓形頭像：有怪物圖就顯示圖（emoji 隱藏），沒有就顯示 emoji
    icon.classList.toggle('has-img', !!src);
    const bg = src ? `url("${src}")` : '';
    if (icon.style.backgroundImage !== bg) icon.style.backgroundImage = bg;
    icon.style.backgroundPosition = (look && look.pos) || '';
}

// 人物立繪依性別（不跟頭像走：頭像是圓形小圖，立繪是半身場景圖）
function updateBattleHero() {
    const img = document.getElementById('bf-hero');
    const box = document.getElementById('bf-hero-box');
    if (!img || !box) return;
    let g = player.gender === 'female' ? 'female' : 'male';
    if (img.dataset.g !== g) {
        img.onload = layoutBattleHero;
        img.src = BATTLE_HERO_IMG[g];
        img.dataset.g = g;
        const bg = document.getElementById('bf-hero-bg');   // 立繪完整顯示後右側的空白：同一張圖模糊放大墊底
        if (bg) bg.style.backgroundImage = `url("${BATTLE_HERO_IMG[g]}")`;
        buildBladeFire(BATTLE_HERO_BLADE[g]);
    }
    // 本命五行（stats.js 的 getPlayerElement，裝備最多的五行）決定武器光色與屬性特效；沒有則為淡金
    const cls = BATTLE_HERO_ELEM_CLASS[getPlayerElement()] || 'el-none';
    if (box.dataset.el !== cls) {
        if (box.dataset.el) box.classList.remove(box.dataset.el);
        box.classList.add(cls);
        box.dataset.el = cls;
    }
    layoutBattleHero();
}

// 武器火焰：沿劍身（護手 x1,y1 → 劍尖 x2,y2，立繪框的 %）等距排 16 團圓潤柔焰（互相重疊、模糊），護手端大、劍尖端小，
// 每團節奏與起始相位不同（看起來像火舌在劍上亂竄）；尺寸用框的 % 所以跟著立繪縮放
function buildBladeFire(blade) {
    const wrap = document.getElementById('bf-blade-fire');
    if (!wrap || !blade) return;
    const [x1, y1, x2, y2] = blade, N = 16;
    let html = '';
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        const k = 1 - t * 0.5;   // 護手 100% → 劍尖 50%
        html += `<span style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;--fw:${(10 * k).toFixed(1)}%;--fh:${((18 + (i % 3) * 4) * k).toFixed(1)}%;`
             + `animation-duration:${(0.85 + ((i * 7) % 5) * 0.12).toFixed(2)}s;animation-delay:-${((i * 3) % 7 * 0.15).toFixed(2)}s"></span>`;
    }
    wrap.innerHTML = html;
}

// 立繪框大小與左右分界（2026-09-28 玩家要求「玩家對戰畫面滿版」）：
//   立繪依圖片比例填滿中段高度（96%，完整全身與整把劍），寬度 w＝立繪寬；左右分界的斜線改跟著立繪走——
//   斜線底端＝立繪右緣（--s）、頂端再往右 --slant，人物區剛好被立繪填滿，只有斜線上方一小塊三角由模糊背景補；怪物區拿剩下的寬度。
//   立繪寬最多佔 60%（窄螢幕時縮小立繪，保留怪物區）。框內的武器光、粒子用 % 座標對準圖片。
function layoutBattleHero() {
    const img = document.getElementById('bf-hero'), box = document.getElementById('bf-hero-box');
    const scene = box && box.parentElement;
    if (!img || !box || !scene) return;
    const W = scene.clientWidth, H = scene.clientHeight;
    if (!W || !H) return;
    const r = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 0.9;
    let h = H * 0.96, w = h * r;
    if (w > W * 0.6) { w = W * 0.6; h = w / r; }
    const slant = Math.min(W * 0.12, 70);
    const key = `${W}x${H}:${Math.round(w)}x${Math.round(h)}`;
    if (box.dataset.size === key) return;
    box.dataset.size = key;
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    scene.style.setProperty('--s', w + 'px');
    scene.style.setProperty('--slant', slant + 'px');
    const line = document.getElementById('bf-divider-line');
    if (line) {
        line.setAttribute('x1', ((w + slant) / W * 100).toFixed(2));
        line.setAttribute('x2', (w / W * 100).toFixed(2));
    }
}
window.addEventListener('resize', () => { const b = document.getElementById('bf-hero-box'); if (b) { b.dataset.size = ''; layoutBattleHero(); } });
