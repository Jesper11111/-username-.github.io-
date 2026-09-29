// 功德、陣營、善惡值與珍貴物資設定（邏輯見 merit.js；懸賞榜見 config-bounty.js／bounty.js）
// 流程：斬殺敵對陣營修士 → 功德 → 滿 MERIT_PER_BUTIAN_STONE 自動凝結七彩補天石 → 千寶閣珍貴物資（破障丹）

// ---- 陣營（正派／邪派）：依所屬宗門與學會的仙法判定（merit.js 的 getPlayerFaction）----
// 每個已拜入的宗門算 FACTION_SECT_WEIGHT 分、每招學會的仙法算 1 分，邪派分數高於正派才是邪派（同分算正派）
// 宗門的陣營寫在 config-sects.js 的 faction（沒寫 = 正）；仙法的陣營寫在 config-spells.js
const FACTION_SECT_WEIGHT = 5;

// ---- 善惡值：-KARMA_MAX ~ +KARMA_MAX，新角色 0 ----
// 殺邪派人士 → 善（+）；殺正派人士 → 惡（−）。介面只顯示「善／中立／惡」
const KARMA_MAX = 3000;
const KARMA_GOOD_THRESHOLD = 1000;     // ≥ 此值為「善」：邪派人士會潛入野外暗殺你
const KARMA_EVIL_THRESHOLD = -1000;    // ≤ 此值為「惡」：正派人士會進入野外獵殺你
const KARMA_PER_FIELD_KILL = 5;        // 野外隨機修士
const KARMA_PER_AMBUSH_KILL = 10;      // 前來暗殺／獵殺你的修士
// 懸賞榜人物的善惡值見 config-bounty.js 的 BOUNTY_RANKS[].karma

// ---- 野外修士：不是妖獸，只有機率出現（每一波判定一次，一波最多一名）----
// 需已解鎖「獵殺邪修」活動（config-activities.js 的 evil）
const FIELD_CULTIVATOR_WAVE_CHANCE = 0.05;   // 每波出現一名野外修士的機率（正道／魔道各半）
const FIELD_CULTIVATOR_POWER_MULT = 1.5;     // 氣血與攻擊力倍率（相對同地圖妖獸）
const FIELD_MERIT_MIN = 1;                   // 斬殺「敵對陣營」野外修士的功德（隨機 MIN ~ MAX）；同陣營不給功德
const FIELD_MERIT_MAX = 10;
const AMBUSH_WAVE_CHANCE = 0.04;             // 善／惡時，每波有此機率混入一名暗殺者
const AMBUSH_POWER_MULT = 3;                 // 暗殺者的氣血與攻擊力倍率
const CULTIVATOR_ICONS = { "正": "🧙", "邪": "🧛" };
// 野外修士在戰場實況的圖（battle-fx.js 的 getBattleFoeImg；沒有圖的陣營顯示上面的 emoji）；暗殺者用 AMBUSH_IMG（不分陣營）
// pos = 圖片裁切對準的位置（直式圖，對準臉部與上半身）
const CULTIVATOR_IMGS = {
    "正": { img: "images/monsters/righteous-cultivator.jpg", pos: "50% 28%" },   // 2026-09-29 玩家提供：持杖白髮老道立於城樓
    "邪": { img: "images/monsters/demonic-cultivator.jpg", pos: "50% 25%" }      // 2026-09-29 玩家提供：掌心黑焰、持骷爪法杖的魔道術士
};
const AMBUSH_IMG = { img: "images/monsters/assassin.jpg", pos: "50% 30%" };   // 2026-09-29 玩家提供：黑甲持弩、爪刃的白髮殺手立於城樓
const AMBUSH_ICON = "🥷";

// ---- 七彩補天石：功德滿 MERIT_PER_BUTIAN_STONE 自動凝結一顆（merit.js 的 settleMeritStones）----
const MERIT_PER_BUTIAN_STONE = 30000;
const BREAK_PILL_STONE_COST = 1;      // 千寶閣：1 顆破障丹需要幾顆七彩補天石（2026-09-29 使用者指定由 5 改 1）

// ---- 破障丹效果（渡劫時自動服用 1 顆，見 tribulation.js）----
const BREAK_PILL_DEMON_POWER_MULT = 0.9;   // 心魔戰力 -10%
const BREAK_PILL_CHANCE_BONUS = 0.10;      // 渡劫勝算 +10%
const BREAK_PILL_MAX_CHANCE = 0.90;        // 服用後勝算上限由 80% 提高到 90%

// 珍貴道具的顯示資料（背包、千寶閣共用；外觀為七彩發光）
const preciousItems = {
    butianStone: { name: "七彩補天石", icon: "💎", desc: `女媧補天遺落的奇石，七彩流轉。身上功德每滿 ${MERIT_PER_BUTIAN_STONE.toWan()} 自動凝結一顆，可於千寶閣購買珍貴物資。` },
    breakPill:   { name: "破障丹",     icon: "🔮", desc: "渡劫時自動服用 1 顆：心魔戰力 -10%，渡劫勝算 +10%（上限由 80% 提高到 90%）。" }
};
