// 秘境「魔屠天南」：死守天南城 100 波（defense.js，ARCHITECTURE.md 第 49 節）
// 三支背景影片輪流播放（每支播完＝1 波），程式在影片上疊加飛劍、法術字樣、天氣與色調；每波「主題 × 變化」組合都不同。

const DEFENSE_TOTAL_WAVES = 100;
const DEFENSE_BOSS_EVERY = 10;       // 每 10 波一個首領波
const DEFENSE_CLIP_FADE = 0.6;       // 兩支影片交叉淡入淡出秒數

// 背景影片（1080×1920 或 720×1280 直式）。
// zoom：基本放大倍率（裁掉左上角 Pippit 浮水印；佛焰／巨劍的浮水印位置較低要放大較多）
// trim：檔案開頭被剪掉的秒數。defense.js 的時間軸以「原片秒數」撰寫，實際觸發時間 = 原片秒數 − trim。
//       以瀏覽器轉成 720p 無縫循環時會從原片 0.6 秒開始錄（頭尾淡入淡出），轉檔後的檔案 trim = 0.6。
// sizeHint：伺服器沒回傳檔案大小時，用來估算載入時間（bytes）
const DEFENSE_CLIPS = [
    { id: 'battle', name: '城牆雷戰', src: 'videos/defense/battle.mp4', zoom: 1.08, trim: 0.6, sizeHint: 2754160 },
    { id: 'flame',  name: '佛焰金身', src: 'videos/defense/flame.mp4',  zoom: 1.16, trim: 0.6, sizeHint: 2378475 },
    { id: 'sword',  name: '巨劍劍氣', src: 'videos/defense/sword.mp4',  zoom: 1.16, trim: 0.6, sizeHint: 2339481 }
];

// 10 種屬性主題：filter＝影片色調、weather＝天氣粒子、proj＝法術外觀、fin＝終結技型態、spells＝6 招、finals＝5 個終結技
// ⚠️ icon 只用 Windows 10 也能顯示的 Emoji（🪙 等 Emoji 13 會變方塊）
const DEFENSE_THEMES = [
    { name: '雷霆', icon: '⚡', c: '#93c5fd', c2: '#e0f2fe', filter: 'saturate(1.25) contrast(1.05)', weather: 'rain', proj: 'sword', fin: 'bolt',
      spells: ['掌心雷', '引雷訣', '雷光劍', '九霄雷動', '紫電青霜', '天罡雷印'], finals: ['雷劫天罰', '萬雷歸宗', '九天雷獄', '神霄滅法', '雷帝降世'] },
    { name: '赤焰', icon: '🔥', c: '#fb923c', c2: '#fde68a', filter: 'sepia(0.45) saturate(1.7) hue-rotate(-22deg)', weather: 'embers', proj: 'fire', fin: 'meteor',
      spells: ['烈焰符', '火鴉術', '赤炎劍氣', '三昧真火', '炎龍捲', '離火印'], finals: ['焚天火雨', '朱雀焚城', '隕火天降', '太陽真火', '紅蓮業火'] },
    { name: '玄冰', icon: '❄️', c: '#a5f3fc', c2: '#ffffff', filter: 'saturate(0.55) brightness(1.08) hue-rotate(12deg)', weather: 'snow', proj: 'shard', fin: 'rainShard',
      spells: ['玄冰刺', '寒霜劍', '冰魄神光', '凝霜訣', '雪影步', '冰封千里'], finals: ['萬里冰封', '極寒霜天', '冰河葬魔', '玄冥寒獄', '雪域神罰'] },
    { name: '庚金', icon: '🔱', c: '#fcd34d', c2: '#fffbeb', filter: 'sepia(0.55) saturate(1.35) brightness(1.05)', weather: 'sparkle', proj: 'goldsword', fin: 'pillar',
      spells: ['庚金劍氣', '金光咒', '斷金指', '銳金飛劍', '金剛伏魔', '白虎殺陣'], finals: ['金光萬丈', '白虎嘯天', '庚金劍陣', '天罡金身', '萬劍朝宗'] },
    { name: '青木', icon: '🍃', c: '#4ade80', c2: '#dcfce7', filter: 'hue-rotate(38deg) saturate(1.15)', weather: 'leaves', proj: 'leaf', fin: 'spiral',
      spells: ['青木葉刃', '藤縛術', '回春訣', '萬木爭春', '青藤劍', '乙木神雷'], finals: ['萬木噬魔', '青帝降臨', '森羅萬象', '枯榮輪轉', '建木通天'] },
    { name: '毒瘴', icon: '☠️', c: '#a3e635', c2: '#ecfccb', filter: 'hue-rotate(75deg) saturate(1.35) brightness(0.9)', weather: 'spores', proj: 'orb', fin: 'rainOrb',
      spells: ['腐骨毒針', '瘴霧術', '五毒掌', '蝕心蠱', '碧磷火', '化血神針'], finals: ['萬毒歸宗', '瘴海噬魂', '五毒天羅', '碧落毒雨', '屍瘴滅城'] },
    { name: '罡風', icon: '🌪️', c: '#e0f2fe', c2: '#ffffff', filter: 'saturate(0.6) brightness(1.15) contrast(1.05)', weather: 'wind', proj: 'shard', fin: 'spiral',
      spells: ['風刃術', '御風訣', '青冥劍', '颶風斬', '風雷步', '捲雲式'], finals: ['九天罡風', '颶風滅世', '風捲殘雲', '天罡風獄', '萬里長風'] },
    { name: '幽冥', icon: '🌑', c: '#c084fc', c2: '#f3e8ff', filter: 'hue-rotate(40deg) saturate(1.45) brightness(0.78)', weather: 'ash', proj: 'orb', fin: 'pillar',
      spells: ['幽冥鬼火', '攝魂術', '陰雷指', '冥河劍', '九幽引', '噬魂印'], finals: ['九幽冥獄', '黃泉引渡', '萬鬼朝宗', '冥王降世', '幽冥滅魂'] },
    { name: '聖光', icon: '✨', c: '#fef9c3', c2: '#ffffff', filter: 'brightness(1.22) saturate(0.85) sepia(0.2)', weather: 'sparkle', proj: 'goldsword', fin: 'pillar',
      spells: ['淨世光', '天罡劍', '佛光普照', '破邪印', '太清神光', '大日真言'], finals: ['大日如來', '天光滅魔', '聖光審判', '太清神雷', '萬佛朝宗'] },
    { name: '血煞', icon: '🩸', c: '#f87171', c2: '#fecaca', filter: 'sepia(0.6) saturate(2.1) hue-rotate(-40deg) brightness(0.85)', weather: 'blood', proj: 'redsword', fin: 'meteor',
      spells: ['血煞劍', '噬血訣', '赤魔斬', '血河印', '殺神式', '修羅步'], finals: ['血河滅世', '修羅殺陣', '萬劍誅魔', '天誅地滅', '斬天拔劍術'] }
];

// 首領（第 10、20…100 波依序）
const DEFENSE_BOSSES = ['九首魔蛟', '血翼魔王', '骨龍', '噬魂魔將', '赤瞳屍王', '萬足魔蠍', '幽冥鬼帝', '煉獄魔猿', '天魔化身', '魔祖真身'];
// 首領光環（2026-09-29 使用者要求 BOSS 自帶多個光環：壓制玩家＋強化自身；格式見 elements.js 的 combineAuras），索引同 DEFENSE_BOSSES。
// 守城一波約 20 回合分勝負，所以每回合效果比鎮魔塔（約 300 回合）強；越後面的首領光環越多
const DEFENSE_BOSS_AURAS = [
    [ { name: "九首毒涎", player: { poison: 0.12 }, self: { def: 5 } },
      { name: "蛟威",     player: { atk: 0.05 }, self: { atk: 0.05 } } ],
    [ { name: "血翼颶風", player: { eva: 5, dot: 0.01 }, self: { eva: 5 } },
      { name: "嗜血",     player: {}, self: { regen: 0.01 } } ],
    [ { name: "骨龍寒息", player: { freeze: 0.06 }, self: { def: 8 } },
      { name: "枯骨詛咒", player: { curse: 0.08 }, self: {} } ],
    [ { name: "噬魂魔音", player: { atk: 0.10 }, self: { atk: 0.08 } },
      { name: "魂火",     player: { burn: 0.12 }, self: {} },
      { name: "魔將鐵甲", player: {}, self: { def: 8 } } ],
    [ { name: "屍王瘴氣", player: { poison: 0.15, dot: 0.01 }, self: {} },
      { name: "赤瞳凝視", player: { def: 8, freeze: 0.05 }, self: {} },
      { name: "不腐之身", player: {}, self: { regen: 0.01 } } ],
    [ { name: "萬足劇毒", player: { poison: 0.18 }, self: { atk: 0.05 } },
      { name: "蠍尾麻痺", player: { freeze: 0.06 }, self: {} },
      { name: "甲殼",     player: {}, self: { def: 10 } } ],
    [ { name: "鬼帝威壓", player: { atk: 0.10, def: 5 }, self: { atk: 0.10 } },
      { name: "幽冥詛咒", player: { curse: 0.10, dot: 0.01 }, self: {} },
      { name: "百鬼護駕", player: {}, self: { eva: 8, regen: 0.01 } } ],
    [ { name: "煉獄業火", player: { burn: 0.18, dot: 0.01 }, self: { atk: 0.10 } },
      { name: "魔猿狂暴", player: { eva: 5 }, self: { atk: 0.10 } },
      { name: "赤鐵筋骨", player: {}, self: { def: 10 } } ],
    [ { name: "天魔噬心", player: { atk: 0.12, curse: 0.10 }, self: {} },
      { name: "天魔寒獄", player: { freeze: 0.08 }, self: { def: 8 } },
      { name: "天魔不滅", player: { dot: 0.015 }, self: { regen: 0.015 } } ],
    [ { name: "魔祖降世", player: { atk: 0.12, def: 8, eva: 5 }, self: { atk: 0.15 } },
      { name: "萬魔詛咒", player: { curse: 0.12, dot: 0.015 }, self: {} },
      { name: "混沌魔焰", player: { burn: 0.15, poison: 0.15 }, self: {} },
      { name: "魔祖真身", player: { freeze: 0.06 }, self: { def: 10, regen: 0.015 } } ]
];
const DEFENSE_OPENERS = ['volley', 'rain', 'pillars', 'spiral', 'chain'];
const DEFENSE_CAMERAS = ['靜止', '推近', '橫移', '拉遠', '傾斜'];

// ==================== 強度（2026-09-27 玩家指定）====================
// 里程碑：第 N 波 = 某境界 10 階的修士（數值同懸賞天榜：config-bounty.js 的 getBountyStats 曲線 × 該境界一般宗門倍率）。
// 里程碑之間以等比例（每波同倍率）平滑遞增；第 91～100 波沿用 80→90 波的倍率繼續往上（超越混沌道祖 10 階）。
// stage 選填（沒填 = DEFENSE_MILESTONE_STAGE 10 階）
const DEFENSE_MILESTONES = [
    { wave: 1,  realm: 6, stage: 1 },   // 煉虛 1 階（2026-09-27 由 10 階改：秘境從煉虛 1 階就能進，原本前段一波都守不住）
    { wave: 10, realm: 7 },    // 合體
    { wave: 20, realm: 8 },    // 大乘
    { wave: 30, realm: 9 },    // 渡劫
    { wave: 40, realm: 10 },   // 仙人初境
    { wave: 50, realm: 11 },   // 天仙
    { wave: 60, realm: 12 },   // 真仙
    { wave: 70, realm: 13 },   // 大羅金仙
    { wave: 80, realm: 14 },   // 混元大羅金仙
    { wave: 90, realm: 15 }    // 混沌道祖
];
const DEFENSE_MILESTONE_STAGE = 10;
// 每波妖潮的戰鬥屬性：氣血 = 攻擊 × 20（同懸賞人物；新制改用 config-numeric.js 的 defenseHpPerAtk）；首領波攻擊 × bossAtk、氣血 × bossHp
// 首領不另外加強（= 1）：里程碑「第 10 波 = 合體 10 階」就是首領本身的強度；首領波以加倍獎勵、必掉套裝部件區隔
// （2026-09-27 測試：首領攻 ×1.5、血 ×3 時，每個境界 10 階的玩家都卡在自己境界的首領波，違背里程碑，已取消）
const DEFENSE_ENEMY = { hpPerAtk: 20, bossAtk: 1, bossHp: 1, def: [15, 35], eva: [8, 20], affix: [10, 35] };   // [第 1 波, 第 100 波] 線性
// 勝負（defense.js 的 simulateWave）：以玩家當下真實的攻擊、氣血、減傷、閃避、五行與異屬性，用 resolveHit 在背後打一場；
// 玩家每回合傷害 = max(物攻, 術攻) × PLAYER_SKILL_MULT（武學、技能的平均加成）；超過 MAX_ROUNDS 回合未分勝負算失守
const DEFENSE_PLAYER_SKILL_MULT = 1.3;
const DEFENSE_MAX_ROUNDS = 150;       // 同懸賞對決（BOUNTY_MAX_TURNS）；60 回合時首領波（氣血 ×3）幾乎都逾時，減傷閃避完全沒作用
const DEFENSE_LOSE_AT = 0.45;        // 守不住的那一波：影片播到 45%（終結技之前）時判定失守

// ==================== 次數與獎勵 ====================
// 每日次數：config-secret-realms.js 的 SECRET_REALM_DAILY_ATTEMPTS（每個秘境各自計算，開始守城時扣 1 次）
// 每守住一波立即發放（中途離開或失守，已守住的獎勵保留）；首領波（每 10 波）加倍並必掉套裝部件
const DEFENSE_REWARDS = {
    coinMinutes: 2,                  // 靈石 = 等強度境界主要練功地圖「掛機 N 分鐘」的收入
    merit: [3, 12],                  // 功德（每波）
    bossMerit: [80, 200],            // 首領波功德
    shardChance: 0.15, shard: [1, 2], bossShard: [3, 8],     // 異火碎片
    ironChance: 0.2,   iron: [1, 2],  bossIron: [3, 6],      // 星允鐵
    gearChance: 0.06,                // 一般波掉落器錄「武器／防具」一件（奪寶／拍賣／可製作管道，不含秘境）
    setChance: 0.03,                 // 第 20 波起一般波也有機率掉秘境套裝部件；首領波必掉 1 件（一次只掉一件，不會整套）
    gearOdds: [                      // 品級分布依波次
        { from: 1,  odds: { "藍色": 0.5, "紫色": 0.4, "橙色": 0.1 } },
        { from: 30, odds: { "紫色": 0.6, "橙色": 0.4 } },
        { from: 60, odds: { "紫色": 0.3, "橙色": 0.7 } }
    ],
    partnerFromWave: 51,             // 守住第 51 波起，每守住一波有機率遇見尚未結識的天驕級夥伴（每次守城最多 1 位）
    partnerChance: 0.04
};
// 稱號：config-titles.js 的 defenseWave 條件（10／30／50／80／100 波，依歷史最高守住波數 player.defenseBest）

// ==================== 通關紀錄與排行榜（第 49、50 節）====================
const DEFENSE_RUN_LOG_MAX = 20;      // 守城介面「📜 通關紀錄」保留最近幾場（player.defenseRuns）

// ==================== 強度曲線（defense.js 與 gm.html 共用，gm.html 審核排行榜時用來判斷「這個攻擊守不守得住這一波」）====================
// ⚠️ 例外：本檔尾端有函式（與 config-sects.js 相同），需要 bounty.js 的 getBountyRefSectMult（呼叫時才用，載入順序不受影響）
// 某境界某階修士的攻擊：與懸賞人物同一條曲線（bounty.js 的 getBountyStats：修為圓滿基礎戰力 × 該境界一般宗門倍率）
// 新制（第 52 節）：同境界一般玩家普攻（numeric.js）；gm.html 沒有載入新制檔案，NUMERIC_V2 不存在時一律用舊制
function defenseRealmAtk(r, s) {
    if (typeof NUMERIC_V2 !== 'undefined' && NUMERIC_V2) return nv2TypNormal(nv2Level(r, s));
    const base = Math.pow(10, r) * 5 * s + (r === 0 ? 1 : 2 * Math.pow(10, r)) * s;
    return base * getBountyRefSectMult(r);
}
// 第 w 波的基準攻擊：里程碑之間等比例遞增；最後一個里程碑之後沿用最後一段的每波倍率
function defenseWaveAtk(w) {
    const miles = DEFENSE_MILESTONES.map(m => ({ w: m.wave, a: defenseRealmAtk(m.realm, m.stage || DEFENSE_MILESTONE_STAGE) }));
    for (let i = 0; i < miles.length - 1; i++) {
        const a = miles[i], b = miles[i + 1];
        if (w <= b.w) return a.a * Math.pow(b.a / a.a, (Math.max(w, a.w) - a.w) / (b.w - a.w));
    }
    const a = miles[miles.length - 2], b = miles[miles.length - 1];
    return b.a * Math.pow(b.a / a.a, (w - b.w) / (b.w - a.w));
}
// 第 w 波對應的成長位置 L（新制，里程碑之間線性內插；超過最後一個里程碑沿用最後一段的斜率，最高 15.9）：
// 妖潮的命中＝這個 L 的一般玩家命中（defense.js 的 waveEnemy，2026-09-29 使用者要求死守天南城也加命中）
function defenseWaveL(w) {
    const ms = DEFENSE_MILESTONES.map(m => ({ w: m.wave, L: m.realm + ((m.stage || DEFENSE_MILESTONE_STAGE) - 1) / 10 }));
    for (let i = 0; i < ms.length - 1; i++) {
        const a = ms[i], b = ms[i + 1];
        if (w <= b.w) return a.L + (b.L - a.L) * (Math.max(w, a.w) - a.w) / (b.w - a.w);
    }
    const a = ms[ms.length - 2], b = ms[ms.length - 1];
    return Math.min(15.9, b.L + (b.L - a.L) * (w - b.w) / (b.w - a.w));
}
// 新制每波額外成長倍率（config-numeric.js 的 defenseWaveGrowth）：妖潮攻擊與氣血都乘上，舊制 = 1
// defenseWaveAtk 仍是「同境界一般玩家」的基準（強度標籤、靈石獎勵用它），實際妖潮 = 基準 × 本倍率
function defenseWaveMult(w) {
    if (typeof NUMERIC_V2 === 'undefined' || !NUMERIC_V2 || !NV2.defenseWaveGrowth) return 1;
    return Math.pow(NV2.defenseWaveGrowth, Math.max(0, w - 1));
}

