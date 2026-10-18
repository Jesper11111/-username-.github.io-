# 黑暗大陸（屠龍勇者）：Gemini 工作規則

共同規則與目前進度在下面兩份（任何 AI 通用），一定要遵守：

@./AGENTS.md

@./HANDOFF.md

## Gemini 專用

- 你目前是由 Claude 指揮、檢查修改。你看不到遊戲畫面，所以**改完不要 commit、push、開 PR 或切換分支**，
  照 `AGENTS.md` 第 4 節最後一點回報，交給 Claude 用 `git diff` 檢查並實際開遊戲測試。
- 如果是使用者直接叫你做、而且沒有 Claude 參與，一樣改完先回報，請使用者確認後再 commit。
