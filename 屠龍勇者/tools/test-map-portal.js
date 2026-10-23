// 異界地圖回卷：村莊一次性傳送門（第 114 節）。隔離角色，不寫真實存檔、不連線。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), memory = new Map();
const sandbox = { console, assert, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
    localStorage: { getItem: k => memory.has(k) ? memory.get(k) : null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
sfx = () => {}; refreshUI = () => {}; showToast = () => {}; gameAlert = () => {}; saveGame = () => {}; switchTab = () => {}; closeDialog = () => {};
let confirmFn = null; gameConfirm = (t, m, fn) => { confirmFn = fn; };
SIM_MODE = true; createPlayer('傳送門測試', 'knight', CLASSES.knight.base); SIM_MODE = false;
const town = player.loc.id;
addItem('homeScroll', 5);
const open = () => { const x = makeMapItem(3, 'magic'); player.inv.push(x); openMap(x.uid); return player.mapRun; };
// ① 回卷：地圖變成傳送門，進度保留
let r = open();
assert(r && inMapRun(), '開啟異界');
r.left = 37; r.bossHp = 0;
assert.equal(useHomeScroll(''), true);
assert(inTown(), '回到村莊');
assert.equal(player.mapRun, null, '回村期間沒有進行中的異界（伺服器不會當成異界）');
assert(player.mapPortal && player.mapPortal.left === 37 && player.mapPortal.zone === r.zone, '傳送門保留進度');
assert(mapDevicePanelHtml().includes('進入傳送門'), '異界裝置顯示傳送門');
// 傳送門開著不能再開新地圖
const x2 = makeMapItem(2, null); player.inv.push(x2); openMap(x2.uid);
assert.equal(player.mapRun, null, '傳送門開著不能開新地圖'); assert(findInv(x2.uid), '地圖沒被吃掉');
// ② 進入傳送門：回到原本異界，傳送門關閉
enterMapPortal();
assert(inMapRun() && player.mapRun.left === 37, '回到原異界、剩餘怪物不變');
assert.equal(player.mapPortal, null, '一次性：傳送門關閉');
assert.equal(player.hunting, true, '回去自動開始掛機');
// ③ 首領剩餘 HP 也保留
player.mapRun.left = 0; player.mapRun.bossHp = 1234;
useHomeScroll('');
assert.equal(player.mapPortal.bossHp, 1234, '首領剩餘 HP 保留');
enterMapPortal();
assert.equal(player.mapRun.bossHp, 1234);
// ④ 死亡／步行回村：地圖照舊消失、沒有傳送門
moveToTown(town);
assert.equal(player.mapRun, null); assert.equal(player.mapPortal, null, '非回卷回村不開傳送門');
// ⑤ 關閉傳送門
r = open(); useHomeScroll('');
assert(player.mapPortal); closeMapPortalBtn(); confirmFn();
assert.equal(player.mapPortal, null, '可以手動關閉');
// ⑥ 存檔修正：mapPortal 跟 mapRun 同時存在時丟掉傳送門
r = open(); useHomeScroll('');
const d = { player: JSON.parse(JSON.stringify(player)) }; d.player.mapRun = d.player.mapPortal;
migrateSave(d); assert.equal(d.player.mapPortal, null, '異常存檔修正');
const d2 = { player: JSON.parse(JSON.stringify(player)) }; migrateSave(d2); assert(d2.player.mapPortal && d2.player.mapPortal.left > 0, '正常存檔保留傳送門');
console.log('test-map-portal OK');
`, ctx);
