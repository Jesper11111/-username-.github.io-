// 屠龍勇者：裝備圖鑑（ARCHITECTURE.md 第 20 節）（依賴 items、monsters、zones、quests、player、ui、ui-panels）
// 列出遊戲裡所有道具（任務收集品除外）：分類、品質、能力值、取得方式（商店／怪物掉落／鍛造／職業任務），
// 「已擁有」看背包＋裝備＋倉庫，不另存進度（不改存檔結構）。
const CODEX_CATS = [
    ['all', '全部'], ['weapon', '武器'], ['armor', '防具'], ['acc', '飾品'], ['use', '消耗品'], ['currency', '通貨'], ['map', '地圖'], ['material', '材料'],
];
const CODEX_ACC_SLOTS = ['amulet', 'ring', 'belt'];
// 品質：商店買得到＝一般；其他依回收價分級
const CODEX_GRADES = [
    { id: 'normal', name: '一般', cls: 'g-normal' },
    { id: 'high',   name: '高級', cls: 'g-high' },
    { id: 'rare',   name: '稀有', cls: 'g-rare' },
    { id: 'hero',   name: '英雄', cls: 'g-hero' },
    { id: 'legend', name: '傳說', cls: 'g-legend' },
];
const CODEX_WEAPON_ICONS = { dagger: '🗡️', sword: '⚔️', twohand: '⚔️', axe: '🪓', spear: '🔱', blunt: '🔨', bow: '🏹', gun: '🔫', staff: '🪄', claw: '🐾', dual: '⚔️', scythe: '☠️' };
const CODEX_SLOT_ICONS = { helm: '⛑️', armor: '🥋', shield: '🛡️', tshirt: '👕', cloak: '🧥', gloves: '🧤', boots: '👢', amulet: '📿', ring: '💍', belt: '🎗️' };
const CODEX_CAT_ICONS = { potion: '🧪', scroll: '📜', ammo: '➶', elixir: '⚗️', material: '💎' };

let codexCat = 'all', codexGrade = 'all', codexQuery = '', codexSel = null;

function codexGroup(d) {
    if (d.cat === 'weapon') return 'weapon';
    if (d.cat === 'armor') return CODEX_ACC_SLOTS.includes(d.slot) ? 'acc' : 'armor';
    if (d.cat === 'material') return 'material';
    if (d.cat === 'currency') return 'currency';
    if (d.cat === 'map') return 'map';
    return 'use';
}
function codexGradeOf(id) {
    const d = ITEMS[id];
    if (d.price) return CODEX_GRADES[0];
    const v = d.sell || 0;
    return CODEX_GRADES[v < 10000 ? 1 : v < 30000 ? 2 : v < 80000 ? 3 : 4];
}
function codexIdOf(d) { return Object.keys(ITEMS).find(k => ITEMS[k] === d); }
function codexIcon(d) {
    if (d.cat === 'weapon') return CODEX_WEAPON_ICONS[d.type] || '⚔️';
    if (d.cat === 'armor') return CODEX_SLOT_ICONS[d.slot] || '🛡️';
    if (d.cat === 'currency') return CURRENCY[codexIdOf(d)].icon;
    if (d.cat === 'map') return '🗺️';
    return CODEX_CAT_ICONS[d.cat] || '📦';
}
function codexKind(d) {
    if (d.cat === 'weapon') return WEAPON_TYPES[d.type].name + (WEAPON_TYPES[d.type].two ? '（雙手）' : '');
    if (d.cat === 'armor') return SLOTS[d.slot === 'ring' ? 'ring1' : d.slot];
    return CAT_NAMES[d.cat];
}
const CODEX_ORDER = ['weapon', 'armor', 'acc', 'use', 'currency', 'map', 'material'];

// 全部道具 id（第一次打開時建立，依分類→品質→名稱排序）
let codexIdsCache = null;
function codexIds() {
    if (!codexIdsCache) {
        const gi = id => CODEX_GRADES.indexOf(codexGradeOf(id));
        codexIdsCache = Object.keys(ITEMS).filter(id => ITEMS[id].cat !== 'quest')
            .sort((a, b) => CODEX_ORDER.indexOf(codexGroup(ITEMS[a])) - CODEX_ORDER.indexOf(codexGroup(ITEMS[b])) || gi(a) - gi(b)
                || (ITEMS[a].sell || ITEMS[a].price || 0) - (ITEMS[b].sell || ITEMS[b].price || 0));
    }
    return codexIdsCache;
}

// 取得方式：商店、怪物掉落、永夜之塔首領、一般怪物、鍛造、職業任務
let codexSrcCache = null;
function codexSources(id) {
    if (!codexSrcCache) {
        const S = codexSrcCache = {};
        const add = (k, s) => { (S[k] = S[k] || []).push(s); };
        for (const m in MONSTERS) for (const dr of MONSTERS[m].drops || []) add(dr.id, '掉落：' + MONSTERS[m].name);
        add('towerSoul', '掉落：永夜之塔每 10 層首領');
        TOWER_BOSS_DROPS.forEach((ids, g) => ids.forEach(i => add(i, `掉落：永夜之塔 ${g * 10 + 10}F 首領`)));
        for (const dr of COMMON_DROPS) add(dr.id, '掉落：一般怪物' + (dr.minLv ? `（Lv.${dr.minLv} 以上地圖）` : ''));
        for (const r of RECIPES) add(r.out, '鍛造：' + Object.keys(r.need).map(k => `${ITEMS[k].name}×${r.need[k]}`).join('、') + `＋💰${fmt(r.gold)}`);
        for (const c in CLASS_QUESTS) CLASS_QUESTS[c].forEach(q => { if (q.reward && q.reward.item) add(q.reward.item, `任務：${CLASSES[c].name}「${q.title}」`); });
    }
    const d = ITEMS[id], list = [];
    if (d.cat === 'map') {
        const zs = mapZones(), need = zs[Math.min(d.tier, zs.length) - 1].lv[0];
        list.push(`掉落：Lv.${need} 以上的怪物 ${MAP_DROP_P * 100}%、異界裡 ${MAP_DROP_IN_MAP_P * 100}%（T${Math.max(1, d.tier - 1)}～T${Math.min(MAP_TIERS, d.tier + 1)} 異界）`);
        if (d.tier > 1) list.push(`通關獎勵：T${Math.max(1, d.tier - 2)}～T${d.tier} 異界首領`);
    }
    if (d.cat === 'currency') list.push(`掉落：所有怪物 ${Math.round(CURRENCY_DROP_P * 100)}%（首領 ${Math.round(CURRENCY_BOSS_P * 100)}%，${CURRENCY[id].w < 3 ? '稀有' : '常見'}）`);
    if (d.price) {
        const t = Object.values(TOWNS).find(t => t.tier === d.tier);
        list.push(`商店：${t ? t.name : '村莊'}起販售（💰${fmt(d.price)}）`);
    }
    // 暗黑式隨機裝備掉落（affix.js 的 randomEquipFor：回收價 ≤ 怪物等級 × 600、非職業限定）
    // 只列真的掉得出來的（需要的怪物等級不超過遊戲裡最高等的怪，永夜之塔 100F 首領約 Lv.92）
    const needLv = Math.max(1, Math.ceil(sellPriceOf(id) / 600));
    const topLv = Math.max(makeTowerMonster(100, true).lv, ...Object.values(MONSTERS).map(m => m.lv));
    if ((d.cat === 'weapon' || d.cat === 'armor') && !d.classes && needLv <= topLv) list.push(`掉落：隨機裝備（Lv.${needLv} 以上的怪物，至少魔法品質）`);
    return list.concat([...new Set(codexSrcCache[id] || [])]);
}

function codexOwned(id) {
    let n = 0;
    for (const x of player.inv) if (x.id === id) n += x.n || 1;
    for (const x of player.storage || []) if (x.id === id) n += x.n || 1;
    for (const s in player.equip) if (player.equip[s] && player.equip[s].id === id) n++;
    return n;
}

function codexList() {
    const q = codexQuery.trim().toLowerCase();
    return codexIds().filter(id => {
        const d = ITEMS[id];
        if (codexCat !== 'all' && codexGroup(d) !== codexCat) return false;
        if (codexGrade !== 'all' && codexGradeOf(id).id !== codexGrade) return false;
        return !q || d.name.toLowerCase().includes(q) || codexKind(d).includes(q);
    });
}

function codexDetailHtml(id) {
    const d = ITEMS[id], g = codexGradeOf(id), own = codexOwned(id), L = [];
    if (d.cat === 'weapon') {
        L.push(['傷害', `小型 1～${d.dmg[0]}／大型 1～${d.dmg[1]}`]);
        L.push(['攻擊間隔', `${(WEAPON_TYPES[d.type].spd / 1000).toFixed(2)} 秒`]);
        if (d.hit) L.push(['命中', '+' + d.hit]);
        if (d.crit) L.push(['爆擊', `+${Math.round(d.crit * 100)}%`]);
        if (WEAPON_TYPES[d.type].double) L.push(['雙擊率', WEAPON_TYPES[d.type].double * 100 + '%']);
        if (WEAPON_TYPES[d.type].ranged) L.push(['彈藥', WEAPON_TYPES[d.type].ammo === 'arrow' ? '箭' : '子彈']);
    }
    if (d.cat === 'armor' && d.ac) L.push(['AC', '-' + d.ac]);
    if (d.mr) L.push(['MR', '+' + d.mr]);
    if (d.sp) L.push(['SP', '+' + d.sp]);
    if (d.cat === 'armor' && d.hit) L.push(['命中', '+' + d.hit]);
    STAT_KEYS.forEach(k => { if (d[k]) L.push([STAT_NAMES[k], '+' + d[k]]); });
    if (d.hp) L.push(['HP', '+' + d.hp]);
    if (d.reduce) L.push(['減傷', d.reduce]);
    if (d.lifesteal) L.push(['吸血', `+${Math.round(d.lifesteal * 100)}%`]);
    if (d.silver) L.push(['銀製', '對不死系額外傷害']);
    if (d.dragon) L.push(['屠龍', `對龍族傷害 ×${d.dragon}`]);
    if (d.haste) L.push(['特效', '加速']);
    if (d.heal) L.push(['回復', `HP ${d.heal[0]}～${d.heal[1]}`]);
    if (d.buff) L.push(['效果', `${BUFF_DEFS[d.buff].name} ${d.sec / 60} 分鐘`]);
    if (d.cat === 'ammo') L.push(['傷害', '+' + d.dmg]);
    if (d.cat === 'map') { const z = mapZoneFor(d.tier); L.push(['階級', 'T' + d.tier]); L.push(['地區', `${z.name}（建議 Lv.${z.lv[0]}～${z.lv[1]}）`]); L.push(['怪物', '200～300 隻（數量詞綴最多 ×3）＋異界首領']); }
    if (d.cat === 'weapon' || d.cat === 'armor') L.push(['強化', d.safe >= 0 ? `安定值 +${d.safe}（上限 +15）` : '不可強化']);
    L.push(['重量', d.wt]);
    L.push(['回收價', '💰' + fmt(sellPriceOf(id))]);
    const src = codexSources(id);
    return `<button class="codex-close mini secondary" onclick="closeCodexDetail()" aria-label="關閉介紹">✕</button>
    <div class="codex-detail">
        <div class="codex-art ${g.cls}">${codexIcon(d)}</div>
        <div class="codex-info">
            <div class="codex-name ${g.cls}">${esc(d.name)}</div>
            <div class="codex-tags"><span class="codex-grade ${g.cls}">${g.name}</span><span class="muted">${codexKind(d)}</span>
                ${own ? `<span class="good">已擁有 ×${fmt(own)}</span>` : '<span class="muted">未擁有</span>'}</div>
            ${d.classes ? `<div class="codex-cls">限定職業：${d.classes.map(c => CLASSES[c].name).join('、')}</div>` : ''}
        </div>
    </div>
    <div class="codex-sec">基礎屬性</div>
    <div class="codex-stats">${L.map(([k, v]) => `<span class="muted">${k}</span><span>${v}</span>`).join('')}</div>
    ${d.desc ? `<div class="codex-desc">${esc(d.desc)}</div>` : ''}
    <div class="codex-sec">取得方式</div>
    <div class="codex-src">${src.length ? src.map(s => `<div>・${esc(s)}</div>`).join('') : '<div class="muted">尚無取得管道</div>'}</div>`;
}

function renderCodex() {
    const list = codexList();
    // 不自動選第一件：點清單才打開介紹（2026-10-09 使用者要求）
    if (codexSel && !list.includes(codexSel)) codexSel = null;
    const total = codexIds().length, owned = codexIds().filter(id => codexOwned(id) > 0).length;
    let h = `<div class="panel codex-top">
        <div class="chips">${CODEX_CATS.map(([id, n]) => `<button class="chip-btn ${codexCat === id ? 'active' : ''}" onclick="setCodexCat('${id}')">${n}</button>`).join('')}</div>
        <div class="codex-filter">
            <input id="codex-q" type="search" placeholder="🔍 輸入名稱或種類…" value="${esc(codexQuery)}" oninput="setCodexQuery(this.value)">
            <select onchange="setCodexGrade(this.value)"><option value="all">全部品質</option>
                ${CODEX_GRADES.map(g => `<option value="${g.id}" ${codexGrade === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}</select>
        </div>
    </div>`;
    h += `<div class="codex-head"><span></span><span>名稱</span><span>品質</span><span>種類</span></div>`;
    h += `<div class="codex-list" id="codex-list">` + (list.map(id => {
        const d = ITEMS[id], g = codexGradeOf(id);
        return `<button class="codex-row ${id === codexSel ? 'active' : ''} ${codexOwned(id) ? 'owned' : ''}" onclick="selectCodex('${id}')">
            <span class="codex-ico ${g.cls}">${codexIcon(d)}</span><span class="codex-n ${g.cls}">${esc(d.name)}</span>
            <span class="${g.cls}">${g.name}</span><span class="muted">${codexKind(d)}</span></button>`;
    }).join('') || '<p class="muted">找不到符合的道具</p>') + `</div>`;
    h += `<div class="codex-foot muted">共 ${list.length} 件（全部 ${total} 件，已擁有 ${owned} 件）</div>`;
    return h;
}

function setCodexCat(c) { codexCat = c; codexSel = null; renderPanel(); }
function setCodexGrade(g) { codexGrade = g; codexSel = null; renderPanel(); }
function setCodexQuery(q) {
    codexQuery = q;
    codexSel = null;
    renderPanel();
    const inp = $('codex-q');   // 重畫後把游標放回搜尋框
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
}
// 點清單：彈出介紹頁（全螢幕對話框，內容可上下捲動；2026-10-09 使用者要求，原本嵌在清單上方會被切掉一半）
function selectCodex(id) {
    codexSel = id;
    document.querySelectorAll('.codex-row.active').forEach(b => b.classList.remove('active'));
    const row = document.querySelector(`.codex-row[onclick="selectCodex('${id}')"]`);
    if (row) row.classList.add('active');
    openDialog('📖 裝備介紹', `<div class="codex-pop">${codexDetailHtml(id)}</div>`, [{ text: '關閉', cls: 'secondary', onClick: clearCodexSel }]);
}
function clearCodexSel() {
    codexSel = null;
    document.querySelectorAll('.codex-row.active').forEach(b => b.classList.remove('active'));
}
// 介紹右上角 ✕
function closeCodexDetail() { closeDialog(); clearCodexSel(); }

TABS.codex = ['📖', '裝備圖鑑'];
PANEL_FNS.codex = renderCodex;
