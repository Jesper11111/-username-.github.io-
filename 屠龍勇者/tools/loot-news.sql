-- 屠龍勇者：全服掉寶公告（ARCHITECTURE.md 第 139 節）。接在 server-loot.sql／loot-batch.sql 之後執行，可重複執行。
-- 後端掉寶結算（loot_finish_batch 寫收據、loot_finish／loot_raid 寫 result）時，由 trigger 把「傳說品質」或「共鳴裝備」記進 dragon_loot_news；
-- 玩家不能直接寫入（防假公告），所有登入者可讀。公告寫入失敗不會影響掉寶本身（例外直接吞掉）。保留 3 天。
create table if not exists public.dragon_loot_news(
 id bigserial primary key,at timestamptz not null default now(),user_id uuid not null,
 name text not null,cls text,lv int,item text not null,q text);
create index if not exists dragon_loot_news_at on public.dragon_loot_news(at);
alter table public.dragon_loot_news enable row level security;
revoke all on public.dragon_loot_news from public,anon,authenticated;
grant select(id,at,name,cls,lv,item,q) on public.dragon_loot_news to authenticated;
drop policy if exists dragon_loot_news_read on public.dragon_loot_news;
create policy dragon_loot_news_read on public.dragon_loot_news for select to authenticated using (true);

-- 共鳴裝備 id 清單（從掉寶目錄 resonance 取出；目錄更新時自動重建，避免每次結算都讀整份目錄）
create table if not exists public.dragon_loot_news_items(id text primary key);
alter table public.dragon_loot_news_items enable row level security;
revoke all on public.dragon_loot_news_items from public,anon,authenticated;
create or replace function public.dragon_loot_news_items_sync() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.dragon_loot_news_items;
 insert into public.dragon_loot_news_items(id) select jsonb_object_keys(coalesce(c.data->'resonance','{}')) from public.dragon_loot_catalog c where c.id=1 on conflict do nothing;
 return null;
end $$;
drop trigger if exists dragon_loot_news_items_sync on public.dragon_loot_catalog;
create trigger dragon_loot_news_items_sync after insert or update on public.dragon_loot_catalog for each statement execute function public.dragon_loot_news_items_sync();
delete from public.dragon_loot_news_items;
insert into public.dragon_loot_news_items(id) select jsonb_object_keys(coalesce(c.data->'resonance','{}')) from public.dragon_loot_catalog c where c.id=1 on conflict do nothing;

-- 一次結算最多公告 3 件；角色名稱／職業／等級取自 dragon_saves 那一格
create or replace function public.dragon_loot_news_add(p_uid uuid,p_slot int,p_items jsonb) returns void language plpgsql security definer set search_path='' as $$
declare x jsonb;k int:=0;nm text;cl text;l int;found_save boolean:=false;
begin
 if p_items is null or jsonb_typeof(p_items)<>'array' then return;end if;
 for x in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(x)='object' and (x->>'q'='legend' or exists(select 1 from public.dragon_loot_news_items i where i.id=x->>'id')) then
   if not found_save then
    select s.name,s.cls,s.lv into nm,cl,l from public.dragon_saves s where s.user_id=p_uid and s.slot=p_slot;
    found_save:=true;
   end if;
   insert into public.dragon_loot_news(user_id,name,cls,lv,item,q)
    values(p_uid,left(coalesce(nullif(nm,''),'冒險者'),40),left(cl,20),l,left(x->>'id',60),left(x->>'q',10));
   k:=k+1;exit when k>=3;
  end if;
 end loop;
 if k>0 and random()<0.05 then delete from public.dragon_loot_news where at<now()-interval '3 days';end if;
exception when others then null;   -- 公告失敗不影響掉寶
end $$;
revoke all on function public.dragon_loot_news_add(uuid,int,jsonb) from public,anon,authenticated;

create or replace function public.dragon_loot_news_receipt() returns trigger language plpgsql security definer set search_path='' as $$
begin perform public.dragon_loot_news_add(new.user_id,new.slot,new.items);return null;end $$;
create or replace function public.dragon_loot_news_job() returns trigger language plpgsql security definer set search_path='' as $$
begin if old.result is null and new.result is not null then perform public.dragon_loot_news_add(new.user_id,new.slot,new.result);end if;return null;end $$;
revoke all on function public.dragon_loot_news_receipt(),public.dragon_loot_news_job(),public.dragon_loot_news_items_sync() from public,anon,authenticated;

do $$ begin
 if to_regclass('public.dragon_loot_receipts') is not null then
  drop trigger if exists dragon_loot_news_receipt on public.dragon_loot_receipts;
  create trigger dragon_loot_news_receipt after insert on public.dragon_loot_receipts for each row execute function public.dragon_loot_news_receipt();
 end if;
 drop trigger if exists dragon_loot_news_job on public.dragon_loot_jobs;
 create trigger dragon_loot_news_job after update of result on public.dragon_loot_jobs for each row execute function public.dragon_loot_news_job();
end $$;
