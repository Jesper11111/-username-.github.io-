// 全道具的圖片與 UI 接線，隔離存檔及雲端。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,assert,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},
 localStorage:{getItem:()=>null,setItem(){throw Error('不准寫存檔');},removeItem(){throw Error('不准刪存檔');}},
 document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{},fetch(){throw Error('不准連線');}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){
 if(file==='data/main.js'||file==='data/pwa.js')continue;vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
}
const art=vm.runInContext(`Object.keys(ITEMS).map(id=>({id,html:itemIconHtml(id),fresh:!!ITEM_IMG[id]}))`,ctx),hashes=new Set();
assert.equal(art.length,434);assert.equal(art.filter(x=>x.fresh).length,287);
for(const {id,html,fresh}of art){const match=html.match(/<img src="([^"?]+)/);assert(match,'道具缺圖：'+id);const file=path.join(root,match[1]);assert(fs.existsSync(file),'檔案不存在：'+file);
 if(fresh){const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32BE(16),128);assert.equal(bytes.readUInt32BE(20),128);const hash=crypto.createHash('sha256').update(bytes).digest('hex');assert(!hashes.has(hash),'新圖重複：'+id);hashes.add(hash);}
}
vm.runInContext(`SIM_MODE=true;createPlayer('隔離道具圖測試','knight',CLASSES.knight.base);
assert(renderBag().includes('images/icons/items/'));assert(renderShop().includes('images/icons/items/'));
assert(charGearHtml().includes('images/icons/items/'));assert(itemDescHtml({id:'longSword',n:1,ench:0}).includes('items/longSword.png'));
assert(codexDetailHtml('longSword').includes('items/longSword.png'));assert(itemIconHtml('elvenWafer').includes('items/elvenWafer.png'));
assert(itemIconHtml('bravePotion').includes('potion-brave.jpg'));assert(itemIconHtml('wisdomPotion').includes('potion-wisdom.jpg'));
assert(itemIconHtml('bluePotion').includes('potion-blue.jpg'));
assert(itemIconHtml('curAwaken').includes('items/curAwaken-v1.png'));
addItem('curAwaken',1);assert(renderBag().includes('items/curAwaken-v1.png'));assert(renderGearForge().includes('items/curAwaken-v1.png'));
let craftHtml='';openDialog=(t,h)=>{craftHtml=h;};document.getElementById=()=>({querySelector:()=>({innerHTML:''})});
openCraftDialog(player.equip.weapon.uid);assert(craftHtml.includes('items/curAwaken-v1.png'));`,ctx);
console.log('PASS：434 件道具皆有有效圖片；287 張新 PNG 各 128×128、不重複；背包／商店／裝備／詳細圖鑑接線正常。');
