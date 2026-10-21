// 掉落紀錄隔離整合測試，不讀寫瀏覽器存檔、不連雲端。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), nodes = {};
function node() { return { innerHTML: '', scrollHeight: 100, classList: { toggle() {} } }; }
for (const id of ['hunt-log', 'hunt-loot', 'pop-chat', 'lp-tab-log', 'lp-tab-chat', 'lp-tab-loot']) nodes[id] = node();
const sandbox = { console, assert, nodes, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => 'loot', setItem(k) { assert.equal(k, 'dragonSlayer_logTab'); }, removeItem() { throw Error('禁止刪除存檔'); } },
    document: { addEventListener() {}, getElementById: id => nodes[id] || null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
assert.equal(logPopTab,'loot');
SIM_MODE = false; sfx = () => {}; worldVfxLoot = () => {};
createPlayer('掉落測試','knight',CLASSES.knight.base);
player.inv=[]; player.settings.lootFilter=0;
chance = p => p >= 1; rollBookDrop=()=>null;
const oldMapDrop=rollMapDrop; rollMapDrop=()=>{};
const id=Object.keys(ITEMS).find(id=>ITEMS[id].heal);
const mon={lv:1,boss:false,drops:[{id,p:1,n:[3,3]}]};
rollDrops(mon,{drops:[]});
assert.equal(countItem(id),3); assert.equal(lootLog.length,1); assert(lootLog[0].msg.endsWith('×3'));
assert(!gameLog.some(l=>l.msg.includes('獲得')),'掉落不可混進戰鬥訊息');
for(let i=0;i<150;i++) addLog('你攻擊了怪物');
assert.equal(lootLog.length,1); assert(!gameLog.some(l=>l.msg===lootLog[0].msg));
addLog('倉庫取出','loot'); assert.equal(lootLog.length,1);
const oldStats=calcStats; calcStats=()=>({weightMax:0});
rollDrops(mon,{drops:[]}); assert.equal(lootLog.length,1); assert.equal(countItem(id),3);
calcStats=oldStats;
const weapon=Object.keys(ITEMS).find(id=>ITEMS[id].cat==='weapon'&&ITEMS[id].price);
const oldQuality=rollQuality; rollQuality=()=>null; player.settings.lootFilter=1;
rollDrops({...mon,drops:[{id:weapon,p:1}]},{drops:[]});
assert(lootLog.at(-1).msg.includes('自動賣出')); assert(!player.inv.some(x=>x.id===weapon));
assert(!gameLog.some(l=>l.msg.includes('自動賣出')),'自動賣出不可混進戰鬥訊息');
player.settings.lootFilter=0; rollQuality=()=> 'legend';
rollDrops({...mon,drops:[{id:weapon,p:1}]},{drops:[]});
assert.equal(lootLog.at(-1).cls,'boss'); assert(lootLog.at(-1).msg.includes('傳說'));
rollQuality=oldQuality; rollMapDrop=oldMapDrop;
giveMap(1,null); assert(lootLog.at(-1).msg.includes('異界地圖 T1'));
const state={active:true}, qid=Object.keys(ITEMS).find(id=>ITEMS[id].cat==='quest');
currentQuest=()=>({goal:{type:'collect',zone:'test',item:qid,itemName:'任務測試',n:2,p:1}}); questState=()=>state;
questOnKill(mon,{id:'test'}); assert(lootLog.at(-1).msg.includes('任務測試'));
const before=lootLog.length; SIM_MODE=true; addLootLog('模擬道具'); assert.equal(lootLog.length,before); SIM_MODE=false;
for(let i=0;i<130;i++)addLootLog('道具'+i);
assert.equal(lootLog.length,120); assert.equal(lootLog[0].msg,'道具10');
addLootLog('<img src=x onerror=bad()>'); logDrawerOpen=true; lastLootRendered=-1;
renderLootLog(); assert(nodes['hunt-loot'].innerHTML.includes('&lt;img')); assert(!nodes['hunt-loot'].innerHTML.includes('<img'));
let selected={}; for(const [id,n] of Object.entries(nodes)) n.classList.toggle=(key,value)=>{selected[id+':'+key]=value;};
for(const t of ['loot','log','chat']) { logPopTab=t; syncLogPopTab(); assert.equal(selected['hunt-loot:hidden'],t!=='loot'); assert.equal(selected['hunt-log:hidden'],t!=='log'); assert.equal(selected['pop-chat:hidden'],t!=='chat'); }
showScreen=()=>{}; layoutFrame=()=>{}; renderTabs=()=>{}; refreshUI=()=>{};
enterGame(); assert.equal(lootLog.length,0); assert.equal(lastLootRendered,-1);
logPopTab='loot'; renderLootLog(); assert(nodes['hunt-loot'].innerHTML.includes('尚無掉落紀錄'));
console.log('PASS：真實掉落／數量、超重排除、自動賣出、傳說、地圖、任務、戰鬥洗頻獨立、120筆上限、SIM隔離、HTML跳脫、三分頁與換角色清空。');
`,ctx);
