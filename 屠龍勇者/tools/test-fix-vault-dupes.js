// 刪除共用倉庫複製品（fix-vault-dupes.sql，第 120 節）：隔離 PGlite 重現「存入→取出→舊分頁蓋回」後，只刪複製品、保留取出的那份，簽章／序號正確。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','alen1144@yahoo.com.tw')$$;
    create function auth.role() returns text language sql as $$select coalesce(nullif(current_setting('test.role',true),''),'authenticated')$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'save-log-throttle.sql', 'loot-batch.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        await db.exec(sql);
    }
    const U = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', created = Date.now() - 3600e3;
    await db.query('insert into auth.users values($1,$2)', [U, 'alen1144@yahoo.com.tw']);
    await db.exec(`select set_config('request.jwt.claim.sub','${U}',false)`);
    const map = uid => ({ uid, id: 'map4', n: 1, ench: 0, q: 'rare', nm: '冥火', mm: ['tough', 'savage', 'blight', 'horde'] });
    const p = { created, cls: 'knight', name: '太初', lv: 29, exp: 0, gold: 5000, nextUid: 200, inv: [map(141), map(142), map(143), { uid: 150, id: 'longSword', n: 1, ench: 2 }, { uid: 151, id: 'redPotion', n: 5 }],
        storage: [], equip: {}, stats: { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 }, loc: { type: 'town', id: 'talking' }, quests: { ch: 0, active: false }, towerMax: 10 };
    const sig = pl => db.query('select public.dragon_save_sig($1,0,$2) s', [U, pl]).then(r => r.rows[0].s);
    await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,29,$4)', [U, p.name, p.cls, { schema: 5, player: p, sig: await sig(p), lootProtocol: 1, lootCursor: 0 }]);
    const as = async (sql, a) => { await db.exec('set role authenticated'); try { return (await db.query(sql, a)).rows[0].v; } finally { await db.exec('reset role'); } };
    await db.exec('delete from public.dragon_flags');   // 新建測試角色時其他稽核記的旗標會擋倉庫，與本測試無關
    // 存入 3 張再取出（取出的拿到新 uid 200～202）
    for (const uid of [141, 142, 143]) await as('select public.vault_put2(0,$1,1,null,$2) v', [uid, '冥火']);
    for (const r of (await db.query('select id from public.dragon_vault_items order by id')).rows) await as('select public.vault_take2(0,$1,null) v', [r.id]);
    // 舊分頁用正確序號把原本 3 張蓋回（漏洞重現）
    const cur = (await db.query('select data from public.dragon_saves where user_id=$1 and slot=0', [U])).rows[0].data;
    cur.player.inv.push(map(141), map(142), map(143)); cur.sig = await sig(cur.player);
    await db.query('update public.dragon_saves set data=$2 where user_id=$1 and slot=0', [U, cur]);
    const inv0 = cur.player.inv.map(x => x.uid).sort((a, b) => a - b);
    assert.deepEqual(inv0, [141, 142, 143, 150, 151, 200, 201, 202]);

    // 管理者在 SQL Editor 執行（auth.role() 不是 authenticated）
    const sql = fs.readFileSync(path.join(__dirname, 'fix-vault-dupes.sql'), 'utf8');
    await db.exec("select set_config('test.role','service_role',false)");
    const preview = sql.slice(sql.indexOf('select s.slot + 1'), sql.indexOf('-- ② 刪除'));
    assert.deepEqual((await db.query(preview)).rows.map(r => r.uid), [141, 142, 143], '預覽列出 3 張複製品');
    await db.exec(sql.slice(sql.indexOf('-- ② 刪除')));
    const after = (await db.query('select data, sig_ok, client_t from public.dragon_saves where user_id=$1 and slot=0', [U])).rows[0];
    assert.deepEqual(after.data.player.inv.map(x => x.uid).sort((a, b) => a - b), [150, 151, 200, 201, 202], '只刪複製品，取出的那 3 張與其他道具保留');
    assert.equal(after.sig_ok, true, '簽章重算');
    const seq = Number((await db.query('select seq from public.dragon_vault_seq where user_id=$1', [U])).rows[0].seq);
    assert.equal(after.data.vaultSeq, seq); assert.equal(seq, cur.vaultSeq + 1, '序號 +1');
    assert.equal(Number((await db.query('select count(*) c from public.dragon_fix_backup')).rows[0].c), 1, '有備份');
    // 玩家還開著的舊遊戲（序號舊）傳不回來
    await db.exec("select set_config('test.role','',false)");
    await assert.rejects(as("update public.dragon_saves set data = data || jsonb_build_object('vaultSeq', $2::int) where user_id=$1 and slot=0 returning 1 v", [U, cur.vaultSeq]), /vault seq conflict/);
    // 重跑不多刪
    await db.exec("select set_config('test.role','service_role',false)");
    await db.exec(sql.slice(sql.indexOf('-- ② 刪除')));
    assert.equal((await db.query('select data from public.dragon_saves where user_id=$1 and slot=0', [U])).rows[0].data.player.inv.length, 5);
    await db.close();
    console.log('PASS：預覽列出複製品、只刪原編號複製品（取出的與其他道具保留）、先備份、簽章重算、序號 +1 擋舊遊戲、重跑不多刪。');
})().catch(e => { console.error(e); process.exit(1); });
