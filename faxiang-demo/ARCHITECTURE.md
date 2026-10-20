# 法相天地獨立原型架構（第一階段）

## 1. 專案檢查與最小侵入方案

檢查來源：k559610142-art/-username-.github.io-，main tree 14a24cc87f939213d91c303c2fb629b7db6b32be。
已讀根目錄 CLAUDE.md、ARCHITECTURE.md 第 1／2／5／59／72 節，以及 data/battle-fx.js、data/combat.js、data/leaderboard.js、tools/build.js、package.json。

凡塵修仙傳採 DOM/CSS 戰場面板，不是自由移動的 Canvas RPG。現有主角是靜態立繪；女角施法使用 images/battle/cast-female.png（1208×300，8 格，每格151×300），由 battleFxCast()/playHeroCast() 驅動。playerAttackTurn() 仍在瀏覽器結算傷害。未發現本遊戲的 6×3 走路、8×3 攻擊／施法圖集；另一個遊戲「屠龍勇者」不在本次修改範圍。

Firebase 匿名登入與 Firestore 用於雲端玩法；未發現法相授權／伺服器戰鬥結算 API 或對應後端服務。前端混淆與本機存檔簽章不能作為可信戰力或解鎖依據。

本次僅建立獨立目錄，不改遠端儲存庫、首頁、角色、存檔、排行榜、版本號、建置或部署。待使用者確認演示後，才將視覺控制器掛接戰場事件。

## 2. 檔案與圖層

- index.html：獨立演示頁、操作列、四階段進度。
- style.css：桌機及手機排版。
- app.js：閉包內的設定、狀態機、角色圖集及四層渲染；唯一公開物件 FaxiangDemo。
- assets/cast-female.png：由原儲存庫讀取的女角施法圖，未修改。
- assets/goddess.png：依使用者參考圖生成的獨立法相美術，透明 PNG。
- tests/browser_check.py：瀏覽器驗證，使用 Playwright 和系統 Chromium。
- preview-desktop.png／preview-mobile.png：顯現階段截圖。

z-index 1 地面 Canvas 法陣 → 2 法相 DOM 圖 → 3 玩家 DOM 圖集 → 4 前景 Canvas 特效。法相與玩家共用位置 x/y，但不共用圖片或動畫狀態；縮放、透明度、速度與方向由獨立設定控制。ResizeObserver 更新渲染尺寸，DPR 上限 2，手機粒子數降至 32。

## 3. 時間軸與介面

idle → gather(800ms) → manifest(1200ms) → attack(800ms) → dissolve(1000ms) → idle。
取消「自動完成四階段」後，顯現／攻擊結束進入 hold，允許再次攻擊；示意駐留最長10秒，之後自動消散。提前消散保留當前顯現透明度，避免突然亮起。切換法相會取消舊動畫、回到待機，避免殘留特效。背景頁暫停動畫；採單一 requestAnimationFrame，不建立多個召喚計時器。

FaxiangDemo.summon()／attack()／dismiss()／setType(id)／snapshot()／destroy()。
這是展示用介面，沒有正式解鎖、戰鬥加成或伺服器授權能力。設定中的條件、冷卻和加成僅為未定案的 metadata，不執行數值計算。畫面上的「準備就緒」不代表玩家具備資格。

## 4. 第一版美術限制（第二版角色更新見第7節）

四法相暫時共用生成美術，使用不同 hue 與蓮花／雷電／冰晶／火焰特效。法相動作採整圖升起、浮動、攻擊脈衝與消散粒子，尚非真正的獨立手臂、髮絲、衣袖骨架或逐幀攻擊動畫。

正面施法採現有素材；側面壓縮、背面變暗、走路起伏、攻擊傾斜只是示意，不能取代正確三方向素材。載入圖集入口可分別載入 6×3 走路、8×3 攻擊、8×3 施法，列順序為正面、側面、背面。未載入的動作使用既有施法圖。人物和法相的真正三方向素材到位前，不應宣稱已完成三方向美術。

## 5. 後續正式整合

1. 將純設定移入 data/config-faxiang.js，視覺控制器移入 data/faxiang-fx.js；事件呼叫頂層包裝函式，遵守現有混淆建置規範。
2. 在 .bf-scene 新增法陣／法相／前景層，保留 #bf-hero-box、#bf-cast-sprite 和原 playHeroCast()。共用角色錨點。現有面板145～190px高，3～4倍法相可能裁切，需先由使用者確認是擴高面板還是使用獨立場景。
3. 伺服器確認施法後才發出 visual event，視覺層不修改傷害。不要 monkey-patch window 函式。戰場收起或隱藏時停止特效。
4. 正式存檔若需法相欄位，使用 state.js 預設值及 save.js applySaveData() migration；不能把演示頁本機狀態遷入正式資格。
5. 更新主架構文件對應章節、檔案列表與依賴順序，再執行 npm ci && node tools/build.js，並在 dist/ 回歸角色施法、戰鬥、存讀檔、手機排版與 Console。

## 6. 建議後端契約（尚未實作／部署）

GET /api/faxiang/status：驗證 Firebase ID token，從可信玩家資料回傳 unlockedIds、equippedId、serverNow、activeUntil、cooldownUntil、configVersion。

POST /api/faxiang/summon：只接受 faxiangId、requestId（冪等鍵），由伺服器讀取等級、境界、已完成任務及資源，交易式檢查解鎖、裝備狀態和冷卻，寫入 startsAt／activeUntil／cooldownUntil；重送相同 requestId 回傳原結果。不要接受前端提交的 level、questCompleted、damage 或 bonus 作為事實。拒絕未登入、未解鎖、重複啟用或冷卻中請求；限制頻率。

POST /api/combat/actions：以 battleId、actionId、requestId 驗證伺服器戰鬥狀態，由伺服器計算法相加成、命中、傷害、死亡、掉落，再回傳 visualEvents。不能只新增 summon API，卻繼續信任前端計算的傷害。冷卻與持續時間使用伺服器時間，不靠瀏覽器時鐘。斷線／過期／授權失敗時不授予加成。

Firestore 上的資格、冷卻、戰鬥資料須禁止用戶端寫入，僅允許受信任服務修改。現有本機存檔無法直接變成可信等級／任務證明，需要另定玩家進度遷移與權威戰鬥範圍。第一階段沒有執行任何雲端資料寫入。

## 7. 第二版角色圖集接入（2026-10-20）

使用者新增三張 JPG 素材：攻擊8×3、施法7×3、走路6×3。透過影像工具產生透明背景衍生圖，來源原圖未修改；衍生圖可能有細節重繪，不宣稱逐像素保留。assets/attack.png、cast.png、walk.png 存放此三圖。

sprite-renderer.js：載入圖集，按實際像素尺寸計算分格邊界（圖寬不一定能整除欄數）；掃描每格核心不透明區以取得腳底與人物高度，共用圖集的中位數高度比例，繪製時以腳底對齊。這是渲染取樣，不改寫圖片。角色渲染 canvas 位於原玩家層內，法相仍獨立渲染。

走路和攻擊依正面／側面／背面切換列。施法3列代表3組招式，不代表三方向；使用「引劍聚氣／劍指結印／蓮陣御劍」選擇器指定。施法期間只顯示來源前斜面姿勢，結束回到所選方向。真正側面與背面施法仍待補。

新增 FaxiangDemo.snapshot() 的 assetsReady、motion、row、frame 供驗證；素材尚未載入時不開始召喚。待機採走路圖集第0格，走路每125ms一格、攻擊階段800ms走完8格。施法2000ms走完7格。單獨「揮劍攻擊」可預覽角色攻擊，不必召喚法相。

「載入角色圖集」仍支援玩家自行上傳6×3走路、8×3攻擊／施法；上傳的施法圖會按三方向處理。此入口和內建三組施法招式的語意不同，畫面規格有註記。

新增 package.py 產生嵌入 CSS、JS、圖集與法相美術的單檔 HTML，以及完整原始碼 ZIP。正式遊戲與遠端儲存庫仍未修改。

## 8. 七屬性法相（2026-10-20）

依遠端 config-yuanshen.js 的12種元神／7種偏好新增 faxiang-config.js；當中 FAXIANG_CONFIG 定義七款法相，FAXIANG_YUANSHEN 是元神 id → 外觀的對應表。金／木／水／火／土／雷／風均有獨立美術，金系沿用已完成的女神圖。gallery.html 提供圖鑑；演武頁新增元神預覽選單，選擇屬性時取消該元神預覽標記。

美術：assets/wood.png／water.png／fire.png／earth.png／thunder.png／wind.png，新圖各自獨立，不做同圖換色。setType() 改讀設定圖片，移除 hue 旋轉。新增葉片、六鏡、碎石、風環四種Canvas特效。

法相仍為整圖浮動／升起／消散，並非四臂、髮絲、衣袖骨架動畫。所有元神均可在演示自由選擇，這不構成正式資格。遊戲元神現有倍率未修改、不疊加。詳細造型、對應與完整版演出提案見「法相設計.md」。測試頁駐留秒數僅為原型展示設定，未定正式技能冷卻。

七屬性版驗證：1200×1000、390×844、320×700 下，七法相圖均載入，12種元神對應均正確；四階段、手動攻擊／消散、方向／招式、鍵盤／觸控、水平溢出及存檔隔離通過，頁面JavaScript執行錯誤0。七款PNG皆有透明通道。真機Safari／Android尚未驗證。

## 9. 男女法相雙版本

FAXIANG_VARIANTS[type][male|female] 定義14款名稱與圖片；FAXIANG_CONFIG 保持七屬性共用能力與特效。演武場 faxiang-gender 選單僅改法相，不改玩家女修圖集。元神選單仍按原12種id配對到同一七屬性。圖片替換暫存鍵改為 type:gender，避免男相上傳圖蓋掉女相。

gallery.html 增加全部／男性／女性篩選；URL 支援 ?faxiang=wood&gender=female。預設女性法相，完整14款均可預覽。snapshot 新增 faxiangGender／variantName。性別切換取消正在播放的法相，回到待機，不留下舊法相攻擊效果。

新增圖片：metal-male、wood-female、water-male、fire-female、earth-female、thunder-female、wind-female.png。男女性別不形成不同數值或資格，正式遊戲、存檔、版本號、遠端儲存庫及部署均未改。

男女版驗證完成：1200×1000、390×844、320×700 下，14款圖片、七屬性與男女名稱切換、12元神配對、四階段、觸控、存檔隔離均通過；JS執行錯誤0。圖鑑14款及男女各7款篩選通過。單檔HTML已另外確認角色圖集與14款法相均從內嵌資料載入，無JS錯誤。七張新增PNG均有透明通道。仍未做真機Safari／Android驗證。

## 10. 玩家性別綁定（取代第9節自由選擇規則）

依最新需求，女玩家僅使用女性法相，男玩家僅使用男性法相。app.js 只保留 playerGender 一個性別狀態；variant()、名稱、選單及圖片一律由它推導，不再儲存可獨立修改的法相性別。snapshot 的 faxiangGender 為 playerGender 的派生值。測試頁的 player-gender 選單是玩家角色性別模擬器，不是法相性別自由選擇器。

女角使用既有女修動畫；男角使用原儲存庫 images/battle/hero-male.jpg 靜態立繪（本地 assets/hero-male.jpg），不假冒已有男性三方向動畫。法相本身仍可正常播放。URL 使用 playerGender 指定演示角色，舊 gender 參數不再控制法相。圖鑑仍可檢視14款，進入演示時會選擇同一性別的玩家。

正式整合須直接讀遊戲 player.gender，不提供修改法相性別的選單，不能靠法相請求傳入的性別決定授權；可信後端應從角色資料讀取性別並校驗匹配。本次只實作獨立原型，正式遊戲和遠端資料未變更。
