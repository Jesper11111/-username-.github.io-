// 真實受傷／MISS 事件到變身攻擊動畫；隔離存檔及網路。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,assert,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('不准寫存檔');},removeItem(){throw Error('不准刪存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(file==='data/main.js'||file==='data/pwa.js')continue;
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
vm.runInContext(String.raw`
SIM_MODE=true;createPlayer('紅變動作測試','elf',CLASSES.elf.base);player.lv=55;
player.buffs.morph={id:'polyScroll',form:'m02',until:gameNow+10000};
player.loc={type:'zone',id:'island'};buildScene();
assert.equal(playerSprite(),MORPHS.moonRanger);
assert.equal(playerSprite().attack.src,'images/sprites/morph/moon-ranger-v1/attack-v2.png');
const m={x:scene.pl.x+1,y:scene.pl.y,rx:scene.pl.x+1,ry:scene.pl.y,mid:'skeleton',lastHp:100,inst:{hp:90,maxHp:100}};
scene.mons=[m];scene.engaged=m;gameLog.length=0;
for(const dir of ['down','right','up','left']){
 scene.pl.dir=dir;scene.pl.anim=null;m.lastHp=100;m.inst.hp=90;scene.lastPlayerHp=player.hp;
 sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.dur,560);
 scene.pl.anim.t=210;playAnim('hit');assert.equal(scene.pl.anim.name,'attack');assert.equal(scene.pl.anim.t,210);
}
scene.pl.anim=null;m.lastHp=m.inst.hp;gameLog.push({seq:999999,cls:'miss',msg:'你的攻擊沒有命中'});scene.lastSeq=0;
sceneReadEvents();assert.equal(scene.pl.anim.name,'attack');
player.buffs.morph.until=gameNow;assert.equal(playerMorph(),null);
console.log('PASS：紅變四向命中／MISS 觸發 560ms 新攻擊，受傷不打斷，變身到期恢復職業圖。');
`,ctx);
const src='images/sprites/morph/moon-ranger-v1/attack-v2.png';
const png=fs.readFileSync(path.join(root,src));
assert.equal(png.readUInt32BE(16),1280);assert.equal(png.readUInt32BE(20),720);assert.equal(png[25],6);
assert(fs.readFileSync(path.join(root,'sw.js'),'utf8').includes(src));
const meta=JSON.parse(fs.readFileSync(path.join(root,'images/sprites/morph/moon-ranger-v1/attack-v2-manifest.json'),'utf8'));
assert.deepEqual(meta.phases,['ready','draw','release','recover']);
assert.equal(meta.cells.length,12);
console.log('PASS：1280×720 RGBA 新圖集、12 分鏡與離線預載路徑。');
