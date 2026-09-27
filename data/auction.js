// 千寶閣（拍賣場）：每 3 小時刷新 5 件商品，售完或刷新前不再變動
// 紫／橙商品有機率遇到其他客人搶拍（#auction-bid-modal，設定在 config-daily-quests.js 的 AUCTION_RIVAL_*）
// 下方另有常駐的「珍貴物資」區（功德自動凝結七彩補天石 → 破障丹），由 merit.js 的 renderPreciousSection() 產生
// 解鎖條件（聲望 5000）由 activity.js 統一把關

function openAuctionModal() {
    refreshAuctionIfDue();
    document.getElementById('auction-modal').style.display = 'flex';
    renderAuction();
}

function refreshAuctionIfDue(force) {
    const now = Date.now();
    player.auctionRefreshAt = clampRefreshAt(player.auctionRefreshAt, AUCTION_REFRESH_HOURS);   // 時間軸保護（ui.js）
    if (!force && player.auctionRefreshAt && now < player.auctionRefreshAt
        && Array.isArray(player.auctionItems) && player.auctionItems.length > 0) {
        return false;
    }

    player.auctionItems = [];
    for (let i = 0; i < AUCTION_ITEM_COUNT; i++) {
        player.auctionItems.push(rollAuctionItem());
    }
    player.auctionRefreshAt = now + AUCTION_REFRESH_HOURS * 3600 * 1000;

    addLog(`🏺 千寶閣已上架 ${AUCTION_ITEM_COUNT} 件新商品！`, "system");
    return true;
}

// 付費立即刷新：換一批商品，但定時刷新的時間軸不變（下次上架時間照舊）
function paidRefreshAuction() {
    // 看搶拍視窗是否開著（auctionBidItemId 搶拍結束後不會清空，不能拿來判斷）
    if (document.getElementById('auction-bid-modal').style.display === 'flex') { alert("搶拍進行中，無法刷新商品！"); return; }
    if (!payForRefresh('auction', AUCTION_PAID_REFRESH_COST, AUCTION_PAID_REFRESH_DAILY, '千寶閣')) return;
    const keepAt = player.auctionRefreshAt;
    refreshAuctionIfDue(true);
    if (keepAt > Date.now()) player.auctionRefreshAt = keepAt;
    addLog(`💰 花費 ${AUCTION_PAID_REFRESH_COST.toWan()} 靈石請千寶閣提前換貨。`, "system");
    updateUI();
    renderAuction();
}

// 每個商品欄位先判定是否上架壽元丹（auctionLifePills 的機率），沒抽中才上架裝備
function rollAuctionItem() {
    let pillRand = Math.random();
    let pillCumulative = 0;
    for (let pill of auctionLifePills) {
        pillCumulative += pill.chance;
        if (pillRand < pillCumulative) {
            return {
                id: Date.now() + "_" + Math.floor(Math.random() * 100000),
                kind: "lifePill",
                pillId: pill.id,
                price: pill.coins,
                repPrice: pill.rep,
                sold: false
            };
        }
    }
    if (Math.random() < IRON_BAG_CHANCE) return rollIronBagItem();   // 星允鐵袋（enhance.js）
    return rollAuctionEquip();
}

// 依機率抽出品質，再依人物等級決定裝備等級（config-daily-quests.js 的 AUCTION_GEAR_* ／ AUCTION_PLATINUM_*）
function rollAuctionEquip() {
    // 當前檔 = 不超過人物等級的最高 EQUIP_LEVELS（最低 10 級）
    const cur = Math.max(0, EQUIP_LEVELS.filter(l => l <= player.level).length - 1);
    const platinum = Math.random() < AUCTION_PLATINUM_CHANCE;
    let qualityObj, tier;
    if (platinum) {
        qualityObj = PLATINUM_QUALITY;
        tier = Math.max(0, cur - AUCTION_PLATINUM_TIERS_BELOW);
    } else {
        let rand = Math.random();
        let cumulative = 0;
        let qualityName = auctionQualityOdds[auctionQualityOdds.length - 1].quality;
        for (let odd of auctionQualityOdds) {
            cumulative += odd.chance;
            if (rand <= cumulative) { qualityName = odd.quality; break; }
        }
        qualityObj = equipQualities.find(q => q.name === qualityName);
        tier = Math.max(0, cur - (Math.random() < AUCTION_GEAR_PREV_TIER_CHANCE ? 1 : 0));
    }
    const level = EQUIP_LEVELS[tier];

    // 只從可鍛造部位中挑選（神器不在拍賣場流通），再從該部位的「拍賣」清單抽一種（gear.js）；套裝部件一律不賣
    const slots = Object.keys(equipTypes).filter(name => !NON_FORGEABLE_SLOTS.includes(name));
    let def = null;
    for (let i = 0; i < 20 && (!def || def.set); i++) def = pickGearDef(slots[Math.floor(Math.random() * slots.length)], 'auction');

    // 四維與鍛造／奪寶同公式；拍賣屬外界管道，buildGearStats 會再 × GEAR_EXTERNAL_MULT
    // 橙裝上架時就決定孔數（createGearEquip → ensureSockets），買家看得到；白金比照橙裝進化而來的也有孔
    const eq = createGearEquip(def, qualityObj, level * EQUIP_LEVEL_STAT_MULT * qualityObj.mult, level, true);   // 買下才記入天磯錄
    if (platinum && !Array.isArray(eq.sockets)) eq.sockets = Array(SOCKET_MIN + Math.floor(Math.random() * (SOCKET_MAX - SOCKET_MIN + 1))).fill(null);

    return {
        id: Date.now() + "_" + Math.floor(Math.random() * 100000),
        price: platinum ? AUCTION_PLATINUM_PRICE : Math.floor(800 * qualityObj.mult * (player.realmIndex + 1)),
        sold: false,
        equip: eq
    };
}

// 商品的品質與名稱（搶拍判定、競拍視窗用）
function getAuctionItemInfo(item) {
    if (item.kind === "lifePill") {
        const pill = auctionLifePills.find(p => p.id === item.pillId);
        return { quality: pill ? pill.quality : "白色", name: pill ? pill.name : "壽元丹" };
    }
    if (item.kind === "ironBag") return { quality: "星允鐵", name: `星允鐵袋（${item.amount} 顆）` };   // 不在搶拍品質內
    return { quality: item.equip.quality, name: `${item.equip.quality}·${item.equip.element}屬性【${getEquipDisplayName(item.equip)}】` };
}

// 付款前的檢查（背包空位、靈石、聲望）；price 為實際成交價（競拍後可能高於底價）
function canPayAuctionItem(item, price) {
    if (item.kind === "lifePill" || item.kind === "ironBag") {
        if (player.coins < price || (player.reputation || 0) < item.repPrice) {
            alert(`資源不足！\n需要 ${price.toWan()} 靈石 + ${item.repPrice.toWan()} 聲望。\n你目前有 ${player.coins.toWan()} 靈石、${(player.reputation || 0).toWan()} 聲望。`);
            return false;
        }
        return true;
    }
    if (!hasEquipInventorySpace()) return false;
    if (player.coins < price) {
        alert(`靈石不足！\n需要 ${price.toWan()} 靈石，你目前只有 ${player.coins.toWan()} 靈石。`);
        return false;
    }
    return true;
}

function buyAuctionItem(itemId) {
    const item = player.auctionItems.find(i => i.id === itemId);
    if (!item || item.sold) return;
    if (!canPayAuctionItem(item, item.price)) return;

    // 搶拍：紫／橙商品第一次按下時擲一次是否有對手（結果存進商品，不會重擲）
    if (item.rival === undefined) {
        let chance = AUCTION_RIVAL_CHANCE[getAuctionItemInfo(item).quality] || 0;
        item.rival = Math.random() < chance ? {
            name: auctionRivalNames[Math.floor(Math.random() * auctionRivalNames.length)],
            max: Math.floor(item.price * (AUCTION_RIVAL_MAX_MULT_MIN + Math.random() * (AUCTION_RIVAL_MAX_MULT_MAX - AUCTION_RIVAL_MAX_MULT_MIN))),
            out: false
        } : null;
        if (item.rival) {
            // 對手搶先出價（底價 +10%）
            item.bid = { current: getRivalBid(item, item.price), leader: "rival",
                         history: [`${item.rival.name}：「這件我要了！」出價 ${getRivalBid(item, item.price).toWan()}`] };
        }
    }
    if (item.rival && !item.rival.out) {
        openAuctionBid(item.id);
        return;
    }
    completeAuctionPurchase(item, item.bid ? item.bid.current : item.price);
}

function getRivalBid(item, current) {
    return current + Math.ceil(item.price * AUCTION_BID_STEPS[0]);
}

// 成交：扣款並交付商品（裝備進背包、壽元丹當場服用）
function completeAuctionPurchase(item, price) {
    if (!canPayAuctionItem(item, price)) return false;
    player.coins -= price;
    item.sold = true;
    let contested = item.rival ? `力壓${item.rival.name}，` : '';
    if (item.kind === "lifePill") {
        const pill = auctionLifePills.find(p => p.id === item.pillId);
        player.reputation -= item.repPrice;
        player.lifespan += pill.years;
        addLog(`🏺 ${contested}於千寶閣以 ${price.toWan()} 靈石標下【${pill.name}】並當場服下，續命 ${pill.years} 年！（剩餘壽元 ${formatLifespan(player.lifespan)} 年）`, "heal", false, "item");
        toastBought(pill.name);
    } else if (item.kind === "ironBag") {
        player.reputation -= item.repPrice;
        player.starIron = (player.starIron || 0) + item.amount;
        addLog(`🏺 於千寶閣以 ${price.toWan()} 靈石＋${item.repPrice.toWan()} 聲望購得【星允鐵袋】，星允鐵 +${item.amount}！（持有 ${player.starIron.toWan()}）`, "level-up", false, "item");
        toastBought(`星允鐵袋（星允鐵 +${item.amount}）`);
    } else {
        player.equipInventory.push(item.equip);   // 孔位在上架時就決定；更新前上架的舊商品沒有孔，也不補
        recordGearCollected(item.equip);          // 天磯錄：買下才算收藏（上架時不記）
        checkTitleUnlocks();
        addLog(`🏺 ${contested}於千寶閣以 ${price.toWan()} 靈石標下【${item.equip.quality}·${item.equip.element}屬性】的【${getEquipDisplayName(item.equip)}】！`, "equip");
        toastBought(`${getEquipDisplayName(item.equip)}（已放入背包）`);
    }
    renderAuction();
    updateUI();
    return true;
}

// ---- 搶拍視窗（#auction-bid-modal）----
let auctionBidItemId = null;

function openAuctionBid(itemId) {
    auctionBidItemId = itemId;
    renderAuctionBid();
    document.getElementById('auction-bid-modal').style.display = 'flex';
}

function renderAuctionBid() {
    const container = document.getElementById('auction-bid-container');
    const item = player.auctionItems.find(i => i.id === auctionBidItemId);
    if (!container || !item || !item.bid) return;
    const info = getAuctionItemInfo(item);
    const bid = item.bid;
    const leaderText = bid.leader === "player" ? `<b style="color:#4ade80;">你</b>` : `<b style="color:#f87171;">${item.rival.name}</b>`;
    const stepBtns = AUCTION_BID_STEPS.map(step => {
        let next = bid.current + Math.ceil(item.price * step);
        return `<button class="shop-btn" ${player.coins < next ? 'disabled' : ''} onclick="raiseAuctionBid(${step})">加價 ${Math.round(step * 100)}%（出價 ${next.toWan()}）</button>`;
    }).join('');
    container.innerHTML = `
        <h3 class="quality-${info.quality}" style="margin: 0 0 6px;">${info.name}</h3>
        <p style="color: #9ca3af; font-size: 0.85em; margin: 0;">底價 ${item.price.toWan()} 靈石${item.kind === "lifePill" ? ` + ${item.repPrice.toWan()} 聲望（聲望不隨競價增加）` : ''}</p>
        <p style="font-size: 1.1em; margin: 10px 0;">目前最高出價：<b style="color: var(--accent);">${bid.current.toWan()}</b> 靈石（領先：${leaderText}）</p>
        <div class="auction-bid-log">${bid.history.slice(-6).map(h => `<div>${h}</div>`).join('')}</div>
        <p style="color: #9ca3af; font-size: 0.8em;">持有靈石 ${player.coins.toWan()}</p>
        <div class="batch-btns">${stepBtns}</div>
        <button class="sys-btn" style="margin-top: 8px; border-color: #f87171; color: #f87171;" onclick="giveUpAuctionBid()">放棄（讓給對方）</button>`;
}

// 玩家加價：step 為底價的比例；對手在心理價位內就跟價，否則退出、玩家得標
function raiseAuctionBid(step) {
    const item = player.auctionItems.find(i => i.id === auctionBidItemId);
    if (!item || item.sold || !item.bid || !item.rival) return;
    let next = item.bid.current + Math.ceil(item.price * step);
    if (!canPayAuctionItem(item, next)) return;
    item.bid.current = next;
    item.bid.leader = "player";
    item.bid.history.push(`你：出價 ${next.toWan()}`);

    let rivalNext = getRivalBid(item, next);
    if (rivalNext <= item.rival.max) {
        item.bid.current = rivalNext;
        item.bid.leader = "rival";
        item.bid.history.push(`${item.rival.name}：冷笑一聲，跟價 ${rivalNext.toWan()}`);
        renderAuctionBid();
        renderAuction();
        return;
    }
    // 對手超出心理價位 → 退出，玩家以目前出價得標
    item.rival.out = true;
    item.bid.history.push(`${item.rival.name}：搖頭嘆息，放棄競拍`);
    closeModal('auction-bid-modal');
    completeAuctionPurchase(item, next);
}

function giveUpAuctionBid() {
    const item = player.auctionItems.find(i => i.id === auctionBidItemId);
    if (!item || item.sold || !item.rival) return;
    item.sold = true;
    item.soldTo = item.rival.name;
    addLog(`🏺 你放棄競拍，${getAuctionItemInfo(item).name}被${item.rival.name}以 ${item.bid.current.toWan()} 靈石標走了。`, "system");
    closeModal('auction-bid-modal');
    renderAuction();
}

// 商品卡片的競拍狀態列與按鈕（搶拍進行中／被對手標走）
function renderAuctionBuyArea(item, buyLabel) {
    let status = '';
    if (item.soldTo) status = `<p style="font-size: 0.78em; color: #f87171; margin: 2px 0;">已被 ${item.soldTo} 以 ${item.bid.current.toWan()} 靈石標走</p>`;
    else if (!item.sold && item.rival && !item.rival.out && item.bid) {
        status = `<p style="font-size: 0.78em; color: #fb923c; margin: 2px 0;">⚔️ ${item.rival.name} 正在競拍！目前出價 ${item.bid.current.toWan()}（${item.bid.leader === 'player' ? '你領先' : '對方領先'}）</p>`;
        buyLabel = '繼續競拍';
    } else if (!item.sold && AUCTION_RIVAL_CHANCE[getAuctionItemInfo(item).quality] && item.rival === undefined) {
        status = `<p style="font-size: 0.75em; color: #9ca3af; margin: 2px 0;">珍品：可能有其他客人搶拍</p>`;
    }
    return `${status}
                <button class="shop-btn" ${item.sold ? 'disabled' : ''} onclick="buyAuctionItem('${item.id}')">
                    ${item.sold ? (item.soldTo ? '已被標走' : '已售出') : buyLabel}
                </button>`;
}

function renderAuctionLifePillCard(item) {
    const pill = auctionLifePills.find(p => p.id === item.pillId);
    if (!pill) return '';
    return `
            <div class="card" style="border-color: ${item.sold ? 'rgba(255,255,255,0.07)' : 'var(--accent)'}; opacity: ${item.sold ? 0.45 : 1};">
                <h3 class="quality-${pill.quality}">⏳ ${pill.name}</h3>
                <p style="font-size: 0.82em; color: #9ca3af;">品質: <span class="quality-${pill.quality}">${pill.quality}</span></p>
                <p style="font-size: 0.78em; color: #4ade80;">效果: 立即續命 +${pill.years} 年</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${item.price.toWan()} 靈石 + ${item.repPrice.toWan()} 聲望</p>
                ${renderAuctionBuyArea(item, '標下並服用')}
            </div>`;
}

function renderAuction() {
    const container = document.getElementById('auction-container');
    if (!container) return;

    refreshAuctionIfDue();

    const cards = player.auctionItems.map(item => {
        if (item.kind === "lifePill") return renderAuctionLifePillCard(item);
        if (item.kind === "ironBag") return `
            <div class="card" style="border-color: ${item.sold ? 'rgba(255,255,255,0.07)' : 'var(--accent)'}; opacity: ${item.sold ? 0.45 : 1};">
                <h3 style="color: var(--accent);">🌠 星允鐵袋</h3>
                <p style="font-size: 0.78em; color: #4ade80;">內含星允鐵 ×${item.amount}（強化裝備用）</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${item.price.toWan()} 靈石 + ${item.repPrice.toWan()} 聲望</p>
                ${renderAuctionBuyArea(item, '購買')}
            </div>`;
        const eq = item.equip;
        const plat = eq.quality === PLATINUM_QUALITY.name;
        return `
            <div class="card" style="border-color: ${item.sold ? 'rgba(255,255,255,0.07)' : plat ? PLATINUM_QUALITY.color : 'var(--accent)'}; opacity: ${item.sold ? 0.45 : 1};${plat && !item.sold ? ' box-shadow: 0 0 12px rgba(229,231,235,0.35);' : ''}">
                ${plat ? `<p style="font-size: 0.75em; color: ${PLATINUM_QUALITY.color}; margin: 0 0 2px;">✨ 千寶閣鎮閣之寶・${PLATINUM_QUALITY.label}</p>` : ''}
                <h3 class="quality-${eq.quality}">${formatEquipTitle(eq)}</h3>
                <p style="font-size: 0.82em; color: #9ca3af;">${formatGearSubline(eq)} | <span class="quality-${eq.quality}">${eq.quality}</span> | 屬性: <span class="elem-${eq.element}">${eq.element}</span></p>
                ${formatEquipDetails(eq)}
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${item.price.toWan()} 靈石</p>
                ${renderAuctionBuyArea(item, '標下')}
            </div>`;
    }).join("");

    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 20px; margin-bottom: 14px; font-size: 0.88em;">
            <span style="color: #9ca3af;">每 ${AUCTION_REFRESH_HOURS} 小時上架 ${AUCTION_ITEM_COUNT} 件商品</span>
            <span style="color: var(--accent);">下次上架：${formatCountdown(player.auctionRefreshAt - Date.now())}</span>
        </div>
        ${renderPaidRefreshButton('auction', AUCTION_PAID_REFRESH_COST, AUCTION_PAID_REFRESH_DAILY, 'paidRefreshAuction')}
        <div class="grid-container">${cards}</div>
        ${renderIronShopSection()}
        ${renderPreciousSection()}`;
}
