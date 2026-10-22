# 27 裂空魔龍爪皇（紫變）

使用者於2026-10-22提供27.jpg與27-1／27-2／27-3.jfif要求新增變身。實際分鏡在桌面「變身人物」資料夾，原訊息標示桌面根目錄因此無法載入；四份原圖已原樣保存。分鏡多數是銀髮人形或持刀，混入龍頭角色，不能當成同一變身播放。

依27.jpg立繪用內建image_gen製作三向，每向走路4、鋼爪攻擊4、施法2、受傷2，共36格；左向鏡像。維持龍頭／雙角、紫黑鱗甲、胸口紅晶、巨爪腕鏈及紫焰龍翼，不使用銀髮人形或手持刀劍。攻擊為蓄勢→前爪揮擊→交叉重爪→收勢。prompts.json保存全部提示詞，down／right／up-generated.png為完整原稿。

prepare.py共用sky-valkyrie-v1/prepare.py的透明分格／腳點註冊函式；registration.json記錄每格裁切框、腳底與身高，audit.json列輸出邊界。正式單格PNG、四動作PNG圖集、AVIF試播、總覽與manifest在images/sprites/morph/rift-dragon-v1/。

每格384×320、腳底[192,270]、charH160、drawH48；walk／attack／cast／hit時間130／140／220／150ms，攻擊560ms。m27接MORPHS.riftDragon、SW預載四張PNG，本機版本20261022o。沿用既有紫變鋼爪能力與等級設定、卷軸消耗及schema。

tools/test-rift-dragon-morph.js檢查真實卷軸、四方向動作、到期／其他變身回歸；tools/rift-dragon-morph-preview.html為真實renderer隔離頁，不載存檔或雲端。preview.py輸出本對話rift-dragon-motion.html四動作試播。
