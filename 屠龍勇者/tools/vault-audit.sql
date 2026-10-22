-- 黑暗大陸：共用倉庫查帳（只讀，不修改任何資料；2026-10-23，ARCHITECTURE.md 第 93 節）。貼到 Supabase SQL Editor 執行，三段可分開跑。

-- ① 現在還在共用倉庫裡、但原角色雲端存檔也有同一件（同 uid＋同道具）的：v1 漏洞複製出來的那一份還在
select u.email, vi.id as vault_id, vi.from_slot + 1 as 欄位, vi.name, vi.item_id, vi.uid, vi.put_at
from public.dragon_vault_items vi
join public.dragon_saves s on s.user_id = vi.user_id and s.slot = vi.from_slot
left join auth.users u on u.id = vi.user_id
where vi.taken_at is null
  and exists (select 1 from jsonb_array_elements(coalesce(s.data -> 'player' -> 'inv', '[]'::jsonb) || coalesce(s.data -> 'player' -> 'storage', '[]'::jsonb)) x
              where (x ->> 'uid')::int = vi.uid and x ->> 'id' = vi.item_id)
order by vi.put_at desc;

-- ② 倉庫金幣比帳號所有角色身上的金幣加起來還多的帳號（金幣存入沒有紀錄，只能用這個找可疑的）
select u.email, v.gold as 倉庫金幣, coalesce(sum((s.data -> 'player' ->> 'gold')::numeric), 0) as 角色金幣合計,
       count(s.slot) as 角色數, max(s.lv) as 最高等級
from public.dragon_vault v
left join public.dragon_saves s on s.user_id = v.user_id
left join auth.users u on u.id = v.user_id
group by u.email, v.gold
having v.gold > greatest(coalesce(sum((s.data -> 'player' ->> 'gold')::numeric), 0), 100000)
order by v.gold desc;

-- ③ 管理頁記過的「共用倉庫疑似複製道具」
select f.at, f.email, f.slot + 1 as 欄位, f.name, f.lv, f.detail, f.resolved
from public.dragon_flags f
where f.kind = 'vault_dupe'
order by f.at desc;
