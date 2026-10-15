-- 黑暗大陸：擋掉舊版遊戲的存檔上傳（2026-10-15，ARCHITECTURE.md 第 29 節「刪除角色」）
-- 問題：裝成 App 沒更新的手機還在跑沒有「角色歸屬」的舊版（存檔格式 schema 3 以前），換帳號登入時會把別人的角色傳進目前的帳號。
-- 做法：dragon_saves 寫入前檢查 data.schema，小於 4 就拒絕（hint dragon_client_old）。新版遊戲上傳時一律帶目前的 SAVE_SCHEMA。
-- 只擋玩家端（authenticated）的寫入；管理者在 SQL Editor 搬資料（例如改 user_id）不受影響。只有存檔內容有變才檢查。可重複執行。
-- ⚠️ 要等新版遊戲（20261015a 以後）發佈上線後再執行，不然還沒更新的玩家會暫時上傳失敗（本機進度不會遺失，更新後自動補傳）。
create or replace function public.dragon_saves_client_version() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_schema int;
begin
    if coalesce(auth.role(), '') <> 'authenticated' then return new; end if;
    if tg_op = 'UPDATE' and new.data is not distinct from old.data then return new; end if;
    begin v_schema := (new.data ->> 'schema')::int; exception when others then v_schema := null; end;
    if coalesce(v_schema, 0) < 4 then
        raise exception 'client too old' using errcode = 'P0001', hint = 'dragon_client_old';
    end if;
    return new;
end $$;
drop trigger if exists dragon_saves_client_version on public.dragon_saves;
create trigger dragon_saves_client_version before insert or update on public.dragon_saves for each row execute function public.dragon_saves_client_version();
