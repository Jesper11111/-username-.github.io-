// 全服掉寶公告：隔離 PGlite 載入正式 SQL＋loot-news.sql，驗證只公告傳說／共鳴、玩家不能自己寫、公告壞掉不影響掉寶（第 139 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','news@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'save-log-throttle.sql', 'loot-batch.sql', 'loot-news.sql', 'loot-news.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }
    const uid = '88888888-8888-4888-8888-888888888888', ch = '123|knight';
    await db.query('insert into auth.users values($1,$2)', [uid, 'news@invalid']);
    await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false)`);
    const p = { created: 123, cls: 'knight', name: '公告測試', lv: 55, exp: 0, gold: 300, inv: [], storage: [], equip: {}, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 },
        loc: { type: 'zone', id: 'island' }, quests: { ch: 0, active: false }, towerMax: 10 };
    const sig = (await db.query('select public.dragon_save_sig($1,0,$2) as s', [uid, p])).rows[0].s;
    await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,55,$4)', [uid, p.name, p.cls, { schema: 5, player: p, sig, lootProtocol: 1, lootCursor: 0 }]);
    await db.exec('update public.dragon_loot_config set enabled=true');
    const rows = async () => (await db.query('select name,cls,lv,item,q from public.dragon_loot_news order by id')).rows;
    const nItems = Number((await db.query('select count(*) c from public.dragon_loot_news_items')).rows[0].c);
    assert(nItems >= 50, '共鳴清單從目錄建立：' + nItems);
    assert((await db.query("select 1 from public.dragon_loot_news_items where id='tsurugi'")).rows.length === 1);

    // ① 收據：普通／稀有不公告，傳說＋共鳴公告
    const rc = (cursor, items) => db.query('insert into public.dragon_loot_receipts(user_id,char_id,slot,cursor,batch_id,items) values($1,$2,0,$3,gen_random_uuid(),$4)', [uid, '999|knight', cursor, JSON.stringify(items)]);
    await rc(1, [{ id: 'redPotion', n: 3 }, { id: 'dagger', n: 1, q: 'rare' }]);
    assert.equal((await rows()).length, 0, '一般掉落不公告');
    await rc(2, [{ id: 'dagger', n: 1, q: 'legend' }, { id: 'tsurugi', n: 1 }, { id: 'arrow', n: 50 }]);
    assert.deepEqual(await rows(), [{ name: '公告測試', cls: 'knight', lv: 55, item: 'dagger', q: 'legend' }, { name: '公告測試', cls: 'knight', lv: 55, item: 'tsurugi', q: null }]);
    // 一次最多 3 件
    await rc(3, Array.from({ length: 6 }, () => ({ id: 'tsurugi', n: 1 })));
    assert.equal((await rows()).length, 5, '一批最多公告 3 件');

    // ② 舊流程（loot_finish 寫 result）也公告
    await db.query(`insert into public.dragon_loot_jobs(user_id,slot,char_id,event_key,context) values($1,0,$2,'t1','{}')`, [uid, '999|knight']);
    await db.query(`update public.dragon_loot_jobs set result='[{"id":"wolfAmulet","n":1}]',cursor=99 where event_key='t1'`);
    assert.equal((await rows()).at(-1).item, 'wolfAmulet');

    // ③ 實際批次結算可以正常跑（trigger 不擋掉寶）
    await db.exec('set role authenticated');
    const tickets = (await db.query('select public.loot_spawn(0,$1,$2,false,null) as v', [ch, crypto.randomUUID()])).rows[0].v.map(x => x.ticket);
    await db.exec('reset role');
    await db.exec("update public.dragon_loot_jobs set created_at=clock_timestamp()-interval '1 second' where result is null");
    await db.exec('set role authenticated');
    const r = (await db.query('select public.loot_finish_batch($1,$2) as v', [crypto.randomUUID(), tickets])).rows[0].v;
    assert(r.cursor >= 1);

    // ④ 玩家：可讀公告（看不到 user_id），不能寫、不能改、不能刪
    assert((await db.query('select id,at,name,item,q from public.dragon_loot_news')).rows.length >= 6);
    await assert.rejects(db.query('select user_id from public.dragon_loot_news'), /permission/);
    await assert.rejects(db.query(`insert into public.dragon_loot_news(user_id,name,item) values($1,'假','tsurugi')`, [uid]), /permission/);
    await assert.rejects(db.query(`update public.dragon_loot_news set name='假'`), /permission/);
    await assert.rejects(db.query(`delete from public.dragon_loot_news`), /permission/);
    await assert.rejects(db.query(`select public.dragon_loot_news_add($1,0,'[{"id":"tsurugi"}]')`, [uid]), /permission/);
    await db.exec('reset role');

    // ⑤ 公告表壞掉時，掉寶收據照樣寫入
    await db.exec('alter table public.dragon_loot_news rename to dragon_loot_news_x');
    await rc(10, [{ id: 'tsurugi', n: 1 }]);
    assert.equal((await db.query('select count(*) c from public.dragon_loot_receipts where cursor=10')).rows[0].c, 1);
    console.log('PASS：只公告傳說／共鳴、一批最多 3 件、舊流程 result 也公告、批次結算不受影響、玩家只能讀且看不到帳號、公告失敗不擋掉寶。');
})().catch(e => { console.error(e); process.exit(1); });
