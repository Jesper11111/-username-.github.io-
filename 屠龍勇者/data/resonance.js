// 屠龍勇者：共鳴裝備（武器＋防具＋飾品；ARCHITECTURE.md 第 27、28 節）（依賴 config、classes、skills、items、monsters、quests）
// 裝備帶 res 欄位＝穿著時才有的專屬特效；卸下就沒有。可以同時穿多件，各自計算冷卻與共鳴值。觸發方式：
//   cd     有冷卻，掛機自動施放（不耗 MP），排在治癒／增益之後、職業攻擊技能之前
//   proc   每次普攻（或技能的物理攻擊、攻擊魔法）命中時 p 機率觸發
//   charge 每次命中累積 1 點共鳴值，滿 n 點自動爆發
//   hurt   被怪物打中（有受傷）時 p 機率觸發（防具）
//   lowhp  受傷後 HP 低於 pct 時觸發，冷卻 cd 秒（防具：保命用）
// 效果 kind 沿用職業技能的格式：strike（mult／hits／aoe／spread／stun／ignoreAc／magic／undeadMul）、spell（dmg／spK）、heal、buff（fx／sec）
// 職業共鳴：res.cls 裡的職業使用時，傷害／治療 ×RES_CLASS_BONUS、增益時間 ×RES_CLASS_BONUS（防具多半沒有 cls＝人人適用）
// tier：1 稀有、2 英雄、3 傳說、4 神話（顯示顏色與異界掉落）

const RES_CLASS_BONUS = 1.3;
const RES_TIERS = {
    1: { name: '稀有共鳴', cls: 'res-1' },
    2: { name: '英雄共鳴', cls: 'res-2' },
    3: { name: '傳說共鳴', cls: 'res-3' },
    4: { name: '神話共鳴', cls: 'res-4' },
};
const RES_TRIGGER_NAMES = { cd: '冷卻施放', proc: '攻擊觸發', charge: '共鳴爆發', hurt: '受擊觸發', lowhp: '危急觸發' };

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
// ── 傳說防具／飾品（2026-10-10 使用者：傳說裝備不只武器）──
const RESONANCE_ARMOR_ITEMS = {
    wolfAmulet:   { name: '狼王牙項鍊',   cat: 'armor', slot: 'amulet', hit: 2, str: 1, safe: -1, wt: 5, sell: 9000 },
    pirateRing:   { name: '海賊王的戒指', cat: 'armor', slot: 'ring', dex: 1, dodge: 0.03, safe: -1, wt: 2, sell: 9500 },
    frostShield:  { name: '寒冰之盾',     cat: 'armor', slot: 'shield', ac: 5, mr: 10, safe: 4, wt: 130, sell: 26000 },
    wyvernHelm:   { name: '飛龍頭盔',     cat: 'armor', slot: 'helm', ac: 4, hit: 2, safe: 4, wt: 45, sell: 24000 },
    flameGloves:  { name: '炎魔手套',     cat: 'armor', slot: 'gloves', ac: 2, dmg: 2, safe: 4, wt: 20, sell: 28000 },
    archmageHat:  { name: '大賢者頭冠',   cat: 'armor', slot: 'helm', ac: 2, sp: 3, mr: 10, safe: 4, wt: 15, sell: 45000 },
    phoenixMail:  { name: '不死鳥之鎧',   cat: 'armor', slot: 'armor', ac: 8, mr: 10, safe: 4, wt: 180, sell: 60000 },
    shadowCloak:  { name: '夜影斗篷',     cat: 'armor', slot: 'cloak', ac: 2, dodge: 0.05, safe: 4, wt: 10, sell: 40000 },
    giantBelt:    { name: '巨人王腰帶',   cat: 'armor', slot: 'belt', str: 2, con: 2, hp: 60, safe: -1, wt: 20, sell: 55000 },
    angelRing:    { name: '天使之戒',     cat: 'armor', slot: 'ring', wis: 1, mr: 5, hpRegen: 2, safe: -1, wt: 2, sell: 42000 },
    demonRing:    { name: '惡魔之戒',     cat: 'armor', slot: 'ring', str: 1, lifesteal: 0.03, safe: -1, wt: 2, sell: 42000 },
    abyssAmulet:  { name: '深淵之眼',     cat: 'armor', slot: 'amulet', crit: 0.05, mr: 5, safe: -1, wt: 5, sell: 50000 },
    earthGuard:   { name: '大地守護者之盾', cat: 'armor', slot: 'shield', ac: 8, reduce: 4, safe: 4, wt: 160, sell: 120000, desc: '以地龍格爾莫斯的鱗甲鍛成' },
    tideHeart:    { name: '潮汐之心',     cat: 'armor', slot: 'amulet', mr: 20, sp: 3, mpRegen: 3, safe: -1, wt: 5, sell: 120000, desc: '水龍瑟拉恩的心臟結晶' },
    galeBoots:    { name: '風神之靴',     cat: 'armor', slot: 'boots', ac: 3, dodge: 0.08, haste: true, safe: 4, wt: 20, sell: 120000, desc: '以風龍維斯塔爾的羽翼鍛成，穿上就有加速效果' },
    dragonHeartRing: { name: '火龍之心',   cat: 'armor', slot: 'ring', str: 2, dmg: 3, safe: -1, wt: 2, sell: 120000, desc: '火龍莫爾加斯的心臟結晶' },
};
Object.assign(ITEMS, RESONANCE_ARMOR_ITEMS);
Object.assign(RESONANCE, {
    // 稀有
    knightHelm:   { tier: 1, cls: ['knight', 'paladin'], trigger: 'hurt', p: 0.08, name: '堅守', kind: 'buff', sec: 8, fx: { ac: 4 }, desc: '8 秒內 AC -4' },
    protectCloak: { tier: 1, trigger: 'lowhp', pct: 0.3, cd: 60, name: '守護', kind: 'heal', heal: [40, 70], spK: 0, desc: 'HP 低於 30% 時回復 HP' },
    powerGloves:  { tier: 1, cls: ['warrior', 'shura'], trigger: 'proc', p: 0.06, name: '猛力', kind: 'strike', mult: 1.4, desc: '1.4 倍重擊' },
    wolfAmulet:   { tier: 1, trigger: 'charge', n: 25, name: '狼嚎', kind: 'buff', sec: 10, fx: { spdMul: 0.15 }, desc: '10 秒內攻速 +15%' },
    pirateRing:   { tier: 1, trigger: 'proc', p: 0.08, name: '海風', kind: 'buff', sec: 8, fx: { dodge: 0.1 }, desc: '8 秒內閃避 +10%' },
    // 英雄
    hasteBoots:   { tier: 2, trigger: 'hurt', p: 0.1, name: '疾走', kind: 'buff', sec: 6, fx: { dodge: 0.15 }, desc: '6 秒內閃避 +15%' },
    mrCloak:      { tier: 2, trigger: 'hurt', p: 0.1, name: '魔法反射', kind: 'buff', sec: 8, fx: { mr: 20, reduce: 3 }, desc: '8 秒內 MR +20、減傷 3' },
    titanBelt:    { tier: 2, cls: ['warrior'], trigger: 'lowhp', pct: 0.35, cd: 90, name: '泰坦之軀', kind: 'buff', sec: 12, fx: { reduce: 8, ac: 5 }, desc: 'HP 低於 35% 時 12 秒內減傷 8、AC -5' },
    frostShield:  { tier: 2, trigger: 'hurt', p: 0.12, name: '冰霜反擊', kind: 'strike', mult: 1.2, stun: 1500, desc: '反擊 1.2 倍並暈眩 1.5 秒' },
    wyvernHelm:   { tier: 2, trigger: 'charge', n: 30, name: '龍吼', kind: 'spell', dmg: [50, 80], spK: 1, aoe: true, desc: '範圍：龍吼震傷所有敵人（魔法）' },
    flameGloves:  { tier: 2, trigger: 'proc', p: 0.08, name: '爆炎', kind: 'spell', dmg: [30, 60], spK: 1, desc: '爆炎（魔法）灼燒目標' },
    // 傳說
    dragonScaleMail: { tier: 3, trigger: 'hurt', p: 0.08, name: '龍鱗', kind: 'buff', sec: 6, fx: { reduce: 10 }, desc: '6 秒內減傷 10' },
    archmageHat:  { tier: 3, cls: ['mage', 'angel', 'magicfighter'], trigger: 'cd', cd: 25, name: '奧術湧動', kind: 'buff', sec: 12, fx: { sp: 6, mpRegen: 6 }, desc: '12 秒內 SP +6、回魔 +6' },
    phoenixMail:  { tier: 3, trigger: 'lowhp', pct: 0.25, cd: 180, name: '浴火重生', kind: 'heal', heal: [300, 400], spK: 0, desc: 'HP 低於 25% 時回復大量 HP' },
    shadowCloak:  { tier: 3, cls: ['darkelf'], trigger: 'hurt', p: 0.15, name: '影遁', kind: 'buff', sec: 4, fx: { dodge: 0.3 }, desc: '4 秒內閃避 +30%' },
    giantBelt:    { tier: 3, cls: ['warrior', 'knight'], trigger: 'charge', n: 40, name: '巨人踐踏', kind: 'strike', mult: 2, aoe: true, stun: 1500, desc: '範圍：2 倍踐踏並暈眩 1.5 秒' },
    angelRing:    { tier: 3, cls: ['angel', 'paladin'], trigger: 'hurt', p: 0.1, name: '天使庇護', kind: 'heal', heal: [40, 70], spK: 1, desc: '受擊時回復 HP' },
    demonRing:    { tier: 3, cls: ['demon'], trigger: 'proc', p: 0.06, name: '嗜血', kind: 'buff', sec: 6, fx: { lifesteal: 0.15 }, desc: '6 秒內吸血 +15%' },
    abyssAmulet:  { tier: 3, trigger: 'charge', n: 25, name: '深淵凝視', kind: 'spell', dmg: [80, 130], spK: 2, desc: '深淵魔法重創目標' },
    // 神話（四大龍）
    earthGuard:   { tier: 4, cls: ['knight', 'paladin', 'warrior'], trigger: 'hurt', p: 0.12, name: '大地震', kind: 'strike', mult: 2, aoe: true, stun: 2000, desc: '範圍：反擊 2 倍並暈眩 2 秒' },
    tideHeart:    { tier: 4, trigger: 'cd', cd: 30, name: '潮汐之癒', kind: 'heal', heal: [200, 300], spK: 2, desc: '每 30 秒回復大量 HP' },
    galeBoots:    { tier: 4, trigger: 'hurt', p: 0.15, name: '風神', kind: 'buff', sec: 5, fx: { dodge: 0.4, spdMul: 0.2 }, desc: '5 秒內閃避 +40%、攻速 +20%' },
    dragonHeartRing: { tier: 4, trigger: 'proc', p: 0.08, name: '龍炎', kind: 'spell', dmg: [100, 160], spK: 2, aoe: true, desc: '範圍：龍炎燒灼所有敵人（魔法）' },
});
// 防具掉落：稀有首領、永夜之塔守關首領、四大龍
MONSTERS.elderTreant.drops.push({ id: 'wolfAmulet', p: 0.05 });
MONSTERS.pirateKing.drops.push({ id: 'pirateRing', p: 0.05 });
MONSTERS.iceGiantKing.drops.push({ id: 'frostShield', p: 0.05 });
MONSTERS.wyvern.drops.push({ id: 'wyvernHelm', p: 0.05 });
MONSTERS.ifrit.drops.push({ id: 'flameGloves', p: 0.05 });
MONSTERS.forgottenKing.drops.push({ id: 'archmageHat', p: 0.04 });
MONSTERS.osiris.drops.push({ id: 'shadowCloak', p: 0.03 });
MONSTERS.giantKingSpirit.drops.push({ id: 'giantBelt', p: 0.04 }, { id: 'phoenixMail', p: 0.03 });
MONSTERS.demon.drops.push({ id: 'demonRing', p: 0.03 });
MONSTERS.antharas.drops.push({ id: 'earthGuard', p: 0.06 });
MONSTERS.fafurion.drops.push({ id: 'tideHeart', p: 0.06 });
MONSTERS.lindvior.drops.push({ id: 'galeBoots', p: 0.06 });
MONSTERS.valakas.drops.push({ id: 'dragonHeartRing', p: 0.06 });
TOWER_BOSS_DROPS[5].push('angelRing');    // 60F 墮落的大天使
TOWER_BOSS_DROPS[7].push('abyssAmulet');  // 80F 深淵領主
RECIPES.push(
    { out: 'earthGuard',      gold: 60000, need: { knightShield: 1, antharasScale: 4, giantSoul: 1 } },
    { out: 'tideHeart',       gold: 60000, need: { mrAmulet: 1, fafurionScale: 4, frostCrystal: 3 } },
    { out: 'galeBoots',       gold: 60000, need: { hasteBoots: 1, lindviorScale: 4, wyvernWing: 3 } },
    { out: 'dragonHeartRing', gold: 60000, need: { strRing: 1, valakasScale: 4, ifritFlame: 3 } },
);

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

// 異界首領：依地圖階級掉一件共鳴裝備（T1～5 稀有、T6～10 英雄以下、T11～14 傳說以下、T15 全部）
const RES_MAP_BOSS_P = 0.1;
function resMaxTierForMap(t) { return t <= 5 ? 1 : t <= 10 ? 2 : t <= 14 ? 3 : 4; }

// ───────── 戰鬥（combat.js 呼叫）─────────
// 身上穿著的共鳴裝備 id（武器排第一；兩個戒指可以各算一次）
function resItemIds() {
    const out = [];
    for (const s of SLOT_KEYS) { const it = player.equip[s]; if (it && ITEMS[it.id].res) out.push(it.id); }
    return out;
}
function resCls(r) { return r.cls || []; }
function resReady(id) { return !(player.cds['res_' + id] > gameNow); }
// 共鳴值：{ 裝備id: n }（舊版存檔是 { id, n }，讀到就重算）
function resChargeMap() {
    if (!player.resCharge || player.resCharge.id !== undefined) player.resCharge = {};
    return player.resCharge;
}
// 觸發的攻擊效果先排隊，等這次行動結算完再放（避免在攻擊迴圈裡巢狀出手、打到已死的怪）
function resQueue(id) {
    if (!hunt) return;
    if (!hunt.resPending) hunt.resPending = [];
    if (!hunt.resPending.includes(id)) hunt.resPending.push(id);
}

// 普攻／技能的物理攻擊命中、攻擊魔法施放後：proc 擲機率、charge 累積共鳴值
function resonanceOnHit() {
    if (!hunt) return;
    for (const id of resItemIds()) {
        const r = ITEMS[id].res;
        if (r.trigger === 'proc' && chance(r.p)) resQueue(id);
        if (r.trigger === 'charge') {
            const C = resChargeMap();
            C[id] = (C[id] || 0) + 1;
            if (C[id] >= r.n) { C[id] = 0; resQueue(id); }
        }
    }
}

// 被怪物打中（有受傷、沒死）後：hurt 擲機率、lowhp 看血量與冷卻。治療／增益立刻生效，攻擊效果排隊
function resonanceOnHurt(st) {
    if (!hunt || player.hp <= 0) return;
    for (const id of resItemIds()) {
        const r = ITEMS[id].res;
        const fire = (r.trigger === 'hurt' && chance(r.p)) ||
            (r.trigger === 'lowhp' && player.hp < st.maxHp * r.pct && resReady(id));
        if (!fire) continue;
        if (r.kind === 'heal' || r.kind === 'buff') castResonance(id, st);
        else resQueue(id);
    }
}

// combat.js 的戰鬥迴圈在玩家行動、怪物攻擊結算後呼叫；有放出共鳴技能回傳 true
function resonanceFlush(st) {
    const list = hunt && hunt.resPending;
    if (!list || !list.length) return false;
    hunt.resPending = [];
    const worn = resItemIds();
    let any = false;
    for (const id of list) {
        if (!worn.includes(id) || !fightAlive()) continue;
        castResonance(id, st);
        any = true;
    }
    return any;
}

// cd 型：playerAction 在職業攻擊技能之前問這裡（回傳第一件冷卻好的）
function resonanceReady() {
    return resItemIds().find(id => ITEMS[id].res.trigger === 'cd' && resReady(id)) || null;
}

// 把共鳴效果轉成職業技能格式，交給 castSpell／doStrike／castHeal／castBuff（不耗 MP）
function castResonance(id, st) {
    const r = ITEMS[id].res, b = resCls(r).includes(player.cls) ? RES_CLASS_BONUS : 1;
    const k = { id: 'res_' + id, name: `共鳴・${r.name}`, mp: 0 };
    if (r.cd) player.cds['res_' + id] = gameNow + r.cd * 1000;   // cd 型與 lowhp 型的冷卻
    if (r.kind === 'strike') {
        if (!fightAlive()) return;
        Object.assign(k, { mult: r.mult * b, hits: r.hits, aoe: r.aoe, spread: r.spread, stun: r.stun, ignoreAc: r.ignoreAc, undeadMul: r.undeadMul });
        if (r.magic) k.magic = { dmg: r.magic.dmg.map(v => Math.round(v * b)), spK: r.magic.spK * b };
        doStrike(k, st);
    } else if (r.kind === 'spell') {
        if (!fightAlive()) return;
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
    if (r.trigger === 'hurt') return `被攻擊受傷時 ${Math.round(r.p * 100)}% 觸發`;
    if (r.trigger === 'lowhp') return `HP 低於 ${Math.round(r.pct * 100)}% 時觸發（冷卻 ${r.cd} 秒）`;
    return `每命中 1 次共鳴值 +1，滿 ${r.n} 點爆發`;
}
// 道具說明、圖鑑共用
function resonanceHtml(d) {
    const r = d.res;
    if (!r) return '';
    const T = RES_TIERS[r.tier];
    return `<div class="res-box ${T.cls}"><b>🌟 ${T.name}・${esc(r.name)}</b><small>（${RES_TRIGGER_NAMES[r.trigger]}）</small><br>
        ${esc(r.desc)}<br><small class="muted">${resTriggerText(r)}；不耗 MP，裝備時才有效</small>
        ${r.cls ? `<br><small>職業共鳴：${r.cls.map(c => CLASSES[c].name).join('、')}使用時效果 ×${RES_CLASS_BONUS}</small>` : ''}</div>`;
}
// 狩獵畫面增益列：身上每件共鳴裝備的狀態（冷卻倒數／觸發機率／共鳴值）
function resonanceChip() {
    return resItemIds().map(id => {
        const r = ITEMS[id].res, on = resCls(r).includes(player.cls) ? ' ✦' : '';
        const left = Math.ceil(((player.cds['res_' + id] || 0) - gameNow) / 1000);
        let s;
        if (r.trigger === 'cd' || r.trigger === 'lowhp') s = left > 0 ? `${left}秒` : r.trigger === 'cd' ? '就緒' : '待命';
        else if (r.trigger === 'charge') s = `${resChargeMap()[id] || 0}/${r.n}`;
        else s = `${Math.round(r.p * 100)}%`;
        return `<span class="chip res-chip ${RES_TIERS[r.tier].cls}" title="${esc(r.desc)}">🌟 ${esc(r.name)}${on} ${s}</span>`;
    }).join('');
}
