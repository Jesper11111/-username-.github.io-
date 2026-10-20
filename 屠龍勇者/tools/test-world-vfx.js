// 隔離測試：不接觸瀏覽器存檔，不連線；驗證圖片、繪圖純度及現有事件接線。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
function TestImage() { this.complete = false; }
Object.defineProperty(TestImage.prototype, 'src', { set(value) {
    const file = path.join(root, value.split('?')[0]);
    if (!fs.existsSync(file)) return;
    const bytes = fs.readFileSync(file); this.complete = true;
    this.naturalWidth = bytes.readUInt32BE(16); this.naturalHeight = bytes.readUInt32BE(20);
} });
const sandbox = { console, assert, Image: TestImage, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('測試不准寫入存檔'); }, removeItem() { throw Error('測試不准刪除存檔'); } },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('測試不准連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
SIM_MODE = true; sfx = () => {}; sfxHit = () => {};
createPlayer('隔離視覺測試', 'knight', CLASSES.knight.base);
player.lv = 70; player.baseHp = player.hp = 10000; player.baseMp = player.mp = 10000;
assert.equal(Object.keys(WORLD_VFX_DEFS).length, 48);
assert.equal(new Set(Object.values(WORLD_VFX_GROUPS)).size, 10);
assert.deepEqual(Object.keys(WORLD_VFX_CLASS).sort(), Object.keys(CLASSES).sort());
assert.deepEqual(Object.keys(WORLD_VFX_DEFS).filter(id => WORLD_VFX_DEFS[id].previewOnly).sort(), ['impact-1', 'progress-1', 'status-0']);
let imageCalls = 0;
const stack = [], paint = new Proxy({ globalAlpha: 1 }, {
    get(o, key) {
        if (key in o) return o[key];
        if (key === 'save') return () => stack.push(o.globalAlpha);
        if (key === 'restore') return () => { assert(stack.length > 0); o.globalAlpha = stack.pop(); };
        if (key === 'drawImage') return (image, x, y, w, h, ...rest) => {
            assert([x,y,w,h,...rest].every(Number.isFinite)); assert(x >= 0 && y >= 0);
            assert(x+w <= image.naturalWidth+.001 && y+h <= image.naturalHeight+.001); imageCalls++;
        };
        return (...args) => { for (const n of args) if (typeof n === 'number') assert(Number.isFinite(n)); };
    },
    set(o, key, value) { if (key === 'globalAlpha') assert(Number.isFinite(value) && value >= 0 && value <= 1); o[key] = value; return true; }
});
const pristine = JSON.stringify(player);
for (const id in WORLD_VFX_DEFS) for (const age of [-1,0,1,50,250,599,1000,1799,2599,2999]) {
    drawWorldVfxPreview(paint, id, age); assert.equal(stack.length, 0); assert.equal(paint.globalAlpha, 1);
}
assert.equal(Object.keys(worldVfxImages).length, 12); assert(imageCalls > 200);
assert.equal(JSON.stringify(player), pristine);
const mon = { id: 'test', name: '測試怪', hp: 100000, maxHp: 100000, ac: 0, mr: 0, hit: 30, dmg: [1,2], spd: 1000, stunUntil: 0 };
function resetScene() {
    scene = { pl: { x:3,y:6,rx:3,ry:6 }, mons: [{ inst:mon,x:4,y:6,rx:4,ry:6 }] };
    hunt = { state:'fight', mon, mobs:[mon], pCd:0 }; gameNow = 10000;
}
resetScene(); worldVfxEmit('attack-0', mon); assert(!scene.worldVfx);
SIM_MODE = false;
for (const id of ['impact-1','progress-1','status-0']) worldVfxEmit(id, mon);
assert(!scene.worldVfx);
worldVfxQuality = 'low'; for (let i=0;i<50;i++) worldVfxEmit('attack-0', mon); assert.equal(scene.worldVfx.length, 8);
worldVfxQuality = 'high'; for (let i=0;i<50;i++) worldVfxEmit('attack-0', mon); assert.equal(scene.worldVfx.length, 24);
const state = JSON.stringify({ player, hunt });
for (const layer of ['ground','front']) drawWorldVfx(paint, 0, 0, layer);
assert.equal(JSON.stringify({ player, hunt }), state);
gameNow += 10000; drawWorldVfx(paint, 0, 0, 'front'); assert.equal(scene.worldVfx.length, 0);
resetScene();
for (const cls in WORLD_VFX_CLASS) { worldVfxSkill({id:'test',cls}, mon); assert.equal(scene.worldVfx.at(-1).id, WORLD_VFX_CLASS[cls]); }
worldVfxSkill({id:'meteor',name:'流星雨',kind:'magic'}, mon); assert.equal(scene.worldVfx.at(-1).id,'boss-2');
const oldChance = chance; chance = p => p > 0;
resetScene(); const st = calcStats(); st.crit = 1; st.double = 0;
physicalAttack(st,1,{}); assert(scene.worldVfx.some(f => f.id==='attack-0')); assert(scene.worldVfx.some(f => f.id==='impact-0'));
resetScene(); player.hp -= 20; castHeal({id:'testHeal',name:'治癒',mp:0,heal:[5,5],spK:0},st); assert(scene.worldVfx.some(f => f.id==='support-0'));
resetScene(); st.dodge = 1; monsterAttack(st,mon); assert(scene.worldVfx.some(f=>f.id==='impact-2'));
resetScene(); mon.boss = true; const tele = {mob:mon,name:'重擊',start:gameNow,until:gameNow+1600,dodged:false,seenAt:gameNow+1600}; hunt.tele=tele; scene.tele={ref:tele,x:8,y:9};
bossSkillTick(0); assert(!scene.worldVfx); gameNow+=1600; bossSkillTick(0);
assert(scene.worldVfx.some(f=>f.id==='boss-1' && f.pos.x===8 && f.pos.y===9));
resetScene(); const w = player.equip.weapon; w.ench=12; w.bossEnchant='towerIceCrown';
const beforeWeapon = JSON.stringify(player);
for (const dir of ['down','up','right','left']) drawWorldWeapon(paint,64,64,dir,{name:'attack',t:100,dur:400});
assert.equal(JSON.stringify(player), beforeWeapon);
mon.stunUntil=gameNow+1000;
mon.bossEnchantDebuffs=[{type:'slow',owner:player,uid:w.uid,id:w.bossEnchant,until:gameNow+1000}];
player.buffs.test={src:'item',id:'greenPotion',until:gameNow+1000};
const beforeAmbient = JSON.stringify({player,hunt}); drawWorldVfx(paint,0,0,'front'); assert.equal(JSON.stringify({player,hunt}), beforeAmbient);
resetScene(); worldVfxLoot(mon,{cat:'material'},null); assert.equal(scene.worldVfx.at(-1).id,'loot-1');
worldVfxLoot(mon,{cat:'weapon'},{q:'legend'}); assert.equal(scene.worldVfx.at(-1).id,'loot-3');
chance = oldChance;
console.log('PASS：48 款／十類／十二職業、真實 12 圖分格、Canvas 邊界與還原、預覽／常駐繪圖不改角色。');
console.log('PASS：SIM 隔離、預覽限定三款、事件數量上限與過期、普攻／暴擊／治癒／閃避／首領時序／掉落接線。');
`, ctx);
