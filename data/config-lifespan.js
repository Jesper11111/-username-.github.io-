// 壽元設定：索引對應 realms（config-realms.js）
//   gain      = 晉升到該境界時增加的壽元（年）；凡人為初始壽元
//   deathCost = 在該境界死亡一次扣除的壽元（年）
// 壽元與戰力無關；歸零即身死道消，存檔清除並重新開始（只有「死亡」會讓壽元歸零，見下方底線）。

// ---- 歲月流逝（自然消耗）：安全區緩慢流逝，野外依危險度加速，觸及底線後停止 ----
// 每分鐘流逝 = 目前境界的 gain ÷（getAgingHours() × 60）× 所在地倍率
//   getAgingHours()（lifespan.js）= 一個境界給的壽元在「安全區」可撐幾小時：
//     max(LIFESPAN_MIN_AGING_HOURS, 修煉時數 × LIFESPAN_PACE_MULT × 主要地圖的流逝倍率)
//   → 在該境界的主要地圖，壽元約可撐「修滿該境界所需時間」的 5 倍；前期至少維持安全區 6 小時
//   修煉時數與主要地圖見 config-realms.js 的 realmPacing
const LIFESPAN_MIN_AGING_HOURS = 6;
const LIFESPAN_PACE_MULT = 5;
// 指定境界的「累積壽元可撐倍數」（2026-10-05 使用者指定）：在主要地圖，從凡人累積到該境界的壽元（扣掉底線）可撐「修滿該境界所需時間」的幾倍。
//   預設（LIFESPAN_PACE_MULT 5）約 17～24 倍、大羅金仙以後約 10 倍；這裡列的境界改用指定倍數換算流逝速度（lifespan.js 的 getAgingHours），
//   只改流逝速度，各境界獲得的壽元與死亡折壽不變。索引對應 realms：9 渡劫、10 仙人初境、13 大羅金仙、14 混元大羅金仙、15 混沌道祖
const LIFESPAN_TARGET_RATIO = { 9: 19, 10: 20, 13: 25, 14: 28, 15: 30 };

// 新角色（與轉世後）的起始年齡；年齡只會隨歲月流逝增加（折壽不算年齡）
const LIFESPAN_START_AGE = 16;

// 所在地倍率：索引對應 maps 的分類（0 安全區 / 1 野外 / 2 開放世界 / 3 上古禁區 / 4 幽冥禁域 / 5 至高戰場）
const LIFESPAN_DANGER_MULT = [1, 1.5, 2, 3, 3, 4, 3];   // 索引 6＝無邊海（同第三區）
const LIFESPAN_TRIBULATION_MULT = 4;   // 渡劫期間

// 離線期間以一半速度流逝（同樣受底線保護）
const LIFESPAN_OFFLINE_RATE = 0.5;

// 底線：剩餘壽元 ≤「目前境界死亡折壽 × 3」時，自然流逝停止。
// 也就是「時間永遠不會直接害死玩家」，但觸底後再死亡 3 次就會身死道消。
const LIFESPAN_FLOOR_DEATHS = 3;
const lifespanByRealm = [
    { realm: "凡人",         gain: 60,     deathCost: 1 },
    { realm: "煉氣",         gain: 100,    deathCost: 1 },
    { realm: "築基",         gain: 200,    deathCost: 3 },
    { realm: "金丹",         gain: 500,    deathCost: 5 },
    { realm: "元嬰",         gain: 800,    deathCost: 5 },
    { realm: "化神",         gain: 1000,   deathCost: 5 },
    { realm: "煉虛",         gain: 1200,   deathCost: 8 },
    { realm: "合體",         gain: 1500,   deathCost: 8 },
    { realm: "大乘",         gain: 2000,   deathCost: 10 },
    { realm: "渡劫",         gain: 3000,   deathCost: 10 },
    { realm: "仙人初境",     gain: 4000,   deathCost: 15 },
    { realm: "天仙",         gain: 4500,   deathCost: 15 },
    { realm: "真仙",         gain: 5000,   deathCost: 20 },
    { realm: "大羅金仙",     gain: 20000,  deathCost: 50 },    // 對應需求表的「仙王」
    { realm: "混元大羅金仙", gain: 50000,  deathCost: 100 },   // 對應需求表的「仙帝」
    { realm: "混沌道祖",     gain: 100000, deathCost: 200 }
];
