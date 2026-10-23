// 角色歸屬：隔離 PGlite 載入正式 SQL＋char-tombstone＋char-owner，驗證分身被擋、正主照常、刪除後不能再傳回（第 109 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','owner@invalid')$$;
    create function auth.role() returns text language sql as $$select coalesce(nullif(current_setting('test.role',true),''),'authenticated')$$;
    grant usage on schema public,auth to anon,authenticated;`);
    // 先有幾筆舊資料（裝 char-owner 之前）：A 有自己的角色、B 和 C 都有同一隻分身
    for (const file of ['supabase.sql', 'char-tombstone.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        await db.exec(sql);
    }
    const A = 'a1111111-1111-4111-8111-111111111111', B = 'b2222222-2222-4222-8222-222222222222', C = 'c3333333-3333-4333-8333-333333333333', D = 'd4444444-4444-4444-8444-444444444444';
    for (const [u, e] of [[A, 'a@x'], [B, 'b@x'], [C, 'c@x'], [D, 'd@x']]) await db.query('insert into auth.users values($1,$2)', [u, e]);
    const stats = { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 };
    const data = (created, name, lv = 10) => ({ schema: 5, t: Date.now(), lootProtocol: 1, lootCursor: 0, player: { created, cls: 'knight', name, lv, exp: 0, gold: 100, inv: [], storage: [], equip: {}, stats } });
    const put = async (u, slot, d, insert) => {
        await db.exec(`select set_config('request.jwt.claim.sub','${u}',false);set role authenticated`);
        try {
            if (insert) await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,$2,$3,$4,$5,$6,$7)', [u, slot, d.t, d.player.name, 'knight', d.player.lv, d]);
            else await db.query('update public.dragon_saves set data=$1, client_t=$2 where user_id=$3 and slot=$4', [d, d.t, u, slot]);
        } finally { await db.exec('reset role'); }
    };
    await put(A, 0, data(1000, '正主'), true);
    await put(B, 0, data(2000, '操真猛', 68), true);
    await put(C, 0, data(2000, '操真猛', 68), true);
    // 裝 char-owner（含回填），重複安裝
    for (let i = 0; i < 2; i++) await db.exec(fs.readFileSync(path.join(__dirname, 'char-owner.sql'), 'utf8'));
    const owners = (await db.query('select char_id, user_id from public.dragon_char_owner order by char_id')).rows;
    assert.deepEqual(owners.map(o => o.char_id), ['1000|knight'], '只回填只在一個帳號的角色，分身不登記');
    assert.equal(owners[0].user_id, A);
    // ① 正主照常上傳
    await put(A, 0, data(1000, '正主', 11));
    // ② 別的帳號傳同一隻角色被擋
    await assert.rejects(put(D, 0, data(1000, '正主', 11), true), /char owned elsewhere/, '登記過的角色不能傳到別的帳號');
    // ③ 分身：多個帳號都有時誰都不能再上傳，等管理者處理
    await assert.rejects(put(B, 0, data(2000, '操真猛', 69)), /char owned elsewhere/);
    await assert.rejects(put(C, 0, data(2000, '操真猛', 69)), /char owned elsewhere/);
    // 管理者刪掉 C 的那隻（寫墓碑）後，B 的就能上傳並登記
    await db.query("insert into public.dragon_deleted_chars(user_id,char_created,cls,name) values($1,2000,'knight','操真猛')", [C]);
    await db.query('delete from public.dragon_saves where user_id=$1 and slot=0', [C]);
    await put(B, 0, data(2000, '操真猛', 69));
    assert.equal((await db.query("select user_id from public.dragon_char_owner where char_id='2000|knight'")).rows[0].user_id, B);
    // ④ 刪掉後再開新帳號傳回來：被擋（登記不會消失）
    await assert.rejects(put(D, 1, data(2000, '操真猛', 69), true), /char owned elsewhere/, '新帳號不能再傳分身');
    // ⑤ 新角色第一次上傳就登記；管理者（非 authenticated）不受影響
    await put(D, 2, data(3000, '新角色'), true);
    assert.equal((await db.query("select user_id from public.dragon_char_owner where char_id='3000|knight'")).rows[0].user_id, D);
    await db.exec("select set_config('test.role','service_role',false)");
    await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,3,1,$2,$3,10,$4)', [A, '搬資料', 'knight', data(3000, '新角色')]);
    await db.exec("select set_config('test.role','',false)");
    // ⑥ 玩家不能直接讀登記表
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from public.dragon_char_owner'), /permission denied/);
    await db.exec('reset role');
    await db.close();
    console.log('PASS：回填只登記單一帳號的角色、正主照常上傳、別的帳號傳同一隻被擋、分身在清掉多餘的之前都擋、刪除後新帳號傳不回來、新角色首傳登記、管理者不受影響、登記表不可直讀。');
})().catch(e => { console.error(e); process.exit(1); });
