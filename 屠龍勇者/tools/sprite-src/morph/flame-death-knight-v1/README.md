# 16 烈焰死亡騎士（紅變）

使用者2026-10-22提供16.jpg與16-1／16-2／16-3.jfif要求加入變形卷軸。四檔實際在桌面「變身人物」，這裡保留原樣副本。原表缺側向、部分走路沒劍、背向受傷混正面；以內建image_gen依原創立繪補齊三向，各走4／揮劍4／施法2／受傷2，共36格，左向鏡像。

prompts.json保存三向完整提示詞；repair-prompts.json／up-repair-prompt.json／walk-repair-prompt.json／up-strip-prompt.json／recovery-prompt.json保存每輪修補。*-initial.png為初稿，*-generated.png與兩份單格及背向三格修補為正式來源；全部透明alpha，未覆寫使用者原圖。

register.py／registration.json記錄每格來源、裁切框、解剖身高與腳點；prepare.py共用sky-valkyrie-v1/prepare.py的透明分格與註冊函式，audit.json記錄實際邊界。正式images/sprites/morph/flame-death-knight-v1/保存36格RGBA、四PNG圖集、AVIF試播、總覽與manifest。

格384×320／腳底[192,270]／charH160／drawH48；walk130／attack140／cast220／hit150ms，攻擊560ms。m16接MORPHS.flameDeathKnight，保留原紅變單手劍能力／等級／卷軸消耗與schema，版本20261022r。

tools/flame-death-knight-morph-preview.html以真實卷軸選單／renderer隔離檢查，saveGame／refreshUI及音效在此頁隔離；test-flame-death-knight-morph.js測扣量、四向動作、到期及其他變身回歸。preview.py產生本對話flame-death-knight-motion.html，不寫真實角色存檔或上傳雲端。
