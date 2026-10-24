// 血盟前端：實際遊戲腳本隔離VM，模擬RPC與查詢，不碰真實storage／雲端。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..'), memory = new Map();
const ctx = vm.createContext({ console, assert, Image: function () {}, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
    localStorage: { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
    window: { addEventListener() {}, innerWidth: 400, innerHeight: 800 }, navigator: {}, fetch() { throw Error('禁止連線'); } });
for (const [, f] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g)) {
    if (f === 'data/main.js' || f === 'data/pwa.js') continue;
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
(async () => {
    await vm.runInContext(`(async () => {
        SIM_MODE = true; createPlayer('測試王族','royal',CLASSES.royal.base); SIM_MODE = false;
        player.created=100; player.lv=30; currentSlot=0; cloudUser={id:'account'};
        saveGame=()=>{}; cloudFlush=async()=>true; cloudSyncedSlot=async()=>true;
        cloudTimeout=async p=>p; clanReady=()=>true; clanRender=()=>{};
        const calls=[], filters=[];
        let state={clan:{id:'guild',name:'測試血盟',icon:'🏰',notice:'',member_count:2,join_mode:'open'},member:{id:'rowA',role:'leader',clan_id:'guild'}};
        let pending=null;
        cloudSb={rpc:async(fn,args)=>{calls.push({fn,args}); if(pending)await pending; return {data:state};},
            from:table=>{const q={select(){return q},eq(k,v){filters.push([table,k,v]);return q},limit(){return q},order(){return q},
                then(resolve){return Promise.resolve({data:[]}).then(resolve)}};return q;}};
        await clanLoad(true);
        assert.equal(myClan.id,'guild'); assert.equal(myClanRole,'leader');
        assert.equal(calls[0].fn,'clan_action'); assert.equal(calls[0].args.p_slot,0);
        assert.equal(calls[0].args.p_args.p_char_created,'100');
        assert.equal(calls[0].args.p_args.p_char_cls,'royal');
        const pA=player;
        player={...pA,created:101};currentSlot=1;chatChannel='clan:guild';clanReset();
        assert.equal(myClan,null);assert.equal(myClanRole,null);assert.equal(clanChannel(),null);
        assert.equal(chatChannel,'world');assert.equal(clanViewLoaded,false);
        state={clan:null,member:null};await clanLoad();
        assert.equal(myClan,null);
        assert(filters.some(x=>x[1]==='char_created'&&x[2]===101));
        assert(filters.some(x=>x[1]==='cls'&&x[2]==='royal'));
        // 舊角色的延遲回應不能把血盟填回新角色。
        let release;pending=new Promise(r=>release=r);
        const loading=clanLoad(true); await Promise.resolve();await Promise.resolve();
        player={...pA,created:102};currentSlot=2;clanReset();
        release();await loading;pending=null;
        assert.equal(myClan,null);assert.equal(myClanRole,null);assert.equal(clanLoaded,false);
        // 等待上傳時換角色，不可送出舊操作。
        let releaseFlush;cloudSyncedSlot=()=>new Promise(r=>releaseFlush=r);
        const before=calls.length; const op=clanRpc('clan_disband');
        player={...pA,created:103};currentSlot=3;releaseFlush(true);
        await assert.rejects(op,/clan character changed/);assert.equal(calls.length,before);
        cloudFlush=async()=>true;cloudSyncedSlot=async()=>false;
        await assert.rejects(clanRpc('clan_create',{}),/clan character not synced/);
        assert.equal(calls.length,before);cloudSyncedSlot=async()=>true;
        // 同帳號的兩個角色，按鈕目標是資料列ID；不是把所有角色都當成自己。
        player=pA;currentSlot=0;myClan={id:'guild',name:'測試血盟',icon:'🏰',notice:'',member_count:2,join_mode:'open'};myClanRole='leader';
        clanMembers=[{id:'rowA',user_id:'account',char_created:100,cls:'royal',name:'盟主',role:'leader',lv:30},
            {id:'rowB',user_id:'account',char_created:101,cls:'royal',name:'分身',role:'officer',lv:30}];
        const html=clanHomeHtml();assert(html.includes("clanTransfer('rowB')"));assert(!html.includes("clanTransfer('account')"));
        assert.equal((html.match(/clan-me/g)||[]).length,1);
        assert.equal(clanMemberName('rowB'),'分身');
        const raidRow=raidMemberRow('room');assert.equal(raidRow.clan_id,'guild');
        clanReset();assert.equal(raidMemberRow('room').clan_id,undefined);
    })()`, ctx);
    console.log('PASS：角色RPC／上傳核對／切角清除血盟聊天與副本身分／舊回應忽略／同帳號分身按鈕ID／個別申請查詢。');
})().catch(e => { console.error(e); process.exit(1); });
