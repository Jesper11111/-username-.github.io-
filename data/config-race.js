// 種族剋制（2026-09-30 使用者規劃，ARCHITECTURE.md 第 62 節；參考《天堂》的種族特攻）
// 四族：妖獸／鬼物／魔修／心魔。正道修士、正派懸賞人物屬「人修」，沒有種族（不吃剋制）。
// 剋制＝玩家對該族的傷害加成，來源（分期施工）：A 天磯錄斬妖錄（第 1 期）、B 剋制符寶、C 剋制法寶、D 裝備特效；
// 對同一族合計最多 RACE_DMG_CAP（使用者選 +50%）。只加傷害，不算進戰力（戰力榜、雲端規則不動）。

const RACES = {
    beast: { name: "妖獸", icon: "🐉", desc: "天地間的飛禽走獸修煉成精，體魄強橫。" },
    ghost: { name: "鬼物", icon: "👻", desc: "幽冥陰魂、殭屍屍王，來去如煙、百毒不侵。" },
    demon: { name: "魔修", icon: "😈", desc: "修煉魔功的邪道之人，嗜血好殺。" },
    heart: { name: "心魔", icon: "🌀", desc: "修士心中的執念與妄想，化形為與你一模一樣的魔身。" }
};
const RACE_KEYS = ["beast", "ghost", "demon", "heart"];
const RACE_DMG_CAP = 0.5;   // 對同一族的剋制加成合計上限 +50%

// A 斬妖錄（天磯錄分頁，race.js 的 renderCodexRaces）：累計斬殺數達門檻，對該族傷害永久加成（取最高一階，不累加）。
//   遇到的頻率不同，門檻分開訂：妖獸／鬼物＝野外每小時數百隻；魔修＝邪修、暗殺者、邪派懸賞、守城首領、鎮魔塔魔頭；心魔＝渡劫與少數鎮魔塔 BOSS
const RACE_SLAY_TIERS = {
    beast: [{ kills: 100, bonus: 0.02 }, { kills: 1000, bonus: 0.04 }, { kills: 10000, bonus: 0.06 }],
    ghost: [{ kills: 100, bonus: 0.02 }, { kills: 1000, bonus: 0.04 }, { kills: 10000, bonus: 0.06 }],
    demon: [{ kills: 2000, bonus: 0.02 }, { kills: 20000, bonus: 0.04 }, { kills: 30000, bonus: 0.06 }],   // 2026-09-30 使用者指定（原 20／200／2000）
    heart: [{ kills: 50, bonus: 0.02 }, { kills: 100, bonus: 0.04 }, { kills: 200, bonus: 0.06 }]            // 2026-09-30 使用者指定（原 1／5／15）
};

// 敵人的種族特性（第 2 期，2026-09-30；race.js 的 applyRaceTraits／raceHpMult／raceLifestealHeal）：
//   hpMult 氣血倍率、eva 閃避 +點數、poisonImmune 不會中毒、lifesteal 攻擊時吸取造成傷害的比例
//   野外的收益補償會把特性算進去（numeric.js 的 nv2TypRoundsPerKill），每小時收益不變
//   原規劃 妖獸氣血 +20%、鬼物閃避 +10，模擬鎮魔塔妖獸／鬼物層沒剋制勝率腰斬（30%→14%）、要剋制 20% 才回原水準；
//   改為 +10%／+5 後：沒剋制略降（約 -5～-20%）、剋制 10% 回到原本勝率（ARCHITECTURE.md 第 62 節）
const RACE_TRAITS = {
    beast: { hpMult: 1.1, desc: "氣血 +10%" },
    ghost: { eva: 5, poisonImmune: true, desc: "閃避 +5、不會中毒" },
    demon: { lifesteal: 0.1, desc: "攻擊時吸取造成傷害的 10% 化為氣血" },
    heart: { desc: "與你一模一樣的鏡像，沒有額外特性" }
};

// 鎮魔塔自動產生的 BOSS（第 7～100 層，config-zhenmo.js）依名稱後綴決定種族；第 1～6 層手動 BOSS 在 ZHENMO_BOSSES 各自寫 race
const ZHENMO_RACE_BY_SUFFIX = {
    "魔君": "demon", "屍王": "ghost", "妖皇": "beast", "鬼帝": "ghost", "魔龍": "beast",
    "邪神": "demon", "劍魔": "demon", "血尊": "demon", "戰神": "heart", "魔尊": "demon"
};
