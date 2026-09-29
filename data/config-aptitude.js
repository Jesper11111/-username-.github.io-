// 資質測試：先天靈根＋先天體質（ARCHITECTURE.md 第 53 節，邏輯在 aptitude.js）
// 第一次拜入宗門後跳出資質測試，擲骰各決定一個；已在宗門的老玩家進遊戲時補測。結果一世固定，轉世也保留，
// 只能用千寶閣的【洗髓丹】（重測靈根）／【伐骨丹】（重測體質）重擲，重擲後可選擇保留新或舊結果。
//
// bonus 的 key 同 gear.js 的 getBonusTotals（新舊制都會吃到）：
//   atkPct／physPct／magPct／hpPct／statPct／strPct…agiPct（agi 只有新制有）、def／eva／ice／fire／poison／metal／thunder（%）、
//   "fx:悟道"（修為速度，gainExp 乘 1 + 值，可為負）、"fx:回春"（每回合回血）、"fx:法爆"（技能傷害）、"fx:吸血"、"fx:破甲"、"fx:洞察"、"fx:定神"、"fx:丹心"、"fx:剋敵"、"fx:噬魂"
// special（不走 getBonusTotals，aptitude.js 的 getAptitudeSpecial 彙總）：
//   trib：渡劫勝算（小數，+0.05 = +5%）；ambushMult：暗殺者出現機率倍率；poisonImmune：免疫中毒；
//   weapon＋weaponPct＋skillPct：裝備該武器時武器加成（舊制四維、新制武器攻擊）與技能傷害；elemAtk：本命五行相同時攻擊 %
//   nature：光／暗本質（光暗互剋，config-elements.js）；靈根與體質一光一暗時互相抵銷
// 變異屬性 wind／light／dark（%）也寫在 bonus，由 elements.js 的 getPlayerCombatAttrs 讀取

const APTITUDE_REROLL_COST = 1;    // 洗髓丹／伐骨丹各需幾顆七彩補天石（千寶閣珍貴物資）；2026-09-29 使用者指定由 10 改 1

// 五行親和：每個屬性依靈根等級給的加成（單屬性 × 1、雙 × 0.4、三 × 0.2）
const ROOT_ELEMENT_AFFINITY = {
    "金": { metal: 15 },
    "木": { "fx:回春": 0.01 },
    "水": { ice: 15 },
    "火": { fire: 15 },
    "土": { def: 5 }
};

// ---- 先天靈根：group 決定擲骰分組（chance 為組機率，組內平均；elems = 要隨機抽幾個五行）----
const APTITUDE_ROOT_GROUPS = [
    { id: "fake5", name: "五靈根", grade: "偽靈根", color: "#9ca3af", chance: 0.17, elems: 5, affinity: 0,
      desc: "五行俱全卻雜亂不純，吸納靈氣又慢又雜，修煉艱難。", bonus: { "fx:悟道": -0.25 }, special: { trib: -0.05 } },
    { id: "fake4", name: "四靈根", grade: "偽靈根", color: "#9ca3af", chance: 0.18, elems: 4, affinity: 0,
      desc: "四種屬性相互牽制，靈氣吸收緩慢，突破倍加艱難。", bonus: { "fx:悟道": -0.15 }, special: { trib: -0.05 } },
    { id: "true3", name: "三靈根", grade: "真靈根", color: "#e5e7eb", chance: 0.30, elems: 3, affinity: 0.2,
      desc: "資質中庸，修煉穩定，是修仙界最常見的資質。", bonus: {} },
    { id: "true2", name: "雙靈根", grade: "真靈根", color: "#4ade80", chance: 0.17, elems: 2, affinity: 0.4,
      desc: "兩種屬性相輔相成，資質良好，是各宗門的中堅弟子。", bonus: { "fx:悟道": 0.2 } },
    { id: "heaven", name: "天靈根", grade: "天靈根", color: "#60a5fa", chance: 0.08, elems: 1, affinity: 1,
      desc: "只有一種五行屬性，純粹無比。修煉速度極快、瓶頸極少，宗門爭相搶奪。", bonus: { "fx:悟道": 0.5 } },
    { id: "variant", grade: "變異靈根", color: "#c084fc", chance: 0.06, pick: [
        { id: "wind",    name: "風靈根", icon: "🌪️", desc: "木屬性變異而來，身法如風。",       bonus: { "fx:悟道": 0.4, wind: 15, agiPct: 0.1 } },
        { id: "thunder", name: "雷靈根", icon: "⚡", desc: "金水交融變異，蘊藏破邪天威。",     bonus: { "fx:悟道": 0.4, thunder: 20, atkPct: 0.05 } },
        { id: "ice",     name: "冰靈根", icon: "❄️", desc: "水屬性變異，能凍結萬物。",         bonus: { "fx:悟道": 0.4, ice: 20, "fx:定神": 0.3 } },
        { id: "dark",    name: "暗靈根", icon: "🌑", desc: "陰氣凝結而成，吞噬生機、無視護體。", bonus: { "fx:悟道": 0.4, dark: 15 }, special: { nature: "dark" } }
    ] },
    { id: "special", grade: "特殊靈根", color: "#fb923c", chance: 0.03, pick: [
        { id: "none",   name: "無屬性靈根", icon: "⚪", desc: "不屬五行之中，萬法皆可修。",         bonus: { "fx:悟道": 0.6, statPct: 0.08 } },
        { id: "sun",    name: "日靈根",     icon: "☀️", desc: "承載大日之力，至陽至剛。",           bonus: { "fx:悟道": 0.6, physPct: 0.12, light: 12 }, special: { nature: "light" } },
        { id: "moon",   name: "月靈根",     icon: "🌙", desc: "承載太陰之力，清冷幽玄。",           bonus: { "fx:悟道": 0.6, magPct: 0.12, ice: 15 } },
        { id: "immortal", name: "仙靈根",   icon: "🌟", desc: "傳說中的仙人資質，天生親近仙道。",   bonus: { "fx:悟道": 0.8, statPct: 0.08, hpPct: 0.1, light: 8 }, special: { nature: "light" } }
    ] },
    { id: "supreme", grade: "至尊靈根", color: "#f472b6", rainbow: true, chance: 0.01, pick: [
        { id: "chaos",    name: "混沌靈根",     icon: "🌀", desc: "混沌未分之時的本源資質。",     bonus: { "fx:悟道": 1.0, statPct: 0.12, atkPct: 0.1, hpPct: 0.1 } },
        { id: "taichu",   name: "太初靈根",     icon: "✨", desc: "天地初開第一縷靈機。",         bonus: { "fx:悟道": 1.0, statPct: 0.1, atkPct: 0.12, hpPct: 0.08 } },
        { id: "hongmeng", name: "鴻蒙靈根",     icon: "☁️", desc: "鴻蒙紫氣所化，萬法之源。",     bonus: { "fx:悟道": 1.2, statPct: 0.1, magPct: 0.12 } },
        { id: "genesis",  name: "創世靈根",     icon: "🌌", desc: "開天闢地、演化萬物之資。",     bonus: { "fx:悟道": 1.0, statPct: 0.1, physPct: 0.12, hpPct: 0.08 } },
        { id: "wutai",    name: "先天五太靈根", icon: "☯️", desc: "太易、太初、太始、太素、太極五太合一。", bonus: { "fx:悟道": 1.0, statPct: 0.15, hpPct: 0.1 } },
        { id: "wuxing5",  name: "先天五行靈根", icon: "🔷", desc: "五行圓滿無缺，生生不息。",     bonus: { "fx:悟道": 1.0, statPct: 0.1, metal: 10, ice: 10, fire: 10, def: 5, "fx:回春": 0.01 } },
        { id: "kongling", name: "空靈根",       icon: "💠", desc: "空而能容，靈氣入體不散。",     bonus: { "fx:悟道": 1.3, statPct: 0.1, eva: 5 } },
        { id: "kongming", name: "空明靈根",     icon: "🔹", desc: "心如明鏡，一眼看破萬法。",     bonus: { "fx:悟道": 1.0, statPct: 0.1, "fx:洞察": 10, atkPct: 0.1 } },
        { id: "kongshi",  name: "空識靈根",     icon: "🔸", desc: "神識通透，悟性通天。",         bonus: { "fx:悟道": 1.1, statPct: 0.1, intPct: 0.15, magPct: 0.08 } }
    ] }
];

// ---- 先天體質：chance 為組機率，組內平均 ----
const APTITUDE_PHYSIQUE_GROUPS = [
    { grade: "凡體", color: "#9ca3af", chance: 0.71, pick: [   // 2026-09-29 神體 2% → 1%，多出的 1% 併入凡體（原 70%）
        { id: "mortal", name: "凡體", icon: "🧍", desc: "尋常肉身，勤能補拙。", bonus: {} }
    ] },
    { grade: "靈體", color: "#4ade80", chance: 0.22, pick: [
        { id: "metalBody", name: "庚金本源體", icon: "⚔️", desc: "對金屬性靈氣感應至極。", bonus: { metal: 12 }, special: { elem: "金", elemAtk: 0.08 } },
        { id: "woodBody",  name: "乙木本源體", icon: "🌿", desc: "生機綿延不絕。",         bonus: { "fx:回春": 0.008, hpPct: 0.05 }, special: { elem: "木", elemAtk: 0.08 } },
        { id: "waterBody", name: "癸水本源體", icon: "💧", desc: "至柔至韌，可化冰霜。",   bonus: { ice: 12 }, special: { elem: "水", elemAtk: 0.08 } },
        { id: "fireBody",  name: "九陽赤炎體", icon: "🔥", desc: "修煉火系功法威力倍增。", bonus: { fire: 12 }, special: { elem: "火", elemAtk: 0.08 } },
        { id: "earthBody", name: "戊土本源體", icon: "⛰️", desc: "厚重如山，穩固難撼。",   bonus: { def: 5 }, special: { elem: "土", elemAtk: 0.08 } },
        { id: "thunderBody", name: "天雷之體", icon: "⚡", desc: "天生親近雷電，渡劫時能將雷劫化為養分。", bonus: { thunder: 12 }, special: { trib: 0.05 } },
        { id: "iceBody",   name: "玄冰之體",   icon: "❄️", desc: "天生寒冰之氣，能凍結敵人心脈。", bonus: { ice: 12, "fx:定神": 0.3 } },
        { id: "yinBody",   name: "純陰之體",   icon: "🌑", desc: "體蘊極致陰氣，術法威力大增，卻易遭邪修覬覦。", bonus: { magPct: 0.1, dark: 8 }, special: { ambushMult: 1.5, nature: "dark" } },
        { id: "yangBody",  name: "純陽之體",   icon: "☀️", desc: "體蘊極致陽氣，物理攻勢剛猛，卻易遭邪修覬覦。", bonus: { physPct: 0.1, light: 8 }, special: { ambushMult: 1.5, nature: "light" } },
        { id: "herbBody",  name: "天生藥體",   icon: "🌱", desc: "血肉天生具有藥性，丹藥效果大增。", bonus: { "fx:丹心": 0.5, "fx:回春": 0.004 } },
        { id: "poisonBody", name: "萬毒不侵體", icon: "☠️", desc: "免疫世間萬毒，更能以毒傷敵。", bonus: { poison: 10 }, special: { poisonImmune: true } }
    ] },
    { grade: "道體", color: "#60a5fa", chance: 0.06, pick: [
        // 武器體質：裝備該武器時武器加成＋技能傷害（2026-09-27 劍體為使用者指定，其餘五種補齊六職業）
        { id: "swordBody", name: "先天劍體", icon: "🗡️", desc: "通明劍心、先天劍胎，天生與飛劍共鳴。", bonus: {}, special: { weapon: "劍", weaponPct: 0.15, skillPct: 0.1 } },
        { id: "bladeBody", name: "霸刀戰體", icon: "🔪", desc: "刀意天成，一刀之威可斷山河。",       bonus: {}, special: { weapon: "刀", weaponPct: 0.15, skillPct: 0.1 } },
        { id: "fanBody",   name: "風靈仙體", icon: "🪭", desc: "天生御風，羽扇輕搖即成罡風。",       bonus: {}, special: { weapon: "扇", weaponPct: 0.15, skillPct: 0.1 } },
        { id: "bowBody",   name: "神射之體", icon: "🏹", desc: "目力通天，百步穿楊不過等閒。",       bonus: {}, special: { weapon: "弓", weaponPct: 0.15, skillPct: 0.1 } },
        { id: "fluteBody", name: "天籟道體", icon: "🎶", desc: "聞音知道，一曲可動天地。",           bonus: {}, special: { weapon: "笛", weaponPct: 0.15, skillPct: 0.1 } },
        { id: "brushBody", name: "符靈道體", icon: "🖌️", desc: "天生通曉符文，筆落即成符籙。",       bonus: {}, special: { weapon: "筆", weaponPct: 0.15, skillPct: 0.1 } }
    ] },
    { grade: "神體", color: "#f472b6", rainbow: true, chance: 0.01, pick: [   // 2026-09-29 使用者指定 1%（原 2%）
        { id: "chaosBody",  name: "混沌體",       icon: "🌀", desc: "萬古第一體質，融合萬物本源，修煉幾乎沒有瓶頸。", bonus: { statPct: 0.1, atkPct: 0.1, hpPct: 0.1, "fx:悟道": 0.3 } },
        { id: "holyBody",   name: "荒古聖體",     icon: "💪", desc: "肉身舉世無雙，氣血如海，克制一切妖魔邪祟。",     bonus: { hpPct: 0.25, conPct: 0.1, def: 5, light: 8 }, special: { nature: "light" } },
        { id: "daoBody",    name: "先天聖體道胎", icon: "🌟", desc: "聖體與道胎合一，天生親近大道。",                 bonus: { hpPct: 0.2, magPct: 0.05, "fx:悟道": 0.3 }, special: { nature: "light" } },
        { id: "tyrantBody", name: "蒼天霸體",     icon: "🔱", desc: "戰意不熄、肉身不死，主宰殺伐。",                 bonus: { atkPct: 0.15, hpPct: 0.1, "fx:噬魂": 0.02 } },
        { id: "doublePupil", name: "重瞳",        icon: "👁️", desc: "天生異象，看破虛妄、演化神通。",                 bonus: { "fx:洞察": 12, "fx:破甲": 10, atkPct: 0.05 } },
        { id: "supremeBone", name: "至尊骨",      icon: "🦴", desc: "天生自帶銘刻無上寶術的骨頭。",                   bonus: { atkPct: 0.08, "fx:法爆": 0.15, statPct: 0.05 } }
    ] }
];

// 珍貴道具（背包、千寶閣共用，與 config-merit.js 的 preciousItems 同格式）
const aptitudeItems = {
    rootPill:     { name: "洗髓丹", icon: "🧪", desc: "洗滌經脈，重新測試【先天靈根】；測完可選擇保留新或舊的結果。" },
    physiquePill: { name: "伐骨丹", icon: "🦴", desc: "脫胎換骨，重新測試【先天體質】；測完可選擇保留新或舊的結果。" }
};
