-- 黑暗大陸：存檔上傳的裝置紀錄（2026-10-13，ARCHITECTURE.md 第 29 節「登入安全」）
-- 每次上傳存檔記下：哪個登入（session_id）、哪台裝置（瀏覽器 user-agent）、IP。用來查「某個角色是哪台裝置在上傳」。
-- 每個帳號只留最近 300 筆；只有管理者讀得到。可重複執行。
create table if not exists public.dragon_save_dev (
    id         bigserial   primary key,
    user_id    uuid        not null references auth.users (id) on delete cascade,
    slot       smallint,
    name       text,
    cls        text,
    lv         int,
    char_created bigint,
    session_id text,
    ua         text,
    ip         text,
    at         timestamptz not null default now()
);
create index if not exists dragon_save_dev_idx on public.dragon_save_dev (user_id, id desc);
alter table public.dragon_save_dev enable row level security;
revoke all on public.dragon_save_dev from anon, authenticated;
grant select on public.dragon_save_dev to authenticated;
drop policy if exists "dragon_save_dev_admin" on public.dragon_save_dev;
create policy "dragon_save_dev_admin" on public.dragon_save_dev for select to authenticated using (public.dragon_is_admin());

create or replace function public.dragon_save_dev_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare h jsonb;
begin
    begin
        h := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
        insert into public.dragon_save_dev (user_id, slot, name, cls, lv, char_created, session_id, ua, ip)
        values (new.user_id, new.slot, new.name, new.cls, new.lv,
                (new.data -> 'player' ->> 'created')::numeric::bigint,
                auth.jwt() ->> 'session_id',
                left(h ->> 'user-agent', 300),
                left(coalesce(h ->> 'cf-connecting-ip', split_part(h ->> 'x-forwarded-for', ',', 1), h ->> 'x-real-ip'), 60));
        delete from public.dragon_save_dev d where d.user_id = new.user_id
            and d.id < (select min(id) from (select id from public.dragon_save_dev where user_id = new.user_id order by id desc limit 300) x);
    exception when others then null;   -- 記錄失敗也不能擋住存檔
    end;
    return new;
end $$;
drop trigger if exists dragon_save_dev_log on public.dragon_saves;
create trigger dragon_save_dev_log after insert or update on public.dragon_saves for each row execute function public.dragon_save_dev_log();
