# 31 煉獄雷霆魔皇

使用者提供四份原創參考，並確認金變、近戰武器通用與名稱。內建 image_gen 生成與去背，完整提示詞保存在 prompts.json，原圖與兩份生成稿均保留。alpha-check.jpg為去背在灰底上的檢查圖。

執行 prepare.py（Pillow、NumPy）依 registration.json 裁切、去鄰格碎片與腳底對齊；輸出 images/sprites/morph/infernal-thunder-emperor-v1。36格、384×320、foot[192,270]、charH160、drawH48；正／右／背，左鏡像。走4×130、攻4×140、施2×220、傷2×150毫秒。腳底手動註冊，不用格子底部定位；無複製補間格。

遊戲資料夾下 tools/infernal-emperor-morph-preview.html 提供實際遊戲renderer與卷軸選單、四向四動作、循環與逐格，記憶體存檔並禁止連外。測試入口 tools/test-infernal-emperor-morph.js。版本20261023r；待使用者實玩驗收。
