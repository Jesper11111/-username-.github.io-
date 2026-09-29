// 地圖選擇彈窗與切換地圖邏輯

// 是否身在宗門（宗門設施與親自執行門派任務的共同條件）
function isInSect() {
    return !!player.currentMap && player.currentMap.name === SECT_MAP_NAME;
}

// 修仙地圖（獨立彈窗 #world-map-modal）：列出五個區域，點選後開啟該區的地圖清單
function openWorldMapModal() {
    let cur = document.getElementById('world-map-current');
    if (cur) {
        let rec = getRecommendedMaps();
        cur.innerText = `目前所在：${player.currentMap.name}${player.currentMapIsSafe ? '（安全區）' : ''}`
            + `\n🎯 ${realms[player.realmIndex]}適合練功：${rec.length ? rec.map(r => r.item.name).join('、') : '（目前沒有對應地圖）'}`;
    }
    renderTownTeleports();
    document.getElementById('world-map-modal').style.display = 'flex';
}

// 地圖縮圖：女修且有 thumbFemale 時用女版，否則用 thumb（config-maps.js）
function getMapThumb(item) {
    return (player.gender === 'female' && item.thumbFemale) ? item.thumbFemale : item.thumb;
}

// 城鎮（不編號）：直接在修仙地圖顯示傳送點卡片（有 thumb 顯示縮圖），點擊即傳送；宗門（hidden）不列
function renderTownTeleports() {
    const box = document.getElementById('world-map-towns');
    if (!box) return;
    box.innerHTML = maps[0].items.map((item, i) => {
        if (item.hidden) return '';
        let isCurrent = player.currentMap.name === item.name;
        let scene = hasTownScene(item.name);   // 有城內場景（config-towns.js）：已在城內也能點，直接進城
        let thumb = getMapThumb(item);
        let pic = thumb ? `<img class="map-thumb" src="${thumb}" alt="${item.name}">` : `<span class="town-thumb-empty">🏯</span>`;
        let tip = isCurrent ? (scene ? '📍 當前所在・點擊進城' : '📍 當前所在') : (scene ? '✨ 點擊傳送並進城' : '✨ 點擊傳送');
        let clickable = !isCurrent || scene;
        return `<button class="town-card${isCurrent ? ' current' : ''}${scene ? ' has-scene' : ''}" ${clickable ? `onclick="goToTown(${i})"` : ''}>
            ${pic}<b>${item.name}</b><small>${tip}</small></button>`;
    }).join('');
}

// 點城鎮傳送點：不在該城就傳送過去；有城內場景（town.js）就開啟城內畫面
function goToTown(i) {
    let item = maps[0].items[i];
    if (player.currentMap.name !== item.name) selectMap(0, i);
    else closeModal('world-map-modal');
    if (player.currentMap.name === item.name && hasTownScene(item.name)) openTownScene(item.name);
}

function openMapCategoryModal(catIndex) {
    let cat = maps[catIndex];
    document.getElementById('map-modal-title').innerText = cat.category;
    const container = document.getElementById('map-modal-list');
    container.innerHTML = "";

    cat.items.forEach((item, iIndex) => {
        if (item.hidden) return;   // 宗門不列在修仙地圖（按洞府的「宗門」回去）
        let isCurrent = player.currentMap.name === item.name;
        let suit = getMapSuitRange(item);
        let recommended = suit && player.realmIndex >= suit[0] && player.realmIndex <= suit[1];
        let suitText = suit ? (suit[0] === suit[1] ? realms[suit[0]] : `${realms[suit[0]]}～${realms[suit[1]]}`) : '';
        container.innerHTML += `
            <div class="card" style="border-color: ${isCurrent ? 'var(--accent)' : 'rgba(255,255,255,0.08)'};">
                ${getMapThumb(item) ? `<img class="map-thumb" src="${getMapThumb(item)}" alt="${item.name}">` : ''}
                <h3 style="color: ${isCurrent ? 'var(--accent)' : '#fff'};">${item.name}${recommended ? ' <span style="font-size:0.7em; color:#facc15;">⭐ 推薦練功</span>' : ''}</h3>
                ${suitText ? `<p style="font-size:0.8em; color:${recommended ? '#facc15' : '#9ca3af'}; margin:2px 0;">🎯 適合境界：${suitText}</p>` : ''}
                <p style="font-size:0.85em; color:#9ca3af;">${cat.isSafe   // 城鎮（安全區）沒有妖獸：新制上線後曾誤顯示妖獸數值（2026-09-30 修正）
                    ? `🏯 安全區：可打坐靜修`
                    : `經驗倍率: x${item.expRate} | ${getMapDifficultyText(item)}`}</p>
                ${getMapMinRealm(item) ? `<p style="font-size:0.8em; color:${player.realmIndex < getMapMinRealm(item) ? '#f87171' : '#9ca3af'};">${player.realmIndex < getMapMinRealm(item) ? '🔒 ' : ''}限制：${realms[getMapMinRealm(item)]}以上</p>` : ''}
                <button class="sys-btn ${isCurrent ? 'active' : ''}" onclick="selectMap(${catIndex}, ${iIndex})">${isCurrent ? '當前所在區域' : '前往此區域'}</button>
            </div>
        `;
    });

    document.getElementById('map-category-modal').style.display = 'flex';
}

// 適合練功的境界範圍 [最低, 最高]（顯示用）：舊制看 config-maps.js 的 suit；新制妖獸強度由 nv2L 決定，改用 nv2L 所在的境界
function getMapSuitRange(item) {
    if (NUMERIC_V2 && typeof item.nv2L === 'number') { let r = Math.floor(item.nv2L + 1e-9); return [r, r]; }
    return Array.isArray(item.suit) ? item.suit : null;
}
// 目前境界推薦的練功地圖 [{ catIndex, itemIndex, item }]（修仙地圖視窗頂端顯示）；沒有剛好對應的就取「適合境界」不超過自己的最高那張
function getRecommendedMaps() {
    let list = [], below = null;
    maps.forEach((cat, ci) => cat.items.forEach((item, ii) => {
        let s = !cat.isSafe && getMapSuitRange(item);
        if (!s) return;
        if (player.realmIndex >= s[0] && player.realmIndex <= s[1]) list.push({ catIndex: ci, itemIndex: ii, item });
        else if (s[1] < player.realmIndex && (!below || s[1] >= getMapSuitRange(below.item)[1])) below = { catIndex: ci, itemIndex: ii, item };
    }));
    return list.length ? list : (below ? [below] : []);
}

// 洞府的「宗門」（手機熱點、PC pcStageButtons）：不在宗門就先傳送回宗門，再打開宗門分頁
function returnToSect() {
    if (!isInSect()) changeMap(0, 0);   // maps[0].items[0] = 宗門
    switchTab('sect');
}

// 地圖的境界門檻（2026-09-28 使用者決定「最多越 1 個大境界練功」）：新制＝妖獸對應境界（nv2L）− 1，
// 與 config-maps.js 原本的 minRealm 取較嚴者（例：鬼谷八荒 nv2L 6＝煉虛 → 需化神；崑吾山原本就要合體，維持）。
// 原因：新制妖獸強度只看地圖，低境界拿高等裝備越級刷高階地圖，經驗靈石暴增；0 表示沒有門檻
function getMapMinRealm(item) {
    let r = item.minRealm || 0;
    if (NUMERIC_V2 && typeof item.nv2L === 'number') r = Math.max(r, Math.floor(item.nv2L + 1e-9) - 1);
    return Math.max(0, r);
}

// 地圖卡片的難度文字：舊制顯示 diff；新制顯示妖獸氣血／攻擊（numeric.js 的 nv2MonsterStats）
function getMapDifficultyText(item) {
    if (!NUMERIC_V2) return `難度: ${item.diff}`;
    let ms = nv2MonsterStats(item);   // 平均值（妖獸階數隨你、強度 1.5～3 倍取平均，numeric.js）
    // 境界壓制（numeric.js）：顯示的已是對你的數值，另外標出倍率
    let sup = ms.suppress && ms.suppress.gap >= 0.05
        ? `<br><span style="color:#f87171;">⚠️ 境界壓制：高你 ${ms.suppress.gap.toFixed(1)} 個境界，妖獸氣血 ×${ms.suppress.hp.toFixed(1)}、攻擊 ×${ms.suppress.atk.toFixed(1)}</span>` : '';
    let [lo, hi] = nv2MonsterLevelRange(item);
    let lvText = hi - lo < 0.05 ? nv2LevelLabel(lo) : `${nv2LevelLabel(lo)}～${nv2LevelLabel(hi)}`;
    let [sLo, sHi] = nv2MonsterStrRange(lo, item);
    return `妖獸 ${lvText}（強度 ${sLo}～${sHi} 倍）<br>平均 氣血 ${fmtCombat(ms.hp)}／攻擊 ${fmtCombat(ms.atk)}<br>種族 ${formatFieldRaceMix(item)}${sup}`;   // 種族比例（race.js）
}

function selectMap(cIndex, iIndex) {
    changeMap(cIndex, iIndex);
    closeModal('map-category-modal');
    closeModal('world-map-modal');
}

function changeMap(cIndex, iIndex) {
    let targetMap = maps[cIndex].items[iIndex];

    const minRealm = getMapMinRealm(targetMap);
    if (minRealm && player.realmIndex < minRealm) {
        alert(`進入【${targetMap.name}】失敗！您的境界未達【${realms[minRealm]}】。\n（練功最多只能越一個大境界）`);
        return;
    }
    // 四維門檻：新制看 nv2MinStat 與 nv2Stat 總值（numeric.js），舊制看 minStat 與 player.stats
    let minS = NUMERIC_V2 ? targetMap.nv2MinStat : targetMap.minStat;
    if (minS) {
        let st = k => NUMERIC_V2 ? nv2Stat(k) : player.stats[k];
        if (["str", "con", "int", "spr"].some(k => st(k) < minS)) {
            alert(`進入【${targetMap.name}】失敗！四維屬性全數必須大於 ${minS} 方可進入。`);
            return;
        }
    }
    // 暫存區滿了不能外出練功（enhance.js）
    if (!maps[cIndex].isSafe && isGearStashFull()) {
        alert(`暫存區已滿（${GEAR_STASH_MAX}/${GEAR_STASH_MAX}）！\n請先到背包處理暫存區的橙色裝備（移入背包、分解或毀棄），才能外出練功。`);
        return;
    }

    // 懸賞對決中換地圖＝逃離對決（懸賞保留，bounty.js）
    if (inBountyDuel) endBountyDuel("flee");
    if (enemies.length > 0) {
        addLog("🏃 捨棄戰鬥，逃往其他區域！", "combat");
        enemies = [];
        respawnTimer = 0;
    }
    player.currentMap = targetMap;
    player.currentMapIsSafe = maps[cIndex].isSafe;
    safeZoneTimer = 0;
    fieldOnlineTicks = 0;   // 線上實戰證明重新計算（combat.js）
    meditateSummary = { seconds: 0, exp: 0 };   // 打坐日誌彙總重新累計，避免下次回宗門把上一趟的經驗算進來
    waveSummary = null;

    updateSectFacilitiesUI();

    if (player.activeQuest && !isInSect()) {
        stopQuest();
        addLog("離開了宗門，自動中斷你親自執行的門派任務（僕從仍會繼續各自的任務）。", "system");
    }

    refreshCombatStatusText();
    if (player.currentMapIsSafe) {
        addLog(`🗺️ 回到安全區 ${player.currentMap.name}，開始打坐療傷。`);
    } else {
        addLog(`🗺️ 深入野外 ${player.currentMap.name}，四周充滿危險氣息。`);
    }
    updateCombatVisualPanel();
}
