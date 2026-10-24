-- 黑暗大陸：後端掉寶紀錄每日自動清理（2026-10-24，ARCHITECTURE.md 第 116 節）。接在 loot-batch.sql 之後執行；可重複執行。
-- 起因：loot-batch.sql 只在玩家自己批次結算時順手清「自己帳號」最多 200 筆，不再上線的玩家與舊版遺留的憑證永遠不會清。
-- 使用者 2026-10-24 同意：先一次清掉全部，之後用 pg_cron 每天清一次全部玩家（Supabase 已升 Pro）。
-- 保留規則與 loot-batch.sql 相同：
--   收據／已結算帳本：已確認入帳（cursor ≤ acknowledged）且超過 3 天才刪；還沒確認的不刪。
--   作廢憑證超過 1 小時、超過 12 小時沒結算的憑證：刪。

create or replace function public.loot_cleanup_all() returns jsonb language plpgsql security definer set search_path='' as $$
declare r int;j int;
begin
 delete from public.dragon_loot_receipts x using public.dragon_loot_state st
  where st.user_id=x.user_id and st.char_id=x.char_id and x.cursor<=st.acknowledged and x.created_at<now()-interval '3 days';
 get diagnostics r=row_count;
 delete from public.dragon_loot_jobs x where
  (x.result is null and x.context ? 'cancelled' and x.created_at<now()-interval '1 hour')
  or (x.result is null and x.created_at<now()-interval '12 hours')
  or (x.result is not null and x.created_at<now()-interval '3 days' and x.cursor<=coalesce((select st.acknowledged from public.dragon_loot_state st where st.user_id=x.user_id and st.char_id=x.char_id),0));
 get diagnostics j=row_count;
 return jsonb_build_object('receipts',r,'jobs',j);
end $$;
revoke all on function public.loot_cleanup_all() from public,anon,authenticated;

-- ① 一次性：馬上清一次，結果會顯示刪了幾筆
select public.loot_cleanup_all() as 本次清除;

-- ② 每天台灣時間凌晨 3:17（UTC 19:17）自動清一次；重跑這份會先移除舊排程再建立
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname='dragon-loot-cleanup';
select cron.schedule('dragon-loot-cleanup','17 19 * * *','select public.loot_cleanup_all()');
