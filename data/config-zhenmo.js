// 秘境「鎮魔塔」100 層（zhenmo.js，ARCHITECTURE.md 第 51 節）
// 每層流程：塔廳 →「📜 開始問答」10 題知識問答（題庫 config-zhenmo-questions.js）→ 結算答對數 →「🚪 開啟 BOSS 房門」→ BOSS 戰
// 答對越多，這一層 BOSS 的獎勵倍率越高（問答結果會保留到打 BOSS，中途離開塔也不會消失）。
// 一輪 10 題只影響「當前這一層」BOSS 的擊敗獎勵；進入下一層後加成歸零，要重新答題。
// 挑戰 BOSS 失敗（或戰鬥中離開）時本層問答成績作廢，重來要重新答題（重新答題會再扣 1 次挑戰）。

const ZHENMO_TOTAL_FLOORS = 100;
const ZHENMO_QUIZ_COUNT = 10;          // 每層問答題數
const ZHENMO_QUIZ_SECONDS = 30;        // 每題限時秒數（逾時算答錯，避免邊答邊查）；0 = 不限時（2026-09-30 使用者由 20 改 30）
const ZHENMO_REVEAL_ANSWER = false;    // false：答題後只顯示對／錯，不公布正確答案（題目不外流）
const ZHENMO_RECENT_AVOID = 100;       // 最近出過的幾題不再出（題庫 300 題，約 3 層後才會重複）

// 問答答對數 → 本層 BOSS 獎勵倍率（索引 = 答對題數 0～10；全對額外加碼）
const ZHENMO_QUIZ_REWARD_MULT = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.5];

// 題目出處顯示名稱
const ZHENMO_SOURCES = { "凡": "凡人修仙傳", "吞": "吞噬星空", "斗": "斗羅大陸" };

// ==================== BOSS 戰（2026-09-27 起，目前有第 1～6 層）====================
// 有 BOSS 資料的樓層：開始問答時扣 1 次秘境每日次數（secret-realm.js 的 useSecretRealmAttempt）；
// 還沒有 BOSS 資料的樓層：問答不扣次數、BOSS 房顯示「尚在甦醒」、樓層不前進。
// 戰鬥畫面的主角立繪依性別（玩家提供，由同一張圖左右裁切並去黑底）
const ZHENMO_HERO_IMG = { female: "images/zhenmo/hero-female.png", male: "images/zhenmo/hero-male.png" };
const ZHENMO_PLAYER_SKILL_MULT = 1.3;  // 玩家每回合傷害 = max(物攻, 術攻) × 此倍率（武學平均加成，同死守天南城）
const ZHENMO_MAX_ROUNDS = 150;         // 超過回合數 BOSS 未倒 = 挑戰失敗
const ZHENMO_ROUND_MS = 650;           // 每回合演出時間（×1 速；可切 ×2／×4 或跳過）
// BOSS 每次挑戰的隨機氣勢（2026-09-29）：攻擊與氣血 × (1 ± 這個比例) 均勻隨機。
// 沒有這項時同樣數值的玩家幾乎「必勝或必敗」（難度差 5% 勝率就從 100% 掉到 14%），無法校準成「中等裝備約 8 成」這類目標
const ZHENMO_BOSS_VARIANCE = 0.2;
// 擊敗 BOSS 後掉落夥伴碎片（2026-09-29 使用者指定；partner.js 的 grantPartnerShards，集滿 100 片激活）：
//   第 11～40 層（合體～渡劫）天驕、第 41～60 層（仙人～天仙）尊者；帝境、至高暫不開放
const ZHENMO_PARTNER_MEET = [
    { from: 11, to: 40, tiers: ["天驕"], chance: 1, shards: [8, 15] },
    { from: 41, to: 60, tiers: ["尊者", "天驕"], chance: 1, shards: [8, 15] }
];

// 各層 BOSS（key = 樓層）。強度以「某境界某階修士」為基準（config-defense.js 的 defenseRealmAtk，與死守天南城同一條曲線）：
//   攻擊 = defenseRealmAtk(realm, stage) × atkMult；氣血 = defenseRealmAtk(realm, stage) × hpPerAtk（沒填 = 300）× hpMult（沒填 = 1）；減傷／閃避 %；affix 異屬性（ice／fire／poison／metal／thunder）
// img：戰鬥背景（橫圖，手機以 imgPos 對準 BOSS）；rewards 為基礎獎勵，實際 × 本層問答倍率
// 選填 icon（戰況中 BOSS 出招的圖示，預設 ⚡）、flash（BOSS 出手時畫面閃光的顏色，預設淡藍雷光）
// 強度建議：第 n 層 = 煉虛起每層一階（1～10 層煉虛 1～10 階、11～20 層合體…91～100 層混沌道祖），特別層再用 atkMult 調整
const ZHENMO_BOSSES = {
    1: {
        name: "棄天神", race: "demon", title: "塔底魔神", img: "images/zhenmo/boss-qitianshen.jpg", imgPos: "50% 30%",   // 玩家提供直式版（848×1264，2:3；左上有「棄天神」字樣）
        realm: 6, stage: 1, atkMult: 1,   // 入門關：煉虛 1 階
        hpPerAtk: 300,                    // 氣血 = 攻擊 × 300（2026-09-27 玩家指定，原 30）
        def: 20, eva: 10, affix: "thunder", affixVal: 15, element: "金",
        intro: "被諸天大能棄於塔底的上古魔神，手持雷紋魔劍，一聲怒嘯引動九天劫雷。",
        skills: ["棄天雷劍", "劫雷貫空", "魔神怒嘯", "萬雷鎖魂"],   // 戰鬥演出用的招式名稱
        auras: [   // BOSS 光環（elements.js 的 combineAuras／describeAura，2026-09-29；多個光環同種效果相加）
            { name: "劫雷天威", player: { def: 5, freeze: 0.02 }, self: { atk: 0.10 } },
            { name: "魔神怒嘯", player: { curse: 0.05 }, self: { def: 5 } }
        ],
        rewards: {
            coinMinutes: 10,          // 靈石 = 等強度境界主要練功地圖掛機 N 分鐘的收入（同死守天南城 waveCoins）
            merit: [120, 240],        // 功德
            shards: [3, 6],           // 異火碎片
            iron: [4, 8]              // 星允鐵
        }
    },
    2: {
        name: "不滅骨", race: "ghost", title: "皇道殭屍", img: "images/zhenmo/boss-bumiegu.jpg", imgPos: "50% 30%",   // 玩家提供直式版（848×1264，2:3；龍虎山石階上的龍袍屍王）
        realm: 6, stage: 2, atkMult: 1,   // 樓層 n = 煉虛起每層一階（第 2 層 = 煉虛 2 階）
        hpPerAtk: 300,
        def: 25, eva: 5, affix: "poison", affixVal: 15, element: "土",   // 殭屍：皮糙肉厚（減傷高、閃避低）、屍毒
        intro: "前朝帝王死後不腐，龍袍裹屍、骨化金剛，以皇陵屍氣鎮守塔中第二層，屍毒入體者皆化為枯骨。",
        skills: ["屍王裂爪", "龍袍屍氣", "不滅骨咒", "皇陵腐毒"],
        auras: [
            { name: "屍氣瀰漫", player: { dot: 0.001, poison: 0.04 }, self: { def: 10 } },
            { name: "不滅之軀", player: {}, self: { regen: 0.001 } }
        ],
        icon: "☠️", flash: "rgba(132, 204, 22, 0.3)",   // 戰況圖示、出手時的屍毒綠光
        rewards: { coinMinutes: 11, merit: [130, 260], shards: [3, 6], iron: [4, 8] }
    },
    3: {
        name: "主咒之王", race: "ghost", title: "束縛幽冥", img: "images/zhenmo/boss-zhuzhou.jpg", imgPos: "50% 30%",   // 玩家提供直式（848×1264，符咒王座）
        realm: 6, stage: 3, atkMult: 1.5,   // 煉虛 3 階，攻擊 ×1.5（2026-09-27 玩家指定）
        hpPerAtk: 300,                      // 氣血 = 基準攻擊 × 300（atkMult 只放大攻擊；要加血用 hpMult）
        def: 15, eva: 15, affix: "ice", affixVal: 18, element: "水",   // 咒術師：束縛咒（冰凍＝定身，玩家該回合無法出手）、身法飄忽
        intro: "端坐符咒王座的幽冥咒主，袍上刻滿束縛真言，萬道符籙隨念而動，被咒言纏身者動彈不得。",
        skills: ["束縛真言", "萬符焚身", "幽冥咒印", "奪魂符陣"],
        auras: [
            { name: "束縛咒域", player: { atk: 0.10, freeze: 0.03 }, self: { eva: 5 } },
            { name: "奪魂詛咒", player: { curse: 0.08, eva: 3 }, self: {} }
        ],
        icon: "📜", flash: "rgba(168, 85, 247, 0.32)",   // 符咒紫光
        rewards: { coinMinutes: 13, merit: [150, 300], shards: [4, 7], iron: [5, 9] }
    },
    4: {
        name: "幽冥鬼虎", race: "ghost", title: "冥火凶獸", img: "images/zhenmo/boss-guihu.jpg", imgPos: "60% 40%",   // 玩家提供直式（848×1264，虎頭在右側中段）
        realm: 6, stage: 4, atkMult: 1,     // 煉虛 4 階（每層一階）
        hpPerAtk: 300,
        def: 10, eva: 20, affix: "metal", affixVal: 18, element: "金",   // 凶獸：身法迅捷（閃避高、減傷低）、利爪撕咬易暴擊；白虎屬金
        intro: "幽冥鬼林中吞噬萬千亡魂的凶虎，周身燃著冥火，一聲虎嘯引來百鬼夜行，利爪所及魂飛魄散。",
        skills: ["冥火虎嘯", "裂魂虎爪", "百鬼夜行", "幽冥撲殺"],
        auras: [
            { name: "百鬼夜行", player: { eva: 5, dot: 0.001 }, self: { atk: 0.10 } },
            { name: "冥火纏身", player: { burn: 0.04 }, self: { eva: 5 } },
            { name: "凶虎之威", player: { def: 5 }, self: { atk: 0.05 } }
        ],
        icon: "🐯", flash: "rgba(129, 140, 248, 0.32)",   // 冥火藍紫光
        rewards: { coinMinutes: 14, merit: [160, 320], shards: [4, 7], iron: [5, 10] }
    },
    5: {
        name: "青瞑爪龍", race: "beast", title: "雷雲蒼龍", img: "images/zhenmo/boss-qingming.jpg", imgPos: "50% 25%",   // 玩家提供直式（848×1264，展翼青龍、龍頭在上方）
        realm: 6, stage: 5, atkMult: 3,     // 煉虛 5 階，攻擊 ×3（2026-09-27 玩家指定）
        hpPerAtk: 300,
        def: 20, eva: 15, affix: "thunder", affixVal: 18, element: "木",   // 青龍屬木；御雷雲、爪握雷珠（雷擊）；展翼飛騰（閃避）
        intro: "盤踞雷雲之上的青鱗爪龍，雙翼遮天、爪握雷珠，龍吟一聲風雨驟至，是塔中第一道真正的難關。",
        skills: ["青瞑龍爪", "雷珠轟頂", "蒼龍擺尾", "風雷龍吟"],
        auras: [
            { name: "蒼龍威壓", player: { atk: 0.08, def: 8 }, self: { regen: 0.001 } },
            { name: "風雷龍域", player: { freeze: 0.02, curse: 0.05 }, self: { eva: 5 } },
            { name: "龍鱗護體", player: {}, self: { def: 5 } }
        ],
        icon: "🐉", flash: "rgba(56, 189, 248, 0.32)",   // 青色雷光
        rewards: { coinMinutes: 20, merit: [250, 500], shards: [6, 10], iron: [8, 14] }   // 第 5 層關卡：獎勵加碼
    },
    6: {
        name: "黑暗法老王", race: "ghost", title: "封印神王", img: "images/zhenmo/boss-pharaoh.jpg", imgPos: "50% 30%",   // 玩家提供直式（687×1024，2:3；掙斷鎖鏈的黃金法老，頭在上方約 30%）
        realm: 6, stage: 6, atkMult: 1,     // 煉虛 6 階（每層一階）
        hpPerAtk: 300,
        def: 30, eva: 5, affix: "fire", affixVal: 18, element: "土",   // 黃金神軀：減傷高、身形笨重（閃避低）；胸前聖符射出烈日神光（燒傷）；沙漠古陵屬土
        intro: "被萬道鎖鏈封印於古陵深處的黃金神王，如今掙斷枷鎖、聖符迸發烈日神光，所過之處石柱崩裂、黃沙蔽日。",
        skills: ["烈日神光", "斷鎖神拳", "法老怒焰", "黃沙滅界"],
        auras: [
            { name: "烈日神威", player: { burn: 0.05, dot: 0.001 }, self: { def: 10 } },
            { name: "法老詛咒", player: { curse: 0.08, atk: 0.05 }, self: { regen: 0.001 } },
            { name: "黃沙蔽日", player: { eva: 5 }, self: { eva: 3 } }
        ],
        icon: "☀️", flash: "rgba(250, 204, 21, 0.32)",   // 金色烈日光
        rewards: { coinMinutes: 15, merit: [170, 340], shards: [4, 8], iron: [6, 11] }
    },
    // 第 7 層（2026-09-30 玩家提供圖與名稱，687×1024 直式：銀髮紅瞳、手持龍首杖的魔醫，身後石像魔影）：
    //   數值沿用原本自動產生的第 7 層（氣血 ×1.443、減傷 15、閃避 8、兩個光環的效果），只換外觀與主題；屬性傷害由冰改毒（主題）
    //   毒比冰溫和（冰會凍住玩家），原攻擊 ×2.08 時中等配置 99% → 攻擊改 ×2.5 校回目標 80%（ARCHITECTURE.md 第 51 節）
    7: {
        name: "墨大夫", race: "demon", title: "奪舍魔醫", img: "images/zhenmo/boss-modaifu.jpg", imgPos: "50% 30%",
        realm: 6, stage: 7, atkMult: 2.5, hpMult: 1.443,
        hpPerAtk: 300,
        def: 15, eva: 8, affix: "poison", affixVal: 15, element: "水",
        intro: "七玄門神手谷的神醫，暗中修煉魔道邪術，以血煉之法苟延殘喘、覬覦少年之軀欲行奪舍。身死之後殘魂受塔中魔氣滋養，重凝魔身，紅瞳一亮便要攝人魂魄。",
        skills: ["奪舍魔瞳", "纏魂鬼爪", "血煉邪術", "龍杖噬魂"],
        auras: [
            { name: "奪舍魔瞳", player: {}, self: { def: 5 } },
            { name: "血煉續命", player: {}, self: { regen: 0.001 } }
        ],
        icon: "🐍", flash: "rgba(220, 38, 38, 0.32)",   // 血紅魔光
        rewards: { coinMinutes: 14, merit: [135, 270], shards: [3, 6], iron: [4, 8] }
    },
    // 第 8 層（2026-10-01 玩家提供圖 848×1264 直式：同一位銀髮紅瞳魔醫的全身魔化形態，手持燃燒血焰的龍首杖、腳踏血色法陣，身後萬魂與魔像）：
    //   設計為第 7 層墨大夫被擊潰後的「血魔真身」（墨居仁＝墨大夫本名；名稱為我暫定）。境界、氣血、減傷閃避、種族、獎勵沿用自動產生的第 8 層；
    //   主題改血焰：屬性傷害 金重擊 → 燒傷、光環改名並把原「鐵壁」＋「焚天」重組，多一個詛咒「萬魂哀嚎」；
    //   攻擊倍率重新校準（ARCHITECTURE.md 第 51 節的模擬，各 1500 場）：×2.53 → 中等配置 80%、強力 100%、一般玩家 0%
    8: {
        name: "墨居仁", race: "demon", title: "血魔真身", img: "images/zhenmo/boss-moxue.jpg", imgPos: "50% 25%",
        realm: 6, stage: 8, atkMult: 2.53, hpMult: 1.635,
        hpPerAtk: 300,
        def: 15, eva: 8, affix: "fire", affixVal: 15, element: "火",
        intro: "墨大夫殘魂在第七層潰散之際，引塔底萬魂與古魔石像之力重塑魔軀，自號血魔。龍首杖燃起血焰，腳下血煞法陣一亮，便要將闖塔者煉作新的軀殼。",
        skills: ["龍杖焚魂", "血魔真焰", "萬魂噬心", "血煞封魔"],
        auras: [
            { name: "血煞封魔陣", player: { burn: 0.04 }, self: { def: 5 } },
            { name: "萬魂哀嚎", player: { curse: 0.05 }, self: {} }
        ],
        icon: "🩸", flash: "rgba(239, 68, 68, 0.36)",   // 血焰紅光
        rewards: { coinMinutes: 14, merit: [140, 280], shards: [3, 7], iron: [4, 9] }
    },
    // 第 9 層（2026-10-01 玩家指定名稱「襲胸雙雄」，主題「搞笑魔性雙人組」）：戰鬥引擎一次一個 BOSS，雙人合成一個單位；名稱沒有種族後綴＝人修。
    //   圖：起初是電影劇照橫圖（用 imgFit contain），同日玩家改提供直式插畫 848×1264（紅色牛角魔握細劍＋紫色骨爪魔，頭戴方帽、身披紅十字白袍，
    //   腳下石碑刻「我們是紅十字軍」），改回一般 cover；imgFit 欄位保留給日後橫圖用。
    //   數值：境界、氣血、獎勵沿用自動產生的第 9 層；主題「滑溜偷襲」：減傷 10 閃避 20、金重擊（偷襲）、光環「紅十字軍旗號」（你的攻擊 −5%）＋「雙雄夾擊」（詛咒 +6%）
    //   攻擊倍率校準（第 51 節模擬，2000 場）：×2.71 → 中等 79%、強力 100%、一般玩家 0%（換圖不影響數值）
    9: {
        name: "襲胸雙雄", title: "自封紅十字軍", img: "images/zhenmo/boss-xixiong.jpg", imgPos: "50% 28%",
        realm: 6, stage: 9, atkMult: 2.71, hpMult: 1.531,
        hpPerAtk: 300,
        def: 10, eva: 20, affix: "metal", affixVal: 15, element: "金",
        intro: "兩個頭戴方帽、身披紅十字白袍的怪人，逢人便喊「我們是紅十字軍」，專趁人不備出手偷襲。誤闖鎮魔塔後被魔氣一泡，一個長出牛角、渾身熔岩裂紋，一個化成紫皮骨爪，連一身滑溜身法也練成了「雙雄夾擊」。",
        taunt: "我們是紅十字軍！",
        skills: ["襲胸手", "紅十字大旗", "雙雄夾擊", "一溜煙"],
        auras: [
            { name: "紅十字軍旗號", player: { atk: 0.05 }, self: {} },
            { name: "雙雄夾擊", player: { curse: 0.06 }, self: {} }
        ],
        icon: "✚", flash: "rgba(248, 113, 113, 0.3)",   // 紅十字
        rewards: { coinMinutes: 15, merit: [145, 290], shards: [3, 7], iron: [4, 9] }
    },
    // 第 10 層樓主（2026-10-02 玩家提供圖 848×1264 直式水墨：鴉首天狗、黑紫雙翼、雙手各持長刀，月下松林與鳥居）：手動蓋過自動產生的「赤炎屍王」（鬼物）
    //   境界、氣血、減傷、獎勵沿用自動產生的第 10 層；種族改 🐉妖獸（天狗是鴉妖，樓主層首勝的剋制法寶跟著變妖獸）；
    //   主題「雙刀颶風」：閃避 10 → 15（身法）、屬性傷害 雷 → 金重擊（雙刀）、光環「鴉羽護身」（自身減傷 +5）＋「天狗颶風」（每回合扣 0.1% 氣血）＋「雙刀亂舞」（詛咒 +5%）
    //   攻擊倍率校準（第 51 節模擬，3000 場）：×2.39 → 中等 81%、強力 100%、一般玩家 0%（自動產生的第 10 層在同一模擬為中等 69%）
    10: {
        name: "天狗", race: "beast", title: "鴉羽雙刀・第 10 層樓主", img: "images/zhenmo/boss-tiangou.jpg", imgPos: "50% 30%",
        realm: 6, stage: 10, atkMult: 2.39, hpMult: 1.214,
        hpPerAtk: 300,
        def: 17, eva: 15, affix: "metal", affixVal: 17, element: "金",
        intro: "深山古松間修行千年的鴉天狗，鴉首人身、黑羽遮天，雙手各握一柄長刀。誤入鎮魔塔後被魔氣浸染，奉為第十層樓主；羽翼一振便颳起裂石颶風，刀光一閃已斬落月影。",
        taunt: "膽敢登樓者——斬！",
        skills: ["鴉羽雙刀", "天狗颶風", "月下斬", "羽翼遮天"],
        auras: [
            { name: "鴉羽護身", player: {}, self: { def: 5 } },
            { name: "天狗颶風", player: { dot: 0.001 }, self: {} },
            { name: "雙刀亂舞", player: { curse: 0.05 }, self: {} }
        ],
        icon: "🌪️", flash: "rgba(167, 139, 250, 0.32)",   // 颶風、月下紫羽（🪶 羽毛太新，部分裝置顯示成方框）
        rewards: { coinMinutes: 30, merit: [300, 600], shards: [8, 14], iron: [10, 18] }
    },
    // 第 15 層鎮關者（2026-10-02 玩家提供圖 848×1264 直式：紫髮雙角、紅瞳獰笑的魔族少年，背生血紋蝠翼、手持鎏金巨鐮，身後黑月、紫雷與燃燒的古堡戰場）：
    //   手動蓋過自動產生的「紫霄屍王」（鬼物）；名稱「噬月魔子」為我暫定。境界（合體 5 階）、氣血、減傷閃避、紫雷屬性傷害、獎勵沿用自動產生的第 15 層；
    //   種族改 😈魔修（吸血 10%）、五行金 → 火（魔焰）、光環改名（詛咒「血翼魔威」、凍結「冥月攝魂」，效果不變）
    //   攻擊倍率校準（第 51 節模擬，3000 場）：×3.00 → 中等 81%、強力 100%、一般玩家 0%（自動產生的第 15 層在同一模擬為中等 68%）
    15: {
        name: "噬月魔子", race: "demon", title: "血翼冥鐮・第 15 層鎮關者", img: "images/zhenmo/boss-shiyue.jpg", imgPos: "50% 22%",
        realm: 7, stage: 5, atkMult: 3.0, hpMult: 1.445,
        hpPerAtk: 300,
        def: 17, eva: 10, affix: "thunder", affixVal: 17, element: "火",
        intro: "魔域古堡的少主，生來雙角紅瞳，背負血紋蝠翼。傳說他每逢黑月便揮動鎏金巨鐮收割一座城池，以萬魂餵養魔焰。被鎮入塔中後仍不改狂性，把守第十五層關隘，笑看闖塔者在紫雷下化為灰燼。",
        taunt: "嘻……你的魂，我收下了。",
        skills: ["冥鐮收魂", "血翼魔焰", "噬月紫雷", "萬魂獻祭"],
        auras: [
            { name: "血翼魔威", player: { curse: 0.054 }, self: {} },
            { name: "冥月攝魂", player: { freeze: 0.022 }, self: {} }
        ],
        icon: "⚡", flash: "rgba(168, 85, 247, 0.34)",   // 紫雷
        rewards: { coinMinutes: 18, merit: [175, 350], shards: [4, 7], iron: [5, 9] }
    },
    // 第 20 層樓主（2026-10-02 玩家提供圖 848×1264 浮世繪風：八首巨蛇自怒濤中昇起、口吐烈焰，雷雲新月、岸邊鳥居與持刀武士；右上角題字「八岐大蛇」）：
    //   使用者寫「八歧大蛇」，依圖上題字與通行寫法用「八岐」。手動蓋過自動產生的「九幽妖皇」（本來就是妖獸）；境界（合體 10 階）、氣血、減傷閃避、獎勵沿用自動產生的第 20 層；
    //   主題：屬性傷害 雷 → 燒傷（火焰吐息）、五行金 → 水（海中巨蛇）、光環改名不改效果（「雷雲蔽月」雙方閃避 +3、「怒濤裂甲」你的減傷 −6、「八首齊噬」詛咒 +5.7%）
    //   攻擊倍率校準（第 51 節模擬，3000 場）：×2.91 → 中等約 81%、強力 100%、一般玩家 0%（自動產生的第 20 層在同一模擬為中等 64%）
    20: {
        name: "八岐大蛇", race: "beast", title: "八首噬天・第 20 層樓主", img: "images/zhenmo/boss-yamata.jpg", imgPos: "50% 25%",
        realm: 7, stage: 10, atkMult: 2.91, hpMult: 1.284,
        hpPerAtk: 300,
        def: 19, eva: 12, affix: "fire", affixVal: 19, element: "水",
        intro: "東海怒濤之下沉睡的上古妖蛇，一身八首八尾，鱗甲生苔、腹赤如血。每逢雷雲蔽月便破浪而出，八首齊吐烈焰，連山岸的神社也被捲入海中。被封入鎮魔塔後成為第二十層樓主，八顆頭顱輪流守夜，從不闔眼。",
        taunt: "嘶——又一個送上門的祭品。",
        skills: ["八首齊噬", "烈焰吐息", "怒濤捲身", "八尾掃海"],
        auras: [
            { name: "雷雲蔽月", player: { eva: 3 }, self: { eva: 3 } },
            { name: "怒濤裂甲", player: { def: 6 }, self: {} },
            { name: "八首齊噬", player: { curse: 0.057 }, self: {} }
        ],
        icon: "🐍", flash: "rgba(249, 115, 22, 0.34)",   // 烈焰吐息
        rewards: { coinMinutes: 40, merit: [400, 800], shards: [10, 16], iron: [12, 20] }
    },
    // 第 30 層樓主（2026-10-02 玩家提供圖 848×1264 浮世繪：日輪背光的女神手捧八咫鏡立於洞窟前崖上，注連繩、鳥居，崖下舞者；右上題字「天照大神」）：
    //   手動蓋過自動產生的「太虛鬼帝」（鬼物）；境界（大乘 10 階）、氣血、減傷閃避、樓主獎勵沿用自動產生的第 30 層。
    //   種族：四族沒有神祇，取 👤心魔——八咫鏡照出闖塔者的本心、化為與你一模一樣的鏡像（心魔沒有額外特性；樓主首勝法寶跟著變心魔）
    //   主題：屬性傷害 雷 → 燒傷（烈日）、五行金 → 火、光環改名不改效果（「天岩戶封印」凍結 2.5%、「日輪神威」雙方攻擊 ±6.2%、「八咫鏡照心」每回合扣 0.1% 氣血）
    //   攻擊倍率校準（第 51 節模擬，3000 場）：×2.72 → 中等約 80%、強力 100%、一般玩家 0%（自動產生的第 30 層在同一模擬為中等 70%）
    30: {
        name: "天照大神", race: "heart", title: "八咫神鏡・第 30 層樓主", img: "images/zhenmo/boss-amaterasu.jpg", imgPos: "50% 22%",
        realm: 8, stage: 10, atkMult: 2.72, hpMult: 1.193,
        hpPerAtk: 300,
        def: 21, eva: 14, affix: "fire", affixVal: 21, element: "火",
        intro: "傳說中隱身天岩戶、令天地失光的日之女神，手捧八咫神鏡，背負日輪。鎮魔塔借她的神鏡鎮守第三十層——凡登樓者皆要先照一照鏡子，鏡中映出的不是神，而是你心底最深的執念。",
        taunt: "汝心中陰翳，皆在鏡中。",
        skills: ["八咫鏡照心", "日輪天降", "天岩戶封印", "高天原神光"],
        auras: [
            { name: "天岩戶封印", player: { freeze: 0.025 }, self: {} },
            { name: "日輪神威", player: { atk: 0.062 }, self: { atk: 0.062 } },
            { name: "八咫鏡照心", player: { dot: 0.001 }, self: {} }
        ],
        icon: "☀️", flash: "rgba(253, 224, 71, 0.36)",   // 日輪金光
        rewards: { coinMinutes: 50, merit: [500, 1000], shards: [12, 18], iron: [14, 22] }
    },
    // 第 40 層樓主（2026-10-02 玩家提供圖 848×1264 浮世繪：披髮武神立於海中礁石、雙手持發光長劍，身後雷雲化作巨狼、旭日與鳥居，腳下多首巨蛇翻騰；右上題字「需佐能呼」）：
    //   名稱照使用者與圖上題字用「需佐能呼」。手動蓋過自動產生的「血煞魔龍」（妖獸）；境界（渡劫 10 階）、氣血、減傷閃避、雷擊屬性傷害、樓主獎勵沿用自動產生的第 40 層。
    //   種族改 😈魔修：被逐出高天原的暴風荒神，在塔中受魔氣侵染（魔修吸血 10%；樓主首勝法寶跟著變魔修）；五行金 → 水（海上風暴）；
    //   光環改名不改效果（「雷火灼身」燒傷 5.4%、「颶風護體」自身減傷 +7、「荒神不滅」回血 0.1%、「蛇血劍毒」中毒 5.4%——劍上沾著八岐大蛇的血）
    //   攻擊倍率校準（第 51 節模擬，3000 場）：×2.73 → 中等約 81%、強力 100%、一般玩家 0%（自動產生的第 40 層在同一模擬為中等 66%）
    40: {
        name: "需佐能呼", race: "demon", title: "暴風荒神・第 40 層樓主", img: "images/zhenmo/boss-susanoo.jpg", imgPos: "55% 22%",
        realm: 9, stage: 10, atkMult: 2.73, hpMult: 1.19,
        hpPerAtk: 300,
        def: 23, eva: 16, affix: "thunder", affixVal: 23, element: "水",
        intro: "天照大神之弟、掌管滄海與暴風的荒神，因性情狂暴被逐出高天原，曾一劍斬下八岐大蛇的八顆頭顱。斬蛇之後蛇血浸透劍身，連同塔中魔氣一起侵入心神，從此雷雲隨行、所到之處怒濤翻湧，坐鎮第四十層，只求再戰。",
        taunt: "姊姊的鏡子照不住我——你又憑什麼？",
        skills: ["天叢雲劍", "颶風斬", "雷狼噬天", "斬蛇八連"],
        auras: [
            { name: "雷火灼身", player: { burn: 0.054 }, self: {} },
            { name: "颶風護體", player: {}, self: { def: 7 } },
            { name: "荒神不滅", player: {}, self: { regen: 0.001 } },
            { name: "蛇血劍毒", player: { poison: 0.054 }, self: {} }
        ],
        icon: "⚡", flash: "rgba(125, 211, 252, 0.36)",   // 雷光
        rewards: { coinMinutes: 60, merit: [600, 1200], shards: [14, 22], iron: [16, 26] }
    },
    // 第 50 層樓主・分水嶺（2026-10-02 玩家提供圖 848×1264：銀髮紫袍的魔道老祖手持七寶虯杖、豎指施法，身後六道漩渦（天、我、動、態…）與多臂魔像、紫雷，腳下紫色法陣）：
    //   《凡人修仙傳》魔道巨擘「六道極聖」。手動蓋過自動產生的「青冥邪神」（本來就是魔修）；境界仙人初境 10 階、減傷閃避、雷擊、樓主獎勵沿用。
    //   **使用者指定「50 層開始是分水嶺，只有上層的修仙者才能戰勝」**：目標由「中等 80%」改為與 60～100 層樓主相同的「強力 80%」→ 中等配置過不了。
    //   原第 50 層：中等 80%、強力 100%。攻擊與氣血一起放大（氣血 ∝ √攻擊，同 ZHENMO_GEN.tune 的比例）二分搜尋：×6.95／×1.9 → 強力 80%（2000 場）、中等 0%、一般 0%
    //   光環改名不改效果（「魔魂蝕骨」中毒 5.8%、「天道輪轉」雙方閃避 +4、「六道破甲」你的減傷 −7、「六道輪迴咒」詛咒 +7.3%）；五行金 → 土
    50: {
        name: "六道極聖", race: "demon", title: "六道輪迴・第 50 層樓主", img: "images/zhenmo/boss-liudao.jpg", imgPos: "50% 22%",
        realm: 10, stage: 10, atkMult: 6.95, hpMult: 1.9,
        hpPerAtk: 300,
        def: 25, eva: 18, affix: "thunder", affixVal: 25, element: "土",
        intro: "魔道六宗公認的第一人，修成「六道輪迴」魔功，一身法力深不可測，連正道元嬰老怪聽到名號也要退避三舍。鎮魔塔以他為第五十層樓主——從這一層起是修仙者的分水嶺，過不了他的人，就只配在下面五十層打轉。",
        taunt: "老夫坐鎮此層千年，能站到我面前的，十不存一。",
        skills: ["六道輪迴", "天魔紫雷", "七寶虯杖", "萬魂歸墟"],
        auras: [
            { name: "魔魂蝕骨", player: { poison: 0.058 }, self: {} },
            { name: "天道輪轉", player: { eva: 4 }, self: { eva: 4 } },
            { name: "六道破甲", player: { def: 7 }, self: {} },
            { name: "六道輪迴咒", player: { curse: 0.073 }, self: {} }
        ],
        icon: "☯️", flash: "rgba(147, 51, 234, 0.36)",   // 六道紫光
        rewards: { coinMinutes: 70, merit: [700, 1400], shards: [16, 24], iron: [18, 28] }
    }
};

// ==================== 第 7～100 層：自動產生（2026-09-29 使用者要求「後續關卡每一關持續強化」）====================
// 上面有手動設定的樓層優先（之後玩家提供新 BOSS 圖與資料時，直接在 ZHENMO_BOSSES 加一筆即可蓋過）。規則：
//   境界：第 n 層＝煉虛起每層一階（11～20 層合體 1～10 階…91～100 層混沌道祖），境界比玩家高時另有境界壓制（zhenmo.js 的 bossStats）
//   持續強化：攻擊每層 +1%（ZHENMO_GEN.perFloor）、氣血每層 +0.5%（perFloorHp）；個位數 5 的層攻擊 ×1.5（小關卡）、個位數 0 的層攻擊 ×2（大關卡，光環多 1 個、獎勵 ×2）
//   減傷／閃避／屬性傷害隨樓層提高；光環 2～4 個、大關卡 +1（elements.js 的 combineAuras），強度隨樓層放大到 2 倍
//   圖片沿用現有 6 張 BOSS 圖輪流；名稱由 prefix × suffix 組成（每層不重複）
const ZHENMO_GEN = {
    perFloor: 0.01, perFloorHp: 0.005, gate5Atk: 1.5, gate10Atk: 2,   // 氣血每層 +0.5%（+1% 時第 100 層太久，燒傷／持續扣血累積到強力配置 0 勝）
    // 每層校準倍率 [攻擊, 氣血]（2026-09-29，乘在上面公式算出的 atkMult／hpMult 上）：依使用者指定的目標勝率，含 ZHENMO_BOSS_VARIANCE 隨機氣勢，各 150～200 場二分搜尋而得
    //   目標（玩家與該層同境界同階；中等＝攻 ×2 血 ×1.5 減 30 閃 20、強力＝攻 ×4 血 ×2 減 60 閃 40，見 ARCHITECTURE.md 第 51 節）：
    //   7～50 層 中等 80%；60、70、80、90、100 樓主與 95 層 強力 80%；55、65、75、85 鎮關者 中等 60%（強力會是 100%）；其餘 51～99 層 強力 90%
    //   改公式或光環後要重新校準（測試頁的校準腳本寫在第 51 節）
    tune: {
        7: [1.962, 1.401], 8: [2.496, 1.58], 9: [2.167, 1.472], 10: [1.35, 1.162], 11: [2.375, 1.541], 12: [2.039, 1.428],
        13: [1.811, 1.346], 14: [2.252, 1.501], 15: [1.822, 1.35], 16: [2.44, 1.562], 17: [2.151, 1.467], 18: [2.118, 1.455],
        19: [2.039, 1.428], 20: [1.376, 1.173], 21: [2.243, 1.498], 22: [1.743, 1.32], 23: [1.717, 1.31], 24: [2.143, 1.464],
        25: [1.429, 1.195], 26: [1.787, 1.337], 27: [1.853, 1.361], 28: [2.023, 1.422], 29: [2.016, 1.42], 30: [1.085, 1.042],
        31: [1.892, 1.375], 32: [1.892, 1.375], 33: [1.867, 1.366], 34: [1.846, 1.359], 35: [1.27, 1.127], 36: [1.603, 1.266],
        37: [1.394, 1.181], 38: [1.557, 1.248], 39: [1.537, 1.24], 40: [0.992, 0.996], 41: [1.656, 1.287], 42: [1.289, 1.135],
        43: [1.44, 1.2], 44: [1.591, 1.261], 45: [1.376, 1.173], 46: [1.808, 1.345], 47: [1.554, 1.247], 48: [1.352, 1.163],
        49: [1.365, 1.168], 50: [1.029, 1.014], 51: [3.299, 1.816], 52: [2.81, 1.676], 53: [2.875, 1.696], 54: [2.559, 1.6],
        55: [0.994, 0.997], 56: [2.684, 1.638], 57: [2.87, 1.694], 58: [3.182, 1.784], 59: [3.325, 1.823], 60: [1.63, 1.304],   // 60 層 2026-09-30 由 1.7 微調（強力 73% → 約 80%）
        61: [3.541, 1.882], 62: [2.982, 1.727], 63: [3.152, 1.775], 64: [2.584, 1.607], 65: [0.928, 0.963], 66: [2.54, 1.594],
        67: [2.098, 1.448], 68: [2.235, 1.495], 69: [2.326, 1.525], 70: [1.327, 1.152], 71: [2.147, 1.465], 72: [1.996, 1.413],
        73: [2.062, 1.436], 74: [2.731, 1.653], 75: [1.071, 1.035], 76: [2.953, 1.718], 77: [2.082, 1.443], 78: [2.027, 1.424],
        79: [2.151, 1.467], 80: [1.525, 1.235], 81: [2.086, 1.444], 82: [1.864, 1.365], 83: [1.557, 1.248], 84: [1.882, 1.372],
        85: [0.742, 0.861], 86: [2.066, 1.437], 87: [2.344, 1.531], 88: [2.407, 1.551], 89: [2.609, 1.615], 90: [1.339, 1.157],
        91: [2.624, 1.62], 92: [2.256, 1.502], 93: [1.97, 1.404], 94: [1.808, 1.345], 95: [1.625, 1.275], 96: [1.563, 1.25],
        97: [1.381, 1.175], 98: [1.777, 1.333], 99: [1.808, 1.345], 100: [0.941, 0.97]
    },
    imgs: [
        { img: "images/zhenmo/boss-qitianshen.jpg", pos: "50% 30%" }, { img: "images/zhenmo/boss-bumiegu.jpg", pos: "50% 30%" },
        { img: "images/zhenmo/boss-zhuzhou.jpg", pos: "50% 30%" },    { img: "images/zhenmo/boss-guihu.jpg", pos: "60% 40%" },
        { img: "images/zhenmo/boss-qingming.jpg", pos: "50% 25%" },   { img: "images/zhenmo/boss-pharaoh.jpg", pos: "50% 30%" }
    ],
    prefix: ["玄冥", "赤炎", "九幽", "太虛", "血煞", "青冥", "紫霄", "玄冰", "幽羅", "天魔"],
    suffix: ["魔君", "屍王", "妖皇", "鬼帝", "魔龍", "邪神", "劍魔", "血尊", "戰神", "魔尊"],
    affixes: ["thunder", "poison", "ice", "metal", "fire"],
    elements: ["金", "木", "水", "火", "土"],
    icons: { thunder: "⚡", poison: "☠️", ice: "❄️", metal: "⚔️", fire: "🔥" },
    flashes: { thunder: "rgba(147, 197, 253, 0.3)", poison: "rgba(132, 204, 22, 0.3)", ice: "rgba(165, 243, 252, 0.3)", metal: "rgba(250, 204, 21, 0.3)", fire: "rgba(249, 115, 22, 0.32)" },
    // 光環範本（鎮魔塔一場約 300 回合、沒有丹藥與靈寵，所以每回合效果很小）；s = 強度（第 7 層 1 → 第 100 層 2）
    auras: [
        s => ({ name: "威壓", player: { atk: 0.05 * s }, self: { atk: 0.05 * s } }),
        s => ({ name: "鐵壁", player: {}, self: { def: Math.round(5 * s) } }),
        s => ({ name: "迷蹤", player: { eva: Math.round(3 * s) }, self: { eva: Math.round(3 * s) } }),
        s => ({ name: "寒獄", player: { freeze: Math.min(0.08, 0.02 * s) }, self: {} }),
        s => ({ name: "焚天", player: { burn: 0.04 * s }, self: {} }),
        s => ({ name: "蝕骨", player: { poison: 0.04 * s }, self: {} }),
        s => ({ name: "詛咒", player: { curse: 0.05 * s }, self: {} }),
        s => ({ name: "噬命", player: { dot: 0.001 * s }, self: {} }),
        s => ({ name: "不滅", player: {}, self: { regen: 0.001 * s } }),
        s => ({ name: "破甲", player: { def: Math.round(5 * s) }, self: {} })
    ]
};
(function generateZhenmoBosses() {
    const G = ZHENMO_GEN, r3 = v => Math.round(v * 1000) / 1000;
    for (let n = 7; n <= ZHENMO_TOTAL_FLOORS; n++) {
        if (ZHENMO_BOSSES[n]) continue;   // 手動設定優先
        const realm = 6 + Math.floor((n - 1) / 10), stage = (n - 1) % 10 + 1;
        const gate10 = n % 10 === 0, gate5 = n % 10 === 5;
        const grow = 1 + (n - 1) * G.perFloor;
        const affix = G.affixes[n % G.affixes.length], look = G.imgs[(n - 1) % G.imgs.length];
        const suffix = G.suffix[Math.floor(n / 10) % G.suffix.length];
        const d = Math.floor(n / 10);   // 每十層錯開一格，大關卡（個位數 0）的名稱與光環才不會都一樣
        const name = G.prefix[(n + d) % G.prefix.length] + suffix;
        // 光環強度 s：第 7 層 1 → 第 100 層 2；數量 2～4 個、大關卡再 +1（曾用 s 到 2.9、最多 6 個，第 100 層強力配置 0 勝）
        const s = 1 + (n - 7) / 93;
        const count = (n <= 30 ? 2 : n <= 70 ? 3 : 4) + (gate10 ? 1 : 0);
        const auras = [];
        for (let i = 0; i < count; i++) {
            const a = G.auras[(n * 3 + d + i * 7) % G.auras.length](s);
            ['player', 'self'].forEach(part => Object.keys(a[part]).forEach(k => { a[part][k] = r3(a[part][k]); }));
            a.name = name.slice(0, 2) + a.name;
            auras.push(a);
        }
        const rw = gate10 ? 2 : 1;
        ZHENMO_BOSSES[n] = {
            name, title: gate10 ? `第 ${n} 層樓主` : gate5 ? `第 ${n} 層鎮關者` : `第 ${n} 層守塔魔頭`,
            img: look.img, imgPos: look.pos, realm, stage,
            atkMult: r3(grow * (gate10 ? G.gate10Atk : gate5 ? G.gate5Atk : 1) * ((G.tune[n] || [1])[0])),
            hpMult: r3((1 + (n - 1) * G.perFloorHp) * ((G.tune[n] || [1, 1])[1])),   // × 校準倍率（ZHENMO_GEN.tune）
            hpPerAtk: 300,
            def: Math.min(35, 15 + Math.floor(n / 10) * 2), eva: Math.min(25, 8 + Math.floor(n / 10) * 2),
            affix, affixVal: Math.min(35, 15 + Math.floor(n / 10) * 2), element: G.elements[n % G.elements.length],
            intro: `鎮壓於第 ${n} 層的${suffix}，${gate10 ? '坐鎮此層樓主之位，魔威遠勝前層，' : gate5 ? '把守關隘，' : ''}久受塔中魔氣浸染，實力已達${realms[realm]}${stage}階。`,
            skills: [`${name.slice(0, 2)}魔掌`, `${suffix}怒嘯`, `${name.slice(0, 2)}滅殺`, `萬${suffix.slice(-1)}朝宗`],
            auras, icon: G.icons[affix], flash: G.flashes[affix],
            rewards: { coinMinutes: Math.round((10 + n * 0.5) * rw), merit: [(100 + n * 5) * rw, (200 + n * 10) * rw],
                       shards: [(3 + Math.floor(n / 10)) * rw, (6 + Math.floor(n / 8)) * rw], iron: [(4 + Math.floor(n / 10)) * rw, (8 + Math.floor(n / 8)) * rw] }
        };
    }
})();
