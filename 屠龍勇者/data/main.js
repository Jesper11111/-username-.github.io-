// 屠龍勇者：進入點與主迴圈（最後載入）
let lastTick = Date.now();
let regenAcc = 0, uiAcc = 0, saveAcc = 0;

function gameTick() {
    const now = Date.now();
    const gap = now - lastTick;
    const dt = Math.min(1000, gap);   // 一般情況最多補 1 秒
    lastTick = now;
    gameNow += gap;   // 遊戲時鐘跟著真實時間走（分頁在背景也算），不然會越來越落後，載入別台裝置的存檔時冷卻／增益會變成好幾小時
    if (offlineHold) return;   // 向伺服器結算離線收益中（vault.js）
    if (!player) return;
    // 分頁在背景被瀏覽器暫停太久（或電腦休眠）：用離線收益補上這段時間（要登入、扣鑽石）
    if (gap >= OFFLINE_MIN_MS && offlineEligible()) { offlineSettle(gap); return; }
    cleanBuffs();
    regenAcc += dt;
    if (regenAcc >= REGEN_MS) { regenAcc -= REGEN_MS; regenTick(); }
    walkTick();
    huntTick(dt);
    uiAcc += dt;
    if (uiAcc >= 250) {
        uiAcc = 0;
        renderStatus();
        if (huntVisible()) updateHuntLive();
    }
    saveAcc += dt;
    if (saveAcc >= AUTOSAVE_MS) { saveAcc = 0; saveGame(); }
}

// 換角色（人物選單）時清掉上一個角色的戰鬥、地圖畫面、遊戲訊息
function resetSessionState() {
    hunt = null; session = null; walkHome = null;
    scene = null;
    gameLog.length = 0;
}

function continueGame() {
    if (!slotHasSave(currentSlot)) setCurrentSlot(nextFilledSlot());
    if (!loadGame()) { showToast('讀取存檔失敗'); return; }
    resetSessionState();
    addLog(`歡迎回來，${player.name}！`, 'sys');
    const away = Date.now() - lastSaveAt;
    enterGame();
    offlineSettle(away);   // 離線收益：要登入、只有最後離線的角色、扣鑽石（vault.js）
    marketDeliver(true);   // 交易所：離線時買到的道具、賣出的金幣（market.js）
    vaultDeliver();        // 共用倉庫：還沒交貨的取出（vault.js）
    diaRefresh();          // 鑽石、每日登入獎勵   // 交易所：離線時買到的道具、賣出的金幣（market.js）
}

window.addEventListener('DOMContentLoaded', () => {
    document.title = GAME_TITLE;
    showTitle();
    setInterval(gameTick, TICK_MS);
    initPwa();
    initCloud();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);
