// 屠龍勇者：全域設定、常數、共用小工具（最先載入，不依賴其他檔案）
const GAME_TITLE = '屠龍勇者';
const GAME_VERSION = '20261007c';

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
const DEATH_EXP_LOSS = 0.05;      // 死亡損失「本級所需經驗」的 5%
const NEWBIE_PROTECT_LEVEL = 10;  // 未滿 10 級死亡不扣經驗
const POTION_CD_MS = 1000;        // 喝水間隔
const WALK_HOME_MS = 15000;       // 步行回村時間
const WEIGHT_NO_REGEN = 0.5;      // 負重超過 50% 不會自然回復

// 遊戲時鐘（毫秒）：主迴圈每次加上經過時間。增益、冷卻、喝水間隔、步行都用它，
// 背景分頁被節流時才會跟戰鬥同步變慢。龍穴冷卻等「真實時間」則用 Date.now()。
let gameNow = Date.now();

function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function chance(p) { return Math.random() < p; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }

// 升到下一級需要的經驗：50 級後每 10 級翻倍（天堂式後期陡升）
function expToNext(lv) {
    let need = Math.floor(10 * Math.pow(lv, 2.5) + 20);
    if (lv >= 50) need = Math.floor(need * Math.pow(2, (lv - 49) / 10));
    return need;
}
