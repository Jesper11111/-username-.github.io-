// tools/gm-give.sql 的 PostgreSQL(PGlite)隔離測試；僅記憶體，絕不連正式Supabase。
// 執行：node tools/test-gm-give.js（PGlite 路徑同 test-server-loot-db.js，可用 LOOT_TEST_RUNTIME 指定）
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const runtime=process.env.LOOT_TEST_RUNTIME||path.join(require('os').tmpdir(),'dark-loot-test-runtime/node_modules/@electric-sql/pglite');
const {PGlite}=require(runtime);
const gm='11111111-1111-4111-8111-111111111111',pl='22222222-2222-4222-8222-222222222222';
async function main(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text);
 insert into auth.users values('${gm}','gm@test.com'),('${pl}','Player@Test.com');
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email',(select email from auth.users where id=auth.uid()))$$;
 grant usage on schema public,auth to anon,authenticated;
 create table public.dragon_admins(user_id uuid primary key);insert into public.dragon_admins values('${gm}');
 create function public.dragon_is_admin() returns boolean language sql security definer as $$select exists(select 1 from public.dragon_admins where user_id=auth.uid())$$;
 grant execute on function public.dragon_is_admin() to authenticated;
 create table public.dragon_vault_items(id bigserial primary key,user_id uuid not null references auth.users(id),from_slot smallint not null,uid int not null,item_id text not null,item jsonb not null,name text,put_at timestamptz not null default now(),taken_at timestamptz);
 create table public.dragon_loot_catalog(id int primary key,version text,data jsonb);
 insert into public.dragon_loot_catalog values(1,'t','{"items":{"redPotion":{"name":"治癒藥水","cat":"potion","stack":true},"dagger":{"name":"匕首","cat":"weapon","stack":false},"q_bone":{"name":"骨頭","cat":"quest","stack":true}}}');
 `);
 const sql=fs.readFileSync(path.join(__dirname,'gm-give.sql'),'utf8');
 await db.exec(sql);await db.exec(sql);   // 必須可重複執行
 const query=async(s,a=[])=>(await db.query(s,a)).rows;
 const as=async uid=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${uid}',false)`);
 const give=async(...a)=>(await query('select public.gm_give_item($1,$2,$3,$4) v',a))[0].v;
 // 一般玩家不能用
 await as(pl);
 await assert.rejects(()=>give(pl,'redPotion',1,'x'),/not admin/);
 await assert.rejects(()=>query('select public.gm_item_list()'),/not admin/);
 assert.equal((await query('select count(*)::int c from public.dragon_gm_give_log'))[0].c,0);   // RLS：看不到紀錄
 await assert.rejects(()=>query('select * from public.dragon_vault_items'),/permission denied/);
 // GM
 await as(gm);
 const list=(await query('select public.gm_item_list() v'))[0].v;
 assert.equal(list.dagger.name,'匕首');assert.equal(list.redPotion.stack,true);
 let r=await give('player@test.com','redPotion',500,'活動');   // Email 不分大小寫
 assert.equal(r.ok,true);assert.equal(r.rows,1);assert.equal(r.free,199);assert.equal(r.email,'Player@Test.com');
 r=await give(pl,'dagger',3,'補償');assert.equal(r.rows,3);assert.equal(r.free,196);
 await db.exec('reset role');
 const rows=await query(`select from_slot,uid,item from public.dragon_vault_items where user_id='${pl}' order by id`);
 assert.deepEqual(rows[0],{from_slot:-1,uid:0,item:{id:'redPotion',n:500}});
 assert.deepEqual(rows[1].item,{id:'dagger',n:1,ench:0});assert.equal(rows.length,4);
 await as(gm);
 await assert.rejects(()=>give(pl,'q_bone',1,''),/unknown item/);
 await assert.rejects(()=>give(pl,'nope',1,''),/unknown item/);
 await assert.rejects(()=>give(pl,'dagger',51,''),/bad amount/);
 await assert.rejects(()=>give(pl,'redPotion',0,''),/bad amount/);
 await assert.rejects(()=>give(pl,'redPotion',100000,''),/bad amount/);
 await assert.rejects(()=>give('who@test.com','redPotion',1,''),/no such player/);
 for(let i=0;i<4;i++)await give(pl,'dagger',49,'');   // 4+196=200 格滿
 await assert.rejects(()=>give(pl,'redPotion',1,''),/vault full/);
 const log=await query('select by_email,to_email,item_id,n from public.dragon_gm_give_log order by id');
 assert.equal(log.length,6);assert.deepEqual(log[0],{by_email:'gm@test.com',to_email:'Player@Test.com',item_id:'redPotion',n:500});
 console.log('gm-give.sql tests passed');
}
main().catch(e=>{console.error(e);process.exit(1);});
