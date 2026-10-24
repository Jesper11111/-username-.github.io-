// 隔離真實遊戲程式；不讀寫存檔、不連線。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,assert,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('禁止寫存檔');},removeItem(){throw Error('禁止刪存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('禁止連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(!['data/main.js','data/pwa.js'].includes(file))vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
vm.runInContext(String.raw`
SIM_MODE=true;sfx=()=>{};chance=()=>true;
createPlayer('中毒測試','knight',CLASSES.knight.base);player.lv=70;player.hp=10000;player.baseHp=10000;
player.inv=[];player.equip={};const w=addItem('longSword');equipItem(w.uid,true);w.bossEnchant='spiderVenom';
function fight(boss=false,mr=0){
 gameNow=10000;player.cds={};player.hp=10000;
 const m={id:'test',name:'測試怪',hp:10000,maxHp:10000,ac:0,mr,boss,stunUntil:0};
 hunt={state:'fight',mon:m,mobs:[m]};return m;
}
for(const boss of [false,true])for(const mr of [0,50]){
 const m=fight(boss,mr),st=calcStats(),mp=player.mp,damage=Math.max(1,Math.round(bossEnchantBase(st)*.3*(1-mr/200)));
 bossEnchantOnHit(m,st);assert.equal(m.hp,10000);assert.equal(player.cds._bossEnchant,18000);
 bossEnchantOnHit(m,st);assert.equal(hunt.bossEnchantRuntime.jobs.length,1);
 gameNow+=999;bossEnchantTick(st);assert.equal(m.hp,10000);
 gameNow++;bossEnchantTick(st);assert.equal(m.hp,10000-damage);
 for(let i=2;i<=6;i++){gameNow+=1000;bossEnchantTick(st);assert.equal(m.hp,10000-damage*i);}
 assert.equal(hunt.bossEnchantRuntime.jobs.length,0);gameNow+=1000;bossEnchantTick(st);assert.equal(m.hp,10000-damage*6);assert.equal(player.mp,mp);
}
// 重新施加只有一層，第一跳重新起算；換武器後事件消失，不轉移到下一隻怪。
let m=fight();bossEnchantOnHit(m,calcStats());gameNow+=500;player.cds._bossEnchant=0;bossEnchantOnHit(m,calcStats());
assert.equal(hunt.bossEnchantRuntime.jobs.length,1);assert.equal(hunt.bossEnchantRuntime.jobs[0].at,11500);
gameNow=11000;bossEnchantTick(calcStats());assert.equal(m.hp,10000);
unequipSlot('weapon');gameNow=20000;bossEnchantTick(calcStats());assert.equal(m.hp,10000);assert.equal(hunt.bossEnchantRuntime,null);equipItem(w.uid,true);
m=fight();bossEnchantOnHit(m,calcStats());m.hp=0;gameNow+=1000;bossEnchantTick(calcStats());assert.equal(hunt.bossEnchantRuntime.jobs.length,0);
m=fight();bossEnchantOnHit(m,calcStats());player.hp=0;gameNow+=1000;bossEnchantTick(calcStats());assert.equal(m.hp,10000);
// 實際中毒綠霧跟隨存活目標；結束或換武器時不再畫。
m=fight();bossEnchantOnHit(m,calcStats());SIM_MODE=false;worldVfxQuality='medium';
scene={pl:{rx:0,ry:0},mons:[{inst:m,x:1,y:2,rx:1,ry:2}]};let painted=[];worldVfxPaint=(c,id,x,y)=>painted.push({id,x,y});
drawWorldVfx({},0,0,'front');assert(painted.some(p=>p.id==='status-0'));
scene.mons[0].rx=5;painted=[];drawWorldVfx({},0,0,'front');assert.equal(painted.find(p=>p.id==='status-0').x,5*TILE+TILE/2);
gameNow+=6000;bossEnchantTick(calcStats());painted=[];drawWorldVfx({},0,0,'front');assert(!painted.some(p=>p.id==='status-0'));
SIM_MODE=true;
const z=ZONE_BY_ID.venomNest;assert.equal(z.rare.id,'venomQueen');assert.equal(z.rare.p,.008);assert.equal(z.noMap,true);
assert.equal(MONSTERS.venomQueen.lv,52);assert.equal(MONSTERS.venomQueen.boss,true);
assert.equal(MONSTERS.venomQueen.drops.find(d=>d.id==='spiderVenom').p,.001);
assert.equal(MONSTERS.venomQueen.drops.find(d=>d.id==='spiderVenom').n.join(','),'1,1');
assert.equal(mapZones().map(x=>x.id).join(','),'island,islandDungeon,elvenForest,gludio1,sleepingCave,gludio2,pirateIsle,ivory,dragonValley,pyramid,orenSnow,fireCave,forgottenIsle,giantTomb');
assert.equal(SAVE_SCHEMA,7);assert.equal(ITEMS.soul_spiderVenom.soulEnchant,'spiderVenom');assert.equal(BOSS_ENCHANTS.spiderVenom.cost,1000000);
console.log('PASS：中毒六跳／MR／BOSS／冷卻／刷新不疊層／換武器與死亡／跟隨綠霧／蛛后掉落／異界排序與schema不變。');
// 世界地圖只安排步行，洞穴入口確認後才扣費進入，且必須仍站在入口附近。
{
 const entry=keeperNpc('venomNest'),point=ATLAS_POINTS.find(p=>p.id==='venomNest');
 assert.equal(entry.zone,'elvenForest');assert.equal(entry.entrance,true);assert.equal(point.entrance,true);
 assert.equal(entry.x,164);assert.equal(entry.y,125);assert.equal(point.target.join(','),entry.front.join(','));
 player.loc={type:'zone',id:'island'};buildScene();
 assert.equal(scene.grid[entry.y][entry.x],3);assert.equal(scene.grid[entry.front[1]][entry.front[0]],0);
 assert(findPath(scene.pl.x,scene.pl.y,...entry.front,true).length>0);
 const originalLoc=JSON.stringify(player.loc),gold=player.gold;
 atlasWalkTo(ATLAS_POINTS.indexOf(point));assert(scene.pl.path.length>0);assert.equal(JSON.stringify(player.loc),originalLoc);assert.equal(player.gold,gold);
 let confirmAction=null;gameConfirm=(title,msg,action)=>{assert(msg.includes('600'));confirmAction=action;};showToast=()=>{};sfx=()=>{};refreshUI=()=>{};renderTabs=()=>{};startHunt=()=>{};
 openVenomNestEntrance();assert.equal(confirmAction,null);
 scene.pl.x=entry.front[0];scene.pl.y=entry.front[1];player.loc={type:'zone',id:'elvenForest'};
 openVenomNestEntrance();assert(confirmAction);assert.equal(player.gold,gold); // 未確認／取消不扣費
 scene.pl.x=20;confirmAction();assert.equal(player.loc.id,'elvenForest');assert.equal(player.gold,gold);
 scene.pl.x=entry.front[0];player.gold=0;openVenomNestEntrance();confirmAction();assert.equal(player.loc.id,'elvenForest');assert.equal(player.gold,0);
 player.gold=1000;openVenomNestEntrance();confirmAction();assert.equal(player.loc.id,'venomNest');assert.equal(player.gold,400);
 buildScene();assert.equal(scene.grid[scene.pl.y][scene.pl.x],0);
 console.log('PASS：南境林道入口／全世界可達路徑／地標只步行不扣費／遠距阻擋／取消／移開／缺錢／確認扣600進獨立巢穴。');
}
`,ctx);
