// 遠程武器射程：弓、槍 8 格；攻擊魔法、共鳴技能 4 格；近戰 1 格；牆擋住就不行（第 110 節）。隔離角色，不寫存檔、不連線。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const sandbox = { console, assert, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
assert.equal(WEAPON_TYPES.bow.range, 8); assert.equal(WEAPON_TYPES.gun.range, 8);
SIM_MODE = true; createPlayer('射程測試', 'elf', CLASSES.elf.base); SIM_MODE = false;
const W = 20, grid = Array.from({ length: W }, () => Array(W).fill(0));
scene = { pl: { x: 2, y: 10 }, grid, mons: [], effects: [] };
const at = (x, y) => sceneReach({ x, y });
const equip = id => { const inst = addItem(id, 1, 0); player.equip.weapon = inst; };
// 弓：8 格內（含 8）打得到，9 格打不到；魔法距離仍是 4
equip(Object.keys(ITEMS).find(id => ITEMS[id].type === 'bow'));
assert.equal(weaponIsRanged(), true); assert.equal(weaponRange(), 8);
assert.equal(at(10, 10).weapon, true, '弓 8 格');
assert.equal(at(11, 10).weapon, false, '弓 9 格打不到');
assert.equal(at(6, 10).ranged, true); assert.equal(at(7, 10).ranged, false, '魔法仍是 4 格');
assert.equal(at(8, 15).weapon, true, '斜角約 7.8 格打得到');
assert.equal(sceneCanHit({ x: 10, y: 10 }), true);
// 牆擋住
grid[10][5] = 1; assert.equal(at(8, 10).weapon, false, '中間有牆打不到'); grid[10][5] = 0;
// 槍：同樣 8 格
equip(Object.keys(ITEMS).find(id => ITEMS[id].type === 'gun'));
assert.equal(weaponRange(), 8); assert.equal(at(10, 10).weapon, true); assert.equal(at(11, 10).weapon, false);
// 近戰：1 格
equip(Object.keys(ITEMS).find(id => ITEMS[id].type === 'sword'));
assert.equal(weaponIsRanged(), false); assert.equal(weaponRange(), RANGED_RANGE);
assert.equal(sceneCanHit({ x: 3, y: 11 }), true); assert.equal(sceneCanHit({ x: 4, y: 10 }), false);
// 技能距離：魔法用 4 格、遠程武器的物理技能用武器射程
assert.equal(skillReach({ type: 'spell' }, { ranged: true }), 'ranged');
assert.equal(skillReach({ type: 'strike' }, { ranged: true }), 'weapon');
assert.equal(skillReach({ type: 'strike' }, { ranged: false }), 'melee');
// canReach 依地圖回報判斷
hunt = { mon: {}, reach: null }; hunt.reach = { mon: hunt.mon, melee: false, ranged: false, weapon: true, seenAt: gameNow };
assert.equal(canReach('weapon'), true); assert.equal(canReach('ranged'), false); assert.equal(canReach('melee'), false);
// 道具說明有射程
assert(itemDescHtml({ id: Object.keys(ITEMS).find(id => ITEMS[id].type === 'bow'), n: 1, ench: 0 }).includes('射程 8 格'));
console.log('PASS：弓、槍 8 格（9 格打不到、斜角、牆擋）、魔法 4 格、近戰 1 格、技能距離、canReach、道具說明顯示射程。');
`, ctx);
