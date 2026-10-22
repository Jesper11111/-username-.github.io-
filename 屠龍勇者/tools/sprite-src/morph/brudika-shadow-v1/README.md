# 10 布魯迪卡之影（紫變）

使用者於2026-10-22提供立繪10.jpg與10-1／10-2／10-3.jfif要求新增變身。四個原始檔保留在本資料夾；後兩張只有走路為背面，攻擊／施法／受傷仍為正面，也缺側面。

使用內建image_gen補畫三個方向，每向走路4、雙刀攻擊4、施法2、受傷2，共36格，左向鏡像。角色維持銀髮、紫黑甲、紫色蝠翼與雙刀；雙刀攻擊依蓄勢→第一刀→交叉追斬→收勢。prompts.json保存三份完整提示詞，去背修補另有extraction-prompt.json。原生成PNG與不用的初稿都保留。

prepare.py共用sky-valkyrie-v1/prepare.py的透明分格與腳點註冊函式；registration.json記錄各格裁切框、腳底及身高，audit.json列輸出邊界。正式單格、walk／attack／cast／hit圖集、AVIF試播、總覽、manifest在images/sprites/morph/brudika-shadow-v1/。

每格384×320、腳底[192,270]、charH160、drawH48。時間130／140／220／150ms，攻擊560ms。m10.sprite接brudikaShadow、SW預載四張PNG，版本20261022n。既有紫變雙刀能力、等級設定、卷軸消耗及存檔結構不變。

tools/test-brudika-morph.js檢查真實卷軸使用、動作、到期與其他變身回歸；tools/brudika-morph-preview.html為不讀寫存檔／雲端的真實renderer隔離頁。preview.py輸出本對話brudika-shadow-motion.html四向四動作試播。
