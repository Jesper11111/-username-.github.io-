# 04 蒼穹女武神・艾爾：使用者新版分鏡替換

使用者2026-10-22提供4.jpg、4-1／4-2／4-3.jfif要求替換4號變身。四原圖原樣保存；舊images/sprites/morph/sky-valkyrie-v1/與tools/sprite-src/morph/sky-valkyrie-v1/完全保留，遊戲改讀v2。

使用內建image_gen依三張提供的分鏡去掉灰色棋盤與格線，保留新圖金甲、白布、金髮羽冠及多片金色羽翼。背面攻擊後兩格原轉成正面，修正為背向放箭／收弓；三向放箭與收勢補明確手臂／弓弦變化。prompts.json存全部完整提示詞，三份*-generated.png保留工具輸出。不是直接把假透明JPG接入遊戲。

prepare.py使用sky-valkyrie-v1/prepare.py的透明分格／腳點註冊函式，registration.json記錄每格來源框／腳點／身高，audit.json列輸出邊界。images/sprites/morph/sky-valkyrie-v2/保存36獨立RGBA格、4動作PNG圖集、AVIF試播、動作總覽、contact.png與manifest。

新版每方向走路4／射箭4／施法2／受傷2格，共36格，依使用者新分鏡數量；未複製或插值補到舊版72格。格子384×320、腳底[192,270]、charH160、drawH48不變。每格160／140／220／160ms，保留原總長640／560／440／320ms，不改能力、等級、移動速度／攻速數值、卷軸消耗或schema。

MORPHS.skyValkyrie與SW四圖改讀v2，m04的sprite key不變。本機版本20261022p。tools/test-valkyrie-v2-morph.js驗證真實卷軸、四向動作與到期／其他變身回歸；tools/valkyrie-v2-morph-preview.html使用真實renderer，不讀寫存檔或雲端。preview.py輸出本對話valkyrie-v2-motion.html四向四動作試播。
