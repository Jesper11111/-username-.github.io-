// 裝備部位 -> 分類（武器/防具/飾品/神器）對照表
// 這份表同時決定「角色裝備」彈窗要顯示哪些欄位，新增部位只要加在這裡即可
const equipTypes = {
    "劍": "weapon", "刀": "weapon", "扇": "weapon", "弓": "weapon", "笛": "weapon", "筆": "weapon",
    "頭": "armor", "內衣": "armor", "盔甲": "armor", "手套": "armor", "長靴": "armor", "披風": "armor",
    "腰帶": "accessory", "項鍊": "accessory", "戒指": "accessory", "耳環": "accessory", "腰牌": "accessory",
    "神器": "artifact"
};

// 背包裝備上限（不含已穿戴的）：已滿時無法鍛造、購買、卸下裝備（舊存檔超過上限的不會被刪除）
const MAX_EQUIP_INVENTORY = 100;

// 不可在鍛造閣打造的部位（神器只能於靈寶閣高級宗門兌換）
const NON_FORGEABLE_SLOTS = ["神器"];

// ---- 裝備等級（鍛造閣）----
// 每件鍛造裝備有等級 eq.level：穿戴需人物等級 ≥ 裝備等級；四維 = 等級 × EQUIP_LEVEL_STAT_MULT × 品質倍率（equipQualities.mult）
//   例：1000 等橙裝 = 1000 × 5 × 8 = 4 萬（與靈寶閣高級寶物相當）
// 可鍛造的最高等級依「目前所屬宗門」的階段：初級 100、中級 500、高級 1000
const EQUIP_LEVELS = [10, 50, 100, 200, 300, 400, 500, 700, 800, 1000];
const EQUIP_LEVEL_STAT_MULT = 5;
const FORGE_LEVEL_CAP_BY_TIER = { 1: 100, 2: 500, 3: 1000 };
const FORGE_COST = 10000;   // 每次鍛造的靈石（不分等級）

// ---- 圖紙鍛造（Lv.1000 以上，2026-09-28 使用者選定，ARCHITECTURE.md 第 55 節；邏輯在 equipment.js）----
// 七檔對應渡劫～混沌道祖各境界的人物等級上限（config-level.js 的 LEVEL_CAP_BY_REALM）；千寶閣／奪寶／秘境掉落仍最高 Lv.1000（EQUIP_LEVELS 不變）
// 每鍛造一件消耗 1 張「該部位、該等級的圖紙」＋ BLUEPRINT_FORGE_COST 靈石（使用者 2026-09-28 指定分部位、分等級，例：劍的 1500 等圖紙只能打 1500 等的劍）；
// 品質照鍛造閣原本的機率；不受宗門階段限制（圖紙本身就是門檻）。之後規劃玩家交易／離線寄賣
const BLUEPRINT_LEVELS = [1500, 2500, 3500, 5000, 6500, 8000, 10000];
const BLUEPRINT_FORGE_COST = 100000;
// 掉落（equipment.js 的 grantBlueprint）：圖紙等級 = 不超過人物等級的最高一檔（未滿 Lv.1500 給 1500 檔，先存著），部位從可鍛造的 17 部位隨機
//   tian：天榜懸賞伏誅的機率；defenseBoss：死守天南城首領波（每 10 波）＝ base ＋ 波數 × perWave（第 100 波 60%）；
//   zhenmo：鎮魔塔擊敗 BOSS ＝ base × 問答倍率（全對 ×2.5 → 75%）
const BLUEPRINT_DROPS = {
    tian: 0.30,
    defenseBoss: { base: 0.10, perWave: 0.005 },
    zhenmo: { base: 0.30, max: 0.75 }
};

// 五行屬性列表（鍛造隨機抽取）
const wuxingElements = ["金", "木", "水", "火", "土"];

// ---- 五行共鳴系統（取代舊版「17 件全同屬性才成陣」）----
// ※ 2026-09-27 由「靈根」改名為「五行共鳴」：「靈根」改指入宗資質測試擲出的先天靈根（config-aptitude.js）。效果不變。
// 判定流程見 stats.js 的 getSpiritRoots()：先統計 17 個部位（不含神器）各五行件數，
//   套數 sets = 五種件數的最小值（能湊出幾組完整的「金木水火土」）、rest[屬性] = 件數 - 套數。
// 1. 單屬性共鳴：某屬性 ≥ ROOT_SINGLE_COUNT 件即啟動（17 格最多同時 3 種）。
// 2. 特殊共鳴：依套數與剩餘件數判定，只會有一個（聖 > 純化 > 雙屬性）。
// 效果一律寫在各共鳴的 bonus 內（由 getRootBonus() 加總），**不要再把數值寫死在計算處**。
const ROOT_SINGLE_COUNT = 5;    // 單屬性共鳴：同屬性件數門檻
const ROOT_SUPREME_SETS = 3;    // 五行聖共鳴：完整「金木水火土」套數
const ROOT_PURE_SETS = 2;       // 純化共鳴：套數
const ROOT_PURE_REST = 6;       //           + 某屬性剩餘件數
const ROOT_DUAL_SETS = 1;       // 雙屬性共鳴：套數
const ROOT_DUAL_REST = 5;       //             + 兩個屬性各自的剩餘件數

// bonus 可用欄位（沒寫的欄位視為無效果）：
//   atkMult/hpMult/conMult/skillMult/healMult  倍率（多個共鳴相乘）
//   def/ice/fire/poison/metal/thunder          戰鬥屬性 %（與裝備加總後一起套上限：減傷 60%、屬性傷害 50%）
//   regen        野外/渡劫每回合回復最大氣血的比例（多個共鳴相加）
//   freezeResist 被凍結的機率倍率折減（0.5 = 機率減半，多個取最高）
//   burnMax/poisonMax  自己造成的燒傷/中毒層數上限（覆蓋 config-elements.js 的預設，取最高）
//   ignoreCounter      不受五行相剋影響（雙向都不生效）

// 單屬性共鳴（5 件同屬性）：沿用原本的五行法陣效果，三種可同時生效
const wuxingArrayEffects = {
    "金": { title: "金靈星君加持", effect: "技能傷害 +20%", bonus: { skillMult: 1.2 },
            detail: "宗門技能與靈寶閣禁術的傷害 ×1.2（普通攻擊、靈寵技能不受影響）",
            suit: "技能流：已學會多階宗門技能、靈力充足時最划算" },
    "木": { title: "木靈星君加持", effect: "生命恢復 +20%", bonus: { healMult: 1.2 },
            detail: "在安全區打坐時，每秒回血由最大氣血的 10% 提升為 12%（野外戰鬥中無效）",
            suit: "效果最弱，只加快回城療傷，一般不建議" },
    "水": { title: "水靈星君加持", effect: "生命 +20%", bonus: { hpMult: 1.2 },
            detail: "氣血上限 ×1.2（整體氣血，含境界帶來的部分）",
            suit: "生存流：高難度地圖常被打回城時選它" },
    "火": { title: "火靈星君加持", effect: "傷害 +20%", bonus: { atkMult: 1.2 },
            detail: "物理與法術攻擊力 ×1.2，普攻、宗門技能、靈寵攻擊都會一起提升，戰力數字也會變高",
            suit: "輸出流：刷怪最快，最通用的首選" },
    "土": { title: "土靈星君加持", effect: "體質 +20%", bonus: { conMult: 1.2 },
            detail: "總體質（含裝備）×1.2，只放大「體質換算的氣血」，境界越高占比越小",
            suit: "前期體質占比高時有感，中後期不如水陣" }
};

// 純化共鳴：2 套五行 + 某屬性剩餘 6 件（例：2 套 + 6 件水 = 冰共鳴）
const pureRootEffects = {
    "水": { name: "冰共鳴", icon: "❄️", effect: "冰傷 +25%、自身被凍結機率減半", bonus: { ice: 25, freezeResist: 0.5 } },
    "火": { name: "炎共鳴", icon: "🔥", effect: "火傷 +25%、燒傷可疊 4 層", bonus: { fire: 25, burnMax: 4 } },
    "金": { name: "罡共鳴", icon: "⚔️", effect: "金傷 +25%", bonus: { metal: 25 } },
    "木": { name: "生共鳴", icon: "🌿", effect: "戰鬥中每回合回復最大氣血 3%", bonus: { regen: 0.03 } },
    "土": { name: "岩共鳴", icon: "🛡️", effect: "減傷 +10%", bonus: { def: 10 } }
};

// 雙屬性共鳴：1 套五行 + 兩個屬性各剩餘 5 件。key 為兩屬性依 wuxingElements 排序後以 "+" 相連。
// 金＋水會依「哪一種件數較多」分成兩種結果（相同則視為主金）；其餘組合不分主副。
const dualRootEffects = {
    "金+水": { byMain: {
        "水": { name: "雷共鳴", icon: "⚡", effect: "雷傷 +25%", bonus: { thunder: 25 } },
        "金": { name: "毒共鳴", icon: "☠️", effect: "毒傷 +25%", bonus: { poison: 25 } }
    }},
    "金+木": { name: "庚共鳴", icon: "⚔️", effect: "金傷 +20%、攻擊 +10%", bonus: { metal: 20, atkMult: 1.1 } },
    "金+火": { name: "煉共鳴", icon: "⚔️", effect: "金傷 +20%、技能傷害 +10%", bonus: { metal: 20, skillMult: 1.1 } },
    "金+土": { name: "鋒岩共鳴", icon: "🛡️", effect: "減傷 +8%、金傷 +15%", bonus: { def: 8, metal: 15 } },
    "木+水": { name: "榮共鳴", icon: "🌿", effect: "每回合回復 2%、氣血上限 +10%", bonus: { regen: 0.02, hpMult: 1.1 } },
    "木+火": { name: "焚共鳴", icon: "🔥", effect: "火傷 +20%、攻擊 +10%", bonus: { fire: 20, atkMult: 1.1 } },
    "木+土": { name: "蠱共鳴", icon: "☠️", effect: "毒傷 +20%、中毒可疊 7 層", bonus: { poison: 20, poisonMax: 7 } },
    "水+火": { name: "既濟共鳴", icon: "❄️", effect: "冰傷、火傷各 +15%", bonus: { ice: 15, fire: 15 } },
    "水+土": { name: "瘴共鳴", icon: "☠️", effect: "毒傷 +20%、氣血上限 +10%", bonus: { poison: 20, hpMult: 1.1 } },
    "火+土": { name: "熔共鳴", icon: "🔥", effect: "火傷 +20%、減傷 +8%", bonus: { fire: 20, def: 8 } }
};

// 五行聖共鳴：3 套完整五行（15 件），剩下 2 件不論屬性
const supremeRootEffect = {
    name: "五行聖共鳴", icon: "☯️",
    effect: "全屬性傷害 +15%、減傷 +15%、攻擊 +30%，且不受五行相剋影響",
    bonus: { ice: 15, fire: 15, poison: 15, metal: 15, thunder: 15, def: 15, atkMult: 1.3, ignoreCounter: true }
};

// 裝備品質等級：倍率影響鍛造屬性加成，color 供 UI 顯示使用
// 戰鬥屬性（單位 %，見 config-elements.js）：
//   def   = 防具每件的減傷      （6 件防具全橙 = 24%）
//   eva   = 飾品每件的閃避      （5 件飾品全橙 = 15%）
//   affix = 武器隨機一種屬性傷害（冰/火/毒/金/雷）的觸發率；同種屬性可疊加，上限 AFFIX_CAP
const equipQualities = [
    { name: "白色", mult: 1, color: "#ffffff", def: 1, eva: 0.5, affix: 2 },
    { name: "綠色", mult: 2, color: "#4ade80", def: 1.5, eva: 1, affix: 3 },
    { name: "藍色", mult: 3, color: "#38bdf8", def: 2, eva: 1.5, affix: 5 },
    { name: "紫色", mult: 5, color: "#c084fc", def: 3, eva: 2, affix: 7 },
    { name: "橙色", mult: 8, color: "#fb923c", def: 4, eva: 3, affix: 10 }
];
