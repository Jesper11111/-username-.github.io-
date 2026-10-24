-- 黑暗大陸：GM 發放道具（2026-10-24，ARCHITECTURE.md 第 128 節）——貼到 Supabase SQL Editor 執行一次即可（可重複執行）
-- 需要先執行過 supabase.sql（dragon_admins／dragon_is_admin／dragon_profiles）、vault.sql（共用倉庫）、server-loot-install.sql（dragon_loot_catalog 道具目錄）。
-- 發放方式：只有管理者能呼叫；道具直接放進「對方帳號的共用倉庫」，對方在村莊倉庫 → 共用倉庫取出（取出照常收 100 金幣手續費）。
--   道具 id 以伺服器的 dragon_loot_catalog 為準（新道具要先重跑 server-loot-install.sql 更新目錄才能發）；任務道具不能發。
--   可堆疊道具（藥水、卷軸、材料…）一次 1～99999 個、放成一格；裝備一次 1～50 件、每件一格、+0、普通品質。共用倉庫上限 200 格照算。
--   from_slot = -1、uid = 0：不屬於任何角色存檔，不會被「存入後仍留在角色身上」(vault_dupe) 誤判。每次發放記在 dragon_gm_give_log。

create table if not exists public.dragon_gm_give_log (
    id       bigserial   primary key,
    by_user  uuid        not null,
    by_email text,
    to_user  uuid        not null references auth.users (id) on delete cascade,
    to_email text,
    item_id  text        not null,
    n        int         not null,
    reason   text        check (char_length(reason) <= 200),
    at       timestamptz not null default now()
);
create index if not exists dragon_gm_give_log_idx on public.dragon_gm_give_log (to_user, id desc);
alter table public.dragon_gm_give_log enable row level security;
revoke all on public.dragon_gm_give_log from anon, authenticated;
grant select on public.dragon_gm_give_log to authenticated;
drop policy if exists "dragon_gm_give_log_admin" on public.dragon_gm_give_log;
create policy "dragon_gm_give_log_admin" on public.dragon_gm_give_log for select to authenticated using (public.dragon_is_admin());

-- 道具清單（管理頁搜尋用）：{ id: { name, cat, stack } }
create or replace function public.gm_item_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
    if not public.dragon_is_admin() then raise exception 'not admin'; end if;
    return (select coalesce(jsonb_object_agg(k, jsonb_build_object('name', v ->> 'name', 'cat', v ->> 'cat', 'stack', coalesce((v ->> 'stack')::boolean, false))), '{}'::jsonb)
        from public.dragon_loot_catalog c, jsonb_each(c.data -> 'items') e(k, v) where c.id = 1);
end $$;

-- 發放：p_target＝對方帳號的 user_id 或 Email
create or replace function public.gm_give_item(p_target text, p_item text, p_n int, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_email text; d jsonb; v_stack boolean; v_name text; v_used int; v_rows int; it jsonb; i int;
begin
    if not public.dragon_is_admin() then raise exception 'not admin'; end if;
    p_target := btrim(coalesce(p_target, ''));
    if p_target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select u.id, u.email into v_user, v_email from auth.users u where u.id = p_target::uuid;
    else
        select u.id, u.email into v_user, v_email from auth.users u where lower(u.email) = lower(p_target) limit 1;
    end if;
    if v_user is null then raise exception 'no such player' using hint = 'gm_give_target'; end if;
    select c.data -> 'items' -> p_item into d from public.dragon_loot_catalog c where c.id = 1;
    if d is null or p_item like 'q\_%' or d ->> 'cat' = 'quest' then raise exception 'unknown item' using hint = 'gm_give_item'; end if;
    v_stack := coalesce((d ->> 'stack')::boolean, false);
    v_name := left(coalesce(d ->> 'name', p_item), 60);
    if p_n is null or p_n < 1 or p_n > (case when v_stack then 99999 else 50 end) then raise exception 'bad amount' using hint = 'gm_give_amount'; end if;
    perform pg_advisory_xact_lock(7713100, hashtext(v_user::text));   -- 和共用倉庫存取同一把鎖
    v_rows := case when v_stack then 1 else p_n end;
    select count(*) into v_used from public.dragon_vault_items where user_id = v_user and taken_at is null;
    if v_used + v_rows > 200 then raise exception 'vault full' using hint = 'gm_give_full'; end if;
    it := case when v_stack then jsonb_build_object('id', p_item, 'n', p_n) else jsonb_build_object('id', p_item, 'n', 1, 'ench', 0) end;
    for i in 1 .. v_rows loop
        insert into public.dragon_vault_items (user_id, from_slot, uid, item_id, item, name) values (v_user, -1, 0, p_item, it, v_name);
    end loop;
    insert into public.dragon_gm_give_log (by_user, by_email, to_user, to_email, item_id, n, reason)
        values (auth.uid(), auth.jwt() ->> 'email', v_user, v_email, p_item, p_n, left(coalesce(p_reason, ''), 200));
    return jsonb_build_object('ok', true, 'email', v_email, 'item', p_item, 'name', v_name, 'n', p_n, 'rows', v_rows, 'free', 200 - v_used - v_rows);
end $$;

revoke execute on function public.gm_item_list(), public.gm_give_item(text, text, int, text) from public, anon;
grant execute on function public.gm_item_list(), public.gm_give_item(text, text, int, text) to authenticated;

-- 查最近的發放紀錄：
-- select at, by_email, to_email, item_id, n, reason from public.dragon_gm_give_log order by id desc limit 50;
