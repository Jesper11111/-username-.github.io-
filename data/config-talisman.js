// 符寶設定（邏輯見 talisman.js）
// 橙色武器／防具／飾品帶 1~3 個鑲嵌孔（神器不開孔），可鑲嵌符寶；符寶在宗門「符寶坊」以礦石＋靈石煉製。
// 鑲嵌後可以打掉換新，但舊符寶會碎裂消失；裝備毀棄時上面的符寶一併消失。

const SOCKET_QUALITY = "橙色";   // 只有這個品質的裝備會開孔
const SOCKET_MIN = 1;            // 每件隨機孔數 SOCKET_MIN ~ SOCKET_MAX
const SOCKET_MAX = 3;

// 符寶種類：四維為固定點數，戰鬥屬性為 %（與裝備加總後一樣受 config-elements.js 的上限限制）
const talismanTypes = [
    { key: "str",     name: "力量符", icon: "💪", kind: "flat" },
    { key: "con",     name: "體質符", icon: "🛡️", kind: "flat" },
    { key: "int",     name: "悟性符", icon: "📖", kind: "flat" },
    { key: "spr",     name: "靈力符", icon: "✨", kind: "flat" },
    { key: "def",     name: "護體符", icon: "🧱", kind: "pct" },
    { key: "eva",     name: "身法符", icon: "💨", kind: "pct" },
    { key: "ice",     name: "玄冰符", icon: "❄️", kind: "pct" },
    { key: "fire",    name: "烈焰符", icon: "🔥", kind: "pct" },
    { key: "poison",  name: "蝕毒符", icon: "☠️", kind: "pct" },
    { key: "metal",   name: "庚金符", icon: "⚔️", kind: "pct" },
    { key: "thunder", name: "天雷符", icon: "⚡", kind: "pct" },
    // 剋制符（種族剋制第 3 期，2026-09-30，config-race.js）：對該族傷害 +%（品階 race 欄位），另外煉製（不混進上面 11 種的隨機池）
    //   key 不可含底線（持有 key 是「種類_品階」）
    { key: "rbeast", name: "斬妖符", icon: "🐉", kind: "race", race: "beast" },
    { key: "rghost", name: "鎮魂符", icon: "👻", kind: "race", race: "ghost" },
    { key: "rdemon", name: "誅邪符", icon: "😈", kind: "race", race: "demon" },
    { key: "rheart", name: "清心符", icon: "🌀", kind: "race", race: "heart" }
];
// 剋制符合計對同一族最多 +20%（再與其他來源一起套 RACE_DMG_CAP 50%），避免全身孔位堆滿剋制符就吃滿上限、法寶與特效沒意義
const RACE_TALISMAN_CAP = 0.20;

// 煉製：一律隨機（種類 11 選 1 平均、品階依 chance），無法指定；每煉 1 枚的成本固定
const TALISMAN_CRAFT_COST = { ore: 500, coins: 1000000 };   // 500 礦石＋100 萬靈石（2026-09-24 由 5 萬調高）

// 品階：效果與出現機率（chance 合計 1）
//   flat = 四維符的點數；pct = 戰鬥屬性符的 %；race = 剋制符對該族傷害的 %
const talismanGrades = [
    { grade: 1, name: "下品", flat: 100,  pct: 1, race: 3,  chance: 0.70 },
    { grade: 2, name: "中品", flat: 400,  pct: 2, race: 6,  chance: 0.25 },
    { grade: 3, name: "上品", flat: 1500, pct: 3, race: 10, chance: 0.05 }
];
