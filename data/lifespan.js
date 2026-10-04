// 壽元：突破大境界增加、歲月自然流逝（有底線）、每次死亡依當前境界扣除，歸零即身死道消（清除存檔重新開始）
// 數值表見 config-lifespan.js；壽元與戰力無關。

function getDeathLifespanCost() {
    let row = lifespanByRealm[player.realmIndex] || lifespanByRealm[lifespanByRealm.length - 1];
    return row.deathCost;
}

// 壽元可能有小數（自然流逝），顯示時一律取整數
function formatLifespan(years) {
    return Math.floor(years).toWan();
}

// ---- 歲月流逝 ----

// 自然流逝的底線：剩下「3 次死亡的量」時停止
function getLifespanFloor() {
    return getDeathLifespanCost() * LIFESPAN_FLOOR_DEATHS;
}

// 目前所在地的流逝倍率（安全區 1、野外依危險度加速、渡劫中最快）
function getAgingMultiplier() {
    if (inTribulation) return LIFESPAN_TRIBULATION_MULT;
    let cat = getMapCategoryIndex(player.currentMap.name);
    return LIFESPAN_DANGER_MULT[cat] || 1;
}

// 該境界給的壽元在「安全區」可撐幾小時（見 config-lifespan.js 的說明）
function getAgingHours(realmIndex) {
    let pace = realmPacing[realmIndex] || realmPacing[realmPacing.length - 1];
    let mapDanger = LIFESPAN_DANGER_MULT[getMapCategoryIndex(pace.map)] || 1;
    return Math.max(LIFESPAN_MIN_AGING_HOURS, pace.hours * LIFESPAN_PACE_MULT * mapDanger);
}

// 目前每分鐘流逝的年數（未觸底時）
function getAgingPerMinute() {
    let row = lifespanByRealm[player.realmIndex] || lifespanByRealm[lifespanByRealm.length - 1];
    return row.gain / (getAgingHours(player.realmIndex) * 60) * getAgingMultiplier();
}

let lifespanWarned = { low: false, floor: false };   // 提示只出現一次，壽元回升後重置

// 經過 seconds 秒，以 rateScale 倍速流逝（線上 1、離線 LIFESPAN_OFFLINE_RATE）；回傳實際流逝的年數
function ageLifespan(seconds, rateScale = 1) {
    let floor = getLifespanFloor();
    if (player.lifespan <= floor) { checkLifespanWarnings(); return 0; }
    let loss = getAgingPerMinute() * (seconds / 60) * rateScale;
    let before = player.lifespan;
    player.lifespan = Math.max(floor, player.lifespan - loss);
    // 年齡隨實際流逝的歲月增加（觸底後歲月停止，年齡也跟著停住）
    player.age = (player.age || LIFESPAN_START_AGE) + (before - player.lifespan);
    checkLifespanWarnings();
    return before - player.lifespan;
}

function checkLifespanWarnings() {
    let floor = getLifespanFloor();
    if (player.lifespan > floor * 2) lifespanWarned.low = false;
    if (player.lifespan > floor) lifespanWarned.floor = false;

    if (player.lifespan <= floor && !lifespanWarned.floor) {
        lifespanWarned.floor = lifespanWarned.low = true;
        addLog(`🕯️ 壽元將盡（剩 ${formatLifespan(player.lifespan)} 年）！歲月已停止侵蝕，但再死亡 ${LIFESPAN_FLOOR_DEATHS} 次便身死道消。盡快突破境界或至千寶閣求取壽元丹！`, "combat");
    } else if (player.lifespan <= floor * 2 && !lifespanWarned.low) {
        lifespanWarned.low = true;
        addLog(`⏳ 壽元日漸枯竭（剩 ${formatLifespan(player.lifespan)} 年），歲月無情，請把握時間突破境界！`, "combat");
    }
}

// 舊存檔沒有壽元欄位時，依目前境界補上「凡人起累積到現在」的壽元
function getInitialLifespanForRealm(realmIndex) {
    let total = 0;
    for (let i = 0; i <= realmIndex && i < lifespanByRealm.length; i++) total += lifespanByRealm[i].gain;
    return total;
}

// 由 advanceRealm() 呼叫：晉升後增加該境界的壽元
function gainRealmLifespan() {
    let row = lifespanByRealm[player.realmIndex];
    if (!row) return;
    player.lifespan += row.gain;
    addLog(`⏳ 晉升【${row.realm}】，壽元增加 ${row.gain.toWan()} 年！（剩餘 ${formatLifespan(player.lifespan)} 年，此境界每死亡一次折壽 ${row.deathCost} 年）`, "level-up");
}

// 玩家死亡（野外戰死、渡劫失敗）時呼叫：扣壽元、所有靈寵陣亡。
// 回傳 true 代表壽元耗盡、遊戲結束，呼叫端應立即中止後續流程。
function handlePlayerDeath() {
    let cost = Math.ceil(getDeathLifespanCost() * (1 - gearFx("延壽")));   // 延壽（裝備特效，gear.js）
    let before = player.lifespan;
    player.lifespan = Math.max(0, player.lifespan - cost);
    // 折壽也算進年齡（重傷折壽 = 老了 N 歲），年齡與損失的壽元完全成正比
    player.age = (player.age || LIFESPAN_START_AGE) + (before - player.lifespan);
    killAllBeasts();

    if (player.lifespan <= 0) {
        triggerLifespanGameOver();
        return true;
    }
    addLog(`🕯️ 死裡逃生，折損壽元 ${cost} 年！剩餘壽元 ${formatLifespan(player.lifespan)} 年。`, "combat");
    return false;
}

function triggerLifespanGameOver() {
    gameOver = true;
    inTribulation = false;
    heartDemon = null;
    inBountyDuel = false;
    duelOpponent = null;
    enemies = [];
    localStorage.removeItem('xiuxian_save');
    addLog(`💀 壽元耗盡，身死道消……`, "combat");
    setTimeout(() => {
        // 遊戲內提示框不會暫停程式：按確定後才重新載入（原生 alert 在 App 內建瀏覽器不顯示）
        gameDialog(`【身死道消】\n${player.name} 壽元已盡，一身修為化為塵土。\n存檔已清除，請重新踏上修仙之路。`, false).then(() => location.reload());
    }, 100);
}
