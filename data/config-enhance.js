// 強化／進化／分解／星允鐵／暫存區／隨機詞條（ARCHITECTURE.md 第 37 節），邏輯在 enhance.js 與 gear.js

// ---- 隨機詞條（取得裝備時抽一次，之後不會變）----
// 條數依品級；數值 = (min ～ max 之間隨機) × 品級係數；外界裝備（奪寶／拍賣／秘境）只抽範圍的上半段
const GEAR_SUB_COUNT = { "白色": 0, "綠色": 1, "藍色": 2, "紫色": 2, "橙色": 3, "白金": 4 };
const GEAR_SUB_QUALITY_SCALE = { "綠色": 0.3, "藍色": 0.5, "紫色": 0.7, "橙色": 1, "白金": 1.3 };
// key：strPct 等 = 該項四維 +%（以本身＋裝備的總量計）；atkPct 攻擊 +%；hpPct 氣血上限 +%；
//      def/eva/ice/fire/poison/metal/thunder = 戰鬥屬性百分點（與裝備加總後套上限）；
//      "fx:特效名" = 併入同名特效（不受特效上限限制），見 gear.js 的 getGearEffects
//   fmt：pct = 比例（0.03 → 3%）、pt = 百分點（2 → 2%）
const gearSubAffixes = [
    { key: "strPct", label: "力量",       fmt: "pct", min: 0.02,  max: 0.05 },
    { key: "conPct", label: "體質",       fmt: "pct", min: 0.02,  max: 0.05 },
    { key: "intPct", label: "悟性",       fmt: "pct", min: 0.02,  max: 0.05 },
    { key: "sprPct", label: "靈力",       fmt: "pct", min: 0.02,  max: 0.05 },
    { key: "chaPct", label: "魅力",       fmt: "pct", min: 0.02,  max: 0.05 },
    { key: "atkPct", label: "攻擊",       fmt: "pct", min: 0.02,  max: 0.04 },
    { key: "hpPct",  label: "氣血上限",   fmt: "pct", min: 0.02,  max: 0.05 },
    { key: "def",     label: "防禦",      fmt: "pt",  min: 1,     max: 3 },
    { key: "eva",     label: "閃避",      fmt: "pt",  min: 1,     max: 2 },
    { key: "mdef",    label: "魔防",      fmt: "pt",  min: 2,     max: 5, only: "accessory" },   // 2026-10-03（第 66 節第 4 期 A）：只出在飾品，像《天堂2》首飾給魔防
    { key: "ice",     label: "冰傷",      fmt: "pt",  min: 2,     max: 5 },
    { key: "fire",    label: "火傷",      fmt: "pt",  min: 2,     max: 5 },
    { key: "poison",  label: "毒傷",      fmt: "pt",  min: 2,     max: 5 },
    { key: "metal",   label: "金傷",      fmt: "pt",  min: 2,     max: 5 },
    { key: "thunder", label: "雷傷",      fmt: "pt",  min: 2,     max: 5 },
    { key: "fx:法爆", label: "技能傷害",   fmt: "pct", min: 0.02,  max: 0.05 },
    { key: "fx:剋敵", label: "剋制傷害",   fmt: "pct", min: 0.02,  max: 0.05 },
    { key: "fx:回春", label: "每回合回血", fmt: "pct", min: 0.003, max: 0.008 },
    { key: "fx:回靈", label: "每回合回靈", fmt: "pct", min: 0.005, max: 0.01 },
    { key: "fx:噬魂", label: "擊殺回血",   fmt: "pct", min: 0.01,  max: 0.02 },
    { key: "fx:聚財", label: "靈石",       fmt: "pct", min: 0.02,  max: 0.06 },
    { key: "fx:悟道", label: "修為",       fmt: "pct", min: 0.01,  max: 0.03 },
    { key: "fx:積德", label: "功德",       fmt: "pct", min: 0.03,  max: 0.08 },
    { key: "fx:尋鐵", label: "星允鐵",     fmt: "pct", min: 0.03,  max: 0.08 },
    { key: "fx:獸魂", label: "靈寵傷害",   fmt: "pct", min: 0.03,  max: 0.08 }
];

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
