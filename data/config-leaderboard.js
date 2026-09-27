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

const LEADERBOARD_SDK_BASE = "https://www.gstatic.com/firebasejs/10.14.1";   // compat 版，傳統 <script> 可直接用全域 firebase
const LEADERBOARD_COLLECTION = "leaderboard";          // 每位玩家一筆，文件 id = 匿名登入的 uid
const LEADERBOARD_BANNED_COLLECTION = "banned";        // GM 黑名單（gm.html），文件 id = 被封鎖的 uid；規則擋下其上傳
const LEADERBOARD_ADMINS_COLLECTION = "admins";        // 管理者名單，只能在 Firebase 主控台手動新增（文件 id = 管理者的 Google 登入 uid）
const LEADERBOARD_UPLOAD_INTERVAL_MS = 5 * 60 * 1000;  // 在線時每 5 分鐘上傳一次
const LEADERBOARD_FIRST_UPLOAD_DELAY_MS = 15 * 1000;   // 進入遊戲 15 秒後先上傳一次
const LEADERBOARD_MIN_GAP_MS = 60 * 1000;              // 兩次上傳至少間隔 60 秒（規則同樣限制，改這裡要一起改規則）
const LEADERBOARD_HISTORY_SIZE = 24;                   // 紀錄保留最近 24 次上傳的戰力＋時間（hist，約 2 小時），GM 後台比對戰力暴增用（第 50 節；規則同樣寫死 24，改這裡要一起改規則）
const LEADERBOARD_TOP_N = 100;                         // 榜單顯示前 N 名（規則限制單次最多讀 100 筆）
const LEADERBOARD_REFRESH_COOLDOWN_MS = 10 * 1000;     // 視窗內「重新整理」按鈕冷卻
const LEADERBOARD_TIMEOUT_MS = 8 * 1000;               // 開榜單時上傳／讀取最多等幾毫秒（斷線時不會卡在「讀取中」）
