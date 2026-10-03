// 境界名稱列表（依序對應 player.realmIndex）
const realms = [
    "凡人", "煉氣", "築基", "金丹", "元嬰", "化神", "煉虛",
    "合體", "大乘", "渡劫", "仙人初境", "天仙", "真仙",
    "大羅金仙", "混元大羅金仙", "混沌道祖"
];

// ---- 修煉節奏表（索引對應 realms）----
// hours   = 在主要地圖 map 掛機、修滿該境界 10 階的「目標線上時數」
// map     = 該境界的主要練功地圖（config-maps.js 的地圖名稱）
// expMult = 估算用的經驗加成（宗門 expMult × 靈寵）：凡俗宗門 ×1.2；修真宗門約 ×2 + 靈幻狐 = 2.2；至高宗門約 ×4 + 狐＋蛟龍 = 5.28
// 每階所需經驗由 stats.js 的 getRealmStageExp() 依此表自動換算（每階 = 基數 × 階數，10 階合計 55 倍基數），
// 壽元流逝速度也依此表計算（lifespan.js 的 getAgingHours()）。調整修煉時間只要改 hours。
const REALM_PACING_KILLS_PER_SEC = 0.32;   // 滿速掛機每秒擊殺數（實測，同 KILLS_PER_HOUR_ESTIMATE）
const realmPacing = [
    { hours: 0.5,  map: "靈山大川", expMult: 1.2 },    // 凡人      30 分鐘
    { hours: 1,    map: "靈山大川", expMult: 1.2 },    // 煉氣      1 小時
    { hours: 2,    map: "深淵險地", expMult: 1.2 },    // 築基      2 小時
    { hours: 3,    map: "上古遺跡", expMult: 2.2 },    // 金丹      3 小時
    { hours: 5,    map: "天南",     expMult: 2.2 },    // 元嬰      5 小時
    { hours: 10,   map: "亂星海",   expMult: 2.2 },    // 化神      10 小時
    { hours: 20,   map: "鬼谷八荒", expMult: 2.2 },    // 煉虛      20 小時
    // 合體～天仙 2026-09-30 改指向新的普通圖（原本的崑吾山等改為高強度挑戰圖、經驗提高）；普通圖的 expRate 沿用舊值，所以每階所需經驗不變
    { hours: 48,   map: "黑風海域", expMult: 2.2 },    // 合體      2 天（原崑吾山）
    { hours: 240,  map: "蠻荒古地", expMult: 2.2 },    // 大乘      10 天（原雷鳴大陸）
    { hours: 720,  map: "血天大陸", expMult: 2.2 },    // 渡劫      30 天（原天淵戰場）
    { hours: 1200, map: "星空古路", expMult: 5.28 },   // 仙人初境  50 天（原荒古禁地）
    { hours: 2400, map: "九天仙域", expMult: 5.28 },   // 天仙  100 天（原上蒼）
    { hours: 3600, map: "不死山",   expMult: 5.28 },   // 真仙      150 天（2026-10-03 冥界改為真仙 10 階才能進，主圖改不死山；每階經驗照不死山重算＝原 2/3，總時數不變）
    { hours: 4800, map: "仙界戰場", expMult: 5.28 },   // 大羅金仙  200 天
    { hours: 4800, map: "萬界戰場", expMult: 5.28 },   // 混元大羅金仙 200 天
    { hours: 7200, map: "混沌初界", expMult: 5.28 }    // 混沌道祖  300 天
];
