# 16 烈焰死亡騎士：八格步態

2026-10-22，20261022s。使用者指出腳步不連續、像滑行；原四格未完整交替，單獨補畫的側面末格也有接縫。

內建 image_gen 依既有原創16號外觀重畫三向各八格：落地／承重／過身／擺腿，再換另一腳。原稿 down／right／up-generated.png 與完整 prompts.json 保留。prepare.py 共用 sky-valkyrie-v1 的透明分格／打包函式，用固定骨盆與每列地面註冊，避免每格用腳掌中心對齊而抵消步幅。

執行 prepare.py 產生 flame-death-knight-v1/walk-v2.png、24獨立格、AVIF、contact及walk-v2-manifest.json；384×320、腳底[192,270]、charH160、drawH48，8×65ms＝520ms。左鏡像右。舊walk及原稿不覆寫。走路速度與原循環總長不變。

tools/flame-death-knight-walk-preview.html 實際sceneUpdate／sceneDraw地面行走，含新舊切換／停止／逐格；test-flame-death-knight-walk.js檢查四向八格、實際位移與移動速度不變。隔離存檔／網路。
