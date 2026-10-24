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
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'market-v2.sql']) {
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
    const sword = { uid: 5, id: 'longSword', n: 1, ench: 0 };
    await mk(A, 1, 500, [sword, { uid: 6, id: 'redPotion', n: 10 }]);
    await mk(B, 2, 1000, []);
    const list = (u, uid, n, price, cat) => as(u, 'select public.market_list2(0,$1,$2,$3,$4,$5,$6) v', [uid, n, price, 'S', '商品', cat]);

    // 舊 RPC 停用、內部函式不能直接呼叫
    await assert.rejects(as(A, 'select public.market_list(0,$1,10,$2,$3,$4) v', [sword, 'A', 'x', 'weapon']), /market client outdated/);
    await assert.rejects(as(B, 'select public.market_buy(1,0,$1) v', ['B']), /market client outdated/);
    await assert.rejects(as(A, 'select public.market_cancel(1) v'), /market client outdated/);
    await assert.rejects(as(A, 'select public.dragon_inv_add($1,$2) v', [{}, {}]), /permission denied/);
    await assert.rejects(as(A, 'select public.dragon_market_row(0,true) v'), /permission denied/);

    // ① 上架只收 uid／數量：交易所存的是雲端存檔裡那一件，存檔同時拿掉
    let r = await list(A, 5, 1, 10, 'weapon');
    let m = (await db.query('select item from public.dragon_market where id=$1', [r.id])).rows[0].item;
    assert.deepEqual(m, sword);
    let a = await save(A);
    assert(!a.data.player.inv.some(x => x.uid === 5)); assert.equal(a.data.vaultSeq, 1); assert.equal(a.sig_ok, true);
    await assert.rejects(list(A, 5, 1, 10, 'weapon'), /item not in cloud save/);   // 同一件不能再上架

    // ② 上架→下架循環：下架放回存檔，數量守恆（不再多出來）
    for (let i = 0; i < 3; i++) {
        const id = (await list(A, (await save(A)).data.player.inv.find(x => x.id === 'redPotion').uid, 10, 10, 'potion')).id;
        assert.equal((await save(A)).data.player.inv.filter(x => x.id === 'redPotion').length, 0);
        await as(A, 'select public.market_cancel2($1,0) v', [id]);
    }
    a = await save(A);
    assert.equal(a.data.player.inv.find(x => x.id === 'redPotion').n, 10, '藥水仍是 10 瓶');
    await assert.rejects(as(A, 'select public.market_cancel2($1,0) v', [r.id + 1]), /not available/);
    // 部分上架：可堆疊只拿走上架的數量
    const potUid = a.data.player.inv.find(x => x.id === 'redPotion').uid;
    const part = await list(A, potUid, 4, 1000, 'potion');
    assert.equal((await save(A)).data.player.inv.find(x => x.uid === potUid).n, 6);
    await assert.rejects(list(A, potUid, 7, 10, 'potion'), /bad amount/);
    // 下架裝備：給新 uid，詞綴保留
    await as(A, 'select public.market_cancel2($1,0) v', [r.id]);
    a = await save(A);
    const back = a.data.player.inv.find(x => x.id === 'longSword');
    assert(back && back.uid !== 5 && back.ench === 0); assert.equal(a.sig_ok, true);

    // ③ 買家金幣真的扣：1000 金幣買一件 1000，第二件買不到；道具直接進買家存檔
    const s2 = await list(A, back.uid, 1, 1000, 'weapon');
    let b = await as(B, 'select public.market_buy2($1,0,$2) v', [part.id, 'B']);
    assert.equal(b.gold, -1000);
    await assert.rejects(as(B, 'select public.market_buy2($1,0,$2) v', [s2.id, 'B']), /not enough gold/);
    const bs = await save(B);
    assert.equal(Number(bs.data.player.gold), 0); assert.equal(bs.data.player.inv.find(x => x.id === 'redPotion').n, 4); assert.equal(bs.sig_ok, true);
    assert.equal(bs.data.vaultSeq, 1);
    await assert.rejects(as(B, 'select public.market_buy2($1,0,$2) v', [part.id, 'B']), /not available/);
    // 買家不用再交貨；賣家入帳只有一筆
    const pend = await as(B, 'select public.market_pending() v');
    assert.equal(pend.bought.length, 0);
    const sold = (await as(A, 'select public.market_pending() v')).sold;
    assert.equal(sold.length, 1); assert.equal(Number(sold[0].price) - Number(sold[0].fee), 950);
    // 自己的不能買
    await assert.rejects(as(A, 'select public.market_buy2($1,0,$2) v', [s2.id, 'A']), /own listing/);
    // 舊存檔蓋不回（共用倉庫序號守衛）
    await db.exec(`select set_config('request.jwt.claim.sub','${B}',false);set role authenticated`);
    await assert.rejects(db.query('update public.dragon_saves set data = data || \'{"vaultSeq":0}\'::jsonb where user_id=$1 and slot=0', [B]), /vault seq conflict/);
    await db.exec('reset role');

    // ④ 任務道具：玩家謊報分類也不能上架、不能存共用倉庫；分類以伺服器道具表為準（第 117 節）
    const addInv = async (u, items) => {   // 管理者改存檔：序號照舊、重算簽章
        const d = (await save(u)).data; d.player.inv.push(...items);
        d.sig = (await db.query('select public.dragon_save_sig($1,0,$2) s', [u, d.player])).rows[0].s;
        await db.query('update public.dragon_saves set data=$2 where user_id=$1 and slot=0', [u, d]);
    };
    await db.query("update public.dragon_saves set data=jsonb_set(data,'{player,gold}','100000') where user_id=$1 and slot=0", [A]);
    await addInv(A, [{ uid: 90, id: 'q_knight_0', n: 1 }, { uid: 91, id: 'redPotion', n: 30 }]);
    await assert.rejects(list(A, 90, 1, 10, 'material'), /not tradeable/);
    await assert.rejects(as(A, 'select public.vault_put2(0,$1,1,null,$2) v', [90, 'x']), /not tradeable/);
    await assert.rejects(as(A, 'select public.dragon_item_cat($1) v', ['redPotion']), /permission denied/);
    const lie = await list(A, 91, 1, 10, 'weapon');
    assert.equal((await db.query('select cat from public.dragon_market where id=$1', [lie.id])).rows[0].cat, 'potion', '分類不採用玩家送來的');

    // ⑤ 名額只算沒過期的：過期沒取回的不佔名額，沒過期的滿 10 件就擋
    await db.query("delete from public.dragon_market where seller=$1 and state='active'", [A]);
    const fill = (exp) => db.query(`insert into public.dragon_market(seller,seller_name,slot,item,item_id,uid,n,cat,name,price,fee,expires_at)
        select $1,'S',0,'{"id":"redPotion","n":1}','redPotion',1000+g,1,'potion','x',10,1,now()+$2::interval from generate_series(1,10) g`, [A, exp]);
    await fill('-1 hour');
    await list(A, 91, 1, 10, 'potion');
    await db.query("delete from public.dragon_market where seller=$1 and state='active'", [A]);
    await fill('1 hour');
    await assert.rejects(list(A, 91, 1, 10, 'potion'), /too many listings/);
    await db.close();
    console.log('PASS：舊交易所 RPC 停用；上架存的是存檔那件且同時扣掉、上下架數量守恆、部分上架、下架新 uid、買家金幣真的扣不能重複買、買到直接入帳、賣家只入帳一次、舊存檔蓋不回；任務道具謊報分類也不能上架／存倉庫、分類以伺服器為準、過期商品不佔名額。');
})().catch(e => { console.error(e); process.exit(1); });
