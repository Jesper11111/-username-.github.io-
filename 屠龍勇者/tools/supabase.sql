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

-- ═════════ 抓改檔與封鎖（ARCHITECTURE.md 第 31 節）═════════
-- 每次雲端存檔，伺服器自動記一筆歷程（等級、總經驗、金幣、伺服器時間），和上一筆比較，太誇張就寫進 dragon_flags 給管理者看。
-- 玩家改不到這些表；檢查在伺服器的 trigger 裡做，玩家端跳不過。被封鎖的帳號不能再上傳存檔、建立或加入團隊副本。

create table if not exists public.dragon_admins (
    user_id uuid primary key references auth.users (id) on delete cascade   -- 管理者（只能在 SQL Editor 手動新增，見文件）
);

create table if not exists public.dragon_bans (
    user_id  uuid        primary key references auth.users (id) on delete cascade,
    email    text,
    reason   text        check (char_length(reason) <= 200),
    by_email text,
    at       timestamptz not null default now()
);

create table if not exists public.dragon_profiles (   -- 帳號 Email 與最後上傳時間（管理頁顯示用）
    user_id   uuid        primary key references auth.users (id) on delete cascade,
    email     text,
    last_name text,
    last_seen timestamptz not null default now()
);

create table if not exists public.dragon_save_log (
    id           bigserial   primary key,
    user_id      uuid        not null references auth.users (id) on delete cascade,
    slot         smallint    not null,
    char_created bigint,                  -- 角色的建立時間（辨認是不是同一個角色）
    name         text,
    cls          text,
    lv           int,
    total_exp    numeric,                 -- 從 1 級開始累積的總經驗
    gold         numeric,
    client_t     bigint,
    at           timestamptz not null default now(),   -- 伺服器時間
    flags        text[]
);
create index if not exists dragon_save_log_idx on public.dragon_save_log (user_id, slot, id desc);

create table if not exists public.dragon_flags (
    id       bigserial   primary key,
    user_id  uuid        not null references auth.users (id) on delete cascade,
    email    text,
    slot     smallint,
    name     text,
    lv       int,
    kind     text        not null,        -- exp_rate / gold_rate / stat / elixir / enchant / level / gold_negative / clock / parse
    detail   text,
    at       timestamptz not null default now(),
    resolved boolean     not null default false
);
create index if not exists dragon_flags_open_idx on public.dragon_flags (resolved, at desc);

-- 升到下一級需要的經驗（與 data/config.js 的 expToNext 相同）
create or replace function public.dragon_exp_to_next(l int) returns numeric
language sql immutable set search_path = '' as $$
    select case
        when l <= 0 then 0
        when l <= 5 then (array[125, 175, 200, 250, 546])[l]
        when l <= 44 then power(l + 1, 4) - power(l, 4)
        when l = 45 then 729360 when l = 46 then 1508416 when l = 47 then 3495263 when l = 48 then 9912189
        else 36065092 end::numeric;
$$;

create or replace function public.dragon_total_exp(l int, e numeric) returns numeric
language sql immutable set search_path = '' as $$
    select coalesce((select sum(public.dragon_exp_to_next(g)) from generate_series(1, l - 1) g), 0) + coalesce(e, 0);
$$;

-- 65 級起狩獵經驗遞減（與 config.js huntExpRate 相同）
create or replace function public.dragon_hunt_rate(l int) returns numeric
language sql immutable set search_path = '' as $$
    select case when l < 65 then 1 when l < 70 then 0.5 when l < 75 then 0.25 when l < 79 then 0.125 when l < 80 then 0.0625
        when l < 82 then 1.0 / 32 when l < 84 then 1.0 / 64 when l < 86 then 1.0 / 128 when l < 87 then 1.0 / 256 else 1.0 / 512 end;
$$;

create or replace function public.dragon_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.dragon_admins a where a.user_id = auth.uid());
$$;

create or replace function public.dragon_is_banned() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.dragon_bans b where b.user_id = auth.uid());
$$;

-- 存檔歷程與異常偵測。門檻（2026-10-10 實測：各等級最快練功速度約「(等級²+1)×遞減」的 100～600 倍／小時，金幣約 5～215 倍）：
--   經驗：每小時增加 > 2000 ×((等級+5)²+1)× 遞減 → exp_rate（約正常最快的 5～10 倍以上）
--   金幣：每小時增加 > max(300,000, 3000 ×((等級+5)²+1)) → gold_rate（賣大量裝備也可能觸發，要人工判斷）
--   時間至少算 0.5 小時（打完龍、領團隊副本獎勵的瞬間增加不會誤判）；第一次上傳的角色用「建立時間到現在」計算
--   絕對檢查：等級 > 99、基礎能力值 > 40、萬能藥 > 5、強化 > +15、金幣 < 0、存檔時間比伺服器快 10 分鐘以上
create or replace function public.dragon_saves_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    p jsonb := new.data -> 'player';
    v_lv int; v_exp numeric; v_gold numeric; v_created bigint; v_total numeric;
    prev record; hrs numeric; unit numeric; lim numeric; f text[] := '{}'; d text[] := '{}'; k int;
    v_email text := auth.jwt() ->> 'email';
begin
    begin
        v_lv := coalesce((p ->> 'lv')::int, 1);
        v_exp := coalesce((p ->> 'exp')::numeric, 0);
        v_gold := coalesce((p ->> 'gold')::numeric, 0);
        v_created := (p ->> 'created')::numeric::bigint;
        v_total := public.dragon_total_exp(least(greatest(v_lv, 1), 120), v_exp);
        if v_lv > 99 or v_lv < 1 then f := array_append(f, 'level'); d := array_append(d, format('等級 %s', v_lv)); end if;
        if v_gold < 0 then f := array_append(f, 'gold_negative'); d := array_append(d, format('金幣 %s', v_gold)); end if;
        if (select max(value::numeric) from jsonb_each_text(coalesce(p -> 'stats', '{}'::jsonb))) > 40 then
            f := array_append(f, 'stat'); d := array_append(d, ('能力值 ' || (p -> 'stats')::text));
        end if;
        if coalesce((p ->> 'elixirs')::int, 0) > 5 then f := array_append(f, 'elixir'); d := array_append(d, format('萬能藥 %s 瓶', p ->> 'elixirs')); end if;
        select max((x ->> 'ench')::int) into k from (
            select jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) x
            union all select jsonb_array_elements(coalesce(p -> 'storage', '[]'::jsonb))
            union all select value from jsonb_each(coalesce(p -> 'equip', '{}'::jsonb))) s;
        if k > 15 then f := array_append(f, 'enchant'); d := array_append(d, format('裝備強化 +%s', k)); end if;
        if new.client_t > (extract(epoch from now()) * 1000 + 600000) then
            f := array_append(f, 'clock'); d := array_append(d, format('存檔時間比伺服器快 %s 分鐘（可能改了裝置時間）', round((new.client_t - extract(epoch from now()) * 1000) / 60000)));
        end if;
        -- 和這個角色上一筆比較
        select * into prev from public.dragon_save_log l
            where l.user_id = new.user_id and l.slot = new.slot and l.char_created is not distinct from v_created
            order by l.id desc limit 1;
        if found then
            hrs := greatest(extract(epoch from now() - prev.at) / 3600, 0.5);
            unit := (power(prev.lv + 5, 2) + 1);
            lim := 2000 * unit * public.dragon_hunt_rate(prev.lv) * hrs;
            if v_total - prev.total_exp > lim then
                f := array_append(f, 'exp_rate'); d := array_append(d, format('%s 小時內經驗 +%s（Lv.%s→%s，上限約 %s）', round(hrs, 2), round(v_total - prev.total_exp), prev.lv, v_lv, round(lim)));
            end if;
            lim := greatest(300000, 3000 * unit) * hrs;
            if v_gold - prev.gold > lim then
                f := array_append(f, 'gold_rate'); d := array_append(d, format('%s 小時內金幣 +%s（上限約 %s）', round(hrs, 2), round(v_gold - prev.gold), round(lim)));
            end if;
        elsif v_created is not null and v_created > 0 then
            hrs := greatest((extract(epoch from now()) * 1000 - v_created) / 3600000, 0.5);
            lim := 2000 * 226 * hrs + 100000;   -- 新角色：用 Lv.10 的上限估算（前期升級最快）
            if v_total > lim and v_lv >= 20 then
                f := array_append(f, 'exp_rate'); d := array_append(d, format('角色建立 %s 小時就有 Lv.%s（總經驗 %s）', round(hrs, 2), v_lv, round(v_total)));
            end if;
        end if;
    exception when others then
        f := array_append(f, 'parse'); d := array_append(d, ('存檔格式無法解析：' || sqlerrm));
    end;

    insert into public.dragon_save_log (user_id, slot, char_created, name, cls, lv, total_exp, gold, client_t, flags)
        values (new.user_id, new.slot, v_created, new.name, new.cls, v_lv, v_total, v_gold, new.client_t, nullif(f, '{}'));
    -- 每個欄位只留最近 200 筆
    delete from public.dragon_save_log l where l.user_id = new.user_id and l.slot = new.slot
        and l.id < (select id from public.dragon_save_log x where x.user_id = new.user_id and x.slot = new.slot order by x.id desc offset 199 limit 1);
    insert into public.dragon_profiles (user_id, email, last_name, last_seen) values (new.user_id, v_email, new.name, now())
        on conflict (user_id) do update set email = coalesce(excluded.email, public.dragon_profiles.email), last_name = excluded.last_name, last_seen = now();
    -- 同一種異常、同一角色，24 小時內還沒處理的就不重複記
    for k in 1 .. coalesce(array_length(f, 1), 0) loop
        if not exists (select 1 from public.dragon_flags x where x.user_id = new.user_id and x.slot = new.slot and x.kind = f[k]
                and not x.resolved and x.at > now() - interval '24 hours') then
            insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail) values (new.user_id, v_email, new.slot, new.name, v_lv, f[k], d[k]);
        end if;
    end loop;
    return null;
end $$;

drop trigger if exists dragon_saves_audit on public.dragon_saves;
create trigger dragon_saves_audit after insert or update on public.dragon_saves for each row execute function public.dragon_saves_audit();

alter table public.dragon_admins enable row level security;
alter table public.dragon_bans enable row level security;
alter table public.dragon_profiles enable row level security;
alter table public.dragon_save_log enable row level security;
alter table public.dragon_flags enable row level security;

drop policy if exists "dragon_bans_select" on public.dragon_bans;
drop policy if exists "dragon_bans_admin" on public.dragon_bans;
drop policy if exists "dragon_profiles_admin" on public.dragon_profiles;
drop policy if exists "dragon_save_log_admin" on public.dragon_save_log;
drop policy if exists "dragon_flags_admin" on public.dragon_flags;
drop policy if exists "dragon_saves_select_admin" on public.dragon_saves;
create policy "dragon_bans_select" on public.dragon_bans for select to authenticated using ((select auth.uid()) = user_id or public.dragon_is_admin());   -- 被封鎖的人看得到自己的原因
create policy "dragon_bans_admin" on public.dragon_bans for all to authenticated using (public.dragon_is_admin()) with check (public.dragon_is_admin());
create policy "dragon_profiles_admin" on public.dragon_profiles for select to authenticated using (public.dragon_is_admin());
create policy "dragon_save_log_admin" on public.dragon_save_log for select to authenticated using (public.dragon_is_admin());
create policy "dragon_flags_admin" on public.dragon_flags for all to authenticated using (public.dragon_is_admin()) with check (public.dragon_is_admin());
create policy "dragon_saves_select_admin" on public.dragon_saves for select to authenticated using (public.dragon_is_admin());   -- 管理者可以查看任何人的存檔

-- 被封鎖：不能上傳存檔、不能建立或加入團隊副本（取代前面同名的規則）
drop policy if exists "dragon_saves_insert_own" on public.dragon_saves;
drop policy if exists "dragon_saves_update_own" on public.dragon_saves;
create policy "dragon_saves_insert_own" on public.dragon_saves for insert to authenticated with check ((select auth.uid()) = user_id and not public.dragon_is_banned());
create policy "dragon_saves_update_own" on public.dragon_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and not public.dragon_is_banned());
drop policy if exists "raid_rooms_insert" on public.raid_rooms;
create policy "raid_rooms_insert" on public.raid_rooms for insert to authenticated with check ((select auth.uid()) = leader and not public.dragon_is_banned());
drop policy if exists "raid_members_insert" on public.raid_members;
create policy "raid_members_insert" on public.raid_members for insert to authenticated with check ((select auth.uid()) = user_id and not public.dragon_is_banned());

revoke all on public.dragon_admins, public.dragon_bans, public.dragon_profiles, public.dragon_save_log, public.dragon_flags from anon;
grant select on public.dragon_profiles, public.dragon_save_log to authenticated;
grant select, insert, update, delete on public.dragon_bans, public.dragon_flags to authenticated;
grant usage on sequence public.dragon_flags_id_seq to authenticated;
grant execute on function public.dragon_is_admin(), public.dragon_is_banned() to authenticated;

-- 設定管理者（把 Email 換成你在遊戲裡註冊的帳號，在 SQL Editor 單獨執行這一行）：
-- insert into public.dragon_admins select id from auth.users where email = '你的Email' on conflict do nothing;

-- ═════════ 聊天（ARCHITECTURE.md 第 32 節）═════════
-- 頻道：world＝世界（所有登入玩家）、room:<隊伍id>＝團隊副本隊伍（只有隊員）。每則 1～100 字、每人 3 秒一則、保留 3 天。
-- 被封鎖（dragon_bans）或禁言中（dragon_mutes）不能發言；管理者可以刪訊息、禁言。
create table if not exists public.dragon_chat (
    id      bigserial   primary key,
    channel text        not null check (channel = 'world' or channel ~ '^room:[0-9a-f-]{36}$'),
    user_id uuid        not null default auth.uid() references auth.users (id) on delete cascade,
    name    text        not null check (char_length(name) between 1 and 40),   -- 發言時的角色名、職業、等級
    cls     text        check (char_length(cls) <= 20),
    lv      int,
    text    text        not null check (char_length(text) between 1 and 100),
    at      timestamptz not null default now()
);
create index if not exists dragon_chat_channel_idx on public.dragon_chat (channel, id desc);
create index if not exists dragon_chat_at_idx on public.dragon_chat (at);

create table if not exists public.dragon_mutes (
    user_id  uuid        primary key references auth.users (id) on delete cascade,
    email    text,
    reason   text        check (char_length(reason) <= 200),
    until    timestamptz not null,
    by_email text,
    at       timestamptz not null default now()
);

create or replace function public.dragon_is_muted() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.dragon_mutes m where m.user_id = auth.uid() and m.until > now());
$$;

-- 發言：伺服器時間、3 秒冷卻；偶爾順手刪掉 3 天前的訊息
create or replace function public.dragon_chat_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
    new.at := now();
    new.text := btrim(regexp_replace(new.text, '[[:cntrl:]]', ' ', 'g'));
    if char_length(new.text) = 0 then raise exception 'empty message'; end if;
    if exists (select 1 from public.dragon_chat c where c.user_id = new.user_id and c.at > now() - interval '3 seconds') then
        raise exception 'too fast';
    end if;
    if random() < 0.05 then delete from public.dragon_chat where at < now() - interval '3 days'; end if;
    return new;
end $$;

drop trigger if exists dragon_chat_before_insert on public.dragon_chat;
create trigger dragon_chat_before_insert before insert on public.dragon_chat for each row execute function public.dragon_chat_before_insert();

alter table public.dragon_chat enable row level security;
alter table public.dragon_mutes enable row level security;

drop policy if exists "dragon_chat_select" on public.dragon_chat;
drop policy if exists "dragon_chat_insert" on public.dragon_chat;
drop policy if exists "dragon_chat_delete" on public.dragon_chat;
create policy "dragon_chat_select" on public.dragon_chat for select to authenticated using (
    channel = 'world' or (channel like 'room:%' and public.raid_is_member(substr(channel, 6)::uuid)) or public.dragon_is_admin());
create policy "dragon_chat_insert" on public.dragon_chat for insert to authenticated with check (
    (select auth.uid()) = user_id and not public.dragon_is_banned() and not public.dragon_is_muted()
    and (channel = 'world' or (channel like 'room:%' and public.raid_is_member(substr(channel, 6)::uuid))));
create policy "dragon_chat_delete" on public.dragon_chat for delete to authenticated using (public.dragon_is_admin());

drop policy if exists "dragon_mutes_select" on public.dragon_mutes;
drop policy if exists "dragon_mutes_admin" on public.dragon_mutes;
create policy "dragon_mutes_select" on public.dragon_mutes for select to authenticated using ((select auth.uid()) = user_id or public.dragon_is_admin());   -- 被禁言的人看得到到期時間
create policy "dragon_mutes_admin" on public.dragon_mutes for all to authenticated using (public.dragon_is_admin()) with check (public.dragon_is_admin());

revoke all on public.dragon_chat, public.dragon_mutes from anon;
grant select, insert, delete on public.dragon_chat to authenticated;
grant usage on sequence public.dragon_chat_id_seq to authenticated;
grant select, insert, update, delete on public.dragon_mutes to authenticated;
grant execute on function public.dragon_is_muted() to authenticated;

-- ═════════ 血盟（ARCHITECTURE.md 第 33 節）═════════
-- 一個帳號同時只能在一個血盟。所有修改都透過下面的 clan_* 函式（security definer，規則在函式裡檢查），玩家不能直接改表。
create table if not exists public.dragon_clans (
    id           uuid        primary key default gen_random_uuid(),
    name         text        not null check (char_length(name) between 2 and 12),
    icon         text        not null default '🛡️' check (char_length(icon) <= 8),
    leader       uuid        references auth.users (id) on delete set null,
    notice       text        not null default '' check (char_length(notice) <= 200),
    join_mode    text        not null default 'approve' check (join_mode in ('open', 'approve')),
    member_count int         not null default 0,
    created_at   timestamptz not null default now()
);
create unique index if not exists dragon_clans_name_idx on public.dragon_clans (lower(name));

create table if not exists public.dragon_clan_members (
    user_id   uuid        primary key references auth.users (id) on delete cascade,
    clan_id   uuid        not null references public.dragon_clans (id) on delete cascade,
    role      text        not null default 'member' check (role in ('leader', 'officer', 'member')),
    name      text        check (char_length(name) <= 40),   -- 最近一次用的角色名、職業、等級
    cls       text        check (char_length(cls) <= 20),
    lv        int,
    joined_at timestamptz not null default now(),
    last_seen timestamptz not null default now()
);
create index if not exists dragon_clan_members_clan_idx on public.dragon_clan_members (clan_id);

create table if not exists public.dragon_clan_apps (
    clan_id uuid        not null references public.dragon_clans (id) on delete cascade,
    user_id uuid        not null references auth.users (id) on delete cascade,
    name    text        check (char_length(name) <= 40),
    cls     text        check (char_length(cls) <= 20),
    lv      int,
    msg     text        not null default '' check (char_length(msg) <= 60),
    at      timestamptz not null default now(),
    primary key (clan_id, user_id)
);

-- 團隊副本：記下隊員加入時的血盟（同血盟 2 人以上有獎勵加成）
alter table public.raid_members add column if not exists clan_id uuid;

create or replace function public.dragon_my_clan() returns uuid
language sql stable security definer set search_path = '' as $$
    select clan_id from public.dragon_clan_members where user_id = auth.uid();
$$;

create or replace function public.clan_recount(c uuid) returns void
language sql security definer set search_path = '' as $$
    update public.dragon_clans set member_count = (select count(*) from public.dragon_clan_members m where m.clan_id = c) where id = c;
$$;

-- 共用檢查：登入、沒被封鎖；回傳呼叫者在血盟裡的資料（沒有血盟時 clan_id 為 null）
create or replace function public.clan_me() returns public.dragon_clan_members
language plpgsql stable security definer set search_path = '' as $$
declare r public.dragon_clan_members;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    select * into r from public.dragon_clan_members where user_id = auth.uid();
    return r;
end $$;

create or replace function public.clan_create(p_name text, p_icon text, p_mode text, p_cname text, p_cls text, p_lv int) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members := public.clan_me(); c uuid; n text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
    if me.clan_id is not null then raise exception 'already in clan'; end if;
    if char_length(n) < 2 or char_length(n) > 12 then raise exception 'bad name'; end if;
    if coalesce(p_lv, 0) < 15 then raise exception 'level too low'; end if;
    if exists (select 1 from public.dragon_clans where lower(name) = lower(n)) then raise exception 'name taken'; end if;
    insert into public.dragon_clans (name, icon, leader, join_mode) values (n, left(coalesce(nullif(p_icon, ''), '🛡️'), 8), auth.uid(), case when p_mode = 'open' then 'open' else 'approve' end) returning id into c;
    insert into public.dragon_clan_members (user_id, clan_id, role, name, cls, lv) values (auth.uid(), c, 'leader', left(p_cname, 40), left(p_cls, 20), p_lv);
    delete from public.dragon_clan_apps where user_id = auth.uid();
    perform public.clan_recount(c);
    return c;
end $$;

-- 加入：自由加入的血盟直接加入（回傳 joined），申請制送出申請（回傳 applied）
create or replace function public.clan_join(p_clan uuid, p_msg text, p_cname text, p_cls text, p_lv int) returns text
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members := public.clan_me(); cl public.dragon_clans;
begin
    if me.clan_id is not null then raise exception 'already in clan'; end if;
    select * into cl from public.dragon_clans where id = p_clan for update;
    if cl.id is null then raise exception 'no clan'; end if;
    if cl.member_count >= 50 then raise exception 'clan full'; end if;
    if cl.join_mode = 'open' then
        insert into public.dragon_clan_members (user_id, clan_id, role, name, cls, lv) values (auth.uid(), p_clan, 'member', left(p_cname, 40), left(p_cls, 20), p_lv);
        delete from public.dragon_clan_apps where user_id = auth.uid();
        perform public.clan_recount(p_clan);
        return 'joined';
    end if;
    if (select count(*) from public.dragon_clan_apps where user_id = auth.uid() and clan_id <> p_clan) >= 3 then raise exception 'too many apps'; end if;
    insert into public.dragon_clan_apps (clan_id, user_id, name, cls, lv, msg) values (p_clan, auth.uid(), left(p_cname, 40), left(p_cls, 20), p_lv, left(coalesce(p_msg, ''), 60))
        on conflict (clan_id, user_id) do update set name = excluded.name, cls = excluded.cls, lv = excluded.lv, msg = excluded.msg, at = now();
    return 'applied';
end $$;

create or replace function public.clan_cancel_app(p_clan uuid) returns void
language sql security definer set search_path = '' as $$
    delete from public.dragon_clan_apps where clan_id = p_clan and user_id = auth.uid();
$$;

-- 盟主／副盟主審核申請
create or replace function public.clan_decide(p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members := public.clan_me(); ap public.dragon_clan_apps; cnt int;
begin
    if me.role is null or me.role = 'member' then raise exception 'no permission'; end if;
    select * into ap from public.dragon_clan_apps where clan_id = me.clan_id and user_id = p_user;
    if ap.user_id is null then raise exception 'no application'; end if;
    if p_accept then
        if exists (select 1 from public.dragon_clan_members where user_id = p_user) then
            delete from public.dragon_clan_apps where user_id = p_user;
            raise exception 'already in clan';
        end if;
        select member_count into cnt from public.dragon_clans where id = me.clan_id for update;
        if cnt >= 50 then raise exception 'clan full'; end if;
        insert into public.dragon_clan_members (user_id, clan_id, role, name, cls, lv) values (p_user, me.clan_id, 'member', ap.name, ap.cls, ap.lv);
        delete from public.dragon_clan_apps where user_id = p_user;
        perform public.clan_recount(me.clan_id);
    else
        delete from public.dragon_clan_apps where clan_id = me.clan_id and user_id = p_user;
    end if;
end $$;

-- 踢人：盟主可踢副盟主與盟員；副盟主只能踢盟員
create or replace function public.clan_kick(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members := public.clan_me(); t public.dragon_clan_members;
begin
    select * into t from public.dragon_clan_members where user_id = p_user and clan_id = me.clan_id;
    if t.user_id is null or p_user = auth.uid() then raise exception 'no member'; end if;
    if not (me.role = 'leader' or (me.role = 'officer' and t.role = 'member')) then raise exception 'no permission'; end if;
    delete from public.dragon_clan_members where user_id = p_user;
    perform public.clan_recount(me.clan_id);
end $$;

-- 盟主：任命／取消副盟主
create or replace function public.clan_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members := public.clan_me();
begin
    if me.role is distinct from 'leader' or p_role not in ('officer', 'member') or p_user = auth.uid() then raise exception 'no permission'; end if;
    update public.dragon_clan_members set role = p_role where user_id = p_user and clan_id = me.clan_id;
    if not found then raise exception 'no member'; end if;
end $$;

-- 盟主：讓位（自己變副盟主）
create or replace function public.clan_transfer(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members := public.clan_me();
begin
    if me.role is distinct from 'leader' or p_user = auth.uid() then raise exception 'no permission'; end if;
    update public.dragon_clan_members set role = 'leader' where user_id = p_user and clan_id = me.clan_id;
    if not found then raise exception 'no member'; end if;
    update public.dragon_clan_members set role = 'officer' where user_id = auth.uid();
    update public.dragon_clans set leader = p_user where id = me.clan_id;
end $$;

-- 退出：盟主要先讓位；只剩自己時退出＝解散
create or replace function public.clan_leave() returns void
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    select * into me from public.dragon_clan_members where user_id = auth.uid();
    if me.user_id is null then return; end if;
    if me.role = 'leader' then
        if (select count(*) from public.dragon_clan_members where clan_id = me.clan_id) > 1 then raise exception 'transfer first'; end if;
        delete from public.dragon_clans where id = me.clan_id;
        return;
    end if;
    delete from public.dragon_clan_members where user_id = auth.uid();
    perform public.clan_recount(me.clan_id);
end $$;

create or replace function public.clan_disband() returns void
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members := public.clan_me();
begin
    if me.role is distinct from 'leader' then raise exception 'no permission'; end if;
    delete from public.dragon_clans where id = me.clan_id;
end $$;

-- 公告（盟主、副盟主）；加入方式與徽章（盟主）
create or replace function public.clan_update(p_notice text, p_mode text, p_icon text) returns void
language plpgsql security definer set search_path = '' as $$
declare me public.dragon_clan_members := public.clan_me();
begin
    if me.role is null or me.role = 'member' then raise exception 'no permission'; end if;
    if p_notice is not null then update public.dragon_clans set notice = left(btrim(p_notice), 200) where id = me.clan_id; end if;
    if me.role = 'leader' then
        if p_mode in ('open', 'approve') then update public.dragon_clans set join_mode = p_mode where id = me.clan_id; end if;
        if nullif(p_icon, '') is not null then update public.dragon_clans set icon = left(p_icon, 8) where id = me.clan_id; end if;
    end if;
end $$;

-- 更新自己在血盟名單上的角色名、等級、最後上線
create or replace function public.clan_touch(p_cname text, p_cls text, p_lv int) returns void
language sql security definer set search_path = '' as $$
    update public.dragon_clan_members set name = left(p_cname, 40), cls = left(p_cls, 20), lv = p_lv, last_seen = now() where user_id = auth.uid();
$$;

alter table public.dragon_clans enable row level security;
alter table public.dragon_clan_members enable row level security;
alter table public.dragon_clan_apps enable row level security;
drop policy if exists "dragon_clans_select" on public.dragon_clans;
drop policy if exists "dragon_clan_members_select" on public.dragon_clan_members;
drop policy if exists "dragon_clan_apps_select" on public.dragon_clan_apps;
create policy "dragon_clans_select" on public.dragon_clans for select to authenticated using (true);
create policy "dragon_clan_members_select" on public.dragon_clan_members for select to authenticated using (true);
create policy "dragon_clan_apps_select" on public.dragon_clan_apps for select to authenticated using (
    user_id = (select auth.uid())
    or exists (select 1 from public.dragon_clan_members m where m.user_id = (select auth.uid()) and m.clan_id = dragon_clan_apps.clan_id and m.role in ('leader', 'officer')));
revoke all on public.dragon_clans, public.dragon_clan_members, public.dragon_clan_apps from anon;
revoke insert, update, delete on public.dragon_clans, public.dragon_clan_members, public.dragon_clan_apps from authenticated;
grant select on public.dragon_clans, public.dragon_clan_members, public.dragon_clan_apps to authenticated;
revoke execute on function public.clan_recount(uuid) from public, anon, authenticated;
grant execute on function public.dragon_my_clan(), public.clan_create(text, text, text, text, text, int), public.clan_join(uuid, text, text, text, int),
    public.clan_cancel_app(uuid), public.clan_decide(uuid, boolean), public.clan_kick(uuid), public.clan_set_role(uuid, text), public.clan_transfer(uuid),
    public.clan_leave(), public.clan_disband(), public.clan_update(text, text, text), public.clan_touch(text, text, int) to authenticated;

-- 聊天加上血盟頻道 clan:<血盟id>（只有該血盟成員）
alter table public.dragon_chat drop constraint if exists dragon_chat_channel_check;
alter table public.dragon_chat add constraint dragon_chat_channel_check check (channel = 'world' or channel ~ '^(room|clan):[0-9a-f-]{36}$');
drop policy if exists "dragon_chat_select" on public.dragon_chat;
drop policy if exists "dragon_chat_insert" on public.dragon_chat;
create policy "dragon_chat_select" on public.dragon_chat for select to authenticated using (
    channel = 'world'
    or (channel like 'room:%' and public.raid_is_member(substr(channel, 6)::uuid))
    or (channel like 'clan:%' and public.dragon_my_clan() = substr(channel, 6)::uuid)
    or public.dragon_is_admin());
create policy "dragon_chat_insert" on public.dragon_chat for insert to authenticated with check (
    (select auth.uid()) = user_id and not public.dragon_is_banned() and not public.dragon_is_muted()
    and (channel = 'world'
        or (channel like 'room:%' and public.raid_is_member(substr(channel, 6)::uuid))
        or (channel like 'clan:%' and public.dragon_my_clan() = substr(channel, 6)::uuid)));

-- ═════════ 排行榜（ARCHITECTURE.md 第 34 節）═════════
-- 直接用雲端存檔 dragon_saves 計算（玩家不用另外上傳）；被封鎖的帳號不上榜。回傳前 p_limit 名＋呼叫者自己的角色（is_me），不回傳 user_id。
-- p_kind：level 等級（同等級比總經驗）、dragon 四大龍討伐次數、tower 永夜之塔最高通過樓層、kills 擊殺數、clan 血盟（人數、平均等級）
create or replace function public.dragon_leaderboard(p_kind text, p_cls text default null, p_limit int default 50)
returns table (rk bigint, name text, cls text, lv int, val numeric, clan text, is_me boolean)
language sql stable security definer set search_path = '' as $$
    with base as (
        select s.user_id, s.name, s.cls, s.lv, s.data -> 'player' as p,
               (select c.icon || ' ' || c.name from public.dragon_clan_members m join public.dragon_clans c on c.id = m.clan_id where m.user_id = s.user_id) as clan
        from public.dragon_saves s
        where not exists (select 1 from public.dragon_bans b where b.user_id = s.user_id)
          and (p_cls is null or p_cls = '' or s.cls = p_cls)
    ), scored as (
        select user_id, name, cls, lv, clan,
            case p_kind
                when 'dragon' then coalesce((select sum(value::numeric) from jsonb_each_text(coalesce(p -> 'dragons', '{}'::jsonb))), 0)
                when 'tower' then coalesce((select max(k::int) from jsonb_object_keys(coalesce(p -> 'towerCleared', '{}'::jsonb)) k where k ~ '^[0-9]+$'), 0)
                when 'kills' then coalesce((p ->> 'kills')::numeric, 0)
                else public.dragon_total_exp(least(greatest(coalesce(lv, 1), 1), 120), coalesce((p ->> 'exp')::numeric, 0))
            end as val
        from base
    ), ranked as (
        select row_number() over (order by val desc, lv desc, name) as rk, user_id, name, cls, lv, val, clan from scored where val > 0
    )
    select rk, name, cls, lv, val, clan, user_id = auth.uid() as is_me from ranked
    where p_kind <> 'clan' and (rk <= least(greatest(p_limit, 1), 100) or user_id = auth.uid())
    union all
    select row_number() over (order by c.member_count desc, avg_lv desc, c.name), c.icon || ' ' || c.name, null, c.member_count, round(avg_lv, 1), null,
           exists (select 1 from public.dragon_clan_members m where m.clan_id = c.id and m.user_id = auth.uid())
    from public.dragon_clans c
    cross join lateral (select coalesce(avg(m.lv), 0) as avg_lv from public.dragon_clan_members m where m.clan_id = c.id) a
    where p_kind = 'clan'
    order by 1
    limit 120;
$$;
revoke execute on function public.dragon_leaderboard(text, text, int) from public, anon;
grant execute on function public.dragon_leaderboard(text, text, int) to authenticated;

-- ═════════ 世界首領（ARCHITECTURE.md 第 35 節）═════════
-- 全服共用一條血。每個帳號每天（台灣時間）3 次挑戰；每次 60 秒戰鬥由玩家端模擬，伺服器依「雲端存檔最高等級」限制單次傷害上限：
--   上限 = 4 ×（1500 + 70 × 等級）（2026-10-10 實測各等級最強職業 60 秒約 1300 + 65 × 等級），超過的部分截掉並記可疑紀錄（dragon_flags kind = wb_dmg）。
-- 首領 HP = 6000 × max(3, 近 3 天有上傳存檔的帳號數)，最長 48 小時；被打倒或時間到 30 分鐘後自動出現下一隻（有人查詢時才建立，不需要排程）。
-- 所有存取都透過 wb_* 函式。
create table if not exists public.dragon_wb (
    id          bigserial   primary key,
    kind        text        not null,
    name        text        not null,
    icon        text        not null,
    max_hp      bigint      not null,
    hp          bigint      not null,
    started_at  timestamptz not null default now(),
    ends_at     timestamptz not null,
    killed_at   timestamptz,
    killer      uuid,
    killer_name text
);
create table if not exists public.dragon_wb_hits (
    id      bigserial   primary key,
    wb_id   bigint      not null references public.dragon_wb (id) on delete cascade,
    user_id uuid        not null references auth.users (id) on delete cascade,
    name    text,
    cls     text,
    lv      int,
    dmg     bigint      not null,
    at      timestamptz not null default now()
);
create index if not exists dragon_wb_hits_idx on public.dragon_wb_hits (wb_id, user_id);
create index if not exists dragon_wb_hits_user_idx on public.dragon_wb_hits (user_id, at desc);
create table if not exists public.dragon_wb_claims (
    wb_id   bigint      not null references public.dragon_wb (id) on delete cascade,
    user_id uuid        not null references auth.users (id) on delete cascade,
    at      timestamptz not null default now(),
    primary key (wb_id, user_id)
);
alter table public.dragon_wb enable row level security;
alter table public.dragon_wb_hits enable row level security;
alter table public.dragon_wb_claims enable row level security;
revoke all on public.dragon_wb, public.dragon_wb_hits, public.dragon_wb_claims from anon, authenticated;

create or replace function public.wb_day_start() returns timestamptz
language sql stable set search_path = '' as $$
    select (date_trunc('day', now() at time zone 'Asia/Taipei')) at time zone 'Asia/Taipei';
$$;

-- 目前的首領（必要時建立下一隻）＋自己今天剩幾次、對這隻打了多少
create or replace function public.wb_current() returns json
language plpgsql security definer set search_path = '' as $$
declare w public.dragon_wb; ended timestamptz; k text; kinds text[] := array['drake', 'balrog', 'frost', 'lich', 'roc'];
    names text[] := array['遠古地龍・格蘭卡', '炎魔・巴洛格', '冰霜巨龍・希琳', '不死君王・莫德', '風暴巨鷹・奧拉'];
    icons text[] := array['🐲', '🔥', '🐉', '💀', '🦅']; i int; act int; used int := 0; mine bigint := 0;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    perform pg_advisory_xact_lock(7713001);
    select * into w from public.dragon_wb order by id desc limit 1;
    ended := case when w.id is null then null when w.killed_at is not null then w.killed_at when w.ends_at < now() then w.ends_at else null end;
    if w.id is null or (ended is not null and now() >= ended + interval '30 minutes') then
        i := (coalesce(w.id, 0) % 5) + 1;
        select count(distinct user_id) into act from public.dragon_saves where updated_at > now() - interval '3 days';
        insert into public.dragon_wb (kind, name, icon, max_hp, hp, ends_at)
            values (kinds[i], names[i], icons[i], 6000 * greatest(3, act), 6000 * greatest(3, act), now() + interval '48 hours') returning * into w;
        ended := null;
        delete from public.dragon_wb where started_at < now() - interval '30 days';
    end if;
    select count(*) into used from public.dragon_wb_hits where user_id = auth.uid() and at >= public.wb_day_start();
    select coalesce(sum(dmg), 0) into mine from public.dragon_wb_hits where user_id = auth.uid() and wb_id = w.id;
    return json_build_object('id', w.id, 'kind', w.kind, 'name', w.name, 'icon', w.icon, 'max_hp', w.max_hp, 'hp', w.hp,
        'started_at', w.started_at, 'ends_at', w.ends_at, 'killed_at', w.killed_at, 'killer_name', w.killer_name,
        'ended', ended is not null, 'next_at', case when ended is not null then ended + interval '30 minutes' end,
        'now', now(), 'attempts_left', greatest(0, 3 - used), 'my_dmg', mine,
        'participants', (select count(distinct user_id) from public.dragon_wb_hits where wb_id = w.id));
end $$;

-- 送出一次挑戰的傷害
create or replace function public.wb_attack(p_wb bigint, p_dmg bigint, p_name text, p_cls text) returns json
language plpgsql security definer set search_path = '' as $$
declare w public.dragon_wb; lv int; used int; cap bigint; d bigint; v_email text := auth.jwt() ->> 'email';
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    select * into w from public.dragon_wb where id = p_wb for update;
    if w.id is null or w.hp <= 0 or w.killed_at is not null or w.ends_at < now() then raise exception 'boss gone'; end if;
    select max(s.lv) into lv from public.dragon_saves s where s.user_id = auth.uid();
    if lv is null then raise exception 'no cloud save'; end if;
    select count(*) into used from public.dragon_wb_hits where user_id = auth.uid() and at >= public.wb_day_start();
    if used >= 3 then raise exception 'no attempts'; end if;
    cap := 4 * (1500 + 70 * lv);
    d := least(greatest(coalesce(p_dmg, 0), 0), cap);
    if p_dmg > cap then
        insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail)
            values (auth.uid(), v_email, 0, left(p_name, 40), lv, 'wb_dmg', format('世界首領單次傷害 %s，超過上限 %s（Lv.%s）', p_dmg, cap, lv));
    end if;
    d := least(d, w.hp);
    update public.dragon_wb set hp = hp - d,
        killed_at = case when hp - d <= 0 then now() end,
        killer = case when hp - d <= 0 then auth.uid() end,
        killer_name = case when hp - d <= 0 then left(p_name, 40) end
        where id = w.id returning * into w;
    insert into public.dragon_wb_hits (wb_id, user_id, name, cls, lv, dmg) values (w.id, auth.uid(), left(p_name, 40), left(p_cls, 20), lv, d);
    return json_build_object('dmg', d, 'hp', w.hp, 'killed', w.killed_at is not null, 'attempts_left', greatest(0, 2 - used), 'capped', p_dmg > cap);
end $$;

-- 傷害排行：前 20 名＋自己
create or replace function public.wb_rank(p_wb bigint) returns table (rk bigint, name text, cls text, lv int, dmg bigint, is_me boolean)
language sql stable security definer set search_path = '' as $$
    with s as (
        select user_id, sum(h.dmg) as dmg, (array_agg(h.name order by h.id desc))[1] as name, (array_agg(h.cls order by h.id desc))[1] as cls, max(h.lv) as lv
        from public.dragon_wb_hits h where h.wb_id = p_wb group by user_id
    ), r as (select row_number() over (order by dmg desc, name) as rk, * from s)
    select rk, name, cls, lv, dmg::bigint, user_id = auth.uid() from r where rk <= 20 or user_id = auth.uid() order by rk;
$$;

-- 領獎：首領結束（打倒或時間到）後，有打過的人各領一次；回傳名次等資料，獎勵內容由遊戲依此計算
create or replace function public.wb_claim(p_wb bigint) returns json
language plpgsql security definer set search_path = '' as $$
declare w public.dragon_wb; mine bigint; total bigint; rnk bigint; n int;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    select * into w from public.dragon_wb where id = p_wb;
    if w.id is null then raise exception 'boss gone'; end if;
    if w.killed_at is null and w.ends_at >= now() then raise exception 'not ended'; end if;
    select coalesce(sum(dmg), 0) into mine from public.dragon_wb_hits where wb_id = p_wb and user_id = auth.uid();
    if mine <= 0 then raise exception 'not participated'; end if;
    insert into public.dragon_wb_claims (wb_id, user_id) values (p_wb, auth.uid());   -- 主鍵重複＝已領過
    select coalesce(sum(dmg), 0), count(distinct user_id) into total, n from public.dragon_wb_hits where wb_id = p_wb;
    select count(*) + 1 into rnk from (select user_id, sum(dmg) d from public.dragon_wb_hits where wb_id = p_wb group by user_id) x where x.d > mine;
    return json_build_object('wb', p_wb, 'name', w.name, 'icon', w.icon, 'killed', w.killed_at is not null, 'killer_me', w.killer = auth.uid(),
        'my_dmg', mine, 'total', total, 'rank', rnk, 'participants', n);
end $$;

-- 還沒領獎的已結束首領（最近 7 天）
create or replace function public.wb_unclaimed() returns table (id bigint, name text, icon text)
language sql stable security definer set search_path = '' as $$
    select w.id, w.name, w.icon from public.dragon_wb w
    where (w.killed_at is not null or w.ends_at < now()) and w.started_at > now() - interval '7 days'
      and exists (select 1 from public.dragon_wb_hits h where h.wb_id = w.id and h.user_id = auth.uid())
      and not exists (select 1 from public.dragon_wb_claims c where c.wb_id = w.id and c.user_id = auth.uid())
    order by w.id desc;
$$;

revoke execute on function public.wb_current(), public.wb_attack(bigint, bigint, text, text), public.wb_rank(bigint), public.wb_claim(bigint), public.wb_unclaimed() from public, anon;
grant execute on function public.wb_current(), public.wb_attack(bigint, bigint, text, text), public.wb_rank(bigint), public.wb_claim(bigint), public.wb_unclaimed() to authenticated;

-- ═════════ 交易所（ARCHITECTURE.md 第 36 節）═════════
-- 寄賣制：賣家上架道具（伺服器確認這件道具真的在他雲端存檔的背包裡）→ 買家付錢（伺服器確認買家雲端存檔的金幣夠）→
-- 買家領道具、賣家領錢（扣 5% 手續費）。交貨用「記帳＋確認」兩段式（buyer_got／seller_got），網路中斷不會遺失。
-- 每人最多 10 件上架、48 小時；賣出或上架中的裝備又出現在賣家存檔裡 → 可疑紀錄 market_dupe（複製道具）。所有存取經過 market_* 函式。
create table if not exists public.dragon_market (
    id          bigserial   primary key,
    seller      uuid        not null references auth.users (id) on delete cascade,
    seller_name text,
    slot        smallint    not null,
    item        jsonb       not null check (pg_column_size(item) < 4000),
    item_id     text        not null,
    uid         int         not null,
    n           int         not null check (n >= 1),
    cat         text,
    name        text        check (char_length(name) <= 60),
    price       bigint      not null check (price between 1 and 2000000000),
    fee         bigint      not null,
    state       text        not null default 'active' check (state in ('active', 'sold', 'cancelled')),
    buyer       uuid        references auth.users (id) on delete set null,
    buyer_name  text,
    buyer_got   boolean     not null default false,
    seller_got  boolean     not null default false,
    listed_at   timestamptz not null default now(),
    expires_at  timestamptz not null,
    sold_at     timestamptz
);
create index if not exists dragon_market_active_idx on public.dragon_market (state, expires_at);
create index if not exists dragon_market_seller_idx on public.dragon_market (seller, state);
create index if not exists dragon_market_buyer_idx on public.dragon_market (buyer) where buyer is not null;
alter table public.dragon_market enable row level security;
revoke all on public.dragon_market from anon, authenticated;

create or replace function public.market_list(p_slot int, p_item jsonb, p_price bigint, p_seller_name text, p_name text, p_cat text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare inv jsonb; it jsonb; v_uid int := (p_item ->> 'uid')::int; v_id text := p_item ->> 'id'; v_n int := greatest(coalesce((p_item ->> 'n')::int, 1), 1); r bigint;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    if p_price is null or p_price < 1 or p_price > 2000000000 then raise exception 'bad price'; end if;
    if p_cat = 'quest' or v_id is null or v_uid is null then raise exception 'not tradeable'; end if;
    if coalesce((p_item ->> 'ench')::int, 0) > 15 then raise exception 'not tradeable'; end if;
    if (select count(*) from public.dragon_market where seller = auth.uid() and state = 'active') >= 10 then raise exception 'too many listings'; end if;
    if exists (select 1 from public.dragon_market where seller = auth.uid() and slot = p_slot and uid = v_uid and state = 'active') then raise exception 'already listed'; end if;
    -- 這件道具（同 uid、同種類、數量夠）要在雲端存檔的背包裡
    select data -> 'player' -> 'inv' into inv from public.dragon_saves where user_id = auth.uid() and slot = p_slot;
    select x into it from jsonb_array_elements(coalesce(inv, '[]'::jsonb)) x where (x ->> 'uid')::int = v_uid and x ->> 'id' = v_id limit 1;
    if it is null or coalesce((it ->> 'n')::int, 1) < v_n then raise exception 'item not in cloud save'; end if;
    delete from public.dragon_market where state <> 'active' and buyer_got and seller_got and listed_at < now() - interval '30 days';
    delete from public.dragon_market where state = 'cancelled' and listed_at < now() - interval '30 days';
    insert into public.dragon_market (seller, seller_name, slot, item, item_id, uid, n, cat, name, price, fee, expires_at)
        values (auth.uid(), left(p_seller_name, 40), p_slot, p_item, v_id, v_uid, v_n, left(p_cat, 20), left(p_name, 60), p_price, ceil(p_price * 0.05), now() + interval '48 hours')
        returning id into r;
    return r;
end $$;

create or replace function public.market_browse(p_cat text, p_q text, p_sort text, p_offset int)
returns table (id bigint, item jsonb, n int, cat text, name text, price bigint, seller_name text, listed_at timestamptz, expires_at timestamptz, is_mine boolean)
language sql stable security definer set search_path = '' as $$
    select m.id, m.item, m.n, m.cat, m.name, m.price, m.seller_name, m.listed_at, m.expires_at, m.seller = auth.uid()
    from public.dragon_market m
    where m.state = 'active' and m.expires_at > now() and auth.uid() is not null
      and (p_cat is null or p_cat = '' or m.cat = p_cat)
      and (p_q is null or p_q = '' or m.name ilike '%' || p_q || '%')
    order by case when p_sort = 'price' then m.price end asc, case when p_sort = 'price_desc' then m.price end desc, m.id desc
    limit 50 offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.market_buy(p_id bigint, p_slot int, p_buyer_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.dragon_market; g numeric;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    select * into m from public.dragon_market where id = p_id for update;
    if m.id is null or m.state <> 'active' or m.expires_at <= now() then raise exception 'not available'; end if;
    if m.seller = auth.uid() then raise exception 'own listing'; end if;
    select (data -> 'player' ->> 'gold')::numeric into g from public.dragon_saves where user_id = auth.uid() and slot = p_slot;
    if g is null then raise exception 'no cloud save'; end if;
    if g < m.price then raise exception 'not enough gold'; end if;
    update public.dragon_market set state = 'sold', buyer = auth.uid(), buyer_name = left(p_buyer_name, 40), sold_at = now() where id = p_id;
    return json_build_object('id', m.id, 'item', m.item, 'price', m.price, 'name', m.name);
end $$;

create or replace function public.market_cancel(p_id bigint) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.dragon_market;
begin
    select * into m from public.dragon_market where id = p_id and seller = auth.uid() for update;
    if m.id is null or m.state <> 'active' then raise exception 'not available'; end if;
    update public.dragon_market set state = 'cancelled' where id = p_id;
    return json_build_object('id', m.id, 'item', m.item, 'name', m.name);
end $$;

-- 待交貨：我買到還沒領的道具、我賣出還沒領的錢
create or replace function public.market_pending() returns json
language sql stable security definer set search_path = '' as $$
    select json_build_object(
        'bought', coalesce((select json_agg(json_build_object('id', id, 'item', item, 'name', name, 'price', price) order by id) from public.dragon_market where buyer = auth.uid() and state = 'sold' and not buyer_got), '[]'::json),
        'sold', coalesce((select json_agg(json_build_object('id', id, 'name', name, 'price', price, 'fee', fee, 'buyer_name', buyer_name) order by id) from public.dragon_market where seller = auth.uid() and state = 'sold' and not seller_got), '[]'::json));
$$;

create or replace function public.market_ack(p_bought bigint[], p_sold bigint[]) returns void
language sql security definer set search_path = '' as $$
    update public.dragon_market set buyer_got = true where buyer = auth.uid() and id = any(coalesce(p_bought, '{}'));
    update public.dragon_market set seller_got = true where seller = auth.uid() and id = any(coalesce(p_sold, '{}'));
$$;

-- 我的上架（上架中、已過期待取回、最近賣出）
create or replace function public.market_mine() returns table (id bigint, item jsonb, n int, name text, price bigint, fee bigint, state text, buyer_name text, listed_at timestamptz, expires_at timestamptz, sold_at timestamptz)
language sql stable security definer set search_path = '' as $$
    select id, item, n, name, price, fee, state, buyer_name, listed_at, expires_at, sold_at from public.dragon_market
    where seller = auth.uid() and (state = 'active' or (state = 'sold' and sold_at > now() - interval '7 days'))
    order by state, id desc limit 50;
$$;

-- 防複製：上架中或已賣出的道具又出現在賣家同一個欄位的存檔裡（上架超過 1 分鐘後）
create or replace function public.dragon_market_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare m record; v_email text := auth.jwt() ->> 'email';
begin
    for m in select mk.id, mk.uid, mk.item_id, mk.name, mk.state from public.dragon_market mk
        where mk.seller = new.user_id and mk.slot = new.slot and mk.state in ('active', 'sold') and mk.listed_at < now() - interval '1 minute'
          and mk.listed_at > now() - interval '30 days'
          and mk.item ? 'ench'   -- 只查裝備這類單件道具（藥水等堆疊道具可以只賣一部分，同一疊留在背包是正常的）
    loop
        if exists (select 1 from jsonb_array_elements(coalesce(new.data -> 'player' -> 'inv', '[]'::jsonb)) x where (x ->> 'uid')::int = m.uid and x ->> 'id' = m.item_id)
           and not exists (select 1 from public.dragon_flags f where f.user_id = new.user_id and f.kind = 'market_dupe' and f.detail like '%#' || m.id || '%') then
            insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail)
                values (new.user_id, v_email, new.slot, new.name, new.lv, 'market_dupe', format('交易所 #%s「%s」（%s）上架後仍留在背包裡，可能複製道具', m.id, m.name, case when m.state = 'sold' then '已賣出' else '上架中' end));
        end if;
    end loop;
    return null;
exception when others then return null;
end $$;
drop trigger if exists dragon_market_audit on public.dragon_saves;
create trigger dragon_market_audit after insert or update on public.dragon_saves for each row execute function public.dragon_market_audit();

revoke execute on function public.market_list(int, jsonb, bigint, text, text, text), public.market_browse(text, text, text, int), public.market_buy(bigint, int, text),
    public.market_cancel(bigint), public.market_pending(), public.market_ack(bigint[], bigint[]), public.market_mine() from public, anon;
grant execute on function public.market_list(int, jsonb, bigint, text, text, text), public.market_browse(text, text, text, int), public.market_buy(bigint, int, text),
    public.market_cancel(bigint), public.market_pending(), public.market_ack(bigint[], bigint[]), public.market_mine() to authenticated;

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
