-- 黑暗大陸：同一個帳號同時只能在一台裝置使用（2026-10-13，ARCHITECTURE.md 第 29 節「單一裝置登入」）
-- 每個帳號一列 dragon_online：目前使用中的登入（JWT session_id）、裝置、最後心跳。90 秒內有心跳＝使用中。
-- 客戶端登入後 online_claim：別台使用中 → 拒絕（可選擇強制登入：先登出其他裝置再 p_force）；每 30 秒 online_ping 心跳，被搶走就回 false → 這台登出。
-- dragon_is_banned() 加上：不是使用中的那個登入 → 視同停權（存檔、聊天、倉庫…都寫不進去，舊版客戶端也擋得住）。
-- 也包含 session-guard.sql 的檢查（session 被刪除＝停權）。可重複執行。
create table if not exists public.dragon_online (
    user_id    uuid        primary key references auth.users (id) on delete cascade,
    session_id text        not null,
    device     text,
    beat_at    timestamptz not null default now()
);
alter table public.dragon_online enable row level security;
revoke all on public.dragon_online from anon, authenticated;   -- 只能透過下面的函式

create or replace function public.online_claim(p_device text, p_force boolean default false) returns json
language plpgsql security definer set search_path = '' as $$
declare sid text := coalesce(auth.jwt() ->> 'session_id', ''); r public.dragon_online;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if sid = '' then return json_build_object('ok', true); end if;
    select * into r from public.dragon_online where user_id = auth.uid() for update;
    if found and r.session_id <> sid and r.beat_at > now() - interval '90 seconds' and not coalesce(p_force, false) then
        return json_build_object('ok', false, 'device', r.device, 'ago', floor(extract(epoch from now() - r.beat_at))::int);
    end if;
    insert into public.dragon_online (user_id, session_id, device, beat_at) values (auth.uid(), sid, left(p_device, 80), now())
        on conflict (user_id) do update set session_id = excluded.session_id, device = excluded.device, beat_at = now();
    return json_build_object('ok', true);
end $$;

-- 心跳：還是自己 → 更新；沒人或對方已逾時 → 接手；被別台搶走 → false
create or replace function public.online_ping() returns boolean
language plpgsql security definer set search_path = '' as $$
declare sid text := coalesce(auth.jwt() ->> 'session_id', ''); r public.dragon_online;
begin
    if auth.uid() is null or sid = '' then return true; end if;
    select * into r from public.dragon_online where user_id = auth.uid() for update;
    if found and r.session_id <> sid and r.beat_at > now() - interval '90 seconds' then return false; end if;
    insert into public.dragon_online (user_id, session_id, beat_at) values (auth.uid(), sid, now())
        on conflict (user_id) do update set session_id = excluded.session_id, beat_at = now();
    return true;
end $$;

create or replace function public.online_release() returns void
language sql security definer set search_path = '' as $$
    delete from public.dragon_online where user_id = auth.uid() and session_id = coalesce(auth.jwt() ->> 'session_id', '');
$$;

create or replace function public.dragon_is_banned() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.dragon_bans b where b.user_id = auth.uid())
        or (coalesce(auth.jwt() ->> 'session_id', '') <> ''
            and (not exists (select 1 from auth.sessions s where s.id::text = auth.jwt() ->> 'session_id')
                 or exists (select 1 from public.dragon_online o where o.user_id = auth.uid()
                            and o.session_id <> auth.jwt() ->> 'session_id' and o.beat_at > now() - interval '90 seconds')));
$$;

grant execute on function public.online_claim(text, boolean), public.online_ping(), public.online_release() to authenticated;
revoke execute on function public.online_claim(text, boolean), public.online_ping(), public.online_release() from anon;
