-- 黑暗大陸：鑽石拍賣。使用者2026-10-25同意新增，由使用者在Supabase SQL Editor執行。
-- 先安裝既有 market-v2.sql／vault-v2.sql／鑽石錢包；可重跑，不清除拍賣或錢包。
-- 3小時拍賣、2小時休息，每輪最多10件；首次開場為安裝後2小時。
begin;
create table if not exists public.dragon_auction_config (
 id int primary key check(id=1), first_open timestamptz not null default(now()+interval '2 hours'),
 min_rank int not null default 2 check(min_rank between 0 and 3), equipment_only boolean not null default true,
 min_il int not null default 0 check(min_il between 0 and 999), draw_mode text not null default 'round' check(draw_mode in('round','ticket')),
 allowed_ids text[] not null default array['bWeaponScroll','bArmorScroll','curOracle','curAwaken','spiderVenom','treantHeart','drakeFang','baphometHorn','pirateTreasure','demonHeart','wyvernWing','osirisSeal','frostCrystal','ifritFlame','forgottenRelic','giantSoul','antharasScale','fafurionScale','lindviorScale','valakasScale','towerBullHorn','towerBansheeTear','towerFlameCore','towerIceCrown','towerLichCrystal','towerFallenFeather','towerChaosCore','towerAbyssEye','towerDeathShard','towerKingSeal'],
 allowed_cats text[] not null default array['doll']
);
insert into public.dragon_auction_config(id) values(1) on conflict do nothing;
create table if not exists public.dragon_auction_rounds (
 id bigint primary key, starts_at timestamptz not null, ends_at timestamptz not null
);
create table if not exists public.dragon_auctions (
 id bigserial primary key, seller uuid not null references auth.users(id), seller_name text not null,
 item jsonb not null, n int not null check(n=1), name text not null, start_price int not null check(start_price between 5 and 1000000),
 ticket bigint not null unique, queued_at timestamptz not null default clock_timestamp(), eligible_at timestamptz not null default clock_timestamp(),
 state text not null default 'queued' check(state in('queued','active','sold','unsold','cancelled')),
 round_id bigint references public.dragon_auction_rounds(id), ends_at timestamptz,
 bidder uuid references auth.users(id), bid_amount int not null default 0 check(bid_amount between 0 and 1000000),
 seller_claimed boolean not null default false, buyer_claimed boolean not null default false,
 check((bidder is null and bid_amount=0) or (bidder is not null and bid_amount>=start_price))
);
create unique index if not exists dragon_auction_one on public.dragon_auctions(seller) where state in('queued','active');
create index if not exists dragon_auction_round on public.dragon_auctions(round_id,state);
create table if not exists public.dragon_auction_bids (
 id bigserial primary key, auction_id bigint not null references public.dragon_auctions(id),
 bidder uuid not null references auth.users(id), amount int not null, at timestamptz not null default clock_timestamp()
);
create index if not exists dragon_auction_bidder on public.dragon_auction_bids(bidder,auction_id);
alter table public.dragon_auction_config enable row level security;
alter table public.dragon_auction_rounds enable row level security;
alter table public.dragon_auctions enable row level security;
alter table public.dragon_auction_bids enable row level security;
revoke all on public.dragon_auction_config,public.dragon_auction_rounds,public.dragon_auctions,public.dragon_auction_bids from public,anon,authenticated;
revoke all on sequence public.dragon_auctions_id_seq,public.dragon_auction_bids_id_seq from public,anon,authenticated;

create or replace function public.dragon_auction_fee(price int, starting int) returns int
language sql immutable set search_path='' as $$select case when price=starting then 1 else greatest(1,ceil(price::numeric*0.05)::int) end$$;
revoke all on function public.dragon_auction_fee(int,int) from public,anon,authenticated;

-- 所有拍賣RPC先取同一把交易鎖，再鎖角色／錢包；10件低頻拍賣以串行保證無雙重得標。
create or replace function public.dragon_auction_tick() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.dragon_auction_config; t timestamptz:=clock_timestamp(); k bigint; s timestamptz; active boolean; ids bigint[];
begin
 if auth.uid() is null then raise exception 'not logged in'; end if;
 if public.dragon_is_banned() then raise exception 'banned'; end if;
 perform pg_advisory_xact_lock(7713199,1);
 select * into c from public.dragon_auction_config where id=1;
 update public.dragon_auctions set state=case when bid_amount>0 then 'sold' else 'unsold' end where state='active' and ends_at<=t;
 k:=floor(extract(epoch from (t-c.first_open))/18000)::bigint;
 s:=c.first_open+greatest(k,0)*interval '5 hours';
 active:=k>=0 and t<s+interval '3 hours';
 if active and not exists(select 1 from public.dragon_auction_rounds where id=k) then
  insert into public.dragon_auction_rounds values(k,s,s+interval '3 hours');
  select array_agg(id) into ids from(select a.id from public.dragon_auctions a
   where a.state='queued' and a.queued_at<=s and a.eligible_at<=s
   order by case when c.draw_mode='ticket' then a.ticket::double precision else random() end,a.id limit 10) q;
  update public.dragon_auctions set state='active',round_id=k,ends_at=s+interval '3 hours' where id=any(ids);
 end if;
 return jsonb_build_object('phase',case when active then 'active' else 'rest' end,'round',greatest(k,0),
  'starts_at',s,'ends_at',case when active then s+interval '3 hours' when k<0 then s else s+interval '5 hours' end,
  'min_rank',c.min_rank,'min_il',c.min_il,'equipment_only',c.equipment_only,'allowed_ids',c.allowed_ids,'allowed_cats',c.allowed_cats,'draw_mode',c.draw_mode,'server_now',t,'is_admin',public.dragon_is_admin());
end$$;
revoke all on function public.dragon_auction_tick() from public,anon,authenticated;

create or replace function public.dragon_auction_player(p_slot int,p_trade boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p jsonb;
begin
 p:=public.dragon_market_row(p_slot,p_trade);
 if p->'loc'->>'type'<>'town' or coalesce((p->>'hp')::numeric,1)<=0 then raise exception 'not in town'; end if;
 return p;
end$$;
revoke all on function public.dragon_auction_player(int,boolean) from public,anon,authenticated;

-- 只回傳公開商品與自身關係，不洩漏帳號UUID。所有結束時間以伺服器為準。
create or replace function public.auction_browse(p_mine boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare status jsonb; rows jsonb;
begin
 status:=public.dragon_auction_tick();
 select coalesce(jsonb_agg(q.r order by q.id desc),'[]') into rows from (
  select a.id,(to_jsonb(a)-'seller'-'bidder')||jsonb_build_object('is_seller',a.seller=auth.uid(),'is_bidder',a.bidder=auth.uid()) r
  from public.dragon_auctions a where case when coalesce(p_mine,false) then
   a.seller=auth.uid() or exists(select 1 from public.dragon_auction_bids b where b.auction_id=a.id and b.bidder=auth.uid())
   else a.state='active' end order by case when a.state in('queued','active') then 0
    when (a.seller=auth.uid() and not a.seller_claimed) or (a.bidder=auth.uid() and not a.buyer_claimed) then 1 else 2 end,a.id desc limit 100
 )q;
 return jsonb_build_object('rows',rows,'status',status,'diamonds',coalesce((select diamonds from public.dragon_wallet where user_id=auth.uid()),0),
  'registered',exists(select 1 from public.dragon_auctions where seller=auth.uid() and state in('queued','active')),
  'queue_count',(select count(*) from public.dragon_auctions where state='queued'));
end$$;
revoke all on function public.auction_browse(boolean) from public,anon;
grant execute on function public.auction_browse(boolean) to authenticated;

create or replace function public.auction_list(p_slot int,p_uid int,p_n int,p_start int,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare status jsonb; p jsonb; it jsonb; idx int; have int; w public.dragon_wallet; c public.dragon_auction_config; cat text; rank int; ident bigint; ticket_no bigint; eligible timestamptz;
begin
 status:=public.dragon_auction_tick();p:=public.dragon_auction_player(p_slot,true);
 if p_start is null or p_start<5 or p_start>1000000 then raise exception 'bad starting price'; end if;
 if p_n is distinct from 1 then raise exception 'bad amount'; end if;
 if exists(select 1 from public.dragon_auctions where seller=auth.uid() and state in('queued','active')) then raise exception 'already registered'; end if;
 select x,(o-1)::int into it,idx from jsonb_array_elements(coalesce(p->'inv','[]')) with ordinality e(x,o) where (x->>'uid')::int=p_uid limit 1;
 if it is null then raise exception 'item not in cloud save'; end if;
 cat:=public.dragon_item_cat(it->>'id');
 if cat is null or cat='quest' or coalesce((it->>'ench')::int,0)>15 then raise exception 'not tradeable'; end if;
 select * into c from public.dragon_auction_config where id=1;
 rank:=case it->>'q' when 'magic' then 1 when 'rare' then 2 when 'legend' then 3 else 0 end;
 if not (it->>'id'=any(c.allowed_ids) or cat=any(c.allowed_cats) or
  (rank>=c.min_rank and coalesce((it->>'il')::int,0)>=c.min_il and(not c.equipment_only or cat in('weapon','armor','accessory')))) then raise exception 'auction quality too low'; end if;
 have:=coalesce((it->>'n')::int,1);if have<1 then raise exception 'bad amount'; end if;
 w:=public.dragon_wallet_lock();if w.diamonds<1 then raise exception 'not enough diamonds'; end if;
 if have>1 then p:=jsonb_set(p,array['inv',idx::text,'n'],to_jsonb(have-1));else p:=jsonb_set(p,'{inv}',(p->'inv')-idx);end if;
 eligible:=clock_timestamp();
 -- 同一輪已入場（含取消）不能重新插入，只能登記下一輪。
 select greatest(eligible,coalesce(max(r.starts_at+interval '5 hours'),eligible)) into eligible
  from public.dragon_auctions a join public.dragon_auction_rounds r on r.id=a.round_id where a.seller=auth.uid();
 loop
  ticket_no:=floor(random()*999999999999)::bigint+1;
  exit when not exists(select 1 from public.dragon_auctions where ticket=ticket_no);
 end loop;
 insert into public.dragon_auctions(seller,seller_name,item,n,name,start_price,ticket,eligible_at)
 values(auth.uid(),left(p->>'name',40),it||jsonb_build_object('n',1),1,left(coalesce(p_name,it->>'id'),60),p_start,ticket_no,eligible) returning id into ident;
 update public.dragon_wallet set diamonds=diamonds-1,updated_at=clock_timestamp() where user_id=auth.uid();
 insert into public.dragon_dia_log(user_id,delta,reason)values(auth.uid(),-1,'拍賣刊登 #'||ident);
 return public.dragon_vault_commit(p_slot,p)||jsonb_build_object('id',ident,'n',1,'ticket',ticket_no,'diamonds',w.diamonds-1);
end$$;
revoke all on function public.auction_list(int,int,int,int,text) from public,anon;
grant execute on function public.auction_list(int,int,int,int,text) to authenticated;

create or replace function public.auction_bid(p_slot int,p_id bigint,p_amount int) returns jsonb
language plpgsql security definer set search_path='' as $$
declare status jsonb;p jsonb;a public.dragon_auctions;w public.dragon_wallet;cost int;balance int;
begin
 status:=public.dragon_auction_tick();p:=public.dragon_auction_player(p_slot,true);
 select * into a from public.dragon_auctions where id=p_id for update;
 if a.id is null or a.state<>'active' or a.ends_at<=clock_timestamp() then raise exception 'auction ended';end if;
 if a.seller=auth.uid() then raise exception 'own auction';end if;
 if p_amount is null or p_amount<>(case when a.bid_amount=0 then a.start_price else a.bid_amount+1 end) or p_amount>1000000 then raise exception 'bid too low';end if;
 w:=public.dragon_wallet_lock();cost:=p_amount-case when a.bidder=auth.uid() then a.bid_amount else 0 end;
 if w.diamonds<cost then raise exception 'not enough diamonds';end if;
 if a.bidder is not null and a.bidder<>auth.uid() then
  if(select diamonds::bigint+a.bid_amount from public.dragon_wallet where user_id=a.bidder)>2147483647 then raise exception 'wallet full';end if;
  update public.dragon_wallet set diamonds=diamonds+a.bid_amount,updated_at=clock_timestamp() where user_id=a.bidder;
  insert into public.dragon_dia_log(user_id,delta,reason)values(a.bidder,a.bid_amount,'拍賣超標退款 #'||a.id);
 end if;
 update public.dragon_wallet set diamonds=diamonds-cost,updated_at=clock_timestamp() where user_id=auth.uid() returning diamonds into balance;
 insert into public.dragon_dia_log(user_id,delta,reason)values(auth.uid(),-cost,'拍賣出價保留 #'||a.id);
 update public.dragon_auctions set bidder=auth.uid(),bid_amount=p_amount where id=a.id;
 insert into public.dragon_auction_bids(auction_id,bidder,amount)values(a.id,auth.uid(),p_amount);
 return public.dragon_vault_commit(p_slot,p)||jsonb_build_object('diamonds',balance,'amount',p_amount);
end$$;
revoke all on function public.auction_bid(int,bigint,int) from public,anon;
grant execute on function public.auction_bid(int,bigint,int) to authenticated;

create or replace function public.auction_cancel(p_slot int,p_id bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare status jsonb;p jsonb;a public.dragon_auctions;
begin
 status:=public.dragon_auction_tick();p:=public.dragon_auction_player(p_slot,false);
 select * into a from public.dragon_auctions where id=p_id and seller=auth.uid() for update;
 if a.id is null or a.state not in('queued','active') then raise exception 'not available';end if;
 if a.bid_amount>0 then raise exception 'auction has bids';end if;
 update public.dragon_auctions set state='cancelled',seller_claimed=true where id=a.id;
 p:=public.dragon_inv_add(p,a.item);
 return public.dragon_vault_commit(p_slot,p)||jsonb_build_object('item',a.item,'diamonds',coalesce((select diamonds from public.dragon_wallet where user_id=auth.uid()),0));
end$$;
revoke all on function public.auction_cancel(int,bigint) from public,anon;
grant execute on function public.auction_cancel(int,bigint) to authenticated;

create or replace function public.auction_claim(p_slot int,p_id bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare status jsonb;p jsonb;a public.dragon_auctions;result jsonb:='{}';net int;w public.dragon_wallet;
begin
 status:=public.dragon_auction_tick();p:=public.dragon_auction_player(p_slot,false);
 select * into a from public.dragon_auctions where id=p_id for update;
 if a.id is null or a.state not in('sold','unsold') then raise exception 'nothing to claim';end if;
 if a.seller=auth.uid() and not a.seller_claimed then
  if a.state='unsold' then p:=public.dragon_inv_add(p,a.item);result:=jsonb_build_object('item',a.item);
  else
   net:=a.bid_amount-public.dragon_auction_fee(a.bid_amount,a.start_price);w:=public.dragon_wallet_lock();
   if w.diamonds::bigint+net>2147483647 then raise exception 'wallet full';end if;
   update public.dragon_wallet set diamonds=diamonds+net,updated_at=clock_timestamp() where user_id=auth.uid();
   insert into public.dragon_dia_log(user_id,delta,reason)values(auth.uid(),net,'拍賣成交收入 #'||a.id);
   result:=jsonb_build_object('net',net);
  end if;
  update public.dragon_auctions set seller_claimed=true where id=a.id;
 elsif a.bidder=auth.uid() and a.state='sold' and not a.buyer_claimed then
  p:=public.dragon_inv_add(p,a.item);result:=jsonb_build_object('item',a.item);
  update public.dragon_auctions set buyer_claimed=true where id=a.id;
 else raise exception 'nothing to claim';end if;
 return public.dragon_vault_commit(p_slot,p)||result||jsonb_build_object('diamonds',coalesce((select diamonds from public.dragon_wallet where user_id=auth.uid()),0));
end$$;
revoke all on function public.auction_claim(int,bigint) from public,anon;
grant execute on function public.auction_claim(int,bigint) to authenticated;

-- 管理者設定最低品質0普通／1魔法／2稀有／3傳說、只限裝備、最低物品等級及抽籤模式。
create or replace function public.auction_configure(p_rank int,p_equipment boolean,p_il int,p_draw text,p_ids text[],p_cats text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.dragon_is_admin() then raise exception 'admin only';end if;
 perform pg_advisory_xact_lock(7713199,1);
 update public.dragon_auction_config set min_rank=p_rank,equipment_only=p_equipment,min_il=p_il,draw_mode=p_draw,allowed_ids=p_ids,allowed_cats=p_cats where id=1;
end$$;
revoke all on function public.auction_configure(int,boolean,int,text,text[],text[]) from public,anon;
grant execute on function public.auction_configure(int,boolean,int,text,text[],text[]) to authenticated;
commit;
