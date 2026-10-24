// 自訂購買數量：隔離角色／存檔／連線，確認非法輸入不扣款、不產生物品。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const nodes = { 'shop-buy-qty': { value: '1' }, 'shop-buy-total': { textContent: '' } };
const sandbox = { console, assert, nodes, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    localStorage: { getItem: () => null, setItem() { throw Error('禁止寫入真實存檔'); }, removeItem() { throw Error('禁止刪除存檔'); } },
    document: { addEventListener() {}, getElementById: id => nodes[id] || null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } };
const ctx = vm.createContext(sandbox);
for (const [, file] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (file === 'data/main.js' || file === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file });
}
vm.runInContext(String.raw`
(async () => {
SIM_MODE=true; sfx=()=>{}; refreshUI=()=>{}; showToast=()=>{};
let dialog=''; openDialog=(title, html)=>{dialog=html;};
createPlayer('變身等級鎖測試','knight',CLASSES.knight.base);addItem('polyScroll',100);
assert.equal(MORPH_LV_FREE,false);
cloudSb=null;cloudUser=null;
for (const f of MORPH_FORMS) {
 player.lv=f.lv-1;assert(!morphLvOk(f));
 const before=countItem('polyScroll'), buff=JSON.stringify(player.buffs.morph);
 assert(usePotion('polyScroll',f.id).includes('需要 Lv.'));assert.equal(countItem('polyScroll'),before);assert.equal(JSON.stringify(player.buffs.morph),buff);
 player.lv=f.lv;assert(morphLvOk(f));assert.equal(usePotion('polyScroll',f.id),'');assert.equal(countItem('polyScroll'),before-1);
}
player.lv=1;openMorphPicker();assert(dialog.includes('等級不夠的不能選'));assert(!dialog.includes('暫不限等級'));
assert(dialog.includes('disabled onclick="morphPick(\'m32\')"'));
// 舊自動欄位使用上次金變時也必須檢查等級。
player.settings.lastMorph='m32';const before=countItem('polyScroll');assert(usePotion('polyScroll').includes('需要 Lv.70'));assert.equal(countItem('polyScroll'),before);
// 既有伺服器RPC確認GM，低等角色32款全開。
cloudUser={id:'gm-test'};cloudSb={rpc:async name=>{assert.equal(name,'dragon_is_admin');return {data:true,error:null};}};
await cloudCheckMorphAdmin();assert(morphGmOk());
for (const f of MORPH_FORMS) {assert(morphLvOk(f));assert.equal(usePotion('polyScroll',f.id),'');}
openMorphPicker();assert(dialog.includes('GM：不限變身等級'));assert(!dialog.includes('disabled onclick="morphPick(\'m32\')"'));
// 換帳號、登出、封鎖不能沿用前一個GM。
cloudUser={id:'normal-test'};assert(!morphGmOk());assert(!morphLvOk(MORPH_BY_ID.m32));
cloudUser={id:'gm-test'};cloudBan={reason:'test'};assert(!morphGmOk());cloudBan=null;
cloudUser=null;assert(!morphGmOk());
// false、字串true、RPC錯誤與失敗皆不給權限。
cloudUser={id:'gm-test'};
for (const result of [{data:false},{data:'true'},{data:true,error:{message:'denied'}}]) {cloudSb={rpc:async()=>result};await cloudCheckMorphAdmin();assert(!morphGmOk());}
cloudSb={rpc:async()=>{throw Error('offline');}};await cloudCheckMorphAdmin();assert(!morphGmOk());
// 查詢尚未完成時換帳號，晚到的GM回覆不可套給新帳號。
let finish;cloudSb={rpc:()=>new Promise(resolve=>{finish=resolve;})};
const query=cloudCheckMorphAdmin();cloudUser={id:'other'};finish({data:true});await query;assert(!morphGmOk());
console.log('PASS：32款等級門檻與邊界、拒絕不扣卷／不換增益、自動變身、GM全開、一般帳號／登出／換帳號／封鎖／RPC失敗隔離。');
})()
`, ctx).catch(e=>{console.error(e);process.exitCode=1;});
