# 月光精靈巡林者（紅變）素材來源

- 使用者於 2026-10-22 提供原創人物立繪及 36 格 JPG 分鏡。
- 本次範圍：外觀素材及互動試播；等級與能力稍後決定，未加入變形卷軸選單。
- reference.jpg／sheet-original.jpg 保留原始圖片；sheet-transparent.png 是內建 image_gen 去除背景的原稿，提示詞在 prompts.json。
- prepare.py 依實際人物框整理為透明分鏡／動作圖集，規格記錄於輸出的 manifest.json。原圖保留不覆寫。

## 20261022g 攻擊修正

原四格攻擊皆維持拉弓姿勢，使用者回報看不到攻擊。新增 12 格「準備／拉弓／放箭／收弓」，內建 image_gen 原稿及完整提示詞為 attack-motion-v2-*。prepare-attack-v2.py 打包 attack-v2.png（1280×720）、attack-v2-frames/、attack-v2-manifest.json，維持 320×240／腳底 [160,200]／charH160／140ms。

遊戲 MORPHS.moonRanger.attack 及離線清單改用 attack-v2.png；原 attack.png／frames／manifest.json 保留為舊版素材紀錄。重跑舊 prepare.py 不會產生新版攻擊；請另外執行 prepare-attack-v2.py。實際遊戲 m02 的等級／能力沿用 20261022e／f 設定，本次只改動作。
