// 屠龍勇者：進入點與主迴圈（最後載入）
let lastTick = Date.now();
let regenAcc = 0, uiAcc = 0, saveAcc = 0;

function gameTick() {
    const now = Date.now();
    const dt = Math.min(1000, now - lastTick);   // 背景分頁被節流時最多補 1 秒（尚無離線收益）
    lastTick = now;
    gameNow += dt;
    if (!player) return;
    cleanBuffs();
    regenAcc += dt;
    if (regenAcc >= REGEN_MS) { regenAcc -= REGEN_MS; regenTick(); }
    walkTick();
    huntTick(dt);
    uiAcc += dt;
    if (uiAcc >= 250) {
        uiAcc = 0;
        renderStatus();
        if (currentTab === 'hunt') updateHuntLive();
    }
    saveAcc += dt;
    if (saveAcc >= AUTOSAVE_MS) { saveAcc = 0; saveGame(); }
}

function continueGame() {
    if (!loadGame()) { showToast('讀取存檔失敗'); return; }
    hunt = null; session = null; walkHome = null;
    addLog(`歡迎回來，${player.name}！`, 'sys');
    enterGame();
}

window.addEventListener('DOMContentLoaded', () => {
    document.title = GAME_TITLE;
    showTitle();
    setInterval(gameTick, TICK_MS);
    initPwa();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);
