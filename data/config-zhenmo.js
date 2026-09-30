// 秘境「鎮魔塔」100 層（zhenmo.js，ARCHITECTURE.md 第 51 節）
// 每層流程：塔廳 →「📜 開始問答」10 題知識問答（題庫 config-zhenmo-questions.js）→ 結算答對數 →「🚪 開啟 BOSS 房門」→ BOSS 戰
// 答對越多，這一層 BOSS 的獎勵倍率越高（問答結果會保留到打 BOSS，中途離開塔也不會消失）。
// 一輪 10 題只影響「當前這一層」BOSS 的擊敗獎勵；進入下一層後加成歸零，要重新答題。
// 挑戰 BOSS 失敗（或戰鬥中離開）時本層問答成績作廢，重來要重新答題（重新答題會再扣 1 次挑戰）。

const ZHENMO_TOTAL_FLOORS = 100;
const ZHENMO_QUIZ_COUNT = 10;          // 每層問答題數
const ZHENMO_QUIZ_SECONDS = 30;        // 每題限時秒數（逾時算答錯，避免邊答邊查）；0 = 不限時（2026-09-30 使用者由 20 改 30）
const ZHENMO_REVEAL_ANSWER = false;    // false：答題後只顯示對／錯，不公布正確答案（題目不外流）
const ZHENMO_RECENT_AVOID = 100;       // 最近出過的幾題不再出（題庫 300 題，約 3 層後才會重複）

// 問答答對數 → 本層 BOSS 獎勵倍率（索引 = 答對題數 0～10；全對額外加碼）
const ZHENMO_QUIZ_REWARD_MULT = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.5];

// 題目出處顯示名稱
const ZHENMO_SOURCES = { "凡": "凡人修仙傳", "吞": "吞噬星空", "斗": "斗羅大陸" };

// ==================== BOSS 戰（2026-09-27 起，目前有第 1～6 層）====================
// 有 BOSS 資料的樓層：開始問答時扣 1 次秘境每日次數（secret-realm.js 的 useSecretRealmAttempt）；
// 還沒有 BOSS 資料的樓層：問答不扣次數、BOSS 房顯示「尚在甦醒」、樓層不前進。
// 戰鬥畫面的主角立繪依性別（玩家提供，由同一張圖左右裁切並去黑底）
const ZHENMO_HERO_IMG = { female: "images/zhenmo/hero-female.png", male: "images/zhenmo/hero-male.png" };
const ZHENMO_PLAYER_SKILL_MULT = 1.3;  // 玩家每回合傷害 = max(物攻, 術攻) × 此倍率（武學平均加成，同死守天南城）
const ZHENMO_MAX_ROUNDS = 150;         // 超過回合數 BOSS 未倒 = 挑戰失敗
const ZHENMO_ROUND_MS = 650;           // 每回合演出時間（×1 速；可切 ×2／×4 或跳過）
// BOSS 每次挑戰的隨機氣勢（2026-09-29）：攻擊與氣血 × (1 ± 這個比例) 均勻隨機。
// 沒有這項時同樣數值的玩家幾乎「必勝或必敗」（難度差 5% 勝率就從 100% 掉到 14%），無法校準成「中等裝備約 8 成」這類目標
const ZHENMO_BOSS_VARIANCE = 0.2;
// 擊敗 BOSS 後掉落夥伴碎片（2026-09-29 使用者指定；partner.js 的 grantPartnerShards，集滿 100 片激活）：
//   第 11～40 層（合體～渡劫）天驕、第 41～60 層（仙人～天仙）尊者；帝境、至高暫不開放
const ZHENMO_PARTNER_MEET = [
    { from: 11, to: 40, tiers: ["天驕"], chance: 1, shards: [8, 15] },
    { from: 41, to: 60, tiers: ["尊者", "天驕"], chance: 1, shards: [8, 15] }
];

// 各層 BOSS（key = 樓層）。強度以「某境界某階修士」為基準（config-defense.js 的 defenseRealmAtk，與死守天南城同一條曲線）：
//   攻擊 = defenseRealmAtk(realm, stage) × atkMult；氣血 = defenseRealmAtk(realm, stage) × hpPerAtk（沒填 = 300）× hpMult（沒填 = 1）；減傷／閃避 %；affix 異屬性（ice／fire／poison／metal／thunder）
// img：戰鬥背景（橫圖，手機以 imgPos 對準 BOSS）；rewards 為基礎獎勵，實際 × 本層問答倍率
// 選填 icon（戰況中 BOSS 出招的圖示，預設 ⚡）、flash（BOSS 出手時畫面閃光的顏色，預設淡藍雷光）
// 強度建議：第 n 層 = 煉虛起每層一階（1～10 層煉虛 1～10 階、11～20 層合體…91～100 層混沌道祖），特別層再用 atkMult 調整
const ZHENMO_BOSSES = {
    1: {
        name: "棄天神", race: "demon", title: "塔底魔神", img: "images/zhenmo/boss-qitianshen.jpg", imgPos: "50% 30%",   // 玩家提供直式版（848×1264，2:3；左上有「棄天神」字樣）
        realm: 6, stage: 1, atkMult: 1,   // 入門關：煉虛 1 階
        hpPerAtk: 300,                    // 氣血 = 攻擊 × 300（2026-09-27 玩家指定，原 30）
        def: 20, eva: 10, affix: "thunder", affixVal: 15, element: "金",
        intro: "被諸天大能棄於塔底的上古魔神，手持雷紋魔劍，一聲怒嘯引動九天劫雷。",
        skills: ["棄天雷劍", "劫雷貫空", "魔神怒嘯", "萬雷鎖魂"],   // 戰鬥演出用的招式名稱
        auras: [   // BOSS 光環（elements.js 的 combineAuras／describeAura，2026-09-29；多個光環同種效果相加）
            { name: "劫雷天威", player: { def: 5, freeze: 0.02 }, self: { atk: 0.10 } },
            { name: "魔神怒嘯", player: { curse: 0.05 }, self: { def: 5 } }
        ],
        rewards: {
            coinMinutes: 10,          // 靈石 = 等強度境界主要練功地圖掛機 N 分鐘的收入（同死守天南城 waveCoins）
            merit: [120, 240],        // 功德
            shards: [3, 6],           // 異火碎片
            iron: [4, 8]              // 星允鐵
        }
    },
    2: {
        name: "不滅骨", race: "ghost", title: "皇道殭屍", img: "images/zhenmo/boss-bumiegu.jpg", imgPos: "50% 30%",   // 玩家提供直式版（848×1264，2:3；龍虎山石階上的龍袍屍王）
        realm: 6, stage: 2, atkMult: 1,   // 樓層 n = 煉虛起每層一階（第 2 層 = 煉虛 2 階）
        hpPerAtk: 300,
        def: 25, eva: 5, affix: "poison", affixVal: 15, element: "土",   // 殭屍：皮糙肉厚（減傷高、閃避低）、屍毒
        intro: "前朝帝王死後不腐，龍袍裹屍、骨化金剛，以皇陵屍氣鎮守塔中第二層，屍毒入體者皆化為枯骨。",
        skills: ["屍王裂爪", "龍袍屍氣", "不滅骨咒", "皇陵腐毒"],
        auras: [
            { name: "屍氣瀰漫", player: { dot: 0.001, poison: 0.04 }, self: { def: 10 } },
            { name: "不滅之軀", player: {}, self: { regen: 0.001 } }
        ],
        icon: "☠️", flash: "rgba(132, 204, 22, 0.3)",   // 戰況圖示、出手時的屍毒綠光
        rewards: { coinMinutes: 11, merit: [130, 260], shards: [3, 6], iron: [4, 8] }
    },
    3: {
        name: "主咒之王", race: "ghost", title: "束縛幽冥", img: "images/zhenmo/boss-zhuzhou.jpg", imgPos: "50% 30%",   // 玩家提供直式（848×1264，符咒王座）
        realm: 6, stage: 3, atkMult: 1.5,   // 煉虛 3 階，攻擊 ×1.5（2026-09-27 玩家指定）
        hpPerAtk: 300,                      // 氣血 = 基準攻擊 × 300（atkMult 只放大攻擊；要加血用 hpMult）
        def: 15, eva: 15, affix: "ice", affixVal: 18, element: "水",   // 咒術師：束縛咒（冰凍＝定身，玩家該回合無法出手）、身法飄忽
        intro: "端坐符咒王座的幽冥咒主，袍上刻滿束縛真言，萬道符籙隨念而動，被咒言纏身者動彈不得。",
        skills: ["束縛真言", "萬符焚身", "幽冥咒印", "奪魂符陣"],
        auras: [
            { name: "束縛咒域", player: { atk: 0.10, freeze: 0.03 }, self: { eva: 5 } },
            { name: "奪魂詛咒", player: { curse: 0.08, eva: 3 }, self: {} }
        ],
        icon: "📜", flash: "rgba(168, 85, 247, 0.32)",   // 符咒紫光
        rewards: { coinMinutes: 13, merit: [150, 300], shards: [4, 7], iron: [5, 9] }
    },
    4: {
        name: "幽冥鬼虎", race: "ghost", title: "冥火凶獸", img: "images/zhenmo/boss-guihu.jpg", imgPos: "60% 40%",   // 玩家提供直式（848×1264，虎頭在右側中段）
        realm: 6, stage: 4, atkMult: 1,     // 煉虛 4 階（每層一階）
        hpPerAtk: 300,
        def: 10, eva: 20, affix: "metal", affixVal: 18, element: "金",   // 凶獸：身法迅捷（閃避高、減傷低）、利爪撕咬易暴擊；白虎屬金
        intro: "幽冥鬼林中吞噬萬千亡魂的凶虎，周身燃著冥火，一聲虎嘯引來百鬼夜行，利爪所及魂飛魄散。",
        skills: ["冥火虎嘯", "裂魂虎爪", "百鬼夜行", "幽冥撲殺"],
        auras: [
            { name: "百鬼夜行", player: { eva: 5, dot: 0.001 }, self: { atk: 0.10 } },
            { name: "冥火纏身", player: { burn: 0.04 }, self: { eva: 5 } },
            { name: "凶虎之威", player: { def: 5 }, self: { atk: 0.05 } }
        ],
        icon: "🐯", flash: "rgba(129, 140, 248, 0.32)",   // 冥火藍紫光
        rewards: { coinMinutes: 14, merit: [160, 320], shards: [4, 7], iron: [5, 10] }
    },
    5: {
        name: "青瞑爪龍", race: "beast", title: "雷雲蒼龍", img: "images/zhenmo/boss-qingming.jpg", imgPos: "50% 25%",   // 玩家提供直式（848×1264，展翼青龍、龍頭在上方）
        realm: 6, stage: 5, atkMult: 3,     // 煉虛 5 階，攻擊 ×3（2026-09-27 玩家指定）
        hpPerAtk: 300,
        def: 20, eva: 15, affix: "thunder", affixVal: 18, element: "木",   // 青龍屬木；御雷雲、爪握雷珠（雷擊）；展翼飛騰（閃避）
        intro: "盤踞雷雲之上的青鱗爪龍，雙翼遮天、爪握雷珠，龍吟一聲風雨驟至，是塔中第一道真正的難關。",
        skills: ["青瞑龍爪", "雷珠轟頂", "蒼龍擺尾", "風雷龍吟"],
        auras: [
            { name: "蒼龍威壓", player: { atk: 0.08, def: 8 }, self: { regen: 0.001 } },
            { name: "風雷龍域", player: { freeze: 0.02, curse: 0.05 }, self: { eva: 5 } },
            { name: "龍鱗護體", player: {}, self: { def: 5 } }
        ],
        icon: "🐉", flash: "rgba(56, 189, 248, 0.32)",   // 青色雷光
        rewards: { coinMinutes: 20, merit: [250, 500], shards: [6, 10], iron: [8, 14] }   // 第 5 層關卡：獎勵加碼
    },
    6: {
        name: "黑暗法老王", race: "ghost", title: "封印神王", img: "images/zhenmo/boss-pharaoh.jpg", imgPos: "50% 30%",   // 玩家提供直式（687×1024，2:3；掙斷鎖鏈的黃金法老，頭在上方約 30%）
        realm: 6, stage: 6, atkMult: 1,     // 煉虛 6 階（每層一階）
        hpPerAtk: 300,
        def: 30, eva: 5, affix: "fire", affixVal: 18, element: "土",   // 黃金神軀：減傷高、身形笨重（閃避低）；胸前聖符射出烈日神光（燒傷）；沙漠古陵屬土
        intro: "被萬道鎖鏈封印於古陵深處的黃金神王，如今掙斷枷鎖、聖符迸發烈日神光，所過之處石柱崩裂、黃沙蔽日。",
        skills: ["烈日神光", "斷鎖神拳", "法老怒焰", "黃沙滅界"],
        auras: [
            { name: "烈日神威", player: { burn: 0.05, dot: 0.001 }, self: { def: 10 } },
            { name: "法老詛咒", player: { curse: 0.08, atk: 0.05 }, self: { regen: 0.001 } },
            { name: "黃沙蔽日", player: { eva: 5 }, self: { eva: 3 } }
        ],
        icon: "☀️", flash: "rgba(250, 204, 21, 0.32)",   // 金色烈日光
        rewards: { coinMinutes: 15, merit: [170, 340], shards: [4, 8], iron: [6, 11] }
    },
    // 第 7 層（2026-09-30 玩家提供圖與名稱，687×1024 直式：銀髮紅瞳、手持龍首杖的魔醫，身後石像魔影）：
    //   數值沿用原本自動產生的第 7 層（氣血 ×1.443、減傷 15、閃避 8、兩個光環的效果），只換外觀與主題；屬性傷害由冰改毒（主題）
    //   毒比冰溫和（冰會凍住玩家），原攻擊 ×2.08 時中等配置 99% → 攻擊改 ×2.5 校回目標 80%（ARCHITECTURE.md 第 51 節）
    7: {
        name: "墨大夫", race: "demon", title: "奪舍魔醫", img: "images/zhenmo/boss-modaifu.jpg", imgPos: "50% 30%",
        realm: 6, stage: 7, atkMult: 2.5, hpMult: 1.443,
        hpPerAtk: 300,
        def: 15, eva: 8, affix: "poison", affixVal: 15, element: "水",
        intro: "七玄門神手谷的神醫，暗中修煉魔道邪術，以血煉之法苟延殘喘、覬覦少年之軀欲行奪舍。身死之後殘魂受塔中魔氣滋養，重凝魔身，紅瞳一亮便要攝人魂魄。",
        skills: ["奪舍魔瞳", "纏魂鬼爪", "血煉邪術", "龍杖噬魂"],
        auras: [
            { name: "奪舍魔瞳", player: {}, self: { def: 5 } },
            { name: "血煉續命", player: {}, self: { regen: 0.001 } }
        ],
        icon: "🐍", flash: "rgba(220, 38, 38, 0.32)",   // 血紅魔光
        rewards: { coinMinutes: 14, merit: [135, 270], shards: [3, 6], iron: [4, 8] }
    }
};

// ==================== 第 7～100 層：自動產生（2026-09-29 使用者要求「後續關卡每一關持續強化」）====================
// 上面有手動設定的樓層優先（之後玩家提供新 BOSS 圖與資料時，直接在 ZHENMO_BOSSES 加一筆即可蓋過）。規則：
//   境界：第 n 層＝煉虛起每層一階（11～20 層合體 1～10 階…91～100 層混沌道祖），境界比玩家高時另有境界壓制（zhenmo.js 的 bossStats）
//   持續強化：攻擊每層 +1%（ZHENMO_GEN.perFloor）、氣血每層 +0.5%（perFloorHp）；個位數 5 的層攻擊 ×1.5（小關卡）、個位數 0 的層攻擊 ×2（大關卡，光環多 1 個、獎勵 ×2）
//   減傷／閃避／屬性傷害隨樓層提高；光環 2～4 個、大關卡 +1（elements.js 的 combineAuras），強度隨樓層放大到 2 倍
//   圖片沿用現有 6 張 BOSS 圖輪流；名稱由 prefix × suffix 組成（每層不重複）
const ZHENMO_GEN = {
    perFloor: 0.01, perFloorHp: 0.005, gate5Atk: 1.5, gate10Atk: 2,   // 氣血每層 +0.5%（+1% 時第 100 層太久，燒傷／持續扣血累積到強力配置 0 勝）
    // 每層校準倍率 [攻擊, 氣血]（2026-09-29，乘在上面公式算出的 atkMult／hpMult 上）：依使用者指定的目標勝率，含 ZHENMO_BOSS_VARIANCE 隨機氣勢，各 150～200 場二分搜尋而得
    //   目標（玩家與該層同境界同階；中等＝攻 ×2 血 ×1.5 減 30 閃 20、強力＝攻 ×4 血 ×2 減 60 閃 40，見 ARCHITECTURE.md 第 51 節）：
    //   7～50 層 中等 80%；60、70、80、90、100 樓主與 95 層 強力 80%；55、65、75、85 鎮關者 中等 60%（強力會是 100%）；其餘 51～99 層 強力 90%
    //   改公式或光環後要重新校準（測試頁的校準腳本寫在第 51 節）
    tune: {
        7: [1.962, 1.401], 8: [2.496, 1.58], 9: [2.167, 1.472], 10: [1.35, 1.162], 11: [2.375, 1.541], 12: [2.039, 1.428],
        13: [1.811, 1.346], 14: [2.252, 1.501], 15: [1.822, 1.35], 16: [2.44, 1.562], 17: [2.151, 1.467], 18: [2.118, 1.455],
        19: [2.039, 1.428], 20: [1.376, 1.173], 21: [2.243, 1.498], 22: [1.743, 1.32], 23: [1.717, 1.31], 24: [2.143, 1.464],
        25: [1.429, 1.195], 26: [1.787, 1.337], 27: [1.853, 1.361], 28: [2.023, 1.422], 29: [2.016, 1.42], 30: [1.085, 1.042],
        31: [1.892, 1.375], 32: [1.892, 1.375], 33: [1.867, 1.366], 34: [1.846, 1.359], 35: [1.27, 1.127], 36: [1.603, 1.266],
        37: [1.394, 1.181], 38: [1.557, 1.248], 39: [1.537, 1.24], 40: [0.992, 0.996], 41: [1.656, 1.287], 42: [1.289, 1.135],
        43: [1.44, 1.2], 44: [1.591, 1.261], 45: [1.376, 1.173], 46: [1.808, 1.345], 47: [1.554, 1.247], 48: [1.352, 1.163],
        49: [1.365, 1.168], 50: [1.029, 1.014], 51: [3.299, 1.816], 52: [2.81, 1.676], 53: [2.875, 1.696], 54: [2.559, 1.6],
        55: [0.994, 0.997], 56: [2.684, 1.638], 57: [2.87, 1.694], 58: [3.182, 1.784], 59: [3.325, 1.823], 60: [1.63, 1.304],   // 60 層 2026-09-30 由 1.7 微調（強力 73% → 約 80%）
        61: [3.541, 1.882], 62: [2.982, 1.727], 63: [3.152, 1.775], 64: [2.584, 1.607], 65: [0.928, 0.963], 66: [2.54, 1.594],
        67: [2.098, 1.448], 68: [2.235, 1.495], 69: [2.326, 1.525], 70: [1.327, 1.152], 71: [2.147, 1.465], 72: [1.996, 1.413],
        73: [2.062, 1.436], 74: [2.731, 1.653], 75: [1.071, 1.035], 76: [2.953, 1.718], 77: [2.082, 1.443], 78: [2.027, 1.424],
        79: [2.151, 1.467], 80: [1.525, 1.235], 81: [2.086, 1.444], 82: [1.864, 1.365], 83: [1.557, 1.248], 84: [1.882, 1.372],
        85: [0.742, 0.861], 86: [2.066, 1.437], 87: [2.344, 1.531], 88: [2.407, 1.551], 89: [2.609, 1.615], 90: [1.339, 1.157],
        91: [2.624, 1.62], 92: [2.256, 1.502], 93: [1.97, 1.404], 94: [1.808, 1.345], 95: [1.625, 1.275], 96: [1.563, 1.25],
        97: [1.381, 1.175], 98: [1.777, 1.333], 99: [1.808, 1.345], 100: [0.941, 0.97]
    },
    imgs: [
        { img: "images/zhenmo/boss-qitianshen.jpg", pos: "50% 30%" }, { img: "images/zhenmo/boss-bumiegu.jpg", pos: "50% 30%" },
        { img: "images/zhenmo/boss-zhuzhou.jpg", pos: "50% 30%" },    { img: "images/zhenmo/boss-guihu.jpg", pos: "60% 40%" },
        { img: "images/zhenmo/boss-qingming.jpg", pos: "50% 25%" },   { img: "images/zhenmo/boss-pharaoh.jpg", pos: "50% 30%" }
    ],
    prefix: ["玄冥", "赤炎", "九幽", "太虛", "血煞", "青冥", "紫霄", "玄冰", "幽羅", "天魔"],
    suffix: ["魔君", "屍王", "妖皇", "鬼帝", "魔龍", "邪神", "劍魔", "血尊", "戰神", "魔尊"],
    affixes: ["thunder", "poison", "ice", "metal", "fire"],
    elements: ["金", "木", "水", "火", "土"],
    icons: { thunder: "⚡", poison: "☠️", ice: "❄️", metal: "⚔️", fire: "🔥" },
    flashes: { thunder: "rgba(147, 197, 253, 0.3)", poison: "rgba(132, 204, 22, 0.3)", ice: "rgba(165, 243, 252, 0.3)", metal: "rgba(250, 204, 21, 0.3)", fire: "rgba(249, 115, 22, 0.32)" },
    // 光環範本（鎮魔塔一場約 300 回合、沒有丹藥與靈寵，所以每回合效果很小）；s = 強度（第 7 層 1 → 第 100 層 2）
    auras: [
        s => ({ name: "威壓", player: { atk: 0.05 * s }, self: { atk: 0.05 * s } }),
        s => ({ name: "鐵壁", player: {}, self: { def: Math.round(5 * s) } }),
        s => ({ name: "迷蹤", player: { eva: Math.round(3 * s) }, self: { eva: Math.round(3 * s) } }),
        s => ({ name: "寒獄", player: { freeze: Math.min(0.08, 0.02 * s) }, self: {} }),
        s => ({ name: "焚天", player: { burn: 0.04 * s }, self: {} }),
        s => ({ name: "蝕骨", player: { poison: 0.04 * s }, self: {} }),
        s => ({ name: "詛咒", player: { curse: 0.05 * s }, self: {} }),
        s => ({ name: "噬命", player: { dot: 0.001 * s }, self: {} }),
        s => ({ name: "不滅", player: {}, self: { regen: 0.001 * s } }),
        s => ({ name: "破甲", player: { def: Math.round(5 * s) }, self: {} })
    ]
};
(function generateZhenmoBosses() {
    const G = ZHENMO_GEN, r3 = v => Math.round(v * 1000) / 1000;
    for (let n = 7; n <= ZHENMO_TOTAL_FLOORS; n++) {
        if (ZHENMO_BOSSES[n]) continue;   // 手動設定優先
        const realm = 6 + Math.floor((n - 1) / 10), stage = (n - 1) % 10 + 1;
        const gate10 = n % 10 === 0, gate5 = n % 10 === 5;
        const grow = 1 + (n - 1) * G.perFloor;
        const affix = G.affixes[n % G.affixes.length], look = G.imgs[(n - 1) % G.imgs.length];
        const suffix = G.suffix[Math.floor(n / 10) % G.suffix.length];
        const d = Math.floor(n / 10);   // 每十層錯開一格，大關卡（個位數 0）的名稱與光環才不會都一樣
        const name = G.prefix[(n + d) % G.prefix.length] + suffix;
        // 光環強度 s：第 7 層 1 → 第 100 層 2；數量 2～4 個、大關卡再 +1（曾用 s 到 2.9、最多 6 個，第 100 層強力配置 0 勝）
        const s = 1 + (n - 7) / 93;
        const count = (n <= 30 ? 2 : n <= 70 ? 3 : 4) + (gate10 ? 1 : 0);
        const auras = [];
        for (let i = 0; i < count; i++) {
            const a = G.auras[(n * 3 + d + i * 7) % G.auras.length](s);
            ['player', 'self'].forEach(part => Object.keys(a[part]).forEach(k => { a[part][k] = r3(a[part][k]); }));
            a.name = name.slice(0, 2) + a.name;
            auras.push(a);
        }
        const rw = gate10 ? 2 : 1;
        ZHENMO_BOSSES[n] = {
            name, title: gate10 ? `第 ${n} 層樓主` : gate5 ? `第 ${n} 層鎮關者` : `第 ${n} 層守塔魔頭`,
            img: look.img, imgPos: look.pos, realm, stage,
            atkMult: r3(grow * (gate10 ? G.gate10Atk : gate5 ? G.gate5Atk : 1) * ((G.tune[n] || [1])[0])),
            hpMult: r3((1 + (n - 1) * G.perFloorHp) * ((G.tune[n] || [1, 1])[1])),   // × 校準倍率（ZHENMO_GEN.tune）
            hpPerAtk: 300,
            def: Math.min(35, 15 + Math.floor(n / 10) * 2), eva: Math.min(25, 8 + Math.floor(n / 10) * 2),
            affix, affixVal: Math.min(35, 15 + Math.floor(n / 10) * 2), element: G.elements[n % G.elements.length],
            intro: `鎮壓於第 ${n} 層的${suffix}，${gate10 ? '坐鎮此層樓主之位，魔威遠勝前層，' : gate5 ? '把守關隘，' : ''}久受塔中魔氣浸染，實力已達${realms[realm]}${stage}階。`,
            skills: [`${name.slice(0, 2)}魔掌`, `${suffix}怒嘯`, `${name.slice(0, 2)}滅殺`, `萬${suffix.slice(-1)}朝宗`],
            auras, icon: G.icons[affix], flash: G.flashes[affix],
            rewards: { coinMinutes: Math.round((10 + n * 0.5) * rw), merit: [(100 + n * 5) * rw, (200 + n * 10) * rw],
                       shards: [(3 + Math.floor(n / 10)) * rw, (6 + Math.floor(n / 8)) * rw], iron: [(4 + Math.floor(n / 10)) * rw, (8 + Math.floor(n / 8)) * rw] }
        };
    }
})();
