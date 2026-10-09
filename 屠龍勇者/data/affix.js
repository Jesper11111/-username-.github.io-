// 屠龍勇者：暗黑式裝備詞綴（ARCHITECTURE.md 第 21 節）（依賴 config、items）
// 怪物掉落的武器／防具會擲「品質」與隨機詞綴，存在道具實體上：
//   inst.q  品質：'magic' 魔法（藍，1～2 條）／'rare' 稀有（黃，3～4 條）／'legend' 傳說（橘，4 條＋1 條傳說詞綴）；沒有＝普通
//   inst.af 詞綴：[{ k, v }]，k 是能力代號（與 calcStats 的 fx 相同），v 是數值（百分比類存小數）
//   inst.il 物品等級（掉落怪物的等級），決定詞綴數值上限
//   inst.nm 稀有／傳說的名字前綴（魔法品質用第一條詞綴的前綴）
// 商店買的、鍛造、任務獎勵都是普通品質。calcStats 把已裝備道具的 af 加進能力。
const AFFIXES = {
    str:       { name: '力量',   pre: '蠻力的', min: 1, max: il => 1 + il / 25 },
    dex:       { name: '敏捷',   pre: '靈巧的', min: 1, max: il => 1 + il / 25 },
    con:       { name: '體質',   pre: '強健的', min: 1, max: il => 1 + il / 25 },
    int:       { name: '智力',   pre: '睿智的', min: 1, max: il => 1 + il / 25 },
    wis:       { name: '精神',   pre: '虔誠的', min: 1, max: il => 1 + il / 25 },
    hit:       { name: '命中',   pre: '精準的', min: 1, max: il => 2 + il / 10 },
    dmg:       { name: '傷害',   pre: '銳利的', min: 1, max: il => 1 + il / 12, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
    crit:      { name: '爆擊',   pre: '致命的', min: 0.01, max: il => 0.02 + il / 2500, pct: true, slots: ['weapon', 'gloves', 'ring', 'amulet'] },
    spdMul:    { name: '攻速',   pre: '迅捷的', min: 0.02, max: il => 0.03 + il / 1000, pct: true, slots: ['weapon', 'gloves'] },
    lifesteal: { name: '吸血',   pre: '嗜血的', min: 0.01, max: il => 0.01 + il / 4000, pct: true, slots: ['weapon', 'ring', 'amulet'] },
    hp:        { name: 'HP',     pre: '堅韌的', min: 5, max: il => 10 + il * 1.2 },
    mp:        { name: 'MP',     pre: '奧術的', min: 5, max: il => 8 + il * 0.8 },
    ac:        { name: '防禦（AC-）', pre: '堅固的', min: 1, max: il => 1 + il / 30, slots: ['helm', 'armor', 'shield', 'tshirt', 'cloak', 'gloves', 'boots', 'belt'] },
    mr:        { name: '魔防 MR', pre: '抗魔的', min: 2, max: il => 3 + il / 8 },
    hpRegen:   { name: '回血',   pre: '再生的', min: 1, max: il => 1 + il / 20 },
    mpRegen:   { name: '回魔',   pre: '冥想的', min: 1, max: il => 1 + il / 25 },
    sp:        { name: 'SP',     pre: '魔導的', min: 1, max: il => 1 + il / 30, slots: ['weapon', 'helm', 'amulet', 'ring', 'cloak'] },
    reduce:    { name: '減傷',   pre: '守護的', min: 1, max: il => 1 + il / 40, slots: ['armor', 'shield', 'helm', 'belt'] },
    dodge:     { name: '閃避',   pre: '幻影的', min: 0.01, max: il => 0.01 + il / 3000, pct: true, slots: ['boots', 'cloak', 'gloves', 'ring'] },
};
// 傳說詞綴：數值是一般上限的 2 倍，並加上專屬名稱
const LEGEND_AFFIXES = [
    { k: 'lifesteal', mul: 2, title: '血族' }, { k: 'spdMul', mul: 2, title: '疾風' }, { k: 'crit', mul: 2, title: '死神' },
    { k: 'reduce', mul: 2, title: '不滅' }, { k: 'hp', mul: 2.5, title: '巨人' }, { k: 'sp', mul: 2, title: '大賢者' },
];
const QUALITY = {
    magic:  { name: '魔法', cls: 'q-magic',  n: [1, 2], sell: 1.5 },
    rare:   { name: '稀有', cls: 'q-rare',   n: [3, 4], sell: 3 },
    legend: { name: '傳說', cls: 'q-legend', n: [4, 4], sell: 8 },
};
const RARE_NAMES = ['血月', '暗潮', '霜牙', '烈陽', '幽魂', '雷鳴', '龍骨', '黑曜', '星辰', '狂嵐', '冥火', '銀霜'];

function equipSlotOf(def) { return def.cat === 'weapon' ? 'weapon' : def.slot; }
function affixAllowed(k, def) { const a = AFFIXES[k]; return !a.slots || a.slots.includes(equipSlotOf(def)); }

function rollAffixValue(k, il, mul = 1) {
    const a = AFFIXES[k], hi = Math.max(a.min, a.max(il)) * mul;
    if (a.pct) return Math.round((a.min + Math.random() * (hi - a.min)) * 100) / 100;
    return Math.max(a.min, Math.round(a.min + Math.random() * (hi - a.min)));
}

// 掉落時擲品質：boss 掉的品質比較好；guaranteed 表示至少魔法（隨機裝備掉落）
function rollQuality(boss, guaranteed) {
    const r = Math.random();
    if (boss) return r < 0.10 ? 'legend' : r < 0.45 ? 'rare' : 'magic';
    if (guaranteed) return r < 0.04 ? 'legend' : r < 0.25 ? 'rare' : 'magic';
    return r < 0.02 ? 'legend' : r < 0.12 ? 'rare' : r < 0.40 ? 'magic' : null;
}

// 給道具實體加上品質與詞綴
function applyAffixes(inst, q, il) {
    const def = ITEMS[inst.id];
    if (!q || !def || (def.cat !== 'weapon' && def.cat !== 'armor')) return inst;
    const Q = QUALITY[q], n = rand(Q.n[0], Q.n[1]);
    const pool = Object.keys(AFFIXES).filter(k => affixAllowed(k, def));
    const af = [];
    if (q === 'legend') {
        const L = LEGEND_AFFIXES.filter(x => affixAllowed(x.k, def));
        const pick = L[rand(0, L.length - 1)];
        af.push({ k: pick.k, v: rollAffixValue(pick.k, il, pick.mul), lg: 1 });
        inst.nm = pick.title;
    }
    while (af.length < n + (q === 'legend' ? 1 : 0) && pool.length) {
        const k = pool.splice(rand(0, pool.length - 1), 1)[0];
        if (af.some(a => a.k === k)) continue;
        af.push({ k, v: rollAffixValue(k, il) });
    }
    inst.q = q; inst.af = af; inst.il = il;
    if (q === 'rare') inst.nm = RARE_NAMES[rand(0, RARE_NAMES.length - 1)];
    if (q === 'magic') inst.nm = AFFIXES[af[0].k].pre;
    return inst;
}

// 已裝備道具的詞綴合計成 fx（calcStats 用）
function affixFx(inst) {
    if (!inst || !inst.af) return null;
    const fx = {};
    for (const a of inst.af) fx[a.k] = (fx[a.k] || 0) + a.v;
    return fx;
}

function affixText(a) {
    const d = AFFIXES[a.k];
    return `${d.name} +${d.pct ? Math.round(a.v * 100) + '%' : a.v}`;
}

// 有品質的道具名稱：魔法＝前綴＋名稱；稀有＝「稱號」名稱；傳說＝傳說・稱號 名稱
function qualityName(inst, base) {
    if (!inst.q) return base;
    if (inst.q === 'magic') return `${inst.nm || ''}${base}`;
    if (inst.q === 'rare') return `「${inst.nm}」${base}`;
    return `傳說・${inst.nm} ${base}`;
}

// 單件售價（有品質的乘上倍率，詞綴越多越值錢）
function instSellPrice(inst) {
    const base = sellPriceOf(inst.id);
    if (!inst.q) return base;
    return Math.max(base, 50) * QUALITY[inst.q].sell + (inst.af ? inst.af.length * (inst.il || 1) * 10 : 0);
}

// 依怪物等級挑一件隨機裝備（隨機裝備掉落用）：回收價不超過 怪物等級 × 600 的武器／防具
function randomEquipFor(lv) {
    const cap = Math.max(300, lv * 600);
    const pool = Object.keys(ITEMS).filter(id => {
        const d = ITEMS[id];
        return (d.cat === 'weapon' || d.cat === 'armor') && !d.classes && sellPriceOf(id) <= cap;
    });
    return pool.length ? pool[rand(0, pool.length - 1)] : null;
}
