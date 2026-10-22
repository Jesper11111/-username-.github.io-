# 矮人蒸氣火銃兵（05 藍變）

使用者2026-10-22提供5.jpg立繪及5-1.jpg分鏡，要求新增變身。reference.jpg／sheet-original.jpg保留原圖；內建image_gen將棋盤底轉成真透明並保留白蒸氣、鍋爐與細節，原稿sheet-transparent.png。

原分鏡的背面攻擊前兩格畫成正面、側面施法少一格，因此另畫三向低持槍／舉槍瞄準／開火後座／收槍共12格，以及側面施法2格。完整提示詞與原稿保留，不複製原地瞄準格充當開火動作。

本次接上既有m05專屬外觀，需求等級及能力沿用既有藍變槍手設定；不新增能力、不改存檔schema。正式圖集、分格與manifest在images/sprites/morph/dwarf-gunner-v1/。

初次去背仍有蒸氣跨格／白煙被切平，所以最終走路、正背施法與受傷另畫乾淨分鏡；完整來源為walk-generated.png、attack-generated.png、cast-front-back-generated.png、side-cast-generated.png、hit-generated.png。sheet-transparent.png保留初次去背紀錄，但不作正式動畫。prompts.json及clean-action-prompts.json保存所有內建image_gen提示詞。

prepare.py共用sky-valkyrie-v1/prepare.py的透明分格與註冊函式；正式每格384×320、腳底[192,270]、charH160／drawH48，列down／right／up、左鏡像。walk／attack每向4格、cast／hit各2格，共36格；時間130／140／220／150ms，開火總長560ms。36張單格、4動作PNG／透明AVIF及WebP、總覽、逐格來源manifest與audit皆保留。

preview.py輸出本對話dwarf-gunner-motion.html（原尺寸透明AVIF，四向四動作、播放／逐格）；tools/dwarf-morph-preview.html用真實usePotion／sceneReadEvents／sceneDraw顯示m05，不載存檔及雲端。tools/test-dwarf-morph.js測卷軸、動作、到期與預載。遊戲MORPHS.dwarfGunner、m05.sprite與SW四張預載圖接入20261022m。
