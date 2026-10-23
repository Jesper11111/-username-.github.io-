# 32 霜獄幽冥魔皇

使用者2026-10-23提供32四份jfif，確認名稱、金變、近戰武器通用。保留原圖；內建image_gen補齊36格三向動作，另補側向12格以修正初稿錯誤。完整提示詞prompts.json、原稿sheet-transparent.png、side-generated.png與腳點registration.json一併保存。

prepare.py（Pillow、NumPy）共用既有透明連通區隔離工具，依來源框／腳點打包，不做複製補間；輸出images/sprites/morph/frost-nether-emperor-v1。格384×320、foot[192,270]、charH160、drawH48；走4×130／攻4×140／施2×220／傷2×150ms；方向下／右／上，左鏡像。

實際renderer隔離預覽：tools/frost-emperor-morph-preview.html；回歸：tools/test-frost-emperor-morph.js。預覽僅使用記憶體storage並禁止連外。版本20261023s，待使用者實玩確認才提交。
