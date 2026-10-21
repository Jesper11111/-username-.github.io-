// 原創場景整合：隔離角色、網路與存檔。node tools/test-scene-art.js
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,assert,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('不准寫存檔');},removeItem(){throw Error('不准刪存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(file==='data/main.js'||file==='data/pwa.js')continue;vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('場景隔離驗證','knight',CLASSES.knight.base);player.lv=85;
assert.equal(GAME_VERSION,'20261021r');assert.equal(SAVE_SCHEMA,5);
const files=new Set(), regionIds=new Set();
for(const z of ZONES){
 player.loc={type:'zone',id:z.id,floor:z.type==='tower'?70:undefined};buildScene();
 assert(scene.bg&&scene.bg.src.startsWith(SCENE_ART_ROOT),'缺原創場景 '+z.id);files.add(scene.bg.src);
 assert.equal(scene.grid[scene.pl.y][scene.pl.x],0,'出生點不可走 '+z.id);
 if(z.bg==='wild')regionIds.add(z.id);
}
assert.equal(regionIds.size,13);
player.loc={type:'zone',id:'giantTomb'};buildScene();
assert.equal(scene.pl.x,164);assert.equal(scene.pl.y,92);
const seen=new Set(),q=[[23,92]];seen.add('23,92');
for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(scene.grid[b]&&scene.grid[b][a]===0&&!seen.has(k)){seen.add(k);q.push([a,b]);}}}
let all=0;for(let y=0;y<scene.mh;y++)for(let x=0;x<scene.mw;x++)if(scene.grid[y][x]===0){all++;assert(seen.has(x+','+y),'不連通 '+x+','+y);}
for(const r of SCENE_WORLD_TILES){assert.equal(bigRegionAt(scene.bg.regions,r.x,r.y).zone,r.zone);assert(findPath(23,92,r.x,r.y,true).length||r.x===23&&r.y===92,'遠程尋路 '+r.name);}
for(const n of scene.bg.fieldNpcs){assert.equal(scene.grid[n.y][n.x],3);assert.equal(scene.grid[n.front[1]][n.front[0]],0);assert(findPath(23,92,n.front[0],n.front[1],true).length,'入口不可到達');}
for(const id of regionIds){player.loc={type:'zone',id};buildScene();for(let i=0;i<40;i++){const m=spawnMapMon(true);if(m){assert.equal(bigRegionAt(scene.bg.regions,m.x,m.y).zone,id);assert(currentZone().mons.includes(m.mid));}scene.mons=[];}}
for(const id of Object.keys(TOWNS)){
 player.loc={type:'town',id};buildScene();files.add(scene.bg.src);const npcs=townNpcList(scene.bg);assert.equal(npcs.length,6);
 for(const n of npcs){assert(n.img&&n.act&&n.names[id]);files.add(n.img);assert.equal(scene.grid[n.y][n.x],3);assert(findPath(scene.pl.x,scene.pl.y,n.x,n.y+1,true).length,'NPC 前方不可走 '+id+n.role);}
}
for(const name of TOWER_THEMES.flat().concat(TOWER_BOSSES)){
 for(const suffix of ['','（70F）',' (70F)']){const id=sceneMonsterArt({mid:'tower70',inst:{name:name+suffix}});assert(SCENE_ART_MONSTERS[id],'塔怪缺圖 '+name+suffix);files.add(SCENE_ART_MONSTERS[id].src);}
}
assert.equal(Object.keys(SCENE_ART_MONSTERS).length,21);
assert.equal(ATLAS_POINTS.length,23);assert.equal(new Set(ATLAS_POINTS.map(p=>p.kind+':'+p.id)).size,23);
for(const p of ATLAS_POINTS)assert(atlasPointName(p)!==p.id,'地圖地名未解析 '+p.id);
// 地圖只給步行路線，不能改所在地、扣款或繞過副本入口。
player.loc={type:'town',id:'talking'};buildScene();let before=JSON.stringify(player.loc),gold=player.gold;
for(let i=0;i<ATLAS_POINTS.length;i++)atlasWalkTo(i);
assert.equal(JSON.stringify(player.loc),before);assert.equal(player.gold,gold);assert.equal(scene.pl.path.length,0);
player.loc={type:'zone',id:'island'};buildScene();before=JSON.stringify(player.loc);
atlasWalkTo(ATLAS_POINTS.findIndex(p=>p.id==='giantTomb'));assert(scene.pl.path.length>0);assert.equal(JSON.stringify(player.loc),before);assert.equal(player.gold,gold);
this.artFiles=Array.from(files);console.log('PASS：19 狩獵區、4 城鎮／24 NPC、'+all+' 格全連通、16 區遠程尋路、13 區出生／生怪、兩塔入口、30 塔怪名稱／21 圖集、23 地標、地圖無免費傳送。');
`,ctx);
for(const file of ctx.artFiles)assert(fs.existsSync(path.join(root,file)),'圖片不存在 '+file);
const plan=JSON.parse(fs.readFileSync(path.join(__dirname,'scene-rework/plan.json'),'utf8'));
for(const a of plan.assets){assert(fs.existsSync(path.join(__dirname,'scene-rework/src',a.id+'.png')),'缺原稿 '+a.id);assert(fs.existsSync(path.join(__dirname,'scene-rework/sources',a.id+'.json')),'缺提示詞 '+a.id);}
for(const file of ctx.artFiles.filter(s=>s.includes('/monsters/rework/'))){const b=fs.readFileSync(path.join(root,file));assert.equal(b.readUInt32BE(16),768);assert.equal(b.readUInt32BE(20),672);assert.equal(b[25],6,'必須 RGBA');}
assert(fs.existsSync(path.join(root,'images/maps/rework/world-atlas.jpg')));assert(fs.existsSync(path.join(root,'images/maps/rework/world-mini.jpg')));
console.log('PASS：52 原創素材／提示詞保留，所有場景與 NPC／怪物引用有效，21 圖集尺寸及 RGBA 正確。');
