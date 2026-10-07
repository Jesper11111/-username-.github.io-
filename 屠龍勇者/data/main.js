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

function continueGame() {
    if (!loadGame()) { showToast('讀取存檔失敗'); return; }
    hunt = null; session = null; walkHome = null;
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
});
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);
