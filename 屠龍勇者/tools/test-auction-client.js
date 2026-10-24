// 拍賣介面草稿驗證，不連線、不寫存檔。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),fields={};
const ctx=vm.createContext({console,assert,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},localStorage:{getItem:()=>null,setItem(){throw Error('禁止存檔')},removeItem(){}},document:{getElementById:id=>fields[id]||null,addEventListener(){},querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){}},navigator:{},fetch(){throw Error('禁止連網')}});
for(const[,file]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)){if(['data/main.js','data/pwa.js'].includes(file))continue;vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});}
ctx.fields=fields;
vm.runInContext(`
SIM_MODE=true;createPlayer('拍賣測試','knight',CLASSES.knight.base);
assert.equal(auctionFee(5),1);assert.equal(auctionFee(20),1);assert.equal(auctionFee(21),2);assert.equal(auctionFee(30),2);assert.equal(auctionFee(100),5);
assert.match(auctionErrText(Error('Could not find function public.auction_browse in schema cache')),/尚未安裝/);
auctionStatus={min_rank:2,min_il:0,equipment_only:true,allowed_ids:['bWeaponScroll','curAwaken'],allowed_cats:['doll'],phase:'rest',ends_at:new Date().toISOString()};auctionView='sell';assert.match(auctionHtml(),/刊登費 1 鑽/);assert.match(auctionHtml(),/每輪3小時/);assert.equal(auctionFee(100,100),1);
let confirmCall=null,operation=null;gameConfirm=(title,msg,yes)=>{confirmCall={title,msg,yes}};
auctionOp=(fn,args)=>{operation={fn,args}};showToast=()=>{};
const item=addItem('longSword');item.q='rare';item.il=40;auctionUid=item.uid;fields['auction-price']={value:'5'};
auctionList();assert(confirmCall);assert.match(confirmCall.msg,/立即支付 1 鑽/);assert.equal(operation,null);
confirmCall.yes();assert.equal(operation.fn,'auction_list');assert.equal(operation.args.p_start,5);assert.equal(operation.args.p_n,1);
operation=null;confirmCall=null;fields['auction-price'].value='4';auctionList();assert.equal(confirmCall,null);assert.equal(operation,null);
fields['auction-price'].value='5';auctionList();const original=player;player={};confirmCall.yes();assert.equal(operation,null);player=original;
auctionRows=[{id:1,item:{id:'longSword',ench:0,n:1},n:1,start_price:5,bid_amount:5,is_seller:true,seller_name:'你',state:'active',ends_at:new Date(Date.now()+10000).toISOString()}];
assert(!auctionRowsHtml().includes('取消取回'),'已有出價不能取消');
console.log('PASS：拍賣費用範例、底價驗證、刊登確認、換角保護、已有出價禁止取消、SQL未安裝提示。');
`,ctx);
