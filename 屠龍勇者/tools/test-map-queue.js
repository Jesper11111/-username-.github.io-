// 五格異界地圖排程：記憶體角色／存檔，禁止網路與真實 localStorage。
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
SIM_MODE=true; createPlayer('排程隔離測試','knight',CLASSES.knight.base); SIM_MODE=false;
sfx=()=>{}; refreshUI=()=>{}; showToast=()=>{}; switchTab=()=>{}; closeDialog=()=>{};
let pending=null, saved=''; gameConfirm=(t,m,go)=>{pending=go;};
saveGame=()=>{saved=saveEncode(JSON.stringify({schema:SAVE_SCHEMA,player}));};
const town=player.loc.id;
function resetQueue() {
 player.mapQueue=null;player.mapRun=null;player.mapPortal=null;player.hunting=false;
 player.loc={type:'town',id:town};player.inv=[];hunt=null;walkHome=null;
 addItem('redPotion',100);addItem('homeScroll',10);
}
function maps(t,n) {const xs=[];for(let i=0;i<n;i++){const x=makeMapItem(t,null);player.inv.push(x);xs.push(x);}return xs;}
function setSlot(i,x,n) {
 nodes['map-queue-select-'+i]={value:String(x.uid)};nodes['map-queue-qty-'+i]={value:String(n)};mapQueueSet(i);
}
function finish() {assert(inMapRun());mapOnKill({mapBoss:true});assert(inTown());mapQueueTick();}
assert.equal(SAVE_SCHEMA,7);
// ① 3張T1刷完才到1張T2；每次只消耗預先選定的一張，完成後停止。
resetQueue();const first=maps(1,3),second=maps(2,1);
setSlot(0,first[0],3);setSlot(1,second[0],1);
assert.equal(mapQueueGet().slots[0].uids.length,3);assert(first.every(x=>findInv(x.uid)));
mapQueueStart();assert(player.hunting);assert.equal(player.mapRun.t,1);assert.equal(player.mapRun.queueSlot,0);
assert(!findInv(first[0].uid));assert(findInv(first[1].uid));assert.equal(player.mapQueue.slots[0].uids.length,2);
finish();assert.equal(player.mapRun.t,1);assert.equal(player.mapQueue.slots[0].done,1);
finish();assert.equal(player.mapRun.t,1);assert.equal(player.mapQueue.slots[0].done,2);
finish();assert.equal(player.mapRun.t,2);assert.equal(player.mapQueue.index,1);assert.equal(player.mapQueue.slots[0].done,3);
finish();assert.equal(player.mapQueue.state,'done');assert.equal(player.mapQueue.slots[1].done,1);assert(!player.hunting);
const after=player.inv.length;mapQueueTick();mapQueueStart();assert.equal(player.inv.length,after);
// ② 暫停保留剩怪與首領HP，繼續不再扣卷；取消保留目前地圖與未用卷。
resetQueue();const pauseMaps=maps(1,3);setSlot(0,pauseMaps[0],3);mapQueueStart();
player.mapRun.left=37;player.mapRun.bossHp=1234;const before=player.inv.filter(x=>ITEMS[x.id].cat==='map').length;
mapQueuePause();assert.equal(player.mapQueue.state,'paused');assert(!player.hunting);mapQueueTick();assert.equal(player.mapRun.left,37);
mapQueueStart();assert(player.hunting);assert.equal(player.mapRun.bossHp,1234);assert.equal(player.inv.filter(x=>ITEMS[x.id].cat==='map').length,before);
mapQueueCancel();pending();assert.equal(player.mapQueue,null);assert(!player.hunting);assert.equal(player.mapRun.left,37);assert.equal(player.mapRun.queueSlot,undefined);
assert.equal(player.inv.filter(x=>ITEMS[x.id].cat==='map').length,before);
// ③ 回卷留下傳送門並暫停；繼續穿回原圖，不消耗額外地圖。
resetQueue();const portals=maps(1,2);setSlot(0,portals[0],2);mapQueueStart();player.mapRun.left=19;
assert(useHomeScroll('測試補給'));assert(inTown());assert.equal(player.mapQueue.state,'paused');assert.equal(player.mapPortal.left,19);
mapQueueStart();assert(inMapRun());assert.equal(player.mapRun.left,19);assert.equal(player.mapPortal,null);assert(findInv(portals[1].uid));
// ④ 死亡失去當前一張，排程暫停；剩下的卷不會自動扣。
onDeath();assert(inTown());assert.equal(player.mapQueue.state,'paused');assert(!player.mapQueue.active);assert(findInv(portals[1].uid));assert.equal(player.mapQueue.slots[0].failed,1);
mapQueueTick();assert.equal(player.mapRun,null);mapQueueStart();assert(inMapRun());assert(!findInv(portals[1].uid));
// ⑤ 數量驗證、最多5種、不重複、排列與清空。
resetQueue();const kinds=[];for(let i=1;i<=6;i++)kinds.push(maps(i,2));
for(const n of [0,-1,1.5,3,NaN,Infinity]) {setSlot(0,kinds[0][0],n);assert.equal(mapQueueGet().slots.length,0);}
for(let i=0;i<5;i++)setSlot(i,kinds[i][0],2);
setSlot(5,kinds[5][0],1);assert.equal(mapQueueGet().slots.length,5);
setSlot(1,kinds[0][0],1);assert.equal(player.mapQueue.slots[1].key,mapKindKey(kinds[1][0]));
mapQueueMove(0,1);assert.equal(player.mapQueue.slots[0].key,mapKindKey(kinds[1][0]));mapQueueRemove(0);assert.equal(player.mapQueue.slots[0],null);
assert(renderMapQueue().includes('地圖 5'));assert(PC_SLOTS.some(x=>x.tab==='mapQueue'));assert(DRAWERS.right.some(x=>x[0]==='mapQueue'));
// ⑥ 選定的卷被賣掉／改造或移到倉庫，就暫停而不偷用新掉落的同種卷。
resetQueue();const missing=maps(1,1);setSlot(0,missing[0],1);removeInst(missing[0].uid);const replacement=maps(1,1)[0];
mapQueueStart();assert.equal(player.mapQueue.state,'paused');assert(findInv(replacement.uid));assert.equal(player.mapRun,null);
resetQueue();const changed=maps(1,1);setSlot(0,changed[0],1);setMapQuality(changed[0],'magic',['tough']);mapQueueStart();assert.equal(player.mapQueue.state,'paused');assert(findInv(changed[0].uid));
// ⑦ 普通手動開圖不得插入執行中排程；開始前有異界／傳送門也不能覆蓋。
resetQueue();const manual=maps(1,2),foreign=maps(2,1)[0];setSlot(0,manual[0],2);openMap(foreign.uid);
mapQueueStart();assert.equal(player.mapQueue.state,'idle');assert.equal(player.mapRun.t,2);
moveToTown(town);mapQueueStart();const extra=maps(3,1)[0];openMap(extra.uid);assert(findInv(extra.uid));assert.equal(player.mapRun.t,1);
// ⑧ 補給或連線未就緒時，不扣下一張。
finish(); // 第二張T1已開始
player.inv=player.inv.filter(x=>!ITEMS[x.id].heal);finish();assert.equal(player.mapQueue.state,'done');
resetQueue();const supply=maps(1,2);setSlot(0,supply[0],2);mapQueueStart();player.inv=player.inv.filter(x=>!ITEMS[x.id].heal);finish();
assert.equal(player.mapQueue.state,'paused');assert(findInv(supply[1].uid));assert.equal(player.mapRun,null);
resetQueue();const offline=maps(1,1);setSlot(0,offline[0],1);lootMode='blocked';mapQueueStart();assert(findInv(offline[0].uid));assert.equal(player.mapQueue.state,'idle');lootMode='legacy';
// ⑨ 真實加密存檔往返：排程與剩餘次數保留，讀檔暫停、不自動消耗；schema6舊檔無排程。
resetQueue();const reload=maps(1,3);setSlot(0,reload[0],3);mapQueueStart();player.mapRun.left=42;saveGame();
player=guardWrap(migrateSave(saveParse(saved)));assert.equal(player.mapQueue.state,'paused');assert(!player.hunting);assert.equal(player.mapQueue.slots[0].uids.length,2);assert.equal(player.mapRun.left,42);
mapQueueStart();assert(player.hunting);assert.equal(player.mapQueue.slots[0].uids.length,2);assert.equal(player.mapRun.left,42);
const legacy=JSON.parse(JSON.stringify(player));delete legacy.mapQueue;assert.equal(migrateSave({schema:6,player:legacy}).mapQueue,null);
// ⑩ 模擬模式不執行下一張，也不更動排程計數；異常存檔去掉重複uid／第6格。
const raw=JSON.parse(JSON.stringify(player));raw.mapQueue.slots.push(...Array(5).fill(raw.mapQueue.slots[0]));mapQueueNormalize(raw);assert.equal(raw.mapQueue.slots.length,5);
const ids=raw.mapQueue.slots.flatMap(s=>s?s.uids:[]);assert.equal(new Set(ids).size,ids.length);
SIM_MODE=true;const snap=JSON.stringify(player.mapQueue);mapQueueTick();mapQueueCompleted(player.mapRun);assert.equal(JSON.stringify(player.mapQueue),snap);SIM_MODE=false;

// ⑪ 同一幀通關後換到共用大地圖的另一區，重建場景，不被舊位置拉回前區。
resetQueue();const sceneFirst=maps(1,1),sceneNext=maps(2,1);setSlot(0,sceneFirst[0],1);setSlot(1,sceneNext[0],1);
mapQueueStart();buildScene();sceneUpdate(16);assert(inMapRun());
finish();assert.equal(scene,null);assert.equal(player.mapRun.t,2);buildScene();sceneUpdate(16);assert(inMapRun());assert.equal(player.loc.id,player.mapRun.zone);
// ⑫ 骷髏停止掛機會暫停排程；最後一張死亡後可結束，不會卡在繼續。
stopHunt();assert.equal(player.mapQueue.state,'paused');mapQueueStart();onDeath();assert.equal(player.mapQueue.state,'paused');
mapQueueStart();assert.equal(player.mapQueue.state,'done');

// ⑬ 五個不同地圖都能依序完成，第六種不會排入。
resetQueue();for(let i=0;i<5;i++){const xs=maps(i+1,1);setSlot(i,xs[0],1);}mapQueueStart();
for(let i=0;i<5;i++){assert.equal(player.mapRun.t,i+1);finish();}
assert.equal(player.mapQueue.state,'done');assert(player.mapQueue.slots.every(s=>s.done===1));
console.log('PASS：3+1順序、5格數量與排序、暫停／繼續／取消、死亡與回卷、缺卷／改造／補給／連線、手動開圖隔離、加密存檔遷移與讀回暫停、模擬不刷下一張。');
`,ctx);
