// 真實遊戲串接回歸：記憶體localStorage與假RPC，禁止正式連線。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),memory=new Map();let failStorage=false;
const ctx=vm.createContext({console,assert,crypto,TextEncoder,TextDecoder,btoa,atob,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},Image:function(){},
 localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>{if(failStorage)throw Error('disk full');memory.set(k,v);},removeItem:k=>memory.delete(k)},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准正式連線');},failDisk:b=>{failStorage=b;}});
for(const[,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g))if(!['data/main.js','data/pwa.js'].includes(f))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
async function main(){await vm.runInContext(String.raw`(async()=>{
 SIM_MODE=true;createPlayer('掉寶入帳測試','knight',CLASSES.knight.base);SIM_MODE=false;
 const uid='11111111-1111-4111-8111-111111111111';cloudUser={id:uid,email:'test@invalid'};cloudLoggedIn=()=>!!cloudUser;authUid=()=>uid;playerOwner=uid;lootMode='active';
 showToast=()=>{};refreshUI=()=>{};sfx=()=>{};cloudMarkDirty=()=>{};cloudFlush=async()=>true;cloudSb={};
 currentSlot=0;const char=lootChar();saveGame();const initial=countItem('redPotion');
 rollQuality=()=>{throw Error('前端不可抽品質');};rollCurrency=()=>{throw Error('前端不可抽通貨');};
 const result={id:'one',cursor:1,char,slot:0,items:[{id:'redPotion',n:2}]};
 assert(lootApply(result));assert.equal(countItem('redPotion'),initial+2);assert(lootApply(result));assert.equal(countItem('redPotion'),initial+2,'同一結果不可重複入帳');
 saveGame();assert.equal(saveParse(localStorage.getItem(slotKey(0))).lootCursor,1,'自動存檔保留收據');
 assert.equal(lootApply({...result,cursor:3}),false,'不可跳過較早收據');
 assert.equal(lootApply({...result,cursor:2,char:'wrong'}),false);
 const before=JSON.stringify(player.inv),gold=player.gold,next=player.nextUid;
 failDisk(true);assert.throws(()=>lootApply({...result,cursor:2}),/disk full/);failDisk(false);
 assert.equal(JSON.stringify(player.inv),before);assert.equal(player.gold,gold);assert.equal(player.nextUid,next,'寫檔失敗整筆還原');
 // 原始詞綴直接入帳，不呼叫前端亂數；自動賣出仍沿用設定。
 assert(lootApply({...result,cursor:2,items:[{id:'longSword',n:1,q:'rare',il:50,nm:'後端',af:[{k:'str',v:3}]}]}));
 const sword=player.inv.find(x=>x.nm==='後端');assert.equal(sword.af[0].v,3);
 player.settings.lootFilter=1;const gold0=player.gold;
 assert(lootApply({...result,cursor:3,items:[{id:'longSword',n:1}]}));assert(player.gold>gold0);
 player.settings.lootFilter=0;
 // 在玩另一個角色時只修改目標欄位，不把獎勵發給目前角色。
 const first=player;currentSlot=1;SIM_MODE=true;createPlayer('另一角色','mage',CLASSES.mage.base);SIM_MODE=false;playerOwner=uid;saveGame();const second=player;
 assert(lootApply({...result,cursor:4}));assert.equal(player,second);assert.equal(countItem('redPotion'),30);
 currentSlot=0;player=first;applySaveData(saveParse(localStorage.getItem(slotKey(0))));
 // await期間新擊殺加入佇列，清除完成工作不能覆蓋新工作。
 lootStore([{key:'a',kind:'kill',ticket:'a',slot:0,char}]);let calls=0;
 marketRpc=async(fn,args)=>{if(fn==='loot_finish_batch'){calls++;lootStore([...lootJobs(),{key:'b',kind:'kill',ticket:'b',slot:0,char}]);return {};}
 if(fn==='loot_pending')return [];throw Error(fn);};
 lootPendingAt=gameNow+30000;await lootPump();assert.equal(calls,1);assert.equal(lootJobs().length,1);assert.equal(lootJobs()[0].key,'b');
 // 斷線不移除工作、不退回本機掉落。
 marketRpc=async()=>{throw Error('offline');};await lootPump();assert.equal(lootJobs()[0].key,'b');assert.equal(lootMode,'active');
 player.hunting=false;await lootProbe();assert.equal(lootMode,'active');
 SIM_MODE=true;assert.equal(lootActive(),false,'離線試算不使用後端');assert.equal(lootCanPlay(),true);SIM_MODE=false;
 lootMode='blocked';const blockedInv=JSON.stringify(player.inv);rollDrops({lv:1,drops:[]},{drops:[]});assert.equal(JSON.stringify(player.inv),blockedInv,'後端未就緒不可退回本機掉落');
 lootMode='active';player.loc={type:'zone',id:'island',floor:1};player.hunting=true;hunt={state:'search',mobs:[],mon:null,warned:{}};
 const target={rx:2,ry:2};scene={mons:[target],effects:[]};updateHuntLive=()=>{};
 marketRpc=async fn=>fn==='loot_release'?true:[{ticket:crypto.randomUUID(),monster:makeMonster('goblin')}];
 await lootSpawn(false,'goblin',target);assert.equal(target.inst,hunt.mon,'手動點怪等後端回覆後綁到原身體');assert.equal(scene.effects.length,1);
 // 第99節：剛從背景回來網路不通，掛機只暫停、恢復後自動繼續；不是網路問題才停止。
 stopHunt=msg=>{player.hunting=false;hunt=null;stopped=msg;};let stopped=null;lootNotice=()=>{};
 marketRpc=async()=>{throw Error('Failed to fetch');};await lootProbe();assert.equal(player.hunting,true,'連不上不停掛機');assert.equal(lootMode,'active');
 hunt.state='search';hunt.timer=0;await lootSpawn();assert.equal(player.hunting,true,'生怪連不上不停掛機');assert.equal(hunt.state,'search');assert.equal(hunt.timer,3000);
 const syncedOrig=cloudSyncedSlot;cloudSyncedSlot=async()=>false;await lootSpawn();assert.equal(player.hunting,true,'存檔還沒傳完也只暫停');cloudSyncedSlot=syncedOrig;
 lootMode='blocked';const h0=hunt;huntTick(100);assert.equal(player.hunting,true,'後端狀態確認中只暫停');assert.equal(hunt,h0);
 marketRpc=async fn=>fn==='loot_status'?{protocol:LOOT_PROTOCOL,enabled:true,rules:'r'}:[];await lootProbe();assert.equal(lootMode,'active','恢復連線自動回到線上掉寶');
 // 第103節：管理者停用（enabled=false）時改用一般掉寶，不用重新整理、掛機不停
 {const h1=hunt;marketRpc=async fn=>fn==='loot_status'?{protocol:LOOT_PROTOCOL,enabled:false,rules:null}:(()=>{throw Error('loot disabled');})();
  hunt.state='search';hunt.timer=0;await lootSpawn();assert.equal(player.hunting,true,'剛停用時生怪被拒也不停');assert.equal(lootMode,'legacy','重查後改用一般掉寶');
  assert.equal(lootCanPlay(),true);assert.equal(lootRequired(),false);
  marketRpc=async fn=>fn==='loot_status'?{protocol:LOOT_PROTOCOL,enabled:true,rules:'r'}:[];await lootProbe();assert.equal(lootMode,'active','重新啟用後回到後端掉寶');hunt=h1;}
 marketRpc=async fn=>{if(fn==='loot_release')return true;throw Error('loot zone denied');};await lootSpawn();assert.equal(player.hunting,false,'不是網路問題仍停止');assert(/後端掉寶尚未就緒/.test(stopped));
 player.hunting=true;hunt={state:'search',mobs:[],mon:null,warned:{}};
 // 第100節：生怪資格欄位沒變就不重傳整份存檔；結算不再每筆先上傳
 {let ups=0;const so=cloudSyncedSlot;cloudSyncedSlot=async s=>{ups++;cloudKnown[s]=1;cloudSnapKey[s]=lootSnapKey(player);return true;};
  marketRpc=async fn=>fn==='loot_release'?true:[{ticket:crypto.randomUUID(),monster:makeMonster('goblin')}];
  delete cloudSnapKey[0];hunt.state='search';await lootSpawn();assert.equal(ups,1,'第一次要上傳');
  player.gold+=999;player.inv.push({uid:9999,id:'redPotion',n:1});hunt.state='search';await lootSpawn();assert.equal(ups,1,'金幣背包變了不用重傳');
  player.lv+=1;hunt.state='search';await lootSpawn();assert.equal(ups,2,'等級變了要重傳');player.lv-=1;
  lootStore([{key:'k1',kind:'kill',ticket:'k1',slot:0,char}]);let fin=0;
  marketRpc=async fn=>{if(fn==='loot_finish_batch')fin++;return fn==='loot_pending'?[]:{};};lootPendingAt=gameNow+30000;
  await lootPump();assert.equal(fin,1);assert.equal(ups,2,'結算不上傳');cloudSyncedSlot=so;}
 // 第104節：擊殺排隊、滿 10 隻或 30 秒才批次結算；重送用同一批次編號；每次掛機只釋放一次
 {const calls=[];let fail=false;marketRpc=async(fn,args)=>{calls.push([fn,args]);if(fn==='loot_finish_batch'){if(fail)throw Error('Failed to fetch');return {};}return fn==='loot_pending'?[]:true;};
  lootPendingAt=gameNow+300000;lootStore([]);const now=Date.now();
  for(let i=0;i<9;i++)lootStore([...lootJobs(),{key:'k'+i,kind:'kill',ticket:'t'+i,slot:0,char,at:now}]);
  await lootPump();assert.equal(calls.filter(c=>c[0]==='loot_finish_batch').length,0,'9 隻、未滿 30 秒不結算');
  lootStore([...lootJobs(),{key:'k9',kind:'kill',ticket:'t9',slot:0,char,at:now}]);fail=true;await lootPump();
  const first=calls.filter(c=>c[0]==='loot_finish_batch');assert.equal(first.length,1);assert.equal(first[0][1].p_tickets.length,10,'滿 10 隻一次結算');
  assert.equal(lootJobs().length,10,'失敗時佇列保留');fail=false;lootSyncFailAt=0;await lootPump();
  const all=calls.filter(c=>c[0]==='loot_finish_batch');assert.equal(all[1][1].p_batch,all[0][1].p_batch,'重送用同一批次編號');assert.equal(lootJobs().length,0,'成功後清掉');
  lootStore([{key:'s1',kind:'kill',ticket:'s1',slot:0,char,at:now}]);lootSettleNow();await new Promise(r=>setTimeout(r,0));while(lootBusy)await new Promise(r=>setTimeout(r,1));
  assert.equal(lootJobs().length,0,'要求馬上結算時不等湊滿');
  lootStore([{key:'o1',kind:'kill',ticket:'o1',slot:0,char,at:now-31000}]);await lootPump();assert.equal(lootJobs().length,0,'超過 30 秒就結算');
  calls.length=0;marketRpc=async(fn)=>{calls.push([fn]);return fn==='loot_spawn'?[{ticket:crypto.randomUUID(),monster:makeMonster('goblin')}]:true;};
  hunt={state:'search',mobs:[],mon:null,warned:{}};player.hunting=true;await lootSpawn();hunt.state='search';await lootSpawn();
  assert.equal(calls.filter(c=>c[0]==='loot_release').length,1,'同一次掛機只釋放一次');assert.equal(calls.filter(c=>c[0]==='loot_spawn').length,2);
  marketRpc=async fn=>{calls.push([fn]);if(fn==='loot_spawn')throw Error('loot encounters full');return true;};hunt.state='search';await lootSpawn();
  assert.equal(player.hunting,true,'遭遇太多不停掛機');assert.equal(hunt.lootReleased,false,'下次先釋放');lootStore([]);}
 {let calls=0;marketRpc=async()=>{calls++;return [];};cloudBackoffUntil=Date.now()+20000;hunt.state='search';hunt.timer=0;await lootSpawn();
  assert.equal(calls,0,'退避中不呼叫伺服器');assert.equal(player.hunting,true);assert(hunt.timer>=15000,'等退避結束再找怪');lootStore([{key:'b2',kind:'kill',ticket:'b2',slot:0,char}]);await lootPump();assert.equal(calls,0,'退避中不結算');cloudBackoffUntil=0;lootStore([]);}
 let spawnCalls=0;cloudFlush=async()=>{cloudUser={id:'other'};return true;};marketRpc=async()=>{spawnCalls++;};
 await lootSpawn();assert.equal(spawnCalls,0,'await期間換帳號不得繼續發怪');
 cloudUser=null;assert.equal(lootCanPlay(),false,'未登入不能進入線上掉寶');
 console.log('PASS：原子收據、重領／順序／角色、儲存失敗回復、後端詞綴、過濾、非當前角色入帳、佇列競態、斷線重試及SIM隔離、網路暫斷只暫停掛機、生怪欄位沒變不重傳存檔、伺服器忙碌時退避、停用時改一般掉寶不卡住、批次結算與少釋放。');
})()`,ctx);}
main().catch(e=>{console.error(e);process.exitCode=1;});
