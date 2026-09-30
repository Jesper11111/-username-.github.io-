// 奇遇・異界空間與機緣（ARCHITECTURE.md 第 63 節；邏輯在 encounter.js）
// 2026-10-01 使用者要求：把闖關（虛天殿）、戰棋（血色禁地）、三界戰場三種玩法放進奇遇系統，
//   切換地圖達到某種順序／次數、或隨機時間點觸發，跳出通知；玩家進入異界空間後強制參加（不能中途離開，只能認輸）。
// 使用者選擇：三種一次做完、觸發後「封存到玩家回來」（點入口才進入）、每天 1～2 次。
// 同日第二批（使用者要求「更多機緣探索、支線任務、小遊戲、寵物競賽；奇遇可以碰見尊者或帝境強者」）：
//   機緣：強者現身、靈獸競速、古洞尋寶、丹爐試火；機緣任務（支線）；所有奇遇都掉「下品武學秘典碎片」（config-spells.js）

// 每日上限：異界（虛天殿、血色禁地）與機緣（四種小遊戲）分開計；三界戰場每週一次另計
const ENCOUNTER_DAILY_MAX = 2;          // 異界
const ENCOUNTER_CHANCE_DAILY_MAX = 3;   // 機緣
const ENCOUNTER_PENDING_MAX = 4;        // 同時封存的奇遇上限，滿了不再觸發
const ENCOUNTER_EXPIRE_HOURS = 24;      // 封存多久沒進入就消散（三界戰場到當週結束）

// ① 秘密路線 → 虛天殿現世（闖關）：依序前往這些地圖，整段在 routeMinutes 分鐘內完成
const ENCOUNTER_ROUTE = { maps: ["宗門", "天南城", "天星城", "宗門"], routeMinutes: 10 };
// 路線傳聞：進入天星城時有機率在日誌聽到（玩家唯一的線索）
const ENCOUNTER_RUMOR = { map: "天星城", chance: 0.12,
    text: "🍵 茶樓角落有人壓低聲音：「……從宗門出發，過天南、再到天星，最後回宗門，虛天殿就會現世……」" };
// ② 累計次數 → 血色禁地開啟（戰棋）：每進入野外 fieldEnters 次觸發一次（當日已達上限時保留到隔天第一次進野外）
const ENCOUNTER_COUNT = { fieldEnters: 30 };
// ③ 空間裂縫：進入野外地圖時的機率；依權重抽玩法
const ENCOUNTER_RIFT = { chance: 0.04, pool: { rogue: 3, tactics: 3, master: 2, dig: 2 } };
// ④ 城中機緣：進入天南城／天星城時的機率（宗門不算）
const ENCOUNTER_TOWN = { maps: ["天南城", "天星城"], chance: 0.08, pool: { petrace: 2, alch: 2, master: 1 } };

// 分類：otherworld 佔異界次數、chance 佔機緣次數、weekly 不佔
const ENCOUNTER_TYPES = {
    rogue:   { cat: "otherworld", name: "虛天殿", icon: "🏯", title: "虛天殿現世", desc: "古修遺留的八層殿堂，一路往下闖，最深處有守鼎傀儡。" },
    tactics: { cat: "otherworld", name: "血色禁地", icon: "🩸", title: "血色禁地開啟", desc: "墨蛟盤踞的禁地。帶著夥伴與靈寵排兵布陣，擊敗墨蛟。" },
    arena:   { cat: "weekly", name: "三界戰場", icon: "⚔️", title: "三界戰場降臨", desc: "人界、靈界、魔界千名修士齊聚，海選五輪、百強淘汰，爭奪三界至尊。" },
    master:  { cat: "chance", name: "強者現身", icon: "🌟", title: "強者現身", desc: "一位尊者或帝境強者途經此地，留下一段機緣。" },
    petrace: { cat: "chance", name: "靈獸競速", icon: "🐎", title: "靈獸競速大會", desc: "城中舉辦靈獸競速，帶著你的靈寵上場（沒有靈寵可借一隻）。" },
    dig:     { cat: "chance", name: "古洞尋寶", icon: "⛏️", title: "古洞現世", desc: "山壁崩開一座古修洞府，帶著靈鋤挖掘遺寶，小心機關。" },
    alch:    { cat: "chance", name: "丹爐試火", icon: "⚗️", title: "丹爐試火", desc: "丹道前輩邀你試掌爐火，五爐火候定丹品。" }
};
const ENCOUNTER_SOURCES = { route: "秘密路線", count: "禁地感應", rift: "空間裂縫", weekly: "三界召令", town: "城中機緣" };

// 實力換算：奇遇裡用小數字，玩家相對「同境界一般玩家」的強弱（numeric.js 的 nv2Typ*）換成倍率，夾在範圍內
const ENCOUNTER_POWER_CLAMP = [0.6, 1.8];

// 機緣任務（支線）：進天南城／天星城時 questChance 機率接到托付（同時只有一個，每日最多 questDaily 個），三步完成
//   步驟種類：visit（前往某地圖）、kill（野外擊殺 N 隻，以 player.fieldKills 增量計，離線也算）
const ENCOUNTER_QUEST = {
    chance: 0.12, daily: 2, expireHours: 48,
    templates: [
        { name: "散修遺願", intro: "垂死的散修托你把遺物送回故里。", steps: ["field", "kill", "town"] },
        { name: "古籍殘頁", intro: "書肆老闆說有一頁秘典殘頁流落野外。", steps: ["town", "field", "kill"] },
        { name: "妖獸作亂", intro: "城外妖獸作亂，城主張榜求助。", steps: ["field", "kill", "field"] },
        { name: "丹方尋藥", intro: "丹師缺一味靈藥，請你到野外採回。", steps: ["field", "kill", "town"] }
    ],
    killN: [40, 120]
};

// 獎勵：H＝目前境界每小時練功收入（economy.js 的 getHourlyIncome）；法寶品階 0 下品／1 中品／2 上品（config-race.js）
//   spell＝下品武學秘典碎片（config-spells.js，100 片合成）
const ENCOUNTER_REWARDS = {
    rogue: {
        perFloorH: 0.25, perFloorSpell: 2,     // 每闖過一層（失敗也保留）
        clearH: 3, clearFire: [20, 40], clearIron: 30, clearSpell: 15,
        firstClearTreasure: 1                  // 第一次通關：中品剋制法寶（種族隨機）
    },
    tactics: {
        winH: 3, fastTurns: 6, fastH: 1,       // 6 回合內獲勝多 H×1
        winFire: [15, 30], winSpell: 12,
        partner: { tiers: ["天驕", "尊者"], chance: 0.6, amount: [5, 10] },
        firstWinTreasure: 1,                   // 第一次勝利：中品降妖葫蘆（妖獸）
        loseH: 0.5, loseSpell: 3
    },
    arena: {
        swissWinH: 0.5, swissWinSpell: 2,      // 海選每勝一場
        place: {                               // 依最終名次（百強起）；supreme＝至高夥伴碎片
            100: { h: 4, spell: 8 }, 64: { h: 6, spell: 10 }, 32: { h: 8, spell: 12 }, 16: { h: 12, spell: 16 },
            8: { h: 16, butian: 1, spell: 20 }, 4: { h: 24, butian: 2, spell: 30, supreme: [5, 8] },
            2: { h: 32, butian: 3, treasure: 1, spell: 40, supreme: [10, 15] },
            1: { h: 48, butian: 5, treasure: 2, spell: 60, supreme: [20, 30] }
        }
    },
    // 強者現身：遇到哪個評級（帝境機率）、三種應對的碎片量與秘典碎片
    master: {
        emperorChance: 0.3,
        shards: { "尊者": [8, 12], "帝境": [10, 15] },
        ask:   { mult: 1,   spell: 5 },                           // 虛心請教：穩定
        duel:  { winMult: 2.2, loseMult: 0.6, spell: 10, baseWin: 0.35, emperorWin: 0.8 },   // 斗膽切磋：勝率 0.35 × 實力倍率（帝境再 ×0.8），夾 15%～70%
        guard: { mult: 1.6, spell: 8, costH: 1 },                // 奉上靈石為其護法：花 H×1
        metBond: 60                                              // 遇到已結識的夥伴：改加好感
    },
    petrace: {   // 依名次
        place: { 1: { h: 1.5, spell: 20, core: 3000 }, 2: { h: 0.8, spell: 10, core: 1500 }, 3: { h: 0.5, spell: 6, core: 800 } },
        other: { h: 0.2, spell: 2 }
    },
    dig: { spellPage: 8, bagH: 0.3, fire: [5, 10], relicIron: 20, relicSpell: 15 },
    alch: {      // 五爐總分 0～10
        grades: [
            { min: 9, name: "極品", h: 1,   spell: 20, breakPills: 1 },
            { min: 6, name: "上品", h: 0.8, spell: 12 },
            { min: 3, name: "中品", h: 0.5, spell: 6 },
            { min: 0, name: "廢丹", h: 0.1, spell: 2 }
        ]
    },
    quest: { h: 2, spell: 25 }
};
