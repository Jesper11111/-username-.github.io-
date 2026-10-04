// 野外妖獸：型態、圖鑑、各地圖出沒組合（2026-10-03《天堂2》式戰鬥第 2 期，ARCHITECTURE.md 第 66 節）
// 邏輯在 monster.js；數值仍由 numeric.js 的 nv2MonsterStats 依「同境界一般玩家」算，型態只是在上面乘倍率。

// ---- 型態 ----
//   hp：氣血倍率；def：減傷 %（加在地圖分類的減傷上，最低 0）；eva：「超出一般玩家命中」的迴避值（閃避機率見 numeric.js 的 evaDodge）；crit：暴擊率（傷害 × NV2.critDmg）
//   攻擊倍率不在這裡填：monster.js 依「一般玩家殺一隻要幾回合 × 暴擊期望」自動反推，讓每個型態對一般玩家造成的「每隻總傷害」相同
//   （皮厚型打得久但打得輕、猛攻型死得快但會爆擊），所以生存與收益不因型態改變；擊殺時間的差異由收益補償吸收（nv2TypRoundsPerKill）。
const MONSTER_TYPES = {
    balanced: { name: "均衡", icon: "⚖️", hp: 1.0,  def: 0,  mres: 0,   eva: 0,  crit: 0.05, desc: "各項平均" },
    tank:     { name: "皮厚", icon: "🛡️", hp: 1.1,  def: 15, mres: -10, eva: 0,  crit: 0.03, desc: "減傷高但魔抗低；術法、破甲、雷擊剋制" },
    agile:    { name: "敏捷", icon: "💨", hp: 0.8,  def: -5, mres: 0,   eva: 15, crit: 0.08, desc: "很會閃避；命中（敏捷、洞察）剋制" },
    brute:    { name: "猛攻", icon: "⚔️", hp: 0.85, def: 0,  mres: 0,   eva: 0,  crit: 0.12, desc: "攻擊猛、常暴擊；防禦剋制" },
    caster:   { name: "術法", icon: "🔮", hp: 0.9,  def: -5, mres: 15,  eva: 5,  crit: 0.05, atkType: "mag", desc: "術法攻擊（魔防擋）、魔抗高但減傷低；物理剋制" }
};
// mres：魔抗 %（加在地圖分類的減傷上，最低 0；擋玩家的術法技能，第 66 節第 4 期 A）；atkType "mag"＝術法攻擊（打玩家走魔防），魔修一律術法攻擊
// 術法型帶異屬性（冰／毒／雷）的機率加成（乘在地圖分類的 affixProb 上，最多 1）
const MONSTER_CASTER_AFFIX_MULT = 1.5;

// ---- 技能（第 3 期）----
// 每次出手有 MONSTER_SKILL_CHANCE 機率從牠的主動技能中抽一招；狂暴是被動（氣血低於門檻後整場生效）
//   heavy 重擊：這一下 × mult｜bite 撕咬：吸取造成傷害的 lifesteal｜poison 毒牙、flame 烈焰：讓你中毒／燒傷一層（每層以牠的攻擊計，同 elements.js）
//   frost 寒息：凍結你 FREEZE_TURNS 回合（抗凍結有效）｜sunder 破甲：你的防禦 × (1 − def)，turns 回合｜rage 狂暴：氣血低於 hpBelow 後攻擊 +atk
//   heal 自癒：回復最大氣血 pct，每隻最多 maxUses 次（挑戰圖妖獸要打上百回合，不限次數會補得比玩家打得快）｜phantom 幻身：閃避 +eva，turns 回合
//   comp：補償（monster.js）——dmg＝這招讓「每隻對一般玩家的總傷害」變成幾倍、rounds＝讓「一般玩家殺一隻的回合」變成幾倍；
//   攻擊 ÷ dmg（總傷害維持與改版前相同），收益補償 × rounds（每小時收益不變）。以第 66 節的模擬（天南、一般玩家無防禦、每招 6000 隻 vs 無技能 1.2 萬隻）量得；
//   撕咬（吸血量相對妖獸氣血很小）與破甲（一般玩家沒有防禦）對一般玩家幾乎沒影響，量到 ±1% 以內視為 1——破甲對高防禦玩家才有感，是刻意的。
const MONSTER_SKILL_CHANCE = 0.15;
const MONSTER_SKILLS = {
    heavy:   { name: "重擊", icon: "💢", mult: 1.8,                comp: { dmg: 1.12, rounds: 1 } },
    bite:    { name: "撕咬", icon: "🩸", lifesteal: 0.3,           comp: { dmg: 1, rounds: 1 } },
    poison:  { name: "毒牙", icon: "☠️",                           comp: { dmg: 1.04, rounds: 1 } },
    flame:   { name: "烈焰", icon: "🔥",                           comp: { dmg: 1.06, rounds: 1 } },
    frost:   { name: "寒息", icon: "❄️",                           comp: { dmg: 1.17, rounds: 1.16 } },
    sunder:  { name: "破甲", icon: "🔨", def: 0.2, turns: 3,       comp: { dmg: 1, rounds: 1 } },
    rage:    { name: "狂暴", icon: "😡", hpBelow: 0.3, atk: 0.5,   comp: { dmg: 1.16, rounds: 1 } },
    heal:    { name: "自癒", icon: "💚", pct: 0.1, maxUses: 2,     comp: { dmg: 1.14, rounds: 1.13 } },
    phantom: { name: "幻身", icon: "👥", eva: 20, turns: 3,        comp: { dmg: 1.07, rounds: 1.065 } }
};

// ---- 圖鑑 ----
// img 沒有的顯示大號 emoji（battle-fx.js）；之後放圖到 images/monsters/、在這裡補 img／pos 即可（只影響外觀）
// 2026-10-03 玩家提供 6 隻合成圖（1408×768，圖上有中文標籤）：標籤以旁邊背景覆蓋後裁出 spider／turtle／wraith／zombie／sorcerer／puppet.jpg（第 66 節）
// skills：技能（上方 MONSTER_SKILLS，第 3 期）
// race：config-race.js 的四族；心魔不放在野外（斬妖錄心魔門檻 50／100／200 是依渡劫心魔的稀有度訂的）
const FIELD_MONSTERS = [
    { id: "dragon",  name: "青鱗蒼龍", icon: "🐉", img: "images/monsters/dragon.jpg",        pos: "62% 30%", race: "beast", type: "balanced", skills: ["frost"] },
    { id: "tiger",   name: "雪紋白虎", icon: "🐅", img: "images/monsters/white-tiger.jpg",   pos: "78% 35%", race: "beast", type: "brute", skills: ["heavy", "rage"] },
    { id: "qilin",   name: "焰蹄麒麟", icon: "🦌", img: "images/monsters/qilin.jpg",         pos: "40% 35%", race: "beast", type: "tank", skills: ["flame", "heal"] },
    { id: "fox",     name: "九尾天狐", icon: "🦊", img: "images/monsters/nine-tail-fox.jpg", pos: "70% 40%", race: "beast", type: "agile", skills: ["phantom"] },
    { id: "phoenix", name: "赤羽火鳳", icon: "🦅", img: "images/monsters/phoenix.jpg",       pos: "58% 35%", race: "beast", type: "caster", skills: ["flame"] },
    { id: "turtle",  name: "玄甲靈龜", icon: "🐢", img: "images/monsters/turtle.jpg",   pos: "35% 45%", race: "beast", type: "tank", skills: ["heal", "frost"] },
    { id: "spider",  name: "碧眼毒蛛", icon: "🕷️", img: "images/monsters/spider.jpg",   pos: "55% 25%", race: "beast", type: "agile", skills: ["poison"] },
    { id: "ghostGen", name: "幽冥鬼將", icon: "👻", img: "images/monsters/ghost-general.jpg", pos: "55% 30%", race: "ghost", type: "caster", skills: ["frost", "sunder"] },
    { id: "yaksha",  name: "青面夜叉", icon: "👹", img: "images/monsters/ghoul.jpg",         pos: "55% 25%", race: "ghost", type: "brute", skills: ["bite", "heavy"] },
    { id: "zombie",  name: "百年殭屍", icon: "🧟", img: "images/monsters/zombie.jpg",   pos: "50% 20%", race: "ghost", type: "tank", skills: ["poison", "bite"] },
    { id: "wraith",  name: "怨魂",     icon: "🌫️", img: "images/monsters/wraith.jpg",   pos: "65% 25%", race: "ghost", type: "agile", skills: ["phantom"] },
    { id: "bloodCult", name: "血煞魔修", icon: "😈", img: "images/monsters/demonic-cultivator.jpg", pos: "50% 30%", race: "demon", type: "brute", skills: ["rage", "bite"] },
    { id: "puppet",  name: "傀儡魔偶", icon: "🗿", img: "images/monsters/puppet.jpg",   pos: "50% 55%", race: "demon", type: "tank", skills: ["sunder", "heavy"] },
    { id: "sorcerer", name: "魔道術士", icon: "🧙", img: "images/monsters/sorcerer.jpg", pos: "50% 25%", race: "demon", type: "caster", skills: ["flame", "poison"] }
];

// ---- 各地圖出沒組合 [[圖鑑 id, 權重], …]（每張 3～5 種）；沒列的地圖用舊規則（幽冥禁域只出鬼物，其餘全部）----
// 幽冥禁域只放鬼物（DARK_MAP_CATEGORIES，本質為暗）；魔修只在幾張魔氣重的圖出現（斬妖錄魔修門檻 2000／2 萬／3 萬是依野外邪修的頻率訂的）
const FIELD_MONSTER_POOLS = {
    // 一、野外歷練
    "靈山大川": [["tiger", 3], ["fox", 3], ["qilin", 2], ["turtle", 2]],
    "深淵險地": [["fox", 3], ["spider", 3], ["dragon", 2], ["yaksha", 2]],
    "上古遺跡": [["qilin", 3], ["phoenix", 2], ["ghostGen", 3], ["zombie", 2]],
    // 二、開放世界
    "天南":     [["dragon", 3], ["tiger", 3], ["spider", 2], ["fox", 2]],
    "亂星海":   [["dragon", 3], ["turtle", 3], ["phoenix", 2], ["yaksha", 2]],
    "鬼谷八荒": [["yaksha", 3], ["ghostGen", 3], ["wraith", 2], ["tiger", 2]],
    "墜魔谷":   [["bloodCult", 4], ["puppet", 3], ["sorcerer", 3]],
    // 三、上古禁區
    "黑風海域": [["turtle", 3], ["dragon", 3], ["spider", 2], ["yaksha", 2]],
    "崑吾山":   [["qilin", 3], ["tiger", 3], ["fox", 2], ["phoenix", 2]],
    "蠻荒古地": [["tiger", 3], ["qilin", 2], ["spider", 3], ["zombie", 2]],
    "雷鳴大陸": [["dragon", 4], ["phoenix", 3], ["turtle", 3]],
    "血天大陸": [["bloodCult", 2], ["puppet", 2], ["yaksha", 2], ["zombie", 2], ["tiger", 2]],   // 2026-10-03 使用者反映強度倍率異常：原 血煞4／術士3／夜叉3 平均攻擊 ×1.05、術法 70%（普通圖最高），改成攻擊 ×0.87、術法 41%
    "天淵戰場": [["puppet", 3], ["bloodCult", 3], ["ghostGen", 2], ["tiger", 2]],
    "星空古路": [["dragon", 3], ["fox", 3], ["phoenix", 2], ["wraith", 2]],
    "荒古禁地": [["qilin", 3], ["turtle", 3], ["zombie", 2], ["tiger", 2]],
    "九天仙域": [["phoenix", 3], ["fox", 3], ["dragon", 2], ["qilin", 2]],
    "太初古礦": [["puppet", 3], ["turtle", 3], ["spider", 2], ["zombie", 2]],
    "上蒼（葬天島）": [["dragon", 3], ["ghostGen", 3], ["sorcerer", 2], ["fox", 2]],
    // 四、幽冥禁域（只有鬼物）
    "不死山":   [["zombie", 4], ["yaksha", 3], ["ghostGen", 3]],
    "神墟":     [["ghostGen", 4], ["wraith", 3], ["yaksha", 3]],
    "仙陵":     [["zombie", 3], ["wraith", 3], ["ghostGen", 4]],
    "冥界":     [["yaksha", 3], ["wraith", 3], ["zombie", 2], ["ghostGen", 2]],
    // 五、諸天至高戰場
    "仙界戰場": [["dragon", 3], ["phoenix", 2], ["ghostGen", 2], ["bloodCult", 2], ["fox", 1]],
    "萬界戰場": [["tiger", 2], ["qilin", 2], ["yaksha", 2], ["puppet", 2], ["wraith", 2]],
    "混沌初界": [["dragon", 2], ["fox", 2], ["zombie", 2], ["sorcerer", 2], ["turtle", 2]]
};
