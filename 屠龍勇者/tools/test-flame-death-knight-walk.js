// 走路修正：真實sceneUpdate與sceneDraw，隔離存檔／網路。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const setup=fs.readFileSync(path.join(__dirname,'test-flame-death-knight-morph.js'),'utf8').split('vm.runInContext(String.raw`')[0];
const run=String.raw`
SIM_MODE=true;createPlayer('步態回歸','knight',CLASSES.knight.base);player.loc={type:'zone',id:'tower',floor:10};buildScene();addItem('polyScroll',1);usePotion('polyScroll','m16');
scene.bg=null;scene.gates=null;scene.mons=[];scene.npcs=[];scene.props=[];scene.spawnCd=1e9;scene.mw=scene.mh=50;scene.shade=Array.from({length:50},(_,y)=>Array.from({length:50},(_,x)=>(x+y)%2));scene.grid=Array.from({length:50},(_,y)=>Array.from({length:50},(_,x)=>x===0||y===0||x===49||y===49?1:0));gameLog.length=0;scene.lastPlayerHp=player.hp;
const sp=MORPHS.flameDeathKnight,newWalk=sp.walk,seen=new Set(),draws=[];
assert.equal(newWalk.ms*newWalk.frames.down,520);assert.equal(newWalk.frames.down,8);
spriteCache[newWalk.src]={complete:true,naturalWidth:3072,src:newWalk.src};
const painter=new Proxy({measureText:()=>({width:20}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage:(im,...args)=>{if(im===spriteCache[newWalk.src]){seen.add(args[0]/384);draws.push(args);}}},{get:(o,k)=>k in o?o[k]:()=>{}});
function reset(dir){const p=scene.pl;p.x=p.y=p.rx=p.ry=25;p.path=[];p.anim=null;p.dir=dir;p.lunge=null;scene.walkClock=0;scene.manualUntil=gameNow+1e9;}
for(const[dir,dx,dy]of[['right',1,0],['left',-1,0],['down',0,1],['up',0,-1]]){
 reset(dir);seen.clear();draws.length=0;scene.pl.path=Array.from({length:18},(_,i)=>[25+dx*(i+1),25+dy*(i+1)]);
 for(let i=0;i<80;i++){gameNow+=16;sceneUpdate(16);sceneDraw(painter,640,300);}
 assert.deepEqual([...seen].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7],dir+' 實際renderer必須播完整八格');
 assert(Math.hypot(scene.pl.rx-25,scene.pl.ry-25)>6,dir+' 不可只有原地動畫');
 const expectedRow={down:0,right:1,left:1,up:2}[dir];assert(draws.every(a=>a[1]===expectedRow*320),dir+' 方向列錯誤');
 scene.pl.path=[];const clock=scene.walkClock;sceneUpdate(100);assert.equal(scene.walkClock,clock,'停止後走路時鐘不可繼續');
 seen.clear();sceneDraw(painter,640,300);assert.deepEqual([...seen],[4],'停止使用固定站姿');
}
function travel(walk){sp.walk=walk;reset('right');scene.pl.path=Array.from({length:18},(_,i)=>[26+i,25]);for(let i=0;i<80;i++){gameNow+=16;sceneUpdate(16);}return scene.pl.rx;}
const newer=travel(newWalk),older=travel({...newWalk,frames:{down:4,right:4,up:4},ms:130});assert.equal(newer,older,'換步態不得改變實際移動速度');sp.walk=newWalk;
assert.equal(sp.attack.src,'images/sprites/morph/flame-death-knight-v1/attack-v2.png');assert.equal(sp.attack.ms*sp.attack.frames.down,480);
console.log('PASS：真實renderer四向八格、實際地面移動／停止、左右鏡像列與移動速度不變；攻擊新圖不影響移動。');
`;
vm.runInNewContext(setup+'\nvm.runInContext('+JSON.stringify(run)+',ctx);',{require,__dirname,console});
const root=path.resolve(__dirname,'..'),folder=path.join(root,'images/sprites/morph/flame-death-knight-v1');
const meta=JSON.parse(fs.readFileSync(path.join(folder,'walk-v2-manifest.json'),'utf8')),png=fs.readFileSync(path.join(folder,'walk-v2.png'));
assert.equal(png.readUInt32BE(16),3072);assert.equal(png.readUInt32BE(20),960);assert.equal(png[25],6);assert.equal(meta.cells.length,24);
assert(fs.existsSync(path.join(folder,'walk.png')));assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes(meta.src));
console.log('PASS：新3072×960 RGBA圖集、24格分鏡與SW；舊walk.png保留。');
