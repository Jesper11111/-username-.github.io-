-- 黑暗大陸：線上後端掉寶 v1。先在測試專案驗證；由使用者執行。
-- 依賴現有 supabase.sql、anticheat.sql。接著執行 loot-catalog.sql。
-- 安裝不啟用；前端上線後才 update public.dragon_loot_config set enabled=true where id=1;
begin;
create table if not exists public.dragon_loot_config(id int primary key check(id=1), enabled boolean not null default false);
insert into public.dragon_loot_config values(1,false) on conflict do nothing;
create table if not exists public.dragon_loot_catalog(id int primary key check(id=1),version text not null,data jsonb not null);
create table if not exists public.dragon_loot_rules(version text primary key,data jsonb not null);
create table if not exists public.dragon_loot_state(user_id uuid not null, char_id text not null, issued bigint not null default 0, acknowledged bigint not null default 0, primary key(user_id,char_id));
create table if not exists public.dragon_loot_jobs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,slot int not null check(slot between 0 and 7),char_id text not null,
 event_key text not null,created_at timestamptz not null default clock_timestamp(),context jsonb not null,
 result jsonb,cursor bigint, unique(user_id,event_key),unique(user_id,char_id,cursor));
create index if not exists dragon_loot_jobs_owner on public.dragon_loot_jobs(user_id,char_id,created_at);
-- 保留舊RPC實作供尚未啟用時使用；啟用後不能繞過擊殺憑證直接索取鑽石／世界首領物品。
do $$ begin
 if to_regprocedure('public.loot_dia_drop_legacy(text)') is null then alter function public.dia_drop(text) rename to loot_dia_drop_legacy;end if;
 if to_regprocedure('public.loot_wb_claim_legacy(bigint)') is null then alter function public.wb_claim(bigint) rename to loot_wb_claim_legacy;end if;
end $$;
revoke all on function public.loot_dia_drop_legacy(text),public.loot_wb_claim_legacy(bigint) from public,anon,authenticated;
create or replace function public.dia_drop(p_src text) returns json language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from public.dragon_loot_config cfg where cfg.id=1 and enabled) then raise exception 'loot ticket required';end if;
 return public.loot_dia_drop_legacy(p_src);end $$;
create or replace function public.wb_claim(p_wb bigint) returns json language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from public.dragon_loot_config cfg where cfg.id=1 and enabled) then raise exception 'loot client outdated';end if;
 return public.loot_wb_claim_legacy(p_wb);end $$;
revoke all on function public.dia_drop(text),public.wb_claim(bigint) from public,anon;
grant execute on function public.dia_drop(text),public.wb_claim(bigint) to authenticated;
alter table public.dragon_loot_config enable row level security;
alter table public.dragon_loot_catalog enable row level security;
alter table public.dragon_loot_rules enable row level security;
alter table public.dragon_loot_state enable row level security;
alter table public.dragon_loot_jobs enable row level security;
revoke all on public.dragon_loot_config,public.dragon_loot_catalog,public.dragon_loot_rules,public.dragon_loot_state,public.dragon_loot_jobs from public,anon,authenticated;

create or replace function public.loot_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('protocol',1,'enabled',enabled,'rules',(select version from public.dragon_loot_catalog catalog where catalog.id=1)) from public.dragon_loot_config cfg where cfg.id=1;
$$;
create or replace function public.loot_pick(a jsonb) returns jsonb language sql volatile set search_path='' as $$
 select a->floor(random()*jsonb_array_length(a))::int where jsonb_array_length(a)>0;
$$;
create or replace function public.loot_int(lo int,hi int) returns int language sql volatile set search_path='' as $$ select lo+floor(random()*(hi-lo+1))::int; $$;
create or replace function public.loot_quality(boss boolean,guaranteed boolean) returns text language plpgsql volatile set search_path='' as $$
declare r numeric:=random();begin
 if boss then return case when r<0.10 then 'legend' when r<0.45 then 'rare' else 'magic' end; end if;
 if guaranteed then return case when r<0.04 then 'legend' when r<0.25 then 'rare' else 'magic' end; end if;
 return case when r<0.02 then 'legend' when r<0.12 then 'rare' when r<0.40 then 'magic' else null end;
end $$;
create or replace function public.loot_item(c jsonb,id text,n int,q text,lv int) returns jsonb language plpgsql volatile set search_path='' as $$
declare d jsonb:=c->'items'->id; it jsonb:=jsonb_build_object('id',id,'n',n,'ench',0); pool jsonb; af jsonb:='[]'; k text; a jsonb; l jsonb; value numeric; hi numeric; mul numeric; cnt int; nm text;
begin
 if d is null or n<1 then raise exception 'unknown loot item'; end if;
 if d->>'cat'='map' then
  if q is not null then
   cnt:=case when q='magic' then public.loot_int(1,2) else public.loot_int(3,4) end;
   select jsonb_agg(key) into pool from jsonb_each(c->'mapMods');
   for i in 1..cnt loop k:=public.loot_pick(pool)#>>'{}';af:=af||jsonb_build_array(k);pool:=pool-k;end loop;
   nm:=case when q='magic' then (c->'mapMods'->(af->>0)->>'name')||'的' else public.loot_pick(c->'rareNames')#>>'{}' end;
   it:=it||jsonb_build_object('q',q,'mm',af,'nm',nm);
  end if;return it;
 end if;
 if q is null or d->>'cat' not in ('weapon','armor') then return it;end if;
 pool:=d->'affixes'; cnt:=case when q='magic' then public.loot_int(1,2) when q='rare' then public.loot_int(3,4) else 5 end;
 if q='legend' then select jsonb_agg(x) into l from jsonb_array_elements(c->'legend') x where pool ? (x->>'k');l:=public.loot_pick(l);nm:=l->>'title';end if;
 for i in 1..cnt loop
  if jsonb_array_length(pool)=0 then exit;end if;
  mul:=1;
  if i=1 and q='legend' then k:=l->>'k';mul:=(l->>'mul')::numeric;else k:=public.loot_pick(pool)#>>'{}';end if;
  pool:=pool-k;a:=c->'affixes'->k;hi:=(a->'max'->least(110,lv))::numeric*mul;
  value:=(a->>'min')::numeric+random()*(hi-(a->>'min')::numeric);
  value:=case when (a->>'pct')::boolean then round(value,2) else round(value) end;
  af:=af||jsonb_build_array(jsonb_build_object('k',k,'v',value)||case when i=1 and q='legend' then '{"lg":1}'::jsonb else '{}'::jsonb end);
 end loop;
 if q='rare' then nm:=public.loot_pick(c->'rareNames')#>>'{}';elsif q='magic' then nm:=c->'affixes'->(af->0->>'k')->>'pre';end if;
 return it||jsonb_build_object('q',q,'af',af,'il',lv,'nm',nm);
end $$;
create or replace function public.loot_map(c jsonb,t int) returns jsonb language plpgsql volatile set search_path='' as $$
declare r numeric:=random();begin return public.loot_item(c,'map'||greatest(1,least(15,t)),1,case when r<0.5 then null when r<0.85 then 'magic' else 'rare' end,1);end $$;
create or replace function public.loot_roll(c jsonb,x jsonb) returns jsonb language plpgsql volatile set search_path='' as $$
declare m jsonb:=x->'monster';z jsonb:=x->'zone';p jsonb:=x->'player';mr jsonb:=x->'map';dr jsonb;pool jsonb;out jsonb:='[]';id text;q text;n int;lv int:=(m->>'lv')::int;boss boolean:=coalesce((m->>'boss')::boolean,false);qm numeric:=1;prob numeric;r numeric;total numeric;mt int;g jsonb;
begin
 if mr is not null and mr<>'null'::jsonb then for id in select jsonb_array_elements_text(coalesce(mr->'mods','[]')) loop qm:=qm+coalesce((c->'mapMods'->id->>'bonus')::numeric,0);end loop;end if;
 select coalesce(jsonb_agg(v||'{"monsterRule":true}'::jsonb),'[]') into pool from jsonb_array_elements(coalesce(m->'drops','[]')) v;
 pool:=coalesce(c->'common','[]')||case when not boss or coalesce((m->>'towerFloor')::int,0)>0 then coalesce(z->'drops','[]') else '[]'::jsonb end||pool;
 for dr in select * from jsonb_array_elements(pool) loop
  if lv<coalesce((dr->>'minLv')::int,0) or lv>coalesce((dr->>'maxLv')::int,1000) then continue;end if;
  id:=dr->>'id';prob:=(dr->>'p')::numeric;
  if boss and dr ? 'monsterRule' and c->'items'->id->>'cat'='material' then prob:=(c->>'bossMaterialP')::numeric;elsif prob<1 then prob:=prob*qm;end if;
  if random()<prob then
   n:=case when dr ? 'n' then public.loot_int((dr->'n'->>0)::int,(dr->'n'->>1)::int) else 1 end;
   q:=public.loot_quality(boss,false);out:=out||jsonb_build_array(public.loot_item(c,id,n,q,lv));
  end if;
 end loop;
 if random()<(case when boss then 0.6 else 0.03 end)*qm then
  select sum((v->>'w')::numeric) into total from jsonb_array_elements(c->'currency') v where coalesce((v->>'minLv')::int,0)<=lv;r:=random()*total;
  for dr in select * from jsonb_array_elements(c->'currency') v where coalesce((v->>'minLv')::int,0)<=lv loop r:=r-(dr->>'w')::numeric;if r<0 then out:=out||jsonb_build_array(public.loot_item(c,dr->>'id',case when boss then public.loot_int(1,3) else 1 end,null,lv));exit;end if;end loop;
 end if;
 if random()<(case when mr is not null and mr<>'null'::jsonb then 0.015 else 0.004 end)*qm then
  if mr is not null and mr<>'null'::jsonb then mt:=(mr->>'t')::int+(array[-1,0,0,1])[public.loot_int(1,4)];
  else select greatest(1,count(*)::int) into mt from jsonb_array_elements(c->'mapZones') v where (v->>'lv')::int<=lv;end if;
  out:=out||jsonb_build_array(public.loot_map(c,mt));
 end if;
 if random()<(case when boss then 0.25 else 0.003 end) then
  select jsonb_agg(key) into pool from jsonb_each(c->'items') where value->>'cat'='book' and not(value ? 'price') and (value->>'bookLv')::int<=lv+5;
  if jsonb_array_length(pool)>0 then out:=out||jsonb_build_array(public.loot_item(c,public.loot_pick(pool)#>>'{}',1,null,lv));end if;
 end if;
 if coalesce((m->>'mapBoss')::boolean,false) then
  if random()<(c->>'resMapBossP')::numeric*qm then
   select jsonb_agg(key) into pool from jsonb_each(c->'resonance') where (value->>'tier')::int<=(c->'resTiers'->((mr->>'t')::int))::int;
   if jsonb_array_length(pool)>0 then out:=out||jsonb_build_array(public.loot_item(c,public.loot_pick(pool)#>>'{}',1,null,lv));end if;
  end if;
  r:=random();mt:=(mr->>'t')::int+case when r<0.55 then 0 when r<0.9 then 1 else 2 end;out:=out||jsonb_build_array(public.loot_map(c,mt));
  if random()<0.5 then out:=out||jsonb_build_array(public.loot_map(c,(mr->>'t')::int-public.loot_int(0,1)));end if;
 end if;
 if coalesce((m->>'elite')::boolean,false) or random()<(case when boss then 0.5 else 0.015 end)*qm then
  select jsonb_agg(key) into pool from jsonb_each(c->'items') where value->>'cat' in ('weapon','armor') and not(value ? 'classes') and not(value ? 'res') and (value->>'sellValue')::numeric<=greatest(300,lv*600);
  if jsonb_array_length(pool)>0 then out:=out||jsonb_build_array(public.loot_item(c,public.loot_pick(pool)#>>'{}',1,public.loot_quality(boss,true),lv));end if;
 end if;
 g:=c->'quests'->(p->>'cls')->coalesce((p->'quests'->>'ch')::int,0);
 if coalesce((p->'quests'->>'active')::boolean,false) and g->>'type'='collect' and g->>'zone'=z->>'id' then
  select coalesce(sum((v->>'n')::int),0) into n from jsonb_array_elements(p->'inv') v where v->>'id'=g->>'item';
  if n<(g->>'n')::int and random()<(g->>'p')::numeric then out:=out||jsonb_build_array(public.loot_item(c,g->>'item',1,null,lv)||jsonb_build_object('questMax',(g->>'n')::int));end if;
 end if;
 return out;
end $$;

create or replace function public.loot_player(p_slot int,p_char text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;begin
 if auth.uid() is null then raise exception 'not logged in';end if;
 if public.dragon_is_banned() then raise exception 'banned';end if;
 if not exists(select 1 from public.dragon_loot_config cfg where cfg.id=1 and enabled) then raise exception 'loot disabled';end if;
 if not public.dragon_save_ok(auth.uid(),p_slot) then raise exception 'save signature';end if;
 select data->'player' into p from public.dragon_saves where user_id=auth.uid() and slot=p_slot;
 if p is null or (p->>'created')||'|'||(p->>'cls') is distinct from p_char then raise exception 'loot character changed';end if;
 return p;
end $$;

create or replace function public.loot_spawn(p_slot int,p_char text,p_key uuid,p_join boolean default false,p_mid text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;c jsonb;z jsonb;mr jsonb;g jsonb;m jsonb;pool jsonb;id text;f int;n int:=1;r int;ticket uuid;out jsonb:='[]';event text:=p_key::text;existing jsonb;is_map boolean;elite boolean;
begin
 p:=public.loot_player(p_slot,p_char);perform pg_advisory_xact_lock(7713201,hashtext(auth.uid()::text));
 select jsonb_agg(jsonb_build_object('ticket',j.id,'monster',j.context->'monster')) into existing from public.dragon_loot_jobs j where j.user_id=auth.uid() and j.event_key like event||':%';
 if exists(select 1 from public.dragon_loot_jobs where user_id=auth.uid() and event_key like event||':%' and (slot<>p_slot or char_id<>p_char)) then raise exception 'loot character changed';end if;
 if existing is not null then return existing;end if;
 if (select count(*) from public.dragon_loot_jobs where user_id=auth.uid() and result is null and not(context ? 'cancelled') and created_at>clock_timestamp()-interval '10 minutes')>=8 then raise exception 'loot encounters full';end if;
 if (select count(*) from public.dragon_loot_jobs where user_id=auth.uid() and created_at>clock_timestamp()-interval '1 second')>=12 then raise exception 'loot rate';end if;
 select data into c from public.dragon_loot_catalog catalog where catalog.id=1;if c is null then raise exception 'loot catalog missing';end if;
 if p->'loc'->>'type'<>'zone' then raise exception 'loot wrong zone';end if;
 z:=c->'zones'->(p->'loc'->>'id');if z is null then raise exception 'loot wrong zone';end if;
 mr:=p->'mapRun';is_map:=mr is not null and mr<>'null'::jsonb and mr->>'zone'=z->>'id';if not is_map then mr:=null;end if;
 f:=coalesce((p->'loc'->>'floor')::int,1);g:=c->'quests'->(p->>'cls')->coalesce((p->'quests'->>'ch')::int,0);
 if p_mid is not null and not(coalesce(z->'mons','[]') ? p_mid) and not(z->>'type'='tower' and p_mid='tower') then raise exception 'loot invalid monster';end if;
 if is_map and (mr->>'left')::int<=0 and not p_join then
  id:=coalesce(z->'rare'->>'id',z->'mons'->>(jsonb_array_length(z->'mons')-1));m:=c->'monsters'->id;
  m:=m||jsonb_build_object('boss',true,'large',true,'mapBoss',true,'name','異界首領・'||(m->>'name'),'hp',round((m->>'hp')::numeric*case when z ? 'rare' then 2 else 8 end),'maxHp',round((m->>'maxHp')::numeric*case when z ? 'rare' then 2 else 8 end),'exp',round((m->>'exp')::numeric*case when z ? 'rare' then 3 else 10 end));
  m:=jsonb_set(m,'{dmg}',(select jsonb_agg(round(v::numeric*1.3)) from jsonb_array_elements(m->'dmg') v));
  m:=jsonb_set(m,'{gold}',(select jsonb_agg(v::numeric*5) from jsonb_array_elements(m->'gold') v));
 elsif not p_join and p_mid is null and coalesce((p->'quests'->>'active')::boolean,false) and g->>'type'='boss' and g->>'zone'=z->>'id' and not coalesce((p->'quests'->>'bossDone')::boolean,false) and coalesce((p->'quests'->>'prog')::int,0)>=(g->>'after')::int then
  m:=c->'questBosses'->(p->>'cls')->((p->'quests'->>'ch')::int)||'{"questBoss":true}'::jsonb;
 elsif z->>'type'='dragon' then
  if p_join or (p->>'lv')::int<(z->>'reqLv')::int or coalesce((p->'dragonCd'->>(z->>'boss'))::numeric,0)>extract(epoch from clock_timestamp())*1000 or (z ? 'prev' and coalesce((p->'dragons'->>(z->>'prev'))::int,0)=0) then raise exception 'loot dragon locked';end if;m:=c->'monsters'->(z->>'boss');
 elsif z->>'type'='tower' then
  if f<1 or f>100 or f>coalesce((p->>'towerMax')::int,10) then raise exception 'loot floor locked';end if;
  m:=c->'tower'->f::text->case when not p_join and p_mid is null and mod(f,10)=0 and (not coalesce((p->'towerCleared'->>f::text)::boolean,false) or coalesce((p->'towerBossCd'->>f::text)::numeric,0)<=extract(epoch from clock_timestamp())*1000) then 'boss' else 'normal' end;
 elsif not p_join and p_mid is null and not is_map and random()<coalesce((z->'rare'->>'p')::numeric,0) then m:=c->'monsters'->(z->'rare'->>'id');
 end if;
 if m is null or m='null'::jsonb then
  select jsonb_agg(v) into pool from jsonb_array_elements(z->'mons') v where is_map or (c->'monsters'->(v#>>'{}')->>'lv')::int<=(p->>'lv')::int+3;
  if pool is null then select jsonb_build_array(v) into pool from jsonb_array_elements(z->'mons') v order by (c->'monsters'->(v#>>'{}')->>'lv')::int limit 1;end if;
  m:=c->'monsters'->coalesce(p_mid,public.loot_pick(pool)#>>'{}');
 end if;
 if m is null then raise exception 'loot invalid monster';end if;
 if not p_join and p_mid is null and not coalesce((m->>'boss')::boolean,false) then
  r:=public.loot_int(1,100);n:=case when r<=30 then 1 when r<=55 then 2 when r<=75 then 3 when r<=87 then 4 when r<=95 then 5 else 6 end;
  n:=least(n,case when z->>'type'='tower' then 3 else 6 end+case when is_map and mr->'mods' ? 'swarm' then 2 else 0 end,case when is_map then greatest(1,(mr->>'left')::int) else 99 end);
 end if;
 for i in 1..n loop
  if i>1 then m:=case when z->>'type'='tower' then c->'tower'->f::text->'normal' else c->'monsters'->(public.loot_pick(pool)#>>'{}') end;end if;
  if z->>'type'='tower' and not coalesce((m->>'boss')::boolean,false) then m:=m||jsonb_build_object('name',public.loot_pick(c->'tower'->f::text->'names'),'large',random()<0.4);end if;
  elite:=is_map and mr->'mods' ? 'elite' and not coalesce((m->>'boss')::boolean,false) and random()<0.15;
 m:=m||jsonb_build_object('lootElite',elite);
  insert into public.dragon_loot_jobs(user_id,slot,char_id,event_key,context) values(auth.uid(),p_slot,p_char,event||':'||i,jsonb_build_object('monster',m||jsonb_build_object('elite',elite),'zone',jsonb_build_object('id',z->>'id','drops',coalesce(z->'drops','[]')),'map',case when is_map then jsonb_build_object('t',mr->'t','mods',mr->'mods') else null end,'player',jsonb_build_object('cls',p->>'cls','quests',p->'quests','inv',coalesce((select jsonb_agg(v) from jsonb_array_elements(p->'inv') v where v->>'id'=g->>'item'),'[]')),'rules',c->>'version')) returning dragon_loot_jobs.id into ticket;
  out:=out||jsonb_build_array(jsonb_build_object('ticket',ticket,'monster',m));
 end loop;return out;
end $$;

create or replace function public.loot_finish(p_ticket uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.dragon_loot_jobs;c jsonb;s bigint;dia jsonb;begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'not allowed';end if;
 select * into j from public.dragon_loot_jobs where id=p_ticket and user_id=auth.uid() for update;if j.id is null then raise exception 'loot ticket missing';end if;
 perform public.loot_player(j.slot,j.char_id);
 if j.context ? 'cancelled' then raise exception 'loot ticket cancelled';end if;
 if j.result is not null then return jsonb_build_object('id',j.id,'cursor',j.cursor,'items',j.result,'char',j.char_id,'slot',j.slot);end if;
 if clock_timestamp()<j.created_at+interval '150 milliseconds' then raise exception 'loot too soon';end if;
 if clock_timestamp()>j.created_at+interval '12 hours' then raise exception 'loot ticket expired';end if;
 select data into c from public.dragon_loot_rules where version=j.context->>'rules';if c is null then raise exception 'loot rules missing';end if;
 insert into public.dragon_loot_state(user_id,char_id) values(auth.uid(),j.char_id) on conflict do nothing;
 update public.dragon_loot_state set issued=issued+1 where user_id=auth.uid() and char_id=j.char_id returning issued into s;
 update public.dragon_loot_jobs set result=public.loot_roll(c,j.context),cursor=s where id=j.id returning * into j;
 if coalesce((j.context->'monster'->>'boss')::boolean,false) or random()<0.001 then
  dia:=public.loot_dia_drop_legacy(case when coalesce((j.context->'monster'->>'boss')::boolean,false) then 'boss' else 'mob' end)::jsonb;
  update public.dragon_loot_jobs set context=context||jsonb_build_object('diamonds',dia) where id=j.id;
 end if;
 return jsonb_build_object('id',j.id,'cursor',s,'items',j.result,'char',j.char_id,'slot',j.slot);
end $$;

create or replace function public.loot_release(p_slot int,p_char text,p_keep uuid[]) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform public.loot_player(p_slot,p_char);
 if coalesce(array_length(p_keep,1),0)>128 then raise exception 'loot invalid keep list';end if;
 update public.dragon_loot_jobs set context=context||'{"cancelled":true}'::jsonb where user_id=auth.uid() and slot=p_slot and char_id=p_char and result is null and not(id=any(coalesce(p_keep,'{}'::uuid[])));
 return true;
end $$;
revoke all on function public.loot_release(int,text,uuid[]) from public,anon;
grant execute on function public.loot_release(int,text,uuid[]) to authenticated;

create or replace function public.loot_raid(p_slot int,p_char text,p_room uuid,p_round int) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;r public.raid_rooms;def jsonb;c jsonb;ticket uuid;event text:='raid:'||p_room||':'||p_round;begin
 p:=public.loot_player(p_slot,p_char);perform pg_advisory_xact_lock(7713201,hashtext(auth.uid()::text));
 select id into ticket from public.dragon_loot_jobs where user_id=auth.uid() and event_key=event;
 if ticket is not null then return public.loot_finish(ticket);end if;
 select * into r from public.raid_rooms where id=p_room;
 if r.id is null or r.round<>p_round or r.status not in ('fighting','done') or not coalesce((r.result->>'win')::boolean,false) then raise exception 'loot raid not won';end if;
 if not exists(select 1 from public.raid_members where room_id=p_room and user_id=auth.uid() and char_id=p_char and ready_round=p_round) or not exists(select 1 from jsonb_array_elements(r.result->'members') v where v->>'uid'=auth.uid()::text) then raise exception 'loot raid not member';end if;
 select data into c from public.dragon_loot_catalog catalog where catalog.id=1;def:=c->'raids'->r.raid;if def is null then raise exception 'loot invalid raid';end if;
 insert into public.dragon_loot_jobs(user_id,slot,char_id,event_key,created_at,context) values(auth.uid(),p_slot,p_char,event,clock_timestamp()-interval '1 second',jsonb_build_object('monster',c->'monsters'->(def->>'boss'),'zone',jsonb_build_object('id',def->>'zone','drops','[]'::jsonb),'player',jsonb_build_object('cls',p->>'cls','quests',jsonb_build_object('active',false),'inv','[]'::jsonb),'rules',c->>'version')) returning dragon_loot_jobs.id into ticket;
 return public.loot_finish(ticket);
end $$;

create or replace function public.loot_pending(p_slot int,p_char text) returns jsonb language plpgsql security definer set search_path='' as $$
declare out jsonb;begin
 perform public.loot_player(p_slot,p_char);
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'cursor',j.cursor,'items',j.result,'diamonds',j.context->'diamonds','char',j.char_id,'slot',j.slot) order by j.cursor),'[]') into out from public.dragon_loot_jobs j left join public.dragon_loot_state s on s.user_id=j.user_id and s.char_id=j.char_id where j.user_id=auth.uid() and j.slot=p_slot and j.char_id=p_char and j.result is not null and j.cursor>coalesce(s.acknowledged,0);
 return out;
end $$;

create or replace function public.loot_worldboss(p_slot int,p_char text,p_wb bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare claim jsonb;items jsonb:='[]';j public.dragon_loot_jobs;s bigint;event text:='worldboss:'||p_wb;begin
 perform public.loot_player(p_slot,p_char);perform pg_advisory_xact_lock(7713201,hashtext(auth.uid()::text));
 select * into j from public.dragon_loot_jobs where user_id=auth.uid() and event_key=event;
 if j.id is not null then
  if j.char_id<>p_char or j.slot<>p_slot then raise exception 'loot character changed';end if;
  raise exception 'worldboss already claimed; loot pending';end if;
 claim:=public.loot_wb_claim_legacy(p_wb)::jsonb;
 if coalesce((claim->>'killed')::boolean,false) then
  if (claim->>'rank')::int=1 then items:=items||'[{"id":"elixir","n":1}]'::jsonb;
  elsif (claim->>'rank')::int<=3 then items:=items||'[{"id":"bWeaponScroll","n":1}]'::jsonb;end if;
  if coalesce((claim->>'killer_me')::boolean,false) then items:=items||'[{"id":"bArmorScroll","n":1}]'::jsonb;end if;
 end if;
 insert into public.dragon_loot_state(user_id,char_id) values(auth.uid(),p_char) on conflict do nothing;
 update public.dragon_loot_state set issued=issued+1 where user_id=auth.uid() and char_id=p_char returning issued into s;
 insert into public.dragon_loot_jobs(user_id,slot,char_id,event_key,context,result,cursor) values(auth.uid(),p_slot,p_char,event,jsonb_build_object('claim',claim),items,s);
 return claim;
end $$;
revoke all on function public.loot_worldboss(int,text,bigint) from public,anon;
grant execute on function public.loot_worldboss(int,text,bigint) to authenticated;

-- 收據在存檔外層，不新增player欄位；拒絕已同步進度被舊裝置／舊版覆蓋。
create or replace function public.dragon_loot_save_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare ch text:=(new.data->'player'->>'created')||'|'||(new.data->'player'->>'cls');cur bigint:=coalesce((new.data->>'lootCursor')::bigint,0);s public.dragon_loot_state;
begin
 if not exists(select 1 from public.dragon_loot_config cfg where cfg.id=1 and enabled) then return new;end if;
 if coalesce((new.data->>'lootProtocol')::int,0)<>1 then raise exception 'loot client outdated';end if;
 select * into s from public.dragon_loot_state where user_id=new.user_id and char_id=ch for update;
 if s.user_id is not null then
  if cur<s.acknowledged or cur>s.issued then raise exception 'loot cursor conflict';end if;
  update public.dragon_loot_state set acknowledged=cur where user_id=new.user_id and char_id=ch;
 elsif cur<>0 then raise exception 'loot cursor conflict';end if;
 return new;
end $$;
drop trigger if exists dragon_loot_save_guard on public.dragon_saves;
create trigger dragon_loot_save_guard before insert or update on public.dragon_saves for each row execute function public.dragon_loot_save_guard();

-- 內部函式全部撤銷預設PUBLIC執行權，只有五個具帳號檢查的RPC及狀態查詢開放。
revoke all on function public.loot_pick(jsonb),public.loot_int(int,int),public.loot_quality(boolean,boolean),public.loot_item(jsonb,text,int,text,int),public.loot_map(jsonb,int),public.loot_roll(jsonb,jsonb),public.loot_player(int,text),public.dragon_loot_save_guard() from public,anon,authenticated;
revoke all on function public.loot_status(),public.loot_spawn(int,text,uuid,boolean,text),public.loot_finish(uuid),public.loot_raid(int,text,uuid,int),public.loot_pending(int,text) from public,anon,authenticated;
grant execute on function public.loot_status() to anon,authenticated;
grant execute on function public.loot_spawn(int,text,uuid,boolean,text),public.loot_finish(uuid),public.loot_raid(int,text,uuid,int),public.loot_pending(int,text) to authenticated;
commit;
