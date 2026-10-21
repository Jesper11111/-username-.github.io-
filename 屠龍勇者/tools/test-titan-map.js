// 泰坦墓穴大地圖整合，隔離角色／存檔／雲端。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),walk=JSON.parse(fs.readFileSync(path.join(__dirname,'bigmap/walk.json'),'utf8'));
const ctx=vm.createContext({console,assert,walk,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('不准寫存檔');},removeItem(){throw Error('不准刪存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(file==='data/main.js'||file==='data/pwa.js')continue;vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('隔離墓穴測試','knight',CLASSES.knight.base);player.lv=80;player.loc={type:'zone',id:'giantTomb'};
assert.equal(sceneKey(),'zone:wild');buildScene();
assert.equal(scene.mw,188);assert.equal(scene.mh,149);assert.equal(scene.pl.x,164);assert.equal(scene.pl.y,89);assert.equal(scene.grid[89][164],0);
assert.equal(currentZone().fee,4000);assert.deepEqual(Array.from(currentZone().mons),['giantSkeleton','tombGuardian','necromancer','boneDragon']);
for(const k of ['walk','block'])assert.deepEqual(Array.from(SCENE_BGS.wild[k],r=>Array.from(r).join(',')).sort(),Array.from(walk[k],r=>r.join(',')).sort());
const seen=new Set(['46,52']),q=[[46,52]];
for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a>=0&&a<scene.mw&&b>=0&&b<scene.mh&&scene.grid[b][a]===0&&!seen.has(k)){seen.add(k);q.push([a,b]);}}}
let total=0;for(let y=65;y<=111;y++)for(let x=141;x<=187;x++)if(scene.grid[y][x]===0){total++;assert(seen.has(x+','+y),'墓穴不可走到：'+x+','+y);assert.equal(bigRegionAt(scene.bg.regions,x,y).zone,'giantTomb');}
assert(total>800);assert(findPath(140,88,164,89,true).length>0);
for(let i=0;i<200;i++){const m=spawnMapMon(true);if(m){assert.equal(bigRegionAt(scene.bg.regions,m.x,m.y).zone,'giantTomb');assert(currentZone().mons.includes(m.mid));}scene.mons=[];}
assert(scene.gates.some(g=>g.from==='giantTomb'&&g.to==='gludio2'));
assert(scene.gates.some(g=>g.from==='gludio2'&&g.to==='giantTomb'));
sceneEnterZone('gludio2');assert.equal(currentZone().id,'gludio2');sceneEnterZone('giantTomb');assert.equal(currentZone().id,'giantTomb');
console.log('PASS：泰坦墓穴 '+total+' 格皆連通、出生點、世界分區、深層入口、200 次怪物區域取樣、原怪物／費用、walk.json 同步。');
`,ctx);
const occ=fs.readFileSync(path.join(root,'images/maps/wild-titan-occ.png'));assert.equal(occ.readUInt32BE(16),1504);assert.equal(occ.readUInt32BE(20),1192);
