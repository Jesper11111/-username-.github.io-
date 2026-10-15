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
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/royal-*.json 切出（"flat"；原圖朝左的格子用 "flip" 鏡像，第 18 節）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/royal-walk.png',   cellW: 114, cellH: 121, frames: { down: 6, right: 5, up: 6 }, ms: 110 },
            attack: { src: 'images/sprites/royal-attack.png', cellW: 134, cellH: 114, frames: { down: 8, right: 8, up: 8 }, ms: 60 },
            cast:   { src: 'images/sprites/royal-cast.png',   cellW: 208, cellH: 115, frames: { down: 8, right: 6, up: 6 }, ms: 90 },
            hit:    { src: 'images/sprites/royal-hit.png',    cellW: 172, cellH: 117, frames: { down: 2, right: 2, up: 2 }, ms: 130 },
        },
        art: 'images/classes/royal.jpg',
    },
    knight: {
        name: '騎士', icon: '🛡️',
        desc: '高防禦與近戰能力，力量與體質成長快，主要使用劍與盾。可使用勇敢藥水。',
        base: { str: 16, dex: 12, con: 14, int: 8, wis: 9, cha: 12 },
        hp: [14, 18], mp: [0, 1], startHp: 18, startMp: 1, mr: 0, spDiv: 12, mpRegenK: 0.3,
        weapons: ['sword', 'twohand', 'axe', 'spear', 'blunt'], shield: true, start: ['longSword', 'leatherArmor', 'woodShield'],
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/knight-*.json 切出（純灰底 "flat"，第 18 節）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/knight-walk.png',   cellW: 134, cellH: 122, frames: { down: 8, right: 8, up: 6 }, ms: 110 },
            attack: { src: 'images/sprites/knight-attack.png', cellW: 194, cellH: 136, frames: { down: 3, right: 3, up: 3 }, ms: 110 },
            cast:   { src: 'images/sprites/knight-cast.png',   cellW: 156, cellH: 136, frames: { down: 3, right: 3, up: 3 }, ms: 140 },
            hit:    { src: 'images/sprites/knight-hit.png',    cellW: 148, cellH: 125, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/knight.jpg',
    },
    mage: {
        name: '法師', icon: '🔮',
        desc: '以智力與精神為主，攻擊魔法強大、魔力回復快，適合遠程魔法輸出，但血量低。',
        base: { str: 8, dex: 7, con: 12, int: 12, wis: 12, cha: 8 },
        hp: [5, 8], mp: [6, 9], startHp: 10, startMp: 8, mr: 15, spDiv: 4, mpRegenK: 1,
        weapons: ['dagger', 'staff'], shield: true, start: ['oakWand', 'leatherArmor'],
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/mage-walk.png',   cellW: 121, cellH: 127, frames: { down: 5, right: 5, up: 5 }, ms: 120 },
            attack: { src: 'images/sprites/mage-attack.png', cellW: 132, cellH: 127, frames: { down: 3, right: 4, up: 7 }, ms: 80 },
            cast:   { src: 'images/sprites/mage-cast.png',   cellW: 130, cellH: 126, frames: { down: 3, right: 8, up: 8 }, ms: 90 },
            hit:    { src: 'images/sprites/mage-hit.png',    cellW: 127, cellH: 123, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/mage.jpg',
    },
    elf: {
        name: '妖精', icon: '🧝',
        desc: '敏捷高，擅長弓箭遠程攻擊與迴避，會精靈魔法。射箭需要消耗箭矢。',
        base: { str: 11, dex: 12, con: 12, int: 12, wis: 12, cha: 9 },
        hp: [9, 12], mp: [3, 6], startHp: 15, startMp: 6, mr: 25, spDiv: 8, mpRegenK: 0.7,
        weapons: ['bow', 'sword', 'dagger', 'spear'], shield: true, start: ['shortBow', 'leatherArmor'], ammo: 'arrow',
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/elf-*.json 切出（純灰底用 "flat"、抹掉格子編號 "labels"，第 18 節）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/elf-walk.png',   cellW: 98,  cellH: 116, frames: { down: 3, right: 2, up: 3 }, ms: 150 },
            attack: { src: 'images/sprites/elf-attack.png', cellW: 146, cellH: 127, frames: { down: 6, right: 5, up: 4 }, ms: 60 },
            cast:   { src: 'images/sprites/elf-cast.png',   cellW: 206, cellH: 152, frames: { down: 5, right: 4, up: 4 }, ms: 90 },
            hit:    { src: 'images/sprites/elf-hit.png',    cellW: 116, cellH: 121, frames: { down: 3, right: 3, up: 2 }, ms: 90 },
        },
        art: 'images/classes/elf.jpg',
    },
    darkelf: {
        name: '黑暗妖精', icon: '🗡️',
        desc: '兼具魔法與物理能力的平衡型職業，擅長閃避與爆擊，使用匕首、鋼爪、雙刀。',
        base: { str: 12, dex: 15, con: 8, int: 10, wis: 11, cha: 9 },
        hp: [10, 12], mp: [3, 5], startHp: 12, startMp: 5, mr: 10, spDiv: 8, mpRegenK: 0.6,
        weapons: ['dagger', 'claw', 'dual'], shield: true, start: ['dagger', 'leatherArmor'],
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/darkelf-*.json 切出（原圖沒有背面，向上沿用側面格，第 18 節）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/darkelf-walk.png',   cellW: 152, cellH: 117, frames: { down: 8, right: 7, up: 7 }, ms: 110 },
            attack: { src: 'images/sprites/darkelf-attack.png', cellW: 252, cellH: 155, frames: { down: 7, right: 7, up: 5 }, ms: 55 },
            cast:   { src: 'images/sprites/darkelf-cast.png',   cellW: 206, cellH: 112, frames: { down: 4, right: 4, up: 4 }, ms: 100 },
            hit:    { src: 'images/sprites/darkelf-hit.png',    cellW: 154, cellH: 130, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/darkelf.jpg',
    },
    shura: {
        name: '修羅', icon: '👊',
        desc: '高攻擊力與連擊能力，偏向單體爆發，力量與敏捷成長均衡，使用鋼爪與雙刀。',
        base: { str: 15, dex: 14, con: 12, int: 8, wis: 9, cha: 8 },
        hp: [11, 15], mp: [1, 3], startHp: 15, startMp: 2, mr: 5, spDiv: 12, mpRegenK: 0.4,
        weapons: ['claw', 'dual'], shield: false, start: ['claw', 'leatherArmor'],
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/shura-*.json 切出（走路／受傷用 "matte"、攻擊／施法用 "shape"，都加 "sharpen"，第 18 節）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/shura-walk.png',   cellW: 188, cellH: 130, frames: { down: 8, right: 8, up: 2 }, ms: 110 },
            attack: { src: 'images/sprites/shura-attack.png', cellW: 282, cellH: 125, frames: { down: 9, right: 9, up: 9 }, ms: 55 },
            cast:   { src: 'images/sprites/shura-cast.png',   cellW: 214, cellH: 116, frames: { down: 4, right: 4, up: 4 }, ms: 110 },
            hit:    { src: 'images/sprites/shura-hit.png',    cellW: 162, cellH: 120, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/shura.jpg',
    },
    warrior: {
        name: '戰士', icon: '🪓',
        desc: '近戰專精，力量與體質高，適合坦克或輸出，主要使用劍、斧等武器。血越少越兇猛。',
        base: { str: 16, dex: 12, con: 15, int: 8, wis: 8, cha: 8 },
        hp: [15, 19], mp: [0, 1], startHp: 19, startMp: 1, mr: 0, spDiv: 12, mpRegenK: 0.3,
        weapons: ['axe', 'twohand', 'sword', 'blunt'], shield: true, start: ['handAxe', 'leatherArmor', 'woodShield'],
        // 人物模型：tools/cut-sprites.py 依 tools/sprite-src/warrior-*.json 切出（2026-10-10）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/warrior-walk.png',   cellW: 102, cellH: 131, frames: { down: 5, right: 5, up: 5 }, ms: 120 },
            attack: { src: 'images/sprites/warrior-attack.png', cellW: 173, cellH: 142, frames: { down: 6, right: 6, up: 6 }, ms: 70 },
            cast:   { src: 'images/sprites/warrior-cast.png',   cellW: 195, cellH: 174, frames: { down: 6, right: 6, up: 6 }, ms: 90 },
            hit:    { src: 'images/sprites/warrior-hit.png',    cellW: 125, cellH: 138, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/warrior.jpg',
    },
    gunner: {
        name: '槍手', icon: '🔫',
        desc: '遠程物理攻擊專家，敏捷與命中高，使用槍械或弓箭，射擊需要消耗彈藥。',
        base: { str: 10, dex: 16, con: 11, int: 10, wis: 10, cha: 9 },
        hp: [9, 12], mp: [2, 4], startHp: 13, startMp: 4, mr: 10, spDiv: 10, mpRegenK: 0.5,
        weapons: ['gun', 'bow'], shield: false, start: ['matchlock', 'leatherArmor'], ammo: 'bullet',
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/gunner-*.json 切出（黑衣和背景同色，用 "shape" 形狀去背）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/gunner-walk.png',   cellW: 108, cellH: 119, frames: { down: 6, right: 6, up: 6 }, ms: 110 },
            attack: { src: 'images/sprites/gunner-attack.png', cellW: 154, cellH: 129, frames: { down: 8, right: 8, up: 8 }, ms: 50 },
            cast:   { src: 'images/sprites/gunner-cast.png',   cellW: 156, cellH: 142, frames: { down: 5, right: 6, up: 5 }, ms: 90 },
            hit:    { src: 'images/sprites/gunner-hit.png',    cellW: 130, cellH: 120, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/gunner.jpg',
    },
    magicfighter: {
        name: '魔鬥士', icon: '⚡',
        desc: '結合魔法與近戰，能用魔力增強攻擊（SP 轉為傷害），適合混合型玩法。',
        base: { str: 13, dex: 11, con: 12, int: 13, wis: 10, cha: 8 },
        hp: [10, 13], mp: [3, 6], startHp: 14, startMp: 5, mr: 10, spDiv: 6, mpRegenK: 0.7,
        weapons: ['sword', 'staff', 'spear'], shield: true, start: ['shortSword', 'leatherArmor'],
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/magicfighter-*.json 切出（黑衣和背景同色，用 "shape" 形狀去背，第 18 節）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/magicfighter-walk.png',   cellW: 68,  cellH: 127, frames: { down: 6, right: 6, up: 6 }, ms: 110 },
            attack: { src: 'images/sprites/magicfighter-attack.png', cellW: 198, cellH: 142, frames: { down: 10, right: 9, up: 10 }, ms: 50 },
            cast:   { src: 'images/sprites/magicfighter-cast.png',   cellW: 148, cellH: 147, frames: { down: 3, right: 5, up: 6 }, ms: 90 },
            hit:    { src: 'images/sprites/magicfighter-hit.png',    cellW: 108, cellH: 128, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/magicfighter.jpg',
    },
    paladin: {
        name: '聖騎士', icon: '✝️',
        desc: '兼具防禦與治療能力，力量與精神均衡，對不死系特別有效，適合支援與前線作戰。',
        base: { str: 14, dex: 10, con: 13, int: 8, wis: 13, cha: 10 },
        hp: [12, 16], mp: [2, 4], startHp: 16, startMp: 4, mr: 15, spDiv: 10, mpRegenK: 0.6,
        weapons: ['sword', 'blunt'], shield: true, start: ['mace', 'leatherArmor', 'woodShield'],
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/paladin-*.json 切出（新版格紋背景用 checker2；向上走路／攻擊混用舊版原圖，見 json 的 "alt"）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/paladin-walk.png',   cellW: 144, cellH: 126, frames: { down: 6, right: 6, up: 6 }, ms: 120 },
            attack: { src: 'images/sprites/paladin-attack.png', cellW: 140, cellH: 143, frames: { down: 8, right: 8, up: 5 }, ms: 60 },
            cast:   { src: 'images/sprites/paladin-cast.png',   cellW: 152, cellH: 161, frames: { down: 5, right: 5, up: 8 }, ms: 90 },
            hit:    { src: 'images/sprites/paladin-hit.png',    cellW: 238, cellH: 131, frames: { down: 3, right: 2, up: 2 }, ms: 110 },
        },
        art: 'images/classes/paladin.jpg',
    },
    angel: {
        name: '天使', icon: '😇',
        desc: '失去羽翼墜落凡間的守護天使。神聖魔法兼具治癒與審判，對惡魔與不死系傷害 ×1.3。使用魔杖、長矛與單手劍。',
        base: { str: 11, dex: 10, con: 11, int: 12, wis: 15, cha: 12 },
        hp: [9, 12], mp: [4, 7], startHp: 13, startMp: 7, mr: 25, spDiv: 6, mpRegenK: 0.9,
        weapons: ['staff', 'spear', 'sword'], shield: true, start: ['oakWand', 'leatherArmor', 'woodShield'],
        slayer: { tags: ['undead', 'demon'], mult: 1.3, label: '惡魔與不死系' },
        // 人物模型：tools/cut-sprites.ps1 依 tools/sprite-src/angel-*.json 切出（第 18 節）
        sprite: {
            drawH: 48, charH: 113,
            walk:   { src: 'images/sprites/angel-walk.png',   cellW: 108, cellH: 148, frames: { down: 5, right: 5, up: 5 }, ms: 120 },
            attack: { src: 'images/sprites/angel-attack.png', cellW: 204, cellH: 153, frames: { down: 8, right: 8, up: 8 }, ms: 60 },
            cast:   { src: 'images/sprites/angel-cast.png',   cellW: 148, cellH: 149, frames: { down: 5, right: 5, up: 4 }, ms: 90 },
            hit:    { src: 'images/sprites/angel-hit.png',    cellW: 192, cellH: 128, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/angel.jpg',
    },
    demon: {
        name: '惡魔', icon: '😈',
        desc: '被深淵放逐、以生命換取力量的叛逆者。攻擊會吸血、HP 越低越兇猛，對人型與神聖系傷害 ×1.3。使用鐮刀與鋼爪。',
        base: { str: 15, dex: 13, con: 13, int: 11, wis: 8, cha: 7 },
        hp: [11, 15], mp: [2, 4], startHp: 15, startMp: 3, mr: 5, spDiv: 8, mpRegenK: 0.4,
        weapons: ['scythe', 'claw'], shield: false, start: ['reaperScythe', 'leatherArmor'],
        slayer: { tags: ['human', 'holy'], mult: 1.3, label: '人型與神聖系' },
        // 人物模型（ui-scene.js）：每個動作一張圖，列＝方向（向下／向右／向上，向左＝向右鏡像），欄＝格數
        // charH：角色在格子內的身高（所有動作都縮放到 113px，切換動作時大小一致）；drawH：地圖上顯示的身高
        sprite: {
            drawH: 48, charH: 113,
            // 四個動作都由 tools/cut-sprites.ps1 依 tools/sprite-src/demon-*.json 從原圖切出（2026-10-08 換新）
            walk:   { src: 'images/sprites/demon-walk.png',   cellW: 146, cellH: 124, frames: { down: 6, right: 6, up: 6 }, ms: 110 },
            attack: { src: 'images/sprites/demon-attack.png', cellW: 184, cellH: 145, frames: { down: 8, right: 8, up: 5 }, ms: 60 },
            cast:   { src: 'images/sprites/demon-cast.png',   cellW: 130, cellH: 144, frames: { down: 6, right: 6, up: 5 }, ms: 80 },
            hit:    { src: 'images/sprites/demon-hit.png',    cellW: 194, cellH: 124, frames: { down: 3, right: 3, up: 3 }, ms: 90 },
        },
        art: 'images/classes/demon.jpg',
    },
};
