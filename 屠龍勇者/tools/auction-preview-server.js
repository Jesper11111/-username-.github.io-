// 交易所防複製 v2：隔離 PGlite 載入正式 SQL＋vault-v2＋market-v2，重跑 v1 的三種複製手法確認都擋下（第 95 節）。不連正式主機。
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const { PGlite } = require(process.env.LOOT_TEST_RUNTIME || path.join(require('os').tmpdir(), 'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid')$$;
    create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
    grant usage on schema public,auth to anon,authenticated;`);
    for (const file of ['supabase.sql', 'anticheat.sql', 'server-loot-install.sql', 'vault-v2.sql', 'stat-cap.sql', 'market-v2.sql', 'auction.sql', 'auction.sql']) {
        let sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        if (file === 'supabase.sql') sql = sql.replace(/create extension if not exists pgcrypto;/i, '');
        try { await db.exec(sql); } catch (e) { console.error('Failed migration:', file, e.message); throw e; }
    }
    await db.exec('update public.dragon_loot_config set enabled=true');
    const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const stats = { str: 18, dex: 12, con: 16, int: 8, wis: 9, cha: 12 };
    const mk = async (u, created, gold, inv) => {
        await db.query('insert into auth.users values($1,$2)', [u, u.slice(0, 4) + '@invalid']);
        const p = { created, cls: 'knight', name: 'P' + created, lv: 20, exp: 0, gold, nextUid: 50, inv, storage: [], equip: {}, stats, loc: { type: 'town', id: 'talking' }, quests: { ch: 0, active: false }, towerMax: 10 };
        await db.exec(`select set_config('request.jwt.claim.sub','${u}',false)`);
        const sig = (await db.query('select public.dragon_save_sig($1,0,$2) s', [u, p])).rows[0].s;
        await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,20,$4)', [u, p.name, p.cls, { schema: 5, player: p, sig, lootProtocol: 1, lootCursor: 0 }]);
    };
    const as = async (u, sql, a) => { await db.exec(`select set_config('request.jwt.claim.sub','${u}',false);set role authenticated`); try { return (await db.query(sql, a)).rows[0].v; } finally { await db.exec('reset role'); } };
    const save = async u => (await db.query('select data, sig_ok from public.dragon_saves where user_id=$1 and slot=0', [u])).rows[0];
    await db.exec(fs.readFileSync(path.join(__dirname,'loot-catalog.sql'),'utf8'));
    await mk(B,2,1000,[{uid:5,id:'longSword',n:1,ench:3,q:'rare',nm:'灰燼',il:40}]);
    await db.query('insert into public.dragon_wallet(user_id,diamonds)values($1,100)',[B]);
    await as(B,"select public.auction_list(0,5,1,5,'灰燼騎士的長劍') v");
    await db.exec("update public.dragon_auction_config set first_open=clock_timestamp()+interval '1 millisecond'");
    const http=require('http');let ready=false,chain=Promise.resolve();
    const functions={auction_browse:['p_mine'],auction_list:['p_slot','p_uid','p_n','p_start','p_name'],auction_bid:['p_slot','p_id','p_amount'],auction_cancel:['p_slot','p_id'],auction_claim:['p_slot','p_id'],auction_configure:['p_rank','p_equipment','p_il','p_draw','p_ids','p_cats']};
    http.createServer((req,res)=>{
        const url=new URL(req.url,'http://127.0.0.1:8791');
        if(req.method==='POST'&&url.pathname==='/__auction_rpc'){
            let body='';req.on('data',b=>{body+=b;if(body.length>1000000)req.destroy();});req.on('end',()=>{
                chain=chain.then(async()=>{
                    try{
                        const {fn,args}=JSON.parse(body);let r;
                        if(fn==='init'){
                            if(!ready){
                                await mk(A,1,1000,[]);const p=args.player;
                                const sig=(await db.query('select public.dragon_save_sig($1,0,$2) s',[A,p])).rows[0].s;
                                await db.query('update public.dragon_saves set data=$1,client_t=1 where user_id=$2 and slot=0',[{schema:7,player:p,sig,vaultSeq:0,lootProtocol:1,lootCursor:0},A]);
                                // 僅隔離預覽：合成角色覆蓋初始測試角色造成的建立期警示，不屬玩家交易。
                                await db.query('update public.dragon_flags set resolved=true where user_id=$1',[A]);
                                await db.query('insert into public.dragon_wallet(user_id,diamonds)values($1,100)',[A]);ready=true;
                            }r={ok:true};
                        }else if(functions[fn]){
                            const keys=functions[fn],values=keys.map(k=>args[k]);
                            r=await as(A,'select public.'+fn+'('+keys.map((_,i)=>'$'+(i+1)).join(',')+') v',values);
                        }else if(fn==='finish-preview'){
                            await db.exec("update public.dragon_auctions set ends_at=clock_timestamp()-interval '1 second' where state='active'");r={ok:true};
                        }else throw Error('Preview function blocked');
                        res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:r}));
                    }catch(e){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message}));}
                });
            });return;
        }
        const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
        if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
        fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream'));res.end(b);});
    }).listen(Number(process.env.AUCTION_PREVIEW_PORT)||8791,'127.0.0.1',()=>console.log('Isolated auction PGlite preview ready'));
})().catch(e=>{console.error(e);process.exit(1);});
