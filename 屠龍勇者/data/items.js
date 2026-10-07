// 屠龍勇者：道具、裝備、彈藥、材料、鍛造配方（依賴 config.js）

// 武器種類：spd 攻擊間隔（毫秒）、two 雙手（不能拿盾）、ranged 遠程（吃敏捷、耗彈藥）、double 雙擊率
const WEAPON_TYPES = {
    fist:    { name: '空手',   spd: 1000 },
    dagger:  { name: '匕首',   spd: 700 },
    sword:   { name: '單手劍', spd: 900 },
    twohand: { name: '雙手劍', spd: 1150, two: true },
    axe:     { name: '斧',     spd: 1000 },
    spear:   { name: '矛',     spd: 1050, two: true },
    blunt:   { name: '鈍器',   spd: 950 },
    bow:     { name: '弓',     spd: 950,  two: true, ranged: true, ammo: 'arrow' },
    gun:     { name: '槍',     spd: 1100, two: true, ranged: true, ammo: 'bullet' },
    staff:   { name: '魔杖',   spd: 1000 },
    claw:    { name: '鋼爪',   spd: 750,  two: true },
    dual:    { name: '雙刀',   spd: 800,  two: true, double: 0.25 },
    scythe:  { name: '鐮刀',   spd: 1050, two: true },
};

const SLOTS = {
    weapon: '武器', shield: '盾牌', helm: '頭盔', armor: '盔甲', tshirt: '內衣', cloak: '斗篷',
    gloves: '手套', boots: '長靴', amulet: '項鍊', ring1: '戒指', ring2: '戒指', belt: '腰帶',
};
const SLOT_KEYS = Object.keys(SLOTS);

// 藥水增益效果（player.buffs 的 key 就是這裡的 key）
const BUFF_DEFS = {
    haste:  { name: '加速', fx: { haste: true } },
    brave:  { name: '勇敢', fx: { brave: true } },
    wisdom: { name: '慎重', fx: { sp: 2, mpRegen: 2 } },
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
    dragonScaleMail: { name: '龍鱗鎧', cat: 'armor', slot: 'armor', ac: 10, mr: 20, reduce: 3, safe: 6, wt: 200, sell: 100000, desc: '以四大龍的鱗片打造，減傷 3' },
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
    // 飾品不可強化
    mrAmulet:      { name: '抗魔項鍊', cat: 'armor', slot: 'amulet', mr: 10, safe: -1, wt: 5, sell: 5000 },
    strAmulet:     { name: '力量項鍊', cat: 'armor', slot: 'amulet', str: 1, safe: -1, wt: 5, sell: 8000 },
    strRing:       { name: '力量戒指', cat: 'armor', slot: 'ring', str: 1, safe: -1, wt: 2, sell: 8000 },
    dexRing:       { name: '敏捷戒指', cat: 'armor', slot: 'ring', dex: 1, safe: -1, wt: 2, sell: 8000 },
    conRing:       { name: '體質戒指', cat: 'armor', slot: 'ring', con: 1, hp: 20, safe: -1, wt: 2, sell: 8000 },
    intRing:       { name: '智力戒指', cat: 'armor', slot: 'ring', int: 1, safe: -1, wt: 2, sell: 8000 },
    protectRing:   { name: '守護戒指', cat: 'armor', slot: 'ring', ac: 1, safe: -1, wt: 2, price: 3000, tier: 3 },
    belt:          { name: '皮帶',     cat: 'armor', slot: 'belt', hp: 15, safe: -1, wt: 10, price: 300, tier: 2 },
    titanBelt:     { name: '泰坦腰帶', cat: 'armor', slot: 'belt', str: 1, con: 1, hp: 30, safe: -1, wt: 15, sell: 15000 },

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
    weaponScroll:  { name: '對武器施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'weapon', bless: 0, wt: 1, price: 8000, tier: 3, desc: '武器 +1，超過安定值可能蒸發' },
    armorScroll:   { name: '對盔甲施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'armor', bless: 0, wt: 1, price: 4000, tier: 3, desc: '防具 +1，超過安定值可能蒸發' },
    bWeaponScroll: { name: '祝福的對武器施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'weapon', bless: 1, wt: 1, sell: 5000, desc: '安定值以下 +1～3' },
    bArmorScroll:  { name: '祝福的對盔甲施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'armor', bless: 1, wt: 1, sell: 2500, desc: '安定值以下 +1～3' },
    cWeaponScroll: { name: '詛咒的對武器施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'weapon', bless: -1, wt: 1, sell: 100, desc: '武器 -1' },
    cArmorScroll:  { name: '詛咒的對盔甲施法的卷軸', cat: 'scroll', scroll: 'enchant', target: 'armor', bless: -1, wt: 1, sell: 50, desc: '防具 -1' },

    // ── 彈藥 ──
    arrow:         { name: '箭',     cat: 'ammo', ammo: 'arrow', dmg: 1, wt: 0.1, price: 1, tier: 1 },
    silverArrow:   { name: '銀箭',   cat: 'ammo', ammo: 'arrow', dmg: 2, silver: true, wt: 0.1, price: 4, tier: 2 },
    bullet:        { name: '子彈',   cat: 'ammo', ammo: 'bullet', dmg: 2, wt: 0.15, price: 2, tier: 1 },
    silverBullet:  { name: '銀子彈', cat: 'ammo', ammo: 'bullet', dmg: 3, silver: true, wt: 0.15, price: 5, tier: 2 },

    // ── 萬能藥、材料 ──
    elixir:        { name: '萬能藥', cat: 'elixir', wt: 1, sell: 10000, desc: `永久提升一項能力值 +1（最多 ${ELIXIR_MAX} 瓶）` },
    baphometHorn:  { name: '巴風特之角',     cat: 'material', wt: 5, sell: 3000 },
    demonHeart:    { name: '惡魔之心',       cat: 'material', wt: 5, sell: 5000 },
    osirisSeal:    { name: '歐西里斯的封印', cat: 'material', wt: 5, sell: 6000 },
    towerSoul:     { name: '魔塔之魂',       cat: 'material', wt: 1, sell: 2000 },
    antharasScale: { name: '地龍之鱗',       cat: 'material', wt: 10, sell: 20000 },
    fafurionScale: { name: '水龍之鱗',       cat: 'material', wt: 10, sell: 30000 },
    lindviorScale: { name: '風龍之鱗',       cat: 'material', wt: 10, sell: 40000 },
    valakasScale:  { name: '火龍之鱗',       cat: 'material', wt: 10, sell: 50000 },
};

const CAT_NAMES = { weapon: '武器', armor: '防具', potion: '藥水', scroll: '卷軸', ammo: '彈藥', elixir: '萬能藥', material: '材料', quest: '任務道具' };

// 鍛造配方：need 的道具要在背包中（未裝備），gold 為手續費
const RECIPES = [
    { out: 'tsurugi',         gold: 20000, need: { katana: 1, baphometHorn: 5, demonHeart: 3 } },
    { out: 'magicHelm',       gold: 5000,  need: { ironHelm: 1, osirisSeal: 2 } },
    { out: 'dragonSlayer',    gold: 50000, need: { katana: 1, antharasScale: 1, fafurionScale: 1, lindviorScale: 1, valakasScale: 1 } },
    { out: 'dragonScaleMail', gold: 30000, need: { plateMail: 1, antharasScale: 2, fafurionScale: 2, lindviorScale: 2, valakasScale: 2 } },
];

function isStackable(def) { return ['potion', 'scroll', 'ammo', 'material', 'elixir', 'quest'].includes(def.cat); }
function sellPriceOf(id) { const d = ITEMS[id]; return d.sell != null ? d.sell : Math.floor((d.price || 0) * 0.3); }
