// 野外妖獸的型態與出沒組合（設定在 config-monsters.js；ARCHITECTURE.md 第 66 節第 2 期）
//   combat.js 刷怪時 pickFieldMonster 抽圖鑑、applyMonsterType 套型態；race.js 的種族比例、numeric.js 的收益補償與離線估算讀 fieldMonsterPool／fieldMonsterRoundsFactor

const FIELD_MONSTER_BY_ID = {};
FIELD_MONSTERS.forEach(m => { FIELD_MONSTER_BY_ID[m.id] = m; });

function monsterTypeOf(m) { return MONSTER_TYPES[(m && m.type) || 'balanced'] || MONSTER_TYPES.balanced; }
function monsterTypeTag(m) { const t = monsterTypeOf(m); return `${t.icon}${t.name}`; }

// 這張地圖會出現的妖獸 [{ m, w }]：有 FIELD_MONSTER_POOLS 用它，沒有就用舊規則（幽冥禁域只出鬼物，其餘出妖獸與鬼物）
function fieldMonsterPool(map) {
    const list = map && FIELD_MONSTER_POOLS[map.name];
    if (list) return list.map(([id, w]) => ({ m: FIELD_MONSTER_BY_ID[id], w })).filter(x => x.m);
    const dark = map && DARK_MAP_CATEGORIES.includes(getMapCategoryIndex(map.name));
    return FIELD_MONSTERS.filter(m => dark ? m.race === 'ghost' : m.race !== 'demon').map(m => ({ m, w: 1 }));
}
function pickFieldMonster(map) {
    const pool = fieldMonsterPool(map);
    let r = Math.random() * pool.reduce((s, x) => s + x.w, 0);
    for (const x of pool) { r -= x.w; if (r < 0) return x.m; }
    return pool[pool.length - 1].m;
}

// 型態對「一般玩家殺一隻要幾回合」的倍率（均衡型 = 1）：氣血 × 減傷差 × 額外閃避；d0＝地圖分類的減傷 %
function monsterTypeRounds(t, d0) {
    const d = Math.max(0, d0 + t.def);
    return t.hp * (1 - d0 / 100) / (1 - d / 100) / (1 - t.eva / 100);
}
// 技能的補償倍率（config-monsters.js 的 MONSTER_SKILLS[].comp，第 3 期）：該圖鑑所有技能相乘。
//   comp 是「只有這一招」時量的；有 n 招主動技能時每招只有 1/n 的出手機會，所以效果按 1/n 折算（狂暴是被動，不折）
function monsterSkillComp(m, key) {
    const sk = ((m && m.skills) || []).filter(k => MONSTER_SKILLS[k]);
    const n = sk.filter(k => k !== 'rage').length || 1;
    return sk.reduce((v, k) => {
        const c = (MONSTER_SKILLS[k].comp && MONSTER_SKILLS[k].comp[key]) || 1;
        return v * (k === 'rage' ? c : 1 + (c - 1) / n);
    }, 1);
}
// 這隻圖鑑對「一般玩家殺一隻要幾回合」的倍率：型態 × 技能（自癒、幻身會拖長）
function monsterSpeciesRounds(m, d0) { return monsterTypeRounds(monsterTypeOf(m), d0) * monsterSkillComp(m, 'rounds'); }
// 攻擊倍率：讓「每隻對一般玩家的總傷害」＝ 回合數 × 攻擊 × 暴擊期望 × 技能 維持 1（與改版前的妖獸相同）
function monsterTypeAtkMult(t, d0, m) {
    const critDmg = NUMERIC_V2 ? NV2.critDmg : 2;
    return 1 / (monsterTypeRounds(t, d0) * (1 + t.crit * (critDmg - 1)) * monsterSkillComp(m, 'dmg'));
}
function fieldCategoryProfile(map) {
    return monsterAttrsByMapCategory[getMapCategoryIndex(map.name)] || monsterAttrsByMapCategory[1];
}
// 這張圖平均每隻的回合倍率（收益補償 nv2TypRoundsPerKill、離線估算用）
function fieldMonsterRoundsFactor(map) {
    const pool = fieldMonsterPool(map), d0 = fieldCategoryProfile(map).def;
    const tw = pool.reduce((s, x) => s + x.w, 0);
    return tw ? pool.reduce((s, x) => s + x.w * monsterSpeciesRounds(x.m, d0), 0) / tw : 1;
}

// 刷怪時套型態：回傳 { hp, atk } 倍率，並改 attrs（減傷、閃避、暴擊；術法型多帶異屬性）。attrs 已套過種族特性（race.js 的 applyRaceTraits）
//   閃避：型態的 eva 是「超出一般玩家命中」的部分 → attrs.eva = max(原本閃避, 一般玩家命中) + eva，一般玩家實際被閃 = 原本 + eva
function applyMonsterType(attrs, m, L, map) {
    const t = monsterTypeOf(m), prof = fieldCategoryProfile(map), d0 = attrs.def || 0;
    attrs.def = Math.max(0, d0 + t.def);
    if (t.eva > 0) attrs.eva = Math.max(attrs.eva || 0, NUMERIC_V2 && typeof L === 'number' ? nv2TypHit(L) : 0) + t.eva;
    attrs.crit = t.crit;
    if (m && m.type === 'caster' && !MONSTER_AFFIX_TYPES.some(k => attrs[k] > 0)
        && Math.random() < Math.min(1, prof.affixProb * (MONSTER_CASTER_AFFIX_MULT - 1) / Math.max(0.01, 1 - prof.affixProb))) {
        attrs[MONSTER_AFFIX_TYPES[Math.floor(Math.random() * MONSTER_AFFIX_TYPES.length)]] = prof.affixChance;
    }
    return { hp: t.hp, atk: monsterTypeAtkMult(t, prof.def, m) };
}

// 地圖卡片：「出沒：🐅雪紋白虎⚔️、🦊九尾天狐💨…」
function formatFieldMonsterMix(map) {
    return fieldMonsterPool(map).map(x => `<span title="${monsterTypeTag(x.m)}：${monsterTypeOf(x.m).desc}${x.m.skills && x.m.skills.length ? `｜技能 ${formatMonsterSkills(x.m)}` : ''}">${x.m.icon}${x.m.name}${monsterTypeOf(x.m).icon}</span>`).join('、');
}

// ==================== 怪物技能（第 3 期；設定 config-monsters.js 的 MONSTER_SKILLS）====================
let fieldSunderTurns = 0;        // 被「破甲」：你的防禦 × (1 − def)，剩幾個怪物回合（每波重置）
let lastMonsterSkillText = '';   // 這回合最後一個放技能的怪（戰場行動說明，ui.js）
function resetMonsterSkillWave() { fieldSunderTurns = 0; lastMonsterSkillText = ''; }
function skillLabel(k) { const s = MONSTER_SKILLS[k]; return s ? `${s.icon}${s.name}` : k; }

// 怪物出手前：幻身計時、狂暴（被動）、擲這回合的技能；自癒、幻身在這裡就生效。回傳 { atkMult, skill }
function monsterPreAttack(e) {
    if (e.phantomT > 0 && --e.phantomT === 0) e.attrs.eva -= e.phantomEva;
    const sk = e.mskills || [];
    let mult = 1;
    if (sk.includes('rage')) {
        const R = MONSTER_SKILLS.rage;
        if (!e.raged && e.hp < e.maxHp * R.hpBelow) { e.raged = true; lastMonsterSkillText = `${e.icon || ''}${e.name}陷入【${skillLabel('rage')}】，攻擊大增！`; }
        if (e.raged) mult *= 1 + R.atk;
    }
    const act = sk.filter(k => k !== 'rage' && MONSTER_SKILLS[k] && !(k === 'heal' && (e.healUses || 0) >= MONSTER_SKILLS.heal.maxUses));
    const skill = act.length && Math.random() < MONSTER_SKILL_CHANCE ? act[Math.floor(Math.random() * act.length)] : null;
    if (!skill) return { atkMult: mult, skill: null };
    const S = MONSTER_SKILLS[skill];
    if (skill === 'heavy') mult *= S.mult;
    if (skill === 'heal') { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * S.pct); e.healUses = (e.healUses || 0) + 1; }
    if (skill === 'phantom') {
        if (e.phantomT > 0) e.attrs.eva -= e.phantomEva;   // 重新施放：刷新回合，不疊加
        e.phantomT = S.turns; e.phantomEva = S.eva; e.attrs.eva += S.eva;
    }
    lastMonsterSkillText = `${e.icon || ''}${e.name}施展【${skillLabel(skill)}】！`;
    return { atkMult: mult, skill };
}
// 打中你之後：撕咬吸血、毒牙、烈焰、寒息、破甲（被閃避就不生效）。r＝resolveHit 結果、dealt＝實際扣的血、atk＝這一下的攻擊、pa＝你的戰鬥屬性
function monsterPostHit(e, skill, r, dealt, atk, pa) {
    if (!skill) return;
    r.tags.push('msk_' + skill);   // 戰況與飄字（elements.js summarizeTags、battle-fx.js）
    if (r.tags.includes('dodge')) return;
    const S = MONSTER_SKILLS[skill];
    if (skill === 'bite' && dealt > 0 && e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + dealt * S.lifesteal);
    if (skill === 'poison' && !pa.poisonImmune) playerStatus.poison = addDotStack(playerStatus.poison, POISON_MAX_STACKS, POISON_TURNS, atk * POISON_RATE);
    if (skill === 'flame') playerStatus.burn = addDotStack(playerStatus.burn, BURN_MAX_STACKS, BURN_TURNS, atk * BURN_RATE);
    if (skill === 'frost' && Math.random() >= (pa.freezeResist || 0)) playerStatus.frozen = Math.max(playerStatus.frozen, FREEZE_TURNS);
    if (skill === 'sunder') fieldSunderTurns = S.turns;
}
// 怪物回合用的玩家屬性：被破甲時防禦打折
function playerAttrsUnderSunder(pa) {
    return fieldSunderTurns > 0 ? Object.assign({}, pa, { def: (pa.def || 0) * (1 - MONSTER_SKILLS.sunder.def) }) : pa;
}
// 地圖卡片／圖鑑提示：「💢重擊、😡狂暴」
function formatMonsterSkills(m) { return ((m && m.skills) || []).map(skillLabel).join('、'); }

