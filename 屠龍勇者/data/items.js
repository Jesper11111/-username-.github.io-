// 屠龍勇者：道具、裝備、彈藥、材料、鍛造配方（依賴 config.js）

// 武器種類：spd 不喝水時的攻擊間隔（毫秒，騎士為準）、two 雙手（不能拿盾）、ranged 遠程（吃敏捷、耗彈藥）、double 雙擊率
// 2026-10-18 改成天堂式（使用者給的天堂攻速資料）：間隔＝武器 spd × 職業動作係數 ÷ 綠水 1.33 ÷ 二段加速（勇水 1.33／精靈餅乾 1.15）× (1−其他攻速)，見 player.js calcStats
// 對照：騎士單手劍 920ms＝65 下/分，綠水 87 下/分（天堂約 86）、綠水＋勇水 116 下/分；妖精弓 1000ms＝60 下/分，綠水 80、綠水＋精餅 92（天堂 60→78→89～90）
const WEAPON_TYPES = {
    fist:    { name: '空手',   spd: 1000 },
    dagger:  { name: '匕首',   spd: 850 },
    sword:   { name: '單手劍', spd: 920 },
    twohand: { name: '雙手劍', spd: 1000, two: true },
    axe:     { name: '斧',     spd: 1000 },
    spear:   { name: '矛',     spd: 1050, two: true },
    blunt:   { name: '鈍器',   spd: 950 },
    bow:     { name: '弓',     spd: 1000, two: true, ranged: true, ammo: 'arrow' },
    gun:     { name: '槍',     spd: 1100, two: true, ranged: true, ammo: 'bullet' },
    staff:   { name: '魔杖',   spd: 1050 },
    claw:    { name: '鋼爪',   spd: 800,  two: true },
    dual:    { name: '雙刀',   spd: 800,  two: true, double: 0.25 },
    scythe:  { name: '鐮刀',   spd: 1050, two: true },
};
// 職業動作係數（天堂：不同職業拿同類武器揮動格數不同；越大越慢）。weapons 裡可以針對專精武器另外給
const CLASS_ATK_K = {
    knight: { k: 1.0 }, warrior: { k: 1.0 }, paladin: { k: 1.05 }, royal: { k: 1.1 },
    elf: { k: 1.1, weapons: { bow: 1.0 } }, gunner: { k: 1.1, weapons: { gun: 1.0, bow: 1.0 } },
    darkelf: { k: 0.95 }, shura: { k: 0.95 }, demon: { k: 1.0 },
    magicfighter: { k: 1.1 }, angel: { k: 1.15 }, mage: { k: 1.25 },
};
function classAtkK(cls, type) { const c = CLASS_ATK_K[cls] || { k: 1 }; return (c.weapons && c.weapons[type]) || c.k; }
// 不喝水時的攻擊間隔（說明、圖鑑用；有角色時乘上職業動作係數）
function weaponBaseMs(type, cls = player && player.cls) { return Math.round(WEAPON_TYPES[type].spd * (cls ? classAtkK(cls, type) : 1)); }

const SLOTS = {
    weapon: '武器', shield: '盾牌', helm: '頭盔', armor: '盔甲', tshirt: '內衣', cloak: '斗篷',
    gloves: '手套', boots: '長靴', amulet: '項鍊', ring1: '戒指', ring2: '戒指', belt: '腰帶',
};
const SLOT_KEYS = Object.keys(SLOTS);

// 藥水增益效果（player.buffs 的 key 就是這裡的 key）
const BUFF_DEFS = {
    haste:  { name: '加速', fx: { haste: true } },
    brave:  { name: '勇敢', fx: { brave: true } },
    wisdom: { name: '慎重', fx: { sp: 2, mpRegen: 2, wise: true } },   // wise：施法間隔 −0.3 秒（法師、魔鬥士、天使的「勇水」）
    blue:   { name: '藍水', fx: { mpRegen: 4 } },
};

// cat：weapon／armor／potion／scroll／ammo／elixir／material
// 武器 dmg:[對小型, 對大型] 最大傷害（最小 1）；safe 安定值（-1 不可強化）
// price：商店售價（tier 決定哪個等級的村莊有賣）；sell：沒有售價時的回收價
const ITEMS = {
    // ── 匕首 ──
    dagger:        { name: '匕首',     cat: 'weapon', type: 'dagger', dmg: [4, 3], safe: 6, wt: 15, price: 30, tier: 1 },
    silverDagger:  { name: '銀匕首',   cat: 'weapon', type: 'dagger', dmg: [5, 4], silver: true, safe: 6, wt: 15, price: 600, tier: 2 },
    darkDagger:    { name: '暗影匕首', cat: 'weapon', type: 'dagger', dmg: [9, 8], crit: 0.05, safe: 6, wt: 15, sell: 3000 },
    // ── 單手劍 ──
    shortSword:    { name: '短劍',     cat: 'weapon', type: 'sword', dmg: [6, 5], safe: 6, wt: 30, price: 80, tier: 1 },
    longSword:     { name: '長劍',     cat: 'weapon', type: 'sword', dmg: [8, 12], safe: 6, wt: 50, price: 400, tier: 1 },
    silverSword:   { name: '銀長劍',   cat: 'weapon', type: 'sword', dmg: [8, 12], silver: true, safe: 6, wt: 50, price: 1500, tier: 2 },
    katana:        { name: '武士刀',   cat: 'weapon', type: 'sword', dmg: [12, 12], hit: 2, safe: 6, wt: 60, sell: 6000 },
    tsurugi:       { name: '瑟魯基之劍', cat: 'weapon', type: 'sword', dmg: [15, 15], hit: 3, safe: 6, wt: 70, sell: 20000 },
    dragonSlayer:  { name: '屠龍劍',   cat: 'weapon', type: 'sword', dmg: [24, 28], hit: 5, dragon: 1.5, safe: 6, wt: 80, sell: 100000, desc: '傳說中斬殺巨龍的劍，對龍族傷害 ×1.5' },
    // ── 雙手劍 ──
    twoHandSword:  { name: '雙手劍',   cat: 'weapon', type: 'twohand', dmg: [12, 16], safe: 6, wt: 120, price: 1200, tier: 2 },
    dkFlameSword:  { name: '死亡騎士的烈炎之劍', cat: 'weapon', type: 'twohand', dmg: [20, 24], hit: 3, safe: 6, wt: 150, sell: 40000 },
    // ── 斧 ──
    handAxe:       { name: '手斧',     cat: 'weapon', type: 'axe', dmg: [6, 8], safe: 6, wt: 40, price: 120, tier: 1 },
    battleAxe:     { name: '巨斧',     cat: 'weapon', type: 'axe', dmg: [10, 14], safe: 6, wt: 100, price: 2000, tier: 3 },
    demonAxe:      { name: '惡魔之斧', cat: 'weapon', type: 'axe', dmg: [16, 20], hit: 2, safe: 6, wt: 110, sell: 25000 },
    // ── 矛 ──
    spear:         { name: '長矛',     cat: 'weapon', type: 'spear', dmg: [8, 10], safe: 6, wt: 80, price: 500, tier: 2 },
    trident:       { name: '三叉戟',   cat: 'weapon', type: 'spear', dmg: [12, 15], hit: 1, safe: 6, wt: 90, price: 3500, tier: 3 },
    // ── 鈍器 ──
    mace:          { name: '釘錘',     cat: 'weapon', type: 'blunt', dmg: [6, 7], safe: 6, wt: 40, price: 100, tier: 1 },
    warHammer:     { name: '戰錘',     cat: 'weapon', type: 'blunt', dmg: [10, 12], safe: 6, wt: 90, price: 2500, tier: 3 },
    holyMace:      { name: '聖光之錘', cat: 'weapon', type: 'blunt', dmg: [14, 16], hit: 2, silver: true, safe: 6, wt: 90, sell: 20000 },
    // ── 弓 ──
    shortBow:      { name: '短弓',     cat: 'weapon', type: 'bow', dmg: [4, 4], safe: 6, wt: 30, price: 100, tier: 1 },
    longBow:       { name: '長弓',     cat: 'weapon', type: 'bow', dmg: [7, 7], safe: 6, wt: 40, price: 1500, tier: 2 },
    elvenBow:      { name: '精靈之弓', cat: 'weapon', type: 'bow', dmg: [10, 10], hit: 3, safe: 6, wt: 40, sell: 8000 },
    windBow:       { name: '風之弓',   cat: 'weapon', type: 'bow', dmg: [16, 16], hit: 5, safe: 6, wt: 40, sell: 60000 },
    // ── 槍 ──
    matchlock:     { name: '火繩槍',   cat: 'weapon', type: 'gun', dmg: [6, 6], safe: 6, wt: 60, price: 150, tier: 1 },
    rifle:         { name: '來福槍',   cat: 'weapon', type: 'gun', dmg: [10, 10], safe: 6, wt: 70, price: 2500, tier: 3 },
    magicSniper:   { name: '魔導狙擊槍', cat: 'weapon', type: 'gun', dmg: [16, 16], hit: 4, crit: 0.05, safe: 6, wt: 80, sell: 30000 },
    // ── 魔杖 ──
    oakWand:       { name: '橡木魔杖', cat: 'weapon', type: 'staff', dmg: [3, 3], sp: 1, safe: 6, wt: 20, price: 80, tier: 1 },
    crystalWand:   { name: '水晶魔杖', cat: 'weapon', type: 'staff', dmg: [5, 5], sp: 2, safe: 6, wt: 25, price: 2500, tier: 2 },
    manaWand:      { name: '瑪那魔杖', cat: 'weapon', type: 'staff', dmg: [6, 6], sp: 2, drain: [1, 6], safe: 6, wt: 25, sell: 10000, desc: '攻擊命中時吸取 MP' },
    iceQueenStaff: { name: '冰之女王魔杖', cat: 'weapon', type: 'staff', dmg: [10, 10], sp: 5, safe: 6, wt: 30, sell: 40000 },
    // ── 鋼爪／雙刀 ──
    claw:          { name: '鋼爪',     cat: 'weapon', type: 'claw', dmg: [7, 7], safe: 6, wt: 40, price: 600, tier: 1 },
    darkClaw:      { name: '暗黑鋼爪', cat: 'weapon', type: 'claw', dmg: [13, 13], crit: 0.05, safe: 6, wt: 45, sell: 15000 },
    dualBlade:     { name: '雙刀',     cat: 'weapon', type: 'dual', dmg: [6, 6], safe: 6, wt: 50, price: 600, tier: 1 },
    // ── 鐮刀（惡魔）──
    reaperScythe:  { name: '收割者鐮刀', cat: 'weapon', type: 'scythe', dmg: [8, 10], safe: 6, wt: 60, price: 150, tier: 1 },
    boneScythe:    { name: '骨鐮',     cat: 'weapon', type: 'scythe', dmg: [13, 16], safe: 6, wt: 80, price: 2500, tier: 3 },
    abyssScythe:   { name: '深淵鐮刀', cat: 'weapon', type: 'scythe', dmg: [18, 22], hit: 3, lifesteal: 0.03, safe: 6, wt: 90, sell: 30000, desc: '吸血 +3%' },
    darkDual:      { name: '暗黑雙刀', cat: 'weapon', type: 'dual', dmg: [12, 12], crit: 0.03, safe: 6, wt: 55, sell: 15000 },

    // ── 防具（ac 越大越好，顯示時 AC 越低越硬）──
    leatherCap:    { name: '皮帽',     cat: 'armor', slot: 'helm', ac: 1, safe: 4, wt: 10, price: 40, tier: 1 },
    ironHelm:      { name: '鋼盔',     cat: 'armor', slot: 'helm', ac: 2, safe: 4, wt: 40, price: 500, tier: 2 },
    knightHelm:    { name: '騎士頭盔', cat: 'armor', slot: 'helm', ac: 3, safe: 4, wt: 50, sell: 5000 },
    magicHelm:     { name: '魔法頭盔', cat: 'armor', slot: 'helm', ac: 2, sp: 1, mr: 5, safe: 4, wt: 20, sell: 8000 },
    leatherArmor:  { name: '皮甲',     cat: 'armor', slot: 'armor', ac: 2, safe: 4, wt: 60, price: 100, tier: 1 },
    scaleMail:     { name: '鱗甲',     cat: 'armor', slot: 'armor', ac: 4, safe: 4, wt: 200, price: 800, tier: 2 },
    chainMail:     { name: '鍊甲',     cat: 'armor', slot: 'armor', ac: 5, safe: 4, wt: 250, price: 2000, tier: 2 },
    plateMail:     { name: '板甲',     cat: 'armor', slot: 'armor', ac: 7, safe: 4, wt: 450, price: 6000, tier: 3 },
    mageRobe:      { name: '法師長袍', cat: 'armor', slot: 'armor', ac: 3, mr: 15, sp: 1, safe: 4, wt: 40, price: 3000, tier: 3 },
    elvenMail:     { name: '精靈鍊甲', cat: 'armor', slot: 'armor', ac: 5, mr: 10, safe: 6, wt: 100, sell: 8000, classes: ['elf'] },
    dragonScaleMail: { name: '龍鱗鎧', cat: 'armor', slot: 'armor', ac: 10, mr: 20, reduce: 3, safe: 6, wt: 200, sell: 100000, desc: '龍裔守護系列・盔甲。以四大龍的鱗片打造，減傷 3' },
    woodShield:    { name: '木盾',     cat: 'armor', slot: 'shield', ac: 1, safe: 4, wt: 40, price: 50, tier: 1 },
    ironShield:    { name: '鋼盾',     cat: 'armor', slot: 'shield', ac: 2, safe: 4, wt: 100, price: 700, tier: 2 },
    knightShield:  { name: '騎士盾',   cat: 'armor', slot: 'shield', ac: 4, safe: 4, wt: 120, sell: 6000 },
    tshirt:        { name: 'T恤',      cat: 'armor', slot: 'tshirt', ac: 1, safe: 4, wt: 5, price: 400, tier: 2 },
    cloak:         { name: '斗篷',     cat: 'armor', slot: 'cloak', ac: 1, safe: 4, wt: 10, price: 100, tier: 1 },
    protectCloak:  { name: '保護者斗篷', cat: 'armor', slot: 'cloak', ac: 2, mr: 5, safe: 4, wt: 15, sell: 5000 },
    mrCloak:       { name: '抗魔斗篷', cat: 'armor', slot: 'cloak', ac: 1, mr: 15, safe: 4, wt: 15, sell: 6000 },
    leatherGloves: { name: '皮手套',   cat: 'armor', slot: 'gloves', ac: 1, safe: 4, wt: 10, price: 80, tier: 1 },
    powerGloves:   { name: '力量手套', cat: 'armor', slot: 'gloves', ac: 1, str: 1, safe: 4, wt: 15, sell: 8000 },
    leatherBoots:  { name: '皮靴',     cat: 'armor', slot: 'boots', ac: 1, safe: 4, wt: 15, price: 80, tier: 1 },
    ironBoots:     { name: '鋼靴',     cat: 'armor', slot: 'boots', ac: 2, safe: 4, wt: 60, price: 700, tier: 2 },
    hasteBoots:    { name: '速度之靴', cat: 'armor', slot: 'boots', ac: 1, haste: true, safe: 4, wt: 20, sell: 15000, desc: '穿上就有加速效果' },
    // ── 英雄防具：七個部位各兩件（其餘三件在 resonance.js）──
    duskWarHelm:   { name: '暮鋼戰盔', cat: 'armor', slot: 'helm', ac: 4, mr: 10, hp: 50, safe: 4, wt: 60, sell: 36000, desc: '暮鋼鑄成的重盔，兼顧防禦、魔防與生命。' },
    abyssGuardMail: { name: '深淵守衛戰甲', cat: 'armor', slot: 'armor', ac: 9, mr: 8, hp: 90, reduce: 1, safe: 4, wt: 200, sell: 48000, desc: '深淵守衛的厚重戰甲，適合承受近身攻擊。' },
    moonveilCloak: { name: '月影秘法披風', cat: 'armor', slot: 'cloak', ac: 2, mr: 12, sp: 2, mpRegen: 2, safe: 4, wt: 12, sell: 36000, desc: '銀月符線編織的披風，強化法術與魔力回復。' },
    dawnBastionShield: { name: '黎明壁壘之盾', cat: 'armor', slot: 'shield', ac: 5, mr: 12, hp: 70, safe: 4, wt: 90, sell: 42000, desc: '以黎明紋章守護持盾者，提升生命與魔防。' },
    frostMirrorShield: { name: '霜鏡法盾', cat: 'armor', slot: 'shield', ac: 4, mr: 18, sp: 2, safe: 4, wt: 65, sell: 45000, desc: '寒霜晶面封存魔力，適合持杖與單手施法者。' },
    runeSilkTunic: { name: '符文絲織內衣', cat: 'armor', slot: 'tshirt', ac: 2, mr: 8, sp: 1, mp: 40, safe: 4, wt: 12, sell: 30000, desc: '穿於盔甲內的輕薄符文絲衣，增加魔力與法術強度。' },
    titanWeaveTunic: { name: '泰坦紋戰衣', cat: 'armor', slot: 'tshirt', ac: 3, con: 1, hp: 70, safe: 4, wt: 20, sell: 36000, desc: '以泰坦紋路補強的貼身戰衣，提升體質與生命。' },
    bloodOathGauntlets: { name: '血誓護手', cat: 'armor', slot: 'gloves', ac: 3, str: 1, dmg: 1, hp: 30, safe: 4, wt: 30, sell: 36000, desc: '血紅誓紋刻入鋼鐵護手，強化力量與武器傷害。' },
    astralWeaveGloves: { name: '星紋秘法手套', cat: 'armor', slot: 'gloves', ac: 2, int: 1, sp: 2, mpRegen: 1, safe: 4, wt: 15, sell: 39000, desc: '星紋絲線引導魔力，增加智力、法術強度與回魔。' },
    galeStalkerBoots: { name: '疾風獵行靴', cat: 'armor', slot: 'boots', ac: 3, dex: 1, hit: 1, dodge: 0.03, safe: 4, wt: 20, sell: 36000, desc: '輕盈的獵行長靴，兼顧敏捷、命中與閃避。' },
    stoneWardBoots: { name: '磐岩守護戰靴', cat: 'armor', slot: 'boots', ac: 4, mr: 8, hp: 60, reduce: 1, safe: 4, wt: 45, sell: 42000, desc: '磐岩護片穩固步伐，提升生命、防禦與減傷。' },
    // 傳說裝備：十二職業代表武器與兩套七部位防具，新增品由鍛造取得。
    eclipseDual: { name: '蝕月雙刃', cat: 'weapon', type: 'dual', dmg: [25, 24], hit: 6, crit: 0.06, safe: 6, wt: 45, sell: 100000, desc: '黑暗妖精的傳說代表武器，月蝕雙刃兼顧命中與爆擊。' },
    rakshasaClaw: { name: '羅剎滅魂爪', cat: 'weapon', type: 'claw', dmg: [27, 26], hit: 5, str: 2, safe: 6, wt: 40, sell: 100000, desc: '修羅的傳說代表武器，羅剎之爪以力量撕裂敵人。' },
    starfallGun: { name: '星隕魔導槍', cat: 'weapon', type: 'gun', dmg: [28, 30], hit: 9, dex: 2, safe: 6, wt: 95, sell: 100000, desc: '槍手的傳說代表武器，以星隕晶核校準彈道，使用子彈。' },
    thunderRuneSword: { name: '雷霆符文劍', cat: 'weapon', type: 'sword', dmg: [25, 27], hit: 5, sp: 5, safe: 6, wt: 70, sell: 100000, desc: '魔鬥士的傳說代表武器，雷紋劍刃同時增強近戰與法術。' },
    dawnJudgmentHammer: { name: '黎明裁決之錘', cat: 'weapon', type: 'blunt', dmg: [26, 29], hit: 5, wis: 2, silver: true, safe: 6, wt: 100, sell: 100000, desc: '聖騎士的傳說代表武器，銀製黎明戰錘強化精神，適合持盾作戰。' },
    seraphSpear: { name: '熾天使之矛', cat: 'weapon', type: 'spear', dmg: [25, 30], hit: 6, sp: 5, safe: 6, wt: 65, sell: 100000, desc: '天使的傳說代表武器，羽翼矛鋒引導神聖魔力；雙手持用。' },
    infernalSoulScythe: { name: '煉獄噬魂鐮', cat: 'weapon', type: 'scythe', dmg: [30, 33], hit: 5, lifesteal: 0.04, safe: 6, wt: 85, sell: 100000, desc: '惡魔的傳說代表武器，煉獄鐮刃提供 4% 吸血；雙手持用。' },
    dragonWardHelm: { name: '龍裔戰盔', cat: 'armor', slot: 'helm', ac: 5, mr: 15, hp: 80, safe: 4, wt: 65, sell: 90000, desc: '龍裔守護系列・頭盔。龍鱗重盔兼顧防禦、魔防與生命。' },
    dragonWingCloak: { name: '龍翼守護披風', cat: 'armor', slot: 'cloak', ac: 4, mr: 18, hp: 60, safe: 4, wt: 30, sell: 85000, desc: '龍裔守護系列・斗篷。龍翼披風提高防禦、魔防與生命。' },
    dragonHeartTunic: { name: '龍紋護心衣', cat: 'armor', slot: 'tshirt', ac: 4, con: 2, hp: 100, safe: 4, wt: 25, sell: 80000, desc: '龍裔守護系列・內衣。穿在盔甲內的龍紋護衣，增加體質與生命。' },
    dragonFangGloves: { name: '龍牙護手', cat: 'armor', slot: 'gloves', ac: 4, str: 2, dmg: 2, safe: 4, wt: 40, sell: 85000, desc: '龍裔守護系列・手套。龍牙鋼片護手強化力量與近戰傷害。' },
    dragonWardBoots: { name: '龍裔重靴', cat: 'armor', slot: 'boots', ac: 5, mr: 12, hp: 80, reduce: 1, safe: 4, wt: 65, sell: 90000, desc: '龍裔守護系列・長靴。龍鱗護片穩固步伐，提升生命與減傷。' },
    starwindCrown: { name: '星風法冠', cat: 'armor', slot: 'helm', ac: 3, mr: 20, sp: 3, mp: 60, safe: 4, wt: 15, sell: 90000, desc: '星風秘法系列・頭盔。星辰法冠增加魔防、法術與魔力。' },
    starwindRobe: { name: '星風法袍', cat: 'armor', slot: 'armor', ac: 7, mr: 22, sp: 4, mp: 80, safe: 4, wt: 40, sell: 100000, desc: '星風秘法系列・盔甲。輕盈星紋法袍兼顧防禦、魔防與施法。' },
    starwindCloak: { name: '星風披風', cat: 'armor', slot: 'cloak', ac: 3, mr: 20, mpRegen: 3, safe: 4, wt: 12, sell: 85000, desc: '星風秘法系列・斗篷。星風絲線提升魔防與魔力回復。' },
    starwindShield: { name: '星風法盾', cat: 'armor', slot: 'shield', ac: 6, mr: 22, sp: 3, safe: 4, wt: 50, sell: 95000, desc: '星風秘法系列・盾牌。星晶法盾提高魔防與法術；須搭配單手武器。' },
    starwindTunic: { name: '星風符文內衣', cat: 'armor', slot: 'tshirt', ac: 3, int: 2, mp: 80, safe: 4, wt: 10, sell: 80000, desc: '星風秘法系列・內衣。貼身星紋絲衣提高智力與魔力。' },
    starwindGloves: { name: '星風手套', cat: 'armor', slot: 'gloves', ac: 3, int: 2, sp: 3, mpRegen: 2, safe: 4, wt: 12, sell: 85000, desc: '星風秘法系列・手套。星紋絲手套引導法術並加快回魔。' },
    // 飾品不可強化
    mrAmulet:      { name: '抗魔項鍊', cat: 'armor', slot: 'amulet', mr: 10, safe: -1, wt: 5, sell: 5000 },
    strAmulet:     { name: '力量項鍊', cat: 'armor', slot: 'amulet', str: 1, safe: -1, wt: 5, sell: 8000 },
    strRing:       { name: '力量戒指', cat: 'armor', slot: 'ring', str: 1, safe: -1, wt: 2, sell: 8000 },
    dexRing:       { name: '敏捷戒指', cat: 'armor', slot: 'ring', dex: 1, safe: -1, wt: 2, sell: 8000 },
    conRing:       { name: '體質戒指', cat: 'armor', slot: 'ring', con: 1, hp: 20, safe: -1, wt: 2, sell: 8000 },
    intRing:       { name: '智力戒指', cat: 'armor', slot: 'ring', int: 1, safe: -1, wt: 2, sell: 8000 },
    protectRing:   { name: '守護戒指', cat: 'armor', slot: 'ring', ac: 1, safe: -1, wt: 2, price: 3000, tier: 3 },
    belt:          { name: '皮帶',     cat: 'armor', slot: 'belt', hp: 15, weight: 300, safe: -1, wt: 10, price: 300, tier: 2 },
    titanBelt:     { name: '泰坦腰帶', cat: 'armor', slot: 'belt', str: 1, con: 1, hp: 30, weight: 800, safe: -1, wt: 15, sell: 15000 },

    // ── 藥水 ──
    redPotion:     { name: '治癒藥水',     short: '紅水', cat: 'potion', heal: [15, 20], wt: 2, price: 20, tier: 1 },
    orangePotion:  { name: '強力治癒藥水', short: '橙水', cat: 'potion', heal: [45, 55], wt: 2, price: 70, tier: 2 },
    whitePotion:   { name: '終極治癒藥水', short: '白水', cat: 'potion', heal: [75, 90], wt: 2, price: 160, tier: 3 },
    ancientPotion: { name: '古代終極治癒藥水', short: '古白', cat: 'potion', heal: [140, 170], wt: 3, price: 400, tier: 4 },
    greenPotion:   { name: '自我加速藥水', short: '綠水', cat: 'potion', buff: 'haste', sec: 300, wt: 2, price: 150, tier: 1 },
    bravePotion:   { name: '勇敢藥水', cat: 'potion', buff: 'brave', sec: 300, classes: ['royal', 'knight', 'darkelf', 'shura', 'warrior', 'paladin', 'demon'], wt: 2, price: 500, tier: 2 },
    elvenWafer:    { name: '精靈餅乾', cat: 'potion', buff: 'brave', sec: 300, classes: ['elf', 'gunner'], wt: 2, price: 500, tier: 2 },
    wisdomPotion:  { name: '慎重藥水', cat: 'potion', buff: 'wisdom', sec: 300, classes: ['mage', 'magicfighter', 'angel'], wt: 2, price: 500, tier: 2 },
    bluePotion:    { name: '藍色藥水', cat: 'potion', buff: 'blue', sec: 600, wt: 2, price: 300, tier: 2 },

    // ── 卷軸 ──
    homeScroll:    { name: '回家卷軸',     cat: 'scroll', scroll: 'home', wt: 1, price: 40, tier: 1, desc: '立即回到該地區的村莊' },
    teleScroll:    { name: '瞬間移動卷軸', cat: 'scroll', scroll: 'tele', wt: 1, price: 60, tier: 1, desc: '脫離目前的戰鬥（可在設定中自動使用）' },
    reviveScroll:  { name: '復活卷軸',     cat: 'scroll', scroll: 'revive', wt: 1, price: 3000, tier: 3, desc: '死亡時自動使用，不損失經驗' },
    // 2026-10-18 起商店不賣（只有怪物掉落），回收價維持原本的 30%
    weaponScroll:  { name: '對武器施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'weapon', bless: 0, wt: 1, sell: 2400, desc: '武器 +1，超過安定值可能蒸發' },
    armorScroll:   { name: '對盔甲施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'armor', bless: 0, wt: 1, sell: 1200, desc: '防具 +1，超過安定值可能蒸發' },
    bWeaponScroll: { name: '祝福的對武器施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'weapon', bless: 1, wt: 1, sell: 5000, desc: '安定值以下 +1～3' },
    bArmorScroll:  { name: '祝福的對盔甲施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'armor', bless: 1, wt: 1, sell: 2500, desc: '安定值以下 +1～3' },
    cWeaponScroll: { name: '詛咒的對武器施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'weapon', bless: -1, wt: 1, sell: 100, desc: '武器 -1' },
    cArmorScroll:  { name: '詛咒的對盔甲施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'armor', bless: -1, wt: 1, sell: 50, desc: '防具 -1' },

    // ── 彈藥 ──
    // 彈藥重量 2026-10-16 降為 1/5（箭 0.1→0.02、子彈 0.15→0.03），妖精／槍手帶大量彈藥不再超重
    arrow:         { name: '箭',     cat: 'ammo', ammo: 'arrow', dmg: 1, wt: 0.02, price: 1, tier: 1 },
    silverArrow:   { name: '銀箭',   cat: 'ammo', ammo: 'arrow', dmg: 2, silver: true, wt: 0.02, price: 4, tier: 2 },
    bullet:        { name: '子彈',   cat: 'ammo', ammo: 'bullet', dmg: 2, wt: 0.03, price: 2, tier: 1 },
    silverBullet:  { name: '銀子彈', cat: 'ammo', ammo: 'bullet', dmg: 3, silver: true, wt: 0.03, price: 5, tier: 2 },

    // ── 萬能藥、材料 ──
    elixir:        { name: '萬能藥', cat: 'elixir', wt: 1, sell: 10000, desc: `永久提升一項能力值 +1（最多 ${ELIXIR_MAX} 瓶）` },
    baphometHorn:  { name: '巴風特之角',     cat: 'material', wt: 5, sell: 3000 },
    demonHeart:    { name: '惡魔之心',       cat: 'material', wt: 5, sell: 5000 },
    osirisSeal:    { name: '歐西里斯的封印', cat: 'material', wt: 5, sell: 6000 },
    towerSoul:     { name: '永夜之魂',       cat: 'material', wt: 1, sell: 2000 },
    towerBullHorn: { name: '巨大牛人之角', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 10F・巨大牛人的專屬材料' },
    towerBansheeTear: { name: '黑暗女妖之淚', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 20F・黑暗女妖的專屬材料' },
    towerFlameCore: { name: '炎魔之影核心', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 30F・炎魔之影的專屬材料' },
    towerIceCrown: { name: '冰之女王冠冕碎片', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 40F・冰之女王的專屬材料' },
    towerLichCrystal: { name: '巫妖王命匣碎片', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 50F・巫妖王的專屬材料' },
    towerFallenFeather: { name: '墮落大天使之羽', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 60F・墮落的大天使的專屬材料' },
    towerChaosCore: { name: '混沌之主核心', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 70F・混沌之主的專屬材料' },
    towerAbyssEye: { name: '深淵領主之眼', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 80F・深淵領主的專屬材料' },
    towerDeathShard: { name: '死神鐮刃碎片', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 90F・死神的專屬材料' },
    towerKingSeal: { name: '冥法軍王之印', cat: 'material', wt: 1, sell: 2000, desc: '永夜之塔 100F・冥法軍王的專屬材料' },
    treantHeart:   { name: '古樹之心',       cat: 'material', wt: 5, sell: 1500 },
    drakeFang:     { name: '地龍之牙',       cat: 'material', wt: 5, sell: 2500 },
    pirateTreasure: { name: '海賊的寶箱',    cat: 'material', wt: 5, sell: 4000 },
    wyvernWing:    { name: '飛龍之翼',       cat: 'material', wt: 5, sell: 5000 },
    frostCrystal:  { name: '寒冰結晶',       cat: 'material', wt: 5, sell: 6500 },
    ifritFlame:    { name: '伊弗利特之焰',   cat: 'material', wt: 5, sell: 8000 },
    forgottenRelic: { name: '遺忘的聖物',    cat: 'material', wt: 5, sell: 10000 },
    giantSoul:     { name: '巨人之魂',       cat: 'material', wt: 5, sell: 15000 },
    antharasScale: { name: '地龍之鱗',       cat: 'material', wt: 10, sell: 20000 },
    fafurionScale: { name: '水龍之鱗',       cat: 'material', wt: 10, sell: 30000 },
    lindviorScale: { name: '風龍之鱗',       cat: 'material', wt: 10, sell: 40000 },
    valakasScale:  { name: '火龍之鱗',       cat: 'material', wt: 10, sell: 50000 },
};

const CAT_NAMES = { weapon: '武器', armor: '防具', potion: '藥水', scroll: '卷軸', ammo: '彈藥', elixir: '萬能藥', material: '材料', quest: '任務道具', currency: '通貨', book: '魔法書' };

// 鍛造配方：need 的道具要在背包中（未裝備），gold 為手續費
const RECIPES = [
    // 傳說新增裝備：沿用四龍鱗與既有材料，不新增掉落事件。
    { out: 'eclipseDual', gold: 80000, need: { darkDual: 1, lindviorScale: 5, demonHeart: 4 } },
    { out: 'rakshasaClaw', gold: 80000, need: { darkClaw: 1, valakasScale: 5, ifritFlame: 4 } },
    { out: 'starfallGun', gold: 80000, need: { magicSniper: 1, lindviorScale: 5, wyvernWing: 4 } },
    { out: 'thunderRuneSword', gold: 80000, need: { tsurugi: 1, fafurionScale: 5, frostCrystal: 4 } },
    { out: 'dawnJudgmentHammer', gold: 80000, need: { holyMace: 1, antharasScale: 5, forgottenRelic: 3 } },
    { out: 'seraphSpear', gold: 80000, need: { trident: 1, fafurionScale: 5, forgottenRelic: 3 } },
    { out: 'infernalSoulScythe', gold: 80000, need: { abyssScythe: 1, valakasScale: 5, demonHeart: 4 } },
    { out: 'dragonWardHelm', gold: 60000, need: { knightHelm: 1, antharasScale: 4, giantSoul: 2 } },
    { out: 'dragonWingCloak', gold: 60000, need: { protectCloak: 1, valakasScale: 4, wyvernWing: 3 } },
    { out: 'dragonHeartTunic', gold: 60000, need: { tshirt: 1, antharasScale: 4, giantSoul: 2 } },
    { out: 'dragonFangGloves', gold: 60000, need: { powerGloves: 1, valakasScale: 4, ifritFlame: 3 } },
    { out: 'dragonWardBoots', gold: 60000, need: { ironBoots: 1, antharasScale: 4, giantSoul: 2 } },
    { out: 'starwindCrown', gold: 60000, need: { magicHelm: 1, fafurionScale: 4, frostCrystal: 3 } },
    { out: 'starwindRobe', gold: 60000, need: { mageRobe: 1, fafurionScale: 4, forgottenRelic: 2 } },
    { out: 'starwindCloak', gold: 60000, need: { mrCloak: 1, lindviorScale: 4, wyvernWing: 3 } },
    { out: 'starwindShield', gold: 60000, need: { knightShield: 1, fafurionScale: 4, frostCrystal: 3 } },
    { out: 'starwindTunic', gold: 60000, need: { tshirt: 1, fafurionScale: 4, frostCrystal: 3 } },
    { out: 'starwindGloves', gold: 60000, need: { leatherGloves: 1, lindviorScale: 4, forgottenRelic: 2 } },
    { out: 'tsurugi',         gold: 20000, need: { katana: 1, baphometHorn: 5, demonHeart: 3 } },
    { out: 'magicHelm',       gold: 5000,  need: { ironHelm: 1, osirisSeal: 2 } },
    { out: 'dragonSlayer',    gold: 50000, need: { katana: 1, antharasScale: 1, fafurionScale: 1, lindviorScale: 1, valakasScale: 1 } },
    { out: 'dragonScaleMail', gold: 30000, need: { plateMail: 1, antharasScale: 2, fafurionScale: 2, lindviorScale: 2, valakasScale: 2 } },
];

function isStackable(def) { return ['potion', 'scroll', 'ammo', 'material', 'elixir', 'quest', 'currency', 'book'].includes(def.cat); }
function sellPriceOf(id) { const d = ITEMS[id]; return d.sell != null ? d.sell : Math.floor((d.price || 0) * 0.3); }
