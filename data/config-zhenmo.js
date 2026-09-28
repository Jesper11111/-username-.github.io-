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
//   攻擊 = defenseRealmAtk(realm, stage) × atkMult；氣血 = defenseRealmAtk(realm, stage) × hpPerAtk（沒填 = 300）× hpMult（沒填 = 1）；減傷／閃避 %；affix 異屬性（ice／fire／poison／metal／thunder）
// img：戰鬥背景（橫圖，手機以 imgPos 對準 BOSS）；rewards 為基礎獎勵，實際 × 本層問答倍率
// 選填 icon（戰況中 BOSS 出招的圖示，預設 ⚡）、flash（BOSS 出手時畫面閃光的顏色，預設淡藍雷光）
// 強度建議：第 n 層 = 煉虛起每層一階（1～10 層煉虛 1～10 階、11～20 層合體…91～100 層混沌道祖），特別層再用 atkMult 調整
const ZHENMO_BOSSES = {
    1: {
        name: "棄天神", title: "塔底魔神", img: "images/zhenmo/boss-qitianshen.jpg", imgPos: "50% 30%",   // 玩家提供直式版（848×1264，2:3；左上有「棄天神」字樣）
        realm: 6, stage: 1, atkMult: 1,   // 入門關：煉虛 1 階
        hpPerAtk: 300,                    // 氣血 = 攻擊 × 300（2026-09-27 玩家指定，原 30）
        def: 20, eva: 10, affix: "thunder", affixVal: 15, element: "金",
        intro: "被諸天大能棄於塔底的上古魔神，手持雷紋魔劍，一聲怒嘯引動九天劫雷。",
        skills: ["棄天雷劍", "劫雷貫空", "魔神怒嘯", "萬雷鎖魂"],   // 戰鬥演出用的招式名稱
        rewards: {
            coinMinutes: 10,          // 靈石 = 等強度境界主要練功地圖掛機 N 分鐘的收入（同死守天南城 waveCoins）
            merit: [120, 240],        // 功德
            shards: [3, 6],           // 異火碎片
            iron: [4, 8]              // 星允鐵
        }
    },
    2: {
        name: "不滅骨", title: "皇道殭屍", img: "images/zhenmo/boss-bumiegu.jpg", imgPos: "50% 30%",   // 玩家提供直式版（848×1264，2:3；龍虎山石階上的龍袍屍王）
        realm: 6, stage: 2, atkMult: 1,   // 樓層 n = 煉虛起每層一階（第 2 層 = 煉虛 2 階）
        hpPerAtk: 300,
        def: 25, eva: 5, affix: "poison", affixVal: 15, element: "土",   // 殭屍：皮糙肉厚（減傷高、閃避低）、屍毒
        intro: "前朝帝王死後不腐，龍袍裹屍、骨化金剛，以皇陵屍氣鎮守塔中第二層，屍毒入體者皆化為枯骨。",
        skills: ["屍王裂爪", "龍袍屍氣", "不滅骨咒", "皇陵腐毒"],
        icon: "☠️", flash: "rgba(132, 204, 22, 0.3)",   // 戰況圖示、出手時的屍毒綠光
        rewards: { coinMinutes: 11, merit: [130, 260], shards: [3, 6], iron: [4, 8] }
    },
    3: {
        name: "主咒之王", title: "束縛幽冥", img: "images/zhenmo/boss-zhuzhou.jpg", imgPos: "50% 30%",   // 玩家提供直式（848×1264，符咒王座）
        realm: 6, stage: 3, atkMult: 1.5,   // 煉虛 3 階，攻擊 ×1.5（2026-09-27 玩家指定）
        hpPerAtk: 300,                      // 氣血 = 基準攻擊 × 300（atkMult 只放大攻擊；要加血用 hpMult）
        def: 15, eva: 15, affix: "ice", affixVal: 18, element: "水",   // 咒術師：束縛咒（冰凍＝定身，玩家該回合無法出手）、身法飄忽
        intro: "端坐符咒王座的幽冥咒主，袍上刻滿束縛真言，萬道符籙隨念而動，被咒言纏身者動彈不得。",
        skills: ["束縛真言", "萬符焚身", "幽冥咒印", "奪魂符陣"],
        icon: "📜", flash: "rgba(168, 85, 247, 0.32)",   // 符咒紫光
        rewards: { coinMinutes: 13, merit: [150, 300], shards: [4, 7], iron: [5, 9] }
    },
    4: {
        name: "幽冥鬼虎", title: "冥火凶獸", img: "images/zhenmo/boss-guihu.jpg", imgPos: "60% 40%",   // 玩家提供直式（848×1264，虎頭在右側中段）
        realm: 6, stage: 4, atkMult: 1,     // 煉虛 4 階（每層一階）
        hpPerAtk: 300,
        def: 10, eva: 20, affix: "metal", affixVal: 18, element: "金",   // 凶獸：身法迅捷（閃避高、減傷低）、利爪撕咬易暴擊；白虎屬金
        intro: "幽冥鬼林中吞噬萬千亡魂的凶虎，周身燃著冥火，一聲虎嘯引來百鬼夜行，利爪所及魂飛魄散。",
        skills: ["冥火虎嘯", "裂魂虎爪", "百鬼夜行", "幽冥撲殺"],
        icon: "🐯", flash: "rgba(129, 140, 248, 0.32)",   // 冥火藍紫光
        rewards: { coinMinutes: 14, merit: [160, 320], shards: [4, 7], iron: [5, 10] }
    },
    5: {
        name: "青瞑爪龍", title: "雷雲蒼龍", img: "images/zhenmo/boss-qingming.jpg", imgPos: "50% 25%",   // 玩家提供直式（848×1264，展翼青龍、龍頭在上方）
        realm: 6, stage: 5, atkMult: 3,     // 煉虛 5 階，攻擊 ×3（2026-09-27 玩家指定）
        hpPerAtk: 300,
        def: 20, eva: 15, affix: "thunder", affixVal: 18, element: "木",   // 青龍屬木；御雷雲、爪握雷珠（雷擊）；展翼飛騰（閃避）
        intro: "盤踞雷雲之上的青鱗爪龍，雙翼遮天、爪握雷珠，龍吟一聲風雨驟至，是塔中第一道真正的難關。",
        skills: ["青瞑龍爪", "雷珠轟頂", "蒼龍擺尾", "風雷龍吟"],
        icon: "🐉", flash: "rgba(56, 189, 248, 0.32)",   // 青色雷光
        rewards: { coinMinutes: 20, merit: [250, 500], shards: [6, 10], iron: [8, 14] }   // 第 5 層關卡：獎勵加碼
    },
    6: {
        name: "黑暗法老王", title: "封印神王", img: "images/zhenmo/boss-pharaoh.jpg", imgPos: "50% 30%",   // 玩家提供直式（687×1024，2:3；掙斷鎖鏈的黃金法老，頭在上方約 30%）
        realm: 6, stage: 6, atkMult: 1,     // 煉虛 6 階（每層一階）
        hpPerAtk: 300,
        def: 30, eva: 5, affix: "fire", affixVal: 18, element: "土",   // 黃金神軀：減傷高、身形笨重（閃避低）；胸前聖符射出烈日神光（燒傷）；沙漠古陵屬土
        intro: "被萬道鎖鏈封印於古陵深處的黃金神王，如今掙斷枷鎖、聖符迸發烈日神光，所過之處石柱崩裂、黃沙蔽日。",
        skills: ["烈日神光", "斷鎖神拳", "法老怒焰", "黃沙滅界"],
        icon: "☀️", flash: "rgba(250, 204, 21, 0.32)",   // 金色烈日光
        rewards: { coinMinutes: 15, merit: [170, 340], shards: [4, 8], iron: [6, 11] }
    }
};
