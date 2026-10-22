// 減少上傳寫入：隔離 PGlite 載入全部正式 SQL＋save-log-throttle.sql，不連正式主機（第 101 節）。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','log@invalid','session_id',coalesce(nullif(current_setting('test.sid',true),''),'aaaa1111-0000-4000-8000-000000000001'))$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'save-device-log.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'save-log-throttle.sql', 'save-log-throttle.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }
    const uid = '66666666-6666-4666-8666-666666666666';
    await db.query('insert into auth.users values($1,$2)', [uid, 'log@invalid']);
    await db.query('insert into auth.sessions values($1,$3),($2,$3)', ['aaaa1111-0000-4000-8000-000000000001', 'aaaa1111-0000-4000-8000-000000000002', uid]);   // session-guard：登入要存在
    await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false);select set_config('request.headers','{"user-agent":"UA1","x-forwarded-for":"1.1.1.1"}',false)`);
    const stats = { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 };
    let n = 0;
    const data = extra => Object.assign({ schema: 5, t: ++n, lootProtocol: 1, lootCursor: 0, player: { created: 321, cls: 'knight', name: '寫入測試', lv: 10, exp: n, gold: 100 + n, inv: [], storage: [], equip: {}, stats } }, extra);
    const up = async (first, clientT) => {
        await db.exec('set role authenticated');
        try {
            if (first) await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,$2,$3,$4,10,$5)', [uid, clientT || n + 1, '寫入測試', 'knight', data()]);
            else await db.query('update public.dragon_saves set data=$1, client_t=$2 where user_id=$3 and slot=0', [data(), clientT || n + 1, uid]);
        } finally { await db.exec('reset role'); }
    };
    const count = async t => Number((await db.query(`select count(*) c from public.${t} where user_id=$1`, [uid])).rows[0].c);
    await up(true);
    for (let i = 0; i < 5; i++) await up(false);
    assert.equal(await count('dragon_save_log'), 1, '5 分鐘內連傳 6 次只記 1 筆歷程');
    assert.equal(await count('dragon_save_dev'), 1, '同裝置同登入只記 1 筆裝置紀錄');
    assert.equal((await db.query('select data->\'player\'->>\'exp\' e from public.dragon_saves where user_id=$1', [uid])).rows[0].e, String(n), '存檔本身照常更新');
    // 有異常一定記（裝置時間快 1 小時 → clock）
    await up(false, Date.now() + 3600e3);
    assert.equal(await count('dragon_save_log'), 2, '有異常照樣記歷程');
    assert.equal(Number((await db.query("select count(*) c from public.dragon_flags where kind='clock'")).rows[0].c), 1, '異常紀錄照常產生');
    // 換裝置／換登入馬上記
    await db.exec(`select set_config('request.headers','{"user-agent":"UA2","x-forwarded-for":"2.2.2.2"}',false)`);
    await up(false);
    await db.exec("select set_config('test.sid','aaaa1111-0000-4000-8000-000000000002',false)");
    await up(false);
    assert.equal(await count('dragon_save_dev'), 3, '換裝置、換登入各記一筆');
    // 超過 5 分鐘又會記一筆歷程（把最新一筆時間往前推）
    await db.query("update public.dragon_save_log set at = now() - interval '6 minutes' where user_id=$1", [uid]);
    await up(false);
    assert.equal(await count('dragon_save_log'), 3, '超過 5 分鐘再記一筆');
    // 最後上線：5 分鐘內不改
    const seen0 = (await db.query('select last_seen from public.dragon_profiles where user_id=$1', [uid])).rows[0].last_seen;
    await up(false);
    assert.equal(String((await db.query('select last_seen from public.dragon_profiles where user_id=$1', [uid])).rows[0].last_seen), String(seen0));
    await db.close();
    console.log('PASS：5 分鐘內連傳只記一筆歷程、同裝置只記一筆裝置紀錄、存檔照常更新；有異常、換裝置／登入、超過 5 分鐘照樣記；最後上線 5 分鐘內不改。');
})().catch(e => { console.error(e); process.exit(1); });
