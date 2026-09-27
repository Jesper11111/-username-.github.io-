// 戰鬥面板打擊感（第 59 節）：人物立繪、敵方「爆擊血條」（受擊殘影＋爆點閃光）、飄字、爆擊震屏
// 戰鬥程式只呼叫 battleFxHit()／battleFxHurt() 把事件排進佇列；updateCombatVisualPanel()（ui.js）每次更新畫面時呼叫 flushBattleFx() 播放。
// 面板看不到（別的分頁／視窗在背景）時不排佇列，不影響戰鬥結算。

const BATTLE_HERO_IMG = { male: "images/battle/hero-male.jpg", female: "images/battle/hero-female.jpg" };
const BATTLE_FX_MAX_FLOATS = 4;      // 每次更新最多幾個飄字（其餘合併成最後一個）
const BATTLE_FX_STAGGER_MS = 110;    // 同一批飄字的間隔

let battleFxQueue = [];

function battleFxActive() {
    if (document.hidden) return false;
    const stage = document.getElementById('combat-visual-panel');
    return !!(stage && stage.offsetParent !== null);
}

// 玩家打中敵人：tags 用 resolveHit() 的標籤（crit 暴擊、metal 重擊、thunder 雷擊、dodge 被閃避）
function battleFxHit(dmg, tags) {
    if (!battleFxActive()) return;
    if (tags && tags.includes("dodge")) { battleFxQueue.push({ kind: "miss" }); return; }
    if (!(dmg > 0)) return;
    let kind = tags && tags.includes("crit") ? "crit" : (tags && (tags.includes("metal") || tags.includes("thunder")) ? "heavy" : "hit");
    battleFxQueue.push({ kind, dmg, label: kind === "crit" ? "暴擊" : (kind === "heavy" ? (tags.includes("thunder") ? "雷擊" : "重擊") : "") });
}

// 玩家受到傷害（dodged：全部閃掉）
function battleFxHurt(dmg, dodged) {
    if (!battleFxActive()) return;
    if (dodged) { battleFxQueue.push({ kind: "dodge" }); return; }
    if (dmg > 0) battleFxQueue.push({ kind: "hurt", dmg });
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

    // 太多就合併：玩家造成的傷害合成一個，保留最高等級（暴擊 > 重擊 > 一般）
    const rank = { crit: 3, heavy: 2, hit: 1 };
    let out = list.filter(e => !rank[e.kind]);
    let hits = list.filter(e => rank[e.kind]);
    if (hits.length > BATTLE_FX_MAX_FLOATS - 1) {
        let keep = hits.slice(0, BATTLE_FX_MAX_FLOATS - 2);
        let rest = hits.slice(BATTLE_FX_MAX_FLOATS - 2);
        let top = rest.reduce((a, b) => rank[b.kind] > rank[a.kind] ? b : a);
        keep.push({ kind: top.kind, label: top.label, dmg: rest.reduce((s, e) => s + e.dmg, 0), combo: rest.length });
        hits = keep;
    }
    out = hits.concat(out).slice(0, BATTLE_FX_MAX_FLOATS + 1);

    let crit = false, hurt = false;
    out.forEach((e, i) => {
        setTimeout(() => spawnBattleFloat(layer, e), i * BATTLE_FX_STAGGER_MS);
        if (e.kind === "crit") crit = true;
        if (e.kind === "hurt") hurt = true;
    });
    if (crit) {
        restartAnim(stage, 'bf-shake');
        restartAnim(document.getElementById('bf-enemy-spark'), 'on');
        restartAnim(document.getElementById('bf-flash'), 'on');
    } else if (out.some(e => e.kind === "heavy")) {
        restartAnim(document.getElementById('bf-enemy-spark'), 'on');
    }
    if (out.some(e => rank[e.kind])) {
        restartAnim(document.getElementById('bf-hero'), 'bf-lunge');
        restartAnim(document.getElementById('bf-foe'), 'bf-foe-hit');   // 敵方受擊閃白＋後退
    }
    if (hurt) restartAnim(document.getElementById('bf-hurt'), 'on');
}

// 移除再加回 class，讓 CSS 動畫重播
function restartAnim(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
}

function spawnBattleFloat(layer, e) {
    const d = document.createElement('div');
    d.className = 'bf-num bf-' + e.kind;
    if (e.kind === "miss") d.textContent = "閃避";
    else if (e.kind === "dodge") d.textContent = "閃避";
    else {
        let label = e.label ? `<small>${e.label}${e.combo ? ' ×' + e.combo : ''}</small>` : (e.combo ? `<small>×${e.combo}</small>` : '');
        d.innerHTML = `${label}-${fmtFxNum(e.dmg)}`;
    }
    // 打敵人的字落在右上（血條下方），受傷的字落在左下（玩家 HUD 上方）
    let enemySide = !(e.kind === "hurt" || e.kind === "dodge");
    // 暴擊大字固定在右半中間偏上，其餘散在右半（避開中央 VS）
    if (e.kind === "crit") { d.style.left = (76 + Math.random() * 3) + '%'; d.style.top = (30 + Math.random() * 6) + '%'; }
    else {
        d.style.left = (enemySide ? 68 + Math.random() * 20 : 14 + Math.random() * 22) + '%';
        d.style.top = (enemySide ? 26 + Math.random() * 24 : 46 + Math.random() * 10) + '%';
    }
    layer.appendChild(d);
    setTimeout(() => d.remove(), e.kind === "crit" ? 1300 : 1000);
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
    const emoji = document.getElementById('battle-enemy-icon').innerText;
    const em = document.getElementById('bf-foe-emoji');
    if (em.textContent !== emoji) em.textContent = emoji;
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
