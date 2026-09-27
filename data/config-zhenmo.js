// 秘境「鎮魔塔」100 層（zhenmo.js，ARCHITECTURE.md 第 51 節）
// 每層流程：塔廳 →「📜 開始問答」10 題知識問答（題庫 config-zhenmo-questions.js）→ 結算答對數 →「🚪 開啟 BOSS 房門」→ BOSS 戰
// 答對越多，這一層 BOSS 的獎勵倍率越高（問答結果會保留到打 BOSS，中途離開塔也不會消失）。
// 一輪 10 題只影響「當前這一層」BOSS 的擊敗獎勵；進入下一層後加成歸零，要重新答題。
// 挑戰 BOSS 失敗（或戰鬥中離開）時本層問答成績作廢，重來要重新答題（重新答題會再扣 1 次挑戰）。

const ZHENMO_TOTAL_FLOORS = 100;
const ZHENMO_QUIZ_COUNT = 10;          // 每層問答題數
const ZHENMO_QUIZ_SECONDS = 20;        // 每題限時秒數（逾時算答錯，避免邊答邊查）；0 = 不限時
const ZHENMO_REVEAL_ANSWER = false;    // false：答題後只顯示對／錯，不公布正確答案（題目不外流）
const ZHENMO_RECENT_AVOID = 100;       // 最近出過的幾題不再出（題庫 300 題，約 3 層後才會重複）

// 問答答對數 → 本層 BOSS 獎勵倍率（索引 = 答對題數 0～10；全對額外加碼）
const ZHENMO_QUIZ_REWARD_MULT = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.5];

// 題目出處顯示名稱
const ZHENMO_SOURCES = { "凡": "凡人修仙傳", "吞": "吞噬星空", "斗": "斗羅大陸" };

// ==================== BOSS 戰（2026-09-27 起，先做第 1 層）====================
// 有 BOSS 資料的樓層：開始問答時扣 1 次秘境每日次數（secret-realm.js 的 useSecretRealmAttempt）；
// 還沒有 BOSS 資料的樓層：問答不扣次數、BOSS 房顯示「尚在甦醒」、樓層不前進。
// 戰鬥畫面的主角立繪依性別（玩家提供，由同一張圖左右裁切並去黑底）
const ZHENMO_HERO_IMG = { female: "images/zhenmo/hero-female.png", male: "images/zhenmo/hero-male.png" };
const ZHENMO_PLAYER_SKILL_MULT = 1.3;  // 玩家每回合傷害 = max(物攻, 術攻) × 此倍率（武學平均加成，同死守天南城）
const ZHENMO_MAX_ROUNDS = 150;         // 超過回合數 BOSS 未倒 = 挑戰失敗
const ZHENMO_ROUND_MS = 650;           // 每回合演出時間（×1 速；可切 ×2／×4 或跳過）

// 各層 BOSS（key = 樓層）。強度以「某境界某階修士」為基準（config-defense.js 的 defenseRealmAtk，與死守天南城同一條曲線）：
//   攻擊 = defenseRealmAtk(realm, stage) × atkMult；氣血 = 攻擊 × hpPerAtk；減傷／閃避 %；affix 異屬性（ice／fire／poison／metal／thunder）
// img：戰鬥背景（橫圖，手機以 imgPos 對準 BOSS）；rewards 為基礎獎勵，實際 × 本層問答倍率
const ZHENMO_BOSSES = {
    1: {
        name: "棄天神", title: "塔底魔神", img: "images/zhenmo/boss-qitianshen.jpg", imgPos: "60% 30%",   // 玩家提供（1408×768，圖上已有「棄天神」字樣）
        realm: 6, stage: 1, atkMult: 1,   // 入門關：煉虛 1 階（2026-09-27 測：裸裝煉虛 5 階以上、有宗門或裝備的煉虛初期即可過） hpPerAtk: 30, def: 20, eva: 10, affix: "thunder", affixVal: 15, element: "金",
        intro: "被諸天大能棄於塔底的上古魔神，手持雷紋魔劍，一聲怒嘯引動九天劫雷。",
        skills: ["棄天雷劍", "劫雷貫空", "魔神怒嘯", "萬雷鎖魂"],   // 戰鬥演出用的招式名稱
        rewards: {
            coinMinutes: 10,          // 靈石 = 等強度境界主要練功地圖掛機 N 分鐘的收入（同死守天南城 waveCoins）
            merit: [120, 240],        // 功德
            shards: [3, 6],           // 異火碎片
            iron: [4, 8]              // 星允鐵
        }
    }
};
