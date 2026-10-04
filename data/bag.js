// 修仙背包彈窗：渲染道具/裝備、使用道具、刪除道具或裝備

function openBagModal() { document.getElementById('bag-modal').style.display = 'flex'; renderBag(); }

// 背包裝備是否還有空位（上限 MAX_EQUIP_INVENTORY）；已滿時跳提示並回傳 false。
// 所有「會把裝備放進背包」的地方都要在扣資源「之前」先呼叫：鍛造、千寶閣、靈寶閣、卸下裝備。
function hasEquipInventorySpace() {
    if (player.equipInventory.length < MAX_EQUIP_INVENTORY) return true;
    gameAlert(`背包裝備已滿（${player.equipInventory.length} / ${MAX_EQUIP_INVENTORY} 件）！\n請先穿戴或刪除部分裝備。`);
    return false;
}

// ---- 裝備鎖定（eq.locked，隨裝備物件存檔）----
// 鎖定中的裝備不能毀棄、分解，一鍵刪除／分解也會略過；穿戴中的裝備同樣不能刪除（須先卸下）
function isEquipLocked(eq) {
    return !!(eq && eq.locked);
}

function toggleEquipLock(equipId) {
    let loc = locateEquip(equipId);
    if (!loc) return;
    loc.eq.locked = !loc.eq.locked;
    addLog(`${loc.eq.locked ? '🔒 鎖定' : '🔓 解除鎖定'}了裝備【${getEquipDisplayName(loc.eq)}】。`, "equip");
    refreshEquipViews();
}

function formatLockButton(eq) {
    return `<button class="sys-btn" style="${eq.locked ? 'border-color: #facc15; color: #facc15;' : ''}" onclick="toggleEquipLock('${eq.id}')">${eq.locked ? '🔒 已鎖定（點擊解鎖）' : '🔓 鎖定'}</button>`;
}

// 刪除／分解前的共用檢查：鎖定中或穿戴中回傳 false 並提示
function canRemoveEquip(loc) {
    if (!loc) return false;
    if (loc.where === 'equipped') { alert('穿戴中的裝備無法刪除或分解，請先卸下。'); return false; }
    if (isEquipLocked(loc.eq)) { alert(`【${getEquipDisplayName(loc.eq)}】已鎖定，請先解除鎖定。`); return false; }
    return true;
}

// ⚠️ 背包裝備數量沒有上限，比照 renderServants() 先組好整段 HTML 再一次寫入，避免裝備多時卡住
function renderBag() {
    const container = document.getElementById('bag-list-container');
    let parts = [];
    let hasItems = false;

    let equipCount = player.equipInventory ? player.equipInventory.length : 0;
    parts.push(`<div style="grid-column: 1 / -1; text-align: center; font-size: 0.9em; color: ${equipCount >= MAX_EQUIP_INVENTORY ? '#ef4444' : 'var(--accent)'};">
        背包裝備：${equipCount} / ${MAX_EQUIP_INVENTORY} 件${equipCount >= MAX_EQUIP_INVENTORY ? '（已滿，無法再鍛造、購買或卸下裝備）' : ''}
    </div>`);

    // 依品級一鍵刪除裝備（只作用於背包內未穿戴的裝備）
    if (player.equipInventory && player.equipInventory.length > 0) {
        let counts = {};
        player.equipInventory.forEach(eq => { if (!isEquipLocked(eq)) counts[eq.quality] = (counts[eq.quality] || 0) + 1; });
        parts.push(renderBulkDeleteBar(
            "一鍵刪除／分解裝備（依品級）",
            "bulk-equip-quality",
            equipQualities.map(q => q.name),
            counts,
            "bulkDeleteEquipment",
            `※ 只作用於背包內未鎖定的裝備（數量不含鎖定），已穿戴、🔒 鎖定、勾選「保留屬性」的不受影響。分解白～紫得碎鐵（每 ${SHARDS_PER_IRON} 個合成 1 顆星允鐵），橙色得星允鐵 ×${DECOMPOSE_IRON["橙色"]}`,
            `<button class="sys-btn" onclick="bulkDecomposeEquipment()">分解勾選品級</button>`,
            renderKeepElementRow('bulk-keep-element')
        ));
    }

    // 暫存區（enhance.js）：背包滿時新掉落的橙色以上裝備
    parts.push(renderStashSection());
    if ((player.gearStash || []).length > 0) hasItems = true;

    for (let itemId in player.bag) {
        let count = player.bag[itemId];
        if (count > 0) {
            hasItems = true;
            let shopItem = shopItems.find(s => s.id === itemId);
            if (shopItem) {
                parts.push(`
                    <div class="card" style="border-color: #facc15;">
                        <h3 style="color: #facc15;">${shopItem.name} <span style="font-size:0.8em; color:#4ade80;">(x${count})</span></h3>
                        <p style="font-size: 0.85em; color: #9ca3af;">${shopItem.desc}</p>
                        <button class="sys-btn" onclick="useItemFromBag('${itemId}')">直接使用</button>
                        <button style="border-color: #ef4444; color: #ef4444; margin-top: 5px; background: rgba(239,68,68,0.1);" onclick="deleteItemFromBag('${itemId}')">刪除道具</button>
                    </div>`);
            }
        }
    }

    // 珍貴道具（七彩補天石、破障丹）：七彩發光外觀，不能直接使用（補天石於千寶閣消費、破障丹渡劫時自動服用）
    if ((player.starIron || 0) > 0 || (player.ironShards || 0) > 0) {
        hasItems = true;
        parts.push(`
            <div class="card" style="border-color: var(--accent);">
                <h3 style="color: var(--accent);">🌠 星允鐵 <span style="font-size:0.8em;">(x${(player.starIron || 0).toWan()})</span></h3>
                <p style="font-size: 0.85em; color: #9ca3af;">強化裝備的寶物。🔩 碎鐵 ${(player.ironShards || 0).toWan()} / ${SHARDS_PER_IRON}（滿了自動熔鑄 1 顆）</p>
            </div>`);
    }

    // 五行傳送陣靈石（lingjie.js，第 74 節）：不是貨幣的靈石，是放在背包的道具；每種一張卡片
    const LS_ICON = { "金": "🟡", "木": "🟢", "水": "🔵", "火": "🔴", "土": "🟤" };
    LINGJIE_STONE_KEYS.forEach(k => {
        const n = getLingStone(k);
        if (n <= 0) return;
        hasItems = true;
        parts.push(`
            <div class="card" style="border-color: #fbbf24;">
                <img src="${LINGJIE_STONE_IMG[k]}" alt="${k}屬性傳送陣靈石" style="display: block; width: 96px; height: 96px; margin: 0 auto 6px; border-radius: 12px; object-fit: cover; box-shadow: 0 0 14px rgba(253, 230, 138, 0.35);">
                <h3 style="color: #fde68a;">${LS_ICON[k]} <span class="elem-${k}">${k}</span>屬性傳送陣靈石 <span style="font-size:0.8em;">(x${n})</span></h3>
                <p style="font-size: 0.8em; color: #9ca3af;">傳送陣用的五行靈石（不是貨幣）。飛升靈界、從靈界返回人界，各需金木水火土五種各 1 顆${isInLingjie() ? '（🌌 你目前身在靈界）' : ''}</p>
            </div>`);
    });

    // 異火碎片／異火（strange-fire.js）
    let fireCards = renderStrangeFireCards();
    if (fireCards) { hasItems = true; parts.push(fireCards); }

    [["butianStone", player.butianStones], ["breakPill", player.breakPills], ["rootPill", player.rootPills], ["physiquePill", player.physiquePills], ["spiritFruit", player.spiritFruits]].forEach(([key, count]) => {
        if (!(count > 0)) return;
        hasItems = true;
        let item = preciousItems[key] || aptitudeItems[key] || (key === "spiritFruit" ? SPIRIT_FRUIT : null);   // 洗髓丹／伐骨丹（config-aptitude.js）、化神靈果（config-golden-core.js）
        parts.push(`
            <div class="card rainbow-glow">
                <h3 class="rainbow-text">${item.icon} ${item.name} <span style="font-size:0.8em;">(x${count.toWan()})</span></h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${item.desc}</p>
            </div>`);
    });

    // 化神訣殘本（元神，yuanshen.js）
    if (player.huashenScrolls > 0) {
        hasItems = true;
        parts.push(`
            <div class="card" style="border-color: #f472b6;">
                <h3 style="color: #f472b6;">${HUASHEN_SCROLL.icon} ${HUASHEN_SCROLL.name} <span style="font-size:0.8em;">(x${player.huashenScrolls.toWan()} / ${YUANSHEN_COST[0].n.toWan()})</span></h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${HUASHEN_SCROLL.desc}</p>
            </div>`);
    }

    // 鍛造圖紙（equipment.js，第 55 節）：分部位、分等級
    let bps = listBlueprints();
    if (bps.length) {
        hasItems = true;
        parts.push(`
            <div class="card" style="border-color: var(--accent);">
                <h3 style="color: var(--accent);">📜 鍛造圖紙 <span style="font-size:0.8em;">(共 ${bps.reduce((a, b) => a + b.count, 0)} 張)</span></h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${bps.map(b => `${b.slot}・${b.level} 等 ×${b.count}`).join('、')}</p>
                <p style="font-size: 0.78em; color: #6b7280;">至宗門鍛造閣選擇部位與圖紙等級打造（每張一件，另需 ${BLUEPRINT_FORGE_COST.toWan()} 靈石）</p>
            </div>`);
    }

    if (player.equipInventory && player.equipInventory.length > 0) {
        hasItems = true;
        player.equipInventory.forEach(eq => {
            let locked = isEquipLocked(eq);
            parts.push(`
                <div class="${getEquipCardClass(eq)}" style="border-color: var(--equip-color);">
                    <h3 class="quality-${eq.quality}">${formatEquipTitle(eq)}</h3>
                    <p style="font-size: 0.85em; color: #9ca3af;">${formatGearSubline(eq)} | <span class="quality-${eq.quality}">${formatQualityLabel(eq.quality)}</span> | 屬性: <span class="elem-${eq.element}">${eq.element}</span></p>
                    ${formatEquipDetails(eq)}
                    ${formatArtifactSkill(eq)}
                    <button class="equip-btn" onclick="equipItem('${eq.id}')">穿戴裝備</button>
                    ${eq.name in player.equipment ? `<button class="sys-btn" onclick="openEquipCompare('${eq.id}')">🔍 對比身上${eq.name}</button>` : ''}
                    ${formatLockButton(eq)}
                    ${ENHANCE_CAP[eq.quality] ? `<div class="batch-btns">
                        <button class="sys-btn" onclick="openEnhanceModal('${eq.id}')">🔨 強化</button>
                        <button class="sys-btn" ${locked ? 'disabled' : ''} onclick="decomposeEquip('${eq.id}')">分解</button>
                    </div>` : ''}
                    <button ${locked ? 'disabled' : ''} style="border-color: #ef4444; color: #ef4444; margin-top: 5px; background: rgba(239,68,68,0.1);${locked ? ' opacity: 0.4;' : ''}" onclick="deleteEquipFromInventory('${eq.id}')">毀棄裝備</button>
                </div>`);
        });
    }

    container.innerHTML = hasItems
        ? parts.join("")
        : `<div style="grid-column: 1 / -1; text-align: center; color: #6b7280; padding: 20px;">您的背包目前空空如也！</div>`;
}

function useItemFromBag(itemId) {
    if (!player.bag[itemId] || player.bag[itemId] <= 0) return;
    let shopItem = shopItems.find(s => s.id === itemId);
    if (!shopItem) return;

    if (shopItem.type === 'heal') {
        if (potionCooldownHp > 0) { alert(`氣血類丹藥冷卻中，尚需 ${potionCooldownHp} 秒才能再次服用。`); return; }
        if (player.hp >= player.maxHp) { alert("氣血已滿，無需使用！"); return; }
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * shopItem.amount * (1 + gearFx("丹心")));
        potionCooldownHp = POTION_COOLDOWN_SECONDS;
        addLog(`🎒 從背包使用【${shopItem.name}】，氣血回復 ${Math.round(shopItem.amount * 100)}%！`, "heal");
    } else if (shopItem.type === 'mp') {
        if (potionCooldownMp > 0) { alert(`靈力類丹藥冷卻中，尚需 ${potionCooldownMp} 秒才能再次服用。`); return; }
        if (player.mp >= player.maxMp) { alert("靈力已滿，無需使用！"); return; }
        player.mp = Math.min(player.maxMp, player.mp + player.maxMp * shopItem.amount * (1 + gearFx("丹心")));
        potionCooldownMp = POTION_COOLDOWN_SECONDS;
        addLog(`🎒 從背包使用【${shopItem.name}】，靈力回復 ${Math.round(shopItem.amount * 100)}%！`, "skill");
    }

    player.bag[itemId]--;
    if (player.bag[itemId] <= 0) delete player.bag[itemId];
    addDailyProgress('potion');
    renderBag();
    updateUI();
}

function deleteItemFromBag(itemId) {
    if (!player.bag[itemId]) return;
    let item = shopItems.find(s => s.id === itemId);
    let name = item ? item.name : itemId;
    if (confirm(`確定要刪除背包內的道具【${name}】嗎？`)) {
        delete player.bag[itemId];
        addLog(`🗑️ 刪除了背包道具【${name}】。`, "system");
        renderBag();
    }
}

// 一鍵刪除：把背包內所有勾選品級的裝備一次清掉（已穿戴、鎖定中的不受影響）
function bulkDeleteEquipment() {
    let selected = getCheckedBulkQualities('bulk-equip-quality');
    if (selected.length === 0) { alert("請先勾選要刪除的品級！"); return; }

    let keep = getCheckedBulkQualities('bulk-keep-element');
    let targets = player.equipInventory.filter(eq => selected.includes(eq.quality) && !isEquipLocked(eq) && !keep.includes(eq.element));
    if (targets.length === 0) { alert("背包內沒有符合勾選品級、未鎖定且不在保留屬性內的裝備。"); return; }

    if (!confirm(`確定要刪除背包內 ${targets.length} 件【${selected.join('、')}】裝備嗎？（🔒 鎖定的不會刪除${keep.length ? '；保留屬性：' + keep.join('') : ''}）\n此操作無法復原。`)) return;

    player.equipInventory = player.equipInventory.filter(eq => !targets.includes(eq));
    addLog(`🗑️ 一鍵刪除了 ${targets.length} 件裝備（${selected.join('、')}）。`, "equip");
    renderBag();
    updateUI();
}

function deleteEquipFromInventory(equipId) {
    let index = player.equipInventory.findIndex(e => e.id === equipId);
    if (index === -1) return;
    let item = player.equipInventory[index];
    if (!canRemoveEquip({ eq: item, where: 'inventory', index })) return;
    if (confirm(`確定要毀棄裝備【${item.quality}·${getEquipDisplayName(item)}】嗎？`)) {
        player.equipInventory.splice(index, 1);
        addLog(`🗑️ 毀棄了裝備【${getEquipDisplayName(item)}】。`, "equip");
        renderBag();
    }
}
