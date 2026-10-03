// 地圖區域資料：分類、安全區標記、經驗倍率、難度、進入限制
// thumb（選填）= 修仙地圖卡片上的縮圖（images/maps/，建議 720px 寬的橫圖），沒有就只顯示文字
// thumbFemale（選填）= 女修玩家看到的縮圖（沒填就男女都用 thumb；map.js 的 getMapThumb）

// 宗門（唯一的安全區）：待在這裡時，所有宗門設施（任務/靈田/靈獸園/靈寶閣/藏書閣/鍛造閣/煉丹房）都可使用
// 舊版的「洞府 / 弟子居」「演武學宮」「後山禁地」已合併進來，舊存檔由 save.js 的 migrateCurrentMap() 轉換
const SECT_MAP_NAME = "宗門";

// monsterAtk／monsterHp（選填）= 直接指定妖獸攻擊／氣血；沒填就用 攻擊 = diff × 50、氣血 = diff × 500（combat.js 的 getMapMonsterStats）
// 新制（NUMERIC_V2，第 52 節）不看 diff：nv2L = 妖獸對應的成長位置（境界 + (階 − 1)/10，例 6 = 煉虛 1 階），
//   妖獸強度由 numeric.js 的 nv2MonsterStats 依「同境界一般玩家」算出；nv2MinStat = 新制的四維進入門檻（取代 minStat）；nv2AtkMult（選填）= 妖獸攻擊倍率
// ⚠️ coins = 每擊殺一隻的「平均」靈石（實際為 ±20% 隨機，見 combat.js 的 rollKillCoins）。
//    舊版用 diff × (8~12) 計算，難度一放大靈石就爆量（混沌初界每小時 22 億），因此改為各地圖獨立設定。
//    換算方式：滿速掛機每小時約 KILLS_PER_HOUR_ESTIMATE 隻 → 每小時靈石 ≈ coins × 1160。
//    調整靈石產出時只要改這裡的 coins，不要再動 diff（diff 只決定怪物強度與經驗/聲望以外的難度感）。
const KILLS_PER_HOUR_ESTIMATE = 1160;   // 實測值：波次之間有 5 秒刷新，滿速約每秒 0.32 隻
                                        // （2026-09-28 刷新改 10 秒後實際擊殺變少，但每隻收益乘 KILL_REWARD_MULT，換算成「等效擊殺」仍是此值）

const maps = [
    // 城鎮（安全區，不編號；戰鬥區為第一～五區）。⚠️ items[0] 必須是宗門：死亡回城、渡劫失敗、暫存區滿等都用 changeMap(0, 0)／maps[0].items[0] 代表宗門。
    // 宗門標 hidden，不列在修仙地圖裡，只能按洞府的「宗門」回去（map.js 的 returnToSect）。
    // 城鎮是安全區、可打坐，但不是宗門，宗門設施不能用（isInSect 只認 SECT_MAP_NAME）。
    { category: "城鎮 (安全區)", isSafe: true, items: [
        { name: SECT_MAP_NAME, expRate: 3, diff: 1, coins: 0, hidden: true },
        // 天南城：點擊傳送並進城，城內場景＝天南市集（config-towns.js 的 townScenes["天南城"]；2026-09-30 使用者要求市集放進天南城，不再是獨立地圖）
        { name: "天南城", expRate: 3, diff: 1, coins: 0,   // 縮圖：御劍俯瞰天南城，男修／女修各一張
          thumb: "images/maps/tiannan-city-male.jpg", thumbFemale: "images/maps/tiannan-city-female.jpg" },
        { name: "天星城", expRate: 3, diff: 1, coins: 0, thumb: "images/maps/tianxing-city.jpg" }   // 亂星海的主城；第二區已有戰鬥地圖「亂星海」，名稱不可重複
    ]},
    { category: "一、野外歷練 (戰鬥區)", isSafe: false, items: [
        //                                                      coins   ≈ 每小時上限
        { name: "靈山大川", expRate: 8, diff: 2, coins: 20, nv2L: 0, nv2AtkMult: 0.7, suit: [0, 1] },   // 新手圖：新制妖獸攻擊 ×0.7（剛入門沒有宗門技能也不會戰死）        //   2.3 萬
        { name: "深淵險地", expRate: 20, diff: 50, coins: 80, nv2L: 2, suit: [2, 2] },       //   9.3 萬
        { name: "上古遺跡", expRate: 50, diff: 350, coins: 250, nv2L: 3, suit: [3, 3] }      //  29 萬
    ]},
    { category: "二、開放世界大區域 (高難度戰鬥)", isSafe: false, items: [
        { name: "天南", expRate: 100, diff: 40000, coins: 1000, nv2L: 4, suit: [4, 4] },      // 116 萬
        { name: "亂星海", expRate: 300, diff: 100000, coins: 1650, nv2L: 5, suit: [5, 5] },    // 191 萬（上限 200 萬）
        { name: "鬼谷八荒", expRate: 1000, diff: 300000, coins: 2450, nv2L: 6, suit: [6, 6] }, // 284 萬（上限 300 萬）
        // 2026-09-30 使用者新增：煉虛可進、經驗 1200；妖獸固定煉虛 10 階（nv2FixedL）、強度 5～10 倍（nv2Str，一般地圖 1.5～3）。
        //   nv2L 6 ＝ 境界壓制以煉虛 1 階起算（煉虛玩家不吃壓制）；靈石介於鬼谷八荒與崑吾山之間
        { name: "墜魔谷", expRate: 1200, diff: 500000, coins: 2550, minRealm: 6, nv2L: 6, nv2FixedL: 6.9, nv2Str: [5, 10], suit: [6, 6] } // 296 萬
    ]},
    { category: "三、上古禁區 (煉虛解鎖·高難)", isSafe: false, items: [
        // 2026-09-30 使用者要求「地圖依經驗排序」：本區由經驗低到高排列（同經驗時境界低的在前）；各區都照此規則，新增地圖時插在對應位置
        // 普通圖（2026-09-30 使用者要求「每個境界補一張普通圖」）：黑風海域／蠻荒古地／血天大陸／星空古路／九天仙域，妖獸照一般規則（隨玩家階數、強度 1.5～3 倍），
        //   經驗、靈石沿用挑戰圖改版前的數值，並當作修煉節奏表（config-realms.js）的主要練功圖 → 升階所需經驗不變
        // 挑戰圖（2026-09-30 使用者指定）：崑吾山／雷鳴大陸／天淵戰場／荒古禁地／太初古礦／上蒼，妖獸固定該境界 10 階（nv2FixedL）、強度 nv2Str（numeric.js）；靈石不變
        { name: "黑風海域", expRate: 1400, diff: 1000000, coins: 2700, minRealm: 7, minStat: 2000, nv2L: 7, nv2MinStat: 100, suit: [7, 7] },        // 合體・普通
        { name: "崑吾山", expRate: 1600, nv2FixedL: 7.9, nv2Str: [5, 10], diff: 1000000, coins: 2700, minRealm: 7, minStat: 2000, nv2L: 7, nv2MinStat: 100, suit: [7, 7] },         // 合體・挑戰
        { name: "蠻荒古地", expRate: 1900, diff: 3000000, coins: 2950, minRealm: 8, minStat: 2000, nv2L: 8, nv2MinStat: 100, suit: [8, 8] },        // 大乘・普通
        { name: "雷鳴大陸", expRate: 2100, nv2FixedL: 8.9, nv2Str: [8, 15], diff: 3000000, coins: 2950, minRealm: 8, minStat: 2000, nv2L: 8, nv2MinStat: 100, suit: [8, 8] },       // 大乘・挑戰
        { name: "血天大陸", expRate: 2500, diff: 6000000, coins: 3150, minRealm: 9, minStat: 2000, nv2L: 9, nv2MinStat: 100, suit: [9, 9] },        // 渡劫・普通
        { name: "天淵戰場", expRate: 3000, nv2FixedL: 9.9, nv2Str: [8, 20], diff: 6000000, coins: 3150, minRealm: 9, minStat: 2000, nv2L: 9, nv2MinStat: 100, suit: [9, 9] },       // 渡劫・挑戰
        { name: "星空古路", expRate: 3000, diff: 10000000, coins: 3350, minRealm: 10, minStat: 2000, nv2L: 10, nv2MinStat: 100, suit: [10, 10] },   // 仙人初境・普通
        { name: "荒古禁地", expRate: 5000, nv2FixedL: 10.9, nv2Str: [15, 25], diff: 10000000, coins: 3350, minRealm: 6, minStat: 2000, nv2L: 10, nv2MinStat: 100, suit: [10, 10] },      // 仙人初境・挑戰
        { name: "九天仙域", expRate: 5000, diff: 60000000, coins: 6900, minRealm: 11, minStat: 2000, nv2L: 11, nv2MinStat: 100, suit: [11, 11] },   // 天仙・普通
        { name: "太初古礦", expRate: 6500, nv2FixedL: 10.9, nv2Str: [15, 30], diff: 20000000, coins: 4200, minRealm: 6, minStat: 2000, nv2L: 10.5, nv2MinStat: 100, suit: [10, 11] },      // 仙人初境・挑戰
        { name: "上蒼（葬天島）", expRate: 8000, nv2FixedL: 11.9, nv2Str: [15, 40], diff: 60000000, coins: 6900, minRealm: 6, minStat: 2000, nv2L: 11, nv2MinStat: 100, suit: [11, 11] } // 天仙・挑戰
    ]},
    // 第四區由原禁區後半拆出（2026-09-27），數值與第三區共用同一組分類倍率
    { category: "四、幽冥禁域 (仙人解鎖·高難)", isSafe: false, items: [
        { name: "不死山", expRate: 6000, diff: 5000000000, coins: 7300, minRealm: 10, minStat: 5000, nv2L: 12, nv2MinStat: 160, suit: [12, 12] },       // 847 萬
        { name: "神墟", expRate: 7000, diff: 10000000000, coins: 7750, minRealm: 10, minStat: 5000, nv2L: 12.3, nv2MinStat: 160, suit: [12, 12] },         // 899 萬
        { name: "仙陵", expRate: 8000, diff: 50000000000, coins: 8200, minRealm: 10, minStat: 5000, nv2L: 12.6, nv2MinStat: 160, suit: [12, 12] },         // 951 萬
        { name: "冥界", expRate: 9000, diff: 150000000000, coins: 8400, minRealm: 10, minStat: 5000, nv2L: 12.9, nv2MinStat: 160, suit: [12, 12] }         // 974 萬（上限 1000 萬）
    ]},
    // 上蒼之後（含諸天戰場）一律維持在每小時 800～1000 萬，不再隨難度放大；
    // 這幾張圖的差異改由經驗與聲望體現，靈石封頂。
    { category: "五、諸天至高戰場 (頂級戰場·極難)", isSafe: false, items: [
        { name: "仙界戰場", expRate: 15000, diff: 300000000000, coins: 8400, minRealm: 10, minStat: 10000, isTopBattle: true, nv2L: 13.5, nv2MinStat: 180, suit: [13, 13] },   // 974 萬
        { name: "萬界戰場", expRate: 25000, diff: 500000000000, coins: 8400, minRealm: 10, minStat: 10000, isTopBattle: true, nv2L: 14.5, nv2MinStat: 180, suit: [14, 14] },   // 974 萬
        { name: "混沌初界", expRate: 50000, diff: 1000000000000, coins: 8400, minRealm: 10, minStat: 10000, isTopBattle: true, nv2L: 15.5, nv2MinStat: 180, suit: [15, 15] }   // 974 萬
    ]}
];

// 安全區（宗門、天南城、天星城）在戰場實況右半邊顯示的圖（battle-fx.js 的 getBattleFoeImg）；
// 個別安全地圖可在自己的物件加 battleImg／battleImgPos 蓋過（目前沒有）
const SAFE_ZONE_IMG = { img: "images/maps/safe-zone.jpg", pos: "50% 45%" };   // 2026-09-29 玩家提供：雲霧峰頂的宗門殿宇與瀑布

// 每擊殺一隻妖獸獲得的聲望：依地圖分類（maps 的索引）隨機 1 ~ 上限，難度越高聲望越多。
// 安全區（索引 0）不會戰鬥，沒有對應值；找不到時退回 1 點。
const REPUTATION_MAX_BY_MAP_CATEGORY = {
    1: 3,     // 一、野外歷練
    2: 10,    // 二、開放世界
    3: 30,    // 三、上古禁區
    4: 30,    // 四、幽冥禁域（同上古禁區）
    5: 100    // 五、諸天至高戰場
};

// 離線掛機的「每秒戰鬥次數」：離線收益 = 離線秒數 × 此係數 × 每次的經驗/靈石。
// ⚠️ 舊值 0.7 等於假設離線每秒殺 0.7 隻，但線上滿速也只有每秒 0.32 隻，
//    造成離線收益是線上的 2.16 倍（關掉遊戲比掛機划算）。改為 0.3 後離線約為線上的 93%。
const OFFLINE_COMBAT_RATE = 0.3;
// 安全區打坐：經驗仍每 5 秒入帳，日誌每這麼多秒才彙總一則（2026-09-28 日誌減量）
const MEDITATE_LOG_SECONDS = 30;
// 野外一波全滅後，等多少秒刷新下一波（2026-09-28 由 5 秒改為 10 秒，減少戰鬥節奏與日誌量）
const MONSTER_RESPAWN_SECONDS = 10;
// 離線／背景依實力估算戰鬥效率用（save.js 的 estimateIdleCombat）：一波平均隻數（1～5 隻）、波與波之間的秒數（刷新＋生成 1 秒）
const IDLE_WAVE_AVG_MONSTERS = 3;
const IDLE_WAVE_GAP_TICKS = MONSTER_RESPAWN_SECONDS + 1;
// 刷新變慢的補償：一擊斬殺時每秒擊殺 = 3 ÷ (GAP + 3)，原設計（刷新 5 秒）為 3 ÷ 9；
// 每隻的經驗／靈石／聲望／熟練度，以及「每波」的遭遇機率（野外修士、暗殺者、懸賞人物）都乘上此倍率，
// 讓每小時收益與修煉節奏（realmPacing、KILLS_PER_HOUR_ESTIMATE、離線公式）維持刷新 5 秒時的設計值。
// 目前 10 秒 → (11 + 3) ÷ (6 + 3) ≈ 1.556。
const KILL_REWARD_MULT = (IDLE_WAVE_GAP_TICKS + IDLE_WAVE_AVG_MONSTERS) / (6 + IDLE_WAVE_AVG_MONSTERS);
// 線上實戰證明：在同一張野外地圖「線上實際戰鬥」連續撐過這麼多秒沒被妖獸打死，背景／離線結算就信任玩家打得過，
// 即使 estimateIdleCombat 判定一波撐不住（它不計自動補血、吸血、回血、護盾、靈寵），也不再把玩家送回宗門（save.js）
const IDLE_PROVEN_SECONDS = 60;

// 離線掛機的聲望倍率：離線每個戰鬥 tick 以「該區平均聲望 × 此倍率」計算。
// 0.7 × OFFLINE_COMBAT_RATE(0.3) ≈ 每秒 0.21 隻，約為線上的 65%（聲望刻意比線上少）。
// 改動前請重新實測，兩個係數要一起看。
const OFFLINE_REPUTATION_RATE = 0.7;

// 真正離線（關掉遊戲）的收益再打折（2026-09-28 使用者回報「離線掛機收益過高」，決定降到線上的 50%）：
//   上面兩個係數是「背景掛機」（縮小視窗、切 App、鎖螢幕）用的，約為線上的 93～95%（聲望 60%），手機玩家常鎖螢幕掛機，維持不變；
//   關掉遊戲的離線：戰鬥次數 × OFFLINE_REWARD_MULT（經驗、靈石、功德、熟練度、救僕從約為線上 50%），聲望改用 OFFLINE_REPUTATION_RATE_OFFLINE（約 50%）
//   實測（天南・元嬰、同配置 1 小時）：線上 經驗 355 萬／靈石 116 萬／聲望 6,933；修正前離線 337 萬／108 萬／4,158
//   安全區打坐（靜修）與僕從任務不打折
const OFFLINE_REWARD_MULT = 0.53;
const OFFLINE_REPUTATION_RATE_OFFLINE = 1.1;
// 離線最多結算幾秒（2026-09-28 使用者決定由 24 小時改為 12 小時）；背景補發同一個上限
const OFFLINE_MAX_SECONDS = 12 * 3600;

// 野外小怪的圖鑑、型態與各地圖的出沒組合：見 config-monsters.js（2026-10-03 起，ARCHITECTURE.md 第 66 節第 2 期）
