// 交易所防複製 v2：隔離 PGlite 載入正式 SQL＋vault-v2＋market-v2，重跑 v1 的三種複製手法確認都擋下（第 95 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'auction.sql', 'auction.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }
    await db.exec('update public.dragon_loot_config set enabled=true');
    const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const stats = { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 };
    const mk = async (u, created, gold, inv) => {
        await db.query('insert into auth.users values($1,$2)', [u, u.slice(0, 4) + '@invalid']);
        const p = { created, cls: 'knight', name: 'P' + created, lv: 20, exp: 0, gold, nextUid: 50, inv, storage: [], equip: {}, stats, loc: { type: 'town', id: 'talking' }, quests: { ch: 0, active: false }, towerMax: 10 };
        await db.exec(`select set_config('request.jwt.claim.sub','${u}',false)`);
        const sig = (await db.query('select public.dragon_save_sig($1,0,$2) s', [u, p])).rows[0].s;
        await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,20,$4)', [u, p.name, p.cls, { schema: 5, player: p, sig, lootProtocol: 1, lootCursor: 0 }]);
    };
    const as = async (u, sql, a) => { await db.exec(`select set_config('request.jwt.claim.sub','${u}',false);set role authenticated`); try { return (await db.query(sql, a)).rows[0].v; } finally { await db.exec('reset role'); } };
    const save = async u => (await db.query('select data, sig_ok from public.dragon_saves where user_id=$1 and slot=0', [u])).rows[0];
    const C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    await db.exec(fs.readFileSync(path.join(__dirname,'loot-catalog.sql'),'utf8'));
    const sword={uid:5,id:'longSword',n:1,ench:3,q:'rare',il:40,af:[{stat:'dmg',v:3}]};
    await mk(A,1,1000,[sword,{uid:6,id:'shortSword',n:1,ench:0,q:'magic',il:20},{uid:7,id:'redPotion',n:20}]);
    await mk(B,2,1000,[]);await mk(C,3,1000,[]);
    await db.query('insert into public.dragon_wallet(user_id,diamonds)values($1,100),($2,100),($3,100)',[A,B,C]);
    const list=(u,uid,start=5)=>as(u,'select public.auction_list(0,$1,1,$2,$3) v',[uid,start,'測試裝備']);
    const browse=(u,mine=false)=>as(u,'select public.auction_browse($1) v',[mine]);
    const bid=(u,id,amount)=>as(u,'select public.auction_bid(0,$1,$2) v',[id,amount]);
    const claim=(u,id)=>as(u,'select public.auction_claim(0,$1) v',[id]);
    const wallet=async u=>(await db.query('select diamonds from public.dragon_wallet where user_id=$1',[u])).rows[0].diamonds;
    const start=async()=>{await db.exec("update public.dragon_auction_config set first_open=clock_timestamp()+interval '1 millisecond'");await new Promise(r=>setTimeout(r,10));};
    await assert.rejects(as(A,"select public.auction_configure(0,false,0,'round','{}','{}') v"),/admin only/);
    await db.query('insert into public.dragon_admins(user_id)values($1)',[A]);
    await as(A,"select public.auction_configure(2,true,0,'round',array['bWeaponScroll','bArmorScroll','curAwaken','curOracle'],array['doll']) v");
    assert.equal((await browse(A)).status.is_admin,true);
    await db.query('delete from public.dragon_admins where user_id=$1',[A]);
    await assert.rejects(as(A,'select * from public.dragon_auctions'),/permission denied/);
    await assert.rejects(as(A,'select public.dragon_auction_tick() v'),/permission denied/);
    await assert.rejects(list(A,5,4),/bad starting price/);
    await assert.rejects(list(A,5,1000001),/bad starting price/);
    await assert.rejects(list(A,6),/quality too low/);
    await assert.rejects(list(A,7),/quality too low/);
    let a=await list(A,5);assert.equal(await wallet(A),99);assert.equal((await save(A)).data.player.inv.some(x=>x.uid===5),false);
    assert.equal((await save(A)).sig_ok,true);assert.equal((await save(A)).data.vaultSeq,1);
    await assert.rejects(list(A,6),/already registered/);
    let view=await browse(A,true);assert.equal(view.rows[0].state,'queued');assert.equal(view.status.phase,'rest');assert.equal(view.rows[0].seller,undefined);assert(view.rows[0].ticket);
    await start();view=await browse(B);assert.equal(view.rows.length,1);assert.equal(view.rows[0].state,'active');
    await assert.rejects(bid(A,a.id,5),/own auction/);await assert.rejects(bid(B,a.id,6),/bid too low/);
    await bid(B,a.id,5);assert.equal(await wallet(B),95);
    await assert.rejects(as(A,'select public.auction_cancel(0,$1) v',[a.id]),/auction has bids/);
    await assert.rejects(bid(C,a.id,5),/bid too low/);
    await bid(C,a.id,6);assert.equal(await wallet(C),94);assert.equal(await wallet(B),100);
    assert.equal((await browse(B,true)).rows.length,1,'被超標仍可看自己的出價紀錄');
    await bid(C,a.id,7);assert.equal(await wallet(C),93,'同最高出價者只補差額');
    await db.exec('update public.dragon_wallet set diamonds=0 where user_id=\''+B+'\'');
    await assert.rejects(bid(B,a.id,8),/not enough diamonds/);assert.equal(await wallet(C),93);
    await db.query("update public.dragon_auctions set ends_at=clock_timestamp()-interval '1 second' where id=$1",[a.id]);
    await assert.rejects(bid(B,a.id,8),/auction ended/);
    let sold=await claim(A,a.id);assert.equal(sold.net,6);assert.equal(await wallet(A),105);
    await assert.rejects(claim(A,a.id),/nothing to claim/);
    let got=await claim(C,a.id);assert.deepEqual(got.item,{...sword,n:1});
    assert.equal((await save(C)).data.player.inv.filter(x=>x.id==='longSword').length,1);
    await assert.rejects(claim(C,a.id),/nothing to claim/);await assert.rejects(claim(B,a.id),/nothing to claim/);
    assert.equal((await save(C)).sig_ok,true);
    // 自訂底價成交仍只收1基本費；超過底價才5%進位。
    assert.equal((await db.query('select public.dragon_auction_fee(100,100) v')).rows[0].v,1);
    assert.equal((await db.query('select public.dragon_auction_fee(30,5) v')).rows[0].v,2);
    assert.equal((await db.query('select public.dragon_auction_fee(21,5) v')).rows[0].v,2);
    // 12個新帳號排隊：每輪最多10，未入選保留，休息期間無可競標商品。
    const users=[];
    for(let i=0;i<12;i++){const u='dddddddd-dddd-4ddd-8ddd-'+String(i).padStart(12,'0');users.push(u);await mk(u,100+i,1000,[{...sword,uid:5}]);await db.query('insert into public.dragon_wallet(user_id,diamonds)values($1,10)',[u]);await list(u,5,30);}
    await db.exec("update public.dragon_auction_config set first_open=clock_timestamp()-interval '3 hours 30 minutes'");
    assert.equal((await browse(A)).status.phase,'rest');assert.equal((await browse(A)).rows.length,0);
    await db.exec('delete from public.dragon_auction_rounds where id=0 and not exists(select 1 from public.dragon_auctions where round_id=0)');
    // 下一輪id1，既有round0歷史保留。
    await db.exec("update public.dragon_auction_config set first_open=clock_timestamp()-interval '5 hours'+interval '1 millisecond'");await new Promise(r=>setTimeout(r,10));
    view=await browse(A);assert.equal(view.rows.length,10);assert.equal(view.queue_count,2);assert.equal(view.status.phase,'active');
    const activeIds=new Set(view.rows.map(x=>x.id));assert.equal(activeIds.size,10);
    assert.equal((await browse(A)).rows.length,10,'刷新不重新抽籤');
    const queued=(await db.query("select id,seller from public.dragon_auctions where state='queued' order by id")).rows;
    const cancelled=await as(queued[0].seller,'select public.auction_cancel(0,$1) v',[queued[0].id]);
    assert(cancelled.item);assert.equal(await wallet(queued[0].seller),9,'取消不退刊登費');
    await assert.rejects(as(queued[0].seller,'select public.auction_cancel(0,$1) v',[queued[0].id]),/not available/);
    // 結束後流標可領回，且不重複發物品。
    const unsold=view.rows[0],owner=(await db.query('select seller from public.dragon_auctions where id=$1',[unsold.id])).rows[0].seller;
    await db.query("update public.dragon_auctions set ends_at=clock_timestamp()-interval '1 second' where id=$1",[unsold.id]);
    assert((await claim(owner,unsold.id)).item);await assert.rejects(claim(owner,unsold.id),/nothing to claim/);
    // 祝福卷軸與頂級通貨白名單：每次僅拿一個，不讓普通藥水冒充品質混入。
    const D='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    await mk(D,999,1000,[{uid:5,id:'bWeaponScroll',n:3},{uid:6,id:'curAwaken',n:2},{uid:7,id:'redPotion',n:10,q:'rare'}]);
    await db.query('insert into public.dragon_wallet(user_id,diamonds)values($1,10)',[D]);
    let white=await list(D,5);assert.equal((await save(D)).data.player.inv.find(x=>x.uid===5).n,2);
    await as(D,'select public.auction_cancel(0,$1) v',[white.id]);assert.equal((await save(D)).data.player.inv.find(x=>x.id==='bWeaponScroll').n,3);
    white=await list(D,6);await as(D,'select public.auction_cancel(0,$1) v',[white.id]);
    await assert.rejects(list(D,7),/quality too low/);
    // 兩個帳號同時搶同一價：只接受一筆，另一筆不扣鑽（PGlite交易排程隔離）。
    const race=view.rows.find(x=>x.id!==unsold.id);await db.exec("update public.dragon_wallet set diamonds=100");
    const raceBid=u=>db.transaction(async tx=>{
        await tx.exec("select set_config('request.jwt.claim.sub','"+u+"',true);set local role authenticated");
        return (await tx.query('select public.auction_bid(0,$1,$2) v',[race.id,race.start_price])).rows[0].v;
    });
    const raceResults=await Promise.allSettled([raceBid(B),raceBid(C)]);
    assert.equal(raceResults.filter(x=>x.status==='fulfilled').length,1);assert.equal((await wallet(B))+(await wallet(C)),200-race.start_price);
    const waiting=(await db.query("select id,ticket from public.dragon_auctions where state='queued'")).rows;
    assert.equal(waiting.length,1);
    await db.exec("update public.dragon_auctions set ends_at=clock_timestamp()-interval '1 second' where state='active';update public.dragon_auction_config set first_open=clock_timestamp()-interval '10 hours'+interval '1 millisecond'");await new Promise(r=>setTimeout(r,10));
    const nextRound=await browse(A);assert.equal(nextRound.rows.length,1);assert.equal(nextRound.rows[0].id,Number(waiting[0].id));assert.equal(nextRound.rows[0].ticket,Number(waiting[0].ticket));
    await db.close();console.log('PASS：3h／2h輪次、10件抽籤、排隊保留／一帳一件、黃裝門檻與祝卷通貨白名單、鑽石託管／退款／同價搶標、費用、一次領取、存檔序號與權限。');
})().catch(e=>{console.error(e);process.exit(1);});
