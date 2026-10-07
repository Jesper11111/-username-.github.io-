// 仙法（不分流派的武學，任何人都可學習）：共 200 種，由 spells.js 的武學密典顯示（ARCHITECTURE.md 第 35 節）
//
// 結構：10 種屬性 × 3 品（下／中／上）× 6 招 = 180，另加 20 種「絕學」（正派法則大道 10、魔道禁忌法 10）
//   每品 6 招依序為：單體攻擊、群體攻擊、牽制、補助（增益或守護）、補血、光環（被動）
//   正道仙法：金 木 水 火 土 雷；邪道魔功：冰（玄冥）毒 血 冥 —— 魔功威力 ×SPELL_EVIL_POWER，但施放時反噬扣氣血
//
// 主動仙法要放進「技能格」才會在戰鬥中施放（每 100 級開 1 格）；被動光環學會即永久生效。
// 目前還沒有取得方式（player.spells 只能由之後的功能寫入），密典可先瀏覽全部內容。
//
// ⚠️ id 會寫進存檔（player.spells / player.spellSlots），上線後不要改；改名稱或數值沒關係。

const SPELL_EVIL_POWER = 1.25;   // 魔功傷害倍率
const SPELL_SLOT_LEVEL_STEP = 100;   // 每幾級多開一格技能格
// 2026-10-06 使用者：「把宗門學會的武學跟秘典武學合併，都放在秘典武學內」→ 選「放格子且格數增加」：
//   宗門武學也要放進技能格才會施放（不再自動參戰），技能格改成 基本 SPELL_SLOT_BASE 格＋每 SPELL_SLOT_LEVEL_STEP 級 1 格（原本基本 1 格）
const SPELL_SLOT_BASE = 3;
const SECT_SKILL_SLOT_PREFIX = "sect:";   // 技能格內的宗門武學 id＝"sect:" + 招式名稱（招式名稱不重複；寫進存檔，上線後不要改招式名）
// 下品武學秘典碎片（2026-10-01 使用者要求「新增下品武學秘典碎片，100 個可合成，在奇遇機緣等探索發現」）：
//   player.spellShards；武學密典視窗「合成」→ 隨機習得一招尚未學會的下品仙法（spells.js 的 synthesizeSpell）；來源見 config-encounter.js
const SPELL_SHARD_NEED = 100;
const SPELL_SHARD_GRADE = "low";
// 中品／上品武學秘典碎片（2026-10-06 使用者：「凡界新增中品武學碎片」「靈界新增上品武學碎片」）：同樣 100 片合成，隨機習得一招尚未學會的該品仙法
//   key：存檔欄位；from：武學密典顯示的來源。中品＝凡界（人界）＋靈界野外妖獸（2026-10-07 起靈界也掉）、上品＝靈界野外妖獸（spells.js 的 rollSpellShardFieldDrops）
const SPELL_SHARD_KINDS = {
    low:  { key: "spellShards",     from: "奇遇、機緣探索取得" },
    mid:  { key: "spellShardsMid",  from: "凡界（人界）、靈界野外妖獸掉落" },
    high: { key: "spellShardsHigh", from: "靈界野外妖獸掉落" }
};
// 野外掉落：每次掉寶（combat.js 的 takeDropRolls，每小時最多 1200 次；離線用收益次數）掉 1 片的機率
//   中品 1/300 → 每小時約 4 片（約 25 小時合成一招）；上品 1/600 → 每小時約 2 片（約 50 小時一招）
const SPELL_SHARD_FIELD_DROP = { mid: 1 / 300, high: 1 / 600 };

const SPELL_GRADES = {
    low:      { name: "下品", color: "#9ca3af" },
    mid:      { name: "中品", color: "#60a5fa" },
    high:     { name: "上品", color: "#c084fc" },
    ultimate: { name: "絕學", color: "#f59e0b" }
};

// 類型（密典的篩選與說明用）；aura = 被動光環，其餘為主動
const SPELL_ROLES = {
    atk:     { name: "攻擊", icon: "⚔️" },
    control: { name: "牽制", icon: "⛓️" },
    support: { name: "補助", icon: "🛡️" },
    heal:    { name: "補血", icon: "💚" },
    aura:    { name: "光環", icon: "🌟" }
};

// ---- 各品階數值（主動）----
//   single/aoe：傷害 = 攻擊力 × mult；effectChance = 屬性效果（金重擊／燒傷／冰凍／中毒／雷擊）的觸發機率
//   control   ：傷害倍率 mult，並以 freeze 機率使目標定身（沿用冰凍狀態，無法行動 1 回合）
//   buff      ：攻擊力 × mult，持續 duration 回合；shield：受到傷害 -reduce，持續 duration 回合
//   heal      ：立即回復最大氣血的 heal
//   hpCost    ：魔功施放時反噬的氣血（最大氣血比例，不會因此死亡）
const SPELL_GRADE_STATS = {
    low:      { single: 1.6, aoe: 1.1, control: 0.8, freeze: 0.40, buff: 1.15, shield: 0.15, duration: 3, heal: 0.12, effectChance: 0.15, mp: 60,  hpCost: 0.03 },
    mid:      { single: 2.4, aoe: 1.7, control: 1.2, freeze: 0.60, buff: 1.25, shield: 0.25, duration: 3, heal: 0.20, effectChance: 0.25, mp: 150, hpCost: 0.05 },
    high:     { single: 3.4, aoe: 2.5, control: 1.6, freeze: 0.80, buff: 1.40, shield: 0.35, duration: 4, heal: 0.30, effectChance: 0.35, mp: 300, hpCost: 0.08 },
    ultimate: { single: 5.0, aoe: 3.8, control: 2.0, freeze: 1.00, buff: 1.80, shield: 0.50, duration: 5, heal: 0.50, effectChance: 0.50, mp: 600, hpCost: 0.12 }
};

// 被動光環可用的欄位：physPct/magPct（物理／術法攻擊 %）、hpPct/mpPct（氣血／靈力上限 %）、
//   def/eva（防禦點數／迴避值）、fire/ice/poison/metal/thunder（屬性傷害機率 %）。負值為魔功的代價。
const SPELL_AURA_LABELS = {
    physPct: "物理攻擊", magPct: "術法攻擊", hpPct: "氣血上限", mpPct: "靈力上限",
    def: "防禦", eva: "閃避", fire: "燒傷機率", ice: "冰凍機率", poison: "中毒機率", metal: "金重擊機率", thunder: "雷擊機率"
};

// ---- 10 種屬性 ----
//   key       ：id 前綴（英文，寫進存檔）
//   dmgType   ：phys 吃力量、mag 吃悟性
//   effect    ：攻擊附帶的屬性效果（resolveHit 的 affix），lifesteal = 依傷害回復氣血的比例
//   support   ：補助招是 buff（增益）還是 shield（守護）
//   aura      ：光環每品（下／中／上）的數值
//   names     ：[下品 6 招, 中品 6 招, 上品 6 招]，順序：單體、群體、牽制、補助、補血、光環
const spellAttributes = [
    { key: "metal", name: "金", faction: "正", dmgType: "phys", effect: "metal", support: "buff",
      aura: [{ physPct: 0.05 }, { physPct: 0.10 }, { physPct: 0.15 }],
      names: [
        ["庚金指", "金芒散", "鎖金索", "銳金訣", "金身回元術", "金剛心經"],
        ["太白劍訣", "萬刃金雨", "金光定身法", "破軍戰意訣", "金蟬蛻生術", "不壞金身經"],
        ["誅仙劍氣", "太乙金光劍陣", "困仙金繩", "庚辛殺伐真意", "金烏回生法", "太白庚金道典"]
      ] },
    { key: "wood", name: "木", faction: "正", dmgType: "mag", effect: null, lifesteal: 0.10, support: "buff",
      aura: [{ hpPct: 0.06 }, { hpPct: 0.12 }, { hpPct: 0.18 }],
      names: [
        ["青藤刺", "飛葉術", "纏木術", "春風化雨訣", "枯木逢春術", "長青心經"],
        ["乙木神針", "萬木森羅", "青藤縛仙陣", "生生不息訣", "回春妙法", "青帝長生經"],
        ["建木天矛", "萬古青林劫", "扶桑鎖天藤", "青帝造化訣", "蟠桃續命術", "建木通天道典"]
      ] },
    { key: "water", name: "水", faction: "正", dmgType: "mag", effect: "ice", support: "shield",
      aura: [{ mpPct: 0.08 }, { mpPct: 0.16 }, { mpPct: 0.25 }],
      names: [
        ["水箭術", "水龍捲", "寒潭困", "若水護體訣", "甘霖術", "若水心經"],
        ["玄水神槍", "滄海怒濤", "弱水牢籠", "上善若水訣", "天一聖水術", "玄水真經"],
        ["天河倒懸", "四海歸墟", "三千弱水困仙陣", "北冥鯤鵬護身法", "瑤池聖露", "滄溟道典"]
      ] },
    { key: "fire", name: "火", faction: "正", dmgType: "mag", effect: "fire", support: "buff",
      aura: [{ fire: 4 }, { fire: 8 }, { fire: 12 }],
      names: [
        ["火球術", "火雨術", "焚身縛", "炎陽訣", "丹火療傷術", "離火心經"],
        ["赤帝火龍拳", "火海燎原", "九龍神火罩", "朱雀真意訣", "浴火回春術", "離火真經"],
        ["太陽真火印", "焚天煮海", "八卦爐封天", "朱雀天炎道", "涅槃重生法", "南明離火道典"]
      ] },
    { key: "earth", name: "土", faction: "正", dmgType: "phys", effect: null, support: "shield",
      aura: [{ def: 2 }, { def: 4 }, { def: 6 }],
      names: [
        ["飛石術", "地刺術", "流沙陷", "厚土訣", "土靈養身術", "后土心經"],
        ["撼山拳", "地裂崩山", "泥沼困龍陣", "不動如山訣", "戊己回元術", "坤元真經"],
        ["五嶽鎮天印", "大地崩滅", "息壤鎖仙", "后土載物真意", "息壤造化術", "后土皇地祇道典"]
      ] },
    { key: "thunder", name: "雷", faction: "正", dmgType: "mag", effect: "thunder", support: "buff",
      aura: [{ thunder: 4 }, { thunder: 8 }, { thunder: 12 }],
      names: [
        ["掌心雷", "雷網術", "麻痺雷咒", "雷動訣", "雷澤養氣術", "雷音心經"],
        ["五雷正法", "九霄雷暴", "雷獄困鎖", "雷神附體訣", "雷霆淬體術", "九天應元雷經"],
        ["紫霄神雷", "滅世雷劫", "萬雷天牢", "雷帝降世訣", "雷劫淬生術", "九霄雷祖道典"]
      ] },
    { key: "ice", name: "冰", faction: "邪", dmgType: "mag", effect: "ice", support: "shield",
      aura: [{ ice: 4 }, { ice: 8 }, { ice: 12 }],
      names: [
        ["玄陰冰刺", "寒魄魔霜", "冰獄咒", "陰寒魔甲", "寒髓回元術", "玄陰魔經"],
        ["冥河寒刃", "萬里冰封", "玄冥冰棺", "太陰寒煞罩", "寒蟾吐息術", "太陰魔經"],
        ["九幽玄冰魔指", "極寒冰淵劫", "冰封萬古", "太陰鬼帝寒軀", "寒玉魔骨術", "玄冥真魔典"]
      ] },
    { key: "poison", name: "毒", faction: "邪", dmgType: "mag", effect: "poison", support: "buff",
      aura: [{ poison: 4 }, { poison: 8 }, { poison: 12 }],
      names: [
        ["蛇毒針", "毒霧術", "蝕骨麻散", "百毒煉體訣", "以毒攻毒術", "萬毒魔經"],
        ["腐心魔掌", "瘴氣蔽日", "千蛛縛魂網", "五毒附體訣", "蠱王續命術", "五毒魔經"],
        ["天蠶噬心蠱", "萬毒滅世", "九毒鎖魂陣", "毒王降世訣", "萬蠱歸元術", "萬毒老祖魔典"]
      ] },
    { key: "blood", name: "血", faction: "邪", dmgType: "phys", effect: null, lifesteal: 0.25, support: "buff",
      aura: [{ physPct: 0.08, magPct: 0.08, hpPct: -0.03 }, { physPct: 0.15, magPct: 0.15, hpPct: -0.05 }, { physPct: 0.22, magPct: 0.22, hpPct: -0.08 }],
      names: [
        ["血刃", "血雨術", "血縛咒", "燃血魔功", "吞血回元術", "血煞魔經"],
        ["化血神刀", "血河倒灌", "血獄囚魂", "血魔狂化訣", "噬血重生術", "血河魔經"],
        ["血神子殺", "血海滔天", "萬魂血牢", "血神降世訣", "滴血重生大法", "血神魔典"]
      ] },
    { key: "nether", name: "冥", faction: "邪", dmgType: "mag", effect: "poison", support: "buff",
      aura: [{ eva: 2 }, { eva: 4 }, { eva: 6 }],
      names: [
        ["勾魂指", "陰風鬼嘯", "攝魂咒", "鬼影附身訣", "陰靈聚氣術", "幽冥魔經"],
        ["奪魄魔掌", "百鬼夜行", "鎖魂鈴咒", "冥王附體訣", "借屍還魂術", "九幽魔經"],
        ["閻羅索命", "黃泉鬼域", "輪迴鎖魂陣", "冥帝真身訣", "冥河返生術", "冥帝輪迴魔典"]
      ] }
];

// ---- 絕學 20 種：正派「法則大道」、魔道「禁忌法」 ----
//   kind：single / aoe / control / buff / shield / heal / aura；attr 為所屬屬性（null = 法則，無屬性）
//   控制類 aoe: true 為群體；aura 直接寫數值
const spellUltimates = [
    // 正派・法則大道
    { id: "law-sword",     name: "太初劍道",           faction: "正", attr: "metal",   kind: "single" },
    { id: "law-life",      name: "萬物生長法則",       faction: "正", attr: "wood",    kind: "heal" },
    { id: "law-sea",       name: "滄海歸一大道",       faction: "正", attr: "water",   kind: "aoe" },
    { id: "law-sun",       name: "大日燭照法則",       faction: "正", attr: "fire",    kind: "aoe" },
    { id: "law-earth",     name: "大地承載法則",       faction: "正", attr: "earth",   kind: "shield" },
    { id: "law-thunder",   name: "天罰雷道",           faction: "正", attr: "thunder", kind: "aoe" },
    { id: "law-time",      name: "時間法則・光陰逆轉", faction: "正", attr: null,      kind: "control", aoe: true },
    { id: "law-space",     name: "空間法則・虛空封禁", faction: "正", attr: null,      kind: "control" },
    { id: "law-karma",     name: "因果法則",           faction: "正", attr: null,      kind: "aura", aura: { physPct: 0.20, magPct: 0.20 } },
    { id: "law-dao",       name: "大道衍天",           faction: "正", attr: null,      kind: "aura", aura: { hpPct: 0.15, mpPct: 0.15, def: 5, eva: 3 } },
    // 魔道・禁忌法
    { id: "taboo-devour",  name: "天魔噬天禁法",       faction: "邪", attr: "blood",   kind: "single" },
    { id: "taboo-sacrifice", name: "血祭萬靈",         faction: "邪", attr: "blood",   kind: "aoe" },
    { id: "taboo-banner",  name: "萬魂幡・百萬陰魂",   faction: "邪", attr: "nether",  kind: "aoe" },
    { id: "taboo-slay",    name: "斬仙禁術",           faction: "邪", attr: "metal",   kind: "single" },
    { id: "taboo-plague",  name: "毒絕天下",           faction: "邪", attr: "poison",  kind: "aoe" },
    { id: "taboo-silence", name: "冰封天地・永寂",     faction: "邪", attr: "ice",     kind: "control", aoe: true },
    { id: "taboo-burnsoul", name: "燃魂秘法",          faction: "邪", attr: null,      kind: "buff" },
    { id: "taboo-undying", name: "不死魔軀",           faction: "邪", attr: null,      kind: "shield" },
    { id: "taboo-demongod", name: "魔神降臨",          faction: "邪", attr: null,      kind: "aura", aura: { physPct: 0.35, magPct: 0.35, hpPct: -0.10 } },
    { id: "taboo-swallow", name: "吞天魔功",           faction: "邪", attr: null,      kind: "aura", aura: { hpPct: 0.30, def: 4, eva: -2 } }
];
