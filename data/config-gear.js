// 裝備系統設定（ARCHITECTURE.md 第 37 節）：取得管道、四維模板、特效說明、白金品級
// 850 種裝備的清單在 config-gear-catalog.js（由 tools\csv-to-js.ps1 產生），邏輯在 gear.js

// 取得管道：可製作（依鍛造等級決定是哪個宗門階段的清單）與外界（奪寶／拍賣／秘境）
//   minLevel/maxLevel：可製作管道對應的鍛造等級範圍（EQUIP_LEVELS 落在哪一段就從哪一段的清單抽）
//   external：外界裝備四維 × GEAR_EXTERNAL_MULT
//   locked：尚未開放的管道（秘境），天磯錄顯示「尚未開放」
const GEAR_CHANNELS = {
    craft1:  { label: "可製作・凡俗宗門", short: "凡俗宗門", minLevel: 10,  maxLevel: 100 },
    craft2:  { label: "可製作・修真宗門", short: "修真宗門", minLevel: 200, maxLevel: 500 },
    craft3:  { label: "可製作・至高宗門", short: "至高宗門", minLevel: 700, maxLevel: 1000 },
    loot:    { label: "外界・奪寶", short: "奪寶", external: true },
    auction: { label: "外界・拍賣", short: "拍賣", external: true },
    realm:   { label: "外界・秘境", short: "秘境", external: true }   // 2026-09-27 解鎖：秘境「魔屠天南」掉落（defense.js，第 49 節）
};
const GEAR_EXTERNAL_MULT = 1.15;

// 四維模板：每種裝備挑一種，係數合計 2.0（= 舊版武器力量＋靈力、防具體質 ×2 的總量）
//   實際點數 = 基數（裝備等級 × 5 × 品級倍率）× 係數；飾品再 × GEAR_ACCESSORY_BUDGET（舊版飾品總量 2.5）
const GEAR_TEMPLATES = {
    "均衡": { str: 0.5, int: 0.5, con: 0.5, spr: 0.5 },
    "剛猛": { str: 1.6, con: 0.4 },
    "玄妙": { int: 1.6, spr: 0.4 },
    "厚重": { con: 1.6, str: 0.4 },
    "靈動": { spr: 1.2, int: 0.8 },
    "剛柔": { str: 1.0, con: 1.0 },
    "法體": { int: 1.0, con: 1.0 },
    "雅致": { int: 1.0, cha: 1.0 }
};
const GEAR_ACCESSORY_BUDGET = 1.25;

// 主詞條：武器的屬性傷害跟著五行（取代舊版隨機）；盔甲減傷 × GEAR_ARMOR_DEF_MULT
const GEAR_ELEMENT_AFFIX = { "金": "metal", "木": "poison", "水": "ice", "火": "fire", "土": "thunder" };
const GEAR_ARMOR_DEF_MULT = 1.5;

// 奪寶掉落（只掉「奪寶」清單的裝備，gear.js 的 tryLootDrop）：chance 為掉落機率（×「奪寶」特效），odds 為品級分布
//   裝備等級 = 不超過人物等級的最高 EQUIP_LEVELS（最低 10）；背包滿時的去向見 enhance.js 的 receiveLootEquip
const LOOT_DROP = {
    cultivator: { chance: 0.03, odds: { "白色": 0.30, "綠色": 0.30, "藍色": 0.25, "紫色": 0.15 } },   // 野外修士（敵對陣營）
    ambush:     { chance: 0.10, odds: { "藍色": 0.50, "紫色": 0.40, "橙色": 0.10 } },                 // 暗殺者
    ren:        { chance: 1,    odds: { "藍色": 0.60, "紫色": 0.35, "橙色": 0.05 } },                 // 懸賞伏誅・人榜
    di:         { chance: 1,    odds: { "紫色": 0.70, "橙色": 0.30 } },                               // 懸賞伏誅・地榜
    tian:       { chance: 1,    odds: { "橙色": 1 } },                                                // 懸賞伏誅・天榜
    casinoPurple: { chance: 1,  odds: { "紫色": 1 } },                                                // 天星賭坊・切出紫裝（casino.js）
    casinoOrange: { chance: 1,  odds: { "橙色": 1 } }                                                 // 天星賭坊・切出橙裝
};

// 第六品級：白金（先天道器）。只能由橙色 +20 進化（強化系統上線後開放），不在 equipQualities 內
// → 不會出現在依品級批次刪除、鍛造、千寶閣的品質抽選中
const PLATINUM_QUALITY = { name: "白金", label: "白金・先天道器", mult: 12, color: "#e5e7eb", def: 5, eva: 4, affix: 13 };

// 特效（每種裝備 1 個，紫色以上生效）：value 為紫色數值，橙 × 1.5、白金 × 2；同名特效多件相加，最多到 cap
//   fmt：pct = 比例（0.08 → 8%）、pt = 百分點（10 → 10%）、x = 倍率（0.6 → ×0.6）；desc 內的 {v} 換成實際數值
//   效果實作在 gear.js 的 getGearEffects() 與各呼叫處（combat.js、elements.js…），見第 37 節特效表
const GEAR_EFFECT_TIER_MULT = { "紫色": 1, "橙色": 1.5, "白金": 2 };
const gearEffects = {
    "追擊": { value: 0.08, cap: 0.30, fmt: "pct", desc: "{v} 機率追加一次攻擊 ×0.6" },
    "破甲": { value: 10,   cap: 40,   fmt: "pt",  desc: "攻擊時無視目標 {v} 減傷" },
    "吸血": { value: 0.03, cap: 0.15, fmt: "pct", desc: "造成傷害的 {v} 轉為氣血" },
    "噬魂": { value: 0.03, cap: 0.15, fmt: "pct", desc: "擊殺敵人時回復 {v} 氣血" },
    "橫掃": { value: 0.10, cap: 0.35, fmt: "pct", desc: "普攻 {v} 機率波及其他敵人 ×0.4" },
    "首擊": { value: 0.25, cap: 1.00, fmt: "pct", desc: "每波戰鬥第一擊傷害 +{v}" },
    "法爆": { value: 0.05, cap: 0.30, fmt: "pct", desc: "技能傷害 +{v}" },
    "剋敵": { value: 0.08, cap: 0.40, fmt: "pct", desc: "五行剋制時傷害再 +{v}" },
    "斬殺": { value: 0.20, cap: 0.80, fmt: "pct", desc: "對氣血低於 20% 的敵人傷害 +{v}" },
    "疾風": { value: 0.05, cap: 0.20, fmt: "pct", desc: "{v} 機率本回合再出手一次" },
    "燃魂": { value: 0.08, cap: 0.40, fmt: "pct", desc: "氣血高於 80% 時傷害 +{v}" },
    "洞察": { value: 5,    cap: 20,   fmt: "pt",  desc: "無視敵人 {v} 閃避" },
    "聚靈": { value: 0.08, cap: 0.40, fmt: "pct", desc: "技能耗魔 -{v}" },
    "寒徹": { value: 0.10, cap: 0.50, fmt: "pct", desc: "對凍結中的敵人傷害 +{v}" },
    "冰封": { value: 0.30, cap: 0.80, fmt: "pct", desc: "凍結敵人時 {v} 機率擴散到另一名敵人" },
    "焚燼": { value: 0.20, cap: 1.00, fmt: "pct", desc: "燒傷傷害 +{v}" },
    "蝕骨": { value: 0.20, cap: 1.00, fmt: "pct", desc: "中毒傷害 +{v}" },
    "毒爆": { value: 1.0,  cap: 4.0,  fmt: "x",   desc: "中毒疊滿時引爆，造成攻擊力 {v} 傷害" },
    "連雷": { value: 0.5,  cap: 1.5,  fmt: "x",   desc: "雷擊時再劈另一名敵人 {v}" },
    "反震": { value: 0.08, cap: 0.40, fmt: "pct", desc: "受到攻擊時反彈 {v} 傷害" },
    "護體": { value: 8,    cap: 30,   fmt: "num", desc: "氣血低於 30% 時防禦 +{v}" },
    "先手盾": { value: 10, cap: 30,   fmt: "num", desc: "每波戰鬥前 2 回合防禦 +{v}" },
    "回春": { value: 0.01, cap: 0.05, fmt: "pct", desc: "戰鬥中每回合回復 {v} 氣血" },
    "回靈": { value: 0.015, cap: 0.075, fmt: "pct", desc: "戰鬥中每回合回復 {v} 靈力" },
    "定神": { value: 0.15, cap: 0.60, fmt: "pct", desc: "被凍結機率 -{v}" },
    "閃擊": { value: 0.8,  cap: 2.4,  fmt: "x",   desc: "閃避後反擊一次 {v}" },
    "金身": { value: 0.06, cap: 0.30, fmt: "pct", desc: "受到物理傷害 -{v}（妖獸）" },
    "化勁": { value: 0.06, cap: 0.30, fmt: "pct", desc: "受到術法傷害 -{v}（修士、心魔、懸賞人物的武學）" },
    "延壽": { value: 0.10, cap: 0.50, fmt: "pct", desc: "戰死折壽 -{v}" },
    "丹心": { value: 0.15, cap: 0.60, fmt: "pct", desc: "丹藥回復量 +{v}" },
    "聚財": { value: 0.03, cap: 0.30, fmt: "pct", desc: "野外靈石 +{v}" },
    "悟道": { value: 0.02, cap: 0.20, fmt: "pct", desc: "修為獲得 +{v}" },
    "積德": { value: 0.05, cap: 0.50, fmt: "pct", desc: "功德獲得 +{v}" },
    "奪寶": { value: 0.10, cap: 1.00, fmt: "pct", desc: "裝備掉落率 +{v}（相對值）" },
    "尋鐵": { value: 0.10, cap: 1.00, fmt: "pct", desc: "星允鐵獲得 +{v}" },
    "役使": { value: 0.05, cap: 0.50, fmt: "pct", desc: "僕從任務速度 +{v}" },
    "獸魂": { value: 0.10, cap: 0.60, fmt: "pct", desc: "靈寵傷害 +{v}" },
    "通玄": { value: 0.10, cap: 0.60, fmt: "pct", desc: "藏書閣屬性秘典效果 +{v}" }
};
