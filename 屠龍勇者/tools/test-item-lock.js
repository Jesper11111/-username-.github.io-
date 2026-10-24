// 物品防賣鎖：記憶體角色／存檔，禁止網路與真實 localStorage。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const nodes = { qty: { value: '1' } };
const sandbox = { console, assert, nodes, TextEncoder, TextDecoder, btoa, atob, crypto: require("crypto").webcrypto, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('禁止寫入真實存檔'); }, removeItem() { throw Error('禁止刪除存檔'); } },
    document: { addEventListener() {}, getElementById: id => nodes[id] || null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
SIM_MODE = true; sfx = () => {}; refreshUI = () => {}; renderPanel = () => {}; showToast = () => {};
let saved = '', pending;
saveGame = () => { saved = saveEncode(JSON.stringify({schema: SAVE_SCHEMA, player})); };
gameConfirm = (title, text, go) => { pending = go; };
createPlayer('鎖定測試', 'knight', CLASSES.knight.base);
const gear = Object.keys(ITEMS).find(id => ITEMS[id].cat === 'weapon' && instSellPrice({id, n:1, ench:0}) > 0 && lootFiltered({id, n:1, ench:0}, 1, true));
assert(gear);
function resetInv() { player.inv = []; player.storage = []; player.gold = 2000; sellPick.clear(); pending = null; }
resetInv();
const a = addItem(gear), b = addItem(gear), c = addItem('redPotion', 5);
sellPickAll(true); assert.equal(sellPickedList().length, 3);
toggleItemLock(a.uid);
assert(a.sellLocked); assert(!sellPick.has(a.uid));
sellPickToggle(a.uid); assert(!sellPick.has(a.uid));
sellPickAll(true); assert(!sellPick.has(a.uid)); assert(sellPick.has(b.uid));
assert.equal(bulkSellList(1).length, 1);
const html = renderSell(); assert(html.includes('🔒 已鎖定')); assert(html.includes('aria-pressed="true"'));
assert(renderBag().includes('toggleItemLock('));
sellN(a.uid, 'qty'); assert.equal(pending, null); assert(findInv(a.uid));
sellPicked(); pending(); assert(findInv(a.uid)); assert(!findInv(b.uid)); assert(!findInv(c.uid));
// 真正加密存檔往返與 schema 5 舊存檔遷移。
saveGame(); assert.equal(saveParse(saved).schema, SAVE_SCHEMA);
player = guardWrap(migrateSave(saveParse(saved))); assert(player.inv[0].sellLocked);
const legacy = JSON.parse(JSON.stringify(player)); delete legacy.inv[0].sellLocked;
assert(!migrateSave({schema:5, player:legacy}).inv[0].sellLocked);
// 單件確認視窗已開啟後才鎖定，也不能賣。
resetInv(); const valuable = addItem(gear, 1, 1);
sellN(valuable.uid, 'qty'); assert.equal(typeof pending, 'function');
toggleItemLock(valuable.uid); pending(); assert(findInv(valuable.uid)); assert.equal(player.gold, 2000);
// 一鍵賣出的確認快照不能繞過後加的鎖。
resetInv(); const bulk = addItem(gear);
bulkSellBtn(1); assert.equal(typeof pending, 'function');
toggleItemLock(bulk.uid); pending(); assert(findInv(bulk.uid)); assert.equal(player.gold, 2000);
toggleItemLock(bulk.uid); bulkSellBtn(1); pending(); assert(!findInv(bulk.uid));
// 回收合併的整列鎖定，與同種未鎖物品分列。
resetInv(); const x = addItem(gear), y = addItem(gear);
toggleItemLock(x.uid, true); assert(x.sellLocked && y.sellLocked);
const z = addItem(gear); assert.equal(groupInv(player.inv).length, 2);
sellPickAll(true); assert.deepEqual(sellPickedList().map(x=>x.uid), [z.uid]);
// 整理／角色倉庫拆疊與合併不會遺失鎖。
resetInv(); const pot = addItem('redPotion', 5); toggleItemLock(pot.uid);
moveQty(pot.uid, 2, player.inv, player.storage); assert(player.storage[0].sellLocked);
moveQty(player.storage[0].uid, 2, player.storage, player.inv); assert(pot.sellLocked && pot.n === 5);
player.inv.push({uid:player.nextUid++, id:'redPotion', n:3}); bagTidy(); assert(player.inv[0].sellLocked && player.inv[0].n === 8);
// 共用倉庫交貨走既有 marketGiveItem，堆疊與裝備皆保留鎖。
resetInv(); marketGiveItem({id:'redPotion', n:3, sellLocked:true}); assert(player.inv[0].sellLocked);
marketGiveItem({id:gear, n:1, ench:0, sellLocked:true}); assert(player.inv[1].sellLocked);
// 同種異界地圖合併列鎖定後，新取得的一張仍保持未鎖。
resetInv(); const m1 = addItem('map1'), m2 = addItem('map1');
toggleItemLock(m1.uid); assert(m1.sellLocked && m2.sellLocked);
const m3 = addItem('map1'); assert(!m3.sellLocked);
assert.equal((renderBag().match(/class="bag-item-open"/g) || []).length, 2);
toggleItemLock(m1.uid); assert(!m1.sellLocked && !m2.sellLocked);
console.log('PASS：鎖定／解鎖、全選與三種賣出防護、確認期間加鎖、加密存檔／舊檔遷移、整列／地圖、倉庫拆疊合併與交貨。');
`, ctx);


