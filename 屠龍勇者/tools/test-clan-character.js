// 血盟綁角色／刪角接班：隔離PGlite，正式SQL，不連線、不讀寫玩家存檔。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
        create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
        create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
        create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','clan-test@invalid')$$;
        create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
        grant usage on schema public,auth to anon,authenticated;`);
    for (const f of ['supabase.sql', 'char-tombstone.sql']) {
        await db.exec(fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/create extension if not exists pgcrypto;/i, ''));
    }
    const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    for (let n = 1; n <= 12; n++) await db.query('insert into auth.users values($1,$2)', [uid(n), `u${n}@invalid`]);
    const put = async (n, slot, created, name = '角色' + created, cls = 'royal') => {
        const p = { created, name, cls, lv: 30, exp: 100, gold: 50000, inv: [], kills: 1 };
        await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,$2,1,$3,$4,30,$5)',
            [uid(n), slot, name, cls, { schema: 5, player: p }]);
    };
    const one = async (sql, args) => (await db.query(sql, args)).rows[0];
    const oldClan = async (name, n) => (await one('insert into public.dragon_clans(name,leader) values($1,$2) returning id', [name, uid(n)])).id;
    const oldMember = async (c, n, role, name, joined) => db.query('insert into public.dragon_clan_members(user_id,clan_id,role,name,cls,lv,joined_at) values($1,$2,$3,$4,\'royal\',30,$5)', [uid(n), c, role, name, joined || '2026-01-01']);
    await put(2, 0, 200); await put(3, 0, 300); await put(4, 0, 400); await put(6, 0, 600); await put(11, 0, 110);
    const c1 = await oldClan('舊血盟', 1), c2 = await oldClan('無副盟主', 5), c3 = await oldClan('空盟', 7);
    await oldMember(c1, 1, 'leader', '已刪盟主');
    await oldMember(c1, 2, 'officer', '角色200', '2026-02-01');
    await oldMember(c1, 3, 'officer', '角色300', '2026-01-01');
    await oldMember(c1, 4, 'member', '角色400', '2025-01-01');
    await oldMember(c2, 5, 'leader', '已刪盟主二'); await oldMember(c2, 6, 'member', '角色600', '2026-02-01');
    await oldMember(c2, 11, 'member', '角色110', '2026-01-01');
    await oldMember(c3, 7, 'leader', '已刪孤單盟主');
    await db.query("insert into public.dragon_deleted_chars(user_id,char_created,cls,name) values($1,300,'royal','角色300')", [uid(3)]);
    // 重名不能猜；交易應完整回滾。
    await put(2, 1, 201, '角色200');
    const sql = fs.readFileSync(path.join(__dirname, 'clan-character.sql'), 'utf8');
    await assert.rejects(db.exec(sql), /ambiguous clan character/); await db.exec('rollback');
    assert.equal((await one('select count(*)::int n from public.dragon_clan_members')).n, 8);
    await db.query('delete from public.dragon_saves where user_id=$1 and slot=1', [uid(2)]);
    await db.exec(sql); await db.exec(sql);
    assert.equal((await one('select leader from public.dragon_clans where id=$1', [c1])).leader, uid(2), '跳過已墓碑副盟主');
    assert.equal((await one('select member_count from public.dragon_clans where id=$1', [c1])).member_count, 2);
    assert.equal((await one('select leader from public.dragon_clans where id=$1', [c2])).leader, uid(11), '多位盟員選最早入盟');
    await db.query('delete from public.dragon_saves where user_id=$1 and slot=0', [uid(11)]);
    assert.equal((await one('select leader from public.dragon_clans where id=$1', [c2])).leader, uid(6));
    assert.equal(await one('select id from public.dragon_clans where id=$1', [c3]), undefined);

    const as = async (n, sql, args) => {
        await db.exec(`select set_config('request.jwt.claim.sub','${uid(n)}',false);set role authenticated`);
        try { return await one(sql, args); } finally { await db.exec('reset role'); }
    };
    const action = async (n, slot, created, action, args = {}, cls = 'royal') => (await as(n,
        'select public.clan_action($1,$2,$3) v', [slot, action, { ...args, p_char_created: String(created), p_char_cls: cls }])).v;
    const member = (n, cr) => one('select * from public.dragon_clan_members where user_id=$1 and char_created=$2', [uid(n), cr]);
    await put(8, 0, 800); await put(8, 1, 801); await put(9, 0, 900); await put(10, 0, 1000); await put(11, 0, 1100);
    const nc = await action(8, 0, 800, 'create', { p_name: '角色血盟', p_mode: 'open' });
    assert.equal((await action(8, 1, 801, 'touch')).clan, null, '分身沒有繼承血盟');
    await assert.rejects(action(8, 1, 801, 'disband'), /no clan/);
    await assert.rejects(action(8, 0, 801, 'disband'), /clan character changed/);
    await action(8, 1, 801, 'join', { p_clan: nc });
    await action(9, 0, 900, 'join', { p_clan: nc });
    const deputy = await member(8, 801);
    await action(8, 0, 800, 'set_role', { p_user: deputy.id, p_role: 'officer' });
    assert.equal((await member(8, 801)).role, 'officer', '同帳號可指定其中一隻角色');
    // 名稱與等級從真實存檔同步，舊RPC不能覆寫／假冒。
    await action(8, 1, 801, 'touch', { p_cname: '冒名', p_cls: 'knight', p_lv: 999 });
    assert.equal((await member(8, 801)).name, '角色801');
    await assert.rejects(as(8, "select public.clan_touch('冒名','knight',999)"), /permission denied/);
    await assert.rejects(as(8, "select public.clan_transfer($1)", [uid(9)]), /permission denied/);
    await assert.rejects(as(8, 'select public.clan_prune($1)', [nc]), /permission denied/);
    await assert.rejects(as(8, 'delete from public.dragon_clan_members where clan_id=$1', [nc]), /permission denied/);
    // 他人的成員／其他血盟不能被操作。
    await assert.rejects(action(9, 0, 900, 'set_role', { p_user: deputy.id, p_role: 'leader' }), /no permission/);
    const oc = await action(10, 0, 1000, 'create', { p_name: '另一血盟', p_mode: 'approve' });
    await assert.rejects(action(10, 0, 1000, 'kick', { p_user: deputy.id }), /no member/);
    await action(11, 0, 1100, 'join', { p_clan: oc });
    const ap = await one('select * from public.dragon_clan_apps where user_id=$1', [uid(11)]);
    await action(10, 0, 1000, 'decide', { p_user: ap.id, p_accept: true });
    assert.equal((await member(11, 1100)).clan_id, oc);
    // 帳號多角色、多血盟：排行榜精確對應且不出多列scalar錯誤。
    await put(8, 2, 802); await action(8, 2, 802, 'join', { p_clan: c1 });
    await action(2, 0, 200, 'decide', { p_user: (await one('select id from public.dragon_clan_apps where user_id=$1', [uid(8)])).id, p_accept: true });
    const rank = (await as(8, "select jsonb_agg(r) v from public.dragon_leaderboard('level',null,100) r")).v;
    assert(rank.find(r => r.name === '角色800').clan.includes('角色血盟'));
    assert(rank.find(r => r.name === '角色802').clan.includes('舊血盟'));
    assert.equal((await as(8, 'select public.clan_has_channel($1) v', [nc])).v, true);
    assert.equal((await as(8, 'select public.clan_has_channel($1) v', [oc])).v, false);
    // 刪盟主：墓碑即接班，不必等雲端DELETE回應；同帳號副盟主仍有效。
    await as(8, "insert into public.dragon_deleted_chars(char_created,cls,name) values(800,'royal','角色800')");
    assert.equal(await member(8, 800), undefined);
    assert.equal((await member(8, 801)).role, 'leader');
    assert.equal((await member(9, 900)).role, 'member');
    assert.equal((await one('select member_count from public.dragon_clans where id=$1', [nc])).member_count, 2);
    await as(8, 'delete from public.dragon_saves where user_id=$1 and slot=0', [uid(8)]);
    // 無副盟主，最早盟員繼承；無人剩餘則解散。
    await as(8, 'delete from public.dragon_saves where user_id=$1 and slot=1', [uid(8)]);
    assert.equal((await member(9, 900)).role, 'leader');
    await as(9, 'delete from public.dragon_saves where user_id=$1 and slot=0', [uid(9)]);
    assert.equal(await one('select id from public.dragon_clans where id=$1', [nc]), undefined);
    // 替換同欄位角色會退盟；同一角色還在另一欄位時保留。
    await put(8, 3, 802);
    await as(8, 'delete from public.dragon_saves where user_id=$1 and slot=2', [uid(8)]);
    assert(await member(8, 802));
    await db.query("update public.dragon_saves set data=jsonb_set(data,'{player,created}','803') where user_id=$1 and slot=3", [uid(8)]);
    assert.equal(await member(8, 802), undefined);
    await put(12, 0, 1200); await action(12, 0, 1200, 'join', { p_clan: oc });
    await as(12, 'delete from public.dragon_saves where user_id=$1', [uid(12)]);
    assert.equal(await one('select id from public.dragon_clan_apps where user_id=$1', [uid(12)]), undefined);
    await db.exec(sql); // 有新版資料後仍可重跑。
    await db.close();
    console.log('PASS：舊資料遷移／歧義回滾／墓碑與刪存檔退盟／副盟主與最早盟員接班／空盟解散／多角色權限與排行榜／申請清除／舊RPC封鎖／重跑。');
})().catch(e => { console.error(e); process.exit(1); });
