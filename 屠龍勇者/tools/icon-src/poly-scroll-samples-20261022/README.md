# 變形卷軸外觀樣品（2026-10-22）

使用者要求先製作幾款外觀樣品參考決定，暫不替換遊戲圖示。四款以內建image_gen原創生成：A古典獸印、B紫晶幻化、C暗黑骷髏、D金翼聖印；prompts.json保存各款完整提示詞，*-generated.png保留原圖。

prepare.py只做透明留邊／等比縮放與樣品排版，產出a～d-128.png及comparison.png（大圖與40px快捷欄對照），audit.json記錄尺寸／alpha。沒有寫入images/icons/items/polyScroll.png、不改ITEM_IMG、能力、數值、JS或版本號。

2026-10-22使用者選B紫晶幻化；20261022q新增images/icons/items/polyScroll-v2.png（b-128.png原樣複製），ITEM_IMG.polyScroll改讀新檔名避快取；舊polyScroll.png不動。A／C／D保留供日後陣營或軍團卷軸討論，目前沒有新增效果或道具。
