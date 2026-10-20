// 離線隔離測試；不讀寫玩家存檔、不呼叫雲端。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sandbox = { console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('測試不准寫入存檔'); }, removeItem() { throw Error('測試不准刪除存檔'); } },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {},
    fetch() { throw Error('測試不准連線'); }, Image: function () {} };
const ctx = vm.createContext(sandbox);
for (const [, p] of html.matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (p === 'data/main.js' || p === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, p), 'utf8'), ctx, { filename: p });
}
ctx.assert = assert;
vm.runInContext(String.raw`
SIM_MODE = true;
sfx = () => {}; sfxHit = () => {};
function testPlayer(cls = 'knight') {
    createPlayer('附魔測試', cls, CLASSES[cls].base);
    player.lv = 70; player.baseHp = 10000; player.baseMp = 10000; player.hp = 10000; player.mp = 10000; player.gold = 50000000;
    player.settings.autoHome = false; player.settings.bar = []; player.skills = [];
    player.inv = []; player.storage = []; player.equip = {};
    const w = addItem('longSword'); equipItem(w.uid, true);
    return w;
}
function testFight(w, id, n = 1) {
    w.bossEnchant = id; player.hunting = true; player.cds = {}; player.loc = { type: 'zone', id: 'island' }; gameNow = 10000;
    const mobs = Array.from({ length: n }, (_, i) => ({ id: 'test' + i, name: '測試怪', hp: 100000, maxHp: 100000, ac: 0, mr: 0, boss: false, dmg: [10, 10], spd: 1000, atkCd: 1000, stunUntil: 0 }));
    hunt = { state: 'fight', mon: mobs[0], mobs, pCd: 1000, warned: {}, potCd: 0, joinCd: 100000 };
    session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
    return mobs;
}
assert.equal(Object.keys(BOSS_ENCHANTS).length, 25);
assert.equal(Object.values(ITEMS).filter(d => d.soulEnchant).length, 25);
for (const id in BOSS_ENCHANTS) {
    assert(ITEMS[id]); assert.equal(ITEMS['soul_' + id].name, BOSS_ENCHANTS[id].name + '封魂石');
    const r = BOSS_ENCHANTS[id];
    assert.equal(r.cost, id.endsWith('Scale') ? 5000000 : id.startsWith('tower') ? (TOWER_BOSS_MATERIALS.indexOf(id) < 5 ? 2000000 : 4000000) : 1000000);
    const w = testPlayer(); addItem(id); const gold = player.gold;
    assert.equal(bossEnchantApply(w.uid, id, false, ''), '');
    assert.equal(w.bossEnchant, id); assert.equal(countItem(id), 0); assert.equal(player.gold, gold - r.cost);
    const preserved = JSON.stringify({ id: w.id, uid: w.uid, ench: w.ench });
    addItem('towerSoul'); const beforeSeal = player.gold;
    assert.equal(bossEnchantSeal(w.uid, id), '');
    assert.equal(countItem('towerSoul'), 0); assert.equal(countItem('soul_' + id), 1); assert.equal(w.bossEnchant, undefined);
    assert.equal(player.gold, beforeSeal - 500000); assert.equal(JSON.stringify({ id: w.id, uid: w.uid, ench: w.ench }), preserved);
    assert(bossEnchantSeal(w.uid, id)); assert.equal(countItem('soul_' + id), 1);
    assert.equal(bossEnchantApply(w.uid, id, true, ''), ''); assert.equal(countItem('soul_' + id), 0);
    assert(bossEnchantApply(w.uid, id, true, '')); // 重複確認不能再扣款或複製
    assert.equal(player.gold, beforeSeal - 1000000);
    assert(itemDescHtml(w).includes(r.name)); assert(bulkSellList(3).every(x => x.uid !== w.uid));
    // 每個技能均實際觸發與推進，範圍不超過五隻，且不耗魔。
    const mobs = testFight(w, id, 8), mp = player.mp; const oldChance = chance; chance = () => true;
    bossEnchantOnHit(mobs[0], calcStats());
    assert.equal(player.cds._bossEnchant, gameNow + r.cd * 1000);
    for (let t = 0; t < 110; t++) { gameNow += 100; bossEnchantTick(calcStats()); }
    assert(mobs.some(m => m.hp < m.maxHp), id + '沒有造成傷害');
    assert(mobs.filter(m => m.hp < m.maxHp).length <= 5, id + '範圍超過五隻'); assert.equal(player.mp, mp);
    chance = oldChance;
}
// 資源不足／錯誤目標／離村操作完全不扣款。
let w = testPlayer(); const gold = player.gold;
assert(bossEnchantApply(w.uid, 'treantHeart', false, '')); assert.equal(player.gold, gold);
addItem('treantHeart'); player.gold = 0; assert(bossEnchantApply(w.uid, 'treantHeart', false, '')); assert.equal(countItem('treantHeart'), 1);
player.gold = gold; player.loc = { type: 'zone', id: 'island' }; assert(bossEnchantApply(w.uid, 'treantHeart', false, '')); assert.equal(countItem('treantHeart'), 1);
player.loc = { type: 'town', id: 'talking' }; assert(bossEnchantApply(999999, 'treantHeart', false, ''));
// 品質、強化值、詞綴及共鳴不被封魂改寫；舊存檔與新存檔遷移。
w.ench = 6; w.q = 'rare'; w.af = []; addItem('towerSoul'); w.bossEnchant = 'treantHeart';
assert.equal(bossEnchantSeal(w.uid, 'treantHeart'), ''); assert.equal(w.ench, 6); assert.equal(w.q, 'rare');
let copy = migrateSave({ schema: 4, player: JSON.parse(JSON.stringify(player)) }); assert(copy.equip.weapon); assert(copy.inv.some(x => ITEMS[x.id].soulEnchant));
w.bossEnchant = 'treantHeart'; copy = migrateSave({ schema: 5, player: JSON.parse(JSON.stringify(player)) }); assert.equal(copy.equip.weapon.bossEnchant, 'treantHeart');
w.bossEnchant = 'bad'; copy = migrateSave({ schema: 5, player: JSON.parse(JSON.stringify(player)) }); assert.equal(copy.equip.weapon.bossEnchant, undefined);
// 共鳴技能與附魔不得互相觸發；多段與範圍只抽一次。
w = testPlayer(); let mobs = testFight(w, 'towerBullHorn', 8), rolls = 0; const oldChance = chance;
chance = p => { if (p === .08) { rolls++; return false; } return true; };
doStrike({ id: 'teststrike', mp: 0, mult: 1, aoe: true, hits: 3 }, calcStats()); assert.equal(rolls, 1);
rolls = 0; doStrike({ id: 'res_test', mp: 0, mult: 1, aoe: true, hits: 3 }, calcStats()); assert.equal(rolls, 0);
castSpell({ id: 'res_test', mp: 0, dmg: [1, 1], spK: 0, aoe: true }, calcStats()); assert.equal(rolls, 0);
castSpell({ id: 'testspell', mp: 0, dmg: [1, 1], spK: 0, aoe: true }, calcStats()); assert.equal(rolls, 1);
chance = () => true; bossEnchantOnHit(mobs[0], calcStats()); const cd = player.cds._bossEnchant;
const w2 = addItem('longSword'); w2.bossEnchant = 'towerKingSeal'; equipItem(w2.uid, true); bossEnchantRuntime(); assert.equal(player.cds._bossEnchant, cd);
// BOSS 免控，減傷與護盾；深淵最多三層。
w = testPlayer(); mobs = testFight(w, 'treantHeart'); mobs[0].boss = true; bossEnchantOnHit(mobs[0], calcStats()); assert.equal(bossEnchantMoveFactor(mobs[0]), .9);
assert.equal(bossEnchantDebuffValue(mobs[0], 'root'), 0);
mobs = testFight(w, 'towerAbyssEye'); for (let i = 0; i < 4; i++) { player.cds = {}; bossEnchantOnHit(mobs[0], calcStats()); } assert.equal(bossEnchantRuntime().jobs.length, 3);
mobs = testFight(w, 'antharasScale'); bossEnchantOnHit(mobs[0], calcStats()); assert.equal(bossEnchantAbsorb(600), 100); assert.equal(bossEnchantAbsorb(100), 100);
mobs = testFight(w, 'osirisSeal'); mobs[0].boss = true; bossEnchantOnHit(mobs[0], calcStats()); assert.equal(bossEnchantEnemyDamage(mobs[0], 100), 96);
// 延遲爆炸依原位置命中，離開可閃避；同場其他敵人仍可被火域擊中。
SIM_MODE = false; scene = { pl: { x: 0, y: 0 }, mons: [] }; sfx = () => {};
mobs = testFight(w, 'pirateTreasure', 2); scene.mons = mobs.map((inst, i) => ({ inst, x: i, y: 0 }));
bossEnchantOnHit(mobs[0], calcStats()); scene.mons[0].x = 20; gameNow += 800; bossEnchantTick(calcStats());
assert.equal(mobs[0].hp, mobs[0].maxHp); assert(mobs[1].hp < mobs[1].maxHp);
SIM_MODE = true; chance = oldChance;
// 鍛造表單與圖鑑可渲染，封魂石都能顯示技能與取得來源。
player.loc = { type: 'town', id: 'talking' }; assert(renderBossEnchantForge().includes('BOSS 附魔'));
for (const id in BOSS_ENCHANTS) { assert(itemDescHtml({ id: 'soul_' + id, n: 1 }).includes(BOSS_ENCHANTS[id].name)); assert(codexSources('soul_' + id).length); }

// 產生的 HTML 事件只有頂層函式與字面值，動態引號可解析。
const savedDialog = openDialog; let captured = '';
openDialog = (title, html) => { captured = html; };
player.loc = { type: 'town', id: 'talking' }; addItem('towerSoul'); openBossEnchantWeapon(w.uid);
assert(captured.includes('bossEnchantAsk('));
for (const match of captured.matchAll(/onclick="([^"]+)"/g)) new Function(match[1]);
openDialog = savedDialog;
// 團隊副本每種附魔都可完整模擬，模擬完保留原角色與裝備。
for (const id in BOSS_ENCHANTS) {
    w = testPlayer(); w.bossEnchant = id;
    const original = player, snap = JSON.parse(JSON.stringify(player));
    const result = raidSimulate(RAIDS[0], [{ uid: 'test', snap }], { limitMs: 20000 });
    assert(result.members.length === 1); assert.equal(player, original); assert.equal(player.equip.weapon.bossEnchant, id);
    assert(Number.isFinite(result.members[0].dmg));
}

// 隔離離線量測：不扣真正材料、不寫存檔，結束還原原角色的附魔與金幣。
for (const id in BOSS_ENCHANTS) {
    w = testPlayer(); w.bossEnchant = id; player.loc = { type: 'zone', id: 'island' };
    const beforeGold = player.gold, beforeId = w.bossEnchant;
    measureHunt(5000);
    assert.equal(player.gold, beforeGold); assert.equal(player.equip.weapon.bossEnchant, beforeId);
}
// 多人烙印不疊加，護盾過期後不再吸收；事件造成擊殺由原結算負責。
w = testPlayer(); mobs = testFight(w, 'forgottenRelic'); chance = () => true;
bossEnchantOnHit(mobs[0], calcStats()); assert.equal(bossEnchantDebuffValue(mobs[0], 'mark'), .12);
const ally = player; createPlayer('隊友', 'knight', CLASSES.knight.base); player.equip.weapon.bossEnchant = 'towerKingSeal';
const before = mobs[0].hp; bossEnchantDamage(mobs[0], 100, 'towerKingSeal'); assert.equal(before - mobs[0].hp, 112);
player = ally; gameNow += 5001; assert.equal(bossEnchantDebuffValue(mobs[0], 'mark'), 0);
mobs = testFight(w, 'antharasScale'); bossEnchantOnHit(mobs[0], calcStats()); gameNow += 4001; assert.equal(bossEnchantAbsorb(100), 100);
chance = oldChance;
console.log('PASS：25 技能傷害／範圍／延遲、全費用、材料消耗、封魂往返防重複、舊新存檔、共鳴隔離、每次行動只抽一次、換武器冷卻、控場／護盾、UI／圖鑑。');
`, ctx);
