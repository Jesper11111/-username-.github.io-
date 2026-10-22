// 固定圖鑑品級的全覆蓋與 UI 共用入口；隔離存檔／連線。
const fs=require('fs'),path=require('path'),vm=require('vm');
const setup=fs.readFileSync(path.join(__dirname,'test-item-art.js'),'utf8').split('const art=')[0];
const run=String.raw`
const hasGlow=html=>/class="[^"]*\blegend-glow\b/.test(html);
const ids=Object.keys(ITEMS).filter(id=>['weapon','armor'].includes(ITEMS[id].cat)&&codexGradeOf(id).id==='legend');
assert.equal(ids.length,28);
assert.equal(ids.filter(id=>codexGroup(ITEMS[id])==='weapon').length,12);
assert.equal(ids.filter(id=>codexGroup(ITEMS[id])==='armor').length,14);
assert.equal(ids.filter(id=>codexGroup(ITEMS[id])==='acc').length,2);
for(const id of Object.keys(ITEMS)){
 assert.equal(hasGlow(itemIconHtml(id)),ids.includes(id),id+' 分類錯誤');
 assert.equal(hasGlow(itemThumbHtml(id)),ids.includes(id),id+' 小圖入口');
}
assert(!hasGlow(skillIconHtml(findSkill('energyBolt'))));
assert(!hasGlow(imgIconHtml('potion-blue','item')));
assert(!hasGlow(itemIconHtml('not-an-item')));
SIM_MODE=true;createPlayer('隔離傳說光暈','knight',CLASSES.knight.base);player.inv=[];
for(const id of ids)addItem(id,1);
const count=html=>(html.match(/class="[^"]*\blegend-glow\b/g)||[]).length;
assert.equal(count(renderBag()),28);
for(const id of ids){assert(hasGlow(codexDetailHtml(id)),id+' 圖鑑');assert(hasGlow(itemDescHtml(player.inv.find(x=>x.id===id))),id+' 道具介紹');}
for(const id of ['dragonSlayer','dragonWardHelm','dragonScaleMail','dragonWingCloak','earthGuard','dragonHeartTunic','dragonFangGloves','dragonWardBoots','tideHeart','dragonHeartRing']){
 const it=player.inv.find(x=>x.id===id);assert(equipItem(it.uid,true));
}
assert.equal(count(charGearHtml()),10);
const ordinary=addItem('longSword',1);ordinary.q='legend';assert(!hasGlow(itemDescHtml(ordinary)),'詞綴傳說不應誤當傳說基底');
assert(count(renderCraft())>=18,'鍛造圖示未統一套光暈');
console.log('PASS：全部 433 道具分類正確；28 件傳說 12／14／2 全發光；背包、角色十格、圖鑑、介紹、小圖與鍛造正常，技能／藥水／非傳說基底不誤套。');
`;
vm.runInNewContext(setup+'\nvm.runInContext('+JSON.stringify(run)+',ctx);',{require,__dirname,console});
