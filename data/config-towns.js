// 城內場景（第二頁面，ARCHITECTURE.md 第 20 節）；邏輯在 town.js
// 在修仙地圖點有場景的城鎮 → 傳送過去並開啟全螢幕城內畫面；畫面上的「傳送點」（hotspots）點擊後執行 action
// key = 城鎮地圖名稱（config-maps.js 城鎮區的 name）
//
// img        = 場景圖（images/towns/），imgW／imgH = 圖的原始像素，用來換算傳送點位置
// portrait   = 選填：手機直式專用圖 { img, imgW, imgH, hotspots }（建議 9:19.5，例 1080×2340）
//              畫面直向（寬 < 高）時改用它；兩張圖構圖不同，傳送點座標要各設一組
// hotspots   = 傳送點清單，座標一律用「圖上像素」（不受螢幕大小影響）：
//   { id: "英文代號", label: "牌匾文字", rect: [左, 上, 寬, 高], action: "要執行的函式()" }
//   rect 是可點擊的範圍；牌匾顯示在範圍正中央。action 是 onclick 字串（例："openCasinoModal()"）
//   enabled: false 可先放著不顯示
// figures    = 場景上的人偶（透明 PNG，擺在圖上當裝飾），同樣用圖上像素：
//   { id, name: "名稱", img: "images/towns/xxx.png", rect: [左, 上, 寬, 高] }
//   rect 的寬高比請和圖片一致（避免變形）；底邊 = 人偶腳下站的位置。選填 action 可讓人偶可點

const townScenes = {
    "天星城": {
        title: "天星城・坊市",
        img: "images/towns/tianxing-market.jpg",
        imgW: 1582, imgH: 672,
        hotspots: [
            // 右側雕花石拱門（含上方佛像雕飾）
            { id: "casino", label: "天星賭坊", rect: [1150, 140, 270, 430], action: "openCasinoModal()" },
            // 左側木棚攤位（攤主坐在攤後）：坊市回收・收購商（economy.js，2026-09-29）
            { id: "market-sell", label: "收購商", rect: [90, 330, 300, 300], action: "openMarketSellModal()" },
            // ---- 新增傳送點的模板（複製一行、改內容）----
            // { id: "xxx", label: "牌匾文字", rect: [左, 上, 寬, 高], action: "openXxx()" },
        ],
        figures: [
            // 亂星海第一大善人・風希（坐在木台上的人偶，252×400，寬高比 0.63）：紅色小攤車左邊；點他 = 第一次結識、之後每日問候（partner.js）
            { id: "fengxi", name: "亂星海第一大善人・風希", img: "images/towns/npc-fengxi.png", rect: [862, 446, 95, 150], action: "talkToPartner('dashanren')" }
        ],
        // 手機直式（704×1520，9:19.4，玩家提供）
        portrait: {
            img: "images/towns/tianxing-market-portrait.jpg",
            imgW: 704, imgH: 1520,
            hotspots: [
                // 右側雕花石拱門（含上方佛像雕飾）
                { id: "casino", label: "天星賭坊", rect: [470, 600, 234, 700], action: "openCasinoModal()" },
                // 左下木棚攤位：坊市回收・收購商
                { id: "market-sell", label: "收購商", rect: [0, 1060, 220, 360], action: "openMarketSellModal()" },
            ],
            figures: [
                { id: "fengxi", name: "亂星海第一大善人・風希", img: "images/towns/npc-fengxi.png", rect: [226, 1110, 126, 200], action: "talkToPartner('dashanren')" }
            ]
        }
    }
};
