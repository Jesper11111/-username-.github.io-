// 靈獸（靈寵）設定：兌換費用、被動加成、等級與技能
//
// - 兌換後一律從 Lv1 開始，與人物共用經驗來源，但等級不可超過人物等級。
// - 靈寵沒有氣血，只負責協助（攻擊或輔助）；所有存活靈寵每回合都會各自判定出手。
// - 玩家死亡時所有靈寵立即死亡，每隻需消耗 BEAST_REVIVE_COST_CORE 獸丹復活。
// - 死亡的靈寵不提供被動加成、不出手、也不累積經驗。
const beastData = [
    // 被動加成實際生效處：stats.js 的 getBasePower()（戰力）、leveling.js 的 gainExp()（經驗）
    { id: "fox", name: "靈幻狐", costCore: 1000, costCoins: 10000, desc: "靈動可愛的靈狐，可增加經驗獲取速度 10%", passive: "經驗 +10%" },
    { id: "wolf", name: "青蒼狼", costCore: 3000, costCoins: 30000, desc: "兇猛的蒼狼，可提升角色戰力 15%", passive: "戰力 +15%" },
    { id: "dragon", name: "九幽蛟龍", costCore: 5000, costCoins: 50000, desc: "上古異種蛟龍，大幅提升戰力 30% 與經驗 20%", passive: "戰力 +30%、經驗 +20%" }
];

const BEAST_REVIVE_COST_CORE = 5000;

// 靈寵維持費：每隻「出戰中」（存活且未召回休息）的靈寵，每出戰滿 BEAST_UPKEEP_INTERVAL 秒扣一次，
// 費用依該靈寵的等級決定（maxLevel 以下適用該檔）。付不起時該靈寵自動召回休息，不再提供被動與協助。
const BEAST_UPKEEP_INTERVAL = 600;   // 10 分鐘
const beastUpkeepTiers = [
    { maxLevel: 99,       coins: 2000,  core: 50 },    // Lv100 以前
    { maxLevel: 299,      coins: 5000,  core: 100 },   // Lv300 以前
    { maxLevel: 499,      coins: 20000, core: 150 },   // Lv500 以前
    { maxLevel: Infinity, coins: 50000, core: 200 }    // Lv500 以後
];

// 靈寵在這些等級各開放 1 個技能欄（共 6 欄）
const BEAST_SKILL_LEVELS = [30, 60, 100, 300, 500, 1000];

// 每隻存活靈寵每回合施展技能的機率（施展哪一招由 beast-combat.js 的 pickBeastSkill 依戰況挑）
const BEAST_SKILL_CHANCE = 0.3;

// 同時出戰的靈寵上限（2026-09-29 使用者指定：只能一隻組隊；出戰另一隻時自動召回原本的，beast.js 的 toggleBeastActive）
const BEAST_ACTIVE_MAX = 1;

// 靈寵靈力（2026-09-29 使用者要求「寵物設定 MP，用完無法施放技能」；beast-combat.js）：
//   出戰靈寵 BEAST_MP_MAX 點，每回合回 BEAST_MP_REGEN（野外刷新等待期間每秒也回），施展技能扣該招的消耗（依領悟等級），不夠就不施展
const BEAST_MP_MAX = 100;
const BEAST_MP_REGEN = 5;
const BEAST_SKILL_MP_BY_LV = { 30: 10, 60: 15, 100: 20, 300: 25, 500: 30, 1000: 40 };

// 重新領悟：清空這隻靈寵已學的全部技能，重新挑選（2026-09-29 技能改版起開放）
const BEAST_SKILL_RESET_CORE = 2000;

// ==================== 靈寵技能（2026-09-29 改版：5 類 × 10 招，ARCHITECTURE.md 第 16 節）====================
// 舊版「五行 × 6 招、每欄五選一」已廢除；每個技能欄可從 50 招中任選一招（同一隻靈寵不能重複），
// minLv = 靈寵等級達到才能領悟。效果：
//   control 控制（施加在敵人身上）：freeze 凍結 N 回合（aoe 為全體）；silence 封印武學 N 回合（懸賞對手、心魔不能施展武學）；
//                                  weaken 敵人攻擊 −v N 回合；vuln 敵人受到的傷害 +v N 回合（破綻）
//            同一名敵人被靈寵凍結後，解凍後 BEAST_FREEZE_COOLDOWN 回合內不會再被靈寵凍結（避免多隻靈寵連鎖定死）
//   attack 攻擊：mult = 人物物理攻擊倍率；aoe 全體；burn／poison = 附加燒傷／中毒層數；execute = 目標氣血低於 30% 時傷害 ×2；
//                drain = 傷害的比例回復主人氣血；splash = 另外對全體造成物攻 × splash
//   buff 增益（施加在主人身上）：每招提升一種能力，不同種類可同時存在（多隻靈寵的增益可疊在一起），同種類取較高值
//                atk 攻擊 ×、reduce 受傷減少、def 減傷 +點、eva 閃避 +點、crit 暴擊率 +%、combo 連擊率 +%、hit 命中 +點、
//                lifesteal 吸血（造成傷害的比例）、armorPen 破甲 +點；effects 可同時給多種
//   heal 治療：heal 立即回復氣血、mp 立即回復靈力、regen 每回合回血 × turns、mpRegen 每回合回靈 × turns；
//              emergency = 主人氣血低於 40% 時改用 emergency 的回復量
//   cleanse 淨化（清除主人身上的負面狀態）：remove 清單 poison 中毒／burn 燒傷／freeze 凍結／silence 封印／weaken 化功／armor 破甲；
//              immune = 之後 N 回合內每回合自動清除 remove 內的狀態
const BEAST_FREEZE_COOLDOWN = 2;

const beastSkillCategories = {
    control: { name: "控制", icon: "🌀", color: "#a78bfa", desc: "凍結、封印、削弱敵人" },
    attack:  { name: "攻擊", icon: "⚔️", color: "#f87171", desc: "直接傷害敵人" },
    buff:    { name: "增益", icon: "✨", color: "#facc15", desc: "強化主人（不同種類可疊加）" },
    heal:    { name: "治療", icon: "💧", color: "#4ade80", desc: "回復主人氣血與靈力" },
    cleanse: { name: "淨化", icon: "🌸", color: "#38bdf8", desc: "解除主人身上的負面狀態" }
};

const beastSkills = [
    // ---- 控制 ----
    { id: "c1",  cat: "control", name: "寒霜凝氣", minLv: 30,   freeze: 1 },
    { id: "c2",  cat: "control", name: "纏藤縛",   minLv: 30,   weaken: 0.15, turns: 3 },
    { id: "c3",  cat: "control", name: "攝魂鈴",   minLv: 60,   silence: 2 },
    { id: "c4",  cat: "control", name: "石化凝視", minLv: 60,   weaken: 0.25, turns: 3 },
    { id: "c5",  cat: "control", name: "破綻印",   minLv: 100,  vuln: 0.20, turns: 3 },
    { id: "c6",  cat: "control", name: "亂心魔音", minLv: 100,  silence: 3 },
    { id: "c7",  cat: "control", name: "萬藤囚籠", minLv: 300,  freeze: 1, aoe: true },
    { id: "c8",  cat: "control", name: "玄冰封印", minLv: 300,  freeze: 2 },
    { id: "c9",  cat: "control", name: "天羅地網", minLv: 500,  weaken: 0.35, silence: 2, turns: 4 },
    { id: "c10", cat: "control", name: "時光凝滯", minLv: 1000, freeze: 2, aoe: true, vuln: 0.25, turns: 3 },
    // ---- 攻擊 ----
    { id: "a1",  cat: "attack", name: "利爪撕咬", minLv: 30,   mult: 0.30 },
    { id: "a2",  cat: "attack", name: "烈焰吐息", minLv: 30,   mult: 0.18, aoe: true },
    { id: "a3",  cat: "attack", name: "毒牙穿心", minLv: 60,   mult: 0.25, poison: 2 },
    { id: "a4",  cat: "attack", name: "雷光一閃", minLv: 60,   mult: 0.50 },
    { id: "a5",  cat: "attack", name: "焚天火雨", minLv: 100,  mult: 0.30, aoe: true, burn: 1 },
    { id: "a6",  cat: "attack", name: "獠牙斬首", minLv: 100,  mult: 0.55, execute: true },
    { id: "a7",  cat: "attack", name: "噬血狂咬", minLv: 300,  mult: 0.60, drain: 0.5 },
    { id: "a8",  cat: "attack", name: "裂地震爪", minLv: 300,  mult: 0.45, aoe: true },
    { id: "a9",  cat: "attack", name: "流星墜", minLv: 500,  mult: 0.90, burn: 2 },
    { id: "a10", cat: "attack", name: "萬獸奔騰", minLv: 1000, mult: 1.20, splash: 0.40 },
    // ---- 增益（每招不同種類，可疊加）----
    { id: "b1",  cat: "buff", name: "振奮長嘯", minLv: 30,   turns: 3, effects: { atk: 1.15 } },
    { id: "b2",  cat: "buff", name: "岩膚術",   minLv: 30,   turns: 3, effects: { reduce: 0.15 } },
    { id: "b3",  cat: "buff", name: "靈動身法", minLv: 60,   turns: 3, effects: { eva: 8 } },
    { id: "b4",  cat: "buff", name: "鐵壁護身", minLv: 60,   turns: 3, effects: { def: 10 } },
    { id: "b5",  cat: "buff", name: "鷹眼",     minLv: 100,  turns: 3, effects: { crit: 10 } },
    { id: "b6",  cat: "buff", name: "疾影連擊", minLv: 100,  turns: 3, effects: { combo: 12 } },
    { id: "b7",  cat: "buff", name: "洞明之眼", minLv: 300,  turns: 4, effects: { hit: 15 } },
    { id: "b8",  cat: "buff", name: "血祭",     minLv: 300,  turns: 4, effects: { lifesteal: 0.10 } },
    { id: "b9",  cat: "buff", name: "破軍之勢", minLv: 500,  turns: 4, effects: { armorPen: 20 } },
    { id: "b10", cat: "buff", name: "萬獸之王", minLv: 1000, turns: 4, effects: { atk: 1.30, reduce: 0.25, crit: 10 } },
    // ---- 治療 ----
    { id: "h1",  cat: "heal", name: "舔舐傷口", minLv: 30,   heal: 0.06 },
    { id: "h2",  cat: "heal", name: "靈泉滋潤", minLv: 30,   regen: 0.03, turns: 4 },
    { id: "h3",  cat: "heal", name: "聚靈回氣", minLv: 60,   mp: 0.10 },
    { id: "h4",  cat: "heal", name: "甘霖",     minLv: 60,   heal: 0.10, mp: 0.05 },
    { id: "h5",  cat: "heal", name: "春風化雨", minLv: 100,  regen: 0.05, turns: 4 },
    { id: "h6",  cat: "heal", name: "護主心切", minLv: 100,  heal: 0.08, emergency: 0.22 },
    { id: "h7",  cat: "heal", name: "靈氣灌注", minLv: 300,  mpRegen: 0.05, turns: 4 },
    { id: "h8",  cat: "heal", name: "妙手回春", minLv: 300,  heal: 0.15, regen: 0.04, turns: 3 },
    { id: "h9",  cat: "heal", name: "生生不息", minLv: 500,  heal: 0.25 },
    { id: "h10", cat: "heal", name: "鳳凰涅槃", minLv: 1000, heal: 0.35, mp: 0.20 },
    // ---- 淨化 ----
    { id: "p1",  cat: "cleanse", name: "清心訣",   minLv: 30,   remove: ["poison"] },
    { id: "p2",  cat: "cleanse", name: "驅火咒",   minLv: 30,   remove: ["burn"] },
    { id: "p3",  cat: "cleanse", name: "破冰",     minLv: 60,   remove: ["freeze"] },
    { id: "p4",  cat: "cleanse", name: "解咒",     minLv: 60,   remove: ["silence"] },
    { id: "p5",  cat: "cleanse", name: "滌塵",     minLv: 100,  remove: ["poison", "burn"] },
    { id: "p6",  cat: "cleanse", name: "破魔",     minLv: 100,  remove: ["weaken", "armor"] },
    { id: "p7",  cat: "cleanse", name: "百毒不侵", minLv: 300,  remove: ["poison", "burn"], immune: 3 },
    { id: "p8",  cat: "cleanse", name: "金剛心",   minLv: 300,  remove: ["freeze", "silence"], immune: 3 },
    { id: "p9",  cat: "cleanse", name: "萬法歸一", minLv: 500,  remove: ["poison", "burn", "freeze", "silence", "weaken", "armor"] },
    { id: "p10", cat: "cleanse", name: "淨世蓮華", minLv: 1000, remove: ["poison", "burn", "freeze", "silence", "weaken", "armor"], immune: 3, heal: 0.10 }
];
const beastSkillById = {};
beastSkills.forEach(s => { beastSkillById[s.id] = s; });

// 增益種類的顯示名稱（describeBeastSkill、戰況日誌）
const BEAST_BUFF_LABELS = {
    atk: "攻擊", reduce: "受傷減少", def: "減傷", eva: "閃避", crit: "暴擊率", combo: "連擊率",
    hit: "命中", lifesteal: "吸血", armorPen: "破甲"
};
const BEAST_DEBUFF_LABELS = { poison: "中毒", burn: "燒傷", freeze: "凍結", silence: "封印", weaken: "化功", armor: "破甲" };
