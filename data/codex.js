// 天磯錄（ARCHITECTURE.md 第 37 節）：裝備收藏、套裝一覽、稱號、職業；入口為洞府（手機／PC）寶塔右側山峰
// 存檔欄位：player.gearCodex = { gearId: [取得過的品級…] }、player.titles（已達成稱號 id）、player.activeTitle（顯示中的稱號 id，'prof' = 職業階級）

// ---- 收藏紀錄 ----
// 取得任何圖鑑裝備時呼叫（gear.js 的 createGearEquip、進化時）
function recordGearCollected(eq) {
    if (!eq || !eq.gearId) return;
    if (!player.gearCodex) player.gearCodex = {};
    let list = player.gearCodex[eq.gearId] || (player.gearCodex[eq.gearId] = []);
    if (!list.includes(eq.quality)) list.push(eq.quality);
    recordBlueprintCollected(eq);
}

// ---- 圖紙器錄（2026-09-28，第 55 節）：Lv.1500 以上的圖紙裝備依「部位 × 等級」記錄取得過的品級 ----
// 存檔：player.blueprintCodex = { "劍_1500": ["橙色", "白金"], ... }（key 同 equipment.js 的 blueprintKey）
function recordBlueprintCollected(eq) {
    if (!eq || !BLUEPRINT_LEVELS.includes(eq.level)) return;
    const slot = eq.name;
    if (!(slot in equipTypes) || NON_FORGEABLE_SLOTS.includes(slot)) return;
    if (!player.blueprintCodex) player.blueprintCodex = {};
    const list = player.blueprintCodex[blueprintKey(slot, eq.level)] || (player.blueprintCodex[blueprintKey(slot, eq.level)] = []);
    if (!list.includes(eq.quality)) list.push(eq.quality);
}
function getBlueprintSlots() { return Object.keys(equipTypes).filter(s => !NON_FORGEABLE_SLOTS.includes(s)); }
function getBlueprintCodexGot(slot, level) { return (player.blueprintCodex || {})[blueprintKey(slot, level)] || []; }
function countBlueprintCodex(level, quality) {
    return getBlueprintSlots().filter(s => { const g = getBlueprintCodexGot(s, level); return quality ? g.includes(quality) : g.length > 0; }).length;
}
function countBlueprintCodexAll(quality) { return BLUEPRINT_LEVELS.reduce((a, l) => a + countBlueprintCodex(l, quality), 0); }

// 舊存檔：把目前持有的圖鑑裝備補記進天磯錄（讀檔時在 migrateGearIds 之後呼叫）
function migrateGearCodex() {
    if (!player.gearCodex || typeof player.gearCodex !== 'object') player.gearCodex = {};
    if (!Array.isArray(player.titles)) player.titles = [];
    if (!Array.isArray(player.gearStash)) player.gearStash = [];
    Object.values(player.equipment || {}).forEach(recordGearCollected);
    (player.equipInventory || []).forEach(recordGearCollected);
    player.gearStash.forEach(recordGearCollected);
}

function hasCollected(def) {
    return ((player.gearCodex || {})[def.id] || []).length > 0;
}

// 可收藏的裝備（不含尚未開放的秘境）
function getOpenGear() {
    return gearList.filter(d => !GEAR_CHANNELS[d.channel].locked);
}

// 收藏類稱號（codexAll／codexPlatinumAll／category／slot／element）的範圍：固定不含秘境裝備。
// 2026-09-27 秘境管道解鎖（魔屠天南掉落）後仍維持原門檻，避免舊稱號突然變難（第 49 節）
function getTitleGear() {
    return getOpenGear().filter(d => d.channel !== 'realm');
}

function countCollected() {
    return Object.keys(player.gearCodex || {}).filter(id => (player.gearCodex[id] || []).length > 0).length;
}

function countCollectedQuality(quality) {
    return Object.values(player.gearCodex || {}).filter(list => list.includes(quality)).length;
}

// ---- 稱號 ----
function getTitleName(t) {
    return t.name.replace('{sect}', player.sect ? player.sect.name : '宗門');
}

function isTitleConditionMet(c) {
    let open = () => getTitleGear();
    switch (c.type) {
        case 'codex': return countCollected() >= c.value;
        case 'codexAll': return open().every(hasCollected);
        case 'codexPlatinumAll': return open().every(d => ((player.gearCodex || {})[d.id] || []).includes(PLATINUM_QUALITY.name));
        case 'category': return open().filter(d => d.category === c.value).every(hasCollected);
        case 'slot': return open().filter(d => d.slot === c.value).every(hasCollected);
        case 'element': return open().filter(d => d.element === c.value).every(hasCollected);
        case 'quality': return countCollectedQuality(c.value) >= c.count;
        case 'wearPlatinum': return Object.values(player.equipment).filter(eq => eq && eq.quality === PLATINUM_QUALITY.name).length >= c.value;
        case 'enhance': return (player.maxEnhance || 0) >= c.value;
        case 'ironUsed': return (player.ironUsed || 0) >= c.value;
        case 'realm': return player.realmIndex >= c.value;
        case 'sect': return !!player.sect && getSectTier() >= c.tier && player.realmIndex >= c.realm;
        case 'karma': return getKarmaState().key === c.value;
        case 'bountyKills': return (player.bountyKills || 0) >= c.value;
        case 'profRank': return getProfRank(c.value) >= c.rank;
        case 'casinoStones': return ((player.casino || {}).stones || 0) >= c.value;
        case 'casinoFire': return ((player.casino || {}).fires || 0) >= c.value;
        case 'casinoTriple': return ((player.casino || {}).triples || 0) >= c.value;
        case 'casinoBigWin': return ((player.casino || {}).maxDiceWin || 0) >= c.value;
        case 'defenseWave': return (player.defenseBest || 0) >= c.value;   // 魔屠天南最高守住波數（defense.js）
        case 'bpCount': return countBlueprintCodexAll() >= c.value;   // 圖紙器錄點亮格數
        case 'bpTier': return countBlueprintCodex(c.value) >= getBlueprintSlots().length;   // 某一檔 17 部位全收
        case 'bpPlatinum': return countBlueprintCodexAll(PLATINUM_QUALITY.name) >= c.value;   // 圖紙器錄白金格數
    }
    return false;
}

// 條件說明（稱號分頁用）
function describeTitleCondition(c) {
    switch (c.type) {
        case 'codex': return `天磯錄收藏 ${c.value} 種（目前 ${countCollected()}）`;
        case 'codexAll': return `收齊所有裝備，不含秘境（${getTitleGear().filter(hasCollected).length} / ${getTitleGear().length}）`;
        case 'codexPlatinumAll': return `所有裝備都收到白金（不含秘境）`;
        case 'category': return `${EQUIP_CATEGORY_NAMES[c.value]}全收（不含秘境）`;
        case 'slot': return `${c.value}全收（不含秘境）`;
        case 'element': return `${c.value}屬性裝備全收（不含秘境）`;
        case 'quality': return `收藏${c.value} ${c.count} 種（目前 ${countCollectedQuality(c.value)}）`;
        case 'wearPlatinum': return `同時穿戴 ${c.value} 件白金`;
        case 'enhance': return `任一裝備強化到 +${c.value}`;
        case 'ironUsed': return `累計使用 ${c.value.toWan()} 星允鐵（目前 ${(player.ironUsed || 0).toWan()}）`;
        case 'realm': return `境界達到【${realms[c.value]}】`;
        case 'sect': return `${SECT_TIER_NAMES[c.tier]}宗門以上${c.realm > 0 ? `＋境界【${realms[c.realm]}】` : ''}`;
        case 'karma': return c.value === 'good' ? '善惡值達「善」' : '善惡值達「惡」';
        case 'bountyKills': return `懸賞伏誅 ${c.value} 名（目前 ${player.bountyKills || 0}）`;
        case 'profRank': return `${getProfession(c.value).name}練到第 ${c.rank} 階`;
        case 'casinoStones': return `天星賭坊累計切石 ${c.value} 顆（目前 ${((player.casino || {}).stones || 0).toWan()}）`;
        case 'casinoFire': return `天星賭坊切出整朵異火`;
        case 'casinoTriple': return `天星賭坊押中指定豹子`;
        case 'casinoBigWin': return `天星賭坊擲骰單把淨贏 ${c.value.toWan()} 靈石`;
        case 'defenseWave': return `秘境「魔屠天南」守住第 ${c.value} 波（最高 ${player.defenseBest || 0}）`;
        case 'bpCount': return `圖紙器錄點亮 ${c.value} 格（目前 ${countBlueprintCodexAll()} / ${BLUEPRINT_LEVELS.length * getBlueprintSlots().length}）`;
        case 'bpTier': return `圖紙器錄 ${c.value} 等 ${getBlueprintSlots().length} 部位全收（目前 ${countBlueprintCodex(c.value)}）`;
        case 'bpPlatinum': return `圖紙器錄白金 ${c.value} 格（目前 ${countBlueprintCodexAll(PLATINUM_QUALITY.name)}）`;
    }
    return '';
}

function describeTitleBonus(bonus) {
    // 稱號、天下異火（strange-fire.js）、夥伴（partner.js）共用
    let labels = { statPct: '四維', atkPct: '攻擊', hpPct: '氣血', sprPct: '靈力', def: '防禦', eva: '閃避', enhanceChance: '強化成功率',
                   physPct: '物理攻擊', magPct: '術法攻擊', strPct: '力量', conPct: '體質', intPct: '悟性', chaPct: '魅力',
                   ice: '冰傷', fire: '火傷', poison: '毒傷', metal: '金傷', thunder: '雷傷',
                   'fx:聚財': '野外靈石', 'fx:悟道': '修為', 'fx:積德': '功德', 'fx:法爆': '技能傷害',
                   'fx:焚燼': '燒傷傷害', 'fx:蝕骨': '中毒傷害', 'fx:回春': '每回合回復氣血', 'fx:回靈': '每回合回復靈力',
                   'fx:吸血': '吸血', 'fx:丹心': '丹藥回復量', 'fx:獸魂': '靈寵傷害', 'fx:追擊': '追擊機率', 'fx:疾風': '再動機率',
                   'fx:斬殺': '斬殺傷害', 'fx:延壽': '戰死折壽減免', 'fx:剋敵': '五行剋制傷害', 'fx:首擊': '首擊傷害', 'fx:奪寶': '裝備掉落率' };
    return Object.keys(bonus).map(k => {
        let v = bonus[k];
        let label = labels[k] || (k.startsWith('elemDmg:') ? `本命五行為${k.slice(8)}時傷害` : k);
        let isPoint = ['def', 'eva', 'ice', 'fire', 'poison', 'metal', 'thunder'].includes(k);
        return `${label} +${isPoint ? v : +(v * 100).toFixed(1)}${k === 'def' ? '' : '%'}`;   // 防禦是點數（第 66 節）
    }).join('、');
}

// 所有已達成稱號的加成總和（併入 gear.js 的 getBonusTotals）
function getTitleBonusTotals() {
    let t = {};
    (player.titles || []).forEach(id => {
        let title = titleList.find(x => x.id === id);
        if (!title) return;
        for (let k in title.bonus) t[k] = (t[k] || 0) + title.bonus[k];
    });
    return t;
}

// 檢查並解鎖稱號（updateUI 每秒呼叫；強化、進化、職業升階時也會呼叫）
function checkTitleUnlocks() {
    if (!Array.isArray(player.titles)) player.titles = [];
    titleList.forEach(t => {
        if (player.titles.includes(t.id) || !isTitleConditionMet(t.cond)) return;
        player.titles.push(t.id);
        addLog(`🏅 獲得稱號【${getTitleName(t)}】！${describeTitleBonus(t.bonus)}（可在天磯錄選擇顯示）`, "level-up");
    });
}

// 道號旁的標籤：選了稱號顯示稱號、選 'prof' 顯示職業階級
function getNameTag() {
    if (player.activeTitle === 'prof') return formatProfessionTag();
    let t = titleList.find(x => x.id === player.activeTitle);
    return t && (player.titles || []).includes(t.id) ? getTitleName(t) : '';
}

function setActiveTitle(id) {
    player.activeTitle = player.activeTitle === id ? null : id;
    renderCodexModal();
    updateUI();
}

// ---- 天磯錄視窗 ----
let codexTab = 'gear';
let codexSlot = '劍';

function openCodexModal(tab) {
    if (tab) codexTab = tab;
    document.getElementById('codex-modal').style.display = 'flex';
    renderCodexModal();
}

function setCodexTab(tab) { codexTab = tab; renderCodexModal(); }
function setCodexSlot(slot) { codexSlot = slot; renderCodexModal(); }

function renderCodexModal() {
    let box = document.getElementById('codex-container');
    if (!box || document.getElementById('codex-modal').style.display !== 'flex') return;
    let tabs = [['gear', '📜 器錄'], ['bp', '📐 圖紙器錄'], ['sets', '❖ 套裝'], ['fires', '🔥 異火'], ['titles', '🏅 稱號'], ['prof', '⚔️ 職業'], ['races', '📕 斬妖錄']]
        .map(([k, label]) => `<button class="codex-tab${codexTab === k ? ' active' : ''}" onclick="setCodexTab('${k}')">${label}</button>`).join('');
    let body = codexTab === 'sets' ? renderCodexSets()
             : codexTab === 'fires' ? renderCodexFires()   // strange-fire.js
             : codexTab === 'titles' ? renderCodexTitles()
             : codexTab === 'prof' ? renderProfessionTab()
             : codexTab === 'bp' ? renderCodexBlueprints()
             : codexTab === 'races' ? renderCodexRaces()   // 種族剋制・斬妖錄（race.js）
             : renderCodexGear();
    box.innerHTML = `
        <p style="text-align: center; color: #9ca3af; font-size: 0.85em; margin: 0 0 8px;">
            收藏 <b style="color: var(--accent);">${countCollected()}</b> / ${gearList.length} 種${gearList.length > getOpenGear().length ? `（${gearList.length - getOpenGear().length} 種尚未開放）` : ''}｜
            紫 ${countCollectedQuality('紫色')}｜橙 ${countCollectedQuality('橙色')}｜<span class="quality-白金">白金 ${countCollectedQuality(PLATINUM_QUALITY.name)}</span>｜異火 ${countCollectedFires()} / ${strangeFireList.length}｜稱號 ${(player.titles || []).length} / ${titleList.length}
        </p>
        <div class="codex-tabs">${tabs}</div>
        ${body}`;
}

const CODEX_QUALITIES = ["白色", "綠色", "藍色", "紫色", "橙色", "白金"];

// 六顆星：取得過該品級就點亮，顏色依序 s0～s5（index.html 的 .codex-star.on.sN，第 48 節）
function formatCodexStars(got) {
    return CODEX_QUALITIES.map((q, i) =>
        `<span class="codex-star${got.includes(q) ? ` on s${i}` : ''}" title="${q}${got.includes(q) ? '（已取得）' : '（未取得）'}">★</span>`).join('');
}

function formatCodexStarLegend() {
    return `<div class="codex-star-legend">星星＝取得過的品級：${CODEX_QUALITIES.map((q, i) =>
        `<span class="item"><span class="codex-star on s${i}">★</span>${q.replace('色', '')}</span>`).join('')}</div>`;
}

function renderCodexGear() {
    let slots = Object.keys(gearBySlot).map(s => {
        let got = gearBySlot[s].filter(hasCollected).length;
        return `<button class="codex-slot${codexSlot === s ? ' active' : ''}" onclick="setCodexSlot('${s}')">${s} ${got}/50</button>`;
    }).join('');
    let cards = gearBySlot[codexSlot].map(def => {
        let got = (player.gearCodex || {})[def.id] || [];
        let stars = formatCodexStars(got);
        let ch = GEAR_CHANNELS[def.channel];
        if (!got.length) {
            return `<div class="codex-card unknown">
                <b>？？？</b><small>${def.slot}・<span class="elem-${def.element}">${def.element}</span>・${ch.locked ? '秘境・尚未開放' : ch.short}</small>
                <div>${stars}</div></div>`;
        }
        return `<div class="codex-card">
            <b class="quality-${got.includes('白金') ? '白金' : CODEX_QUALITIES.filter(q => got.includes(q)).pop()}">${def.name}</b>
            <small>${def.template}・<span class="elem-${def.element}">${def.element}</span>・${ch.short}${def.set ? `・❖${def.set}套` : ''}</small>
            <small style="color: #a5f3fc;">✦ ${def.effect}：${describeGearEffect(def.effect, '紫色')}（紫色）</small>
            <div>${stars}</div></div>`;
    }).join('');
    return `<div class="codex-slots">${slots}</div>${formatCodexStarLegend()}<div class="codex-grid">${cards}</div>`;
}

// 圖紙器錄：7 檔 × 17 部位，格子依取得過的最高品級上色（沒取得顯示「？」），每檔顯示進度
function renderCodexBlueprints() {
    const slots = getBlueprintSlots(), total = BLUEPRINT_LEVELS.length * slots.length;
    const rows = BLUEPRINT_LEVELS.map(level => {
        const cells = slots.map(s => {
            const got = getBlueprintCodexGot(s, level);
            const best = got.includes('白金') ? '白金' : CODEX_QUALITIES.filter(q => got.includes(q)).pop();
            return got.length
                ? `<span class="bp-cell on" title="${s}・${level} 等：${got.join('、')}"><span class="quality-${best}">${s}</span></span>`   // 品質色套在內層（白金是漸層文字，不能和格子背景同一個元素）
                : `<span class="bp-cell" title="${s}・${level} 等：尚未取得">？</span>`;
        }).join('');
        const n = countBlueprintCodex(level);
        return `<div class="bp-row"><div class="bp-row-head">${level} 等 <b style="color:${n === slots.length ? '#4ade80' : 'var(--accent)'};">${n}/${slots.length}</b></div><div class="bp-cells">${cells}</div></div>`;
    }).join('');
    return `<p style="color: #9ca3af; font-size: 0.82em; text-align: center; margin: 0 0 8px;">
            Lv.1500 以上只能用「鍛造圖紙」打造（天榜懸賞、死守天南城首領波、鎮魔塔 BOSS 掉落），打出來就點亮；格子顏色＝取得過的最高品級（進化白金也會記錄）。<br>
            已點亮 <b style="color: var(--accent);">${countBlueprintCodexAll()}</b> / ${total} 格｜<span class="quality-白金">白金 ${countBlueprintCodexAll(PLATINUM_QUALITY.name)}</span></p>
        ${rows}`;
}

function renderCodexSets() {
    let counts = getEquippedSetCounts();
    return `<p style="color: #9ca3af; font-size: 0.82em; text-align: center;">套裝都在秘境（秘境「魔屠天南」守城掉落部件，一次一件）。只計算紫色以上的件數。</p>
        <div class="grid-container">${Object.keys(gearSets).map(name => {
            let set = gearSets[name];
            let pieces = gearList.filter(d => d.set === name);
            let n = counts[name] || 0;
            let tiers = gearSetThemes[set.theme].map(tier => {
                let r = resolveSetTier(name, tier);
                return `<div style="color: ${n >= tier.pieces ? '#4ade80' : '#6b7280'};">${tier.pieces} 件：${r.desc}</div>`;
            }).join('');
            return `<div class="card" style="text-align: left;">
                <h3 style="text-align: center;"><span class="elem-${set.element}">${name}</span>套（${set.theme}）${n ? `・穿戴 ${n}/6` : ''}</h3>
                <p style="font-size: 0.78em; color: #9ca3af;">${pieces.map(d => hasCollected(d) ? d.name : `？？（${d.slot}）`).join('、')}</p>
                <div style="font-size: 0.8em;">${tiers}</div>
            </div>`;
        }).join('')}</div>`;
}

function renderCodexTitles() {
    let owned = player.titles || [];
    let profBtn = player.profession
        ? `<button class="sys-btn" onclick="setActiveTitle('prof')">${player.activeTitle === 'prof' ? '✅ ' : ''}顯示職業階級：${formatProfessionTag()}</button>` : '';
    let cards = titleList.map(t => {
        let has = owned.includes(t.id);
        let active = player.activeTitle === t.id;
        return `<div class="card" style="border-color: ${active ? 'var(--accent)' : has ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.06)'}; opacity: ${has ? 1 : 0.6};">
            <h3 style="color: ${has ? 'var(--accent)' : '#6b7280'};">${has ? '🏅' : '🔒'} ${getTitleName(t)}</h3>
            <p style="font-size: 0.78em; color: #9ca3af;">${describeTitleCondition(t.cond)}</p>
            <p style="font-size: 0.8em; color: #4ade80;">${describeTitleBonus(t.bonus)}</p>
            ${has ? `<button class="sys-btn" onclick="setActiveTitle('${t.id}')">${active ? '取消顯示' : '顯示在道號旁'}</button>` : ''}
        </div>`;
    }).join('');
    return `<p style="color: #9ca3af; font-size: 0.82em; text-align: center;">稱號加成永久生效、全部疊加；可選一個顯示在道號旁。</p>${profBtn}
        <div class="grid-container">${cards}</div>`;
}
