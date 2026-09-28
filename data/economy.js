// 賺錢管道（ARCHITECTURE.md 第 61 節）：① 坊市回收、② 僕從商隊（收益計算）、③ 洞府產業、④ 職業加成、⑤ 懸賞靈石的共用換算
// 數值在 config-economy.js。存檔欄位（用到時才建立）：
//   player.marketSell = { date, total }（今日已回收的靈石）、player.autoSellFull（背包滿時白～紫自動賣出）
//   player.caravanDaily = { date, n }（今日商隊已出發趟數）、player.estate = { field: { lv, last }, mine: { lv, last } }

function economyToday() { return new Date().toDateString(); }

// H＝目前境界主要練功地圖掛機 1 小時的靈石（config-realms.js 的 realmPacing → 該地圖 coins × 每小時擊殺數）
function getHourlyIncome(realmIndex) {
    const r = typeof realmIndex === 'number' ? realmIndex : player.realmIndex;
    const pace = realmPacing[Math.max(0, Math.min(r, realmPacing.length - 1))];
    let coins = 0;
    maps.forEach(cat => cat.items.forEach(m => { if (m.name === pace.map) coins = m.coins || 0; }));
    return Math.max(1, coins * KILLS_PER_HOUR_ESTIMATE);
}
function incomeMinutes(min) { return getHourlyIncome() / 60 * min; }

// ==================== ① 坊市回收 ====================
function marketSellState() {
    const today = economyToday();
    if (!player.marketSell || player.marketSell.date !== today) player.marketSell = { date: today, total: 0 };
    return player.marketSell;
}
function marketDailyCap() { return Math.floor(getHourlyIncome() * MARKET_SELL.dailyCapHours); }
function marketCapLeft() { return Math.max(0, marketDailyCap() - marketSellState().total); }
// ④ 主修職業熟練度加成（每階 +2%）
function marketProfBonus() {
    const p = typeof getProfession === 'function' ? getProfession(player.profession) : null;
    return p ? getProfRank(p.id) * MARKET_SELL.profRankBonus : 0;
}
// 裝備等級係數：0.5 ＋ 0.5 × 裝備等級 ÷ 目前人物等級可穿的最高檔（EQUIP_LEVELS＋圖紙檔 BLUEPRINT_LEVELS）
function getEquipLevelFactor(eq) {
    const all = EQUIP_LEVELS.concat(typeof BLUEPRINT_LEVELS !== 'undefined' ? BLUEPRINT_LEVELS : []);
    const top = Math.max(EQUIP_LEVELS[0], ...all.filter(l => l <= player.level));
    return 0.5 + 0.5 * Math.min(1, (eq.level || EQUIP_LEVELS[0]) / top);
}
function equipSellPrice(eq) {
    const m = MARKET_SELL.equipMinutes[eq.quality];
    if (!m || eq.category === 'artifact') return 0;
    return Math.max(1, Math.floor(incomeMinutes(m) * getEquipLevelFactor(eq) * (1 + marketProfBonus())));
}
function pillSellPrice(item) { return Math.max(1, Math.floor(item.cost * MARKET_SELL.pillRate * (1 + marketProfBonus()))); }
function shardSellPrice() { return Math.max(1, Math.floor(incomeMinutes(MARKET_SELL.shardMinutes) * (1 + marketProfBonus()))); }
function ironSellPrice() { return Math.max(1, Math.floor(incomeMinutes(MARKET_SELL.ironMinutes) * (1 + marketProfBonus()))); }

// 入帳並計入今日額度
function marketCredit(coins) {
    player.coins += coins;
    marketSellState().total += coins;
}
function canSellEquip(eq) { return eq && eq.category !== 'artifact' && !isEquipLocked(eq) && !!MARKET_SELL.equipMinutes[eq.quality]; }

// 依品級賣出背包裝備（略過鎖定、神器）；額度用完就停。qualities：品級名稱陣列
function sellEquipByQualities(qualities) {
    const targets = player.equipInventory.filter(eq => qualities.includes(eq.quality) && canSellEquip(eq));
    if (!targets.length) { alert(`背包沒有未鎖定的【${qualities.join('、')}】裝備。`); return; }
    const total = targets.reduce((s, eq) => s + equipSellPrice(eq), 0);
    if (!confirm(`確定賣出背包內 ${targets.length} 件【${qualities.join('、')}】裝備？\n約可得 ${total.toWan()} 靈石（今日剩餘額度 ${marketCapLeft().toWan()}，額度用完會停止）。\n鑲嵌的符寶會一起賣掉，🔒 鎖定的不會賣。`)) return;
    let sold = 0, got = 0;
    for (const eq of targets) {
        const p = equipSellPrice(eq);
        if (p > marketCapLeft()) continue;   // 這件超過剩餘額度就跳過，便宜的照賣
        player.equipInventory = player.equipInventory.filter(e => e !== eq);
        marketCredit(p); sold++; got += p;
    }
    if (!sold) { alert(`今日回收額度只剩 ${marketCapLeft().toWan()} 靈石，不夠賣這些裝備，明天再來！`); return; }
    addLog(`🏪 坊市回收：賣出 ${sold} 件裝備，獲得 ${got.toWan()} 靈石。${sold < targets.length ? `（今日額度已滿，剩 ${targets.length - sold} 件未賣）` : ''}`, "system", false, "item");
    afterMarketSell();
}
// 丹藥堂丹藥：qty 為數字或 'all'
function sellPill(id, qty) {
    const item = shopItems.find(s => s.id === id);
    const have = (player.bag || {})[id] || 0;
    if (!item || have <= 0) return;
    const price = pillSellPrice(item);
    let n = Math.min(have, qty === 'all' ? have : qty, Math.floor(marketCapLeft() / price));
    if (n <= 0) { alert('今日回收額度已用完，明天再來！'); return; }
    player.bag[id] -= n; if (player.bag[id] <= 0) delete player.bag[id];
    marketCredit(n * price);
    addLog(`🏪 坊市回收：賣出【${item.name}】×${n}，獲得 ${(n * price).toWan()} 靈石。`, "system", false, "item");
    afterMarketSell();
}
// 異火碎片（kind 'shard'）／星允鐵（'iron'）：qty 為數字或 'all'
function sellMaterial(kind, qty) {
    const field = kind === 'iron' ? 'starIron' : 'fireShards';
    const name = kind === 'iron' ? '星允鐵' : '異火碎片';
    const price = kind === 'iron' ? ironSellPrice() : shardSellPrice();
    const have = player[field] || 0;
    let n = Math.min(have, qty === 'all' ? have : qty, Math.floor(marketCapLeft() / price));
    if (have <= 0) { alert(`沒有${name}可以賣。`); return; }
    if (n <= 0) { alert('今日回收額度已用完，明天再來！'); return; }
    player[field] = have - n;
    marketCredit(n * price);
    addLog(`🏪 坊市回收：賣出${name} ×${n}，獲得 ${(n * price).toWan()} 靈石。`, "system", false, "item");
    afterMarketSell();
}
function afterMarketSell() {
    renderMarketSellModal();
    if (typeof renderBag === 'function' && document.getElementById('bag-modal').style.display === 'flex') renderBag();
    updateUI();
}
// 背包滿時自動賣出（enhance.js 的 receiveLootEquip 呼叫）：開啟設定、白～紫、額度夠才賣，回傳得到的靈石（0 = 沒賣）
function tryAutoSellLoot(eq) {
    if (!player.autoSellFull || !canSellEquip(eq) || eq.quality === '橙色' || eq.quality === '白金') return 0;
    const p = equipSellPrice(eq);
    if (p > marketCapLeft()) return 0;
    marketCredit(p);
    return p;
}
function toggleAutoSellFull() {
    player.autoSellFull = !player.autoSellFull;
    renderMarketSellModal();
}

function openMarketSellModal() {
    document.getElementById('market-sell-modal').style.display = 'flex';
    renderMarketSellModal();
}
function renderMarketSellModal() {
    const box = document.getElementById('market-sell-body');
    if (!box || document.getElementById('market-sell-modal').style.display !== 'flex') return;
    const st = marketSellState(), cap = marketDailyCap(), left = marketCapLeft();
    const prof = marketProfBonus();
    const inv = player.equipInventory || [];
    const qRows = Object.keys(MARKET_SELL.equipMinutes).map(q => {
        const list = inv.filter(eq => eq.quality === q && canSellEquip(eq));
        const sum = list.reduce((s, eq) => s + equipSellPrice(eq), 0);
        return `<div class="ms-row"><span class="quality-${q}">${q}</span><span>${list.length} 件・約 ${sum.toWan()}</span>
            <button class="sys-btn" ${list.length ? '' : 'disabled'} onclick="sellEquipByQualities(['${q}'])">賣出</button></div>`;
    }).join('');
    const pills = shopItems.filter(s => (player.bag[s.id] || 0) > 0).map(s => `<div class="ms-row"><span>${s.name} ×${player.bag[s.id]}</span><span>每顆 ${pillSellPrice(s).toWan()}</span>
            <span><button class="sys-btn" onclick="sellPill('${s.id}', 1)">×1</button><button class="sys-btn" onclick="sellPill('${s.id}', 'all')">全部</button></span></div>`).join('')
        || '<div class="ms-empty">背包沒有丹藥堂的丹藥</div>';
    const mat = (kind, label, have, price) => `<div class="ms-row"><span>${label} ×${(have || 0).toWan()}</span><span>每個 ${price.toWan()}</span>
            <span><button class="sys-btn" ${have ? '' : 'disabled'} onclick="sellMaterial('${kind}', 10)">×10</button><button class="sys-btn" ${have ? '' : 'disabled'} onclick="sellMaterial('${kind}', 'all')">全部</button></span></div>`;
    box.innerHTML = `
        <div class="ms-cap">今日已回收 <b>${st.total.toWan()}</b> / ${cap.toWan()} 靈石（剩 ${left.toWan()}，每日 0 點重置）<br>
            <small>額度＝你目前境界掛機 ${MARKET_SELL.dailyCapHours} 小時的收入${prof ? `｜主修職業加成：回收價 +${Math.round(prof * 100)}%` : ''}</small></div>
        <h3>⚔️ 背包裝備（依品級，🔒 鎖定與神器不賣）</h3>
        <div class="ms-quick"><button class="sys-btn" onclick="sellEquipByQualities(['白色','綠色'])">一鍵賣出全部白、綠裝</button></div>
        ${qRows}
        <label class="ms-auto"><input type="checkbox" ${player.autoSellFull ? 'checked' : ''} onchange="toggleAutoSellFull()"> 背包滿時，新掉落的白～紫裝備改為自動賣出（額度用完時照舊分解）</label>
        <h3>💊 丹藥（丹藥堂售價 ${Math.round(MARKET_SELL.pillRate * 100)}%）</h3>${pills}
        <h3>🔥 材料</h3>${mat('shard', '異火碎片', player.fireShards, shardSellPrice())}${mat('iron', '星允鐵', player.starIron, ironSellPrice())}`;
}

// ==================== ② 僕從商隊 ====================
function caravanState() {
    const today = economyToday();
    if (!player.caravanDaily || player.caravanDaily.date !== today) player.caravanDaily = { date: today, n: 0 };
    return player.caravanDaily;
}
function caravanTripsLeft() { return Math.max(0, CARAVAN.dailyTrips - caravanState().n); }
// 出發一趟前呼叫（servant.js 的 payServantTrip）：今日趟數用完回傳 false
function reserveCaravanTrip() {
    if (caravanTripsLeft() <= 0) return false;
    caravanState().n++;
    return true;
}
// 商隊回來的收益（quest.js 的 grantQuestRewards 呼叫）；回傳日誌文字
function grantCaravanReward(servant) {
    const [lo, hi] = CARAVAN.minutes;
    const min = lo + Math.random() * (hi - lo);
    const mult = (servant && CARAVAN.qualityMult[servant.quality]) || 1;
    const coins = Math.floor(incomeMinutes(min) * mult);
    player.coins += coins;
    let text = `${coins.toWan()} 靈石`;
    if (Math.random() < CARAVAN.goodsChance) {
        if (Math.random() < 0.5) {
            const n = addStarIron(randInt(CARAVAN.goodsIron[0], CARAVAN.goodsIron[1]));
            if (n) text += `、星允鐵 ×${n}`;
        } else {
            const n = randInt(CARAVAN.goodsShard[0], CARAVAN.goodsShard[1]);
            player.fireShards = (player.fireShards || 0) + n;
            text += `、異火碎片 ×${n}`;
        }
    }
    return text;
}
function formatCaravanReward() {
    const [lo, hi] = CARAVAN.minutes;
    return `掛機 ${lo}～${hi} 分鐘收入的靈石（約 ${Math.floor(incomeMinutes(lo)).toWan()}～${Math.floor(incomeMinutes(hi) * 2).toWan()}，依僕從品質），${Math.round(CARAVAN.goodsChance * 100)}% 帶回貨物｜今日剩 ${caravanTripsLeft()}/${CARAVAN.dailyTrips} 趟`;
}

// ==================== ③ 洞府產業 ====================
function estateOf(kind) {
    if (!player.estate) player.estate = {};
    if (!player.estate[kind]) player.estate[kind] = { lv: 1, last: Date.now() };   // 第一次打開就送 1 級
    return player.estate[kind];
}
// 目前可收成的數量（累積時數封頂 capHours）
function estatePending(kind) {
    const e = estateOf(kind), k = ESTATE.kinds[kind], i = e.lv - 1;
    const hours = Math.max(0, Math.min(ESTATE.capHours[i], (Date.now() - e.last) / 3600000));
    const out = { hours, full: hours >= ESTATE.capHours[i] - 1e-6, coins: Math.floor(getHourlyIncome() * ESTATE.rate[i] * hours) };
    if (kind === 'field') out.grass = Math.floor(k.grassPerHour[i] * hours);
    if (kind === 'mine') { out.ore = Math.floor(k.orePerHour[i] * hours); out.iron = Math.floor(k.ironPerHour * hours); }
    return out;
}
function collectEstate(kind, silent) {
    const e = estateOf(kind), p = estatePending(kind), k = ESTATE.kinds[kind];
    e.last = Date.now();
    if (p.coins <= 0 && !p.grass && !p.ore && !p.iron) { if (!silent) renderEstateModal(); return ''; }
    player.coins += p.coins;
    const parts = [`${p.coins.toWan()} 靈石`];
    if (p.grass) { player.spiritGrass = (player.spiritGrass || 0) + p.grass; parts.push(`靈草 ×${p.grass}`); }
    if (p.ore) { player.ore = (player.ore || 0) + p.ore; parts.push(`礦石 ×${p.ore}`); }
    if (p.iron) { const n = addStarIron(p.iron); if (n) parts.push(`星允鐵 ×${n}`); }
    const text = `${k.icon} ${k.name}收成（${p.hours.toFixed(1)} 小時）：${parts.join('、')}`;
    addLog(`🏞️ ${text}`, "system", false, "item");
    if (!silent) { renderEstateModal(); updateUI(); }
    return text;
}
function estateUpgradeCost(kind) {
    const e = estateOf(kind);
    return e.lv >= ESTATE.maxLevel ? 0 : Math.floor(getHourlyIncome() * ESTATE.upgradeHours[e.lv - 1]);
}
function upgradeEstate(kind) {
    const e = estateOf(kind), k = ESTATE.kinds[kind];
    if (e.lv >= ESTATE.maxLevel) return;
    const cost = estateUpgradeCost(kind);
    if (player.coins < cost) { alert(`靈石不足！升級${k.name}需要 ${cost.toWan()} 靈石（目前 ${player.coins.toWan()}）。`); return; }
    if (!confirm(`花費 ${cost.toWan()} 靈石，將${k.name}升到 ${e.lv + 1} 級？\n（會先把目前累積的收成領出來）`)) return;
    collectEstate(kind, true);
    player.coins -= cost;
    e.lv++;
    addLog(`🏞️ ${k.icon} ${k.name}升到 ${e.lv} 級：每小時產出提高、可累積 ${ESTATE.capHours[e.lv - 1]} 小時。`, "system", false, "item");
    renderEstateModal();
    updateUI();
}
function openEstateModal() {
    document.getElementById('estate-modal').style.display = 'flex';
    renderEstateModal();
}
function renderEstateModal() {
    const box = document.getElementById('estate-body');
    if (!box || document.getElementById('estate-modal').style.display !== 'flex') return;
    const H = getHourlyIncome();
    box.innerHTML = Object.keys(ESTATE.kinds).map(kind => {
        const k = ESTATE.kinds[kind], e = estateOf(kind), i = e.lv - 1, p = estatePending(kind);
        const perHour = [`${Math.floor(H * ESTATE.rate[i]).toWan()} 靈石`];
        if (kind === 'field') perHour.push(`靈草 ${k.grassPerHour[i]}`);
        if (kind === 'mine') perHour.push(`礦石 ${k.orePerHour[i]}`, `星允鐵 ${k.ironPerHour}`);
        const got = [`${p.coins.toWan()} 靈石`].concat(p.grass ? [`靈草 ${p.grass}`] : [], p.ore ? [`礦石 ${p.ore}`] : [], p.iron ? [`星允鐵 ${p.iron}`] : []);
        const cost = estateUpgradeCost(kind);
        return `<div class="card estate-card">
            <h3>${k.icon} ${k.name}・${e.lv} 級</h3>
            <p class="es-desc">${k.desc}</p>
            <p>每小時：${perHour.join('、')}｜最多累積 ${ESTATE.capHours[i]} 小時</p>
            <p class="es-pending ${p.full ? 'full' : ''}">待收成（${p.hours.toFixed(1)} 小時${p.full ? '・已滿，停止累積' : ''}）：${got.join('、')}</p>
            <button class="sys-btn" onclick="collectEstate('${kind}')">🧺 收成</button>
            ${e.lv < ESTATE.maxLevel ? `<button class="sys-btn" onclick="upgradeEstate('${kind}')">⬆️ 升到 ${e.lv + 1} 級（${cost.toWan()} 靈石）</button>` : '<p class="es-max">已達最高等級</p>'}
        </div>`;
    }).join('') + `<p class="es-note">產量依你目前境界的練功收入計算（境界越高，產量越高）；關掉遊戲期間也會累積，但滿了就停，記得回來收成。</p>`;
}

// ==================== ⑤ 懸賞靈石 ====================
// bounty.js 的 endBountyDuel 勝利時呼叫；回傳得到的靈石
function grantBountyCoins(rankId) {
    const min = BOUNTY_COIN_MINUTES[rankId] || 0;
    if (!min) return 0;
    const coins = Math.floor(incomeMinutes(min));
    player.coins += coins;
    return coins;
}
