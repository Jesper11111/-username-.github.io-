-- 黑暗大陸：一隻角色只能屬於一個帳號（2026-10-23，ARCHITECTURE.md 第 109 節）。接在 supabase.sql、char-tombstone.sql 之後執行；可重複執行。
-- 問題：同一隻角色（建立時間＋職業相同，例如「操真猛」Lv.68）同時出現在 aszx113224、poiuyt、qazwsc、asdfgh 等多個帳號，
--   是同一台裝置註冊新帳號登入、把本機角色傳上去的分身。管理者刪掉後，他再開新帳號還能再傳一次。
-- 做法：
--   ① dragon_char_owner(char_id = created|cls, user_id)：角色第一次上傳時登記歸屬帳號；之後別的帳號上傳同一隻角色一律拒收（hint dragon_char_owner）。
--      登記不會因為刪除角色而消失，所以管理者刪掉的分身也不能再被別的帳號傳回來。
--   ② 還沒登記的角色上傳時，若雲端已經有別的帳號擁有同一隻（目前的存檔），也拒收、不登記。
--   ③ 回填：目前只存在於一個帳號的角色直接登記給那個帳號；同時存在於多個帳號的（分身）不登記，請管理者先刪掉多餘的再讓正主上傳。
--   只管玩家（authenticated）上傳；管理者在 SQL Editor 搬資料不受影響。存檔內容沒變的更新不檢查。
-- ⚠️ 正常玩家不會受影響：遊戲本來就只上傳屬於目前登入帳號的角色（存檔裡的 owner）。

create table if not exists public.dragon_char_owner (
    char_id  text        primary key,              -- 角色建立時間|職業
    user_id  uuid        not null references auth.users (id) on delete cascade,
    name     text,
    first_at timestamptz not null default now()
);
alter table public.dragon_char_owner enable row level security;
revoke all on public.dragon_char_owner from public, anon, authenticated;
-- 查「別的帳號有沒有同一隻角色」用
create index if not exists dragon_saves_char_idx on public.dragon_saves (((data -> 'player' ->> 'created')), cls);

create or replace function public.dragon_saves_char_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_created text := new.data -> 'player' ->> 'created'; v_cls text := new.data -> 'player' ->> 'cls'; ch text; owner uuid;
begin
    if coalesce(auth.role(), '') <> 'authenticated' then return new; end if;
    if tg_op = 'UPDATE' and new.data is not distinct from old.data then return new; end if;
    if v_created is null or v_cls is null then return new; end if;
    ch := v_created || '|' || v_cls;
    select o.user_id into owner from public.dragon_char_owner o where o.char_id = ch;
    if owner is null then
        if exists (select 1 from public.dragon_saves s where (s.data -> 'player' ->> 'created') = v_created and s.cls = v_cls and s.user_id <> new.user_id) then
            raise exception 'char owned elsewhere' using errcode = 'P0001', hint = 'dragon_char_owner';
        end if;
        insert into public.dragon_char_owner (char_id, user_id, name) values (ch, new.user_id, left(new.name, 40)) on conflict do nothing;
        select o.user_id into owner from public.dragon_char_owner o where o.char_id = ch;
    end if;
    if owner <> new.user_id then
        raise exception 'char owned elsewhere' using errcode = 'P0001', hint = 'dragon_char_owner';
    end if;
    return new;
end $$;
revoke execute on function public.dragon_saves_char_owner() from public, anon, authenticated;
drop trigger if exists dragon_saves_char_owner on public.dragon_saves;
create trigger dragon_saves_char_owner before insert or update on public.dragon_saves for each row execute function public.dragon_saves_char_owner();

-- 回填：只在一個帳號出現的角色登記給那個帳號（多個帳號都有的分身不登記）
insert into public.dragon_char_owner (char_id, user_id, name)
select g.char_id, g.user_id, g.name from (
    select (s.data -> 'player' ->> 'created') || '|' || s.cls as char_id, min(s.user_id::text)::uuid as user_id, min(s.name) as name,
           count(distinct s.user_id) as accounts
    from public.dragon_saves s
    where s.data -> 'player' ->> 'created' is not null and s.cls is not null
    group by 1
) g where g.accounts = 1
on conflict do nothing;

-- 執行後可看：同時在多個帳號的角色（分身），請管理者決定刪哪些
select (s.data -> 'player' ->> 'created') || '|' || s.cls as 角色, string_agg(u.email || '（欄位 ' || (s.slot + 1) || '・' || s.name || ' Lv.' || s.lv || '）', '、') as 出現在
from public.dragon_saves s join auth.users u on u.id = s.user_id
where s.data -> 'player' ->> 'created' is not null
group by 1 having count(distinct s.user_id) > 1;
