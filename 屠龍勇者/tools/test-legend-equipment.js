// 十二職業實際穿戴與兩套防具／鍛造往返；全部隔離記憶體，不讀寫真實角色或連線。
const fs=require('fs'),path=require('path'),vm=require('vm');
const spec=JSON.parse(fs.readFileSync(path.join(__dirname,'legend-equipment-art.json'),'utf8'));
const setup=fs.readFileSync(path.join(__dirname,'test-item-art.js'),'utf8').split('const art=')[0];
const run=String.raw`
SIM_MODE=true;sfx=()=>{};refreshUI=()=>{};showToast=()=>{};gameAlert=()=>{};
assert.equal(Object.keys(ITEMS).length,432);
assert.equal(Object.values(ITEMS).filter(d=>d.cat==='weapon').length,75);
assert.equal(Object.values(ITEMS).filter(d=>d.cat==='armor').length,93);
const legends=Object.keys(ITEMS).filter(id=>codexGradeOf(id).id==='legend');
assert.equal(legends.filter(id=>ITEMS[id].cat==='weapon').length,12);
assert.equal(legends.filter(id=>codexGroup(ITEMS[id])==='armor').length,14);
assert.equal(legends.filter(id=>codexGroup(ITEMS[id])==='acc').length,2);
assert.equal(Object.keys(legendSpec.weapons).length,Object.keys(CLASSES).length);
assert.equal(new Set(Object.values(legendSpec.weapons)).size,12);
for(const cls of Object.keys(CLASSES)){
 const id=legendSpec.weapons[cls],d=ITEMS[id];
 assert(d&&d.cat==='weapon'&&codexGradeOf(id).id==='legend',cls);
 createPlayer('隔離傳說職業測試',cls,CLASSES[cls].base);
 assert.equal(canEquip(d),'',cls+' 不可用代表武器');
 const it=addItem(id,1);assert(equipItem(it.uid,true),cls);assert.equal(player.equip.weapon.id,id);
 const st=calcStats();assert(Number.isFinite(st.atkMs)&&st.atkMs>0,cls);
 assert(codexSources(id).length>0,'代表武器缺取得方式 '+id);
}
const slots=['helm','armor','cloak','shield','tshirt','gloves','boots'];
for(const [name,ids]of Object.entries(legendSpec.sets)){
 assert.equal(ids.length,7);assert.equal(new Set(ids.map(id=>ITEMS[id].slot)).size,7);
 for(const slot of slots)assert.equal(ids.filter(id=>ITEMS[id].slot===slot).length,1,name+' '+slot);
 createPlayer('隔離傳說防具測試','knight',CLASSES.knight.base);for(const slot of SLOT_KEYS)unequipSlot(slot);
 const before=calcStats();
 for(const id of ids){assert.equal(codexGradeOf(id).id,'legend');assert(ITEMS[id].desc.includes(name),id);const it=addItem(id,1);assert(equipItem(it.uid,true));}
 assert.equal(calcStats().ac,before.ac-ids.reduce((n,id)=>n+ITEMS[id].ac,0));
 for(const slot of slots)unequipSlot(slot);assert.equal(calcStats().ac,before.ac);
}
for(const slot of slots)assert.equal(legends.filter(id=>ITEMS[id].cat==='armor'&&ITEMS[id].slot===slot).length,2,slot);
createPlayer('隔離傳說鍛造測試','knight',CLASSES.knight.base);player.loc={type:'town',id:Object.keys(TOWNS)[0]};
for(const entry of legendSpec.items){
 const id=entry.id,d=ITEMS[id],matches=RECIPES.filter(r=>r.out===id);assert.equal(matches.length,1,id);
 const recipe=matches[0],idx=RECIPES.indexOf(recipe);assert.equal(!!d.res,d.cat==='weapon');assert(!d.classes&&!d.price);assert.equal(d.safe,d.cat==='weapon'?6:4);
 for(const [base,n]of Object.entries(recipe.need)){assert(ITEMS[base],base);assert(Number.isInteger(n)&&n>0);}
 assert(codexSources(id).some(s=>s.startsWith('鍛造：')),id+' 沒列鍛造來源');
 assert(!codexSources(id).some(s=>s.includes('隨機裝備')),id+' 錯列不可達掉落');
 player.inv=[];player.gold=recipe.gold;const before=JSON.stringify(player);craftItem(idx);assert.equal(JSON.stringify(player),before,'材料不足不能扣款');
 for(const [base,n]of Object.entries(recipe.need))addItem(base,n);
 assert.equal(recipeMissing(recipe).length,0);craftItem(idx);assert.equal(player.gold,0);assert.equal(countItem(id),1);
 for(const base of Object.keys(recipe.need))assert.equal(countItem(base),0,'未扣材料 '+base);
 const made=player.inv.find(it=>it.id===id);assert.equal(made.ench||0,0);
 assert(itemDescHtml(made).includes('items/'+id+'.png'));assert(codexDetailHtml(id).includes('items/'+id+'.png'));
}
createPlayer('隔離持盾測試','knight',CLASSES.knight.base);
const shield=addItem('starwindShield',1);assert(equipItem(shield.uid,true));const sword=addItem('thunderRuneSword',1);assert(equipItem(sword.uid,true));assert(player.equip.shield);
const spear=addItem('seraphSpear',1);assert(equipItem(spear.uid,true));assert(!player.equip.shield);assert(equipItem(shield.uid,true));assert(!player.equip.weapon);
console.log('PASS：十二職業各一把不同傳說代表武器；兩套七部位共 14 防具；新增 18 件實際鍛造扣料／來源／圖片與持盾限制正常。');
`;
vm.runInNewContext(setup+'\nctx.legendSpec=spec;vm.runInContext('+JSON.stringify(run)+',ctx);',{require,__dirname,console,spec});
