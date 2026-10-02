// 屬性計算：裝備加成、靈根判定、戰力/氣血/靈力/升級門檻公式

// 加總所有已穿戴裝備的屬性：四維＋魅力，以及戰鬥屬性（減傷/閃避/冰火毒金雷，單位 %，見 config-elements.js）
const EQUIP_STAT_KEYS = ["str", "con", "int", "spr", "cha", "def", "eva", "ice", "fire", "poison", "metal", "thunder"];

const BASE_STAT_KEYS = ["str", "con", "int", "spr", "cha"];

function getEquipBonus() {
    let bonus = {};
    EQUIP_STAT_KEYS.forEach(k => { bonus[k] = 0; });
    for (let key in player.equipment) {
        let eq = player.equipment[key];
        if (eq && eq.stats) {
            let m = getEnhanceMult(eq) * getProfWeaponMult(key);   // 強化：四維 × (1 + 等級 × 5%)（gear.js）；主修職業的武器另有加成（profession.js）
            EQUIP_STAT_KEYS.forEach(k => {
                let v = eq.stats[k] || 0;
                bonus[k] += BASE_STAT_KEYS.includes(k) ? Math.floor(v * m) : v;
            });
        }
        // 橙裝孔位上鑲嵌的符寶（talisman.js）
        let socket = getSocketStats(eq);
        for (let k in socket) bonus[k] = (bonus[k] || 0) + socket[k];
    }
    // 隨機詞條、套裝、稱號、職業被動（gear.js 的 getBonusTotals）：戰鬥屬性直接加；四維 % 以「本身＋裝備」的總量計
    let extra = getBonusTotals();
    ["def", "eva", "ice", "fire", "poison", "metal", "thunder"].forEach(k => { if (extra[k]) bonus[k] += extra[k]; });
    BASE_STAT_KEYS.forEach(k => {
        let pct = (extra[k + "Pct"] || 0) + (k !== "cha" ? extra.statPct || 0 : 0);
        if (pct) bonus[k] += Math.floor(((player.stats[k] || 0) + bonus[k]) * pct);
    });
    return bonus;
}

// 已穿戴裝備（神器不列入五行計算）各五行的件數
function getElementCounts() {
    let counts = {};
    wuxingElements.forEach(e => { counts[e] = 0; });
    for (let key in player.equipment) {
        if (equipTypes[key] === "artifact") continue;
        let eq = player.equipment[key];
        if (eq && counts[eq.element] !== undefined) counts[eq.element]++;
    }
    return counts;
}

// 目前啟動的靈根（判定規則見 config-equipment.js）
// 回傳 { counts, sets, rest, singles: ["火", …], special: {name, icon, effect, bonus} | null }
function getSpiritRoots() {
    let counts = getElementCounts();
    let sets = Math.min(...wuxingElements.map(e => counts[e]));
    let rest = {};
    wuxingElements.forEach(e => { rest[e] = counts[e] - sets; });

    let singles = wuxingElements.filter(e => counts[e] >= ROOT_SINGLE_COUNT);

    let special = null;
    if (sets >= ROOT_SUPREME_SETS) {
        special = supremeRootEffect;
    } else if (sets >= ROOT_PURE_SETS) {
        let pure = wuxingElements.find(e => rest[e] >= ROOT_PURE_REST);
        if (pure) special = pureRootEffects[pure];
    }
    if (!special && sets >= ROOT_DUAL_SETS) {
        let pair = wuxingElements.filter(e => rest[e] >= ROOT_DUAL_REST);
        if (pair.length >= 2) {
            let def = dualRootEffects[pair[0] + "+" + pair[1]];
            // 金＋水依件數較多者決定（相同則視為主金），其餘組合不分主副
            if (def && def.byMain) def = def.byMain[rest[pair[1]] > rest[pair[0]] ? pair[1] : pair[0]];
            if (def) special = def;
        }
    }
    return { counts, sets, rest, singles, special };
}

// 所有生效靈根的加成總和：倍率相乘、數值相加、旗標取最高
function getRootBonus() {
    let roots = getSpiritRoots();
    let list = roots.singles.map(e => wuxingArrayEffects[e].bonus);
    if (roots.special) list.push(roots.special.bonus);

    let b = { atkMult: 1, hpMult: 1, conMult: 1, skillMult: 1, healMult: 1,
              def: 0, ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0,
              regen: 0, freezeResist: 0, burnMax: 0, poisonMax: 0, ignoreCounter: false };
    list.forEach(bonus => {
        if (!bonus) return;
        ["atkMult", "hpMult", "conMult", "skillMult", "healMult"].forEach(k => { if (bonus[k]) b[k] *= bonus[k]; });
        ["def", "ice", "fire", "poison", "metal", "thunder", "regen"].forEach(k => { if (bonus[k]) b[k] += bonus[k]; });
        ["freezeResist", "burnMax", "poisonMax"].forEach(k => { if (bonus[k]) b[k] = Math.max(b[k], bonus[k]); });
        if (bonus.ignoreCounter) b.ignoreCounter = true;
    });
    return b;
}

// 本命五行（五行相剋用）：已穿戴裝備（不含神器）中數量最多的五行；
// 同數時取部位順序（equipTypes，武器在前）中最先出現者。沒穿任何裝備則為 null（不參與相剋）。
function getPlayerElement() {
    // 五行偏好的元神：本命五行鎖定為元神屬性（yuanshen.js）
    const ys = typeof getYuanshenElement === 'function' ? getYuanshenElement() : null;
    if (ys) return ys;
    let counts = {};
    let order = [];
    for (let key of Object.keys(equipTypes)) {
        if (equipTypes[key] === "artifact") continue;
        let eq = player.equipment[key];
        if (!eq || !WUXING_COUNTERS[eq.element]) continue;
        if (!counts[eq.element]) { counts[eq.element] = 0; order.push(eq.element); }
        counts[eq.element]++;
    }
    let best = null;
    order.forEach(e => { if (best === null || counts[e] > counts[best]) best = e; });
    return best;
}

// 大境界每一階的經驗基數：依 config-realms.js 的 realmPacing 換算，讓「在主要地圖掛機 hours 小時」剛好修滿 10 階
//   基數 = hours × 3600 × 每秒經驗（地圖 expRate × 15 × 每秒擊殺數 × 估算加成）÷ 55，取 2 位有效數字
let realmStageExpCache = [];
function getRealmStageExp(realmIndex) {
    if (realmStageExpCache[realmIndex]) return realmStageExpCache[realmIndex];
    let pace = realmPacing[realmIndex] || realmPacing[realmPacing.length - 1];
    let map = null;
    maps.forEach(cat => cat.items.forEach(m => { if (m.name === pace.map) map = m; }));
    let expPerSec = (map ? map.expRate : 1) * 15 * REALM_PACING_KILLS_PER_SEC * pace.expMult;
    let base = pace.hours * 3600 * expPerSec / 55;
    let mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(base)) - 1));
    realmStageExpCache[realmIndex] = Math.max(1, Math.round(base / mag) * mag);
    return realmStageExpCache[realmIndex];
}

function getNextExp() { return getRealmStageExp(player.realmIndex) * player.stage; }

// 人物等級：從 level 升到 level+1 所需的經驗（見 config-level.js）
function getLevelExpNeeded(level) {
    let coef = LEVEL_EXP_SEGMENTS[0].coef;
    for (let seg of LEVEL_EXP_SEGMENTS) {
        if (level >= seg.minLevel) coef = seg.coef;
    }
    return Math.floor(coef * Math.pow(level, 1.5));
}

// 是否擁有「出戰中」的指定靈寵（死亡或召回休息的靈寵不提供被動加成，見 beast-combat.js 的 isBeastActive）
function hasLiveBeast(id) {
    return player.beasts.some(b => b.id === id && isBeastActive(b));
}

function getBasePower() {
    // 修為進度加成：沿用舊版「exp / 100」的最大值（舊曲線滿格時 = 2×10^境界×階數，凡人為 1×階數），
    // 改依進度百分比計算，經驗曲線調整後戰力曲線維持不變
    let progress = Math.min(1, player.exp / getNextExp());
    let base = Math.pow(10, player.realmIndex) * 5 * player.stage
             + progress * (player.realmIndex === 0 ? 1 : 2 * Math.pow(10, player.realmIndex)) * player.stage;
    if (hasLiveBeast('wolf')) base *= 1.15;
    if (hasLiveBeast('dragon')) base *= 1.3;
    return base;
}

// 虛弱（渡劫失敗後、升回 10 階前）：攻擊與氣血／靈力上限的倍率，見 config-tribulation.js
function getWeaknessMult() {
    return player.weakened ? WEAKNESS_STAT_MULT : 1;
}

function getPhysAttack() {
    if (NUMERIC_V2) return nv2PhysAttack();   // 新制（numeric.js，第 52 節）
    let eqBonus = getEquipBonus();
    let totalStr = player.stats.str + eqBonus.str;
    let base = getBasePower() * (player.sect ? player.sect.powerMult : 1.0) + (totalStr * 5);
    base *= getRootBonus().atkMult;
    base *= Math.max(0.1, 1 + getSpellAuraBonus().physPct);   // 仙法被動光環（spells.js）
    base *= 1 + getGearPctBonus('phys');   // 裝備詞條、套裝、稱號、職業的攻擊 %（gear.js）
    if (player.buffTimer > 0) base *= player.buffMult;
    if (petBuffTimer > 0) base *= petBuffMult;
    base *= getDuelWeakenMult();   // 懸賞對決中被「化功」（bounty.js）
    return Math.floor(base * getWeaknessMult());
}

function getMagAttack() {
    if (NUMERIC_V2) return nv2MagAttack();
    let eqBonus = getEquipBonus();
    let totalInt = player.stats.int + eqBonus.int;
    let base = getBasePower() * (player.sect ? player.sect.powerMult : 1.0) + (totalInt * 5);
    base *= getRootBonus().atkMult;
    base *= Math.max(0.1, 1 + getSpellAuraBonus().magPct);   // 仙法被動光環（spells.js）
    base *= 1 + getGearPctBonus('mag');   // 裝備詞條、套裝、稱號、職業的攻擊 %（gear.js）
    if (player.buffTimer > 0) base *= player.buffMult;
    if (petBuffTimer > 0) base *= petBuffMult;
    base *= getDuelWeakenMult();   // 懸賞對決中被「化功」（bounty.js）
    return Math.floor(base * getWeaknessMult());
}

function getMaxHp() {
    if (NUMERIC_V2) return nv2MaxHp();
    let eqBonus = getEquipBonus();
    let totalCon = player.stats.con + eqBonus.con;
    let root = getRootBonus();
    totalCon *= root.conMult;
    let baseHp = Math.floor(getBasePower() * 20 * (player.sect ? player.sect.powerMult : 1.0) + (totalCon * 10));
    baseHp = Math.floor(baseHp * root.hpMult * Math.max(0.1, 1 + getSpellAuraBonus().hpPct) * (1 + getGearPctBonus('hp')));
    return Math.floor((baseHp + (player.level - 1) * LEVEL_UP_HP_GAIN + getReincarnateBonus().hp) * getWeaknessMult());
}

function getMaxMp() {
    if (NUMERIC_V2) return nv2MaxMp();
    let eqBonus = getEquipBonus();
    let totalSpr = player.stats.spr + eqBonus.spr;
    let baseMp = Math.floor((50 + totalSpr * 10) * Math.max(0.1, 1 + getSpellAuraBonus().mpPct) * (1 + (getBonusTotals().mpPct || 0)));   // mpPct：金丹品級（golden-core.js）
    return Math.floor((baseMp + (player.level - 1) * LEVEL_UP_MP_GAIN + getReincarnateBonus().mp) * getWeaknessMult());
}

// 轉世保留的氣血／靈力上限（leveling.js 的 triggerReincarnate 寫入），舊存檔沒有此欄位視為 0
function getReincarnateBonus() {
    let b = player.reincarnateBonus || {};
    return { hp: b.hp || 0, mp: b.mp || 0 };
}

// 依目前宗門分級（凡俗 1 / 修真 2 / 至高 3），供任務獎勵與門檻判斷使用
function getSectTier() {
    if (!player.sect) return 1;
    let sect = findSectByName(player.sect.name);
    return sect ? sect.tier : 1;
}

// 目前可施展的所有技能：各階段已學的宗門技能（初級→高級）+ 靈寶閣習得的禁術
function getAllSkills() {
    let skills = [];
    for (let tier of [1, 2, 3]) {
        let sect = player.sectSkills && player.sectSkills[tier] ? findSectByName(player.sectSkills[tier]) : null;
        if (sect) skills = skills.concat(sect.skills);
    }
    if (player.learnedSkills) skills = skills.concat(player.learnedSkills);
    // 技能格內的主動仙法（spells.js）
    skills = skills.concat(getEquippedSpells().map(spellToCombatSkill));
    return skills;
}
