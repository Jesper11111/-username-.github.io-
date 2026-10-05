// ==================== 存檔驗證與合理性檢查（第 72 節，2026-10-03 使用者要求「讓玩家無法竄改資料」）====================
// ① 存檔簽章：本機存檔（localStorage 'xiuxian_save'）與存檔代碼（匯出）都在 JSON 裡帶 _sig（簽的是拿掉 _sig 後的 JSON）。
//    簽過一次的存檔會帶 player._ig = 1；之後簽章不符或被拿掉 → 判定為「被修改」。沒簽過的舊存檔第一次讀取時直接接受並補簽。
//    匯入沒簽章的舊代碼：存檔時間早於 IG_UNSIGNED_UNTIL 才接受，之後的視為被修改。
// ② 合理性檢查：player.audit = { play: 累計遊玩秒數（線上每秒＋離線結算秒數）, max: 曾達到的最高修煉進度（小時）, used: 改版後新增的進度（小時）}
//    修煉進度＝config-realms.js 的 realmPacing 節奏時數（已過的境界＋目前境界的階數比例）。新增進度超過 遊玩時數 × IG_SPEED_MAX ＋ IG_GRACE_HOURS → 判定異常。
//    轉世後重新爬升、還沒超過以前最高進度的部分不計；改版前的存檔以第一次讀取時的進度為起點。
// 判定後：player.integrity = { flagged: true, reason, at }（寫進存檔、受簽章保護）；不能上戰力榜／守城榜、不能寄售與出價（leaderboard.js、market.js 的 isSaveFlagged）。
//    單機遊玩不受影響（只影響會牽涉其他玩家的功能），也不刪檔——避免誤判讓玩家失去進度。
// ⚠️ 這是前端驗證，金鑰也在程式裡；搭配建置時的混淆（tools/build.js）提高門檻，擋一般玩家用主控台／文字編輯器改資料。

const IG_SALT = "fc凡塵✦" + "7Qx!pL2#vR";
const IG_UNSIGNED_UNTIL = Date.UTC(2026, 9, 5, 16);   // 2026-10-06 00:00（台灣時間）前匯出的舊代碼不帶簽章也接受
const IG_SPEED_MAX = 10;    // 修煉進度最多比節奏表快幾倍（一般玩家約 1 倍、強力配置約 3～5 倍）
const IG_GRACE_HOURS = 2;

function igHash(str, seed) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
function igSign(str) { return igHash(IG_SALT + str, 7) + igHash(str + IG_SALT, 1013); }

// 一次性解除標記（2026-10-05 使用者：「把被系統標記的玩家解除標記」）：這個時間以前被標記的存檔，讀檔時清掉標記，
//   並把合理性檢查的起點重設為目前進度（否則「修煉進度過快」下次存檔又會被標回去）。之後新的異常照常標記。
const IG_AMNESTY_AT = Date.UTC(2026, 9, 5, 9);   // 2026-10-05 17:00（台灣時間）
function igAmnesty() {
    const g = player && player.integrity;
    if (!g || !g.flagged || !(g.at < IG_AMNESTY_AT)) return;
    player.integrity = null;
    if (!player.audit || typeof player.audit !== 'object') player.audit = {};
    try { player.audit.max = igProgressHours(); } catch (e) { delete player.audit.max; }
    player.audit.used = 0;
    addLog('✅ 存檔驗證標記已由系統解除，戰力榜、寄售與世界 Boss 恢復使用。', 'system');
}

function isSaveFlagged() { return !!(player && player.integrity && player.integrity.flagged); }
function flagSave(reason) {
    if (isSaveFlagged()) return;
    player.integrity = { flagged: true, reason, at: Date.now() };
    addLog(`⚠️ 存檔驗證異常（${reason}）：已停用戰力榜與寄售。單機遊玩不受影響。`, "system");
}

// ---- 本機存檔 ----
// saveLocal 呼叫：補上簽章標記、做合理性檢查，回傳要寫入 localStorage 的字串——簽章 _sig 直接嵌在同一份 JSON 的最後
//   （同一次寫入，兩個分頁同時存檔也不會讓存檔與簽章錯開；簽的是不含 _sig 的 JSON，讀回 parse 後拿掉 _sig 再 stringify 會得到一模一樣的字串）
function igPrepareSave() {
    player._ig = 1;
    delete player._sig;
    igAuditCheck();
    const str = JSON.stringify(player);
    return str.slice(0, -1) + ',"_sig":"' + igSign(str) + '"}';
}
// loadLocal 在 applySaveData 之前呼叫：回傳 null＝通過，否則回傳原因；會把 data 的 _sig 拿掉
function igVerifyLocal(data) { return igVerifyImport(data, true); }

// ---- 存檔代碼 ----
// 匯出：在一份複本上加 _sig（簽的是不含 _sig 的 JSON）
function igSignedCopy(obj) {
    const o = Object.assign({}, obj, { _ig: 1 });
    delete o._sig;
    o._sig = igSign(JSON.stringify(o));
    return o;
}
// 匯入（decode 之後、applySaveData 之前）與讀檔共用：回傳 null＝通過，否則原因；會把 data 的 _sig 拿掉
//   local＝本機存檔：沒簽過（改版前）的一律接受；匯入代碼：沒簽章的只接受 IG_UNSIGNED_UNTIL 之前匯出的
function igVerifyImport(data, local) {
    if (!data || typeof data !== 'object') return null;
    const sig = data._sig;
    delete data._sig;
    if (sig) return sig === igSign(JSON.stringify(data)) ? null : (local ? '存檔內容被修改' : '存檔代碼被修改');
    if (data._ig) return '簽章遺失';
    if (local) return null;
    return (data.lastSaveTime || 0) < IG_UNSIGNED_UNTIL ? null : '存檔代碼沒有簽章';
}

// ---- 合理性檢查 ----
// 修煉進度（節奏表小時）：已過的境界合計 ＋ 目前境界 × 已累積經驗比例（第 k 階需要 k 份經驗，一個境界共 55 份，stats.js 的 getNextExp）
function igProgressHours() {
    const r = Math.min(player.realmIndex || 0, realmPacing.length - 1);
    let h = 0;
    for (let i = 0; i < r; i++) h += realmPacing[i].hours;
    let frac = 0;
    try { const need = getNextExp(); frac = need > 0 ? Math.min(1, Math.max(0, (player.exp || 0) / need)) : 0; } catch (e) { frac = 0; }
    const st = Math.min(10, player.stage || 1);
    return h + realmPacing[r].hours * Math.min(1, ((st - 1) * st / 2 + frac * st) / 55);
}
function igAuditCheck() {
    if (!player.audit || typeof player.audit !== 'object') player.audit = {};
    const a = player.audit, prog = igProgressHours();
    if (typeof a.play !== 'number') a.play = 0;
    if (typeof a.used !== 'number') a.used = 0;
    if (typeof a.max !== 'number') { a.max = prog; return; }   // 第一次（含改版前的存檔）：以目前進度為起點
    if (prog > a.max) { a.used += prog - a.max; a.max = prog; }
    if (a.used > IG_GRACE_HOURS + a.play / 3600 * IG_SPEED_MAX) flagSave(`修煉進度過快：${a.used.toFixed(1)} 小時的進度只花了 ${(a.play / 3600).toFixed(1)} 小時`);
}
// 遊玩時數：線上每秒（main.js 的主迴圈時鐘）；離線／背景由 save.js 的 settleIdleSeconds 加
function igAddPlaySeconds(sec) {
    if (!(sec > 0) || !player) return;
    if (!player.audit || typeof player.audit !== 'object') player.audit = {};
    player.audit.play = (player.audit.play || 0) + sec;
}
setInterval(() => { if (typeof gameStarted !== 'undefined' && gameStarted && !gameOver && !saveLoadFailed) igAddPlaySeconds(typeof tgPlaySecondsPerTick === 'function' ? tgPlaySecondsPerTick() : 1); }, 1000);
