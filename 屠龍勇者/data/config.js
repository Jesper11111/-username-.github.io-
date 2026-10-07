// 屠龍勇者：全域設定、常數、共用小工具（最先載入，不依賴其他檔案）
const GAME_TITLE = '屠龍勇者';
const GAME_VERSION = '20261007n';

// 與凡塵修仙傳同網域，localStorage 共用，key 一定要有 dragonSlayer_ 前綴
const SAVE_KEY = 'dragonSlayer_save_v2';
const SAVE_SCHEMA = 1;

const TICK_MS = 100;              // 主迴圈間隔
const REGEN_MS = 5000;            // 自然回復間隔（天堂式每幾秒跳一次）
const AUTOSAVE_MS = 20000;
const MAX_LEVEL = 99;
const STAT_CAP = 35;              // 單項基礎能力值上限
const ELIXIR_MAX = 5;             // 萬能藥最多吃幾瓶
const BONUS_STAT_LEVEL = 51;      // 51 級起每升一級 +1 點能力
const EXP_RATE = 1;               // 狩獵經驗倍率（像伺服器倍率；1 = 天堂原版）
const POTION_CD_MS = 1000;        // 喝水間隔
const WALK_HOME_MS = 15000;       // 步行回村時間
const WEIGHT_NO_REGEN = 0.5;      // 負重超過 50% 不會自然回復

// 遊戲時鐘（毫秒）：主迴圈每次加上經過時間。增益、冷卻、喝水間隔、步行都用它，
// 背景分頁被節流時才會跟戰鬥同步變慢。龍穴冷卻等「真實時間」則用 Date.now()。
let gameNow = Date.now();

// 離線收益（offline.js）：模擬期間為 true，存檔、畫面更新、提示一律略過
let SIM_MODE = false;
const OFFLINE_MIN_MS = 30 * 1000;           // 離開超過 30 秒才結算
const OFFLINE_MAX_MS = 12 * 3600 * 1000;    // 最多結算 12 小時
const OFFLINE_RATE = 0.5;                   // 離線效率 50%
const OFFLINE_SAMPLE_MS = 10 * 60 * 1000;   // 用 10 分鐘模擬量測掛機效率

function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function chance(p) { return Math.random() < p; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }

// 升到下一級需要的經驗：50 級後每 10 級翻倍（天堂式後期陡升）
// ───────── 天堂 1 經驗表（ARCHITECTURE.md 第 9 節）─────────
// 升到下一級所需經驗：1～5 級查表；6～44 級＝(等級+1)⁴ − 等級⁴（總經驗剛好是 (等級+1)⁴）；
// 45～48 級查表；49 級以上每級固定 36,065,092
const EXP_TABLE_LOW = [0, 125, 175, 200, 250, 546];
const EXP_TABLE_HIGH = { 45: 729360, 46: 1508416, 47: 3495263, 48: 9912189 };
const EXP_PER_LEVEL_49 = 36065092;

// 65 級起狩獵經驗遞減（天堂原版）；表上只到 87 級，88 級以上沿用 1/512
function huntExpRate(lv) {
    if (lv < 65) return 1;
    if (lv < 70) return 1 / 2;
    if (lv < 75) return 1 / 4;
    if (lv < 79) return 1 / 8;
    if (lv < 80) return 1 / 16;
    if (lv < 82) return 1 / 32;
    if (lv < 84) return 1 / 64;
    if (lv < 86) return 1 / 128;
    if (lv < 87) return 1 / 256;
    return 1 / 512;
}

// 死亡損失「本級所需經驗」的比例：1～44 級 10%，45 級 9%…49 級以上 5%
function deathLossRate(lv) {
    if (lv <= 44) return 0.10;
    if (lv >= 49) return 0.05;
    return (54 - lv) / 100;
}

function expToNext(lv) {
    if (lv < EXP_TABLE_LOW.length) return EXP_TABLE_LOW[lv];
    if (lv <= 44) return Math.pow(lv + 1, 4) - Math.pow(lv, 4);
    const need = EXP_TABLE_HIGH[lv] || EXP_PER_LEVEL_49;
    return need;
}
