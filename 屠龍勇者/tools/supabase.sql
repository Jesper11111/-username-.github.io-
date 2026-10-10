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
