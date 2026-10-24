# 劇毒蛛后與中毒附魔 v1

使用者選擇新增毒系BOSS及專屬材料，並同意需要更新後端掉落。內建image_gen原創boss-source.png、material-source.png、soul-source.png、vfx-source.png；完整提示詞prompts.json，原稿皆保留。

prepare.py保留透明alpha並等比縮放：蛛后為256×224單姿勢模型，依現有怪物協定排成六列，並非六向新動畫；毒霧獵蛛沿用巨大蜘蛛素材。毒囊及封魂石為128×128專屬PNG；16格毒液爆發圖集1024×1024，單格256。既有world/status.png的中毒綠霧接到真實持續傷害工作，隨目標移動、結束即消失。

正式玩法見ARCHITECTURE.md第127節。tools/poison-enchant-preview.html是記憶體存檔且禁止連外的真實鍛造／封魂／傳送／sceneDraw預覽，強制觸發僅限此隔離頁，不改正式8%機率。tools/test-poison-enchant.js與test-boss-enchant.js為戰鬥回歸；test-server-loot-db.js使用隔離PGlite檢查真正後端SQL。

後端只更新資料目錄，無需改SQL函式、Supabase設定或SAVE_SCHEMA。需由使用者先在Supabase SQL Editor執行tools/loot-catalog.sql，再發布遊戲；AI沒有操作正式資料庫。

世界地圖追加（20261024al）：使用者選南境林道可步行抵達的洞穴入口。entrance-source.png及entrance-prompt.txt保留原稿與完整提示詞，正式384×320透明洞口位於世界格[164,125]，前方[164,127]；世界地圖地景與野外入口共用，名牌確認後收600金幣進獨立venomNest。來源及舊世界底圖保留，不改16塊分區；詳第131節。
