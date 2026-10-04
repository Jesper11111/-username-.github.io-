// 稱號（ARCHITECTURE.md 第 37 節）：50 個＋6 個帝級職業成就＋4 個賭運（第 40 節）＋5 個守城（第 49 節），達成後永久保留、加成全部疊加；可選一個顯示在道號旁
// 判定與介面在 codex.js。bonus 的 key 同 gear.js 的 getBonusTotals：
//   statPct 四維 %、atkPct 攻擊 %、hpPct 氣血 %、def/eva/ice/… 百分點、fx:特效名（聚財 靈石、悟道 修為、積德 功德、法爆 技能傷害…）、
//   elemDmg:五行 本命五行為該五行時傷害 %、enhanceChance 強化成功率
// cond.type：
//   codex（收藏 N 種）、codexAll（全收，不含尚未開放的秘境）、codexPlatinumAll（全收白金）、
//   category／slot／element（該分類全收）、quality（收藏該品級 N 種）、wearPlatinum（同時穿 N 件白金）、
//   enhance（強化到 +N）、ironUsed（累計用掉 N 星允鐵）、realm（境界 index）、sect（宗門階段＋境界）、karma、bountyKills、profRank（職業 id 達 N 階）
//   sect 稱號的名稱會自動帶上目前的宗門名（{sect}）
//   賭運（player.casino）：casinoStones（累計切石 N 顆）、casinoFire（切出整朵異火 N 次）、casinoTriple（押中指定豹子 N 次）、casinoBigWin（擲骰單把淨贏 ≥ N）
//   defenseWave（秘境「魔屠天南」歷史最高守住 N 波，player.defenseBest，第 49 節）
//   wboss（世界 Boss 名次稱號，player.wboss.titles 含 value，第 75 節；純外觀）
//   bpCount／bpTier／bpPlatinum（圖紙器錄，codex.js，第 55 節）

const titleList = [
    // ---- 圖紙器錄（7，2026-09-28，第 55 節）：cond bpCount（點亮格數）、bpTier（某檔 17 部位全收）、bpPlatinum（白金格數）----
    { id: "bp17",      name: "天工初成", cond: { type: "bpCount", value: 17 },     bonus: { statPct: 0.01 } },
    { id: "bpTier1500", name: "渡劫神兵", cond: { type: "bpTier", value: 1500 },   bonus: { atkPct: 0.01 } },
    { id: "bp60",      name: "百工造化", cond: { type: "bpCount", value: 60 },     bonus: { hpPct: 0.02 } },
    { id: "bpTier5000", name: "真仙寶庫", cond: { type: "bpTier", value: 5000 },   bonus: { atkPct: 0.02 } },
    { id: "bpTier10000", name: "道祖神兵", cond: { type: "bpTier", value: 10000 }, bonus: { statPct: 0.02 } },
    { id: "bpAll",     name: "萬器天工", cond: { type: "bpCount", value: 119 },    bonus: { atkPct: 0.03 } },
    { id: "bpPlat17",  name: "先天道器師", cond: { type: "bpPlatinum", value: 17 }, bonus: { "fx:法爆": 0.03 } },
    // ---- 收藏（8）----
    { id: "codex50",   name: "初窺天磯", cond: { type: "codex", value: 50 },   bonus: { statPct: 0.01 } },
    { id: "codex100",  name: "識器之人", cond: { type: "codex", value: 100 },  bonus: { "fx:聚財": 0.02 } },
    { id: "codex200",  name: "藏器小成", cond: { type: "codex", value: 200 },  bonus: { statPct: 0.01 } },
    { id: "codex350",  name: "百器通明", cond: { type: "codex", value: 350 },  bonus: { hpPct: 0.02 } },
    { id: "codex500",  name: "萬寶歸宗", cond: { type: "codex", value: 500 },  bonus: { atkPct: 0.02 } },
    { id: "codex700",  name: "天磯半卷", cond: { type: "codex", value: 700 },  bonus: { statPct: 0.01 } },
    { id: "codexAll",  name: "天磯大成", cond: { type: "codexAll" },            bonus: { atkPct: 0.02 } },
    { id: "codexPlat", name: "天磯錄主", cond: { type: "codexPlatinumAll" },    bonus: { statPct: 0.03 } },
    // ---- 分類與部位（9）----
    { id: "catWeapon",    name: "百兵之主", cond: { type: "category", value: "weapon" },    bonus: { atkPct: 0.02 } },
    { id: "catArmor",     name: "金剛不壞", cond: { type: "category", value: "armor" },     bonus: { def: 1 } },
    { id: "catAccessory", name: "琳瑯仙客", cond: { type: "category", value: "accessory" }, bonus: { eva: 1 } },
    { id: "slotSword", name: "劍痴",     cond: { type: "slot", value: "劍" }, bonus: { metal: 1 } },
    { id: "slotBlade", name: "刀狂",     cond: { type: "slot", value: "刀" }, bonus: { fire: 1 } },
    { id: "slotFan",   name: "扇底風流", cond: { type: "slot", value: "扇" }, bonus: { ice: 1 } },
    { id: "slotBow",   name: "穿楊神射", cond: { type: "slot", value: "弓" }, bonus: { thunder: 1 } },
    { id: "slotFlute", name: "笛韻清心", cond: { type: "slot", value: "笛" }, bonus: { sprPct: 0.03 } },
    { id: "slotBrush", name: "妙筆生花", cond: { type: "slot", value: "筆" }, bonus: { poison: 1 } },
    // ---- 五行（5）----
    { id: "elemMetal", name: "庚金劍主", cond: { type: "element", value: "金" }, bonus: { "elemDmg:金": 0.02 } },
    { id: "elemWood",  name: "乙木長青", cond: { type: "element", value: "木" }, bonus: { "elemDmg:木": 0.02 } },
    { id: "elemWater", name: "玄水真人", cond: { type: "element", value: "水" }, bonus: { "elemDmg:水": 0.02 } },
    { id: "elemFire",  name: "離火尊者", cond: { type: "element", value: "火" }, bonus: { "elemDmg:火": 0.02 } },
    { id: "elemEarth", name: "戊土山君", cond: { type: "element", value: "土" }, bonus: { "elemDmg:土": 0.02 } },
    // ---- 品級與強化（9）----
    { id: "purple200", name: "紫氣東來", cond: { type: "quality", value: "紫色", count: 200 }, bonus: { "fx:法爆": 0.02 } },
    { id: "orange200", name: "橙光耀世", cond: { type: "quality", value: "橙色", count: 200 }, bonus: { statPct: 0.01 } },
    { id: "plat1",     name: "先天道成", cond: { type: "quality", value: "白金", count: 1 },   bonus: { atkPct: 0.02 } },
    { id: "plat50",    name: "道器通玄", cond: { type: "quality", value: "白金", count: 50 },  bonus: { statPct: 0.02 } },
    { id: "enh10",     name: "初試鋒芒", cond: { type: "enhance", value: 10 }, bonus: { "fx:聚財": 0.01 } },
    { id: "enh15",     name: "百鍊成鋼", cond: { type: "enhance", value: 15 }, bonus: { def: 1 } },
    { id: "enh20",     name: "千錘萬鍊", cond: { type: "enhance", value: 20 }, bonus: { atkPct: 0.02 } },
    { id: "wearPlat5", name: "道器加身", cond: { type: "wearPlatinum", value: 5 }, bonus: { statPct: 0.02 } },
    { id: "iron10000", name: "天工開物", cond: { type: "ironUsed", value: 10000 }, bonus: { enhanceChance: 0.03 } },
    // ---- 修為境界（10）----
    { id: "realm2",  name: "築基修士", cond: { type: "realm", value: 2 },  bonus: { "fx:悟道": 0.01 } },
    { id: "realm3",  name: "結丹真人", cond: { type: "realm", value: 3 },  bonus: { hpPct: 0.01 } },
    { id: "realm4",  name: "元嬰老祖", cond: { type: "realm", value: 4 },  bonus: { "fx:悟道": 0.01 } },
    { id: "realm5",  name: "化神尊者", cond: { type: "realm", value: 5 },  bonus: { atkPct: 0.01 } },
    { id: "realm7",  name: "合體道君", cond: { type: "realm", value: 7 },  bonus: { "fx:悟道": 0.01 } },
    { id: "realm8",  name: "大乘天尊", cond: { type: "realm", value: 8 },  bonus: { hpPct: 0.01 } },
    { id: "realm10", name: "飛升仙人", cond: { type: "realm", value: 10 }, bonus: { "fx:悟道": 0.01 } },
    { id: "realm11", name: "逍遙天仙", cond: { type: "realm", value: 11 }, bonus: { atkPct: 0.01 } },
    { id: "realm13", name: "大羅金仙", cond: { type: "realm", value: 13 }, bonus: { statPct: 0.01 } },
    { id: "realm15", name: "混沌道祖", cond: { type: "realm", value: 15 }, bonus: { statPct: 0.02 } },
    // ---- 宗門職位（6）：名稱帶目前宗門，例「蜀山劍派太上長老」----
    { id: "sectOuter",  name: "{sect}外門弟子", cond: { type: "sect", tier: 1, realm: 0 }, bonus: { "fx:法爆": 0.01 } },
    { id: "sectInner",  name: "{sect}內門弟子", cond: { type: "sect", tier: 1, realm: 2 }, bonus: { "fx:悟道": 0.01 } },
    { id: "sectCore",   name: "{sect}真傳弟子", cond: { type: "sect", tier: 2, realm: 3 }, bonus: { "fx:法爆": 0.01 } },
    { id: "sectDeacon", name: "{sect}執事長老", cond: { type: "sect", tier: 2, realm: 4 }, bonus: { "fx:聚財": 0.01 } },
    { id: "sectElder",  name: "{sect}長老",     cond: { type: "sect", tier: 3, realm: 5 }, bonus: { "fx:法爆": 0.02 } },
    { id: "sectGrand",  name: "{sect}太上長老", cond: { type: "sect", tier: 3, realm: 8 }, bonus: { statPct: 0.02 } },
    // ---- 其他（3）----
    { id: "karmaGood", name: "正道楷模", cond: { type: "karma", value: "good" }, bonus: { "fx:積德": 0.05 } },
    { id: "karmaEvil", name: "魔道巨擘", cond: { type: "karma", value: "evil" }, bonus: { atkPct: 0.01 } },
    { id: "bounty50",  name: "賞金獵人", cond: { type: "bountyKills", value: 50 }, bonus: { "fx:積德": 0.05 } },
    // ---- 帝級職業成就（6，另加）----
    { id: "profSword", name: "劍帝", cond: { type: "profRank", value: "sword", rank: 10 }, bonus: { atkPct: 0.02 } },
    { id: "profBlade", name: "刀皇", cond: { type: "profRank", value: "blade", rank: 10 }, bonus: { atkPct: 0.02 } },
    { id: "profFan",   name: "風帝", cond: { type: "profRank", value: "fan",   rank: 10 }, bonus: { atkPct: 0.02 } },
    { id: "profBow",   name: "弓帝", cond: { type: "profRank", value: "bow",   rank: 10 }, bonus: { atkPct: 0.02 } },
    { id: "profFlute", name: "樂帝", cond: { type: "profRank", value: "flute", rank: 10 }, bonus: { atkPct: 0.02 } },
    { id: "profBrush", name: "符祖", cond: { type: "profRank", value: "brush", rank: 10 }, bonus: { atkPct: 0.02 } },
    // ---- 賭運（天星賭坊，casino.js，4）----
    { id: "casinoStone100", name: "賭石大家", cond: { type: "casinoStones", value: 100 },      bonus: { "fx:聚財": 0.02 } },
    { id: "casinoFire",     name: "天選之人", cond: { type: "casinoFire", value: 1 },          bonus: { "fx:奪寶": 0.10 } },
    { id: "casinoTriple",   name: "豹子頭",   cond: { type: "casinoTriple", value: 1 },        bonus: { statPct: 0.01 } },
    { id: "casinoBigWin",   name: "一擲千金", cond: { type: "casinoBigWin", value: 100000000 }, bonus: { "fx:聚財": 0.02 } },
    // ---- 魔屠天南・死守天南城（5，2026-09-27）----
    { id: "defense10",  name: "天南守卒",   cond: { type: "defenseWave", value: 10 },  bonus: { def: 1 } },
    { id: "defense30",  name: "天南守將",   cond: { type: "defenseWave", value: 30 },  bonus: { atkPct: 0.01 } },
    { id: "defense50",  name: "鎮城仙將",   cond: { type: "defenseWave", value: 50 },  bonus: { hpPct: 0.02 } },
    { id: "defense80",  name: "魔屠天南",   cond: { type: "defenseWave", value: 80 },  bonus: { atkPct: 0.02 } },
    { id: "defense100", name: "天南城守護神", cond: { type: "defenseWave", value: 100 }, bonus: { statPct: 0.03 } },
    // ---- 世界 Boss（3，2026-10-04，第 75 節）：純外觀、沒有數值加成（使用者選「排名只給外觀」）；cond wboss＝player.wboss.titles 含該 id（領獎時依名次寫入）----
    { id: "wbTop1",    name: "誅天第一",   cond: { type: "wboss", value: "wbTop1" },    bonus: {} },
    { id: "wbTop10",   name: "誅魔先鋒",   cond: { type: "wboss", value: "wbTop10" },   bonus: {} },
    { id: "wbLastHit", name: "斬魔一擊",   cond: { type: "wboss", value: "wbLastHit" }, bonus: {} }
];
