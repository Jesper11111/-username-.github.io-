// 屠龍勇者：村莊與狩獵地圖（依賴 monsters.js）

// tier：商店能賣到第幾級的商品
const TOWNS = {
    talking: { name: '低語港', icon: '🏡', tier: 1 },
    gludio:  { name: '灰燼村',     icon: '🏘️', tier: 2 },
    giran:   { name: '暗金城',       icon: '🏰', tier: 3 },
    aden:    { name: '永夜王都',       icon: '🏯', tier: 4 },
};
const TOWN_TRAVEL_FEE = 200; // 村莊間傳送：每差一級 200 金幣

// type：field 野外／dungeon 地監／tower 永夜之塔／dragon 龍穴
// 畫面（ui-scene.js）：野外一律用遺跡背景圖，tint 疊一層顏色區分地區；地監用 scene 指定格子主題（沒寫就是 dungeon）
// town：回家卷軸、死亡時回到的村莊；fee：從村莊傳送過去的費用
// rare：稀有首領出現機率；drops：地圖專屬掉落
const ZONES = [
    {
        id: 'island', name: '低語海岸', icon: '🏝️', type: 'field', lv: [1, 10], town: 'talking', fee: 0,
        mons: ['goblin', 'dwarf', 'wolf', 'orc', 'floatingEye', 'skeleton'],
        drops: [{ id: 'dagger', p: 0.01 }, { id: 'shortSword', p: 0.008 }, { id: 'leatherCap', p: 0.01 }, { id: 'leatherArmor', p: 0.008 },
            { id: 'woodShield', p: 0.008 }, { id: 'leatherBoots', p: 0.008 }, { id: 'shortBow', p: 0.005 }, { id: 'arrow', p: 0.1, n: [5, 15] }],
        desc: '新手冒險者的起點。',
    },
    {
        id: 'islandDungeon', name: '低語墓窟', icon: '🕳️', type: 'dungeon', lv: [8, 18], town: 'talking', fee: 50,
        mons: ['dwarfWarrior', 'orcArcher', 'skeletonArcher', 'ghoul'],
        drops: [{ id: 'longSword', p: 0.004 }, { id: 'mace', p: 0.004 }, { id: 'handAxe', p: 0.004 }, { id: 'ironHelm', p: 0.003 },
            { id: 'scaleMail', p: 0.002 }, { id: 'cloak', p: 0.004 }, { id: 'matchlock', p: 0.003 }, { id: 'oakWand', p: 0.003 },
            { id: 'claw', p: 0.002 }, { id: 'dualBlade', p: 0.002 }, { id: 'silverArrow', p: 0.05, n: [5, 15] }],
        desc: '陰暗潮濕的地下城，不死系開始出沒。',
    },
    {
        id: 'elvenForest', name: '迷霧古林', icon: '🌲', type: 'field', lv: [10, 20], town: 'gludio', fee: 100,
        mons: ['werewolf', 'forestBear', 'giantSpider', 'treant'], rare: { id: 'elderTreant', p: 0.006 },
        drops: [{ id: 'elvenMail', p: 0.001 }, { id: 'cloak', p: 0.004 }, { id: 'leatherGloves', p: 0.005 }, { id: 'longBow', p: 0.002 },
            { id: 'crystalWand', p: 0.001 }, { id: 'belt', p: 0.002 }, { id: 'silverArrow', p: 0.05, n: [5, 15] }],
        desc: '世界樹守護的古老森林，遺跡間有樹精徘徊。',
    },
    {
        id: 'gludio1', name: '腐朽礦坑・上層', icon: '⛏️', type: 'dungeon', lv: [15, 25], town: 'gludio', fee: 150,
        mons: ['gandiOrc', 'zombie', 'lycan', 'stoneGolem'],
        drops: [{ id: 'silverSword', p: 0.002 }, { id: 'spear', p: 0.003 }, { id: 'chainMail', p: 0.002 }, { id: 'ironShield', p: 0.003 },
            { id: 'leatherGloves', p: 0.005 }, { id: 'ironBoots', p: 0.002 }, { id: 'crystalWand', p: 0.001 }, { id: 'silverDagger', p: 0.002 }],
        desc: '中級冒險者的修練場。',
    },
    {
        id: 'sleepingCave', name: '沉眠龍窟', icon: '🦇', type: 'dungeon', scene: 'cave', lv: [18, 28], town: 'gludio', fee: 200,
        mons: ['lizardman', 'caveBat', 'darkElfScout', 'drake'], rare: { id: 'wakingDrake', p: 0.006 },
        drops: [{ id: 'silverSword', p: 0.002 }, { id: 'ironHelm', p: 0.003 }, { id: 'chainMail', p: 0.002 }, { id: 'ironShield', p: 0.003 },
            { id: 'claw', p: 0.002 }, { id: 'dualBlade', p: 0.002 }, { id: 'spear', p: 0.003 }, { id: 'silverBullet', p: 0.05, n: [5, 15] }],
        desc: '傳說地龍在最深處沉睡，吵醒牠可就麻煩了。',
    },
    {
        id: 'pirateIsle', name: '沉船海灣', icon: '🏴‍☠️', type: 'field', tint: 'rgba(40,110,160,0.18)', lv: [26, 38], town: 'giran', fee: 400,
        mons: ['pirate', 'pirateGunner', 'giantCrab', 'drownedSailor'], rare: { id: 'pirateKing', p: 0.007 },
        drops: [{ id: 'rifle', p: 0.002 }, { id: 'trident', p: 0.001 }, { id: 'tshirt', p: 0.002 }, { id: 'battleAxe', p: 0.002 },
            { id: 'dexRing', p: 0.0004 }, { id: 'silverBullet', p: 0.05, n: [5, 15] }],
        desc: '海賊盤踞的廢墟要塞，據說藏著海賊王的寶藏。',
    },
    {
        id: 'gludio2', name: '腐朽礦坑・深層', icon: '🔥', type: 'dungeon', lv: [24, 36], town: 'gludio', fee: 300,
        mons: ['skeletonAxe', 'blackKnight', 'giantAnt', 'ghast'], rare: { id: 'baphomet', p: 0.01 },
        drops: [{ id: 'katana', p: 0.0008 }, { id: 'twoHandSword', p: 0.002 }, { id: 'battleAxe', p: 0.002 }, { id: 'warHammer', p: 0.002 },
            { id: 'plateMail', p: 0.001 }, { id: 'mageRobe', p: 0.001 }, { id: 'longBow', p: 0.002 }, { id: 'rifle', p: 0.002 },
            { id: 'tshirt', p: 0.002 }, { id: 'strRing', p: 0.0005 }],
        desc: '最深處盤踞著巴風特。',
    },
    {
        id: 'ivory', name: '暮光法師塔', icon: '🗼', type: 'dungeon', scene: 'ivory', lv: [34, 46], town: 'giran', fee: 500,
        mons: ['hellhound', 'lamia', 'ivoryMage', 'ivoryGuard'], rare: { id: 'demon', p: 0.008 },
        drops: [{ id: 'manaWand', p: 0.001 }, { id: 'elvenMail', p: 0.001 }, { id: 'mrCloak', p: 0.001 }, { id: 'powerGloves', p: 0.0008 },
            { id: 'mrAmulet', p: 0.0008 }, { id: 'dexRing', p: 0.0005 }, { id: 'intRing', p: 0.0005 }, { id: 'darkDagger', p: 0.001 }],
        desc: '魔法師們的高塔，被惡魔佔據。',
    },
    {
        id: 'dragonValley', name: '焦骨峽谷', icon: '🐉', type: 'field', tint: 'rgba(150,60,20,0.22)', lv: [36, 48], town: 'giran', fee: 600,
        mons: ['dvLizard', 'cerberus', 'wyvernling', 'boneDragonKnight'], rare: { id: 'wyvern', p: 0.007 },
        drops: [{ id: 'knightHelm', p: 0.0006 }, { id: 'plateMail', p: 0.001 }, { id: 'warHammer', p: 0.002 }, { id: 'magicHelm', p: 0.0006 },
            { id: 'protectRing', p: 0.001 }, { id: 'strAmulet', p: 0.0004 }, { id: 'boneScythe', p: 0.001 }],
        desc: '飛龍盤旋的焦土山谷，龍騎士的遺骸仍在守望。',
    },
    {
        id: 'pyramid', name: '黃沙王陵', icon: '🔺', type: 'dungeon', scene: 'pyramid', lv: [44, 56], town: 'giran', fee: 700,
        mons: ['mummy', 'sandScorpion', 'sphinx', 'anubis'], rare: { id: 'osiris', p: 0.008 },
        drops: [{ id: 'trident', p: 0.002 }, { id: 'darkClaw', p: 0.0008 }, { id: 'darkDual', p: 0.0008 }, { id: 'elvenBow', p: 0.0008 },
            { id: 'protectCloak', p: 0.001 }, { id: 'conRing', p: 0.0005 }, { id: 'titanBelt', p: 0.0005 }, { id: 'hasteBoots', p: 0.0005 }],
        desc: '沙漠中的古代陵墓，冥王歐西里斯沉睡於此。',
    },
    {
        id: 'orenSnow', name: '永凍荒原', icon: '❄️', type: 'field', tint: 'rgba(225,238,255,0.38)', lv: [46, 58], town: 'aden', fee: 900,
        mons: ['snowWolf', 'yeti', 'iceGolem', 'frostWitch'], rare: { id: 'iceGiantKing', p: 0.007 },
        drops: [{ id: 'mrCloak', p: 0.001 }, { id: 'mrAmulet', p: 0.0008 }, { id: 'conRing', p: 0.0005 }, { id: 'intRing', p: 0.0005 },
            { id: 'knightShield', p: 0.0006 }, { id: 'boneScythe', p: 0.002 }],
        desc: '終年冰封的北方雪原，遺跡被白雪掩埋。',
    },
    {
        id: 'fireCave', name: '熔火煉獄', icon: '🌋', type: 'dungeon', scene: 'dragon', lv: [54, 66], town: 'aden', fee: 1500,
        mons: ['salamander', 'fireSpirit', 'lavaGolem', 'flameKnight'], rare: { id: 'ifrit', p: 0.007 },
        drops: [{ id: 'demonAxe', p: 0.0004 }, { id: 'darkClaw', p: 0.0006 }, { id: 'darkDual', p: 0.0006 }, { id: 'hasteBoots', p: 0.0004 },
            { id: 'titanBelt', p: 0.0004 }, { id: 'bWeaponScroll', p: 0.001 }],
        desc: '熔岩翻騰的火山洞窟，炎之魔神伊弗利特的領域。',
    },
    {
        id: 'forgottenIsle', name: '紫霧遺跡', icon: '🏚️', type: 'field', tint: 'rgba(70,30,110,0.30)', lv: [62, 76], town: 'aden', fee: 2500,
        mons: ['ancientGiant', 'harpy', 'forgottenKnight', 'chimera'], rare: { id: 'forgottenKing', p: 0.007 },
        drops: [{ id: 'tsurugi', p: 0.0003 }, { id: 'abyssScythe', p: 0.0003 }, { id: 'holyMace', p: 0.0004 }, { id: 'magicSniper', p: 0.0002 },
            { id: 'elixir', p: 0.0004 }, { id: 'bArmorScroll', p: 0.002 }],
        desc: '被時間遺忘的古文明廢墟，紫霧中徘徊著古代巨人。',
    },
    {
        id: 'giantTomb', name: '泰坦墓穴', icon: '🪦', type: 'dungeon', scene: 'tomb', lv: [72, 88], town: 'aden', fee: 4000,
        mons: ['giantSkeleton', 'tombGuardian', 'necromancer', 'boneDragon'], rare: { id: 'giantKingSpirit', p: 0.006 },
        drops: [{ id: 'windBow', p: 0.0002 }, { id: 'dkFlameSword', p: 0.0002 }, { id: 'iceQueenStaff', p: 0.0002 }, { id: 'elixir', p: 0.0005 },
            { id: 'bWeaponScroll', p: 0.002 }],
        desc: '巨人王長眠的地下陵墓，骨龍守護著最深處。',
    },
    {
        id: 'tower', name: '永夜之塔', icon: '🏛️', type: 'tower', lv: [45, 90], town: 'aden', fee: 1000,
        drops: [{ id: 'towerSoul', p: 0.02 }, { id: 'elixir', p: 0.0003 }, { id: 'bWeaponScroll', p: 0.001 }, { id: 'bArmorScroll', p: 0.0015 },
            { id: 'knightHelm', p: 0.0008 }, { id: 'knightShield', p: 0.0008 }, { id: 'holyMace', p: 0.0004 }, { id: 'tsurugi', p: 0.0002 }],
        desc: '共 100 層，每 10 層有守關首領，擊敗後才能往上 10 層。',
    },
    { id: 'lairAntharas', name: '安塔瑞斯的巢穴', icon: '🐲', type: 'dragon', boss: 'antharas', reqLv: 60, town: 'aden', fee: 5000, cdH: 6, lv: [60, 99], desc: '大地之龍。' },
    { id: 'lairFafurion', name: '法利昂的巢穴',   icon: '🌊', type: 'dragon', boss: 'fafurion', reqLv: 70, prev: 'antharas', town: 'aden', fee: 8000, cdH: 6, lv: [70, 99], desc: '水之龍。' },
    { id: 'lairLindvior', name: '林德拜爾的巢穴', icon: '🌪️', type: 'dragon', boss: 'lindvior', reqLv: 80, prev: 'fafurion', town: 'aden', fee: 12000, cdH: 6, lv: [80, 99], desc: '風之龍。' },
    { id: 'lairValakas',  name: '巴拉卡斯的巢穴', icon: '🌋', type: 'dragon', boss: 'valakas', reqLv: 88, prev: 'lindvior', town: 'aden', fee: 20000, cdH: 6, lv: [88, 99], desc: '火之龍，四大龍之首。' },
];
const ZONE_BY_ID = Object.fromEntries(ZONES.map(z => [z.id, z]));
const DRAGON_IDS = ['antharas', 'fafurion', 'lindvior', 'valakas'];
