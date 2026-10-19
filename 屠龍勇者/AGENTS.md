# 黑暗大陸（屠龍勇者）：AI 工作規則（任何 AI 通用）

這份是給**所有 AI 助手**（Claude、Gemini、ChatGPT／Codex、Cursor……）的共同規則。
`CLAUDE.md`、`GEMINI.md` 只是指向這份。換新的 AI 接手時，叫它先讀這份，再讀 `HANDOFF.md`。

本資料夾 `屠龍勇者/` 是一款獨立的遊戲（遊戲內名稱「黑暗大陸」）：天堂 1 風格自動掛機 RPG，純 HTML＋JS、沒有建置步驟。
它跟上一層的「凡塵修仙傳」放在同一個 repo，但**不是**同一款遊戲；上一層的檔案和規則都不要動，也不要參考。

## 1. 先讀哪些檔案

1. **`HANDOFF.md`**：目前進度、待辦、使用者的習慣和做過的決定、環境限制。**接手第一件事就是讀它。**
2. **`ARCHITECTURE.md`**（約 1700 行，唯一的架構文件）：先讀第 1 節「專案結構」、第 2 節「載入順序」、第 3 節「開發規則」，
   再用 `## ` 標題找到要改的功能所在章節，**讀完該章節**才動手。不要憑檔名猜。
- 回覆一律用**繁體中文**。
- 不確定使用者要的是什麼時，先問，不要自己猜一個版本做下去。（曾發生過：使用者要「只有點名牌才觸發」，結果被做成「放大身體的點擊範圍」。）

## 2. 修改時一定要遵守

1. **換版本號**：改了任何 JS，`index.html` 裡**所有** `?v=` 和 `data/config.js` 的 `GAME_VERSION` 都要換成新版本號。
   格式是 `YYYYMMDD`＋一個小寫字母（例如 `20261019k` → `20261019l`；換日期就從 `a` 開始）。目前的版本號寫在 `ARCHITECTURE.md` 第 3 節。
   原因：Service Worker 依版本號快取，沒換的話，手機上已安裝 App 的玩家會一直跑舊程式。已推上線的版本號不能重用。
2. **同步更新 `ARCHITECTURE.md`**：新增／刪除檔案、新的全域函式或資料、調整 `<script>` 載入順序、改玩法或數值，
   都要更新對應章節（第 1 節檔案表、第 2 節載入順序、功能章節）；新功能就新增一節，標題附日期和版本號，格式照現有章節寫。
   **完成或新增待辦時，也要更新 `HANDOFF.md`**。
3. **不能用原生 `alert`／`confirm`／`prompt`**（手機會被擋，玩家以為沒反應），一律用 `gameAlert`／`gameConfirm`／`showToast`。
4. `onclick="…"` 這類 HTML 事件字串**只能呼叫頂層函式、傳字面值**，裡面不要直接寫 `player`。
5. 所有檔案是普通 `<script>` 依序載入、共用全域變數。新檔案要依「載入時」需要的東西插入正確位置（第 2 節）。
6. **改存檔結構**（`player` 的欄位）時，要把 `SAVE_SCHEMA` 加 1，並在 `save.js` 的 `migrateSave` 補上舊存檔轉換。這種改動風險高，先跟使用者確認。
7. 時間相關（增益、冷卻、步行）用遊戲時鐘 `gameNow`，不要用 `Date.now()`（龍穴冷卻這類真實時間除外，見第 3 節）。
8. 合併 git 衝突後，一定要搜尋整個資料夾有沒有殘留的 `<<<<<<<`，留著的話整個遊戲會載不起來。
9. **防改檔**（`ARCHITECTURE.md` 第 60 節）：localStorage 的存檔是加密的，讀寫一律用 `saveParse(raw)`／`saveEncode(JSON.stringify(…))`（`guard.js`），不要直接 `JSON.parse`。
   `player` 換成新物件時要 `guardWrap(player)`。上線版是混淆過的（`tools/build.js`），事件字串只能呼叫頂層函式。
9. 程式風格跟周圍的程式一致：命名、註解的多寡、寫法都照原本的。只動這次任務需要的檔案，不要順手重構。

## 3. 禁止事項

- 不要刪除或覆寫存檔、圖片、音樂、`tools/sprite-src/` 這類原始素材。
- `data/cloud.js` 的 Supabase 設定、`tools/*.sql`（正式資料庫的規則）：**不要改**，要改先跟使用者確認；SQL 要由使用者自己貼到 Supabase 執行。
- 不要使用或複製官方《天堂》／《天堂 M》《我獨自升級》等商業作品的圖片，只能用原創、使用者自己生成或免費授權（CC0 等）的素材。
- 本機測試時不要讓測試角色上傳到線上（排行榜、雲端存檔）；會改數值的測試先備份 localStorage 的 `dragonSlayer_*` 存檔。

## 4. 測試與發佈（每個 AI 都要能獨立走完，不需要別的 AI 幫忙）

使用者會直接找你改遊戲，**沒有其他 AI 幫你檢查**，所以下面每一步都要自己做完：

1. **改程式**（照第 1～3 節）。
2. **自動檢查**：執行 `powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1`，
   會檢查 JS 語法、所有 `?v=` 跟 `GAME_VERSION` 一致、每個 `data/*.js` 都有載入、沒有殘留衝突標記。
   要看到 `ALL CHECKS PASSED` 才能往下；有 `[FAIL]` 就修到全部通過。
3. **請使用者實際玩一次**：本機伺服器 `http://localhost:8790/`（使用者用 `Gemini改遊戲.bat`／`ChatGPT改遊戲.bat` 開啟時已自動啟動並開好瀏覽器；
   沒開的話執行 `powershell -NoProfile -ExecutionPolicy Bypass -File ..\tools\serve.ps1 -Root . -Port 8790`，它會一直執行，要另開視窗）。
   能自己開瀏覽器的 AI 就自己測：**Console 沒有錯誤**、實際走一次相關畫面。
   不能的話，給使用者「照著點」的步驟（格式見 `HANDOFF.md` 第 5 節），等使用者回報沒問題。有問題就修，回到第 2 步。
4. **commit**：使用者說沒問題後，`git add` 這次改的檔案（不要用 `git add -A`），commit 到本機 `main`，訊息格式「黑暗大陸：做了什麼，版本號」。
   `git` 找不到時用完整路徑 `C:\Program Files\Git\cmd\git.exe`（`HANDOFF.md` 第 4 節）。
5. **請使用者推送**：告訴使用者「請在 GitHub Desktop 按 Push origin」。終端機沒有 git 憑證，AI 自己推不上去；使用者不開 PR，直接 main 就好。
   GitHub Pages 發佈 `main`，網址 `https://k559610142-art.github.io/-username-.github.io-/屠龍勇者/`，推上去約 1～2 分鐘上線。
6. **更新 `HANDOFF.md`**（現況的版本號、完成／新增的待辦）並一起 commit。

- 不要 `git push --force`、`git reset --hard`、切換分支或刪除分支。
- 改壞想還原：用 `git diff` 看改了什麼，`git checkout -- 檔名` 還原單一檔案（還原前先跟使用者確認）。
