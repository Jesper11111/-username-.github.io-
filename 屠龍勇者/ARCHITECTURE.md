# 黑暗大陸（原名屠龍勇者）：架構文件

以「天堂 1」為藍本的**自動掛機 RPG**（單機，存檔在瀏覽器；可選擇登入帳號把存檔同步到雲端，第 29 節）。與「凡塵修仙傳」同一個 repo，放在子資料夾 `屠龍勇者/`，
網址 `<網站>/屠龍勇者/`。兩者完全獨立，不共用程式。修改前先讀本文件對應章節，修改後同步更新。

## 1. 專案結構

| 檔案 | 內容 |
| `images/sprites/morph/shadow-pirate-gunner-v1/`、`tools/sprite-src/morph/shadow-pirate-gunner-v1/`、`tools/pirate-morph-preview.html`、`tools/test-pirate-morph.js` | 06暗影海盜雙槍客36格透明動畫、原稿提示詞、卷軸接線與隔離驗證（第18.15、88節） |
| `images/ui/message-bubbles-v1.png`、`tools/icon-src/ui/message-bubbles-v1/`、`tools/message-button-preview.html` | 訊息專屬雙對話泡圖示及PC位置／抽屜預覽（第133節） |
| `images/icons/items/curAwaken-v1.png`、`tools/icon-src/items/awakening-stone-v1/` | 命運的覺醒石專屬虹彩晶石圖示，128px透明PNG；原稿、完整image_gen提示詞與尺寸輸出腳本（第80節） |
| `data/map-queue.js` | 五格異界地圖排程：卷軸張數、順序、開始／暫停／取消、通關換圖、存檔轉換與進度面板（第126節） |
| `tools/test-map-queue.js`、`tools/map-queue-preview.html` | 排程隔離測試與PC／手機實際外框預覽，不讀寫正式存檔、不連正式後端（第126節） |
| `tools/test-morph-level-lock.js`、`tools/morph-level-lock-preview.html` | 變身等級門檻／GM豁免、拒絕不扣卷、帳號切換與RPC失敗的隔離測試及預覽（第125節） |
| `tools/test-item-lock.js`、`tools/item-lock-preview.html` | 物品防賣鎖隔離測試與記憶體預覽：鎖定、全選、三種賣出、存檔遷移與倉庫合併（第124節） |
|---|---|
| `images/sprites/dolls/companions-v1/`、`tools/sprite-src/dolls/companions-v1/`、`tools/magic-doll-preview.html` | 21款魔法娃娃外觀素材、三參考圖／原稿／提示詞與打包、方向／逐格／實際大小預覽；品質T0～T4已定、能力待決定，尚未接遊戲（第115節） |
| `images/sprites/morph/frost-nether-emperor-v1/`、`tools/sprite-src/morph/frost-nether-emperor-v1/`、`tools/frost-emperor-morph-preview.html`、`tools/test-frost-emperor-morph.js` | 32霜獄幽冥魔皇：36格透明動畫、四參考／生成原稿／提示詞／腳點註冊、隔離卷軸與動作測試（第112節） |
| `images/sprites/morph/infernal-thunder-emperor-v1/`、`tools/sprite-src/morph/infernal-thunder-emperor-v1/`、`tools/infernal-emperor-morph-preview.html`、`tools/test-infernal-emperor-morph.js` | 31煉獄雷霆魔皇：36格透明動畫、原圖／生成提示詞／註冊與打包、隔離卷軸與renderer預覽及回歸（第111節） |
| `tools/vault-v2.sql`、`tools/vault-audit.sql`、`tools/test-vault-v2.js`、`tools/test-vault-v2-client.js` | 共用倉庫防複製 v2：伺服器存取直接改雲端存檔＋存檔序號守衛；只讀查帳 SQL；隔離 PGlite 的 SQL 測試與「真實遊戲＋假 Supabase 接 PGlite」端到端測試（第 93 節） |
| `tools/stat-cap.sql`、`tools/test-stat-cap.js` | 能力值單項 > 40（或型別不對、缺欄位）的玩家上傳一律拒收；隔離 PGlite 測試（第 94 節） |
| `tools/market-v2.sql`、`tools/test-market-v2.js` | 交易所防複製 v2：上架／下架／購買直接改雲端存檔、共用存取序號；隔離 PGlite 重跑 v1 三種複製手法（第 95 節）。端到端在 `test-vault-v2-client.js` |
| `tools/save-log-throttle.sql`、`tools/test-save-log-throttle.js` | 減少每次上傳存檔的資料庫寫入：存檔歷程與最後上線約 5 分鐘一筆、裝置紀錄同裝置 10 分鐘一筆；隔離 PGlite 測試（第 101 節） |
| `tools/loot-batch.sql`、`tools/test-loot-batch.js` | 後端掉寶減量：批次結算收據表、釋放不重寫作廢憑證、每次結算順手清理舊帳本；隔離 PGlite 測試（第 104 節）。端到端在 `test-vault-v2-client.js` |
| `tools/clan-character.sql` | 血盟綁角色的資料庫遷移、刪角退盟與自動接班、角色RPC及聊天／排行榜連動（第119節；由使用者執行） |
| `tools/test-clan-character.js`、`tools/test-clan-character-client.js` | 隔離資料庫與前端測試：角色血盟、舊資料遷移、刪角接班、切角與權限（第119節） |
| `tools/test-offline-drops.js` | 離線掛機掉落：篩選、依有效時間換算、負重上限、實跑離線結算（第 108 節） |
| `tools/char-owner.sql`、`tools/test-char-owner.js` | 一隻角色只能屬於一個帳號：歸屬登記表＋上傳檢查＋回填；隔離 PGlite 測試（第 109 節） |
| `tools/test-weapon-range.js` | 遠程武器射程：弓、槍 8 格、魔法 4 格、近戰 1 格、牆擋、技能距離與道具說明（第 110 節） |
| `tools/flag-trust.sql`、`tools/test-flag-trust.js` | 管理頁「排除」信任名單＋「已處理」24 小時內有效；隔離 PGlite 測試（第 111 節） |
| `tools/test-wipe.cjs` | 記憶體PostgreSQL載入正式SQL後驗證洗白：24張玩家資料表清空、帳號／管理者／封鎖與掉寶規則設定保留、重跑與每日鑽石重新起算（第37節）；不連正式服務 |
| `tools/BACKEND-LOOT-PLAN.md`、`tools/SERVER-LOOT.md` | 後端掉寶盤點與已確認的線上範圍、部署與限制說明；已上線並啟用（第91節） |
| `data/loot.js`、`tools/server-loot.sql`、`tools/loot-catalog.json`／`.sql`、`tools/server-loot-install.sql`、`tools/export-loot-catalog.js` | 後端遇怪／掉寶RPC、規則版本快照、重試佇列與存檔外層收據；合併安裝檔預設不啟用（第91節） |
| `tools/test-server-loot-db.js`、`tools/test-server-loot-integration.js`、`tools/test-server-loot-client.js`、`tools/server-loot-preview.html` | 隔離PostgreSQL與既有SQL／簽章相容測試、真實客戶端記憶體存檔與假RPC、瀏覽器重領／斷線驗證（第91節） |
| `images/sprites/morph/moon-ranger-v1/`、`tools/sprite-src/morph/moon-ranger-v1/` | 月光精靈巡林者透明素材／原稿／提示詞；m02 專屬圖，g 版新增 12 格 attack-v2（第 18.5、88 節） |
| `images/sprites/morph/hellfire-archer-v1/`、`tools/sprite-src/morph/hellfire-archer-v1/` | 冥火骷髏神射 36 格透明人物／3 獨立箭矢、原圖／補畫原稿／提示詞／整理腳本；m03 專屬圖，20261022j 接入（第 18.6、88 節） |
| `images/sprites/morph/sky-valkyrie-v1/`、`tools/sprite-src/morph/sky-valkyrie-v1/` | 蒼穹女武神・艾爾舊72格外觀、原創分鏡與來源（第18.7節）；l接入m04，p改讀v2，v1完整保留 |
| `images/sprites/morph/sky-valkyrie-v2/`、`tools/sprite-src/morph/sky-valkyrie-v2/`、`tools/valkyrie-v2-morph-preview.html`、`tools/test-valkyrie-v2-morph.js` | 使用者新版04分鏡替換、36格透明圖集／來源／提示詞／腳點註冊、隔離renderer與卷軸回歸（第18.11、88節） |
| `images/sprites/morph/dwarf-gunner-v1/`、`tools/sprite-src/morph/dwarf-gunner-v1/` | 05矮人蒸氣火銃兵36格透明分鏡／4圖集、立繪／原表／去背初稿／補畫／提示詞／整理腳本（第18.8節）；m05專屬外觀 |
| `tools/dwarf-morph-preview.html`、`tools/test-dwarf-morph.js` | 05真實卷軸／renderer隔離預覽與卷軸扣量、四向動作、到期／其他變身回歸（第18.8節） |
| `tools/sprite-src/poison-boss-v1/`、`tools/poison-enchant-preview.html`、`tools/test-poison-enchant.js` | 劇毒蛛后、毒囊與封魂石／毒液特效原稿、提示詞、打包工具與隔離驗證（第127節） |
| `images/sprites/morph/silent-cave-assassin-v1/`、`tools/sprite-src/morph/silent-cave-assassin-v1/`、`tools/cave-assassin-morph-preview.html`、`tools/test-cave-assassin-morph.js` | 08沉默洞穴刺客36格透明動畫、來源與驗證（第18.14、88節） |
| `images/sprites/morph/brudika-shadow-v1/`、`tools/sprite-src/morph/brudika-shadow-v1/`、`tools/brudika-morph-preview.html`、`tools/test-brudika-morph.js` | 10布魯迪卡之影36格透明動畫、原稿／提示詞／腳點註冊、真實renderer隔離頁與卷軸回歸（第18.9、88節） |
| `images/sprites/morph/rift-dragon-v1/`、`tools/sprite-src/morph/rift-dragon-v1/`、`tools/rift-dragon-morph-preview.html`、`tools/test-rift-dragon-morph.js` | 27裂空魔龍爪皇36格透明動畫、原圖／生成提示詞／腳點註冊、卷軸與renderer隔離驗證（第18.10、88節） |
| `images/sprites/morph/flame-death-knight-v1/`、`tools/sprite-src/morph/flame-death-knight-v1/`、`tools/flame-death-knight-morph-preview.html`、`tools/test-flame-death-knight-morph.js` | 16烈焰死亡騎士原36格保留；新版走8／攻6、卷軸選單與renderer隔離驗證（第18.12～18.13、88節） |
| `tools/sprite-src/morph/flame-death-knight-walk-v2/`、`tools/sprite-src/morph/flame-death-knight-attack-v2/`、`tools/flame-death-knight-walk-preview.html`、`tools/test-flame-death-knight-walk.js` | 16新版步態24格與單手斬18格來源／提示詞／註冊／打包／試播；實際地面位移與新舊速度回歸（第18.13節） |
| `tools/hellfire-attack-preview.html`、`tools/test-hellfire-attack.js` | 紫變新版攻擊的實際renderer隔離預覽與四方向命中／MISS回歸（第18.6節） |
| `tools/moon-attack-preview.html`、`tools/test-moon-attack.js`、`tools/sprite-src/morph/update-motion-previews.py` | 紅變實際 renderer 隔離試播、命中／MISS 動作回歸、嵌入式動畫試播素材更新工具（第 18.5 節） |
| `images/sprites/morph/wolf-ranger-v1/`、`tools/sprite-src/morph/wolf-ranger-v1/` | 巡守妖魔神射變身素材：36 格透明動作、4 圖集、腳底規格與原稿／提示詞（第 18.4 節）；變形卷軸使用 walk／attack／cast／hit 四張圖集（第 88 節） |
| `tools/MORPH-DESIGN.md` | 使用者給的 30 種變身設計稿（名稱、系別、階級、外觀與特效重點），做變身圖時照這份（第 88 節） |
| `images/icons/items/polyScroll.png`、`tools/make-poly-icon.ps1` | 變形卷軸道具圖（羊皮紙卷軸＋變身人物第一格合成，128×128；第 88 節） |
| `tools/icon-src/poly-scroll-samples-20261022/` | 變形卷軸四款外觀樣品、內建image_gen原圖／完整提示詞、128px圖與40px對照、排版腳本；B款已選並接入，其餘保留（第88、90節） |
| `images/icons/items/polyScroll-v2.png` | 使用者選 B 紫晶幻化卷軸，128px透明PNG；舊polyScroll.png保留（第90節） |
| `tools/test-buff-groups.js`／`tools/buff-groups-preview.html` | 狀態三區分類隔離測試／PC及390px窄螢幕互動預覽；不發佈（第90節） |
| `images/icons/items/`、`tools/icon-src/items/`、`tools/item-art-*.json`、`tools/cut-item-art.ps1`、`tools/cut-single-item-art.ps1`、`tools/item-art-contact.ps1`、`tools/item-art-preview.html`、`tools/test-item-art.js` | 285 張原創道具 PNG、17 張原始圖集＋19 張單件原稿、名稱對照與生成提示詞、透明連通區裁切、縮圖總覽、432 件道具隔離圖庫與接線檢查（第 80、82、83 節）。tools 不發佈 |
| `tools/legend-glow-preview.html`、`tools/test-legend-glow.js` | 全部 28 件傳說裝備的呼吸光暈、背包／角色／鍛造隔離預覽與品級範圍驗證（第 84 節） |
| `tools/legend-equipment-art.json`、`tools/legend-equipment-preview.html`、`tools/test-legend-equipment.js` | 十二職業傳說代表武器與兩套七部位防具、原創單件提示詞／來源、隔離介紹與鍛造測試（第 83 節） |
| `tools/hero-armor-art.json`、`tools/icon-src/items/hero-armor-01.png`、`tools/test-hero-armor.js` | 新增 11 件英雄防具的原創圖集／提示詞與隔離驗證（第 82 節） |
| `images/maps/wild-titan*`、`tools/bigmap/titan-tomb.png`、`tools/bigmap/titan-generated.json`、`tools/titan-map-preview.html`、`tools/test-titan-map.js` | 泰坦墓穴原創素材、新版世界／小地圖／遮擋、生成紀錄、隔離預覽及地圖連通測試（第 78 節） |
| `tools/weapon-glow-preview.html`、`tools/inspect-weapon-sprites.ps1`、`tools/weapon-sprite-specs.json` | 十二職業逐格武器貼合預覽、透明度檢查與來源動作表檢視（第 79 節） |
| `tools/scene-label-preview.html` | 使用實際 sceneDraw 預覽一般怪／精英／首領的腳下名稱，不載存檔及雲端（第 81 節） |
| `data/world-vfx.js`、`images/vfx/world/`、`tools/world-vfx-preview.html`、`tools/test-world-vfx.js` | 十類 48 款視覺特效、十二張透明圖集、隔離並排預覽與測試（第 74 節）；生成紀錄在 `tools/sprite-src/boss-vfx/world-prompts.json` |
| `images/vfx/` 新增二十套 PNG、`tools/vfx-preview.html`、`tools/sprite-src/boss-vfx/generated-prompts.json` | 其餘二十種附魔的原創透明動畫、隔離的 25 種並排預覽、生成提示詞與來源紀錄（第 73 節）。tools 不發佈 |
| `images/vfx/bull.png`、`ice.png`、`ghost.png`、`death.png`、`king.png` | 五套 BOSS 附魔動畫，各 4×4 格；死神上下各八格對應紫／紅色，幽靈前四格預警、後十二格爆炸（第 72 節）。原圖保存於 `tools/sprite-src/boss-vfx/` |
| `AGENTS.md`、`HANDOFF.md`、`AI_HANDOFF.min.md` | **給 AI 的文件**（遊戲不載入）：`AGENTS.md` 任何 AI 通用的工作規則與獨立發佈流程；`HANDOFF.md` 目前進度、待辦、使用者的決定、環境、常用操作；`AI_HANDOFF.min.md` 給其他 AI 的壓縮版全貌（規則＋檔案＋核心公式＋現況，整份貼給新 AI 即可接手）。換 AI 接手時靠這三份，要保持最新。`CLAUDE.md`／`GEMINI.md` 只是各 AI 自動讀的入口（`GEMINI.md` 用 `@./AGENTS.md` 匯入） |
| `Gemini改遊戲.bat`、`ChatGPT改遊戲.bat` | 雙擊啟動：本機伺服器 8790＋開瀏覽器＋Gemini CLI（`--approval-mode auto_edit`）／OpenAI Codex CLI（自動讀 `AGENTS.md`）；PATH 補 node、npm、GitHub Desktop 的 git |
| `tools/build.js` | **發佈用建置＋混淆**（第 60 節）：42 支 `data/*.js` 接成一支 `data/game.js` 包進函式範圍＋terser 混淆、gm.html 用的接成 `data/gm-lib.js`。由根目錄 `tools/build.js`（GitHub Actions）呼叫 `buildDragon`，開發與測試照舊用原始檔 |
| `tools/check.ps1` | 改完的自動檢查：JS 語法（`node --check`）、`index.html` 所有 `?v=` 等於 `GAME_VERSION`、每個 `data/*.js` 都有載入、沒有衝突標記；通過印 `ALL CHECKS PASSED` |
| `index.html` | 版面、全部 CSS、三個畫面（title／create／game）、`<script>` 載入 |
| `data/config.js` | 版本號、存檔 key、各種常數、遊戲時鐘 `gameNow`、`rand/chance/clamp/fmt`、**天堂經驗表** `expToNext`／`huntExpRate`／`deathLossRate`、經驗倍率 `EXP_RATE`、離線收益常數、`SIM_MODE` |
| `data/classes.js` | `STAT_KEYS`、`STAT_NAMES`、創角規則、`CLASSES`（12 職業，含 `slayer` 種族剋制） |
| `data/skills.js` | 共用魔法 1～10 級 `MAGIC`、各職業魔法上限 `MAGIC_CLASS`、職業專屬技能 `SKILLS[職業]`、索引 `SKILL_BY_ID`、`findSkill`／`skillNeedLv`／`classSkillList`（第 40 節） |
| `data/items.js` | `WEAPON_TYPES`、`SLOTS`、`BUFF_DEFS`、`ITEMS`（武器／防具／藥水／卷軸／彈藥／材料）、`RECIPES`、`isStackable`、`sellPriceOf` |
| `data/spellbook.js` | **魔法書**：每招一本 `book_技能id`（載入時併入 `ITEMS`，cat `book`）、商店價格／掉落、學習 `learnBook`／`bookLearnError`、說明 `bookInfoHtml`、掉落 `rollBookDrop`（第 40 節） |
| `data/monsters.js` | `monBase` 等級基準數值、`MONSTERS`、永夜之塔主題與首領、專屬材料索引 `TOWER_BOSS_MATERIALS`、`buildMonster/makeMonster/makeTowerMonster`、`COMMON_DROPS` |
| `data/zones.js` | `TOWNS`（4 村）、`ZONES`（狩獵地圖＋龍穴）、`ZONE_BY_ID`、`DRAGON_IDS` |
| `data/quests.js` | `CLASS_STORIES` 職業故事、`CLASS_QUESTS` 職業任務線、任務獎勵裝備（併入 `ITEMS`）、任務邏輯（第 13 節） |
| `data/resonance.js` | **共鳴裝備**：`RESONANCE`（31 把武器＋23 件防具／飾品的專屬特效，寫進 `ITEMS[id].res`）、新裝備 `RESONANCE_NEW_ITEMS`／`RESONANCE_ARMOR_ITEMS`、首領／龍／塔掉落與神話配方、戰鬥觸發 `resonanceOnHit`／`resonanceOnHurt`／`resonanceFlush`／`resonanceReady`／`castResonance`、介面 `resonanceHtml`／`resonanceChip`（第 27、28 節） |
| `data/boss-vfx.js` | **BOSS 特效**：五種專屬 Canvas 動畫、地面／人物後方／前景分層、鍛造無消耗預覽（第 71 節），載入於 boss-enchant 之後 |
| `data/boss-enchant.js` | **BOSS 附魔／封魂**：25 種 `BOSS_ENCHANTS`、25 種技能封魂石、鍛造入口、直接附魔與封魂移轉、獨立傷害／控場／護盾／延遲事件／原創程序特效（第 68 節）；載入時依賴 items、monsters |
| `data/player.js` | `player`、遊戲訊息 `addLog`、`DEFAULT_SETTINGS`、創角、背包／裝備、增益、**能力計算 `calcStats`**、升級、萬能藥 |
| `data/affix.js` | 暗黑式裝備詞綴：`AFFIXES`、品質 `QUALITY`、`rollQuality`／`applyAffixes`／`affixFx`／`qualityName`／`instSellPrice`／`randomEquipFor`（第 21 節） |
| `data/craft.js` | 製作通貨 `CURRENCY`（8 種，載入時併入 `ITEMS`）、`useCurrency`、改造視窗 `openCraftDialog`；通貨用在地圖時轉給 maps.js 的 `MAP_CURRENCY`（第 23 節） |
| `data/maps.js` | 異界地圖 T1～T15：地圖道具、`MAP_MODS`、`openMap`／`mapOnKill`／`completeMap`／`endMapRun`、回卷傳送門 `mapPortalOpen`／`enterMapPortal`（第 114 節）、`applyMapMods`、`mapBonus`、地圖掉落、異界裝置面板（第 24 節） |
| `data/enchant.js` | 衝裝規則 `doEnchant`、成功率、可強化目標 |
| `data/combat.js` | 掛機戰鬥：`hunt` 狀態、尋怪、玩家行動、怪物攻擊、掉落、死亡、自動補給、回家、步行、自然回復 |
| `data/town.js` | 村莊設施：傳送、商店、回收、旅館、倉庫、鍛造；龍穴進入條件 |
| `data/guard.js` | **防改檔**（第 60 節）：本機存檔加密＋簽章 `saveEncode`／`saveDecode`／`saveParse`／`saveFormatMigrate`、雲端存檔簽章 `guardCloudSig`／`guardSaveCanon`／`guardCheckCloud`、記憶體數值偽裝 `guardWrap`、改檔標記 `guardFlag`（`player.integrity`） |
| `data/save.js` | 存讀檔（本機文字一律經過 guard.js 加解密）、舊存檔補欄位（`migrateSave`）、匯出／匯入、`lastSaveAt`；**多角色欄位** `currentSlot`／`slotKey`／`readSlotSummary`（第 25 節） |
| `data/cloud.js` | **帳號登入＋雲端存檔**（Supabase）：設定 `CLOUD_SUPABASE_URL`／`CLOUD_SUPABASE_KEY`（空＝不啟用）、`initCloud`、登入合併 `cloudSync`、上傳 `cloudMarkDirty`／`cloudFlush`／`cloudPushSlot`、衝突處理、登入對話框 `openCloudDialog`、設定區塊 `cloudSettingsHtml`（第 29 節） |
| `data/offline.js` | 離線收益：快轉模擬量測效率 `measureHunt`、結算 `applyOffline`、報告 `showOfflineReport`（第 14 節） |
| `data/ui.js` | `# 黑暗大陸（原名屠龍勇者）：架構文件

以「天堂 1」為藍本的**自動掛機 RPG**（單機，存檔在瀏覽器；可選擇登入帳號把存檔同步到雲端，第 29 節）。與「凡塵修仙傳」同一個 repo，放在子資料夾 `屠龍勇者/`，
網址 `<網站>/屠龍勇者/`。兩者完全獨立，不共用程式。修改前先讀本文件對應章節，修改後同步更新。

## 1. 專案結構

| 檔案 | 內容 |
|---|---|
| `AGENTS.md`、`HANDOFF.md`、`AI_HANDOFF.min.md` | **給 AI 的文件**（遊戲不載入）：`AGENTS.md` 任何 AI 通用的工作規則與獨立發佈流程；`HANDOFF.md` 目前進度、待辦、使用者的決定、環境、常用操作；`AI_HANDOFF.min.md` 給其他 AI 的壓縮版全貌（規則＋檔案＋核心公式＋現況，整份貼給新 AI 即可接手）。換 AI 接手時靠這三份，要保持最新。`CLAUDE.md`／`GEMINI.md` 只是各 AI 自動讀的入口（`GEMINI.md` 用 `@./AGENTS.md` 匯入） |
| `Gemini改遊戲.bat`、`ChatGPT改遊戲.bat` | 雙擊啟動：本機伺服器 8790＋開瀏覽器＋Gemini CLI（`--approval-mode auto_edit`）／OpenAI Codex CLI（自動讀 `AGENTS.md`）；PATH 補 node、npm、GitHub Desktop 的 git |
| `tools/build.js` | **發佈用建置＋混淆**（第 60 節）：42 支 `data/*.js` 接成一支 `data/game.js` 包進函式範圍＋terser 混淆、gm.html 用的接成 `data/gm-lib.js`。由根目錄 `tools/build.js`（GitHub Actions）呼叫 `buildDragon`，開發與測試照舊用原始檔 |
| `tools/check.ps1` | 改完的自動檢查：JS 語法（`node --check`）、`index.html` 所有 `?v=` 等於 `GAME_VERSION`、每個 `data/*.js` 都有載入、沒有衝突標記；通過印 `ALL CHECKS PASSED` |
| `index.html` | 版面、全部 CSS、三個畫面（title／create／game）、`<script>` 載入 |
| `data/config.js` | 版本號、存檔 key、各種常數、遊戲時鐘 `gameNow`、`rand/chance/clamp/fmt`、**天堂經驗表** `expToNext`／`huntExpRate`／`deathLossRate`、經驗倍率 `EXP_RATE`、離線收益常數、`SIM_MODE` |
| `data/classes.js` | `STAT_KEYS`、`STAT_NAMES`、創角規則、`CLASSES`（12 職業，含 `slayer` 種族剋制） |
| `data/skills.js` | 共用魔法 1～10 級 `MAGIC`、各職業魔法上限 `MAGIC_CLASS`、職業專屬技能 `SKILLS[職業]`、索引 `SKILL_BY_ID`、`findSkill`／`skillNeedLv`／`classSkillList`（第 40 節） |
| `data/items.js` | `WEAPON_TYPES`、`SLOTS`、`BUFF_DEFS`、`ITEMS`（武器／防具／藥水／卷軸／彈藥／材料）、`RECIPES`、`isStackable`、`sellPriceOf` |
| `data/spellbook.js` | **魔法書**：每招一本 `book_技能id`（載入時併入 `ITEMS`，cat `book`）、商店價格／掉落、學習 `learnBook`／`bookLearnError`、說明 `bookInfoHtml`、掉落 `rollBookDrop`（第 40 節） |
| `data/monsters.js` | `monBase` 等級基準數值、`MONSTERS`、永夜之塔主題與首領、專屬材料索引 `TOWER_BOSS_MATERIALS`、`buildMonster/makeMonster/makeTowerMonster`、`COMMON_DROPS` |
| `data/zones.js` | `TOWNS`（4 村）、`ZONES`（狩獵地圖＋龍穴）、`ZONE_BY_ID`、`DRAGON_IDS` |
| `data/quests.js` | `CLASS_STORIES` 職業故事、`CLASS_QUESTS` 職業任務線、任務獎勵裝備（併入 `ITEMS`）、任務邏輯（第 13 節） |
| `data/resonance.js` | **共鳴裝備**：`RESONANCE`（31 把武器＋23 件防具／飾品的專屬特效，寫進 `ITEMS[id].res`）、新裝備 `RESONANCE_NEW_ITEMS`／`RESONANCE_ARMOR_ITEMS`、首領／龍／塔掉落與神話配方、戰鬥觸發 `resonanceOnHit`／`resonanceOnHurt`／`resonanceFlush`／`resonanceReady`／`castResonance`、介面 `resonanceHtml`／`resonanceChip`（第 27、28 節） |
| `data/player.js` | `player`、遊戲訊息 `addLog`、`DEFAULT_SETTINGS`、創角、背包／裝備、增益、**能力計算 `calcStats`**、升級、萬能藥 |
| `data/affix.js` | 暗黑式裝備詞綴：`AFFIXES`、品質 `QUALITY`、`rollQuality`／`applyAffixes`／`affixFx`／`qualityName`／`instSellPrice`／`randomEquipFor`（第 21 節） |
| `data/craft.js` | 製作通貨 `CURRENCY`（8 種，載入時併入 `ITEMS`）、`useCurrency`、改造視窗 `openCraftDialog`；通貨用在地圖時轉給 maps.js 的 `MAP_CURRENCY`（第 23 節） |
| `data/maps.js` | 異界地圖 T1～T15：地圖道具、`MAP_MODS`、`openMap`／`mapOnKill`／`completeMap`／`endMapRun`、回卷傳送門 `mapPortalOpen`／`enterMapPortal`（第 114 節）、`applyMapMods`、`mapBonus`、地圖掉落、異界裝置面板（第 24 節） |
| `data/enchant.js` | 衝裝規則 `doEnchant`、成功率、可強化目標 |
| `data/combat.js` | 掛機戰鬥：`hunt` 狀態、尋怪、玩家行動、怪物攻擊、掉落、死亡、自動補給、回家、步行、自然回復 |
| `data/town.js` | 村莊設施：傳送、商店、回收、旅館、倉庫、鍛造；龍穴進入條件 |
| `data/guard.js` | **防改檔**（第 60 節）：本機存檔加密＋簽章 `saveEncode`／`saveDecode`／`saveParse`／`saveFormatMigrate`、雲端存檔簽章 `guardCloudSig`／`guardSaveCanon`／`guardCheckCloud`、記憶體數值偽裝 `guardWrap`、改檔標記 `guardFlag`（`player.integrity`） |
| `data/save.js` | 存讀檔（本機文字一律經過 guard.js 加解密）、舊存檔補欄位（`migrateSave`）、匯出／匯入、`lastSaveAt`；**多角色欄位** `currentSlot`／`slotKey`／`readSlotSummary`（第 25 節） |
| `data/cloud.js` | **帳號登入＋雲端存檔**（Supabase）：設定 `CLOUD_SUPABASE_URL`／`CLOUD_SUPABASE_KEY`（空＝不啟用）、`initCloud`、登入合併 `cloudSync`、上傳 `cloudMarkDirty`／`cloudFlush`／`cloudPushSlot`、衝突處理、登入對話框 `openCloudDialog`、設定區塊 `cloudSettingsHtml`（第 29 節） |
| `data/offline.js` | 離線收益：快轉模擬量測效率 `measureHunt`、結算 `applyOffline`、報告 `showOfflineReport`（第 14 節） |
、`esc`、`setHtmlStable`（只改有變的節點，第 62 節）、`showScreen`、`bar`、狀態列 `renderStatus`、`showToast`、`openDialog/gameAlert/gameConfirm` |
| `data/sfx.js` | **音效**（第 44 節）：`SFX_DEFS`、`sfx(name, soft)`、`sfxHit(crit, ranged)`、設定區塊 `sfxSettingsHtml`／`setSfxOn`／`setSfxVol`；開關與音量存在 localStorage `dragonSlayer_sfx` |
| `data/bgm.js` | **背景音樂**（第 44 節）：`BGM_LISTS`（野外 `field`、村莊 `town`）、`bgmUpdate`（每 0.5 秒依位置切換、淡入淡出）、設定列 `bgmSettingsHtml`／`setBgmOn`／`setBgmVol`；存在 localStorage `dragonSlayer_bgm` |
| `data/ui-create.js` | 標題畫面、**人物選單**（`openCharSelect`，第 25 節）、創角（選職業、配點、取名） |
| `data/raid.js` | **團隊副本**：`RAIDS`（6 個副本）、團戰模擬 `raidSimulate`、獎勵 `raidApplyReward`／`raidClaim`、隊伍大廳（Supabase `raid_rooms`／`raid_members`）、重播畫面；載入時把 `raid` 加進 `TABS`／`PANEL_FNS`（第 30 節） |
| `data/chat.js` | **聊天**：世界／隊伍頻道、`renderChat`、`chatFetch`（分頁開著時每 4 秒抓新訊息）、`chatSend`、`chatOpen`；載入時把 `chat` 加進 `TABS`／`PANEL_FNS`（第 32 節）；GM 指令 `/give`（`chatCommand`，第 128 節） |
| `data/clan.js` | **血盟**：`myClan`／`myClanRole`、`clanLoad`、建立／加入／審核／踢人／任命／讓位／退出／解散（都呼叫 Supabase `clan_*` 函式）、`renderClan`；載入時把 `clan` 加進 `TABS`／`PANEL_FNS`（第 33 節） |
| `data/rank.js` | **排行榜**：`RANK_KINDS`（等級／屠龍／永夜之塔／擊殺／血盟）、`rankLoad`（呼叫 Supabase `dragon_leaderboard`，同一榜 1 分鐘快取）、`renderRank`；載入時把 `rank` 加進 `TABS`／`PANEL_FNS`（第 34 節） |
| `data/wb.js` | **世界首領**：`WB_KINDS`（5 隻首領的種族與招式）、`wbLoad`、`wbAttack`（60 秒模擬→`wb_attack`）、`wbClaim`／`wbReward`（領獎）、`renderWb`；載入時把 `wb` 加進 `TABS`／`PANEL_FNS`（第 35 節） |
| `data/market.js` | **交易所**：寄賣、瀏覽／搜尋／購買、出售、我的上架、交貨 `marketDeliver`（兩段式＋`player.marketGot`）、`marketGiveItem`；載入時把 `market` 加進 `TABS`／`PANEL_FNS`（第 36 節） |
| `data/auction.js` | 鑽石拍賣、3h／2h輪次、號碼牌排隊、競標／刊登／領取及GM門檻；vault後載入（第138節） |
| `tools/auction.sql` | 使用者同意新增的拍賣資料表／鑽石託管RPC；由使用者自行貼到Supabase安裝，不改既有SQL |
| `tools/test-auction-db.js`／`tools/test-auction-client.js` | 隔離PGlite後端交易／輪次／權限與客戶端費用／確認／門檻檢查 |
| `data/vault.js` | 帳號共用倉庫、鑽石（每日登入、掉落）、離線掛機扣鑽石（第 38 節） |
| `data/presence.js` | 村莊看得到其他在線玩家（Supabase Realtime presence／broadcast）、點人聊天／邀請組隊（第 39 節） |
| `data/codex.js` | 裝備圖鑑分頁 `renderCodex`（全部道具的分類、品質、屬性、取得方式；第 20 節），載入時把 `codex` 加進 `TABS`／`PANEL_FNS` |
| `data/ui-frame.js` | 主畫面外框：畫面尺寸模式 `displayMode`／`setDisplayMode`、`layoutFrame` 縮放、左右柱抽屜、紅藍法球、底部 6 格快捷（第 15、16 節） |
| `data/icons.js` | **圖示**（第 41 節）：原創 SVG 符號 `ICON_SYM`、`iconSvg`（B 款發光填色）、藥水瓶 `flaskSvg`、技能自動配圖 `buildSkillIconMap`／`skillIconHtml`、道具 `itemIconHtml`、地圖左上角狀態 `buffIconsHtml` |
| `data/hotbar.js` | **快捷欄**（第 40 節）：格子 HTML `barSlotHtml`、`renderHotbar`（手機地圖下方兩排／PC 外框 `#hotbar`）、`barUse`／`barToggleAuto`／`openBarPicker`／`barPick`／`barPlaceSkill`／`resetSkillSlots`、點一下／往下拉／長按手勢 |
| `data/scene-art.js` | 原創場景配置、16 分區行走區、4 城鎮／6 塔龍穴、塔怪圖片與地面光影（第 86 節） |
| `data/world-atlas.js` | 獨立世界總覽與 23 地標；資訊、縮放、沿道路步行（第 86 節） |
| `scene-art.css` | 世界總覽視窗樣式；下方骷髏造型沿用 index.html |
| `images/maps/rework/`、`images/monsters/rework/`、`images/npc/rework/` | 本次原創場景／塔怪／城鎮 NPC 圖片；原稿及提示詞在 tools/scene-rework（第 86 節） |
| `data/ui-scene.js` | 中間即時地圖：俯視格子地圖、角色上下左右尋怪、怪物遊走、傷害飄字、村莊建築（第 17 節） |
| `data/ui-panels.js` | 主畫面 8 個分頁（狩獵／地圖／人物狀態／背包／技能／任務／村莊／設定）、道具對話框、衝裝選擇、匯出入 |
| `data/pwa.js` | PWA：註冊 SW、安裝說明 `openInstallGuide`、新版本提示、持久儲存（第 12 節） |
| `data/main.js` | 主迴圈 `gameTick`（每 100ms）、繼續遊戲、啟動（呼叫 `initPwa`） |
| `gm.html` | **管理頁**（不是遊戲的一部分）：可疑紀錄、玩家存檔歷程、封鎖／解除封鎖、🎁 發放道具（第 128 節）；載入 config／classes／cloud.js 取得 Supabase 設定（第 31 節） |
| `manifest.json` | App 名稱、圖示、`scope: ./`（只涵蓋本資料夾） |
| `sw.js` | Service Worker，快取名稱 `dragon-` 開頭（第 12 節） |
| `images/` | `icons/` 圖片圖示（藥水 `potion-*.jpg`、技能 `sk/`，第 41 節）；App 圖示：`icon-192/512.png`、`icon-maskable-512.png`、`apple-touch-icon.png`；主畫面外框 `frame-nopillar.png`（去掉拱門與左右石柱，第 54 節；`frame-notop.jpg`、原版 `frame.jpg` 保留；第 15 節）、PC 橫式外框 `frame-pc.jpg`＋遮罩 `frame-pc-mask.png`（第 19 節）；`sprites/` 人物模型、`classes/` 職業立繪、十二職業合照 `all.jpg` 、創角舞台去背圖 `classes/stage/`（合照中的人）與 `classes/hero/`（立繪全身像）（第 18 節）；`maps/ruins.jpg` 野外地圖背景、`maps/tower.jpg` 永夜之塔通用地圖（第 52 節）、`npc/tower-keeper.png`／`ivory-keeper.png`＋`-face.jpg` 永夜之塔／暮光法師塔傳送師（第 55、56 節）、`maps/village.webp` 村莊背景（第 17 節）、`maps/wild.jpg`＋`wild-mini.jpg` 低語海岸大地圖與小地圖（第 45 節；12 個地圖合併、6016×4768＝188×149 格，第 67 節）、`wild-occ.png` 遮擋深度圖（第 46 節） |
| `tools/test-shop-buy.js` | 自訂購買數量隔離測試：整數／金額驗證、金幣與負重、裝備逐件建立、離村拒絕舊視窗（第 75 節；不發佈） |
| `tools/test-log-drawer.js` | 訊息框定位回歸測試：PC 頂端樓層按鈕不推高訊息框、手機避開操作列（第 76 節；不發佈） |
| `tools/test-loot-log.js` | 掉落紀錄隔離整合測試：實際掉落／超重／自動賣出／任務／地圖、分頁與模擬隔離（第 77 節；不發佈） |
| `sounds/` | 音效 mp3（23 個，Freesound CC0＋Mixkit 免費授權），來源與用途在 `sounds/CREDITS.md`（第 44 節） |
| `music/` | 背景音樂 m4a（AAC 128kbps）：`field1.m4a`／`field2.m4a`＝使用者給的「遊戲音樂」「遊戲音樂2」（野外）、`town1.m4a`＝「城鎮音樂」（村莊）（第 44 節） |
| `tools/` | 開發工具（遊戲不載入）：`supabase.sql` 雲端存檔與團隊副本的資料表、RLS 規則（貼到 Supabase SQL Editor，第 29 節）；`anticheat.sql` 交易所門檻＋雲端存檔簽章＋改檔標記（第 60 節，也附在 `supabase.sql` 最後）；`client-version.sql` 擋舊版遊戲上傳（第 29 節「刪除角色」，也附在 `supabase.sql` 最後）；`vault.sql` 共用倉庫／鑽石／離線掛機（第 38 節）；`wipe.sql` 正式上線刪檔用（第 37 節）；`cut-sprites.ps1` 切人物動作表、`sprite-src/` 原圖與裁切規格（第 18.1 節）；`stage/npc-cut.ps1` 野外 NPC 去背（第 55 節）；`cut-icons.ps1` 切技能圖示大圖、`icon-src/` 原圖（第 41 節）；`bigmap/` 大地圖的原圖（含南排 `mine.jpg` 礦坑、`dragon-cave.jpg` 龍窟）、拼圖 `build-map.ps1`、可走範圍與遮擋設定 `walk.json`、檢查圖 `check-mask.ps1`、遮擋深度圖 `build-occ.ps1`（第 45、46 節） |

## 2. 載入順序與依賴

`config → classes → skills → items → spellbook → monsters → zones → quests → resonance → boss-enchant → boss-vfx → world-vfx → player → enchant → affix → craft → maps → combat → town → guard → save → cloud → offline → ui → sfx → bgm → ui-create → ui-panels → codex → raid → clan → chat → rank → wb → market → vault → auction → presence → ui-frame → map-queue → icons → hotbar → scene-art → ui-scene → world-atlas → pwa → loot → main`

- 上層資料檔（config～quests）只在「載入時」用到更前面的檔案；quests 載入時會把獎勵裝備與任務道具寫進 `ITEMS`，所以要在 items 之後。
- resonance 載入時要改 `ITEMS`（含任務武器）、`MONSTERS` 掉落、`RECIPES`，所以在 quests 之後；`findSkill`（skills.js）在執行期才呼叫它的 `findResonanceSkill`。
- boss-enchant 在 resonance 後、player 前載入；載入時使用 ITEMS、TOWER_BOSS_MATERIALS，產生 25 種 soul_材料id 封魂石。玩家、戰鬥與介面只在執行期使用。
- player 之後的檔案互相呼叫（例如 combat 呼叫 `refreshUI`、town 呼叫 `startHunt`），都發生在執行期，全部載完才會跑，所以沒問題。
- map-queue.js在ui-frame後、icons前載入，載入時使用TABS／PANEL_FNS註冊分頁；maps／combat／save在執行期呼叫排程函式，main啟動前已全部載入。
- 新檔案依它「載入時」需要的東西插入；只在執行期用到的不影響順序。

## 3. 開發規則

- **版本號**：改任何 JS 都要把 `index.html` 全部 `?v=` 與 `config.js` 的 `GAME_VERSION` 一起換新（目前 `20261025k`；使用者2026-10-24同意z後延伸為aa）。
- **防改檔（第 60 節）**：讀寫 localStorage 存檔一律用 `saveParse(raw)`／`saveEncode(JSON.stringify(…))`，不要直接 `JSON.parse`／`JSON.stringify` 存檔文字；
  `player` 換成新物件時（例如從快照還原）要 `guardWrap(player)`；`onclick="…"` 只呼叫頂層函式（發佈版是混淆過的，`player` 不在 window 上）。
- **合併衝突**：合併後一定要搜尋 `<<<<<<<`。2026-10-09 曾把衝突標記留在 `index.html`／`config.js`／`ui-scene.js`，
  整個遊戲載不起來（看起來像「存檔壞掉」，其實存檔還在），`20261009u` 修復時採用較新的 `20261009t` 那一邊。
  SW 依版本號快取 JS，**沒換版本號，已安裝 App 的玩家會一直跑舊程式**。
- **存檔 key** 用 `dragonSlayer_` 前綴（與修仙同網域，localStorage 共用）；多角色欄位見第 25 節。改存檔結構時 `SAVE_SCHEMA +1` 並在 `migrateSave` 補轉換。
- 不用原生 `alert/confirm`，用 `gameAlert/gameConfirm/showToast`。
- `onclick="…"` 字串只呼叫頂層函式並傳字面值，不直接寫 `player`（與修仙的混淆建置規則一致）。
- **時間**：增益、冷卻、喝水間隔、步行、掛機統計用 `gameNow`（遊戲時鐘）。主迴圈每次加上**真實經過的時間** `gap`（2026-10-12 起，版本 `20261012x`；戰鬥、回血仍用最多 1 秒的 `dt`）。
  以前只加 dt，手機切到背景後 gameNow 會落後真實時間好幾小時，載入別台裝置的雲端存檔時冷卻／增益變成幾千秒（暗影斬冷卻 6946 秒）。
  另外 `player.js` 的 `clockSanity()`（`cleanBuffs` 每次呼叫）把 `player.cds` 夾在技能／共鳴原本的冷卻內（查不到用 180 秒），`player.buffs` 夾在道具／技能的 `sec` 內（查不到用 600 秒），舊存檔也會自動修好；
  只有龍穴冷卻等「真實時間」用 `Date.now()`。模擬測試時手動 `gameNow += 100; huntTick(100)` 即可快轉。
- 本機測試：`屠龍勇者/.claude/launch.json` 的 `dragon`（port 8790，與修仙不同 origin，存檔互不影響）。

## 4. 角色與職業

- 新角色出生金幣為2,000（20261022v，使用者指定；createPlayer原300改2000），所有職業共用；既有角色金幣不補發、不改存檔schema。
- 能力值：力量／敏捷／體質／智力／精神／魅力。創角總點數 75，職業有最低值（`base`），單項上限 18。
- 51 級起每升一級 +1 點（`statPoints`），單項上限 `STAT_CAP` 35；萬能藥每瓶 +1，最多 5 瓶。
- 升級 HP／MP：職業 `hp/mp` 範圍 + 體質／精神加成（`(值-10)/2`）。升級時 HP／MP 全滿。
- 12 職業：王族、騎士、法師、妖精、黑暗妖精、修羅、戰士、槍手、魔鬥士、聖騎士、天使、惡魔。
  差異在可用武器（`weapons`）、能否用盾、HP/MP 成長、MR、SP 成長（`spDiv`）、回魔係數、技能表。
  - 王族：魅力超過 10 每點金幣掉落 +3%。
  - 妖精／槍手：遠程，需要箭／子彈（`ammo`）。
  - 天使：神聖魔法（聖光彈、審判之光、天罰）＋治癒，用魔杖／長矛／單手劍＋盾；對**惡魔與不死系**傷害 ×1.3（`slayer`），可用慎重藥水。
  - 惡魔：被動吸血（`lifesteal`）、HP 低於 50% 傷害與攻速提升，用鐮刀（新武器種類 `scythe`，雙手）／鋼爪；對**人型與神聖系**傷害 ×1.3，可用勇敢藥水。
  - 怪物種族標籤（`monsters.js` 的 `MONSTER_TAGS`）：`human` 人型、`demon` 惡魔、`holy` 神聖；不死系沿用 `undead`。剋制加成同時作用在物理與魔法傷害。

## 5. 能力計算（`calcStats`）

| 數值 | 公式 |
|---|---|
| 近戰命中 | 等級 + (力量-8)/3 + (敏捷-8)/4 + 武器命中 + 增益 |
| 遠程命中 | 等級 + (敏捷-8)/2 + … |
| 傷害加成 | 力量（遠程用敏捷）(值-10)/2 + 等級/4 + 武器強化值 + 增益 + SP×dmgSp |
| SP | 等級/spDiv + max(0, 智力-11) + 裝備／增益 |
| AC | 10 − (敏捷-9)/3 − 等級/10 − 防具 AC − 防具強化 − 增益（越低越硬；內部公式用） |
| 防禦（顯示） | `defenseOf(st)` ＝ 10 − AC（越高越好）。2026-10-12（版本 `20261012n`）起所有畫面改顯示正數「防禦」：介面下方、人物狀態、裝備說明「防禦 +3」、比較表、圖鑑、詞綴、技能／共鳴說明（原「AC -3」→「防禦 +3」）；內部 `ac` 欄位與戰鬥公式不變 |
| MR | 職業 MR + (精神-10)×2 + 裝備 |
| 攻擊間隔 | **天堂式（2026-10-18，版本 `20261018i`）**：武器 spd × 職業動作係數 ÷ 綠水 1.33 ÷ 勇水 1.33（精靈餅乾 1.15）× (1−其他攻速，最多 30%)，最快 0.2 秒（`atkMs`；20261024p由0.4秒調整）。見下方「攻速規則」 |
| 施法間隔 | 攻擊魔法（`castSpell`）用 `castMs`：1.2 秒 − 綠水 0.3 − 慎重藥水 0.3（法師、魔鬥士、天使），最快 0.6 秒，不看武器 |
| 回血／5 秒 | 1 + 等級/8 + max(0, 體質-12) + 增益；村莊 ×3；負重 > 50% 不回 |
| 回魔／5 秒 | 1 + 等級/12 + (精神-10)×mpRegenK + 增益；村莊 ×3；**負重 70% 以上不回**（2026-10-19 版本 `20261019l` 使用者要求；`WEIGHT_NO_MP_REGEN` 0.7，原本跟回血一樣超過 50% 就停） |
| 負重上限 | 1200 + (力量 + 體質) × 80 + 等級 × 20 + 裝備 `weight`（2026-10-16 起，版本 `20261016d`；原本 (力量 + 體質) × 100，1～50 級不會成長）。Gemini 提案、使用者選「A＋B」：公式加底值與等級成長（A），彈藥重量降為 1/5（箭／銀箭 0.02、子彈／銀子彈 0.03）＋腰帶加負重上限（B）：皮帶 +300、修羅腰帶 +500、泰坦腰帶 +800、巨人王腰帶 +1200（`weight` 在 `FX_KEYS`，道具說明與圖鑑顯示「負重上限 +N」） |
| 爆擊 | 5% + 武器 + 增益（×1.5 傷害） |
| 閃避 | (敏捷-12)×1% + 增益，上限 50% |
| 吸血 | 武器／防具／技能 `lifesteal` 加總，造成傷害 × 比例轉為 HP（物理與魔法都算） |

### 攻速規則：天堂式（2026-10-18，版本 `20261018i`）

- **2026-10-24，20261024p**：使用者要求最短普攻間隔由400ms改200ms，理論上限每秒5次；只調整`ATK_MIN_MS`，武器／職業係數、藥水倍率、額外攻速上限30%與施法間隔維持原規則。人物詳細屬性沿用calcStats顯示；線上／離線戰鬥共用結果。下方20261018i模擬數據保留為歷史紀錄，不代表p版重新模擬結果。

- 歷程：同一天先改成「基礎 1 秒＋武器加值、綠水／勇水各 −0.3 秒」（版本 `20261018g`），使用者再貼天堂經典版攻速資料，要求「改成天堂這一套」，改成下面的乘法規則。
- **攻擊間隔** `atkMs` ＝ 武器 `WEAPON_TYPES[type].spd` × 職業動作係數 `classAtkK(cls, type)` ÷ 綠水／加速術／速度之靴 1.33 ÷ 二段加速（勇敢藥水 1.33；精靈餅乾 1.15，妖精、槍手）÷ (1 ＋ 其他攻速)（2026-10-24 `20261024r` 起改除法、不設上限；之前是 ×(1 − 其他攻速，最多 30%)），最快 200ms（300 下/分；20261024p使用者指定）。
  常數在 `player.js`：`HASTE_MUL`、`BRAVE_MUL` 1.33、`WAFER_MUL` 1.15、`ATK_MIN_MS` 200（`SPD_EXTRA_MAX` 已移除）。二段加速倍率看職業用哪種（`braveItemFor`）。
- 武器 `spd`（不喝水、騎士為準）：鋼爪／雙刀 800、匕首 850、單手劍 920、鈍器 950、斧／雙手劍／弓／空手 1000、矛／魔杖／鐮刀 1050、槍 1100；雙刀另有 25% 連擊。
- 職業動作係數 `CLASS_ATK_K`（天堂不同職業揮同類武器的格數不同，越大越慢）：黑妖、修羅 0.95；騎士、戰士、惡魔 1.0；聖騎士 1.05；王族、魔鬥士 1.1；妖精 1.1（弓 1.0）、槍手 1.1（槍、弓 1.0）；天使 1.15；法師 1.25。
- 對照使用者給的天堂資料：騎士單手劍 65→綠水 87（天堂約 86）→綠水＋勇水 115 下/分；王族單手劍綠水 79（天堂約 78）；妖精弓 60→80→精餅 92（天堂 60→78→89～90）。
- **其他攻速** 沿用 `spdMul`（變身、技能、詞綴、共鳴），全部相加後攻擊間隔 ÷ (1 ＋ 合計)：+33% 約快 1.33 倍、+100% 才快 2 倍，加越多效果越小，不設上限（20261024r，使用者選）。施法職業不能喝勇水（慎重藥水不加攻速）。
- **每項攻速上限 5%**（2026-10-24，`20261024q`，使用者要求）：職業技能的 `spdMul` 全改成 0.05（衝擊士氣、王命、狂暴、彈幕、子彈時間、魔劍化身、天使之翼、狂血），可以互相疊加；
  詞綴 `AFFIXES.spdMul.cap` 0.05，`rollAffixValue` 擲值不超過 cap，`affixVal(a)` 讓舊存檔／後端擲出的較大數值生效與顯示都只算 5%（不改存檔裡的 `v`，防改檔雜湊照舊）；
  傳說「疾風」（`lg` 的 spdMul）身上不管幾件只取最高一條（`galeFx`，`calcStats` 在一般詞綴後另外加；說明寫「多件只算一條」）。變身、共鳴裝備觸發的攻速不受 5% 限制。
  後端 `loot-catalog` 仍照舊擲值（未重新匯出），前端以 cap 顯示與生效，不需要再跑 SQL。
- **施法間隔** `castMs` 不變：攻擊魔法 1.2 秒 − 綠水 0.3 − 慎重藥水 0.3（`wise`），最快 0.6 秒，不看武器（`castSpell`／`manualCast`）。
- 顯示：`weaponBaseMs(type, cls)`＝不喝水的間隔（乘上目前角色的職業係數），道具說明、圖鑑使用；人物「詳細屬性」有攻擊間隔與施法間隔。
- 各職業最快武器（不喝水／綠水／綠水＋二段，下/分）：黑妖、修羅 雙刀／鋼爪 79／105／140；惡魔 鋼爪 75／100／133；騎士、戰士 單手劍 65／87／115；聖騎士 62／83／110；王族 匕首 64／85／113；
  妖精 弓 60／80／92、匕首 64／85／98；槍手 弓 60／80／92、槍 55／73／83；魔鬥士 單手劍 59／79（沒有二段）；天使 單手劍 57／75；法師 匕首 56／75、魔杖 46／61。
- 模擬（Lv.45、起始裝備＋該職業最快武器、綠水＋二段或慎重常駐、HP／MP 補滿、10 分鐘、3 次平均；同職業每次差 20%～40%）擊殺數，依序為 天堂式／加減秒數版（`20261018g`）／今天以前：
  黑妖 136／95／136、修羅 101／59／112（加上狂暴到 400ms 下限）、魔鬥士 96／79／104、惡魔 87／68／81、王族 77／76／112、法師 71／67／81、戰士 69／55／68、騎士 62／54／66、
  聖騎士 57／44／55、槍手 55／57／66、天使 52／48／60、妖精 49／55／79（妖精、槍手的三次裡各有一次特別低）。
  近戰職業大致回到今天以前的水準；王族比以前慢（係數 1.1，以前匕首最快）；堆攻速詞綴的極限從以前每秒 5.4 下降到 2.5 下。
## 6. 戰鬥（`combat.js`）

- 掛機流程：尋怪（0.6～1.6 秒）→ 戰鬥 → 擊倒 → 掉落 → 檢查回家條件 → 尋怪。
- 野外／地監只出「不超過玩家等級 +3」的怪；地圖 `rare` 機率出首領（巴風特、惡魔、歐西里斯）。
- 命中率：`0.7 + (命中 − (10 − 目標AC)) × 0.02`，限制 5%～95%（怪物打玩家同公式）。
- 物理傷害：`1～武器骰（小型/大型）` + 傷害加成 + 彈藥；銀武器／銀彈打不死系 +1～10；屠龍劍打龍 ×1.5。
- 怪物傷害：玩家 AC < 0 時額外減 `0～(-AC/5)`，再扣減傷；法力護盾把部分傷害轉到 MP。
- 魔法：`dmg + SP×spK`，必中，乘 `(1 − 怪物MR/200)`。怪物魔法無視 AC、受玩家 MR 減免。
- 玩家行動優先：治癒（HP < healPct）→ 增益（效果結束）→ 共鳴裝備（冷卻型）→ 攻擊技能／魔法 → 普攻。**只用技能欄裡的技能，欄位順序＝優先順序**（2026-10-15，第 40 節；以前是等級最高的優先）。
- 自動補給（`autoSupport`）：瞬移卷軸 → 治癒藥水（挑不浪費的那瓶）→ 綠水 → 勇水類 → 藍水。
- 自動回家：沒藥水、沒彈藥、負重超過設定 → 有回家卷軸就回村；沒卷軸只提示一次。
- 死亡：損失本級所需經驗的 `deathLossRate`（天堂原版：1～44 級 10%、45 級 9%、46 級 8%、47 級 7%、48 級 6%、49 級以上 5%；不降級，最低扣到本級 0）；有復活卷軸則不損失；清除增益、HP／MP 剩 30%、回地圖所屬村莊。
- 狩獵經驗 = 怪物經驗 × `EXP_RATE`（目前 1，原版）× `huntExpRate`（65 級起遞減）。
- **多怪戰鬥（2026-10-09，「中度 ARPG」）**：
  - `hunt.mobs` 是同時圍上來的怪，`hunt.mon` 是目前目標（mobs 之一）。每隻有自己的 `atkCd`（攻擊間隔）與 `stunUntil`（暈眩）。
    非目標的怪出手間隔 ×`MOB_SIDE_SLOW`（1.6，圍著輪流進攻），避免多怪時傷害暴增。
  - 出現幾隻 `packRoll`：權重 `PACK_WEIGHTS` 1～6 隻＝30／25／20／12／8／5；上限 `packMax`：龍穴 1、永夜之塔 3、其他 6。首領、龍、任務首領單獨出現。
  - **群越大每隻越弱** `weakenForPack(m, n)`：HP／經驗／金幣 ÷(1+0.2(n−1))、傷害（含魔法）÷(1+0.3(n−1))；6 隻時 HP 約 50%、傷害約 40%。
  - 戰鬥中每 3 秒（`MOB_JOIN_MS`）有 15%（`MOB_JOIN_P`）機率再加入一隻一般怪（未滿上限、場上沒有首領時，同樣依當下隻數變弱）。
  - **首領大招** `bossSkillTick`：首領／龍每 7～11 秒蓄力 1.6 秒（`TELE_MS`），以蓄力開始時角色的位置為中心畫半徑 1.5 格紅圈；
    時間到角色還在圈內就吃 ×2.5（`TELE_MUL`）的重擊（龍是「龍之吐息」）。地圖畫面開著時由 `ui-scene.js` 回報 `hunt.tele.dodged／seenAt`；
    畫面沒開（背景、離線模擬）用機率：設定「首領大招自動閃避」開 60%、關 20%。
  - **手動操作 API**（只在畫面上即時遊玩時呼叫，離線模擬不受影響）：`focusMob(inst)` 改打某隻、`pullMob(mid)` 把地圖上的怪拉進戰鬥
    （沒在掛機會自動開始；超過上限或有首領時不行）、`manualCast(id)` 立刻施放技能（戰鬥中重設普攻計時；治癒、增益戰鬥外也能用）。
  - 目標死了直接換 HP 最少的下一隻，不用重新尋怪；全部打完才進入尋怪。反擊、範圍技能打死非目標的怪也會正常結算（`reapMobs`→`onKill(mon)`）。
  - 技能 `aoe`：打全部圍上來的怪（魔法每隻各算 MR；物理每隻各算命中）；`spread`：多發攻擊每一發打不同隻（目標優先，其餘依 HP 由少到多）。
    範圍：王者之怒、騎士之怒、冰雪暴、流星雨、粉碎、元素爆發、審判之光（聖騎士）、天罰、地獄火（數值比單體版調低約 15～30%）；
    分散：三重矢、千手破、連射。黑妖暗殺維持單體。
  - 瞬移卷軸、換永夜之塔樓層 → `leaveFight` 全部放掉。死亡訊息顯示實際打死你的那隻。
  - 平衡（30 分鐘模擬、基本裝備，對照多怪改版前）：擊殺／小時約 +40～170%、經驗約 +0～25%、治癒藥水消耗約持平，陣亡的組合相同。
  - 全部規則都在 `combat.js`，`offline.js` 的快轉模擬直接沿用，離線收益自動反映多怪戰鬥。

- **攻擊距離**（2026-10-12，版本 `20261012c`）：近戰武器要在目標旁 1 格（含斜角，`MELEE_RANGE`）才能普攻／用物理技能；
  遠程武器（弓、槍）、攻擊魔法、共鳴技能在 4 格內（`RANGED_RANGE`，直線距離 ≤ 4.5）可攻擊，但中間的格子不能有牆或障礙物（`lineOfSight` 用 Bresenham 走格子，怪物不擋）。
  治癒、增益不受距離限制。`playerAction` 只挑打得到的技能；都打不到時不出手，150ms 後再判斷；手動施放（技能列）距離不夠會提示原因。
  距離由 `ui-scene.js` 每幀回報 `hunt.reach = { mon, melee, ranged, seenAt }`（`sceneReach`）；超過 500ms 沒回報（畫面沒開、背景、離線模擬）不限制，離線收益不變。
  **卡住修正**（版本 `20261012v`，使用者回報異界地圖找不到怪打）：地監格子地圖的障礙物會圍出走不到的死角，怪生在裡面時角色、怪都沒路、又不在攻擊距離 → 永遠不出手。
  `spawnMapMon` 改成只生在 `findPath` 走得到的格子。
  地圖：角色一次走一格、每格重新判斷，遠程武器走到「4 格內且看得到」就停下射擊，近戰走到旁邊；角色停下時目標怪也會自己走過來。
  **目標鎖定**（2026-10-15，版本 `20261015c`；使用者回報「判斷不到怪、或鎖定遠方的怪但身邊有怪，卡住後原地喝水到死」）：
  原因是戰鬥選目標（`hunt.mon`，打完換 HP 最少的）不看位置，而怪物攻擊不受距離限制——目標走不到時角色一直不出手、身邊的怪一直打；
  原本「目標打不到、角色沒在走路 2.5 秒」的保險（`scene.stuckMs`）在角色一格一格走、路線繞來繞去時一直被歸零，幾乎不會觸發（已移除，改成下面兩條，`ui-scene.js`）：
  - **先打身邊的**：目標不在攻擊距離（近戰旁邊 1 格／遠程 4 格且看得到）、而圍上來的怪裡有打得到的 → 改打最近的那隻（`sceneLock`→`focusMob`）。
    玩家剛點選的目標 5 秒內不換（`scene.focusUntil`）。
  - **5 秒沒出手就重新鎖定**（`RELOCK_MS`）：`combat.js` 的 `physicalAttack`／`castSpell` 記 `hunt.lastAtkAt`（沒打中也算），鎖定（`scene.lockAt`，換目標時重算）與最後出手都超過 5 秒 → `sceneRelock`：
    挑最近而且打得到的 → 不然換另一隻（原本那隻可能卡在死角）→ 都沒有就原本那隻；挑到的還是打不到就移到角色旁邊的空格。閃首領大招、玩家手動走路時不計時。
  - 只在畫面開著時作用（地圖畫面沒開時 `canReach` 本來就不限制距離），離線收益與平衡不變。
  - 驗證（本機手動推進畫面）：目標關在 8 格外的牆圍裡、身邊有怪 → 0.3 秒內改打身邊並出手；只剩一隻走不到 → 5 秒沒出手規則觸發、移到身邊開始攻擊；正常掛機 30 秒擊倒 10 隻、沒有多餘的重新鎖定。
  - 測試注意：預覽窗格不在前景時瀏覽器不跑 `requestAnimationFrame`，地圖不會更新；要在 Console 手動呼叫 `sceneUpdate(50)` 推進。

## 7. 道具與衝裝

- 道具實體 `{ uid, id, n, ench, sellLocked? }`（防賣鎖定見第124節）；藥水、卷軸、彈藥、材料、萬能藥可堆疊。裝備中的道具放 `player.equip[slot]`，不在 `inv`。
- 雙手武器（雙手劍、矛、弓、槍、鋼爪、雙刀）不能與盾同時裝備。
- 衝裝（`enchant.js`）：強化值 < 安定值必定成功（祝福卷 +1～3）；≥ 安定值成功率 `0.5/(超出+1.25)`（40%→22%→15%…），
  失敗**蒸發**；詛咒卷 -1；飾品不能強化；上限 +15。武器每 +1 傷害 +1，防具每 +1 AC -1。
- 商店依村莊 `tier` 販售（低語海岸 1、古魯丁 2、奇岩 3、亞丁 4）；回收價 = 售價 30% 或 `sell`。
- 商店各商品保留快捷數量，另有「自訂」購買數量、即時總價與依金幣／負重計算的上限（20261021e，第 75 節）；購買端拒絕非法整數及溢位。
- **裝備比較**（2026-10-09，`ui-panels.js` 的 `compareHtml`）：背包點武器／防具時，視窗下方「⚖️ 與裝備中比較」。
  `statsWithEquip` 暫時把這件放進對應部位算 `calcStats` 再還原（不動存檔）；雙手武器會模擬卸下盾牌、盾會卸下雙手武器（並提示），戒指兩格各比一次。
  `COMPARE_ROWS` 逐項列「目前／換上後／差異」（平均傷害小型／大型、攻擊間隔、命中、爆擊、AC、MR、HP、MP、SP、減傷、閃避、吸血、回血、回魔、五維、負重），
  綠 ▲ 變好、紅 ▼ 變差，上方統計幾項變好／變差；可展開「查看裝備中的詳細」。職業不能用的直接顯示原因。
- 鍛造配方 `RECIPES`：瑟魯基之劍、魔法頭盔、屠龍劍（四龍鱗＋武士刀）、龍鱗鎧（四龍鱗各 2＋板甲）。

- **整理背包**（2026-10-12，版本 `20261012p`）：背包分頁改照 `player.inv` 實際順序顯示（新撿的在最後），上方「🧹 整理背包」`bagTidy` 才排列並存檔：
  類別（`CAT_ORDER`）→ 武器種類（`WEAPON_TYPES` 順序）／防具部位（`SLOT_KEYS` 順序）→ 品質高→低 → 階級高→低 → 名稱 → 強化高→低；同種可堆疊道具（同 id、同強化）合併成一疊。

## 8. 地圖

| 地圖 | 建議等級 | 回城 | 特色 |
|---|---|---|---|
| 低語海岸 | 1～10 | 低語港 | 新手區 |
| 低語墓窟 | 8～18 | 低語港 | 不死系出現 |
| 迷霧古林（野外） | 10～20 | 灰燼村 | 狼人、森林熊、巨大蜘蛛、樹精；稀有：古老樹精 0.6% |
| 腐朽礦坑・上層 | 15～25 | 灰燼村 | 大地圖南排（第 49 節） |
| 沉眠龍窟（地監） | 18～28 | 灰燼村 | 大地圖南排（第 49 節）；蜥蜴人、吸血蝙蝠、黑暗妖精斥候、幼龍；稀有：甦醒的地龍 0.6% |
| 沉船海灣（野外） | 26～38 | 暗金城 | 海賊、海賊火槍手、巨蟹、溺死的水手；稀有：海賊王・德雷克 0.7% |
| 腐朽礦坑・深層 | 24～36 | 灰燼村 | 大地圖南排（第 49 節）；稀有：巴風特 1% |
| 暮光法師塔 | 34～46 | 暗金城 | 稀有：惡魔 0.8% |
| 焦骨峽谷（野外） | 36～48 | 暗金城 | 蜥蜴人戰士、地獄三頭犬、飛龍、骷髏龍騎士；稀有：巨大飛龍 0.7% |
| 黃沙王陵 | 44～56 | 暗金城 | 稀有：歐西里斯 0.8% |
| 永凍荒原（野外） | 46～58 | 永夜王都 | 冰原狼、雪怪、冰之高崙、冰之魔女；稀有：冰之巨人王 0.7% |
| 熔火煉獄（地監） | 54～66 | 永夜王都 | 大地圖東邊（第 57 節）；火蜥蜴、火之精靈、熔岩高崙、火焰騎士；稀有：伊弗利特 0.7% |
| 紫霧遺跡（野外） | 62～76 | 永夜王都 | 古代巨人、鳥身女妖、被遺忘的騎士、奇美拉；稀有：遺忘之王 0.7% |
| 泰坦墓穴（地監） | 72～88 | 永夜王都 | 巨人骷髏、墓穴守護者、亡靈術士、古代骨龍；稀有：巨人王的亡魂 0.6% |
| 永夜之塔 1～100F | 61～105 | 永夜王都 | 怪物 Lv = 60 + 樓層×0.45（2026-10-21 由 44 改 60，第 85 節）；10 的倍數樓有守關首領，擊敗才解鎖上 10 層（`towerMax`）。**首領打倒後 6 小時復活**（2026-10-16，版本 `20261016o`，使用者要求；以前打倒一次就永遠不再出現）：`player.towerBossCd[樓層]`＝復活時間（真實時間 `Date.now()`，跟龍穴冷卻一樣），`towerBossUp(f)`（monsters.js）＝沒打過或冷卻已過，`TOWER_BOSS_RESPAWN_H` 6；解鎖仍看 `towerCleared`（打倒一次就永久解鎖）。地圖頁永夜之塔卡片顯示每隻已打倒首領的復活倒數（`towerBossStatusHtml`）。冷卻中的首領樓層只出一般塔怪；停在首領樓層掛機（含離線）時間到會再遇到首領 |
| 四大龍巢穴 | 60／70／80／88 | 永夜王都 | 依序：格爾莫斯 → 瑟拉恩 → 維斯塔爾 → 莫爾加斯；討伐後巢穴封閉 6 小時（真實時間） |

- 村莊間傳送費：每差一級 200；從村莊傳送到地圖收 `fee`。在地圖要回村：使用回家卷軸（立即）；2026-10-20（版本 `20261020a`）移除手機狩獵、村莊頁面及 PC 底部的步行回村按鈕，原有步行內部流程保留。
- 四大龍全數討伐 → 稱號「屠龍勇者」（`hasDragonTitle`）。
- 2026-10-08 新增 8 區（參考天堂 1 地名）：怪物數值都走 `monBase` 公式＋倍率，稀有首領比照巴風特／惡魔／歐西里斯（HP ×10～12、經驗 ×12～15），
  每隻首領必掉一種新材料（`items.js`：古樹之心、地龍之牙、海賊的寶箱、飛龍之翼、寒冰結晶、伊弗利特之焰、遺忘的聖物、巨人之魂，目前只能回收換錢，之後可做配方）。
  掉落只用既有裝備。種族標籤（`MONSTER_TAGS`）：海賊、黑暗妖精斥候、冰之魔女、亡靈術士＝人型；三頭犬、火之精靈、火焰騎士、伊弗利特＝惡魔；鳥身女妖＝神聖。
- 地圖清單（`renderMap`）照 `ZONES` 陣列順序顯示，新地圖依建議等級插入。新地圖還沒有職業任務。

毒系新增區（2026-10-24，20261024af）：毒霧巢穴`venomNest`，Lv.38～48、暗金城傳送600金幣、一般洞穴畫面；毒霧獵蛛／蛇女／沙漠巨蠍，稀有Lv.52劇毒蛛后0.8%。靜態`noMap:true`讓此區不加入異界池，`mapZones`排除它，既有T1～T15名稱、區域排序與強化倍率不變；不是player存檔欄位。詳第127節。

## 9. 經驗曲線

**採用天堂 1 原版經驗表**（使用者 2026-10-08 提供；`EXP_RATE = 1` 完全原版，使用者選定不加倍率）：

| 等級 | 升下一級所需經驗 |
|---|---|
| 1～5 | 125、175、200、250、546（查表） |
| 6～44 | (等級+1)⁴ − 等級⁴（到下一級的總經驗剛好是 (等級+1)⁴；例：10 級 4,641、30 級 113,521、44 級 352,529） |
| 45～48 | 729,360、1,508,416、3,495,263、9,912,189 |
| 49 以上 | 每級 36,065,092 |

- 65 級起狩獵經驗遞減：65～69 ×1/2、70～74 ×1/4、75～78 ×1/8、79 ×1/16、80～81 ×1/32、82～83 ×1/64、84～85 ×1/128、86 ×1/256、87 以上 ×1/512（原表到 87 級為止，之後沿用）。
- 怪物經驗 `lv² + 1`（天堂公式；首領 ×10～20，龍寫死）。累計：到 49 級 19,745,853；到 65 級 596,787,325；到 88 級 1,426,284,441（與原表一致）。
- 練功速度（單人、24 小時不停掛機）：實測 ×1 約 0.6 小時 Lv.10、2.9 小時 Lv.20、6.8 小時 Lv.30、12 小時 Lv.37；
  估算 Lv.45 約 13 小時、Lv.49 約 34 小時、Lv.60 約 15 天、Lv.70 約 27 天、Lv.88 約 650 天。
  四大龍與第 4 章任務（Lv.60）是**長期目標**；之後想加快只要改 `config.js` 的 `EXP_RATE`（×10 時 Lv.60 約 35 小時）。
- 原表缺的 21、43 級依 (n+1)⁴ − n⁴ 規律補上（39,775、329,295）；原表 27 級總經驗 14656 為筆誤，應為 614,656。

## 10. 存檔欄位（`player`）

- schema 7（20261024t）：新增`mapQueue`（預設null），目前排程地圖`mapRun`／`mapPortal`可帶`queueSlot`。使用者明確同意此存檔變更；轉換與恢復規則見第126節。

- schema 6（20261024m）：`inv`／`storage`／`equip` 的物品實體可帶 `sellLocked: true`；舊存檔預設未鎖，`migrateSave` 清除非true旗標。使用者已同意變更存檔。

`name, cls, lv, exp, gold, stats, statPoints, elixirs, baseHp, baseMp, hp, mp, inv, equip, storage, nextUid,
buffs{key:{src,id,until}}, cds{技能id:到期}, loc{type,id,floor}, hunting, towerMax, towerCleared, dragons, dragonCd,
kills, deaths, settings（含 skillSlots 技能欄 8 格）, created, skills[已學會的技能 id，第 40 節], raidCd{副本id:真實時間}, raidRuns[領過獎勵的場次], marketGot[已入帳的交易所編號 b123／s456]`（後兩個是團隊副本，第 30 節；舊存檔沒有也沒關係）

## 11. 尚未實作（之後可做）

寵物／召喚（妖精、王族）、死亡降級、血盟、新地圖的職業任務與材料配方、更多野外背景圖、音效與怪物圖片。

## 12. PWA（可安裝的 App 版）

- `manifest.json`：`id`／`scope`／`start_url` 都相對本資料夾，和修仙是**兩個不同的 App**，可以同時安裝。
- `sw.js?v=版本號` 由 `pwa.js` 以 `scope: './'` 註冊。範圍比修仙根目錄的 SW 更精確，所以屠龍頁面由這支接手。
- 快取：頁面網路優先；帶 `?v=` 的 JS 快取優先（`dragon-core-版本`，新版啟用時刪舊版）；圖示、manifest 先給快取再背景更新（`dragon-assets`）。
  同網域 `caches` 是共用的，所以名稱一律 `dragon-` 開頭；修仙 SW 只清 `fanchen-core-`，兩邊不會互刪。
- 安裝時預先抓 `index.html` 及裡面所有 `data/*.js?v=`，第一次離線開也完整。
- 新版本：每 30 分鐘與切回前景時抓 `index.html` 比對 `config.js?v=`，不同就在畫面下方顯示「🔄 有新版本，點此更新」（存檔後重新整理）。
- 安裝入口：標題畫面與「⚙️ 設定」的「📲 安裝到主畫面」→ `openInstallGuide`（Chrome／Edge 直接跳系統安裝視窗；iPhone 顯示 Safari 加入主畫面步驟；LINE 等內建瀏覽器提示改用一般瀏覽器）。
- iPhone 主畫面版與 Safari 存檔分開，第一次從主畫面開且沒存檔時提醒一次（`dragonSlayer_pwa_hint`）。
- 圖示由 PowerShell `System.Drawing` 產生（紅底金框「屠龍」二字），要換圖直接覆蓋 `images/` 同檔名即可。
- 本機測試會在 localhost:8790 註冊 SW；測完可在 DevTools → Application → Service Workers 註銷，避免讀到舊快取。

## 13. 職業故事與任務（`quests.js`）

- 每個職業有一段背景故事與一位任務 NPC（`CLASS_STORIES`），創角畫面、序章對話框與「📜 任務」分頁都會顯示。
- 每個職業 4 章任務（`CLASS_QUESTS`），依序解鎖：

| 章 | 等級 | 類型 | 地點 | 獎勵 |
|---|---|---|---|---|
| 1 | 15 | 收集任務道具 ×10（掉率 30%；修羅是擊倒 100 隻） | 低語墓窟／腐朽礦坑・上層 | 職業斗篷（修羅為腰帶）＋3,000 金幣 |
| 2 | 30 | 擊倒 20 隻後引出任務首領並討伐 | 腐朽礦坑・深層 | 職業武器＋10,000 金幣 |
| 3 | 45 | 收集任務道具 ×8（掉率 20%） | 暮光法師塔／黃沙王陵 | 職業飾品＋30,000 金幣 |
| 4 | 60 | 擊倒 30 隻後引出任務首領並討伐 | 永夜之塔（任一非首領樓層） | 職業傳說武器＋80,000 金幣＋萬能藥 1，獲得**職業稱號** |

- 接任務、回報都要在村莊（任何村莊都找得到 NPC）；進度只在指定地圖累積。
- 任務道具 `q_職業_章`（`cat: 'quest'`，不能賣、重量 0）由程式自動建立；回報時扣除。
- 任務首領（`qBoss`）：第 2 章 Lv34、第 4 章 Lv62（約比格爾莫斯弱一點）。任務首領出現優先於地圖一般怪與塔的守關首領；
  藥水用完回城會讓首領重置，所以要帶足藥水。在 10 的倍數樓層（守關首領未擊敗時）不會累積任務進度，要選一般樓層。
- 獎勵裝備都是職業限定（`classes`），定義在 `QUEST_REWARD_ITEMS`。
- 存檔欄位 `player.quests = { ch 已完成章數, active 進行中, prog 擊倒數, bossDone }`；`questTitleEarned()` 為 true 時狀態列顯示職業稱號。
- 模擬參考（Lv30／Lv60 中等裝備）：12 職業第 2 章約 5～23 分、第 4 章約 11～35 分，皆無死亡。
- 新增職業時：`CLASSES`、`SKILLS`、`CLASS_STORIES`、`CLASS_QUESTS`（4 章）、`QUEST_REWARD_ITEMS` 都要補；藥水的 `classes` 清單也要加。

## 14. 離線收益（`offline.js`）

- **2026-10-12 起要登入、只有最後離線的角色**（版本 `20261012t` 起**不再扣鑽石**，改由遊戲端讀自己 `dragon_saves` 最新 updated_at 的欄位判斷）（第 38 節 `offlineSettle`）：沒登入沒有離線收益；`applyOffline(awayMs, paidMs)` 的 paidMs 是伺服器 `offline_claim` 用鑽石換到的可結算時間。
- 觸發：①「繼續冒險」讀檔時，離開時間 = 現在 − 存檔時間（`lastSaveAt`）；② 遊戲中主迴圈發現兩次 tick 間隔 ≥ 30 分鐘（分頁在背景被暫停、電腦休眠）。
- 條件：在狩獵地圖且 `player.hunting` 為 true；村莊、步行中、龍穴都不結算。
- 做法：`measureHunt` 把玩家狀態存成快照，用 `SIM_MODE` 快轉模擬 10 分鐘掛機（會自動喝水、施法、回家），量出經驗、金幣、擊殺與每種消耗品用量，結束後完整還原。
  `SIM_MODE` 期間 `saveGame`、`refreshUI`、`showToast`、`openDialog` 都不動作，遊戲訊息也會還原。
  **遊戲訊息要整份備份還原**（`gameLog.slice()`）：訊息滿 120 行時模擬會把舊訊息擠掉，只切回長度會留下模擬訊息，
  編號比 `logSeq` 大，中間地圖每幀重讀 → 頭頂一直冒 LEVEL UP（2026-10-08 修正）。`ui-scene.js` 也改成記住讀過的最大編號當保險。
- 結算：有效時間 = min(離開時間, 12 小時) × 50%，再受補給限制（每種藥水／彈藥／瞬移卷軸夠撐多久取最短）；
  依比例給經驗（會正常升級）、金幣、擊殺數，扣除對應的消耗品。
- 結束狀態：補給撐完整段 → 繼續掛機；補給用完 → 有回家卷軸就回村，沒有就停在原地；模擬中陣亡 → 只結算到陣亡為止，照死亡規則扣經驗並回村。
- 不給：道具掉落、任務進度（避免估算誤差影響稀有物品與劇情）。
- 常數在 `config.js`：`OFFLINE_MIN_MS`（30 分鐘，20261024d 起）、`OFFLINE_MAX_MS`（12 小時）、`OFFLINE_RATE`（50%）、`OFFLINE_SAMPLE_MS`（10 分鐘）。
- 結算一次約 0.01～0.1 秒，結果以「🌙 離線收益」對話框顯示並寫入遊戲訊息。

## 15. 主畫面外框（`ui-frame.js`、`images/frame.jpg`）

- 素材：使用者提供的惡魔拱門框（原圖 1342×2000 JPG，中間的「透明格子」其實是畫進去的灰格紋）。
  用 C# 程式（System.Drawing）以「視窗形狀遮罩＋顏色擴散」把格紋與底部紅煙挖掉，保留惡魔爪、鎖鏈、骷髏、欄杆尖刺，
  再把挖掉的地方填成遊戲底色 `#100c0a`，輸出 `frame.jpg`（約 293KB，不需要透明度）。要換框就用同尺寸的圖覆蓋，並把 `index.html` 的 `frame.jpg?v=` 加一。
- 版面：`#frame` 用 CSS `border-image` 九宮格鋪滿畫面：slice `715 102 655 104 fill`，上方（拱門、惡魔頭）與下方（法球、欄杆、格子）維持比例，
  左右柱子（符文段）以 `round` 重複延伸到手機高度。外框寬 = min(螢幕寬, 560px, 螢幕高 × 0.62)，`--s` = 寬 ÷ 1342。
- **2026-10-15 拿掉上方拱門（版本 `20261015g`，使用者要求滿版）**：改用 `images/frame-notop.jpg`（frame.jpg 裁掉 y 715 以上，1342×1285；PowerShell System.Drawing 裁的），
  slice `25 102 655 104 fill`、上方寬度 0（頂端 25px 還有拱門殘邊所以跳過），左右柱子直接接到畫面頂。`#panel` top 改成 `--s×20px`，柱子按鈕 top 0、抽屜 top `--s×60px`。
  狩獵畫面 `#panel:has(> .hunt-view)` 不留內距，地圖填滿；下方操作框（回家卷軸／步行回村／前往狩獵地點）改浮在地圖左下、技能欄上方（村莊 `.hunt-view.in-town` 貼底），
  掛機統計文字 `#hunt-session` 手機也不顯示（同 PC；補給數量看底部格子）。地圖縮放（`sceneFrame`）另外取「蓋滿畫面高／寬」的倍率，地圖變高後不留上下黑邊。
  下表 `#panel` 的 y 445 是舊值；`frame.jpg` 保留但遊戲不再載入。
- 所有元素位置都寫成「原圖座標 × `--s`」：

| 元素 | 原圖位置 | 內容 |
|---|---|---|
| `#hud-stats` | x 390～952、y 1712～1744（經驗條正上方，等級兩側） | 💰金幣（左）、防禦、MR、負重百分比（右，20261024k）。原本上方 `#hud-top`（名稱、職業 Lv、稱號、負重）2026-10-09 依使用者要求移除，稱號仍在人物狀態／任務頁顯示 |
| `#panel` | x 112～1232，y 445 ～ 底部往上 626 | 目前分頁內容（預設狩獵）；非狩獵分頁有標題列與「返回狩獵」 |
| `#hud-bottom` | 兩骷髏之間、欄杆上方 | 地點／掛機狀態 |
| 經驗條 `#exp-strip` | x 380～962、y 1746～1762（欄杆下緣與底部格子之間的石條） | EXP 百分比（2026-10-09 從 `#hud-bottom` 搬來） |
| 等級 `#lv-badge` | 中心約 (671, 1685)（欄杆正中間的裝飾） | 目前等級「Lv.N」 |
| 左柱 `#pillar-left` | x 0～104，柱子符文段 | 點擊滑出抽屜：人物狀態、技能、任務 |
| 右柱 `#pillar-right` | x 1240～1342 | 點擊滑出抽屜：地圖、設定 |
| 紅球 `#orb-hp` | 中心 (230, 1740)，直徑 296 | HP；上方變暗＝損失比例；點一下喝治癒藥水 |
| 藍球 `#orb-mp` | 中心 (1112, 1740) | MP；點一下喝藍色藥水 |
| 底部 6 格 `#slots` | y 1765～1842，x 410／500／590／680／770／858，寬 77 | 背包、治癒藥水、自我加速藥水、回家卷軸、瞬間移動卷軸（顯示數量，用完變暗；2026-10-11 拿掉村莊，最後一格空著） |
| 骷髏頭 `#skull-hunt` | x 610～730、y 1870～1990（底部正中間；眼睛中心約 (645,1925)／(695,1925)） | **開始／停止掛機**（見下方） |
| 骷髏頭 `#skull-log` | x 15～120、y 1870～1985（左下、紅球下方） | 戰鬥訊息抽屜開關（第 17 節） |

- **骷髏頭掛機鈕**（2026-10-09 使用者要求）：原本狩獵畫面的「▶ 開始掛機／⏸ 停止掛機」按鈕搬到底部正中間的骷髏頭（`skullHuntClick`，`ui-frame.js`），
  兩種外框都有。眼睛是兩個 `.eye` 疊在圖上：**沒在掛機＝黑色不發光**，**掛機中＝紅光並緩慢脈動**（`.skull-hunt.on`、`@keyframes skull-eye`）。
  `renderSkull()` 由 `renderStatus()` 呼叫（每 250ms），只在狀態改變時切換 class／title。村莊裡點骷髏頭提示「先從地圖前往狩獵地點」；開始／停止會跳 toast。
  狩獵畫面原按鈕位置的虛線提示框 `.skull-tip` 已於 2026-10-09 依使用者要求移除（狀態只看骷髏眼睛）。
- 原本上方的分頁列（`#tabs`）已移除；`renderTabs()` 改為更新抽屜與格子的「目前分頁」標示。`renderStatus()` 改寫外框 HUD。
- 標題畫面、創角畫面維持原樣（沒有外框）。

## 16. 畫面尺寸（設定 →「🖥️ 畫面尺寸」）

- **2026-10-24 手機觸控**：`index.html` viewport 限定倍率1；`html, body` 設 `overscroll-behavior: none` 擋下拉重新整理／邊界回彈，`touch-action: pan-x pan-y` 禁止雙擊與雙指頁面縮放，保留一般捲動；面板、對話框、聊天、訊息與增益列表亦禁止捲動傳到外層。原快捷欄 `touch-action: none` 與增益列 `pan-x` 保留。僅HTML／CSS，不另換JS版本；需真實手機驗收。

- 存在這台裝置的 `localStorage`（key `dragonSlayer_display`），不進角色存檔；標題畫面也會沿用。
- 結構：`#screen-game > #stage > #frame（外框）＋ #side（右側欄）`，`layoutFrame()` 依模式算出 `#stage`、`#frame`、`#side` 的像素大小與 `--s`。

| 模式 | 遊戲區 | 外框 | 右側欄 |
|---|---|---|---|
| 🔄 自動尺寸 `auto` | 滿版高度 | 寬 = min(螢幕寬, 560, 螢幕高 × 0.62) | 無 |
| 📱 手機 9:16 `phone` | 固定 9:16，置中，四周黑邊 | 填滿遊戲區 | 無 |
| 🖥️ PC 16:9 `pc` | 固定 2000:1116（≈16:9），置中 | **橫式外框**（第 19 節），中間大地圖固定顯示狩獵 | 無；其他分頁開在地圖右側的視窗 `#overlay` |
| ⛶ 全螢幕 `full` | 進入瀏覽器全螢幕（`requestFullscreen`），同自動但不設 560 上限 | | 無 |

- PC 16:9 時 `isSideLayout()` 為 true：`renderPanel()` 同時畫狩獵（`#panel`）與目前分頁（`#side`），`huntVisible()` 讓狩獵即時更新一直運作；
  抽屜、底部格子打開的頁面都進右側欄，「返回狩獵」按鈕不顯示。切回其他模式時自動回到狩獵。直拿手機選 PC 16:9 會提示改用自動尺寸。
- 全螢幕需要使用者點擊才能進入；重新整理後瀏覽器會退出全螢幕（版面仍是全螢幕模式，再點一次即可）。iPhone Safari 不支援，會提示改用「安裝到主畫面」。

## 17. 中間即時地圖（`ui-scene.js`）

目前場景與世界總覽改用第 86 節；以下為原系統規格及歷程，舊素材全部保留。

- 狩獵畫面（`renderHunt` → `huntViewHtml`）中間是 `<canvas id="scene-canvas">`，下方是操作按鈕、補給／效率；戰鬥訊息改到左下骷髏頭的抽屜。
- **戰鬥訊息抽屜**（2026-10-09 改版）：開關是外框**左下、紅球下方的骷髏頭** `#skull-log`（手機原圖 x 15～120、y 1870～1985；PC 原圖 x 5～100、y 1010～1110，右下角有 📜 小標，打開時發金光）。
  點了 `toggleLogDrawer()` 讓 `#log-pop`（`index.html` 的靜態元素，不隨分頁重畫）從下往上滑出，顯示最近 30 行（`#hunt-log`），右上 ✕ 或再點骷髏頭收回。
  20261021h 新增第三分頁「🎁 掉落紀錄」，獨立顯示最近 120 筆本次遊戲打怪道具／自動賣出，詳第 77 節。
  `renderLogPop()` 由 `renderStatus()` 每 250ms 呼叫：切換開關樣式、有新訊息才重畫；手機狩獵畫面看得到時把抽屜貼在操作列（`.hunt-ctrl`）上方，不蓋住按鈕，其他分頁用 CSS 預設位置。PC 自 20261021g 固定用左下 CSS 定位，不跟隨頂端樓層按鈕（第 76 節）。
  開關狀態存這台裝置的 `localStorage`（key `dragonSlayer_logOpen`），不進存檔。原本操作列裡的把手、最新一行與「💀 點下方骷髏頭…」虛線提示框都已移除。
  進入遊戲後一律顯示這個畫面；「地圖」（傳送清單）只在按右柱抽屜或村莊傳送師時才打開，不會自動彈出。
- **只負責畫面**：戰鬥結果仍由 `combat.js` 決定（尋怪 0.6～1.6 秒、命中、傷害），所以離線收益與平衡模擬都不受影響。
- 地圖：28×28 格（每格 32px），依 `sceneKey()`（村莊 id 或 地點＋樓層）用固定亂數種子產生，同一個地點每次長一樣。
  外圈是牆，中間 3×3 保留空地，其他格依主題密度放障礙物；主題 `SCENE_THEMES`：村莊、野外、地監、洞穴 `cave`、墓穴 `tomb`、暮光法師塔、黃沙王陵、永夜之塔、龍穴。
  `themeFor()`：龍穴／永夜之塔／野外依 `type`，地監看地圖的 `scene` 欄位（暮光法師塔 `ivory`、黃沙王陵 `pyramid`、沉眠龍窟 `cave`、熔火煉獄 `dragon`、泰坦墓穴 `tomb`，沒寫就是 `dungeon`）。
- **野外用背景圖**（使用者提供的遺跡空拍圖 `images/maps/ruins.jpg`，1500×837）：`SCENE_BGS.ruins` 把整張圖鋪成 40×22 格（`scene.mw/mh`，每格約 37.5×38 原圖像素），
  `block` 列出擋路的牆（廢墟牆壁、塔、右側石堆，格子座標矩形），`start` [20,11] 是中庭石板路，角色從這裡出發。不畫格子與障礙物 emoji。
  所有 `type: 'field'` 地圖共用這張圖，用地圖的 `tint`（半透明顏色）區分：沉船海灣偏藍、焦骨峽谷偏紅、永凍荒原蓋白霜、紫霧遺跡紫霧，低語海岸與迷霧古林原色。
  圖還沒載入時先畫野外格子。換圖或加新背景：在 `SCENE_BGS` 加一筆（src、格數、block、start），主題加 `bg`，並把圖加進 `sw.js` 預先快取清單。
  調整 `block` 時可在 Console 把 `scene.grid` 為 1 的格子塗紅疊在圖上對位。
- **比例**（2026-10-09 對齊使用者的天堂 M 參考圖，人物約佔畫面高 12%）：人物圖 `drawH` 48px、emoji 職業圖示 40px、地圖怪 36px（首領／龍 54px），
  `sceneFrame` 放大倍數 `clamp(W / (TILE × 28), 1, 1.3)`（PC 約看到 28 格寬）。
- **野外手動操作（ARPG，2026-10-09）**：點地圖上的怪＝改打牠或拉進戰鬥（`sceneZoneClick`→`focusMob`／`pullMob`，地圖怪記著 `mid` 怪物 id）；
  點地面＝走過去，之後 2.5 秒（`MANUAL_HOLD_MS`）不自動尋怪；方向鍵／WASD 在野外也能走。沒操作時照樣自動掛機。
- **技能快捷列** `#skill-bar`（地圖右下，兩排 4 格，鍵盤 1～8）＝技能欄 8 格（`player.settings.skillSlots`，第 40 節），空格不顯示；
  `skillBarCast`→`manualCast`；按鈕顯示技能名前兩字、範圍／分散／治癒標籤、冷卻倒數（conic 遮罩），MP 不足變灰。村莊不顯示。
- **首領大招紅圈**：`sceneTeleTick` 在 `hunt.tele` 出現時記下圓心（角色當下格子），每幀回報角色是否在圈外；畫半透明紅圈＋隨蓄力長大的內圈。
  設定開「自動閃避」時，0.35～0.9 秒反應後自動尋路走到圈外最近的空格（`scene.dodging`，閃避中不自動尋怪）；也可以自己點地面或用方向鍵躲。
- **多怪顯示**：`hunt.mobs` 每隻都綁定一隻地圖怪（`m.inst`）；目標＝`scene.engaged`（腳下紅圈、名字＋紅血條），角色走到牠旁邊；
  20261021m 起目標／精英名稱與等級在腳底下方 16px，血條仍在頭頂；名字／血條仍最後統一畫，不動玩家名稱與點怪判斷（第 81 節）。
  **怪物在整個區域隨機重生**（2026-10-24，`20261024i`，使用者要求不再生在角色周圍）：`huntSpots()` 從角色位置洪水填充出走得到的地板（大地圖只算目前地圖的區域，且只穿過同地圖的格子＝角色所在那一塊，見第 130 節；快取在 `scene.spots`，角色跑到別的連通塊才重算），
  `spawnMapMon()` 在裡面隨機挑一格（離角色至少 `MON_SPAWN_GAP` 6 格）；數量 `mapMonTarget()`＝可走格數 ÷ `MAP_MON_DENSITY` 60，介於 `MAP_MON_COUNT` 10～`MAP_MON_MAX` 30；不到一半時一口氣補，之後每 1.2 秒補一隻。
  開打綁定一律綁最近的地圖怪（不管多遠），地圖上沒怪才在區域隨機生一隻；不再在角色身邊生怪。
  `sceneHuntReady()`（combat.js 尋怪時間到時呼叫）：畫面開著時要角色走到某隻怪 2 格內（遠程武器在射程內且看得到）才開打，等 20 秒還沒走到就直接開打；畫面沒開（`scene.tickAt` 超過 0.5 秒沒更新）、離線模擬、龍穴照舊。
  怪物攻擊距離：場景每幀在戰鬥怪寫 `inst.near`／`nearAt`（貼身 1 格，會魔法的 4 格；龍穴的龍 `fixed` 不限），combat.js `mobInReach` 不在距離內就延後 0.2 秒再判斷；畫面沒開不限制，離線收益不變。
  其他圍上來的怪用 BFS 尋路每 0.3 秒走一格到角色旁邊（橘色血條、不標名字，避免擠在一起）。
  每隻 HP 下降都飄傷害數字（爆擊大字只算目標）；訊息含「（範圍）」時所有圍上來的怪都爆特效（魔法紫色、物理橘色）；玩家受傷時隨機一隻貼身的怪做攻擊動作。
- **打擊感**（2026-10-18，版本 `20261018e`，使用者要求「參考天堂經典版，怪物被打到身體稍微縮一下；爆擊字體紅色且放大」）：
  - 受擊：`sceneReadEvents` 偵測到怪物 HP 下降時呼叫 `monHurt(m, crit)`（每隻圍上來的怪都算，普攻、技能、魔法、範圍都會），`m.hurt` 持續 `HURT_MS` 220ms；
    `drawMon` 用 sin 曲線：以腳底為中心壓扁（高 −13%、寬 +7%）、沿「離開角色」方向退 4px、前 45% 時間閃白（`ctx.filter = brightness(1.9)`，不支援 `ctx.filter` 的舊 Safari 只有壓扁）；爆擊幅度 ×1.7。圖片怪與 emoji 怪都有。
  - 爆擊數字：`addFloat(…, crit)` 紅色 `#ff3b2f`、24px（一般 13px）、黑邊 4px，前 140ms 從 1.7 倍彈回、停留 1.1 秒、上飄較少（原本是 17px 黃字）。
    爆擊判斷改成訊息樣式 `crit` **且**含「爆擊」：反擊（🛡️ 反擊！）也用 crit 樣式，以前會被誤當爆擊。
  - 驗證：本機掛機 8 秒受擊效果正常觸發；強制爆擊 7 秒，6 次爆擊都出現紅色 24px 數字；畫布截圖比對受擊瞬間怪物變亮、變矮、後退；Console 無錯誤。
  - **第二版（版本 `20261018h`）**：使用者回報「手機版沒有怪物打擊感」。線上已是新版，原因是效果太細（手機上怪物約 40px 高，壓扁 13% 只差 5px）且 iPhone Safari 不支援 `ctx.filter`（沒有閃白）。改成：
    `HURT_MS` 260ms、壓扁高 −22%／寬 +12%、後退 7px（爆擊 ×1.5）；閃白改用 `hitFlashCanvas`（把這一格畫到暫存畫布、`source-atop` 塗白，濃度 0.7 由濃變淡，爆擊 0.85，所有瀏覽器都支援，只有圖片怪有）；
    `monHurt` 另外推一個 `kind: 'spark'` 特效：身體中間 8 道十字光芒＋白色核心，180ms（爆擊 260ms、較大、橘色）。驗證：手機模擬（375 寬）畫布截圖比對受擊瞬間怪物變白、變矮變寬、有火花；Console 無錯誤。
- 角色：用職業圖示，一格一格上下左右移動（每秒 5.5 格），朝左走時圖示翻轉，移動中會上下晃。
  - 掛機尋怪中：BFS 尋路走到最近的地圖怪旁邊。
  - 開打（`hunt.mon` 出現）：把最近的地圖怪綁定成這隻戰鬥對象（沒有就在旁邊生一隻；龍穴直接出現在角色上方），顯示名稱、等級、血條，走到旁邊面對面。
    目標打不到時優先改打身邊的怪、鎖定 5 秒沒出手重新鎖定（第 6 節「目標鎖定」）。
  - 野外停止掛機：原地附近隨機走動。
  - **村莊：玩家自由控制**（2026-10-09 使用者要求，取代 10-08 的「站著不動」）：點／觸控地圖 `sceneClick` → `sceneWalkTo` 用 BFS 走過去
    （點到牆或建築就走到最近的旁邊，目的地畫一個淡出的金色圈 `scene.moveMark`）；電腦版方向鍵／WASD 按住連走（`sceneKeys`、`sceneKeyDir`），
    只在村莊、狩獵畫面顯示、沒開對話框、焦點不在輸入框時生效，視窗失焦會放開按鍵。村莊標題提示「點地圖走路・方向鍵／WASD 移動」。
- 怪物：地圖上維持 6 隻（外觀依地點與玩家等級挑），每 0.9～2.6 秒隨機走一格；被打倒的淡出後在附近補新的。
- 特效：怪物／玩家 HP 減少時飄白色／紅色傷害數字並前衝；HP 回復飄綠色；讀遊戲訊息分類補上 MISS、爆擊（黃色大字）、魔法光環、LEVEL UP、掉寶 🎁。
- **村莊背景圖**（2026-10-08）：使用者提供的中世紀村莊俯視圖 `images/maps/village.webp`（1755×896，石板廣場＋噴泉、教堂、市集攤位、港口），鋪成 30×15 格，角色站在噴泉下方 [13,10]。
  `SCENE_BGS.village.walk` 列出**可以走的範圍**（廣場、往南泥土路、石橋、教堂旁北路、往港口的東側草地；其他格子 `buildScene` 都設成牆），
  `block` 再擋掉範圍內的噴泉、市集攤位、推車。換村莊圖時要重新對 `walk`／`block`。
  **商人 NPC**（2026-10-11 使用者依配置圖規劃，版本 `20261011f`）：`SCENE_BGS.village.npcs` 放 5 位——回收 [16,7]（兩個白色棚子前，版本 `20261011g`）、旅館 [5,8]（左邊房子前）、商店 [8,10]（紅白攤位南邊）、倉庫 [12,9]（噴泉南邊）、鍛造 [23,11]（右下茅草屋前）；`townNpcList(bg)` 只換位置，名字、圖示、功能沿用 `TOWN_NPCS`。NPC 站的格子設成 3（不能走），`walk` 加了 [5,7,7,8]、[21,11,23,11] 讓人走得到旅館、鍛造。傳送、任務沒有 NPC：傳送用地圖、任務用任務分頁。四個村莊共用這張圖（NPC 名字依村莊不同）。PC、手機底部的 🏘️ 村莊格與手機村莊頁的「🏘️ 村莊設施」按鈕都已移除（版本 `20261011h`），設施只從 NPC 打開。
  （曾短暫使用天堂官方截圖，因著作權疑慮已換掉，同檔名覆蓋。程式仍支援 `crop` 裁切與 `hot` 可點範圍，之後換圖可用。）
- **灰燼村背景圖**（2026-10-11，版本 `20261011i`）：使用者提供的焚毀村落圖，縮成 `images/maps/ash.webp`（1755×979，315KB），`SCENE_BGS.ash` 鋪成 30×17 格，起點 [16,12]。
  `TOWN_BG = { gludio: 'ash' }` 指定各村莊用哪張圖（沒寫的用低語港 `village`），`themeFor()` 依 `player.loc.id` 換 `bg`。
  `walk`：中間泥濘大路 [13,3,17,6]、[11,6,19,9] 往南展開的空地 [8,9,24,15]；右下「灰燼村」木牌與兩側燒毀房屋不能走。
  商人由 Claude 先排在大路兩旁：倉庫 [14,7]、旅館 [11,8]、鍛造 [19,8]、商店 [9,11]、回收 [22,11]（名字依村莊：柏恩、蘿絲、托爾、雷文、菲茲）；使用者給配置圖後再調整。
- **暗金城背景圖**（2026-10-11，版本 `20261011j`）：使用者提供的雨夜哥德城市廣場 `images/maps/darkgold.webp`（1755×979），`SCENE_BGS.darkgold` 30×17 格，`TOWN_BG.giran`。
  可走：前方石板廣場 [2,13,28,15]、往城堡的大街 [13,11,19,12]；中間騎士雕像 [15,13,18,14] 擋路。
  **圖上已畫好人物**：`npcs` 加 `painted: true` 時不畫 NPC 圖示，只在圖上人物頭頂畫名牌（`h`＝名牌在腳底格上方幾格），點名牌開設施（2026-10-16 起點身體不算，見下方「只有點名牌才開 NPC」）：
  商店＝左邊攤位坐著的兜帽商人 [1,14]、倉庫＝黑甲騎士 [5,15]、傳送師＝兜帽劍士 [8,15]（開地圖）、旅館＝右邊修士 [20,15]、回收＝兜帽女子 [24,15]、鍛造＝打鐵匠 [27,15]。
  `townNpcList` 會把 `npcs` 的欄位（painted、h）一起帶上；2026-10-12（版本 `20261012e`）起**有背景圖的村莊一律不畫 NPC 圖示**（預設 painted、h 0.6），低語港、灰燼村也只剩名牌，點名牌開設施。
- **永夜王都＝大型地圖**（2026-10-11，版本 `20261011k`）：使用者提供的長條全景圖 `images/maps/aden.webp`（2000×553，152KB），`SCENE_BGS.aden` 鋪成 **61×17 格**（比畫面寬，PC、手機都左右捲動，鏡頭跟著角色）。
  做大型地圖的方法：圖片寬高比決定格數（高 17 格，寬＝17×寬/高），每格約 32 原圖像素，原圖不用放大；`walk` 列出地面範圍即可，其他程式不用改。
  可走：市集大街 [4,14,48,15]、[9,12,30,13]、雕像前 [31,13,36,15]、鐵匠區 [40,14,58,15]；國王雕像 [36,12,41,14] 擋路。
  NPC 都是圖上的人（painted）：倉庫＝最左鎧甲衛兵 [3,15]、商店＝攤位前兜帽商人 [9,14]、旅館＝大街修士 [16,14]、傳送師＝雕像旁兜帽術士 [44,14]、回收＝鐵匠區工匠 [49,14]、鍛造＝右下打鐵匠 [56,15]。
- **只有點名牌才開 NPC**（2026-10-16，版本 `20261016c`，使用者要求）：`sceneClick` 順序「名牌 `scene.npcRects` → 其他在線玩家 `presHit` → 走路」，
  點 NPC 身體或周圍不再觸發（舊版「腳底格往上 `ceil(h)` 格／周圍 1 格也算」已移除），點身體就當成點地面（NPC 站的格子不能走，會走到旁邊）。
- **NPC 專用對話框**（2026-10-12，版本 `20261012k`）：點 NPC 名牌走 `npcOpen(n)`→ 設 `townNpcNow = { name, role }`，村莊分頁標題改成「💬 名字（功能）」，
  只顯示招呼語 `NPC_LINES[townSub]`＋這位 NPC 的功能（不顯示村莊資訊、團隊副本／交易所按鈕、設施切換列）；換到其他分頁時清掉。
  回收＝只有回收、旅館＝只有休息、鍛造＝只有鍛造、倉庫＝角色倉庫／帳號共用倉庫切換；**商店分類** `SHOP_CATS`：⚔️ 武器裝備（weapon、armor、ammo）、🧪 藥水（potion、elixir）、📜 卷軸，其他類別出現時多一個「📦 其他」（`shopCat`）。
- 沒有背景圖時的備用村莊：中間泥土廣場、外圍草地，`TOWN_HOUSES` 房屋（`drawHouse` 用 canvas 畫，擋路）；
  `TOWN_NPCS` 7 位 NPC 站在廣場上：商店、回收、旅館、倉庫、鍛造、傳送師（＝地圖）、任務（＝任務分頁），每村名字不同（`names[村莊id]`）。
  頭上名牌 `drawNpcPlate`：深藍圓角框＋細邊，名字亮金色＋功能灰字；點名牌打開對應設施（`scene.npcRects` 記名牌範圍；2026-10-16 起點 NPC 周圍不算）。
  NPC 與角色一起依 y 排序畫。有背景圖的村莊在 `SCENE_BGS` 的 `npcs` 指定位置（見上）。
- 迴圈：`requestAnimationFrame`，只在狩獵畫面顯示時跑（`huntVisible()`），分頁隱藏時不更新；canvas 依 `devicePixelRatio` 調整解析度。

## 18. 人物模型與職業立繪

- 在 `classes.js` 的職業資料加欄位即可，沒有就用職業圖示（emoji）：
  - `sprite: { drawH, charH, walk, attack, cast, hit }`：每個動作一張圖，**列＝方向（0 向下、1 向右、2 向上；向左＝向右水平鏡像）**，欄＝格數。
    每個動作 `{ src, cellW, cellH, frames: { down, right, up }, ms }`（每格毫秒）。所有動作都把角色縮放成 `charH`（113px）身高、腳底貼格子底部，切換動作時大小與位置一致；地圖上依 `drawH`（48px，2026-10-09 由 72 縮小，比例對齊使用者提供的天堂 M 參考圖：人物約佔畫面高 12%）顯示。
  - `art`：職業立繪（16:9 裁切顯示），出現在創角畫面的職業介紹與「人物狀態」頁頂端。
- 動作觸發（`ui-scene.js` 的 `sceneReadEvents` → `playAnim`）：
  - 普攻、技能打到怪（怪物 HP 減少）或沒打中（MISS）→ **attack**
  - 攻擊魔法（訊息 🔮）、施放增益／治癒（訊息 ✨）→ **cast**
  - 自己 HP 減少 → **hit**（攻擊、施法播放中不會被受傷打斷）
  - 動作播完回到 **walk**：移動時輪播，停下來用中間那格當站立。有人物模型時不再用「前衝」位移。
- 畫的順序：角色與怪物依 y 由上往下畫（下面的蓋在上面的前面），名字與血條最後統一畫在最上層。
- 地圖建立時先載入該職業所有動作圖（`spriteImage`）；圖也加進 `sw.js` 安裝時預先快取的清單。
- 目前已有：**惡魔**、**天使**、**魔鬥士**、**聖騎士**、**槍手**、**妖精**、**黑暗妖精**、**修羅**、**騎士**、**王族**、**法師**、**戰士**（12 職業全部都有；沒有某個動作時 `playAnim` 直接略過）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/demon-walk.png` | 146×124 | 6／6／6 | 110ms | 422KB |
| 攻擊 | `images/sprites/demon-attack.png` | 184×145 | 8／8／5 | 60ms | 550KB |
| 施法 | `images/sprites/demon-cast.png` | 130×144 | 6／6／5 | 80ms | 366KB |
| 受傷 | `images/sprites/demon-hit.png` | 194×124 | 3／3／3 | 90ms | 226KB |
| 立繪 | `images/classes/demon.jpg` | 960×536 | | | 123KB |

- 2026-10-08 四個動作全部換成使用者給的新版 3D 動作表（走路圖背景是畫出來的灰白格紋，用 `"bg": "checker"` 模式）。原圖放在 `tools/sprite-src/demon-*-sheet.jpg`，
  每格裁切框寫在同資料夾的 `demon-*.json`，用 **`tools/cut-sprites.ps1`** 產生（第 18.1 節）。挑格：
  - 攻擊：原圖每方向 2 列×4 格。「向上」第 3、7、8 格畫成正面（產圖錯誤）沒用，向上用 1、2、4、5、6 格。
  - 施法：「向上」第 1 格是正面，沒用，向上 5 格。
  - 受傷：3×3 格子照用。
  - 走路：每方向 6 格。原圖「向下」翅膀上緣與兩側被產圖切成平的，裁切框對齊那條線讓它落在淡出區；「向右」第 1 格左邊避開「向右」字樣，翼尖少一點。
- 之後新素材建議：每格分開、中間留空、背景單色或透明，每格同尺寸、角色置中、腳底同一高度。

**天使**（2026-10-08，規格 `tools/sprite-src/angel-*.json`，四份都用 `"tol": 34, "global": true`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/angel-walk.png` | 108×148 | 5／5／5 | 120ms | 276KB |
| 攻擊 | `images/sprites/angel-attack.png` | 204×153 | 8／8／8 | 60ms | 742KB |
| 施法 | `images/sprites/angel-cast.png` | 148×149 | 5／5／4 | 90ms | 452KB |
| 受傷 | `images/sprites/angel-hit.png` | 192×128 | 3／3／3 | 90ms | 203KB |
| 立繪 | `images/classes/angel.jpg` | 960×536（原圖 2000×1116 縮小） | | | 130KB |

- 施法「向上」第 1 格是正面，沒用。走路原圖 5 格相鄰、翅膀伸出格子被切掉，靠邊緣淡出處理。
- 天使身高以頭頂光環量，和惡魔（量到角尖）在地圖上看起來差不多高。

**魔鬥士**（2026-10-08，規格 `tools/sprite-src/magicfighter-*.json`，`"tol": 14` ＋ `"shape"`：走路 10、攻擊 6、施法 6、受傷 8）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/magicfighter-walk.png` | 68×127 | 6／6／6 | 110ms | 179KB |
| 攻擊 | `images/sprites/magicfighter-attack.png` | 198×142 | 10／9／10 | 50ms | 556KB |
| 施法 | `images/sprites/magicfighter-cast.png` | 148×147 | 3／5／6 | 90ms | 301KB |
| 受傷 | `images/sprites/magicfighter-hit.png` | 108×128 | 3／3／3 | 90ms | 126KB |
| 立繪 | `images/classes/magicfighter.jpg` | 960×536 | | | 142KB |

- 黑衣、黑髮和背景顏色完全一樣（約 25,26,36），只能用形狀去背（第 18.1 節 `shape`）。
- 施法「向下」第 4～6 格把碎石地面整片畫進去、「向右」第 6 格整格是火焰地面加深色底，都沒用。
- 攻擊原圖每方向 2 列（向右第一列只有 4 格），每格裁切框依人物間的空隙算出。

**聖騎士**（2026-10-08，規格 `tools/sprite-src/paladin-*.json`；新版原圖是格紋背景，用 `"bg": "checker2"`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/paladin-walk.png` | 144×126 | 6／6／6 | 120ms | 431KB |
| 攻擊 | `images/sprites/paladin-attack.png` | 140×143 | 8／8／5 | 60ms | 460KB |
| 施法 | `images/sprites/paladin-cast.png` | 152×161 | 5／5／8 | 90ms | 549KB |
| 受傷 | `images/sprites/paladin-hit.png` | 238×131 | 3／2／2 | 110ms | 245KB |
| 立繪 | `images/classes/paladin.jpg` | 960×536 | | | 139KB |

- 第一版原圖有教堂背景（留在 `paladin-*-v1-sheet.jpg`）；使用者重產成格紋背景版（`paladin-*-sheet.jpg`，走路格 21px、攻擊格 107px＋`"shape": 7`、施法格 23px）。
  新版白披風碰到白格子沒有輪廓線，**向上**的走路與攻擊切不乾淨，改用 v1 原圖（規格 `"alt": { "v1": {...} }`，那幾格寫成 `{ "r": [...], "src": "v1" }`）：
  走路 上 v1 全 6 格；攻擊 上 v1 第 4～8 格；施法 下 1/2/3/4/7、右 1/2/3/5/6（其他格光芒蓋住格紋挖不乾淨）、上 8 格全新版。
  向下走路兩翼之間頭頂的光環後面透出格紋（帶金色，不算中性灰），沒去掉，地圖上約十幾像素。
- 受傷圖第一版整張是教堂背景無法使用，使用者 2026-10-08 重產成格紋背景版（`paladin-hit-sheet.jpg`），用 `"bg": "checker2", "checkerSize": 17`。
  向右第 3 格披風被吃掉、向上原圖第 2 格兩種設定都切不好，沒用；向上原圖第 3 格關掉陰影修正（裁切框第 5 個數字 0）保住披風，腳下留一點陰影格紋。

**槍手**（2026-10-08，規格 `tools/sprite-src/gunner-*.json`，黑衣和深色背景同色，`"tol": 14, "shape": 7`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/gunner-walk.png` | 108×119 | 6／6／6 | 110ms | 224KB |
| 攻擊 | `images/sprites/gunner-attack.png` | 154×129 | 8／8／8 | 50ms | 359KB |
| 施法 | `images/sprites/gunner-cast.png` | 156×142 | 5／6／5 | 90ms | 345KB |
| 受傷 | `images/sprites/gunner-hit.png` | 130×120 | 3／3／3 | 90ms | 142KB |
| 立繪 | `images/classes/gunner.jpg` | 960×536 | | | 127KB |

- 攻擊原圖沒有格線，裁切框取相鄰人物中間。施法 下 1/2/3/4/8、右 1/2/3/4/6/7、上 1/2/3/6/8（其他格有地面法陣或光芒後面的深色方塊）。

**妖精**（2026-10-09，版本 `20261009w`；四個動作都在同一張原圖 `tools/sprite-src/elf-sheet.jpg`（2000×1116），規格 `elf-*.json` 用 `"tol": 26, "flat": true, "labels": true`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/elf-walk.png` | 98×116 | 3／2／3 | 150ms | 118KB |
| 攻擊 | `images/sprites/elf-attack.png` | 146×127 | 6／5／4 | 60ms | 303KB |
| 施法 | `images/sprites/elf-cast.png` | 206×152 | 5／4／4 | 90ms | 411KB |
| 受傷 | `images/sprites/elf-hit.png` | 116×121 | 3／3／2 | 90ms | 134KB |
| 立繪 | `images/classes/elf.jpg` | 960×536（原圖 2000×1116 縮小） | | | 162KB |

- 原圖是 AI 產的，標示和實際方向不一致，挑格依實際畫面：
  - 走路：原圖有「空手」與「拿弓」兩組，混用會讓弓忽隱忽現，**統一用拿弓那組**：下＝原圖格 11、14、15（3/4 正面）；右＝12、16（側面）；上＝第 2 列最後一格 18、第 3 列 17、18（背面）。
  - 攻擊：沒有正面射擊，下＝左區第 1 列 6 格（站姿→拉弓，3/4 正面）；右＝右區第 3 列 5 格；上＝右區第 1 列背面 4 格（標「1」那格是正面，沒用）。
  - 受傷：下 1～3 格；右 3 格；上 2 格（原圖「向上」其實是往前撲的側面，照原圖標示用）。
  - 施法：下 5 格（含魔法陣）、右 4 格、上 4 格（原圖「向上」也是側面施法）。
- 原圖背景是純灰（72,72,74）且每格右下有金色編號，工具新增兩個選項（第 18.1 節）。

**黑暗妖精 v5**（**未使用**，2026-10-19 版本 `20261019i` 用了一下，同一天使用者要求改回第一版（`20261019j`）；使用者給的新動作表 `tools/sprite-src/darkelf-v5-sheet.jpg`（1342×2000，白底，左邊灰色標籤欄：FRONT WALK／SIDE WALK／ATTACK 1-8／DAMAGED 1-3＋BACK／CAST 1-8），雙持火焰彎刀；
規格 `darkelf-v5-*.json` 用 `"tol": 18, "flat": true`，四個動作都用走路量到的 `"bodyH": 313`（縮放 0.361），大小一致；立繪與全身像沿用 v4）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/darkelf-v5-walk.png` | 88×117 | 5／5／2 | 120ms | 118KB |
| 攻擊 | `images/sprites/darkelf-v5-attack.png` | 134×116 | 9／9／2 | 50ms | 205KB |
| 施法 | `images/sprites/darkelf-v5-cast.png` | 122×85 | 6／4／2 | 90ms | 126KB |
| 受傷 | `images/sprites/darkelf-v5-hit.png` | 88×116 | 3／3／3 | 90ms | 73KB |

- 每格裁切框用「每段沒有墨水的空白欄」自動找出：走路正面 y 30～360、側面 395～708；攻擊兩列 728～968、970～1226；受傷 1236～1516；施法兩列 1528～1762、1764～1999（x 見 json）。
- 挑格：走路 下＝正面 5 格、右＝側面 5 格、上＝兩列最後一格背面（受傷那排右邊的 BACK 單格畫得比較小，大小會跳，沒用）；
  攻擊 下／右＝同一組 9 格（原圖是 3/4 側面，往下打也用它），上＝走路的兩格背面（攻擊第 2 列最後一格背面也畫得比較小，沒用）；
  施法 下＝第 1 列 1～4＋第 2 列 1、2，右＝第 1 列 4、第 2 列 2、第 2 列 3（往右放紫焰）×2，上＝兩列最後一格背面；受傷 下／右＝3 格，上＝背面走路格。
- 攻擊區右下有淡紫色煙霧漸層，第 1 列 4、5 格與第 2 列 4 格去背留下白塊 → 這幾格用 `"alt": { "haze": { "tol": 55, "flat": true } }`（同一張原圖、放寬容差）。
- sw.js 預先快取曾改成 v5 四張圖，改回第一版時也換回去了。
**黑暗妖精 v4**（**未使用**，被 v5 取代；2026-10-16，版本 `20261016p`；使用者給的新動作表 `tools/sprite-src/darkelf-v4-sheet.jpg`（2000×1116，白底，只有外框線、格子之間是空白）＋**原創立繪** `tools/sprite-src/darkelf-art-src.jpg`（1342×2000）；
規格 `darkelf-v4-*.json` 用 `"tol": 18, "flat": true`，每段平均切格）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/darkelf-v4-walk.png` | 128×120 | 8／8／8 | 110ms | 362KB |
| 攻擊 | `images/sprites/darkelf-v4-attack.png` | 150×105 | 8／8／8 | 55ms | 431KB |
| 施法 | `images/sprites/darkelf-v4-cast.png` | 286×125 | 8／6／8 | 90ms | 811KB |
| 受傷 | `images/sprites/darkelf-v4-hit.png` | 124×124 | 3／3／3 | 90ms | 146KB |
| 立繪 | `images/classes/darkelf.jpg` | 960×536（原創立繪全寬、從 y 140 往下裁 16:9） | | | 100KB |
| 全身像 | `images/classes/hero/darkelf.png?v=2` | 478×700 去背 PNG | | | 308KB |

- 區塊 x：正面 82～710、側面 713～1348、背面 1350～1977；y：走路 107～261＋261～415（兩列）、攻擊 417～555＋555～693、受傷 698～860、施法 865～982＋982～1100。
  走路、攻擊每段 4 格×2 列，受傷 3 格，施法正面／背面 4 格、側面 3 格×2 列；每格內縮 2px。走路量到身高 133（縮放 0.85），攻擊、受傷 `"bodyH": 133`；施法人物畫得比較小，自動量（96）。
  背面施法第 2、6 格只有龍捲風特效、看不到人（原圖如此）。
- **立繪／全身像**：使用者先貼了《我獨自升級：ARISE》官方宣傳圖（有 Netmarble 商標與版權字），**不能用**；改請使用者生成原創圖。
  這台電腦沒有 Python／Segment Anything，新工具 **`tools/stage/art-cut.ps1`**（PowerShell＋C#）：① 立繪 960×536 從 `-BannerY` 裁 16:9；
  ② 顏色去背：背景＝高彩度偏紫藍（`-Chroma` 48、藍比綠多 12）從邊緣洪水填滿 → 第二輪從背景往內吃「暗、偏紫」的煙霧觸手（亮度 < 100、彩度 ≥ 24），`-Protect` 矩形內不吃（頭髮也偏紫，黑暗妖精用 `660,170,1000,480`）
  → 留最大塊 → 身體圍住的大片亮紫色（手臂與身體之間看到的背景）挖掉 → 填小洞 → 3×3 模糊當柔邊 → 縮成高 700。
  執行：`powershell -ExecutionPolicy Bypass -File tools\stage\art-cut.ps1 -Src tools\sprite-src\darkelf-art-src.jpg -Cls darkelf -BannerY 140 -Chroma 48 -Protect 660,170,1000,480`。只適合背景是單一強烈色調、角色是黑灰白或暖色的圖。
- 全身像輸出是 PNG（System.Drawing 不能寫 webp），職業加 **`hero` 欄位**指定路徑；`heroSrc(cls)`（ui-create.js）＝`CLASSES[cls].hero` 或 `images/classes/hero/職業.webp?v=1`，創角舞台與人物狀態頁都用它。
  `CLASS_FRONT.darkelf` 改成 `[309, 35, 651, 535]`（新全身像寬高比 0.683、高 500、置中）。
- v3（下一段）與更早的版本圖檔都留著。

**黑暗妖精 v3**（**未使用**，2026-10-16 版本 `20261016n` 用了一下就被 v4 取代；使用者給的新動作表 `tools/sprite-src/darkelf-v3-sheet.jpg`（**1024×572**，聊天附圖被壓縮過，人物約 90px 高，地圖上畫 48px 仍夠用；有原始大圖可換掉同檔名重切），
白底灰格線、正面／側面朝右／背面，規格 `darkelf-v3-*.json` 用 `"tol": 18, "flat": true`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/darkelf-v3-walk.png` | 122×130 | 4／3／4 | 140ms | 199KB |
| 攻擊 | `images/sprites/darkelf-v3-attack.png` | 150×122 | 4／3／4 | 90ms | 249KB |
| 施法 | `images/sprites/darkelf-v3-cast.png` | 216×105 | 6／6／7 | 90ms | 662KB |
| 受傷 | `images/sprites/darkelf-v3-hit.png` | 132×90 | 3／3／3 | 90ms | 123KB |

- 格線（x）：正面 60/139/218/297/376、側面 376/481/586/691、背面 691/770/849/928/1007；列（y）：走路 76～196、攻擊 202～338、受傷 345～430、施法 438～498＋498～558（兩列接起來）。
  受傷格線 正面 60/165/271/376、側面 376/481/579/690、背面 691/800/905/1007；施法 正面 60/134/211/287/376、側面 376/479/579/690、背面 691/772/854/930/1007。每格內縮 3px（產規格的小程式在對話裡，格子規則照上面）。
- 走路量到原圖身高 87（縮放 1.299）；攻擊、受傷用 `"bodyH": 87` 同縮放。**施法格在原圖畫得只有一半大**，自動量會變 3 倍（1.3MB），改 `"bodyH": 48`（縮放 2.35）。
- 施法正面第 6、7 格、背面第 8 格的煙霧和白底連在一起去不乾淨（留白框），沒用；正面用 1～5＋8、背面 1～7。
- 舊版（下面兩段）圖檔與規格都留著，要換回去改 `classes.js` 的 `sprite` 與 `sw.js` 清單即可。

**黑暗妖精（第一版）**（**目前使用中**：2026-10-19 版本 `20261019j` 使用者貼這張原圖說「改回這個」，`classes.js` 與 sw.js 換回下表四張圖（立繪、全身像仍是 v4 的原創圖）；之前 2026-10-16 換成 v3；2026-10-15 曾換成下方 v2，10-16 使用者覺得 v2 攻擊不協調、改回這版；2026-10-09，版本 `20261009x`；同一張原圖 `tools/sprite-src/darkelf-sheet.jpg`（2000×1116），規格 `darkelf-*.json` 用 `"flat": true`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/darkelf-walk.png` | 152×117 | 8／7／7 | 110ms | 368KB |
| 攻擊 | `images/sprites/darkelf-attack.png` | 252×155 | 7／7／5 | 55ms | 713KB |
| 施法 | `images/sprites/darkelf-cast.png` | 206×112 | 4／4／4 | 100ms | 323KB |
| 受傷 | `images/sprites/darkelf-hit.png` | 154×130 | 3／3／3 | 90ms | 187KB |
| 立繪 | `images/classes/darkelf.jpg` | 960×536（原圖裁 x 54～1946、y 0～1056 去掉右下角的英文字再縮小） | | | 125KB |

- **原圖沒有背面**：「向下」「向右」兩排其實都是 3/4 朝右走。下＝第 1 排前 8 格、右＝第 2 排 7 格、**上＝沿用第 2 排**；攻擊、受傷每排都是朝右，依序下／右／上各用一排（攻擊第 1、2 排各 7 格、第 3 排 5 格；第 2 格是一個寬格裡兩個人物，從 x≈517 切開）。
- 施法區的格子是深色底（47 灰）加淺色框，裁切框內縮 4px 避開框線、`tol` 18；第 1 排暗紫煙霧和底色分不開（會留下方塊），只用第 2 排 4 格（三個方向共用）。施法右半邊與下排後面幾格只有魔法陣、沒有人物，沒用。
- 蹲姿／跳躍的格子量到的身高偏矮，受傷與施法用 `"bodyH": 97`（與走路相同縮放 1.165），不然人物會變大。
- 之後有背面（向上）的走路／攻擊圖，換掉 `up` 那排即可。

**黑暗妖精 v2**（**未使用**，2026-10-16 版本 `20261016a` 改回舊版；圖檔與規格留著備用。原本 2026-10-15 版本 `20261015r`，施法 `20261015s`；使用者給的新動作表 `tools/sprite-src/darkelf-v2-sheet.jpg`（2000×1091，白底灰框，有正面／側面／背面），規格 `darkelf-v2-*.json` 用 `"tol": 18, "flat": true`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/darkelf-v2-walk.png` | 110×121 | 6／5／6 | 110ms | 212KB |
| 攻擊 | `images/sprites/darkelf-v2-attack.png` | 134×107 | 12／12／12 | 45ms | 525KB |
| 施法 | `images/sprites/darkelf-v2-cast.png` | 100×109 | 5／5／5 | 100ms | 204KB |
| 受傷 | `images/sprites/darkelf-v2-hit.png` | 92×108 | 5／5／4 | 90ms | 169KB |

- 原圖每段標「8／10／5／12 格」，實際格數以表為準（走路 6／5／6、攻擊每方向 2 列×6 格）。
- **施法區（y 816～1082）畫成另一個角色**（長角的重甲魔物、背面一格塞兩人、正面下排只剩漩渦），沒用。施法改用**受傷正面那排 5 格**（舉手、身邊有電光碎片，使用者指定），三個方向共用（規格 `darkelf-v2-cast.json`，`"bodyH": 133` 與走路同縮放）。
- 受傷「正面」那排也是厚重盔甲、不像黑暗妖精，`down` 改用側面那排 5 格（與 `right` 相同）。
- 攻擊是蹲姿、量到身高 86，用 `"bodyH": 100`；受傷 `"bodyH": 105`（自動量的話會比走路大 1.3～1.5 倍）。舊版走路／攻擊／受傷圖檔留著沒刪。

**修羅**（2026-10-09 `20261009y`；2026-10-10 `20261010a` 重切改善模糊；同一張原圖 `tools/sprite-src/shura-sheet.jpg`（2000×1116，3D 渲染））

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 | 去背 |
|---|---|---|---|---|---|---|
| 走路 | `images/sprites/shura-walk.png` | 188×130 | 8／8／2 | 110ms | 357KB | `matte` tol 32 |
| 攻擊 | `images/sprites/shura-attack.png` | 282×125 | 9／9／9 | 55ms | 1162KB | `shape` 5、tol 14 |
| 施法 | `images/sprites/shura-cast.png` | 214×116 | 4／4／4 | 110ms | 300KB | `shape` 5、tol 14 |
| 受傷 | `images/sprites/shura-hit.png` | 162×120 | 3／3／3 | 90ms | 213KB | `matte` tol 32 |

- 四份都加 `"shadowLeft": true, "sharpen": 0.8`，除攻擊外 `"bodyH": 87`。
- **模糊的原因**（使用者 10-10 回報）：原圖人物只有約 87px 高（騎士約 175px），切圖放大 1.3 倍、手機高解析度螢幕再放大一次；
  加上形狀去背把邊緣一圈背景包進來，留下暗色鋸齒。改善：走路／受傷改用新的 `matte` 去背（邊緣柔和、無暗邊）、全部加 `sharpen` 銳化。
  攻擊／施法的刀光、光球佔滿整列，`matte` 的「整列中位數＝背景」不成立（會留灰色方塊），所以維持 `shape`。根本解法是請 AI 產人物更大的動作表。
- 走路的裁切框右邊界收到「刀尖＋12px」（不是相鄰人物中點），避免下一個人物往左拖的長影子伸進這格變成細長暗線。
| 立繪 | `images/classes/shura.jpg` | 960×536（原圖 2000×1116 縮小） | | | 127KB |

- 原圖**沒有格線**，人物排在深灰漸層長條上：用「紅色像素（R−G > 45）」找出每個人物的水平範圍，裁切框取相鄰人物的中點；長條上下緣：走路 60～164／172～275、攻擊 330～432、受傷 616～712／728～822、施法 881～989／996～1103。
- 方向：所有格子都是正面偏右；只有走路兩排的**第 3 格是背面** → 走路 下＝第 1 排第 4～11 格、右＝第 2 排第 4～11 格、上＝兩排的第 3 格（2 格）。
- 攻擊只用第 1 排第 2～10 格，三個方向共用（第 2 排「向上」其實也是正面，而且第 7～9 格與第 1 排第 11 格的刀光把背景圍住，留下大塊灰底）。
- 施法只用第 2 排第 1、2、3、5 格（三方向共用）；第 1 排第 3 格與後面的魔法陣格會留灰底，沒用。受傷 下＝第 1 排前 3 格、右／上＝第 2 排 3 格（第 1 排後 5 格火焰版沒用）。
- 深色盔甲和深灰底接近，提高 `tol` 會把腿吃掉，所以維持形狀去背；地上往左拖的長影子用新選項 `shadowLeft` 去掉（第 18.1 節）。受傷、施法用 `"bodyH": 87`（和走路同縮放）。邊緣仍有少許暗色鋸齒，地圖上 48px 看不太出來。

**騎士**（2026-10-09，版本 `20261009z`；同一張原圖 `tools/sprite-src/knight-sheet.jpg`（2000×1116），純灰底 (52,52,52) 沒格線，規格 `knight-*.json` 用 `"tol": 30, "flat": true`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/knight-walk.png` | 134×122 | 8／8／6 | 110ms | 352KB |
| 攻擊 | `images/sprites/knight-attack.png` | 194×136 | 3／3／3 | 110ms | 224KB |
| 施法 | `images/sprites/knight-cast.png` | 156×136 | 3／3／3 | 140ms | 258KB |
| 受傷 | `images/sprites/knight-hit.png` | 148×125 | 3／3／3 | 90ms | 168KB |
| 立繪 | `images/classes/knight.jpg` | 960×536（原圖 2000×1116 縮小） | | | 131KB |

- 這張方向正確（下＝正面、右＝側面、上＝背面），照原圖順序用：走路 兩列 × 下 4／右 4／上 3；攻擊、受傷、施法各方向 3 格。
- 裁切框取相鄰人物的中點，並避開每段左邊的直排「向下／向右／向上」字（x 190～225、800～837、1410～1465）。
- 量到的身高因羽飾、舉劍不同，攻擊／受傷／施法用 `"bodyH": 175`（和走路同縮放 0.646）。攻擊只有 3 格，每格 110ms。

**王族**（2026-10-10，版本 `20261010d`；同一張原圖 `tools/sprite-src/royal-sheet.jpg`（2000×1116），深灰漸層格子＋淡格線，規格 `royal-*.json` 用 `"tol": 30, "flat": true`）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/royal-walk.png` | 114×121 | 6／5／6 | 110ms | 287KB |
| 攻擊 | `images/sprites/royal-attack.png` | 134×114 | 8／8／8 | 60ms | 430KB |
| 施法 | `images/sprites/royal-cast.png` | 208×115 | 8／6／6 | 90ms | 507KB |
| 受傷 | `images/sprites/royal-hit.png` | 172×117 | 2／2／2 | 130ms | 129KB |
| 立繪 | `images/classes/royal.jpg` | 960×536（原圖 2000×1116 縮小） | | | 145KB |

- 格子（內縮 3px）：上半 y 96～249／252～403／407～557，走路 x 148 起 6 格（每格約 126）、攻擊 x 962 起 8 格；下半 y 649～793／797～943／947～1091，受傷 x 233～443、446～655，施法第 1 列同攻擊 8 格、第 2～3 列 6 格寬格（x 962～1965）。
- 走路「向右」第 1 格（原圖 7）其實是正面，沒用。右下角的灰色小編號會被「碰到邊緣的小塊」規則自動去掉。
- **原圖方向畫反**：攻擊「向右」第 1～5、8 格與受傷「向右」第 1 格是朝左，切圖工具新增 `"flip": true`（每格寫成 `{ "r": [...], "flip": true }`）左右鏡像。
- 攻擊／受傷／施法用 `"bodyH": 129`（和走路同縮放 0.876）。受傷每方向只有 2 格，每格 130ms。
**法師**（2026-10-10，版本 `20261010o`；同一張原圖 `tools/sprite-src/mage-sheet.jpg`（2000×1116），深灰格子（約 55）＋深色格線，規格 `mage-*.json`，用 **Python 版切圖工具**（第 18.2 節））

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/mage-walk.png` | 121×127 | 5／5／5 | 120ms | 223KB |
| 攻擊 | `images/sprites/mage-attack.png` | 132×127 | 3／4／7 | 80ms | 208KB |
| 施法 | `images/sprites/mage-cast.png` | 130×126 | 3／8／8 | 90ms | 441KB |
| 受傷 | `images/sprites/mage-hit.png` | 127×123 | 3／3／3 | 90ms | 132KB |
| 立繪 | `images/classes/mage.jpg` | 960×536（原圖 `mage-art.jpg` 裁 x 53～1947、y 0～1056 去掉右下角誤寫的「Magic Gladiator」再縮小） | | | 156KB |

- 格線（量出來的格子範圍）：上半 y 104～250／257～403／411～556；下半 y 658～797／805～943／950～1089；走路／受傷 x 151、291、432、571、711 起（寬約 134），攻擊／施法 x 886 起 8 格（每格約 135）。
- 方向正確（下＝正面、右＝側面、上＝背面），但**有些格子只有魔法、沒有人物**，沒用：攻擊 下＝第 1～3 格、右＝1、2、3、5、上＝1、2、3、5～8（第 4 格漩渦旁留暗色弧線）；
  施法 下＝1、2、5（3、4、6 只有魔法陣，7、8 是背面）、右＝全部 8 格、上＝全部 8 格。受傷「向右」原圖朝左，三格都 `flip`。
- 四份都用 `"bodyH": 127`（走路量到的身高，縮放 0.89），切換動作時大小一致；攻擊、施法加 `"glow": true` 去掉光暈周圍的灰底方框。

**戰士**（2026-10-10，版本 `20261010p`；原圖 `tools/sprite-src/warrior-sheet.jpg`（2000×1116），深灰背景（約 49,52,57）**沒有格線**，規格 `warrior-*.json`，用 Python 版切圖工具）

| 動作 | 檔案 | 格子 | 格數（下／右／上） | 每格 | 大小 |
|---|---|---|---|---|---|
| 走路 | `images/sprites/warrior-walk.png` | 102×131 | 5／5／5 | 120ms | 240KB |
| 攻擊 | `images/sprites/warrior-attack.png` | 173×142 | 6／6／6 | 70ms | 351KB |
| 施法（怒吼） | `images/sprites/warrior-cast.png` | 195×174 | 6／6／6 | 90ms | 624KB |
| 受傷 | `images/sprites/warrior-hit.png` | 125×138 | 3／3／3 | 90ms | 153KB |
| 立繪 | `images/classes/warrior.jpg` | 960×536（原圖 `warrior-art.jpg` 裁 x 53～1947、y 0～1056 去掉底部誤寫的英文字再縮小） | | | 137KB |

- 格子範圍：走路 x 160／285／420／560／697～835、y 88／246／400～560；攻擊 y 70／242／394～562（每列 x 範圍不同，見 json）；
  受傷 x 172／378／565～735、y 630／786／946～1108；怒吼 x 878／1052／1240／1440／1625／1810～1998、y 578／782／936～1110（第 1 列前兩格 y 從 640 起，避開標題字）。
- 四份都用 `"bodyH": 135`（縮放 0.837）。攻擊用 `"glow": "warm", "holes": 120`（金色刀光淡出、去掉刀光圍住的灰底）；
  怒吼再加 `"glowSat": 8, "glowSmooth": 26`（火焰外圍的淡紅霧也當光暈，不留暗紅硬邊）。

**創角舞台：十二職業合照**（2026-10-11，版本 `20261011a`；`ui-create.js` 的 `CLASS_STAGE`／`renderStage`，CSS `.class-stage`）
- 背景 `images/classes/all.jpg?v=2`（1400×1045）：使用者提供的 12 人合照（原圖 `tools/sprite-src/all-classes.jpg`，2000×1493），
  重複的標籤（妖精 3 個、王族 2 個、黑暗妖精 2 個）用 OpenCV inpaint 擦掉，各留腳下那個；原圖缺「魔鬥士」標籤，用 Noto Sans TC Light 補在他右側（`tools/stage/clean.py`）。
- 選中的職業「走出來」（參考使用者給的 GOD 血冠創角畫面，2026-10-11 改用立繪全身像，版本 `20261011b`）：
  ① 合照整張變暗（`brightness(.38)`），選中職業在合照原位置的去背圖 `images/classes/stage/職業.webp?v=1` 亮起來（`.stage-pick`）；
  ② 該職業立繪（`images/classes/職業.jpg`）去背的**全身像** `images/classes/hero/職業.webp?v=1`（每張 30～90KB，共約 640KB，開創角畫面時預先載入、不進 `sw.js` 預先快取）站到舞台前方（`.stage-front`）：
  把整張立繪（960×536）當成高＝舞台 80%（`FRONT_H`）的框，腳底貼舞台底部，水平中心跟合照位置走（限制在 28%～72%），`CLASS_FRONT` 是全身像在立繪中的範圍；
  用 Web Animations 從合照上的腳底位置、合照身高（縮小倍數）放大移到前方，0.75 秒；腳下光圈 `.stage-glow`。上方顯示「選擇英雄職業／職業名／介紹第一句」。
- 立繪去背（`tools/stage/artcut.py`）：先把底部金色標題字 inpaint 掉，SAM 給框＋正向點（頭、身、腳、翅膀、武器）＋反向點（背景的月亮、廢墟、熔岩、魔法漩渦），
  修羅的紅色煙霧和身體太像，改用單點＋第 2 個候選遮罩；去小碎塊（< 最大塊 12%），標題那段往下淡出（腳被字蓋住）。
- 點合照上的人也能選職業：每個職業一個透明按鈕 `.stage-hit`（範圍內縮 12%，`CLASS_STAGE` 由後往前排，前排蓋在上面優先）。
  舞台左右有 ‹ › 箭頭（`stageStep(±1)`，照 `CLASSES` 順序循環）。只有換職業時才重播動畫（`stageCls`），加減能力值不會。
  原本的 12 格職業按鈕 `#create-classes` 已移除（2026-10-11 使用者要求，版本 `20261011c`），舞台下方原本的單職業立繪也移除（版本 `20261011e`），只留職業介紹、背景故事、可用武器（立繪仍用在遊戲內人物面板 `ui-panels.js`）。
- 去背圖產生方式：Segment Anything（`sam_vit_b`，pip `segment-anything`＋CPU 版 torch）對每個職業給框＋正向點（頭、身體、翅膀）＋反向點（旁邊的人），
  天使、惡魔身體和翅膀分開切再聯集（`tools/stage/seg.py`）；`tools/stage/post.py` 依前後順序（法師、騎士、王族、黑暗妖精、魔鬥士、槍手、妖精、聖騎士、天使、修羅、戰士、惡魔）
  把重疊的點分給前面的人、去小碎塊、羽化 1.2px，用擦掉全部標籤的版本當顏色來源；戰士只留到 y 770（下面被王族擋住）。
  `CLASS_STAGE` 的數字＝去背圖在原圖的範圍（`post.py` 印出的 meta）。所有圖都在 `sw.js` 預先快取。

### 18.1 切圖工具 `tools/cut-sprites.ps1`

```
powershell -ExecutionPolicy Bypass -File tools\cut-sprites.ps1 -Spec tools\sprite-src\demon-attack.json -Preview 預覽.png
```

- 規格 JSON：`sheet` 原圖、`out` 輸出 PNG、`charH`（113，與 classes.js 一致）、`tol` 背景容差（26）、`pad`、`dirs.down/right/up` 每格 `[x,y,w,h]`（照播放順序）。
  可選 `bodyH` 直接指定原圖身高（不自動量）；`"bg": "checker"`＝背景是畫出來的灰白格紋（假透明）；
  `"global": true`＝角色與深藍底色差很大時（天使），「暗且偏藍」（平均 < 75 且藍比紅多 8，或平均 < 22）一律當背景，
  背景 16px 內的暗色暖光也當光暈換成半透明（金光淡出到深藍底的暗褐邊）。暗色角色（惡魔）不要開。
  `"shape": N`＝角色有大片和背景**同色**時（魔鬥士黑衣）改用形狀去背：和背景色差 ≥ tol 的點＝角色細節
  （比背景暗、同色相又平滑的地面陰影不算），膨脹 N px 再侵蝕回來把細節連成輪廓，從邊緣往內填輪廓外當背景；
  再從背景往內吃「非細節點」最多 N px（修掉階梯方塊）、吃「平滑不太亮」的點最多 4N px（法術周圍的深色煙霧），碰到輪廓線就停。
  N 約為原圖人物身高的 2～3%（人物 200px 用 6、450px 用 10）。
  `"dropEdge"`：碰到左右邊、小於主體這個比例的塊去掉（預設 0.25；原圖有背景雜物時用 0.7）；
  `"darkBg"`：global 模式下平均亮度低於此值的暗色一律當背景（預設 22；聖騎士用 50 去掉黑色陰影碎塊）。
  `"bg": "checker2", "checkerSize": 格子px`＝格紋背景、角色本身也有白色（聖騎士白披風）：有顏色或平均 < 120 的點＝角色細節（被陰影壓暗、
  有「隔 1 格差很多、隔 2 格一樣」週期的中性灰除外），膨脹 checkerSize/3 再侵蝕連成輪廓、從邊緣往內填＝背景；被輪廓包住的區域若同時有兩種格紋亮度且多數點有週期性＝露出的格紋。
  格子很大時（攻擊 107px）用 `"shape"` 指定輪廓連接半徑，不然預設 checkerSize/3 太大。
  每一格可寫成 `{ "r": [x,y,w,h], "src": "名稱", "flip": true }`：`src` 改用 `"alt"` 裡同名的原圖與去背設定（新舊原圖混用）；`flip` 把這格左右鏡像（原圖方向畫反時）。
  單一格可在裁切框加第 5 個數字 `0` 關掉陰影修正（陰影擋住披風下緣時，關掉才不會讓背景流進披風）。
  `"flat": true`＝背景是單一純色灰：洪水填滿後，再把「接近背景色（tol 內）且中性灰（RGB 最大最小差 < 12）」的點一律當背景，
  去掉被弓弦、手臂圍住的背景與地面陰影（角色顏色鮮豔時用，妖精）。
  `"shadowLeft": true`＝3D 渲染的長影子往左拖在地上：以裁切框上方 30% 紅色點（頭髮）的 x 中位數當頭部中心，
  下方 40% 且在頭部中心左邊 20px 以外、暗於背景＋4 的中性灰（RGB 差 < 14）當背景；下方 45% 且在頭部中心右邊 30px 以內、同樣暗灰又平滑（周圍 2px 色差 < 16）的腳邊殘影也當背景（盔甲有紋理不會被吃掉）。
  `"matte": true`＝深色漸層底＋深色角色（修羅走路）：每一列用整列像素中位數當背景色，依色差給柔和透明度（tol×0.35 以下透明、tol 以上不透明），
  再從邊緣往內填透明度 < 一半的點，被輪廓包住的內部一律不透明；半透明邊緣扣掉背景色還原顏色。光效佔滿整列的格子不適用。
  `"sharpen": 0.8`、`"trim": N`：縮放完成後對輸出圖做反銳利化遮罩（3×3）／從透明處往內吃 N 圈暗灰雜邊（`PostProcess`）。
  `"labels": true`＝格子右下角有金色編號：裁切框右下 50×34 內的金色點（R>150、G>110、R−B>60）連同外圍 3px 先塗成背景色再去背。
- 去背：每格以裁切框四周中位數當背景色，從邊緣「洪水填滿」——同時要接近背景色（亮度＋色相，色相加重）且與鄰點相近，
  所以會順著漸層走、碰到暗色盔甲就停。靠近背景的偏紅或比背景亮的像素當成光暈：依色差給半透明並扣掉背景色還原顏色；裁切框邊 14px 淡出；
  碰到左右邊的小塊（隔壁格伸進來的劍、翅膀）與小碎點會去掉。
  格紋模式：亮（平均 > 165）且接近中性灰（最大最小差 < 24）的像素一律當背景（角色身上的空隙也去掉）；背景 8px 內的像素以「與最近格紋色的最大色差 ÷ 150」當透明度並扣掉格紋色，火焰與翼緣變成半透明。
- 對齊：腳底＝最大塊最下面；水平＝頭部中心；身高＝腳底到頭頂（只用向下、向右量，取中位數）→ 縮放到 `charH`。
  輸出所有格同尺寸、腳底貼齊格子底部；執行後印出 `cellW／cellH／格數`，照抄到 `classes.js` 的 `sprite`。
- **注意**：腳本要存成 UTF-8 **含 BOM**（Windows PowerShell 5.1 沒 BOM 會把中文註解讀壞，C# 編譯失敗）。
- 新增其他職業模型：把動作表放進 `tools/sprite-src/`、寫一份 json 跑工具，輸出到 `images/sprites/`；立繪放 `images/classes/`。
  在該職業加 `sprite`／`art`，並把檔名加進 `sw.js` 的預先快取清單。`tools/` 資料夾也會發佈到網站上（原圖約 1MB，不影響遊戲載入）。

### 18.2 Python 版切圖工具 `tools/cut-sprites.py`（2026-10-10，雲端主機沒有 PowerShell 時用）

```
python3 tools/cut-sprites.py tools/sprite-src/mage-walk.json --preview 預覽.png
```

- 需要 Pillow。適用**中性灰格子背景＋有顏色的角色**（法師）；其他情況（格紋、形狀去背…）仍用 PowerShell 版。
- 規格：`sheet`、`out`、`charH`（113）、`tol`（背景亮度容差，預設 20）、`inset`（裁切框內縮避開格線，預設 3）、`pad`（4）、`bodyH`（指定原圖身高）、
  `shadow`（預設 true：比背景暗 26 以內的中性灰＝地面陰影也去掉）、`glow`（光暈模式：`true`／`"blue"` 藍光、`"warm"` 火焰與金光、`"any"` 兩種都算）、
  `glowSat`（暖色光暈最低飽和度＝RGB 最大最小差，預設 60；紅比藍多的門檻＝max(4, glowSat×0.4)）、`glowSmooth`（光暈「平滑」門檻，預設 14）、
  `holes`（被刀光、光環圍住、洪水填不到的「像背景」區塊，面積 ≥ 這個像素數也當背景；0＝不處理）、`dirs.down/right/up`（每格 `[x,y,w,h]` 或 `{ "r": [...], "flip": true }`）。
- 去背：每格以邊框亮度中位數當背景，從邊緣洪水填滿「中性灰（RGB 差 ≤ 14）且接近背景亮度」的點；背景 2px 內的點依色差給半透明並扣掉背景色；小於主體 4% 的碎塊去掉。
  `glow`：洪水填滿時遇到「平滑（和上下左右差 ≤ glowSmooth）、偏藍（B ≥ R+4；warm 模式改成飽和暖色）、亮度在背景−8～＋150」的點當光暈，依色差給透明度（色差 ÷ (tol×4)），碰到輪廓線、花紋就停。
- 對齊與輸出同 PowerShell 版：腳底貼齊、水平以頭部（上方 35% 的暗色點）中心、所有格同尺寸；印出 `cellW／cellH／格數` 照抄到 `classes.js`。

### 18.3 怪物模型（2026-10-12，版本 `20261012a`→`20261012b`）

- 使用者提供三張怪物動作表，原圖在 `tools/monsters/`：`S1.jpg`（第一批，白底灰框，每方向 1 格）、`A.jpg`（骷髏系，無框，每隻 3 欄＝正面／側面／背面，走路、攻擊各 2 列＝2 格動畫）、
  `B.jpg`（哥布林等，有框，每隻一列：走路 5 格、攻擊 6 格…，只有正面）。**英文標題常和圖對不上**，照實際的圖配對；使用者說名稱對不上就改遊戲裡的名稱。
- 有模型的怪（74 種）：
  - S1：妖魔 orc、妖魔弓箭手 orcArcher、侏儒 dwarf（只有正面）、狼 wolf（Wild Dog，只有側面）、狼人 werewolf、萊肯 lycan、幼龍 drake、黑騎士 blackKnight、巨大蜘蛛 giantSpider。
  - A：骷髏 skeleton、骷髏弓箭手 skeletonArcher、**骷髏禁衛兵** skeletonAxe（原名骷髏斧手，改名）、食屍鬼 ghoul、**史巴托 spartoi（新增）**、巴風特 baphomet（用施法列的 3 方向）。
  - B：哥布林 goblin、**妖魔戰士 orcWarrior（新增）**、甘地妖魔 gandiOrc、**歐西斯妖魔 orcxOrc（新增）**、**邪惡蜥蜴** lizardman（原名蜥蜴人，改名）、**眼怪 beholder（新增）**、**浮空之眼** floatingEye（原名漂浮之眼，改名，畫面身高 26）、**卡司特 castor（新增）**。
  - C（第四張，2026-10-12，版本 `20261012d`，`tools/monsters/C.jpg`＋`specC.json`）：侏儒戰士 dwarfWarrior、森林熊 forestBear、樹精 treant、古老樹精 elderTreant（★）、殭屍 zombie、石頭高崙 stoneGolem、
    吸血蝙蝠 caveBat（size 26）、黑暗妖精斥候 darkElfScout（背面只有 1 格）、甦醒的地龍 wakingDrake（★，側面圖比正面大一倍，全部方向用正面）、巨大兵蟻 giantAnt（size 44；原圖走路格只有大張示意圖，走路也用攻擊列）、鬼魂 ghast。
    每隻 3 欄＝正面／側面／背面，走路 3 格、攻擊 3～4 格；裁切框由每格的連通塊自動量出，存在 `specC.json`（石頭高崙走路、吸血蝙蝠的格子手動改成固定網格）。
  - D（第五張，2026-10-12，版本 `20261012f`，`tools/monsters/D.jpg`＋`specD.json`＋`top.json`）：沉船海灣～泰坦墓穴 32 種一般怪＋巨大飛龍 wyvern、伊弗利特 ifrit（用金色鳳凰圖）。
    AI 圖品質不一：每列常混到別隻怪、下半部動畫格亂掉，**只用上半部**，`top.json` 是上半部每個連通塊的框（編號），`specD.json` 逐格挑真的是這隻的圖，每方向 1 格（走路、攻擊各挑不同姿勢）；
    標籤字壓到的格裁掉下緣，格線殘留的左右各內縮 3px。只有側面圖的（地獄犬、冰原狼、火蜥蜴）三方向都用側面；海賊火槍手、法師塔守衛只有 1 張。巨蟹 size 30、火蜥蜴 size 34。
  - E（第六張，2026-10-12，版本 `20261012g`，`tools/monsters/E.jpg`＋`specE.json`）：沉船海灣重畫版，海賊、海賊火槍手、巨蟹、溺死的水手改用這張（走路 2 格、攻擊 3 格，覆蓋 D 表的單張版），新增 ★海賊王・德雷克 pirateKing。
  - F（第七張，2026-10-12，版本 `20261012h`，`F.jpg`＋`specF.json`）：暮光法師塔重畫版，地獄犬、蛇女、墮落法師、法師塔守衛改用這張（走路 2 格、攻擊 3～4 格），新增 ★惡魔 demon。
    地獄犬攻擊前兩列畫成蛇女，改用攻擊第 3 列＋施法列；惡魔走路格是大張立繪，走路也用攻擊列。`spec2.py` 的 `NORM`：攻擊格畫得比走路小的怪（地獄犬、蛇女、墮落法師），`cut2.py` 把攻擊列放大到和走路列同高。
  - G（第八張，2026-10-12，版本 `20261012w`，`G.jpg`＋`specG.json`）：後期 5 張地圖重畫版（正面／側面／背面各 1 張，走路與攻擊同一張），覆蓋 D 表：
    沙漠金字塔（木乃伊、沙漠蠍、人面獅身、阿努比斯）、歐瑞雪原（冰原狼、雪怪、冰高崙、冰霜魔女）、火焰洞窟（火蜥蜴、火焰精靈、熔岩高崙、火焰騎士、伊弗利特）、
    遺忘之島（古代巨人、哈比、遺忘騎士、奇美拉）、巨人墓穴（巨大骷髏、墓穴守衛、死靈法師、骨龍 size 56）；新增 4 隻稀有首領（只有一張圖，三方向共用）：
    ★歐西里斯 osiris、★冰之巨人王 iceGiantKing、★遺忘之王 forgottenKing、★巨人王的亡魂 giantKingSpirit。巨大骷髏正面格裁掉標籤字（`['G',1638,90,1730,205]`）。
    `spec2.py` 的 `NOHOLE`：身上有大片白色的怪（雪怪、冰高崙、冰霜魔女、冰之巨人王、巨人王的亡魂、冰原狼），`cut2.py` 不去掉被圍住的白色區塊。原圖第 33 張（同系列較小的版本）沒有用。
  - H（2026-10-16，版本 `20261016m`，四大龍）：使用者每隻龍給一張完整動作表（正面／側面朝右／背面 × 走路 4 格、攻擊 2 列、受傷、施法；白底灰格線，2000×1116），
    原圖 `tools/monsters/H-龍id.jpg`。先做 **地龍・格爾莫斯 antharas**（使用者在兩版中選了格數完整、方向一致的那張）：走路 4／4／4、攻擊 8／6／8 格（兩列接起來），`size: 80`（比一般首領 62 大）。
    受傷、施法列目前遊戲沒用到。**這台電腦沒有 Python**，改用 `tools/monsters/cut-sheet.ps1`（PowerShell＋C#，與 `cut2.py` 同演算法：從格子邊緣洪水填滿白色、只留最大塊與 ≥15% 的塊、邊緣 1px 半透明、腳底貼齊），
    規格 `specH.json`：每隻 `src`、`scale`（輸出縮放，地龍 0.6）、`walk`／`attack` 各給 `y`（列範圍）與 `x`（正面／側面／背面各一串格線 x 座標，相鄰兩條＝一格；每格內縮 4px 避開格線），側面朝左加 `flipSide: true`。
    格線座標可用灰色線偵測（地龍那張：x 117/270/421/572/726、側面走路 727/881/1034/1187/1341、側面攻擊 727/932/1136/1341、背面 1343/1498/1650/1800/1953；y 走路 165～326、攻擊 329～481 與 483～634）。
    執行：`powershell -ExecutionPolicy Bypass -File tools\monsters\cut-sheet.ps1 [-Only 龍id]`，印出的 `MON_SPRITES` 一行照抄。圖上原有的淡灰影子保留（遊戲另外畫的小影子疊在下面）。輸出約 440KB（沒有做調色盤壓縮），已加進 `sw.js` 預先快取。
    **水龍・瑟拉恩 fafurion**（版本 `20261016r`）：`H-fafurion.jpg` 版面與地龍那張完全相同（格線座標一樣，只差側面右界 1342），走路 4／4／4、攻擊 8／6／8、`scale` 0.6、`size: 80`。
    使用者第一張水龍表（正面 4 格互相重疊、側面只有 1 格、背面畫成一半大）切不出來，請他照地龍那張的格式重新生成。
    `cut-sheet.ps1` 另外支援每個方向不同的列：`walk`／`attack` 可給 `yd: [[正面列…], [側面列…], [背面列…]]` 取代 `y`。
    **風龍・維斯塔爾 lindvior**（版本 `20261016s`）：`H-lindvior.jpg` 版面不同（格線 x：正面 84/248/406/562/716、側面 717/934/1147/1351 只有 3 格、背面 1352/1512/1668/1823/1978；y 走路 140～336、攻擊 339～492 與 494～643），
    正面攻擊區中間是一張大立繪（248～562 跨兩列），只用四角小格且左上格被立繪翅膀蓋到而略過 → 走路 4／3／4、攻擊 3／6／8，`scale` 0.6、`size: 80`。
    為此 `cut-sheet.ps1` 新增三個選項：`x` 裡寫 `-1` ＝跳過那一格（中間的大圖）；`skip: ["方向-列-欄"]` 略過指定格；`xb: [[[x0,x1]…] 或 null, …]` 某方向改用手動框（正面走路翅膀跨過格線，照格線切會切掉翅尖或混到隔壁格）；另有 `padX` 把格子左右放寬（目前沒用）。
    還沒有圖：火龍 valakas、永夜之塔 30 種、職業任務首領 24 隻（地圖上畫 emoji）。
- 新增怪物放在各地圖 `mons` 倒數第二個（`maps.js` 異界首領用最後一隻當底，不能動）：妖魔戰士 Lv12→低語墓窟、歐西斯妖魔 Lv19→腐朽礦坑・上層、卡司特 Lv22（魔法暗影箭）→沉眠龍窟、
  史巴托 Lv26（不死）→腐朽礦坑・深層、眼怪 Lv38（大型、魔法死亡凝視）→暮光法師塔；妖魔戰士、歐西斯妖魔、卡司特標 human。
- 切圖：`tools/monsters/spec2.py` 每隻怪 walk／attack × 正面／側面／背面，每格一串裁切框（照播放順序；沒寫的方向沿用正面；`FLIP`＝側面朝左要翻），
  `cut2.py`：從邊緣洪水填滿白色、被圍住的偏白小塊也去掉、只留主體（最大塊與 ≥ 15% 的塊）、背景旁 1px 半透明；輸出 `images/monsters/怪物id.png`
  （6 列＝走路 正／側／背、攻擊 正／側／背，每列 n 格，每格 cw×ch，腳底貼齊）與 meta。執行：`cd tools/monsters && python3 cut2.py [怪物id…]`（要先建 out/）。
- 遊戲：`ui-scene.js` 的 `MON_SPRITES`（照 meta 抄：cw、ch、body、n、size）＋`monSpriteImg(mid)`；地圖怪 `m.mid`＝怪物 id（綁定戰鬥時改成 `inst.id`）。
  身高一般 42px、大型 62px（`size` 可覆寫）；方向＝戰鬥中面向角色、遊走看移動方向（`m.face`），向左用側面鏡像；出手時 `m.atk = 380` ms 照進度播攻擊列；走動時循環走路列（每格 150ms），只有 1 格的怪改成上下輕晃。
  74 張圖共約 2.5MB（G 表輸出後用 PIL `quantize(256)` 轉調色盤 PNG，約小 80%），進野外時只載入該地圖的怪，也在 `sw.js` 預先快取。

### 18.4 變身動畫素材準備（2026-10-22，沿用 `20261022b`；`20261022c` 起由變形卷軸接入玩法，第 88 節）

- 使用者提供「巡守妖魔神射（藍變）」原創人物立繪，授權由助手製作動畫所需分鏡；不是直接使用先前有假透明／混方向的 JPG 分鏡。
- 內建 image_gen 產 4 動作初稿後，各針對步態、正面射箭方向、施法空手、受傷不拉弓重製；8 份 PNG 原稿、原參考立繪、完整 prompts.json／refinements.json 都保存在 `tools/sprite-src/morph/wolf-ranger-v1/`，不覆寫原圖。
- `prepare.py`（Pillow＋NumPy）以 alpha 連通區切出整個人物，保留光效、等比縮放、人工腳點對齊；同動作／方向固定縮放，不做交叉淡化、人工重複格數或產生肢體補間。原稿 v2 四張選用，v1 留存。
- 最終 `images/sprites/morph/wolf-ranger-v1/`：walk／attack 各 4×3＝12 格，cast／hit 各 2×3＝6 格，總共 36 張獨立 frames PNG、4 張動作圖集、contact.png、manifest.json、README.md；預覽用 WebP 另存。
- 每格 256×240 真透明 RGBA；列順序 down／right／up，left＝right 鏡像。charH 160、建議 drawH 48；時間依序 130／140／220／150ms。施法／受傷只有 2 格，是基礎動作，需更細緻時再增加中間姿勢。
- **腳底 anchor (128,200)**，下方 40px 留給向下箭光。未來變身 renderer 應畫在 `(腳底X−128k, 腳底Y−200k)`、k＝drawH／160；目前 renderer 用 cellH 當基準，不能未處理 anchor 就直接貼上職業資料，否則浮空。
- 本次僅製作素材與本對話互動試播；未改 `classes.js`、SW 清單、GAME_VERSION、變身能力、選單或存檔。互動預覽位於本對話 visualizations 的 `wolf-ranger-v2-motion.html`，不加入遊戲 script。

### 18.5 月光精靈巡林者（紅變）外觀素材（2026-10-22，初稿沿用 `20261022e`；f 接入，g 修正攻擊）

- 使用者提供立繪與 36 格 JPG，並選擇「先完成外觀素材與試播，等級及能力稍後決定」。不新增 MORPH_FORMS、不改變形卷軸、數值、存檔或 SW。
- `tools/sprite-src/morph/moon-ranger-v1/` 保留 reference.jpg、sheet-original.jpg；內建 image_gen 去掉白底與標題，保留銀髮／銀甲／紅綠魔法，透明原稿為 sheet-transparent.png，提示詞 prompts.json。prepare.py 依人物框分格、隔開鄰格、等比縮放與腳底對齊，原圖不覆寫。
- `images/sprites/morph/moon-ranger-v1/`：walk／attack 各 12 格，cast／hit 各 6 格，共 36 單格 PNG、4 動作 PNG 圖集、輕量 WebP、contact.png 總覽與 manifest.json。每格 320×240、charH160、drawH48、腳底 anchor [160,200]；列 down／right／up，左側鏡像。每格 130／140／220／150ms。
- 保留原圖姿勢，走路步幅變化小，部分攻擊／施法以特效變化為主；沒有新增插值動作。等級與能力在 manifest 留 null；未寫入遊戲資料。原版側面放箭上弓尖貼格邊，已用內建 image_gen 修補 2 格，原稿 bow-repair-generated.png／提示詞 bow-repair-prompt.json 留存，prepare.py 依 source 覆寫這兩個輸出格、維持共同腳點及身高。
- 本對話互動預覽 moon-ranger-motion.html 提供四向鏡像、四動作、播放／暫停／逐格；不加入遊戲 script，GAME_VERSION 不變。

- **20261022g 攻擊修正**：使用者回報沒有攻擊動作，原四格皆維持拉滿弓。內建 image_gen 補畫三向各 4 格「準備→拉弓→放箭→收弓」；attack-motion-v2-generated.png／transparent.png／prompts.json 及 prepare-attack-v2.py 保存來源。新版 attack-v2.png、attack-v2-frames/、attack-v2-manifest.json，保持 320×240、腳底 [160,200]、charH160、每格 140ms，舊圖／manifest 留存。MORPHS.moonRanger.attack 與 SW 預載改用新檔名，升版本避開快取。
- tools/test-moon-attack.js 隔離驗證四向命中／MISS→attack 560ms、受傷不打斷及變身到期回復職業模型；tools/moon-attack-preview.html 使用實際 sceneReadEvents／sceneDraw，放大兩倍方便檢視，不載雲端／存檔。數值、變身選單、存檔 schema 與原動作觸發邏輯不變。本對話 moon-ranger-motion.html 更新新攻擊；update-motion-previews.py 更新內嵌 WebP。

### 18.6 冥火骷髏神射（紫變）外觀素材（2026-10-22，與 `20261022g` 同次整理）

- 使用者提供 3.jpg 立繪及 3-1.jpg JPG 分鏡；沿用先製作外觀／試播的決定。原圖 33 人物＋3 獨立箭矢，不能將箭矢當人物播放。內建 image_gen 去除棋盤底，另補正／右／背三格蓄力施法，共 36 人物格。
- 原圖／透明原稿／補畫／完整 prompts.json／prepare.py 保存在 tools/sprite-src/morph/hellfire-archer-v1/；輸出 images/sprites/morph/hellfire-archer-v1/，4 動作圖集／WebP、36 單格、3 projectile PNG、contact.png、逐格來源 manifest.json。walk／attack 每向4格，cast／hit 每向2格，時間130／140／220／150ms。
- 格子 **320×280**、腳底 **[160,240]**、charH160、drawH48；列 down／right／up，左鏡像。多留上方火焰空間，不能套紅變 240 高格子的參數。原圖射箭仍以持弓與光效變化為主，未假稱補齊新的射箭肢體動作。
- 本對話 hellfire-archer-motion.html 提供四向／四動作與播放／逐格。manifest 的 level／effects 留 null；當時未接入；**20261022j 已接入**（`MORPHS.hellfireArcher`，第 88 節）。

- **20261022k 攻擊修正**：使用者回報03仍沒有攻擊動作，原圖大多只維持瞄準。內建image_gen重畫三向各4格低持弓／拉弓／放箭／收弓；原稿 attack-motion-v2-generated.png、初稿及完整 attack-motion-v2-prompts.json 留存。prepare-attack-v2.py共用sky-valkyrie-v1/prepare.py的透明分格／註冊函式，輸出attack-v2.png、attack-v2-frames/、attack-v2-manifest.json，保留舊attack.png。MORPHS.hellfireArcher.attack及SW改用新檔名；320×280／腳底[160,240]／charH160／4×140ms不變，不調整數值／觸發邏輯或schema。
- tools/test-hellfire-attack.js隔離驗證m03四方向命中／MISS、受傷不打斷、到期恢復職業圖、圖集尺寸與離線清單。tools/hellfire-attack-preview.html用實際sceneReadEvents／sceneDraw，不讀寫真實存檔或雲端；本對話hellfire-archer-motion.html同步新攻擊。

### 18.7 蒼穹女武神・艾爾（神話）動畫樣本（2026-10-22，與`20261022k`同次）

- 使用者提供4.jpg立繪，要求由助手製作並看流暢度／質感。先做外觀及試播；維持金白戰甲、金色神弓、四片光羽、懸浮輪廓。內建image_gen新增三向移動8／射箭8／施法4／受傷4，共72格，左側鏡像；移動羽翼升降，射箭含抬弓、拉弦、釋放與收勢，採實際分鏡而非複製格或淡化補間。
- tools/sprite-src/morph/sky-valkyrie-v1/保存reference.jpg、六份最終／一份移動初稿PNG、完整prompts.json及walk-prompts.json、prepare.py／audit.json、preview.py。移動初稿方向格數與間距不齊，已另畫正／右／背三份8格；初稿保留而不接用。
- images/sprites/morph/sky-valkyrie-v1/有72單格PNG、walk／attack／cast／hit四圖集、WebP備用縮圖／原尺寸透明AVIF試播、各動作總覽及逐格來源manifest。正式格子384×320、腳底[192,270]、charH160、drawH48；列down／right／up。時間80／70／110／80ms（每向8／8／4／4格），射箭共560ms。
- 本對話sky-valkyrie-motion.html內嵌AVIF保持清晰度，雙欄四方向，四動作／播放／暫停／逐格，檔案小於1MB。不加入遊戲script；當時未接m04；**20261022l 已接入**（`MORPHS.skyValkyrie`，第 88 節）。翼尖／衣甲仍可能有逐格繪製差異，待使用者看實際循環驗收。

### 18.8 矮人蒸氣火銃兵（05藍變）專屬外觀（2026-10-22，版本`20261022m`）

- 使用者提供5.jpg立繪與5-1.jpg分鏡要求新增變身。既有m05已列藍變槍手，本次加MORPHS.dwarfGunner及m05.sprite，沿用既有等級／能力／卷軸消耗，MORPH_LV_FREE測試設定不變，不改schema。專屬圖現為m01～m05，其餘25種仍用統一外觀。
- 原分鏡背面攻擊有兩格正面、側面施法少一格；初次去背後又發現白蒸氣跨格，直接切會變平切白煙。因此內建image_gen依原角色完整補畫：walk／attack每向4格、cast／hit每向2格，共36格，左向鏡像。開火有低持槍→舉槍瞄準→火光／後座→收槍，背面維持鍋爐背影；白蒸氣留全。
- tools/sprite-src/morph/dwarf-gunner-v1/保存原始reference.jpg／sheet-original.jpg、初次sheet-transparent.png、最終walk／attack／cast-front-back／side-cast／hit五份生成PNG、完整prompts.json／clean-action-prompts.json及prepare.py／audit.json／preview.py。prepare.py共用sky-valkyrie-v1的透明分格與腳底註冊函式，原圖不覆寫。
- images/sprites/morph/dwarf-gunner-v1/：36單格RGBA PNG、4動作PNG圖集／AVIF／WebP、動作與完整總覽、逐格來源manifest。正式格384×320、腳底[192,270]、charH160、drawH48；列down／right／up。時間130／140／220／150ms（4／4／2／2格），開火560ms；四張PNG加入SW預快取。
- 本對話dwarf-gunner-motion.html為四向四動作試播，內嵌原尺寸透明AVIF、可播放／暫停／逐格，小於1MB。tools/dwarf-morph-preview.html使用真實usePotion／sceneReadEvents／sceneDraw、不讀寫真實存檔或雲端；test-dwarf-morph.js檢查卷軸扣量、上次選擇、四向命中／MISS、施法與受傷、到期及其他變身回歸。
- 驗證：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022m），上述Node測試、36格非重複RGBA／透明留邊與圖集逐格比對通過。瀏覽器四動作及逐格／播放正常，真實renderer四向開火560ms、0～3格均有畫出；兩頁Console無error／warn。待使用者實際角色驗收，未commit／Push。

### 18.9 布魯迪卡之影（10紫變）專屬外觀（2026-10-22，版本`20261022n`）

- 使用者提供10.jpg立繪與10-1／10-2／10-3.jfif要求新增變身；原後兩張只有走路為背面，攻擊／施法／受傷仍是正面，也缺右側動作。內建image_gen依銀髮／紫黑甲／雙刀／紫色蝠翼補畫三向36格，背向全程維持背影；左向鏡像。雙刀包含蓄勢→第一刀揮斬→交叉追斬→收勢。
- tools/sprite-src/morph/brudika-shadow-v1/保留四份原圖、三向生成PNG及兩份初稿、完整prompts.json／extraction-prompt.json、registration.json腳點資料與prepare.py／audit.json／preview.py。整理腳本共用sky-valkyrie-v1的透明分格與註冊函式，保留alpha、對齊腳點，不覆寫原始素材。
- images/sprites/morph/brudika-shadow-v1/有36獨立RGBA格、4張正式PNG圖集、透明AVIF試播、總覽與manifest。每格384×320、腳底[192,270]、charH160、drawH48；walk／attack每向4格、cast／hit各2格，時間130／140／220／150ms；攻擊560ms。
- m10.sprite接MORPHS.brudikaShadow，SW預載四圖集；沿用既有紫變雙刀等級／能力／卷軸消耗，MORPH_LV_FREE測試設定及schema不變。專屬外觀現為m01～m05及m10六種，其餘24種統一。
- 本對話brudika-shadow-motion.html提供四向／四動作、播放／暫停／逐格，小於1MB。tools/brudika-morph-preview.html用真實usePotion／sceneReadEvents／sceneDraw，不載存檔或雲端；test-brudika-morph.js檢查卷軸扣量、上次選擇、四向命中／MISS、受傷不打斷攻擊、施法／受傷、到期／其他變身回歸與圖集／SW。
- 驗證：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022n）、上述Node測試及36格獨立RGBA／透明留邊／圖集逐格比對通過；瀏覽器四動作、播放／逐格及左右鏡像正常，真實renderer四向攻擊560ms、第0～3格均畫出，Console無error／warn。待使用者實際角色驗收，未commit／Push。

### 18.10 裂空魔龍爪皇（27紫變）專屬外觀（2026-10-22，版本`20261022o`）

- 使用者給27.jpg立繪與27-1／27-2／27-3.jfif要求新增變身。三張分鏡實際在桌面「變身人物」內，原訊息路徑省略該資料夾；內部混入銀髮人形、持刀姿勢與龍頭，不直接裁用。以本次27.jpg龍頭巨爪形象優先，內建image_gen補畫正／右／背三向36格，左向鏡像。
- 保留紫黑龍鱗甲、胸口紅晶、龍頭雙角、腕鏈巨爪與紫焰龍翼；攻擊蓄勢→前爪揮擊→交叉重爪→收勢，施法聚能／展爪釋放，受傷後仰／復位。四原始檔、三向生成PNG、完整prompts.json／registration.json／prepare.py／audit.json／preview.py保存在tools/sprite-src/morph/rift-dragon-v1/；原圖不覆寫。
- images/sprites/morph/rift-dragon-v1/有36獨立RGBA格、walk／attack／cast／hit PNG圖集、AVIF試播、動作總覽與manifest。格子384×320、腳底[192,270]、charH160、drawH48，4／4／2／2格；130／140／220／150ms，攻擊560ms。prepare.py共用sky-valkyrie-v1的透明分格／腳點註冊函式，保持尺寸與基準一致。
- m27.sprite接MORPHS.riftDragon，SW預快取四PNG；沿用既有紫變鋼爪能力／等級設定、卷軸消耗及schema，MORPH_LV_FREE不變。專屬外觀7種（m01～m05、m10、m27），其餘23種統一。
- 本對話rift-dragon-motion.html四向四動作試播，播放／暫停／逐格；tools/rift-dragon-morph-preview.html用真實usePotion／sceneReadEvents／sceneDraw，不讀寫真實存檔或雲端。test-rift-dragon-morph.js驗證卷軸扣量／上次選擇、四向命中／MISS、受傷不打斷攻擊、施法／受傷／到期、其他變身及圖集／SW。
- 驗證：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022o）、上述Node測試及36格獨立RGBA／透明留邊／圖集逐格比對通過。瀏覽器四動作、播放／逐格／鏡像正常；真實renderer四向攻擊560ms、第0～3格均畫出，兩頁Console無error／warn。待使用者實際角色驗收，未commit／Push。

### 18.11 蒼穹女武神・艾爾新版分鏡替換（2026-10-22，版本`20261022p`）

- 使用者提供4.jpg與4-1／4-2／4-3.jfif，要求替換4號變身。新圖採金甲、白布、金髮羽冠及多片金色羽翼；三張分鏡每向走4／射箭4／施法2／受傷2，共36格。原背面射箭後兩格轉正面、射箭手臂缺少收勢，內建image_gen去棋盤／格線並修正背向及放箭／收弓；左向鏡像。
- 新檔images/sprites/morph/sky-valkyrie-v2/：36獨立RGBA、4動作PNG圖集、AVIF試播、總覽與manifest。tools/sprite-src/morph/sky-valkyrie-v2/保留四原圖、三向透明修補原稿、完整prompts.json、registration.json及prepare.py／audit.json／preview.py。舊v1素材／來源全部保留。
- 格384×320、腳底[192,270]、charH160、drawH48不變；每格160／140／220／160ms，總長640／560／440／320ms與舊版相同，未複製格或插值湊回72格。MORPHS.skyValkyrie四src與SW預快取改讀v2，m04.sprite key不變；能力、等級、卷軸、移動速度／攻速數值及schema不變。
- 本對話valkyrie-v2-motion.html為四方向四動作試播。tools/valkyrie-v2-morph-preview.html用真實卷軸／renderer，不讀寫存檔或雲端；test-valkyrie-v2-morph.js驗證扣量／上次選擇、四向命中／MISS、受傷不打斷攻擊、施法／受傷／到期、其他變身、圖集／SW及v1仍在。
- 驗證：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022p）、上述Node測試及36格獨立RGBA／透明留邊／圖集逐格比對通過。瀏覽器四動作、播放／逐格／鏡像正常；真實renderer四向射箭560ms、第0～3格均畫出、背向放箭保持背影；兩頁Console無error／warn。待使用者實際角色驗收，未commit／Push。

### 18.12 烈焰死亡騎士（16紅變）專屬外觀（2026-10-22，版本`20261022r`）

- 使用者提供16.jpg及16-1／16-2／16-3.jfif，要求16加入卷軸。三張jfif實際都在桌面「變身人物」內；m16原已存在單手劍紅變組，本次接上專屬外觀，沒有重複增加選項。
- 原分鏡後兩張主要都是背面，缺右側面，部分走路漏武器、背向受傷混正面。依本次立繪以內建image_gen重製三向36格：火焰骷髏、黑色尖刺板甲、破披風、橙紅符文劍。走4／揮劍4／施法2／受傷2，左向鏡像；攻擊蓄勢→斬下→火焰斬擊→收劍，背向各動作保持背影。
- tools/sprite-src/morph/flame-death-knight-v1/保留四原圖、三向初稿／修稿、右向走路及收劍單格／背向三格修補、完整prompts.json與各修補prompt、register.py／registration.json／prepare.py／audit.json／preview.py。補齊邊緣劍尖、避免混到相鄰斬擊殘片；以頭骨至腳底解剖高度註冊，火焰／披風不拿來當身高。
- 正式images/sprites/morph/flame-death-knight-v1/：36獨立RGBA格、walk／attack／cast／hit四PNG圖集、AVIF試播、動作總覽與manifest。384×320、腳底[192,270]、charH160、drawH48，130／140／220／150ms；攻擊560ms。MORPHS.flameDeathKnight、m16.sprite、SW四圖集接入；現8種專屬外觀、22種統一。原紅變單手劍等級／加成、卷軸消耗及SAVE_SCHEMA不變，MORPH_LV_FREE測試開關不變。
- 卷軸選單舊說明「外觀目前統一」改「部分變身已有專屬外觀」。tools/flame-death-knight-morph-preview.html用真實openMorphPicker／morphPick／usePotion與sceneReadEvents／sceneDraw，可四方向攻擊與逐格；隔離真實存檔及雲端。test-flame-death-knight-morph.js驗證扣量／上次選擇、四向命中／MISS、受傷不打斷攻擊、施法／受傷／到期、其他七種外觀與SW圖集。flame-death-knight-motion.html為本對話四動作試播。
- 驗證：check.ps1 ALL CHECKS PASSED（46檔／45script／20261022r）、上述測試及狀態三區回歸通過，36格獨立RGBA／透明留邊／逐格與圖集一致。瀏覽器真實卷軸選取16與扣量、四向攻擊560ms及0～3格均畫出；四動作切換、播放／逐格與左右鏡像正常；兩頁Console無error／warn。待使用者實玩驗收才提交，未寫真實存檔或雲端。

### 18.13 16號步態與單手斬修正（2026-10-22，版本`20261022s`）

- 使用者回報「腳步不連續、像滑行」：舊四格缺完整交替、側面獨立補格接回首格突變。內建image_gen重畫三向各八格，以固定骨盆與同列地面註冊，落地／承重／過身／擺腿交換雙腳；walk-v2.png為3072×960，8×65ms＝520ms，循環總長與實際移動速度不變。
- 使用者指定天堂1／經典版死亡騎士為動作參考：保持原創火焰骷髏黑甲造型，重畫短促單手抬劍／下斬／接觸／收劍，縮小巨大刀光。attack-v2.png為2304×960，6×80ms＝480ms，為本專案設定的動畫秒數，非官方測量值。右向兩格另補畫以排除跨格斷劍／鄰格殘影。
- MORPHS.flameDeathKnight僅walk／attack改新版src、frames與ms，SW新增兩圖預載；舊圖／原稿不動。cell384×320、foot[192,270]、charH160／drawH48及cast2×220／hit2×150不變，左鏡像右。不改戰鬥攻擊間隔、傷害、技能、等級／能力、消耗或SAVE_SCHEMA。
- 新增來源資料夾flame-death-knight-walk-v2與flame-death-knight-attack-v2，含內建image_gen原稿／完整提示詞／prepare.py／registration.json／README；新版單格、AVIF、contact、各自manifest與舊圖並存於flame-death-knight-v1。attack-v2/preview.py產生本對話flame-death-knight-v2-motion.html，四動作與四方向試播。
- tools/flame-death-knight-walk-preview.html實際sceneUpdate／sceneDraw地面移動、新舊步態／停止／逐格；test-flame-death-knight-walk.js檢查四向八格、實際位移與新舊速度一致。既有morph-preview／test-flame-death-knight-morph.js更新六格480ms，檢查卷軸扣量、四向renderer／命中／MISS、受傷不打斷、施法／受傷／到期及其他變身。所有測試隔離真實存檔／雲端。
- 驗證：上述兩測試與test-buff-groups通過，check.ps1 ALL CHECKS PASSED（46檔／45script／20261022s）、git diff --check通過；42格非重複RGBA／透明留邊／圖集逐格對應通過。瀏覽器八格實際地面行走、停止及四向六格480ms攻擊、四動作試播／逐格／鏡像完成，Console無error／warn。待使用者實玩確認才提交。

### 18.14 沉默洞穴刺客（08藍變）專屬動畫（2026-10-24，版本`20261024ad`）

- 使用者提供08.jpg及8-1／8-2／8-3.jfif，原始檔保留在`tools/sprite-src/morph/silent-cave-assassin-v1/`；內建image_gen補繪紫黑兜帽、雙彎刃、藍焰與綠色刀光三向動作。完整提示詞、生成原稿、腳點registration.json、prepare.py及audit.json一起保留。
- 正式`images/sprites/morph/silent-cave-assassin-v1/`含36獨立RGBA格、walk／attack／cast／hit四張PNG、AVIF試播、contact及manifest。格子384×320、腳點[192,270]、charH160、drawH48；三向每向4／4／2／2格，130／140／220／150ms；左向鏡像右向。
- `MORPHS.silentCaveAssassin`由m08.sprite使用；SW預載四圖集。沿用既有藍變雙刀Lv.15、命中+2、傷害+2、攻速+6%、閃避+2%，GM及武器判斷不動，SAVE_SCHEMA仍7。
- `tools/cave-assassin-morph-preview.html`使用真實卷軸、sceneReadEvents及sceneDraw，提供四方向／四動作、播放／暫停／逐格、48px實際大小與放大；只用記憶體存檔且拒絕連外。`tools/test-cave-assassin-morph.js`驗證Lv.14不扣卷、Lv.15可用、加成不變、四向命中／MISS、受傷不打斷攻擊、施法／受傷／到期及RGBA圖集與SW。

### 18.15 暗影海盜雙槍客（06紅變）專屬動畫（2026-10-24，版本`20261024an`）

- 使用者提供6.jpg、6-1／6-2／6-3.jfif，三張動作圖實際位於桌面變身人物資料夾，已完整保留於tools/sprite-src/morph/shadow-pirate-gunner-v1。內建image_gen製作黑紅海盜外套、三角帽、骷髏面巾、雙燧發槍與紅焰三向12格；背向攻擊修成背影，左鏡像右。
- 正式images/sprites/morph/shadow-pirate-gunner-v1含36獨立RGBA、walk／attack／cast／hit四圖集、AVIF、contact、manifest與motion-preview.gif。384×320／腳點[192,270]／charH160／drawH48，4／4／2／2格及130／140／220／150ms，攻擊560ms。完整prompts.json、來源原稿、registration.json、prepare.py／audit.json／preview.py保留；依實際行距及較寬的側向施法格校正來源範圍，沿用isolate排除鄰格碎片。
- MORPHS.shadowPirateGunner接既有m06.sprite，SW預載四圖集；不增加第33種，保留Lv.35、槍手系必須裝槍、命中+5／傷害+4／攻速+8%、GM等級豁免、卷軸消耗與schema7。其他外觀不改；原本用m06測共用備援的測試改用仍共用外觀的m07。
- tools/pirate-morph-preview.html使用實際卷軸／sceneReadEvents／sceneDraw，四向四動作／播放／暫停／逐格與48／96px檢查，記憶體存檔並拒絕連外。test-pirate-morph檢查Lv.34與未裝槍都不扣卷、Lv.35扣一張、原加成／四向命中MISS／受傷不打斷／施法受傷／到期與四圖集預載；舊變身回歸保留。

## 19. PC 橫式外框（畫面尺寸「PC 16:9」）

- 素材：使用者提供的橫式惡魔拱門框（2000×1116 JPG，中間灰格紋是畫進去的）。用 C#（System.Drawing）以視窗形狀遮罩＋顏色擴散挖空，
  欄杆尖刺那一帶只挖暗背景，帶紅色調的格紋也一併挖掉；輸出兩個檔：
  - `images/frame-pc.jpg`（約 270KB）：外框圖，窗口填暗色。
  - `images/frame-pc-mask.png`（約 31KB）：只有 alpha（外框 255、窗口 0，邊緣半透明）。
- **瘦身版外框**（2026-10-09 使用者要求「邊框縮小」）：實際使用 `images/frame-pc-slim.jpg`／`frame-pc-slim-mask.png`，由原圖用 PIL 產生：
  上方拱門（y 0～475，含惡魔頭、翅膀、符文拱）等比縮成 74% 高（0～350），下面接兩段柱子雕花（原 y 475～600 重複一次），y 600 以下不變。
  地圖窗口上緣從 y≈140 提到 ≈108（`#panel` top 108），翅膀伸進地圖的長度也縮短約 1/4；地點、增益字也跟著上移。原圖 `frame-pc.jpg`／`frame-pc-mask.png` 保留備用。
- **拿掉上排框架**（2026-10-11 使用者要求，版本 `20261011d`）：實際使用 `images/frame-pc-notop.jpg`／`frame-pc-notop-mask.png`，由瘦身版用 PIL 產生：
  y < 360 的拱門（惡魔頭、翅膀、符文拱、上方骷髏角）整段透明，左右柱子（x 0～110、1890～2000）把 y 360～600 那段往上重複貼到頂。
  地圖 `#panel` 改成 `top: 0`；地點 `.scene-top` 上移到 y 40、增益 y 75、`.hunt-ctrl` y 170；左側 5 顆圓鈕（`PC_SLOTS` side）上移到 y 38／104／170／236／302。
  瘦身版與原圖檔案保留備用（換回去：`index.html` 的 `#frame-art` 背景／遮罩與 `#panel` top）。
- 疊法：`#frame.pc` 不用九宮格；地圖（`#panel` z1）在下，`#frame-art`（z2，`pointer-events:none`）用 CSS `mask` 把外框圖蓋在地圖上
  → 惡魔頭、翅膀、骷髏會壓在地圖邊緣上，有立體感。HUD、法球、格子、視窗在 z3 以上。
- 版面：遊戲區比例固定 2000:1116，`--s` = 寬 ÷ 2000，所有位置都是原圖座標 × `--s`（CSS 在 `index.html` 的 `#frame.pc` 規則）：

| 元素 | 原圖位置 | 內容 |
|---|---|---|
| 地圖 `#panel` | x 92～1908，y 108～838（整個窗口） | 即時地圖（`ui-scene.js` 依寬度放大格子，`clamp(W/(32×28), 1, 1.3)`，約顯示 28 格寬；角色畫在偏下方） |
| 地點、增益 | 窗口左上 | 地點名稱、增益剩餘時間 |
| 掛機面板 `.hunt-ctrl` | 窗口左上（地點名稱下方） | **PC 不畫操作框**（2026-10-09 使用者要求；地圖、村莊、回家卷軸、步行回村都在底部格子，效率／補給也不顯示），只在永夜之塔顯示「⬇ 下樓／⬆ 上樓」、步行中顯示「取消步行」，沒按鈕時整塊隱藏（`.hunt-ctrl.empty`） |
| 骷髏頭 `#skull-hunt` | x 950～1050、y 1010～1110（底部正中間） | 開始／停止掛機（第 15 節） |
| 骷髏頭 `#skull-log` | x 5～100、y 1010～1110（左下、紅球下方） | 戰鬥訊息抽屜開關；抽屜 `#log-pop` 在窗口左下（第 17 節） |
| `#hud-stats` | x 320～1680、y 870～904（經驗條正上方，等級兩側） | 💰金幣、防禦、MR、負重百分比（20261024k；取代原本惡魔下巴下方的 `#hud-top`） |
| `#hud-bottom` | 窗口下方中間（靠上對齊，避開地圖的「停止掛機中」） | 地點／掛機狀態 |
| 經驗條 `#exp-strip` | x 300～1700、y 907～925（欄杆與底部按鈕之間） | EXP 百分比 |
| 等級 `#lv-badge` | x 940～1060、y 848～894（欄杆正中間裝飾） | 目前等級「Lv.N」 |
| 紅球／藍球 | 中心 (180, 920)／(1820, 920)，直徑 240 | HP／MP（點擊喝水） |
| 分頁視窗 `#overlay` | 1 個：x 1120～1880；2 個：x 440 起；3 個：x 120 起；皆為 y 40～816（20261021e 加高） | 透明容器，每個開著的分頁一個 `.pane` 左右並排（多視窗，第 43 節），各自右上「✖ 關閉」。只開人物狀態時加 `.wide` 放大成 x 260～1740、y 40～826 的大視窗（第 42 節） |

- 底部 16 格（`PC_SLOTS`，`ui-frame.js`）：

| 位置 | 內容 |
|---|---|
| 左 2 圓鈕（中心 x 380、480） | 🧝 人物狀態、✨ 技能 |
| 12 方格（x 590 起每 70，寬 62） | **第 1～2 格＝快捷欄第 23～24 格**（2026-10-24，第 129 節；原本 📜 任務、🎒 背包）、**第 3～8 格＝快捷欄第 17～22 格**（2026-10-15，原本固定的治癒／綠水／勇水類／藍水／回家／瞬移，改成可自由擺放，見第 40 節）、空格（2026-10-20 移除步行回村按鈕）、💾 手動存檔、📖 裝備圖鑑（2026-10-11 拿掉 🏘️ 村莊，最後一格空著；開始／停止掛機改用底部骷髏頭） |
| 底部石條（y 1036～1098，寬 62、間隔 72） | **快捷欄**（2026-10-15）：骷髏頭左邊 x 318 起 8 格（第 1～8 格，鍵盤 1～8）、右邊 x 1114 起 8 格（第 9～16 格，鍵盤 Q E R F Z X C V）；`#hotbar`（z3）由 hotbar.js 畫，PC 不再顯示地圖上的技能欄 |
| 排程圓鈕（x1415、y933、58×66） | 📋 地圖排程（20261024t，第126節；位於圖鑑右側、地圖圓鈕左側原空位） |
| 右 2 圓鈕（中心 x 1520、1616） | 🗺️ 地圖、⚙️ 設定 |

- 分頁格子再按一次＝關閉視窗。PC 外框沒有柱子抽屜（功能都在底部按鈕）。切回其他畫面尺寸時自動回到直式外框與 6 格。

## 20. 裝備圖鑑（`codex.js`；2026-10-09，版本 `20261009f`）

- 入口：手機左柱抽屜「📖 裝備圖鑑」；PC 底部 12 方格的最後一格 📖。分頁 id `codex`（`codex.js` 載入時寫進 `TABS`、`PANEL_FNS`，所以必須在 ui-panels 之後載入）。
- 內容：`ITEMS` 裡除了任務收集品（`cat: 'quest'`）以外的全部道具（含職業任務獎勵裝備），目前 156 件。
  - 分類 `CODEX_CATS`：全部／武器／防具（頭盔、盔甲、盾、內衣、斗篷、手套、長靴）／飾品（項鍊、戒指、腰帶）／消耗品（藥水、卷軸、彈藥、萬能藥）／材料。
  - 品質 `codexGradeOf`：商店有賣（有 `price`）＝**一般**（白）；其他依回收價 `sell`：< 1 萬 **高級**（綠）、< 3 萬 **稀有**（藍）、< 8 萬 **英雄**（紫）、其餘 **傳說**（橘）。顏色 class `g-normal／g-high／g-rare／g-hero／g-legend`。
  - 排序：分類 → 品質 → 價值。搜尋比對名稱或種類，可再篩品質。
- 版面：上方分類籤＋搜尋＋品質下拉；中間詳細框（`position: sticky`，捲清單時固定在上方；**點清單 `selectCodex` 彈出介紹頁（`openDialog`，內容在對話框裡可上下捲動），右上 ✕ `closeCodexDetail` 或「關閉」收起**；2026-10-09 使用者要求，原本嵌在清單上方會被切掉一半）：圖示、名稱、品質、種類、已擁有數量、限定職業、
  基礎屬性（兩欄）、說明、**取得方式**；下方清單（圖示、名稱、品質、種類；未擁有的圖示變灰）；底部「共 N 件（全部、已擁有）」。
- 取得方式 `codexSources`（第一次查詢時建表）：商店（依 `tier` 對到村莊）、`MONSTERS[*].drops`、`TOWER_BOSS_DROPS`（永夜之塔每 10 層首領）、
  `COMMON_DROPS`（一般怪物）、`RECIPES`（鍛造材料＋手續費）、`CLASS_QUESTS[*].reward.item`（職業任務）。都沒有就顯示「尚無取得管道」
  （加入暗黑式隨機裝備掉落後，非職業限定、且需要的怪物等級不超過遊戲最高等怪的武器／防具會多一行「掉落：隨機裝備」）。
- 「已擁有」即時計算背包＋倉庫＋裝備中，**不另存收集進度、不改存檔結構**。
- 之後可做：製作清單（鍛造配方一覽、材料是否足夠）、收集進度與獎勵（需要存檔欄位）。

## 21. 暗黑式刷寶：品質與隨機詞綴（`affix.js`；2026-10-09，版本 `20261009m`，存檔 schema 2）

- 道具實體新增欄位（只有怪物掉落的武器／防具會有；商店、鍛造、任務獎勵都是普通）：
  `q` 品質（`magic` 魔法藍／`rare` 稀有黃／`legend` 傳說橘）、`af` 詞綴 `[{k, v, lg?}]`、`il` 物品等級（掉落怪物等級）、`nm` 名稱前綴。
  `SAVE_SCHEMA` 2；`migrateSave` 把不認得的品質／詞綴清掉（舊存檔沒有這些欄位，直接當普通裝備）。
- 品質機率 `rollQuality`：一般怪指定掉落 普通 60%／魔法 28%／稀有 10%／傳說 2%；首領 魔法 55%／稀有 35%／傳說 10%；
  隨機裝備（至少魔法）魔法 75%／稀有 21%／傳說 4%。詞綴條數：魔法 1～2、稀有 3～4、傳說 4＋1 條傳說詞綴（數值 ×2～2.5，名稱「傳說・死神 長劍」）。
- 詞綴 `AFFIXES`（19 種，數值上限隨物品等級成長）：五維、命中、傷害、爆擊%、攻速%、吸血%、HP、MP、AC、MR、回血、回魔、SP、減傷、閃避%；
  `slots` 限制可出現的部位（例如攻速只在武器／手套、AC 只在防具）。`calcStats` 把已裝備道具的 `affixFx` 加進 fx。
- 名稱 `qualityName`：魔法＝第一條詞綴的前綴（「銳利的長劍」）、稀有＝「「血月」長劍」、傳說＝「傳說・稱號 名稱」；`itemClass` 顯示品質顏色。
- **隨機裝備掉落**：每隻一般怪 1.5%（`RANDOM_EQUIP_P`）、首領 50% 掉一件 `randomEquipFor(怪物等級)`（回收價 ≤ 等級 × 600、非職業限定的武器／防具），至少魔法品質。
- 售價 `instSellPrice`：基本回收價（至少 50）× 品質倍率（魔法 1.5、稀有 3、傳說 8）＋ 詞綴數 × 物品等級 × 10。有品質的道具賣出前會確認。
- **戰利品過濾**（2026-10-09）：設定 `lootFilter`（預設 1）：0 全部撿起、1 普通裝備自動賣出、2 魔法以下自動賣出、3 只撿傳說。
  `rollDrops` 的 `give` 先擲品質（`applyAffixes` 在暫存物件上），`lootFiltered` 判定要擋就直接 `instSellPrice` 換金幣（記入本次掛機金幣、訊息 🪙），不進背包、不佔負重。
  2026-10-24（`20261024j`，使用者要求）起撿到時稀有基底（沒有 `price`，武士刀、精靈之弓、能力戒指等）也照品質自動賣出，不再保留；
  回收頁一鍵賣出（`bulkSellList` 傳 `keepRareBase`）仍保留稀有基底。勾選的保留詞綴（`lootKeepAf`）兩邊都照樣保留。
  村莊「回收」頁有「賣出普通裝備」「賣出魔法以下」一鍵賣出（`bulkSellBtn`，同樣規則，已強化的不賣，會先確認總價）。
  **保留特殊詞綴**（2026-10-17，版本 `20261017f`，使用者要求「戰利品過濾新增保留特殊詞綴裝備選項」）：設定 `lootKeepAf`（詞綴代號清單，預設空；舊存檔由 `migrateSave` 的 `DEFAULT_SETTINGS` 合併補上），
  設定頁「戰利品過濾」下方 19 個詞綴按鈕（`lootKeepHtml`／`toggleLootKeep`，勾選＝金色＋✔）。`lootFiltered` 先看 `lootKeepHit(inst)`：裝備有任何一條勾選的詞綴就不過濾——
  撿到時不自動賣、回收頁一鍵賣出也跳過；普通品質沒有詞綴，不受影響。
  **保留共鳴裝備**（2026-10-25，版本 `20261025k`，使用者要求）：設定 `lootKeepRes`（預設開；舊存檔由 `DEFAULT_SETTINGS` 合併補上），設定頁「🌟 保留共鳴裝備（不論品質）」勾選框。
  `lootFiltered` 在保留詞綴之後檢查：裝備有 `res`（第 27、28 節）就不過濾，撿到時（本機 `rollDrops`、後端 `loot.js`）與回收頁一鍵賣出都保留。
- 衝裝、倉庫、丟棄都保留整個實體，詞綴不會消失。離線收益不給掉落（快轉模擬結束會還原角色），所以不影響。

## 22. 地名改為暗黑風格、亞丁大陸改名黑暗大陸（2026-10-09，版本 `20261009o`）

- 使用者要求地圖名稱參考《魔界》、暗黑破壞神、POE 的風格（自創名稱，不照搬原作專有名詞）；**地圖／村莊 id 不變**，存檔不受影響。
  任務劇情、怪物名、遊戲訊息、本文件裡的舊名一併替換（雙引號內的歷史紀錄也已換成新名）。

| id | 舊名（天堂） | 新名 |
|---|---|---|
| 村莊 talking／gludio／giran／aden | 說話之島村莊／古魯丁村／奇岩城／亞丁城 | 低語港／灰燼村／暗金城／永夜王都 |
| island／islandDungeon | 說話之島／說話之島地監 | 低語海岸／低語墓窟 |
| elvenForest | 妖精森林 | 迷霧古林 |
| gludio1／gludio2 | 古魯丁地監 1～3 樓／4～7 樓 | 腐朽礦坑・上層／深層 |
| sleepingCave／pirateIsle | 眠龍洞穴／海賊島 | 沉眠龍窟／沉船海灣 |
| ivory | 象牙塔（怪物：象牙塔魔法師／守衛） | 暮光法師塔（怪物：墮落法師／法師塔守衛） |
| dragonValley／pyramid | 龍之谷／金字塔 | 焦骨峽谷／黃沙王陵 |
| orenSnow／fireCave | 歐瑞雪原／火龍窟 | 永凍荒原／熔火煉獄 |
| forgottenIsle／giantTomb | 遺忘之島／古代巨人之墓 | 紫霧遺跡／泰坦墓穴 |
| tower | 魔塔（道具：魔塔之魂） | 永夜之塔（道具：永夜之魂） |

- 世界名「亞丁大陸」→「黑暗大陸」（標題副標、序章）。「亞丁王國」（王族職業故事）維持。
- 四大龍（同日第二批）：地龍 安塔瑞斯→**格爾莫斯**、水龍 法利昂→**瑟拉恩**、風龍 林德拜爾→**維斯塔爾**、火龍 巴拉卡斯→**莫爾加斯**；
  巢穴名稱、職業故事、任務、稱號訊息一併替換。怪物 id（antharas 等）、龍鱗道具名（地龍之鱗等）不變。

## 23. 製作通貨（POE 式改造；`craft.js`；2026-10-09，版本 `20261009r`）

- 9 種通貨（2026-10-24 加覺醒石），`cat: 'currency'`、可堆疊、不佔負重（`wt: 0`），載入時併入 `ITEMS`（所以 craft.js 要在 items 之後載入）；回收價依稀有度。

| id | 名稱 | 效果 | 掉落權重 |
|---|---|---|---|
| curAug | 🔹 點化石 | 普通 → 魔法（1～2 條） | 40 |
| curAlt | 🔄 重鑄石 | 重擲魔法裝備全部詞綴 | 30 |
| curTemper | ⚖️ 淬鍊石 | 種類不變、重擲數值（傳說也能用，傳說詞綴保持 ×2） | 12 |
| curRegal | 👑 晉升石 | 魔法 → 稀有，保留原詞綴再加 1 條 | 8 |
| curChaos | 🌀 混沌石 | 重擲稀有裝備全部詞綴（3～4 條） | 6 |
| curAnnul | ✂️ 剝離石 | 隨機移除 1 條（不含傳說、特殊詞綴；魔法剝光變回普通，特殊詞綴留著） | 2.5 |
| curChance | 🎲 命運石 | 普通 → 隨機品質（魔法 75%／稀有 21%／傳說 4%） | 1.2 |
| curOracle | ✨ 神諭石 | 稀有再加 1 條（最多 6 條，特殊詞綴不算） | 0.3 |
| curAwaken | 💠 命運的覺醒石 | 物品等級 70 以上（看 `il`，商店貨不算）：加 1 條特殊詞綴，已有就換掉（傳說也能用）；**只有 Lv.70 以上的怪物掉**（`minLv`） | 0.15（最稀有） |

- **掉落等級限制**（2026-10-24，`20261024m`）：`CURRENCY` 可設 `minLv`，`rollCurrency(lv)` 傳怪物等級，等級不夠的通貨不進權重；
  後端 `loot_roll`（`server-loot.sql`）同樣依 `catalog.currency[].minLv` 過濾（`export-loot-catalog.js` 會輸出 minLv）。單獨更新函式用 `tools/awaken-stone.sql`，執行順序：先它、再 `loot-catalog.sql`。
  Lv.70 以上的怪掉通貨時約 0.16% 是覺醒石。圖鑑取得方式顯示「Lv.70 以上的怪物」「極稀有」。
- **通貨顏色**（`20261024m`，使用者要求）：`itemClass` 對通貨回傳 `cur-<id>`（index.html），點化石淡藍、重鑄石綠、淬鍊石銅、晉升石金、混沌石紫、剝離石紅、命運石青、神諭石白光、
  命運的覺醒石彩色流光（漸層文字＋`curFlow` 動畫，`prefers-reduced-motion` 時不動）；改造視窗、鍛造 NPC 通貨列也套用。
- **衝裝卷軸名稱顏色**（`20261024ag`，使用者要求）：`itemClass` 對 `scroll:'enchant'` 的祝福卷軸回傳 `scroll-bless`（金色漸層＋白光掃過的 `blessFlow` 流光、金色光暈），詛咒卷軸回傳 `scroll-curse`（深紅 #a8122b＋暗紅光暈）；一般衝裝卷軸維持白色。只改顯示，不改數值、存檔。

- **特殊詞綴**（2026-10-24，`20261024l`，使用者要求；`affix.js` `SPECIAL_AFFIXES`，存在 `inst.af` 並標 `sx: 1`，每件最多 1 條，任何部位都能出，掉落不會擲到）：
  數值依物品等級 70～110 成長（`specialIl`），上限：全能力 `allStat` +1～3（力敏體智精各加，`affixFx` 展開）、首領增傷 `bossDmg` 5～15%（`bossDmgMult`，物理與魔法傷害）、
  經驗加成 `expPct`／金幣加成 `goldPct` 3～10%（`onKill`）、反傷 `thorns` 5～15%（`monsterAttack`，只有被物理攻擊打中時）。
  其他通貨重洗（`applyAffixes`）保留特殊詞綴；顯示為青綠色 `.q-special`「💠 …（覺醒）」；`affixDef(k)` 同時查一般與特殊詞綴（`save.js` 讀檔過濾也用它）。
  後端掉寶要使用者在 Supabase 依序執行 `tools/awaken-stone.sql`、`tools/loot-catalog.sql` 才會掉覺醒石（`catalog.currency` 依權重與 minLv）。

- 掉落：每隻怪 3%（`CURRENCY_DROP_P`）、首領 60%（`CURRENCY_BOSS_P`，1～3 顆），依權重 `rollCurrency`。實測約每 100 隻 3 顆。
- 物品等級 `craftIl`：有 `il` 用 `il`，商店／任務裝沒有就用玩家等級。傳說裝備只能用淬鍊石。
- 介面：**2026-10-12 起改到村莊鍛造 NPC →「🔮 裝備改造」**（`renderGearForge`，列身上與背包的武器、防具和持有通貨，版本 `20261012m`），「🔮 改造」開 `openCraftDialog`（上方裝備詞綴、下方全部通貨與數量，不能用的變灰），點一顆就套用並重畫視窗；背包裝備、地圖、通貨的道具視窗不再有改造相關按鈕（版本 `20261012o` 起連「找鍛造 NPC」提示按鈕也移除）。
  圖鑑新增「通貨」分類，取得方式顯示掉落機率。

## 24. 異界地圖 T1～T15（POE 式；`maps.js`；2026-10-09，版本 `20261009s`，存檔 schema 3）

- 20261024t新增五格地圖排程（第126節），每格指定同種地圖張數，通關後依序自動開圖；原異界裝置仍可單張開啟，執行排程時須先暫停或取消。

- 取代第 23 節同日的「自由開關詞綴」（`player.mapMods` 已移除，`migrateSave` 刪掉）。地圖詞綴只在異界裡生效。
- **地圖道具** `map1`～`map15`（`cat: 'map'`、不堆疊、`wt: 0`，載入時併入 `ITEMS`）：實體帶 `q`（magic 1～2 條／rare 3～4 條）、`mm` 詞綴、`nm` 名稱前綴。
  階級對應地區 `mapZoneFor(t)`：野外＋地監依建議等級排序（14 個），T15 用最後一個（泰坦墓穴）且怪物 HP／傷害／經驗 ×1.4。
- **地圖詞綴** `MAP_MODS`（8 種）：強壯 HP+40%、兇猛 傷害+30%、成群 怪群上限+2 且數量+50%、**大軍 數量+100%**、精英、抗魔、迅捷、枯竭；
  獎勵加成 `mapBonusOf`（經驗、金幣、所有掉落機率）。
- **開啟**：村莊「地圖」頁「🌀 異界裝置」或背包地圖「🌀 開啟」→ `openMap`，建立 `player.mapRun = { t, zone, mods, q, name, total, left, boss }`、傳送到該地區並開始掛機。
  **怪物數量 `total` = 200～300 × `mapQtyOf`（1＋數量詞綴，最多 ×3）**。每擊殺一隻 `left--`（`mapOnKill`），怪群不會超過剩餘數量。
  `left` 歸零後下一次尋怪出現「異界首領・名稱」（`makeMapBoss`：地區稀有首領 HP ×2，或最強怪 HP ×8；首領大招紅圈照常），打倒＝`completeMap`：
  通關獎勵 1 張地圖（同階 55%／+1 35%／+2 10%）＋50% 再一張同階或低一階，然後回村。
  **首領 HP 會保留**（2026-10-16，版本 `20261016k`；玩家回報 T15「閃紅圈後首領血量馬上回滿、打不死」）：原因是紅圈重擊（×2.5）把 HP 打到瞬移門檻 → 自動瞬移卷軸 `leaveFight` 放掉所有怪 →
  下次尋怪又 `makeMapBoss` 生出滿血首領（停止掛機 `stopHunt` 也一樣）。現在兩者都先呼叫 `rememberMapBoss()` 把首領剩餘 HP 記到 `player.mapRun.bossHp`（跟著存檔），
  `spawnMonster` 再生首領時在 `addMob`（套地圖詞綴，「強壯」會重設 HP）之後改回剩餘 HP，訊息「帶著傷回來了（HP x/y）」。
- **地圖消失**：中途回城（步行、死亡、瞬移逃離龍穴等 `moveToTown`）→ `endMapRun`；**回家卷軸改成留下村莊一次性傳送門（第 114 節）**。地圖頁也可「放棄這張地圖」。
- **掉落**：一般地圖每隻 0.4%（`MAP_DROP_P`，階級＝怪物等級對應的最高階 `mapTierForLv`）、異界裡 1.5%（同階 ±1）；品質 普通 50%／魔法 35%／稀有 15%。
- **通貨改地圖**（`MAP_CURRENCY`）：點化（普通→魔法）、重鑄（重擲魔法）、晉升（魔法→稀有＋1 條）、混沌（重擲稀有 3～4 條）、剝離（移除 1 條）、
  命運（普通→魔法 70%／稀有 30%）、神諭（稀有＋1 條，最多 6）；淬鍊石不能用在地圖。`craft.js` 的 `currencyCan`／`useCurrency` 依道具類型分流。
- **地圖改造搬到鍛造 NPC**（2026-10-12，版本 `20261012l`）：鍛造 NPC 對話框分「🔨 裝備鍛造／🔮 裝備改造／🗺️ 地圖打造」（`craftMode`），地圖打造 `renderMapForge` 列出背包地圖（詞綴、獎勵）、持有的地圖通貨，「🔮 改造」開 `openCraftDialog`；背包地圖視窗的「🔮 改造」已移除。`craftUseBtn` 用完通貨會 `renderPanel` 讓背後清單同步。
- **離線**：快轉模擬照樣套用地圖詞綴；`applyOffline` 最多只會把剩下的怪打完（首領要上線打），結束訊息提示首領在等；離線中回城也會關閉地圖。
- **相同地圖疊成一列**（2026-10-16，版本 `20261016q`，使用者要求）：背包、異界裝置、鍛造 NPC 的地圖打造清單把「同階、同品質、同詞綴、同名稱」（`mapKindKey`）的地圖合成一列顯示「×N」（`groupMaps`），
  點開的是第一張；地圖說明顯示「背包裡同樣的共 N 張」（`mapCountSame`）。**只是顯示合併**：存檔裡仍是一張一個實體（不改 `isStackable`），開啟／出售／上架／改造／存倉庫都只動一張，其他功能不用改。
- 介面：狩獵畫面左上 `#map-prog` 顯示「🌀 T5 剩 132/240 圖示 +45%」；2026-10-24 改成亮紅色粗體（#ff4545）加黑色陰影，使用 `.scene-top .map-prog` 避免被通用 small 灰字覆蓋。僅 CSS，版本維持 20261024b。背包新增「地圖」篩選；圖鑑新增「地圖」分類（取得方式、地區）。

## 25. 人物選單與多角色欄位（2026-10-09，版本 `20261009v`）

- 使用者要求：參考 RPG Maker 隊伍狀態畫面做「人物選單」，讓玩家同時養多個職業、各自存檔。
- **欄位**：`MAX_SLOTS` 8 個（`config.js`）。欄位 0 沿用舊 key `dragonSlayer_save_v2`（舊存檔直接出現在第 1 格，**不用轉換、schema 不變**），
  欄位 i 的 key 是 `dragonSlayer_save_v2_s{i}`（`slotKey`）。最後玩的欄位記在 `dragonSlayer_slot`（`SLOT_KEY`），`currentSlot` 載入 save.js 時讀出。
  `saveGame`／`loadGame`／`deleteSave(i)` 都依 `currentSlot`；`hasSave()`＝任一欄位有存檔。匯出／匯入只作用在目前角色。
- **標題畫面**：有存檔時顯示「📜 繼續冒險（名字・職業 Lv）」（最後玩的角色）＋「👥 人物選單」；完全沒存檔才顯示「⚔️ 建立新角色」。
- **人物選單** `#screen-select`（`ui-create.js` 的 `openCharSelect`／`renderCharSelect`）：
  卡片 `charCardHtml`：職業立繪（`art`，沒有就大 emoji）鋪滿 9:16 卡片，上方名字、職業、Lv、Next（升級還差的經驗），下方 HP／MP 條、地點（⚔️＝離開時在掛機）、金幣、上次遊玩時間。
  已有角色全部列出，空欄位只顯示第一個「＋ 建立新角色」；點卡片選取（`pickSlot`，選中發青光、名字變黃），雙擊或「▶ 進入遊戲」進入（`playSlot`），「🗑 刪除」刪除選中的角色。
  寬螢幕 4 欄、760px 以下 2 欄；底部按鈕列 `position: sticky` 固定在下方。
- 卡片資料 `readSlotSummary(i)`：讀出存檔跑 `migrateSave`，暫時把 `player` 換成該角色算 `calcStats`（HP／MP 上限）再還原；解析失敗顯示「⚠️ 存檔損毀」，只能刪除。
- **遊戲中切換**：設定 →「💾 存檔」→「👥 人物選單（切換角色）」：先存檔、清掉 `player`，再開選單。
  進入角色走 `continueGame` → `resetSessionState()`（`main.js`：清 `hunt／session／walkHome`、地圖畫面 `scene`、遊戲訊息 `gameLog`），避免上一個角色的戰鬥或畫面殘留。
- **離線收益照常**：每個角色存檔有自己的時間 `t`，切走時若在掛機，下次進入就依離開時間結算（最多 12 小時、50%），等於其他角色在背景掛機。
- 創角：`openCreate(slot)` 指定欄位（沒給就用第一個空欄位，滿了提示先刪除）；`confirmCreate` 不再刪舊存檔，寫進 `createSlot`。創角「返回」回人物選單（沒存檔回標題）。
- 設定裡「刪除角色」只刪目前角色，還有其他角色時回人物選單。

## 26. 職業技能擴充（2026-10-10，版本 `20261010b`）

- 使用者反映「每職業只有 5 招太少」：每個職業補到 10～12 招（法師 16 招）。**只用既有效果欄位**（`strike` 的 mult／hits／aoe／spread／stun／ignoreAc／magic／undeadMul、`spell`、`buff`、`passive`），戰鬥程式沒改。
- 陣列依學會等級排序（`playerAction` 取「最後一個可用的攻擊技能」＝最高級；高級技能冷卻中時自動改用低級的）。前期多數職業加了 Lv.5～8 的小技能（1.3～1.6 倍、冷卻 5～6 秒、MP 2～4），後期加 Lv.80～85 的終極技。
- 新增招式：

| 職業 | 新招（等級） |
|---|---|
| 王族 | 王者之劍 15、王者光環（被動）48、高級治癒術 62、王命 85 |
| 騎士 | 猛擊 5、衝鋒斬 22、不屈意志（被動，低血）38、騎士誓約 52、盾擊 66、聖劍裁決 85 |
| 法師 | 魔法屏障 52、魔力精通（被動）66、煉獄 78 |
| 妖精 | 精靈之箭 8、精靈祝福（被動）30、暴風神射 52、穿透之箭 70、箭雨 82 |
| 黑暗妖精 | 背刺 5、劇毒之刃 20、暗影之軀（被動）40、暗影風暴 52、暗影鎧甲 70、夜魘 85 |
| 修羅 | 爆裂掌 5、金剛體 18、旋風腿 33、血戰（被動，低血）48、羅剎拳 62、阿修羅 85 |
| 戰士 | 重擊 5、躍擊 18、鋼鐵之軀（被動）32、旋風斬 48、處決 62、大地崩裂 85 |
| 槍手 | 快速射擊 5、閃光彈 28、穩定姿態（被動）42、穿甲彈 58、火箭砲 72、子彈時間 85 |
| 魔鬥士 | 魔刃 5、火焰斬 28、魔力凝聚（被動）42、雷霆風暴 60、魔劍化身 72、天崩 85 |
| 聖騎士 | 聖光打擊 8、虔誠光環（被動）40、正義之怒 58、高級治癒術 70、神聖審判 82 |
| 天使 | 神聖射線 54、聖域 85 |
| 惡魔 | 魔化皮膚（被動）25、生命汲取 58、末日 85 |

- 被動的 `fx.hp` 不會生效（`calcStats` 先算 maxHp 才加被動），被動只用 ac／reduce／hit／mr／dodge／crit／sp／regen／lifesteal 等。
- 平衡（各職業 Lv15／35，新手裝＋對應地圖，5 分鐘×6 次平均）：經驗約 +0～20%（雜訊約 ±15%），死亡與藥水用量持平；Lv60 新手裝必死，數字只供參考。
- 存檔不受影響（技能由等級決定；`settings.skills` 只記關閉的技能 id）。

## 27. 共鳴武器（2026-10-10，版本 `20261010c`；`resonance.js`）

- 使用者決定：稀有武器各綁一招**專屬技能**，裝備時才能用；觸發方式**混合**；職業對上效果 ×1.3；首領、龍、異界、鍛造都能取得；20～30 把、強度分級。
- 資料：`RESONANCE[武器id] = { tier, cls, trigger, …效果 }`，載入時寫進 `ITEMS[id].res`。效果 `kind` 沿用職業技能格式：
  `strike`（mult／hits／aoe／spread／stun／ignoreAc／magic／undeadMul）、`spell`（dmg／spK／aoe／undeadMul）、`heal`（heal／spK）、`buff`（fx／sec）。
- **三種觸發**（`RES_TRIGGER_NAMES`）：
  - `cd` 冷卻施放：`playerAction` 在治癒、增益之後、職業攻擊技能之前檢查 `resonanceReady()`，冷卻存在 `player.cds.res`。
  - `proc` 攻擊觸發：`physicalAttack` 命中後、`castSpell` 施放後呼叫 `resonanceOnHit()`，擲 `p` 機率。
  - `charge` 共鳴爆發：同上每次 +1，存在 `player.resCharge = { id, n }`（換武器重算），滿 `n` 點爆發。
  - proc／charge 觸發後先排進 `hunt.resPending`，等這次行動與 `reapMobs` 結算完，`huntTick` 再呼叫 `resonanceFlush` 放出來（避免在攻擊迴圈裡巢狀出手、打到已死的怪）。
  - 共鳴技能本身的攻擊（技能 id `res_…`，`opt.res`）不會再觸發共鳴。
- `castResonance`：轉成技能物件交給 `doStrike`／`castSpell`／`castHeal`／`castBuff`，**不耗 MP**，名稱「共鳴・xxx」（地圖動作、訊息分類照舊）。
  `res.cls` 職業使用時傷害、治療 ×`RES_CLASS_BONUS`（1.3），增益時間 ×1.3。增益存 `player.buffs[res_武器id]`，`findSkill` 查不到時用 `findResonanceSkill` 取名稱與 fx。
- **31 把**（`tier` 1 稀有／2 英雄／3 傳說／4 神話，`RES_TIERS` 顏色 `res-1～4`）：

| 階 | 武器（觸發） | 取得 |
|---|---|---|
| 稀有 | 瑟魯基之劍（proc）、聖光之錘（proc）、暗黑鋼爪（proc）、暗黑雙刀（proc）、瑪那魔杖（charge）、**海賊王的火砲**（cd） | 既有掉落／鍛造；火砲＝海賊王・德雷克 5% |
| 英雄 | 魔導狙擊槍（cd）、冰之女王魔杖（cd）、深淵鐮刀（charge）、惡魔之斧（proc）、**飛龍之矛**（proc）、**伊弗利特之爪**（proc） | 既有掉落；飛龍之矛＝巨大飛龍 5%、伊弗利特之爪＝伊弗利特 5% |
| 傳說 | 屠龍劍（charge）、死亡騎士的烈炎之劍（proc）、風之弓（proc）＋12 把職業第 4 章任務武器（每職業一把，cd／proc／charge 各有） | 既有來源 |
| 神話 | **大地裂斧**（charge）、**潮汐之杖**（cd）、**颶風之弓**（proc）、**熾焰魔劍**（proc） | 四大龍各 6%，或鍛造：基底武器＋該龍之鱗×5＋高階材料×2～4＋💰80,000 |

- **異界首領**：`RES_MAP_BOSS_P` 10%（× 地圖獎勵加成）掉一把隨機共鳴武器，階級上限 `resMaxTierForMap`：T1～5 稀有、T6～10 英雄、T11～14 傳說、T15 神話。
- 共鳴武器不會出現在暗黑式隨機裝備掉落（`randomEquipFor` 排除 `res`），戰利品過濾也不會賣掉（沒有商店價）。
- 介面：道具說明與圖鑑多一個「🌟 共鳴」框（`resonanceHtml`：名稱、觸發方式、效果、職業共鳴）；圖鑑清單名稱前加 🌟、取得方式多列異界首領；
  狩獵畫面增益列最後顯示 `resonanceChip`（冷卻倒數／觸發機率／共鳴值 n/N，✦＝職業共鳴中）。
- 模擬（Lv.50、腐朽礦坑・深層、各武器配對應職業、3 分鐘 ×2）：每把每分鐘觸發約 3～12 次，全部都能正常放出。
- 存檔不需轉換：`player.resCharge` 沒有就從 0 開始。離線收益的快轉模擬直接沿用（共鳴照常觸發）。

## 28. 共鳴防具與飾品（2026-10-10，版本 `20261010e`；`resonance.js`）

- 使用者：「傳說裝備不應該只有武器，防具、飾品也需要」。共鳴系統從「只看武器」改成**所有裝備部位**：`resItemIds()` 依 `SLOT_KEYS` 列出身上每件有 `res` 的裝備，**可同時穿多件**，各自計算。
  - 冷卻：每件各自 `player.cds['res_' + 裝備id]`（第 27 節原本的 `player.cds.res` 已不用）。
  - 共鳴值：`player.resCharge = { 裝備id: n }`（舊版 `{ id, n }` 由 `resChargeMap()` 讀到就重置）。
  - 排隊：`hunt.resPending` 改成陣列，同一次行動可觸發多件；`resonanceFlush` 依序放出（已卸下的略過）。
  - `cls` 可省略（防具多半人人適用，沒有職業共鳴加成）。
- **新增兩種觸發**（防具用）：
  - `hurt` 受擊觸發：`monsterAttack` 造成傷害且沒死、首領大招命中後呼叫 `resonanceOnHurt(st)`，擲 `p` 機率。
  - `lowhp` 危急觸發：受傷後 HP 低於 `pct` 且冷卻 `cd` 秒已過才觸發（保命用；自動喝水把 HP 維持在設定以上時不會觸發）。
  - 受擊觸發的治療／增益**立刻生效**；反擊類（strike／spell）排隊，等怪物攻擊結算完由 `huntTick` 再呼叫一次 `resonanceFlush` 放出。
- **23 件**（既有 7 件加特效＋新 16 件，`RESONANCE_ARMOR_ITEMS`）：

| 階 | 裝備（部位・觸發） | 取得 |
|---|---|---|
| 稀有 | 騎士頭盔（頭・受擊）、保護者斗篷（斗篷・危急）、力量手套（手套・攻擊）、**狼王牙項鍊**（項鍊・爆發）、**海賊王的戒指**（戒指・攻擊） | 既有掉落；狼王牙＝古老樹精 5%、海賊王戒指＝海賊王 5% |
| 英雄 | 速度之靴（受擊）、抗魔斗篷（受擊）、泰坦腰帶（危急）、**寒冰之盾**（受擊反擊）、**飛龍頭盔**（爆發）、**炎魔手套**（攻擊） | 冰之巨人王／巨大飛龍／伊弗利特各 5% |
| 傳說 | 龍鱗鎧（受擊）、**大賢者頭冠**（冷卻）、**不死鳥之鎧**（危急）、**夜影斗篷**（受擊）、**巨人王腰帶**（爆發）、**天使之戒**（受擊回血）、**惡魔之戒**（攻擊）、**深淵之眼**（爆發） | 遺忘之王、巨人王的亡魂、歐西里斯、惡魔、永夜之塔 60F／80F 首領（12%） |
| 神話 | **大地守護者之盾**（受擊反擊）、**潮汐之心**（冷卻回血）、**風神之靴**（受擊）、**火龍之心**（攻擊） | 四大龍各 6%，或鍛造：基底防具＋龍鱗×4＋高階材料＋💰60,000 |

- 新防具的基礎屬性可以有 `hit`／`dmg`／`crit`／`dodge`／`lifesteal`／`hpRegen`／`mpRegen`（`calcStats` 的 `addFx` 本來就收），道具說明與圖鑑已補上這些欄位的顯示。
- 異界首領的共鳴掉落池（第 27 節）自動包含防具，訊息改成「共鳴裝備」。
- 模擬（Lv.50 腐朽礦坑・深層、3 分鐘 ×2）：受擊／攻擊觸發每分鐘約 4～7 次、爆發型約 1.5～3 次、冷卻型 2～3 次；危急觸發在關掉自動喝水時確認會在低血量發動（守護 +68、浴火重生 +304）。

## 29. 帳號登入與雲端存檔（2026-10-10，版本 `20261010f`；`cloud.js`、`tools/supabase.sql`）

- 使用者要求：往多人連線發展的第一步，先做「帳號登入＋雲端存檔」，後端用 **Supabase 免費方案**（與修仙的 Firebase 分開，不吃修仙的額度）。
- **目前狀態（2026-10-10 開通，版本 `20261010h`）**：Supabase 專案 `dragon-slayer`（組織 k559610142，Free，Northeast Asia (Tokyo)，`https://bzozxhkalyuijsrqkmto.supabase.co`）；
  建立時 Security：Enable Data API ✅、Automatically expose new tables ⬜（權限由 supabase.sql 的 grant 決定）、Enable automatic RLS ✅；`tools/supabase.sql` 已執行；Confirm email 已關閉（`mailer_autoconfirm: true`）。
  實測（真實伺服器，Playwright 三台裝置）：註冊即登入、存檔上傳、只讀得到自己的存檔、建隊、房號／公開列表加入、準備、開打、三人領獎全部正常；測試資料已刪除（測試帳號 `dragon-test-*@example.com` 需在主控台 Authentication → Users 手動刪除）。
- **開關**：`cloud.js` 頂端 `CLOUD_SUPABASE_URL`、`CLOUD_SUPABASE_KEY`（Project URL 與 publishable／anon key，本來就公開）。任一個空字串＝完全不啟用：不載入 SDK、不連網、標題畫面沒有「☁️」按鈕、設定分頁沒有雲端區塊。
  `CLOUD_GOOGLE`＝顯示「使用 Google 登入」（要先在 Supabase 主控台 Authentication → Providers 設定 Google）。
- **SDK**：`@supabase/supabase-js` UMD 版（`CLOUD_SDK_URL`，jsDelivr 固定版本），`initCloud`（main.js 啟動時呼叫）動態載入；登入狀態由 SDK 存在 `dragonSlayer_auth`。sw.js 不攔外部網域，離線時雲端功能失效但遊戲照常。
- **資料表** `dragon_saves`（`tools/supabase.sql`）：主鍵 (user_id, slot)，欄位 `client_t`（存檔的 t）、`name/cls/lv`（方便主控台查看）、`data`（整份存檔 jsonb）、`updated_at`（伺服器時間，trigger 自動寫）。
  RLS：登入者只能讀寫刪自己的列；anon 完全沒有權限。2026-10-10 在本機 PostgreSQL 16（模擬 auth schema）實測：可重複執行、別人的列看不到改不了、slot 超出範圍被擋、條件式更新衝突時 0 列。
- **本機仍是主要存檔**：`saveGame` 照舊寫 localStorage，成功後 `cloudMarkDirty(欄位)`；`cloudAutoPush` 每 15 秒檢查，同一批最多每 `CLOUD_PUSH_MS`（60 秒）上傳一次。
  回標題（`backToTitle`）、開人物選單、切到背景（visibilitychange）、設定的「☁️ 立即上傳」會立刻上傳。`deleteSave` 呼叫 `cloudDeleteSlot` 一併刪雲端；沒登入或失敗時記在 `dragonSlayer_cloud_del`（依帳號分開），該帳號下次同步再刪（見下面「刪除角色」）。
- **防覆蓋（多裝置）**：`cloudKnown[欄位]`＝上次看到的雲端 `client_t`。上傳用「`update … where slot=? and client_t=上次看到的`」，0 列＝別台裝置已經更新過 → 進度衝突，該欄位暫停上傳；
  遊戲中的角色跳「☁️ 進度衝突」對話框：「用雲端的進度」（`cloudUseCloudSlot`，下載後重新進入角色，照常算離線收益）／「用這台的進度」（`cloudUseLocalSlot`，upsert 強制覆蓋）。雲端沒有這欄時用 insert，主鍵重複同樣視為衝突。
- **登入時合併**（`cloudSync`）：用角色的 `created|cls` 辨認同一角色。
  - 同一角色：取 `t` 較新的一邊（本機較新 → 上傳；雲端較新 → 下載）。
  - 只有一邊有的角色都保留；本機欄位被雲端佔走時放到空欄位；加起來超過 8 個時不合併、提示先刪角色。
  - `dragonSlayer_cloud_owner` 記這台裝置的角色屬於哪個帳號：換成**別的帳號**登入時，不把本機角色傳進新帳號，改成只載入該帳號的雲端角色。
  - 遊戲中的角色（啟動時自動恢復登入、玩家已經進遊戲）固定以本機為準，不被覆蓋；若雲端同角色更新 → 走衝突對話框。
  - 改寫本機前把原本全部欄位備份到 `dragonSlayer_cloud_bak`（只留最近一次，之後可做還原介面）。
  - `dragonSlayer_cloud_seen`＝上次同步時雲端有哪些角色：本機有、雲端沒有、但上次還在 → 是在別台裝置刪掉的，這台也移除（不會又被傳回雲端）。刪角色、登出時一併更新。
  - 不是正在玩的角色上傳時遇到衝突（例如重新整理時舊頁面的上傳比較晚到）→ 0.5 秒後自動重新同步一次（每分鐘最多一次），同一角色取較新的一邊。
- **登出**：只能在標題畫面（「☁️ 雲端帳號」→ 登出）。先上傳；上傳失敗會警告。確定後**移除這台裝置的所有角色**（已在雲端，下次登入自動下載；也先備份到 `dragonSlayer_cloud_bak`），再登入別的帳號就不會混到。
- **單一裝置登入**（2026-10-13，版本 `20261013c`；`tools/single-login.sql`，也附在 `supabase.sql` 最後）：使用者要求「帳號使用中就拒絕登入」。
  - 伺服器：`dragon_online`（每帳號一列：使用中的 JWT `session_id`、裝置、`beat_at`；RLS 開、不給直接存取）。`online_claim(p_device, p_force)`：別的 session 90 秒內有心跳且沒有 force → `{ok:false, device, ago}`，否則接手；`online_ping()`：自己或對方逾時 → 更新並回 true，被別台搶走 → false；`online_release()`：登出時刪掉自己那列。`dragon_is_banned()` 合併 session-guard：session 被刪、或不是使用中的那個 session（對方 90 秒內有心跳）→ 視同停權，所有寫入被拒（舊版客戶端也擋得住）。
  - 客戶端（`cloud.js`）：`cloudOnSignedIn` 在同步前 `onlineClaim()`；被拒 → `onlineReject`：遊戲中先存檔回標題、`cloudUser = null`、`onlineBlocked = true`（`onAuthStateChange` 與 `cloudOnSignedIn` 都略過），對話框「⛔ 帳號使用中」顯示對方裝置（`onlineDevice()` 由 user-agent 判斷，例如 iPhone Safari）與幾秒前在線：「取消」＝`signOut({scope:'local'})`；「強制登入」＝`signOut({scope:'others'})`＋`online_claim(force)` 後照常登入。登入後 `onlineStart()` 每 30 秒（切回前景也會）`online_ping`，回 false → `onlineKicked()`：存檔、回標題、本機登出、提示改密碼（角色留在本機）。主動登出先 `online_release`，別台馬上可以登入；否則對方離開約 90 秒後才能登入。RPC 不存在（還沒執行 SQL）或網路錯誤時不擋。
  - 測試：本機 PostgreSQL（claim／拒絕／force／被搶後 ping false／逾時接手／停權判斷）；Playwright 假後端（拒絕對話框、取消、強制登入、被搶走自動登出、沒有 SQL 時照常登入）。
- **角色歸屬**（2026-10-13，版本 `20261013b`，`SAVE_SCHEMA` 4）：舊做法整台裝置只有一個 `dragonSlayer_cloud_owner`，有三個漏洞會把角色收進別人的帳號：owner 空的時候所有本機角色都上傳給下一個登入的帳號、遊戲中的角色不檢查 owner 就上傳、被動登出後角色留著又被下一個帳號收走／覆蓋。改成**每份存檔自己記帳號**：
  - 本機存檔最外層 `{ schema, t, owner, ownerEmail, player }`；`owner`＝uid，訪客角色是空字串。**只存在本機**，`cloudPushSlot` 上傳前用 `cloudStripOwner` 拿掉。
  - `save.js`：`playerOwner`／`playerOwnerEmail`（遊戲中角色的 owner，`applySaveData` 讀出、創角清空）；`authUid()` 直接讀 `localStorage['dragonSlayer_auth']`（所有分頁共用、SDK 沒載入也讀得到）；`saveGame(force)`：訪客角色在登入中存檔 → 歸到目前帳號；`owner` 和登入帳號不同、或帳號已登出而本機欄位已被清掉（別的分頁主動登出）→ 不寫入，`ownerKick()` 延後回標題。`slotLocked(i)`＝角色有 owner 且瀏覽器登入的是別的帳號 → 人物卡顯示 🔒、`continueGame` 擋下。沒登入（被動登出、離線）時自己的角色照常可玩、可存。`ownerMigrate()`（main.js 啟動）：舊存檔沒有 owner → 補上 `dragonSlayer_cloud_owner` 的值（沒有就空字串）。匯入存檔拿掉 owner（當訪客角色）。
  - `cloudSync` 逐角色判斷：owner＝目前帳號 → 照舊合併（比 t、seen、墓碑）；空 → 訪客角色收進目前帳號（寫回本機時補 owner）；別的帳號 → `reserved`：不上傳、不覆蓋、不刪除，雲端在那些欄位的角色這台先不顯示；遊戲中的角色屬於別的帳號 → `saveGame(true)` 存本機後回標題。有 reserved 時跳「角色屬於其他帳號」說明。寫回本機的文字一律帶 owner（自己帳號的那份沿用原文字，避免每次判定有變動）。
  - `cloudPushSlot`：存檔 owner 不是目前帳號就不上傳。`cloudDeleteSlot`：別帳號的角色只刪本機。`raidClaim`：只改屬於目前帳號的欄位，寫回時保留 owner。`cloudUseCloudSlot` 寫回本機帶 owner。
  - 被動登出（`onAuthStateChange` 的 SIGNED_OUT，自己按登出時 `cloudSigningOut` 略過）：`cloudOnPassiveSignOut` 清 `cloudKnown／cloudDirty／cloudConflict`，遊戲中先存本機（欄位還在才存）再回標題，提示重新登入才會同步；啟動時沒登入但本機有帶 owner 的角色 → toast 提示。`storage` 事件：別的分頁換成別的帳號 → 這個分頁回標題（不存檔）。
  - 驗收（Playwright＋模擬 RLS 的假後端 `/tmp` 測試）：訪客角色→A 登入→被動登出→註冊 B：雲端 B 沒有、本機保留且鎖住、有提示；遊戲中另一分頁換 B：雲端 B 沒有、回標題；分頁 1 登出清本機、分頁 2 存檔：不寫回、註冊 B 後雲端 B 沒有；純訪客註冊照樣上傳、同帳號別台角色下載、衝突對話框、刪角色墓碑照舊；舊存檔補 owner。
  - 已經混進別人帳號的資料不會自動搬回：管理者用 `dragon_save_dev` 查是哪台上傳，再改 `dragon_saves.user_id`（目標欄位要空），或請原主匯出→自己帳號匯入。
- **刪除角色**（2026-10-15，版本 `20261015a`）：使用者回報「A 帳號刪除角色後重新登入，其他帳號的人物又出現在 A」。三個缺口：
  ①沒登入（被動登出）時刪角色只刪本機，雲端那份下次登入又被下載；②雲端刪除失敗的重試清單 `dragonSlayer_cloud_del` 只在「`dragonSlayer_cloud_owner`＝目前帳號」時處理，
  登出會清掉 owner key，之後永遠不重試、清單還被清掉；③這台有別的帳號的角色（🔒）時，A 雲端裡同一個角色（以前混進來的）又被下載成 A 的，同一角色出現兩份，刪 🔒 那份只刪本機。修正（`cloud.js`）：
  - 待刪除改成**依帳號分開** `{ uid: [角色id…] }`（`cloudDelMap`／`cloudDelAdd`／`cloudDelSave`；舊的陣列格式歸給 `dragonSlayer_cloud_owner` 的帳號）。登出不清。
    `cloudSync` 處理目前帳號那份：雲端找到同一角色就刪、寫墓碑（`cloudTombAdd`），刪不掉的留著下次再試，雲端已經沒有的移除。
  - `cloudDeleteSlot`：沒登入 → 記到角色所屬帳號的待刪除；登入中刪自己的（或訪客）角色 → 寫墓碑＋`cloudRemoveChar`（依角色的 `created`＋`cls` 刪，不管在哪個欄位，原本只照欄位刪可能刪錯），失敗記待刪除；
    **登入中刪別的帳號的角色（🔒）→ 只刪這台的那份，原帳號雲端不動**（不能讓 A 在共用裝置刪掉 B 帳號的角色），目前帳號雲端如果也有同一角色就一起刪並寫墓碑。人物選單刪 🔒 角色時確認框會說明。
  - `cloudSync`：本機有 🔒 角色時，目前帳號雲端裡同一角色不再下載（`dup`，「角色屬於其他帳號」提示會說明）。
  - **擋舊版遊戲**（`tools/client-version.sql`，也附在 `supabase.sql` 最後）：沒有角色歸屬的舊版（存檔 schema < 4）會把別人的角色傳進目前帳號；`dragon_saves` 觸發器 `dragon_saves_client_version` 拒絕 `data.schema < 4` 的寫入（hint `dragon_client_old`，`cloudErrText` 翻成「遊戲版本太舊」）。
    只擋 `auth.role() = 'authenticated'`、且存檔內容有變的寫入（管理者在 SQL Editor 改 `user_id` 不受影響）。新版 `cloudPushSlot` 上傳時一律把 `data.schema` 設成 `SAVE_SCHEMA`。**要等新版發佈後才在 SQL Editor 執行**。
  - **真正的主因（`20261015b`）**：使用者用 a 版測試仍「刪除的角色重新登入又出現」。伺服器規則 `dragon_saves_select_admin` 讓**管理者帳號讀得到所有人的存檔**，
    而 `cloudSync` 讀雲端存檔沒有加 `user_id` 條件（靠 RLS 過濾）→ 管理者登入時把所有玩家的角色當成自己的下載（同欄位互相蓋掉、寫回本機帶自己的 owner），刪幾次都會再從別人那邊抓回來；
    a 版的待刪除照欄位刪，還可能刪到管理者自己同欄位的角色。修正：**讀自己資料的查詢一律加 `.eq('user_id', cloudUser.id)`**——`cloudSync`、`cloudTombIds`（管理者也看得到所有墓碑）、
    `cloudUseCloudSlot`、`vault.js` 的 `offlineSettle`（最後上傳的角色）。之後新增查詢 `dragon_saves`／`dragon_deleted_chars`／`dragon_bans`／`dragon_mutes` 這類「管理者可看全部」的表時都要記得加。
  - 同版：刪除時**先記待刪除再送出刪除請求**，成功刪到才移除（`cloudDelRemove`）——刪完馬上關頁面時請求會被瀏覽器中斷，原本連待刪除都來不及記；
    `cloudSync` 處理待刪除時，刪不掉（網路、伺服器沒刪到）的角色也不下載回來，留著下次再刪。
  - 驗證（模擬伺服器加上「管理者看得到所有人」規則）：管理者登入只看到自己的角色、刪除後不再出現、其他玩家雲端不受影響；刪除請求中斷→再登入補刪；雲端刪不掉→不顯示、恢復後補刪；🔒 情境照舊。
  - B 的角色匯出→匯入 A：匯入會拿掉 owner、成為 A 的新角色（同一個 `created`）；B 刪除時墓碑只擋 B 自己的上傳（`d.user_id = new.user_id`），A 那份不受影響。
  - 驗證（本機、模擬 Supabase：每帳號只看自己的列、墓碑與版本觸發器）：沒登入時刪→再登入雲端也刪；刪除失敗→登出→再登入會補刪；🔒 角色不重複、刪除後 A 雲端的混入那份刪掉、B 雲端不動；B 匯入 A 後 B 刪除、A 照舊；
    舊版 schema 3 上傳被擋、新版照常；兩台裝置合併、別台刪除、正常刪除照舊。沒有用真實 Supabase 測。
- **登入安全**（2026-10-12，版本 `20261012y`）：使用者把帶有 `#access_token=…&refresh_token=…` 的網址（舊的 implicit 登入流程，Google 登入／確認信跳轉回來時網址列會帶）傳給別人，對方就以使用者的帳號登入、開了角色「操真猛」。修正：
  - `index.html` `<head>` 第一個 `<script>`：網址 hash 有 `access_token`／`refresh_token`／`provider_token` → 立刻 `history.replaceState` 清掉、**不使用**（舊確認信點了仍會完成驗證，只是要回來手動登入）。
  - `createClient` 改 `flowType: 'pkce'`：Google 登入、確認信回來只帶 `?code=`，要配這個瀏覽器 localStorage 裡的驗證碼才能換登入，網址傳出去沒用；確認信要用註冊的同一個瀏覽器開才會自動登入。
    `cloudCleanUrl()`（`getSession` 之後）拿掉 `?code=`／`error` 參數；`cloudRedirectUrl()`＝`origin + pathname`（不帶 query／hash）。
  - 「☁️ 雲端帳號」對話框加「🚪 登出所有裝置」：`cloudSignOut(true)` → `cloudDoSignOut(true)` 用 `signOut({ scope: 'global' })` 讓所有 refresh token 失效（失敗就停下並提示，不清本機），提醒改密碼。
  - 手動踢人：SQL Editor `delete from auth.sessions where user_id = …`（`auth.sessions` 也看得到各裝置的 IP、user_agent）。
  - **踢人立即生效**（`tools/session-guard.sql`，也附在 `supabase.sql` 最後）：`dragon_is_banned()` 多檢查 JWT 的 `session_id` 是否還在 `auth.sessions`；session 被刪（登出所有裝置／後台刪除）→ 視同停權，存檔、團隊、聊天、倉庫等寫入立刻被拒（不然對方手上的 access token 還能用到過期，最多 1 小時）。沒有 `session_id` 的 JWT 不受影響。本機 PostgreSQL 測過：活的 session f、被刪的 t、停權 t。
  - **存檔裝置紀錄**（`tools/save-device-log.sql`，也附在 `supabase.sql` 最後）：`dragon_saves` 每次 insert／update 由觸發器 `dragon_save_dev_log` 寫一列 `dragon_save_dev`（slot、角色名／職業／等級、`char_created`、JWT `session_id`、`request.headers` 的 user-agent 與 IP），每帳號留 300 筆，只有管理者讀得到；記錄失敗不擋存檔。用來查「某角色是哪台裝置在上傳」（2026-10-13 使用者帳號一直有別人的角色「操真猛」上傳）；`session_id` 可對 `auth.sessions.id`。
  - **刪除角色的墓碑**（2026-10-13，版本 `20261013a`；`tools/char-tombstone.sql`，也附在 `supabase.sql` 最後）：使用者刪了別人的角色「操真猛」，幾分鐘後又被還開著它的裝置傳回來。`deleteSave` → `cloudDeleteSlot` 多寫一筆 `dragon_deleted_chars`（帳號＋`char_created`＋`cls`＋名字）；`dragon_saves` 的 BEFORE 觸發器 `dragon_saves_tombstone` 遇到墓碑上的角色就 `raise 'char deleted'`（hint `dragon_char_deleted`），舊版客戶端也傳不上去。客戶端：`cloudPushSlot` 收到這個錯誤 → `cloudDropDeleted(i)`：備份到 `dragonSlayer_cloud_bak` 後移除本機欄位，正在玩就回標題並提示；`cloudSync` 先讀 `cloudTombIds()`（表不存在就當作沒有），本機（同帳號）與雲端有墓碑的角色都移除。手動加墓碑：`insert into public.dragon_deleted_chars (user_id, char_created, cls, name) select user_id, (data->'player'->>'created')::numeric::bigint, cls, name from public.dragon_saves where name = '…'`。
- **介面**：標題畫面 `#btn-cloud`（未登入「☁️ 登入／註冊」，已登入顯示 Email 與同步狀態 `cloudStatusText`）；登入對話框 Email＋密碼，「登入」／「註冊新帳號」，錯誤訊息翻成中文（`cloudErrText`）。
  設定分頁「☁️ 雲端存檔」區塊（`cloudSettingsHtml`）：已登入顯示狀態與「立即上傳」，未登入「回標題畫面登入」。
- **Supabase 開通步驟**（使用者在主控台操作）：
  1. supabase.com 註冊 → New project（地區建議 Northeast Asia (Tokyo)，資料庫密碼自己保存）。
  2. SQL Editor → 貼上 `tools/supabase.sql` 整份 → Run。
  3. Authentication → Sign In / Providers → Email：**關閉「Confirm email」**。Supabase 內建寄信服務每小時只能寄很少封，而且只寄給專案成員，玩家收不到確認信；之後要寄信（驗證、忘記密碼）需設定自訂 SMTP。
  4. Authentication → URL Configuration：Site URL 填 `https://k559610142-art.github.io/-username-.github.io-/屠龍勇者/`（之後做 Google 登入／忘記密碼才用到）。
  5. Project Settings → API（或 Data API）：把 Project URL 與 publishable key（或 anon key）給 Claude 填進 `cloud.js`，換版本號發佈。
- **還沒做（下一步）**：忘記密碼（需自訂 SMTP）、Google 登入、存檔歷程與合理性檢查（抓改檔，例如每次上傳記等級／金幣變化）、GM 封鎖帳號、從 `dragonSlayer_cloud_bak` 還原的介面。
  **防作弊限制**：存檔仍由玩家端產生，登入只讓每份存檔有主人、方便事後查核與封鎖，不能阻止改檔。
- **驗證**（2026-10-10）：Playwright＋假 Supabase（Node 端共用資料）實測：未設定時無按鈕、單機正常；訪客兩角色註冊後上傳；另一台有自己的角色登入同帳號 → 合併成 3 個不覆蓋；
  密碼太短、密碼錯誤的提示；兩台同玩一角色 → 後上傳的一方出現衝突，兩種選擇都正確；刪角色雲端同步刪除；登出清空本機；換新帳號登入不會拿到舊帳號角色；重新整理自動恢復登入。
  真實 SDK（2.117.2）載入、建立 client 正常，連不上伺服器時顯示「連不上雲端伺服器」。Console 無錯誤。

## 30. 團隊副本（2026-10-10，版本 `20261010g`；`raid.js`、`tools/supabase.sql` 後半）

- 使用者要求：目標是「多人掛機 RPG（輕度 MMO）」，第一個多人玩法＝**和朋友組隊打龍，像副本一樣最多 8 人組好隊再開始**。
- **需要雲端**：`isCloudConfigured()` 且已登入才能用；沒開通時右側抽屜仍有「🐉 團隊副本」分頁，但只顯示尚未開通，村莊頁不顯示入口按鈕。
- **入口**：右柱抽屜「🐉 團隊副本」（`DRAWERS.right`）、村莊頁上方按鈕（開通後才顯示）。
- **副本** `RAIDS`：

| id | 首領 | 需求 Lv | 冷卻 | HP 倍率 | 傷害倍率 | 獎勵倍率 |
|---|---|---|---|---|---|---|
| drake | 甦醒的地龍（Lv33） | 25 | 2 小時 | 1.6 | 1.0 | 3 |
| wyvern | 巨大飛龍（Lv55） | 45 | 3 小時 | 1.1 | 0.85 | 3 |
| antharas | 地龍・格爾莫斯 | 55 | 6 小時 | 1.5 | 1.0 | 1 |
| fafurion | 水龍・瑟拉恩 | 65 | 6 小時 | 1.3 | 0.9 | 1 |
| lindvior | 風龍・維斯塔爾 | 75 | 6 小時 | 1.0 | 0.8 | 1 |
| valakas | 火龍・莫爾加斯 | 85 | 6 小時 | 0.9 | 0.7 | 1 |

  首領 HP 再乘 `raidPartyHp(n) = 0.6 + 0.4n`（1 人 ×1、8 人 ×3.8）。冷卻 `player.raidCd[id]`（真實時間，**只有勝利才進冷卻**），與單人龍穴的 `dragonCd` 分開。
- **流程**：
  1. 建立隊伍 `raidCreate`：`raid_rooms` 一列（6 碼房號 `code`，字元不含 0/O/1/I；重複就換）＋隊長自己的 `raid_members`。
  2. 加入（**用 insert，不能用 upsert**：upsert 的 ON CONFLICT 會連帶套用 SELECT 規則，加入前還不是隊員 → `new row violates row-level security policy`，2026-10-10 真實伺服器實測發現；主鍵重複＝已在隊伍裡，當作成功）：輸入房號 `raidJoinCode`（大小寫都可以）或公開列表 `raidLoadList`（2 小時內、同版本、招募中，最多 20 隊）。**遊戲版本 `version` 必須相同**。隊長可切換公開／不公開、請人出隊。
  3. 準備 `raidToggleReady`：要在村莊；上傳整份角色快照 `snap`（倉庫拿掉）與 `ready_round = room.round`。準備後換裝要重新準備才會反映。
  4. 開始 `raidStart`（隊長，全員準備好）：讀最新快照 → **在隊長的瀏覽器跑 `raidSimulate`** → `update status='fighting', result=…`（伺服器 trigger 寫 `started_at`）。
  5. 每個人（包含隊長）`raidRefresh` 看到結果就**立刻領獎** `raidClaim`，然後依 `started_at` 播放重播（`RAID_REPLAY_SPEED` 2 倍速，所有人看到同一刻；可「⏩ 直接看結果」）。
  6. 隊長「🔁 同一隊再打一場」`raidAgain`：`status='open'`、`round+1`、清掉結果 → 大家要重新準備（冷卻中的人準備不了）。離開／解散：隊長離開＝`status='closed'`，其他人下次更新就被送回首頁。
- **大廳更新**：`RAID_POLL_MS` 3 秒輪詢（分頁在背景時暫停），沒有用 Realtime（較簡單、免費方案夠用）。房號記在 `dragonSlayer_raid_room`，重新整理或重新登入（`cloudOnSignedIn` → `raidResume`）後回到隊伍、補領離線期間打完的獎勵。
- **團戰模擬** `raidSimulate(def, list)`（全程 `SIM_MODE`，結束完整還原 player／hunt／session／gameNow／遊戲訊息）：
  - 每個隊員是快照的複本（`migrateSave`），清掉增益與冷卻、HP／MP 補滿，關掉瞬移與自動回家；共用同一隻首領物件 `hunt.mon`。
  - 每 100ms 輪流把 `player`、`hunt` 換成各隊員，直接呼叫 combat.js 的 `autoSupport`（喝水）、`playerAction`（技能／魔法／普攻）、`resonanceFlush`、`regenTick`，所以職業、裝備、共鳴、藥水規則都和單人一樣。
  - **補師**：有治癒魔法的職業，隊友 HP < 50% 且自己不危險時，改補最危險的隊友（`raidAllyHeal`）。
  - **首領**：每 8 秒依「最大 HP × 職業權重 `RAID_TANK`」隨機挑目標（騎士、聖騎士、戰士 ×3；法師 ×0.5），普攻用 `monsterAttack`（隊員的閃避、AC、MR、減傷、魔法護盾、反擊都照算）。
    每 9～13 秒蓄力 1.6 秒放**全體吐息**（首領魔法傷害 ×1.4，受 MR、減傷影響），每人依「首領大招自動閃避」設定 60%／20% 躲開。4 分鐘後狂暴（傷害 ×1.5、攻速 ×1.33），6 分鐘打不倒＝失敗。
  - 隊員倒下就退出戰鬥（**團隊副本死亡不扣經驗**），全員倒下＝失敗。
  - 結果 `{ v, raid, n, win, ms, boss, members[{uid,name,cls,lv,maxHp,dmg,heal,died,used}], frames[[t, 首領HP, 各隊員HP…] 每 0.5 秒], events[[t, 訊息, 樣式]] }`，3 人約 15KB。
- **獎勵** `raidApplyReward`（各自在自己的瀏覽器套用到「參加的角色」；正在玩別的角色時直接改那個欄位的存檔 `raidClaim`）：
  - 不論輸贏：扣掉戰鬥中用掉的藥水、彈藥（`used`；復活卷軸不算）。
  - 勝利：經驗＝首領經驗 × 獎勵倍率 × `raidShare(n)`（`(1+0.25(n−1))/n`：人越多總量越多、每人越少）× 高等級遞減；金幣同理；
    掉落每人各自擲一次 `rollDrops(boss)`（含通貨、隨機裝備）；四大龍算一次討伐（`player.dragons`，可解鎖下一個單人龍穴與「屠龍勇者」稱號）。
  - `player.raidRuns` 記最近 30 場的 `房間id:round`，同一場不會領兩次。
- **資料表**（`tools/supabase.sql`；本機 PostgreSQL 16 實測）：
  - `raid_rooms`：所有登入者可讀（列表、用房號找）；只有隊長能新增／修改／刪除；trigger 鎖住 `id／leader／code／created_at`，`member_count` 只能由 trigger 改，切到 fighting 時寫 `started_at`；
    **建立新隊伍時順便刪掉 2 天前的舊隊伍**（連同隊員、戰鬥結果，免費方案 500MB 不會被塞滿）。
  - `raid_members`：只有同隊的人看得到（`raid_is_member` security definer，避免 policy 遞迴）；只能新增／修改自己那列（不能改 room_id／user_id）；自己或隊長可以刪。
    trigger：隊伍不是 open 時拒絕加入（`room closed`），滿 8 人拒絕（`room full`，鎖住隊伍列避免同時加入超過）。
- **防作弊限制**：快照由隊員自己上傳、模擬在隊長瀏覽器，改過存檔的人照樣能帶進副本；獎勵也是各自套用到本機存檔。給朋友一起玩足夠，之後要防作弊可以把模擬搬到 Supabase Edge Function（伺服器讀雲端存檔來模擬）。
- **平衡**（商店最好的武器＋4、防具＋4、各 200 瓶治癒藥水，騎士／妖精／法師／黑妖／王族／戰士／天使／槍手依序組隊；每格 6 場）：
  需求等級時 2 人大多失敗、**4 人：地龍、飛龍、格爾莫斯、瑟拉恩、維斯塔爾全勝，莫爾加斯約一半**；8 人全部全勝，戰鬥約 3～4 分鐘（重播 1.5～2 分鐘）。
- **驗證**：Playwright＋假 Supabase（Node 端共用資料，模擬 trigger）三台裝置：建隊、房號加入（小寫也可）、公開列表加入、沒準備時不能開始、全員準備、開戰、
  三人同步重播與結果、三人都拿到經驗金幣並扣藥水、重複整理不會重領、再打一場要重新準備（冷卻中準備不了）、請出隊員、解散隊伍；Console 無錯誤。

## 31. 抓改檔與封鎖帳號（2026-10-10，版本 `20261010i`；`tools/supabase.sql` 最後一段、`gm.html`）

- 使用者要求：記錄每次存檔的等級與金幣變化，異常就標記，加上封鎖帳號。
- **全部在伺服器做**：`dragon_saves` 的 AFTER INSERT/UPDATE trigger `dragon_saves_audit`（security definer）從上傳的 jsonb 算出數值寫 `dragon_save_log`、判斷異常寫 `dragon_flags`，玩家端跳不過也看不到。
  trigger 內部錯誤一律包在 exception 裡（記成 `parse`），**不會擋住正常存檔**。
- **歷程** `dragon_save_log`：每次上傳一筆（user_id、slot、角色建立時間 `char_created`、名字、職業、Lv、總經驗 `total_exp`、金幣、client_t、伺服器時間 `at`、flags），每個欄位留最近 200 筆。
  `dragon_profiles`：帳號 Email（取自登入 token）、最後角色名、最後上傳時間。
- **異常規則**（`dragon_flags.kind`；同一角色同一種、24 小時內未處理的不重複記）：
  - `exp_rate`：和同一角色上一筆比，每小時總經驗增加 > 2000 ×((上一筆等級+5)²+1)× 狩獵遞減（時間最少算 0.5 小時）。
    第一次上傳的角色：從角色建立時間算，Lv.20 以上且總經驗 > 2000×226×小時＋10 萬。
    參考實測（各等級最好的地圖、裝備＋6、10 分鐘模擬換算）：每小時經驗約「(等級²+1)×遞減」的 100～600 倍，門檻約是正常最快的 5～10 倍以上。
  - `gold_rate`：每小時金幣增加 > max(30 萬, 3000 ×((等級+5)²+1))。正常掛機約「(等級²+1)」的 5～215 倍；大量賣裝備也可能觸發，要人工判斷。
  - `stat`：任一基礎能力值 > 40（上限 35＋萬能藥 5）；`elixir`：萬能藥 > 5；`enchant`：背包／倉庫／裝備任一強化 > +15；`level`：等級 < 1 或 > 99；`gold_negative`：金幣 < 0。
  - `clock`：存檔時間 client_t 比伺服器快 10 分鐘以上（改裝置時間刷離線收益、冷卻）。
  - 改規則：改 `tools/supabase.sql` 的 `dragon_saves_audit`，請使用者重新執行整份 SQL。
- **封鎖** `dragon_bans`（user_id、email、reason、by_email）：`dragon_is_banned()` 為真時，`dragon_saves` insert/update、`raid_rooms` insert、`raid_members` insert 的 RLS 都拒絕（同名規則在 SQL 最後一段重建）。
  被封鎖的人仍可讀自己的存檔與自己的封鎖原因，本機照常單機遊玩。
  遊戲端 `cloudCheckBan()`（cloud.js）：登入後先查；上傳被 RLS（42501）擋下時再查。封鎖中 `cloudBan` 有值 → 不同步、不上傳、狀態「⛔ 帳號已停權」、跳一次說明對話框；團隊副本分頁顯示停權（`raidReady` 為 false）。
- **管理者** `dragon_admins`：只能在 SQL Editor 手動加入：
  `insert into public.dragon_admins select id from auth.users where email = '管理者Email' on conflict do nothing;`
  `dragon_is_admin()` 為真時可讀 `dragon_save_log`、`dragon_profiles`、所有人的 `dragon_saves`，可改 `dragon_flags`（標記已處理）、新增刪除 `dragon_bans`。
- **管理頁** `屠龍勇者/gm.html`（網址 `<網站>/屠龍勇者/gm.html`，`noindex`）：用遊戲帳號登入（登入狀態存在 `dragonSlayer_gm_auth`，和遊戲分開）。
  分頁：⚠️ 可疑紀錄（可勾「顯示已處理」；每列：歷程／已處理／封鎖）、👥 玩家（搜尋 Email 或角色名；點角色看歷程）、⛔ 封鎖名單（解除封鎖）。
  歷程視窗：最近 80 筆上傳，列出總經驗、金幣、與上一筆的變化與間隔、異常標籤。封鎖原因玩家看得到。
- **限制**：只能事後發現，擋不住「慢慢改」；存檔仍由玩家端產生。真正防止要把戰鬥搬到伺服器（之後的交易所前必做）。2026-10-19 補強見第 60 節（混淆、存檔加密簽章、雲端簽章、交易所門檻）。
- **驗證**：本機 PostgreSQL 16（模擬 auth.uid／auth.jwt）：SQL 可重複執行；正常成長（Lv10→12、1 小時）不標記；
  改檔（Lv12→40、金幣 1 億、能力 50、強化 +20、萬能藥 9、時間快 1 小時）一次標出 6 種；新角色 0.5 小時 Lv.50 標記；格式錯誤只記 parse、存檔照常寫入；
  玩家讀不到歷程與異常；非管理者不能封鎖；被封鎖者不能上傳、不能建隊、看得到原因。
  **真實伺服器（2026-10-10，使用者已重跑 SQL 並把 k559610142@gmail.com 設為管理者）**：測試帳號上傳正常存檔再上傳改檔存檔 → 兩次都存成功、玩家讀不到歷程與異常、不能自己封鎖；
  使用者在 gm.html 看到標記並封鎖 → 該帳號上傳存檔與建立隊伍都被 RLS 拒絕（403），看得到封鎖原因。測試帳號 dragon-cheat-test@example.com 需在 Users 刪除（刪帳號會連帶刪掉它的歷程、標記、封鎖）。
  Playwright＋假伺服器：管理頁登入、可疑紀錄、歷程、封鎖（玩家端立刻顯示停權、團隊副本鎖住、重新整理仍停權）、解除封鎖；Console 無錯誤。

## 32. 聊天（2026-10-10，版本 `20261010j`；`chat.js`、`tools/supabase.sql` 聊天段、`gm.html` 聊天分頁）

- 使用者要求：B 計畫（多人掛機 RPG）的「聊天」。
- **頻道**：🌏 世界（所有登入玩家）、🐉 隊伍（`room:<隊伍id>`，只有團隊副本隊員；沒隊伍時按鈕鎖住，離開隊伍自動切回世界）。隊伍大廳有「💬 隊伍聊天」按鈕（`chatOpen('room')`）。
- **入口**：右柱抽屜「💬 聊天」（`DRAWERS.right`）；需要雲端且已登入。
- **聊天框**（2026-10-10，版本 `20261010k`，使用者反映「PC 版沒有聊天框」）：左下角的戰鬥訊息框 `#log-pop`（骷髏頭開關）改成兩個分頁「📜 戰鬥訊息／💬 聊天」（`setLogPopTab`，記在 `dragonSlayer_logTab`），PC 與手機共用。
  聊天分頁 `renderPopChat` 畫在 `#pop-chat`（靜態元素，不隨分頁重畫），有頻道切換、訊息列表 `#pop-chat-list`、輸入框 `#pop-chat-input`；`chatRenderList` 同時更新兩個列表。框開著且在聊天分頁時也會抓新訊息（間隔見第 61 節）。
- **PC 入口**：底部 12 格已滿，`PC_SLOTS` 在地圖左側加三顆圓鈕（`side: true`，有深色圓底）：🐉 團隊副本（y 170）、💬 聊天（y 236）、🏰 血盟（y 302；2026-10-11 拿掉上排框架後整排上移 130），x 104，寬高 58（原圖座標）。
- **規則（伺服器）** `dragon_chat`：每則 1～100 字（控制字元換成空白、前後空白去掉）、每人 3 秒一則（trigger `too fast`）、伺服器時間；
  每次發言有 5% 機率順手刪掉 3 天前的訊息。RLS：世界頻道所有登入者可讀；隊伍頻道只有隊員（`raid_is_member`）可讀可寫；
  只能用自己的 user_id 發言；被封鎖（`dragon_bans`）或禁言中（`dragon_mutes.until > now()`）不能發言；只有管理者能刪除。
- **遊戲端**：只在聊天分頁開著、頁面在前景時每 `CHAT_POLL_MS`（4 秒）抓比手上最新更新的訊息（`id > 最後一則`），每頻道留 60 則；沒開聊天時不連網。
  發言帶目前角色的名字、職業、等級。訊息一律 `esc` 顯示。新訊息只更新 `#chat-list`（不重畫整個分頁）；整個分頁重畫時保留草稿 `chatDraft` 與輸入框焦點，打到一半的字不會不見。
  Enter 送出（輸入法選字中的 Enter 不送）；本機也擋 3 秒冷卻。被禁言時輸入框換成「禁言中，到 …」（`chatCheckMute`，第一次開聊天與發言被拒時查詢）。
- **管理頁** `gm.html` 「💬 聊天」分頁：最近 200 則（世界＋所有隊伍，顯示帳號 Email），每則可刪除、禁言（輸入小時數與原因）／解除禁言；下方列出禁言中的帳號。
- **驗證**：本機 PostgreSQL 16：世界／隊伍可見範圍、非隊員不能讀寫隊伍頻道、3 秒冷卻、冒名被拒、超過 100 字被拒、禁言者被拒、非管理者刪不掉、管理者可刪。
  Playwright＋假伺服器兩台裝置：互相看到訊息、HTML 被跳脫、冷卻提示、打字中畫面重畫草稿與焦點保留、建隊後隊伍頻道可用、管理頁刪除與禁言；Console 無錯誤。

## 33. 血盟（2026-10-10，版本 `20261010k`；`clan.js`、`tools/supabase.sql` 血盟段）

- 使用者要求：B 計畫的「血盟」。入口：手機左柱抽屜「🏰 血盟」、PC 地圖左側 🏰。
- **20261024e 起改為角色血盟（第119節）**：同帳號各隻角色可各自加入一個血盟；下列帳號制為舊規格，須先執行 `tools/clan-character.sql`。刪除入盟角色會移除成員；盟主優先由有效副盟主接班，否則最早入盟的有效盟員，無人則解散。
- **規則（全部在伺服器函式裡，玩家不能直接寫表）**：`dragon_clans`（名稱 2～12 字、不分大小寫唯一，徽章，公告 ≤200 字，加入方式 open／approve，人數）、
  `dragon_clan_members`（主鍵 user_id＝**一個帳號只能在一個血盟**；role leader／officer／member；最近用的角色名、職業、等級、最後上線）、`dragon_clan_apps`（入盟申請，附言 ≤60 字）。
  函式（security definer，都檢查已登入、沒被封鎖）：`clan_create`（Lv.15 以上）、`clan_join`（open 直接加入／approve 送申請，同時最多申請 3 個）、`clan_cancel_app`、
  `clan_decide`（盟主／副盟主審核）、`clan_kick`（盟主可踢副盟主與盟員；副盟主只能踢盟員）、`clan_set_role`（盟主任命／取消副盟主）、`clan_transfer`（讓位，自己變副盟主）、
  `clan_leave`（盟主有其他成員時要先讓位；只剩自己＝解散）、`clan_disband`、`clan_update`（公告：盟主＋副盟主；加入方式與徽章：盟主）、`clan_touch`（更新自己的角色名、等級、上線時間）。上限 50 人。
  RLS：血盟與成員所有登入者可讀；申請只有本人與該盟盟主／副盟主可讀；insert／update／delete 權限全部收回。
- **遊戲端**：建立限定王族 Lv.15 以上（2026-10-20，版本 `20261020a`；建立按鈕與 clanCreate 都檢查職業，確認視窗送出前再檢查）；要 20,000 金幣（`CLAN_COST`，遊戲扣，伺服器不檢查）。登入時 `clanLoad(true)` 背景讀自己的血盟；第一次打開分頁讀完整資料（成員、申請或血盟列表）。
  沒有血盟：血盟列表（搜尋、加入／申請／取消申請）＋建立表單（名稱、12 種徽章、加入方式）。有血盟：名稱、人數、職位、💬 血盟聊天、公告（盟主／副盟主可編輯）、入盟申請（同意／拒絕）、
  成員（依職位、等級排序；按權限顯示任命、讓位、請出）、盟主設定（徽章、加入方式、解散）。伺服器錯誤訊息轉成中文（`CLAN_ERRORS`）。
- **職業限制範圍**：目前王族創建限制在遊戲端；正式伺服器 clan_create 尚未檢查職業，需使用者確認後才可修改 SQL。其他職業仍可加入血盟，既有血盟及讓位規則不變。
- **血盟聊天**：`dragon_chat` 頻道加 `clan:<血盟id>`，只有該盟成員可讀可寫（`dragon_my_clan()`）。聊天分頁與聊天框都有「🏰 血盟」。
- **團隊副本加成**：`raid_members.clan_id`（加入隊伍時有血盟才帶）→ 隊長開戰時放進結果 `members[].clan` → 領獎時同血盟（含自己）2 人以上，經驗、金幣 ×1.1（`CLAN_RAID_BONUS`），結算畫面顯示「🏰 血盟加成」。
- **驗證**：本機 PostgreSQL 16：等級不足、名稱重複、已有血盟、直接寫表被拒、申請／審核、權限（盟員不能踢、副盟主不能踢盟主）、盟主要先讓位、讓位、退出後看不到血盟聊天、解散。
  **真實伺服器**（使用者已執行 SQL）Playwright 兩台：建盟扣金幣、列表看得到、申請、審核同意、任命副盟主、PC 聊天框血盟頻道發言對方看得到、同血盟兩人打地龍各拿到加成（clanBonus 2）、退出與解散；網路與 Console 無錯誤。

## 34. 排行榜（2026-10-10，版本 `20261010l`；`rank.js`、`tools/supabase.sql` 排行榜段）

- 使用者要求：B 計畫的「排行榜」。入口：手機右柱抽屜「🏆 排行榜」、PC 地圖左側最上面 🏆（`PC_SLOTS` side，y 104）。
- **資料來源**：伺服器函式 `dragon_leaderboard(p_kind, p_cls, p_limit)`（security definer）直接從 `dragon_saves` 的存檔計算，玩家不用另外上傳；被封鎖（`dragon_bans`）的帳號排除。
  回傳前 `p_limit`（最多 100）名＋呼叫者自己的角色（`is_me`），**不回傳 user_id**；只有登入者能呼叫。每個角色（帳號×欄位）一列，角色旁顯示所屬血盟。20261024e 起以帳號＋角色 created＋職業精確關聯，分身不共用血盟（第119節）。
  - `level`：總經驗（`dragon_total_exp`），可用 `p_cls` 篩選職業。
  - `dragon`：`player.dragons` 各龍討伐次數總和（單人龍穴＋團隊副本）。
  - `tower`：`player.towerCleared` 最大的樓層（只記守關首領樓層：10、20…）。
  - `kills`：`player.kills`。
  - `clan`：血盟依人數、平均等級排序（`lv` 欄位放人數、`val` 放平均等級）。
  同分依等級、名字排序。值為 0 的不上榜。
- **畫面**：五個榜的切換鈕、等級榜可選職業、前 50 名（🥇🥈🥉）、自己的角色金框；不在前 50 名時下方列出「你的角色」名次。同一個榜 1 分鐘內再看用快取，「🔄 重新整理」強制重讀。
- **驗證**：本機 PostgreSQL 16（排名、職業篩選、封鎖排除、只取前 1 名仍回傳自己、血盟榜、匿名不能呼叫）；
  **真實伺服器** Playwright 兩台（PC＋手機）：五個榜的數值與順序正確、職業篩選、自己的角色標示；網路與 Console 無錯誤。測試存檔已刪除。

## 35. 世界首領（2026-10-10，版本 `20261010m`；`wb.js`、`tools/supabase.sql` 世界首領段）

- 使用者要求：B 計畫的「世界首領」。入口：手機右柱抽屜「👹 世界首領」、PC 地圖左側最上面 👹（`PC_SLOTS` side，y 38，第 19 節）。
- **伺服器**（`dragon_wb`、`dragon_wb_hits`、`dragon_wb_claims`，玩家不能直接讀寫，全部經過函式）：
  - `wb_current()`：回傳目前首領、自己今天剩幾次、對這隻造成的傷害、參戰人數；沒有首領或上一隻結束（打倒或 48 小時到）滿 30 分鐘時建立下一隻（advisory lock 防重複）。
    輪替 drake 遠古地龍・格蘭卡 🐲 → balrog 炎魔・巴洛格 🔥 → frost 冰霜巨龍・希琳 🐉 → lich 不死君王・莫德 💀 → roc 風暴巨鷹・奧拉 🦅。
    HP = 6000 × max(3, 近 3 天有上傳存檔的帳號數)。順手刪 30 天前的首領。
  - `wb_attack(p_wb, p_dmg, p_name, p_cls)`：檢查登入、未封鎖、首領還活著、**有雲端存檔**（等級取雲端存檔最高等級）、今天（台灣時間零點起，`wb_day_start`）未滿 3 次；
    單次傷害上限 4 ×（1500 + 70 × 等級），超過截掉並寫 `dragon_flags`（`wb_dmg`，管理頁顯示「世界首領傷害超過上限」）；扣血（鎖列），歸零時記最後一擊。
    上限依據：2026-10-10 實測 12 職業、裝備＋10、對 Lv+3 首領 60 秒，各等級最高傷害約 1300 + 65 × 等級。
  - `wb_rank(p_wb)`：傷害合計前 20 名＋自己（不回傳 user_id）。`wb_unclaimed()`：最近 7 天已結束、自己打過、還沒領的首領。
  - `wb_claim(p_wb)`：首領結束後才能領，每人每隻一次（`dragon_wb_claims` 主鍵），回傳自己傷害、總傷害、名次、人數、是否打倒、是否最後一擊。
- **遊戲端**：挑戰前先存檔並上傳（上限用雲端等級）；`wbMakeBoss` 依挑戰者等級做首領（Lv+3、血量無限、傷害 ×1.3、AC−10、25% 機率放範圍魔法；地龍與冰龍是龍族、炎魔是惡魔、莫德是不死系），
  用 `raidSimulate(…, { boss, limitMs: 60000 })` 模擬 60 秒（1 人；有全體吐息；倒下就結束，不扣經驗），把傷害送伺服器，扣掉用掉的藥水與彈藥；畫面顯示這次傷害、消耗與最後 10 則戰鬥訊息。
  分頁開著時每 15 秒更新（倒數用伺服器時間）。
- **獎勵**（`wbReward`，發給領獎時正在玩的角色）：占比 share = 自己傷害／總傷害；打倒 ×1、時間到 ×0.3。
  經驗 = 升級所需經驗 ×（0.03 + 0.3 × share）× 狩獵遞減；金幣 =（20,000 + 300,000 × share）；打倒時：第 1 名萬能藥、第 2～3 名祝福武器卷、最後一擊祝福防具卷。
- **`raidSimulate` 擴充**：第三個參數 `opts`（`boss` 指定怪物物件、`limitMs` 時間上限；上限不到 4 分鐘就不會狂暴）。團隊副本不受影響。
- **驗證**：本機 PostgreSQL 16（建立首領、無存檔被拒、上限截斷與可疑紀錄、第 4 次被拒、未結束不能領、重複領被拒、30 分鐘後換下一隻、不能直接讀表）。
  **真實伺服器**（2026-10-10，使用第一隻首領測試）：兩個測試帳號用遊戲畫面各挑戰一次（共用血條 18,000 → 14,651、排行、次數剩 2、扣藥水），第三個 Lv99 測試帳號以上限傷害打倒；
  兩人領獎（第 2、3 名：經驗、金幣、祝福武器卷）、重複領被拒；結束畫面顯示最後一擊與下一隻倒數。Console 只有預期中的重複領獎 409。

## 36. 交易所（2026-10-10，版本 `20261010n`；`market.js`、`tools/supabase.sql` 交易所段）

- **20261024o（2026-10-24）：新增「技能書」分類**。`MARKET_CATS` 在卷軸後加入 `book`，沿用 `marketSetCat`／`market_browse(p_cat: book)` 篩選全部魔法書、職業技能書及精靈水晶（`ITEMS.cat === book`）；既有上架分類已使用book，不需改SQL或存檔。
- **⚠️ 2026-10-23 起改用 v2（第 95 節）**：本節的 market_list／market_buy／market_cancel 只檢查不扣、照收玩家送來的道具內容，可複製道具與金幣，已停用；改為 market_list2／market_cancel2／market_buy2。

- 使用者要求：B 計畫的「交易所」。入口：村莊頁「🏪 交易所」按鈕、PC 地圖左側圓鈕 🏪（血盟下面，`PC_SLOTS` side，y 368）、手機左柱抽屜、背包道具視窗「🏪 上架」（在村莊、已登入、可交易時）。
- **寄賣制**（`dragon_market`，玩家不能直接讀寫，全部經過函式）：
  - `market_list(p_slot, p_item, p_price, …)`：檢查未封鎖、價格 1～20 億、不是任務道具、強化 ≤ +15、上架中未滿 10 件、同一件沒有重複上架；
    **這件道具（同 uid、同 id、數量夠）必須在賣家該欄位的雲端存檔背包裡**。上架 48 小時，手續費 5%（無條件進位）。順手刪 30 天前已結清的紀錄。
  - `market_browse(p_cat, p_q, p_sort, p_offset)`：上架中且未過期，分類、名稱搜尋（ilike）、最新／價格低→高／高→低，每頁 50；不回傳賣家 id（`is_mine`）。
  - `market_buy(p_id, p_slot, …)`：鎖列；不能買自己的；**買家該欄位雲端存檔的金幣要夠**；改成 sold。回傳道具 JSON 與價格。
  - `market_cancel(p_id)`：賣家把上架中（含過期）的取回。`market_mine()`：我的上架中＋7 天內賣出。
  - `market_pending()`／`market_ack(買到的 id[], 賣出的 id[])`：兩段式交貨（`buyer_got`／`seller_got`）。
  - 防複製 trigger `dragon_market_audit`（dragon_saves AFTER INSERT/UPDATE）：上架超過 1 分鐘、上架中或已賣出的**裝備**（item 有 ench 欄位）又出現在賣家同欄位的背包 → `dragon_flags` `market_dupe`（管理頁「交易所疑似複製道具」）。
    藥水等堆疊道具可以只賣一部分（同一疊留在背包是正常的），所以不檢查。
- **遊戲端**：購買、上架前先 `saveGame`＋`cloudFlush`（伺服器以雲端存檔為準）。上架成功才從背包拿走（堆疊可只賣一部分），買到後扣金幣再交貨。
  `marketDeliver`：讀 `market_pending`，買到的道具用 `marketGiveItem`（裝備保留品質、詞綴、地圖詞綴等所有欄位）、賣出的錢扣手續費入帳，`player.marketGot` 記已入帳編號（最多 200 筆）→ 存檔、上傳後 `market_ack`；
  就算 ack 沒送到，下次也不會重複入帳。時機：進入角色（`continueGame`）、打開交易所（20 秒內不重複）、看「我的上架」、遊戲中每 3 分鐘。
  在野外可以瀏覽，購買／上架／下架要在村莊。
- **限制**：只檢查「上架當下雲端存檔裡有這件道具」與「購買當下雲端存檔金幣夠」，小心慢慢改檔的人仍可能混過，要靠管理頁歷程追查。真正杜絕要把戰鬥、掉落搬到伺服器。
- **驗證**：本機 PostgreSQL 16（不在存檔／數量不足／價格錯被拒、重複上架、無存檔／金幣不足／已賣出／買自己的被拒、交貨與確認、下架、不能直接讀表、裝備複製標記、堆疊部分出售不誤判）。
  **真實伺服器** Playwright 兩台：上架稀有 +5 武士刀與 20 瓶治癒藥水（背包剩 10 瓶）、買家瀏覽與分類篩選、購買後扣 88,000、拿到的武士刀詞綴完全相同、
  賣家看「我的上架」入帳 83,600、下架取回藥水、再次入帳不重複；網路與 Console 無錯誤。測試存檔已刪除。


## 36.5 遊戲改名「黑暗大陸」與封面（2026-10-12，版本 `20261012r`）

- 遊戲名稱改為「黑暗大陸」：`config.js` 的 `GAME_TITLE`、`index.html` 的 `<title>`／`apple-mobile-web-app-title`、`manifest.json` 的 name／short_name、`pwa.js` 安裝提示、`gm.html` 標題。
  **資料夾、網址（`屠龍勇者/`）、localStorage key（`dragonSlayer_`）、雲端資料表都不變**，舊存檔照常讀取。四大龍全討伐的稱號「屠龍勇者」是遊戲內成就，保留。
- 標題畫面：使用者提供的封面（原圖 1342×2000）縮成 `images/cover.jpg`（1000×1490，260KB，`?v=1`，sw.js 預先快取），當 `#screen-title` 背景（`center top / cover`，下半漸層變黑），
  2026-10-12（版本 `20261012s`）換成使用者第二版封面（只有「黑暗大陸」標題字，`cover.jpg?v=2`）；App 圖示 `icon-192／512`、`apple-touch-icon`、`icon-maskable-512`（中間 80% 放圖、外圍黑）改用封面上半正方形（標題＋人物），`?v=2`。
  圖上已有「黑暗大陸／角色扮演遊戲」字樣，所以拿掉原本的 🐉、標題字與副標題（保留隱藏的 `<h1 class="sr-only">`）；按鈕、封測提示疊在下方，次要按鈕半透明。

- PC（橫向、寬 ≥ 700px）標題畫面：按鈕改成小顆橫排放在封面最下方（`@media (orientation: landscape) and (min-width: 700px)`），封測提示縮小，不擋封面（版本 `20261012t`）。

- 封面改用 `background-size: contain`（版本 `20261012u`，使用者回報 PC 上人物被裁掉）：任何螢幕比例都看得到整張封面，多出來的地方補黑；矮的直向手機（高 ≤ 780px）按鈕縮小。

## 37. 洗白（刪檔）與封測提示（2026-10-12，版本 `20261012i`；`config.js` 的 `WIPE`／`TEST_NOTICE`、`save.js` 開頭 `wipeCheck`、`tools/wipe.sql`）

- **目前狀態：洗白未啟動**（`WIPE = { id: '', at: 0 }`）；20261022u依使用者要求移除封測公告，`TEST_NOTICE = ''`，標題畫面`#test-notice`由既有showTitle隱藏。只移除公告，沒有啟動刪檔。
- **玩家裝置**：`save.js` 一載入就執行 `wipeCheck`——`WIPE.id` 不是空字串、且和這台裝置記的 `dragonSlayer_wipe` 不同時，刪掉所有 `dragonSlayer_` 開頭的 localStorage
  （保留 `dragonSlayer_auth*` 登入狀態與 `dragonSlayer_logOpen`；凡塵修仙傳的資料不動），再記下新 id，所以**每台裝置只洗一次**。有刪到角色時標題提示改成「已正式上線，測試期的角色已清除」。
- **雲端保險**：`cloudSync` 忽略 `client_t < WIPE.at` 的雲端存檔（忘了跑 wipe.sql 也不會把舊角色下載回來；新角色上傳時會覆蓋那個欄位）。
- **伺服器**：`tools/wipe.sql`（交易包起來，`truncate … restart identity restrict`）清掉雲端存檔、存檔紀錄、可疑紀錄、團隊副本、聊天、禁言、血盟、世界首領、交易所；
  **保留**帳號 auth.users、管理者 `dragon_admins`、封鎖 `dragon_bans`、帳號 Email 對照 `dragon_profiles`（清掉 last_name）。世界首領資料表清空後 `wb_current` 會自動開新的一隻。
- **上線那天的步驟**（執行前先跟使用者確認，清掉無法復原）：
  1. 使用者在 Supabase → SQL Editor 執行 `tools/wipe.sql`。
  2. `config.js`：`WIPE = { id: 'launch1', at: <現在的毫秒時間> }`、`TEST_NOTICE = ''`，換版本號、發佈。之後再測再洗：換新的 id（launch2…）與 at，再跑一次 wipe.sql。
- 驗證：本機 PostgreSQL 執行 wipe.sql 無錯誤、帳號數不變；Playwright 未啟動時角色保留＋顯示封測提示，啟動後角色清空、登入狀態與修仙資料保留、重新整理不會再洗第二次。
- **2026-10-22 全清範圍補齊（不改遊戲JS，仍20261022t）**：使用者明確要求鑽石與共用倉庫也全部清空。新增清除dragon_wallet／dragon_dia_log／dragon_vault／dragon_vault_items／dragon_vault_out、dragon_loot_jobs／dragon_loot_state、dragon_save_dev／dragon_deleted_chars／dragon_online，共24張玩家資料表。保留dragon_loot_config／catalog／rules及原本帳號／管理者／封鎖／profiles（last_name清空）；RESTRICT避免意外連帶刪除未列明的新相依表，有未納入外鍵則整筆失敗。掉寶功能狀態不變，不需重裝SQL。刪除錢包後現有dia_status於下次登入重建並發每日5鑽，同日不重複，並非保留測試餘額。
- **洗白執行條件**：先安排停機、關閉所有遊戲與備份資料庫，再由使用者執行SQL，同步設定新的WIPE.id／at與版本並發布後才恢復開放；單跑SQL不能阻擋仍運作的舊客戶端重新上傳角色。這次僅補程序，WIPE仍未啟動、未執行正式刪檔。`node tools/test-wipe.cjs`使用隔離PGlite驗證重跑、所有列明表清空、保留資料完整、舊待領／收據移除與每日鑽石行為。
- **正式缺表相容修正**：使用者執行時回報42P01（dragon_save_dev不存在）。wipe.sql改用固定24表清單配合to_regclass收集已安裝表，在同一次TRUNCATE RESTART IDENTITY RESTRICT處理，缺附加表以NOTICE顯示略過；核心dragon_saves不存在則拒絕，其他SQL錯誤不吞掉。test-wipe.cjs新增缺裝置／刪角／在線三表仍成功、清單外外鍵阻擋且整筆回滾測試。正式環境成功清除尚未確認。

## 38. 帳號共用倉庫、鑽石、離線掛機扣鑽石（2026-10-12，版本 `20261012j`；`vault.js`、`tools/vault.sql`（也併入 `supabase.sql` 最後一段））

- 使用者要求：倉庫 200 格、可放金幣、每次 100 金幣手續費、同帳號角色共用；離線掛機只有最後離線的那隻、要扣鑽石；鑽石來源＝每日登入＋打怪掉落＋首領／龍＋管理者發放；沒登入不能離線掛機。
- **資料表**（玩家不能直接讀寫，全部經過函式）：`dragon_wallet`（鑽石、每日／掉落計數、`off_at` 上次離線結算）、`dragon_dia_log`（鑽石增減紀錄）、
  `dragon_vault`（倉庫金幣）、`dragon_vault_items`（存入的道具，`taken_at` 取出後留 30 天給防複製用）、`dragon_vault_out`（取出待交貨，`got`）。
- 介面下方金幣旁顯示鑽石 `💎`（`renderStatus` 的 `#hud-stats .dia`；登入且讀到 `diaCount` 才顯示）。
- **鑽石**：`dia_status()` 回傳鑽石並發每日登入 +5（台北時間換日）；`dia_drop('mob'|'boss')` 一般怪 +1（每天最多 10）、首領／龍 +3（每天最多 15）——遊戲端擲骰（`diaRoll`，`onKill` 呼叫，一般怪 0.1%，`mon.boss`／`mon.dragon` 必給），離線模擬不掉；
  `dia_grant(user, n, reason)` 管理者發放／扣除（gm.html 玩家分頁「💎 發放」），`dia_admin_list()` 管理頁讀全部鑽石。目前鑽石 `diaCount` 顯示在共用倉庫頁。
- **（2026-10-12 版本 `20261012t` 起停用）** 離線掛機不再消耗鑽石，`offlineSettle` 改成讀自己的 `dragon_saves`（order by updated_at desc limit 1）判斷是不是最後的角色，伺服器函式保留不用。
- **離線掛機** `offline_claim(slot, away_ms)`：①這個欄位必須是帳號「最後上傳存檔」的那個（`dragon_saves.updated_at` 最新），否則 `not_last`；
  ②可結算時間＝min(離開時間, 12 小時, 上次結算到現在的真實時間, 鑽石×30 分鐘)；③扣 ceil(時間/30 分鐘) 顆（每小時 2 顆），記 `off_at`。不到 30 秒回 `too_short`／`no_diamond`。
  遊戲端 `offlineSettle`（`continueGame` 與主迴圈發現分頁被暫停時）：不在掛機狀態不結算也不扣；沒登入只提示；結算中 `offlineHold` 暫停主迴圈；報告多一行「消耗鑽石」。
- **共用倉庫**（倉庫 NPC →「📦 角色倉庫／🏦 帳號共用倉庫」切換，`storageMode`）：要在村莊、要登入。存取前先 `saveGame`＋`cloudFlush`，伺服器以雲端存檔為準：
  - `vault_put(slot, item|null, gold|null, name)`：道具要在該欄位雲端存檔背包裡（同 uid、數量夠）、存檔金幣 ≥ 100（存金幣時 ≥ 金額＋100）、未滿 200 格、同一件沒重複存；成功後遊戲才從背包拿走、扣手續費。
  - `vault_take(slot, id|null, gold|null)`：存檔金幣 ≥ 100；道具標 `taken_at`、金幣扣掉，寫進 `dragon_vault_out`。`vaultDeliver` 讀 `vault_pending(slot)` 交貨（道具用 `marketGiveItem` 保留詞綴、拿新 uid），
    扣 100 手續費、`player.vaultGot` 記已入帳編號 → 存檔上傳後 `vault_ack`。進入角色時也會補交貨。
  - 防複製 trigger `dragon_vault_audit`：存入超過 1 分鐘的裝備（有 ench）又出現在原欄位存檔的背包／角色倉庫／身上 → `dragon_flags` `vault_dupe`（管理頁「共用倉庫疑似複製道具」）。
  - **⚠️ 2026-10-23 起改用 v2（第 93 節）**：上面的 vault_put／vault_take 只檢查不扣除，可複製道具／金幣，已停用；存取改為 vault_put2／vault_take2。
- **驗證**：本機 PostgreSQL（每日只送一次、掉落上限、非最後角色被拒、重複結算 too_short、存入不在存檔／重複／金幣不足被拒、取出不夠手續費被拒、交貨與確認、非管理者不能發放、不能直接讀表、裝備複製標記）；
  Playwright 以假伺服器測：沒登入無離線收益、登入離開 2 小時扣 4 顆、非最後角色提示、首領 +3、存入道具扣 100、存金幣 1000 扣 1100、取回道具扣 100 且強化值保留、取金幣 600 實得 500；Console 無錯誤。

## 39. 村莊看得到其他在線玩家（2026-10-12，版本 `20261012q`；`presence.js`）

- **2026-10-16 已關閉**（版本 `20261016h`，使用者要求）：`presence.js` 頂端 `PRES_ON = false`，`presEnabled()` 一律 false → 不連 Realtime、村莊看不到別人、不能點人邀請（組隊改用房號）。
  原因：這是全遊戲**唯一**用到 Supabase Realtime 的功能；免費方案即時訊息每月 200 萬則，計費是「送出 1＋每個收到的人各 1」，
  走路時每 0.35 秒送一次位置，同村 5 人走動約每小時 6 萬則、13 人約每小時 36 萬則（也碰到每秒 100 則上限），幾小時就用完月額度。
  其他連線功能（雲端存檔、聊天輪詢、交易所、副本、血盟、排行榜、世界首領）都是一般 API 請求，不受影響。程式保留，改回 `true` 即恢復；
  之後若要恢復，建議改成「點地圖只送一次目的地、各客戶端自己算路線」，用量可降到 1/10 以下。
- 使用者要求：村莊（低語港等）看得到其他在線玩家、頭上有名字，可以點人聊天、邀請組隊；**野外看不到別人**。
- **Supabase Realtime**（不用資料表、不用 SQL）：每個村莊一個頻道 `dragon-town:<村莊id>`，presence key＝`帳號id:欄位`。
  自己的狀態 `{ n 名字, c 職業, l 等級, x, y 格子, d 方向, cl 血盟名 }` 用 `track` 廣播，位置變了最多每 0.35 秒更新一次（`presTick`，`renderStatus` 每 250ms 呼叫）。
  要登入、沒被封鎖、在村莊才加入；離開村莊、換村莊、登出就 `untrack`＋`removeChannel`。同帳號的其他欄位不顯示。最多畫 40 人（`PRES_MAX`）。
- **顯示**：`presSync` 把 presenceState 轉成 `presOthers`（保留插值位置 rx／ry），`presUpdate` 每幀平滑移動（村莊才跑），`presDraw` 用該職業的走路圖（移動時播走路格）、綠色名牌「名字 Lv.N［血盟］」，和 NPC、自己一起依 y 排序畫。
- **點人**（`sceneClick` 先判 NPC 名牌，再 `presHit` 0.9 格內最近的玩家）→ `presMenu`：
  - 💬 聊天：切到世界頻道，輸入框帶「@名字 」（`chatDraft`）。
  - 👥 邀請組隊：自己要先在團隊副本建立／加入隊伍（房間 open）；用 broadcast `invite` 送 `{ to, from, room, code, raid }`，對方確認後 `raidJoin(room)` 並切到團隊副本頁。
- **驗證**：沙盒的網路代理不支援 WebSocket，無法連真正的 Realtime；改用 Node 轉送的假 Realtime（`/tmp/claude-0/t/fakert.js` 模擬 presence／broadcast）兩個瀏覽器互測：互相看得到、移動同步、點人選單、聊天帶 @名字、組隊邀請→加入、離開村莊後消失；Console 無錯誤。
  若正式站看不到別人：到 Supabase → Realtime → Settings 確認「Allow public access」有開。


## 40. 天堂式技能：魔法 1～10 級、魔法書、技能欄（2026-10-15，版本 `20261015d`；`skills.js`、`spellbook.js`）

- 使用者要求：移植天堂 1 的技能設定——共用魔法分 1～10 級＋各職業技能；**用魔法書學**；技能**放進面板欄位（下拉選單）才會自動施放**；被動技能學會就生效。
- **共用魔法 `MAGIC`**（34 招，`tier` 1～10）：光箭、初級治癒術、保護罩、神聖武器／冰箭、風刃、鎧甲護持、冥想術／中級治癒術、火焰箭、極光雷電、敏捷術／
  火球術、加速術、吸血鬼之吻、力量術／極道落雷、寒冰氣息、狂暴術／高級治癒術、烈炎術、冰矛、體魄強健術／冰雪暴、龍捲風、魔法屏障／
  全部治癒術、雷電風暴、聖結界／流星雨、究極光裂術、絕對屏障／煉獄、黑闇之星。id 沿用舊版（`energyBolt`、`heal1～3`、`haste`、`meteor`…），舊存檔的冷卻、增益照常。
- **`MAGIC_CLASS`**：各職業最高魔法等級與每級需要的角色等級——法師 10、天使 8、妖精／魔鬥士／聖騎士 6、惡魔 4、王族／黑妖 3、槍手 2、騎士／修羅／戰士 1。
  法師原本的攻擊魔法全部移到共用魔法，職業技能只剩被動（魔力集中、魔力精通）；其他職業原本的治癒術、鎧甲護持也移到共用魔法，職業技能（`SKILLS`）不變。
  `SKILL_BY_ID` 索引全部技能（`kind` 'magic'／'class'）；`skillNeedLv(s, cls)` 這個職業學這招要幾級（學不了 0）；`classSkillList(cls)` 魔法在前、職業技能在後。
- **魔法書**（`spellbook.js`）：每招一本 `book_技能id`（cat `book`，可堆疊、重量 1、可交易）。書名：魔法＝「N級魔法書（名稱）」，職業技能＝妖精「精靈水晶」、黑妖「黑暗精靈水晶」、其他「技能書」（職業限定 `classes`）。
  - 商店（2026-10-18，版本 `20261018f` 使用者改）：魔法只賣 **1～3 級**（`MAGIC_SHOP_MAX_TIER`；村莊等級 1：1～2 級、2：3 級，價格 100／300／900）；
    職業技能**每個職業只賣第 1 本**（Lv.1 自動學會的不算，取學習等級最低那本：王族精準目標、騎士猛擊、法師魔力集中、妖精精靈之箭、黑妖背刺、修羅爆裂掌、戰士重擊、槍手快速射擊、魔鬥士魔刃、聖騎士聖光打擊、天使神聖護盾、惡魔暗影斬；價格 lv²×4＋200）。
    其餘 120 本（魔法 4～10 級、職業技能第 2 本以後）沒有 `price`，自動進入 `rollBookDrop` 的掉落池、回收價 `sell`（魔法 級數×3000、職業 lv×400）。**只列自己職業學得會的書**（`shopItemIds`）。
    同一天商店也移除「對武器施法的卷軸」「對盔甲施法的卷軸」（`items.js` 拿掉 `price`／`tier`，改 `sell` 2400／1200＝原本回收價），只靠 `COMMON_DROPS` 掉落（Lv.8 以上地圖：盔甲 0.4%、武器 0.2%）。
    掉落池大小（怪物等級 +5 以內可掉的書）：Lv.15 怪 16 本、Lv.30 怪 43 本、Lv.60 怪 95 本、Lv.80 怪 120 本；一般怪 0.3%、首領 25% 掉一本，任何職業的書都會掉。使用者確認維持這個掉落率（指定一本書從一般怪很難拿到，是刻意的）。
  - 掉落（`rollBookDrop`，`rollDrops` 呼叫）：商店沒賣的高級書，一般怪 0.3%、首領 25%，挑最低學習等級 ≤ 怪物等級 +5 的，任何職業的書都會掉（可賣、可交易）。
  - 學習：背包點書「📖 學習」或技能頁「📖 學習」（`learnBook`）——要職業學得會、等級夠、還沒學過（`bookLearnError` 說明原因）；主動技能自動放進第一個空的技能欄。
  - 升級時提示「可以學習 X 了（需要 Y）」，不再自動學會。創角時 Lv.1 可學的直接學會（法師／天使的 1 級魔法、惡魔的血之渴望）。
- **技能欄**（`player.settings.skillSlots`，8 格，`SKILL_SLOTS`）：技能頁上方 8 個下拉選單（分「魔法／職業技能」兩組），同一招放到別格時從原欄位移過去；「↺ 自動排好」＝`defaultSkillSlots`。
  `slotSkills()` 是欄位裡已學會的主動技能；`playerAction`、團隊副本補血（`raidAllyHeal`）只用它，**欄位順序＝優先順序**（治癒／增益／攻擊各自取第一個可用的）。
  地圖上的快捷列就是這 8 格（鍵盤 1～8）。舊的「自動：開／關」（`settings.skills`）不再使用。
  - **快捷列外觀**（2026-10-15，版本 `20261015e`，使用者附圖）：地圖下方置中一排 8 格，金框深底（`.sk-row`，左右菱形裝飾），每格＝方形圖示（`.sk`）＋技能名（`.sk-name`）＋按鍵圓鈕（`.sk-key`）；
    方格左上 MP（藍字）、右上原本冷卻秒數、冷卻中下方黑條顯示剩餘秒數＋conic 遮罩，MP 不足變灰，空格顯示空框（全空則整列不顯示）。
    還沒有技能圖檔：`skillIcon(k)`（ui-panels.js）依 `SKILL_ICON_RULES` 比對名稱／說明的關鍵字（火、冰、雷、風、暗、光、護盾、箭、斬…）挑 emoji 與底色 class（fire／ice／bolt／wind／dark／holy／heal／guard／arcane／phys）。
    格子大小用 container query：`.scene-wrap` 設 `container-type: inline-size`，`--cell = min(40px, (100cqw − 34px) / 8)`（手機 375 寬約 33px）；PC 外框 `--cell = min(--s×84px, …)`（1280 寬 54px），位置在地點文字 `#hud-bottom` 上方（`bottom: --s×100px`）。
  - `defaultSkillSlots`：最強的治癒 → 增益 3 個（職業增益優先，魔法增益依 `MAGIC_BUFF_PREF`：加速術、魔法屏障…）→ 職業攻擊技能（範圍／分散、等級高優先）→ 攻擊魔法（只給 4 級以上魔法的施法職業）→ 剩下的增益補空格。
- **舊存檔轉換**（`migrateSave`）：沒有 `player.skills` → 依舊規則把這個職業等級已到的全部學會，技能欄用 `defaultSkillSlots`（舊設定關掉的技能不放）。存檔 schema 不變。
- 介面：技能頁依「一級魔法…N 級魔法＋職業技能」分區，每招顯示類型、MP、冷卻、說明，沒學的顯示書名與取得方式（商店／掉落、背包裡有沒有）；商店、背包、圖鑑多「📖 魔法書」分類。
- 驗證：12 職業的可學數量（騎士 15～天使 38 招）、新角色起始技能、舊存檔轉換（Lv.30～60 的技能欄）、買書學習、等級不夠被擋、下拉換欄位、只放冰箭時戰鬥只用冰箭（低血也不治癒）；
  舊存檔轉換後 Lv.35 各職業 5 分鐘擊殺 15～29 隻，與改版前相近。Console 無錯誤。
- **技能公共冷卻 3 秒**（2026-10-17，版本 `20261017e`，使用者要求「施放技能後要再放下一個 cd 時間 3 秒」）：`combat.js` 的 `SKILL_GCD_MS`、`skillGcdLeft()`；
  `useSkillCost` 每次施放（治癒、增益、攻擊魔法、物理技能，自動或手動）都設 `player.cds._gcd = gameNow + 3000`。期間 `playerAction` 不挑任何技能、只普攻（共鳴裝備技能、藥水不受影響），
  `manualCast` 回「技能冷卻中（N 秒後才能放下一個技能）」，團隊副本補隊友 `raidAllyHeal` 也擋；快捷欄技能格顯示自己冷卻與公共冷卻較長的那個倒數。
  技能只在普攻計時到時才判斷，所以實際間隔約 3 秒＋一次攻擊間隔（Lv.80 騎士實測每 3.6 秒一招，中間照常普攻）。`_gcd` 會被 `clockSanity` 夾在 180 秒內，不影響。
  治癒魔法也受限（使用者確認「治癒也一樣受 3 秒限制」），危急時連續補血會變慢，藥水不受影響。
  **修正（版本 `20261017g`）**：使用者回報「技能異常，一直在 3 秒倒數」。原因是共鳴裝備技能（`castResonance` 把效果包成 `res_…` 技能交給 `castSpell`／`doStrike`／`castHeal`／`castBuff`）也走 `useSkillCost`，
  共鳴武器（例如 proc 型）每次觸發都把 `_gcd` 重設成 3 秒 → 公共冷卻永遠不會結束、玩家技能放不出來、快捷欄一直顯示 3 秒。改成 `res_` 開頭的不設 `_gcd`。
  驗證：Lv.60 騎士裝 proc 型共鳴武器（tsurugi）掛機 40 秒，共鳴觸發 3 次，玩家技能 12 次、間隔 3～3.6 秒。
  **增益瞬發＋傷害技能補冷卻**（2026-10-18，版本 `20261018a`，使用者要求）：
  - 增益技能（`type: 'buff'`）**不受**公共冷卻、也**不觸發**公共冷卻（`useSkillCost` 跳過、`manualCast` 不擋、快捷欄增益格不顯示公共冷卻倒數）；
    `playerAction` 裡效果結束的增益直接補上、**不佔這一次出手**（同一下接著放攻擊技能或普攻），自動施放仍然只在效果結束（`buffActive` 為 false）時才再放。治癒仍受公共冷卻。
  - 檢查全部 75 招傷害技能（spell／strike），14 招原本沒有冷卻，補上 `cd`（秒）：光箭 3、冰箭 3、風刃 3、火焰箭 4、極光雷電 4、火球術 4、吸血鬼之吻 5、極道落雷 5、烈炎術 6、冰矛 6、冰雪暴 8、流星雨 10（以上共用魔法）、
    天使聖光彈 3、審判之光 6。其餘職業技能原本都有冷卻（4～15 秒）。法師／天使的攻擊魔法因此不能再每次出手都放同一招，會輪流用欄位裡冷卻好的，都在冷卻就普攻。
  - 驗證：法師 Lv.60、騎士 Lv.60、天使 Lv.45 各掛機 60 秒，沒有任何技能在自己的冷卻內重放；增益在第一次出手時一起放完、同一下也有攻擊、沒有觸發公共冷卻；公共冷卻中手動放增益成功、手動放攻擊技能被擋；Console 無錯誤。
- **公共冷卻改 1 秒、增益也算＋每種技能各自 CD**（2026-10-24，`20261024ac`，使用者要求「技能不能好幾種一起瞬發」）：`SKILL_GCD_MS` 3000 → 1000；
  `useSkillCost` 對所有技能（治癒、增益、攻擊魔法、物理技能；共鳴 `res_` 除外）都設公共冷卻，`manualCast` 增益也擋，`playerAction` 增益一次只補一個（不佔這次出手，接著普攻）。
  各自冷卻 `skillCd(k)`＝技能資料的 `cd`，沒寫的治癒預設 4 秒、增益 10 秒（`SKILL_DEFAULT_CD`）；快捷欄、技能說明、魔法書、`clockSanity` 都改用 `skillCd`。上面「增益不受公共冷卻」的規則已取代。
  驗證：騎士三個自動增益依序在 0／1／2 秒各放一個；手動放增益後 1 秒內放別的回「技能冷卻中」、同一個回「冷卻中（10 秒）」、1.1 秒後可放下一個。
- 之後可做：攻速問題（使用者 10-15 暫緩：技能攻速和勇水疊加太快）、天堂的「魔法 1～10 級各職業一覽表」畫面、技能動畫。

### 40.1 快捷欄：技能＋道具、往下拉切換自動（2026-10-15，版本 `20261015h`；`hotbar.js`）

- 使用者要求（先做樣品確認後才改）：手機技能欄下面再加一排；PC 把欄位搬到底部骷髏頭左右、左右各 8 格；上排原本藥水卷軸的格子也改成新格子；
  **每格都能自由放技能或道具**；格子「往下拉」才啟動自動使用，讓玩家更有手動玩的感覺。
- 資料 `player.settings.bar`（22 格，2026-10-24 起 24 格 `{ id, a }`，取代 `skillSlots`；`BAR_N`、`BAR_KEYS` 在 player.js）：0～7 第一排、8～15 第二排、16～21 PC 上排 6 格（手機不顯示，但自動照樣生效）。
  可放：技能（`SKILL_BY_ID`）、道具 `barItemOk`＝有 `heal`／`buff` 的藥水＋回家卷軸＋瞬移卷軸。`barCanAuto`：被動技能、回家卷軸不能自動（自動回家仍在設定頁 `autoHome`）。
- 操作：**點一下**＝手動使用（`barUse`：技能 `manualCast`、治癒藥水這格用完改喝其他治癒藥水、回家 `homeScrollBtn`、瞬移 `quickTele`、其他 `quickPotion`）；
  **按住往下拉 16px 以上再放開**＝切換自動（`barToggleAuto`，暖黃光外框）；**點空格／長按 550ms／右鍵**＝選放什麼（`openBarPicker` 對話框，可清空）；
  同一招技能只放一格（放到別格會搬過去並保留自動開關）。鍵盤 1～8、Q E R F Z X C V（W A S D 是移動鍵，所以第二排沒照樣品用 Q～I）。
- 自動規則：`slotSkills()` 只取 `a=1` 的已學會主動技能（格子順序＝優先順序，`playerAction` 不變）；`autoSupport` 改看 `barAutoItemIds()`：
  治癒藥水任一格開自動＝HP 低於 `potionPct` 時從身上所有治癒藥水挑（`choosePotion`，跟以前一樣，不限那一格的藥水）；增益藥水效果沒了就喝（加速看 `st.haste`）；瞬移卷軸開自動＝HP 低於 `telePct` 瞬移。
  設定頁拿掉「自動喝治癒藥水／綠水／勇水／藍水」「自動瞬移」勾選（只留百分比，並說明改在快捷欄下拉）；`checkAutoHome` 的「藥水用完」改看 `barHealAuto()`。團隊副本用 `settings.noTele` 強制不瞬移。
- 預設 `defaultBar`：第一排＝`defaultSkillSlots`（自動）；第二排＝治癒藥水、綠水、勇水類（`braveItemFor`）、藍水、回家、瞬移（自動與否照舊設定 `potionOn`／`autoHaste`／`autoBrave`／`autoBlue`／`teleOn`），最後 2 格空；PC 上排＝同樣 6 種（手動）。
  舊存檔（沒有 `bar`）在 `migrateSave` 用舊 `skillSlots`＋舊自動補給設定轉換，`normalizeBar` 補滿 22 格（現在 24 格）、清掉不存在的 id。學魔法書時放進第一排第一個空格並開自動。
- 畫面：手機＝地圖下方兩排金框（`.sk-row`，格子大小 `--cell` 依地圖寬度，375 寬約 35px），格子下方顯示名稱、不顯示鍵盤字；村莊裡不顯示；回家卷軸／步行回村按鈕浮在兩排上方。
  PC＝`#hotbar` 疊在外框（底部石條左右各 8 格＋上排 6 格，`barPcPos`），格子左下顯示鍵盤字。技能格：左上 MP、右上冷卻秒數、冷卻中底部黑條；道具格：右上數量，沒有了變灰。
- 技能頁：上方改成快捷欄說明＋「↺ 第一排技能自動排好」；每招顯示「第 N 格・自動／手動」或「放進快捷欄」按鈕（`barPlaceSkill`，放進前兩排第一個空格並開自動）。
- **手機修正（2026-10-15，版本 `20261015i`）**：使用者回報手機「空格不能決定要放什麼、放進去後不能刪」。原因：手指放開（pointerup）就打開選單，
  瀏覽器接著補發的 click 落在選單裡手指下的選項，等於還沒選就被放進去；刪除只能長按，手機上不好找。修正：
  - `openBarPickerSafe`：打開選單後 0.6 秒內，對話框上的 click 一律忽略（document 捕獲階段攔下）；長按、右鍵、點空格都走這個。
  - **編輯模式**（`barEditMode`／`toggleBarEdit`）：手機狩獵畫面多一顆「✎ 編輯快捷欄」（`huntButtonsHtml`），開啟後快捷欄金色虛線框閃爍、點任何格子＝打開選單（換掉／清空），按「✔ 完成」結束。PC 仍用右鍵或長按。
  - 選單上方顯示「目前：XXX（自動／手動）」與清空說明（`.hb-now`）。
- **不顯示 AUTO 字樣**（2026-10-18，使用者要求）：`20261018b` 先拿掉技能格的，`20261018c` 道具格也拿掉——開自動一律只顯示綠色跑馬燈框（`.hb.auto`），`.hb-auto` 元素與 CSS 已刪除；說明文字（選單、技能頁、設定頁）同步改成「綠色跑馬燈框」。
  **暖黃光框**（版本 `20261018d`，使用者要求「綠色跑馬燈框改成暖黃光」）：`.hb.auto::after` 改成固定的暖黃邊框（#ffcf66）＋柔和外發光（#ffb43c），不再旋轉（刪掉 `hb-spin`／`--hb-a`）；往下拉提示「▼ 自動」也改暖黃色；說明文字改「暖黃光框」。
- 驗證：舊存檔轉換（黑妖 Lv.47，舊設定藍水、瞬移開、勇水關 → 對應格子自動）、新角色預設、手機下拉切換勇水自動、點空格選冰箭（手動格不會自動施放）、60 秒戰鬥模擬自動喝綠水／勇水／藍水／治癒藥水、鍵盤 C、PC 點上排治癒藥水；Console 無錯誤。

## 41. 技能／道具／狀態圖示（2026-10-15，版本 `20261015m`；`icons.js`）

- 使用者給天堂 M 的技能／增益圖示當參考（官方美術、有 INVEN 浮水印，**不能直接用**），要求「找出適合的設計成技能圖示」、地圖左上角狀態不要文字改用圖片。
  先做樣品（A 款線條、B 款發光填色），使用者選 **B 款**並要求「重複的圖示再分開」；勇水／綠水／藍水依使用者附的圓肚玻璃瓶參考圖另外畫。全部是原創 SVG，沒有外部圖檔。
- `iconSvg(sym, col, frame)`：64×64，金屬斜面外框（`frame` 給 `skill` 藍／`item` 金／`res` 紫／`bad` 紅時是亮色外框，給增益狀態用）、深色底＋屬性色光暈與放射光、
  符號三層（模糊粗光管、半透明填色、白色核心細線）、7 個光點、暗角。id 依內容固定並快取（`iconCache`），同一張圖字串相同，畫面每 250ms 重畫不會一直換 DOM。
  符號 `ICON_SYM` 41 種（火、冰、雷、風、龍捲、骷髏、暗影、太陽、星、治癒、葉、盾、屏障、反擊、加速、劍、雙劍、靶心、箭、隕石、毒刃、血滴、眼、暈眩、魔法陣、王冠、力量、心、蓮花、爆裂、爪、月、翼、漩渦、矛、斧、鎖鏈、手、藥瓶、卷軸、傳送門）；
  顏色 `ICON_COLOR`（fire 橘、ice 藍、bolt 紫、wind 青綠、dark 紫紅、holy 金、heal 綠、guard 藍、phys 橙、poison 黃綠、blood 紅、arcane 靛、gray 米白）。
- **技能自動配圖**（`skillIconCandidates` → `buildSkillIconMap`，第一次用到時算）：屬性色＝名稱第一個符合 `SKILL_ICON_RULES` 的規則（沒有看說明、再看類型）；
  候選順序＝名稱符合的符號 → 同屬性備用 `ELEMENT_ALTS` → 說明符合的符號 → 類型備用 `SKILL_ICON_POOL` → 全部符號，**全部用同一個屬性色**。
  不重複：共用魔法 34 招彼此「符號＋顏色」不重複；同職業的職業技能彼此「符號」不重複、跟共用魔法「符號＋顏色」不重複；兩輪分配（先讓每招拿第一志願）。驗證：13 組（共用魔法＋12 職業）重複數都是 0。
  想指定某招的圖：在 `buildSkillIconMap` 前面加覆寫表即可（目前沒有）。
- **藥水瓶**（2026-10-15 版本 `20261015n` 改用使用者提供的圖）：`images/icons/potion-*.jpg`（128×128，由使用者的 4 瓶並排圖裁切），勇敢藥水＝粉紅、藍色藥水＝深藍、慎重藥水＝紫、自我加速藥水＝淺藍那瓶把藍色像素換成綠色（G、B 對調）。
  `imgIconHtml(file, frame)` 畫圖片圖示：外框是 CSS 漸層（`.ico-img`，顏色同 `ICON_FRAMES`），換圖時把 `ICON_IMG_VER` 加一。`flaskSvg(kind)` 現在只是轉呼叫它。
  其他道具 `ITEM_ICON`：治癒藥水類＝藥瓶符號（紅／橙／白／金）、精靈餅乾＝葉、回家卷軸＝卷軸、瞬移卷軸＝傳送門。
- **技能圖片**（2026-10-15，版本 `20261015o`）：使用者提供兩張 Gemini 生成的技能圖示大圖（3584×1184，放在 `tools/icon-src/`），用 `tools/cut-icons.ps1` 裁成 128×128
  （第一張 18 欄×6 列，格線不規則所以用固定格距 `-FixCols 18 -FixX0 16 -FixPitch 198.5 -FixW 178`；第二張 20 欄×7 列自動偵測）。檔名＝`a`／`b`＋列兩碼＋欄兩碼。
  **146 招全部人工挑圖、全遊戲每招一張不重複**（2026-10-15 `20261015p` 加第三張 6×6 繪畫風大圖 `c` 系列補齊：每格下方有文字，只裁上方 278×278 圖片區），146 張放 `images/icons/sk/`，對照表 `SKILL_IMG`（技能 id → 檔名）在 `icons.js`；`skillIconHtml` 有圖就用圖（`imgIconHtml`），沒有才用 SVG 自動配圖。
  規則：每招一張圖、同職業內長得太像的也換掉；Lv／EXP／愛心／天鵝／城堡、帶字母（C、H、K、E、I）的圖不用。
  要換某招的圖：改 `SKILL_IMG` 的檔名（`tools/cut-icons.ps1` 重新裁出全部候選，再複製到 `images/icons/sk/`），換同檔名的圖要把 `ICON_IMG_VER` 加一。- **共鳴裝備圖示**（`20261015q`，使用者回報左上角 3 個一樣的紫色星星）：54 件共鳴裝備（`RESONANCE`）各配一張還沒用過的圖，對照表 `RES_IMG`（裝備 id → 檔名，同樣放 `images/icons/sk/`，共 200 張），
  不跟技能圖重複。共鳴觸發的增益（`player.buffs['res_裝備id']`，`findResonanceSkill` 回傳 id `res_…`）`skillIconHtml` 也用這張圖；
  **裝備還穿著時增益不另外多一格**，改在那件裝備的狀態圖示上發光（`.bf.on`）並顯示剩餘秒數，免得同一張圖出現兩次。- 用在：快捷欄格子（`barSlotHtml`，`.hb-face.svg` 整格由 SVG 畫）、選放對話框、技能頁每招前面（`.sk-ico`，沒學會變灰）。
- **地圖左上角狀態**（`buffIconsHtml`）：每個增益一個圖示，下方剩餘時間（≥60 秒「分:秒」，否則「N秒」）。`20261022q`改為技能→道具→臨時三區，技能／共鳴藍底、藥水／卷軸黃底、負面紅底；原始持續≤30秒歸臨時，不依剩餘時間搬動，細節第90節。共鳴保留冷卻／就緒／充能／機率，生效時去重並發光。點一下顯示名稱／說明（`buffTip`），滑鼠有title；更新沿用`setHtmlStable`。
  **頂端一整排、不換行**：q版保留單排，以標籤與分隔辨識三區，`overflow-x:auto`可橫滑查看後段，取代右側隱藏；`.buffs.scene-buffs`優先於通用`.buffs`的wrap。剩10秒內圖示閃爍／暖色秒數，分類底色不變；減少動態設定不閃爍。

## 42. 人物狀態「角色裝備」視窗（2026-10-16，版本 `20261016g`；`ui-panels.js` 的 `renderChar`、`index.html` 的 `.cv` 規則）

- 使用者給了一張手遊「角色裝備」介面參考圖，請 Claude 和 Gemini 各做一份靜態樣本並排比較（`.claude/gemini/char-claude.html`／`char-gemini.html`／`compare.html`，不進 git），使用者選了 **A：Claude 版**。
- 版面：金邊暗色視窗＋標題「角色裝備」，三塊：
  - **左**：角色名、該職業去背全身像 `images/classes/hero/職業.webp`（載入失敗就改用 `c.art`）、腳下發藍光的魔法陣（CSS 動畫 `cv-glow`），底部「等級／職業／經驗 %」（遊戲沒有戰力數值，所以用經驗 % 代替）。
  - **中**：12 格裝備（`SLOT_KEYS` 順序、兩欄），`charGearHtml`：圖示框的邊框顏色＝品質（`q-magic`／`q-rare`／`q-legend`，普通米白），共鳴裝備用 `RES_IMG` 的圖片，其他用部位 emoji `CHAR_SLOT_EMOJI`；
    左下角是強化值，右邊是部位、裝備本名（完整名稱「傳說・血月 …」放在 `title`）、`charGearBrief` 列兩項重點屬性。點擊開 `openItemDialog`；空格是虛線框加「未裝備」。
  - **右**：人物屬性（傷害加成、防禦、HP、MP、命中、爆擊、閃避、MR、攻擊間隔、負重），兩顆按鈕：「詳細屬性」`charDetailDialog`（全部戰鬥數值＋經驗）、「冒險紀錄」`charRecordDialog`（擊殺、死亡、永夜之塔、四大龍、稱號）。
- 視窗下方保留原本的「能力值」面板（配點 ＋ 按鈕、萬能藥）。原本的「戰鬥數值」「裝備」「冒險紀錄」面板與職業橫幅圖已移除（內容搬進視窗與兩個對話框）。
- **一律左中右三欄**（`20261016i`／`j`，使用者回報「跟樣本不一樣、不是三欄並排」，原本窄畫面是上下排）。`.cv` 是 `container-type: inline-size`：
  - 容器寬 ≥ 700px：三欄 34%／中間／30%，裝備兩欄、圖示 46px。PC 16:9 時 `renderPanel` 給 `#overlay` 加 `.wide`（只有人物狀態），視窗放大到整個地圖範圍（約 900px）→ 這一版。
  - 容器寬 < 700px（手機直拿約 313px）：**緊湊三欄** 27%／中間／33%（`@container (max-width: 699px)`）：裝備改一欄、圖示 32px、字 9～12px；
    屬性每列「名稱在上、數值靠右在下」；兩顆按鈕上下排；立繪照欄高放大（`height: 88%`、`position: absolute` 置中），左右超出欄位的部分裁掉。

## 43. 多視窗：開新分頁不關掉上一頁（2026-10-16，版本 `20261016l`；`ui-panels.js` 開頭、`index.html` 的 `.pane` 規則）

- 使用者要求：功能頁（人物、背包、技能…）打開新的不要自動關閉上一個；電腦、手機都要；擺法選「並排視窗」。
- **狀態**：`openTabs`＝開著的分頁（不含狩獵），最新的在最後；`currentTab`＝最後開的那個（沒有就是 `'hunt'`，`syncCurrentTab`）。上限 `maxOpenTabs()`：PC 16:9 3 個、其他 2 個，超過才把**最舊的**關掉。
  - `switchTab(tab)`：打開（已開著就移到最後）；`switchTab('hunt')`＝全部關掉回地圖（傳送到狩獵地點、步行回村按鈕也是）。`closeTab(tab)`：只關一個（視窗右上「✖ 關閉」、再按一次底部格子）。
  - **判斷某分頁開著一律用 `tabOpen(tab)`**（`tabOpen('hunt')`＝沒有任何分頁），不要再用 `currentTab === tab`；已改：抽屜／底部格子的亮起、聊天輪詢、交易所、血盟、排行榜、世界首領、團隊副本、倉庫、技能頁重畫、NPC 對話框。
  - 村莊頁關掉時清 `townNpcNow`。切換畫面尺寸從 PC 回單欄、`enterGame` 時清空 `openTabs`。
- **畫法** `renderPanes(box)`：每個分頁一個 `<div class="pane" data-tab>`，重畫時沿用原本的元素只換內容（捲動位置不會跳回頂端），標題列 `.panel-head` 在視窗裡 sticky 置頂；兩個以上時最後開的那個金框（`.focus`）。
  - PC：`#overlay` 變成透明 flex 容器（`data-n` 決定往左延伸多少），`.pane` 各自有底色、邊框、捲軸；中間地圖照常即時運作。
  - 手機：沒有分頁時 `#panel` 畫狩獵地圖；有分頁時 `#panel.multi` 變成上下排的 flex 容器，2 個時各佔一半、各自捲動；只剩 1 個時按鈕是「✖ 返回狩獵」。
- 驗證：PC 開人物→背包→技能三個並排、第四個關掉最舊的、關中間一個、再按底部格子關掉；重畫後捲動位置保留；手機 2 個上下排、第三個擠掉最舊的、全部關掉回到地圖；Console 無錯誤。
## 44. 音效（2026-10-17，版本 `20261017b`；`sfx.js`、`sounds/`）

- 音檔：`sounds/*.mp3` 23 個。戰鬥 10 個來自 Freesound（CC0），介面 13 個來自 Mixkit（Envato 旗下免費站，免費商用、免標註、不能單獨轉售音檔）；都是網站的試聽 MP3（檔案小），來源與建議用途見 `sounds/CREDITS.md`。
  Envato Elements 本身要訂閱才能下載（使用者帳號沒訂閱），它每月的免費檔案裡沒有音效，所以改用 Mixkit。
- `sfx.js` 用 Web Audio：第一次 `pointerdown`／`keydown` 才建立 `AudioContext`（手機規定使用者操作後才能出聲）並預先下載開啟類別的音檔；SW 的 assets 快取會自動存起來。
- `sfx(name, soft)` 不播的情況：`SIM_MODE`（離線收益模擬、團戰模擬）、`document.hidden`（背景）、該類別關閉、音量 0、還沒解鎖。
  每個音效最短間隔 `gap`（預設 70ms，受傷 250、升級 1500…）、同時最多 8 聲；`soft`＝前 150ms 已有其他音效就不播（對話框）。`off`／`dur` 只播一段並淡出（`mon-die` 原檔有 3 聲，只播第一聲；施法、增益截短）。
- 掛點（都是一行 `sfx(…)`）：
  - `combat.js`：普攻／物理技能命中 `sfxHit`（爆擊 `crit`、遠程 `hit-pierce`、近戰隨機 4 種斬擊／鈍擊）、閃避 `block`、受傷 `hurt`、攻擊魔法 `magic-cast`（名字有冰／雪／霜／凍用 `magic-ice`）、治癒與增益 `buff`、擊倒 `mon-die`、掉落（稀有或有品質 `treasure`，其他 `loot-gold`）、死亡 `player-die`。
  - `player.js` 升級 `levelup`；`quests.js` 完成任務、討伐任務首領 `quest-done`；`town.js` 買賣 `coin`、鍛造成功 `treasure`；`enchant.js` 衝裝蒸發 `player-die`、`ui-panels.js` 衝裝成功 `treasure`。
  - 介面：`switchTab` 開新分頁 `ui-open`、回狩獵／`closeTab` `ui-back`、`openDialog` `notify`（soft）、`showToast` 訊息含「⚠️／不足／不能／無法／失敗／找不到／不夠／已滿」播 `ui-error`；
    其他按鈕（`button`、`[onclick]`）點擊由 document 的 click 監聽播 `ui-click`，同一下已經播過介面音效就不重複。
- 設定 →「🔊 音效」（放在畫面尺寸下面）：戰鬥音效、介面音效兩個開關＋音量滑桿（放開時試播升級音效）。這台裝置的設定（`dragonSlayer_sfx`），不進存檔、不需要改 `SAVE_SCHEMA`。
- 驗證：本機 Lv.80 測試角色掛機 12 秒，命中／爆擊／受傷／開關視窗都有實際播放（攔 `AudioBufferSourceNode.start` 計數）；關掉戰鬥音效後 `crit` 不播、`levelup` 照播；`SIM_MODE` 時不播；Console 無錯誤。
### 44.1 背景音樂（2026-10-17，版本 `20261017c`；`bgm.js`、`music/`）

- 使用者給兩支 mp4（`遊戲音樂.mp4`、`遊戲音樂2.mp4`，約 3 分鐘、1024×1024 靜態畫面），指定當**野外區域**背景音樂。這台電腦沒有 ffmpeg，
  用 Windows 內建 Media Foundation（PowerShell 呼叫 WinRT `MediaTranscoder`＋`MediaEncodingProfile.CreateM4a`）只抽出音軌，轉成 AAC 128kbps 的 `music/field1.m4a`、`field2.m4a`（各約 2.8MB）。
- 播放：`<audio>` 串流，接進 sfx.js 的 `AudioContext`（`createMediaElementSource`→`GainNode`，iOS 不能改 `audio.volume`）。第一次點擊後才會出聲。
  `bgmWant()`：設定開、音量 > 0、有角色、不是 `SIM_MODE`、頁面在前景、`player.loc.type === 'zone'`（所有狩獵地圖，含龍穴、永夜之塔、異界）→ 播 `field`，其他（村莊、標題）安靜。
  `setInterval(bgmUpdate, 500)`＋`visibilitychange`＋`pointerdown` 檢查；換狀態時淡入淡出 1.5 秒，淡出後暫停，回到野外從原本位置繼續；一首播完換下一首（第一次隨機挑一首）。
- 設定 →「🔊 音效與音樂」：背景音樂開關＋音樂音量（預設 40%），這台裝置的設定。
- `sw.js`：`music/` 與帶 `Range` 的請求不經過 SW（`<audio>` 分段要檔回 206，`cache.put` 會丟錯讓播放失敗）；所以離線時沒有音樂。
- **村莊音樂**（版本 `20261017d`）：使用者給 `城鎮音樂.mp4`（放在桌面 `屠龍勇者人物模組資料/`）→ `music/town1.m4a`（約 2.8MB、2:58），`player.loc.type === 'town'` 時循環播。
  換區（野外↔村莊）時先淡出 1.5 秒再換曲淡入（`bgmSwap`）；`bgmPos` 記每組播到哪，回到同一區從原位置繼續（本機伺服器不支援 Range，跳不過去會從頭播）。`bgmList`＝該播的組、`bgmCur`＝`<audio>` 目前載入的組。
- **手機沒聲音修正**（版本 `20261017h`，使用者回報「手機玩遊戲沒有聽到背景音樂跟音效」，線上已是 `20261017g`）：
  原本只在 `pointerdown` 解鎖，但手機觸控的 pointerdown **不算使用者操作**（瀏覽器規定觸控要 `touchend`／`pointerup`／`click`），所以 `AudioContext` 一直是 suspended、`sfx()` 全部不播；電腦滑鼠的 pointerdown 算，所以電腦正常。
  改成 `sfxGesture` 聽 pointerdown／pointerup／touchend／click／keydown：`sfxUnlock` 在 `resume()` 之外再播一段無聲短音（舊版 iOS 要真的播過聲音才解鎖），並設 `navigator.audioSession.type = 'playback'`（iOS 17+，手機靜音鍵開著也出聲）；
  `bgmGesture(activation)`：第一次真正的使用者操作（`navigator.userActivation.isActive`，沒有這個 API 時排除觸控 pointerdown）就對 `<audio>` play()＋pause() 一次，之後進野外／村莊由計時器播放才不會被手機擋。
  驗證：手機模擬（Android UA、375 寬）點標題畫面後 AudioContext running、音檔 23 個載入、背景音樂已預備；建角進村莊自動播城鎮音樂，開關視窗有介面音效；Console 無錯誤。實機（iPhone／Android）尚待使用者確認。
- 之後要加首領／龍穴音樂：在 `BGM_LISTS` 加一組、`bgmWant()` 回傳對應名稱即可。
- 驗證：本機野外自動播放、回村莊 1.5 秒淡出暫停、回野外從原位置繼續、`playbackRate` 16 倍播完自動換下一首、關掉開關會停、Console 無錯誤（本機測試伺服器不支援 Range，拖曳進度會跳回 0，GitHub Pages 正常）。
## 45. 大地圖第 1 期：低語海岸（2026-10-18，版本 `20261018k`；`ui-scene.js` 的 `SCENE_BGS.wild`、`tools/bigmap/`）

- 起因：使用者給一段手遊影片（一張很大的連續地圖、右上小地圖、地圖裡分小區域、大量怪物），要改成那樣。分 4 期：①大地圖＋小地圖＋區域名稱 ②擺設物件（遮擋）③大量怪物／獸潮 ④介面。這次做第 1 期。
- 素材：使用者用 AI 生成 6 張 2000×989 的圖（`tools/bigmap/`）：`swamp` 迷霧沼澤、`pond` 林間古泉、`village` 廢棄村落、`meadow` 河畔草原、`beach` 海灣營地、`forest` 純森林（`pond`、`forest` 右半也當森林填充）。
  提示詞重點：top-down 3/4 view、orthographic 45 度、light from the top-left、no characters／UI／text，見對話紀錄。
- `build-map.ps1`（PowerShell＋C#，本機沒有 Python）：每張縮成 1600×791，排成階梯狀讓路接上（沼澤 0,0 → 古泉 1600,0 → 村落 800,671 → 草原 664,1342 → 海灣 1304,2025），
  底下先鋪三塊森林裁切（含左右翻轉、錯排、邊緣淡入）當填充，每張四邊淡入 112px（貼地圖外框的邊不淡入），草原調暗 0.8、飽和 0.78 配合其他霧感的圖。
  輸出 `images/maps/wild.jpg` 3200×2816（＝100×88 格，1 格 32px，原圖 1:1，約 1.5MB）、`wild-mini.jpg` 320×282 小地圖；另外輸出 `auto-mask.txt`（依亮度／藍色自動猜可走格，不準，只當參考）。
- 可走範圍：照 `check-mask.ps1` 畫的格線圖手動標，存在 `tools/bigmap/walk.json`，同一份抄進 `SCENE_BGS.wild.walk／block`（walk 以外全部擋住）：
  沼澤泥路與兩側泥地、古泉小徑與池邊空地、村落石板路與空地（擋倒塌房屋、兩口井）、草原整片（擋河，兩座木橋可走）、海灣沙灘與左側林道、營地空地（擋帳篷、木箱）、各區之間的連接路。
  檢查：可走 2366 格全部能從出生點走到。
- 對應遊戲（使用者選「整張只當一個地圖」）：`ZONES` 的低語海岸 `island` 加 `bg: 'wild'`，`themeFor` 野外有 `z.bg` 就用那張背景圖；怪物、等級、掉落都沒變。其他野外照舊用遺跡圖。
  五個區域名稱借用遊戲地名（`SCENE_BGS.wild.regions`，角色離哪個中心格最近就算哪一區）：沼澤＝紫霧遺跡、古泉＝迷霧古林、村落＝灰燼村、草原＝低語海岸（出生點 46,52 十字路口）、海灣＝沉船海灣。
- `big: true` 的地圖（`ui-scene.js`）：
  - 鏡頭本來就會跟著角色捲動；`findPath` 搜尋上限從 1000 格放寬到 6000（點小地圖可以走很遠）。
  - 不在目前地圖區域、沒在戰鬥的怪收掉（2026-10-24 起怪在整個區域隨機重生，不再收掉離角色 16 格以上的怪，見第 17 節）。
  - `drawBigMapHud`：右上角小地圖（寬 min(128, 畫面 30%)，PC 橫式外框往下移 40）＝縮圖＋鏡頭範圍白框＋怪物紅點＋角色亮點，下面寫目前區域；
    進入新區域時畫面上方顯示「— 區域名 —」加地圖名 2.5 秒（`scene.region`／`regionAt`）。狀態列地點後面加區域（`sceneRegionName`，跟地圖同名時不重複）。
  - 點小地圖（`sceneMiniClick`，`sceneClick` 先判斷）＝走到那一格（不能走就找 8 格內最近能走的），之後照手動移動規則暫停自動尋怪。
  - 長距離移動被怪擋住下一格時重新找路（`pl.dest`，`sceneWalkTo` 記下目的地；以前會直接停下）。這個修正所有地圖都適用。
- 驗證：手機（375 寬）與 PC 16:9 畫面截圖；掛機 6 秒打倒 8 隻；點小地圖依序走到村落、沼澤、古泉、海灣再回草原，區域名稱、橫幅、狀態列都正確；迷霧古林仍是遺跡圖、沒有小地圖；Console 無錯誤。
- 之後：各區域放不同怪、第 3 期獸潮、其他野外也做大地圖（第 2 期遮擋見第 46 節）。
## 46. 大地圖第 2 期：擺設遮擋（2026-10-18，版本 `20261018p`；`ui-scene.js` 的 `drawOccPatch`、`tools/bigmap/build-occ.ps1`）

- 使用者要求：樹、帳篷這些擺設會跟角色前後遮擋。沒有新美術：背景圖本身就有樹和擺設，所以做一張**深度圖**記錄「哪些像素是會擋人的東西、它站在哪一列」，角色畫完後把該蓋在牠前面的像素用背景圖原樣再畫一次。
- `images/maps/wild-occ.png`（約 48KB）：800×704，1 格＝原圖 4×4 px；紅色值 0＝不是遮擋物，否則＝這塊東西站的格子列＋1。`build-occ.ps1` 產生，同時輸出檢查圖 `tools/bigmap/occ-check.jpg`（依深度上色）：
  - **樹冠自動找**：4×4 格平均亮度 L < 62、綠不輸紅、不是藍色，而且周圍 5×5 平均 L < 64（森林平均約 52；草原草地 80～90，單獨的陰影格不算）。
    站在擋住格子上的樹冠＝站在那一格；伸進可走格子的樹冠＝站在正下方 3 格內第一個擋住的格子（森林邊緣往上蓋到路上的樹冠），找不到就不是遮擋物。
  - `walk.json` 的 `noocc`：河、古泉水面這些深青色的水會被誤認成樹冠，強制不算。
  - `walk.json` 的 `occluders`（格子座標多邊形＋base 列）：營地帳篷、木箱、村落房屋後牆（base 27）與前牆（base 32）、兩口井、沼澤兩段斷牆。
    曾經標了沼澤枯樹與樹樁，但多邊形框到四周地面，走在旁邊的路上會被整個「擋住」，已拿掉。
- 遊戲（`SCENE_BGS.wild.occ`）：`occData(src)` 載入深度圖（帶 `?v=GAME_VERSION`，避免 SW 給舊的）存成 `Uint8Array`。
  `drawOccPatch(ctx, 範圍, 腳底列)`：在角色／怪物畫完之後呼叫，範圍內深度值 −1 > 腳底列＋0.2 的格子做成遮罩（暫存畫布、放大時平滑＝邊緣柔和），把背景圖那塊用 `destination-in` 裁出來畫回去。
  因為角色依 y 排序，往南的角色會畫在前一個的遮擋片之上，不會錯蓋。名牌、血條最後才畫，不會被擋。
  **半透明身影**：有蓋到東西時，玩家（和目前鎖定的目標）再以 38% 透明度畫一次（`OCC_GHOST`），走進樹後面也看得到自己；其他怪就躲在後面。
- 效能：每幀多約 0.3ms（手機模擬 1.0 → 1.3ms）。
- 驗證：手機模擬截圖對照（無遮擋／有遮擋）：森林邊緣、草原左下、海灣上方小路、營地木箱後面都被正確擋住；草原中間空地不再被誤擋（第一版把深色草地當樹冠，已修）；掛機有無遮擋擊殺數一樣；Console 無錯誤。
- 限制：遮擋只能做到「整塊東西一個前後」，大型擺設（房屋）分前後牆兩段；角色走在森林邊緣的可走格會被樹蓋住一部分，看起來像走進樹林邊。
## 47. 大地圖：5 個區域＝4 個真的地圖合併（2026-10-18，版本 `20261018r`）

- 使用者要求「地圖改為五個區域合併在一張地圖，海灘貝殼區域設為低語海岸」，並選「5 個真的地圖合併」（第 45 節原本是整張只當低語海岸）。對應（使用者逐區選）：
  海灘＝低語海岸 `island`（1～10）、河畔草原＋林間古泉＝迷霧古林 `elvenForest`（10～20）、廢棄村落＝沉船海灣 `pirateIsle`（26～38）、迷霧沼澤＝紫霧遺跡 `forgottenIsle`（62～76）。
  焦骨峽谷、永凍荒原維持原本的遺跡圖。四個地圖在 `zones.js` 都加 `bg: 'wild'`；沉船海灣、紫霧遺跡原本的 `tint` 在大地圖上不疊（`scene.tint` 只給非 big 地圖）。
- `sceneKey()`：地圖的 `bg` 是 big 時一律回傳 `'zone:wild'`，四個地圖共用同一個畫面，換區不重建（角色位置、地圖上的怪都留著）。
- `SCENE_BGS.wild.regions`：每區 `zone`、中心格、`rect` 範圍（依序第一個符合的；沼澤 0～49×0～21、古泉 50～99×0～21、廢村 y22～42、草原 y43～64、海灘 y65～87）、`start` 傳送出生格
  （低語海岸 63,78 沙灘、迷霧古林 46,52 草原十字路口、沉船海灣 40,34 石板路、紫霧遺跡 20,14 沼澤泥路）。`buildScene` 依目前地圖找有 `start` 的區域當出生點。
  可走格子數：迷霧古林 1068、沉船海灣 503、低語海岸 473、紫霧遺跡 294。第一版用「離哪個中心最近」，沼澤到古泉的林間小路會被判成沉船海灣，改用 rect。
- 換區 `sceneEnterZone(id)`（`sceneUpdate` 偵測到所在區域的 `zone` 跟 `player.loc.id` 不同時呼叫，步行回村中不換）：直接改 `player.loc`，訊息「📍 進入 X（建議 Lv.a～b）」，
  等級比建議下限低 5 級以上再跳警告。正在打的怪不會被打斷；之後生的怪（`visualMonster`／`spawnMonster`）、掉落、經驗、任務、死亡回哪個村莊、離線收益都照新地圖。
- 橫幅改成「— 地圖名 —」＋「建議等級 Lv.a～b」；小地圖下方與狀態列顯示目前地圖。
- 驗證：從村莊傳送到四個地圖都出生在對的區域、地圖上的怪換成該地圖的怪；點小地圖從海灘走到草原、廢村、沼澤、古泉，地圖依序換成低語海岸→迷霧古林→沉船海灣→紫霧遺跡→迷霧古林，
  沼澤到古泉只經過紫霧遺跡→迷霧古林；Console 無錯誤。
## 48. 大地圖往東擴大：永凍荒原、焦骨峽谷、黃沙王陵（2026-10-18，版本 `20261018s`）

- 使用者再給 3 張圖要「溶入大地圖內」：`pond-snow.jpg`（左半＝原本的林間古泉、右半＝雪原）、`oasis.jpg`（骨骸綠洲，四周沙丘）、`pyramid.jpg`（沙漠金字塔建築群）。
  對應：雪原＝永凍荒原 `orenSnow`（46～58）、骨骸綠洲＋東邊沙丘＝焦骨峽谷 `dragonValley`（36～48）、金字塔四周＝黃沙王陵 `pyramid`（地監，44～56，這裡當成它的外圍）。三個在 `zones.js` 加 `bg: 'wild'`；
  `themeFor` 改成任何類型的地圖只要 `bg` 是 big 就用大地圖（黃沙王陵原本是地監格子主題）。
- `build-map.ps1`：畫布改 4512×2816（141×88 格），古泉位置改用 `pond-snow.jpg`（古泉的位置、可走範圍不變），新增綠洲（2240,1300，亮度 0.92）、金字塔（2904,2025，亮度 0.92）。
  填充分兩層：先全部鋪森林，再在東北（中心 x>3150、y<1200）鋪雪地、東南鋪沙漠（裁自 `pond-snow` 右半、`oasis`／`pyramid` 邊緣的沙丘），第二層 150px 柔邊、間距 280×300 密集重疊，交界是漸層。
  小地圖改 400×250。`build-occ.ps1` 的格數改從圖片大小算（深度圖 1128×704）。雪地松樹、骨頭、沙丘不是深色，不會被當遮擋物。
- 圖檔網址加 `?v=2`（`SCENE_BGS.wild.src`／`mini`）：SW 對圖片是先給快取，圖的大小改了沒換網址的話，手機會先拿到舊的 3200 寬圖貼在 141 格上。之後重拼圖就把數字加 1。
- 可走範圍（`walk.json` 同步抄進 `SCENE_BGS.wild`）：雪原 [85,5,97,21]＋[97,2,140,32]、古泉往雪原 [78,15,86,19]；東邊沙丘 [100,33,140,64]；
  綠洲 [74,44,114,62]（擋水池與樹根 [87,50,100,56]）、草原往綠洲 [66,56,76,58]；金字塔四周 [92,63,140,68]、[92,68,102,87]、[100,80,140,87]、[130,66,140,82]（擋建築群 [103,68,130,81]）。
  雪原經東邊沙丘接到綠洲與金字塔。可走 6434 格全部能從草原出生點走到。
- `regions` 依序：紫霧遺跡 [0,0,49,21]、古泉 [50,0,81,21]、永凍荒原 [82,0,140,32]（出生 92,14）、沉船海灣 [0,22,69,42]、焦骨峽谷 [70,33,140,63]（出生 80,52）、
  草原 [0,43,69,64]、黃沙王陵 [91,63,140,87]（出生 97,84）、低語海岸 [0,65,90,87]。
- 驗證：從永夜王都傳送到永凍荒原／焦骨峽谷／黃沙王陵都出生在對的區域、地圖上是該地圖的怪（雪怪、地獄三頭犬、沙漠巨蠍）；點小地圖草原→綠洲→金字塔、古泉→雪原，地圖依序切換；Console 無錯誤。
- **水池與建築群改成可以走**（版本 `20261018t`，使用者要求）：拿掉 `block` 的綠洲水池樹根 [87,50,100,56] 與金字塔建築群 [103,68,130,81]，建築群範圍加進 `walk`，角色可以走過水池、走上金字塔與建築；深度圖重做（遮擋不受影響）。
- 大地圖現在包含 7 個地圖：低語海岸、迷霧古林、沉船海灣、紫霧遺跡、焦骨峽谷、永凍荒原、黃沙王陵（黃沙王陵的地監格子畫面不再用）。

## 49. 大地圖往南加一排：腐朽礦坑・上層、沉眠龍窟、腐朽礦坑・深層（2026-10-18，版本 `20261018u`）

- 使用者給 3 張 2000×989 的圖要「溶入大地圖中」：前兩張（同一張圖，存成 `tools/bigmap/mine.jpg`）＝腐朽礦坑・上層 `gludio1`／深層 `gludio2`，第三張（洞窟裡睡在金幣堆上的龍，`dragon-cave.jpg`）＝沉眠龍窟 `sleepingCave`。三個都是地監，`zones.js` 加 `bg: 'wild'`（`themeFor` 已經是 big 就用大地圖，第 48 節）。
- `build-map.ps1`：畫布改 4512×3584（141×112 格，原本 88 列），南排三張並排 x＝0／1456／2912、y＝2793（每張 1600×791，左右重疊 144px 柔邊）：**上層｜龍窟｜深層**。
  深層用同一張礦坑圖左右翻轉、亮度 0.8、飽和 0.88（region 第 6 欄 `'flip'`）；第一版上層、深層相鄰，看得出是鏡像，改成中間夾龍窟。
  海灘、金字塔原本貼地圖下緣不淡入，現在下面還有東西，位置改寫死 y＝2025、下緣也淡入。小地圖改 400×318。
- 圖檔網址改 `?v=3`（`SCENE_BGS.wild.src`／`mini`），`h: 112`。深度圖 `wild-occ.png` 重做（1128×896）；南排整片加進 `walk.json` 的 `noocc`（礦坑岩石、洞窟陰影很暗，會被當成樹冠）。
- 可走範圍（`walk.json` 同步抄進 `SCENE_BGS.wild`）：
  - 上層：整片 [0,88,47,111]，擋石拱＋碎石堆＋礦車 [15,90,30,99]、左側岩台 [9,93,14,98]、左邊礦井岩壁 [0,98,7,103]、右側高台與木架 [34,94,47,103]、下方礦井 [20,108,23,111]；海灘左邊林道往南 [40,86,52,89] 接進來。
  - 龍窟：左上洞口 [48,88,53,95]＋[53,92,57,96]、地面 [52,95,89,110]、右上洞口 [84,86,93,92]＋[84,92,88,97]（北接海灘東邊、金字塔西邊），擋沉睡的龍 [64,94,78,103]；左右洞壁不能走，上層和龍窟只從北邊相通。
  - 深層：整片 [96,88,140,111]（上層的擋格左右翻轉：[111,90,126,99]、[127,93,132,98]、[134,98,140,103]、[94,95,107,104]、[118,108,121,111]），北邊整排接金字塔，龍窟右上洞口 [93,88,96,90] 也接過來。
  - 可走 9009 格全部能從草原出生點走到。
- `regions` 加在最後：上層 [0,88,47,111]（出生 30,101）、龍窟 [48,88,93,111]（出生 58,100）、深層 [94,88,140,111]（出生 111,101）。
- 驗證：從村莊傳送到三個地圖都出生在對的區域、地圖上是該地圖的怪（歐西斯妖魔／石頭高崙、邪惡蜥蜴／吸血蝙蝠／卡司特、史巴托）、區域橫幅與小地圖正確；
  步行深層→龍窟→上層→海灘→深層→金字塔，地圖依序切換 gludio2→sleepingCave→gludio1→island→gludio2→pyramid；Console 無錯誤。
- 已知：低語海岸的出生格 63,78 在營地木箱的擋格 [61,78,63,80] 裡（第 47 節就這樣，`findPath` 以它為終點會失敗），這次沒動。
- 大地圖現在包含 10 個地圖：低語海岸、迷霧古林、沉船海灣、紫霧遺跡、焦骨峽谷、永凍荒原、黃沙王陵、腐朽礦坑・上層、沉眠龍窟、腐朽礦坑・深層（後三個的地監格子畫面不再用）。

## 50. 大地圖路引：地圖交界的發光箭頭（2026-10-18，版本 `20261018x`；`ui-scene.js` 的 `bigMapGates`／`drawGates`／`drawGlowArrow`）

- 使用者要求：「小地圖跟大地圖在下一張地圖交界做一個路引，一個箭頭發光，才不會找不到路」。
- **自動產生，不用手標**：`buildScene` 建大地圖時呼叫 `bigMapGates(grid, regions)`（結果存在 `SCENE_BGS.wild._gates`，只算一次）：
  每個可走格子用 `bigRegionAt`（跟 `sceneUpdate` 判斷所在區域同一套：rect 依序第一個符合，否則最近中心）找出屬於哪個地圖；
  上下左右相鄰格是別的地圖＝交界格（同一格可能同時接兩個地圖，key 帶目標地圖）。同一個地圖往同一個目標、2 格內相連的交界格算一段，
  每段在中心放一個路引，往自己這一側退 2 格（兩邊各一個、方向相反，不會疊在一起），箭頭方向＝交界方向平均、取 8 方向。同一個地圖 3 格內有好幾個路引（三岔口）時名牌往上疊（`stack`，每層 44px）。
  迷霧古林兩個區域都是同一個地圖，中間不放。目前共 34 個路引。之後加區域、改 rect 會自動跟著變。
- 大地圖（`drawGates`，畫在地上、角色之前）：地上一圈脈動光暈＋往目標方向來回飄的金色發光箭頭＋目標地圖名＋「Lv.a～b」；角色等級比建議下限低 5 級以上改成紅色。
- 小地圖（`drawBigMapHud`）：只畫**目前所在地圖往外**的出口，閃爍的小金箭頭。
- 驗證：手機畫面（375 寬）在沉眠龍窟左上洞口截圖：往低語海岸、腐朽礦坑・上層的箭頭與名牌疊開、海灘那側的「沉眠龍窟 ↓」也看得到；小地圖有龍窟兩個出口；Console 無錯誤。

## 51. 瞬間移動卷軸真的會傳送（2026-10-18，版本 `20261018y`；`ui-scene.js` 的 `sceneTeleport`）

- 使用者回報「瞬間移動卷軸沒有效果」：原本只呼叫 `leaveFight`（清掉戰鬥狀態），地圖上的角色留在原地、旁邊的怪又馬上被拉進來，看起來像沒用。
- 改成天堂式：`sceneTeleport()` 把角色傳到**同一個地圖**裡隨機一格（離原地 10 格以上、4 格內沒有怪；試 400 次找不到就放寬到 4 格），
  大地圖只傳到目前地圖自己的區域內（`bigRegionAt`，不會傳進別的地圖），格子地圖要 `findPath` 走得到（不會傳進牆圍住的死角）。
  原地與落點各一道藍光、頭上飄「瞬間移動」；路徑、目的地、鎖定都清掉，原本圍著的怪留在原地放回遊走。
- 呼叫的地方：快捷欄／底部格子 `quickTele`（ui-frame.js）、自動使用 `autoSupport`（combat.js，先 `leaveFight` 再傳送）、背包道具視窗新增「使用」按鈕（ui-panels.js）。
  訊息：有傳送＝「📜 使用瞬間移動卷軸，傳送到別的地方」，地圖畫面沒開（背景、離線模擬）就照舊只脫離戰鬥。龍穴照舊直接回村。
- 驗證：腐朽礦坑・上層連用 4 次都換到 10 格以上的別處、地圖仍是 gludio1、戰鬥狀態變成尋怪；低語墓窟（格子地圖）連用 3 次都換位置；Console 無錯誤。

## 52. 永夜之塔通用地圖（2026-10-18，版本 `20261018z`；`ui-scene.js` 的 `SCENE_BGS.tower`）

- 使用者給一張塔內大廳圖（2000×989，中間魔法陣廣場、北邊走廊、四條斜走道通往四角螺旋梯、下方是低一層的墓室），說「傲慢之塔通用地圖」（傲慢之塔＝現在的永夜之塔）。
- 存成 `images/maps/tower.jpg`；`SCENE_THEMES.tower` 加 `bg: 'tower'`，**1～100F 每層都用這張**（以前是紫色格子＋蠟燭／骷髏 emoji）。使用者說永夜之塔**不放進大地圖**：它是自己獨立的畫面（`sceneKey` 照舊 `zone:tower:樓層`），只是換背景圖。鋪成 40×20 格（原圖每格 50×49.5px），出生在魔法陣中間 20,10。
- 可走範圍 `walk`：北邊走廊 [19,2,21,6]；魔法陣廣場（八角形）[13,7,27,8]、[11,9,29,11]、[13,12,27,13]、[15,14,25,14]；東西走道 [3,9,10,10]、[30,9,37,10]；
  左右上方斜陽台 [9,4,13,6]＋[12,6,14,7]、[27,4,31,6]＋[26,6,28,7]；左右下方往螺旋梯的斜走道 [10,12,13,14]→[7,14,11,15]→[4,16,8,17]→[2,18,5,18]（右邊對稱）。下方墓室、欄杆外、牆都不能走。
- 驗證：本機傳送到永夜之塔 5F，畫面是新背景、怪物（骷髏神射手）在廣場上；可走 273 格全部能從出生點走到；掛機正常擊殺；Console 無錯誤。

## 53. 大地圖掛機只在目前的地圖裡（2026-10-19，版本 `20261019a`；`ui-scene.js` 的 `inHuntZone`／`huntPath`）

- 使用者回報「大地圖掛機不會走到別的區域」，問過後選「限制在原地圖」：以前怪是在角色附近隨機生、隨機遊走，站在交界附近時怪會生到隔壁地圖，角色追過去就換了地圖（可能跑進等級高的區域）。
- `inHuntZone(x, y)`：大地圖時這格是不是目前地圖（`player.loc.id`）的區域；每格屬於哪個地圖算一次存在 `SCENE_BGS.wild._zoneOf`（用 `bigRegionAt`）。不是大地圖一律 true。
  - `spawnMapMon`：怪只生在這個地圖的格子。
  - 怪物遊走：不會走出這個地圖。
  - 掛機尋怪只找這個地圖裡的怪；`huntPath`：掛機自動走的路線（尋怪、走到目標旁）走到要出地圖的那一格前就停。
  - 手動走路、點地面、點小地圖、圍上來的怪走到角色旁邊都不受限，玩家自己走過交界照舊換地圖（第 47 節）。瞬間移動卷軸本來就只傳到同一區（第 51 節）。
- 驗證：角色放在礦坑上層與海灘交界（44,89）掛機 3 分鐘：擊倒 26 隻、地圖一直是 gludio1、沒有怪生在區域外；之後手動走到海灘會換成低語海岸；Console 無錯誤。

## 54. 手機外框拿掉左右石柱（2026-10-19，版本 `20261019b`；`images/frame-nopillar.png`、`index.html` 的 `#frame`／`#panel`／`.pillar`）

- 使用者要求「遊戲畫面左右骷髏頭頂石柱移除」，先做手機直式外框，再做 PC 橫式外框（見本節最後）。
- `frame-nopillar.png`（1006×964，約 940KB）：`frame-notop.jpg` 縮成 75%，原圖座標左邊 x < 104、右邊 x ≥ 1240 在 y < 668 的部分改透明，y 600～668 用 smoothstep 淡入（石柱底部接骷髏翅膀的地方不會切一條硬邊）。
  一次性用 PowerShell＋C# 產生（沒有留腳本）；`border-image-slice` 跟著 ×0.75 改成 `19 77 491 78 fill`，`border-image-width` 不變（仍用原圖座標 × `--s`）。
- `#panel` 左右改成 0：地圖（和其他分頁）延伸到畫面左右邊。
- 左右抽屜按鈕 `.pillar` 以前是蓋在整根石柱上的透明按鈕，改成地圖左右邊中間 26×56 的半圓小鈕（半透明深底＋金邊，箭頭照舊），不會擋到地圖邊緣的點擊。
- 驗證：手機（375 寬）截圖：狩獵畫面地圖滿版、骷髏與法球完整；點左邊小鈕打開抽屜、開人物狀態版面正常；Console 無錯誤。
- **PC 橫式外框**（版本 `20261019c`）：外框圖 `frame-pc-notop.jpg` 不變，換遮罩 `images/frame-pc-nopillar-mask.png`（`frame-pc-notop-mask.png` 複製後，原圖座標 x < 92、x ≥ 1908 在 y < 625 的 alpha 乘上 0，y 570～625 smoothstep 淡入），
  `#frame.pc #panel` 左右改成 0，大地圖延伸到左右邊。原遮罩檔留著不用。
  驗證：預覽窗格在大尺寸時截圖只截到局部（工具問題），改用 PowerShell 把外框＋新遮罩疊在沉眠龍窟圖上合成預覽，確認石柱消失、骷髏／法球／欄杆完整；頁面上元素位置（外框、地圖 1280×536、法球）正確；Console 無錯誤。
- **骷髏去背**（版本 `20261019d`，使用者回報「畫面骷髏沒有去背景乾淨」）：石柱拿掉後，骷髏後面還有原圖的暗色階梯底，地圖下緣也切到骷髏頭頂。
  - 手機：`images/frame-clean.png`（`frame-nopillar.png` 再處理）＝縮圖座標 y 440～650（欄杆以上）從頂端與中間黑帶開始 flood fill 亮度 < 56 的暗色像素改透明（邊緣 70%），只留骷髏、翅膀、法球；`border-image` 改用這張。
    另外 `#frame::after` 把原圖 y 630～880 那段（`background-position-y: -630 × --s`、寬 100%）疊在地圖上面（z-index 2、不吃點擊），骷髏頭頂不會被地圖下緣切掉；PC 不顯示。
  - PC：`frame-pc-nopillar-mask.png` 從 `frame-pc-notop-mask.png` 重新做：石柱清掉＋淡入（同上）、清掉頭頂旁邊的格紋殘邊 [92,560,128,628]／[1872,560,1908,628]，
    再在兩個角落 [0,560,330,800]、[1670,560,1999,800] 從已透明處 flood fill 暗色（亮度 < 48），**只穿過 9×9 全暗的寬通道再往回長 4px**（肋骨縫太窄不會被挖空，骷髏保持實心）；網址改 `?v=2`。
  - 一次性 PowerShell＋C# 產生，沒有留腳本；驗證用合成圖（外框＋遮罩疊在地圖上）與手機截圖。

## 55. 永夜之塔傳送師（大地圖紫霧遺跡最左上角；2026-10-19，版本 `20261019f`）

- 使用者要求：「大地圖紫霧遺跡最左上角新增 NPC 永夜之塔傳送師；地圖使用永夜之塔會飛到傳送師面前，跟傳送師講話可以選擇要不要進入永夜之塔」，給了一張森林裡黑袍老法師的立繪。
- 圖：原圖存 `tools/sprite-src/tower-keeper-src.jpg`；`tools/stage/npc-cut.ps1` 去背 → `images/npc/tower-keeper.png`（266×360）＋對話頭像 `tower-keeper-face.jpg`。
  去背規則：從圖邊 flood fill「綠色為主（G > R+6）」或「偏亮（L > 62）且不偏暖（R−G < 16）」的像素（森林、霧、灰石地），手杖、皮膚、鬍子被黑袍包住所以留著；
  `-FeetY 1110` 切掉腳下地面，`-Erase` 多邊形再清掉碰到黑袍的左下岩石、右下地面、黑袍與手杖之間的地面。參數見腳本開頭與本節指令：
  `-FeetY 1110 -Face '380,110,360,360' -Erase '0,600 335,600 322,660 305,700 270,800 222,900 160,1000 110,1055 80,1110 0,1110;742,985 820,985 820,1110 735,1110;688,740 707,740 707,995 690,995'`。
  （腳本裡圖片變數不能叫 `$src`：PowerShell 變數不分大小寫，會跟 `[string]$Src` 參數衝突、被轉成字串。）
- `SCENE_BGS.wild.fieldNpcs`（ui-scene.js）：`{ name, role, zone, x: 5, y: 6, front: [6, 8], img, h: 2.4, act }`。`buildScene` 把 NPC 站的格子設成 3（不能走）並預載圖；
  畫在角色依 y 排序裡（腳下陰影＋立繪，人在圖的偏右所以往左偏 62%），名牌用 `drawNpcPlate`；`sceneClick` 在野外先檢查 `scene.npcRects`，**只有點名牌才對話**（跟村莊一樣）。
- 地圖清單（`renderMap`）永夜之塔卡片：拿掉樓層輸入，按鈕改「前往傳送師」→ `travelTowerKeeper()`（ui-panels.js）：要在村莊、**免費**、`player.loc` 改成紫霧遺跡、
  `sceneSpawnAt = front`（ui-scene.js 全域，下一次 `buildScene` 大地圖用這格出生，用完清掉）、不開始掛機，提示「點名牌跟他說話」。
- `openTowerKeeper()`：角色要在傳送師 5 格內（`towerKeeperNear`），對話框＝頭像＋台詞、建議等級、傳送費、樓層輸入（預設最高樓 −9）、守關首領復活狀態；
  「進入永夜之塔」`towerKeeperGo`（`keep: true`，先讀樓層再關對話框）→ `enterTowerFromKeeper(floor)`：收傳送費 1,000、進塔、開始掛機。「不了」關掉。`travelTowerBtn` 已移除。
- 驗證（手機 375 寬）：永夜王都按「前往傳送師」→ 出生在 6,8、地圖紫霧遺跡、沒有掛機、看得到傳送師與名牌；點名牌開對話框；按進入 → 永夜之塔 11F、扣 1,000、開始掛機；Console 無錯誤。

## 56. 暮光法師塔傳送師＋傳送師程式通用化（腐朽礦坑・深層；2026-10-19，版本 `20261019h`）

- 使用者給白袍老法師立繪＋PC 截圖（紅圈）：「新增暮光法師塔傳送 NPC，地點塗上紅圈處」。紅圈在深層石拱右邊草坡上那根大腿骨旁邊（右下有肋骨）＝格子 132,98（草坡擋格 [127,93,132,98] 的角，NPC 站的格子本來就不能走），落點 131,100。
- 圖：`tools/sprite-src/ivory-keeper-src.jpg` → `images/npc/ivory-keeper.png`（243×360）＋`ivory-keeper-face.jpg`。白袍是淺色，`npc-cut.ps1` 新增：
  `-Light 999`（關掉「偏亮不偏暖＝背景」那條，只去綠色）、`-Green`（綠色門檻，這張用 0）、`-Keep` 多邊形（去背後再從原圖補回來：手杖上的水晶）。指令：
  `-Light 999 -Green 0 -FeetY 1060 -Face '150,100,300,300' -Erase '0,760 104,760 104,1060 0,1060;590,885 716,885 716,1000 690,972 640,940 590,925' -Keep '56,192 70,163 86,163 98,195 86,236 68,242 55,216'`。
- 程式改成通用（第 55 節的永夜之塔專用函式全部換掉）：`fieldNpcs` 每個多 `to`（要送去的地圖）、`face`（頭像）、`say`（台詞）；ui-panels.js：
  `keeperNpc(to)`、`keeperNear(to)`、`travelToKeeper(to)`（地圖清單「前往傳送師」）、`openKeeper(to)`（對話框，只有永夜之塔有樓層與首領狀態）、`keeperGo(to)`、`enterZoneFromKeeper(to, floor)`。
  地圖清單：只要那張地圖有傳送師（`keeperNpc(z.id)`）就顯示「前往傳送師」，所以暮光法師塔也改成先飛到傳送師面前。上一版留下沒用到的 `travelTowerBtn` 也刪了。
- 驗證（PC 16:9）：暗金城按暮光法師塔「前往傳送師」→ 深層 131,100、傳送師站在草坡骨頭旁（對照使用者截圖）；點名牌開對話框（沒有樓層欄）→ 進入 → 暮光法師塔、扣 500、開始掛機；
  永夜之塔傳送師對話仍有樓層欄；地圖清單兩個「前往傳送師」；Console 無錯誤。

## 57. 大地圖往東加熔火煉獄（2026-10-19，版本 `20261019k`）

- 使用者給一張熔岩地圖（火山、熔岩河、中間符文廣場、遺跡石柱），要「熔火煉獄地圖合併上大地圖」。存成 `tools/bigmap/lava.jpg`；熔火煉獄 `fireCave`（地監）在 `zones.js` 加 `bg: 'wild'`。
- `build-map.ps1`：畫布寬 4512 → **6016（188 欄，高仍 112 列）**，熔岩圖放 (4416, 1100)、亮度／飽和 0.95，＝格子 138～187、列約 34～59，在焦骨峽谷東邊沙丘的右邊（等級 54～66 接在 46～58 的永凍荒原、44～56 的黃沙王陵旁邊）。
  東邊新多出來的空白由第二層填充自動補（北邊雪地、其餘沙漠）。小地圖改 400×238。圖檔網址改 `?v=4`、`w: 188`。`wild.jpg` 約 3.3MB。
- 可走範圍（`walk.json` 同步抄進 `SCENE_BGS.wild`）：中間符文廣場 [153,44,168,51]＋[151,46,170,50]＋[155,43,165,44]；左上遺跡平台 [141,39,151,43]＋階梯 [150,41,154,45]；右上平台 [166,38,186,43]＋階梯 [165,41,169,45]；
  左下岩地 [140,51,152,57]＋石板橋 [149,50,155,53]；右下岩地 [168,51,186,57]＋[166,50,170,53]；右邊岩島 [182,46,187,52]。熔岩、火山、懸崖都不能走；
  擋石柱 [145,49,147,52]、[150,51,152,54]、[156,43,157,46]、[150,38,152,41]、[167,39,170,43]、[173,51,175,54] 與右下熔岩溪 [176,51,181,52]。
  西邊 x 140～141 直接接焦骨峽谷的沙丘 [100,33,140,64]。整片 [140,30,187,64] 加進 `noocc`（草叢、暗岩不當遮擋）。可走 9454 格全部能從草原出生點走到。
- `regions` 加 熔火煉獄 [141,30,187,64]（出生 160,48 廣場中間）。
- 驗證：永夜王都傳送到熔火煉獄 → 大地圖、出生在符文廣場、怪是火之精靈／熔岩高崙／火蜥蜴；往西走到 140,53 換成焦骨峽谷；Console 無錯誤。
- 大地圖現在包含 11 個地圖（第 49 節的 10 個＋熔火煉獄；熔火煉獄原本的地監格子畫面不再用）。

## 58. 大地圖接縫 AI 補畫（2026-10-19，版本 `20261019m`～`20261019o`；`tools/bigmap/seams/`、`build-map.ps1` 的 `Patch`）

- 使用者嫌地圖銜接粗糙（各張 AI 圖直接貼上、邊緣霧狀淡入、畫風不同），選方案 D「AI 補畫接縫」（沒選 E 改磁磚地圖：要重做地圖系統與整套素材）。
- `seams/patches.json`：每條接縫一筆 `{ id, x, y, orient: 'v'|'h', at, band, note }`，`x,y`＝1024×1024 方塊在大地圖的左上角（像素，1 格 32px），
  `at`＝接縫所在的 x（垂直）或 y（水平），`band`＝洋紅色補畫區的半寬（目前 150）。試做 3 條：01 海灘↔金字塔、02 海灘↔南排礦坑／龍窟、03 東邊沙丘↔熔火煉獄。
- `seams/seam-cut.ps1 [-Only id]`：從**沒貼補丁的底圖** `seams/base.jpg`（`build-map.ps1` 每次產生；沒有就用 `images/maps/wild.jpg`）切方塊，
  輸出 `seams/todo/<id>.png`（接縫塗洋紅色，給生圖 AI）與 `<id>-orig.png`（原樣）。`base.jpg`、`todo/` 在 `.gitignore`。
- 使用者把 AI 補好的圖放進 `seams/fixed/<id>.png|jpg|webp`（尺寸不拘，會縮成 1024），重跑 `build-map.ps1`：拼完先存 `base.jpg`，再把每張 fixed 用 `[BigMap]::Patch` 貼回——
  補畫區（band＋24px）完全蓋上，往外 140px 平滑淡出，方塊沿接縫的兩端 110px 也淡出，AI 圖顏色略偏也不會出現硬邊。
- 檢查工具：`seam-check.ps1`＝AI 圖縮成 1024 後跟原圖比對補畫區以外的亮度差，找 −24～24px 的最佳位移（要是 0,0，否則貼回去會重影）；
  `seam-compare.ps1`＝輸出 `todo/<id>-compare.jpg` 修改前（base.jpg）／後（wild.jpg）並排。
- **第一批完成（`20261019m`）**：使用者用 AI 生圖補好 3 條（2048×2048，存成 `.jfif`，已改名 `fixed/<id>.jpg`），對齊檢查位移都是 0,0（差異 3.5～8.8）。
  可走範圍照 AI 新畫的東西補 3 個擋格（`walk.json` 與 `SCENE_BGS.wild.block` 同步）：金字塔左下碎石堆 [92,80,95,84]、森林小路大石 [49,84,50,85]、流進沙丘的熔岩 [138,43,140,46]；
  可走 9515 格全部能從草原出生點走到。重跑 `build-occ.ps1`，`wild.jpg`／`wild-mini.jpg` 網址改 `?v=5`。
  驗證：本機（`.claude/launch.json` 新增 `dragon-alt` port 8791，8790 被別的對話佔用時用）黃沙王陵 93,75、焦骨峽谷 136,49 截圖，接縫自然、遊戲程式全部載入；預覽瀏覽器註冊 SW 失敗是環境限制（與本次無關）。
- **第二批（`20261019n`）**：`patches.json` 加 04、06～14（05 雪原接雪地不明顯，拿掉）；`seam-cut.ps1` 改成從**已貼補丁的** `wild.jpg` 切（新補丁與舊的重疊時 AI 看得到舊的成果；補丁照清單順序貼，新的加在最後）。
  使用者先補好 04 沼澤↔古泉、06／07 村落↔草原、08 草原↔綠洲（對齊 0,0；08 差異 12.3 較大但貼回後看不出邊）。
  可走範圍：AI 在 07 草原上新畫一條小溪＋木橋 → 擋格 [57,42,58,43]、[58,44,61,46]、[61,46,63,47]（橋可走）；
  06 森林被畫成往下的石板路 → 新增可走 [36,39,44,41]；08 草原與骨骸地之間那排樹被畫成空地 → 新增可走 [70,44,73,52]。可走 9548 格全部走得到。圖 `?v=6`。
  另外 07／08 右上（綠洲左上角）與 08 右下（綠洲左下角）還留一點霧，之後可再加補丁。
- **第三批（`20261019o`）**：09 綠洲↔金字塔、10 草原↔海灘、11 礦坑上層↔龍窟、12 龍窟↔礦坑深層、13／14 金字塔↔礦坑深層，全部對齊 0,0（差異 3.9～14.8）。
  這批是在第二批貼回前切的，10 與 07／08 重疊。試過「淡出區只套 AI 的改變量（fix−orig）」避免舊霧蓋回，結果補畫區邊界出現方形硬邊霧塊，已撤掉；
  維持一般 alpha 淡入，重疊處看起來正常。可走範圍只補 10 海灘上方新畫的小水窪 [67,66,70,67]（金字塔一帶新畫的城牆、碎石照使用者先前要求維持可走）；可走 9540 格全部走得到。圖 `?v=7`。
  全部 13 條接縫完成；剩綠洲左上／左下角、熔火煉獄上下緣、金字塔右緣與沙漠填充圖的淡淡過渡，需要再加補丁。
- 流程（之後補其他接縫）：`patches.json` 加一筆 → `seam-cut.ps1 -Only id` → 使用者 AI 補畫存 `fixed/` → `seam-check.ps1` → `build-map.ps1` → `seam-compare.ps1` 看效果
  → `check-mask.ps1` 疊可走範圍找 AI 新畫的障礙、補擋格 → `build-occ.ps1` → 圖 `?v=` 加 1、換版本號。

## 59. 圓形小地圖＋全世界地圖（2026-10-19，版本 `20261019q`；`ui-scene.js` 的 `drawBigMapHud`／`drawWorldMap`／`sceneMiniClick`／`sceneWalkNear`）

- 使用者要小地圖「自然一點」，做了 3 種樣本（A 全世界縮圖柔化、B 圓形跟著角色、C 圓角方框邊緣淡出），使用者選 **B，點一下放大成全世界地圖**。
- **小地圖**（大地圖才有）：右上角圓形，半徑 `min(62, 可見寬×0.16)`，以角色為中心顯示周圍 `MINI_TILES`（22）格，直接從大地圖原圖 `bg.src` 取那一塊（比以前的 `wild-mini.jpg` 清楚，`mini` 圖現在沒用到）；
  圓內怪物紅點、邊緣徑向暗角、角色亮點；目前地圖的出口箭頭在圓外的貼在圓邊（R−7）指方向；金色雙圈＋上方「N」＋右下「⤢」放大鈕；下方顯示目前區域名。`scene.miniRect = { cx, cy, r }`。
- **世界地圖**（`scene.worldOpen`）：點小地圖（圓內＋6px）或按 **M** 打開；畫面變暗、整張大地圖等比縮到可見範圍內（第一次打開時從原圖畫一次存成 `worldCache` canvas，尺寸變了才重畫），
  標出每個區域（`SCENE_BGS.wild.regions` 的 x,y）的地圖名稱＋建議等級（目前所在亮藍、等級低 5 級以上紅色）、目前地圖的出口箭頭、角色位置（脈動光圈）。
  **點地圖內＝走過去並關閉**（`sceneWalkNear`：不能走的格子找 8 格內最近能走的，沿用以前點小地圖的走法），點外面／再按 M／Esc＝關閉；步行回村時自動關閉。
- **可見範圍** `scene.visX`（`sceneFrame` 每幀用 `getBoundingClientRect` 算）：手機版畫布比螢幕寬、左右各超出約 25px，小地圖與世界地圖照真正看得到的左右範圍排版；PC 橫式外框底部欄杆會蓋住畫布下緣，世界地圖底部多留 `H×0.17+14`。
- 驗證：手機 375×812（小地圖完整、世界地圖完整、點低語海岸 → 關閉並走 31 步）、PC 1280×720（M 開、Esc 關、地圖不被外框蓋到）；Console 只有預覽環境註冊 SW 的已知訊息。
  中途發現瀏覽器會把同一個 `?v=` 的舊 JS 快取住，本機測試改 JS 後也要換版本號（`20261019p` 改成 `q` 才拿到新程式）。

## 60. 防改檔第 2 波：交易所門檻、存檔加密簽章、雲端存檔簽章、記憶體偽裝、混淆（2026-10-19，版本 `20261019r`；`guard.js`、`tools/anticheat.sql`、`tools/build.js`）

- 使用者要求（看到別的遊戲群組說「數據亂碼加密改檔直接讀檔案來」「交易所容易爆」）：問數值加密有沒有用 → 我建議四項 → 使用者「全改」（只改黑暗大陸；根目錄 `tools/build.js` 加一行呼叫已同意）。
  **原則**：純前端擋不住會讀程式的人（repo 是公開的，原始碼與金鑰都看得到），目標是擋掉一般玩家的改法，並讓改過的存檔**碰不到交易所／共用倉庫**（會影響其他玩家的地方）。不擋單機遊玩、不刪檔。
- **① 交易所門檻（伺服器，`anticheat.sql`）**：`dragon_market_hold(user)`＝帳號有 30 天內**未處理**的可疑紀錄（`dragon_flags`，排除 `gold_rate`、`parse`、`market_big`、`sig`）→ `market_list`／`market_buy`／`vault_put` 拒絕（`market hold`）。
  管理頁把紀錄按「已處理」就恢復。單筆 ≥ 5,000 萬成交 → 買賣雙方各記一筆 `market_big`（只提醒）。三個函式在 `anticheat.sql` 重新定義（內容同原本再加檢查）。
- **② 本機存檔加密＋簽章（`guard.js`）**：localStorage 存的是 `'DS1' + 初始值 8 位 + 簽章 28 位 + base64(XOR 後的 UTF-8)`。初始值由內容的雜湊算出（**同樣內容一定得到同樣文字**：cloud.js 用文字比對判斷本機有沒有變動），
  金鑰流 mulberry32、雜湊 cyrb53。所有讀寫存檔的地方改用 `saveParse(raw)`／`saveEncode(text)`（save.js、cloud.js、raid.js）。
  - 讀檔（`loadGame`）：簽章不符 → 照樣能玩，`guardFlag('本機存檔簽章不符')`；內容被改 → 解不出 JSON → 和原本一樣顯示存檔損毀。
  - 舊的未加密存檔：啟動時 `saveFormatMigrate`（main.js）轉成加密並記 `dragonSlayer_sv`；之後再出現未加密的存檔＝被換過 → 照樣能玩、標記。
    更新後一週內（`GUARD_SIG_GRACE` 2026-10-26 前）不標記：同一台裝置同時開著的舊版分頁會把存檔寫回未加密格式。
  - 匯出碼也是 `DS1…`；匯入時簽章不符 → 標記。舊的 base64 匯出碼：存檔時間早於 `GUARD_SINCE`（2026-10-20）才不標記。
- **③ 雲端存檔簽章（`guard.js` ＋ `anticheat.sql`）**：玩家可以拿自己的登入憑證直接呼叫 Supabase API 改 `dragon_saves`（RLS 允許改自己的列），交易所又是讀雲端存檔，所以要伺服器能驗：
  - `cloudPushSlot` 上傳時 `data.sig = guardCloudSig(uid, slot, player)`＝SHA-256(`GUARD_SIG_KEY|帳號|欄位|等級|經驗|金幣|inv:…|st:…|eq:…`)，每件道具 `uid,id,n,ench,q,詞綴k:v/…`、裝備依欄位名排序（`guardSaveCanon`）。
  - 伺服器 BEFORE trigger `dragon_saves_sig` 用 `dragon_save_sig()` 以同樣規則重算，結果存在新欄位 `dragon_saves.sig_ok`（玩家改不了）。不符 → 該角色不能上架、購買、存入共用倉庫（`save signature`），並記 `sig`（24 小時一筆，不用處理：送來簽章正確的存檔就自動恢復）。
    沒有簽章的存檔（舊版遊戲）在 `dragon_sig_grace()`（2026-10-26 台灣時間）之前視為正常。
  - 下載（`cloudSync`、`cloudUseCloudSlot`）時 `guardCheckCloud` 也驗（瀏覽器算不出 SHA-256＝不是 https 時跳過）：被改過（或寬限期後沒簽章）→ 在那份存檔記標記，避免「API 改完 → 遊戲下載 → 遊戲重新簽章」洗白。
  - ⚠️ `GUARD_SIG_KEY`（guard.js）與 `dragon_sig_key()`（anticheat.sql）、`guardSaveCanon` 與 `dragon_save_canon()` 必須一致，改一邊就要改另一邊並請使用者重跑 SQL。數字以 `JSON.stringify` 的寫法比對（等於 jsonb `->>`），極小的小數（1e-7 這種）會對不上，目前存檔沒有這種值。
- **④ 記憶體數值偽裝（`guardWrap`）**：`player.gold／exp／lv／statPoints／elixirs` 改成 getter／setter，數字拆成 64 位元兩半各 XOR 亂數存放＋另一組亂數的檢查碼，每次寫入換亂數。
  修改器（GameGuardian、Cheat Engine）搜尋數值找不到；兩份對不上 → `guardFlag('記憶體數值被修改（欄位）')`。程式照舊寫 `player.gold += n`，`JSON.stringify` 照樣存出數字。
  套用點：`applySaveData`（讀檔、匯入）、`createPlayer`、`offline.js` 試算後從快照還原。團隊副本、人物卡等暫時物件不套。
- **標記**：`player.integrity = { flagged, reason, at }`（同一原因 24 小時一次）。存在存檔裡，上傳後 trigger `dragon_tamper_audit` 記 `tamper`（同一個 reason＋at 只記一次，管理者處理後不會重複出現）→ 觸發 ① 的交易所門檻。
  gm.html 類別名稱多了 `tamper` 遊戲偵測到改檔、`market_big` 交易所大額交易。遊戲端錯誤訊息在 `marketErrText`（`market hold`、`save signature`，共用倉庫也用它）。
- **⑤ 混淆（`tools/build.js`）**：做法同修仙（修仙 ARCHITECTURE.md 第 72 節）：40 支 JS 接成 `data/game.js` 包進 `(function(){…})()`＋terser，`onclick` 用到的 139 個函式與 `chatDraft` 掛回 window，其餘（`player`、`hunt`、`cloudSb`…）主控台碰不到；
  `FORBIDDEN`（player、hunt、session、cloudSb、cloudUser）出現在事件字串會建置失敗。gm.html 的 config／classes／cloud 接成 `data/gm-lib.js`。dist 不含 `*.md`、`tools/`、`.claude/`、`.bat`、原始 `data/*.js`。
  根目錄 `tools/build.js` 最後一行呼叫 `buildDragon(dist/屠龍勇者)`（修仙的建置結果不變，已比對 0 差異）。**網站要由 GitHub Actions 發佈 dist 才會是混淆版**（修仙第 72 節：Pages 來源設 GitHub Actions）。
- **要使用者做的事**：發佈後到 Supabase SQL Editor 執行 `tools/anticheat.sql`（可重複執行；也附在 `supabase.sql` 最後）。沒執行前：遊戲照常、上傳多帶 `sig` 欄位也不影響，只是伺服器還不會檢查。
- **驗證**：
  - 本機 PostgreSQL 16（模擬 auth）：整份 `supabase.sql`＋`anticheat.sql` 可重複執行；被標記帳號買不到、處理後買得到；≥5000 萬記兩筆、小額不記；`gold_rate`／`market_big`／`sig` 不觸發門檻；tamper 同事件只記一次；
    瀏覽器算的簽章＝資料庫算的（含小數、空裝備欄、詞綴）；遊戲 `cloudPushSlot` 送出的資料 `sig_ok=true`；直接改金幣 → `sig_ok=false`、上架與存入倉庫被擋、記 `sig`；寬限期內沒簽章放行；玩家不能呼叫內部函式。
  - Playwright（開發版）：存檔是 `DS1…`、看不到明文；狩獵 600 秒、存讀檔數值一致；偽裝數值 16000 次讀寫（整數／小數／負數／大數）不誤判；匯出匯入通過、改過的匯出碼標記；舊存檔轉換不標記；換成未加密存檔、只改簽章 → 標記；改內容 → 存檔損毀；
    下載被改的雲端存檔 → 標記、正確的不標記、寬限期前沒簽章不標記；離線試算後仍有偽裝。
  - Playwright（`node tools/build.js` 後的 dist）：`typeof player` 為 undefined、`player.gold = …` 出現 ReferenceError；建角（按鈕）、11 個分頁、重新整理後繼續、實際狩獵 25 秒（金幣、經驗增加）、gm.html 開啟；畫面上所有 on* 事件的函式都在 window；Console 無錯誤。
- **還沒做／限制**：離線收益的離開時間仍以玩家裝置時間計算（12 小時上限、伺服器 `clock` 規則會標記快 10 分鐘以上的存檔）；加速器（加快 `Date.now`）在伺服器 5～10 倍門檻以下抓不到；排行榜沒有排除 `sig_ok=false` 的存檔。

## 61. 省 Supabase 傳輸量：聊天依活躍程度輪詢、交易所列表快取（2026-10-19，版本 `20261019r`；`chat.js`、`market.js`）

- 使用者問交易所能容納多少人 → 免費方案最先碰到的是每月傳輸量（約 5GB，整個遊戲共用）→ 使用者要求先做不花錢的省流量。
- **聊天**（`chat.js`）：原本就只抓比手上最新一則更新的訊息（`gt('id', 最後一則)`），不用改。改的是輪詢間隔：原本聊天分頁或左下角聊天框開著就固定每 4 秒抓，
  玩家常開著聊天框掛機好幾小時。現在 `chatPollGap()`：最近 1 分鐘「有動靜」→ 4 秒（`CHAT_POLL_MS`）、1～5 分鐘 → 10 秒（`CHAT_POLL_IDLE_MS`）、更久 → 30 秒（`CHAT_POLL_AWAY_MS`）。
  有動靜（`chatTouch`）＝收到別人的新訊息、自己按鍵打字或發送、打開聊天分頁／聊天框、切頻道。計時器每 2 秒檢查一次；從背景切回前景（visibilitychange）馬上抓一次。背景時照舊不抓。
  估計：開著聊天框但沒人說話時，請求數約為原本的 1/7。
- **交易所**（`market.js`）：購買頁列表快取 `marketCache`（key＝分類、搜尋字、排序、頁數），`MARKET_CACHE_MS` 60 秒內同樣條件直接用手上的資料（切分類、換排序、翻頁、切分頁回來都不重抓）。
  自己購買、上架、下架後清空快取；購買頁新增「🔄」按鈕（`marketRefresh`）強制重抓。每 3 分鐘的入帳檢查若交易所開著會順便更新列表（那時快取已過期）。「我的上架」不快取。
- **還可以省的**（沒做）：團隊副本大廳每 3 秒輪詢（只有在隊伍裡時）、世界首領分頁每 15 秒。

## 62. 手機狀態欄一直閃：常更新的區塊改成只改有變的節點（2026-10-19，版本 `20261019s`；`ui.js` 的 `setHtmlStable`／`morphChildren`）

- 使用者回報「手機版狀態欄會一直閃爍」。原因：地圖左上角狀態（`buffIconsHtml`，增益剩餘秒數每秒變）與快捷欄（`renderHotbar`，冷卻秒數、數量每 250ms 檢查）內容一變就整塊 `innerHTML` 重建，
  裡面的圖示 `<img>` 每次都是新元素，手機重新解碼時會空白一下＝閃爍；剩 10 秒的閃爍動畫也一直從頭開始。
- `setHtmlStable(el, html)`：內容跟上次一樣就不動；不一樣時把新 HTML 解析成 template，`morphChildren` 逐一比對節點：同種節點只改文字與屬性、種類不同才換掉、多的刪掉、少的補上。
  `src` 沒變的 `<img>` 留著同一個元素，不會重新載入。第一次（`el.dataset.html` 還沒有）直接 `innerHTML`。
- 用在：`updateHuntLive` 的 `#hunt-buffs`（ui-panels.js）、`renderHotbar` 的 `set`（hotbar.js；PC `#hotbar` 與手機 `#skill-bar`）。這三個區塊不能再用別的方式直接改 `innerHTML`（`dataset.html` 會跟畫面對不上）。
- 驗證（手機 375 寬）：喝綠水後 3.5 秒內狀態列秒數 5:00 → 4:56，圖示 `<img>` 與快捷欄 3 個圖示都是同一個元素；Console 無錯誤。

## 63. 路引改成路邊木頭路牌（2026-10-19，版本 `20261019t`；`ui-scene.js` 的 `gateSigns`／`drawSignpost`）

- 使用者嫌第 50 節的地圖指引箭頭太雜亂，要簡單一點。做了樣本圖並排（A 現在／B 簡約白線箭頭／C 深色小路牌／D 路邊木頭路牌，在沉眠龍窟洞口三岔路，PowerShell 疊在 `wild.jpg` 上畫），使用者選 **D**。
- 規則：
  - **只顯示離開目前地圖的出口**（以前兩邊的箭頭都畫，三岔路口一次 6 個）。
  - `gateSigns(zone)`：目前地圖的路引（第 50 節 `bigMapGates` 算好的 `scene.gates`）4 格內的合成一根木柱；柱子立在路引中心 2 格內最近的「不能走的格子」（路邊），沒有就立在中間。
    每個目的地一塊木板（同一個目的地只留一塊）：方向以左右為主＝尖頭木板指過去，以上下為主＝寫「↑ 地名」「↓ 地名」。結果存在 `SCENE_BGS.wild._signs[地圖]`。
  - `drawSignpost(ctx, 腳底x, 腳底y, boards)`：腳下陰影＋深褐木柱＋淺木色漸層木板＋深褐字（10px 粗體），等級比目的地建議下限低 5 級以上用暗紅字。不發光、不晃動。
  - 路牌加進角色／怪物的 y 排序（actors），角色走到路牌後面會被擋、走到前面會蓋住路牌。
- 以前的 `drawGates`（地上光暈＋上下晃的發光箭頭＋地名＋等級）已刪除；**小地圖**上目前地圖出口的閃爍小箭頭不變（`drawGlowArrow` 仍在用）。
- 驗證：手機畫面沉眠龍窟洞口外路牌「← 腐朽礦坑・上層／↑ 低語海岸」；11 個地圖的路牌分組都正確（例：焦骨峽谷 5 根、迷霧古林 7 根）；PC 模式繪製無錯誤；Console 無錯誤。

## 64. 外框背景網址修復（2026-10-20，版本 20261020b）

- 修正 20261020a 更新版本號時誤刪 CSS url() 結尾的問題：封面、手機外框與疊圖、PC 外框與遮罩共 6 處；恢復 border-image-source 的分號。避免背景與外框失效、畫面下半段黑色。
- 更新版本號時只取代版本號本身，不可吞掉 CSS 的右括號與分號；除既有 check.ps1，也要檢查 CSS 圖片網址完整。

## 65. 永夜之塔十王專屬材料（2026-10-20，版本 `20261020c`）

- items.js 新增十種 material；可堆疊，重量 1、回收價 2,000 金幣，暫無鍛造配方。舊永夜之魂與持有物保留，不改存檔結構。
- monsters.js 新增 TOWER_BOSS_MATERIALS，順序與 TOWER_BOSSES 對應；守關首領原掉落不變，額外掉落其專屬材料 1～2 個（掉落率依第 66 節改為 0.1%）。普通塔怪不掉此材料。
- codex.js 的 codexSources 登記每種材料的樓層與首領名稱；載入順序不變。

| 樓層 | 首領 | 材料 | ID |
|---|---|---|---|
| 10F | 巨大牛人 | 巨大牛人之角 | towerBullHorn |
| 20F | 黑暗女妖 | 黑暗女妖之淚 | towerBansheeTear |
| 30F | 炎魔之影 | 炎魔之影核心 | towerFlameCore |
| 40F | 冰之女王 | 冰之女王冠冕碎片 | towerIceCrown |
| 50F | 巫妖王 | 巫妖王命匣碎片 | towerLichCrystal |
| 60F | 墮落的大天使 | 墮落大天使之羽 | towerFallenFeather |
| 70F | 混沌之主 | 混沌之主核心 | towerChaosCore |
| 80F | 深淵領主 | 深淵領主之眼 | towerAbyssEye |
| 90F | 死神 | 死神鐮刃碎片 | towerDeathShard |
| 100F | 冥法軍王 | 冥法軍王之印 | towerKingSeal |

## 66. BOSS 材料統一極低掉落率（2026-10-20，版本 `20261020d`）

- 使用者指定全部 BOSS 材料統一 0.1%。config.js 新增 BOSS_MATERIAL_DROP_P = 0.001，monsters.js 的 16 種既有材料及十王專屬材料共 26 種皆引用此值。
- combat.js 的 rollDrops 對首領 material 固定使用此機率，不乘異界掉落加成；團隊副本沿用 rollDrops，每人各自判定。掉落成功後數量維持原設定，非每千次保底。其他類別掉落不變。
- codexSources 顯示材料掉落率 0.1%；既有材料、配方及存檔結構不變。

## 67. 低語墓窟併入大地圖（礦坑上層南邊；2026-10-20，版本 `20261020e`）

- 使用者給一張 1254×1254 的地下墓穴俯視圖（中央圓形祭壇廣場、北邊神殿、X 形石橋通往四周墓室、南邊長階梯，四周懸崖黑霧），說「新增低語墓穴地圖」。
  問過後決定：當**低語墓窟** `islandDungeon`（Lv.8～18，怪物、掉落、任務都不變）的地圖、**併入大地圖**、放在**腐朽礦坑・上層正南方（往下加一排）**、接縫之後由使用者用 AI 補畫。
- 素材：原圖是 webp（System.Drawing 讀不了），用 WPF `BitmapDecoder`（Windows 內建 WebP 解碼）轉成 `tools/bigmap/crypt.jpg`。
- `build-map.ps1`：畫布高 3584 → **4768（149 列）**；墓窟畫成 1280×1280（40×40 格，原圖約 1.02 倍）放在 (160, 3488)＝格子 x 5～44、列 109～148，上緣與礦坑上層下緣重疊 3 格（兩邊各自淡入）。
  region 清單多了選填的第 7、8 欄＝寬高（墓窟是正方形）。南排三張原本寫 `$H - $RH`，改成固定 `$SouthRowY = 2793`。新多出的一排其他地方由填充補（西邊森林、東南沙漠）。小地圖改 400×317。圖 `?v=8`、`h: 149`；`wild.jpg` 約 4.6MB。
  ⚠️ PowerShell 變數不分大小寫：第一版用 `$SY` 被森林填充迴圈的 `$sy` 蓋掉、礦坑畫到北邊；`$rw`／`$rh` 也會蓋掉 `$RW`／`$RH`，已改名。比對舊圖：列 0～3380 像素完全相同，只有礦坑最下緣 200px 因為現在要淡入而改變。
- 可走範圍（`walk.json` 同步抄進 `SCENE_BGS.wild`）：礦坑上層的 walk 從 [0,88,47,111] 改成到 **108 列**（下面是墓窟），擋格 [20,108,23,111] 改 [20,108,23,108]。墓窟：
  北邊兩個出口 [8,108,10,110]（左上房間）、[41,108,43,110]（右上寶物房）；左上房間 [8,111,14,113]＋西北石橋（階梯狀 6 段）接廣場；神殿平台 [19,113,29,114]＋北階梯 [24,115,25,118]；
  中央圓形廣場（列 120～128 依圓形逐列）；西邊骨龕房 [7,119,14,122]＋西南石橋＋墓園 [6,127,18,138]；東北石橋＋右上寶物房 [36,111,43,114]；東邊石棺廳 [35,120,43,123]＋[37,124,43,129]；
  東南石橋＋圓形墓室 [37,134,42,139]；往南中軸路 [24,127,26,148]＋階梯平台 [21,142,29,143]。
  擋格：神殿石棺與雕像、廣場北邊雕像 [24,119,25,119]、中央祭壇 [23,122,26,126]、廣場兩側雕像、骨龕房石棺、寶箱、石棺廳三組石棺、墓園枯樹與鐵欄、圓形墓室石棺與石柱。
  可走 10065 格全部能從草原出生點走到（墓窟 856 格）。整個新的一排 [0,109,187,148] 加進 `noocc`（墓窟很暗，不當成樹冠遮擋），重跑 `build-occ.ps1`。
- `regions`：礦坑上層 rect 改 [0,88,47,108]；最後加 低語墓窟 [0,109,47,148]（中心 25,124、出生 25,128＝廣場南邊）。路牌自動產生 2 根：(7,111)、(42,112) 都是「↑ 腐朽礦坑・上層」。
- `zones.js`：`islandDungeon` 加 `bg: wild`（原本的地監格子畫面不再用）。大地圖現在包含 **12 個地圖**（第 57 節的 11 個＋低語墓窟）。
- 接縫（第 58 節的流程）：`patches.json` 加 15／16 礦坑上層下緣↔墓窟上緣（西半／東半，水平，at 3530、band 90，**兩個出口要畫成往下的石階**）、17 墓窟左邊↔森林（at 190、band 90）、18 墓窟右邊↔森林（at 1420、band 60）；
  補畫區刻意窄（band 150 會把神殿和左上房間一起重畫掉）。已切好 `seams/todo/15～18*.png`，等使用者 AI 補畫存進 `seams/fixed/` 再重跑 `build-map.ps1`（AI 新畫的障礙要補擋格，圖 `?v=` 加 1）。
  另外修正 `seam-cut.ps1` 第 22 行兩個敘述黏在同一行（存 orig 圖與 `$g = …`）的語法錯誤，以前那版跑不起來。
- 驗證（本機）：從低語港傳送到低語墓窟 → 大地圖、出生在廣場南邊、區域「低語墓窟」、怪是侏儒戰士等墓窟的怪；從墓窟走西北出口到礦坑上層（地圖換 gludio1）、再走東北出口回墓窟（換回 islandDungeon）；
  掛機 20 秒有擊殺、怪全部生在墓窟範圍（418 次取樣 0 次在外面）；手機 375×812 世界地圖看得到低語墓窟與兩個出口；`node tools/build.js` 的 dist 能建角、傳送到墓窟、畫面正常。Console 只有預覽環境註冊 SW 的已知訊息。
- **接縫補畫完成**（版本 `20261020f`）：使用者用 AI 補好 15～18（2048×2048，存成 `todo/<id>.jfif`，複製成 `fixed/<id>.jpg`），`seam-check.ps1` 四張最佳位移都是 0,0（差異 7.2～11.3）。重跑 `build-map.ps1`、`build-occ.ps1`，圖 `?v=9`。
  （同一張 15 號使用者先後生了兩版讓我選：第一版整張重畫、礦坑和墓窟都換掉，差異 49.7 且位移 16,20，不能用；用的是保留原圖、只畫交界的那版。）
  可走範圍照新畫的東西改：
  - 西邊出口：AI 在礦坑邊緣畫了一道往左下走的寬石階（兩旁石柱、火把），原本的左上房間被畫成岩壁 → 出口改成 [8,108,10,108]、[7,109,9,109]、[6,110,8,110]、[5,111,7,111]、底部平台 [4,112,8,113]、接西北石橋 [8,113,11,114]；拿掉 [8,108,10,110] 與房間 [8,111,14,113]。
  - 東邊出口：石階從礦坑往左下走到寶物房那塊亮平台，寶箱被石階蓋掉 → 出口改成 [42,107,44,108]、[41,109,44,110]、[40,111,43,111]，平台 [36,111,43,114] 改 [37,112,43,114]，拿掉 [41,108,43,110] 與寶箱擋格 [40,112,42,113]。
  - 左側接縫把墓園最左邊 x 6～8 畫成長青苔的岩壁 → 墓園 [6,127,18,138] 改 [9,127,18,138]、西南石橋尾 [6,126,10,127] 改 [9,126,10,127]。
  - 可走 10026 格全部走得到（墓窟 817 格）。神殿後牆上方被畫出一個像門洞的黑色開口，不能走（使用者知道，沒有要求重畫）。
  驗證：本機從墓窟廣場走西邊石階上到礦坑（9,105）、走回廣場、再走東邊石階上到礦坑（42,105），地圖依序切換；角色站在西邊石階上截圖，路牌「腐朽礦坑・上層」在石階旁；dist 版進墓窟正常；Console 只有預覽環境註冊 SW 的已知訊息。
  走石階時路徑會沿著礦坑第 108 列斜切，可能在交界來回切換一次地圖（訊息「📍 進入」多一則），不影響遊戲。

## 68. BOSS 附魔與永夜之魂封存（2026-10-20，版本 `20261020g`，schema 5）

**20261024af新增第26種「劇毒侵蝕」**：`spiderVenom`（蛛后毒囊），8%命中觸發、8秒冷卻、每秒30% B魔法傷害，共6次；不疊層、重施重置，BOSS有效並計MR。沿用材料100萬與封魂／裝回各50萬；後端目錄與中毒綠霧已接，詳第127節。以下25種為原始技能資料，全部保留。

### 使用者核定與費用

- 25 種戰鬥附魔＋永夜之魂封存。每把武器限一種，消耗對應材料 ×1，100% 成功；全職業可用，武器本身職業限制不變。
- 一般地區 BOSS：1,000,000；塔 10～50F：2,000,000；塔 60～100F：4,000,000；四龍：5,000,000。封魂、裝回各 500,000 金幣。
- 封魂消耗永夜之魂 ×1，移除武器附魔，新增「技能名封魂石」；裝回消耗對應封魂石 ×1，最後一個用完即從背包移除。原武器強化、詞綴、共鳴保留。
- 覆蓋前提示原技能會消失；要保留先封魂。確認時檢查原角色、武器目前附魔、地點、金幣與材料，操作同步完成，重複確認不會再次移轉。

### 入口、儲存及相容性

- 村莊鍛造師 → BOSS 附魔 → 選擇背包或裝備中武器 → 展開技能預覽 → 材料附魔／封魂石裝回；已有附魔時可封存。背包封魂石亦有「選擇武器裝回」按鈕，限村莊。
- 武器實體新增 bossEnchant（材料 id），角色共用冷卻為 player.cds._bossEnchant；不因換武器重置。schema 5 遷移保留舊裝備，移除非武器或未定義的附魔值；封魂石使用靜態 soul_材料id，cat material，可按技能堆疊，重量 1、回收價 0。
- 存檔完整保存欄位；交易所與共用倉庫沿用整個實體移轉。雲端簽章格式與 SQL 不動（目前 guardItemCanon 不包含新增 bossEnchant 欄位，未宣稱已具伺服器端附魔防改檔驗證）。
- 物品說明顯示技能、機率、冷卻、傷害與費用；圖鑑列封魂來源。一鍵賣出排除附魔武器，單件賣出要確認。

### 戰鬥規則與實作

- B = round(等級 + max(武器小大型平均骰值＋傷害加成, SP×3))，最低 1。物理附魔扣除 max(0,-怪物AC/5)，岩刺忽略其中 15%；魔法受 MR 減傷。第一版無暴擊、吸血、職業剋制再乘及連鎖觸發。
- 普攻命中、直接攻擊魔法或物理技能命中觸發；物理範圍／多段技能以 bossEnchantBegin／Hit／End 集中為一次抽選，共鳴技能不進附魔入口。
- 範圍以當時位置半徑 2.5 格、最多五個存活戰鬥目標；離線／副本無地圖座標時用當前戰鬥目標集合。火域、砲擊、裂爆固定在觸發時的位置，離開可避開。冥王追擊每 250ms 一擊、目標死後停止。
- bossEnchantRuntime 放 hunt，記錄 owner、武器 uid／附魔 id、延遲／持續事件、護盾；bossEnchantTick 依 gameNow 推進。換武器、離戰、換怪群會清除短期效果，冷卻保留。
- 減益存在怪物 bossEnchantDebuffs，同類取較強而非累加；綁定施放者與武器。BOSS 免定身／暈眩，緩速上限此技能 10%，降低傷害／攻速／治療量效果減半。烙印強化目標後續受到的附魔傷害，共享首領時隊友也受益，取最高值不疊加；不強化普通／職業技能。
- bossEnchantMoveFactor 接入怪物移動；bossEnchantAttackFactor 接入怪物普攻間隔；bossEnchantEnemyDamage／Absorb 接入一般攻擊、首領紅圈、團戰吐息。bossEnchantEnemyHeal 提供減療入口，目前沒有怪物主動治療招式，不影響脫戰重置。
- huntTick 及 raidSimulate 每步推進附魔事件，正常擊殺照原流程結算；副本持續傷害計入施放者輸出。
- drawBossEnchantEffects：原創畫布圓陣、火柱、冰晶、風刃／幻影抽象弧線、技能名；最多六個短期特效。技能不鎖角色動畫；SIM_MODE 不畫。狩獵狀態列沿 resonanceChip 顯示附魔冷卻。

### 25 種技能資料

| 材料 ID | 技能 | 機率 | 冷卻 | 傷害類型 | 效果 |
|---|---|---|---|---|---|
| treantHeart | 古樹荊棘 | 8% | 8 秒 | 魔法 | 主目標 90% B、附近各 45% B；一般怪定身 1 秒，BOSS 緩速 10%／2 秒。 |
| drakeFang | 裂地岩刺 | 7% | 7 秒 | 物理 | 主目標 150% B、另外最多兩個目標各 50% B；忽略此次正數物理減傷量的 15%。 |
| baphometHorn | 地獄火柱 | 6% | 9 秒 | 魔法 | 主目標 180% B、附近各 70% B。 |
| pirateTreasure | 幽靈砲擊 | 6% | 10 秒 | 物理 | 0.8 秒後砲擊原位置，範圍各 120% B；敵人離開範圍可避開。 |
| demonHeart | 噬魂黑炎 | 7% | 9 秒 | 魔法 | 立即 60% B，之後 4 秒每秒 40% B；目標存活至燃燒結束時回復自身 HP 2%。 |
| wyvernWing | 疾風連刃 | 8% | 7 秒 | 物理 | 三道風刃各 60% B，優先分散；只有一個目標時集中。 |
| osirisSeal | 冥界封咒 | 8% | 10 秒 | 魔法 | 主目標 130% B；造成傷害降低 8%／4 秒，BOSS 降低 4%。 |
| frostCrystal | 冰王碎晶 | 7% | 8 秒 | 魔法 | 主目標 170% B；攻擊速度降低 12%／3 秒，BOSS 降低 6%。 |
| ifritFlame | 煉獄火域 | 6% | 12 秒 | 魔法 | 原位置留下火域 4 秒，每秒範圍各 40% B；離開火域不受傷。 |
| forgottenRelic | 遺忘烙印 | 7% | 10 秒 | 魔法 | 主目標 140% B；之後 5 秒受到附魔傷害提高 12%，不提高普攻或職業技能；團隊共享首領時隊友也受益，同類取最高。 |
| giantSoul | 巨人崩擊 | 5% | 12 秒 | 物理 | 主目標 260% B、附近各 80% B；一般怪暈眩 0.8 秒，BOSS 免疫。 |
| antharasScale | 地龍震怒 | 6% | 14 秒 | 物理 | 自身周圍各 130% B；獲得 HP 上限 5% 護盾／4 秒，不疊加。 |
| fafurionScale | 水龍海嘯 | 6% | 14 秒 | 魔法 | 範圍各 140% B；自身接著 3 秒每秒回復 HP 上限 1%。 |
| lindviorScale | 風龍風暴 | 7% | 12 秒 | 物理 | 五道風刃各 45% B，優先分散；只有一個目標時集中。 |
| valakasScale | 火龍吐息 | 5% | 15 秒 | 魔法 | 範圍立即各 120% B，之後 3 秒每秒 30% B，不疊層。 |
| towerBullHorn | 蠻牛震擊 | 8% | 8 秒 | 物理 | 主目標 140% B、附近各 60% B；一般怪暈眩 0.5 秒，BOSS 免疫。 |
| towerBansheeTear | 女妖哀嚎 | 7% | 10 秒 | 魔法 | 範圍各 80% B；造成傷害降低 6%／3 秒，BOSS 降低 3%。 |
| towerFlameCore | 炎魔爆燃 | 7% | 9 秒 | 魔法 | 範圍立即各 60% B，之後 4 秒每秒 25% B，燃燒跟隨敵人、不疊層。 |
| towerIceCrown | 冰后寒獄 | 7% | 10 秒 | 魔法 | 範圍各 110% B；移動速度降低 30%／3 秒，BOSS 降低 10%。 |
| towerLichCrystal | 死亡纏繞 | 7% | 9 秒 | 魔法 | 立即 90% B，之後 5 秒每秒 30% B；治療效果降低 30%，BOSS 降低 15%，不影響脫戰回血。 |
| towerFallenFeather | 墮天裁決 | 6% | 10 秒 | 魔法 | 主目標 210% B、附近各 50% B。 |
| towerChaosCore | 混沌裂爆 | 6% | 13 秒 | 魔法 | 1 秒後在原位置爆炸，範圍各 170% B；敵人離開範圍可避開。 |
| towerAbyssEye | 深淵侵蝕 | 10% | 4 秒 | 魔法 | 每層每秒 12% B，持續 10 秒；同一施放者最多三層，各自計時。 |
| towerDeathShard | 死神收割 | 7% | 10 秒 | 物理 | 主目標 150% B；命中時 HP 低於 25% 改為 300% B，並非直接處決。 |
| towerKingSeal | 冥王追擊 | 6% | 12 秒 | 魔法 | 1 秒內追擊主目標四次，每次 65% B；目標死亡後停止，不轉移。 |

### 檢查與待驗收

- tools/test-boss-enchant.js：不讀寫玩家存檔、不連雲端；涵蓋 25 種技能、全費用、材料／封魂石消耗、重複確認、品質保留、舊新存檔、每次行動只抽一次、共鳴隔離、冷卻、護盾、控場、位置閃避、圖鑑／介面、25 種副本模擬、25 種離線量測還原與團隊烙印。
- 專案 check.ps1 通過 ALL CHECKS PASSED（此執行環境的 PowerShell 原生程序未設定 LASTEXITCODE，先初始化為 0；另直接執行 Node 檢查）。實際 buildDragon 混淆建置通過。
- 尚待使用者實際手機／PC 畫面、材料附魔→封魂→換武器裝回的操作驗收，以及長時間各職業數值平衡；未發布。

## 69. BOSS 材料單次數量固定一個（2026-10-20，版本 `20261020h`）

- 使用者指定 BOSS 材料及永夜之魂單次只掉一個。monsters.js 中全部 BOSS 材料的 n 統一 [1,1]，包括四大龍鱗、永夜之魂與十王專屬材料，共 26 種。
- 每種材料仍各自獨立以 0.1% 判定，不受異界加成；本次調整成功時的數量，不改成互斥抽選。團隊副本沿用相同掉落表。其他裝備／通貨數量、既有持有材料及附魔費用不變。
- 已驗證 26 種材料的機率與數量，附魔整合測試及 check.ps1 通過；尚未發布。

## 70. Google Analytics 4 造訪統計（2026-10-20）

- 與凡塵修仙傳共用 GA 串流「我的網站」（評估 ID `G-TM576GBMKF`，根目錄 ARCHITECTURE.md 第 90 節），在 GA 報表可用網頁路徑 `/-username-.github.io-/屠龍勇者/` 區分兩款遊戲。
- `index.html` 的 gtag 程式碼**必須放在清除 `#access_token` 那段腳本之後**：先清網址列的登入憑證，GA 才記錄網址，避免憑證被送到 Google。
- 只送預設頁面瀏覽，不送存檔／帳號資料；只改 HTML，不換 `?v=`；`sw.js` 只處理同源請求，不影響。gm.html 不放。

## 71. 五種 BOSS 專屬特效與遊戲內預覽（2026-10-20，版本 `20261020i`）

- 2026-10-21：另收到五張完整動畫原圖，保存在 `tools/sprite-src/boss-vfx/`，屬開發原始素材，尚未接入播放；幽靈砲擊及紫紅雙色死神含底色，整合前須處理透明度與分格。原圖保留不覆寫。

- 2026-10-21 補齊 `20261020j` 已引用的 `images/vfx/boss-enchants.png`：使用者提供原圖，RGBA PNG 1374×1145，6 欄×5 列，每格 229×229；五列對應 BOSS_VFX_IDS 順序。bossVfxAtlas 共用載入，bossVfxSprite 播放與交淡六格；圖片載入失敗時回退程序動畫。本次僅補圖片與文件，未改 JS。圖片納入 Git 後隨 images 發佈。

- 使用者選定先植入：蠻牛震擊、冰后寒獄、幽靈砲擊、死神收割、冥王追擊。以原創 Canvas 程序動畫實作，無新增圖片、無更動傷害／機率／費用／存檔結構。其他二十種保留原本火柱／冰晶／弧光等特效。
- 新檔 data/boss-vfx.js，index 載入於 boss-enchant 後、player 前；BOSS_VFX_IDS 指定五種，bossVfxDuration／Point／Ellipse／Ray／Paint 為純繪圖函式。
- 蠻牛：金棕色擴散衝擊波、分叉裂紋、碎石彈起。冰后：藍白法陣、九道冰刺、雪點，腳下冰霜跟隨存活敵人，持續至三秒結束。
- 幽靈砲擊：先畫青色落點圈，bossEnchantTick 真正執行 800ms 延遲傷害時發出 impact 事件，移除預警並畫爆炸、幽靈煙塵與碎片；不以繪圖時間自行造成傷害。
- 死神：大型鐮刀、兜帽殘影，execute 在傷害前依實際斬殺條件快照，只有低於 25% HP 時使用暗紅色，其他為紫色。
- 冥王：帶王冠、面甲、肩甲及靈劍的半透明幻影放在角色後方；四次斬光由各 hit 工作真正造成傷害前發出 slash（index 0～3），目標死亡不再出光。100ms 步進時命中為 100／300／500／800ms。
- bossEnchantVisual 接受 options（phase、pos、targets、index、execute），畫面事件最多十六個，不寫入存檔，SIM_MODE 不生成。
- sceneDraw 依序：地面特效→首領紅圈→冥王背後幻影→人物怪物→前景特效→名字／血條→飄字；不加入震屏、不鎖人物動作。
- 村莊鍛造師 → BOSS 附魔 → 五個「特效預覽」按鈕。openBossEnchantPreview 開啟 Canvas 循環預覽；死神每輪切換一般／斬殺色。bossVfxPreviewRun 與 canvas.isConnected 防止切換／關閉後繼續繪圖。drawBossVfxPreview 只畫示範剪影，不生成角色、不扣道具、不讀寫存檔、不連雲端。
- tools/test-boss-enchant.js 擴充：全部五種動畫在邊界時刻的 Canvas 指令有限座標／透明度／save-restore、預覽前後玩家完全相同、砲擊傷害與事件同步、四連斬時序、斬殺條件快照、冰霜跟隨、前後景呼叫。既有 25 附魔功能與離線／副本模擬仍執行。
- 驗證：五種特效與既有附魔整合測試通過，check.ps1 顯示 ALL CHECKS PASSED；42 支腳本實際混淆建置通過。尚待使用者手機／PC 實際觀感驗收，未完成瀏覽器截圖或裝置效能量測。

## 72. 五套獨立附魔動畫圖（2026-10-21，版本 `20261021a`）

- 使用者指定五套原圖各配自己的代表特效：bull→蠻牛震擊、ice→冰后寒獄、ghost→幽靈砲擊、death→死神收割、king→冥王追擊。原圖均有透明度，直接複製使用，未採用生成或去背後版本。原始檔永久保留於 tools/sprite-src/boss-vfx/。
- BOSS_VFX_SHEETS 對應檔名、bossVfxImages 各圖快取。bossVfxSprite 依各圖自然尺寸切 4×4 格、保留每格寬高比；載入失敗仍回退原程序動畫。舊 boss-enchants.png 保留但不再引用。
- 蠻牛與冰后各十六格按原特效期間播放；幽靈前四格在 800ms 預警播放，真正 impact 事件後播放後十二格；死神一般播放上半八格紫色、低血量播放下半八格紅色，不再調色模擬。冥王十六格幻影在人物後方，保留各次真實傷害事件產生的前景斬光；原本目標死亡停止後續命中的規則不變。
- 僅調整繪圖，技能傷害、機率、費用、存檔及 script 載入順序不變。
- tools/test-boss-enchant.js 增加真實 PNG 尺寸與成功載入分支測試，驗證切格不越界、比例、紫紅分段及預警／爆炸分段。附魔整合測試與 check.ps1 全通過。本機 Node 預覽伺服器已啟動 8790；瀏覽器工具發生 session 錯誤，未完成實際畫面與 Console 驗證，待使用者驗收後 commit。

## 73. 全部 25 種附魔專屬圖片動畫（2026-10-21，版本 `20261021b`）

- 使用者要求剩餘二十種程式特效也改成圖片動畫。使用內建 imagegen 各自產生二十張原創 RGBA 透明 PNG，皆為 4×4 十六格；不使用商業作品素材。提示詞、輸出來源名稱與對應路徑保存於 tools/sprite-src/boss-vfx/generated-prompts.json。沿用先前五張使用者原圖，不覆寫素材。
- BOSS_VFX_SHEETS 擴充至二十五種、BOSS_VFX_IDS 由該表產生。bossVfxImages 仍按需快取，不一次下載所有圖。全部 25 種在村莊鍛造師 BOSS 附魔均可無消耗預覽；按鈕區限高 180px 並可捲動。script 載入順序不變，沒有新增遊戲資料 JS。
- 新二十種各播放十六格，保持原先一般特效 1400ms。混沌裂爆例外：前四格配合 1000ms 蓄力，bossEnchantTick 真正觸發 impact 後才播後十二格，預覽使用同樣分段。原五種時序、紫紅雙色與冥王前後景不變。圖片未載好／失敗時保留程序動畫備援。
- bossEnchantOnHit 將原本傷害中心 center 同步傳給繪圖，地龍震怒畫在角色周圍；不改傷害範圍、數值、機率、費用、技能冷卻或 SAVE_SCHEMA。

| 附魔 | 圖片（images/vfx/） | 外觀 |
|---|---|---|
| 古樹荊棘 | treant.png | 翡翠荊棘根藤牢籠 |
| 裂地岩刺 | rock-spikes.png | 裂地岩錐與碎石 |
| 地獄火柱 | hell-pillar.png | 橙紅火柱與地面法陣 |
| 噬魂黑炎 | soul-flame.png | 紫黑火焰吞噬靈魂 |
| 疾風連刃 | gale-blades.png | 三道翠綠風刃 |
| 冥界封咒 | nether-seal.png | 金色封印與青色幽冥鎖鏈 |
| 冰王碎晶 | ice-shards.png | 藍白冰晶爆裂 |
| 煉獄火域 | inferno-field.png | 環形熔岩火域 |
| 遺忘烙印 | forgotten-mark.png | 古代遺物與紫色烙印 |
| 巨人崩擊 | giant-smash.png | 巨石靈拳砸地 |
| 地龍震怒 | earth-dragon.png | 翡翠龍影與岩鱗護罩 |
| 水龍海嘯 | water-dragon.png | 藍龍浪潮與水珠 |
| 風龍風暴 | wind-dragon.png | 綠龍旋風與風刃 |
| 火龍吐息 | fire-dragon.png | 赤龍錐形烈焰 |
| 女妖哀嚎 | banshee.png | 女妖面孔與聲波環 |
| 炎魔爆燃 | flame-burst.png | 熔火核心爆裂 |
| 死亡纏繞 | death-coils.png | 骷髏與紫綠死靈纏繞 |
| 墮天裁決 | fallen-judgment.png | 黑羽雙翼與金紫裁決劍 |
| 混沌裂爆 | chaos-burst.png | 紫色晶核蓄力後爆裂 |
| 深淵侵蝕 | abyss.png | 深淵之眼與暗影觸鬚 |

- 新增隔離預覽頁 tools/vfx-preview.html，載入 config 和 boss-vfx，不載入 main、save、cloud；vfxGalleryDraw 只畫二十五張 Canvas，可暫停及調播放位置。不建立角色、不讀寫存檔、不連雲端，tools 排除於發佈包。獨立 BOSS_ENCHANTS 名稱表僅供該工具頁使用。
- 驗證：25 附魔功能／副本／離線模擬、25 種無消耗預覽與備援動畫、25 張真實 PNG 分格與比例、混沌 999ms 不爆炸／1000ms 實際傷害與圖片事件同步、地龍中心全部通過；20 張新增圖皆有透明角落。check.ps1 顯示 ALL CHECKS PASSED，實際 42 檔混淆建置成功，26 張 PNG（含保留的舊共用圖）完整進發佈包。
- 瀏覽器隔離預覽已載入 25／25 圖片；以未登入的全新本機角色實際進村莊鍛造師，逐一點開 25 個預覽並核對標題，金幣仍 300。兩頁 Console 無 error／warn，測試角色未登入／未上傳；待使用者實玩與觀感驗收後 commit，再由使用者 Push origin。

## 74. 十類視覺特效與強化武器光效（2026-10-21，版本 `20261021d`）

### 範圍與素材

- 使用者要求十類全部製作，並明確選擇「只做視覺特效，缺少的機制先保留預覽」。新增十二張原創透明 RGBA PNG，位於 images/vfx/world/；每張四欄四列，每一列是一款特效的四格動畫，共 48 款。十二職業各一組代表特效，不宣稱每一招技能都有獨立圖片。
- 使用內建 imagegen；完整提示詞及生成來源在 tools/sprite-src/boss-vfx/world-prompts.json，原始輸出仍保留於生成目錄。沒有使用官方作品圖，也沒有覆寫原有角色／25 附魔素材。
- WORLD_VFX_ROW_CUTS 記錄原圖略有差異的列界，依原始 1254 高度等比取樣，避免相鄰列混入；WORLD_VFX_ROWS 的四列依左至右播放，worldVfxPaint 交淡相鄰格並保留透明度、長寬比與 Canvas 狀態。圖片按需快取，失敗退回淡色圓環。

| 類型 | 圖集 | 四列內容／接法 |
|---|---|---|
| 武器強化 | weapon-glow.png | ＋1～5 銀白、＋6～8 金色、＋9～11 青藍、＋12～15 紫金；＋0 無強化光，等級越高越亮，出手時增亮 |
| 附魔外觀 | weapon-element.png | 火焰、寒霜、雷光、幽冥；依目前武器 BOSS 附魔名稱分類 |
| 普通攻擊 | attack.png | 刀劍殘影、斧／鈍器重擊、槍口火光、箭矢拖尾；命中時繪圖，遠程短距離插值不延遲傷害 |
| 暴擊與防禦 | impact.png | 實際暴擊、閃避、反擊分別觸發；盾牌格擋僅預覽，沒有新增格擋機率 |
| 職業技能 | class-a／b／c.png | 騎士／黑妖／妖精／惡魔、王族／戰士／槍手／魔鬥士、法師／聖騎士／天使／修羅；施放攻擊技能顯示，排除共鳴重複觸發 |
| 治癒與增益 | support.png | 治癒、回魔、加速、護盾；技能與藥水的既有事件觸發，部分增益存續時有淡光 |
| 負面狀態 | status.png | 燃燒依現有火焰持續傷害工作、冰霜依有效緩速、星環依暈眩顯示；中毒僅預覽，不憑名稱增加毒傷 |
| 首領大招 | boss.png | 龍息、裂地、隕石、冰霜；首領紅圈保留且畫在蓄力圖上方，實際到期事件才出爆發。隕石／共用冰系法術也可用對應圖片，不新增首領招式 |
| 稀有掉落 | loot.png | 裝備、首領材料、稀有道具、傳說品質；成功入袋後顯示，過濾自動賣／超重失敗不顯示。仍是自動拾取，沒有新增地上可撿道具 |
| 升級與成長 | progress.png | 升級光陣、天使羽翼增益、51 級起能力點成長星環接既有事件；突破法陣僅預覽 |

### 架構與效能

- 新 data/world-vfx.js 於 boss-vfx 後、player 前載入；載入階段僅建立靜態表與讀本機顯示偏好，player／hunt／scene 在執行期使用。
- 靜態全域：WORLD_VFX_ROWS、WORLD_VFX_GROUPS、WORLD_VFX_CLASS、WORLD_VFX_ROW_CUTS、WORLD_VFX_DEFS；快取／顯示狀態 worldVfxImages、worldVfxQuality、worldVfxPreviewRun。
- 圖片／繪圖 helper：worldVfxImage、worldVfxPaint、worldVfxPosition；事件入口 worldVfxEmit、worldVfxAttack、worldVfxSkill、worldVfxSupport、worldVfxBoss、worldVfxEnemy、worldVfxLoot。設定與預覽入口 setWorldVfxQuality、worldVfxSettingsHtml、worldVfxPreviewButtons、openWorldVfxPreview、drawWorldVfxPreview。
- scene.worldVfx 僅為瞬時繪圖佇列，綁角色 owner，使用 gameNow，換場重建 scene 即清除；SIM_MODE 不產生事件。低／中／高分別最多 8／16／24 個事件；常駐狀態另限 4／6 隻怪，低檔關閉武器及持續光效。
- drawWorldVfx 的地面層在首領紅圈之前，前景在角色之後、名字血條之前。drawWorldWeapon 在 drawPlayer 的 body 內，跟著人物鏡像及遮擋；沿朝向和出手估算手邊掛點，尚待各職業、武器與動作的實玩精修，並非逐像素追蹤武器。
- 只有 combat／player 的原事件增添純視覺呼叫，沒有改傷害、暴擊／閃避機率、掉落、強化機率、技能費用、冷卻或任何亂數流程。SAVE_SCHEMA 不變。
- 設定 → 視覺特效有低／中／高及十類特效預覽，48 個按鈕可捲動；格擋、中毒、突破均明示僅預覽且 worldVfxEmit 拒絕其戰鬥事件。品質僅存在本機獨立 key dragonSlayer_vfxQuality，不新增 player 欄位。
- tools/world-vfx-preview.html 載入 config／world-vfx，提供十類篩選、暫停與播放位置，不載 main／save／cloud。工具頁 worldGalleryDraw 只畫 Canvas，不建立角色、不修改存檔。tools 排除發佈，生成紀錄及測試也不發佈。

### 驗證與待驗收

- tools/test-world-vfx.js：48 款／10 類／12 職業與三款預覽限定、12 張真實 PNG、取樣邊界、有限座標／透明度／save-restore、預覽與常駐繪圖前後角色完全相同、SIM 隔離、事件上限／過期、普攻／暴擊／治癒／閃避／首領到期與掉落接線通過。25 附魔／副本／離線整合測試仍通過，check.ps1 顯示 ALL CHECKS PASSED。
- 瀏覽器隔離頁 12／12 圖集載入；未登入的既有本機測試角色實際從設定逐一切換 48 款預覽，低／中／高按鈕切換正常，金幣 300 與藥水不變，Console 無 error／warn。沒有新增／上傳測試數值，也沒有動正式存檔。
- c 版工作期間已被外部提交至 main／origin/main；列距修正及最終調整另更新 d，避免重用已提交的版本。待使用者確認畫面可接受後 commit，再由使用者 Push origin。
- d 版實際 43 檔混淆建置成功，十二張新圖集全數進入發佈包，合併後 JS 語法通過；建置輸出保留在本機暫存目錄。最終隔離預覽頁 12／12 載入、Console 無 error／warn。

## 75. 自訂購買數量與 PC 面板加高（2026-10-21，版本 `20261021e`）

- 商店每件商品新增「自訂」，保留原本 ×1／×10／×100 快捷鍵。openShopBuy 開啟數字輸入視窗；shopBuyQuantity 僅接受 1 以上的安全整數字串，shopBuyPreview 即時顯示總價及超量提示，shopBuyLimit 依金幣、負重與安全整數金額計算最多可買數量。
- shopBuyCustom 呼叫既有 buyItem；成功回傳 true 才關視窗，金幣／負重不足或輸入無效保留視窗。buyItem 本身也驗證整數與金額溢位，所有快捷購買共用。對話框保留開啟時角色與村莊，確認時已換角色／離村則拒絕。裝備沿用 addItem 逐件建立，不改售價、存檔欄位與 schema。
- index.html 的 PC #overlay 頂端從原圖 y 300（多視窗 120）移到 y 40，底端仍 y 816，單視窗高度 516→776（約增加五成）；地圖、商店等標準分頁及二／三視窗皆適用。原有 sticky 標題、各自捲動、關閉鍵與人物大面板規則保留；手機樣式不變。
- 新增開發工具 tools/test-shop-buy.js（遊戲及發佈包不載入）：隔離角色、禁止寫存檔／連線，驗證自訂 37 個、逐件裝備、金幣／負重限制、最大購買量、非法輸入／金額溢位、離村後拒絕舊視窗。
- 瀏覽器以既有未登入的本機測試角色確認商店輸入 37 顯示總價 740、最多 15 個；輸入 0 購買提示修正，金幣仍 300、藥水仍 30，未執行有效扣款。PC 地圖面板已實際加高，三視窗並排各有關閉鍵，地圖／技能可捲動；Console 無 error／warn。有效扣款由隔離 VM 測試驗證，待使用者實玩驗收後 commit。
- tools/test-shop-buy.js 與 check.ps1 全通過（ALL CHECKS PASSED）；實際 43 支腳本混淆建置完成，合併後 JS 語法通過。

## 76. 戰鬥訊息框固定左下與系統按鈕下移（2026-10-21，版本 `20261021g`）

- 使用者確認要修正左下骷髏頭的戰鬥訊息框。renderLogPop 原先不分畫面模式，會把訊息框貼在 hunt-ctrl 上方；PC 永夜之塔上下樓／取消步行按鈕在左上，使訊息框被推高，甚至超出畫面。
- PC 不再寫入依操作列推算的 bottom，並清除舊的 inline bottom，回用既有左下 CSS（原圖 left 92、bottom 290、width 760、height 330）；手機仍貼在底部操作列上方。僅修定位，不改聊天入口、面板高度、戰鬥及存檔。
- tools/test-log-drawer.js 隔離 DOM 回歸通過：PC 頂端操作列不影響定位、清除舊位置、手機避開操作列、關閉及切頁恢復 CSS；不讀寫真實存檔、不連雲端。
- 使用者另指定左側系統按鈕擋住地名／buff。ui-frame.js 的 PC_SLOTS 六顆 side 按鈕由原圖 y 38／104／170／236／302／368，統一下移 222 至 260／326／392／458／524／590，尺寸、順序與功能不變；整排位於增益圖示下方，底端 y 648 仍在血球與底部列上方。第 19、32 節記載的舊 y 值由此取代。
- 最終 g 版瀏覽器本機 PC 1280×720：第一顆系統按鈕 top 169px（原 27px），地名及 buff 區 top 51px 留出空間，訊息框 x 59／y 320，Console 無 error／warn；既有未登入測試角色金幣與藥水不變。check.ps1 與定位回歸測試通過。永夜之塔的頂端操作列以隔離 DOM 測試驗證，仍待使用者實際在塔內驗收。

## 77. 獨立掉落紀錄分頁（2026-10-21，版本 `20261021h`）

- 使用者指定左下訊息框「聊天」右邊新增「🎁 掉落紀錄」。index.html 新增 lp-tab-loot／hunt-loot；標題分頁可換行以容納窄畫面。chat.js 的 logPopTab／setLogPopTab／syncLogPopTab 擴充 loot，沿用本機 dragonSlayer_logTab 記住分頁；不觸發聊天輪詢。
- player.js 新全域 lootLog、addLootLog(msg, cls)。20261021i 依使用者更正，掉落／自動賣出只寫 lootLog，不再重複寫入 gameLog；獨立編號 lootLogSeq，保留最近 120 筆，攻擊洗頻不影響；SIM_MODE 不寫獨立紀錄。只存在記憶體，重新進入角色（enterGame）清空；不改 player 存檔或 SAVE_SCHEMA。
- combat 的成功入袋與戰利品過濾自動賣出改用 addLootLog；前者明列 ×數量並保留品質／詞綴，超重未取得不記。giveMap（隨機地圖／異界通關獎勵）、questOnKill 的收集任務道具亦接入。商店／倉庫／交易所／任務回報獎勵不混入打怪掉落，不更改掉率／亂數／數值。
- ui-panels.js 新 lastLootRendered、renderLootLog：依最後掉落編號更新靜態 hunt-loot、自動捲到底，所有文字 esc；無紀錄時說明本次遊戲與 120 筆限制。renderLogPop 沿用定位並依分頁選擇渲染，enterGame 同步三分頁顯示。
- tools/test-loot-log.js 整合測試通過：真實掉落／數量、超重排除、自動賣出、傳說、地圖、任務、戰鬥洗頻獨立、120 筆上限、SIM 隔離、HTML 跳脫、三分頁與重新進入清空。瀏覽器既有未登入角色實際切換三分頁，掉落空狀態／聊天登入提示／戰鬥紀錄互不混入，Console 無 error／warn；未修改或上傳角色數值。

## 78. 泰坦墓穴併入世界地圖（2026-10-21，版本 `20261021m`）

- 使用者選擇由助手製作原創墓穴。內建 imagegen 生成 `tools/bigmap/titan-tomb.png`，提示詞在 `titan-generated.json`；世界東南原空白區新增 1504×1504 區塊，原點像素 [4512,2080]，格子範圍 [141,65,187,111]，整體仍 188×149 格（6016×4768）。
- `giantTomb` 加 `bg:'wild'`，對應泰坦墓穴 Lv.72～88；世界分區中心 [164,88]、出生 [164,89]，西側連腐朽礦坑深層及金字塔南側通路。怪物、費用、掉落與建議等級維持原設定。
- `SCENE_BGS.wild` 的 walk／block 與 `tools/bigmap/walk.json` 同步，新增 846 格可走地面，雕像／石棺／龍骨擋路；世界區名、小地圖與雙向路牌沿用既有系統。
- 原 `wild.jpg`／mini／occ 保留，遊戲改讀新檔 `wild-titan.jpg`、`wild-titan-mini.jpg`、`wild-titan-occ.png`。`build-map.ps1`、`build-occ.ps1`、`check-mask.ps1` 新增可選 MapStem（預設仍 wild）；本次用 wild-titan，避免覆寫舊世界素材。
- `tools/test-titan-map.js` 驗證 846 格與舊區連通、出生、200 次怪物分區取樣、雙向路牌、區域切換及原數值；隔離預覽 `tools/titan-map-preview.html`。

## 79. 十二職業武器光效貼合（2026-10-21，版本 `20261021m`）

- 使用者回報多職業光效偏離武器，要求全部檢查。常駐武器光由估算手邊的大圖集，改為目前角色動畫格的實際透明像素遮罩；共用 `WORLD_WEAPON_AREAS`、`worldWeaponPixel`、`worldWeaponMask`、`worldWeaponMasks`（最多 192 格快取）。
- 每職業／方向指定武器所在範圍，搭配鋼鐵／金色／青藍／紫／紅／木色判別；王族正面用窄線段範圍避開白披風。攻擊／施法／受傷各選範圍，畫面看不見武器時不補浮空光圈。這是原圖局部像素辨識，身體與武器同色相接的地方仍可能需要依玩家實玩微調。
- `sceneDraw` 把實際 image／sprite／row／frame／dw／dh／action 傳給 `drawWorldWeapon`，在同一個角色鏡像與遮擋流程內畫光，跟隨走路、出手及受傷。原四階強化色、附魔色與低畫質關閉設定保留；不動數值及人物原圖。
- `tools/weapon-glow-preview.html` 左原圖、右 +15，含四動作與四朝向，全部 733 動畫格透明度檢查；`tools/inspect-weapon-sprites.ps1`／`weapon-sprite-specs.json` 為來源動作表檢視工具。先前檢查 733 格載入與遮罩透明度通過，實際手部位置仍待使用者驗收。

## 80. 全遊戲原創道具圖片（2026-10-21，版本 `20261021m`）

- 使用者提供 24 張道具總覽作風格參考，要求依名稱補武器、裝備與缺圖道具。全部新圖用內建 imagegen 原創生成，沒有裁用或複製商業遊戲參考圖。16 張 4×4 透明原稿共 255 格，再補一張精靈餅乾，存 `tools/icon-src/items/`；提示詞、來源及順序記在 `item-art-generated.json`、`item-art-single.json`、`item-art-batches.json`，盤點在 `item-art-inventory.json`。
- `images/icons/items/<id>.png` 共 256 張，每張 128×128 透明 PNG，各 id 獨立圖片。涵蓋 68 武器、71 裝備、6 藥水／餅乾、9 卷軸、4 彈藥、1 萬能藥、51 材料／封魂石、23 任務道具、8 通貨及 15 異界地圖。144 魔法書沿用對應技能圖；勇敢／慎重／藍色藥水沿用原圖。全 403 件皆有圖片。
- `icons.js` 新 `ITEM_IMG`（道具 id → 同名檔案）與 `itemThumbHtml(id)`；`imgIconHtml` 新可選 ext（預設 jpg），道具 PNG 用 png；`itemIconHtml` 先新圖，再魔法書技能圖，再原藥瓶／SVG 備援。新增道具未配置時仍可正常顯示備援。
- 接入背包、角色裝備、商店、道具介紹、圖鑑、回收、角色／共用倉庫、交易所清單、鍛造及地圖改造。`codexIcon` 沿用資料物件找 id，再呼叫統一道具圖；已裝備共鳴狀態仍保留技能圖，方便區分增益與道具外觀。純圖片與介面，存檔 schema、裝備數值、價格、掉率皆不變。
- `cut-item-art.ps1` 依 alpha 連通區辨識圖示與刀尖，分類到原 4×4 格，合併離散碎片後等比例縮至 112px、置中在 128px，避免生成圖微越格被裁斷；不覆寫已存在原稿與道具圖。`cut-single-item-art.ps1` 裁餅乾，`item-art-contact.ps1` 可產四張附名總覽。
- `tools/test-item-art.js` 隔離載入真正遊戲檔，驗證全部 403 件圖片存在、256 新圖尺寸與內容不重複，並核對背包／商店／裝備／介紹／圖鑑 HTML 接線；`tools/item-art-preview.html` 可分類／名稱搜尋並列載入與缺圖數，不載存檔或雲端。

## 81. 怪物名稱移到腳下（2026-10-21，版本 `20261021m`）

第 78～81 節最終驗證：check.ps1 全通過；道具／購買／掉落／訊息框／地圖／48 特效回歸通過；43 檔混淆建置與合併 JS 語法通過、256 張新圖進發佈包。瀏覽器圖庫 403／403、裝備 71／71、缺圖 0；背包／商店／角色裝備隔離預覽正常，Console 無 error／warn；十二職業最終 733 格遮罩透明度及載入錯誤 0。真實角色戰鬥與所有職業位置仍由使用者實玩驗收。

- 使用者回報怪物名字與玩家名稱重疊。`sceneDraw` 的怪物名稱／等級統一畫在 sy+29，即腳底 sy+13 下方 16px；包含目標、精英、首領與 emoji 備用外觀。
- 血條留頭頂，玩家名稱位置、名稱顏色、只有目標／精英顯名、怪物點選範圍、戰鬥及數值不變。名稱與血條仍最後疊畫在人物／前景特效上。
- `tools/scene-label-preview.html` 使用真正 sceneDraw 顯示三種怪物與相鄰玩家，已確認名稱位於下方；僅隔離記憶體角色，不讀寫真實存檔、不接雲端。

## 82. 英雄防具七部位補齊（2026-10-21，版本 `20261021n`）

- 使用者指定英雄防具每部位補 2 件，已有英雄的部位只增 1 件。以第 20 節的圖鑑品級為準：頭盔／盔甲／斗篷原各 1 件，新增各 1；盾牌／內衣／手套／長靴原各 0 件，新增各 2，合計新增 11 件，七部位各有 2 件英雄防具（共 14 件）。英雄飾品維持 4 件，武器維持 68 種。
- 定義直接加入 `items.js` 的 ITEMS，沒有增加全域表或載入檔案。新物品皆 cat armor、safe 4、可強化，無職業限定／共鳴／額外技能。依下表區分近戰與法術選擇；數字為未強化基礎值。

| id／名稱 | 部位 | 基礎屬性 | 重量 | 回收價 | 隨機掉落怪物等級 |
|---|---|---|---:|---:|---:|
| duskWarHelm／暮鋼戰盔 | 頭盔 | 防禦 4、MR 10、HP 50 | 60 | 36,000 | 60 起 |
| abyssGuardMail／深淵守衛戰甲 | 盔甲 | 防禦 9、MR 8、HP 90、減傷 1 | 200 | 48,000 | 80 起 |
| moonveilCloak／月影秘法披風 | 斗篷 | 防禦 2、MR 12、SP 2、回魔 2 | 12 | 36,000 | 60 起 |
| dawnBastionShield／黎明壁壘之盾 | 盾牌 | 防禦 5、MR 12、HP 70 | 90 | 42,000 | 70 起 |
| frostMirrorShield／霜鏡法盾 | 盾牌 | 防禦 4、MR 18、SP 2 | 65 | 45,000 | 75 起 |
| runeSilkTunic／符文絲織內衣 | 內衣 | 防禦 2、MR 8、SP 1、MP 40 | 12 | 30,000 | 50 起 |
| titanWeaveTunic／泰坦紋戰衣 | 內衣 | 防禦 3、體質 1、HP 70 | 20 | 36,000 | 60 起 |
| bloodOathGauntlets／血誓護手 | 手套 | 防禦 3、力量 1、傷害 1、HP 30 | 30 | 36,000 | 60 起 |
| astralWeaveGloves／星紋秘法手套 | 手套 | 防禦 2、智力 1、SP 2、回魔 1 | 15 | 39,000 | 65 起 |
| galeStalkerBoots／疾風獵行靴 | 長靴 | 防禦 3、敏捷 1、命中 1、閃避 3% | 20 | 36,000 | 60 起 |
| stoneWardBoots／磐岩守護戰靴 | 長靴 | 防禦 4、MR 8、HP 60、減傷 1 | 45 | 42,000 | 70 起 |

- 全部無商店售價，回收價在 30,000～79,999 的英雄範圍。沿用 `randomEquipFor`（非限定、非共鳴、回收價 ≤ 怪物等級 ×600），自動進高等怪物的既有隨機裝備池；不新增指定怪物掉落表、配方或機率，原 1.5%／首領 50% 隨機裝備事件沿用。池擴大後各單品分攤機率隨候選數調整。圖鑑自動列出對應 Lv.50～80 起的來源；掉落時的魔法／稀有／傳說詞綴品質仍另擲，與圖鑑英雄品級分開。
- `ui-panels.js itemDescHtml` 與 `codex.js codexDetailHtml` 補 MP 顯示，讓新內衣的 MP +40 可見；其餘屬性沿用既有計算、裝備限制、存檔及圖鑑，SAVE_SCHEMA 維持 5。舊存檔不需轉換，既有裝備數值不動。
- `icons.js ITEM_IMG` 加 11 id；內建 imagegen 原創生成 4×4 圖集，前 11 格有圖、後 5 格透明；原稿 `tools/icon-src/items/hero-armor-01.png`，來源／提示詞／順序在 `tools/hero-armor-art.json` 並加入既有總清單。沿用透明連通區裁切成 11 張獨立 128×128 PNG，不覆寫舊圖。圖庫新增「英雄防具」分類，列部位；縮圖總覽改依件數自動增加頁數。
- 當前總數：150 種裝備（68 武器＋53 防具＋29 飾品＝82 非武器裝備），全部 ITEMS 414 件；圖片 267 張新原創圖＋144 魔法書技能圖＋3 原藥水＝414。圖鑑英雄品級共 36 件（18 武器＋14 防具＋4 飾品）。
- `tools/test-hero-armor.js` 隔離載入真正資料與函式，核對七部位各 2、原英雄飾品不變、11 件皆進實際掉落選池、圖鑑來源／MP、穿脫能力、盾牌與雙手武器互斥。`tools/test-item-art.js` 更新為 414 件／267 張；道具圖片、商店購買、掉落分流測試及 check.ps1 通過。瀏覽器英雄防具篩選 14 件／14 圖載入、缺圖 0；不讀寫真實角色、不連雲端。尚待使用者實玩驗收後提交。


## 83. 十二職業傳說武器與兩套傳說防具（2026-10-21，版本 `20261021o`）

- 使用者要求每職業一種傳說武器、防具一共兩套。沿用第 20 節圖鑑品級（回收價至少 80,000），保留原 5 把傳說武器，新增 7 把，十二職業各有一把不同且可實際穿戴的代表武器。沒有新增職業獨佔限制，相容武器類型的其他職業也可使用；既有共鳴特效與數值不變。

| 職業 | 代表武器 id／名稱 |
|---|---|
| 王族 | dragonSlayer／屠龍劍 |
| 騎士 | infernoBlade／熾焰魔劍 |
| 法師 | tidalStaff／潮汐之杖 |
| 妖精 | galeBow／颶風之弓 |
| 黑暗妖精 | eclipseDual／蝕月雙刃 |
| 修羅 | rakshasaClaw／羅剎滅魂爪 |
| 戰士 | earthRender／大地裂斧 |
| 槍手 | starfallGun／星隕魔導槍 |
| 魔鬥士 | thunderRuneSword／雷霆符文劍 |
| 聖騎士 | dawnJudgmentHammer／黎明裁決之錘 |
| 天使 | seraphSpear／熾天使之矛 |
| 惡魔 | infernalSoulScythe／煉獄噬魂鐮 |

- 防具採兩個系列，每系列頭盔／盔甲／斗篷／盾牌／內衣／手套／長靴各 1 件；不是新增套裝加成玩法。龍裔守護偏生命／防禦／力量，星風秘法偏魔防／魔力／法術。保留既有龍鱗鎧、大地守護者之盾、風神之靴的屬性與共鳴，只補系列說明；其餘新增 11 件，傳說七部位各 2 件，共 14 件。飾品不變。雙手武器不能持盾、修羅／槍手／惡魔不能用盾等既有規則保留。

| 新增 id／名稱 | 種類 | 未強化基礎屬性 | 重量 | 回收價 |
|---|---|---|---:|---:|
| eclipseDual／蝕月雙刃 | 雙刀 | 傷害 25／24、命中 6、爆擊 6% | 45 | 100,000 |
| rakshasaClaw／羅剎滅魂爪 | 鋼爪 | 傷害 27／26、命中 5、力量 2 | 40 | 100,000 |
| starfallGun／星隕魔導槍 | 槍 | 傷害 28／30、命中 9、敏捷 2 | 95 | 100,000 |
| thunderRuneSword／雷霆符文劍 | 單手劍 | 傷害 25／27、命中 5、SP 5 | 70 | 100,000 |
| dawnJudgmentHammer／黎明裁決之錘 | 鈍器 | 傷害 26／29、命中 5、精神 2 | 100 | 100,000 |
| seraphSpear／熾天使之矛 | 矛 | 傷害 25／30、命中 6、SP 5 | 65 | 100,000 |
| infernalSoulScythe／煉獄噬魂鐮 | 鐮刀 | 傷害 30／33、命中 5、吸血 4% | 85 | 100,000 |
| dragonWardHelm／龍裔戰盔 | 頭盔 | 防禦 5、MR 15、HP 80 | 65 | 90,000 |
| dragonWingCloak／龍翼守護披風 | 斗篷 | 防禦 4、MR 18、HP 60 | 30 | 85,000 |
| dragonHeartTunic／龍紋護心衣 | 內衣 | 防禦 4、體質 2、HP 100 | 25 | 80,000 |
| dragonFangGloves／龍牙護手 | 手套 | 傷害 2、防禦 4、力量 2 | 40 | 85,000 |
| dragonWardBoots／龍裔重靴 | 長靴 | 防禦 5、MR 12、HP 80、減傷 1 | 65 | 90,000 |
| starwindCrown／星風法冠 | 頭盔 | 防禦 3、SP 3、MR 20、MP 60 | 15 | 90,000 |
| starwindRobe／星風法袍 | 盔甲 | 防禦 7、SP 4、MR 22、MP 80 | 40 | 100,000 |
| starwindCloak／星風披風 | 斗篷 | 防禦 3、MR 20、回魔 3 | 12 | 85,000 |
| starwindShield／星風法盾 | 盾牌 | 防禦 6、SP 3、MR 22 | 50 | 95,000 |
| starwindTunic／星風符文內衣 | 內衣 | 防禦 3、智力 2、MP 80 | 10 | 80,000 |
| starwindGloves／星風手套 | 手套 | 防禦 3、智力 2、SP 3、回魔 2 | 12 | 85,000 |

- 新增 18 定義直接放 items.js 的 ITEMS，武器 safe 6、防具 safe 4，無新全域資料或 script 載入調整。全部有對應原創 128×128 透明 PNG，ITEM_IMG 登記新 id，沿用背包／角色／圖鑑／鍛造等統一入口。
- **取得方式**：18 件皆加入 RECIPES；武器用既有基底＋對應龍鱗 ×5＋高階材料，手續費 80,000；防具用既有基底＋龍鱗 ×4＋高階材料，手續費 60,000。精確配方在 items.js／legend-equipment-art.json 與圖鑑來源。不增怪物掉落、不改既有掉落率；回收價超過現有隨機掉落等級上限，因此沒有誤列「隨機裝備」。保留原有五武器／三防具的既有取得方式。
- 圖片逐件由 built-in image_gen 原創產生，原稿 tools/icon-src/items/<id>.png，提示詞及來源保存在 legend-equipment-art.json／item-art-single.json；沒有裁用商業參考圖、不覆寫舊素材。cut-single-item-art.ps1 依透明內容置中縮成 128×128，總清單與縮圖工具同步納入。
- 工具頁 legend-equipment-preview.html 顯示 12 職業武器與兩套防具，使用真正 selectCodex／codexDetailHtml 檢查介紹與來源；僅隔離 SIM_MODE 記憶體角色、不讀寫存檔或接雲端。item-art-preview.html 新增「傳說武器／傳說防具」分類。
- 當前 168 種裝備＝75 武器＋64 防具＋29 飾品（93 非武器裝備），ITEMS 432；圖鑑傳說共 28＝12 武器＋14 防具＋2 飾品。新原創圖片 285＋144 魔法書技能圖＋3 既有藥水＝432。SAVE_SCHEMA 維持 5。
- test-legend-equipment.js 隔離驗證十二職業代表武器實際穿戴、兩套完整部位與防禦穿脫、18 件材料不足不扣款／成功鍛造扣料扣款、圖鑑來源／圖片與雙手武器持盾限制。既有英雄防具與全道具圖片測試更新總數。待使用者實玩驗收後才提交／推送。

第 83 節驗證：test-legend-equipment／test-item-art／test-hero-armor／test-shop-buy／test-loot-log 全通過；check.ps1 ALL CHECKS PASSED（44 檔語法、43 script 版本一致）；最終混淆建置與合併 JS 語法通過、285 張 PNG 全數打包。瀏覽器隔離頁顯示 26／26 圖、缺圖 0，已打開雷霆符文劍介紹核對傷害／SP／安定與鍛造材料、關閉正常，Console 無 error／warn；兩系列七件並排預覽正確。未修改真實存檔、未上傳測試角色。本機待驗收，尚未 commit／Push。


## 84. 全部傳說裝備呼吸光暈（2026-10-21，版本 `20261021p`）

- 使用者看過四款樣本後選「呼吸光暈」，要求全部傳說裝備套用。以圖鑑固定品級為準：12 武器＋14 防具＋2 飾品共 28 件。只改道具圖示，不改角色身上武器特效；隨機詞綴 q=legend 與非裝備物品不因名稱或售價而誤套。
- icons.js 的 itemIconHtml 統一檢查 ITEMS 類別為 weapon／armor 且 codexGradeOf(id).id 為 legend，原 PNG 透過 imgIconHtml(file, frame, ext, cls) 的新選用第四參數加 legend-glow class。舊呼叫全部相容，不新增全域表或改載入順序。沿用圖片與存檔，不修改數值或 SAVE_SCHEMA（維持 5）。
- index.html 的 .ico-img.legend-glow 用暗金底、細金邊、靜態小範圍陰影及 img drop-shadow 保留裝備輪廓；::before 徑向金光用 legend-item-breathe 在 2.8 秒間緩慢改 opacity 與 transform，無 JS 計時器，沒有逐格替換圖片。prefers-reduced-motion: reduce 時停用動畫並保留柔光。透明原圖全部保留，圖示大小／點擊範圍與強化數字不動。
- 因所有道具畫面都用 itemIconHtml／itemThumbHtml，背包、人物裝備、圖鑑清單／詳細、鍛造、回收、倉庫、交易所等一併套用；技能與左上共鳴狀態圖仍用原本技能圖。
- tools/legend-glow-preview.html 載入真正遊戲圖示與 CSS，列全部 28 件的大小圖；可切實際背包／角色裝備／鍛造 HTML，並點圖鑑介紹。只用 SIM_MODE 記憶體角色，略過 main／pwa／cloud，不讀寫真實存檔、不上傳。
- test-legend-glow.js 檢查全部 432 道具正確分類、28 件傳說完整覆蓋、背包與人物十件裝備、圖鑑／介紹／鍛造／小圖入口，另驗證技能、藥水、一般武器的傳說詞綴不誤套。待本機瀏覽器與使用者實玩確認，再依流程提交。

第 84 節驗證：test-legend-glow／test-item-art／test-legend-equipment 全通過；check.ps1 ALL CHECKS PASSED（44 檔語法、43 script 版本一致）；最終發佈混淆建置與合併 JS 語法、呼吸光暈 CSS 打包通過。隔離瀏覽器 28 件大小圖共 56／56 正常、缺圖 0，所有 ::before 動畫名 legend-item-breathe／2.8s；角色十格正常，背包十八件傳說發光、長劍／皮甲／木盾不發光，實際圖鑑介紹開關正常，Console 無 error／warn。待使用者真實角色實玩後提交，本助手未 commit／Push。

## 85. 怪物血量／傷害加強與永夜之塔等級提高（2026-10-21，版本 `20261021q`）

- 使用者要求：怪物血量加倍、50 等以上 ×3、70 等以上 ×5、首領 ×5；怪物傷害 +40%；永夜之塔怪物 Lv 改 `60 + 樓層×0.45`。
- 全部在 `monsters.js` 的 `buildMonster` 處理（所有怪物都經過它：野外／地監／龍穴／永夜之塔／異界／任務首領／團隊副本／世界首領），模板數值不動：
  - `monHpMul(lv, boss)`：**不疊乘，只取一個倍率**——首領（`boss: true`，含四大龍、塔守關、任務首領、稀有首領）×5；一般怪 Lv70 以上 ×5、50～69 ×3、49 以下 ×2。寫死 `hp` 的龍也乘。
  - `MON_DMG_MUL` 1.4：普攻傷害（公式或寫死的 `dmg`）與魔法 `magic.dmg` 都 ×1.4；`dmgMul` 照舊疊在上面。
  - 異界詞綴（maps.js）、團隊副本 `hpMul`、獸群 `weakenForPack` 等後續倍率照舊疊在 buildMonster 結果上。世界首領 HP 由伺服器控制，不受影響。
- `makeTowerMonster`：`lv = 60 + round(樓層×0.45)`（1F Lv60～100F Lv105，守關首領再 +3 → 最高 Lv108），`zones.js` 永夜之塔顯示等級改 `[61, 105]`。
- 例：哥布林 HP 12→24、獅身人面獸 508→1,524、奇美拉 1,221→6,104、巴風特 3,996→19,980、火龍 28,000→140,000；100F 守關冥法軍王 HP 92,000。
- 不改存檔結構、經驗、金幣、掉落。


## 86. 全套原創場景與獨立世界總覽（2026-10-22，版本 `20261022b`）

- 使用者選 A 清晰度＋B 暗黑氣氛，並明確指定世界總覽、實際可行走的所有地區、四城鎮及塔／龍穴全套重製。52 份內建 imagegen 原創素材：14 地形、4 城鎮、6 塔／龍穴、21 塔怪動作圖集、6 NPC、1 世界總覽。原稿 src／每份完整提示詞 sources／plan.json 保留在 tools/scene-rework，不複製商業遊戲圖片、不覆寫舊素材。
- **下方外框**：使用者補充要保留原本有骷髏雕飾、石框與法球的設計，已移除簡化 HUD 的 CSS；完整沿用 index.html 既有 frame-clean／frame-pc-notop 圖片與遮罩、紅藍球、狀態列、快捷欄和按鈕位置。scene-art.css 現只處理世界總覽。
- 載入順序：hotbar → scene-art → ui-scene → world-atlas → pwa → main。scene-art 載入時只建立美術配置，執行時才引用玩家／場景；ui-scene 合併 SCENE_ART_BGS 與 SCENE_ART_MONSTERS；world-atlas 讀取已建立的場景資料。
- 新全域：SCENE_ART_ROOT、SCENE_WORLD_TILES、SCENE_WORLD_WALK、SCENE_TOWN_ROLES、SCENE_ART_BGS、SCENE_DRAGON_BGS、SCENE_TOWER_ART、SCENE_ART_MONSTERS；sceneMonsterArt／drawSceneAtmosphere。地面暗角及局部暖光先畫，人物／攻擊警示／名稱／飄字後畫。gameNow 控制微光，不改戰鬥時序。
- 世界仍 188×149 格、6016×4768 像素。每列四區，47 格寬；前三列各 37 格、末列 38 格。由北往南：紫霧／古林／雪原／霜峰；沉船／河畔／峽谷／煉獄；海岸／礦坑上層／王陵／泰坦；墓窟／龍窟／礦坑深層／南境林道。重複區域沿用同一狩獵 id 與怪物、掉落設定。
- 每區中央清地＋五格寬十字道路，SCENE_WORLD_WALK 是行走唯一新來源。原 walk.json／wild-titan 等保留供歷史回復，不再與舊格子座標同步。新世界 9,786 個可走格全部連通；尋路上限改為全世界格數，避免遠程路線被舊 6,000 格上限中斷。泰坦出生 [164,92]；兩塔入口前方 [18,18]／[110,126]。
- 四城鎮 30×18，各 6 位透明 NPC，n.img 繪圖、名字／功能仍取 TOWN_NPCS；只有名牌觸發設施，身體不觸發。塔與四龍各用原創 40×24 場景，出生 [20,9]，能看見上方建築與火光。副本數值、入場條件、費用沿用。
- 塔內 20 種一般怪名稱映射 11 種圖集，十王各一張，共 21 張。每張 4×3、12 格：下／右／上走路各 2，攻擊各 2，左側鏡像。build-scenes.ps1 對透明內容統一縮放／腳底，成品 768×672，cw192/ch224；沿用原受擊、鏡像、死亡淡出與 y 排序。中文／半形樓層括號皆能解析。野外原有怪物圖片保留。
- 世界總覽 ATLAS_POINTS 為 23 個地標（19 狩獵區＋4 城鎮），與實走圖分開使用 world-atlas.jpg。中文地名、建議等級、所在地、目的地選單及縮放按鈕可操作；全圖依視窗寬高等比容納，手機可放大捲動。城鎮地標是概略製圖位置；野外玩家位置依行走座標顯示。
- world-atlas 全域函式：atlasPointName／ensureWorldAtlas／openWorldAtlas／closeWorldAtlas／toggleWorldAtlas／atlasZoom／atlasSelect／atlasWalkTo／syncWorldAtlas；狀態 atlasSelected／atlasScale／atlasStamp。按 M、點圓形小地圖都可開啟，含城鎮與副本；M／Esc／關閉鈕關閉。開地圖時不接收移動／快捷鍵，遊戲戰鬥時鐘照常。
- 野外地標只呼叫 sceneWalkNear 產生實際路線，不直接修改玩家所在地或金幣；城鎮／龍穴不能免費傳送。兩塔只帶到既有傳送師面前，仍要交談入場。小地圖依背景圖片實際比例取樣，支援非世界場景。
- 製作工具：prepare-plan.js 建立素材表；build-scenes.ps1 打包 JPG／透明 PNG，世界貼圖列高與格子完全對齊；prepare-preview.js 從正式頁生成隔離 preview.html，不載 main／PWA、以記憶體 localStorage 及禁止連外保護真實角色。test-scene-art.js 驗證全部場景、行走／出生／生怪／入口／圖集／無免費傳送；test-titan-map.js 改轉呼叫新的完整世界驗證；舊名稱工具補新依賴。
- 外部於製作期間提交 6276cfa，含 r 版進度，本助手未提交。最終修正另用 20261022b 避免快取重用；SAVE_SCHEMA 維持 5，保留 q 版 HP／傷害倍率。

## 87. 十二把傳說武器都有特殊技能（2026-10-22，版本 `20261022b`）

- 使用者先要求檢查共鳴／專屬效果；初查 28 件只有 10 有共鳴。後續明確要求傳說武器要有特殊技能，因此保留原 5 把，於 RESONANCE 補其餘 7 把 tier3、各對應職業 1.3 倍共鳴；不另創主動學習技能、魔法書或存檔欄位。

| 武器 | 新技能 | 觸發 | 基礎效果（職業加成前） |
|---|---|---|---|
| 蝕月雙刃 | 蝕月連舞 | 每命中 1 次共鳴值 +1，滿 12 點爆發 | 蝕月刃影連斬 4 下，每下 1.2 倍，分散斬向敵人 |
| 羅剎滅魂爪 | 羅剎裂魂 | 攻擊命中時 12% 觸發 | 羅剎爪影連撕目標 3 下，每下 1.2 倍傷害 |
| 星隕魔導槍 | 星隕轟擊 | 冷卻 12 秒，自動施放 | 範圍：1.8 倍砲擊，加上 35～65＋SP 的星隕魔法傷害 |
| 雷霆符文劍 | 雷霆崩解 | 每命中 1 次共鳴值 +1，滿 12 點爆發 | 範圍：1.4 倍雷刃＋35～65＋SP×1.5 魔法傷害，暈眩 0.7 秒 |
| 黎明裁決之錘 | 黎明審判 | 冷卻 12 秒，自動施放 | 範圍：80～125＋SP×2 神聖魔法傷害，對不死系 ×2 |
| 熾天使之矛 | 熾天聖裁 | 冷卻 10 秒，自動施放 | 範圍：75～120＋SP×2.2 聖光傷害，對不死系 ×1.5 |
| 煉獄噬魂鐮 | 煉獄收魂 | 每命中 1 次共鳴值 +1，滿 12 點爆發 | 範圍：1.5 倍鐮斬＋55～95＋SP×1.5 煉獄魔法傷害，可套用武器原有吸血 |

- 共鳴沿用命中集氣／proc／cd、行動後排隊結算、不耗 MP、武器卸下停用、技能本身不遞迴集氣。槍與弓的物理攻擊仍依原規則耗彈；煉獄鐮保留原 4% 吸血。既有屬性、鍛造費用、持盾限制、五把舊共鳴倍率不改。新 res 裝備自動進既有 T11～15 異界首領共鳴掉落池，池總掉落率維持原設定。
- 新全域 WORLD_VFX_LEGEND_WEAPONS 明確對應 12 把武器的既有原創圖集特效。worldVfxSkill 只對這些 res_id 解除忽略，共鳴技能出手會播放相符劍氣／爪影／星隕／雷刃／聖光／血焰，其餘共鳴照舊。沒有新增特效圖片或刪舊素材。
- 圖鑑／道具介紹／共鳴狀態列自動顯示效果與條件。傳說共 28 件不變：12 武器全部有技能、3 防具＋2 飾品有既有共鳴，另 11 防具僅基礎屬性，兩系列仍沒有套裝加成。裝備品質與共鳴階級分別判定，四龍武器可標神話共鳴，裝備圖鑑品質仍傳說。
- 工具 audit-legend-effects.js 隔離實測全部 17 件共鳴：觸發、冷卻、傷害、範圍／分散、暈眩、治療、增益、MP、卸下停用、12 特效及圖鑑；輸出 legend-effects-audit.json 與說明 LEGEND-EFFECTS.md。test-legend-equipment.js 更新新增武器必須有 res，防具沒有；原配方／穿戴測試仍保留。

第 86～87 節最終驗證：check.ps1 ALL CHECKS PASSED；test-scene-art／test-legend-equipment／audit-legend-effects／test-world-vfx／test-legend-glow／test-item-art 皆通過；45 檔混淆建置、合併語法與新圖／CSS 打包通過。隔離瀏覽器 23 場景切換、PC 全圖／縮放／關閉、390px 手機全圖與放大皆正常，Console 無 error／warn；原骷髏石框已恢復。名稱仍在怪物腳下，與玩家名重疊時稍向側方避讓並以細線指向怪物。手機檢查頁 tools/scene-rework/phone.html。待使用者真實角色實玩驗收後才提交，未上傳測試角色。

## 88. 變形卷軸（2026-10-22，版本 `20261022c` 加入、`20261022d` 改成天堂式選變身對象；`items.js` 的 `MORPHS`／`MORPH_FORMS`、`ui-panels.js` 的 `openMorphPicker`、`ui-scene.js` 的 `playerSprite`）

- 使用者先要求「新增道具 變形卷軸」（c 版：讀了固定變成巡守妖魔神射），再要求「變身卷軸用統一外觀，點選後跳出變身選項，參考天堂變身卷軸設計」（d 版）。
- 道具 `polyScroll` 只有一種：卷軸類、`buff: 'morph'`、`morph: 'wolfRanger'`（統一外觀用的圖）、30 分鐘（`sec` 1800）、重 1、原定價500、tier 1，所有職業都能用。20261022w依使用者要求暫停NPC商店販售，shopItemIds排除polyScroll，商品列表／直接購買／自訂購買入口共用此限制；既有卷軸使用、定價與回收價不改，未調整玩家交易所。
- **選變身對象**（參考天堂：讀卷軸後選要變的怪物，等級到了才能變，越高級越強）：背包「使用」、快捷欄點一下、`quickPotion` 都改成開 `openMorphPicker` 視窗，列出 `MORPH_FORMS` 9 種（名稱、需求等級、效果）；等級不夠的變灰不能點；目前變身中的那個金框、上次選的標「上次」。
  點選 → `morphPick(id)` → `usePotion('polyScroll', id)`；等級不夠或沒選對象時**不扣卷軸**。變身中視窗多一個「解除變身」（`morphCancel`，不扣卷軸）。

- **20261022e 改成使用者給的 30 種**（設計稿 `tools/MORPH-DESIGN.md`；原本 9 種骷髏～巴風特移除，舊存檔的 `lastMorph`／變身中的舊 id 查不到時當成沒選、沒加成，不會壞）。
  資料在 `items.js`：`MORPH_FORMS` 只寫 `[id, 名稱, 系別, 階級, 專屬圖]`，加成由 `MORPH_TIERS`（階級）＋`MORPH_GROUPS`（系別）算出，說明文字由 `morphFxText` 產生。選單依系別分組、標建議武器（只是提示，不限制武器），卡片左邊框與名稱用階級顏色。
- **武器限制**（2026-10-24，`20261024t`，使用者要求；`items.js` `morphWeaponErr(f, w)`）：弓手系 `need: ['bow']`、槍手系 `need: ['gun']` 一定要裝對應武器；
  單手劍系、法杖系、劍盾系 `oneHand: true`，拿雙手武器（`WEAPON_TYPES` 的 `two`：雙手劍、矛、弓、槍、鋼爪、雙刀、鐮刀）不能變。其他系不限。
  `usePotion` 讀卷軸前檢查；選單把不符合的對象變灰並寫原因，系別標題改成「需要／建議武器」與「（雙手武器不可）」；
  變身中換成不符合的武器：`buffFx` 回傳 null（效果暫停，外觀不變），狀態名稱加「（武器不符，效果暫停）」，換回來恢復。自動使用（`autoSupport`）用不了就跳下一格。
- **變身攻速最高 +20%**（`20261024z`，`MORPH_SPD_MAX`）：只有單手劍系金變「神聖裁決劍聖」原本 23%，改成 20%，其他對象不變。
- **共鳴攻速**（同版本）：狼王牙項鍊「狼嚎」攻速 15% → 8%、風神之靴「風神」攻速 20% → 8%（`resonance.js`）；同日再改風神閃避 40% → 10%（`20261024x`）。

| 階級 | 需求 | 基礎（命中／傷害／攻速） | 顏色 |
|---|---|---|---|
| 藍變・稀有 | Lv.15 | +2／+2／+6% | 藍 |
| 紅變・英雄 | Lv.35 | +3／+3／+10% | 紅 |
| 紫變・傳說 | Lv.52 | +5／+5／+15% | 紫 |
| 金變・神話 | Lv.70 | +7／+7／+20% | 金 |

| 系別（建議武器） | 偏重（k＝階數 1～4） | 對象 |
|---|---|---|
| 弓手（弓） | 命中 +k | 01 巡守妖魔神射、02 月光精靈巡林者、03 冥火骷髏神射、04 蒼穹女武神・艾爾 |
| 槍手（槍） | 命中 +k、傷害 +1、攻速 −2% | 05 矮人蒸氣火銃兵、06 暗影海盜雙槍客、07 魔導審判狙擊手 |
| 雙刀（雙刀） | 閃避 1%＋k% | 08 沉默洞穴刺客、09 赤影暗殺者、10 布魯迪卡之影、11 深淵雙刃魔神 |
| 雙手劍（雙手劍） | 傷害 +k+1、爆擊 k%、攻速 −2% | 12 鋼鐵狂戰士、13 冥皇處刑者、14 煉獄魔劍尊・巴拉卡 |
| 單手劍（單手劍） | 命中 +1、攻速 +3% | 15 亞丁榮耀劍士、16 烈焰死亡騎士、17 雷霆黑騎士統領、18 神聖裁決劍聖 |
| 法杖（魔杖） | 不加傷害攻速：命中 +k、SP／回魔 2/3/4/6、MR 5k | 19 象牙塔高階秘術師、20 深淵羊魔・巴風特使徒、21 大魔導士・巴列斯真身 |
| 拳套（空手） | 爆擊 1%＋k% | 22 修羅破戒僧、23 熔岩碎骨鬥士、24 霸天雷神拳皇 |
| 鋼爪（鋼爪） | 爆擊 k%、吸血 k% | 25 荒野血狼狂戰、26 暗夜血族撕裂者、27 裂空魔龍爪皇 |
| 劍盾（單手劍＋盾） | 傷害 −1、防禦 2/3/4/6、HP 40/80/120/200、攻速 −3% | 28 風木鐵壁重裝兵、29 薔薇聖殿十字軍、30 不滅黃金守護神・宙斯盾 |

- 攻速走 `spdMul`，跟其他攻速合計最多 30%。數值是助手先定的，使用者可再調。
- 增益紀錄 `player.buffs.morph = { src: 'item', id: 'polyScroll', form, until }`；`buffFx` 有 `form` 就回傳 `MORPH_BY_ID[form].fx`（`BUFF_DEFS.morph.fx` 是空的），`buffName` 顯示「變身：對象名」（左上角增益列的提示）。
  再讀一張會換成新對象並重新計時；死亡清除增益時一起解除；不改存檔結構（`SAVE_SCHEMA` 仍 5），上次選的對象存在 `player.settings.lastMorph`。
- 快捷欄可放、可設自動：自動時用 `lastMorph`（效果沒了就再讀一張）；還沒選過任何對象時不能開自動（提示先點一下選擇）。
- **外觀**：`playerMorph()` 取 `MORPH_FORMS` 的 `sprite`，沒有就用卷軸的 `morph`（m01～m05、m10、m16、m27有自己的圖，其餘22種先用巡守妖魔神射）。之後有某個對象的專屬圖，在 `MORPHS` 加一組圖、該對象加 `sprite: 'key'` 即可。20261022s的m16走路8×65ms＝520ms、單手斬6×80ms＝480ms，改新版圖集，其他動作及戰鬥攻擊間隔不變（第18.13節）。
- 變身圖有 `foot: [128, 200]`，畫在 `(腳底X − 128k, 腳底Y − 200k)`，k＝drawH／charH（48／160），不用格子底部當腳底；變身中不畫職業武器光效（遮罩依職業模型算）。讀卷軸時 `scenePreloadMorph` 先載入四張圖，`buildScene` 也會載入，`sw.js` 預先快取四張圖集。
- 道具圖 `images/icons/items/polyScroll.png`：`tools/make-poly-icon.ps1` 用羊皮紙卷軸＋變身人物第一格合成。道具總數 432 → 433，test-item-art／test-legend-equipment／test-hero-armor／test-legend-glow 的數字已同步。
- **2026-10-22 外觀樣品待選**：使用者要求更換變形卷軸外觀，先做幾款參考再決定。tools/icon-src/poly-scroll-samples-20261022/保存內建image_gen四款原創圖／prompts.json、a～d-128.png、comparison.png（大圖與40px快捷欄對照）及prepare.py／audit.json。A古典獸印、B紫晶幻化、C暗黑骷髏、D金翼聖印；使用者已選B，q版新增polyScroll-v2.png接共用入口，原polyScroll.png保留，其他三款待討論用途（第90節）。
- 驗證（d 版）：check.ps1 ALL CHECKS PASSED、上述測試＋test-world-vfx 通過、混淆建置（公開函式多了 `morphPick`）與合併語法通過。瀏覽器 Lv.35 測試角色：視窗列 9 種、Lv.40 以上 4 種鎖住；點史巴托扣 1 張、防禦生效、外觀為巡守妖魔神射、提示「變身：史巴托」；選巴風特回「需要 Lv.60」不扣卷軸；解除變身後效果消失；不帶對象使用沿用上次（自動用）；Console 無錯誤。c 版另驗過野外腳底對齊影子、到期恢復職業模型。
- 驗證（e 版）：check.ps1、test-item-art、混淆建置與合併語法通過。瀏覽器 Lv.55 測試角色：選單 9 系 30 種、金變 4 種鎖住；選烈焰死亡騎士命中 +4、攻擊間隔 920→800ms、提示「變身：烈焰死亡騎士」；選神聖裁決劍聖回「需要 Lv.70」；Console 無錯誤。拿掉選單內層捲軸，只剩視窗本身一條。
- **20261022f：02 月光精靈巡林者接上專屬圖**（使用者要求）。素材 `images/sprites/morph/moon-ranger-v1/`（別的工作做好、已由使用者提交 6005cd1；說明在該資料夾 README.md）：格子 320×240（比巡守妖魔神射寬）、**腳底 (160,200)**，walk／attack 各 4 格、cast／hit 各 2 格，時間 130／140／220／150ms。`MORPHS.moonRanger`＋m02 的 sprite 欄位，`sw.js` 預先快取四張圖集。驗證：Lv.55 測試角色選 m02 → 外觀為月光精靈巡林者、四張圖集尺寸 1280×720／640×720 正確載入，野外放大確認腳踩影子不浮空，攻擊 560ms／施法 440ms 動作正常；改選 m05 回到統一外觀；Console 無錯誤。
- **20261022g：m02 攻擊換用 attack-v2.png**。修正原四格皆拉弓而看不到出手的素材問題；三向各準備／拉弓／放箭／收弓，左鏡像，規格與時間維持不變；第18.5節。未改等級、能力、消耗或 schema。
- **20261024n：恢復變身等級鎖，GM豁免**：`MORPH_LV_FREE = false`，藍／紅／紫／金需Lv.15／35／52／70；`morphLvOk`共用於選單、手動及自動用卷。登入經現有`dragon_is_admin`確認的GM可略過等級門檻（第125節）。
- **20261022i：測試期間暫時拿掉變身等級限制**（使用者要求方便測試）。`items.js` 的 `MORPH_LV_FREE = true`＋`morphLvOk(f)`，`usePotion` 與選單的鎖定都改用它；選單提示改成「測試中：暫不限等級」，卡片仍顯示原本的需求等級。**正式開放前把 `MORPH_LV_FREE` 改回 false** 即恢復 Lv.15／35／52／70 限制。
- **20261022j：03 冥火骷髏神射接上專屬圖**（使用者要求）。`MORPHS.hellfireArcher`：格子 **320×280**、腳底 **(160,240)**（上方多留火焰空間，和 02 的 240 高格子不同），walk／attack 4 格、cast／hit 2 格，130／140／220／150ms；m03 加 sprite，`sw.js` 預快取四張圖集。驗證：Lv.1 測試角色（等級限制已暫拿掉）選 m03 → 外觀冥火骷髏神射、四張圖集 1280×840／640×840 載入、攻擊 560ms、野外放大腳踩影子；test-moon-attack 回歸通過；Console 無錯誤。
- **20261022k：03射箭動作重製**。attack-v2.png改成低持弓→拉弓→放箭→收弓；規格與560ms總時間不變，新檔名避開舊PNG快取。04女武神另有72格試播素材，尚未接入m04；第18.6、18.7節。
- **20261022l：04 蒼穹女武神・艾爾接上專屬圖**（使用者要求）。`MORPHS.skyValkyrie`：格子 **384×320**、腳底 **(192,270)**，walk／attack 每向 **8 格**（80／70ms）、cast／hit 4 格（110／80ms），射箭總長仍 560ms；m04 加 sprite，`sw.js` 預快取四張圖集（各約 3072×960／1536×960）。設計上離地微浮，所以腳在影子上方一點。驗證：選 m04 → 外觀女武神、四圖集尺寸正確、攻擊 560ms、野外放大位置正確；test-moon-attack／test-hellfire-attack 回歸通過；Console 無錯誤。

- **20261022m：05矮人蒸氣火銃兵接上專屬圖**。MORPHS.dwarfGunner、m05.sprite、SW四張圖集，384×320／腳底[192,270]／charH160／drawH48。walk及attack4格、cast及hit2格，130／140／220／150ms；藍變槍手既有能力與測試等級開關不變，第18.8節。

- **20261022n：10布魯迪卡之影接上專屬圖**。MORPHS.brudikaShadow、m10.sprite、SW四圖集；三向36格／左鏡像，384×320／腳底[192,270]、4／4／2／2格，130／140／220／150ms。既有紫變雙刀能力與測試等級開關不變，第18.9節。

- **20261022o：27裂空魔龍爪皇接上專屬圖**。MORPHS.riftDragon、m27.sprite、SW四PNG；三向36格／左鏡像，384×320／腳底[192,270]，4／4／2／2格、130／140／220／150ms。沿用既有紫變鋼爪能力、等級測試開關及schema，第18.10節。

- **20261022p：04替換使用者新版分鏡**。MORPHS.skyValkyrie的四src改sky-valkyrie-v2，4／4／2／2格、160／140／220／160ms維持原總時間，SW同步；舊v1不動，m04與能力不變，第18.11節。

- **20261024ad：08沉默洞穴刺客接上專屬圖**：MORPHS.silentCaveAssassin、m08.sprite、SW四PNG，三向36格／左鏡像，沿用既有Lv.15藍變雙刀能力、GM及武器限制與schema7；素材與測試見第18.14節。

- **20261024an：06暗影海盜雙槍客接上專屬圖**：MORPHS.shadowPirateGunner／m06.sprite、四圖集預載，三向36格及左鏡像；保留紅變Lv.35槍械限制、原能力、GM與schema7，詳第18.15節。

## 89. 喝水延遲：手動、自動統一 0.8 秒（2026-10-22，版本 `20261022h`；`combat.js` 的 `potReadyAt`／`potionReady`、`config.js` 的 `POTION_CD_MS`）

- 使用者要求「喝水秒數統一，手動或自動都改成固定喝水延遲，比照天堂」。查不到天堂官方確切秒數（原版治癒藥水沒有明確冷卻），使用者選 **0.8 秒**。
- 以前只有自動喝水有 1 秒間隔（`hunt.potCd`，已移除），手動按快捷欄／背包沒有限制。現在 `usePotion` 本身檢查：**藥水類**（`cat: potion`：治癒、綠水、勇水、精靈餅乾、慎重、藍水）共用一個時間點 `potReadyAt`，喝完 `POTION_CD_MS`（800ms）內不管手動或自動都回「喝水延遲中」、不扣藥水。卷軸（回家、瞬移、變形卷軸）不算喝水，不受影響。
- `autoSupport` 在延遲中直接跳過治癒與增益（包含自動讀變形卷軸）；快捷欄與 `quickHeal` 按太快會跳 0.6 秒的「喝水延遲中」提示，背包「使用」照舊提示。用 `gameNow`，離線模擬沿用同一套。
- 驗證：手動連喝第 2 瓶、延遲中喝綠水都被擋，0.5 秒擋、0.8 秒可喝；自動 HP 一直很低時 3 秒喝 4 瓶（0／0.8／1.6／2.4 秒）；Console 無錯誤。

## 90. 狀態三區與 B 款變形卷軸（2026-10-22，版本 `20261022q`；`icons.js`／`index.html`）

- 使用者選B紫晶幻化；`ITEM_IMG.polyScroll = 'polyScroll-v2'`，背包／商店／快捷欄／狀態共用新128px透明PNG，原polyScroll.png及四款生成原稿全保留。新檔名避開SW舊圖快取；不改卷軸功能。A／C／D僅提陣營／軍團外觀用途建議，待使用者決定玩法。
- `buffStatusGroup(b)`：負面（`negative === true`或`src === 'debuff'`）必歸temp；其餘查技能／道具原始sec，共鳴查裝備res.sec並套既有職業倍率。**使用者選原始持續≤30秒歸temp**，長效即使剩1秒也留原區，不加存檔欄位。
- `buffIconsHtml`每次收集skill／item／temp三區，區內依狀態key固定排序，刷新／補放／同組來源覆蓋後重新分類；共鳴技能生效依時間歸臨時，未生效保留技能區冷卻／充能／機率。穿戴共鳴生效僅一格，到期恢復待命。空區hidden但保留容器順序，更新沿用`setHtmlStable`避免倒數換img。
- 每格`bf-skill`藍底／`bf-item`黃底／`bf-bad`紅底；臨時增益仍依來源保留藍或黃，負面不跟到期提示混色。`.bf-time`僅樣式化倒數，避免原`.bf span`連圖示容器也套文字margin。三區標籤＋細分隔、單排、可橫滑；剩10秒提醒維持分類底色，減少動態設定停閃。
- **現況限制**：目前實際戰鬥沒有寫入玩家負面增益；怪物的暈眩／bossEnchantDebuffs不可放入玩家列。紅底介面支援已備妥，隔離頁用明示的負面示範測試，沒有新增中毒或暈眩玩法。未改schema／數值。
- `tools/test-buff-groups.js`隔離測分類、來源替換、固定排序、到期、共鳴去重與B圖接線；`tools/buff-groups-preview.html`用實際CSS與圖示函式供PC／390px窄螢幕刷新、快轉、負面示範，SIM_MODE且不讀寫存檔／雲端。
- 驗證：上述分類測試含30／31秒邊界、test-item-art全433道具、check.ps1 ALL CHECKS PASSED、git diff --check通過；瀏覽器PC／390px窄版三區與藍黃紅底、橫滑查看後段、刷新／快轉40秒移除臨時效果並恢復共鳴待命正常；倒數保留同一img，Console無error／warn。待使用者實玩確認才提交。

## 91. 線上後端掉寶（2026-10-22，版本 `20261022t`；2026-10-22 已上線並由使用者啟用 enabled=true）

- 使用者已明確選線上打怪／首領／副本，離線掛機另議，並授權SQL製作。`tools/SERVER-LOOT.md`是部署與限制說明，`BACKEND-LOOT-PLAN.md`保留原盤點；正式資料庫尚未修改。
- `data/loot.js`在pwa後、main前載入；頂層`LOOT_PROTOCOL`、`lootMode`、`lootBusy`、`lootProbeAt`、`lootNoticeAt`、`lootPendingAt`。`lootActive/lootRequired/lootCanPlay`處理模式與資格，`lootStart/lootProbe`查後端開關，`lootChar/lootEnvelope`處理角色與存檔外層，`lootQueueKey/lootJobs/lootStore/lootEnqueue`保存加密重試佇列，`lootSpawn`取得後端遇怪及憑證，`lootKill/lootRaid`排隊結算，`lootApply`原子入帳，`lootPump`補領及重試，`lootNotice`限頻提示。狀態30秒更新、佇列5秒重試，計時使用gameNow。
- combat的startHunt／huntTick檢查登入與後端模式；spawnMonster、增援及pullMob透過lootSpawn，等待網路時暫停戰鬥。手動點怪保留sceneTarget，回覆後才綁定原身體／焦點，不誤報怪物過多；ui-scene的點擊處相應處理非同步等待。新spawn只接受後端目錄怪、首領／精英資格由後端選，塔層／龍穴／任務有資格檢查；被放棄的未結算憑證由loot_release取消，待重試擊殺仍保留。
- rollDrops改走憑證結算；伺服器產生完整品質／詞綴／數量，通用與地區及怪物池、BOSS自身材料0.1%例外、通貨、高級書、隨機裝備、共鳴與異界地圖沿原規則。maps的精英資格採後端值、completeMap不再本機生成通關地圖；questOnKill不再本機擲收集物。鑽石由loot_finish擲骰，沿既有錢包／每日上限；舊dia_drop啟用後拒絕直接領。
- raidApplyReward保留既有經驗／金幣與消耗流程，掉寶改排loot_raid；核對房間round、參加者及角色後各自一份。後端未就緒時raidRefresh延後領獎，不先記已領而遺失掉落。世界首領由loot_worldboss呼叫原claim、按名次產生物品，舊wb_claim啟用後擋下；重複領取被拒，回應遺失但已生成的物品仍能pending補領。
- `tools/server-loot.sql`新增config／catalog／rules版本／state／jobs五表，全部RLS及撤銷直接權限；status允許anon，spawn／release／finish／raid／pending／worldboss僅authenticated。內部pick／int／quality／item／map／roll／player及存檔trigger撤銷PUBLIC執行權，security definer固定空search_path。帳號事件鍵唯一、列鎖及單調cursor防重抽／重領與舊版回退。loot_finish最低150ms及發怪速率限制僅是基本資格檢查，不是伺服器戰鬥驗證。
- 存檔外層新增可選`lootProtocol:1`／`lootCursor`，不改player或SAVE_SCHEMA（仍5）；saveGame保留同角色外層收據，cloudPushSlot附協定。lootApply依cursor順序，在一次加密localStorage寫入中同時保存背包與收據，寫入失敗還原inv／gold／nextUid；非當前角色只改原欄位，換帳號中止await後操作。佇列key為dragonSlayer_loot_jobs_帳號，用saveEncode／saveParse；不讀寫別帳號角色。
- `export-loot-catalog.js`以固定種子從當前資料產生loot-catalog.json／.sql及單一server-loot-install.sql，433道具／78怪／19區／100塔層／12職業任務／6副本；目錄version含資料hash，rules保存舊快照，更新不使既有憑證改抽新規則。安裝預設disabled、保留現有開關；先安裝再發布新版，最後由使用者在Supabase啟用。RPC缺失／斷線／未登入均不退回本機抽獎。
- 離線掛機仍SIM_MODE試算，不新增離線物品，現有玩家物品保留。一般金幣／經驗、鍛造／商店與整份背包上傳仍屬現有客戶端流程，不能宣稱本版已建立權威背包或完全防作弊。帳本目前不自動清除，啟用前需估算容量／請求量；不要刪未領獎勵。
- 測試工具：test-server-loot-db.js以隔離PGlite跑實際PostgreSQL；test-server-loot-integration.js載既有supabase.sql與anticheat.sql後重複部署並驗證簽章／RLS；test-server-loot-client.js以記憶體存檔與假RPC跑真實串接，server-loot-preview.html提供相同隔離瀏覽器流程。PGlite僅安裝在TEMP測試目錄，非遊戲依賴；正式SQL由使用者執行，不由AI上線。
- 最終驗證：三個新測試及掉落紀錄／商店購買／傳說裝備／狀態三區／16步態與攻擊回歸通過；check.ps1 ALL CHECKS PASSED（47檔／46script／20261022t）、git diff --check通過。實際混淆建置46檔→433KB成功。瀏覽器隔離頁正常入帳後重送數量不變，第二次斷線保留工作、連線後補領並清空佇列，Console無error／warn；畫面只用模擬RPC，正式SQL尚待使用者部署及實玩驗收。
- **部署前置（2026-10-22 啟用後發現）**：loot_player呼叫anticheat.sql的`dragon_save_ok`，正式庫須先執行過anticheat.sql（第60節），否則每次結算報「function public.dragon_save_ok(uuid, integer) does not exist」，擊殺留在重試佇列，補裝後自動補領；使用者已於2026-10-22執行，掉寶恢復正常。test-server-loot-db.js以stub代替該函式，所以單元測試抓不到。

## 92. 彈藥 100 個一單位、降價（2026-10-22，版本 `20261022y`，`20261022z` 調子彈價；`town.js` 的 `shopUnit`／`shopCost`／`shopPriceText`、`items.js` 彈藥 price）

- 使用者要求：箭矢、子彈商店每次以 100 個為單位；價格 1 金幣＝10 支箭（1/10）、2 金幣＝5 發子彈（1/5，z 版由 y 版的 1 元＝5 發調整），進階的銀箭／銀子彈同比例。`items.js` 單價改為小數：箭 0.1、銀箭 0.4、子彈 0.4、銀子彈 1（每 100 個 10／40／40／100 金幣）。
- `shopUnit(id)`：`cat === 'ammo'` 回 100，其餘 1。`shopCost(id, n)` 回 `Math.round(price × n)`，購買一律是單位倍數所以總價必為整數；`shopPriceText(id)` 彈藥顯示「💰 10／100 個」（`fmt` 會無條件捨去，不能直接顯示 0.1），商店列表、自訂視窗、圖鑑商店來源都用它。
- `buyItem` 數量不是單位倍數就提示「○○每次以 100 個為單位購買」不扣款；`shopBuyLimit` 以「一單位」計算金幣／負重上限避免小數誤差，回傳單位倍數；自訂視窗 `min`／`step`／預設值 100，預覽非倍數顯示「請輸入 100 的倍數」。彈藥快捷鍵 ×100／×1000／×10000，其他可堆疊道具仍 ×1／×10／×100。
- 回收價沿用 `sellPriceOf`＝`floor(price×0.3)`：箭、子彈原本就是 0，銀箭由 1 變 0，銀子彈仍 0（floor(1×0.3)）。不改存檔、掉落、後端掉寶目錄（目錄不含價格）。
- `tools/test-shop-buy.js` 新增：1、150 個被拒、300 箭扣 30 金且金幣為整數、每 100 個價格、金幣只夠 250 個時上限 200、預覽提示、對話框 step、列表按鈕；check.ps1 ALL CHECKS PASSED。瀏覽器以未登入暫時角色確認列表顯示「💰 10／100 個」等、輸入 300 總價 30，測試資料已清掉；Console 只有本機預覽 Service Worker 註冊失敗的既有訊息。

## 93. 共用倉庫防複製 v2（2026-10-23，版本 `20261023a`；`vault.js` 的 `vaultOp`／`vaultEnvelope`、`cloud.js` 的 `cloudVaultAdopt`／`cloudFetchSlot`、`tools/vault-v2.sql`）

- **起因**：使用者要求檢查倉庫複製；管理頁已出現 `vault_dupe`（存入後 +8 雙刀仍留在角色身上）。v1（第 38 節）的 `vault_put` 只**檢查**雲端存檔有沒有這件道具／金幣，扣除由遊戲事後自己做並上傳：
  ① 金幣存入沒有重複檢查，直接呼叫 API 同一筆錢能存很多次；② 存入後在遊戲上傳前斷線／關網頁，或還原舊存檔，東西同時在角色和倉庫；③ 可堆疊道具取出後同 uid 能再存；④ 倉庫存的是玩家送來的 `p_item`，可偽造強化／詞綴。
- **使用者選的修法**：伺服器存取時直接改雲端存檔＋舊存檔不能蓋回。
- **SQL（`tools/vault-v2.sql`，接在 supabase／vault／anticheat 之後，可重跑）**：
  - `dragon_vault_seq(user_id, char_id=created|cls, seq)`：每個角色的倉庫存取序號。trigger `dragon_vault_save_guard`：玩家（authenticated）上傳的存檔外層 `vaultSeq` 必須**等於**伺服器序號，否則拒收（`vault seq conflict`、hint `dragon_vault_seq`）；比較小＝舊存檔，比較大＝偽造。管理者在 SQL Editor 改不受影響。
  - `vault_put2(slot, uid, n, gold, name)`／`vault_take2(slot, id, gold)`：鎖住存檔列（`dragon_vault_row`：登入、停權、交易所門檻、簽章、手續費），在同一筆交易裡改 `data.player`：存道具＝從 inv 拿掉（可堆疊可存一部分），倉庫存的是**雲端存檔裡那一件**；存金幣＝扣金額＋100；取道具＝裝備給 `nextUid` 新 uid、可堆疊（沒有 `ench` 欄位）併入同名那疊；取金幣＝加金額－100。
  - `dragon_vault_commit`（內部）：序號 +1、`data.vaultSeq`、`data.t` 與 `client_t` 換成伺服器毫秒時間、有 `sig` 就用 `dragon_save_sig` 重算（`sig_ok` 保持 true）。回傳 `{seq, t}`＋增減（`gold` 是對角色金幣的增減，含手續費；存道具回 `n`、取道具回 `item`）。
  - 舊 `vault_put`／`vault_take` 改成直接拋 `vault client outdated`（hint `dragon_vault_old`），舊版遊戲更新前不能用共用倉庫；`vault_pending`／`vault_ack`／`vaultDeliver` 保留，補交 v1 時取出還沒入帳的。
  - **部署順序**：先執行 SQL，再發佈遊戲（執行後到新版上線前，舊版只是暫時不能存取共用倉庫；沒用過 v2 的角色序號是 0，舊版照常上傳）。
- **遊戲端**：
  - 存檔外層新增 `vaultSeq`（不改 player、`SAVE_SCHEMA` 仍 5）。`saveGame` 呼叫 `vaultEnvelope`：取本機上一份同角色的序號與 `vaultLive`（這次遊戲最新）較大者。`lootApply`、`raid.js` 改寫存檔時保留外層欄位。
  - `vaultOp(fn, args, apply)`：先 `saveGame`＋`cloudFlush(true)`（沒傳完就中止）→ `vaultRpcBusy` 期間 `cloudFlushRun` 不上傳目前角色 → RPC → 同一個同步段落裡 `apply(r)`（照伺服器回傳的增減改本機；存道具只扣存進去的數量）、記 `vaultLive`、`cloudKnown[slot] = r.t`、`saveGame` → 上傳。中途換角色就不套用（那格本機序號舊，下次上傳改用雲端）。
  - `cloudPushSlot` 收到序號錯誤 → `cloudVaultAdopt(i)`：標 `cloudConflict[i]='vault'` 停止上傳，`cloudFetchSlot` 下載雲端那格（改寫前備份到 `CLOUD_BAK_KEY`），正在玩就 `continueGame` 並提示「已載入雲端進度」。`cloudUseCloudSlot` 也改用 `cloudFetchSlot`。
- **查帳**：`tools/vault-audit.sql`（只讀）：①倉庫裡且原角色存檔還有同一件（複製品還在）②倉庫金幣大於帳號角色金幣合計的帳號 ③歷來 `vault_dupe`。v1 金幣存入沒有紀錄，②只能當線索。
- **測試**：`tools/test-vault-v2.js`（隔離 PGlite 載正式 SQL，含掉寶已啟用）：舊 RPC 停用、內部函式不能直接呼叫、金幣真的扣不能重複存、舊存檔／偽造序號被拒、倉庫存的是存檔那件、部分存入、取出新 uid／併疊、簽章 `sig_ok`、`lootCursor` 不變。
  `tools/test-vault-v2-client.js`：真實遊戲程式＋假 Supabase 接 PGlite 端到端：存裝備／藥水／金幣本機與雲端一致；把存入前的本機存檔放回去後上傳被拒、自動改用雲端，金幣只扣一次；取出入帳後照常上傳；伺服器重算的簽章與 `guardCloudSig` 一致，不誤記改檔。
  既有 server-loot 三測試、shop-buy、loot-log 回歸通過；check.ps1 ALL CHECKS PASSED；混淆建置 46 支→435 KB 語法通過；瀏覽器載入無新錯誤（只有本機預覽 Service Worker 註冊失敗的既有訊息）。
- **部署**：2026-10-23 使用者已在 Supabase 執行 vault-v2.sql 成功，遊戲 20261023a 已推上線，使用者實測共用倉庫存取正常。
- **限制／待辦**：`wipe.sql` 白名單還沒加 `dragon_vault_seq`（留著無害：角色 id 含建立時間，新角色不會撞到）；交易所 `market_list` 也是「只檢查不扣除」的同一種寫法，之後可比照處理。

## 94. 能力值超過上限的存檔拒收（2026-10-23，版本 `20261023b`；`tools/stat-cap.sql`、`cloud.js` 的 `cloudErrText`）

- **起因**：管理頁出現 Lv.1 角色六項能力值都 99（a0926931545@gmail.com「櫻萬美夕」，10/22 21:55）。`dragon_saves_audit` 只記 `stat` 紀錄、存檔照收；雲端簽章（第 60 節）只涵蓋等級／經驗／金幣／道具，**不含能力值**，所以改能力值的存檔可以上傳並用來打怪拿後端掉寶。未處理的 `stat` 紀錄會觸發交易所門檻（不能用交易所與共用倉庫），但擋不住打怪。
- **使用者決定**：伺服器直接拒收，超過 40 一律不收。
- **SQL（`tools/stat-cap.sql`，可重跑、跟其他 SQL 沒有先後限制）**：BEFORE trigger `dragon_saves_stat_cap`，只管玩家（authenticated）上傳且存檔內容有變的：`player.stats` 不是物件、六項（str／dex／con／int／wis／cha）缺任何一項、任一項不是數字、小於 0 或大於 40 → `stat cap exceeded`（hint `dragon_stat_cap`）。正常玩法單項最高 35（`STAT_CAP`，加點 `addStatPoint` 與萬能藥 `useElixir` 都受它限制），40 是寬限。管理者在 SQL Editor 改資料不受影響；雲端既有的存檔不刪，只是之後上傳不了；被拒收的上傳整筆取消，不會再新增 `stat` 紀錄。
- **遊戲端**：`cloudErrText` 把這個錯誤顯示成「能力值超過上限（單項最高 40），雲端不接受這份存檔」。不改存檔結構。
- **測試**：`tools/test-stat-cap.js`（隔離 PGlite 載正式 SQL＋重複安裝）：35／40 照收；41、99、字串、負數、缺欄位、沒有 stats 拒收且雲端不變、不留紀錄；管理者修資料不受影響。`test-vault-v2-client.js` 也加裝 stat-cap.sql，證明真實遊戲上傳的存檔通過檢查。check.ps1 ALL CHECKS PASSED。
- **限制**：已在雲端的 99 存檔仍可被後端掉寶讀到（`loot_player` 不看能力值），這種帳號建議用管理頁封鎖（a0926931545@gmail.com 已於 2026-10-23 封鎖）；能力值納入簽章需要同時改遊戲與伺服器，目前不做。

## 95. 交易所防複製 v2（2026-10-23，版本 `20261023c`；`market.js` 的 `marketListItem`／`marketCancel`／`marketBuy`、`tools/market-v2.sql`）

- **起因**：使用者要求查證交易所；隔離資料庫重現 v1（第 36 節）三個漏洞：① `market_list` 存玩家送來的 `p_item`，普通長劍可偽造成 +15 傳說上架；② 上架不扣雲端存檔、下架又還給玩家，10 瓶藥水上下架 3 輪拿回 30 瓶；③ `market_buy` 只檢查買家金幣不扣，1000 金幣連買兩件 1000，賣家憑空入帳 1900（可用兩個帳號無限製造金幣）。
- **使用者選的修法**：比照共用倉庫 v2（第 93 節）。
- **SQL（`tools/market-v2.sql`，接在 vault-v2.sql 之後，可重跑）**：
  - `dragon_market_row(slot, trade)`（內部）：登入、停權；上架／購買另檢查交易所門檻與雲端簽章（下架取回自己的東西不擋）；與共用倉庫同一把帳號鎖；鎖住存檔列。`dragon_inv_add(player, item)`（內部）：可堆疊（沒有 `ench`）併入同名那疊，否則給 `nextUid` 新 uid。
  - `market_list2(slot, uid, n, price, seller_name, name, cat)`：從雲端存檔拿掉（可堆疊可賣一部分），交易所存**存檔裡那一件**；同一件拿掉後自然不能重複上架（不再需要 `already listed`）。
  - `market_cancel2(id, slot)`：下架（含過期）放回**目前角色欄位**的雲端存檔。
  - `market_buy2(id, slot, buyer_name)`：扣買家雲端金幣、道具加進買家存檔、`buyer_got = true`（不用再交貨），大額交易照記 `market_big`。賣家收入仍走 `market_pending`／`market_ack`（`marketDeliver`）。
  - 三者都用 `dragon_vault_commit`：存取序號（`dragon_vault_seq`／`data.vaultSeq`）+1、伺服器時間、重算簽章，舊存檔蓋不回。舊 `market_list`／`market_buy`／`market_cancel` 改成拋 `market client outdated`（hint `dragon_market_old`）；v1 時買到還沒交貨的道具仍由 `market_pending` 補交。
  - **部署順序**：先執行 SQL，再發佈遊戲（中間舊版只是暫時不能上架／購買／下架）。2026-10-23 使用者已執行 market-v2.sql 與 stat-cap.sql 成功，20261023c 上線後實測上架／下架／購買正常。
- **遊戲端**：三個動作改用 `vaultOp`（vault.js）：上架只送 uid＋數量、本機只扣上架數量；下架 `marketGiveItem(r.item)`；購買 `player.gold += r.gold`＋`marketGiveItem(r.item)`。`marketErrText` 新增 `market client outdated`、`bad amount`。
- **測試**：`tools/test-market-v2.js`（隔離 PGlite 載全部正式 SQL＋重複安裝）：舊 RPC 停用、內部函式不能直接呼叫、上架存的是存檔那件且同時扣掉、上下架 3 輪數量守恆、部分上架、下架給新 uid、買家金幣真的扣不能重複買、買到直接入帳、賣家只入帳一次、舊存檔蓋不回。`test-vault-v2-client.js` 加上交易所：真實遊戲上架／下架／向另一帳號購買，本機與雲端一致、簽章不誤判。全部回歸、check.ps1、混淆建置通過。
- **限制**：`p_cat = 'quest'` 仍由遊戲送來（伺服器沒有道具分類表），偽造分類只能讓任務道具上架，不能複製；賣家入帳仍是兩段式（有 `marketGot` 防重複）。

## 96. 手機縮小後誤報「進度衝突」／「雲端存檔尚未同步」（2026-10-23，版本 `20261023d`；`cloud.js` 的 `cloudSentAdd`／`cloudOwnOrConflict`、`loot.js` 的 `lootSyncFailAt`）

- **使用者回報**：玩家把遊戲縮小後，可能跳「雲端存檔資料尚未同步」（實際是 `lootPump` 的「掉寶結算待重試：雲端存檔尚未同步」）或「☁️ 進度衝突」。
- **原因**：切到背景時 `visibilitychange` 會立刻 `cloudFlush(true)`。手機在等回應時把 App 暫停：更新已經寫進雲端（`client_t` 變成這次的 t），但遊戲沒收到回應（逾時），`cloudKnown` 還是舊值。回到前景再上傳時，`update … eq('client_t', 舊值)` 對不到列 → `cloudOnConflict` → 進度衝突；之後該格 `cloudConflict` 卡住，`cloudFlush` 一直回 false，掉寶佇列就一直提示「尚未同步」。
- **修正**：
  - `cloudPushSlot` 送出前用 `cloudSentAdd(i, t)` 記下這台送過的 `client_t`（每格最近 20 個；登入／登出／換帳號時清空）。對不上（update 0 列、insert 重複）時改呼叫 `cloudOwnOrConflict`：先讀雲端那筆的 `client_t`，如果是這台送過的，就把 `cloudKnown` 改成它再傳一次（只重試一次）；不是才跳進度衝突。別台裝置真的有新進度時照舊提示。
  - `lootPump`：上傳失敗時佇列保留、5 秒後重試，連續 60 秒都失敗才提示「雲端存檔尚未同步」（`lootSyncFailAt`）。
- **測試**：`test-vault-v2-client.js` 新增：假 Supabase 把一次寫入的回應丟掉（`net.drop`，資料已進資料庫），下次上傳成功、沒有衝突、沒有對話框；資料庫裡被別台改過（client_t 不是這台送的）仍跳「☁️ 進度衝突」。全部回歸、check.ps1、混淆建置通過。

## 97. 共用倉庫／交易所只等目前角色上傳完成（2026-10-23，版本 `20261023e`；`cloud.js` 的 `cloudSyncedSlot`、`vault.js` 的 `vaultOp`、`loot.js` 的 `lootPump`）

- **使用者回報**：共用倉庫跳「雲端存檔還沒上傳完成，請稍後再試」、也出現過「連不上雲端伺服器，請確認網路」、東西領不出來。
- **原因**：`vaultOp`（共用倉庫、交易所）與 `lootPump` 用 `cloudFlush(true)` 的回傳值判斷能不能繼續，但 `cloudFlushRun` 是**所有**待上傳的角色欄位都成功才回 true。帳號裡只要有別的角色欄位一直上傳失敗（衝突、被能力值上限／序號等拒收、逾時），目前角色明明已上傳完成也被擋住。
- **修正**：新增 `cloudSyncedSlot(i)`：照常 `cloudFlush(true)`，但只看這一格是否已不在 `cloudDirty`、也沒有 `cloudConflict`。`vaultOp` 只看目前角色那格，失敗時等 1.5 秒自動重試一次，還失敗就提示原因：這格衝突時說「請先選擇要保留哪一邊的進度」，其他情況附上 `cloudError`。`lootPump` 只看那筆掉寶的角色欄位。
- **測試**：`test-vault-v2-client.js` 新增：第 2 格本機存檔能力值 99 一直被拒收，第 1 格照常存入共用倉庫，第 2 格仍待上傳。全部回歸、check.ps1、混淆建置通過。
- **上線**：2026-10-23 使用者 Push 後實測共用倉庫東西領得出來。
- **待觀察**：別的角色欄位為什麼上傳失敗，新版提示會附上原因，請玩家截圖回報。

## 98. 縮小回來仍跳「進度衝突」：查不到雲端版本時不判定衝突（2026-10-23，版本 `20261023f`；`cloud.js` 的 `cloudOwnOrConflict`、`loot.js` 的 `lootPump`）

- **使用者回報**（20261023e 上線後）：離開畫面一下子回來，仍跳「☁️ 進度衝突」，同時出現「掉寶結算待重試：連不上雲端伺服器，請確認網路」。
- **原因**：第 96 節的 `cloudOwnOrConflict` 在上傳對不上時，會讀雲端那筆的 `client_t` 確認是不是自己送的；但剛從背景回來網路常還沒恢復，這次讀取失敗（逾時／Failed to fetch）時程式直接走 `cloudOnConflict`，等於又誤判成衝突。
- **修正**：讀取失敗（含 `res.error`）時只記 `cloudError`、回傳 false，這格留在 `cloudDirty` 下次再傳，**不**設 `cloudConflict`、不跳對話框；只有確實讀到「不是這台送的 `client_t`」才判定衝突。`lootPump` 的錯誤若是網路類（timeout／Failed to fetch／NetworkError／Load failed），在 60 秒內不提示、佇列保留自動重試；`lootSyncFailAt` 改成整筆掉寶成功才重設，網路一直不通時 60 秒後仍會提示。
- **測試**：`test-vault-v2-client.js` 新增：上傳回應丟失後，下一次讀雲端版本也失敗（`net.failSelect`）→ 不衝突、這格仍待上傳；再上傳一次就認得自己的版本並成功，全程沒有對話框。全部回歸、check.ps1、混淆建置通過。

## 99. 離開畫面回來掛機停止：網路暫斷只暫停、恢復後自動繼續（2026-10-23，版本 `20261023g`；`loot.js` 的 `lootTransient`／`lootWaiting`／`lootProbe`／`lootSpawn`、`combat.js` 的 `huntTick`）

- **使用者回報**：離開畫面一下回來，掛機停止，出現「後端掉寶連線尚未就緒」。
- **原因**：剛回到前景網路常還沒恢復，以下任一步失敗就直接 `stopHunt`：`lootProbe`（`loot_status` 逾時）、`lootSpawn`（先上傳存檔失敗「請先完成雲端同步」或 `loot_spawn` 逾時）、`huntTick` 在 `lootMode` 是 `checking`／`blocked` 時（頁面被系統回收重載、或第一次查狀態失敗）。玩家只能手動重新開始掛機。
- **修正**：
  - `lootTransient(e)`：timeout／Failed to fetch／NetworkError／network／Load failed／「請先完成雲端同步」算暫時性錯誤。`lootWaiting()`：`lootMode` 是 `checking` 或 `blocked`、已登入、沒被停權。
  - `lootProbe`：暫時性錯誤不停掛機，5 秒後再查（原本 30 秒）；其他錯誤（規則沒裝、管理者停用）照舊停止。
  - `lootSpawn`：先上傳改用 `cloudSyncedSlot(slot)`（第 97 節）；暫時性錯誤時回到找怪狀態、3 秒後自動再試，`lootNotice` 提示「⏳ 後端掉寶連線中，恢復後自動繼續掛機」；其他錯誤照舊停止。
  - `huntTick`：`lootCanPlay()` 不通過時，若 `lootWaiting()` 就只暫停這一回合（`player.hunting` 保持 true），查到狀態恢復為 `active` 後自動繼續；沒登入、被停權才停止。
  - 後端掉寶的原則不變：連不上時**不會**改用本機抽獎。
- **測試**：`test-server-loot-client.js` 新增：`loot_status`／`loot_spawn` Failed to fetch、存檔還沒傳完時掛機都不停、`hunt.timer` 3 秒後再找怪；`lootMode='blocked'` 時 `huntTick` 只暫停；查到狀態恢復回 `active`；非網路錯誤（`loot zone denied`）仍停止。全部回歸、check.ps1、混淆建置通過。

## 100. 後端掉寶不再每隻怪都上傳整份存檔（2026-10-23，版本 `20261023h`；`loot.js` 的 `lootSnapKey`／`lootCloudFresh`／`lootSpawn`／`lootPump`、`cloud.js` 的 `cloudSnapKey`）

- **起因**：使用者轉來另一個 AI 的分析並確認：後端掉寶啟用後，掛機時每生一隻怪 `lootSpawn` 都 `saveGame()`＋強制上傳整份存檔，每結算一筆 `lootPump` 也先確認上傳，等於繞過「60 秒上傳一次」。每次上傳伺服器要跑十幾個 trigger（存檔歷程、裝置紀錄、掉寶序號列鎖、簽章、能力值、倉庫序號…），100 人掛機約每秒 25 次整份寫入＋上百個 RPC。Supabase 免費方案共用 CPU，請求變慢超過 10 秒逾時 → 「雲端存檔尚未同步」、進度衝突、掛機停止，重試又加重負擔，形成惡性循環。第 96～99 節是在處理症狀。
- **查證**：`loot_spawn` 讀雲端存檔的 cls、lv、loc（type／id／floor）、towerMax、towerCleared、towerBossCd、dragons、dragonCd、mapRun（zone／t／mods／left）、quests（ch／active／bossDone／prog）判斷資格，**不讀背包、金幣、經驗**；`loot_finish` 只靠 `loot_player` 核對角色存在（任務收集數量讀雲端背包，遊戲端 `questMax` 會再夾一次）。
- **修正**：
  - `lootSnapKey(p)`：上述生怪資格欄位的 JSON（mapRun 只取 zone／t／mods 與 `left <= 0`）。`cloudPushSlot` 上傳成功時記 `cloudSnapKey[i]`；`cloudFetchSlot`、`cloudSync` 讀雲端時清掉（不確定就重傳）；登出／換帳號清空。
  - `lootSpawn`：`lootCloudFresh(slot)`（雲端已有這格、沒衝突、`cloudSnapKey` 等於目前角色的）才跳過上傳；換地圖、升級、塔層、首領冷卻、異界地圖、任務進度變了才先上傳。
  - `lootPump`：不再每筆 `saveGame`＋上傳，只有雲端還沒有這一格（`cloudKnown[slot] == null`）才先上傳。掉寶收據入帳後照一般 60 秒上傳。
- **測試**：`test-server-loot-client.js` 新增：第一次生怪上傳、金幣／背包變了不重傳、等級變了重傳、結算不上傳。全部回歸、check.ps1、混淆建置通過。
- **還沒做（可再減量）**：存檔歷程 `dragon_save_log`／裝置紀錄改成每幾分鐘才記一筆、`cloudSyncedSlot` 在上傳中又被存檔時誤判未完成。上線後請到 Supabase Reports 看 CPU 與 API 請求量是否下降。

## 101. 減少上傳存檔的資料庫寫入（2026-10-23，SQL `tools/save-log-throttle.sql`；遊戲版本不變）

- **起因**：Supabase 主控台警告 **Disk IO Budget 快用完**（用完後磁碟降到 5 MB/s，所有請求變慢、逾時）。同時 Observability 的 DATABASE 錯誤率 67.6%、慢查詢 97 筆（待查明細）。每次上傳存檔，trigger 除了寫存檔本身，還會寫存檔歷程 `dragon_save_log`（並刪超過 200 筆的舊資料）、`dragon_profiles` 最後上線、裝置紀錄 `dragon_save_dev`（並刪超過 300 筆的舊資料）。第 100 節已把上傳次數從「每隻怪」降回約每分鐘一次，這節再把每次上傳附帶的寫入減量。
- **做法**（只改多久記一筆，不改檢查規則）：
  - `dragon_saves_audit`（從 supabase.sql 複製後修改）：同一欄位 5 分鐘內已有歷程、這次也沒有異常 → 不記歷程也不刪舊的；`dragon_profiles` 在 5 分鐘內、名字與 email 沒變就不更新。異常檢查每次照做，有異常一定記；經驗／金幣暴增是和上一筆歷程比，時間差變長上限也跟著放寬，判斷不變。
  - `dragon_save_dev_log`：同帳號最新一筆是同欄位、同登入 session、同裝置、同 IP，且不到 10 分鐘 → 不記。換裝置／IP／登入照樣馬上記。
  - 管理頁「歷程」變成約 5 分鐘一筆。
- **部署**：2026-10-23 使用者已在 Supabase 執行成功。
- **⚠️ 之後若重跑 supabase.sql 或 save-device-log.sql**，會把這兩個函式蓋回舊版，要再執行一次 `save-log-throttle.sql`。
- **測試**：`tools/test-save-log-throttle.js`（隔離 PGlite 載全部正式 SQL＋重複安裝）：5 分鐘內連傳 6 次只記 1 筆歷程與 1 筆裝置紀錄、存檔照常更新；裝置時間異常照樣記歷程與 `clock` 紀錄；換裝置、換登入各記一筆；超過 5 分鐘再記；最後上線 5 分鐘內不改。
- **還能再減**：後端掉寶的憑證／帳本（`dragon_loot_jobs` 等）每隻怪都有寫入且不會自動清除（第 91 節），之後需要保留期限與清理排程。

## 102. 伺服器忙碌時自動退避、被拒收的角色暫停重傳（2026-10-23，版本 `20261023i`；`cloud.js` 的 `cloudTimeout`／`cloudCanCall`／`cloudNoteFail`／`cloudSlotHold`）

- **起因**：2026-10-23 正式專案（Supabase 免費 NANO）卡死：Disk IO Budget 用完、DATABASE 錯誤率 67.6%、Log Ingestion 1.01／1 GB 超過免費額度。使用者重啟專案後，登入服務時好時壞、資料庫回 `PGRST002`（schema cache）20 分鐘以上，之後才慢慢恢復。所有在線玩家的遊戲同時重試（上傳、掉寶查詢與結算、聊天、心跳、交易所、副本、世界首領），一重啟又被塞爆。
- **退避**：`cloudTimeout` 包裝所有經過它的請求：逾時、Failed to fetch、NetworkError、Load failed、Gateway、`PGRST002`、schema cache、502／503／504 算「忙碌」→ `cloudNoteFail()`：退避約 10 秒、20 秒、40 秒…最多 5 分鐘（±25% 隨機錯開）；任何一次成功 `cloudNoteOk()` 立刻恢復。`cloudCanCall()` 回傳是否已過退避時間。
  - 退避中不送：`cloudFlush`（含強制上傳）、`cloudFlushRun` 遇到第一格逾時就停止其他格、`onlinePing` 心跳、聊天輪詢、交易所自動入帳、團隊副本輪詢、世界首領刷新、`lootStart` 的定時查狀態與 `lootPump`。
  - `lootSpawn`：退避中不呼叫伺服器，回到找怪狀態、等退避結束（至少 3 秒）再試，提示「⏳ 雲端伺服器忙碌，稍後自動繼續掛機」，掛機不停。
  - 共用倉庫／交易所（`vaultOp`）退避中提示「雲端伺服器忙碌，請稍後再試」。
- **被拒收的角色暫停重傳**：上傳被伺服器拒收（不是忙碌，例如序號、能力值、版本、掉寶收據檢查）時，`cloudSlotHold[i]` 記 10 分鐘，期間不再重傳那一格。原本每 60 秒重傳一次，每次被拒伺服器都把整份存檔記進錯誤紀錄，是 Log Ingestion 暴增的來源之一。登出／換帳號時清空。
- **測試**：`test-vault-v2-client.js`：回應逾時後進入約 10 秒退避、退避中不上傳；查詢連不上也退避；連續失敗第 3 次約 40 秒、最多約 5 分鐘、成功一次就恢復；別的格被能力值拒收時那格 10 分鐘內不重傳，且不算伺服器忙碌。`test-server-loot-client.js`：退避中生怪與結算都不呼叫伺服器、掛機不停、等退避結束再找怪。全部回歸、check.ps1、混淆建置（含 gm-lib）通過；瀏覽器載入無錯誤。
- **待處理**：免費方案的磁碟額度與紀錄額度偏小。後端掉寶每隻怪仍要寫入憑證與帳本、而且不會自動清除（第 91 節）；長期要嘛減量（批次結算、定期清理），要嘛升級運算方案。由使用者決定。

## 103. 後端掉寶停用時自動改一般掉寶＋緊急開關（2026-10-23，版本 `20261023j`；`loot.js` 的 `lootProbe`／`lootSpawn`／`LOOT_FORCE_LOCAL`）

- **起因**：i 版上線後 Supabase 又卡死（登入與資料庫 API 20 秒無回應），使用者回報「無法掛機、自動打怪沒有反應」：退避版讓掛機只是暫停等待，但伺服器一直沒恢復，登入的玩家就一直打不了怪。止血的方法是把 `dragon_loot_config.enabled` 改成 false，但舊程式在「啟用中→停用」時會丟「後端掉寶暫停中」並停止掛機，生怪又被 `loot disabled` 擋下，玩家要重新整理才能玩。
- **修正**：
  - `lootProbe`：查到 `enabled=false` 就直接切成 `legacy`（一般掉寶）並提示「後端掉寶已暫停，改用一般掉寶」，不用重新整理、不停掛機。連不上或回應格式不對仍不退回本機抽獎（第 99 節）。
  - `lootSpawn`：伺服器回 `loot disabled`（剛停用）時立刻重查狀態，並當成暫時性錯誤（3 秒後再找怪），不停止掛機。
  - **緊急開關** `LOOT_FORCE_LOCAL`（loot.js 頂端，預設 false）：Supabase 卡到連 SQL 都執行不了時，改成 true 推上線，`lootStart` 不再查後端，全部用一般掉寶，玩家可以照常掛機（雲端存檔在退避中，恢復後自動上傳）。恢復後改回 false 再推一版。注意：開著的期間後端掉寶的防作弊不生效。
- **測試**：`test-server-loot-client.js` 新增：啟用中收到 `loot disabled`／`enabled=false` → 改 `legacy`、掛機不停、`lootCanPlay` 通過；重新啟用後回到 `active`。全部回歸、check.ps1、混淆建置通過。

## 104. 後端掉寶減量：批次結算＋只釋放一次＋定期清理（2026-10-23，版本 `20261023k`；`loot.js` 的 `lootFormBatches`／`lootSettleNow`／`lootPump`／`lootSpawn`、`tools/loot-batch.sql`）

- **起因**：免費 NANO 專案反覆卡死（第 101～103 節）。原本每隻怪約 4 次 RPC（release、spawn、finish、pending）、3 次以上寫入（每次 4 個索引），而且 `loot_release` 每次生怪都把這個角色**所有**沒結算的憑證（含早就作廢的）重寫一遍，作廢的又永不刪除，越玩越重。
- **使用者決定**（2026-10-23）：每 10 隻或 30 秒結算一次、已確認收據保留 3 天、不用 pg_cron。（2026-10-24 升 Pro 後改為另加 pg_cron 每日全帳號清理，見第 116 節。）
- **SQL `tools/loot-batch.sql`**（接在 server-loot-install.sql 之後，可重跑；**重跑 server-loot-install.sql 後要再跑這份**）：
  - 新表 `dragon_loot_receipts(user_id, char_id, slot, cursor, batch_id, items, diamonds, created_at)`，主鍵 (user_id, char_id, cursor)、(user_id, batch_id) 唯一；RLS、玩家不能直接讀寫。
  - `loot_release`：多加 `not(context ? 'cancelled')`，已作廢的不再改寫。
  - `loot_spawn`：同時遭遇上限 8 → 64（還沒結算的擊殺也算在內），其他不變。
  - `loot_finish_batch(p_batch, p_tickets[])`：1～50 張；同帳號鎖；同批次已有收據就原樣回傳（回應遺失重送不重抽）；逐張檢查同角色同欄位、略過已用舊流程結算／作廢／超過 12 小時的，未滿 150ms 整批拒絕重試；每張 `loot_roll` 合併成一份 items、鑽石照舊判定（加總 got）；序號 +1、寫 1 張收據、刪除用掉的憑證；全部無效回 `{empty:true}` 並清掉。順手清自己帳號最多 200 筆：已確認（cursor ≤ acknowledged）超過 3 天的收據與舊帳本、作廢超過 1 小時、超過 12 小時沒結算的憑證。
  - `loot_pending`：同時列出舊帳本（單隻結算、團隊副本、世界首領）與新收據，依序號排序。舊版遊戲的 `loot_finish` 照常可用。
- **遊戲端**：
  - `lootKill` 排隊時記 `at`。`lootFormBatches()`：同角色滿 `LOOT_BATCH_N`＝10 隻、最早一隻超過 `LOOT_BATCH_MS`＝30 秒、或 `lootFlushWanted` 時，給最多 50 隻一個 `batch` 編號並存進佇列（重送用同一個編號）。`lootPump` 依批次呼叫 `loot_finish_batch`，團隊副本照舊單筆 `loot_raid`；成功後依批次移除。
  - `lootSettleNow()`：不等湊滿，下一輪就結算；`stopHunt`、`vaultOp`（共用倉庫／交易所）、離開畫面時呼叫；忙碌中要求時，這輪結束接著再跑一次。
  - `lootSpawn`：同一次掛機（`hunt.lootReleased`）只釋放一次；伺服器回 `loot encounters full` 時，下次先釋放並馬上結算，當成暫時性錯誤不停掛機。
  - 玩家看到的變化：掉落紀錄每 10 隻或 30 秒一批出現。
- **測試**：`tools/test-loot-batch.js`（PGlite 全部正式 SQL＋重複安裝）：12 群未結算可繼續生怪、一批 1 張收據、憑證刪除、重送同收據、待領新舊並列與確認後消失、太快整批重試、0／51 張拒絕、作廢憑證的 xmin 不變、全作廢回 empty、舊單隻結算相容、3 天／1 小時／12 小時清理、未確認不刪、收據表不可直讀。`test-server-loot-client.js`：9 隻不結算、滿 10 隻 1 次、失敗保留、重送同編號、馬上結算、超過 30 秒結算、同次掛機只釋放一次、遭遇太多不停掛機。`test-vault-v2-client.js`：真實遊戲接 PGlite 生怪→打倒→批次結算→入帳，收據張數少於怪數、憑證刪除、本機序號依收據增加。全部回歸、check.ps1、混淆建置通過；瀏覽器載入無程式錯誤。
- **部署順序**：建議先執行 `loot-batch.sql` 再推遊戲。遊戲端有保險：伺服器找不到 `loot_finish_batch`（PGRST202）時 `lootBatchMissing=true`，改回逐張 `loot_finish`（作廢／過期的略過）、擊殺不再等湊滿，所以先推遊戲也不會卡住，只是還沒減量。SQL 要等 Supabase 恢復才能執行。

## 105. 緊急開關開啟：暫時改用一般掉寶（2026-10-23，版本 `20261023l`；`loot.js` 的 `LOOT_FORCE_LOCAL = true`）

- **使用者決定**：Supabase 卡死期間玩家無法掛機，先把 `LOOT_FORCE_LOCAL`（第 103 節）改成 true 推上線；**等 Supabase 恢復、執行 `tools/loot-batch.sql` 之後，再改回 false 推一版**。
- **效果**：`lootStart` 不查後端，`lootMode` 維持 `legacy`，打怪的掉落、經驗、金幣在玩家裝置上決定，登入與否都能掛機；不呼叫 `loot_spawn`／`loot_release`／`loot_finish(_batch)`。雲端存檔在 Supabase 恢復前退避（第 102 節），恢復後自動上傳。
- **代價**：開啟期間後端掉寶的防作弊不生效；`dragon_loot_config.enabled` 仍是 true，存檔上傳的掉寶收據檢查（lootCursor）照舊，序號不變所以不會被拒。
- **驗證**：測試、check.ps1、混淆建置通過；瀏覽器以未登入暫時角色在 island 掛機：`lootMode='legacy'`、打 37 隻、拿到 43 件道具與金幣經驗、沒有任何 loot RPC；測試角色已刪除。
- **關掉的步驟**：① Supabase 恢復（gm.html 能登入）② SQL Editor 執行 `tools/loot-batch.sql` ③ loot.js 改回 `LOOT_FORCE_LOCAL = false`、換版本號、推上線。

## 106. 回收頁勾選賣出（2026-10-23，版本 `20261023m`；`ui-panels.js` 的 `sellPick`／`sellPickToggle`／`sellPickAll`／`sellPicked`、`index.html` 的 `.sell-pick` 樣式）

- 使用者要求：販賣物品加勾選框，方便一次勾選處理掉。
- 村莊「💰 回收」頁每列左邊加勾選框（`sellPickToggle(uid)`），勾到的那列金色框（`.list-row.picked`）；上方加「全選」（`sellPickAll`，只選有回收價的）與「🪙 賣出勾選（N）💰合計」按鈕。
- `sellPicked()`：在村莊才可用；確認視窗列出項數與合計，若含有品質、強化、BOSS 附魔或單價 ≥ 5000 的道具另外提醒件數；確認時重新讀一次清單（期間背包變了以當下為準），整疊賣出、加金幣、清空勾選、存檔。回收價 0 的（例如箭、子彈）本來就不列出。原本每列的「賣 1／全部／賣出」與一鍵賣出不變。
- `sellPick` 只存在記憶體；`renderSell` 每次畫面會拿掉已不在背包的編號。不改存檔結構。
- 驗證：check.ps1 通過；瀏覽器以未登入暫時角色在低語港回收頁實際點選：勾長劍＋治癒藥水 ×50 顯示（2）💰420，確認後金幣 2000→2420、+3 長劍（未勾）保留、勾選清空；Console 無錯誤；測試角色已刪除。

## 107. 關閉緊急開關、恢復後端掉寶（批次結算）（2026-10-23，版本 `20261023n`；`loot.js` 的 `LOOT_FORCE_LOCAL = false`）

- **經過**：使用者在 Supabase SQL Editor 執行 `tools/loot-batch.sql` 成功，但遊戲 API（PostgREST）仍卡住：`pg_stat_activity` 顯示 `authenticator` 10 條連線閒置 3 小時 17 分、沒有卡住的查詢，資料庫本身已恢復、卡的是 API 服務。「Fast database reboot」只重啟資料庫，改用主按鈕 **Restart project**（整個專案）重啟；約 5 分鐘後恢復（03:25 UTC），登入與 API 0.2～0.5 秒回應，`loot_finish_batch` 對未登入回 42501（函式存在、只是沒權限）。
- **改動**：`LOOT_FORCE_LOCAL` 改回 false。上線後玩家重新整理即回到後端掉寶，並使用第 104 節的批次結算（10 隻或 30 秒一批、同次掛機只釋放一次、順手清理）。
- **驗證**：掉寶客戶端、端到端、批次 SQL、掉落紀錄、商店測試與 check.ps1、混淆建置通過。
- **上線**：使用者確認 Disk IO balance 回升後推送，線上 v20261023n、登入與 API 約 0.25 秒回應。
- **注意**：剛重啟後磁碟額度可能還沒回滿；推送前可到 Observability → Database 看 **Disk IO balance**，回升後再推比較穩。之後若又出現 Disk IO 警告，可把開關再打開（第 103 節）或考慮升級 Pro＋Micro（基本速度 5 → 11 MB/s）。

## 108. 離線掛機可撿藥水、白色地圖、白色裝備（2026-10-23，版本 `20261023o`；`offline.js` 的 `offlineDrops`／`offlineDropAllowed`／`offlineGiveDrops`）

- **使用者決定**：離線掛機原本只給經驗、金幣（第 14 節「離線期間不撿道具」）；改成**藥水、白色（普通品質）異界地圖、白色（普通品質）裝備**可以離線掉落。其他（魔法以上品質、材料、通貨、魔法書、卷軸、萬能藥、共鳴、任務物、鑽石）仍然不給。
- **做法**（在玩家裝置上決定，同離線經驗金幣；後端掉寶不管離線）：
  - `measureHunt` 快轉模擬 10 分鐘時設 `offlineDrops = []`；`combat.js rollDrops` 的 `give()` 在 `SIM_MODE` 下把實際入包的道具（id、數量、品質）記進去，`maps.js giveMap` 記地圖階數與品質。模擬結束把 `offlineDrops` 過濾成 `s.drops`、清成 null（玩家狀態照舊整份還原）。戰利品過濾自動賣掉的不會記（金幣已算進模擬金幣）。
  - `offlineDropAllowed(r)`：藥水（cat potion）、沒有品質的武器／防具、沒有品質的地圖。
  - `applyOffline` 依 `k = 有效時間 ÷ 模擬時間` 呼叫 `offlineGiveDrops(drops, k)`：每筆掉落給 `floor(k)` 份，小數部分照機率多給一份；裝備 `addItem(id, 1, 0)`（白色、無強化），地圖 `makeMapItem(t, null)`（白色）；超過負重的不撿、計數。報告新增「寶物：…（負重已滿，N 件沒撿）」，說明改成「※ 離線只撿藥水、白色（普通）地圖與白色裝備，不累積任務進度。」，掉落紀錄加一行「🌙 離線撿到：…」。
- **不改**：存檔結構、離線時間上限（12 小時 × 50%）、補給限制、陣亡規則；後端掉寶與 SQL 都不動。
- **測試**：`tools/test-offline-drops.js`：篩選規則（魔法裝備、稀有地圖、材料、通貨、魔法書不給）、k=3 每筆 3 份且全白色、k=2.5 給 2 或 3 份、負重只撿得下的部分；實跑 Lv.30 角色離線 2 小時：擊倒 196、撿到紅水 ×18，新增道具只有允許的種類。全部回歸、check.ps1、混淆建置通過；瀏覽器離線報告顯示寶物欄、無錯誤，測試角色已刪除。

## 109. 一隻角色只能屬於一個帳號（2026-10-23，SQL `tools/char-owner.sql`，遊戲版本 `20261023p`；`cloud.js` 的 `cloudErrText`）

- **起因**：管理頁「經驗暴增」裡，同一隻「操真猛」（Lv.68、總經驗 728,514,376、建立時間相同）同時出現在 aszx113224、poiuyt、qazwsc、asdfgh 等多個帳號：同一台裝置註冊新帳號登入，把本機角色傳上去的分身。管理者用 SQL 刪掉（第 107 節後的刪除 SQL＋墓碑）只擋得住那個帳號，他再開新帳號還能再傳。也發現正式庫原本沒有 `char-tombstone.sql`（已請使用者補執行）。
- **使用者決定**：伺服器擋下「同一隻角色已在別的帳號出現過」的上傳。
- **SQL**（接在 supabase.sql、char-tombstone.sql 之後，可重跑）：
  - `dragon_char_owner(char_id = created|cls 主鍵, user_id, name, first_at)`；RLS、玩家不能直接讀寫。`dragon_saves_char_idx` 表達式索引（created、cls）供檢查用。
  - BEFORE trigger `dragon_saves_char_owner`（只管 authenticated、內容有變的上傳）：已登記給別的帳號 → `char owned elsewhere`（hint `dragon_char_owner`）；還沒登記但雲端已有別的帳號擁有同一隻 → 同樣拒收、不登記；否則登記給這個帳號。登記不會因刪除角色而消失，所以刪掉的分身也不能被新帳號傳回來。
  - 回填：只在一個帳號出現的角色登記給那個帳號；多個帳號都有的分身不登記（都會被擋），執行完列出這些分身，請管理者刪掉多餘的，留下的那個上傳時再登記。
- **遊戲端**：`cloudErrText` 顯示「這個角色已經屬於其他帳號，不能上傳到目前的帳號」；被拒收的格子依第 102 節 10 分鐘內不重傳。正常玩家不受影響（遊戲本來只上傳屬於目前帳號的角色）。
- **測試**：`tools/test-char-owner.js`（PGlite 先有舊資料再安裝、重複安裝）：回填只登記單一帳號、正主照常、別的帳號傳同一隻被擋、分身清掉多餘的之前雙方都擋、管理者刪掉一邊（含墓碑）後另一邊可上傳並登記、刪除後新帳號傳不回來、新角色首傳登記、管理者不受影響、登記表不可直讀。`test-vault-v2-client.js` 加裝 char-owner.sql，真實遊戲多帳號流程照常。check.ps1、混淆建置通過。
- **部署**：2026-10-23 使用者執行 char-owner.sql 成功，回填後沒有列出任何同時在多個帳號的分身（「操真猛」的分身應已刪除）。
- **待辦**：`wipe.sql` 白名單還沒加 `dragon_char_owner`（全清時要一起清，否則舊角色 id 會留在登記表；新角色 id 不同，不影響新開的角色）。

## 110. 弓、槍射程改 8 格（2026-10-23，版本 `20261023q`；`items.js` 的 `WEAPON_TYPES.bow/gun.range`、`combat.js` 的 `weaponRange`／`canReach`／`skillReach`、`ui-scene.js` 的 `sceneReach`）

- **使用者要求**：遠程職業的弓、槍攻擊距離從 4 格改成 8 格。攻擊魔法、共鳴技能維持 4 格（`RANGED_RANGE`），近戰 1 格（`MELEE_RANGE`）不變。
- **做法**：`WEAPON_TYPES.bow`／`gun` 加 `range: 8`；`weaponRange()` 回傳目前遠程武器的射程（沒拿遠程武器時同 4 格）。`sceneReach` 多回傳 `weapon`（直線距離 ≤ 射程＋0.5 且視線不被牆擋），`canReach('weapon')` 用它。普攻、`sceneCanHit`、轉向判斷改用 `weapon`；`skillReach`：攻擊魔法＝`ranged`（4 格）、拿遠程武器的物理技能＝`weapon`（8 格）、近戰＝`melee`。技能距離不足的提示顯示對應格數。
- 道具說明（`itemDescHtml`）與圖鑑（codex）的遠程武器多一行「射程 8 格」。
- 和以前一樣只在地圖畫面開著時檢查距離，背景與離線不限制。
- **測試**：`tools/test-weapon-range.js`：弓、槍 8 格內打得到、9 格打不到、斜角約 7.8 格可、中間有牆不行；魔法 4 格；近戰 1 格；技能距離種類；`canReach`；道具說明含「射程 8 格」。瀏覽器以未登入暫時妖精拿弓在低語海岸掛機正常（擊倒、無錯誤；怪物多在 4 格內出現並衝過來，所以實測距離多在 4 格內），測試角色已刪除。全部回歸、check.ps1、混淆建置通過。

## 111. 31煉獄雷霆魔皇（金變、近戰通用）（2026-10-23，版本 `20261023r`）

- 使用者提供31.jfif及31-1／31-2／31-3.jfif，確認新增第31種、金色、近戰武器通用，名稱「煉獄雷霆魔皇」。MORPH_GROUPS.melee為近戰通用系，採既有金變基礎：Lv.70、命中+7／傷害+7／攻速+20%；建議武器文字沿用現有提示規則，不新增裝備限制。MORPH_LV_FREE與SAVE_SCHEMA不變，卷軸仍30分鐘／1張。
- MORPH_FORMS.m31接MORPHS.infernalThunderEmperor；內建image_gen依四參考圖生成4欄9列36格，再做透明去背。黑紅骨甲／雙角／赤雷巨劍造型維持，不因金變階級改成金甲。正面、右側、背面各走4／攻4／施2／傷2，背面全程維持背向，左側鏡像右側。
- 格384×320、foot[192,270]、charH160、drawH48；時間130／140／220／150ms（攻擊560ms）。四張PNG圖集加入SW預載；images/sprites/morph/infernal-thunder-emperor-v1含單格／圖集／WebP／contact／manifest；tools/sprite-src同名資料夾保留四原圖、生成原稿／去背稿／完整prompts.json、registration.json與prepare.py。依透明連通區去除鄰格碎片，逐格腳點註冊，不覆寫來源。
- tools/infernal-emperor-morph-preview.html以實際卷軸選單／sceneReadEvents／sceneDraw隔離預覽；tools/test-infernal-emperor-morph.js驗證31種、金變數值、卷軸扣量／上次選擇、四向命中／MISS／施法／受傷／到期、其他外觀與SW。既有五份morph測試的數量預期改31。素材打包檢查36獨立RGBA及透明留邊；待使用者實玩後提交。工作中q版射程提交含部分m31資料，r版為素材與預載完整版本。

## 111. 管理頁「排除」正常玩家（信任名單）＋「已處理」24 小時內有效（2026-10-23，SQL `tools/flag-trust.sql`、`gm.html`；遊戲版本不變）

- **起因**：管理頁按「已處理」後，造成紀錄的情況還在（「角色建立 X 小時就 Lv.Y」、手機時間不準），玩家下次上傳又被記一筆新的、又被交易所門檻擋（玩家看到「帳號有待管理者確認的異常紀錄，暫時不能使用交易所與共用倉庫」），等於排除不掉。使用者同意照建議做。
- **SQL**（接在 supabase.sql、anticheat.sql、save-log-throttle.sql 之後，可重跑；**之後重跑那三份要再跑這份**）：
  - `dragon_trusted(user_id 主鍵, email, reason, by_email, at)`：RLS 只有管理者能讀寫（`dragon_is_admin()`），玩家看不到也寫不進去。
  - `dragon_market_hold`：信任名單上的帳號一律不擋。
  - `dragon_saves_audit`（從 save-log-throttle.sql 的版本複製修改）：信任名單的帳號記完存檔歷程後直接結束、不記可疑紀錄；去重改成「同一種異常、同一角色 24 小時內已有紀錄（**含已處理**）就不再記」，所以「已處理」至少 24 小時內有效，超過 24 小時情況還在才會再記。
- **gm.html**：可疑紀錄、玩家列表、存檔歷程視窗多一顆「排除」（已信任時變「取消信任」），帳號旁顯示 ✅；新分頁「✅ 信任名單」（時間、帳號、原因、處理人、取消信任）。`gmTrust` 跳 prompt 問原因 → upsert `dragon_trusted` → 把這個帳號所有未處理紀錄標成已處理；`gmUntrust` 確認後刪除。還沒執行 flag-trust.sql 時信任名單當作空的，排除會提示先執行 SQL。可疑紀錄頁的說明改成解釋「已處理」與「排除」的差別。
- **測試**：`tools/test-flag-trust.js`（PGlite 全部相關正式 SQL＋重複安裝）：未處理會擋；已處理後 24 小時內連傳不重記也不擋；超過 24 小時再記；排除後不擋、不記、歷程照記、舊的未處理紀錄也不擋；取消信任恢復；玩家讀不到、寫不進信任名單。gm.html 語法檢查、本機載入（分頁與函式存在、無錯誤）、混淆建置（gm-lib）通過；登入後的實際操作未測（需要管理者帳號）。

## 112. 32霜獄幽冥魔皇（金變、近戰通用）（2026-10-23，版本 `20261023s`）

- 使用者提供32.jfif、32-1／32-2／32-3.jfif並確認名稱「霜獄幽冥魔皇」、金色與近戰武器通用；沿用MORPH_GROUPS.melee，金變Lv.70／命中+7／傷害+7／攻速+20%。MORPH_FORMS新增m32，sprite為MORPHS.frostNetherEmperor；測試等級開關、30分鐘卷軸消耗、SAVE_SCHEMA不變，不增加裝備限制。
- 保留銀黑冰霜骨甲、黑色彎角、冰藍符文巨劍、深藍破披風與寒氣，金色為階級而非衣甲配色。原32-2／32-3同為背向，內建image_gen補正／側／背36格；初稿側走第一格舉劍與側施法偏背影，另生成側向12格替換，原稿均保留。
- 正式格384×320、foot[192,270]、charH160、drawH48；walk／attack每方向4格，cast／hit各2格，時間130／140／220／150ms，攻擊560ms。左方向鏡像右方向；四PNG加入SW預載。images/sprites/morph/frost-nether-emperor-v1保存36單格、四圖集／WebP／contact／manifest；tools/sprite-src同名目錄保存四參考／完整生成稿／提示詞／registration.json／prepare.py，以透明連通區隔離並註冊腳底，不覆寫舊圖。
- tools/frost-emperor-morph-preview.html使用實際卷軸選單、sceneReadEvents與sceneDraw，四方向四動作、循環與逐格；記憶體storage並禁止連外。tools/test-frost-emperor-morph.js檢查金變數值、各近戰武器外觀／加成、卷軸扣量／到期／上次選擇、命中／MISS／施法／受傷、其他變身、圖集與SW。既有變身數量斷言同步32；待實玩確認才提交／Push。

## 113. 修正離線結算／副本／世界首領後一直「喝水延遲中」（2026-10-23，版本 `20261023t`；`combat.js` 的 `potionReady`、`offline.js` 的 `measureHunt`、`raid.js` 的 `raidSimulate`）

- **玩家回報**：藥水不能喝，一直顯示「喝水延遲中」，紅水、勇水、綠水都一樣。
- **原因**：第 89 節的喝水延遲記在 `potReadyAt`（以 `gameNow` 計）。離線結算的 `measureHunt` 會把 `gameNow` 快轉最多 10 分鐘，團隊副本與世界首領的 `raidSimulate` 也會快轉；模擬裡自動喝水把 `potReadyAt` 設到快轉後的時間，模擬結束只還原 `gameNow`、沒還原 `potReadyAt`，回到真實時間後要等好幾分鐘才能再喝。最常在「切到背景回來、跳離線結算」後發生。
- **修正**：兩個模擬都把 `potReadyAt` 跟 `gameNow` 一起備份、還原。另外 `potionReady` 加保險：剩餘延遲超過一次的長度（`POTION_CD_MS`）就視為錯誤直接解除。
- **測試**：`tools/test-potion-delay.js`（模擬中一直喝水，結束後延遲還原、紅水綠水勇水可喝、0.8 秒延遲仍有效、超長延遲自動解除；舊程式會失敗）。check.ps1、離線掉落、後端掉寶、批次結算測試、混淆建置通過；瀏覽器載入版本 t 正常。

## 114. 異界地圖回卷：村莊一次性傳送門（2026-10-24，版本 `20261024a`；`maps.js` 的 `mapPortalOpen`／`enterMapPortal`／`closeMapPortalBtn`、`combat.js` 的 `moveToTown(townId, portal)`、`ui-scene.js` 的 `scenePortalSpot`／`drawMapPortal`）

- **使用者要求**：開啟異界地圖後按回家卷軸，村莊出現一次性魔法傳送門，玩家補給完可以再回到地圖；回到地圖後傳送門關閉。
- **資料**：新欄位 `player.mapPortal`（內容跟 `mapRun` 一樣：階級、地區、詞綴、剩餘怪物、首領剩餘 HP `bossHp`）。回卷時把 `mapRun` 整份搬過去、`mapRun` 清空。
  **伺服器（後端掉寶 `loot_spawn`）只看 `mapRun`**，所以回村期間不會被當成異界，就算玩家走路去同一個野外也只是一般地圖，SQL 不用改。存檔 schema 不變（`migrateSave` 補 `mapPortal: null`；地區不存在、`mods` 不是陣列或同時有 `mapRun` 時丟掉傳送門）。
- **哪些回村會開傳送門**：只有回家卷軸——手動（快捷欄／按鈕 `homeScrollBtn`）、自動（藥水用完 `useHomeScroll('藥水用完')`）、離線補給用完自動讀回卷（`offline.js`）。`useHomeScroll` 呼叫 `moveToTown(z.town, true)`：先 `rememberMapBoss()` 記住首領 HP，再 `mapPortalOpen()`（要在異界裡 `inMapRun()` 才開）。
  步行回村、死亡、逃離龍穴、通關照舊 `endMapRun`，地圖消失、沒有傳送門。
- **村莊畫面**：`buildScene` 在村莊算 `scene.portalAt`（出生點旁 2～4 格可走的地板，`scenePortalSpot`），`player.mapPortal` 存在時畫紫藍漩渦（`drawMapPortal`，旋轉光環＋光點）與名牌「異界傳送門 T? 返回」，點名牌 → `enterMapPortal`（沿用 `npcOpen`，只有點名牌才觸發）。
- **進入**（`enterMapPortal`）：要在村莊、沒在步行；`mapRun` 還原、`mapPortal` 清空（一次性）、傳送到該地區、切到狩獵並開始掛機，訊息顯示剩幾隻或「首領等著你」。首領剩餘 HP 照第 24 節的 `bossHp` 機制接著打。
- **異界裝置面板**：傳送門開著時顯示「🌀 異界傳送門開啟中」＋剩餘怪物、「🌀 進入傳送門」「關閉傳送門」（`closeMapPortalBtn`，確認後地圖消失）。傳送門開著時不能開新地圖（`openMap` 擋、開啟按鈕 disabled、背包地圖不顯示「🌀 開啟」）。
- **測試**：`tools/test-map-portal.js`（回卷保留進度、`mapRun` 清空、不能開新地圖、進入後一次性關閉並掛機、首領 HP 保留、死亡／步行不開傳送門、手動關閉、存檔修正）。check.ps1、喝水延遲、離線掉落、後端掉寶客戶端測試、混淆建置通過。
  瀏覽器以未登入暫時角色：開 T1 → 回卷 → 低語港出現傳送門與名牌 → 實際點名牌回到異界（剩 260 隻、傳送門關閉）；測試角色已刪除。未登入角色因 `lootCanPlay()` 不會自動掛機（開地圖時也一樣，非本次改動）。

## 115. 21款魔法娃娃外觀確認版（2026-10-24，沿用遊戲版本 `20261024a`）

- 使用者喜歡原三款（骷髏小騎士、冰霜幼龍、森林小精靈），另提供三張角色合照要求全部製作；新圖去重後18款，加原三款共21款。白虎選下方完整四足版，僅一款。使用者明確指定品質等外觀完成後再一起決定，所有quality／effects均為null；未設定稀有度、等級、能力、取得或消耗，不更動存檔／正式遊戲玩法。
- 新18款：熔岩魔犬、森靈幼鹿、星辰靈狐、蘑菇燈兔、潮汐幼龍、霜羽貓頭鷹、花翼仙兔、蒸氣松鼠、黃金獅鷲、紫晶靈龜、白虎、青龍、朱雀、金龍、鳳凰、玄武、麒麟、饕餮；名稱暫用於外觀辨識。內建image_gen逐款產生三向12格，冰霜幼龍沿用本對話先前已驗證的原稿，合計252格；4格基礎走路／飛行，不使用複製補間。
- 正式素材images/sprites/dolls/companions-v1/<id>/含walk.png、walk.webp、12單格、contact.png與manifest；總manifest.json及catalog.jpg同層。格256×240、foot[128,200]、charH160、drawH24（角色48px的一半）；下／右／上各4格×145ms，左鏡像右；停止可用中間一格。尚未由data或SW載入，未改script順序與遊戲JS／版本。
- 來源tools/sprite-src/dolls/companions-v1保留三張reference、plan.json、sources逐款原稿、prompts完整提示詞、prepare.py與README。prepare.py依每款共同尺度、下方不透明腳部定位，留出尾巴／翅膀／光效空間；驗證12格不重複、RGBA與透明留邊、逐格圖集相符。全部來源保留，不覆寫既有變身或人物素材。
- tools/magic-doll-preview.html獨立預覽21款，可選正／右／背／左、暫停／播放／逐格、實際比例及2／4倍檢查；以隔離測試角色的現有遊戲截圖示意大小，不是正式跟隨功能。此頁不載入遊戲JS、不讀寫存檔、不連後端。品質與能力欄只顯示待決定，等使用者看完外觀再討論。
- 驗證完成：21款／252格來源、RGBA與透明留邊、每款12格不重複、單格和圖集完全對應、一款白虎、21份完整提示詞、quality／effects均null。瀏覽器21款選擇、四方向／左右鏡像／暫停／逐格／實際比例及放大通過，Console無error／warn；check.ps1 ALL CHECKS PASSED（47檔／46script／20261024a）、git diff --check通過。等待使用者審閱外觀與動作，不接正式玩法／數值，不自行定品質。

### 115.1 使用者指定娃娃品質（2026-10-24，版本 `20261024b`）

- T0：麒麟、鳳凰、金龍、饕餮。
- T1：白虎、青龍、朱雀、玄武。
- T2：紫晶靈龜、黃金獅鷲、冰霜幼龍、花翼仙兔。
- T3：森林小精靈、星辰靈狐、熔岩魔犬、潮汐幼龍。
- T4：蒸氣松鼠、蘑菇燈兔、霜羽貓頭鷹、森靈幼鹿、骷髏小騎士。

- 以上為目前品質設定，取代115節初版quality全null的狀態；effects仍為null。plan、總表及21份單款manifest同步quality，prepare.py保留品質並產生附品質的總覽，預覽選單／標題／卡片顯示品質。不新增能力、召喚或存檔欄位。因修改預覽內嵌JS，依專案規則同步index全部?v=與GAME_VERSION。

### 115.2 已確認的召喚與加成規則（2026-10-24，設計紀錄；版本不變）

- 一次只能召喚一隻魔法娃娃，只有目前出場的娃娃提供加成。切換時移除原娃娃加成，收回後不提供加成；未出場娃娃不疊加能力。
- 使用者本次僅確認以上規則；先前提出的21款能力數值與各階共通經驗加成尚未確認，effects維持null。正式召喚、能力計算與存檔尚未實作。

### 115.3 暫不開放（2026-10-24，使用者決定；版本不變）

- 魔法娃娃暫不開放，使用者日後再增加。現有21款素材、動畫、獨立預覽、品質名單與單隻出場規則保留；目前不接正式召喚、跟隨、能力、取得方式或存檔。能力數值仍待確認，後續依使用者新指示繼續。

## 116. 後端掉寶紀錄每日自動清理（2026-10-24，SQL `tools/loot-cleanup.sql`；遊戲版本不變）

- **起因**：使用者查 Supabase 用量，`dragon_loot_jobs` 65 MB、`dragon_loot_receipts` 17 MB，佔資料庫約 9 成。第 104 節的清理只在玩家**自己**批次結算時順手清自己帳號最多 200 筆，不再上線的玩家、10/23 以前舊版遺留的憑證永遠不會清。
- **使用者決定**（2026-10-24）：先一次清掉，之後用 pg_cron 每天清全部玩家（推翻第 104 節「不用 pg_cron」）。
- **`loot_cleanup_all()`**（security definer，玩家與 anon 不能呼叫）：保留規則與 `loot_finish_batch` 的順手清理相同，只是不限帳號、不限筆數——收據與已結算帳本要已確認入帳（cursor ≤ `dragon_loot_state.acknowledged`）且超過 3 天才刪，**沒確認的不刪**；作廢超過 1 小時、超過 12 小時沒結算的憑證刪除。回傳 `{receipts, jobs}` 刪除筆數。
- **排程**：`create extension pg_cron`，工作名 `dragon-loot-cleanup`，`17 19 * * *`（UTC，＝台灣凌晨 3:17）。重跑這份會先 `cron.unschedule` 舊的再建立；執行檔本身最後會立刻清一次。
- **注意**：PostgreSQL 刪除後空間是給同一張表重用，主控台顯示的表大小不會馬上變小；要立刻縮小需另外單獨執行 `vacuum full public.dragon_loot_jobs;`（會短暫鎖表）。
- **查排程紀錄**：`select * from cron.job_run_details where jobid=(select jobid from cron.job where jobname='dragon-loot-cleanup') order by start_time desc limit 10;`
- **測試**：`tools/test-loot-cleanup.js`（PGlite 載入全部正式 SQL＋本檔去掉 pg_cron 段）：兩個帳號（含不在線、只確認到 1 的）、已確認超過 3 天才刪、未確認的收據／帳本保留、作廢／過期憑證刪除、進行中保留、重跑不多刪、玩家呼叫被拒；`test-loot-batch.js` 回歸通過。

## 117. 交易所三項修正：賣家入帳確認時機、過期商品不佔名額、道具分類以伺服器為準（2026-10-24，版本 `20261024c`；`market.js` 的 `marketDeliver`、SQL `tools/vault-v2.sql` 的 `dragon_item_cat`／`vault_put2`、`tools/market-v2.sql` 的 `market_list2`）

- **賣家入帳**：原本 `marketDeliver` 把賣出金幣加進角色後，不管 `cloudFlush` 成功與否都送 `market_ack`。上傳失敗（忙碌、被拒收）後這台進度又被雲端蓋掉（衝突選雲端、共用倉庫序號改用雲端）時，那筆收入永久消失。現在記下開始時的 `player`／`currentSlot`，角色沒換且 `cloudSyncedSlot(slot)` 為真才 ack；沒確認的下次 `market_pending` 會再出現，`player.marketGot` 擋重複入帳，若本機進度被蓋掉則 marketGot 也一起回到舊狀態，會正確重新入帳。
- **過期商品不佔名額**：`market_list2` 的 10 件上限只算 `state='active' and expires_at > now()`；過期沒取回的仍可在「我的上架」取回。
- **道具分類以伺服器為準**：新增 `dragon_item_cat(id)`（內部用，玩家不能呼叫）：`q_%` 一律 `quest`，其他查 `dragon_loot_catalog.data.items[id].cat`，查不到回 null。`market_list2` 用它決定分類（不採用玩家送來的 `p_cat`，查不到才用 p_cat）、存進 `dragon_market.cat`，quest 拒絕；`vault_put2` 也拒絕 quest。原本直接呼叫 API 謊報分類可以上架／存入任務道具。
- **部署**：Supabase SQL Editor 依序重跑 `tools/vault-v2.sql`、`tools/market-v2.sql`（都可重複執行）。遊戲端修正不依賴 SQL，可先上線。
- **測試**：`test-market-v2.js` 加任務道具謊報分類被拒（交易所＋共用倉庫）、分類以伺服器為準、過期不佔名額、未過期滿 10 件擋；`test-vault-v2-client.js` 加 ⑤-1：真實遊戲賣出後存檔被拒收時不 ack、下次上傳成功才 ack 且金幣只入帳一次（舊版 market.js 跑此段會失敗）。check.ps1、混淆建置（445 KB）、瀏覽器載入無錯誤。

## 118. 離線掛機門檻改為30分鐘（2026-10-24，版本 `20261024d`）

- 使用者要求離開畫面30分鐘內不算離線掛機。`config.js` 的 `OFFLINE_MIN_MS` 從30秒改為30分鐘，主迴圈暫停與重新讀檔共用門檻；未滿30分鐘不查離線資格、不模擬收益、不跳離線報告，接續原掛機。
- 瀏覽器暫停期間不會補算一般戰鬥；滿30分鐘仍依既有離線規則結算整段（12小時上限、50%效率）。不改存檔、SQL與掉寶規則。
- 驗證：隔離VM測30秒／1分鐘／10分鐘／29:59.999／30分鐘／30分鐘+1ms，主迴圈與重新讀檔入口均符合門檻，短暫離開不查伺服器；離線掉落與喝水延遲回歸、check.ps1 ALL CHECKS PASSED、混淆建置46檔445KB通過。實際手機切背景待使用者驗收。

## 119. 血盟綁實際角色、刪角自動退盟與盟主接班（2026-10-24，版本 `20261024e`）

- **使用者已確認**：改成綁入盟角色，同帳號其他角色不共用身分；同意製作SQL。盟主刪角先交給副盟主，無副盟主則交最早入盟有效盟員，無盟員才解散；多位副盟主按入盟時間、資料列id決定。
- **資料庫遷移** `tools/clan-character.sql`：成員／申請新增 `id`（UUID）與 `char_created`；成員主鍵帳號＋created＋職業，申請主鍵再加血盟。既有 `dragon_clans.leader` 保留帳號欄位，角色盟主以成員的leader職位辨識；同帳號可有多隻角色分別入盟或同盟。
- **舊資料**：在單一交易鎖表，按帳號＋名稱＋職業匹配唯一有效雲端角色，排除墓碑及名單最後更新後才建立的同名角色；多筆候選則整份回滾並回報帳號／名字／職業，不能任選。不存在的成員／申請清除，既有卡住的盟主一併接班。可重跑，不改角色存檔或SAVE_SCHEMA。
- **伺服器連動**：`clan_char_alive` 查雲端角色及墓碑；`clan_char_changed` 在存檔刪除／替換、墓碑新增時觸發 `clan_prune`，鎖血盟後清無效成員／申請、選有效接班人、同步人數與leader帳號；同角色仍在另一欄位不退盟。正常上傳同步該角色的名稱與等級，角色身分固定。離線刪角依既有待刪佇列，重新連線刪雲端或寫墓碑後才退盟。
- **RPC與權限**：新版 `clan_action(p_slot,p_action,p_args)` 從自己雲端欄位讀角色，核對請求created＋職業、登入／停權、角色職位；鎖雲端存檔與血盟，執行建盟／加入／審核／任命／讓位／退出／解散／公告／touch。建盟延續王族Lv15限制；金幣仍依既有遊戲端扣款。管理目標改傳成員／申請的id，能區分同帳號分身。舊帳號RPC撤銷PUBLIC／anon／authenticated執行權；內部函式不對玩家開放。
- **遊戲端**：`clanRpc` 對修改動作先saveGame＋await cloudSyncedSlot，只確認本角色；touch不強制上傳，避免改變離線收益的最後角色判定。伺服器讀自己的存檔，不信任客戶端名字／職業／等級。`clanLoad` 以touch回傳當前角色血盟，申請過濾created與職業；`clanLoadSeq`防止舊角色延遲回應蓋回新角色。`clanReset`在enterGame／登出清身分、名單與血盟聊天頻道；副本與在線名牌不沿用其他角色血盟。`cloudRemoveChar`補上當前帳號條件，管理者刪自己同ID角色時不會連別人一起刪。Supabase設定不變。
- **聊天／排行榜**：`clan_has_channel`讓帳號存取自己有效入盟角色的血盟頻道（認證仍以帳號為單位，遊戲畫面依當前角色切頻道）；RLS改用此檢查，最後入盟角色刪除後撤銷存取。`dragon_my_clan`相容函式只回最近上傳的有效入盟角色；排行榜精確關聯created＋職業，避免同帳號多角色造成多列錯誤。
- **部署**：先在Supabase執行整份 `tools/clan-character.sql`（須已有char-tombstone.sql），再發佈20261024e；執行後舊版血盟操作會被擋，需重新整理新版。重跑supabase.sql會還原舊函式／權限，因此必須再跑本檔。AI未連正式資料庫執行。
- **驗證**：`test-clan-character.js`載入正式supabase＋墓碑＋新遷移，涵蓋舊資料遷移、同名歧義完整回滾、已刪副盟主排除、墓碑／DELETE／替換角色退盟、另一欄位仍有同角色保留、接班／空盟解散、同帳號多角色權限、跨盟與舊RPC／內部函式拒絕、入盟申請／審核／清除、排行榜／頻道、重跑；`test-clan-character-client.js`載入實際遊戲腳本，涵蓋RPC身分、await上傳失敗與切角、舊回應忽略、同帳號分身按鈕ID、聊天與副本身分清除。
- **驗證結果**：上述新測試、test-char-owner與test-vault-v2-client回歸通過；check.ps1 ALL CHECKS PASSED（47檔／46script／20261024e）、git diff --check與混淆建置46檔445KB通過；瀏覽器首頁v20261024e無error／warn。正式登入血盟操作須待使用者執行SQL後實玩驗收。

## 120. 修正共用倉庫複製漏洞：同一瀏覽器兩個分頁（2026-10-24，版本 `20261024f`；`vault.js` 的 `vaultBase`／`vaultNoteLoaded`／`vaultEnvelope`、`save.js` 的 `applySaveData`／`saveGame`、`loot.js` 的 `lootApply`）

- **實際案例**：alen1144「太初」（欄位 1）2026-10-23 23:51（UTC）把 3 張相同的「冥火」異界地圖 T4（uid 141～143）存進共用倉庫，23:55 取出，23:56 存檔又出現原本 uid 141～143 的同 3 張 → `dragon_vault_audit` 記 vault_dupe（倉庫 #761～#764）。
- **漏洞**：`vaultEnvelope(data, previous)` 的存取序號取「本機 localStorage 上一份」與 `vaultLive` 的較大值。同一個瀏覽器的兩個分頁共用 localStorage：分頁 A 存入倉庫後把新序號寫進 localStorage，舊分頁 B（記憶體裡道具還在）存檔時借用這個新序號，上傳就通過 `dragon_vault_save_guard`；跳進度衝突時選「用這台的進度」也一樣（upsert 一樣過序號檢查）。匯入舊存檔代碼也會借用 localStorage 的序號。
- **修正**：序號只取這個分頁自己知道的——`vaultBase`（`applySaveData` 載入角色時記下存檔裡的 `vaultSeq`；改用雲端進度、匯入都會經過）與 `vaultLive`（自己存取倉庫／交易所後）。`vaultEnvelope(data)` 不再讀 previous。`lootApply` 寫入目前角色時也改用 `vaultEnvelope`（原本沿用 localStorage 那份的序號，同樣能被另一分頁借用）。舊分頁序號舊 → 伺服器拒收 → `cloudVaultAdopt` 改用雲端進度。
- **測試**：`test-vault-v2-client.js` ⑤-1b：分頁 A 存入長劍，切換成分頁 B 的記憶體（localStorage 是 A 寫的）＋舊 cloudKnown，存檔後選「用這台的進度」→ 雲端仍沒有那把劍、分頁 B 改用雲端進度（修正前此段失敗＝漏洞重現）。全部回歸、check.ps1、混淆建置、瀏覽器載入無錯誤。
- **待處理**：已經複製出來的道具（alen1144 那 3 張地圖等）要不要刪、要不要處分由使用者決定；其他帳號可用 gm.html 的 vault_dupe 紀錄找。

## 121. PC 左側拿掉聊天按鈕；共用倉庫複製品清除 SQL（2026-10-24，版本 `20261024g`；`ui-frame.js` 的 `PC_SLOTS`、SQL `tools/fix-vault-dupes.sql`）

- **聊天按鈕**：使用者要求。PC 16:9 地圖左側的多人功能圓鈕拿掉 💬 聊天（下排功能鍵已有聊天室），血盟、交易所往上補位（y 458、524）。手機版右柱抽屜的聊天不變。
- **`tools/fix-vault-dupes.sql`**（管理者在 SQL Editor 執行，帳號 email 寫在檔案兩處）：① 預覽（只讀）列出複製品；② 先把整份存檔備份到新表 `dragon_fix_backup(at, user_id, slot, data, note)`（RLS、玩家不能讀寫），再從背包／倉庫移除「存進共用倉庫 30 天內、不可堆疊（item ? 'ench'）、角色在存入前就建立、原 uid＋道具代號又出現在同欄位」的道具；有刪才寫：`dragon_vault_seq` +1、`data.vaultSeq`／`t`／`client_t` 更新、重算 `sig`，玩家還開著的舊遊戲上傳被拒、改用雲端進度。Messages 顯示每個欄位刪幾件；重跑不多刪。取出時拿到新 uid 的那份保留。
- **測試**：`tools/test-fix-vault-dupes.js`（PGlite 重現存入→取出→舊分頁蓋回，預覽列出 3 張、只刪複製品、備份、簽章正確、序號 +1 擋舊遊戲、重跑不多刪）。

## 122. 倉庫、共用倉庫、回收：相同道具合併成一列＋數量框（2026-10-24，版本 `20261024h`；`ui-panels.js` 的 `instKindKey`／`groupInv`／`invGroupOf`／`groupPicks`／`qtyInputHtml`／`qtyRead`／`groupRowHtml`／`sellN`、`town.js` 的 `moveQty`／`moveGroupN`／`depositN`／`withdrawN`、`vault.js` 的 `vaultGroups`／`vaultPutN`／`vaultPutOne`／`vaultTakeN`／`vaultTakeOne`）

- **使用者要求**：倉庫、回收清單裡同樣的道具（例如好幾張一樣的異界地圖 T6）疊成一列，旁邊加數量框和按鈕，選數量存放或賣出。
- **合併規則**：可堆疊的本來就是一疊（n）；不可堆疊的除了 `uid`、`n` 以外所有欄位都一樣（`instKindKey`：品質、詞綴、強化、地圖詞綴、名稱、物品等級、BOSS 附魔…）才合併成「×N」。存檔仍是一件一個實體，只是顯示合併。
- **數量框**：數量 >1 才出現；角色倉庫／共用倉庫預設全部，回收預設 1；輸入超過上限自動夾到上限，非正整數提示。
- **角色倉庫**（`depositN`／`withdrawN`）：一疊只搬 n 個（`moveQty`，剩下的留原處，目的地有同種就併疊、沒有就給新 uid）；不可堆疊搬前 n 件；取出先檢查負重。舊的 `depositItem`／`withdrawItem` 移除。
- **回收**（`sellN`）：一疊賣 n 個、不可堆疊賣前 n 件；有品質／強化／BOSS 附魔或單價 ≥5000 先確認。勾選框一次勾整組（`sellPickToggle` 切換整組 uid），「賣出勾選」照舊整疊賣。舊的 `sellBtn`、`town.js` 的 `sellItem` 移除。
- **共用倉庫**（`vaultPutN`／`vaultTakeN`）：背包清單合併；存入一疊 n 個收一次手續費，不可堆疊存前 n 件、每件一次 `vault_put2`（各收 100）；先檢查手續費與 200 格上限，確認後在同一次 `vaultRun` 依序存。倉庫清單 `vaultGroups`：不可堆疊同種合併、可選取出幾件（每件一次 `vault_take2`、各收 100，多件先確認）；一筆一疊的仍整筆取出。`vaultPut`／`vaultTake` 保留（拆出 `vaultPutOne`／`vaultTakeOne`）。伺服器 SQL 不變。
- **測試**：`test-vault-v2-client.js` ⑤-1c（3 把相同匕首存 2 把→倉庫合併 2 把→一次取出 2 把，本機與雲端一致）；瀏覽器實測角色倉庫存 3 張／15 瓶、取 2 張、回收賣 2 張（確認框）／5 瓶、勾選整組；check.ps1、混淆建置（447 KB）、回歸通過。

## 123. 主面板負重（2026-10-24，版本 `20261024k`）

- `renderStatus` 使用 `invWeight() / calcStats().weightMax` 向下取整為百分比，在 MR 右側顯示「負重 xx%」，隨狀態列更新。
- `.hud-mr` 作定位基準，`.hud-weight` 接在右側，不推動原本金幣、等級、防禦與 MR；PC 與直式外框共用。不改負重規則或存檔。

## 124. 物品防賣鎖定（2026-10-24，版本 `20261024m`，schema 6）

- 使用者同意新增存檔鎖定欄位。物品可帶 `sellLocked: true`，解鎖刪除此欄位；`migrateSave` 為舊物品維持未鎖定，背包、倉庫、裝備只保留明確true。加密存檔與雲端既有流程保留欄位，不改SQL。
- `ui-panels.js` 新增頂層 `itemLockButton(x, grouped)`／`toggleItemLock(uid, grouped)`；背包及回收頁顯示🔓鎖定／🔒已鎖定，點擊立即存檔並取消該物品勾選。回收合併列鎖整組；背包合併異界地圖依同種與鎖定狀態分列，按鎖定套用該列全部地圖。
- `sellPickAll`、`sellPickToggle`、`sellPickedList`、`bulkSellList` 都排除已鎖定；回收頁鎖定列的勾選與賣出停用，全選狀態只算未鎖物品。`sellN` 呼叫與確認時再檢查鎖；一鍵賣出確認時重查原清單，避免確認期間鎖定或背包改變仍被售出。
- 鎖定僅防回收賣出，裝備、使用、衝裝、改造、交易所上架與倉庫操作沿原規則。堆疊合併時只要其中一疊有鎖，整疊保留鎖（bagTidy、town.js moveInst／moveQty）；拆疊複製原屬性。marketGiveItem取回堆疊物品時也保留鎖，裝備沿既有欄位複製。新拾取併入已鎖堆疊時同樣受鎖保護。
- CSS `.bag-item-open` 為背包道具介紹按鈕，和 `.item-lock` 並排，避免按鎖時打開介紹；`.item-lock[aria-pressed="true"]` 金色邊框。無新增script載入依賴。
- 隔離測試 `tools/test-item-lock.js`：加密saveEncode／saveParse往返、schema5遷移、全選與單件／勾選／一鍵賣出、確認期間加鎖、解鎖可賣、整組與地圖分列、角色倉庫拆疊合併、共用倉庫客戶端交貨。預覽 `tools/item-lock-preview.html` 只用記憶體storage，拒絕fetch、不載main／pwa、不連正式後端。

## 125. 變身恢復等級鎖、GM豁免（2026-10-24，版本 `20261024n`）

- 使用者要求恢復變身卷軸的等級限制，GM權限不受影響。items.js恢復MORPH_LV_FREE=false；新頂層morphGmOk只接受目前登入帳號、未封鎖且cloudMorphAdminUid與cloudUser.id相符。morphLvOk共用原有選單／usePotion驗證，等級不足不扣卷、不替換現有增益；已在進行中的變身不主動取消。
- cloud.js新增記憶體cloudMorphAdminUid與cloudCheckMorphAdmin：登入通過單裝置檢查後，用既有dragon_is_admin RPC驗證，只有data===true才記住該帳號；查詢失敗維持一般等級限制，晚到回覆不得套給別的帳號，登出／被踢／重新登入清空。未修改Supabase設定、SQL、GM管理權限或角色存檔（schema仍6）。GM須登入並完成權限查詢。
- 選單一般玩家顯示「等級不夠的不能選」，GM顯示「GM：不限變身等級」。原本32款階級與加成、卷軸消耗／時效均不變。
- tools/test-morph-level-lock.js隔離驗證32款門檻前一級／剛達標、拒絕不扣卷不改buff、自動使用lastMorph、GM Lv.1全開、一般帳號／換帳號／登出／封鎖／RPC錯誤與延遲回覆；瀏覽器預覽只用記憶體角色和模擬權限，不呼叫正式後端。一般Lv.1全32款停用，模擬GM Lv.1全開且實選金變成功扣1卷，Console無error／warn。

## 126. 五格異界地圖排程（2026-10-24，版本 `20261024v`，開發起版 t，schema 7）

- **需求與操作**：最多5種地圖，第1格先刷完全部張數，再到第2格。每格從背包選同種地圖（mapKindKey＝階級／品質／詞綴／名稱），輸入張數後按設定；↑↓排序、清空一格。開始後固定名單，要修改先取消重排。PC底列圖鑑右、地圖左原空位新增📋圓鈕；手機右側選單及異界裝置也有入口。
- **存檔**：player.mapQueue預設null；使用時為`{slots:[null|{key,name,uids,done,failed}],state,index,active,reason}`，最多5格且同種不重複。uids只記未使用的卷軸；開始下一張才移除首個uid並實際扣卷，mapRun.queueSlot記所屬格，回卷搬入mapPortal時一併保留。地圖仍留在背包，未使用者不預扣、不複製；賣出／存倉／改造預選卷軸後會暫停，不能自動拿新掉落替換。
- **執行**：main.gameTick在huntTick返回後呼叫mapQueueTick，避免戰鬥回呼內重入開圖。active時等待目前地圖，completeMap呼叫mapQueueCompleted計完成次數，正常回村後才開下一張；同格uids用完才向後找非空格，全部結束state=done。openMap(uid,true)設定queueSlot，普通openMap執行中禁止插入。新圖開啟前`scene=null`，避免同一幀通關、回村、再開共用大地圖時沿用舊角色位置而被sceneEnterZone拉回前區；排程由傳送門繼續時亦重建場景。
- **暫停／取消**：暫停立即stopHunt，保留剩怪與bossHp，再開始接原圖、不再扣地圖卷。stopHunt亦令執行中排程暫停；回卷mapPortalOpen暫停且保留active，補給後繼續會enterMapPortal。死亡／步行／放棄／關門透過mapQueueLost記中斷一次、停止排程，不補回已耗卷。取消需gameConfirm，停掉排程目前掛機、移除queueSlot、清空排程；保留目前異界／傳送門與未用卷。對話框確認時檢查角色及原排程身分，避免操作套給另一角色。
- **補給與連線**：開始／開下一張前，檢查自動紅水已用完、負重達設定回村門檻、遠程彈藥已用完、lootCanPlay。未就緒不扣卷；實際戰鬥的自動補給回村沿既有邏輯，會觸發排程暫停。手動離開異界所在區域亦暫停，返回原區或取消後才能繼續。
- **遷移與離線**：mapQueueNormalize由migrateSave呼叫，舊檔無排程補null，清掉第6格後資料與重複／非法uid，讀回的running改paused；active進度保留但hunting=false，要手動按繼續。重開後不直接進行排程或結算其離線掛機；頁面背景離線模擬不執行mapQueueTick、不通關換下一張。既有未排程的離線規則不變。資料庫／Supabase設定／SQL不改。
- **全域**：MAP_QUEUE_MAX；mapQueueGet／mapQueueNormalize／mapQueueChoices／mapQueueChoose／mapQueuePick／mapQueueSet／mapQueueSelectChanged／mapQueueRemove／mapQueueMove／mapQueueAutoPause／mapQueueLost／mapQueueCompleted／mapQueueSupplyReason／mapQueueStart／mapQueuePause／mapQueueCancel／mapQueueTick／mapQueueLiveHtml／mapQueueRowStatus／updateMapQueueLive／renderMapQueue。TABS及PANEL_FNS註冊mapQueue，renderStatus每250ms只更新進度與控制列，避免重建正在編輯的表單。新增.map-queue-row與#map-queue-live樣式；開始後收起設定欄，只看執行進度。
- **驗證**：tools/test-map-queue.js記憶體角色與加密存檔，禁止連線：3＋1順序、最多5格／非法數量／去重／排序、暫停繼續取消、死亡回卷、缺卷／改造／補給／斷線、一般開圖隔離、schema6遷移／讀回暫停、SIM不接圖、共用場景換區、骷髏停止與最後一張中斷後結束。tools/map-queue-preview.html取真實index樣式／外框／腳本、排除main／pwa，只用記憶體storage並拒絕連外；PC實點3張T1後進T2低語墓窟、讀檔暫停／繼續、手機完成與取消重設，Console無error／warn。

第126節最終驗證（20261024v）：check.ps1 ALL CHECKS PASSED（48檔／47 scripts）、47檔混淆建置460KB，輸出TEMP/dark-map-queue-20261024t（內部版本v）；test-map-queue、test-map-portal、test-item-lock、test-potion-delay、test-offline-drops、test-server-loot-client皆通過，git diff --check通過。v整合另一對話的變身武器限制與共鳴攻速8%（u），未覆寫該修改。正式帳號實玩仍待使用者確認。

第126節補充（2026-10-24，20261024w）：地圖選擇改為遊戲內彩色清單（mapQueueChoose／mapQueuePick），避免原生select在手機忽略option字色。使用itemClass及既有品質CSS：普通白、魔法q-magic藍、稀有q-rare黃；選中名稱、已設定欄位標題及執行中地圖同樣保留品質色。原map-queue-select-N改為hidden input存選擇uid，map-queue-pick-N為可點選按鈕，按設定才存入排程；不改schema或排程規則。新增.map-queue-picker／.map-queue-choice樣式；預覽加入魔法T6與稀有T7，PC與手機實點選擇和設定，字色實測rgb(106,168,255)／rgb(255,216,74)，Console無error／warn，test-map-queue及check.ps1通過。

第80節補充（2026-10-24，20261024aa）：命運的覺醒石專屬外觀為原創虹彩紫晶、破碎金色符環與白金星芒核心，內建image_gen生成透明原稿，保留於tools/icon-src/items/awakening-stone-v1/source.png；完整提示詞PROMPT.md，prepare.ps1保留全幅及alpha、等比縮入112px後置中128×128，四邊至少8px透明，正式檔images/icons/items/curAwaken-v1.png。
- icons.js的ITEM_IMG.curAwaken指向curAwaken-v1，所有共用itemIconHtml介面直接使用新圖；craft.openCraftDialog的覺醒石cc-i及ui-panels.renderGearForge的通貨列也改用itemIconHtml，其他通貨沿原圖示。新增.craft-cur .cc-i .ico固定28px。sw.js預載新圖?v=1，保持安裝版離線可用。不改掉率、權重、能力、價格、存檔、SQL。
- tools/item-art-preview.html改讀index目前版本號，避免測試舊快取；test-item-art同步434件道具／287張獨立PNG，含覺醒石背包、鍛造列、改造視窗接線驗證。RGBA／128px／透明留邊檢查、全圖檔案存在與不重複檢查、瀏覽器圖庫成功1張缺0張且Console無error／warn。

## 127. 劇毒蛛后、毒霧巢穴與中毒附魔（2026-10-24，版本 `20261024af`）

- 使用者要求「變身完成後增加一種中毒BOSS附魔」，選擇新增毒系BOSS與專屬材料並同意需更新後端掉落。新增venomNest毒霧巢穴（Lv.38～48、暗金城、傳送600、通用cave畫面），venomSpider毒霧獵蛛Lv.42及venomQueen劇毒蛛后Lv.52（HP×12、傷害×1.6、經驗×15、金幣×10、額外AC−12）；稀有出現0.8%，不改其他區域首領。蛛后噴吐為現有立即魔法傷害，未新增玩家中毒。
- 蛛后專屬spiderVenom蛛后毒囊，重量5、回收5000，自身掉落固定0.1%／一次1個、不受異界加成。材料附魔100萬金幣，產生第26種BOSS附魔「劇毒侵蝕」；封存消耗永夜之魂×1＋50萬得到soul_spiderVenom，裝回消耗石×1＋50萬，原有武器／強化／詞綴／共鳴保留。
- 命中8%觸發、共用附魔冷卻8秒；主目標每秒30% B魔法傷害，共6跳，第一跳於1秒後、沒有額外立即傷害。受MR與既有附魔烙印影響，無暴擊、吸血、額外連鎖或範圍傷害；BOSS同樣有效。沿用bossEnchantRuntime.jobs的dot工作，最多1層，重施重置第一跳與6秒期限，gameNow推進；換武器、離戰、目標死亡依既有流程取消，不新增player欄位或schema（仍7）。
- world-vfx的status-0中毒綠霧從僅預覽改為真實毒傷工作顯示，隨活目標移動、毒傷結束消失，玩家死亡／武器不符不畫。既有燃燒／冰霜／暈眩不改；僅預覽剩格擋、突破兩款。boss-vfx新增spiderVenom→venom-burst-v1（16格4×4），鍛造師特效預覽可看。
- noMap是靜態區域設定，mapZones排除此區，保持全部既有異界階級與舊卷軸對應、T15倍率不變；地圖清單仍有正常毒霧巢穴入口。未新增異界專用道具，也不改已有存檔的mapRun／排程。
- tools/sprite-src/poison-boss-v1保留內建image_gen四份透明原稿、prompts.json、prepare.py及audit.json。正式images/monsters/venomQueen.png為256×224單姿勢按六列怪物協定排版（未宣稱新動作），size80／body180；毒霧獵蛛沿用巨大蜘蛛原創模型。spiderVenom-v1.png與soul_spiderVenom-v1.png為128×128專屬道具圖，images/vfx/venom-burst-v1.png為1024×1024圖集；SW預載四個新增檔。道具共436件／新PNG289，BOSS附魔及對應封魂石26種。
- tools/poison-enchant-preview.html用真實鍛造確認／封魂／裝回、travelZone及sceneDraw隔離測試，記憶體localStorage、拒絕外部fetch、不載main／pwa；強制觸發只限此測試按鈕，正式仍8%。test-poison-enchant.js涵蓋六跳／抗魔／BOSS／冷卻／重施／不疊層／換武器／死亡與綠霧跟隨／異界排序／schema不變；test-boss-enchant及world-vfx／item-art同步新數量。
- 使用者已授權更新後端目錄：node tools/export-loot-catalog.js產生436道具／80怪／20區的loot-catalog.json、loot-catalog.sql及整包安裝檔server-loot-install.sql；不改server-loot.sql函式／Supabase設定。**正式庫尚未操作：請使用者先在Supabase SQL Editor執行tools/loot-catalog.sql，再發布遊戲**，舊憑證保留舊規則。test-server-loot-db用隔離PGlite驗證實際SQL、蛛后生怪與毒囊固定一個掉落，測試內強制機率不回寫正式目錄。

## 128. GM 發放道具（2026-10-24，版本 `20261024ah`；`chat.js` 的 `chatCommand`／`gmCmdOk`／`gmFindItem`、`gm.html` 的 `gmGive`／`gmGiveSend`、SQL `tools/gm-give.sql`）

- 使用者要求「新增 GM 指令 發放道具」，選定：發給自己＋發給指定玩家都要、管理頁和遊戲內聊天指令兩邊都做。權限沿用既有 `dragon_admins`／`dragon_is_admin()`（同第 125 節變身豁免，遊戲端看 `cloudMorphAdminUid`；伺服器 RPC 自己再查一次）。
- **遊戲內聊天指令**：在聊天輸入框打 `/give 道具id或名稱 [數量] [對方Email]`（`/發放` 也可）。以 `/` 開頭的訊息一律不送進聊天；非 GM 只顯示「只有 GM 可以使用這個指令」，其他 `/` 開頭顯示「沒有這個指令」。道具可打 id、完整名稱或部分名稱（多個符合時列出 id 請 GM 改打 id）；數量預設 1，可堆疊最多 99999、裝備最多 50（`GM_GIVE_MAX_STACK`／`GM_GIVE_MAX_EQUIP`）。
  - 不填 Email＝直接 `addItem` 進自己目前角色的背包（裝備 +0 普通品質、不檢查負重），接著 `refreshUI`＋`saveGame`。
  - 填 Email＝呼叫 `gm_give_item` 放進對方帳號的**共用倉庫**，對方到村莊倉庫 → 共用倉庫取出（照常收 100 金幣手續費、要雲端存檔簽章正確）。
- **管理頁**：「👥 玩家」分頁每個帳號的「鑽石／道具」欄多一顆「🎁 道具」，開視窗選道具（datalist 可打名稱搜尋，清單來自伺服器道具目錄、排除任務道具）、填數量與原因後發放，下方列最近 20 筆發給該帳號的紀錄。視窗內不用原生對話框。
- **SQL `tools/gm-give.sql`（使用者自己在 Supabase SQL Editor 執行，可重複執行）**：`dragon_gm_give_log` 發放紀錄（RLS 只有管理者看得到）、`gm_item_list()` 道具清單、`gm_give_item(p_target, p_item, p_n, p_reason)`（p_target＝user_id 或 Email，不分大小寫）。非管理者 `not admin`；道具以 `dragon_loot_catalog` 為準（新道具要先重跑 server-loot-install／loot-catalog 才能發），任務道具拒絕；可堆疊 1 格、裝備每件 1 格；共用倉庫 200 格上限照算（`vault full`）。插入的列 `from_slot = -1`、`uid = 0`，不會被 vault_dupe 誤判；與共用倉庫存取用同一把 advisory lock。
- 測試：`tools/test-gm-give.js`（PGlite 隔離，只在記憶體）驗證一般玩家被拒、看不到紀錄、Email 大小寫、堆疊／裝備格數、上限、任務道具、找不到帳號、倉庫滿、紀錄內容、可重複安裝。瀏覽器用記憶體角色＋模擬 GM 驗證指令（一般玩家被擋、自己背包 +10 藥水、+3 匕首、數量上限、找不到道具、說明、指定 Email 的 RPC 參數與錯誤訊息、登出後失效），gm.html 用假 sb 驗證發放視窗，Console 無錯誤；沒有連正式後端。

## 129. PC 底部上排：任務、背包移到右邊，左邊 2 格改快捷欄（2026-10-24，版本 `20261024ai`；`ui-frame.js` 的 `PC_SLOTS`、`hotbar.js` 的 `barPcPos`、`player.js` 的 `BAR_N`／`defaultBar`）

- 使用者嫌 PC 底部上排太亂：✨ 技能右邊的 📜 任務、🎒 背包換到右邊，空出來的兩格也做成快捷鍵。
- 上排 12 方格現在：第 1～2 格＝快捷欄第 23～24 格（index 22、23）→ 第 3～8 格＝快捷欄第 17～22 格 → 第 9～12 格＝📜 任務、🎒 背包、💾 手動存檔、📖 裝備圖鑑（原本第 9、12 格是空的，存檔／圖鑑往右各移一格），右邊接 📋 地圖排程圓鈕。
- `BAR_N` 22 → 24；`defaultBar` 尾端多 2 個空格；舊存檔讀檔時 `normalizeBar` 自動補到 24 格（原本 22 格內容不變）。新 2 格沒有鍵盤字（只有 0～15 有），手機不顯示（手機只畫 0～15），但開了自動照樣生效；學魔法書自動放置仍只找 0～15。技能頁說明改成「上排 8 格也能放」。
- 瀏覽器 PC 16:9 實測：上排順序正確、第 23 格點開選單放治癒藥水、點一下手動喝水、右邊 🎒 開背包、22 格舊資料補到 24 格，Console 無錯誤。

## 130. 修正怪物重生到同名地圖的另一塊（2026-10-24，版本 `20261024aj`；`ui-scene.js` 的 `huntSpots`）

- 使用者回報「怪物重生沒有出生在該區域」。原因：大地圖 `SCENE_BGS.wild.regions` 裡同一個地圖可以有好幾塊——精靈森林有 [47,0,93,36]、[47,37,93,73] 兩塊相連，另外一塊在右下角 [141,111,187,148]；歐瑞雪原兩塊相連。`huntSpots` 以前從角色位置穿過**所有**地板洪水填充，再挑屬於目前地圖的格子，所以在北邊精靈森林掛機時，1841 格重生點裡有 624 格在右下角那塊，約 1/3 的怪生到角色過不去的地方（掛機路線 `huntPath` 不會走出地圖）。
- 修正：角色站在目前地圖的格子上時，洪水填充只穿過 `inHuntZone` 的格子＝角色所在、連在一起的那一塊；角色剛好站在區外（剛跨過交界還沒換地圖）才照舊穿過別的地圖找。相連的兩塊（精靈森林北／中、歐瑞雪原左右）仍算同一塊。
- 驗證：16 塊區域逐一把角色放在中心、生 30 隻怪：每塊的重生點都只在角色所在那塊（精靈森林北 1217 格＝北＋中兩塊、右下角那塊 624 格自己一塊），沒有怪生到右下角；實際進精靈森林掛 8 秒，地圖上 17 隻怪都不在右下角，Console 無錯誤。
- **20261024ak 追加：改成每一塊各自生怪**。使用者說明要的是「迷霧古林區域內的怪物在迷霧古林區域隨機出生」：大地圖每一塊有自己的名字（`scene-art.js` 的 `SCENE_WORLD_TILES`），elvenForest＝迷霧古林（北）／古林河畔（中）／南境林道（右下），orenSnow＝永凍荒原／霜峰山道，上一版把相連的兩塊當成一區還不夠。
  - `inHuntZone` 改存每格屬於哪一塊（`bg._regOf`＝regions 索引，取代 `_zoneOf`）：角色站在目前地圖的某一塊上時，只有同一塊才算；角色剛好站在別的地圖的格子上才退回整個地圖都算。所以重生、怪物遊走、掛機尋怪、`huntPath` 自動走路、離開時收怪都以「這一塊」為準；手動走路照舊不受限，走到同地圖的另一塊時舊塊的怪收掉、新塊一口氣補滿。
  - `huntSpots` 快取鍵改成「地圖 id｜塊索引」，換塊就重算。
  - 驗證：16 塊逐一把角色放中央生 30 隻，重生點與怪全部在該塊內（迷霧古林 606 格、古林河畔 611 格、南境林道 624 格各自獨立）；迷霧古林走到古林河畔，舊怪 20 隻全收、新生 20 隻都在古林河畔；迷霧古林模擬 1500 幀（打倒再重生 27 隻＋遊走）沒有一隻離開該塊，Console 無新錯誤。

## 131. 毒霧巢穴世界地圖與南境林道入口（2026-10-24，版本 `20261024al`）

- 使用者要求新區也出現在世界地圖，並明確選擇「南境林道加入可步行抵達的洞穴入口，點入口進入獨立巢穴」。沿用16塊世界幾何，不替換任何既有區域／怪物分區。
- scene-art.js的SCENE_ART_BGS.wild.fieldNpcs新增入口[164,125]，前方[164,127]可走且與全世界相通；zone仍elvenForest、實際所在南境林道，單一入口格3擋路。新增靜態entrance:true、原創毒霧蛛網洞口PNG／h2.8，ui-scene對入口圖置中，仍只有名牌觸發原有點擊流程，不擴大身體點擊區。
- world-atlas.js新增venomNest地標、下拉目的地、建議等級、南境林道與600金幣說明及「步行至入口」；target=[164,127]，只排尋路、不直接切區或扣錢。地形圖保留，新增atlas-landmark透明洞穴地景疊在對應座標，scene-art.css控尺寸；世界地標共24個。syncWorldAtlas對一般洞穴bg=null也能顯示位置，不再讀null.big。
- ui-panels.js新增頂層openVenomNestEntrance：距離5格內才可開gameConfirm，確認時再次檢查同角色、仍在入口附近；沿enterZoneFromKeeper收600金幣、進venomNest並開始掛機，缺錢／取消不扣費。地圖卡片改為「前往洞穴入口」，由村莊免費到南境林道入口前，進洞才付600；既有塔傳送師不變。
- 新圖images/maps/rework/venom-entrance-v1.png為384×320透明原創，來源與完整提示詞保留於tools/sprite-src/poison-boss-v1/entrance-source.png及entrance-prompt.txt，prepare.py等比留邊輸出，SW預載。
- test-poison-enchant新增世界入口可達、地標／座標一致、步行不改所在地與金幣、遠距／取消／確認前移開／缺錢阻擋、成功扣600與洞內出生點可走；隔離頁poison-enchant-preview新增南境入口、世界地圖及點入口名牌控制。地圖、掉落目錄及中毒共同以al版重新檢查，schema7與異界排序不變。
- 後端仍由使用者先執行tools/loot-catalog.sql（本次匯出436道具／80怪／20區），不必重裝server-loot.sql，也不改Supabase設定。巢穴入口只是世界導航，不新增後端傳送RPC。
- 最終驗證（al）：check.ps1 ALL CHECKS PASSED；test-poison-enchant／boss-enchant／world-vfx／item-art／cave-assassin-morph／map-queue／server-loot-db／server-loot-client通過。隔離瀏覽器世界地標→入口確認→取消不扣費→確認扣600進洞、洞內開世界地圖，以及材料附魔→封魂→裝回實點完成，最新Console無error／warn。中毒六跳後蛛后HP5000→4874、剩餘0。47檔混淆465KB、五個新美術檔打包hash一致、git diff --check通過。正式SQL尚待使用者執行，實玩驗收後再提交剩餘檔案。

## 132. 遠程武器掛機不再走到怪旁邊（2026-10-24，版本 `20261024am`；`ui-scene.js` 的 `sceneUpdate` 掛機尋怪段、綁定地圖怪段）

- 玩家回報：槍手、弓手掛機打一打就變成走到怪物旁邊近距離打。
- 原因：`hunt.state === 'search'`（每打倒一隻怪後 0.6～1.6 秒、瞬移卷軸 `leaveFight(1500)`、換樓層、大地圖換區之後）時，`sceneUpdate` 的「掛機尋怪」一律以 6 格為一段走向最近的怪、走到距離 1 才停，沒有看武器；角色每秒 5.5 格，等 `sceneHuntReady` 時間到的那 1 秒多已經貼到怪旁。開打後 `sceneReach().weapon` 的判斷是對的，所以只有「找下一隻怪」那段走錯。
- 修正：
  - 尋怪時拿遠程武器（`weaponIsRanged()`）：地圖上這一塊已有射程內（`sceneReach(m).weapon`，8 格＋視線）沒在戰鬥的怪 → 原地面向牠等開打；沒有才走，而且一次只走一格、每格重新判斷，進射程就停。近戰照舊 6 格一段走到旁邊。
  - 開打綁定地圖怪（`hunt.mobs` 對應 `scene.mons`）：遠程武器優先綁射程內看得到的怪（射程外的距離 +1000），避免綁到牆後最近的怪又得走過去。
- 沒改的（原本設計，使用者 2026-10-24 確認維持、不做遠程後退拉距離）：開打後怪物會自己走到角色旁邊才能攻擊（`mobInReach`），所以遠程角色站著不動、怪走過來後仍會在貼身距離射擊（照樣扣彈藥、遠程命中／傷害公式）；`sceneRelock` 打不到時把怪移到角色旁邊也保留。
- 驗證（隔離測試頁：記憶體角色、禁止連外、自己驅動 `sceneUpdate`）：舊版槍手 40 秒攻擊 39 次有 31 次貼身、角色自己走進怪旁 2 次；新版槍手（低語海岸 40 秒、迷霧古林 80 秒 3 隻圍攻）角色自己走進怪旁 0 次、迷霧古林全程沒移動；弓手在低語墓窟連用 3 次瞬移、不死系自動換銀箭，走進怪旁 0 次；騎士照舊走到旁邊打（32 次全部距離 1、7 殺）。Console 無錯誤。

## 133. 訊息按鈕移至技能右側並更換圖示（2026-10-24，版本 `20261024an`）

- 使用者截圖要求左下紅圈訊息按鈕移到技能右邊箭頭空位，並與任務卷軸分辨。PC的#skull-log改原圖left525／top936／width56／height60，位於技能圓鈕（x447～513）與第一快捷欄（x590）之間，無重疊；左下不再放按鈕。原戰鬥訊息抽屜面板定位與三頁行為不變，手機仍沿用左下位置。
- 內建image_gen原創深青藍琺瑯＋古銅邊雙對話泡，前方三個亮點，與任務羊皮卷軸造型區分；正式images/ui/message-bubbles-v1.png為128×128透明PNG，原稿／完整PROMPT.txt／prepare.py保留於tools/icon-src/ui/message-bubbles-v1，SW預載。靜態button仍呼叫頂層toggleLogDrawer，不涉及存檔或聊天後端；新圖同時用於手機訊息按鈕。
- index.html新增圖片等比尺寸、手機22px圖框、PC深色銅框與開啟亮邊；訊息／聊天／掉落紀錄三頁仍走原實作。tools/message-button-preview.html以最新index實際外框＋記憶體角色（新m06）隔離測PC／手機、任務及訊息抽屜，拒絕外部fetch，不讀寫真實存檔。
- tools/test-log-drawer檢查PC與手機抽屜定位回歸；純按鈕位置與美術用瀏覽器確認，不新增照抄CSS的測試。

第18.15／133節驗證：20261024an check.ps1 ALL CHECKS PASSED；pirate／cave-assassin／log-drawer／weapon-range測試通過，47檔混淆466KB，四圖集與訊息圖示打包hash相同。隔離瀏覽器卷軸m06扣1、四動作四方向、PC／手機配置與訊息三分頁操作正常，Console無error／warn；待真實角色實玩確認後才commit。

## 134. PC骷髏外框殘片修復（2026-10-24，版本20261024ao）

使用者回報左右骷髏頭頂與臉旁有方塊破圖，為舊frame-pc-nopillar-mask未完全排除石柱／格紋背景。index.html的#frame.pc #frame-art在既有alpha遮罩之外增加百分比clip-path，沿左右骷髏／翅膀輪廓裁掉殘片；中央與下排完整保留，原始JPG／PNG遮罩不修改，手機不受影響。載入順序與存檔schema不變。版本更新使快取重新載入。隔離瀏覽器以真實index樣式檢查左右輪廓，Console無error／warn；check.ps1與打包通過，待實玩確認。

## 135. PC人物狀態按鈕圖片（2026-10-25，版本20261025a）

使用者提供騎士肖像卷軸圖片，原樣複製到images/ui/character-status-v1.png（不重繪、不裁切）。data/ui-frame.js的PC_SLOTS人物狀態改用img.slot-art，沿用原x347／y933／66×66點擊區及slotClick；移除該鈕round避免方形圖片被圓角影響，index.html以object-fit:contain完整顯示，手機抽屜不變。sw.js預載新圖，載入順序、存檔不變。

第135節追加（20261025b）：使用者提供無右下C鍵新版騎士卷軸，原樣保存images/ui/character-status-v2.png，PC_SLOTS與SW預載改為v2；v1保留。位置／完整等比縮放／人物狀態點擊不變。
20261025b驗證：check.ps1 ALL CHECKS PASSED、47檔混淆建置通過，隔離瀏覽器新版圖示正常、Console無error／warn。

第135節追加（20261025c）：使用者要求圖片放入原圓框內。人物鈕恢復round，slot-art置中縮為按鈕72%寬高（原圖座標47.52px），border-radius:50%以CSS圓形裁切，object-fit:cover；原始PNG不修改，外圈石框露出，66×66點擊範圍不變。
20261025c驗證：check.ps1 ALL CHECKS PASSED、47檔混淆打包通過；隔離瀏覽器圓框與人物圖片顯示正常，Console無error／warn。

第135節追加（20261025d）：依使用者要求讓肖像與圓框融合。slot-art改裝飾span，圓面直徑78%，背景圖放大170%、定位50%／48%，只呈現中央騎士肖像與羊皮紙，隱去原圖方形邊框，內陰影銜接原石框。純CSS呈現，原圖保留，人物狀態操作不變。
20261025d驗證：check.ps1 ALL CHECKS PASSED、47檔混淆建置通過；隔離瀏覽器確認肖像圓面與石框銜接、無方形邊框，Console無error／warn。

第135節修正（20261025e）：使用者回報肖像偏位、後方底圖持續露出。PC_SLOTS人物鈕校正到x355／y939（66×66），圓面由78%增至90%，背景定位50%／50%並加不透明羊皮紙底色，對齊實際外框內圓及覆蓋舊底圖；其他按鈕與原圖不變。check.ps1通過，隔離瀏覽器確認。
20261025e驗證：47檔混淆建置與git diff --check通過；隔離瀏覽器人物按鈕實點正常，Console無error／warn。

第135節垂直對齊修正（20261025f）：使用者近照顯示圓面仍偏下約8原圖像素，x355不變、y939改931，中心改為388／964，維持66×66及90%圓面。check.ps1 ALL CHECKS PASSED、47檔混淆建置通過；隔離瀏覽器外觀檢查、Console無error／warn。待使用者近照驗收。

## 136. 世界地圖點地名直接傳送（2026-10-25，版本20261025g）

使用者要求所有區域與村莊名稱可點擊傳送。world-atlas.js地標點擊改呼叫atlasTravel，側欄增加傳送前往並保留步行；下拉仍選資訊、不直接扣費。新增atlasTravelFee：區域沿ZONE.fee；村莊依目前村莊或野外回城村莊的tier差×200，同地點不收費不移動。點名稱先顯示gameConfirm費用，取消不扣款；確認重查同角色／所在地／異界狀態／存活／步行／金幣及zoneBlockReason，保留龍穴等級、前置討伐及真實時間冷卻。塔直達1F，毒霧巢穴直達洞內，NPC入口原操作仍可使用。傳送stopHunt、endMapRun（對話預警異界關閉）、扣款、更新所在地，清scene／sceneSpawnAt／session重建正確落點，關閉分頁並存檔，不自動開掛機。無存檔欄位／SQL更動。tools/test-atlas-travel.js驗證24地標含四村莊、共用地圖落點、費用、取消／缺款／死亡／位置變更／異界／龍穴限制重查。隔離預覽補載正式外部stylesheet。此節取代第86／131節世界地標僅步行限制。
第136節驗證：check.ps1 ALL CHECKS PASSED，test-atlas-travel／test-map-queue／test-map-portal通過，47檔混淆467KB，git diff --check通過。隔離瀏覽器實點村莊與區域傳送、核對扣費及所在地，完整世界地圖畫面與側欄正常，Console無error／warn。待真實角色實玩確認後才commit。

## 137. 地圖按鈕改異界裝置（2026-10-25，版本20261025h）

使用者要求原右側地圖按鈕只開異界地圖、不提供其他傳送。保留tab id map及renderMap，內容僅回傳mapDevicePanelHtml，移除村莊／狩獵區傳送清單；TABS、PC_SLOTS、手機右抽屜統一名異界裝置。沿用異界卷軸清單、詳情／開啟、進度／放棄、回卷傳送門及排程入口，既有村莊開圖限制不改。村莊傳送師及狩獵頁前往按鈕改openWorldAtlas，世界地圖點地名傳送保留。新images/ui/map-device-v1.png為內建image_gen原創紫藍旋渦裝置，slot-device-art按鈕內等比82%，SW預載；原稿與完整提示詞在tools/icon-src/ui/map-device-v1。無新script順序、全域資料、schema或SQL。
第137節驗證：check.ps1 ALL CHECKS PASSED，atlas-travel／map-queue／map-portal回歸通過，47檔混淆打包通過；隔離瀏覽器野外開啟disabled、村莊僅異界選項、T1實點開啟後300／300正常，Console無error／warn。

## 138. 鑽石拍賣場（2026-10-25，版本20261025j；初稿i）

- 使用者同意新增tools/auction.sql，由使用者貼至Supabase執行。交易所增加「拍賣」，原金幣寄賣不變；auction.js放在market／vault之後、presence之前，只在執行期引用錢包與角色。不改player或SAVE_SCHEMA。
- 每輪3小時拍賣、2小時休息，最多10件；首次安裝後休息2小時才開第一輪。伺服器first_open為固定5小時週期錨點，所有截止依clock_timestamp，不依本機／遊戲加速時間。每輪首次RPC在全域交易鎖內建round，僅抽開場前已排隊者，random隨機排序前10件；未入選保留物品與號碼牌、不重收費。無人瀏覽時不建空過期輪次，下次依錨點處理當輪，無需排程外掛。前景競標／我的拍賣每30秒更新，刊登輸入時不自動重畫。
- 每個帳號（非角色）最多一件queued／active。登記一樣×1，底價自訂5～100萬鑽，先收1鑽不退、物品由伺服器雲端背包移出託管、隨機唯一ticket號碼牌；相同輪次已入選後再登記只能等下一輪。已出價不能取消；排隊或無出價可取消取回。流標結束取回。最多10件在開場固定，不中途補位。
- 第一標為底價，之後每次固定+1鑽，最高100萬。出價由帳號diamond錢包保留全額；被超標立即退回（本人續標只扣差額），不能買自己帳號物品。成交費：成交價等於起標價只收1鑽；高於底價收max(1,ceil(price×5%))。刊登費獨立收取。買方到我的拍賣領物品、賣方領淨收入；資料庫seller_claimed／buyer_claimed確保僅領一次。鑽石有dragon_dia_log紀錄。
- 門檻依使用者回覆：q=rare黃裝及legend傳說裝備；額外白名單bWeaponScroll／bArmorScroll、26種BOSS_ENCHANTS材料、curOracle／curAwaken。預留doll分類，但正式娃娃尚未開放，不虛構可交易娃娃；未來傭兵可由GM加入分類／ID白名單，仍須正式道具／伺服器catalog支援。普通藥水、一般強化卷、低階通貨不符。GM「管理門檻」可改裝備最低品質／物品等級與額外ID／分類；伺服器再驗dragon_is_admin，已排隊物品不追溯下架。
- 新資料表dragon_auction_config／rounds、dragon_auctions、dragon_auction_bids，RLS開啟、直接存取與內部函式execute撤權。公開auction_browse／list／bid／cancel／claim／configure皆SECURITY DEFINER固定空search_path。變更物品沿dragon_market_row與dragon_vault_commit更新簽章／vaultSeq；本機vaultOp只依回傳增減。檢查村莊、存檔身分／停權／交易所hold、金幣不涉入；角色切換／舊存檔不能複製道具。所有拍賣RPC統一鎖順序，全域pg_advisory_xact_lock串行低流量十件場，截止／出價／退款／領取在同一交易。
- 新全域AUCTION_MIN／LIST_FEE／HOURS，auctionView／Rows／Uid／Busy／Error／Loading／Status／Registered／QueueCount／ClockOffset；auctionFee／ErrText／Load／SetView／Refresh／Pick／RowsHtml／SellHtml／Eligible／Html／Op／List／BidDialog／Cancel／Claim／ConfigDialog。
- tools/test-auction-db.js隔離載入原SQL與新SQL重跑；驗證3h／2h／10件、下一輪保留票、帳號單件、黃裝與白名單、刊登／取消數量守恆、同價搶標／退款／差額、底價基本費與5%進位、一次領取／存檔簽章序號／直接表與內部RPC拒絕／GM權限。tools/auction-preview-server.js在127.0.0.1:8791開記憶體PGlite資料庫，tools/auction-preview.html?db=1以實際SQL串接真實UI，禁止連正式帳號與網路；測試結束按鈕僅隔離頁存在。
第138節驗證：test-auction-db／test-auction-client與原test-market-v2通過；隔離PGlite完整UI驗證100→95出價／結標領物、95→94登記／號碼牌排隊，PC與手機可操作，Console無error／warn。共享目錄外部續版20261025k（共鳴裝備保留）保留，拍賣j一併納入k。正式SQL尚未安裝，由使用者執行（既有market-v2／vault-v2與最新loot-catalog為前提），首次休息2小時再開場。
