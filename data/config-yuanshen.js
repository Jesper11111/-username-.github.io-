// 元神（ARCHITECTURE.md 第 65 節）；邏輯在 yuanshen.js
// 2026-10-02 使用者設計：先天體質＋先天靈根達標者，學「元嬰化神法」凝聚元神。
//   神體＋至尊靈根 → 天元神：修為速度 +50%、偏好屬性傷害 +30%
//   道體＋特殊靈根 → 地元神：修為速度 +20%、偏好屬性傷害 +10%
//   沒有達標組合（例：神體＋特殊靈根、道體＋至尊靈根）＝沒有元神。種類依體質分（神體 6 種、道體 6 種）。
//   體質與靈根原有的能力照常生效（本來就各自計算）。
//   凝聚後：資質鎖定（洗髓／伐骨不能重測、仙府賜予資質不再接受）；金丹與元嬰加成照常保留（使用者原先要「消失」，同日改為全部保留）；轉世時元神清空、要重新凝聚。
//   偏好屬性：五行（金木水火土）＝本命五行鎖定為該屬性，自己造成的直接傷害 ×(1+dmg)、火另含燒傷；雷＝雷擊觸發時 ×(1+dmg)；風＝風擊追加的那一擊 ×(1+dmg)。
//   傷害是獨立倍率（不進增益池，不受 +200% 上限影響）；修為速度走 getBonusTotals 的 fx:悟道（進增益池）。

const YUANSHEN_MIN_REALM = 4;   // 元嬰期以上才能學元嬰化神法（realms[4]）

// 凝聚所需材料（使用者指定）：化神訣殘本 1 萬＋破障丹、洗髓丹、伐骨丹、化神靈果各 5
const YUANSHEN_COST = [
    { key: "huashenScrolls", name: "化神訣殘本", icon: "📖", n: 10000 },
    { key: "breakPills",     name: "破障丹",     icon: "🔮", n: 5 },
    { key: "rootPills",      name: "洗髓丹",     icon: "🧪", n: 5 },
    { key: "physiquePills",  name: "伐骨丹",     icon: "🦴", n: 5 },
    { key: "spiritFruits",   name: "化神靈果",   icon: "🍑", n: 5 }
];

// 天／地：rootGroup＝先天靈根組（config-aptitude.js 的 APTITUDE_ROOT_GROUPS id）、physGrade＝先天體質組
const YUANSHEN_TIERS = {
    heaven: { name: "天元神", rootGroup: "supreme", physGrade: "神體", cultivate: 0.5, dmg: 0.3, color: "#f472b6", rainbow: true },
    earth:  { name: "地元神", rootGroup: "special", physGrade: "道體", cultivate: 0.2, dmg: 0.1, color: "#60a5fa" }
};

// 12 種元神（key＝先天體質 id）：elem＝五行偏好、affix＝雷（thunder）或風（wind）偏好；名稱與屬性對應為我暫定，使用者可改
const YUANSHEN_TYPES = {
    // 天元神（神體）
    holyBody:    { tier: "heaven", name: "庚金天元神", icon: "⚔️", elem: "金" },
    daoBody:     { tier: "heaven", name: "乙木天元神", icon: "🌿", elem: "木" },
    doublePupil: { tier: "heaven", name: "癸水天元神", icon: "💧", elem: "水" },
    tyrantBody:  { tier: "heaven", name: "丙火天元神", icon: "🔥", elem: "火" },
    supremeBone: { tier: "heaven", name: "戊土天元神", icon: "⛰️", elem: "土" },
    chaosBody:   { tier: "heaven", name: "混沌天元神", icon: "🌀", affix: "thunder" },
    // 地元神（道體）
    swordBody:   { tier: "earth", name: "劍心地元神", icon: "🗡️", elem: "金" },
    bladeBody:   { tier: "earth", name: "刀魄地元神", icon: "🔪", elem: "火" },
    fanBody:     { tier: "earth", name: "風靈地元神", icon: "🌪️", affix: "wind" },
    bowBody:     { tier: "earth", name: "神目地元神", icon: "🏹", elem: "木" },
    fluteBody:   { tier: "earth", name: "天籟地元神", icon: "🎶", elem: "水" },
    brushBody:   { tier: "earth", name: "符籙地元神", icon: "🖌️", affix: "thunder" }
};
const YUANSHEN_AFFIX_LABELS = { thunder: "⚡雷", wind: "🌪️風" };

// ---- 元神視覺特效（2026-10-02 使用者「全部都做」：洞府頭像光環、戰場元神虛影、出手飄字、專屬頭像框）----
// 偏好屬性 → 顏色（洞府頭像光環、戰場虛影用 CSS 變數 --ysc）、飄字圖示、專屬頭像框 id
const YUANSHEN_FX = {
    "金": { color: "#facc15", icon: "⚔️", frame: "ys-metal" },
    "木": { color: "#4ade80", icon: "🌿", frame: "ys-wood" },
    "水": { color: "#38bdf8", icon: "💧", frame: "ys-water" },
    "火": { color: "#f87171", icon: "🔥", frame: "ys-fire" },
    "土": { color: "#f59e0b", icon: "⛰️", frame: "ys-earth" },
    thunder: { color: "#a78bfa", icon: "⚡", frame: "ys-thunder" },
    wind:    { color: "#5eead4", icon: "🌪️", frame: "ys-wind" }
};

// 化神訣殘本（新道具，player.huashenScrolls）
const HUASHEN_SCROLL = { name: "化神訣殘本", icon: "📖", desc: "記載「元嬰化神法」的殘頁。集滿 1 萬頁，配合破障丹、洗髓丹、伐骨丹、化神靈果各 5，可凝聚元神（人物面板「元神」）。" };

// 殘本來源（使用者同意的方案：認真玩約 3～4 週集滿，平均每天約 350 頁）
const HUASHEN_SCROLL_DROPS = {
    zhenmo: [30, 80], zhenmoGate10Mult: 2,            // 鎮魔塔擊敗 BOSS，樓主層（個位數 0）加倍
    defenseChance: 0.3, defense: [3, 8], defenseBoss: [20, 40],   // 魔屠天南：每守住一波 30% 掉 3～8，首領波必掉 20～40
    encounter: [50, 150],                             // 奇遇・異界空間每次結算
    bounty: { tian: 40, di: 25, ren: 15 },            // 懸賞伏誅
    dailyAll: 50,                                     // 每日任務一輪 10 項全部領完
    fieldMinRealm: 5, fieldChance: 0.005, field: [1, 3]   // 野外：適合境界化神以上的地圖，每隻 0.5% 掉 1～3
};
