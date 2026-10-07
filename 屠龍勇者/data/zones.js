// 屠龍勇者：村莊與狩獵地圖（依賴 monsters.js）

// tier：商店能賣到第幾級的商品
const TOWNS = {
    talking: { name: '說話之島村莊', icon: '🏡', tier: 1 },
    gludio:  { name: '古魯丁村',     icon: '🏘️', tier: 2 },
    giran:   { name: '奇岩城',       icon: '🏰', tier: 3 },
    aden:    { name: '亞丁城',       icon: '🏯', tier: 4 },
};
const TOWN_TRAVEL_FEE = 200; // 村莊間傳送：每差一級 200 金幣

// type：field 野外／dungeon 地監／tower 魔塔／dragon 龍穴
// town：回家卷軸、死亡時回到的村莊；fee：從村莊傳送過去的費用
// rare：稀有首領出現機率；drops：地圖專屬掉落
const ZONES = [
    {
        id: 'island', name: '說話之島', icon: '🏝️', type: 'field', lv: [1, 10], town: 'talking', fee: 0,
        mons: ['goblin', 'dwarf', 'wolf', 'orc', 'floatingEye', 'skeleton'],
        drops: [{ id: 'dagger', p: 0.01 }, { id: 'shortSword', p: 0.008 }, { id: 'leatherCap', p: 0.01 }, { id: 'leatherArmor', p: 0.008 },
            { id: 'woodShield', p: 0.008 }, { id: 'leatherBoots', p: 0.008 }, { id: 'shortBow', p: 0.005 }, { id: 'arrow', p: 0.1, n: [5, 15] }],
        desc: '新手冒險者的起點。',
    },
    {
        id: 'islandDungeon', name: '說話之島地監', icon: '🕳️', type: 'dungeon', lv: [8, 18], town: 'talking', fee: 50,
        mons: ['dwarfWarrior', 'orcArcher', 'skeletonArcher', 'ghoul'],
        drops: [{ id: 'longSword', p: 0.004 }, { id: 'mace', p: 0.004 }, { id: 'handAxe', p: 0.004 }, { id: 'ironHelm', p: 0.003 },
            { id: 'scaleMail', p: 0.002 }, { id: 'cloak', p: 0.004 }, { id: 'matchlock', p: 0.003 }, { id: 'oakWand', p: 0.003 },
            { id: 'claw', p: 0.002 }, { id: 'dualBlade', p: 0.002 }, { id: 'silverArrow', p: 0.05, n: [5, 15] }],
        desc: '陰暗潮濕的地下城，不死系開始出沒。',
    },
    {
        id: 'gludio1', name: '古魯丁地監 1～3 樓', icon: '⛏️', type: 'dungeon', lv: [15, 25], town: 'gludio', fee: 150,
        mons: ['gandiOrc', 'zombie', 'lycan', 'stoneGolem'],
        drops: [{ id: 'silverSword', p: 0.002 }, { id: 'spear', p: 0.003 }, { id: 'chainMail', p: 0.002 }, { id: 'ironShield', p: 0.003 },
            { id: 'leatherGloves', p: 0.005 }, { id: 'ironBoots', p: 0.002 }, { id: 'crystalWand', p: 0.001 }, { id: 'silverDagger', p: 0.002 }],
        desc: '中級冒險者的修練場。',
    },
    {
        id: 'gludio2', name: '古魯丁地監 4～7 樓', icon: '🔥', type: 'dungeon', lv: [24, 36], town: 'gludio', fee: 300,
        mons: ['skeletonAxe', 'blackKnight', 'giantAnt', 'ghast'], rare: { id: 'baphomet', p: 0.01 },
        drops: [{ id: 'katana', p: 0.0008 }, { id: 'twoHandSword', p: 0.002 }, { id: 'battleAxe', p: 0.002 }, { id: 'warHammer', p: 0.002 },
            { id: 'plateMail', p: 0.001 }, { id: 'mageRobe', p: 0.001 }, { id: 'longBow', p: 0.002 }, { id: 'rifle', p: 0.002 },
            { id: 'tshirt', p: 0.002 }, { id: 'strRing', p: 0.0005 }],
        desc: '最深處盤踞著巴風特。',
    },
    {
        id: 'ivory', name: '象牙塔', icon: '🗼', type: 'dungeon', lv: [34, 46], town: 'giran', fee: 500,
        mons: ['hellhound', 'lamia', 'ivoryMage', 'ivoryGuard'], rare: { id: 'demon', p: 0.008 },
        drops: [{ id: 'manaWand', p: 0.001 }, { id: 'elvenMail', p: 0.001 }, { id: 'mrCloak', p: 0.001 }, { id: 'powerGloves', p: 0.0008 },
            { id: 'mrAmulet', p: 0.0008 }, { id: 'dexRing', p: 0.0005 }, { id: 'intRing', p: 0.0005 }, { id: 'darkDagger', p: 0.001 }],
        desc: '魔法師們的高塔，被惡魔佔據。',
    },
    {
        id: 'pyramid', name: '金字塔', icon: '🔺', type: 'dungeon', lv: [44, 56], town: 'giran', fee: 700,
        mons: ['mummy', 'sandScorpion', 'sphinx', 'anubis'], rare: { id: 'osiris', p: 0.008 },
        drops: [{ id: 'trident', p: 0.002 }, { id: 'darkClaw', p: 0.0008 }, { id: 'darkDual', p: 0.0008 }, { id: 'elvenBow', p: 0.0008 },
            { id: 'protectCloak', p: 0.001 }, { id: 'conRing', p: 0.0005 }, { id: 'titanBelt', p: 0.0005 }, { id: 'hasteBoots', p: 0.0005 }],
        desc: '沙漠中的古代陵墓，冥王歐西里斯沉睡於此。',
    },
    {
        id: 'tower', name: '魔塔', icon: '🏛️', type: 'tower', lv: [45, 90], town: 'aden', fee: 1000,
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
