// 活動選單設定
// minRep         = 觸發所需聲望
// minRealmIndex  = 所需境界（對應 realms 陣列索引；0 = 無境界限制）
// implemented    = false 代表功能尚未實作，點擊後顯示「敬請期待」
// openFn         = 已實作活動要呼叫的開啟函式名稱
const activityData = [
    { id: "daily", name: "每日任務", icon: "📅", minRep: 1000, minRealmIndex: 0,
      implemented: true, openFn: "openDailyQuestModal",
      desc: "每 4 小時刷新，共 10 項任務" },

    { id: "auction", name: "千寶閣", icon: "🏺", minRep: 5000, minRealmIndex: 0,
      implemented: true, openFn: "openAuctionModal",
      desc: "拍賣場・每 3 小時刷新 5 件商品" },

    // 秘境列表與場景（secret-realm.js）；各秘境玩法是否開放看 config-secret-realms.js 的 implemented
    { id: "secret", name: "秘境", icon: "🌀", minRep: 5000, minRealmIndex: 6,
      implemented: true, openFn: "openSecretRealmModal",
      desc: "鎮魔塔・煉虛以上開放" },

    // 懸賞榜（天／地／人榜）＋野外修士＋善惡值，見 merit.js／bounty.js；改成 implemented: false 即可整體暫停
    { id: "evil", name: "獵殺邪修", icon: "🗡️", minRep: 8000, minRealmIndex: 3,
      implemented: true, openFn: "openEvilHallScene",   // 先進殺手殿堂場景，點匾額才開懸賞榜（merit.js）
      desc: "懸賞榜・每 4 小時刷新 6 名" },

    // 世界 Boss（world-boss.js，第 75 節；2026-10-04 由秘境移到這裡）：使用者要求「暫不開放」→ implemented: false 只顯示敬請期待；開放時改成 true 即可
    { id: "demon", name: "域外天魔", icon: "👹", minRep: 10000, minRealmIndex: 8,
      implemented: false, openFn: "openWorldBossModal",
      desc: "世界BOSS・每週六 20:00～週日 20:00・大乘以上開放" }
];
