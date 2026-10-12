-- 黑暗大陸：登出所有裝置立即生效（2026-10-12，ARCHITECTURE.md 第 29 節「登入安全」）
-- 問題：「登出所有裝置」或刪除 auth.sessions 之後，別人手上的 access token（JWT）還能用到過期（最多 1 小時），期間仍可上傳存檔。
-- 做法：dragon_is_banned() 多檢查「這個 JWT 的 session 還在不在」。session 被刪掉（登出所有裝置、在後台刪除）→ 視同停權：
--       存檔、團隊副本、聊天、倉庫、鑽石等所有用到 dragon_is_banned() 的寫入立刻被拒絕。可重複執行。
create or replace function public.dragon_is_banned() returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.dragon_bans b where b.user_id = auth.uid())
        or (coalesce(auth.jwt() ->> 'session_id', '') <> ''
            and not exists (select 1 from auth.sessions s where s.id::text = auth.jwt() ->> 'session_id'));
$$;
