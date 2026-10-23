-- 黑暗大陸：管理頁「排除」正常玩家（信任名單）＋「已處理」24 小時內有效（2026-10-23，ARCHITECTURE.md 第 111 節）。
-- 接在 supabase.sql、anticheat.sql、save-log-throttle.sql 之後執行；可重複執行。
-- 問題：管理頁按「已處理」後，造成紀錄的情況還在（例如「角色建立 X 小時就 Lv.Y」、手機時間不準），玩家下次上傳存檔又被記一筆新的、
--   又被擋在交易所和共用倉庫外（dragon_market_hold），等於永遠排除不掉。
-- 做法：
--   ① dragon_trusted 信任名單（管理者在 gm.html 按「排除」加入）：信任的帳號不再記可疑紀錄、也不會被交易所門檻擋；存檔歷程照記，之後仍可查。
--   ② dragon_saves_audit：同一種異常、同一角色 24 小時內已經有紀錄（含已處理）就不再記，「已處理」至少 24 小時內有效。
--   ③ dragon_market_hold：信任名單上的帳號一律不擋。
-- ⚠️ 之後若重跑 supabase.sql、anticheat.sql 或 save-log-throttle.sql，會把這兩個函式蓋回舊版，要再執行一次這份。

create table if not exists public.dragon_trusted (
    user_id  uuid        primary key references auth.users (id) on delete cascade,
    email    text,
    reason   text        check (char_length(reason) <= 200),
    by_email text,
    at       timestamptz not null default now()
);
alter table public.dragon_trusted enable row level security;
revoke all on public.dragon_trusted from anon;
grant select, insert, delete on public.dragon_trusted to authenticated;
drop policy if exists "dragon_trusted_admin" on public.dragon_trusted;
create policy "dragon_trusted_admin" on public.dragon_trusted for all to authenticated using (public.dragon_is_admin()) with check (public.dragon_is_admin());

-- 交易所／共用倉庫門檻：信任名單不擋
create or replace function public.dragon_market_hold(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select not exists (select 1 from public.dragon_trusted tr where tr.user_id = p_user)
       and exists (select 1 from public.dragon_flags f
        where f.user_id = p_user and not f.resolved and f.at > now() - interval '30 days'
          and f.kind not in ('gold_rate', 'parse', 'market_big', 'sig'));
$$;
revoke execute on function public.dragon_market_hold(uuid) from public, anon, authenticated;

create or replace function public.dragon_saves_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    p jsonb := new.data -> 'player';
    v_lv int; v_exp numeric; v_gold numeric; v_created bigint; v_total numeric;
    prev record; hrs numeric; unit numeric; lim numeric; f text[] := '{}'; d text[] := '{}'; k int;
    v_email text := auth.jwt() ->> 'email'; v_last timestamptz;
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

    -- 2026-10-23 減少寫入（第 101 節）：同一欄位 5 分鐘內已有歷程、這次也沒有異常，就不再記一筆（歷程與「上一筆比較」改成約 5 分鐘一筆）
    select l.at into v_last from public.dragon_save_log l where l.user_id = new.user_id and l.slot = new.slot order by l.id desc limit 1;
    if f <> '{}' or v_last is null or v_last < now() - interval '5 minutes' then
        insert into public.dragon_save_log (user_id, slot, char_created, name, cls, lv, total_exp, gold, client_t, flags)
            values (new.user_id, new.slot, v_created, new.name, new.cls, v_lv, v_total, v_gold, new.client_t, nullif(f, '{}'));
        -- 每個欄位只留最近 200 筆
        delete from public.dragon_save_log l where l.user_id = new.user_id and l.slot = new.slot
            and l.id < (select id from public.dragon_save_log x where x.user_id = new.user_id and x.slot = new.slot order by x.id desc offset 199 limit 1);
    end if;
    -- 最後上線時間 5 分鐘內、名字與 email 沒變就不改
    insert into public.dragon_profiles (user_id, email, last_name, last_seen) values (new.user_id, v_email, new.name, now())
        on conflict (user_id) do update set email = coalesce(excluded.email, public.dragon_profiles.email), last_name = excluded.last_name, last_seen = now()
        where public.dragon_profiles.last_seen < now() - interval '5 minutes' or public.dragon_profiles.last_name is distinct from excluded.last_name
           or public.dragon_profiles.email is distinct from coalesce(excluded.email, public.dragon_profiles.email);
    -- 2026-10-23（第 111 節）：信任名單的帳號不記可疑紀錄（歷程照記）；
    -- 同一種異常、同一角色，24 小時內已經有紀錄（不論有沒有按「已處理」）就不重複記，所以按了「已處理」至少 24 小時內有效
    if exists (select 1 from public.dragon_trusted tr where tr.user_id = new.user_id) then return null; end if;
    for k in 1 .. coalesce(array_length(f, 1), 0) loop
        if not exists (select 1 from public.dragon_flags x where x.user_id = new.user_id and x.slot = new.slot and x.kind = f[k]
                and x.at > now() - interval '24 hours') then
            insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail) values (new.user_id, v_email, new.slot, new.name, v_lv, f[k], d[k]);
        end if;
    end loop;
    return null;
end $$;

drop trigger if exists dragon_saves_audit on public.dragon_saves;
create trigger dragon_saves_audit after insert or update on public.dragon_saves for each row execute function public.dragon_saves_audit();
