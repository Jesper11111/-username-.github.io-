// 信任名單＋已處理 24 小時內有效：隔離 PGlite 載入正式 SQL＋flag-trust.sql（第 111 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','trust@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'save-device-log.sql', 'anticheat.sql', 'save-log-throttle.sql', 'flag-trust.sql', 'flag-trust.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }
    const P = '88888888-8888-4888-8888-888888888888', ADMIN = '99999999-9999-4999-8999-999999999999';
    await db.query('insert into auth.users values($1,$2),($3,$4)', [P, 'player@x', ADMIN, 'admin@x']);
    await db.query('insert into public.dragon_admins(user_id) values($1)', [ADMIN]);
    const stats = { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 };
    let n = 0;
    const data = () => ({ schema: 5, t: ++n, player: { created: 555, cls: 'knight', name: '時間不準', lv: 10, exp: n, gold: 100, inv: [], storage: [], equip: {}, stats } });
    const upload = async (first) => {   // 裝置時間快 1 小時 → 每次都符合 clock 條件
        const ct = Date.now() + 3600e3 + n;
        await db.exec(`select set_config('request.jwt.claim.sub','${P}',false);set role authenticated`);
        try {
            if (first) await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,$2,$3,$4,10,$5)', [P, ct, '時間不準', 'knight', data()]);
            else await db.query('update public.dragon_saves set data=$1, client_t=$2 where user_id=$3 and slot=0', [data(), ct, P]);
        } finally { await db.exec('reset role'); }
    };
    const flagN = async () => Number((await db.query("select count(*) c from public.dragon_flags where user_id=$1 and kind='clock'", [P])).rows[0].c);
    const hold = async () => (await db.query('select public.dragon_market_hold($1) h', [P])).rows[0].h;
    const asAdmin = async (sql, a) => { await db.exec(`select set_config('request.jwt.claim.sub','${ADMIN}',false);set role authenticated`); try { return (await db.query(sql, a)).rows; } finally { await db.exec('reset role'); } };

    await upload(true);
    assert.equal(await flagN(), 1); assert.equal(await hold(), true, '未處理的紀錄會擋交易所');
    // ① 按「已處理」：之後 24 小時內同樣情況不再記、也不擋
    await asAdmin('update public.dragon_flags set resolved=true where user_id=$1', [P]);
    for (let i = 0; i < 3; i++) await upload(false);
    assert.equal(await flagN(), 1, '已處理後 24 小時內不重記'); assert.equal(await hold(), false, '已處理就不擋');
    // 超過 24 小時後同樣情況會再記
    await db.query("update public.dragon_flags set at = now() - interval '25 hours' where user_id=$1", [P]);
    await upload(false);
    assert.equal(await flagN(), 2, '超過 24 小時再記一筆'); assert.equal(await hold(), true);
    // ② 管理者按「排除」：加入信任名單＋全部標已處理 → 不擋、不再記，歷程照記
    await asAdmin("insert into public.dragon_trusted(user_id,email,reason,by_email) values($1,'player@x','手機時間不準','admin@x')", [P]);
    await asAdmin('update public.dragon_flags set resolved=true where user_id=$1', [P]);
    await db.query("update public.dragon_flags set at = now() - interval '25 hours' where user_id=$1", [P]);
    const log0 = Number((await db.query('select count(*) c from public.dragon_save_log where user_id=$1', [P])).rows[0].c);
    await upload(false);
    assert.equal(await flagN(), 2, '信任名單不再記');
    assert.equal(await hold(), false, '信任名單不擋');
    assert(Number((await db.query('select count(*) c from public.dragon_save_log where user_id=$1', [P])).rows[0].c) >= log0, '歷程照記');
    // 有未處理紀錄也不擋（例如加入信任前留下的）
    await db.query("insert into public.dragon_flags(user_id,email,slot,name,kind,detail) values($1,'player@x',0,'x','exp_rate','舊紀錄')", [P]);
    assert.equal(await hold(), false);
    // 取消信任 → 恢復原本規則
    await asAdmin('delete from public.dragon_trusted where user_id=$1', [P]);
    assert.equal(await hold(), true, '取消信任後未處理紀錄又會擋');
    // ③ 權限：一般玩家不能讀寫信任名單
    await db.exec(`select set_config('request.jwt.claim.sub','${P}',false);set role authenticated`);
    assert.equal((await db.query('select * from public.dragon_trusted')).rows.length, 0, '玩家看不到');
    await assert.rejects(db.query("insert into public.dragon_trusted(user_id) values($1)", [P]), /row-level security/);
    await db.exec('reset role');
    await db.close();
    console.log('PASS：已處理 24 小時內不重記也不擋、超過 24 小時再記、信任名單不擋不記且歷程照記、取消信任恢復、玩家不能讀寫信任名單。');
})().catch(e => { console.error(e); process.exit(1); });
