// 屠龍勇者：共鳴武器（ARCHITECTURE.md 第 27 節）（依賴 config、classes、skills、items、monsters、quests）
// 武器帶 res 欄位＝裝備時才有的專屬技能；換掉武器就不能用。三種觸發方式混用：
//   cd     有冷卻，掛機自動施放（不耗 MP），排在治癒／增益之後、職業攻擊技能之前
//   proc   每次普攻（或技能的物理攻擊）命中時 p 機率觸發
//   charge 每次命中累積 1 點共鳴值，滿 n 點自動爆發
// 效果 kind 沿用職業技能的格式：strike（mult／hits／aoe／spread／stun／ignoreAc／magic／undeadMul）、spell（dmg／spK）、heal、buff（fx／sec）
// 職業共鳴：res.cls 裡的職業使用時，傷害／治療 ×RES_CLASS_BONUS、增益時間 ×RES_CLASS_BONUS
// tier：1 稀有共鳴、2 英雄共鳴、3 傳說共鳴、4 神話共鳴（只影響顯示顏色與異界掉落）

const RES_CLASS_BONUS = 1.3;
const RES_TIERS = {
    1: { name: '稀有共鳴', cls: 'res-1' },
    2: { name: '英雄共鳴', cls: 'res-2' },
    3: { name: '傳說共鳴', cls: 'res-3' },
    4: { name: '神話共鳴', cls: 'res-4' },
};
const RES_TRIGGER_NAMES = { cd: '冷卻施放', proc: '攻擊觸發', charge: '共鳴爆發' };

// ── 新增的共鳴武器（首領、四大龍、異界首領掉落，部分可鍛造）──
const RESONANCE_NEW_ITEMS = {
    pirateCannon:  { name: '海賊王的火砲', cat: 'weapon', type: 'gun',     dmg: [15, 15], hit: 3, safe: 6, wt: 90, sell: 22000 },
    wyvernSpear:   { name: '飛龍之矛',     cat: 'weapon', type: 'spear',   dmg: [18, 22], hit: 3, safe: 6, wt: 85, sell: 28000 },
    ifritClaw:     { name: '伊弗利特之爪', cat: 'weapon', type: 'claw',    dmg: [18, 18], crit: 0.04, safe: 6, wt: 45, sell: 32000 },
    earthRender:   { name: '大地裂斧',     cat: 'weapon', type: 'axe',     dmg: [30, 34], hit: 4, safe: 6, wt: 140, sell: 120000, desc: '以地龍格爾莫斯的力量鍛成' },
    tidalStaff:    { name: '潮汐之杖',     cat: 'weapon', type: 'staff',   dmg: [14, 14], sp: 9, safe: 6, wt: 30, sell: 120000, desc: '以水龍瑟拉恩的力量鍛成' },
    galeBow:       { name: '颶風之弓',     cat: 'weapon', type: 'bow',     dmg: [24, 24], hit: 8, safe: 6, wt: 40, sell: 120000, desc: '以風龍維斯塔爾的力量鍛成' },
    infernoBlade:  { name: '熾焰魔劍',     cat: 'weapon', type: 'twohand', dmg: [34, 38], hit: 6, safe: 6, wt: 150, sell: 120000, desc: '以火龍莫爾加斯的力量鍛成' },
};
Object.assign(ITEMS, RESONANCE_NEW_ITEMS);

// ── 每把武器的共鳴技能（30 把）──
const RESONANCE = {
    // 稀有共鳴（Lv.25～45 的首領、鍛造）
    tsurugi:       { tier: 1, cls: ['knight', 'royal'], trigger: 'proc', p: 0.08, name: '劍氣', kind: 'strike', mult: 1.5, desc: '劍氣斬出 1.5 倍傷害' },
    holyMace:      { tier: 1, cls: ['paladin'], trigger: 'proc', p: 0.08, name: '聖光', kind: 'spell', dmg: [20, 40], spK: 1, undeadMul: 2, desc: '降下聖光（魔法），對不死系 ×2' },
    darkClaw:      { tier: 1, cls: ['shura', 'darkelf'], trigger: 'proc', p: 0.1, name: '暗影撕裂', kind: 'strike', mult: 1, hits: 2, desc: '連撕 2 下' },
    darkDual:      { tier: 1, cls: ['darkelf'], trigger: 'proc', p: 0.1, name: '雙影斬', kind: 'strike', mult: 0.9, hits: 2, spread: true, desc: '雙影分斬 2 個敵人' },
    manaWand:      { tier: 1, cls: ['mage', 'angel'], trigger: 'charge', n: 12, name: '法力回流', kind: 'buff', sec: 20, fx: { mpRegen: 8, sp: 2 }, desc: '20 秒內回魔 +8、SP +2' },
    pirateCannon:  { tier: 1, cls: ['gunner'], trigger: 'cd', cd: 14, name: '砲擊', kind: 'strike', mult: 1.8, aoe: true, desc: '範圍：1.8 倍砲擊所有敵人' },
    // 英雄共鳴（Lv.45～70 的首領、永夜之塔）
    magicSniper:   { tier: 2, cls: ['gunner'], trigger: 'cd', cd: 12, name: '魔導彈', kind: 'spell', dmg: [40, 70], spK: 1.5, desc: '魔導彈（魔法）重創目標' },
    iceQueenStaff: { tier: 2, cls: ['mage'], trigger: 'cd', cd: 10, name: '冰封領域', kind: 'spell', dmg: [45, 80], spK: 1.8, aoe: true, desc: '範圍：冰封所有敵人（魔法）' },
    abyssScythe:   { tier: 2, cls: ['demon'], trigger: 'charge', n: 15, name: '深淵收割', kind: 'strike', mult: 2, aoe: true, desc: '範圍：2 倍收割所有敵人' },
    demonAxe:      { tier: 2, cls: ['warrior'], trigger: 'proc', p: 0.08, name: '惡魔之力', kind: 'strike', mult: 2.2, desc: '2.2 倍重擊' },
    wyvernSpear:   { tier: 2, cls: ['knight', 'angel'], trigger: 'proc', p: 0.1, name: '龍騎衝刺', kind: 'strike', mult: 2, ignoreAc: true, desc: '無視防禦的 2 倍突刺' },
    ifritClaw:     { tier: 2, cls: ['shura', 'demon'], trigger: 'proc', p: 0.12, name: '火焰爪', kind: 'strike', mult: 1, magic: { dmg: [30, 60], spK: 1.2 }, desc: '攻擊＋火焰魔法傷害' },
    // 傳說共鳴（龍、遺忘之王、職業第 4 章任務武器）
    dragonSlayer:  { tier: 3, cls: ['knight', 'royal'], trigger: 'charge', n: 20, name: '屠龍斬', kind: 'strike', mult: 4.5, desc: '4.5 倍斬擊（對龍再 ×1.5）' },
    dkFlameSword:  { tier: 3, cls: ['knight', 'warrior'], trigger: 'proc', p: 0.1, name: '烈炎', kind: 'strike', mult: 1, magic: { dmg: [40, 80], spK: 1 }, aoe: true, desc: '範圍：烈炎吞噬所有敵人' },
    windBow:       { tier: 3, cls: ['elf'], trigger: 'proc', p: 0.12, name: '疾風連矢', kind: 'strike', mult: 0.8, hits: 3, spread: true, desc: '連射 3 箭分散射向敵人' },
    royalKingSword:  { tier: 3, cls: ['royal'], trigger: 'cd', cd: 20, name: '君主威光', kind: 'buff', sec: 10, fx: { dmg: 6, hit: 6, ac: 3 }, desc: '10 秒內傷害 +6、命中 +6、AC -3' },
    knightOathSword: { tier: 3, cls: ['knight'], trigger: 'charge', n: 12, name: '誓約斬', kind: 'strike', mult: 3, aoe: true, desc: '範圍：3 倍斬擊所有敵人' },
    mageArchStaff:   { tier: 3, cls: ['mage'], trigger: 'cd', cd: 8, name: '賢者之雷', kind: 'spell', dmg: [80, 130], spK: 2.5, aoe: true, desc: '範圍：雷擊所有敵人（魔法）' },
    elfWorldBow:     { tier: 3, cls: ['elf'], trigger: 'proc', p: 0.1, name: '世界樹之光', kind: 'strike', mult: 1.2, hits: 4, spread: true, desc: '4 道光箭分散射向敵人' },
    darkDualBlades:  { tier: 3, cls: ['darkelf'], trigger: 'charge', n: 15, name: '夜影亂舞', kind: 'strike', mult: 1.1, hits: 5, spread: true, desc: '亂舞 5 下分散斬向敵人' },
    shuraDualBlades: { tier: 3, cls: ['shura'], trigger: 'proc', p: 0.12, name: '修羅斬', kind: 'strike', mult: 1.3, hits: 3, desc: '連斬 3 下' },
    warTitanAxe:     { tier: 3, cls: ['warrior'], trigger: 'cd', cd: 10, name: '泰坦震擊', kind: 'strike', mult: 2, aoe: true, stun: 1500, desc: '範圍：2 倍震擊並暈眩 1.5 秒' },
    gunDragonGun:    { tier: 3, cls: ['gunner'], trigger: 'cd', cd: 10, name: '龍息彈', kind: 'strike', mult: 1.6, magic: { dmg: [40, 70], spK: 1 }, aoe: true, desc: '範圍：1.6 倍＋龍息魔法傷害' },
    mfHolySword:     { tier: 3, cls: ['magicfighter'], trigger: 'proc', p: 0.12, name: '魔導斬', kind: 'strike', mult: 1, magic: { dmg: [50, 90], spK: 2 }, desc: '攻擊＋魔導魔法傷害' },
    palJudgeHammer:  { tier: 3, cls: ['paladin'], trigger: 'cd', cd: 12, name: '神聖審判', kind: 'spell', dmg: [80, 130], spK: 2, undeadMul: 2, aoe: true, desc: '範圍：神聖魔法，對不死系 ×2' },
    angelSpear:      { tier: 3, cls: ['angel'], trigger: 'proc', p: 0.08, name: '天使之癒', kind: 'heal', heal: [80, 140], spK: 2, desc: '回復大量 HP' },
    demonDeathScythe:{ tier: 3, cls: ['demon'], trigger: 'charge', n: 12, name: '冥界之門', kind: 'strike', mult: 1.5, magic: { dmg: [60, 100], spK: 1.5 }, aoe: true, desc: '範圍：1.5 倍＋冥界魔法傷害' },
    // 神話共鳴（四大龍掉落或鍛造）
    earthRender:   { tier: 4, cls: ['warrior', 'knight'], trigger: 'charge', n: 15, name: '地裂', kind: 'strike', mult: 2.5, aoe: true, stun: 2000, desc: '範圍：2.5 倍並暈眩 2 秒' },
    tidalStaff:    { tier: 4, cls: ['mage', 'angel'], trigger: 'cd', cd: 8, name: '海嘯', kind: 'spell', dmg: [130, 200], spK: 3, aoe: true, desc: '範圍：海嘯淹沒所有敵人（魔法）' },
    galeBow:       { tier: 4, cls: ['elf', 'gunner'], trigger: 'proc', p: 0.15, name: '颶風', kind: 'strike', mult: 1.3, hits: 4, spread: true, desc: '颶風 4 箭分散射向敵人' },
    infernoBlade:  { tier: 4, cls: ['knight'], trigger: 'proc', p: 0.12, name: '龍炎斬', kind: 'strike', mult: 1.5, magic: { dmg: [80, 140], spK: 2 }, aoe: true, desc: '範圍：1.5 倍＋龍炎魔法傷害' },
};
for (const id in RESONANCE) ITEMS[id].res = RESONANCE[id];

// 首領／龍的新掉落（圖鑑會自動列出）
MONSTERS.pirateKing.drops.push({ id: 'pirateCannon', p: 0.05 });
MONSTERS.wyvern.drops.push({ id: 'wyvernSpear', p: 0.05 });
MONSTERS.ifrit.drops.push({ id: 'ifritClaw', p: 0.05 });
MONSTERS.antharas.drops.push({ id: 'earthRender', p: 0.06 });
MONSTERS.fafurion.drops.push({ id: 'tidalStaff', p: 0.06 });
MONSTERS.lindvior.drops.push({ id: 'galeBow', p: 0.06 });
MONSTERS.valakas.drops.push({ id: 'infernoBlade', p: 0.06 });

// 神話武器的鍛造配方（龍鱗＋高階材料）
RECIPES.push(
    { out: 'earthRender',  gold: 80000, need: { battleAxe: 1, antharasScale: 5, giantSoul: 2 } },
    { out: 'tidalStaff',   gold: 80000, need: { crystalWand: 1, fafurionScale: 5, frostCrystal: 4 } },
    { out: 'galeBow',      gold: 80000, need: { longBow: 1, lindviorScale: 5, wyvernWing: 4 } },
    { out: 'infernoBlade', gold: 80000, need: { twoHandSword: 1, valakasScale: 5, ifritFlame: 4 } },
);

// 異界首領：依地圖階級掉一把共鳴武器（T1～5 稀有、T6～10 英雄以下、T11～14 傳說以下、T15 全部）
const RES_MAP_BOSS_P = 0.1;
function resMaxTierForMap(t) { return t <= 5 ? 1 : t <= 10 ? 2 : t <= 14 ? 3 : 4; }

// ───────── 戰鬥（combat.js 呼叫）─────────
function resWeaponId() {
    const w = player.equip.weapon;
    return w && ITEMS[w.id].res ? w.id : null;
}

// 普攻／技能的物理攻擊命中後：proc 擲機率、charge 累積共鳴值；觸發的效果排隊，等這次行動結算完再放（避免在攻擊迴圈裡巢狀出手）
function resonanceOnHit() {
    const id = resWeaponId();
    if (!id || !hunt || hunt.resPending) return;
    const r = ITEMS[id].res;
    if (r.trigger === 'proc' && chance(r.p)) hunt.resPending = id;
    if (r.trigger === 'charge') {
        if (!player.resCharge || player.resCharge.id !== id) player.resCharge = { id, n: 0 };
        if (++player.resCharge.n >= r.n) { player.resCharge.n = 0; hunt.resPending = id; }
    }
}

// combat.js 的戰鬥迴圈在玩家行動結算後呼叫；有放出共鳴技能回傳 true
function resonanceFlush(st) {
    const id = hunt && hunt.resPending;
    if (!id) return false;
    hunt.resPending = null;
    if (id !== resWeaponId() || !fightAlive()) return false;
    castResonance(id, st);
    return true;
}

// cd 型：playerAction 在職業攻擊技能之前問這裡
function resonanceReady() {
    const id = resWeaponId();
    return id && ITEMS[id].res.trigger === 'cd' && !(player.cds.res > gameNow) ? id : null;
}

// 把共鳴效果轉成職業技能格式，交給 castSpell／doStrike／castHeal／castBuff（不耗 MP）
function castResonance(id, st) {
    const r = ITEMS[id].res, b = r.cls.includes(player.cls) ? RES_CLASS_BONUS : 1;
    const k = { id: 'res_' + id, name: `共鳴・${r.name}`, mp: 0 };
    if (r.trigger === 'cd') player.cds.res = gameNow + r.cd * 1000;
    if (r.kind === 'strike') {
        Object.assign(k, { mult: r.mult * b, hits: r.hits, aoe: r.aoe, spread: r.spread, stun: r.stun, ignoreAc: r.ignoreAc, undeadMul: r.undeadMul });
        if (r.magic) k.magic = { dmg: r.magic.dmg.map(v => Math.round(v * b)), spK: r.magic.spK * b };
        doStrike(k, st);
    } else if (r.kind === 'spell') {
        Object.assign(k, { dmg: r.dmg.map(v => Math.round(v * b)), spK: r.spK * b, aoe: r.aoe, undeadMul: r.undeadMul });
        castSpell(k, st);
    } else if (r.kind === 'heal') {
        castHeal({ ...k, heal: r.heal.map(v => Math.round(v * b)), spK: r.spK * b }, st);
    } else if (r.kind === 'buff') {
        castBuff({ ...k, sec: Math.round(r.sec * b) });
    }
}

// skills.js 的 findSkill 查不到時用（共鳴增益的名稱與效果）
function findResonanceSkill(skillId) {
    const id = skillId.startsWith('res_') ? skillId.slice(4) : null;
    const r = id && ITEMS[id] && ITEMS[id].res;
    return r ? { id: skillId, name: `共鳴・${r.name}`, fx: r.fx } : null;
}

// ───────── 介面 ─────────
function resTriggerText(r) {
    if (r.trigger === 'cd') return `冷卻 ${r.cd} 秒，自動施放`;
    if (r.trigger === 'proc') return `攻擊命中時 ${Math.round(r.p * 100)}% 觸發`;
    return `每命中 1 次共鳴值 +1，滿 ${r.n} 點爆發`;
}
// 道具說明、圖鑑共用
function resonanceHtml(d) {
    const r = d.res;
    if (!r) return '';
    const T = RES_TIERS[r.tier];
    return `<div class="res-box ${T.cls}"><b>🌟 ${T.name}・${esc(r.name)}</b><small>（${RES_TRIGGER_NAMES[r.trigger]}）</small><br>
        ${esc(r.desc)}<br><small class="muted">${resTriggerText(r)}；不耗 MP，裝備時才能使用</small><br>
        <small>職業共鳴：${r.cls.map(c => CLASSES[c].name).join('、')}使用時效果 ×${RES_CLASS_BONUS}</small></div>`;
}
// 狩獵畫面增益列：目前武器的共鳴狀態
function resonanceChip() {
    const id = resWeaponId();
    if (!id) return '';
    const r = ITEMS[id].res, on = r.cls.includes(player.cls) ? ' ✦' : '';
    let s = '';
    if (r.trigger === 'cd') { const left = Math.ceil(((player.cds.res || 0) - gameNow) / 1000); s = left > 0 ? `${left}秒` : '就緒'; }
    else if (r.trigger === 'proc') s = `${Math.round(r.p * 100)}%`;
    else s = `${player.resCharge && player.resCharge.id === id ? player.resCharge.n : 0}/${r.n}`;
    return `<span class="chip res-chip ${RES_TIERS[r.tier].cls}" title="${esc(r.desc)}">🌟 ${esc(r.name)}${on} ${s}</span>`;
}
