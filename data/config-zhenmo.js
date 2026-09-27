// 秘境「鎮魔塔」100 層（zhenmo.js，ARCHITECTURE.md 第 51 節）
// 每層流程：塔廳 →「📜 開始問答」10 題知識問答（題庫 config-zhenmo-questions.js）→ 結算答對數 →「🚪 開啟 BOSS 房門」→ BOSS 戰（待新增）
// 答對越多，這一層 BOSS 的獎勵倍率越高（問答結果會保留到打完 BOSS，中途離開也不會消失）。

const ZHENMO_TOTAL_FLOORS = 100;
const ZHENMO_QUIZ_COUNT = 10;          // 每層問答題數
const ZHENMO_QUIZ_SECONDS = 20;        // 每題限時秒數（逾時算答錯，避免邊答邊查）；0 = 不限時
const ZHENMO_REVEAL_ANSWER = false;    // false：答題後只顯示對／錯，不公布正確答案（題目不外流）
const ZHENMO_RECENT_AVOID = 100;       // 最近出過的幾題不再出（題庫 300 題，約 3 層後才會重複）

// 問答答對數 → 本層 BOSS 獎勵倍率（索引 = 答對題數 0～10；全對額外加碼）
const ZHENMO_QUIZ_REWARD_MULT = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.5];

// BOSS 尚未實作（2026-09-27：先做關卡、問答與進入 BOSS 房；BOSS 資料下一步新增）
//   false：問答不扣每日次數、BOSS 房只顯示「尚未開放」、樓層不會前進；問答結果仍保留，BOSS 上線後可直接進房
//   BOSS 完成後改 true：開始問答時扣 1 次秘境每日次數（secret-realm.js 的 useSecretRealmAttempt）
const ZHENMO_BOSS_READY = false;

// 題目出處顯示名稱
const ZHENMO_SOURCES = { "凡": "凡人修仙傳", "吞": "吞噬星空", "斗": "斗羅大陸" };
