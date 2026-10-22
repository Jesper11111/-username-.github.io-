// 能力值上限拒收：隔離 PGlite 載入正式 SQL＋stat-cap.sql，不連正式主機（第 94 節）。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid')$$;
    create function auth.role() returns text language sql as $$select coalesce(nullif(current_setting('test.role',true),''),'authenticated')$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'stat-cap.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        await db.exec(sql);
    }
    const uid = '44444444-4444-4444-8444-444444444444';
    await db.query('insert into auth.users values($1,$2)', [uid, 'stat@invalid']);
    await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false);update public.dragon_loot_config set enabled=true`);
    const stats = s => Object.assign({ str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 }, s);
    const save = s => ({ schema: 5, t: 1, lootProtocol: 1, lootCursor: 0, player: { created: 789, cls: 'knight', name: '能力測試', lv: 30, exp: 0, gold: 100, inv: [], storage: [], equip: {}, stats: s } });
    const write = async (data, insert) => {
        await db.exec('set role authenticated');
        try {
            if (insert) await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,30,$4)', [uid, '能力測試', 'knight', data]);
            else await db.query('update public.dragon_saves set data=$1 where user_id=$2 and slot=0', [data, uid]);
        } finally { await db.exec('reset role'); }
    };
    // 正常：單項 35（STAT_CAP）、40（寬限）都收
    await write(save(stats({ str: 35 })), true);
    await write(save(stats({ str: 40, dex: 35 })));
    // 超過、偽造型別、缺欄位都拒收，雲端那份保持原樣
    for (const bad of [stats({ str: 41 }), stats({ cha: 99, int: 99 }), stats({ dex: '20' }), stats({ con: -1 }), { str: 18, dex: 12, con: 16, int: 8, wis: 9 }, null])
        await assert.rejects(write(save(bad)), /stat cap exceeded/, JSON.stringify(bad));
    assert.equal((await db.query('select (data->\'player\'->\'stats\'->>\'str\')::int s from public.dragon_saves where user_id=$1', [uid])).rows[0].s, 40);
    assert.equal(Number((await db.query("select count(*) c from public.dragon_flags where kind='stat'")).rows[0].c), 0, '被拒收的不會留下 stat 紀錄');
    // 管理者（非 authenticated）在 SQL Editor 修資料不受影響
    await db.exec("select set_config('test.role','service_role',false)");
    await db.query('update public.dragon_saves set data=$1 where user_id=$2 and slot=0', [save(stats({ str: 99 })), uid]);
    await db.exec("select set_config('test.role','',false)");
    // 雲端已經是 99 的存檔：之後玩家上傳仍要合法才收
    await assert.rejects(write(save(stats({ str: 99, dex: 13 }))), /stat cap exceeded/);
    await write(save(stats({ str: 30 })));
    await db.close();
    console.log('PASS：能力值 35／40 照收；>40、字串、負數、缺欄位、沒有 stats 拒收且雲端不變、不留 stat 紀錄；管理者修資料不受影響。');
})().catch(e => { console.error(e); process.exit(1); });
