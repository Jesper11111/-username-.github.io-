// 傳說裝備共鳴／常駐效果稽核；不改數值、不補設計、不讀寫玩家存檔。
const fs=require('fs'),path=require('path'),vm=require('vm');
const setup=fs.readFileSync(path.join(__dirname,'test-item-art.js'),'utf8').split('const art=')[0];
const run=String.raw`
SIM_MODE=true;sfx=()=>{};refreshUI=()=>{};showToast=()=>{};gameAlert=()=>{};
const rows=Object.keys(ITEMS).filter(id=>codexGradeOf(id).id==='legend').map(id=>{const d=ITEMS[id],r=d.res;return {id,name:d.name,group:codexGroup(d),slot:d.slot||d.type,res:r?{name:r.name,tier:RES_TIERS[r.tier].name,trigger:resTriggerText(r),desc:r.desc,classes:(r.cls||[]).map(c=>CLASSES[c].name)}:null,passive:Object.fromEntries(Object.entries(d).filter(([k,v])=>typeof v==='number'||typeof v==='boolean'))};});
assert.equal(rows.length,28);assert.equal(rows.filter(x=>x.res).length,10);assert.equal(rows.filter(x=>!x.res).length,18);
for(const row of rows){
 const d=ITEMS[row.id],r=d.res;if(!r){assert.equal(resonanceHtml(d),'');continue;}
 const cls=r.cls?r.cls[0]:'knight';createPlayer('傳說效果隔離測試',cls,CLASSES[cls].base);
 for(const s of SLOT_KEYS)unequipSlot(s);const it=addItem(row.id,1);assert(equipItem(it.uid,true),row.id);
 assert(resItemIds().includes(row.id));assert(codexDetailHtml(row.id).includes(r.name));assert(resonanceHtml(d).includes(resTriggerText(r)));
 gameNow=100000;player.hp=1;player.hunting=true;
 const m=makeMonster('skeleton');m.hp=m.maxHp=10000000;hunt={state:'fight',mon:m,mobs:[m],warned:{}};
 const st=calcStats(),mp=player.mp,before=m.hp;const originalChance=chance;chance=p=>p>0;
 if(r.trigger==='charge'){for(let i=1;i<r.n;i++)resonanceOnHit();assert(!(hunt.resPending||[]).includes(row.id));resonanceOnHit();assert(hunt.resPending.includes(row.id));assert.equal(resChargeMap()[row.id],0);assert(resonanceFlush(st));}
 else if(r.trigger==='proc'){resonanceOnHit();assert(hunt.resPending.includes(row.id));assert(resonanceFlush(st));}
 else if(r.trigger==='hurt'){resonanceOnHurt(st);if(r.kind!=='buff'&&r.kind!=='heal')assert(resonanceFlush(st));}
 else if(r.trigger==='cd'){assert.equal(resonanceReady(),row.id);castResonance(row.id,st);assert.equal(resReady(row.id),false);assert.equal(player.cds['res_'+row.id],gameNow+r.cd*1000);gameNow+=r.cd*1000;assert(resReady(row.id));}
 if(r.kind==='strike'||r.kind==='spell')assert(m.hp<before,row.id+' 未造成傷害');
 if(r.kind==='heal')assert(player.hp>1,row.id+' 未治療');
 if(r.kind==='buff'){assert(player.buffs['res_'+row.id],row.id+' 未建立增益');const after=calcStats();for(const key of Object.keys(r.fx))assert.notEqual(after[key==='spdMul'?'atkMs':key],st[key==='spdMul'?'atkMs':key],row.id+' 增益未套用 '+key);}
 assert.equal(player.mp,mp,'共鳴不應耗 MP '+row.id);chance=originalChance;
 const slot=SLOT_KEYS.find(s=>player.equip[s]&&player.equip[s].uid===it.uid);unequipSlot(slot);assert(!resItemIds().includes(row.id),'卸下仍啟動 '+row.id);
}
this.legendEffectAudit=rows;console.log('PASS：28 傳說＝10 有共鳴、18 未設定；10 件實測命中集氣／機率觸發／受擊增益／冷卻、傷害或治療、不耗 MP、卸下停用、圖鑑說明一致。');
`;
const host={require,__dirname,console};
vm.runInNewContext(setup+'\nvm.runInContext('+JSON.stringify(run)+',ctx);this.rows=ctx.legendEffectAudit;',host);

fs.writeFileSync(path.join(__dirname,'legend-effects-audit.json'),JSON.stringify(host.rows,null,2));
