# 06 暗影海盜雙槍客（紅變）

使用者提供6.jpg及6-1／6-2／6-3.jfif，三張動作圖實際位於桌面的變身人物資料夾；本目錄保留四份原始圖。內建image_gen依三角海盜帽、骷髏面巾、黑紅長外套、雙燧發槍與紅色氣焰補繪正／側／背三向，各12格。背面攻擊重畫成真正背對鏡頭，左向鏡像右向。

prompts.json保留完整提示詞與各圖參考路徑，*-generated.png為透明原稿。prepare.py沿用sky-valkyrie-v1的isolate去除不相連鄰格碎片，依registration.json實際分格、雙腳站姿與身高對齊；保留alpha，不合成肢體或用變形冒充新動作。側向施法釋放格較寬，已獨立登記來源範圍。

正式輸出images/sprites/morph/shadow-pirate-gunner-v1：36格獨立RGBA、walk／attack／cast／hit圖集、透明AVIF、contact及manifest。格子384×320，腳點[192,270]，charH160／drawH48；4／4／2／2格，130／140／220／150ms，攻擊560ms。preview.py可重建四向四動作motion-preview.gif。

接現有m06，不新增第33款；維持Lv.35槍手紅變、命中+5／傷害+4／攻速+8%、需要裝槍、GM等級豁免與schema7。tools/pirate-morph-preview.html提供真實卷軸及renderer隔離試播，test-pirate-morph.js檢查門檻／武器／扣卷／四向戰鬥及到期。
