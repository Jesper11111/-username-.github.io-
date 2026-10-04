// 玩家與戰鬥的全域執行狀態（依賴 config-maps.js 的 maps，需在其後載入）
let player = {
    name: "韓立",
    gender: "male",
    realmIndex: 0, stage: 1, exp: 0,
    level: 1, levelExp: 0,       // 人物等級（與境界獨立，上限 MAX_PLAYER_LEVEL）
    lifespan: 60,                // 剩餘壽元（年），歸零即身死道消、重新開始
    age: 16,                     // 年齡（歲），隨歲月流逝增加（LIFESPAN_START_AGE 起算）
    avatarId: null,              // 目前使用的頭像（config-avatars.js 的 id；null = 依性別預設）
    unlockedAvatars: [],         // 已解鎖的頭像 id，永久保留（avatar.js）
    avatarFrameId: null,         // 配戴中的頭像光環 id（config-avatar-frames.js；null = 不戴）
    unlockedFrames: [],          // 已解鎖的頭像光環 id，永久保留
    merit: 0,                    // 功德：斬殺敵對陣營修士取得，滿 MERIT_PER_BUTIAN_STONE 自動凝結七彩補天石（merit.js）
    butianStones: 0,             // 七彩補天石：千寶閣珍貴物資的貨幣
    breakPills: 0,               // 破障丹：渡劫時自動服用
    evilKills: 0,                // 累計斬殺修士數（野外修士、暗殺者、懸賞人物）
    karma: 0,                    // 善惡值 -3000 ~ 3000（介面只顯示善／中立／惡，merit.js）
    bountyBoard: [],             // 當期懸賞榜 6 名（bounty.js）
    bountyRefreshAt: 0,          // 懸賞榜下次刷新的時間戳
    bountyFaction: null,         // 目前榜單列的是哪個陣營（"正"/"邪"），陣營改變時重抽
    activeBountyIds: [],         // 已接取、追蹤中的懸賞（可同時追蹤多名，2026-09-27；舊存檔的 activeBountyId 由 bounty.js 的 getTrackedBountyIds 轉換）
    bountyKills: 0,              // 累計懸賞伏誅數
    hp: 100, maxHp: 100, mp: 100, maxMp: 100, coins: 0, reputation: 0,
    stats: { str: 10, con: 10, int: 10, spr: 10, cha: 10 },
    studyCounts: { str: 0, con: 0, int: 0, spr: 0 },
    elementStudy: {},            // 藏書閣第二階段屬性秘典的參悟次數 { metal, wood, ... }（library.js 的 elementBooks）
    spiritGrass: 0, beastCore: 0, martialPoints: 0,
    ore: 0,                      // 礦石：礦脈採礦（傳說僕從）取得，用於符寶坊煉製符寶
    talismans: {},               // 持有的符寶 { "種類_品階": 數量 }（talisman.js）
    fireShards: 0,               // 異火碎片：未來秘境掉落，每 STRANGE_FIRE_SHARDS_PER_FIRE 片合成 1 朵異火（strange-fire.js）
    strangeFires: 0,             // 異火總朵數（含重複）：降低秘境中受到的傷害
    fireCollection: {},          // 天下異火收錄 { 異火 id: 取得次數 }，每種永久加成一次（config-strange-fire.js）
    casino: {},                  // 天星賭坊紀錄（今日下注／輸贏、累計切石／擲骰等，casino.js 的 getCasinoState 補齊欄位）
    partners: [],                // 已結識的夥伴 id（情緣系統，partner.js）
    partnerTeam: [],             // 隊伍中的夥伴 id（最多 PARTNER_TEAM_MAX 名，好感需達「熟識」）
    partnerBond: {},             // 各夥伴好感度 { id: { pts, greet, giftDate, gifts, quest, teamKills } }
    fieldKills: 0,               // 累計野外擊殺（情緣任務用）
    // 裝備系統（第 37 節）
    starIron: 0,                 // 星允鐵：強化／進化用（enhance.js）
    refineStones: 0,             // 洗煉石：洗煉裝備詞條用（enhance.js，第 67 節 D2）
    craftCur: { tianji: 0, hunyuan: 0, poxu: 0, zaohua: 0 },
    lingStones: { "金": 0, "木": 0, "水": 0, "火": 0, "土": 0 },   // 五行傳送陣靈石：進出靈界各要一套（lingjie.js，第 74 節）
    inLingjie: false,            // 身在靈界（飛升後；回人界要再付一套）   // 做裝通貨：天機石／混元晶／破虛石／造化玉（craft.js，第 69 節）
    talents: {},                 // 天賦樹：{ 節點 id: 點數 }（talent.js，第 68 節）
    talentRespecs: 0,            // 天賦已重置次數
    ironShards: 0,               // 碎鐵：分解白～紫取得，每 SHARDS_PER_IRON 個自動合成 1 顆星允鐵
    gearStash: [],               // 暫存區：背包滿時新掉落的橙色以上裝備（上限 GEAR_STASH_MAX，滿了不能外出練功）
    ironShop: null,              // 千寶閣星允鐵每日限購 { date, bought }
    ironUsed: 0,                 // 累計用掉的星允鐵（稱號用）
    maxEnhance: 0,               // 達過的最高強化等級（稱號用）
    gearCodex: {},               // 天磯錄收藏 { gearId: [取得過的品級, …] }（codex.js）
    titles: [],                  // 已達成的稱號 id（codex.js）
    activeTitle: null,           // 顯示在道號旁的稱號 id
    profession: null,            // 主修職業 id（profession.js）
    profSwitched: false,         // 是否已選過主修（第一次免費，之後改修要付靈石）
    proficiency: {},             // 各職業熟練度 { sword: 12345, … }
    herbs: { mortal: 0, high: 0, epic: 0, immortal: 0 },
    bag: {},
    equipInventory: [],
    equipment: {
        "劍": null, "刀": null, "扇": null, "弓": null, "笛": null, "筆": null,
        "頭": null, "內衣": null, "盔甲": null, "手套": null, "長靴": null, "披風": null,
        "腰帶": null, "項鍊": null, "戒指": null, "耳環": null, "腰牌": null,
        "神器": null
    },
    // 每位僕從自帶 quest（負責的任務代號）與 timer（自身進度），可各自指派不同任務
    servants: [],
    // 每隻靈寵：{ id, level, exp, alive, skills: [6 格，已選的五行屬性或 null] }
    beasts: [],
    activeQuest: null, questTimer: 0,   // 玩家「親自」執行的任務（須待在宗門）
    currentMap: maps[0].items[0], currentMapIsSafe: true,
    raceKills: {},   // 斬妖錄：各種族累計斬殺數（race.js；舊存檔沒有此欄位時 getRaceKills 視為 0）
    raceTreasures: [],             // 剋制法寶（race.js，第 62 節第 4 期；舊存檔沒有時 raceTreasureState 補上）
    raceTreasureSlots: [null, null],
    sect: null, buffTimer: 0, buffMult: 1,
    sectSkills: { 1: null, 2: null, 3: null },   // 各階段已拜入（並學得技能）的宗門名稱，選定後鎖定
    learnedSkills: [],
    spells: [],                  // 已學會的仙法 id（config-spells.js／spells.js，目前尚無取得方式）
    spellSlots: [],              // 技能格內的主動仙法 id（格數依人物等級）
    lingbaoSold: [],             // 靈寶閣已兌換（售出）的唯一性商品 id，售出後永不補貨
    reincarnations: 0,
    reincarnateBonus: { hp: 0, mp: 0 },   // 轉世保留的氣血／靈力上限（前世上限的 REINCARNATE_KEEP_RATE）
    pendingTribulation: false,   // 小境界已滿 10 階，修為暫停、等待渡劫
    weakened: false,             // 虛弱：渡劫失敗後直到升回 10 階前，攻擊與氣血／靈力上限 -30%（stats.js 的 getWeaknessMult）
    tribulationCount: 0,         // 累計渡劫成功次數

    // 活動：每日任務與千寶閣（皆以時間戳判斷是否該刷新）
    dailyQuests: [],             // 當期 10 項每日任務
    dailyRefreshAt: 0,           // 每日任務下次刷新的時間戳
    dailyStats: {},              // 當期各類型累計次數（刷新時清空）
    auctionItems: [],            // 千寶閣當期 5 件商品
    auctionRefreshAt: 0,         // 千寶閣下次上架的時間戳
    idleProvenMap: null,         // 線上實際撐過 IDLE_PROVEN_SECONDS 秒的野外地圖名稱；背景／離線結算信任此圖打得過（被妖獸打死時清除）
    paidRefresh: {},             // 今日付費刷新次數 { date: 當地日期字串, auction, bounty }（activity.js 的 getPaidRefreshState）
    autoHp: { enabled: false, threshold: 50 },
    autoMp: { enabled: false, threshold: 30 },
    lastSaveTime: Date.now()
};

// 全新角色的預設值快照：讀檔／匯入一律「合併到這份預設值」而不是目前的 player，
// 否則匯入缺欄位的舊存檔時，會把目前角色的等級、宗門技能等資料帶進新存檔（見 save.js 的 applySaveData）
const DEFAULT_PLAYER_JSON = JSON.stringify(player);

let enemies = [];
let respawnTimer = 0;
let safeZoneTimer = 0;

// 以下為「不寫入存檔」的執行期狀態：重新整理後即歸零
let inTribulation = false;   // 是否正在與心魔對決
let heartDemon = null;       // 心魔實體 { name, icon, hp, maxHp, attack, buffTimer, buffMult }
let tribulationFatedWin = false;   // 開打時依勝算擲出的天命（true = 此次渡劫必定成功）
let inBountyDuel = false;    // 是否正在與懸賞人物一對一對決（bounty.js）
let duelOpponent = null;     // 懸賞對決的對手 { name, title, icon, hp, maxHp, attack, attrs, status, skills, ... }
let duelWeakenTimer = 0, duelWeakenMult = 1;   // 對手的「化功」：你的攻擊 × duelWeakenMult（以你的回合數倒數）
let duelSilenceTimer = 0;    // 對手的「封印」：只能普攻
let duelArmorTimer = 0;      // 對手的「破甲」：你的減傷與閃避減半
let potionCooldownHp = 0;    // 氣血類藥品剩餘冷卻秒數
let potionCooldownMp = 0;    // 靈力類藥品剩餘冷卻秒數
let gameOver = false;        // 壽元耗盡：停止戰鬥與存檔，等待重新載入
let lastTickAt = 0;          // 上一次 combatTick 的時間（背景補發用，save.js 的 checkBackgroundCatchUp）
let missedTickMs = 0;        // 背景期間被瀏覽器延後、尚未補發的毫秒數
let waveSummary = null;      // 本波戰鬥累計 { kills, exp, coins, rep, rounds }，一波結束寫一則彙總日誌（combat.js）
let meditateSummary = { seconds: 0, exp: 0 };   // 安全區打坐累計，每 MEDITATE_LOG_SECONDS 秒寫一則日誌（combat.js）
let fieldOnlineTicks = 0;   // 在目前野外地圖實際戰鬥的秒數（換地圖歸零；滿 IDLE_PROVEN_SECONDS 記入 player.idleProvenMap）
let playerStatus = { frozen: 0, burn: null, poison: null };   // 玩家身上的凍結/燒傷/中毒（elements.js）

// 靈寵輔助效果，皆以回合數倒數（beast-combat.js）
//   petBuff*：攻擊增益（stats.js／numeric.js 讀取）；petShield*：受傷減少（仙法守護、神器也共用）；petRegen*：持續回血
//   petFx：2026-09-29 技能改版新增的其他增益／狀態 { 種類: { v, t } }：def／eva／crit／combo／hit／lifesteal／armorPen／mpRegen，
//          以及 immune（t 回合內自動淨化，v = 要清除的狀態陣列）
let petBuffTimer = 0, petBuffMult = 1;
let petShieldTimer = 0, petShieldRate = 0;
let petRegenTimer = 0, petRegenRate = 0;
let petFx = {};
// 護盾（受傷減少）依來源分開（2026-09-29，閃避減傷上限分「玩家本身 20／靈寵 10／夥伴 10」）：
//   petShield* = 靈寵、partnerShield* = 夥伴絕學、selfShield* = 宗門技能守護、神器與職業技能護盾；都在 applyPetDamageReduction 套用、petAssistTick 倒數
let partnerShieldTimer = 0, partnerShieldRate = 0;
// 靈寵與夥伴的靈力（不存檔，進遊戲時是滿的）：{ 靈寵 id／夥伴 id: 目前靈力 }（beast-combat.js、partner.js）
let beastMp = {}, partnerMp = {};
let selfShieldTimer = 0, selfShieldRate = 0;
