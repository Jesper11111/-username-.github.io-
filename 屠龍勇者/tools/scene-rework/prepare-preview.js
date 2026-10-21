// 由正式頁面組裝隔離美術驗收頁，不載入 main／PWA、不存檔、不連雲端。
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<head>','<head><base href="../../">');
html=html.replace(/<script async src="https:[\s\S]*?<\/script>/g,'').replace(/<script>window.dataLayer[\s\S]*?<\/script>/g,'');
html=html.replace(/<script src="data\/(main|pwa)\.js[^\n]+\n/g,'');
html=html.replace('<base href="../../">',`<base href="../../"><script>
const previewMemory = new Map();
Object.defineProperty(window,'localStorage',{value:{getItem:k=>previewMemory.get(k)||null,setItem:(k,v)=>previewMemory.set(k,String(v)),removeItem:k=>previewMemory.delete(k),key:i=>[...previewMemory.keys()][i],get length(){return previewMemory.size}}});
const previewFetch = window.fetch.bind(window);window.fetch=(url,opt)=>{const u=new URL(typeof url==='string'?url:url.url,location.href);if(u.origin!==location.origin)throw Error('隔離預覽禁止連外');return previewFetch(url,opt);};
window.addEventListener('error',e=>{const r=document.getElementById('preview-error');if(r)r.textContent=e.message;});
</script>`);
html=html.replace('</body>',`<style>
#preview-tools{position:fixed;top:0;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:5px;z-index:8;background:#111b22e8;border:1px solid #8b7652;border-radius:0 0 5px 5px;padding:3px 7px;max-width:95vw;font:11px sans-serif;color:#d9cca9}
#preview-tools select,#preview-tools button{font-size:11px;padding:3px 5px}#preview-error{color:#ff9877}
</style><div id="preview-tools"><span>隔離美術預覽</span><select id="preview-location" aria-label="預覽場景"></select><select id="preview-mode" aria-label="預覽尺寸"><option value="pc">PC</option><option value="phone">手機</option></select><button id="preview-atlas">世界總覽</button><button id="preview-live">走動測試</button><span id="preview-error"></span></div>
<script>
SIM_MODE=true;createPlayer('原創場景預覽','knight',CLASSES.knight.base);player.lv=85;player.baseHp=1200;player.baseMp=600;player.hp=calcStats().maxHp;player.mp=calcStats().maxMp;player.gold=250000;
const previewParams=new URLSearchParams(location.search);displayMode=previewParams.get('mode')==='phone'?'phone':'pc';
const previewOptions=Object.keys(TOWNS).map(id=>['town',id,TOWNS[id].name]).concat(ZONES.map(z=>['zone',z.id,z.name]));
const previewLoc=$('preview-location');previewLoc.innerHTML=previewOptions.map(([type,id,name])=>'<option value="'+type+':'+id+'">'+name+'</option>').join('');
const previewInitial=previewParams.get('zone')||'tower';previewLoc.value=(TOWNS[previewInitial]?'town:':'zone:')+previewInitial;
$('preview-mode').value=displayMode;
let previewDynamic=false;
function previewSetup(){
 cancelAnimationFrame(sceneRaf);sceneRaf=0;previewDynamic=false;closeWorldAtlas();
 const [type,id]=previewLoc.value.split(':');player.loc={type,id,floor:id==='tower'?100:undefined};player.hunting=false;hunt=null;scene=null;openTabs=[];currentTab='hunt';
 showScreen('game');layoutFrame();renderFrameNav();renderPanel();cancelAnimationFrame(sceneRaf);sceneRaf=0;buildScene();
 if(type==='zone'){
  const z=currentZone(),names=id==='tower'?['冥法軍王','冥法親衛','冥法巫師','冥法親衛','冥法巫師']:null;
  const mids=z.type==='dragon'?[z.boss]:z.mons||['skeleton'];
  const spots=[[0,-2],[-3,-1],[3,-1],[-2,2],[2,2]];
  scene.mons=(z.type==='dragon'?spots.slice(0,1):spots).map(([dx,dy],i)=>{const mid=names?'tower100':mids[i%mids.length],name=names?names[i%names.length]:MONSTERS[mid].name;
   const inst={id:mid,name,lv:names?makeTowerMonster(player.loc.floor,i===0).lv:z.lv[0],hp:70,maxHp:100,boss:(!!names&&i===0)||z.type==='dragon',dragon:z.type==='dragon'};
   return {x:scene.pl.x+dx,rx:scene.pl.x+dx,y:scene.pl.y+dy,ry:scene.pl.y+dy,mid,name,icon:MONSTERS[mid]?MONSTERS[mid].icon:'',face:'down',atk:0,inst};});scene.engaged=scene.mons[0];
 }
 SIM_MODE=false;renderStatus();SIM_MODE=true;previewPaint();
}
function previewPaint(){
 if(previewDynamic)return;const cv=$('scene-canvas');if(!cv||!scene)return;
 const dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight,z=Math.max(clamp(W/(TILE*28),1,1.3),H/(scene.mh*TILE),W/(scene.mw*TILE));
 cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);scene.zoom=z;const cr=cv.getBoundingClientRect();scene.visX=[Math.max(0,-cr.left)/z,Math.min(W,window.innerWidth-cr.left)/z];
 const ctx=cv.getContext('2d');ctx.setTransform(dpr*z,0,0,dpr*z,0,0);sceneDraw(ctx,W/z,H/z);
}
previewLoc.addEventListener('change',previewSetup);$('preview-mode').addEventListener('change',()=>{displayMode=$('preview-mode').value;previewSetup();});
$('preview-atlas').addEventListener('click',toggleWorldAtlas);$('preview-live').addEventListener('click',()=>{previewDynamic=true;scene.mons=[];startScene();});
previewSetup();if(previewParams.get('atlas')==='1')openWorldAtlas();setInterval(()=>{gameNow+=100;previewPaint();},100);window.addEventListener('resize',()=>{layoutFrame();previewPaint();});
</script></body>`);
fs.writeFileSync(path.join(__dirname,'preview.html'),html);console.log('Prepared isolated preview: tools/scene-rework/preview.html');
