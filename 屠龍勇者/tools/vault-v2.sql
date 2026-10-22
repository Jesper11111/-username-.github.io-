-- 黑暗大陸：共用倉庫防複製 v2（2026-10-23，ARCHITECTURE.md 第 93 節）。接在 supabase.sql、vault.sql、anticheat.sql 之後執行；可重複執行。
-- 問題（v1）：vault_put 只「檢查」雲端存檔有這件道具／金幣，扣除交給遊戲自己做。直接呼叫 API、斷線、關網頁、還原舊存檔都能讓東西同時留在角色身上和倉庫裡；
--   金幣存入沒有任何重複檢查，同一筆錢能存很多次；而且存進倉庫的是玩家送來的 p_item，不是雲端存檔裡那一件（可以偽造強化／詞綴）。
-- 做法：
--   ① vault_put2／vault_take2 在同一筆交易裡直接修改雲端存檔（扣道具或金幣＋100 手續費、取出時把道具／金幣加進存檔），倉庫存的是存檔裡的那一件。
--   ② 每個角色（created|cls）有一個存取序號 dragon_vault_seq；每次存取 +1，寫進存檔外層 data.vaultSeq。
--      dragon_vault_save_guard：玩家上傳的存檔 vaultSeq 必須等於伺服器序號，舊裝置／斷線前的舊存檔蓋不回來（遊戲收到 hint dragon_vault_seq 會改用雲端進度）。
--   ③ 伺服器改存檔時重算雲端簽章 data.sig（anticheat.sql 的 dragon_save_sig），sig_ok 保持正確。
--   ④ 舊版 vault_put／vault_take 停用（hint dragon_vault_old），舊版遊戲要更新才能用共用倉庫；vault_pending／vault_ack 保留，讓 v1 時取出還沒交貨的補交。
-- 部署順序：先執行這份 SQL，再發佈新版遊戲（20261023a 以後）。執行後到新版上線前，舊版遊戲暫時不能存取共用倉庫，其他功能照常。

create table if not exists public.dragon_vault_seq (
    user_id uuid   not null references auth.users (id) on delete cascade,
    char_id text   not null,                 -- 角色 created|cls（同欄位刪掉重建是不同角色）
    seq     bigint not null default 0,
    primary key (user_id, char_id)
);
alter table public.dragon_vault_seq enable row level security;
revoke all on public.dragon_vault_seq from anon, authenticated;

-- ═════ 上傳守衛：存檔外層 vaultSeq 必須等於伺服器序號 ═════
create or replace function public.dragon_vault_save_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ch text := (new.data -> 'player' ->> 'created') || '|' || (new.data -> 'player' ->> 'cls'); s bigint; cur bigint;
begin
    if coalesce(auth.role(), '') <> 'authenticated' then return new; end if;   -- 管理者在 SQL Editor 搬資料不受影響
    if tg_op = 'UPDATE' and new.data is not distinct from old.data then return new; end if;
    select seq into s from public.dragon_vault_seq where user_id = new.user_id and char_id = ch;
    begin cur := coalesce((new.data ->> 'vaultSeq')::bigint, 0); exception when others then cur := -1; end;
    if cur <> coalesce(s, 0) then
        raise exception 'vault seq conflict' using errcode = 'P0001', hint = 'dragon_vault_seq';
    end if;
    return new;
end $$;
drop trigger if exists dragon_vault_save_guard on public.dragon_saves;
create trigger dragon_vault_save_guard before insert or update on public.dragon_saves for each row execute function public.dragon_vault_save_guard();

-- 把改好的 player 寫回雲端存檔：序號 +1、t／client_t 換成伺服器時間、重算簽章（內部用，玩家不能直接呼叫）
create or replace function public.dragon_vault_commit(p_slot int, p_player jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare d jsonb; s bigint; t bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
    ch text := (p_player ->> 'created') || '|' || (p_player ->> 'cls');
begin
    insert into public.dragon_vault_seq (user_id, char_id, seq) values (auth.uid(), ch, 1)
        on conflict (user_id, char_id) do update set seq = public.dragon_vault_seq.seq + 1
        returning seq into s;
    select data into d from public.dragon_saves where user_id = auth.uid() and slot = p_slot;
    d := jsonb_set(d, '{player}', p_player) || jsonb_build_object('vaultSeq', s, 't', t);
    if d ? 'sig' then d := d || jsonb_build_object('sig', public.dragon_save_sig(auth.uid(), p_slot, p_player)); end if;
    update public.dragon_saves set data = d, client_t = t where user_id = auth.uid() and slot = p_slot;
    return jsonb_build_object('seq', s, 't', t);
end $$;
revoke execute on function public.dragon_vault_commit(int, jsonb) from public, anon, authenticated;

-- 共同檢查＋鎖住這個角色的雲端存檔
create or replace function public.dragon_vault_row(p_slot int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb;
begin
    if auth.uid() is null then raise exception 'not logged in'; end if;
    if public.dragon_is_banned() then raise exception 'banned'; end if;
    if public.dragon_market_hold(auth.uid()) then raise exception 'market hold' using hint = 'dragon_market_hold'; end if;
    if not public.dragon_save_ok(auth.uid(), p_slot) then raise exception 'save signature' using hint = 'dragon_save_sig'; end if;
    perform pg_advisory_xact_lock(7713100, hashtext(auth.uid()::text));
    select data -> 'player' into p from public.dragon_saves where user_id = auth.uid() and slot = p_slot for update;
    if p is null then raise exception 'no cloud save'; end if;
    if coalesce((p ->> 'gold')::numeric, 0) < 100 then raise exception 'not enough gold'; end if;
    return p;
end $$;
revoke execute on function public.dragon_vault_row(int) from public, anon, authenticated;

-- ═════ 存入：道具（p_uid、p_n）或金幣（p_gold），直接從雲端存檔扣掉（含 100 手續費）═════
create or replace function public.vault_put2(p_slot int, p_uid int, p_n int, p_gold bigint, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_vault_row(p_slot); g numeric := coalesce((p ->> 'gold')::numeric, 0); it jsonb; idx int; have int; item jsonb; r bigint;
begin
    if p_uid is null then
        if p_gold is null or p_gold < 1 or p_gold > 2000000000 then raise exception 'bad amount'; end if;
        if g < p_gold + 100 then raise exception 'not enough gold'; end if;
        p := jsonb_set(p, '{gold}', to_jsonb(g - p_gold - 100));
        insert into public.dragon_vault (user_id, gold) values (auth.uid(), p_gold) on conflict (user_id) do update set gold = public.dragon_vault.gold + p_gold;
        return public.dragon_vault_commit(p_slot, p) || jsonb_build_object('ok', true, 'gold', -(p_gold + 100));
    end if;
    if (select count(*) from public.dragon_vault_items where user_id = auth.uid() and taken_at is null) >= 200 then raise exception 'vault full'; end if;
    select x, (o - 1)::int into it, idx from jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) with ordinality e(x, o) where (x ->> 'uid')::int = p_uid limit 1;
    if it is null then raise exception 'item not in cloud save'; end if;
    if coalesce((it ->> 'ench')::int, 0) > 15 or it ->> 'id' is null then raise exception 'not tradeable'; end if;
    have := greatest(coalesce((it ->> 'n')::int, 1), 1);
    if p_n is null or p_n < 1 or p_n > have then raise exception 'bad amount'; end if;
    if p_n < have then
        p := jsonb_set(p, array['inv', idx::text, 'n'], to_jsonb(have - p_n));
        item := it || jsonb_build_object('n', p_n);
    else
        p := jsonb_set(p, '{inv}', (p -> 'inv') - idx);
        item := it;
    end if;
    p := jsonb_set(p, '{gold}', to_jsonb(g - 100));
    delete from public.dragon_vault_items where user_id = auth.uid() and taken_at < now() - interval '30 days';
    -- 存的是雲端存檔裡的那一件（玩家送來的內容不採用）
    insert into public.dragon_vault_items (user_id, from_slot, uid, item_id, item, name)
        values (auth.uid(), p_slot, p_uid, it ->> 'id', item, left(p_name, 60)) returning id into r;
    return public.dragon_vault_commit(p_slot, p) || jsonb_build_object('ok', true, 'id', r, 'gold', -100, 'uid', p_uid, 'n', p_n);
end $$;
revoke execute on function public.vault_put2(int, int, int, bigint, text) from public, anon;
grant execute on function public.vault_put2(int, int, int, bigint, text) to authenticated;

-- ═════ 取出：道具（p_id）或金幣（p_gold），直接加進雲端存檔（扣 100 手續費）═════
create or replace function public.vault_take2(p_slot int, p_id bigint, p_gold bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p jsonb := public.dragon_vault_row(p_slot); g numeric := coalesce((p ->> 'gold')::numeric, 0); vi public.dragon_vault_items; vg bigint;
    item jsonb; idx int; nu bigint;
begin
    if p_id is null then
        select gold into vg from public.dragon_vault where user_id = auth.uid() for update;
        if p_gold is null or p_gold < 1 or coalesce(vg, 0) < p_gold then raise exception 'bad amount'; end if;
        update public.dragon_vault set gold = gold - p_gold where user_id = auth.uid();
        p := jsonb_set(p, '{gold}', to_jsonb(g + p_gold - 100));
        return public.dragon_vault_commit(p_slot, p) || jsonb_build_object('ok', true, 'gold', p_gold - 100);
    end if;
    select * into vi from public.dragon_vault_items where id = p_id and user_id = auth.uid() and taken_at is null for update;
    if vi.id is null then raise exception 'not available'; end if;
    update public.dragon_vault_items set taken_at = now() where id = p_id;
    item := vi.item;
    -- 可堆疊的道具（沒有 ench 欄位）併進同名那一疊，其他的給新 uid（同 player.js addItem）
    if not (item ? 'ench') then
        select (o - 1)::int into idx from jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) with ordinality e(x, o)
            where x ->> 'id' = item ->> 'id' and not (x ? 'ench') limit 1;
    end if;
    if idx is not null then
        p := jsonb_set(p, array['inv', idx::text, 'n'], to_jsonb(coalesce((p -> 'inv' -> idx ->> 'n')::int, 1) + coalesce((item ->> 'n')::int, 1)));
    else
        nu := coalesce((p ->> 'nextUid')::bigint, 1);
        p := jsonb_set(p, '{inv}', coalesce(p -> 'inv', '[]'::jsonb) || jsonb_build_array(item || jsonb_build_object('uid', nu)));
        p := jsonb_set(p, '{nextUid}', to_jsonb(nu + 1));
    end if;
    p := jsonb_set(p, '{gold}', to_jsonb(g - 100));
    return public.dragon_vault_commit(p_slot, p) || jsonb_build_object('ok', true, 'item', item, 'name', vi.name, 'gold', -100);
end $$;
revoke execute on function public.vault_take2(int, bigint, bigint) from public, anon;
grant execute on function public.vault_take2(int, bigint, bigint) to authenticated;

-- ═════ 舊版停用 ═════
create or replace function public.vault_put(p_slot int, p_item jsonb, p_gold bigint, p_name text) returns json
language plpgsql security definer set search_path = '' as $$
begin raise exception 'vault client outdated' using hint = 'dragon_vault_old'; end $$;
create or replace function public.vault_take(p_slot int, p_id bigint, p_gold bigint) returns json
language plpgsql security definer set search_path = '' as $$
begin raise exception 'vault client outdated' using hint = 'dragon_vault_old'; end $$;
