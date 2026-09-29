// 丹田、金丹、元嬰（ARCHITECTURE.md 第 54 節，邏輯在 golden-core.js；2026-09-27 使用者設計）
// 築基期累積「丹田」→ 渡劫進金丹時依丹田決定金丹品級（影響氣血與靈力上限）；
// 金丹期累積「溫養」→ 渡劫進元嬰時依金丹品級＋溫養決定元嬰品級（影響術法傷害與化神渡劫勝算）。
// 存檔：player.goldenCore = { dantian, core, nurture, infant }（dantian／nurture 0～1；core 0～4、infant 0～8，null = 尚未凝結）

// ---- 累積 ----
// 築基期（金丹期）獲得的修為按比例灌入丹田（溫養）：修完整個境界所需的修為 = CORE_FILL_PER_REALM（50%）
// 10 階圓滿待渡劫時，原本被浪費的修為也照同一比例灌入（多練越久，品級越好）
const CORE_FILL_PER_REALM = 0.5;
const CORE_FILL_REALM = 2;      // 築基期累積丹田
const NURTURE_FILL_REALM = 3;   // 金丹期累積溫養

// 凝元丹（煉丹房）：丹田／溫養各 +5%
const CORE_PILL = { name: "凝元丹", gain: 0.05, herb: "high", herbName: "上品靈草", herbCost: 5, coins: 10000 };

// ---- 金丹品級（進金丹時依丹田決定）----
// minFill：丹田門檻；hpMpPct：氣血與靈力上限加成
const CORE_GRADES = [
    { name: "下品金丹", minFill: 0,    hpMpPct: 0,    color: "#9ca3af" },
    { name: "中品金丹", minFill: 0.5,  hpMpPct: 0.10, color: "#4ade80" },
    { name: "上品金丹", minFill: 0.75, hpMpPct: 0.20, color: "#60a5fa" },
    { name: "極品金丹", minFill: 1,    hpMpPct: 0.35, color: "#c084fc" },
    { name: "超品金丹", minFill: 1,    hpMpPct: 0.50, color: "#f472b6", rainbow: true }   // 丹田滿時再擲 getSuperCoreChance()
];
// 丹田 100% 時成「超品」的機率：基礎＋先天資質加成（靈根組、體質等級）
const SUPER_CORE_CHANCE = {
    base: 0.10,
    root: { heaven: 0.10, variant: 0.10, special: 0.20, supreme: 0.40 },
    physique: { "道體": 0.10, "神體": 0.30 }
};

// ---- 元嬰品級（進元嬰時依金丹品級＋溫養決定）----
// 金丹品級 → 起點（INFANT_BASE_BY_CORE），溫養 ≥ 50% 再 +1、100% 再 +2：下品只能成人元嬰，超品必成天元嬰
const INFANT_BASE_BY_CORE = [0, 2, 3, 5, 6];
const NURTURE_STEPS = [0.5, 1];
// magPct：術法傷害加成；trib：化神（元嬰 → 化神）渡劫勝算
const INFANT_GRADES = [
    { name: "人元嬰・下", tier: "人元嬰", magPct: 0,    trib: -0.10, color: "#9ca3af" },
    { name: "人元嬰・中", tier: "人元嬰", magPct: 0.05, trib: -0.10, color: "#9ca3af" },
    { name: "人元嬰・上", tier: "人元嬰", magPct: 0.10, trib: -0.10, color: "#9ca3af" },
    { name: "地元嬰・下", tier: "地元嬰", magPct: 0.15, trib: 0,     color: "#60a5fa" },
    { name: "地元嬰・中", tier: "地元嬰", magPct: 0.20, trib: 0,     color: "#60a5fa" },
    { name: "地元嬰・上", tier: "地元嬰", magPct: 0.25, trib: 0,     color: "#60a5fa" },
    { name: "天元嬰・下", tier: "天元嬰", magPct: 0.35, trib: 0.10,  color: "#f472b6", rainbow: true },
    { name: "天元嬰・中", tier: "天元嬰", magPct: 0.45, trib: 0.10,  color: "#f472b6", rainbow: true },
    { name: "天元嬰・上", tier: "天元嬰", magPct: 0.60, trib: 0.10,  color: "#f472b6", rainbow: true }
];
const INFANT_TIER_DESC = {
    "天元嬰": "最頂級的元嬰，戰力極強、同階無敵，未來化神機率極高。",
    "地元嬰": "中等元嬰，名門正派天才弟子的標準配置，戰力穩健。",
    "人元嬰": "最普通的元嬰，根基不穩，戰力在同階中墊底，化神艱難。"
};
// 成天元嬰時的天地異象（隨機一則寫進日誌）
const INFANT_OMENS = ["紫氣東來三萬里", "萬獸朝蒼、群山低首", "天降祥雲、仙樂齊鳴", "九天星斗為之一暗", "金蓮自地湧出、異香滿山"];

// ---- 天材地寶：化神靈果（千寶閣珍貴物資，七彩補天石購買）----
// 持有時渡劫化神（元嬰 → 化神）自動服用 1 顆，勝算 +10%（可抵銷人元嬰的 −10%）
const SPIRIT_FRUIT = { name: "化神靈果", icon: "🍑", stoneCost: 1, trib: 0.10, realmIndex: 4,   // stoneCost 2026-09-29 使用者指定由 3 改 1
    desc: "千年一熟的天材地寶。元嬰期渡劫化神時自動服用 1 顆：化神勝算 +10%（可抵銷人元嬰的根基不穩）。" };

// 已超過金丹／元嬰的老玩家（2026-09-27 使用者選「補發中等」）：金丹期以上補發中品金丹、元嬰期以上補發地元嬰・中
const LEGACY_CORE_GRADE = 1;
const LEGACY_INFANT_GRADE = 4;
