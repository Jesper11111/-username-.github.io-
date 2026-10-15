// 屠龍勇者：職業技能／魔法（依賴 config.js、classes.js）
// type：
//   spell   攻擊魔法：dmg + SP×spK，必中，受怪物 MR 減免；可有 cd（秒）
//   strike  物理技能：普攻 ×mult，hits 次；ignoreAc 無視防禦；stun 暈眩毫秒；magic 附加魔法傷害；cd（秒）
//   heal    治癒：heal + SP×spK，HP 低於設定比例時自動施放
//   buff    增益：sec 秒，fx 效果；group 相同的增益互不疊加（例如加速術與綠水都是 haste）
//   passive 被動：學會就生效；cond:'lowHp' 表示 HP 低於 50% 才生效
// fx 欄位：ac（越大越硬）、hit、dmg、sp、mr、crit、dodge、reduce（減傷）、double（雙擊率）、
//          absorb（傷害轉由 MP 承受比例）、counter（反擊率）、hpRegen、mpRegen、dmgSp（SP×倍率加到傷害）、
//          spdMul（攻速提升比例）、lifesteal（吸血比例）、haste（加速）、brave（勇敢）
// undeadMul：對不死系倍率
// aoe：範圍攻擊，打全部圍上來的怪；spread：多發攻擊每一發打不同隻（2026-10-09 多怪戰鬥）

// ───────── 共用魔法 1～10 級（天堂式；2026-10-15，ARCHITECTURE.md 第 40 節）─────────
// 各職業能學到的最高等級與每級需要的角色等級在 MAGIC_CLASS；要有魔法書才學得會（MAGIC_BOOK_*）。
// id 沿用舊版（光箭 energyBolt、治癒術 heal1～3、加速術 haste…），舊存檔的冷卻與增益照常
const MAGIC = [
    // 1 級
    { id: 'energyBolt', tier: 1, name: '光箭',       mp: 3,  type: 'spell', dmg: [3, 8], spK: 1, desc: '基礎攻擊魔法' },
    { id: 'heal1',      tier: 1, name: '初級治癒術', mp: 5,  type: 'heal', heal: [12, 20], spK: 2, desc: '回復少量 HP' },
    { id: 'mShield',    tier: 1, name: '保護罩',     mp: 4,  type: 'buff', sec: 600, fx: { ac: 2 }, desc: '防禦 +2（10 分鐘）' },
    { id: 'holyWeapon', tier: 1, name: '神聖武器',   mp: 4,  type: 'buff', sec: 300, fx: { hit: 2, dmg: 1 }, desc: '命中 +2、傷害 +1' },
    // 2 級
    { id: 'iceDagger',  tier: 2, name: '冰箭',       mp: 5,  type: 'spell', dmg: [8, 16], spK: 1.2, desc: '冰屬性攻擊魔法' },
    { id: 'windCutter', tier: 2, name: '風刃',       mp: 6,  type: 'spell', dmg: [10, 18], spK: 1.2, desc: '風屬性攻擊魔法' },
    { id: 'armorBless', tier: 2, name: '鎧甲護持',   mp: 8,  type: 'buff', sec: 600, fx: { ac: 3 }, desc: '防禦 +3（10 分鐘）' },
    { id: 'meditate',   tier: 2, name: '冥想術',     mp: 5,  type: 'buff', sec: 600, fx: { mpRegen: 5 }, desc: '回魔 +5／5 秒' },
    // 3 級
    { id: 'heal2',      tier: 3, name: '中級治癒術', mp: 12, type: 'heal', heal: [40, 60], spK: 3, desc: '回復中量 HP' },
    { id: 'fireArrow',  tier: 3, name: '火焰箭',     mp: 8,  type: 'spell', dmg: [16, 26], spK: 1.5, desc: '火屬性攻擊魔法' },
    { id: 'auroraBolt', tier: 3, name: '極光雷電',   mp: 9,  type: 'spell', dmg: [18, 30], spK: 1.5, desc: '雷屬性攻擊魔法' },
    { id: 'enchantDex', tier: 3, name: '敏捷術',     mp: 10, type: 'buff', sec: 600, fx: { dex: 2 }, desc: '敏捷 +2（10 分鐘）' },
    // 4 級
    { id: 'fireball',   tier: 4, name: '火球術',     mp: 9,  type: 'spell', dmg: [20, 34], spK: 1.6, desc: '火屬性攻擊魔法' },
    { id: 'haste',      tier: 4, name: '加速術',     mp: 20, type: 'buff', sec: 600, group: 'haste', fx: { haste: true }, desc: '攻速提升（與綠水同效果）' },
    { id: 'vampKiss',   tier: 4, name: '吸血鬼之吻', mp: 12, type: 'spell', dmg: [22, 36], spK: 1.6, desc: '暗屬性攻擊魔法（有吸血效果時可回 HP）' },
    { id: 'enchantStr', tier: 4, name: '力量術',     mp: 10, type: 'buff', sec: 600, fx: { str: 2 }, desc: '力量 +2（10 分鐘）' },
    // 5 級
    { id: 'lightning',  tier: 5, name: '極道落雷',   mp: 14, type: 'spell', dmg: [26, 44], spK: 2, desc: '雷屬性攻擊魔法' },
    { id: 'frostBreath', tier: 5, name: '寒冰氣息',  mp: 16, type: 'spell', dmg: [20, 34], spK: 1.5, aoe: true, cd: 4, desc: '範圍：冰霜吹向所有敵人（冷卻 4 秒）' },
    { id: 'berserkSpell', tier: 5, name: '狂暴術',   mp: 15, type: 'buff', sec: 300, fx: { dmg: 4, ac: -2 }, desc: '傷害 +4，但防禦 -2' },
    // 6 級
    { id: 'heal3',      tier: 6, name: '高級治癒術', mp: 22, type: 'heal', heal: [90, 130], spK: 4, desc: '回復大量 HP' },
    { id: 'blaze',      tier: 6, name: '烈炎術',     mp: 20, type: 'spell', dmg: [40, 68], spK: 2.5, desc: '高階火焰魔法' },
    { id: 'iceLance',   tier: 6, name: '冰矛',       mp: 22, type: 'spell', dmg: [44, 72], spK: 2.5, desc: '高階冰屬性魔法' },
    { id: 'bodyBless',  tier: 6, name: '體魄強健術', mp: 18, type: 'buff', sec: 600, fx: { hp: 60, con: 1 }, desc: 'HP 上限 +60、體質 +1（10 分鐘）' },
    // 7 級
    { id: 'blizzard',   tier: 7, name: '冰雪暴',     mp: 30, type: 'spell', dmg: [50, 80], spK: 2.5, aoe: true, desc: '範圍：冰雪覆蓋所有敵人' },
    { id: 'tornado',    tier: 7, name: '龍捲風',     mp: 28, type: 'spell', dmg: [45, 75], spK: 2.3, aoe: true, cd: 3, desc: '範圍：龍捲風捲起所有敵人（冷卻 3 秒）' },
    { id: 'mageBarrier', tier: 7, name: '魔法屏障',  mp: 25, type: 'buff', sec: 300, fx: { mr: 20, reduce: 3 }, desc: 'MR +20、減傷 3' },
    // 8 級
    { id: 'fullHeal',   tier: 8, name: '全部治癒術', mp: 40, type: 'heal', heal: [200, 260], spK: 5, desc: '回復極大量 HP' },
    { id: 'thunderStorm', tier: 8, name: '雷電風暴', mp: 38, type: 'spell', dmg: [70, 110], spK: 2.8, aoe: true, cd: 4, desc: '範圍：雷電打向所有敵人（冷卻 4 秒）' },
    { id: 'holyBarrier', tier: 8, name: '聖結界',    mp: 35, type: 'buff', sec: 120, fx: { reduce: 6, mr: 10 }, desc: '減傷 6、MR +10（2 分鐘）' },
    // 9 級
    { id: 'meteor',     tier: 9, name: '流星雨',     mp: 45, type: 'spell', dmg: [85, 135], spK: 3, aoe: true, desc: '範圍：隕石打向所有敵人' },
    { id: 'disintegrate', tier: 9, name: '究極光裂術', mp: 50, type: 'spell', dmg: [150, 220], spK: 3.5, cd: 6, desc: '單體最強光屬性魔法（冷卻 6 秒）' },
    { id: 'absBarrier', tier: 9, name: '絕對屏障',   mp: 40, type: 'buff', sec: 15, cd: 90, fx: { reduce: 20 }, desc: '15 秒內減傷 20（冷卻 90 秒）' },
    // 10 級
    { id: 'mageInferno', tier: 10, name: '煉獄',     mp: 60, type: 'spell', dmg: [120, 180], spK: 3.5, aoe: true, cd: 8, desc: '範圍：煉獄之火吞噬所有敵人（冷卻 8 秒）' },
    { id: 'darkStar',   tier: 10, name: '黑闇之星',  mp: 70, type: 'spell', dmg: [220, 320], spK: 4, cd: 8, desc: '單體終極魔法（冷卻 8 秒）' },
];
// 各職業的魔法：max＝最高能學到第幾級；lv[t-1]＝學第 t 級魔法需要的角色等級（參考天堂：法師每 4～8 級一階、妖精 6 級、王族／騎士很少）
const MAGIC_CLASS = {
    mage:         { max: 10, lv: [1, 8, 16, 24, 28, 36, 48, 56, 60, 78] },
    angel:        { max: 8,  lv: [1, 10, 20, 28, 36, 45, 55, 65] },
    elf:          { max: 6,  lv: [4, 12, 20, 32, 44, 56] },
    magicfighter: { max: 6,  lv: [8, 12, 24, 36, 50, 62] },
    paladin:      { max: 6,  lv: [4, 20, 35, 50, 62, 70] },
    demon:        { max: 4,  lv: [10, 25, 45, 65] },
    royal:        { max: 3,  lv: [4, 20, 30] },
    darkelf:      { max: 3,  lv: [12, 30, 48] },
    gunner:       { max: 2,  lv: [20, 50] },
    knight:       { max: 1,  lv: [50] },
    shura:        { max: 1,  lv: [40] },
    warrior:      { max: 1,  lv: [40] },
};
const MAGIC_TIER_NAMES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const SKILLS = {
    // 職業專屬技能（2026-10-10 第 26 節）；2026-10-15 起治癒術、鎧甲護持等共用的移到上面的 MAGIC
    royal: [
        { id: 'royalAim',    name: '精準目標', lv: 10, mp: 8,  type: 'buff', sec: 300, fx: { hit: 5, dmg: 2 }, desc: '命中 +5、傷害 +2' },
        { id: 'royalStrike', name: '王者之劍', lv: 15, mp: 6,  type: 'strike', mult: 1.5, cd: 6, desc: '1.5 倍傷害一擊' },
        { id: 'royalMorale', name: '激勵士氣', lv: 25, mp: 15, type: 'buff', sec: 300, fx: { dmg: 4, hit: 3 }, desc: '傷害 +4、命中 +3' },
        { id: 'royalIron',   name: '鋼鐵士氣', lv: 40, mp: 20, type: 'buff', sec: 300, fx: { ac: 6, reduce: 3 }, desc: '防禦 +6、減傷 3' },
        { id: 'royalAura',   name: '王者光環', lv: 48, type: 'passive', fx: { hit: 3, mr: 5 }, desc: '被動：命中 +3、MR +5' },
        { id: 'royalImpact', name: '衝擊士氣', lv: 55, mp: 25, type: 'buff', sec: 300, fx: { spdMul: 0.15, dmg: 5 }, desc: '攻速 +15%、傷害 +5' },
        { id: 'royalWrath',  name: '王者之怒', lv: 70, mp: 25, type: 'strike', mult: 2.2, aoe: true, cd: 10, desc: '範圍：2.2 倍傷害橫掃所有敵人（冷卻 10 秒）' },
        { id: 'royalDecree', name: '王命',     lv: 85, mp: 30, type: 'buff', sec: 180, fx: { dmg: 8, ac: 4, spdMul: 0.1 }, desc: '傷害 +8、防禦 +4、攻速 +10%（3 分鐘）' },
    ],
    knight: [
        { id: 'knightBash',    name: '猛擊',     lv: 5,  mp: 2,  type: 'strike', mult: 1.4, cd: 6, desc: '1.4 倍傷害一擊' },
        { id: 'knightStun',    name: '衝擊之暈', lv: 15, mp: 6,  type: 'strike', mult: 1.2, stun: 2000, cd: 12, desc: '1.2 倍傷害並暈眩 2 秒' },
        { id: 'knightCharge',  name: '衝鋒斬',   lv: 22, mp: 6,  type: 'strike', mult: 1.8, cd: 8, desc: '1.8 倍傷害一擊' },
        { id: 'knightSolid',   name: '增幅防禦', lv: 30, mp: 10, type: 'buff', sec: 300, fx: { ac: 5 }, desc: '防禦 +5' },
        { id: 'knightWill',    name: '不屈意志', lv: 38, type: 'passive', cond: 'lowHp', fx: { reduce: 4 }, desc: '被動：HP 低於 50% 時減傷 4' },
        { id: 'knightCounter', name: '反擊屏障', lv: 45, mp: 12, type: 'buff', sec: 300, fx: { counter: 0.2 }, desc: '20% 機率反彈受到的傷害' },
        { id: 'knightVow',     name: '騎士誓約', lv: 52, mp: 12, type: 'buff', sec: 300, fx: { hit: 5, dmg: 4 }, desc: '命中 +5、傷害 +4' },
        { id: 'knightGuard',   name: '堅固防護', lv: 60, mp: 15, type: 'buff', sec: 300, fx: { reduce: 5 }, desc: '減傷 5' },
        { id: 'knightShield',  name: '盾擊',     lv: 66, mp: 10, type: 'strike', mult: 1.6, stun: 2500, cd: 14, desc: '1.6 倍傷害並暈眩 2.5 秒' },
        { id: 'knightWrath',   name: '騎士之怒', lv: 75, mp: 15, type: 'strike', mult: 2, aoe: true, cd: 8, desc: '範圍：2 倍傷害橫掃所有敵人' },
        { id: 'knightVerdict', name: '聖劍裁決', lv: 85, mp: 25, type: 'strike', mult: 3, aoe: true, cd: 15, desc: '範圍：3 倍傷害斬擊所有敵人（冷卻 15 秒）' },
    ],
    mage: [   // 法師的攻擊魔法都在共用魔法 1～10 級；專屬的只有被動與魔力回復
        { id: 'mageFocus',  name: '魔力集中', lv: 20, type: 'passive', fx: { sp: 1, mpRegen: 1 }, desc: '被動：SP +1、回魔 +1' },
        { id: 'mageMind',   name: '魔力精通', lv: 66, type: 'passive', fx: { sp: 3, mpRegen: 2 }, desc: '被動：SP +3、回魔 +2' },
    ],
    elf: [
        { id: 'elfShot',  name: '精靈之箭', lv: 8,  mp: 4,  type: 'strike', mult: 1.5, cd: 6, desc: '1.5 倍傷害一箭' },
        { id: 'elfWind',   name: '風之神射', lv: 15, mp: 10, type: 'buff', sec: 300, fx: { hit: 6, dmg: 3 }, desc: '命中 +6、傷害 +3' },
        { id: 'elfEarth',  name: '大地屏障', lv: 25, mp: 10, type: 'buff', sec: 300, fx: { ac: 5 }, desc: '防禦 +5' },
        { id: 'elfBless',  name: '精靈祝福', lv: 30, type: 'passive', fx: { dodge: 0.05, hit: 2 }, desc: '被動：閃避 +5%、命中 +2' },
        { id: 'elfTriple', name: '三重矢',   lv: 35, mp: 10, type: 'strike', mult: 1, hits: 3, spread: true, cd: 5, desc: '連射 3 箭，分散射向不同敵人' },
        { id: 'elfSpring', name: '生命之泉', lv: 45, mp: 15, type: 'buff', sec: 300, fx: { hpRegen: 8 }, desc: '回血 +8／5 秒' },
        { id: 'elfStorm',  name: '暴風神射', lv: 52, mp: 15, type: 'strike', mult: 1.1, hits: 4, spread: true, cd: 8, desc: '連射 4 箭，分散射向不同敵人' },
        { id: 'elfFire',   name: '烈炎之魂', lv: 60, mp: 20, type: 'buff', sec: 300, fx: { dmg: 6 }, desc: '傷害 +6' },
        { id: 'elfPierce', name: '穿透之箭', lv: 70, mp: 18, type: 'strike', mult: 2.6, ignoreAc: true, cd: 10, desc: '無視防禦的 2.6 倍一箭' },
        { id: 'elfRain',   name: '箭雨',     lv: 82, mp: 25, type: 'strike', mult: 1.5, aoe: true, cd: 10, desc: '範圍：箭雨覆蓋所有敵人（1.5 倍）' },
    ],
    darkelf: [
        { id: 'deStab',     name: '背刺',     lv: 5,  mp: 3,  type: 'strike', mult: 1.6, cd: 6, desc: '1.6 倍傷害一擊' },
        { id: 'deShadow',   name: '暗影閃避', lv: 15, mp: 10, type: 'buff', sec: 300, fx: { dodge: 0.12 }, desc: '閃避 +12%' },
        { id: 'dePoison',   name: '劇毒之刃', lv: 20, mp: 8,  type: 'strike', mult: 1.2, magic: { dmg: [8, 18], spK: 1 }, cd: 6, desc: '1.2 倍攻擊＋毒素魔法傷害' },
        { id: 'deBurn',     name: '燃燒鬥志', lv: 25, mp: 12, type: 'buff', sec: 300, fx: { crit: 0.12 }, desc: '爆擊 +12%' },
        { id: 'deFang',     name: '暗影之牙', lv: 35, mp: 15, type: 'buff', sec: 300, fx: { dmg: 5 }, desc: '傷害 +5' },
        { id: 'deBody',     name: '暗影之軀', lv: 40, type: 'passive', fx: { dodge: 0.05, crit: 0.03 }, desc: '被動：閃避 +5%、爆擊 +3%' },
        { id: 'deDouble',   name: '雙重破壞', lv: 45, mp: 18, type: 'buff', sec: 300, fx: { double: 0.2 }, desc: '雙擊率 +20%' },
        { id: 'deStorm',    name: '暗影風暴', lv: 52, mp: 15, type: 'strike', mult: 1, hits: 3, spread: true, cd: 8, desc: '連斬 3 下，分散打向周圍敵人' },
        { id: 'deAssassin', name: '暗殺',     lv: 60, mp: 20, type: 'strike', mult: 4, cd: 15, desc: '4 倍傷害一擊（單體）' },
        { id: 'deArmor',    name: '暗影鎧甲', lv: 70, mp: 20, type: 'buff', sec: 300, fx: { ac: 5, dodge: 0.08 }, desc: '防禦 +5、閃避 +8%' },
        { id: 'deNightmare', name: '夜魘',    lv: 85, mp: 30, type: 'strike', mult: 1.6, aoe: true, stun: 1500, cd: 15, desc: '範圍：1.6 倍傷害並暈眩所有敵人 1.5 秒' },
    ],
    shura: [
        { id: 'shuraPalm',     name: '爆裂掌',   lv: 5,  mp: 2,  type: 'strike', mult: 1.4, cd: 6, desc: '1.4 倍傷害一掌' },
        { id: 'shuraCombo',    name: '連擊',     lv: 10, mp: 6,  type: 'buff', sec: 300, fx: { double: 0.15 }, desc: '雙擊率 +15%' },
        { id: 'shuraIron',     name: '金剛體',   lv: 18, mp: 6,  type: 'buff', sec: 300, fx: { reduce: 3, ac: 3 }, desc: '減傷 3、防禦 +3' },
        { id: 'shuraBreak',    name: '破甲',     lv: 25, mp: 6,  type: 'strike', mult: 1.5, ignoreAc: true, cd: 6, desc: '無視防禦的 1.5 倍攻擊' },
        { id: 'shuraWhirl',    name: '旋風腿',   lv: 33, mp: 8,  type: 'strike', mult: 1.3, aoe: true, cd: 7, desc: '範圍：1.3 倍傷害踢向所有敵人' },
        { id: 'shuraRage',     name: '狂暴',     lv: 40, mp: 12, type: 'buff', sec: 300, fx: { spdMul: 0.15 }, desc: '攻速 +15%' },
        { id: 'shuraBlood',    name: '血戰',     lv: 48, type: 'passive', cond: 'lowHp', fx: { dmg: 8, lifesteal: 0.05 }, desc: '被動：HP 低於 50% 時傷害 +8、吸血 5%' },
        { id: 'shuraThousand', name: '千手破',   lv: 55, mp: 15, type: 'strike', mult: 0.9, hits: 4, spread: true, cd: 10, desc: '連打 4 下，分散打向周圍敵人' },
        { id: 'shuraFist',     name: '羅剎拳',   lv: 62, mp: 15, type: 'strike', mult: 2.8, cd: 12, desc: '2.8 倍傷害一拳' },
        { id: 'shuraWrath',    name: '修羅之怒', lv: 70, mp: 20, type: 'buff', sec: 120, fx: { dmg: 10, ac: -5 }, desc: '傷害 +10，但 防禦 -5' },
        { id: 'shuraAsura',    name: '阿修羅',   lv: 85, mp: 30, type: 'strike', mult: 1.2, hits: 6, spread: true, cd: 14, desc: '六臂連打 6 下，分散打向周圍敵人' },
    ],
    warrior: [
        { id: 'warStrike',  name: '重擊',     lv: 5,  mp: 2,  type: 'strike', mult: 1.5, cd: 6, desc: '1.5 倍傷害一擊' },
        { id: 'warSmash',   name: '粉碎',     lv: 10, mp: 4,  type: 'strike', mult: 1.3, aoe: true, cd: 6, desc: '範圍：1.3 倍傷害震擊所有敵人' },
        { id: 'warLeap',    name: '躍擊',     lv: 18, mp: 5,  type: 'strike', mult: 1.4, stun: 1500, cd: 10, desc: '1.4 倍傷害並暈眩 1.5 秒' },
        { id: 'warTough',   name: '堅韌',     lv: 25, mp: 5,  type: 'buff', sec: 300, fx: { reduce: 3 }, desc: '減傷 3' },
        { id: 'warIron',    name: '鋼鐵之軀', lv: 32, type: 'passive', fx: { ac: 3, reduce: 2 }, desc: '被動：防禦 +3、減傷 2' },
        { id: 'warBerserk', name: '狂怒',     lv: 40, type: 'passive', cond: 'lowHp', fx: { dmg: 8 }, desc: '被動：HP 低於 50% 時傷害 +8' },
        { id: 'warWhirl',   name: '旋風斬',   lv: 48, mp: 8,  type: 'strike', mult: 1.6, aoe: true, cd: 8, desc: '範圍：1.6 倍傷害橫掃所有敵人' },
        { id: 'warTitan',   name: '泰坦之力', lv: 55, type: 'passive', cond: 'lowHp', fx: { counter: 0.2 }, desc: '被動：HP 低於 50% 時 20% 反擊' },
        { id: 'warExecute', name: '處決',     lv: 62, mp: 12, type: 'strike', mult: 3, cd: 14, desc: '3 倍傷害一擊' },
        { id: 'warCry',     name: '戰吼',     lv: 70, mp: 10, type: 'buff', sec: 180, fx: { dmg: 8, hit: 5 }, desc: '傷害 +8、命中 +5' },
        { id: 'warQuake',   name: '大地崩裂', lv: 85, mp: 20, type: 'strike', mult: 2.4, aoe: true, stun: 2000, cd: 15, desc: '範圍：2.4 倍傷害並暈眩所有敵人 2 秒' },
    ],
    gunner: [
        { id: 'gunQuick',   name: '快速射擊', lv: 5,  mp: 3,  type: 'strike', mult: 1.3, cd: 5, desc: '1.3 倍傷害一槍' },
        { id: 'gunAim',     name: '精準射擊', lv: 10, mp: 8,  type: 'buff', sec: 300, fx: { hit: 8 }, desc: '命中 +8' },
        { id: 'gunBlast',   name: '爆裂彈',   lv: 20, mp: 8,  type: 'strike', mult: 1.8, cd: 6, desc: '1.8 倍傷害一槍' },
        { id: 'gunFlash',   name: '閃光彈',   lv: 28, mp: 10, type: 'strike', mult: 0.8, aoe: true, stun: 1500, cd: 14, desc: '範圍：0.8 倍傷害並暈眩所有敵人 1.5 秒' },
        { id: 'gunRapid',   name: '連射',     lv: 35, mp: 12, type: 'strike', mult: 0.9, hits: 3, spread: true, cd: 6, desc: '連射 3 發，分散射向不同敵人' },
        { id: 'gunSteady',  name: '穩定姿態', lv: 42, type: 'passive', fx: { crit: 0.05, hit: 3 }, desc: '被動：爆擊 +5%、命中 +3' },
        { id: 'gunSnipe',   name: '狙擊',     lv: 50, mp: 18, type: 'strike', mult: 3.5, cd: 15, desc: '3.5 倍傷害一槍' },
        { id: 'gunPierce',  name: '穿甲彈',   lv: 58, mp: 15, type: 'strike', mult: 2.2, ignoreAc: true, cd: 9, desc: '無視防禦的 2.2 倍一槍' },
        { id: 'gunBarrage', name: '彈幕',     lv: 65, mp: 20, type: 'buff', sec: 300, fx: { spdMul: 0.15 }, desc: '攻速 +15%' },
        { id: 'gunRocket',  name: '火箭砲',   lv: 72, mp: 22, type: 'strike', mult: 2, aoe: true, cd: 12, desc: '範圍：2 倍傷害炸向所有敵人' },
        { id: 'gunBullet',  name: '子彈時間', lv: 85, mp: 30, type: 'buff', sec: 120, fx: { spdMul: 0.2, crit: 0.1 }, desc: '攻速 +20%、爆擊 +10%（2 分鐘）' },
    ],
    magicfighter: [
        { id: 'mfSlash',   name: '魔刃',     lv: 5,  mp: 3,  type: 'strike', mult: 1.2, magic: { dmg: [4, 10], spK: 1 }, cd: 6, desc: '1.2 倍攻擊＋魔法傷害' },
        { id: 'mfEnchant', name: '魔力附加', lv: 10, mp: 10, type: 'buff', sec: 300, fx: { dmgSp: 1 }, desc: '傷害 + SP' },
        { id: 'mfThunder', name: '雷電斬',   lv: 20, mp: 10, type: 'strike', mult: 1.3, magic: { dmg: [10, 25], spK: 1.5 }, cd: 5, desc: '1.3 倍攻擊＋雷電魔法傷害' },
        { id: 'mfFlame',   name: '火焰斬',   lv: 28, mp: 12, type: 'strike', mult: 1.4, magic: { dmg: [18, 36], spK: 1.6 }, cd: 6, desc: '1.4 倍攻擊＋火焰魔法傷害' },
        { id: 'mfShield',  name: '法力護盾', lv: 35, mp: 15, type: 'buff', sec: 300, fx: { absorb: 0.3 }, desc: '30% 傷害改由 MP 承受' },
        { id: 'mfFocus',   name: '魔力凝聚', lv: 42, type: 'passive', fx: { sp: 2, mpRegen: 2 }, desc: '被動：SP +2、回魔 +2' },
        { id: 'mfBurst',   name: '元素爆發', lv: 50, mp: 25, type: 'spell', dmg: [50, 90], spK: 2.5, aoe: true, cd: 8, desc: '範圍：元素爆發打所有敵人（冷卻 8 秒）' },
        { id: 'mfStorm',   name: '雷霆風暴', lv: 60, mp: 25, type: 'strike', mult: 1.2, magic: { dmg: [30, 60], spK: 1.8 }, aoe: true, cd: 9, desc: '範圍：1.2 倍攻擊＋雷電魔法打所有敵人' },
        { id: 'mfAvatar',  name: '魔劍化身', lv: 72, mp: 25, type: 'buff', sec: 180, fx: { spdMul: 0.1, sp: 4 }, desc: '攻速 +10%、SP +4（3 分鐘）' },
        { id: 'mfCollapse', name: '天崩',    lv: 85, mp: 50, type: 'spell', dmg: [130, 200], spK: 3.5, aoe: true, cd: 12, desc: '範圍：天崩地裂打所有敵人（冷卻 12 秒）' },
    ],
    paladin: [
        { id: 'palStrike', name: '聖光打擊', lv: 8,  mp: 4,  type: 'strike', mult: 1.4, undeadMul: 1.5, cd: 6, desc: '1.4 倍攻擊，對不死系再 ×1.5' },
        { id: 'palShield', name: '聖盾',     lv: 15, mp: 10, type: 'buff', sec: 300, fx: { ac: 4, mr: 10 }, desc: '防禦 +4、MR +10' },
        { id: 'palHammer', name: '制裁之錘', lv: 25, mp: 10, type: 'strike', mult: 1.5, undeadMul: 2, cd: 6, desc: '1.5 倍攻擊，對不死系再 ×2' },
        { id: 'palAura',   name: '虔誠光環', lv: 40, type: 'passive', fx: { mr: 10, hpRegen: 3 }, desc: '被動：MR +10、回血 +3' },
        { id: 'palBless',  name: '神聖祝福', lv: 50, mp: 20, type: 'buff', sec: 300, fx: { hpRegen: 10, dmg: 3 }, desc: '回血 +10／5 秒、傷害 +3' },
        { id: 'palRighteous', name: '正義之怒', lv: 58, mp: 15, type: 'buff', sec: 300, fx: { dmg: 6, hit: 4 }, desc: '傷害 +6、命中 +4' },
        { id: 'palJudge',  name: '審判之光', lv: 65, mp: 30, type: 'spell', dmg: [65, 115], spK: 2.5, undeadMul: 1.5, aoe: true, cd: 10, desc: '範圍：神聖魔法打所有敵人，對不死系 ×1.5' },
        { id: 'palDivine', name: '神聖審判', lv: 82, mp: 30, type: 'strike', mult: 2.5, undeadMul: 2, aoe: true, cd: 14, desc: '範圍：2.5 倍攻擊所有敵人，對不死系再 ×2' },
    ],
    angel: [
        { id: 'holyBolt',    name: '聖光彈',     lv: 1,  mp: 3,  type: 'spell', dmg: [4, 9], spK: 1.1, desc: '基礎神聖魔法' },
        { id: 'angelAegis',  name: '神聖護盾',   lv: 12, mp: 10, type: 'buff', sec: 600, fx: { ac: 4, mr: 10 }, desc: '防禦 +4、MR +10（10 分鐘）' },
        { id: 'angelWings',  name: '天使之翼',   lv: 20, mp: 15, type: 'buff', sec: 300, fx: { dodge: 0.1, spdMul: 0.1 }, desc: '閃避 +10%、攻速 +10%' },
        { id: 'angelJudge',  name: '審判之光',   lv: 32, mp: 16, type: 'spell', dmg: [30, 52], spK: 2.2, undeadMul: 1.5, desc: '神聖魔法，對不死系再 ×1.5' },
        { id: 'angelGrace',  name: '神恩',       lv: 45, type: 'passive', fx: { hpRegen: 6, mpRegen: 3 }, desc: '被動：回血 +6、回魔 +3（每 5 秒）' },
        { id: 'angelRay',    name: '神聖射線',   lv: 54, mp: 20, type: 'spell', dmg: [60, 100], spK: 2.6, undeadMul: 1.5, cd: 4, desc: '神聖光線，對不死系再 ×1.5' },
        { id: 'angelWrath',  name: '天罰',       lv: 60, mp: 45, type: 'spell', dmg: [90, 140], spK: 3, aoe: true, cd: 6, desc: '範圍：降下天罰打所有敵人（冷卻 6 秒）' },
        { id: 'angelSeraph', name: '熾天使降臨', lv: 75, mp: 40, type: 'buff', sec: 180, fx: { dmg: 8, sp: 6, ac: 5 }, desc: '傷害 +8、SP +6、防禦 +5（3 分鐘）' },
        { id: 'angelSanct',  name: '聖域',       lv: 85, mp: 60, type: 'spell', dmg: [140, 210], spK: 3.5, undeadMul: 1.5, aoe: true, cd: 10, desc: '範圍：聖域淨化所有敵人，對不死系 ×1.5' },
    ],
    demon: [
        { id: 'demonThirst',    name: '血之渴望', lv: 1,  type: 'passive', fx: { lifesteal: 0.05 }, desc: '被動：造成傷害的 5% 轉為 HP' },
        { id: 'demonSlash',     name: '暗影斬',   lv: 10, mp: 4,  type: 'strike', mult: 1.6, cd: 6, desc: '1.6 倍傷害一擊' },
        { id: 'demonPact',      name: '深淵契約', lv: 20, mp: 8,  type: 'buff', sec: 300, fx: { dmg: 5, lifesteal: 0.05 }, desc: '傷害 +5、吸血 +5%' },
        { id: 'demonSkin',      name: '魔化皮膚', lv: 25, type: 'passive', fx: { reduce: 2, ac: 2 }, desc: '被動：減傷 2、防禦 +2' },
        { id: 'demonFear',      name: '恐懼之眼', lv: 30, mp: 8,  type: 'strike', mult: 1, stun: 2500, cd: 14, desc: '攻擊並使敵人恐懼 2.5 秒（無法行動）' },
        { id: 'demonBloodlust', name: '狂血',     lv: 40, type: 'passive', cond: 'lowHp', fx: { dmg: 10, spdMul: 0.15 }, desc: '被動：HP 低於 50% 時傷害 +10、攻速 +15%' },
        { id: 'demonHellfire',  name: '地獄火',   lv: 50, mp: 15, type: 'strike', mult: 1, magic: { dmg: [32, 64], spK: 1.6 }, aoe: true, cd: 8, desc: '範圍：攻擊所有敵人＋地獄火魔法傷害' },
        { id: 'demonDrain',     name: '生命汲取', lv: 58, mp: 18, type: 'spell', dmg: [50, 90], spK: 2, cd: 6, desc: '暗黑魔法，傷害可被吸血轉為 HP' },
        { id: 'demonLord',      name: '魔王覺醒', lv: 70, mp: 20, type: 'buff', sec: 180, fx: { dmg: 12, lifesteal: 0.1, ac: -3 }, desc: '傷害 +12、吸血 +10%，但 防禦 -3' },
        { id: 'demonDoom',      name: '末日',     lv: 85, mp: 30, type: 'strike', mult: 2.2, magic: { dmg: [80, 140], spK: 2.5 }, aoe: true, cd: 14, desc: '範圍：2.2 倍攻擊＋末日魔法打所有敵人' },
    ],
};

// 全部技能的索引：kind＝'magic'（共用魔法，看 tier）或 'class'（職業專屬，看 cls、lv）
const SKILL_BY_ID = {};
for (const s of MAGIC) { s.kind = 'magic'; SKILL_BY_ID[s.id] = s; }
for (const cls in SKILLS) for (const s of SKILLS[cls]) { s.kind = 'class'; s.cls = cls; SKILL_BY_ID[s.id] = s; }

function findSkill(id) {
    return SKILL_BY_ID[id] || findResonanceSkill(id);   // 共鳴武器的增益（resonance.js，執行期才會呼叫）
}
// 這個職業學這招需要的角色等級；學不了回傳 0
function skillNeedLv(s, cls) {
    if (!s) return 0;
    if (s.kind === 'magic') { const m = MAGIC_CLASS[cls]; return m && s.tier <= m.max ? m.lv[s.tier - 1] : 0; }
    return s.cls === cls ? s.lv : 0;
}
// 這個職業能學的全部技能：共用魔法（依級數）在前、職業技能（依等級）在後
function classSkillList(cls) {
    return [...MAGIC.filter(s => skillNeedLv(s, cls)), ...(SKILLS[cls] || [])];
}
