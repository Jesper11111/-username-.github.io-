-- 屠龍勇者：雲端存檔資料表（ARCHITECTURE.md 第 29 節）
-- 用法：Supabase 主控台 → SQL Editor → New query → 整份貼上 → Run。重複執行也沒關係。
-- 安全性靠下面的 RLS 規則：每個登入的玩家只能讀寫「自己的」存檔，其他人（包括沒登入的人）完全看不到。

create table if not exists public.dragon_saves (
    user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
    slot       smallint    not null check (slot >= 0 and slot < 8),          -- 角色欄位 0～7（config.js MAX_SLOTS）
    client_t   bigint      not null,                                         -- 存檔裡的時間 t（玩家裝置時間，用來判斷哪邊比較新）
    name       text        check (char_length(name) <= 40),                  -- 角色名、職業、等級：方便在主控台查看
    cls        text        check (char_length(cls) <= 20),
    lv         int,
    data       jsonb       not null check (pg_column_size(data) < 2000000),  -- 整份存檔 { schema, t, player }
    updated_at timestamptz not null default now(),                           -- 伺服器時間（玩家改不了）
    primary key (user_id, slot)
);

alter table public.dragon_saves enable row level security;

drop policy if exists "dragon_saves_select_own" on public.dragon_saves;
drop policy if exists "dragon_saves_insert_own" on public.dragon_saves;
drop policy if exists "dragon_saves_update_own" on public.dragon_saves;
drop policy if exists "dragon_saves_delete_own" on public.dragon_saves;
create policy "dragon_saves_select_own" on public.dragon_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy "dragon_saves_insert_own" on public.dragon_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dragon_saves_update_own" on public.dragon_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dragon_saves_delete_own" on public.dragon_saves for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.dragon_saves from anon;
grant select, insert, update, delete on public.dragon_saves to authenticated;

-- 每次更新自動寫入伺服器時間
create or replace function public.dragon_saves_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.updated_at := now();
    return new;
end $$;

drop trigger if exists dragon_saves_touch on public.dragon_saves;
create trigger dragon_saves_touch before update on public.dragon_saves
    for each row execute function public.dragon_saves_touch();

-- ═════════ 團隊副本（ARCHITECTURE.md 第 30 節）═════════
-- raid_rooms：隊伍（隊長建立，6 碼房號）；raid_members：隊員（每人一列，按「準備」時上傳角色快照 snap）
create extension if not exists pgcrypto;

create table if not exists public.raid_rooms (
    id           uuid        primary key default gen_random_uuid(),
    code         text        not null unique check (code ~ '^[A-Z0-9]{6}$'),
    raid         text        not null check (char_length(raid) <= 20),
    leader       uuid        not null default auth.uid() references auth.users (id) on delete cascade,
    leader_name  text        check (char_length(leader_name) <= 40),
    status       text        not null default 'open' check (status in ('open', 'fighting', 'done', 'closed')),
    round        int         not null default 1,                                     -- 第幾場（隊員的 ready_round 要等於它才算準備好）
    version      text        not null check (char_length(version) <= 20),            -- 遊戲版本，不同版本不能同隊
    is_public    boolean     not null default true,
    member_count int         not null default 0,                                     -- 由 trigger 維護
    result       jsonb       check (result is null or pg_column_size(result) < 1500000),  -- 隊長模擬的戰鬥結果（重播用）
    started_at   timestamptz,                                                         -- 開戰時間（伺服器時間，trigger 寫入）
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);
create index if not exists raid_rooms_open_idx on public.raid_rooms (status, created_at desc);

create table if not exists public.raid_members (
    room_id     uuid        not null references public.raid_rooms (id) on delete cascade,
    user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
    name        text        check (char_length(name) <= 40),
    cls         text        check (char_length(cls) <= 20),
    lv          int,
    char_id     text        check (char_length(char_id) <= 60),                      -- 用哪個角色參加（獎勵發給它）
    ready_round int         not null default 0,
    snap        jsonb       check (snap is null or pg_column_size(snap) < 1000000),   -- 準備時的角色快照
    joined_at   timestamptz not null default now(),
    primary key (room_id, user_id)
);

-- 是不是這個隊伍的成員（policy 不能直接查自己這張表，會無限遞迴，所以用 security definer 函式）
create or replace function public.raid_is_member(r uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.raid_members m where m.room_id = r and m.user_id = auth.uid());
$$;

-- 加入隊伍：隊伍必須還在招募中、未滿 8 人（鎖住隊伍那列，避免同時加入超過上限）
create or replace function public.raid_members_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare st text; cnt int;
begin
    select status into st from public.raid_rooms where id = new.room_id for update;
    if st is null or st <> 'open' then raise exception 'room closed'; end if;
    select count(*) into cnt from public.raid_members where room_id = new.room_id and user_id <> new.user_id;
    if cnt >= 8 then raise exception 'room full'; end if;
    new.joined_at := now();
    return new;
end $$;

create or replace function public.raid_members_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.room_id := old.room_id;
    new.user_id := old.user_id;
    new.joined_at := old.joined_at;
    return new;
end $$;

-- 人數變動時更新 member_count
create or replace function public.raid_members_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r uuid := coalesce(new.room_id, old.room_id);
begin
    update public.raid_rooms set member_count = (select count(*) from public.raid_members where room_id = r) where id = r;
    return null;
end $$;

-- 建立隊伍時順便清掉 2 天前的舊隊伍（連同隊員與戰鬥結果），資料庫不會越長越大
create or replace function public.raid_rooms_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    delete from public.raid_rooms where created_at < now() - interval '2 days';
    new.created_at := now();
    new.updated_at := now();
    new.member_count := 0;
    new.started_at := null;
    return new;
end $$;

-- 隊伍更新：隊長、房號、建立時間不能改；切到 fighting 時記下伺服器時間
create or replace function public.raid_rooms_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.id := old.id;
    new.leader := old.leader;
    new.code := old.code;
    new.created_at := old.created_at;
    if new.member_count is distinct from old.member_count and current_user in ('authenticated', 'anon') then
        new.member_count := old.member_count;
    end if;
    if new.status = 'fighting' and old.status is distinct from 'fighting' then new.started_at := now(); end if;
    new.updated_at := now();
    return new;
end $$;

drop trigger if exists raid_members_before_insert on public.raid_members;
create trigger raid_members_before_insert before insert on public.raid_members for each row execute function public.raid_members_before_insert();
drop trigger if exists raid_members_before_update on public.raid_members;
create trigger raid_members_before_update before update on public.raid_members for each row execute function public.raid_members_before_update();
drop trigger if exists raid_members_count on public.raid_members;
create trigger raid_members_count after insert or delete on public.raid_members for each row execute function public.raid_members_count();
drop trigger if exists raid_rooms_before_insert on public.raid_rooms;
create trigger raid_rooms_before_insert before insert on public.raid_rooms for each row execute function public.raid_rooms_before_insert();
drop trigger if exists raid_rooms_before_update on public.raid_rooms;
create trigger raid_rooms_before_update before update on public.raid_rooms for each row execute function public.raid_rooms_before_update();

alter table public.raid_rooms enable row level security;
alter table public.raid_members enable row level security;

drop policy if exists "raid_rooms_select" on public.raid_rooms;
drop policy if exists "raid_rooms_insert" on public.raid_rooms;
drop policy if exists "raid_rooms_update" on public.raid_rooms;
drop policy if exists "raid_rooms_delete" on public.raid_rooms;
create policy "raid_rooms_select" on public.raid_rooms for select to authenticated using (true);   -- 列表、用房號找隊伍
create policy "raid_rooms_insert" on public.raid_rooms for insert to authenticated with check ((select auth.uid()) = leader);
create policy "raid_rooms_update" on public.raid_rooms for update to authenticated using ((select auth.uid()) = leader) with check ((select auth.uid()) = leader);
create policy "raid_rooms_delete" on public.raid_rooms for delete to authenticated using ((select auth.uid()) = leader);

drop policy if exists "raid_members_select" on public.raid_members;
drop policy if exists "raid_members_insert" on public.raid_members;
drop policy if exists "raid_members_update" on public.raid_members;
drop policy if exists "raid_members_delete" on public.raid_members;
create policy "raid_members_select" on public.raid_members for select to authenticated using (public.raid_is_member(room_id));   -- 只有同隊的人看得到
create policy "raid_members_insert" on public.raid_members for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "raid_members_update" on public.raid_members for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "raid_members_delete" on public.raid_members for delete to authenticated using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.raid_rooms r where r.id = room_id and r.leader = (select auth.uid()))   -- 隊長可以請人出隊
);

revoke all on public.raid_rooms, public.raid_members from anon;
grant select, insert, update, delete on public.raid_rooms, public.raid_members to authenticated;
grant execute on function public.raid_is_member(uuid) to authenticated;
