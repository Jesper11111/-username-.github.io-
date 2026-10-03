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
// 型態的攻擊倍率：讓「每隻對一般玩家的總傷害」＝ 回合數 × 攻擊 × 暴擊期望 維持 1（與改版前的妖獸相同）
function monsterTypeAtkMult(t, d0) {
    const critDmg = NUMERIC_V2 ? NV2.critDmg : 2;
    return 1 / (monsterTypeRounds(t, d0) * (1 + t.crit * (critDmg - 1)));
}
function fieldCategoryProfile(map) {
    return monsterAttrsByMapCategory[getMapCategoryIndex(map.name)] || monsterAttrsByMapCategory[1];
}
// 這張圖平均每隻的回合倍率（收益補償 nv2TypRoundsPerKill、離線估算用）
function fieldMonsterRoundsFactor(map) {
    const pool = fieldMonsterPool(map), d0 = fieldCategoryProfile(map).def;
    const tw = pool.reduce((s, x) => s + x.w, 0);
    return tw ? pool.reduce((s, x) => s + x.w * monsterTypeRounds(monsterTypeOf(x.m), d0), 0) / tw : 1;
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
    return { hp: t.hp, atk: monsterTypeAtkMult(t, prof.def) };
}

// 地圖卡片：「出沒：🐅雪紋白虎⚔️、🦊九尾天狐💨…」
function formatFieldMonsterMix(map) {
    return fieldMonsterPool(map).map(x => `<span title="${monsterTypeTag(x.m)}：${monsterTypeOf(x.m).desc}">${x.m.icon}${x.m.name}${monsterTypeOf(x.m).icon}</span>`).join('、');
}
