// 戰鬥屬性設定：減傷、閃避、屬性傷害（冰/火/毒/金/雷）、五行相剋
// ※ 這裡的「屬性傷害」與裝備的「五行」（金木水火土，用於靈根與五行相剋）是兩套不同系統。
//
// 所有數值皆為「百分比」（例：def: 8 代表減傷 8%），存放在裝備的 stats 內，
// 與力量/體質等一起由 stats.js 的 getEquipBonus() 加總。
// 玩家與怪物（含心魔）都套用同一套規則，見 elements.js 的 resolveHit()。

// 玩家從裝備累積的上限（技能自帶的屬性機率不受 AFFIX_CAP 限制）
const DEF_CAP = 60;     // 減傷上限 60%
const EVA_CAP = 40;     // 閃避上限 40%（物理、術法傷害都能閃）
const AFFIX_CAP = 50;   // 每種屬性傷害觸發率上限 50%

// 屬性傷害效果
const FREEZE_TURNS = 1;          // 冰：凍結 1 回合（該回合無法行動）
const BURN_MAX_STACKS = 3;       // 火：燒傷最多疊 3 層
const BURN_TURNS = 3;            //     持續 3 回合（再次命中會刷新回合數）
const BURN_RATE = 0.15;          //     每層每回合 = 施放者攻擊力 × 15%
const POISON_MAX_STACKS = 5;     // 毒：中毒最多疊 5 層
const POISON_TURNS = 3;          //     持續 3 回合
const POISON_RATE = 0.08;        //     每層每回合 = 施放者攻擊力 × 8%
const METAL_BONUS = 1.0;         // 金：重擊，該次傷害額外 +100%（共 2 倍）
const THUNDER_BONUS = 0.3;       // 雷：雷擊，該次傷害額外 +30%，且無視目標減傷

// 屬性顯示資訊（key 對應 stats 內的欄位名稱）
const combatAttrInfo = {
    def:    { label: "減傷", icon: "🛡️" },
    eva:    { label: "閃避", icon: "💨" },
    ice:    { label: "冰傷", icon: "❄️", desc: `觸發時凍結目標 ${FREEZE_TURNS} 回合` },
    fire:   { label: "火傷", icon: "🔥", desc: `燒傷，最多 ${BURN_MAX_STACKS} 層、持續 ${BURN_TURNS} 回合` },
    poison: { label: "毒傷", icon: "☠️", desc: `中毒，最多 ${POISON_MAX_STACKS} 層、持續 ${POISON_TURNS} 回合` },
    metal:  { label: "金傷", icon: "⚔️", desc: `重擊，該次傷害 ×${1 + METAL_BONUS}` },
    thunder:{ label: "雷傷", icon: "⚡", desc: `雷擊，該次傷害 ×${1 + THUNDER_BONUS} 且無視目標減傷` },
    wind:   { label: "風擊", icon: "🌪️", desc: "每回合機率追加一擊（普攻 ×0.6）" },
    light:  { label: "聖光", icon: "☀️", desc: "該擊 ×1.3 並回復最大氣血 1%" },
    dark:   { label: "暗蝕", icon: "🌑", desc: "該擊無視減傷並吸取 20% 傷害回血" }
};
// ---- 變異屬性（2026-09-27，第 53 節）：由先天靈根、體質提供，與上面的屬性傷害一起套 AFFIX_CAP ----
//   風：每回合 wind% 機率追加一擊（普攻 ×WIND_HIT_MULT）
//   光：觸發時該擊 ×(1 + LIGHT_BONUS) 並回復最大氣血 LIGHT_HEAL
//   暗：觸發時該擊無視減傷，並吸取該擊傷害 DARK_LIFESTEAL 回血
const WIND_HIT_MULT = 0.6;
const LIGHT_BONUS = 0.3;
const LIGHT_HEAL = 0.01;
const DARK_LIFESTEAL = 0.2;
const VARIANT_AFFIX_TYPES = ["wind", "light", "dark"];
// 光暗互剋：雙方都有「光／暗」本質（attrs.nature）且不同時，攻擊方傷害 ×(1 + 此值)
//   玩家本質來自資質（config-aptitude.js 的 special.nature）；邪修、邪派懸賞人物、幽冥禁域妖獸為暗，正道修士與正派懸賞人物為光
const LIGHT_DARK_COUNTER_BONUS = 0.3;
const DARK_MAP_CATEGORIES = [4];   // 這些地圖分類的妖獸本質為暗（幽冥禁域）

// 玩家武器可帶的屬性傷害（鍛造閣／千寶閣隨機抽一種）
const AFFIX_TYPES = ["ice", "fire", "poison", "metal", "thunder"];
// 怪物的「異屬性」只會是冰／毒／雷（火、金已屬於五行，不再作為怪物的屬性傷害）
const MONSTER_AFFIX_TYPES = ["ice", "poison", "thunder"];

// ---- 五行相剋（與上方的屬性傷害是兩套系統）----
// 每個戰鬥單位都有一個五行：玩家取「本命五行」（getPlayerElement，裝備中數量最多的五行），怪物生成時隨機，心魔與玩家相同。
// 攻擊方剋制防守方 → 傷害 ×(1 + WUXING_COUNTER_BONUS)；攻擊方被防守方剋制 → 傷害 ×(1 - WUXING_COUNTERED_PENALTY)。
// 玩家打怪、怪打玩家都套用，規則完全對稱。任一方沒有五行（例如玩家沒穿裝備）則不觸發。
const WUXING_COUNTERS = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };   // key 剋 value
const WUXING_COUNTER_BONUS = 0.3;       // 剋制：傷害 +30%
const WUXING_COUNTERED_PENALTY = 0.3;   // 被剋：傷害 -30%

// 怪物依地圖分類（maps 的索引）取得的戰鬥屬性：
//   def/eva = 減傷/閃避；affixProb = 每隻怪帶異屬性（冰/毒/雷）的機率；affixChance = 帶了之後的觸發率
const monsterAttrsByMapCategory = {
    1: { def: 0,  eva: 2, affixProb: 0.3, affixChance: 5 },    // 野外歷練
    2: { def: 5,  eva: 4, affixProb: 0.5, affixChance: 10 },   // 開放世界
    3: { def: 10, eva: 6, affixProb: 0.7, affixChance: 15 },   // 上古禁區
    4: { def: 10, eva: 6, affixProb: 0.7, affixChance: 15 },   // 幽冥禁域（同上古禁區）
    5: { def: 15, eva: 8, affixProb: 0.9, affixChance: 20 }    // 諸天至高戰場
};
