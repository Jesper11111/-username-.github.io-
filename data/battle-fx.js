// 戰鬥面板打擊感（第 59 節）：人物立繪、敵方「爆擊血條」（受擊殘影＋爆點閃光）、飄字、爆擊震屏
// 戰鬥程式只呼叫 battleFxHit()／battleFxHurt()／battleFxDot() 把事件排進佇列；updateCombatVisualPanel()（ui.js）每次更新畫面時呼叫 flushBattleFx() 播放。
// 面板看不到（別的分頁／視窗在背景）時不排佇列，不影響戰鬥結算。
// 2026-09-28 玩家要求：傷害數字落在「受傷的那一方」身上（打怪的字在右半敵方圖上、受傷的字在左半立繪上）；
//   依屬性上色（冰藍、毒綠、火紅、雷紫、金黃…）；暴擊時血條閃光震動＋放射爆點，數字放大跳動。

const BATTLE_HERO_IMG = { male: "images/battle/hero-male.jpg", female: "images/battle/hero-female.jpg" };
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
        restartAnim(stage.querySelector('.bf-scene') || stage, 'bf-shake');   // 只震中段圖片
        restartAnim(document.getElementById('bf-enemy-bar'), 'crit-hit');     // 血條閃光＋震動
        restartAnim(document.getElementById('bf-enemy-spark'), 'big');        // 切口放射爆點
        restartAnim(document.getElementById('bf-flash'), 'on');
    } else if (out.some(e => e.kind === "heavy")) {
        restartAnim(document.getElementById('bf-enemy-spark'), 'on');
    }
    if (out.some(e => e.side === "foe" && e.kind !== "miss")) {
        restartAnim(document.getElementById('bf-hero'), 'bf-lunge');
        restartAnim(document.getElementById('bf-foe'), 'bf-foe-hit');   // 敵方受擊閃白＋後退
    }
    if (out.some(e => e.side === "hero" && (e.kind === "hurt" || e.kind === "dot"))) restartAnim(document.getElementById('bf-hurt'), 'on');
}

// 移除再加回 class，讓 CSS 動畫重播
function restartAnim(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
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
    if (!img) return;
    let g = player.gender === 'female' ? 'female' : 'male';
    if (img.dataset.g !== g) {
        img.src = BATTLE_HERO_IMG[g];
        img.dataset.g = g;
        img.className = 'bf-hero bf-hero-' + g;
    }
}
