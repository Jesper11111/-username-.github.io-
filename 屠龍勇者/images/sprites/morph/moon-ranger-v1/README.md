# 月光精靈巡林者（紅變）外觀素材

2026-10-22。使用者已選擇「先完成外觀素材與試播，等級及能力稍後決定」。本套尚未加入變形卷軸選單，沒有新增能力或更動存檔。

| 動作 | 檔案 | 每方向格數 | 每格時間 |
|---|---|---|---|
| 走路 | walk.png | 4 | 130ms |
| 射箭 | attack.png | 4 | 140ms |
| 施法 | cast.png | 2 | 220ms |
| 受傷 | hit.png | 2 | 150ms |

- 共 36 格獨立透明 PNG（frames/）、4 張動作圖集及 contact.png 總覽。預覽 WebP 保留 alpha。
- 每格 320×240；charH160、建議 drawH48；腳底 (160,200)。列順序 down／right／up，左側鏡像 right。
- 沿用使用者分鏡姿勢與紅綠法光。原圖走路步幅差異較小、部分攻擊／施法以特效變化為主；這是原始動作的試播，沒有以插值或重複格子增加流暢度。
- 原分鏡側面放箭兩格上方弓尖被相鄰分格截短，已用內建 image_gen 修補完整弓尖及箭頭留白，bow-repair-generated.png／bow-repair-prompt.json 保留原稿與提示詞；所有分鏡共用腳底基準。外觀待使用者檢視。
- 原 JPG、立繪、內建 image_gen 去背原稿、提示詞、裁切整理腳本均在 tools/sprite-src/morph/moon-ranger-v1/。image_gen 處理透明背景，prepare.py 處理分格、等比縮放及腳點對齊。原始圖片不覆寫。
- manifest.json 提供圖集、方向、時間、格數及腳底基準；level／effects 留空。接入時使用新 anchor [160,200]，不可直接套用上一套的 [128,200]。
