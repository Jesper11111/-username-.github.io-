// 強化／進化／分解／星允鐵／暫存區／隨機詞條（ARCHITECTURE.md 第 37 節），邏輯在 enhance.js 與 gear.js

// ---- 隨機詞條（取得裝備時抽一次，之後不會變）----
// 條數依品級；數值 = (min ～ max 之間隨機) × 品級係數；外界裝備（奪寶／拍賣／秘境）只抽範圍的上半段
const GEAR_SUB_COUNT = { "白色": 0, "綠色": 1, "藍色": 2, "紫色": 2, "橙色": 3, "白金": 4 };
const GEAR_SUB_QUALITY_SCALE = { "綠色": 0.3, "藍色": 0.5, "紫色": 0.7, "橙色": 1, "白金": 1.3 };
// key：strPct 等 = 該項四維 +%（以本身＋裝備的總量計）；atkPct 攻擊 +%；hpPct 氣血上限 +%；
//      def/eva/ice/fire/poison/metal/thunder = 戰鬥屬性百分點（與裝備加總後套上限）；
//      "fx:特效名" = 併入同名特效（不受特效上限限制），見 gear.js 的 getGearEffects
//   fmt：pct = 比例（0.03 → 3%）、pt = 百分點（2 → 2%）
// 2026-10-03 起（暗黑式詞綴，ARCHITECTURE.md 第 67 節 D1）每條多兩組欄位：
//   w＝各分類抽到的權重 { weapon, armor, accessory }（沒寫的分類＝1；only 限定分類的其餘為 0）
//   pre／suf＝命名用的前綴／後綴（修仙風，裝備名依最強的兩條詞綴自動加上，gear.js 的 getGearAffixName）
const gearSubAffixes = [
    { key: "strPct", label: "力量",       fmt: "pct", min: 0.02,  max: 0.05, w: { weapon: 2 },                          pre: "蠻力", suf: "拔山" },
    { key: "conPct", label: "體質",       fmt: "pct", min: 0.02,  max: 0.05, w: { armor: 2 },                           pre: "磐石", suf: "金身" },
    { key: "intPct", label: "悟性",       fmt: "pct", min: 0.02,  max: 0.05, w: { weapon: 1.5, accessory: 1.5 },        pre: "慧心", suf: "通玄" },
    { key: "sprPct", label: "靈力",       fmt: "pct", min: 0.02,  max: 0.05, w: { accessory: 2 },                       pre: "蘊靈", suf: "聚元" },
    { key: "chaPct", label: "魅力",       fmt: "pct", min: 0.02,  max: 0.05, w: { accessory: 2, weapon: 0.5 },          pre: "傾城", suf: "驚鴻" },
    { key: "atkPct", label: "攻擊",       fmt: "pct", min: 0.02,  max: 0.04, w: { weapon: 3, armor: 0.5 },              pre: "破軍", suf: "斬天" },
    { key: "hpPct",  label: "氣血上限",   fmt: "pct", min: 0.02,  max: 0.05, w: { armor: 3, weapon: 0.5 },              pre: "長生", suf: "不滅" },
    { key: "def",     label: "防禦",      fmt: "pt",  min: 1,     max: 3,    w: { armor: 3, weapon: 0, accessory: 0.5 }, pre: "玄甲", suf: "鎮岳" },
    { key: "eva",     label: "閃避",      fmt: "pt",  min: 1,     max: 2,    w: { accessory: 3, weapon: 0.5 },          pre: "流雲", suf: "無影" },
    { key: "mdef",    label: "魔防",      fmt: "pt",  min: 2,     max: 5, only: "accessory", w: { accessory: 2 },      pre: "護魂", suf: "辟邪" },   // 2026-10-03（第 66 節第 4 期 A）：只出在飾品，像《天堂2》首飾給魔防
    { key: "ice",     label: "冰傷",      fmt: "pt",  min: 2,     max: 5,    w: { weapon: 2, armor: 0.3 },              pre: "寒霜", suf: "冰魄" },
    { key: "fire",    label: "火傷",      fmt: "pt",  min: 2,     max: 5,    w: { weapon: 2, armor: 0.3 },              pre: "赤焰", suf: "焚天" },
    { key: "poison",  label: "毒傷",      fmt: "pt",  min: 2,     max: 5,    w: { weapon: 2, armor: 0.3 },              pre: "幽毒", suf: "萬蠱" },
    { key: "metal",   label: "金傷",      fmt: "pt",  min: 2,     max: 5,    w: { weapon: 2, armor: 0.3 },              pre: "鋒銳", suf: "裂金" },
    { key: "thunder", label: "雷傷",      fmt: "pt",  min: 2,     max: 5,    w: { weapon: 2, armor: 0.3 },              pre: "雷霆", suf: "九霄" },
    { key: "fx:法爆", label: "技能傷害",   fmt: "pct", min: 0.02,  max: 0.05, w: { weapon: 2, armor: 0.3 },              pre: "玄法", suf: "天罡" },
    { key: "fx:剋敵", label: "剋制傷害",   fmt: "pct", min: 0.02,  max: 0.05, w: { weapon: 2, armor: 0.3 },              pre: "伏魔", suf: "誅邪" },
    { key: "fx:回春", label: "每回合回血", fmt: "pct", min: 0.003, max: 0.008, w: { armor: 2, weapon: 0.3 },            pre: "回春", suf: "生生" },
    { key: "fx:回靈", label: "每回合回靈", fmt: "pct", min: 0.005, max: 0.01, w: { accessory: 2, weapon: 0.5 },          pre: "凝神", suf: "歸元" },
    { key: "fx:噬魂", label: "擊殺回血",   fmt: "pct", min: 0.01,  max: 0.02, w: { weapon: 1.5, armor: 0.5 },            pre: "嗜血", suf: "噬魂" },
    { key: "fx:聚財", label: "靈石",       fmt: "pct", min: 0.02,  max: 0.06, w: { accessory: 2, weapon: 0.5, armor: 0.5 }, pre: "招財", suf: "聚寶" },
    { key: "fx:悟道", label: "修為",       fmt: "pct", min: 0.01,  max: 0.03, w: { accessory: 2, weapon: 0.5, armor: 0.5 }, pre: "悟道", suf: "明心" },
    { key: "fx:積德", label: "功德",       fmt: "pct", min: 0.03,  max: 0.08, w: { accessory: 2, weapon: 0.5, armor: 0.5 }, pre: "積善", suf: "功德" },
    { key: "fx:尋鐵", label: "星允鐵",     fmt: "pct", min: 0.03,  max: 0.08, w: { accessory: 1.5, weapon: 0.5 },        pre: "尋寶", suf: "天工" },
    { key: "fx:獸魂", label: "靈寵傷害",   fmt: "pct", min: 0.03,  max: 0.08, w: { accessory: 1.5, armor: 0.5 },          pre: "御獸", suf: "百獸" }
];

// ---- 詞綴分級（天地玄黃凡，2026-10-03 第 67 節 D1）：數值 = 原本的隨機值 × 品級係數 × 分級倍率 ----
//   能抽到哪幾級由裝備等級決定（GEAR_SUB_TIER_WEIGHTS，[天, 地, 玄, 黃, 凡] 的權重）；平均倍率 Lv.<100 約 0.80、100～ 0.89、500～ 0.96、1000～ 1.01、2500～ 1.07，
//   整體平均與改版前（固定 1）相近，高等裝備才有機會出「天」級。沒有裝備等級的（舊千寶閣商品）視同 GEAR_SUB_TIER_NOLEVEL。
const GEAR_SUB_TIERS = [
    { id: 1, name: "天", mult: 1.3,  color: "#fbbf24" },
    { id: 2, name: "地", mult: 1.15, color: "#c084fc" },
    { id: 3, name: "玄", mult: 1.0,  color: "#38bdf8" },
    { id: 4, name: "黃", mult: 0.85, color: "#4ade80" },
    { id: 5, name: "凡", mult: 0.7,  color: "#9ca3af" }
];
const GEAR_SUB_TIER_WEIGHTS = [
    { minLv: 0,    w: [0, 0, 15, 35, 50] },
    { minLv: 100,  w: [0, 10, 30, 35, 25] },
    { minLv: 500,  w: [5, 20, 35, 25, 15] },
    { minLv: 1000, w: [10, 25, 35, 20, 10] },
    { minLv: 2500, w: [20, 30, 30, 15, 5] }
];
const GEAR_SUB_TIER_NOLEVEL = 500;

// ---- 強化 ----
// 每 +1：該裝備四維 +ENHANCE_STAT_PER_LEVEL（+20 = 兩倍）；減傷／閃避／屬性傷害、隨機詞條不變
const ENHANCE_STAT_PER_LEVEL = 0.05;
const ENHANCE_CAP = { "白色": 10, "綠色": 10, "藍色": 12, "紫色": 15, "橙色": 20, "白金": 20 };
// 每次花費：星允鐵 = 目標等級 × 品級係數；靈石 = 目標等級 × ENHANCE_COINS_PER_LEVEL（失敗也照扣）
const ENHANCE_IRON_COEF = { "白色": 1, "綠色": 1, "藍色": 2, "紫色": 3, "橙色": 5, "白金": 5 };
const ENHANCE_COINS_PER_LEVEL = 50000;
// 目標等級 → 基礎成功率（+1～+10 皆 100%）；失敗不掉級、不毀裝，同一級每失敗一次 +ENHANCE_PITY_STEP（成功後歸零）
const ENHANCE_SUCCESS = { 11: 0.90, 12: 0.85, 13: 0.80, 14: 0.75, 15: 0.70, 16: 0.60, 17: 0.50, 18: 0.45, 19: 0.40, 20: 0.30 };
const ENHANCE_PITY_STEP = 0.05;

// ---- 進化：橙色 +20 → 白金（先天道器），保留 +20 與原有詞條，並多抽 1 條 ----
const EVOLVE_QUALITY = "橙色";
const EVOLVE_LEVEL = 20;
const EVOLVE_IRON = 300;
const EVOLVE_COINS = 10000000;
const EVOLVE_NAME_PREFIX = "先天・";

// ---- 分解 ----
// 白～紫 → 碎鐵，每 SHARDS_PER_IRON 個自動合成 1 顆星允鐵；橙色、白金 → 直接給星允鐵（只能手動分解）
const DECOMPOSE_SHARDS = { "白色": 10, "綠色": 20, "藍色": 40, "紫色": 80 };
const SHARDS_PER_IRON = 500;
const DECOMPOSE_IRON = { "橙色": 3, "白金": 15 };

// ---- 暫存區：背包滿時新掉落的橙色以上放這裡；滿了不能外出練功 ----
const GEAR_STASH_MAX = 50;

// ---- 星允鐵來源 ----
const IRON_MINE_CHANCE = 0.02;                   // 礦脈採礦每趟（傳說僕從）
const IRON_MINE_AMOUNT = [1, 2];
const IRON_FIELD_CULTIVATOR_CHANCE = 0.20;       // 野外修士（敵對陣營）
const IRON_AMBUSH_AMOUNT = [1, 3];               // 暗殺者必掉
const IRON_BOUNTY_AMOUNT = { ren: [1, 5], di: [5, 12], tian: [12, 20] };   // 懸賞伏誅（依榜，key 同 BOUNTY_RANKS）
const IRON_AUCTION_DAILY_LIMIT = 10;             // 千寶閣常駐區每日限購
const IRON_AUCTION_PRICE = 300000;               // 每顆靈石
const IRON_BAG_CHANCE = 0.05;                    // 千寶閣每格上架「星允鐵袋」的機率
const IRON_BAG_AMOUNT = [10, 30];
const IRON_BAG_PRICE = { coins: 400000, rep: 20 };   // 每顆
