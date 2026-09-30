// 遊戲進入點：網頁載入先顯示標題畫面，玩家點擊「進入世界」後才啟動遊戲

let gameStarted = false;

function initGame() {
    initForgeSelect();
    syncAutoSettingsUI();
    updateUI();
    setInterval(combatTick, 1000);
    // 每 30 秒自動存檔
    setInterval(saveLocal, 30000);
    // 手機切換 App、鎖螢幕或關閉分頁時立刻存檔：手機瀏覽器常在背景直接結束分頁，
    // 只靠 30 秒自動存檔會遺失最後一段進度（重新開啟時像是「讀檔失敗、進度倒退」）
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveLocal(); });
    window.addEventListener('pagehide', saveLocal);
    startLeaderboardSync();   // 天下戰力榜：定時上傳戰力（leaderboard.js，未設定 Firebase 時不動作）
    startMailboxSync();       // 仙府信箱：進遊戲後與每 30 分鐘檢查新信（mailbox.js）
    setTimeout(showNumericV2Notice, 800);   // 數值重做上線：老玩家第一次進來跳一次改版公告（第 52 節）
    setTimeout(checkAptitudeTest, 1200);   // 已在宗門但還沒測過資質的老玩家：補測（aptitude.js）
    initEncounters();   // 奇遇：封存入口、過期檢查、上次中斷的異界作廢（encounter.js）
}

// 由標題畫面的 enterWorld() 呼叫（title-screen.js）
// 有存檔 → 直接開始；沒有存檔（第一次進入）→ 先跳出性別選擇，選完才開始
function startGame() {
    if (loadLocal()) {
        gameStarted = true;
        initGame();
        return;
    }
    // 有存檔但讀取失敗：由讀檔失敗視窗處理（save.js 的 reportLoadFailure），絕不直接進入開新角色
    if (saveLoadFailed) return;
    document.getElementById('gender-modal').style.display = 'flex';
}

// 開場性別選擇視窗的按鈕（index.html 的 #gender-modal）
function chooseGender(gender) {
    if (gameStarted) return;   // 避免連點重複啟動主迴圈
    gameStarted = true;

    const avatar = PLAYER_AVATARS[gender] || PLAYER_AVATARS.male;
    player.gender = gender === 'female' ? 'female' : 'male';
    player.name = avatar.defaultName;
    player.lastSaveTime = Date.now();
    player.nv2Converted = Date.now();   // 新角色一開始就是新制，不需要轉換與改版公告（save.js 的 migrateNumericV2）

    closeModal('gender-modal');
    addLog(`🌱 歡迎踏入修仙世界！系統已初始化角色【${player.name}】。`, "system");
    initGame();
    saveLocal();   // 立刻存檔，重新整理後不會再次詢問性別
}

// 數值重做改版公告（save.js 的 migrateNumericV2 設 player.nv2Notice）：只跳一次，關閉後清掉旗標並存檔
function showNumericV2Notice() {
    if (!player.nv2Notice) return;
    document.getElementById('notice-modal').style.display = 'flex';
}
function closeNumericV2Notice() {
    player.nv2Notice = false;
    closeModal('notice-modal');
    saveLocal();
}

window.onload = function() {
    applyFontScale();   // 字級：套用這台裝置選的 小／中／大（settings.js）
    initModalTopClose();   // 每個彈窗右上角加 ✕（ui.js）
    initHomeUi();       // 洞府主畫面：舞台縮放與預設分頁（home-ui.js）
    restoreLogTab();    // 歷練日誌：還原上次選的分頁（ui.js）
    initTitleScreen();
};
