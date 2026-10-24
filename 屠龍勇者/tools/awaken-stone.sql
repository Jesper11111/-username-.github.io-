-- 黑暗大陸：命運的覺醒石只在 Lv.70 以上的怪物掉落（2026-10-24，20261024m）。
-- 只更新 loot_roll（通貨依 catalog.currency 的 minLv 過濾）；先執行本檔，再執行 loot-catalog.sql。內容同 server-loot.sql 的 loot_roll。
begin;
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
revoke all on function public.loot_roll(jsonb,jsonb) from public,anon,authenticated;
commit;
