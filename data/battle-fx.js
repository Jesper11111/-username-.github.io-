// 戰鬥面板打擊感（第 59 節）：人物立繪、敵方「爆擊血條」（受擊殘影＋爆點閃光）、飄字、爆擊震屏
// 戰鬥程式只呼叫 battleFxHit()／battleFxHurt()／battleFxDot() 把事件排進佇列；updateCombatVisualPanel()（ui.js）每次更新畫面時呼叫 flushBattleFx() 播放。
// 面板看不到（別的分頁／視窗在背景）時不排佇列，不影響戰鬥結算。
// 2026-09-28 玩家要求：傷害數字落在「受傷的那一方」身上（打怪的字在右半敵方圖上、受傷的字在左半立繪上）；
//   依屬性上色（冰藍、毒綠、火紅、雷紫、金黃…）；暴擊時血條閃光震動＋放射爆點，數字放大跳動。

const BATTLE_HERO_IMG = { male: "images/battle/hero-male.jpg", female: "images/battle/hero-female.jpg" };
// 立繪上劍身的位置（圖片寬高的 %：護手 x1,y1 → 劍尖 x2,y2），武器火焰（buildBladeFire）沿這條線排（2026-09-28 依玩家提供的新立繪量測）
const BATTLE_HERO_BLADE = { male: [72, 55, 95, 80], female: [66, 52, 93, 88] };
// 施法動作（2026-10-19 使用者提供女角 8 格施法圖＋飛劍圖；playHeroCast）：施展技能時立繪換成動作格，
//   劍指 → 長劍離手 → 化出 24 把飛劍在身前排成兩層月牙劍牆 → 劍指一點、飛劍依序射向敵方。男角沒有動作圖就不播
//   frames＝動作條格數；frameRatio＝每格寬÷高；swordRatio＝飛劍圖寬÷高（劍尖朝右）；cooldown＝兩次施法動畫至少間隔幾毫秒（技能每回合 40% 機率，不節流會一直播）
const BATTLE_HERO_CAST = {
    female: { img: "images/battle/cast-female.png", frames: 8, frameRatio: 151 / 300, sword: "images/battle/flying-sword.png", swordRatio: 240 / 47, swords: 24 }
};
const BATTLE_CAST_COOLDOWN_MS = 7000;
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

// 收起對戰圖（2026-09-30 使用者要求「戰場實況加一個小開關可以關閉畫面」）：標題列右側按鈕，只藏中間的對戰圖（立繪、敵方圖、飄字），
// 敵方血條與我方狀態列照常顯示。是這台裝置的偏好，存在 localStorage，不寫進遊戲存檔（同 settings.js 的顯示尺寸）
const BATTLE_SCENE_HIDDEN_KEY = 'xiuxian_battle_scene_hidden';
function isBattleSceneHidden() {
    try { return localStorage.getItem(BATTLE_SCENE_HIDDEN_KEY) === '1'; } catch (e) { return false; }
}
function applyBattleSceneHidden() {
    const hidden = isBattleSceneHidden();
    const panel = document.getElementById('combat-visual-panel');
    if (panel) panel.classList.toggle('bf-scene-off', hidden);
    const btn = document.getElementById('bf-scene-toggle');
    if (btn) { btn.textContent = hidden ? '👁️ 顯示畫面' : '🙈 隱藏畫面'; btn.setAttribute('aria-pressed', hidden ? 'true' : 'false'); }
    if (hidden) battleFxQueue = [];
}
function toggleBattleScene() {
    try { localStorage.setItem(BATTLE_SCENE_HIDDEN_KEY, isBattleSceneHidden() ? '0' : '1'); } catch (e) {}
    applyBattleSceneHidden();
    if (!isBattleSceneHidden() && typeof layoutBattleHero === 'function') layoutBattleHero();   // 重新顯示時依目前寬度排立繪
}
document.addEventListener('DOMContentLoaded', applyBattleSceneHidden);

function battleFxActive() {
    if (document.hidden) return false;
    if (isBattleSceneHidden()) return false;   // 對戰圖收起時不播飄字與特效
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
        label: kind === "crit" ? "暴擊" : (kind === "heavy" ? (tags.includes("thunder") ? "雷擊" : "重擊") : ""),
        ys: tags && tags.includes("yuanshen") ? getYuanshenFxLabel() : '' });   // 元神偏好屬性加成生效（resolveHit 的 tag，yuanshen.js）
}

// 玩家受到傷害（dodged：全部閃掉）；tags＝對方攻擊觸發的屬性（上色用）
// 受傷飄字的小字：怪物技能名（monster.js）＋暴擊
function battleFxHurtLabel(tags) {
    if (!tags) return "";
    const sk = tags.filter(t => t.startsWith('msk_')).map(t => (MONSTER_SKILLS[t.slice(4)] || {}).name).filter(Boolean);
    return sk.concat(tags.includes("crit") ? ["暴擊"] : []).slice(0, 2).join(' ');
}
function battleFxHurt(dmg, dodged, tags) {
    if (!battleFxActive()) return;
    if (dodged) { battleFxQueue.push({ kind: "dodge", side: "hero" }); return; }
    // 多隻妖獸時：閃掉其中幾隻、仍被其他隻打中 → 同時顯示「閃避」（立繪往左閃）與受傷數字
    if (tags && tags.includes("dodge")) battleFxQueue.push({ kind: "dodge", side: "hero" });
    if (dmg > 0) battleFxQueue.push({ kind: "hurt", side: "hero", dmg, elem: battleFxElemOf(tags), label: battleFxHurtLabel(tags) });   // 妖獸暴擊、技能名（第 66 節）
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
    return fmtCombat(v);   // 新制 ×100 取整（format.js）；舊制照原本整數
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
    if (foeHit) battleFemalePose('attack');
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
        d.innerHTML = `${small ? `<small>${small}</small>` : ''}${icon && e.kind !== 'crit' ? `<i>${icon}</i>` : ''}-${fmtFxNum(e.dmg)}${e.ys ? `<em class="bf-ys-tag">${e.ys}</em>` : ''}`;
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

// 敵方圖片（右半邊）：對手物件有 img 就用（野外妖獸由 FIELD_MONSTERS 帶入，config-monsters.js）；
// 野外修士（正／魔）、暗殺者由 CULTIVATOR_IMGS／AMBUSH_IMG 帶入（config-merit.js）；安全區顯示 SAFE_ZONE_IMG（config-maps.js）；地圖也可設選填的 monsterImg 蓋過；心魔依性別由 HEART_DEMON_IMGS 帶入（config-tribulation.js）；懸賞對手（獵殺邪修）也依陣營用 CULTIVATOR_IMGS（bounty.js）；都沒有圖時顯示大號 emoji
// 回傳 { src, pos } 或 null
function getBattleFoeImg() {
    if (inTribulation && heartDemon) return heartDemon.img ? { src: heartDemon.img, pos: heartDemon.imgPos } : null;
    if (inBountyDuel && duelOpponent) return duelOpponent.img ? { src: duelOpponent.img, pos: duelOpponent.imgPos } : null;
    if (player.currentMapIsSafe) {   // 安全區：宗門景色（config-maps.js 的 SAFE_ZONE_IMG，地圖可用 battleImg 蓋過）
        const m = player.currentMap || {};
        return m.battleImg ? { src: m.battleImg, pos: m.battleImgPos } : { src: SAFE_ZONE_IMG.img, pos: SAFE_ZONE_IMG.pos };
    }
    if (respawnTimer > 0 || enemies.length === 0) return null;
    let e = enemies.find(x => x.hp > 0) || enemies[0];
    if (player.currentMap && player.currentMap.monsterImg && !e.cultivator) return { src: player.currentMap.monsterImg };
    return e.img ? { src: e.img, pos: e.imgPos } : null;
}

function updateBattleFoe() {
    const foe = document.getElementById('bf-foe');
    if (!foe) return;
    const look = getBattleFoeImg();
    const src = look ? look.src : '';
    const scene = foe.closest('.bf-scene');
    if (scene) scene.classList.toggle('bf-safe', !!player.currentMapIsSafe && !inTribulation && !inBountyDuel);   // 安全區隱藏 VS
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
        const cast = BATTLE_HERO_CAST[g], sp = document.getElementById('bf-cast-sprite');   // 施法動作圖先載好，第一次施法才不會空白
        if (sp) sp.style.backgroundImage = cast ? `url("${cast.img}")` : '';
        if (cast) new Image().src = cast.sword;
    }
    // 本命五行（stats.js 的 getPlayerElement，裝備最多的五行）決定武器光色與屬性特效；沒有則為淡金
    const cls = BATTLE_HERO_ELEM_CLASS[getPlayerElement()] || 'el-none';
    if (box.dataset.el !== cls) {
        if (box.dataset.el) box.classList.remove(box.dataset.el);
        box.classList.add(cls);
        box.dataset.el = cls;
    }
    // 元神虛影（yuanshen.js）：立繪上疊屬性色的元神光（螢幕混色，立繪是不透明 JPG 所以疊在上面）；天元神多一圈旋轉符環
    const ys = typeof getYuanshenInfo === 'function' ? getYuanshenInfo() : null, ysEl = document.getElementById('bf-ys');
    const ysKey = ys ? ys.id : '';
    if (ysEl && ysEl.dataset.k !== ysKey) {
        ysEl.dataset.k = ysKey;
        ysEl.className = 'bf-ys' + (ys ? ' on ' + ys.tier : '');
        if (ys) { const fx = getYuanshenFx(); ysEl.style.setProperty('--ysc', fx.color); ysEl.querySelector('.bf-ys-glyph').textContent = ys.icon; ysEl.title = ys.name; }
    }
    updateBattleFemaleAvatar();
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
    if (box.classList.contains("bf-new-female")) {
        const w=W*.44, slant=Math.min(W*.12,70);
        box.style.width=w+"px";box.style.height=H+"px";
        scene.style.setProperty("--s",w+"px");scene.style.setProperty("--slant",slant+"px");
        const line=document.getElementById("bf-divider-line");
        if(line){line.setAttribute("x1",(w+slant)/W*100);line.setAttribute("x2",w/W*100);}
        box.dataset.size="";return;
    }
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
// ---- 施法動作：劍指御劍、24 把飛劍成陣射出（BATTLE_HERO_CAST；combat.js 施展技能時呼叫 battleFxCast）----
// 只影響畫面：傷害照常由 battleFxHit 立刻飄字，飛劍約 1.4～2.4 秒後才打到敵方圖（敵方閃白）
// 時間軸（毫秒）：0 起手 → 420 長劍離手飛到身前 → 760 化出 24 把飛劍排成兩層月牙劍牆 → 1420 劍指一點、依序射出 → 2650 換回立繪
const BATTLE_CAST_FRAMES = [[0, 0], [1, 140], [2, 280], [3, 420], [4, 620], [5, 1400], [6, 1650], [7, 2350]];   // [第幾格, 幾毫秒切過去]
const BATTLE_CAST_TOTAL_MS = 2650;
let battleCastUntil = 0, battleCastTimers = [];
function battleFxCast() {
    if (!battleFxActive()) return;
    const cast = BATTLE_HERO_CAST[player.gender === 'female' ? 'female' : 'male'];
    if (!cast || Date.now() < battleCastUntil) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    battleCastUntil = Date.now() + BATTLE_CAST_COOLDOWN_MS;
    playHeroCast(cast);
}
function playHeroCast(cast) {
    const box = document.getElementById('bf-hero-box'), sp = document.getElementById('bf-cast-sprite');
    const layer = document.getElementById('bf-swords'), scene = box && box.parentElement;
    if (!box || !sp || !layer || !scene || !box.animate) return;
    battleCastTimers.forEach(clearTimeout);
    battleCastTimers = [];
    layer.innerHTML = '';
    const at = (ms, fn) => battleCastTimers.push(setTimeout(fn, ms));
    const setFrame = k => { sp.style.backgroundPositionX = (k / (cast.frames - 1) * 100) + '%'; };
    setFrame(0);
    const useNewAvatar = player.gender === 'female' && !!battleFemaleRenderer;
    if (useNewAvatar) battleFemalePose('cast', BATTLE_CAST_TOTAL_MS);
    else {
        box.classList.add('bf-casting');
        BATTLE_CAST_FRAMES.forEach(([k, ms]) => at(ms, () => setFrame(k)));
    }

    // 座標（中段圖片的 px）：動作格在立繪框內置中、高度填滿
    const H = scene.clientHeight, W = scene.clientWidth;
    const bw = box.offsetWidth, bh = box.offsetHeight, bx = box.offsetLeft, by = box.offsetTop;
    const avatar = useNewAvatar && document.getElementById('bf-female-avatar');
    const sw = avatar ? avatar.offsetWidth : bh * cast.frameRatio, sx = bx + (bw - sw) / 2;
    const L = Math.max(26, bh * 0.3), T = L / cast.swordRatio;  // 飛劍長、寬（跟著人物大小，不跟中段高度：窄畫面時人物會縮小）
    const pivot = { x: sx + sw * 0.62, y: by + bh * 0.44 };     // 月牙劍陣的圓心：角色胸口（劍排在圓弧上＝身前）
    const hand = { x: sx + sw * 0.8, y: by + bh * 0.42 };       // 第 4 格長劍離手的位置
    const core = { x: sx + sw * 0.95, y: by + bh * 0.36 };      // 長劍飛到身前、分化的位置
    const split = parseFloat(scene.style.getPropertyValue('--s')) || W * 0.44;   // 左右分界（layoutBattleHero 設的立繪寬）
    const foeX = split + (W - split) * 0.5;                                        // 敵方圖中央
    const tf = (p, deg, s) => `translate(${(p.x - L / 2).toFixed(1)}px, ${(p.y - T / 2).toFixed(1)}px) rotate(${deg.toFixed(1)}deg) scale(${s})`;
    const mk = () => {
        const d = document.createElement('div');
        d.className = 'bf-fsword';
        d.style.width = L + 'px'; d.style.height = T + 'px';
        d.style.backgroundImage = `url("${cast.sword}")`;
        layer.appendChild(d);
        return d;
    };

    // 1. 長劍離手：從手邊（劍尖朝上）飛到身前、轉成劍尖朝敵方，亮光一閃
    at(420, () => {
        const lead = mk();
        lead.classList.add('lead');
        lead.animate([
            { transform: tf(hand, -90, 1), opacity: 0 },
            { transform: tf(hand, -90, 1), opacity: 1, offset: 0.15 },
            { transform: tf(core, 0, 1.15), opacity: 1, offset: 0.7 },
            { transform: tf(core, 0, 1.3), opacity: 0 }
        ], { duration: 520, easing: 'ease-out', fill: 'forwards' });
        at(520, () => lead.remove());
    });
    // 2. 一化二十四：從身前散開成兩層月牙劍牆（內層 12、外層 12 錯開半格），劍尖都朝敵方、隨弧度微微張開
    const n = cast.swords, inner = Math.ceil(n / 2), slots = [];
    for (let i = 0; i < n; i++) {
        const outer = i >= inner, j = outer ? i - inner : i, cnt = outer ? n - inner : inner;
        const arc = -62 + 124 * (j + (outer ? 0.5 : 0)) / (cnt - (outer ? 0 : 1));
        const r = (outer ? 0.62 : 0.47) * bh, a = arc * Math.PI / 180;
        slots.push({ p: { x: pivot.x + r * Math.cos(a), y: pivot.y + r * Math.sin(a) * 0.82 }, deg: arc * 0.3 });
    }
    const swords = [];
    at(760, () => {
        const burst = document.getElementById('bf-cast-burst');   // 分化瞬間的光爆
        if (burst) { burst.style.left = core.x + 'px'; burst.style.top = core.y + 'px'; restartAnim(burst, 'on'); }
        slots.forEach((s, i) => {
            const d = mk();
            d.animate([
                { transform: tf(core, 0, 0.3), opacity: 0 },
                { transform: tf(s.p, s.deg, 1), opacity: 1 }
            ], { duration: 380, delay: (i % inner) * 14, easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'forwards' });
            swords.push(d);
        });
    });
    // 3. 劍指一點：外層先、由上往下依序射向敵方（各自偏一點，不會全部疊在同一點），打到時敵方閃白
    at(1420, () => {
        const order = swords.map((d, i) => i).sort((a, b) => (b >= inner) - (a >= inner) || slots[a].p.y - slots[b].p.y);
        order.forEach((i, k) => {
            const d = swords[i], s = slots[i];
            const tgt = { x: foeX + (Math.random() - 0.5) * W * 0.12, y: H * (0.32 + Math.random() * 0.3) };
            const aim = Math.atan2(tgt.y - s.p.y, tgt.x - s.p.x) * 180 / Math.PI;
            const delay = k * 30;
            at(delay, () => d.classList.add('fly'));
            d.animate([
                { transform: tf(s.p, s.deg, 1), opacity: 1 },
                { transform: tf(s.p, aim, 1), opacity: 1, offset: 0.25 },
                { transform: tf(tgt, aim, 1), opacity: 1, offset: 0.92 },
                { transform: tf(tgt, aim, 0.6), opacity: 0 }
            ], { duration: 330, delay, easing: 'ease-in', fill: 'forwards' });
            if (k === 0 || k === Math.floor(n / 2)) at(delay + 300, () => restartAnim(document.getElementById('bf-foe'), 'bf-foe-hit', ['bf-evade']));
            if (k === n - 1) at(delay + 300, () => restartAnim(document.getElementById('bf-flash'), 'on'));
        });
    });
    at(BATTLE_CAST_TOTAL_MS, () => { box.classList.remove('bf-casting'); layer.innerHTML = ''; });
}
window.addEventListener('resize', () => { const b = document.getElementById('bf-hero-box'); if (b) { b.dataset.size = ''; layoutBattleHero(); } });

'use strict';
// Render-only adapter: keeps source images unchanged, aligns feet and normalizes body height.
const BattleSpriteRenderer = class {
 constructor(host){this.canvas=document.createElement('canvas');this.canvas.width=240;this.canvas.height=300;this.canvas.style.cssText='width:100%;height:100%;display:block';host.appendChild(this.canvas);this.ctx=this.canvas.getContext('2d');this.atlases={};this.ready=Promise.resolve();}
 async load(kind,src,cols,rows,directional=true){const image=new Image();image.src=src;await image.decode();const atlas={image,src,cols,rows,directional,frames:[]};
 const scan=document.createElement('canvas');scan.width=image.naturalWidth;scan.height=image.naturalHeight;const c=scan.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const pixels=c.getImageData(0,0,scan.width,scan.height).data;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x0=Math.round(col*scan.width/cols),x1=Math.round((col+1)*scan.width/cols),y0=Math.round(row*scan.height/rows),y1=Math.round((row+1)*scan.height/rows);let bottom=y0,top=y1,left=x1,right=x0;
  // 原素材不是精準格線：只保留本格最大連通角色，排除跨格的腳／飄帶碎片。
  const fw=x1-x0,fh=y1-y0,seen=new Uint8Array(fw*fh),queue=new Int32Array(fw*fh);
  let main=[];
  for(let start=0;start<seen.length;start++){
   if(seen[start]||pixels[((y0+Math.floor(start/fw))*scan.width+x0+start%fw)*4+3]<=8)continue;
   let head=0,tail=1;queue[0]=start;seen[start]=1;
   while(head<tail){const at=queue[head++],xx=at%fw,yy=Math.floor(at/fw);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const nx=xx+dx,ny=yy+dy;if(nx<0||nx>=fw||ny<0||ny>=fh)continue;
     const next=ny*fw+nx;if(!seen[next]&&pixels[((y0+ny)*scan.width+x0+nx)*4+3]>8){seen[next]=1;queue[tail++]=next;}
    }
   }
   if(tail>main.length)main=Array.from(queue.subarray(0,tail));
  }
  const surface=document.createElement('canvas');surface.width=fw;surface.height=fh;
  const sc=surface.getContext('2d'),clean=sc.createImageData(fw,fh);
  for(const at of main){const src=((y0+Math.floor(at/fw))*scan.width+x0+at%fw)*4;clean.data.set(pixels.subarray(src,src+4),at*4);}
  sc.putImageData(clean,0,0);
  const alphaAt=(xx,yy)=>clean.data[((yy-y0)*fw+xx-x0)*4+3];
  // Core body region excludes extended swords/ribbons; foot and crown stay stable across poses.
  const counts=[];for(let yy=y0;yy<y1;yy++){let n=0;for(let xx=x0+Math.floor((x1-x0)*.25);xx<x0+Math.floor((x1-x0)*.75);xx++){const a=alphaAt(xx,yy);if(a>140)n++;}counts.push(n);}
  const threshold=Math.max(3,(x1-x0)*.045);for(let yy=y0;yy<y1;yy++)if(counts[yy-y0]>threshold){top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
  // Keep full cell so sword tips and magic remain visible. Shared scale per atlas avoids frame breathing.
  if(top>=bottom){top=y0;bottom=y1-1;}
  let footX=0,n=0;for(let yy=Math.max(top,bottom-10);yy<=bottom;yy++)for(let xx=x0;xx<x1;xx++)if(alphaAt(xx,yy)>140){footX+=xx;n++;}
  atlas.frames.push({surface,x:x0,y:y0,w:x1-x0,h:y1-y0,top,bottom,footX:n?footX/n:(x0+x1)/2});
 }
 const heights=atlas.frames.map(f=>f.bottom-f.top).sort((a,b)=>a-b);atlas.bodyHeight=heights[Math.floor(heights.length/2)];this.atlases[kind]=atlas;return atlas;
 }
 draw(kind,frame,direction,variant=0){const a=this.atlases[kind];if(!a)return false;const row=a.directional?({front:0,side:1,back:2}[direction]??0):variant;const f=a.frames[Math.min(a.rows-1,row)*a.cols+frame%a.cols];const c=this.ctx;c.clearRect(0,0,240,300);const scale=235/a.bodyHeight;c.drawImage(f.surface,0,0,f.w,f.h,120-(f.footX-f.x)*scale,288-(f.bottom-f.y)*scale,f.w*scale,f.h*scale);return true;}
};

// 純視覺：新版女角與常駐法相，不寫存檔、不參與戰鬥數值。
let battleFemaleRenderer = null, battleFemaleLoading = false;
let battleFemaleAction = { kind:'walk', start:0, until:0 };
function battleFemalePose(kind, duration = 800) {
    if (player.gender !== 'female' || !battleFemaleRenderer) return;
    const now = performance.now();
    if (kind === 'attack' && battleFemaleAction.kind === 'cast' && now < battleFemaleAction.until) return;
    battleFemaleAction = {kind,start:now,until:now+duration};
}
function updateBattleFemaleAvatar() {
    const box=document.getElementById('bf-hero-box');
    if (!box) return;
    const female=player.gender==='female';
    box.classList.toggle('bf-new-female',female);
    if (!female) return;
    const bg=document.getElementById('bf-hero-bg');if(bg)bg.style.backgroundImage='radial-gradient(ellipse at 40% 70%,#493729,#101725 75%)';
    // 元神只決定屬性，不代表取得法相。專案尚無法相取得／裝備驗證流程，
    // 正式戰場一律不載入法相；獨立演武場仍可預覽。不要用元神或前端自訂旗標授予。
    document.getElementById('bf-faxiang')?.remove();
    if(battleFemaleLoading || battleFemaleRenderer) return;
    battleFemaleLoading=true;
    const host=document.createElement('div');host.id='bf-female-avatar';box.append(host);
    const renderer=new BattleSpriteRenderer(host);
    Promise.all([
        renderer.load('walk','faxiang-demo/assets/walk.png',6,3),
        renderer.load('attack','faxiang-demo/assets/attack.png',8,3),
        renderer.load('cast','faxiang-demo/assets/cast.png',7,3,false)
    ]).then(()=>{
        battleFemaleRenderer=renderer;box.classList.add('bf-avatar-ready');
        renderer.draw('walk',0,'side');
        setInterval(()=>{
            if(player.gender!=='female' || !battleFxActive())return;
            const now=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
            const acting=now<battleFemaleAction.until;
            const kind=acting?battleFemaleAction.kind:'walk';
            const elapsed=now-battleFemaleAction.start;
            const frame=acting&&!reduced?(kind==='cast'
                ? BATTLE_CAST_FRAMES.slice(0,7).filter(([,ms])=>elapsed>=ms).length-1
                : Math.floor(elapsed/100)):0;
            renderer.draw(kind,frame,'side');
        },100);
    }).catch(()=>{host.remove();battleFemaleLoading=false;});
}
