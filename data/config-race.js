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

// C 剋制法寶（第 4 期，2026-09-30；race.js 的 raceTreasure*）：角色裝備視窗的「法寶欄」2 格，穿上才生效（使用者選 2 格）
//   player.raceTreasures = [{ id, race, grade }]（持有，上限 RACE_TREASURE_MAX）、player.raceTreasureSlots = [id|null, id|null]
//   來源（使用者選）：鎮魔塔樓主層（10、20…100 層）首次擊敗必得該 BOSS 種族的法寶、野外擊殺有種族的敵人稀有掉落、千寶閣常駐每日限購
//   兩格同族可疊加，但法寶對同一族合計上限 RACE_TREASURE_CAP（我訂的：斬妖錄 6%＋符寶 20%＋法寶 15%，留約 9% 給第 5 期裝備特效）
//   合煉：3 件同族同品（未穿戴）→ 1 件高一品；出售：換 H 的 sellMinutes 分鐘靈石（economy.js 的 incomeMinutes）
const RACE_TREASURES = {
    beast: { name: "降妖葫蘆", icon: "🏺" },
    ghost: { name: "鎮魂鈴",   icon: "🔔" },
    demon: { name: "誅魔鏡",   icon: "🔮" },   // 🪞🪷 在 Windows 10 顯示成方框，改用舊版 emoji
    heart: { name: "清心蓮台", icon: "🌸" }
};
const RACE_TREASURE_GRADES = [
    { name: "下品", bonus: 0.05, color: "#60a5fa", sellMinutes: 5 },
    { name: "中品", bonus: 0.10, color: "#c084fc", sellMinutes: 15 },
    { name: "上品", bonus: 0.15, color: "#fb923c", sellMinutes: 45 }
];
const RACE_TREASURE_SLOTS = 2;
const RACE_TREASURE_CAP = 0.15;   // 法寶對同一族合計上限
const RACE_TREASURE_MAX = 40;     // 持有上限；滿了掉落的法寶自動出售
const RACE_TREASURE_MERGE = 3;    // 合煉：幾件同族同品 → 1 件高一品
// 野外掉落：每擊殺 1 隻有種族的敵人 chance 機率掉該族法寶，其中 midChance 是中品（其餘下品）；離線依地圖種族比例用期望值計算
//   線上約每小時 1000 隻 → 約 4～5 小時一件
const RACE_TREASURE_FIELD = { chance: 1 / 5000, midChance: 0.05 };
// 鎮魔塔樓主層（個位數 0）＝種族關卡：首次擊敗必得該層 BOSS 種族的法寶，品階依樓層（樓層 ≤ to 取該品）
const RACE_TREASURE_ZHENMO = [{ to: 30, grade: 0 }, { to: 70, grade: 1 }, { to: 100, grade: 2 }];
// 千寶閣常駐：下品，四族任選，每日限購 dailyLimit 件，價格＝H 的 priceHours 小時
const RACE_TREASURE_SHOP = { grade: 0, dailyLimit: 1, priceHours: 6 };

// D 裝備種族特效（第 5 期，2026-09-30 定案）：eq.raceFx = { race, v }（v＝小數，0.02＝+2%），穿戴中才生效
//   三種取得方式（使用者看過測試版後決定全部保留）：
//   ① 新掉落：紫／橙裝產生時（gear.js 的 createGearEquip）dropChance 機率帶一條
//   ② 重鑄：強化視窗「🔮 種族銘刻」，紫色以上花星允鐵＋靈石重抽種族與數值（沒有就刻上一條）
//   ③ 白金進化：進化時必定帶一條（已有則升到白金數值）
//   同族多件相加，上限 cap（50% − 斬妖錄 6% − 符寶 20% − 法寶 15% ＝ 9%）
const RACE_GEAR = {
    dropChance: { "紫色": 0.1, "橙色": 0.2 },
    value: { "紫色": [0.01, 0.02], "橙色": [0.02, 0.03], "白金": [0.03, 0.04] },
    cap: 0.09,
    reforge: { iron: 50, coinsHours: 1 }   // 每次花費：星允鐵＋H 的 coinsHours 小時靈石
};

// 鎮魔塔自動產生的 BOSS（第 7～100 層，config-zhenmo.js）依名稱後綴決定種族；第 1～6 層手動 BOSS 在 ZHENMO_BOSSES 各自寫 race
const ZHENMO_RACE_BY_SUFFIX = {
    "魔君": "demon", "屍王": "ghost", "妖皇": "beast", "鬼帝": "ghost", "魔龍": "beast",
    "邪神": "demon", "劍魔": "demon", "血尊": "demon", "戰神": "heart", "魔尊": "demon"
};
