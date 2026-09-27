// 職業（武器流派，ARCHITECTURE.md 第 37 節）：6 種職業對應 6 種武器，邏輯在 profession.js
// 玩家選一個主修，只有主修累積熟練度；各職業熟練度分開保存，換主修不歸零（第一次免費，之後每次 PROFESSION_SWITCH_COST 靈石）

const PROFESSION_SWITCH_COST = 100000;
const PROFESSION_MIN_LEVEL = 10;
// 宗門傳承（2026-09-27）：主修職業的武器 = 目前所屬宗門的傳承武器（config-sects.js 的 weapon）時生效，依宗門階段
//   weaponPct：主修武器加成再加這麼多（舊制＝該武器四維、新制＝武器攻擊，與 PROF_WEAPON_BONUS 相加）；profMult：熟練度獲得倍率
const SECT_LEGACY_BONUS = {
    1: { weaponPct: 0.10, profMult: 1.3 },   // 凡俗宗門
    2: { weaponPct: 0.20, profMult: 1.6 },   // 修真宗門
    3: { weaponPct: 0.30, profMult: 2.0 }    // 至高聖地
};   // 人物等級達此才能選主修職業（2026-09-27 使用者指定；已選過的老玩家不受影響）
// 熟練度來源：野外每擊殺一隻 +1 × 地圖分類倍率（野外歷練 1、開放世界 2、上古禁區 3、幽冥禁域 3、諸天戰場 4）；懸賞伏誅 +PROF_BOUNTY_GAIN；離線 × PROF_OFFLINE_RATE
const PROF_MAP_MULT = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4 };
const PROF_BOUNTY_GAIN = 200;
const PROF_OFFLINE_RATE = 0.5;
// 10 階的累計熟練度門檻，與主修武器（該部位那一件）的四維加成
const PROF_RANK_EXP = [0, 500, 3000, 10000, 25000, 60000, 120000, 250000, 500000, 1000000];
const PROF_WEAPON_BONUS = [0, 0.03, 0.06, 0.09, 0.12, 0.15, 0.18, 0.21, 0.24, 0.30];

// passive：每一階的被動加成（key 同 gear.js 的 getBonusTotals），per × 階數（1～10）
// skills：到達 rank 階解鎖，每回合出手後依 chance 自動發動（不耗靈力，格式同神器技能，見 artifact.js 的 castProcSkill）
const professions = [
    { id: "sword", name: "劍修", slot: "劍", icon: "🗡️",
      ranks: ["劍童", "劍徒", "劍癡", "劍狂", "劍魔", "劍王", "劍尊", "劍神", "劍仙", "劍帝"],
      passive: { key: "atkPct", per: 0.015, label: "攻擊" },
      skills: [
        { rank: 5,  name: "萬劍歸宗", chance: 0.10, target: "aoe",    dmgType: "phys", mult: 1.2, msg: "🗡️ 劍意化萬，【萬劍歸宗】劍雨傾瀉而下！" },
        { rank: 8,  name: "人劍合一", chance: 0.10, target: "single", dmgType: "phys", mult: 2.5, attrs: { metal: 50 }, msg: "🗡️ 身劍相融，【人劍合一】一劍穿心！" },
        { rank: 10, name: "一劍開天", chance: 0.08, target: "single", dmgType: "phys", mult: 4.0, attrs: { metal: 100 }, msg: "🗡️ 劍帝出手，【一劍開天】天地為之一分！" }
      ] },
    { id: "blade", name: "刀修", slot: "刀", icon: "🔪",
      ranks: ["刀童", "刀客", "刀癡", "刀狂", "刀魔", "刀霸", "刀尊", "刀聖", "刀仙", "刀皇"],
      passive: { key: "physPct", per: 0.02, label: "物理攻擊" },
      skills: [
        { rank: 5,  name: "狂刀斬",   chance: 0.12, target: "single", dmgType: "phys", mult: 2.0, attrs: { metal: 40 }, msg: "🔪 刀勢如狂，【狂刀斬】劈落！" },
        { rank: 8,  name: "霸刀裂地", chance: 0.10, target: "aoe",    dmgType: "phys", mult: 1.5, msg: "🔪 一刀斬地，【霸刀裂地】震翻群敵！" },
        { rank: 10, name: "刀皇天斬", chance: 0.08, target: "aoe",    dmgType: "phys", mult: 2.5, attrs: { metal: 60 }, msg: "🔪 刀皇降世，【刀皇天斬】橫掃八荒！" }
      ] },
    { id: "fan", name: "扇修", slot: "扇", icon: "🪭",
      ranks: ["扇童", "羽客", "扇癡", "風狂", "扇魔", "風王", "羽尊", "扇聖", "風仙", "風帝"],
      passive: { key: "magPct", per: 0.02, label: "術法攻擊" },
      skills: [
        { rank: 5,  name: "清風拂面", chance: 0.12, target: "aoe", dmgType: "mag", mult: 1.2, attrs: { ice: 30 }, msg: "🪭 羽扇輕搖，【清風拂面】寒風捲過群敵！" },
        { rank: 8,  name: "羽化風暴", chance: 0.10, target: "aoe", dmgType: "mag", mult: 1.8, attrs: { poison: 50 }, msg: "🪭 羽毛化刃，【羽化風暴】席捲四方！" },
        { rank: 10, name: "風帝天罡", chance: 0.08, target: "aoe", dmgType: "mag", mult: 2.8, attrs: { ice: 60 }, msg: "🪭 風帝一揮，【風帝天罡】罡風凍徹天地！" }
      ] },
    { id: "bow", name: "弓修", slot: "弓", icon: "🏹",
      ranks: ["弓童", "射手", "箭癡", "箭狂", "箭魔", "弓王", "射尊", "箭神", "弓仙", "弓帝"],
      passive: { key: "fx:首擊", per: 0.05, label: "首擊傷害" },
      skills: [
        { rank: 5,  name: "連珠箭",   chance: 0.12, target: "single", dmgType: "phys", mult: 1.8, attrs: { thunder: 30 }, msg: "🏹 弓弦連響，【連珠箭】箭箭相連！" },
        { rank: 8,  name: "穿雲破日", chance: 0.10, target: "single", dmgType: "phys", mult: 3.0, attrs: { thunder: 60 }, msg: "🏹 一箭穿雲，【穿雲破日】雷光貫體！" },
        { rank: 10, name: "弓帝射天", chance: 0.08, target: "aoe",    dmgType: "phys", mult: 2.2, attrs: { thunder: 80 }, msg: "🏹 弓帝挽弓，【弓帝射天】萬箭化雷！" }
      ] },
    { id: "flute", name: "音修", slot: "笛", icon: "🎶",
      ranks: ["樂童", "琴徒", "音癡", "樂狂", "音魔", "琴王", "樂尊", "音神", "琴仙", "樂帝"],
      passive: { key: "fx:回靈", per: 0.003, label: "每回合回靈" },
      skills: [
        { rank: 5,  name: "清心曲",   chance: 0.12, target: "self", heal: 0.08, mpHeal: 0.08, msg: "🎶 笛音清越，【清心曲】洗滌心神！" },
        { rank: 8,  name: "天魔音",   chance: 0.08, target: "aoe",  dmgType: "mag", mult: 1.5, freezeAll: true, msg: "🎶 魔音貫耳，【天魔音】震得群敵動彈不得！" },
        { rank: 10, name: "樂帝九韶", chance: 0.08, target: "aoe",  dmgType: "mag", mult: 2.2, attrs: { ice: 60 }, heal: 0.10, msg: "🎶 九韶齊鳴，【樂帝九韶】天地同奏！" }
      ] },
    { id: "brush", name: "符修", slot: "筆", icon: "🖌️",
      ranks: ["符童", "符師", "墨癡", "符狂", "符魔", "符王", "符尊", "符聖", "符仙", "符祖"],
      passive: { key: "fx:法爆", per: 0.02, label: "技能傷害" },
      skills: [
        { rank: 5,  name: "爆炎符",   chance: 0.12, target: "single", dmgType: "mag", mult: 2.0, attrs: { fire: 60 }, msg: "🖌️ 筆走龍蛇，【爆炎符】轟然炸開！" },
        { rank: 8,  name: "萬毒符陣", chance: 0.10, target: "aoe",    dmgType: "mag", mult: 1.6, attrs: { poison: 60 }, msg: "🖌️ 符籙成陣，【萬毒符陣】毒霧瀰漫！" },
        { rank: 10, name: "符祖敕令", chance: 0.08, target: "aoe",    dmgType: "mag", mult: 3.0, attrs: { fire: 80 }, msg: "🖌️ 符祖一筆，【符祖敕令】天火降世！" }
      ] }
];
