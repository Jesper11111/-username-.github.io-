# 鋼鐵狂戰士（藍變）

使用者提供12.jpg、12-1／12-2／12-3.jfif，原稿完整保留。
內建image_gen依參考製作正面、右向、背面各12格，並修正側／背面劍尖留邊。
完整提示詞見prompts-final.json（初稿prompts.json亦保留）；原生成圖保留為*-generated.png，修正稿另存*-repaired.png。

prepare.py沿用既有RGBA圖集打包流程：四動作walk4／attack4／cast2／hit2、三列down／right／up，left由引擎鏡射。
384×320格、腳底192／270、身高160、遊戲drawH48；每格時間130／140／220／150ms。
輸出images/sprites/morph/steel-berserker-v1，包含四張圖集、36格單圖、manifest與contact。
preview.py產生四向四動作動態檢查圖。

m12接MORPHS.steelBerserker，維持原Lv15、雙手劍系原能力與武器規則、GM豁免；不改存檔與32種變身數量。
tools/steel-berserker-preview.html為記憶體存檔、拒絕連外的實際遊戲繪圖預覽。
