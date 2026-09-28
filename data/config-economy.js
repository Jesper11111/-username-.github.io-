// 賺錢管道（2026-09-29 使用者同意①～⑤，ARCHITECTURE.md 第 61 節）；邏輯在 economy.js
// 所有收入都以「H＝目前境界主要練功地圖掛機 1 小時的靈石」換算（economy.js 的 getHourlyIncome），並設每日上限，
// 避免靈石爆量（第 23 節：靈石曾因跟難度連動而暴增）。

// ==================== ① 坊市回收（天星城坊市的收購商）====================
const MARKET_SELL = {
    dailyCapHours: 2,             // 每日回收總額上限 = H × 2 小時
    // 裝備：H 的 N 分鐘 × 裝備等級係數（getEquipLevelFactor：0.5 ＋ 0.5 × 裝備等級 ÷ 你目前可穿的最高鍛造等級，最多 1）
    equipMinutes: { "白色": 0.5, "綠色": 1, "藍色": 2, "紫色": 4, "橙色": 10, "白金": 30 },
    pillRate: 0.2,                // 丹藥堂的丹藥：商店價 × 20%
    shardMinutes: 1,              // 異火碎片每個 = H 的 1 分鐘
    ironMinutes: 2,               // 星允鐵每顆 = H 的 2 分鐘
    profRankBonus: 0.02           // ④ 主修職業每一階，回收價 +2%（1 階 +2%…10 階 +20%）
};

// ==================== ② 僕從商隊（門派任務 caravan，config-quests.js）====================
const CARAVAN = {
    hours: 2,                     // 固定耗時（不受僕從效率影響）
    minutes: [10, 30],            // 每趟帶回 H 的 10～30 分鐘
    qualityMult: { "一般": 1, "優秀": 1.2, "稀有": 1.4, "史詩": 1.7, "傳說": 2 },   // 僕從品質越高收益越高
    dailyTrips: 4,                // 所有僕從合計每日最多完成幾趟
    goodsChance: 0.3,             // 30% 另外帶回可在坊市賣的貨物：星允鐵 1～3 或 異火碎片 1～2（各半）
    goodsIron: [1, 3], goodsShard: [1, 2]
};
// 加進門派任務（本檔載入時 config-quests.js 已載入）：三個宗門等級都有、只能由僕從執行（servantOnly）、固定耗時
// 獎勵 key "caravan" 由 quest.js 的 grantQuestRewards 特別處理（economy.js 的 grantCaravanReward）
questData.caravan = {};
[1, 2, 3].forEach(tier => {
    questData.caravan[tier] = { name: "商隊跑商", icon: "🐫", rewards: { caravan: CARAVAN.minutes }, duration: CARAVAN.hours * 3600, servantOnly: true };
});
questRewardInfo.caravan = { label: "分鐘掛機收入（靈石）", field: "coins" };

// ==================== ③ 洞府產業（靈田／礦脈，宗門分頁「🏞️ 洞府產業」）====================
// 每小時產出 = H × rate[等級−1]（第 1 級 5% … 第 10 級 25%）；累積到 capHours[等級−1] 小時就停（要回來收成）
// 升級花費 = H × upgradeHours[目前等級−1]（1 → 2 級 1 小時 … 9 → 10 級 3 小時）
const ESTATE = {
    maxLevel: 10,
    rate:        [0.05, 0.07, 0.09, 0.11, 0.13, 0.15, 0.17, 0.19, 0.22, 0.25],
    capHours:    [8, 8, 10, 12, 14, 16, 18, 20, 22, 24],
    upgradeHours: [1, 1.2, 1.4, 1.6, 1.8, 2, 2.3, 2.6, 3],
    kinds: {
        field: { name: "靈田", icon: "🌾", desc: "靈石＋靈草（靈草可到宗門靈田培育成煉丹材料）", grassPerHour: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20] },
        mine:  { name: "礦脈", icon: "⛏️", desc: "靈石＋礦石（符寶坊用）＋少量星允鐵", orePerHour: [1, 1, 2, 2, 3, 3, 4, 5, 6, 8], ironPerHour: 0.2 }
    }
};

// ==================== ⑤ 懸賞加靈石（bounty.js 的 endBountyDuel）====================
const BOUNTY_COIN_MINUTES = { tian: 30, di: 15, ren: 5 };   // 天榜／地榜／人榜伏誅額外給 H 的 N 分鐘
