-- 黑暗大陸：後端掉寶減量（2026-10-23，ARCHITECTURE.md 第 104 節）。接在 server-loot-install.sql 之後執行；可重複執行。
-- 起因：免費 NANO 專案 Disk IO 用完、反覆卡死。每隻怪要 4 次 RPC、3 次以上寫入，且 loot_release 每次生怪都把所有作廢憑證重寫一遍（越玩越重），帳本永不刪除。
-- 做法（使用者 2026-10-23 同意：10 隻或 30 秒結算一次、已確認收據保留 3 天、不用 pg_cron）：
--   ① loot_release 只改還沒作廢的憑證（遊戲端也改成只在開始掛機／換地圖／遭遇太多時才釋放）。
--   ② loot_finish_batch(批次編號, 憑證[])：一次結算最多 50 隻，寫 1 張收據（dragon_loot_receipts）、序號 +1，用掉的憑證直接刪除；同一批次重送回傳同一張收據。
--   ③ 清理：每次批次結算順手清自己帳號最多 200 筆：已確認超過 3 天的收據／舊帳本、作廢超過 1 小時與超過 12 小時沒結算的憑證。
--   ④ loot_pending 同時讀舊帳本（單隻結算、團隊副本、世界首領）與新收據。loot_spawn 的「同時遭遇」上限 8 → 64（還沒結算的擊殺也算在內）。
-- 部署順序：先執行這份，再發佈新版遊戲（20261023k 以後）。舊版遊戲的單隻結算照常可用。
-- ⚠️ 之後若重跑 server-loot-install.sql，會把 loot_release／loot_spawn／loot_pending 蓋回舊版，要再執行一次這份。

create table if not exists public.dragon_loot_receipts(
 user_id uuid not null,char_id text not null,slot int not null check(slot between 0 and 7),cursor bigint not null,
 batch_id uuid not null,items jsonb not null,diamonds jsonb,created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,char_id,cursor),unique(user_id,batch_id));
alter table public.dragon_loot_receipts enable row level security;
revoke all on public.dragon_loot_receipts from public,anon,authenticated;

create or replace function public.loot_release(p_slot int,p_char text,p_keep uuid[]) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform public.loot_player(p_slot,p_char);
 if coalesce(array_length(p_keep,1),0)>128 then raise exception 'loot invalid keep list';end if;
 update public.dragon_loot_jobs set context=context||'{"cancelled":true}'::jsonb where user_id=auth.uid() and slot=p_slot and char_id=p_char and result is null and not(context ? 'cancelled') and not(id=any(coalesce(p_keep,'{}'::uuid[])));
 return true;
end $$;

create or replace function public.loot_spawn(p_slot int,p_char text,p_key uuid,p_join boolean default false,p_mid text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;c jsonb;z jsonb;mr jsonb;g jsonb;m jsonb;pool jsonb;id text;f int;n int:=1;r int;ticket uuid;out jsonb:='[]';event text:=p_key::text;existing jsonb;is_map boolean;elite boolean;
begin
 p:=public.loot_player(p_slot,p_char);perform pg_advisory_xact_lock(7713201,hashtext(auth.uid()::text));
 select jsonb_agg(jsonb_build_object('ticket',j.id,'monster',j.context->'monster')) into existing from public.dragon_loot_jobs j where j.user_id=auth.uid() and j.event_key like event||':%';
 if exists(select 1 from public.dragon_loot_jobs where user_id=auth.uid() and event_key like event||':%' and (slot<>p_slot or char_id<>p_char)) then raise exception 'loot character changed';end if;
 if existing is not null then return existing;end if;
 if (select count(*) from public.dragon_loot_jobs where user_id=auth.uid() and result is null and not(context ? 'cancelled') and created_at>clock_timestamp()-interval '10 minutes')>=64 then raise exception 'loot encounters full';end if;
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

create or replace function public.loot_pending(p_slot int,p_char text) returns jsonb language plpgsql security definer set search_path='' as $$
declare out jsonb;begin
 perform public.loot_player(p_slot,p_char);
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'cursor',j.cursor,'items',j.result,'diamonds',j.diamonds,'char',j.char_id,'slot',j.slot) order by j.cursor),'[]') into out from (
  select j.id,j.cursor,j.result,j.context->'diamonds' diamonds,j.char_id,j.slot from public.dragon_loot_jobs j where j.user_id=auth.uid() and j.slot=p_slot and j.char_id=p_char and j.result is not null
  union all select r.batch_id,r.cursor,r.items,r.diamonds,r.char_id,r.slot from public.dragon_loot_receipts r where r.user_id=auth.uid() and r.slot=p_slot and r.char_id=p_char
 ) j left join public.dragon_loot_state s on s.user_id=auth.uid() and s.char_id=j.char_id where j.cursor>coalesce(s.acknowledged,0);
 return out;
end $$;

create or replace function public.loot_finish_batch(p_batch uuid,p_tickets uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare rc public.dragon_loot_receipts;j public.dragon_loot_jobs;c jsonb;items jsonb:='[]';dia jsonb;d jsonb;got int:=0;ch text;sl int;s bigint;used uuid[]:='{}';boss boolean;
begin
 if auth.uid() is null or public.dragon_is_banned() then raise exception 'not allowed';end if;
 if p_batch is null or coalesce(array_length(p_tickets,1),0) not between 1 and 50 then raise exception 'loot invalid batch';end if;
 perform pg_advisory_xact_lock(7713201,hashtext(auth.uid()::text));
 select * into rc from public.dragon_loot_receipts where user_id=auth.uid() and batch_id=p_batch;
 if rc.user_id is not null then   -- 回應遺失後重送：回同一張收據
  return jsonb_build_object('id',rc.batch_id,'cursor',rc.cursor,'items',rc.items,'diamonds',rc.diamonds,'char',rc.char_id,'slot',rc.slot);
 end if;
 for j in select * from public.dragon_loot_jobs x where x.user_id=auth.uid() and x.id=any(p_tickets) order by x.created_at for update loop
  if ch is null then ch:=j.char_id;sl:=j.slot;perform public.loot_player(sl,ch);
  elsif j.char_id<>ch or j.slot<>sl then raise exception 'loot batch mixed';end if;
  -- 已用舊流程結算（有帳本）、作廢、過期的略過；太快的整批重試
  if j.result is not null or j.context ? 'cancelled' or clock_timestamp()>j.created_at+interval '12 hours' then continue;end if;
  if clock_timestamp()<j.created_at+interval '150 milliseconds' then raise exception 'loot too soon';end if;
  select data into c from public.dragon_loot_rules where version=j.context->>'rules';if c is null then raise exception 'loot rules missing';end if;
  items:=items||public.loot_roll(c,j.context);
  boss:=coalesce((j.context->'monster'->>'boss')::boolean,false);
  if boss or random()<0.001 then
   d:=public.loot_dia_drop_legacy(case when boss then 'boss' else 'mob' end)::jsonb;
   got:=got+coalesce((d->>'got')::int,0);dia:=d||jsonb_build_object('got',got);
  end if;
  used:=used||j.id;
 end loop;
 if ch is null or coalesce(array_length(used,1),0)=0 then
  delete from public.dragon_loot_jobs x where x.user_id=auth.uid() and x.id=any(p_tickets) and x.result is null;   -- 全是作廢／過期：清掉
  return jsonb_build_object('empty',true);
 end if;
 insert into public.dragon_loot_state(user_id,char_id) values(auth.uid(),ch) on conflict do nothing;
 update public.dragon_loot_state st set issued=st.issued+1 where st.user_id=auth.uid() and st.char_id=ch returning st.issued into s;
 insert into public.dragon_loot_receipts(user_id,char_id,slot,cursor,batch_id,items,diamonds) values(auth.uid(),ch,sl,s,p_batch,items,dia);
 delete from public.dragon_loot_jobs x where x.user_id=auth.uid() and x.id=any(p_tickets) and x.result is null;
 -- 順手清自己帳號的舊資料（每次最多 200 筆）
 delete from public.dragon_loot_receipts r where r.ctid in (select x.ctid from public.dragon_loot_receipts x join public.dragon_loot_state st on st.user_id=x.user_id and st.char_id=x.char_id
  where x.user_id=auth.uid() and x.cursor<=st.acknowledged and x.created_at<now()-interval '3 days' limit 200);
 delete from public.dragon_loot_jobs jj where jj.ctid in (select x.ctid from public.dragon_loot_jobs x left join public.dragon_loot_state st on st.user_id=x.user_id and st.char_id=x.char_id
  where x.user_id=auth.uid() and (
   (x.result is null and x.context ? 'cancelled' and x.created_at<now()-interval '1 hour')
   or (x.result is null and x.created_at<now()-interval '12 hours')
   or (x.result is not null and x.cursor<=coalesce(st.acknowledged,0) and x.created_at<now()-interval '3 days')) limit 200);
 return jsonb_build_object('id',p_batch,'cursor',s,'items',items,'diamonds',dia,'char',ch,'slot',sl);
end $$;
revoke all on function public.loot_finish_batch(uuid,uuid[]) from public,anon;
grant execute on function public.loot_finish_batch(uuid,uuid[]) to authenticated;
