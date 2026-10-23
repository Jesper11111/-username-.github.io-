# 黑暗大陸：交接文件（目前進度與待辦）

給接手的 AI：先讀 `AGENTS.md`（規則），再讀這份（現況）。技術細節在 `ARCHITECTURE.md`。
**這份要保持最新**：完成一件事、新增待辦、使用者做了新決定，都要回來改。最後更新：2026-10-22（Codex）。

## 1. 現況

- **20261023n：關閉緊急開關、恢復後端掉寶批次結算（第 107 節）——已上線（2026-10-23，使用者確認 Disk IO balance 回升後推送）**。loot-batch.sql 已執行；API 卡住靠「Restart project」整個重啟後恢復（Fast database reboot 不會重啟 API）。建議 Disk IO balance 回升後再推。

- **20261023m：回收頁勾選賣出（第 106 節）**。使用者要求；每列勾選框、全選、「賣出勾選（N）💰合計」，含貴重道具會提醒。瀏覽器實測通過；已 commit 本機 main 待 Push。緊急開關仍開著（l 版起）。

- **20261023l：緊急開關 LOOT_FORCE_LOCAL = true（第 105 節）——已 commit 待 Push**。Supabase 卡死期間先用一般掉寶讓玩家能掛機（瀏覽器實測可掛機、無 loot RPC）。待辦已完成（n 版改回 false，見第 107 節）。開啟期間後端掉寶防作弊不生效。

- **20261023k：後端掉寶減量（第 104 節）——待 Supabase 恢復後執行 tools/loot-batch.sql；遊戲可先 Push（伺服器沒有批次函式時自動逐張結算）**。使用者同意 10 隻或 30 秒批次結算、已確認收據保留 3 天、不用 pg_cron。新收據表＋loot_finish_batch、釋放不重寫作廢憑證、每次結算順手清理；遊戲端擊殺排隊、同次掛機只釋放一次。test-loot-batch、test-server-loot-client、test-vault-v2-client（真實遊戲接 PGlite）與全部回歸、check.ps1、建置通過；已 commit 本機 main。緊急開關 LOOT_FORCE_LOCAL 仍是 false。

- **20261023j：後端掉寶停用自動改一般掉寶＋緊急開關 LOOT_FORCE_LOCAL（第 103 節）**。i 版後 Supabase 又卡死，玩家無法掛機。現在 enabled=false 不用重新整理就改一般掉寶；Supabase 完全卡死時可把 loot.js 的 LOOT_FORCE_LOCAL 改 true 推上線（恢復後改回）。測試、check.ps1、建置通過；已 commit 本機 main 待 Push。後端掉寶減量設計（第 103 節之後）待使用者決定，要等減量做完再重新啟用比較安全。

- **20261023i：伺服器忙碌退避（第 102 節）**。正式專案 10/23 晚卡死（Disk IO 用完、DB 錯誤 67.6%、Log Ingestion 1.01/1 GB 超量），使用者重啟後 20 分鐘才慢慢恢復。遊戲加全域退避（逾時/503/504/PGRST002 等 → 10 秒起倍增、最多 5 分鐘、成功即恢復），上傳、掉寶、聊天、心跳、交易所、副本、世界首領都遵守；被伺服器拒收的角色 10 分鐘內不重傳（減少錯誤紀錄）。測試、check.ps1、建置、瀏覽器載入通過；已 commit 本機 main 待 Push。長期：後端掉寶寫入量與帳本清理、或升級方案，待使用者決定。

- **save-log-throttle.sql：減少上傳寫入（第 101 節）——2026-10-23 使用者已在 Supabase 執行成功**。主控台警告 Disk IO Budget 快用完、DATABASE 錯誤率 67.6%、慢查詢 97 筆（明細待使用者截圖）。存檔歷程／最後上線改約 5 分鐘一筆、裝置紀錄同裝置 10 分鐘一筆，異常照樣每次記。test-save-log-throttle 通過；不改遊戲 JS。重跑 supabase.sql／save-device-log.sql 後要再跑這份。後端掉寶帳本仍無清理，待規劃。

- **20261023h：後端掉寶不再每隻怪都上傳整份存檔（第 100 節）**。使用者轉來分析：lootSpawn 每隻怪強制上傳、lootPump 每筆先上傳，免費 Supabase CPU 撐不住，造成逾時／衝突／掛機停止（96～99 節是症狀）。改成只有生怪資格欄位（等級、地圖、塔、冷卻、異界地圖、任務）變了才上傳，結算不上傳。測試、check.ps1、建置通過；已 commit 本機 main 待 Push。上線後請使用者看 Supabase Reports 的 CPU／API 請求量是否下降；可再減量：存檔歷程／裝置紀錄改成幾分鐘一筆。

- **20261023g：離開畫面回來掛機停止（第 99 節）**。f 版後使用者回報掛機會停、出現「後端掉寶連線尚未就緒」。lootProbe／lootSpawn／huntTick 遇到網路暫斷都直接 stopHunt；改成暫停、自動重試（查狀態 5 秒、找怪 3 秒），恢復後自動繼續，仍不改用本機抽獎；非網路錯誤照舊停止。test-server-loot-client 加情境，全部回歸、check.ps1、建置通過；已 commit 本機 main 待 Push，待手機實測（f 版的進度衝突修正也一起）。

- **20261023f：縮小回來仍跳進度衝突（第 98 節）**。e 版上線後使用者回報離開畫面一下仍跳衝突＋「連不上雲端伺服器」。原因是確認「是不是自己送的」那次讀取在網路未恢復時失敗，被當成衝突；改成讀不到就下次再傳、不判定衝突；掉寶網路錯誤 60 秒內不提示。端到端測試加情境，全部回歸、check.ps1、建置通過；已 commit 本機 main 待 Push，待手機實測。

- **20261023e：共用倉庫領不出來／還沒上傳完成（第 97 節）**。vaultOp、lootPump 原本要求所有角色欄位都上傳成功，別的角色卡住就擋住目前角色；改用 cloudSyncedSlot 只看目前那格，自動重試一次並在提示附上原因。端到端測試加「別的角色被拒收」情境，全部回歸、check.ps1、建置通過；已上線，使用者實測共用倉庫領得出來（2026-10-23）。

- **20261023d：縮小後誤報進度衝突／尚未同步（第 96 節）**。使用者回報玩家縮小後跳「雲端存檔尚未同步」或「進度衝突」。原因是背景上傳已寫進雲端但回應沒收到，cloudKnown 還是舊值。cloud.js 記下這台送過的 client_t，對不上時先確認是不是自己送的再決定要不要跳衝突；lootPump 連續 60 秒失敗才提示。端到端測試加回應丟失情境、全部回歸與 check.ps1 通過；已 commit 本機 main 待 Push，待使用者手機實測。

- **20261023b：能力值超過上限拒收（第 94 節）——SQL 已由使用者執行（2026-10-23），20261023c 已上線**。起因：管理頁 Lv.1 六項 99（a0926931545@gmail.com），雲端簽章不含能力值。新 BEFORE trigger：玩家上傳 stats 任一 >40／非數字／缺欄位就拒收；cloudErrText 加提示。test-stat-cap 與 test-vault-v2-client（加裝 stat-cap）通過、check.ps1 通過。SQL 與遊戲沒有先後限制；已 commit 本機 main 待 Push。該帳號已由使用者在 gm.html 封鎖（2026-10-23）；不要把它的 stat 紀錄按已處理。
- **20261023c：交易所防複製 v2（第 95 節）——stat-cap.sql、market-v2.sql 已由使用者執行成功（2026-10-23），遊戲 20261023c 已上線，使用者實測上架／下架／購買正常**。隔離資料庫重現 v1 三漏洞：① market_list 照收玩家送來的道具內容（可偽造 +15 傳說）② 上架不扣存檔、下架又還給玩家（10 瓶上下架 3 輪拿回 30 瓶）③ market_buy 只檢查買家金幣不扣（1000 金幣連買兩件，賣家憑空入帳 1900）。使用者同意比照第 93 節：market_list2／market_cancel2／market_buy2 直接改雲端存檔＋共用 vaultSeq，舊三個 RPC 停用；market.js 改用 vaultOp。test-market-v2、test-vault-v2-client（含交易所）、全部回歸、check.ps1、混淆建置通過。**順序：market-v2.sql 要在新版遊戲上線前執行**（反過來新版找不到 market_list2）。已 commit 本機 main。

- **20261023a：共用倉庫防複製 v2（第 93 節）——SQL 已由使用者在 Supabase 執行成功（2026-10-23），遊戲 20261023a 已推上線，使用者實測共用倉庫存取正常**。使用者要求檢查倉庫複製（管理頁已有 vault_dupe +8 雙刀），選「伺服器存入時直接扣雲端存檔＋舊存檔不能蓋回」。新 tools/vault-v2.sql（vault_put2／vault_take2 直接改雲端存檔、dragon_vault_seq＋上傳守衛、停用舊 vault_put／vault_take）、vault.js／cloud.js／save.js 改用新流程、存檔外層 vaultSeq。只讀查帳 tools/vault-audit.sql。test-vault-v2（PGlite）與 test-vault-v2-client（真實遊戲＋PGlite 端到端）通過、既有回歸與 check.ps1 通過、混淆建置通過。**部署順序：使用者先在 Supabase 執行 vault-v2.sql，再 commit／Push 遊戲**（反過來的話新版找不到 vault_put2，共用倉庫暫時不能用）。待辦：wipe.sql 補 dragon_vault_seq、交易所 market_list 同樣只檢查不扣除。

- **20261022z：子彈改 2 金幣＝5 發**（銀子彈同比例；每 100 個：箭 10、銀箭 40、子彈 40、銀子彈 100）。y 版未推，z 一起推。
- **20261022y：彈藥每次 100 個一單位＋降價**（第 92 節；x 版沒推，直接併入 y）。使用者要求：箭 1 元＝10 支、子彈 1 元＝5 發（z 版已改），銀箭／銀子彈同比例。town.js 新增 shopUnit／shopCost／shopPriceText，彈藥快捷鍵 ×100／×1000／×10000，自訂數量須為 100 倍數。回收價：銀箭由 1 變 0（箭／子彈原本就 0）。test-shop-buy.js 與 check.ps1 通過、瀏覽器確認；已 commit 到本機 main，待使用者 Push 與線上 Ctrl+F5 確認。

- **2026-10-22 狀態校正（Claude）**：t～w 版程式都已 commit 並推上 origin/main（線上 20261022w，含 data/loot.js）；下面 t／u／v／w 條目寫的「未commit／待Push」已過時。**後端掉寶已於 2026-10-22 由使用者啟用**（loot_status 截圖：rules=20261022t-49fc930899d3、enabled=true、protocol=1）。待使用者線上少量角色實玩驗證（tools/SERVER-LOOT.md 第 4 步）；出問題可執行 `update public.dragon_loot_config set enabled = false where id = 1;` 暫停回舊流程。t 以前的舊版客戶端會被擋上傳。**啟用後實玩出現「掉寶結算待重試：function public.dragon_save_ok(uuid, integer) does not exist」**：正式庫從沒執行過 tools/anticheat.sql（第 60 節待辦），loot_player 依賴它的 dragon_save_ok。已請使用者在 SQL Editor 整份執行 anticheat.sql（可重跑；vault_put 與 vault.sql 相同只多兩道檢查，整合測試 test-server-loot-integration 重跑通過），使用者執行後回報掉寶恢復正常（2026-10-22）。其餘地區／首領／副本／世界首領仍可再觀察。

- **本機待驗收20261022w：變形卷軸暫停商店購買**。使用者指定先無法購買；shopItemIds排除polyScroll，所有村莊商店不列出，buyItem／openShopBuy與自訂購買沿用同一檢查。已有卷軸照常使用，原定價／回收價／交易所不改，不改schema或正式SQL。index.html所有?v=與GAME_VERSION更新w；待使用者Ctrl+F5確認商店卷軸分類後提交／請Push。

- **本機待驗收20261022v：出生金幣2,000**。使用者指定玩家出生金幣2000，createPlayer由300改為2000，十二職業共用；既有角色不補發、不改schema。index.html所有?v=與GAME_VERSION更新v，保留u版公告移除。待使用者Ctrl+F5新建角色確認後提交／請Push。

- **本機待驗收20261022u：移除封測公告**。使用者截圖要求移除「封測中：正式上線時會刪除所有角色與資料（帳號保留）」。config.js的TEST_NOTICE設空，沿用showTitle隱藏公告；index.html所有?v=與GAME_VERSION更新u。沒有啟動WIPE或改動存檔／正式資料庫。待使用者Ctrl+F5確認標題畫面無公告後才提交與請Push。

- **洗白缺表錯誤已修正、待重新安排執行**：使用者截圖回報42P01 public.dragon_save_dev不存在，前次交易未完成；不能當作正式洗白成功。tools/wipe.sql現在固定24表白名單、to_regclass只收集存在的附加表並NOTICE略過缺表，同次TRUNCATE RESTRICT保持原子性；缺核心dragon_saves或其他錯誤仍拒絕。隔離測試新增缺三附加表可清除、清單外外鍵使整筆回滾皆通過。WIPE.id仍未啟動；勿讓使用者以為SQL成功就完成本機舊角色清除，仍須配合停機與新版發布。

- **2026-10-22 使用者確認t版本機實玩「沒有問題」；洗白範圍明確選「全部清空」**。已授權補齊tools/wipe.sql，新增鑽石／紀錄／共用倉庫金幣道具及待交貨、後端掉寶憑證收據、裝置／刪角／在線紀錄，合計24張玩家資料表；保留帳號、管理者、封鎖、profiles（清last_name）與掉寶規則／啟用設定。RESTRICT拒絕未列明外鍵的意外連帶清除。新test-wipe.cjs在隔離PGlite載正式SQL後驗證重跑及保留／清空／每日5鑽重新起算皆通過。未改遊戲JS，版本仍t；WIPE.id仍空，本次未執行正式刪檔。正式洗白須先停機、關閉所有遊戲、備份，由使用者執行SQL且同步發布新的WIPE.id／at與版本後才恢復開放，避免舊客戶端回傳角色。下次登入每日5鑽仍依既有規則發放。待使用者審閱新程序，未提交本次修改。

- **本機待部署／驗收20261022t：線上後端掉寶**。使用者明確選線上打怪／首領／副本、離線另議，並同意製作SQL及遊戲串接。data/loot.js在pwa後main前；後端發怪物憑證、抽完整物品／品質／詞綴／通貨／技能書／異界地圖與通關圖／任務物，並擲鑽石；副本按場次參加者、世界首領按原claim核對。重試佇列及原子收據外層lootProtocol／lootCursor，不新增player欄位、SAVE_SCHEMA仍5。伺服器目錄433道具／78怪／19區／100塔層／12職業任務／6副本，版本含hash且舊規則留存。離線SIM收益及現有道具不改。
- **t版正式SQL已由使用者安裝**：使用者在Supabase SQL Editor執行tools/server-loot-install.sql，回報Success. No rows returned；再執行loot_status，截圖確認rules=20261022t-49fc930899d3、enabled=false、protocol=1。目前僅安裝、未啟用。待使用者本機登入／雲端同步／一般介面驗收後才commit／Push，待新版上線才執行enabled=true；詳細tools/SERVER-LOOT.md。未commit／Push。未啟用仍沿舊流程；RPC缺失／未登入／斷線不退回本機掉寶。不要先啟用再發布，會擋舊版上傳。
- **t版明確限制**：戰鬥、角色快照、異界進度／團戰模擬與一般背包異動仍由客戶端執行；本版不是完整權威戰鬥／背包，不能宣稱完全防偽造擊殺或道具。帳本目前不自動刪除，正式啟用需觀察Supabase容量／請求量，未領獎勵不能直接清掉。
- **t版本機測試**：test-server-loot-db真實PGlite測權限／角色／重領／收據／78怪與詞綴／團戰／世界首領；test-server-loot-integration載既有supabase.sql＋anticheat.sql再重複安裝migration，真實簽章及RLS相容；test-server-loot-client測寫入失敗復原、換角色／帳號、佇列競態、手動點怪非同步綁定、SIM及不回退本機掉寶，皆通過。PGlite在TEMP/dark-loot-test-runtime，非遊戲依賴。瀏覽器工具頁server-loot-preview使用記憶體storage與模擬RPC，不讀寫真實存檔、不連正式後端。
- **t版最終驗證完成**：合併server-loot-install.sql在現有SQL上重複部署成功；新增三測試、原掉落紀錄／商店購買／傳說裝備／狀態三區／16步態與攻擊回歸通過。check.ps1 ALL CHECKS PASSED（47檔語法／46script／20261022t），git diff --check通過；實際46檔混淆建置433KB成功，產物在TEMP/dark-loot-build-20261022t。瀏覽器模擬後端結果：第一次紅藥+2／稀有劍1／收據1，重送不增加；第二次斷線留待重試1，恢復後紅藥+4／稀有劍2／收據2、待重試0，再重送不增加，Console無error／warn。截圖在本對話server-loot-proof.png。尚需使用者安裝正式SQL與實玩，不可誤稱已正式啟用；未commit／Push。
- **本機待驗收20261022s：16號步態與經典風格單手斬**。使用者指出走路腳步不連續／像滑行，另指定天堂1／經典版死亡騎士攻擊為動作參考。新原創走路三向24格，固定骨盆／同列地面註冊，8×65ms＝520ms，移動速度及循環總長不變；攻擊三向18格，持劍／抬劍／下斬／接觸／收勢／復位，6×80ms＝480ms、縮小巨大刀光，右向兩格另補畫排除跨格斷劍／殘影。只調視覺、不改戰鬥間隔／傷害／能力／消耗／schema或等級測試開關。未使用商業圖片，也非官方逐格或秒數復刻。
- **s版素材及工具**：flame-death-knight-v1保留原圖，新增walk-v2／attack-v2 PNG、42單格、AVIF／contact／獨立manifest；原稿／完整提示詞／prepare.py／registration.json在tools/sprite-src/morph/flame-death-knight-walk-v2及flame-death-knight-attack-v2。MORPHS與SW接兩張新圖；384×320／腳底[192,270]／charH160／drawH48、施法／受傷不變。新tools/flame-death-knight-walk-preview.html及test-flame-death-knight-walk.js，既有morph-preview／test更新六格攻擊。第18.13、88節；本對話flame-death-knight-v2-motion.html試播四動作。
- **s版待實玩**：Ctrl+F5→使用變形卷軸→單手劍→16烈焰死亡騎士，四向走動與打怪，確認腳步銜接及抬劍／下斬／收劍的手感。依AGENTS.md第4節「使用者說沒問題後」才commit；目前未commit／Push。
- **s版驗證完成**：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022s），test-flame-death-knight-walk／test-flame-death-knight-morph／test-buff-groups與git diff --check通過。42格非重複RGBA／透明留邊／圖集逐格對應通過。瀏覽器實際行走從x25到43且八格全出現、停止正常；四向攻擊480ms均觀察0～5格，試播四動作／逐格／播放／左右鏡像正常，Console無error／warn。測試頁加preview查詢避免同次開發的s資源暫存，正式版本仍s。未讀寫真實存檔／上傳雲端；待實玩確認，未commit／Push。
- **本機待驗收20261022r：16烈焰死亡騎士（紅變）**。使用者給16.jpg與三張jfif要求加入卷軸；檔案實際都在桌面「變身人物」。m16原已在單手劍組，本次接MORPHS.flameDeathKnight及專屬36格、SW四圖集。原表缺側面、走路漏劍、背向受傷混正面，內建image_gen重製並修邊緣劍尖。384×320／腳底[192,270]／charH160／drawH48，走4／攻4／施2／傷2，130／140／220／150ms，攻擊560ms；既有等級／能力／卷軸消耗／schema及測試不限等級開關不變。現8種專屬圖、22統一；第18.12、88節。未commit／Push。
- **r版待實玩**：Ctrl+F5→使用變形卷軸→單手劍→16烈焰死亡騎士，確認火焰骷髏／黑甲、走路與四向揮劍有出手、劍尖與披風完整。確認後才commit及請Push origin。
- **r版驗證完成**：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022r）、test-flame-death-knight-morph與test-buff-groups通過，36格RGBA／非重複／透明留邊與圖集逐格對應通過，git diff --check通過。瀏覽器實際卷軸選單列單手劍紅變16，選取扣卷軸／套外觀；四向攻擊560ms、第0～3格均畫出。四動作試播、播放／逐格及左右鏡像正常，兩頁Console無error／warn。補畫右向收劍避免混到隔壁斬擊殘片；九份生成原稿／完整提示詞保存。未讀寫真實存檔或上傳，未commit／Push。
- **本機待驗收20261022q：B款變形卷軸＋狀態三區**。使用者選B紫晶幻化，新增images/icons/items/polyScroll-v2.png並改ITEM_IMG共用入口，舊圖與A／C／D樣品保留。其他三款陣營／軍團卷軸只提用途建議，未新增玩法。技能→道具→臨時固定順序，技能／共鳴藍底、藥水卷軸黃底、負面紅底；使用者明確選原始持續≤30秒歸臨時，長效快到期不搬區。補放／刷新自動重分，技能覆蓋同組藥水後來源也更新，共鳴生效不重複、到期恢復待命。單排可橫滑，沿用setHtmlStable；第90節。未改schema／能力／數值、未commit／Push。
- **q版待實玩**：Ctrl+F5→確認背包／快捷欄變形卷軸為B款→使用長效技能、藥水及短效技能，檢查三區／底色／刷新與到期；手機左右滑查看後段。使用者確認後才commit及請Push origin。
- **q版驗證完成**：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022q）；test-buff-groups與test-item-art通過（433道具），git diff --check通過。瀏覽器實際CSS／buffIconsHtml於PC及390px窄版檢查三區，溢出430px／可視369px、橫滑到60.8px；刷新／快轉40秒／負面示範及共鳴待命更新正常，倒數保留同一img，Console無error／warn。紅底為隔離頁示範，現有遊戲沒有玩家負面狀態來源；未讀寫真實存檔／雲端，未commit／Push。
- **卷軸樣品驗證**：四款透明RGBA／128px縮圖及40px快捷欄對照完成並檢視；check.ps1 ALL CHECKS PASSED（46檔／45script／20261022p），正式圖示未修改。generated-sources.json保留原生成檔位置。未commit／Push。

- **本機待驗收20261022p：04替換新版分鏡**。使用者給4.jpg與4-1／4-2／4-3.jfif；改讀sky-valkyrie-v2，金甲白布／金髮羽冠／多片金翼依提供分鏡，36格（4／4／2／2），內建image_gen去棋盤與格線、修背面射箭後兩格及放箭／收弓。384×320／腳底[192,270]／charH160／drawH48，時間160／140／220／160ms，總長640／560／440／320ms維持原版；MORPHS.skyValkyrie key／m04、能力／等級／schema不變。SW改預載v2，舊v1全保留。新素材images/sprites/morph/sky-valkyrie-v2/；原圖／提示詞／整理腳本tools/sprite-src/morph/sky-valkyrie-v2/；試播valkyrie-v2-motion.html、隔離頁tools/valkyrie-v2-morph-preview.html與test-valkyrie-v2-morph.js；第18.11、88節。未commit／Push。
- **p版待實玩**：Ctrl+F5→變形卷軸→弓手→04蒼穹女武神・艾爾，檢查新造型、走動與四向射箭；確認後才commit及請Push origin。
- **p版驗證完成**：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022p）、test-valkyrie-v2-morph.js通過，36格獨立RGBA／透明留邊／圖集逐格對應通過，v1檔案仍在。瀏覽器四動作切換／播放／逐格與左右鏡像正常；實際卷軸／renderer四向射箭560ms，第0～3格均畫出，背向放箭維持背影；兩頁Console無error／warn。未讀寫真實存檔或雲端，未commit／Push。原8790／8793伺服器已停，本環境HttpListener不支援，改用bundled Python http.server綁127.0.0.1啟動8790（專案）及8793（本對話visualizations），測試成功。

- **本機待驗收20261022o：27裂空魔龍爪皇（紫變）**。使用者給立繪與三張jfif；實際都在桌面「變身人物」，原訊息jfif路徑缺資料夾。分鏡混銀髮人形／持刀與龍頭，依27.jpg龍頭巨爪立繪用內建image_gen補畫三向36格／左鏡像，走路／鋼爪揮擊／施法／受傷。MORPHS.riftDragon與m27.sprite／SW四圖集接入，紫變鋼爪既有能力／等級與測試不限等級開關不變，schema不變。384×320／腳底[192,270]／charH160／drawH48，130／140／220／150ms；第18.10、88節。現7專屬外觀、23統一；素材images/sprites/morph/rift-dragon-v1/，四原圖／提示詞／整理腳本tools/sprite-src/morph/rift-dragon-v1/，試播rift-dragon-motion.html，隔離檢查tools/rift-dragon-morph-preview.html／test-rift-dragon-morph.js。未commit／Push。
- **o版待實玩**：Ctrl+F5→變形卷軸→鋼爪→27裂空魔龍爪皇，走動及四向打怪，確認龍頭、巨爪出手與翼尖／腳底；使用者確認後才commit及請Push origin。
- **使用者再次要求27加入卷軸**：已確認o版MORPH_FORMS有m27／riftDragon、openMorphPicker在鋼爪組列出且有卷軸可選；隔離實測真正morphPick('m27')扣一張並套專屬外觀通過。程式已完成，沒有重複新增或換版；仍是本機o版待實玩、未發布。
- **o版驗證完成**：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022o）、test-rift-dragon-morph.js與git diff --check通過；36格獨立RGBA、透明留邊及圖集逐格對應通過。瀏覽器四動作切換／播放／逐格／鏡像正常，真實卷軸／renderer四向攻擊560ms、第0～3格均畫出，鋼爪出手畫面已留存；兩頁Console無error／warn。未讀寫真實存檔或上傳雲端，未commit／Push。

- **本機待驗收20261022n：10布魯迪卡之影（紫變）**。使用者給10.jpg與三張jfif要求新增變身；原後兩張只有走路為背影，其他動作仍正面，且缺側面。內建image_gen補畫三向36格，雙刀蓄勢／第一刀／交叉斬／收勢，左向鏡像；正式素材images/sprites/morph/brudika-shadow-v1/，四原圖／五份生成PNG／提示詞／整理腳本在tools/sprite-src/morph/brudika-shadow-v1/。384×320／腳底[192,270]／charH160／drawH48，時間130／140／220／150ms。m10接MORPHS.brudikaShadow及SW四圖集，沿用既有能力／等級設定，不改schema。專屬外觀6種，其餘24種統一；第18.9、88節。試播brudika-shadow-motion.html；tools/brudika-morph-preview.html、test-brudika-morph.js隔離檢查，未commit／Push。
- **n版待使用者實玩**：Ctrl+F5→背包使用變形卷軸→雙刀→10布魯迪卡之影，走動及四向打怪，確認雙刀出手、翼尖與腳底；若正常再commit及請使用者Push origin。
- **n版驗證完成**：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022n）、test-brudika-morph.js及git diff --check通過。36格獨立RGBA、透明留邊／圖集逐格比對通過；瀏覽器試播四動作切換／播放／逐格、左右鏡像正常；真實卷軸及renderer四向攻擊560ms，第0～3格均畫出，交叉斬畫面已留存。兩頁Console無error／warn，未讀寫真實存檔或雲端。暫時出現瀏覽器檢查頁未附加問題，重用既有分頁導航後已恢復並完成截圖；未commit／Push。

- **本機待驗收20261022m：05矮人蒸氣火銃兵**。使用者給5.jpg／5-1.jpg要求新增變身；m05接MORPHS.dwarfGunner與SW四圖集，沿用既有藍變槍手等級／能力，測試不限等級開關不變。現m01～m05專屬外觀，其餘25種統一。36格（walk／attack每向4、cast／hit各2），384×320／腳底[192,270]／charH160／drawH48，時間130／140／220／150ms。原圖背面攻擊正面化、側面施法缺格與白煙跨格已補畫，實際開火含低持槍／舉槍／後座／收槍。第18.8、88節。
- **05來源與試播**：images/sprites/morph/dwarf-gunner-v1/有正式單格／圖集／manifest；tools/sprite-src/morph/dwarf-gunner-v1/保留原圖、初次去背、五份正式生成PNG、全部內建image_gen提示詞／整理腳本。原去背白煙跨格會被切平，因此最終36格都用獨立補畫分鏡，初稿保留不用。試播dwarf-gunner-motion.html在本對話visualizations；真實卷軸／renderer隔離頁tools/dwarf-morph-preview.html；test-dwarf-morph.js通過卷軸扣量／到期／四向動作／其他變身回歸。未commit／Push。
- **m版驗證完成**：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022m）、test-dwarf-morph.js通過；36格皆獨立RGBA、透明留邊，圖集逐格一致。瀏覽器試播四動作及播放／暫停／逐格正常；真實renderer四向開火560ms，實際觀察第0～3格及開火後座畫面，兩頁Console無error／warn。未讀寫真實存檔或上傳雲端，待使用者Ctrl+F5→變形卷軸→槍手→05試玩驗收，未commit／Push。

- **20261022l：04 蒼穹女武神・艾爾接上專屬變身圖**（sky-valkyrie-v1，384×320、腳底 192,270、8 格動作，第 88 節）；目前專屬圖 m01～m04，其餘 26 種統一外觀。
- **本機待驗收20261022k：03冥火骷髏神射攻擊修正**。使用者回報與紅變相同，原圖幾乎只維持瞄準。內建image_gen新畫三向12格低持弓／拉弓／放箭／收弓，MORPHS.hellfireArcher.attack及SW改用attack-v2.png；維持320×280／腳底[160,240]／charH160／4×140ms，原圖／舊圖集留存。原稿／完整提示詞／prepare-attack-v2.py在tools/sprite-src/morph/hellfire-archer-v1/，共用sky-valkyrie-v1/prepare.py的打包函式；第18.6、88節。未改能力／消耗／schema。
- **同次04女武神72格樣本待驗收**：使用者給4.jpg，要求助手製作較流暢且有質感的動畫。金白戰甲／四片金翼／神弓／懸浮，移動與射箭8格、施法受傷4格，三向共72格、左鏡像。images/sprites/morph/sky-valkyrie-v1/正式格384×320／腳底[192,270]／charH160；時間80／70／110／80ms。來源／提示詞／整理腳本在tools/sprite-src/morph/sky-valkyrie-v1/。先看本對話sky-valkyrie-motion.html，**未接m04或改玩法數值**；第18.7節。翼尖／衣甲仍有逐格繪製差異，需看動態驗收。
- **k版驗證完成**：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022k）；test-moon-attack與test-hellfire-attack皆通過；72女武神及12新版紫變格皆非重複RGBA、透明留邊、圖集逐格對應。瀏覽器紫變實際sceneReadEvents／sceneDraw四向攻擊正常、Console無error／warn；女武神四動作、AVIF載入、播放／暫停／逐格／鏡像正常，Console無error／warn。兩份試播皆小於1MB，未寫真實存檔／雲端，未commit／Push；待使用者驗收。

- **20261022j：03 冥火骷髏神射接上專屬變身圖**（hellfire-archer-v1，格子 320×280、腳底 160,240，第 88 節）；目前專屬圖 m01～m03，其餘 27 種統一外觀。
- **20261022i：變身等級限制暫時拿掉**（使用者要求方便測試，`MORPH_LV_FREE = true`）。**待辦：正式開放前改回 false。**
- **20261022h：喝水延遲統一 0.8 秒**（使用者選；天堂官方秒數查不到）。藥水類手動、自動共用 `potReadyAt`，喝完 0.8 秒內再喝回「喝水延遲中」不扣藥；卷軸不受影響。第 89 節。
- **本機待驗收 20261022g：月光精靈巡林者攻擊修正**。使用者指出紅變沒有攻擊動作，確認原四格皆維持拉弓；已用內建 image_gen 補畫三向 12 格準備／拉弓／放箭／收弓，MORPHS.moonRanger.attack／SW 改用 attack-v2.png。320×240、腳底 [160,200]、charH160、4×140ms；舊圖與原稿保留，提示詞／prepare-attack-v2.py 在 tools/sprite-src/morph/moon-ranger-v1/。不改能力／消耗／存檔，第18.5、88節。
- **同次：冥火骷髏神射（紫變）素材待驗收**。使用者新提供 3.jpg／3-1.jpg，沿用「先完成外觀素材及試播」；33 原人物格＋3 補畫施法蓄力＝36 格人物，3 箭矢獨立。原圖／內建 image_gen 原稿／提示詞／prepare.py 保存在 tools/sprite-src/morph/hellfire-archer-v1/，透明圖集與單格在 images/sprites/morph/hellfire-archer-v1/；320×280、腳底 [160,240]、charH160，左鏡像。**未接 m03 專屬圖或改玩法／數值**；原射箭姿勢仍主要靠持弓／光效變化，不應誤稱補畫完整射箭流程。試播 hellfire-archer-motion.html 在本對話 visualizations 目錄，第18.6節。
- **g 版驗證**：test-moon-attack.js 通過命中／MISS 四方向及受傷不打斷；12 紅變新版／36 紫變人物格皆為非重複 RGBA、透明留邊、逐格與圖集一致，3 箭矢獨立；check.ps1 ALL CHECKS PASSED（46 檔／45 script／20261022g）、git diff --check 通過。瀏覽器實際 renderer 四方向點攻擊有播放，修正隔離頁相對路徑後無新 Console 錯誤；兩份試播播放／暫停／逐格正常，紫變四動作與鏡像已看。未寫真實存檔或上傳、未 commit／Push，待使用者實玩驗收。

- **月光精靈巡林者（紅變）素材待驗收（2026-10-22）**：使用者提供立繪與 36 格 JPG，明確選擇「先完成外觀素材與試播，等級及能力稍後決定」。本次只整理外觀；未加選單／MORPH_FORMS、不改數值／存檔／SW；工作期間遊戲由外部更新至 20261022e，本次未改版本。36 格透明 PNG、4 動作圖集、manifest 在 images/sprites/morph/moon-ranger-v1/；原圖、內建 image_gen 去背原稿／提示詞及 prepare.py 在 tools/sprite-src/morph/moon-ranger-v1/。320×240、腳底 [160,200]、charH160；走路／攻擊各方向4格、施法／受傷各2格，左鏡像。原圖步幅差異較小，部分動作以光效變化為主；側面放箭兩格弓尖已另修補，原稿／提示詞保留。試播 moon-ranger-motion.html 在本對話 visualizations 目錄；第18.5節。

- **紅變素材驗證**：36 格 RGBA、非重複內容、4 圖集／來源對應、共同腳點及修補兩格通過；manifest 的 level／effects 為 null。check.ps1 ALL CHECKS PASSED（46 檔、45 script，20261022e），git diff --check 通過。瀏覽器四動作、透明背景、左鏡像、播放／暫停／逐格已檢查，待使用者檢視動態；未 commit／Push。

- **20261022f：02 月光精靈巡林者接上專屬變身圖**（moon-ranger-v1，腳底 160,200，第 88 節）；目前有專屬圖的是 m01、m02，其餘 28 種仍統一外觀。
- **20261022e：變身清單換成使用者給的 30 種**（9 系：弓手／槍手／雙刀／雙手劍／單手劍／法杖／拳套／鋼爪／劍盾；藍變 Lv.15、紅變 Lv.35、紫變 Lv.52、金變 Lv.70）。加成由階級＋系別公式算出（第 88 節表格），選單依系別分組、階級顏色標示，建議武器只提示不限制。外觀仍統一用巡守妖魔神射圖；30 種的外觀與特效設計稿存在 tools/MORPH-DESIGN.md，之後做圖照這份。使用者同意先前 d 版上線（4dcff11）。另有 tools/sprite-src/morph/moon-ranger-v1/（02 月光精靈巡林者素材）是別的工作在做，這次沒碰。

- **變身動畫素材 v1 待驗收（2026-10-22）**：使用者進一步授權「提供人物圖片，由助手製作動畫需要的」。已用巡守妖魔神射立繪以內建 image_gen 重製四組，36 格真透明 PNG（3 方向×走 4／射箭 4／施法 2／受傷 2，左鏡像），4 動作圖集及 36 單格在 images/sprites/morph/wolf-ranger-v1/。八份原稿、提示詞、Pillow／NumPy 整理腳本在 tools/sprite-src/morph/wolf-ranger-v1/。每格 256×240，腳底 (128,200)，charH160；未來接 renderer 必須使用 anchor，不能把 cellH 當腳底。正面射箭朝下、背面不混正面，施法／受傷重製為不同動作，步態補跨步／收步。第 18.4 節。本次未接變身玩法／存檔／SW，不改 GAME_VERSION；2 格施法／受傷是基礎動作，後續可加格。新版互動試播 wolf-ranger-v2-motion.html 在本對話 visualizations 目錄；待使用者檢視外觀與動態。

- **素材驗證**：36／36 獨立 RGBA 分鏡尺寸、alpha、非重複內容及 manifest 對應通過；4 圖集透明邊緣與正／背／側已人工檢視。瀏覽器四動作切換、暫停、逐格、左右鏡像及持續輪播正常，Console error／warn 皆 0；修正試播狀態同步造成逐格跳回第 1 格。check.ps1：ALL CHECKS PASSED（46 檔語法、45 script，版本仍 20261022b），git diff --check 通過。未接遊戲、未改真實角色或上傳，未 commit／Push。

- **先前變身素材檢查預覽（2026-10-22）**：使用者提供「巡守妖魔神射（藍變）」立繪及 JPG 分鏡，先要求檢查與模擬動畫。當時整理 34 格人物／4 格獨立箭矢；原 JPG 有背面混正面、側面受傷只有 1 格、灰白格實際底色等問題。原圖未改，舊裁切表、原圖副本及 wolf-ranger-motion.html 留在本對話 visualizations 目錄；目前改用上方新生成 36 格素材，不使用舊 JPG 接入遊戲。


- **本機待驗收 20261022b：全套場景與世界地圖重製＋傳說武器特殊技能**。使用者確認世界總覽及所有實走地區全套重製；52 份原創素材已接入，19 狩獵區／4 城鎮／兩塔／四龍、21 塔怪動作圖集／6 NPC；新世界 9,786 格全連通。M／小地圖開獨立原創地形總覽，23 地標可查建議等級，野外步行路線不免費傳送。使用者特別指定 **保留原本有骷髏雕飾的下半部**，已移除簡化 HUD CSS，沿用原圖／位置。第 86 節。
- **同次傳說效果**：先查 28 件只有 10 有共鳴，使用者再要求傳說武器要有特殊技能，已補 7 把，現在 12 把全部有共鳴＋圖片特效；17 件裝備有共鳴、另 11 件防具僅基礎屬性，沒有套裝加成。對照表 tools/LEGEND-EFFECTS.md，第 87 節。場景／17 共鳴／鍛造與穿戴／48 特效／432 道具／傳說光暈測試通過；check.ps1 ALL CHECKS PASSED（46 檔語法、45 script），最終混淆合併語法與新圖包通過。瀏覽器逐一切換 23 場景、世界總覽縮放／全圖／關閉、390px 手機全圖／放大、原骷髏外框確認，Console 無 error／warn。SAVE_SCHEMA 仍 5，保留 q 版怪物數值。
- 工作中 r 版進度已被外部提交 6276cfa／97c4d0b／a9f079f（本助手沒有提交），後續修正用新日期版本 20261022b；仍待使用者完整實玩確認才提交／Push。
- 使用者另詢問變身系統素材需求，已建議每種 36 格（3 方向×走4／攻4／施法2／受傷2；左側鏡像），非對稱左右分畫為 48 格。只是回答素材準備，尚未授權實作變身系統。

- **20261021q：怪物血量／傷害加強＋永夜之塔等級提高**（使用者要求）。`buildMonster` 加 `monHpMul`（不疊乘：首領 ×5；一般 Lv70+ ×5、50～69 ×3、其餘 ×2）與 `MON_DMG_MUL` 1.4（普攻＋魔法）；塔怪 Lv＝60＋樓層×0.45（地圖顯示 61～105）。第 85 節。

- **本機待驗收 20261021p：全部傳說裝備呼吸光暈**。使用者已從四款樣本選呼吸光暈；28 件傳說品級（12 武器／14 防具／2 飾品）統一套金色柔光、2.8 秒呼吸與細金邊，沿用 PNG。背包／人物／圖鑑／鍛造／倉庫／交易所等共用圖示入口，其他品級與技能不套用；系統減少動態時保留常亮柔光。未動數值／存檔／人物武器動畫；第 84 節。test-legend-glow／test-item-art／test-legend-equipment 全通過；check.ps1 ALL CHECKS PASSED、43 檔最終混淆與合併語法／呼吸 CSS 打包通過。瀏覽器全部 28 件大小圖共 56／56 載入、缺圖 0，動畫皆為 2.8 秒；人物十格、背包十八件、圖鑑介紹實測正確，長劍／皮甲／木盾不發光，Console 無 error／warn。開始時 o 已由外部提交 63ca404，本助手未提交。

- **本機待驗收 20261021o：十二職業傳說武器與兩套傳說防具**。保留既有 5 武器／3 防具，新增 7 武器＋11 防具及 18 鍛造配方；傳說品級現為 12 武器＋14 防具＋2 飾品。十二職業各一把不同的相容代表武器，龍裔守護與星風秘法兩系列各七部位，沒有新增套裝加成；持盾限制與既有共鳴保留。全裝備 168（75 武器／64 防具／29 飾品），ITEMS 432，原創圖 285。新圖逐件由內建 image_gen 生成，原稿與提示詞保存在 tools/icon-src/items／legend-equipment-art.json；第 83 節。穿戴、鍛造扣料與來源、全 432 道具圖片、英雄防具／購買／掉落回歸皆通過；check.ps1 ALL CHECKS PASSED，最終 43 檔混淆與合併語法通過，285 PNG 全數打包。瀏覽器預覽 26／26 圖、缺圖 0，實際雷霆符文劍介紹列屬性及鍛造來源、關閉正常，Console 無 error／warn。未改存檔 schema、不上傳測試角色，待實玩確認才 commit／Push。開始時 n 已由外部提交 841eef4，本助手未提交。

- **n 版驗證補充**：最終 43 檔混淆建置與合併 JS 語法通過，267 張道具 PNG 全部打包；git diff --check 無格式錯誤。瀏覽器英雄防具 14／14 張載入、缺圖 0、Console 無 error／warn；未修改真實存檔、未上傳測試角色。尚未提交或推送本次 n 版。

- **本機待驗收 20261021n：英雄防具七部位各兩件**。使用者指定已有的部位加 1、沒有的加 2；新增 11 件：暮鋼戰盔、深淵守衛戰甲、月影秘法披風、黎明壁壘之盾、霜鏡法盾、符文絲織內衣、泰坦紋戰衣、血誓護手、星紋秘法手套、疾風獵行靴、磐岩守護戰靴。英雄防具由 3 → 14 件，飾品維持 4 件；總裝備 150 種（武器 68、防具 53、飾品 29），全道具 414 件。原創圖 11 張已接入，圖集／提示詞 tools/hero-armor-art.json；依 Lv.50～80 起進既有隨機裝備掉落，圖鑑列來源，不另改掉落機率、不新增共鳴／玩法、不動存檔 schema（第 82 節）。穿脫／能力／掉落池／圖片等隔離測試及 check.ps1 通過；瀏覽器英雄分類 14／14 圖，缺圖 0，待使用者實玩確認後才 commit／Push。工作期間前版 m 已外部提交 b934cd1，本助手未提交。

- **20261021m 最終驗證**：check.ps1 顯示 ALL CHECKS PASSED；道具、商店購買、掉落分流、訊息框定位、泰坦地圖、48 特效回歸皆通過；最終 43 檔混淆建置成功、合併 JS 語法正常、256 張新圖全數打包。瀏覽器完整圖庫 403／403 載入、缺圖 0，裝備 71／71；隔離範例確認背包、商店名稱／價格／購買按鈕、三欄角色裝備，Console 無 error／warn。十二職業最終 733 格透明度與載入錯誤 0；泰坦世界位置／區域預覽正確。這些是隔離畫面／整合驗證，仍待使用者真實角色實玩確認。

- **本機待驗收 20261021m：原創道具圖片補齊**。68 武器＋71 裝備及其餘缺圖道具，新增 256 張 128×128 透明 PNG，內建 imagegen 原創，16 張圖集加精靈餅乾原稿及提示詞保存在 tools/icon-src/items／item-art-*.json。144 魔法書沿用技能圖，勇敢／慎重／藍水沿用原圖；全 403 件道具皆有有效圖片。已接背包、商店、角色裝備、圖鑑、道具介紹、回收、倉庫、交易所與鍛造（第 80 節）。隔離測試與發佈建置通過，圖片全數進發佈包；不改存檔／數值。工作期間使用者已從外部提交 4ca6748（包含部分進度），本助手未 commit／Push；剩餘新圖及 m 版仍待實玩驗收。
- **同次完成：怪物名稱移到腳下**。包含目標／精英／首領與 emoji 外觀，名稱和等級在腳底下方 16px，血條保留上方，玩家名稱不動（第 81 節）。隔離瀏覽器三種畫面已確認；工具頁 tools/scene-label-preview.html。待使用者在塔內實戰確認。
- **同次完成：泰坦墓穴大地圖**。原創巨型陵墓放世界東南，西側連腐朽礦坑深層，對應既有 giantTomb Lv.72～88；新 wild-titan 三檔世界／小地圖／遮擋，舊圖保留；846 格皆與世界連通，怪物／費用／掉落不動（第 78 節）。隔離測試通過，預覽 tools/titan-map-preview.html；待使用者實玩。
- **同次完成：十二職業武器光效貼合**。依實際角色動畫格的局部武器像素畫光，取代估算手邊的大光圈，跟隨動作、鏡像與遮擋。十二職業來源動作表都已檢視，733 格透明度測試先前通過；王族正面再縮窄到劍刃、妖精排除部分綠衣像素（第 79 節）。工具頁 tools/weapon-glow-preview.html；同色相連處可能仍需實玩微調，不能當作每格人工描邊。

- **20261021i 更正掉落紀錄**：使用者要求與戰鬥訊息真正分開；取得道具／自動賣出只寫獨立 lootLog，不再重複寫 gameLog。獨立 lootLogSeq；新增回歸斷言，真實掉落與自動賣出皆不出現在戰鬥訊息。檢查與整合測試通過。

- **本機待驗收 20261021h**：左下訊息框新增「🎁 掉落紀錄」，獨立保留本次遊戲最近 120 筆，不受攻擊洗頻影響；成功打怪取得道具顯示數量／品質，含地圖與任務道具，自動賣出明示，超重排除。重新進入角色清空，不改存檔 schema（第 77 節）。隔離整合與既有訊息框定位回歸通過，瀏覽器三分頁切換正常、Console 無錯誤，未上傳測試角色。

- **20261021g 同次調整**：PC 左側世界首領／排行榜／團隊副本／聊天／血盟／交易所整排下移，從原圖 y 260 開始，避開頂端地名及 buff 圖示。包含戰鬥訊息框定位修正；最終版本 g，讓快取更新至完整修改。check.ps1／定位回歸通過，瀏覽器 PC 確認第一顆按鈕從 27px 下移至 169px、訊息框在左下、Console 無錯誤；未登入、未上傳測試角色。塔內定位由隔離 DOM 驗證，待使用者實際驗收。

- **本機待驗收 20261021g**：使用者確認戰鬥訊息框要回左下。修正 renderLogPop 在 PC 跟著永夜之塔頂端上下樓按鈕定位、導致框被推高的問題；PC 固定用既有左下 CSS，手機仍避開底部操作列（第 76 節）。隔離 DOM 回歸測試通過，不動角色／聊天入口／存檔。

- **20261021e 補充驗證**：tools/test-shop-buy.js、check.ps1（ALL CHECKS PASSED）、實際 43 檔混淆建置與合併 JS 語法皆通過。工作期間 e 版已由外部提交／推至 main／origin/main（cf9bd7a）；本助手未執行 commit／Push。此後只補驗證紀錄文件，仍待使用者實玩購買與面板高度。

- **本機待驗收 20261021e**：商店每件商品新增「自訂」購買數量，保留原快捷鍵，輸入即時顯示總價及依金幣／負重計算的最多可買數量；購買端拒絕零、負數、小數、溢位，失敗不扣款且保留視窗。PC 地圖等分頁頂端上移，高度約增加五成，多視窗也加高，底部操作區保留（第 75 節）。隔離購買測試通過；瀏覽器確認輸入與錯誤提示、金幣／藥水未變、加高面板與三視窗關閉／捲動正常，Console 無錯誤。未登入／未上傳測試角色，待使用者實玩後才 commit／Push。

- **本機待驗收 20261021d**：十類視覺特效共 48 款、十二張透明圖集（第 74 節）。十二職業各一組技能圖，另接武器強化／附魔常駐光、普攻、暴擊／閃避／反擊、治癒增益、現有負面狀態、首領大招、稀有掉落及升級。使用者明確選擇只做視覺，盾牌格擋／中毒／突破三款僅預覽，不新增玩法。強化四階：＋1～5 銀白、＋6～8 金色、＋9～11 青藍、＋12～15 紫金，出手增亮；武器掛點仍待各職業動作實玩。設定新增本機低／中／高與 48 款無消耗預覽，不改存檔 schema／數值。新測試與既有附魔整合、自動檢查通過；瀏覽器載入 12／12 圖、遊戲內切換 48 預覽與品質正常，Console 無錯誤。工作期間 c 已被外部提交到 main／origin/main，因此最終列距等修正改用 d。待使用者驗收，不自行 commit／Push。

- **本機待驗收 20261021b**：新增剩餘二十種專屬透明圖片動畫，現在全部 25 種附魔均有自己的圖（第 73 節）。二十張新圖由內建 imagegen 原創生成，提示詞記錄於 tools/sprite-src/boss-vfx/generated-prompts.json；原先五張使用者圖保留。鍛造師預覽擴充 25 種並可捲動；混沌裂爆圖片與 1 秒延遲傷害同步，地龍動畫以角色為中心。傷害／機率／費用／存檔不變。整合測試、圖片分格、check.ps1、實際混淆建置通過；瀏覽器隔離頁載入 25／25 圖；另以未登入本機角色實際進村莊鍛造師，逐一切換 25 種預覽，金幣仍 300，Console 無錯誤，未上傳測試角色。待使用者實玩驗收，尚未 commit／Push。

- **本機待驗收 20261021a**：五套獨立 PNG 已分別接入對應附魔（第 72 節），全部原圖均有透明度、直接使用；前述待分格／去背事項已完成或確認不需處理。幽靈四格預警＋十二格爆炸、死神紫紅各八格、其餘十六格，保留冥王四次命中斬光。附魔與圖片分格測試、check.ps1 通過；瀏覽器工具 session 錯誤，待使用者 Ctrl+F5 → 鍛造師 → BOSS 附魔 → 五種預覽，確認後再提交剩餘文件與補充測試。工作期間偵測 Git 已更新至 41e2364，五張圖片與播放程式已在 main／origin/main；剩餘文件與測試尚未提交。


- **2026-10-21 收到五套完整動畫原圖**：原樣存於 `tools/sprite-src/boss-vfx/`（蠻牛、冰后、幽靈砲擊、紫紅雙色死神、幽冥冠王），尚未接入遊戲。幽靈砲擊與死神原圖有底色，需要去背及依各表分格；不能直接套用現有共用圖集的 6×5 格設定。現行仍引用 `images/vfx/boss-enchants.png`。

- **2026-10-21 補齊特效圖集，版本 20261020j**：使用者提供桌面「暗黑武器附魔特效圖集.png」，原樣複製至 `images/vfx/boss-enchants.png`，補上程式已引用但未入庫的圖片。1374×1145、6 欄×5 列，每格 229×229，依序蠻牛／冰后／幽靈砲擊／死神／冥王；待使用者重新整理並驗收五種預覽後 commit、Push。只新增圖片與文件，沒有改 JS。

- **本機待驗收 20261020i**：植入五種專屬特效（蠻牛／冰后／幽靈砲擊／死神／冥王），傷害時序同步，冥王幻影位於人物後方、血條名字在前景特效上方。鍛造師 → BOSS 附魔新增五種無消耗循環預覽（第 71 節）。保留 GA4；其他技能數值、費用、材料機率與數量不變。特效時序／附魔整合測試、check.ps1 與實際混淆建置通過，待實玩驗收，未發布。

- **已上線：Google Analytics 4**（評估 ID `G-TM576GBMKF`，與凡塵修仙傳共用串流；gtag 放在清除 access_token 之後，第 70 節）。只改 HTML，不換版本號。

- **本機待驗收 20261020h**：全部 BOSS 材料與永夜之魂，掉落成功時數量固定 1 個（共 26 種，含四大龍及十王）。掉落率維持各自 0.1%，不受異界加成（第 69 節），尚未發布。

- **本機待驗收 20261020g／schema 5**：完成 25 種 BOSS 武器附魔＋永夜之魂封存（第 68 節）。一般 BOSS 100 萬、塔 10～50F 200 萬、塔 60～100F 400 萬、四龍 500 萬；封魂與裝回各 50 萬。永夜之魂 ×1 取出武器附魔為「技能名封魂石」，裝回消耗該石。鍛造師新增 BOSS 附魔，背包封魂石可選武器裝回。保留 20261020f 墓窟更新。
- 附魔功能測試與 25 種副本模擬、check.ps1、實際混淆建置皆通過；尚待手機／PC 介面與封魂往返實玩、長時間職業平衡，未發布。執行測試：node tools/test-boss-enchant.js（隔離存檔與雲端）。

- **20261020f**：低語墓窟（Lv.8～18）改用使用者給的地下墓穴圖，併入大地圖、放在腐朽礦坑・上層正南方（大地圖 188×149 格，`wild.jpg?v=9`）；北邊兩道 AI 補畫的石階接礦坑上層，怪物／掉落／任務不變；接縫 15～18 已補完（第 67 節）。

- 本機待驗收 **20261020d**：全部 26 種 BOSS 材料（含四龍鱗、永夜之魂、十王材料）固定 0.1% 掉落，不受異界加成；成功後數量維持原設定，圖鑑顯示機率（第 66 節）。

- 本機待驗收 **20261020c**：永夜之塔十王各新增一種專屬材料，額外掉落 1～2 個（機率後續由 20261020d 統一為 0.1%），保留永夜之魂及原掉落；圖鑑標示樓層與首領。暫無鍛造配方（第 65 節）。主畫面遺失問題仍待確認，未視為已解決。

- 本機待驗收 **20261020b**：移除手機狩獵、村莊頁面、PC 底部的步行回村按鈕；血盟建立限定王族，維持 Lv.15 與 20,000 金幣條件。20261020a 的版本號取代誤刪 CSS 圖片網址結尾，造成下半段黑色，20261020b 已修正（第 64 節）；待使用者實測回報再 commit。

- 線上 **`20261019t`**：路引改成路邊木頭路牌（使用者從樣本 A～D 選 D，第 63 節）。線上 **`20261019s`**：手機狀態欄／快捷欄閃爍修正（`ui.js` 的 `setHtmlStable`，第 62 節）。上一版 **`20261019r`** 已上線（防改檔第 2 波，第 60 節：交易所門檻、存檔加密簽章、雲端存檔簽章、記憶體偽裝、發佈版混淆；第 61 節：聊天依活躍程度輪詢、交易所列表快取，省 Supabase 傳輸量）。前一版 `20261019q`（圓形小地圖＋按 M／點小地圖開全世界地圖，第 59 節）已上線。
- Supabase 免費方案每月傳輸量約 5GB（整個遊戲共用），估計適合每天幾百人；人更多要考慮 Pro（每月 25 美元）。
- 大地圖接縫：13 條全部補完；第 67 節新增 15～18 四條（低語墓窟）也已補完。還有幾處淡淡的霧（綠洲兩個角、熔火煉獄上下緣、金字塔右緣）可再補，使用者想做再切圖。
- 使用者存 AI 圖的習慣：存到 `images\maps\<id>.jfif`（或 `.png.jfif`），要搬到 `tools\bigmap\seams\fixed\<id>.jpg`（別留在 images，會被發佈）。
- 網址：`https://k559610142-art.github.io/-username-.github.io-/屠龍勇者/`（repo `k559610142-art/-username-.github.io-`，GitHub Pages 發佈 `main`）。
- 已完成的系統（詳見 `ARCHITECTURE.md` 各節）：12 職業（都有人物模型與立繪）＋職業故事／任務線、天堂原版經驗表、衝裝、暗黑式詞綴、
  製作通貨、異界地圖 T1～T15、共鳴裝備、天堂式魔法 1～10 級＋魔法書、快捷欄、離線收益、多角色欄位、
  帳號雲端存檔（Supabase）、團隊副本、聊天、血盟、排行榜、世界首領、交易所、共用倉庫／鑽石、音效＋背景音樂、PWA、
  大地圖（多張真地圖拼接、遮擋、交界路引、瞬移卷軸、傳送師）、防改檔（伺服器可疑紀錄、存檔加密簽章、雲端簽章、交易所門檻、混淆）。

## 2. 待辦（使用者還沒叫做的不要自己開工，先問）

- **m版05待實玩**：Ctrl+F5 → 變形卷軸 → 槍手 → 05矮人蒸氣火銃兵 → 確認矮人／鍋爐／白蒸氣、走路與開火後座／收槍，轉四方向後再施法／受傷。隔離頁http://localhost:8790/tools/dwarf-morph-preview.html可檢查真實圖集；看本對話試播四動作。使用者實玩確認後才commit指定檔案，再請其GitHub Desktop Push origin。

- **k版03待實玩**：Ctrl+F5 → 變形卷軸選03冥火骷髏神射 → 打怪，確認低持弓、拉弓、放箭、收弓，四方向可見；隔離頁http://localhost:8790/tools/hellfire-attack-preview.html可點攻擊與方向，不讀真實角色／雲端。04先看本對話72格試播並決定是否接入；未獲實玩驗收前不commit／Push。

- **20261022g 紅變攻擊待實玩**：本機 Ctrl+F5 → 變形卷軸選月光精靈巡林者 → 打怪，確認有抬弓／放箭／收弓，切四方向核對。隔離頁 http://localhost:8790/tools/moon-attack-preview.html 可點方向及「攻擊一次」，使用真實 sceneReadEvents／sceneDraw，不載真實存檔或雲端。使用者驗收後才 commit；紫變先看本對話試播，尚未接上遊戲 m03。

- **20261022b 待驗收**：Ctrl+F5 後確認原本骷髏外框／法球仍在；從地圖依序進海岸、森林、雪原、王陵、泰坦，按 M 看世界地名及所在地，野外選目的地步行、兩塔傳送師入口；到四城鎮只點 NPC 名牌開設施。塔內確認怪物圖片、四龍場景。裝備圖鑑 → 傳說武器應 12 把皆列共鳴，穿戴新武器實戰核對集氣／冷卻／圖片特效。隔離美術預覽 tools/scene-rework/preview.html（工具列可選場景／手機），不讀寫真實存檔或雲端。使用者實玩確認後才提交本次指定檔案，請其 GitHub Desktop Push origin。

- **傳說光暈 p 版待驗收**：Ctrl+F5 → 背包／角色裝備／裝備圖鑑，確認傳說武器、防具、飾品都有柔和金色呼吸光暈，其他品級不發光；點介紹及鍛造、倉庫圖示確認一致。隔離預覽 http://127.0.0.1:8790/tools/legend-glow-preview.html 可看全部 28 件大小圖與切背包／人物／鍛造。真實角色實玩確認後才提交指定檔案、請使用者 Push origin。

- **傳說裝備 o 版待驗收**：本機 Ctrl+F5 → 裝備圖鑑 →「武器」＋「傳說」應有 12 把；「防具」＋「傳說」應有 14 件、七部位各 2。隔離預覽 http://127.0.0.1:8790/tools/legend-equipment-preview.html 可看職業對應與兩系列、點裝備介紹確認圖片／能力／鍛造來源。實際村莊 → 鍛造師確認新 18 配方；武器費用 80,000、防具 60,000，材料請看介紹。不改測試用真實角色數值，材料齊全時由使用者實玩。盾仍只供能持盾職業與單手武器搭配。確認後才提交本次指定檔案並請使用者 Push origin。

- **英雄防具 n 版待驗收**：本機 Ctrl+F5 → 裝備圖鑑 →「防具」＋「英雄」，應看到 14 件、七部位各 2；點新裝備介紹核對圖片、屬性與「隨機裝備 Lv.xx 以上」來源，特別確認符文絲織內衣 MP +40。圖庫工具分類新增「英雄防具」，可並排看全部。新物品要由對應等級怪物自然掉落，取得後再確認穿脫與安定 +4。使用者確認後才提交本次檔案並請使用者 Push origin。

- **本次圖片／名稱／墓穴／武器光待驗收（20261021m）**：本機 Ctrl+F5 → 背包、村莊商店、人物裝備、裝備圖鑑，核對同一道具圖片一致、點介紹及購買按鈕方便；塔內確認怪物名在腳下；地圖選泰坦墓穴再按 M 看世界東南；高強化武器走路／攻擊／施法／受傷及四方向確認貼合。隔離圖庫 http://127.0.0.1:8790/tools/item-art-preview.html 可切分類或背包／商店／角色裝備，不載真實存檔、不上傳；全 403 圖片由 test-item-art.js 檢查。使用者實玩確認後才提交本次檔案（不要 git add -A），再請使用者 GitHub Desktop Push origin。
- **掉落紀錄待驗收（20261021h）**：Ctrl+F5 → 左下骷髏頭 →「🎁 掉落紀錄」→ 打怪後應看到取得道具及數量，確認自動賣出也有標明；回戰鬥／聊天再切回仍保留。重新進入角色會清空。確認後才提交並請使用者 Push origin。
- **泰坦墓穴已製作並接入，待驗收**：見本次 20261021m 與架構第 78 節，不必重新生成。

- **戰鬥訊息框待驗收（20261021g）**：Ctrl+F5 → PC 16:9 → 永夜之塔 → 點左下骷髏頭；訊息框應在左下、不會跟上下樓按鈕跑到上方。確認正常後才 commit，再由使用者 Push origin。
- 同次確認左側系統六顆按鈕已下移、地名與增益圖示可見，按鈕仍可點。

- **購買數量／面板高度待驗收（20261021e）**：本機 Ctrl+F5 → 村莊商店 → 商品旁「自訂」→ 輸入數量確認總價 → 購買後核對金幣與物品；另在 PC 16:9 開地圖，確認面板高度、捲動與關閉方便。確認沒問題後才提交本次檔案，再請使用者 Push origin。

- **十類 48 款特效待驗收（20261021d）**：Ctrl+F5 → 右側系統選單 → 設定 → 視覺特效 → 十類特效預覽；可切低／中／高。並排預覽 http://127.0.0.1:8790/tools/world-vfx-preview.html 可選分類。實玩確認普攻／技能特效不遮血條，附魔與高強化武器的光是否貼合人物手邊；角色不同朝向與出手仍可能需微調。三款僅預覽：盾牌格擋、中毒綠霧、突破法陣。使用者確認後再提交本次檔案並請使用者 Push origin。

- **25 種圖片特效待驗收（20261021b）**：本機 Ctrl+F5 → 村莊鍛造師 → BOSS 附魔 → 上方可捲動的 25 個特效預覽，不消耗材料金幣。也可開 http://127.0.0.1:8790/tools/vfx-preview.html 並排看全部動畫（隔離存檔／雲端）。特別確認混沌先蓄力後爆炸、四龍、死神紫紅與冥王四連斬；F12 Console 沒紅字。使用者確認後才提交本次檔案，再請使用者 Push origin。

- **五種特效待實玩**：Ctrl+F5 → 村莊鍛造師 → BOSS 附魔 → 點五個「特效預覽」。不用材料／金幣、不產生測試角色。看砲擊先預警再爆炸、死神輪流紫色與暗紅色、冥王四次斬擊；關閉後回到遊戲。實戰仍依原附魔命中率發動，需確認手機與 PC 可見度及 Console。

- **本次待驗收**：村莊鍛造師 → BOSS 附魔 → 選武器，確認費用與技能；材料附魔後封魂取得「XXX封魂石」，選另一把武器裝回，確認石頭與金幣正確扣除、重整後附魔保留。實際確認手機／PC 特效與 Console 無錯誤。測試需用隔離角色，不上傳測試數值。
- 附魔技能數值尚待長時間職業平衡；目前怪物無主動治療招式，減療已提供入口。雲端既有簽章不含 bossEnchant，附魔伺服器驗證需另規劃。

- 王族創建血盟的伺服器端限制：遊戲端已完成，正式 clan_create 尚未檢查職業；修改 SQL 前須先經使用者確認，再由使用者貼到 Supabase 執行。

- **anticheat.sql 已於 2026-10-22 由使用者在正式庫執行**（第 60 節簽章檢查與交易所門檻生效；後端掉寶依賴它的 dragon_save_ok）。
- 防改檔還沒做的（第 60 節末）：離線收益改用伺服器時間、加速器偵測、排行榜排除簽章不符的存檔。使用者沒說要做就先不做。

- 大地圖第 3 期「獸潮」、第 4 期介面（第 45 節之後的規劃）。
- 還沒有圖的怪物：火龍、永夜之塔怪約 30 隻、任務首領約 24 隻（使用者會提供動作表，切圖工具 `tools/monsters/cut-sheet.ps1`）。
- 根目錄（修仙那邊）的 `sw.js` 會把子路徑的 `index.html` 也存成首頁快取，離線時可能讓修仙首頁變成本遊戲頁。**要先問使用者再修**（會動到修仙）。
- 村莊在線玩家（presence）因 Supabase Realtime 免費額度不夠已關閉（`PRES_ON=false`），使用者沒說要開就不要開。

## 3. 使用者的習慣與決定

- 一律用**繁體中文**溝通；使用者不是工程師，說明用白話，少用術語。
- 大改版喜歡**先做樣本並排讓他選**（例如「角色裝備」視窗是 Claude 和 Gemini 各做一版並排比較後選的）。
- 負重：回血超過 50% 停、回魔 70% 以上才停（2026-10-19 使用者決定，回魔不照天堂原版）。
- 數值上選「完全天堂原版」：經驗表 `EXP_RATE=1`、攻速依武器速度×職業係數÷加速藥水。
- 人物模型：使用者自己用 AI 生成動作表給你切；黑暗妖精用**第一版**模型（`darkelf-*.png`），v2～v5 圖檔留著但不用，立繪用 v4。
- 素材原檔在使用者桌面「屠龍勇者人物模組資料」資料夾。
- 推送：使用者用 GitHub Desktop 在 `main` 上 Push，不開 PR。（Claude 雲端版是推到工作分支再開 PR 合併。）
- 防改檔（2026-10-19）：使用者選「全改」，只動黑暗大陸；根目錄 `tools/build.js` 加一行呼叫黑暗大陸建置（使用者同意）。不擋單機遊玩、不刪檔，只擋交易所／共用倉庫。

## 4. 環境限制（Windows 10）

- Git for Windows 2.55（2026-10-18 用 winget 安裝）：`C:\Program Files\Git\cmd\git.exe`，已在系統 PATH（新開的終端機才吃得到；舊視窗或 AI 的沙盒找不到就用完整路徑）。
  終端機還沒登入 GitHub，推送仍由使用者在 GitHub Desktop 按 Push origin。
- 有 Node（`C:\Program Files\nodejs`）；**沒有** Python、ffmpeg。圖片用 PowerShell 腳本處理（`tools/`），影片抽音軌用 WinRT MediaTranscoder（第 44.1 節）。
- Supabase（雲端存檔、聊天、交易所……）的後台由使用者操作；`gm.html` 是管理頁。

## 5. 常用操作

- **開本機伺服器**（在 `屠龍勇者/` 資料夾）：
  `powershell -NoProfile -ExecutionPolicy Bypass -File ..\tools\serve.ps1 -Root . -Port 8790`，再開 `http://localhost:8790/`。
  （`tools/serve.ps1` 在 repo 根目錄，是不用安裝任何東西的小型靜態伺服器；有 Node 的話 `npx http-server -p 8790` 也可以。）
- **測試前備份存檔**（瀏覽器 F12 → Console）：
  備份 `localStorage.setItem('bak_dragon', JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('dragonSlayer_')).map(k=>[k,localStorage.getItem(k)]))))`
  還原 `Object.entries(JSON.parse(localStorage.getItem('bak_dragon'))).forEach(([k,v])=>localStorage.setItem(k,v))`，再重新整理。
- **切怪物圖**：規格與用法在 `ARCHITECTURE.md` 第 18 節後段（搜尋 `cut-sheet`）；人物動作表用 `tools/cut-sprites.ps1`（第 18.1 節）。
- **沒辦法自己開瀏覽器的 AI**：改完要給使用者「照著點」的驗證步驟，例如
  「1. 按 Ctrl+F5 重新整理 → 2. 進入角色 → 3. 打開〇〇分頁 → 4. 應該看到〇〇 → 5. 按 F12 看 Console 有沒有紅字，有的話整段貼給我」。
  使用者回報沒問題後才 commit。

## 6. 多個 AI 一起工作

- 每個 AI 都能**獨立**從修改走到 commit（`AGENTS.md` 第 4 節），不需要別的 AI 檢查。
- Claude（Claude Code 桌面版）：能開瀏覽器實際玩、截圖、commit。
- Gemini（Gemini CLI，自動讀 `GEMINI.md`）：使用者雙擊 `Gemini改遊戲.bat` 直接開（伺服器＋瀏覽器＋Gemini 一起啟動）；
  Claude 也能透過 `.claude/gemini/ask.ps1` 呼叫（`prompt.txt` 進、`answer.txt` 出，模型寫在 `model.txt`）。
- ChatGPT（OpenAI Codex CLI 0.163.0，npm 全域安裝，自動讀 `AGENTS.md`）：使用者雙擊 `ChatGPT改遊戲.bat`，第一次要用 ChatGPT 帳號登入。
  桌面另有 `ChatGPT.lnk`（Edge App 視窗開 chatgpt.com，只能聊天、碰不到檔案）。Microsoft Store 版裝不了：Windows Update 服務被停用。
- 給其他 AI 的壓縮版交接（整份貼上就能接手，人看不懂沒關係）：`AI_HANDOFF.min.md`。
  API 金鑰目前是免費層，Pro 模型（`gemini-3.1-pro-preview`）要在 Google AI Studio 為金鑰的專案開帳單才能用。
- 換新的 AI 接手：在 `屠龍勇者/` 資料夾開啟它，第一句話說「先讀 AGENTS.md 和 HANDOFF.md，再告訴我你理解的現況」，確認它講對了再交代工作。
  如果新 AI 會自動讀別的檔名（例如 `.cursorrules`），在那個檔寫一行「請讀 AGENTS.md」即可。
