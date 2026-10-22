// 在隔離PostgreSQL載入現有正式SQL，再加掉寶migration；不連正式主機。
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {PGlite}=require(process.env.LOOT_TEST_RUNTIME||path.join(require('os').tmpdir(),'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid','role','authenticated')$$;
 create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
 grant usage on schema public,auth to anon,authenticated;
 `);
 for(const file of ['supabase.sql','anticheat.sql','server-loot-install.sql','server-loot-install.sql']){
  let sql=fs.readFileSync(path.join(__dirname,file),'utf8');
  // PGlite無pgcrypto擴充，但本測試所用gen_random_uuid及SHA256為PG內建。
  if(file==='supabase.sql')sql=sql.replace(/create extension if not exists pgcrypto;/i,'');
  try{await db.exec(sql);}catch(e){console.error('Failed migration:',file,e.message,e.position,e.where);throw e;}
 }
 assert.equal((await db.query('select enabled from public.dragon_loot_config')).rows[0].enabled,false);
 const uid='11111111-1111-4111-8111-111111111111';
 await db.query('insert into auth.users values($1,$2)',[uid,'loot-test@invalid']);
 await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false)`);
 const p={created:123,cls:'knight',name:'隔離測試',lv:5,exp:0,gold:300,inv:[],storage:[],equip:{},loc:{type:'zone',id:'island'},quests:{ch:0,active:false},towerMax:10};
 const sig=(await db.query('select public.dragon_save_sig($1,0,$2) as sig',[uid,p])).rows[0].sig;
 await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,5,$4)',[uid,p.name,p.cls,{schema:5,player:p,sig,lootProtocol:1,lootCursor:0}]);
 await db.exec('update public.dragon_loot_config set enabled=true;set role authenticated');
 const spawned=(await db.query('select public.loot_spawn(0,$1,$2,false,null) as value',['123|knight',crypto.randomUUID()])).rows[0].value;
 await db.exec("reset role;update public.dragon_loot_jobs set created_at=clock_timestamp()-interval '1 second';set role authenticated");
 const award=(await db.query('select public.loot_finish($1) as value',[spawned[0].ticket])).rows[0].value;
 assert.equal(award.cursor,1);
 await db.exec('reset role');
 assert.equal((await db.query('select sig_ok from public.dragon_saves where user_id=$1',[uid])).rows[0].sig_ok,true);
 await db.close();console.log('PASS：現有supabase.sql＋anticheat.sql＋後端掉寶migration重複部署、真實簽章trigger／RLS及掉寶RPC相容。');
})().catch(e=>{console.error(e.message);process.exit(1);});
