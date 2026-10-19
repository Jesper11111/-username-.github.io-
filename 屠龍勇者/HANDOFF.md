# 黑暗大陸：交接文件（目前進度與待辦）

給接手的 AI：先讀 `AGENTS.md`（規則），再讀這份（現況）。技術細節在 `ARCHITECTURE.md`。
**這份要保持最新**：完成一件事、新增待辦、使用者做了新決定，都要回來改。最後更新：2026-10-19（Claude）。

## 1. 現況

- 本機 **`20261019t`** 待推送：路引改成路邊木頭路牌（使用者從樣本 A～D 選 D，第 63 節）。線上 **`20261019s`**：手機狀態欄／快捷欄閃爍修正（`ui.js` 的 `setHtmlStable`，第 62 節）。上一版 **`20261019r`** 已上線（防改檔第 2 波，第 60 節：交易所門檻、存檔加密簽章、雲端存檔簽章、記憶體偽裝、發佈版混淆；第 61 節：聊天依活躍程度輪詢、交易所列表快取，省 Supabase 傳輸量）。前一版 `20261019q`（圓形小地圖＋按 M／點小地圖開全世界地圖，第 59 節）已上線。
- Supabase 免費方案每月傳輸量約 5GB（整個遊戲共用），估計適合每天幾百人；人更多要考慮 Pro（每月 25 美元）。
- 大地圖接縫：13 條全部補完。還有幾處淡淡的霧（綠洲兩個角、熔火煉獄上下緣、金字塔右緣）可再補，使用者想做再切圖。
- 使用者存 AI 圖的習慣：存到 `images\maps\<id>.jfif`（或 `.png.jfif`），要搬到 `tools\bigmap\seams\fixed\<id>.jpg`（別留在 images，會被發佈）。
- 網址：`https://k559610142-art.github.io/-username-.github.io-/屠龍勇者/`（repo `k559610142-art/-username-.github.io-`，GitHub Pages 發佈 `main`）。
- 已完成的系統（詳見 `ARCHITECTURE.md` 各節）：12 職業（都有人物模型與立繪）＋職業故事／任務線、天堂原版經驗表、衝裝、暗黑式詞綴、
  製作通貨、異界地圖 T1～T15、共鳴裝備、天堂式魔法 1～10 級＋魔法書、快捷欄、離線收益、多角色欄位、
  帳號雲端存檔（Supabase）、團隊副本、聊天、血盟、排行榜、世界首領、交易所、共用倉庫／鑽石、音效＋背景音樂、PWA、
  大地圖（多張真地圖拼接、遮擋、交界路引、瞬移卷軸、傳送師）、防改檔（伺服器可疑紀錄、存檔加密簽章、雲端簽章、交易所門檻、混淆）。

## 2. 待辦（使用者還沒叫做的不要自己開工，先問）

- **使用者要做**：到 Supabase SQL Editor 執行 `tools/anticheat.sql`（第 60 節；沒執行前伺服器不檢查簽章與交易所門檻，遊戲照常）。
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
