-- 屠龍勇者：共用倉庫、鑽石、離線掛機（2026-10-12）——只有新增的部分，貼到 Supabase SQL Editor 執行一次即可（可重複執行）

-- ═════════ 共用倉庫、鑽石、離線掛機（ARCHITECTURE.md 第 38 節）═════════
-- 共用倉庫：同帳號所有角色共用 200 格＋金幣，存、取各收 100 金幣手續費。存入時伺服器確認道具／金幣真的在該角色的雲端存檔裡；
--   取出走「記帳＋確認」兩段式（dragon_vault_out.got），網路中斷不會遺失；存入的裝備又出現在原角色存檔 → 可疑紀錄 vault_dupe。
-- 鑽石：帳號共用，存在伺服器（玩家改不了）。每日第一次登入 +5、打怪 0.1% 掉 1 顆（每天最多 10）、首領／龍 +3（每天最多 15）、管理者發放。
-- 離線掛機：只有「最後上傳存檔的那個角色」能結算；每小時 2 顆鑽石（30 分鐘 1 顆，不夠就按比例）；結算的時間不能超過上次結算到現在的真實時間。
create table if not exists public.dragon_wallet (
    user_id    uuid        primary key references auth.users (id) on delete cascade,
    diamonds   int         not null default 0 check (diamonds >= 0),
    daily_day  date,
    drop_day   date,
    drop_mob   int         not null default 0,
    drop_boss  int         not null default 0,
    off_at     timestamptz,                -- 上次離線結算（伺服器時間）
    updated_at timestamptz not null default now()
);
create table if not exists public.dragon_dia_log (
    id      bigserial   primary key,
    user_id uuid        not null references auth.users (id) on delete cascade,
    delta   int         not null,
    reason  text,
    at      timestamptz not null default now()
);
create index if not exists dragon_dia_log_idx on public.dragon_dia_log (user_id, id desc);
create table if not exists public.dragon_vault (
    user_id uuid   primary key references auth.users (id) on delete cascade,
    gold    bigint not null default 0 check (gold >= 0)
);
create table if not exists public.dragon_vault_items (
    id        bigserial   primary key,
    user_id   uuid        not null references auth.users (id) on delete cascade,
    from_slot smallint    not null,
    uid       int         not null,            -- 存入時在原角色的 uid（防複製用）
    item_id   text        not null,
    item      jsonb       not null check (pg_column_size(item) < 4000),
    name      text        check (char_length(name) <= 60),
    put_at    timestamptz not null default now(),
    taken_at  timestamptz                       -- 取出後留 30 天紀錄（防複製檢查）
);
create index if not exists dragon_vault_items_idx on public.dragon_vault_items (user_id, taken_at);
create table if not exists public.dragon_vault_out (   -- 取出待交貨
    id      bigserial   primary key,
    user_id uuid        not null references auth.users (id) on delete cascade,
    slot    smallint    not null,
    item    jsonb,
    gold    bigint      not null default 0,
    name    text,
    got     boolean     not null default false,
    at      timestamptz not null default now()
);
create index if not exists dragon_vault_out_idx on public.dragon_vault_out (user_id, got);
alter table public.dragon_wallet enable row level security;
alter table public.dragon_dia_log enable row level security;
alter table public.dragon_vault enable row level security;
alter table public.dragon_vault_items enable row level security;
alter table public.dragon_vault_out enable row level security;
revoke all on public.dragon_wallet, public.dragon_dia_log, public.dragon_vault, public.dragon_vault_items, public.dragon_vault_out from anon, authenticated;

-- 取得錢包（沒有就建立）並鎖住
create or replace function public.dragon_wallet_lock() returns public.dragon_wallet
language plpgsql security definer set search_path = '' as $$
declare w public.dragon_wallet;
begin
    insert into public.dragon_wallet (user_id) values (auth.uid()) on conflict do nothing;
    select * into w from public.dragon_wallet where user_id = auth.uid() for update;
    return w;
end $$;

-- 鑽石狀態＋每日登入獎勵
create or replace function public.dia_status() returns json
language plpgsql security definer set search_path = '' as $$
declare w public.dragon_wallet; today date := (now() at time zone 'Asia/Taipei')::date; daily int := 0;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    w := public.dragon_wallet_lock();
    if not public.dragon_is_banned() and (w.daily_day is null or w.daily_day < today) then
        daily := 5;
        update public.dragon_wallet set diamonds = diamonds + daily, daily_day = today, updated_at = now() where user_id = auth.uid() returning * into w;
        insert into public.dragon_dia_log (user_id, delta, reason) values (auth.uid(), daily, '每日登入');
    end if;
    return json_build_object('diamonds', w.diamonds, 'daily', daily);
end $$;

-- 打怪掉鑽石（遊戲端擲骰；伺服器限制每天上限）：p_src = 'mob'（+1，每天 10）／'boss'（+3，每天 15）
create or replace function public.dia_drop(p_src text) returns json
language plpgsql security definer set search_path = '' as $$
declare w public.dragon_wallet; today date := (now() at time zone 'Asia/Taipei')::date; n int := 0;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    w := public.dragon_wallet_lock();
    if w.drop_day is distinct from today then
        update public.dragon_wallet set drop_day = today, drop_mob = 0, drop_boss = 0 where user_id = auth.uid() returning * into w;
    end if;
    if p_src = 'mob' and w.drop_mob < 10 then n := 1; update public.dragon_wallet set drop_mob = drop_mob + 1 where user_id = auth.uid();
    elsif p_src = 'boss' and w.drop_boss < 15 then n := least(3, 15 - w.drop_boss); update public.dragon_wallet set drop_boss = drop_boss + n where user_id = auth.uid();
    end if;
    if n > 0 then
        update public.dragon_wallet set diamonds = diamonds + n, updated_at = now() where user_id = auth.uid() returning * into w;
        insert into public.dragon_dia_log (user_id, delta, reason) values (auth.uid(), n, case when p_src = 'boss' then '首領掉落' else '打怪掉落' end);
    end if;
    return json_build_object('diamonds', w.diamonds, 'got', n);
end $$;

-- 管理者發放／扣除鑽石
create or replace function public.dia_grant(p_user uuid, p_n int, p_reason text) returns int
language plpgsql security definer set search_path = '' as $$
declare v int;
begin
    if not public.dragon_is_admin() then raise exception 'not admin'; end if;
    insert into public.dragon_wallet (user_id) values (p_user) on conflict do nothing;
    update public.dragon_wallet set diamonds = greatest(0, diamonds + p_n), updated_at = now() where user_id = p_user returning diamonds into v;
    insert into public.dragon_dia_log (user_id, delta, reason) values (p_user, p_n, left('管理者：' || coalesce(p_reason, ''), 100));
    return v;
end $$;
create or replace function public.dia_admin_list() returns table (user_id uuid, diamonds int)
language sql stable security definer set search_path = '' as $$
    select w.user_id, w.diamonds from public.dragon_wallet w where public.dragon_is_admin();
$$;

-- 離線掛機結算：只有最後上傳存檔的角色；每 30 分鐘 1 顆鑽石；時間不超過上次結算到現在
create or replace function public.offline_claim(p_slot int, p_away_ms bigint) returns json
language plpgsql security definer set search_path = '' as $$
declare w public.dragon_wallet; last_slot int; ms bigint; cost int;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    select slot into last_slot from public.dragon_saves where user_id = auth.uid() order by updated_at desc limit 1;
    if last_slot is null then return json_build_object('ok', false, 'reason', 'no_save'); end if;
    if last_slot <> p_slot then return json_build_object('ok', false, 'reason', 'not_last'); end if;
    w := public.dragon_wallet_lock();
    ms := least(greatest(coalesce(p_away_ms, 0), 0), 12 * 3600000);
    if w.off_at is not null then ms := least(ms, (extract(epoch from now() - w.off_at) * 1000)::bigint); end if;
    ms := least(ms, w.diamonds::bigint * 1800000);
    if ms < 30000 then
        return json_build_object('ok', false, 'reason', case when w.diamonds = 0 then 'no_diamond' else 'too_short' end, 'diamonds', w.diamonds);
    end if;
    cost := ceil(ms / 1800000.0)::int;
    update public.dragon_wallet set diamonds = diamonds - cost, off_at = now(), updated_at = now() where user_id = auth.uid() returning * into w;
    insert into public.dragon_dia_log (user_id, delta, reason) values (auth.uid(), -cost, format('離線掛機 %s 分鐘（欄位 %s）', ms / 60000, p_slot + 1));
    return json_build_object('ok', true, 'ms', ms, 'cost', cost, 'diamonds', w.diamonds);
end $$;

-- 共用倉庫內容
create or replace function public.vault_get() returns json
language sql stable security definer set search_path = '' as $$
    select json_build_object(
        'gold', coalesce((select gold from public.dragon_vault where user_id = auth.uid()), 0),
        'items', coalesce((select json_agg(json_build_object('id', id, 'item', item, 'name', name) order by id) from public.dragon_vault_items where user_id = auth.uid() and taken_at is null), '[]'::json),
        'diamonds', coalesce((select diamonds from public.dragon_wallet where user_id = auth.uid()), 0))
    where auth.uid() is not null;
$$;

-- 存入：道具（p_item）或金幣（p_gold），伺服器確認該角色雲端存檔有這件道具、金幣夠（含 100 手續費）
create or replace function public.vault_put(p_slot int, p_item jsonb, p_gold bigint, p_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare sv jsonb; g numeric; it jsonb; v_uid int := (p_item ->> 'uid')::int; v_id text := p_item ->> 'id'; v_n int := greatest(coalesce((p_item ->> 'n')::int, 1), 1); r bigint;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    perform pg_advisory_xact_lock(7713100, hashtext(auth.uid()::text));
    select data -> 'player' into sv from public.dragon_saves where user_id = auth.uid() and slot = p_slot;
    if sv is null then raise exception 'no cloud save'; end if;
    g := coalesce((sv ->> 'gold')::numeric, 0);
    if p_item is null then
        if p_gold is null or p_gold < 1 or p_gold > 2000000000 then raise exception 'bad amount'; end if;
        if g < p_gold + 100 then raise exception 'not enough gold'; end if;
        insert into public.dragon_vault (user_id, gold) values (auth.uid(), p_gold) on conflict (user_id) do update set gold = public.dragon_vault.gold + p_gold;
        return json_build_object('ok', true);
    end if;
    if g < 100 then raise exception 'not enough gold'; end if;
    if v_id is null or v_uid is null or coalesce((p_item ->> 'ench')::int, 0) > 15 then raise exception 'not tradeable'; end if;
    if (select count(*) from public.dragon_vault_items where user_id = auth.uid() and taken_at is null) >= 200 then raise exception 'vault full'; end if;
    if exists (select 1 from public.dragon_vault_items where user_id = auth.uid() and from_slot = p_slot and uid = v_uid and put_at > now() - interval '30 days' and (taken_at is null or p_item ? 'ench')) then raise exception 'already stored'; end if;
    select x into it from jsonb_array_elements(coalesce(sv -> 'inv', '[]'::jsonb)) x where (x ->> 'uid')::int = v_uid and x ->> 'id' = v_id limit 1;
    if it is null or coalesce((it ->> 'n')::int, 1) < v_n then raise exception 'item not in cloud save'; end if;
    delete from public.dragon_vault_items where user_id = auth.uid() and taken_at < now() - interval '30 days';
    insert into public.dragon_vault_items (user_id, from_slot, uid, item_id, item, name) values (auth.uid(), p_slot, v_uid, v_id, p_item, left(p_name, 60)) returning id into r;
    return json_build_object('ok', true, 'id', r);
end $$;

-- 取出：道具（p_id）或金幣（p_gold）到 p_slot 角色；角色雲端存檔要有 100 金幣手續費。記帳後由遊戲交貨（vault_pending／vault_ack）
create or replace function public.vault_take(p_slot int, p_id bigint, p_gold bigint) returns json
language plpgsql security definer set search_path = '' as $$
declare g numeric; vi public.dragon_vault_items; vg bigint; r bigint;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    perform pg_advisory_xact_lock(7713100, hashtext(auth.uid()::text));
    select (data -> 'player' ->> 'gold')::numeric into g from public.dragon_saves where user_id = auth.uid() and slot = p_slot;
    if g is null then raise exception 'no cloud save'; end if;
    if g < 100 then raise exception 'not enough gold'; end if;
    if p_id is null then
        select gold into vg from public.dragon_vault where user_id = auth.uid() for update;
        if p_gold is null or p_gold < 1 or coalesce(vg, 0) < p_gold then raise exception 'bad amount'; end if;
        update public.dragon_vault set gold = gold - p_gold where user_id = auth.uid();
        insert into public.dragon_vault_out (user_id, slot, gold, name) values (auth.uid(), p_slot, p_gold, '金幣') returning id into r;
    else
        select * into vi from public.dragon_vault_items where id = p_id and user_id = auth.uid() and taken_at is null for update;
        if vi.id is null then raise exception 'not available'; end if;
        update public.dragon_vault_items set taken_at = now() where id = p_id;
        insert into public.dragon_vault_out (user_id, slot, item, name) values (auth.uid(), p_slot, vi.item, vi.name) returning id into r;
    end if;
    return json_build_object('id', r);
end $$;

create or replace function public.vault_pending(p_slot int) returns json
language sql stable security definer set search_path = '' as $$
    select coalesce(json_agg(json_build_object('id', id, 'item', item, 'gold', gold, 'name', name) order by id), '[]'::json)
    from public.dragon_vault_out where user_id = auth.uid() and slot = p_slot and not got;
$$;
create or replace function public.vault_ack(p_ids bigint[]) returns void
language sql security definer set search_path = '' as $$
    update public.dragon_vault_out set got = true where user_id = auth.uid() and id = any(coalesce(p_ids, '{}'));
    delete from public.dragon_vault_out where user_id = auth.uid() and got and at < now() - interval '30 days';
$$;

-- 防複製：存進共用倉庫（30 天內、超過 1 分鐘）的裝備又出現在原角色存檔的背包、倉庫或身上
create or replace function public.dragon_vault_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m record; v_email text := auth.jwt() ->> 'email'; allv jsonb;
begin
    allv := coalesce(new.data -> 'player' -> 'inv', '[]'::jsonb) || coalesce(new.data -> 'player' -> 'storage', '[]'::jsonb);
    for m in select vi.id, vi.uid, vi.item_id, vi.name from public.dragon_vault_items vi
        where vi.user_id = new.user_id and vi.from_slot = new.slot and vi.put_at < now() - interval '1 minute' and vi.put_at > now() - interval '30 days' and vi.item ? 'ench'
    loop
        if (exists (select 1 from jsonb_array_elements(allv) x where (x ->> 'uid')::int = m.uid and x ->> 'id' = m.item_id)
            or exists (select 1 from jsonb_each(coalesce(new.data -> 'player' -> 'equip', '{}'::jsonb)) e where jsonb_typeof(e.value) = 'object' and (e.value ->> 'uid')::int = m.uid and e.value ->> 'id' = m.item_id))
           and not exists (select 1 from public.dragon_flags f where f.user_id = new.user_id and f.kind = 'vault_dupe' and f.detail like '%#' || m.id || '%') then
            insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail)
                values (new.user_id, v_email, new.slot, new.name, new.lv, 'vault_dupe', format('共用倉庫 #%s「%s」存入後仍留在角色身上，可能複製道具', m.id, m.name));
        end if;
    end loop;
    return null;
exception when others then return null;
end $$;
drop trigger if exists dragon_vault_audit on public.dragon_saves;
create trigger dragon_vault_audit after insert or update on public.dragon_saves for each row execute function public.dragon_vault_audit();

revoke execute on function public.dragon_wallet_lock(), public.dia_status(), public.dia_drop(text), public.dia_grant(uuid, int, text), public.dia_admin_list(),
    public.offline_claim(int, bigint), public.vault_get(), public.vault_put(int, jsonb, bigint, text), public.vault_take(int, bigint, bigint),
    public.vault_pending(int), public.vault_ack(bigint[]) from public, anon;
grant execute on function public.dia_status(), public.dia_drop(text), public.dia_grant(uuid, int, text), public.dia_admin_list(),
    public.offline_claim(int, bigint), public.vault_get(), public.vault_put(int, jsonb, bigint, text), public.vault_take(int, bigint, bigint),
    public.vault_pending(int), public.vault_ack(bigint[]) to authenticated;
