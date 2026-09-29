// 懸賞榜（天榜／地榜／人榜）設定，邏輯見 bounty.js（ARCHITECTURE.md 第 36 節）
// 正派玩家看到 6 名邪修、邪派玩家看到 6 名正道修士；接取後在野外歷練時才有機率遇上，進入一對一對決

const BOUNTY_REFRESH_HOURS = 4;          // 每 4 小時刷新一次榜單（比照千寶閣，以時間戳判斷）
const BOUNTY_PAID_REFRESH_COST = 100000; // 花靈石立即刷新榜單（不改變定時刷新的時間）
const BOUNTY_PAID_REFRESH_DAILY = 5;     // 每日可付費刷新次數（與千寶閣分開計）
const BOUNTY_ENCOUNTER_CHANCE = 0.08;    // 接取後，野外每刷新一波時遇上目標的機率（約 1～3 分鐘）
const BOUNTY_MERIT_MIN = 1;              // 斬殺懸賞人物的功德：1 ~ 3000，不論強弱
const BOUNTY_MERIT_MAX = 3000;
// 懸賞人物境界 = 玩家目前位置（大境界 × 10 + 小境界）再偏移 MIN～MAX 個大境界（以 0.1 境 = 1 階為單位隨機）
// 例：玩家金丹 5 階、-0.8～+1 → 築基 7 階 ～ 元嬰 5 階
const BOUNTY_REALM_OFFSET_MIN = -0.8;
const BOUNTY_REALM_OFFSET_MAX = 1;
const BOUNTY_MAX_TURNS = 300;            // 對決超過此回合數，對方遁走（懸賞保留，可再遇上）；2026-09-29 強度改 1～5 倍、對決變長，由 150 改 300

// 新制強度倍率（2026-09-29 使用者要求「懸賞邪修比玩家強 1～5 倍」，只在 NUMERIC_V2 生效，bounty.js 的 getBountyStats）：
//   刷榜時每名依榜別在範圍內隨機一個倍率（存在 entry.str），基準＝同境界一般玩家的鏡像（攻擊 × bountyAtkMult 0.4、氣血 × bountyHpMult 3，config-numeric.js）；
//   氣血 × 倍率、攻擊 × √倍率：新制玩家氣血只有攻擊約 3.6 倍，倍率全乘在攻擊會一擊斃命，喝藥與靈寵治療、控制都來不及發揮
//   舊的榜別比例（BOUNTY_RANKS 的 ratio）在新制不再使用
const BOUNTY_STR_RANGE = { tian: [3.5, 5], di: [2, 3.5], ren: [1, 2] };

// 參考戰力：以「同境界同階數、修為圓滿的修士」為基準（與 stats.js 的 getBasePower 同一條曲線），
// 再乘上該境界可加入宗門的一般戰力倍率。天榜 = 參考值 × BOUNTY_TIAN_MULT，地榜 8 成、人榜 6 成。
// 心魔是「與你相同」的鏡像，勝負靠擲骰；天榜攻擊與氣血和你相當，但多了減傷閃避、吸血／回春與削弱武學，且勝負完全靠實戰。
// 模擬（2026-09-25，化神 5 階、戰力 ×2.5 宗門、對手同境界同階數，各 200 場）：
//   無裝備      ：天 0%、地 4～7%、人 100%
//   減傷30 閃避15：天 0～1%、地 56%、人 100%
//   減傷60 閃避40：天 25～36%、地 100%、人 100%（再加靈根、光環、技能才會更穩）
// 大境界每差 1 境戰力差約 10 倍（同境內 1 階 → 10 階約 10 倍）：+1 境的天榜幾乎打不贏、-0.8 境約只有 1/7 實力，
// 所以榜單會顯示「你的幾倍」供玩家挑選。
const BOUNTY_REF_SECT_MULT = [
    { minRealm: 0,  mult: 1.2 },   // 凡俗宗門
    { minRealm: 3,  mult: 2.5 },   // 修真仙門（金丹起）
    { minRealm: 10, mult: 5.0 }    // 至高聖地（仙人初境起）
];
const BOUNTY_TIAN_MULT = 1.0;

// 各榜設定：ratio = 相對天榜的實力；count = 每期上榜人數（合計 6）；karma = 斬殺時善惡值變化量
// def／eva／affix = 減傷／閃避％、異屬性（冰／毒／雷，隨機一種）觸發率％；skillChance = 每回合施展武學的機率
const BOUNTY_RANKS = {
    tian: { name: "天榜", icon: "🌟", color: "#f87171", ratio: 1.0, count: 1, karma: 100, def: 22, eva: 13, affix: 35, skillChance: 0.5 },
    di:   { name: "地榜", icon: "⭐", color: "#c084fc", ratio: 0.8, count: 2, karma: 60,  def: 16, eva: 9,  affix: 25, skillChance: 0.42 },
    ren:  { name: "人榜", icon: "✦",  color: "#60a5fa", ratio: 0.6, count: 3, karma: 30,  def: 11, eva: 5,  affix: 15, skillChance: 0.35 }
};
const BOUNTY_RANK_ORDER = ["tian", "di", "ren"];

// ---- 懸賞人物的武學（bounty.js 的 bountyDuelTick 依 type 結算）----
//   damage   ：攻擊 × mult
//   lifesteal：攻擊 × mult，並以實際傷害的 steal 比例回血
//   drain    ：退魔，攻擊 × mult，並吸走玩家最大靈力的 drain 比例（對方回同量靈力對應的氣血 = 0，只削你）
//   weaken   ：化功，你的物理／術法攻擊 × weaken，持續 duration 回合
//   silence  ：封印，你 duration 回合內無法施展武學（只能普攻）
//   armor    ：破甲，你的減傷與閃避減半，持續 duration 回合
//   poison   ：攻擊 × mult，並疊 stacks 層中毒
//   freeze   ：攻擊 × mult，並凍結你 1 回合
//   heal     ：回復自身最大氣血的 heal 比例
// 邪修必定帶「吸血」與「退魔」兩招，再從負面武學中隨機 2 招；正道修士必定帶「回春」與「誅邪」，再隨機 2 招
const bountySkills = {
    // 邪修
    bloodDevour: { type: "lifesteal", mult: 1.8, steal: 1.0, name: "血魔噬心", msg: "施展【血魔噬心】，吸取你的精血壯大己身！" },
    soulDrain:   { type: "drain", mult: 1.2, drain: 0.25, name: "奪魄退魔", msg: "施展【奪魄退魔】，將你的靈力吸得一乾二淨！" },
    dissolve:    { type: "weaken", weaken: 0.7, duration: 3, name: "化功大法", msg: "施展【化功大法】，你的真元如泥牛入海，攻勢大減！" },
    soulSeal:    { type: "silence", duration: 2, name: "攝魂魔音", msg: "奏起【攝魂魔音】，你心神大亂，無法運轉武學！" },
    boneRot:     { type: "poison", mult: 1.0, stacks: 2, name: "蝕骨毒功", msg: "拍出【蝕骨毒功】，劇毒滲入骨髓！" },
    netherPalm:  { type: "freeze", mult: 1.2, name: "玄冥寒掌", msg: "一記【玄冥寒掌】，寒氣封住你的經脈！" },
    armorRend:   { type: "armor", duration: 3, name: "破甲魔爪", msg: "【破甲魔爪】撕裂你的護體罡氣！" },
    // 正道修士
    springHeal:  { type: "heal", heal: 0.10, name: "回春訣", msg: "運轉【回春訣】，傷勢迅速癒合！" },
    slayEvil:    { type: "damage", mult: 2.0, name: "誅邪劍氣", msg: "斬出【誅邪劍氣】，浩然正氣直逼而來！" },
    demonSeal:   { type: "silence", duration: 2, name: "鎮魔印", msg: "祭出【鎮魔印】，封住你的魔功！" },
    bindSpell:   { type: "freeze", mult: 1.2, name: "定身咒", msg: "念動【定身咒】，你動彈不得！" },
    purify:      { type: "weaken", weaken: 0.7, duration: 3, name: "天罡破邪", msg: "【天罡破邪】正氣壓頂，你的魔功威力大減！" },
    thunderJudge:{ type: "armor", duration: 3, name: "神霄雷罰", msg: "引下【神霄雷罰】，劈散你的護體魔氣！" }
};
const BOUNTY_SKILL_SETS = {
    "邪": { fixed: ["bloodDevour", "soulDrain"], pool: ["dissolve", "soulSeal", "boneRot", "netherPalm", "armorRend"] },
    "正": { fixed: ["springHeal", "slayEvil"], pool: ["demonSeal", "bindSpell", "purify", "thunderJudge"] }
};

// ---- 懸賞名冊：邪修 30 名、正道修士 30 名（男女各半）----
// id 會寫進存檔（榜單），上線後不要改
const bountyRoster = {
    "邪": [
        { id: "e01", name: "厲千秋",   title: "血手人屠", gender: "male" },
        { id: "e02", name: "蕭無咎",   title: "萬毒老祖", gender: "male" },
        { id: "e03", name: "屠九幽",   title: "陰屍道人", gender: "male" },
        { id: "e04", name: "韓厲",     title: "噬魂魔君", gender: "male" },
        { id: "e05", name: "司空寒",   title: "鬼面書生", gender: "male" },
        { id: "e06", name: "冷無涯",   title: "黑煞尊者", gender: "male" },
        { id: "e07", name: "閻烈",     title: "化骨真君", gender: "male" },
        { id: "e08", name: "公孫邪",   title: "奪舍老怪", gender: "male" },
        { id: "e09", name: "燕赤霄",   title: "天煞魔刀", gender: "male" },
        { id: "e10", name: "墨千殤",   title: "玄冥老魔", gender: "male" },
        { id: "e11", name: "賈腐",     title: "屍陀道人", gender: "male" },
        { id: "e12", name: "魏長夜",   title: "血河老祖", gender: "male" },
        { id: "e13", name: "秦無赦",   title: "裂魂魔尊", gender: "male" },
        { id: "e14", name: "宇文冥",   title: "幽冥鬼王", gender: "male" },
        { id: "e15", name: "霍幽",     title: "煉魂老鬼", gender: "male" },
        { id: "e16", name: "蘇媚娘",   title: "血羅剎",   gender: "female" },
        { id: "e17", name: "柳青蘿",   title: "蛇蠍仙子", gender: "female" },
        { id: "e18", name: "花弄影",   title: "玉面妖姬", gender: "female" },
        { id: "e19", name: "杜三娘",   title: "陰陽妖婆", gender: "female" },
        { id: "e20", name: "艷無雙",   title: "合歡宗主", gender: "female" },
        { id: "e21", name: "紫夜",     title: "蝕心魔女", gender: "female" },
        { id: "e22", name: "骨瑤",     title: "白骨夫人", gender: "female" },
        { id: "e23", name: "慕容妖",   title: "千面魔姬", gender: "female" },
        { id: "e24", name: "夜鶯",     title: "攝魂妖女", gender: "female" },
        { id: "e25", name: "唐翠",     title: "毒娘子",   gender: "female" },
        { id: "e26", name: "幽蘭",     title: "冥河聖女", gender: "female" },
        { id: "e27", name: "赤蓮",     title: "血蓮魔后", gender: "female" },
        { id: "e28", name: "冷月嬋",   title: "噬情仙子", gender: "female" },
        { id: "e29", name: "胡媚兒",   title: "九尾妖姬", gender: "female" },
        { id: "e30", name: "墨蛛娘",   title: "黑寡婦",   gender: "female" }
    ],
    "正": [
        { id: "r01", name: "李長風",   title: "青雲劍仙", gender: "male" },
        { id: "r02", name: "張清虛",   title: "玄天真人", gender: "male" },
        { id: "r03", name: "顧正陽",   title: "浩然書生", gender: "male" },
        { id: "r04", name: "釋空明",   title: "降魔尊者", gender: "male" },
        { id: "r05", name: "岳鎮岳",   title: "天罡劍主", gender: "male" },
        { id: "r06", name: "周玄一",   title: "太乙真人", gender: "male" },
        { id: "r07", name: "陸斬妖",   title: "誅邪使者", gender: "male" },
        { id: "r08", name: "韓紫霄",   title: "紫霄道長", gender: "male" },
        { id: "r09", name: "了塵",     title: "金剛羅漢", gender: "male" },
        { id: "r10", name: "蕭凌雲",   title: "蜀山劍聖", gender: "male" },
        { id: "r11", name: "沈丹心",   title: "丹心劍客", gender: "male" },
        { id: "r12", name: "雷震霄",   title: "神霄雷君", gender: "male" },
        { id: "r13", name: "白無塵",   title: "崑崙長老", gender: "male" },
        { id: "r14", name: "宋清微",   title: "清微真人", gender: "male" },
        { id: "r15", name: "包正",     title: "除魔判官", gender: "male" },
        { id: "r16", name: "靜玄",     title: "峨嵋師太", gender: "female" },
        { id: "r17", name: "林清霜",   title: "玉女劍仙", gender: "female" },
        { id: "r18", name: "雲瑤",     title: "瑤池仙子", gender: "female" },
        { id: "r19", name: "葉素心",   title: "素心醫仙", gender: "female" },
        { id: "r20", name: "冷凝冰",   title: "冰心仙子", gender: "female" },
        { id: "r21", name: "花想容",   title: "散花天女", gender: "female" },
        { id: "r22", name: "蘇月華",   title: "月華聖女", gender: "female" },
        { id: "r23", name: "謝驚鴻",   title: "驚鴻劍姬", gender: "female" },
        { id: "r24", name: "碧落",     title: "碧落仙子", gender: "female" },
        { id: "r25", name: "紫薇",     title: "紫薇真君", gender: "female" },
        { id: "r26", name: "秦青鸞",   title: "青鸞仙子", gender: "female" },
        { id: "r27", name: "雪凝",     title: "雪山神尼", gender: "female" },
        { id: "r28", name: "霓裳",     title: "霓裳仙子", gender: "female" },
        { id: "r29", name: "丹霞",     title: "丹霞元君", gender: "female" },
        { id: "r30", name: "洛凝",     title: "洛水神女", gender: "female" }
    ]
};
const BOUNTY_ICONS = { "邪": { male: "🧛‍♂️", female: "🧛‍♀️" }, "正": { male: "🧙‍♂️", female: "🧙‍♀️" } };
