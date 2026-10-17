// 屠龍勇者：中間的即時地圖畫面（ARCHITECTURE.md 第 17 節）（依賴 player、combat、monsters、zones、ui-panels）
// 俯視 RPG 地圖：角色在格子地圖上「上下左右」一格一格走，自己去找怪；怪物在地圖上遊走。
// 只是「看得到的那一層」：戰鬥邏輯仍由 combat.js 決定（尋怪時間、命中、傷害都不變，離線收益也不受影響）。
//   尋怪中 → 角色用 BFS 走向最近的怪
//   開打（hunt.mobs）→ 每隻圍上來的戰鬥怪都綁定一隻地圖怪（m.inst）；目標（hunt.mon）＝scene.engaged，角色走到牠旁邊，
//   其他圍上來的怪自己走到角色旁邊；每隻都顯示血條與傷害數字，範圍技能在所有圍上來的怪身上爆特效
//   傷害數字：偵測怪物／玩家 HP 變化；MISS、爆擊、升級、掉寶：讀遊戲訊息的分類
//   村莊：畫建築，點一下打開對應設施
const TILE = 32;
const MAP_W = 28, MAP_H = 28;     // 格子地圖的大小；背景圖地圖用 SCENE_BGS 的 w/h（scene.mw/mh）
const MAP_MON_COUNT = 10;        // 怪群最多 6 隻，地圖上多放幾隻讓牠們有得綁
const PLAYER_SPEED = 5.5;         // 每秒幾格
const MON_WANDER_MS = [900, 2600];

const SCENE_THEMES = {
    town:    { a: '#4b4033', b: '#463b2f', wall: '#2a231b', obst: ['🌳', '🪵', '🌳'], dens: 0.035, bg: 'village' },
    field:   { a: '#3c5a2a', b: '#365327', wall: '#1f3318', obst: ['🌲', '🌳', '🪨', '🌲'], dens: 0.09, bg: 'ruins' },
    dungeon: { a: '#2f2c2a', b: '#2a2725', wall: '#151312', obst: ['🪨', '🕯️', '⛓️', '🪨'], dens: 0.08 },
    cave:    { a: '#262c33', b: '#22282e', wall: '#0f1316', obst: ['🪨', '🕸️', '💎', '🪨'], dens: 0.09 },
    tomb:    { a: '#2e3330', b: '#292e2b', wall: '#121513', obst: ['🪦', '⚰️', '🦴', '🕯️'], dens: 0.08 },
    ivory:   { a: '#3b3644', b: '#35303e', wall: '#1c1922', obst: ['🗿', '🕯️', '📚', '🪨'], dens: 0.07 },
    pyramid: { a: '#7a6441', b: '#715c3b', wall: '#4a3a24', obst: ['🌵', '🏺', '🪨', '🌵'], dens: 0.07 },
    tower:   { a: '#2b2339', b: '#271f34', wall: '#130f1c', obst: ['🕯️', '🪨', '💀', '🕯️'], dens: 0.07, bg: 'tower' },   // 永夜之塔每層共用一張背景圖（第 52 節）
    dragon:  { a: '#3b1b14', b: '#351812', wall: '#1a0a07', obst: ['🔥', '🪨', '🦴', '🔥'], dens: 0.06 },
};
// 背景圖地圖（野外）：整張圖鋪成 w×h 格；block 是擋路的牆（格子座標 [x0,y0,x1,y1] 含頭尾），start 角色出生格
// ruins.jpg 1500×837，每格約 37.5×38 原圖像素
const SCENE_BGS = {
    ruins: {
        src: 'images/maps/ruins.jpg', w: 40, h: 22, start: [20, 11],
        block: [
            [7, 8, 11, 11], [12, 10, 16, 13], [13, 4, 17, 7], [19, 3, 21, 4], [20, 5, 26, 8], [25, 1, 30, 8],
            [25, 9, 31, 12], [30, 13, 34, 16], [20, 13, 23, 18], [19, 17, 22, 20], [24, 17, 26, 20], [36, 10, 38, 15],
        ],
    },
    // 村莊：使用者提供的中世紀村莊俯視圖（1755×896，中間石板廣場＋噴泉），鋪成 30×15 格；
    // npcs：使用者 2026-10-11 規劃的商人位置（旅館＝左邊房子前、商店＝紅白攤位南邊、倉庫＝噴泉南邊、鍛造＝右下茅草屋前、回收＝兩個白色棚子前），點 NPC 或名牌打開設施
    // （TOWN_HOUSES 只在沒有背景圖時使用）
    // walk：可以走的範圍（其他格子都擋住）＝廣場、往南的泥土路、石橋、教堂旁北路、往港口的東側草地；
    // block 再擋掉 walk 裡面的噴泉、市集攤位、推車
    village: {
        src: 'images/maps/village.webp', w: 30, h: 15, start: [13, 10],
        walk: [[8, 6, 19, 10], [10, 10, 20, 11], [16, 12, 21, 13], [12, 2, 14, 5], [19, 7, 22, 9], [5, 7, 7, 8], [21, 11, 23, 11]],
        npcs: [{ role: '旅館', x: 5, y: 8 }, { role: '商店', x: 8, y: 10 }, { role: '倉庫', x: 12, y: 9 }, { role: '鍛造', x: 23, y: 11 }, { role: '回收', x: 16, y: 7 }],
        block: [[12, 7, 14, 8], [8, 8, 10, 9], [15, 6, 17, 6], [17, 7, 18, 7], [17, 9, 18, 9]],
    },
    // 永夜之塔（原傲慢之塔）通用地圖：使用者提供的塔內大廳（2000×989 tower.jpg，中間魔法陣廣場、四條斜走道通往四角螺旋梯），鋪成 40×20 格（2026-10-18，第 52 節）
    // walk：魔法陣廣場、北邊走廊、東西走道、左右上方斜陽台、左右下方往螺旋梯的斜走道；下方低一層的墓室與欄杆外都不能走
    tower: {
        src: 'images/maps/tower.jpg', w: 40, h: 20, start: [20, 10],
        walk: [
            [19, 2, 21, 6], [13, 7, 27, 8], [11, 9, 29, 11], [13, 12, 27, 13], [15, 14, 25, 14],
            [3, 9, 10, 10], [30, 9, 37, 10],
            [9, 4, 13, 6], [12, 6, 14, 7], [27, 4, 31, 6], [26, 6, 28, 7],
            [10, 12, 13, 14], [7, 14, 11, 15], [4, 16, 8, 17], [2, 18, 5, 18],
            [27, 12, 30, 14], [29, 14, 33, 15], [32, 16, 36, 17], [35, 18, 38, 18],
        ],
        block: [],
    },
    // 灰燼村：使用者提供的焚毀村落圖（2000×1116 → 1755×979 ash.webp），鋪成 30×17 格；中間泥濘大路往南展開成空地，兩側是燒毀的房子
    // 商人位置由 Claude 先排（使用者可再給配置圖調整）
    ash: {
        src: 'images/maps/ash.webp', w: 30, h: 17, start: [16, 12],
        walk: [[13, 3, 17, 6], [11, 6, 19, 9], [8, 9, 24, 15]],
        block: [],
        npcs: [{ role: '旅館', x: 11, y: 8 }, { role: '商店', x: 9, y: 11 }, { role: '倉庫', x: 14, y: 7 }, { role: '鍛造', x: 19, y: 8 }, { role: '回收', x: 22, y: 11 }],
    },
    // 暗金城：使用者提供的雨夜哥德城市廣場（2000×1116 → 1755×979 darkgold.webp），30×17 格；圖上已畫好人物，
    // npcs 的 painted 表示直接用圖上的人（不另外畫圖示），h＝名牌在腳底格上方幾格（對到頭頂）
    darkgold: {
        src: 'images/maps/darkgold.webp', w: 30, h: 17, start: [12, 15],
        walk: [[2, 13, 28, 15], [13, 11, 19, 12]],
        block: [[15, 13, 18, 14]],
        npcs: [
            { role: '商店', x: 1, y: 14, painted: true, h: 1.9 },    // 左邊攤位坐著的兜帽商人
            { role: '倉庫', x: 5, y: 15, painted: true, h: 3 },      // 左前方黑甲騎士
            { role: '傳送師', x: 8, y: 15, painted: true, h: 2.8 },  // 兜帽劍士
            { role: '旅館', x: 20, y: 15, painted: true, h: 2.6 },   // 右邊修士
            { role: '回收', x: 24, y: 15, painted: true, h: 2.8 },   // 右邊兜帽女子
            { role: '鍛造', x: 27, y: 15, painted: true, h: 2.7 },   // 右下打鐵匠
        ],
    },
    // 永夜王都：使用者提供的長條全景雨夜王都（2000×553 aden.webp），鋪成 61×17 格＝比畫面寬的「大型地圖」，PC、手機都會左右捲動；
    // 左邊市集大街、中間國王雕像廣場、右邊鐵匠區；NPC 用圖上畫好的人物（painted）
    aden: {
        src: 'images/maps/aden.webp', w: 61, h: 17, start: [24, 14],
        walk: [[4, 14, 48, 15], [9, 12, 30, 13], [31, 13, 36, 15], [40, 14, 58, 15]],
        block: [[36, 12, 41, 14]],
        npcs: [
            { role: '倉庫', x: 3, y: 15, painted: true, h: 4.6 },    // 最左邊的鎧甲衛兵
            { role: '商店', x: 9, y: 14, painted: true, h: 2.6 },    // 市集攤位前的兜帽商人
            { role: '旅館', x: 16, y: 14, painted: true, h: 2.7 },   // 大街中間的修士
            { role: '傳送師', x: 44, y: 14, painted: true, h: 3.2 }, // 雕像旁的兜帽術士
            { role: '回收', x: 49, y: 14, painted: true, h: 2.8 },   // 鐵匠區的工匠
            { role: '鍛造', x: 56, y: 15, painted: true, h: 4.2 },   // 右下打鐵匠
        ],
    },
    // 大地圖（2026-10-18 第 1 期，ARCHITECTURE.md 第 45、47、48 節）：使用者用 AI 生成的場景＋森林／雪地／沙漠填充，tools/bigmap/build-map.ps1 拼成 4512×2816＝141×88 格（1 格 32px，原圖 1:1）
    // 走得到的範圍照 tools/bigmap/walk.json；big：鏡頭跟著角色捲動、離角色太遠的怪收掉、有小地圖；
    // regions：區域中心格、對應的地圖 zone、從村莊傳送過來的出生格 start；角色離哪個中心最近就算在哪一區
    // 2026-10-18 使用者改成「5 個真的地圖合併」：海灘＝低語海岸、草原與古泉＝迷霧古林、廢村＝沉船海灣、沼澤＝紫霧遺跡；
    // 走進別區就自動換成那個地圖（怪物、等級、掉落跟著換，sceneEnterZone），這幾個地圖共用同一個畫面（sceneKey 'zone:wild'）
    wild: {
        src: 'images/maps/wild.jpg?v=3', mini: 'images/maps/wild-mini.jpg?v=3', occ: 'images/maps/wild-occ.png', w: 141,   // ?v=：圖改過就加 1（SW 會先給快取的舊圖）
        h: 112, start: [63, 78], big: true,   // 2026-10-18 往南加一排（第 49 節）：腐朽礦坑・上層／沉眠龍窟／腐朽礦坑・深層，88 → 112 列
        // rect：這一區的範圍（格子 [x0,y0,x1,y1]，依序第一個符合的；沒有符合的才用最近的中心）
        regions: [
            { zone: 'forgottenIsle', x: 22, y: 12, start: [20, 14], rect: [0, 0, 49, 21] },
            { zone: 'elvenForest', x: 70, y: 15, rect: [50, 0, 81, 21] },   // 古泉：迷霧古林的另一區（傳送出生在草原）
            { zone: 'orenSnow', x: 105, y: 15, start: [92, 14], rect: [82, 0, 140, 32] },        // 2026-10-18 往東擴大：古泉東邊的雪原
            { zone: 'pirateIsle', x: 44, y: 34, start: [40, 34], rect: [0, 22, 69, 42] },
            { zone: 'dragonValley', x: 94, y: 50, start: [80, 52], rect: [70, 33, 140, 63] },   // 骨骸綠洲＋東邊沙丘
            { zone: 'elvenForest', x: 46, y: 54, start: [46, 52], rect: [0, 43, 69, 64] },
            { zone: 'pyramid', x: 116, y: 76, start: [97, 84], rect: [91, 63, 140, 87] },       // 金字塔（地監黃沙王陵的外圍）
            { zone: 'island', x: 63, y: 79, start: [63, 78], rect: [0, 65, 90, 87] },
            { zone: 'gludio1', x: 24, y: 100, start: [30, 101], rect: [0, 88, 47, 111] },        // 南排：礦坑上層（海灘往南的林道進來）
            { zone: 'sleepingCave', x: 70, y: 104, start: [58, 100], rect: [48, 88, 93, 111] },  // 龍窟（左上、右上兩個洞口）
            { zone: 'gludio2', x: 118, y: 102, start: [111, 101], rect: [94, 88, 140, 111] },   // 礦坑深層（同一張圖左右翻轉、調暗；北邊接金字塔）
        ],
        walk: [
            [4, 5, 8, 8], [7, 8, 12, 11], [10, 10, 18, 13], [15, 12, 22, 16], [18, 15, 26, 19], [22, 18, 30, 21], [26, 20, 33, 24],
            [26, 16, 34, 20], [34, 16, 46, 21], [5, 11, 10, 15],
            [53, 8, 56, 12], [54, 12, 57, 17], [56, 17, 59, 21], [57, 21, 61, 24], [62, 22, 64, 33], [59, 17, 66, 19],
            [65, 14, 80, 17], [68, 17, 76, 21], [44, 16, 56, 18],
            [26, 24, 32, 28], [28, 27, 38, 32], [32, 31, 45, 36], [38, 35, 55, 39], [44, 38, 66, 42], [36, 26, 45, 34],
            [44, 33, 62, 40], [60, 32, 67, 41],
            [24, 42, 68, 63],
            [48, 63, 56, 70], [44, 64, 49, 68],
            [48, 69, 63, 71], [48, 71, 52, 87], [53, 76, 61, 81], [60, 69, 67, 74], [61, 74, 67, 76], [59, 76, 68, 80],
            [60, 80, 72, 83], [62, 83, 79, 87], [71, 85, 84, 87], [63, 66, 85, 68], [62, 67, 67, 70],
            [85, 5, 97, 21], [97, 2, 140, 32], [78, 15, 86, 19],                                  // 雪原、古泉往雪原
            [100, 33, 140, 64], [74, 44, 114, 62], [66, 56, 76, 58],                              // 沙丘、骨骸綠洲、草原往綠洲
            [92, 63, 140, 68], [92, 68, 102, 87], [100, 80, 140, 87], [130, 66, 140, 82], [103, 68, 130, 81],   // 金字塔四周與建築群（2026-10-18 使用者要求水池、建築群也能走）
            [0, 88, 47, 111], [40, 86, 52, 89],                                                   // 礦坑上層、海灘林道往南
            [48, 88, 53, 95], [53, 92, 57, 96], [52, 95, 89, 110], [84, 86, 93, 92], [84, 92, 88, 97],   // 龍窟：左上洞口、地面、右上洞口（接海灘／金字塔）
            [96, 88, 140, 111], [93, 88, 96, 90],                                                 // 礦坑深層、龍窟右上洞口往深層
        ],
        block: [
            [16, 8, 24, 9], [23, 10, 31, 12], [25, 13, 27, 15], [36, 16, 37, 18],
            [71, 13, 79, 14], [78, 13, 80, 16],
            [45, 23, 61, 32], [42, 27, 44, 29], [56, 34, 58, 36],
            [56, 52, 68, 54], [55, 54, 56, 54], [49, 57, 51, 58], [47, 58, 49, 59], [45, 59, 48, 61], [44, 61, 46, 63],
            [55, 75, 58, 77], [61, 78, 63, 80],
            [15, 90, 30, 99], [9, 93, 14, 98], [0, 98, 7, 103], [34, 94, 47, 103], [20, 108, 23, 111],   // 礦坑上層：石拱與碎石堆、礦車、左右岩台、礦井
            [64, 94, 78, 103],                                                                         // 龍窟：沉睡的龍
            [111, 90, 126, 99], [127, 93, 132, 98], [134, 98, 140, 103], [94, 95, 107, 104], [118, 108, 121, 111],   // 礦坑深層（上層左右翻轉）
        ],
    },
};
// 各村莊用哪張背景圖（沒寫的用低語港 village）
const TOWN_BG = { gludio: 'ash', giran: 'darkgold', aden: 'aden' };

// 村莊 NPC：站在廣場上，頭上名牌顯示「名字＋功能」，點 NPC 或名牌打開設施；names 依村莊 id
const TOWN_NPCS = [
    { role: '商店',  icon: '👩‍💼', x: 12, y: 12, act: () => openTownSub('shop'),
      names: { talking: '艾琳', gludio: '雷文', giran: '薩拉', aden: '塞琳' } },
    { role: '回收',  icon: '🧔', x: 16, y: 12, act: () => openTownSub('sell'),
      names: { talking: '巴克', gludio: '菲茲', giran: '馬可', aden: '海克' } },
    { role: '旅館',  icon: '👩‍🍳', x: 18, y: 13, act: () => openTownSub('inn'),
      names: { talking: '莫莉', gludio: '蘿絲', giran: '貝拉', aden: '艾瑪' } },
    { role: '倉庫',  icon: '👷', x: 10, y: 13, act: () => openTownSub('storage'), prop: '📦',
      names: { talking: '杜克', gludio: '柏恩', giran: '歐文', aden: '葛雷' } },
    { role: '鍛造',  icon: '🧑‍🏭', x: 17, y: 15, act: () => openTownSub('craft'), prop: '⚒️',
      names: { talking: '葛蘭', gludio: '托爾', giran: '布洛克', aden: '巴恩' } },
    { role: '傳送師', icon: '🧙‍♀️', x: 14, y: 16, act: () => switchTab('map'),
      names: { talking: '露娜', gludio: '希雅', giran: '伊芙', aden: '星語者' } },
    { role: '任務',  icon: '🧓', x: 11, y: 15, act: () => switchTab('quest'),
      names: { talking: '賽恩長老', gludio: '亞瑟隊長', giran: '諾亞祭司', aden: '騎士團長' } },
];
// 村莊房屋（格子座標 x, y, 寬, 高；整塊擋路），畫成石牆＋石板屋頂
const TOWN_HOUSES = [[5, 9, 4, 3], [9, 6, 4, 3], [16, 6, 4, 3], [20, 9, 4, 3], [5, 17, 4, 3], [20, 17, 4, 3], [12, 20, 5, 3]];

// 怪物模型（2026-10-12，使用者提供的四張動作表，tools/monsters/cut2.py 切出）：images/monsters/怪物id.png
// 6 列＝走路 正面／側面朝右／背面、攻擊 正面／側面／背面；每列 n[列] 格動畫，每格 cw×ch；body＝正面走路第一格身高（縮放基準），size＝畫面身高（預設 42、大型 62）
// 沒有模型的怪照舊畫 emoji
const MON_SPRITES = {
    skeleton: { cw: 46, ch: 65, body: 56, n: [2, 2, 2, 2, 2, 2] },
    skeletonArcher: { cw: 44, ch: 64, body: 56, n: [2, 2, 2, 2, 2, 2] },
    skeletonAxe: { cw: 41, ch: 76, body: 69, n: [1, 1, 1, 2, 2, 2] },
    ghoul: { cw: 47, ch: 56, body: 50, n: [1, 1, 1, 2, 2, 2] },
    spartoi: { cw: 35, ch: 71, body: 65, n: [2, 2, 2, 2, 2, 2] },
    baphomet: { cw: 83, ch: 92, body: 75, n: [1, 1, 1, 1, 1, 1] },
    goblin: { cw: 26, ch: 39, body: 33, n: [4, 4, 4, 5, 5, 5] },
    orcWarrior: { cw: 37, ch: 46, body: 42, n: [5, 5, 5, 6, 6, 6] },
    gandiOrc: { cw: 27, ch: 47, body: 42, n: [5, 5, 5, 6, 6, 6] },
    orcxOrc: { cw: 31, ch: 49, body: 44, n: [5, 5, 5, 6, 6, 6] },
    lizardman: { cw: 33, ch: 42, body: 38, n: [5, 5, 5, 6, 6, 6] },
    beholder: { cw: 39, ch: 43, body: 38, n: [5, 5, 5, 4, 4, 4] },
    floatingEye: { cw: 20, ch: 19, body: 15, n: [2, 2, 2, 1, 1, 1], size: 26 },
    castor: { cw: 38, ch: 52, body: 47, n: [5, 5, 5, 2, 2, 2] },
    orc: { cw: 46, ch: 62, body: 55, n: [1, 1, 1, 1, 1, 1] },
    orcArcher: { cw: 43, ch: 64, body: 60, n: [1, 1, 1, 1, 1, 1] },
    dwarf: { cw: 41, ch: 52, body: 48, n: [1, 1, 1, 1, 1, 1] },
    wolf: { cw: 52, ch: 50, body: 46, n: [1, 1, 1, 1, 1, 1] },
    werewolf: { cw: 50, ch: 63, body: 46, n: [1, 1, 1, 1, 1, 1] },
    lycan: { cw: 63, ch: 64, body: 53, n: [1, 1, 1, 1, 1, 1] },
    drake: { cw: 63, ch: 58, body: 54, n: [1, 1, 1, 1, 1, 1] },
    blackKnight: { cw: 48, ch: 67, body: 63, n: [1, 1, 1, 1, 1, 1] },
    giantSpider: { cw: 62, ch: 49, body: 45, n: [1, 1, 1, 1, 1, 1] },
    dwarfWarrior: { cw: 34, ch: 42, body: 37, n: [3, 3, 3, 4, 4, 4] },
    forestBear: { cw: 40, ch: 41, body: 36, n: [3, 3, 3, 4, 4, 4] },
    treant: { cw: 27, ch: 53, body: 44, n: [3, 3, 3, 3, 3, 3] },
    elderTreant: { cw: 38, ch: 61, body: 45, n: [3, 3, 3, 3, 3, 3] },
    zombie: { cw: 36, ch: 47, body: 43, n: [3, 3, 3, 3, 3, 3] },
    stoneGolem: { cw: 46, ch: 50, body: 39, n: [3, 3, 3, 3, 3, 3] },
    caveBat: { cw: 40, ch: 23, body: 18, n: [3, 3, 3, 4, 4, 4], size: 26 },
    ghast: { cw: 36, ch: 44, body: 38, n: [3, 3, 3, 4, 4, 4] },
    darkElfScout: { cw: 33, ch: 45, body: 41, n: [3, 3, 1, 4, 4, 4] },
    wakingDrake: { cw: 61, ch: 39, body: 35, n: [3, 3, 3, 3, 3, 3] },
    giantAnt: { cw: 42, ch: 34, body: 27, n: [4, 4, 4, 4, 4, 4], size: 44 },
    pirate: { cw: 48, ch: 62, body: 57, n: [2, 2, 2, 3, 3, 3] },
    pirateGunner: { cw: 54, ch: 64, body: 59, n: [2, 2, 2, 3, 3, 3] },
    giantCrab: { cw: 63, ch: 41, body: 35, n: [2, 2, 2, 3, 3, 3], size: 30 },
    drownedSailor: { cw: 57, ch: 58, body: 51, n: [2, 2, 2, 3, 3, 3] },
    hellhound: { cw: 61, ch: 52, body: 42, n: [2, 2, 2, 4, 4, 4] },
    lamia: { cw: 67, ch: 69, body: 62, n: [2, 2, 2, 3, 3, 3] },
    ivoryMage: { cw: 49, ch: 63, body: 58, n: [2, 2, 2, 3, 3, 3] },
    ivoryGuard: { cw: 38, ch: 66, body: 61, n: [2, 2, 2, 3, 3, 3] },
    dvLizard: { cw: 45, ch: 48, body: 42, n: [1, 1, 1, 1, 1, 1] },
    cerberus: { cw: 60, ch: 55, body: 51, n: [1, 1, 1, 1, 1, 1] },
    wyvernling: { cw: 53, ch: 55, body: 41, n: [1, 1, 1, 1, 1, 1] },
    boneDragonKnight: { cw: 42, ch: 55, body: 51, n: [1, 1, 1, 1, 1, 1] },
    wyvern: { cw: 64, ch: 64, body: 51, n: [1, 1, 1, 1, 1, 1] },
    mummy: { cw: 44, ch: 95, body: 90, n: [1, 1, 1, 1, 1, 1] },
    sandScorpion: { cw: 97, ch: 98, body: 94, n: [1, 1, 1, 1, 1, 1] },
    sphinx: { cw: 105, ch: 91, body: 87, n: [1, 1, 1, 1, 1, 1] },
    anubis: { cw: 56, ch: 109, body: 105, n: [1, 1, 1, 1, 1, 1] },
    snowWolf: { cw: 85, ch: 87, body: 67, n: [1, 1, 1, 1, 1, 1] },
    yeti: { cw: 79, ch: 102, body: 98, n: [1, 1, 1, 1, 1, 1] },
    iceGolem: { cw: 89, ch: 103, body: 98, n: [1, 1, 1, 1, 1, 1] },
    frostWitch: { cw: 71, ch: 98, body: 93, n: [1, 1, 1, 1, 1, 1] },
    salamander: { cw: 101, ch: 56, body: 50, n: [1, 1, 1, 1, 1, 1], size: 34 },
    fireSpirit: { cw: 59, ch: 86, body: 75, n: [1, 1, 1, 1, 1, 1] },
    lavaGolem: { cw: 85, ch: 104, body: 94, n: [1, 1, 1, 1, 1, 1] },
    flameKnight: { cw: 106, ch: 110, body: 104, n: [1, 1, 1, 1, 1, 1] },
    ifrit: { cw: 84, ch: 79, body: 59, n: [1, 1, 1, 1, 1, 1] },
    ancientGiant: { cw: 104, ch: 104, body: 98, n: [1, 1, 1, 1, 1, 1] },
    harpy: { cw: 94, ch: 90, body: 76, n: [1, 1, 1, 1, 1, 1] },
    forgottenKnight: { cw: 75, ch: 105, body: 101, n: [1, 1, 1, 1, 1, 1] },
    chimera: { cw: 90, ch: 105, body: 94, n: [1, 1, 1, 1, 1, 1] },
    giantSkeleton: { cw: 79, ch: 109, body: 103, n: [1, 1, 1, 1, 1, 1] },
    tombGuardian: { cw: 91, ch: 99, body: 95, n: [1, 1, 1, 1, 1, 1] },
    necromancer: { cw: 61, ch: 97, body: 92, n: [1, 1, 1, 1, 1, 1] },
    boneDragon: { cw: 255, ch: 163, body: 159, n: [1, 1, 1, 1, 1, 1], size: 56 },
    osiris: { cw: 289, ch: 205, body: 201, n: [1, 1, 1, 1, 1, 1] },
    iceGiantKing: { cw: 176, ch: 205, body: 201, n: [1, 1, 1, 1, 1, 1] },
    forgottenKing: { cw: 202, ch: 219, body: 215, n: [1, 1, 1, 1, 1, 1] },
    giantKingSpirit: { cw: 184, ch: 203, body: 199, n: [1, 1, 1, 1, 1, 1] },
    pirateKing: { cw: 50, ch: 70, body: 66, n: [2, 2, 2, 3, 3, 3] },
    demon: { cw: 59, ch: 53, body: 49, n: [2, 2, 2, 3, 3, 3] },
    // 四大龍（2026-10-16 起，tools/monsters/cut-sheet.ps1＋specH.json 切出；走路 4 格、攻擊 8／6／8 格）
    antharas: { cw: 109, ch: 82, body: 72, n: [4, 4, 4, 8, 6, 8], size: 80 },
    fafurion: { cw: 118, ch: 91, body: 74, n: [4, 4, 4, 8, 6, 8], size: 80 },
    lindvior: { cw: 128, ch: 105, body: 88, n: [4, 3, 4, 3, 6, 8], size: 80 },   // 風龍：側面走路 3 格、正面攻擊 3 格（原圖中間是大張立繪）
};
function monSpriteImg(mid) { return mid && MON_SPRITES[mid] ? spriteImage(`images/monsters/${mid}.png`) : null; }

let scene = null;   // { key, grid, theme, pl:{x,y,rx,ry,path,dir,lunge}, mons:[], engaged, floats:[], ... }
let sceneRaf = 0;

// 人物模型圖片快取（classes.js 的 sprite.src）；還沒載入完成時先用職業圖示
const spriteCache = {};
function spriteImage(src) {
    let img = spriteCache[src];
    if (!img) { img = spriteCache[src] = new Image(); img.src = src + '?v=' + GAME_VERSION; }
    return img.complete && img.naturalWidth ? img : null;
}

function openTownSub(sub) { townSub = sub; switchTab('town'); }
// 點 NPC：打開這位 NPC 專用的對話框（只有他的功能，標題顯示名字）
function npcOpen(n) {
    n.act();
    if (n.role && tabOpen('town')) { townNpcNow = { name: (n.names && n.names[player.loc.id]) || n.role, role: n.role }; renderTabs(); renderPanel(); }
}

// 目前村莊要畫的 NPC：有背景圖的村莊用 SCENE_BGS 的 npcs（只換位置，名字、功能沿用 TOWN_NPCS），沒有背景圖用 TOWN_NPCS
function townNpcList(bg) {
    if (!bg) return TOWN_NPCS;
    return (bg.npcs || []).map(n => ({ ...TOWN_NPCS.find(t => t.role === n.role), painted: true, h: 0.6, ...n }));   // 背景圖村莊不畫 NPC 圖示，只留名牌（2026-10-12 使用者要求）
}

// ───────── 地圖產生 ─────────
function seededRand(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

function sceneKey() {
    if (player.loc.type === 'town') return 'town:' + player.loc.id;
    const z = currentZone();
    if (z && z.bg && SCENE_BGS[z.bg] && SCENE_BGS[z.bg].big) return 'zone:' + z.bg;   // 大地圖：幾個地圖共用同一個畫面，換區不重建
    return `zone:${player.loc.id}:${player.loc.floor || 0}`;
}

function themeFor() {
    if (player.loc.type === 'town') return { ...SCENE_THEMES.town, bg: TOWN_BG[player.loc.id] || 'village' };
    const z = currentZone();
    if (z.bg && SCENE_BGS[z.bg] && SCENE_BGS[z.bg].big) return { ...SCENE_THEMES.field, bg: z.bg };   // 大地圖（含地監黃沙王陵的外圍）
    if (z.type === 'dragon') return SCENE_THEMES.dragon;
    if (z.type === 'tower') return SCENE_THEMES.tower;
    if (z.type === 'field') return z.bg ? { ...SCENE_THEMES.field, bg: z.bg } : SCENE_THEMES.field;   // z.bg：這張野外用自己的背景圖（大地圖）
    return SCENE_THEMES[z.scene] || SCENE_THEMES.dungeon;
}

function buildScene() {
    const key = sceneKey(), theme = themeFor(), rnd = seededRand(hashStr(key));
    const sp = CLASSES[player.cls].sprite;   // 先載入這個職業所有動作圖
    if (sp) ['walk', 'attack', 'cast', 'hit'].forEach(a => { if (sp[a]) spriteImage(sp[a].src); });
    const bg = theme.bg ? SCENE_BGS[theme.bg] : null;
    if (bg) { spriteImage(bg.src); if (bg.mini) spriteImage(bg.mini); if (bg.occ) occData(bg.occ); }
    const zz = player.loc.type === 'zone' ? currentZone() : null;
    if (zz && zz.mons) zz.mons.forEach(monSpriteImg);
    const mw = bg ? bg.w : MAP_W, mh = bg ? bg.h : MAP_H;
    // 大地圖：從村莊傳送過來時出生在這個地圖對應區域的 start
    const zr = bg && bg.regions && player.loc.type === 'zone' && bg.regions.find(r => r.zone === player.loc.id && r.start);
    const st = zr ? zr.start : bg && bg.start;
    const cx = st ? st[0] : Math.floor(mw / 2), cy = st ? st[1] : Math.floor(mh / 2);
    const grid = [];   // 0 地板、1 牆、2 障礙物（畫 emoji）、3 建築
    for (let y = 0; y < mh; y++) {
        grid.push([]);
        for (let x = 0; x < mw; x++) {
            const edge = x === 0 || y === 0 || x === mw - 1 || y === mh - 1;
            const nearCenter = Math.abs(x - cx) < 3 && Math.abs(y - cy) < 3;
            grid[y].push(edge ? 1 : (!bg && !nearCenter && rnd() < theme.dens ? 2 : 0));
        }
    }
    if (bg && bg.walk) for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        if (!bg.walk.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)) grid[y][x] = 1;
    }
    if (bg) for (const [x0, y0, x1, y1] of bg.block) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = 1;
    const deco = {};   // 障礙物用哪個 emoji
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (grid[y][x] === 2) deco[x + ',' + y] = theme.obst[Math.floor(rnd() * theme.obst.length)];
    const shade = [];  // 地板深淺
    for (let y = 0; y < mh; y++) { shade.push([]); for (let x = 0; x < mw; x++) shade[y].push(rnd() < 0.5); }
    if (player.loc.type === 'town' && bg) for (const b of townNpcList(bg)) grid[b.y][b.x] = 3;   // NPC 站的格子不能走
    if (player.loc.type === 'town' && !bg) {   // 沒有背景圖時才用畫出來的房屋與 NPC
        for (const b of TOWN_NPCS) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (grid[b.y + dy][b.x + dx] === 2) grid[b.y + dy][b.x + dx] = 0; grid[b.y][b.x] = 3; }
        for (const [hx, hy, hw, hh] of TOWN_HOUSES) for (let y = hy; y < hy + hh; y++) for (let x = hx; x < hx + hw; x++) grid[y][x] = 4;
        // 廣場（中心 9 格內）不放樹
        for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (grid[y][x] === 2 && Math.hypot(x - cx, y - cy) < 9) grid[y][x] = 0;
    }
    const z = player.loc.type === 'zone' ? currentZone() : null;
    scene = {
        key, theme, grid, deco, shade, bg, mw, mh, tint: z && !(bg && bg.big) && z.tint,   // 大地圖本身就是各區的畫面，不疊地區色調
        pl: { x: cx, y: cy, rx: cx, ry: cy, path: [], dir: 'down', lunge: null, idleCd: 1500 },
        mons: [], engaged: null, floats: [], effects: [],
        lastSeq: logSeq, lastPlayerHp: player.hp, critNext: false, spawnCd: 0, w: 0, h: 0,
        cam: { x: cx * TILE, y: cy * TILE }, moveMark: null,
    };
    if (bg && bg.big && bg.regions) scene.gates = bg._gates || (bg._gates = bigMapGates(grid, bg.regions, mw, mh));
}

// 大地圖：格子屬於哪一區（rect 依序第一個符合的；都不符合用最近的中心）
function bigRegionAt(rs, x, y) {
    return rs.find(q => q.rect && x >= q.rect[0] && y >= q.rect[1] && x <= q.rect[2] && y <= q.rect[3])
        || rs.reduce((a, b) => (Math.hypot(b.x - x, b.y - y) < Math.hypot(a.x - x, a.y - y) ? b : a));
}
// 路引（2026-10-18，第 50 節）：自動找出兩個不同地圖相接的可走格子，每一段交界在兩邊各放一個箭頭，指向另一個地圖
// 回傳 [{ x, y, ang（弧度，箭頭方向）, from, to（zone id） }]
function bigMapGates(grid, rs, mw, mh) {
    const zoneOf = [];
    for (let y = 0; y < mh; y++) { zoneOf.push([]); for (let x = 0; x < mw; x++) zoneOf[y].push(grid[y][x] === 0 ? bigRegionAt(rs, x, y).zone : null); }
    const edge = new Map();   // 'x,y,往哪個地圖' → { x, y, to, dx, dy }：這格旁邊就是別的地圖（一格可能同時接兩個地圖）
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        const a = zoneOf[y][x];
        if (!a) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const b = zoneOf[y + dy] && zoneOf[y + dy][x + dx], k = x + ',' + y + ',' + b;
            if (b && b !== a && !edge.has(k)) edge.set(k, { x, y, to: b, dx, dy });
        }
    }
    const gates = [], used = new Set();
    for (const [k, e] of edge) {
        if (used.has(k)) continue;
        const from = zoneOf[e.y][e.x], grp = [], q = [e]; used.add(k);   // 同一段交界（同一個地圖往同一個地圖、2 格內相連）
        while (q.length) {
            const c = q.pop(); grp.push(c);
            for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
                const nk = (c.x + dx) + ',' + (c.y + dy) + ',' + e.to, n = edge.get(nk);
                if (n && !used.has(nk) && zoneOf[n.y][n.x] === from) { used.add(nk); q.push(n); }
            }
        }
        let sx = 0, sy = 0, vx = 0, vy = 0;
        for (const c of grp) { sx += c.x; sy += c.y; vx += c.dx; vy += c.dy; }
        sx /= grp.length; sy /= grp.length;
        const ang = Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) * (Math.PI / 4), ux = Math.round(Math.cos(ang)), uy = Math.round(Math.sin(ang));   // 箭頭只用 8 個方向
        let best = grp[0];   // 交界上離中心最近的格子，往自己這一側退 2 格（兩邊的箭頭才不會疊在一起）
        for (const c of grp) if (Math.hypot(c.x - sx, c.y - sy) < Math.hypot(best.x - sx, best.y - sy)) best = c;
        let gx = best.x, gy = best.y;
        for (let i = 0; i < 2; i++) { const nx = gx - ux, ny = gy - uy; if (zoneOf[ny] && zoneOf[ny][nx] === from) { gx = nx; gy = ny; } }
        gates.push({ x: gx, y: gy, ang, from, to: e.to, stack: 0 });
    }
    // 同一個地圖 3 格內有好幾個路引（三岔口）：後面的往上疊，名牌才不會重疊
    gates.forEach((g, i) => { g.stack = gates.slice(0, i).filter(o => o.from === g.from && Math.abs(o.x - g.x) + Math.abs(o.y - g.y) <= 3).length; });
    return gates;
}
// 畫一個發光箭頭（中心 cx,cy、方向 ang、大小 s）；路引用
function drawGlowArrow(ctx, cx, cy, ang, s, color, glow) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang);
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(40,24,0,0.9)'; ctx.lineWidth = Math.max(1, s / 8);
    ctx.beginPath();
    ctx.moveTo(s, 0); ctx.lineTo(0, -s * 0.8); ctx.lineTo(0, -s * 0.35); ctx.lineTo(-s, -s * 0.35);
    ctx.lineTo(-s, s * 0.35); ctx.lineTo(0, s * 0.35); ctx.lineTo(0, s * 0.8); ctx.closePath();
    ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
    ctx.restore();
}
// 大地圖上的路引：地上一圈光暈＋往目標方向來回飄的箭頭＋地圖名與建議等級（等級太高顯示紅色）
function drawGates(ctx, camX, camY, W, H) {
    if (!scene.gates) return;
    const pulse = 0.5 + 0.5 * Math.sin(gameNow / 300);
    for (const g of scene.gates) {
        const cx = g.x * TILE - camX + TILE / 2, cy = g.y * TILE - camY + TILE / 2 - g.stack * 44;
        if (cx < -80 || cy < -60 || cx > W + 80 || cy > H + 60) continue;
        const z = ZONE_BY_ID[g.to], hard = z && player.lv < z.lv[0] - 5;
        const col = hard ? '#ff7a5a' : '#ffd86a';
        ctx.fillStyle = hard ? `rgba(255,90,60,${0.12 + 0.12 * pulse})` : `rgba(255,210,90,${0.12 + 0.12 * pulse})`;
        ctx.beginPath(); ctx.ellipse(cx, cy + 6, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
        const b = 5 * Math.sin(gameNow / 220);
        drawGlowArrow(ctx, cx + Math.cos(g.ang) * b, cy + Math.sin(g.ang) * b, g.ang, 13, col, 10 + 10 * pulse);
        if (z) {
            ctx.textAlign = 'center';
            drawLabel(ctx, z.name, cx, cy - 24, col);
            ctx.font = '9px sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
            const sub = `Lv.${z.lv[0]}～${z.lv[1]}`;
            ctx.strokeText(sub, cx, cy - 12); ctx.fillStyle = '#e8dcc0'; ctx.fillText(sub, cx, cy - 12); ctx.lineWidth = 1;
        }
    }
}

function freeTile(x, y) {
    if (!scene || x < 0 || y < 0 || x >= scene.mw || y >= scene.mh) return false;
    if (scene.grid[y][x] !== 0) return false;
    if (scene.pl.x === x && scene.pl.y === y) return false;
    return !scene.mons.some(m => m.x === x && m.y === y && !m.dead);
}

// BFS：從 (sx,sy) 走到任一目標格旁邊（上下左右相鄰）的最短路徑
function findPath(sx, sy, tx, ty, adjacent) {
    const mw = scene.mw, key = (x, y) => y * mw + x;
    const prev = new Map([[key(sx, sy), -1]]);
    const q = [[sx, sy]];
    const goal = (x, y) => adjacent ? Math.abs(x - tx) + Math.abs(y - ty) === 1 : (x === tx && y === ty);
    while (q.length) {
        const [x, y] = q.shift();
        if (goal(x, y)) {
            const path = [];
            let k = key(x, y);
            while (k !== key(sx, sy)) { path.unshift([k % mw, Math.floor(k / mw)]); k = prev.get(k); }
            return path;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, nk = key(nx, ny);
            if (prev.has(nk) || !freeTileFor(nx, ny, tx, ty)) continue;
            prev.set(nk, key(x, y));
            q.push([nx, ny]);
            if (prev.size > (scene.bg && scene.bg.big ? 6000 : 1000)) return [];   // 大地圖：點小地圖可以走很遠
        }
    }
    return [];
}
function freeTileFor(x, y) {
    if (x < 0 || y < 0 || x >= scene.mw || y >= scene.mh) return false;
    return scene.grid[y][x] === 0 && !scene.mons.some(m => m.x === x && m.y === y && !m.dead);
}

// 地圖上看得到的怪（外觀），依地點與等級挑
function visualMonster() {
    const z = currentZone();
    if (!z || z.type === 'dragon') return null;
    if (z.type === 'tower') {
        const g = Math.min(9, Math.floor((player.loc.floor - 1) / 10));
        return { icon: TOWER_ICONS[g], name: TOWER_THEMES[g][0], mid: null };
    }
    let pool = z.mons.filter(id => MONSTERS[id].lv <= player.lv + 3);
    if (!pool.length) pool = [z.mons[0]];
    const id = pool[rand(0, pool.length - 1)];
    return { icon: MONSTERS[id].icon, name: MONSTERS[id].name, mid: id };
}

function spawnMapMon(near) {
    const look = visualMonster();
    if (!look) return null;
    for (let tries = 0; tries < 40; tries++) {
        const r = near ? rand(2, 4) : rand(3, 9);
        const x = scene.pl.x + rand(-r, r), y = scene.pl.y + rand(-r, r);
        // 只生在走得到的格子（障礙物、牆圍住的死角生怪會讓角色永遠打不到，2026-10-12 使用者回報異界找不到怪打）
        if (freeTile(x, y) && Math.abs(x - scene.pl.x) + Math.abs(y - scene.pl.y) >= 2 && findPath(scene.pl.x, scene.pl.y, x, y, true).length) {
            const m = { x, y, rx: x, ry: y, icon: look.icon, name: look.name, mid: look.mid, inst: null, cd: rand(...MON_WANDER_MS), dying: 0, lunge: null };
            scene.mons.push(m);
            return m;
        }
    }
    return null;
}

// ───────── 每幀更新 ─────────
function sceneUpdate(dt) {
    const pl = scene.pl, inZone = player.loc.type === 'zone', fighting = inZone && player.hunting && hunt && hunt.state === 'fight' && hunt.mon;

    // 大地圖：離角色 16 格以上、沒在戰鬥的怪收掉（怪只生在角色附近，走遠了才會一直有新的）；記下目前在哪一區
    if (scene.bg && scene.bg.big) {
        scene.mons = scene.mons.filter(m => m.inst || m.dead || Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y) < 16);
        if (scene.bg.regions && inZone) {
            const rs = scene.bg.regions;
            const r = bigRegionAt(rs, pl.x, pl.y);
            if (r.zone && r.zone !== player.loc.id && !walkHome) sceneEnterZone(r.zone);   // 走進別的地圖的區域
            const name = r.zone ? ZONE_BY_ID[r.zone].name : r.name;
            if (name !== scene.region) { scene.region = name; scene.regionAt = gameNow; }
        }
    }
    // 怪物數量維持
    if (inZone && currentZone().type !== 'dragon') {
        scene.spawnCd -= dt;
        if (scene.spawnCd <= 0 && scene.mons.filter(m => !m.dead).length < MAP_MON_COUNT) { spawnMapMon(false); scene.spawnCd = 1200; }
    }

    // 綁定戰鬥中的怪：hunt.mobs 每隻對應一隻地圖怪
    const mobs = fighting ? hunt.mobs : [];
    for (const m of scene.mons) {
        if (!m.inst || m.dead || mobs.includes(m.inst)) continue;
        if (m.inst.hp <= 0) { m.dead = true; m.dying = 600; }   // 被打倒 → 淡出
        else m.inst = null;                                      // 脫離戰鬥（瞬移等）→ 放回遊走
    }
    for (const inst of mobs) {
        if (scene.mons.some(m => m.inst === inst && !m.dead)) continue;
        let best = null, bd = 1e9;
        for (const m of scene.mons) {
            if (m.dead || m.inst) continue;
            const d = Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y);
            if (d < bd) { bd = d; best = m; }
        }
        if (!best || bd > (inst === hunt.mon ? 6 : 4)) best = spawnMapMon(true) || best;
        if (!best) {   // 龍穴：龍出現在角色上方
            best = { x: pl.x, y: Math.max(1, pl.y - 2), rx: pl.x, ry: Math.max(1, pl.y - 2), cd: 1e9, dying: 0 };
            scene.mons.push(best);
        }
        best.inst = inst;
        best.icon = inst.icon;
        best.name = inst.name;
        best.mid = inst.id;
        best.lastHp = inst.hp;
        if (inst === hunt.mon) pl.path = [];
    }
    const target = fighting ? scene.mons.find(m => m.inst === hunt.mon && !m.dead) || null : null;
    if (target !== scene.engaged) { scene.engaged = target; if (target) pl.path = []; }
    if (fighting && scene.engaged) {
        // 目標打不到、身邊卻有打得到的怪 → 先打身邊的（玩家剛點選的目標 5 秒內不換）（2026-10-15）
        if (!sceneCanHit(scene.engaged) && !(scene.focusUntil > gameNow)) {
            const near = sceneFightMons().filter(m => m !== scene.engaged && sceneCanHit(m)).sort((a, b) => sceneDist(a) - sceneDist(b))[0];
            if (near) sceneLock(near);
        }
        // 鎖定後 5 秒都沒出手（走不到、被擋住、卡住）→ 重新鎖定（RELOCK_MS）
        if (hunt.mon !== scene.lockMon) { scene.lockMon = hunt.mon; scene.lockAt = gameNow; }
        if (scene.dodging || scene.manualUntil > gameNow) scene.lockAt = gameNow;   // 閃首領大招、玩家手動走路時不算
        if (gameNow - Math.max(scene.lockAt || 0, hunt.lastAtkAt || 0) > RELOCK_MS) sceneRelock();
        hunt.reach = { mon: hunt.mon, ...sceneReach(scene.engaged), seenAt: gameNow };
    }

    // 怪物遊走、死亡淡出
    for (const m of scene.mons) {
        if (m.dead) { m.dying -= dt; continue; }
        if (m === scene.engaged && (pl.path.length || !m.inst)) continue;   // 目標：角色走過去時站著等，角色停下（遠程）時自己走過來
        m.cd -= dt;
        if (m.inst) {   // 圍上來的怪：一格一格走到角色旁邊
            if (m.cd > 0) continue;
            m.cd = 300;
            if (Math.abs(pl.x - m.x) + Math.abs(pl.y - m.y) <= 1) continue;
            const step = findPath(m.x, m.y, pl.x, pl.y, true)[0];   // 尋路繞過牆
            if (step && freeTile(step[0], step[1])) { m.x = step[0]; m.y = step[1]; }
            continue;
        }
        if (m.cd <= 0) {
            m.cd = rand(...MON_WANDER_MS);
            const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(0, 3)];
            if (freeTile(m.x + dx, m.y + dy)) { m.x += dx; m.y += dy; }
        }
    }
    scene.mons = scene.mons.filter(m => !(m.dead && m.dying <= 0));

    // 角色移動
    if (!inZone && !pl.path.length) {
        // 村莊：玩家自由控制（方向鍵／WASD 按住連走；點地圖走過去，見 sceneClick）
        const d = sceneKeyDir();
        if (d) {
            pl.dir = d[2];
            if (freeTileFor(pl.x + d[0], pl.y + d[1])) pl.path = [[pl.x + d[0], pl.y + d[1]]];
        }
    }
    if (inZone && !pl.path.length) {
        // 野外也能用方向鍵／WASD 手動走（之後幾秒不會被自動尋怪拉走）
        const d = sceneKeyDir();
        if (d) {
            pl.dir = d[2];
            if (freeTileFor(pl.x + d[0], pl.y + d[1])) pl.path = [[pl.x + d[0], pl.y + d[1]]];
            scene.manualUntil = gameNow + MANUAL_HOLD_MS;
        }
    }
    sceneTeleTick(dt);
    if (scene.moveMark) { scene.moveMark.t += dt; if (scene.moveMark.t > 700 || !pl.path.length) scene.moveMark = null; }
    const manual = inZone && scene.manualUntil > gameNow;
    if (!pl.path.length && !manual && !scene.dodging) {
        if (fighting && scene.engaged) {
            // 走到攻擊距離就停：遠程武器 4 格內且看得到，近戰走到旁邊；一次只走一格，每格重新判斷（怪也會移動）
            const e = scene.engaged, r = sceneReach(e);
            if (weaponIsRanged() ? r.ranged : r.melee) pl.dir = Math.abs(e.x - pl.x) >= Math.abs(e.y - pl.y) ? (e.x > pl.x ? 'right' : 'left') : (e.y > pl.y ? 'down' : 'up');
            else if (Math.abs(e.x - pl.x) + Math.abs(e.y - pl.y) !== 1) pl.path = findPath(pl.x, pl.y, e.x, e.y, true).slice(0, 1);
        } else if (inZone && player.hunting && !walkHome) {
            let best = null, bd = 1e9;
            for (const m of scene.mons) { if (m.dead) continue; const d = Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y); if (d < bd) { bd = d; best = m; } }
            if (best && bd > 1) pl.path = findPath(pl.x, pl.y, best.x, best.y, true).slice(0, 6);
        } else if (inZone) {
            // 野外停止掛機：原地附近隨機走動；村莊裡站著不動
            pl.idleCd -= dt;
            if (pl.idleCd <= 0) {
                pl.idleCd = rand(1500, 4000);
                const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][rand(0, 3)];
                if (freeTileFor(pl.x + dx, pl.y + dy)) pl.path = [[pl.x + dx, pl.y + dy]];
            }
        }
    }
    if (pl.path.length) {
        scene.walkClock = (scene.walkClock || 0) + dt;
        const [nx, ny] = pl.path[0], last = pl.path[pl.path.length - 1];
        if (!freeTileFor(nx, ny)) {
            // 下一格被怪擋住：點地面／小地圖的長距離移動（pl.dest）重新找路繞過去，其他情況（尋怪一步步走）照舊停下
            const far = pl.dest && pl.path.length > 1 && last[0] === pl.dest[0] && last[1] === pl.dest[1];
            pl.path = far ? findPath(pl.x, pl.y, pl.dest[0], pl.dest[1], !freeTileFor(pl.dest[0], pl.dest[1])) : [];
        } else {
            const step = PLAYER_SPEED * dt / 1000;
            const ddx = nx - pl.rx, ddy = ny - pl.ry;
            pl.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up');
            const dist = Math.hypot(ddx, ddy);
            if (dist <= step) { pl.rx = nx; pl.ry = ny; pl.x = nx; pl.y = ny; pl.path.shift(); }
            else { pl.rx += ddx / dist * step; pl.ry += ddy / dist * step; }
        }
    } else { pl.rx += (pl.x - pl.rx) * 0.5; pl.ry += (pl.y - pl.ry) * 0.5; }
    for (const m of scene.mons) { m.rx += (m.x - m.rx) * Math.min(1, dt / 150); m.ry += (m.y - m.ry) * Math.min(1, dt / 150); }

    sceneReadEvents();
    for (const f of scene.floats) f.t += dt;
    scene.floats = scene.floats.filter(f => f.t < f.dur);
    for (const e of scene.effects) e.t += dt;
    scene.effects = scene.effects.filter(e => e.t < e.dur);
    if (pl.lunge) { pl.lunge.t += dt; if (pl.lunge.t > 180) pl.lunge = null; }
    if (pl.anim) { pl.anim.t += dt; if (pl.anim.t >= pl.anim.dur) pl.anim = null; }
    for (const m of scene.mons) if (m.lunge) { m.lunge.t += dt; if (m.lunge.t > 180) m.lunge = null; }
    for (const m of scene.mons) if (m.atk > 0) m.atk -= dt;
    for (const m of scene.mons) if (m.hurt) { m.hurt.t += dt; if (m.hurt.t >= HURT_MS) m.hurt = null; }
    if (!inZone) presUpdate(dt);   // 村莊裡其他玩家的位置（presence.js）
}

// ───────── 目標鎖定（2026-10-15 使用者回報：鎖定遠方的怪、身邊的怪一直打，原地喝水到死）─────────
// 戰鬥選目標（combat.js）只看血量，不知道位置；畫面開著時由這裡依位置修正：
//   目標打不到、身邊有打得到的 → 改打身邊最近的；鎖定後 RELOCK_MS 都沒出手 → 重新鎖定最近的怪，還是打不到就把牠移到角色旁邊
const RELOCK_MS = 5000;
function sceneFightMons() { return scene.mons.filter(m => !m.dead && m.inst && hunt.mobs.includes(m.inst) && m.inst.hp > 0); }
function sceneDist(m) { return Math.abs(m.x - scene.pl.x) + Math.abs(m.y - scene.pl.y); }
function sceneCanHit(m) { const r = sceneReach(m); return weaponIsRanged() ? r.ranged : r.melee; }
function sceneLock(m) {
    focusMob(m.inst);
    scene.engaged = m;
    scene.pl.path = [];
    scene.lockMon = hunt.mon;
    scene.lockAt = gameNow;
}
function sceneRelock() {
    const list = sceneFightMons().sort((a, b) => sceneDist(a) - sceneDist(b));
    if (!list.length) return;
    // 打得到的最近那隻 → 不然換一隻別的（原本那隻可能卡在死角）→ 都沒有就原本那隻
    const pick = list.find(sceneCanHit) || list.find(m => m !== scene.engaged) || list[0];
    if (!sceneCanHit(pick)) {   // 還是打不到：把牠移到角色旁邊的空格
        const pl = scene.pl;
        const spot = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [pl.x + dx, pl.y + dy]).find(([x, y]) => freeTile(x, y));
        if (spot) { pick.x = pick.rx = spot[0]; pick.y = pick.ry = spot[1]; }
    }
    sceneLock(pick);
}

// ───────── 攻擊距離（combat.js 的 canReach）─────────
// 近戰：目標在旁邊 1 格（含斜角）；遠程：4 格內（直線距離）且視線沒被牆、障礙物擋住（怪物不擋）
function lineOfSight(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    while (x !== x1 || y !== y1) {
        const e2 = err * 2;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
        if ((x !== x1 || y !== y1) && scene.grid[y][x] !== 0) return false;
    }
    return true;
}
function sceneReach(e) {
    const pl = scene.pl, dx = Math.abs(e.x - pl.x), dy = Math.abs(e.y - pl.y);
    return {
        melee: Math.max(dx, dy) <= MELEE_RANGE,
        ranged: Math.hypot(dx, dy) <= RANGED_RANGE + 0.5 && lineOfSight(pl.x, pl.y, e.x, e.y),
    };
}

// ───────── 首領大招紅圈（hunt.tele）與自動閃避 ─────────
const MANUAL_HOLD_MS = 2500;   // 手動移動後幾毫秒內不自動尋怪
function sceneTeleTick(dt) {
    const t = hunt && hunt.tele, pl = scene.pl;
    if (!t || player.loc.type !== 'zone') { scene.tele = null; scene.dodging = false; return; }
    if (!scene.tele || scene.tele.ref !== t) scene.tele = { ref: t, x: pl.x, y: pl.y, r: 1.5, react: rand(350, 900) };
    const c = scene.tele;
    const inside = Math.hypot(pl.rx - c.x, pl.ry - c.y) <= c.r;
    t.dodged = !inside;          // 回報給 combat.js（時間到時用這個判斷有沒有閃開）
    t.seenAt = gameNow;
    if (!inside) { if (!pl.path.length) scene.dodging = false; return; }
    if (!player.settings.autoDodge || scene.manualUntil > gameNow || scene.dodging) return;
    c.react -= dt;               // 自動閃避有反應時間，偶爾會來不及
    if (c.react > 0) return;
    let best = null;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = pl.x + dx, y = pl.y + dy;
        if (Math.hypot(x - c.x, y - c.y) <= c.r + 0.4 || !freeTileFor(x, y)) continue;
        const path = findPath(pl.x, pl.y, x, y, false);
        if (path.length && (!best || path.length < best.length)) best = path;
    }
    if (best) { pl.path = best; scene.dodging = true; }
}

// big：升級等大字；crit：爆擊傷害（紅色大字、出現時先彈大再縮回，停留久一點）
function addFloat(tx, ty, text, color, big, crit) {
    scene.floats.push({ x: tx * TILE + TILE / 2 + rand(-6, 6), y: ty * TILE, text, color, t: 0, dur: crit ? 1100 : 900, size: crit ? 24 : big ? 17 : 13, pop: !!crit });
}
// 受擊打擊感（2026-10-18 使用者要求，參考天堂經典版）：怪物被打中時身體往下壓扁一下、往後退一點、閃白，HURT_MS 內彈回；爆擊幅度更大
// 第二版（使用者回報手機看不出來）：幅度加大、閃白改用白色剪影疊圖（iPhone Safari 不支援 ctx.filter）、身上加一個受擊火花
const HURT_MS = 260;
function monHurt(m, crit) {
    const pl = scene.pl, dx = m.x - pl.x, dy = m.y - pl.y, d = Math.hypot(dx, dy) || 1;
    m.hurt = { t: 0, crit: !!crit, dx: dx / d, dy: dy / d };
    scene.effects.push({ kind: 'spark', x: m.rx, y: m.ry, t: 0, dur: crit ? 260 : 180, crit: !!crit, rot: Math.random() * Math.PI });
}
// 白色剪影：把怪物這一格畫到暫存畫布再用 source-atop 塗白（所有瀏覽器都支援）
let hitFlashCv = null;
function hitFlashCanvas(img, fx, fy, fw, fh, a) {
    if (!hitFlashCv) hitFlashCv = document.createElement('canvas');
    const c = hitFlashCv;
    if (c.width !== fw || c.height !== fh) { c.width = fw; c.height = fh; }
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, fw, fh);
    g.drawImage(img, fx, fy, fw, fh, 0, 0, fw, fh);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.fillRect(0, 0, fw, fh);
    return c;
}

// 從 HP 變化與遊戲訊息產生傷害數字、MISS、特效
// 人物動作：attack 攻擊、cast 施法、hit 受傷（播完回到走路／站立）；攻擊與施法不會被受傷打斷
function playAnim(name) {
    const sp = CLASSES[player.cls].sprite;
    if (!sp || !sp[name]) return;
    const cur = scene.pl.anim;
    if (name === 'hit' && cur && cur.name !== 'hit' && cur.t < cur.dur) return;
    const n = sp[name].frames[animDir(scene.pl.dir)];
    scene.pl.anim = { name, t: 0, dur: n * sp[name].ms };
}
function animDir(dir) { return dir === 'left' ? 'right' : dir; }

function sceneReadEvents() {
    const pl = scene.pl, e = scene.engaged;
    // 先讀遊戲訊息：判斷這次是魔法還是普攻、有沒有爆擊
    let castNow = false, missNow = false;
    for (const l of gameLog) {
        if (l.seq <= scene.lastSeq) continue;
        if (l.cls === 'crit' && l.msg.includes('爆擊')) scene.critNext = true;   // 反擊也用 crit 樣式，但不是爆擊
        if (l.cls === 'miss') {
            if (l.msg.includes('沒有命中') && e) { addFloat(e.rx, e.ry, 'MISS', '#9a9a9a'); missNow = true; }
            else addFloat(pl.rx, pl.ry, 'MISS', '#9a9a9a');
        }
        if (l.cls === 'magic' && e) {
            // 範圍技能：所有圍上來的怪身上都爆特效
            const list = l.msg.includes('（範圍）') ? scene.mons.filter(m => m.inst && !m.dead) : [e];
            for (const m of list) scene.effects.push({ x: m.rx, y: m.ry, t: 0, dur: l.msg.includes('（範圍）') ? 550 : 400, color: l.msg.startsWith('💥') ? '#ffb347' : '#b48cff' });
            if (l.msg.startsWith('🔮')) castNow = true;
        }
        if (l.cls === 'heal' && l.msg.startsWith('✨')) {
            castNow = true;
            if (l.msg.startsWith('✨ 施放')) scene.effects.push({ x: pl.rx, y: pl.ry, t: 0, dur: 500, color: '#8fd0ff' });
        }
        if (l.cls === 'lvup' && l.msg.startsWith('🎉')) addFloat(pl.rx, pl.ry - 0.5, 'LEVEL UP!', '#ffd34d', true);
        if ((l.cls === 'rare' || l.cls === 'loot') && l.msg.startsWith('🎁')) addFloat(pl.rx, pl.ry - 0.8, '🎁', '#fff');
    }
    // 記住讀過的最大編號（不能只用 logSeq：編號若倒退，同一批訊息會每幀重讀）
    scene.lastSeq = gameLog.reduce((m, l) => Math.max(m, l.seq), Math.max(scene.lastSeq, logSeq));
    let dealt = false;
    // 每隻圍上來的怪：HP 減少就飄傷害數字＋受擊縮一下（爆擊紅色大字只算在目標身上）
    for (const m of scene.mons) {
        if (!m.inst || m.lastHp == null) continue;
        const hp = Math.max(0, m.inst.hp);
        if (hp < m.lastHp) {
            const crit = m === e && scene.critNext;
            addFloat(m.rx, m.ry, '-' + fmt(m.lastHp - hp), crit ? '#ff3b2f' : '#ffffff', false, crit);
            monHurt(m, crit);
            if (m === e) { scene.critNext = false; if (!CLASSES[player.cls].sprite) pl.lunge = { dx: e.x - pl.x, dy: e.y - pl.y, t: 0 }; }
            dealt = true;
        }
        m.lastHp = hp;
    }
    if (castNow) playAnim('cast');
    else if (dealt || missNow) playAnim('attack');
    if (player.hp < scene.lastPlayerHp) {
        addFloat(pl.rx, pl.ry, '-' + fmt(scene.lastPlayerHp - player.hp), '#ff6b5b');
        // 隨機一隻貼在旁邊的怪做出攻擊動作
        const near = scene.mons.filter(m => m.inst && !m.dead && Math.abs(m.x - pl.x) + Math.abs(m.y - pl.y) <= 1);
        const a = near.length ? near[rand(0, near.length - 1)] : e;
        if (a) { a.lunge = { dx: pl.x - a.x, dy: pl.y - a.y, t: 0 }; a.atk = 380; }   // atk：怪物模型顯示攻擊那列
        playAnim('hit');
    } else if (player.hp > scene.lastPlayerHp + 1 && scene.lastPlayerHp > 0) {
        addFloat(pl.rx, pl.ry, '+' + fmt(player.hp - scene.lastPlayerHp), '#7fe07a');
    }
    scene.lastPlayerHp = player.hp;
}

// ───────── 繪圖 ─────────
function sceneDraw(ctx, W, H) {
    const pl = scene.pl, th = scene.theme;
    const mapW = scene.mw * TILE, mapH = scene.mh * TILE;
    // 地圖比畫面小時置中（負的鏡頭位置）
    const camX = mapW <= W ? (mapW - W) / 2 : clamp(pl.rx * TILE + TILE / 2 - W / 2, 0, mapW - W);
    // 很寬的畫面（PC 橫式外框）角色畫在偏下方，避開上方惡魔頭與角色資訊
    const focusY = W > H * 2 ? H * 0.62 : H / 2;
    const camY = mapH <= H ? (mapH - H) / 2 : clamp(pl.ry * TILE + TILE / 2 - focusY, 0, mapH - H);
    ctx.fillStyle = th.wall;
    ctx.fillRect(0, 0, W, H);
    const x0 = Math.max(0, Math.floor(camX / TILE)), y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(scene.mw - 1, Math.ceil((camX + W) / TILE)), y1 = Math.min(scene.mh - 1, Math.ceil((camY + H) / TILE));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 背景圖地圖：整張圖拉滿地圖範圍，再疊地區色調；圖還沒載入時退回畫格子
    const bgImg = scene.bg && spriteImage(scene.bg.src);
    if (bgImg) {
        const cr = scene.bg.crop;   // 只取原圖的一部分（裁掉黑邊）
        if (cr) ctx.drawImage(bgImg, cr[0], cr[1], cr[2], cr[3], -camX, -camY, mapW, mapH);
        else ctx.drawImage(bgImg, -camX, -camY, mapW, mapH);
        if (scene.tint) { ctx.fillStyle = scene.tint; ctx.fillRect(-camX, -camY, mapW, mapH); }
    }
    if (!bgImg) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const g = scene.grid[y][x], sx = x * TILE - camX, sy = y * TILE - camY;
        if (g === 1) { ctx.fillStyle = th.wall; ctx.fillRect(sx, sy, TILE, TILE); continue; }
        if (player.loc.type === 'town') {
            // 村莊：外圍草地、中間泥土廣場（不畫格線，看起來像地面）
            const d = Math.hypot(x - MAP_W / 2, y - MAP_H / 2);
            ctx.fillStyle = d < 6.5 ? (scene.shade[y][x] ? '#7a6548' : '#75614a') : d < 7.5 ? '#5f5a3c' : (scene.shade[y][x] ? '#3f5a2c' : '#3b5529');
            ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
            continue;
        }
        ctx.fillStyle = scene.shade[y][x] ? th.a : th.b;
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
    }
    // 障礙物、建築
    ctx.font = '22px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const sx = x * TILE - camX + TILE / 2, sy = y * TILE - camY + TILE / 2;
        if (scene.grid[y][x] === 2) ctx.fillText(scene.deco[x + ',' + y], sx, sy);
    }
    // 有背景圖的村莊：圖上已畫好房屋與 NPC，不另外畫；可點範圍來自 SCENE_BGS 的 hot
    const inTownNow = player.loc.type === 'town' && !scene.bg;
    if (player.loc.type === 'town' && scene.bg && scene.bg.hot) {
        const kx = mapW / scene.bg.crop[2], ky = mapH / scene.bg.crop[3], ox = scene.bg.crop[0], oy = scene.bg.crop[1];
        scene.npcRects = scene.bg.hot.map(h => ({ x0: (h.r[0] - ox) * kx, y0: (h.r[1] - oy) * ky, x1: (h.r[2] - ox) * kx, y1: (h.r[3] - oy) * ky, npc: { act: h.act } }));
    }
    if (inTownNow) for (const h of TOWN_HOUSES) drawHouse(ctx, h, camX, camY);
    // 首領大招紅圈：外圈閃爍、內圈隨蓄力時間長大，滿了就爆
    if (scene.tele && scene.tele.ref) {
        const c = scene.tele, t = c.ref, k = clamp((gameNow - t.start) / (t.until - t.start), 0, 1);
        const cx = c.x * TILE - camX + TILE / 2, cy = c.y * TILE - camY + TILE / 2, R = (c.r + 0.5) * TILE;
        ctx.fillStyle = `rgba(220,30,20,${0.18 + 0.1 * Math.sin(gameNow / 80)})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.75, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,60,30,0.35)';
        ctx.beginPath(); ctx.ellipse(cx, cy, R * k, R * 0.75 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ff3a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.75, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1;
    }
    if (scene.gates && player.loc.type === 'zone') drawGates(ctx, camX, camY, W, H);   // 大地圖路引（畫在地上，角色會走在上面）
    // 角色與怪物：依 y 由上往下畫（下面的蓋在上面的前面）；名字、血條最後統一畫在最上層
    const labels = [];
    if (player.loc.type === 'town') scene.npcRects = [];
    const actorFont = '36px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    const drawMon = m => {
        let sx = m.rx * TILE - camX + TILE / 2, sy = m.ry * TILE - camY + TILE / 2;
        if (m.lunge) { const k = Math.sin(m.lunge.t / 180 * Math.PI) * 8; sx += m.lunge.dx * k; sy += m.lunge.dy * k; }
        // 受擊（monHurt）：往後退幾 px、以腳底為準壓扁（矮一點、寬一點）、前段閃白
        let hsx = 1, hsy = 1, flash = 0;
        if (m.hurt) {
            const h = m.hurt, k = Math.min(1, h.t / HURT_MS), s = Math.sin(k * Math.PI), amp = h.crit ? 1.5 : 1;
            sx += h.dx * 7 * amp * s; sy += h.dy * 4 * amp * s;
            hsy = 1 - 0.22 * amp * s; hsx = 1 + 0.12 * amp * s;
            flash = k < 0.5 ? (h.crit ? 0.85 : 0.7) * (1 - k * 2) : 0;   // 白色剪影的濃度，前半段由濃變淡
        }
        const hurtFx = () => {
            if (hsx === 1 && hsy === 1) return;
            ctx.translate(sx, sy + 13); ctx.scale(hsx, hsy); ctx.translate(-sx, -(sy + 13));
        };
        ctx.globalAlpha = m.dead ? Math.max(0, m.dying / 600) : 1;
        const big = m.inst && (m.inst.boss || m.inst.dragon);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(sx, sy + 11, big ? 16 : 11, 4, 0, 0, Math.PI * 2); ctx.fill();
        const img = monSpriteImg(m.mid);
        let top = sy - (big ? 44 : 30);
        if (img) {
            // 方向：戰鬥中面向角色，遊走時看移動方向；左右用側面圖鏡像
            const fight = m.inst && !m.dead;
            const dx = fight ? pl.rx - m.rx : m.x - m.rx, dy = fight ? pl.ry - m.ry : m.y - m.ry;
            if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) m.face = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
            const f = m.face || 'down', ms = MON_SPRITES[m.mid], row = { down: 0, right: 1, left: 1, up: 2 }[f] + (m.atk > 0 ? 3 : 0);
            const dh = (ms.size || (big ? 62 : 42)) * ms.ch / ms.body, dw = ms.cw * dh / ms.ch;
            const moving = !fight && (Math.abs(m.x - m.rx) + Math.abs(m.y - m.ry)) > 0.02;
            const n = ms.n[row];
            // 格：攻擊照出手進度播一次；走動時循環；站著停在第一格（只有 1 格的怪走動時上下輕晃）
            const fr = m.atk > 0 ? Math.min(n - 1, Math.floor((1 - m.atk / 380) * n)) : moving ? Math.floor(gameNow / 150) % n : 0;
            const bob = moving && n === 1 ? Math.abs(Math.sin(gameNow / 110)) * 2 : 0;
            const body = () => {
                ctx.save();
                hurtFx();
                if (f === 'left') { ctx.translate(sx, 0); ctx.scale(-1, 1); ctx.translate(-sx, 0); }
                ctx.drawImage(img, fr * ms.cw, row * ms.ch, ms.cw, ms.ch, sx - dw / 2, sy + 13 - dh - bob, dw, dh);
                if (flash > 0 && img.complete && img.naturalWidth) ctx.drawImage(hitFlashCanvas(img, fr * ms.cw, row * ms.ch, ms.cw, ms.ch, flash), sx - dw / 2, sy + 13 - dh - bob, dw, dh);
                ctx.restore();
            };
            body();
            top = sy + 13 - dh - 4;
            const a = ctx.globalAlpha;
            ctx.globalAlpha = 1;
            // 被樹、擺設擋住：目前鎖定的目標疊半透明身影（其他怪就讓牠躲在後面）
            if (drawOccPatch(ctx, sx - dw / 2 - 4, sy + 13 - dh - 4, sx + dw / 2 + 4, sy + 15, m.ry, camX, camY) && m === scene.engaged) { ctx.globalAlpha = OCC_GHOST * a; body(); }
        } else {
            const body = () => {
                ctx.save();
                hurtFx();
                ctx.font = big ? '54px "Segoe UI Emoji","Apple Color Emoji",sans-serif' : actorFont;
                ctx.fillText(m.icon, sx, sy - (big ? 12 : 4));
                ctx.restore();
            };
            body();
            const a = ctx.globalAlpha;
            ctx.globalAlpha = 1;
            if (drawOccPatch(ctx, sx - 28, sy - (big ? 44 : 30), sx + 28, sy + 14, m.ry, camX, camY) && m === scene.engaged) { ctx.globalAlpha = OCC_GHOST * a; body(); }
        }
        ctx.globalAlpha = 1;
        // 圍上來的怪都有血條；名字只標在目標（避免擠在一起），目標腳下加紅圈
        if (m.inst && !m.dead) {
            const tgt = m === scene.engaged;
            const w = big ? 46 : 32, pct = clamp(m.inst.hp / m.inst.maxHp, 0, 1), by = Math.min(sy - (big ? 44 : 30), top);
            if (m.inst.elite) { ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy + 11, 16, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
            if (tgt) { ctx.strokeStyle = '#ff5a3c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(sx, sy + 11, big ? 20 : 14, big ? 6 : 5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
            labels.push(() => {
                ctx.fillStyle = '#000a'; ctx.fillRect(sx - w / 2, by, w, 5);
                ctx.fillStyle = tgt ? '#d64036' : '#b0702c'; ctx.fillRect(sx - w / 2, by, w * pct, 5);
                if (tgt || m.inst.elite) drawLabel(ctx, `${m.inst.name} Lv.${m.inst.lv}`, sx, by - 8, m.inst.boss ? '#ff8a6a' : m.inst.elite ? '#ffd34d' : '#e8e0cc');
            });
        }
    };
    const drawPlayer = () => {
        let px = pl.rx * TILE - camX + TILE / 2, py = pl.ry * TILE - camY + TILE / 2;
        if (pl.lunge) { const k = Math.sin(pl.lunge.t / 180 * Math.PI) * 9; px += pl.lunge.dx * k; py += pl.lunge.dy * k; }
        const bob = pl.path.length ? Math.sin(gameNow / 90) * 2 : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(px, py + 12, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
        const sp = CLASSES[player.cls].sprite;
        // 目前動作：攻擊／施法／受傷播放中就用它，否則走路（停下來用中間那格當站立）
        const playing = pl.anim && pl.anim.t < pl.anim.dur && sp && sp[pl.anim.name] && spriteImage(sp[pl.anim.name].src);
        const anim = playing ? sp[pl.anim.name] : sp && sp.walk;
        const img = anim && spriteImage(anim.src);
        let labelY = py - 24;
        if (img) {
            // 列＝方向（向左＝向右鏡像）；縮放成 drawH 身高；腳底對齊所在格子
            const d = animDir(pl.dir), rowIdx = { down: 0, right: 1, up: 2 }[d], n = anim.frames[d];
            let frame;
            if (playing) frame = Math.min(n - 1, Math.floor(pl.anim.t / anim.ms));
            else frame = pl.path.length ? Math.floor(scene.walkClock / anim.ms) % n : Math.floor(n / 2);
            const k = sp.drawH / sp.charH, dw = anim.cellW * k, dh = anim.cellH * k;
            const body = () => {
                ctx.save();
                if (pl.dir === 'left') { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
                ctx.drawImage(img, frame * anim.cellW, rowIdx * anim.cellH, anim.cellW, anim.cellH, px - dw / 2, py + 14 - dh, dw, dh);
                ctx.restore();
            };
            body();
            labelY = py + 14 - sp.drawH - 6;
            // 走到樹、帳篷後面：被蓋住的部分再疊一層半透明身影，不會完全看不到自己
            if (drawOccPatch(ctx, px - dw / 2, py + 14 - dh, px + dw / 2, py + 16, pl.ry, camX, camY)) { ctx.globalAlpha = OCC_GHOST; body(); ctx.globalAlpha = 1; }
        } else {
            const body = () => {
                ctx.font = '40px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
                ctx.save();
                if (pl.dir === 'left') { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
                ctx.fillText(CLASSES[player.cls].icon, px, py - 6 + bob);
                ctx.restore();
            };
            body();
            labelY = py - 32;
            if (drawOccPatch(ctx, px - 24, py - 30, px + 24, py + 16, pl.ry, camX, camY)) { ctx.globalAlpha = OCC_GHOST; body(); ctx.globalAlpha = 1; }
        }
        labels.push(() => drawLabel(ctx, player.name, px, labelY, '#9fe0ff'));
    };
    const actors = scene.mons.map(m => ({ y: m.ry, draw: () => drawMon(m) }));
    actors.push({ y: pl.ry + 0.01, draw: drawPlayer });
    if (player.loc.type === 'town') for (const key in presOthers) { const o = presOthers[key]; actors.push({ y: o.ry, draw: () => presDraw(ctx, o, camX, camY, labels) }); }   // 其他在線玩家（presence.js）
    if (player.loc.type === 'town') for (const n of townNpcList(scene.bg)) actors.push({ y: n.y, draw: () => {
        const sx = n.x * TILE - camX + TILE / 2, sy = n.y * TILE - camY + TILE / 2;
        if (n.painted) { labels.push(() => drawNpcPlate(ctx, n.names[player.loc.id] || n.role, n.role, sx, sy - n.h * TILE, camX, camY, n)); return; }   // 圖上已畫好的人：只加名牌
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(sx, sy + 12, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.font = '28px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
        ctx.fillText(n.icon, sx, sy - 2);
        if (n.prop) { ctx.font = '18px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.fillText(n.prop, sx - 20, sy + 6); }
        labels.push(() => drawNpcPlate(ctx, n.names[player.loc.id] || n.role, n.role, sx, sy - 26, camX, camY, n));
    } });
    // 村莊點擊移動的目的地標記（走到就消失）
    const mk = scene.moveMark;
    if (mk && pl.path.length) {
        const sx = mk.x * TILE - camX + TILE / 2, sy = mk.y * TILE - camY + TILE / 2 + 8, k = (gameNow % 900) / 900;
        ctx.strokeStyle = '#ffe7a8'; ctx.lineWidth = 2; ctx.globalAlpha = 0.9 - k * 0.6;
        ctx.beginPath(); ctx.ellipse(sx, sy, 6 + k * 8, 3 + k * 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    } else scene.moveMark = null;
    actors.sort((a, b) => a.y - b.y).forEach(a => a.draw());
    labels.forEach(f => f());
    // 特效、飄字
    if (scene.moveMark) {   // 點地圖移動的目的地標記
        const mk = scene.moveMark, sx = mk.x * TILE - camX + TILE / 2, sy = mk.y * TILE - camY + TILE / 2 + 8, k = Math.min(1, mk.t / 700);
        ctx.strokeStyle = '#ffe7a8'; ctx.globalAlpha = 1 - k * 0.7; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy, 12 - k * 5, 5 - k * 2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    for (const e of scene.effects) {
        const sx = e.x * TILE - camX + TILE / 2, sy = e.y * TILE - camY + TILE / 2, k = e.t / e.dur;
        if (e.kind === 'spark') {   // 受擊火花（monHurt）：身體中間爆開的十字光芒，爆擊較大、偏橘紅
            const cy = sy - 14, R = (e.crit ? 20 : 13) * (0.5 + k * 0.8), core = (e.crit ? 7 : 5) * (1 - k);
            ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.crit ? '#ffb04a' : '#fff6d0'; ctx.lineWidth = e.crit ? 3 : 2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = e.rot + i * Math.PI / 4, r0 = i % 2 ? R * 0.35 : R * 0.15, r1 = i % 2 ? R * 0.7 : R;
                ctx.moveTo(sx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(sx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            }
            ctx.stroke();
            if (core > 0) { ctx.fillStyle = e.crit ? '#fff1c0' : '#ffffff'; ctx.beginPath(); ctx.arc(sx, cy, core, 0, Math.PI * 2); ctx.fill(); }
            ctx.globalAlpha = 1; ctx.lineWidth = 1;
            continue;
        }
        ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, sy, 8 + k * 18, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    for (const f of scene.floats) {
        const k = f.t / f.dur;
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        // 爆擊：前 140ms 從 1.7 倍彈回原本大小
        const pop = f.pop && f.t < 140 ? 1 + 0.7 * (1 - f.t / 140) : 1;
        ctx.font = `bold ${Math.round(f.size * pop)}px sans-serif`;
        ctx.lineWidth = f.pop ? 4 : 3; ctx.strokeStyle = '#000';
        const sy = f.y - camY - 4 - k * (f.pop ? 18 : 26);
        ctx.strokeText(f.text, f.x - camX, sy);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x - camX, sy);
        ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    // 狀態字（停止、步行回村）
    let msg = '';
    if (walkHome) msg = `🚶 步行回${TOWNS[walkHome.town].name}…${Math.ceil((walkHome.until - gameNow) / 1000)} 秒`;
    else if (player.loc.type === 'zone' && !player.hunting) msg = '⏸ 停止掛機中';
    if (msg) {
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#000a'; ctx.fillRect(W / 2 - 90, H - 34, 180, 24);
        ctx.fillStyle = '#ffe7a8'; ctx.fillText(msg, W / 2, H - 22);
    }
    if (scene.bg && scene.bg.big) drawBigMapHud(ctx, W, H, camX, camY);
    scene.cam = { x: camX, y: camY };
}

// ───────── 大地圖：擺設遮擋（第 46 節）─────────
// wild-occ.png（tools/bigmap/build-occ.ps1）：1 格＝原圖 4×4 px，紅色值＝0 不是遮擋物，否則＝(這塊樹冠／擺設站的格子列＋1)。
// 角色、怪物畫完後，範圍內「站得比牠南邊」的那些像素用背景圖原樣再畫一次蓋在上面＝走到樹、帳篷後面會被擋住
const OCC_CELL = 4;
const occCache = {};   // src → { w, h, d: Uint8Array } | 'loading'
function occData(src) {
    const c = occCache[src];
    if (c) return c === 'loading' ? null : c;
    occCache[src] = 'loading';
    const img = new Image();
    img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
        const px = g.getImageData(0, 0, img.width, img.height).data, d = new Uint8Array(img.width * img.height);
        for (let i = 0; i < d.length; i++) d[i] = px[i * 4];
        occCache[src] = { w: img.width, h: img.height, d };
    };
    img.onerror = () => { delete occCache[src]; };
    img.src = `${src}?v=${GAME_VERSION}`;   // 深度圖會跟著調整，帶版本號避免 SW 一直給舊的
    return null;
}
let occMaskCv = null, occPatchCv = null;
// (x0,y0)-(x1,y1)：角色在畫面上的範圍；footY：腳底所在的格子列（可以有小數）；有蓋到東西回傳 true（呼叫端再疊一層半透明身影）
const OCC_GHOST = 0.38;
function drawOccPatch(ctx, x0, y0, x1, y1, footY, camX, camY) {
    const bg = scene.bg, occ = bg && bg.occ && occData(bg.occ), img = bg && spriteImage(bg.src);
    if (!occ || !img) return false;
    const cx0 = Math.max(0, Math.floor((x0 + camX) / OCC_CELL)), cy0 = Math.max(0, Math.floor((y0 + camY) / OCC_CELL));
    const cx1 = Math.min(occ.w - 1, Math.ceil((x1 + camX) / OCC_CELL)), cy1 = Math.min(occ.h - 1, Math.ceil((y1 + camY) / OCC_CELL));
    const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1;
    if (cw <= 0 || ch <= 0) return false;
    if (!occMaskCv) { occMaskCv = document.createElement('canvas'); occPatchCv = document.createElement('canvas'); }
    const mg = occMaskCv.getContext('2d');
    if (occMaskCv.width !== cw || occMaskCv.height !== ch) { occMaskCv.width = cw; occMaskCv.height = ch; }
    const id = mg.createImageData(cw, ch);
    let any = false;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const v = occ.d[(cy0 + y) * occ.w + cx0 + x];
        if (v && v - 1 > footY + 0.2) { id.data[(y * cw + x) * 4 + 3] = 255; any = true; }
    }
    if (!any) return false;
    mg.putImageData(id, 0, 0);
    const pw = cw * OCC_CELL, ph = ch * OCC_CELL, pg = occPatchCv.getContext('2d');
    if (occPatchCv.width !== pw || occPatchCv.height !== ph) { occPatchCv.width = pw; occPatchCv.height = ph; }
    pg.globalCompositeOperation = 'source-over';
    pg.clearRect(0, 0, pw, ph);
    pg.drawImage(img, cx0 * OCC_CELL, cy0 * OCC_CELL, pw, ph, 0, 0, pw, ph);
    pg.globalCompositeOperation = 'destination-in';
    pg.imageSmoothingEnabled = true;
    pg.drawImage(occMaskCv, 0, 0, pw, ph);   // 遮罩放大時平滑＝邊緣柔和
    pg.globalCompositeOperation = 'source-over';
    ctx.drawImage(occPatchCv, cx0 * OCC_CELL - camX, cy0 * OCC_CELL - camY);
    return true;
}

// ───────── 大地圖：小地圖＋進入區域的橫幅（第 45 節）─────────
// 小地圖畫在右上角（畫面座標）：縮圖、鏡頭範圍白框、怪物紅點、角色亮點；點小地圖＝走過去（sceneClick → sceneMiniClick）
function drawBigMapHud(ctx, W, H, camX, camY) {
    const bg = scene.bg, mapW = scene.mw * TILE, mapH = scene.mh * TILE;
    const mw = Math.round(Math.min(128, W * 0.3)), mh = Math.round(mw * mapH / mapW);
    const mx = W - mw - 8, my = W > H * 2 ? 40 : 8;   // PC 橫式外框上緣有裝飾，往下移
    scene.miniRect = { x: mx, y: my, w: mw, h: mh };
    const k = mw / mapW, img = bg.mini && spriteImage(bg.mini);
    ctx.save();
    ctx.fillStyle = 'rgba(10,12,10,0.75)'; ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
    ctx.strokeStyle = '#a88b4a'; ctx.lineWidth = 1.5; ctx.strokeRect(mx - 3, my - 3, mw + 6, mh + 6);
    if (img) { ctx.globalAlpha = 0.92; ctx.drawImage(img, mx, my, mw, mh); ctx.globalAlpha = 1; }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
    ctx.strokeRect(mx + Math.max(0, camX) * k, my + Math.max(0, camY) * k, Math.min(W, mapW) * k, Math.min(H, mapH) * k);
    for (const m of scene.mons) {
        if (m.dead) continue;
        ctx.fillStyle = m.inst ? '#ff5a3c' : '#e0705a';
        ctx.fillRect(mx + (m.rx + 0.5) * TILE * k - 1, my + (m.ry + 0.5) * TILE * k - 1, 2.5, 2.5);
    }
    // 路引：目前這個地圖往外的出口，閃爍的小箭頭
    if (scene.gates) {
        const a = 0.55 + 0.45 * Math.sin(gameNow / 250);
        ctx.globalAlpha = a;
        for (const g of scene.gates) if (g.from === player.loc.id)
            drawGlowArrow(ctx, mx + (g.x + 0.5) * TILE * k, my + (g.y + 0.5) * TILE * k, g.ang, 4.5, '#ffd86a', 6);
        ctx.globalAlpha = 1;
    }
    const px = mx + (scene.pl.rx + 0.5) * TILE * k, py = my + (scene.pl.ry + 0.5) * TILE * k;
    ctx.fillStyle = '#7fe8ff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center';
    if (scene.region) drawLabel(ctx, scene.region, mx + mw / 2, my + mh + 11, '#ffe7a8');
    // 進入新區域：上方中間顯示區域名稱 2.5 秒（淡入淡出）
    const t = gameNow - (scene.regionAt || -1e9);
    if (scene.region && t < 2500) {
        ctx.globalAlpha = t < 300 ? t / 300 : t > 2000 ? (2500 - t) / 500 : 1;
        const by = W > H * 2 ? H * 0.22 : H * 0.18;
        ctx.font = 'bold 20px serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(`— ${scene.region} —`, W / 2, by); ctx.fillStyle = '#f2d9a0'; ctx.fillText(`— ${scene.region} —`, W / 2, by);
        ctx.font = '11px sans-serif'; ctx.lineWidth = 3;
        const z = currentZone(), sub = z && z.lv ? `建議等級 Lv.${z.lv[0]}～${z.lv[1]}` : zoneTitle();
        ctx.strokeText(sub, W / 2, by + 18); ctx.fillStyle = '#d8ccb0'; ctx.fillText(sub, W / 2, by + 18);
        ctx.globalAlpha = 1;
    }
    ctx.restore();
}
// 點小地圖：換算成格子，走到那裡（不能走的格子找附近最近能走的）；回傳 true＝點在小地圖上
function sceneMiniClick(sx, sy) {
    const r = scene.miniRect;
    if (!r || !(scene.bg && scene.bg.big) || sx < r.x || sy < r.y || sx > r.x + r.w || sy > r.y + r.h) return false;
    let tx = Math.floor((sx - r.x) / r.w * scene.mw), ty = Math.floor((sy - r.y) / r.h * scene.mh);
    if (scene.grid[ty] && scene.grid[ty][tx] !== 0) {
        let best = null, bd = 1e9;
        for (let y = Math.max(0, ty - 8); y <= Math.min(scene.mh - 1, ty + 8); y++) for (let x = Math.max(0, tx - 8); x <= Math.min(scene.mw - 1, tx + 8); x++) {
            const d = Math.hypot(x - tx, y - ty);
            if (scene.grid[y][x] === 0 && d < bd) { bd = d; best = [x, y]; }
        }
        if (!best) return true;
        [tx, ty] = best;
    }
    sceneWalkTo(tx, ty);
    if (scene.pl.path.length) scene.manualUntil = gameNow + MANUAL_HOLD_MS + scene.pl.path.length * 1000 / PLAYER_SPEED;
    return true;
}
// 大地圖換區：直接把所在地圖換成那個地圖（不重建畫面、不打斷正在打的怪；之後生的怪、掉落、經驗、任務、死亡回哪個村莊都照新地圖）
function sceneEnterZone(id) {
    const z = ZONE_BY_ID[id];
    if (!z) return;
    player.loc = { type: 'zone', id };
    addLog(`📍 進入${z.name}（建議 Lv.${z.lv[0]}～${z.lv[1]}）`, player.lv < z.lv[0] ? 'warn' : 'sys');
    if (player.lv < z.lv[0] - 5) showToast(`⚠️ ${z.name}建議 Lv.${z.lv[0]} 以上，小心！`, 2500);
}
// 瞬間移動卷軸（2026-10-18，第 51 節）：天堂式，把角色傳到同一個地圖裡隨機一格（離原地 10 格以上、沒有怪）；
// 大地圖只傳到目前地圖自己的區域內，格子地圖要走得到。畫面沒開（背景、離線）就只脫離戰鬥（combat.js leaveFight）
function sceneTeleport() {
    if (!scene || scene.key !== sceneKey() || player.loc.type !== 'zone') return false;
    const pl = scene.pl, rs = scene.bg && scene.bg.big && scene.bg.regions;
    let spot = null;
    for (let i = 0; i < 600 && !spot; i++) {
        const x = rand(1, scene.mw - 2), y = rand(1, scene.mh - 2), far = Math.abs(x - pl.x) + Math.abs(y - pl.y) >= (i < 400 ? 10 : 4);
        if (!far || !freeTile(x, y)) continue;
        if (scene.mons.some(m => !m.dead && Math.abs(m.x - x) + Math.abs(m.y - y) < 4)) continue;
        if (rs ? bigRegionAt(rs, x, y).zone !== player.loc.id : !findPath(pl.x, pl.y, x, y).length) continue;
        spot = [x, y];
    }
    if (!spot) return false;
    scene.effects.push({ x: pl.rx, y: pl.ry, t: 0, dur: 500, color: '#9fd8ff' });   // 原地留一道光
    pl.x = pl.rx = spot[0]; pl.y = pl.ry = spot[1];
    pl.path = []; pl.dest = null; pl.lunge = null; scene.moveMark = null; scene.engaged = null;   // 原本圍著的怪留在原地（leaveFight 後 sceneUpdate 會放回遊走）
    scene.effects.push({ x: pl.rx, y: pl.ry, t: 0, dur: 600, color: '#9fd8ff' });
    addFloat(pl.rx, pl.ry - 0.6, '瞬間移動', '#9fd8ff');
    return true;
}
// 狀態列地點後面加上目前區域（ui.js renderStatus）
function sceneRegionName() {
    const r = scene && scene.region && scene.bg && scene.bg.big && player.loc.type === 'zone' && scene.key === sceneKey() ? scene.region : '';
    return r && r !== zoneTitle() ? r : '';   // 區域名跟地圖同名（低語海岸）就不重複
}

// 村莊房屋：石牆＋深色石板屋頂（屋頂佔上半、牆佔下半，有門窗）
function drawHouse(ctx, [hx, hy, hw, hh], camX, camY) {
    const x = hx * TILE - camX, y = hy * TILE - camY, w = hw * TILE, h = hh * TILE;
    const roofH = h * 0.58, wallY = y + roofH;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 6, y + h - 4, w, 8);
    ctx.fillStyle = '#8a7a62'; ctx.fillRect(x + 4, wallY, w - 8, h - roofH);           // 牆
    ctx.strokeStyle = 'rgba(40,30,20,0.5)'; ctx.lineWidth = 1;
    for (let yy = wallY + 7; yy < y + h; yy += 7) { ctx.beginPath(); ctx.moveTo(x + 4, yy); ctx.lineTo(x + w - 4, yy); ctx.stroke(); }
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x + w / 2 - 7, y + h - 18, 14, 18);          // 門
    ctx.fillStyle = '#e8c06a';
    ctx.fillRect(x + 12, wallY + 6, 9, 8); ctx.fillRect(x + w - 21, wallY + 6, 9, 8);   // 窗（暖光）
    ctx.fillStyle = '#4a5260';                                                          // 屋頂
    ctx.beginPath(); ctx.moveTo(x, wallY + 2); ctx.lineTo(x + 10, y); ctx.lineTo(x + w - 10, y); ctx.lineTo(x + w, wallY + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,24,30,0.6)';
    for (let yy = y + 6; yy < wallY; yy += 6) { ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + w - 3, yy); ctx.stroke(); }
    ctx.fillStyle = '#5b6474'; ctx.fillRect(x + 8, y - 2, w - 16, 4);                    // 屋脊
    ctx.fillStyle = '#6b5e50'; ctx.fillRect(x + w - 22, y - 10, 8, 12);                  // 煙囪
}

// NPC 名牌：深藍圓角框＋金邊，名字（亮金）＋功能（灰），記下範圍給點擊用
function drawNpcPlate(ctx, name, role, x, y, camX, camY, npc) {
    ctx.font = 'bold 11px sans-serif';
    const nw = ctx.measureText(name).width;
    ctx.font = '9px sans-serif';
    const rw = ctx.measureText(role).width;
    const w = nw + rw + 16, h = 17, left = x - w / 2, top = y - h / 2;
    ctx.fillStyle = 'rgba(16,24,40,0.88)';
    ctx.strokeStyle = 'rgba(150,170,210,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(left, top, w, h, 4) : ctx.rect(left, top, w, h); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = '#ffe7a8'; ctx.fillText(name, left + 6, y + 1);
    ctx.font = '9px sans-serif'; ctx.fillStyle = '#b8c0cc'; ctx.fillText(role, left + 10 + nw, y + 1);
    ctx.textAlign = 'center';
    if (scene.npcRects) scene.npcRects.push({ x0: left + camX, y0: top + camY, x1: left + w + camX, y1: top + h + camY, npc });
}

function drawLabel(ctx, text, x, y, color) {
    ctx.font = 'bold 11px sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.lineWidth = 1;
}

// ───────── 迴圈與點擊 ─────────
let sceneLast = 0;
function sceneFrame(ts) {
    sceneRaf = 0;
    const cv = $('scene-canvas');
    if (!cv || !player || !huntVisible()) return;
    if (!scene || scene.key !== sceneKey()) buildScene();
    const dt = Math.min(100, sceneLast ? ts - sceneLast : 16);
    sceneLast = ts;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d');
    // 畫面寬時放大格子（約顯示 28 格寬、最多 1.3 倍；比例對齊天堂 M 參考圖）
    // 手機外框拿掉拱門後地圖變高（2026-10-15）：再放大到地圖蓋滿整個畫面，不留上下黑邊
    const z = Math.max(clamp(W / (TILE * 28), 1, 1.3), H / (scene.mh * TILE), W / (scene.mw * TILE));
    scene.zoom = z;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0);
    if (!document.hidden) { sceneUpdate(dt); sceneDraw(ctx, W / z, H / z); }
    sceneRaf = requestAnimationFrame(sceneFrame);
}

function startScene() {
    if (!sceneRaf) { sceneLast = 0; sceneRaf = requestAnimationFrame(sceneFrame); }
}

function sceneClick(ev) {
    if (!scene) return;
    const cv = $('scene-canvas'), r = cv.getBoundingClientRect();
    const z = scene.zoom || 1;
    const wx = (ev.clientX - r.left) / z + scene.cam.x, wy = (ev.clientY - r.top) / z + scene.cam.y;
    if (player.loc.type === 'zone' && !walkHome && sceneMiniClick((ev.clientX - r.left) / z, (ev.clientY - r.top) / z)) return;   // 大地圖小地圖
    if (player.loc.type === 'zone') { sceneZoneClick(wx, wy); return; }
    const plate = (scene.npcRects || []).find(p => wx >= p.x0 && wx <= p.x1 && wy >= p.y0 && wy <= p.y1);
    if (plate) { npcOpen(plate.npc); return; }   // 只有點名牌才開 NPC（2026-10-16 使用者要求，點身體不觸發）
    const other = presHit(wx, wy);   // 其他在線玩家（presence.js）
    if (other) { presMenu(other); return; }
    sceneWalkTo(Math.floor(wx / TILE), Math.floor(wy / TILE));
}

// 野外點擊（ARPG 手動操作）：點怪＝改打牠／把牠拉進戰鬥（沒掛機會自動開始）；點地面＝走過去，之後 2.5 秒不自動尋怪
function sceneZoneClick(wx, wy) {
    if (walkHome) return;
    let hit = null, bd = 0.85;
    for (const m of scene.mons) {
        if (m.dead) continue;
        const d = Math.hypot(wx / TILE - (m.rx + 0.5), wy / TILE - (m.ry + 0.3));
        if (d < bd) { bd = d; hit = m; }
    }
    if (hit) {
        if (hit.inst) focusMob(hit.inst);
        else {
            const inst = pullMob(hit.mid);
            if (!inst) { showToast('圍上來的怪太多了，先解決眼前的敵人'); return; }
            hit.inst = inst; hit.icon = inst.icon; hit.name = inst.name; hit.lastHp = inst.hp;
        }
        scene.manualUntil = 0;
        scene.focusUntil = gameNow + RELOCK_MS;   // 玩家自己點的目標：5 秒內不會被「先打身邊的怪」換掉
        scene.effects.push({ x: hit.rx, y: hit.ry, t: 0, dur: 350, color: '#ffe7a8' });
        updateHuntLive();
        return;
    }
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    sceneWalkTo(tx, ty);
    if (scene.pl.path.length) scene.manualUntil = gameNow + MANUAL_HOLD_MS + scene.pl.path.length * 1000 / PLAYER_SPEED;
}

// 村莊自由移動：點到可走的格子就走過去；點到牆／建築就走到最近的旁邊
function sceneWalkTo(tx, ty) {
    const pl = scene.pl;
    if (tx < 0 || ty < 0 || tx >= scene.mw || ty >= scene.mh || (tx === pl.x && ty === pl.y)) return;
    // 正在兩格之間走：從下一格起算，避免倒退
    const sx = pl.path.length ? pl.path[0][0] : pl.x, sy = pl.path.length ? pl.path[0][1] : pl.y;
    let path = freeTileFor(tx, ty) ? findPath(sx, sy, tx, ty, false) : [];
    if (!path.length) path = findPath(sx, sy, tx, ty, true);
    if (!path.length && !(sx === tx && sy === ty)) return;
    pl.path = (pl.path.length ? [pl.path[0]] : []).concat(path);
    const end = pl.path[pl.path.length - 1] || [sx, sy];
    pl.dest = [end[0], end[1]];   // 路上被怪擋住時用來重新找路
    scene.moveMark = { x: end[0], y: end[1], t: 0 };
}

// 方向鍵／WASD：按住的最後一個方向
const sceneKeys = [];
const SCENE_KEY_DIRS = {
    ArrowUp: [0, -1, 'up'], ArrowDown: [0, 1, 'down'], ArrowLeft: [-1, 0, 'left'], ArrowRight: [1, 0, 'right'],
    w: [0, -1, 'up'], s: [0, 1, 'down'], a: [-1, 0, 'left'], d: [1, 0, 'right'],
};
function sceneKeyDir() { return sceneKeys.length ? SCENE_KEY_DIRS[sceneKeys[sceneKeys.length - 1]] : null; }
function sceneKeyName(ev) { return ev.key.length === 1 ? ev.key.toLowerCase() : ev.key; }
document.addEventListener('keydown', ev => {
    const k = sceneKeyName(ev);
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!scene || !player || !huntVisible() || walkHome) return;
    const barKey = BAR_KEYS.indexOf(k);   // 快捷欄：1～8、Q E R F Z X C V（hotbar.js）
    if (!SCENE_KEY_DIRS[k] && barKey < 0) return;
    const t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const dl = $('dialog-layer');
    if (dl && dl.classList.contains('active')) return;
    ev.preventDefault();
    if (barKey >= 0) { if (!ev.repeat) barUse(barKey); return; }
    if (!sceneKeys.includes(k)) sceneKeys.push(k);
    scene.pl.path = scene.pl.path.slice(0, 1);   // 改用鍵盤：取消點地圖的路線（走完這一格）
    scene.moveMark = null;
});
document.addEventListener('keyup', ev => {
    const i = sceneKeys.indexOf(sceneKeyName(ev));
    if (i >= 0) sceneKeys.splice(i, 1);
});
window.addEventListener('blur', () => { sceneKeys.length = 0; });
