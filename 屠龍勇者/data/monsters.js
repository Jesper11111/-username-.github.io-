// 屠龍勇者：怪物資料與產生（依賴 config.js、items.js）

// 依等級算出的基準數值；怪物模板可用 hpMul/dmgMul/acAdd/expMul/goldMul 調整，或直接寫死 hp/ac/hit/dmg/exp/gold
function monBase(lv) {
    return {
        hp: Math.round(lv * lv * 0.12 + lv * 4 + 8),
        ac: 10 - lv,
        hit: lv,
        dmg: [Math.round(lv * 0.5 + 1), Math.round(lv * 1.2 + 3)],
        exp: lv * lv + 1,
        gold: [lv * 2, lv * 5],
        mr: Math.min(50, lv),
    };
}

// large 大型（武器用大型傷害）、undead 不死系（銀武器、聖騎士有加成）
// magic：{ p 機率, dmg, name } 魔法攻擊無視 AC，受 MR 減免
// drops：{ id, p 機率, n:[min,max] }
const MONSTERS = {
    // 說話之島
    goblin:         { name: '哥布林',     icon: '👺', lv: 1 },
    dwarf:          { name: '侏儒',       icon: '🧔', lv: 2 },
    wolf:           { name: '狼',         icon: '🐺', lv: 3, spd: 1200 },
    orc:            { name: '妖魔',       icon: '👹', lv: 4 },
    floatingEye:    { name: '漂浮之眼',   icon: '👁️', lv: 5, magic: { p: 0.2, dmg: [4, 9], name: '凝視' } },
    skeleton:       { name: '骷髏',       icon: '💀', lv: 6, undead: true },
    // 說話之島地監
    dwarfWarrior:   { name: '侏儒戰士',   icon: '🧔', lv: 9 },
    orcArcher:      { name: '妖魔弓箭手', icon: '🏹', lv: 10 },
    skeletonArcher: { name: '骷髏弓箭手', icon: '💀', lv: 11, undead: true },
    ghoul:          { name: '食屍鬼',     icon: '🧟', lv: 13, undead: true, hpMul: 1.2 },
    // 古魯丁地監
    gandiOrc:       { name: '甘地妖魔',   icon: '👹', lv: 16 },
    zombie:         { name: '殭屍',       icon: '🧟', lv: 17, undead: true, hpMul: 1.3, spd: 1800 },
    lycan:          { name: '萊肯',       icon: '🐺', lv: 18, large: true, spd: 1200 },
    stoneGolem:     { name: '石頭高崙',   icon: '🗿', lv: 20, large: true, acAdd: -5, hpMul: 1.3, spd: 1900 },
    skeletonAxe:    { name: '骷髏斧手',   icon: '💀', lv: 25, undead: true },
    blackKnight:    { name: '黑騎士',     icon: '🗡️', lv: 28, acAdd: -5 },
    giantAnt:       { name: '巨大兵蟻',   icon: '🐜', lv: 30, large: true, hpMul: 1.2 },
    ghast:          { name: '鬼魂',       icon: '👻', lv: 32, undead: true, magic: { p: 0.25, dmg: [25, 45], name: '冰之觸摸' } },
    baphomet: {
        name: '巴風特', icon: '🐐', lv: 38, boss: true, large: true, hpMul: 12, dmgMul: 1.6, acAdd: -10, expMul: 15, goldMul: 10,
        magic: { p: 0.2, dmg: [60, 100], name: '地獄之火' },
        drops: [{ id: 'baphometHorn', p: 1, n: [1, 2] }, { id: 'katana', p: 0.05 }, { id: 'bWeaponScroll', p: 0.05 }, { id: 'bArmorScroll', p: 0.08 }, { id: 'elixir', p: 0.03 }],
    },
    // 象牙塔
    hellhound:      { name: '地獄犬',       icon: '🐕', lv: 36, large: true, magic: { p: 0.2, dmg: [30, 50], name: '火焰吐息' } },
    lamia:          { name: '蛇女',         icon: '🐍', lv: 38 },
    ivoryMage:      { name: '象牙塔魔法師', icon: '🧙', lv: 40, hpMul: 0.9, magic: { p: 0.35, dmg: [35, 60], name: '火球術' } },
    ivoryGuard:     { name: '象牙塔守衛',   icon: '🗿', lv: 42, large: true, acAdd: -8, hpMul: 1.3 },
    demon: {
        name: '惡魔', icon: '😈', lv: 50, boss: true, large: true, hpMul: 12, dmgMul: 1.6, acAdd: -12, expMul: 15, goldMul: 10,
        magic: { p: 0.25, dmg: [90, 150], name: '黑暗之火' },
        drops: [{ id: 'demonHeart', p: 1, n: [1, 2] }, { id: 'demonAxe', p: 0.04 }, { id: 'manaWand', p: 0.05 }, { id: 'bWeaponScroll', p: 0.06 }, { id: 'bArmorScroll', p: 0.1 }, { id: 'elixir', p: 0.04 }],
    },
    // 金字塔
    mummy:          { name: '木乃伊',     icon: '🧟', lv: 44, undead: true, hpMul: 1.2 },
    sandScorpion:   { name: '沙漠巨蠍',   icon: '🦂', lv: 46, large: true },
    sphinx:         { name: '獅身人面獸', icon: '🦁', lv: 50, large: true, magic: { p: 0.2, dmg: [45, 75], name: '謎之咆哮' } },
    anubis:         { name: '阿努比斯',   icon: '🐺', lv: 53, undead: true, acAdd: -5 },
    osiris: {
        name: '歐西里斯', icon: '🏺', lv: 60, boss: true, undead: true, large: true, hpMul: 12, dmgMul: 1.6, acAdd: -15, expMul: 15, goldMul: 10,
        magic: { p: 0.25, dmg: [120, 190], name: '冥界審判' },
        drops: [{ id: 'osirisSeal', p: 1, n: [1, 2] }, { id: 'darkClaw', p: 0.04 }, { id: 'darkDual', p: 0.04 }, { id: 'elvenBow', p: 0.05 }, { id: 'bWeaponScroll', p: 0.08 }, { id: 'bArmorScroll', p: 0.12 }, { id: 'elixir', p: 0.05 }],
    },
    // 四大龍（數值寫死）
    antharas: {
        name: '地龍・安塔瑞斯', icon: '🐲', lv: 62, boss: true, dragon: true, large: true,
        hp: 9000, ac: -50, hit: 70, dmg: [45, 95], spd: 1900, exp: 600000, gold: [20000, 30000], mr: 50,
        magic: { p: 0.25, dmg: [120, 200], name: '大地震動' },
        drops: [{ id: 'antharasScale', p: 1, n: [2, 3] }, { id: 'elixir', p: 0.3 }, { id: 'bWeaponScroll', p: 0.3 }, { id: 'bArmorScroll', p: 0.4 }, { id: 'knightShield', p: 0.2 }],
    },
    fafurion: {
        name: '水龍・法利昂', icon: '🐉', lv: 72, boss: true, dragon: true, large: true,
        hp: 14000, ac: -60, hit: 82, dmg: [55, 115], spd: 1800, exp: 1500000, gold: [30000, 45000], mr: 60,
        magic: { p: 0.3, dmg: [150, 250], name: '海嘯' },
        drops: [{ id: 'fafurionScale', p: 1, n: [2, 3] }, { id: 'iceQueenStaff', p: 0.15 }, { id: 'elixir', p: 0.35 }, { id: 'bWeaponScroll', p: 0.35 }, { id: 'bArmorScroll', p: 0.45 }],
    },
    lindvior: {
        name: '風龍・林德拜爾', icon: '🐉', lv: 82, boss: true, dragon: true, large: true,
        hp: 20000, ac: -70, hit: 95, dmg: [65, 130], spd: 1700, exp: 3500000, gold: [45000, 60000], mr: 65,
        magic: { p: 0.3, dmg: [180, 300], name: '暴風' },
        drops: [{ id: 'lindviorScale', p: 1, n: [2, 3] }, { id: 'windBow', p: 0.2 }, { id: 'magicSniper', p: 0.15 }, { id: 'elixir', p: 0.4 }, { id: 'bWeaponScroll', p: 0.4 }, { id: 'bArmorScroll', p: 0.5 }],
    },
    valakas: {
        name: '火龍・巴拉卡斯', icon: '🔥', lv: 92, boss: true, dragon: true, large: true,
        hp: 28000, ac: -80, hit: 108, dmg: [80, 160], spd: 1700, exp: 8000000, gold: [60000, 90000], mr: 70,
        magic: { p: 0.35, dmg: [220, 360], name: '煉獄火焰' },
        drops: [{ id: 'valakasScale', p: 1, n: [2, 3] }, { id: 'dkFlameSword', p: 0.2 }, { id: 'elixir', p: 0.5 }, { id: 'bWeaponScroll', p: 0.5 }, { id: 'bArmorScroll', p: 0.6 }],
    },
};

// 傲慢之塔：每 10 層一個主題，10、20…100 樓有守關首領
const TOWER_THEMES = [
    ['骷髏神射手', '死亡騎士的隨從'], ['石像鬼', '暗影刺客'], ['火焰之影', '熔岩高崙'], ['冰原狼人', '冰之魔女'], ['巫妖', '死靈法師'],
    ['墮落天使', '地獄騎士'], ['混沌戰士', '混沌法師'], ['深淵魔物', '虛空行者'], ['冥界守衛', '冥界死神'], ['冥法親衛', '冥法巫師'],
];
const TOWER_BOSSES = ['巨大牛人', '黑暗女妖', '炎魔之影', '冰之女王', '巫妖王', '墮落的大天使', '混沌之主', '深淵領主', '死神', '冥法軍王'];
const TOWER_BOSS_DROPS = [
    ['knightHelm', 'protectCloak'], ['knightShield', 'mrCloak'], ['holyMace', 'darkDagger'], ['iceQueenStaff', 'mrAmulet'], ['tsurugi', 'strAmulet'],
    ['demonAxe', 'powerGloves'], ['magicSniper', 'titanBelt'], ['darkClaw', 'abyssScythe'], ['hasteBoots', 'elvenBow'], ['dkFlameSword', 'windBow'],
];
const TOWER_ICONS = ['💀', '🦇', '🔥', '❄️', '☠️', '😇', '🌀', '🕳️', '⚰️', '👑'];

// 種族標籤：human 人型、demon 惡魔、holy 神聖（天使、惡魔職業的剋制加成用）；不死系用模板的 undead
const MONSTER_TAGS = {
    goblin: ['human'], dwarf: ['human'], orc: ['human'], dwarfWarrior: ['human'], orcArcher: ['human'], gandiOrc: ['human'],
    blackKnight: ['human'], ivoryMage: ['human'], hellhound: ['demon'], baphomet: ['demon'], demon: ['demon'],
    sphinx: ['holy'], anubis: ['holy'], osiris: ['holy'],
    // 傲慢之塔（依名稱）
    '暗影刺客': ['human'], '石像鬼': ['demon'], '火焰之影': ['demon'], '炎魔之影': ['demon'], '冰之魔女': ['human'], '死靈法師': ['human'],
    '墮落天使': ['holy'], '墮落的大天使': ['holy'], '地獄騎士': ['demon'], '混沌戰士': ['human'], '混沌法師': ['human'], '混沌之主': ['demon'],
    '深淵魔物': ['demon'], '虛空行者': ['demon'], '深淵領主': ['demon'], '冥法親衛': ['human'], '冥法巫師': ['human'], '冥法軍王': ['human'],
};

function buildMonster(id, t) {
    const b = monBase(t.lv);
    const dm = t.dmgMul || 1, gm = t.goldMul || 1;
    const hp = t.hp || Math.round(b.hp * (t.hpMul || 1));
    const tags = t.tags || MONSTER_TAGS[id] || MONSTER_TAGS[t.baseName || t.name] || [];
    return {
        human: tags.includes('human'), demon: tags.includes('demon'), holy: tags.includes('holy'),
        id, name: t.name, icon: t.icon || '👾', lv: t.lv,
        hp, maxHp: hp,
        ac: t.ac != null ? t.ac : b.ac + (t.acAdd || 0),
        hit: t.hit != null ? t.hit : b.hit,
        dmg: t.dmg || [Math.round(b.dmg[0] * dm), Math.round(b.dmg[1] * dm)],
        spd: t.spd || 1500,
        exp: t.exp || Math.round(b.exp * (t.expMul || 1)),
        gold: t.gold || [b.gold[0] * gm, b.gold[1] * gm],
        mr: t.mr != null ? t.mr : b.mr,
        large: !!t.large, undead: !!t.undead, boss: !!t.boss, dragon: !!t.dragon,
        magic: t.magic || null, drops: t.drops || [], towerFloor: t.towerFloor || 0,
    };
}

function makeMonster(id) { return buildMonster(id, MONSTERS[id]); }

function makeTowerMonster(floor, isBoss) {
    const g = Math.min(9, Math.floor((floor - 1) / 10));
    const lv = 44 + Math.round(floor * 0.45);
    if (isBoss) {
        return buildMonster('towerBoss' + floor, {
            name: `${TOWER_BOSSES[g]}（${floor}F）`, baseName: TOWER_BOSSES[g], icon: TOWER_ICONS[g], lv: lv + 3, boss: true, large: true, towerFloor: floor,
            hpMul: 10, dmgMul: 1.5, acAdd: -10, expMul: 20, goldMul: 10,
            magic: { p: 0.25, dmg: [lv * 1.5, lv * 2.5].map(Math.round), name: '首領之怒' },
            drops: [{ id: 'towerSoul', p: 1, n: [3, 5] }, ...TOWER_BOSS_DROPS[g].map(id => ({ id, p: 0.12 })),
                { id: 'elixir', p: 0.05 }, { id: 'bWeaponScroll', p: 0.06 }, { id: 'bArmorScroll', p: 0.1 }],
        });
    }
    const names = TOWER_THEMES[g];
    return buildMonster('tower' + floor, {
        name: names[rand(0, names.length - 1)], icon: TOWER_ICONS[g], lv, hpMul: 1.15, expMul: 1.3,
        undead: g === 0 || g === 4 || g === 8, large: chance(0.4),
        magic: g % 2 === 1 ? { p: 0.2, dmg: [lv, Math.round(lv * 1.6)], name: '黑暗魔法' } : null,
    });
}

// 所有怪物共用的掉落（依怪物等級）
const COMMON_DROPS = [
    { id: 'redPotion',     p: 0.06, n: [1, 2], maxLv: 30 },
    { id: 'orangePotion',  p: 0.04, n: [1, 2], minLv: 15 },
    { id: 'whitePotion',   p: 0.03, minLv: 35 },
    { id: 'homeScroll',    p: 0.015 },
    { id: 'teleScroll',    p: 0.01, minLv: 10 },
    { id: 'armorScroll',   p: 0.004, minLv: 8 },
    { id: 'weaponScroll',  p: 0.002, minLv: 8 },
    { id: 'cArmorScroll',  p: 0.002, minLv: 8 },
    { id: 'cWeaponScroll', p: 0.001, minLv: 8 },
    { id: 'bArmorScroll',  p: 0.0006, minLv: 30 },
    { id: 'bWeaponScroll', p: 0.0003, minLv: 30 },
    { id: 'elixir',        p: 0.0001, minLv: 45 },
];
