// 屠龍勇者：製作通貨（POE 式改造裝備與異界地圖）（ARCHITECTURE.md 第 23 節）（依賴 items、affix、player；地圖部分見 maps.js）
// ───────── 製作通貨 ─────────
// 通貨是可堆疊道具（cat 'currency'，不佔負重），怪物掉落；在村莊鍛造 NPC →「🔮 裝備改造／🗺️ 地圖打造」使用。
// 傳說裝備只能用淬鍊石（重骰數值）；稀有最多 6 條詞綴（自然掉落 3～4 條）。
const CURRENCY = {
    curAug:     { name: '點化石', icon: '🔹', w: 40,  desc: '普通 → 魔法（1～2 條詞綴）', can: x => !x.q, use: x => applyAffixes(x, 'magic', craftIl(x)) },
    curAlt:     { name: '重鑄石', icon: '🔄', w: 30,  desc: '重新擲魔法裝備的全部詞綴', can: x => x.q === 'magic', use: x => applyAffixes(x, 'magic', craftIl(x)) },
    curTemper:  { name: '淬鍊石', icon: '⚖️', w: 12,  desc: '詞綴種類不變，重新擲數值（傳說也能用）', can: x => !!(x.af && x.af.length), use: rerollAffixValues },
    curRegal:   { name: '晉升石', icon: '👑', w: 8,   desc: '魔法 → 稀有，保留原詞綴再加 1 條', can: x => x.q === 'magic', use: x => { x.q = 'rare'; x.nm = RARE_NAMES[rand(0, RARE_NAMES.length - 1)]; addRandomAffix(x); } },
    curChaos:   { name: '混沌石', icon: '🌀', w: 6,   desc: '重新擲稀有裝備的全部詞綴（3～4 條）', can: x => x.q === 'rare', use: x => applyAffixes(x, 'rare', craftIl(x)) },
    curAnnul:   { name: '剝離石', icon: '✂️', w: 2.5, desc: '隨機移除一條詞綴（魔法、稀有；特殊詞綴不會被移除）', can: x => (x.q === 'magic' || x.q === 'rare') && (x.af || []).some(a => !a.sx), use: removeRandomAffix },
    curChance:  { name: '命運石', icon: '🎲', w: 1.2, desc: '普通 → 隨機品質（魔法 75%、稀有 21%、傳說 4%）', can: x => !x.q, use: x => applyAffixes(x, rollQuality(false, true), craftIl(x)) },
    curOracle:  { name: '神諭石', icon: '✨', w: 0.3, desc: '稀有裝備再加 1 條詞綴（最多 6 條，不含特殊詞綴）', can: x => x.q === 'rare' && (x.af || []).filter(a => !a.sx).length < 6, use: addRandomAffix },
    // 覺醒石（2026-10-24，第 23 節）：物品等級 70 以上（看掉落時記的 il，商店貨不算）才能用，任何品質都可以（傳說也行）
    curAwaken:  { name: '覺醒石', icon: '💠', w: 0.5, desc: `物品等級 ${SPECIAL_AFFIX_IL} 以上的裝備：加上 1 條特殊詞綴（全能力／首領增傷／經驗／金幣／反傷，已有就重洗那條）`, can: x => (x.il || 0) >= SPECIAL_AFFIX_IL, use: awakenAffix },
};
const CURRENCY_IDS = Object.keys(CURRENCY);
const CURRENCY_DROP_P = 0.03, CURRENCY_BOSS_P = 0.6;   // 每隻怪掉通貨的機率（首領 60%）

// 通貨道具併入 ITEMS（只用名稱、說明；回收價依稀有度）
for (const id of CURRENCY_IDS) {
    const c = CURRENCY[id];
    ITEMS[id] = { name: c.name, cat: 'currency', wt: 0, sell: Math.round(400 / c.w * 10), desc: `製作通貨：${c.desc}` };
}

// 物品等級：掉落時記的 il；商店貨、任務裝沒有 → 用玩家等級
function craftIl(x) { return x.il || Math.max(1, Math.min(MAX_LEVEL, player.lv)); }

function addRandomAffix(x) {
    const def = ITEMS[x.id];
    const pool = Object.keys(AFFIXES).filter(k => affixAllowed(k, def) && !(x.af || []).some(a => a.k === k));
    if (!pool.length) return;
    const k = pool[rand(0, pool.length - 1)];
    x.af = x.af || [];
    x.af.push({ k, v: rollAffixValue(k, craftIl(x)) });
    x.il = craftIl(x);
}
function removeRandomAffix(x) {
    const idx = x.af.map((a, i) => a.lg || a.sx ? -1 : i).filter(i => i >= 0);
    if (!idx.length) return;
    x.af.splice(idx[rand(0, idx.length - 1)], 1);
    if (x.q === 'magic' && !x.af.some(a => !a.sx)) {   // 魔法剝光變回普通（特殊詞綴和物品等級留著）
        delete x.q; delete x.nm;
        if (!x.af.length) { delete x.af; delete x.il; }
    } else if (x.q === 'magic') x.nm = AFFIXES[x.af[0].k].pre;
}
// 覺醒石：隨機一條特殊詞綴，取代原本那條（每件最多 1 條）
function awakenAffix(x) {
    const ks = Object.keys(SPECIAL_AFFIXES), k = ks[rand(0, ks.length - 1)];
    x.af = (x.af || []).filter(a => !a.sx);
    x.af.push({ k, v: rollAffixValue(k, x.il), sx: 1 });
}
function rerollAffixValues(x) {
    for (const a of x.af) {
        const lg = a.lg && LEGEND_AFFIXES.find(l => l.k === a.k);
        a.v = rollAffixValue(a.k, craftIl(x), lg ? lg.mul : 1);
    }
}

// 對裝備使用通貨；回傳錯誤訊息（成功回傳 ''）
// 這顆通貨能不能用在這件道具上（裝備用 CURRENCY 的規則；異界地圖用 maps.js 的 MAP_CURRENCY）
function currencyCan(cid, x) {
    const d = ITEMS[x.id];
    if (d.cat === 'map') return !!(MAP_CURRENCY[cid] && MAP_CURRENCY[cid].can(x));
    if (d.cat !== 'weapon' && d.cat !== 'armor') return false;
    if (x.q === 'legend' && cid !== 'curTemper' && cid !== 'curAwaken') return false;
    return CURRENCY[cid].can(x);
}

function useCurrency(cid, uid) {
    const c = CURRENCY[cid], x = findAnyInst(uid);
    if (!c || !x) return '找不到道具';
    const d = ITEMS[x.id];
    if (d.cat !== 'weapon' && d.cat !== 'armor' && d.cat !== 'map') return '只能用在武器、防具、異界地圖上';
    if (x.q === 'legend' && cid !== 'curTemper' && cid !== 'curAwaken') return '傳說裝備只能用淬鍊石、覺醒石';
    if (!currencyCan(cid, x)) return `${c.name}不能用在這件道具上`;
    if (!consumeItem(cid)) return `沒有${c.name}`;
    const before = itemName(x);
    if (d.cat === 'map') MAP_CURRENCY[cid].use(x); else c.use(x);
    clampHpMp();
    addLog(`${c.icon} 使用${c.name}：${before} → ${itemName(x)}`, x.q === 'legend' ? 'boss' : 'rare');
    return '';
}

// 掉落時擲一顆通貨（權重越小越稀有）
function rollCurrency() {
    const total = CURRENCY_IDS.reduce((a, id) => a + CURRENCY[id].w, 0);
    let r = Math.random() * total;
    for (const id of CURRENCY_IDS) { if (r < CURRENCY[id].w) return id; r -= CURRENCY[id].w; }
    return CURRENCY_IDS[0];
}

// 改造視窗：上面是裝備現況，下面列出全部通貨（數量、能不能用）
function openCraftDialog(uid) {
    const x = findAnyInst(uid);
    if (!x) return;
    const rows = CURRENCY_IDS.map(cid => {
        const c = CURRENCY[cid], n = countItem(cid), isMap = ITEMS[x.id].cat === 'map';
        if (isMap && !MAP_CURRENCY[cid]) return '';
        const ok = n > 0 && currencyCan(cid, x);
        return `<button class="craft-cur ${ok ? '' : 'off'}" onclick="craftUseBtn('${cid}',${uid})" ${ok ? '' : 'disabled'}>
            <span class="cc-i">${c.icon}</span><span class="cc-n">${c.name} <b>×${fmt(n)}</b></span><small>${isMap ? MAP_CURRENCY[cid].desc : c.desc}</small></button>`;
    }).join('');
    openDialog('🔮 通貨改造', `<div class="craft-item">${itemDescHtml(x)}</div><div class="craft-list">${rows}</div>`,
        [{ text: '關閉', cls: 'secondary', onClick: () => refreshUI() }]);
    $('dialog-layer').querySelector('h3').innerHTML = `🔮 <span class="${itemClass(x)}">${esc(itemName(x))}</span>`;
}
function craftUseBtn(cid, uid) {
    const err = useCurrency(cid, uid);
    if (err) { showToast(err); return; }
    saveGame();
    renderPanel();          // 背後的清單（鍛造 NPC 地圖打造、背包）一起更新
    openCraftDialog(uid);   // 重畫視窗顯示新詞綴
}
