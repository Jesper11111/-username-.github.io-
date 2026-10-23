// 喝水延遲不會被快轉模擬（離線結算、團隊副本、世界首領）帶到未來（第 113 節）。隔離角色，不寫真實存檔、不連線。
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
sfx = () => {}; refreshUI = () => {}; showToast = () => {}; gameAlert = () => {}; worldVfxSupport = () => {}; saveGame = () => {};
SIM_MODE = true; createPlayer('喝水測試', 'knight', CLASSES.knight.base); SIM_MODE = false;
addItem('redPotion', 50); addItem('greenPotion', 5); addItem('bravePotion', 5);
// ① 模擬裡一直喝水：結束後延遲要還原
potReadyAt = 0;
const realTick = huntTick;
huntTick = () => { if (potionReady()) usePotion('redPotion'); };
measureHunt(10 * 60 * 1000);
huntTick = realTick;
assert.equal(potReadyAt, 0, '模擬結束還原喝水延遲');
assert.equal(usePotion('redPotion'), '', '離線結算後可以馬上喝紅水');
assert.equal(usePotion('greenPotion'), '喝水延遲中', '0.8 秒內再喝仍有延遲');
gameNow += POTION_CD_MS;
assert.equal(usePotion('greenPotion'), '', '綠水可以喝');
gameNow += POTION_CD_MS;
assert.equal(usePotion('bravePotion'), '', '勇水可以喝');
// ② 保險：舊版留下的超長延遲直接解除
potReadyAt = gameNow + 10 * 60 * 1000;
assert.equal(potionReady(), true, '超過一次延遲長度的值視為錯誤、解除');
console.log('test-potion-delay OK');
`, ctx);
