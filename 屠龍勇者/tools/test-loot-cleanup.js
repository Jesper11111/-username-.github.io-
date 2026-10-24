// 掉寶紀錄每日清理：隔離 PGlite 載入正式 SQL＋loot-cleanup.sql（去掉 pg_cron 排程），驗證全帳號清理只刪該刪的（第 116 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','clean@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'save-log-throttle.sql', 'loot-batch.sql', 'loot-cleanup.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        if (file === 'loot-cleanup.sql') sql = sql.slice(0, sql.indexOf('create extension if not exists pg_cron'));   // PGlite 沒有 pg_cron
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }
    // 兩個玩家：A 已確認到 5，B 只確認到 1（B 不在線，舊規則永遠不會清 B）
    const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', ch = '1|knight';
    await db.query("insert into public.dragon_loot_state(user_id,char_id,issued,acknowledged) values($1,$3,5,5),($2,$3,5,1)", [A, B, ch]);
    const job = (u, cur, result, ctx, ago) => db.query(`insert into public.dragon_loot_jobs(user_id,slot,char_id,event_key,cursor,result,context,created_at) values($1,0,$2,$3,$4,$5,$6,now()-$7::interval)`,
        [u, ch, crypto.randomUUID(), cur, result, ctx, ago]);
    const rec = (u, cur, ago) => db.query(`insert into public.dragon_loot_receipts(user_id,char_id,slot,cursor,batch_id,items,created_at) values($1,$2,0,$3,$4,'[]',now()-$5::interval)`, [u, ch, cur, crypto.randomUUID(), ago]);
    for (const u of [A, B]) {
        await rec(u, 1, '4 days');                          // 已確認＋超過 3 天 → 刪（A、B 都是）
        await rec(u, 2, '4 days');                          // A 刪；B 沒確認 → 留
        await rec(u, 3, '1 day');                           // 未滿 3 天 → 留
        await job(u, 4, '[]', {}, '4 days');                // A 刪；B 沒確認 → 留
        await job(u, null, null, { cancelled: true }, '2 hours');   // 作廢超過 1 小時 → 刪
        await job(u, null, null, {}, '13 hours');           // 超過 12 小時沒結算 → 刪
        await job(u, null, null, {}, '10 minutes');         // 進行中 → 留
    }
    await job(B, 1, '[]', {}, '4 days');                    // 已確認舊帳本 → 刪
    const r = (await db.query('select public.loot_cleanup_all() as v')).rows[0].v;
    assert.deepEqual(r, { receipts: 3, jobs: 6 });
    const left = async (t, u) => (await db.query(`select coalesce(string_agg(coalesce(cursor::text,'live'),',' order by cursor),'') s from public.${t} where user_id=$1`, [u])).rows[0].s;
    assert.equal(await left('dragon_loot_receipts', A), '3');
    assert.equal(await left('dragon_loot_receipts', B), '2,3', '沒確認入帳的收據不刪');
    assert.equal(await left('dragon_loot_jobs', A), 'live');
    assert.equal(await left('dragon_loot_jobs', B), '4,live', '沒確認入帳的帳本不刪');
    assert.deepEqual((await db.query('select public.loot_cleanup_all() as v')).rows[0].v, { receipts: 0, jobs: 0 }, '重跑不多刪');
    // 權限：玩家不能呼叫
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select public.loot_cleanup_all()'), /permission denied/);
    await db.exec('reset role');
    await db.close();
    console.log('PASS：全帳號清理（含不在線玩家）、已確認超過 3 天才刪、未確認的收據／帳本保留、作廢 1 小時／未結算 12 小時刪除、進行中保留、重跑不多刪、玩家不能呼叫。');
})().catch(e => { console.error(e); process.exit(1); });
