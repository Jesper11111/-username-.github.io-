-- 黑暗大陸：刪除的角色不能再被上傳（2026-10-13，ARCHITECTURE.md 第 29 節「登入安全」）
-- 問題：在 A 裝置刪掉角色，B 裝置（還開著、正在玩那個角色）幾分鐘後又把它傳回雲端。
-- 做法：刪角色時記一筆「墓碑」（帳號＋角色建立時間＋職業）；dragon_saves 寫入前檢查，墓碑上的角色一律拒絕（舊版客戶端也擋得住）。可重複執行。
create table if not exists public.dragon_deleted_chars (
    user_id      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
    char_created bigint      not null,
    cls          text        not null check (char_length(cls) <= 20),
    name         text        check (char_length(name) <= 40),
    at           timestamptz not null default now(),
    primary key (user_id, char_created, cls)
);
alter table public.dragon_deleted_chars enable row level security;
revoke all on public.dragon_deleted_chars from anon, authenticated;
grant select, insert on public.dragon_deleted_chars to authenticated;
drop policy if exists "dragon_deleted_chars_select" on public.dragon_deleted_chars;
drop policy if exists "dragon_deleted_chars_insert" on public.dragon_deleted_chars;
create policy "dragon_deleted_chars_select" on public.dragon_deleted_chars for select to authenticated using ((select auth.uid()) = user_id or public.dragon_is_admin());
create policy "dragon_deleted_chars_insert" on public.dragon_deleted_chars for insert to authenticated with check ((select auth.uid()) = user_id);

create or replace function public.dragon_saves_tombstone() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_created bigint;
begin
    begin v_created := (new.data -> 'player' ->> 'created')::numeric::bigint; exception when others then v_created := null; end;
    if v_created is not null and exists (select 1 from public.dragon_deleted_chars d
            where d.user_id = new.user_id and d.char_created = v_created and d.cls = new.data -> 'player' ->> 'cls') then
        raise exception 'char deleted' using errcode = 'P0001', hint = 'dragon_char_deleted';
    end if;
    return new;
end $$;
drop trigger if exists dragon_saves_tombstone on public.dragon_saves;
create trigger dragon_saves_tombstone before insert or update on public.dragon_saves for each row execute function public.dragon_saves_tombstone();
