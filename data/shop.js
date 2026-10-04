// 丹藥堂彈窗：渲染商品、選擇數量後購買補血/補魔藥品進背包

function openShopModal() {
    if (!checkSectJoined()) return;
    document.getElementById('shop-modal').style.display = 'flex';
    renderShop();
}

function renderShop() {
    const container = document.getElementById('shop-list-container');
    // 依 shopSections 分區（氣血 / 靈力），區塊之間插入分隔線
    container.innerHTML = shopSections.map((section, index) => {
        let cards = shopItems.filter(item => item.type === section.type).map(item => renderShopCard(item)).join("");
        let divider = index > 0
            ? `<hr style="border: none; border-top: 1px solid var(--panel-border); margin: 22px 0 18px;">`
            : "";
        return `${divider}
            <div style="text-align: center; color: ${section.color}; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px;">
                ${section.icon} ${section.title}
            </div>
            <div class="grid-container">${cards}</div>`;
    }).join("");
}

function renderShopCard(item) {
    return `
            <div class="card" style="border-color: var(--shop-color);">
                <h3>${item.name}</h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${item.desc}</p>
                <p style="font-size: 0.85em; color: #facc15;">單價: ${item.cost} 靈石</p>
                <div style="display: flex; align-items: center; gap: 6px; margin: 8px 0;">
                    <span style="font-size: 0.82em; color: #9ca3af; white-space: nowrap;">數量</span>
                    <input type="number" id="qty-${item.id}" value="1" min="1" max="${SHOP_MAX_BUY_QTY}"
                           oninput="updateShopTotal('${item.id}')"
                           style="width: 100%; min-width: 0; background: #0b0f19; border: 1px solid var(--panel-border); color: #fff; text-align: center; border-radius: 4px; padding: 5px;">
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="shop-btn" style="font-size: 0.8em; padding: 6px 4px;" onclick="setShopQty('${item.id}', 10)">x10</button>
                    <button class="shop-btn" style="font-size: 0.8em; padding: 6px 4px;" onclick="setShopQtyMax('${item.id}')">買最多</button>
                </div>
                <p id="total-${item.id}" style="font-size: 0.8em; color: #4ade80; margin: 6px 0;">合計: ${item.cost} 靈石</p>
                <button class="shop-btn" onclick="buyShopItem('${item.id}')">購買</button>
            </div>`;
}

// 讀取卡片上的購買數量（非法輸入回傳 0）
function getShopQty(id) {
    let input = document.getElementById(`qty-${id}`);
    if (!input) return 1;
    let qty = parseInt(input.value, 10);
    if (isNaN(qty) || qty < 1) return 0;
    return Math.min(qty, SHOP_MAX_BUY_QTY);
}

function setShopQty(id, qty) {
    let input = document.getElementById(`qty-${id}`);
    if (!input) return;
    input.value = Math.min(qty, SHOP_MAX_BUY_QTY);
    updateShopTotal(id);
}

function setShopQtyMax(id) {
    let item = shopItems.find(s => s.id === id);
    if (!item) return;
    let affordable = Math.floor(player.coins / item.cost);
    setShopQty(id, Math.max(1, Math.min(affordable, SHOP_MAX_BUY_QTY)));
}

function updateShopTotal(id) {
    let item = shopItems.find(s => s.id === id);
    let display = document.getElementById(`total-${id}`);
    if (!item || !display) return;
    let qty = getShopQty(id);
    let total = item.cost * qty;
    display.innerText = `合計: ${total.toWan()} 靈石`;
    display.style.color = (qty > 0 && player.coins >= total) ? '#4ade80' : '#f87171';
}

function buyShopItem(id) {
    let item = shopItems.find(s => s.id === id);
    if (!item) return;

    let qty = getShopQty(id);
    if (qty <= 0) { gameAlert("請輸入正確的購買數量（至少 1 個）！"); return; }

    let totalCost = item.cost * qty;
    if (player.coins < totalCost) {
        gameAlert(`靈石不足！\n購買【${item.name}】x${qty} 需要 ${totalCost.toWan()} 靈石，你目前只有 ${player.coins.toWan()} 靈石。`);
        return;
    }

    player.coins -= totalCost;
    player.bag[id] = (player.bag[id] || 0) + qty;
    addDailyProgress('buy', qty);
    addLog(`🛒 購買了【${item.name}】x${qty}，花費 ${totalCost.toWan()} 靈石，已存入背包。`, "system", false, "item");
    toastBought(`${item.name} ×${qty}`);
    updateShopTotal(id);
    updateUI();
}
