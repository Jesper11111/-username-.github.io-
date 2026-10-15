// 屠龍勇者：技能／道具／狀態圖示（ARCHITECTURE.md 第 41 節）（依賴 skills、items、player；resonance 在執行期才用）
// 原創 SVG「B 款發光填色」：深色方框、屬性色光暈與放射光、粗光管＋白色核心、光點、暗角。風格參考天堂 M，但不使用對方的圖檔。
// 技能自動配圖（名稱 → 說明 → 類型），同一個職業（含它能學的共用魔法）裡不重複：撞圖就換下一個候選符號，顏色保留屬性色。

// ───────── 符號（64×64 線條路徑）─────────
const ICON_SYM = {
    fire: '<path d="M32 9c4 9 13 13 13 25a13 13 0 0 1-26 0c0-7 4-10 6-15 1 5 3 7 5 8-1-7 0-12 2-18z"/><path d="M32 35c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z"/>',
    ice: '<path d="M32 9v46M12 20.5l40 23M12 43.5l40-23"/><path d="M26 14l6 6 6-6M26 50l6-6 6 6M11 28l8-.5-3-7M53 36l-8 .5 3 7M11 36l8 .5-3 7M53 28l-8-.5 3-7"/>',
    bolt: '<path d="M37 8L18 36h12l-5 20 21-30H34l3-18z"/>',
    wind: '<path d="M10 26h30a7 7 0 1 0-7-7"/><path d="M10 34h38a7 7 0 1 1-7 7"/><path d="M14 42h14"/>',
    tornado: '<path d="M12 14h40M16 22h32M21 30h22M25 38h14M28 46h8M31 53h2"/>',
    skull: '<path d="M19 31a13 13 0 0 1 26 0v8l-4 3v6H23v-6l-4-3z"/><circle cx="26.5" cy="33" r="3.2"/><circle cx="37.5" cy="33" r="3.2"/><path d="M30 48v-4M34 48v-4"/>',
    shadow: '<path d="M32 9c-11 0-17 11-17 23v22h34V32c0-12-6-23-17-23z"/><path d="M23 33c4-6 14-6 18 0-4 6-14 6-18 0z"/>',
    sun: '<circle cx="32" cy="32" r="8"/><path d="M32 9v8M32 47v8M9 32h8M47 32h8M16 16l6 6M42 42l6 6M48 16l-6 6M22 42l-6 6"/>',
    star: '<path d="M32 8l6 18h18l-14 11 5 18-15-11-15 11 5-18-14-11h18z"/>',
    heal: '<path d="M28 17h8v11h11v8H36v11h-8V36H17v-8h11z"/><path d="M49 12v6M46 15h6M15 46v6M12 49h6"/>',
    leaf: '<path d="M15 49C15 26 30 13 51 13c0 21-13 36-36 36z"/><path d="M15 49L40 24M27 37l-1-9M33 31l8 1"/>',
    shield: '<path d="M32 9l19 6v15c0 12-8 21-19 25-11-4-19-13-19-25V15z"/><path d="M32 18v29M22 28h20"/>',
    barrier: '<path d="M32 9l20 11.5v23L32 55 12 43.5v-23z"/><path d="M32 21l10 6v11l-10 6-10-6V27z"/>',
    counter: '<path d="M32 9l19 6v15c0 12-8 21-19 25-11-4-19-13-19-25V15z"/><path d="M23 31l9-9 9 9M23 41l9-9 9 9"/>',
    haste: '<path d="M17 38l15-15 15 15M17 51l15-15 15 15"/><path d="M32 10v7"/>',
    sword: '<path d="M32 7l5 7v26H27V14z"/><path d="M21 40h22M32 40v10"/><circle cx="32" cy="53.5" r="3"/>',
    swords: '<path d="M13 13l27 27M51 13L24 40"/><path d="M36 44l8-8M28 44l-8-8M42 46l7 7M22 46l-7 7"/>',
    target: '<circle cx="34" cy="34" r="15"/><circle cx="34" cy="34" r="6"/><path d="M9 9l25 25M9 9h9M9 9v9"/>',
    arrows: '<path d="M11 43L43 11M19 53L51 21M43 11h-9M43 11v9M51 21h-9M51 21v9"/>',
    meteor: '<circle cx="40" cy="40" r="10"/><path d="M33 33L11 11M39 29L22 12M29 39L12 22"/>',
    dagger: '<path d="M45 9L24 38l4 4 25-21z"/><path d="M19 38l9 9M21 45l-7 7"/><path d="M16 18c0 4-3 6-3 8a3 3 0 0 0 6 0c0-2-3-4-3-8z"/>',
    blood: '<path d="M32 9c8 12 15 20 15 29a15 15 0 0 1-30 0c0-9 7-17 15-29z"/><path d="M25 40a7 7 0 0 0 7 7"/>',
    eye: '<path d="M9 32c8-13 38-13 46 0-8 13-38 13-46 0z"/><circle cx="32" cy="32" r="7"/><circle cx="32" cy="32" r="2"/>',
    stun: '<path d="M13 32a19 19 0 1 1 19 19"/><path d="M32 23l2.8 6 6.5.6-4.9 4.3 1.5 6.4-5.9-3.4-5.9 3.4 1.5-6.4-4.9-4.3 6.5-.6z"/>',
    arcane: '<circle cx="32" cy="32" r="21"/><path d="M32 11l6.2 28.5L13 22h38L25.8 39.5z"/>',
    crown: '<path d="M13 45l4-23 9 10 6-15 6 15 9-10 4 23z"/><path d="M13 51h38"/>',
    power: '<path d="M32 53V20M21 31l11-11 11 11"/><path d="M17 12h30"/>',
    heart: '<path d="M32 51S11 39 11 24a10.5 10.5 0 0 1 21-4 10.5 10.5 0 0 1 21 4c0 15-21 27-21 27z"/>',
    lotus: '<path d="M32 47c-7-6-7-17 0-25 7 8 7 19 0 25z"/><path d="M32 47c-11 0-17-6-19-15 9 0 15 5 19 15zM32 47c11 0 17-6 19-15-9 0-15 5-19 15z"/><path d="M15 52h34"/>',
    burst: '<path d="M32 8l5 14 13-7-6 13 14 4-14 4 6 13-13-7-5 14-5-14-13 7 6-13-14-4 14-4-6-13 13 7z"/>',
    claw: '<path d="M17 50L33 12M27 53L43 15M37 55L51 23"/>',
    moon: '<path d="M40 11a21 21 0 1 0 13 31A17 17 0 0 1 40 11z"/><path d="M48 14v6M45 17h6"/>',
    wings: '<path d="M32 42C24 27 14 22 7 22c4 9 9 17 25 23M32 42c8-15 18-20 25-20-4 9-9 17-25 23"/><path d="M32 18v32"/>',
    spiral: '<path d="M32 32a4 4 0 1 1 4 4 8 8 0 1 1-8-8 12 12 0 1 1 12 12 16 16 0 1 1-16-16"/>',
    spear: '<path d="M51 13L17 47"/><path d="M51 13l-13 2 11 11z"/><path d="M13 51l6-6M21 41l2 2"/>',
    axe: '<path d="M21 52L42 17"/><path d="M37 12c9-1 16 6 16 15l-13-3z"/><path d="M33 27l-10-6"/>',
    chain: '<rect x="10" y="22" width="20" height="12" rx="6"/><rect x="34" y="30" width="20" height="12" rx="6"/><path d="M25 28h14M25 36h14"/>',
    hand: '<path d="M22 52V28M22 30V16a3 3 0 0 1 6 0v12M28 26V12a3 3 0 0 1 6 0v14M34 26V14a3 3 0 0 1 6 0v14M40 28V20a3 3 0 0 1 6 0v18c0 8-6 14-14 14h-4c-4 0-6-2-6-4"/>',
    potion: '<path d="M27 9h10v9l9 11v17a7 7 0 0 1-7 7H25a7 7 0 0 1-7-7V29l9-11z"/><path d="M18 35h28"/>',
    scroll: '<path d="M18 13h27a4 4 0 0 1 0 8H22v29a4 4 0 0 1-8 0V17a4 4 0 0 1 4-4z"/><path d="M27 30h15M27 38h15"/>',
    portal: '<ellipse cx="32" cy="31" rx="14" ry="20"/><ellipse cx="32" cy="31" rx="7" ry="12"/><path d="M12 55h40"/>',
};
const ICON_COLOR = { fire: '#ff7a2a', ice: '#5cc8ff', bolt: '#b48cff', wind: '#4fe0b8', dark: '#c46bff', holy: '#ffd25a', heal: '#6dff7d',
    guard: '#5a9cff', phys: '#ffab4a', poison: '#9dff4a', blood: '#ff4a5a', arcane: '#8a7bff', gray: '#e0cfa0' };
// 增益外框：藍＝技能、金＝藥水、紫＝共鳴裝備、紅＝負面
const ICON_FRAMES = { skill: ['#9ad8ff', '#2a6ad0', '#0c2a66'], item: ['#ffe7a0', '#c9902c', '#5a3a0c'], res: ['#e0b0ff', '#8a40d0', '#2c0a52'], bad: ['#ffb0a0', '#d0302a', '#5a0c0c'] };

// 一個圖示（SVG 字串，寬高 100% 由外層決定）。id 依內容固定，同樣的圖示產生同樣的字串，畫面每 250ms 重畫也不會一直換 DOM
const iconCache = new Map();
function iconSvg(sym, col, frame) {
    const key = sym + '|' + col + '|' + (frame || '');
    if (iconCache.has(key)) return iconCache.get(key);
    const id = 'ic-' + key.replace(/[^\w]/g, '_'), c = ICON_COLOR[col] || col, fg = ICON_FRAMES[frame], path = ICON_SYM[sym] || ICON_SYM.star;
    let seed = [...key].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
    const dots = [...Array(7)].map(() => { const a = rnd() * 6.28, r = 16 + rnd() * 10; return `<circle cx="${(32 + Math.cos(a) * r).toFixed(1)}" cy="${(32 + Math.sin(a) * r).toFixed(1)}" r="${(0.6 + rnd() * 1.2).toFixed(1)}"/>`; }).join('');
    const rays = [...Array(12)].map((_, k) => { const a = k / 12 * 6.28; return `M32 32L${(32 + Math.cos(a) * 40).toFixed(1)} ${(32 + Math.sin(a) * 40).toFixed(1)}`; }).join('');
    const g = fg || ['#5a5f68', '#22252b', '#0a0b0d'], inset = fg ? 4 : 2.5;
    const svg = `<svg class="ico" viewBox="0 0 64 64" aria-hidden="true"><defs>
        <linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g[0]}"/><stop offset=".5" stop-color="${g[1]}"/><stop offset="1" stop-color="${g[2]}"/></linearGradient>
        <radialGradient id="${id}b" cx="50%" cy="48%" r="58%"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset=".45" stop-color="${c}" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}v" cx="50%" cy="50%" r="70%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>
        <filter id="${id}g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2"/></filter>
        <filter id="${id}s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <clipPath id="${id}c"><rect x="${inset}" y="${inset}" width="${64 - inset * 2}" height="${64 - inset * 2}" rx="3"/></clipPath></defs>
        <rect x=".5" y=".5" width="63" height="63" rx="6" fill="url(#${id}k)"/>
        <rect x="${inset}" y="${inset}" width="${64 - inset * 2}" height="${64 - inset * 2}" rx="3.5" fill="#05060a"/>
        <g clip-path="url(#${id}c)">
            <rect width="64" height="64" fill="url(#${id}b)"/>
            <path d="${rays}" stroke="${c}" stroke-opacity=".12" stroke-width="2"/>
            <g fill="${c}" fill-opacity=".9" filter="url(#${id}s)">${dots}</g>
            <g fill="${c}" fill-opacity=".22" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#${id}g)" opacity=".95">${path}</g>
            <g fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${path}</g>
            <g fill="none" stroke="#fff" stroke-opacity=".95" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#${id}s)">${path}</g>
            <rect width="64" height="64" fill="url(#${id}v)"/>
            <path d="M5 5h54v14C40 14 22 14 5 22z" fill="#fff" fill-opacity=".05"/>
        </g></svg>`;
    iconCache.set(key, svg);
    return svg;
}

// ───────── 技能配圖 ─────────
// [比對字樣, 符號, 顏色]：同一招會收集所有符合的規則（名稱先、說明後），依序當候選
const SKILL_ICON_RULES = [
    [/治癒|治療|回復|復原/, 'heal', 'heal'], [/光箭|光裂|光之/, 'star', 'holy'], [/流星|隕/, 'meteor', 'fire'],
    [/煉獄|烈炎|火|炎|焰|燃燒|爆/, 'fire', 'fire'], [/冰|寒|雪|霜/, 'ice', 'ice'], [/雷|電/, 'bolt', 'bolt'],
    [/龍捲/, 'tornado', 'wind'], [/風|旋/, 'wind', 'wind'], [/吸血|血/, 'blood', 'blood'], [/毒/, 'dagger', 'poison'],
    [/魂|死|亡|骷/, 'skull', 'dark'], [/月/, 'moon', 'dark'], [/暗影|黑闇|闇|暗|影|隱/, 'shadow', 'dark'],
    [/屏障|結界/, 'barrier', 'guard'], [/反擊|反射|反彈/, 'counter', 'guard'], [/盾|護|鎧|甲|防禦|鋼鐵|保護|堅/, 'shield', 'guard'],
    [/翼|天使|飛|羽/, 'wings', 'holy'], [/傳送|瞬|閃/, 'portal', 'arcane'], [/加速|迅|疾|敏捷|速|神速/, 'haste', 'wind'],
    [/冥想|精神|專注|集中/, 'lotus', 'arcane'], [/體魄|生命|活力|強健/, 'heart', 'heal'], [/暈|衝擊|震|昏/, 'stun', 'holy'],
    [/王|皇|帝|士氣|激勵|號令/, 'crown', 'holy'], [/力量|狂暴|狂怒|勇|鬥志|怒/, 'power', 'blood'], [/爪|牙|撕|咬/, 'claw', 'blood'],
    [/鎖|鏈|束縛|纏/, 'chain', 'gray'], [/斧/, 'axe', 'phys'], [/矛|槍術|突刺/, 'spear', 'phys'], [/掌|拳|手/, 'hand', 'phys'],
    [/連射|多重|散射|箭雨/, 'arrows', 'phys'], [/目標|瞄|精準|狙|射|箭|槍|彈/, 'target', 'phys'],
    [/光|究極|聖|神/, 'sun', 'holy'], [/星/, 'star', 'holy'], [/漩|渦|螺旋/, 'spiral', 'arcane'], [/雙|連|亂|二連|三連/, 'swords', 'phys'],
    [/斬|劍|刃|砍|劈|刺|突|擊|打/, 'sword', 'phys'], [/魔|法|咒/, 'arcane', 'arcane'], [/眼|視|察/, 'eye', 'gray'],
];
// 撞圖時先換「同屬性的其他符號」（顏色不變，看起來還是同一系），再換類型備用符號
const ELEMENT_ALTS = {
    fire: ['fire', 'meteor', 'burst', 'sun', 'spiral'], ice: ['ice', 'spear', 'star', 'burst', 'tornado'], bolt: ['bolt', 'burst', 'spiral', 'star', 'eye'],
    wind: ['wind', 'tornado', 'haste', 'spiral', 'wings'], dark: ['shadow', 'skull', 'moon', 'claw', 'eye', 'spiral'], holy: ['sun', 'star', 'wings', 'crown', 'burst', 'eye'],
    heal: ['heal', 'leaf', 'heart', 'lotus', 'sun'], guard: ['shield', 'barrier', 'counter', 'crown', 'wings'], phys: ['sword', 'swords', 'axe', 'spear', 'claw', 'target', 'hand', 'burst'],
    poison: ['dagger', 'claw', 'blood', 'skull'], blood: ['blood', 'power', 'claw', 'heart', 'fire'], arcane: ['arcane', 'spiral', 'star', 'eye', 'moon', 'portal'], gray: ['eye', 'chain', 'star', 'crown'],
};
// 類型備用符號，顏色沿用第一個候選的屬性色
const SKILL_ICON_POOL = {
    spell: ['arcane', 'burst', 'star', 'spiral', 'meteor', 'eye', 'moon', 'bolt', 'claw'],
    strike: ['sword', 'swords', 'claw', 'axe', 'spear', 'burst', 'target', 'dagger', 'hand', 'stun', 'power', 'chain'],
    heal: ['heal', 'leaf', 'heart', 'lotus', 'sun'],
    buff: ['sun', 'shield', 'crown', 'power', 'haste', 'heart', 'lotus', 'barrier', 'counter', 'wings', 'eye', 'star', 'moon'],
    passive: ['eye', 'crown', 'star', 'heart', 'power', 'lotus', 'shield', 'moon', 'wings', 'spiral'],
};
function skillIconCandidates(s) {
    const out = [];
    const add = (sym, col) => { if (!out.some(([a, b]) => a === sym && b === col)) out.push([sym, col]); };
    // 屬性色＝名稱第一個符合的規則（沒有就看說明、再看類型）；之後所有候選都用這個顏色，換圖也看得出是同一系
    const byName = SKILL_ICON_RULES.filter(([re]) => re.test(s.name)), byDesc = SKILL_ICON_RULES.filter(([re]) => re.test(s.desc || ''));
    const def = { spell: ['arcane', 'arcane'], buff: ['sun', 'holy'], passive: ['eye', 'gray'], heal: ['heal', 'heal'] }[s.type] || ['sword', 'phys'];
    const col = s.type === 'heal' ? 'heal' : byName.length ? byName[0][2] : byDesc.length ? byDesc[0][2] : def[1];
    if (s.type === 'heal') add('heal', 'heal');
    for (const [, sym] of byName) add(sym, col);
    for (const sym of ELEMENT_ALTS[col] || []) add(sym, col);                              // 撞圖：同屬性換符號
    for (const [, sym] of byDesc) add(sym, col);
    if (s.aoe) add('burst', col);
    for (const sym of SKILL_ICON_POOL[s.type] || SKILL_ICON_POOL.strike) add(sym, col);   // 再不行：類型備用符號、保留屬性色
    add(def[0], col);
    for (const sym of Object.keys(ICON_SYM)) if (!['potion', 'scroll', 'portal'].includes(sym)) add(sym, col);   // 最後的保險：任何符號
    return out;
}
// 技能 id → [符號, 顏色]。不重複規則：
//   共用魔法 34 招彼此：「符號＋顏色」不重複（同屬性的魔法換成同色的其他符號）
//   同一職業的職業技能彼此：符號就不重複；跟共用魔法：「符號＋顏色」不重複
// 兩輪分配：第一輪每招先拿「第一志願」（沒人用的話），第二輪剩下的再往後找，避免先排到的把後面那招最貼切的圖搶走。不同職業之間可以同圖。
let SKILL_ICON_MAP = null;
function assignSkillIcons(list, usedKey, usedSym) {
    const key = c => c[0] + '|' + c[1];
    const ok = c => !usedKey.has(key(c)) && !(usedSym && usedSym.has(c[0]));
    const take = (s, c) => { usedKey.add(key(c)); if (usedSym) usedSym.add(c[0]); SKILL_ICON_MAP[s.id] = c; };
    const rest = [];
    for (const s of list) { const first = skillIconCandidates(s)[0]; if (ok(first)) take(s, first); else rest.push(s); }
    for (const s of rest) {
        const cands = skillIconCandidates(s);
        take(s, cands.find(ok) || cands.find(c => !usedKey.has(key(c))) || cands[0]);
    }
}
function buildSkillIconMap() {
    SKILL_ICON_MAP = {};
    const magicKey = new Set();
    assignSkillIcons(MAGIC, magicKey, null);
    for (const cls in SKILLS) assignSkillIcons(SKILLS[cls].filter(s => !SKILL_ICON_MAP[s.id]), new Set(magicKey), new Set());
}
function skillIconOf(s) {
    if (!SKILL_ICON_MAP) buildSkillIconMap();
    return SKILL_ICON_MAP[s.id] || skillIconCandidates(s)[0];
}
// ───────── 技能圖片（使用者提供的 Gemini 生成圖，images/icons/sk/；2026-10-15）─────────
// 三張大圖（tools/icon-src/）裁成 128×128：a＝第一張、b＝第二張、c＝第三張（6×6 繪畫風），後面 4 碼＝列、欄。逐招人工挑選，
// 全遊戲 146 招每招一張圖、沒有重複。沒列在這裡的技能（之後新增的）用上面的 SVG 自動配圖。
const SKILL_IMG = {
    // 共用魔法
    energyBolt: 'b0303', heal1: 'b0319', mShield: 'a0403', holyWeapon: 'a0416', iceDagger: 'a0202', windCutter: 'b0012', armorBless: 'b0101', meditate: 'b0109', heal2: 'b0513', fireArrow: 'a0312', auroraBolt: 'a0215', enchantDex: 'b0316', fireball: 'b0212', haste: 'b0601', vampKiss: 'a0112', enchantStr: 'b0600', lightning: 'a0217', frostBreath: 'b0018', berserkSpell: 'a0205', heal3: 'b0510', blaze: 'a0305', iceLance: 'a0313', bodyBless: 'b0500', blizzard: 'a0203', tornado: 'a0411', mageBarrier: 'b0512', fullHeal: 'a0415', thunderStorm: 'a0300', holyBarrier: 'b0401', meteor: 'b0112', disintegrate: 'a0101', absBarrier: 'b0313', mageInferno: 'a0014', darkStar: 'b0200',
    // 王族
    royalAim: 'b0415', royalStrike: 'b0118', royalMorale: 'b0418', royalIron: 'b0102', royalAura: 'a0117', royalImpact: 'c0400', royalWrath: 'a0507', royalDecree: 'a0413',
    // 騎士
    knightBash: 'a0401', knightStun: 'b0409', knightCharge: 'b0215', knightSolid: 'b0110', knightWill: 'a0211', knightCounter: 'a0417', knightVow: 'a0116', knightGuard: 'b0216', knightShield: 'b0017', knightWrath: 'a0503', knightVerdict: 'b0113',
    // 法師
    mageFocus: 'a0012', mageMind: 'a0414',
    // 妖精
    elfShot: 'a0100', elfWind: 'b0507', elfEarth: 'a0410', elfBless: 'b0005', elfTriple: 'b0304', elfSpring: 'a0510', elfStorm: 'b0119', elfFire: 'a0317', elfPierce: 'a0212', elfRain: 'b0214',
    // 黑暗妖精
    deStab: 'a0311', deShadow: 'b0203', dePoison: 'b0205', deBurn: 'b0019', deFang: 'a0505', deBody: 'b0106', deDouble: 'b0013', deStorm: 'b0016', deAssassin: 'a0209', deArmor: 'b0100', deNightmare: 'a0301',
    // 修羅
    shuraPalm: 'b0117', shuraCombo: 'b0116', shuraIron: 'c0100', shuraBreak: 'a0409', shuraWhirl: 'a0412', shuraRage: 'a0204', shuraBlood: 'a0504', shuraThousand: 'c0001', shuraFist: 'b0400', shuraWrath: 'b0402', shuraAsura: 'a0113',
    // 戰士
    warStrike: 'c0003', warSmash: 'b0406', warLeap: 'b0305', warTough: 'a0400', warIron: 'b0410', warBerserk: 'c0403', warWhirl: 'c0504', warTitan: 'b0011', warExecute: 'a0506', warCry: 'a0208', warQuake: 'c0303',
    // 槍手
    gunQuick: 'b0504', gunAim: 'b0515', gunBlast: 'b0414', gunFlash: 'c0205', gunRapid: 'b0501', gunSteady: 'a0513', gunSnipe: 'b0416', gunPierce: 'b0419', gunBarrage: 'a0516', gunRocket: 'b0519', gunBullet: 'b0518',
    // 魔鬥士
    mfSlash: 'b0009', mfEnchant: 'b0201', mfThunder: 'b0315', mfFlame: 'b0311', mfShield: 'a0108', mfFocus: 'b0210', mfBurst: 'b0108', mfStorm: 'b0301', mfAvatar: 'b0412', mfCollapse: 'a0406',
    // 聖騎士
    palStrike: 'c0202', palShield: 'b0213', palHammer: 'c0000', palAura: 'c0102', palBless: 'a0115', palRighteous: 'c0302', palJudge: 'a0405', palDivine: 'a0508',
    // 天使
    holyBolt: 'c0305', angelAegis: 'a0517', angelWings: 'c0402', angelJudge: 'c0002', angelGrace: 'c0204', angelRay: 'a0110', angelWrath: 'c0505', angelSanct: 'b0408', angelSeraph: 'b0008',
    // 惡魔
    demonThirst: 'a0016', demonSlash: 'c0105', demonPact: 'b0111', demonSkin: 'b0411', demonFear: 'a0114', demonBloodlust: 'c0104', demonHellfire: 'c0201', demonDrain: 'c0101', demonLord: 'c0203', demonDoom: 'c0304',
};
// 共鳴裝備（resonance.js 的 RESONANCE）：每件一張圖，地圖左上角狀態與共鳴觸發的增益（id ＝ res_裝備id）共用；不跟技能圖重複
const RES_IMG = {
    tsurugi: 'a0207', holyMace: 'a0107', darkClaw: 'b0103', darkDual: 'b0015', manaWand: 'a0314', pirateCannon: 'a0500', magicSniper: 'a0512', iceQueenStaff: 'b0310', abyssScythe: 'c0500',
    demonAxe: 'c0503', wyvernSpear: 'a0210', ifritClaw: 'a0302', dragonSlayer: 'c0200', dkFlameSword: 'b0211', windBow: 'b0506', royalKingSword: 'b0006', knightOathSword: 'b0114', mageArchStaff: 'a0402',
    elfWorldBow: 'b0508', darkDualBlades: 'b0014', shuraDualBlades: 'b0302', warTitanAxe: 'b0407', gunDragonGun: 'a0502', mfHolySword: 'a0316', palJudgeHammer: 'a0509', angelSpear: 'b0306', demonDeathScythe: 'c0501',
    earthRender: 'b0404', tidalStaff: 'b0208', galeBow: 'b0517', infernoBlade: 'a0308', knightHelm: 'a0404', protectCloak: 'a0111', powerGloves: 'b0115', wolfAmulet: 'a0200', pirateRing: 'b0318',
    hasteBoots: 'b0317', mrCloak: 'c0401', titanBelt: 'b0217', frostShield: 'b0219', wyvernHelm: 'a0206', flameGloves: 'a0213', dragonScaleMail: 'a0315', archmageHat: 'a0511', phoenixMail: 'a0307',
    shadowCloak: 'b0107', giantBelt: 'b0403', angelRing: 'b0007', demonRing: 'c0300', abyssAmulet: 'a0304', earthGuard: 'b0218', tideHeart: 'b0307', galeBoots: 'b0511', dragonHeartRing: 'c0005',
};
function skillIconHtml(s, frame) {
    if (s.id && s.id.startsWith('res_') && RES_IMG[s.id.slice(4)]) return imgIconHtml('sk/' + RES_IMG[s.id.slice(4)], frame);
    if (SKILL_IMG[s.id]) return imgIconHtml('sk/' + SKILL_IMG[s.id], frame);
    const [sym, col] = skillIconOf(s);
    return iconSvg(sym, col, frame);
}

// ───────── 圖片圖示（使用者提供的圖，images/icons/；2026-10-15）─────────
// 外框用 CSS 漸層畫（.ico-img，顏色同 ICON_FRAMES），裡面放圖。藥水：勇水＝粉紅、綠水＝淺藍瓶轉綠、藍水＝深藍、慎重藥水＝紫
const POTION_IMG = { brave: 'potion-brave', green: 'potion-green', blue: 'potion-blue', wisdom: 'potion-wisdom' };
const ICON_IMG_VER = 1;   // 換圖時加一（瀏覽器快取）
function imgIconHtml(file, frame) {
    const g = ICON_FRAMES[frame] || ['#5a5f68', '#22252b', '#0a0b0d'];
    return `<span class="ico ico-img ${frame ? 'framed' : ''}" style="--f1:${g[0]};--f2:${g[1]};--f3:${g[2]}"><img src="images/icons/${file}.jpg?v=${ICON_IMG_VER}" alt="" draggable="false"></span>`;
}
function flaskSvg(kind, frame) { return imgIconHtml(POTION_IMG[kind] || POTION_IMG.blue, frame); }

// ───────── 道具圖示（快捷欄的藥水、卷軸）─────────
const ITEM_ICON = {
    redPotion: ['potion', 'blood'], orangePotion: ['potion', 'fire'], whitePotion: ['potion', 'gray'], ancientPotion: ['potion', 'holy'],
    greenPotion: ['flask', 'green'], bravePotion: ['flask', 'brave'], elvenWafer: ['leaf', 'heal'], wisdomPotion: ['flask', 'wisdom'], bluePotion: ['flask', 'blue'],
    homeScroll: ['scroll', 'holy'], teleScroll: ['portal', 'arcane'],
};
function itemIconOf(id) {
    if (ITEM_ICON[id]) return ITEM_ICON[id];
    const d = ITEMS[id] || {};
    return d.heal ? ['potion', 'blood'] : d.buff ? ['potion', 'arcane'] : d.cat === 'scroll' ? ['scroll', 'gray'] : ['star', 'gray'];
}
function itemIconHtml(id, frame) { const [sym, col] = itemIconOf(id); return sym === 'flask' ? flaskSvg(col, frame) : iconSvg(sym, col, frame); }

// ───────── 地圖左上角狀態：增益與共鳴裝備改成圖示＋剩餘時間（2026-10-15）─────────
function fmtBuffTime(sec) { return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec}秒`; }
function buffIconsHtml() {
    const now = gameNow, equippedRes = typeof resItemIds === 'function' ? resItemIds() : [];
    // 共鳴觸發的增益（res_裝備id）：裝備還穿著就不另外多一格，改在下面那件裝備的圖示上發光＋顯示秒數（避免同一張圖出現兩次）
    const buffs = Object.keys(player.buffs).filter(k => player.buffs[k].until > now && !(k.startsWith('res_') && equippedRes.includes(k.slice(4)))).map(k => {
        const b = player.buffs[k], sec = Math.ceil((b.until - now) / 1000), sk = b.src === 'skill' && findSkill(b.id);
        const ico = sk ? skillIconHtml(sk, 'skill') : ITEMS[b.id] ? itemIconHtml(b.id, 'item') : iconSvg('sun', 'holy', 'skill');
        const name = buffName(b) || k;
        return `<div class="bf ${sec <= 10 ? 'low' : ''}" title="${esc(name)}" onclick="buffTip('${esc(name)}')">${ico}<span>${fmtBuffTime(sec)}</span></div>`;
    });
    // 共鳴裝備（resonance.js）：紫框，下方顯示冷卻／充能／機率
    const res = equippedRes.map(id => {
        const r = ITEMS[id].res, left = Math.ceil(((player.cds['res_' + id] || 0) - now) / 1000), act = player.buffs['res_' + id];
        let s;
        if (act && act.until > now) {   // 共鳴增益生效中：顯示剩餘秒數、圖示發光
            const sec = Math.ceil((act.until - now) / 1000);
            const ico = RES_IMG[id] ? imgIconHtml('sk/' + RES_IMG[id], 'res') : iconSvg('star', 'dark', 'res');
            return `<div class="bf on ${sec <= 10 ? 'low' : ''}" title="${esc(r.name + '（生效中）：' + r.desc)}" onclick="buffTip('${esc(r.name)}')">${ico}<span>${fmtBuffTime(sec)}</span></div>`;
        }
        if (r.trigger === 'cd' || r.trigger === 'lowhp') s = left > 0 ? `${left}秒` : r.trigger === 'cd' ? '就緒' : '待命';
        else if (r.trigger === 'charge') s = `${resChargeMap()[id] || 0}/${r.n}`;
        else s = `${Math.round(r.p * 100)}%`;
        const on = resCls(r).includes(player.cls) ? '（職業共鳴）' : '';
        const ico = RES_IMG[id] ? imgIconHtml('sk/' + RES_IMG[id], 'res') : iconSvg('star', 'dark', 'res');
        return `<div class="bf" title="${esc(r.name + on + '：' + r.desc)}" onclick="buffTip('${esc(r.name + on)}')">${ico}<span>${s}</span></div>`;
    });
    return buffs.concat(res).join('');
}
function buffTip(name) { showToast(name, 1500); }
