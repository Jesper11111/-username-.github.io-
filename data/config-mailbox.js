// 仙府信箱與兌換碼（ARCHITECTURE.md 第 56 節；遊戲邏輯 mailbox.js、GM 發放在 gm.html「📮 發放獎勵」）
// 遊戲與 gm.html 共用本檔（只有常數）。雲端集合的權限在 tools/firestore.rules：
//   mail/{自動 id}              GM 寫；玩家只能讀 to = 'all' 或 to = 自己 uid 的信
//   mailClaims/{uid}_{mailId}   玩家領取時建立（每封每帳號一次，不能改、不能刪）
//   codes/{兌換碼}               GM 寫；玩家知道代碼才能讀（不能列出全部）
//   codeClaims/{uid}_{兌換碼}    玩家兌換時建立（每組代碼每帳號一次）
const MAIL_COLLECTION = "mail";
const MAIL_CLAIMS_COLLECTION = "mailClaims";
const CODE_COLLECTION = "codes";
const CODE_CLAIMS_COLLECTION = "codeClaims";
// 信件隔日自動刪除（2026-10-04 使用者要求；舊信件每次讀信都會被讀到，耗 Firebase 讀取額度）：
//   信件寄出後 MAIL_LIFETIME_HOURS 小時過期（gm.html 寄信一律寫 expiresAt＝寄出＋24 小時；舊的永久信以 createdAt＋24 小時計）
//   過期的信：玩家的遊戲讀到就順手刪除（tools/firestore.rules 允許刪除「寄給自己或全服、已過期」的信），GM 後台開「發放獎勵」時也會刪
const MAIL_LIFETIME_HOURS = 24;
const MAIL_REFRESH_MS = 2 * 60 * 60 * 1000;   // 2026-10-04 由 30 分鐘改 2 小時（Firebase 讀取額度用完）；打開信箱時照樣會讀
// 獎勵格式版本：GM 寄出時寫進信件／兌換碼的 v；遊戲只領 v ≤ 本值的，比較新的會提示「請重新整理遊戲」而不建立領取紀錄
//   （2026-09-28 事故：玩家用還沒支援「先天資質」的舊版遊戲領了資質信，領取紀錄建立了卻沒有效果，那封信也不能再領）
//   1 = 數量／圖紙／僕從；2 = 加上先天資質。新增獎勵種類時 +1
const MAIL_SCHEMA_VERSION = 4;   // 3＝可寄 GM 權限（rewards.gm，2026-10-04）；4＝先天・太古裝備（rewards.gear，2026-10-09）

// 獎勵：rewards = { coins: 1000000, butianStones: 5, …, blueprints: { "劍_1500": 1 }, servants: { "傳說": 1 } }
// 數量型：field = 加到 player 的欄位（星允鐵直接加數量，不套「尋鐵」加成）
const MAIL_REWARD_FIELDS = [
    { key: "coins",         label: "靈石",       icon: "💎", field: "coins" },
    { key: "butianStones",  label: "七彩補天石", icon: "🌈", field: "butianStones" },
    { key: "starIron",      label: "星允鐵",     icon: "🌠", field: "starIron" },
    { key: "merit",         label: "功德",       icon: "☯️", field: "merit" },
    { key: "reputation",    label: "聲望",       icon: "📣", field: "reputation" },
    { key: "rootPills",     label: "洗髓丹",     icon: "🧪", field: "rootPills" },
    { key: "physiquePills", label: "伐骨丹",     icon: "🦴", field: "physiquePills" },
    { key: "spiritFruits",  label: "化神靈果",   icon: "🍑", field: "spiritFruits" },
    { key: "breakPills",    label: "破障丹",     icon: "🔮", field: "breakPills" }
];
// 僕從品質（同 config-servants.js 的 servantQualities；gm.html 沒有載入該檔，所以在這裡列名稱）
const MAIL_SERVANT_QUALITIES = ["一般", "優秀", "稀有", "史詩", "傳說"];
// 圖紙的部位與等級（同 config-equipment.js 的可鍛造部位與 BLUEPRINT_LEVELS；gm.html 沒有載入該檔，改那邊時這裡要一起改）
const MAIL_BLUEPRINT_SLOTS = ["劍", "刀", "扇", "弓", "笛", "筆", "頭", "內衣", "盔甲", "手套", "長靴", "披風", "腰帶", "項鍊", "戒指", "耳環", "腰牌"];
const MAIL_BLUEPRINT_LEVELS = [1500, 2500, 3500, 5000, 6500, 8000, 10000];
// 先天（白金）・太古裝備，部位隨機（2026-10-09 世界 Boss 名次獎勵）：rewards.gear = { "5000": 件數, ... }，key＝裝備等級
//   遊戲端 gear.js 的 createPrimalPlatinumGear：同等級圖紙鍛造的橙裝 → 太古（詞條全天級取上限、多 1 條、四維 ×1.2）→ 進化白金（+0、多 1 條、種族特效、傳奇威能）
const MAIL_PRIMAL_GEAR_LEVELS = [1500, 2500, 3500, 5000];
// GM 後台「世界 Boss 名次獎勵」的預設分段（名次依累計傷害，相同並列；to 為 0＝其餘全部參加者）
const WB_GIFT_TIERS = [
    { from: 1, to: 1, level: 5000, n: 1 },
    { from: 2, to: 3, level: 3500, n: 1 },
    { from: 4, to: 10, level: 2500, n: 1 },
    { from: 11, to: 0, level: 1500, n: 1 }
];
// GM 後台的一鍵預設（2026-09-28 使用者指定：100 萬靈石＋傳說僕從一名）
const MAIL_PRESETS = [
    { label: "🎁 100 萬靈石＋傳說僕從一名", title: "仙府賀禮", body: "感謝道友一路相伴，特贈薄禮，願仙途順遂！", rewards: { coins: 1000000, servants: { "傳說": 1 } } }
];
// 單一數量的安全上限（防 GM 手誤多打幾個 0；玩家端超過就以上限計）
const MAIL_REWARD_MAX = 1e12;
