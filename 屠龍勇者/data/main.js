// 屠龍勇者：進入點與主迴圈（最後載入）
let lastTick = Date.now();
let regenAcc = 0, uiAcc = 0, saveAcc = 0;

function gameTick() {
    const now = Date.now();
    const gap = now - lastTick;
    const dt = Math.min(1000, gap);   // 一般情況最多補 1 秒
    lastTick = now;
    gameNow += dt;
    if (!player) return;
    // 分頁在背景被瀏覽器暫停太久（或電腦休眠）：用離線收益補上這段時間
    if (gap >= OFFLINE_MIN_MS) {
        const r = applyOffline(gap);
        if (r) { refreshUI(); showOfflineReport(r); }
    }
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
    const report = away >= OFFLINE_MIN_MS ? applyOffline(away) : null;
    enterGame();
    if (report) showOfflineReport(report);
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
