# 線上後端掉寶 v1：安裝、驗證與啟用

2026-10-22，遊戲版本20261022t。使用者已確認「先搬線上打怪、首領與副本；離線掛機另議」，並授權製作SQL及遊戲串接。正式SQL已由使用者安裝；loot_status截圖確認rules=20261022t-49fc938899d3、enabled=false、protocol=1。目前未啟用；前端已隨20261022w推上main，剩第3步啟用與第4步實玩驗證。

## 使用者要做的部署步驟

1. 在Supabase SQL Editor開新查詢，貼上 **tools/server-loot-install.sql整份**執行。它包含migration及433道具／78怪物／19地區／100塔層／12職業任務／6副本規則快照。安裝是同一筆交易、可重跑，不刪現有角色或物品，**初次安裝預設不啟用**。
2. 回報SQL執行成功，先在localhost:8790以測試角色驗證登入、雲端同步與一般介面。依AGENTS.md由使用者驗收後才commit，使用者在GitHub Desktop按Push origin，等待新版t部署。
3. 確認新版程式已上線、所有玩家更新後，在SQL Editor執行：

```sql
update public.dragon_loot_config set enabled = true where id = 1;
select public.loot_status();
```

4. 重新整理遊戲並登入，以少量測試角色驗證一般地區、永夜之塔、異界首領、團隊副本及世界首領。驗證登入資格、掉落紀錄、品質／詞綴、負重、自動賣出、重新整理與重複領取。

SQL必須最後接在既有supabase.sql／anticheat.sql之後執行；後續若重跑舊supabase.sql或vault.sql，需重跑此安裝檔，避免舊dia_drop／wb_claim覆蓋新保護。安裝檔重跑保留既有enabled；更新規則前應先規劃維護窗口，不能以刪除資料表方式更新。

## 現在的分工

- 後端發出遇怪憑證、選怪／首領／精英資格，並產生一般掉寶、材料、通貨、技能書、隨機裝備品質及詞綴、異界地圖／通關地圖、任務收集物。鑽石掉落的擲骰也移到後端，沿用既有錢包與每日上限。
- 團隊副本核對房間、場次、參加者與角色，再發個人掉落。世界首領名次物品由後端按既有claim結果產生；舊wb_claim在啟用後不能直接領，重複領取被拒，已生成的物品可從pending補領。
- 遊戲端顯示／發動戰鬥，按後端完整物品結果套用負重及戰利品過濾，不再抽品質或詞綴。自動賣出仍用既有售價公式；金幣、經驗、鍛造、購買與其他背包異動仍沿用原系統。
- 離線掛機仍走SIM_MODE試算，不新增離線道具，不消耗鑽石。使用者現有物品保留。

## 防重領與斷線處理

- `dragon_loot_jobs`帳號＋事件鍵唯一；憑證綁定角色、欄位、地區及規則快照。finish重送回傳同一個結果。掉落先記帳，再交付。
- 每角色後端遞增cursor；前端依序入帳。背包與外層`lootCursor`用一次加密localStorage寫入，失敗則還原整筆。換角色時仍發給原欄位；帳號切換時中斷正在等待的操作。
- 本機重試清單在`dragonSlayer_loot_jobs_<帳號>`，用saveEncode／saveParse；已由後端生成但回應遺失的物品可從loot_pending取得。尚未傳到後端／本機重試紀錄也未成功保存的擊殺，不能承諾補發。
- 雲端存檔外層新增可選`lootProtocol:1`、`lootCursor`，**不新增player欄位，SAVE_SCHEMA仍5**。舊存檔視cursor=0；啟用後trigger拒收舊版協定或回退cursor。遇到進度衝突應使用雲端最新進度，不能手動清除收據。
- `loot_release`只取消自己尚未結算、且非存活怪物或待重試擊殺的舊憑證；重整／換戰鬥後不會被遺留憑證永久佔滿。
- 前端啟動先查loot_status。僅管理者明確未啟用時保留舊流程；RPC缺失、斷線、未登入或協定錯誤都不退回本機掉寶。啟用中的連線失敗會暫停掛機；30秒查狀態，5秒重試佇列。

## 明確限制

這一版是**後端決定掉寶結果**，不是完整的伺服器戰鬥或權威背包。憑證資格、帳號、地區、時間、場次及重領有檢查，但150ms的最低領獎時間與請求限制不能證明每刀傷害確實發生。角色狀態／異界進度／副本結果仍源自客戶端存檔或隊長模擬；惡意修改整套客戶端仍有空間。完整防偽造擊殺、道具或金幣，需要把戰鬥驗證、全部物品來源／消耗／交易一併移到權威後端，不能宣稱本版已做到。

掉寶帳本會隨擊殺增加，啟用前需估算玩家數與Supabase用量；目前沒有自動清除已領帳本，以保留可重試與稽核資料。請觀察資料庫容量與請求量，再決定保留期限與批次結算，不要直接刪未領獎勵。規則快照有版本存檔，更新目錄不會讓已生成憑證重新抽新規則。

## 檔案與測試

- `data/loot.js`：狀態／後端遇怪／持久佇列／原子收據／補領；在pwa後、main前載入。
- `tools/server-loot.sql`：獨立migration；`loot-catalog.json`／`.sql`為資料快照；`server-loot-install.sql`為給使用者的一份安裝檔。
- `node tools/export-loot-catalog.js`：從當前正式資料產生三個快照／安裝檔，固定亂數種子並加資料hash；掉率、道具或怪物規則變更後要重新產生及部署。不要手動改產生檔。
- `node tools/test-server-loot-db.js`：隔離PGlite(PostgreSQL)測試RPC、權限、重試、角色、收據、78怪物、詞綴、副本及世界首領。
- `node tools/test-server-loot-integration.js`：載入現有supabase.sql＋anticheat.sql，再重複安裝掉寶migration，驗證真實簽章trigger／RLS相容。
- `node tools/test-server-loot-client.js`：記憶體存檔／假RPC驗證遊戲串接、非當前角色、寫入失敗、重領、斷線、等待期間換帳號、手動點怪綁定、SIM隔離。
- PGlite只供本機測試：`npm install --prefix "$env:TEMP/dark-loot-test-runtime" --no-save @electric-sql/pglite`；可用LOOT_TEST_RUNTIME指定套件路徑，不是遊戲依賴。
- `tools/server-loot-preview.html`：瀏覽器隔離檢查頁，在載入遊戲前以記憶體storage取代本頁localStorage，模擬後端結果，完全不讀寫真實角色、不連正式服務。資料庫行為另由上述真實PostgreSQL測試驗證。

函式權限與空search_path設計參考[Supabase官方Database Functions](https://supabase.com/docs/guides/database/functions)。
