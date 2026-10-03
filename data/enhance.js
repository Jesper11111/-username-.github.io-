// 強化／進化／分解／星允鐵／暫存區（ARCHITECTURE.md 第 37 節）；數值在 config-enhance.js
// 存檔欄位：player.starIron（星允鐵）、ironShards（碎鐵）、gearStash（暫存區）、ironShop（千寶閣每日限購）、
//          ironUsed（累計用掉的星允鐵，稱號用）、maxEnhance（達過的最高強化等級，稱號用）
// 裝備欄位：eq.enhance（強化等級）、eq.enhancePity（目前這一級累計失敗次數，成功後歸零）

function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

// ---- 星允鐵與碎鐵 ----
// 取得星允鐵（套用「尋鐵」特效），回傳實際得到的數量
function addStarIron(n, source) {
    let got = Math.floor(n * (1 + gearFx("尋鐵")));
    if (got <= 0) return 0;
    player.starIron = (player.starIron || 0) + got;
    if (source) addLog(`🌠 ${source}，獲得星允鐵 ×${got}！（持有 ${player.starIron.toWan()}）`, "level-up", false, "item");
    return got;
}

// 碎鐵：每滿 SHARDS_PER_IRON 自動合成 1 顆星允鐵
function addIronShards(n) {
    player.ironShards = (player.ironShards || 0) + n;
    let made = Math.floor(player.ironShards / SHARDS_PER_IRON);
    if (made > 0) {
        player.ironShards -= made * SHARDS_PER_IRON;
        player.starIron = (player.starIron || 0) + made;
        addLog(`🔩 碎鐵熔鑄成 ${made} 顆星允鐵！（持有 ${player.starIron.toWan()}）`, "level-up");
    }
}

// ---- 找裝備（穿戴中、背包、暫存區）----
function locateEquip(equipId) {
    for (let slot in player.equipment) {
        if (player.equipment[slot] && player.equipment[slot].id === equipId) return { eq: player.equipment[slot], where: 'equipped', slot };
    }
    let i = player.equipInventory.findIndex(e => e.id === equipId);
    if (i !== -1) return { eq: player.equipInventory[i], where: 'inventory', index: i };
    let j = (player.gearStash || []).findIndex(e => e.id === equipId);
    if (j !== -1) return { eq: player.gearStash[j], where: 'stash', index: j };
    return null;
}

function removeLocatedEquip(loc) {
    if (loc.where === 'equipped') player.equipment[loc.slot] = null;
    else if (loc.where === 'inventory') player.equipInventory.splice(loc.index, 1);
    else player.gearStash.splice(loc.index, 1);
}

// ---- 強化 ----
function getEnhanceInfo(eq) {
    let cap = ENHANCE_CAP[eq.quality] || 0;
    let cur = eq.enhance || 0;
    let target = cur + 1;
    let base = ENHANCE_SUCCESS[target] || 1;
    // 保底：同一級每失敗一次 +ENHANCE_PITY_STEP；稱號「天工開物」另加成功率（codex.js）
    let chance = Math.min(1, base + (eq.enhancePity || 0) * ENHANCE_PITY_STEP + (base < 1 ? getTitleBonusTotals().enhanceChance || 0 : 0));
    return {
        cap, cur, target, maxed: cur >= cap, base, chance,
        iron: target * (ENHANCE_IRON_COEF[eq.quality] || 1),
        coins: target * ENHANCE_COINS_PER_LEVEL
    };
}

function canEvolve(eq) {
    return !!getGearDef(eq) && eq.quality === EVOLVE_QUALITY && (eq.enhance || 0) >= EVOLVE_LEVEL;
}

let enhanceEquipId = null;

function openEnhanceModal(equipId) {
    let loc = locateEquip(equipId);
    if (!loc) return;
    if (!ENHANCE_CAP[loc.eq.quality]) { alert('此裝備無法強化（神器與舊版寶物不適用）。'); return; }
    enhanceEquipId = equipId;
    document.getElementById('enhance-modal').style.display = 'flex';
    renderEnhanceModal();
}

function renderEnhanceModal() {
    let box = document.getElementById('enhance-container');
    let loc = enhanceEquipId && locateEquip(enhanceEquipId);
    if (!box || !loc) return;
    let eq = loc.eq;
    let info = getEnhanceInfo(eq);
    let iron = player.starIron || 0;
    let action;
    if (canEvolve(eq)) {
        let ok = iron >= EVOLVE_IRON && player.coins >= EVOLVE_COINS;
        action = `<p style="color: #e5e7eb;">已達 +${EVOLVE_LEVEL}，可進化為 <span class="quality-白金">${PLATINUM_QUALITY.label}</span>：四維倍率 ×${getEvolveStatRatio()}、特效 ×2、多一條隨機詞條</p>
                  <p style="color: #fb7185;">進化後必帶一條種族特效（+3～4%，已有則保留種族並升級數值）</p>
                  <p>花費：🌠 ${EVOLVE_IRON} 星允鐵 ＋ ${EVOLVE_COINS.toWan()} 靈石</p>
                  <button class="sys-btn" ${ok ? '' : 'disabled'} onclick="evolveEquip()">✨ 進化為先天道器</button>`;
    } else if (info.maxed) {
        action = `<p style="color: #9ca3af;">已達此品級強化上限 +${info.cap}</p>`;
    } else {
        let ok = iron >= info.iron && player.coins >= info.coins;
        action = `<p>強化到 <b>+${info.target}</b>：成功率 <b style="color: ${info.chance >= 1 ? '#4ade80' : '#facc15'};">${Math.round(info.chance * 100)}%</b>`
               + (eq.enhancePity ? `（基礎 ${Math.round(info.base * 100)}%，保底 +${Math.round(eq.enhancePity * ENHANCE_PITY_STEP * 100)}%）` : '') + `</p>
                  <p>每次花費：🌠 ${info.iron} 星允鐵 ＋ ${info.coins.toWan()} 靈石（失敗也扣，但不會掉級）</p>
                  <div class="batch-btns">
                      <button class="sys-btn" ${ok ? '' : 'disabled'} onclick="enhanceEquip(false)">強化一次</button>
                      <button class="sys-btn" ${ok ? '' : 'disabled'} onclick="enhanceEquip(true)">強化到成功為止</button>
                  </div>`;
    }
    box.innerHTML = `
        <div class="${getEquipCardClass(eq)}" style="border-color: var(--equip-color); margin-bottom: 10px;">
            <h3 class="quality-${eq.quality}">${formatEquipTitle(eq)}</h3>
            <p style="font-size: 0.85em; color: #9ca3af;">${formatGearSubline(eq)} | <span class="quality-${eq.quality}">${formatQualityLabel(eq.quality)}</span> | 強化 ${info.cur} / ${info.cap}</p>
            ${formatEquipDetails(eq)}
        </div>
        <p style="color: #9ca3af; font-size: 0.85em;">持有：🌠 星允鐵 <b style="color: var(--accent);">${iron.toWan()}</b>｜🔩 碎鐵 ${(player.ironShards || 0).toWan()} / ${SHARDS_PER_IRON}｜靈石 ${player.coins.toWan()}</p>
        ${action}
        ${renderRaceReforgeSection(eq)}
        <p style="color: #6b7280; font-size: 0.75em;">每 +1 四維 +${Math.round(ENHANCE_STAT_PER_LEVEL * 100)}%；上限 白綠 +10、藍 +12、紫 +15、橙 +20。+11 起有成功率，每失敗一次同一級成功率 +${Math.round(ENHANCE_PITY_STEP * 100)}%。</p>`;
}

// 進化時四維放大的倍率（白金倍率 ÷ 橙色倍率）
function getEvolveStatRatio() {
    return PLATINUM_QUALITY.mult / equipQualities.find(q => q.name === EVOLVE_QUALITY).mult;
}

// untilSuccess：一直強化到成功或資源不足
function enhanceEquip(untilSuccess) {
    let loc = locateEquip(enhanceEquipId);
    if (!loc) return;
    let eq = loc.eq;
    let tries = 0, spentIron = 0, spentCoins = 0, success = false;
    while (true) {
        let info = getEnhanceInfo(eq);
        if (info.maxed || player.starIron < info.iron || player.coins < info.coins) break;
        player.starIron -= info.iron;
        player.coins -= info.coins;
        player.ironUsed = (player.ironUsed || 0) + info.iron;
        spentIron += info.iron; spentCoins += info.coins; tries++;
        if (Math.random() < info.chance) {
            eq.enhance = info.target;
            eq.enhancePity = 0;
            player.maxEnhance = Math.max(player.maxEnhance || 0, eq.enhance);
            success = true;
            break;
        }
        eq.enhancePity = (eq.enhancePity || 0) + 1;
        if (!untilSuccess) break;
    }
    if (tries === 0) { alert('星允鐵或靈石不足！'); return; }
    let name = getEquipDisplayName(eq);
    addLog(success
        ? `🔨 強化成功！【${name}】提升至 +${eq.enhance}（${tries} 次，消耗 ${spentIron} 星允鐵、${spentCoins.toWan()} 靈石）`
        : `🔨 強化失敗…【${name}】維持 +${eq.enhance || 0}（${tries} 次，消耗 ${spentIron} 星允鐵、${spentCoins.toWan()} 靈石；下次成功率提高）`,
        success ? "level-up" : "system");
    checkTitleUnlocks();
    renderEnhanceModal();
    refreshEquipViews();
    updateUI();
    if (success && canEvolve(eq)) promptEvolveEquip(eq);
}

// 強化剛達 +EVOLVE_LEVEL（橙色）時的系統通知：詢問是否進化為先天道器；資源不足則提示還缺多少
function promptEvolveEquip(eq) {
    let name = getEquipDisplayName(eq);
    addLog(`✨ 【${name}】已強化至 +${EVOLVE_LEVEL}，可進化為${PLATINUM_QUALITY.label}！`, "level-up");
    let cost = `🌠 ${EVOLVE_IRON} 星允鐵＋${EVOLVE_COINS.toWan()} 靈石`;
    let lacks = [];
    if ((player.starIron || 0) < EVOLVE_IRON) lacks.push(`星允鐵 ${(player.starIron || 0).toWan()} / ${EVOLVE_IRON}`);
    if (player.coins < EVOLVE_COINS) lacks.push(`靈石 ${player.coins.toWan()} / ${EVOLVE_COINS.toWan()}`);
    if (lacks.length > 0) {
        alert(`✨ 系統通知：【${name}】已強化至 +${EVOLVE_LEVEL}，可進化為${PLATINUM_QUALITY.label}！\n進化需要 ${cost}，目前不足：\n${lacks.join('\n')}\n\n資源備齊後，可在強化視窗按「進化為先天道器」。`);
        return;
    }
    if (confirm(`✨ 系統通知：【${name}】已強化至 +${EVOLVE_LEVEL}！\n是否花費 ${cost}，進階為${PLATINUM_QUALITY.label}？\n（四維 ×${getEvolveStatRatio()}、特效 ×2、多一條隨機詞條）\n\n選「取消」可稍後在強化視窗進化。`)) {
        evolveEquip(true);
    }
}

// 橙色 +20 → 白金：四維依倍率放大、主詞條改白金數值、多抽 1 條隨機詞條
// skipConfirm：由 promptEvolveEquip 的系統通知確認過，不再重複詢問
function evolveEquip(skipConfirm) {
    let loc = locateEquip(enhanceEquipId);
    if (!loc || !canEvolve(loc.eq)) return;
    let eq = loc.eq;
    if (player.starIron < EVOLVE_IRON || player.coins < EVOLVE_COINS) { alert('星允鐵或靈石不足！'); return; }
    if (!skipConfirm && !confirm(`確定花費 ${EVOLVE_IRON} 星允鐵＋${EVOLVE_COINS.toWan()} 靈石，將【${getEquipDisplayName(eq)}】進化為先天道器？`)) return;
    player.starIron -= EVOLVE_IRON;
    player.coins -= EVOLVE_COINS;
    player.ironUsed = (player.ironUsed || 0) + EVOLVE_IRON;

    let def = getGearDef(eq);
    let ratio = getEvolveStatRatio();
    BASE_STAT_KEYS.forEach(k => { if (eq.stats[k]) eq.stats[k] = Math.floor(eq.stats[k] * ratio); });
    if (def.category === 'weapon') eq.stats[GEAR_ELEMENT_AFFIX[def.element]] = PLATINUM_QUALITY.affix;
    else if (def.category === 'armor') eq.stats.def = PLATINUM_QUALITY.def * (def.slot === '盔甲' ? GEAR_ARMOR_DEF_MULT : 1);
    else eq.stats.eva = PLATINUM_QUALITY.eva;
    eq.quality = PLATINUM_QUALITY.name;
    eq.subs = (eq.subs || []).concat(rollGearSubs(eq.quality, !!GEAR_CHANNELS[def.channel].external, 1, (eq.subs || []).map(s => s[0]), eq.category, eq.level));
    applyEvolveRaceGearFx(eq);   // 白金必帶種族特效（race.js，第 62 節第 5 期）
    recordGearCollected(eq);
    addLog(`✨ 天地共鳴！【${getEquipDisplayName(eq)}】進化為${PLATINUM_QUALITY.label}！`, "reincarnate");
    checkTitleUnlocks();
    renderEnhanceModal();
    refreshEquipViews();
    updateUI();
}

// ---- 分解 ----
function getDecomposeYield(eq) {
    if (DECOMPOSE_IRON[eq.quality]) return { iron: DECOMPOSE_IRON[eq.quality], shards: 0 };
    return { iron: 0, shards: DECOMPOSE_SHARDS[eq.quality] || DECOMPOSE_SHARDS["白色"] };
}

function formatDecomposeYield(y) {
    return y.iron ? `🌠 星允鐵 ×${y.iron}` : `🔩 碎鐵 ×${y.shards}`;
}

// 手動分解一件（背包或暫存區；穿戴中的要先卸下、鎖定中的要先解鎖）。白金要按兩次確認
function decomposeEquip(equipId) {
    let loc = locateEquip(equipId);
    if (!canRemoveEquip(loc)) return;
    let eq = loc.eq;
    if (eq.category === 'artifact') { alert('神器無法分解。'); return; }
    let y = getDecomposeYield(eq);
    let name = getEquipDisplayName(eq);
    let msg = `確定分解【${eq.quality}·${name}${eq.enhance ? ' +' + eq.enhance : ''}】？\n可得 ${formatDecomposeYield(y).replace(/<[^>]+>/g, '')}，鑲嵌的符寶會一起消失。`;
    if (!confirm(msg)) return;
    if (eq.quality === PLATINUM_QUALITY.name && !confirm(`⚠️ 這是先天道器（白金），分解後無法復原。\n真的要分解【${name}】嗎？`)) return;
    removeLocatedEquip(loc);
    if (y.iron) player.starIron = (player.starIron || 0) + y.iron;
    else addIronShards(y.shards);
    addLog(`🔨 分解【${name}】，獲得 ${formatDecomposeYield(y)}。`, "equip");
    refreshEquipViews();
    updateUI();
}

// 一批裝備分解的總產出文字（碎鐵＋星允鐵）
function formatBulkYield(shards, iron) {
    let out = [];
    if (shards) out.push(`🔩 碎鐵 ×${shards}`);
    if (iron) out.push(`🌠 星允鐵 ×${iron}`);
    return out.join('、');
}

// 依勾選品級一鍵分解（只作用於背包、略過鎖定與「保留屬性」；白～紫得碎鐵、橙色得星允鐵；白金不在選項中，請逐件分解）
function bulkDecomposeEquipment() {
    let selected = getCheckedBulkQualities('bulk-equip-quality').filter(q => DECOMPOSE_SHARDS[q] || q === "橙色");
    if (selected.length === 0) { alert("請先勾選要分解的品級！"); return; }
    let keep = getCheckedBulkQualities('bulk-keep-element');
    let targets = player.equipInventory.filter(eq => selected.includes(eq.quality) && eq.category !== 'artifact' && !isEquipLocked(eq) && !keep.includes(eq.element));
    if (targets.length === 0) { alert("背包內沒有符合勾選品級、未鎖定且不在保留屬性內的裝備。"); return; }
    let shards = 0, iron = 0;
    targets.forEach(eq => { let y = getDecomposeYield(eq); shards += y.shards; iron += y.iron; });
    if (!confirm(`確定分解背包內 ${targets.length} 件【${selected.join('、')}】裝備？${keep.length ? '（保留屬性：' + keep.join('') + '）' : ''}\n可得 ${formatBulkYield(shards, iron)}，鑲嵌的符寶會一起消失。`)) return;
    player.equipInventory = player.equipInventory.filter(eq => !targets.includes(eq));
    if (shards) addIronShards(shards);
    if (iron) player.starIron = (player.starIron || 0) + iron;
    addLog(`🔨 一鍵分解 ${targets.length} 件裝備，獲得 ${formatBulkYield(shards, iron)}。`, "equip");
    renderBag();
    updateUI();
}

// 暫存區一鍵分解／毀棄：只處理橙色（白金請逐件處理），略過鎖定與「保留屬性」
function getStashBulkTargets() {
    let keep = getCheckedBulkQualities('stash-keep-element');
    return { keep, targets: (player.gearStash || []).filter(eq => eq.quality === "橙色" && eq.category !== 'artifact' && !isEquipLocked(eq) && !keep.includes(eq.element)) };
}

function bulkStashEquip(mode) {
    let { keep, targets } = getStashBulkTargets();
    if (targets.length === 0) { alert("暫存區沒有未鎖定、且不在保留屬性內的橙色裝備。"); return; }
    let keepTxt = keep.length ? '（保留屬性：' + keep.join('') + '）' : '';
    let iron = mode === 'decompose' ? targets.reduce((s, eq) => s + getDecomposeYield(eq).iron, 0) : 0;
    let msg = mode === 'decompose'
        ? `確定分解暫存區 ${targets.length} 件橙色裝備？${keepTxt}\n可得 🌠 星允鐵 ×${iron}，鑲嵌的符寶會一起消失。`
        : `確定毀棄暫存區 ${targets.length} 件橙色裝備？${keepTxt}\n毀棄不會得到星允鐵（建議改用分解），此操作無法復原。`;
    if (!confirm(msg)) return;
    player.gearStash = player.gearStash.filter(eq => !targets.includes(eq));
    if (iron) player.starIron = (player.starIron || 0) + iron;
    addLog(mode === 'decompose'
        ? `🔨 一鍵分解暫存區 ${targets.length} 件橙色裝備，獲得 🌠 星允鐵 ×${iron}。`
        : `🗑️ 一鍵毀棄了暫存區 ${targets.length} 件橙色裝備。`, "equip");
    renderBag();
    updateUI();
}

// ---- 暫存區（背包滿時新掉落的橙色以上）----
function isGearStashFull() {
    return (player.gearStash || []).length >= GEAR_STASH_MAX;
}

// 外界掉落（奪寶）的裝備入袋：背包有空位 → 背包；沒有 → 橙色以下自動分解成碎鐵、橙色以上進暫存區
// 回傳去向文字（日誌用）
function receiveLootEquip(eq) {
    if (player.equipInventory.length < MAX_EQUIP_INVENTORY) {
        player.equipInventory.push(eq);
        return '已放入背包';
    }
    if (!DECOMPOSE_IRON[eq.quality]) {
        let sold = tryAutoSellLoot(eq);   // 坊市回收設定「背包滿時自動賣出」（economy.js）；額度用完才分解
        if (sold) return `背包已滿，自動賣給坊市得 ${sold.toWan()} 靈石`;
        let y = getDecomposeYield(eq);
        addIronShards(y.shards);
        return `背包已滿，自動分解為 🔩 碎鐵 ×${y.shards}`;
    }
    if (!player.gearStash) player.gearStash = [];
    if (player.gearStash.length < GEAR_STASH_MAX) {
        player.gearStash.push(eq);
        let text = `背包已滿，放入暫存區（${player.gearStash.length}/${GEAR_STASH_MAX}）`;
        if (isGearStashFull()) text += '——⚠️ 暫存區已滿，處理完之前無法外出練功！';
        return text;
    }
    // 理論上不會發生（暫存區滿時無法外出），保險起見直接換成星允鐵
    let y = getDecomposeYield(eq);
    player.starIron = (player.starIron || 0) + y.iron;
    return `暫存區已滿，自動分解為 ${formatDecomposeYield(y)}`;
}

// 暫存區滿時：不能待在野外（combat.js 每回合、map.js 換地圖時檢查）；回傳 true 代表已被擋下
function enforceGearStashLimit() {
    if (!isGearStashFull() || player.currentMapIsSafe) return false;
    addLog(`📦 暫存區已滿（${GEAR_STASH_MAX}/${GEAR_STASH_MAX}），請先處理暫存區的橙色裝備才能外出練功！已返回宗門。`, "system");
    changeMap(0, 0);
    return true;
}

function moveStashToBag(equipId) {
    let j = (player.gearStash || []).findIndex(e => e.id === equipId);
    if (j === -1) return;
    if (!hasEquipInventorySpace()) return;
    player.equipInventory.push(player.gearStash.splice(j, 1)[0]);
    renderBag();
    updateUI();
}

function deleteStashEquip(equipId) {
    let j = (player.gearStash || []).findIndex(e => e.id === equipId);
    if (j === -1) return;
    let eq = player.gearStash[j];
    if (!canRemoveEquip({ eq, where: 'stash', index: j })) return;
    if (!confirm(`確定毀棄暫存區的【${eq.quality}·${getEquipDisplayName(eq)}】嗎？（毀棄不會得到星允鐵，建議改用分解）`)) return;
    player.gearStash.splice(j, 1);
    addLog(`🗑️ 毀棄了暫存區的【${getEquipDisplayName(eq)}】。`, "equip");
    renderBag();
    updateUI();
}

// 背包頂端的暫存區區塊（bag.js 的 renderBag 呼叫）
function renderStashSection() {
    let stash = player.gearStash || [];
    if (stash.length === 0) return '';
    let cards = stash.map(eq => {
        let locked = isEquipLocked(eq);
        return `
        <div class="${getEquipCardClass(eq)}" style="border-color: #fb923c;">
            <h3 class="quality-${eq.quality}">${formatEquipTitle(eq)}</h3>
            <p style="font-size: 0.85em; color: #9ca3af;">${formatGearSubline(eq)} | <span class="quality-${eq.quality}">${formatQualityLabel(eq.quality)}</span> | 屬性: <span class="elem-${eq.element}">${eq.element}</span></p>
            ${formatEquipDetails(eq)}
            <button class="equip-btn" onclick="moveStashToBag('${eq.id}')">移入背包</button>
            ${formatLockButton(eq)}
            <button class="sys-btn" ${locked ? 'disabled' : ''} onclick="decomposeEquip('${eq.id}')">分解（${formatDecomposeYield(getDecomposeYield(eq))}）</button>
            <button ${locked ? 'disabled' : ''} style="border-color: #ef4444; color: #ef4444; margin-top: 5px; background: rgba(239,68,68,0.1);${locked ? ' opacity: 0.4;' : ''}" onclick="deleteStashEquip('${eq.id}')">毀棄</button>
        </div>`;
    }).join('');
    let full = isGearStashFull();
    let orangeCount = stash.filter(eq => eq.quality === "橙色" && !isEquipLocked(eq)).length;
    let bulk = orangeCount === 0 ? '' : `
        <div class="bulk-bar">
            <div class="bulk-title">🗑️ 暫存區一鍵處理（橙色 ${orangeCount} 件未鎖定）</div>
            ${renderKeepElementRow('stash-keep-element')}
            <div class="bulk-actions">
                <button class="sys-btn" onclick="bulkStashEquip('decompose')">一鍵分解橙色</button>
                <button style="border-color:#ef4444; color:#ef4444; background:rgba(239,68,68,0.12);" onclick="bulkStashEquip('delete')">一鍵毀棄橙色</button>
            </div>
            <div style="font-size:0.75em; color:#6b7280; text-align:center; margin-top:6px;">※ 🔒 鎖定、勾選「保留屬性」的不受影響；白金請逐件處理。分解每件得 🌠 星允鐵 ×${DECOMPOSE_IRON["橙色"]}</div>
        </div>`;
    return `<div style="grid-column: 1 / -1; text-align: center; font-size: 0.9em; color: ${full ? '#ef4444' : '#fb923c'};">
                📦 暫存區：${stash.length} / ${GEAR_STASH_MAX} 件${full ? '（已滿，處理完之前無法外出練功）' : '（背包滿時新掉落的橙色以上裝備）'}
            </div>${bulk}${cards}
            <div style="grid-column: 1 / -1; border-top: 1px dashed rgba(255,255,255,0.1);"></div>`;
}

// 裝備相關視窗開著時重繪
function refreshEquipViews() {
    let open = id => { let el = document.getElementById(id); return el && el.style.display === 'flex'; };
    if (open('bag-modal')) renderBag();
    if (open('equipment-modal')) renderLingbaoUI();
}

// ---- 千寶閣：星允鐵（常駐每日限購＋刷新格的星允鐵袋）----
function getIronShopState() {
    let today = new Date().toDateString();
    if (!player.ironShop || player.ironShop.date !== today) player.ironShop = { date: today, bought: 0 };
    return player.ironShop;
}

function renderIronShopSection() {
    let st = getIronShopState();
    let left = IRON_AUCTION_DAILY_LIMIT - st.bought;
    let affordable = Math.min(left, Math.floor(player.coins / IRON_AUCTION_PRICE));
    return `
        <h3 style="margin: 22px 0 6px; color: var(--accent);">🌠 星允鐵（常駐・每日限購）</h3>
        <div class="grid-container">
            <div class="card" style="border-color: var(--accent);">
                <h3 style="color: var(--accent);">🌠 星允鐵</h3>
                <p style="font-size: 0.8em; color: #9ca3af;">強化裝備的寶物。也可從礦脈採礦、獵殺邪修取得，或分解裝備的碎鐵熔鑄。</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">每顆 ${IRON_AUCTION_PRICE.toWan()} 靈石｜今日剩 ${left} / ${IRON_AUCTION_DAILY_LIMIT} 顆｜持有 ${(player.starIron || 0).toWan()}</p>
                <div class="batch-btns">
                    <button class="sys-btn" ${affordable < 1 ? 'disabled' : ''} onclick="buyStarIron(1)">×1</button>
                    <button class="sys-btn" ${affordable < 1 ? 'disabled' : ''} onclick="buyStarIron('max')">最高</button>
                </div>
            </div>
        </div>`;
}

function buyStarIron(qty) {
    let st = getIronShopState();
    let affordable = Math.min(IRON_AUCTION_DAILY_LIMIT - st.bought, Math.floor(player.coins / IRON_AUCTION_PRICE));
    if (affordable <= 0) { alert(st.bought >= IRON_AUCTION_DAILY_LIMIT ? '今日限購已滿，明天再來！' : '靈石不足！'); return; }
    let n = qty === 'max' ? affordable : Math.min(qty, affordable);
    player.coins -= n * IRON_AUCTION_PRICE;
    st.bought += n;
    player.starIron = (player.starIron || 0) + n;
    addLog(`🌠 於千寶閣以 ${(n * IRON_AUCTION_PRICE).toWan()} 靈石購得星允鐵 ×${n}。`, "system", false, "item");
    toastBought(`星允鐵 ×${n}`);
    renderAuction();
    updateUI();
}

// 刷新格的星允鐵袋（auction.js 的 rollAuctionItem 以 IRON_BAG_CHANCE 上架）
function rollIronBagItem() {
    let amount = randInt(IRON_BAG_AMOUNT[0], IRON_BAG_AMOUNT[1]);
    return {
        id: Date.now() + "_" + Math.floor(Math.random() * 100000),
        kind: "ironBag", amount,
        price: amount * IRON_BAG_PRICE.coins, repPrice: amount * IRON_BAG_PRICE.rep,
        sold: false
    };
}
