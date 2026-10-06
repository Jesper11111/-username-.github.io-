# 屠龍勇者：架構文件

以「天堂 1」為藍本的**自動掛機 RPG**（單機，存檔在瀏覽器）。與「凡塵修仙傳」同一個 repo，放在子資料夾 `屠龍勇者/`，
網址 `<網站>/屠龍勇者/`。兩者完全獨立，不共用程式。修改前先讀本文件對應章節，修改後同步更新。

## 1. 專案結構

| 檔案 | 內容 |
|---|---|
| `index.html` | 版面、全部 CSS、三個畫面（title／create／game）、`<script>` 載入 |
| `data/config.js` | 版本號、存檔 key、各種常數、遊戲時鐘 `gameNow`、`rand/chance/clamp/fmt`、`expToNext` |
| `data/classes.js` | `STAT_KEYS`、`STAT_NAMES`、創角規則、`CLASSES`（10 職業） |
| `data/skills.js` | `SKILLS[職業]` 技能／魔法、`COMMON_SKILLS`、`findSkill` |
| `data/items.js` | `WEAPON_TYPES`、`SLOTS`、`BUFF_DEFS`、`ITEMS`（武器／防具／藥水／卷軸／彈藥／材料）、`RECIPES`、`isStackable`、`sellPriceOf` |
| `data/monsters.js` | `monBase` 等級基準數值、`MONSTERS`、傲慢之塔主題與首領、`buildMonster/makeMonster/makeTowerMonster`、`COMMON_DROPS` |
| `data/zones.js` | `TOWNS`（4 村）、`ZONES`（狩獵地圖＋龍穴）、`ZONE_BY_ID`、`DRAGON_IDS` |
| `data/player.js` | `player`、遊戲訊息 `addLog`、`DEFAULT_SETTINGS`、創角、背包／裝備、增益、**能力計算 `calcStats`**、升級、萬能藥 |
| `data/enchant.js` | 衝裝規則 `doEnchant`、成功率、可強化目標 |
| `data/combat.js` | 掛機戰鬥：`hunt` 狀態、尋怪、玩家行動、怪物攻擊、掉落、死亡、自動補給、回家、步行、自然回復 |
| `data/town.js` | 村莊設施：傳送、商店、回收、旅館、倉庫、鍛造；龍穴進入條件 |
| `data/save.js` | 存讀檔、舊存檔補欄位（`migrateSave`）、匯出／匯入 |
| `data/ui.js` | `$`、`esc`、`showScreen`、`bar`、狀態列 `renderStatus`、`showToast`、`openDialog/gameAlert/gameConfirm` |
| `data/ui-create.js` | 標題畫面、創角（選職業、配點、取名） |
| `data/ui-panels.js` | 主畫面 7 個分頁（狩獵／地圖／角色／背包／技能／村莊／設定）、道具對話框、衝裝選擇、匯出入 |
| `data/pwa.js` | PWA：註冊 SW、安裝說明 `openInstallGuide`、新版本提示、持久儲存（第 12 節） |
| `data/main.js` | 主迴圈 `gameTick`（每 100ms）、繼續遊戲、啟動（呼叫 `initPwa`） |
| `manifest.json` | App 名稱、圖示、`scope: ./`（只涵蓋本資料夾） |
| `sw.js` | Service Worker，快取名稱 `dragon-` 開頭（第 12 節） |
| `images/` | App 圖示：`icon-192/512.png`、`icon-maskable-512.png`、`apple-touch-icon.png` |

## 2. 載入順序與依賴

`config → classes → skills → items → monsters → zones → player → enchant → combat → town → save → ui → ui-create → ui-panels → pwa → main`

- 上層資料檔（config～zones）只在「載入時」用到更前面的檔案。
- player 之後的檔案互相呼叫（例如 combat 呼叫 `refreshUI`、town 呼叫 `startHunt`），都發生在執行期，全部載完才會跑，所以沒問題。
- 新檔案依它「載入時」需要的東西插入；只在執行期用到的不影響順序。

## 3. 開發規則

- **版本號**：改任何 JS 都要把 `index.html` 全部 `?v=` 與 `config.js` 的 `GAME_VERSION` 一起換新（目前 `20261007c`）。
  SW 依版本號快取 JS，**沒換版本號，已安裝 App 的玩家會一直跑舊程式**。
- **存檔 key** 用 `dragonSlayer_` 前綴（與修仙同網域，localStorage 共用）。改存檔結構時 `SAVE_SCHEMA +1` 並在 `migrateSave` 補轉換。
- 不用原生 `alert/confirm`，用 `gameAlert/gameConfirm/showToast`。
- `onclick="…"` 字串只呼叫頂層函式並傳字面值，不直接寫 `player`（與修仙的混淆建置規則一致）。
- **時間**：增益、冷卻、喝水間隔、步行、掛機統計用 `gameNow`（遊戲時鐘，主迴圈每次 +dt，最多補 1 秒）；
  只有龍穴冷卻等「真實時間」用 `Date.now()`。模擬測試時手動 `gameNow += 100; huntTick(100)` 即可快轉。
- 本機測試：`屠龍勇者/.claude/launch.json` 的 `dragon`（port 8790，與修仙不同 origin，存檔互不影響）。

## 4. 角色與職業

- 能力值：力量／敏捷／體質／智力／精神／魅力。創角總點數 75，職業有最低值（`base`），單項上限 18。
- 51 級起每升一級 +1 點（`statPoints`），單項上限 `STAT_CAP` 35；萬能藥每瓶 +1，最多 5 瓶。
- 升級 HP／MP：職業 `hp/mp` 範圍 + 體質／精神加成（`(值-10)/2`）。升級時 HP／MP 全滿。
- 10 職業：王族、騎士、法師、妖精、黑暗妖精、修羅、戰士、槍手、魔鬥士、聖騎士。
  差異在可用武器（`weapons`）、能否用盾、HP/MP 成長、MR、SP 成長（`spDiv`）、回魔係數、技能表。
  - 王族：魅力超過 10 每點金幣掉落 +3%。
  - 妖精／槍手：遠程，需要箭／子彈（`ammo`）。

## 5. 能力計算（`calcStats`）

| 數值 | 公式 |
|---|---|
| 近戰命中 | 等級 + (力量-8)/3 + (敏捷-8)/4 + 武器命中 + 增益 |
| 遠程命中 | 等級 + (敏捷-8)/2 + … |
| 傷害加成 | 力量（遠程用敏捷）(值-10)/2 + 等級/4 + 武器強化值 + 增益 + SP×dmgSp |
| SP | 等級/spDiv + max(0, 智力-11) + 裝備／增益 |
| AC | 10 − (敏捷-9)/3 − 等級/10 − 防具 AC − 防具強化 − 增益（越低越硬） |
| MR | 職業 MR + (精神-10)×2 + 裝備 |
| 攻擊間隔 | 武器種類 spd × 加速 0.75 × 勇敢 0.75 × (1−技能攻速) |
| 回血／5 秒 | 1 + 等級/8 + max(0, 體質-12) + 增益；村莊 ×3；負重 > 50% 不回 |
| 回魔／5 秒 | 1 + 等級/12 + (精神-10)×mpRegenK + 增益 |
| 負重上限 | (力量 + 體質) × 100 |
| 爆擊 | 5% + 武器 + 增益（×1.5 傷害） |
| 閃避 | (敏捷-12)×1% + 增益，上限 50% |

## 6. 戰鬥（`combat.js`）

- 掛機流程：尋怪（0.6～1.6 秒）→ 戰鬥 → 擊倒 → 掉落 → 檢查回家條件 → 尋怪。
- 野外／地監只出「不超過玩家等級 +3」的怪；地圖 `rare` 機率出首領（巴風特、惡魔、歐西里斯）。
- 命中率：`0.7 + (命中 − (10 − 目標AC)) × 0.02`，限制 5%～95%（怪物打玩家同公式）。
- 物理傷害：`1～武器骰（小型/大型）` + 傷害加成 + 彈藥；銀武器／銀彈打不死系 +1～10；屠龍劍打龍 ×1.5。
- 怪物傷害：玩家 AC < 0 時額外減 `0～(-AC/5)`，再扣減傷；法力護盾把部分傷害轉到 MP。
- 魔法：`dmg + SP×spK`，必中，乘 `(1 − 怪物MR/200)`。怪物魔法無視 AC、受玩家 MR 減免。
- 玩家行動優先：治癒（HP < healPct）→ 增益（效果結束）→ 攻擊技能／魔法（最高級、MP 夠、冷卻好）→ 普攻。
- 自動補給（`autoSupport`）：瞬移卷軸 → 治癒藥水（挑不浪費的那瓶，間隔 1 秒）→ 綠水 → 勇水類 → 藍水。
- 自動回家：沒藥水、沒彈藥、負重超過設定 → 有回家卷軸就回村；沒卷軸只提示一次。
- 死亡：10 級以上損失本級所需經驗 5%（不降級）；有復活卷軸則不損失；清除增益、HP／MP 剩 30%、回地圖所屬村莊。

## 7. 道具與衝裝

- 道具實體 `{ uid, id, n, ench }`；藥水、卷軸、彈藥、材料、萬能藥可堆疊。裝備中的道具放 `player.equip[slot]`，不在 `inv`。
- 雙手武器（雙手劍、矛、弓、槍、鋼爪、雙刀）不能與盾同時裝備。
- 衝裝（`enchant.js`）：強化值 < 安定值必定成功（祝福卷 +1～3）；≥ 安定值成功率 `0.5/(超出+1.25)`（40%→22%→15%…），
  失敗**蒸發**；詛咒卷 -1；飾品不能強化；上限 +15。武器每 +1 傷害 +1，防具每 +1 AC -1。
- 商店依村莊 `tier` 販售（說話之島 1、古魯丁 2、奇岩 3、亞丁 4）；回收價 = 售價 30% 或 `sell`。
- 鍛造配方 `RECIPES`：瑟魯基之劍、魔法頭盔、屠龍劍（四龍鱗＋武士刀）、龍鱗鎧（四龍鱗各 2＋板甲）。

## 8. 地圖

| 地圖 | 建議等級 | 回城 | 特色 |
|---|---|---|---|
| 說話之島 | 1～10 | 說話之島村莊 | 新手區 |
| 說話之島地監 | 8～18 | 說話之島村莊 | 不死系出現 |
| 古魯丁地監 1～3 樓 | 15～25 | 古魯丁村 | |
| 古魯丁地監 4～7 樓 | 24～36 | 古魯丁村 | 稀有：巴風特 1% |
| 象牙塔 | 34～46 | 奇岩城 | 稀有：惡魔 0.8% |
| 金字塔 | 44～56 | 奇岩城 | 稀有：歐西里斯 0.8% |
| 傲慢之塔 1～100F | 45～90 | 亞丁城 | 怪物 Lv = 44 + 樓層×0.45；10 的倍數樓有守關首領，擊敗才解鎖上 10 層（`towerMax`） |
| 四大龍巢穴 | 60／70／80／88 | 亞丁城 | 依序：安塔瑞斯 → 法利昂 → 林德拜爾 → 巴拉卡斯；討伐後巢穴封閉 6 小時（真實時間） |

- 村莊間傳送費：每差一級 200；從村莊傳送到地圖收 `fee`。在地圖要回村：回家卷軸（立即）或步行（15 秒）。
- 四大龍全數討伐 → 稱號「屠龍勇者」（`hasDragonTitle`）。

## 9. 經驗曲線

`expToNext(lv) = 10 × lv^2.5 + 20`，50 級起再乘 `2^((lv−49)/10)`。怪物經驗 `lv² + 1`（首領 ×15～20，龍寫死）。
模擬參考（初始裝備、不換裝）：各職業 1 小時約 Lv.11～16。

## 10. 存檔欄位（`player`）

`name, cls, lv, exp, gold, stats, statPoints, elixirs, baseHp, baseMp, hp, mp, inv, equip, storage, nextUid,
buffs{key:{src,id,until}}, cds{技能id:到期}, loc{type,id,floor}, hunting, towerMax, towerCleared, dragons, dragonCd,
kills, deaths, settings, created`

## 11. 尚未實作（之後可做）

離線收益、寵物／召喚（妖精、王族）、血盟、變身卷軸、更多地圖（龍之谷、遺忘之島…）、音效與怪物圖片。

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
