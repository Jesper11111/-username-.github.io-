// 共用倉庫防複製 v2 端到端：真實遊戲程式（vm）＋假 Supabase 用戶端接到隔離 PGlite（載入正式 SQL＋vault-v2.sql）。不連正式主機（第 93 節）。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
const root = path.resolve(__dirname, '..'), uid = '33333333-3333-4333-8333-333333333333';
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid','role','authenticated')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql']) {   // 真實遊戲存檔也要通過能力值上限（第 94 節）；交易所 v2（第 95 節）
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        await db.exec(sql);
    }
    await db.query('insert into auth.users values($1,$2)', [uid, 'vault-client@invalid']);
    await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false);update public.dragon_loot_config set enabled=true`);

    // 假 Supabase：只實作遊戲會用到的 from()／rpc()，一律以 authenticated 身分執行（RLS、trigger 照正式規則）
    const asUser = async (sql, args) => {
        await db.exec('set role authenticated');
        try { return { data: (await db.query(sql, args)).rows }; }
        catch (e) { return { error: { message: e.message, hint: e.hint, code: e.code } }; }
        finally { await db.exec('reset role'); }
    };
    const json = v => v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
    class Q {
        constructor(t) { this.t = t; this.op = 'select'; this.f = []; this.one = false; }
        select() { return this; } insert(r) { this.op = 'insert'; this.r = r; return this; } update(r) { this.op = 'update'; this.r = r; return this; }
        upsert(r) { this.op = 'upsert'; this.r = r; return this; } eq(k, v) { this.f.push([k, v]); return this; }
        order() { return this; } limit() { return this; } maybeSingle() { this.one = true; return this; }
        then(ok, bad) { return this.run().then(ok, bad); }
        async run() {
            assert.equal(this.t, 'dragon_saves');
            const where = this.f.map(([k], i) => `${k}=$${i + 1}`).join(' and '), vals = this.f.map(([, v]) => v);
            if (this.op === 'select') {
                const r = await asUser(`select client_t::float8 as client_t, data from public.dragon_saves where ${where}`, vals);
                return r.error ? r : { data: this.one ? r.data[0] || null : r.data };
            }
            const r = this.r, cols = ['slot', 'client_t', 'name', 'cls', 'lv', 'data'], v = cols.map(c => json(r[c]));
            if (this.op === 'update') return asUser(`update public.dragon_saves set ${cols.map((c, i) => `${c}=$${i + 1}`).join(',')} where ${this.f.map(([k], i) => `${k}=$${i + 7}`).join(' and ')} returning slot`, v.concat(vals));
            return asUser(`insert into public.dragon_saves(user_id,${cols}) values($7,${cols.map((c, i) => '$' + (i + 1))})` + (this.op === 'upsert' ? ` on conflict (user_id,slot) do update set ${cols.map(c => `${c}=excluded.${c}`)}` : '') + ' returning slot', v.concat([r.user_id]));
        }
    }
    const fakeSb = {
        from: t => new Q(t),
        rpc: async (fn, args) => {
            const ks = Object.keys(args || {});
            const r = await asUser(`select public.${fn}(${ks.map((k, i) => `${k} => $${i + 1}`).join(',')}) as v`, ks.map(k => json(args[k])));
            return r.error ? r : { data: r.data[0].v };
        }
    };
    const memory = new Map();
    const ctx = vm.createContext({ console, assert, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, Image: function () {},
        localStorage: { getItem: k => memory.has(k) ? memory.get(k) : null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k) },
        document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, documentElement: { style: {} } },
        window: { addEventListener() {}, innerWidth: 1280, innerHeight: 720 }, navigator: {}, fetch() { throw Error('不准正式連線'); }, fakeSb, db, uid });
    for (const [, f] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g))
        if (!['data/main.js', 'data/pwa.js'].includes(f)) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

    await vm.runInContext(String.raw`(async () => {
        const toasts = [], alerts = [], flags = [];
        showToast = m => toasts.push(m); refreshUI = () => {}; renderPanel = () => {}; sfx = () => {}; addLog = () => {}; addLootLog = () => {};
        gameConfirm = (t, m, cb) => cb(); gameAlert = t => alerts.push(t); guardFlag = r => flags.push(r); renderCloudEntry = () => {}; cloudRefreshScreen = () => {};
        continueGame = () => { assert(loadGame()); };
        cloudSb = fakeSb; cloudUser = { id: uid, email: 'vault-client@invalid' }; authUid = () => uid;
        SIM_MODE = true; createPlayer('倉庫端到端', 'knight', CLASSES.knight.base); SIM_MODE = false;
        playerOwner = uid; currentSlot = 0; player.loc = { type: 'town', id: Object.keys(TOWNS)[0] }; player.gold = 5000;
        const sword = addItem('longSword', 1, 3); sword.q = 'rare'; sword.af = [{ k: 'str', v: 2 }];
        const swordUid = sword.uid, pots0 = countItem('redPotion');
        saveGame(); cloudKnown[0] = null; cloudDirty.add(0);
        assert.equal(await cloudFlush(true), true, '第一次上傳');
        const cloud = async () => (await db.query('select data, sig_ok, client_t::float8 as t from public.dragon_saves where user_id=$1 and slot=0', [uid])).rows[0];
        const local = () => saveParse(localStorage.getItem(slotKey(0)));
        const vaultGoldDb = async () => Number(((await db.query('select gold from public.dragon_vault where user_id=$1', [uid])).rows[0] || { gold: 0 }).gold);

        // ① 存裝備：本機與雲端都拿掉、序號一致、簽章仍正確
        vaultPut(swordUid); while (vaultBusy) await new Promise(r => setTimeout(r, 5));
        let c = await cloud();
        assert(!findInv(swordUid)); assert(!c.data.player.inv.some(x => x.uid === swordUid));
        assert.equal(player.gold, 4900); assert.equal(Number(c.data.player.gold), 4900);
        assert.equal(local().vaultSeq, 1); assert.equal(c.data.vaultSeq, 1); assert.equal(c.sig_ok, true);
        assert.equal(JSON.stringify(vaultData.items.map(v => v.item.af)), JSON.stringify([[{ k: 'str', v: 2 }]]));

        // ② 存藥水一部分以外的情況：整疊存入
        const potUid = player.inv.find(x => x.id === 'redPotion').uid;
        vaultPut(potUid); while (vaultBusy) await new Promise(r => setTimeout(r, 5));
        assert.equal(countItem('redPotion'), 0); assert.equal(player.gold, 4800);

        // ③ 斷線／還原備份：存金幣前的本機存檔被放回去，上傳被拒 → 自動改用雲端進度，金幣沒有變成兩份
        const before = localStorage.getItem(slotKey(0));
        document.getElementById = id => id === 'vault-gold' ? { value: '1000' } : null;
        vaultGold(1); while (vaultBusy) await new Promise(r => setTimeout(r, 5));
        assert.equal(player.gold, 3700); assert.equal(await vaultGoldDb(), 1000);
        localStorage.setItem(slotKey(0), before); vaultLive = null; assert(loadGame()); assert.equal(player.gold, 4800, '還原成存入前');
        player.exp += 1; saveGame();
        await cloudFlush(true); await new Promise(r => setTimeout(r, 50));
        assert.equal(alerts.pop(), '☁️ 已載入雲端進度');
        assert.equal(player.gold, 3700, '改用雲端進度，金幣只扣一次'); assert.equal(local().vaultSeq, 3);
        c = await cloud(); assert.equal(Number(c.data.player.gold), 3700); assert.equal(c.data.vaultSeq, 3);
        assert.equal(flags.length, 0, '伺服器重算的簽章與遊戲一致，不會誤記改檔');

        // ④ 取出裝備與藥水、金幣：直接入雲端存檔，本機一致，可以照常上傳
        await vaultLoad();
        const swordRow = vaultData.items.find(v => v.item.id === 'longSword'), potRow = vaultData.items.find(v => v.item.id === 'redPotion');
        vaultTake(swordRow.id); while (vaultBusy) await new Promise(r => setTimeout(r, 5));
        vaultTake(potRow.id); while (vaultBusy) await new Promise(r => setTimeout(r, 5));
        document.getElementById = id => id === 'vault-gold' ? { value: '600' } : null;
        vaultGold(-1); while (vaultBusy) await new Promise(r => setTimeout(r, 5));
        const back = player.inv.find(x => x.id === 'longSword');
        assert(back && back.ench === 3 && back.af[0].v === 2); assert.equal(countItem('redPotion'), pots0);
        assert.equal(player.gold, 3700 - 200 + 500); assert.equal(await vaultGoldDb(), 400);
        player.exp += 1; saveGame(); assert.equal(await cloudFlush(true), true, '取出後照常上傳');
        c = await cloud(); assert.equal(c.data.vaultSeq, 6); assert.equal(c.sig_ok, true);
        assert.equal(c.data.player.inv.filter(x => x.id === 'longSword').length, 1); assert.equal(Number(c.data.player.gold), 4000);
        assert.equal(flags.length, 0);

        // ⑤ 交易所 v2（第 95 節）：上架、下架、向別的帳號購買，本機與雲端一致
        const waitMarket = async () => { await new Promise(r => setTimeout(r, 5)); while (marketBusy) await new Promise(r => setTimeout(r, 5)); };
        const g0 = player.gold, sw = player.inv.find(x => x.id === 'longSword');
        marketSellUid = sw.uid;
        document.getElementById = id => id === 'market-price' ? { value: '777' } : id === 'market-n' ? { value: '1' } : null;
        await marketListItem(); await waitMarket();
        c = await cloud();
        assert(!findInv(sw.uid)); assert(!c.data.player.inv.some(x => x.id === 'longSword'), '上架後雲端存檔也拿掉');
        const listing = (await db.query("select id, item from public.dragon_market where seller=$1 and state='active'", [uid])).rows[0];
        assert.equal(listing.item.ench, 3, '交易所存的是存檔那一把');
        await marketCancel(listing.id); await waitMarket();
        c = await cloud();
        assert.equal(player.inv.filter(x => x.id === 'longSword').length, 1); assert.equal(c.data.player.inv.filter(x => x.id === 'longSword').length, 1, '下架回到存檔，只有一把');
        // 別的帳號上架 → 這個角色購買
        const seller = '55555555-5555-4555-8555-555555555555';
        await db.query('insert into auth.users values($1,$2)', [seller, 'seller@invalid']);
        await db.exec("select set_config('request.jwt.claim.sub','" + seller + "',false)");
        const sp = { created: 9, cls: 'mage', name: '賣家', lv: 5, exp: 0, gold: 0, nextUid: 9, inv: [{ uid: 3, id: 'redPotion', n: 5 }], storage: [], equip: {}, stats: { str: 8, dex: 8, con: 8, int: 18, wis: 12, cha: 8 } };
        await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,5,$4)', [seller, '賣家', 'mage', { schema: 5, player: sp, sig: (await db.query('select public.dragon_save_sig($1,0,$2) s', [seller, sp])).rows[0].s, lootProtocol: 1, lootCursor: 0 }]);
        await db.exec('set role authenticated');
        const bid = (await db.query("select public.market_list2(0,3,5,300,'賣家','紅藥水 ×5','potion') v")).rows[0].v.id;
        await db.exec("reset role; select set_config('request.jwt.claim.sub','" + uid + "',false)");
        const pot1 = countItem('redPotion'), g1 = player.gold;
        marketRows = [{ id: bid, price: 300 }];
        await marketBuy(bid); await waitMarket();
        c = await cloud();
        assert.equal(player.gold, g1 - 300); assert.equal(Number(c.data.player.gold), g1 - 300, '買家金幣雲端也扣');
        assert.equal(countItem('redPotion'), pot1 + 5); assert.equal(c.data.player.inv.find(x => x.id === 'redPotion').n, pot1 + 5);
        assert.equal(c.sig_ok, true); assert.equal(c.data.vaultSeq, local().vaultSeq);
        player.exp += 1; saveGame(); assert.equal(await cloudFlush(true), true, '交易後照常上傳');
        assert.equal(flags.length, 0); assert.equal(g0, player.gold + 300);
        console.log('PASS：真實遊戲＋隔離資料庫：存裝備／藥水／金幣本機與雲端一致、舊存檔上傳被拒自動改用雲端（不重複）、取出直接入帳、交易所上架／下架／購買本機與雲端一致、簽章不誤判。');
    })()`, ctx);
    await db.close();
})().catch(e => { console.error(e); process.exit(1); });
