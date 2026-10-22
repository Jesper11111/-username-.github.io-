-- 黑暗大陸：能力值超過上限的存檔拒收（2026-10-23，ARCHITECTURE.md 第 94 節）。接在 supabase.sql 之後執行；可重複執行。
-- 問題：dragon_saves_audit 發現能力值 > 40 只記一筆「能力值超過上限」（stat），存檔照收；雲端簽章（anticheat.sql）也不含能力值，
--   所以改了能力值的存檔仍能上傳、用來打怪拿後端掉寶。（2026-10-22 管理頁出現 Lv.1 六項都 99 的角色）
-- 做法：玩家（authenticated）上傳的存檔，player.stats 任一項 > 40、不是數字、或六項缺了任何一項都拒收（hint dragon_stat_cap）。
--   正常玩法單項最高 35（config.js STAT_CAP，加點與萬能藥都受它限制），40 是保留的寬限。管理者在 SQL Editor 改資料不受影響。
--   存檔內容沒變的更新（只改 name 等）不檢查；已經在雲端的舊存檔不會被刪，只是之後上傳不了。被拒收的上傳整筆取消，所以不會再新增 stat 紀錄（之前記的保留）。
create or replace function public.dragon_saves_stat_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
declare st jsonb := new.data -> 'player' -> 'stats'; bad boolean;
begin
    if coalesce(auth.role(), '') <> 'authenticated' then return new; end if;
    if tg_op = 'UPDATE' and new.data is not distinct from old.data then return new; end if;
    if st is null or jsonb_typeof(st) <> 'object' then
        bad := true;
    else
        select bool_or(jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric > 40 or (v #>> '{}')::numeric < 0)
               or count(*) filter (where k in ('str', 'dex', 'con', 'int', 'wis', 'cha')) <> 6
          into bad from jsonb_each(st) e(k, v);
    end if;
    if coalesce(bad, true) then
        raise exception 'stat cap exceeded' using errcode = 'P0001', hint = 'dragon_stat_cap';
    end if;
    return new;
end $$;
revoke execute on function public.dragon_saves_stat_cap() from public, anon, authenticated;
drop trigger if exists dragon_saves_stat_cap on public.dragon_saves;
create trigger dragon_saves_stat_cap before insert or update on public.dragon_saves for each row execute function public.dragon_saves_stat_cap();
