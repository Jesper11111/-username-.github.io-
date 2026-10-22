-- 屠龍勇者：洗白（刪檔）——清除測試期的伺服器資料（ARCHITECTURE.md 第 37 節）
-- ⚠️ 執行後無法復原！正式上線那天在 Supabase → SQL Editor 貼上整段執行，
--    並同時把 data/config.js 的 WIPE 改成新的 id 與 at（洗白時間），玩家裝置上的舊角色才會一起清掉。
-- 保留：帳號（auth.users）、管理者 dragon_admins、封鎖名單 dragon_bans、帳號 Email 對照 dragon_profiles。
-- 清除：雲端存檔、存檔紀錄與可疑紀錄、團隊副本、聊天與禁言、血盟、世界首領、交易所。
-- 2026-10-22 使用者確認全部清空：另含鑽石／每日及掉落計數／鑽石紀錄、共用倉庫金幣／道具／待交貨、
-- 後端掉寶憑證／獎勵／收據、裝置紀錄、刪角紀錄及在線狀態。
-- 保留掉寶規則、歷史規則與啟用設定，不必重裝server-loot-install.sql。
-- 必須安排停機，所有玩家關閉遊戲；先備份資料庫。同步發布新的WIPE.id／at及版本號後才恢復遊戲。
-- 只執行本SQL不能阻止仍開著的舊客戶端上傳角色；不要在遊戲開放中直接執行。
-- 清除錢包後，下次登入仍會依現有規則發放每日5顆；不是保留舊鑽石。
begin;
-- 各時期安裝的附加功能不同，只處理固定清單內實際存在的資料表。
-- 不捕捉其他SQL錯誤；未列明的外鍵或權限問題仍會讓整筆交易回滾。
do $$
declare
    table_name text;
    targets text[] := array[]::text[];
begin
    if to_regclass('public.dragon_saves') is null then
        raise exception '找不到核心角色表dragon_saves，請確認專案正確';
    end if;
    foreach table_name in array array[
        'dragon_saves', 'dragon_save_log', 'dragon_flags',
        'raid_members', 'raid_rooms', 'dragon_chat', 'dragon_mutes',
        'dragon_clan_apps', 'dragon_clan_members', 'dragon_clans',
        'dragon_wb_claims', 'dragon_wb_hits', 'dragon_wb', 'dragon_market',
        'dragon_wallet', 'dragon_dia_log', 'dragon_vault',
        'dragon_vault_items', 'dragon_vault_out',
        'dragon_loot_jobs', 'dragon_loot_state',
        'dragon_save_dev', 'dragon_deleted_chars', 'dragon_online'
    ] loop
        if to_regclass(format('public.%I', table_name)) is not null then
            targets := array_append(targets, format('public.%I', table_name));
        else
            raise notice '略過未安裝的資料表：public.%', table_name;
        end if;
    end loop;
    execute 'truncate table ' || array_to_string(targets, ', ') || ' restart identity restrict';
end $$;
update public.dragon_profiles set last_name = null;
commit;

-- 執行完可用這段確認（每一列都應該是 0）：
-- select 'saves' t, count(*) from public.dragon_saves union all select 'clans', count(*) from public.dragon_clans
-- union all select 'market', count(*) from public.dragon_market union all select 'chat', count(*) from public.dragon_chat;
-- select 'wallet' t, count(*) from public.dragon_wallet union all select 'vault', count(*) from public.dragon_vault
-- union all select 'vault_items', count(*) from public.dragon_vault_items union all select 'vault_pending', count(*) from public.dragon_vault_out
-- union all select 'loot_jobs', count(*) from public.dragon_loot_jobs union all select 'loot_state', count(*) from public.dragon_loot_state;
