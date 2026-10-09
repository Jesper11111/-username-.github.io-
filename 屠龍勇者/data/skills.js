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

const COMMON_SKILLS = {
    heal1:      { name: '初級治癒術', mp: 5,  type: 'heal', heal: [12, 20],  spK: 2, desc: '回復少量 HP' },
    heal2:      { name: '中級治癒術', mp: 12, type: 'heal', heal: [40, 60],  spK: 3, desc: '回復中量 HP' },
    heal3:      { name: '高級治癒術', mp: 22, type: 'heal', heal: [90, 130], spK: 4, desc: '回復大量 HP' },
    armorBless: { name: '鎧甲護持',   mp: 8,  type: 'buff', sec: 600, fx: { ac: 3 }, desc: 'AC -3（10 分鐘）' },
};
function commonSkill(id, lv) { return { id, lv, ...COMMON_SKILLS[id] }; }

const SKILLS = {
    royal: [
        commonSkill('heal1', 4),
        { id: 'royalAim',    name: '精準目標', lv: 10, mp: 8,  type: 'buff', sec: 300, fx: { hit: 5, dmg: 2 }, desc: '命中 +5、傷害 +2' },
        { id: 'royalMorale', name: '激勵士氣', lv: 25, mp: 15, type: 'buff', sec: 300, fx: { dmg: 4, hit: 3 }, desc: '傷害 +4、命中 +3' },
        commonSkill('heal2', 30),
        { id: 'royalIron',   name: '鋼鐵士氣', lv: 40, mp: 20, type: 'buff', sec: 300, fx: { ac: 6, reduce: 3 }, desc: 'AC -6、減傷 3' },
        { id: 'royalImpact', name: '衝擊士氣', lv: 55, mp: 25, type: 'buff', sec: 300, fx: { spdMul: 0.15, dmg: 5 }, desc: '攻速 +15%、傷害 +5' },
        { id: 'royalWrath',  name: '王者之怒', lv: 70, mp: 25, type: 'strike', mult: 2.2, aoe: true, cd: 10, desc: '範圍：2.2 倍傷害橫掃所有敵人（冷卻 10 秒）' },
    ],
    knight: [
        { id: 'knightStun',    name: '衝擊之暈', lv: 15, mp: 6,  type: 'strike', mult: 1.2, stun: 2000, cd: 12, desc: '1.2 倍傷害並暈眩 2 秒' },
        { id: 'knightSolid',   name: '增幅防禦', lv: 30, mp: 10, type: 'buff', sec: 300, fx: { ac: 5 }, desc: 'AC -5' },
        { id: 'knightCounter', name: '反擊屏障', lv: 45, mp: 12, type: 'buff', sec: 300, fx: { counter: 0.2 }, desc: '20% 機率反彈受到的傷害' },
        { id: 'knightGuard',   name: '堅固防護', lv: 60, mp: 15, type: 'buff', sec: 300, fx: { reduce: 5 }, desc: '減傷 5' },
        { id: 'knightWrath',   name: '騎士之怒', lv: 75, mp: 15, type: 'strike', mult: 2, aoe: true, cd: 8, desc: '範圍：2 倍傷害橫掃所有敵人' },
    ],
    mage: [
        { id: 'energyBolt', name: '光箭',     lv: 1,  mp: 3,  type: 'spell', dmg: [3, 8],     spK: 1,   desc: '基礎攻擊魔法' },
        commonSkill('heal1', 4),
        { id: 'iceDagger',  name: '冰箭',     lv: 8,  mp: 5,  type: 'spell', dmg: [8, 16],    spK: 1.2, desc: '冰屬性攻擊魔法' },
        { id: 'meditate',   name: '冥想術',   lv: 10, mp: 5,  type: 'buff', sec: 600, fx: { mpRegen: 5 }, desc: '回魔 +5／5 秒' },
        commonSkill('armorBless', 12),
        { id: 'fireball',   name: '火球術',   lv: 16, mp: 9,  type: 'spell', dmg: [16, 28],   spK: 1.6, desc: '火屬性攻擊魔法' },
        commonSkill('heal2', 20),
        { id: 'lightning',  name: '極道落雷', lv: 24, mp: 14, type: 'spell', dmg: [26, 44],   spK: 2,   desc: '雷屬性攻擊魔法' },
        { id: 'haste',      name: '加速術',   lv: 28, mp: 20, type: 'buff', sec: 600, group: 'haste', fx: { haste: true }, desc: '攻速提升（與綠水同效果）' },
        { id: 'blaze',      name: '烈炎術',   lv: 36, mp: 20, type: 'spell', dmg: [40, 68],   spK: 2.5, desc: '高階火焰魔法' },
        commonSkill('heal3', 40),
        { id: 'blizzard',   name: '冰雪暴',   lv: 48, mp: 30, type: 'spell', dmg: [50, 80],   spK: 2.5, aoe: true, desc: '範圍：冰雪覆蓋所有敵人' },
        { id: 'meteor',     name: '流星雨',   lv: 60, mp: 45, type: 'spell', dmg: [85, 135],  spK: 3,   aoe: true, desc: '範圍：最強攻擊魔法，打所有敵人' },
    ],
    elf: [
        commonSkill('heal1', 4),
        { id: 'elfWind',   name: '風之神射', lv: 15, mp: 10, type: 'buff', sec: 300, fx: { hit: 6, dmg: 3 }, desc: '命中 +6、傷害 +3' },
        { id: 'elfEarth',  name: '大地屏障', lv: 25, mp: 10, type: 'buff', sec: 300, fx: { ac: 5 }, desc: 'AC -5' },
        { id: 'elfTriple', name: '三重矢',   lv: 35, mp: 10, type: 'strike', mult: 1, hits: 3, spread: true, cd: 5, desc: '連射 3 箭，分散射向不同敵人' },
        { id: 'elfSpring', name: '生命之泉', lv: 45, mp: 15, type: 'buff', sec: 300, fx: { hpRegen: 8 }, desc: '回血 +8／5 秒' },
        { id: 'elfFire',   name: '烈炎之魂', lv: 60, mp: 20, type: 'buff', sec: 300, fx: { dmg: 6 }, desc: '傷害 +6' },
    ],
    darkelf: [
        { id: 'deShadow',   name: '暗影閃避', lv: 15, mp: 10, type: 'buff', sec: 300, fx: { dodge: 0.12 }, desc: '閃避 +12%' },
        { id: 'deBurn',     name: '燃燒鬥志', lv: 25, mp: 12, type: 'buff', sec: 300, fx: { crit: 0.12 }, desc: '爆擊 +12%' },
        { id: 'deFang',     name: '暗影之牙', lv: 35, mp: 15, type: 'buff', sec: 300, fx: { dmg: 5 }, desc: '傷害 +5' },
        { id: 'deDouble',   name: '雙重破壞', lv: 45, mp: 18, type: 'buff', sec: 300, fx: { double: 0.2 }, desc: '雙擊率 +20%' },
        { id: 'deAssassin', name: '暗殺',     lv: 60, mp: 20, type: 'strike', mult: 4, cd: 15, desc: '4 倍傷害一擊（單體）' },
    ],
    shura: [
        { id: 'shuraCombo',    name: '連擊',     lv: 10, mp: 6,  type: 'buff', sec: 300, fx: { double: 0.15 }, desc: '雙擊率 +15%' },
        { id: 'shuraBreak',    name: '破甲',     lv: 25, mp: 6,  type: 'strike', mult: 1.5, ignoreAc: true, cd: 6, desc: '無視防禦的 1.5 倍攻擊' },
        { id: 'shuraRage',     name: '狂暴',     lv: 40, mp: 12, type: 'buff', sec: 300, fx: { spdMul: 0.15 }, desc: '攻速 +15%' },
        { id: 'shuraThousand', name: '千手破',   lv: 55, mp: 15, type: 'strike', mult: 0.9, hits: 4, spread: true, cd: 10, desc: '連打 4 下，分散打向周圍敵人' },
        { id: 'shuraWrath',    name: '修羅之怒', lv: 70, mp: 20, type: 'buff', sec: 120, fx: { dmg: 10, ac: -5 }, desc: '傷害 +10，但 AC +5' },
    ],
    warrior: [
        { id: 'warSmash',   name: '粉碎',     lv: 10, mp: 4,  type: 'strike', mult: 1.3, aoe: true, cd: 6, desc: '範圍：1.3 倍傷害震擊所有敵人' },
        { id: 'warTough',   name: '堅韌',     lv: 25, mp: 5,  type: 'buff', sec: 300, fx: { reduce: 3 }, desc: '減傷 3' },
        { id: 'warBerserk', name: '狂怒',     lv: 40, type: 'passive', cond: 'lowHp', fx: { dmg: 8 }, desc: '被動：HP 低於 50% 時傷害 +8' },
        { id: 'warTitan',   name: '泰坦之力', lv: 55, type: 'passive', cond: 'lowHp', fx: { counter: 0.2 }, desc: '被動：HP 低於 50% 時 20% 反擊' },
        { id: 'warCry',     name: '戰吼',     lv: 70, mp: 10, type: 'buff', sec: 180, fx: { dmg: 8, hit: 5 }, desc: '傷害 +8、命中 +5' },
    ],
    gunner: [
        { id: 'gunAim',     name: '精準射擊', lv: 10, mp: 8,  type: 'buff', sec: 300, fx: { hit: 8 }, desc: '命中 +8' },
        { id: 'gunBlast',   name: '爆裂彈',   lv: 20, mp: 8,  type: 'strike', mult: 1.8, cd: 6, desc: '1.8 倍傷害一槍' },
        { id: 'gunRapid',   name: '連射',     lv: 35, mp: 12, type: 'strike', mult: 0.9, hits: 3, spread: true, cd: 6, desc: '連射 3 發，分散射向不同敵人' },
        { id: 'gunSnipe',   name: '狙擊',     lv: 50, mp: 18, type: 'strike', mult: 3.5, cd: 15, desc: '3.5 倍傷害一槍' },
        { id: 'gunBarrage', name: '彈幕',     lv: 65, mp: 20, type: 'buff', sec: 300, fx: { spdMul: 0.15 }, desc: '攻速 +15%' },
    ],
    magicfighter: [
        { id: 'mfEnchant', name: '魔力附加', lv: 10, mp: 10, type: 'buff', sec: 300, fx: { dmgSp: 1 }, desc: '傷害 + SP' },
        commonSkill('armorBless', 12),
        { id: 'mfThunder', name: '雷電斬',   lv: 20, mp: 10, type: 'strike', mult: 1.3, magic: { dmg: [10, 25], spK: 1.5 }, cd: 5, desc: '1.3 倍攻擊＋雷電魔法傷害' },
        { id: 'mfShield',  name: '法力護盾', lv: 35, mp: 15, type: 'buff', sec: 300, fx: { absorb: 0.3 }, desc: '30% 傷害改由 MP 承受' },
        { id: 'mfBurst',   name: '元素爆發', lv: 50, mp: 25, type: 'spell', dmg: [50, 90], spK: 2.5, aoe: true, cd: 8, desc: '範圍：元素爆發打所有敵人（冷卻 8 秒）' },
    ],
    paladin: [
        commonSkill('heal1', 4),
        { id: 'palShield', name: '聖盾',     lv: 15, mp: 10, type: 'buff', sec: 300, fx: { ac: 4, mr: 10 }, desc: 'AC -4、MR +10' },
        { id: 'palHammer', name: '制裁之錘', lv: 25, mp: 10, type: 'strike', mult: 1.5, undeadMul: 2, cd: 6, desc: '1.5 倍攻擊，對不死系再 ×2' },
        commonSkill('heal2', 35),
        { id: 'palBless',  name: '神聖祝福', lv: 50, mp: 20, type: 'buff', sec: 300, fx: { hpRegen: 10, dmg: 3 }, desc: '回血 +10／5 秒、傷害 +3' },
        { id: 'palJudge',  name: '審判之光', lv: 65, mp: 30, type: 'spell', dmg: [65, 115], spK: 2.5, undeadMul: 1.5, aoe: true, cd: 10, desc: '範圍：神聖魔法打所有敵人，對不死系 ×1.5' },
    ],
    angel: [
        { id: 'holyBolt',    name: '聖光彈',     lv: 1,  mp: 3,  type: 'spell', dmg: [4, 9], spK: 1.1, desc: '基礎神聖魔法' },
        commonSkill('heal1', 4),
        { id: 'angelAegis',  name: '神聖護盾',   lv: 12, mp: 10, type: 'buff', sec: 600, fx: { ac: 4, mr: 10 }, desc: 'AC -4、MR +10（10 分鐘）' },
        { id: 'angelWings',  name: '天使之翼',   lv: 20, mp: 15, type: 'buff', sec: 300, fx: { dodge: 0.1, spdMul: 0.1 }, desc: '閃避 +10%、攻速 +10%' },
        commonSkill('heal2', 25),
        { id: 'angelJudge',  name: '審判之光',   lv: 32, mp: 16, type: 'spell', dmg: [30, 52], spK: 2.2, undeadMul: 1.5, desc: '神聖魔法，對不死系再 ×1.5' },
        { id: 'angelGrace',  name: '神恩',       lv: 45, type: 'passive', fx: { hpRegen: 6, mpRegen: 3 }, desc: '被動：回血 +6、回魔 +3（每 5 秒）' },
        commonSkill('heal3', 50),
        { id: 'angelWrath',  name: '天罰',       lv: 60, mp: 45, type: 'spell', dmg: [90, 140], spK: 3, aoe: true, cd: 6, desc: '範圍：降下天罰打所有敵人（冷卻 6 秒）' },
        { id: 'angelSeraph', name: '熾天使降臨', lv: 75, mp: 40, type: 'buff', sec: 180, fx: { dmg: 8, sp: 6, ac: 5 }, desc: '傷害 +8、SP +6、AC -5（3 分鐘）' },
    ],
    demon: [
        { id: 'demonThirst',    name: '血之渴望', lv: 1,  type: 'passive', fx: { lifesteal: 0.05 }, desc: '被動：造成傷害的 5% 轉為 HP' },
        { id: 'demonSlash',     name: '暗影斬',   lv: 10, mp: 4,  type: 'strike', mult: 1.6, cd: 6, desc: '1.6 倍傷害一擊' },
        { id: 'demonPact',      name: '深淵契約', lv: 20, mp: 8,  type: 'buff', sec: 300, fx: { dmg: 5, lifesteal: 0.05 }, desc: '傷害 +5、吸血 +5%' },
        { id: 'demonFear',      name: '恐懼之眼', lv: 30, mp: 8,  type: 'strike', mult: 1, stun: 2500, cd: 14, desc: '攻擊並使敵人恐懼 2.5 秒（無法行動）' },
        { id: 'demonBloodlust', name: '狂血',     lv: 40, type: 'passive', cond: 'lowHp', fx: { dmg: 10, spdMul: 0.15 }, desc: '被動：HP 低於 50% 時傷害 +10、攻速 +15%' },
        { id: 'demonHellfire',  name: '地獄火',   lv: 50, mp: 15, type: 'strike', mult: 1, magic: { dmg: [32, 64], spK: 1.6 }, aoe: true, cd: 8, desc: '範圍：攻擊所有敵人＋地獄火魔法傷害' },
        { id: 'demonLord',      name: '魔王覺醒', lv: 70, mp: 20, type: 'buff', sec: 180, fx: { dmg: 12, lifesteal: 0.1, ac: -3 }, desc: '傷害 +12、吸血 +10%，但 AC +3' },
    ],
};

function findSkill(id) {
    for (const cls in SKILLS) {
        const s = SKILLS[cls].find(k => k.id === id);
        if (s) return s;
    }
    return null;
}
