// 英雄防具擴充：真正掉落選池、穿脫、能力值、雙手武器與圖鑑；只用隔離記憶體。
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),setup=fs.readFileSync(path.join(__dirname,'test-item-art.js'),'utf8').split('const art=')[0];
const run=String.raw`
const ids=heroArmorIds;
assert.equal(ids.length,11);assert.equal(Object.keys(ITEMS).length,414);
assert.equal(Object.values(ITEMS).filter(d=>d.cat==='weapon').length,68);
assert.equal(Object.values(ITEMS).filter(d=>d.cat==='armor').length,82);
for(const slot of ['helm','armor','cloak','shield','tshirt','gloves','boots']){
 const matches=Object.entries(ITEMS).filter(([id,d])=>d.cat==='armor'&&d.slot===slot&&codexGradeOf(id).id==='hero');assert.equal(matches.length,2,slot+' 英雄件數');
}
assert.equal(Object.entries(ITEMS).filter(([id,d])=>d.cat==='armor'&&CODEX_ACC_SLOTS.includes(d.slot)&&codexGradeOf(id).id==='hero').length,4);
SIM_MODE=true;createPlayer('隔離英雄防具測試','knight',CLASSES.knight.base);
for(const slot of SLOT_KEYS)unequipSlot(slot);
const originalRandom=Math.random;
for(const id of ids){
 const d=ITEMS[id],lv=Math.ceil(sellPriceOf(id)/600);
 assert.equal(codexGradeOf(id).id,'hero');assert.equal(d.safe,4);assert(!isStackable(d));assert(!d.price&&!d.classes&&!d.res);assert(lv>=50&&lv<=80);
 assert(codexSources(id).some(s=>s.includes('隨機裝備')&&s.includes('Lv.'+lv)),'缺取得方式 '+id);
 const pool=Object.keys(ITEMS).filter(k=>{const t=ITEMS[k];return ['weapon','armor'].includes(t.cat)&&!t.classes&&!t.res&&sellPriceOf(k)<=lv*600;});
 Math.random=()=>(pool.indexOf(id)+.25)/pool.length;assert.equal(randomEquipFor(lv),id,'掉落選池 '+id);Math.random=originalRandom;
 const before=calcStats(),it=addItem(id,1);assert(equipItem(it.uid,true));assert.equal(player.equip[d.slot].id,id);
 const after=calcStats();assert.equal(after.ac,before.ac-d.ac);assert.equal(after.maxHp,before.maxHp+(d.hp||0));assert.equal(after.maxMp,before.maxMp+(d.mp||0));
 assert(after.sp>=before.sp+(d.sp||0));assert.equal(after.mr,before.mr+(d.mr||0));assert.equal(after.reduce,before.reduce+(d.reduce||0));
 assert(itemDescHtml(it).includes('items/'+id+'.png'));assert(codexDetailHtml(id).includes('items/'+id+'.png'));unequipSlot(d.slot);assert.equal(calcStats().ac,before.ac);
}
const shield=addItem('dawnBastionShield',1);assert(equipItem(shield.uid,true));const two=addItem('twoHandSword',1);assert(equipItem(two.uid,true));assert(!player.equip.shield);assert(equipItem(shield.uid,true));assert(!player.equip.weapon);
assert(itemDescHtml({id:'runeSilkTunic',n:1,ench:0}).includes('MP +40'));
assert(/>MP<\/span><span>\+40<\/span>/.test(codexDetailHtml('runeSilkTunic')));
console.log('PASS：新增 11 件、七部位各 2 件英雄防具、飾品不變；Lv.50～80 隨機掉落與圖鑑來源、穿脫能力及雙手武器／盾限制正常。');
`;
const heroArmorIds=JSON.parse(fs.readFileSync(path.join(__dirname,'hero-armor-art.json'),'utf8')).items.map(x=>x.id);
vm.runInNewContext(setup+'\nctx.heroArmorIds=heroArmorIds;vm.runInContext('+JSON.stringify(run)+',ctx);',{require,__dirname,console,heroArmorIds});
