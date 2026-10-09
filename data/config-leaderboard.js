// 天下戰力榜（leaderboard.js，第 42 節）：所有玩家的戰力上傳到 Firebase Firestore 互相比較
// ⚠️ LEADERBOARD_FIREBASE_CONFIG 是 null 時戰力榜不啟用（不連網、不上傳），視窗只顯示「尚未開通」。
// 開通步驟見 ARCHITECTURE.md 第 42 節：在 Firebase 主控台建立專案 → 啟用「匿名登入」→ 建立 Firestore →
// 貼上 tools/firestore.rules 的安全規則 → 把「網頁應用程式」的設定物件貼到下面。
// （Firebase 的網頁設定本來就是公開的，安全性靠 Firestore 規則，不靠隱藏 apiKey）

// Firebase 專案 k5596101、網頁應用程式 xiuxian-web（2026-09-28 開通）；改成 null 即可關閉戰力榜
const LEADERBOARD_FIREBASE_CONFIG = {
    apiKey: "AIzaSyD2Vgk6qiOZgreL2ccaV98tCa2t9JFRUvM",
    authDomain: "k5596101.firebaseapp.com",
    projectId: "k5596101",
    storageBucket: "k5596101.firebasestorage.app",
    messagingSenderId: "77737588639",
    appId: "1:77737588639:web:9bf58facab1b552863afaa"
};

// 移除排行榜（2026-09-30 使用者要求：先「暫停紀錄」，後改為「刪除戰力榜與死守天南城榜」）：
//   true 時不上傳戰力、守城不送審（也不排入待送），大道石碑沒有戰力榜／守城榜分頁（只剩留言板、寄售），HUD 戰力數字不能點。
//   雲端資料由 GM 在 gm.html 按「💥 清空全部榜單」刪除；雲端規則沒改。要恢復改成 false（程式都還在）
// 2026-10-04 使用者：「戰力排行榜先開放，我等一下再關閉」→ 拆成兩個開關：戰力榜 LEADERBOARD_POWER_REMOVED、死守天南城榜 LEADERBOARD_RANKS_REMOVED
//   要再關閉戰力榜：LEADERBOARD_POWER_REMOVED 改回 true（並把 index.html 兩個 HUD 戰力的 onclick／🏆 拿掉）、換版本號
const LEADERBOARD_POWER_REMOVED = true;   // 2026-10-04 使用者：「關閉戰力榜」（GM 設定完後再次關閉）
const LEADERBOARD_RANKS_REMOVED = true;   // 現在只代表死守天南城榜（守城送審）

// Firebase App Check（2026-10-04，保護 Firebase 額度：只有從本網站正常開啟的遊戲能連雲端，用程式直接呼叫的流量被拒）：
//   填入 reCAPTCHA v3 的「網站金鑰」（site key，公開的，可以放程式裡；密鑰 secret key 只填在 Firebase 主控台）後啟用；空字串＝不啟用。
//   遊戲（leaderboard.js 的 initLeaderboardBackend）與 gm.html 都會用。主控台要先觀察「已驗證」比例接近 100% 才按「強制執行」（ARCHITECTURE.md 第 42 節）
const LEADERBOARD_APP_CHECK_KEY = "6LcvkectAAAAAAejw9MaS9J2GV566Xt9csqAGAfv";   // 2026-10-09 啟用（尚未強制執行）
const LEADERBOARD_SDK_BASE = "https://www.gstatic.com/firebasejs/10.14.1";   // compat 版，傳統 <script> 可直接用全域 firebase
const LEADERBOARD_COLLECTION = "leaderboard";          // 每位玩家一筆，文件 id = 匿名登入的 uid
const LEADERBOARD_BANNED_COLLECTION = "banned";        // GM 黑名單（gm.html），文件 id = 被封鎖的 uid；規則擋下其上傳
const LEADERBOARD_DEFENSE_SUBMIT_COLLECTION = "defenseSubmit";   // 死守天南城：玩家送審的個人最佳（文件 id = uid），GM 後台審核（第 50 節）
const LEADERBOARD_DEFENSE_BOARD_COLLECTION = "defenseBoard";     // 死守天南城通關榜：只有 GM 審核通過才寫入（玩家不能寫），大道石碑顯示
const LEADERBOARD_ADMINS_COLLECTION = "admins";       // 管理者名單，只能在 Firebase 主控台手動新增（文件 id = 管理者的 Google 登入 uid）
const LEADERBOARD_UPLOAD_INTERVAL_MS = 5 * 60 * 1000;  // 在線時每 5 分鐘上傳一次
const LEADERBOARD_FIRST_UPLOAD_DELAY_MS = 15 * 1000;   // 進入遊戲 15 秒後先上傳一次
const LEADERBOARD_MIN_GAP_MS = 60 * 1000;              // 兩次上傳至少間隔 60 秒（規則同樣限制，改這裡要一起改規則）
const LEADERBOARD_HISTORY_SIZE = 24;                   // 紀錄保留最近 24 次上傳的戰力＋時間（hist，約 2 小時），GM 後台比對戰力暴增用（第 50 節；規則同樣寫死 24，改這裡要一起改規則）
// 兩日紀錄 hist2（2026-09-27）：距 hist2 最後一筆 ≥ 30 分鐘時才把上一筆接上去，保留 96 筆 = 約 2 天；GM 可據此比對長時間成長與延後審核守城（規則寫死 1800 秒／96，改這裡要一起改規則）
const LEADERBOARD_HISTORY2_SIZE = 96;
const LEADERBOARD_HISTORY2_GAP_SEC = 30 * 60;
const LEADERBOARD_TOP_N = 30;                         // 榜單顯示前 N 名（規則限制單次最多讀 100 筆；2026-10-04 使用者要求 30，節省 Firebase 讀取額度）
const LEADERBOARD_REFRESH_COOLDOWN_MS = 30 * 1000;     // 視窗內「重新整理」按鈕冷卻（2026-10-04 由 10 秒改 30 秒，節省讀取額度）
const LEADERBOARD_AUTO_REFRESH_MS = 3 * 60 * 1000;     // 打開大道石碑時，同一分頁 3 分鐘內讀過就直接顯示上次的資料、不重讀（按「重新整理」才讀；2026-10-04）
const LEADERBOARD_TIMEOUT_MS = 8 * 1000;               // 開榜單時上傳／讀取最多等幾毫秒（斷線時不會卡在「讀取中」）

// ---- 修仙留言板（msgboard.js、gm.html「💬 留言板」，ARCHITECTURE.md 第 57 節；2026-09-28）----
const MSGBOARD_COLLECTION = "board";              // 留言（自動 id）：{ uid, name, realm, stage, text, createdAt }
const MSGBOARD_LIMIT_COLLECTION = "boardLimit";   // 每人最後留言時間（文件 id = uid），規則用它限制每 60 秒一則
const MSGBOARD_MUTED_COLLECTION = "muted";        // GM 禁言名單（文件 id = uid）
const MSGBOARD_FEED_COLLECTION = "boardFeed";     // 留言板彙整（2026-10-09 節省讀取額度）：boardFeed/latest = { msgs: [最新 MSGBOARD_SHOW_N 則] }，打開留言板只讀這 1 份
const MSGBOARD_FEED_DOC = "latest";
const MSGBOARD_SHOW_N = 30;                       // 打開時讀最新幾則（規則限制單次最多 50；2026-10-04 使用者要求 30）
// 留言 8 小時後自動刪除（2026-10-04 使用者要求；規則同樣寫死 28800 秒）：遊戲只讀 8 小時內的留言；過期的由玩家端偶爾順手刪除、GM 後台開留言板分頁時清掉
const MSGBOARD_LIFETIME_HOURS = 8;
const MSGBOARD_MAX_LEN = 100;                     // 每則字數上限（規則同樣限制，改這裡要一起改規則）
const MSGBOARD_COOLDOWN_SEC = 60;                 // 每人留言間隔（規則同樣限制）
// ---- 寄售拍賣（market.js，大道石碑「🏪 寄售」分頁，ARCHITECTURE.md 第 58 節；2026-09-28 使用者選定規則）----
const MARKET_COLLECTION = "market";               // 拍賣品（自動 id）：賣家、物品、起標價、目前最高價與出價者、結束時間
const MARKET_REFUND_COLLECTION = "marketRefunds"; // 被超過出價時的退款（id = 拍賣品id_第幾次出價），本人刪除＝領回
const MARKET_CLAIM_COLLECTION = "marketClaims";   // 結標領取紀錄（id = 拍賣品id_item 或 _coins），每種只能建立一次
const MARKET_HOURS = [12, 24, 48];                // 賣家可選的拍賣時間
const MARKET_MIN_RAISE = 0.05;                    // 每次出價至少比目前最高價多 5%（規則同樣限制）
const MARKET_FEE = 0.10;                          // 成交手續費 10%，賣家拿 90%（2026-10-03 由 5% 調高，回收多餘靈石）
// 上架登錄費（2026-10-03 使用者新增，回收多餘靈石）：max(起標價 × pct, 每小時收入 × minHours)，上架時先扣、不論成交與否都不退（雲端寫入失敗才退）
const MARKET_LIST_FEE = { pct: 0.02, minHours: 0.25 };
const MARKET_EXTEND_SEC = 300;                    // 最後 5 分鐘有人出價，結束時間延到出價後 5 分鐘（避免最後一秒搶標）
const MARKET_MAX_ACTIVE = 1;                      // 每人同時最多掛幾件（玩家端檢查；2026-10-04 使用者要求由 5 改 1，節省讀取額度）
const MARKET_SHOW_N = 30;                         // 拍賣中的清單最多讀幾件（規則限制單次最多 50；2026-10-04 使用者要求 30）
// 寄售只在週一～週五開放（台灣時間；2026-10-04 使用者：「六日的網路流量要留給世界 Boss」）：週六、週日寄售分頁只顯示休市、不讀雲端，上架／出價／領取都暫停
const MARKET_OPEN_DAYS = [1, 2, 3, 4, 5];   // getUTCDay（0＝週日）of 台灣時間
// 開放日裡的固定休市時段（台灣時間；2026-10-05 使用者：「星期一下午三點賣場關閉、半夜開啟」→ 每週一 15:00～24:00，週二 00:00 恢復）
//   { 星期: [開始小時, 結束小時) }；結束 24 ＝ 當天午夜
const MARKET_CLOSED_HOURS = { 1: [15, 24] };
const MARKET_MAX_PRICE = 1e12;
// 可寄售的數量型物品（使用者選：材料＋珍貴道具；另有鍛造圖紙、背包裝備）
const MARKET_STACKS = [
    { key: "starIron",      label: "星允鐵",     icon: "🌠", kind: "material" },
    { key: "butianStones",  label: "七彩補天石", icon: "🌈", kind: "material" },
    { key: "fireShards",    label: "異火碎片",   icon: "🔥", kind: "material" },
    // 2026-10-03 使用者開放：洗煉石與做裝通貨（第 69 節）；cur＝存在 player.craftCur 裡的那一格
    { key: "refineStones",  label: "洗煉石",     icon: "🌀", kind: "material" },
    { key: "craft:tianji",  label: "天機石",     icon: "🔷", kind: "material", cur: "tianji" },
    { key: "craft:hunyuan", label: "混元晶",     icon: "💠", kind: "material", cur: "hunyuan" },
    { key: "craft:poxu",    label: "破虛石",     icon: "⚫", kind: "material", cur: "poxu" },
    { key: "craft:zaohua",  label: "造化玉",     icon: "🔮", kind: "material", cur: "zaohua" },
    { key: "rootPills",     label: "洗髓丹",     icon: "🧪", kind: "item" },
    { key: "physiquePills", label: "伐骨丹",     icon: "🦴", kind: "item" },
    { key: "spiritFruits",  label: "化神靈果",   icon: "🍑", kind: "item" },
    { key: "breakPills",    label: "破障丹",     icon: "🔮", kind: "item" }
];

// 髒話過濾（玩家端，送出前把這些詞換成＊；可自行增減）
const MSGBOARD_BLOCKED_WORDS = ["幹你娘", "操你", "肏", "靠北", "機掰", "雞掰", "白癡", "智障", "垃圾人", "去死", "fuck", "shit"];
