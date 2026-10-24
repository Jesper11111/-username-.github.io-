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
    openTabs = []; currentTab = 'hunt';   // 傳送後回到地圖（關掉所有視窗）
    renderTabs();
    refreshUI();
}

// ───────── 商店 ─────────
function shopItemIds() {
    const tier = currentTown().tier;
    // 變形卷軸暫停販售；魔法書只賣自己職業學得會的（spellbook.js）
    return Object.keys(ITEMS).filter(id => id !== 'polyScroll' && ITEMS[id].price && ITEMS[id].tier <= tier && !(ITEMS[id].cat === 'book' && !skillNeedLv(SKILL_BY_ID[ITEMS[id].skill], player.cls)));
}

// 箭矢／子彈（彈藥）每次以 100 個為單位購買
function shopUnit(id) { return ITEMS[id] && ITEMS[id].cat === 'ammo' ? 100 : 1; }
// 彈藥單價是小數（箭 0.1），總價取整；n 一定是單位的倍數，所以一律是整數金幣
function shopCost(id, n) { return Math.round(ITEMS[id].price * n); }
function shopPriceText(id) { const u = shopUnit(id); return u > 1 ? `💰 ${fmt(shopCost(id, u))}／${u} 個` : `💰 ${fmt(ITEMS[id].price)}`; }

function buyItem(id, n) {
    if (!inTown()) return;
    const d = ITEMS[id];
    if (!shopItemIds().includes(id)) return;
    if (!Number.isSafeInteger(n) || n < 1) { showToast('請輸入 1 以上的整數數量'); return; }
    if (n % shopUnit(id)) { showToast(`${d.name}每次以 ${shopUnit(id)} 個為單位購買`); return; }
    const cost = shopCost(id, n);
    if (!Number.isSafeInteger(cost)) { showToast('購買數量太大'); return; }
    if (player.gold < cost) { showToast('金幣不足'); return; }
    if (invWeight() + d.wt * n > calcStats().weightMax) { showToast('負重不足，背不動了'); return; }
    player.gold -= cost;
    addItem(id, n);
    showToast(`購買 ${d.name} ×${n}（-${fmt(cost)}）`);
    sfx('coin');
    refreshUI();
    return true;
}

function shopBuyLimit(id) {
    const d = ITEMS[id];
    if (!d || !inTown() || !shopItemIds().includes(id)) return 0;
    // 以「一單位」（彈藥 100 個）來算，避免小數單價的浮點誤差
    const weight = invWeight(), maxWeight = calcStats().weightMax, unit = shopUnit(id), price = shopCost(id, unit), wt = d.wt * unit;
    let n = Math.max(0, Math.min(Math.floor(player.gold / price), Math.floor(Number.MAX_SAFE_INTEGER / price / unit), wt > 0 ? Math.floor((maxWeight - weight) / wt) : Number.MAX_SAFE_INTEGER));
    if (n > 0 && weight + wt * n > maxWeight) n--;
    return n * unit;
}
function shopBuyQuantity() {
    const input = document.getElementById('shop-buy-qty'), text = input ? input.value.trim() : '';
    const n = /^\d+$/.test(text) ? Number(text) : 0;
    return Number.isSafeInteger(n) && n > 0 ? n : 0;
}
function shopBuyPreview(id) {
    const info = document.getElementById('shop-buy-total'), d = ITEMS[id];
    if (!info || !d || !inTown()) return;
    const n = shopBuyQuantity(), cost = shopCost(id, n), limit = shopBuyLimit(id);
    info.textContent = !n ? '請輸入 1 以上的整數數量。' : n % shopUnit(id) ? `請輸入 ${shopUnit(id)} 的倍數。` : !Number.isSafeInteger(cost) ? '購買數量太大。' : `總價：💰 ${fmt(cost)}　${n > limit ? '超過目前可購買數量。' : ''}`;
}
function shopBuyCustom(id) {
    const n = shopBuyQuantity();
    if (!n) { showToast('請輸入 1 以上的整數數量'); return; }
    if (buyItem(id, n)) closeDialog();
}
function openShopBuy(id) {
    if (!inTown() || !shopItemIds().includes(id)) return;
    const buyer = player, town = player.loc.id, d = ITEMS[id], unit = shopUnit(id);
    openDialog('購買・' + d.name, `<p>單價：${shopPriceText(id)}｜目前最多可買 ${fmt(shopBuyLimit(id))} 個（依金幣與負重）${unit > 1 ? `｜每次以 ${unit} 個為單位` : ''}</p><label>購買數量<input id="shop-buy-qty" type="number" inputmode="numeric" min="${unit}" step="${unit}" value="${unit}" style="width:100%;margin-top:8px" oninput="shopBuyPreview('${id}')"></label><p id="shop-buy-total" class="muted" aria-live="polite"></p>`, [
        { text: '取消', cls: 'secondary' },
        { text: '購買', keep: true, onClick: () => {
            if (player !== buyer || !inTown() || player.loc.id !== town) { showToast('角色或所在地已變更，請重新選擇商品'); closeDialog(); return; }
            shopBuyCustom(id);
        } }
    ]);
    shopBuyPreview(id);
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
// 依數量搬（合併的列，ui-panels.js groupInv；第 122 節）：一疊只搬 n 個（剩下的留原處）、不可堆疊搬前 n 件
function moveQty(uid, n, from, to) {
    const it = findInv(uid, from);
    if (!it) return;
    if (!isStackable(ITEMS[it.id]) || n >= it.n) { moveInst(uid, from, to); return; }
    it.n -= n;
    const same = to.find(x => x.id === it.id);
    if (same) same.n += n; else to.push({ uid: player.nextUid++, id: it.id, n });
}
function moveGroupN(uid, qid, from, to, check) {
    if (!inTown()) return;
    const x = findInv(uid, from), g = x && invGroupOf(from, x);
    if (!g) return;
    const n = qtyRead(qid, g.n);
    if (!n) return;
    const picks = groupPicks(g, n);
    if (check && !check(picks)) return;
    for (const [u, k] of picks) moveQty(u, k, from, to);
    refreshUI();
}
function depositN(uid, qid) { moveGroupN(uid, qid, player.inv, player.storage); }
function withdrawN(uid, qid) {
    moveGroupN(uid, qid, player.storage, player.inv, picks => {
        const wt = picks.reduce((a, [u, k]) => a + ITEMS[findInv(u, player.storage).id].wt * k, 0);
        if (invWeight() + wt > calcStats().weightMax) { showToast('負重不足'); return false; }
        return true;
    });
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
    sfx('treasure');
    gameAlert('🔨 鍛造成功', `獲得 ${ITEMS[r.out].name}！`);
    saveGame();
    refreshUI();
}
