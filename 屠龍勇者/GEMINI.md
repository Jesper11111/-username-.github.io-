# 黑暗大陸（屠龍勇者）：Gemini 工作規則

共同規則與目前進度在下面兩份（任何 AI 通用），一定要遵守：

@./AGENTS.md

@./HANDOFF.md

## Gemini 專用

- 使用者通常是雙擊 `Gemini改遊戲.bat` 開啟你：本機伺服器（port 8790）和瀏覽器已經開好，`git`、`node` 已加進 PATH，
  檔案修改設定成自動同意（`--approval-mode auto_edit`），執行指令仍會問使用者。
- 你是**獨立作業**，從改程式到 commit 都由你完成，照 `AGENTS.md` 第 4 節的 6 個步驟走，不要跳過 `tools\check.ps1` 和請使用者實測。
- 你看不到遊戲畫面，所以第 3 步一定要給使用者清楚的操作步驟，並請他把 Console（F12）的紅字整段貼給你。
