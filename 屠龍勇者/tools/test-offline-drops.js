// 離線掛機掉落：只給藥水、白色（普通）地圖與白色裝備，依有效時間換算、受負重限制（第 108 節）。隔離角色，不寫真實存檔、不連線。
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
sfx = () => {}; refreshUI = () => {}; showToast = () => {}; gameAlert = () => {}; worldVfxLoot = () => {}; saveGame = () => {};
const lootLines = []; const oldLoot = addLootLog; addLootLog = (m, c) => { lootLines.push(m); };
// ① 篩選規則
assert.equal(offlineDropAllowed({ id: 'redPotion', n: 3 }), true, '藥水');
assert.equal(offlineDropAllowed({ id: 'longSword', n: 1, q: null }), true, '白色裝備');
assert.equal(offlineDropAllowed({ id: 'longSword', n: 1, q: 'magic' }), false, '魔法裝備不給');
assert.equal(offlineDropAllowed({ map: 2, q: null }), true, '白色地圖');
assert.equal(offlineDropAllowed({ map: 2, q: 'rare' }), false, '稀有地圖不給');
const mat = Object.keys(ITEMS).find(id => ITEMS[id].cat === 'material');
assert.equal(offlineDropAllowed({ id: mat, n: 1 }), false, '材料不給');
const cur = Object.keys(ITEMS).find(id => ITEMS[id].cat === 'currency');
if (cur) assert.equal(offlineDropAllowed({ id: cur, n: 1 }), false, '通貨不給');
const book = Object.keys(ITEMS).find(id => ITEMS[id].cat === 'book');
assert.equal(offlineDropAllowed({ id: book, n: 1 }), false, '魔法書不給');

// ② 換算：k=3 → 每筆 3 份；k=2.5 → 2 或 3 份
SIM_MODE = true; createPlayer('離線測試', 'knight', CLASSES.knight.base); SIM_MODE = false;
player.inv = [];
let g = offlineGiveDrops([{ id: 'redPotion', n: 2 }, { id: 'longSword', n: 1, q: null }, { map: 1, q: null }], 3);
assert.equal(countItem('redPotion'), 6); assert.equal(player.inv.filter(x => x.id === 'longSword').length, 3);
assert.equal(player.inv.filter(x => x.id === 'map1').length, 3); assert(player.inv.filter(x => x.id === 'map1').every(x => !x.q), '地圖都是白色');
assert(player.inv.filter(x => x.id === 'longSword').every(x => !x.q && !x.af && !x.ench), '裝備都是白色、沒強化');
assert.equal(g.skipped, 0); assert(g.text.some(t => t.includes('×6')));
player.inv = [];
const swords = offlineGiveDrops([{ id: 'longSword', n: 1 }], 2.5) && player.inv.filter(x => x.id === 'longSword').length;
assert(swords === 2 || swords === 3);
// ③ 負重：只撿得下的部分
player.inv = []; const oldStats = calcStats; const base = invWeight(); calcStats = () => Object.assign(oldStats(), { weightMax: base + ITEMS.longSword.wt * 2 + 0.001 });
g = offlineGiveDrops([{ id: 'longSword', n: 1 }], 5);
assert.equal(player.inv.filter(x => x.id === 'longSword').length, 2); assert.equal(g.skipped, 3, '超過負重的不撿');
calcStats = oldStats;

// ④ 真的跑一次離線結算：掛機 2 小時（有效 1 小時），只會多出允許的種類
SIM_MODE = true; createPlayer('離線實跑', 'knight', CLASSES.knight.base); SIM_MODE = false;
player.lv = 30; player.stats.str = 30; player.stats.con = 30;
const z = (Array.isArray(ZONES) ? ZONES : Object.values(ZONES)).find(z => z.id === 'island');
player.loc = { type: 'zone', id: z.id }; player.hunting = true; player.hp = calcStats().maxHp;
addItem('redPotion', 500);
const before = new Map(player.inv.map(x => [x.uid, x.id])), potions0 = countItem('redPotion');
const rep = applyOffline(2 * 3600 * 1000);
assert(rep && rep.kills > 0, '有擊殺');
const added = player.inv.filter(x => !before.has(x.uid));
for (const x of added) {
    const d = ITEMS[x.id];
    assert(d.cat === 'potion' || ((d.cat === 'weapon' || d.cat === 'armor' || x.id.startsWith('map')) && !x.q), '只會多出藥水、白色地圖、白色裝備：' + x.id + ' ' + x.q);
}
assert(Array.isArray(rep.loot), '報告有寶物欄');
console.log('實跑：擊倒', rep.kills, '寶物', rep.loot.join('、') || '無', '藥水', potions0, '→', countItem('redPotion'));
console.log('PASS：篩選（藥水／白色地圖／白色裝備可、魔法稀有材料通貨魔法書不可）、依有效時間換算份數、負重上限、實跑離線結算只多出允許的種類。');
`, ctx);
