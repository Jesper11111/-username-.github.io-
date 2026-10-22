# 16 烈焰死亡騎士：短促單手斬

2026-10-22，20261022s。使用者指定參考天堂1／經典版死亡騎士動作方向；這是保留自有火焰骷髏／黑甲／披風造型的新原創動畫，沒有使用商業遊戲圖片，也未聲稱復刻官方格數或秒數。

內建image_gen重畫三向各六格：持劍／抬劍／下斬／接觸／收勢／復位，縮小大範圍火焰月牙。初稿三PNG與prompts.json保留；右向接觸與收勢因劍尖跨格／鄰格劍影另生成獨立PNG，完整提示詞在right-contact-prompt.json與right-follow-through-prompt.json。

prepare.py共用sky-valkyrie-v1的透明分格／打包函式，產生flame-death-knight-v1/attack-v2.png、18單格、AVIF、contact、attack-v2-manifest.json與registration.json。384×320、腳底[192,270]、charH160、drawH48，6×80ms＝480ms；左鏡像右，原attack.png與原稿保留。只改視覺時間，不改戰鬥攻擊間隔、傷害、技能、消耗、能力或schema。

test-flame-death-knight-morph.js驗證四向完整六格、受傷不打斷攻擊及卷軸／其他變身回歸。tools/flame-death-knight-morph-preview.html使用實際選單／renderer，隔離存檔雲端。preview.py更新本對話flame-death-knight-v2-motion.html四動作互動試播，新步態8×65及攻擊6×80，施法受傷沿用原圖。
