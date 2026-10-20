'use strict';
(() => {
const $ = s => document.querySelector(s);
const types=window.FAXIANG_CONFIG;
let playerGender='female';
function variant(){return window.FAXIANG_VARIANTS[type][playerGender];}
const phaseDefs = [['gather',800,'凝聚靈氣'],['manifest',1200,'法相顯現'],['attack',800,'同步攻擊'],['dissolve',1000,'化光消散']];
const arena=$('#arena'),hero=$('#hero'),apparition=$('#apparition'),deity=$('#deity');
const canvases=[$('#ground'),$('#foreground')],ctx=canvases.map(c=>c.getContext('2d'));
const images={}, urls=new Set();
let width=1000,height=580,dpr=1,last=performance.now(),total=0,x=.5,y=.86,dir='front',type='goddess',phase='idle',elapsed=0,frameId=0,hold=0,action='idle',actionTime=0,paused=false;
let scale=3.4,alpha=.85,speed=1,automatic=true,alive=true,dissolveFrom=1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function message(t){$('#message').textContent=t;}
function enter(next){phase=next;elapsed=0;document.querySelectorAll('[data-phase]').forEach(e=>e.classList.toggle('active',e.dataset.phase===next));$('#phase').textContent=phaseDefs.find(p=>p[0]===next)?.[2]??(next==='hold'?'法相駐留 · 可揮劍攻擊':'待機 · 靈息未起'); if(next==='idle'){$('#summon').disabled=false;action='idle';}else $('#summon').disabled=true;}
function summon(){if(!assetsReady||!deity.complete||!deity.naturalWidth){message('動畫素材載入中，請稍候。');return false;}if(phase!=='idle')return false;hold=0;total=0;dissolveFrom=1;action='cast';actionTime=0;enter('gather');message('演武召喚：不消耗資源、不套用戰鬥加成。');return true;}
function attack(){if(phase==='idle'){action='attack';actionTime=0;message('單獨預覽角色攻擊，不影響戰鬥數值。');return true;}if(!['hold','manifest','attack'].includes(phase)){message('請先召喚法相，待顯現後再攻擊。');return false;}if(phase==='manifest'&&elapsed<1200){message('法相尚在顯現，請稍候。');return false;}if(phase==='attack')return false;action='attack';actionTime=0;enter('attack');return true;}
function dismiss(){if(phase==='idle'||phase==='dissolve')return false;dissolveFrom=phase==='gather'?.12*clamp(elapsed/800,0,1):phase==='manifest'?.12+.88*clamp(elapsed/1200,0,1):1;enter('dissolve');action='idle';return true;}
function setType(value){if(!types[value])return;type=value;$('#type').value=value;for(const o of $('#type').options){o.textContent=window.FAXIANG_VARIANTS[o.value][playerGender].name+' · '+types[o.value].element.split(' · ')[0];}const t=types[type];const v=variant();$('#type-name').textContent=v.name;$('#type-desc').textContent=t.desc;$('#element-label').textContent=t.element;deity.src=images[type+':'+playerGender]??window.resolveFaxiangAsset(v.img);deity.classList.remove('failed');deity.style.filter=`drop-shadow(0 0 14px ${t.color}88)`;if(phase!=='idle'){enter('idle');message('已切換法相，請重新召喚。');}}
function resize(){const r=arena.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(window.devicePixelRatio||1,2);for(const c of canvases){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}for(const c of ctx)c.setTransform(dpr,0,0,dpr,0,0);}
const observer=new ResizeObserver(resize);observer.observe(arena);
function getHeroSize(){return Math.min(132,height*.235,width*.22);}
const sprite=new SpriteRenderer(hero);
const maleHero=document.createElement('img');maleHero.src=window.resolveFaxiangAsset('assets/hero-male.jpg');maleHero.alt='原遊戲男角靜態立繪';maleHero.style.cssText='width:100%;height:100%;object-fit:contain;display:none';hero.appendChild(maleHero);
let castVariant=0,assetsReady=false;
sprite.ready=Promise.all([
 sprite.load('walk','assets/walk.png',6,3,true),
 sprite.load('attack','assets/attack.png',8,3,true),
 sprite.load('cast','assets/cast.png',7,3,false)
]).then(()=>{assetsReady=true;message('角色素材已載入：三方向走路／攻擊、三組施法招式。');}).catch(()=>message('角色素材載入失敗，請重新開啟測試頁。'));
$('#cast-variant').addEventListener('change',e=>{castVariant=Number(e.target.value);actionTime=0;});
function drawHero(dt){sprite.canvas.style.display=playerGender==='female'?'block':'none';maleHero.style.display=playerGender==='male'?'block':'none';$('#player-note').textContent=playerGender==='male'?'男玩家：使用男性法相；角色暫用原遊戲靜態立繪。':'女玩家：使用女性法相與女修動畫。';actionTime+=dt;const a=phase==='gather'||phase==='manifest'?'cast':phase==='attack'?'attack':action;
 const kind=a==='idle'?'walk':a,atlas=sprite.atlases[kind];
 let frame=a==='idle'?0:Math.floor(actionTime/(a==='walk'?125:110))%(atlas?.cols??1);
 if(phase==='gather'||phase==='manifest')frame=Math.min(6,Math.floor(total/2000*7));
 if(phase==='attack')frame=Math.min(7,Math.floor(elapsed/800*8));
 if(atlas&&playerGender==='female')sprite.draw(kind,frame,dir,castVariant);
 const h=getHeroSize();hero.style.height=h+'px';hero.style.width=h*.8+'px';hero.style.left=x*100+'%';hero.style.bottom=(1-y)*100+'%';hero.style.backgroundImage='none';hero.style.transform='translateX(-50%)';hero.style.filter='drop-shadow(0 3px 4px #000)';
 hero.dataset.motion=kind;hero.dataset.frame=frame;hero.dataset.row=kind==='cast'?castVariant:{front:0,side:1,back:2}[dir];
}

function energy(){if(phase==='idle')return 0;if(phase==='gather')return .2+.8*clamp(elapsed/800,0,1);if(phase==='dissolve')return dissolveFrom*Math.max(0,1-elapsed/1000);return 1;}
function circle(c,cx,cy,rx,ry,rotation=0){c.beginPath();c.ellipse(cx,cy,rx,ry,rotation,0,Math.PI*2);c.stroke();}
function drawGround(c,e){if(e<=0)return;const px=x*width,py=y*height,h=getHeroSize(),r=h*.95;c.save();c.globalAlpha=e*.8;c.strokeStyle=types[type].color;c.shadowColor=types[type].color;c.shadowBlur=12;c.lineWidth=1.3;
 c.translate(px,py);c.scale(1,.3);c.rotate(total*.0005);circle(c,0,0,r,r);circle(c,0,0,r*.88,r*.88);circle(c,0,0,r*.66,r*.66);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;c.save();c.rotate(a);c.strokeRect(r*.75,-3,7,7);c.restore();}
 for(let i=0;i<6;i++){const a=i*Math.PI/3,b=a+Math.PI*2/3;c.beginPath();c.moveTo(Math.cos(a)*r*.65,Math.sin(a)*r*.65);c.lineTo(Math.cos(b)*r*.65,Math.sin(b)*r*.65);c.stroke();}c.restore();}
function drawFX(c,e){if(e<=0)return;const col=types[type].color,px=x*width,py=y*height,h=getHeroSize();c.save();c.strokeStyle=col;c.fillStyle=col;c.shadowColor=col;c.shadowBlur=8;
 const n=width<600?32:58;for(let i=0;i<n;i++){const age=(total*.00035+i*.618)%1,a=i*2.399,spread=(phase==='dissolve'?1.8:1);const xx=px+Math.sin(a+total*.0002)*h*(.3+age)*spread,yy=py-age*h*scale;c.globalAlpha=e*(1-age)*.8;c.beginPath();c.arc(xx,yy,1+(i%3)*.6,0,7);c.fill();}
 c.globalAlpha=e*.75;
 if(types[type].effect==='lotus'){for(let i=0;i<8;i++){let a=i*Math.PI/4+total*.0001;circle(c,px+Math.cos(a)*h*.55,py+Math.sin(a)*h*.14,h*.15,h*.045,a*.2);}}
 if(types[type].effect==='lightning'){for(let j=0;j<3;j++){c.beginPath();for(let k=0;k<7;k++){const xx=px+(j-1)*h*.85+Math.sin(k*9+Math.floor(total/130))*10,yy=py-h*(k/7)*2.5;k?c.lineTo(xx,yy):c.moveTo(xx,yy);}c.stroke();}}
 if(types[type].effect==='ice'){for(let i=0;i<9;i++){const a=i*.7,xx=px+Math.cos(a)*h*.9,yy=py-Math.sin(a)*h*.3;c.beginPath();c.moveTo(xx,yy-15);c.lineTo(xx+5,yy);c.lineTo(xx,yy+8);c.lineTo(xx-5,yy);c.closePath();c.stroke();}}
 if(types[type].effect==='leaves'){for(let i=0;i<14;i++){const a=i*2.4+total*.0007,xx=px+Math.cos(a)*h*.9,yy=py-(i/14)*h*2;c.save();c.translate(xx,yy);c.rotate(a);c.beginPath();c.ellipse(0,0,5,2,0,0,7);c.fill();c.restore();}}
 if(types[type].effect==='mirrors'){for(let i=0;i<6;i++){const a=i*Math.PI/3+total*.0002;circle(c,px+Math.cos(a)*h*.8,py-h+Math.sin(a)*h*.6,h*.12,h*.17);}}
 if(types[type].effect==='stones'){for(let i=0;i<8;i++){const a=i*Math.PI/4+total*.00015,xx=px+Math.cos(a)*h,yy=py-10+Math.sin(a)*h*.18;c.save();c.translate(xx,yy);c.rotate(a);c.strokeRect(-5,-5,10,10);c.restore();}}
 if(types[type].effect==='wind'){for(let i=0;i<4;i++){const yy=py-h*(.2+i*.5);c.beginPath();c.ellipse(px+Math.sin(total*.001+i)*12,yy,h*(.6+i*.12),h*.15,-.2,total*.002+i,total*.002+i+4.7);c.stroke();}}
 if(types[type].effect==='flame'){for(let i=0;i<10;i++){const xx=px+(i/9-.5)*h*2;c.beginPath();c.moveTo(xx-5,py);c.quadraticCurveTo(xx-16,py-25,xx+Math.sin(total*.005+i)*12,py-25-12*Math.sin(total*.006+i)**2);c.quadraticCurveTo(xx+16,py-12,xx+5,py);c.fill();}}
 if(phase==='attack'){const p=clamp(elapsed/800,0,1);c.globalAlpha=Math.sin(p*Math.PI);c.lineWidth=3+(1-p)*6;c.beginPath();c.ellipse(px+(dir==='back'?-.2:1)*h*p*1.8,py-h*.6,h*(.5+p*2),h*(.2+p*.5),-.35,-1.6,1.8);c.stroke();c.lineWidth=1.5;circle(c,px,py,h*(.3+p*2),h*(.1+p*.5));}c.restore();}
function render(dt){total+=dt;elapsed+=dt;if(phase!=='idle'){
 let changed=true;while(changed){changed=false;const def=phaseDefs.find(p=>p[0]===phase);if(def&&elapsed>=def[1]){const extra=elapsed-def[1];const next=phase==='gather'?'manifest':phase==='manifest'?(automatic?'attack':'hold'):phase==='attack'?(automatic?'dissolve':'hold'):'idle';enter(next);elapsed=extra;actionTime=0;changed=next!=='hold'&&next!=='idle';}}
 if(phase==='hold'){hold+=dt;if(hold>=types[type].durationMs)dismiss();}
 }
 drawHero(dt);const h=getHeroSize(),e=energy(),progress=phase==='manifest'?clamp(elapsed/1200,0,1):1;
 apparition.style.height=h*.79*scale+'px';apparition.style.width=h*.79*scale*1.4+'px';apparition.style.left=x*100+'%';apparition.style.bottom=(1-y)*100+'%';
 const presence=phase==='gather'?.12*clamp(elapsed/800,0,1):phase==='manifest'?.12+.88*progress:e;
 apparition.style.opacity=phase==='idle'?0:presence*alpha;
 apparition.style.transform=`translateX(-50%) translateY(${phase==='manifest'?(1-progress)*h*.65:Math.sin(total*.002)*3}px) scaleX(${dir==='side'?.78:1}) scale(${phase==='attack'?1+Math.sin(elapsed/800*Math.PI)*.045:1})`;
 for(const c of ctx)c.clearRect(0,0,width,height);drawGround(ctx[0],e);drawFX(ctx[1],e);$('#clock').textContent=(phase==='idle'?0:total/1000).toFixed(1)+' s';
}
function loop(t){if(!alive)return;const dt=paused?0:Math.min(t-last,100)*speed;last=t;render(dt);frameId=requestAnimationFrame(loop);}
$('#summon').addEventListener('click',summon);$('#attack').addEventListener('click',attack);$('#dismiss').addEventListener('click',dismiss);$('#type').addEventListener('change',e=>{$('#yuanshen').value='';setType(e.target.value);});
$('#player-gender').addEventListener('change',e=>{playerGender=e.target.value;setType(type);message(playerGender==='male'?'男玩家 → 男性法相。男角暫用原遊戲靜態立繪，尚無男性動畫圖集。':'女玩家 → 女性法相。');});
$('#yuanshen').addEventListener('change',e=>{const soul=window.FAXIANG_YUANSHEN[e.target.value];if(soul){setType(soul.faxiang);message(soul.name+' → '+variant().name+'（僅外觀預覽，不額外增加元神倍率）');}});
for(const b of document.querySelectorAll('[data-dir]'))b.addEventListener('click',()=>{dir=b.dataset.dir;document.querySelectorAll('[data-dir]').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));});
for(const [id,fn] of Object.entries({scale:v=>scale=v,opacity:v=>alpha=v,speed:v=>speed=v}))$('#'+id).addEventListener('input',e=>fn(Number(e.target.value)));
$('#auto').addEventListener('change',e=>automatic=e.target.checked);$('#motion').addEventListener('change',e=>{action=e.target.value;actionTime=0;});
function move(e){const r=arena.getBoundingClientRect();x=clamp((e.clientX-r.left)/r.width,.2,.8);y=clamp((e.clientY-r.top)/r.height,.72,.88);action='walk';}
let dragging=false;arena.addEventListener('pointerdown',e=>{dragging=true;arena.setPointerCapture(e.pointerId);move(e);});arena.addEventListener('pointermove',e=>{if(dragging)move(e);});for(const name of ['pointerup','pointercancel'])arena.addEventListener(name,()=>{dragging=false;action='idle';});
document.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();summon();}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();x=clamp(x+(e.key==='ArrowLeft'?-.025:.025),.2,.8);action='walk';}});document.addEventListener('keyup',e=>{if(e.key.startsWith('Arrow'))action='idle';});
function loadFile(input,onload){const file=input.files[0];if(!file)return;if(!['image/png','image/webp'].includes(file.type)||file.size>20*1024*1024){message('請使用小於 20MB 的 PNG 或 WebP。');return;}const url=URL.createObjectURL(file);urls.add(url);const img=new Image();img.onload=()=>onload(url,img);img.onerror=()=>{URL.revokeObjectURL(url);urls.delete(url);message('圖片載入失敗。');};img.src=url;}
$('#sheet').addEventListener('change',e=>loadFile(e.target,(src,img)=>{const kind=$('#sheet-kind').value,cols=kind==='walk'?6:8;sprite.load(kind,src,cols,3,true).then(()=>message('已載入三方向圖集。')).catch(()=>message('無法載入圖集。'));}));
$('#deity-file').addEventListener('change',e=>{const target=type,gender=playerGender;loadFile(e.target,src=>{images[target+':'+gender]=src;if(type===target&&playerGender===gender)setType(type);message('已替換指定性別的法相圖。');});});
deity.addEventListener('error',()=>{deity.classList.add('failed');message('法相圖片未載入，暫用光形示意。');});
document.addEventListener('visibilitychange',()=>{paused=document.hidden;last=performance.now();});
window.addEventListener('pagehide',()=>{alive=false;cancelAnimationFrame(frameId);observer.disconnect();for(const u of urls)URL.revokeObjectURL(u);});
// Animation-only public interface. No damage or unlock authority lives here.
window.FaxiangDemo=Object.freeze({summon,attack,dismiss,setType,snapshot:()=>({playerGender,faxiangGender:playerGender,variantName:variant().name,phase,elapsed,type,dir,x,y,scale,alpha,speed,action,assetsReady,frame:hero.dataset.frame,row:hero.dataset.row,motion:hero.dataset.motion}),destroy:()=>{alive=false;cancelAnimationFrame(frameId);observer.disconnect();for(const u of urls)URL.revokeObjectURL(u);}});
resize();const params=new URLSearchParams(location.search);
playerGender=params.get('playerGender')==='male'?'male':'female';$('#player-gender').value=playerGender;
const gamePreview=params.get('from')==='game';
const soulId=params.get('yuanshen');
const entrySoul=Object.prototype.hasOwnProperty.call(window.FAXIANG_YUANSHEN,soulId)?window.FAXIANG_YUANSHEN[soulId]:null;
setType(entrySoul?entrySoul.faxiang:params.get('faxiang')||'goddess');
if(gamePreview){
 $('#player-gender').parentElement.style.display='none';$('#player-gender').disabled=true;
 $('#yuanshen').disabled=true;
 if(entrySoul){$('#yuanshen').value=params.get('yuanshen');$('#type').disabled=true;}
 else $('#yuanshen').options[0].textContent='尚未凝聚元神';
 const note=$('#entry-note');note.hidden=false;
 note.textContent=entrySoul?'目前角色的'+entrySoul.name+'對應法相（僅供外觀預覽）。':'目前尚未凝聚元神，可先預覽同性別法相；此預覽不代表解鎖或取得能力。';
}
frameId=requestAnimationFrame(loop);
})();
