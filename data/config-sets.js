// 套裝（ARCHITECTURE.md 第 37 節）：30 組，全在秘境清單；同一套的裝備名字前綴相同（例：神霄扇、神霄筆…）
// 哪些裝備屬於哪一套寫在 config-gear-catalog.js 每列的第 6 欄；這裡定義每套的主題與五行
// 只算「紫色以上」的件數（與特效同一個門檻），邏輯在 gear.js 的 getSetBonusTotals

const GEAR_SET_MIN_QUALITY = ["紫色", "橙色", "白金"];

const gearSets = {
    "太乙": { theme: "物攻", element: "金" }, "蒼龍": { theme: "物攻", element: "木" }, "真武": { theme: "物攻", element: "水" },
    "祝融": { theme: "物攻", element: "火" }, "盤古": { theme: "物攻", element: "土" },
    "神霄": { theme: "法攻", element: "金" }, "太昊": { theme: "法攻", element: "木" }, "玄女": { theme: "法攻", element: "水" },
    "羲和": { theme: "法攻", element: "火" }, "黃庭": { theme: "法攻", element: "土" },
    "白帝": { theme: "防禦", element: "金" }, "句芒": { theme: "防禦", element: "木" }, "玄天": { theme: "防禦", element: "水" },
    "炎帝": { theme: "防禦", element: "火" }, "軒轅": { theme: "防禦", element: "土" },
    "天樞": { theme: "閃避", element: "金" }, "瑤光": { theme: "閃避", element: "木" }, "洛神": { theme: "閃避", element: "水" },
    "畢方": { theme: "閃避", element: "火" }, "須彌": { theme: "閃避", element: "土" },
    "戮仙": { theme: "屬性", element: "金" }, "神農": { theme: "屬性", element: "木" }, "太陰": { theme: "屬性", element: "水" },
    "三昧": { theme: "屬性", element: "火" }, "九州": { theme: "屬性", element: "土" },
    "大衍": { theme: "收益", element: "金" }, "蓬萊": { theme: "收益", element: "木" }, "歸墟": { theme: "收益", element: "水" },
    "丹霄": { theme: "收益", element: "火" }, "萬壽": { theme: "收益", element: "土" }
};

// 各主題的 2／4／6 件加成。bonus 的 key 同 gear.js 的 getBonusTotals（{elem} 換成該套五行對應的屬性傷害）
//   special：rage = 普攻 15% 機率全體 ×1.5；echo = 技能 15% 機率連發；undying = 每波一次致命傷保留 1 點氣血；
//            dodgeStrike = 閃避後下一擊 +30%
const gearSetThemes = {
    "物攻": [
        { pieces: 2, desc: "力量 +5%", bonus: { strPct: 0.05 } },
        { pieces: 4, desc: "物理攻擊 +8%", bonus: { physPct: 0.08 } },
        { pieces: 6, desc: "普攻 15% 機率觸發「{set}之怒」，對全體造成物理攻擊 ×1.5", bonus: { "special:rage": 1 } }
    ],
    "法攻": [
        { pieces: 2, desc: "悟性 +5%", bonus: { intPct: 0.05 } },
        { pieces: 4, desc: "術法攻擊 +8%", bonus: { magPct: 0.08 } },
        { pieces: 6, desc: "施展技能時 15% 機率再連發一次", bonus: { "special:echo": 1 } }
    ],
    "防禦": [
        { pieces: 2, desc: "體質 +5%", bonus: { conPct: 0.05 } },
        { pieces: 4, desc: "防禦 +5", bonus: { def: 5 } },
        { pieces: 6, desc: "受到致命傷時保留 1 點氣血（每波一次）", bonus: { "special:undying": 1 } }
    ],
    "閃避": [
        { pieces: 2, desc: "閃避 +3", bonus: { eva: 3 } },
        { pieces: 4, desc: "閃避成功後，下一擊傷害 +30%", bonus: { "special:dodgeStrike": 1 } },
        { pieces: 6, desc: "閃避 +5", bonus: { eva: 5 } }   // 原「閃避上限 +5%」：2026-10-03 閃避取消上限（第 66 節第 4 期）後改直接加迴避值
    ],
    "屬性": [
        { pieces: 2, desc: "{elemLabel} +5%", bonus: { "{elem}": 5 } },
        { pieces: 4, desc: "{elemLabel}觸發時，該擊傷害 +20%", bonus: { "elemBoost:{elem}": 0.2 } },
        { pieces: 6, desc: "{elemLabel}上限 +10%", bonus: { "cap:{elem}": 10 } }
    ],
    "收益": [
        { pieces: 2, desc: "野外靈石 +5%", bonus: { "fx:聚財": 0.05 } },
        { pieces: 4, desc: "修為獲得 +5%", bonus: { "fx:悟道": 0.05 } },
        { pieces: 6, desc: "星允鐵獲得 +15%", bonus: { "fx:尋鐵": 0.15 } }
    ]
};
