// 屠龍勇者：村莊設施（傳送、商店、回收、倉庫、鍛造、旅館）（依賴 player、items、zones、combat）

function inTown() { return player.loc.type === 'town'; }
function currentTown() { return inTown() ? TOWNS[player.loc.id] : null; }

// ───────── 傳送 ─────────
function townTravelFee(id) { return inTown() ? TOWN_TRAVEL_FEE * Math.abs(TOWNS[id].tier - currentTown().tier) : 0; }

function travelTown(id) {
    if (!inTown()) { showToast('要在村莊裡才能找傳送師'); return; }
    if (player.loc.id === id) return;
    const fee = townTravelFee(id);
    if (player.gold < fee) { showToast('金幣不足'); return; }
    player.gold -= fee;
    player.loc = { type: 'town', id };
    addLog(`🌀 傳送到${TOWNS[id].name}`, 'sys');
    saveGame();
    refreshUI();
}

// 回傳不能進入的原因，空字串代表可以
function zoneBlockReason(z) {
    if (z.type !== 'dragon') return '';
    if (player.lv < z.reqLv) return `需要 Lv.${z.reqLv}`;
    if (z.prev && !player.dragons[z.prev]) return `需先討伐${MONSTERS[z.prev].name}`;
    const cd = player.dragonCd[z.boss] || 0;
    if (cd > Date.now()) return `巢穴封閉中（${fmtDuration(cd - Date.now())}）`;
    return '';
}

function fmtDuration(ms) {
    const m = Math.ceil(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : `${m} 分`;
}

function travelZone(zoneId, floor) {
    if (!inTown()) { showToast('要在村莊裡才能找傳送師'); return; }
    const z = ZONE_BY_ID[zoneId];
    const why = zoneBlockReason(z);
    if (why) { showToast(why); return; }
    if (player.gold < z.fee) { showToast(`金幣不足（傳送費 ${fmt(z.fee)}）`); return; }
    player.gold -= z.fee;
    player.loc = { type: 'zone', id: z.id };
    if (z.type === 'tower') player.loc.floor = clamp(floor || 1, 1, player.towerMax);
    session = null;
    addLog(`🌀 傳送到${zoneTitle()}`, 'sys');
    startHunt();
    currentTab = 'hunt';
    renderTabs();
    refreshUI();
}

// ───────── 商店 ─────────
function shopItemIds() {
    const tier = currentTown().tier;
    return Object.keys(ITEMS).filter(id => ITEMS[id].price && ITEMS[id].tier <= tier);
}

function buyItem(id, n) {
    if (!inTown()) return;
    const d = ITEMS[id];
    if (!shopItemIds().includes(id)) return;
    const cost = d.price * n;
    if (player.gold < cost) { showToast('金幣不足'); return; }
    if (invWeight() + d.wt * n > calcStats().weightMax) { showToast('負重不足，背不動了'); return; }
    player.gold -= cost;
    addItem(id, n);
    showToast(`購買 ${d.name} ×${n}（-${fmt(cost)}）`);
    refreshUI();
}

function sellItem(uid, all) {
    if (!inTown()) return;
    const it = findInv(uid);
    if (!it) return;
    const n = all ? it.n : 1;
    const price = sellPriceOf(it.id) * n;
    it.n -= n;
    if (it.n <= 0) removeInst(uid);
    player.gold += price;
    showToast(`賣出 ${ITEMS[it.id].name} ×${n}（+${fmt(price)}）`);
    refreshUI();
}

// ───────── 旅館 ─────────
function innPrice() { return 20 + player.lv * 8; }
function innRest() {
    if (!inTown()) return;
    const st = calcStats();
    if (player.hp >= st.maxHp && player.mp >= st.maxMp) { showToast('HP、MP 都是滿的'); return; }
    if (player.gold < innPrice()) { showToast('金幣不足'); return; }
    player.gold -= innPrice();
    player.hp = st.maxHp;
    player.mp = st.maxMp;
    showToast('好好休息了一晚，HP／MP 全滿');
    refreshUI();
}

// ───────── 倉庫 ─────────
function moveInst(uid, from, to) {
    const it = removeInst(uid, from);
    if (!it) return;
    const def = ITEMS[it.id];
    const same = isStackable(def) && to.find(x => x.id === it.id);
    if (same) same.n += it.n; else to.push(it);
}
function depositItem(uid) { if (inTown()) { moveInst(uid, player.inv, player.storage); refreshUI(); } }
function withdrawItem(uid) {
    if (!inTown()) return;
    const it = findInv(uid, player.storage);
    if (it && invWeight() + ITEMS[it.id].wt * it.n > calcStats().weightMax) { showToast('負重不足'); return; }
    moveInst(uid, player.storage, player.inv);
    refreshUI();
}

// ───────── 鍛造 ─────────
function recipeMissing(r) {
    const miss = [];
    for (const id in r.need) {
        const have = isStackable(ITEMS[id]) ? countItem(id) : player.inv.filter(x => x.id === id).length;
        if (have < r.need[id]) miss.push(`${ITEMS[id].name} ${have}/${r.need[id]}`);
    }
    if (player.gold < r.gold) miss.push(`金幣 ${fmt(r.gold)}`);
    return miss;
}

function craftItem(idx) {
    const r = RECIPES[idx];
    if (!inTown() || !r || recipeMissing(r).length) { showToast('材料不足'); return; }
    for (const id in r.need) {
        if (isStackable(ITEMS[id])) consumeItem(id, r.need[id]);
        else {
            // 優先用掉強化值最低的那件
            player.inv.filter(x => x.id === id).sort((a, b) => (a.ench || 0) - (b.ench || 0))
                .slice(0, r.need[id]).forEach(x => removeInst(x.uid));
        }
    }
    player.gold -= r.gold;
    addItem(r.out, 1);
    addLog(`🔨 鍛造成功：${ITEMS[r.out].name}`, 'rare');
    gameAlert('🔨 鍛造成功', `獲得 ${ITEMS[r.out].name}！`);
    saveGame();
    refreshUI();
}
