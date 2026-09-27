// 每日任務設定
const DAILY_REFRESH_HOURS = 4;    // 每 4 小時刷新一次
const DAILY_QUEST_COUNT = 10;     // 每次刷新給 10 項任務

// 任務池：type 同時是進度計數的鍵，由各功能呼叫 addDailyProgress(type, n) 累加。
// targets 為三種難度的目標值，刷新時隨機挑一級，對應 dailyQuestRewards 的同索引獎勵。
// ※ 新增任務類型時，記得在對應功能裡加上 addDailyProgress() 呼叫，否則進度永遠是 0。
const dailyQuestPool = [
    { type: "kill",         name: "斬妖除魔", icon: "⚔️", desc: "於野外擊殺 {n} 隻妖獸",     targets: [15, 40, 80] },
    { type: "sectQuest",    name: "門派效力", icon: "📜", desc: "完成 {n} 次門派任務",       targets: [3, 6, 10] },
    { type: "potion",       name: "丹藥入腹", icon: "💊", desc: "服用 {n} 顆丹藥",           targets: [3, 8, 15] },
    { type: "forge",        name: "開爐鍛造", icon: "⚒️", desc: "鍛造 {n} 件裝備",           targets: [1, 3, 6] },
    { type: "plant",        name: "靈田耕耘", icon: "🌾", desc: "收穫 {n} 株靈草",           targets: [2, 5, 10] },
    { type: "study",        name: "藏經參悟", icon: "📚", desc: "於藏書閣參悟 {n} 次",       targets: [2, 5, 10] },
    { type: "craft",        name: "丹鼎煉製", icon: "🧪", desc: "煉製 {n} 爐神丹",           targets: [1, 2, 4] },
    { type: "rescue",       name: "仗義相助", icon: "🆘", desc: "拯救 {n} 名受困修士",       targets: [1, 2, 4] },
    { type: "buy",          name: "採買丹藥", icon: "🛒", desc: "於丹藥堂購買 {n} 個丹藥",   targets: [5, 15, 30] },
    { type: "breakthrough", name: "修為精進", icon: "✨", desc: "提升 {n} 次小境界",         targets: [1, 2, 3] }
];

// 三種難度對應的獎勵
const dailyQuestRewards = [
    { coins: 500,  reputation: 20,  martialPoints: 5 },
    { coins: 1500, reputation: 50,  martialPoints: 12 },
    { coins: 4000, reputation: 120, martialPoints: 30 }
];

// --- 千寶閣（拍賣場）---
const AUCTION_REFRESH_HOURS = 3;   // 每 3 小時刷新
const AUCTION_ITEM_COUNT = 5;      // 每次只刷新 5 件商品
const AUCTION_PAID_REFRESH_COST = 100000;   // 花靈石立即刷新（不改變定時刷新的時間）
const AUCTION_PAID_REFRESH_DAILY = 5;       // 每日可付費刷新次數（與懸賞榜分開計）
// 裝備等級（2026-09-27）：「當前檔」= EQUIP_LEVELS 中不超過人物等級的最高檔；有 AUCTION_GEAR_PREV_TIER_CHANCE 機率改賣前一檔
// 四維與鍛造／奪寶同公式（等級 × EQUIP_LEVEL_STAT_MULT × 品質倍率，拍賣屬外界管道再 × GEAR_EXTERNAL_MULT），穿戴需人物等級 ≥ 裝備等級
const AUCTION_GEAR_PREV_TIER_CHANCE = 0.3;
// 低等白金（先天道器）：每個裝備商品欄位有機率改賣白金，等級比當前檔低 AUCTION_PLATINUM_TIERS_BELOW 檔（最低 10 級），固定價格、不會被搶拍
// 不賣套裝（拍賣清單本來就沒有套裝部件，auction.js 另有防呆）
const AUCTION_PLATINUM_CHANCE = 0.05;
const AUCTION_PLATINUM_TIERS_BELOW = 2;
const AUCTION_PLATINUM_PRICE = 100000000;   // 1 億靈石

// 拍賣場的品質機率（由高到低累進判斷），比鍛造閣更容易出高品質
const auctionQualityOdds = [
    { quality: "橙色", chance: 0.10 },
    { quality: "紫色", chance: 0.25 },
    { quality: "藍色", chance: 0.35 },
    { quality: "綠色", chance: 0.20 },
    { quality: "白色", chance: 0.10 }
];

// 搶拍（auction.js）：紫／橙品質的商品（裝備或壽元丹）按下「標下」時，擲一次是否有其他客人競拍同一件商品；
// 結果存進商品（item.rival），重新整理或關掉視窗都不會重擲。對手有隱藏的心理價位（底價 × MIN~MAX），
// 玩家每次加價後，對手只要還在心理價位內就會跟價；超過就退出、由玩家以最後出價得標。玩家放棄則商品被對手標走。
const AUCTION_RIVAL_CHANCE = { "紫色": 0.3, "橙色": 0.5 };
const AUCTION_RIVAL_MAX_MULT_MIN = 1.1;
const AUCTION_RIVAL_MAX_MULT_MAX = 2.0;
const AUCTION_BID_STEPS = [0.1, 0.3];   // 加價按鈕：底價的 10%／30%（對手跟價一律加 10%）
const auctionRivalNames = [
    "天星宗長老", "萬寶樓掌櫃", "落雲宗少主", "黃楓谷師叔", "掩月宗仙子", "星宮執事",
    "蒙面散修", "亂星海海商", "九國盟使者", "陰羅宗護法", "御靈宗弟子", "神秘黑袍客"
];

// 千寶閣的壽元丹：每個商品欄位依下列機率「先」判定是否上架壽元丹（合計 27%），
// 沒抽中才改上架裝備。購買需同時支付靈石與聲望，標下後立即服用增加壽元。
const auctionLifePills = [
    { id: "life_pill_0", name: "普通壽元丹", quality: "白色", years: 10,  chance: 0.10, coins: 100000,   rep: 50 },
    { id: "life_pill_1", name: "一紋壽元丹", quality: "綠色", years: 20,  chance: 0.08, coins: 200000,   rep: 50 },
    { id: "life_pill_2", name: "二紋壽元丹", quality: "藍色", years: 30,  chance: 0.05, coins: 500000,   rep: 50 },
    { id: "life_pill_3", name: "三紋壽元丹", quality: "紫色", years: 50,  chance: 0.03, coins: 1000000,  rep: 50 },
    { id: "life_pill_4", name: "四紋壽元丹", quality: "橙色", years: 100, chance: 0.01, coins: 10000000, rep: 200 }
];
