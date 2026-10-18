# 屠龍勇者：Claude 工作規則

本資料夾是獨立的新遊戲（天堂 1 風格自動掛機 RPG），**不是**凡塵修仙傳。在這裡工作時：

1. 修改前先讀本資料夾的 `ARCHITECTURE.md`（不是上一層修仙的那份），改完同步更新它。
2. 回覆使用者一律用繁體中文。
3. 改 JS 要換 `index.html` 所有 `?v=` 與 `data/config.js` 的 `GAME_VERSION`。
4. 本機測試用 `.claude/launch.json` 的 `dragon`（port 8790）；Console 無錯誤、實際走一次畫面再交付。
5. 所有 AI 共用的完整規則在 `AGENTS.md`、目前進度與待辦在 `HANDOFF.md`（換 AI 接手時靠這兩份）。
   完成一件事、新增待辦、使用者做了新決定，除了自己的記憶，也要更新 `HANDOFF.md`，讓別的 AI 也知道。
