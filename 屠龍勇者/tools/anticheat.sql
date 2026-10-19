-- 黑暗大陸：防改檔第 2 波（2026-10-19，ARCHITECTURE.md 第 58 節）。也附在 supabase.sql 最後；可單獨重複執行。
-- ① 交易所門檻：帳號有「未處理」的嚴重可疑紀錄（dragon_flags）時，不能上架、不能購買（hint dragon_market_hold）。
--    管理頁（gm.html）把該帳號的紀錄按「已處理」就恢復。金幣暴增（gold_rate，大量賣裝備也會觸發）、存檔格式（parse）、大額交易（market_big）不擋。
-- ② 大額交易：單筆 ≥ 5,000 萬金幣成交時，買賣雙方各記一筆 market_big（只提醒管理者，不擋）。
-- ③ 玩家端偵測到改檔（本機存檔簽章不符、記憶體數值被改、下載到被改過的雲端存檔）會寫在存檔的 player.integrity；上傳時記成 tamper（同一次事件只記一次）。
-- ④ 雲端存檔簽章：遊戲上傳時對「等級、經驗、金幣、背包／倉庫／裝備的每件道具」算 SHA-256 簽章放在 data.sig（guard.js guardCloudSig）。
--    伺服器每次寫入重算，結果存在 dragon_saves.sig_ok（玩家改不了）；簽章不符（例如直接用 API 改雲端存檔）→ 該角色不能上架、購買、存入共用倉庫，
--    並記一筆 sig（給管理者看，不用手動處理：之後送來簽章正確的存檔就自動恢復）。沒有簽章的存檔（舊版遊戲）在 dragon_sig_grace() 之前照常放行。
-- ⚠️ 簽章用的金鑰 dragon_sig_key() 必須和 data/guard.js 的 GUARD_SIG_KEY 一樣，兩邊要一起改。

create or replace function public.dragon_market_hold(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.dragon_flags f
        where f.user_id = p_user and not f.resolved and f.at > now() - interval '30 days'
          and f.kind not in ('gold_rate', 'parse', 'market_big', 'sig'));
$$;
revoke execute on function public.dragon_market_hold(uuid) from public, anon, authenticated;

-- ═════ ④ 雲端存檔簽章 ═════
create or replace function public.dragon_sig_key() returns text language sql immutable as $$ select 'dS-guard-7f3c91ae-2026'::text $$;
create or replace function public.dragon_sig_grace() returns timestamptz language sql immutable as $$ select '2026-10-26 00:00:00+08'::timestamptz $$;
-- 一件道具：uid,id,n,ench,q,詞綴（k:v 以 / 連接）；和 guard.js 的 guardItemCanon 一致
create or replace function public.dragon_item_canon(x jsonb) returns text language sql immutable set search_path = '' as $$
    select concat_ws(',', coalesce(x ->> 'uid', ''), coalesce(x ->> 'id', ''), coalesce(x ->> 'n', ''), coalesce(x ->> 'ench', ''), coalesce(x ->> 'q', ''),
        coalesce((select string_agg(coalesce(a.v ->> 'k', '') || ':' || coalesce(a.v ->> 'v', ''), '/' order by a.o)
                  from jsonb_array_elements(case when jsonb_typeof(x -> 'af') = 'array' then x -> 'af' else '[]'::jsonb end) with ordinality a(v, o)), ''));
$$;
create or replace function public.dragon_list_canon(arr jsonb) returns text language sql immutable set search_path = '' as $$
    select coalesce((select string_agg(public.dragon_item_canon(e.v), ';' order by e.o)
        from jsonb_array_elements(case when jsonb_typeof(arr) = 'array' then arr else '[]'::jsonb end) with ordinality e(v, o)), '');
$$;
create or replace function public.dragon_save_canon(p_user uuid, p_slot int, p jsonb) returns text language sql immutable set search_path = '' as $$
    select concat_ws('|', p_user::text, p_slot::text, coalesce(p ->> 'lv', ''), coalesce(p ->> 'exp', ''), coalesce(p ->> 'gold', ''),
        'inv:' || public.dragon_list_canon(p -> 'inv'), 'st:' || public.dragon_list_canon(p -> 'storage'),
        'eq:' || coalesce((select string_agg(e.key || '=' || public.dragon_item_canon(e.value), ';' order by e.key collate "C")
                           from jsonb_each(case when jsonb_typeof(p -> 'equip') = 'object' then p -> 'equip' else '{}'::jsonb end) e), ''));
$$;
create or replace function public.dragon_save_sig(p_user uuid, p_slot int, p jsonb) returns text language sql immutable set search_path = '' as $$
    select encode(sha256(convert_to(public.dragon_sig_key() || '|' || public.dragon_save_canon(p_user, p_slot, p), 'UTF8')), 'hex');
$$;
revoke execute on function public.dragon_sig_key(), public.dragon_item_canon(jsonb), public.dragon_list_canon(jsonb), public.dragon_save_canon(uuid, int, jsonb),
    public.dragon_save_sig(uuid, int, jsonb) from public, anon, authenticated;

alter table public.dragon_saves add column if not exists sig_ok boolean;
create or replace function public.dragon_saves_sig() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_sig text := new.data ->> 'sig';
begin
    if tg_op = 'UPDATE' and new.data is not distinct from old.data and new.user_id = old.user_id and new.slot = old.slot then
        new.sig_ok := old.sig_ok; return new;
    end if;
    begin
        if v_sig is null then
            new.sig_ok := now() < public.dragon_sig_grace();
        else
            new.sig_ok := v_sig = public.dragon_save_sig(new.user_id, new.slot, new.data -> 'player');
        end if;
    exception when others then new.sig_ok := false;
    end;
    if not new.sig_ok and coalesce(auth.role(), '') = 'authenticated'
       and not exists (select 1 from public.dragon_flags f where f.user_id = new.user_id and f.slot = new.slot and f.kind = 'sig' and not f.resolved and f.at > now() - interval '24 hours') then
        insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail)
            values (new.user_id, auth.jwt() ->> 'email', new.slot, new.name, new.lv, 'sig',
                    case when v_sig is null then '雲端存檔沒有簽章（遊戲版本太舊，或不是由遊戲上傳）' else '雲端存檔簽章不符（可能直接用 API 改了雲端存檔）' end);
    end if;
    return new;
end $$;
drop trigger if exists dragon_saves_sig on public.dragon_saves;
create trigger dragon_saves_sig before insert or update on public.dragon_saves for each row execute function public.dragon_saves_sig();

-- 這個角色的雲端存檔可以用在交易所／共用倉庫嗎（簽章正確，或寬限期內的舊版存檔）
create or replace function public.dragon_save_ok(p_user uuid, p_slot int) returns boolean
language sql stable security definer set search_path = '' as $$
    select coalesce((select s.sig_ok from public.dragon_saves s where s.user_id = p_user and s.slot = p_slot), true);
$$;
revoke execute on function public.dragon_save_ok(uuid, int) from public, anon, authenticated;

-- 交易所上架（同 supabase.sql 交易所段，多了 ①、④ 的檢查）
create or replace function public.market_list(p_slot int, p_item jsonb, p_price bigint, p_seller_name text, p_name text, p_cat text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare inv jsonb; it jsonb; v_uid int := (p_item ->> 'uid')::int; v_id text := p_item ->> 'id'; v_n int := greatest(coalesce((p_item ->> 'n')::int, 1), 1); r bigint;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    if public.dragon_market_hold(auth.uid()) then raise exception 'market hold' using hint = 'dragon_market_hold'; end if;
    if not public.dragon_save_ok(auth.uid(), p_slot) then raise exception 'save signature' using hint = 'dragon_save_sig'; end if;
    if p_price is null or p_price < 1 or p_price > 2000000000 then raise exception 'bad price'; end if;
    if p_cat = 'quest' or v_id is null or v_uid is null then raise exception 'not tradeable'; end if;
    if coalesce((p_item ->> 'ench')::int, 0) > 15 then raise exception 'not tradeable'; end if;
    if (select count(*) from public.dragon_market where seller = auth.uid() and state = 'active') >= 10 then raise exception 'too many listings'; end if;
    if exists (select 1 from public.dragon_market where seller = auth.uid() and slot = p_slot and uid = v_uid and state = 'active') then raise exception 'already listed'; end if;
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

-- 交易所購買（同 supabase.sql 交易所段，多了 ①、②、④ 的檢查）
create or replace function public.market_buy(p_id bigint, p_slot int, p_buyer_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare m public.dragon_market; g numeric; v_email text := auth.jwt() ->> 'email'; v_seller_email text;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    if public.dragon_market_hold(auth.uid()) then raise exception 'market hold' using hint = 'dragon_market_hold'; end if;
    if not public.dragon_save_ok(auth.uid(), p_slot) then raise exception 'save signature' using hint = 'dragon_save_sig'; end if;
    select * into m from public.dragon_market where id = p_id for update;
    if m.id is null or m.state <> 'active' or m.expires_at <= now() then raise exception 'not available'; end if;
    if m.seller = auth.uid() then raise exception 'own listing'; end if;
    select (data -> 'player' ->> 'gold')::numeric into g from public.dragon_saves where user_id = auth.uid() and slot = p_slot;
    if g is null then raise exception 'no cloud save'; end if;
    if g < m.price then raise exception 'not enough gold'; end if;
    update public.dragon_market set state = 'sold', buyer = auth.uid(), buyer_name = left(p_buyer_name, 40), sold_at = now() where id = p_id;
    if m.price >= 50000000 then
        select email into v_seller_email from public.dragon_profiles where user_id = m.seller;
        insert into public.dragon_flags (user_id, email, slot, name, kind, detail) values
            (auth.uid(), v_email, p_slot, left(p_buyer_name, 40), 'market_big', format('交易所 #%s 以 %s 金幣買下「%s」（賣家 %s）', m.id, m.price, m.name, coalesce(m.seller_name, '?'))),
            (m.seller, v_seller_email, m.slot, m.seller_name, 'market_big', format('交易所 #%s 以 %s 金幣賣出「%s」（買家 %s）', m.id, m.price, m.name, left(p_buyer_name, 40)));
    end if;
    return json_build_object('id', m.id, 'item', m.item, 'price', m.price, 'name', m.name);
end $$;

revoke execute on function public.market_list(int, jsonb, bigint, text, text, text), public.market_buy(bigint, int, text) from public, anon;
grant execute on function public.market_list(int, jsonb, bigint, text, text, text), public.market_buy(bigint, int, text) to authenticated;

-- ③ 玩家端改檔偵測 → tamper（data.player.integrity = { flagged, reason, at }；同一個 at 只記一次，管理者處理後不會重複出現）
create or replace function public.dragon_tamper_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ig jsonb := new.data -> 'player' -> 'integrity'; v_detail text;
begin
    if ig is null or coalesce((ig ->> 'flagged')::boolean, false) = false then return null; end if;
    v_detail := format('%s（遊戲偵測時間 %s）', left(coalesce(ig ->> 'reason', '?'), 200), coalesce(ig ->> 'at', '?'));
    if not exists (select 1 from public.dragon_flags f where f.user_id = new.user_id and f.kind = 'tamper' and f.detail = v_detail) then
        insert into public.dragon_flags (user_id, email, slot, name, lv, kind, detail)
            values (new.user_id, auth.jwt() ->> 'email', new.slot, new.name, new.lv, 'tamper', v_detail);
    end if;
    return null;
exception when others then return null;
end $$;
drop trigger if exists dragon_tamper_audit on public.dragon_saves;
create trigger dragon_tamper_audit after insert or update on public.dragon_saves for each row execute function public.dragon_tamper_audit();

-- 共用倉庫存入（同 supabase.sql 共用倉庫段，多了 ①、④ 的檢查：被改過的道具／金幣不能經倉庫轉到別的角色）
create or replace function public.vault_put(p_slot int, p_item jsonb, p_gold bigint, p_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare sv jsonb; g numeric; it jsonb; v_uid int := (p_item ->> 'uid')::int; v_id text := p_item ->> 'id'; v_n int := greatest(coalesce((p_item ->> 'n')::int, 1), 1); r bigint;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    if public.dragon_market_hold(auth.uid()) then raise exception 'market hold' using hint = 'dragon_market_hold'; end if;
    if not public.dragon_save_ok(auth.uid(), p_slot) then raise exception 'save signature' using hint = 'dragon_save_sig'; end if;
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
revoke execute on function public.vault_put(int, jsonb, bigint, text) from public, anon;
grant execute on function public.vault_put(int, jsonb, bigint, text) to authenticated;
