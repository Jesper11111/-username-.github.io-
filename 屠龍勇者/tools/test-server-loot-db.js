// 真正PostgreSQL(PGlite)隔離測試；僅記憶體，絕不連正式Supabase。
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const runtime=process.env.LOOT_TEST_RUNTIME||path.join(require('os').tmpdir(),'dark-loot-test-runtime/node_modules/@electric-sql/pglite');
const {PGlite}=require(runtime);
const uuid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
async function main(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;
 create table public.dragon_saves(user_id uuid,slot int,data jsonb,client_t bigint,primary key(user_id,slot));
 create table public.raid_rooms(id uuid primary key,round int,raid text,status text,result jsonb);
 create table public.raid_members(room_id uuid,user_id uuid,char_id text,ready_round int);
 create function public.dragon_is_banned() returns boolean language sql as $$select coalesce(current_setting('test.banned',true),'')='yes'$$;
 create function public.dragon_save_ok(uuid,int) returns boolean language sql as $$select true$$;
 create table public.test_diamonds(n int);insert into public.test_diamonds values(0);
 create function public.dia_drop(text) returns json language plpgsql as $$begin update public.test_diamonds set n=n+1;return json_build_object('diamonds',(select n from public.test_diamonds),'got',1);end$$;
 create table public.test_wb(id bigint primary key);
 create function public.wb_claim(bigint) returns json language plpgsql as $$begin insert into public.test_wb values($1);return '{"killed":true,"rank":1,"killer_me":true,"my_dmg":100,"total":100}'::json;end$$;
 `);
 const sql=fs.readFileSync(path.join(__dirname,'server-loot.sql'),'utf8');
 await db.exec(sql);await db.exec(sql); // 必須可重複安裝，且不重設enabled
 await db.exec(fs.readFileSync(path.join(__dirname,'loot-catalog.sql'),'utf8'));
 const cat=JSON.parse(fs.readFileSync(path.join(__dirname,'loot-catalog.json'),'utf8'));
 const player={created:123,cls:'knight',lv:80,inv:[],quests:{ch:0,active:false,prog:0},loc:{type:'zone',id:'island',floor:1},towerMax:100,dragonCd:{},dragons:{},towerCleared:{},towerBossCd:{}};
 const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
 const rpc=async(fn,args)=> (await query(`select public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args))[0].value;
 const reject=async(fn,pattern)=>assert.rejects(fn,pattern);
 await db.query('insert into public.dragon_saves values($1,0,$2,1)',[uuid,{schema:5,lootProtocol:1,lootCursor:0,player}]);
 await db.exec(`update public.dragon_loot_config set enabled=true;set role authenticated;select set_config('request.jwt.claim.sub','${uuid}',false)`);
 assert.equal((await rpc('loot_status',[])).enabled,true);
 await reject(()=>query('select * from public.dragon_loot_jobs'),/permission denied/);
 await reject(()=>rpc('loot_roll',[cat,{}]),/permission denied/);
 await reject(()=>rpc('dia_drop',['boss']),/loot ticket required/);
 await reject(()=>rpc('wb_claim',[1]),/loot client outdated/);
 await reject(()=>rpc('loot_spawn',[0,'123|mage',crypto.randomUUID(),false,null]),/character changed/);
 await reject(()=>rpc('loot_spawn',[0,'123|knight',crypto.randomUUID(),false,'valakas']),/invalid monster/);
 const key=crypto.randomUUID(),spawn=await rpc('loot_spawn',[0,'123|knight',key,false,null]);
 assert(spawn.length>=1&&spawn.length<=6);assert(spawn.every(x=>cat.zones.island.mons.includes(x.monster.id)||x.monster.id===cat.zones.island.rare.id));
 const again=await rpc('loot_spawn',[0,'123|knight',key,false,null]);assert.deepEqual(again.map(x=>x.ticket).sort(),spawn.map(x=>x.ticket).sort());
 await db.exec(`reset role;update public.dragon_loot_jobs set created_at=clock_timestamp()-interval '1 second';set role authenticated;`);
 const award=await rpc('loot_finish',[spawn[0].ticket]),duplicate=await rpc('loot_finish',[spawn[0].ticket]);
 assert.deepEqual(award,duplicate);assert.equal(award.cursor,1);
 const pending=await rpc('loot_pending',[0,'123|knight']);assert.equal(pending.length,1);
 await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
 await reject(()=>rpc('loot_finish',[spawn[0].ticket]),/ticket missing/);
 await db.exec(`select set_config('request.jwt.claim.sub','${uuid}',false);select set_config('test.banned','yes',false)`);
 await reject(()=>rpc('loot_finish',[spawn[0].ticket]),/not allowed/);
 await db.exec(`select set_config('test.banned','no',false);reset role;`);
 await db.query(`update public.dragon_saves set data=jsonb_set(data,'{lootCursor}','1') where user_id=$1`,[uuid]);
 await reject(()=>db.query(`update public.dragon_saves set data=jsonb_set(data,'{lootCursor}','0') where user_id=$1`,[uuid]),/cursor conflict/);
 await reject(()=>db.query(`update public.dragon_saves set data=data-'lootProtocol' where user_id=$1`,[uuid]),/client outdated/);
 // 全怪物、三品質、地圖與任務道具抽選規格，直接跑真實SQL而非複製實作。
 for(const m of Object.values(cat.monsters)){
  const items=await rpc('loot_roll',[cat,{monster:m,zone:cat.zones.island,player}]);
  for(const it of items){assert(cat.items[it.id]);assert(it.n>0);if(it.af)assert.equal(new Set(it.af.map(a=>a.k)).size,it.af.length);}
 }
 for(const quality of ['magic','rare','legend']){
  const it=await rpc('loot_item',[cat,'longSword',1,quality,75]);assert.equal(it.q,quality);assert(it.af.length>=1);
  const map=await rpc('loot_map',[cat,15]);assert.equal(map.id,'map15');if(map.mm)assert.equal(new Set(map.mm).size,map.mm.length);
 }
 const material=Object.keys(cat.items).find(id=>cat.items[id].cat==='material');
 const guaranteed=structuredClone(cat);guaranteed.common=[{id:material,p:1}];
 const boss=structuredClone(cat.monsters.wakingDrake);boss.drops=[];
 const guaranteedItems=await rpc('loot_roll',[guaranteed,{monster:boss,zone:{id:'island',drops:[]},player}]);
 assert(guaranteedItems.some(x=>x.id===material),'首領0.1%材料例外只能套怪物自身掉落，不能覆蓋通用池');
 const room=crypto.randomUUID();
 await db.query('insert into public.raid_rooms values($1,1,$2,$3,$4)',[room,'drake','fighting',{win:true,members:[{uid:uuid}]}]);
 await db.query('insert into public.raid_members values($1,$2,$3,1)',[room,uuid,'123|knight']);
 await db.exec('set role authenticated');
 const raid=await rpc('loot_raid',[0,'123|knight',room,1]);assert.equal(raid.cursor,2);assert.deepEqual(await rpc('loot_raid',[0,'123|knight',room,1]),raid);
 await reject(()=>rpc('loot_raid',[0,'123|knight',room,2]),/not won/);
 await rpc('loot_worldboss',[0,'123|knight',7]);await reject(()=>rpc('loot_worldboss',[0,'123|knight',7]),/already claimed/);
 const all=await rpc('loot_pending',[0,'123|knight']);assert.equal(all.length,2);assert.equal(all[1].items.length,2);
 await db.exec('reset role');assert.equal((await query('select count(*) as n from public.test_wb'))[0].n,1);
 const mapPlayer={...player,created:456,loc:{type:'zone',id:'pyramid'},mapRun:{zone:'pyramid',t:5,left:0,mods:[]}};
 await db.query('insert into public.dragon_saves values($1,1,$2,1)',[uuid,{schema:5,lootProtocol:1,lootCursor:0,player:mapPlayer}]);
 await db.exec('set role authenticated');
 const mapSpawn=await rpc('loot_spawn',[1,'456|knight',crypto.randomUUID(),false,null]);
 assert.equal(mapSpawn.length,1);const mapBoss=mapSpawn[0].monster,base=cat.monsters[cat.zones.pyramid.rare.id];
 assert.equal(mapBoss.mapBoss,true);assert.deepEqual(mapBoss.gold,base.gold.map(x=>x*5));assert.deepEqual(mapBoss.dmg,base.dmg.map(x=>Math.round(x*1.3)));
 await rpc('loot_release',[1,'456|knight',[]]);await reject(()=>rpc('loot_finish',[mapSpawn[0].ticket]),/cancelled/);
 await db.exec('reset role');
 mapPlayer.mapRun=null;mapPlayer.loc={type:'zone',id:'tower',floor:10};
 await db.query('update public.dragon_saves set data=$1 where user_id=$2 and slot=1',[{schema:5,lootProtocol:1,lootCursor:0,player:mapPlayer},uuid]);
 await db.exec('set role authenticated');
 const tower=await rpc('loot_spawn',[1,'456|knight',crypto.randomUUID(),false,null]);assert.equal(tower[0].monster.towerFloor,10);
 // 毒霧巢穴實際後端生怪資格、專屬材料單個掉落；機率只改測試副本，不改正式目錄。
 await db.exec('reset role');
 mapPlayer.loc={type:'zone',id:'venomNest',floor:1};
 await db.query('update public.dragon_saves set data=$1 where user_id=$2 and slot=1',[{schema:7,lootProtocol:1,lootCursor:0,player:mapPlayer},uuid]);
 await db.exec("update public.dragon_loot_catalog set data=jsonb_set(data,'{zones,venomNest,rare,p}','1') where id=1");
 await db.exec('set role authenticated');
 const nest=await rpc('loot_spawn',[1,'456|knight',crypto.randomUUID(),false,null]);assert.equal(nest.length,1);assert.equal(nest[0].monster.id,'venomQueen');assert.equal(nest[0].monster.boss,true);
 await db.exec('reset role');
 assert.equal(cat.monsters.venomQueen.drops.find(d=>d.id==='spiderVenom').p,.001);
 assert.equal(cat.items.soul_spiderVenom.soulEnchant,'spiderVenom');assert.equal(cat.mapZones.some(z=>z.id==='venomNest'),false);
 const poisonCat=structuredClone(cat);poisonCat.bossMaterialP=1;poisonCat.monsters.venomQueen.drops=[{id:'spiderVenom',p:1,n:[1,1]}];
 const poisonItems=await rpc('loot_roll',[poisonCat,{monster:poisonCat.monsters.venomQueen,zone:cat.zones.venomNest,player:mapPlayer}]);
 assert.equal(poisonItems.find(x=>x.id==='spiderVenom').n,1);
 await db.close();console.log('PASS：PostgreSQL重複安裝、RLS／權限、怪物資格、重送與收據、全怪物／詞綴、團戰／世界首領、毒霧巢穴蛛后及專屬材料。');
}
main().catch(e=>{console.error(e.message,e.position,e.internalPosition,e.where);if(e.query&&e.position){const p=Number(e.position);console.error(e.query.slice(Math.max(0,p-160),p+100));}if(e.internalQuery)console.error(e.internalQuery);process.exit(1);});
