-- 屠龍勇者：洗白（刪檔）——清除測試期的伺服器資料（ARCHITECTURE.md 第 37 節）
-- ⚠️ 執行後無法復原！正式上線那天在 Supabase → SQL Editor 貼上整段執行，
--    並同時把 data/config.js 的 WIPE 改成新的 id 與 at（洗白時間），玩家裝置上的舊角色才會一起清掉。
-- 保留：帳號（auth.users）、管理者 dragon_admins、封鎖名單 dragon_bans、帳號 Email 對照 dragon_profiles。
-- 清除：雲端存檔、存檔紀錄與可疑紀錄、團隊副本、聊天與禁言、血盟、世界首領、交易所。
begin;
truncate table
    public.dragon_saves,
    public.dragon_save_log,
    public.dragon_flags,
    public.raid_members,
    public.raid_rooms,
    public.dragon_chat,
    public.dragon_mutes,
    public.dragon_clan_apps,
    public.dragon_clan_members,
    public.dragon_clans,
    public.dragon_wb_claims,
    public.dragon_wb_hits,
    public.dragon_wb,
    public.dragon_market
    restart identity cascade;
update public.dragon_profiles set last_name = null;
commit;

-- 執行完可用這段確認（每一列都應該是 0）：
-- select 'saves' t, count(*) from public.dragon_saves union all select 'clans', count(*) from public.dragon_clans
-- union all select 'market', count(*) from public.dragon_market union all select 'chat', count(*) from public.dragon_chat;
