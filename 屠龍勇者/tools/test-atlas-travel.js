// 世界地圖傳送：隔離角色、存檔與網路。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const ctx = vm.createContext({ console, assert, Image: function(){}, setTimeout:()=>0, clearTimeout(){}, setInterval:()=>0, clearInterval(){},
    localStorage:{getItem:()=>null,setItem(){throw Error('不准寫存檔');},removeItem(){throw Error('不准刪存檔');}},
    document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}}, window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准連線');} });
for (const [,file] of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
vm.runInContext(`
SIM_MODE=true; createPlayer('地圖傳送測試','knight',CLASSES.knight.base);
let pending=null, message='', toast='';
atlasSelect=()=>{}; closeWorldAtlas=()=>{}; saveGame=()=>{}; renderTabs=()=>{}; refreshUI=()=>{};
showToast=s=>{toast=s;}; gameConfirm=(title,msg,yes)=>{message=msg;pending=yes;};
function resetAtlasTest(){
 player.loc={type:'zone',id:'island'}; player.hp=100; player.lv=99; player.gold=100000;
 player.dragons={}; for(const z of ZONES)if(z.boss)player.dragons[z.boss]=1;
 player.dragonCd={};player.mapRun=null;player.hunting=false;hunt=null;walkHome=null;
 pending=null;toast='';buildScene();
}
for(let i=0;i<ATLAS_POINTS.length;i++){
 resetAtlasTest(); const p=ATLAS_POINTS[i];
 if(p.id==='island'){player.loc={type:'town',id:'talking'};buildScene();}
 const old=JSON.stringify(player.loc), gold=player.gold, fee=atlasTravelFee(p);
 atlasTravel(i);assert(pending,'沒有確認 '+p.id);assert.equal(player.gold,gold);assert.equal(JSON.stringify(player.loc),old);
 pending();assert.equal(player.gold,gold-fee);assert.equal(player.loc.id,p.id);assert.equal(player.loc.type,p.kind);
 assert.equal(scene,null);buildScene();assert.equal(scene.grid[scene.pl.y][scene.pl.x],0,'出生點 '+p.id);
 if(p.id==='tower')assert.equal(player.loc.floor,1);
 if(p.kind==='zone'&&ZONE_BY_ID[p.id].bg==='wild')assert.equal(bigRegionAt(scene.bg.regions,scene.pl.x,scene.pl.y).zone,p.id,'共用大地圖未移動 '+p.id);
}
const destination=ATLAS_POINTS.findIndex(p=>p.id==='venomNest');
resetAtlasTest();player.gold=0;atlasTravel(destination);assert.equal(pending,null);assert.match(toast,/金幣不足/);
resetAtlasTest();atlasTravel(destination);player.gold=0;pending();assert.equal(player.loc.id,'island');assert.equal(player.gold,0);
resetAtlasTest();atlasTravel(destination);player.loc={type:'town',id:'talking'};pending();assert.equal(player.gold,100000);assert.equal(player.loc.id,'talking');
resetAtlasTest();atlasTravel(destination);player.hp=0;pending();assert.equal(player.loc.id,'island');assert.equal(player.gold,100000);
resetAtlasTest();player.mapRun={name:'測試異界'};atlasTravel(destination);assert.match(message,/關閉目前異界/);assert(player.mapRun);pending();assert.equal(player.mapRun,null);
resetAtlasTest();atlasTravel(destination);assert.equal(player.loc.id,'island');assert.equal(player.gold,100000); // 取消：不執行確認回呼
const dragonIndex=ATLAS_POINTS.findIndex(p=>p.id==='lairValakas'), dragon=ZONE_BY_ID.lairValakas;
resetAtlasTest();player.lv=1;atlasTravel(dragonIndex);assert.equal(pending,null);assert.match(toast,/需要 Lv/);
resetAtlasTest();player.dragons={};atlasTravel(dragonIndex);assert.equal(pending,null);assert.match(toast,/需先討伐/);
resetAtlasTest();player.dragonCd[dragon.boss]=Date.now()+100000;atlasTravel(dragonIndex);assert.equal(pending,null);assert.match(toast,/封閉中/);
resetAtlasTest();atlasTravel(dragonIndex);player.dragonCd[dragon.boss]=Date.now()+100000;pending();assert.equal(player.loc.id,'island');assert.equal(player.gold,100000);
resetAtlasTest();const here=ATLAS_POINTS.findIndex(p=>p.id==='island');atlasTravel(here);assert.equal(pending,null);assert.equal(player.gold,100000);
resetAtlasTest();walkHome={};atlasTravel(destination);assert.equal(pending,null);
console.log('PASS：'+ATLAS_POINTS.length+'地標含4村莊、共用地圖正確落點、傳送費、塔1F、取消／缺錢／位置變更／死亡／異界關閉／龍穴等級前置冷卻重查。');
`,ctx);
