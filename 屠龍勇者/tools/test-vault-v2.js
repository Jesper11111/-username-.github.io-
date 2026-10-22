// 共用倉庫防複製 v2：在隔離 PostgreSQL（PGlite）載入現有正式 SQL＋vault-v2.sql，不連正式主機（第 93 節）。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid','role','authenticated')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'vault-v2.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }
    const uid = '22222222-2222-4222-8222-222222222222';
    await db.query('insert into auth.users values($1,$2)', [uid, 'vault-test@invalid']);
    await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false);update public.dragon_loot_config set enabled=true`);
    const sword = { uid: 5, id: 'longSword', n: 1, ench: 3, q: 'rare', af: [['str', 2]] };
    const p = { created: 456, cls: 'knight', name: '倉庫測試', lv: 10, exp: 0, gold: 5000, nextUid: 20,
        inv: [sword, { uid: 6, id: 'redPotion', n: 10 }], storage: [], equip: {}, loc: { type: 'town', id: 'talking' }, quests: { ch: 0, active: false }, towerMax: 10 };
    const sigOf = async pl => (await db.query('select public.dragon_save_sig($1,0,$2) as s', [uid, pl])).rows[0].s;
    await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,10,$4)',
        [uid, p.name, p.cls, { schema: 5, t: 1, player: p, sig: await sigOf(p), lootProtocol: 1, lootCursor: 0 }]);
    const call = async (sql, args) => { await db.exec('set role authenticated'); try { return (await db.query(sql, args)).rows[0].v; } finally { await db.exec('reset role'); } };
    const fails = async (sql, args, re) => { await assert.rejects(call(sql, args), re); };
    const row = async () => (await db.query('select data, client_t, sig_ok from public.dragon_saves where user_id=$1 and slot=0', [uid])).rows[0];
    const upload = async data => { await db.exec('set role authenticated'); try { await db.query('update public.dragon_saves set data=$1 where user_id=$2 and slot=0', [data, uid]); } finally { await db.exec('reset role'); } };
    const old = (await row()).data;

    // ① 舊 RPC 停用
    await fails('select public.vault_put(0,null,100,null) as v', [], /vault client outdated/);
    await fails('select public.vault_take(0,null,100) as v', [], /vault client outdated/);
    // ② 內部函式玩家不能直接呼叫
    await fails('select public.dragon_vault_commit(0,$1) as v', [p], /permission denied/);

    // ③ 存金幣：雲端存檔直接扣金額＋手續費，序號 +1，簽章仍正確
    let r = await call('select public.vault_put2(0,null,null,1000,null) as v');
    assert.equal(r.gold, -1100); assert.equal(r.seq, 1);
    let cur = await row();
    assert.equal(Number(cur.data.player.gold), 3900); assert.equal(cur.data.vaultSeq, 1); assert.equal(Number(cur.client_t), r.t); assert.equal(cur.sig_ok, true);
    assert.equal(Number((await db.query('select gold from public.dragon_vault where user_id=$1', [uid])).rows[0].gold), 1000);
    // 同一筆錢不能一直存：金幣真的扣掉了
    await call('select public.vault_put2(0,null,null,3000,null) as v');
    await fails('select public.vault_put2(0,null,null,1000,null) as v', [], /not enough gold/);
    assert.equal(Number((await row()).data.player.gold), 800);

    // ④ 舊存檔（存入前的那份）蓋不回去；偽造較大的序號也不行；序號正確才收
    await assert.rejects(upload(old), /vault seq conflict/);
    await assert.rejects(upload(Object.assign({}, old, { vaultSeq: 99 })), /vault seq conflict/);
    cur = await row();
    await upload(Object.assign({}, cur.data, { t: 2 }));

    // ⑤ 存道具：從雲端存檔拿掉、倉庫存的是存檔裡那一件（不是玩家送來的內容）
    await db.exec('reset role');
    r = await call('select public.vault_put2(0,5,1,null,$1) as v', ['+3 長劍']);
    cur = await row();
    assert(!cur.data.player.inv.some(x => x.uid === 5)); assert.equal(Number(cur.data.player.gold), 700); assert.equal(cur.data.vaultSeq, 3);
    const stored = (await db.query('select item from public.dragon_vault_items where id=$1', [r.id])).rows[0].item;
    assert.deepEqual(stored, sword);
    await fails('select public.vault_put2(0,5,1,null,null) as v', [], /item not in cloud save/);   // 同一件不能再存
    // 可堆疊：存一部分，剩下的留在存檔
    const pot = await call('select public.vault_put2(0,6,4,null,null) as v');
    cur = await row();
    assert.equal(cur.data.player.inv.find(x => x.uid === 6).n, 6);
    await fails('select public.vault_put2(0,6,7,null,null) as v', [], /bad amount/);
    assert.equal(Number(cur.data.player.gold), 600);

    // ⑥ 取出：道具直接加進雲端存檔（裝備給新 uid、可堆疊併入同一疊），扣手續費
    r = await call('select public.vault_take2(0,$1,null) as v', [stored ? (await db.query('select id from public.dragon_vault_items where uid=5')).rows[0].id : 0]);
    assert.equal(r.gold, -100); assert.equal(r.item.ench, 3);
    cur = await row();
    const back = cur.data.player.inv.find(x => x.id === 'longSword');
    assert.equal(back.uid, 20); assert.equal(cur.data.player.nextUid, 21); assert.deepEqual(back.af, sword.af);
    await fails('select public.vault_take2(0,$1,null) as v', [(await db.query('select id from public.dragon_vault_items where uid=5')).rows[0].id], /not available/);
    await call('select public.vault_take2(0,$1,null) as v', [pot.id]);
    cur = await row();
    assert.equal(cur.data.player.inv.filter(x => x.id === 'redPotion').length, 1);
    assert.equal(cur.data.player.inv.find(x => x.id === 'redPotion').n, 10);
    // 取金幣
    r = await call('select public.vault_take2(0,null,2000) as v');
    assert.equal(r.gold, 1900);
    await fails('select public.vault_take2(0,null,5000) as v', [], /bad amount/);
    cur = await row();
    assert.equal(Number(cur.data.player.gold), 400 + 1900); assert.equal(cur.sig_ok, true); assert.equal(cur.data.vaultSeq, 7);
    assert.equal(cur.data.lootCursor, 0);   // 掉寶收據不受影響

    // ⑦ 手續費不夠、沒存檔
    await upload(Object.assign({}, cur.data, { player: Object.assign({}, cur.data.player, { gold: 50 }), sig: await sigOf(Object.assign({}, cur.data.player, { gold: 50 })) }));
    await fails('select public.vault_put2(0,6,1,null,null) as v', [], /not enough gold/);
    await fails('select public.vault_take2(1,null,1) as v', [], /no cloud save/);
    await db.close();
    console.log('PASS：舊 RPC 停用、金幣存入真的扣款不能重複存、舊存檔／偽造序號蓋不回、道具以雲端存檔那件為準、可堆疊部分存入、取出直接入存檔（新 uid／併疊）、簽章與掉寶收據相容。');
})().catch(e => { console.error(e); process.exit(1); });
