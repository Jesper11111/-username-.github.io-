// 後端掉寶減量：隔離 PGlite 載入全部正式 SQL＋loot-batch.sql，驗證批次結算、重送、釋放不重寫、清理（第 104 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','batch@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'save-log-throttle.sql', 'loot-batch.sql', 'loot-batch.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }
    const uid = '77777777-7777-4777-8777-777777777777', ch = '123|knight';
    await db.query('insert into auth.users values($1,$2)', [uid, 'batch@invalid']);
    await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false)`);
    const p = { created: 123, cls: 'knight', name: '批次測試', lv: 5, exp: 0, gold: 300, inv: [], storage: [], equip: {}, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 },
        loc: { type: 'zone', id: 'island' }, quests: { ch: 0, active: false }, towerMax: 10 };
    const sig = (await db.query('select public.dragon_save_sig($1,0,$2) as s', [uid, p])).rows[0].s;
    await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,5,$4)', [uid, p.name, p.cls, { schema: 5, player: p, sig, lootProtocol: 1, lootCursor: 0 }]);
    await db.exec('update public.dragon_loot_config set enabled=true');
    const as = async (sql, a) => { await db.exec('set role authenticated'); try { return (await db.query(sql, a)).rows[0].v; } finally { await db.exec('reset role'); } };
    const age = () => db.exec("update public.dragon_loot_jobs set created_at=clock_timestamp()-interval '1 second'");
    const spawn = async () => (await as('select public.loot_spawn(0,$1,$2,false,null) as v', [ch, crypto.randomUUID()])).map(x => x.ticket);
    const count = async t => Number((await db.query(`select count(*) c from public.${t}`)).rows[0].c);

    // ① 一批結算多隻：1 張收據、序號 +1、憑證刪除
    let tickets = [];
    for (let i = 0; i < 12; i++) { tickets.push(...await spawn()); await age(); }   // 還沒結算的擊殺超過舊上限 8 也能繼續生怪（age 避開每秒 12 張的速率限制）
    await age();
    const batch = crypto.randomUUID();
    const r = await as('select public.loot_finish_batch($1,$2) as v', [batch, tickets]);
    assert.equal(r.cursor, 1); assert.equal(r.char, ch); assert.equal(r.slot, 0); assert(Array.isArray(r.items));
    assert.equal(await count('dragon_loot_receipts'), 1); assert.equal(await count('dragon_loot_jobs'), 0, '用掉的憑證刪除');
    // 回應遺失重送：同一張收據，不重抽
    const again = await as('select public.loot_finish_batch($1,$2) as v', [batch, tickets]);
    assert.equal(again.cursor, 1); assert.equal(JSON.stringify(again.items), JSON.stringify(r.items));
    // 待領讀得到新收據；確認入帳後就不再列出
    let pend = await as('select public.loot_pending(0,$1) as v', [ch]);
    assert.equal(pend.length, 1); assert.equal(pend[0].cursor, 1); assert.equal(pend[0].id, batch);
    await db.exec('set role authenticated');
    await db.query(`update public.dragon_saves set data = jsonb_set(data, '{lootCursor}', '1') where user_id=$1 and slot=0`, [uid]);
    await db.exec('reset role');
    assert.equal((await as('select public.loot_pending(0,$1) as v', [ch])).length, 0);

    // ② 太快的整批重試、不能混角色、張數限制、全部作廢回 empty
    const fast = await spawn();
    await assert.rejects(as('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), fast]), /loot too soon/);
    await assert.rejects(as('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), []]), /loot invalid batch/);
    await assert.rejects(as('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), Array.from({ length: 51 }, () => crypto.randomUUID())]), /loot invalid batch/);
    // ③ 釋放：只改還沒作廢的，已作廢的不重寫
    await as('select public.loot_release(0,$1,$2) as v', [ch, []]);
    const x1 = (await db.query('select xmin::text x from public.dragon_loot_jobs where id=$1', [fast[0]])).rows[0].x;
    await as('select public.loot_release(0,$1,$2) as v', [ch, []]);
    assert.equal((await db.query('select xmin::text x from public.dragon_loot_jobs where id=$1', [fast[0]])).rows[0].x, x1, '已作廢的憑證不再被改寫');
    await age();
    assert.equal((await as('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), fast])).empty, true, '全部作廢：回 empty 並清掉');
    assert.equal(await count('dragon_loot_jobs'), 0);
    // 舊流程單隻結算仍可用，待領同時列出舊帳本與新收據
    const one = await spawn(); await age();
    const old = await as('select public.loot_finish($1) as v', [one[0]]);
    assert.equal(old.cursor, 2);
    await as('select public.loot_release(0,$1,$2) as v', [ch, []]);   // 同一群其他沒打的怪作廢
    const two = await spawn(); await age();
    const nb = await as('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), two]);
    assert.equal(nb.cursor, 3);
    pend = await as('select public.loot_pending(0,$1) as v', [ch]);
    assert.deepEqual(pend.map(x => x.cursor), [2, 3], '舊帳本與新收據依序號列出');

    // ④ 清理：已確認且超過 3 天的收據／帳本、作廢超過 1 小時、超過 12 小時沒結算的憑證
    await db.exec('set role authenticated');
    await db.query(`update public.dragon_saves set data = jsonb_set(data, '{lootCursor}', '3') where user_id=$1 and slot=0`, [uid]);
    await db.exec('reset role');
    await db.exec("update public.dragon_loot_receipts set created_at=now()-interval '4 days'; update public.dragon_loot_jobs set created_at=now()-interval '4 days'");
    const stale = await spawn(); await age(); const cancel = await spawn(); await age(); const live = await spawn(); await age();
    // 一次生怪可能是一群（多張憑證），整群一起設定時間
    await db.query("update public.dragon_loot_jobs set created_at=now()-interval '4 days' where result is not null");
    await db.query("update public.dragon_loot_jobs set created_at=now()-interval '13 hours' where id=any($1)", [stale]);
    await db.query(`update public.dragon_loot_jobs set created_at=now()-interval '2 hours', context=context||'{"cancelled":true}' where id=any($1) or context ? 'cancelled'`, [cancel]);
    await as('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), live]);
    assert.equal(await count('dragon_loot_receipts'), 1, '只剩這次的新收據');
    assert.equal(await count('dragon_loot_jobs'), 0, '舊帳本、過期與作廢的憑證都清掉');
    // 沒確認的不清
    await db.exec("update public.dragon_loot_receipts set created_at=now()-interval '4 days'");
    const more = await spawn(); await age();
    await as('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), more]);
    assert.equal(await count('dragon_loot_receipts'), 2, '還沒確認入帳的收據不刪');
    // 權限：玩家不能直接讀收據表
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from public.dragon_loot_receipts'), /permission denied/);
    await db.exec('reset role');
    await db.close();
    console.log('PASS：一批多隻 1 張收據、憑證刪除、重送同收據、待領新舊並列、太快整批重試、張數限制、作廢不重寫、全作廢回 empty、舊單隻結算相容、3 天／1 小時／12 小時清理、未確認不刪、收據表不可直讀、未結算擊殺可超過 8。');
})().catch(e => { console.error(e); process.exit(1); });
