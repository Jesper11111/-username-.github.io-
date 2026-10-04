// 角色裝備彈窗（穿戴部位列表 + 五行共鳴狀態）與鍛造閣

const EQUIP_CATEGORY_NAMES = { weapon: '武器', armor: '防具', accessory: '飾品', artifact: '神器' };

// 裝備名稱前的等級標籤（沒有等級的舊裝備不顯示），人物等級不足時標紅
function formatEquipLevel(eq) {
    if (!eq || !eq.level) return "";
    let ok = player.level >= eq.level;
    return `<span style="color: ${ok ? '#9ca3af' : '#ef4444'}; font-size: 0.8em;">Lv.${eq.level}</span> `;
}

function initForgeSelect() {
    const select = document.getElementById('forge-type-select');
    select.innerHTML = "";
    for (let name in equipTypes) {
        if (NON_FORGEABLE_SLOTS.includes(name)) continue;
        let option = document.createElement('option');
        option.value = name;
        option.innerText = `${name} (${EQUIP_CATEGORY_NAMES[equipTypes[name]]})`;
        select.appendChild(option);
    }
}

function openEquipmentModal() {
    document.getElementById('equipment-modal').style.display = 'flex';
    renderLingbaoUI();
}

// 注意：函式名稱為歷史命名，實際渲染的是「角色裝備與五行狀態」彈窗內容，非靈寶閣
// 2026-09-28 改版：人形裝備欄＋點部位換裝＋裝備對比（equip-compare.js，第 60 節）
function renderLingbaoUI() {
    document.getElementById('wuxing-status-modal').innerHTML = formatSpiritRoots();
    renderEquipDoll();
}

// 目前生效的五行共鳴一覽（角色裝備視窗頂端與「!」說明視窗共用）
function formatSpiritRoots() {
    let roots = getSpiritRoots();
    let parts = roots.singles.map(e => {
        let info = wuxingArrayEffects[e];
        return `<span class="elem-${e}">【${info.title}】${info.effect}</span>`;
    });
    if (roots.special) parts.push(`<span style="color: var(--reputation-color);">【${roots.special.icon} ${roots.special.name}】${roots.special.effect}</span>`);
    if (parts.length === 0) return `【五行共鳴】：無（同屬性湊滿 ${ROOT_SINGLE_COUNT} 件即可激活）`;
    return parts.join('<br>');
}

// 「!」說明視窗：五行共鳴的激活條件、目前進度、各五行共鳴效果與五行相剋說明
function openWuxingInfo() {
    let slots = Object.keys(player.equipment).filter(key => equipTypes[key] !== "artifact");
    let counts = {};
    let empty = 0;
    slots.forEach(key => {
        let eq = player.equipment[key];
        if (!eq) { empty++; return; }
        counts[eq.element] = (counts[eq.element] || 0) + 1;
    });
    let categoryCount = cat => slots.filter(key => equipTypes[key] === cat).length;
    let playerElem = getPlayerElement();
    let roots = getSpiritRoots();

    let progress = wuxingElements.map(e =>
        `<span class="elem-${e}">${e} ${counts[e] || 0}</span>`
    ).join('　') + `　完整五行套數 <strong>${roots.sets}</strong>`
      + (empty > 0 ? `　<span style="color:#6b7280;">未穿戴 ${empty} 格</span>` : '');

    let rows = wuxingElements.map(e => {
        let info = wuxingArrayEffects[e];
        return `<tr>
            <td class="elem-${e}" style="white-space:nowrap;">${e}・${info.effect}</td>
            <td>${info.detail}<br><span style="color:var(--accent);">搭配：${info.suit}</span></td>
        </tr>`;
    }).join('');

    let pureRows = wuxingElements.map(e => {
        let info = pureRootEffects[e];
        return `<tr><td class="elem-${e}" style="white-space:nowrap;">${e} ×${ROOT_PURE_REST} → ${info.icon} ${info.name}</td><td>${info.effect}</td></tr>`;
    }).join('');

    let dualRows = Object.keys(dualRootEffects).map(key => {
        let def = dualRootEffects[key];
        let elems = key.split('+').map(e => `<span class="elem-${e}">${e}</span>`).join('＋');
        if (def.byMain) {
            return Object.keys(def.byMain).map(main =>
                `<tr><td style="white-space:nowrap;">${elems}（${main}較多）</td><td>${def.byMain[main].icon} ${def.byMain[main].name}：${def.byMain[main].effect}</td></tr>`
            ).join('');
        }
        return `<tr><td style="white-space:nowrap;">${elems}</td><td>${def.icon} ${def.name}：${def.effect}</td></tr>`;
    }).join('');

    let fixedEquips = lingbaoShopItems.filter(i => i.type === 'equip' && i.itemData.category !== 'artifact')
        .map(i => `${i.name}（<span class="elem-${i.itemData.element}">${i.itemData.element}</span>）`).join('、');

    document.getElementById('wuxing-info-body').innerHTML = `
        <h4 class="wuxing-info-h">激活條件</h4>
        <p>共 <strong>${slots.length} 個部位</strong>（武器 ${categoryCount('weapon')}、防具 ${categoryCount('armor')}、飾品 ${categoryCount('accessory')}；神器不計入五行）。<br>
        ・<strong>單屬性五行共鳴</strong>：同屬性湊滿 <strong>${ROOT_SINGLE_COUNT} 件</strong>即激活，最多可同時擁有 <strong>3 種</strong>。<br>
        ・<strong>特殊五行共鳴</strong>：另外依「完整五行套數（金木水火土各 1 件為 1 套）」與多出來的件數判定，只會有一個，與單屬性五行共鳴並存。</p>

        <h4 class="wuxing-info-h">目前五行共鳴</h4>
        <p>${formatSpiritRoots()}</p>

        <h4 class="wuxing-info-h">五行相剋</h4>
        <p>裝備中<strong>數量最多的五行</strong>就是你的<strong>本命五行</strong>（目前：${playerElem ? `<span class="elem-${playerElem}">${playerElem}</span>` : '無'}），
        每隻妖獸也各有一種五行。<br>
        ${Object.keys(WUXING_COUNTERS).map(k => `<span class="elem-${k}">${k}</span>剋<span class="elem-${WUXING_COUNTERS[k]}">${WUXING_COUNTERS[k]}</span>`).join('　')}<br>
        ・剋制對方：你打它傷害 +${Math.round(WUXING_COUNTER_BONUS * 100)}%，它打你傷害 -${Math.round(WUXING_COUNTERED_PENALTY * 100)}%。<br>
        ・被對方剋制：反過來，你打它 -${Math.round(WUXING_COUNTERED_PENALTY * 100)}%、它打你 +${Math.round(WUXING_COUNTER_BONUS * 100)}%。<br>
        ・心魔與你同屬性，不相剋；靈寵的攻擊不受五行影響。</p>

        <h4 class="wuxing-info-h">目前進度</h4>
        <p>${progress}</p>

        <h4 class="wuxing-info-h">單屬性五行共鳴（同屬性 ${ROOT_SINGLE_COUNT} 件）</h4>
        <table class="wuxing-info-table">${rows}</table>

        <h4 class="wuxing-info-h">特殊五行共鳴</h4>
        <p>・<strong>${ROOT_SUPREME_SETS} 套五行</strong>（${ROOT_SUPREME_SETS * 5} 件，剩下的件數不論屬性）→
        <span style="color: var(--reputation-color);">${supremeRootEffect.icon} ${supremeRootEffect.name}</span>：${supremeRootEffect.effect}<br>
        ・<strong>${ROOT_PURE_SETS} 套五行 + 同屬性再 ${ROOT_PURE_REST} 件</strong> → 純化五行共鳴<br>
        ・<strong>${ROOT_DUAL_SETS} 套五行 + 兩個屬性各再 ${ROOT_DUAL_REST} 件</strong> → 雙屬性五行共鳴</p>
        <table class="wuxing-info-table">${pureRows}${dualRows}</table>
        <p style="color:#9ca3af;">※ 五行共鳴提供的屬性傷害會和裝備加總後一起套上限（屬性傷害 ${AFFIX_CAP}%）；防禦直接相加、沒有上限（受到傷害 × ${DEF_K} ÷ (${DEF_K} + 防禦)）。</p>

        <h4 class="wuxing-info-h">變異屬性與光暗</h4>
        <p>五行相剋只在金木水火土之間作用。先天資質（人物面板「資質」）可能帶來變異屬性：<br>
        ・${VARIANT_AFFIX_TYPES.map(k => `${combatAttrInfo[k].icon}<strong>${combatAttrInfo[k].label}</strong>：${combatAttrInfo[k].desc}`).join('<br>・')}<br>
        ・<strong>雷、冰</strong>沿用原本的雷傷、冰傷。<br>
        ・<strong>光暗互剋</strong>：本質為光與本質為暗的雙方互相攻擊時傷害 +${Math.round(LIGHT_DARK_COUNTER_BONUS * 100)}%。邪修、邪派懸賞人物、幽冥禁域妖獸為暗；正道修士與正派懸賞人物為光。</p>

        <h4 class="wuxing-info-h">如何湊齊</h4>
        <p>・<strong>鍛造閣</strong>：每次從該等級的可製作清單隨機打出一種裝備，每種裝備的五行固定（清單中五行各佔一份），可用「最高」一次大量開爐，再挑出需要的保留，其餘在背包依品級一鍵刪除。<br>
        ・<strong>千寶閣</strong>：拍賣限定的裝備，四維比可製作的高 15%、品質較高，適合補齊缺的部位。<br>
        ・<strong>靈寶閣</strong>：屬性固定 — ${fixedEquips}。<br>
        ・背包上限 ${MAX_EQUIP_INVENTORY} 件，湊裝前記得先清出空間。</p>`;

    document.getElementById('wuxing-info-modal').style.display = 'flex';
}

function equipItem(equipId) {
    let index = player.equipInventory.findIndex(e => e.id === equipId);
    if (index === -1) return;

    let item = player.equipInventory[index];
    let slotName = item.name;
    // 裝備等級：人物等級不足無法穿戴（舊裝備、千寶閣、靈寶閣沒有 level，不受限）
    if (item.level && player.level < item.level) {
        gameAlert(`人物等級不足！【Lv.${item.level} ${getEquipDisplayName(item)}】需要人物等級 ${item.level}（目前 Lv.${player.level}）。`);
        return;
    }
    // 舊版靈寶閣「降魔伏虎杖」的部位「杖」不在 equipTypes 內，穿上會破壞五行共鳴判定
    if (!(slotName in equipTypes)) {
        gameAlert(`【${item.name}】的部位已停用，無法穿戴。可在背包中毀棄。`);
        return;
    }

    if (player.equipment[slotName]) {
        player.equipInventory.push(player.equipment[slotName]);
    }

    player.equipment[slotName] = item;
    player.equipInventory.splice(index, 1);

    addLog(`🛡️ 成功裝備【${item.quality}·${item.element}屬性】的【${getEquipDisplayName(item)}】！`, "equip");
    renderBag();
    updateUI();
}

function unequipItem(slotName) {
    let item = player.equipment[slotName];
    if (!item) return;
    if (!hasEquipInventorySpace()) return;

    player.equipment[slotName] = null;
    player.equipInventory.push(item);

    addLog(`🛡️ 卸下了部位【${slotName}】的裝備。`, "equip");
    renderLingbaoUI();
    updateUI();
}

// 目前所屬宗門可鍛造的最高裝備等級（初級 100／中級 500／高級 1000）
function getForgeLevelCap() {
    return FORGE_LEVEL_CAP_BY_TIER[getSectTier()] || FORGE_LEVEL_CAP_BY_TIER[1];
}

// 鍛造閣的等級下拉選單：只列出目前宗門可打造的等級，預設選最高的
function renderForgeLevelSelect() {
    const select = document.getElementById('forge-level-select');
    if (!select) return;
    let cap = getForgeLevelCap();
    let prev = parseInt(select.value);
    let levels = EQUIP_LEVELS.filter(l => l <= cap);
    // 圖紙檔（Lv.1500 以上）：持有「目前選的部位」該等級的圖紙才列出，不受宗門階段限制
    let slot = document.getElementById('forge-type-select').value;
    let bpLevels = BLUEPRINT_LEVELS.filter(l => getBlueprintCount(slot, l) > 0);
    select.innerHTML = levels.map(l => `<option value="${l}">${l} 等（需人物 Lv.${l}）</option>`).join("")
        + bpLevels.map(l => `<option value="${l}">📜 ${l} 等・${slot}圖紙鍛造（持有 ${getBlueprintCount(slot, l)} 張，需人物 Lv.${l}）</option>`).join("");
    let all = levels.concat(bpLevels);
    select.value = all.includes(prev) ? prev : levels[levels.length - 1];
    let owned = listBlueprints().map(b => `${b.slot} ${b.level} 等 ×${b.count}`);
    document.getElementById('forge-level-hint').innerText =
        `目前宗門（${SECT_TIER_NAMES[getSectTier()]}）最高可鍛造 ${cap} 等；初級宗門 100 等、中級 500 等、高級 1000 等\n`
        + `📜 1500 等以上需「鍛造圖紙」（分部位、分等級：劍的 1500 等圖紙只能打 1500 等的劍；天榜懸賞、死守天南城首領波、鎮魔塔 BOSS 掉落），每張打一件、另需 ${BLUEPRINT_FORGE_COST.toWan()} 靈石`
        + (owned.length ? `｜持有：${owned.join('、')}` : '');
}

function openForgeModal() {
    if (!checkSectJoined()) return;
    renderForgeLevelSelect();
    renderForgeAutoDecompose();
    document.getElementById('forge-modal').style.display = 'flex';
}

// ---- 鍛造後自動分解（2026-09-30 使用者要求）：勾選的品級打出來直接分解成碎鐵／星允鐵，不進背包 ----
// 存檔：player.forgeAutoDecompose = ["白色", "綠色", ...]（用到時才建立）
const FORGE_AUTO_MAX_BATCH = 1000;   // 勾選自動分解時「最高」一次最多開爐幾次（不受背包空位限制，避免一次跑太久）
function getForgeAutoDecompose() { return Array.isArray(player.forgeAutoDecompose) ? player.forgeAutoDecompose : []; }
function renderForgeAutoDecompose() {
    const box = document.getElementById('forge-auto-decompose');
    if (!box) return;
    const auto = getForgeAutoDecompose();
    box.innerHTML = `<span style="color: var(--accent);">🔨 打出後自動分解：</span>`
        + equipQualities.map(q => `<label style="margin: 0 4px; white-space: nowrap;"><input type="checkbox" ${auto.includes(q.name) ? 'checked' : ''} onchange="toggleForgeAutoDecompose('${q.name}', this)"> <span class="quality-${q.name}">${q.name.replace('色', '')}</span></label>`).join('')
        + `<div style="color: #6b7280; font-size: 0.85em; margin-top: 2px;">勾選的品級不進背包，直接換成碎鐵／星允鐵（橙色 ${DECOMPOSE_IRON["橙色"]} 顆星允鐵）；有勾選時「最高」不受背包空位限制</div>`;
}
async function toggleForgeAutoDecompose(quality, box) {
    let auto = getForgeAutoDecompose().slice();
    if (box.checked && (quality === '紫色' || quality === '橙色')
        && !(await gameConfirm(`確定要自動分解鍛造出的【${quality}】裝備？\n（${quality}有特效${quality === '橙色' ? '、鑲嵌孔' : ''}，也可能帶種族特效，分解後無法復原）`))) { box.checked = false; return; }
    auto = box.checked ? auto.concat(auto.includes(quality) ? [] : [quality]) : auto.filter(q => q !== quality);
    player.forgeAutoDecompose = auto;
}

// qty：1、10 或 'max'（靈石與背包空位允許的最多次數；有勾選自動分解時背包滿了才停）
function forgeEquipment(qty = 1) {
    let level = parseInt(document.getElementById('forge-level-select').value);
    let isBlueprint = BLUEPRINT_LEVELS.includes(level);
    let cost = isBlueprint ? BLUEPRINT_FORGE_COST : FORGE_COST;
    if (player.coins < cost) {
        gameAlert(`靈石不足 ${cost.toWan()}！無法打造裝備。`);
        return;
    }
    const auto = getForgeAutoDecompose();
    const allAuto = equipQualities.every(q => auto.includes(q.name));   // 全勾：打出來全部分解，不需要背包空位
    if (!allAuto && !hasEquipInventorySpace()) return;

    let name = document.getElementById('forge-type-select').value;
    if (isBlueprint) {
        if (getBlueprintCount(name, level) <= 0) { gameAlert(`沒有 ${level} 等的【${name}】鍛造圖紙！`); renderForgeLevelSelect(); return; }
    } else if (!EQUIP_LEVELS.includes(level) || level > getForgeLevelCap()) {
        gameAlert(`目前宗門最高只能鍛造 ${getForgeLevelCap()} 等裝備！`);
        renderForgeLevelSelect();
        return;
    }

    // 有勾選自動分解時，背包空位只在打出「不分解的品級」時才用得到，改成邊打邊檢查（背包滿了就停）
    let spaceCap = auto.length ? FORGE_AUTO_MAX_BATCH : MAX_EQUIP_INVENTORY - player.equipInventory.length;
    let affordable = Math.min(Math.floor(player.coins / cost), spaceCap);
    if (isBlueprint) affordable = Math.min(affordable, getBlueprintCount(name, level));   // 圖紙每張打一件
    let n = resolveBatchCount(qty, affordable, "鍛造");
    if (!n) return;

    let results = [], decomposed = [], dShards = 0, dIron = 0, full = false;
    for (let i = 0; i < n; i++) {
        if (player.equipInventory.length >= MAX_EQUIP_INVENTORY) { full = true; break; }   // 背包滿（只會發生在有不分解的品級時）
        let eq = forgeOneEquipment(name, level, cost);
        results.push(eq);
        if (auto.includes(eq.quality)) {
            player.equipInventory.pop();   // forgeOneEquipment 剛放進背包的那件
            let y = getDecomposeYield(eq);
            dShards += y.shards; dIron += y.iron; addRefineStones(y.refine);   // 洗煉石（第 67 節 D2）
            const cg = formatCraftGain(rollCraftDecompose(eq));   // 做裝通貨（craft.js，第 69 節）
            if (cg) addLog(`🔨 自動分解【${getEquipDisplayName(eq)}】額外得到 ${cg}。`, "equip");
            decomposed.push(eq);
        }
    }
    n = results.length;
    if (dShards) addIronShards(dShards);
    if (dIron) player.starIron = (player.starIron || 0) + dIron;
    if (isBlueprint) { useBlueprints(name, level, n); renderForgeLevelSelect(); }

    addDailyProgress('forge', n);
    if (n === 1) {
        let eq = results[0];
        addLog(`⚒️ 鍛造閣開爐成功！獲得【Lv.${level}·<span class="quality-${eq.quality}">${eq.quality}</span>·${eq.element}屬性】的【${getEquipDisplayName(eq)}】！`, "equip");
    } else {
        let byQuality = equipQualities.map(q => [q.name, results.filter(r => r.quality === q.name).length]).filter(([, c]) => c > 0);
        let byElement = wuxingElements.map(e => [e, results.filter(r => r.element === e).length]).filter(([, c]) => c > 0);
        let best = results.filter(r => r.quality === '橙色').map(getEquipDisplayName);
        addLog(`⚒️ 鍛造閣連續開爐 ${n} 次，打造【Lv.${level} ${name}】×${n}（消耗 ${(n * cost).toWan()} 靈石${isBlueprint ? `、${n} 張圖紙` : ''}）！`
            + `品質：${byQuality.map(([q, c]) => `<span class="quality-${q}">${q}</span>×${c}`).join('、')}；`
            + `五行：${byElement.map(([e, c]) => `<span class="elem-${e}">${e}</span>×${c}`).join('、')}`
            + (best.length ? `；橙色：<span class="quality-橙色">${best.join('、')}</span>` : ''), "equip");
    }
    const dText = decomposed.length ? `自動分解 ${decomposed.length} 件，獲得 ${formatBulkYield(dShards, dIron)}` : '';
    if (dText) addLog(`🔨 鍛造閣${dText}。`, "equip");
    if (full) addLog(`⚠️ 背包已滿（${MAX_EQUIP_INVENTORY} 件），鍛造閣只打造了 ${n} 次。`, "system");
    // 製作成功提示（ui.js）：1 件顯示品質名稱，多件顯示品質分布
    if (n === 1) showCraftSuccess(`鍛造成功`, `<span class="quality-${results[0].quality}">Lv.${level}・${results[0].quality}・${getEquipDisplayName(results[0])}</span>` + (dText ? `<br>${dText}` : ''));
    else showCraftSuccess(`鍛造成功 ×${n}`, equipQualities.map(q => [q.name, results.filter(r => r.quality === q.name).length])
        .filter(([, c]) => c > 0).map(([q, c]) => `<span class="quality-${q}">${q}×${c}</span>`).join('　') + (dText ? `<br>${dText}` : ''));
    updateUI();
}

// 打造一件指定等級的裝備並放進背包（扣靈石），回傳新裝備
// 從該等級對應的可製作清單（凡俗／修真／至高，gear.js 的 getCraftChannel）隨機抽一種，五行跟著那一種裝備
function forgeOneEquipment(name, level, cost = FORGE_COST) {
    player.coins -= cost;

    let qRand = Math.random();
    let qualityObj = equipQualities[0];
    if (qRand < 0.05) qualityObj = equipQualities[4];
    else if (qRand < 0.15) qualityObj = equipQualities[3];
    else if (qRand < 0.35) qualityObj = equipQualities[2];
    else if (qRand < 0.65) qualityObj = equipQualities[1];

    let def = pickGearDef(name, getCraftChannel(level));
    let newEquip = createGearEquip(def, qualityObj, level * EQUIP_LEVEL_STAT_MULT * qualityObj.mult, level);
    player.equipInventory.push(newEquip);
    return newEquip;
}

// ---- 鍛造圖紙（Lv.1500 以上，config-equipment.js 的 BLUEPRINT_*；第 55 節）----
// 分部位、分等級（2026-09-28 使用者指定）：劍的 1500 等圖紙只能打 1500 等的劍
// 存檔：player.blueprints = { "劍_1500": 張數, ... }（key = 部位_等級，用到時才建立）；
//   之後要做玩家交易／離線寄賣（使用者規劃），以 blueprintKey 當道具識別碼即可直接搬移
function blueprintKey(slot, level) { return `${slot}_${level}`; }
function getBlueprintCount(slot, level) {
    return (player.blueprints && player.blueprints[blueprintKey(slot, level)]) || 0;
}
function useBlueprints(slot, level, n) {
    const k = blueprintKey(slot, level);
    player.blueprints[k] = Math.max(0, (player.blueprints[k] || 0) - n);
    if (!player.blueprints[k]) delete player.blueprints[k];
}
// 持有的圖紙清單 [{ slot, level, count }]（背包、鍛造閣提示用），依等級、部位排序
function listBlueprints() {
    const slots = Object.keys(equipTypes);
    return Object.entries(player.blueprints || {}).filter(([, n]) => n > 0).map(([k, count]) => {
        const i = k.lastIndexOf('_');
        return { slot: k.slice(0, i), level: Number(k.slice(i + 1)), count };
    }).sort((a, b) => a.level - b.level || slots.indexOf(a.slot) - slots.indexOf(b.slot));
}
// 掉落的圖紙等級：不超過人物等級的最高一檔；未滿 Lv.1500 給 1500 檔
function getBlueprintDropLevel() {
    let fit = BLUEPRINT_LEVELS.filter(l => l <= player.level);
    return fit.length ? fit[fit.length - 1] : BLUEPRINT_LEVELS[0];
}
// 依機率給一張圖紙；中了回傳日誌文字，沒中回傳 ''（呼叫端：bounty.js 天榜、defense.js 首領波、zhenmo.js BOSS）
function grantBlueprint(chance, sourceText) {
    if (!(Math.random() < chance)) return '';
    let level = getBlueprintDropLevel();
    // 部位隨機（可鍛造的 17 個部位平均，不含神器）
    let slots = Object.keys(equipTypes).filter(s => !NON_FORGEABLE_SLOTS.includes(s));
    let slot = slots[Math.floor(Math.random() * slots.length)];
    if (!player.blueprints || typeof player.blueprints !== 'object') player.blueprints = {};
    const k = blueprintKey(slot, level);
    player.blueprints[k] = (player.blueprints[k] || 0) + 1;
    return `📜 ${sourceText}獲得【${slot}・${level} 等鍛造圖紙】！（持有 ${player.blueprints[k]} 張，至鍛造閣選【${slot}】與圖紙等級即可打造）`;
}