// 洞府主畫面・PC 版（16:9）設定：背景圖 images/home-bg-pc.jpg（1376×768），第 34 節
// 圖上已畫好頭像框、名字框、資源框、狀態框與各按鈕；這裡記錄「圖上座標」與點擊後的功能。
// 要調整按鈕功能／開關：改 pcStageButtons 的 action，或把 enabled 設成 false（該區域就不能點）。
// 座標一律是圖片像素 [x, y, 寬, 高]，由 home-ui.js 的 renderPcStage() 換算成百分比。
// ⚠️ 換背景圖時要改 PC_STAGE_IMG_W/H 並重新量所有 rect（以及 index.html 內 #pc-stage 的 HUD 百分比座標）。

const PC_STAGE_IMG_W = 1376;
const PC_STAGE_IMG_H = 768;

// 分頁面板（修仙／戰鬥／宗門／世界）在圖上的位置：避開左上 HUD、右上狀態框與底部按鈕
const PC_SHEET_RECT = [300, 40, 845, 625];

// kind：
//   'hotspot' 建築熱點：只在洞府（沒開分頁面板）時可點，可加程式畫的牌匾 plaque（left / right / top）
//   'button'  圖上畫好的按鈕：一直可點；nav 填分頁名稱時會跟著分頁顯示選中光暈
const pcStageButtons = [
    // ---- 建築（牌匾由程式加上）----
    { id: 'ascend',   kind: 'hotspot', label: '升仙台',   rect: [600, 150, 125, 165], plaque: 'left',  action: "openAscensionPlatform()" },
    { id: 'sect',     kind: 'hotspot', label: '宗門',     rect: [520, 435, 140, 125], plaque: 'left',  action: "returnToSect()" },   // 不在宗門會先傳送回宗門（map.js）
    { id: 'servant',  kind: 'hotspot', label: '僕從小屋', rect: [790, 475, 110, 70],  plaque: 'top',   action: "openServantModal()" },
    { id: 'alchemy',  kind: 'hotspot', label: '煉丹房',   rect: [140, 365, 125, 100], plaque: 'right', action: "openAlchemyModal()" },
    // 傳送門：2026-09-25 已從圖上抹掉牌匾字樣，熱點一併停用（修仙地圖改由「世界」開啟）
    { id: 'portal',   kind: 'hotspot', label: '傳送門',   rect: [268, 525, 40, 115], enabled: false,   action: "openWorldMapModal()" },
    { id: 'auction',  kind: 'hotspot', label: '千寶閣',   rect: [712, 610, 110, 95],  plaque: 'right', action: "openActivity('auction')" },
    { id: 'codex',    kind: 'hotspot', label: '天磯錄',   rect: [760, 160, 120, 130], plaque: 'right', action: "openCodexModal()" },   // 寶塔右側尖峰（codex.js）
    { id: 'stele',    kind: 'hotspot', label: '大道石碑', rect: [724, 185, 34, 125],  plaque: 'stele', action: "openLeaderboardModal()" },   // 升仙台與天磯錄之間；圖上沒畫，石碑由 .plaque-stele 畫出（天下戰力榜，leaderboard.js）

    // ---- 左側按鈕 ----
    { id: 'task',      kind: 'button', label: '任務',     rect: [18, 460, 64, 85],   action: "switchTab('task')", nav: 'task' },   // 圖上原字「信件」已改畫成「任務」（2026-09-27）；同手機版左側「任務」
    { id: 'bag',       kind: 'button', label: '背包',     rect: [18, 580, 64, 82],   action: "openBagModal()" },
    { id: 'settings',  kind: 'button', label: '設置',     rect: [18, 668, 64, 84],   action: "openSettingsModal()" },

    // ---- 右下按鈕（底部導覽）----
    { id: 'boost',     kind: 'button', label: '情緣',     rect: [1278, 575, 80, 77],  action: "openPartnerModal()" },   // 圖上原字「修煉加速」已改畫成「情緣」；夥伴系統（partner.js）
    { id: 'mail',      kind: 'button', label: '留言板',   rect: [900, 680, 58, 72],   action: "openLeaderboardModal('board')", cover: '留言板' },   // 圖上原字「信件」，2026-09-28 改為修仙留言板（cover 蓋字，home-ui.js）
    { id: 'nav-cultivate', kind: 'button', label: '修仙', rect: [985, 680, 57, 72],   action: "switchTab('cultivate')", nav: 'cultivate' },
    { id: 'nav-battle',    kind: 'button', label: '戰鬥', rect: [1080, 680, 58, 72],  action: "switchTab('battle')",    nav: 'battle' },
    { id: 'nav-home',      kind: 'button', label: '洞府', rect: [1162, 640, 92, 112], action: "switchTab('home')",      nav: 'home' },
    { id: 'nav-world',     kind: 'button', label: '世界', rect: [1282, 668, 68, 84],  action: "openWorldTab()",         nav: 'world' }   // 圖上原字「福袋」已改畫成「世界」（同手機版：開世界分頁並跳出修仙地圖）
];
