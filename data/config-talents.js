// 天賦樹（2026-10-03 使用者定案，ARCHITECTURE.md 第 68 節）：6 條戰鬥風格路線，每條 4 排、約 28 點；邏輯在 talent.js
//   點數：人物等級（Lv.1～100 每 10 級 1 點、100～1000 每 50 級、1000～10000 每 250 級，滿級 64 點）＋ 轉世（TALENT_REINCARNATE_POINTS，遞減、最多 +15）＝ 最多 79 點
//   整棵樹 6 × 28 ＝ 168 點 → 最多點滿約 2.8 條，一定要取捨；核心天賦（每條第 4 排）同時最多啟用 TALENT_KEYSTONE_MAX 個
//   每個節點 per＝每 1 點的加成，key 同 gear.js 的 getBonusTotals：
//     def／eva／mdef（點數）、ice／fire／poison／metal／thunder（觸發率 %）、fx:特效名（不受特效上限）、special:套裝特殊效果（有 1 點就生效）
//   天賦新增的 key（talent.js 與各處讀取）：crit／magCrit（暴擊率，0.01 = 1%）、critDmg（暴擊傷害倍率加成）、hit（命中值）、
//     mult:phys／mult:mag／mult:hp／mult:def／mult:eva（獨立倍率，不進增益池；−1 ＝ 歸零）、buffCap（增益上限 +百分點）、decomposeRefine（分解洗煉石 +%）
//   ⚠️ 天賦不給「攻擊 +%」這類進增益池的加成：頂尖玩家的增益早就頂到上限，點了等於白點
const TALENT_LEVEL_STEPS = [   // [到這個等級為止, 每幾級 1 點]
    [100, 10], [1000, 50], [10000, 250]
];
const TALENT_REINCARNATE_POINTS = [3, 3, 3, 1, 1, 1, 1, 1, 1];   // 第 1～9 次轉世各給幾點，之後不再給（合計 15）
const TALENT_KEYSTONE_MAX = 2;
const TALENT_ROW_REQ = [0, 5, 12, 20];     // 第 1～4 排：這條路線要先投入幾點才能點
const TALENT_RESPEC_FREE = 1;              // 前幾次重置免費
const TALENT_RESPEC_COINS_HOURS = 2;       // 之後每次 靈石 H × 2 小時 × 已重置次數（最多 ×5）

const TALENT_BRANCHES = [
    { id: "gong", name: "攻伐", icon: "⚔️", color: "#f87171", desc: "物理輸出：暴擊、破甲、斬殺", nodes: [
        { id: "gong1", row: 0, name: "鋒芒", max: 5, per: { crit: 0.01 }, desc: "暴擊率 +1%" },
        { id: "gong2", row: 0, name: "破甲", max: 5, per: { "fx:破甲": 2 }, desc: "無視目標 2 減傷" },
        { id: "gong3", row: 1, name: "斬殺", max: 5, per: { "fx:斬殺": 0.06 }, desc: "對氣血低於 20% 的敵人傷害 +6%" },
        { id: "gong4", row: 1, name: "金鋒", max: 5, per: { metal: 2 }, desc: "金傷 +2%" },
        { id: "gong5", row: 2, name: "劍意", max: 3, per: { critDmg: 0.1 }, desc: "暴擊傷害 +10%（×2 → ×2.1）", notable: true },
        { id: "gong6", row: 2, name: "戰意", max: 3, per: { "fx:首擊": 0.2, "fx:燃魂": 0.05 }, desc: "每波第一擊 +20%、氣血高於 80% 時傷害 +5%", notable: true },
        { id: "gong7", row: 3, name: "血祭", max: 1, per: { "mult:phys": 0.35, "mult:hp": -0.25 }, desc: "物攻 ×1.35，氣血 ×0.75", keystone: true },
        { id: "gong8", row: 3, name: "破釜沉舟", max: 1, per: { crit: 0.10, "mult:def": -0.5 }, desc: "暴擊率 +10%，防禦減半", keystone: true }
    ]},
    { id: "fa", name: "術法", icon: "🔮", color: "#a78bfa", desc: "術法輸出：魔法暴擊、屬性傷害、技能", nodes: [
        { id: "fa1", row: 0, name: "靈慧", max: 5, per: { magCrit: 0.01 }, desc: "魔法暴擊率 +1%" },
        { id: "fa2", row: 0, name: "法爆", max: 5, per: { "fx:法爆": 0.03 }, desc: "技能傷害 +3%" },
        { id: "fa3", row: 1, name: "雷法", max: 5, per: { thunder: 2 }, desc: "雷傷 +2%" },
        { id: "fa4", row: 1, name: "冰心", max: 5, per: { ice: 2 }, desc: "冰傷 +2%" },
        { id: "fa5", row: 2, name: "聚靈", max: 3, per: { "fx:聚靈": 0.06, "fx:回靈": 0.005 }, desc: "技能耗魔 −6%、每回合回靈 +0.5%", notable: true },
        { id: "fa6", row: 2, name: "五雷正法", max: 3, per: { "fx:連雷": 0.3 }, desc: "雷擊時再劈另一名敵人 ×0.3", notable: true },
        { id: "fa7", row: 3, name: "天人合一", max: 1, per: { "mult:mag": 0.35, "mult:phys": -0.3 }, desc: "術攻 ×1.35，物攻 ×0.7", keystone: true },
        { id: "fa8", row: 3, name: "萬法歸宗", max: 1, per: { buffCap: 20 }, desc: "增益上限 +20%（頂尖玩家突破上限用）", keystone: true }
    ]},
    { id: "jin", name: "金身", icon: "🛡️", color: "#fbbf24", desc: "生存：防禦、魔防、回血、減傷", nodes: [
        { id: "jin1", row: 0, name: "銅皮", max: 5, per: { def: 3 }, desc: "防禦 +3" },
        { id: "jin2", row: 0, name: "護魂", max: 5, per: { mdef: 3 }, desc: "魔防 +3" },
        { id: "jin3", row: 1, name: "回春", max: 5, per: { "fx:回春": 0.003 }, desc: "每回合回血 +0.3%" },
        { id: "jin4", row: 1, name: "金身", max: 5, per: { "fx:金身": 0.02 }, desc: "受到物理傷害 −2%" },
        { id: "jin5", row: 2, name: "不動明王", max: 3, per: { "fx:先手盾": 5 }, desc: "每波前 2 回合防禦 +5", notable: true },
        { id: "jin6", row: 2, name: "化勁", max: 3, per: { "fx:化勁": 0.03 }, desc: "受到術法傷害 −3%", notable: true },
        { id: "jin7", row: 3, name: "金剛", max: 1, per: { "mult:def": 0.5, "mult:eva": -1 }, desc: "防禦 ×1.5，閃避歸零", keystone: true },
        { id: "jin8", row: 3, name: "不滅", max: 1, per: { "special:undying": 1, "mult:hp": 0.1 }, desc: "受到致命傷時保留 1 點氣血（每波一次）、氣血 ×1.1", keystone: true }
    ]},
    { id: "shen", name: "身法", icon: "💨", color: "#38bdf8", desc: "閃避、命中、追擊、再動", nodes: [
        { id: "shen1", row: 0, name: "輕身", max: 5, per: { eva: 2 }, desc: "閃避 +2" },
        { id: "shen2", row: 0, name: "鷹眼", max: 5, per: { hit: 2 }, desc: "命中 +2" },
        { id: "shen3", row: 1, name: "追風", max: 5, per: { "fx:追擊": 0.02 }, desc: "2% 機率追加一次攻擊" },
        { id: "shen4", row: 1, name: "疾風", max: 5, per: { "fx:疾風": 0.01 }, desc: "1% 機率本回合再出手" },
        { id: "shen5", row: 2, name: "殘影", max: 3, per: { "fx:閃擊": 0.3 }, desc: "閃避後反擊一次 ×0.3", notable: true },
        { id: "shen6", row: 2, name: "洞察", max: 3, per: { "fx:洞察": 3 }, desc: "無視敵人 3 閃避", notable: true },
        { id: "shen7", row: 3, name: "無相", max: 1, per: { "mult:eva": 0.5, "mult:def": -1 }, desc: "閃避 ×1.5，防禦歸零", keystone: true },
        { id: "shen8", row: 3, name: "流光", max: 1, per: { "special:dodgeStrike": 1, "fx:追擊": 0.08 }, desc: "閃避後下一擊 +30%、追擊 +8%", keystone: true }
    ]},
    { id: "ling", name: "御靈", icon: "🐉", color: "#4ade80", desc: "靈寵、吸血、反震", nodes: [
        { id: "ling1", row: 0, name: "獸魂", max: 5, per: { "fx:獸魂": 0.05 }, desc: "靈寵傷害 +5%" },
        { id: "ling2", row: 0, name: "護主", max: 5, per: { "fx:反震": 0.02 }, desc: "受到攻擊時反彈 2% 傷害" },
        { id: "ling3", row: 1, name: "噬魂", max: 5, per: { "fx:噬魂": 0.01 }, desc: "擊殺回血 +1%" },
        { id: "ling4", row: 1, name: "血契", max: 5, per: { "fx:吸血": 0.01 }, desc: "造成傷害的 1% 轉為氣血" },
        { id: "ling5", row: 2, name: "萬靈共鳴", max: 3, per: { "fx:獸魂": 0.15 }, desc: "靈寵傷害 +15%", notable: true },
        { id: "ling6", row: 2, name: "橫掃千軍", max: 3, per: { "fx:橫掃": 0.05 }, desc: "普攻 5% 機率波及其他敵人", notable: true },
        { id: "ling7", row: 3, name: "獸神附體", max: 1, per: { "fx:獸魂": 0.8, "mult:phys": -0.15, "mult:mag": -0.15 }, desc: "靈寵傷害 +80%，自身攻擊 ×0.85", keystone: true },
        { id: "ling8", row: 3, name: "群魔亂舞", max: 1, per: { "special:rage": 1, "fx:橫掃": 0.1 }, desc: "普攻 15% 機率對全體 ×1.5、橫掃 +10%", keystone: true }
    ]},
    { id: "zao", name: "造化", icon: "☯️", color: "#e879f9", desc: "放置經濟：修為、靈石、掉落、材料", nodes: [
        { id: "zao1", row: 0, name: "悟道", max: 5, per: { "fx:悟道": 0.02 }, desc: "修為 +2%" },
        { id: "zao2", row: 0, name: "聚財", max: 5, per: { "fx:聚財": 0.03 }, desc: "野外靈石 +3%" },
        { id: "zao3", row: 1, name: "尋鐵", max: 5, per: { "fx:尋鐵": 0.05 }, desc: "星允鐵 +5%" },
        { id: "zao4", row: 1, name: "積德", max: 5, per: { "fx:積德": 0.04 }, desc: "功德 +4%" },
        { id: "zao5", row: 2, name: "奪寶", max: 3, per: { "fx:奪寶": 0.1 }, desc: "裝備掉落率 +10%", notable: true },
        { id: "zao6", row: 2, name: "丹心", max: 3, per: { "fx:丹心": 0.1, "fx:延壽": 0.05 }, desc: "丹藥回復 +10%、戰死折壽 −5%", notable: true },
        { id: "zao7", row: 3, name: "天道酬勤", max: 1, per: { "fx:悟道": 0.15, "fx:聚財": 0.15, "mult:phys": -0.1, "mult:mag": -0.1 }, desc: "修為、靈石 +15%，攻擊 ×0.9", keystone: true },
        { id: "zao8", row: 3, name: "點石成金", max: 1, per: { decomposeRefine: 0.5 }, desc: "分解得到的洗煉石 +50%", keystone: true }
    ]}
];
