-- 黑暗大陸：刪除共用倉庫複製出來的道具（2026-10-24，ARCHITECTURE.md 第 120 節）。管理者在 Supabase SQL Editor 執行。
-- 判斷：存進共用倉庫（30 天內、不可堆疊的裝備／地圖）的那一件，原編號（uid＋道具代號）又出現在同一角色欄位的背包或倉庫裡＝複製出來的。
--   存進去的那件已被伺服器從存檔拿掉；取出時會拿到新編號，所以原編號再出現一定是多出來的。角色是存入之後才建立的（同欄位刪掉重建）不算。
-- 做法：先備份整份存檔到 dragon_fix_backup，再從背包／倉庫移除，存取序號 +1、重算簽章。
--   序號 +1 讓玩家還開著的遊戲上傳被拒、自動改用雲端進度，不會再把複製品傳回來。
-- 用法：把兩處 'alen1144@yahoo.com.tw' 換成要處理的帳號。先跑 ① 預覽，確認後再跑 ②。

-- ① 預覽（只讀）：會刪掉哪些
select s.slot + 1 as 欄位, s.name as 角色, vi.id as 倉庫編號, vi.uid, vi.item_id, x ->> 'nm' as 名稱, x -> 'mm' as 詞綴, vi.put_at as 存入時間, vi.taken_at as 取出時間
from public.dragon_saves s
join auth.users u on u.id = s.user_id
join public.dragon_vault_items vi on vi.user_id = s.user_id and vi.from_slot = s.slot and vi.item ? 'ench' and vi.put_at > now() - interval '30 days'
    and vi.put_at > to_timestamp((s.data -> 'player' ->> 'created')::bigint / 1000.0)
cross join lateral jsonb_array_elements(coalesce(s.data -> 'player' -> 'inv', '[]'::jsonb) || coalesce(s.data -> 'player' -> 'storage', '[]'::jsonb)) x
where u.email = 'alen1144@yahoo.com.tw' and (x ->> 'uid')::int = vi.uid and x ->> 'id' = vi.item_id
order by s.slot, vi.id;

-- ② 刪除（會改存檔；執行後在 Messages 看每個欄位刪了幾件）
create table if not exists public.dragon_fix_backup (at timestamptz not null default now(), user_id uuid not null, slot smallint not null, data jsonb not null, note text);
alter table public.dragon_fix_backup enable row level security;
revoke all on public.dragon_fix_backup from anon, authenticated;

do $$
declare v_email text := 'alen1144@yahoo.com.tw'; v_user uuid; r record; p jsonb; bad jsonb; n_before int; n_after int; ch text; v_seq bigint; t bigint;
begin
    select id into v_user from auth.users where email = v_email;
    if v_user is null then raise exception '找不到帳號 %', v_email; end if;
    for r in select slot, data from public.dragon_saves where user_id = v_user order by slot for update loop
        p := r.data -> 'player';
        -- 這個欄位所有複製品的 uid|道具代號
        select coalesce(jsonb_agg(vi.uid || '|' || vi.item_id), '[]'::jsonb) into bad
        from public.dragon_vault_items vi
        where vi.user_id = v_user and vi.from_slot = r.slot and vi.item ? 'ench' and vi.put_at > now() - interval '30 days'
          and vi.put_at > to_timestamp((p ->> 'created')::bigint / 1000.0);
        n_before := jsonb_array_length(coalesce(p -> 'inv', '[]'::jsonb)) + jsonb_array_length(coalesce(p -> 'storage', '[]'::jsonb));
        p := jsonb_set(p, '{inv}', coalesce((select jsonb_agg(x order by o) from jsonb_array_elements(coalesce(p -> 'inv', '[]'::jsonb)) with ordinality e(x, o)
                                             where not bad ? ((x ->> 'uid') || '|' || (x ->> 'id'))), '[]'::jsonb));
        p := jsonb_set(p, '{storage}', coalesce((select jsonb_agg(x order by o) from jsonb_array_elements(coalesce(p -> 'storage', '[]'::jsonb)) with ordinality e(x, o)
                                                 where not bad ? ((x ->> 'uid') || '|' || (x ->> 'id'))), '[]'::jsonb));
        n_after := jsonb_array_length(p -> 'inv') + jsonb_array_length(p -> 'storage');
        if n_after = n_before then continue; end if;
        insert into public.dragon_fix_backup (user_id, slot, data, note) values (v_user, r.slot, r.data, '刪除共用倉庫複製品前的備份');
        ch := (p ->> 'created') || '|' || (p ->> 'cls');
        insert into public.dragon_vault_seq (user_id, char_id, seq) values (v_user, ch, 1)
            on conflict (user_id, char_id) do update set seq = public.dragon_vault_seq.seq + 1 returning dragon_vault_seq.seq into v_seq;
        t := (extract(epoch from clock_timestamp()) * 1000)::bigint;
        update public.dragon_saves
            set data = jsonb_set(r.data, '{player}', p) || jsonb_build_object('vaultSeq', v_seq, 't', t)
                       || case when r.data ? 'sig' then jsonb_build_object('sig', public.dragon_save_sig(v_user, r.slot, p)) else '{}'::jsonb end,
                client_t = t
            where user_id = v_user and slot = r.slot;
        raise notice '欄位 %「%」：刪除 % 件複製品', r.slot + 1, p ->> 'name', n_before - n_after;
    end loop;
end $$;
