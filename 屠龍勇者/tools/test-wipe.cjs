// 僅在記憶體PostgreSQL驗證洗白，不連線正式Supabase、不讀寫玩家存檔。
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {PGlite}=require(process.env.LOOT_TEST_RUNTIME||path.join(require('os').tmpdir(),'dark-loot-test-runtime/node_modules/@electric-sql/pglite'));
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('email','test@invalid','role','authenticated')$$;
 create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
 grant usage on schema public,auth to anon,authenticated;`);
 for(const file of ['supabase.sql','anticheat.sql','server-loot-install.sql']){
  const sql=fs.readFileSync(path.join(__dirname,file),'utf8').replace(/create extension if not exists pgcrypto;/i,'');
  await db.exec(sql);
 }
 const uid='11111111-1111-4111-8111-111111111111', banned='22222222-2222-4222-8222-222222222222';
 await db.query('insert into auth.users values($1,$2),($3,$4)',[uid,'wipe-test@invalid',banned,'banned@invalid']);
 await db.exec(`select set_config('request.jwt.claim.sub','${uid}',false)`);
 const p={created:123,cls:'knight',name:'隔離測試',lv:5,exp:0,gold:999,inv:[],storage:[],equip:{},loc:{type:'zone',id:'island'},quests:{ch:0,active:false},towerMax:10};
 const sig=(await db.query('select public.dragon_save_sig($1,0,$2) as sig',[uid,p])).rows[0].sig;
 await db.query('insert into public.dragon_saves(user_id,slot,client_t,name,cls,lv,data) values($1,0,1,$2,$3,5,$4)',[uid,p.name,p.cls,{schema:5,player:p,sig,lootProtocol:1,lootCursor:0}]);
 await db.query('insert into public.dragon_admins(user_id) values($1)',[uid]);
 await db.query('insert into public.dragon_bans(user_id,reason) values($1,$2)',[banned,'保留封鎖']);
 await db.query('insert into public.dragon_profiles(user_id,email,last_name) values($1,$2,$3) on conflict(user_id) do update set email=excluded.email,last_name=excluded.last_name',[uid,'wipe-test@invalid',p.name]);
 await db.query('insert into public.dragon_wallet(user_id,diamonds,drop_mob,drop_boss) values($1,999,10,15)',[uid]);
 await db.query('insert into public.dragon_dia_log(user_id,delta,reason) values($1,999,$2)',[uid,'測試']);
 await db.query('insert into public.dragon_vault(user_id,gold) values($1,99999)',[uid]);
 await db.query("insert into public.dragon_vault_items(user_id,from_slot,uid,item_id,item) values($1,0,1,'potion','{}')",[uid]);
 await db.query("insert into public.dragon_vault_out(user_id,slot,item,gold) values($1,0,'{}',888)",[uid]);
 await db.query("insert into public.dragon_deleted_chars(user_id,char_created,cls) values($1,456,'knight')",[uid]);
 await db.query("insert into public.dragon_online(user_id,session_id) values($1,'test-session')",[uid]);
 await db.exec('update public.dragon_loot_config set enabled=true');
 const spawn=(await db.query('select public.loot_spawn(0,$1,$2,false,null) as value',['123|knight',crypto.randomUUID()])).rows[0].value;
 await db.exec("update public.dragon_loot_jobs set created_at=clock_timestamp()-interval '1 second'");
 await db.query('select public.loot_finish($1)',[spawn[0].ticket]);
 const clear=['dragon_saves','dragon_save_log','dragon_flags','raid_members','raid_rooms','dragon_chat','dragon_mutes','dragon_clan_apps','dragon_clan_members','dragon_clans','dragon_wb_claims','dragon_wb_hits','dragon_wb','dragon_market','dragon_wallet','dragon_dia_log','dragon_vault','dragon_vault_items','dragon_vault_out','dragon_loot_jobs','dragon_loot_state','dragon_save_dev','dragon_deleted_chars','dragon_online'];
 const preserve=['auth.users','public.dragon_admins','public.dragon_bans','public.dragon_profiles','public.dragon_loot_config','public.dragon_loot_catalog','public.dragon_loot_rules'];
 const before={};for(const t of preserve)before[t]=(await db.query(`select * from ${t}`)).rows;
 for(const t of ['dragon_saves','dragon_save_log','dragon_wallet','dragon_dia_log','dragon_vault','dragon_vault_items','dragon_vault_out','dragon_loot_jobs','dragon_loot_state','dragon_save_dev','dragon_deleted_chars','dragon_online']){
  assert.ok(Number((await db.query(`select count(*) as n from public.${t}`)).rows[0].n)>0,`${t}有測試資料`);
 }
 const wipe=fs.readFileSync(path.join(__dirname,'wipe.sql'),'utf8');
 for(let run=0;run<2;run++){
  await db.exec(wipe);
  for(const t of clear)assert.equal(Number((await db.query(`select count(*) as n from public.${t}`)).rows[0].n),0,`${t}清空`);
  for(const t of preserve){
   const expected=before[t].map(r=>t==='public.dragon_profiles'?{...r,last_name:null}:r);
   assert.deepEqual((await db.query(`select * from ${t}`)).rows,expected,`${t}保留`);
  }
 }
 const daily=(await db.query('select public.dia_status() as value')).rows[0].value;
 assert.equal(daily.diamonds,5);assert.equal(daily.daily,5);
 const repeat=(await db.query('select public.dia_status() as value')).rows[0].value;
 assert.equal(repeat.diamonds,5);assert.equal(repeat.daily,0);
 assert.equal(Number((await db.query('select count(*) as n from public.dragon_vault_out')).rows[0].n),0);
 // 正式環境可能未安裝裝置／刪角／在線附加表；缺表仍清除現存錢包及待領。
 await db.exec('drop table public.dragon_save_dev,public.dragon_deleted_chars,public.dragon_online');
 await db.query("insert into public.dragon_vault_out(user_id,slot,gold) values($1,0,777)",[uid]);
 await db.exec(wipe);
 for(const t of clear.filter(t=>!['dragon_save_dev','dragon_deleted_chars','dragon_online'].includes(t)))
  assert.equal(Number((await db.query(`select count(*) as n from public.${t}`)).rows[0].n),0,`${t}缺附加表仍清空`);
 assert.equal((await db.query('select enabled from public.dragon_loot_config')).rows[0].enabled,true);
 // 清單外相依表必須擋住整筆清除，不能悄悄CASCADE或部分刪除。
 await db.query('insert into public.dragon_vault(user_id,gold) values($1,999)',[uid]);
 await db.exec('create table public.wipe_test_dependency(user_id uuid references public.dragon_vault(user_id))');
 await assert.rejects(db.exec(wipe),/foreign key/i);
 await db.exec('rollback');
 assert.equal(Number((await db.query('select gold from public.dragon_vault')).rows[0].gold),999);
 assert.equal(Number((await db.query('select count(*) as n from auth.users')).rows[0].n),2);
 await db.close();console.log('PASS：完整及缺附加表洗白／重跑、帳號與規則保留、每日5鑽、未知外鍵拒絕並整筆回滾。');
})().catch(e=>{console.error(e);process.exitCode=1;});
