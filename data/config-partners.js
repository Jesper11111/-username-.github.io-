// 夥伴（情緣系統，ARCHITECTURE.md 第 39 節）；邏輯在 partner.js
// - 名動諸天的高手，多數是「域外神明」（來自其他作品的世界），於秘境中相遇後結識（秘境尚未開放，相遇時呼叫 meetPartner）
//   例外：first: true 的風希在天星城坊市點人偶結識（玩家第一個結識的夥伴）
// - 結識後從好感 LV1「初識」開始，問候／贈禮／情緣任務提升；達 LV4「熟識」才能邀請入隊（最多 2 名）
//   隊伍中的夥伴：passive 被動加成生效（併入 gear.js 的 getBonusTotals），戰鬥中每回合依 skill.chance 發動招牌絕學
// - 絕學欄位同神器技能（config-lingbao.js 的 artifactSkills，由 artifact.js 的 castProcSkill 執行），傷害以「主人」的攻擊力為基準
// - 戰力分析 power：六維 0～100（攻伐 atk、防禦 def、身法 spd、神通 mag、底蘊 found、成長 grow），平均值決定評級 PARTNER_TIERS
//   ⚠️ 戰力數值與評級為本遊戲設定，只作娛樂，並非原著官方設定
// - native: true 表示出身本界（《凡人修仙傳》人界），其餘皆為域外神明

// 評級：平均戰力 ≥ min 即屬該級（由高往低判定）；數值平衡建議 → 絕學 chance／mult 與被動總量
const PARTNER_TIERS = [
    { name: "至高", min: 95, color: "#f472b6", hint: "絕學 18%・×3.0 左右，被動約 8%" },
    { name: "帝境", min: 90, color: "#fb923c", hint: "絕學 17%・×2.6 左右，被動約 6%" },
    { name: "尊者", min: 82, color: "#c084fc", hint: "絕學 16%・×2.2 左右，被動約 4.5%" },
    { name: "天驕", min: 0,  color: "#60a5fa", hint: "絕學 15%・×1.8 左右，被動約 3.5%" }
];

const PARTNER_POWER_LABELS = { atk: "攻伐", def: "防禦", spd: "身法", mag: "神通", found: "底蘊", grow: "成長" };

// ---- 好感度（2026-09-27）----
// 等級依累積好感點數判定；LV5 名稱依雙方性別：異性「道侶」、同性「結拜」（partner.gender：f = 女，省略 = 男）
const PARTNER_BOND_LEVELS = [
    { lv: 1, name: "初識",     min: 0 },
    { lv: 2, name: "略有好感", min: 100 },
    { lv: 3, name: "友好",     min: 300 },
    { lv: 4, name: "熟識",     min: 700 },    // 達到才能邀請入隊
    { lv: 5, name: "道侶|結拜", min: 1500 }   // 最高級；"|" 前 = 異性、後 = 同性
];
const PARTNER_BOND_MAX = 1500;
const PARTNER_TEAM_MAX = 2;            // 隊伍最多同時邀請幾名夥伴（2026-09-29 使用者確認最多 2 人）
// 各評級的碎片從哪裡來（2026-09-29 使用者指定；partner.js 的 grantPartnerShards）：
//   天驕＝合體～渡劫：死守天南城第 11 波起（defense.js）、鎮魔塔第 11～40 層（zhenmo.js）
//   尊者＝仙人～天仙：死守天南城第 40 波起、鎮魔塔第 41～60 層（風希另外在天星城坊市）
//   帝境：奇遇「強者現身」（2026-10-01 使用者要求「奇遇可以碰見尊者或帝境強者」，encounter.js）
//   至高：三界戰場前四強（encounter.js；使用者只指定片數，來源是我訂的）
const PARTNER_MEET_HINT = {
    "天驕": "碎片：死守天南城第 11 波起、鎮魔塔第 11～40 層（合體～渡劫）",
    "尊者": "碎片：死守天南城第 40 波起、鎮魔塔第 41～60 層（仙人～天仙）、奇遇「強者現身」",
    "帝境": "碎片：奇遇「強者現身」",
    "至高": "碎片：奇遇「三界戰場」前四強"
};
// 夥伴碎片（2026-09-29 使用者要求「新增夥伴碎片，集滿 100 片激活夥伴」；partner.js 的 grantPartnerShards／activatePartner）：
//   死守天南城、鎮魔塔不再直接結識，改掉落某位未結識夥伴的碎片（player.partnerShards），集滿 PARTNER_SHARDS_NEED 在情緣視窗按「激活」＝結識
//   掉哪位：PARTNER_SHARD_FOCUS 機率給「碎片最多的那位」（集中湊滿一位），其餘隨機
const PARTNER_SHARDS_NEED = 100;
// 依評級需要的片數（2026-10-01 使用者指定：帝境 300、至高 500；partner.js 的 getPartnerShardsNeed）
const PARTNER_SHARDS_NEED_BY_TIER = { "天驕": 100, "尊者": 100, "帝境": 300, "至高": 500 };
const PARTNER_SHARD_FOCUS = 0.7;
// 夥伴絕學的靈力（2026-09-29 使用者要求「夥伴與寵物設定 MP，用完無法施放技能」；partner.js 的 partnerSkillTurn）
//   每位夥伴各自 PARTNER_MP_MAX 點，每回合回 PARTNER_MP_REGEN（野外刷新等待期間每秒也回），發動絕學扣該評級的消耗，不夠就不發動
const PARTNER_MP_MAX = 100;
const PARTNER_MP_REGEN = 4;
const PARTNER_SKILL_MP = { "天驕": 20, "尊者": 25, "帝境": 30, "至高": 35 };
const PARTNER_TEAM_MIN_LV = 4;         // 好感度幾級才能入隊（熟識）
const PARTNER_GREET_PTS = 20;          // 每日問候（每位每天一次）
const PARTNER_GIFT_PTS = 15;           // 每次贈禮
const PARTNER_GIFT_DAILY = 5;          // 每位每天最多贈禮次數
const PARTNER_GIFT_COST = { "天驕": 100000, "尊者": 500000, "帝境": 2000000, "至高": 5000000 };   // 每次贈禮的靈石（依評級）
const PARTNER_LV5_PASSIVE_MULT = 1.2;  // LV5 被動加成倍率
const PARTNER_LV5_SKILL_BONUS = 0.02;  // LV5 絕學發動機率加成

// 情緣任務：依「目前好感等級」接取對應任務，完成後一次加大量好感（每位夥伴各自進行，同時只能接一個）
//   stat = 追蹤的累計數值；teamKills 只計算「該夥伴在隊伍中」時的野外擊殺
const PARTNER_BOND_QUESTS = {
    1: { name: "並肩歷練", stat: "fieldKills", target: 300,  reward: 80,  desc: "在野外擊殺 {n} 隻妖獸，讓{who}見識你的身手" },
    2: { name: "斬妖除魔", stat: "evilKills",  target: 10,   reward: 150, desc: "斬殺 {n} 名野外修士或刺客" },
    3: { name: "共赴懸賞", stat: "bountyKills", target: 3,   reward: 250, desc: "懸賞伏誅 {n} 名，{who}想看看你的膽識" },
    4: { name: "生死與共", stat: "teamKills",  target: 1000, reward: 500, desc: "帶著{who}在隊伍中並肩擊殺 {n} 隻妖獸" }
};

// 通用問候台詞（沒有專屬台詞的夥伴使用），依好感等級；{me} = 玩家道號
const PARTNER_GREET_LINES = {
    1: ["道友有禮了。", "我們見過？……嗯，是有些印象。", "有事嗎？沒事我先忙了。"],
    2: ["{me}，今日氣色不錯。", "又來了？坐吧。", "聽說你最近修為又有精進。"],
    3: ["{me}！正想找你喝兩杯。", "有你這位朋友，倒也不算寂寞。", "若有需要幫忙之處，儘管開口。"],
    4: ["{me}，外頭有什麼好玩的，帶我一起去。", "你我之間，不必客氣。", "若遇強敵，我替你擋著。"],
    5: ["此生能與你同行，是我的造化。", "{me}，無論天涯海角，我都陪你走下去。", "有你在，便無所懼。"]
};

const partnerList = [
    {
        id: "xiaoyan", name: "蕭炎", title: "炎帝", work: "鬥破蒼穹", author: "天蠶土豆", world: "鬥氣大陸", peak: "鬥帝",
        power: { atk: 93, def: 85, spd: 87, mag: 95, found: 91, grow: 94 },
        analysis: "以異火起家，吞煉多種異火並融合出毀滅性的火焰攻勢；煉藥術同樣登峰造極，持久戰能靠丹藥與火焰雙線壓制。短板在肉身防禦，靠身法彌補。",
        passive: { fire: 3, "fx:焚燼": 0.30, magPct: 0.02 },
        skill: { name: "佛怒火蓮", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.6, attrs: { fire: 100 },
                 desc: "17%：全體術法 260% 傷害並必定燒傷", msg: "🔥 炎帝蕭炎雙手結印，【佛怒火蓮】轟然綻放！" }
    },
    {
        id: "lindong", name: "林動", title: "武祖", work: "武動乾坤", author: "天蠶土豆", world: "天玄大陸", peak: "祖境",
        power: { atk: 92, def: 88, spd: 85, mag: 93, found: 92, grow: 90 },
        analysis: "身懷祖符，尤以吞噬之力見長，能化敵之力為己用、越戰越勇；精神力修為深厚，符陣與武學兼修，續航能力極強。",
        passive: { "fx:吸血": 0.03, atkPct: 0.03 },
        skill: { name: "吞噬祖符", chance: 0.17, target: "single", dmgType: "mag", mult: 2.6, lifesteal: 0.3,
                 desc: "17%：單體術法 260% 傷害，吸取傷害 30% 回復氣血", msg: "🌀 武祖林動祭出【吞噬祖符】，萬物之力盡歸己身！" }
    },
    {
        // 「亂星海第一大善人」：九級化形妖獸風希（裂風獸），反派
        id: "dashanren", name: "風希", first: true,   // 玩家第一個結識的夥伴：天星城坊市點人偶結識（town.js 的 figures action）
        // 彩蛋：當天已問候後再點坊市人偶 → 問「想看我跳支舞嗎？」
        //   否、或影片沒看完就關掉 = 好感 -noPenalty（反感）；是且完整看完（實際播放 ≥ 90%）= 只有第一次好感 +firstWatchBonus
        easter: { ask: "你想看我跳支舞嗎？", yes: "嘿嘿，看好了！", no: "哼！不識好歹……", noPenalty: 1, video: "videos/fengxi-dance.mp4",
                  quit: "看到一半就走？不給面子！", watched: "怎麼樣，風某的舞姿不錯吧？", firstWatchBonus: 5 },
        lines: {
            meet: ["喲，這位道友面生得很……", "在下風希，人稱「亂星海第一大善人」。這天星城坊市，就沒有我風某不知道的事。", "你我今日有緣，往後在亂星海遇上麻煩，報我的名號便是。"],
            greet: {
                1: ["大善人今日心情好，不收你問路錢。", "天星賭坊的石頭？嘿，十塊有九塊是廢料。"],
                2: ["又是你？看來風某這張臉還挺討喜。", "亂星海的妖獸最近不安分，出門小心些。"],
                3: ["你這人倒也有趣，比那些正道偽君子順眼多了。", "想知道誰在坊市暗中收購妖丹？問我就對了。"],
                4: ["走吧，風某陪你去殺個痛快。", "大善人只對自己人善，你算一個。"],
                5: ["這亂星海，有你我二人便足矣。", "往後誰敢動你，先問過我風希。"]
            }
        },
        title: "亂星海第一大善人", work: "凡人修仙傳", author: "忘語", world: "人界・亂星海", peak: "九級化形妖獸（裂風獸）", native: true,
        power: { atk: 85, def: 82, spd: 92, mag: 82, found: 80, grow: 78 },
        analysis: "裂風獸化形的九級妖獸，以「亂星海第一大善人」自居，實為盤踞亂星海的反派。本體風屬天賦極強，來去如風、攻勢凌厲，速度是最大的倚仗；妖獸肉身也頗為強橫，但境界止於人界巔峰，面對域外神明底蘊不足。",
        passive: { eva: 3, "fx:疾風": 0.03 },
        skill: { name: "裂風", chance: 0.16, target: "aoe", dmgType: "phys", mult: 2.2,
                 desc: "16%：全體物理 220% 傷害", msg: "🌪️ 風希現出裂風獸真身，【裂風】撕裂四方！" }
    },
    {
        // 厲飛雨死後輪迴，轉世為魔界天煞聖皇（石空徹），石穿空之父
        id: "lifeiyu", name: "厲飛雨", title: "天煞聖皇", work: "凡人修仙傳", author: "忘語", world: "人界・越國七玄門 → 轉世魔界", peak: "天煞聖皇・石空徹（轉世後）", native: true,
        power: { atk: 91, def: 86, spd: 86, mag: 88, found: 88, grow: 85 },
        analysis: "凡俗武者時已敢以命搏命、捨身不退；死後魂入輪迴，於靈界轉世為威震魔界的天煞聖皇石空徹，也就是魔域頂尖強者石穿空之父。聖皇之身殺伐之氣更盛，攻勢霸道。「殺人放火厲飛雨」是讀者間流傳的名號梗。",
        passive: { physPct: 0.04, "fx:斬殺": 0.20 },
        skill: { name: "天煞魔威", chance: 0.16, target: "single", dmgType: "phys", mult: 2.2,
                 desc: "16%：單體物理 220% 傷害", msg: "😈 天煞聖皇石空徹魔威滔天，【天煞魔威】碾壓而下！" }
    },
    {
        // 2026-09-26 玩家指定：韓立（道祖）、南宮婉（大羅境）
        id: "hanli", name: "韓立", title: "道祖", work: "凡人修仙傳", author: "忘語", world: "人界 → 靈界 → 仙界", peak: "道祖", native: true,
        power: { atk: 95, def: 96, spd: 94, mag: 96, found: 98, grow: 97 },
        analysis: "資質平平的凡人出身，卻憑極致的謹慎與掌天瓶一路逆襲，自人界、靈界修至仙界，終成道祖。煉丹、法寶、神識、肉身面面俱到，從不打沒把握的仗，出手則必定穩中求勝。",
        passive: { atkPct: 0.04, statPct: 0.03, "fx:丹心": 0.20 },
        skill: { name: "青竹蜂雲劍陣", chance: 0.18, target: "aoe", dmgType: "phys", mult: 2.4, attrs: { thunder: 100 },
                 desc: "18%：全體物理 240% 傷害並必定雷擊", msg: "⚡ 道祖韓立袖袍一揮，【青竹蜂雲劍陣】挾辟邪神雷橫掃八方！" }
    },
    {
        id: "nangongwan", gender: "f", name: "南宮婉", title: "大羅仙子", work: "凡人修仙傳", author: "忘語", world: "人界・掩月宗 → 仙界", peak: "大羅境", native: true,
        power: { atk: 88, def: 90, spd: 92, mag: 95, found: 92, grow: 93 },
        analysis: "掩月宗出身，修素女輪迴功，與韓立結為道侶。心性堅韌、功法玄妙，飛升仙界後修至大羅境；術法與身法見長，攻守之間兼具柔韌與後勁。",
        passive: { magPct: 0.03, eva: 2, "fx:回靈": 0.015 },
        skill: { name: "素女輪迴", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.2, heal: 0.08,
                 desc: "17%：全體術法 220% 傷害，主人回復 8% 氣血", msg: "🌸 南宮婉運轉【素女輪迴】，月華流轉、生生不息！" }
    },
    {
        id: "chennan", name: "辰南", title: "至高逆天", work: "神墓", author: "辰東", world: "神墓世界・天界", peak: "至高逆天",
        power: { atk: 98, def: 96, spd: 95, mag: 97, found: 96, grow: 98 },
        analysis: "自神墓中復甦的逆天者，歷經萬劫而不滅；攻防俱臻極致，意志與成長性驚人，面對強敵反而愈戰愈強。",
        passive: { atkPct: 0.04, def: 3 },
        skill: { name: "逆天一擊", chance: 0.18, target: "single", dmgType: "phys", mult: 3.0,
                 desc: "18%：單體物理 300% 傷害", msg: "💥 辰南逆天而上，【逆天一擊】震碎虛空！" }
    },
    {
        id: "muchen", name: "牧塵", title: "大主宰", work: "大主宰", author: "天蠶土豆", world: "大千世界", peak: "大主宰",
        power: { atk: 90, def: 90, spd: 88, mag: 92, found: 90, grow: 90 },
        analysis: "以浮屠一脈的底蘊打底，靈力雄渾、陣法與戰陣運用純熟；攻守均衡、少有明顯破綻，擅長一邊壓制一邊護住同伴。",
        passive: { statPct: 0.03, hpPct: 0.02 },
        skill: { name: "八部浮屠", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.2, shield: { reduce: 0.3, duration: 2 },
                 desc: "17%：全體術法 220% 傷害，主人受到傷害 -30% 持續 2 回合", msg: "🏯 大主宰牧塵祭出【八部浮屠】，浮屠鎮壓八方！" }
    },
    {
        id: "tangsan", name: "唐三", title: "修羅神", work: "斗羅大陸", author: "唐家三少", world: "斗羅大陸・神界", peak: "修羅神・海神",
        power: { atk: 88, def: 86, spd: 88, mag: 90, found: 92, grow: 86 },
        analysis: "雙生武魂，藍銀草牽制、昊天錘爆發，再加上暗器的無聲殺機，戰鬥節奏由他掌控；神位加身後殺伐之氣大增。",
        passive: { "fx:追擊": 0.08, poison: 2 },
        skill: { name: "藍銀囚籠・昊天錘", chance: 0.16, target: "single", dmgType: "phys", mult: 1.6, freezeAll: true,
                 desc: "16%：單體物理 160% 傷害，藍銀草纏住所有敵人（凍結 1 回合）", msg: "🌿 唐三藍銀草纏天而起，【藍銀囚籠】困住群敵，昊天錘隨即落下！" }
    },
    {
        id: "yefan", name: "葉凡", title: "葉天帝", work: "遮天", author: "辰東", world: "遮天世界・北斗星域", peak: "天帝",
        power: { atk: 97, def: 97, spd: 93, mag: 95, found: 96, grow: 97 },
        analysis: "荒古聖體被視為難以成道的體質，他卻一路逆伐成帝；肉身無雙，萬物母氣鼎攻守一體，是正面硬戰最難撼動的存在。",
        passive: { hpPct: 0.04, conPct: 0.04 },
        skill: { name: "聖體鎮世", chance: 0.18, target: "single", dmgType: "phys", mult: 3.0, heal: 0.06,
                 desc: "18%：單體物理 300% 傷害，主人回復 6% 氣血", msg: "✊ 葉天帝聖體金光大盛，【聖體鎮世】一拳轟出！" }
    },
    {
        id: "hengren", gender: "f", name: "狠人大帝", title: "狠人", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 98, def: 94, spd: 92, mag: 98, found: 95, grow: 97 },
        analysis: "出身卑微而以狠絕之心登頂，吞天魔罐在手，擅吞噬萬法與生機；攻伐與術法皆處於頂端，對敵從不留餘地。",
        passive: { magPct: 0.05, poison: 2 },
        skill: { name: "吞天魔功", chance: 0.18, target: "single", dmgType: "mag", mult: 3.0, attrs: { poison: 100 }, lifesteal: 0.25,
                 desc: "18%：單體術法 300% 傷害並必定中毒，吸取傷害 25%", msg: "🏺 狠人大帝運轉【吞天魔功】，敵手精元盡被吞噬！" }
    },
    {
        id: "wushi", name: "無始大帝", title: "無始", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 96, def: 97, spd: 92, mag: 95, found: 96, grow: 93 },
        analysis: "無始鐘攻防兼備，氣勢壓人，戰力極其穩定；不以奇招取勝，而是以絕對的底蘊與境界正面碾壓。",
        passive: { def: 3, atkPct: 0.02 },
        skill: { name: "無始鐘鳴", chance: 0.17, target: "aoe", dmgType: "phys", mult: 2.2, shield: { reduce: 0.3, duration: 2 },
                 desc: "17%：全體物理 220% 傷害，主人受到傷害 -30% 持續 2 回合", msg: "🔔 無始大帝輕撫古鐘，【無始鐘鳴】響徹諸天！" }
    },
    {
        id: "duande", name: "段德", title: "段德天尊", work: "遮天", author: "辰東", world: "遮天世界", peak: "天尊",
        power: { atk: 82, def: 85, spd: 93, mag: 88, found: 95, grow: 90 },
        analysis: "精通源術、擅長探掘古地，底蘊深厚卻行事無賴；打得過就搶、打不過就逃，保命與斂財能力一流。",
        passive: { "fx:聚財": 0.10, eva: 2 },
        skill: { name: "源術・封", chance: 0.16, target: "single", dmgType: "mag", mult: 2.2, attrs: { ice: 100 },
                 desc: "16%：單體術法 220% 傷害並必定凍結", msg: "📜 段德掐訣佈下【源術・封】，將敵手封入源石之中！" }
    },
    {
        id: "douzhan", name: "鬥戰聖皇", title: "鬥戰聖皇", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 98, def: 92, spd: 95, mag: 90, found: 92, grow: 95 },
        analysis: "為戰而生的聖猿一脈至強者，戰意越打越高，近身搏殺幾乎無人能擋，是純粹的攻伐之王。",
        passive: { physPct: 0.05, "fx:疾風": 0.04 },
        skill: { name: "鬥戰聖法", chance: 0.17, target: "single", dmgType: "phys", mult: 2.6,
                 desc: "17%：單體物理 260% 傷害", msg: "🐒 鬥戰聖皇戰意沖霄，【鬥戰聖法】一棍砸落！" }
    },
    {
        id: "xukong", name: "虛空大帝", title: "虛空", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 93, def: 92, spd: 97, mag: 95, found: 92, grow: 91 },
        analysis: "掌控虛空之力，出入如意，攻擊軌跡難以預判；以一人之力守護人族的形象深入人心。",
        passive: { eva: 3, atkPct: 0.02 },
        skill: { name: "虛空鏡照", chance: 0.17, target: "single", dmgType: "mag", mult: 2.6,
                 desc: "17%：單體術法 260% 傷害", msg: "🪞 虛空大帝祭出虛空鏡，【虛空鏡照】洞穿一切！" }
    },
    {
        id: "hengyu", name: "恆宇大帝", title: "恆宇", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 92, def: 95, spd: 90, mag: 93, found: 95, grow: 90 },
        analysis: "恆宇爐為其根本，攻防兼具又擅煉化，屬於穩紮穩打、越拖越強的持久戰型大帝。",
        passive: { def: 2, hpPct: 0.02, "fx:丹心": 0.20 },
        skill: { name: "恆宇爐煉", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.2, attrs: { fire: 100 },
                 desc: "17%：全體術法 220% 傷害並必定燒傷", msg: "⚱️ 恆宇大帝催動恆宇爐，【恆宇爐煉】焚煉群敵！" }
    },
    {
        id: "qingdi", name: "青帝", title: "青帝", work: "遮天", author: "辰東", world: "遮天世界・妖族", peak: "大帝",
        power: { atk: 93, def: 93, spd: 92, mag: 96, found: 94, grow: 94 },
        analysis: "混沌青蓮得道成帝，生機無窮、術法玄妙，既能攻伐也能自癒，是妖族的至高象徵。",
        passive: { magPct: 0.03, "fx:回春": 0.015 },
        skill: { name: "青蓮綻世", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.2, heal: 0.10,
                 desc: "17%：全體術法 220% 傷害，主人回復 10% 氣血", msg: "🪷 青帝身後混沌青蓮綻放，【青蓮綻世】生滅一念！" }
    },
    {
        id: "xihuangmu", gender: "f", name: "西皇母", title: "西皇", work: "遮天", author: "辰東", world: "遮天世界", peak: "大帝",
        power: { atk: 90, def: 94, spd: 90, mag: 95, found: 94, grow: 92 },
        analysis: "女帝之一，手持西皇塔，攻守平衡、術法精深，擅以守為攻、後發制人。",
        passive: { def: 2, magPct: 0.03 },
        skill: { name: "西皇塔鎮", chance: 0.17, target: "single", dmgType: "mag", mult: 2.2, shield: { reduce: 0.4, duration: 2 },
                 desc: "17%：單體術法 220% 傷害，主人受到傷害 -40% 持續 2 回合", msg: "🗼 西皇母祭起西皇塔，【西皇塔鎮】鎮壓來敵！" }
    },
    {
        id: "amituo", name: "阿彌陀佛大帝", title: "阿彌陀佛", work: "遮天", author: "辰東", world: "遮天世界・佛門", peak: "大帝",
        power: { atk: 88, def: 96, spd: 88, mag: 96, found: 95, grow: 92 },
        analysis: "佛法無邊、願力深厚，防禦與淨化能力極強，以慈悲之力化解殺伐，正面耐戰首屈一指。",
        passive: { def: 3, "fx:積德": 0.20 },
        skill: { name: "佛光普照", chance: 0.17, target: "self", heal: 0.15, shield: { reduce: 0.5, duration: 2 },
                 desc: "17%：主人回復 15% 氣血，受到傷害 -50% 持續 2 回合", msg: "🙏 阿彌陀佛大帝低誦佛號，【佛光普照】護佑周身！" }
    },
    {
        // 2026-09-26 玩家修正：稱號「渾源領主」（人稱羅城主），戰力以渾源領主時期計
        id: "luofeng", name: "羅峰", title: "渾源領主", work: "吞噬星空", author: "我吃西紅柿", world: "吞噬星空・原始宇宙", peak: "渾源領主（羅城主）",
        power: { atk: 98, def: 98, spd: 96, mag: 97, found: 98, grow: 99 },
        analysis: "從地球一路崛起，終成渾源領主、坐鎮羅城，人稱羅城主。金角巨獸本尊與多重分身合一運用，生命力近乎不滅；底蘊與成長都處於諸天頂端，擅以多身合擊碾壓對手。",
        passive: { hpPct: 0.05, atkPct: 0.04 },
        skill: { name: "金角巨獸", chance: 0.18, target: "aoe", dmgType: "phys", mult: 2.5, heal: 0.10,
                 desc: "18%：全體物理 250% 傷害，主人回復 10% 氣血", msg: "🦏 渾源領主羅峰化身【金角巨獸】，巨角橫掃諸天！" }
    },
    {
        id: "shihao", name: "石昊", title: "荒天帝", work: "完美世界", author: "辰東", world: "完美世界・九天十地", peak: "荒天帝",
        power: { atk: 99, def: 97, spd: 96, mag: 97, found: 97, grow: 99 },
        analysis: "被奪至尊骨後逆勢崛起，兼修諸多凶獸寶術，一路殺穿異域；戰意、肉身、術法皆臻極境，是戰力天花板級的存在。",
        passive: { atkPct: 0.05, statPct: 0.02 },
        skill: { name: "十凶寶術", chance: 0.18, target: "aoe", dmgType: "phys", mult: 2.4, attrs: { thunder: 100 },
                 desc: "18%：全體物理 240% 傷害並必定雷擊", msg: "⚡ 荒天帝石昊演化【十凶寶術】，雷帝、鯤鵬之影同時降臨！" }
    },
    {
        id: "wanglin", name: "王林", title: "仙逆", work: "仙逆", author: "耳根", world: "仙逆世界", peak: "踏天",
        power: { atk: 95, def: 88, spd: 90, mag: 95, found: 90, grow: 94 },
        analysis: "資質平庸卻心性堅忍，以殺入道；禁制、殺戮、因果諸道兼修，出手狠辣從不留情，專克強敵。",
        passive: { atkPct: 0.03, "fx:斬殺": 0.30 },
        skill: { name: "殺戮之道", chance: 0.17, target: "single", dmgType: "mag", mult: 2.6,
                 desc: "17%：單體術法 260% 傷害", msg: "🩸 王林眼中殺意凝聚，【殺戮之道】一指斬落！" }
    },
    {
        id: "menghao", name: "孟浩", title: "封天", work: "我欲封天", author: "耳根", world: "山海界", peak: "封天",
        power: { atk: 90, def: 90, spd: 90, mag: 92, found: 92, grow: 93 },
        analysis: "精於算計又不失熱血，以丹道起家，肉身、法術、道境多路並進，越到後期越難以撼動。",
        passive: { statPct: 0.03, "fx:丹心": 0.20 },
        skill: { name: "封天一指", chance: 0.17, target: "single", dmgType: "mag", mult: 2.6,
                 desc: "17%：單體術法 260% 傷害", msg: "☝️ 孟浩一指點出，【封天一指】封鎮天地！" }
    },
    {
        id: "baixiaochun", name: "白小純", title: "一念永恆", work: "一念永恆", author: "耳根", world: "一念永恆世界", peak: "（原著後期）",
        power: { atk: 80, def: 97, spd: 88, mag: 85, found: 88, grow: 92 },
        analysis: "怕死到極致，反把不死長生功練到極致，防禦與恢復極其驚人；看似膽小，卻常在關鍵時刻爆發。",
        passive: { def: 3, hpPct: 0.03 },
        skill: { name: "不死長生功", chance: 0.16, target: "self", heal: 0.15, shield: { reduce: 0.4, duration: 2 },
                 desc: "16%：主人回復 15% 氣血，受到傷害 -40% 持續 2 回合", msg: "🛡️ 白小純大喊不要打臉，運轉【不死長生功】硬扛下來！" }
    },
    {
        id: "qinyu", name: "秦羽", title: "鴻蒙之主", work: "星辰變", author: "我吃西紅柿", world: "星辰變世界・鴻蒙空間", peak: "鴻蒙掌控者",
        power: { atk: 95, def: 94, spd: 93, mag: 96, found: 96, grow: 96 },
        analysis: "天生無法修煉內功，卻另闢星辰變之路，一路超脫至鴻蒙之主；底蘊與成長都登峰造極。",
        passive: { statPct: 0.03, magPct: 0.03 },
        skill: { name: "星辰變", chance: 0.18, target: "aoe", dmgType: "mag", mult: 2.4,
                 desc: "18%：全體術法 240% 傷害", msg: "✨ 秦羽周身星辰流轉，【星辰變】引動漫天星力！" }
    },
    {
        id: "linlei", name: "林雷", title: "盤龍", work: "盤龍", author: "我吃西紅柿", world: "盤龍世界・玉蘭大陸", peak: "鴻蒙掌控者",
        power: { atk: 93, def: 94, spd: 90, mag: 92, found: 93, grow: 94 },
        analysis: "大地與風等法則兼修，化身龍血戰士時肉身與攻擊大增；穩健之中帶著爆發，是可靠的前排。",
        passive: { def: 2, physPct: 0.03 },
        skill: { name: "大地脈動", chance: 0.17, target: "aoe", dmgType: "phys", mult: 2.2,
                 desc: "17%：全體物理 220% 傷害", msg: "🐉 林雷化身龍血戰士，【大地脈動】撼動四方！" }
    },
    {
        id: "zhangxiaofan", name: "張小凡", title: "鬼厲", work: "誅仙", author: "蕭鼎", world: "誅仙世界・青雲山", peak: "佛道魔三家兼修",
        power: { atk: 85, def: 80, spd: 82, mag: 88, found: 86, grow: 84 },
        analysis: "佛、道、魔三家功法集於一身，燒火棍（噬魂棒）吸血噬魂，正邪兩道皆忌憚；情深而偏執，爆發力強。",
        passive: { "fx:吸血": 0.02, magPct: 0.02 },
        skill: { name: "噬魂", chance: 0.16, target: "single", dmgType: "mag", mult: 2.2, lifesteal: 0.25,
                 desc: "16%：單體術法 220% 傷害，吸取傷害 25%", msg: "🪄 鬼厲噬魂棒黑氣翻湧，【噬魂】吞吸敵手精血！" }
    },
    {
        id: "liqiye", name: "李七夜", title: "萬古帝尊", work: "帝霸", author: "厭筆蕭生", world: "帝霸世界", peak: "（萬古不朽）",
        power: { atk: 96, def: 95, spd: 95, mag: 97, found: 99, grow: 95 },
        analysis: "以萬古布局見長的謀略者，閱歷之深無人能及；戰前佈下的後手往往就決定勝負，底蘊深不可測。",
        passive: { statPct: 0.03, "fx:悟道": 0.10 },
        skill: { name: "萬古一擊", chance: 0.18, target: "single", dmgType: "mag", mult: 3.0,
                 desc: "18%：單體術法 300% 傷害", msg: "🌌 李七夜淡然出手，【萬古一擊】早已算盡一切！" }
    },

    // ---- 2026-09-26 玩家指定新增 ----
    {
        id: "hong", name: "洪", title: "永恆真神", work: "吞噬星空2", author: "我吃西紅柿", world: "吞噬星空世界", peak: "永恆真神境",
        power: { atk: 96, def: 95, spd: 94, mag: 96, found: 97, grow: 95 },
        analysis: "地球人族的傳奇強者，羅峰的前輩，也是人族撐起一片天的支柱。道心沉穩、底蘊深厚，攻守之間毫無破綻，踏入永恆真神境後更是穩如磐石。",
        passive: { atkPct: 0.04, statPct: 0.03 },
        skill: { name: "永恆神威", chance: 0.18, target: "single", dmgType: "phys", mult: 3.0,
                 desc: "18%：單體物理 300% 傷害", msg: "🌟 永恆真神洪踏步而出，【永恆神威】鎮壓一切！" }
    },
    {
        id: "leishen", name: "雷神", title: "永恆真神", work: "吞噬星空2", author: "我吃西紅柿", world: "吞噬星空世界", peak: "永恆真神境",
        power: { atk: 97, def: 93, spd: 96, mag: 96, found: 94, grow: 94 },
        analysis: "與洪同為地球人族的頂尖強者，雷電之道登峰造極，出手迅疾如雷、攻勢狂暴；踏入永恆真神境後，一身雷霆足以撕裂星空。",
        passive: { thunder: 4, atkPct: 0.04 },
        skill: { name: "雷神之怒", chance: 0.18, target: "aoe", dmgType: "mag", mult: 2.4, attrs: { thunder: 100 },
                 desc: "18%：全體術法 240% 傷害並必定雷擊", msg: "⚡ 雷神怒喝一聲，【雷神之怒】萬雷齊落！" }
    },
    {
        id: "huoyuhao", name: "霍雨浩", title: "情緒之神", work: "斗羅大陸II絕世唐門", author: "唐家三少", world: "斗羅大陸（萬年後）", peak: "情緒之神",
        power: { atk: 88, def: 86, spd: 90, mag: 96, found: 92, grow: 94 },
        analysis: "精神系的絕世天才，身懷靈眸與冰碧帝皇蠍雙武魂，擅長精神探測、共享與極寒控場，以智取勝；成神後執掌情緒神位，精神攻擊更是防不勝防。",
        passive: { magPct: 0.03, ice: 2, intPct: 0.02 },
        skill: { name: "冰碧帝皇蠍・極致之冰", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.0, attrs: { ice: 100 },
                 desc: "17%：全體術法 200% 傷害並必定凍結", msg: "❄️ 情緒之神霍雨浩喚出冰碧帝皇蠍，【極致之冰】冰封全場！" }
    },
    {
        id: "tangwulin", name: "唐舞麟", title: "毀滅之神", work: "斗羅大陸IV終極斗羅", author: "唐家三少", world: "斗羅大陸", peak: "毀滅之神",
        power: { atk: 96, def: 95, spd: 91, mag: 92, found: 94, grow: 94 },
        analysis: "身具金龍王血脈，肉身力量與防禦驚人，近身搏殺勢不可擋；執掌毀滅神位後，攻勢帶著毀天滅地的霸道，是正面強攻的代表。",
        passive: { physPct: 0.04, hpPct: 0.02 },
        skill: { name: "金龍王・毀滅", chance: 0.17, target: "single", dmgType: "phys", mult: 2.6,
                 desc: "17%：單體物理 260% 傷害", msg: "🐲 毀滅之神唐舞麟金龍王血脈沸騰，【毀滅】一擊轟落！" }
    },
    {
        id: "guyuena", gender: "f", name: "古月娜", title: "生命之神", work: "斗羅大陸IV終極斗羅", author: "唐家三少", world: "斗羅大陸", peak: "生命之神",
        power: { atk: 90, def: 94, spd: 92, mag: 96, found: 95, grow: 93 },
        analysis: "銀龍王轉生，掌握龍族元素之力，術法變化萬千；執掌生命神位後生機源源不絕，既能以元素壓制敵手，也能護持同伴不倒。",
        passive: { hpPct: 0.03, "fx:回春": 0.015, magPct: 0.02 },
        skill: { name: "銀龍王・生命之光", chance: 0.17, target: "aoe", dmgType: "mag", mult: 2.0, heal: 0.12,
                 desc: "17%：全體術法 200% 傷害，主人回復 12% 氣血", msg: "🌙 生命之神古月娜銀龍現形，【生命之光】普照四方！" }
    },
    {
        id: "tangxuanyu", name: "唐軒宇", title: "創世之神", work: "斗羅大陸IV終極斗羅", author: "唐家三少", world: "斗羅大陸", peak: "創世之神",
        power: { atk: 96, def: 95, spd: 94, mag: 97, found: 96, grow: 98 },
        analysis: "唐舞麟與古月娜之子，同時繼承金、銀龍王兩脈的血統與天賦，成長性冠絕同代；最終成就創世之神，攻伐、術法與底蘊都站上斗羅世界的頂點。",
        passive: { statPct: 0.03, atkPct: 0.04 },
        skill: { name: "創世", chance: 0.18, target: "aoe", dmgType: "mag", mult: 2.4, heal: 0.08,
                 desc: "18%：全體術法 240% 傷害，主人回復 8% 氣血", msg: "🌈 創世之神唐軒宇抬手，【創世】之光開闢天地！" }
    },

    // ---- 天驕級（綜合 < 82）----
    {
        id: "aosika", name: "奧斯卡", title: "香腸大師", work: "斗羅大陸", author: "唐家三少", world: "斗羅大陸", peak: "（以史萊克七怪時期計）",
        power: { atk: 60, def: 72, spd: 70, mag: 78, found: 80, grow: 82 },
        analysis: "食物系輔助魂師，恢復大香腸能在戰鬥中迅速回血回魂力，是史萊克七怪的補給核心；本身幾乎沒有攻擊力，但有他在，隊伍就不容易倒下。",
        passive: { "fx:丹心": 0.20, hpPct: 0.02 },
        skill: { name: "恢復大香腸", chance: 0.15, target: "self", heal: 0.12, mpHeal: 0.08,
                 desc: "15%：主人回復 12% 氣血與 8% 靈力", msg: "🌭 奧斯卡念出咒語，一根【恢復大香腸】塞進你嘴裡！" }
    },
    {
        id: "mahongjun", name: "馬紅俊", title: "邪火鳳凰", work: "斗羅大陸", author: "唐家三少", world: "斗羅大陸", peak: "（以史萊克七怪時期計）",
        power: { atk: 84, def: 70, spd: 72, mag: 82, found: 72, grow: 80 },
        analysis: "武魂邪火鳳凰，火焰攻擊範圍大、殺傷力強，是史萊克七怪中的火力輸出；性格衝動，防禦與身法是明顯短板。",
        passive: { fire: 2, "fx:焚燼": 0.20 },
        skill: { name: "鳳凰火線", chance: 0.15, target: "aoe", dmgType: "mag", mult: 1.6, attrs: { fire: 100 },
                 desc: "15%：全體術法 160% 傷害並必定燒傷", msg: "🔥 馬紅俊邪火鳳凰附體，【鳳凰火線】橫掃戰場！" }
    },
    {
        id: "ningrongrong", gender: "f", name: "寧榮榮", title: "七寶琉璃", work: "斗羅大陸", author: "唐家三少", world: "斗羅大陸・七寶琉璃宗", peak: "（以史萊克七怪時期計）",
        power: { atk: 50, def: 70, spd: 72, mag: 86, found: 90, grow: 84 },
        analysis: "七寶琉璃宗的小公主，武魂七寶琉璃塔是頂級輔助武魂，能全面增幅隊友的力量、速度與魂力；自身戰鬥力薄弱，但出身宗門底蘊深厚。",
        passive: { statPct: 0.03 },
        skill: { name: "七寶琉璃塔", chance: 0.15, target: "self", mpHeal: 0.10, shield: { reduce: 0.25, duration: 2 },
                 desc: "15%：主人回復 10% 靈力，受到傷害 -25% 持續 2 回合", msg: "🗼 寧榮榮祭起【七寶琉璃塔】，寶光加持周身！" }
    },
    {
        id: "xiaoyixian", gender: "f", name: "小醫仙", title: "厄難毒體", work: "鬥破蒼穹", author: "天蠶土豆", world: "鬥氣大陸", peak: "厄難毒體",
        power: { atk: 70, def: 72, spd: 78, mag: 88, found: 80, grow: 84 },
        analysis: "身懷厄難毒體，萬毒不侵且能以毒殺人於無形；本性善良卻背負毒體之苦，毒功一旦全力施展，範圍殺傷極為可怕，近身防禦則較弱。",
        passive: { poison: 3, "fx:蝕骨": 0.20 },
        skill: { name: "厄難毒霧", chance: 0.15, target: "aoe", dmgType: "mag", mult: 1.6, attrs: { poison: 100 },
                 desc: "15%：全體術法 160% 傷害並必定中毒", msg: "☠️ 小醫仙厄難毒體發作，【厄難毒霧】瀰漫四野！" }
    },
    {
        id: "ziling", gender: "f", name: "紫靈", title: "妙音仙子", work: "凡人修仙傳", author: "忘語", world: "人界・亂星海妙音門", peak: "（以亂星海時期計）", native: true,
        power: { atk: 72, def: 74, spd: 86, mag: 82, found: 78, grow: 80 },
        analysis: "亂星海妙音門出身的絕色女修，心思縝密、善於周旋，身法與幻惑之術見長，擅長牽制與脫身；正面攻伐不算突出。",
        passive: { eva: 2, chaPct: 0.03 },
        skill: { name: "妙音鎖魂", chance: 0.15, target: "single", dmgType: "mag", mult: 1.4, freezeAll: true,
                 desc: "15%：單體術法 140% 傷害，所有敵人凍結 1 回合", msg: "🎶 紫靈輕撥琴弦，【妙音鎖魂】令群敵心神失守！" }
    },
    // ---- 天驕級・吞噬星空（2026-09-27 玩家指定新增 5 位，秘境「魔屠天南」第 51 波起有緣相遇；皆以地球時期計）----
    {
        id: "xuxin", gender: "f", name: "徐欣", title: "星空伴侶", work: "吞噬星空", author: "我吃西紅柿", world: "吞噬星空・地球", peak: "（以地球時期計）",
        power: { atk: 55, def: 66, spd: 70, mag: 74, found: 78, grow: 84 },
        analysis: "羅峰青梅竹馬的戀人，溫柔堅韌、總在後方支撐對方；本身戰力不高，擅長照料與療傷，讓身邊的人在苦戰中撐得更久。",
        passive: { hpPct: 0.02, "fx:丹心": 0.15 },
        skill: { name: "守望之心", chance: 0.15, target: "self", heal: 0.10, shield: { reduce: 0.2, duration: 2 },
                 desc: "15%：主人回復 10% 氣血，受到傷害 -20% 持續 2 回合", msg: "💗 徐欣默默守在身後，【守望之心】撫平你的傷勢！" }
    },
    {
        id: "qinshuang", gender: "f", name: "秦霜", title: "冰雪戰神", work: "吞噬星空", author: "我吃西紅柿", world: "吞噬星空・地球", peak: "（以地球時期計）",
        power: { atk: 80, def: 70, spd: 80, mag: 68, found: 72, grow: 76 },
        analysis: "冷艷果決的女武者，出手乾淨俐落、以快制敵，是早期少數能獨當一面的強者；招式偏重攻勢，久戰與防守略顯吃力。",
        passive: { atkPct: 0.02, ice: 1 },
        skill: { name: "霜月斬", chance: 0.15, target: "single", dmgType: "phys", mult: 1.8, attrs: { ice: 100 },
                 desc: "15%：單體物理 180% 傷害並必定凍結", msg: "❄️ 秦霜身形一閃，【霜月斬】寒光封住敵人！" }
    },
    {
        id: "babata", name: "巴巴塔", title: "智能導師", work: "吞噬星空", author: "我吃西紅柿", world: "吞噬星空・原始宇宙", peak: "（以地球時期計）",
        power: { atk: 40, def: 60, spd: 70, mag: 90, found: 92, grow: 88 },
        analysis: "寄居在戒指中的智能生命，見識廣博、話多嘴碎，能替主人分析敵情、規劃修行；幾乎沒有正面戰力，勝在知識與眼界。",
        passive: { "fx:悟道": 0.03, intPct: 0.02 },   // 修為 +3%、悟性 +2%
        skill: { name: "弱點分析", chance: 0.15, target: "single", dmgType: "mag", mult: 1.5, mpHeal: 0.06,
                 desc: "15%：單體術法 150% 傷害，主人回復 6% 靈力", msg: "💍 巴巴塔嘮叨著算出破綻：「打這裡！」【弱點分析】正中要害！" }
    },
    {
        id: "jinjiao", name: "金角巨獸", title: "吞噬分身", work: "吞噬星空", author: "我吃西紅柿", world: "吞噬星空・原始宇宙", peak: "（以行星級時期計）",
        power: { atk: 86, def: 88, spd: 66, mag: 70, found: 80, grow: 86 },
        analysis: "吞噬萬物成長的上古巨獸，軀體堅不可摧、力大無窮，衝鋒時如山崩；身法笨重、神通單一，是純粹的正面肉搏型。",
        passive: { def: 2, hpPct: 0.02 },
        skill: { name: "巨獸踐踏", chance: 0.15, target: "aoe", dmgType: "phys", mult: 1.6,
                 desc: "15%：全體物理 160% 傷害", msg: "🦏 金角巨獸仰天咆哮，【巨獸踐踏】震裂大地！" }
    },
    {
        id: "moyunteng", name: "摩雲藤", title: "吞噬之藤", work: "吞噬星空", author: "我吃西紅柿", world: "吞噬星空・原始宇宙", peak: "（以地球時期計）",
        power: { atk: 72, def: 80, spd: 60, mag: 82, found: 76, grow: 90 },
        analysis: "能吞噬生機、不斷蔓生的奇異藤蔓，生命力頑強、越打越難纏；行動遲緩，但一旦纏上敵人便很難掙脫。",
        passive: { hpPct: 0.02, poison: 1 },
        skill: { name: "吞噬生機", chance: 0.15, target: "single", dmgType: "mag", mult: 1.5, lifesteal: 0.3,
                 desc: "15%：單體術法 150% 傷害，30% 轉為主人氣血", msg: "🌿 摩雲藤纏上敵人，【吞噬生機】汲取其精元！" }
    }
];

// ---- 新增夥伴的模板（複製後修改；id 不可重複，上線後不可改 id）----
// {
//     id: "英文代號", name: "名字", title: "稱號", work: "作品名", author: "作者", world: "出身世界", peak: "巔峰境界",
//     native: true,   // 只有出身本界（凡人修仙傳）才加；其他作品的角色省略 = 域外神明
//     gender: "f",    // 女性才加（好感 LV5 名稱：與玩家異性「道侶」、同性「結拜」）；省略 = 男
//     lines: { meet: ["結識台詞"], greet: { 1: ["LV1 問候台詞"], 2: [...], ... } },   // 選填，沒有就用 PARTNER_GREET_LINES
//     power: { atk: 90, def: 90, spd: 90, mag: 90, found: 90, grow: 90 },   // 平均決定評級，對照 PARTNER_TIERS
//     analysis: "戰力分析：長處、短板、打法（自己的文字）",
//     passive: { atkPct: 0.03 },   // key 同稱號 bonus，見 config-titles.js 開頭
//     skill: { name: "招牌絕學", chance: 0.17, target: "single|aoe|self", dmgType: "phys|mag", mult: 2.6,
//              // 選填：attrs: { fire: 100 }、heal: 0.1、mpHeal: 0.1、lifesteal: 0.3、shield: { reduce: 0.3, duration: 2 }、freezeAll: true
//              desc: "17%：效果說明", msg: "戰鬥日誌文字" }
// },
