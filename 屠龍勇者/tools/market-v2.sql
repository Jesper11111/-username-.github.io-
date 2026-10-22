-- 黑暗大陸：交易所防複製 v2（2026-10-23，ARCHITECTURE.md 第 95 節）。接在 supabase.sql、anticheat.sql、vault-v2.sql 之後執行（用 vault-v2 的 dragon_vault_commit／存取序號）；可重複執行。
-- 問題（v1，2026-10-23 隔離資料庫重現）：
--   ① market_list 存的是玩家送來的 p_item，可把普通裝備偽造成 +15 傳說上架；
--   ② 上架只檢查雲端存檔、不扣，下架（market_cancel）又把道具還給玩家：10 瓶藥水上架／下架 3 輪拿回 30 瓶；
--   ③ market_buy 只檢查買家金幣、不扣：1000 金幣能連買兩件 1000 的商品，賣家憑空入帳 1900。
-- 做法（同共用倉庫 v2）：上架／下架／購買都在同一筆交易裡直接改雲端存檔，並把存取序號 +1（與共用倉庫共用 dragon_vault_seq＋data.vaultSeq）。
--   上架：從存檔拿掉道具（可堆疊可賣一部分），交易所存的是存檔裡那一件。
--   下架：道具直接放回目前角色欄位的存檔。購買：直接扣買家金幣、道具加進買家存檔，記 buyer_got（不用再交貨）。
--   賣家收入維持 market_pending／market_ack 入帳（賣家可能不在線上；買家的錢已真的扣掉，不會憑空多金幣）。
--   舊版 market_list／market_buy／market_cancel 停用（hint dragon_market_old）；v1 時買到還沒交貨的仍由 market_pending 補交。
-- 部署順序：先執行這份 SQL，再發佈新版遊戲（20261023c 以後）。中間舊版遊戲暫時不能上架／購買／下架，瀏覽與賣出入帳照常。

-- 鎖住這個角色的雲端存檔並回傳 player（內部用）
create or replace function public.dragon_market_row(p_slot int, p_trade boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    if p_trade then   -- 上架、購買：交易所門檻＋雲端簽章（下架取回自己的東西不擋）
        if public.dragon_market_hold(auth.uid()) then raise exception 'market hold' using hint = 'dragon_market_hold'; end if;
        if not public.dragon_save_ok(auth.uid(), p_slot) then raise exception 'save signature' using hint = 'dragon_save_sig'; end if;
    end if;
    perform pg_advisory_xact_lock(7713100, hashtext(auth.uid()::text));   -- 與共用倉庫同一把鎖
    select data -> 'player' into p from public.dragon_saves where user_id = auth.uid() and slot = p_slot for update;
    if p is null then raise exception 'no cloud save'; end if;
    return p;
end $$;
revoke execute on function public.dragon_market_row(int, boolean) from public, anon, authenticated;

-- 把道具加進 player.inv：可堆疊（沒有 ench 欄位）併入同名那疊，其他給 nextUid 新 uid（同 player.js addItem）（內部用）
create or replace function public.dragon_inv_add(p jsonb, item jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare idx int; nu bigint;
begin
    if not (item ? 'ench') then
        select (o - 1)::int into idx from jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) with ordinality e(x, o)
            where x ->> 'id' = item ->> 'id' and not (x ? 'ench') limit 1;
    end if;
    if idx is not null then
        return jsonb_set(p, array['inv', idx::text, 'n'], to_jsonb(coalesce((p -> 'inv' -> idx ->> 'n')::int, 1) + coalesce((item ->> 'n')::int, 1)));
    end if;
    nu := coalesce((p ->> 'nextUid')::bigint, 1);
    p := jsonb_set(p, '{inv}', coalesce(p -> 'inv', '[]'::jsonb) || jsonb_build_array(item || jsonb_build_object('uid', nu)));
    return jsonb_set(p, '{nextUid}', to_jsonb(nu + 1));
end $$;
revoke execute on function public.dragon_inv_add(jsonb, jsonb) from public, anon, authenticated;

-- ═════ 上架：從雲端存檔拿掉，交易所存存檔裡那一件 ═════
create or replace function public.market_list2(p_slot int, p_uid int, p_n int, p_price bigint, p_seller_name text, p_name text, p_cat text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_market_row(p_slot, true); it jsonb; idx int; have int; item jsonb; r bigint;
begin
    if p_price is null or p_price < 1 or p_price > 2000000000 then raise exception 'bad price'; end if;
    if p_cat = 'quest' then raise exception 'not tradeable'; end if;
    if (select count(*) from public.dragon_market where seller = auth.uid() and state = 'active') >= 10 then raise exception 'too many listings'; end if;
    select x, (o - 1)::int into it, idx from jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) with ordinality e(x, o) where (x ->> 'uid')::int = p_uid limit 1;
    if it is null then raise exception 'item not in cloud save'; end if;
    if it ->> 'id' is null or coalesce((it ->> 'ench')::int, 0) > 15 then raise exception 'not tradeable'; end if;
    have := greatest(coalesce((it ->> 'n')::int, 1), 1);
    if p_n is null or p_n < 1 or p_n > have then raise exception 'bad amount'; end if;
    if p_n < have then
        p := jsonb_set(p, array['inv', idx::text, 'n'], to_jsonb(have - p_n));
        item := it || jsonb_build_object('n', p_n);
    else
        p := jsonb_set(p, '{inv}', (p -> 'inv') - idx);
        item := it;
    end if;
    delete from public.dragon_market where state <> 'active' and buyer_got and seller_got and listed_at < now() - interval '30 days';
    delete from public.dragon_market where state = 'cancelled' and listed_at < now() - interval '30 days';
    insert into public.dragon_market (seller, seller_name, slot, item, item_id, uid, n, cat, name, price, fee, expires_at)
        values (auth.uid(), left(p_seller_name, 40), p_slot, item, it ->> 'id', p_uid, p_n, left(p_cat, 20), left(p_name, 60), p_price, ceil(p_price * 0.05), now() + interval '48 hours')
        returning id into r;
    return public.dragon_vault_commit(p_slot, p) || jsonb_build_object('ok', true, 'id', r, 'uid', p_uid, 'n', p_n);
end $$;
revoke execute on function public.market_list2(int, int, int, bigint, text, text, text) from public, anon;
grant execute on function public.market_list2(int, int, int, bigint, text, text, text) to authenticated;

-- ═════ 下架（含過期）：道具放回目前角色欄位的雲端存檔 ═════
create or replace function public.market_cancel2(p_id bigint, p_slot int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_market_row(p_slot, false); m public.dragon_market;
begin
    select * into m from public.dragon_market where id = p_id and seller = auth.uid() for update;
    if m.id is null or m.state <> 'active' then raise exception 'not available'; end if;
    update public.dragon_market set state = 'cancelled' where id = p_id;
    p := public.dragon_inv_add(p, m.item);
    return public.dragon_vault_commit(p_slot, p) || jsonb_build_object('ok', true, 'id', m.id, 'item', m.item, 'name', m.name);
end $$;
revoke execute on function public.market_cancel2(bigint, int) from public, anon;
grant execute on function public.market_cancel2(bigint, int) to authenticated;

-- ═════ 購買：直接扣買家金幣、道具加進買家雲端存檔 ═════
create or replace function public.market_buy2(p_id bigint, p_slot int, p_buyer_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_market_row(p_slot, true); m public.dragon_market; g numeric := coalesce((p ->> 'gold')::numeric, 0);
    v_email text := auth.jwt() ->> 'email'; v_seller_email text;
begin
    select * into m from public.dragon_market where id = p_id for update;
    if m.id is null or m.state <> 'active' or m.expires_at <= now() then raise exception 'not available'; end if;
    if m.seller = auth.uid() then raise exception 'own listing'; end if;
    if g < m.price then raise exception 'not enough gold'; end if;
    update public.dragon_market set state = 'sold', buyer = auth.uid(), buyer_name = left(p_buyer_name, 40), sold_at = now(), buyer_got = true where id = p_id;
    if m.price >= 50000000 then
        select email into v_seller_email from public.dragon_profiles where user_id = m.seller;
        insert into public.dragon_flags (user_id, email, slot, name, kind, detail) values
            (auth.uid(), v_email, p_slot, left(p_buyer_name, 40), 'market_big', format('交易所 #%s 以 %s 金幣買下「%s」（賣家 %s）', m.id, m.price, m.name, coalesce(m.seller_name, '?'))),
            (m.seller, v_seller_email, m.slot, m.seller_name, 'market_big', format('交易所 #%s 以 %s 金幣賣出「%s」（買家 %s）', m.id, m.price, m.name, left(p_buyer_name, 40)));
    end if;
    p := jsonb_set(public.dragon_inv_add(p, m.item), '{gold}', to_jsonb(g - m.price));
    return public.dragon_vault_commit(p_slot, p) || jsonb_build_object('ok', true, 'id', m.id, 'item', m.item, 'price', m.price, 'name', m.name, 'gold', -m.price);
end $$;
revoke execute on function public.market_buy2(bigint, int, text) from public, anon;
grant execute on function public.market_buy2(bigint, int, text) to authenticated;

-- ═════ 舊版停用 ═════
create or replace function public.market_list(p_slot int, p_item jsonb, p_price bigint, p_seller_name text, p_name text, p_cat text) returns bigint
language plpgsql security definer set search_path = '' as $$
begin raise exception 'market client outdated' using hint = 'dragon_market_old'; end $$;
create or replace function public.market_buy(p_id bigint, p_slot int, p_buyer_name text) returns json
language plpgsql security definer set search_path = '' as $$
begin raise exception 'market client outdated' using hint = 'dragon_market_old'; end $$;
create or replace function public.market_cancel(p_id bigint) returns json
language plpgsql security definer set search_path = '' as $$
begin raise exception 'market client outdated' using hint = 'dragon_market_old'; end $$;
