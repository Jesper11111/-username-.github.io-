# 08 沉默洞穴刺客：專屬變身 v1

使用者提供 reference.jpg、front-original.jfif、back-original.jfif、back-alternate-original.jfif。保留四份原始檔，不修改或覆寫。

內建 image_gen 依紫黑兜帽蒙面忍裝、腰包、雙彎刃與藍色氣焰補繪正／側／背三向。背向全程保持背影；左向由側向鏡像。每方向12格：走路4、攻擊4（蓄勢、第一刀、交叉追斬、收勢）、施法2、受傷2。

prompts.json 保留初稿完整提示詞與參考圖角色；revision-prompts.json為側向重畫及正背面去除大片光霧的修正提示詞。down/right/up-generated.png保留初稿，正式選用三張*-generated-v2.png。registration-initial.json保留初次註冊；registration.json記正式每格來源範圍、角色腳底及身高，依實際行列位置調整範圍，沿用sky-valkyrie-v1的isolate去除不相連鄰格碎片及透明雜點，保留主要人物alpha、對齊雙腳站姿與輸出圖集，不合成肢體或用變形冒充新動作。

正式輸出：images/sprites/morph/silent-cave-assassin-v1/，384×320格、腳點[192,270]、charH160、drawH48。格速walk130／attack140／cast220／hit150ms。沿用m08藍變既有等級與能力，不改存檔。

prepare.py以Pillow及numpy打包；preview.py輸出四向四動作motion-preview.gif。tools/cave-assassin-morph-preview.html是隔離真實renderer預覽，可切遊戲實際大小48px。tools/test-cave-assassin-morph.js驗證卷軸扣量、Lv.15門檻、能力不變、四向戰鬥與到期、圖集及SW。
