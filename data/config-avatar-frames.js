// 頭像光環（ARCHITECTURE.md 第 32 節）：疊在頭像上的圓形外框，洞府頭像（手機／PC）與戰場實況頭像都會顯示；邏輯在 avatar.js
// img    = images/frames/ 內的透明 PNG（正方形，由玩家提供的頭像框展示圖裁切、去背而成）
// ring   = 框內「放頭像的洞」的中心與半徑，單位為圖寬的比例（0～1）；頭像會縮放對齊這個圓
//          由裁切工具自動量測（左右對稱，cx 固定 0.5），個別不準的已手動修正（f22）
// unlock = 解鎖條件，格式同頭像（config-avatars.js）：null 一開始就能用；realm／level／reputation／tribulation 達成自動解鎖；coins 花靈石購買
// id 會寫進存檔（player.avatarFrameId、player.unlockedFrames），上線後不可改

const avatarFrameList = [
    // ---- 預設即可使用 ----
    { id: "f19", name: "素銀月環", img: "images/frames/frame-19.png", ring: { cx: 0.5, cy: 0.471, r: 0.363 }, unlock: null },
    { id: "f12", name: "青玉流光", img: "images/frames/frame-12.png", ring: { cx: 0.5, cy: 0.507, r: 0.328 }, unlock: null },
    // ---- 境界解鎖（達成自動解鎖）----
    { id: "f11", name: "碧落寒光", img: "images/frames/frame-11.png", ring: { cx: 0.5, cy: 0.508, r: 0.325 }, unlock: { type: "realm", value: 1 } },
    { id: "f15", name: "冰紗仙羽", img: "images/frames/frame-15.png", ring: { cx: 0.5, cy: 0.462, r: 0.338 }, unlock: { type: "realm", value: 2 } },
    { id: "f18", name: "紫璃冠冕", img: "images/frames/frame-18.png", ring: { cx: 0.5, cy: 0.454, r: 0.248 }, unlock: { type: "realm", value: 3 } },
    { id: "f16", name: "赤心金翼", img: "images/frames/frame-16.png", ring: { cx: 0.5, cy: 0.482, r: 0.317 }, unlock: { type: "realm", value: 4 } },
    { id: "f09", name: "朱雀靈環", img: "images/frames/frame-09.png", ring: { cx: 0.5, cy: 0.501, r: 0.304 }, unlock: { type: "realm", value: 5 } },
    { id: "f10", name: "翠玉神環", img: "images/frames/frame-10.png", ring: { cx: 0.5, cy: 0.508, r: 0.307 }, unlock: { type: "realm", value: 6 } },
    { id: "f06", name: "紫羽仙環", img: "images/frames/frame-06.png", ring: { cx: 0.5, cy: 0.500, r: 0.291 }, unlock: { type: "realm", value: 7 } },
    { id: "f14", name: "金桂月輪", img: "images/frames/frame-14.png", ring: { cx: 0.5, cy: 0.487, r: 0.294 }, unlock: { type: "realm", value: 8 } },
    { id: "f13", name: "古金蓮紋", img: "images/frames/frame-13.png", ring: { cx: 0.5, cy: 0.500, r: 0.319 }, unlock: { type: "realm", value: 9 } },
    { id: "f07", name: "蒼穹金冠", img: "images/frames/frame-07.png", ring: { cx: 0.5, cy: 0.488, r: 0.296 }, unlock: { type: "realm", value: 10 } },
    { id: "f08", name: "聖翼金環", img: "images/frames/frame-08.png", ring: { cx: 0.5, cy: 0.506, r: 0.268 }, unlock: { type: "realm", value: 11 } },
    { id: "f03", name: "碧海冰晶", img: "images/frames/frame-03.png", ring: { cx: 0.5, cy: 0.418, r: 0.236 }, unlock: { type: "realm", value: 12 } },
    { id: "f02", name: "霜翼銀輝", img: "images/frames/frame-02.png", ring: { cx: 0.5, cy: 0.453, r: 0.250 }, unlock: { type: "realm", value: 13 } },
    { id: "f04", name: "紫霞鳳冠", img: "images/frames/frame-04.png", ring: { cx: 0.5, cy: 0.535, r: 0.293 }, unlock: { type: "realm", value: 14 } },
    { id: "f01", name: "金翎聖晶", img: "images/frames/frame-01.png", ring: { cx: 0.5, cy: 0.465, r: 0.237 }, unlock: { type: "realm", value: 15 } },
    // ---- 渡劫成就（累計渡劫成功次數）----
    { id: "f17", name: "日曜金輪", img: "images/frames/frame-17.png", ring: { cx: 0.5, cy: 0.467, r: 0.394 }, unlock: { type: "tribulation", value: 3 } },
    { id: "f05", name: "赤焰鳳冠", img: "images/frames/frame-05.png", ring: { cx: 0.5, cy: 0.528, r: 0.292 }, unlock: { type: "tribulation", value: 10 } },
    // ---- 貴賓光環（圖上印有 VIP 字樣；花靈石購買）----
    { id: "f24", name: "貴賓金環・VIP 1", img: "images/frames/frame-24.png", ring: { cx: 0.5, cy: 0.533, r: 0.331 }, unlock: { type: "coins", value: 10000000 } },
    { id: "f23", name: "貴賓金環・VIP 2", img: "images/frames/frame-23.png", ring: { cx: 0.5, cy: 0.546, r: 0.320 }, unlock: { type: "coins", value: 30000000 } },
    { id: "f22", name: "貴賓金環・VIP 3", img: "images/frames/frame-22.png", ring: { cx: 0.5, cy: 0.560, r: 0.300 }, unlock: { type: "coins", value: 100000000 } },
    { id: "f21", name: "貴賓金冠・VIP 4", img: "images/frames/frame-21.png", ring: { cx: 0.5, cy: 0.572, r: 0.292 }, unlock: { type: "coins", value: 300000000 } },
    { id: "f20", name: "貴賓王冠・VIP 5", img: "images/frames/frame-20.png", ring: { cx: 0.5, cy: 0.604, r: 0.267 }, unlock: { type: "coins", value: 1000000000 } },
    { id: "f25", name: "翠玉象神・5VIP", img: "images/frames/frame-25.png", ring: { cx: 0.5, cy: 0.483, r: 0.254 }, unlock: { type: "coins", value: 3000000000 } },
    // ---- 元神專屬（2026-10-02，第 65 節）：凝聚該偏好屬性的元神時解鎖（unlock.type "yuanshen"，value＝五行或 thunder／wind）；
    //      圖由程式繪製（屬性色雙環＋符紋＋頂端屬性字徽記，512×512，洞 r 0.36），轉世元神消散也保留 ----
    { id: "ys-metal",   name: "庚金元神環", img: "images/frames/frame-ys-metal.png",   ring: { cx: 0.5, cy: 0.5, r: 0.36 }, unlock: { type: "yuanshen", value: "金" } },
    { id: "ys-wood",    name: "乙木元神環", img: "images/frames/frame-ys-wood.png",    ring: { cx: 0.5, cy: 0.5, r: 0.36 }, unlock: { type: "yuanshen", value: "木" } },
    { id: "ys-water",   name: "癸水元神環", img: "images/frames/frame-ys-water.png",   ring: { cx: 0.5, cy: 0.5, r: 0.36 }, unlock: { type: "yuanshen", value: "水" } },
    { id: "ys-fire",    name: "丙火元神環", img: "images/frames/frame-ys-fire.png",    ring: { cx: 0.5, cy: 0.5, r: 0.36 }, unlock: { type: "yuanshen", value: "火" } },
    { id: "ys-earth",   name: "戊土元神環", img: "images/frames/frame-ys-earth.png",   ring: { cx: 0.5, cy: 0.5, r: 0.36 }, unlock: { type: "yuanshen", value: "土" } },
    { id: "ys-thunder", name: "紫雷元神環", img: "images/frames/frame-ys-thunder.png", ring: { cx: 0.5, cy: 0.5, r: 0.36 }, unlock: { type: "yuanshen", value: "thunder" } },
    { id: "ys-wind",    name: "青風元神環", img: "images/frames/frame-ys-wind.png",    ring: { cx: 0.5, cy: 0.5, r: 0.36 }, unlock: { type: "yuanshen", value: "wind" } }
];

// 頭像與光環內洞的大小比：< 1 表示洞比頭像略小，頭像邊緣會被框的內緣蓋住，不會露出縫隙
const AVATAR_FRAME_HOLE_FIT = 0.95;
