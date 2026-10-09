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
        return `<button class="town-card${isCurrent ? ' current' : ''}${scene ? ' has-scene' : ''}" ${clickable ? `onclick="goToTown(${i}, true)"` : ''}>
            ${pic}<b>${item.name}</b><small>${tip}</small></button>`;
    }).join('');
}

// 依地圖名稱傳送（靈界地圖的紅點用，config-towns.js；免得寫死 maps 索引）
// 進不去時用遊戲內提示條（showToast）說明原因並留在地圖上：changeMap 用的 alert 在部分 App 內建瀏覽器／預覽面板不會顯示，
// 玩家會以為「按了沒有任何反應」（2026-10-01 使用者回報）
function goToMapByName(name) {
    const f = findMapByName(name);
    if (!f) return;
    const block = getMapEntryBlock(f.c, f.i);
    if (block && !block.realm) { showToast(block.msg.split('\n')[0]); return; }
    selectMap(f.c, f.i, true);   // 靈界大地圖紅點＝大地圖進入，會觸發特殊事件（第 73 節）；境界不足：changeMap 會跳挑戰模式警告（第 70 節）
}

// 依城鎮名稱傳送並進城（人界地圖的傳送點用，config-towns.js；免得寫死 maps 索引）
function goToTownByName(name) {
    const i = maps[0].items.findIndex(item => item.name === name);
    if (i >= 0) goToTown(i);
}

// 點城鎮傳送點：不在該城就傳送過去；有城內場景（town.js）就開啟城內畫面
// quick＝從修仙地圖彈窗（快捷清單）傳送：不觸發奇遇等特殊事件；不帶＝人界大地圖的城鎮紅點（goToTownByName），會觸發（第 73 節）
function goToTown(i, quick) {
    let item = maps[0].items[i];
    // 被城內隱藏 NPC 打爆後的禁入時間（town-npc.js）：不傳送、只提示
    const ban = isGM() ? 0 : getTownBanLeftMin(item.name);
    if (ban) { showToast(`😵 滿臉都是香腸油，還沒臉回${item.name}……（剩 ${ban} 分鐘）`); return; }
    if (player.currentMap.name !== item.name) selectMap(0, i, !quick);
    else closeModal('world-map-modal');
    if (player.currentMap.name === item.name && hasTownScene(item.name)) openTownScene(item.name);
}

// quick＝從修仙地圖彈窗（人界地圖右上「地圖列表」等快捷清單）開啟：清單裡選的地圖傳送後不觸發特殊事件（第 73 節）；人界地圖的分區紅點開啟時為 false
function openMapCategoryModal(catIndex, quick) {
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
                ${getMapMinRealm(item) ? `<p style="font-size:0.8em; color:${isBelowMapLevel(item) ? '#f87171' : '#9ca3af'};">${isBelowMapLevel(item) ? '🔒 ' : ''}限制：${typeof item.minL === 'number' ? nv2LevelLabel(getMapMinLevel(item)) : realms[getMapMinRealm(item)]}以上</p>` : ''}
                <button class="sys-btn ${isCurrent ? 'active' : ''}" onclick="selectMap(${catIndex}, ${iIndex}${quick ? '' : ', true'})">${isCurrent ? (isChallengeMap(item) ? '⚔️ 挑戰中' : '當前所在區域') : (!cat.isSafe && isBelowMapLevel(item) ? '⚔️ 挑戰模式進入' : '前往此區域')}</button>
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
    if (isInLingjie()) { tryLeaveLingjie(() => { if (!isInSect()) changeMap(0, 0, false, true); switchTab('sect'); }); return; }   // 身在靈界回宗門要付五行傳送陣靈石（第 74 節）
    if (!isInSect()) changeMap(0, 0, false, true);   // maps[0].items[0] = 宗門；玩家自己回宗門算數（奇遇秘密路線的起點與終點，第 73 節）
    switchTab('sect');
}

// 地圖的境界門檻（2026-09-28 使用者決定「最多越 1 個大境界練功」）：新制＝妖獸對應境界（nv2L）− 1，
// 與 config-maps.js 原本的 minRealm 取較嚴者（例：鬼谷八荒 nv2L 6＝煉虛 → 需化神；崑吾山原本就要合體，維持）。
// 原因：新制妖獸強度只看地圖，低境界拿高等裝備越級刷高階地圖，經驗靈石暴增；0 表示沒有門檻
function getMapMinRealm(item) {
    let r = item.minRealm || 0;
    if (NUMERIC_V2 && typeof item.nv2L === 'number') r = Math.max(r, Math.floor(item.nv2L + 1e-9) - 1);
    if (NUMERIC_V2 && typeof item.minL === 'number') r = Math.max(r, Math.floor(item.minL + 1e-9));
    return Math.max(0, r);
}
// 地圖的等級門檻（成長位置 L＝境界＋(階−1)/10）：config 的 minL（2026-10-03 第四、五區依地圖排列設定，例：神墟 12.3＝真仙 4 階），沒有就是境界門檻的 1 階
function getMapMinLevel(item) {
    return Math.max(getMapMinRealm(item), NUMERIC_V2 && typeof item.minL === 'number' ? item.minL : 0);
}
function isBelowMapLevel(item) { return nv2Level(player.realmIndex, player.stage) < getMapMinLevel(item) - 1e-9; }

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
    return `妖獸 ${lvText}（強度 ${sLo}～${sHi} 倍）<br>平均 氣血 ${fmtCombat(ms.hp)}／攻擊 ${fmtCombat(ms.atk)}<br>種族 ${formatFieldRaceMix(item)}<br>出沒 ${formatFieldMonsterMix(item)}${sup}`;   // 種族比例（race.js）、出沒妖獸與型態（monster.js）
}

// bigMap＝從大地圖（人界／靈界地圖的紅點與分區）進入：只有這樣才觸發特殊事件（第 73 節）
function selectMap(cIndex, iIndex, bigMap) {
    const target = maps[cIndex].items[iIndex];
    const b = getMapEntryBlock(cIndex, iIndex);
    if (b && b.realm) { confirmChallengeMap(cIndex, iIndex, bigMap); return; }   // 挑戰模式：取消時留在地圖視窗（第 70 節）
    changeMap(cIndex, iIndex, false, bigMap);
    closeModal('map-category-modal');
    closeModal('world-map-modal');
    afterMapArrive(cIndex, target);
}
function afterMapArrive(cIndex, target) {
    // 從人界／靈界地圖（town.js）選好地圖：傳送成功才一併關掉地圖回到遊戲（境界不足等被擋時留在地圖上；城鎮由 goToTown 接著開城內場景）
    const arrived = player.currentMap && player.currentMap.name === target.name;
    if (typeof currentTownScene !== 'undefined' && (currentTownScene === WORLD_SCENE_KEY || currentTownScene === LINGJIE_SCENE_KEY) && arrived) closeTownScene();
    // 選了戰鬥地圖：傳送成功就切到「戰鬥」分頁，第一眼看到「仙魔戰場實況」（2026-10-01 使用者要求；城鎮等安全區不切）
    if (arrived && !maps[cIndex].isSafe) switchTab('battle');
}

// 進入地圖的門檻檢查：回傳 { msg: 完整提示, short: 地圖紅點旁的短字 }，可以進入回傳 null（changeMap 與人界／靈界地圖紅點共用）
// GM 測試人物（2026-10-04 使用者：「把測試人物設置為 GM，開啟進出任何地圖權限」）：存檔 player.gm === true（受簽章保護，只能由開發者產生帶 gm 的存檔代碼）
//   → 所有地圖都能直接進出（不看境界、四維、靈界、暫存區），飛升／返回人界不扣傳送陣靈石，城鎮禁入也不擋
function isGM() { return !!(player && player.gm === true); }
function getMapEntryBlock(cIndex, iIndex) {
    if (isGM()) return null;
    const targetMap = maps[cIndex].items[iIndex];
    // 硬性境界門檻（仙魔戰場：仙人初境起，不能用挑戰模式越級，第 79 節）
    if (typeof targetMap.hardMinRealm === 'number' && player.realmIndex < targetMap.hardMinRealm)
        return { msg: `【${targetMap.name}】只有${realms[targetMap.hardMinRealm]}以上的修士才能進入。`, short: `🔒${realms[targetMap.hardMinRealm]}` };
    // 境界上限（時空秘境：仙人初境以下，第 78 節）
    if (typeof targetMap.maxRealm === 'number' && player.realmIndex > targetMap.maxRealm)
        return { msg: `【${targetMap.name}】只有${realms[targetMap.maxRealm]}以下的修士才能進入。`, short: `🔒${realms[targetMap.maxRealm]}以下` };
    const minRealm = getMapMinRealm(targetMap);
    if (minRealm && isBelowMapLevel(targetMap))   // realm: true＝可改用挑戰模式進入（第 70 節）
        return { msg: `進入【${targetMap.name}】失敗！您的境界未達【${typeof targetMap.minL === 'number' ? nv2LevelLabel(getMapMinLevel(targetMap)) : realms[minRealm]}】。\n（可用「⚔️ 挑戰模式」越級進入）`, short: `⚔️挑戰`, realm: true };
    // 四維門檻：新制看 nv2MinStat 與 nv2Stat 總值（numeric.js），舊制看 minStat 與 player.stats
    const minS = NUMERIC_V2 ? targetMap.nv2MinStat : targetMap.minStat;
    if (minS) {
        const st = k => NUMERIC_V2 ? nv2Stat(k) : player.stats[k];
        if (["str", "con", "int", "spr"].some(k => st(k) < minS))
            return { msg: `進入【${targetMap.name}】失敗！四維屬性全數必須大於 ${minS} 方可進入。`, short: `🔒四維${minS}` };
    }
    // 靈界（lingjie.js，第 74 節）：第四、五區要身在靈界；身在靈界不能直接去人界的地圖（宗門例外：系統送回與洞府鈕另有處理）
    if (isLingjieMapCategory(cIndex) && !isInLingjie())
        return { msg: `【${targetMap.name}】位於靈界，需經人界地圖的飛升點、以五行傳送陣靈石各 1 顆飛升後才能前往。`, short: '🔒靈界' };
    if (isInLingjie() && !isLingjieMapCategory(cIndex) && !(cIndex === 0 && iIndex === 0))
        return { msg: `你身在靈界，無法直接前往人界的【${targetMap.name}】。\n請從靈界地圖「返回人界」（需五行傳送陣靈石各 1 顆）。`, short: '🔒人界' };
    // 暫存區滿了不能外出練功（enhance.js）
    if (!maps[cIndex].isSafe && isGearStashFull())
        return { msg: `暫存區已滿（${GEAR_STASH_MAX}/${GEAR_STASH_MAX}）！\n請先到背包處理暫存區的橙色裝備（移入背包、分解或毀棄），才能外出練功。`, short: '🔒暫存區滿' };
    return null;
}
function findMapByName(name) {
    for (let c = 0; c < maps.length; c++) {
        const i = maps[c].items.findIndex(item => item.name === name);
        if (i >= 0) return { c, i };
    }
    return null;
}
// 地圖紅點旁的鎖定短字（town.js 的 renderTownHotspots；可以進入回傳空字串）
function getMapLockShort(name) {
    const f = findMapByName(name);
    const b = f && getMapEntryBlock(f.c, f.i);
    return b ? b.short : '';
}

// bigMap（第 73 節）：只有從大地圖進入（與洞府「宗門」鈕回宗門，秘密路線要用）才呼叫 onEncounterMapChange；
//   快捷清單、戰死／渡劫失敗／暫存區滿的系統傳送都不算（秘密路線、累計次數、空間裂縫、三界召令、城中機緣、機緣任務的前往步驟）
function changeMap(cIndex, iIndex, challengeOk, bigMap) {
    let targetMap = maps[cIndex].items[iIndex];

    const block = getMapEntryBlock(cIndex, iIndex);
    if (block && block.realm && !challengeOk) { confirmChallengeMap(cIndex, iIndex, bigMap); return; }   // 挑戰模式：先跳警告（第 70 節）
    if (block && !block.realm) { gameAlert(block.msg); return; }

    // 懸賞對決中換地圖＝逃離對決（懸賞保留，bounty.js）
    if (inBountyDuel) endBountyDuel("flee");
    if (enemies.length > 0) {
        addLog("🏃 捨棄戰鬥，逃往其他區域！", "combat");
        enemies = [];
        respawnTimer = 0;
    }
    if (isInLingjie() && !isLingjieMapCategory(cIndex)) player.inLingjie = false;   // 戰死、渡劫失敗等系統送回宗門＝回到人界（第 74 節）
    if (isGM() && isLingjieMapCategory(cIndex)) player.inLingjie = true;   // GM 直接傳送到靈界地圖＝身在靈界
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
    } else if (player.currentMap.spacetime) {
        addLog(`🌀 踏入【${player.currentMap.name}】！妖獸皆為你境界巔峰的 ${SPACETIME_REALM_STR()} 倍強度，3 秒便再度湧現，戰死照常折壽；每秒消耗 ${SPACETIME_REALM.upkeepPerSec.toWan()} 靈石維持秘境能量。`, "combat");
    } else if (isChallengeMap()) {
        addLog(`⚔️ 挑戰模式：越級闖入【${player.currentMap.name}】！戰死照常折壽；可離線／背景掛機（撐不住會退回）。`, "combat");
    } else {
        addLog(`🗺️ 深入野外 ${player.currentMap.name}，四周充滿危險氣息。`);
    }
    updateCombatVisualPanel();
    if (bigMap) onEncounterMapChange(targetMap, player.currentMapIsSafe);   // 奇遇（encounter.js，第 63 節）；只有大地圖進入才觸發（第 73 節）
}

// ==================== 挑戰模式（全地圖開放，第 70 節；2026-10-03 使用者定案）====================
// 境界不足（getMapEntryBlock 的 realm）的地圖可以確認警告後越級進入：
//   1. 進入前跳警告（境界差、妖獸比主修地圖強幾倍）  2. 戰死照常折壽、扣靈石（combat.js 的 onPlayerKilledInField，不另外處理）
//   3. 可以離線／背景掛機（2026-10-06 起；原本一律退回宗門）：撐不住照常退回，收益照主要地圖（save.js）  4. 經驗、靈石、聲望、刷新補償照「自己境界的主要地圖」（getRewardMap）
//   5. 做裝通貨、中品／上品武學碎片掉率 × getChallengeCraftMult（越 1 境 ×1.5、2 境 ×2、3 境以上 ×3，craft.js／spells.js）；另有野外鍛造圖紙（equipment.js 的 rollBlueprintChallengeDrops）
function isChallengeMap(item) {
    item = item || player.currentMap;
    if (!item || (item === player.currentMap && player.currentMapIsSafe)) return false;
    const f = findMapByName(item.name);
    if (!f || maps[f.c].isSafe) return false;
    return isBelowMapLevel(item);
}
// 越過門檻幾個境界（0＝不是挑戰）
function getChallengeOver(item) { item = item || player.currentMap; return isChallengeMap(item) ? Math.max(1, getMapMinRealm(item) - player.realmIndex) : 0; }   // 同境界但階數不夠（minL）算越 1 境
function getChallengeCraftMult() {
    if (isSpacetimeMap()) return SPACETIME_REALM.craftMult;   // 時空秘境：做裝通貨、中品武學秘典碎片 ×3（第 78 節）
    const o = getChallengeOver();
    return o <= 0 ? 1 : (CHALLENGE_CRAFT_MULT[Math.min(o, CHALLENGE_CRAFT_MULT.length - 1)] || 1);
}
// 自己境界的主要練功地圖（config-realms.js 的 realmPacing）
function getMainMapForRealm() {
    const pace = realmPacing[Math.min(player.realmIndex, realmPacing.length - 1)];
    const f = pace && findMapByName(pace.map);
    return f ? maps[f.c].items[f.i] : null;
}
// 收益速度上限（numeric.js 的 nv2RewardSpeedAdj）：時空秘境 SPACETIME_REALM.rewardSpeedCap 倍，其他地圖 NV2.rewardSpeedCap（第 78 節）
//   地圖可自訂 rewardSpeedCap（仙魔戰場 Infinity＝不設上限，第 79 節）
function getRewardSpeedCap() {
    if (isSpacetimeMap()) return SPACETIME_REALM.rewardSpeedCap;
    const m = player.currentMap;
    return m && !player.currentMapIsSafe && typeof m.rewardSpeedCap === 'number' ? m.rewardSpeedCap : NV2.rewardSpeedCap;
}
// 擊殺收益用的地圖：挑戰模式＝自己境界的主要地圖，否則＝所在地圖
//   時空秘境（第 78 節）與 rewardAsMain 的地圖（仙魔戰場，第 79 節）同樣照主要地圖
function getRewardMap() {
    const m = player.currentMap, asMain = !!(m && m.rewardAsMain && !player.currentMapIsSafe);
    return isChallengeMap() || isSpacetimeMap() || asMain ? (getMainMapForRealm() || player.currentMap) : player.currentMap;
}

// ==================== 時空秘境（亂星海，第 78 節；2026-10-06 使用者指定）====================
// 人界地圖「亂星海」分區 → enterSpacetimeRealm；仙人初境以下可進；妖獸＝自己境界 10 階 × 30 倍、刷新 3 秒（config-maps.js 的 SPACETIME_REALM 與地圖 getter）
// 經驗、靈石、聲望照自己境界的主要地圖（getRewardMap）；專屬掉落 rollSpacetimeDrops；做裝通貨、中品武學秘典碎片 ×3（getChallengeCraftMult）
function isSpacetimeMap(item) {
    item = item || player.currentMap;
    return !!(item && item.spacetime && !(item === player.currentMap && player.currentMapIsSafe));
}
function getMapRespawnSeconds(item) {
    item = item || player.currentMap;
    return item && typeof item.respawnSec === 'number' ? item.respawnSec : MONSTER_RESPAWN_SECONDS;
}
// ==================== 仙魔戰場（靈界・風元大陸，第 79 節；2026-10-09 使用者指定）====================
// 靈界地圖「風元大陸」紅點 → 說明確認 → 進入；妖獸＝自己境界 10 階 × 主要練功圖的強度、刷新 1 秒、經驗沒有上限（config-maps.js）
async function enterXianmoBattlefield() {
    const f = findMapByName('仙魔戰場');
    if (!f) return;
    const item = maps[f.c].items[f.i];
    if (player.currentMap === item && !player.currentMapIsSafe) { showToast('⚔️ 你已身在仙魔戰場'); return; }
    const block = getMapEntryBlock(f.c, f.i);
    if (block) { gameAlert(block.msg); return; }
    const main = getMainMapForRealm(), [lo, hi] = item.nv2Str;
    const msg = `⚔️ 風元大陸・仙魔戰場\n`
        + `\n・${realms[item.hardMinRealm]}～${realms[15]}皆可進入`
        + `\n・敵人＝你所在境界的 10 階（你是${realms[player.realmIndex]} → ${nv2LevelLabel(item.nv2FixedL)}），強度同【${main ? main.name : '主要練功圖'}】${lo}～${hi} 倍`
        + `\n・敵人 ${getMapRespawnSeconds(item)} 秒就刷新，讓你自顧不暇；戰死照常折損壽元、遺失 10% 靈石，回到${respawnPlaceName()}`
        + `\n・經驗、靈石、聲望照【${main ? main.name : '主要練功圖'}】計算，沒有收益上限：殺得越快拿得越多`
        + `\n・專屬掉落：${Math.max(XIANMO_DROPS.blueprintMinLevel, getBlueprintDropLevel())} 等鍛造圖紙、上品武學秘典碎片、絕學武學秘典碎片（極稀有）、尊者以上夥伴碎片（帝境、至高極稀有）`
        + `\n\n確定進入？`;
    if (!(await gameConfirm(msg))) return;
    selectMap(f.c, f.i, true);
}
function SPACETIME_REALM_STR() { const f = findMapByName(SPACETIME_REALM.name); const m = f && maps[f.c].items[f.i]; return m && m.nv2Str ? m.nv2Str[0] : 30; }
// 圖紙等級：blueprintMaxLevel（3000）以內最高的一檔（2500 等）
function getSpacetimeBlueprintLevel() {
    const fit = BLUEPRINT_LEVELS.filter(l => l <= SPACETIME_REALM.blueprintMaxLevel);
    return fit.length ? fit[fit.length - 1] : BLUEPRINT_LEVELS[0];
}
async function enterSpacetimeRealm() {
    const f = findMapByName(SPACETIME_REALM.name);
    if (!f) return;
    if (isSpacetimeMap()) { showToast('🌀 你已身在時空秘境'); return; }
    const block = getMapEntryBlock(f.c, f.i);
    if (block) { gameAlert(block.msg); return; }
    const cost = SPACETIME_REALM.upkeepPerSec;
    if ((player.coins || 0) < cost) { gameAlert(`開啟時空秘境每秒需消耗 ${cost.toWan()} 靈石維持能量，你的靈石不足。`); return; }
    const msg = `🌀 亂星海・時空秘境\n`
        + `\n・${realms[SPACETIME_REALM.maxRealm]}以下皆可進入`
        + `\n・妖獸＝你所在境界的 10 階 × ${SPACETIME_REALM_STR()} 倍強度（你是${realms[player.realmIndex]}）`
        + `\n・妖獸 ${getMapRespawnSeconds(maps[f.c].items[f.i])} 秒就刷新，幾乎沒有調息的時間，戰死照常折損壽元、遺失 10% 靈石`
        + `\n・秘境內不會掉落任何靈石；每秒消耗 ${cost.toWan()} 靈石維持秘境能量（一小時 ${(cost * 3600).toWan()}），靈石耗盡會被送回${respawnPlaceName()}`
        + `\n・你目前的靈石約可支撐 ${formatIdleDuration(Math.floor((player.coins || 0) / cost))}`
        + `\n・經驗照你境界的主要地圖計算`
        + `\n・專屬掉落：${getSpacetimeBlueprintLevel()} 等鍛造圖紙、中品武學秘典碎片、金木水火土傳送陣靈石、星允鐵、異火碎片、做裝通貨（×${SPACETIME_REALM.craftMult}）`
        + `\n\n確定進入？`;
    if (!(await gameConfirm(msg))) return;
    selectMap(f.c, f.i, true);
}
// 每秒的能量消耗（combat.js 的 combatTick 每秒呼叫）：扣 upkeepPerSec 靈石；付不起就送回復活點，回傳 false（這一秒不再戰鬥）
function tickSpacetimeUpkeep() {
    if (!isSpacetimeMap()) return true;
    const cost = SPACETIME_REALM.upkeepPerSec;
    if ((player.coins || 0) >= cost) { player.coins -= cost; return true; }
    const name = player.currentMap.name;
    sendToRespawn();
    addLog(`🌀 靈石耗盡，無法再支撐【${name}】的能量消耗（每秒 ${cost.toWan()} 靈石），被時空亂流送回【${player.currentMap.name}】。`, "system", true);
    if (typeof showToast === 'function') showToast('🌀 靈石耗盡，已離開時空秘境', 'warn');
    updateUI();
    return false;
}
// 專屬掉落（combat.js 線上：rolls＝takeDropRolls 的掉寶次數；save.js 離線／背景：收益次數）；回傳摘要文字
function rollSpacetimeDrops(rolls, silent) {
    if (!(rolls > 0) || !isSpacetimeMap()) return '';
    const D = SPACETIME_REALM, parts = [];
    const count = p => { const e = rolls * p; let n = Math.floor(e); if (Math.random() < e - n) n++; return n; };
    // 鍛造圖紙（固定檔次；5000 等以下 ×2 照 grantBlueprint）
    let bp = 0, tries = count(1);
    for (let i = 0; i < tries; i++) { const t = grantBlueprint(D.blueprint, '時空秘境斬殺妖獸，', getSpacetimeBlueprintLevel()); if (t) { bp++; if (!silent) addLog(t, "level-up", false, "item"); } }
    if (bp) parts.push(`鍛造圖紙 ×${bp}`);
    // 五行傳送陣靈石
    const st = LINGJIE_STONE_KEYS.map(k => { const n = count(D.lingStone); return n > 0 ? `${k}屬性傳送陣靈石×${addLingStone(k, n)}` : ''; }).filter(Boolean);
    parts.push(...st);
    // 星允鐵、異火碎片
    let iron = 0; for (let i = count(D.starIron); i > 0; i--) iron += 1 + Math.floor(Math.random() * 3);
    if (iron) { const got = addStarIron(iron); if (got) parts.push(`星允鐵×${got}`); }
    let fire = 0; for (let i = count(D.fireShard); i > 0; i--) fire += 1 + Math.floor(Math.random() * 2);
    if (fire) parts.push(`異火碎片×${addFireShards(fire)}`);
    const t = parts.join('、');
    if (t && !silent) addLog(`🌀 時空秘境的妖獸遺落 ${t}！`, "level-up", false, "item");
    return t;
}
// 仙魔戰場專屬掉落（第 79 節；機率 config-maps.js 的 XIANMO_DROPS）：圖紙 Lv.2500 起、絕學碎片、尊者／帝境／至高夥伴碎片
//   rolls＝掉寶次數（線上 combat.js 的 takeDropRolls、離線 save.js 的收益次數）；silent＝離線結算（不逐筆寫日誌，回傳彙總文字；夥伴碎片照常寫日誌）
function isXianmoMap(item) {
    item = item || player.currentMap;
    return !!(item && item.xianmo && !(item === player.currentMap && player.currentMapIsSafe));
}
function rollXianmoDrops(rolls, silent) {
    if (!(rolls > 0) || !isXianmoMap()) return '';
    const D = XIANMO_DROPS, parts = [];
    const count = p => { const e = rolls * p; let n = Math.floor(e); if (Math.random() < e - n) n++; return n; };
    // 鍛造圖紙：自己能掉的最高檔，至少 2500 等（grantBlueprint 每張各擲一次，5000 等以下 ×2）
    const lv = Math.max(D.blueprintMinLevel, getBlueprintDropLevel());
    let bp = 0, tries = count(1);
    for (let i = 0; i < tries; i++) { const t = grantBlueprint(D.blueprint, '仙魔戰場斬殺敵人，', lv); if (t) { bp++; if (!silent) addLog(t, "level-up", false, "item"); } }
    if (bp) parts.push(`${lv} 等鍛造圖紙 ×${bp}`);
    // 絕學武學秘典碎片（上品碎片走靈界野外原本的 rollSpellShardFieldDrops）
    const us = count(D.ultimateShard);
    if (us > 0) { addSpellShards(us, silent ? null : '仙魔戰場的敵人身上掉出', 'ultimate'); parts.push(`${spellShardName('ultimate')}×${us}`); }
    // 夥伴碎片：每個評級各自擲（每次掉寶最多觸發一次），只掉該評級尚未結識的夥伴
    D.partner.forEach(c => {
        for (let i = count(c.p); i > 0; i--) {
            const g = grantPartnerShards([c.tier], 1, c.amount, '仙魔戰場斬殺敵人');
            if (g) parts.push(`${c.tier}【${g.p.name}】碎片×${g.n}`);
        }
    });
    return parts.join('、');
}
function challengeStrengthText(item) {
    const main = getMainMapForRealm();
    if (!NUMERIC_V2 || !main || typeof nv2MonsterStats !== 'function') return '';
    const a = nv2MonsterStats(item), b = nv2MonsterStats(main);
    const r = (x, y) => (y > 0 ? x / y : 0);
    return `妖獸攻擊約為你主修地圖【${main.name}】的 ${r(a.atk, b.atk).toFixed(1)} 倍、氣血 ${r(a.hp, b.hp).toFixed(1)} 倍`;
}
async function confirmChallengeMap(cIndex, iIndex, bigMap) {
    const item = maps[cIndex].items[iIndex];
    const suit = getMapSuitRange(item), mapRealm = suit ? suit[0] : getMapMinRealm(item) + 1, gap = Math.max(1, mapRealm - player.realmIndex), over = Math.max(1, getMapMinRealm(item) - player.realmIndex);
    const cm = CHALLENGE_CRAFT_MULT[Math.min(over, CHALLENGE_CRAFT_MULT.length - 1)] || 1;
    const msg = `⚔️ 挑戰模式：越級進入【${item.name}】\n`
        + `境界差 ${gap}（妖獸約${realms[Math.min(mapRealm, realms.length - 1)]}，你是${realms[player.realmIndex]}）\n`
        + (challengeStrengthText(item) ? challengeStrengthText(item) + '\n' : '')
        + `\n・戰死照常折損壽元、遺失 10% 靈石（壽元歸零會刪檔），風險自負\n`
        + `・可離線／背景掛機（以目前實力撐不住時照常退回）\n`
        + `・經驗、靈石照你境界的主要地圖計算，不會因越級暴增\n`
        + `・做裝通貨、武學秘典碎片掉率 ×${cm}，並有機會掉落鍛造圖紙\n\n確定進入？`;
    const ok = typeof gameConfirm === 'function' ? await gameConfirm(msg) : (await gameConfirm(msg));
    if (!ok) return;
    changeMap(cIndex, iIndex, true, bigMap);
    const target = maps[cIndex].items[iIndex];
    closeModal('map-category-modal');
    closeModal('world-map-modal');
    afterMapArrive(cIndex, target);
}
