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
SIM_MODE = true; sfx = () => {}; refreshUI = () => {}; showToast = () => {};
createPlayer('購買測試', 'knight', CLASSES.knight.base);
player.loc = {type:'town', id:Object.keys(TOWNS)[0]}; player.inv=[]; player.gold=100000;
const id = shopItemIds().find(id => ITEMS[id].heal), d = ITEMS[id]; assert(id);
for (const n of [0,-1,.5,NaN,Infinity,'10',Number.MAX_SAFE_INTEGER]) {
    const before=JSON.stringify(player); buyItem(id,n); assert.equal(JSON.stringify(player),before);
}
for (const value of ['', ' ', '0', '-2', '1.2', '1e3', 'Infinity', '9007199254740992']) {
    nodes['shop-buy-qty'].value=value; assert.equal(shopBuyQuantity(),0,value);
}
nodes['shop-buy-qty'].value='37'; assert.equal(shopBuyQuantity(),37);
const gold=player.gold; assert.equal(buyItem(id,37),true);
assert.equal(player.gold,gold-d.price*37); assert.equal(countItem(id),37);
const bought=JSON.stringify(player); player.gold=0;
const poor=JSON.stringify(player); buyItem(id,1); assert.equal(JSON.stringify(player),poor);
player.gold=100000;
const oldWeight=invWeight, oldStats=calcStats;
invWeight=()=>100; calcStats=()=>({weightMax:100});
assert.equal(shopBuyLimit(id),0); const full=JSON.stringify(player); buyItem(id,1); assert.equal(JSON.stringify(player),full);
invWeight=()=>0; calcStats=()=>({weightMax:d.wt*7}); player.gold=d.price*5;
assert.equal(shopBuyLimit(id),5);
invWeight=oldWeight; calcStats=oldStats; player.gold=100000;
const weapon=shopItemIds().find(id=>ITEMS[id].cat==='weapon'); const beforeCount=player.inv.length;
buyItem(weapon,3); assert.equal(player.inv.length,beforeCount+3);
assert(player.inv.filter(x=>x.id===weapon).every(x=>x.n===1));
nodes['shop-buy-qty'].value='2'; shopBuyPreview(id); assert(nodes['shop-buy-total'].textContent.includes(fmt(d.price*2)));
let dialog=null, closed=0; openDialog=(title,html,buttons)=>{dialog={title,html,buttons};}; closeDialog=()=>{closed++;};
openShopBuy(id); assert(dialog.html.includes('oninput="shopBuyPreview(')); assert(dialog.buttons[1].keep);
const buy=dialog.buttons[1].onClick; player.loc={type:'zone',id:'island'};
const moved=JSON.stringify(player); buy(); assert.equal(JSON.stringify(player),moved); assert.equal(closed,1);
player.loc={type:'town',id:Object.keys(TOWNS)[0]};
assert(renderShop().includes('openShopBuy('));
console.log('PASS：自訂 37 個、裝備逐件購買、金幣／負重限制、最大可買數量、負數／小數／非有限值／溢位拒絕、離村防重用。');
`, ctx);
