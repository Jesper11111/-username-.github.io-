# 冥火骷髏神射（紫變）

使用者提供 3.jpg 人物立繪及 3-1.jpg 動作分鏡。本次沿用外觀素材與試播階段，不新增等級、能力或接入選單。

原分鏡有 33 格人物、3 格獨立箭矢；箭矢不能當人物格播放。內建 image_gen 去除灰白格，保留 33 格人物與箭矢，另補 3 方向各一格施法蓄力，使人物素材共 36 格。原圖、處理原稿、提示詞及裁切規格皆保留。

prepare.py 輸出至 images/sprites/morph/hellfire-archer-v1/：walk／attack 各 12 格、cast／hit 各 6 格，另有 3 張獨立 projectile 圖。每格 320×280、腳底 [160,240]、charH160；列 down／right／up，左鏡像。較高格子保留冥火及法陣空間，未來接入時不能套紅變的 240 高格子。所有 PNG 皆保留透明 alpha。

prompts.json 記錄完整生成提示詞；manifest.json 列出每格來源、裁切框與腳點，level／effects 留 null。原分鏡走路與射箭的肢體差異較小，目前試播如實保留；補畫的是三向施法蓄力。這次沒有把 m03 的遊戲外觀切換到新圖。

## 20261022k 攻擊修正

j 版由其他工作接入 m03 後，使用者指出仍然沒有攻擊動作。新增三方向各4格低持弓／拉弓／放箭／收弓，內建 image_gen 原稿 attack-motion-v2-generated.png、完整提示詞 attack-motion-v2-prompts.json、prepare-attack-v2.py；初稿24格保留為 attack-motion-v2-draft.png，沒有拿來接遊戲。

遊戲與 SW 改用 images/sprites/morph/hellfire-archer-v1/attack-v2.png，維持320×280、腳底[160,240]、charH160、4×140ms；舊 attack.png、frames、manifest.json 留作歷史來源，新版規格獨立記錄 attack-v2-manifest.json。重新製作低持弓姿勢與肩肘動作；命中與MISS皆觸發，沒有調整技能／攻速數值或存檔。prepare-attack-v2.py 共用隔壁 sky-valkyrie-v1/prepare.py 的透明分格及腳點整理函式。
