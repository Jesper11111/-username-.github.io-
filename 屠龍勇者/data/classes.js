// 屠龍勇者：職業資料（依賴 config.js）
const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_NAMES = { str: '力量', dex: '敏捷', con: '體質', int: '智力', wis: '精神', cha: '魅力' };
const CREATE_TOTAL = 75;      // 創角能力值總點數（天堂 1 規則）
const CREATE_STAT_MAX = 18;   // 創角時單項上限

// base：職業最低能力值（剩下的點數自由分配）
// hp/mp：每升一級的成長範圍（另加體質／精神加成）
// spDiv：等級每幾級 +1 SP；mpRegenK：精神對回魔的影響
// weapons：可用武器種類（見 items.js WEAPON_TYPES）；start：初始裝備；ammo：初始彈藥
const CLASSES = {
    royal: {
        name: '王族', icon: '👑',
        desc: '擅長領導與支援，魅力越高打怪金幣越多（每點超過 10 +3%）。會士氣系增益與初級治癒。',
        base: { str: 13, dex: 10, con: 10, int: 10, wis: 11, cha: 13 },
        hp: [9, 13], mp: [2, 4], startHp: 14, startMp: 4, mr: 10, spDiv: 8, mpRegenK: 0.5,
        weapons: ['dagger', 'sword', 'bow'], shield: true, start: ['shortSword', 'leatherArmor', 'woodShield'],
    },
    knight: {
        name: '騎士', icon: '🛡️',
        desc: '高防禦與近戰能力，力量與體質成長快，主要使用劍與盾。可使用勇敢藥水。',
        base: { str: 16, dex: 12, con: 14, int: 8, wis: 9, cha: 12 },
        hp: [14, 18], mp: [0, 1], startHp: 18, startMp: 1, mr: 0, spDiv: 12, mpRegenK: 0.3,
        weapons: ['sword', 'twohand', 'axe', 'spear', 'blunt'], shield: true, start: ['longSword', 'leatherArmor', 'woodShield'],
    },
    mage: {
        name: '法師', icon: '🔮',
        desc: '以智力與精神為主，攻擊魔法強大、魔力回復快，適合遠程魔法輸出，但血量低。',
        base: { str: 8, dex: 7, con: 12, int: 12, wis: 12, cha: 8 },
        hp: [5, 8], mp: [6, 9], startHp: 10, startMp: 8, mr: 15, spDiv: 4, mpRegenK: 1,
        weapons: ['dagger', 'staff'], shield: true, start: ['oakWand', 'leatherArmor'],
    },
    elf: {
        name: '妖精', icon: '🧝',
        desc: '敏捷高，擅長弓箭遠程攻擊與迴避，會精靈魔法。射箭需要消耗箭矢。',
        base: { str: 11, dex: 12, con: 12, int: 12, wis: 12, cha: 9 },
        hp: [9, 12], mp: [3, 6], startHp: 15, startMp: 6, mr: 25, spDiv: 8, mpRegenK: 0.7,
        weapons: ['bow', 'sword', 'dagger', 'spear'], shield: true, start: ['shortBow', 'leatherArmor'], ammo: 'arrow',
    },
    darkelf: {
        name: '黑暗妖精', icon: '🗡️',
        desc: '兼具魔法與物理能力的平衡型職業，擅長閃避與爆擊，使用匕首、鋼爪、雙刀。',
        base: { str: 12, dex: 15, con: 8, int: 10, wis: 11, cha: 9 },
        hp: [10, 12], mp: [3, 5], startHp: 12, startMp: 5, mr: 10, spDiv: 8, mpRegenK: 0.6,
        weapons: ['dagger', 'claw', 'dual'], shield: true, start: ['dagger', 'leatherArmor'],
    },
    shura: {
        name: '修羅', icon: '👊',
        desc: '高攻擊力與連擊能力，偏向單體爆發，力量與敏捷成長均衡，使用鋼爪與雙刀。',
        base: { str: 15, dex: 14, con: 12, int: 8, wis: 9, cha: 8 },
        hp: [11, 15], mp: [1, 3], startHp: 15, startMp: 2, mr: 5, spDiv: 12, mpRegenK: 0.4,
        weapons: ['claw', 'dual'], shield: false, start: ['claw', 'leatherArmor'],
    },
    warrior: {
        name: '戰士', icon: '🪓',
        desc: '近戰專精，力量與體質高，適合坦克或輸出，主要使用劍、斧等武器。血越少越兇猛。',
        base: { str: 16, dex: 12, con: 15, int: 8, wis: 8, cha: 8 },
        hp: [15, 19], mp: [0, 1], startHp: 19, startMp: 1, mr: 0, spDiv: 12, mpRegenK: 0.3,
        weapons: ['axe', 'twohand', 'sword', 'blunt'], shield: true, start: ['handAxe', 'leatherArmor', 'woodShield'],
    },
    gunner: {
        name: '槍手', icon: '🔫',
        desc: '遠程物理攻擊專家，敏捷與命中高，使用槍械或弓箭，射擊需要消耗彈藥。',
        base: { str: 10, dex: 16, con: 11, int: 10, wis: 10, cha: 9 },
        hp: [9, 12], mp: [2, 4], startHp: 13, startMp: 4, mr: 10, spDiv: 10, mpRegenK: 0.5,
        weapons: ['gun', 'bow'], shield: false, start: ['matchlock', 'leatherArmor'], ammo: 'bullet',
    },
    magicfighter: {
        name: '魔鬥士', icon: '⚡',
        desc: '結合魔法與近戰，能用魔力增強攻擊（SP 轉為傷害），適合混合型玩法。',
        base: { str: 13, dex: 11, con: 12, int: 13, wis: 10, cha: 8 },
        hp: [10, 13], mp: [3, 6], startHp: 14, startMp: 5, mr: 10, spDiv: 6, mpRegenK: 0.7,
        weapons: ['sword', 'staff', 'spear'], shield: true, start: ['shortSword', 'leatherArmor'],
    },
    paladin: {
        name: '聖騎士', icon: '✝️',
        desc: '兼具防禦與治療能力，力量與精神均衡，對不死系特別有效，適合支援與前線作戰。',
        base: { str: 14, dex: 10, con: 13, int: 8, wis: 13, cha: 10 },
        hp: [12, 16], mp: [2, 4], startHp: 16, startMp: 4, mr: 15, spDiv: 10, mpRegenK: 0.6,
        weapons: ['sword', 'blunt'], shield: true, start: ['mace', 'leatherArmor', 'woodShield'],
    },
};
