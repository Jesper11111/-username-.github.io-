// 時間防護（ARCHITECTURE.md 第 77 節；2026-10-05 使用者選「② 整個程式加速 ③ 調系統時間」＋溫和處理：不標記存檔，只讓多出來的收益不算）
// 參考時間＝本網站（GitHub Pages）回應的 Date 標頭：玩家改不了，也不花 Firebase 額度。用 HEAD 請求（sw.js 只攔 GET，不會拿到快取）。
//   ② 加速器（Cheat Engine 之類，連 Date.now／performance.now 一起變快）：每 TG_SYNC_MS 讀一次伺服器時間，
//      比較「performance.now 經過的秒數 ÷ 伺服器經過的秒數」，超過 TG_SPEED_ON 倍就把主迴圈按比例跳過（tgAllowTick），收益回到真實時間的速度。
//   ③ 調系統時間：
//      - 離線結算（save.js 的 calcOfflineProgress）：存檔時記 player.lastSaveSrv（估計的伺服器時間），讀檔時以伺服器時間算實際離線多久，取兩者較小；
//        舊存檔沒有 lastSaveSrv 時，用「裝置時鐘比伺服器快多少」扣回。拿不到伺服器時間（沒網路）最多算 TG_UNVERIFIED_OFFLINE_SEC。
//      - 遊戲開著時把時鐘往後調（背景補發，save.js 的 checkBackgroundCatchUp）：一次跳超過 TG_GAP_VERIFY_MS 的間隔先向伺服器確認，只補真的經過的時間。
//      - 每日重置（todayKey 等）與隱藏仙翁的出現時段改用 gameNow()（＝伺服器校正後的現在時間）。
// 沒網路時一律退回裝置時間（離線結算另有上限），不影響單機遊玩。

const TG_SYNC_MS = 120000;                 // 多久對一次時（遊戲時間；加速時會更頻繁，剛好更快抓到）
const TG_MIN_WINDOW_SEC = 100;             // 測速至少要累積這麼多「伺服器秒數」（Date 標頭只到秒，窗口太短誤差大）
const TG_SPEED_ON = 1.15, TG_SPEED_OFF = 1.08, TG_SPEED_MAX = 20;
const TG_GAP_VERIFY_MS = 60000;            // 背景補發：一次跳超過 1 分鐘才向伺服器確認（正常的分頁節流不受影響）
const TG_UNVERIFIED_GAP_MS = 10 * 60000;   // 確認不了時（沒網路）背景補發最多 10 分鐘
const TG_UNVERIFIED_OFFLINE_SEC = 30 * 60; // 確認不了時離線結算最多 30 分鐘
const TG_SKEW_TOLERANCE_MS = 5 * 60000;    // 裝置時鐘誤差 5 分鐘內視為正常

let tgOffset = null;     // 伺服器時間 − Date.now()（最近一次對時；null＝還沒對過）
let tgSpeed = 1;         // 偵測到的時間流速倍率（1＝正常）
let tgAnchor = null;     // 測速起點 { srv, perf }
let tgTickBudget = 0;
let tgSpeedWarned = false;

// 伺服器校正後的現在時間（還沒對過時＝裝置時間）
function gameNow() { return Date.now() + (tgOffset || 0); }

// 讀伺服器時間：回傳 { srv: 伺服器毫秒, perf, date: 同一時刻的 performance.now／Date.now }，失敗回傳 null
async function tgFetchServerTime(timeoutMs) {
    if (typeof fetch !== 'function' || !/^https?:$/.test(location.protocol)) return null;
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, timeoutMs || 6000);
    const t0 = performance.now();
    try {
        const res = await fetch(location.pathname + '?tg=' + Math.random().toString(36).slice(2), { method: 'HEAD', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
        const ms = Date.parse(res.headers.get('Date') || '');
        if (!(ms > 0)) return null;
        const perf = performance.now();
        // Date 標頭只到秒（無條件捨去）＋回應途中的一半來回時間
        return { srv: ms + 500 + (perf - t0) / 2, perf, date: Date.now() };
    } catch (e) { return null; }
    finally { clearTimeout(timer); }
}

// 對時：更新 tgOffset，並以 performance.now 與伺服器時間的比例測速
async function tgSync(timeoutMs) {
    const s = await tgFetchServerTime(timeoutMs);
    if (!s) return null;
    tgOffset = s.srv - s.date;
    if (!tgAnchor || s.srv < tgAnchor.srv) tgAnchor = s;
    else {
        const dSrv = (s.srv - tgAnchor.srv) / 1000, dPerf = (s.perf - tgAnchor.perf) / 1000;
        if (dSrv >= TG_MIN_WINDOW_SEC) {
            const rate = dPerf / dSrv;
            if (rate > TG_SPEED_ON) {
                tgSpeed = Math.min(TG_SPEED_MAX, rate);
                if (!tgSpeedWarned && typeof addLog === 'function') {
                    tgSpeedWarned = true;
                    addLog(`⏱️ 偵測到遊戲時間流速異常（約 ${tgSpeed.toFixed(1)} 倍），修煉與收益改依真實時間計算。`, 'system');
                }
            } else if (rate < TG_SPEED_OFF) { tgSpeed = 1; tgSpeedWarned = false; }
            tgAnchor = s;
        }
    }
    return s;
}

// 主迴圈（combat.js 的 combatTick）每秒問一次：加速時按比例跳過，讓每「真實秒」最多跑一次
function tgAllowTick() {
    if (tgSpeed <= 1) { tgTickBudget = 0; return true; }
    tgTickBudget += 1 / tgSpeed;
    if (tgTickBudget >= 1) { tgTickBudget -= 1; return true; }
    return false;
}
// 遊玩時數（integrity.js）每秒加多少：加速時同樣按比例
function tgPlaySecondsPerTick() { return tgSpeed > 1 ? 1 / tgSpeed : 1; }

// 背景補發的大間隔：向伺服器確認實際經過多久，回傳可以補的毫秒（save.js 的 checkBackgroundCatchUp 呼叫）
async function tgVerifyGap(prevDate, missMs) {
    const off = tgOffset;   // 跳之前的對時結果
    const s = await tgSync(8000);
    if (!s || off == null) return Math.min(missMs, TG_UNVERIFIED_GAP_MS);
    const real = s.srv - (prevDate + off) - 1000;
    return Math.max(0, Math.min(missMs, real));
}

// 離線結算的秒數：localSec＝裝置時間算出的離線秒數；回傳 { sec, note }（note：提示玩家為什麼被調整）
async function tgVerifyOfflineSeconds(localSec, lastSaveSrv) {
    const t0 = performance.now();
    let s = await tgSync(6000);
    if (!s) s = await tgSync(6000);   // 再試一次
    if (!s) {
        if (localSec <= TG_UNVERIFIED_OFFLINE_SEC) return { sec: localSec, note: '' };
        return { sec: TG_UNVERIFIED_OFFLINE_SEC, note: `📶 無法連線確認時間，本次離線收益暫以 ${TG_UNVERIFIED_OFFLINE_SEC / 60} 分鐘計算。` };
    }
    const waited = (s.perf - t0) / 1000;   // 等對時花掉的秒數（這段已經在線上）
    let real;
    if (typeof lastSaveSrv === 'number' && lastSaveSrv > 0) real = (s.srv - lastSaveSrv) / 1000 - waited;
    else {
        const ahead = s.date - s.srv;   // 裝置時鐘比伺服器快多少（舊存檔沒有 lastSaveSrv：假設存檔當時時鐘是準的）
        real = ahead > TG_SKEW_TOLERANCE_MS ? localSec - ahead / 1000 : localSec;
    }
    real = Math.max(0, Math.floor(real));
    if (real + TG_SKEW_TOLERANCE_MS / 1000 < localSec)
        return { sec: Math.min(localSec, real), note: '⏰ 裝置時間與伺服器不符，離線時間已依伺服器時間計算。' };
    return { sec: Math.min(localSec, real + TG_SKEW_TOLERANCE_MS / 1000), note: '' };
}

// 存檔時記下估計的伺服器時間（這次遊戲還沒對過時，保留舊值）
function tgSaveStamp() {
    if (typeof player === 'undefined' || !player) return;
    if (tgOffset != null) player.lastSaveSrv = Math.round(Date.now() + tgOffset);
}

// 載入就開始對時，之後每 TG_SYNC_MS 一次
tgSync();
setInterval(() => { tgSync(); }, TG_SYNC_MS);
