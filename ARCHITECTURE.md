# 專案架構說明（凡塵修仙傳-紅塵篇）

> **維護規則：本檔案需與程式碼同步更新。**
> 每次新增/刪除/搬移 `data/` 內的檔案、新增全域函式或資料、或調整 `<script>` 載入順序時，
> 都必須回來更新本檔案對應的段落（檔案清單、依賴關係表、函式對照表）。
> 這是本專案唯一的架構文件，過期的文件比沒有文件更危險。

## 1. 專案結構

```
gm.html               戰力榜 GM 後台（第 50 節）：只有 Firestore admins 名單內的 Google 帳號能刪除／封鎖／審核守城榜；不是遊戲頁面，遊戲內沒有連結
                      （載入 data/config-realms、config-leaderboard、config-bounty、bounty、config-defense.js）
index.html            唯一的遊戲 HTML 進入點：畫面結構、CSS（含手機 RWD，見第 6 節）、
                      彈窗(modal) DOM、<script src> 載入清單
                      ※ 檔名必須是 index.html（GitHub Pages 只把 index.html 當作預設首頁）
images/               圖片素材
  home-bg.jpg         洞府主畫面背景・手機版（704×1520，頭像框／資源框／側邊按鈕／底部導覽已畫在圖上，見第 31 節）
  home-bg-pc.jpg      洞府主畫面背景・PC 版（1376×768，玩家提供；上方五顆導覽鈕已用程式修圖移除；傳送門牌匾抹除、右下改字為情緣／世界，見第 34 節）
  avatar-male.jpg     男修頭像（韓立，597×335 橫式）
  avatar-female.jpg   女修頭像（南宮婉，599×333 橫式）
                      ※ 頭像原本放在外部圖床 postimg.cc，已改為本地檔案；橫式圖裁成圓形時依 PLAYER_AVATARS.pos 對準臉部
  evil-hall.jpg       殺手殿堂場景背景（937×625，玩家提供；獵殺邪修入口，見第 27 節）
  secret/             秘境海報（config-secret-realms.js 的 img，第 43 節）：zhenmo-tower.jpg 鎮魔塔（768×1365，9:16，玩家提供的水墨海報，圖上已有標題與標語）、
                      motu-tiannan.jpg 魔屠天南手機版（852×1846）／motu-tiannan-pc.jpg PC 版（1024×1536），玩家提供的 webp 以瀏覽器轉 JPG（圖上無字，標題由程式疊上，第 49 節）
  avatars/            可解鎖更換的頭像（256×256 正方形、臉部置中，由玩家提供的原圖裁切縮小），見第 32 節
  towns/              城內場景圖（玩家提供，第 20 節）：tianxing-market.jpg 天星城坊市橫圖（1582×672）、
                      tianxing-market-portrait.jpg 手機直式（704×1520，9:19.4）、
                      npc-fengxi.png 亂星海第一大善人・風希人偶（252×400 透明 PNG，由玩家提供的插畫手動描邊去背）
  maps/               修仙地圖卡片縮圖（config-maps.js 的 thumb）：tianxing-city.jpg 天星城（720×381，玩家提供，第 20 節）、
                      tiannan-city-male.jpg／tiannan-city-female.jpg 天南城（720×405，玩家提供，依玩家性別顯示，第 20 節）
  frames/             頭像光環 frame-01～25.png（透明 PNG，約 125～160px，由玩家提供的頭像框展示圖裁切去背），見第 32 節
  cover.jpg           主頁封面・橫式（1264x843），電腦與橫向螢幕使用
  cover-portrait.jpg  主頁封面・直式（960x1920），手機直向使用（由橫式圖重新構圖而成）
videos/               影片：fengxi-dance.mp4 風希跳舞彩蛋（玩家提供；2026-09-27 壓成 854×480、18 秒、約 0.52 Mbps＋AAC 64k 單聲道、1.35 MB，第 39 節）
  defense/            死守天南城背景影片（第 49 節）：battle.mp4 城牆雷戰（10.97 秒、2.75 MB）、flame.mp4 佛焰金身（8.8 秒、2.38 MB）、sword.mp4 巨劍劍氣（8.73 秒、2.34 MB），
                      皆 720×1280、H.264、無聲、頭尾淡入淡出（trim 0.6）；原始檔 v1c771…mp4／Pippit_0926_BuddhaFlame.mp4／Pippit_0926_GiantSwordAura.mp4（1080×1920、10～18 MB）仍在 videos/
tools/                不會被遊戲載入的維護工具
  裝備清單-850種.csv   850 種裝備的來源資料（Excel 可開啟；UTF-8 BOM），改完執行下一行的腳本
  csv-to-js.ps1       把 CSV 轉成 data/config-gear-catalog.js（powershell -ExecutionPolicy Bypass -File tools\csv-to-js.ps1）
  cut-figure.ps1      以手描外框去背（-Src 圖 -OutPng 輸出 -Preview 預覽 -PointsFile 外框點檔；點檔每行 "x,y"，空白行分隔，第一組外框、其餘為挖掉的洞）
  cut-figure-points-fengxi.txt  風希人偶的外框點（原圖 768×1376，玩家提供的插畫）
  firestore.rules     天下戰力榜＋守城榜（defenseSubmit／defenseBoard）＋GM 後台的 Firestore 安全規則（貼到 Firebase 主控台，第 42、49、50 節）
  cut-avatar-frames.ps1  從頭像框展示圖裁出 25 個光環並去背、量內圈（-Src 圖檔 -OutDir 輸出資料夾；格線座標寫死在檔內，見第 32 節）
data/                 所有遊戲邏輯與資料，依「設定資料 / 執行狀態 / 功能模組 / 進入點」分層
  format.js           數字顯示格式 fmtNum()／xxx.toWan()：1 萬以上用中文單位（1000萬、1.5億），**第一個載入**（第 41 節）
  config-*.js         純資料表（原則上不含函式、無副作用），可視為遊戲的「設計數值表」：
                      realms / level / lifespan / maps / sects / lingbao / shop / beasts /
                      servants / equipment / tribulation / quests / activities / daily-quests / elements / merit / bounty / talisman / avatars / home-pc / spells /
                      gear-catalog / gear / enhance / sets / profession / titles（裝備系統，第 37 節）/ strange-fire（天下異火 50 種，第 38 節）/ partners（情緣夥伴，第 39 節）/ towns（城內場景，第 20 節）/ leaderboard（天下戰力榜 Firebase 設定，第 42 節）/ secret-realms（秘境列表，第 43 節）/ defense（死守天南城 100 波，第 49 節）/ zhenmo、zhenmo-questions（鎮魔塔設定與 300 題題庫，第 51 節）
                      （config-gear-catalog.js 由 tools/csv-to-js.ps1 自動產生，請改 CSV）
                      （config-realms.js 另含修煉節奏表 realmPacing，經驗門檻與壽元流逝都由它換算，見第 26 節）
                      （config-sects.js 例外：尾端有一段迴圈補上技能倍率，並提供 findSectByName()）
                      （config-defense.js 例外：尾端有守城強度曲線 defenseRealmAtk()／defenseWaveAtk()，gm.html 也要用，第 49、50 節）
  state.js            執行期間的可變全域狀態（player、enemies、靈寵輔助效果計時…）
  stats.js            屬性/戰力/等級經驗門檻計算的純函式，以及 getAllSkills()
  elements.js         戰鬥屬性引擎：減傷、閃避、屬性傷害（冰凍/燒傷/中毒/金重擊/雷擊）、五行相剋與持續傷害
  ui.js               畫面渲染共用函式（頂部狀態列、戰鬥實況、日誌與日誌分頁（第 44 節）、彈窗開關與右上角 ✕（第 46 節））
  map.js / combat.js / leveling.js / tribulation.js
                      地圖切換、戰鬥 tick、境界與人物等級成長、渡劫
  lifespan.js         壽元：突破增加、死亡扣除、耗盡時遊戲結束
  beast-combat.js     靈寵的經驗/升級、陣亡、戰鬥中協助出手
  spells.js           仙法（200 種不分流派武學）：組出清單、被動光環加成、技能格、武學密典彈窗（第 35 節）
  artifact.js         神器專屬技能：戰鬥中觸發、卡片顯示、舊神器補 lingbaoId（第 18 節）
  sect.js / shop.js / bag.js / equipment.js / lingbao-shop.js /
  servant.js / quest.js / field.js / beast.js / library.js / alchemy.js
                      每個彈出視窗(modal) 對應一支檔案，管理該功能的渲染與互動
                      （library.js 另含第二階段屬性秘典，並提供戰鬥用的 getElementBookBonus()）
  activity.js         活動選單：統一把關各活動的解鎖條件（聲望＋境界）
  daily-quest.js      每日任務（每 4 小時刷新 10 項）
  auction.js          千寶閣拍賣場（每 3 小時刷新 5 件商品，含壽元丹；紫／橙商品可能遇到搶拍）＋常駐珍貴物資區
  merit.js            功德、陣營（正／邪）、善惡值、野外修士、功德自動凝結七彩補天石、購買破障丹（第 27 節）
  bounty.js           懸賞榜（天／地／人榜）與一對一懸賞對決（第 36 節）
  talisman.js         符寶坊：礦石煉製符寶、橙裝孔位鑲嵌／打掉（第 28 節）
  gear.js             裝備圖鑑 850 種：產生裝備、隨機詞條、特效、套裝、加成彙總、奪寶掉落、舊裝備轉換（第 37 節）
  enhance.js          強化／進化（白金）／分解／星允鐵與碎鐵／暫存區／千寶閣星允鐵（第 37 節）
  profession.js       職業（劍修等 6 種）：主修、熟練度 10 階、被動、職業技能（第 37 節）
  town.js             城內場景（第二頁面）：全螢幕城內畫面、傳送點、滑動／拖曳瀏覽、座標工具（第 20 節）
  strange-fire.js     異火碎片與天下異火：取得、隨機合成、收錄加成、秘境減傷、背包卡片、天磯錄「異火」分頁（第 38 節）
  partner.js          情緣・夥伴：結識、出戰、被動加成、戰鬥絕學、情緣視窗（第 39 節）
  codex.js            天磯錄：收藏紀錄、60 個稱號、器錄／套裝／異火／稱號／職業視窗（第 37 節）
  casino.js           天星賭坊：賭星隕石、擲骰比大小、每日上限、紀錄（第 40 節）
  player-profile.js   玩家道號修改
  save.js             本地存檔/讀檔/匯出入/離線掛機結算＋背景補發（第 33 節）/重置/舊存檔相容
  avatar.js           頭像更換：解鎖判定、選擇視窗（設定在 config-avatars.js，第 32 節）
  leaderboard.js      天下戰力榜：定時上傳戰力到 Firebase Firestore、榜單視窗（第 42 節）；死守天南城通關榜的送審與分頁（第 49 節）
  secret-realm.js     秘境入口：秘境列表、全螢幕秘境場景（海報）、挑戰說明視窗（第 43 節；鎮魔塔玩法尚未實作）
  defense.js          魔屠天南・死守天南城：影片預載＋預計秒數、三支影片輪流、100 波特效演出、通關紀錄（第 49 節）
  zhenmo.js           秘境「鎮魔塔」100 層：塔廳、10 題知識問答（限時、選項打亂）、結算倍率、BOSS 房入口（第 51 節；BOSS 待新增）
  home-ui.js          洞府主畫面：舞台縮放（手機／PC 版面）、HUD 數值、底部導覽分頁、建築熱點、興建中提示（第 31 節）
  settings.js         設定視窗（洞府右上 ⚙️）：顯示尺寸 手機 9:16／PC 16:9／自動、全螢幕（第 34 節）、字級 小／中／大（第 45 節）
  title-screen.js     遊戲主頁（標題畫面）與進入世界
  main.js             initGame()/startGame() 與 window.onload，遊戲啟動進入點
```

這是一個**純前端、無建置工具**的專案：所有 `data/*.js` 都是傳統 `<script>`（非 `type="module"`），
彼此共享同一個全域作用域。`index.html` 內的 `onclick="xxx()"` 會直接呼叫這些全域函式，
因此**檔案拆分時一律保留原本的函式名稱**，不可改名，否則畫面按鈕會失效。

## 2. 載入順序與依賴關係

`index.html` 底部依序載入以下腳本（每個都帶 `?v=版本號`，發佈前要更新，見第 30 節）。多數功能檔案彼此呼叫時**不受載入順序影響**
（函式宣告會先被瀏覽器解析完成，實際呼叫要等到 `window.onload` 之後才發生）。
但以下兩個檔案在載入當下就會**立即執行頂層程式碼**，因此順序不可調換：

- `format.js` 必須是**第一個**：它定義 `fmtNum` 與 `Number.prototype.toWan`，而 config 檔載入時就會呼叫 `.toWan()`（例：`config-merit.js` 的說明文字）。
- `config-maps.js` 必須在 `state.js` 之前載入：`state.js` 的 `player.currentMap` 直接讀取 `maps[0].items[0]`。
- `main.js` 必須放在最後：它的 `window.onload` 內會呼叫幾乎所有模組的函式，需確保全部腳本都已解析完成。
- `config-sects.js` 尾端也有頂層迴圈（替技能補 `tier`/`mult`），但只讀取同檔的常數，放在哪都安全。
- `spells.js` 載入時會立即組出 `spellList`，讀取 `config-spells.js` 的常數，所以必須排在 `config-spells.js` 之後。
- `gear.js` 載入時會立即展開 `gearList`／`gearById`／`gearBySlot`，讀取 `config-gear-catalog.js` 與 `config-equipment.js`（`equipTypes`），所以必須排在兩者之後。
  其餘新檔（`config-gear/enhance/sets/profession/titles.js`、`enhance.js`、`profession.js`、`codex.js`）只宣告常數與函式，排在 `gear.js` 附近即可。
- `strange-fire.js`、`partner.js` 載入時會建 `strangeFireById`／`partnerById`，必須分別排在 `config-strange-fire.js`、`config-partners.js` 之後。
- `defense.js` 載入時就建立 `DefenseBattle`（讀 `DEFENSE_*` 常數），必須排在 `config-defense.js` 之後；它在 DOMContentLoaded 抓 `#defense-vwrap` 的影片元素。

| # | 檔案 | 責任 | 依賴（讀取哪些全域） | 被誰依賴 / 誰會呼叫它 |
|---|------|------|----------------------|------------------------|
| 0 | `format.js` | `fmtNum(n)`（1 萬以下千分位；以上 萬／億／兆，小數依大小 2／1／0 位、尾端 0 省略、不加逗號）、`Number.prototype.toWan`／`String.prototype.toWan`（不可列舉） | 無 | 幾乎所有檔案顯示數字時的 `.toWan()` |
| 1 | `config-realms.js` | `realms` 境界名稱陣列、修煉節奏表 `realmPacing`（每境界目標時數/主要地圖/估算加成）、`REALM_PACING_KILLS_PER_SEC` | 無（`realmPacing.map` 是地圖名稱字串，執行期才查 `maps`） | `stats.js`(getRealmStageExp/getNextExp)、`lifespan.js`(getAgingHours)、`ui.js`、`leveling.js` |
| 2 | `config-level.js` | `MAX_PLAYER_LEVEL`、`LEVEL_UP_*` 成長值、`LEVEL_EXP_SEGMENTS` 經驗曲線 | 無 | `stats.js`(getLevelExpNeeded、getMaxHp/getMaxMp)、`leveling.js`(gainLevelExp)、`ui.js` |
| 3 | `config-lifespan.js` | `lifespanByRealm` 各境界壽元增加量與死亡折壽、歲月流逝常數 `LIFESPAN_MIN_AGING_HOURS`/`LIFESPAN_PACE_MULT`/`LIFESPAN_DANGER_MULT`/`LIFESPAN_TRIBULATION_MULT`/`LIFESPAN_OFFLINE_RATE`/`LIFESPAN_FLOOR_DEATHS`、起始年齡 `LIFESPAN_START_AGE` | 無 | `lifespan.js`、`leveling.js`(轉世重設壽元與年齡)、`ui.js`(年齡顯示) |
| 4 | `config-maps.js` | `SECT_MAP_NAME`（"宗門"，唯一安全區的名稱）、`maps` 地圖資料（含各圖 `coins` 每隻靈石）、`KILLS_PER_HOUR_ESTIMATE`、`REPUTATION_MAX_BY_MAP_CATEGORY`（各區擊殺聲望上限）、`OFFLINE_COMBAT_RATE`/`OFFLINE_REPUTATION_RATE`、離線實力估算 `IDLE_WAVE_AVG_MONSTERS`/`IDLE_WAVE_GAP_TICKS`/線上實戰證明門檻 `IDLE_PROVEN_SECONDS`、怪物刷新 `MONSTER_RESPAWN_SECONDS`(10)／收益補償 `KILL_REWARD_MULT`／打坐日誌間隔 `MEDITATE_LOG_SECONDS`（第 33 節末）、`monsterIcons` | 無 | `state.js`、`map.js`(isInSect)、`combat.js`、`ui.js`、`save.js`(migrateCurrentMap) |
| 5 | `config-sects.js` | `sectData` 宗門與技能表（宗門可選填 `faction: "邪"`，目前為皇朝、天魔教、九幽黃泉；沒寫 = 正）、`SECT_SKILL_BONUS`、`SECT_TIER_NAMES`、`findSectByName()`；尾端迴圈替每招補上 `tier`/`mult` | 無 | `sect.js`、`stats.js`(getSectTier/getAllSkills)、`ui.js`、`save.js`(重新綁定宗門)、`merit.js`(getPlayerFaction) |
| 6 | `config-lingbao.js` | `legacySkillAdjustments` 舊版禁術下修數值、`artifactSkills` 神器專屬技能（key = 商品 id）、`lingbaoTierCosts` 各階段兌換價格、`ARTIFACT_COST_COINS` 神器靈石價（1 億）、`lingbaoShopItems` 三階段戰略級寶物與武學 | 無 | `lingbao-shop.js`、`equipment.js`(五行說明列固定屬性裝備)、`artifact.js` |
| 7 | `config-shop.js` | `shopItems` 丹藥堂商品、`shopSections` 分區、`POTION_COOLDOWN_SECONDS` 丹藥冷卻、`SHOP_MAX_BUY_QTY` 單次購買上限(9999) | 無 | `shop.js`、`bag.js`、`combat.js`(自動補血補魔) |
| 8 | `config-beasts.js` | `beastData` 靈寵兌換與被動、`BEAST_REVIVE_COST_CORE`、維持費 `BEAST_UPKEEP_INTERVAL`/`beastUpkeepTiers`（第 16 節）、`BEAST_SKILL_LEVELS`、`BEAST_SKILL_CHANCE`、`beastElementInfo`、`beastSkillTree` | 無 | `beast.js`、`beast-combat.js`、`save.js`(舊存檔轉換) |
| 9 | `config-servants.js` | `MAX_SERVANTS`、`servantQualities`、`SERVANT_TRIP_COST`(每趟任務靈石花費)、`servantNames` | 無 | `combat.js`(tryRescueServant)、`servant.js`(派遣花費) |
| 10 | `config-equipment.js` | `MAX_EQUIP_INVENTORY`、`equipTypes`（含 artifact 神器欄）、`NON_FORGEABLE_SLOTS`、裝備等級 `EQUIP_LEVELS`/`EQUIP_LEVEL_STAT_MULT`/`FORGE_LEVEL_CAP_BY_TIER`、`FORGE_COST`(10,000)、`wuxingElements`、靈根表 `wuxingArrayEffects`(單屬性)/`pureRootEffects`(純化)/`dualRootEffects`(雙屬性)/`supremeRootEffect`(五行聖)、門檻常數 `ROOT_SINGLE_COUNT`/`ROOT_SUPREME_SETS`/`ROOT_PURE_SETS`/`ROOT_PURE_REST`/`ROOT_DUAL_SETS`/`ROOT_DUAL_REST`、`equipQualities`(含各品質的減傷/閃避/屬性傷害值) | 無 | `equipment.js`(鍛造、靈根說明視窗)、`stats.js`(getSpiritRoots/getRootBonus/getPlayerElement)、`save.js`(補齊欄位)、`beast.js`(五行選項) |
| 11 | `config-tribulation.js` | 渡劫門檻、勝算常數 `TRIBULATION_*`（含合體期起加劇 `TRIBULATION_HARD_REALM_INDEX`/`TRIBULATION_HARD_PENALTY_PER_REALM`/`TRIBULATION_HARD_PENALTY_MAX`）、心魔倍率與技能 | 無 | `leveling.js`、`tribulation.js`、`save.js` |
| 12 | `config-quests.js` | `questData` 門派任務（可選欄位：範圍獎勵 `[min,max]`、`requiredQuality`、`duration`；某等級可不填）、`questRewardInfo` 獎勵名稱與對應欄位（含礦石 `ore`）、`QUEST_*` 進度常數、`MAX_ASSIGNED_SERVANTS` | 無 | `quest.js`、`servant.js`、`combat.js` |
| 13 | `config-activities.js` | `activityData` 活動清單與解鎖條件 | 無 | `activity.js` |
| 14 | `config-daily-quests.js` | 每日任務 `DAILY_REFRESH_HOURS`/`DAILY_QUEST_COUNT`/`dailyQuestPool`/`dailyQuestRewards`、千寶閣 `AUCTION_*`（含搶拍 `AUCTION_RIVAL_CHANCE`/`AUCTION_RIVAL_MAX_MULT_MIN`/`AUCTION_RIVAL_MAX_MULT_MAX`/`AUCTION_BID_STEPS`；付費刷新 `AUCTION_PAID_REFRESH_COST`/`AUCTION_PAID_REFRESH_DAILY`；裝備等級 `AUCTION_GEAR_PREV_TIER_CHANCE`；低等白金 `AUCTION_PLATINUM_CHANCE`/`AUCTION_PLATINUM_TIERS_BELOW`/`AUCTION_PLATINUM_PRICE`，第 10 節）、`auctionRivalNames`、`auctionQualityOdds`、`auctionLifePills`(壽元丹) | 無 | `daily-quest.js`、`auction.js` |
| 15 | `config-elements.js` | 戰鬥屬性上限 `DEF_CAP`/`EVA_CAP`/`AFFIX_CAP`、效果常數（凍結/燒傷/中毒/金重擊/雷擊 `THUNDER_BONUS`）、`combatAttrInfo`、`AFFIX_TYPES`(玩家武器)/`MONSTER_AFFIX_TYPES`(怪物異屬性：冰/毒/雷)、五行相剋 `WUXING_COUNTERS`/`WUXING_COUNTER_BONUS`/`WUXING_COUNTERED_PENALTY`、`monsterAttrsByMapCategory` | 無 | `elements.js`、`stats.js`(getPlayerElement)、`ui.js`、`equipment.js`(鍛造屬性、五行說明視窗) |
| 15a | `config-merit.js` | 陣營 `FACTION_SECT_WEIGHT`、善惡 `KARMA_MAX`/`KARMA_GOOD_THRESHOLD`/`KARMA_EVIL_THRESHOLD`/`KARMA_PER_FIELD_KILL`/`KARMA_PER_AMBUSH_KILL`、野外修士 `FIELD_CULTIVATOR_WAVE_CHANCE`/`FIELD_CULTIVATOR_POWER_MULT`/`FIELD_MERIT_MIN`/`FIELD_MERIT_MAX`/`CULTIVATOR_ICONS`、暗殺者 `AMBUSH_WAVE_CHANCE`/`AMBUSH_POWER_MULT`/`AMBUSH_ICON`、自動凝結 `MERIT_PER_BUTIAN_STONE`(30,000)、`BREAK_PILL_STONE_COST`、破障丹效果 `BREAK_PILL_DEMON_POWER_MULT`/`BREAK_PILL_CHANCE_BONUS`/`BREAK_PILL_MAX_CHANCE`、`preciousItems`(顯示資料) | 無 | `merit.js`、`combat.js`(野外修士／暗殺者生成)、`save.js`(離線功德)、`tribulation.js`(破障丹)、`bag.js`、`ui.js` |
| 15f | `config-bounty.js` | 懸賞榜：`BOUNTY_REFRESH_HOURS`/付費刷新 `BOUNTY_PAID_REFRESH_COST`/`BOUNTY_PAID_REFRESH_DAILY`/`BOUNTY_ENCOUNTER_CHANCE`/`BOUNTY_MERIT_MIN`/`BOUNTY_MERIT_MAX`/`BOUNTY_REALM_OFFSET_MIN`/`BOUNTY_REALM_OFFSET_MAX`/`BOUNTY_MAX_TURNS`、參考戰力 `BOUNTY_REF_SECT_MULT`/`BOUNTY_TIAN_MULT`、`BOUNTY_RANKS`(天／地／人榜)/`BOUNTY_RANK_ORDER`、武學 `bountySkills`/`BOUNTY_SKILL_SETS`、名冊 `bountyRoster`(邪 30／正 30)/`BOUNTY_ICONS` | 無 | `bounty.js` |
| 15e | `config-spells.js` | 仙法資料：`SPELL_EVIL_POWER`/`SPELL_SLOT_LEVEL_STEP`/`SPELL_GRADES`/`SPELL_ROLES`/`SPELL_GRADE_STATS`(各品階數值)/`SPELL_AURA_LABELS`/`spellAttributes`(10 屬性、每品 6 招名稱)/`spellUltimates`(20 絕學) | 無 | `spells.js` |
| 15d | `config-home-pc.js` | PC 版洞府：`PC_STAGE_IMG_W`/`PC_STAGE_IMG_H`(1376×768)、分頁面板位置 `PC_SHEET_RECT`、按鈕與建築熱點表 `pcStageButtons`（圖上座標、功能 action、牌匾、nav、enabled） | 無（action 是字串，點擊時才呼叫各模組函式） | `home-ui.js`(renderPcStage/layoutStage) |
| 15c | `config-avatars.js` | `avatarList`（頭像 id／名稱／圖片／裁切位置／解鎖條件） | 無 | `avatar.js` |
| 15c2 | `config-avatar-frames.js` | `avatarFrameList`（25 個頭像光環：id／名稱／圖片／內圈 `ring`／解鎖條件）、`AVATAR_FRAME_HOLE_FIT` | 無 | `avatar.js`、`home-ui.js`、`ui.js` |
| 15b | `config-talisman.js` | 孔位 `SOCKET_QUALITY`/`SOCKET_MIN`/`SOCKET_MAX`、`talismanTypes`(11 種)、`talismanGrades`(下/中/上品的效果與出現機率)、`TALISMAN_CRAFT_COST`(每次 500 礦石＋100 萬靈石) | 無 | `talisman.js` |
| 15g | `config-gear-catalog.js` | `gearCatalog`：17 部位 × 50 列 `[名稱, 五行, 管道, 四維模板, 特效, 套裝]`（**由 tools/csv-to-js.ps1 產生，改 CSV**） | 無 | `gear.js`(載入時展開) |
| 15h | `config-gear.js` | 管道 `GEAR_CHANNELS`、`GEAR_EXTERNAL_MULT`、四維模板 `GEAR_TEMPLATES`/`GEAR_ACCESSORY_BUDGET`、主詞條 `GEAR_ELEMENT_AFFIX`/`GEAR_ARMOR_DEF_MULT`、奪寶 `LOOT_DROP`、白金 `PLATINUM_QUALITY`、特效 `GEAR_EFFECT_TIER_MULT`/`gearEffects`(value/cap/fmt/desc) | 無 | `gear.js`、`enhance.js`、`artifact.js`(白金顯示) |
| 15i | `config-enhance.js` | 隨機詞條 `GEAR_SUB_COUNT`/`GEAR_SUB_QUALITY_SCALE`/`gearSubAffixes`、強化 `ENHANCE_*`、進化 `EVOLVE_*`、分解 `DECOMPOSE_*`/`SHARDS_PER_IRON`、暫存區 `GEAR_STASH_MAX`、星允鐵來源 `IRON_*` | 無 | `gear.js`、`enhance.js`、`combat.js`/`bounty.js`/`servant.js`(星允鐵) |
| 15j | `config-sets.js` | `GEAR_SET_MIN_QUALITY`、`gearSets`(30 組：主題＋五行)、`gearSetThemes`(2/4/6 件加成) | 無 | `gear.js`、`codex.js` |
| 15k | `config-profession.js` | `PROFESSION_SWITCH_COST`、`PROF_MAP_MULT`/`PROF_BOUNTY_GAIN`/`PROF_OFFLINE_RATE`、`PROF_RANK_EXP`/`PROF_WEAPON_BONUS`、`professions`(6 職業：階名、被動、技能) | 無 | `profession.js` |
| 15m | `config-strange-fire.js` | 異火（第 38 節）：`STRANGE_FIRE_SHARDS_PER_FIRE`(100 片合 1 朵)/`STRANGE_FIRE_REALM_REDUCE`(每朵秘境受傷 -3%)/`STRANGE_FIRE_REALM_REDUCE_MAX`(上限 30%)、品階 `STRANGE_FIRE_TIERS`(weight/color)、`strangeFireItems`(碎片與異火的顯示資料)、`strangeFireList`(50 種：id/name/tier/origin/desc/bonus；檔尾有新增模板) | 無 | `strange-fire.js` |
| 15o | `config-towns.js` | `townScenes`（key = 城鎮地圖名稱：title、img、imgW／imgH、選填 `portrait`（手機直式圖，自有 img／imgW／imgH／hotspots／figures）、`figures` 場景人偶 `{ id, name, img, rect, action? }`、`hotspots` 傳送點 `{ id, label, rect:[x,y,w,h] 圖上像素, action, enabled }`；檔內有模板） | 無 | `town.js`、`map.js`(hasTownScene) |
| 15n | `config-partners.js` | 夥伴（第 39 節）：`PARTNER_TIERS`(評級門檻與數值建議)、`PARTNER_POWER_LABELS`(六維名稱)、`partnerList`(39 位：出處、世界、巔峰、六維戰力、分析、被動、絕學；檔尾有新增模板) | 無 | `partner.js` |
| 15l | `config-titles.js` | `titleList`（60 個稱號：條件 cond、加成 bonus；含 4 個賭運稱號） | 無 | `codex.js`、`casino.js`(紀錄頁列出賭運稱號) |
| 15p | `config-casino.js` | 天星賭坊（第 40 節）：`CASINO_TOWN`、每日上限 `CASINO_DAILY_LIMIT_BY_REALM`、`CASINO_DICE_MAX_RATIO`/`CASINO_DICE_MIN_BET`/`CASINO_CONFIRM_RATIO`、`casinoStones`(三種隕石：價格、結果權重表)、`CASINO_VALUE`(估值)、`CASINO_CUT_LINES`、擲骰 `CASINO_DICE_BETS`/`CASINO_TOTAL_PAYOUT`/`CASINO_DICE_FACES` | 無 | `casino.js` |
| 15q | `config-leaderboard.js` | 天下戰力榜（第 42 節）：`LEADERBOARD_FIREBASE_CONFIG`（null = 不啟用、不連網）、`LEADERBOARD_SDK_BASE`、`LEADERBOARD_COLLECTION`、`LEADERBOARD_BANNED_COLLECTION`(banned)/`LEADERBOARD_ADMINS_COLLECTION`(admins，第 50 節)/守城榜 `LEADERBOARD_DEFENSE_SUBMIT_COLLECTION`(defenseSubmit，玩家送審)/`LEADERBOARD_DEFENSE_BOARD_COLLECTION`(defenseBoard，GM 審核通過才寫入)、`LEADERBOARD_UPLOAD_INTERVAL_MS`(5 分)/`LEADERBOARD_FIRST_UPLOAD_DELAY_MS`(15 秒)/`LEADERBOARD_MIN_GAP_MS`(60 秒，須與 tools/firestore.rules 一致)/`LEADERBOARD_HISTORY_SIZE`(24，上傳歷史 hist 筆數，須與規則一致，第 50 節)/兩日紀錄 `LEADERBOARD_HISTORY2_SIZE`(96)/`LEADERBOARD_HISTORY2_GAP_SEC`(1800，皆須與規則一致)/`LEADERBOARD_TOP_N`(100)/`LEADERBOARD_REFRESH_COOLDOWN_MS` | 無 | `leaderboard.js` |
| 15r | `config-secret-realms.js` | 秘境（第 43 節）：`SECRET_REALM_DAILY_ATTEMPTS`(預定每日 5 次)、`secretRealmList`（id／name／img／minRealmIndex／implemented／tagline／desc／rewards 預定獎勵；選填 size／imgPc／sizePc／sceneTitle／sceneSub／enterLabel／enterPos／mode） | 無 | `secret-realm.js` |
| 15s | `config-defense.js` | 死守天南城（第 49 節）：`DEFENSE_TOTAL_WAVES`(100)／`DEFENSE_BOSS_EVERY`(10)／`DEFENSE_CLIP_FADE`、`DEFENSE_CLIPS`（id／name／src／zoom／trim／sizeHint）、`DEFENSE_THEMES`(10 主題)、`DEFENSE_BOSSES`、`DEFENSE_OPENERS`、`DEFENSE_CAMERAS`、強度 `DEFENSE_MILESTONES`/`DEFENSE_MILESTONE_STAGE`/`DEFENSE_ENEMY`、勝負 `DEFENSE_PLAYER_SKILL_MULT`/`DEFENSE_MAX_ROUNDS`/`DEFENSE_LOSE_AT`、獎勵 `DEFENSE_REWARDS`、通關紀錄 `DEFENSE_RUN_LOG_MAX`(20)；**尾端有函式**（例外）：強度曲線 `defenseRealmAtk(r,s)`/`defenseWaveAtk(w)`（defense.js 與 gm.html 共用） | 呼叫時才用 `bounty.js` 的 getBountyRefSectMult | `defense.js`、`gm.html`(守城審核) |
| 15t | `config-zhenmo.js` | 鎮魔塔（第 51 節）：`ZHENMO_TOTAL_FLOORS`(100)/`ZHENMO_QUIZ_COUNT`(10)/`ZHENMO_QUIZ_SECONDS`(20)/`ZHENMO_REVEAL_ANSWER`(false)/`ZHENMO_RECENT_AVOID`(100)/`ZHENMO_QUIZ_REWARD_MULT`(答對數→BOSS 獎勵倍率)/`ZHENMO_BOSS_READY`(false)/`ZHENMO_SOURCES` | 無 | `zhenmo.js`、`secret-realm.js`(ZHENMO_BOSS_READY) |
| 15u | `config-zhenmo-questions.js` | `zhenmoQuestions`：300 題 `[出處, 題目, 選項(4 個／是非題 null), 答案 'A'～'D'／'O'／'X', 解析?]`（玩家提供；凡人 110／吞噬 100／斗羅 90；選擇 170／是非 130） | 無 | `zhenmo.js` |
| 16 | `state.js` | `player`（含裝備系統 `starIron`/`ironShards`/`gearStash`/`ironShop`/`ironUsed`/`maxEnhance`/`gearCodex`/`titles`/`activeTitle`/`profession`/`profSwitched`/`proficiency`（第 37 節）、`lingbaoSold`、仙法 `spells`/`spellSlots`、渡劫失敗虛弱 `weakened`、頭像 `avatarId`/`unlockedAvatars`、頭像光環 `avatarFrameId`/`unlockedFrames`、礦石 `ore`、符寶 `talismans`、異火 `fireShards`/`strangeFires`/`fireCollection`（第 38 節）、天星賭坊 `casino`（第 40 節）、夥伴 `partners`/`partnerTeam`/`partnerBond`/`fieldKills`（第 39 節）、藏書閣屬性秘典次數 `elementStudy`、轉世保留的上限 `reincarnateBonus`、年齡 `age`、功德系統 `merit`/`butianStones`/`breakPills`/`evilKills`、善惡 `karma`、懸賞榜 `bountyBoard`/`bountyRefreshAt`/`bountyFaction`/`activeBountyIds`(可多名，第 36 節)/`bountyKills`、付費刷新次數 `paidRefresh`、線上實戰證明 `idleProvenMap`（第 33 節））、`DEFAULT_PLAYER_JSON`（全新角色預設值快照，讀檔/匯入的合併基底）、`enemies`（每隻帶 `attrs`/`status`；野外修士另帶 `cultivator`("正"/"邪")/`ambush`）、`respawnTimer`、`safeZoneTimer`；不存檔的執行期狀態：`inTribulation`/`heartDemon`/`tribulationFatedWin`/懸賞對決 `inBountyDuel`/`duelOpponent`/`duelWeakenTimer`/`duelWeakenMult`/`duelSilenceTimer`/`duelArmorTimer`/丹藥冷卻/`gameOver`/背景補發 `lastTickAt`/`missedTickMs`/線上實戰秒數 `fieldOnlineTicks`/日誌彙總 `waveSummary`/`meditateSummary`/`playerStatus`(玩家身上的凍結/燒傷/中毒)/靈寵輔助計時(`petBuff*`/`petShield*`/`petRegen*`) | **`maps`**（必須排在 config-maps.js 之後） | 幾乎所有檔案都會讀寫 `player` |
| 17 | `stats.js` | `EQUIP_STAT_KEYS`/`BASE_STAT_KEYS`、`getEquipBonus`(四維＋減傷/閃避/屬性傷害；四維 × 強化倍率與主修武器加成，再加 gear.js `getBonusTotals` 的詞條／套裝／稱號／職業)/`getElementCounts`/`getSpiritRoots`(靈根判定)/`getRootBonus`(靈根加成總和)/`getPlayerElement`(本命五行，五行相剋用)/`getRealmStageExp`(依 realmPacing 換算每階經驗基數，有快取)/`getNextExp`/`getLevelExpNeeded`/`hasLiveBeast`(出戰中才算，呼叫 beast-combat.js 的 isBeastActive)/`getBasePower`/`getPhysAttack`/`getMagAttack`(兩者皆乘上懸賞對決的化功 `getDuelWeakenMult()` 與 `getGearPctBonus`)/`getMaxHp`(乘 `getGearPctBonus('hp')`)/`getMaxMp`(兩者皆加上轉世保留值)/`getReincarnateBonus`/`getSectTier`/`getAllSkills` | `player`、`realms`、`sectData`、`LEVEL_*`、`equipTypes`/`WUXING_COUNTERS`、靈寵輔助計時、`bounty.js`(getDuelWeakenMult) | `ui.js`、`combat.js`、`leveling.js`、`tribulation.js`、`beast-combat.js` 等幾乎全部功能檔 |
| 18 | `elements.js` | `newStatus`/`getPlayerCombatAttrs`(含 `element`；懸賞對決被破甲時減傷／閃避 × `getDuelArmorMult()`；裝備特效的護體／先手盾／定神／破甲／洞察／剋敵／寒徹／焚燼／蝕骨欄位與套裝提高的上限)/`getWuxingCounterMult`/`withSkillEffect`/`getMapCategoryIndex`/`rollMonsterAttrs`/`resolveHit`/`addDotStack`/`tickStatus`/`formatStatus`/`summarizeTags`/`formatEquipStats` | `config-elements.js`、`stats.js`(getEquipBonus/getPlayerElement)、`library.js`(getElementBookBonus)、`wuxingElements`、`maps`、`playerStatus` | `combat.js`、`tribulation.js`、`ui.js`、`bag.js`/`equipment.js`/`auction.js`/`lingbao-shop.js`(裝備屬性文字) |
| 19 | `ui.js` | 常數 `PLAYER_AVATARS`（頭像 `img`（本地 images/avatar-*.jpg）/裁切位置 `pos`/預設道號，洞府頭像框、戰鬥實況、性別選擇共用；性別選擇視窗的兩張 `<img>` 寫在 index.html，換圖時要一起改）、`updateUI`/`updateCombatVisualPanel`/`formatWuxingCounterTip`/`updateTribulationUI`/`updatePotionCooldownUI`/`updateStudyCountsUI`/`openSkillModal`/`renderSkillList`/`addLog(msg, type, force, channel)`(野外回合中依 `fieldLogMuted`／`FIELD_MUTED_LOG_TYPES` 略過逐回合訊息；依 `channel`／`LOG_CHANNEL_BY_TYPE` 寫入戰鬥／道具／僕從分頁，第 44 節)/`switchLogTab`/`restoreLogTab`/`renderLogBadge`/`initModalTopClose`(彈窗右上角 ✕，第 46 節)/`refreshCombatStatusText`/`updateAutoSettings`/`syncAutoSettingsUI`/`updateSectFacilitiesUI`/`closeModal`/`toggleDrawer`/`formatCountdown`/`clampRefreshAt`(刷新時間軸保護，第 10 節)/`resolveBatchCount`(×1/×10/最高 共用)/批次刪除工具 `renderBulkDeleteBar`/`getCheckedBulkQualities`/`toggleAllBulkQualities` | `player`、`realms`、`stats.js` 的計算函式、`lifespan.js`(getDeathLifespanCost) | 幾乎所有功能檔在資料變動後都會呼叫 `updateUI()`/`addLog()` |
| 20 | `map.js` | `isInSect`(是否身在宗門)/`returnToSect`(洞府「宗門」：傳送回宗門並開宗門分頁，第 20 節)/`openWorldMapModal`(修仙地圖彈窗，顯示目前所在)/`getMapThumb`(縮圖依性別選 `thumb`／`thumbFemale`)/`renderTownTeleports`(城鎮傳送點卡片)/`goToTown(i)`(傳送並進入城內場景)/`openMapCategoryModal`(略過 `hidden` 的宗門)/`selectMap`(選定後關閉兩層地圖彈窗)/`changeMap`(懸賞對決中換地圖 = `endBountyDuel("flee")` 逃離；暫存區滿時不能進野外，enhance.js) | `maps`、`SECT_MAP_NAME`、`player`、`ui.js`、`bounty.js` | `ui.js`(updateSectFacilitiesUI)、`combat.js`/`quest.js`(門派任務須在宗門)、HTML 按鈕；changeMap 離開宗門時呼叫 `quest.js` 的 stopQuest |
| 21 | `combat.js` | `combatTick`/`fieldCombatRound`(野外一回合，日誌靜音、波末彙總、收益 × KILL_REWARD_MULT，第 33 節末)/`playerAttackTurn`(普攻/技能出手，渡劫共用；技能類型 single/aoe/heal/buff＋仙法的 shield 守護／control 牽制，並處理魔功 hpCost 反噬與 lifesteal 吸血)/`onPlayerKilledInField`/`checkAutoHealAndMana`/`tryRescueServant`/`getMapMonsterStats(map)`(妖獸攻擊／氣血，地圖可自訂 monsterAtk／monsterHp，save.js 離線估算也用) | `player`、`enemies`、`shopItems`、`servantQualities`、`servantNames`、`stats.js`、`elements.js`(resolveHit/tickStatus)、`leveling.js`(gainExp)、`beast-combat.js`(petAssistTick/applyPetDamageReduction/tickBeastUpkeep 每秒維持費計時)、`lifespan.js`(handlePlayerDeath)、`map.js`(changeMap 死亡回城)、`merit.js`(isEvilHuntUnlocked/getKarmaState/onCultivatorKilled/settleMeritStones，野外修士與暗殺者)、`config-merit.js`、`bounty.js`(對決中由 bountyDuelTick 接管；刷新新一波前呼叫 tryStartBountyDuel)、裝備系統（gear.js 特效／套裝／奪寶、enhance.js 星允鐵與暫存區、profession.js 職業技能與熟練度，第 37 節） | `main.js`(setInterval 每秒呼叫)、`bounty.js`(對決落敗呼叫 onPlayerKilledInField、playerAttackTurn) |
| 22 | `leveling.js` | `REINCARNATE_KEEP_RATE`(轉世保留比例 5%)、`gainExp`/`gainLevelExp`/`advanceRealm`/`triggerReincarnate`（規則見第 25 節） | `realms`、`player`、`stats.js`、`ui.js`(updateSectFacilitiesUI)、`beast-combat.js`(gainBeastExp)、`lifespan.js`(gainRealmLifespan) | `combat.js`、`tribulation.js`、`save.js`、HTML 輪迴按鈕 |
| 23 | `lifespan.js` | `getDeathLifespanCost`/`formatLifespan`/`getLifespanFloor`/`getAgingHours`(依 realmPacing 算出一境界壽元可撐時數)/`getAgingMultiplier`/`getAgingPerMinute`/`ageLifespan`(同時增加年齡 `player.age`)/`checkLifespanWarnings`(提示旗標 `lifespanWarned`，不存檔)/`getInitialLifespanForRealm`/`gainRealmLifespan`/`handlePlayerDeath`/`triggerLifespanGameOver` | `lifespanByRealm`、`LIFESPAN_*`、`player`、`inTribulation`、`elements.js`(getMapCategoryIndex)、`beast-combat.js`(killAllBeasts) | `combat.js`(每秒 ageLifespan、死亡)、`tribulation.js`(死亡)、`leveling.js`(突破)、`save.js`(離線流逝、舊存檔)、`ui.js`、`auction.js` |
| 24 | `tribulation.js` | `getTribulationChance`/`getTribulationHardPenalty`(合體期起勝算扣除量)/`formatChance`/`triggerTribulation`/`tribulationTick`/`resolvePlayerFall`/`endTribulation` | `player`、`config-tribulation.js`、`config-merit.js`(破障丹)、`player.breakPills`、`shopItems`(丹藥加成)、`sectData`(技能加成)、`stats.js`、`elements.js`、`combat.js`(playerAttackTurn)、`beast-combat.js`、`lifespan.js`、`leveling.js`(advanceRealm) | `combat.js`(渡劫中接管 tick)、`ui.js`(按鈕顯示勝算)、HTML 渡劫按鈕 |
| 25 | `sect.js` | `checkSectJoined`/`openSectModal`/`renderSects`/`joinSect` | `sectData`、`player.sect`/`sectSkills` | 幾乎所有「需拜入宗門才能使用」的彈窗（shop/servant/field/beast/lingbao-shop/library/forge/alchemy）都會先呼叫 `checkSectJoined()` |
| 26 | `shop.js` | `openShopModal`/`renderShop`/`renderShopCard`/`getShopQty`/`setShopQty`/`setShopQtyMax`/`updateShopTotal`/`buyShopItem` | `shopItems`、`player`、`sect.js`(checkSectJoined) | HTML 按鈕、`bag.js` 顯示已購買道具 |
| 27 | `bag.js` | `openBagModal`/`hasEquipInventorySpace`(背包上限檢查，鍛造/千寶閣/靈寶閣/卸下裝備共用)/`renderBag`/`useItemFromBag`/`deleteItemFromBag`/`deleteEquipFromInventory`/`bulkDeleteEquipment`、裝備鎖定 `isEquipLocked`/`toggleEquipLock`/`formatLockButton`/`canRemoveEquip`（第 9 節）（卡片另有強化／分解按鈕、頂端暫存區與星允鐵，enhance.js） | `shopItems`、`player.bag`、`player.equipInventory`、`enhance.js`(locateEquip/refreshEquipViews) | `equipment.js`(equipItem 後呼叫 renderBag；裝備卡片鎖定鈕)、`enhance.js`(分解／暫存區毀棄前呼叫 canRemoveEquip、一鍵分解略過鎖定) |
| 28 | `equipment.js` | `EQUIP_CATEGORY_NAMES`(部位分類中文名)、`formatEquipLevel`/`getForgeLevelCap`/`renderForgeLevelSelect`(裝備等級，第 29 節)、`initForgeSelect`/`openEquipmentModal`/`renderLingbaoUI`(注意：命名沿用舊碼，實際是角色裝備列表)/`openWuxingInfo`/`equipItem`/`unequipItem`/`openForgeModal`/`forgeEquipment`/`forgeOneEquipment`(從該等級的可製作清單抽一種，gear.js)、常數 `FORGE_COST`（已移到 config-equipment.js）；舊的 `generateEquipStats` 已移除，改用 gear.js 的 `buildGearStats` | `equipTypes`、`wuxingElements`、`wuxingArrayEffects`、`equipQualities`、`lingbaoShopItems`(說明視窗列固定屬性裝備)、`player.equipment`、`player.equipInventory`、`ui.js`(resolveBatchCount) | `bag.js`(equipItem)、`sect.js`(forge 需拜入宗門) |
| 29a | `artifact.js` | `getArtifactItem`/`getArtifactSkill`/`getEquippedArtifactSkill`/`formatQualityLabel`(七彩 → 造化神器・七彩、白金 → 白金・先天道器)/`getEquipCardClass`(七彩外框)/`formatArtifactSkill`(卡片顯示)/`artifactSkillTurn`(戰鬥中觸發)/`castProcSkill`(依機率自動發動的技能，神器與職業技能共用)/`migrateArtifactIds`(舊神器補 `lingbaoId`、品質改七彩) | `artifactSkills`/`lingbaoShopItems`、`equipTypes`、`player.equipment`/`equipInventory`、`elements.js`(resolveHit)、`stats.js`(攻擊力)、靈寵減傷計時 `petShieldRate/Timer` | `combat.js`/`tribulation.js`/`bounty.js`(出手後呼叫)、`bag.js`/`equipment.js`(卡片)、`save.js`(applySaveData) |
| 29 | `lingbao-shop.js` | `openLingbaoShopModal`/`renderLingbaoShopUI`(神器卡片列出專屬技能與價格)/`isArtifactItem`/`getLingbaoCost(item)`(單件價格，神器另計)/`buyLingbaoItem(itemId)`(裝備另存 `lingbaoId`) | `lingbaoShopItems`、`lingbaoTierCosts`、`ARTIFACT_COST_COINS`、`player.sectSkills`/`lingbaoSold`/`coins`/`reputation`/`equipInventory`/`learnedSkills`、`bag.js`(hasEquipInventorySpace) | HTML 按鈕（僅在「宗門」顯示） |
| 30 | `servant.js` | `openServantModal`/`renderServants`/`assignServantQuest`/`dismissServant`/`bulkDismissServants`/`toggleServantLock`(僕從鎖定，第 9 節)/`tickServantQuests`/`getAssignedServantCount`/`getServantTripCost`/`payServantTrip`（礦脈採礦每趟 2% 挖到星允鐵，enhance.js） | `questData`、`SERVANT_TRIP_COST`、`player.servants`(每位自帶 `quest`/`timer`)/`coins`、`quest.js` 的任務與獎勵函式 | `combat.js`(每 tick 呼叫 tickServantQuests)、`quest.js`(顯示派遣狀態) |
| 31 | `quest.js` | `openQuestModal`/`renderQuestButtons`/`startQuest`/`stopQuest`/`updateQuestUI` + 共用任務函式 `getQuestDef`/`getAvailableQuestIds`/`getQuestRequiredProgress`/`getQuestSpeed`/`canServantTakeQuest`/`formatQuestRewards`/`grantQuestRewards`(回傳實際獲得文字) | `questData`(config-quests.js)、`player.activeQuest`、`stats.js`(getSectTier)、`map.js`(isInSect) | `combat.js`(玩家任務結算)、`servant.js`(僕從任務結算)、`map.js`(離開宗門時中斷) |
| 32 | `activity.js` | `renderActivityList`/`getActivityLockReason`/`openActivity`、付費立即刷新共用 `getPaidRefreshState`/`getPaidRefreshLeft`/`payForRefresh`/`renderPaidRefreshButton`（第 10 節） | `activityData`、`player.reputation`/`realmIndex`/`coins`/`paidRefresh` | `ui.js`(updateUI 每秒重繪)、`auction.js`/`bounty.js`(付費刷新) |
| 33 | `daily-quest.js` | `openDailyQuestModal`/`renderDailyQuests`/`claimDailyQuest`/`claimAllDailyQuests`/`addDailyProgress`/`refreshDailyQuestsIfDue` | `config-daily-quests.js`、`player.daily*` | 各功能的 `addDailyProgress()` 埋點 |
| 34 | `auction.js` | `openAuctionModal`/`refreshAuctionIfDue`/`rollAuctionItem`/`rollAuctionEquip`/`getAuctionItemInfo`/`canPayAuctionItem`/`buyAuctionItem`(紫／橙商品先判定搶拍)/`getRivalBid`/`completeAuctionPurchase`(裝備與壽元丹共用的成交)/搶拍 `auctionBidItemId`/`openAuctionBid`/`renderAuctionBid`/`raiseAuctionBid`/`giveUpAuctionBid`/`renderAuction`/`renderAuctionBuyArea`/`renderAuctionLifePillCard`（裝備改由 gear.js 的 `createGearEquip` 從「拍賣」清單產生；刷新格另有星允鐵袋 `kind: "ironBag"`，下方加 enhance.js 的星允鐵常駐區） | `auctionQualityOdds`、`auctionLifePills`、`AUCTION_RIVAL_*`/`auctionRivalNames`、`equipQualities`、`player.auctionItems`/`coins`/`reputation`/`lifespan`、`merit.js`(renderPreciousSection 嵌在商品下方) | `activity.js`(千寶閣按鈕)、`merit.js`(購買後重繪) |
| 34a | `merit.js` | `isEvilHuntUnlocked`/`isMeritSystemOpen`(暫停開關)/陣營 `getPlayerFaction`/`getOpposingFaction`/`getFactionLabel`/善惡 `getKarmaState`/`formatKarmaTag`/`addKarma`/野外修士 `rollFieldMerit`/`onCultivatorKilled`/`settleMeritStones`(功德自動凝結補天石)/殺手殿堂場景 `openEvilHallScene`/`closeEvilHallScene`/`openEvilHuntModal`/`renderEvilHunt`/`renderPreciousSection`/`buyBreakPill` | `config-merit.js`、`activityData`、`activity.js`(getActivityLockReason)、`sectData`(findSectByName)、`spells.js`(getSpell)、`player.merit`/`butianStones`/`breakPills`/`evilKills`/`karma`、`ui.js`(resolveBatchCount)、`auction.js`(renderAuction)、`bounty.js`(renderBountyBoard) | `combat.js`、`save.js`、`auction.js`、`bounty.js`、`ui.js`/`home-ui.js`(善惡標籤)、`activity.js`(獵殺邪修按鈕 openFn) |
| 34c | `bounty.js` | `getBountyRefSectMult`/`getBountyStats`/`getBountyNpc`/`getBountyIcon`/`refreshBountyIfDue`/`rollBountyBoard`/`getTrackedBountyIds`(舊存檔 activeBountyId 轉陣列)/`getActiveBounties`/`acceptBounty`/`acceptAllBounties`/`abandonBounty(id?)`/`renderBountyBoard`/`renderBountyBulkButtons`、對決 `tryStartBountyDuel`/`startBountyDuel`/`clearDuelDebuffs`/`getDuelWeakenMult`/`getDuelArmorMult`/`bountyDuelTick`/`endBountyDuel` | `config-bounty.js`、`realms`、`wuxingElements`/`MONSTER_AFFIX_TYPES`、`elements.js`、`combat.js`(playerAttackTurn/checkAutoHealAndMana/applyRootRegen/onPlayerKilledInField)、`beast-combat.js`、`merit.js`(陣營、善惡、settleMeritStones) | `combat.js`、`merit.js`(renderEvilHunt)、`stats.js`/`elements.js`(負面狀態)、`map.js`、`save.js`、`ui.js`(戰鬥實況)、`tribulation.js`(對決中不能渡劫) |
| 34b | `talisman.js` | `talismanKey`/`getTalismanType`/`getTalismanGrade`/`getTalismanValue`/`formatTalisman`/`ensureSockets`(橙裝開孔，可重複呼叫)/`getSocketStats`/`formatSockets`/`findEquipById`/`openTalismanModal`/`renderTalismanWorkshop`/`renderSocketCard`/`craftTalisman`/`inlayTalisman`/`removeTalisman` | `config-talisman.js`、`equipTypes`、`player.talismans`/`ore`/`coins`/`equipment`/`equipInventory`、`ui.js`(resolveBatchCount)、`sect.js`(checkSectJoined) | `stats.js`(getEquipBonus 加總符寶)、`equipment.js`/`auction.js`/`lingbao-shop.js`(取得橙裝時 ensureSockets)、`bag.js`/`equipment.js`/`auction.js`(formatSockets 顯示)、`save.js`(migrateEquipSockets)、HTML 符寶坊按鈕 |
| 34d | `gear.js` | **載入時執行** 展開 `gearList`/`gearById`/`gearBySlot`；`getGearDef`/`getQualityObj`/`getCraftChannel`/`pickGearDef`/`buildGearStats`/`createGearEquip`（鍛造、千寶閣、奪寶共用）、隨機詞條 `rollGearSubs`/`formatGearSubs`/`getGearSubTotals`、加成彙總 `getBonusTotals`（詞條＋套裝＋稱號＋職業）/`getGearPctBonus`、套裝 `getEquippedSetCounts`/`resolveSetTier`/`getSetBonusTotals`/`formatSetInfo`/`hasSetSpecial`、強化倍率 `getEnhanceMult`/`getEquipEffectiveStats`、奪寶 `tryLootDrop`、顯示 `getEquipDisplayName`/`formatEquipTitle`/`formatEquipDetails`/`formatGearSubline`/`describeGearEffect`/`formatGearEffect`、特效 `getGearEffects`/`gearFx`、每波狀態 `gearWaveRound`/`gearFirstStrikeUsed`/`gearUndyingUsed`/`gearDodgeStrikeReady`/`resetGearWave`、戰鬥 `getGearHitMult`/`applyGearHitChain`/`applyGearDefense`/`applyGearRegen`/`tryGearUndying`、舊存檔 `migrateGearIds` | `config-gear*.js`、`config-enhance.js`、`config-sets.js`、`equipTypes`/`equipQualities`/`EQUIP_LEVELS`、`lingbaoShopItems`、`talisman.js`(ensureSockets)、`codex.js`、`profession.js`、`enhance.js`(receiveLootEquip) | `equipment.js`/`auction.js`(產生裝備)、`stats.js`/`elements.js`/`combat.js`/`tribulation.js`/`bounty.js`(加成與特效)、`bag.js`/`equipment.js`/`auction.js`/`talisman.js`(卡片)、`save.js` |
| 34e | `enhance.js` | `randInt`、星允鐵 `addStarIron`/`addIronShards`、`locateEquip`/`removeLocatedEquip`、強化 `getEnhanceInfo`/`canEvolve`/`enhanceEquipId`/`openEnhanceModal`/`renderEnhanceModal`/`getEvolveStatRatio`/`enhanceEquip`/`promptEvolveEquip`(+20 系統通知)/`evolveEquip(skipConfirm)`、分解 `getDecomposeYield`/`formatDecomposeYield`/`decomposeEquip`/`bulkDecomposeEquipment`、暫存區 `isGearStashFull`/`receiveLootEquip`/`enforceGearStashLimit`/`moveStashToBag`/`deleteStashEquip`/`renderStashSection`、`refreshEquipViews`、千寶閣 `getIronShopState`/`renderIronShopSection`/`buyStarIron`/`rollIronBagItem` | `config-enhance.js`、`gear.js`、`codex.js`(checkTitleUnlocks、稱號強化成功率)、`map.js`(changeMap)、`ui.js` | `bag.js`/`equipment.js`(按鈕與暫存區)、`auction.js`、`combat.js`/`bounty.js`/`servant.js`(星允鐵)、`map.js`/`save.js`(暫存區滿) |
| 34h | `strange-fire.js` | 異火（第 38 節）：**載入時**建 `strangeFireById`；`addFireShards(n, source)`(取得碎片，供未來秘境掉落呼叫)/`rollStrangeFire`/`gainStrangeFire`/`craftStrangeFire(qty)`(合成，數字或 'max')/`getStrangeFireRealmReduction`(秘境受傷減免比例)/`getStrangeFireBonusTotals`(收錄加成)/`countCollectedFires`/`migrateStrangeFires`(舊存檔)/`renderStrangeFireCards`(背包卡片)/`renderCodexFires`(天磯錄分頁) | `config-strange-fire.js`、`player.fireShards`/`strangeFires`/`fireCollection`、`codex.js`(describeTitleBonus、openCodexModal)、`ui.js` | `bag.js`(renderBag)、`gear.js`(getBonusTotals)、`codex.js`(異火分頁、頂端統計)、`save.js`(applySaveData)；未來秘境（掉落、受擊減傷） |
| 34k | `casino.js` | 天星賭坊（第 40 節）：狀態 `casinoTab`/`casinoBusy`/`casinoResultHtml`/`casinoDice`；`getCasinoState`(跨日重置)/`getCasinoDailyLimit`/`getCasinoRemaining`/`getDiceMaxBet`/`isInCasinoTown`/`checkCasinoSpend`(城鎮、靈石、上限、大額確認)/`recordCasino`；隕石 `randCasino`/`rollStoneOutcome`/`grantStoneOutcome`/`cutStone(id, count)`；擲骰 `setDiceType`/`setDicePick`/`setDiceTotal`/`setDiceAmount`/`addDiceAmount`/`setDiceMax`/`getDicePayout`/`describeDiceBet`/`judgeDice`/`rollDice`；視窗 `openCasinoModal`/`setCasinoTab`/`renderCasino`/`renderCasinoStones`/`renderCasinoDice`/`renderCasinoRecord` | `config-casino.js`、`player.casino`/`coins`/`ore`/`realmIndex`/`currentMap`、`enhance.js`(addStarIron/addIronShards)、`strange-fire.js`(addFireShards/rollStrangeFire/gainStrangeFire)、`gear.js`(tryLootDrop 的 casinoPurple/casinoOrange)、`codex.js`(checkTitleUnlocks/describeTitle*)、`ui.js` | `config-towns.js`(天星城石拱門傳送點)、`codex.js`(賭運稱號條件讀 player.casino) |
| 34j | `town.js` | 城內場景：`currentTownScene`/`currentTownView`/`hasTownScene`/`pickTownView`(直向用 portrait)/`openTownScene(name)`/`closeTownScene`/`applyTownView(recenter)`(換圖＋重排)/`renderTownHotspots(view)`(人偶＋傳送點)/`layoutTownScene(recenter)`；頂層註冊 resize 監聽與 `initTownScenePan`（滾輪左右平移、拖曳平移、`?townedit=1` 座標工具），只綁事件、無其他副作用 | `config-towns.js`、`#town-scene` DOM | `map.js`(goToTown／renderTownTeleports)、HTML 離開按鈕、傳送點 action |
| 34i | `partner.js` | 夥伴（第 39 節）：**載入時**建 `partnerById`；`getPartnerPowerAvg`/`getPartnerTier`/`isPartnerMet`；好感 `getBond`/`getBondLevel`/`getBondLevelName`(LV5 道侶／結拜)/`addBond`/`reduceBond`/`nextBondMin`/`todayKey`/`greetPartner`/`pickGreetLine`/`getGiftCost`/`getGiftsLeft`/`giftPartner`；情緣任務 `getQuestStat`/`describeBondQuest`/`acceptBondQuest`/`getBondQuestProgress`/`claimBondQuest`/`abandonBondQuest`/`onPartnerFieldKills`；結識 `meetPartner`/`talkToPartner`(場景人偶)；彩蛋 `askPartnerEaster`/`answerPartnerEaster`/`playPartnerVideo`/`getPlayedSeconds`/`onPartnerVideoEnded`/`closePartnerVideo`、狀態 `partnerVideoCtx`；隊伍 `getPartnerTeam`/`isInTeam`/`togglePartnerTeam`/`getPartnerBonusTotals`/`partnerSkillTurn`/`migratePartners`；對話 `showPartnerDialog(p, lines, note, afterId, choices)`/`closePartnerDialog`；視窗 `partnerFilter`/`openPartnerModal(focusId)`/`setPartnerFilter`/`formatPartnerOrigin`/`renderBondSection`/`renderPartnerCard`/`renderPartnerModal` | `config-partners.js`、`player.partners`/`partnerTeam`/`partnerBond`/`fieldKills`/`evilKills`/`bountyKills`/`gender`/`coins`、`artifact.js`(castProcSkill)、`codex.js`(describeTitleBonus)、`ui.js` | `gear.js`(getBonusTotals)、`combat.js`(partnerSkillTurn、擊殺後 onPartnerFieldKills)/`tribulation.js`/`bounty.js`、`save.js`(migratePartners)、`config-towns.js`(風希人偶 talkToPartner)、HTML 情緣導覽與對話框 |
| 34f | `profession.js` | `getProfession`/`getProfRank`/`getProfRankName`/`getProfessionPassive`/`getProfWeaponMult`/`gainProficiency`/`gainKillProficiency`/`professionSkillTurn`/`formatProfessionTag`/`chooseProfession`/`renderProfessionTab` | `config-profession.js`、`artifact.js`(castProcSkill)、`elements.js`(getMapCategoryIndex)、`codex.js` | `stats.js`(主修武器加成)、`gear.js`(被動)、`combat.js`/`tribulation.js`/`bounty.js`(職業技能、熟練度)、`save.js`(離線熟練度)、`codex.js` |
| 34g | `codex.js` | 收藏 `recordGearCollected`/`migrateGearCodex`/`hasCollected`/`getOpenGear`/`getTitleGear`(收藏類稱號範圍，固定不含秘境)/`countCollected`/`countCollectedQuality`、稱號 `getTitleName`/`isTitleConditionMet`/`describeTitleCondition`/`describeTitleBonus`/`getTitleBonusTotals`/`checkTitleUnlocks`/`getNameTag`/`setActiveTitle`、視窗 `codexTab`/`codexSlot`/`openCodexModal`/`setCodexTab`/`setCodexSlot`/`renderCodexModal`/`formatCodexStars`/`formatCodexStarLegend`(星星六色，第 48 節)/`CODEX_QUALITIES`/`renderCodexGear`/`renderCodexSets`/`renderCodexTitles`（異火分頁在 strange-fire.js） | `config-titles.js`、`gear.js`、`profession.js`、`strange-fire.js`(renderCodexFires/countCollectedFires)、`merit.js`(getKarmaState)、`stats.js`(getSectTier) | `gear.js`(收藏、稱號加成)、`enhance.js`、`profession.js`、`ui.js`(updateUI 每秒 checkTitleUnlocks)、`home-ui.js`(道號旁標籤)、`save.js`、HTML 天磯錄熱點 |
| 35 | `field.js` | `herbRecipes`、`openFieldModal`/`plantHerb` | `player.spiritGrass`/`player.herbs`/`player.coins`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示） |
| 36 | `beast-combat.js` | `createBeast`/`getBeastName`/`isBeastActive`(存活且出戰中)/維持費 `getBeastUpkeep`/`payBeastUpkeep`/`restBeastForUpkeep`/`tickBeastUpkeep`/`settleOfflineBeastUpkeep`/`getBeastSkill`/`describeBeastSkill`/`gainBeastExp`/`killAllBeasts`/`applyPetDamageReduction`/`petAssistTick` | `beastData`、`beastSkillTree`、`beastUpkeepTiers`/`BEAST_UPKEEP_INTERVAL`、`player.beasts`/`level`/`coins`/`beastCore`、`stats.js`(getLevelExpNeeded/getPhysAttack)、`beast.js`(renderBeasts，靈獸園開著時重繪) | `leveling.js`(gainExp)、`combat.js`(每秒 tickBeastUpkeep)/`tribulation.js`(每回合)、`lifespan.js`(死亡)、`stats.js`(hasLiveBeast)、`beast.js`、`save.js`(離線維持費) |
| 36a | `spells.js` | **載入時執行** IIFE 組出 `spellList`(200 招)/`spellById`；`getSpell`/`isSpellLearned`/`getSpellSlotCount`/`getEquippedSpells`/`getSpellAuraBonus`(被動光環加總)/`spellToCombatSkill`/`getSpellTypeLabel`/`describeSpell`、密典 `spellFilter`/`spellSelectedId`/`openSpellModal`/`setSpellFilter`/`selectSpell`/`renderSpellModal`/`equipSpell`/`unequipSpell` | `config-spells.js`（**必須排在它之後**）、`player.spells`/`spellSlots`/`level`、`ui.js`(addLog/updateUI) | `stats.js`(getPhysAttack/getMagAttack/getMaxHp/getMaxMp 乘光環、getAllSkills 加技能格仙法)、`elements.js`(getPlayerCombatAttrs 加光環)、HTML 密典按鈕 |
| 37 | `beast.js` | `openBeastModal`/`getBeastDiscountMult`(魅力折扣倍率)/`renderBeasts`/`tameBeast`/`reviveBeast`/`toggleBeastActive`(出戰／召回休息)/`learnBeastSkill` | `beastData`、`player.beastCore`/`coins`/`beasts`、`beast-combat.js`、`stats.js`(getEquipBonus 算魅力折扣) | HTML 按鈕（僅在「宗門」顯示） |
| 38 | `library.js` | 第一階段 `STUDY_COST`/`STUDY_GAIN`/`STUDY_MAX_COUNT`、`openLibraryModal`/`studyBook`；第二階段屬性秘典（第 24 節）`ELEMENT_BOOK_TIER`/`ELEMENT_BOOK_GAIN`/`ELEMENT_BOOK_MAX`/`ELEMENT_BOOK_COST`/`elementBooks`、`isElementBookUnlocked`/`getElementBookBonus`/`formatElementBookPercent`/`renderElementBooks`/`studyElementBook` | `player.studyCounts`/`elementStudy`/`martialPoints`/`spiritGrass`/`coins`/`stats`/`sectSkills`、`SECT_TIER_NAMES`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示）、`elements.js`(getPlayerCombatAttrs 呼叫 getElementBookBonus) |
| 39 | `alchemy.js` | `pillRecipes`、`openAlchemyModal`/`craftPill` | `player.herbs`/`stats`/`coins`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示） |
| 40 | `player-profile.js` | `PLAYER_NAME_MAX_LENGTH`、`sanitizePlayerName`(移除 HTML 特殊字元，讀檔/匯入也套用)/`changePlayerName`(開啟 #name-modal)/`confirmPlayerName` | `player.name` | HTML 按鈕、`save.js`(applySaveData) |
| 41 | `save.js` | `calcOfflineProgress`(讀檔時的離線結算，呼叫 settleIdleSeconds)/`settleIdleSeconds`(離線與背景共用的收益結算，含 settleOfflineBeastUpkeep 靈寵維持費)/`estimateIdleCombat`(依實力估算離線戰鬥效率與能否存活)/`formatIdleDuration`/背景補發 `checkBackgroundCatchUp`＋常數 `BACKGROUND_TICK_SLACK_MS`/`BACKGROUND_SETTLE_MIN_SECONDS`（第 33 節）/`saveLocal`/`loadLocal`/`applySaveData`(讀檔與匯入共用)/`resetGameCompletely` + 舊存檔相容 `migrateServantAssignments`/`migrateEquipmentSlots`/`migrateActivityFields`/`migrateCurrentMap`/`migrateProgressionFields`/`migrateLegacySkills`(舊禁術下修＋已兌換武學耗魔同步)/`migrateRealmExp`(經驗曲線改版：待渡劫者修為壓回滿格)/`migrateEquipSockets`(只補 talismans 欄位)/`migrateArtifactIds`(在 artifact.js，舊神器補 lingbaoId) + 讀檔失敗保護 `saveLoadFailed`/`reportLoadFailure`/`retryLoadAfterFailure`/`showRawSaveForCopy`/`abandonSaveAndStartNew`（第 30 節） + 離線斬殺野外修士的功德（讀檔時也呼叫 `settleMeritStones()`）+ 讀檔時清除懸賞對決狀態 + `reloadLocalSave`(選單按鈕，無存檔時給提示) + 存檔代碼（常數 `SAVE_CODE_PREFIX`="FS2:"、兩段式確認暫存 `pendingImportData`；編解碼皆為 async）`encodeSaveCode`/`decodeSaveCode`/`bytesToBase64`/`base64ToBytes`/`pipeBytes`/`openSaveCodeModal`/`setSaveCodeStatus`/`exportSave`/`selectSaveCodeText`/`copySaveCode`/`downloadSaveCode`/`importSave`/`pasteSaveCodeFromClipboard`/`importSaveFromFile`/`confirmImportSave`/`resetImportConfirm` | `player`（整包序列化進 `localStorage`）、`maps`(migrateCurrentMap)、`legacySkillAdjustments`/`lingbaoShopItems`(migrateLegacySkills)、`leveling.js`(gainExp)、`combat.js`(tryRescueServant)、`lifespan.js`、`beast-combat.js`(createBeast)、`ui.js` | `main.js`(啟動時 loadLocal)、`main.js`(initGame 內每 30 秒 saveLocal) |
| 41b | `avatar.js` | `getPlayerAvatar`/`isAvatarUnlocked`/`checkAvatarCondition`/`checkAvatarUnlocks`/`openAvatarModal`/`renderAvatarModal`/`buyAvatar`/`selectAvatar`；頭像光環 `isFrameUnlocked`/`getPlayerFrame`/`checkFrameUnlocks`/`getFrameOverlayBox`/`renderFramedAvatar`/`renderFrameList`/`selectFrame`/`buyFrame` | `avatarList`、`avatarFrameList`/`AVATAR_FRAME_HOLE_FIT`、`player.avatarId`/`unlockedAvatars`/`avatarFrameId`/`unlockedFrames`/`gender`/`realmIndex`/`level`/`reputation`/`tribulationCount`、`realms` | `ui.js`(updateUI 呼叫 checkAvatarUnlocks；戰鬥實況頭像 renderFramedAvatar)、`home-ui.js`(頭像框、`updateHudAvatarFrames`)、HTML 頭像點擊與選擇視窗 |
| 41d | `leaderboard.js` | 天下戰力榜（第 42 節）：狀態 `lbBackend`/`lbLastUploadAt`/`lbLastRefreshAt`/`lbRows`/`lbError`/`lbBanned`(被 GM 封鎖)；`checkLeaderboardBan`(上傳前查 banned/{uid}，第 50 節)；`lbTsDiffNanos`(兩個 Timestamp 相差奈秒，hist2 用)；`isLeaderboardConfigured`/`getRankPower`(= getPhysAttack 扣掉禁術、靈寵增益、對決化功等暫時倍率)/`getRankAttack`(max(物攻, 術攻) 同樣扣暫時倍率，守城送審用)/`lbStripTempBuffs`/守城榜 `lbDefenseRows`/`lbDefenseMine`/`lbTab`、`submitDefenseRecord(run)`/`flushDefenseSubmit`/`getDefenseRankStatusText`/`fetchDefenseBoard`/`switchLeaderboardTab`/`applyLeaderboardTab`/`defenseBoardHtml`（第 49 節）/`lbLoadScript`/`initLeaderboardBackend`(動態載入 Firebase compat SDK＋匿名登入，回傳 `{db, uid}`)/`uploadLeaderboard`/`startLeaderboardSync`/`fetchLeaderboard`/`openLeaderboardModal`/`refreshLeaderboard(manual)`/`lbEscape`/`lbTimeAgo`/`renderLeaderboard(loading)` | `config-leaderboard.js`、`stats.js`(getPhysAttack)、`bounty.js`(getDuelWeakenMult)、`player`/`petBuffTimer`/`petBuffMult`/`gameOver`、`save.js`(saveLoadFailed)、`main.js`(gameStarted)、`player-profile.js`(sanitizePlayerName)、`realms`、全域 `firebase`（CDN 動態載入） | `main.js`(initGame 呼叫 startLeaderboardSync)、HTML 洞府 HUD「戰力 🏆」與大道石碑、`defense.js`(submitDefenseRecord／getRankPower／getRankAttack／getDefenseRankStatusText) |
| 41e | `secret-realm.js` | 秘境入口（第 43 節）：`currentSecretRealm`、`getSecretRealm`/`openSecretRealmModal`/`renderSecretRealmList`/`openSecretRealmScene(id)`/`closeSecretRealmScene`(回到列表)/`challengeSecretRealm`(顯示預定玩法與獎勵；`mode: 'defense'` 改呼叫 `openDefenseBattle`)、每日次數 `getSecretRealmDaily`/`getSecretRealmAttemptsLeft`/`useSecretRealmAttempt`/`refreshSecretRealmEnterLabel` | `config-secret-realms.js`、`realms`、`player.realmIndex`、`ui.js`(closeModal)、`defense.js` | `activity.js`(活動「秘境」的 openFn)、HTML 秘境卡片與場景按鈕 |
| 41g | `zhenmo.js` | 鎮魔塔（第 51 節）：`ZhenmoTower`（閉包；對外 open／close／startQuiz／answer／enterBoss／renderHall／state 與測試用 `_quiz`）、全域 `openZhenmoTower`/`closeZhenmoTower`/`startZhenmoQuiz`/`answerZhenmo(i)`/`enterZhenmoBoss`/`backToZhenmoHall` | `config-zhenmo.js`、`config-zhenmo-questions.js`、`#zhenmo-scene` DOM、`secret-realm.js`(次數)、`ui.js`(addLog) | `secret-realm.js`(challengeSecretRealm 的 `mode: 'tower'`)、HTML 鎮魔塔畫面按鈕 |
| 41f | `defense.js` | 死守天南城（第 49 節）：`DefenseBattle`（內部函式全包在裡面，對外 open／close／setSpeed／retry／openRecords／closeRecords／waveSpec／waveAtk／waveRealmLabel／waveEnemy／simulateWave 與測試用 `_sim`／`_grantWave`／`_settle`／`_setWave`／`_state`；內部 `recordRun` 寫通關紀錄並送審）、全域 `openDefenseBattle(realmId)`/`closeDefenseBattle`/`setDefenseSpeed`/`openDefenseRecords`/`closeDefenseRecords` | `config-defense.js`（含強度曲線 defenseRealmAtk／defenseWaveAtk）、`leaderboard.js`(送審、getRankPower／getRankAttack)、`format.js`(toWan)、`#defense-scene` DOM、`bounty.js`(getBountyRefSectMult)、`elements.js`(resolveHit/tickStatus/newStatus)、`stats.js`、獎勵用的 gear.js／enhance.js(receiveLootEquip／addStarIron)／strange-fire.js／merit.js／partner.js／codex.js(checkTitleUnlocks)、`secret-realm.js`(次數) | `secret-realm.js`(challengeSecretRealm)、HTML 守城畫面按鈕 |
| 41c | `settings.js` | `DISPLAY_MODE_KEY`(localStorage 鍵)/`DISPLAY_MODES`/`AUTO_PC_MIN_WIDTH`/`AUTO_PC_MIN_RATIO`、`getDisplayMode`/`resolveDisplayLayout`(回傳 'phone'／'pc')/`setDisplayMode`/字級 `FONT_SCALE_KEY`/`FONT_SCALES`/`getFontScaleId`/`applyFontScale`/`setFontScale`（第 45 節）/`openSettingsModal`/`renderSettingsModal`/`isFullscreen`/`toggleFullscreen`；頂層註冊 `fullscreenchange` 監聽（只綁函式，載入順序不影響） | `home-ui.js`(layoutStage)、`#settings-modal` DOM、`localStorage` | `home-ui.js`(layoutStage 呼叫 resolveDisplayLayout)、HTML ⚙️ 設定按鈕 |
| 41a | `home-ui.js` | `STAGE_IMG_W`/`STAGE_IMG_H`、`TAB_TITLES`(修仙／戰鬥／宗門／任務／世界)、`layoutStage`(手機／PC 版面切換，並控制寬螢幕用手機版時的「切換回 PC 版」按鈕，第 34 節)/`renderPcStage`(依 config-home-pc.js 產生 PC 版按鈕與熱點)/`initHomeUi`/`switchTab`/`openWorldTab`/`showStageToast`/`showHudResourceInfo`(資源框點擊說明，第 47 節)/`showUnderConstruction`/`openAscensionPlatform`/`openSystemModal`(命運與系統彈窗)/`formatShortNumber`/`getCultivationRate`/`updateHomeHud`(同時寫入手機版 hud-xxx 與 PC 版 pc-hud-xxx) | `player`、`realms`、`PLAYER_AVATARS`、`stats.js`、`tribulation.js`(triggerTribulation)、`activity.js`(openActivity)、`config-home-pc.js`、`settings.js`(resolveDisplayLayout) | `ui.js`(updateUI 結尾呼叫 updateHomeHud)、`main.js`(onload 呼叫 initHomeUi)、HTML 熱點與底部導覽 |
| 42 | `title-screen.js` | `TITLE_HOTSPOTS`(光環座標)/`currentTitleHotspot`/`positionTitleHotspot`/`enterWorld`/`initTitleScreen`、旗標 `worldEntered` | `main.js`(startGame)、`#title-screen` DOM | `main.js`(onload 呼叫 initTitleScreen)、標題頁按鈕 |
| 43 | `main.js` | `initGame`(含每 30 秒存檔與切到背景時存檔、啟動戰力榜定時上傳)/`startGame`(讀檔失敗時不進入開新角色)/`chooseGender`/`window.onload`(另呼叫 `applyFontScale()` 套用字級（第 45 節）、`initModalTopClose()` 加彈窗 ✕（第 46 節）與 `restoreLogTab()` 還原日誌分頁（第 44 節）)、旗標 `gameStarted` | 幾乎全部模組（啟動流程的膠水程式碼） | 瀏覽器 `onload`、`title-screen.js`(enterWorld 呼叫 startGame) |

## 3. 資料流總覽（文字版流程圖）

```
使用者開啟 index.html
        │
        ▼
瀏覽器依序載入 config-*.js → state.js → stats.js → ui.js
        → map/combat/leveling → 各彈窗功能檔 → save.js → main.js
        │
        ▼
window.onload (main.js) → initTitleScreen() [title-screen.js]
        │
        ▼
顯示遊戲主頁 #title-screen（此時 <body class="title-mode"> 會隱藏 #game-container）
        │
        │  玩家點擊光環熱區 / 「進入世界」按鈕 / 按 Enter、空白鍵
        ▼
enterWorld() [title-screen.js] → 標題頁淡出、移除 body.title-mode → startGame()
        │
        ▼
startGame() [main.js]
        ├─ loadLocal() [save.js] 讀 localStorage
        │       ├─ 成功 → calcOfflineProgress() 結算離線收益 → updateUI() → initGame()
        │       └─ 失敗（第一次進入）→ 顯示 #gender-modal 性別選擇視窗
        │               └─ 玩家點選 → chooseGender() [main.js]：設定性別與預設道號 → initGame() → 立即 saveLocal()
        │
        ▼
initGame() [main.js]
        ├─ initForgeSelect()      [equipment.js]
        ├─ syncAutoSettingsUI()   [ui.js]
        ├─ updateUI()             [ui.js]
        ├─ setInterval(combatTick, 1000)   [combat.js]  ← 遊戲主迴圈
        ├─ setInterval(saveLocal, 30000)   [save.js]    ← 自動存檔
        └─ startLeaderboardSync()          [leaderboard.js] ← 每 5 分鐘上傳戰力到 Firebase（未設定時不動作，第 42 節）

combatTick() 每秒執行 [combat.js]
        ├─ checkBackgroundCatchUp() [save.js]：分頁在背景被放慢／暫停時，把沒跑到的秒數以離線公式補發（第 33 節）
        ├─ 渡劫中 → tribulationTick() [tribulation.js]；懸賞對決中 → bountyDuelTick() [bounty.js]（兩者都接管整個 tick）
        ├─ 野外刷新新一波前：tryStartBountyDuel() [bounty.js] 已接取懸賞時有機率遇上目標（第 36 節）
        ├─ 安全區：回血回魔、每 5 秒 gainExp() [leveling.js]
        ├─ 野外：玩家狀態結算(燒傷/中毒/凍結) → 攻擊/技能（每擊經 resolveHit() [elements.js]）
        │        → 靈寵協助 petAssistTick() [beast-combat.js] → 怪物狀態結算 → 擊殺結算 → 怪物逐隻反擊（同樣經 resolveHit()）
        │       ├─ 擊殺 → gainExp()（同時累積境界、人物等級、靈寵等級）、加靈石、tryRescueServant() [combat.js]
        │       └─ 戰死 → handlePlayerDeath() [lifespan.js]：折壽、靈寵全數陣亡；壽元歸零 → 清除存檔重新開始
        ├─ 玩家任務進度（須在宗門）[quest.js 的 activeQuest]
        ├─ tickServantQuests() 每位僕從各自的任務進度 [servant.js]
        └─ checkAutoHealAndMana() 自動補給 [combat.js]

任何彈窗操作（購買/裝備/宗門/任務…）
        └─ 修改 player 狀態 → 呼叫 updateUI()/addLog() [ui.js] → 畫面即時更新
```

## 4. HTML `onclick` → 函式 → 所在檔案 對照表

新增/修改 HTML 按鈕時，務必同步確認函式名稱與下表一致（全域函式，不可加 `type="module"`）。
※ `plantHerb(type, qty)`、`craftPill(type, qty)`、`studyBook(stat, qty)`、`studyElementBook(key, qty)`、`forgeEquipment(qty)` 的 `qty` 為 `1`、`10` 或 `'max'`（見第 9 節批次操作）。

| onclick 呼叫 | 定義檔案 |
|---|---|
| `changePlayerName`, `confirmPlayerName` | `data/player-profile.js` |
| `openEquipmentModal`, `unequipItem`, `equipItem`, `forgeEquipment` | `data/equipment.js` |
| `openWorldMapModal`（修仙地圖彈窗：世界分頁按鈕）, `openMapCategoryModal`, `selectMap` | `data/map.js` |
| `openSkillModal`（修仙分頁「⚔️ 當前可用技能」） | `data/ui.js` |
| `switchLogTab('battle'/'item'/'servant')`（歷練日誌分頁按鈕，第 44 節） | `data/ui.js` |
| `openSectModal`, `joinSect` | `data/sect.js` |
| `openShopModal`, `buyShopItem` | `data/shop.js` |
| `openBagModal`, `useItemFromBag`, `deleteItemFromBag`, `deleteEquipFromInventory`, `toggleEquipLock(id)`（背包、暫存區、角色裝備卡片的 🔓/🔒 按鈕） | `data/bag.js` |
| `openServantModal`, `dismissServant`, `toggleServantLock(id)`（僕從卡片的 🔓/🔒 按鈕） | `data/servant.js` |
| `openQuestModal`（任務分頁「📜 門派任務」、宗門分頁按鈕）, `startQuest`, `stopQuest` | `data/quest.js` |
| `openFieldModal`, `plantHerb` | `data/field.js` |
| `openBeastModal`, `tameBeast`, `reviveBeast`, `toggleBeastActive`, `learnBeastSkill` | `data/beast.js` |
| `openLingbaoShopModal`, `buyLingbaoItem(itemId)`（舊版的第二個參數 payType 已移除，改為同時扣靈石＋聲望） | `data/lingbao-shop.js` |
| `openLibraryModal`, `studyBook`, `studyElementBook`（後者的按鈕由 `renderElementBooks()` 動態產生） | `data/library.js` |
| `openForgeModal`, `openWuxingInfo` | `data/equipment.js` |
| `openAlchemyModal`, `craftPill` | `data/alchemy.js` |
| `triggerReincarnate` | `data/leveling.js` |
| `triggerTribulation` | `data/tribulation.js` |
| `setShopQty`, `setShopQtyMax`, `updateShopTotal` | `data/shop.js` |
| `resetGameCompletely`, `saveLocal`, `reloadLocalSave`, `exportSave`, `importSave`, `copySaveCode`, `downloadSaveCode`, `pasteSaveCodeFromClipboard`, `importSaveFromFile`, `confirmImportSave`, `resetImportConfirm` | `data/save.js` |
| `updateAutoSettings` | `data/ui.js` |
| `closeModal`, `toggleDrawer`, `toggleAllBulkQualities` | `data/ui.js` |
| `bulkDeleteEquipment` | `data/bag.js` |
| `bulkDismissServants`, `assignServantQuest` | `data/servant.js` |
| `openActivity` | `data/activity.js` |
| `openDailyQuestModal`, `claimDailyQuest`, `claimAllDailyQuests` | `data/daily-quest.js` |
| `openAuctionModal`, `buyAuctionItem`、搶拍視窗內的 `raiseAuctionBid(step)`/`giveUpAuctionBid`（動態產生） | `data/auction.js` |
| `acceptBounty(id)`, `abandonBounty(id)`（懸賞榜卡片，由 `renderBountyBoard()` 動態產生）、`acceptAllBounties`／`abandonBounty()`（榜單上方「一次接取全部」「放棄全部追蹤」，`renderBountyBulkButtons()` 產生）、`paidRefreshBounty`（懸賞榜「🔄 立即刷新」） | `data/bounty.js` |
| `paidRefreshAuction`（千寶閣「🔄 立即刷新」，由 `renderAuction()` 動態產生） | `data/auction.js` |
| `openTalismanModal`、`craftTalisman(qty)`（隨機煉製）、`inlayTalisman(equipId, idx)`、`removeTalisman(equipId, idx)`（後三者由 `renderTalismanWorkshop()` 動態產生） | `data/talisman.js` |
| `buyBreakPill`（千寶閣珍貴物資區，動態產生；舊的 `exchangeMeritForStone` 已移除，功德改為自動凝結）、`openEvilHallScene`（經由 `openActivity('evil')`，開殺手殿堂場景）、`openEvilHuntModal`（場景中央「殺手殿堂」匾額）、`closeEvilHallScene`（場景「↩ 離開」） | `data/merit.js` |
| `enterWorld` | `data/title-screen.js` |
| `retryLoadAfterFailure`, `showRawSaveForCopy`, `abandonSaveAndStartNew`（讀檔失敗視窗） | `data/save.js` |
| `switchTab`（手機洞府左側「任務」= `switchTab('task')`）, `openWorldTab`（手機／PC 的「世界」導覽：切到世界分頁並跳出修仙地圖）, `openAscensionPlatform`, `showUnderConstruction`（洞府主畫面尚未實作的按鈕）, `openSystemModal`（命運與系統彈窗：手機丹藥堂上方齒輪、設定視窗內按鈕） | `data/home-ui.js` |
| `openPartnerModal`（手機與 PC 的「情緣」）、`setPartnerFilter(f)`、`greetPartner(id)`／`giftPartner(id)`／`acceptBondQuest(id)`／`claimBondQuest(id)`／`abandonBondQuest(id)`／`togglePartnerTeam(id)`（情緣視窗內）、`closePartnerDialog`／`answerPartnerEaster(id, yes)`（對話框）、`closePartnerVideo`（彩蛋影片）、`talkToPartner(id)`（坊市人偶） | `data/partner.js` |
| `craftStrangeFire(qty)`（背包異火碎片卡片）、`openCodexModal('fires')`（背包異火卡片「查看異火榜」） | `data/strange-fire.js`／`data/codex.js` |
| PC 版洞府的所有按鈕與建築熱點（onclick 字串寫在 `config-home-pc.js` 的 `pcStageButtons[].action`，改名函式時要一起改） | 各功能檔 |
| `openSettingsModal`（洞府右上 ⚙️、PC 版「設置」）、`setDisplayMode(mode)`、`toggleFullscreen`、`setFontScale('s'/'m'/'l')`（後三者由 `renderSettingsModal()` 動態產生） | `data/settings.js` |
| `openSpellModal`（修仙分頁「📜 武學密典」）、`setSpellFilter`/`selectSpell`/`equipSpell`/`unequipSpell`（密典內動態產生） | `data/spells.js` |
| `openAvatarModal`（點洞府頭像）、`selectAvatar(id)`（選擇視窗內動態產生） | `data/avatar.js` |
| `openEnhanceModal(id)`（背包、角色裝備卡片「🔨 強化」）、`enhanceEquip(untilSuccess)`/`evolveEquip`（強化視窗內）、`decomposeEquip(id)`、`bulkDecomposeEquipment`、`moveStashToBag(id)`/`deleteStashEquip(id)`（暫存區）、`buyStarIron(qty)`（千寶閣） | `data/enhance.js` |
| `openCodexModal(tab)`（洞府寶塔右側山峰「天磯錄」，手機熱點與 PC 的 `pcStageButtons`）、`setCodexTab`/`setCodexSlot`/`setActiveTitle`（視窗內動態產生） | `data/codex.js` |
| `chooseProfession(id)`（天磯錄「職業」分頁） | `data/profession.js` |
| `openLeaderboardModal`（洞府 HUD 手機 `#hud-name`／PC `#pc-hud-name` 的「戰力 🏆」、洞府「大道石碑」熱點：手機寫在 index.html、PC 在 `pcStageButtons` 的 `stele`）、`refreshLeaderboard(true)`（榜單視窗「重新整理」）、`switchLeaderboardTab('power'/'defense')`（榜單視窗分頁：戰力榜／死守天南城通關榜） | `data/leaderboard.js` |
| `openSecretRealmModal`（經由 `openActivity('secret')`）、`openSecretRealmScene(id)`（秘境卡片，動態產生）、`closeSecretRealmScene`（場景「↩ 離開」）、`challengeSecretRealm`（場景「⚔️ 入塔挑戰」／「⚔️ 死守天南城」） | `data/secret-realm.js` |
| `closeDefenseBattle`（守城「↩ 離開」與結算「↩ 返回秘境」）、`setDefenseSpeed(1/2/4)`、`DefenseBattle.retry()`（載入失敗「🔄 重新載入」）、`openDefenseRecords`（守城畫面左上與結算畫面「📜 通關紀錄」）、`closeDefenseRecords`（紀錄視窗「關閉」） | `data/defense.js` |
| `closeZhenmoTower`（鎮魔塔「↩ 離開」）、`startZhenmoQuiz`（塔廳「📜 開始問答」）、`answerZhenmo(i)`（問答選項）、`enterZhenmoBoss`（塔廳／結算「🚪 進入／開啟 BOSS 房門」）、`backToZhenmoHall`（「稍後再戰」「↩ 返回塔廳」） | `data/zhenmo.js` |
| `chooseGender` | `data/main.js` |

## 5. 新增功能的建議流程

1. **新增資料（怪物/裝備/宗門/商品…）**：優先修改對應的 `data/config-*.js`，不要動邏輯檔。
2. **新增彈窗/系統玩法**：比照現有模式新增一支 `data/新功能.js`（`open高X高Modal` + `render高X高` + 互動函式），
   在 `index.html` 對應位置加上按鈕與彈窗 DOM，並在 `<script>` 清單中加入 `<script src="data/新功能.js"></script>`
   （放在 `state.js`/`ui.js` 之後、`main.js` 之前即可，除非新檔案有頂層立即執行的程式碼且依賴其他資料）。
3. **修改屬性公式**：只改 `data/stats.js`。
4. **修改存檔結構**：修改 `data/state.js` 的 `player` 初始值，並檢查 `data/save.js` 的
   `loadLocal`/`importSave` 是否需要補上舊存檔缺欄位時的預設值（目前已有 `gender`/`name`/`stats.cha`/`studyCounts`/`pendingTribulation`/`tribulationCount` 的相容處理，
   以及 `migrate*()` 系列：僕從任務、裝備欄位、活動欄位、`migrateCurrentMap()`（所在地圖改指向最新設定，已刪除的地圖回到宗門）、`migrateProgressionFields()`（等級/壽元/宗門技能/靈寵）。
   讀檔與匯入都走 `applySaveData(data)`，它會把存檔合併到**全新角色的預設值**（`state.js` 的 `DEFAULT_PLAYER_JSON`）上，
   **不是**合併到目前的 `player`——否則遊戲中匯入缺欄位的舊存檔，會沿用目前角色的等級、宗門技能等資料（曾發生過）。
   ⚠️ 因為已合併過預設值，**判斷「存檔裡原本有沒有這個欄位」要看原始 `data`，不能看 `player`**，
   否則預設值（例如壽元 60）會蓋過應補的值。新增的 `migrate*()` 一律加進 `applySaveData()`，讀檔與匯入就會同時生效。
5. **新增畫面元素時**：先確認電腦版排版，再到 `index.html` 的 media query 區塊
   （第 6 節）補上手機版的調整，避免手機出現破版或水平捲動。
6. **完成任何修改後，回來更新本檔案（ARCHITECTURE.md）對應章節。**

## 6. 版型與 RWD 規則（電腦版 / 手機版）

> ⚠️ **2026-09-24 起主畫面改為「洞府」舞台版面（第 31 節）**：舊的三欄 `#game-container` 已搬進舞台內的分頁區 `#tab-sheet`，
> 各面板依 `data-tab` 分到修仙／戰鬥／宗門／世界分頁，不再是三欄。本節下方的三欄與 `nth-of-type` 排序規則仍留在 CSS 內，
> 但已被 `<style>` 最後的舞台樣式覆蓋；**新增畫面元素請依第 31 節的做法**。彈出視窗（`.modal-bg`）的 RWD 規則照舊有效。

所有樣式集中在 `index.html` 的 `<style>` 內，分成兩段：

1. **共用 / 電腦版樣式**（檔案前半，`@media` 之前）：原本的三欄式版型，未加任何條件，行為與改版前完全相同。
2. **手機 / 平板樣式**（檔案末端，兩個 `@media` 區塊）：**只在窄螢幕生效**，因此不會影響電腦版。

| 斷點 | 目標裝置 | 主要調整 |
|---|---|---|
| `@media (max-width: 900px)` | 手機、平板直式 | 三欄 `300px 1fr 300px` → 單欄；用 `order` 重排為 **狀態列 → 戰場實況 → 角色/地圖 → 宗門設施**；狀態列改直式堆疊（境界/戰力、靈石/聲望各自橫向排）；按鈕加大為觸控尺寸並取消 hover 位移；彈窗寬度 94%、卡片自動排成雙欄；靈寶閣雙按鈕改上下排列；鍛造閣下拉選單改整列（×1/×10/最高 按鈕由 `.batch-btns` 自動排成一列，不需額外規則） |
| `@media (max-width: 480px)` | 一般手機（360–430px） | 進一步縮小 padding、字級、日誌高度、頭像尺寸，卡片最小寬度降為 135px 以維持雙欄 |

維護注意事項：

- **不要為了手機去改電腦版的既有規則**；所有手機調整一律寫進 media query 內，這是「手機有自己的 UI、電腦版不受影響」的前提。
- HTML 內有不少**行內樣式**（如 `style="width: auto; margin-left: 10px;"`）。行內樣式優先權高於 CSS，
  若手機版需要覆蓋它，必須在 media query 內使用 `!important`（目前 `#battle-player-icon img`、
  狀態列子項的 `margin-top` 即是這種情況）。新寫的按鈕盡量用 class 而非行內樣式，就不需要 `!important`。
- `#game-container > div:nth-of-type(n)` 依賴四個直接子元素的順序（header / 角色欄 / 戰場欄 / 設施欄）。
  若之後在 `#game-container` 內新增或調換區塊，必須同步更新 media query 內的 `order` 規則。
- 驗證方式：瀏覽器開發者工具切換 375px、360px 與 >900px 三種寬度，確認
  `document.documentElement.scrollWidth === clientWidth`（無水平捲動），且電腦版維持三欄。

## 7. 渡劫系統（心魔試煉）

**從「築基 → 金丹」開始**，小境界修滿 10 階後不會自動晉升，必須擊敗心魔才能進入下一個大境界。
門檻由 `config-tribulation.js` 的 `TRIBULATION_MIN_REALM_INDEX`（預設 2 =【築基】）控制；
在此之前（凡人 → 煉氣、煉氣 → 築基）滿 10 階會直接突破，溢出的經驗會保留到新境界。

| 環節 | 位置 | 說明 |
|---|---|---|
| 修為封頂 | `leveling.js` 的 `gainExp()` | 小境界到 10 階且經驗滿格時：若 `realmIndex >= TRIBULATION_MIN_REALM_INDEX` 則 `pendingTribulation = true`，之後 `gainExp()` 一律回傳 0（經驗完全停止累積，含離線收益）；未達門檻則直接呼叫 `advanceRealm()` 突破並保留溢出經驗 |
| 渡劫按鈕 | `index.html` 的 `#btn-tribulation` + `ui.js` 的 `updateTribulationUI()` | 只在待渡劫時顯示，並即時顯示目前勝算；渡劫進行中改為顯示心魔剩餘氣血並鎖定 |
| 勝算計算 | `tribulation.js` 的 `getTribulationChance()` | 基礎 + 丹藥 + 技能，上限 80%（見下方） |
| 天命擲骰 | `triggerTribulation()` | 確認視窗列出勝算明細與提升建議；開打時 `tribulationFatedWin = Math.random() < 勝算`（`state.js`，不存檔） |
| 心魔數值 | `config-tribulation.js` | 戰力 = 玩家 100%（`HEART_DEMON_POWER_MULT`）、氣血 = 玩家 100%（`HEART_DEMON_HP_MULT`）、4 個魔功技能；只影響戰鬥過程的觀感 |
| 戰鬥流程 | `tribulation.js` 的 `tribulationTick()` | 由 `combat.js` 的 `combatTick()` 在 `inTribulation` 為 true 時接管，暫停掛機、刷怪與宗門任務。戰況與天命相反時在關鍵一刻收尾：天命勝卻將戰死 →「絕處逢生」判勝；天命敗卻將擊殺心魔 →「心魔反噬」判敗 |
| 成功 | `endTribulation(true)` → `leveling.js` 的 `advanceRealm()` | 晉升大境界並給予屬性獎勵，`pendingTribulation` 解除、經驗恢復累積 |
| 失敗 | `endTribulation(false)` | **視同死亡**：先呼叫 `handlePlayerDeath()` 折壽並使靈寵陣亡（壽元歸零即遊戲結束），再損失 10% 靈石、氣血歸 1、回到安全區；接著 `applyTribulationFailDrop()` **境界跌落並陷入虛弱**（見下方） |

**渡劫失敗的境界懲罰（`config-tribulation.js`）**：
- **跌落**：小境界掉 `TRIBULATION_FAIL_STAGE_DROP`(3) 階（10 階 → 7 階，不低於 1 階，大境界不倒退）、修為歸零、`pendingTribulation` 解除——
  **必須重新修回 10 階才能再次渡劫**。同時扣回這幾階升階時加的屬性（每階四維 -5、魅力 -2），避免「失敗→重升」刷屬性。
- **虛弱**：`player.weakened = true`，`stats.js` 的 `getWeaknessMult()` 讓**物理／術法攻擊、氣血上限、靈力上限 × `WEAKNESS_STAT_MULT`(0.7)**（-30%）。
  `leveling.js` 的 `gainExp()` 在小境界升回 10 階時解除並寫日誌；轉世也會解除。渡劫只能在 10 階發起，所以心魔的戰力／氣血不會吃到虛弱。
  ⚠️ **虛弱解除 ≠ 戰力回到渡劫前**（玩家回報「練回去戰力沒恢復」，2026-09-26）：`getBasePower()` 含修為進度加成，渡劫前是 10 階修為圓滿，
  跌落後修為歸零，剛修回 10 階時攻擊約只有渡劫前的 73%（煉虛實測 7000萬 → 5086萬），要 10 階修為再修滿才回到 100%。
  這是設計如此（玩家選擇不改規則），只在跌落與解除虛弱的日誌加註「戰力要等 10 階修為修滿才會完全恢復」。
- **顯示**：洞府名牌「金丹 7階・虛弱」轉紅（`.hud-realm.weak`，滑鼠移上去有說明）、修仙分頁境界旁「虛弱 -30%」標籤、戰場實況「😵虛弱」；
  渡劫確認視窗也會事先警告這項懲罰。
- ⚠️ 平衡注意：依新修煉節奏（第 26 節），第 8～10 階佔一個境界約一半的修煉時間（(8+9+10)/55 ≈ 49%），
  例如渡劫期失敗約要重修 15 天。若太嚴苛，可調小 `TRIBULATION_FAIL_STAGE_DROP`。

**勝算規則**（`config-tribulation.js` 的 `TRIBULATION_*` 常數）：

| 項目 | 加成 | 條件 |
|---|---|---|
| 基礎 | 60% | 無 |
| 合體期後天劫加劇 | -5% ～ -30% | `realmIndex >= TRIBULATION_HARD_REALM_INDEX`(7 =【合體】，即「合體 → 大乘」起)：每高一境 -5%，最多 -30%（合體 55%、大乘 50%、渡劫 45%、仙人初境 40%、天仙 35%、真仙起 30%）；心魔戰力同步 ×(1 + 扣除量)。由 `getTribulationHardPenalty()` 計算，確認視窗會列出這一項 |
| 丹藥準備 | 最多 +10% | 需開啟【自動補血】；背包氣血丹藥「回復量 × 數量」總和 ÷ 3.0（10 顆九轉還魂丹／30 顆培元丹／60 株凝血草即拿滿） |
| 宗門技能 | 最多 +10% | 目前境界已開放的宗門階段中已學會的比例（築基只開放初級；金丹起開放中級；仙人初境起開放高級） |
| 破障丹 | +10% | 背包有破障丹時，渡劫開打自動服用 1 顆（`config-merit.js`），並讓心魔戰力 ×0.9 |
| 上限 | 80%（服用破障丹時 90%） | `TRIBULATION_MAX_CHANCE` / `BREAK_PILL_MAX_CHANCE`；合體期後的扣除量是先從基礎扣，所以實際可達上限也跟著降低（例：真仙全滿 30+10+10+10 = 60%） |

- 確認視窗在**沒有破障丹**且功德系統開放（`isMeritSystemOpen()`）時會提醒「沒把握？可至千寶閣以七彩補天石購買破障丹」；有破障丹時列出 +10% 並註明服用後剩幾顆。

**為什麼不用純數值平衡**：模擬顯示渡劫結果幾乎由數值決定，勝率曲線非常陡——
調到「無藥約 60%」時，帶滿藥必定 99～100%；且學到越多階段技能越容易（同設定下真仙比築基高約 40 個百分點）。
無法同時做到「基礎 60%、準備後不超過 80%」，因此改成開打前擲骰。
實測每種情境各 1000 場，實際勝率與顯示勝算誤差在 ±3% 內（抽樣誤差），平均 13～17 回合分出勝負。
調整勝算只需改 `TRIBULATION_*` 常數，**不受宗門技能倍率或屬性數值影響**。

## 8. 丹藥與冷卻規則

- 回復量（`config-shop.js` 的 `amount`）：凝血草 5%／培元丹 10%／九轉還魂丹 30%；聚氣散 5%／回天靈液 10%／造化神髓液 30%。
- **使用冷卻**：`POTION_COOLDOWN_SECONDS = 5`。氣血類與靈力類**各自獨立**計時
  （全域變數 `potionCooldownHp` / `potionCooldownMp`，在 `combatTick()` 開頭每秒遞減）。
  手動使用（`bag.js`）與自動輔助（`combat.js`）共用同一組冷卻。
- **分區顯示**：丹藥堂依 `config-shop.js` 的 `shopSections` 分成「氣血丹藥／靈力丹藥」兩區，
  中間以分隔線隔開（`shop.js` 的 `renderShop()` 產生，每區各自一個 `.grid-container`）。
  新增丹藥類型時只要在 `shopSections` 加一筆即可，不必改 `renderShop()`。
  注意 `#shop-list-container` 本身**不可**再掛 `grid-container` class，格線由各分區自己套用。
- **自動購買限制**：`shopItems` 中標記 `noAutoBuy: true` 的丹藥（九轉還魂丹、造化神髓液，
  即兩個類別各自的最高階丹藥）永遠不會被自動輔助花靈石購買；
  但玩家手動買進背包後，自動輔助仍會優先服用它們。
- 自動輔助的選藥邏輯為「背包內回復量最高者 → 否則買得起且未標記 `noAutoBuy` 的回復量最高者」，
  新增丹藥只要加進 `config-shop.js` 就會自動納入，不需改動 `combat.js`。

## 9. 介面慣例（抽屜、批次刪除、神器欄）

- **大量列表的渲染規則（效能）**：僕從（`renderServants`）與背包裝備（`renderBag`）的數量**沒有上限**，
  長期掛機可累積上千筆。這類列表一律先把每張卡片放進陣列、最後 `container.innerHTML = parts.join("")` 一次寫入，
  **禁止在迴圈內寫 `container.innerHTML += ...`**：每次 `+=` 都會把整個列表重新解析一遍，成本隨數量平方成長。
  實測 600 名僕從用 `+=` 會卡住約 12 秒（玩家回報「點開僕從小屋卡住」即此原因），改寫後只要 33 毫秒，3000 名約 0.2 秒。
  固定少量的列表（宗門、地圖、靈寶閣、裝備欄位）不受影響，但新寫的列表請比照同樣做法。
- **數量上限**：僕從 `MAX_SERVANTS`（`config-servants.js`）、背包裝備 `MAX_EQUIP_INVENTORY`（`config-equipment.js`，不含已穿戴）皆為 100。
  - 僕從：`tryRescueServant()` 已滿時不收留（日誌提示），回傳是否真的救出；離線結算只計算真正救出的人數。
  - 背包：`bag.js` 的 `hasEquipInventorySpace()` 已滿時跳提示並回傳 false。**鍛造、千寶閣、靈寶閣裝備、卸下裝備**
    都在扣靈石／聲望「之前」檢查。穿戴裝備是一換一，不受影響。**日後新增任何會把裝備放進背包的功能，都要先呼叫它。**
  - 舊存檔已超過上限的不會被刪除，只是要先解僱／刪除到上限以下才能再增加。
  - 僕從小屋與背包頂端顯示「目前數量 / 上限」，滿了轉為提示文字。
- **僕從 id**：`tryRescueServant()` 產生 `時間戳_8 碼隨機英數`。離線結算會在同一毫秒內救出多名僕從，
  舊版只用 0～999 的隨機數，id 可能重複，重複時解僱一名會連帶刪掉另一名。

- **技能面板位置**（2026-09-25 改）：修仙分頁「🛡️ 角色裝備與狀態」下方只放一顆「⚔️ 當前可用技能」按鈕，**點擊才彈出** `#skill-modal`（`ui.js` 的 `openSkillModal()`）。
  清單 `#skill-list` 搬進彈窗內，內容仍由 `renderSkillList()` 以 `getElementById` 填入（`updateUI()` 每秒照常重繪），只要保留 `id="skill-list"`。
- **抽屜式區塊**：`ui.js` 的 `toggleDrawer(id, btn)` 切換 `.drawer-body.open`。
  「命運與系統」（2026-09-25 起是獨立彈窗 `#system-modal`，由手機洞府丹藥堂上方的齒輪或設定視窗內的按鈕開啟，見第 31 節）拆成【存檔管理】與【命運抉擇】兩個抽屜，兩者**預設收合**，
  用意是把「轉世輪迴／完全重置」與日常存檔操作隔開，避免誤觸。
  藏書閣視窗內也用同一套抽屜：「第一階段・四維古籍」(`#drawer-library-1`) 與「第二階段・屬性秘典」(`#drawer-library-2`)，
  兩者**預設收合**，點選才展開可學習的秘笈；按鈕樣式為 `.library-drawer-toggle`。關閉視窗再開啟會維持上次的展開狀態。
- **依品級批次刪除**：`ui.js` 的 `renderBulkDeleteBar()` 產生共用工具列，
  搭配 `getCheckedBulkQualities()` / `toggleAllBulkQualities()`。目前兩處使用：
  - 背包裝備 → `bag.js` 的 `bulkDeleteEquipment()`（品級取自 `equipQualities`，**只刪背包內、不動已穿戴與鎖定的**；勾選框旁的數量不含鎖定）
  - 僕從小屋 → `servant.js` 的 `bulkDismissServants()`（品級取自 `servantQualities`，會一併中止其任務；**略過鎖定的僕從**，勾選框旁的數量不含鎖定）
- **僕從鎖定**（2026-09-28）：僕從物件的 `s.locked`（true = 鎖定，隨存檔保存，舊存檔沒有此欄位 = 未鎖定，不需 migrate）。
  僕從卡片有「🔓 鎖定／🔒 已鎖定」按鈕 → `toggleServantLock(id)`，名稱後加 🔒。鎖定中「解僱僕從」按鈕為 disabled，
  `dismissServant()` 開頭也會擋下（跳提示）；`bulkDismissServants()` 只解僱未鎖定的，確認視窗與日誌會註明略過幾名。
  鎖定不影響指派任務。**日後新增任何會移除僕從的功能，都要略過 `s.locked` 的僕從。**
- **裝備鎖定**（2026-09-26）：裝備物件的 `eq.locked`（true = 鎖定，隨裝備存檔，舊裝備沒有此欄位 = 未鎖定）。
  背包、暫存區、角色裝備視窗的每張卡片都有 `formatLockButton(eq)` 產生的「🔓 鎖定／🔒 已鎖定」按鈕 → `toggleEquipLock(id)`（用 `locateEquip` 找三處）；
  `formatEquipTitle()` 在名稱後加 🔒。穿戴、卸下、強化、進化不受鎖定影響，鎖定狀態跟著裝備走。
  **不能刪除的規則**（鎖定中＋穿戴中）集中在 `bag.js` 的 `canRemoveEquip(loc)`：`deleteEquipFromInventory`、`decomposeEquip`、`deleteStashEquip` 開頭都先呼叫；
  一鍵刪除／一鍵分解則在篩選時用 `isEquipLocked()` 略過。鎖定時卡片上的分解／毀棄按鈕為 disabled。
  **日後新增任何會移除玩家裝備的功能（出售、獻祭、合成材料…），都要先過 `canRemoveEquip()` 或略過 `isEquipLocked()` 的裝備。**
- **神器欄位**：`equipTypes` 新增 `"神器": "artifact"`。三個相關注意事項：
  1. `NON_FORGEABLE_SLOTS` 讓鍛造閣選單排除神器（神器只能在靈寶閣高級宗門兌換，見第 18 節）。
  2. `getElementCounts()` 會**濾掉 artifact 分類**再統計，神器不影響靈根判定。
  3. `save.js` 的 `migrateEquipmentSlots()` 會替舊存檔補上新欄位，並移除 `equipTypes` 以外的部位
     （舊版「降魔伏虎杖」的部位「杖」不存在，會干擾靈根判定；穿著中的裝備退回背包）。
     **日後再新增部位時，這三處都要一併確認。**（靈根說明視窗的部位數量是依 `equipTypes` 自動計算，不必改）
- **靈根說明（「!」按鈕）**：角色裝備視窗標題旁的 `.info-btn` 呼叫 `equipment.js` 的 `openWuxingInfo()`，
  開啟 `#wuxing-info-modal`（點背景或「知道了」關閉）。內容包含：激活條件、目前靈根、五行相剋、
  各屬性穿戴進度與套數、單屬性／純化／雙屬性／聖靈根對照表、湊裝方式（靈寶閣固定屬性裝備自動從 `lingbaoShopItems` 列出）。
  裝備視窗頂端的 `#wuxing-status-modal` 與說明視窗共用 `formatSpiritRoots()`。
  ※ 土靈根舊標籤寫「防禦 +20%」，但遊戲沒有防禦屬性，實際是總體質 ×1.2，已更正為「體質 +20%」。
- **批次操作（×1 / ×10 / 最高）**：藏書閣、煉丹房、鍛造閣、宗門靈田的每個動作都有三顆按鈕（`.batch-btns`）。
  各功能先算出「目前資源與上限允許的最多次數」，再交給 `ui.js` 的 `resolveBatchCount(qty, 可執行次數, 動作名)`：
  - `'max'`：直接執行最多次數。
  - `×10` 不足 10 次時**不做部分執行**，跳提示並建議改按「最高」。
  - 一次結算、只寫一筆日誌，每日任務進度用 `addDailyProgress(type, n)` 一次加 n。
  - 各功能的上限：藏書閣受每本 100 次上限（第二階段屬性秘典每本 1000 次，且同時受武學積分／靈草／靈石限制）；煉丹房的魅力丹同時受仙品靈草與靈石限制；
    鍛造閣受靈石與**背包空位**（100 件）限制，連續開爐的日誌會統計品質與五行分布。
  - 配方集中在各檔案頂端：`herbRecipes`(field.js)、`pillRecipes`(alchemy.js)、`STUDY_*`(library.js)、`FORGE_COST`(config-equipment.js，每次 10,000 靈石)。

## 10. 活動系統（每日任務 / 千寶閣 / 待實作項目）

所有活動集中在**任務分頁**（手機洞府左側「任務」按鈕進入，2026-09-25 從世界分頁移過來，見第 31 節）的「活動」區 `#activity-list`，按鈕由 `activity.js` 的 `renderActivityList()` 依
`config-activities.js` 產生，並在 `updateUI()` 內每秒重繪，因此解鎖狀態會即時反映聲望與境界變化。

| 活動 | 聲望門檻 | 境界門檻 | 狀態 |
|---|---|---|---|
| 每日任務 | 1,000 | 無 | ✅ 已實作（每 4 小時刷新 10 項） |
| 千寶閣（拍賣場） | 5,000 | 無 | ✅ 已實作（每 3 小時刷新 5 件） |
| 秘境 | 5,000 | 煉虛 | ✅ 入口已開放（秘境列表＋鎮魔塔場景，第 43 節）；塔內玩法 ⏳ 敬請期待 |
| 獵殺邪修 | 8,000 | 金丹 | ✅ 已開放（2026-09-25）：懸賞榜每 4 小時刷新 6 名＋野外修士＋善惡值（第 27、36 節） |
| 域外天魔（世界BOSS） | 10,000 | 大乘 | ⏳ 敬請期待 |

- **解鎖判定**一律走 `getActivityLockReason()`，未達標會說明缺什麼；
  `implemented: false` 的活動即使達標也只顯示「敬請期待」。
  **新增活動時只要在 `config-activities.js` 加一筆**，按鈕與把關都會自動生效。
- **刷新機制**：兩者都用「下次刷新時間戳」判斷（`dailyRefreshAt` / `auctionRefreshAt`），
  開啟面板時呼叫 `refreshDailyQuestsIfDue()` / `refreshAuctionIfDue()`。
  時間戳存進存檔，所以關掉網頁再回來，倒數仍然正確（不是以「開啟次數」計算）。
- **時間軸保護（2026-09-28）**：存檔轉移到時鐘不同的裝置、或系統時間被調過時，下次刷新時間戳可能遠在未來（倒數出現幾百小時）。
  千寶閣、懸賞榜、每日任務的 `refresh*IfDue()` 開頭一律先呼叫 `ui.js` 的 `clampRefreshAt(at, 週期時數)`：
  超過「現在 + 一個週期」就壓回，非數字（壞存檔）視為 0 = 立即刷新。**新增有定時刷新的功能時也要套用。**
- **付費立即刷新（2026-09-28）**：千寶閣與懸賞榜（殺手殿堂）各有「🔄 立即刷新」按鈕，
  每次 10 萬靈石（`AUCTION_PAID_REFRESH_COST`／`BOUNTY_PAID_REFRESH_COST`）、每日各 5 次（`*_PAID_REFRESH_DAILY`，兩邊分開計）。
  - 共用函式在 `activity.js`：`getPaidRefreshState`/`getPaidRefreshLeft`/`payForRefresh`/`renderPaidRefreshButton`；
    次數存 `player.paidRefresh = { date, auction, bounty }`，以**當地日期字串**（`toDateString`）換日，不用時間戳，存檔轉移不會錯亂。
  - `paidRefreshAuction()`（auction.js）：搶拍視窗開著時不能刷新（看 `#auction-bid-modal` 是否顯示；
    ⚠️ 不能用 `auctionBidItemId` 判斷，它在搶拍結束後不會清空——2026-09-28 曾因此造成「搶拍過一次後永遠無法付費刷新」）。`paidRefreshBounty()`（bounty.js）：對決中不能刷新；追蹤中的懸賞會先 `confirm`，刷新後取消。
  - 付費刷新**不改變定時刷新的時間軸**：刷新前記下 `*RefreshAt`，刷新後還原（下次定時刷新照舊）。
- **每日任務進度**：任務池剛好 10 項且每次全用上，各自隨機難度（普通/困難/艱鉅）。
  進度靠各功能呼叫 `addDailyProgress(type, n)` 累加，目前已接上的埋點：
  `kill`(combat.js 擊殺)、`sectQuest`(combat.js 玩家任務 + servant.js 僕從任務)、
  `potion`(bag.js 手動服用 + combat.js 自動補給)、`forge`(equipment.js)、`plant`(field.js)、
  `study`(library.js)、`craft`(alchemy.js)、`rescue`(combat.js)、`buy`(shop.js)、
  `breakthrough`(leveling.js 小境界升階)。
  **新增任務類型時，務必到對應功能補上 `addDailyProgress()`，否則進度永遠是 0。**
- **千寶閣商品**：每個欄位由 `rollAuctionItem()` 先依 `auctionLifePills` 判定是否上架壽元丹，
  沒抽中才交給 `rollAuctionEquip()` 依 `auctionQualityOdds` 抽裝備品質；
  神器不在拍賣場流通（沿用 `NON_FORGEABLE_SLOTS`），套裝部件也不賣（拍賣清單本來就沒有，程式另有防呆重抽）。
- **千寶閣裝備等級**（2026-09-27）：「當前檔」= `EQUIP_LEVELS` 中不超過人物等級的最高檔（最低 10）；70% 賣當前檔、`AUCTION_GEAR_PREV_TIER_CHANCE`(30%) 賣前一檔。
  四維改與鍛造／奪寶同公式 `等級 × EQUIP_LEVEL_STAT_MULT(5) × 品質倍率`（拍賣屬外界管道再 ×1.15），裝備帶 `level`（卡片顯示 Lv.，穿戴需人物等級 ≥ 裝備等級）。
  原本四維只看境界 `(境界+1) × 10 × 品質倍率`、沒有等級，中期以後比同時期掉落弱約 35 倍。售價公式不變：`800 × 品質倍率 × (境界+1)`。
  實測 Lv.520：4000 件中 Lv.500 70%／Lv.400 30%。
- **低等白金**（2026-09-27）：每個裝備欄位 `AUCTION_PLATINUM_CHANCE`(5%) 改賣白金（先天道器），等級 = 當前檔往下 `AUCTION_PLATINUM_TIERS_BELOW`(2) 檔（Lv.520 → Lv.300），
  固定 `AUCTION_PLATINUM_PRICE` 1 億靈石、不會被搶拍（`AUCTION_RIVAL_CHANCE` 沒有白金）；比照橙裝進化而來的白金也有 1～3 孔。卡片有「✨ 千寶閣鎮閣之寶」標示與白色光暈。
- **天磯錄**：千寶閣商品上架時**不再**記入收藏（`createGearEquip` 第 5 個參數 `noRecord`），買下時 `completeAuctionPurchase` 才 `recordGearCollected`＋`checkTitleUnlocks`。
  原本上架就算收藏（刷新千寶閣就能刷收藏），開賣白金後會影響白金收藏稱號，一併修正。
- **壽元丹**（`config-daily-quests.js` 的 `auctionLifePills`）：商品物件帶 `kind: "lifePill"`，
  需**同時**支付靈石與聲望，標下後立即服用增加壽元（不進背包）。舊存檔的裝備商品沒有 `kind`，一律當裝備處理。

  | 壽元丹 | 品質 | 續命 | 每欄上架機率 | 靈石 | 聲望 |
  |---|---|---|---|---|---|
  | 普通壽元丹 | 白色 | +10 年 | 10% | 100,000 | 50 |
  | 一紋壽元丹 | 綠色 | +20 年 | 8% | 200,000 | 50 |
  | 二紋壽元丹 | 藍色 | +30 年 | 5% | 500,000 | 50 |
  | 三紋壽元丹 | 紫色 | +50 年 | 3% | 1,000,000 | 50 |
  | 四紋壽元丹 | 橙色 | +100 年 | 1% | 10,000,000 | 200 |

  （2026-09-25 調價：靈石大幅提高、聲望大幅降低。價格在上架時寫進商品的 `price`/`repPrice`，**已上架的舊商品維持舊價，下次刷新才套用新價**。）

  合計每欄 27% 為壽元丹；沒抽中時再以 5% 上架星允鐵袋（約 3.7%），其餘約 69% 為裝備（2026-09-26 起從「拍賣」清單抽，見第 37 節）。

- **搶拍**（2026-09-25，`auction.js`，設定在 `config-daily-quests.js`）：紫色／橙色的商品（裝備或壽元丹）第一次按「標下」時，
  依 `AUCTION_RIVAL_CHANCE`（紫 30%、橙 50%）擲一次是否有其他客人競拍。結果存進商品 `item.rival = { name, max, out }`（沒有對手則為 `null`），
  **重新整理、關閉視窗都不會重擲**（無法用重開來躲對手）。
  - 有對手時，對手先出價「底價 +10%」，開啟 `#auction-bid-modal`；競價紀錄存在 `item.bid = { current, leader, history }`。
  - 玩家按「加價 10%／30%」（`raiseAuctionBid(step)`，以**底價**為基準計算加價幅度），出價前會檢查付不付得起。
    對手的隱藏心理價位 `max` = 底價 × 1.1～2.0（`AUCTION_RIVAL_MAX_MULT_MIN/MAX`）：跟價後仍在心理價位內就跟（固定 +10%），否則退出，玩家以最後出價得標（`completeAuctionPurchase`）。
  - 「放棄」（`giveUpAuctionBid`）：商品標記 `sold` 並記錄 `soldTo`，卡片顯示「已被 X 標走」。「暫時離開」只關視窗，卡片會顯示「⚔️ 競拍中」，可再按「繼續競拍」。
  - 壽元丹的**聲望價格不隨競價增加**，只有靈石會被抬高。白／綠／藍品質沒有搶拍。

## 11. 遊戲主頁（標題畫面）

- 畫面結構在 `index.html` 的 `#title-screen`，樣式集中在 `<style>` 內同名的區塊，邏輯在 `data/title-screen.js`。
- **滿版呈現**：封面 `#title-art` 使用 `position: absolute; inset: 0` + `object-fit: cover`，
  一定填滿整個視窗，不會有任何未覆蓋區域。
- **橫式／直式兩張封面**：用 `<picture>` + `media="(max-aspect-ratio: 3/4)"` 自動切換，
  直式螢幕（手機）載入 `images/cover-portrait.jpg`，其餘載入 `images/cover.jpg`。
  直式版的構圖原則（重製時請遵守）：
  **人物與場景一律 1:1 原比例貼上，絕不垂直拉伸**（拉伸會產生明顯的模糊色帶，很難看）。
  作法是把原圖裁成 960 寬（保留人物＋標題＋光環）後原尺寸貼在下半部，
  上方天空改用漸層色（由深藍過渡到原圖天空色），再從原圖裁出飛禽靈獸等比縮放、
  橢圓羽化後貼上點綴，愈高處愈淡以模擬空氣遠近感；底部僅做一小段漸層收進遊戲底色。
  ※ 裁切素材時務必避開標題文字與光環所在區域，否則天空會出現文字殘影。
  產生腳本保留在對話紀錄中（使用 .NET System.Drawing），重製時可依上述規則重寫。
- **唯一進入點**：畫面中央光環上的透明按鈕 `#title-hotspot`，除此之外沒有其他按鈕或提示文字。
- **熱區如何對準光環**：因為 `cover` 會裁切，無法用固定百分比對齊，
  改由 `positionTitleHotspot()` 依 cover 縮放公式即時計算：
  `scale = max(容器寬/圖片寬, 容器高/圖片高)`，再加上置中裁切的位移量，
  把「該圖原始座標」換算成螢幕像素。兩張圖各有一組座標：

  | 圖片 | 尺寸 | 光環座標 (x, y, w, h) |
  |---|---|---|
  | `cover.jpg` | 1264 × 843 | 652, 527, 330, 290 |
  | `cover-portrait.jpg` | 960 × 1920 | 632, 1427, 330, 290 |

  `currentTitleHotspot()` 依 `img.currentSrc` 判斷目前載入哪張圖來選用對應座標；
  `positionTitleHotspot()` 會在圖片 `load`、`resize`、`orientationchange` 時重算
  （`<picture>` 切換來源時也會觸發 `load`，所以跨斷點縮放會自動校正）。
  ※ 若日後更換封面圖，只需重新量測光環座標並改 `TITLE_HOTSPOTS`，其餘不必動。
- **啟動時機**：`window.onload` 只呼叫 `initTitleScreen()`，**不會**直接開始遊戲。
  讀檔、性別選擇、離線收益結算全部延後到玩家點擊後才執行（`main.js` 的 `startGame()`）。
- **第一次進入（沒有存檔）**：顯示 `#gender-modal` 性別選擇視窗（男修／女修，含頭像與預設道號），
  **沒有關閉按鈕**，必須選一個才會 `initGame()` 開始遊戲；選完立即存檔，之後進入不會再問。
  以前用 `prompt()` 讓玩家輸入 1/2，按取消或瀏覽器擋掉對話框都會直接變成男性，因此改成視窗。
  頭像與預設道號來自 `ui.js` 的 `PLAYER_AVATARS`。`gameStarted` 旗標防止連點重複啟動主迴圈。
- `<body>` 出廠時就帶著 `class="title-mode"`（CSS 會隱藏 `#game-container` 並鎖住捲動），
  避免遊戲畫面在 JS 執行前閃一下；`enterWorld()` 會移除這個 class。
- `worldEntered` 旗標確保只會觸發一次（避免重複建立 `setInterval`）。

## 12. 門派任務與僕從派遣

任務的**名稱、圖示、獎勵**全部集中在 `config-quests.js` 的 `questData`（以宗門等級 1/2/3 分層）。
任務面板顯示的獎勵與實際發放的獎勵讀取同一份資料，**改數值只需要改這一個檔案**。

| 角色 | 執行條件 | 進度速度 | 結算位置 |
|---|---|---|---|
| 玩家本人 | 必須待在「宗門」（`isInSect()`），離開即自動中斷 | 每秒 `QUEST_PROGRESS_PER_TICK`(1.5) | `combat.js` 的 `combatTick()` |
| 每位僕從 | 在「僕從小屋」各自指派任務，**不受玩家所在地點限制**；每趟依品質付靈石 | 每秒 `1.5 × 該僕從的 mult`（固定耗時任務不乘） | `servant.js` 的 `tickServantQuests()` |

- 僕從資料結構：`{ id, name, quality, mult, quest, timer }`；`quest` 是任務代號（或 `null` 表示閒置），
  `timer` 是該僕從自己的進度，因此多名僕從可同時跑**不同**任務、互不干擾。
- 同時派遣上限為 `MAX_ASSIGNED_SERVANTS`(10，2026-09-24 由 3 調高)；僅在「從閒置變成接任務」時檢查，單純更換任務不受限。
- 完成一次任務所需時間 = `QUEST_REQUIRED_PROGRESS / QUEST_PROGRESS_PER_TICK` = 20 秒（僕從再除以效率 `mult`）
  （舊版 UI 寫「基礎30秒」是錯的，實際是 20 秒；現在由程式自動算出顯示）。
  有 `duration` 的任務為**固定秒數、不受僕從效率影響**（`getQuestRequiredProgress()`/`getQuestSpeed()`）。
- **任務獎勵（只給道具）**：宗門任務不給靈石，唯一例外是初級宗門「打掃清潔」給 50 靈石。

  | 任務 | 初級 | 中級 | 高級 |
  |---|---|---|---|
  | 打掃／餵養 | 50 靈石 | 10 獸丹 | 50 獸丹 |
  | 種植靈草 | 1 靈草 | 10 靈草 | 50 靈草 |
  | 整理武學秘典 | 1 武學積分 | 10 武學積分 | 50 武學積分 |
  | ⛏️ 礦脈採礦 | — | 1~30 礦石 | 1~30 礦石 |

- **礦脈採礦**（`questData.mine`）：只有中級、高級宗門有；`requiredQuality: "傳說"` → **只有傳說僕從能接**，
  玩家本人不能親自執行（任務面板按鈕顯示「僅限傳說僕從」），其他品質僕從的選單不會出現此任務；
  `duration: 60` 固定 60 秒一趟；每趟隨機 1~30 礦石（`player.ore`，角色資源列顯示）。礦石用於符寶坊煉製符寶（第 28 節）。
  換到沒有此任務的宗門（或品質不符）時，`tickServantQuests()` 會讓僕從自動回到閒置；玩家的 `activeQuest` 同理由 `combatTick()` 中止。
- **派遣花費**（`config-servants.js` 的 `SERVANT_TRIP_COST`）：每趟任務**開始時**依僕從品質扣靈石——
  一般（白）50／優秀（綠）100／稀有（藍）150／史詩（紫）200（需求未指定，暫定）／傳說（橙）300。
  指派（或換任務）時先付第一趟，付不起就無法指派；每趟完成後自動付下一趟，付不起則該僕從停工回到閒置並寫日誌。
  玩家親自執行不需付費。
- 新增任務只要在 `questData` 加一筆；獎勵值可寫 `[最小, 最大]` 表示隨機，`grantQuestRewards()` 會回傳實際獲得的文字供日誌使用。
- **舊存檔相容**：早期版本使用「單一 `activeQuest` + `assignedServantIds` 共同加速」，
  `save.js` 的 `migrateServantAssignments()` 會在讀檔/匯入時把舊結構轉成每位僕從自帶 `quest`/`timer`，
  並移除 `assignedServantIds`。

## 13. 宗門技能（分階段學習、永久保留）

- 宗門分三個階段，對應 `sectData` 每個分類的 `tier`：凡俗 1（初級）/ 修真 2（中級）/ 至高 3（高級）。
- **每個階段只能拜入一個宗門**：`player.sectSkills = { 1, 2, 3 }` 記錄各階段選定的宗門名稱，
  第一次加入時會跳確認並鎖定；之後同階段的其他宗門按鈕會被停用。
- **境界只擋下限，不擋上限**：新拜入時只檢查 `player.realmIndex >= cat.minRealm`，
  **超過 `maxRealm` 仍可補拜入該階段尚未選擇的宗門**（例：金丹前沒加入任何宗門，金丹後仍可回頭挑一個初級宗門，
  否則該階段的 2 招技能就永遠拿不到了）。`cat.maxRealm` 現在只是分類說明用，不再封鎖加入。
  拜入後一律鎖定，**無法退出、也無法改投同階段的其他宗門**。
- **已選定的宗門永遠可以回歸**（`sect.js` 的 `joinSect()`）：**境界檢查只套用在「新拜入」**。
  ⚠️ 舊版把境界檢查寫在最前面，導致境界一旦超過該階段的 `maxRealm`（例：凡俗宗門 `maxRealm: 3`），
  連按自己的宗門都會跳「境界不符合」，晉升並拜入下一階段後就再也回不去舊宗門（玩家回報「加入宗門後就離開宗門了」即此）。
  現在判定順序是：**是不是自己已選定的宗門 → 該階段是否已選別家 → 境界是否達 `minRealm` → 確認並鎖定**。
  宗門列表的按鈕也照這個順序顯示「當前宗門／回歸宗門／此階段已選定【X】／境界不符」，並在頂端列出各階段已選宗門與目前所屬。
- 切換所屬宗門**只改變經驗/戰力倍率與設施歸屬，技能不會消失**，所以可以視情況在已選定的宗門之間來回切換。
- **技能永久保留**：戰鬥用的技能由 `stats.js` 的 `getAllSkills()` 依 `sectSkills` 組合（初級→高級）
  再加上靈寶閣的 `learnedSkills`，**不再讀 `player.sect.skills`**。因此換到下一階段宗門時，舊技能仍在，
  最終可同時擁有 3 個門派共 6 招技能。`player.sect` 只決定目前的經驗/戰力倍率與設施權限。
  ※「永久」指同一世內；**轉世輪迴會清空 `sect` 與 `sectSkills`**，下一世可重新選擇各階段宗門（第 25 節）。
- **傷害公式**：技能傷害 = 對應攻擊力 × `mult`，`mult = 1 + SECT_SKILL_BONUS[tier]`
  （初級 150% / 中級 200% / 高級 300%）。`dmgType: "phys"` 用物理攻擊（受**力量**影響），
  `"mag"` 用法術攻擊（受**悟性**影響）。每個宗門各有 1 招力量型、1 招悟性型；全部都是傷害技（單體或群體）。
  **傷害若過高，只需調整 `config-sects.js` 的 `SECT_SKILL_BONUS`**，所有宗門技能會一起生效。
- **數值依據**：+50/100/200% 是在「渡劫仍由戰鬥決定」時，依模擬選出的第一次渡劫約 65% 的數值
  （+10/20/50% 只有 14～18%）。渡劫改成勝算擲骰後（第 7 節），技能倍率只影響野外戰鬥：
  技能觸發率 40%，單體平均輸出比普攻高約 20%／40%／80%，不會出現異常爆量。
- `mult`/`tier` 是在 `config-sects.js` 尾端用迴圈補上的，新增宗門技能時不要手寫 `mult`。
- **耗魔（`mpCost`）已全面調為原本的 3 倍**（宗門技能與靈寶閣武學皆然）：
  初級宗門 45～90、中級 105～150、高級 180～300；靈寶閣武學初級 90～120、中級 180、高級 300～360。
  宗門技能每次都從 `sectData` 讀取，改 `config-sects.js` 即時生效；靈寶閣武學見第 18 節的同步說明。
  靈力不足時該回合自動改為普通攻擊（`combat.js` 的 `playerAttackTurn()`）。
- 舊存檔的 `player.sect` 是整包存進去的舊物件（含舊技能），`migrateProgressionFields()` 會用
  `findSectByName()` 改指向最新設定，並把該宗門登記進 `sectSkills` 對應階段。
- ⚠️ 靈寶閣禁術不受上述倍率限制：《大羅天經》群體 ×5.0、《神魔九變》攻擊 ×4.0 持續 3 回合，
  遠高於宗門高級技能的 ×1.5，若要全面控制傷害需另外調整 `config-lingbao.js`。

## 14. 人物等級

- 與境界是**兩條獨立的成長線**：`player.level`（1～`MAX_PLAYER_LEVEL` 10000）與 `player.levelExp`。
  `gainExp()` 算出最終經驗（含宗門與靈寵倍率）後，會同時餵給 `gainLevelExp()` 與 `gainBeastExp()`，
  **待渡劫時境界修為暫停，但人物等級與靈寵等級仍繼續成長**。
- 每升 1 級：力量/體質/悟性/靈力各 +1（直接加進 `player.stats`），
  生命上限 +10、靈力上限 +5（在 `getMaxHp()`/`getMaxMp()` 以 `(level-1) × 10 / × 5` 計算，不寫入 stats）。
  ※ 體質/靈力 +1 本身也會讓生命 +10 / 靈力 +10，所以實際每級是生命 +20、靈力 +15。
- 升級不會補滿氣血（避免戰鬥中連續升級變相無敵）。
- 經驗曲線（`config-level.js` 的 `LEVEL_EXP_SEGMENTS`）：每級所需 = 係數 × 等級^1.5

  | 等級區間 | 係數 | 累積到區間末的總經驗 |
  |---|---|---|
  | Lv1～99 | 100 | 約 400 萬（Lv100） |
  | Lv100～999 | 300 | 約 38 億（Lv1000） |
  | Lv1000～4999 | 1000 | 約 6,980 億（Lv5000） |
  | Lv5000～10000 | 3000 | 約 10.6 兆（Lv10000） |

  以擊殺經驗估算：天南（每殺約 4,500）約可練到 Lv100 附近；禁區可推到數千級；
  Lv10000 需在最高戰場（每殺約 500 萬）長期掛機。
- 等級與壽元、戰力無掛鉤（戰力不影響壽元）。轉世輪迴會把人物等級**重置為 Lv1**（見第 25 節）。

## 15. 壽元

- `player.lifespan`（年），數值表在 `config-lifespan.js` 的 `lifespanByRealm`（索引對應 `realms`）。
  凡人初始 60 年；`advanceRealm()` 晉升時呼叫 `gainRealmLifespan()` 加上該境界的 `gain`
  （包含築基以前不需渡劫的自動突破）。
- 壽元會因兩件事減少：**歲月流逝**（有底線，見下方）與**死亡**。與戰力無關。
  死亡點：`combat.js` 野外戰死、`tribulation.js` 渡劫失敗，皆呼叫 `handlePlayerDeath()`：依**當前境界**的 `deathCost` 折壽，並讓所有靈寵陣亡。
- **歲月流逝（方案一＋三混合）**：`combatTick()` 每秒呼叫 `ageLifespan(1)`；離線結算呼叫 `ageLifespan(離線秒數, LIFESPAN_OFFLINE_RATE)`。
  - 每分鐘流逝 = 目前境界的 `gain` ÷（`getAgingHours()` × 60）× 所在地倍率。
    `getAgingHours(境界)` = max(`LIFESPAN_MIN_AGING_HOURS` 6, 修煉時數 × `LIFESPAN_PACE_MULT` 5 × 主要地圖的所在地倍率)，
    修煉時數與主要地圖取自 `config-realms.js` 的 `realmPacing`（第 26 節）。
    → **在該境界的主要地圖掛機，一個境界給的壽元約可撐「修滿該境界所需時間」的 5 倍**；前期（凡人）至少維持安全區 6 小時。
    改修煉時數時壽元會自動跟著對齊，不需另外調整。
  - 所在地倍率 `LIFESPAN_DANGER_MULT`：安全區 ×1、野外 ×1.5、開放世界 ×2、上古禁區 ×3、幽冥禁域 ×3、至高戰場 ×4（索引 0～5）；渡劫中 ×4。離線 ×0.5（倍率依離線時所在地）。

    | 境界 | 主要地圖 | 修滿約需 | 壽元在主要地圖可撐 | 底線 |
    |---|---|---|---|---|
    | 凡人 | 靈山大川 | 0.5 時 | 4 時（下限 6 時×安全區） | 3 年 |
    | 金丹 | 上古遺跡 | 3 時 | 15 時 | 15 年 |
    | 化神 | 亂星海 | 10 時 | 50 時 | 15 年 |
    | 渡劫 | 鬼谷八荒 | 30 天 | 150 天 | 30 年 |
    | 大羅金仙 | 仙界戰場 | 200 天 | 1,000 天 | 150 年 |

  - 後期流逝很慢（每分鐘不到 0.1 年），`#lifespan-rate` 會自動改以「年/時」顯示。
- **年齡（當前壽命）**：`player.age`，新角色與轉世後從 `LIFESPAN_START_AGE`(16) 歲起算，`ageLifespan()` 依**實際流逝的年數**同步增加，
  `handlePlayerDeath()` 的死亡折壽也同樣加進年齡（重傷折壽 = 老了 N 歲）。
  因此恆成立：**年齡 = 16 + 累計損失的壽元（流逝＋折壽）**；觸底歲月停止時年齡也停住，突破境界或壽元丹增加壽元不影響年齡。舊存檔沒有此欄位，由 `DEFAULT_PLAYER_JSON` 補 16 歲。
  頂部狀態列在剩餘壽元前顯示「當前壽命：X 歲」（`#age-display`）。
  - **底線** `getLifespanFloor()` = 目前境界 `deathCost × LIFESPAN_FLOOR_DEATHS(3)`：剩餘壽元觸底後自然流逝**完全停止**（線上、離線都一樣）。
    **時間永遠不會直接害死玩家**，只有死亡會；但觸底後再死 3 次就身死道消，形成「越接近底線越不敢冒險」的緊張感。
  - 提示（`checkLifespanWarnings()`，各只出現一次，壽元回升後重置）：剩餘 ≤ 底線×2 時「壽元日漸枯竭」；觸底時「壽元將盡，再死亡 3 次便身死道消」。
  - 壽元可能帶小數，所有顯示一律經 `formatLifespan()` 取整數。
  - 恢復方式：突破境界（加上新境界的 `gain`，底線也會跟著新境界調整）或千寶閣壽元丹。
  - ⚠️ 平衡注意：壽元丹是固定年數（+10～+100 年），後期境界的 `gain` 以萬年計，效果相對有限。
    若後期玩家常卡在底線，可考慮讓壽元丹改為「目前境界 gain 的百分比」。
- **壽元歸零 → `triggerLifespanGameOver()`**：設 `gameOver = true`（`combatTick()` 停止、`saveLocal()` 不再寫入）、
  刪除 `localStorage` 存檔、跳出提示後重新整理，回到標題畫面以新角色開始。
- 需求表的「仙王／仙帝」在遊戲中不存在，對應方式：大羅金仙＝仙王（+20000 / -50）、混元大羅金仙＝仙帝（+50000 / -100）；
  需求表沒有的境界補值：仙人初境 +4000 / -15、天仙 +4500 / -15、混沌道祖 +100000 / -200。
- 轉世輪迴時壽元重設為凡人的 60 年。舊存檔沒有壽元欄位時，依目前境界補上累積值（`getInitialLifespanForRealm()`）。
- 頂部狀態列 `#lifespan-display` 顯示剩餘壽元（綠 → 剩餘 ≤ 底線×2 轉黃 → 觸底轉紅），
  旁邊的 `#lifespan-rate` 顯示目前流逝速度（例「⌛-2.1年/分」，在野外轉橘色；觸底顯示「（歲月已止）」）；
  滑鼠移上去顯示本境界的折壽量與底線。

## 16. 靈寵（靈獸園）

- 兌換費用（`config-beasts.js`，靈石仍套用魅力折扣）：靈幻狐 1000 獸丹 + 10000 靈石、
  青蒼狼 3000 + 30000、九幽蛟龍 5000 + 50000。被動加成（經驗/戰力）只在靈寵**出戰中**（存活且未召回休息）時生效（`hasLiveBeast()` → `isBeastActive()`）。
- 資料結構：`player.beasts = [{ id, level, exp, alive, active, upkeepTimer, skills }]`，`skills` 為 6 格、存放已選的五行屬性（或 `null`）。
  舊存檔的字串陣列（`['fox', ...]`）由 `migrateProgressionFields()` 轉成 Lv1 靈寵；缺 `active`/`upkeepTimer` 的補成出戰中、計時 0。
- **維持費（出戰／休息）**：每隻出戰中的靈寵各自計時（`b.upkeepTimer`，隨存檔保存），每滿 `BEAST_UPKEEP_INTERVAL`(600 秒＝10 分鐘；2026-09-24 由 60 秒調整) 扣一次，
  費用依**該靈寵的等級**查 `beastUpkeepTiers`：

  | 靈寵等級 | 每 600 秒 |
  |---|---|
  | Lv1～99 | 2,000 靈石＋50 獸丹 |
  | Lv100～299 | 5,000 靈石＋100 獸丹 |
  | Lv300～499 | 20,000 靈石＋150 獸丹 |
  | Lv500 以上 | 50,000 靈石＋200 獸丹 |

  - 線上：`combat.js` 的 `combatTick()` 每秒呼叫 `tickBeastUpkeep()`（在渡劫接管之前，所以渡劫中也計費）。
    付不起（靈石或獸丹任一不足）→ `restBeastForUpkeep()` 自動召回休息並寫日誌，不會部分扣款。
  - 離線／背景補發：`settleIdleSeconds()` 結尾呼叫 `settleOfflineBeastUpkeep(秒數)`，在離線靈石入帳後逐次扣，付不起就從那一刻召回；
    離線經驗加成以離線**開始時**的出戰狀態計算（簡化）。
  - 靈獸園可手動「召回休息／出戰」（`toggleBeastActive()`）；休息中不收費、不給被動、不出手、不累積經驗。
    計時存在靈寵身上，召回只是暫停，再出戰時接續，**反覆切換無法躲費用**。出戰前會檢查付得起一次費用。
  - 陣亡的靈寵不計費；復活後維持原本的出戰／休息狀態。
- **等級**：兌換後一律 Lv1；與人物共用經驗（`gainBeastExp()`，同一條經驗曲線），
  **等級不可超過人物等級**，到達上限後經驗不再累積。
- **技能**：Lv30 / 60 / 100 / 300 / 500 / 1000（`BEAST_SKILL_LEVELS`）各領悟一招，
  每一格可自由選擇五行方向，第 N 格選某屬性就學會該屬性的第 N 招（`beastSkillTree`），選定後不可更改。

  | 屬性 | 類型 | 效果範圍（第 1 招 → 第 6 招） |
  |---|---|---|
  | 金 | 單體傷害 | 人物物理攻擊 × 20% → 100% |
  | 木 | 增益 | 人物攻擊 × 1.10 → × 1.50，持續 3～4 回合 |
  | 水 | 治療 | 立即回復 / 群體（氣血＋靈力）/ 持續回復，5%～18% |
  | 火 | 群體傷害 | 每隻 人物物理攻擊 × 12% → 60% |
  | 土 | 防禦守護 | 受到傷害 -10% → -40%，持續 3～4 回合 |

- **戰鬥**：靈寵沒有氣血，不會被攻擊。**所有出戰中的靈寵**每回合各以 `BEAST_SKILL_CHANCE`(30%) 機率施展一招已學技能
  （`petAssistTick()`，野外與渡劫都會觸發）。木/土/水的持續效果存在 `state.js` 的 `petBuff*`/`petShield*`/`petRegen*`，
  同類效果取最高值、不疊乘；木屬性增益在 `getPhysAttack()`/`getMagAttack()` 生效，土屬性減傷由 `applyPetDamageReduction()` 套用。
- **陣亡與復活**：玩家死亡時所有靈寵立即陣亡（`killAllBeasts()`），輔助效果清空；
  陣亡（或休息中）的靈寵不出手、不給被動、不累積經驗。在靈獸園每隻消耗 `BEAST_REVIVE_COST_CORE`(5000) 獸丹復活。
- 靈寵的攻擊**不經過** `resolveHit()`（不受怪物閃避/減傷影響，也不觸發屬性傷害），見第 17 節。

## 17. 戰鬥屬性（減傷／閃避／屬性傷害／五行相剋）

設定在 `config-elements.js`，引擎在 `elements.js`。**玩家、怪物、心魔完全套用同一套規則**。
※ 這裡的「冰/火/毒/金/雷 屬性傷害」與裝備上的「五行」（金木水火土，用於靈根與五行相剋）是**兩套不同系統**，UI 以「冰傷／火傷／毒傷／金傷／雷傷」區分。

| 屬性 | 效果 | 玩家上限 |
|---|---|---|
| 🛡️ 減傷 `def` | 受到的傷害 -N% | 60% |
| 💨 閃避 `eva` | N% 機率完全閃過一擊（物理、術法都可閃） | 40% |
| ❄️ 冰傷 `ice` | N% 機率凍結目標 1 回合（該回合無法行動） | 50% |
| 🔥 火傷 `fire` | N% 機率燒傷：每層每回合扣「施放者攻擊力 × 15%」，**最多 3 層**、持續 3 回合 | 50% |
| ☠️ 毒傷 `poison` | N% 機率中毒：每層每回合扣「施放者攻擊力 × 8%」，**最多 5 層**、持續 3 回合 | 50% |
| ⚔️ 金傷 `metal` | N% 機率重擊：該次傷害 ×2（大量物理傷害） | 50% |
| ⚡ 雷傷 `thunder` | N% 機率雷擊：該次傷害 ×1.3，且**無視目標減傷** | 50% |

- **單位**：全部以 % 存在裝備的 `stats` 內（`def: 8` = 減傷 8%），由 `getEquipBonus()` 加總、`getPlayerCombatAttrs()` 套上限。
  燒傷/中毒再次命中會「疊一層並刷新回合數」，每層傷害取較高者。
- **單次命中結算順序**（`resolveHit()`）：閃避 → 藏書閣屬性秘典（本命五行、目標凍結中）→ 金重擊 → 雷擊 → 五行相剋 → 減傷（雷擊時略過）→ 附加冰/火/毒狀態。
  屬性秘典的加成放在攻擊方 `attrs.book`（只有 `getPlayerCombatAttrs()` 會帶，怪物沒有），詳見第 24 節。
- **回合流程**（`combat.js`）：
  1. 玩家先結算自身燒傷/中毒（`tickStatus(playerStatus)`），被凍結則本回合不出手。
  2. 玩家普攻/技能（`playerAttackTurn()`，渡劫也共用），每一擊都經 `resolveHit()`；範圍技對每隻怪各自判定。
  3. 靈寵協助（不經 `resolveHit()`）。
  4. 每隻怪物結算自身燒傷/中毒，並記錄是否被凍結。
  5. 擊殺結算。
  6. 存活且未凍結的怪物**逐隻**攻擊玩家（經 `resolveHit()`：玩家的閃避/減傷生效、怪物的屬性傷害可施加在玩家身上），
     最後再套用靈寵土屬性減傷。
  - 日誌每回合只彙整一行（例：「✨ 屬性效果：❄️凍結 🔥燒傷×2｜持續傷害 1,200」），避免洗版。
  - 回到安全區、戰死、渡劫結束時，玩家身上的狀態全部清除（`playerStatus = newStatus()`）。
- **玩家來源**：
  - 鍛造閣／千寶閣／奪寶（`gear.js` 的 `buildGearStats()`，第 37 節）：
    武器帶**五行對應**的屬性傷害（金→金傷、木→毒傷、水→冰傷、火→火傷、土→雷傷，2026-09-26 起不再隨機）、防具帶減傷（盔甲 ×1.5）、飾品帶閃避，數值依品質（`equipQualities` 的 `affix`/`def`/`eva`）。
    另有隨機詞條、特效、套裝（第 37 節）；套裝可提高閃避與屬性傷害的上限。
    例：6 件橙色防具 = 減傷 24%，5 件橙色飾品 = 閃避 15%，武器同屬性可疊加到上限 50%。
  - 靈寶閣寶物（第 18 節）數值更高；靈寶閣武學自帶 `effect: { type, chance }`，施展時與裝備取較高者，**不受 50% 上限限制**。
  - 舊裝備沒有這些欄位，一律視為 0。
- **怪物來源**（`rollMonsterAttrs()`，依所在地圖分類 `monsterAttrsByMapCategory`）：

  | 地圖分類 | 減傷 | 閃避 | 帶異屬性的機率 | 觸發率 |
  |---|---|---|---|---|
  | 一、野外歷練 | 0% | 2% | 30% | 5% |
  | 二、開放世界 | 5% | 4% | 50% | 10% |
  | 三、上古禁區 | 10% | 6% | 70% | 15% |
  | 四、幽冥禁域 | 10% | 6% | 70% | 15% |
  | 五、諸天戰場 | 15% | 8% | 90% | 20% |

  - 每隻怪物隨機一種**五行**（ttrs.element，五種機率相同）。
  - 怪物的**異屬性**只會是冰／毒／雷（`MONSTER_AFFIX_TYPES`），不再帶火傷、金傷（火、金已屬於五行）；玩家武器仍可帶全部五種。
- **心魔**：開打時複製玩家當下的戰鬥屬性與本命五行（鏡像，同五行所以不相剋）。渡劫勝負仍由勝算擲骰決定（第 7 節），屬性只影響過程。
- **顯示**：角色面板四維下方的 `#combat-attr-display` 列出本命五行＋七項數值（滑鼠移上去看效果說明／相剋關係）；
  戰鬥實況在氣血旁顯示雙方狀態（❄️凍結、🔥×層數、☠️×層數）；玩家名稱後顯示本命五行（例「韓立【火】」），怪物欄第二行彙整五行與異屬性（例「五行 火×2 金×1｜⚡雷×1」）；裝備卡片用 `formatEquipStats()` 只列出非 0 屬性。

### 五行相剋

- 相剋關係（`config-elements.js` 的 `WUXING_COUNTERS`，key 剋 value）：**木剋土、土剋水、水剋火、火剋金、金剋木**。
- **本命五行**（`stats.js` 的 `getPlayerElement()`）：已穿戴裝備（不含神器）中數量最多的五行；同數時取部位順序（`equipTypes`，武器在前）最先出現者；
  沒穿裝備則為 `null`，不參與相剋。五行聖靈根則完全免疫相剋（見第 21 節）。
- **效果**（`elements.js` 的 `getWuxingCounterMult()`，在 `resolveHit()` 內套用，玩家與怪物雙向對稱）：
  攻擊方剋制防守方 → 傷害 ×1.3（`WUXING_COUNTER_BONUS`）；攻擊方被防守方剋制 → 傷害 ×0.7（`WUXING_COUNTERED_PENALTY`）；其餘 ×1。
  例：本命火打金怪 +30%、金怪打你 -30%；本命火遇水怪則反過來。
- 只影響直接命中；燒傷/中毒的持續傷害、靈寵攻擊（不經 `resolveHit()`）不受五行影響。
- 日誌標籤：`counter`「☯️五行剋制」、`countered`「☯️五行被剋」。五行說明視窗（`openWuxingInfo()`）也有一段相剋說明。

## 18. 靈寶閣（三階段戰略級寶物）

- 商品在 `config-lingbao.js`：三個階段（初級／中級／高級宗門）各 **2 件寶物＋2 部武學**，高級宗門另有 6 件神器（各有專屬技能，見下方）。
- **兌換條件**：必須已拜入該階段的宗門（`player.sectSkills[tier]`），並**同時**支付靈石與聲望：

  | 階段 | 靈石 | 聲望 |
  |---|---|---|
  | 初級宗門 | 100,000 | 10,000 |
  | 中級宗門 | 500,000 | 100,000 |
  | 高級宗門 | 1,000,000 | 500,000 |
  | 神器（高級宗門） | **100,000,000**（`ARTIFACT_COST_COINS`，2026-09-26 由 100 萬改） | 500,000 |

  價格一律經 `lingbao-shop.js` 的 `getLingbaoCost(item)` 取得（神器用 `isArtifactItem` 判斷，靈石換成 `ARTIFACT_COST_COINS`、聲望沿用階段價）；
  高級宗門標題列註明「神器另計」，神器卡片另外顯示自己的價格。

- **唯一性**：兌換後 id 記入 `player.lingbaoSold`，該商品永久顯示「已兌換（不再補貨）」。轉世輪迴不會重置。
- **品階保證「高一階一定更好」**：同部位裝備每一項數值都更高（劍：玄鐵重劍 → 紫電青霜劍 → 誅仙劍；
  盔甲：赤焰護心甲 → 玄武鎮獄甲），武學倍率逐階提高（初級 180～200% → 中級 260～350% → 高級 400～600%）。
  **新增或調整商品時請維持這個原則**。
- **神器**（`category: "artifact"`）：共 6 件，全部在高級宗門靈寶閣兌換（每件 1 億靈石＋50 萬聲望、各自唯一），裝在神器欄、不計入五行與靈根判定。
  **品質為「造化神器・七彩」**（2026-09-25 由橙色改）：`quality: ARTIFACT_QUALITY`（"七彩"），顯示文字 `ARTIFACT_QUALITY_LABEL`，常數在 `config-lingbao.js`。
  - 樣式：`index.html` 的 `.quality-七彩`（七彩流動文字，同 `.rainbow-text`）；背包、角色裝備欄的卡片用 `getEquipCardClass()` 加上 `.rainbow-glow` 七彩外框，品質文字經 `formatQualityLabel()`（皆在 `artifact.js`）。
  - 「七彩」不在 `equipQualities` 內：**不會出現在依品級批次刪除的選項**（防誤刪）、不開鑲嵌孔（`ensureSockets` 本來就跳過神器）。
  - 舊存檔的橙色神器由 `migrateArtifactIds()` 讀檔時改成七彩。
  神器欄只有一格，所以各件**走不同路線**（四維總量都約 8 萬、戰鬥屬性約 30～40 點），避免任何一件完全取代其他件：

  | 神器 | id | 定位 | 屬性 |
  |---|---|---|---|
  | 混沌鐘 | `lb3_artifact` | 均衡防禦 | 四維各 2 萬、減傷 20%、閃避 10% |
  | 三世銅棺（九龍拉棺） | `lb3_artifact_coffin` | 極致守護 | 體質 4.5 萬（其餘 1～1.5 萬）、減傷 30%、閃避 5% |
  | 荒天帝大羅劍胎 | `lb3_artifact_sword` | 極致物理 | 力量 4.5 萬（其餘 1～1.5 萬）、金傷 25%、雷傷 15% |
  | 萬物母氣鼎（天帝鼎） | `lb3_artifact_cauldron` | 四維最高 | 四維各 2.2 萬、減傷 10%、火傷 20% |
  | 吞天魔罐（狠人大帝） | `lb3_artifact_jar` | 極致術法 | 悟性 4.5 萬（其餘 1～1.5 萬）、毒傷 25%、冰傷 15% |
  | 無始鐘（一見無始道成空） | `lb3_artifact_wushi` | 極致閃避 | 四維各 1.8 萬、閃避 25%、減傷 10% |

  新增神器時請比照這個預算，並在描述寫明定位。

### 神器專屬技能（2026-09-25，`config-lingbao.js` 的 `artifactSkills`、邏輯在 `artifact.js`）
- **觸發**：裝備在神器欄時，玩家每回合出手（`playerAttackTurn`）之後呼叫 `artifactSkillTurn(targets, tags)`，依 `chance` 額外發動一次。
  野外（`combat.js`）、渡劫（`tribulation.js`）、懸賞對決（`bounty.js`）都會觸發。**不耗靈力**、不佔宗門技能的 40% 判定；
  懸賞對決的「封印」擋不住（屬於法寶不是武學），但**被凍結的回合不會發動**。

  | 神器 | 技能 | 機率 | 效果 |
  |---|---|---|---|
  | 混沌鐘 | 鐘鎮諸天 | 18% | 全體物理攻擊 ×2.5，40% 凍結 |
  | 三世銅棺 | 三世輪迴 | 20% | 受到傷害 -50% 持續 2 回合（共用 `petShieldRate/Timer`，取較高值）＋回復 12% 氣血 |
  | 荒天帝大羅劍胎 | 一劍破天險，帝威嚇世間 | 18% | 單體物理攻擊 ×2.5，必定重擊（實際 ×5） |
  | 萬物母氣鼎 | 萬物母氣 | 18% | 全體物理攻擊 ×1.8 並必定燒傷，回復 8% 氣血與 8% 靈力 |
  | 吞天魔罐 | 吞天噬地 | 18% | 單體術法攻擊 ×3.0 並必定中毒，吸取傷害 30% 回血 |
  | 無始鐘 | 一見無始道成空 | 18% | 單體術法攻擊 ×1.5，所有敵人凍結 1 回合（下一次無法出手） |

- **欄位**：`target`(single/aoe/self)、`dmgType`、`mult`、`attrs`（該擊額外屬性，與身上取較高，例 `metal: 100` 必定重擊）、`heal`/`mpHeal`/`lifesteal`、`shield`、`freezeAll`，見 `config-lingbao.js` 註解。每擊都走 `resolveHit()`（受對方閃避、減傷、五行影響）。
- **辨識是哪一件神器**：裝備物件的 `name` 一律是部位名「神器」，所以兌換時（`buyLingbaoItem`）另存 `lingbaoId`（商品 id）。
  更新前兌換的神器沒有這個欄位，`save.js` 讀檔／匯入時呼叫 `migrateArtifactIds()`：依「四維與戰鬥屬性完全相同」比對 `lingbaoShopItems` 補上
  （⚠️ 若之後改了神器屬性，舊神器會比對不到而沒有技能——改屬性時要保留舊值的對照，或改用其他方式補 id）。
- **顯示**：背包、角色裝備欄的卡片以 `formatArtifactSkill(eq)` 顯示神器全名與專屬技能；靈寶閣商品卡片也列出技能。
- 心魔是鏡像玩家的戰鬥屬性，但**不會**使用玩家的神器技能。

- 裝備兌換前會檢查背包空位（`hasEquipInventorySpace()`），不足時不扣資源。
- 舊版靈寶閣商品（降魔伏虎杖、紫電青霜劍〔舊〕、太素霓裳羽衣、神魔九變、大羅天經）已下架；
  已購買的玩家仍保有物品與技能（技能存在 `learnedSkills` 內，技能列表標示為「[靈寶閣]」）。
- **舊禁術已下修到新標準**：舊版售價僅 1～1.5 萬靈石，遠低於新版初級的 10 萬，因此由 `migrateLegacySkills()`
  依 `legacySkillAdjustments` 於每次讀檔／匯入時校正（結果固定，重複套用不會越改越低）：

  | 技能 | 舊數值 | 新數值 |
  |---|---|---|
  | 大羅天經 | 群體 ×5.0、耗魔 80 | 群體 ×1.8、耗魔 120（同初級《烈火刀法》，但無屬性效果） |
  | 神魔九變 | 攻擊 ×4.0、3 回合 | 攻擊 ×1.5、3 回合、耗魔 150（與靈寵木屬性最高階相同） |

- **已兌換武學的耗魔同步**：兌換時是把 `skillData` 複製一份存進 `player.learnedSkills`，
  所以 `migrateLegacySkills()` 讀檔／匯入時也會依名稱從 `lingbaoShopItems` 取回最新的 `mpCost`。
  **日後調整靈寶閣武學耗魔只要改 `config-lingbao.js`**，舊存檔自動生效（其他欄位如倍率目前不會同步）。

- 舊版「降魔伏虎杖」的部位「杖」不在 `equipTypes` 內（鍛造閣選單由 `equipTypes` 產生，**從來沒有「杖」選項**）。
  讀檔時會移除這個欄位、把杖退回背包，且 `equipItem()` 會拒絕穿戴 `equipTypes` 以外的部位，見第 9 節神器欄位。

## 19. 存檔代碼（匯出／匯入）

- **介面**：`#save-code-modal` 視窗，取代舊版 `prompt()` 對話框。
  舊版的問題：存檔代碼動輒 3～5 萬字，手機上的 `prompt()` 幾乎無法全選複製，部分 App 內建瀏覽器（LINE、Facebook 等）更會直接擋掉 `prompt()`，導致按了沒反應。
- ⚠️ **此視窗內禁止使用 `alert`/`confirm`/`prompt`**：App 內建瀏覽器擋掉 `confirm()` 時會直接回傳 false，
  造成「按了確認匯入卻什麼都沒發生」。所有訊息都寫進 `#save-code-status`（`setSaveCodeStatus(訊息, 'ok'|'warn'|'error')`），
  覆蓋進度改為**按兩次確認**：第一次按解析代碼並顯示存檔的道號／境界，按鈕變成「⚠️ 再按一次，覆蓋目前進度」；
  修改文字框內容會重置確認（`resetImportConfirm()`）。
  - 匯出：文字框顯示代碼＋「📋 複製代碼」＋「💾 下載存檔檔案」。
    - 複製：先在點擊事件內**同步**執行 `execCommand('copy')`（iOS 舊版只接受這種），失敗才用 `navigator.clipboard`，
      再失敗就把文字全選並提示長按複製。文字框不設 `readOnly`（iOS 無法用程式選取唯讀文字框），改用 `inputmode="none"` 避免跳出鍵盤。
    - 下載：檔名 `fanchen-save_日期.txt`（英數字，避免手機瀏覽器中文檔名亂碼）。App 內建瀏覽器常不支援下載且無法偵測，
      所以只提示「若沒有出現下載，請改用複製」。
  - 匯入：貼上（或「📋 從剪貼簿貼上」，`navigator.clipboard.readText`）／「📂 從檔案讀取」（`FileReader`；
    `<input type="file">` **不設 accept**，部分 Android 會把 .txt 標成其他類型導致選不到）→「✅ 確認匯入」按兩次。
    匯入成功後**立刻 `saveLocal()`**；套用失敗會還原成匯入前的進度。
- **格式**（`encodeSaveCode`/`decodeSaveCode`，皆為 async）：
  - 新：`"FS2:"` + Base64(deflate-raw 壓縮的 UTF-8 JSON)，用瀏覽器內建的 `CompressionStream`。
    實測：100 名僕從＋100 件裝備的存檔，最舊版 47,527 字 → 未壓縮 Base64 約 3～4 萬字 → **壓縮後約 2,000～4,000 字**。
    **可以完整貼進 LINE**（LINE 單則訊息上限約 1 萬字，過長會被截斷或拆成多則，是手機匯入失敗的主因之一）。
  - 瀏覽器沒有 `CompressionStream`（iOS 16.3 以前）時自動退回未壓縮 Base64；
    在這類舊瀏覽器匯入 FS2 代碼會提示「瀏覽器版本過舊，請更新」。
  - 匯入相容四種輸入：FS2 壓縮代碼、未壓縮 Base64（允許夾雜換行與前後空白）、`%7B` 開頭的最舊版代碼、直接貼上的 JSON。
- **驗證**：解析失敗或缺 `realmIndex` 一律提示「存檔代碼無效」（常見原因：只複製到一部分、通訊軟體拆成多則訊息），不會改動目前進度。
- **切換存檔時的清理**：`applySaveData()` 會清空進行中的戰鬥、渡劫與身上狀態（`enemies`/`inTribulation`/`heartDemon`/`playerStatus`），
  再做離線收益結算；並用 `sanitizePlayerName()` 清理道號（別人分享的代碼可能夾帶 HTML，道號會被插進日誌的 innerHTML）。
- **手機背景存檔**：`main.js` 的 `initGame()` 在 `visibilitychange`（切到背景）與 `pagehide`（關閉分頁）時立刻 `saveLocal()`。
  手機瀏覽器常在背景直接結束分頁，只靠 30 秒自動存檔會遺失最後一段進度，重開時像是「讀檔失敗、進度倒退」。
- **修改道號**（`player-profile.js`）也改用 `#name-modal` 視窗（不用 `prompt()`），最多 12 字，並移除 `< > & " ' \`` 等字元。
- **仍使用原生對話框的地方**（在 App 內建瀏覽器可能失效）：拜入宗門、渡劫、靈寶閣兌換、轉世、完全重置等的 `confirm()` 確認，
  以及各處資源不足的 `alert()` 提示。若玩家回報這些按鈕在 LINE 內沒反應，比照本節改為視窗內確認。

## 20. 宗門地圖與城鎮（城鎮區，不編號）

- **2026-09-26 改版：第一區改名「一、城鎮 (安全區)」**，修仙地圖只列出 **天南城**、**天星城**（亂星海的主城；第二區已有戰鬥地圖「亂星海」，地圖名稱不可重複，所以城鎮叫天星城）。
- **2026-09-27 戰鬥區重新編號**：城鎮拿掉「一、」改為「城鎮 (安全區)」；戰鬥區依序改為 **第一區 野外歷練／第二區 開放世界／第三區 上古禁區／第四區 諸天至高戰場**（`config-maps.js` 的 `category` 與 `index.html` 修仙地圖按鈕）。
  只改顯示文字，`category` 字串只用於標題顯示（`map.js`、`sect.js`），不影響存檔。
- **2026-09-27 拆出第四區**：原「禁區」拆成 **第三區 上古禁區**（荒古禁地／太初古礦／上蒼（葬天島））與 **第四區 幽冥禁域**（不死山／神墟／仙陵／冥界），諸天至高戰場順延為 **第五區**。
  現在 `maps` 索引為：城鎮 0、野外歷練 1、開放世界 2、上古禁區 3、幽冥禁域 4、諸天戰場 5（`index.html` 按鈕 `openMapCategoryModal(1～5)`）。
  ⚠️ 以下四張表以**分類索引**查值，新增／拆分區域時都要一起改：`REPUTATION_MAX_BY_MAP_CATEGORY`（config-maps.js）、`monsterAttrsByMapCategory`（config-elements.js）、
  `LIFESPAN_DANGER_MULT`（config-lifespan.js）、`PROF_MAP_MULT`（config-profession.js）。這次第四區四張表都沿用上古禁區的值、諸天戰場的值移到索引 5，遊戲數值完全不變。
  存檔的 `currentMap` 以地圖名稱判斷分類（`getMapCategoryIndex`），所以舊存檔不需轉換。
- **2026-09-27 第三區進入門檻降為煉虛**：荒古禁地／太初古礦／上蒼（葬天島）的 `minRealm` 由 10（仙人初境）改為 **6（煉虛）**，四維 `minStat` 由 500 提高為 **2000**；第四、五區仍是仙人初境。第四區幽冥禁域四維同日由 500 提高為 **5000**；第五區諸天至高戰場由 5000 提高為 **10000**。
  `map.js` 的卡片「限制：」與進入失敗提示改用 `realms[minRealm]` 顯示，不再寫死「仙人初境」——之後調整門檻只改 `config-maps.js` 即可。
  ⚠️ 第 26 節的 `realmPacing` 仍以「煉虛～渡劫在鬼谷八荒（expRate 1000）」估算經驗，玩家若提早進荒古禁地（expRate 3000）這幾個境界會修得比目標快。
- **2026-09-27 起怪物加強**：玩家反映怪物過弱（煉虛玩家攻擊約千萬級，舊荒古禁地怪物氣血才 250 萬，一刀一隻），
  **2026-09-26 定案（玩家指定）**，第一～五區 `diff`（舊值 → 新值）：靈山大川 2（不變）、深淵險地 8→**50**、上古遺跡 25→**350**、天南 100→**4萬**、亂星海 400→**10萬**、鬼谷八荒 2000→**30萬**、
  荒古禁地 5千→**1000萬**、太初古礦 7千→**2000萬**、上蒼 1萬→**6000萬**、不死山 1.3萬→**50億**、神墟 1.6萬→**100億**、仙陵 2萬→**500億**、冥界 2.5萬→**1500億**、
  仙界戰場 5萬→**3000億**、萬界戰場 9萬→**5000億**、混沌初界 20萬→**1兆**（怪物氣血最高 = 1兆 × 500 = 500 萬兆，在 JS 安全整數 9007 萬兆以內）。
  **怪物攻擊／氣血可逐圖指定**：`config-maps.js` 的地圖可填 `monsterAtk`／`monsterHp`，由 `combat.js` 的 `getMapMonsterStats(map)` 取用（刷怪、野外修士／暗殺者 ×倍率、離線估算都走它），沒填則 攻擊 = diff × 50、氣血 = diff × 500。
  目前**沒有地圖使用**（第三區曾短暫指定過，2026-09-26 改回照難度計算）。
  （同日先調過兩版較低的數值才定案。怪物氣血最高 = 100億 × 500 = 5 兆，仍在 JS 安全整數範圍內。）
  野外修士／暗殺者以 diff 為基準一起變強；靈石 `coins`、經驗 `expRate` 不受影響；離線估算（`estimateIdleCombat`）自動依新 diff 計算。
  （曾評估過依對應境界把 diff 拉到 24 萬～480 兆的方案，玩家選擇自訂上列數值。）
  ⚠️ 第一、二區也一起加強：realmPacing 的前期地圖（深淵險地＝築基、上古遺跡＝金丹、天南＝元嬰、亂星海＝化神、鬼谷八荒＝煉虛～渡劫）怪物變強，新手期可能要多練階數才打得動。
  - 城鎮是安全區、可打坐（經驗倍率 ×3，同宗門），但**不是宗門**，宗門設施不能用（`isInSect()` 只認 `SECT_MAP_NAME`）；離開宗門到城鎮也會中斷親自執行的門派任務。
  - **宗門不列在修仙地圖**：`maps[0].items[0]` 仍是宗門，但標 `hidden: true`，`openMapCategoryModal` 會略過。
    ⚠️ **宗門必須維持在 `maps[0].items[0]`**：死亡回城（combat.js）、渡劫失敗（tribulation.js）、暫存區滿（enhance.js）都用 `changeMap(0, 0)`，讀檔找不到地圖時（save.js）也退回 `maps[0].items[0]`。
  - **回宗門的方式**：洞府的「宗門」（手機熱點、PC `pcStageButtons` 的 `sect`）改呼叫 `map.js` 的 `returnToSect()`：不在宗門就先 `changeMap(0, 0)` 傳送回去，再打開宗門分頁；已在宗門則只開分頁。
    懸賞對決中按宗門 = 逃離對決（`changeMap` 的既有行為）。
  - 地圖分類索引不變（城鎮仍是索引 0），`REPUTATION_MAX_BY_MAP_CATEGORY`、`getMapCategoryIndex` 不受影響。
  - **城鎮傳送點（2026-09-26）**：修仙地圖視窗的城鎮區不再是按鈕，而是直接列出城鎮卡片（`#world-map-towns`，`map.js` 的 `renderTownTeleports()`，
    `openWorldMapModal` 每次開啟時重繪）：兩欄並排，有 `thumb` 顯示縮圖、沒有則顯示 🏯 佔位，點擊即 `selectMap(0, i)` 傳送；目前所在的城鎮標「📍 當前所在」且不可點。
    第一～五區（戰鬥區，maps 索引 1～5）仍是按鈕 → `openMapCategoryModal`。
  - **城內場景（第二頁面，2026-09-26）**：城鎮卡片改呼叫 `goToTown(i)`：不在該城就先 `selectMap` 傳送，
    該城在 `config-towns.js` 有場景就開啟 `#town-scene`（`town.js` 的 `openTownScene`）；已在城內也能點卡片直接進城（卡片標「點擊進城」）。
    - 目前只有**天星城**（「天星城・坊市」）。傳送點：右側雕花石拱門 = **天星賭坊**（`openCasinoModal()`，第 40 節；橫圖 rect [1150,140,270,430]、直式 [470,600,234,700]）。
    - **場景人偶**（`figures`，2026-09-26）：透明 PNG 擺在圖上當裝飾，座標同樣是圖上像素（rect 寬高比要和圖片一致，底邊 = 腳下位置），
      畫在傳送點底下、預設不可點（加 `action` 才可點，滑過發光）；CSS `.town-figure` 加腳下陰影。
      目前：**亂星海第一大善人・風希**（id `fengxi`，第 39 節夥伴 `dashanren` 同一人；**可點**：第一次結識、之後每日問候），紅色小攤車左側的街面上（橫圖 [862,446,95,150]、直式 [226,1110,126,200]，大小以攤車高度為基準）。
      人偶圖由玩家提供的插畫（有完整街景背景）以 `tools/cut-figure.ps1` 手描外框去背：含椅子與木台、不含後方燭台與右下木箱，
      椅子扶手與靠背的鏤空處另外挖洞，避免透出原圖背景的路人。
      ※ 木台銘牌上印著原圖的「蒼龍使者」字樣（遊戲中約 10 像素高，看不清楚）；2026-09-27 依玩家指定，人物設定為風希。
    - 城名：左上「↩ 離開」下方，**直書**（`writing-mode: vertical-rl`）墨色底金邊，仿天星城縮圖的書法題字。
    - **兩張圖**：橫圖 `images/towns/tianxing-market.jpg`（1582×672，約 2.35:1，電腦與橫向）、直式 `portrait`（`tianxing-market-portrait.jpg`，704×1520，手機直向剛好滿版）。
      `town.js` 的 `pickTownView` 依畫面方向選圖（寬 < 高且有 portrait → 直式），轉向（resize）時 `applyTownView` 自動換圖並重排。
      ⚠️ 兩張圖構圖不同，**傳送點要各設一組**（`hotspots` 與 `portrait.hotspots`）。直式圖建議 9:19.5（例 1080×2340），重要內容放中間 9:16 範圍、上方約 8% 留給返回鈕與標題。
    - 版面：舞台高度 = 畫面高、寬度依比例延伸；比畫面寬時可左右瀏覽（手機手指滑動；電腦滾輪自動轉為左右平移、也可按住拖曳；捲軸隱藏），
      比畫面窄時改以寬度填滿。開啟時視角置中，可左右瀏覽時底部顯示「↔ 左右滑動瀏覽」。拖曳超過 6px 放開不會誤觸傳送點。
    - 傳送點座標用**圖上像素**（`rect: [x, y, 寬, 高]`），`renderTownHotspots` 換算成舞台 %，任何螢幕都對得準；牌匾（`.town-plaque`）顯示在範圍中央。
    - **座標工具**：網址加 `?townedit=1`，在城內畫面點任一處，底部會顯示「橫圖／直式圖座標 (x, y)」（也寫進 console），用來填 `rect`。
    - `#town-scene` 的 z-index 為 90，低於彈窗（`.modal-bg` 100），所以從傳送點開啟的視窗會疊在城內畫面上。
    - 新增其他城的場景：圖放 `images/towns/`，在 `townScenes` 以城鎮地圖名稱加一筆即可（天南城目前沒有場景，點卡片仍只傳送）。
  - **地圖縮圖**：地圖項目可加選填欄位 `thumb`（圖片路徑），城鎮傳送點與 `openMapCategoryModal` 的卡片都會顯示在最上方（`.map-thumb`，16:9 裁切）。
    目前有天星城（`images/maps/tianxing-city.jpg`）與天南城，都是玩家提供的圖縮成 720px 寬、JPEG 品質 85。其他地圖要加圖：圖放 `images/maps/`，該筆加 `thumb` 即可。
  - **依性別換縮圖**（2026-09-28）：地圖可再加選填 `thumbFemale`，`map.js` 的 `getMapThumb(item)` 在 `player.gender === 'female'` 且有 `thumbFemale` 時用女版，否則用 `thumb`
    （城鎮傳送點卡片與 `openMapCategoryModal` 都走它）。天南城：男修 `tiannan-city-male.jpg`（白衣男修御劍俯瞰天南城）、女修 `tiannan-city-female.jpg`（紅白衣女修），
    原圖 1672×941 → 720×405，各約 120 KB。

- 舊版第一區有三張安全區地圖，設施分散：「洞府 / 弟子居」(經驗 ×1，無設施)、「演武學宮」(×1.5，門派任務／靈田／靈獸園)、
  「後山禁地」(×3，靈寶閣／藏書閣／鍛造閣／煉丹房)。現已**合併為單一地圖「宗門」**（`config-maps.js` 的 `SECT_MAP_NAME`），
  經驗倍率沿用三者最高的 ×3、難度 1。
- **身在宗門即可使用全部七項宗門設施**：`ui.js` 的 `updateSectFacilitiesUI()` 只看 `map.js` 的 `isInSect()`，
  一次顯示或隱藏所有設施按鈕。親自執行門派任務也改為「待在宗門」即可（`combat.js`／`quest.js`／`map.js` 皆呼叫 `isInSect()`）。
  **日後判斷「是否在宗門」一律呼叫 `isInSect()`**，不要再把地圖名稱字串寫死在各檔案。
- 設施本身仍需先拜入宗門（`checkSectJoined()`），這點不變。
- **舊存檔相容**：存檔裡的 `currentMap` 是當時地圖物件的副本。`save.js` 的 `migrateCurrentMap()` 在讀檔／匯入時依名稱改指向
  `maps` 內的最新設定（順便讓倍率調整生效），找不到的地圖（三張舊地圖）一律回到宗門。
  日後刪除或改名任何地圖，都靠這個函式自動處理，不必另外寫轉換。

## 21. 靈根系統（取代舊版「17 件全同屬性成陣」）

判定在 `stats.js` 的 `getSpiritRoots()`，數值表與門檻常數全部在 `config-equipment.js`。
先統計 17 個部位（不含神器）各五行件數，再算出**套數** `sets`（五種件數的最小值，即能湊出幾組完整的「金木水火土」）
與**餘數** `rest[屬性] = 件數 - 套數`。

| 類型 | 條件 | 數量 | 表 |
|---|---|---|---|
| 單屬性靈根 | 某屬性 ≥ `ROOT_SINGLE_COUNT`(5) 件 | 最多同時 3 種（17 格） | `wuxingArrayEffects`（沿用原五行法陣的五種效果） |
| 五行聖靈根 | `sets` ≥ `ROOT_SUPREME_SETS`(3)（15 件，剩 2 件不論屬性） | 只有一個 | `supremeRootEffect` |
| 純化靈根 | `sets` ≥ 2 且某屬性 `rest` ≥ 6 | 只有一個 | `pureRootEffects`（水→冰、火→炎、金→罡、木→生、土→岩） |
| 雙屬性靈根 | `sets` ≥ 1 且兩屬性 `rest` 各 ≥ 5 | 只有一個 | `dualRootEffects`（10 組，key 依 `wuxingElements` 排序後以 `+` 相連） |

- **特殊靈根只會有一個**，優先序：聖 > 純化 > 雙屬性；**與單屬性靈根並存**（例：2 套 + 6 水 = 水靈根 + 冰靈根）。
- **金＋水**依 `rest` 較多者分成兩種結果（`dualRootEffects["金+水"].byMain`）：水多 → 雷靈根、金多（或相同）→ 毒靈根。其餘組合不分主副。
- **效果一律寫在各靈根的 `bonus` 內**，由 `getRootBonus()` 加總後供各計算處取用，**不要再把數值寫死在計算處**：

  | bonus 欄位 | 合併方式 | 套用位置 |
  |---|---|---|
  | `atkMult` | 相乘 | `stats.js` 的 `getPhysAttack()`/`getMagAttack()` |
  | `hpMult` / `conMult` | 相乘 | `stats.js` 的 `getMaxHp()` |
  | `skillMult` | 相乘 | `combat.js` 的 `playerAttackTurn()`（技能傷害，渡劫共用） |
  | `healMult` | 相乘 | `combat.js` 安全區每秒回血 |
  | `def`/`ice`/`fire`/`poison`/`metal`/`thunder` | 相加 | `elements.js` 的 `getPlayerCombatAttrs()`，**與裝備加總後一起套上限**（減傷 60%、屬性傷害 50%） |
  | `regen` | 相加 | `combat.js` 的 `applyRootRegen()`，野外與渡劫每回合回復（日誌顯示「🌿靈根回復」） |
  | `freezeResist` | 取最高 | `resolveHit()` 內折減「被凍結」的機率 |
  | `burnMax` / `poisonMax` | 取最高 | `resolveHit()` 內覆蓋自己造成的燒傷/中毒層數上限 |
  | `ignoreCounter` | 任一為真即成立 | `resolveHit()`：任一方持有即雙向不受五行相剋影響 |

- **新增靈根或改效果只要動 `config-equipment.js`**；若要新增 `bonus` 欄位，需同時在 `getRootBonus()` 的合併清單與套用處加上。
- **舊存檔不需轉換**：裝備資料本身沒變，只是判定規則改變，讀檔後自動用新規則重算。
- 顯示：角色裝備視窗頂端與「!」說明視窗共用 `equipment.js` 的 `formatSpiritRoots()`。

## 22. 聲望

| 來源 | 數量 | 位置 |
|---|---|---|
| 野外擊殺妖獸 | **每殺一隻隨機 1 ~ 該區上限**（`rollKillReputation()`，上限見下表） | `combat.js` |
| 每日任務 | 普通 20／困難 50／艱鉅 120 | `config-daily-quests.js` 的 `dailyQuestRewards` |
| 離線掛機（野外） | 戰鬥 tick 數 × 該區平均聲望 × `OFFLINE_REPUTATION_RATE`(0.7)，約為線上的 **65%** | `save.js` 的 `calcOfflineProgress()` |

擊殺聲望依**所在地圖分類**給，設定在 `config-maps.js` 的 `REPUTATION_MAX_BY_MAP_CATEGORY`（key 為 `maps` 的索引）：

| 地圖分類 | 每隻聲望 | 平均 |
|---|---|---|
| 一、野外歷練 | 1 ~ 3 | 2 |
| 二、開放世界 | 1 ~ 10 | 5.5 |
| 三、上古禁區 | 1 ~ 30 | 15.5 |
| 四、幽冥禁域 | 1 ~ 30 | 15.5 |
| 五、諸天戰場 | 1 ~ 100 | 50.5 |

- 舊版不分地圖一律「每殺 1 隻 = 1 點」，導致低難度地圖刷聲望效率最高；改成分區後高難度地圖才划算。
- 門派任務、僕從派遣**不給聲望**（獎勵只有道具：獸丹／靈草／武學積分／礦石，初級打掃另給 50 靈石，見 `config-quests.js`）。
- **離線掛機也給聲望**，但刻意比線上少：離線以「戰鬥 tick 數（離線秒數 × `OFFLINE_COMBAT_RATE` 0.3）× 該區平均聲望 × `OFFLINE_REPUTATION_RATE` 0.7」計算，
  換算約每秒 0.21 隻，實測穩定在線上的 0.64～0.68。
  ⚠️ 兩個係數要一起看：`OFFLINE_COMBAT_RATE` 從 0.7 降到 0.3 時，聲望倍率必須由 0.3 調高到 0.7 才能維持 65%。修改任一個都要重新實測。
  離線待在安全區（宗門）不給聲望。
- 消耗：靈寶閣兌換（初級 1 萬／中級 10 萬／高級 50 萬）、千寶閣壽元丹（1,000 ~ 10,000）；
  活動解鎖門檻見第 10 節（每日任務 1,000、千寶閣 5,000、秘境 5,000、獵殺邪修 8,000、世界BOSS 10,000）。

## 23. 靈石

- **擊殺掉落**：每隻 = 該地圖的 `coins` ±20%（`combat.js` 的 `rollKillCoins()`，數值表在 `config-maps.js` 的 `maps`）。
  ⚠️ 舊版是 `diff × (8~12)`，難度一放大靈石就爆量（混沌初界每小時 22.9 億，而靈寶閣最貴的寶物才 100 萬），
  因此改為**各地圖獨立設定 `coins`，不再跟 `diff` 連動**。調整產出只要改 `coins`。
- **換算**：滿速掛機每小時約 `KILLS_PER_HOUR_ESTIMATE`(1160) 隻（波次之間有 5 秒刷新，實測每秒 0.32 隻），
  所以「每小時靈石 ≈ coins × 1160」。

  | 地圖 | coins/隻 | 線上每小時（實測峰值） | 設計上限 |
  |---|---|---|---|
  | 靈山大川 | 20 | 2.3 萬 | — |
  | 深淵險地 | 80 | 9.5 萬 | — |
  | 上古遺跡 | 250 | 30 萬 | — |
  | 天南 | 1,000 | 118 萬 | — |
  | 亂星海 | 1,650 | 198 萬 | 200 萬 |
  | 鬼谷八荒 | 2,450 | 297 萬 | 300 萬 |
  | 荒古禁地 | 3,350 | 386 萬 | 400 萬 |
  | 太初古礦 | 4,200 | 486 萬 | 500 萬 |
  | 上蒼（葬天島） | 6,900 | 795 萬 | 800～1000 萬 |
  | 不死山 | 7,300 | 861 萬 | 〃 |
  | 神墟 | 7,750 | 898 萬 | 〃 |
  | 仙陵 | 8,200 | 936 萬 | 〃 |
  | 冥界 | 8,400 | 985 萬 | 〃 |
  | 仙界戰場 / 萬界戰場 / 混沌初界 | 8,400 | 949～970 萬 | 〃（封頂） |

- **上蒼之後靈石封頂**在每小時 800～1000 萬，不再隨難度放大；高階地圖的差異改由**經驗與聲望**體現。
  新增地圖時請照這個原則設 `coins`，並實測 3 次以上取峰值確認沒有破上限（隨機 ±20% 會讓單次結果浮動約 ±2%）。
- **離線掛機**：`save.js` 的 `calcOfflineProgress()` 以「離線秒數 × `OFFLINE_COMBAT_RATE`(0.3) × 該圖 coins」計算，
  實測約為線上的 0.89～0.97。⚠️ 舊值 0.7 會讓離線收益是線上的 2.16 倍（關掉遊戲比掛機划算）。
  這個係數同時影響離線的經驗、靈石、僕從救援與聲望（聲望另乘 `OFFLINE_REPUTATION_RATE`）。
  2026-09-24 起再乘上**實力效率**（`estimateIdleCombat()`，見第 33 節），打不過的地圖不再給滿額離線收益。
- 主要消耗：鍛造 10,000／次、符寶煉製 100 萬／次、僕從派遣 50～300／趟、丹藥 40～500、靈寵 1～5 萬、壽元丹 1～10 萬、靈寶閣 10 萬～100 萬。
  ⚠️ 後期靈石仍遠多於消耗，真正的瓶頸是聲望（高級靈寶閣需 50 萬聲望）。若要讓靈石一直有意義，
  需要讓後期消耗（鍛造、丹藥、壽元丹）隨境界提高，而不是再調高產出。

## 24. 藏書閣第二階段：屬性秘典

- **解鎖**：已拜入中級宗門（`player.sectSkills[ELEMENT_BOOK_TIER]`，`ELEMENT_BOOK_TIER = 2`）。未解鎖時藏書閣仍可進入，第二階段區塊只顯示鎖定提示。
- **消耗**（每次，`ELEMENT_BOOK_COST`）：50 武學積分 + 100 株靈草（`player.spiritGrass`）+ 1,000 靈石。支援 ×1／×10／最高（`resolveBatchCount`），也計入每日任務的 `study`。
- **成長**：每次 +0.01% 傷害（`ELEMENT_BOOK_GAIN = 0.0001`），每本上限 1,000 次（`ELEMENT_BOOK_MAX`）→ 滿級 +10%。
  滿一本共需 5 萬武學積分、10 萬靈草、100 萬靈石；八本全滿為 8 倍。
- **存檔**：`player.elementStudy = { metal, wood, water, fire, earth, ice, thunder, poison }`（缺的鍵視為 0）。
  舊存檔沒有此欄位時由 `DEFAULT_PLAYER_JSON` 補上 `{}`，不需 migrate。**轉世輪迴會清空**（與四維古籍 `studyCounts` 一樣，見第 25 節）。
- **八本秘典與作用位置**（`library.js` 的 `elementBooks`，加成由 `getElementBookBonus()` 算出，放進 `getPlayerCombatAttrs().book`，在 `elements.js` 的 `resolveHit()` 套用）：

  | 秘典 | key | 本命五行加成（該次直接傷害） | 效果加成 |
  |---|---|---|---|
  | 《庚金劍典》 | metal | 本命為金 | ⚔️重擊觸發時，該次傷害再 ×(1+加成) |
  | 《乙木長生訣》 | wood | 本命為木 | — |
  | 《癸水真經》 | water | 本命為水 | — |
  | 《丙火焚天錄》 | fire | 本命為火 | 🔥燒傷每層傷害 ×(1+加成) |
  | 《戊土玄黃功》 | earth | 本命為土 | — |
  | 《玄冰寒魄訣》 | ice | — | 目標**凍結中**時直接傷害 ×(1+加成) |
  | 《九霄雷典》 | thunder | — | ⚡雷擊觸發時，該次傷害再 ×(1+加成) |
  | 《萬毒真經》 | poison | — | ☠️中毒每層傷害 ×(1+加成) |

  - 各項加成**相乘**（例：本命金＋重擊時 ×1.1×1.1）。本命五行取自 `getPlayerElement()`，沒穿裝備（`null`）則五行秘典不生效。
  - 心魔是鏡像玩家的 `getPlayerCombatAttrs()`，因此也帶相同的秘典加成（渡劫勝負仍由擲骰決定，只影響過程）。
  - 靈寵攻擊不經 `resolveHit()`，不吃秘典加成。
- **介面**：`index.html` 的 `#library-modal` 分成兩個預設收合的抽屜（第 9 節）：「第一階段・四維古籍」（`#drawer-library-1`，靜態 HTML）與「第二階段・屬性秘典」（`#drawer-library-2` 內的 `#element-book-section`，
  由 `renderElementBooks()` 在開啟視窗與每次參悟後重繪，並列出目前持有的武學積分／靈草／靈石）。
  **新增秘典只要在 `elementBooks` 加一筆**；若要新增新的效果類型，需同時在 `getElementBookBonus()` 的預設值與 `resolveHit()` 的套用處加上。

## 25. 轉世輪迴

`leveling.js` 的 `triggerReincarnate()`，需境界達【仙人初境】（`realmIndex >= 10`）。比例由 `REINCARNATE_KEEP_RATE`（0.05）控制。

| 分類 | 內容 |
|---|---|
| 保留 5% | 四維與魅力：新值 = `10 + floor(前世 player.stats × 5%)`（只看基礎屬性，不含裝備） |
| 保留 5% | 氣血上限、靈力上限：取前世 `getMaxHp()`/`getMaxMp()`（含裝備、宗門、靈根、等級）的 5%，存入 `player.reincarnateBonus = { hp, mp }`，由 `getMaxHp()`/`getMaxMp()` 加上 |
| 遺忘 | 境界（回凡人 1 階）、人物等級（Lv1）、`sect`（變回散修）與 `sectSkills`（可重新選宗門）、門派任務 `activeQuest`、四維古籍 `studyCounts`、屬性秘典 `elementStudy` |
| 重設 | 壽元回到凡人的 60 年、年齡回到 16 歲，氣血／靈力補滿新上限，輪迴次數 +1 |
| 不動 | 裝備與背包、靈石等資源、功德／七彩補天石／破障丹、僕從、靈寵（等級可能高於 Lv1 的人物，但之後的經驗受人物等級上限卡住）、靈寶閣武學 `learnedSkills` 與 `lingbaoSold`、每日任務／千寶閣 |

- **累積方式**：保留值是「覆寫」而不是「累加」——前世的數值本來就含上上世留下的部分，所以會自然滾動累積，不會重複計算。
- ⚠️ 舊版規則是「四維 = 10 + 輪迴次數×50、魅力 = 10 + 輪迴次數×10」且保留人物等級、宗門技能與秘典，已廢除。
- ⚠️ 平衡注意：高境界的氣血上限主要來自 `getBasePower()`（隨境界暴增），5% 仍可能是凡人境界的數萬倍
  （實測仙人初境以上約 1.5×10¹⁴ 氣血 → 保留約 7.5×10¹²），轉世後前幾個境界幾乎不會戰死。若要收斂，可改成只保留四維換算的部分，或對保留值設上限。
- **介面**：「命運抉擇」抽屜內轉世按鈕下方的 `.reincarnate-note` 備註保留／遺忘項目（文字寫死 5%，**改 `REINCARNATE_KEEP_RATE` 時要一併改這段 HTML**）；
  `confirm()` 視窗的文字則由常數自動產生。
- **舊存檔**：沒有 `reincarnateBonus` 時由 `DEFAULT_PLAYER_JSON` 補 `{hp:0,mp:0}`，`getReincarnateBonus()` 也會把缺值視為 0。已經在舊規則下轉世過的存檔維持現狀，不追溯。

## 26. 修煉節奏（境界經驗曲線）

- **舊版問題**：每階經驗 = `200 × 10^境界 × 階數`，每個大境界 ×10，但地圖經驗成長慢得多、禁區又要仙人初境才開放（2026-09-27 起第三區上古禁區改為煉虛開放，見第 20 節），
  化神後即使滿加成也要數天～數十年才能修滿（渡劫約 11 年、仙人初境之後以千年計），壽元也長期卡在底線。
- **新版**：`config-realms.js` 的 `realmPacing` 直接寫「每個境界要花幾小時」，由 `stats.js` 的 `getRealmStageExp()` 反推經驗：
  每階基數 = `hours × 3600 × (地圖 expRate × 15 × REALM_PACING_KILLS_PER_SEC(0.32) × expMult) ÷ 55`，取 2 位有效數字；
  （2026-09-28 怪物刷新改 10 秒後，實際每秒約 0.21 隻，但每隻收益 × `KILL_REWARD_MULT`(≈1.556)，0.32 仍是「等效擊殺」，此公式不用改，見第 33 節末）
  `getNextExp()` = 基數 × 目前階數（10 階合計 55 倍基數，所以剛好是 `hours`）。
  `expMult` 是「一般玩家」的估算加成：凡俗宗門 ×1.2 → 修真宗門約 ×2＋靈幻狐 = 2.2 → 至高宗門約 ×4＋狐＋蛟龍 = 5.28。

  | 境界 | 主要地圖 | 目標時間 | 每階基數 |
  |---|---|---|---|
  | 凡人 | 靈山大川 | 30 分 | 1,500 |
  | 煉氣 | 靈山大川 | 1 時 | 3,000 |
  | 築基 | 深淵險地 | 2 時 | 15,000 |
  | 金丹 | 上古遺跡 | 3 時 | 100,000 |
  | 元嬰 | 天南 | 5 時 | 350,000 |
  | 化神 | 亂星海 | 10 時 | 2,100,000 |
  | 煉虛 | 鬼谷八荒 | 20 時 | 1,400 萬 |
  | 合體 | 鬼谷八荒 | 2 天 | 3,300 萬 |
  | 大乘 | 鬼谷八荒 | 10 天 | 1.7 億 |
  | 渡劫 | 鬼谷八荒 | 30 天 | 5 億 |
  | 仙人初境 | 荒古禁地 | 50 天 | 60 億 |
  | 天仙 | 上蒼（葬天島） | 100 天 | 200 億 |
  | 真仙 | 冥界 | 150 天 | 540 億 |
  | 大羅金仙 | 仙界戰場 | 200 天 | 1,200 億 |
  | 混元大羅金仙 | 萬界戰場 | 200 天 | 2,000 億 |
  | 混沌道祖 | 混沌初界 | 300 天 | 6,000 億 |

  全程約 1,040 天（約 25,000 小時，線上與離線合計，離線經驗約為線上的 94%）。
- **只改 `hours` 就能調整節奏**，經驗門檻與壽元流逝（第 15 節）都會自動跟著換算；`realmPacing.map` 必須是 `maps` 裡存在的地圖名稱。
- **戰力曲線不變**：`getBasePower()` 原本有一項「目前修為 ÷ 100」，改成「修為進度百分比 × 舊版滿格值（`2×10^境界×階數`，凡人 `1×階數`）」，
  所以經驗曲線怎麼調，戰力都與舊版一致（實測相同進度下數值完全相同），怪物難度不受影響。
- **舊存檔**：修為可能遠超新門檻。`save.js` 的 `migrateRealmExp()` 把「待渡劫」者的修為壓回滿格；
  其餘保留，下次獲得經驗時 `gainExp()` 會連續升階，到 10 階後照常停在待渡劫（大境界仍須渡劫，不會一次跳好幾個境界）。

## 27. 功德系統（獵殺邪修／七彩補天石／破障丹）

設定在 `config-merit.js`，邏輯在 `merit.js`（懸賞榜在 `bounty.js`，第 36 節）。
流程：**斬殺敵對陣營修士 → 功德 → 滿 30,000 自動凝結七彩補天石 → 千寶閣珍貴物資（破障丹）**。功德只能換道具。

- **開放狀態**：2026-09-25 起 `config-activities.js` 的 `evil` 為 `implemented: true`。改回 `false` 即整體暫停：
  `isEvilHuntUnlocked()` 回傳 false（野外不出現修士、離線不累積功德、懸賞遇不到），`isMeritSystemOpen()` 為 false 時千寶閣**不顯示珍貴物資區**、渡劫**不提醒破障丹**。
- **解鎖**：活動選單「獵殺邪修」，聲望 8,000＋金丹（`isEvilHuntUnlocked()` 走 `getActivityLockReason()`）。
- **殺手殿堂場景**（2026-09-25）：活動「獵殺邪修」的 `openFn` 是 `openEvilHallScene()`，先開全螢幕場景 `#evil-hall-scene`
  （背景 `images/evil-hall.jpg`，937×625，玩家提供的洞窟浮台圖，`object-fit: cover` 置中），畫面正中央是 CSS 畫的橫式匾額「殺手殿堂」（`.evil-hall-plaque`，楷體金字、紅色呼吸光暈），
  **點匾額才 `openEvilHuntModal()`** 開懸賞榜；左上「↩ 離開」= `closeEvilHallScene()`。
  因為 cover 是置中裁切，圖片正中央永遠落在畫面正中央，所以匾額直接用 `left/top: 50%`，不需要像標題頁那樣換算座標。
  `#evil-hall-scene` 在 DOM 中排在 `#evil-hunt-modal` **之前**（兩者 z-index 都是 100），懸賞榜才會疊在場景上面。

### 陣營（正派／邪派）
- `getPlayerFaction()`：已拜入的每個宗門算 `FACTION_SECT_WEIGHT`(5) 分、每招學會的仙法算 1 分，依陣營加總；**邪派分數高於正派才是邪派**，同分（含散修）算正派。
  宗門陣營寫在 `config-sects.js` 的 `faction`（目前 `"邪"` 為凡俗的**皇朝**、修真的**天魔教**、至高的**九幽黃泉**，其他沒寫 = 正）；仙法陣營取 `config-spells.js` 的 `faction`。
  宗門列表卡片會標示「正派／邪派（影響懸賞榜陣營）」（`sect.js` 的 `renderSects()`）；獵殺邪修視窗的規則說明也依 `faction` 自動列出邪派宗門。
  ⚠️ 每個宗門權重相同，所以「一邪一正」會同分而算正派，要當邪派得拜入較多邪派宗門（或學較多魔功）。
- 正派玩家的懸賞榜列邪修、邪派玩家列正道修士。**兩者都拿功德**，只有說法不同（邪派的日誌寫「吸取對方功德」）。

### 善惡值
- `player.karma`：-3000～+3000（`KARMA_MAX`），新角色 0，轉世不重置。介面只顯示 **善（藍）／中立（灰）／惡（紅）**：≥ `KARMA_GOOD_THRESHOLD`(1000) 為善、≤ `KARMA_EVIL_THRESHOLD`(-1000) 為惡。
  顯示位置：洞府 HUD 道號旁（`#hud-karma`／`#pc-hud-karma`）、修仙分頁資源列（`#karma-display`）、獵殺邪修視窗。
- **殺邪派人士 → 善（+）、殺正派人士 → 惡（−）**（`addKarma()`，跨過門檻時寫日誌）：野外修士 ±5、暗殺者 ±10、懸賞人物 人／地／天榜 ±30／60／100（`BOUNTY_RANKS[].karma`）。
- **暗殺**：善 → 邪派刺客、惡 → 正道獵魔人，野外每波有 `AMBUSH_WAVE_CHANCE`(4%) 混入一名（`AMBUSH_ICON` 🥷，氣血與攻擊 ×`AMBUSH_POWER_MULT` 3）。中立時不會出現。
- 離線與背景補發**不計善惡值**、不會遇到暗殺者。

### 野外修士（取代舊版「每隻 1.6% 是邪修」）
- 野外修士**不是妖獸**：`combat.js` 每刷新一波，有 `FIELD_CULTIVATOR_WAVE_CHANCE`(5%) 混入**一名**，正道／魔道各半（圖示 `CULTIVATOR_ICONS` 🧙／🧛，氣血與攻擊 ×1.5）。
  敵人物件帶 `cultivator: "正"/"邪"`、暗殺者另帶 `ambush: true`；戰鬥實況標題顯示「修士×N」。
- 斬殺時 `onCultivatorKilled()`：改善惡值、`evilKills` +1；**只有敵對陣營給功德** `FIELD_MERIT_MIN`～`FIELD_MERIT_MAX`(1～10)，同陣營不給（日誌註明）。
- 離線（野外）：波數（戰鬥 tick ÷ `IDLE_WAVE_AVG_MONSTERS`）× 5% × 一半敵對 × 平均 5.5 功德，每小時約 50 功德。
- ⚠️ 功德改成 3 萬凝結一顆補天石後，野外修士（1～10）只是零頭，**補天石的主要來源是懸賞榜**（1～3000，平均 1,500，約 20 名換一顆）。

### 七彩補天石與破障丹
- **七彩補天石**：`player.butianStones`。身上功德每滿 `MERIT_PER_BUTIAN_STONE`(30,000) **自動凝結**一顆（`settleMeritStones()`，在野外斬殺修士、懸賞伏誅、離線結算、讀檔時呼叫）。
  ⚠️ 舊版是千寶閣按鈕「100 功德換 1 顆」（`exchangeMeritForStone`，已移除）。
- **破障丹**：`player.breakPills`，在千寶閣以 `BREAK_PILL_STONE_COST`(5) 顆補天石購買（`buyBreakPill(qty)`）。
  渡劫時若持有會**自動服用 1 顆**：心魔戰力 ×`BREAK_PILL_DEMON_POWER_MULT`(0.9)、勝算 +`BREAK_PILL_CHANCE_BONUS`(10%)、上限提高到 `BREAK_PILL_MAX_CHANCE`(90%)。見第 7 節。
- **千寶閣珍貴物資區**：`renderPreciousSection()` 嵌在 `renderAuction()` 的商品下方，**常駐、不佔每 3 小時刷新的 5 格**。
  「只能用七彩補天石購買的珍貴物資」之後要新增，也加在這一區。
- **七彩發光外觀**：`index.html` 的 `.rainbow-text`（漸層流動文字）與 `.rainbow-glow`（卡片框線與光暈循環變色），
  用於千寶閣珍貴物資、背包、角色資源列、獵殺邪修視窗；`prefers-reduced-motion` 時停用動畫。顯示資料在 `preciousItems`。
- **背包**：`renderBag()` 會列出補天石與破障丹（七彩卡片、不能直接使用）；角色面板資源列也顯示功德／補天石／破障丹。
- **存檔**：`merit`/`butianStones`/`breakPills`/`evilKills`/`karma` 與懸賞榜欄位都在 `player` 上，舊存檔由 `DEFAULT_PLAYER_JSON` 補預設值；轉世不重置。

## 28. 符寶與鑲嵌孔（符寶坊）

設定在 `config-talisman.js`，邏輯在 `talisman.js`。流程：**傳說僕從礦脈採礦 → 礦石 → 符寶坊煉製符寶 → 鑲嵌到橙裝孔位**。

- **孔位**：`SOCKET_QUALITY`(橙色) 的武器／防具／飾品帶 `SOCKET_MIN`～`SOCKET_MAX`(1~3) 個孔，**神器不開孔**。
  資料在裝備物件上：`eq.sockets = [null 或 { type, grade }, ...]`。一律由 `ensureSockets(eq)` 產生（沒有 `sockets` 才開孔，重複呼叫不會重抽）：
  - 鍛造閣 `forgeOneEquipment()`、千寶閣 `rollAuctionEquip()`（上架時就決定，買家看得到）、靈寶閣兌換。
  - **舊裝備不補孔**：只有更新後新鍛造／上架／兌換的橙裝才有孔；更新前就持有的橙裝、更新前上架的千寶閣商品都維持無孔。
    `save.js` 的 `migrateEquipSockets()` 只負責補上 `player.talismans` 欄位。
  - **日後新增任何取得裝備的管道，都要對新裝備呼叫 `ensureSockets()`。**
- **符寶種類**（`talismanTypes`，11 種）：四維符 `str/con/int/spr`（加固定點數）、戰鬥屬性符 `def/eva/ice/fire/poison/metal/thunder`（加 %）。
- **煉製一律隨機**（`craftTalisman(qty)` → `rollTalisman()`）：無法指定種類或品階；種類 11 選 1 平均，品階依 `chance`。
  每次成本固定 `TALISMAN_CRAFT_COST` = **500 礦石＋1,000,000 靈石**（2026-09-24 由 5 萬調高），支援 ×1／×10／最高，日誌彙整煉出的種類與數量。

  | 品階 | 四維符 | 屬性符 | 出現機率（暫定） |
  |---|---|---|---|
  | 下品 | +100 | +1% | 70% |
  | 中品 | +400 | +2% | 25% |
  | 上品 | +1,500 | +3% | 5%（實測 200 次出 12 枚） |

- **生效**：`stats.js` 的 `getEquipBonus()` 把每件已穿戴裝備的 `getSocketStats(eq)` 加進總和，所以四維與戰鬥屬性一起生效；
  戰鬥屬性仍與裝備、靈根加總後套上限（減傷 60%、閃避 40%、屬性傷害 50%）。背包中的裝備不生效。
- **持有**：`player.talismans = { "種類_品階": 數量 }`（例 `def_3`）。
- **鑲嵌**：符寶坊列出所有有孔的裝備（穿戴中在前），空孔選符寶按「鑲嵌」（`inlayTalisman`）。
- **拆卸**：已鑲嵌的可按「打掉」（`removeTalisman`，會 `confirm`），**符寶碎裂消失**、孔位變回空的；毀棄裝備時上面的符寶一併消失。
- **顯示**：`formatSockets(eq)` 在背包、角色裝備欄、千寶閣卡片列出「🔮 孔位 N：[符寶] [空]」。
- **設施**：宗門與設施抽屜的「🔮 符寶坊」（`#btn-sect-talisman`，身在宗門才顯示，需已拜入宗門）。
- **礦石產量參考**：一名傳說僕從每小時約 60 趟 × 平均 15.5 = 930 礦石（花費 18,000 靈石），約可煉製 1.9 次。

## 29. 裝備等級（鍛造閣）

- 鍛造閣先選部位，再選**裝備等級**（`config-equipment.js` 的 `EQUIP_LEVELS`）：10／50／100／200／300／400／500／700／800／1000。
  每個等級都會隨機出白／綠／藍／紫／橙五種品質（機率不變：橙 5%、紫 10%、藍 20%、綠 30%、白 35%）。
- **可鍛造上限**依「目前所屬宗門」階段（`getSectTier()`，`FORGE_LEVEL_CAP_BY_TIER`）：初級宗門 ≤100、中級 ≤500、高級 ≤1000。
  `renderForgeLevelSelect()` 在開啟鍛造閣時只列出可選的等級（預設最高）；`forgeEquipment()` 也會再檢查一次。
- **打出哪一件**（2026-09-26）：依等級從該部位的可製作清單隨機抽一種（10～100 凡俗、200～500 修真、700～1000 至高，各 5 種，五行各一），見第 37 節。
- **數值**：四維基數 = 等級 × `EQUIP_LEVEL_STAT_MULT`(5) × 品質倍率（白 1／綠 2／藍 3／紫 5／橙 8），再依該裝備的四維模板分配（`gear.js` 的 `buildGearStats()`）。
  例：500 等橙劍力量 2 萬、1000 等橙裝 4 萬（與靈寶閣高級寶物相當）。減傷／閃避／屬性傷害仍只看品質。
  ⚠️ 舊版鍛造是依「境界」算數值，改版後與境界無關。
- **穿戴限制**：裝備帶 `level` 欄位，`equipItem()` 要求**人物等級 ≥ 裝備等級**；卡片名稱前顯示「Lv.N」（`formatEquipLevel()`，等級不足時標紅）。
  舊裝備、千寶閣、靈寶閣的裝備沒有 `level`，不受限制。
- **費用**：`FORGE_COST` 每次 10,000 靈石（不分等級）。

## 30. 發佈版本號與讀檔失敗保護

### 事故紀錄（2026-09-23）
玩家更新後讀檔跳出「本地存檔格式損毀」。**存檔本身沒有壞**：GitHub Pages 會快取檔案約 10 分鐘，
瀏覽器拿到「舊 index.html（沒有 `#age-display`）＋新 ui.js」，`updateUI()` 對不存在的元素寫入而拋出 TypeError；
舊版 `loadLocal()` 把任何例外都當成「格式損毀」，接著 `startGame()` 直接跳性別選擇——**玩家一選性別，新角色就會覆蓋原存檔**。
（以 8 種舊存檔形態測試目前程式皆可正常讀取；移除 `#age-display` 即可重現同一錯誤。）

### 1. 發佈版本號（防止新舊檔案混用）
- `index.html` 的每個 `<script src="data/xxx.js?v=版本">` 都帶 `?v=`（目前 `20260928x`）。
- **每次推上 GitHub Pages 前，把所有 `?v=` 全部取代成新值**（例：日期＋序號）。新 index.html 會指向新網址的 JS，不會再拿到快取的舊檔。
- 新增 `data/*.js` 時也要記得帶上 `?v=`。

### 2. 讀檔失敗保護（`save.js`）
- `loadLocal()` 分開處理兩種失敗：`JSON.parse` 失敗（存檔真的壞了）與 `applySaveData()` 拋錯（多半是版本混用）。
- 失敗時 `reportLoadFailure()`：
  1. 設 `saveLoadFailed = true` → `saveLocal()`（含每 30 秒自動存檔、切背景存檔）**一律不寫入**。
  2. 原始存檔另存到 `localStorage['xiuxian_save_backup']`（時間在 `xiuxian_save_backup_at`）。
  3. 顯示 `#load-error-modal`：錯誤原因（真正的例外訊息）、依原因給的建議，以及三個選項（沒有關閉鈕、不用 alert/confirm）：
     - 🔄 重新整理再試一次：`retryLoadAfterFailure()` 以 `?reload=時間戳` 重新載入，避開快取的舊 index.html。
     - 📋 顯示原始存檔代碼：`showRawSaveForCopy()` 把原始存檔放進文字框並嘗試複製（可貼到「匯入存檔」救回）。
     - 🗑️ 放棄存檔開新角色：`abandonSaveAndStartNew()`，**要按兩次**；備份仍保留。
  - 若頁面是舊版 index.html（沒有這個視窗），退回用 `alert` 說明，寫入一樣被封鎖。
- `main.js` 的 `startGame()`：`loadLocal()` 失敗且 `saveLoadFailed` 時直接返回，**絕不自動進入開新角色**。
- ⚠️ 新增讀檔邏輯時，任何「可能覆蓋存檔」的路徑都要先檢查 `saveLoadFailed`。

### 3. 刪除存檔後重新整理（事故紀錄 2026-09-24）
- `main.js` 在切到背景（`visibilitychange`）與離開頁面（`pagehide`）時會自動 `saveLocal()`。
  `location.reload()` 本身就會觸發 `pagehide`，所以「刪存檔 → reload」會在離開前把目前角色**寫回去**——
  曾造成「🔄 遊戲重新開始（完全重置）」按了沒有重置。
- 規則：**任何刪除存檔的路徑，都要先設 `gameOver = true` 再 `removeItem`**（`saveLocal()` 看到 `gameOver` 就不寫入）。
  目前的 `resetGameCompletely()`（save.js）與 `triggerLifespanGameOver()`（lifespan.js）都已這樣做。

## 31. 洞府主畫面（舞台版面）

背景圖 `images/home-bg.jpg`（**704×1520**）本身就是介面：頭像框、名字框、兩個資源框、左右側按鈕、底部導覽都**畫在圖上**。
程式只負責把即時數值疊進框裡，並在圖上的按鈕位置放透明點擊區。

### 舞台與對齊
- `#app-frame`（外框，fixed 置中）包住 `#app-stage`（舞台，relative）。`home-ui.js` 的 `layoutStage()` 依**顯示尺寸設定**（第 34 節）計算：
  手機版舞台滿版填滿（最寬 9:16，背景圖 `object-fit: fill` 伸縮）；PC 版為 16:9 外框，舞台保持原圖比例在左、分頁面板在右。
  多出的邊由 `body::before` 用同一張圖放大模糊補底（PC 版換成 home-bg-pc.jpg）。視窗縮放、轉向、進出全螢幕時重算。
  ⚠️ PC 版改用獨立的 `#pc-stage` 與橫式圖（第 34 節），本節的座標只適用手機版。
- CSS 變數 `--u` = min(舞台寬 ÷ 704, 舞台高 ÷ 1520)，字級與間距一律 `calc(var(--u) * 圖上像素)`（舞台被壓扁時取較小值，文字不溢出）。
- 疊加元素的 `left/top/width/height` 一律寫成「**圖上座標 ÷ 704（橫向）或 ÷ 1520（縱向）**」的百分比。
  ⚠️ **換背景圖時**：要改 `STAGE_IMG_W`/`STAGE_IMG_H`，並重新量 index.html 內所有 `%` 座標（HUD、熱點、側邊按鈕、底部導覽、`#tab-sheet`）。

### 元素對照（圖上座標，704×1520）

| 元素 | 位置 | 內容／功能 |
|---|---|---|
| `#hud-avatar` | 頭像框 (28,34) 124×124 | 玩家頭像（`getPlayerAvatar()`：玩家選用的頭像，未選則依性別），蓋住圖上的預設頭像；**點擊開啟更換頭像視窗**（第 32 節） |
| `#hud-name` | 名字框 (159,47) | 道號、境界階數（待渡劫會標示）、Lv 與等級進度條、戰力 |
| `#hud-coins` | 左資源框（元寶） | 靈石（`formatShortNumber`：萬／億縮寫）；圖示上蓋「靈石」標籤，點擊顯示說明（第 47 節） |
| `#hud-rep` | 右資源框（圖上原為「仙玉」，寶石圖示） | **聲望**；圖示上蓋「聲望」標籤，點擊顯示說明（第 47 節） |
| `#hud-stats` | 資源框下方（新增的半透明面板） | 氣血／靈力／修為條、修煉效率（`getCultivationRate()` = 宗門經驗倍率 × 靈寵加成）；最下列左側 `#btn-settings`「⚙️ 設定」開啟設定視窗（第 34 節） |
| 熱點「升仙台」 | 寶塔 | `openAscensionPlatform()`：待渡劫時 `triggerTribulation()`，**確認開始後自動切到戰鬥分頁**（取消則留在洞府，2026-09-26）；否則提示修為進度；待渡劫時牌匾亮紅點 |
| 熱點「千寶閣」（舊牌匾名「領物閣」，2026-09-25 改名） | 山中發光洞口 | `openActivity('auction')`（千寶閣，未解鎖會提示條件） |
| 熱點「宗門」 | 左側山門 | 切到宗門分頁 |
| 熱點「僕從小屋」 | 右側屋舍 | `openServantModal()` |
| 熱點「天磯錄」（2026-09-26） | 寶塔右側尖峰 (430,300) 140×170 | `openCodexModal()`（第 37 節） |
| 熱點「大道石碑」（2026-09-28） | 升仙台與天磯錄之間 (396,380) 38×144；圖上沒畫，石碑由 `.plaque-stele` 畫出 | `openLeaderboardModal()`（第 42 節） |
| 側邊「任務」「背包」 | 左側 | 任務 = `switchTab('task')` 開啟任務分頁（宗門任務＋活動，2026-09-25 改；原本直接開門派任務彈窗）；背包 = `openBagModal()` |
| 側邊「丹藥堂」（圖上原字「特惠商城」，2026-09-25 改名） | 右側 | `openShopModal()`（丹藥堂）。按鈕內的 `.nav-label-cover.stage-label-cover` 以深色圓角底＋楷體字蓋掉圖上的字（蓋字區比按鈕寬，向兩側延伸）。PC 版圖上沒有這顆按鈕 |
| 側邊齒輪「系統」`#stage-gear-btn`（2026-09-25 新增） | 右側、丹藥堂正上方 (615,1073) 62×62 | **圖上沒有，程式畫的**：深底金框圓鈕＋⚙️，下方 `.stage-label-cover` 寫「系統」。點擊 `openSystemModal()` 開啟 `#system-modal`（命運與系統：存檔管理＋命運抉擇兩個抽屜）。`#system-modal` 在 DOM 中排在 `#save-code-modal` 之前，匯出／匯入存檔視窗才會疊在上面 |
| 側邊「郵件」「充值」 | 左／右 | 遊戲沒有對應功能 → `showUnderConstruction()` 顯示「興建中」 |
| 底部導覽 | 修仙／戰鬥／洞府／**情緣**／世界 | 修仙、戰鬥、洞府為 `switchTab()`；選中的按鈕有金色光暈（`.nav-btn.active`）。<br>**情緣**：圖上原字「宗門」用 `.nav-label-cover`（深色底＋楷體字，位置相對於按鈕）蓋掉改寫，點擊 `openPartnerModal()`（情緣・夥伴，第 39 節），沒有 `data-nav`。宗門分頁改由洞府的「宗門」山門熱點進入。<br>**世界**：`openWorldTab()` = 切到世界分頁並跳出修仙地圖彈窗 |

### 分頁（底部導覽）
- `switchTab(tab)` 設定 `body[data-tab]`：`home`（洞府）只顯示背景與熱點；其他分頁在 `#tab-sheet`（圖上 y 212～1372 之間）顯示面板。
- 原本的面板仍在 `#game-container` 內（所有 id 不變，`updateUI()` 照常寫入），用 `data-tab` 標記屬於哪個分頁（可多個，以空白分隔）：

  | 分頁 | 面板 |
  |---|---|
  | 修仙 `cultivate` | `#header`（境界、壽命、狀態條等詳細資訊）、修士面板（四維、戰鬥屬性、裝備、技能、自動輔助、資源） |
  | 戰鬥 `battle` | 戰場實況＋渡劫按鈕＋日誌（`#battle-panel`）——**不再有修仙地圖** |
  | 宗門 `sect` | 宗門與設施（入口：洞府「宗門」山門熱點） |
  | 任務 `task` | 宗門任務（「📜 門派任務」按鈕 → `openQuestModal()`）、活動 `#activity-list`（每日任務、千寶閣、獵殺邪修…）。入口：手機洞府左側「任務」按鈕；沒有底部導覽按鈕，PC 版目前沒有入口 |
  | 世界 `world` | 只剩「🗺️ 修仙地圖」按鈕——**活動已移到任務分頁、命運與系統改成齒輪開啟的 `#system-modal`**（皆 2026-09-25） |

- **修仙地圖**（2026-09-25 改）：不再是分頁內的面板，改成獨立彈窗 `#world-map-modal`（五個區域按鈕＋目前所在，`map.js` 的 `openWorldMapModal()`）。
  開啟方式：點「世界」導覽（手機底部、PC 右下）時自動跳出、世界分頁頂端的按鈕。（PC 版傳送門熱點已移除）
  `#world-map-modal` 在 DOM 中排在 `#map-category-modal` **之前**，選區域時的地圖清單才會疊在上面；`selectMap()` 選定後兩層一起關閉。
- 分頁內的設施抽屜**預設展開**、任務分頁的活動清單直接列出（無抽屜）（分頁本身就是選單）；`#system-modal` 內的存檔管理與命運抉擇仍預設收合。
- **新增面板**：放進 `#game-container` 並加上 `data-tab="分頁名"` 即可。

### 其他
- 標題畫面期間 `body.title-mode` 會隱藏 `#app-frame`。`main.js` 的 `window.onload` 先 `initHomeUi()` 再 `initTitleScreen()`。
- `updateUI()` 結尾呼叫 `updateHomeHud()`，所以 HUD 與原面板永遠同步。
- 彈出視窗（`.modal-bg`，z-index 100）仍是全螢幕，蓋在舞台上方。
- 背景圖只有 704 寬，在高解析手機上會略微放大；若之後有更大的同構圖，直接替換並依上方警語重新量座標即可。

## 32. 頭像更換（可解鎖）

- **入口**：點洞府左上的頭像（`#hud-avatar`）→ `openAvatarModal()` 開啟 `#avatar-modal`，列出全部頭像（已解鎖／使用中／鎖定與條件、目前進度）。
- **不分性別**，所有頭像男女修都能用；`player.avatarId = null` 時依性別顯示預設的韓立／南宮婉（`getPlayerAvatar()`）。
- **解鎖方式：花靈石購買**。除了預設的韓立／南宮婉，其餘 10 個頭像都是 `unlock: { type: "coins", value: AVATAR_UNLOCK_COINS }`，
  目前 **每個 10,000,000 靈石（1000 萬）**（`config-avatars.js` 的 `AVATAR_UNLOCK_COINS`，改這一個常數即可全部調價；個別頭像也可寫不同 `value`）。
  - 在選擇視窗點未解鎖的頭像 → `buyAvatar(id)`：靈石不足會提示；足夠則 `confirm` 後扣款、加進 `player.unlockedAvatars` 並**立即換上**。
  - 已解鎖的不會重複扣款；**解鎖後永久保留**（轉世也不會失去；選用中的頭像也保留）。
  - 卡片顯示「💰 10,000,000 靈石解鎖」，靈石不足時轉紅並註明。
  - 價格參考：線上掛機每小時靈石約 2 萬（野外初期）～1000 萬（禁區以上封頂，第 23 節），所以一個頭像約是後期 1 小時的收入。

  | 頭像 | id |
  |---|---|
  | 韓立／南宮婉（預設，免費） | `male` / `female` |
  | 執扇仙子、琵琶仙子、茵茵（舊名花仙童女） | `fan-fairy` / `pipa-fairy` / `flower-girl` |
  | 葉凡（舊名藍衣少年）、亂星海大善人、銀髮劍仙 | `blue-youth` / `starsea` / `silver-swordswoman` |

  ※ 改名只改 `name`，**`id` 不可改**（存檔的 `avatarId`／`unlockedAvatars` 記的是 id，改了會讓已購買的頭像失效）。
  | 妖妖、羅峰、姜太虛、少年人皇 石昊 | `yaoyao` / `luofeng` / `jiang-taixu` / `golden-emperor` |

- **條件類型**（`checkAvatarCondition()`）：`coins`（購買）之外，程式仍支援「達成即自動解鎖」的 `realm`／`level`／`reputation`／`tribulation`，
  由 `updateUI()` 呼叫的 `checkAvatarUnlocks()` 判定（`coins` 類型會被略過，一定要玩家自己買）。之後想讓特定頭像改回成就解鎖，改該筆的 `unlock` 即可。
  ※ 改版前曾短暫使用成就解鎖；當時已自動解鎖的頭像記錄在存檔的 `unlockedAvatars`，會維持已解鎖。
- **新增頭像**：圖片裁成正方形（建議 256×256、臉部置中）放進 `images/avatars/`，在 `config-avatars.js` 的 `avatarList` 加一筆。
  `id` 會寫進存檔，**上線後不要改名**（改名會讓已解鎖／使用中的紀錄失效，退回預設頭像）。
- **圖片處理紀錄**：`images/avatars/` 的圖是用 .NET System.Drawing 從玩家提供的原圖依臉部位置裁正方形、縮成 256×256（JPEG 品質 90）。
  三位仙子取自三聯圖（解析度較高），妖妖的原圖只有 225×225，放大後較模糊，有更清楚的圖可直接替換同檔名。
- **顯示位置**：洞府頭像框（`home-ui.js`）、戰鬥分頁的戰場實況（`ui.js` 的 `updateCombatVisualPanel`）都用 `getPlayerAvatar()`；
  開場性別選擇視窗仍固定顯示韓立／南宮婉。

### 頭像光環（2026-09-26，`config-avatar-frames.js`、`avatar.js`）
- **是什麼**：疊在頭像上的華麗圓框，25 種。配戴後**洞府頭像（手機 `#hud-avatar-frame`、PC `#pc-hud-avatar-frame`）與仙魔戰場實況頭像**都會顯示。
  在頭像選擇視窗下半部「💫 頭像光環」配戴／卸下（`selectFrame(id | null)`），預覽用的是目前的頭像。
- **解鎖**（條件格式同頭像，`checkAvatarCondition`；達成類由 `checkAvatarUnlocks` 一併呼叫 `checkFrameUnlocks` 自動解鎖）：

  | 類別 | 光環 |
  |---|---|
  | 預設 | 素銀月環 f19、青玉流光 f12 |
  | 境界 1～15（煉氣～混沌道祖，每境界一個） | 碧落寒光、冰紗仙羽、紫璃冠冕、赤心金翼、朱雀靈環、翠玉神環、紫羽仙環、金桂月輪、古金蓮紋、蒼穹金冠、聖翼金環、碧海冰晶、霜翼銀輝、紫霞鳳冠、金翎聖晶 |
  | 累計渡劫成功 3／10 次 | 日曜金輪 f17／赤焰鳳冠 f05 |
  | 花靈石購買（圖上印有 VIP 字樣） | VIP 1～5：1000 萬／3000 萬／1 億／3 億／10 億；翠玉象神・5VIP：30 億 |

- **對位方式**：每個光環記錄內圈（放頭像的洞）`ring: { cx, cy, r }`（圖寬比例）。`getFrameOverlayBox(fr)` 算出光環相對於「頭像方框」的 %
  （邊長 = `AVATAR_FRAME_HOLE_FIT`(0.95) ÷ 2r，洞略小於頭像，頭像邊緣藏在框下）。
  - 戰場實況與選擇視窗：`renderFramedAvatar(avatar, frame, size)` 產生 `.framed-avatar`（頭像 `.fa-face` ＋ 光環 `.fa-frame`），大小由外層決定；
    手機版的戰場頭像縮小改寫在 `#battle-player-icon .framed-avatar`（原本 `#battle-player-icon img` 的規則會把光環也縮成頭像大小）。
    戰場實況每秒重繪，內容沒變時不重寫 innerHTML（`dataset.html` 比對），避免圖片重新載入閃爍。
  - 洞府 HUD：`home-ui.js` 的 `updateHudAvatarFrames()` 依 `HUD_AVATAR_BOXES`（**須與 index.html 的 `#hud-avatar`／`#pc-hud-avatar` CSS 同步**）換算舞台 %。
    光環的翅膀會延伸到名字框，所以 `#hud-name`／`#pc-hud-name` 設 `z-index: 2` 疊在光環（`z-index: 1`）上面。
- **存檔**：`player.avatarFrameId`（null = 不戴）、`player.unlockedFrames`，轉世保留。`id`（f01～f25）不可改。
- **圖片處理紀錄**：來源是玩家提供的頭像框展示圖（735×1115，5×5 縮圖，每格約 130px），`tools/cut-avatar-frames.ps1`：
  1. 依量得的格線裁切（每格外擴 5px，再清掉邊緣 3px，去除縮圖卡片的框線）；抹掉 WEBP 標籤與放大鏡圖示。
  2. 背景轉透明（color-to-alpha：以裁切四角的背景色為基準，反推每個像素的 alpha 與原色；WEBP 兩格的底是純黑，另外指定）。
  3. 內圈量測：從中心打 72 道射線找內緣、取中位數半徑，垂直中心迭代修正（水平固定在正中，框都左右對稱）；f22 量不準，手動修正為 (0.5, 0.56, 0.30)。
  ⚠️ 解析度受限於展示圖（每個約 130px），放大看邊緣有些雜點。**若有原始 PNG（300～1152px、透明底），直接以同檔名替換 `images/frames/` 即可**，
  但內圈位置可能不同，要重新量 `ring`（可用工具的量測邏輯，或目測後修改）。

## 33. 背景掛機補發（縮小視窗／切 App／鎖螢幕）

**問題（2026-09-24 實測）**：遊戲靠 `setInterval(combatTick, 1000)` 推進，瀏覽器會節流背景分頁的計時器——
App 內建瀏覽器隱藏約 2 分鐘後降到每分鐘約 31 次（半速）；一般 Chrome 背景 5 分鐘後可能降到每分鐘 1 次；手機切 App／鎖屏通常完全暫停。
而離線結算只在讀檔時執行，所以回到畫面後這段損失**不會補回**。

**做法**（`save.js`）：
- `combatTick()` 開頭呼叫 `checkBackgroundCatchUp()`：記下每次 tick 的時間 `lastTickAt`，兩次間隔超過 `BACKGROUND_TICK_SLACK_MS`(1500ms)
  就把「間隔 − 1 秒」累積到 `missedTickMs`（只算沒跑到的時間，已執行的 tick 不重複計）。
- 累積滿 `BACKGROUND_SETTLE_MIN_SECONDS`(10) 秒就以 `settleIdleSeconds(秒數, "背景掛機時")` 補發，只寫日誌、不跳 alert；單次上限 24 小時（同離線）。
- `settleIdleSeconds()` 是從 `calcOfflineProgress()` 抽出的共用結算：經驗、靈石、聲望、功德、救僕從、壽元流逝（×`LIFESPAN_OFFLINE_RATE`）、靈寵維持費，
  **公式與離線掛機完全相同**，改離線收益時兩者同步生效。
- 渡劫中、已死亡、`gameOver` 時不補發，並丟棄累積時間。
- 與讀檔離線結算不會重複：切到背景時 `visibilitychange` 會存檔更新 `lastSaveTime`；
  若分頁在背景被瀏覽器結束，下次讀檔從該時間算離線；若分頁恢復執行，則由背景補發處理。
- 附帶效果：`alert`/`confirm` 視窗開著時 JS 會暫停，關閉後這段時間也會被補發（視同時間流逝）。
- 目前離線／背景補發**不推進門派任務與僕從任務**（沿用原本離線結算的行為）。

### 離線／背景的實力判定（`save.js` 的 `estimateIdleCombat()`，2026-09-24）
**問題**：舊版離線固定每秒 0.3 隻、也不會死，不看實力。開放世界（天南／亂星海／鬼谷八荒）沒有進入門檻，
新角色走進鬼谷八荒後立刻關網頁，離線 24 小時可拿約 3.9 億基礎經驗（線上第一秒就會戰死）；背景補發共用同一公式，一樣可被利用。

**戰鬥實測（2026-09-24，用 combatTick 模擬 3 萬秒、角色不會死）**：每秒擊殺上限被「每波後刷新 5 秒＋生成 1 秒」卡住，
一擊斬殺時約 0.33 隻（有群攻技能約 0.38 隻）；普攻一次只打第一隻，所以需要多下才殺得死時掉得很快：

| 殺一隻需要 | 每秒擊殺 | 每隻平均存活（含排隊） |
|---|---|---|
| 一擊 | 0.33 | 2.5 秒 |
| 約 2 下 | 0.24 | 5 秒 |
| 約 3 下 | 0.19 | 8 秒 |
| 約 6 下 | 0.12 | 16 秒 |
| 約 11 下 | 0.07 | 28 秒 |

→ 修煉節奏表（`realmPacing`）、壽元流逝、每小時靈石估算都假設「一擊斬殺」；實力超過一擊斬殺後，再變強也不會在同一張地圖更快，戰力的作用是解鎖更高倍率的地圖。

**做法**：野外離線／背景補發時，`settleIdleSeconds()` 先呼叫 `estimateIdleCombat()`（只取期望值，不擲骰）：
- **擊數** `hits` = 無條件進位(妖獸氣血 ÷ (玩家物理攻擊 × (1 − 妖獸減傷))) ÷ 未閃避率。妖獸氣血 = 難度 × 500、攻擊 = 難度 × 50，減傷／閃避取自 `monsterAttrsByMapCategory`。
- **效率** `rateMult` = (GAP + N × 一擊所需) ÷ (GAP + N × hits)，N = `IDLE_WAVE_AVG_MONSTERS`(3)、GAP = `IDLE_WAVE_GAP_TICKS`(6)（`config-maps.js`）。
  離線戰鬥次數 = 秒數 × `OFFLINE_COMBAT_RATE` × `rateMult`。**一擊斬殺時 = 100%，和舊版離線收益完全相同**。
- **撐不撐得住**：一波（3 隻依序擊殺）期間妖獸共出手 Σ(k × hits − 1) 次，乘上「妖獸攻擊 × 玩家未閃避率 × (1 − 玩家減傷)」＝ `waveDamage`；
  ≥ 氣血上限 → 判定無法久留：**把玩家移回宗門**，整段改以宗門靜修結算（不扣死亡折壽），訊息註明原因。
  線上還有自動補血，這裡只擋「一波就被打死」的情況。
- 效率 < 100% 時結算訊息會加一行「約需 X 擊才能斬殺一隻，戰鬥效率 Y%」。
- 不計技能、屬性傷害、靈寵協助，估算偏保守。與實際 combatTick 模擬比對（天南／冥界，多種攻擊力）：效率誤差約 ±2%。

### 線上實戰證明（2026-09-28，修「縮小畫面一段時間再回來，人物回到宗門」）
- **原因**：上面的「撐不撐得住」只看一波傷害 vs 氣血上限，**不計自動補血、吸血、回血、護盾、靈寵**。靠丹藥或特效在線上打得好好的玩家，
  一縮小畫面觸發背景補發（或被瀏覽器關掉後重開的離線結算），就被判定撐不住而送回宗門。
- **做法**：
  - `combat.js` 每個野外 tick 累加 `fieldOnlineTicks`（state.js，不存檔）；連續滿 `IDLE_PROVEN_SECONDS`（config-maps.js，60 秒）就把地圖名稱記進 `player.idleProvenMap`（存檔）。
  - `settleIdleSeconds()`：估算撐不住，但 `idleProvenMap === 目前地圖` → 視為撐得住，留在原地照常結算（戰鬥效率 `rateMult` 仍照估算打折）。
  - 作廢時機：被妖獸打死（combat.js 兩處戰死判定前清 `idleProvenMap`；懸賞對決落敗**不**清，那與妖獸強度無關）、轉世（leveling.js）。
    換地圖（map.js `changeMap`）只把 `fieldOnlineTicks` 歸零；回到已證明的地圖仍然有效。
- 防濫用仍在：新角色進高階地圖後**立刻**縮小／關網頁，沒有 60 秒線上實戰證明，照舊退回宗門；線上若真的撐不住，60 秒內就會戰死並清除證明。
- 實測（本機）：以「估算撐不住」的地圖測試，無證明 → 退回宗門；有證明 → 留在原地並給野外收益；野外 tick 第 60 秒才記入證明；換地圖計數歸零。

### 怪物刷新 10 秒＋收益補償（2026-09-28）
- 一波全滅後等 `MONSTER_RESPAWN_SECONDS`（config-maps.js，原 5 秒 → 10 秒）才刷新；`IDLE_WAVE_GAP_TICKS = 刷新 + 1`。
- 玩家選擇「維持原本進度」：一擊斬殺時每秒擊殺從 3÷9 降到 3÷14（約 0.21 隻），所以
  `KILL_REWARD_MULT = (GAP + 3) ÷ (6 + 3)`（10 秒時 ≈ 1.556）乘在：
  - 每隻的經驗、靈石、聲望、職業熟練度（combat.js `fieldCombatRound`）；救援受困修士的判定次數（小數以機率補一次）。
  - 每波的遭遇機率：野外修士 `FIELD_CULTIVATOR_WAVE_CHANCE`、暗殺者 `AMBUSH_WAVE_CHANCE`（combat.js）、懸賞人物 `BOUNTY_ENCOUNTER_CHANCE`（bounty.js）。
  - **不乘**：每日任務／情緣任務的「擊殺數」（算的是實際隻數，完成時間約多 35%）。
- 離線／背景公式**不用改**：`OFFLINE_COMBAT_RATE` 本來就是「等效擊殺」；`rateMult` 用新的 GAP 算，與線上新節奏一致（打越多下，相對懲罰比刷新 5 秒時小）。
- 實測（本機，一擊斬殺、靈山大川、3600 tick）：每秒 0.219 隻；每小時靈石 23,469，設計值 coins × 1160 = 23,200（比 1.01）。
- 改刷新秒數時只要改 `MONSTER_RESPAWN_SECONDS`，補償倍率會自動重算。

### 日誌減量（2026-09-28，`ui.js` 的 `fieldLogMuted`）
> **2026-09-28 稍後已關閉**：日誌分頁（第 44 節）上線後，玩家要求戰鬥分頁加回細節，`ui.js` 的 `FIELD_LOG_DETAIL = true` 讓下面的靜音不生效，
> 每波也重新寫「⚠️ 遭遇 N 隻妖獸攔路！」。波末彙總與打坐彙總照舊保留。改回 `false` 即恢復本節的減量行為（程式都還在）。
- 野外戰鬥回合（`combat.js` 的 `fieldCombatRound()`，由 `combatTick()` 以 `try/finally` 包住）期間 `fieldLogMuted = true`：
  type 為 `normal`／`combat`／`skill`／`heal`（`FIELD_MUTED_LOG_TYPES`）的逐回合訊息（出手、技能、屬性效果、妖獸攻勢、凍結、持續傷害）不寫入。
  掉寶 `equip`、功德與升級 `level-up`、`system`、`quest`、`servant` 照常即時顯示。
- 一波結束寫一則彙總：「⚔️ N 回合擊退 M 名敵手，獲得 經驗、靈石、聲望」（`waveSummary`，state.js；`addLog(..., true)` 強制顯示）。
  一般遭遇不再寫「遭遇 N 隻妖獸」，只有混入野外修士／暗殺者時才提示。
- 戰死：`onPlayerKilledInField()` 開頭先解除靜音，戰死／折壽／靈寵陣亡訊息一定顯示。渡劫、懸賞對決不受影響（仍逐回合顯示）。
  套裝「護住心脈」（gear.js `tryGearUndying`）用 `force` 顯示。換地圖（map.js `changeMap`）會清掉 `waveSummary` 與 `meditateSummary`。
- 安全區打坐：經驗仍每 5 秒入帳，日誌每 `MEDITATE_LOG_SECONDS`（30）秒彙總一則（`meditateSummary`，state.js）。
- 實測：打坐 120 秒日誌 4 則（原 24 則）；野外掛機約每分鐘 5.5 則。
- ⚠️ 新增野外戰鬥中「一定要讓玩家看到」的訊息時，type 用 `level-up`／`equip`／`system`，或傳 `force = true`。

## 34. 設定：顯示尺寸與全螢幕（`settings.js`）＋ PC 版洞府

入口：手機版為洞府 HUD 右上面板最下列的「⚙️ 設定」（`#btn-settings`）；PC 版為圖上左下的「設置」鈕。都呼叫 `openSettingsModal()` → `#settings-modal`。
設定視窗最下方另有「⚙️ 命運與系統」按鈕（關閉設定並 `openSystemModal()`）——**PC 版沒有齒輪按鈕，這是 PC 版開啟存檔／轉世／重置的唯一入口**。
反過來，命運與系統視窗最上方也有「🖥️ 顯示設定」按鈕（關閉系統並 `openSettingsModal()`），因為手機洞府右下的「系統」齒輪比 HUD 裡的「⚙️ 設定」顯眼得多。

- **切換回 PC 版按鈕**（事故紀錄 2026-09-26）：玩家在電腦上選了「📱 手機 9:16」後找不到切回去的地方——手機版唯一的設定入口 `#btn-settings`
  在電腦上只有約 39×13 像素，顯眼的「系統」齒輪開的又是存檔視窗。修正：`#layout-switch-btn`（index.html，`position: fixed` 右上角、落在舞台外的模糊邊）
  由 `layoutStage()` 判斷「目前是手機版、但視窗寬 ≥ `AUTO_PC_MIN_WIDTH` 且寬高比 ≥ `AUTO_PC_MIN_RATIO`（自動尺寸會選 PC）」時加上 `.show`，
  點擊 `setDisplayMode('auto')` 回到自動尺寸 = PC 版。真正的手機（窄螢幕）不會顯示；標題畫面（`body.title-mode`）也隱藏。

| 選項 | 版面（`resolveDisplayLayout()`） | 說明 |
|---|---|---|
| 📱 手機 9:16 | `phone` | 舞台高 = 視窗高、寬 = min(視窗寬, 高 × 9/16)：手機上**滿版**；電腦上是置中的 9:16 直式畫面。背景圖伸縮填滿（真實手機約 9:19.5，變形很小；純 9:16 會壓扁約 18%），疊加元素都是 % 座標所以仍對齊 |
| 🖥️ PC 16:9 | `pc` | 整面顯示 PC 專用橫式圖 `images/home-bg-pc.jpg`（1376×768），等比塞進視窗，多出的邊用同圖模糊補底；分頁面板開在畫面中央（見下方） |
| 自動尺寸（預設） | 視窗寬 ≥ `AUTO_PC_MIN_WIDTH`(900) 且寬高比 ≥ `AUTO_PC_MIN_RATIO`(1.2) → `pc`，否則 `phone` | 設定視窗會標示目前實際使用哪一種 |
| ⛶ 全螢幕 | （開關，不是版面） | `toggleFullscreen()` 用 Fullscreen API（含 webkit 前綴）；不支援時（iPhone Safari）提示改用「加入主畫面」。進出全螢幕觸發 resize，版面自動重算；按 Esc 離開時 `fullscreenchange` 會更新按鈕狀態 |

- **儲存**：`localStorage['xiuxian_display_mode']`（`phone`／`pc`／`auto`），讀寫都包 try/catch，讀不到就用 `auto`。
  屬於**裝置偏好，不寫進遊戲存檔**，所以匯入別台的存檔不會改變版面。全螢幕狀態不儲存（瀏覽器規定必須由使用者點擊觸發）。
### PC 版洞府（`#pc-stage`）
- **結構**：`#app-frame` 內有兩個舞台：手機版 `#app-stage`（直式圖）與 PC 版 `#pc-stage`（橫式圖）。`body.layout-pc` 時只顯示 `#pc-stage`。
  `layoutStage()` 依版面設定舞台大小與 `--u`（= 螢幕像素 ÷ 圖上像素，PC 圖寬 1376），並把**唯一一份** `#tab-sheet` 用 `appendChild` 搬進目前的舞台
  （只搬 DOM 節點，所有 id 與事件不變，`updateUI()` 照常寫入）。`#stage-toast` 放在 `#app-frame`，兩種版面共用。
- **HUD**（寫在 index.html，座標 = 圖上像素 ÷ 1376 或 768 的 %）：id 一律是手機版的 `hud-xxx` 加 `pc-` 前綴，`updateHomeHud()` 同時寫入兩邊。

  | 元素 | 圖上位置 | 內容 |
  |---|---|---|
  | `#pc-hud-avatar` | 頭像框內圓 (26,25) 104×104 | 玩家頭像，點擊更換 |
  | `#pc-hud-name` | 名字框 (135,38) 143×84 | 道號、境界（虛弱變紅）、Lv 與進度條、戰力 |
  | `#pc-hud-coins` | 第 1 個資源框（藍晶） | 靈石（三格都有名稱標籤蓋在圖示上、點擊顯示說明，第 47 節） |
  | `#pc-hud-core` | 第 2 個資源框（元寶） | **獸丹**（只有 PC 版顯示，靈寵維持費要看） |
  | `#pc-hud-rep` | 第 3 個資源框（藍鑽） | 聲望；`.pc-pill-cover` 深色底蓋掉圖上的假數字「5.366」 |
  | `.pc-stat-label` ×3 | 狀態框標籤 (1183,71/101/131) | 深色底蓋掉圖上的「體力／靈力／仙力」，改寫氣血／靈力／修為 |
  | `.pc-stat-bar` ×3 | 狀態框內三條空條 (1219,75/105/135) 115×11 | 氣血／靈力／修為進度與數字 |
  | `#pc-hud-rate-line` | 狀態框最下列 | 修煉效率 |

  圖上資源框與狀態框右邊的「＋」目前沒有功能。
- **按鈕與建築熱點**：全部定義在 `config-home-pc.js` 的 `pcStageButtons`，`home-ui.js` 的 `renderPcStage()`（`initHomeUi()` 時執行一次）依表產生。
  **要調整按鈕功能或開關，只改這張表**：`action` 是 onclick 字串；`enabled: false` 可停用；`nav` 填分頁名稱會跟著分頁亮選中光暈；
  `kind: 'hotspot'` 只在洞府（面板關閉）時可點，可加程式牌匾 `plaque`；`kind: 'button'` 一直可點。

  | 圖上 | 功能 |
  |---|---|
  | 寶塔（牌匾「升仙台」） | `openAscensionPlatform()`（待渡劫亮紅點，`#pc-plaque-ascend`；確認渡劫後切到戰鬥分頁） |
  | 中央山門（「宗門」） | `returnToSect()`：不在宗門先傳送回宗門，再開宗門分頁（手機熱點相同，第 20 節） |
  | 右側屋舍（「僕從小屋」） | `openServantModal()` |
  | 左側樓閣（「煉丹房」） | `openAlchemyModal()` |
  | ~~傳送門~~ | 2026-09-25 牌匾已從圖上抹除，`pcStageButtons` 的 `portal` 設為 `enabled: false`（不產生熱點）；修仙地圖改由「世界」開啟 |
  | 湖中光環（「千寶閣」，舊名領物閣） | `openActivity('auction')` |
  | 寶塔右側尖峰（「天磯錄」，2026-09-26） | `openCodexModal()`，圖上 (760,160) 120×130 |
  | 升仙台與天磯錄之間（「大道石碑」，2026-09-28，`plaque: 'stele'`） | `openLeaderboardModal()`，圖上 (724,185) 34×125 |
  | 左側 **任務**（圖上原字「信件」，2026-09-27 已改畫）／背包／設置 | `switchTab('task')`（任務分頁：門派任務＋活動，同手機版左側「任務」；`nav: 'task'` 亮選中光暈）／`openBagModal()`／`openSettingsModal()` |
  | 右下 **情緣**（圖上原字「修煉加速」，已改畫）／信件 | `openPartnerModal()`（第 39 節）／興建中 |
  | 右下 修仕／戰鬥／洞府／**世界**（圖上原字「福袋」，已改畫） | 修仙／戰鬥／洞府（關閉面板）／`openWorldTab()`：切到世界分頁並跳出修仙地圖（與手機版相同） |

- **分頁面板**：位置在 `PC_SHEET_RECT`（圖上 (300,40) 845×625，避開左上 HUD、右上狀態框與底部按鈕），
  `renderPcStage()` 換算成 CSS 變數 `--pc-sheet-left/top/width/height`。開啟時隱藏建築熱點，按鈕仍可點；✕ 或「洞府」關閉。
  面板字級 17px × `--ui-scale`（2026-09-28 由 15px 調大，第 45 節）、卡片最小寬 170px、日誌高 34vh。
- **圖片處理紀錄**：原圖上方有五顆導覽圓鈕，以 System.Drawing 將圓形區域用周圍像素反覆平均填補（調和填補＋輕微雜訊）移除，
  「修仙」「洞府」原位置因鄰近鳳凰翅膀留有淡光暈，正常大小不明顯。圖上的紅點與右下「修仕」錯字保留（畫死在圖上）。
  **2026-09-25 第二次修圖**（腳本以 System.Drawing＋C# 執行，原始圖備份不在專案內）：
  - 「修煉加速」→「情緣」、「福袋」→「世界」：先以調和填補（1500 次迭代＋±5 雜訊）抹掉原字，再用標楷體（DFKai-SB）粗體 25px、上淺下深金色漸層＋深色描邊畫上新字，仿原圖按鈕字樣。
  - 左側「傳送門」直式牌匾整塊抹除（圖上 (266,518) 45×132）：底色用調和填補確保邊緣連續，再疊上從左側 100px 外、右側 45px 外取樣的紋理細節（減去 7×7 局部平均，強度 0.9），看起來是一片雲霧。
    左側取樣避開了旁邊小樓的窗戶（第一次取樣只往左 45px，會把窗戶複製一份）。
  **2026-09-27 第三次修圖**：左側按鈕「信件」→「任務」（卷軸圖示不變）。只把字的亮像素（圖上 (28,508) 48×29 內、亮度 > 60，外擴 1px）以周圍深色底調和填補抹除，
    再用標楷體粗體 21px、米白→淺金漸層＋深色描邊寫上「任務」。右下另一個「信件」仍是興建中。原圖備份不在專案內。
  - ⚠️ PowerShell 5.1 以 ANSI 讀腳本：含中文的 `.ps1` 必須存成 **UTF-8 BOM**，否則 C# 中文註解與字串會變亂碼、甚至讓程式碼解析錯誤。
  - 換圖後 `index.html` 內兩處 `home-bg-pc.jpg` 加上 `?v=`（`#pc-stage-bg` 與 `body.layout-pc::before`），避免快取到舊圖；**之後再改這張圖也要更新這兩處的版本號**。
  ⚠️ 換 PC 圖時要改 `PC_STAGE_IMG_W/H`、重量 `pcStageButtons`／`PC_SHEET_RECT` 與 index.html `#pc-stage` 內 HUD 的 % 座標。
- ⚠️ 全域樣式 `button.active` 會把按鈕底色改成金色，新的 `.xxx.active` 按鈕樣式要自己覆蓋 `background`/`color`（`.settings-option.active` 即是）。
- 驗證紀錄（2026-09-24）：1376×768 自動 → PC 版滿框，HUD 與圖上框對齊（放大檢查）、9 個按鈕＋6 個熱點、戰鬥分頁面板與「洞府」關閉、「設置」開設定；
  1440×900（16:10）→ PC 版上下補模糊邊；375×812 自動 → 手機滿版、無水平捲動；1280×720 強制手機 → 置中 405×720。全螢幕需使用者手勢，未自動化測試。

## 35. 仙法與武學密典（`config-spells.js`、`spells.js`）

不分流派的武學，任何人都可修習。**目前沒有取得方式**（依需求暫不開放），`player.spells` 為空，密典全部顯示灰色但可瀏覽效果。

### 200 種的組成
- **10 屬性 × 3 品（下／中／上）× 6 招 = 180**，每品 6 招依序：單體攻擊、群體攻擊、牽制、補助、補血、光環（被動）。

  | 屬性 | 陣營 | 傷害類型 | 攻擊附帶 | 補助 | 光環（下／中／上） |
  |---|---|---|---|---|---|
  | 金 | 正 | 物理 | 金重擊 | 增益 | 物理攻擊 +5/10/15% |
  | 木 | 正 | 術法 | 吸血 10% | 增益 | 氣血上限 +6/12/18% |
  | 水 | 正 | 術法 | 冰凍 | 守護 | 靈力上限 +8/16/25% |
  | 火 | 正 | 術法 | 燒傷 | 增益 | 燒傷機率 +4/8/12 |
  | 土 | 正 | 物理 | — | 守護 | 減傷 +2/4/6 |
  | 雷 | 正 | 術法 | 雷擊 | 增益 | 雷擊機率 +4/8/12 |
  | 冰（玄冥） | 邪 | 術法 | 冰凍 | 守護 | 冰凍機率 +4/8/12 |
  | 毒 | 邪 | 術法 | 中毒 | 增益 | 中毒機率 +4/8/12 |
  | 血 | 邪 | 物理 | 吸血 25% | 增益 | 物理／術法攻擊 +8/15/22%、氣血上限 −3/5/8% |
  | 冥 | 邪 | 術法 | 中毒（蝕魂） | 增益 | 閃避 +2/4/6 |

- **絕學 20**（品階「絕學」）：正派「法則大道」10（太初劍道、時間法則・光陰逆轉、因果法則、大道衍天…）、魔道「禁忌法」10（天魔噬天禁法、血祭萬靈、萬魂幡・百萬陰魂、魔神降臨、吞天魔功…）。
- 統計：正 118／邪 82；主動 166、被動光環 34；已檢查 200 個 id 與名稱都不重複，也不與宗門／靈寶閣／靈寵技能撞名。
- id 格式：`屬性-品階-序號`（例 `fire-high-1`）、絕學為 `law-*`／`taboo-*`。**id 寫進存檔，上線後不可改**。

### 數值（`SPELL_GRADE_STATS`，改這張表即可整體調整）

| 品階 | 單體 | 群體 | 牽制（傷害／定身率） | 增益 | 守護 | 補血 | 屬性效果機率 | 耗魔 | 魔功反噬 |
|---|---|---|---|---|---|---|---|---|---|
| 下品 | ×1.6 | ×1.1 | ×0.8／40%（單體） | ×1.15・3 回合 | −15%・3 回合 | 12% | 15% | 60 | 3% |
| 中品 | ×2.4 | ×1.7 | ×1.2／60%（群體） | ×1.25・3 | −25%・3 | 20% | 25% | 150 | 5% |
| 上品 | ×3.4 | ×2.5 | ×1.6／80%（群體） | ×1.40・4 | −35%・4 | 30% | 35% | 300 | 8% |
| 絕學 | ×5.0 | ×3.8 | ×2.0／100% | ×1.80・5 | −50%・5 | 50% | 50% | 600 | 12% |

- 魔功（邪）的攻擊、牽制傷害 × `SPELL_EVIL_POWER`(1.25)，施放時扣最大氣血的「反噬」比例（不會因此死亡，至少留 1）。
- 參考：宗門技能倍率 1.5／2／3、靈寶閣武學 2～6。

### 戰鬥與被動
- **技能格**：`getSpellSlotCount()` = 1 + 人物等級 ÷ `SPELL_SLOT_LEVEL_STEP`(100)（Lv1 = 1 格、Lv100 = 2 格…）。只有放進格子的**主動**仙法會加入 `getAllSkills()`，
  和宗門、靈寶閣技能一起在每回合 40% 機率中隨機施放（修仙分頁「當前可用技能」會列出，來源標「仙法」）。超過目前格數的格子不生效（例如轉世等級重置後）。
- `combat.js` 的 `playerAttackTurn()` 新增：`shield` 守護（與靈寵土屬性共用 `petShieldRate/Timer`，取較高值）、`control` 牽制（傷害＋以 freeze 機率套冰凍狀態＝定身 1 回合）、
  `hpCost` 魔功反噬、`lifesteal` 依實際傷害回血。渡劫共用同一函式。
- **被動光環**：學會即生效，`getSpellAuraBonus()` 加總；`stats.js` 的物理／術法攻擊、氣血／靈力上限乘上百分比，
  `elements.js` 的減傷／閃避／屬性機率與裝備、靈根相加後一起套上限（負值最低到 0）。
- 轉世不會清除仙法（`player.spells` 不在轉世重置清單內）。

### 武學密典（修仙分頁「📜 武學密典」→ `#spell-modal`）
- 上方：已收錄 X / 200、技能格（✕ 卸下）、下一格開放等級。
- 篩選：屬性分支（金～冥、法則）、正邪、類型（攻擊／牽制／補助／補血／光環）、品階。
- 卡片：**金色 = 已學會、灰色 = 未學會**；點選顯示詳細效果（`describeSpell()`），已學會的主動仙法可「放入技能格」（先填空格，滿了替換最後一格）。
- 驗證紀錄（2026-09-24）：模擬學會 9 招、放入 4 格，天南戰鬥 3000 回合無錯誤；四招皆有施放（各約 180 次），牽制使怪物定身 49 回合，守護與反噬日誌正確。

### 待決定
- 取得方式（購買／掉落／千寶閣／參悟）。之後只要把 id 寫進 `player.spells` 即可學會。
- 被動光環目前**全部學會即全部生效**，200 種全學的疊加還沒做平衡；若要限制可改成光環也要放格子。

## 36. 懸賞榜與懸賞對決（`config-bounty.js`、`bounty.js`）

入口：活動「獵殺邪修」→ `#evil-hunt-modal`（標題依陣營顯示「獵殺邪修・懸賞榜」或「截殺正道・懸賞榜」）。陣營、善惡、功德規則見第 27 節。
視窗內容（`renderEvilHunt()`）：陣營／善惡／功德／補天石／破障丹 → 規則說明（可收合）→ 懸賞榜 → 累計斬殺數。2026-09-25 起**不再有「前往千寶閣」按鈕**。

### 榜單
- 每 `BOUNTY_REFRESH_HOURS`(4) 小時刷新（`refreshBountyIfDue()`，以 `player.bountyRefreshAt` 時間戳判斷，同千寶閣），每期 6 名：**天榜 1、地榜 2、人榜 3**。
  列的是**敵對陣營**：正派看邪修、邪派看正道修士（`player.bountyFaction` 記錄榜單陣營，玩家陣營改變時立即重抽）。刷新時未完成的懸賞一併作廢。
- 名冊 `bountyRoster`：邪修 30 名、正道 30 名，**男女各半**，有姓名與稱號；同一期不重複。`id` 寫進存檔，上線後不要改。
- 每名的**境界 = 玩家目前位置 −0.8～+1 境隨機**（`BOUNTY_REALM_OFFSET_MIN`/`MAX`，2026-09-25 由 ±1 改）：
  把境界換成「大境界 × 10 + (小境界 − 1)」的連續位置，以 **0.1 境 = 1 階**為單位在 −8～+10 階之間平均隨機，再換回大境界＋小境界（頭尾夾在凡人 1 階～混沌道祖 10 階）。
  例：玩家金丹 5 階 → 築基 7 階～元嬰 5 階。五行與異屬性（冰／毒／雷）、武學組合也隨機（見下方）。
- 卡片顯示：榜別、姓名、稱號、性別、境界階數、攻擊與氣血（標示是「你的幾倍」，≥1.5 倍紅、≥0.8 倍黃、其餘綠）、減傷閃避異屬性、武學。
- 存檔：`bountyBoard = [{ id, npcId, faction, rank, realmIndex, stage, element, affix, skills, status: "open"/"done" }]`。

### 接取與遭遇
- 點「📜 接取懸賞」（`acceptBounty(id)`）→ 加入 `player.activeBountyIds`。**2026-09-27 起可同時追蹤多名**：榜單上方「📜 一次接取全部（N 份）」（`acceptAllBounties()`，接取所有未伏誅、未追蹤的）、
  「放棄全部追蹤」（`abandonBounty()` 不帶 id）；卡片上「放棄懸賞」（`abandonBounty(id)`）只放棄那一份；對決中都不可放棄。
  舊存檔的單一 `activeBountyId` 在 `getTrackedBountyIds()` 第一次被呼叫時轉進陣列並刪除。追蹤中且未伏誅的清單 = `getActiveBounties()`。
- 接取後在野外（非安全區）每刷新一波前，`combat.js` 呼叫 `tryStartBountyDuel()`：`BOUNTY_ENCOUNTER_CHANCE`(8%) 遇上 → 本波不刷妖獸，改為一對一對決（約 1～3 分鐘遇上一次）。
  **同時追蹤多名時機率不變**（不會接越多遇越快），遇上時從追蹤中隨機挑一人（實測 3000 波命中率 11.6%，理論 12.4%；六人都會輪到）。伏誅後從追蹤清單移除，其餘繼續追蹤。
- 只在線上發生：離線、背景補發都不會遇上（對決中背景補發也暫停並丟棄累積時間）。

### 對決（`bountyDuelTick()`，結構同 `tribulationTick()`）
- `combatTick()` 在 `inBountyDuel` 時整個交給 `bountyDuelTick()`：自動補給 → 玩家狀態 → 出手（`playerAttackTurn`，被封印時只能普攻）→ 靈寵 → 對手狀態 → 對手出手（經 `resolveHit()`）。**勝負完全靠實戰，沒有擲骰**。
- **對手數值**（`getBountyStats()`）：攻擊 = 同境界同階數「修為圓滿」的基礎戰力（與 `getBasePower()` 同一條曲線）× 該境界一般宗門倍率（`BOUNTY_REF_SECT_MULT`：凡俗 1.2／修真 2.5／至高 5.0）× `BOUNTY_TIAN_MULT`(1.0) × 榜別比例（天 1.0／地 0.8／人 0.6）；氣血 = 攻擊 × 20。
  減傷／閃避：天 22/13、地 16/9、人 11/5；異屬性觸發率 35/25/15%；每回合施展武學機率 50/42/35%。
- **武學**（`bountySkills`，`BOUNTY_SKILL_SETS`）：
  - 邪修必帶【血魔噬心】（攻擊 ×1.8，**吸血**＝實際傷害 100% 回血）與【奪魄退魔】（攻擊 ×1.2，**吸走你最大靈力 25%**），再從化功（你的攻擊 ×0.7 三回合）、攝魂魔音（封印兩回合）、蝕骨毒功（疊 2 層中毒）、玄冥寒掌（凍結）、破甲魔爪（你的減傷閃避減半三回合）隨機 2 招。
  - 正道修士必帶【回春訣】（回復 10% 氣血）與【誅邪劍氣】（攻擊 ×2.0），再從鎮魔印（封印）、定身咒（凍結）、天罡破邪（化功）、神霄雷罰（破甲）隨機 2 招。
  - 負面狀態存在 `state.js`（`duelWeakenTimer`/`duelSilenceTimer`/`duelArmorTimer`，不存檔），以**你的回合**倒數；化功由 `stats.js` 的攻擊公式乘 `getDuelWeakenMult()`，破甲由 `getPlayerCombatAttrs()` 乘 `getDuelArmorMult()`。對決結束即清除。
- **結果**（`endBountyDuel(result)`）：
  - `win`：懸賞標記 `done`、功德 +`BOUNTY_MERIT_MIN`～`BOUNTY_MERIT_MAX`（**1～3000，不論強弱**）、善惡依榜別加減、`bountyKills`/`evilKills` +1，接著 `settleMeritStones()`。
  - `lose`：**視同野外戰死**（呼叫 `onPlayerKilledInField()`：折壽、靈寵陣亡、遺失 10% 靈石、回宗門），懸賞保留可再遇上。
  - `escape`：超過 `BOUNTY_MAX_TURNS`(150) 回合對方遁走，懸賞保留。
  - `flee`：對決中換地圖（`map.js` 的 `changeMap()`）＝逃離，懸賞保留。
- 對決中不能渡劫（`triggerTribulation()` 會擋）；渡劫中也不會遇上懸賞。戰鬥實況面板顯示對手榜別、姓名、稱號、氣血、回合數與你身上的負面狀態。

### 難度驗證（2026-09-25）
以 `bountyDuelTick()` 實際模擬（化神 5 階、戰力 ×2.5 的宗門、無靈根光環技能，對手同境界同階數，每組 200 場）：

| 玩家配置 | 天榜 | 地榜 | 人榜 |
|---|---|---|---|
| 無裝備 | 0% | 4～7% | 100% |
| 減傷 30%、閃避 15% | 0～1% | 56% | 100% |
| 減傷 60%、閃避 40%（上限） | 25～36% | 100% | 100% |

- 勝率曲線很陡（數值型戰鬥的特性），天榜在同境界需要「減傷閃避拉滿＋一點運氣」；再加靈根、仙法光環、符寶、技能會更穩。
- ⚠️ 每差 1 境戰力約差 10 倍：+1 境的天榜幾乎打不贏；最低的 −0.8 境只有約 1/7 實力，很輕鬆。上表是「同境界同階數」的情況，實際勝率依抽到的位置浮動。
- 調難度：整體改 `BOUNTY_TIAN_MULT`；個別榜改 `BOUNTY_RANKS` 的 `ratio`/`def`/`eva`；武學強度改 `bountySkills`。改完請重跑模擬。

## 37. 裝備系統（850 種裝備、強化、職業、天磯錄；2026-09-26）

原本的鍛造閣／千寶閣裝備沒有名字（名稱就是部位）。改版後**所有外界與鍛造的裝備都是這 850 種之一**，不是另一套框架。
裝備物件的 `name` **仍是部位名**（`equipItem` 等處靠它判斷穿哪一格），實際名稱由 `gearId` 查 `gearById`（`getEquipDisplayName()`）。

### 清單與取得管道（`config-gear-catalog.js`、`config-gear.js`、`gear.js`）
- 17 部位 × 50 種 = 850 種：武器 300（劍刀扇弓笛筆）、防具 300（頭 內衣 盔甲 手套 長靴 披風）、飾品 250（腰帶 項鍊 戒指 耳環 腰牌）。
- **id = 「部位-兩位數序號」**（例 `劍-07`），存檔記 id。**上線後不可重排、不可刪列**；改名只改名稱欄。
- 清單來源是 `tools/裝備清單-850種.csv`，改完執行 `tools/csv-to-js.ps1` 重新產生 `config-gear-catalog.js`（腳本存成 UTF-8 BOM）。
- 每部位 50 種的管道固定（可製作 : 外界 = 3 : 7），每個管道內五行平均：

  | 管道 key | 每部位 | 取得方式 |
  |---|---|---|
  | `craft1` 凡俗宗門 | 5 | 鍛造閣 10～100 等 |
  | `craft2` 修真宗門 | 5 | 鍛造閣 200～500 等 |
  | `craft3` 至高宗門 | 5 | 鍛造閣 700～1000 等 |
  | `loot` 奪寶 | 5 | 野外修士、暗殺者、懸賞伏誅掉落（`tryLootDrop`，機率見 `LOOT_DROP`） |
  | `auction` 拍賣 | 5 | 千寶閣刷新格 |
  | `realm` 秘境 | 25 | 30 組套裝全在這裡。2026-09-27 起**開放**：秘境「魔屠天南」守城掉落部件（一次一件，第 49 節）；收藏類稱號仍不含秘境（`getTitleGear`） |

- 外界管道（`external: true`）四維 × `GEAR_EXTERNAL_MULT`(1.15)，隨機詞條只抽範圍上半段。
- 命名：凡俗→修真→至高 由樸素到神話；奪寶血煞風；拍賣珍寶風；秘境上古神話風，含原著名：青竹蜂雲劍、金蚨子母刃、乾藍冰焰扇、風雷翅。

### 一件裝備的五層能力
1. **四維**：基數（鍛造／奪寶／千寶閣（2026-09-27 起）= 裝備等級 × 5 × 品級倍率）× 該裝備的**四維模板**（`GEAR_TEMPLATES` 8 種，係數合計 2.0；飾品再 ×1.25）。
2. **主詞條**：武器 = 五行對應屬性傷害、防具 = 減傷（盔甲 ×1.5）、飾品 = 閃避，數值依品級。
3. **隨機詞條**（`eq.subs = [[key, 值], …]`）：取得時抽一次，條數 白 0／綠 1／藍 2／紫 2／橙 3／白金 4，從 24 種抽（`gearSubAffixes`）。
4. **特效**：每種裝備 1 個（38 種，`gearEffects`），**紫色以上才生效**，白～藍灰色顯示；紫 ×1、橙 ×1.5、白金 ×2，同名多件相加到 `cap`。
5. **套裝**：秘境裝備中 30 組 × 6 件（名字共用前綴），只算紫色以上件數，2／4／6 件加成（`config-sets.js`）。

### 六個品級
白／綠／藍／紫／橙沿用 `equipQualities`；**白金（先天道器）** 是 `PLATINUM_QUALITY`（倍率 12、主詞條較高），**只能由橙色 +20 進化**，
不在 `equipQualities` 內 → 不會出現在鍛造、千寶閣抽選與依品級批次刪除中。名稱前加「先天・」，`.quality-白金` 銀白流光。

### 特效的實作位置（改效果時照這張表找）
| 類別 | 特效 | 位置 |
|---|---|---|
| 每擊倍率 | 首擊、燃魂、斬殺（＋稱號本命五行、套裝閃避後強擊） | `gear.js` 的 `getGearHitMult()`，由 `combat.js` 的 `playerAttackTurn` 呼叫 |
| 命中判定 | 破甲、洞察、剋敵、寒徹、焚燼、蝕骨 | `getPlayerCombatAttrs()` 帶欄位 → `elements.js` 的 `resolveHit()` |
| 命中連鎖 | 冰封、連雷、毒爆（＋套裝屬性強擊） | `applyGearHitChain()` |
| 出手 | 法爆、聚靈、吸血、追擊、橫掃、疾風（＋套裝之怒、技能連發） | `playerAttackTurn()` |
| 受擊 | 金身（妖獸／一般攻擊）、化勁（修士、心魔、懸賞人物的武學）、反震、閃擊 | `applyGearDefense()`（野外、渡劫、懸賞對決） |
| 防禦 | 護體、先手盾、定神 | `getPlayerCombatAttrs()` |
| 回復 | 回春、回靈 | `applyGearRegen()`（與靈根回復一起） |
| 其他 | 噬魂、聚財（combat.js 擊殺）、延壽（lifespan.js）、丹心（combat.js／bag.js 丹藥）、悟道（leveling.js）、積德（merit.js、bounty.js）、役使（quest.js）、獸魂（beast-combat.js）、通玄（library.js）、奪寶（gear.js）、尋鐵（enhance.js） | 各檔以 `gearFx("名稱")` 取值 |

- 「首擊」「先手盾」「套裝不死」以**每波**計算：`resetGearWave()` 在野外刷新一波、渡劫、懸賞對決開打時呼叫；`gearWaveRound` 在 `playerAttackTurn` 開頭 +1。
- 聚財只影響線上野外靈石；離線不套用。

### 加成彙總 `getBonusTotals()`（gear.js）
隨機詞條＋套裝＋稱號＋職業被動＋天下異火收錄（第 38 節）＋出戰夥伴被動（第 39 節）全部用同一組 key 加總，各處只讀這一個函式：
`statPct/strPct…` 四維 %（`getEquipBonus` 以「本身＋裝備」總量計）、`atkPct/physPct/magPct/hpPct`（`getGearPctBonus` → stats.js）、
`def/eva/…` 百分點、`cap:屬性` 上限、`fx:特效名`（併入 `getGearEffects`，不受特效上限）、`elemDmg:五行`、`elemBoost:屬性`、`enhanceChance`、`special:名稱`。

### 強化、進化、分解（`config-enhance.js`、`enhance.js`）
- 從背包或角色裝備卡片「🔨 強化」開 `#enhance-modal`。每 +1 四維 +5%（+20 = ×2，`getEnhanceMult`），上限 白綠 +10、藍 +12、紫 +15、橙／白金 +20。
- 每次花費：星允鐵 = 目標等級 × 係數（白 1 綠 1 藍 2 紫 3 橙 5）、靈石 = 目標等級 × 5 萬；+11 起有成功率（90%→30%），
  **失敗不掉級不毀裝**，同一級每失敗一次 +5%（`eq.enhancePity`，成功歸零）。期望花費：紫 +15 約 410 顆、橙 +20 約 1,630 顆。
- 進化：橙色 +20 ＋ 300 星允鐵 ＋ 1,000 萬靈石 → 白金，四維 ×1.5、主詞條換白金值、多抽 1 條詞條、保留 +20。
  - **+20 系統通知**（2026-09-26）：`enhanceEquip()` 強化成功且 `canEvolve(eq)` 時呼叫 `promptEvolveEquip(eq)`：寫一筆日誌，
    資源足夠 → `confirm` 詢問是否進階先天道器，確定就 `evolveEquip(true)`（`skipConfirm`，不再問第二次）；
    資源不足 → `alert` 列出缺少的星允鐵／靈石。選取消或不足時，之後仍可在強化視窗按「✨ 進化為先天道器」（`evolveEquip()` 無參數 = 照常確認）。
- 分解：白～紫 → 碎鐵（10/20/40/80，每 500 自動合成 1 顆星允鐵，可一鍵分解勾選品級）；橙 3 顆、白金 15 顆星允鐵，**只能逐件手動**（白金要按兩次確認）。穿戴中、🔒 鎖定中的不能分解（一鍵分解會略過鎖定，見第 9 節「裝備鎖定」）。

### 暫存區（`player.gearStash`，上限 50）
- 只有**奪寶掉落**走 `receiveLootEquip()`：背包有空位 → 背包；背包滿 → 橙色以下自動分解成碎鐵、橙色以上進暫存區。
  鍛造、千寶閣、卸下裝備仍是背包滿就擋（`hasEquipInventorySpace`）。
- **暫存區滿了不能外出練功**：`changeMap` 擋下、`combatTick` 每秒 `enforceGearStashLimit()` 送回宗門、離線結算改在宗門靜修（`settleIdleSeconds`）。
- 背包頂端顯示暫存區（移入背包／分解／毀棄）。

### 星允鐵來源
| 來源 | 數值 | 位置 |
|---|---|---|
| 礦脈採礦（傳說僕從，只在線上） | 每趟 2% 得 1～2 | `servant.js` 的 `tickServantQuests` |
| 野外修士（敵對陣營） | 20% 得 1 | `combat.js` |
| 暗殺者 | 必得 1～3 | `combat.js` |
| 懸賞伏誅 | 人榜 1～5、地榜 5～12、天榜 12～20 | `bounty.js` 的 `endBountyDuel` |
| 千寶閣常駐 | 每顆 30 萬靈石，每日限購 10（`player.ironShop`） | `enhance.js` 的 `renderIronShopSection` |
| 千寶閣刷新格 | 每格 5% 星允鐵袋 10～30 顆，每顆 40 萬靈石＋20 聲望 | `auction.js`（`kind: "ironBag"`） |
| 分解碎鐵 | 每 500 碎鐵 1 顆 | `addIronShards` |

「尋鐵」特效與收益套裝會提高 `addStarIron` 的數量（千寶閣購買與分解不套用）。

### 職業（`config-profession.js`、`profession.js`）
- 6 職業對應 6 武器：劍修（劍）、刀修（刀）、扇修（扇）、弓修（弓）、音修（笛）、符修（筆）。在天磯錄「職業」分頁選主修，第一次免費、之後每次 10 萬靈石，各職業熟練度分開保存。
- 熟練度只加在主修：野外每擊殺 +1 × 地圖分類倍率（1～4）、懸賞伏誅 +200、離線 ×0.5。10 階門檻 0／500／3,000／1 萬／2.5 萬／6 萬／12 萬／25 萬／50 萬／100 萬。
- 主修武器（該部位那一件）四維 +3%～+30%（`getProfWeaponMult`）；職業被動每階累加（`getProfessionPassive`）；第 5／8／10 階各解鎖一招職業技能，每回合出手後依機率自動發動（`professionSkillTurn` → `artifact.js` 的 `castProcSkill`）。
- 階級名稱：劍童 劍徒 劍癡 劍狂 劍魔 劍王 劍尊 劍神 劍仙 劍帝；刀修頂階刀皇、扇修風帝、弓修弓帝、音修樂帝、符修符祖（完整表在 `professions[].ranks`）。

### 天磯錄（`codex.js`，入口：洞府寶塔右側山峰，手機熱點與 PC `pcStageButtons` 的 `codex`）
- 收藏以「種」計：`player.gearCodex[gearId]` 記錄取得過的品級；取得任何圖鑑裝備時由 `createGearEquip`／進化呼叫 `recordGearCollected`，舊存檔讀檔時 `migrateGearCodex` 補記。
- 分頁：器錄（依部位，未取得顯示「？？？」＋ 6 顆品級星）、套裝、**異火**（天下異火榜，`strange-fire.js` 的 `renderCodexFires`，第 38 節）、稱號、職業。
- `describeTitleBonus()` 是稱號、異火、夥伴共用的加成文字函式；新增 bonus key 時要在它的 `labels` 補上中文名。
- **稱號** 60 個（`config-titles.js`：收藏 8、分類部位 9、五行 5、品級強化 9、境界 10、宗門職位 6、其他 3、帝級職業 6、賭運 4（第 40 節））。
  `updateUI()` 每秒 `checkTitleUnlocks()`；加成永久生效、全部疊加（`getTitleBonusTotals`）；可選一個顯示在道號旁（`player.activeTitle`，`'prof'` = 顯示職業階級，`getNameTag` → HUD `#hud-title`/`#pc-hud-title`）。
  「全收」類條件一律不含尚未開放的秘境裝備。宗門職位稱號名稱帶目前宗門（`{sect}`），加成用「技能傷害」（遊戲沒有區分宗門技能）。

### 舊存檔相容
- `migrateGearIds()`（讀檔時）：沒有 `gearId` 的裝備依「部位＋五行」對應——有 `level` 的對到該等級的可製作清單、沒有的對到拍賣清單，**數值不變**（每個管道每種五行只有一件，結果固定）；
  靈寶閣寶物不轉換（沒有 `lingbaoId` 的舊寶物依屬性比對補上），卡片顯示靈寶閣商品名。
- 舊裝備沒有 `subs`／`enhance`，視為無詞條、+0。新欄位由 `DEFAULT_PLAYER_JSON` 補預設值。

### 驗證紀錄（2026-09-26，本機 HTTP 伺服器實際執行）
- 850 種全部展開、名稱不重複；鍛造 10／300／1000 等各抽到對應宗門清單；千寶閣抽拍賣清單。
- 17 格穿滿帶特效的橙裝在野外跑 200 回合：追擊、橫掃、反震、閃擊反擊、回復、套裝之怒、職業技能皆有觸發，無錯誤。
- 強化到 +20 → 進化白金（四維 ×1.5、4 條詞條）；稱號自動解鎖；背包滿時奪寶 → 碎鐵／暫存區，暫存區滿被送回宗門且不能進野外。
- 舊存檔（無新欄位、無 gearId）讀檔正常；懸賞對決、渡劫、離線結算皆無錯誤。
## 38. 異火碎片與天下異火（`config-strange-fire.js`、`strange-fire.js`；2026-09-26）

- **取得碎片**：異火碎片預定由**秘境**掉落。秘境尚未開放（第 37 節 `realm` 管道 `locked: true`）；**目前唯一管道是天星賭坊的賭星隕石**（第 40 節，仙品隕石另有 1% 直接切出整朵異火）。
  秘境實作時，掉落處呼叫 `addFireShards(數量, "來源文字")`（有來源文字時會寫日誌）。
- **合成**：背包的異火碎片卡片有「合成 ×1／合成 最高」按鈕 → `craftStrangeFire(qty)`，每 `STRANGE_FIRE_SHARDS_PER_FIRE`(100) 片合成 1 朵，
  **隨機抽一種天下異火**（`rollStrangeFire`）：先依 `STRANGE_FIRE_TIERS` 的 weight 抽品階，再從該品階平均抽一種。

  | 品階 | 種數 | 機率 | 單種加成量級 |
  |---|---|---|---|
  | 帝焰 | 2 | 1.5% | 攻擊／術法 +5% 級 |
  | 神焰 | 6 | 6.5% | 3～4% 級 |
  | 天焰 | 10 | 14% | 1.5～3% 級 |
  | 地焰 | 14 | 28% | 1～2% 級 |
  | 靈焰 | 18 | 50% | 0.5～1% 級 |

- **兩種效果，計算方式不同**：
  1. **秘境減傷**看「總朵數」`player.strangeFires`（含重複）：每朵 `STRANGE_FIRE_REALM_REDUCE`(3%)，上限 `STRANGE_FIRE_REALM_REDUCE_MAX`(30%)，`getStrangeFireRealmReduction()`。
     ⚠️ **秘境尚未實作，所以減傷目前還沒有生效**。實作秘境時，秘境裡玩家受到的傷害要乘上 `(1 - getStrangeFireRealmReduction())`，只在秘境生效。
  2. **永久加成**看「收錄種類」`player.fireCollection`：每種收錄後加成一次，重複取得不疊加（`getStrangeFireBonusTotals`，併入 `gear.js` 的 `getBonusTotals`）。
     50 種全收的總量：攻擊 +11%、術法攻擊 +8.5%、物理攻擊 +5%、四維 +4.5%、氣血 +8%，外加各屬性傷害與特效。
- **收錄榜**：天磯錄「🔥 異火」分頁（`renderCodexFires`）依品階列出，未收錄顯示「？？？」＋出處＋加成（讓玩家知道在收什麼）；天磯錄頂端統計也列出異火收錄數。
- **存檔**：`player.fireShards`、`player.strangeFires`、`player.fireCollection`（`state.js`）。轉世不會重置。
  `migrateStrangeFires()`（`save.js` 讀檔時）：舊版合成的「未命名」異火（總朵數 > 收錄次數合計），差額補抽成具名異火。
- **資料**：`strangeFireList` 的 `id`（f01～f50）寫進存檔，**上線後不可改 id、不可刪**；名稱、描述、加成可改。檔尾有新增模板。
  bonus key 與稱號相同（見 `config-titles.js` 開頭），新 key 要在 `codex.js` 的 `describeTitleBonus` 補中文名。
- **顯示**：背包（`renderStrangeFireCards()`，兩者皆為 0 時不顯示；異火卡片有「查看異火榜」按鈕 → `openCodexModal('fires')`）。
- 載入順序：`config-strange-fire.js` 放在 `config-spells.js` 之後、`strange-fire.js` 放在 `talisman.js` 之後。`strange-fire.js` 載入時會建 `strangeFireById`（只讀同組設定檔），其餘沒有順序限制。

## 39. 情緣・諸天夥伴（`config-partners.js`、`partner.js`；2026-09-26，好感度與隊伍 2026-09-27）

- **入口**：洞府底部導覽「情緣」（手機 `index.html` 的 nav 按鈕、PC `config-home-pc.js` 的 `boost` 按鈕）→ `openPartnerModal()`，視窗 `#partner-modal`。
- **人物**：44 位名動諸天的高手（至高 11、帝境 17、尊者 6、天驕 10），每位都標註來歷：
  - `native: true`（本界人物，出自《凡人修仙傳》）：道祖韓立（id `hanli`，至高 96.0）、大羅境南宮婉（id `nangongwan`，帝境 91.7）（2026-09-26 玩家指定）、紫靈（天驕）與下列兩位。
    - 「亂星海第一大善人」風希（id `dashanren`）：九級化形妖獸裂風獸，反派，評級尊者。
    - 厲飛雨（id `lifeiyu`）：死後輪迴，於靈界轉世為魔界天煞聖皇石空徹（石穿空之父），戰力以轉世後計，評級尊者。
    （2026-09-26 依玩家提供的原著設定修正；id 不變，舊存檔不受影響）
  - 羅峰（id `luofeng`）：稱號由「時間領主」改為「渾源領主」（人稱羅城主），戰力以渾源領主時期計，綜合 97.7，為目前最高（2026-09-26 玩家修正）。
  - 其餘皆為 **🌌 域外神明**，卡片寫「來自《作品》（作者）的某世界」：蕭炎、林動、牧塵（天蠶土豆）、辰南、葉凡、狠人大帝、無始大帝、段德、鬥戰聖皇、虛空大帝、恆宇大帝、青帝、西皇母、阿彌陀佛大帝、石昊（辰東）、唐三（唐家三少）、羅峰、秦羽、林雷（我吃西紅柿）、王林、孟浩、白小純（耳根）、張小凡（蕭鼎）、李七夜（厭筆蕭生）。
  - 2026-09-26 玩家指定新增：洪、雷神（《吞噬星空2》，永恆真神境，至高）、情緒之神霍雨浩（《斗羅大陸II絕世唐門》，帝境）、
    毀滅之神唐舞麟、生命之神古月娜（帝境）、創世之神唐軒宇（至高）（《斗羅大陸IV終極斗羅》）。
  - 天驕級（綜合 < 82）：奧斯卡、馬紅俊、寧榮榮（《斗羅大陸》，以史萊克七怪時期計）、小醫仙（《鬥破蒼穹》）、紫靈（《凡人修仙傳》，本界）；
    2026-09-27 玩家指定新增 5 位《吞噬星空》人物（皆以地球／前期計）：徐欣 `xuxin`（女，輔助回血減傷）、秦霜 `qinshuang`（女，單體凍結）、
    巴巴塔 `babata`（修為／悟性、回靈）、金角巨獸 `jinjiao`（減傷＋群體物理）、摩雲藤 `moyunteng`（吸血）。天驕共 10 位，於秘境「魔屠天南」第 51 波起有緣相遇（第 49 節）。
    天驕級的絕學以輔助、回復或 1.4～1.6 倍群體為主，強度明顯低於上位夥伴。
- **戰力分析**：六維 0～100（攻伐、防禦、身法、神通、底蘊、成長），**平均值**決定評級（`PARTNER_TIERS`：至高 ≥95、帝境 ≥90、尊者 ≥82、天驕），卡片顯示長條圖、綜合戰力、巔峰境界與文字分析。
  視窗註明「戰力分析與評級為本遊戲設定，僅供娛樂」。分析文字為自行撰寫的概述，不引用原著原文。
- **取得（結識）**：
  - **風希是玩家第一個結識的夥伴**（`first: true`）：天星城坊市的風希人偶（`config-towns.js` 的 figures，`action: "talkToPartner('dashanren')"`）
    第一次點 → `meetPartner` 結識並跳出專屬相遇台詞（`lines.meet`），關閉對話框後打開情緣視窗並捲到他；之後每天第一次點 = 每日問候。
  - **彩蛋（2026-09-27）**：當天已問候過後再點風希人偶 → `askPartnerEaster`：「你想看我跳支舞嗎？」是／否（`partner.easter`）。
    **否** → `reduceBond` 好感 -1、他說「哼！不識好歹……」（💔 反感；降到熟識以下會自動離隊）；**是** → `playPartnerVideo` 在 `#partner-video-modal` 播放 `videos/fengxi-dance.mp4`（關閉時暫停）。
    **看影片的規則**（`partnerVideoCtx`）：完整看完（`ended` 且實際播放 ≥ 90%，`getPlayedSeconds` 加總 `video.played`，拖曳跳過的不算）→ **只有第一次**好感 +5（`bond.danceWatched` 記錄）並顯示「怎麼樣，風某的舞姿不錯吧？」；
    **沒看完就關掉**（含拖到最後）→ 和選否一樣好感 -1、「看到一半就走？不給面子！」。
    每次點都會問，選否或沒看完可以一直扣（最低 0）。對話框支援選項按鈕：`showPartnerDialog` 的第 5 個參數 `choices`。
  - **影片卡頓修正（2026-09-27）**：實測 GitHub Pages 下載影片約 0.8 Mbps，低於影片碼率約 1.9 Mbps，直接串流會邊播邊停。
    改為 `preloadPartnerVideo(src)` 用 `fetch` 把整部影片下載成 Blob（`partnerVideoCache`，同一次遊戲再看不重下載），`askPartnerEaster` 問問題時就開始下載；
    `playPartnerVideo` 在 `#partner-video-status` 顯示「影片載入中… xx%」，下載完 `onPartnerVideoReady` 才以物件網址播放（播放期間不需網路）；fetch 失敗（如 file://）退回直接播原網址；
    手機擋掉非點擊當下的有聲播放時提示「請按播放鍵」。
    ⚠️ 不要改回「先 play 再 pause 等緩衝」：Chrome 在影片暫停時會停止下載（networkState IDLE），進度卡住；`canplaythrough` 在慢網路也估得太樂觀（1 Mbps 模擬仍卡 4 次）。
    同日也把影片壓小：原檔 1280×720／1.78 Mbps／3.9 MB → 854×480／0.52 Mbps／1.35 MB（畫面比對 PSNR 37 dB），慢網路的等待時間約剩 1/3。
    轉檔**不需要 ffmpeg**：用 Windows 內建 Media Foundation（PowerShell 呼叫 WinRT `Windows.Media.Transcoding.MediaTranscoder`，H.264 Main），
    但它輸出的 `moov` 在檔尾，要再把 `moov` 搬到 `mdat` 前面並把 `stco`/`co64` 的偏移量加上 moov 大小（faststart），直接串流時才能邊下邊播。轉檔腳本不在專案內。
  - 其他人預定於**秘境**相遇：`meetPartner(id, "來源文字")`，重複結識回傳 false。目前天驕級 10 位已可在「魔屠天南」遇見（第 49 節），尊者以上尚無取得管道。
  - 未結識的夥伴仍完整顯示資料；風希顯示「可在天星城坊市遇見他」，其他人「秘境中有緣相遇」。
- **好感度（2026-09-27）**：每位夥伴各自累積好感點數 → 等級 `PARTNER_BOND_LEVELS`：

  | 等級 | 名稱 | 所需好感 |
  |---|---|---|
  | LV1 | 初識 | 0（結識時） |
  | LV2 | 略有好感 | 100 |
  | LV3 | 友好 | 300 |
  | LV4 | **熟識**（可邀請入隊） | 700 |
  | LV5 | **道侶**（與玩家異性）／**結拜**（同性） | 1,500（上限） |

  - LV5 名稱依 `partner.gender`（`"f"` = 女，省略 = 男；目前女性：狠人大帝、西皇母、古月娜、南宮婉、小醫仙、寧榮榮、紫靈）與 `player.gender` 判定（`getBondLevelName`）。
  - **每日問候** `greetPartner`：每位每天一次 +20，跳出台詞對話框（有 `lines.greet[等級]` 用專屬台詞，否則用 `PARTNER_GREET_LINES`，`{me}` = 玩家道號）。
  - **贈禮** `giftPartner`：每次 +15，花靈石 `PARTNER_GIFT_COST`（天驕 10 萬／尊者 50 萬／帝境 200 萬／至高 500 萬），每位每天 5 次。
  - **情緣任務**（`PARTNER_BOND_QUESTS`，依目前等級接取，每位同時一個，完成後領取大量好感）：
    LV1「並肩歷練」野外擊殺 300（+80）→ LV2「斬妖除魔」斬殺修士 10（+150）→ LV3「共赴懸賞」懸賞伏誅 3（+250）→ LV4「生死與共」帶他在隊伍中擊殺 1,000（+500）。
    進度 = 接取後的增量：`player.fieldKills`（`combat.js` 擊殺後呼叫 `onPartnerFieldKills`，只算線上）、`evilKills`、`bountyKills`、各夥伴的 `teamKills`（只有在隊伍中才累計）。
  - 光靠問候＋每日贈禮約 7～8 天到熟識，情緣任務可大幅縮短。
- **隊伍**（取代舊版單人出戰）：好感 LV4「熟識」才能 `togglePartnerTeam` 邀請入隊，**最多 `PARTNER_TEAM_MAX`(2) 名**（`player.partnerTeam`）。
  - 被動：隊伍中每位的 `passive` 都併入 `getBonusTotals`（`getPartnerBonusTotals`）；**LV5 ×1.2**。
  - 招牌絕學：玩家每回合出手後 `partnerSkillTurn` 讓隊伍中每位各自依 `skill.chance`（**LV5 +2%**）判定，由 `artifact.js` 的 `castProcSkill` 執行，**傷害以主人的攻擊力為基準**。
    野外（`combat.js`）、渡劫（`tribulation.js`）、懸賞對決（`bounty.js`，封印擋不住）都會觸發；被凍結的回合不會發動（在玩家出手的分支內）。
  - 數值平衡：依評級（至高 18%・×3.0／帝境 17%・×2.6／尊者 16%・×2.2／天驕 15%・×1.8 左右；群體技倍率較低、附帶效果的倍率也較低），與神器技能同一量級。兩人同時入隊約是舊版單人出戰的兩倍戰力。
- **情緣視窗**：分頁 全部／已結識／隊伍／各評級；已結識的排前面。已結識的卡片下方有好感區塊（等級、進度條、問候、贈禮、情緣任務、入隊／離隊）。
  `openPartnerModal(id)` 帶 id 時切到「已結識」並捲到該卡片。對話框 `#partner-dialog-modal`（`showPartnerDialog`／`closePartnerDialog`）。
- **存檔**：`player.partners`（已結識）、`player.partnerTeam`（隊伍）、`player.partnerBond`（`{ id: { pts, greet, giftDate, gifts, quest: { lv, base }, teamKills, danceWatched } }`）、`player.fieldKills`（`state.js`）。轉世不會重置。
  讀檔時 `save.js` 呼叫 `migratePartners()`：補齊欄位；舊版 `activePartner`（單人出戰）若好感已達熟識則放進隊伍，然後刪除該欄位。
- **新增夥伴**：照 `config-partners.js` 檔尾的模板複製一段；`id` 寫進存檔，上線後不可改。評級由六維平均自動算出，被動與絕學請對照 `PARTNER_TIERS` 的 `hint` 維持平衡。
- 載入順序：`config-partners.js` 在 `config-strange-fire.js` 之後、`partner.js` 在 `strange-fire.js` 之後。`partner.js` 載入時會建 `partnerById`（只讀 `partnerList`）。
## 40. 天星賭坊（`config-casino.js`、`casino.js`；2026-09-26）

- **入口**：天星城坊市（城內場景，第 20 節）右側雕花石拱門的傳送點 → `openCasinoModal()`。只在 `CASINO_TOWN`（天星城）營業，所有花費前 `checkCasinoSpend` 都會再檢查人是否在天星城。
- **定位**：靈石回收管道，長期期望值略低於投入、偶爾大賺。實測（2 萬次模擬）：

  | 玩法 | 回收率 |
  |---|---|
  | 凡品隕石（10 萬）／靈品隕石（100 萬）／仙品隕石（1,000 萬） | 約 82% ／ 82% ／ 78%（依 `CASINO_VALUE` 估值） |
  | 擲骰：大／小 | 約 97%（遇豹子算莊家贏，莊家優勢約 2.8%） |
  | 擲骰：押總點 | 約 88% |
  | 擲骰：任意豹子（1 賠 24）／指定豹子（1 賠 150） | 約 70%（高賠率高風險，比照骰寶） |

### 賭星隕石
- 三種隕石，每次「切 1 顆」或「切 10 顆」。結果依 `casinoStones[].odds` 權重抽：廢石、靈石、碎鐵、礦石、星允鐵（含「礦脈」大量）、異火碎片、紫／橙裝備、**整朵天下異火**（只在仙品，1%）。
- 發放：靈石直接加；碎鐵 `addIronShards`；礦石 `player.ore`；星允鐵 `addStarIron`（套用尋鐵）；異火碎片 `addFireShards`；
  裝備 `tryLootDrop('casinoPurple' | 'casinoOrange')`（`config-gear.js` 的 `LOOT_DROP`，走奪寶清單與背包滿的暫存區規則）；整朵異火 `rollStrangeFire` + `gainStrangeFire` 並 `player.strangeFires++`。
- **賭坊是異火碎片目前唯一的取得管道**（秘境尚未開放，第 38 節）。
- 切 1 顆有分段演出（`CASINO_CUT_LINES` 挑 2 句，每句 0.45 秒）再顯示結果；切 10 顆直接列出。演出中 `casinoBusy` 擋連點（結果在演出前已發放完畢）。

### 擲骰比大小
- 三顆骰子，一次押一種：大、小、任意豹子、指定豹子（選 1～6）、押總點（4～17，賠率 `CASINO_TOTAL_PAYOUT`）。`payout` 是淨贏倍數，中了拿回 `押注 × (payout + 1)`。
- 押注：最低 `CASINO_DICE_MIN_BET`(1,000)、單把最高 = 每日上限 × `CASINO_DICE_MAX_RATIO`(20%)；有 +1 萬／+10 萬／+100 萬／+1 千萬／上限／清除快捷鈕。
- 骰子滾動演出 8 格 × 70ms。

### 防呆與紀錄
- **每日下注上限**（買隕石與擲骰合計，每天 0 點重置）依境界：`CASINO_DAILY_LIMIT_BY_REALM`（凡人 100 萬 → 混沌道祖 50 億）。
- **大額二次確認**：單次花費 ≥ 目前靈石的 `CASINO_CONFIRM_RATIO`(25%) 時 `confirm`。
- **紀錄**（`player.casino`，`getCasinoState` 補欄位並跨日重置今日數據）：今日已下注、今日輸贏（估值）、今日最大收穫；累計切石、切出整朵異火、擲骰次數、押中指定豹子、擲骰單把最大淨贏。
  視窗頂端顯示今日數據，「📜 紀錄」分頁顯示全部與賭運稱號進度。輸贏以 `CASINO_VALUE` 估值（星允鐵 30 萬、異火碎片 3 萬、紫裝 100 萬、橙裝 500 萬、整朵異火 3,000 萬），只影響顯示。

### 賭運稱號（`config-titles.js`，條件在 `codex.js` 的 `isTitleConditionMet`）
| 稱號 | 條件 | 加成 |
|---|---|---|
| 賭石大家 | 累計切石 100 顆（`casinoStones`） | 野外靈石 +2% |
| 天選之人 | 切出整朵異火（`casinoFire`） | 裝備掉落率 +10% |
| 豹子頭 | 押中指定豹子（`casinoTriple`） | 四維 +1% |
| 一擲千金 | 擲骰單把淨贏 ≥ 1 億（`casinoBigWin`） | 野外靈石 +2% |

- 圖示：隕石用 🌑／🌗／☄️（2026-09-26 原本的 🪨 在部分裝置顯示成方框，已換掉；新增 emoji 時避免太新的字元）。

## 41. 數字顯示格式（`format.js`；2026-09-27）

- **起因**：玩家反映「10,000,000」這種金額太長不好讀。全遊戲原本用 `.toLocaleString()` 加千分位（約 260 處，分散在 33 個檔案）。
- **做法**：新增 `data/format.js`（第一個載入），定義 `fmtNum(n)`，並替 `Number.prototype`／`String.prototype` 加上不可列舉的 `toWan()`；
  全部 `.toLocaleString()` 一次換成 `.toWan()`，所以金額、價格、經驗、戰力、數量等大數字都統一格式。

  | 數值 | 顯示 |
  |---|---|
  | 9,999 以下 | 照舊千分位：`9,999` |
  | 1 萬～1 億 | `1萬`、`1.5萬`、`12.35萬`、`123.5萬`、`1000萬`、`1235萬` |
  | 1 億～1 兆 | `1億`、`1.5億`、`12.35億`、`500億` |
  | 1 兆以上 | `3兆` |

  小數位數：該單位下的值 < 100 → 2 位、< 1000 → 1 位、其餘整數；尾端 0 省略；**不加千分位逗號**（`1000萬` 而不是 `1,000萬`）；進位滿 1 萬會升單位（`9999.99萬` → `1億`）；負數保留負號。
- **注意**：
  - **新寫的顯示一律用 `.toWan()` 或 `fmtNum()`**，不要再用 `.toLocaleString()`（`format.js` 內部除外）。
  - 顯示是近似值（例 123,456,789 → `1.23億`）；需要精確數字的地方（輸入框的 value、存檔）本來就用原始數字，不受影響。
  - 洞府 HUD 另有 `home-ui.js` 的 `formatShortNumber`（1 位小數，版面較窄），維持不變。
  - `String.prototype.toWan` 是保險：萬一對字串呼叫，數字字串照樣格式化、非數字原樣回傳，不會報錯。

## 42. 天下戰力榜（`config-leaderboard.js`、`leaderboard.js`、`tools/firestore.rules`；2026-09-28）

- **目的**：讓所有玩家互相比較戰力。這是專案**第一個連網功能**：後端用 Firebase Firestore（免費 Spark 方案）＋匿名登入，
  前端仍是純靜態 GitHub Pages，不需要建置工具。
- **目前狀態（2026-09-28 已開通）**：Firebase 專案 `k5596101`（擁有者 k559610142@gmail.com）、網頁應用程式 `xiuxian-web`、Firestore 地區 asia-east1、匿名登入已啟用、規則已發布。
  本機實測通過：匿名登入、上傳、讀榜；改別人資料／戰力 1e30／多塞欄位／60 秒內重複上傳皆被規則擋下（permission-denied）。
  測試時在榜上留下一筆「韓立／戰力 55／凡人 1 階」，可到主控台 Firestore → leaderboard 手動刪除。
- **關閉方式**：`LEADERBOARD_FIREBASE_CONFIG = null` → 不載入 SDK、不連網、不上傳；點 HUD 戰力只顯示「尚未開通」。

### 開通步驟（管理者做一次）
1. 到 https://console.firebase.google.com 建立專案（可關閉 Google Analytics）。
2. 「Authentication」→ 登入方式 → 啟用 **匿名**。
3. 「Firestore Database」→ 建立資料庫（正式版模式、地區選 asia-east1 台灣）。
4. Firestore →「規則」→ 整份貼上 `tools/firestore.rules` → 發布。
5. 專案設定 → 一般 → 新增「網頁應用程式」→ 把 `firebaseConfig` 物件貼到 `data/config-leaderboard.js` 的 `LEADERBOARD_FIREBASE_CONFIG`。
6. 建議：Authentication → 設定 → 授權網域，確認有 GitHub Pages 的網域（`xxx.github.io`）。
- apiKey 等設定本來就是公開資訊，安全性由規則負責；**改規則後一定要在主控台重新發布**。

### 資料流
- `initGame()`（main.js）→ `startLeaderboardSync()`：進遊戲 15 秒後上傳一次，之後在線時每 5 分鐘一次。
- 打開榜單（`openLeaderboardModal`）→ `refreshLeaderboard()`：先 `uploadLeaderboard()`（距上次 < 60 秒自動略過），再讀前 100 名（依 power 由高到低）。
  視窗有兩個分頁（2026-09-27）：🏆 戰力榜／🏯 死守天南城通關榜（第 49 節），`refreshLeaderboard` 只讀目前分頁的榜。
- Firebase SDK（compat 版，`LEADERBOARD_SDK_BASE`）在第一次需要時才用 `<script>` 動態載入，app／auth／firestore 三支**逐一檢查、缺哪支補哪支**（避免上次只載入一半），失敗會在下次重試；上傳失敗只 `console.warn`，不影響遊戲。
- 斷線時 Firestore 的 `set()` 要等連回伺服器才完成：開榜單時上傳與讀取各用 `lbWithTimeout()` 最多等 `LEADERBOARD_TIMEOUT_MS`(8 秒)，逾時顯示「連線失敗」，不會卡在「讀取中」。
- 2026-09-28 以線上真實資料（39 名玩家，境界 0～15）檢查規則的戰力上限：最高只用到上限的 0.00008%，正常玩家不會被擋。
- 集合 `leaderboard`，**文件 id = 匿名登入 uid**（存在瀏覽器 IndexedDB，同一瀏覽器永遠同一筆）。欄位：
  `name`(道號，sanitizePlayerName)、`power`、`realm`(realmIndex)、`stage`、`level`、`sect`(宗門名稱，可空)、`hist`(最近 24 次上傳的 `{p: 戰力, t: 時間}`，規則強制，第 50 節)、`hist2`(兩日紀錄：上一筆距 hist2 最後一筆 ≥ 30 分鐘才接上，保留 96 筆 ≈ 2 天，規則強制；2026-09-27)、`updatedAt`(伺服器時間)。
- hist2 的 30 分鐘判斷用 Timestamp 的秒＋奈秒精確相減（`lbTsDiffNanos`，BigInt），與規則 `o.updatedAt >= last.t + duration(1800s)` 完全一致，避免毫秒誤差讓寫入被擋。
  採「放在同一筆資料」：不增加寫入次數；代價是每筆多約 4～6 KB，開一次榜單（100 筆）多下載約 0.5 MB。玩家變多、流量成問題時再改成另開集合。
- 上傳前先 `get({ source: 'server' })` 讀自己那筆（每次上傳多 1 次讀取），把上一筆的 power／updatedAt 接到 `hist` 尾端再 `set()`；斷線讀不到就略過這次。
- 不上傳的情況：`gameOver`、`saveLoadFailed`（讀檔失敗時畫面上的角色不是真的）、尚未 `gameStarted`。

### 榜上的戰力
- `getRankPower()` = 畫面上的「戰力」（`getPhysAttack()`），但除掉**暫時性**倍率：禁術 `buffMult`、靈寵增益 `petBuffMult`、懸賞對決化功。渡劫失敗的虛弱**有算**（是實際狀態）。
- 若日後改了戰力公式（例如改成物攻法攻取高），只改 `getRankPower()` 即可；規則的上限也要檢查是否仍合理。

### 基本防作弊（`tools/firestore.rules`）
- 只能寫自己 uid 的那筆；玩家不能刪除（管理者可以，第 50 節）；讀取單次最多 100 筆（保護免費額度，管理者不限）。
- 欄位白名單與型別／範圍：道號 1～12 字、宗門 ≤ 20 字、境界 0～15、階 1～10、等級 1～10000。
- 戰力上限（2026-09-27 收緊）＝ `10^境界 × 階 × 7 × 200 ＋ 等級 × 20 萬`（基礎值 200 倍＋裝備額度）。原本的 `10^(境界+9)` 太寬，
  曾讓「化神 3 階、Lv.10000、戰力 63 兆（基礎值 3000 萬倍）」通過；新上限下線上其餘 99 位正常玩家最高只用到 4.66%。細節見第 50 節。
- 被 GM 封鎖（`banned/{uid}` 存在）的 uid 不能再建立／更新紀錄；遊戲 `checkLeaderboardBan()` 查到被封就停止上傳，榜單視窗顯示「已被移出戰力榜」。
- 同一筆兩次寫入至少間隔 60 秒（`updatedAt` 必須等於伺服器時間）。
- 上傳歷史 `hist`（最近 24 次）與 `hist2`（每 30 分鐘、約 2 天）由規則 `nextHist()`／`nextHist2()` 強制接續（不能改、不能清），供 GM 比對戰力暴增與守城審核（第 50 節）。
- **限制**：戰力在玩家端計算，會改存檔的人仍可灌分；要更嚴格得改成雲端函式重算（需付費方案），目前不做。
- 已知現象：換裝置／清除瀏覽器資料／無痕視窗會拿到新 uid → 同一角色可能有多筆；舊筆不會自動刪除（顯示「N 天前」更新時間讓人分辨）。可用 GM 後台（第 50 節）刪除重複或久未更新的紀錄。

### 畫面
- 入口：
  - 洞府 HUD 的「戰力 N 🏆」（手機 `#hud-name .hud-power`、PC `#pc-hud-name .pc-power`，class `lb-entry`；padding＋負 margin 放大點擊範圍）。
  - 洞府「大道石碑」熱點（2026-09-28）：升仙台與天磯錄之間。背景圖上沒有石碑，由牌匾樣式 `.plaque-stele`（index.html，灰石漸層、圓頂、金字，置中於熱點）畫出；
    手機座標在 index.html `#home-hotspots`（第 31 節表格），PC 在 `config-home-pc.js` 的 `stele`（第 34 節表格）。
- 視窗 `#leaderboard-modal`：自己的戰力與名次（未進前 100 顯示「未進前 100 名」）、前 100 名（前三名獎牌、自己那列 `.lb-self` 高亮、境界階數／等級／宗門、多久前更新）、重新整理（冷卻 10 秒）。
- 其他玩家的道號／宗門一律經 `lbEscape()` 才插入 innerHTML（資料來自網路，不能信任）。
- 額度估算（Spark 免費：每日 5 萬讀、2 萬寫）：每位在線玩家每小時 12 次寫入 → 約 1,600 玩家小時／日；每次上傳另有 1 次讀取（hist，2026-09-27 起）→ 同樣 1,600 玩家小時約用掉 1.9 萬讀；每開一次榜單約 100 次讀取 → 其餘約 300 次開榜／日。玩家變多時先調長 `LEADERBOARD_UPLOAD_INTERVAL_MS` 或調小 `LEADERBOARD_TOP_N`。

## 43. 秘境入口與鎮魔塔（`config-secret-realms.js`、`secret-realm.js`；2026-09-28）

- **目前範圍：只做入口**（玩家決定玩法之後再定）。活動選單「🌀 秘境」（`config-activities.js`，聲望 5,000＋煉虛）改為 `implemented: true`、`openFn: openSecretRealmModal`。
- **流程**：秘境列表 `#secret-realm-modal`（海報縮圖卡片 `.secret-card`，境界不足顯示 🔒 並變灰）→ 點卡片 → 全螢幕場景 `#secret-realm-scene`
  → 「⚔️ 入塔挑戰」→ 說明視窗 `#secret-realm-info-modal`（標語、介紹、預定獎勵、每日次數、🚧 敬請期待）。場景「↩ 離開」回到秘境列表。
- **場景版面**：海報完整顯示（`.secret-poster` 以 9:16 比例 contain：寬 = min(100vw, 100dvh × 768/1365)），四周用同一張圖模糊（`.secret-scene-blur`）鋪滿，
  所以手機（上下留一點邊）與 PC（左右模糊）都不會裁掉圖上的標題與標語。「入塔挑戰」按鈕在海報內以 % 定位（右側山崖、靠右 4%、高 64%），
  字級 `clamp(14px, min(2.6vh, 4.4vw), 26px)`，窄螢幕不會超出海報（實測 375 寬手機）。
- 海報圖由 `openSecretRealmScene(id)` 依 `secretRealmList[].img` 換上，**新增秘境只要在 config 加一筆**（建議 9:16 直式海報，重要內容放中間）。
- **2026-09-27 起海報比例可逐秘境設定**：`size: [寬, 高]` 寫進場景的 CSS 變數 `--pw`／`--ph`（沒填 = 768×1365）；有 `imgPc` 且視窗寬 > 高時改用 PC 版海報（`sizePc`）。
  `sceneTitle`／`sceneSub` 在海報上疊標題（`#secret-realm-title`，海報沒有字時用）；`enterLabel` 換按鈕文字；`enterPos: 'bottom'` 按鈕移到海報下方置中（`.secret-enter.bottom`）；
  `mode: 'defense'` 時按鈕直接 `openDefenseBattle()`（第 49 節）、`mode: 'tower'`（鎮魔塔，2026-09-27）直接 `openZhenmoTower()`（第 51 節），不顯示說明視窗。
  鎮魔塔在 `ZHENMO_BOSS_READY = false` 期間不扣次數，列表卡片顯示「可入塔・問答試煉」、按鈕不顯示今日次數。
  說明視窗必須排在場景 DOM 之後才疊得上去。
- **已決定、待實作的設計**（記在 config）：
  - 鎮魔塔獎勵：異火碎片（`addFireShards`）、秘境裝備與套裝（gear.js 的 `realm` 管道，目前 `locked: true`）、結識諸天夥伴（`meetPartner`）、靈石／星允鐵等基本資源。
  - 每日挑戰次數 `SECRET_REALM_DAILY_ATTEMPTS`（2026-09-27 改 **3 次**，每個秘境各自計算，失敗也算；實作見第 49 節）。
  - 玩法（爬塔或掛機地圖）尚未決定；實作時把 `implemented` 改 true，並在秘境戰鬥的受擊計算乘上 `1 - getStrangeFireRealmReduction()`（第 38 節）。

## 44. 歷練日誌分頁（戰鬥／道具／僕從）與日誌字級（`ui.js`、index.html；2026-09-28）

- **結構**：戰鬥分頁的「歷練日誌」下有三顆分頁鈕 `.log-tab`（`data-log-tab` = `battle`／`item`／`servant`）與三個捲動框
  `#log-battle`／`#log-item`／`#log-servant`（class `.log-box`，只有 `.active` 顯示）。舊的單一 `#log` 已移除，CSS 一律寫 `.log-box`。
- **分流規則**（`addLog(msg, type, force, channel)`）：
  1. 有傳 `channel`（`LOG_CHANNELS` 之一）就用它；
  2. 否則查 `LOG_CHANNEL_BY_TYPE`：`servant` → 僕從、`equip` → 道具；
  3. 其餘（combat／skill／heal／system／quest／level-up／reincarnate…）→ 戰鬥。
  `type` 仍只決定顏色；每則訊息只進一個分頁。各分頁各自保留最新 `LOG_MAX_ENTRIES[分頁]` 則（戰鬥 150、道具 50、僕從 50），僕從洗版不會擠掉戰鬥訊息。
- **戰鬥細節**：`FIELD_LOG_DETAIL = true`（ui.js）→ 野外逐回合的技能、屬性效果、妖獸攻勢、凍結、持續傷害都會寫進戰鬥分頁（一般攻擊本來就不寫），
  另有每波遭遇與波末彙總。戰鬥分頁因此保留 150 則。見第 33 節末。
- **道具分頁**：`equip` 類（掉寶、鍛造、分解、千寶閣／靈寶閣裝備、符寶）自動進入；另外這些呼叫明確傳 `channel = "item"`：
  星允鐵 `addStarIron`（enhance.js，含僕從挖礦）、千寶閣星允鐵（enhance.js）、星允鐵袋與壽元丹（auction.js）、異火碎片 `addFireShards`、
  丹藥堂購買（shop.js）、七彩補天石凝結與破障丹（merit.js）、靈田收穫（field.js）、賭坊切石（casino.js）。
  **日後新增「獲得道具」的日誌，請傳 `false, "item"`**（type 照舊決定顏色）。
- **僕從分頁**：`servant.js` 的所有日誌（指派、召回、完成、停工、解僱）與 combat.js 救出／小屋已滿的訊息都用 type `servant`。
- **未讀數**：寫入非目前分頁時 `logUnread[channel]++`，分頁鈕上的紅色 `.log-tab-badge` 顯示數量（>99 顯示 99+），切換過去歸零。
- **記住選擇**：`switchLogTab()` 寫入 `localStorage['xiuxian_log_tab']`（裝置偏好、不進存檔，try/catch）；`main.js` 的 `window.onload` 呼叫 `restoreLogTab()` 還原。
- **字級**（玩家反映太小）：改前實測手機 `#tab-sheet` 14px × `#log` 0.82em（≤900px media）= **11.48px**，PC 面板 15px × 0.85em = 12.75px；
  現在 `.log-box { font-size: 0.94em }` → 手機約 **15px**、PC 約 **16px**（字級「中」；整體字級見第 45 節）。
- 驗證紀錄（2026-09-28，本機 PowerShell 靜態伺服器）：戰鬥／系統訊息進戰鬥、星允鐵與掉寶進道具並顯示未讀 2、一鍵解僱日誌進僕從；
  點分頁鈕時按鈕與顯示框一致；鎖定僕從後單獨解僱被擋、一鍵解僱只刪未鎖定的；Console 無錯誤。

## 45. 介面字級（`--ui-scale`、設定視窗「字級」；2026-09-28）

- **基準字級**（字級「中」）：分頁面板 `#tab-sheet` 手機 **16px**（原 14px）、PC **17px**（原 15px）；所有彈窗 `.modal-content` **16px**（原本繼承 body 16px，現在明寫）。
  面板內大多用 em，會一起等比放大；日誌 0.94em ≈ 15px。
- **字級設定**：`:root { --ui-scale: 1 }`，上面三處都寫成 `calc(基準px * var(--ui-scale))`。
  settings.js 的 `FONT_SCALES`：小 0.875（14px）／中 1（16px，預設）／大 1.125（18px）；`setFontScale(id)` 存 `localStorage['xiuxian_font_scale']`（裝置偏好、不進存檔），
  `applyFontScale()` 設定 CSS 變數，`main.js` 的 `window.onload` 開頭呼叫。設定視窗 `#settings-font-scales` 由 `renderSettingsModal()` 產生三顆按鈕。
- **洞府 HUD 不跟字級設定走**（被背景圖上的框限制），改成**最小 11px**：手機 `.hud-realm`／`.hud-level-line`／`.hud-power`／`#hud-stats`／`.hud-bar > em`／`#btn-settings`
  用 `max(11px, calc(var(--u) * N))`，血條高度 `max(14px, …)`、標籤寬 `max(24px, …)`；`#hud-name > *` 行高 1.15 才塞得進名字框。
  PC 版只調 `.pc-power`、`.pc-stat-label`（最小 11px）；PC 狀態條內的數字 `.pc-stat-bar > em` 仍是 10u（條高只有約 10px，放大會被裁切）。
  改前 390px 寬手機實測：戰力／等級約 8～9px、血條數字 7.8px。
- 驗證紀錄：390×844、360×740 手機，以「混沌道祖 10階／戰力 9999.9兆／9999.9兆/9999.9兆」測試，血條數字剛好不溢出、名字框上下只超出約 4px（仍在圖框內）；
  小／中／大切換後面板、彈窗、日誌字級正確，HUD 維持 11px；Console 無錯誤。
- ⚠️ 新增面板或彈窗時字級請用 em，才會跟著字級設定縮放；不要寫死 px。

## 46. 彈窗右上角 ✕（`ui.js` 的 `initModalTopClose`；2026-09-28）

- 玩家反映：所有彈窗的「關閉／離開」都在最下方，內容長（情緣約 14,800px、靈寶閣、宗門、天磯錄…）要捲到底才能關。
- `main.js` 的 `window.onload` 呼叫 `initModalTopClose()`：替每個 `.modal-bg > .modal-content` 最前面插入
  `.modal-top-close-wrap`（`position: sticky; top: 0; height: 0`，不佔版面）＋ `.modal-top-close` 圓形 ✕（34px，絕對定位在右上角）。
  捲動時 ✕ 一直留在視窗右上角（實測捲動 1500px 後位置不變）。
- **✕ 等同按底部的關閉鈕**：`onclick` 會去點該視窗最後一個 `.close-btn` 或 `[data-modal-close]`，所以每個視窗原本的關閉行為
  （例如千寶閣搶拍的「暫時離開」、影片的 `closePartnerVideo()` 會停止播放）都不變。
  「修改道號」的「取消」與風希影片的「關閉」不是 `.close-btn`，已加上 `data-modal-close`。
- 沒有關閉鈕的視窗**刻意不加**：讀檔失敗 `#load-error-modal`（必須三選一）、選性別 `#gender-modal`、情緣對話 `#partner-dialog-modal`（由對話按鈕結束）。目前共 35 個視窗有 ✕。
- ⚠️ 新增彈窗時：底部關閉鈕用 `class="close-btn"`（或加 `data-modal-close`），就會自動有 ✕；不要直接改寫整個 `.modal-content` 的 innerHTML，否則 ✕ 會被清掉。

## 47. 洞府資源框標籤與說明（2026-09-28）

- 玩家問「右上角寶石是什麼」：手機版右資源框的寶石圖示其實是**聲望**（圖上原為「仙玉」），PC 版三格（藍晶／元寶／藍鑽）又是另一種對應，容易搞混。
- **標籤**：`.hud-pill-text::before`／`.pc-pill::before` 以 `content: attr(title)` 顯示「靈石／聲望／獸丹」，絕對定位在資源框左邊（`right: 100%`），
  深色圓角底**蓋住圖上的圖示**，數字維持原本寬度。數字仍由 `updateHomeHud()` 以 innerText 寫入，不影響 ::before。
  資源框原本的 `overflow: hidden` 改成 `overflow: visible` + `clip-path: inset(-4px 0 -4px -60px)`：只裁右側（數字過長仍被截），左側讓標籤伸出去。
  ⚠️ `.pc-pill` 的主規則在後面，overflow／clip-path 要寫在它自己的規則裡，否則會被蓋回 hidden。
- **點擊說明**：資源框 `onclick="showHudResourceInfo('coins'|'rep'|'core')"`（home-ui.js，`HUD_RESOURCE_INFO`），用 `showStageToast` 顯示「💰 靈石 完整數字｜用途」。
  電腦滑鼠停留仍有 title 提示。
- 驗證：390×844 手機「靈石 123萬／聲望 5.6萬」、1376×768 PC「靈石 123萬／獸丹 3,450／聲望 5.6萬」都完整顯示；Console 無錯誤。

## 48. 天磯錄收藏星星顏色（`codex.js`、index.html；2026-09-28）

- 器錄每張卡片下 6 顆星依序代表 白／綠／藍／紫／橙／白金；`player.gearCodex[gearId]` 有該品級就點亮（取得過一次就永久點亮，見第 37 節）。
- 原本點亮時借用 `.quality-*` 文字色：白色與白金都偏白、白金的 `color: transparent` 讓光暈也透明，很難分辨。
  改由 `formatCodexStars(got)` 產生 `.codex-star.on.s0`～`.s5`，六色各自設計（index.html）：
  s0 白 月白 `#e2e8f0`、s1 綠 `#4ade80`、s2 藍 `#38bdf8`、s3 紫 `#c084fc`、s4 橙 `#fb923c`（各帶同色光暈），
  s5 白金 = 青→粉→金的七彩漸層流光（`rainbow-shift` 動畫，減少動態時停止）。點亮的星放大 1.12 倍；未點亮 `#374151`。
- 器錄分頁的部位按鈕下方有圖例 `formatCodexStarLegend()`：「星星＝取得過的品級：★白 ★綠 ★藍 ★紫 ★橙 ★白金」。
- 星星的 title 會寫「（已取得）／（未取得）」。

## 49. 秘境「魔屠天南」・死守天南城 100 波（`config-defense.js`、`defense.js`；2026-09-27）

- **入口**（照鎮魔塔）：活動「🌀 秘境」→ 列表卡片「魔屠天南」→ 全螢幕海報場景（手機版／PC 版海報，標題「魔屠天南」＋「死守天南城・共 100 波」由程式疊上，第 43 節）
  → 海報下方「⚔️ 死守天南城」→ `challengeSecretRealm()` 見 `mode: 'defense'` → `openDefenseBattle()`。開放境界同鎮魔塔（煉虛，`minRealmIndex: 6`）。
- **守城畫面** `#defense-scene`（z-index 101，疊在秘境場景上）：9:16 舞台 `#defense-stage` 置中，四周用 PC 海報模糊鋪滿。
  舞台內：三支 `<video data-clip>`（`#defense-vwrap`，色調 filter 與鏡頭 transform 套在外框）、特效畫布 `#defense-fx`、左上「↩ 離開」＋速度 ×1/×2/×4、右上波數框、中央波次橫幅、左下戰況（最多 4 則）。
- **載入與預計秒數**（`startLoading`）：以 `fetch` 串流下載三支影片，邊下載邊累計位元組；每 0.25 秒更新進度條與「⏳ 影片載入中，預計約 N 秒後開始」。
  速度 = 本次下載量 ÷ 經過時間（資料不足 150 KB 或 0.5 秒時，先用 `navigator.connection.downlink` 估算；都沒有就顯示「計算所需時間…」），剩餘秒數 = 未下載量 ÷ 速度。
  下載完轉成 blob 網址留在記憶體（`blobUrls`），**同一次遊戲再進入不必重新下載**（顯示「影片已就緒」直接開始）。失敗顯示錯誤與「🔄 重新載入」。
  實測（本機以 fetch 限速每秒 5 MB 模擬，共 39.3 MB）：第 1 秒預估「約 7 秒」，實際 8 秒完成，之後每秒遞減 1。
- **100 波組合**（`waveSpec(w)`）：主題 `DEFENSE_THEMES[(w-1)%10]`（色調、天氣、法術外觀、終結技）、影片 `DEFENSE_CLIPS[(w-1)%3]`（與主題錯開 → 30 種搭配）、
  變化 v = ⌊(w-1)/10⌋（0～9）決定開場招式（`DEFENSE_OPENERS`）、鏡頭（`DEFENSE_CAMERAS`）、慢動作與招式名稱（v ≥ 5 的終結技加「・極」）。
  每 10 波首領（`DEFENSE_BOSSES` 依序 10 名）。驗證：100 組 (主題, v) 與 100 組招式名稱都不重複、相鄰兩波主題必不同；三支影片場次 34／33／33。
- **影片輪播**：每支播到剩 `DEFENSE_CLIP_FADE`（0.6）秒時 `setWave(下一波)`＋`playClip`（新影片從 0 秒播放並淡入、舊的淡出後暫停）。第 100 波播完 → 結算「守城成功」（守住波數、斬殺數）＋「↩ 返回秘境」。
  中途「↩ 離開」會 confirm（已守住的獎勵保留、次數已用），並中止下載（AbortController）。
- **每日次數**（2026-09-27）：每個秘境各自每天 `SECRET_REALM_DAILY_ATTEMPTS`（3）次，`player.secretRealmDaily = { date, used: { 秘境id: 次數 } }`（跨日自動重置）。
  `secret-realm.js` 的 `getSecretRealmAttemptsLeft(id)`／`useSecretRealmAttempt(id)`；**影片載入完、守城真正開始時才扣**（`start()`），載入失敗不扣。
  列表卡片顯示「可挑戰・今日 N/3」，場景按鈕「⚔️ 死守天南城（今日 N/3）」（`refreshSecretRealmEnterLabel`）；用完時按鈕跳提示不進入。
- **強度**（2026-09-27 玩家指定，`DEFENSE_MILESTONES`）：第 1 波**煉虛 1 階**、10 合體、20 大乘、30 渡劫、40 仙人初境、50 天仙、60 真仙、70 大羅金仙、80 混元大羅金仙、90 混沌道祖（除第 1 波外皆 10 階）。
  第 1 波原本是煉虛 10 階，測得煉虛 1～9 階（秘境開放境界）一波都守不住，玩家同意改 1 階；里程碑可選填 `stage`。第 1～10 波因此每波約 ×1.67（其後每 10 波 ×10）。
  強度標籤（`waveRealmLabel`）：里程碑波次直接顯示指定境界；其他波次從煉虛起找「不超過該強度」的最高境界階數（某境界 10 階與下一境界 1 階數值相同，保留前者）。
  某境界某階的攻擊 = 懸賞人物同一條曲線（`realmAtk`：修為圓滿基礎戰力 × `getBountyRefSectMult`），氣血 = 攻擊 × 20；里程碑之間**等比例遞增**（`waveAtk`），
  91～100 波沿用 80→90 的倍率繼續往上（第 100 波 = 混沌道祖 10 階 ×10）。畫面與戰況顯示「強度：合體 4 階」（`waveRealmLabel`）。
  減傷／閃避／異屬性依波次線性提高（`DEFENSE_ENEMY`：減傷 15→35、閃避 8→20、異屬性 10→35%）。**首領不另外加強**（見下方測試）。
- **勝負**（`simulateWave`）：每波開始時用玩家**當下真實數值**（`getPhysAttack`/`getMagAttack` 取大者 × `DEFENSE_PLAYER_SKILL_MULT` 1.3、`getMaxHp`、`getPlayerCombatAttrs` 的減傷閃避五行異屬性）
  與該波妖潮，以 `resolveHit`＋`tickStatus` 在背後打一場（每波滿血、最多 `DEFENSE_MAX_ROUNDS` 150 回合，逾時算失守；不影響玩家實際氣血狀態）。
  守不住的那一波：戰況先顯示「⚠️ 妖潮勢大…」，影片播到 `DEFENSE_LOSE_AT`（45%）時「天南失守」結算。武學、夥伴絕學、裝備特效沒有計入（1.3 倍是平均估算）。
- **獎勵**（`DEFENSE_REWARDS`，每守住一波在該波影片結束時 `grantWave` 立即發放；首領波 = 每 10 波）：
  - 靈石 = 等強度境界主要練功地圖（`realmPacing[].map`）掛機 2 分鐘的收入（首領 ×3）；功德 3～12（首領 80～200，首領波後 `settleMeritStones` 自動凝結補天石）。
  - 異火碎片：15% 得 1～2（首領必得 3～8）；星允鐵：20% 得 1～2（首領必得 3～6），皆經 `addFireShards`／`addStarIron`（星允鐵吃「尋鐵」特效）。
  - 裝備：一般波 6% 掉器錄**武器／防具**一件（奪寶／拍賣／可製作管道，不含秘境）；**秘境套裝部件**首領波必掉 1 件、第 20 波起一般波 3%（一次一件，不會整套）。
    品級：1～29 波 藍 50／紫 40／橙 10%，30～59 波 紫 60／橙 40%，60 波起 紫 30／橙 70%；裝備等級同奪寶（不超過人物等級的最高 `EQUIP_LEVELS`），背包滿時同 `receiveLootEquip`。
  - 稱號（`config-titles.js` 的 `defenseWave`，依歷史最高 `player.defenseBest`）：10「天南守卒」減傷 +1、30「天南守將」攻 +1%、50「鎮城仙將」血 +2%、80「魔屠天南」攻 +2%、100「天南城守護神」四維 +3%。
  - 夥伴：守住第 51 波起每波 4% 遇見一位**尚未結識的天驕級夥伴**（`getPartnerTier(p).name === '天驕'`，共 10 位），每次守城最多 1 位（`meetPartner`）。
  - 結算畫面列出本次總收穫與新稱號；遊戲日誌「🎁 道具」分頁記一筆彙整（`logRun`，中途離開也會記）。
- **通關紀錄**（2026-09-27）：守城畫面左上（速度鈕下方）與結算畫面各有「📜 通關紀錄」→ `#defense-records`（疊在舞台內 z-index 5，守城不暫停）。
  每場結束（`logRun` → `recordRun`，勝／敗／中途離開都記）存 `player.defenseRuns`（最新在前、最多 `DEFENSE_RUN_LOG_MAX` 20 場）：
  `{ at, cleared, win, kills, power, atk, realm, stage, level }`。數值是**最後守住那一波開打時**的快照（`setWave` 存 `spec.snap`、`grantWave` 存到 `D.snap`），
  power = `getRankPower()`（物攻）、atk = `getRankAttack()`（物攻術攻取高，勝負判定用的那個），**都扣掉禁術等暫時增益**，與戰力榜同一標準。
  視窗也顯示歷史最高與守城排行榜狀態（`getDefenseRankStatusText`）。`defenseRuns`／`defenseSubmitted`／`defensePending` 與 `defenseBest` 一樣不在 state.js 預設值裡，用到時才建立（`|| 0`／`|| []`）。
- **守城排行榜**（2026-09-27，大道石碑視窗第二個分頁「🏯 死守天南城」）：
  - 送審：`recordRun` 守住 ≥ 1 波且**超過已送審的最高波數**（`player.defenseSubmitted`）→ `submitDefenseRecord` → `player.defensePending` → `flushDefenseSubmit()` 寫入 `defenseSubmit/{uid}`
    （name／best／atk／power／realm／stage／level／kills／runAt(用戶端達成時間)／updatedAt）。失敗（斷線、60 秒內重送）保留 pending，下次 `uploadLeaderboard` 結尾重試。
  - **玩家不能直接上榜**：公開榜 `defenseBoard/{uid}` 只有管理者能寫；GM 後台「🏯 守城審核」判定通過才登錄（第 50 節）。駁回時原因寫在送審紀錄，遊戲守城榜分頁會顯示「未通過原因」。
  - 視窗：`openLeaderboardModal(tab)` 不給 tab 就停在上次的分頁；`switchLeaderboardTab` 切換（沒資料才讀）。守城榜依波數排序、同波數先達成者在前，顯示境界階數、當時戰力、達成日期，全破顯示「🏆 全破」。
    讀守城榜時順便讀自己的送審紀錄（`lbDefenseMine`，多 1 次讀取）取得審核狀態。
  - 限制：換裝置／清除瀏覽器資料換新 uid 後，`defenseSubmitted` 仍在存檔裡，要打出更高波數才會再送審。
- **秘境裝備管道解鎖**：`config-gear.js` 的 `GEAR_CHANNELS.realm` 拿掉 `locked`（天磯錄的秘境裝備改為可收藏）。
  為了不讓舊稱號變難，收藏類稱號（codexAll／codexPlatinumAll／category／slot／element）改用 `codex.js` 的 `getTitleGear()`（固定**不含秘境**）。
- **難度測試**（2026-09-27，`simulateWave` 連續打到失守，各 30 場；「中等」= 攻擊 ×3＋減傷 40 閃避 25，約等於有裝備四維／靈根／光環的玩家）：

  | 玩家 | 裸裝 | 減傷 60 閃避 40 | 中等 |
  |---|---|---|---|
  | 煉虛 1 階 | 0～1 波 | 1～2 | 2～3 |
  | 煉虛 5 階 | 3～4 | 5 | 5～6 |
  | 煉虛 10 階 | 5 | 6～7 | 7 |
  | 合體 5 階 | 8 | 9～10 | 10～11 |
  | 合體 10 階 | 9～10 | 12～13 | 13～14 |
  | 渡劫 10 階 | 29 | 31～32 | 31～33 |
  | 真仙 10 階 | 58～59 | 61～63 | 62～64 |
  | 混沌道祖 10 階 | 88～89 | 91～92 | 91～93 |

  - 同境界、無裝備大約卡在與自己相同強度的那一波（勝負約五五波）；裝備與攻擊加成約多守 2～4 波。
  - 第 1 波改煉虛 1 階前，煉虛 1～9 階幾乎一波都守不住（第 1 波 = 煉虛 10 階時：煉虛 1 階 0 波、煉虛 10 階 0～5 波），後段不受影響。
  - 首領曾設「攻 ×1.5、血 ×3」，測得每個境界都卡死在自己的首領波（減傷閃避也沒用），違背里程碑而取消；回合上限也由 60 改 150（60 回合時首領幾乎全逾時）。
- **時間軸**（`CUES`，以原片秒數撰寫，實際 = 秒數 − `trim`）：雷戰 0.75 開場／3.9 護體／5.1 劍氣／6.6 劍指法術／7.9 魔將化煙（慢動作）／8.9 終結技；
  佛焰 0.2 法陣／2.8 佛掌／4.9 千手／7.1 掌擊／7.7 業火；巨劍 0.2 巨劍降世／2.6 貫地／3.1 法相／4.5 金環／5.9 光柱／6.9 光爆／8.5 雲開見日。
  轉檔後的影片從原片 0.6 秒開始（頭尾交叉淡入淡出做無縫循環），`trim` 要設 0.6；原檔 `trim: 0`。**換影片檔時務必同步改 trim**，否則特效會早／晚 0.6 秒。
- **浮水印**：三支 Pippit 影片左上角有浮水印，靠 `zoom`（雷戰 1.08、佛焰／巨劍 1.16）放大裁掉；鏡頭運動只會再放大，不會低於 zoom。
- **避免命名衝突**：`defense.js` 內部的 `draw`／`feed`／`kill`／`ring`／`burst` 等全部包在 `DefenseBattle` 閉包裡；對外全域只有 `DefenseBattle`、`openDefenseBattle`、`closeDefenseBattle`、`setDefenseSpeed`、`openDefenseRecords`、`closeDefenseRecords`。
  `DefenseBattle._sim(w, 秒數)` 可在不播影片的情況下跑某一波的時間軸（測試用，會改動目前狀態）。驗證：100 波各跑 11.5 秒無錯誤，同時粒子最多約 240 個。
- **影片轉檔（瀏覽器，不需 ffmpeg）**：
  - 即時錄影（`MediaRecorder`＋畫布）需要瀏覽器面板全程顯示，Claude 桌面版的預覽面板隱藏時只錄得到 1 格，**不可靠**；錄出的是分段 MP4（mvhd 長度 0），還要另外補 `mehd` 才讀得到長度。
  - 改用**逐格轉檔**：逐格 seek → 畫到 720×1280 畫布（最後 0.6 秒與開頭疊合）→ WebCodecs `VideoEncoder`（avc1.640028、2 Mbps、每 30 格一個關鍵格）→ 自組標準 MP4（ftyp＋mdat＋moov），與面板是否顯示無關。
  - 本機預覽伺服器必須支援 HTTP Range，影片才能 seek（沒有 Range 時 currentTime 永遠停在 0）。
  - 2026-09-27 以此法轉出佛焰（264 格、2.38 MB）與巨劍（262 格、2.34 MB），各約 3 分鐘；與原片同時間點比對差異 8～17（不相干畫面 99～134），trim 0.6 對齊正確。
- 三支合計約 7.5 MB（手機 4G 約 5～15 秒）。videos/ 內的原始大檔（10～18 MB）遊戲不會載入，若不需要保留可以不推上 GitHub。

## 50. 戰力榜 GM 後台與防作弊（`gm.html`、`tools/firestore.rules`；2026-09-27）

- **目的**：作者（管理者）刪除／封鎖戰力榜上的異常資料。`gm.html` 放在網站根目錄（GitHub Pages 網址 `/gm.html`），遊戲內沒有連結，`<meta name="robots" content="noindex">`。
  **網頁公開沒關係，權限全部由 Firestore 規則把關**：只有 `admins/{uid}` 存在的 Google 帳號能刪除、封鎖、讀完整榜單；其他人打開只看得到公開前 100 名（唯讀、按鈕停用）。
- **開通步驟（作者做一次，主控台操作）**：
  1. Firebase 主控台 → Authentication → 登入方式 → 啟用 **Google**（匿名登入保持啟用）。授權網域要有 GitHub Pages 網域與 `localhost`。
     （2026-09-27 已完成：Google 已啟用；授權網域已加入 `k559610142-art.github.io`。匿名登入不檢查授權網域，Google 登入會，
     缺少時 gm.html 登入會出現 `auth/unauthorized-domain`。GM 頁網址：`https://k559610142-art.github.io/-username-.github.io-/gm.html`）
  2. 整份貼上新版 `tools/firestore.rules` → 發布。（2026-09-27 2:52 已發布）
  3. 打開 `gm.html` → 「Google 登入」→ 頁面顯示你的 uid（可複製）。
  4. Firestore → 資料 → 開始集合 `admins` → 文件 ID = 上一步的 uid（欄位隨意）→ 儲存。重新整理 gm.html，上方顯示「管理者」即完成。
  - 管理者名單只能在主控台新增（規則 `admins` 一律不可寫），所以不需要把 uid 或 email 寫進程式碼。
- **GM 登入與遊戲分開**：gm.html 用 `firebase.initializeApp(設定, 'gm')` 的獨立 app 名稱，登入狀態分開保存；
  在同一個瀏覽器登入 GM 不會讓遊戲的匿名 uid 被換掉（否則榜上會多一筆）。gm.html 直接載入 `data/config-realms.js`（境界名稱）與 `data/config-leaderboard.js`（Firebase 設定、集合名稱）。
- **功能**：
  - 📋 戰力榜：管理者一次讀 1000 筆（依戰力排序）。每筆算出「基礎值倍率」（戰力 ÷ 7×階×10^境界）與「佔規則上限 %」，自動標記：
    🔴 超過規則上限（新規則下已無法再上傳，但舊資料仍在榜上）、🟡 佔上限 ≥ 15% 或 等級 >（境界+1）× 1500、灰「重複」（道號＋境界＋階＋等級＋戰力完全相同，保留最新一筆）、灰「N 天未更新」。
    可篩選；逐筆「刪除」「封鎖」、勾選批次、一鍵「封鎖全部超標」「刪除久未更新」（天數可設，預設 14）。所有破壞性操作都會 confirm／prompt 原因。
  - ⛔ 黑名單：`banned/{uid}` = { name, realm, stage, level, power（封鎖時的快照）, reason, bannedBy, bannedAt }；可解除封鎖。封鎖＝寫黑名單＋刪榜單紀錄＋刪守城榜與守城送審（同一個批次）。
  - 🏯 守城審核（2026-09-27，死守天南城排行榜，第 49 節）：讀 `defenseSubmit`（玩家送審）與 `defenseBoard`（已登錄），逐筆 `verifyDefense()` 判定：
    - **① 前後對比**：用戰力榜同 uid 的 `histPoints`（hist2＋hist＋目前那筆，約 2 天內），找達成時間 `runAt` 前後 ±N 分鐘（預設 30）的上傳；送審戰力不可高於其中最高值 × 倍數（預設 1.2）。表格顯示「前 → 後」兩筆。
      找不到紀錄（沒上戰力榜、或 hist 已被擠掉）→ ❔ 無法比對，留給人工。另外 `runAt` 須落在送出時間前 3 天～後 5 分鐘內。
    - **② 能否守住**：攻擊 ÷ `defenseWaveAtk(波數)`（config-defense.js，與遊戲同一條強度曲線）≥ 設定 %（預設 10%）。
    - **③ 數值一致**：攻擊 ≥ 戰力 × 0.99（攻擊取物攻術攻較高者）且 ≤ 戰力 × 倍數（預設 5，規則也限制 5 倍）。
    - 已封鎖、或戰力榜被標 🔴 超標／🟠 暴增 → 不通過。
    - 結果：✅ 通過／❌ 不通過／❔ 無法比對。逐筆「登錄」（判定非通過時 confirm 列出原因）「駁回」（prompt 原因，預填判定結果）；批次「✅ 登錄全部判定通過」「❌ 駁回全部判定不通過」。
      登錄 = 寫 `defenseBoard/{uid}`（name／best／power／atk／realm／stage／level／runAt／approvedBy／approvedAt；榜上已有更高波數則不覆寫）＋送審標 `status: 'ok'`；駁回 = 送審標 `status: 'rejected'`＋`reason`（榜上保留之前通過的）。
    - 自動巡檢勾「自動審核守城紀錄」：待審核的 ✅ 自動登錄、❌ 自動駁回（原因「自動審核：…」）、❔ 留給人工。前後對比依賴約 2 天內的戰力歷史，審核要在 2 天內做。
    - 設定在「守城審核」分頁（`DEF_DEFAULTS`，localStorage `gm_defense_settings`）。gm.html 為此多載入 `config-bounty.js`、`bounty.js`（只用 getBountyRefSectMult，檔案只宣告常數與函式）、`config-defense.js`。
    - **門檻校準**（2026-09-27，用遊戲的 `simulateWave` 二分搜尋「最低攻擊 ÷ 該波強度」，每點 30 場取有贏過的，氣血 = 攻擊 × 20 如真實玩家）：
      裸裝 95～125%、中等（減傷 40 閃避 25＋火雷 20、剋制五行）40～47%、強力（減傷 60 閃避 40＋五種異屬性 20～50、秘典 20%、剋制五行）13～18%（氣血 ×60 時 9～11%）；
      全部上限＋秘典 50% 的理論極限約 1%（太寬不採用）。預設 10% 不會誤擋正常玩家；偽造「渡劫守住 100 波」之類只有 0.0001% 以下。
      日後改了守城強度或戰鬥公式，要重新校準。
    - 抓不到：戰力本身是改存檔灌出來、但沒被 🟠 暴增抓到（例如第一次上傳就灌、或在上限內慢慢灌）——那樣守城在遊戲裡是真的守得住，前後對比也相符。
  - 🟠 戰力暴增（2026-09-27）：比對每筆的 `histPoints(r)`（`hist2` 兩日紀錄＋`hist` 最近 24 次＋目前這筆，依時間排序去重；時數最多可設 48），**任兩次上傳相隔 ≤ H 小時、後者 ÷ 前者 ≥ N 倍、且後者 ≥ M 萬**就標記。
    H／N／M 在「戰力榜」分頁的「📈 戰力暴增判定」列設定（預設 1 小時／30 倍／100 萬，`JUMP_DEFAULTS`），存在 GM 瀏覽器的 localStorage `gm_jump_settings`。
    預設 30 倍的依據（2026-09-27 依 getBasePower＋realmPacing 估算）：純修煉 1 小時最大成長 凡人→煉氣 約 96 倍（戰力 5→480）、煉氣 14、築基 9.6、金丹 7.3、元嬰 5.6、化神 4、煉虛 2.7、合體 2.1、大乘以上約 1.5（升一階）；
    修煉速度快於節奏表 3～5 倍時化神附近可到 7～10 倍。瞬間跳升：換宗門最多 ×6（powerMult 1.0→6.0）、裝備／靈根／仙法／靈寵一次到位最多約 ×13、虛弱解除 ×1.43。
    100 萬以下多為凡人～築基新手（成長本來就快）所以不判定。等線上累積 hist 後，建議以「時窗內最大成長」正常玩家最高值的 2～3 倍重新校準。
    表格「時窗內最大成長」欄不論是否達標都顯示（滑鼠停留看幾分鐘內從多少到多少），用來校準門檻；沒有 hist 的舊紀錄顯示「—」。
    離線多天回來的第一次上傳與前一筆相隔超過時窗，不會誤判。可逐筆封鎖（原因預填漲幅）或「⛔ 封鎖全部暴增」。
    - `hist` 由規則 `nextHist()` 強制：每次更新必須等於「舊 hist ＋ {p: 舊 power, t: 舊 updatedAt}」取最後 24 筆，建立時必須是空的——玩家無法竄改或清掉先前的戰力；
      `hist2` 由 `nextHist2()` 強制：上一筆距 hist2 最後一筆 ≥ 1800 秒才接上（取最後 96 筆），否則必須原封不動；建立時也必須是空的。
      細的證據（每 5 分鐘）約 2 小時後被擠掉，粗的（每 30 分鐘）保留約 2 天，所以巡檢或人工檢查在 2 天內做即可（2026-09-27 本機測：20 小時前的暴增只剩 hist2 仍能抓到）。
    - 抓不到：第一次上傳就灌分（沒有前一筆可比；仍受規則上限限制）、換新 uid 後灌分；緩慢灌分可把時數調長（最多 48）比對，但早期境界正常成長也很快，長時窗的倍數要依境界斟酌。
  - 🛡️ 自動巡檢：**頁面開著時**每 N 分鐘（預設 10）重讀榜單 → 🔴 自動封鎖＋移除（原因「自動巡檢：超過規則上限」）→ 勾「自動封鎖戰力暴增」時逐筆封鎖 🟠（原因記下漲幅）→ 可選同時刪久未更新；🟡 只標記不處理。
  - 批次寫入每 400 筆一批（Firestore 單批上限 500）。
- **真正的「關掉網頁也定時執行」**需要伺服器排程（Firebase Cloud Functions，需升級 Blaze 付費方案），目前不做。新規則已在寫入時擋下超標資料，巡檢主要清理舊資料與重複紀錄。
- **防作弊能力與限制**：
  - 擋得住：直接改存檔／主控台灌出不合理戰力（超過基礎值 200 倍＋等級額度）、被封鎖的 uid 再上傳、60 秒內重複上傳、亂塞欄位；在上限內改存檔瞬間灌分則由 🟠 戰力暴增抓出（GM 封鎖）。
  - 擋不住：同時偽造境界、階數與戰力（在上限內灌分）；被封後清除瀏覽器資料換新匿名 uid 重新上傳（需再封一次）。
  - 進一步可做（未實作）：Firebase **App Check**（reCAPTCHA，擋掉不是從遊戲網頁發出的請求）；Cloud Functions 在伺服器端依存檔重算戰力（需付費方案）。
- **門檻校準**（2026-09-27 讀取線上前 100 名）：正常玩家基礎值倍率 0.72～9.3（天仙 10 階、至高宗門＋裝備最高），作弊資料「大鵰俠」化神 3 階 Lv.10000 戰力 63 兆 = 3000 萬倍；
  新上限只擋下這一筆。另有大量預設道號「韓立」（41 筆）「南宮婉」（13 筆），多為停在凡人 1 階的新手殘留紀錄，不是作弊，可用「刪除久未更新」清理。
  ⚠️ 日後新增大幅提高戰力的系統（例如更強的稱號、夥伴、異火加成）後，請用 GM 後台看「佔上限 %」最高值，必要時同步調整規則與 gm.html 的 `CAP_BASE_MULT`／`CAP_PER_LEVEL`。
- 驗證紀錄：本機未登入唯讀模式讀到 100 筆，正確標出唯一的超標資料、無誤標，管理按鈕停用，Console 無錯誤。管理者操作（刪除／封鎖／巡檢）需作者完成開通步驟後在線上測試。
  - 戰力暴增（2026-09-27 本機以假資料測）：15 分鐘內 2000萬→50億 標 🟠；1.5 倍正常成長、離線 3 天後回來、無 hist 舊紀錄、低於 100 萬的新手皆未標；改門檻即時重算並存入 localStorage。
    **規則尚未在線上實測**（需作者發布新版 `tools/firestore.rules`）。
- 守城審核驗證（2026-09-27 本機以假資料測）：偽造波數（第 100 波、攻擊只有強度 7e-9%）、送審戰力 1000 兆但戰力榜同時段只有 2.6 億、戰力榜被標暴增者皆 ❌；沒上戰力榜者 ❔；
  攻擊為強度 513% 且與戰力榜相符者 ✅。遊戲端：守住 2 波後 `defenseRuns` 與待送審正確、通關紀錄視窗與大道石碑守城分頁（含道號跳脫）顯示正常，Console 無錯誤。**規則與實際寫入尚未線上實測**。
- ⚠️ **發布順序**：新規則要先發布——GM 的封鎖批次會一併刪 `defenseBoard`／`defenseSubmit`，舊規則下整批會被拒絕。新版 `leaderboard.js` 會送 `hist`、新規則要求 `hist`——舊規則會擋新程式、新規則會擋快取中的舊程式。請**同時**推上 GitHub 與在主控台發布規則；中間短暫上傳失敗只會 `console.warn`，不影響遊戲。
- 順帶修正（2026-09-27）：gm.html 的 `fmt()` 原本把整數尾端的 0 也刪掉（2000萬 顯示成「2萬」），已改為只刪小數尾端的 0。

## 51. 秘境「鎮魔塔」100 層・知識問答（`config-zhenmo.js`、`config-zhenmo-questions.js`、`zhenmo.js`；2026-09-27）

- **目前範圍**：100 層關卡、每層知識問答、結算、進入 BOSS 房。**BOSS 資料與戰鬥下一步新增**（`ZHENMO_BOSS_READY = false`）。
- **入口**：活動「🌀 秘境」→「鎮魔塔」卡片 → 海報場景「⚔️ 入塔挑戰」→ `challengeSecretRealm()` 見 `mode: 'tower'` → `openZhenmoTower()`。開放境界同秘境（煉虛）。
- **畫面** `#zhenmo-scene`（z-index 101，疊在秘境場景上）：9:16 舞台 `#zhenmo-stage`（寬 = min(100vw, 100dvh×9/16, 560px)），背景為鎮魔塔海報加暗色漸層、四周模糊；四個面板輪流顯示（`show()`）：
  - **塔廳** `#zm-hall`：目前樓層、「已鎮壓 N / 100 層」、10×10 樓層格（由下往上、第 1 層在左下；紫 = 已通過、金 = 目前）、動作按鈕、規則說明。
    有本層未用的問答成績時按鈕變成「🚪 進入 BOSS 房（問答 x/10，獎勵 ×m）」，不必重答。
  - **問答** `#zm-quiz`：「第 N 層・問答 i / 10」、10 格進度（綠對／紅錯／金目前）、限時條（剩 5 秒轉紅）、出處與題型、題目、選項。
    選擇題 4 個按鈕（A～D，**每次打亂順序**：題庫原始答案 170 題中 154 題是 A）；是非題兩個大按鈕 ○／╳。作答後按鈕標綠／紅、顯示「答對了／答錯了／時間到」，0.9 秒後下一題。
    **不公布正確答案**（`ZHENMO_REVEAL_ANSWER = false`，玩家要求「只給題目」）。
  - **結算** `#zm-result`：答對數、10 題 ○╳、本層 BOSS 獎勵倍率（全對另有提示）、「🚪 開啟 BOSS 房門」「稍後再戰（成績保留）」。
  - **BOSS 房** `#zm-boss`：兩扇門滑開（CSS `zmDoorL/R` 1.6 秒，`prefers-reduced-motion` 時瞬間開）、「第 N 層・BOSS 房」、問答成績與倍率；BOSS 未開放時顯示「塔中 BOSS 尚在甦醒」。
- **出題**（`drawQuestions`）：從 300 題隨機抽 10 題，避開最近出過的 `ZHENMO_RECENT_AVOID`(100) 題（`player.zhenmo.recent`），同一層每次挑戰題目不同，不能背某層答案。
- **限時** `ZHENMO_QUIZ_SECONDS`(20)：逾時算答錯（避免邊答邊查）；0 = 不限時。
- **獎勵倍率** `ZHENMO_QUIZ_REWARD_MULT`（索引 = 答對數）：0 題 ×1.0，每多對 1 題 +0.1，9 題 ×1.9，10 題全對 ×2.5。BOSS 獎勵實作時乘上這個倍率。
- **存檔** `player.zhenmo = { floor, best, pending, recent }`（`state()` 用到時才建立，不在 state.js 預設值）：
  `floor` 目前要挑戰的樓層、`best` 最高通過樓層、`pending = { floor, correct, total, mult, at }` 這一層尚未使用的問答成績。
  答完或**中途離開**（confirm，未作答視為答錯）都會寫入 pending 並記一筆日誌（道具分頁）。重新整理頁面時進行中的問答會消失（未寫入 pending）。
- **次數**：`ZHENMO_BOSS_READY = true` 後，「開始問答」時扣 1 次秘境每日次數（`useSecretRealmAttempt('zhenmo')`），已有 pending 時進 BOSS 房不再扣。
  目前 false：問答不扣次數、BOSS 房只顯示「尚未開放」、樓層不前進。
- **下一步（BOSS）要接的點**：`enterBoss()` 的 `ZHENMO_BOSS_READY` 分支放 BOSS 戰；打贏後 `z.best = z.floor; z.floor++; z.pending = null`，獎勵 × `pending.mult`；輸了是否保留 pending 待定。
- **題庫**（`config-zhenmo-questions.js`，玩家提供 300 題）：《凡人修仙傳》110、《吞噬星空》100、《斗羅大陸》90；選擇 170、是非 130（○ 93／╳ 37）。
  轉錄時只修了明顯錯字（「基因基因突變」「參加參加」「綠夜」）與原文重複的第 100 題編號；題目與答案正確性以玩家提供為準，要改直接改檔案。
  ⚠️ 答案寫在前端程式裡，會看原始碼的人查得到（純前端遊戲無法避免）；是非題 ○ 佔 72%，全選 ○ 期望約對 7 成。
- 驗證（2026-09-27，本機測試頁）：300 題格式全部正確、無重複；抽題 10 題不重複、選項已打亂（正確答案出現在 A～D 各位置）；答 7 對 2 錯 1 逾時 → 7/10、×1.7 存入 pending；
  中途離開保留成績、塔廳改顯示「進入 BOSS 房」；開門動畫正常；Console 無錯誤。