// 渡劫（心魔試煉）設定
// 小境界滿 10 階後修為停止累積，必須擊敗心魔才能晉升下一個大境界。

// 從哪個境界開始需要渡劫：realmIndex 2 =【築基】，亦即「築基 → 金丹」起才會引來天劫。
// 在此之前（凡人 → 煉氣、煉氣 → 築基）滿 10 階會直接突破，不需渡劫。
const TRIBULATION_MIN_REALM_INDEX = 2;

// ---- 渡劫勝算（開打前擲骰決定天命，實際勝率＝畫面顯示的勝算）----
// 勝算 = 基礎 60% + 丹藥準備（最多 +10%）+ 宗門技能（最多 +10%），上限 80%
//   丹藥：需開啟【自動補血】；背包氣血丹藥的「回復量 × 數量」總和達 TRIBULATION_POTION_FULL_STOCK 即拿滿
//         （3.0 = 10 顆九轉還魂丹，或 30 顆培元丹、60 株凝血草）
//   技能：目前境界已開放的宗門階段中，已學會幾個階段（例：築基只開放初級，學了就 +10%；
//         化神開放初級＋中級，只學初級 +5%、兩個都學 +10%）
// 為何不用純數值平衡：戰鬥結果幾乎由數值決定，模擬顯示「無藥 60%」時帶滿藥必定 99~100%，
// 且學到越多階段技能越容易，無法同時滿足「基礎 60%、準備後不超過 80%」。
const TRIBULATION_BASE_CHANCE = 0.60;
const TRIBULATION_POTION_BONUS = 0.10;
const TRIBULATION_POTION_FULL_STOCK = 3.0;
const TRIBULATION_SKILL_BONUS = 0.10;
const TRIBULATION_MAX_CHANCE = 0.80;

// 合體期起天劫加劇：從 TRIBULATION_HARD_REALM_INDEX（7 =【合體】，即「合體 → 大乘」）開始，
// 每高一個大境界，基礎勝算再 -TRIBULATION_HARD_PENALTY_PER_REALM，最多扣到 TRIBULATION_HARD_PENALTY_MAX；
// 心魔戰力同步 ×(1 + 扣除量)，戰鬥觀感也更凶險。
//   合體 -5%、大乘 -10%、渡劫 -15%、仙人初境 -20%、天仙 -25%、真仙起 -30%
const TRIBULATION_HARD_REALM_INDEX = 7;
const TRIBULATION_HARD_PENALTY_PER_REALM = 0.05;
const TRIBULATION_HARD_PENALTY_MAX = 0.30;

// 心魔戰力＝玩家的 100%（天命已在開打前決定，數值只影響戰鬥過程的觀感，設成勢均力敵）
const HEART_DEMON_POWER_MULT = 1.0;

// 心魔氣血＝玩家的 100%（心魔是你的鏡像魔身，生命力與你相同）
const HEART_DEMON_HP_MULT = 1.0;

// 心魔為人形（與玩家同貌的魔身）
const HEART_DEMON_ICON = "🧍";
// 戰場實況的心魔圖（依玩家性別，battle-fx.js 的 getBattleFoeImg）；沒有圖的性別顯示上面的 emoji
const HEART_DEMON_IMGS = {
    male:   { img: "images/monsters/heart-demon-male.jpg", pos: "50% 25%" },     // 2026-09-29 玩家提供：紫袍魔身、背後魔神浮雕、腳踩血色法陣
    female: { img: "images/monsters/heart-demon-female.jpg", pos: "50% 22%" }    // 2026-09-29 玩家提供：紫髮紅瞳魔女、持血晶魔杖、月下古寺
};

// 心魔每回合施展魔功的機率
const HEART_DEMON_SKILL_CHANCE = 0.4;

// 渡劫失敗時損失的靈石比例
const TRIBULATION_FAIL_COIN_LOSS = 0.1;

// 渡劫失敗：小境界掉落的階數（10 階 → 7 階，大境界不會倒退），同時扣回這幾階升階時加的四維與魅力
const TRIBULATION_FAIL_STAGE_DROP = 3;

// 虛弱：渡劫失敗後，直到小境界重新升回 10 階前，攻擊力（物理／術法）、氣血上限、靈力上限 × 此倍率（-30%）
const WEAKNESS_STAT_MULT = 0.7;

// 心魔技能：
//   預設為傷害型，mult = 攻擊力倍率
//   type "drain" 會額外吸取玩家靈力（drain = 吸取最大靈力的比例）
//   type "buff"  會提升心魔自身攻擊力，持續 duration 回合
const heartDemonSkills = [
    { name: "心魔幻殺", mult: 1.8, msg: "心魔化作與你一模一樣的身影，【心魔幻殺】直取要害！" },
    { name: "蝕魂魔焰", mult: 1.6, msg: "心魔噴吐【蝕魂魔焰】，神識如遭萬蟻噬咬！" },
    { name: "魔念侵心", type: "drain", mult: 1.2, drain: 0.3, msg: "心魔施展【魔念侵心】，竊取你的靈力！" },
    { name: "魔影加身", type: "buff", mult: 1.5, duration: 3, msg: "心魔【魔影加身】，魔氣暴漲，攻勢更為凌厲！" }
];
