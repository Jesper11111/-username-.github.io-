# 專案架構說明（凡塵修仙傳-三界之戰）

> **維護規則：本檔案需與程式碼同步更新。**
> 每次新增/刪除/搬移 `data/` 內的檔案、新增全域函式或資料、或調整 `<script>` 載入順序時，
> 都必須回來更新本檔案對應的段落（檔案清單、依賴關係表、函式對照表）。
> 這是本專案唯一的架構文件，過期的文件比沒有文件更危險。

## 1. 專案結構

```
package.json          建置工具相依（terser、acorn；node_modules/ 與 dist/ 在 .gitignore）。第 72 節
.github/workflows/pages.yml  GitHub Actions：main 有新提交 → node tools/build.js → 發佈 dist/ 到 GitHub Pages（Pages 來源需設為 GitHub Actions，第 72 節）
tools/build.js        建置：data/*.js 打包進同一個函式範圍＋terser 混淆 → dist/（遊戲資料不再是全域變數；只公開事件用到的函式，第 72 節）
CLAUDE.md             給 Claude 的工作規則（2026-10-03）：修改前先讀本檔、修改後同步更新本檔、回覆用繁體中文、驗證後自動開 PR 並合併進 main 發佈
gm.html               戰力榜 GM 後台（第 50 節）：只有 Firestore admins 名單內的 Google 帳號能刪除／封鎖／審核守城榜；不是遊戲頁面，遊戲內沒有連結
                      （載入 data/config-realms、config-leaderboard、config-bounty、bounty、config-defense.js）
manifest.json         PWA 設定（名稱、圖示、standalone、底色 #05070c；第 64 節）
sw.js                 Service Worker（必須放在根目錄，範圍才涵蓋整個遊戲）：頁面網路優先、帶 ?v= 的 JS 快取優先、其他圖片先給快取再背景更新；影片與外部網域不攔（第 64 節）
index.html            唯一的遊戲 HTML 進入點：畫面結構、CSS（含手機 RWD，見第 6 節）、
                      彈窗(modal) DOM、<script src> 載入清單
                      ※ 檔名必須是 index.html（GitHub Pages 只把 index.html 當作預設首頁）
images/               圖片素材
  home-bg.jpg         洞府主畫面背景・手機版（704×1520，頭像框／資源框／側邊按鈕／底部導覽已畫在圖上，見第 31 節）
  home-bg-pc.jpg      洞府主畫面背景・PC 版（1376×768，玩家提供；上方五顆導覽鈕已用程式修圖移除；傳送門牌匾抹除、右下改字為情緣／世界，見第 34 節）
  avatar-male.jpg     男修頭像（韓立，597×335 橫式）
  avatar-female.jpg   女修頭像（南宮婉，599×333 橫式）
                      ※ 頭像原本放在外部圖床 postimg.cc，已改為本地檔案；橫式圖裁成圓形時依 PLAYER_AVATARS.pos 對準臉部
  evil-hall.jpg       殺手殿堂場景背景（937×625，玩家提供；獵殺邪修入口，見第 27 節）
  secret/             秘境海報（config-secret-realms.js 的 img，第 43 節）：zhenmo-tower.jpg 鎮魔塔（768×1365，9:16，玩家提供的水墨海報，圖上已有標題與標語）、
                      motu-tiannan.jpg 魔屠天南手機版（852×1846）／motu-tiannan-pc.jpg PC 版（1024×1536），玩家提供的 webp 以瀏覽器轉 JPG（圖上無字，標題由程式疊上，第 49 節）
  zhenmo/             鎮魔塔戰鬥畫面（第 51 節；boss-modaifu.jpg 第 7 層墨大夫、boss-moxue.jpg 第 8 層墨居仁・血魔真身 848×1264、boss-xixiong.jpg 第 9 層襲胸雙雄 848×1264 直式插畫、boss-tiangou.jpg 第 10 層樓主天狗 848×1264 水墨插畫、boss-shiyue.jpg 第 15 層鎮關者噬月魔子 848×1264、boss-yamata.jpg 第 20 層樓主八岐大蛇 848×1264 浮世繪、boss-amaterasu.jpg 第 30 層樓主天照大神 848×1264 浮世繪、boss-susanoo.jpg 第 40 層樓主需佐能呼 848×1264 浮世繪、boss-liudao.jpg 第 50 層樓主六道極聖 848×1264、boss-tiancai.jpg 第 60 層樓主天裁真君 848×1264；boss-opwang.jpg 世界 Boss OP王 640×480，從 OP2 動畫截圖，第 75 節）：hero-female.png／hero-male.png 主角背影立繪（玩家提供的一張雙人圖，於 x=461～465 白線左右裁切，
                      黑底依亮度轉透明並還原邊緣顏色，tools 外的一次性腳本；460×843／459×843），boss-qitianshen.jpg 第 1 層 BOSS 棄天神（2026-09-27 換成玩家提供的直式版 848×1264，2:3，左上有字）、boss-bumiegu.jpg 第 2 層 BOSS 不滅骨（2026-09-27 換成玩家提供的直式版 848×1264，2:3）、boss-zhuzhou.jpg 第 3 層 BOSS 主咒之王、boss-guihu.jpg 第 4 層 BOSS 幽冥鬼虎、boss-qingming.jpg 第 5 層 BOSS 青瞑爪龍（皆 848×1264）、boss-pharaoh.jpg 第 6 層 BOSS 黑暗法老王（玩家提供 687×1024，2:3，右下角有極小的「1024x1536」字樣）
  icons/              PWA 圖示（第 64 節）：icon-192／icon-512（any）、icon-maskable-512（Android 自適應，取景較寬讓標題落在中間 80% 安全區）、
                      apple-touch-icon（180）、favicon-32；皆由玩家提供的 1024×1024 海報 icon-source-1024.jpg 裁出（2026-10-01 第二版：韓立、南宮婉對望＋中間金色直式書法標題，取標題特寫、左右各露半張臉；第一版海報留在 icon-source-1024-v1.jpg）
  avatars/            可解鎖更換的頭像（256×256 正方形、臉部置中，由玩家提供的原圖裁切縮小），見第 32 節
  towns/              城內場景圖（玩家提供，第 20 節）：tianxing-market.jpg 天星城坊市橫圖（1582×672）、
                      tianxing-market-portrait.jpg 手機直式（704×1520，9:19.4）——2026-10-01 起遊戲改用 tianxing-market-v2.jpg／tianxing-market-portrait-v2.jpg（擦掉賭坊拱門前白衣女子的版本），原圖保留；
                      npc-baiyi.png（61×155）／npc-baiyi-portrait.png（61×246）＝從原圖剪下的白衣身影（＝大主宰・牧塵），定時疊回原位（第 20 節）、
                      muchen-portrait-v2.jpg 牧塵立繪（640×956，玩家提供第二版、無平台標誌，點他時對話框上方顯示；第一版 muchen-portrait.jpg 已刪）、
                      npc-fengxi.png 亂星海第一大善人・風希人偶（252×400 透明 PNG，由玩家提供的插畫手動描邊去背）、
                      npc-aosika-1.png／npc-aosika-2.png 天南市集隱藏 NPC 香腸大師・奧斯卡的兩個藏身點（150×300 透明 PNG＝場景座標 ×3；
                      玩家提供的灰底 3D 立繪去背、發光香腸改畫成不發光的烤香腸、調暗偏暖、自帶接地陰影、被甕擋住的部分已挖空；2 號左右翻轉）、
                      duel-aosika.jpg 奧斯卡決鬥畫面海報（848×1264，玩家提供，圖上已有台詞與《斗羅大陸》字樣，原檔照用 299KB）
  maps/               world-renjie.jpg 人界地圖（1408×768，玩家提供，「世界」導覽開啟的全螢幕地圖，第 20 節）；world-lingjie.jpg 靈界地圖（1024×559，玩家提供，人界「飛升點」進入）；
                      feisheng-gate.jpg 飛升台（玩家提供 848×1264 縮成 600×894、145KB；人界飛升點浮起後的入口畫面，圖上疊五行法陣與光柱，第 20 節）；safe-zone.jpg 安全區（宗門、天南城、天星城）的戰場實況圖（config-maps.js 的 SAFE_ZONE_IMG，第 59 節；玩家提供 848×1264 縮成 480×715、88KB）；
                      修仙地圖卡片縮圖（config-maps.js 的 thumb）：tianxing-city.jpg 天星城（720×381，玩家提供，第 20 節）、
                      tiannan-city-male.jpg／tiannan-city-female.jpg 天南城（720×405，玩家提供，依玩家性別顯示，第 20 節）
  monsters/           野外小怪（第 59 節 FIELD_MONSTERS，2026-10-03 起在 config-monsters.js）：spider／turtle／wraith／zombie／sorcerer／puppet.jpg＝碧眼毒蛛、玄甲靈龜、怨魂、百年殭屍、魔道術士、傀儡魔偶
                      （2026-10-03 玩家提供 1408×768 合成圖，圖上中文標籤先用旁邊背景羽化覆蓋，再依主體裁出 200×195～475×423，13～60KB；第 66 節）；dragon／white-tiger／qilin／nine-tail-fox／phoenix／ghost-general／ghoul.jpg，玩家提供的 1408×768 橫圖以主體為中心裁成 480×480（各約 25～50KB）；
                      righteous-cultivator.jpg 野外正道修士（config-merit.js 的 CULTIVATOR_IMGS，第 27、59 節；玩家提供 848×1264 直式縮成 480×715、77KB）、
                      assassin.jpg 暗殺者（AMBUSH_IMG；玩家提供 687×1024 縮成 480×715、72KB）、demonic-cultivator.jpg 野外魔道修士（CULTIVATOR_IMGS；848×1264 縮成 480×715、73KB）、
                      heart-demon-male.jpg／heart-demon-female.jpg 男／女角渡劫心魔（config-tribulation.js 的 HEART_DEMON_IMGS，第 7 節；皆 480×715，80／75KB）
  equip/              角色裝備欄中間的人物正面圖（第 60 節）：hero-male.jpg 520×592／hero-female.jpg 520×459（玩家提供，縮小）
  battle/             戰場實況（第 59 節）：hero-male.jpg／hero-female.jpg 人物立繪（2026-09-28 版本 `20260930w` 換成玩家提供的「站在飛劍上的背影」新圖：男 480×531、女 480×594（女圖原本四角有圓形玻璃框，裁掉兩側與上緣）；舊圖留在 hero-male-v1.jpg／hero-female-v1.jpg；版本 `20260930z` 起玩家要求「人物取完整、露出整把武器、貼左邊」：`.bf-hero` 改 `object-fit: contain` 靠左下、寬 44%（斜切線最左點，劍尖不會被切），上緣與右緣用 mask 淡出，後面墊 `#bf-hero-bg`＝同一張圖模糊放大（`updateBattleHero` 設背景）；呼吸動畫改為只上下浮動、前衝與閃避改為只平移，不再放大以免切到頭或劍尖），emblem.jpg 金紅圓環徽章（從玩家提供的血條參考圖裁出 200×200，CSS 以 screen 混色去黑底）
  frames/             頭像光環 frame-01～25.png（透明 PNG，約 125～160px，由玩家提供的頭像框展示圖裁切去背），見第 32 節；frame-ys-*.png 7 個元神環（程式繪製，第 65 節）
  cover.jpg           主頁封面・橫式（1264x843），電腦與橫向螢幕使用
  cover-portrait.jpg  主頁封面・直式（960x1920），手機直向使用（由橫式圖重新構圖而成）
videos/               影片：fengxi-dance.mp4 風希跳舞彩蛋（玩家提供；2026-09-27 壓成 854×480、18 秒、約 0.52 Mbps＋AAC 64k 單聲道、1.35 MB，第 39 節）
  world-boss/         世界 Boss「OP王」專屬的戰鬥動畫（第 75 節）：op1.mp4 標題卡、op2.mp4 金甲武神（使用者提供的 op1／OP2／OP3，OP2 與 OP3 原本是同一個檔案；1280×720 5 Mbps 6.3MB → 854×480 1.2 Mbps＋AAC，各約 1.7MB，Media Foundation 轉檔＋faststart）、
                      op3.mp4 第三段（2026-10-06 使用者提供 gemini_generated_video_0fcfc6c4.mp4，1280×720 20 秒 13.3MB → 854×480 1.2 Mbps＋AAC 128k、20 秒、3.4MB，同樣轉檔＋faststart）
  defense/            死守天南城背景影片（第 49 節）：battle.mp4 城牆雷戰（10.97 秒、2.75 MB）、flame.mp4 佛焰金身（8.8 秒、2.38 MB）、sword.mp4 巨劍劍氣（8.73 秒、2.34 MB），
                      皆 720×1280、H.264、無聲、頭尾淡入淡出（trim 0.6）；原始檔 v1c771…mp4／Pippit_0926_BuddhaFlame.mp4／Pippit_0926_GiantSwordAura.mp4（1080×1920、10～18 MB）仍在 videos/
tools/                不會被遊戲載入的維護工具
  裝備清單-850種.csv   850 種裝備的來源資料（Excel 可開啟；UTF-8 BOM），改完執行下一行的腳本
  csv-to-js.ps1       把 CSV 轉成 data/config-gear-catalog.js（powershell -ExecutionPolicy Bypass -File tools\csv-to-js.ps1）
  cut-figure.ps1      以手描外框去背（-Src 圖 -OutPng 輸出 -Preview 預覽 -PointsFile 外框點檔；點檔每行 "x,y"，空白行分隔，第一組外框、其餘為挖掉的洞）
  cut-figure-points-fengxi.txt  風希人偶的外框點（原圖 768×1376，玩家提供的插畫）
  裝備介面模板.html    角色裝備改版的可操作模板（假資料，遊戲不載入；第 60 節）
  闖關戰棋原型.html    新玩法參考原型（2026-10-01，遊戲不載入）：「虛天殿」8 層分岔闖關（Roguelike，敵人預告意圖、勝後三選一功法、奇遇／寶箱／調息；
                      簡易機器人 300 趟勝率約 67%）＋「血色禁地」8×8 戰棋（韓立／南宮婉／啼魂獸 對 血狼／毒蠍／墨蛟，地形、五行相剋、反擊、敵方範圍、敵方 AI）
                      ＋接進遊戲的比較（建議先做闖關當第三個秘境）。已發布為 Artifact：https://claude.ai/artifact/WDc445kFYCPEFtPWZkiXBL（私人）。2026-10-01 已做成奇遇接進遊戲（第 63 節），此檔保留當原型。
  三界戰場原型.html    千人淘汰爭霸賽原型（2026-10-01，遊戲不載入；使用者選「先做原型、對手用 NPC、改千人淘汰」）：999 名 NPC＋玩家，
                      海選 5 輪瑞士制（同勝場內上半對下半），勝場→小分（對手勝場和）→戰力 取前 100 名；百強單淘汰（前 28 種子輪空，每輪依種子最高對最低重排）直到「三界至尊」。
                      勝率 1/(1+(戰力比)^-4)，戰法猛攻／穩守／奇襲互剋 ×1.12；名次獎勵建議表。實測 200 屆：千人第 10 名約 90% 進百強、第 150 名約 25%。
                      已發布為 Artifact：https://claude.ai/artifact/6eugX7AKTDHCDYSkBqWd8V（私人）。2026-10-01 已做成奇遇接進遊戲（第 63 節），此檔保留當原型。
  數值設計器.html      新數值制度試算工具（2026-09-27；遊戲不載入）：成長倍率、六大屬性（含新增的敏捷）、增益上限、技能、怪物與 BOSS 參數 →
                      各境界空手／普攻／技能／小怪與 BOSS 血量、「打低幾境的怪要幾下」。已發布為 Artifact：https://claude.ai/artifact/XpVkm2XTdA9pCEGEuD6HwB（私人）；
                      「複製設定」得到的 JSON 就是之後數值重做的定案依據。尚未套用到遊戲。
  firestore.rules     天下戰力榜＋守城榜（defenseSubmit／defenseBoard）＋GM 後台的 Firestore 安全規則（貼到 Firebase 主控台，第 42、49、50 節）
  serve.ps1           本機測試用靜態伺服器（這台電腦沒有 Python／Node；2026-09-27）：Claude 預覽面板用 `.claude/launch.json` 的 `game` 設定啟動（http://localhost:8780）。
                      ⚠️ 8765 埠會被 Windows 保留，停掉後常無法再綁，所以改用 8780。新制開關存在各網址自己的 localStorage，換埠號要重新打開（第 52 節）
  cut-avatar-frames.ps1  從頭像框展示圖裁出 25 個光環並去背、量內圈（-Src 圖檔 -OutDir 輸出資料夾；格線座標寫死在檔內，見第 32 節）
data/                 所有遊戲邏輯與資料，依「設定資料 / 執行狀態 / 功能模組 / 進入點」分層
  format.js           數字顯示格式 fmtNum()／xxx.toWan()：1 萬以上用中文單位（1000萬、1.5億），**第一個載入**（第 41 節）
  config-*.js         純資料表（原則上不含函式、無副作用），可視為遊戲的「設計數值表」：
                      realms / level / lifespan / maps / sects / lingbao / shop / beasts /
                      servants / equipment / tribulation / quests / activities / daily-quests / elements / merit / bounty / talisman / avatars / home-pc / spells /
                      gear-catalog / gear / enhance / sets / profession / titles（裝備系統，第 37 節）/ strange-fire（天下異火 50 種，第 38 節）/ partners（情緣夥伴，第 39 節）/ towns（城內場景，第 20 節）/ leaderboard（天下戰力榜 Firebase 設定，第 42 節）/ secret-realms（秘境列表，第 43 節）/ defense（死守天南城 100 波，第 49 節）/ zhenmo、zhenmo-questions（鎮魔塔設定與 300 題題庫，第 51 節）/ numeric（數值重做開關 NUMERIC_V2 與參數，第 52 節）/ aptitude（先天靈根與體質，第 53 節）/ golden-core（丹田、金丹、元嬰，第 54 節）/ mailbox（仙府信箱與兌換碼，第 56 節，gm.html 也載入）/ economy（賺錢管道，第 61 節）/ encounter（奇遇觸發與獎勵，第 63 節）/ yuanshen（元神與化神訣殘本，第 65 節）/ talents（天賦樹 6 路線 48 節點，第 68 節）/ monsters（野外妖獸型態、圖鑑、各地圖出沒組合，第 66 節；`FIELD_MONSTERS` 由 config-maps.js 搬來，載入在 config-maps.js 之後）
                      （config-gear-catalog.js 由 tools/csv-to-js.ps1 自動產生，請改 CSV）
                      （config-realms.js 另含修煉節奏表 realmPacing，經驗門檻與壽元流逝都由它換算，見第 26 節）
                      （config-sects.js 例外：尾端有一段迴圈補上技能倍率，並提供 findSectByName()）
                      （config-defense.js 例外：尾端有守城強度曲線 defenseRealmAtk()／defenseWaveAtk()，gm.html 也要用，第 49、50 節）
                      （config-economy.js 例外：會把「商隊跑商」加進 config-quests.js 的 questData／questRewardInfo，必須排在它之後，第 61 節）
  state.js            執行期間的可變全域狀態（player、enemies、靈寵輔助效果計時…）
  stats.js            屬性/戰力/等級經驗門檻計算的純函式，以及 getAllSkills()
  elements.js         戰鬥屬性引擎：減傷、閃避、屬性傷害（冰凍/燒傷/中毒/金重擊/雷擊）、五行相剋與持續傷害
  talent.js           天賦樹（第 68 節）：點數（等級＋轉世）、加點、重置、加成彙總 getTalentBonusTotals（併入 getBonusTotals）、獨立倍率 talentMult、天賦視窗 #talent-modal
                      （設定在 config-talents.js；載入在 monster.js 之後）
  monster.js          野外妖獸的型態、出沒組合與技能（第 66 節第 2、3 期）：pickFieldMonster、applyMonsterType（減傷／閃避／暴擊、氣血與攻擊倍率）、fieldMonsterRoundsFactor（收益補償）、地圖卡片出沒列；
                      技能 monsterPreAttack／monsterPostHit／playerAttrsUnderSunder（破甲計時 fieldSunderTurns、戰場說明 lastMonsterSkillText）
                      （設定在 config-monsters.js：MONSTER_TYPES 五型態、FIELD_MONSTERS 圖鑑、FIELD_MONSTER_POOLS 各地圖組合；載入在 race.js 之後）
  race.js             種族剋制（第 62 節）：種族標籤文字、剋制加成 getRaceDmgBonus、斬妖錄擊殺數與天磯錄分頁、剋制法寶（法寶欄、掉落、合煉、千寶閣）（設定在 config-race.js，載入在 elements.js 之後）
  equip-compare.js    角色裝備視窗：人形裝備欄、部位換裝、裝備對比與穿上後試算（第 60 節）
  battle-fx.js        戰場實況的打擊感：人物立繪（依性別）、敵方爆擊血條（受擊殘影＋爆點）、飄字、爆擊震屏（第 59 節）
  ui.js               畫面渲染共用函式（頂部狀態列、戰鬥實況、日誌與日誌分頁（第 44 節）、彈窗開關與右上角 ✕（第 46 節））
  map.js / combat.js / leveling.js / tribulation.js
                      地圖切換、戰鬥 tick、境界與人物等級成長、渡劫
  lifespan.js         壽元：突破增加、死亡扣除、耗盡時遊戲結束
  beast-combat.js     靈寵的經驗/升級、陣亡、戰鬥中協助出手
  spells.js           仙法（200 種不分流派武學）：組出清單、被動光環加成、技能格、武學密典彈窗（第 35 節）
  artifact.js         神器專屬技能：戰鬥中觸發、卡片顯示、舊神器補 lingbaoId（第 18 節）
  sect.js / shop.js / bag.js / equipment.js / lingbao-shop.js /
  servant.js / quest.js / field.js / beast.js / library.js / alchemy.js
                      每個彈出視窗(modal) 對應一支檔案，管理該功能的渲染與互動
                      （library.js 另含第二階段屬性秘典，並提供戰鬥用的 getElementBookBonus()）
  activity.js         活動選單：統一把關各活動的解鎖條件（聲望＋境界）
  daily-quest.js      每日任務（每 4 小時刷新 10 項）
  auction.js          千寶閣拍賣場（每 3 小時刷新 5 件商品，含壽元丹；紫／橙商品可能遇到搶拍）＋常駐珍貴物資區
  merit.js            功德、陣營（正／邪）、善惡值、野外修士、功德自動凝結七彩補天石、購買破障丹（第 27 節）
  bounty.js           懸賞榜（天／地／人榜）與一對一懸賞對決（第 36 節）
  talisman.js         符寶坊：礦石煉製符寶、橙裝孔位鑲嵌／打掉（第 28 節）
  gear.js             裝備圖鑑 850 種：產生裝備、隨機詞條、特效、套裝、加成彙總、奪寶掉落、舊裝備轉換（第 37 節）
  enhance.js          強化／進化（白金）／分解／星允鐵與碎鐵／暫存區／千寶閣星允鐵（第 37 節）
  lingjie.js          靈界進出（第 74 節）：五行極品靈石 player.lingStones、身在靈界 player.inLingjie、飛升／返回人界扣靈石、極品靈石掉落（載入在 map.js 之後）
  integrity.js        存檔簽章與合理性檢查（第 72 節）：存檔／存檔代碼帶 _sig、修煉進度對遊玩時數、異常時停用戰力榜與寄售（載入在 save.js 之後）
  timeguard.js        時間防護（第 77 節）：以網站 Date 標頭對時，擋加速器與調系統時間（離線結算、背景補發、每日重置用 gameNow()；載入在 integrity.js 之後）
  craft.js            做裝系統（第 69 節）：四種通貨（天機石／混元晶／破虛石／造化玉）的掉落與使用、鍛紋台、入魔淬煉；介面嵌在強化視窗
  profession.js       職業（劍修等 6 種）：主修、熟練度 10 階、被動、職業技能（第 37 節）；宗門傳承加成 getSectLegacy（第 53 節）
  aptitude.js         資質測試：先天靈根＋先天體質的擲骰、加成彙總、測試／查看／重測視窗、洗髓丹與伐骨丹（第 53 節）
  golden-core.js      丹田／金丹／元嬰：累積、凝結、加成、凝元丹、化神靈果（第 54 節）；凝聚元神後加成消失
  yuanshen.js         元神（第 65 節）：天元神／地元神資格、元嬰化神法（凝聚）、偏好屬性傷害、化神訣殘本掉落、元神視窗
  mailbox.js          仙府信箱與兌換碼：讀信、領取、兌換、獎勵發放（第 56 節；設定 config-mailbox.js，GM 端在 gm.html）
  msgboard.js         修仙留言板：大道石碑第三個分頁，讀彙整文件 boardFeed/latest（最新 30 則，1 次讀取）、留言（每 60 秒一則）、刪自己的留言、髒話過濾（第 57 節；設定在 config-leaderboard.js 的 MSGBOARD_*）
  economy.js          賺錢管道（第 61 節）：H＝境界每小時練功收入、坊市回收（天星城收購商）、商隊收益與每日趟數、洞府產業（靈田／礦脈）、懸賞賞金
  encounter.js        奇遇・異界空間（第 63 節）：切換地圖觸發（秘密路線／累計次數／空間裂縫／每週三界戰場）、封存入口 #enc-fab、全螢幕異界 #enc-scene，
                      內含虛天殿（闖關）、血色禁地（戰棋）、三界戰場（千人淘汰）＋機緣：強者現身、靈獸競速、古洞尋寶、丹爐試火、機緣任務（支線）；全部包在 IIFE `Encounter` 內，對外只有 onEncounterMapChange／initEncounters／openEncounterList
  market.js           寄售拍賣：大道石碑第四個分頁，上架、出價（先扣、被超過退回）、結標領取、下架（第 58 節；設定在 config-leaderboard.js 的 MARKET_*）
  town.js             城內場景（第二頁面）：全螢幕城內畫面、傳送點、滑動／拖曳瀏覽、座標工具（第 20 節）
  town-npc.js         城內隱藏 NPC（第 20 節「天南市集・香腸大師奧斯卡」）：進城擲骰躲在角落、被發現後吃／不吃、必敗決鬥演出（設定在 config-towns.js 的 hiddenNpcs）
  bgm.js              背景音樂：9 首輪播（從遊戲主頁開始）、設定視窗與主頁右上開關、音量、切背景／有聲影片時暫停（第 76 節）
  xianweng-games.js   青瀾島隱藏仙翁的兩個小遊戲：開場動畫、仙翁釣魚、玲瓏棋局（五子棋困難 AI）（第 74 節「青瀾島」；設定在 config-towns.js 的 XIANWENG_GAMES）
  strange-fire.js     異火碎片與天下異火：取得、隨機合成、收錄加成、秘境減傷、背包卡片、天磯錄「異火」分頁（第 38 節）
  partner.js          情緣・夥伴：結識、出戰、被動加成、戰鬥絕學、情緣視窗（第 39 節）
  codex.js            天磯錄：收藏紀錄、60 個稱號、器錄／套裝／異火／稱號／職業視窗（第 37 節）
  casino.js           天星賭坊：賭星隕石、擲骰比大小、每日上限、紀錄（第 40 節）
  player-profile.js   玩家道號修改
  save.js             本地存檔/讀檔/匯出入/離線掛機結算＋背景補發（第 33 節）/重置/舊存檔相容
  avatar.js           頭像更換：解鎖判定、選擇視窗（設定在 config-avatars.js，第 32 節）
  leaderboard.js      天下戰力榜：定時上傳戰力到 Firebase Firestore、榜單視窗（第 42 節）；死守天南城通關榜的送審與分頁（第 49 節）
  secret-realm.js     秘境入口：秘境列表、全螢幕秘境場景（海報）、挑戰說明視窗（第 43 節；鎮魔塔玩法尚未實作）
  defense.js          魔屠天南・死守天南城：影片預載＋預計秒數、三支影片輪流、100 波特效演出、通關紀錄（第 49 節）
  zhenmo.js           秘境「鎮魔塔」100 層：塔廳、10 題知識問答（限時、選項打亂）、結算倍率、BOSS 房入口（第 51 節；BOSS 待新增）
  world-boss.js       世界 Boss（第 75 節）：全服共用一條血（Firebase wboss/state）、每天 3 次 30 回合挑戰、傷害排行、延後領獎（設定 config-world-boss.js，雲端規則 tools/firestore.rules）
  home-ui.js          洞府主畫面：舞台縮放（手機／PC 版面）、HUD 數值、底部導覽分頁、建築熱點、興建中提示（第 31 節）
  settings.js         設定視窗（洞府右上 ⚙️）：顯示尺寸 手機 9:16／PC 16:9／自動、全螢幕（第 34 節）、字級 小／中／大（第 45 節）
  title-screen.js     遊戲主頁（標題畫面）與進入世界
  pwa.js              PWA（第 64 節）：註冊 sw.js、持久儲存、安裝到主畫面說明、新版本提示（排在 main.js 之前）
  main.js             initGame()/startGame() 與 window.onload，遊戲啟動進入點
```

這是一個**純前端、無建置工具**的專案：所有 `data/*.js` 都是傳統 `<script>`（非 `type="module"`），
彼此共享同一個全域作用域。`index.html` 內的 `onclick="xxx()"` 會直接呼叫這些全域函式，
因此**檔案拆分時一律保留原本的函式名稱**，不可改名，否則畫面按鈕會失效。

## 2. 載入順序與依賴關係

`index.html` 底部依序載入以下腳本（每個都帶 `?v=版本號`，發佈前要更新，見第 30 節）。多數功能檔案彼此呼叫時**不受載入順序影響**
（函式宣告會先被瀏覽器解析完成，實際呼叫要等到 `window.onload` 之後才發生）。
但以下兩個檔案在載入當下就會**立即執行頂層程式碼**，因此順序不可調換：

- `format.js` 必須是**第一個**：它定義 `fmtNum` 與 `Number.prototype.toWan`，而 config 檔載入時就會呼叫 `.toWan()`（例：`config-merit.js` 的說明文字）。
- `config-maps.js` 必須在 `state.js` 之前載入：`state.js` 的 `player.currentMap` 直接讀取 `maps[0].items[0]`。
- `main.js` 必須放在最後：它的 `window.onload` 內會呼叫幾乎所有模組的函式，需確保全部腳本都已解析完成。
- `config-sects.js` 尾端也有頂層迴圈（替技能補 `tier`/`mult`），但只讀取同檔的常數，放在哪都安全。
- `spells.js` 載入時會立即組出 `spellList`，讀取 `config-spells.js` 的常數，所以必須排在 `config-spells.js` 之後。
- `gear.js` 載入時會立即展開 `gearList`／`gearById`／`gearBySlot`，讀取 `config-gear-catalog.js` 與 `config-equipment.js`（`equipTypes`），所以必須排在兩者之後。
  其餘新檔（`config-gear/enhance/sets/profession/titles.js`、`enhance.js`、`profession.js`、`codex.js`）只宣告常數與函式，排在 `gear.js` 附近即可。
- `strange-fire.js`、`partner.js` 載入時會建 `strangeFireById`／`partnerById`，必須分別排在 `config-strange-fire.js`、`config-partners.js` 之後。
- `defense.js` 載入時就建立 `DefenseBattle`（讀 `DEFENSE_*` 常數），必須排在 `config-defense.js` 之後；它在 DOMContentLoaded 抓 `#defense-vwrap` 的影片元素。
- `config-economy.js` 載入時就執行 `questData.caravan = …`（商隊跑商），必須排在 `config-quests.js` 之後（目前放在 `config-numeric.js` 後面）；`economy.js` 放在 `field.js` 後面（第 61 節）。
- `config-yuanshen.js` 接在 `config-golden-core.js` 後、`yuanshen.js` 接在 `golden-core.js` 後（第 65 節）：只宣告常數與函式，執行期才互相呼叫。
- `town-npc.js` 緊接在 `partner.js` 後（第 20 節）：只宣告函式，執行期才讀 `townScenes`／`partnerById`，位置其實不受限。
- `bgm.js` 緊接在 `settings.js` 後（第 76 節）：載入時只綁事件（pointerdown／keydown／visibilitychange、影片 play／pause／ended 捕獲），第一次互動才建立 Audio。
- `xianweng-games.js` 緊接在 `town-npc.js` 後（第 74 節）：只宣告常數與函式（`GOMOKU_N`、`GOMOKU_PATTERNS`），執行期才讀 `XIANWENG_GAMES`／`townNpcSpots`，位置其實不受限。
- `config-encounter.js` 緊接在 `config-economy.js` 後、`encounter.js` 緊接在 `economy.js` 後（第 63 節）；兩者載入時只宣告常數與建立 IIFE，不讀其他檔，位置其實不受限。

| # | 檔案 | 責任 | 依賴（讀取哪些全域） | 被誰依賴 / 誰會呼叫它 |
|---|------|------|----------------------|------------------------|
| 0 | `format.js` | `fmtNum(n)`（1 萬以下千分位；以上 萬／億／兆，小數依大小 2／1／0 位、尾端 0 省略、不加逗號）、`Number.prototype.toWan`／`String.prototype.toWan`（不可列舉） | 無 | 幾乎所有檔案顯示數字時的 `.toWan()` |
| 1 | `config-realms.js` | `realms` 境界名稱陣列、修煉節奏表 `realmPacing`（每境界目標時數/主要地圖/估算加成）、`REALM_PACING_KILLS_PER_SEC` | 無（`realmPacing.map` 是地圖名稱字串，執行期才查 `maps`） | `stats.js`(getRealmStageExp/getNextExp)、`lifespan.js`(getAgingHours)、`ui.js`、`leveling.js` |
| 2 | `config-level.js` | `MAX_PLAYER_LEVEL`、`LEVEL_UP_*` 成長值、`LEVEL_EXP_SEGMENTS` 經驗曲線 | 無 | `stats.js`(getLevelExpNeeded、getMaxHp/getMaxMp)、`leveling.js`(gainLevelExp)、`ui.js` |
| 3 | `config-lifespan.js` | `lifespanByRealm` 各境界壽元增加量與死亡折壽、歲月流逝常數 `LIFESPAN_MIN_AGING_HOURS`/`LIFESPAN_PACE_MULT`/`LIFESPAN_TARGET_RATIO`/`LIFESPAN_DANGER_MULT`/`LIFESPAN_TRIBULATION_MULT`/`LIFESPAN_OFFLINE_RATE`/`LIFESPAN_FLOOR_DEATHS`、起始年齡 `LIFESPAN_START_AGE` | 無 | `lifespan.js`、`leveling.js`(轉世重設壽元與年齡)、`ui.js`(年齡顯示) |
| 4 | `config-maps.js` | `SECT_MAP_NAME`（"宗門"，唯一安全區的名稱）、`maps` 地圖資料（含各圖 `coins` 每隻靈石）、`KILLS_PER_HOUR_ESTIMATE`、`REPUTATION_MAX_BY_MAP_CATEGORY`（各區擊殺聲望上限）、`OFFLINE_COMBAT_RATE`/`OFFLINE_REPUTATION_RATE`、離線實力估算 `IDLE_WAVE_AVG_MONSTERS`/`IDLE_WAVE_GAP_TICKS`/線上實戰證明門檻 `IDLE_PROVEN_SECONDS`、怪物刷新 `MONSTER_RESPAWN_SECONDS`(10)／收益補償 `KILL_REWARD_MULT`／打坐日誌間隔 `MEDITATE_LOG_SECONDS`（第 33 節末）、`monsterIcons`；野外妖獸圖鑑 `FIELD_MONSTERS` 已搬到緊接在後的 `config-monsters.js`（型態、各地圖出沒組合，邏輯 `monster.js` 排在 race.js 之後，第 66 節） | 無 | `state.js`、`map.js`(isInSect)、`combat.js`、`ui.js`、`save.js`(migrateCurrentMap) |
| 5 | `config-sects.js` | `sectData` 宗門與技能表（宗門可選填 `faction: "邪"`，目前為皇朝、天魔教、九幽黃泉；沒寫 = 正）、`SECT_SKILL_BONUS`、`SECT_TIER_NAMES`、`findSectByName()`；尾端迴圈替每招補上 `tier`/`mult` | 無 | `sect.js`、`stats.js`(getSectTier/getAllSkills)、`ui.js`、`save.js`(重新綁定宗門)、`merit.js`(getPlayerFaction) |
| 6 | `config-lingbao.js` | `legacySkillAdjustments` 舊版禁術下修數值、`artifactSkills` 神器專屬技能（key = 商品 id）、`lingbaoTierCosts` 各階段兌換價格、`ARTIFACT_COST_COINS` 神器靈石價（1 億）、`lingbaoShopItems` 三階段戰略級寶物與武學 | 無 | `lingbao-shop.js`、`equipment.js`(五行說明列固定屬性裝備)、`artifact.js` |
| 7 | `config-shop.js` | `shopItems` 丹藥堂商品、`shopSections` 分區、`POTION_COOLDOWN_SECONDS` 丹藥冷卻、`SHOP_MAX_BUY_QTY` 單次購買上限(9999) | 無 | `shop.js`、`bag.js`、`combat.js`(自動補血補魔) |
| 8 | `config-beasts.js` | `beastData` 靈寵兌換與被動、`BEAST_REVIVE_COST_CORE`、維持費 `BEAST_UPKEEP_INTERVAL`/`beastUpkeepTiers`（第 16 節）、`BEAST_SKILL_LEVELS`、`BEAST_SKILL_CHANCE`、`beastElementInfo`、`beastSkillTree` | 無 | `beast.js`、`beast-combat.js`、`save.js`(舊存檔轉換) |
| 9 | `config-servants.js` | `MAX_SERVANTS`、`servantQualities`、`SERVANT_TRIP_COST`(每趟任務靈石花費)、`servantNames` | 無 | `combat.js`(tryRescueServant)、`servant.js`(派遣花費) |
| 10 | `config-equipment.js` | `MAX_EQUIP_INVENTORY`、`equipTypes`（含 artifact 神器欄）、`NON_FORGEABLE_SLOTS`、裝備等級 `EQUIP_LEVELS`/`EQUIP_LEVEL_STAT_MULT`/`FORGE_LEVEL_CAP_BY_TIER`、`FORGE_COST`(10,000)、`wuxingElements`、靈根表 `wuxingArrayEffects`(單屬性)/`pureRootEffects`(純化)/`dualRootEffects`(雙屬性)/`supremeRootEffect`(五行聖)、門檻常數 `ROOT_SINGLE_COUNT`/`ROOT_SUPREME_SETS`/`ROOT_PURE_SETS`/`ROOT_PURE_REST`/`ROOT_DUAL_SETS`/`ROOT_DUAL_REST`、`equipQualities`(含各品質的減傷/閃避/屬性傷害值) | 無 | `equipment.js`(鍛造、靈根說明視窗)、`stats.js`(getSpiritRoots/getRootBonus/getPlayerElement)、`save.js`(補齊欄位)、`beast.js`(五行選項) |
| 11 | `config-tribulation.js` | 渡劫門檻、勝算常數 `TRIBULATION_*`（含合體期起加劇 `TRIBULATION_HARD_REALM_INDEX`/`TRIBULATION_HARD_PENALTY_PER_REALM`/`TRIBULATION_HARD_PENALTY_MAX`）、心魔倍率與技能 | 無 | `leveling.js`、`tribulation.js`、`save.js` |
| 12 | `config-quests.js` | `questData` 門派任務（可選欄位：範圍獎勵 `[min,max]`、`requiredQuality`、`duration`；某等級可不填）、`questRewardInfo` 獎勵名稱與對應欄位（含礦石 `ore`）、`QUEST_*` 進度常數、`MAX_ASSIGNED_SERVANTS` | 無 | `quest.js`、`servant.js`、`combat.js` |
| 13 | `config-activities.js` | `activityData` 活動清單與解鎖條件 | 無 | `activity.js` |
| 14 | `config-daily-quests.js` | 每日任務 `DAILY_REFRESH_HOURS`/`DAILY_QUEST_COUNT`/`dailyQuestPool`/`dailyQuestRewards`、千寶閣 `AUCTION_*`（含搶拍 `AUCTION_RIVAL_CHANCE`/`AUCTION_RIVAL_MAX_MULT_MIN`/`AUCTION_RIVAL_MAX_MULT_MAX`/`AUCTION_BID_STEPS`；付費刷新 `AUCTION_PAID_REFRESH_COST`/`AUCTION_PAID_REFRESH_DAILY`；裝備等級 `AUCTION_GEAR_PREV_TIER_CHANCE`；低等白金 `AUCTION_PLATINUM_CHANCE`/`AUCTION_PLATINUM_TIERS_BELOW`/`AUCTION_PLATINUM_PRICE`，第 10 節）、`auctionRivalNames`、`auctionQualityOdds`、`auctionLifePills`(壽元丹) | 無 | `daily-quest.js`、`auction.js` |
| 15 | `config-elements.js` | 戰鬥屬性上限 `DEF_CAP`/`EVA_CAP`/`AFFIX_CAP`、效果常數（凍結/燒傷/中毒/金重擊/雷擊 `THUNDER_BONUS`）、`combatAttrInfo`、`AFFIX_TYPES`(玩家武器)/`MONSTER_AFFIX_TYPES`(怪物異屬性：冰/毒/雷)、五行相剋 `WUXING_COUNTERS`/`WUXING_COUNTER_BONUS`/`WUXING_COUNTERED_PENALTY`、`monsterAttrsByMapCategory` | 無 | `elements.js`、`stats.js`(getPlayerElement)、`ui.js`、`equipment.js`(鍛造屬性、五行說明視窗) |
| 15a | `config-merit.js` | 陣營 `FACTION_SECT_WEIGHT`、善惡 `KARMA_MAX`/`KARMA_GOOD_THRESHOLD`/`KARMA_EVIL_THRESHOLD`/`KARMA_PER_FIELD_KILL`/`KARMA_PER_AMBUSH_KILL`、野外修士 `FIELD_CULTIVATOR_WAVE_CHANCE`/`FIELD_CULTIVATOR_POWER_MULT`/`FIELD_MERIT_MIN`/`FIELD_MERIT_MAX`/`CULTIVATOR_ICONS`、暗殺者 `AMBUSH_WAVE_CHANCE`/`AMBUSH_POWER_MULT`/`AMBUSH_ICON`、自動凝結 `MERIT_PER_BUTIAN_STONE`(30,000)、`BREAK_PILL_STONE_COST`、破障丹效果 `BREAK_PILL_DEMON_POWER_MULT`/`BREAK_PILL_CHANCE_BONUS`/`BREAK_PILL_MAX_CHANCE`、`preciousItems`(顯示資料) | 無 | `merit.js`、`combat.js`(野外修士／暗殺者生成)、`save.js`(離線功德)、`tribulation.js`(破障丹)、`bag.js`、`ui.js` |
| 15f | `config-bounty.js` | 懸賞榜：`BOUNTY_REFRESH_HOURS`/付費刷新 `BOUNTY_PAID_REFRESH_COST`/`BOUNTY_PAID_REFRESH_DAILY`/`BOUNTY_ENCOUNTER_CHANCE`/`BOUNTY_MERIT_MIN`/`BOUNTY_MERIT_MAX`/`BOUNTY_REALM_OFFSET_MIN`/`BOUNTY_REALM_OFFSET_MAX`/`BOUNTY_MAX_TURNS`、參考戰力 `BOUNTY_REF_SECT_MULT`/`BOUNTY_TIAN_MULT`、`BOUNTY_RANKS`(天／地／人榜)/`BOUNTY_RANK_ORDER`、武學 `bountySkills`/`BOUNTY_SKILL_SETS`、名冊 `bountyRoster`(邪 30／正 30)/`BOUNTY_ICONS` | 無 | `bounty.js` |
| 15e | `config-spells.js` | 仙法資料：`SPELL_EVIL_POWER`/`SPELL_SLOT_LEVEL_STEP`/`SPELL_GRADES`/`SPELL_ROLES`/`SPELL_GRADE_STATS`(各品階數值)/`SPELL_AURA_LABELS`/`spellAttributes`(10 屬性、每品 6 招名稱)/`spellUltimates`(20 絕學) | 無 | `spells.js` |
| 15d | `config-home-pc.js` | PC 版洞府：`PC_STAGE_IMG_W`/`PC_STAGE_IMG_H`(1376×768)、分頁面板位置 `PC_SHEET_RECT`、按鈕與建築熱點表 `pcStageButtons`（圖上座標、功能 action、牌匾、nav、enabled） | 無（action 是字串，點擊時才呼叫各模組函式） | `home-ui.js`(renderPcStage/layoutStage) |
| 15c | `config-avatars.js` | `avatarList`（頭像 id／名稱／圖片／裁切位置／解鎖條件） | 無 | `avatar.js` |
| 15c2 | `config-avatar-frames.js` | `avatarFrameList`（25 個頭像光環：id／名稱／圖片／內圈 `ring`／解鎖條件）、`AVATAR_FRAME_HOLE_FIT` | 無 | `avatar.js`、`home-ui.js`、`ui.js` |
| 15b | `config-talisman.js` | 孔位 `SOCKET_QUALITY`/`SOCKET_MIN`/`SOCKET_MAX`、`talismanTypes`(11 種)、`talismanGrades`(下/中/上品的效果與出現機率)、`TALISMAN_CRAFT_COST`(每次 500 礦石＋100 萬靈石) | 無 | `talisman.js` |
| 15g | `config-gear-catalog.js` | `gearCatalog`：17 部位 × 50 列 `[名稱, 五行, 管道, 四維模板, 特效, 套裝]`（**由 tools/csv-to-js.ps1 產生，改 CSV**） | 無 | `gear.js`(載入時展開) |
| 15h | `config-gear.js` | 管道 `GEAR_CHANNELS`、`GEAR_EXTERNAL_MULT`、四維模板 `GEAR_TEMPLATES`/`GEAR_ACCESSORY_BUDGET`、主詞條 `GEAR_ELEMENT_AFFIX`/`GEAR_ARMOR_DEF_MULT`、奪寶 `LOOT_DROP`、白金 `PLATINUM_QUALITY`、特效 `GEAR_EFFECT_TIER_MULT`/`gearEffects`(value/cap/fmt/desc) | 無 | `gear.js`、`enhance.js`、`artifact.js`(白金顯示) |
| 15i | `config-enhance.js` | 隨機詞條 `GEAR_SUB_COUNT`/`GEAR_SUB_QUALITY_SCALE`/`gearSubAffixes`、強化 `ENHANCE_*`、進化 `EVOLVE_*`、分解 `DECOMPOSE_*`/`SHARDS_PER_IRON`、暫存區 `GEAR_STASH_MAX`、星允鐵來源 `IRON_*` | 無 | `gear.js`、`enhance.js`、`combat.js`/`bounty.js`/`servant.js`(星允鐵) |
| 15j | `config-sets.js` | `GEAR_SET_MIN_QUALITY`、`gearSets`(30 組：主題＋五行)、`gearSetThemes`(2/4/6 件加成) | 無 | `gear.js`、`codex.js` |
| 15k | `config-profession.js` | `PROFESSION_SWITCH_COST`、`PROFESSION_MIN_LEVEL`、`PROF_MAP_MULT`/`PROF_BOUNTY_GAIN`/`PROF_OFFLINE_RATE`、`PROF_RANK_EXP`/`PROF_WEAPON_BONUS`、`professions`(6 職業：階名、被動、技能) | 無 | `profession.js` |
| 15m | `config-strange-fire.js` | 異火（第 38 節）：`STRANGE_FIRE_SHARDS_PER_FIRE`(100 片合 1 朵)/`STRANGE_FIRE_REALM_REDUCE`(每朵秘境受傷 -3%)/`STRANGE_FIRE_REALM_REDUCE_MAX`(上限 30%)、品階 `STRANGE_FIRE_TIERS`(weight/color)、`strangeFireItems`(碎片與異火的顯示資料)、`strangeFireList`(50 種：id/name/tier/origin/desc/bonus；檔尾有新增模板) | 無 | `strange-fire.js` |
| 15o | `config-towns.js` | `townScenes`（key = 城鎮地圖名稱：title、img、imgW／imgH、選填 `portrait`（手機直式圖，自有 img／imgW／imgH／hotspots／figures）、`figures` 場景人偶 `{ id, name, img, rect, action?, chance?（每次進城出現機率）, cls?（額外 class，baked＝不加外陰影） }`、`hotspots` 傳送點 `{ id, label, rect:[x,y,w,h] 圖上像素, action, enabled }`、選填 `hiddenNpcs` 隨機躲在角落的 NPC `{ id, partnerId, name, place, chance, spots:[{img, rect}], gift, duelMult, lines }`；檔內有模板） | 無 | `town.js`、`town-npc.js`、`map.js`(hasTownScene) |
| 15n | `config-partners.js` | 夥伴（第 39 節）：`PARTNER_TIERS`(評級門檻與數值建議)、`PARTNER_POWER_LABELS`(六維名稱)、`partnerList`(39 位：出處、世界、巔峰、六維戰力、分析、被動、絕學；檔尾有新增模板) | 無 | `partner.js` |
| 15l | `config-titles.js` | `titleList`（60 個稱號：條件 cond、加成 bonus；含 4 個賭運稱號） | 無 | `codex.js`、`casino.js`(紀錄頁列出賭運稱號) |
| 15p | `config-casino.js` | 天星賭坊（第 40 節）：`CASINO_TOWN`、每日上限 `CASINO_DAILY_LIMIT_BY_REALM`、`CASINO_DICE_MAX_RATIO`/`CASINO_DICE_MIN_BET`/`CASINO_CONFIRM_RATIO`、`casinoStones`(三種隕石：價格、結果權重表)、`CASINO_VALUE`(估值)、`CASINO_CUT_LINES`、擲骰 `CASINO_DICE_BETS`/`CASINO_TOTAL_PAYOUT`/`CASINO_DICE_FACES` | 無 | `casino.js` |
| 15q | `config-leaderboard.js` | 天下戰力榜（第 42 節）：`LEADERBOARD_FIREBASE_CONFIG`（null = 不啟用、不連網）、`LEADERBOARD_SDK_BASE`、`LEADERBOARD_COLLECTION`、`LEADERBOARD_BANNED_COLLECTION`(banned)/`LEADERBOARD_ADMINS_COLLECTION`(admins，第 50 節)/守城榜 `LEADERBOARD_DEFENSE_SUBMIT_COLLECTION`(defenseSubmit，玩家送審)/`LEADERBOARD_DEFENSE_BOARD_COLLECTION`(defenseBoard，GM 審核通過才寫入)、`LEADERBOARD_UPLOAD_INTERVAL_MS`(5 分)/`LEADERBOARD_FIRST_UPLOAD_DELAY_MS`(15 秒)/`LEADERBOARD_MIN_GAP_MS`(60 秒，須與 tools/firestore.rules 一致)/`LEADERBOARD_HISTORY_SIZE`(24，上傳歷史 hist 筆數，須與規則一致，第 50 節)/兩日紀錄 `LEADERBOARD_HISTORY2_SIZE`(96)/`LEADERBOARD_HISTORY2_GAP_SEC`(1800，皆須與規則一致)/`LEADERBOARD_TOP_N`(100)/`LEADERBOARD_REFRESH_COOLDOWN_MS` | 無 | `leaderboard.js` |
| 15r | `config-secret-realms.js` | 秘境（第 43 節）：`SECRET_REALM_DAILY_ATTEMPTS`(預定每日 5 次)、`secretRealmList`（id／name／img／minRealmIndex／implemented／tagline／desc／rewards 預定獎勵；選填 size／imgPc／sizePc／sceneTitle／sceneSub／enterLabel／enterPos／mode） | 無 | `secret-realm.js` |
| 15r2 | `config-world-boss.js` | 世界 Boss（第 75 節）：集合名 `WB_STATE_COLLECTION`/`WB_RUNS_COLLECTION`/`WB_CLAIM_COLLECTION`、`WB`（dailyMax 3、gapSec 60、capPct、rounds 30、hitsToKill 24、weekOffsetMs、durationMs、claimDelayMs、firstHp／minHp／maxHp、topN 20、cacheMs、rewards、killMult、titles）、`WB_BOSSES`（4 隻輪替，圖沿用鎮魔塔）；gm.html 也載入 | 無 | `world-boss.js`、gm.html |
| 15s | `config-defense.js` | 死守天南城（第 49 節）：`DEFENSE_TOTAL_WAVES`(100)／`DEFENSE_BOSS_EVERY`(10)／`DEFENSE_CLIP_FADE`、`DEFENSE_CLIPS`（id／name／src／zoom／trim／sizeHint）、`DEFENSE_THEMES`(10 主題)、`DEFENSE_BOSSES`、`DEFENSE_OPENERS`、`DEFENSE_CAMERAS`、強度 `DEFENSE_MILESTONES`/`DEFENSE_MILESTONE_STAGE`/`DEFENSE_ENEMY`、勝負 `DEFENSE_PLAYER_SKILL_MULT`/`DEFENSE_MAX_ROUNDS`/`DEFENSE_LOSE_AT`、獎勵 `DEFENSE_REWARDS`、通關紀錄 `DEFENSE_RUN_LOG_MAX`(20)；**尾端有函式**（例外）：強度曲線 `defenseRealmAtk(r,s)`/`defenseWaveAtk(w)`（defense.js 與 gm.html 共用） | 呼叫時才用 `bounty.js` 的 getBountyRefSectMult | `defense.js`、`gm.html`(守城審核) |
| 15t | `config-zhenmo.js` | 鎮魔塔（第 51 節）：`ZHENMO_TOTAL_FLOORS`(100)/`ZHENMO_QUIZ_COUNT`(10)/`ZHENMO_QUIZ_SECONDS`(30)/`ZHENMO_REVEAL_ANSWER`(false)/`ZHENMO_RECENT_AVOID`(100)/`ZHENMO_QUIZ_REWARD_MULT`(答對數→BOSS 獎勵倍率)/`ZHENMO_SOURCES`、BOSS 戰 `ZHENMO_HERO_IMG`/`ZHENMO_PLAYER_SKILL_MULT`/`ZHENMO_MAX_ROUNDS`/`ZHENMO_ROUND_MS`/`ZHENMO_BOSSES`(第 1 層棄天神) | 無 | `zhenmo.js` |
| 15v | `config-numeric.js` | 數值重做（第 52 節）：開關 `NUMERIC_V2`（讀 localStorage `xiuxian_numeric_v2`，預設關閉）、參數 `NV2`（成長、屬性、丹藥／藏書閣上限、增益上限、敏捷、氣血靈力、戰力）、`NV2_STAT_KEYS`/`NV2_STAT_LABELS`、`NV2_TEMPLATE_OVERRIDE`（靈動→敏捷範本） | 無 | `numeric.js`、`stats.js`、`elements.js`、`combat.js`、`ui.js`、`home-ui.js`、`alchemy.js` |
| 15u | `config-zhenmo-questions.js` | `zhenmoQuestions`：300 題 `[出處, 題目, 選項(4 個／是非題 null), 答案 'A'～'D'／'O'／'X', 解析?]`（玩家提供；凡人 110／吞噬 100／斗羅 90；選擇 170／是非 130） | 無 | `zhenmo.js` |
| 16 | `state.js` | `player`（含裝備系統 `starIron`/`ironShards`/`gearStash`/`ironShop`/`ironUsed`/`maxEnhance`/`gearCodex`/`titles`/`activeTitle`/`profession`/`profSwitched`/`proficiency`（第 37 節）、`lingbaoSold`、仙法 `spells`/`spellSlots`、渡劫失敗虛弱 `weakened`、頭像 `avatarId`/`unlockedAvatars`、頭像光環 `avatarFrameId`/`unlockedFrames`、礦石 `ore`、符寶 `talismans`、異火 `fireShards`/`strangeFires`/`fireCollection`（第 38 節）、天星賭坊 `casino`（第 40 節）、夥伴 `partners`/`partnerTeam`/`partnerBond`/`fieldKills`（第 39 節）、藏書閣屬性秘典次數 `elementStudy`、轉世保留的上限 `reincarnateBonus`、年齡 `age`、功德系統 `merit`/`butianStones`/`breakPills`/`evilKills`、善惡 `karma`、懸賞榜 `bountyBoard`/`bountyRefreshAt`/`bountyFaction`/`activeBountyIds`(可多名，第 36 節)/`bountyKills`、付費刷新次數 `paidRefresh`、線上實戰證明 `idleProvenMap`（第 33 節））、`DEFAULT_PLAYER_JSON`（全新角色預設值快照，讀檔/匯入的合併基底）、`enemies`（每隻帶 `attrs`/`status`；野外修士另帶 `cultivator`("正"/"邪")/`ambush`）、`respawnTimer`、`safeZoneTimer`；不存檔的執行期狀態：`inTribulation`/`heartDemon`/`tribulationFatedWin`/懸賞對決 `inBountyDuel`/`duelOpponent`/`duelWeakenTimer`/`duelWeakenMult`/`duelSilenceTimer`/`duelArmorTimer`/丹藥冷卻/`gameOver`/背景補發 `lastTickAt`/`missedTickMs`/線上實戰秒數 `fieldOnlineTicks`/日誌彙總 `waveSummary`/`meditateSummary`/`playerStatus`(玩家身上的凍結/燒傷/中毒)/靈寵輔助計時(`petBuff*`/`petShield*`/`petRegen*`) | **`maps`**（必須排在 config-maps.js 之後） | 幾乎所有檔案都會讀寫 `player` |
| 16b | `numeric.js` | 新制公式（只在 `NUMERIC_V2` 時被呼叫）：`nv2Level`/`nv2Growth`、屬性 `nv2BaseStat`/`nv2PillStat`/`nv2StudyStat`/`nv2GearStats`/`nv2Stat`、武器 `nv2QualityMult`/`nv2WeaponAtkOf`/`nv2WeaponAtk`、增益 `nv2BuffPct`、`nv2Attack`/`nv2PhysAttack`/`nv2MagAttack`/`nv2MaxHp`/`nv2MaxMp`、敏捷 `nv2Crit`/`nv2Combo`/`nv2Hit`/`nv2AgiEva`、`nv2CombatPower` | `config-numeric.js`、`player`、gear.js(getGearDef／getBonusTotals／getGearPctBonus)、spells.js(getSpellAuraBonus)、stats.js(getRootBonus／hasLiveBeast／getWeaknessMult)、bounty.js(getDuelWeakenMult)、profession.js(getProfWeaponMult) | `stats.js`、`elements.js`、`combat.js`、`ui.js`、`home-ui.js`、`alchemy.js` |
| 17 | `stats.js` | `EQUIP_STAT_KEYS`/`BASE_STAT_KEYS`、`getEquipBonus`(四維＋減傷/閃避/屬性傷害；四維 × 強化倍率與主修武器加成，再加 gear.js `getBonusTotals` 的詞條／套裝／稱號／職業)/`getElementCounts`/`getSpiritRoots`(靈根判定)/`getRootBonus`(靈根加成總和)/`getPlayerElement`(本命五行，五行相剋用)/`getRealmStageExp`(依 realmPacing 換算每階經驗基數，有快取)/`getNextExp`/`getLevelExpNeeded`/`hasLiveBeast`(出戰中才算，呼叫 beast-combat.js 的 isBeastActive)/`getBasePower`/`getPhysAttack`/`getMagAttack`(兩者皆乘上懸賞對決的化功 `getDuelWeakenMult()` 與 `getGearPctBonus`)/`getMaxHp`(乘 `getGearPctBonus('hp')`)/`getMaxMp`(兩者皆加上轉世保留值)/`getReincarnateBonus`/`getSectTier`/`getAllSkills` | `player`、`realms`、`sectData`、`LEVEL_*`、`equipTypes`/`WUXING_COUNTERS`、靈寵輔助計時、`bounty.js`(getDuelWeakenMult) | `ui.js`、`combat.js`、`leveling.js`、`tribulation.js`、`beast-combat.js` 等幾乎全部功能檔 |
| 18 | `elements.js` | `newStatus`/`getPlayerCombatAttrs`(含 `element`；懸賞對決被破甲時減傷／閃避 × `getDuelArmorMult()`；裝備特效的護體／先手盾／定神／破甲／洞察／剋敵／寒徹／焚燼／蝕骨欄位與套裝提高的上限)/`getWuxingCounterMult`/`withSkillEffect`/`getMapCategoryIndex`/`rollMonsterAttrs`/`resolveHit`/`addDotStack`/`tickStatus`/`formatStatus`/`summarizeTags`/`formatEquipStats` | `config-elements.js`、`stats.js`(getEquipBonus/getPlayerElement)、`library.js`(getElementBookBonus)、`wuxingElements`、`maps`、`playerStatus` | `combat.js`、`tribulation.js`、`ui.js`、`bag.js`/`equipment.js`/`auction.js`/`lingbao-shop.js`(裝備屬性文字) |
| 19 | `ui.js` | 「製作成功」提示 `showCraftSuccess(title, detail)`（`#craft-toast` 動態建立、z-index 5000、2.2 秒淡出；煉丹／鍛造／符寶共用，2026-09-27）、常數 `PLAYER_AVATARS`（頭像 `img`（本地 images/avatar-*.jpg）/裁切位置 `pos`/預設道號，洞府頭像框、戰鬥實況、性別選擇共用；性別選擇視窗的兩張 `<img>` 寫在 index.html，換圖時要一起改）、`updateUI`/`updateCombatVisualPanel`/`formatWuxingCounterTip`/`updateTribulationUI`/`updatePotionCooldownUI`/`updateStudyCountsUI`/`openSkillModal`/`renderSkillList`/`addLog(msg, type, force, channel)`(野外回合中依 `fieldLogMuted`／`FIELD_MUTED_LOG_TYPES` 略過逐回合訊息；依 `channel`／`LOG_CHANNEL_BY_TYPE` 寫入戰鬥／道具／僕從分頁，第 44 節)/`switchLogTab`/`restoreLogTab`/`renderLogBadge`/`initModalTopClose`(彈窗右上角 ✕，第 46 節)/`refreshCombatStatusText`/`updateAutoSettings`/`syncAutoSettingsUI`/`updateSectFacilitiesUI`/`closeModal`/`toggleDrawer`/`formatCountdown`/`clampRefreshAt`(刷新時間軸保護，第 10 節)/`resolveBatchCount`(×1/×10/最高 共用)/批次刪除工具 `renderBulkDeleteBar`/`getCheckedBulkQualities`/`toggleAllBulkQualities` | `player`、`realms`、`stats.js` 的計算函式、`lifespan.js`(getDeathLifespanCost) | 幾乎所有功能檔在資料變動後都會呼叫 `updateUI()`/`addLog()` |
| 20 | `map.js` | `isInSect`(是否身在宗門)/`returnToSect`(洞府「宗門」：傳送回宗門並開宗門分頁，第 20 節)/`openWorldMapModal`(修仙地圖彈窗，顯示目前所在)/`getMapThumb`(縮圖依性別選 `thumb`／`thumbFemale`)/`renderTownTeleports`(城鎮傳送點卡片)/`goToTown(i)`(傳送並進入城內場景)/`openMapCategoryModal`(略過 `hidden` 的宗門)/`selectMap`(選定後關閉兩層地圖彈窗；傳送到戰鬥地圖成功時切到戰鬥分頁 `switchTab('battle')`)/`changeMap(c, i, challengeOk)`(境界不足時改跳挑戰模式警告 `confirmChallengeMap`，第 70 節；懸賞對決中換地圖 = `endBountyDuel("flee")` 逃離；暫存區滿時不能進野外，enhance.js)；`goToTown` 先查 `getTownBanLeftMin`（town-npc.js 禁入） | `maps`、`SECT_MAP_NAME`、`player`、`ui.js`、`bounty.js`、`home-ui.js`(switchTab)、`town-npc.js`(getTownBanLeftMin) | `ui.js`(updateSectFacilitiesUI)、`combat.js`/`quest.js`(門派任務須在宗門)、HTML 按鈕；changeMap 離開宗門時呼叫 `quest.js` 的 stopQuest |
| 21 | `combat.js` | `combatTick`/`recordObservedRoundsPerKill`/`getObservedRoundsPerKill`(實測每隻回合數，收益速度上限用)/`fieldCombatRound`(野外一回合，日誌靜音、波末彙總、收益 × KILL_REWARD_MULT，第 33 節末)/`playerAttackTurn`(普攻/技能出手，渡劫共用；技能類型 single/aoe/heal/buff＋仙法的 shield 守護／control 牽制，並處理魔功 hpCost 反噬與 lifesteal 吸血)/`onPlayerKilledInField`/`checkAutoHealAndMana`/`tryRescueServant`/`getMapMonsterStats(map)`(妖獸攻擊／氣血，地圖可自訂 monsterAtk／monsterHp，save.js 離線估算也用) | `player`、`enemies`、`shopItems`、`servantQualities`、`servantNames`、`stats.js`、`elements.js`(resolveHit/tickStatus)、`leveling.js`(gainExp)、`beast-combat.js`(petAssistTick/applyPetDamageReduction/tickBeastUpkeep 每秒維持費計時)、`lifespan.js`(handlePlayerDeath)、`map.js`(changeMap 死亡回城)、`merit.js`(isEvilHuntUnlocked/getKarmaState/onCultivatorKilled/settleMeritStones，野外修士與暗殺者)、`config-merit.js`、`bounty.js`(對決中由 bountyDuelTick 接管；刷新新一波前呼叫 tryStartBountyDuel)、裝備系統（gear.js 特效／套裝／奪寶、enhance.js 星允鐵與暫存區、profession.js 職業技能與熟練度，第 37 節） | `main.js`(setInterval 每秒呼叫)、`bounty.js`(對決落敗呼叫 onPlayerKilledInField、playerAttackTurn) |
| 22 | `leveling.js` | `REINCARNATE_KEEP_RATE`(轉世保留比例 5%)、`gainExp`/`gainLevelExp`/`advanceRealm`/`triggerReincarnate`（規則見第 25 節） | `realms`、`player`、`stats.js`、`ui.js`(updateSectFacilitiesUI)、`beast-combat.js`(gainBeastExp)、`lifespan.js`(gainRealmLifespan) | `combat.js`、`tribulation.js`、`save.js`、HTML 輪迴按鈕 |
| 23 | `lifespan.js` | `getDeathLifespanCost`/`formatLifespan`/`getLifespanFloor`/`getAgingHours`(依 realmPacing 算出一境界壽元可撐時數)/`getAgingMultiplier`/`getAgingPerMinute`/`ageLifespan`(同時增加年齡 `player.age`)/`checkLifespanWarnings`(提示旗標 `lifespanWarned`，不存檔)/`getInitialLifespanForRealm`/`gainRealmLifespan`/`handlePlayerDeath`/`triggerLifespanGameOver` | `lifespanByRealm`、`LIFESPAN_*`、`player`、`inTribulation`、`elements.js`(getMapCategoryIndex)、`beast-combat.js`(killAllBeasts) | `combat.js`(每秒 ageLifespan、死亡)、`tribulation.js`(死亡)、`leveling.js`(突破)、`save.js`(離線流逝、舊存檔)、`ui.js`、`auction.js` |
| 24 | `tribulation.js` | `getTribulationChance`/`getTribulationHardPenalty`(合體期起勝算扣除量)/`formatChance`/`triggerTribulation`/`tribulationTick`/`resolvePlayerFall`/`endTribulation` | `player`、`config-tribulation.js`、`config-merit.js`(破障丹)、`player.breakPills`、`shopItems`(丹藥加成)、`sectData`(技能加成)、`stats.js`、`elements.js`、`combat.js`(playerAttackTurn)、`beast-combat.js`、`lifespan.js`、`leveling.js`(advanceRealm) | `combat.js`(渡劫中接管 tick)、`ui.js`(按鈕顯示勝算)、HTML 渡劫按鈕 |
| 25 | `sect.js` | `checkSectJoined`/`openSectModal`/`renderSects`/`joinSect` | `sectData`、`player.sect`/`sectSkills` | 幾乎所有「需拜入宗門才能使用」的彈窗（shop/servant/field/beast/lingbao-shop/library/forge/alchemy）都會先呼叫 `checkSectJoined()` |
| 26 | `shop.js` | `openShopModal`/`renderShop`/`renderShopCard`/`getShopQty`/`setShopQty`/`setShopQtyMax`/`updateShopTotal`/`buyShopItem` | `shopItems`、`player`、`sect.js`(checkSectJoined) | HTML 按鈕、`bag.js` 顯示已購買道具 |
| 27 | `bag.js` | `openBagModal`/`hasEquipInventorySpace`(背包上限檢查，鍛造/千寶閣/靈寶閣/卸下裝備共用)/`renderBag`/`useItemFromBag`/`deleteItemFromBag`/`deleteEquipFromInventory`/`bulkDeleteEquipment`、裝備鎖定 `isEquipLocked`/`toggleEquipLock`/`formatLockButton`/`canRemoveEquip`（第 9 節）（卡片另有強化／分解按鈕、頂端暫存區與星允鐵，enhance.js） | `shopItems`、`player.bag`、`player.equipInventory`、`enhance.js`(locateEquip/refreshEquipViews) | `equipment.js`(equipItem 後呼叫 renderBag；裝備卡片鎖定鈕)、`enhance.js`(分解／暫存區毀棄前呼叫 canRemoveEquip、一鍵分解略過鎖定) |
| 28 | `equipment.js` | `EQUIP_CATEGORY_NAMES`(部位分類中文名)、`formatEquipLevel`/`getForgeLevelCap`/`renderForgeLevelSelect`(裝備等級，第 29 節)、`initForgeSelect`/`openEquipmentModal`/`renderLingbaoUI`(注意：命名沿用舊碼，實際是角色裝備列表)/`openWuxingInfo`/`equipItem`/`unequipItem`/`openForgeModal`/`forgeEquipment`/`forgeOneEquipment`(從該等級的可製作清單抽一種，gear.js)、常數 `FORGE_COST`（已移到 config-equipment.js）；舊的 `generateEquipStats` 已移除，改用 gear.js 的 `buildGearStats` | `equipTypes`、`wuxingElements`、`wuxingArrayEffects`、`equipQualities`、`lingbaoShopItems`(說明視窗列固定屬性裝備)、`player.equipment`、`player.equipInventory`、`ui.js`(resolveBatchCount) | `bag.js`(equipItem)、`sect.js`(forge 需拜入宗門) |
| 29a | `artifact.js` | `getArtifactItem`/`getArtifactSkill`/`getEquippedArtifactSkill`/`formatQualityLabel`(七彩 → 造化神器・七彩、白金 → 白金・先天道器)/`getEquipCardClass`(七彩外框)/`formatArtifactSkill`(卡片顯示)/`artifactSkillTurn`(戰鬥中觸發)/`castProcSkill`(依機率自動發動的技能，神器與職業技能共用)/`migrateArtifactIds`(舊神器補 `lingbaoId`、品質改七彩) | `artifactSkills`/`lingbaoShopItems`、`equipTypes`、`player.equipment`/`equipInventory`、`elements.js`(resolveHit)、`stats.js`(攻擊力)、靈寵減傷計時 `petShieldRate/Timer` | `combat.js`/`tribulation.js`/`bounty.js`(出手後呼叫)、`bag.js`/`equipment.js`(卡片)、`save.js`(applySaveData) |
| 29 | `lingbao-shop.js` | `openLingbaoShopModal`/`renderLingbaoShopUI`(神器卡片列出專屬技能與價格)/`isArtifactItem`/`getLingbaoCost(item)`(單件價格，神器另計)/`buyLingbaoItem(itemId)`(裝備另存 `lingbaoId`) | `lingbaoShopItems`、`lingbaoTierCosts`、`ARTIFACT_COST_COINS`、`player.sectSkills`/`lingbaoSold`/`coins`/`reputation`/`equipInventory`/`learnedSkills`、`bag.js`(hasEquipInventorySpace) | HTML 按鈕（僅在「宗門」顯示） |
| 30 | `servant.js` | `openServantModal`/`renderServants`/`assignServantQuest`/`dismissServant`/`bulkDismissServants`/`toggleServantLock`(僕從鎖定，第 9 節)/`tickServantQuests`/`getAssignedServantCount`/`getServantTripCost`/`payServantTrip`（礦脈採礦每趟 2% 挖到星允鐵，enhance.js） | `questData`、`SERVANT_TRIP_COST`、`player.servants`(每位自帶 `quest`/`timer`)/`coins`、`quest.js` 的任務與獎勵函式 | `combat.js`(每 tick 呼叫 tickServantQuests)、`quest.js`(顯示派遣狀態) |
| 31 | `quest.js` | `openQuestModal`/`renderQuestButtons`/`startQuest`/`stopQuest`/`updateQuestUI` + 共用任務函式 `getQuestDef`/`getAvailableQuestIds`/`getQuestRequiredProgress`/`getQuestSpeed`/`canServantTakeQuest`/`formatQuestRewards`/`grantQuestRewards`(回傳實際獲得文字) | `questData`(config-quests.js)、`player.activeQuest`、`stats.js`(getSectTier)、`map.js`(isInSect) | `combat.js`(玩家任務結算)、`servant.js`(僕從任務結算)、`map.js`(離開宗門時中斷) |
| 32 | `activity.js` | `renderActivityList`/`getActivityLockReason`/`openActivity`、付費立即刷新共用 `getPaidRefreshState`/`getPaidRefreshLeft`/`payForRefresh`/`renderPaidRefreshButton`（第 10 節） | `activityData`、`player.reputation`/`realmIndex`/`coins`/`paidRefresh` | `ui.js`(updateUI 每秒重繪)、`auction.js`/`bounty.js`(付費刷新) |
| 33 | `daily-quest.js` | `openDailyQuestModal`/`renderDailyQuests`/`claimDailyQuest`/`claimAllDailyQuests`/`addDailyProgress`/`refreshDailyQuestsIfDue` | `config-daily-quests.js`、`player.daily*` | 各功能的 `addDailyProgress()` 埋點 |
| 34 | `auction.js` | `openAuctionModal`/`refreshAuctionIfDue`/`rollAuctionItem`/`rollAuctionEquip`/`getAuctionItemInfo`/`canPayAuctionItem`/`buyAuctionItem`(紫／橙商品先判定搶拍)/`getRivalBid`/`completeAuctionPurchase`(裝備與壽元丹共用的成交)/搶拍 `auctionBidItemId`/`openAuctionBid`/`renderAuctionBid`/`raiseAuctionBid`/`giveUpAuctionBid`/`renderAuction`/`renderAuctionBuyArea`/`renderAuctionLifePillCard`（裝備改由 gear.js 的 `createGearEquip` 從「拍賣」清單產生；刷新格另有星允鐵袋 `kind: "ironBag"`，下方加 enhance.js 的星允鐵常駐區） | `auctionQualityOdds`、`auctionLifePills`、`AUCTION_RIVAL_*`/`auctionRivalNames`、`equipQualities`、`player.auctionItems`/`coins`/`reputation`/`lifespan`、`merit.js`(renderPreciousSection 嵌在商品下方) | `activity.js`(千寶閣按鈕)、`merit.js`(購買後重繪) |
| 34a | `merit.js` | `isEvilHuntUnlocked`/`isMeritSystemOpen`(暫停開關)/陣營 `getPlayerFaction`/`getOpposingFaction`/`getFactionLabel`/善惡 `getKarmaState`/`formatKarmaTag`/`addKarma`/野外修士 `rollFieldMerit`/`onCultivatorKilled`/`settleMeritStones`(功德自動凝結補天石)/殺手殿堂場景 `openEvilHallScene`/`closeEvilHallScene`/`openEvilHuntModal`/`renderEvilHunt`/`renderPreciousSection`/`buyBreakPill` | `config-merit.js`、`activityData`、`activity.js`(getActivityLockReason)、`sectData`(findSectByName)、`spells.js`(getSpell)、`player.merit`/`butianStones`/`breakPills`/`evilKills`/`karma`、`ui.js`(resolveBatchCount)、`auction.js`(renderAuction)、`bounty.js`(renderBountyBoard) | `combat.js`、`save.js`、`auction.js`、`bounty.js`、`ui.js`/`home-ui.js`(善惡標籤)、`activity.js`(獵殺邪修按鈕 openFn) |
| 34c | `bounty.js` | `getBountyRefSectMult`/`getBountyStats`/`getBountyNpc`/`getBountyIcon`/`refreshBountyIfDue`/`rollBountyBoard`/`getTrackedBountyIds`(舊存檔 activeBountyId 轉陣列)/`getActiveBounties`/`acceptBounty`/`acceptAllBounties`/`abandonBounty(id?)`/`renderBountyBoard`/`renderBountyBulkButtons`、對決 `tryStartBountyDuel`/`startBountyDuel`/`clearDuelDebuffs`/`getDuelWeakenMult`/`getDuelArmorMult`/`bountyDuelTick`/`endBountyDuel` | `config-bounty.js`、`realms`、`wuxingElements`/`MONSTER_AFFIX_TYPES`、`elements.js`、`combat.js`(playerAttackTurn/checkAutoHealAndMana/applyRootRegen/onPlayerKilledInField)、`beast-combat.js`、`merit.js`(陣營、善惡、settleMeritStones) | `combat.js`、`merit.js`(renderEvilHunt)、`stats.js`/`elements.js`(負面狀態)、`map.js`、`save.js`、`ui.js`(戰鬥實況)、`tribulation.js`(對決中不能渡劫) |
| 34b | `talisman.js` | `talismanKey`/`getTalismanType`/`getTalismanGrade`/`getTalismanValue`/`formatTalisman`/`ensureSockets`(橙裝開孔，可重複呼叫)/`getSocketStats`/`formatSockets`/`findEquipById`/`openTalismanModal`/`renderTalismanWorkshop`/`renderSocketCard`/`craftTalisman`/`inlayTalisman`/`removeTalisman` | `config-talisman.js`、`equipTypes`、`player.talismans`/`ore`/`coins`/`equipment`/`equipInventory`、`ui.js`(resolveBatchCount)、`sect.js`(checkSectJoined) | `stats.js`(getEquipBonus 加總符寶)、`equipment.js`/`auction.js`/`lingbao-shop.js`(取得橙裝時 ensureSockets)、`bag.js`/`equipment.js`/`auction.js`(formatSockets 顯示)、`save.js`(migrateEquipSockets)、HTML 符寶坊按鈕 |
| 34d | `gear.js` | **載入時執行** 展開 `gearList`/`gearById`/`gearBySlot`；`getGearDef`/`getQualityObj`/`getCraftChannel`/`pickGearDef`/`buildGearStats`/`createGearEquip`（鍛造、千寶閣、奪寶共用）、隨機詞條 `rollGearSubs`/`formatGearSubs`/`getGearSubTotals`、加成彙總 `getBonusTotals`（詞條＋套裝＋稱號＋職業）/`getGearPctBonus`、套裝 `getEquippedSetCounts`/`resolveSetTier`/`getSetBonusTotals`/`formatSetInfo`/`hasSetSpecial`、強化倍率 `getEnhanceMult`/`getEquipEffectiveStats`、奪寶 `tryLootDrop`、顯示 `getEquipDisplayName`/`formatEquipTitle`/`formatEquipDetails`/`formatGearSubline`/`describeGearEffect`/`formatGearEffect`、特效 `getGearEffects`/`gearFx`、每波狀態 `gearWaveRound`/`gearFirstStrikeUsed`/`gearUndyingUsed`/`gearDodgeStrikeReady`/`resetGearWave`、戰鬥 `getGearHitMult`/`applyGearHitChain`/`applyGearDefense`/`applyGearRegen`/`tryGearUndying`、舊存檔 `migrateGearIds` | `config-gear*.js`、`config-enhance.js`、`config-sets.js`、`equipTypes`/`equipQualities`/`EQUIP_LEVELS`、`lingbaoShopItems`、`talisman.js`(ensureSockets)、`codex.js`、`profession.js`、`enhance.js`(receiveLootEquip) | `equipment.js`/`auction.js`(產生裝備)、`stats.js`/`elements.js`/`combat.js`/`tribulation.js`/`bounty.js`(加成與特效)、`bag.js`/`equipment.js`/`auction.js`/`talisman.js`(卡片)、`save.js` |
| 20b | `lingjie.js` | 靈界（第 74 節）：`getLingStone`/`addLingStone`/`hasLingStoneSet`/`payLingStoneSet`/`formatLingStones`/`lingStoneShortText`、`isInLingjie`/`isLingjieMapCategory`、`prepareLingjieEntry`(飛升點，town.js 的 enterCityGate)/`tryLeaveLingjie(then)`/`leaveLingjieToWorldMap`(靈界地圖右上鈕)/`openCurrentWorldScene`(世界導覽)、掉落 `rollLingStoneDrops(rolls, silent)`/`rollLingStoneZhenmo`、`migrateLingjie(data)` | `config-towns.js`(LINGJIE_*)、`map.js`(changeMap/getMapCategoryIndex)、`town.js`(openTownScene/closeCityGate)、`ui.js`(gameAlert/gameConfirm) | `map.js`(getMapEntryBlock、changeMap、returnToSect)、`town.js`、`home-ui.js`(openWorldTab)、`combat.js`、`save.js`、`zhenmo.js`、`bag.js` |
| 33b | `integrity.js` | 存檔驗證（第 72 節）：`igSign`/`igHash`、`igPrepareSave`(saveLocal 寫入字串，嵌 _sig)/`igVerifyLocal`(loadLocal)/`igSignedCopy`(匯出)/`igVerifyImport`(匯入)、`isSaveFlagged`/`flagSave`、合理性 `igProgressHours`/`igAuditCheck`/`igAddPlaySeconds`、一次性解除 `igAmnesty`（頂層 setInterval 每秒累計遊玩時數） | `player`、`realmPacing`、`stats.js`(getNextExp)、`main.js`(gameStarted)、`ui.js`(addLog) | `save.js`(存讀檔、匯入匯出、離線秒數)、`leaderboard.js`(不上傳)、`market.js`(不能寄售／出價) |
| 33c | `timeguard.js` | 時間防護（第 77 節）：`gameNow`（伺服器校正後的現在時間）、`tgFetchServerTime`/`tgSync`（HEAD 讀 Date 標頭、測速）、`tgAllowTick`/`tgPlaySecondsPerTick`（加速時按比例跳過）、`tgVerifyGap`（背景大間隔確認）、`tgVerifyOfflineSeconds`（離線秒數確認）、`tgSaveStamp`（存檔記 `player.lastSaveSrv`）；變數 `tgOffset`/`tgSpeed`；載入即對時、每 2 分鐘一次 | `ui.js`(addLog)、`player` | `save.js`(calcOfflineProgress/checkBackgroundCatchUp/saveLocal)、`combat.js`(combatTick)、`integrity.js`(遊玩秒數)、每日重置的 todayKey 類（partner/encounter/activity/casino/economy/enhance/lingjie/race/secret-realm/daily-quest）、`town-npc.js`(仙翁時段) |
| 34e2 | `craft.js` | 做裝（第 69 節）：通貨 `getCraftCur`/`addCraftCur`/`formatCraftGain`/`craftGainSuffix`、掉落 `rollCraftFieldDrops`/`onCraftFieldKills`/`rollCraftZhenmo`/`rollCraftDecompose`/`rollCraftDecomposeMany`、`canCraft`/`craftSubCap`/`craftPoxuLockLeft`/`isCraftSealed`/`setSubTier`、操作 `useCraftCur(k)`/`forgeCraftSub`(鍛紋台，`craftForgeKey`)/`corruptEquip`(入魔淬煉)、顯示 `renderCraftSection`/`formatGearCraftTag` | `config-enhance.js`(CRAFT_*)、`gear.js`(rollGearSubs/rollGearSubTier/rollGearSubValue/gearRollOpts)、`enhance.js`(enhanceEquipId/locateEquip/renderEnhanceModal/formatOneSub)、`save.js`(saveLocal) | `enhance.js`(強化視窗、分解)、`equipment.js`(鍛造自動分解)、`gear.js`(卡片標籤)、`combat.js`(野外擊殺)、`save.js`(離線)、`zhenmo.js`、`defense.js` |
| 34e | `enhance.js` | `randInt`、星允鐵 `addStarIron`/`addIronShards`、`locateEquip`/`removeLocatedEquip`、強化 `getEnhanceInfo`/`canEvolve`/`enhanceEquipId`/`openEnhanceModal`/`renderEnhanceModal`/`getEvolveStatRatio`/`enhanceEquip`/`promptEvolveEquip`(+20 系統通知)/`evolveEquip(skipConfirm)`、分解 `getDecomposeYield`/`formatDecomposeYield`/`decomposeEquip`/`bulkDecomposeEquipment`、暫存區 `isGearStashFull`/`receiveLootEquip`/`enforceGearStashLimit`/`moveStashToBag`/`deleteStashEquip`/`renderStashSection`、`refreshEquipViews`、千寶閣 `getIronShopState`/`renderIronShopSection`/`buyStarIron`/`rollIronBagItem` | `config-enhance.js`、`gear.js`、`codex.js`(checkTitleUnlocks、稱號強化成功率)、`map.js`(changeMap)、`ui.js` | `bag.js`/`equipment.js`(按鈕與暫存區)、`auction.js`、`combat.js`/`bounty.js`/`servant.js`(星允鐵)、`map.js`/`save.js`(暫存區滿) |
| 34h | `strange-fire.js` | 異火（第 38 節）：**載入時**建 `strangeFireById`；`addFireShards(n, source)`(取得碎片，供未來秘境掉落呼叫)/`rollStrangeFire`/`gainStrangeFire`/`craftStrangeFire(qty)`(合成，數字或 'max')/`getStrangeFireRealmReduction`(秘境受傷減免比例)/`getStrangeFireBonusTotals`(收錄加成)/`countCollectedFires`/`migrateStrangeFires`(舊存檔)/`renderStrangeFireCards`(背包卡片)/`renderCodexFires`(天磯錄分頁) | `config-strange-fire.js`、`player.fireShards`/`strangeFires`/`fireCollection`、`codex.js`(describeTitleBonus、openCodexModal)、`ui.js` | `bag.js`(renderBag)、`gear.js`(getBonusTotals)、`codex.js`(異火分頁、頂端統計)、`save.js`(applySaveData)；未來秘境（掉落、受擊減傷） |
| 34k | `casino.js` | 天星賭坊（第 40 節）：狀態 `casinoTab`/`casinoBusy`/`casinoResultHtml`/`casinoDice`；`getCasinoState`(跨日重置)/`getCasinoDailyLimit`/`getCasinoRemaining`/`getDiceMaxBet`/`isInCasinoTown`/`checkCasinoSpend`(城鎮、靈石、上限、大額確認)/`recordCasino`；隕石 `randCasino`/`rollStoneOutcome`/`grantStoneOutcome`/`cutStone(id, count)`；擲骰 `setDiceType`/`setDicePick`/`setDiceTotal`/`setDiceAmount`/`addDiceAmount`/`setDiceMax`/`getDicePayout`/`describeDiceBet`/`judgeDice`/`rollDice`；視窗 `openCasinoModal`/`setCasinoTab`/`renderCasino`/`renderCasinoStones`/`renderCasinoDice`/`renderCasinoRecord` | `config-casino.js`、`player.casino`/`coins`/`ore`/`realmIndex`/`currentMap`、`enhance.js`(addStarIron/addIronShards)、`strange-fire.js`(addFireShards/rollStrangeFire/gainStrangeFire)、`gear.js`(tryLootDrop 的 casinoPurple/casinoOrange)、`codex.js`(checkTitleUnlocks/describeTitle*)、`ui.js` | `config-towns.js`(天星城石拱門傳送點)、`codex.js`(賭運稱號條件讀 player.casino) |
| 34j | `town.js` | 城內場景：`currentTownScene`/`currentTownView`/`hasTownScene`/`pickTownView`(直向用 portrait)/`openTownScene(name)`/`closeTownScene`/`applyTownView(recenter)`(換圖＋重排)/`renderTownHotspots(view)`(人偶＋傳送點；有 `chance`／`schedule` 的人偶看 `townFigureShown`)/`rollTownFigures(scene)`(openTownScene 時判斷；schedule 人偶到點自動離開 `townFigureTimer`)/`layoutTownScene(recenter)`；頂層註冊 resize 監聽與 `initTownScenePan`（滾輪左右平移、拖曳平移、`?townedit=1` 座標工具），只綁事件、無其他副作用 | `config-towns.js`、`#town-scene` DOM、`town-npc.js`(rollTownNpcs／getTownNpcFigures，執行期才呼叫) | `map.js`(goToTown／renderTownTeleports)、HTML 離開按鈕、傳送點 action |
| 34i | `partner.js` | 夥伴（第 39 節）：**載入時**建 `partnerById`；`getPartnerPowerAvg`/`getPartnerTier`/`isPartnerMet`；好感 `getBond`/`getBondLevel`/`getBondLevelName`(LV5 道侶／結拜)/`addBond`/`reduceBond`/`nextBondMin`/`todayKey`/`greetPartner`/`pickGreetLine`/`getGiftCost`/`getGiftsLeft`/`giftPartner`；情緣任務 `getQuestStat`/`describeBondQuest`/`acceptBondQuest`/`getBondQuestProgress`/`claimBondQuest`/`abandonBondQuest`/`onPartnerFieldKills`；結識 `meetPartner`/`talkToPartner`(場景人偶)；彩蛋 `askPartnerEaster`/`answerPartnerEaster`/`playPartnerVideo`/`getPlayedSeconds`/`onPartnerVideoEnded`/`closePartnerVideo`、狀態 `partnerVideoCtx`；隊伍 `getPartnerTeam`/`isInTeam`/`togglePartnerTeam`/`getPartnerBonusTotals`/`partnerSkillTurn`/`migratePartners`；對話 `showPartnerDialog(p, lines, note, afterId, choices)`/`closePartnerDialog`；視窗 `partnerFilter`/`openPartnerModal(focusId)`/`setPartnerFilter`/`formatPartnerOrigin`/`renderBondSection`/`renderPartnerCard`/`renderPartnerModal` | `config-partners.js`、`player.partners`/`partnerTeam`/`partnerBond`/`fieldKills`/`evilKills`/`bountyKills`/`gender`/`coins`、`artifact.js`(castProcSkill)、`codex.js`(describeTitleBonus)、`ui.js` | `gear.js`(getBonusTotals)、`combat.js`(partnerSkillTurn、擊殺後 onPartnerFieldKills)/`tribulation.js`/`bounty.js`、`save.js`(migratePartners)、`config-towns.js`(風希人偶 talkToPartner)、`town-npc.js`(showPartnerDialog／addPartnerShards／addBond)、HTML 情緣導覽與對話框；`closePartnerDialog` 會呼叫 town-npc.js 的 `onTownNpcDialogClosed`（有定義才呼叫） |
| 34m | `yuanshen.js` | 元神（第 65 節）：`hasYuanshen`/`getYuanshenInfo`/`getYuanshenCandidate`（資質判斷）、`getYuanshenBonusTotals`（修為）、`getYuanshenElement`（本命五行鎖定）、`getYuanshenDmg`（偏好屬性傷害）、`addHuashenScroll`/`rollHuashenScroll`/`rollFieldHuashenScroll`/`checkDailyHuashenBonus`（化神訣殘本）、`formatYuanshenShort`、`openYuanshenModal`/`condenseYuanshen`；只有函式、無載入時副作用 | `config-yuanshen.js`、`aptitude.js`(describePhysique、formatAptitudeShort)、`map.js`(getMapSuitRange)、`ui.js`(gameConfirm、addLog)、`#yuanshen-modal` DOM | `gear.js`(getBonusTotals)、`stats.js`(getPlayerElement)、`elements.js`(getPlayerCombatAttrs → resolveHit)、`combat.js`(風擊、野外掉落)、`golden-core.js`(凝聚後加成歸零)、`aptitude.js`(鎖定)、`leveling.js`(轉世清空)、`zhenmo.js`／`defense.js`／`encounter.js`／`bounty.js`／`daily-quest.js`(殘本)、`bag.js`、`ui.js`(updateUI) |
| 34l | `town-npc.js` | 城內隱藏 NPC（第 20 節）：狀態 `townNpcSpots`（{ 城名: { npc, spot } }，本次進城擲出的結果）/`townNpcDuelTimers`/`townNpcDuelPlace`/`townNpcAskAt`（防連點，`TOWN_NPC_CHOICE_GUARD_MS`）/`townNpcAutoTimer`（「吃」消失後自動開打）/`townNpcAsking`（還沒選的城名）；`onTownNpcDialogClosed`（partner.js 的 closePartnerDialog 呼叫：問句被關掉＝開打）；`closeTownNpcDuel`（離開決鬥畫面＝關掉城內場景）；`isTownNpcDoneToday`/`markTownNpcDone`（`player.townNpc = { id: 日期 }`，用到才建立）、`getTownBanLeftMin(城名)`（`player.townBan`，被打爆後的禁入；map.js 的 goToTown 呼叫）、定時人偶 `getFigureSched`/`getScheduledFigureLeftMs`/`isScheduledFigureHere`（town.js 的 rollTownFigures 呼叫）/`talkToScheduledFigure(id)`（`player.townFigureSched`）、`rollTownNpcs(城名)`、`getTownNpcFigures(城名, view)`（只畫在主圖）、`removeTownNpc`、`talkToTownNpc`/`answerTownNpc(城名, 吃?)`、`startTownNpcDuel`；只有函式定義、無載入時副作用 | `config-towns.js`(hiddenNpcs)、`partner.js`(partnerById、showPartnerDialog、addPartnerShards、addBond、todayKey…)、`town.js`(currentTownScene、renderTownHotspots、closeTownScene)、`numeric.js`/`stats.js`(戰力、getMaxHp)、`format.js`(fmtCombat)、`#partner-dialog-modal`／`#town-duel` DOM | `town.js`(openTownScene 擲骰、renderTownHotspots 併入人偶)、`map.js`(goToTown 檢查禁入)、人偶 onclick |
| 34m | `xianweng-games.js` | 隱藏仙翁小遊戲（第 74 節）：每日次數 `getXianwengDaily`（`player.xianweng = { date, fish, chess }`）/`xianwengFishLeft`/`xianwengChessLeft`/`grantXianwengStone`/`backToXianweng`；開場動畫 `playXianwengIntro(then)`/`finishXianwengIntro`；釣魚 `openXianwengFishing`/`xianwengFishAction`/`xianwengCast`/`xianwengHook`/`xianwengReelFrame`/`endXianwengCast`/`grantXianwengFishLoot`/`closeXianwengFishing`/`initXianwengFishControls`（狀態 `xwFish`）；五子棋 `openXianwengGomoku`/`gomokuPlay(i)`/`endXianwengGomoku`/`restartXianwengGomoku`/`closeXianwengGomoku`（狀態 `xwChess`）、AI `gomokuFive`/`gomokuCellScore`/`gomokuCandidates`/`gomokuOrdered`/`gomokuNegamax`/`gomokuWinCells`/`gomokuVCF`/`gomokuAiMove` | `config-towns.js`(XIANWENG_GAMES、LINGJIE_STONE_KEYS)、`town-npc.js`(townNpcSpots、talkToXianweng)、`lingjie.js`(addLingStone)、`enhance.js`(addRefineStones/addStarIron)、`craft.js`(addCraftCur/formatCraftGain)、`partner.js`(todayKey)、`save.js`(saveLocal)、`ui.js` | `town-npc.js`(xianwengChoose)、HTML 按鈕 |
| 34n | `bgm.js` | 背景音樂（第 76 節）：`BGM_TRACK_COUNT`/`BGM_PLAYLIST`/`BGM_PREF_KEY`/`bgmAudio`/`bgmIndex`/`bgmUnlocked`；`getBgmPref`/`saveBgmPref`/`isBgmZone`/`getBgmZoneAudio`/`isSoundVideoPlaying`/`bgmTrackSrc`/`getBgmAudio`/`switchBgmTrack`/`playBgm`/`pauseBgm`/`isBgmPlaying`/`bgmTitleTap`/`renderBgmTitleBtn`/`toggleBgm`/`setBgmVolume(v)`/`renderBgmSettings`/`initBgm`（載入時呼叫） | `audio/bgm-game.*`、`audio/bgm-1～8.*`、`audio/bgm-sanjie.*`（靈界大地圖、三界之戰）、localStorage、`#bgm-*` DOM | `settings.js`(openSettingsModal 呼叫 renderBgmSettings)、主頁音樂鈕、設定視窗按鈕 |
| 34f | `profession.js` | `getProfession`/`getProfRank`/`getProfRankName`/`getProfessionPassive`/`getProfWeaponMult`/`gainProficiency`/`gainKillProficiency`/`professionSkillTurn`/`formatProfessionTag`/`chooseProfession`/`renderProfessionTab` | `config-profession.js`、`artifact.js`(castProcSkill)、`elements.js`(getMapCategoryIndex)、`codex.js` | `stats.js`(主修武器加成)、`gear.js`(被動)、`combat.js`/`tribulation.js`/`bounty.js`(職業技能、熟練度)、`save.js`(離線熟練度)、`codex.js` |
| 34g | `codex.js` | 收藏 `recordGearCollected`/`migrateGearCodex`/`hasCollected`/`getOpenGear`/`getTitleGear`(收藏類稱號範圍，固定不含秘境)/`countCollected`/`countCollectedQuality`、稱號 `getTitleName`/`isTitleConditionMet`/`describeTitleCondition`/`describeTitleBonus`/`getTitleBonusTotals`/`checkTitleUnlocks`/`getNameTag`/`setActiveTitle`、視窗 `codexTab`/`codexSlot`/`openCodexModal`/`setCodexTab`/`setCodexSlot`/`renderCodexModal`/`formatCodexStars`/`formatCodexStarLegend`(星星六色，第 48 節)/`CODEX_QUALITIES`/`renderCodexGear`/`renderCodexSets`/`renderCodexTitles`（異火分頁在 strange-fire.js） | `config-titles.js`、`gear.js`、`profession.js`、`strange-fire.js`(renderCodexFires/countCollectedFires)、`merit.js`(getKarmaState)、`stats.js`(getSectTier) | `gear.js`(收藏、稱號加成)、`enhance.js`、`profession.js`、`ui.js`(updateUI 每秒 checkTitleUnlocks)、`home-ui.js`(道號旁標籤)、`save.js`、HTML 天磯錄熱點 |
| 35 | `field.js` | `herbRecipes`、`openFieldModal`/`plantHerb` | `player.spiritGrass`/`player.herbs`/`player.coins`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示） |
| 36 | `beast-combat.js` | `createBeast`/`getBeastName`/`isBeastActive`(存活且出戰中)/維持費 `getBeastUpkeep`/`payBeastUpkeep`/`restBeastForUpkeep`/`tickBeastUpkeep`/`settleOfflineBeastUpkeep`/`getBeastSkill`/`describeBeastSkill`/`gainBeastExp`/`killAllBeasts`/`applyPetDamageReduction`/`petAssistTick` | `beastData`、`beastSkillTree`、`beastUpkeepTiers`/`BEAST_UPKEEP_INTERVAL`、`player.beasts`/`level`/`coins`/`beastCore`、`stats.js`(getLevelExpNeeded/getPhysAttack)、`beast.js`(renderBeasts，靈獸園開著時重繪) | `leveling.js`(gainExp)、`combat.js`(每秒 tickBeastUpkeep)/`tribulation.js`(每回合)、`lifespan.js`(死亡)、`stats.js`(hasLiveBeast)、`beast.js`、`save.js`(離線維持費) |
| 36a | `spells.js` | **載入時執行** IIFE 組出 `spellList`(200 招)/`spellById`；`getSpell`/`isSpellLearned`/`getSpellSlotCount`/`getEquippedSpells`/`getSpellAuraBonus`(被動光環加總)/`spellToCombatSkill`/`getSpellTypeLabel`/`describeSpell`、密典 `spellFilter`/`spellSelectedId`/`openSpellModal`/`setSpellFilter`/`selectSpell`/`renderSpellModal`/`equipSpell`/`unequipSpell` | `config-spells.js`（**必須排在它之後**）、`player.spells`/`spellSlots`/`level`、`ui.js`(addLog/updateUI) | `stats.js`(getPhysAttack/getMagAttack/getMaxHp/getMaxMp 乘光環、getAllSkills 加技能格仙法)、`elements.js`(getPlayerCombatAttrs 加光環)、HTML 密典按鈕 |
| 37 | `beast.js` | `openBeastModal`/`getBeastDiscountMult`(魅力折扣倍率)/`renderBeasts`/`tameBeast`/`reviveBeast`/`toggleBeastActive`(出戰／召回休息)/`learnBeastSkill` | `beastData`、`player.beastCore`/`coins`/`beasts`、`beast-combat.js`、`stats.js`(getEquipBonus 算魅力折扣) | HTML 按鈕（僅在「宗門」顯示） |
| 38 | `library.js` | 第一階段 `STUDY_COST`/`STUDY_GAIN`/`STUDY_MAX_COUNT`、`openLibraryModal`/`studyBook`；第二階段屬性秘典（第 24 節）`ELEMENT_BOOK_TIER`/`ELEMENT_BOOK_GAIN`/`ELEMENT_BOOK_MAX`/`ELEMENT_BOOK_COST`/`elementBooks`、`isElementBookUnlocked`/`getElementBookBonus`/`formatElementBookPercent`/`renderElementBooks`/`studyElementBook` | `player.studyCounts`/`elementStudy`/`martialPoints`/`spiritGrass`/`coins`/`stats`/`sectSkills`、`SECT_TIER_NAMES`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示）、`elements.js`(getPlayerCombatAttrs 呼叫 getElementBookBonus) |
| 39 | `alchemy.js` | `pillRecipes`、`openAlchemyModal`/`craftPill`、服用紀錄 `getPillUsed`/`renderPillUsed`（`player.pillUsed`，卡片 `#pill-used-{類型}` 顯示「已服用 N 顆」，2026-09-27 起記錄）；煉成呼叫 ui.js 的 `showCraftSuccess` | `player.herbs`/`stats`/`coins`、`ui.js`(resolveBatchCount) | HTML 按鈕（僅在「宗門」顯示） |
| 40 | `player-profile.js` | `PLAYER_NAME_MAX_LENGTH`、`sanitizePlayerName`(移除 HTML 特殊字元，讀檔/匯入也套用)/`changePlayerName`(開啟 #name-modal)/`confirmPlayerName` | `player.name` | HTML 按鈕、`save.js`(applySaveData) |
| 41 | `save.js` | `calcOfflineProgress`(讀檔時的離線結算，呼叫 settleIdleSeconds)/`settleIdleSeconds`(離線與背景共用的收益結算，含 settleOfflineBeastUpkeep 靈寵維持費)/`estimateIdleCombat`(依實力估算離線戰鬥效率與能否存活)/`formatIdleDuration`/背景補發 `checkBackgroundCatchUp`＋常數 `BACKGROUND_TICK_SLACK_MS`/`BACKGROUND_SETTLE_MIN_SECONDS`（第 33 節）/`saveLocal`/`loadLocal`/`applySaveData`(讀檔與匯入共用)/`resetGameCompletely` + 舊存檔相容 `migrateServantAssignments`/`migrateEquipmentSlots`/`migrateActivityFields`/`migrateCurrentMap`/`migrateProgressionFields`/`migrateLegacySkills`(舊禁術下修＋已兌換武學耗魔同步)/`migrateRealmExp`(經驗曲線改版：待渡劫者修為壓回滿格)/`migrateEquipSockets`(只補 talismans 欄位)/`migrateArtifactIds`(在 artifact.js，舊神器補 lingbaoId) + 讀檔失敗保護 `saveLoadFailed`/`reportLoadFailure`/`retryLoadAfterFailure`/`showRawSaveForCopy`/`abandonSaveAndStartNew`（第 30 節） + 離線斬殺野外修士的功德（讀檔時也呼叫 `settleMeritStones()`）+ 讀檔時清除懸賞對決狀態 + `reloadLocalSave`(選單按鈕，無存檔時給提示) + 存檔代碼（常數 `SAVE_CODE_PREFIX`="FS2:"、兩段式確認暫存 `pendingImportData`；編解碼皆為 async）`encodeSaveCode`/`decodeSaveCode`/`bytesToBase64`/`base64ToBytes`/`pipeBytes`/`openSaveCodeModal`/`setSaveCodeStatus`/`exportSave`/`selectSaveCodeText`/`copySaveCode`/`downloadSaveCode`/`importSave`/`pasteSaveCodeFromClipboard`/`importSaveFromFile`/`confirmImportSave`/`resetImportConfirm` | `player`（整包序列化進 `localStorage`）、`maps`(migrateCurrentMap)、`legacySkillAdjustments`/`lingbaoShopItems`(migrateLegacySkills)、`leveling.js`(gainExp)、`combat.js`(tryRescueServant)、`lifespan.js`、`beast-combat.js`(createBeast)、`ui.js` | `main.js`(啟動時 loadLocal)、`main.js`(initGame 內每 30 秒 saveLocal) |
| 41b | `avatar.js` | `getPlayerAvatar`/`isAvatarUnlocked`/`checkAvatarCondition`/`checkAvatarUnlocks`/`openAvatarModal`/`renderAvatarModal`/`buyAvatar`/`selectAvatar`；頭像光環 `isFrameUnlocked`/`getPlayerFrame`/`checkFrameUnlocks`/`getFrameOverlayBox`/`renderFramedAvatar`/`renderFrameList`/`selectFrame`/`buyFrame` | `avatarList`、`avatarFrameList`/`AVATAR_FRAME_HOLE_FIT`、`player.avatarId`/`unlockedAvatars`/`avatarFrameId`/`unlockedFrames`/`gender`/`realmIndex`/`level`/`reputation`/`tribulationCount`、`realms` | `ui.js`(updateUI 呼叫 checkAvatarUnlocks；戰鬥實況頭像 renderFramedAvatar)、`home-ui.js`(頭像框、`updateHudAvatarFrames`)、HTML 頭像點擊與選擇視窗 |
| 41d | `leaderboard.js` | 天下戰力榜（第 42 節）：狀態 `lbBackend`/`lbLastUploadAt`/`lbLastRefreshAt`/`lbRows`/`lbError`/`lbBanned`(被 GM 封鎖)；`lbProbeQuota`(連線失敗時用 REST 確認是否 429 額度已滿)；`checkLeaderboardBan`(上傳前查 banned/{uid}，第 50 節)；`lbTsDiffNanos`(兩個 Timestamp 相差奈秒，hist2 用)；`isLeaderboardConfigured`/`getRankPower`(= getPhysAttack 扣掉禁術、靈寵增益、對決化功等暫時倍率)/`getRankAttack`(max(物攻, 術攻) 同樣扣暫時倍率，守城送審用)/`lbStripTempBuffs`/守城榜 `lbDefenseRows`/`lbDefenseMine`/`lbTab`、`submitDefenseRecord(run)`/`flushDefenseSubmit`/`getDefenseRankStatusText`/`fetchDefenseBoard`/`switchLeaderboardTab`/`applyLeaderboardTab`/`defenseBoardHtml`（第 49 節）/`lbLoadScript`/`initLeaderboardBackend`(動態載入 Firebase compat SDK＋匿名登入，回傳 `{db, uid}`)/`uploadLeaderboard`/`startLeaderboardSync`/`fetchLeaderboard`/`openLeaderboardModal`/`refreshLeaderboard(manual)`/`lbEscape`/`lbTimeAgo`/`renderLeaderboard(loading)` | `config-leaderboard.js`、`stats.js`(getPhysAttack)、`bounty.js`(getDuelWeakenMult)、`player`/`petBuffTimer`/`petBuffMult`/`gameOver`、`save.js`(saveLoadFailed)、`main.js`(gameStarted)、`player-profile.js`(sanitizePlayerName)、`realms`、全域 `firebase`（CDN 動態載入） | `main.js`(initGame 呼叫 startLeaderboardSync)、HTML 洞府 HUD「戰力 🏆」與大道石碑、`defense.js`(submitDefenseRecord／getRankPower／getRankAttack／getDefenseRankStatusText) |
| 41e | `secret-realm.js` | 秘境入口（第 43 節）：`currentSecretRealm`、`getSecretRealm`/`openSecretRealmModal`/`renderSecretRealmList`/`openSecretRealmScene(id)`/`closeSecretRealmScene`(回到列表)/`challengeSecretRealm`(顯示預定玩法與獎勵；`mode: 'defense'` 改呼叫 `openDefenseBattle`)、每日次數 `getSecretRealmDaily`/`getSecretRealmAttemptsLeft`/`useSecretRealmAttempt`/`refreshSecretRealmEnterLabel` | `config-secret-realms.js`、`realms`、`player.realmIndex`、`ui.js`(closeModal)、`defense.js` | `activity.js`(活動「秘境」的 openFn)、HTML 秘境卡片與場景按鈕 |
| 41g | `zhenmo.js` | 鎮魔塔（第 51 節）：`ZhenmoTower`（閉包；對外 open／close／startQuiz／answer／enterBoss／renderHall／state 與測試用 `_quiz`）、全域 `openZhenmoTower`/`closeZhenmoTower`/`startZhenmoQuiz`/`answerZhenmo(i)`/`enterZhenmoBoss`/`backToZhenmoHall`/`startZhenmoFight`/`skipZhenmoFight`/`setZhenmoFightSpeed` | `config-zhenmo.js`、`config-zhenmo-questions.js`、`#zhenmo-scene` DOM、`secret-realm.js`(次數)、`ui.js`(addLog)、`config-defense.js`(defenseRealmAtk)、`elements.js`(resolveHit／tickStatus／newStatus)、`stats.js`、獎勵的 strange-fire.js／enhance.js／merit.js | `secret-realm.js`(challengeSecretRealm 的 `mode: 'tower'`)、HTML 鎮魔塔畫面按鈕 |
| 41g2 | `world-boss.js` | 世界 Boss（第 75 節）：狀態 `wbState`/`wbMine`/`wbTop`/`wbClaimable`/`wbFight`/`wbUid`；時段 `wbWindowStart`/`wbDayIdx`/`wbIsActive`/`wbNextOpen`；雲端 `wbRollover`(換隻交易)/`wbLoad`/`wbFetchTop`/`wbSubmit`(戰果交易)；視窗 `openWorldBossModal`/`refreshWorldBoss`/`renderWorldBoss`/`wbRankOf`；戰鬥 `startWorldBossFight`/`wbRound`/`wbStep`/`setWorldBossSpeed`；OP王動畫 `wbOp`/`wbOpStart`/`wbOpShow`/`wbOpNext`/`wbOpStop`/`wbEndFight`/`closeWorldBossFight`；領獎 `claimWorldBossReward` | `config-world-boss.js`、`leaderboard.js`(initLeaderboardBackend/lbWithTimeout/lbIsQuota/lbProbeQuota/lbEscape/lbBanned)、`elements.js`(resolveHit/tickStatus/光環)、`numeric.js`、`race.js`、`config-zhenmo.js`(ZHENMO_PLAYER_SKILL_MULT/ZHENMO_ROUND_MS/ZHENMO_HERO_IMG)、`integrity.js`(isSaveFlagged)、`enhance.js`/`craft.js`(獎勵)、`codex.js`(checkTitleUnlocks) | `secret-realm.js`(秘境卡片 mode 'worldboss') |
| 41f | `defense.js` | 死守天南城（第 49 節）：`DefenseBattle`（內部函式全包在裡面，對外 open／close／setSpeed／retry／openRecords／closeRecords／waveSpec／waveAtk／waveRealmLabel／waveEnemy／simulateWave 與測試用 `_sim`／`_grantWave`／`_settle`／`_setWave`／`_state`；內部 `recordRun` 寫通關紀錄並送審）、全域 `openDefenseBattle(realmId)`/`closeDefenseBattle`/`setDefenseSpeed`/`finishDefenseNow`（一鍵結束 → `DefenseBattle.finishNow`）/`openDefenseRecords`/`closeDefenseRecords` | `config-defense.js`（含強度曲線 defenseRealmAtk／defenseWaveAtk）、`leaderboard.js`(送審、getRankPower／getRankAttack)、`format.js`(toWan)、`#defense-scene` DOM、`bounty.js`(getBountyRefSectMult)、`elements.js`(resolveHit/tickStatus/newStatus)、`stats.js`、獎勵用的 gear.js／enhance.js(receiveLootEquip／addStarIron)／strange-fire.js／merit.js／partner.js／codex.js(checkTitleUnlocks)、`secret-realm.js`(次數) | `secret-realm.js`(challengeSecretRealm)、HTML 守城畫面按鈕 |
| 41c | `settings.js` | `DISPLAY_MODE_KEY`(localStorage 鍵)/`DISPLAY_MODES`/`AUTO_PC_MIN_WIDTH`/`AUTO_PC_MIN_RATIO`、`getDisplayMode`/`resolveDisplayLayout`(回傳 'phone'／'pc')/`setDisplayMode`/字級 `FONT_SCALE_KEY`/`FONT_SCALES`/`getFontScaleId`/`applyFontScale`/`setFontScale`（第 45 節）/`openSettingsModal`/`renderSettingsModal`/`isFullscreen`/`toggleFullscreen`；頂層註冊 `fullscreenchange` 監聽（只綁函式，載入順序不影響） | `home-ui.js`(layoutStage)、`#settings-modal` DOM、`localStorage` | `home-ui.js`(layoutStage 呼叫 resolveDisplayLayout)、HTML ⚙️ 設定按鈕 |
| 41a | `home-ui.js` | `STAGE_IMG_W`/`STAGE_IMG_H`、`TAB_TITLES`(修仙／戰鬥／宗門／任務／世界)、`layoutStage`(手機／PC 版面切換，並控制寬螢幕用手機版時的「切換回 PC 版」按鈕，第 34 節)/`renderPcStage`(依 config-home-pc.js 產生 PC 版按鈕與熱點)/`initHomeUi`/`switchTab`/`openWorldTab`/`showStageToast`/`showHudResourceInfo`(資源框點擊說明，第 47 節)/`showUnderConstruction`/`openAscensionPlatform`/`openSystemModal`(命運與系統彈窗)/`formatShortNumber`/`getCultivationRate`/`updateHomeHud`(同時寫入手機版 hud-xxx 與 PC 版 pc-hud-xxx) | `player`、`realms`、`PLAYER_AVATARS`、`stats.js`、`tribulation.js`(triggerTribulation)、`activity.js`(openActivity)、`config-home-pc.js`、`settings.js`(resolveDisplayLayout) | `ui.js`(updateUI 結尾呼叫 updateHomeHud)、`main.js`(onload 呼叫 initHomeUi)、HTML 熱點與底部導覽 |
| 42 | `title-screen.js` | `TITLE_HOTSPOTS`(光環座標)/`currentTitleHotspot`/`positionTitleHotspot`/`enterWorld`/`initTitleScreen`、旗標 `worldEntered` | `main.js`(startGame)、`#title-screen` DOM | `main.js`(onload 呼叫 initTitleScreen)、標題頁按鈕 |
| 43 | `main.js` | `initGame`(含每 30 秒存檔與切到背景時存檔、啟動戰力榜定時上傳)/`startGame`(讀檔失敗時不進入開新角色)/`chooseGender`/`window.onload`(另呼叫 `applyFontScale()` 套用字級（第 45 節）、`initModalTopClose()` 加彈窗 ✕（第 46 節）與 `restoreLogTab()` 還原日誌分頁（第 44 節）)、旗標 `gameStarted` | 幾乎全部模組（啟動流程的膠水程式碼） | 瀏覽器 `onload`、`title-screen.js`(enterWorld 呼叫 startGame) |

## 3. 資料流總覽（文字版流程圖）

```
使用者開啟 index.html
        │
        ▼
瀏覽器依序載入 config-*.js → state.js → stats.js → ui.js
        → map/combat/leveling → 各彈窗功能檔 → save.js → main.js
        │
        ▼
window.onload (main.js) → initTitleScreen() [title-screen.js]
        │
        ▼
顯示遊戲主頁 #title-screen（此時 <body class="title-mode"> 會隱藏 #game-container）
        │
        │  玩家點擊光環熱區 / 「進入世界」按鈕 / 按 Enter、空白鍵
        ▼
enterWorld() [title-screen.js] → 標題頁淡出、移除 body.title-mode → startGame()
        │
        ▼
startGame() [main.js]
        ├─ loadLocal() [save.js] 讀 localStorage
        │       ├─ 成功 → calcOfflineProgress() 結算離線收益 → updateUI() → initGame()
        │       └─ 失敗（第一次進入）→ 顯示 #gender-modal 性別選擇視窗
        │               └─ 玩家點選 → chooseGender() [main.js]：設定性別與預設道號 → initGame() → 立即 saveLocal()
        │
        ▼
initGame() [main.js]
        ├─ initForgeSelect()      [equipment.js]
        ├─ syncAutoSettingsUI()   [ui.js]
        ├─ updateUI()             [ui.js]
        ├─ setInterval(combatTick, 1000)   [combat.js]  ← 遊戲主迴圈
        ├─ setInterval(saveLocal, 30000)   [save.js]    ← 自動存檔
        └─ startLeaderboardSync()          [leaderboard.js] ← 每 5 分鐘上傳戰力到 Firebase（未設定時不動作，第 42 節）

combatTick() 每秒執行 [combat.js]
        ├─ checkBackgroundCatchUp() [save.js]：分頁在背景被放慢／暫停時，把沒跑到的秒數以離線公式補發（第 33 節）
        ├─ 渡劫中 → tribulationTick() [tribulation.js]；懸賞對決中 → bountyDuelTick() [bounty.js]（兩者都接管整個 tick）
        ├─ 野外刷新新一波前：tryStartBountyDuel() [bounty.js] 已接取懸賞時有機率遇上目標（第 36 節）
        ├─ 安全區：回血回魔、每 5 秒 gainExp() [leveling.js]
        ├─ 野外：玩家狀態結算(燒傷/中毒/凍結) → 攻擊/技能（每擊經 resolveHit() [elements.js]）
        │        → 靈寵協助 petAssistTick() [beast-combat.js] → 怪物狀態結算 → 擊殺結算 → 怪物逐隻反擊（同樣經 resolveHit()）
        │       ├─ 擊殺 → gainExp()（同時累積境界、人物等級、靈寵等級）、加靈石、tryRescueServant() [combat.js]
        │       └─ 戰死 → handlePlayerDeath() [lifespan.js]：折壽、靈寵全數陣亡；壽元歸零 → 清除存檔重新開始
        ├─ 玩家任務進度（須在宗門）[quest.js 的 activeQuest]
        ├─ tickServantQuests() 每位僕從各自的任務進度 [servant.js]
        └─ checkAutoHealAndMana() 自動補給 [combat.js]

任何彈窗操作（購買/裝備/宗門/任務…）
        └─ 修改 player 狀態 → 呼叫 updateUI()/addLog() [ui.js] → 畫面即時更新
```

## 4. HTML `onclick` → 函式 → 所在檔案 對照表

新增/修改 HTML 按鈕時，務必同步確認函式名稱與下表一致（全域函式，不可加 `type="module"`）。
※ `plantHerb(type, qty)`、`craftPill(type, qty)`、`studyBook(stat, qty)`、`studyElementBook(key, qty)`、`forgeEquipment(qty)` 的 `qty` 為 `1`、`10` 或 `'max'`（見第 9 節批次操作）。

| onclick 呼叫 | 定義檔案 |
|---|---|
| `changePlayerName`, `confirmPlayerName` | `data/player-profile.js` |
| `openEquipmentModal`, `unequipItem`, `equipItem`, `forgeEquipment` | `data/equipment.js` |
| `openWorldMapModal`（修仙地圖彈窗：世界分頁按鈕）, `openMapCategoryModal`, `selectMap` | `data/map.js` |
| `openSkillModal`（修仙分頁「⚔️ 當前可用技能」） | `data/ui.js` |
| `switchLogTab('battle'/'item'/'servant')`（歷練日誌分頁按鈕，第 44 節） | `data/ui.js` |
| `openSectModal`, `joinSect` | `data/sect.js` |
| `openShopModal`, `buyShopItem` | `data/shop.js` |
| `openBagModal`, `useItemFromBag`, `deleteItemFromBag`, `deleteEquipFromInventory`, `toggleEquipLock(id)`（背包、暫存區、角色裝備卡片的 🔓/🔒 按鈕） | `data/bag.js` |
| `openServantModal`, `dismissServant`, `toggleServantLock(id)`（僕從卡片的 🔓/🔒 按鈕） | `data/servant.js` |
| `openQuestModal`（任務分頁「📜 門派任務」、宗門分頁按鈕）, `startQuest`, `stopQuest` | `data/quest.js` |
| `openFieldModal`, `plantHerb` | `data/field.js` |
| `openBeastModal`, `tameBeast`, `reviveBeast`, `toggleBeastActive`, `toggleBeastPicker(id, 欄)`／`learnBeastSkill(id, 欄, 技能id)`／`resetBeastSkills(id)`（技能抽屜，`renderBeastSkillSlots()` 動態產生） | `data/beast.js` |
| `openLingbaoShopModal`, `buyLingbaoItem(itemId)`（舊版的第二個參數 payType 已移除，改為同時扣靈石＋聲望） | `data/lingbao-shop.js` |
| `openLibraryModal`, `studyBook`, `studyElementBook`（後者的按鈕由 `renderElementBooks()` 動態產生） | `data/library.js` |
| `openForgeModal`, `openWuxingInfo` | `data/equipment.js` |
| `openAlchemyModal`, `craftPill` | `data/alchemy.js` |
| `triggerReincarnate` | `data/leveling.js` |
| `triggerTribulation` | `data/tribulation.js` |
| `setShopQty`, `setShopQtyMax`, `updateShopTotal` | `data/shop.js` |
| `resetGameCompletely`, `saveLocal`, `reloadLocalSave`, `exportSave`, `openGuideCalc`, `openInstallGuide`（pwa.js）, `importSave`, `copySaveCode`, `downloadSaveCode`, `pasteSaveCodeFromClipboard`, `importSaveFromFile`, `confirmImportSave`, `resetImportConfirm` | `data/save.js` |
| `updateAutoSettings` | `data/ui.js` |
| `closeModal`, `toggleDrawer`, `toggleAllBulkQualities` | `data/ui.js` |
| `bulkDeleteEquipment` | `data/bag.js` |
| `bulkDismissServants`, `assignServantQuest` | `data/servant.js` |
| `openActivity` | `data/activity.js` |
| `openDailyQuestModal`, `claimDailyQuest`, `claimAllDailyQuests` | `data/daily-quest.js` |
| `openAuctionModal`, `buyAuctionItem`、搶拍視窗內的 `raiseAuctionBid(step)`/`giveUpAuctionBid`（動態產生） | `data/auction.js` |
| `acceptBounty(id)`, `abandonBounty(id)`（懸賞榜卡片，由 `renderBountyBoard()` 動態產生）、`acceptAllBounties`／`abandonBounty()`（榜單上方「一次接取全部」「放棄全部追蹤」，`renderBountyBulkButtons()` 產生）、`paidRefreshBounty`（懸賞榜「🔄 立即刷新」） | `data/bounty.js` |
| `paidRefreshAuction`（千寶閣「🔄 立即刷新」，由 `renderAuction()` 動態產生） | `data/auction.js` |
| `openTalismanModal`、`craftTalisman(qty)`（隨機煉製）、`inlayTalisman(equipId, idx)`、`removeTalisman(equipId, idx)`（後三者由 `renderTalismanWorkshop()` 動態產生） | `data/talisman.js` |
| `buyBreakPill`（千寶閣珍貴物資區，動態產生；舊的 `exchangeMeritForStone` 已移除，功德改為自動凝結）、`openEvilHallScene`（經由 `openActivity('evil')`，開殺手殿堂場景）、`openEvilHuntModal`（場景中央「殺手殿堂」匾額）、`closeEvilHallScene`（場景「↩ 離開」） | `data/merit.js` |
| `enterWorld` | `data/title-screen.js` |
| `retryLoadAfterFailure`, `showRawSaveForCopy`, `abandonSaveAndStartNew`（讀檔失敗視窗） | `data/save.js` |
| `switchTab`（手機洞府左側「任務」= `switchTab('task')`）, `openWorldTab`（手機／PC 的「世界」導覽：切到世界分頁並跳出修仙地圖）, `openAscensionPlatform`, `showUnderConstruction`（洞府主畫面尚未實作的按鈕）, `openSystemModal`（命運與系統彈窗：手機丹藥堂上方齒輪、設定視窗內按鈕） | `data/home-ui.js` |
| `activatePartner(id)`（情緣卡片「✨ 激活」，碎片集滿 100 片） | `data/partner.js` |
| `openPartnerModal`（手機與 PC 的「情緣」）、`setPartnerFilter(f)`、`greetPartner(id)`／`giftPartner(id)`／`acceptBondQuest(id)`／`claimBondQuest(id)`／`abandonBondQuest(id)`／`togglePartnerTeam(id)`（情緣視窗內）、`closePartnerDialog`／`answerPartnerEaster(id, yes)`（對話框）、`closePartnerVideo`（彩蛋影片）、`talkToPartner(id)`（坊市人偶） | `data/partner.js` |
| `talkToTownNpc(城名)`（城內隱藏 NPC 人偶，town.js 動態產生）、`answerTownNpc(城名, 吃?)`（對話框「🌭 吃／不吃」）、`closeTownNpcDuel`（決鬥畫面「↩ 被轟出天南市集」）、`talkToScheduledFigure(id)`（天星城賭坊前的牧塵人偶） | `data/town-npc.js` |
| `xianwengChoose('fishing'|'gomoku'|'leave')`（仙翁對話）、`finishXianwengIntro`（開場動畫「略過」）、`xianwengFishAction`／`closeXianwengFishing`（釣魚：拋竿／收竿、還竿；收線是按住，事件由 `initXianwengFishControls` 綁定）、`gomokuPlay(i)`／`restartXianwengGomoku`／`closeXianwengGomoku`（玲瓏棋局） | `data/town-npc.js`、`data/xianweng-games.js` |
| `craftStrangeFire(qty)`（背包異火碎片卡片）、`openCodexModal('fires')`（背包異火卡片「查看異火榜」） | `data/strange-fire.js`／`data/codex.js` |
| PC 版洞府的所有按鈕與建築熱點（onclick 字串寫在 `config-home-pc.js` 的 `pcStageButtons[].action`，改名函式時要一起改） | 各功能檔 |
| `openSettingsModal`（洞府右上 ⚙️、PC 版「設置」）、`setDisplayMode(mode)`、`toggleFullscreen`、`setFontScale('s'/'m'/'l')`（後三者由 `renderSettingsModal()` 動態產生） | `data/settings.js` |
| `openSpellModal`（修仙分頁「📜 武學密典」）、`setSpellFilter`/`selectSpell`/`equipSpell`/`unequipSpell`（密典內動態產生） | `data/spells.js` |
| `openAvatarModal`（點洞府頭像）、`selectAvatar(id)`（選擇視窗內動態產生） | `data/avatar.js` |
| `openEnhanceModal(id)`（背包、角色裝備卡片「🔨 強化」）、`enhanceEquip(untilSuccess)`/`evolveEquip`（強化視窗內）、`decomposeEquip(id)`、`bulkDecomposeEquipment`、`moveStashToBag(id)`/`deleteStashEquip(id)`/`bulkStashEquip(mode)`（暫存區）、`buyStarIron(qty)`（千寶閣） | `data/enhance.js` |
| `openCodexModal(tab)`（洞府寶塔右側山峰「天磯錄」，手機熱點與 PC 的 `pcStageButtons`）、`setCodexTab`/`setCodexSlot`/`setActiveTitle`（視窗內動態產生） | `data/codex.js` |
| `chooseProfession(id)`（天磯錄「職業」分頁） | `data/profession.js` |
| `openLeaderboardModal`（洞府 HUD 手機 `#hud-name`／PC `#pc-hud-name` 的「戰力 🏆」、洞府「大道石碑」熱點：手機寫在 index.html、PC 在 `pcStageButtons` 的 `stele`）、`refreshLeaderboard(true)`（榜單視窗「重新整理」）、`switchLeaderboardTab('power'/'defense')`（榜單視窗分頁：戰力榜／死守天南城通關榜） | `data/leaderboard.js` |
| `openSecretRealmModal`（經由 `openActivity('secret')`）、`openSecretRealmScene(id)`（秘境卡片，動態產生）、`closeSecretRealmScene`（場景「↩ 離開」）、`challengeSecretRealm`（場景「⚔️ 入塔挑戰」／「⚔️ 死守天南城」） | `data/secret-realm.js` |
| `closeDefenseBattle`（守城「↩ 離開」與結算「↩ 返回秘境」）、`setDefenseSpeed(1/2/4)`、`finishDefenseNow`（守城中「⏭ 一鍵結束」）、`DefenseBattle.retry()`（載入失敗「🔄 重新載入」）、`openDefenseRecords`（守城畫面左上與結算畫面「📜 通關紀錄」）、`closeDefenseRecords`（紀錄視窗「關閉」） | `data/defense.js` |
| `closeZhenmoTower`（鎮魔塔「↩ 離開」）、`startZhenmoQuiz`（塔廳「📜 開始問答」）、`answerZhenmo(i)`（問答選項）、`enterZhenmoBoss`（塔廳／結算「🚪 進入／開啟 BOSS 房門」）、`backToZhenmoHall`（「稍後再戰」「↩ 返回塔廳」）、`startZhenmoFight`（BOSS 介紹「⚔️ 挑戰」）、`setZhenmoFightSpeed(1/2/4)`、`skipZhenmoFight`（戰鬥「⏭ 跳過」） | `data/zhenmo.js` |
| `chooseGender` | `data/main.js` |
| `rollAptitudeStep`（資質測試「🎲 手按測靈石」）、`rerollAptitudeFirst`／`confirmAptitudeFirst`（「🎲 再來一次」「✅ 決定」）、`toggleAptitudeAuto(on)`（「🔁 自動重抽」開關）、`openAptitudeView`（人物面板資質）、`rerollAptitude(part)`／`finishAptitudeReroll(keepNew)`（洗髓／伐骨重測；凝聚元神後鎖定） | `data/aptitude.js` |
| `openYuanshenModal`（人物面板「元神」）、`condenseYuanshen`（元神視窗「🔮 凝聚元神」） | `data/yuanshen.js` |
| `openMarketSellModal`（天星城坊市「收購商」傳送點，`config-towns.js`）、`sellEquipByQualities([...])`／`sellPill(id, qty)`／`sellMaterial('shard'/'iron', qty)`／`toggleAutoSellFull`（視窗內動態產生）、`openEstateModal`（宗門分頁「🏞️ 洞府產業」）、`collectEstate(kind)`／`upgradeEstate(kind)`（視窗內動態產生） | `data/economy.js` |

## 5. 新增功能的建議流程

1. **新增資料（怪物/裝備/宗門/商品…）**：優先修改對應的 `data/config-*.js`，不要動邏輯檔。
2. **新增彈窗/系統玩法**：比照現有模式新增一支 `data/新功能.js`（`open高X高Modal` + `render高X高` + 互動函式），
   在 `index.html` 對應位置加上按鈕與彈窗 DOM，並在 `<script>` 清單中加入 `<script src="data/新功能.js"></script>`
   （放在 `state.js`/`ui.js` 之後、`main.js` 之前即可，除非新檔案有頂層立即執行的程式碼且依賴其他資料）。
3. **修改屬性公式**：只改 `data/stats.js`。
4. **修改存檔結構**：修改 `data/state.js` 的 `player` 初始值，並檢查 `data/save.js` 的
   `loadLocal`/`importSave` 是否需要補上舊存檔缺欄位時的預設值（目前已有 `gender`/`name`/`stats.cha`/`studyCounts`/`pendingTribulation`/`tribulationCount` 的相容處理，
   以及 `migrate*()` 系列：僕從任務、裝備欄位、活動欄位、`migrateCurrentMap()`（所在地圖改指向最新設定，已刪除的地圖回到宗門）、`migrateProgressionFields()`（等級/壽元/宗門技能/靈寵）。
   讀檔與匯入都走 `applySaveData(data)`，它會把存檔合併到**全新角色的預設值**（`state.js` 的 `DEFAULT_PLAYER_JSON`）上，
   **不是**合併到目前的 `player`——否則遊戲中匯入缺欄位的舊存檔，會沿用目前角色的等級、宗門技能等資料（曾發生過）。
   ⚠️ 因為已合併過預設值，**判斷「存檔裡原本有沒有這個欄位」要看原始 `data`，不能看 `player`**，
   否則預設值（例如壽元 60）會蓋過應補的值。新增的 `migrate*()` 一律加進 `applySaveData()`，讀檔與匯入就會同時生效。
5. **新增畫面元素時**：先確認電腦版排版，再到 `index.html` 的 media query 區塊
   （第 6 節）補上手機版的調整，避免手機出現破版或水平捲動。
6. **完成任何修改後，回來更新本檔案（ARCHITECTURE.md）對應章節。**

## 6. 版型與 RWD 規則（電腦版 / 手機版）

> ⚠️ **2026-09-24 起主畫面改為「洞府」舞台版面（第 31 節）**：舊的三欄 `#game-container` 已搬進舞台內的分頁區 `#tab-sheet`，
> 各面板依 `data-tab` 分到修仙／戰鬥／宗門／世界分頁，不再是三欄。本節下方的三欄與 `nth-of-type` 排序規則仍留在 CSS 內，
> 但已被 `<style>` 最後的舞台樣式覆蓋；**新增畫面元素請依第 31 節的做法**。彈出視窗（`.modal-bg`）的 RWD 規則照舊有效。

所有樣式集中在 `index.html` 的 `<style>` 內，分成兩段：

1. **共用 / 電腦版樣式**（檔案前半，`@media` 之前）：原本的三欄式版型，未加任何條件，行為與改版前完全相同。
2. **手機 / 平板樣式**（檔案末端，兩個 `@media` 區塊）：**只在窄螢幕生效**，因此不會影響電腦版。

| 斷點 | 目標裝置 | 主要調整 |
|---|---|---|
| `@media (max-width: 900px)` | 手機、平板直式 | 三欄 `300px 1fr 300px` → 單欄；用 `order` 重排為 **狀態列 → 戰場實況 → 角色/地圖 → 宗門設施**；狀態列改直式堆疊（境界/戰力、靈石/聲望各自橫向排）；按鈕加大為觸控尺寸並取消 hover 位移；彈窗寬度 94%、卡片自動排成雙欄；靈寶閣雙按鈕改上下排列；鍛造閣下拉選單改整列（×1/×10/最高 按鈕由 `.batch-btns` 自動排成一列，不需額外規則） |
| `@media (max-width: 480px)` | 一般手機（360–430px） | 進一步縮小 padding、字級、日誌高度、頭像尺寸，卡片最小寬度降為 135px 以維持雙欄 |

維護注意事項：

- **不要為了手機去改電腦版的既有規則**；所有手機調整一律寫進 media query 內，這是「手機有自己的 UI、電腦版不受影響」的前提。
- HTML 內有不少**行內樣式**（如 `style="width: auto; margin-left: 10px;"`）。行內樣式優先權高於 CSS，
  若手機版需要覆蓋它，必須在 media query 內使用 `!important`（目前 `#battle-player-icon img`、
  狀態列子項的 `margin-top` 即是這種情況）。新寫的按鈕盡量用 class 而非行內樣式，就不需要 `!important`。
- `#game-container > div:nth-of-type(n)` 依賴四個直接子元素的順序（header / 角色欄 / 戰場欄 / 設施欄）。
  若之後在 `#game-container` 內新增或調換區塊，必須同步更新 media query 內的 `order` 規則。
- 驗證方式：瀏覽器開發者工具切換 375px、360px 與 >900px 三種寬度，確認
  `document.documentElement.scrollWidth === clientWidth`（無水平捲動），且電腦版維持三欄。

## 7. 渡劫系統（心魔試煉）

**從「築基 → 金丹」開始**，小境界修滿 10 階後不會自動晉升，必須擊敗心魔才能進入下一個大境界。
門檻由 `config-tribulation.js` 的 `TRIBULATION_MIN_REALM_INDEX`（預設 2 =【築基】）控制；
在此之前（凡人 → 煉氣、煉氣 → 築基）滿 10 階會直接突破，溢出的經驗會保留到新境界。

| 環節 | 位置 | 說明 |
|---|---|---|
| 修為封頂 | `leveling.js` 的 `gainExp()` | 小境界到 10 階且經驗滿格時：若 `realmIndex >= TRIBULATION_MIN_REALM_INDEX` 則 `pendingTribulation = true`，之後 `gainExp()` 一律回傳 0（經驗完全停止累積，含離線收益）；未達門檻則直接呼叫 `advanceRealm()` 突破並保留溢出經驗 |
| 渡劫按鈕 | `index.html` 的 `#btn-tribulation` + `ui.js` 的 `updateTribulationUI()` | 只在待渡劫時顯示，並即時顯示目前勝算；渡劫進行中改為顯示心魔剩餘氣血並鎖定 |
| 勝算計算 | `tribulation.js` 的 `getTribulationChance()` | 基礎 + 丹藥 + 技能，上限 80%（見下方） |
| 天命擲骰 | `triggerTribulation()` | 確認視窗列出勝算明細與提升建議；開打時 `tribulationFatedWin = Math.random() < 勝算`（`state.js`，不存檔） |
| 心魔數值 | `config-tribulation.js` | 戰力 = 玩家 100%（`HEART_DEMON_POWER_MULT`）、氣血 = 玩家 100%（`HEART_DEMON_HP_MULT`）、4 個魔功技能；只影響戰鬥過程的觀感 |
| 心魔外觀 | `config-tribulation.js` 的 `HEART_DEMON_IMGS` | 依 `player.gender` 取 `{ img, pos }`，`triggerTribulation()` 寫進 `heartDemon.img／imgPos`，戰場實況顯示（第 59 節）。2026-09-29（版本 `20261002a`）玩家提供男角心魔 `images/monsters/heart-demon-male.jpg`（紫袍魔身，687×1024 縮成 480×715、80KB，pos 50% 25%），版本 `20261002b` 加女角心魔 `images/monsters/heart-demon-female.jpg`（紫髮紅瞳魔女持血晶魔杖，848×1264 縮成 480×715、75KB，pos 50% 22%）。沒有圖時顯示 emoji 🧍。`heartDemon` 不存檔，不用考慮舊存檔 |
| 戰鬥流程 | `tribulation.js` 的 `tribulationTick()` | 由 `combat.js` 的 `combatTick()` 在 `inTribulation` 為 true 時接管，暫停掛機、刷怪與宗門任務。戰況與天命相反時在關鍵一刻收尾：天命勝卻將戰死 →「絕處逢生」判勝；天命敗卻將擊殺心魔 →「心魔反噬」判敗 |
| 成功 | `endTribulation(true)` → `leveling.js` 的 `advanceRealm()` | 晉升大境界並給予屬性獎勵，`pendingTribulation` 解除、經驗恢復累積 |
| 失敗 | `endTribulation(false)` | **視同死亡**：先呼叫 `handlePlayerDeath()` 折壽並使靈寵陣亡（壽元歸零即遊戲結束），再損失 10% 靈石、氣血歸 1、回到安全區；接著 `applyTribulationFailDrop()` **境界跌落並陷入虛弱**（見下方） |

**渡劫失敗的境界懲罰（`config-tribulation.js`）**：
- **跌落**：小境界掉 `TRIBULATION_FAIL_STAGE_DROP`(3) 階（10 階 → 7 階，不低於 1 階，大境界不倒退）、修為歸零、`pendingTribulation` 解除——
  **必須重新修回 10 階才能再次渡劫**。同時扣回這幾階升階時加的屬性（每階四維 -5、魅力 -2），避免「失敗→重升」刷屬性。
- **虛弱**：`player.weakened = true`，`stats.js` 的 `getWeaknessMult()` 讓**物理／術法攻擊、氣血上限、靈力上限 × `WEAKNESS_STAT_MULT`(0.7)**（-30%）。
  `leveling.js` 的 `gainExp()` 在小境界升回 10 階時解除並寫日誌；轉世也會解除。渡劫只能在 10 階發起，所以心魔的戰力／氣血不會吃到虛弱。
  ⚠️ **虛弱解除 ≠ 戰力回到渡劫前**（玩家回報「練回去戰力沒恢復」，2026-09-26）：`getBasePower()` 含修為進度加成，渡劫前是 10 階修為圓滿，
  跌落後修為歸零，剛修回 10 階時攻擊約只有渡劫前的 73%（煉虛實測 7000萬 → 5086萬），要 10 階修為再修滿才回到 100%。
  這是設計如此（玩家選擇不改規則），只在跌落與解除虛弱的日誌加註「戰力要等 10 階修為修滿才會完全恢復」。
- **顯示**：洞府名牌「金丹 7階・虛弱」轉紅（`.hud-realm.weak`，滑鼠移上去有說明）、修仙分頁境界旁「虛弱 -30%」標籤、戰場實況「😵虛弱」；
  渡劫確認視窗也會事先警告這項懲罰。
- ⚠️ 平衡注意：依新修煉節奏（第 26 節），第 8～10 階佔一個境界約一半的修煉時間（(8+9+10)/55 ≈ 49%），
  例如渡劫期失敗約要重修 15 天。若太嚴苛，可調小 `TRIBULATION_FAIL_STAGE_DROP`。

**勝算規則**（`config-tribulation.js` 的 `TRIBULATION_*` 常數）：

| 項目 | 加成 | 條件 |
|---|---|---|
| 基礎 | 60% | 無 |
| 合體期後天劫加劇 | -5% ～ -30% | `realmIndex >= TRIBULATION_HARD_REALM_INDEX`(7 =【合體】，即「合體 → 大乘」起)：每高一境 -5%，最多 -30%（合體 55%、大乘 50%、渡劫 45%、仙人初境 40%、天仙 35%、真仙起 30%）；心魔戰力同步 ×(1 + 扣除量)。由 `getTribulationHardPenalty()` 計算，確認視窗會列出這一項 |
| 丹藥準備 | 最多 +10% | 需開啟【自動補血】；背包氣血丹藥「回復量 × 數量」總和 ÷ 3.0（10 顆九轉還魂丹／30 顆培元丹／60 株凝血草即拿滿） |
| 宗門技能 | 最多 +10% | 目前境界已開放的宗門階段中已學會的比例（築基只開放初級；金丹起開放中級；仙人初境起開放高級） |
| 破障丹 | +10% | 背包有破障丹時，渡劫開打自動服用 1 顆（`config-merit.js`），並讓心魔戰力 ×0.9 |
| 上限 | 80%（服用破障丹時 90%） | `TRIBULATION_MAX_CHANCE` / `BREAK_PILL_MAX_CHANCE`；合體期後的扣除量是先從基礎扣，所以實際可達上限也跟著降低（例：真仙全滿 30+10+10+10 = 60%） |

- 確認視窗在**沒有破障丹**且功德系統開放（`isMeritSystemOpen()`）時會提醒「沒把握？可至千寶閣以七彩補天石購買破障丹」；有破障丹時列出 +10% 並註明服用後剩幾顆。

**為什麼不用純數值平衡**：模擬顯示渡劫結果幾乎由數值決定，勝率曲線非常陡——
調到「無藥約 60%」時，帶滿藥必定 99～100%；且學到越多階段技能越容易（同設定下真仙比築基高約 40 個百分點）。
無法同時做到「基礎 60%、準備後不超過 80%」，因此改成開打前擲骰。
實測每種情境各 1000 場，實際勝率與顯示勝算誤差在 ±3% 內（抽樣誤差），平均 13～17 回合分出勝負。
調整勝算只需改 `TRIBULATION_*` 常數，**不受宗門技能倍率或屬性數值影響**。

## 8. 丹藥與冷卻規則

- 回復量（`config-shop.js` 的 `amount`）：凝血草 5%／培元丹 10%／九轉還魂丹 30%；聚氣散 5%／回天靈液 10%／造化神髓液 30%。
- **使用冷卻**：`POTION_COOLDOWN_SECONDS = 5`。氣血類與靈力類**各自獨立**計時
  （全域變數 `potionCooldownHp` / `potionCooldownMp`，在 `combatTick()` 開頭每秒遞減）。
  手動使用（`bag.js`）與自動輔助（`combat.js`）共用同一組冷卻。
- **分區顯示**：丹藥堂依 `config-shop.js` 的 `shopSections` 分成「氣血丹藥／靈力丹藥」兩區，
  中間以分隔線隔開（`shop.js` 的 `renderShop()` 產生，每區各自一個 `.grid-container`）。
  新增丹藥類型時只要在 `shopSections` 加一筆即可，不必改 `renderShop()`。
  注意 `#shop-list-container` 本身**不可**再掛 `grid-container` class，格線由各分區自己套用。
- **自動購買限制**：`shopItems` 中標記 `noAutoBuy: true` 的丹藥（九轉還魂丹、造化神髓液，
  即兩個類別各自的最高階丹藥）永遠不會被自動輔助花靈石購買；
  但玩家手動買進背包後，自動輔助仍會優先服用它們。
- 自動輔助的選藥邏輯為「背包內回復量最高者 → 否則買得起且未標記 `noAutoBuy` 的回復量最高者」，
  新增丹藥只要加進 `config-shop.js` 就會自動納入，不需改動 `combat.js`。

## 9. 介面慣例（抽屜、批次刪除、神器欄）

- **短暫提示／購買成功**（2026-09-28，版本 `20260930h`，玩家要求「購買物品加入購買成功」）：`ui.js` 的 `showToast(msg, kind)` 在畫面上方中央跳出提示（`#toast-box`，z-index 100000 蓋過所有視窗，約 2 秒淡出，最多同時 4 則）；
  `toastBought(name)` = 「✅ 購買成功：name」（綠框）。已接在：丹藥堂 `buyShopItem`、千寶閣 `completeAuctionPurchase`（壽元丹／星允鐵袋／裝備）與 `buyStarIron`、`buyAptitudePill`、`buySpiritFruit`、`buyBreakPill`、靈寶閣 `buyLingbaoItem`、頭像 `buyAvatar`／光環 `buyFrame`。
  自動補血補魔的自動購買（combat.js）不跳提示（每秒可能觸發）。**日後新增購買功能，成交後呼叫 `toastBought()`。**

- **大量列表的渲染規則（效能）**：僕從（`renderServants`）與背包裝備（`renderBag`）的數量**沒有上限**，
  長期掛機可累積上千筆。這類列表一律先把每張卡片放進陣列、最後 `container.innerHTML = parts.join("")` 一次寫入，
  **禁止在迴圈內寫 `container.innerHTML += ...`**：每次 `+=` 都會把整個列表重新解析一遍，成本隨數量平方成長。
  實測 600 名僕從用 `+=` 會卡住約 12 秒（玩家回報「點開僕從小屋卡住」即此原因），改寫後只要 33 毫秒，3000 名約 0.2 秒。
  固定少量的列表（宗門、地圖、靈寶閣、裝備欄位）不受影響，但新寫的列表請比照同樣做法。
- **數量上限**：僕從 `MAX_SERVANTS`（`config-servants.js`）為 100；背包裝備 `MAX_EQUIP_INVENTORY`（`config-equipment.js`，不含已穿戴）為 **500**
  （2026-10-01 使用者要求由 100 增加，版本 `20261004p`；實測 500 件：背包渲染約 58 毫秒、裝備欄約 10 毫秒、存檔多約 120KB）。
  背包已滿的提示（bag.js `hasEquipInventorySpace`）同版改用 `gameAlert`。
  - 僕從：`tryRescueServant()` 已滿時不收留（日誌提示），回傳是否真的救出；離線結算只計算真正救出的人數。
  - 背包：`bag.js` 的 `hasEquipInventorySpace()` 已滿時跳提示並回傳 false。**鍛造、千寶閣、靈寶閣裝備、卸下裝備**
    都在扣靈石／聲望「之前」檢查。穿戴裝備是一換一，不受影響。**日後新增任何會把裝備放進背包的功能，都要先呼叫它。**
  - 舊存檔已超過上限的不會被刪除，只是要先解僱／刪除到上限以下才能再增加。
  - 僕從小屋與背包頂端顯示「目前數量 / 上限」，滿了轉為提示文字。
- **僕從 id**：`tryRescueServant()` 產生 `時間戳_8 碼隨機英數`。離線結算會在同一毫秒內救出多名僕從，
  舊版只用 0～999 的隨機數，id 可能重複，重複時解僱一名會連帶刪掉另一名。

- **技能面板位置**（2026-09-25 改）：修仙分頁「🛡️ 角色裝備與狀態」下方只放一顆「⚔️ 當前可用技能」按鈕，**點擊才彈出** `#skill-modal`（`ui.js` 的 `openSkillModal()`）。
  清單 `#skill-list` 搬進彈窗內，內容仍由 `renderSkillList()` 以 `getElementById` 填入（`updateUI()` 每秒照常重繪），只要保留 `id="skill-list"`。
- **抽屜式區塊**：`ui.js` 的 `toggleDrawer(id, btn)` 切換 `.drawer-body.open`。
  「命運與系統」（2026-09-25 起是獨立彈窗 `#system-modal`，由手機洞府丹藥堂上方的齒輪或設定視窗內的按鈕開啟，見第 31 節）拆成【存檔管理】與【命運抉擇】兩個抽屜，兩者**預設收合**，
  用意是把「轉世輪迴／完全重置」與日常存檔操作隔開，避免誤觸。
  藏書閣視窗內也用同一套抽屜：「第一階段・四維古籍」(`#drawer-library-1`) 與「第二階段・屬性秘典」(`#drawer-library-2`)，
  兩者**預設收合**，點選才展開可學習的秘笈；按鈕樣式為 `.library-drawer-toggle`。關閉視窗再開啟會維持上次的展開狀態。
- **依品級批次刪除**：`ui.js` 的 `renderBulkDeleteBar()` 產生共用工具列，
  搭配 `getCheckedBulkQualities()` / `toggleAllBulkQualities()`。目前兩處使用：
  - 背包裝備 → `bag.js` 的 `bulkDeleteEquipment()`（品級取自 `equipQualities`，**只刪背包內、不動已穿戴與鎖定的**；勾選框旁的數量不含鎖定）
  - 僕從小屋 → `servant.js` 的 `bulkDismissServants()`（品級取自 `servantQualities`，會一併中止其任務；**略過鎖定的僕從**，勾選框旁的數量不含鎖定）
- **僕從鎖定**（2026-09-28）：僕從物件的 `s.locked`（true = 鎖定，隨存檔保存，舊存檔沒有此欄位 = 未鎖定，不需 migrate）。
  僕從卡片有「🔓 鎖定／🔒 已鎖定」按鈕 → `toggleServantLock(id)`，名稱後加 🔒。鎖定中「解僱僕從」按鈕為 disabled，
  `dismissServant()` 開頭也會擋下（跳提示）；`bulkDismissServants()` 只解僱未鎖定的，確認視窗與日誌會註明略過幾名。
  確認與提示改用遊戲內對話框（`gameConfirm`／`gameAlert`，函式改為 async；背包的 `bulkDeleteEquipment` 同，2026-10-04 版本 `20261005W`）。
  鎖定不影響指派任務。**日後新增任何會移除僕從的功能，都要略過 `s.locked` 的僕從。**
- **裝備鎖定**（2026-09-26）：裝備物件的 `eq.locked`（true = 鎖定，隨裝備存檔，舊裝備沒有此欄位 = 未鎖定）。
  背包、暫存區、角色裝備視窗的每張卡片都有 `formatLockButton(eq)` 產生的「🔓 鎖定／🔒 已鎖定」按鈕 → `toggleEquipLock(id)`（用 `locateEquip` 找三處）；
  `formatEquipTitle()` 在名稱後加 🔒。穿戴、卸下、強化、進化不受鎖定影響，鎖定狀態跟著裝備走。
  **不能刪除的規則**（鎖定中＋穿戴中）集中在 `bag.js` 的 `canRemoveEquip(loc)`：`deleteEquipFromInventory`、`decomposeEquip`、`deleteStashEquip` 開頭都先呼叫；
  一鍵刪除／一鍵分解則在篩選時用 `isEquipLocked()` 略過。鎖定時卡片上的分解／毀棄按鈕為 disabled。
  **日後新增任何會移除玩家裝備的功能（出售、獻祭、合成材料…），都要先過 `canRemoveEquip()` 或略過 `isEquipLocked()` 的裝備。**
- **神器欄位**：`equipTypes` 新增 `"神器": "artifact"`。三個相關注意事項：
  1. `NON_FORGEABLE_SLOTS` 讓鍛造閣選單排除神器（神器只能在靈寶閣高級宗門兌換，見第 18 節）。
  2. `getElementCounts()` 會**濾掉 artifact 分類**再統計，神器不影響靈根判定。
  3. `save.js` 的 `migrateEquipmentSlots()` 會替舊存檔補上新欄位，並移除 `equipTypes` 以外的部位
     （舊版「降魔伏虎杖」的部位「杖」不存在，會干擾靈根判定；穿著中的裝備退回背包）。
     **日後再新增部位時，這三處都要一併確認。**（靈根說明視窗的部位數量是依 `equipTypes` 自動計算，不必改）
- **靈根說明（「!」按鈕）**：角色裝備視窗標題旁的 `.info-btn` 呼叫 `equipment.js` 的 `openWuxingInfo()`，
  開啟 `#wuxing-info-modal`（點背景或「知道了」關閉）。內容包含：激活條件、目前靈根、五行相剋、
  各屬性穿戴進度與套數、單屬性／純化／雙屬性／聖靈根對照表、湊裝方式（靈寶閣固定屬性裝備自動從 `lingbaoShopItems` 列出）。
  裝備視窗頂端的 `#wuxing-status-modal` 與說明視窗共用 `formatSpiritRoots()`。
  ※ 土靈根舊標籤寫「防禦 +20%」，但遊戲沒有防禦屬性，實際是總體質 ×1.2，已更正為「體質 +20%」。
- **批次操作（×1 / ×10 / 最高）**：藏書閣、煉丹房、鍛造閣、宗門靈田的每個動作都有三顆按鈕（`.batch-btns`）。
  各功能先算出「目前資源與上限允許的最多次數」，再交給 `ui.js` 的 `resolveBatchCount(qty, 可執行次數, 動作名)`：
  - `'max'`：直接執行最多次數。
  - `×10` 不足 10 次時**不做部分執行**，跳提示並建議改按「最高」。
  - 一次結算、只寫一筆日誌，每日任務進度用 `addDailyProgress(type, n)` 一次加 n。
  - 各功能的上限：藏書閣受每本 100 次上限（第二階段屬性秘典每本 1000 次，且同時受武學積分／靈草／靈石限制）；煉丹房的魅力丹同時受仙品靈草與靈石限制；
    鍛造閣受靈石與**背包空位**（100 件）限制，連續開爐的日誌會統計品質與五行分布。
  - 配方集中在各檔案頂端：`herbRecipes`(field.js)、`pillRecipes`(alchemy.js)、`STUDY_*`(library.js)、`FORGE_COST`(config-equipment.js，每次 10,000 靈石)。

## 10. 活動系統（每日任務 / 千寶閣 / 待實作項目）

所有活動集中在**任務分頁**（手機洞府左側「任務」按鈕進入，2026-09-25 從世界分頁移過來，見第 31 節）的「活動」區 `#activity-list`，按鈕由 `activity.js` 的 `renderActivityList()` 依
`config-activities.js` 產生，並在 `updateUI()` 內每秒重繪，因此解鎖狀態會即時反映聲望與境界變化。

| 活動 | 聲望門檻 | 境界門檻 | 狀態 |
|---|---|---|---|
| 每日任務 | 1,000 | 無 | ✅ 已實作（每 4 小時刷新 10 項） |
| 千寶閣（拍賣場） | 5,000 | 無 | ✅ 已實作（每 3 小時刷新 5 件） |
| 秘境 | 5,000 | 煉虛 | ✅ 入口已開放（秘境列表＋鎮魔塔場景，第 43 節）；塔內玩法 ⏳ 敬請期待 |
| 獵殺邪修 | 8,000 | 金丹 | ✅ 已開放（2026-09-25）：懸賞榜每 4 小時刷新 6 名＋野外修士＋善惡值（第 27、36 節） |
| 域外天魔（世界BOSS） | 10,000 | 大乘 | ⏳ 已完成、暫不開放（`implemented: false`，開放改 true；第 75 節） |

- **解鎖判定**一律走 `getActivityLockReason()`，未達標會說明缺什麼；
  `implemented: false` 的活動即使達標也只顯示「敬請期待」。
  **新增活動時只要在 `config-activities.js` 加一筆**，按鈕與把關都會自動生效。
- **刷新機制**：兩者都用「下次刷新時間戳」判斷（`dailyRefreshAt` / `auctionRefreshAt`），
  開啟面板時呼叫 `refreshDailyQuestsIfDue()` / `refreshAuctionIfDue()`。
  時間戳存進存檔，所以關掉網頁再回來，倒數仍然正確（不是以「開啟次數」計算）。
- **時間軸保護（2026-09-28）**：存檔轉移到時鐘不同的裝置、或系統時間被調過時，下次刷新時間戳可能遠在未來（倒數出現幾百小時）。
  千寶閣、懸賞榜、每日任務的 `refresh*IfDue()` 開頭一律先呼叫 `ui.js` 的 `clampRefreshAt(at, 週期時數)`：
  超過「現在 + 一個週期」就壓回，非數字（壞存檔）視為 0 = 立即刷新。**新增有定時刷新的功能時也要套用。**
- **付費立即刷新（2026-09-28）**：千寶閣與懸賞榜（殺手殿堂）各有「🔄 立即刷新」按鈕，
  每次 10 萬靈石（`AUCTION_PAID_REFRESH_COST`／`BOUNTY_PAID_REFRESH_COST`）、每日各 5 次（`*_PAID_REFRESH_DAILY`，兩邊分開計）。
  - 共用函式在 `activity.js`：`getPaidRefreshState`/`getPaidRefreshLeft`/`payForRefresh`/`renderPaidRefreshButton`；
    次數存 `player.paidRefresh = { date, auction, bounty }`，以**當地日期字串**（`toDateString`）換日，不用時間戳，存檔轉移不會錯亂。
  - 2026-10-04 版本 `20261005X`（使用者回報「千寶閣跟獵殺邪修榜無法刷新」）：混淆版上線後按鈕的 `paidRefreshAuction`／`paidRefreshBounty` 沒掛回 window（函式名以字串傳給 `renderPaidRefreshButton`，第 72 節，版本 `20261005W` 起修好）；
    `payForRefresh`、`paidRefreshAuction`、`paidRefreshBounty` 的提示改 `gameAlert`，懸賞榜「追蹤中的懸賞會取消」改 `await gameConfirm`（`paidRefreshBounty` 改 async；LINE 等 App 內建瀏覽器的原生 confirm 直接回 false，等於永遠取消刷新）。
  - `paidRefreshAuction()`（auction.js）：搶拍視窗開著時不能刷新（看 `#auction-bid-modal` 是否顯示；
    ⚠️ 不能用 `auctionBidItemId` 判斷，它在搶拍結束後不會清空——2026-09-28 曾因此造成「搶拍過一次後永遠無法付費刷新」）。`paidRefreshBounty()`（bounty.js）：對決中不能刷新；追蹤中的懸賞會先 `confirm`，刷新後取消。
  - 付費刷新**不改變定時刷新的時間軸**：刷新前記下 `*RefreshAt`，刷新後還原（下次定時刷新照舊）。
- **每日任務進度**：任務池剛好 10 項且每次全用上，各自隨機難度（普通/困難/艱鉅）。
  進度靠各功能呼叫 `addDailyProgress(type, n)` 累加，目前已接上的埋點：
  `kill`(combat.js 擊殺)、`sectQuest`(combat.js 玩家任務 + servant.js 僕從任務)、
  `potion`(bag.js 手動服用 + combat.js 自動補給)、`forge`(equipment.js)、`plant`(field.js)、
  `study`(library.js)、`craft`(alchemy.js)、`rescue`(combat.js)、`buy`(shop.js)、
  `breakthrough`(leveling.js 小境界升階)。
  **新增任務類型時，務必到對應功能補上 `addDailyProgress()`，否則進度永遠是 0。**
- **千寶閣商品**：每個欄位由 `rollAuctionItem()` 先依 `auctionLifePills` 判定是否上架壽元丹，
  沒抽中才交給 `rollAuctionEquip()` 依 `auctionQualityOdds` 抽裝備品質；
  神器不在拍賣場流通（沿用 `NON_FORGEABLE_SLOTS`），套裝部件也不賣（拍賣清單本來就沒有，程式另有防呆重抽）。
- **千寶閣裝備等級**（2026-09-27）：「當前檔」= `EQUIP_LEVELS` 中不超過人物等級的最高檔（最低 10）；70% 賣當前檔、`AUCTION_GEAR_PREV_TIER_CHANCE`(30%) 賣前一檔。
  四維改與鍛造／奪寶同公式 `等級 × EQUIP_LEVEL_STAT_MULT(5) × 品質倍率`（拍賣屬外界管道再 ×1.15），裝備帶 `level`（卡片顯示 Lv.，穿戴需人物等級 ≥ 裝備等級）。
  原本四維只看境界 `(境界+1) × 10 × 品質倍率`、沒有等級，中期以後比同時期掉落弱約 35 倍。售價公式不變：`800 × 品質倍率 × (境界+1)`。
  實測 Lv.520：4000 件中 Lv.500 70%／Lv.400 30%。
- **低等白金**（2026-09-27）：每個裝備欄位 `AUCTION_PLATINUM_CHANCE`(5%) 改賣白金（先天道器），等級 = 當前檔往下 `AUCTION_PLATINUM_TIERS_BELOW`(2) 檔（Lv.520 → Lv.300），
  固定 `AUCTION_PLATINUM_PRICE` 1 億靈石、不會被搶拍（`AUCTION_RIVAL_CHANCE` 沒有白金）；比照橙裝進化而來的白金也有 1～3 孔。卡片有「✨ 千寶閣鎮閣之寶」標示與白色光暈。
- **天磯錄**：千寶閣商品上架時**不再**記入收藏（`createGearEquip` 第 5 個參數 `noRecord`），買下時 `completeAuctionPurchase` 才 `recordGearCollected`＋`checkTitleUnlocks`。
  原本上架就算收藏（刷新千寶閣就能刷收藏），開賣白金後會影響白金收藏稱號，一併修正。
- **壽元丹**（`config-daily-quests.js` 的 `auctionLifePills`）：商品物件帶 `kind: "lifePill"`，
  需**同時**支付靈石與聲望，標下後立即服用增加壽元（不進背包）。舊存檔的裝備商品沒有 `kind`，一律當裝備處理。

  | 壽元丹 | 品質 | 續命 | 每欄上架機率 | 靈石 | 聲望 |
  |---|---|---|---|---|---|
  | 普通壽元丹 | 白色 | +10 年 | 10% | 100,000 | 50 |
  | 一紋壽元丹 | 綠色 | +20 年 | 8% | 200,000 | 50 |
  | 二紋壽元丹 | 藍色 | +30 年 | 5% | 500,000 | 50 |
  | 三紋壽元丹 | 紫色 | +50 年 | 3% | 1,000,000 | 50 |
  | 四紋壽元丹 | 橙色 | +100 年 | 1% | 10,000,000 | 200 |

  （2026-09-25 調價：靈石大幅提高、聲望大幅降低。價格在上架時寫進商品的 `price`/`repPrice`，**已上架的舊商品維持舊價，下次刷新才套用新價**。）

  合計每欄 27% 為壽元丹；沒抽中時再以 5% 上架星允鐵袋（約 3.7%），其餘約 69% 為裝備（2026-09-26 起從「拍賣」清單抽，見第 37 節）。

- **搶拍**（2026-09-25，`auction.js`，設定在 `config-daily-quests.js`）：紫色／橙色的商品（裝備或壽元丹）第一次按「標下」時，
  依 `AUCTION_RIVAL_CHANCE`（紫 30%、橙 50%）擲一次是否有其他客人競拍。結果存進商品 `item.rival = { name, max, out }`（沒有對手則為 `null`），
  **重新整理、關閉視窗都不會重擲**（無法用重開來躲對手）。
  - 有對手時，對手先出價「底價 +10%」，開啟 `#auction-bid-modal`；競價紀錄存在 `item.bid = { current, leader, history }`。
  - 玩家按「加價 10%／30%」（`raiseAuctionBid(step)`，以**底價**為基準計算加價幅度），出價前會檢查付不付得起。
    對手的隱藏心理價位 `max` = 底價 × 1.1～2.0（`AUCTION_RIVAL_MAX_MULT_MIN/MAX`）：跟價後仍在心理價位內就跟（固定 +10%），否則退出，玩家以最後出價得標（`completeAuctionPurchase`）。
  - 「放棄」（`giveUpAuctionBid`）：商品標記 `sold` 並記錄 `soldTo`，卡片顯示「已被 X 標走」。「暫時離開」只關視窗，卡片會顯示「⚔️ 競拍中」，可再按「繼續競拍」。
  - 壽元丹的**聲望價格不隨競價增加**，只有靈石會被抬高。白／綠／藍品質沒有搶拍。

## 11. 遊戲主頁（標題畫面）

- 畫面結構在 `index.html` 的 `#title-screen`，樣式集中在 `<style>` 內同名的區塊，邏輯在 `data/title-screen.js`。
- **滿版呈現**：封面 `#title-art` 使用 `position: absolute; inset: 0` + `object-fit: cover`，
  一定填滿整個視窗，不會有任何未覆蓋區域。
- **橫式／直式兩張封面**：用 `<picture>` + `media="(max-aspect-ratio: 3/4)"` 自動切換，
  直式螢幕（手機）載入 `images/cover-portrait.jpg`，其餘載入 `images/cover.jpg`。
  直式版的構圖原則（重製時請遵守）：
  **人物與場景一律 1:1 原比例貼上，絕不垂直拉伸**（拉伸會產生明顯的模糊色帶，很難看）。
  作法是把原圖裁成 960 寬（保留人物＋標題＋光環）後原尺寸貼在下半部，
  上方天空改用漸層色（由深藍過渡到原圖天空色），再從原圖裁出飛禽靈獸等比縮放、
  橢圓羽化後貼上點綴，愈高處愈淡以模擬空氣遠近感；底部僅做一小段漸層收進遊戲底色。
  ※ 裁切素材時務必避開標題文字與光環所在區域，否則天空會出現文字殘影。
  產生腳本保留在對話紀錄中（使用 .NET System.Drawing），重製時可依上述規則重寫。
- **唯一進入點**：畫面中央光環上的透明按鈕 `#title-hotspot`，除此之外沒有其他按鈕（文字只有下方的版本名與創作者）。
- **熱區如何對準光環**：因為 `cover` 會裁切，無法用固定百分比對齊，
  改由 `positionTitleHotspot()` 依 cover 縮放公式即時計算：
  `scale = max(容器寬/圖片寬, 容器高/圖片高)`，再加上置中裁切的位移量，
  把「該圖原始座標」換算成螢幕像素。兩張圖各有一組座標：

  | 圖片 | 尺寸 | 光環座標 (x, y, w, h) |
  |---|---|---|
  | `cover.jpg` | 1264 × 843 | 652, 527, 330, 290 |
  | `cover-portrait.jpg` | 960 × 1920 | 632, 1427, 330, 290 |

  `currentTitleHotspot()` 依 `img.currentSrc` 判斷目前載入哪張圖來選用對應座標；
  `positionTitleHotspot()` 會在圖片 `load`、`resize`、`orientationchange` 時重算
  （`<picture>` 切換來源時也會觸發 `load`，所以跨斷點縮放會自動校正）。
  ※ 若日後更換封面圖，只需重新量測光環座標並改 `TITLE_HOTSPOTS`，其餘不必動。
- **版本名與創作者**（2026-10-04，版本 `20261005AI`，使用者指定）：標題「凡塵修仙傳」下方 `#title-version`「版本：飛昇靈界」（金色）、光環下方 `#title-credit`「創作者：銀河領主-羅峰」（白字黑影）。
  **2026-10-05（版本 `20261005CA`，使用者：「封面的版本改成三界之戰」）**：`#title-version` 改「版本：三界之戰」。
  位置與字級寫在 title-screen.js 的 `TITLE_TEXTS`（圖片原始座標＋字級圖片像素），`positionTitleHotspot()` 用同一套 cover 換算；字級最小 12px。換版本名改 index.html 的文字即可。
- **啟動時機**：`window.onload` 只呼叫 `initTitleScreen()`，**不會**直接開始遊戲。
  讀檔、性別選擇、離線收益結算全部延後到玩家點擊後才執行（`main.js` 的 `startGame()`）。
- **第一次進入（沒有存檔）**：顯示 `#gender-modal` 性別選擇視窗（男修／女修，含頭像與預設道號），
  **沒有關閉按鈕**，必須選一個才會 `initGame()` 開始遊戲；選完立即存檔，之後進入不會再問。
  以前用 `prompt()` 讓玩家輸入 1/2，按取消或瀏覽器擋掉對話框都會直接變成男性，因此改成視窗。
  頭像與預設道號來自 `ui.js` 的 `PLAYER_AVATARS`。`gameStarted` 旗標防止連點重複啟動主迴圈。
- `<body>` 出廠時就帶著 `class="title-mode"`（CSS 會隱藏 `#game-container` 並鎖住捲動），
  避免遊戲畫面在 JS 執行前閃一下；`enterWorld()` 會移除這個 class。
- `worldEntered` 旗標確保只會觸發一次（避免重複建立 `setInterval`）。

## 12. 門派任務與僕從派遣

任務的**名稱、圖示、獎勵**全部集中在 `config-quests.js` 的 `questData`（以宗門等級 1/2/3 分層）。
任務面板顯示的獎勵與實際發放的獎勵讀取同一份資料，**改數值只需要改這一個檔案**。

| 角色 | 執行條件 | 進度速度 | 結算位置 |
|---|---|---|---|
| 玩家本人 | 必須待在「宗門」（`isInSect()`），離開即自動中斷 | 每秒 `QUEST_PROGRESS_PER_TICK`(1.5) | `combat.js` 的 `combatTick()` |
| 每位僕從 | 在「僕從小屋」各自指派任務，**不受玩家所在地點限制**；每趟依品質付靈石 | 每秒 `1.5 × 該僕從的 mult`（固定耗時任務不乘） | `servant.js` 的 `tickServantQuests()` |

- 僕從資料結構：`{ id, name, quality, mult, quest, timer }`；`quest` 是任務代號（或 `null` 表示閒置），
  `timer` 是該僕從自己的進度，因此多名僕從可同時跑**不同**任務、互不干擾。
- 同時派遣上限為 `MAX_ASSIGNED_SERVANTS`(10，2026-09-24 由 3 調高)；僅在「從閒置變成接任務」時檢查，單純更換任務不受限。
- 完成一次任務所需時間 = `QUEST_REQUIRED_PROGRESS / QUEST_PROGRESS_PER_TICK` = 20 秒（僕從再除以效率 `mult`）
  （舊版 UI 寫「基礎30秒」是錯的，實際是 20 秒；現在由程式自動算出顯示）。
  有 `duration` 的任務為**固定秒數、不受僕從效率影響**（`getQuestRequiredProgress()`/`getQuestSpeed()`）。
- **任務獎勵（只給道具）**：宗門任務不給靈石，唯一例外是初級宗門「打掃清潔」給 50 靈石。

  | 任務 | 初級 | 中級 | 高級 |
  |---|---|---|---|
  | 打掃／餵養 | 50 靈石 | 10 獸丹 | 50 獸丹 |
  | 種植靈草 | 1 靈草 | 10 靈草 | 50 靈草 |
  | 整理武學秘典 | 1 武學積分 | 10 武學積分 | 50 武學積分 |
  | ⛏️ 礦脈採礦 | — | 1~30 礦石 | 1~30 礦石 |

- **礦脈採礦**（`questData.mine`）：只有中級、高級宗門有；`requiredQuality: "傳說"` → **只有傳說僕從能接**，
  玩家本人不能親自執行（任務面板按鈕顯示「僅限傳說僕從」），其他品質僕從的選單不會出現此任務；
  `duration: 60` 固定 60 秒一趟；每趟隨機 1~30 礦石（`player.ore`，角色資源列顯示）。礦石用於符寶坊煉製符寶（第 28 節）。
  換到沒有此任務的宗門（或品質不符）時，`tickServantQuests()` 會讓僕從自動回到閒置；玩家的 `activeQuest` 同理由 `combatTick()` 中止。
- **派遣花費**（`config-servants.js` 的 `SERVANT_TRIP_COST`）：每趟任務**開始時**依僕從品質扣靈石——
  一般（白）50／優秀（綠）100／稀有（藍）150／史詩（紫）200（需求未指定，暫定）／傳說（橙）300。
  指派（或換任務）時先付第一趟，付不起就無法指派；每趟完成後自動付下一趟，付不起則該僕從停工回到閒置並寫日誌。
  玩家親自執行不需付費。
- 新增任務只要在 `questData` 加一筆；獎勵值可寫 `[最小, 最大]` 表示隨機，`grantQuestRewards()` 會回傳實際獲得的文字供日誌使用。
- **🐫 商隊跑商**（2026-09-29，第 61 節）：定義在 `config-economy.js`（載入時加進 `questData.caravan`），三個宗門等級都有；`servantOnly: true` → 玩家本人不能接、任務面板顯示「僅限僕從」；
  固定 2 小時；獎勵 key `caravan` 由 `grantQuestRewards(def, servant)` 交給 `economy.js` 的 `grantCaravanReward(servant)`（依境界與僕從品質）。
  **每日合計 4 趟**：`payServantTrip(servant, questId)` 出發時檢查並計入 `player.caravanDaily`，跑完就停工，日誌寫 `servantTripFailText()`（「今日商隊 4 趟已跑完」）。
- **舊存檔相容**：早期版本使用「單一 `activeQuest` + `assignedServantIds` 共同加速」，
  `save.js` 的 `migrateServantAssignments()` 會在讀檔/匯入時把舊結構轉成每位僕從自帶 `quest`/`timer`，
  並移除 `assignedServantIds`。

## 13. 宗門技能（分階段學習、永久保留）

> ⚠️ 2026-10-06 起宗門武學併入武學密典、要放進技能格才會施放（第 35 節「宗門武學併入武學密典」）。

- 宗門分三個階段，對應 `sectData` 每個分類的 `tier`：凡俗 1（初級）/ 修真 2（中級）/ 至高 3（高級）。
- **拜入地點**（2026-10-04 起）：第一、二段在人界的「尋訪仙門」；第三段「至高聖地」只能在靈界天元城（宮殿熱點或「宗門設施」）拜入或回歸（`isSectTierHere`，第 74 節）。
- 2026-09-27 起每個階段 6 個宗門（新增逍遙派、天音閣、天籟仙宮），每個宗門傳承一種武器（weapon），主修相同職業時有傳承加成（第 53 節）。
- **每個階段只能拜入一個宗門**：`player.sectSkills = { 1, 2, 3 }` 記錄各階段選定的宗門名稱，
  第一次加入時會跳確認並鎖定；之後同階段的其他宗門按鈕會被停用。
- **境界只擋下限，不擋上限**：新拜入時只檢查 `player.realmIndex >= cat.minRealm`，
  **超過 `maxRealm` 仍可補拜入該階段尚未選擇的宗門**（例：金丹前沒加入任何宗門，金丹後仍可回頭挑一個初級宗門，
  否則該階段的 2 招技能就永遠拿不到了）。`cat.maxRealm` 現在只是分類說明用，不再封鎖加入。
  拜入後一律鎖定，**無法退出、也無法改投同階段的其他宗門**。
- **已選定的宗門永遠可以回歸**（`sect.js` 的 `joinSect()`）：**境界檢查只套用在「新拜入」**。
  ⚠️ 舊版把境界檢查寫在最前面，導致境界一旦超過該階段的 `maxRealm`（例：凡俗宗門 `maxRealm: 3`），
  連按自己的宗門都會跳「境界不符合」，晉升並拜入下一階段後就再也回不去舊宗門（玩家回報「加入宗門後就離開宗門了」即此）。
  現在判定順序是：**是不是自己已選定的宗門 → 該階段是否已選別家 → 境界是否達 `minRealm` → 確認並鎖定**。
  宗門列表的按鈕也照這個順序顯示「當前宗門／回歸宗門／此階段已選定【X】／境界不符」，並在頂端列出各階段已選宗門與目前所屬。
- 切換所屬宗門**只改變經驗/戰力倍率與設施歸屬，技能不會消失**，所以可以視情況在已選定的宗門之間來回切換。
- **技能永久保留**：戰鬥用的技能由 `stats.js` 的 `getAllSkills()` 依 `sectSkills` 組合（初級→高級）
  再加上靈寶閣的 `learnedSkills`，**不再讀 `player.sect.skills`**。因此換到下一階段宗門時，舊技能仍在，
  最終可同時擁有 3 個門派共 6 招技能。`player.sect` 只決定目前的經驗/戰力倍率與設施權限。
  ※「永久」指同一世內；**轉世輪迴會清空 `sect` 與 `sectSkills`**，下一世可重新選擇各階段宗門（第 25 節）。
- **傷害公式**：技能傷害 = 對應攻擊力 × `mult`，`mult = 1 + SECT_SKILL_BONUS[tier]`
  （初級 150% / 中級 200% / 高級 300%）。`dmgType: "phys"` 用物理攻擊（受**力量**影響），
  `"mag"` 用法術攻擊（受**悟性**影響）。每個宗門各有 1 招力量型、1 招悟性型；全部都是傷害技（單體或群體）。
  **傷害若過高，只需調整 `config-sects.js` 的 `SECT_SKILL_BONUS`**，所有宗門技能會一起生效。
- **數值依據**：+50/100/200% 是在「渡劫仍由戰鬥決定」時，依模擬選出的第一次渡劫約 65% 的數值
  （+10/20/50% 只有 14～18%）。渡劫改成勝算擲骰後（第 7 節），技能倍率只影響野外戰鬥：
  技能觸發率 40%，單體平均輸出比普攻高約 20%／40%／80%，不會出現異常爆量。
- `mult`/`tier` 是在 `config-sects.js` 尾端用迴圈補上的，新增宗門技能時不要手寫 `mult`。
- **耗魔（`mpCost`）已全面調為原本的 3 倍**（宗門技能與靈寶閣武學皆然）：
  初級宗門 45～90、中級 105～150、高級 180～300；靈寶閣武學初級 90～120、中級 180、高級 300～360。
  宗門技能每次都從 `sectData` 讀取，改 `config-sects.js` 即時生效；靈寶閣武學見第 18 節的同步說明。
  靈力不足時該回合自動改為普通攻擊（`combat.js` 的 `playerAttackTurn()`）。
- 舊存檔的 `player.sect` 是整包存進去的舊物件（含舊技能），`migrateProgressionFields()` 會用
  `findSectByName()` 改指向最新設定，並把該宗門登記進 `sectSkills` 對應階段。
- ⚠️ 靈寶閣禁術不受上述倍率限制：《大羅天經》群體 ×5.0、《神魔九變》攻擊 ×4.0 持續 3 回合，
  遠高於宗門高級技能的 ×1.5，若要全面控制傷害需另外調整 `config-lingbao.js`。

## 14. 人物等級

- 與境界是**兩條獨立的成長線**：`player.level`（1～`MAX_PLAYER_LEVEL` 10000）與 `player.levelExp`。
  `gainExp()` 算出最終經驗（含宗門與靈寵倍率）後，會同時餵給 `gainLevelExp()` 與 `gainBeastExp()`，
  **待渡劫時境界修為暫停，但人物等級與靈寵等級仍繼續成長**。
- 每升 1 級：力量/體質/悟性/靈力各 +1（直接加進 `player.stats`），
  生命上限 +10、靈力上限 +5（在 `getMaxHp()`/`getMaxMp()` 以 `(level-1) × 10 / × 5` 計算，不寫入 stats）。
  ※ 體質/靈力 +1 本身也會讓生命 +10 / 靈力 +10，所以實際每級是生命 +20、靈力 +15。
- 升級不會補滿氣血（避免戰鬥中連續升級變相無敵）。
- 經驗曲線（`config-level.js` 的 `LEVEL_EXP_SEGMENTS`）：每級所需 = 係數 × 等級^1.5

  | 等級區間 | 係數 | 累積到區間末的總經驗 |
  |---|---|---|
  | Lv1～99 | 100 | 約 400 萬（Lv100） |
  | Lv100～999 | 300 | 約 38 億（Lv1000） |
  | Lv1000～4999 | 1000 | 約 6,980 億（Lv5000） |
  | Lv5000～10000 | 3000 | 約 10.6 兆（Lv10000） |

  以擊殺經驗估算：天南（每殺約 4,500）約可練到 Lv100 附近；禁區可推到數千級；
  Lv10000 需在最高戰場（每殺約 500 萬）長期掛機。
- 等級與壽元、戰力無掛鉤（戰力不影響壽元）。轉世輪迴會把人物等級**重置為 Lv1**（見第 25 節）。
- **天賦點**（2026-10-03，第 68 節）：Lv.1～100 每 10 級 1 點、100～1000 每 50 級、1000～10000 每 250 級（滿級 64 點）。
- **境界等級上限**（2026-09-27 使用者同意，**只在新制 `NUMERIC_V2` 生效**，第 52 節；舊制每級加四維，現在上線會削弱線上玩家）：
  `config-level.js` 的 `LEVEL_CAP_BY_REALM`：凡人 50、煉氣 70、築基 100、金丹 150、元嬰 200、化神 300、煉虛 500、合體 700、大乘 1000、渡劫 1500、
  仙人初境 2500、天仙 3500、真仙 5000、大羅金仙 6500、混元大羅金仙 8000、混沌道祖 10000（依原本經驗曲線的自然進度訂，裝備等級 10～1000 在大乘以前對上境界）。
  - `leveling.js`：`gainLevelExp` 加經驗後交給 `processLevelUps()` 連升到 `getLevelCap()` 為止；到頂時 `levelExp` 最多存到「升到下一境界上限」所需的量（`getLevelBankLimit`，有快取），並記一則「🔒 已達上限」日誌。
  - `advanceRealm()` 突破後呼叫 `processLevelUps()`，存著的經驗自動補升（突破日誌附「人物等級上限提高到 Lv.N」）。
  - 已超過上限的老玩家等級不降，只是在境界追上前不再升級、也不存經驗。人物面板顯示「Lv.20 (5.6%)／上限 50」，到頂顯示「已達凡人上限，突破後再升」（ui.js）。
  - 實測（本機）：凡人灌 10 億經驗 → Lv.50、存 92 萬；突破煉氣 → 補升到 Lv.70；金丹 Lv.900 不變；開關關閉時照舊升到 Lv.588。

## 15. 壽元

- `player.lifespan`（年），數值表在 `config-lifespan.js` 的 `lifespanByRealm`（索引對應 `realms`）。
  凡人初始 60 年；`advanceRealm()` 晉升時呼叫 `gainRealmLifespan()` 加上該境界的 `gain`
  （包含築基以前不需渡劫的自動突破）。
- 壽元會因兩件事減少：**歲月流逝**（有底線，見下方）與**死亡**。與戰力無關。
  死亡點：`combat.js` 野外戰死、`tribulation.js` 渡劫失敗，皆呼叫 `handlePlayerDeath()`：依**當前境界**的 `deathCost` 折壽，並讓所有靈寵陣亡。
- **歲月流逝（方案一＋三混合）**：`combatTick()` 每秒呼叫 `ageLifespan(1)`；離線結算呼叫 `ageLifespan(離線秒數, LIFESPAN_OFFLINE_RATE)`。
  - 每分鐘流逝 = 目前境界的 `gain` ÷（`getAgingHours()` × 60）× 所在地倍率。
    `getAgingHours(境界)` = max(`LIFESPAN_MIN_AGING_HOURS` 6, 修煉時數 × `LIFESPAN_PACE_MULT` 5 × 主要地圖的所在地倍率)，
    修煉時數與主要地圖取自 `config-realms.js` 的 `realmPacing`（第 26 節）。
    → **在該境界的主要地圖掛機，一個境界給的壽元約可撐「修滿該境界所需時間」的 5 倍**；前期（凡人）至少維持安全區 6 小時。
    改修煉時數時壽元會自動跟著對齊，不需另外調整。
    **指定倍數**（2026-10-05，版本 `20261005BV`，使用者指定）：`LIFESPAN_TARGET_RATIO = { 9: 19, 10: 20, 13: 25, 14: 28, 15: 30 }`＝渡劫 19、仙人初境 20、大羅金仙 25、混元大羅金仙 28、混沌道祖 30 倍——
    「從凡人累積到該境界的壽元（扣底線）在主要地圖可撐修煉時數的幾倍」。倍數 ＝ 撐時倍率 ×（累積壽元 − 底線）÷ 本境界壽元（與修煉時數無關），`getAgingHours` 反推撐時倍率取代 5
    （渡劫 5.52、仙人初境 5.59、大羅金仙 11.4、混元 15.0、道祖 15.5）。只改流逝速度，壽元增加量與死亡折壽不變。其他境界維持 5（約 7.6～24 倍）。
  - 所在地倍率 `LIFESPAN_DANGER_MULT`：安全區 ×1、野外 ×1.5、開放世界 ×2、上古禁區 ×3、幽冥禁域 ×3、至高戰場 ×4（索引 0～5）；渡劫中 ×4。離線 ×0.5（倍率依離線時所在地）。

    | 境界 | 主要地圖 | 修滿約需 | 壽元在主要地圖可撐 | 底線 |
    |---|---|---|---|---|
    | 凡人 | 靈山大川 | 0.5 時 | 4 時（下限 6 時×安全區） | 3 年 |
    | 金丹 | 上古遺跡 | 3 時 | 15 時 | 15 年 |
    | 化神 | 亂星海 | 10 時 | 50 時 | 15 年 |
    | 渡劫 | 鬼谷八荒 | 30 天 | 150 天 | 30 年 |
    | 大羅金仙 | 仙界戰場 | 200 天 | 1,000 天 | 150 年 |

  - 後期流逝很慢（每分鐘不到 0.1 年），`#lifespan-rate` 會自動改以「年/時」顯示。
- **年齡（當前壽命）**：`player.age`，新角色與轉世後從 `LIFESPAN_START_AGE`(16) 歲起算，`ageLifespan()` 依**實際流逝的年數**同步增加，
  `handlePlayerDeath()` 的死亡折壽也同樣加進年齡（重傷折壽 = 老了 N 歲）。
  因此恆成立：**年齡 = 16 + 累計損失的壽元（流逝＋折壽）**；觸底歲月停止時年齡也停住，突破境界或壽元丹增加壽元不影響年齡。舊存檔沒有此欄位，由 `DEFAULT_PLAYER_JSON` 補 16 歲。
  頂部狀態列在剩餘壽元前顯示「當前壽命：X 歲」（`#age-display`）。
  - **底線** `getLifespanFloor()` = 目前境界 `deathCost × LIFESPAN_FLOOR_DEATHS(3)`：剩餘壽元觸底後自然流逝**完全停止**（線上、離線都一樣）。
    **時間永遠不會直接害死玩家**，只有死亡會；但觸底後再死 3 次就身死道消，形成「越接近底線越不敢冒險」的緊張感。
  - 提示（`checkLifespanWarnings()`，各只出現一次，壽元回升後重置）：剩餘 ≤ 底線×2 時「壽元日漸枯竭」；觸底時「壽元將盡，再死亡 3 次便身死道消」。
  - 壽元可能帶小數，所有顯示一律經 `formatLifespan()` 取整數。
  - 恢復方式：突破境界（加上新境界的 `gain`，底線也會跟著新境界調整）或千寶閣壽元丹。
  - ⚠️ 平衡注意：壽元丹是固定年數（+10～+100 年），後期境界的 `gain` 以萬年計，效果相對有限。
    若後期玩家常卡在底線，可考慮讓壽元丹改為「目前境界 gain 的百分比」。
- **壽元歸零 → `triggerLifespanGameOver()`**：設 `gameOver = true`（`combatTick()` 停止、`saveLocal()` 不再寫入）、
  刪除 `localStorage` 存檔、跳出提示後重新整理，回到標題畫面以新角色開始。
- 需求表的「仙王／仙帝」在遊戲中不存在，對應方式：大羅金仙＝仙王（+20000 / -50）、混元大羅金仙＝仙帝（+50000 / -100）；
  需求表沒有的境界補值：仙人初境 +4000 / -15、天仙 +4500 / -15、混沌道祖 +100000 / -200。
- 轉世輪迴時壽元重設為凡人的 60 年。舊存檔沒有壽元欄位時，依目前境界補上累積值（`getInitialLifespanForRealm()`）。
- 頂部狀態列 `#lifespan-display` 顯示剩餘壽元（綠 → 剩餘 ≤ 底線×2 轉黃 → 觸底轉紅），
  旁邊的 `#lifespan-rate` 顯示目前流逝速度（例「⌛-2.1年/分」，在野外轉橘色；觸底顯示「（歲月已止）」）；
  滑鼠移上去顯示本境界的折壽量與底線。

## 16. 靈寵（靈獸園）

- 兌換費用（`config-beasts.js`，靈石仍套用魅力折扣）：靈幻狐 1000 獸丹 + 10000 靈石、
  青蒼狼 3000 + 30000、九幽蛟龍 5000 + 50000。被動加成（經驗/戰力）只在靈寵**出戰中**（存活且未召回休息）時生效（`hasLiveBeast()` → `isBeastActive()`）。
- 資料結構：`player.beasts = [{ id, level, exp, alive, active, upkeepTimer, skills }]`，`skills` 為 6 格、存放已選的五行屬性（或 `null`）。
  舊存檔的字串陣列（`['fox', ...]`）由 `migrateProgressionFields()` 轉成 Lv1 靈寵；缺 `active`/`upkeepTimer` 的補成出戰中、計時 0。
- **維持費（出戰／休息）**：每隻出戰中的靈寵各自計時（`b.upkeepTimer`，隨存檔保存），每滿 `BEAST_UPKEEP_INTERVAL`(600 秒＝10 分鐘；2026-09-24 由 60 秒調整) 扣一次，
  費用依**該靈寵的等級**查 `beastUpkeepTiers`：

  | 靈寵等級 | 每 600 秒 |
  |---|---|
  | Lv1～99 | 2,000 靈石＋50 獸丹 |
  | Lv100～299 | 5,000 靈石＋100 獸丹 |
  | Lv300～499 | 20,000 靈石＋150 獸丹 |
  | Lv500 以上 | 50,000 靈石＋200 獸丹 |

  - 線上：`combat.js` 的 `combatTick()` 每秒呼叫 `tickBeastUpkeep()`（在渡劫接管之前，所以渡劫中也計費）。
    付不起（靈石或獸丹任一不足）→ `restBeastForUpkeep()` 自動召回休息並寫日誌，不會部分扣款。
  - 離線／背景補發：`settleIdleSeconds()` 結尾呼叫 `settleOfflineBeastUpkeep(秒數)`，在離線靈石入帳後逐次扣，付不起就從那一刻召回；
    離線經驗加成以離線**開始時**的出戰狀態計算（簡化）。
  - 靈獸園可手動「召回休息／出戰」（`toggleBeastActive()`）；休息中不收費、不給被動、不出手、不累積經驗。
    計時存在靈寵身上，召回只是暫停，再出戰時接續，**反覆切換無法躲費用**。出戰前會檢查付得起一次費用。
  - 陣亡的靈寵不計費；復活後維持原本的出戰／休息狀態。
- **等級**：兌換後一律 Lv1；與人物共用經驗（`gainBeastExp()`，同一條經驗曲線），
  **等級不可超過人物等級**，到達上限後經驗不再累積。
- **技能（2026-09-29 全面改版，版本 `20261002h`；使用者要求「控制、攻擊、增益、補血、解除負面效果各 10 招，舊技能廢除，改抽屜式點選，不再四選一」）**：
  - Lv30 / 60 / 100 / 300 / 500 / 1000（`BEAST_SKILL_LEVELS`）各開放一個技能欄；每一欄可從 **5 類 × 10 招＝50 招**（`config-beasts.js` 的 `beastSkills`）任選一招，
    **同一隻靈寵不能重複**，招式有 `minLv`（靈寵等級不足時鎖住）。`b.skills[欄] = 技能 id`（`beastSkillById`）。
  - 選單（`beast.js` 的 `renderBeastSkillSlots`）：空欄按「📖 選擇技能」→ 下方展開 5 個 `<details>` 抽屜（控制／攻擊／增益／治療／淨化，顯示「可選 N / 10」），點一招 → `learnBeastSkill(id, 欄, 技能id)` 確認後領悟。
    打開選單時那張靈寵卡片改為佔滿整列（手機兩欄版面太窄）。選定後不能單獨改，但可「🔄 重新領悟全部技能」（`resetBeastSkills`，`BEAST_SKILL_RESET_CORE` 2000 獸丹）。
  - **舊存檔**：`save.js` 讀檔時發現技能欄是舊版五行字串（金木水火土）→ 清空並標 `b.skillsRevamped`，靈獸園顯示「技能已改版，請重新選擇」（免費），選了第一招後提示消失。

  | 類別 | 作用對象 | 內容（Lv30 → Lv1000） |
  |---|---|---|
  | 🌀 控制 | 敵人（`t.petCc`） | 凍結 1～2 回合（含全體）、封印武學 2～3 回合、攻擊 −15%～−35%、破綻（受傷 +20%～+25%）；同一敵人被靈寵凍結後，解凍後 `BEAST_FREEZE_COOLDOWN`(2) 回合內凍不住，避免多隻靈寵連鎖定死 |
  | ⚔️ 攻擊 | 敵人 | 物攻 30%～120%，附加群體、燒傷、中毒、斬殺（氣血 < 30% ×2）、吸血、餘波 |
  | ✨ 增益 | 主人 | 10 種不同能力：攻擊 ×、受傷減少、減傷、閃避、暴擊率、連擊率、命中、吸血、破甲，萬獸之王一次給三種 |
  | 💧 治療 | 主人 | 立即回血 6%～35%、回靈、持續回血／回靈；護主心切在主人氣血 < 40% 時改回 22% |
  | 🌸 淨化 | 主人 | 解除中毒、燒傷、凍結、封印、化功、破甲（懸賞對決的負面效果也算），高階可持續淨化 3 回合 |

- **戰鬥**：靈寵沒有氣血，不會被攻擊。**所有出戰中的靈寵**每回合各以 `BEAST_SKILL_CHANCE`(30%) 機率出手（`petAssistTick()`，野外、懸賞對決、渡劫都會觸發）。
  出哪一招由 `pickBeastSkill` 依戰況挑：主人氣血 < 50% 優先治療、身上有可解的負面狀態優先淨化；其餘隨機（治療只在未滿血／靈力不足時、淨化只在有狀態時才列入）。
  - **增益可以疊加**：不同種類各自存在（例如一隻加攻擊、一隻加閃避，兩個同時生效），同種類才取較高值、持續取較長。
    攻擊沿用 `petBuff*`（`getPhysAttack()`／`getMagAttack()`）、受傷減少沿用 `petShield*`（仙法守護、神器共用，`applyPetDamageReduction()`）、持續回血沿用 `petRegen*`；
    其餘存在 `state.js` 的 `petFx = { 種類: { v, t } }`，讀取用 `petFxVal(種類)`：減傷／閃避／暴擊／命中／破甲在 `getPlayerCombatAttrs()`（減傷閃避一起套上限），
    連擊率與吸血在 `combat.js` 的 `playerAttackTurn`，每回合回靈在 `petAssistTick`。戰力榜的戰力不含這些暫時增益。
  - **控制的掛點**：凍結用敵人自己的 `status.frozen`；削弱 `petEnemyAtkMult(t)`（野外妖獸出手、`bountyDuelTick`、`tribulationTick`）；
    封印 `petIsSilenced(t)`（懸賞對手、心魔不能施展武學／魔功，野外妖獸本來就沒有武學）；破綻 `petVulnMult(t)`（`hitTarget` 與靈寵攻擊）。
  - **持續淨化**：`petPreTurn()` 在野外、懸賞、渡劫每回合主人行動前呼叫，清掉 `petFx.immune.v` 內的狀態。
  - 驗證（本機）：50 招逐一施放，效果與說明一致、無錯誤；野外、懸賞對決、渡劫各跑 120～200 回合無錯誤，封印、削弱、淨化、增益都有觸發；手機 375×812 選單顯示正常。
- ⇒ **2026-09-30 改回可上陣三隻**（版本 `20261003b`，使用者要求）：`BEAST_ACTIVE_MAX` 3。`toggleBeastActive` 已有 3 隻出戰時跳提示「請先召回一隻」（不再自動召回）；
  兌換新靈寵時出戰已滿才先休息；讀檔 `enforceBeastActiveLimit` 只收掉超過 3 隻的；靈寵視窗說明「最多同時 3 隻出戰」。目前靈寵只有 3 種（狐、狼、蛟龍），等於全部都能上陣。
  靈寵對減傷保底、閃避的加成仍合計最多 +10%（`PLAYER_PET_BONUS_MAX`），多隻不會疊破上限。實測三隻同時出戰、各自施放技能與靈力正常。以下為 9/29 的舊紀錄：
- **只能一隻出戰**（2026-09-29，版本 `20261002w`，使用者指定）：`BEAST_ACTIVE_MAX` 1。`toggleBeastActive` 出戰另一隻時自動召回原本的；兌換新靈寵時若已有出戰中的，新的先休息；
  復活與讀檔時 `enforceBeastActiveLimit()` 只保留排最前面的出戰中靈寵。
- **靈寵靈力**（同日，使用者要求）：出戰靈寵 `BEAST_MP_MAX`(100) 點（state.js 的 `beastMp`，不存檔），每回合 +`BEAST_MP_REGEN`(5)（`petAssistTick`；野外刷新等待期間每秒也回），
  技能依領悟等級耗 `BEAST_SKILL_MP_BY_LV`（Lv30 招 10／60 招 15／100 招 20／300 招 25／500 招 30／1000 招 40），`petAssistTick` 只從靈力夠的招式裡挑，一招都放不起就不出手。
  驗證：高階技能 40 回合施放 11 次。靈獸園卡片顯示靈力；戰場下方 `#bf-companions` 顯示。
- **陣亡與復活**：玩家死亡時所有靈寵立即陣亡（`killAllBeasts()`），輔助效果清空；
  陣亡（或休息中）的靈寵不出手、不給被動、不累積經驗。在靈獸園每隻消耗 `BEAST_REVIVE_COST_CORE`(5000) 獸丹復活。
- 靈寵的攻擊**不經過** `resolveHit()`（不受怪物閃避/減傷影響，也不觸發屬性傷害），見第 17 節。

## 17. 戰鬥屬性（減傷／閃避／屬性傷害／五行相剋）

設定在 `config-elements.js`，引擎在 `elements.js`。**玩家、怪物、心魔完全套用同一套規則**。
※ 這裡的「冰/火/毒/金/雷 屬性傷害」與裝備上的「五行」（金木水火土，用於靈根與五行相剋）是**兩套不同系統**，UI 以「冰傷／火傷／毒傷／金傷／雷傷」區分。

| 屬性 | 效果 | 玩家上限 |
|---|---|---|
| 🛡️ 防禦 `def` | **2026-10-03 起改《天堂2》式（第 66 節）**：玩家＝防禦點數，受到傷害 × 120 ÷ (120 + 防禦)；敵人仍是減傷 N% | 無（原 60%） |
| 🔮 魔防 `mdef` | **2026-10-03 新增（第 66 節第 4 期 A）**：擋術法傷害，公式同防禦；玩家＝防禦 × 0.6 ＋ 靈力 × 0.1 ＋ 飾品詞條；敵人用魔抗 % `mres`（沒填＝同減傷） | 無 |
| 💨 閃避 `eva` | **2026-10-03 起改《天堂2》式曲線（第 66 節第 4 期）**：迴避值，被閃掉的機率＝D ÷ (D + 100)，D＝閃避 − 攻擊方命中 `evaPen`；玩家與敵人相同 | 無（原 40%） |
| ❄️ 冰傷 `ice` | N% 機率凍結目標 1 回合（該回合無法行動） | 50% |
| 🔥 火傷 `fire` | N% 機率燒傷：每層每回合扣「施放者攻擊力 × 15%」，**最多 3 層**、持續 3 回合 | 50% |
| ☠️ 毒傷 `poison` | N% 機率中毒：每層每回合扣「施放者攻擊力 × 8%」，**最多 5 層**、持續 3 回合 | 50% |
| ⚔️ 金傷 `metal` | N% 機率重擊：該次傷害 ×2（大量物理傷害） | 50% |
| ⚡ 雷傷 `thunder` | N% 機率雷擊：該次傷害 ×1.3，且**無視目標減傷** | 50% |

- **單位**：全部以 % 存在裝備的 `stats` 內（`def: 8` = 減傷 8%），由 `getEquipBonus()` 加總、`getPlayerCombatAttrs()` 套上限。
  燒傷/中毒再次命中會「疊一層並刷新回合數」，每層傷害取較高者。
- **敵人命中**（2026-09-29，版本 `20261002n`；使用者反映玩家閃避過高，選「怪物加命中」）：原本敵人沒有 `evaPen`，玩家閃避（裝備＋敏捷＋光環＋靈寵，上限 40%、套裝 45%）對所有敵人全額生效，
  而且敏捷會隨境界自動給閃避（真仙 10 階裸裝就有 16%）。新制下敵人改帶「同階一般玩家」的命中 `nv2TypHit(L)`＝一般玩家敏捷 × `hitPer`（與玩家的 `nv2Hit` 同算法）：
  野外妖獸（`rollMonsterAttrs(L)`，L＝該隻的階數；野外修士／暗殺者用該波平均階數）、懸賞對手（`startBountyDuel`）、鎮魔塔 BOSS（`bossStats`）；心魔本來就是玩家鏡像、已帶玩家命中；
  死守天南城有自己校準過的強度曲線，這次沒有加。離線估算 `nv2EstimateIdleCombat` 也扣掉妖獸命中。
  實測（resolveHit 各 2 萬下，裝備＝防具 6 件＋飾品 5 件）：裸裝閃避全部被抵銷為 0%；紫裝 9～12%、橙 +10 17～19%、白金 +20 22～26%（原本 14～29%、23～34%、26～40%）。
  命中＝同階一般玩家的敏捷，所以只有裝備、光環、靈寵帶來的「超出一般玩家」的閃避才有效。
  ⇒ 同日（版本 `20261002o`）死守天南城也加命中（`defenseWaveL(w)` 內插該波的成長位置，`waveEnemy` 的 `attrs.evaPen`）。
- ⚠️ **2026-10-03 起本項全部作廢**：防禦改點數（第 66 節第 1 期）、閃避改曲線（第 4 期），都沒有上限；保底只管護盾類。
- **玩家實際閃避／減傷上限**（2026-09-29；版本 `20261002o` 先做「各最多 30%」，同日 `20261002r` 依使用者改為「最低 8 成，靈寵最多再加 1 成、夥伴最多再加 1 成」）：
  - `getPlayerCombatAttrs()` 帶 `isPlayer: true`，並把屬於靈寵（`petDef`／`petEva`＝靈寵增益）與夥伴（`partnerDef`／`partnerEva`＝夥伴被動，`getPartnerBonusTotals`）的部分另外列出（總值照舊，面板照舊累積到 40／60）。
  - `resolveHit` 防守方是玩家時：實際閃避＝min(本身閃避 − 命中, `PLAYER_EFFECTIVE_EVA_MAX` 20) ＋ min(靈寵, `PLAYER_PET_BONUS_MAX` 10) ＋ min(夥伴, `PLAYER_PARTNER_BONUS_MAX` 10)；減傷同理（扣破甲）。回傳多了 `preDef`（減傷前傷害）。
  - **護盾依來源分開**（state.js）：`petShield*` 只給靈寵、`partnerShield*` 夥伴絕學（`castProcSkill(..., 'partner')`）、`selfShield*` 宗門守護／神器／職業技能。
  - **最後保底** `applyPetDamageReduction(dmg, r)`（beast-combat.js，野外逐擊、懸賞、渡劫都傳 `r`）：套完三種護盾後，傷害 ≥ `r.preDef` ×（1 − 20% − 靈寵實際貢獻 − 夥伴實際貢獻）（`playerDamageFloor`，靈寵＝增益減傷＋靈寵護盾、夥伴＝被動減傷＋夥伴護盾，各最多 10%）。
    所以金身／化勁、宗門守護、神器護盾都算在「玩家本身 20%」內，全部加滿閃避、減傷各最多 40%。
  - 實測（命中 0 的敵人各 2 萬下）：本身減傷 60 閃避 40 → 命中 80%、傷害 80%；再加宗門護盾 30% 仍 80%；加靈寵（閃避 8、減傷 10、護盾 25%）→ 72%／70%；再加夥伴（各 3、護盾 25%）→ 69%／60%；
    本身減傷 10 閃避 5（未到上限）→ 95%／90%。心魔（玩家鏡像）也帶 `isPlayer`。離線估算 `nv2EstimateIdleCombat` 同樣拆三塊計算。
- **BOSS 多重光環**（2026-09-29，版本 `20261002o`；使用者要求「BOSS 自帶多個光環，有負面也有增益；對玩家詛咒、冰凍、持續扣血、燒傷、中毒」）：`elements.js` 的
  `combineAuras(陣列)` 把多個光環同種效果相加 → `auraPlayerAttrs`／`auraSelfAttrs`／`auraPlayerAtkMult`／`auraSelfAtkMult`／`auraCurseMult`，每回合 `auraRoundTick` 擲凍結／燒傷／中毒、扣持續傷害、BOSS 回血；
  `describeAura` 顯示。效果：玩家攻擊 −、減傷 −、閃避 −、詛咒（受傷 +%）、每回合扣最大氣血 %、每回合機率凍結／燒傷／中毒；自身攻擊 +、減傷 +、閃避 +、每回合回血 %。
  使用處：鎮魔塔 `ZHENMO_BOSSES[n].auras`（第 51 節）、死守天南城首領 `DEFENSE_BOSS_AURAS`（第 49 節）。
- **單次命中結算順序**（`resolveHit()`）：閃避 → 藏書閣屬性秘典（本命五行、目標凍結中）→ 金重擊 → 雷擊 → 五行相剋 → 光暗 → 暴擊 → 防禦（雷擊、暗蝕時略過；玩家為防禦點數、敵人為減傷 %，第 66 節）→ 附加冰/火/毒狀態。
  屬性秘典的加成放在攻擊方 `attrs.book`（只有 `getPlayerCombatAttrs()` 會帶，怪物沒有），詳見第 24 節。
- **回合流程**（`combat.js`）：
  1. 玩家先結算自身燒傷/中毒（`tickStatus(playerStatus)`），被凍結則本回合不出手。
  2. 玩家普攻/技能（`playerAttackTurn()`，渡劫也共用），每一擊都經 `resolveHit()`；範圍技對每隻怪各自判定。
  3. 靈寵協助（不經 `resolveHit()`）。
  4. 每隻怪物結算自身燒傷/中毒，並記錄是否被凍結。
  5. 擊殺結算。
  6. 存活且未凍結的怪物**逐隻**攻擊玩家（經 `resolveHit()`：玩家的閃避/減傷生效、怪物的屬性傷害可施加在玩家身上），
     最後再套用靈寵土屬性減傷。
  - 日誌每回合只彙整一行（例：「✨ 屬性效果：❄️凍結 🔥燒傷×2｜持續傷害 1,200」），避免洗版。
  - 回到安全區、戰死、渡劫結束時，玩家身上的狀態全部清除（`playerStatus = newStatus()`）。
- **玩家來源**：
  - 鍛造閣／千寶閣／奪寶（`gear.js` 的 `buildGearStats()`，第 37 節）：
    武器帶**五行對應**的屬性傷害（金→金傷、木→毒傷、水→冰傷、火→火傷、土→雷傷，2026-09-26 起不再隨機）、防具帶減傷（盔甲 ×1.5）、飾品帶閃避，數值依品質（`equipQualities` 的 `affix`/`def`/`eva`）。
    另有隨機詞條、特效、套裝（第 37 節）；套裝可提高閃避與屬性傷害的上限。
    例：6 件橙色防具 = 減傷 24%，5 件橙色飾品 = 閃避 15%，武器同屬性可疊加到上限 50%。
  - 靈寶閣寶物（第 18 節）數值更高；靈寶閣武學自帶 `effect: { type, chance }`，施展時與裝備取較高者，**不受 50% 上限限制**。
  - 舊裝備沒有這些欄位，一律視為 0。
- **怪物來源**（`rollMonsterAttrs()`，依所在地圖分類 `monsterAttrsByMapCategory`）：

  | 地圖分類 | 減傷 | 閃避 | 帶異屬性的機率 | 觸發率 |
  |---|---|---|---|---|
  | 一、野外歷練 | 0% | 2% | 30% | 5% |
  | 二、開放世界 | 5% | 4% | 50% | 10% |
  | 三、上古禁區 | 10% | 6% | 70% | 15% |
  | 四、幽冥禁域 | 10% | 6% | 70% | 15% |
  | 五、諸天戰場 | 15% | 8% | 90% | 20% |

  - 每隻怪物隨機一種**五行**（ttrs.element，五種機率相同）。
  - 怪物的**異屬性**只會是冰／毒／雷（`MONSTER_AFFIX_TYPES`），不再帶火傷、金傷（火、金已屬於五行）；玩家武器仍可帶全部五種。
- **心魔**：開打時複製玩家當下的戰鬥屬性與本命五行（鏡像，同五行所以不相剋）。渡劫勝負仍由勝算擲骰決定（第 7 節），屬性只影響過程。
- **顯示**：角色面板四維下方的 `#combat-attr-display` 列出本命五行＋七項數值（滑鼠移上去看效果說明／相剋關係）；
  戰鬥實況在氣血旁顯示雙方狀態（❄️凍結、🔥×層數、☠️×層數）；玩家名稱後顯示本命五行（例「韓立【火】」），怪物欄第二行彙整五行與異屬性（例「五行 火×2 金×1｜⚡雷×1」）；裝備卡片用 `formatEquipStats()` 只列出非 0 屬性。

### 五行相剋

- 相剋關係（`config-elements.js` 的 `WUXING_COUNTERS`，key 剋 value）：**木剋土、土剋水、水剋火、火剋金、金剋木**。
- **本命五行**（`stats.js` 的 `getPlayerElement()`）：已穿戴裝備（不含神器）中數量最多的五行；同數時取部位順序（`equipTypes`，武器在前）最先出現者；
  沒穿裝備則為 `null`，不參與相剋。五行聖靈根則完全免疫相剋（見第 21 節）。
- **效果**（`elements.js` 的 `getWuxingCounterMult()`，在 `resolveHit()` 內套用，玩家與怪物雙向對稱）：
  攻擊方剋制防守方 → 傷害 ×1.3（`WUXING_COUNTER_BONUS`）；攻擊方被防守方剋制 → 傷害 ×0.7（`WUXING_COUNTERED_PENALTY`）；其餘 ×1。
  例：本命火打金怪 +30%、金怪打你 -30%；本命火遇水怪則反過來。
- 只影響直接命中；燒傷/中毒的持續傷害、靈寵攻擊（不經 `resolveHit()`）不受五行影響。
- 日誌標籤：`counter`「☯️五行剋制」、`countered`「☯️五行被剋」。五行說明視窗（`openWuxingInfo()`）也有一段相剋說明。

## 18. 靈寶閣（三階段戰略級寶物）

- 商品在 `config-lingbao.js`：三個階段（初級／中級／高級宗門）各 **2 件寶物＋2 部武學**，高級宗門另有 6 件神器（各有專屬技能，見下方）。
- **兌換條件**：必須已拜入該階段的宗門（`player.sectSkills[tier]`），並**同時**支付靈石與聲望：

  | 階段 | 靈石 | 聲望 |
  |---|---|---|
  | 初級宗門 | 100,000 | 10,000 |
  | 中級宗門 | 500,000 | 100,000 |
  | 高級宗門 | 1,000,000 | 500,000 |
  | 神器（高級宗門） | **100,000,000**（`ARTIFACT_COST_COINS`，2026-09-26 由 100 萬改） | 500,000 |

  價格一律經 `lingbao-shop.js` 的 `getLingbaoCost(item)` 取得（神器用 `isArtifactItem` 判斷，靈石換成 `ARTIFACT_COST_COINS`、聲望沿用階段價）；
  高級宗門標題列註明「神器另計」，神器卡片另外顯示自己的價格。

- **唯一性**：兌換後 id 記入 `player.lingbaoSold`，該商品永久顯示「已兌換（不再補貨）」。轉世輪迴不會重置。
- **品階保證「高一階一定更好」**：同部位裝備每一項數值都更高（劍：玄鐵重劍 → 紫電青霜劍 → 誅仙劍；
  盔甲：赤焰護心甲 → 玄武鎮獄甲），武學倍率逐階提高（初級 180～200% → 中級 260～350% → 高級 400～600%）。
  **新增或調整商品時請維持這個原則**。
- **神器**（`category: "artifact"`）：共 6 件，全部在高級宗門靈寶閣兌換（每件 1 億靈石＋50 萬聲望、各自唯一），裝在神器欄、不計入五行與靈根判定。
  **品質為「造化神器・七彩」**（2026-09-25 由橙色改）：`quality: ARTIFACT_QUALITY`（"七彩"），顯示文字 `ARTIFACT_QUALITY_LABEL`，常數在 `config-lingbao.js`。
  - 樣式：`index.html` 的 `.quality-七彩`（七彩流動文字，同 `.rainbow-text`）；背包、角色裝備欄的卡片用 `getEquipCardClass()` 加上 `.rainbow-glow` 七彩外框，品質文字經 `formatQualityLabel()`（皆在 `artifact.js`）。
  - 「七彩」不在 `equipQualities` 內：**不會出現在依品級批次刪除的選項**（防誤刪）、不開鑲嵌孔（`ensureSockets` 本來就跳過神器）。
  - 舊存檔的橙色神器由 `migrateArtifactIds()` 讀檔時改成七彩。
  神器欄只有一格，所以各件**走不同路線**（四維總量都約 8 萬、戰鬥屬性約 30～40 點），避免任何一件完全取代其他件：

  | 神器 | id | 定位 | 屬性 |
  |---|---|---|---|
  | 混沌鐘 | `lb3_artifact` | 均衡防禦 | 四維各 2 萬、減傷 20%、閃避 10% |
  | 三世銅棺（九龍拉棺） | `lb3_artifact_coffin` | 極致守護 | 體質 4.5 萬（其餘 1～1.5 萬）、減傷 30%、閃避 5% |
  | 荒天帝大羅劍胎 | `lb3_artifact_sword` | 極致物理 | 力量 4.5 萬（其餘 1～1.5 萬）、金傷 25%、雷傷 15% |
  | 萬物母氣鼎（天帝鼎） | `lb3_artifact_cauldron` | 四維最高 | 四維各 2.2 萬、減傷 10%、火傷 20% |
  | 吞天魔罐（狠人大帝） | `lb3_artifact_jar` | 極致術法 | 悟性 4.5 萬（其餘 1～1.5 萬）、毒傷 25%、冰傷 15% |
  | 無始鐘（一見無始道成空） | `lb3_artifact_wushi` | 極致閃避 | 四維各 1.8 萬、閃避 25%、減傷 10% |

  新增神器時請比照這個預算，並在描述寫明定位。

### 神器專屬技能（2026-09-25，`config-lingbao.js` 的 `artifactSkills`、邏輯在 `artifact.js`）
- **觸發**：裝備在神器欄時，玩家每回合出手（`playerAttackTurn`）之後呼叫 `artifactSkillTurn(targets, tags)`，依 `chance` 額外發動一次。
  野外（`combat.js`）、渡劫（`tribulation.js`）、懸賞對決（`bounty.js`）都會觸發。**不耗靈力**、不佔宗門技能的 40% 判定；
  懸賞對決的「封印」擋不住（屬於法寶不是武學），但**被凍結的回合不會發動**。

  | 神器 | 技能 | 機率 | 效果 |
  |---|---|---|---|
  | 混沌鐘 | 鐘鎮諸天 | 18% | 全體物理攻擊 ×2.5，40% 凍結 |
  | 三世銅棺 | 三世輪迴 | 20% | 受到傷害 -50% 持續 2 回合（共用 `petShieldRate/Timer`，取較高值）＋回復 12% 氣血 |
  | 荒天帝大羅劍胎 | 一劍破天險，帝威嚇世間 | 18% | 單體物理攻擊 ×2.5，必定重擊（實際 ×5） |
  | 萬物母氣鼎 | 萬物母氣 | 18% | 全體物理攻擊 ×1.8 並必定燒傷，回復 8% 氣血與 8% 靈力 |
  | 吞天魔罐 | 吞天噬地 | 18% | 單體術法攻擊 ×3.0 並必定中毒，吸取傷害 30% 回血 |
  | 無始鐘 | 一見無始道成空 | 18% | 單體術法攻擊 ×1.5，所有敵人凍結 1 回合（下一次無法出手） |

- **欄位**：`target`(single/aoe/self)、`dmgType`、`mult`、`attrs`（該擊額外屬性，與身上取較高，例 `metal: 100` 必定重擊）、`heal`/`mpHeal`/`lifesteal`、`shield`、`freezeAll`，見 `config-lingbao.js` 註解。每擊都走 `resolveHit()`（受對方閃避、減傷、五行影響）。
- **辨識是哪一件神器**：裝備物件的 `name` 一律是部位名「神器」，所以兌換時（`buyLingbaoItem`）另存 `lingbaoId`（商品 id）。
  更新前兌換的神器沒有這個欄位，`save.js` 讀檔／匯入時呼叫 `migrateArtifactIds()`：依「四維與戰鬥屬性完全相同」比對 `lingbaoShopItems` 補上
  （⚠️ 若之後改了神器屬性，舊神器會比對不到而沒有技能——改屬性時要保留舊值的對照，或改用其他方式補 id）。
- **顯示**：背包、角色裝備欄的卡片以 `formatArtifactSkill(eq)` 顯示神器全名與專屬技能；靈寶閣商品卡片也列出技能。
- 心魔是鏡像玩家的戰鬥屬性，但**不會**使用玩家的神器技能。

- 裝備兌換前會檢查背包空位（`hasEquipInventorySpace()`），不足時不扣資源。
- 舊版靈寶閣商品（降魔伏虎杖、紫電青霜劍〔舊〕、太素霓裳羽衣、神魔九變、大羅天經）已下架；
  已購買的玩家仍保有物品與技能（技能存在 `learnedSkills` 內，技能列表標示為「[靈寶閣]」）。
- **舊禁術已下修到新標準**：舊版售價僅 1～1.5 萬靈石，遠低於新版初級的 10 萬，因此由 `migrateLegacySkills()`
  依 `legacySkillAdjustments` 於每次讀檔／匯入時校正（結果固定，重複套用不會越改越低）：

  | 技能 | 舊數值 | 新數值 |
  |---|---|---|
  | 大羅天經 | 群體 ×5.0、耗魔 80 | 群體 ×1.8、耗魔 120（同初級《烈火刀法》，但無屬性效果） |
  | 神魔九變 | 攻擊 ×4.0、3 回合 | 攻擊 ×1.5、3 回合、耗魔 150（與靈寵木屬性最高階相同） |

- **已兌換武學的耗魔同步**：兌換時是把 `skillData` 複製一份存進 `player.learnedSkills`，
  所以 `migrateLegacySkills()` 讀檔／匯入時也會依名稱從 `lingbaoShopItems` 取回最新的 `mpCost`。
  **日後調整靈寶閣武學耗魔只要改 `config-lingbao.js`**，舊存檔自動生效（其他欄位如倍率目前不會同步）。

- 舊版「降魔伏虎杖」的部位「杖」不在 `equipTypes` 內（鍛造閣選單由 `equipTypes` 產生，**從來沒有「杖」選項**）。
  讀檔時會移除這個欄位、把杖退回背包，且 `equipItem()` 會拒絕穿戴 `equipTypes` 以外的部位，見第 9 節神器欄位。

## 19. 存檔代碼（匯出／匯入）

- **介面**：`#save-code-modal` 視窗，取代舊版 `prompt()` 對話框。
  舊版的問題：存檔代碼動輒 3～5 萬字，手機上的 `prompt()` 幾乎無法全選複製，部分 App 內建瀏覽器（LINE、Facebook 等）更會直接擋掉 `prompt()`，導致按了沒反應。
- ⚠️ **此視窗內禁止使用 `alert`/`confirm`/`prompt`**：App 內建瀏覽器擋掉 `confirm()` 時會直接回傳 false，
  造成「按了確認匯入卻什麼都沒發生」。所有訊息都寫進 `#save-code-status`（`setSaveCodeStatus(訊息, 'ok'|'warn'|'error')`），
  覆蓋進度改為**按兩次確認**：第一次按解析代碼並顯示存檔的道號／境界，按鈕變成「⚠️ 再按一次，覆蓋目前進度」；
  修改文字框內容會重置確認（`resetImportConfirm()`）。
  - 匯出：文字框顯示代碼＋「📋 複製代碼」＋「💾 下載存檔檔案」。
    - 複製：先在點擊事件內**同步**執行 `execCommand('copy')`（iOS 舊版只接受這種），失敗才用 `navigator.clipboard`，
      再失敗就把文字全選並提示長按複製。文字框不設 `readOnly`（iOS 無法用程式選取唯讀文字框），改用 `inputmode="none"` 避免跳出鍵盤。
    - 下載：檔名 `fanchen-save_日期.txt`（英數字，避免手機瀏覽器中文檔名亂碼）。App 內建瀏覽器常不支援下載且無法偵測，
      所以只提示「若沒有出現下載，請改用複製」。
  - 匯入：貼上（或「📋 從剪貼簿貼上」，`navigator.clipboard.readText`）／「📂 從檔案讀取」（`FileReader`；
    `<input type="file">` **不設 accept**，部分 Android 會把 .txt 標成其他類型導致選不到）→「✅ 確認匯入」按兩次。
    匯入成功後**立刻 `saveLocal()`**；套用失敗會還原成匯入前的進度。
- **格式**（`encodeSaveCode`/`decodeSaveCode`，皆為 async）：
  - 新：`"FS2:"` + Base64(deflate-raw 壓縮的 UTF-8 JSON)，用瀏覽器內建的 `CompressionStream`。
    實測：100 名僕從＋100 件裝備的存檔，最舊版 47,527 字 → 未壓縮 Base64 約 3～4 萬字 → **壓縮後約 2,000～4,000 字**。
    **可以完整貼進 LINE**（LINE 單則訊息上限約 1 萬字，過長會被截斷或拆成多則，是手機匯入失敗的主因之一）。
  - 瀏覽器沒有 `CompressionStream`（iOS 16.3 以前）時自動退回未壓縮 Base64；
    在這類舊瀏覽器匯入 FS2 代碼會提示「瀏覽器版本過舊，請更新」。
  - 匯入相容四種輸入：FS2 壓縮代碼、未壓縮 Base64（允許夾雜換行與前後空白）、`%7B` 開頭的最舊版代碼、直接貼上的 JSON。
- **驗證**：解析失敗或缺 `realmIndex` 一律提示「存檔代碼無效」（常見原因：只複製到一部分、通訊軟體拆成多則訊息），不會改動目前進度。
- **切換存檔時的清理**：`applySaveData()` 會清空進行中的戰鬥、渡劫與身上狀態（`enemies`/`inTribulation`/`heartDemon`/`playerStatus`），
  再做離線收益結算；並用 `sanitizePlayerName()` 清理道號（別人分享的代碼可能夾帶 HTML，道號會被插進日誌的 innerHTML）。
- **手機背景存檔**：`main.js` 的 `initGame()` 在 `visibilitychange`（切到背景）與 `pagehide`（關閉分頁）時立刻 `saveLocal()`。
  手機瀏覽器常在背景直接結束分頁，只靠 30 秒自動存檔會遺失最後一段進度，重開時像是「讀檔失敗、進度倒退」。
- **修改道號**（`player-profile.js`）也改用 `#name-modal` 視窗（不用 `prompt()`），最多 12 字，並移除 `< > & " ' \`` 等字元。
- **📊 開啟攻略試算**（2026-10-01，版本 `20261004u`，使用者指定）：「💾 存檔管理」抽屜（`#drawer-save`）在「📤 匯出存檔代碼」下方的按鈕 → save.js 的 `openGuideCalc()`。
  開新分頁到攻略站「屬性與技能」頁（`GUIDE_CALC_URL`，網址中文已編碼、原樣保留），網址後加 `#save=` + `encodeURIComponent(存檔代碼)`：
  - 用 `#` 不用 `?`：hash 不會送到伺服器，由攻略頁的程式讀取；Base64 有 `+ / =` 所以一定要 `encodeURIComponent`。
  - **先同步 `window.open("about:blank")`、等 `encodeSaveCode` 完成才導向**：若在 await 之後才開，手機瀏覽器會當彈出視窗擋掉；開不了視窗時改在本頁導向。失敗只寫日誌，不用 alert／confirm。
  - 驗證（本機）：網址 1,463 字、`#save=` 後無未編碼的 `+ / =`、解回來與目前存檔一致；在攻略頁開啟後顯示「讀取完成，已帶入『韓立』的數字與裝備」，
    物理攻擊 100／術法攻擊 100／氣血上限 5,100 與遊戲人物面板相同（測試角色為凡人 1 階新角色）。
  - 位置：「⚙️ 命運與系統」視窗（`#system-modal`）→「💾 存檔管理」抽屜，與攻略頁的說明一致。
- **仍使用原生對話框的地方**（在 App 內建瀏覽器可能失效）：拜入宗門、渡劫、靈寶閣兌換、轉世、完全重置等的 `confirm()` 確認，
  以及各處資源不足的 `alert()` 提示。若玩家回報這些按鈕在 LINE 內沒反應，比照本節改為視窗內確認。

## 20. 宗門地圖與城鎮（城鎮區，不編號）

- **2026-09-26 改版：第一區改名「一、城鎮 (安全區)」**，修仙地圖只列出 **天南城**、**天星城**（亂星海的主城；第二區已有戰鬥地圖「亂星海」，地圖名稱不可重複，所以城鎮叫天星城）。
- **2026-09-27 戰鬥區重新編號**：城鎮拿掉「一、」改為「城鎮 (安全區)」；戰鬥區依序改為 **第一區 野外歷練／第二區 開放世界／第三區 上古禁區／第四區 諸天至高戰場**（`config-maps.js` 的 `category` 與 `index.html` 修仙地圖按鈕）。
  只改顯示文字，`category` 字串只用於標題顯示（`map.js`、`sect.js`），不影響存檔。
- **2026-09-27 拆出第四區**：原「禁區」拆成 **第三區 上古禁區**（荒古禁地／太初古礦／上蒼（葬天島））與 **第四區 幽冥禁域**（不死山／神墟／仙陵／冥界），諸天至高戰場順延為 **第五區**。
  現在 `maps` 索引為：城鎮 0、野外歷練 1、開放世界 2、上古禁區 3、幽冥禁域 4、諸天戰場 5（`index.html` 按鈕 `openMapCategoryModal(1～5)`）。
  ⚠️ 以下四張表以**分類索引**查值，新增／拆分區域時都要一起改：`REPUTATION_MAX_BY_MAP_CATEGORY`（config-maps.js）、`monsterAttrsByMapCategory`（config-elements.js）、
  `LIFESPAN_DANGER_MULT`（config-lifespan.js）、`PROF_MAP_MULT`（config-profession.js）。這次第四區四張表都沿用上古禁區的值、諸天戰場的值移到索引 5，遊戲數值完全不變。
  存檔的 `currentMap` 以地圖名稱判斷分類（`getMapCategoryIndex`），所以舊存檔不需轉換。
- **2026-09-27 第三區進入門檻降為煉虛**：荒古禁地／太初古礦／上蒼（葬天島）的 `minRealm` 由 10（仙人初境）改為 **6（煉虛）**，四維 `minStat` 由 500 提高為 **2000**；第四、五區仍是仙人初境。第四區幽冥禁域四維同日由 500 提高為 **5000**；第五區諸天至高戰場由 5000 提高為 **10000**。
  `map.js` 的卡片「限制：」與進入失敗提示改用 `realms[minRealm]` 顯示，不再寫死「仙人初境」——之後調整門檻只改 `config-maps.js` 即可。
  ⚠️ 第 26 節的 `realmPacing` 仍以「煉虛～渡劫在鬼谷八荒（expRate 1000）」估算經驗，玩家若提早進荒古禁地（expRate 3000）這幾個境界會修得比目標快。
- **2026-09-27 起怪物加強**：玩家反映怪物過弱（煉虛玩家攻擊約千萬級，舊荒古禁地怪物氣血才 250 萬，一刀一隻），
  **2026-09-26 定案（玩家指定）**，第一～五區 `diff`（舊值 → 新值）：靈山大川 2（不變）、深淵險地 8→**50**、上古遺跡 25→**350**、天南 100→**4萬**、亂星海 400→**10萬**、鬼谷八荒 2000→**30萬**、
  荒古禁地 5千→**1000萬**、太初古礦 7千→**2000萬**、上蒼 1萬→**6000萬**、不死山 1.3萬→**50億**、神墟 1.6萬→**100億**、仙陵 2萬→**500億**、冥界 2.5萬→**1500億**、
  仙界戰場 5萬→**3000億**、萬界戰場 9萬→**5000億**、混沌初界 20萬→**1兆**（怪物氣血最高 = 1兆 × 500 = 500 萬兆，在 JS 安全整數 9007 萬兆以內）。
  **怪物攻擊／氣血可逐圖指定**：`config-maps.js` 的地圖可填 `monsterAtk`／`monsterHp`，由 `combat.js` 的 `getMapMonsterStats(map)` 取用（刷怪、野外修士／暗殺者 ×倍率、離線估算都走它），沒填則 攻擊 = diff × 50、氣血 = diff × 500。
  目前**沒有地圖使用**（第三區曾短暫指定過，2026-09-26 改回照難度計算）。
  （同日先調過兩版較低的數值才定案。怪物氣血最高 = 100億 × 500 = 5 兆，仍在 JS 安全整數範圍內。）
  野外修士／暗殺者以 diff 為基準一起變強；靈石 `coins`、經驗 `expRate` 不受影響；離線估算（`estimateIdleCombat`）自動依新 diff 計算。
  （曾評估過依對應境界把 diff 拉到 24 萬～480 兆的方案，玩家選擇自訂上列數值。）
  ⚠️ 第一、二區也一起加強：realmPacing 的前期地圖（深淵險地＝築基、上古遺跡＝金丹、天南＝元嬰、亂星海＝化神、鬼谷八荒＝煉虛～渡劫）怪物變強，新手期可能要多練階數才打得動。
  - 城鎮是安全區、可打坐（經驗倍率 ×3，同宗門），但**不是宗門**，宗門設施不能用（`isInSect()` 只認 `SECT_MAP_NAME`）；離開宗門到城鎮也會中斷親自執行的門派任務。
  - **宗門不列在修仙地圖**：`maps[0].items[0]` 仍是宗門，但標 `hidden: true`，`openMapCategoryModal` 會略過。
    ⚠️ **宗門必須維持在 `maps[0].items[0]`**：死亡回城（combat.js）、渡劫失敗（tribulation.js）、暫存區滿（enhance.js）都用 `changeMap(0, 0)`，讀檔找不到地圖時（save.js）也退回 `maps[0].items[0]`。
  - **回宗門的方式**：洞府的「宗門」（手機熱點、PC `pcStageButtons` 的 `sect`）改呼叫 `map.js` 的 `returnToSect()`：不在宗門就先 `changeMap(0, 0)` 傳送回去，再打開宗門分頁；已在宗門則只開分頁。
    懸賞對決中按宗門 = 逃離對決（`changeMap` 的既有行為）。
  - 地圖分類索引不變（城鎮仍是索引 0），`REPUTATION_MAX_BY_MAP_CATEGORY`、`getMapCategoryIndex` 不受影響。
  - **城鎮傳送點（2026-09-26）**：修仙地圖視窗的城鎮區不再是按鈕，而是直接列出城鎮卡片（`#world-map-towns`，`map.js` 的 `renderTownTeleports()`，
    `openWorldMapModal` 每次開啟時重繪）：兩欄並排，有 `thumb` 顯示縮圖、沒有則顯示 🏯 佔位，點擊即 `selectMap(0, i)` 傳送；目前所在的城鎮標「📍 當前所在」且不可點。
    第一～五區（戰鬥區，maps 索引 1～5）仍是按鈕 → `openMapCategoryModal`。
  - **城內場景（第二頁面，2026-09-26）**：城鎮卡片改呼叫 `goToTown(i)`：不在該城就先 `selectMap` 傳送，
    該城在 `config-towns.js` 有場景就開啟 `#town-scene`（`town.js` 的 `openTownScene`）；已在城內也能點卡片直接進城（卡片標「點擊進城」）。
    - 目前只有**天星城**（「天星城・坊市」）。傳送點：右側雕花石拱門 = **天星賭坊**（`openCasinoModal()`，第 40 節；橫圖 rect [1150,140,270,430]、直式 [470,600,234,700]）。
    - **場景人偶**（`figures`，2026-09-26）：透明 PNG 擺在圖上當裝飾，座標同樣是圖上像素（rect 寬高比要和圖片一致，底邊 = 腳下位置），
      畫在傳送點底下、預設不可點（加 `action` 才可點，滑過發光）；CSS `.town-figure` 加腳下陰影。
      目前：**亂星海第一大善人・風希**（id `fengxi`，第 39 節夥伴 `dashanren` 同一人；**可點**：第一次結識、之後每日問候），紅色小攤車左側的街面上（橫圖 [862,446,95,150]、直式 [226,1110,126,200]，大小以攤車高度為基準）。
      人偶圖由玩家提供的插畫（有完整街景背景）以 `tools/cut-figure.ps1` 手描外框去背：含椅子與木台、不含後方燭台與右下木箱，
      椅子扶手與靠背的鏤空處另外挖洞，避免透出原圖背景的路人。
      ※ 木台銘牌上印著原圖的「蒼龍使者」字樣（遊戲中約 10 像素高，看不清楚）；2026-09-27 依玩家指定，人物設定為風希。
    - **白衣女子（隨機出現）**（2026-10-01，版本 `20261004z`；使用者問「賭場門口白衣身影可以離開嗎」→ 看過擦掉的預覽後要求「設定成 NPC，有時會出現有時會消失」）：
      她原本畫在背景圖裡（賭坊石拱門下、台階前）。背景改用擦掉她的 `tianxing-market-v2.jpg`／`tianxing-market-portrait-v2.jpg`（簡化 Criminisi 範例式修補：依信心×邊緣強度決定順序、
      從附近找最像的 patch 複製；橫圖 patch 9×9、搜尋 ±70，直式圖試了 3 組取 13×13、±110 最好，石柱右側帶到一點紫色；一次性腳本不在專案內）。
      **用新檔名**：PWA 的圖片快取是「先給快取、背景更新」，同檔名替換時手機第一次會拿到舊圖（有她），再擲到出現就會疊成兩個人。原圖 `tianxing-market.jpg` 等保留不刪。
      人偶 PNG＝原圖與修補圖相減（差異 10～40 線性轉成 alpha、3×3 平滑，只取她的多邊形範圍），疊回原位就跟原圖一樣；差異小的地方透明，修補後背景與原圖幾乎同色所以看不出來。
      第一版設定 `{ id: "baiyi", chance: 0.5, cls: "baked" }`（不可點、50% 出現；擲 2000 次 49.3%）。town.js：`openTownScene` 呼叫 `rollTownFigures`，有 `chance` 的人偶以 id 擲一次存在 `townFigureShown`
      （橫直圖同一個結果，轉向不會忽隱忽現），`renderTownHotspots` 依此過濾。`.town-figure.baked { filter: none }`（影子已在圖裡）。
    - **白衣身影＝大主宰・牧塵（定時出現）**（同日，使用者指定「大主宰.牧塵 相逢即是有緣 贈 20 碎片，2 天出現一次在賭坊前，出現後停留 30 分鐘」）：
      config-towns.js 的 `TX_MUCHEN`（夥伴 `muchen`，帝境，激活 300 片），橫直圖兩筆人偶都 `...TX_MUCHEN`＋各自 img／rect（PNG 檔名沿用 npc-baiyi*.png），取代 chance。
      `schedule: { everyHours: 48, stayMinutes: 30 }`：town-npc.js 的 `isScheduledFigureHere`——還在停留時間內就在；否則到了 `nextAt` 後玩家**第一次進城**就出現（`shownAt`＝現在、`nextAt`＝現在＋48 小時、寫日誌），
      所以是「出現後 2 天才會再出現」，玩家沒去天星城就不會白白錯過。紀錄 `player.townFigureSched = { muchen: { shownAt, nextAt, gift } }`。
      場景開著時到點會自己離開（town.js 的 `townFigureTimer` 重判並重畫）；離開後才點到（例：畫面沒重畫）就提示「已經離開了」。
      點他 `talkToScheduledFigure('muchen')`：每次出現第一次點「相逢即是有緣。」＋碎片 ×20（已結識改加好感 +20），之後點「有緣自會再見。」＋剩餘停留分鐘。
      **對話框上方顯示立繪**（同日使用者提供牧塵官方立繪 1285×1920，含《大主宰》標題與 iQIYI 標誌，照原圖不裁；縮成 640×956 `images/towns/muchen-portrait.jpg` 67KB；2026-10-02 換成玩家提供的第二版 846×1264（無 iQIYI 標誌）→ `muchen-portrait-v2.jpg` 62KB，用新檔名避開 PWA 圖片快取）：
      `TX_MUCHEN.portraitImg`，`showPartnerDialog` 之後把 `<img class="partner-portrait">` 插在對話內容最前面；`.partner-portrait` 限高 52vh（手機上對話框不會超出畫面太多）。
      他站在「天星賭坊」傳送點範圍裡，所以 cls 加 `town-top`（`z-index: 2` 疊在傳送點上面，點他不會進賭坊；拱門其他地方照樣進賭坊）；baked 人物滑過也會微微發光。
      驗證：第一次進城出現、點擊點到的是他、碎片 20/300、再點不重複給；停留時間調成已過 31 分鐘 → 不在；nextAt 調到過期 → 再出現且 gift 重置；
      場景開著 1.5 秒後到點 → 自己消失、賭坊傳送點仍在；Console 無錯誤。
    - 城名：左上「↩ 離開」下方，**直書**（`writing-mode: vertical-rl`）墨色底金邊，仿天星城縮圖的書法題字。
    - **兩張圖**：橫圖 `images/towns/tianxing-market.jpg`（1582×672，約 2.35:1，電腦與橫向）、直式 `portrait`（`tianxing-market-portrait.jpg`，704×1520，手機直向剛好滿版）。
      `town.js` 的 `pickTownView` 依畫面方向選圖（寬 < 高且有 portrait → 直式），轉向（resize）時 `applyTownView` 自動換圖並重排。
      ⚠️ 兩張圖構圖不同，**傳送點要各設一組**（`hotspots` 與 `portrait.hotspots`）。直式圖建議 9:19.5（例 1080×2340），重要內容放中間 9:16 範圍、上方約 8% 留給返回鈕與標題。
    - 版面：舞台高度 = 畫面高、寬度依比例延伸；比畫面寬時可左右瀏覽（手機手指滑動；電腦滾輪自動轉為左右平移、也可按住拖曳；捲軸隱藏），
      比畫面窄時改以寬度填滿。開啟時視角置中，可左右瀏覽時底部顯示「↔ 左右滑動瀏覽」。拖曳超過 6px 放開不會誤觸傳送點。
    - 傳送點座標用**圖上像素**（`rect: [x, y, 寬, 高]`），`renderTownHotspots` 換算成舞台 %，任何螢幕都對得準；牌匾（`.town-plaque`）顯示在範圍中央。
    - **座標工具**：網址加 `?townedit=1`，在城內畫面點任一處，底部會顯示「橫圖／直式圖座標 (x, y)」（也寫進 console），用來填 `rect`。
    - `#town-scene` 的 z-index 為 90，低於彈窗（`.modal-bg` 100），所以從傳送點開啟的視窗會疊在城內畫面上。
    - 新增其他城的場景：圖放 `images/towns/`，在 `townScenes` 以城鎮地圖名稱加一筆即可（天南城目前沒有場景，點卡片仍只傳送）。
  - **地圖縮圖**：地圖項目可加選填欄位 `thumb`（圖片路徑），城鎮傳送點與 `openMapCategoryModal` 的卡片都會顯示在最上方（`.map-thumb`，16:9 裁切）。
    目前有天星城（`images/maps/tianxing-city.jpg`）與天南城，都是玩家提供的圖縮成 720px 寬、JPEG 品質 85。其他地圖要加圖：圖放 `images/maps/`，該筆加 `thumb` 即可。
  - **依性別換縮圖**（2026-09-28）：地圖可再加選填 `thumbFemale`，`map.js` 的 `getMapThumb(item)` 在 `player.gender === 'female'` 且有 `thumbFemale` 時用女版，否則用 `thumb`
    （城鎮傳送點卡片與 `openMapCategoryModal` 都走它）。天南城：男修 `tiannan-city-male.jpg`（白衣男修御劍俯瞰天南城）、女修 `tiannan-city-female.jpg`（紅白衣女修），
    原圖 1672×941 → 720×405，各約 120 KB。

- 舊版第一區有三張安全區地圖，設施分散：「洞府 / 弟子居」(經驗 ×1，無設施)、「演武學宮」(×1.5，門派任務／靈田／靈獸園)、
  「後山禁地」(×3，靈寶閣／藏書閣／鍛造閣／煉丹房)。現已**合併為單一地圖「宗門」**（`config-maps.js` 的 `SECT_MAP_NAME`），
  經驗倍率沿用三者最高的 ×3、難度 1。
- **身在宗門即可使用全部七項宗門設施**：`ui.js` 的 `updateSectFacilitiesUI()` 只看 `map.js` 的 `isInSect()`，
  一次顯示或隱藏所有設施按鈕。親自執行門派任務也改為「待在宗門」即可（`combat.js`／`quest.js`／`map.js` 皆呼叫 `isInSect()`）。
  **日後判斷「是否在宗門」一律呼叫 `isInSect()`**，不要再把地圖名稱字串寫死在各檔案。
- 設施本身仍需先拜入宗門（`checkSectJoined()`），這點不變。
- **舊存檔相容**：存檔裡的 `currentMap` 是當時地圖物件的副本。`save.js` 的 `migrateCurrentMap()` 在讀檔／匯入時依名稱改指向
  `maps` 內的最新設定（順便讓倍率調整生效），找不到的地圖（三張舊地圖）一律回到宗門。
  日後刪除或改名任何地圖，都靠這個函式自動處理，不必另外寫轉換。
- **天南市集**（2026-09-30，版本 `20261003j`，玩家提供圖 `images/towns/tiannan-market.jpg`，848×1264 直式：天南城門前的市集街道）：
  （原為城鎮區第 3 張獨立地圖，已併入天南城，見下）安全區、可打坐；修仙地圖頂端城鎮卡片「點擊傳送並進城」→ `goToTown` 開城內場景 `townScenes["天南市集"]`（標題「天南城・市集」）。
  只有直式圖，直接當主圖：手機直向滿版；電腦橫向以寬度填滿、上下捲動（town.js 原本就支援）。使用者選「**先只放場景**」→ `hotspots`／`figures` 皆為空，
  之後要加店鋪就在 config-towns.js 加（圖上招牌：左「天南百貨」「布莊舖」、右「天南百貨」「酒樓」、中央「天南城門」）。
  - **併入天南城**（同日，版本 `20261003t`，使用者要求「天南市集放到天南城內，點天南城進入後才會看到」）：`config-maps.js` 拿掉獨立地圖「天南市集」，
    場景改為 `townScenes["天南城"]`（標題仍是「天南城・市集」）→ 修仙地圖城鎮卡片只剩天南城、天星城，點天南城＝傳送並開市集場景。
    舊存檔停在「天南市集」的由 save.js `migrateCurrentMap` 的 `MAP_RENAMES`（舊名 → 新名）改到天南城（不會被送回宗門）；日後地圖改名也加在這張表。
    驗證（本機）：城鎮卡片「天南城／天星城」、點天南城進入「天南城・市集」、currentMap「天南市集」讀檔後變天南城（安全區）；Console 無錯誤。
  - **隱藏 NPC・香腸大師奧斯卡**（2026-10-01，版本 `20261004x`；使用者提供 3D 立繪，要求「隨機進入天南市集，躲藏在角落」「香腸做成不發光」，
    並指定「被發現後問：你要我的大香腸，好吃還能噴你滿臉；選項吃／不吃；吃了見面禮送 20 碎片；不吃對玩家發起決鬥，NPC 戰力是玩家的 50 倍，打爆玩家」）：
    - 人物＝夥伴 `aosika`（《斗羅大陸》奧斯卡，天驕級，第 39 節），所以「20 碎片」＝奧斯卡本人的夥伴碎片（`addPartnerShards`，集滿 100 片到情緣視窗激活）。
    - 設定：`config-towns.js` 的 `townScenes["天南城"].hiddenNpcs`（`chance` 0.3、兩個藏身點 `spots`、`gift` 20、`duelMult` 50、台詞 `lines`）；邏輯在 `town-npc.js`。
      town.js 的 `openTownScene` 每次進城呼叫 `rollTownNpcs` 擲骰（實測 3000 次 31.3%），`renderTownHotspots` 把 `getTownNpcFigures` 的結果併進 `figures`（加 class `town-npc`）。
      **當天吃過或打過就不再出現**（`player.townNpc = { aosika: 日期 }`）；沒處理（關掉對話框）下次進城重擲。
    - 藏身點（圖上像素，只在主圖；天南市集沒有 portrait）：1＝右側石牆巷口大甕後 `[710, 802, 50, 100]`（只露上半身與香腸）、2＝左側磚柱轉角紅甕後 `[102, 830, 50, 100]`（人物左右翻轉、香腸朝外）。
      PNG 已調暗偏暖並**把被甕擋住的部分挖空**，所以不用前景圖層；`.town-figure.town-npc` 取消外陰影（會落在甕上露餡），滑過才微微發光。手機 375×812 時人物約 32×64px。
      （曾試第 3 處「右下店鋪門內」，前面沒有遮擋、像貼上去的，沒有採用。）圖片製作：灰底依每列左右邊緣估背景色、從邊緣擴散去背；香腸的光暈依顏色清掉，
      再沿手描的中心線畫一條有圓柱明暗與高光的紅褐色香腸（一次性腳本，不在專案內）。
    - **問句**（同日使用者加料）：問句下方加旁白 `lines.tease`（「你看著他鬆開褲頭……往裡一直掏！！」「黑色的香腸！！！！！！」（`.town-npc-tease.shock` 放大紅字）「你決定是吃，還是不吃？」）。
      「🌭 吃」**刻意縮小**（`.town-npc-eat`，選項格改 `auto 1fr`），`eatWindowMs`（2000）後縮掉消失、「不吃」亮起（`.picked`），再 0.5 秒自動 `answerTownNpc(城, false)` 進入戰鬥（`townNpcAutoTimer`）。
      2 秒內按得到「吃」照樣吃。**關掉對話框也逃不掉**（使用者指定）：partner.js 的 `closePartnerDialog`（點背景）呼叫 `onTownNpcDialogClosed`，
      還在問（`townNpcAsking`）就跳過防連點、直接 `answerTownNpc(城, false)` 開打；已經選完（吃了之後的見面禮對話框）關掉不受影響。
      驗證：等 2 秒 → 自動決鬥；1 秒時按小「吃」→ 碎片 20、關掉見面禮對話框也沒有決鬥；開了 0.2 秒就點背景 → 立刻進入決鬥；Console 無錯誤。
    - **吃**：見面禮碎片 ×20（已結識改加好感 +20），對話框顯示碎片進度，存檔。
    - **不吃**：`startTownNpcDuel` 跳出**決鬥畫面** `#town-duel`（同日使用者提供海報並要求「發起挑戰會跳出戰鬥畫面」；z-index 96，城內場景之上、彈窗之下）：
      海報 `duelImg`（`images/towns/duel-aosika.jpg`）以 contain 置中（底部有台詞不能裁；手機 375×812 時 375×560），同一張圖模糊當底；
      上方面板＝雙方名字、血條、戰力（先顯示「？」）、VS、最近 2 行戰報（原 3 行，窄螢幕面板會長到蓋住奧斯卡的臉）。
      **防連點**：問句對話框的「不吃」按鈕剛好跳在大甕後人偶的位置，實測一次點擊就直接選到「不吃」→ 對話框出現後 `TOWN_NPC_CHOICE_GUARD_MS`（400ms）內 `answerTownNpc` 不理會。時間軸約 5.3 秒：發起決鬥 → 揭露戰力（新制 `nv2CombatPower`、舊制 `getPhysAttack`，`fmtCombat` 顯示；奧斯卡 ×50）
      → 你出手（小閃白，對方血條幾乎不動）→「我有一根大香腸——噴！」→ 大閃白＋震屏、造成氣血上限 ×50 的傷害、你的血條歸零 → 左側蓋紅色「敗北」印章、出現「↩ 被轟出天南市集」
      （`closeTownNpcDuel`：關掉決鬥畫面與城內場景，回洞府）。海報上已有拒絕台詞，所以戰報不再重複（設定的 `lines.refuse` 已刪）。
      「敗北」原本是單字「敗」放在中央，會蓋在奧斯卡臉上像是他輸了，改放左側路人處。`prefers-reduced-motion` 時不震屏。
      **結果一開始就套用**（氣血剩 1、寫戰鬥日誌、存檔；之後安全區照常回血），中途重新整理也一樣。（第一版是在夥伴對話框逐行顯示，已改掉。）
      **不算戰死**：不折壽、靈寵不陣亡（使用者只說「打爆玩家」；要改成戰死可呼叫 `onPlayerKilledInField()`，但壽元見底時會身死道消，需謹慎）。
      **小懲罰**（同日，使用者測試後覺得「氣血剩 1」在安全區幾秒就回滿、沒感覺，選「10 分鐘內不能進天南市集，或扣少量靈石」→ 兩個都做）：設定 `penalty: { banMinutes: 10, coinPct: 0.03 }`——
      被收走身上靈石 3%（香腸錢，無條件捨去）＋ `player.townBan = { 城名: 解禁時間戳 }`；map.js 的 `goToTown` 傳送前呼叫 `getTownBanLeftMin`，禁入中只 `showToast`「😵 滿臉都是香腸油，還沒臉回天南城……（剩 N 分鐘）」、不傳送
      （人界地圖 → 城池圖 → 點圖進城也走 goToTown，會停在城池圖畫面）。懲罰寫進戰鬥日誌，決鬥畫面最後多一行「💸 被收走香腸錢 N 靈石，10 分鐘內沒臉回天南市集！」。
      驗證：靈石 100 萬 → 97 萬、禁入剩 10 分鐘、從宗門點天南城被擋（留在宗門）、把時間調到過期後可正常進城；Console 無錯誤。
    - 驗證（本機，停用存檔）：強制出現在 1 號點，手機畫面上幾乎看不出來（截圖確認）；點擊 → 問句＋「🌭 吃／不吃」；吃 → 碎片 20/100、人偶消失、當天擲骰不再出現；
      2 號點不吃 → 演出 7 行、戰力 200 對 1萬、氣血 1、城內畫面關閉；Console 無錯誤。
      決鬥畫面（手機 375×812，截圖）：血條、VS、戰報、敗北印章、離開按鈕位置正確；按離開 → 決鬥畫面與城內場景都關閉；Console 無錯誤。
      （預覽面板模擬手機尺寸時，工具的點擊座標會偏掉、按不到按鈕；改回一般尺寸點擊正常，不是遊戲問題。）
- **人界地圖**（2026-09-30，版本 `20261003u`，玩家提供《凡人修仙傳》人界地圖 `images/maps/world-renjie.jpg` 1408×768；使用者要求「原有世界點入變成分區地圖畫面，傳送點再來分開設計」）：
  - 「世界」導覽（手機底部、PC `nav-world`）→ home-ui.js `openWorldTab()` 改開全螢幕人界地圖 `openTownScene(WORLD_SCENE_KEY)`（原本直接跳出修仙地圖清單）。沿用城內場景（town.js）：手機直向高度填滿、左右滑動，電腦拖曳／滾輪平移。
  - 設定：config-towns.js 的 `townScenes[WORLD_SCENE_KEY]`（`WORLD_SCENE_KEY = "人界"`，不是地圖名稱，所以不會出現在城鎮卡片、`hasTownScene` 對地圖都不受影響）；左側直書標題「人界」。
  - **傳送點**（逐一由使用者指定位置）：
    - 天南城（2026-09-30，版本 `20261003v`，使用者在圖上「天南」與「地區」中間標紅點）：`rect [175, 345, 70, 70]`（以紅點 (210, 380) 為中心；`20261003x` 由 28×28 放大：使用者回報「有紅點但點擊沒有跳出畫面」，小視窗裡可點範圍只剩約 17px，點偏就沒反應）、`pin: true`、`goToTownByName('天南城')`（map.js 新增，依名稱找 `maps[0]` 索引再 `goToTown`）＝傳送並開天南城市集場景。
    - **小紅點樣式** `pin: true`（town.js `renderTownHotspots`；版本 `20261003w`，使用者要求「世界地圖用小紅點就好，不用加名稱，玩家看紅點旁的地圖名稱就知道位置」）：
      rect 正中央一顆紅點 `.town-dot`（白框、外圈紅色光暈呼吸 `townDotPulse`，滑鼠移上放大；`prefers-reduced-motion` 不動），**不顯示名稱**，`label` 只當 `title`／`aria-label`。
      **rect 要比紅點大很多**（至少 70×70 圖上像素，紅點大小固定不受 rect 影響），手指與滑鼠點偏也能觸發；town.js 拖曳判定門檻同時由 6px 放寬到 10px（手一抖就被當成拖曳、不觸發傳送點）。（`20261003v` 曾用 📍＋下方小牌匾，已改掉；一般牌匾樣式會蓋住圖上的地名，人界地圖一律用 pin。）
    - 驗證（本機）：紅點在「天南」「地區」之間、無文字、title「天南城」；在宗門點它 → 傳送到天南城並開「天南城・市集」、地圖列表按鈕隱藏；Console 無錯誤。
  - **分區點擊效果**（2026-09-30，版本 `20261003z`；`20261003y` 先做成「分區地圖放大彈到畫面中央」，使用者改要「不要彈出新視窗，就原畫面一個點擊效果，範圍我畫給你」）：
    - 人界地圖上天南的紅點（hotspot id `tiannan-region`）→ `openWorldRegion('tiannan')`：使用者畫的天南地區範圍在**原畫面原位**浮起（以範圍中心放大 1.07、上移 1.5%、金色光邊＋陰影，0.35 秒），
      其他地方變暗；`WORLD_REGION_MS` 750ms 後執行分區的 `action`（`goToTownByName('天南城')` 進城），效果播放中重複點擊不理會。
    - 設定 config-towns.js 的 `worldRegions`：`{ name, action, shape }`，`shape` 是人界地圖像素座標的多邊形。天南地區的 shape（約 x 74～359、y 268～417，含黃楓谷與「天南地區」字樣）
      是把使用者畫的範圍圖（截圖去背，594×166）用程式比對求得縮放 0.895、左上 (74, 268)，再逐欄取遮罩上下緣描出來的；之後的新範圍照同樣方法（或請使用者直接標點）。
    - 實作（town.js＋index.html）：`#town-scene-stage` 內疊 `#world-region-dim`（變暗）與 `#world-region-lift` > `#world-region-lift-img`（同一張人界地圖、`clip-path: polygon(...)` 只留範圍）；
      浮起的 `transform`／`filter: drop-shadow` 放外層，才不會被 clip-path 裁掉。跟著地圖一起捲動、縮放。進城（`openTownScene`）或離開（`closeTownScene`）會 `hideWorldRegionNow()`；action 沒換畫面也會收掉。
    - 驗證（本機，手機 375×812）：點紅點 → 範圍原地浮起、金邊、周圍變暗（截圖確認）→ 約 0.75 秒後傳送到天南城並開市集、效果收掉；Console 無錯誤。
  - **城池圖畫面＋天星城**（2026-09-30，版本 `20261004a`；使用者：「原本點天南城會先進去一張小圖畫面是天南城，點下去才到天南市集」，選定流程「紅點 → 天南城圖 → 點了進市集」；另要天星城「如同天南城做法」）：
    - 流程：人界地圖紅點 → 分區原地浮起（0.75 秒）→ 分區 `action` = `openCityGate('城名')` 開**城池圖畫面** `#city-gate`（疊在 `#town-scene` 內、z-index 6）→ 點圖 `enterCityGate()` → `goToTownByName` 傳送並開城內場景；「↩ 返回人界」`closeCityGate()` 回人界地圖。
    - 城池圖畫面：城名（書法金字）＋中央金框大圖（修仙地圖城鎮卡片的縮圖 `getMapThumb`：天南城依性別 `tiannan-city-male/female.jpg`、天星城 `tianxing-city.jpg`）＋「✨ 點擊圖片進城」，底圖是同一張模糊變暗；淡入放大 0.35 秒。
      `openTownScene`／`closeTownScene` 都會 `closeCityGate()`。傳送被擋（例：暫存區滿的提示）時停在城池圖畫面。
    - 天星城：人界地圖紅點 `tianxing-region`（「星」「城」之間，約 (1175, 452)，`rect [1140, 417, 70, 70]`）；`worldRegions.tianxing` 的 shape 是使用者畫的天星城島（248×203，比對求得縮放 0.89、左上 (1073, 388)）。
    - 驗證（本機，手機 375×812）：天星城島浮起（截圖）→ 城池圖「天星城」→ 點圖進天星城坊市；天南同流程進天南市集（男角圖）；「返回人界」回人界地圖；Console 無錯誤。
  - **離開回主畫面**（2026-09-30，版本 `20261004b`，使用者要求「世界地圖離開直接進入主頁，不要出現地圖／修仙地圖選項」）：`openWorldTab()` 改 `switchTab('home')`（原本 `switchTab('world')`），
    人界地圖底下是洞府主畫面，按「↩ 離開」直接回主畫面，不再露出世界分頁（那頁只有一顆「🗺️ 修仙地圖」按鈕）；底部「世界」導覽不會亮起。人界地圖右上角「📜 地圖列表」照舊。
    驗證（本機）：從戰鬥分頁按「世界」→ 人界地圖（分頁 home）→ 離開 → 洞府主畫面、世界分頁面板不顯示；Console 無錯誤。
  - **第一區傳送點**（2026-09-30，版本 `20261004c`，使用者畫落雲宗／溪國／壁魔谷那塊、指定「傳送點對應第一區」）：
    人界地圖紅點 `zone1-region`（落雲宗右邊、溪國下方的平原空地，約 (300, 470)，`rect [265, 435, 70, 70]`）→ `worldRegions.zone1` 浮起
    （shape 由使用者畫的範圍 282×222 比對求得縮放 0.89、左上 (163, 397)；上緣與天南地區範圍下緣略有重疊，不影響）→ `action: openMapCategoryModal(1)` 開修仙地圖第一區清單（靈山大川、深淵險地、上古遺跡）
    → 選地圖 `selectMap` 傳送並一併關掉人界地圖（回洞府）。練功區沒有城池圖畫面，直接開清單。
    驗證（本機，手機 375×812）：範圍浮起（截圖）→ 清單標題「一、野外歷練 (戰鬥區)」三張地圖 → 選靈山大川 → 傳送、人界地圖關閉；Console 無錯誤。
  - **第二區傳送點**（2026-09-30，版本 `20261004d`，使用者畫慕蘭草原那塊、指定「歸類為第二區」）：紅點 `zone2-region`（「慕蘭草原」左下、交兀枝與慕蘭人領地之間的空地，約 (215, 232)，`rect [180, 197, 70, 70]`）
    → `worldRegions.zone2` 浮起（shape 由使用者畫的範圍 387×177 比對求得縮放 0.895、左上 (92, 122)；下緣與天南地區上緣略重疊）→ `openMapCategoryModal(2)`（天南、亂星海、鬼谷八荒、墜魔谷…）。
    驗證（本機，手機 375×812）：三個紅點都在空地不壓字（截圖）；慕蘭草原浮起（截圖）→ 清單「二、開放世界大區域 (高難度戰鬥)」；Console 無錯誤。
  - **第三區傳送點**（2026-09-30，版本 `20261004e`，使用者畫大晉王朝那塊、指定「歸類為第三區」＝三、上古禁區）：紅點 `zone3-region`（「大晉」與「大晉王朝」兩行字之間，約 (820, 232)，`rect [785, 197, 70, 70]`）
    → `worldRegions.zone3` 浮起（shape 由使用者畫的範圍 507×425 比對求得縮放 0.895、左上 (552, 75)；圖上有白色雪山，背景判定改用 RGB 皆 >250 才算白底）→ `openMapCategoryModal(3)`。
    驗證（本機，手機 375×812）：紅點在兩行字之間（截圖）；大晉浮起（截圖）→ 清單「三、上古禁區 (煉虛解鎖·高難)」11 張；Console 無錯誤。
  - **目的地未定的區塊**（2026-09-30，版本 `20261004f`～`g`，使用者連續送「製作一個傳送區塊」＋範圍圖，選「先做範圍，目的地之後再定」）：無邊海、西沙大沙漠、亂星海、青瀾島、飛升點。
    紅點都放在地名字與字之間（無邊海「邊海」、西沙大沙漠「大沙」、亂星海「星海」、青瀾島「瀾島」、飛升點「升點」），點了照樣原地浮起，`action` 目前是 `showToast('…尚未開放，敬請期待')`；**決定目的地後只要把 `worldRegions` 對應的 action 換掉**。
    shape 來源：無邊海的圖有存成檔案，用程式比對（縮放 0.895、左上 (385, 240)）；其餘四張的圖沒有存成檔案（對話中貼的圖不一定有檔案），
    改用圖上地名位置換算（西沙：左上約 (26, 441)；亂星海：左上約 (632, 386)，縮放都約 0.895）再手描，青瀾島與飛升點直接依人界地圖上的輪廓手描。
    驗證（本機，手機 375×812）：五個紅點都會觸發「尚未開放」提示、人界地圖不關閉；西沙、亂星海、青瀾島浮起形狀截圖確認；Console 無錯誤。
  - **靈界地圖**（2026-10-01，版本 `20261004h`，使用者提供靈界地圖 `images/maps/world-lingjie.jpg` 1024×559（桌上攤開的地圖，有放大鏡、書卷），指定「飛升點對應到這張靈界地圖」）：
    `worldRegions.feisheng.action` 改 `openTownScene(LINGJIE_SCENE_KEY)`（`LINGJIE_SCENE_KEY = "靈界"`）→ 飛升點浮起後換成全螢幕靈界地圖（同人界地圖的城內場景系統，手機左右滑動）。
    靈界場景左側直書「靈界」、左上「↩ 離開」回洞府、右上 `extraButton`「↩ 返回人界」→ `openTownScene(WORLD_SCENE_KEY)`。**傳送點尚未設計**（`hotspots: []`），之後照人界的做法加（shape 用靈界圖的像素座標）。
    目前沒有境界門檻，任何人都能進靈界地圖看（只是看圖，沒有可點的地方）。
    驗證（本機，手機 375×812）：人界點飛升點 → 靈界地圖（圖 1024 寬載入、截圖）→「返回人界」回人界（右上變回「地圖列表」）→「離開」回洞府；Console 無錯誤。
  - **飛升台畫面（五行法陣＋光柱）**（2026-10-02，版本 `20261005f`～`g`，使用者提供飛升台插畫 848×1264：「世界地圖飛升點能加入這張圖的縮圖嗎，五行法陣跟光柱」）：
    - 流程改為：飛升點紅點 → 分區浮起 → `worldRegions.feisheng.action = openCityGate('飛升點')` 開**飛升台畫面**（沿用天南城的城池圖畫面 `#city-gate`）→ 點圖光柱爆亮、轉白 `CITY_GATE_ASCEND_MS`（900ms）→ 靈界地圖；「↩ 返回人界」照舊。
    - 非城鎮入口設定 config-towns.js 的 `CITY_GATES`（`{ img, imgW, imgH, hint, action, fx }`；`openCityGate` 先查這裡，沒有才當城鎮用 `getMapThumb`）。圖 `images/maps/feisheng-gate.jpg`（縮成 600×894）。
      直式圖（imgH > imgW）時 `#city-gate` 加 `.portrait`，圖寬 `min(88vw, 50vh, 520px)`，名稱與提示都放得下（手機 400×800、電腦 1280×720 皆確認）。
    - 特效 town.js 的 `CITY_GATE_FX.feisheng()` 產生、放進按鈕內的 `#city-gate-fx`（座標是圖上百分比，大陣中心約 (55%, 56.5%)）：
      中央**五行大陣**（SVG：金外圈、符紋虛線圈、五角星、五個屬性色頂點；壓扁 `scaleY(0.4)` 成透視橢圓後在裡面旋轉、明暗脈動）＋底光；
      **光柱**（大陣中心直衝天頂，裡面亮紋往上流、寬度呼吸）＋沿光柱上飄的靈光粒子；**五個小陣**依圖上原本的五個小法陣位置配 金／木／火／水／土（屬性色旋轉陣環、往上一道細光、頭頂浮動屬性字）。
      光效各自 `mix-blend-mode: screen`；**五行字不混色**（第一版整層混色，字被亮圖洗白看不清，已改為屬性色＋黑描邊）。`prefers-reduced-motion` 時全部靜止、不顯示粒子。
    - 光柱加強（同日，使用者：「光柱再亮一點、再大一點」）：寬 13%→22%、高到 58%，中心改純白不透明、外圍多一層模糊柔光（`.fs-pillar::before`，左右各外擴 45%），
      `brightness(1.15)`，脈動透明度下限 0.7→0.88，裡面往上流的亮紋改純白、速度 0.6 秒。
    - 五行字貼地（同日，使用者：「金木水火土的字改貼在地板上」）：`.fs-node-glyph` 從小陣頭頂浮動改成放在小陣中央、`scaleY(0.6)` 壓扁成透視貼地，排在細光底下（DOM 順序 環→字→細光），
      只做明暗脈動不浮動；小陣 SVG 中央的實心圓改成細圈，留空給字。字色改白字＋屬性色多層光暈（第一版屬性色＋黑描邊，貼地縮小後太暗看不清）。
    - **人界地圖異象・雷電交加**（2026-10-03，版本 `20261005g`，使用者：「外面的世界地圖能做點異相嗎，比如該地圖上方雷電交加」）：
      場景設定新增 `effects: [{ fx, at: [圖上 x, y] }]`（config-towns.js；人界 `{ fx: "thunderStorm", at: [1125, 192] }`＝飛升點三角標記），town.js 的 `renderTownHotspots` 依 `TOWN_SCENE_FX[fx](view, at)` 畫在傳送點層最底下（`pointer-events: none`，紅點照樣點得到）。
      `thunderStorm`：標記正上方約 95px 一團烏雲（230×100 圖上像素，8 團雲塊各自緩慢起伏＋紫色旋渦 `scaleY(0.4)` 旋轉）、三道 SVG 閃電（中間那道劈到標記，週期 4.2／5.3／6.1 秒錯開，看起來不規則）、
      打雷時雲內亮光＋落點閃光（跟主閃電同步，`tfxFlash`：每週期 88%～94% 亮、暗、再亮兩下）。第一版單層漸層烏雲太淡、第二版太實太大擋到羅盤，現為半透明模糊雲塊。`prefers-reduced-motion` 時靜止。
      之後其他地方要加異象：在 `TOWN_SCENE_FX` 加一種 fx、場景 `effects` 加一筆即可（fx 函式收到 `(view, at, 整筆設定)`，可帶自訂參數如 `r`）。
    - **亂星海漩渦**（2026-10-03，同版本 `20261005g`，使用者：「亂星海也加入漩渦意象」）：`{ fx: "whirlpool", at: [840, 536], r: 116, seeThrough: true }`（半徑 48 → 58 → 使用者要求「放大 2 倍」→ 116，左右約 x 724～956，邊緣淡出、不壓內星城島）＝「亂星海」字樣（約 x 780～900、y 515～555）正中間
      （第一版放在字樣上方空海面 (835, 455)，使用者要求「移動到亂星海字體中間」；移過去後蓋住「星」字，使用者選「漩渦半透明、字透出來」→ `seeThrough: true`）。
      **半透明**（`.tfx-wp.see-through`）：水面與渦眼 `mix-blend-mode: multiply`（只把海變深，黑字照樣黑）、浪紋／浪花／水紋 `overlay`（只把藍海提亮，不會把黑字蓋白），三個字完整可讀。
      ⚠️ 混色層**不能包在有 transform 的共同容器裡**（容器會自成一組，裡面的混色只混到同組、混不到地圖）：所以改成 `.tfx-wp` 不做 transform，水面／渦眼／水紋直接畫成扁橢圓（框內上下各留 25%），
      旋轉的 SVG 各自包一層 `.tfx-wp-flat`（`scaleY(0.5)`，混色設在這層）。
      `TOWN_SCENE_FX.whirlpool`：外層 `.tfx-wp` 定位（2r×2r）、各層壓成透視橢圓；深色水面＋渦眼（呼吸放大）、兩組 SVG 阿基米德螺旋浪紋（白 3 臂 2.2 圈 6 秒一轉、藍 4 臂 1.4 圈 11 秒）、
      反轉的浪花虛線圈（16 秒）、兩道往外擴散的水紋（4 秒錯開）；螺旋臂用 radialGradient 描邊，渦眼與外緣淡出。第一版半徑 48 偏小，改 58。
      驗證（本機 540×960）：漩渦在字樣正中間（放大截圖看細節）；亂星海紅點仍點得到；Console 無錯誤。
      驗證（本機 540×960）：烏雲在飛升點正上方、不壓「飛升點」字；強制閃電全亮截圖確認三道閃電與落點閃光位置；紅點仍點得到（elementFromPoint 是紅點）→ 飛升台畫面；Console 無錯誤。
      ⚠️ 本機測試也受 Service Worker 快取：同版本號改 JS 後要刪 caches 裡的該檔或換版本號（本次 f 已被本機快取，換成 g）。
      ⚠️ 預覽面板偶爾會出現 SW 自己的網路請求全部失敗（頁面走快取、JS 全部 `Failed to fetch`、`WORLD_SCENE_KEY is not defined`；PowerShell 直接抓伺服器卻是 200）：
      sw.js 邏輯沒問題，是預覽環境的狀況；在測試頁 `navigator.serviceWorker.getRegistrations()` 全部 `unregister()` 後重新整理即可。
    - 點圖期間 `cityGateBusy` 擋連點；`closeCityGate` 清空特效。天南城／天星城的城池圖不受影響（提示「點擊圖片進城」、無特效）。
    - 驗證（本機，停用存檔）：飛升點 → 飛升台畫面（截圖：五行小陣、字、大陣、光柱都看得到）→ 連點兩次 → `ascend` 演出後進靈界地圖、特效清空；天南城城池圖照舊；Console 無錯誤。
  - **靈界地圖的第四、五區紅點**（2026-10-01，版本 `20261004i`～`j`，使用者要求「第四區及第五區內所有的區域散開在靈界地圖上」；原本想把血天大陸設為第四區，使用者中途更正為此）：
    `townScenes[LINGJIE_SCENE_KEY].hotspots` 每張地圖一個紅點（共 7 個），點了直接傳送（map.js 新增 `goToMapByName(name)` → `selectMap`，境界／屬性門檻照 `changeMap`），**沒有浮起效果**。
    位置（靈界圖像素）：第四區・幽冥禁域在西邊大陸——不死山 (170, 190) 左上山脈、神墟 (350, 232) 天元境旁古城堡、仙陵 (345, 345) 木族夜叉族東邊丘陵、冥界 (185, 420) 飛靈族與地淵的深淵；
    第五區・諸天至高戰場——仙界戰場 (505, 200) 玄武境東岸、萬界戰場 (690, 170) 血天大陸、混沌初界 (830, 235) 天雲大陸山區。
    靈界圖上沒有這些地名，所以 hotspot 加 `showLabel: true` → 紅點下方小字 `.town-dot-label`（town.js、index.html；人界地圖不用，因為圖上有地名）。
    `selectMap` 改為**傳送成功才**關掉人界／靈界地圖（原本被境界擋下也會關掉）；人界的「地圖列表」同樣適用。
    驗證（本機，手機 375×812）：7 個紅點＋小字不壓圖上文字（左中右三張截圖）；低境界點冥界 → 提示「境界未達【天仙】」、留在靈界地圖；拉高境界後 7 張都能傳送並關閉地圖；Console 無錯誤。
  - **修正「靈界傳送點按了沒有任何反應」**（2026-10-01，版本 `20261004k`）：原因是境界不足被擋下，而 `changeMap` 用 `alert()` 提示——Claude 預覽面板與部分 App 內建瀏覽器不顯示 alert，看起來就像沒反應（靈界 7 張最低天仙，測試角色煉虛）。
    - map.js 把門檻檢查抽成 `getMapEntryBlock(c, i)`（回傳 `{ msg, short }`；境界、四維、暫存區滿），`changeMap` 照舊 alert；新增 `findMapByName`、`getMapLockShort(name)`。
    - `goToMapByName` 先檢查，進不去時用 `showToast` 提示條顯示原因、留在地圖上。
    - 靈界 hotspot 加 `mapName`：town.js 開地圖時算鎖定狀態，進不去的紅點變灰不閃（`.town-hotspot.pin.locked`）、小字後面加紅字「🔒天仙」「🔒真仙」「🔒大羅金仙」「🔒混元大羅金仙」（或「🔒四維N」「🔒暫存區滿」）。
    - 驗證（本機，手機 375×812）：煉虛角色 7 個點全灰並標出境界、點不死山 → 提示條「進入【不死山】失敗！您的境界未達【天仙】。」（截圖）；拉高境界後全亮、點冥界 → 傳送並關閉地圖；Console 無錯誤。
    - ⚠️ 其他地方的 `alert()`（人界「地圖列表」清單選地圖等）在預覽面板一樣看不到，是既有行為，沒改。
  - **選戰鬥地圖直接看戰場實況**（2026-10-01，版本 `20261004x`；使用者要求「點選地圖戰鬥會連結到仙魔戰場實況」）：map.js 的 `selectMap` 傳送成功且目的地不是安全區（`!maps[c].isSafe`）時呼叫
    `switchTab('battle')`（home-ui.js），戰鬥分頁第一個就是「⚔️ 仙魔戰場實況」（`#battle-panel` 在戰鬥分頁排最前，第 59 節）。修仙地圖清單、人界地圖分區清單、靈界紅點（`goToMapByName` → `selectMap`）都走這裡；
    城鎮、被境界／四維／暫存區擋下時不切換。驗證：人界地圖 → 第一區清單 → 靈山大川 → 戰鬥分頁、人界地圖關閉、已開打（截圖）；選天星城、境界不足的上古禁區都停在原分頁；Console 無錯誤。
  - 其餘傳送點尚未設計：之後依圖上地名（天南地區、黃楓谷、落雲宗、亂星海、天星城、大晉王朝、北夜小極宮、飛升點…）加，座標用 `?townedit=1` 量。
  - 過渡：場景右上角新增 `extraButton`（index.html `#town-scene-extra`，town.js `openTownScene` 依場景設定顯示／隱藏，城鎮場景不顯示）「📜 地圖列表」→ `openWorldMapModal()`（z-index 100 蓋在場景 90 上）；
    在清單選好地圖（map.js `selectMap`）時若開著人界地圖就一併 `closeTownScene()`；選城鎮則 `goToTown` 直接換成城內場景。世界分頁裡的「🗺️ 修仙地圖」按鈕照舊直接開清單。
  - 驗證（本機）：世界 → 人界地圖（圖 1408 寬載入、右上「地圖列表」）；地圖列表 → 選宗門後場景關閉；選天星城 → 換成天星城坊市、額外按鈕隱藏；手機 375×812 舞台 1489×812、置中可左右滑；Console 無錯誤。
- **修正**（同版本）：修仙地圖「城鎮」分類視窗（`openMapCategoryModal`）的卡片原本對城鎮也顯示妖獸數值（新制上線後的舊 bug），城鎮（`cat.isSafe`）改顯示「🏯 安全區：可打坐靜修」。

## 21. 五行共鳴（原「靈根系統」，取代舊版「17 件全同屬性成陣」）

> 2026-09-27 改名：畫面上的「靈根」一律改叫「五行共鳴」（冰靈根 → 冰共鳴、五行聖靈根 → 五行聖共鳴…），效果與判定不變；程式名稱（getSpiritRoots／getRootBonus、ROOT_* 常數）沿用。
> 「靈根」改指入宗資質測試擲出的**先天靈根**（第 53 節）。

判定在 `stats.js` 的 `getSpiritRoots()`，數值表與門檻常數全部在 `config-equipment.js`。
先統計 17 個部位（不含神器）各五行件數，再算出**套數** `sets`（五種件數的最小值，即能湊出幾組完整的「金木水火土」）
與**餘數** `rest[屬性] = 件數 - 套數`。

| 類型 | 條件 | 數量 | 表 |
|---|---|---|---|
| 單屬性靈根 | 某屬性 ≥ `ROOT_SINGLE_COUNT`(5) 件 | 最多同時 3 種（17 格） | `wuxingArrayEffects`（沿用原五行法陣的五種效果） |
| 五行聖靈根 | `sets` ≥ `ROOT_SUPREME_SETS`(3)（15 件，剩 2 件不論屬性） | 只有一個 | `supremeRootEffect` |
| 純化靈根 | `sets` ≥ 2 且某屬性 `rest` ≥ 6 | 只有一個 | `pureRootEffects`（水→冰、火→炎、金→罡、木→生、土→岩） |
| 雙屬性靈根 | `sets` ≥ 1 且兩屬性 `rest` 各 ≥ 5 | 只有一個 | `dualRootEffects`（10 組，key 依 `wuxingElements` 排序後以 `+` 相連） |

- **特殊靈根只會有一個**，優先序：聖 > 純化 > 雙屬性；**與單屬性靈根並存**（例：2 套 + 6 水 = 水靈根 + 冰靈根）。
- **金＋水**依 `rest` 較多者分成兩種結果（`dualRootEffects["金+水"].byMain`）：水多 → 雷靈根、金多（或相同）→ 毒靈根。其餘組合不分主副。
- **效果一律寫在各靈根的 `bonus` 內**，由 `getRootBonus()` 加總後供各計算處取用，**不要再把數值寫死在計算處**：

  | bonus 欄位 | 合併方式 | 套用位置 |
  |---|---|---|
  | `atkMult` | 相乘 | `stats.js` 的 `getPhysAttack()`/`getMagAttack()` |
  | `hpMult` / `conMult` | 相乘 | `stats.js` 的 `getMaxHp()` |
  | `skillMult` | 相乘 | `combat.js` 的 `playerAttackTurn()`（技能傷害，渡劫共用） |
  | `healMult` | 相乘 | `combat.js` 安全區每秒回血 |
  | `def`/`ice`/`fire`/`poison`/`metal`/`thunder` | 相加 | `elements.js` 的 `getPlayerCombatAttrs()`，**與裝備加總後一起套上限**（減傷 60%、屬性傷害 50%） |
  | `regen` | 相加 | `combat.js` 的 `applyRootRegen()`，野外與渡劫每回合回復（日誌顯示「🌿靈根回復」） |
  | `freezeResist` | 取最高 | `resolveHit()` 內折減「被凍結」的機率 |
  | `burnMax` / `poisonMax` | 取最高 | `resolveHit()` 內覆蓋自己造成的燒傷/中毒層數上限 |
  | `ignoreCounter` | 任一為真即成立 | `resolveHit()`：任一方持有即雙向不受五行相剋影響 |

- **新增靈根或改效果只要動 `config-equipment.js`**；若要新增 `bonus` 欄位，需同時在 `getRootBonus()` 的合併清單與套用處加上。
- **舊存檔不需轉換**：裝備資料本身沒變，只是判定規則改變，讀檔後自動用新規則重算。
- 顯示：角色裝備視窗頂端與「!」說明視窗共用 `equipment.js` 的 `formatSpiritRoots()`。

## 22. 聲望

| 來源 | 數量 | 位置 |
|---|---|---|
| 野外擊殺妖獸 | **每殺一隻隨機 1 ~ 該區上限**（`rollKillReputation()`，上限見下表） | `combat.js` |
| 每日任務 | 普通 20／困難 50／艱鉅 120 | `config-daily-quests.js` 的 `dailyQuestRewards` |
| 離線掛機（野外） | 戰鬥 tick 數 × 該區平均聲望 × `OFFLINE_REPUTATION_RATE`(0.7)，約為線上的 **65%** | `save.js` 的 `calcOfflineProgress()` |

擊殺聲望依**所在地圖分類**給，設定在 `config-maps.js` 的 `REPUTATION_MAX_BY_MAP_CATEGORY`（key 為 `maps` 的索引）：

| 地圖分類 | 每隻聲望 | 平均 |
|---|---|---|
| 一、野外歷練 | 1 ~ 3 | 2 |
| 二、開放世界 | 1 ~ 10 | 5.5 |
| 三、上古禁區 | 1 ~ 30 | 15.5 |
| 四、幽冥禁域 | 1 ~ 30 | 15.5 |
| 五、諸天戰場 | 1 ~ 100 | 50.5 |

- 舊版不分地圖一律「每殺 1 隻 = 1 點」，導致低難度地圖刷聲望效率最高；改成分區後高難度地圖才划算。
- 門派任務、僕從派遣**不給聲望**（獎勵只有道具：獸丹／靈草／武學積分／礦石，初級打掃另給 50 靈石，見 `config-quests.js`）。
- **離線掛機也給聲望**，但刻意比線上少：離線以「戰鬥 tick 數（離線秒數 × `OFFLINE_COMBAT_RATE` 0.3）× 該區平均聲望 × `OFFLINE_REPUTATION_RATE` 0.7」計算，
  換算約每秒 0.21 隻，實測穩定在線上的 0.64～0.68。
  ⚠️ 兩個係數要一起看：`OFFLINE_COMBAT_RATE` 從 0.7 降到 0.3 時，聲望倍率必須由 0.3 調高到 0.7 才能維持 65%。修改任一個都要重新實測。
  離線待在安全區（宗門）不給聲望。
- 消耗：靈寶閣兌換（初級 1 萬／中級 10 萬／高級 50 萬）、千寶閣壽元丹（1,000 ~ 10,000）；
  活動解鎖門檻見第 10 節（每日任務 1,000、千寶閣 5,000、秘境 5,000、獵殺邪修 8,000、世界BOSS 10,000）。

## 23. 靈石

- **擊殺掉落**：每隻 = 該地圖的 `coins` ±20%（`combat.js` 的 `rollKillCoins()`，數值表在 `config-maps.js` 的 `maps`）。
  ⚠️ 舊版是 `diff × (8~12)`，難度一放大靈石就爆量（混沌初界每小時 22.9 億，而靈寶閣最貴的寶物才 100 萬），
  因此改為**各地圖獨立設定 `coins`，不再跟 `diff` 連動**。調整產出只要改 `coins`。
- **換算**：滿速掛機每小時約 `KILLS_PER_HOUR_ESTIMATE`(1160) 隻（波次之間有 5 秒刷新，實測每秒 0.32 隻），
  所以「每小時靈石 ≈ coins × 1160」。

  | 地圖 | coins/隻 | 線上每小時（實測峰值） | 設計上限 |
  |---|---|---|---|
  | 靈山大川 | 20 | 2.3 萬 | — |
  | 深淵險地 | 80 | 9.5 萬 | — |
  | 上古遺跡 | 250 | 30 萬 | — |
  | 天南 | 1,000 | 118 萬 | — |
  | 亂星海 | 1,650 | 198 萬 | 200 萬 |
  | 鬼谷八荒 | 2,450 | 297 萬 | 300 萬 |
  | 荒古禁地 | 3,350 | 386 萬 | 400 萬 |
  | 太初古礦 | 4,200 | 486 萬 | 500 萬 |
  | 上蒼（葬天島） | 6,900 | 795 萬 | 800～1000 萬 |
  | 不死山 | 7,300 | 861 萬 | 〃 |
  | 神墟 | 7,750 | 898 萬 | 〃 |
  | 仙陵 | 8,200 | 936 萬 | 〃 |
  | 冥界 | 8,400 | 985 萬 | 〃 |
  | 仙界戰場 / 萬界戰場 / 混沌初界 | 8,400 | 949～970 萬 | 〃（封頂） |

- **上蒼之後靈石封頂**在每小時 800～1000 萬，不再隨難度放大；高階地圖的差異改由**經驗與聲望**體現。
  新增地圖時請照這個原則設 `coins`，並實測 3 次以上取峰值確認沒有破上限（隨機 ±20% 會讓單次結果浮動約 ±2%）。
- **離線掛機**：`save.js` 的 `calcOfflineProgress()` 以「離線秒數 × `OFFLINE_COMBAT_RATE`(0.3) × 該圖 coins」計算，
  實測約為線上的 0.89～0.97。⚠️ 舊值 0.7 會讓離線收益是線上的 2.16 倍（關掉遊戲比掛機划算）。
  這個係數同時影響離線的經驗、靈石、僕從救援與聲望（聲望另乘 `OFFLINE_REPUTATION_RATE`）。
  2026-09-24 起再乘上**實力效率**（`estimateIdleCombat()`，見第 33 節），打不過的地圖不再給滿額離線收益。
- 主要消耗：鍛造 10,000／次、符寶煉製 100 萬／次、僕從派遣 50～300／趟、丹藥 40～500、靈寵 1～5 萬、壽元丹 1～10 萬、靈寶閣 10 萬～100 萬。
- **其他靈石來源**（2026-09-29 起，第 61 節）：坊市回收、商隊跑商、洞府產業、懸賞賞金，一律以「H＝境界每小時練功收入」換算並有每日上限，不會超過打怪收入太多。
  ⚠️ 後期靈石仍遠多於消耗，真正的瓶頸是聲望（高級靈寶閣需 50 萬聲望）。若要讓靈石一直有意義，
  需要讓後期消耗（鍛造、丹藥、壽元丹）隨境界提高，而不是再調高產出。

## 24. 藏書閣第二階段：屬性秘典

- **解鎖**：已拜入中級宗門（`player.sectSkills[ELEMENT_BOOK_TIER]`，`ELEMENT_BOOK_TIER = 2`）。未解鎖時藏書閣仍可進入，第二階段區塊只顯示鎖定提示。
- **消耗**（每次，`ELEMENT_BOOK_COST`）：50 武學積分 + 100 株靈草（`player.spiritGrass`）+ 1,000 靈石。支援 ×1／×10／最高（`resolveBatchCount`），也計入每日任務的 `study`。
- **成長**：每次 +0.01% 傷害（`ELEMENT_BOOK_GAIN = 0.0001`），每本上限 1,000 次（`ELEMENT_BOOK_MAX`）→ 滿級 +10%。
  滿一本共需 5 萬武學積分、10 萬靈草、100 萬靈石；八本全滿為 8 倍。
- **存檔**：`player.elementStudy = { metal, wood, water, fire, earth, ice, thunder, poison }`（缺的鍵視為 0）。
  舊存檔沒有此欄位時由 `DEFAULT_PLAYER_JSON` 補上 `{}`，不需 migrate。**轉世輪迴會清空**（與四維古籍 `studyCounts` 一樣，見第 25 節）。
- **八本秘典與作用位置**（`library.js` 的 `elementBooks`，加成由 `getElementBookBonus()` 算出，放進 `getPlayerCombatAttrs().book`，在 `elements.js` 的 `resolveHit()` 套用）：

  | 秘典 | key | 本命五行加成（該次直接傷害） | 效果加成 |
  |---|---|---|---|
  | 《庚金劍典》 | metal | 本命為金 | ⚔️重擊觸發時，該次傷害再 ×(1+加成) |
  | 《乙木長生訣》 | wood | 本命為木 | — |
  | 《癸水真經》 | water | 本命為水 | — |
  | 《丙火焚天錄》 | fire | 本命為火 | 🔥燒傷每層傷害 ×(1+加成) |
  | 《戊土玄黃功》 | earth | 本命為土 | — |
  | 《玄冰寒魄訣》 | ice | — | 目標**凍結中**時直接傷害 ×(1+加成) |
  | 《九霄雷典》 | thunder | — | ⚡雷擊觸發時，該次傷害再 ×(1+加成) |
  | 《萬毒真經》 | poison | — | ☠️中毒每層傷害 ×(1+加成) |

  - 各項加成**相乘**（例：本命金＋重擊時 ×1.1×1.1）。本命五行取自 `getPlayerElement()`，沒穿裝備（`null`）則五行秘典不生效。
  - 心魔是鏡像玩家的 `getPlayerCombatAttrs()`，因此也帶相同的秘典加成（渡劫勝負仍由擲骰決定，只影響過程）。
  - 靈寵攻擊不經 `resolveHit()`，不吃秘典加成。
- **介面**：`index.html` 的 `#library-modal` 分成兩個預設收合的抽屜（第 9 節）：「第一階段・四維古籍」（`#drawer-library-1`，靜態 HTML）與「第二階段・屬性秘典」（`#drawer-library-2` 內的 `#element-book-section`，
  由 `renderElementBooks()` 在開啟視窗與每次參悟後重繪，並列出目前持有的武學積分／靈草／靈石）。
  **新增秘典只要在 `elementBooks` 加一筆**；若要新增新的效果類型，需同時在 `getElementBookBonus()` 的預設值與 `resolveHit()` 的套用處加上。

## 25. 轉世輪迴

`leveling.js` 的 `triggerReincarnate()`，需境界達【仙人初境】（`realmIndex >= 10`）。比例由 `REINCARNATE_KEEP_RATE`（0.05）控制。

| 分類 | 內容 |
|---|---|
| 保留 5% | 四維與魅力：新值 = `10 + floor(前世 player.stats × 5%)`（只看基礎屬性，不含裝備） |
| 保留 5% | 氣血上限、靈力上限：取前世 `getMaxHp()`/`getMaxMp()`（含裝備、宗門、靈根、等級）的 5%，存入 `player.reincarnateBonus = { hp, mp }`，由 `getMaxHp()`/`getMaxMp()` 加上 |
| 遺忘 | 天賦分配（`player.talents` 清空重新點；轉世天賦點依輪迴次數另給，第 68 節）、境界（回凡人 1 階）、人物等級（Lv1）、`sect`（變回散修）與 `sectSkills`（可重新選宗門）、門派任務 `activeQuest`、四維古籍 `studyCounts`、屬性秘典 `elementStudy` |
| 重設 | 壽元回到凡人的 60 年、年齡回到 16 歲，氣血／靈力補滿新上限，輪迴次數 +1 |
| 卸下 | 身上裝備（`player.equipment` 各部位）全部放回背包 `equipInventory`，強制卸下不受背包上限 `MAX_EQUIP_INVENTORY` 限制；日誌記「輪迴之際，身上 N 件裝備盡數卸下」（2026-10-01 使用者指定，版本 `20261004o`；人物等級回 Lv1，要重新達到裝備等級才能再穿） |
| 不動 | 背包、靈石等資源、功德／七彩補天石／破障丹、僕從、靈寵（等級可能高於 Lv1 的人物，但之後的經驗受人物等級上限卡住）、靈寶閣武學 `learnedSkills` 與 `lingbaoSold`、每日任務／千寶閣 |

- **累積方式**：保留值是「覆寫」而不是「累加」——前世的數值本來就含上上世留下的部分，所以會自然滾動累積，不會重複計算。
- ⚠️ 舊版規則是「四維 = 10 + 輪迴次數×50、魅力 = 10 + 輪迴次數×10」且保留人物等級、宗門技能與秘典，已廢除。
- ⚠️ 平衡注意：高境界的氣血上限主要來自 `getBasePower()`（隨境界暴增），5% 仍可能是凡人境界的數萬倍
  （實測仙人初境以上約 1.5×10¹⁴ 氣血 → 保留約 7.5×10¹²），轉世後前幾個境界幾乎不會戰死。若要收斂，可改成只保留四維換算的部分，或對保留值設上限。
- **介面**：「命運抉擇」抽屜內轉世按鈕下方的 `.reincarnate-note` 備註保留／遺忘／卸下裝備（文字寫死 5%，**改 `REINCARNATE_KEEP_RATE` 時要一併改這段 HTML**）；
  確認視窗的文字則由常數自動產生。2026-10-01 起 `triggerReincarnate()` 改為 `async`，用 `gameConfirm`／`gameAlert`（ui.js）取代原生 `confirm`／`alert`。
- **舊存檔**：沒有 `reincarnateBonus` 時由 `DEFAULT_PLAYER_JSON` 補 `{hp:0,mp:0}`，`getReincarnateBonus()` 也會把缺值視為 0。已經在舊規則下轉世過的存檔維持現狀，不追溯。

## 26. 修煉節奏（境界經驗曲線）

- **舊版問題**：每階經驗 = `200 × 10^境界 × 階數`，每個大境界 ×10，但地圖經驗成長慢得多、禁區又要仙人初境才開放（2026-09-27 起第三區上古禁區改為煉虛開放，見第 20 節），
  化神後即使滿加成也要數天～數十年才能修滿（渡劫約 11 年、仙人初境之後以千年計），壽元也長期卡在底線。
- **新版**：`config-realms.js` 的 `realmPacing` 直接寫「每個境界要花幾小時」，由 `stats.js` 的 `getRealmStageExp()` 反推經驗：
  每階基數 = `hours × 3600 × (地圖 expRate × 15 × REALM_PACING_KILLS_PER_SEC(0.32) × expMult) ÷ 55`，取 2 位有效數字；
  （2026-09-28 怪物刷新改 10 秒後，實際每秒約 0.21 隻，但每隻收益 × `KILL_REWARD_MULT`(≈1.556)，0.32 仍是「等效擊殺」，此公式不用改，見第 33 節末）
  `getNextExp()` = 基數 × 目前階數（10 階合計 55 倍基數，所以剛好是 `hours`）。
  `expMult` 是「一般玩家」的估算加成：凡俗宗門 ×1.2 → 修真宗門約 ×2＋靈幻狐 = 2.2 → 至高宗門約 ×4＋狐＋蛟龍 = 5.28。

  | 境界 | 主要地圖 | 目標時間 | 每階基數 |
  |---|---|---|---|
  | 凡人 | 靈山大川 | 30 分 | 1,500 |
  | 煉氣 | 靈山大川 | 1 時 | 3,000 |
  | 築基 | 深淵險地 | 2 時 | 15,000 |
  | 金丹 | 上古遺跡 | 3 時 | 100,000 |
  | 元嬰 | 天南 | 5 時 | 350,000 |
  | 化神 | 亂星海 | 10 時 | 2,100,000 |
  | 煉虛 | 鬼谷八荒 | 20 時 | 1,400 萬 |
  | 合體 | 崑吾山（2026-09-28 起，原鬼谷八荒） | 2 天 | 4,600 萬（原 3,300 萬） |
  | 大乘 | 雷鳴大陸（同上） | 10 天 | 3.2 億（原 1.7 億） |
  | 渡劫 | 天淵戰場（同上） | 30 天 | 12 億（原 5 億） |
  | 仙人初境 | 荒古禁地 | 50 天 | 60 億 |
  | 天仙 | 上蒼（葬天島） | 100 天 | 200 億 |
  | 真仙 | 不死山（2026-10-03 前為冥界） | 150 天 | 360 億（原 540 億） |
  | 大羅金仙 | 仙界戰場 | 200 天 | 1,200 億 |
  | 混元大羅金仙 | 萬界戰場 | 200 天 | 2,000 億 |
  | 混沌道祖 | 混沌初界 | 300 天 | 6,000 億 |

  全程約 1,040 天（約 25,000 小時，線上與離線合計，離線經驗約為線上的 94%）。
- **只改 `hours` 就能調整節奏**，經驗門檻與壽元流逝（第 15 節）都會自動跟著換算；`realmPacing.map` 必須是 `maps` 裡存在的地圖名稱。
- **戰力曲線不變**：`getBasePower()` 原本有一項「目前修為 ÷ 100」，改成「修為進度百分比 × 舊版滿格值（`2×10^境界×階數`，凡人 `1×階數`）」，
  所以經驗曲線怎麼調，戰力都與舊版一致（實測相同進度下數值完全相同），怪物難度不受影響。
- **舊存檔**：修為可能遠超新門檻。`save.js` 的 `migrateRealmExp()` 把「待渡劫」者的修為壓回滿格；
  其餘保留，下次獲得經驗時 `gainExp()` 會連續升階，到 10 階後照常停在待渡劫（大境界仍須渡劫，不會一次跳好幾個境界）。

## 27. 功德系統（獵殺邪修／七彩補天石／破障丹）

設定在 `config-merit.js`，邏輯在 `merit.js`（懸賞榜在 `bounty.js`，第 36 節）。
流程：**斬殺敵對陣營修士 → 功德 → 滿 30,000 自動凝結七彩補天石 → 千寶閣珍貴物資（破障丹）**。功德只能換道具。

- **開放狀態**：2026-09-25 起 `config-activities.js` 的 `evil` 為 `implemented: true`。改回 `false` 即整體暫停：
  `isEvilHuntUnlocked()` 回傳 false（野外不出現修士、離線不累積功德、懸賞遇不到），`isMeritSystemOpen()` 為 false 時千寶閣**不顯示珍貴物資區**、渡劫**不提醒破障丹**。
- **解鎖**：活動選單「獵殺邪修」，聲望 8,000＋金丹（`isEvilHuntUnlocked()` 走 `getActivityLockReason()`）。
- **殺手殿堂場景**（2026-09-25）：活動「獵殺邪修」的 `openFn` 是 `openEvilHallScene()`，先開全螢幕場景 `#evil-hall-scene`
  （背景 `images/evil-hall.jpg`，937×625，玩家提供的洞窟浮台圖，`object-fit: cover` 置中），畫面正中央是 CSS 畫的橫式匾額「殺手殿堂」（`.evil-hall-plaque`，楷體金字、紅色呼吸光暈），
  **點匾額才 `openEvilHuntModal()`** 開懸賞榜；左上「↩ 離開」= `closeEvilHallScene()`。
  因為 cover 是置中裁切，圖片正中央永遠落在畫面正中央，所以匾額直接用 `left/top: 50%`，不需要像標題頁那樣換算座標。
  `#evil-hall-scene` 在 DOM 中排在 `#evil-hunt-modal` **之前**（兩者 z-index 都是 100），懸賞榜才會疊在場景上面。

### 陣營（正派／邪派）
- `getPlayerFaction()`：已拜入的每個宗門算 `FACTION_SECT_WEIGHT`(5) 分、每招學會的仙法算 1 分，依陣營加總；**邪派分數高於正派才是邪派**，同分（含散修）算正派。
  宗門陣營寫在 `config-sects.js` 的 `faction`（目前 `"邪"` 為凡俗的**皇朝**、修真的**天魔教**、至高的**九幽黃泉**，其他沒寫 = 正）；仙法陣營取 `config-spells.js` 的 `faction`。
  宗門列表卡片會標示「正派／邪派（影響懸賞榜陣營）」（`sect.js` 的 `renderSects()`）；獵殺邪修視窗的規則說明也依 `faction` 自動列出邪派宗門。
  ⚠️ 每個宗門權重相同，所以「一邪一正」會同分而算正派，要當邪派得拜入較多邪派宗門（或學較多魔功）。
- 正派玩家的懸賞榜列邪修、邪派玩家列正道修士。**兩者都拿功德**，只有說法不同（邪派的日誌寫「吸取對方功德」）。

### 善惡值
- `player.karma`：-3000～+3000（`KARMA_MAX`），新角色 0，轉世不重置。介面只顯示 **善（藍）／中立（灰）／惡（紅）**：≥ `KARMA_GOOD_THRESHOLD`(1000) 為善、≤ `KARMA_EVIL_THRESHOLD`(-1000) 為惡。
  顯示位置：洞府 HUD 道號旁（`#hud-karma`／`#pc-hud-karma`）、修仙分頁資源列（`#karma-display`）、獵殺邪修視窗。
- **殺邪派人士 → 善（+）、殺正派人士 → 惡（−）**（`addKarma()`，跨過門檻時寫日誌）：野外修士 ±5、暗殺者 ±10、懸賞人物 人／地／天榜 ±30／60／100（`BOUNTY_RANKS[].karma`）。
- **暗殺**：善 → 邪派刺客、惡 → 正道獵魔人，野外每波有 `AMBUSH_WAVE_CHANCE`(4%) 混入一名（`AMBUSH_ICON` 🥷，氣血與攻擊 ×`AMBUSH_POWER_MULT` 3）。中立時不會出現。
- 離線與背景補發**不計善惡值**、不會遇到暗殺者。

### 野外修士（取代舊版「每隻 1.6% 是邪修」）
- 野外修士**不是妖獸**：`combat.js` 每刷新一波，有 `FIELD_CULTIVATOR_WAVE_CHANCE`(5%) 混入**一名**，正道／魔道各半（圖示 `CULTIVATOR_ICONS` 🧙／🧛，氣血與攻擊 ×1.5）。
  敵人物件帶 `cultivator: "正"/"邪"`、暗殺者另帶 `ambush: true`；戰鬥實況標題顯示「修士×N」。
- 戰場實況的圖（2026-09-29，版本 `20261001x`）：`config-merit.js` 的 `CULTIVATOR_IMGS[陣營] = { img, pos }`，刷出野外修士時寫進敵人物件的 `img`／`imgPos`（只影響外觀）。
  目前有**正道修士**（玩家提供：持杖白髮老道 `images/monsters/righteous-cultivator.jpg`，pos 50% 28%）
  與**魔道修士**（2026-09-29，版本 `20261001z`；玩家提供：掌心黑焰、持骷爪法杖的魔道術士 `images/monsters/demonic-cultivator.jpg`，pos 50% 25%）。
  **暗殺者**另用 `AMBUSH_IMG`（2026-09-29，版本 `20261001y`；玩家提供：黑甲持弩的白髮殺手 `images/monsters/assassin.jpg`，pos 50% 30%），不分陣營都用這張。
  戰場的敵方區是窄長條，所以左上角的弩只會露出一部分，人物本身完整。野外修士與暗殺者現在都有圖；emoji（🧙／🧛／🥷）仍用於日誌與沒有圖時的備援。
  **懸賞對決（獵殺邪修）**（2026-09-29，版本 `20261002g`；玩家回報「仙魔戰場獵殺邪修的殺手圖片沒有改」）：原本對手物件沒有 `img`，戰場只顯示 emoji。
  `bounty.js` 的 `startBountyDuel` 改為依對手陣營帶入同一張表 `CULTIVATOR_IMGS[entry.faction]`（邪修＝魔道修士圖、正道＝正道修士圖）。
  同一波裡修士排在妖獸後面，所以要等前面的妖獸倒下、輪到修士時才會換成他的圖（和妖獸一樣，都顯示目前在打的那隻）。
- 斬殺時 `onCultivatorKilled()`：改善惡值、`evilKills` +1；**只有敵對陣營給功德** `FIELD_MERIT_MIN`～`FIELD_MERIT_MAX`(1～10)，同陣營不給（日誌註明）。
- 離線（野外）：波數（戰鬥 tick ÷ `IDLE_WAVE_AVG_MONSTERS`）× 5% × 一半敵對 × 平均 5.5 功德，每小時約 50 功德。
- ⚠️ 功德改成 3 萬凝結一顆補天石後，野外修士（1～10）只是零頭，**補天石的主要來源是懸賞榜**（1～3000，平均 1,500，約 20 名換一顆）。

### 七彩補天石與破障丹
- **七彩補天石**：`player.butianStones`。身上功德每滿 `MERIT_PER_BUTIAN_STONE`(30,000) **自動凝結**一顆（`settleMeritStones()`，在野外斬殺修士、懸賞伏誅、離線結算、讀檔時呼叫）。
  ⚠️ 舊版是千寶閣按鈕「100 功德換 1 顆」（`exchangeMeritForStone`，已移除）。
- **破障丹**：`player.breakPills`，在千寶閣以 `BREAK_PILL_STONE_COST`(1，2026-09-29 由 5 改) 顆補天石購買（`buyBreakPill(qty)`）。
  渡劫時若持有會**自動服用 1 顆**：心魔戰力 ×`BREAK_PILL_DEMON_POWER_MULT`(0.9)、勝算 +`BREAK_PILL_CHANCE_BONUS`(10%)、上限提高到 `BREAK_PILL_MAX_CHANCE`(90%)。見第 7 節。
- **千寶閣珍貴物資區**：`renderPreciousSection()` 嵌在 `renderAuction()` 的商品下方，**常駐、不佔每 3 小時刷新的 5 格**。
  「只能用七彩補天石購買的珍貴物資」之後要新增，也加在這一區。
- **七彩發光外觀**：`index.html` 的 `.rainbow-text`（漸層流動文字）與 `.rainbow-glow`（卡片框線與光暈循環變色），
  用於千寶閣珍貴物資、背包、角色資源列、獵殺邪修視窗；`prefers-reduced-motion` 時停用動畫。顯示資料在 `preciousItems`。
- **背包**：`renderBag()` 會列出補天石與破障丹（七彩卡片、不能直接使用）；角色面板資源列也顯示功德／補天石／破障丹。
- **存檔**：`merit`/`butianStones`/`breakPills`/`evilKills`/`karma` 與懸賞榜欄位都在 `player` 上，舊存檔由 `DEFAULT_PLAYER_JSON` 補預設值；轉世不重置。

## 28. 符寶與鑲嵌孔（符寶坊）

設定在 `config-talisman.js`，邏輯在 `talisman.js`。流程：**傳說僕從礦脈採礦 → 礦石 → 符寶坊煉製符寶 → 鑲嵌到橙裝孔位**。

- **孔位**：`SOCKET_QUALITY`(橙色) 的武器／防具／飾品帶 `SOCKET_MIN`～`SOCKET_MAX`(1~3) 個孔，**神器不開孔**。
  資料在裝備物件上：`eq.sockets = [null 或 { type, grade }, ...]`。一律由 `ensureSockets(eq)` 產生（沒有 `sockets` 才開孔，重複呼叫不會重抽）：
  - 鍛造閣 `forgeOneEquipment()`、千寶閣 `rollAuctionEquip()`（上架時就決定，買家看得到）、靈寶閣兌換。
  - **舊裝備不補孔**：只有更新後新鍛造／上架／兌換的橙裝才有孔；更新前就持有的橙裝、更新前上架的千寶閣商品都維持無孔。
    `save.js` 的 `migrateEquipSockets()` 只負責補上 `player.talismans` 欄位。
  - **日後新增任何取得裝備的管道，都要對新裝備呼叫 `ensureSockets()`。**
- **符寶種類**（`talismanTypes`，11 種）：四維符 `str/con/int/spr`（加固定點數）、戰鬥屬性符 `def/eva/ice/fire/poison/metal/thunder`（五行加 %；**護體／身法符自第 66 節起是防禦／閃避點數**，2026-10-03 版本 `20261005D` 起 `formatTalisman` 顯示「防禦 +3」「閃避 +5」，不再寫 %）。
- **煉製一律隨機**（`craftTalisman(qty)` → `rollTalisman()`）：無法指定種類或品階；種類 11 選 1 平均，品階依 `chance`。
  每次成本固定 `TALISMAN_CRAFT_COST` = **500 礦石＋1,000,000 靈石**（2026-09-24 由 5 萬調高），支援 ×1／×10／最高，日誌彙整煉出的種類與數量。

  | 品階 | 四維符 | 屬性符 | 出現機率（暫定） |
  |---|---|---|---|
  | 下品 | +100 | +1% | 70% |
  | 中品 | +400 | +2% | 25% |
  | 上品 | +1,500 | +3% | 5%（實測 200 次出 12 枚） |

- **生效**：`stats.js` 的 `getEquipBonus()` 把每件已穿戴裝備的 `getSocketStats(eq)` 加進總和，所以四維與戰鬥屬性一起生效；
  戰鬥屬性仍與裝備、靈根加總後套上限（減傷 60%、閃避 40%、屬性傷害 50%）。背包中的裝備不生效。
- **持有**：`player.talismans = { "種類_品階": 數量 }`（例 `def_3`）。
- **鑲嵌**：符寶坊列出所有有孔的裝備（穿戴中在前），空孔選符寶按「鑲嵌」（`inlayTalisman`）。
- **拆卸**：已鑲嵌的可按「打掉」（`removeTalisman`，會 `confirm`），**符寶碎裂消失**、孔位變回空的；毀棄裝備時上面的符寶一併消失。
- **顯示**：`formatSockets(eq)` 在背包、角色裝備欄、千寶閣卡片列出「🔮 孔位 N：[符寶] [空]」。
- **設施**：宗門與設施抽屜的「🔮 符寶坊」（`#btn-sect-talisman`，身在宗門才顯示，需已拜入宗門）。
- **合成與極品**（2026-10-03，版本 `20261005C`，使用者定案）：`talismanGrades` 加 `grade 4` 🌟極品（四維 新制 +1.0（`NV2.talismanFlat[4]`）、屬性 +5、剋制 +15%；`chance 0` 煉製不會出，`color`／`icon` 金字顯示）。
  `TALISMAN_MERGE`：同種類 下品×3→中品（50 萬靈石）、中品×4→上品（200 萬）、上品×5→極品（1000 萬），一定成功；一枚極品＝60 枚下品（指定種類約煉 940 次）。
  `talisman.js` 的 `renderTalismanMerge`（符寶坊「⚗️ 合成」區，只列數量夠的）／`mergeTalisman(type, grade, qty)`（1 次或全部）；只用持有中的，鑲在裝備上的不算。
  煉製機率說明只列 chance > 0 的品階；鑲嵌下拉選單用 `stripTalismanTags` 去掉極品的顏色標籤。剋制符同規則（同一族上限 +20% 不變）。
  驗證（本機）：13 下品力量 → 4 中品剩 1；上品誅邪 ×5 → 極品（對魔修 +15%）；鑲極品力量符 +1.0；煉製 2 萬次品階 70／25／5、沒有極品；Console 無錯誤。
- **礦石產量參考**：一名傳說僕從每小時約 60 趟 × 平均 15.5 = 930 礦石（花費 18,000 靈石），約可煉製 1.9 次。

## 29. 裝備等級（鍛造閣）

- 鍛造閣先選部位，再選**裝備等級**（`config-equipment.js` 的 `EQUIP_LEVELS`）：10／50／100／200／300／400／500／700／800／1000。
  每個等級都會隨機出白／綠／藍／紫／橙五種品質（機率不變：橙 5%、紫 10%、藍 20%、綠 30%、白 35%）。
- **可鍛造上限**依「目前所屬宗門」階段（`getSectTier()`，`FORGE_LEVEL_CAP_BY_TIER`）：初級宗門 ≤100、中級 ≤500、高級 ≤1000。
  `renderForgeLevelSelect()` 在開啟鍛造閣時只列出可選的等級（預設最高）；`forgeEquipment()` 也會再檢查一次。
- **打出哪一件**（2026-09-26）：依等級從該部位的可製作清單隨機抽一種（10～100 凡俗、200～500 修真、700～1000 至高，各 5 種，五行各一），見第 37 節。
- **數值**：四維基數 = 等級 × `EQUIP_LEVEL_STAT_MULT`(5) × 品質倍率（白 1／綠 2／藍 3／紫 5／橙 8），再依該裝備的四維模板分配（`gear.js` 的 `buildGearStats()`）。
  例：500 等橙劍力量 2 萬、1000 等橙裝 4 萬（與靈寶閣高級寶物相當）。減傷／閃避／屬性傷害仍只看品質。
  ⚠️ 舊版鍛造是依「境界」算數值，改版後與境界無關。
- **穿戴限制**：裝備帶 `level` 欄位，`equipItem()` 要求**人物等級 ≥ 裝備等級**；卡片名稱前顯示「Lv.N」（`formatEquipLevel()`，等級不足時標紅）。
  舊裝備、千寶閣、靈寶閣的裝備沒有 `level`，不受限制。
- **費用**：`FORGE_COST` 每次 10,000 靈石（不分等級）。
- **打出後自動分解**（2026-09-30，版本 `20261003r`，使用者要求「裝備製作增加按鈕可以自動分解選擇等級的裝備」＝依品級）：
  - 鍛造閣「×1／×10／最高」上方一排品級勾選（`#forge-auto-decompose`，equipment.js 的 `renderForgeAutoDecompose`，開鍛造閣時產生）；勾選存在 `player.forgeAutoDecompose`（品級名稱陣列，用到時才建立），勾紫、橙時先確認。
  - `forgeEquipment`：打出勾選品級的裝備立刻從背包拿掉，產出照一般分解（`getDecomposeYield`：白～紫碎鐵、橙 3 顆星允鐵），整批加總後入帳；日誌多一行「鍛造閣自動分解 N 件，獲得…」，成功提示也列出。
    仍算天磯錄收藏與每日任務的鍛造次數（有打造就算）。
  - 次數上限：沒勾選時照舊受背包空位限制；有勾選時「最高」改為最多 `FORGE_AUTO_MAX_BATCH`（1000）次，逐件打、背包滿了就停並寫日誌；五個品級全勾時背包滿也能打，只勾部分品級時背包已滿仍會擋。
  - 驗證（本機）：勾白綠藍 ×10 → 10 件全分解、碎鐵 190；全勾「最高」→ 打 1000 次、背包不變、星允鐵 +206；只勾白、背包剩 3 格 ×50 → 打 8 次（5 件白分解、3 件留下）後停；手機畫面正常，Console 無錯誤。

## 30. 發佈版本號與讀檔失敗保護

### 事故紀錄（2026-09-23）
玩家更新後讀檔跳出「本地存檔格式損毀」。**存檔本身沒有壞**：GitHub Pages 會快取檔案約 10 分鐘，
瀏覽器拿到「舊 index.html（沒有 `#age-display`）＋新 ui.js」，`updateUI()` 對不存在的元素寫入而拋出 TypeError；
舊版 `loadLocal()` 把任何例外都當成「格式損毀」，接著 `startGame()` 直接跳性別選擇——**玩家一選性別，新角色就會覆蓋原存檔**。
（以 8 種舊存檔形態測試目前程式皆可正常讀取；移除 `#age-display` 即可重現同一錯誤。）

### 1. 發佈版本號（防止新舊檔案混用）
- `index.html` 的每個 `<script src="data/xxx.js?v=版本">` 都帶 `?v=`（目前 `20261005CZ`，gm.html 同；2026-10-01 起 Service Worker 也以這個版本號區分快取，換版本號＝玩家下次開啟時自動換新快取，第 64 節）。
- **每次推上 GitHub Pages 前，把所有 `?v=` 全部取代成新值**（例：日期＋序號）。新 index.html 會指向新網址的 JS，不會再拿到快取的舊檔。**gm.html 也有 `?v=`（2026-09-28 起），要一起改。**
- 新增 `data/*.js` 時也要記得帶上 `?v=`。
- **2026-10-03 起（第 72 節）**：網站可改由 GitHub Actions 發佈建置後的 `dist/`：`index.html` 的 data 腳本被換成單一 `data/game.js?v=版本`、gm.html 換成 `data/gm-lib.js?v=版本`，版本號沿用 index.html 的 `?v=`（所有 `?v=` 必須一致，否則建置失敗）。

### 2. 讀檔失敗保護（`save.js`）
- `loadLocal()` 分開處理兩種失敗：`JSON.parse` 失敗（存檔真的壞了）與 `applySaveData()` 拋錯（多半是版本混用）。
- 失敗時 `reportLoadFailure()`：
  1. 設 `saveLoadFailed = true` → `saveLocal()`（含每 30 秒自動存檔、切背景存檔）**一律不寫入**。
  2. 原始存檔另存到 `localStorage['xiuxian_save_backup']`（時間在 `xiuxian_save_backup_at`）。
  3. 顯示 `#load-error-modal`：錯誤原因（真正的例外訊息）、依原因給的建議，以及三個選項（沒有關閉鈕、不用 alert/confirm）：
     - 🔄 重新整理再試一次：`retryLoadAfterFailure()` 以 `?reload=時間戳` 重新載入，避開快取的舊 index.html。
     - 📋 顯示原始存檔代碼：`showRawSaveForCopy()` 把原始存檔放進文字框並嘗試複製（可貼到「匯入存檔」救回）。
     - 🗑️ 放棄存檔開新角色：`abandonSaveAndStartNew()`，**要按兩次**；備份仍保留。
  - 若頁面是舊版 index.html（沒有這個視窗），退回用 `alert` 說明，寫入一樣被封鎖。
- `main.js` 的 `startGame()`：`loadLocal()` 失敗且 `saveLoadFailed` 時直接返回，**絕不自動進入開新角色**。
- ⚠️ 新增讀檔邏輯時，任何「可能覆蓋存檔」的路徑都要先檢查 `saveLoadFailed`。

### 3. 刪除存檔後重新整理（事故紀錄 2026-09-24）
- `main.js` 在切到背景（`visibilitychange`）與離開頁面（`pagehide`）時會自動 `saveLocal()`。
  `location.reload()` 本身就會觸發 `pagehide`，所以「刪存檔 → reload」會在離開前把目前角色**寫回去**——
  曾造成「🔄 遊戲重新開始（完全重置）」按了沒有重置。
- 規則：**任何刪除存檔的路徑，都要先設 `gameOver = true` 再 `removeItem`**（`saveLocal()` 看到 `gameOver` 就不寫入）。
  目前的 `resetGameCompletely()`（save.js）與 `triggerLifespanGameOver()`（lifespan.js）都已這樣做。

## 31. 洞府主畫面（舞台版面）

背景圖 `images/home-bg.jpg`（**704×1520**）本身就是介面：頭像框、名字框、兩個資源框、左右側按鈕、底部導覽都**畫在圖上**。
程式只負責把即時數值疊進框裡，並在圖上的按鈕位置放透明點擊區。

### 舞台與對齊
- `#app-frame`（外框，fixed 置中）包住 `#app-stage`（舞台，relative）。`home-ui.js` 的 `layoutStage()` 依**顯示尺寸設定**（第 34 節）計算：
  手機版舞台滿版填滿（最寬 9:16，背景圖 `object-fit: fill` 伸縮）；PC 版為 16:9 外框，舞台保持原圖比例在左、分頁面板在右。
  多出的邊由 `body::before` 用同一張圖放大模糊補底（PC 版換成 home-bg-pc.jpg）。視窗縮放、轉向、進出全螢幕時重算。
  ⚠️ PC 版改用獨立的 `#pc-stage` 與橫式圖（第 34 節），本節的座標只適用手機版。
- CSS 變數 `--u` = min(舞台寬 ÷ 704, 舞台高 ÷ 1520)，字級與間距一律 `calc(var(--u) * 圖上像素)`（舞台被壓扁時取較小值，文字不溢出）。
- 疊加元素的 `left/top/width/height` 一律寫成「**圖上座標 ÷ 704（橫向）或 ÷ 1520（縱向）**」的百分比。
  ⚠️ **換背景圖時**：要改 `STAGE_IMG_W`/`STAGE_IMG_H`，並重新量 index.html 內所有 `%` 座標（HUD、熱點、側邊按鈕、底部導覽、`#tab-sheet`）。

### 元素對照（圖上座標，704×1520）

| 元素 | 位置 | 內容／功能 |
|---|---|---|
| `#hud-avatar` | 頭像框 (28,34) 124×124 | 玩家頭像（`getPlayerAvatar()`：玩家選用的頭像，未選則依性別），蓋住圖上的預設頭像；**點擊開啟更換頭像視窗**（第 32 節） |
| `#hud-name` | 名字框 (159,47) | 道號、境界階數（待渡劫會標示）、Lv 與等級進度條、戰力 |
| `#hud-coins` | 左資源框（元寶） | 靈石（`formatShortNumber`：萬／億縮寫）；圖示上蓋「靈石」標籤，點擊顯示說明（第 47 節） |
| `#hud-rep` | 右資源框（圖上原為「仙玉」，寶石圖示） | **聲望**；圖示上蓋「聲望」標籤，點擊顯示說明（第 47 節） |
| `#hud-stats` | 資源框下方（新增的半透明面板） | 氣血／靈力／修為條、修煉效率（`getCultivationRate()` = 宗門經驗倍率 × 靈寵加成）；最下列左側 `#btn-settings`「⚙️ 設定」開啟設定視窗（第 34 節） |
| 熱點「升仙台」 | 寶塔 | `openAscensionPlatform()`：待渡劫時 `triggerTribulation()`，**確認開始後自動切到戰鬥分頁**（取消則留在洞府，2026-09-26）；否則提示修為進度；待渡劫時牌匾亮紅點 |
| 熱點「千寶閣」（舊牌匾名「領物閣」，2026-09-25 改名） | 山中發光洞口 | `openActivity('auction')`（千寶閣，未解鎖會提示條件） |
| 熱點「宗門」 | 左側山門 | 切到宗門分頁 |
| 熱點「僕從小屋」 | 右側屋舍 | `openServantModal()` |
| 熱點「天磯錄」（2026-09-26） | 寶塔右側尖峰 (430,300) 140×170 | `openCodexModal()`（第 37 節） |
| 熱點「大道石碑」（2026-09-28） | 升仙台與天磯錄之間 (396,380) 38×144；圖上沒畫，石碑由 `.plaque-stele` 畫出 | `openLeaderboardModal()`（第 42 節） |
| 側邊「任務」「背包」 | 左側 | 任務 = `switchTab('task')` 開啟任務分頁（宗門任務＋活動，2026-09-25 改；原本直接開門派任務彈窗）；背包 = `openBagModal()` |
| 側邊「丹藥堂」（圖上原字「特惠商城」，2026-09-25 改名） | 右側 | `openShopModal()`（丹藥堂）。按鈕內的 `.nav-label-cover.stage-label-cover` 以深色圓角底＋楷體字蓋掉圖上的字（蓋字區比按鈕寬，向兩側延伸）。PC 版圖上沒有這顆按鈕 |
| 側邊齒輪「系統」`#stage-gear-btn`（2026-09-25 新增） | 右側、丹藥堂正上方 (615,1073) 62×62 | **圖上沒有，程式畫的**：深底金框圓鈕＋⚙️，下方 `.stage-label-cover` 寫「系統」。點擊 `openSystemModal()` 開啟 `#system-modal`（命運與系統：存檔管理＋命運抉擇兩個抽屜）。`#system-modal` 在 DOM 中排在 `#save-code-modal` 之前，匯出／匯入存檔視窗才會疊在上面 |
| 側邊「郵件」「充值」 | 左／右 | 遊戲沒有對應功能 → `showUnderConstruction()` 顯示「興建中」 |
| 底部導覽 | 修仙／戰鬥／洞府／**情緣**／世界 | 修仙、戰鬥、洞府為 `switchTab()`；選中的按鈕有金色光暈（`.nav-btn.active`）。<br>**情緣**：圖上原字「宗門」用 `.nav-label-cover`（深色底＋楷體字，位置相對於按鈕）蓋掉改寫，點擊 `openPartnerModal()`（情緣・夥伴，第 39 節），沒有 `data-nav`。宗門分頁改由洞府的「宗門」山門熱點進入。<br>**世界**：`openWorldTab()` = 切到世界分頁並跳出修仙地圖彈窗 |

### 分頁（底部導覽）
- `switchTab(tab)` 設定 `body[data-tab]`：`home`（洞府）只顯示背景與熱點；其他分頁在 `#tab-sheet`（圖上 y 212～1372 之間）顯示面板。
- 原本的面板仍在 `#game-container` 內（所有 id 不變，`updateUI()` 照常寫入），用 `data-tab` 標記屬於哪個分頁（可多個，以空白分隔）：

  | 分頁 | 面板 |
  |---|---|
  | 修仙 `cultivate` | `#header`（境界、壽命、狀態條等詳細資訊）、修士面板（四維、戰鬥屬性、裝備、技能、自動輔助、資源） |
  | 戰鬥 `battle` | 戰場實況＋渡劫按鈕＋日誌（`#battle-panel`）——**不再有修仙地圖** |
  | 宗門 `sect` | 宗門與設施（入口：洞府「宗門」山門熱點） |
  | 任務 `task` | 宗門任務（「📜 門派任務」按鈕 → `openQuestModal()`）、活動 `#activity-list`（每日任務、千寶閣、獵殺邪修…）。入口：手機洞府左側「任務」按鈕；沒有底部導覽按鈕，PC 版目前沒有入口 |
  | 世界 `world` | 只剩「🗺️ 修仙地圖」按鈕——**活動已移到任務分頁、命運與系統改成齒輪開啟的 `#system-modal`**（皆 2026-09-25） |

- **修仙地圖**（2026-09-25 改）：不再是分頁內的面板，改成獨立彈窗 `#world-map-modal`（五個區域按鈕＋目前所在，`map.js` 的 `openWorldMapModal()`）。
  開啟方式：點「世界」導覽（手機底部、PC 右下）時自動跳出、世界分頁頂端的按鈕。（PC 版傳送門熱點已移除）
  `#world-map-modal` 在 DOM 中排在 `#map-category-modal` **之前**，選區域時的地圖清單才會疊在上面；`selectMap()` 選定後兩層一起關閉。
- 分頁內的設施抽屜**預設展開**、任務分頁的活動清單直接列出（無抽屜）（分頁本身就是選單）；`#system-modal` 內的存檔管理與命運抉擇仍預設收合。
- **新增面板**：放進 `#game-container` 並加上 `data-tab="分頁名"` 即可。

### 其他
- 標題畫面期間 `body.title-mode` 會隱藏 `#app-frame`。`main.js` 的 `window.onload` 先 `initHomeUi()` 再 `initTitleScreen()`。
- `updateUI()` 結尾呼叫 `updateHomeHud()`，所以 HUD 與原面板永遠同步。
- 彈出視窗（`.modal-bg`，z-index 100）仍是全螢幕，蓋在舞台上方。
- 背景圖只有 704 寬，在高解析手機上會略微放大；若之後有更大的同構圖，直接替換並依上方警語重新量座標即可。

## 32. 頭像更換（可解鎖）

- **入口**：點洞府左上的頭像（`#hud-avatar`）→ `openAvatarModal()` 開啟 `#avatar-modal`，列出全部頭像（已解鎖／使用中／鎖定與條件、目前進度）。
- **不分性別**，所有頭像男女修都能用；`player.avatarId = null` 時依性別顯示預設的韓立／南宮婉（`getPlayerAvatar()`）。
- **解鎖方式：花靈石購買**。除了預設的韓立／南宮婉，其餘 10 個頭像都是 `unlock: { type: "coins", value: AVATAR_UNLOCK_COINS }`，
  目前 **每個 10,000,000 靈石（1000 萬）**（`config-avatars.js` 的 `AVATAR_UNLOCK_COINS`，改這一個常數即可全部調價；個別頭像也可寫不同 `value`）。
  - 在選擇視窗點未解鎖的頭像 → `buyAvatar(id)`：靈石不足會提示；足夠則 `confirm` 後扣款、加進 `player.unlockedAvatars` 並**立即換上**。
  - 已解鎖的不會重複扣款；**解鎖後永久保留**（轉世也不會失去；選用中的頭像也保留）。
  - 卡片顯示「💰 10,000,000 靈石解鎖」，靈石不足時轉紅並註明。
  - 價格參考：線上掛機每小時靈石約 2 萬（野外初期）～1000 萬（禁區以上封頂，第 23 節），所以一個頭像約是後期 1 小時的收入。

  | 頭像 | id |
  |---|---|
  | 韓立／南宮婉（預設，免費） | `male` / `female` |
  | 執扇仙子、琵琶仙子、茵茵（舊名花仙童女） | `fan-fairy` / `pipa-fairy` / `flower-girl` |
  | 葉凡（舊名藍衣少年）、亂星海大善人、銀髮劍仙 | `blue-youth` / `starsea` / `silver-swordswoman` |

  ※ 改名只改 `name`，**`id` 不可改**（存檔的 `avatarId`／`unlockedAvatars` 記的是 id，改了會讓已購買的頭像失效）。
  | 妖妖、羅峰、姜太虛、少年人皇 石昊 | `yaoyao` / `luofeng` / `jiang-taixu` / `golden-emperor` |

- **條件類型**（`checkAvatarCondition()`）：`coins`（購買）之外，程式仍支援「達成即自動解鎖」的 `realm`／`level`／`reputation`／`tribulation`，
  由 `updateUI()` 呼叫的 `checkAvatarUnlocks()` 判定（`coins` 類型會被略過，一定要玩家自己買）。之後想讓特定頭像改回成就解鎖，改該筆的 `unlock` 即可。
  ※ 改版前曾短暫使用成就解鎖；當時已自動解鎖的頭像記錄在存檔的 `unlockedAvatars`，會維持已解鎖。
- **新增頭像**：圖片裁成正方形（建議 256×256、臉部置中）放進 `images/avatars/`，在 `config-avatars.js` 的 `avatarList` 加一筆。
  `id` 會寫進存檔，**上線後不要改名**（改名會讓已解鎖／使用中的紀錄失效，退回預設頭像）。
- **圖片處理紀錄**：`images/avatars/` 的圖是用 .NET System.Drawing 從玩家提供的原圖依臉部位置裁正方形、縮成 256×256（JPEG 品質 90）。
  三位仙子取自三聯圖（解析度較高），妖妖的原圖只有 225×225，放大後較模糊，有更清楚的圖可直接替換同檔名。
- **顯示位置**：洞府頭像框（`home-ui.js`）、戰鬥分頁的戰場實況（`ui.js` 的 `updateCombatVisualPanel`）都用 `getPlayerAvatar()`；
  開場性別選擇視窗仍固定顯示韓立／南宮婉。

### 頭像光環（2026-09-26，`config-avatar-frames.js`、`avatar.js`）
- **是什麼**：疊在頭像上的華麗圓框，25 種。配戴後**洞府頭像（手機 `#hud-avatar-frame`、PC `#pc-hud-avatar-frame`）與仙魔戰場實況頭像**都會顯示。
  在頭像選擇視窗下半部「💫 頭像光環」配戴／卸下（`selectFrame(id | null)`），預覽用的是目前的頭像。
- **解鎖**（條件格式同頭像，`checkAvatarCondition`；達成類由 `checkAvatarUnlocks` 一併呼叫 `checkFrameUnlocks` 自動解鎖）：

  | 類別 | 光環 |
  |---|---|
  | 預設 | 素銀月環 f19、青玉流光 f12 |
  | 境界 1～15（煉氣～混沌道祖，每境界一個） | 碧落寒光、冰紗仙羽、紫璃冠冕、赤心金翼、朱雀靈環、翠玉神環、紫羽仙環、金桂月輪、古金蓮紋、蒼穹金冠、聖翼金環、碧海冰晶、霜翼銀輝、紫霞鳳冠、金翎聖晶 |
  | 累計渡劫成功 3／10 次 | 日曜金輪 f17／赤焰鳳冠 f05 |
  | 花靈石購買（圖上印有 VIP 字樣） | VIP 1～5：1000 萬／3000 萬／1 億／3 億／10 億；翠玉象神・5VIP：30 億 |

- **對位方式**：每個光環記錄內圈（放頭像的洞）`ring: { cx, cy, r }`（圖寬比例）。`getFrameOverlayBox(fr)` 算出光環相對於「頭像方框」的 %
  （邊長 = `AVATAR_FRAME_HOLE_FIT`(0.95) ÷ 2r，洞略小於頭像，頭像邊緣藏在框下）。
  - 戰場實況與選擇視窗：`renderFramedAvatar(avatar, frame, size)` 產生 `.framed-avatar`（頭像 `.fa-face` ＋ 光環 `.fa-frame`），大小由外層決定；
    手機版的戰場頭像縮小改寫在 `#battle-player-icon .framed-avatar`（原本 `#battle-player-icon img` 的規則會把光環也縮成頭像大小）。
    戰場實況每秒重繪，內容沒變時不重寫 innerHTML（`dataset.html` 比對），避免圖片重新載入閃爍。
  - 洞府 HUD：`home-ui.js` 的 `updateHudAvatarFrames()` 依 `HUD_AVATAR_BOXES`（**須與 index.html 的 `#hud-avatar`／`#pc-hud-avatar` CSS 同步**）換算舞台 %。
    光環的翅膀會延伸到名字框，所以 `#hud-name`／`#pc-hud-name` 設 `z-index: 2` 疊在光環（`z-index: 1`）上面。
- **存檔**：`player.avatarFrameId`（null = 不戴）、`player.unlockedFrames`，轉世保留。`id`（f01～f25）不可改。
- **圖片處理紀錄**：來源是玩家提供的頭像框展示圖（735×1115，5×5 縮圖，每格約 130px），`tools/cut-avatar-frames.ps1`：
  1. 依量得的格線裁切（每格外擴 5px，再清掉邊緣 3px，去除縮圖卡片的框線）；抹掉 WEBP 標籤與放大鏡圖示。
  2. 背景轉透明（color-to-alpha：以裁切四角的背景色為基準，反推每個像素的 alpha 與原色；WEBP 兩格的底是純黑，另外指定）。
  3. 內圈量測：從中心打 72 道射線找內緣、取中位數半徑，垂直中心迭代修正（水平固定在正中，框都左右對稱）；f22 量不準，手動修正為 (0.5, 0.56, 0.30)。
  ⚠️ 解析度受限於展示圖（每個約 130px），放大看邊緣有些雜點。**若有原始 PNG（300～1152px、透明底），直接以同檔名替換 `images/frames/` 即可**，
  但內圈位置可能不同，要重新量 `ring`（可用工具的量測邏輯，或目測後修改）。

## 33. 背景掛機補發（縮小視窗／切 App／鎖螢幕）

**問題（2026-09-24 實測）**：遊戲靠 `setInterval(combatTick, 1000)` 推進，瀏覽器會節流背景分頁的計時器——
App 內建瀏覽器隱藏約 2 分鐘後降到每分鐘約 31 次（半速）；一般 Chrome 背景 5 分鐘後可能降到每分鐘 1 次；手機切 App／鎖屏通常完全暫停。
而離線結算只在讀檔時執行，所以回到畫面後這段損失**不會補回**。

**做法**（`save.js`）：
- `combatTick()` 開頭呼叫 `checkBackgroundCatchUp()`：記下每次 tick 的時間 `lastTickAt`，兩次間隔超過 `BACKGROUND_TICK_SLACK_MS`(1500ms)
  就把「間隔 − 1 秒」累積到 `missedTickMs`（只算沒跑到的時間，已執行的 tick 不重複計）。
- 累積滿 `BACKGROUND_SETTLE_MIN_SECONDS`(10) 秒就以 `settleIdleSeconds(秒數, "背景掛機時")` 補發，只寫日誌、不跳 alert；單次上限 24 小時（同離線）。
- `settleIdleSeconds()` 是從 `calcOfflineProgress()` 抽出的共用結算：經驗、靈石、聲望、功德、救僕從、壽元流逝（×`LIFESPAN_OFFLINE_RATE`）、靈寵維持費，
  **公式與離線掛機完全相同**，改離線收益時兩者同步生效。
- 渡劫中、已死亡、`gameOver` 時不補發，並丟棄累積時間。
- 與讀檔離線結算不會重複：切到背景時 `visibilitychange` 會存檔更新 `lastSaveTime`；
  若分頁在背景被瀏覽器結束，下次讀檔從該時間算離線；若分頁恢復執行，則由背景補發處理。
- 附帶效果：`alert`/`confirm` 視窗開著時 JS 會暫停，關閉後這段時間也會被補發（視同時間流逝）。
- 目前離線／背景補發**不推進門派任務與僕從任務**（沿用原本離線結算的行為）。

### 離線／背景的實力判定（`save.js` 的 `estimateIdleCombat()`，2026-09-24）
**問題**：舊版離線固定每秒 0.3 隻、也不會死，不看實力。開放世界（天南／亂星海／鬼谷八荒）沒有進入門檻，
新角色走進鬼谷八荒後立刻關網頁，離線 24 小時可拿約 3.9 億基礎經驗（線上第一秒就會戰死）；背景補發共用同一公式，一樣可被利用。

**戰鬥實測（2026-09-24，用 combatTick 模擬 3 萬秒、角色不會死）**：每秒擊殺上限被「每波後刷新 5 秒＋生成 1 秒」卡住，
一擊斬殺時約 0.33 隻（有群攻技能約 0.38 隻）；普攻一次只打第一隻，所以需要多下才殺得死時掉得很快：

| 殺一隻需要 | 每秒擊殺 | 每隻平均存活（含排隊） |
|---|---|---|
| 一擊 | 0.33 | 2.5 秒 |
| 約 2 下 | 0.24 | 5 秒 |
| 約 3 下 | 0.19 | 8 秒 |
| 約 6 下 | 0.12 | 16 秒 |
| 約 11 下 | 0.07 | 28 秒 |

→ 修煉節奏表（`realmPacing`）、壽元流逝、每小時靈石估算都假設「一擊斬殺」；實力超過一擊斬殺後，再變強也不會在同一張地圖更快，戰力的作用是解鎖更高倍率的地圖。

**做法**：野外離線／背景補發時，`settleIdleSeconds()` 先呼叫 `estimateIdleCombat()`（只取期望值，不擲骰）：
- **擊數** `hits` = 無條件進位(妖獸氣血 ÷ (玩家物理攻擊 × (1 − 妖獸減傷))) ÷ 未閃避率。妖獸氣血 = 難度 × 500、攻擊 = 難度 × 50，減傷／閃避取自 `monsterAttrsByMapCategory`。
- **效率** `rateMult` = (GAP + N × 一擊所需) ÷ (GAP + N × hits)，N = `IDLE_WAVE_AVG_MONSTERS`(3)、GAP = `IDLE_WAVE_GAP_TICKS`(6)（`config-maps.js`）。
  離線戰鬥次數 = 秒數 × `OFFLINE_COMBAT_RATE` × `rateMult`。**一擊斬殺時 = 100%，和舊版離線收益完全相同**。
- **撐不撐得住**：一波（3 隻依序擊殺）期間妖獸共出手 Σ(k × hits − 1) 次，乘上「妖獸攻擊 × 玩家未閃避率 × (1 − 玩家減傷)」＝ `waveDamage`；
  ≥ 氣血上限 → 判定無法久留：**把玩家移回宗門**，整段改以宗門靜修結算（不扣死亡折壽），訊息註明原因。
  線上還有自動補血，這裡只擋「一波就被打死」的情況。
- 效率 < 100% 時結算訊息會加一行「約需 X 擊才能斬殺一隻，戰鬥效率 Y%」。
- 不計技能、屬性傷害、靈寵協助，估算偏保守。與實際 combatTick 模擬比對（天南／冥界，多種攻擊力）：效率誤差約 ±2%。

### 線上實戰證明（2026-09-28，修「縮小畫面一段時間再回來，人物回到宗門」）
- **原因**：上面的「撐不撐得住」只看一波傷害 vs 氣血上限，**不計自動補血、吸血、回血、護盾、靈寵**。靠丹藥或特效在線上打得好好的玩家，
  一縮小畫面觸發背景補發（或被瀏覽器關掉後重開的離線結算），就被判定撐不住而送回宗門。
- **做法**：
  - `combat.js` 每個野外 tick 累加 `fieldOnlineTicks`（state.js，不存檔）；連續滿 `IDLE_PROVEN_SECONDS`（config-maps.js，60 秒）就把地圖名稱記進 `player.idleProvenMap`（存檔）。
  - `settleIdleSeconds()`：估算撐不住，但 `idleProvenMap === 目前地圖` → 視為撐得住，留在原地照常結算（戰鬥效率 `rateMult` 仍照估算打折）。
  - 作廢時機：被妖獸打死（combat.js 兩處戰死判定前清 `idleProvenMap`；懸賞對決落敗**不**清，那與妖獸強度無關）、轉世（leveling.js）。
    換地圖（map.js `changeMap`）只把 `fieldOnlineTicks` 歸零；回到已證明的地圖仍然有效。
- 防濫用仍在：新角色進高階地圖後**立刻**縮小／關網頁，沒有 60 秒線上實戰證明，照舊退回宗門；線上若真的撐不住，60 秒內就會戰死並清除證明。
- 實測（本機）：以「估算撐不住」的地圖測試，無證明 → 退回宗門；有證明 → 留在原地並給野外收益；野外 tick 第 60 秒才記入證明；換地圖計數歸零。

### 怪物刷新 10 秒＋收益補償（2026-09-28）
- 一波全滅後等 `MONSTER_RESPAWN_SECONDS`（config-maps.js，原 5 秒 → 10 秒）才刷新；`IDLE_WAVE_GAP_TICKS = 刷新 + 1`。
- 玩家選擇「維持原本進度」：一擊斬殺時每秒擊殺從 3÷9 降到 3÷14（約 0.21 隻），所以
  `KILL_REWARD_MULT = (GAP + 3) ÷ (6 + 3)`（10 秒時 ≈ 1.556）乘在：
  - 每隻的經驗、靈石、聲望、職業熟練度（combat.js `fieldCombatRound`）；救援受困修士的判定次數（小數以機率補一次）。
  - 每波的遭遇機率：野外修士 `FIELD_CULTIVATOR_WAVE_CHANCE`、暗殺者 `AMBUSH_WAVE_CHANCE`（combat.js）、懸賞人物 `BOUNTY_ENCOUNTER_CHANCE`（bounty.js）。
  - **不乘**：每日任務／情緣任務的「擊殺數」（算的是實際隻數，完成時間約多 35%）。
- 離線／背景公式**不用改**：`OFFLINE_COMBAT_RATE` 本來就是「等效擊殺」；`rateMult` 用新的 GAP 算，與線上新節奏一致（打越多下，相對懲罰比刷新 5 秒時小）。
- 實測（本機，一擊斬殺、靈山大川、3600 tick）：每秒 0.219 隻；每小時靈石 23,469，設計值 coins × 1160 = 23,200（比 1.01）。
- 改刷新秒數時只要改 `MONSTER_RESPAWN_SECONDS`，補償倍率會自動重算。

### 日誌減量（2026-09-28，`ui.js` 的 `fieldLogMuted`）
> **2026-09-28 稍後已關閉**：日誌分頁（第 44 節）上線後，玩家要求戰鬥分頁加回細節，`ui.js` 的 `FIELD_LOG_DETAIL = true` 讓下面的靜音不生效，
> 每波也重新寫「⚠️ 遭遇 N 隻妖獸攔路！」。波末彙總與打坐彙總照舊保留。改回 `false` 即恢復本節的減量行為（程式都還在）。
- 野外戰鬥回合（`combat.js` 的 `fieldCombatRound()`，由 `combatTick()` 以 `try/finally` 包住）期間 `fieldLogMuted = true`：
  type 為 `normal`／`combat`／`skill`／`heal`（`FIELD_MUTED_LOG_TYPES`）的逐回合訊息（出手、技能、屬性效果、妖獸攻勢、凍結、持續傷害）不寫入。
  掉寶 `equip`、功德與升級 `level-up`、`system`、`quest`、`servant` 照常即時顯示。
- 一波結束寫一則彙總：「⚔️ N 回合擊退 M 名敵手，獲得 經驗、靈石、聲望」（`waveSummary`，state.js；`addLog(..., true)` 強制顯示）。
  一般遭遇不再寫「遭遇 N 隻妖獸」，只有混入野外修士／暗殺者時才提示。
- 戰死：`onPlayerKilledInField()` 開頭先解除靜音，戰死／折壽／靈寵陣亡訊息一定顯示。渡劫、懸賞對決不受影響（仍逐回合顯示）。
  套裝「護住心脈」（gear.js `tryGearUndying`）用 `force` 顯示。換地圖（map.js `changeMap`）會清掉 `waveSummary` 與 `meditateSummary`。
- 安全區打坐：經驗仍每 5 秒入帳，日誌每 `MEDITATE_LOG_SECONDS`（30）秒彙總一則（`meditateSummary`，state.js）。
- 實測：打坐 120 秒日誌 4 則（原 24 則）；野外掛機約每分鐘 5.5 則。
- ⚠️ 新增野外戰鬥中「一定要讓玩家看到」的訊息時，type 用 `level-up`／`equip`／`system`，或傳 `force = true`。

### 門派任務的離線／背景推進（2026-09-28 修正，版本 `20260929u`）
- **事故**：玩家回報「離線在打坐，僕從收集功能就暫停」。僕從任務只在 `combatTick` 的 `tickServantQuests()` 每秒推進，`settleIdleSeconds()`（離線與背景補發共用）完全沒處理，
  所以離線或縮小視窗期間，不論打坐或練功，僕從與自己的門派任務都停擺。
- **修正**：servant.js 新增 `settleIdleQuests(seconds)`，由 `settleIdleSeconds` 在歲月流逝前呼叫：
  僕從不論玩家在哪都照常工作（進度一次加 `速度 × 秒數`，逐趟發獎勵、扣下一趟靈石，付不起就停工，礦脈照樣可能挖到星允鐵）；自己的任務只在身在宗門時推進（同 `combatTick`）。
  逐趟日誌（含星允鐵、每日任務）暫時靜音，最後寫一行彙總「📜 門派任務：僕從完成 N 趟、你完成 M 趟，獲得 …（K 名僕從因靈石不足停工）」。每日任務「門派任務」次數照常累計。
- 驗證（本機，宗門打坐離線 1 小時，打掃清潔 20 秒一趟）：效率 ×1 與 ×1.5 的兩名僕從共 450 趟、自己 180 趟，靈石入帳；Console 無錯誤。
### 離線收益下修（2026-09-28，版本 `20260930a`）
- 使用者回報「離線掛機收益過高」。實測（天南・元嬰、同配置 1 小時）：線上 經驗 355 萬／靈石 116 萬／聲望 6,933；離線 337 萬（95%）／108 萬（93%）／4,158（60%），而且離線不用吃藥、沒有陣亡風險。
- 使用者決定：**離線練功收益降到線上的 50%、最多結算 12 小時**（原 24 小時）。
  - `settleIdleSeconds(秒, 文字, isOffline)`：`calcOfflineProgress`（關掉遊戲的離線）傳 true → 戰鬥次數再 × `OFFLINE_REWARD_MULT` 0.53、聲望改用 `OFFLINE_REPUTATION_RATE_OFFLINE` 1.1（config-maps.js）。
    **背景掛機（縮小視窗、切 App、鎖螢幕，`checkBackgroundCatchUp`）不打折**，維持約 95%：手機玩家常鎖螢幕掛機。安全區打坐靜修與僕從任務也不打折。
  - `OFFLINE_MAX_SECONDS` = 12 小時（離線與背景補發共用）；超過時結算訊息多一行「⏰ 離線 N 小時，最多結算 12 小時」。`formatIdleDuration` 改成超過 1 小時顯示「N 小時 M 分鐘」。
  - 實測：離線 1 小時 經驗 178 萬（50%）、靈石 57 萬（49%）、聲望 3,460（50%）；背景 95%；離線 20 小時只結算 12 小時並提示。
## 34. 設定：顯示尺寸與全螢幕（`settings.js`）＋ PC 版洞府

入口：手機版為洞府 HUD 右上面板最下列的「⚙️ 設定」（`#btn-settings`）；PC 版為圖上左下的「設置」鈕。都呼叫 `openSettingsModal()` → `#settings-modal`。
設定視窗最下方另有「⚙️ 命運與系統」按鈕（關閉設定並 `openSystemModal()`）——**PC 版沒有齒輪按鈕，這是 PC 版開啟存檔／轉世／重置的唯一入口**。
反過來，命運與系統視窗最上方也有「🖥️ 顯示設定」按鈕（關閉系統並 `openSettingsModal()`），因為手機洞府右下的「系統」齒輪比 HUD 裡的「⚙️ 設定」顯眼得多。

- **切換回 PC 版按鈕**（事故紀錄 2026-09-26）：玩家在電腦上選了「📱 手機 9:16」後找不到切回去的地方——手機版唯一的設定入口 `#btn-settings`
  在電腦上只有約 39×13 像素，顯眼的「系統」齒輪開的又是存檔視窗。修正：`#layout-switch-btn`（index.html，`position: fixed` 右上角、落在舞台外的模糊邊）
  由 `layoutStage()` 判斷「目前是手機版、但視窗寬 ≥ `AUTO_PC_MIN_WIDTH` 且寬高比 ≥ `AUTO_PC_MIN_RATIO`（自動尺寸會選 PC）」時加上 `.show`，
  點擊 `setDisplayMode('auto')` 回到自動尺寸 = PC 版。真正的手機（窄螢幕）不會顯示；標題畫面（`body.title-mode`）也隱藏。

| 選項 | 版面（`resolveDisplayLayout()`） | 說明 |
|---|---|---|
| 📱 手機 9:16 | `phone` | 舞台高 = 視窗高、寬 = min(視窗寬, 高 × 9/16)：手機上**滿版**；電腦上是置中的 9:16 直式畫面。背景圖伸縮填滿（真實手機約 9:19.5，變形很小；純 9:16 會壓扁約 18%），疊加元素都是 % 座標所以仍對齊 |
| 🖥️ PC 16:9 | `pc` | 整面顯示 PC 專用橫式圖 `images/home-bg-pc.jpg`（1376×768），等比塞進視窗，多出的邊用同圖模糊補底；分頁面板開在畫面中央（見下方） |
| 自動尺寸（預設） | 視窗寬 ≥ `AUTO_PC_MIN_WIDTH`(900) 且寬高比 ≥ `AUTO_PC_MIN_RATIO`(1.2) → `pc`，否則 `phone` | 設定視窗會標示目前實際使用哪一種 |
| ⛶ 全螢幕 | （開關，不是版面） | `toggleFullscreen()` 用 Fullscreen API（含 webkit 前綴）；不支援時（iPhone Safari）提示改用「加入主畫面」。進出全螢幕觸發 resize，版面自動重算；按 Esc 離開時 `fullscreenchange` 會更新按鈕狀態 |

- **儲存**：`localStorage['xiuxian_display_mode']`（`phone`／`pc`／`auto`），讀寫都包 try/catch，讀不到就用 `auto`。
  屬於**裝置偏好，不寫進遊戲存檔**，所以匯入別台的存檔不會改變版面。全螢幕狀態不儲存（瀏覽器規定必須由使用者點擊觸發）。
### PC 版洞府（`#pc-stage`）
- **結構**：`#app-frame` 內有兩個舞台：手機版 `#app-stage`（直式圖）與 PC 版 `#pc-stage`（橫式圖）。`body.layout-pc` 時只顯示 `#pc-stage`。
  `layoutStage()` 依版面設定舞台大小與 `--u`（= 螢幕像素 ÷ 圖上像素，PC 圖寬 1376），並把**唯一一份** `#tab-sheet` 用 `appendChild` 搬進目前的舞台
  （只搬 DOM 節點，所有 id 與事件不變，`updateUI()` 照常寫入）。`#stage-toast` 放在 `#app-frame`，兩種版面共用。
- **HUD**（寫在 index.html，座標 = 圖上像素 ÷ 1376 或 768 的 %）：id 一律是手機版的 `hud-xxx` 加 `pc-` 前綴，`updateHomeHud()` 同時寫入兩邊。

  | 元素 | 圖上位置 | 內容 |
  |---|---|---|
  | `#pc-hud-avatar` | 頭像框內圓 (26,25) 104×104 | 玩家頭像，點擊更換 |
  | `#pc-hud-name` | 名字框 (135,38) 143×84 | 道號、境界（虛弱變紅）、Lv 與進度條、戰力 |
  | `#pc-hud-coins` | 第 1 個資源框（藍晶） | 靈石（三格都有名稱標籤蓋在圖示上、點擊顯示說明，第 47 節） |
  | `#pc-hud-core` | 第 2 個資源框（元寶） | **獸丹**（只有 PC 版顯示，靈寵維持費要看） |
  | `#pc-hud-rep` | 第 3 個資源框（藍鑽） | 聲望；`.pc-pill-cover` 深色底蓋掉圖上的假數字「5.366」 |
  | `.pc-stat-label` ×3 | 狀態框標籤 (1183,71/101/131) | 深色底蓋掉圖上的「體力／靈力／仙力」，改寫氣血／靈力／修為 |
  | `.pc-stat-bar` ×3 | 狀態框內三條空條 (1219,75/105/135) 115×11 | 氣血／靈力／修為進度與數字 |
  | `#pc-hud-rate-line` | 狀態框最下列 | 修煉效率 |

  圖上資源框與狀態框右邊的「＋」目前沒有功能。
- **按鈕與建築熱點**：全部定義在 `config-home-pc.js` 的 `pcStageButtons`，`home-ui.js` 的 `renderPcStage()`（`initHomeUi()` 時執行一次）依表產生。
  **要調整按鈕功能或開關，只改這張表**：`action` 是 onclick 字串；`enabled: false` 可停用；`nav` 填分頁名稱會跟著分頁亮選中光暈；
  `kind: 'hotspot'` 只在洞府（面板關閉）時可點，可加程式牌匾 `plaque`；`kind: 'button'` 一直可點。

  | 圖上 | 功能 |
  |---|---|
  | 寶塔（牌匾「升仙台」） | `openAscensionPlatform()`（待渡劫亮紅點，`#pc-plaque-ascend`；確認渡劫後切到戰鬥分頁） |
  | 中央山門（「宗門」） | `returnToSect()`：不在宗門先傳送回宗門，再開宗門分頁（手機熱點相同，第 20 節） |
  | 右側屋舍（「僕從小屋」） | `openServantModal()` |
  | 左側樓閣（「煉丹房」） | `openAlchemyModal()` |
  | ~~傳送門~~ | 2026-09-25 牌匾已從圖上抹除，`pcStageButtons` 的 `portal` 設為 `enabled: false`（不產生熱點）；修仙地圖改由「世界」開啟 |
  | 湖中光環（「千寶閣」，舊名領物閣） | `openActivity('auction')` |
  | 寶塔右側尖峰（「天磯錄」，2026-09-26） | `openCodexModal()`，圖上 (760,160) 120×130 |
  | 升仙台與天磯錄之間（「大道石碑」，2026-09-28，`plaque: 'stele'`） | `openLeaderboardModal()`，圖上 (724,185) 34×125 |
  | 左側 **任務**（圖上原字「信件」，2026-09-27 已改畫）／背包／設置 | `switchTab('task')`（任務分頁：門派任務＋活動，同手機版左側「任務」；`nav: 'task'` 亮選中光暈）／`openBagModal()`／`openSettingsModal()` |
  | 右下 **情緣**（圖上原字「修煉加速」，已改畫）／信件 | `openPartnerModal()`（第 39 節）／興建中 |
  | 右下 修仕／戰鬥／洞府／**世界**（圖上原字「福袋」，已改畫） | 修仙／戰鬥／洞府（關閉面板）／`openWorldTab()`：切到世界分頁並跳出修仙地圖（與手機版相同） |

- **分頁面板**：位置在 `PC_SHEET_RECT`（圖上 (300,40) 845×625，避開左上 HUD、右上狀態框與底部按鈕），
  `renderPcStage()` 換算成 CSS 變數 `--pc-sheet-left/top/width/height`。開啟時隱藏建築熱點，按鈕仍可點；✕ 或「洞府」關閉。
  面板字級 17px × `--ui-scale`（2026-09-28 由 15px 調大，第 45 節）、卡片最小寬 170px、日誌高 34vh。
- **圖片處理紀錄**：原圖上方有五顆導覽圓鈕，以 System.Drawing 將圓形區域用周圍像素反覆平均填補（調和填補＋輕微雜訊）移除，
  「修仙」「洞府」原位置因鄰近鳳凰翅膀留有淡光暈，正常大小不明顯。圖上的紅點與右下「修仕」錯字保留（畫死在圖上）。
  **2026-09-25 第二次修圖**（腳本以 System.Drawing＋C# 執行，原始圖備份不在專案內）：
  - 「修煉加速」→「情緣」、「福袋」→「世界」：先以調和填補（1500 次迭代＋±5 雜訊）抹掉原字，再用標楷體（DFKai-SB）粗體 25px、上淺下深金色漸層＋深色描邊畫上新字，仿原圖按鈕字樣。
  - 左側「傳送門」直式牌匾整塊抹除（圖上 (266,518) 45×132）：底色用調和填補確保邊緣連續，再疊上從左側 100px 外、右側 45px 外取樣的紋理細節（減去 7×7 局部平均，強度 0.9），看起來是一片雲霧。
    左側取樣避開了旁邊小樓的窗戶（第一次取樣只往左 45px，會把窗戶複製一份）。
  **2026-09-27 第三次修圖**：左側按鈕「信件」→「任務」（卷軸圖示不變）。只把字的亮像素（圖上 (28,508) 48×29 內、亮度 > 60，外擴 1px）以周圍深色底調和填補抹除，
    再用標楷體粗體 21px、米白→淺金漸層＋深色描邊寫上「任務」。右下另一個「信件」仍是興建中。原圖備份不在專案內。
  - ⚠️ PowerShell 5.1 以 ANSI 讀腳本：含中文的 `.ps1` 必須存成 **UTF-8 BOM**，否則 C# 中文註解與字串會變亂碼、甚至讓程式碼解析錯誤。
  - 換圖後 `index.html` 內兩處 `home-bg-pc.jpg` 加上 `?v=`（`#pc-stage-bg` 與 `body.layout-pc::before`），避免快取到舊圖；**之後再改這張圖也要更新這兩處的版本號**。
  ⚠️ 換 PC 圖時要改 `PC_STAGE_IMG_W/H`、重量 `pcStageButtons`／`PC_SHEET_RECT` 與 index.html `#pc-stage` 內 HUD 的 % 座標。
- ⚠️ 全域樣式 `button.active` 會把按鈕底色改成金色，新的 `.xxx.active` 按鈕樣式要自己覆蓋 `background`/`color`（`.settings-option.active` 即是）。
- 驗證紀錄（2026-09-24）：1376×768 自動 → PC 版滿框，HUD 與圖上框對齊（放大檢查）、9 個按鈕＋6 個熱點、戰鬥分頁面板與「洞府」關閉、「設置」開設定；
  1440×900（16:10）→ PC 版上下補模糊邊；375×812 自動 → 手機滿版、無水平捲動；1280×720 強制手機 → 置中 405×720。全螢幕需使用者手勢，未自動化測試。

## 35. 仙法與武學密典（`config-spells.js`、`spells.js`）

不分流派的武學，任何人都可修習。**下品**可用「下品武學秘典碎片」合成（2026-10-01，見本節末）；**中品／上品**用凡界／靈界野外掉的中品／上品碎片合成（2026-10-06，見本節末）；絕學**目前沒有取得方式**，密典顯示灰色但可瀏覽效果。

### 200 種的組成
- **10 屬性 × 3 品（下／中／上）× 6 招 = 180**，每品 6 招依序：單體攻擊、群體攻擊、牽制、補助、補血、光環（被動）。

  | 屬性 | 陣營 | 傷害類型 | 攻擊附帶 | 補助 | 光環（下／中／上） |
  |---|---|---|---|---|---|
  | 金 | 正 | 物理 | 金重擊 | 增益 | 物理攻擊 +5/10/15% |
  | 木 | 正 | 術法 | 吸血 10% | 增益 | 氣血上限 +6/12/18% |
  | 水 | 正 | 術法 | 冰凍 | 守護 | 靈力上限 +8/16/25% |
  | 火 | 正 | 術法 | 燒傷 | 增益 | 燒傷機率 +4/8/12 |
  | 土 | 正 | 物理 | — | 守護 | 減傷 +2/4/6 |
  | 雷 | 正 | 術法 | 雷擊 | 增益 | 雷擊機率 +4/8/12 |
  | 冰（玄冥） | 邪 | 術法 | 冰凍 | 守護 | 冰凍機率 +4/8/12 |
  | 毒 | 邪 | 術法 | 中毒 | 增益 | 中毒機率 +4/8/12 |
  | 血 | 邪 | 物理 | 吸血 25% | 增益 | 物理／術法攻擊 +8/15/22%、氣血上限 −3/5/8% |
  | 冥 | 邪 | 術法 | 中毒（蝕魂） | 增益 | 閃避 +2/4/6 |

- **絕學 20**（品階「絕學」）：正派「法則大道」10（太初劍道、時間法則・光陰逆轉、因果法則、大道衍天…）、魔道「禁忌法」10（天魔噬天禁法、血祭萬靈、萬魂幡・百萬陰魂、魔神降臨、吞天魔功…）。
- 統計：正 118／邪 82；主動 166、被動光環 34；已檢查 200 個 id 與名稱都不重複，也不與宗門／靈寶閣／靈寵技能撞名。
- id 格式：`屬性-品階-序號`（例 `fire-high-1`）、絕學為 `law-*`／`taboo-*`。**id 寫進存檔，上線後不可改**。

### 數值（`SPELL_GRADE_STATS`，改這張表即可整體調整）

| 品階 | 單體 | 群體 | 牽制（傷害／定身率） | 增益 | 守護 | 補血 | 屬性效果機率 | 耗魔 | 魔功反噬 |
|---|---|---|---|---|---|---|---|---|---|
| 下品 | ×1.6 | ×1.1 | ×0.8／40%（單體） | ×1.15・3 回合 | −15%・3 回合 | 12% | 15% | 60 | 3% |
| 中品 | ×2.4 | ×1.7 | ×1.2／60%（群體） | ×1.25・3 | −25%・3 | 20% | 25% | 150 | 5% |
| 上品 | ×3.4 | ×2.5 | ×1.6／80%（群體） | ×1.40・4 | −35%・4 | 30% | 35% | 300 | 8% |
| 絕學 | ×5.0 | ×3.8 | ×2.0／100% | ×1.80・5 | −50%・5 | 50% | 50% | 600 | 12% |

- 魔功（邪）的攻擊、牽制傷害 × `SPELL_EVIL_POWER`(1.25)，施放時扣最大氣血的「反噬」比例（不會因此死亡，至少留 1）。
- 參考：宗門技能倍率 1.5／2／3、靈寶閣武學 2～6。

### 戰鬥與被動
- **技能格**：`getSpellSlotCount()` = 1 + 人物等級 ÷ `SPELL_SLOT_LEVEL_STEP`(100)（Lv1 = 1 格、Lv100 = 2 格…）。只有放進格子的**主動**仙法會加入 `getAllSkills()`，
  和宗門、靈寶閣技能一起在每回合 40% 機率中隨機施放（修仙分頁「當前可用技能」會列出，來源標「仙法」）。超過目前格數的格子不生效（例如轉世等級重置後）。
- `combat.js` 的 `playerAttackTurn()` 新增：`shield` 守護（與靈寵土屬性共用 `petShieldRate/Timer`，取較高值）、`control` 牽制（傷害＋以 freeze 機率套冰凍狀態＝定身 1 回合）、
  `hpCost` 魔功反噬、`lifesteal` 依實際傷害回血。渡劫共用同一函式。
- **被動光環**：學會即生效，`getSpellAuraBonus()` 加總；`stats.js` 的物理／術法攻擊、氣血／靈力上限乘上百分比，
  `elements.js` 的減傷／閃避／屬性機率與裝備、靈根相加後一起套上限（負值最低到 0）。
- 轉世不會清除仙法（`player.spells` 不在轉世重置清單內）。

### 武學密典（修仙分頁「📜 武學密典」→ `#spell-modal`）
- 上方：已收錄 X / 200、技能格（✕ 卸下）、下一格開放等級。
- 篩選：屬性分支（金～冥、法則）、正邪、類型（攻擊／牽制／補助／補血／光環）、品階。
- 卡片：**金色 = 已學會、灰色 = 未學會**；點選顯示詳細效果（`describeSpell()`），已學會的主動仙法可「放入技能格」（先填空格，滿了替換最後一格）。
- 驗證紀錄（2026-09-24）：模擬學會 9 招、放入 4 格，天南戰鬥 3000 回合無錯誤；四招皆有施放（各約 180 次），牽制使怪物定身 49 回合，守護與反噬日誌正確。

### 下品武學秘典碎片（2026-10-01，版本 `20261004r`）
- 使用者要求「新增下品武學秘典碎片，100 個可合成，在奇遇機緣等探索發現」。`player.spellShards`；`SPELL_SHARD_NEED`（100）、`SPELL_SHARD_GRADE`（"low"）在 config-spells.js。
- spells.js：`addSpellShards(n, source)`、`unlearnedShardSpells()`、`synthesizeSpell()`（扣 100 片，從**尚未學會的下品** 60 招隨機習得一招、選中該招顯示詳細、寫日誌與提示條、存檔；全學會時按鈕停用）。
- 武學密典視窗頂端 `.spell-shard-box`：碎片進度條、剩餘未學下品招數、「🔮 合成下品武學」按鈕；未學會的下品招式說明改為「集滿秘典碎片合成時隨機習得」。
- 來源：所有奇遇與機緣（第 63 節的 `ENCOUNTER_REWARDS` 各項 `spell`），約每日 60～80 片。
- 驗證：105 片合成 → 習得「掌心雷」（下品），剩 5 片、未學 60 → 59。

### 宗門武學併入武學密典（2026-10-06，版本 `20261005CJ`）
- 使用者：「把宗門學會的武學跟秘典武學合併，都放在秘典武學內」→ 選「放格子且格數增加」。
- **規則**：宗門武學不再自動參戰，要跟主動仙法一樣放進技能格才會施放；技能格＝`SPELL_SLOT_BASE` 3 ＋ 人物等級 ÷ 100（原本 1 ＋ 等級 ÷ 100，等於每個等級都多 2 格）。
  靈寶閣買的技能（`player.learnedSkills`）照舊自動參戰。每回合 40% 施放技能、從可用技能平均抽一招的規則不變（combat.js 的 `playerAttackTurn`）。
- **存檔**：`player.spellSlots` 可放宗門武學 id＝`SECT_SKILL_SLOT_PREFIX`（"sect:"）＋招式名稱（config-spells.js；招式名稱不重複，上線後不要改名）；
  `player.sectSkillSeen`＝已自動放過格子的宗門武學 id（只新增欄位）。
- spells.js：`getLearnedSectSkills()`（依 `player.sectSkills` 三個階段列出招式）、`isSectSkillId`／`getLearnedSectSkill`／`isValidSlotEntry`、
  `autoSlotSectSkills()`（新學會、沒放過的宗門武學自動放進空格；讀檔 `applySaveData`、拜入宗門 sect.js、開密典時呼叫；玩家卸下後不會被塞回去）、
  `getEquippedCombatSkills()`（技能格內的仙法＋宗門武學）；stats.js 的 `getAllSkills` 改成 靈寶閣技能＋`getEquippedCombatSkills()`。`equipSpell(id)` 也接受宗門武學 id。
- **畫面**：武學密典技能格下方新增「🏯 宗門武學」區塊（`.spell-sect-box`：招式、階段、宗門、類型、威力、耗魔，「放入技能格」／「✅ 已在技能格」）；技能格裡的宗門武學顯示 🏯；
  說明文字改成「主動仙法與宗門武學放入技能格才會在戰鬥中施放（基本 3 格，每 100 級多開一格）」；修仙分頁「當前可用技能」沒有技能時提示到武學密典放格子。
- 舊存檔：讀檔時已學會的宗門武學依序放進空格（多 2 格基本格，一般都放得下；格子不夠的留在密典清單，玩家自己換）。
- **收錄進密典＋品階**（2026-10-06，版本 `20261005CK`，使用者：「秘典武學收錄宗門武學，把宗門學會的武學做分類」→ 比對傷害後「宗門武學最高級設定成上品武學」）：
  - config-sects.js `SECT_SKILL_GRADE = { 1: low, 2: mid, 3: high }`（初級→下品 150%、中級→中品 200%、高級→上品 300%；秘典單體 160／240／340、群體 110／170／250，絕學 500／380 宗門沒有），補到每招 `sk.grade`。只是分類，威力不變。
  - spells.js `sectSkillCatalog`（36 招，不論是否學會：id、grade、tier、sect、faction（宗門 faction，沒有＝正）、role atk）、`getSectCatalogEntry`、`describeSectSkill`。
  - 密典：收錄數＝已學仙法＋已學宗門武學 ／ 200＋36；卡片清單先列宗門武學（品階・🏯宗門名・單體／群體），屬性篩選新增「🏯宗門」（只看宗門武學；選五行／法則時不顯示宗門武學），正邪、類型（攻擊）、品階篩選共用；
    點宗門武學卡片顯示詳細（品階｜宗門武學（初級・武當）｜術法／物理｜傷害說明、耗魔），未學會＝「拜入某級宗門【名】即可習得」，已學會可放入技能格。上方「🏯 宗門武學」區塊與「當前可用技能」也標出品階。
- **移除「🏯 宗門武學」區塊**（2026-10-06，版本 `20261005CL`，使用者：「不要有宗門武學格，技能統一在秘典裡面找」）：技能格下方的 `.spell-sect-box` 清單與 CSS 刪除；
  宗門武學只在密典卡片清單（可用「🏯宗門」篩選）點選後「放入技能格」。技能格裡的宗門武學仍以 🏯 標示。

### 中品／上品武學秘典碎片（2026-10-06，版本 `20261005CD`）
- 使用者：「凡界新增中品武學碎片」「靈界新增上品武學碎片」。存檔 `player.spellShardsMid`、`player.spellShardsHigh`（下品仍是 `player.spellShards`）；同樣 `SPELL_SHARD_NEED` 100 片合成。
- config-spells.js：`SPELL_SHARD_KINDS`（low／mid／high → 存檔欄位、來源文字）、`SPELL_SHARD_FIELD_DROP`（每次掉寶的機率：中品 1/300、上品 1/600；掉率使用者未指定，先用這組）。
- spells.js：`spellShardName(grade)`、`getSpellShards(grade)`；`addSpellShards(n, source, grade)`、`unlearnedShardSpells(grade)`、`synthesizeSpell(grade)` 都多了 grade（省略＝下品，舊呼叫不變）；
  `rollSpellShardFieldDrops(rolls, silent)`：所在野外（非安全區）屬於靈界分類（`isLingjieMapCategory`）＝上品＋中品各擲一次（2026-10-07，版本 `20261005CR`，使用者：「靈界也新增掉落中品武學碎片」；中品掉率同凡界 1/300），否則（凡界）＝只有中品；期望值＝掉寶次數 × 機率；回傳的文字多種時以「、」串接。
  combat.js 線上掉寶（`takeDropRolls` 的 rolls，第 71 節：每小時最多 1200 次 → 中品約 4 片／小時、上品約 2 片／小時；靈界兩種都掉）；save.js 離線／背景用收益次數 `combatTicks`，結算訊息列「📜 妖獸身上掉出 …」。
- 武學密典視窗頂端改成下品／中品／上品三列碎片進度與「🔮 合成X品武學」按鈕（`synthesizeSpell('mid')` 等）；未學會的中品／上品招式說明改為「集滿X品武學秘典碎片合成時隨機習得（來源）」。

### 待決定
- 絕學的取得方式（購買／掉落／千寶閣／參悟）。之後只要把 id 寫進 `player.spells` 即可學會。
- 被動光環目前**全部學會即全部生效**，200 種全學的疊加還沒做平衡；若要限制可改成光環也要放格子。

## 36. 懸賞榜與懸賞對決（`config-bounty.js`、`bounty.js`）

入口：活動「獵殺邪修」→ `#evil-hunt-modal`（標題依陣營顯示「獵殺邪修・懸賞榜」或「截殺正道・懸賞榜」）。陣營、善惡、功德規則見第 27 節。
視窗內容（`renderEvilHunt()`）：陣營／善惡／功德／補天石／破障丹 → 規則說明（可收合）→ 懸賞榜 → 累計斬殺數。2026-09-25 起**不再有「前往千寶閣」按鈕**。

### 榜單
- 每 `BOUNTY_REFRESH_HOURS`(4) 小時刷新（`refreshBountyIfDue()`，以 `player.bountyRefreshAt` 時間戳判斷，同千寶閣），每期 6 名：**天榜 1、地榜 2、人榜 3**。
  列的是**敵對陣營**：正派看邪修、邪派看正道修士（`player.bountyFaction` 記錄榜單陣營，玩家陣營改變時立即重抽）。刷新時未完成的懸賞一併作廢。
- 名冊 `bountyRoster`：邪修 30 名、正道 30 名，**男女各半**，有姓名與稱號；同一期不重複。`id` 寫進存檔，上線後不要改。
- 每名的**境界 = 玩家目前位置 −0.8～+1 境隨機**（`BOUNTY_REALM_OFFSET_MIN`/`MAX`，2026-09-25 由 ±1 改）：
  把境界換成「大境界 × 10 + (小境界 − 1)」的連續位置，以 **0.1 境 = 1 階**為單位在 −8～+10 階之間平均隨機，再換回大境界＋小境界（頭尾夾在凡人 1 階～混沌道祖 10 階）。
  例：玩家金丹 5 階 → 築基 7 階～元嬰 5 階。五行與異屬性（冰／毒／雷）、武學組合也隨機（見下方）。
- 卡片顯示：榜別、姓名、稱號、性別、境界階數、攻擊與氣血（標示是「你的幾倍」，≥1.5 倍紅、≥0.8 倍黃、其餘綠）、減傷閃避異屬性、武學。
- 存檔：`bountyBoard = [{ id, npcId, faction, rank, realmIndex, stage, element, affix, skills, status: "open"/"done" }]`。

### 接取與遭遇
- 點「📜 接取懸賞」（`acceptBounty(id)`）→ 加入 `player.activeBountyIds`。**2026-09-27 起可同時追蹤多名**：榜單上方「📜 一次接取全部（N 份）」（`acceptAllBounties()`，接取所有未伏誅、未追蹤的）、
  「放棄全部追蹤」（`abandonBounty()` 不帶 id）；卡片上「放棄懸賞」（`abandonBounty(id)`）只放棄那一份；對決中都不可放棄。
  舊存檔的單一 `activeBountyId` 在 `getTrackedBountyIds()` 第一次被呼叫時轉進陣列並刪除。追蹤中且未伏誅的清單 = `getActiveBounties()`。
- 接取後在野外（非安全區）每刷新一波前，`combat.js` 呼叫 `tryStartBountyDuel()`：`BOUNTY_ENCOUNTER_CHANCE`(8%) 遇上 → 本波不刷妖獸，改為一對一對決（約 1～3 分鐘遇上一次）。
  **同時追蹤多名時機率不變**（不會接越多遇越快），遇上時從追蹤中隨機挑一人（實測 3000 波命中率 11.6%，理論 12.4%；六人都會輪到）。伏誅後從追蹤清單移除，其餘繼續追蹤。
- 只在線上發生：離線、背景補發都不會遇上（對決中背景補發也暫停並丟棄累積時間）。

### 對決（`bountyDuelTick()`，結構同 `tribulationTick()`）
- `combatTick()` 在 `inBountyDuel` 時整個交給 `bountyDuelTick()`：自動補給 → 玩家狀態 → 出手（`playerAttackTurn`，被封印時只能普攻）→ 靈寵 → 對手狀態 → 對手出手（經 `resolveHit()`）。**勝負完全靠實戰，沒有擲骰**。
- **對手數值**（`getBountyStats()`）：攻擊 = 同境界同階數「修為圓滿」的基礎戰力（與 `getBasePower()` 同一條曲線）× 該境界一般宗門倍率（`BOUNTY_REF_SECT_MULT`：凡俗 1.2／修真 2.5／至高 5.0）× `BOUNTY_TIAN_MULT`(1.0) × 榜別比例（天 1.0／地 0.8／人 0.6）；氣血 = 攻擊 × 20。
  減傷／閃避：天 22/13、地 16/9、人 11/5；異屬性觸發率 35/25/15%；每回合施展武學機率 50/42/35%。
- **武學**（`bountySkills`，`BOUNTY_SKILL_SETS`）：
  - 邪修必帶【血魔噬心】（攻擊 ×1.8，**吸血**＝實際傷害 100% 回血）與【奪魄退魔】（攻擊 ×1.2，**吸走你最大靈力 25%**），再從化功（你的攻擊 ×0.7 三回合）、攝魂魔音（封印兩回合）、蝕骨毒功（疊 2 層中毒）、玄冥寒掌（凍結）、破甲魔爪（你的減傷閃避減半三回合）隨機 2 招。
  - 正道修士必帶【回春訣】（回復 10% 氣血）與【誅邪劍氣】（攻擊 ×2.0），再從鎮魔印（封印）、定身咒（凍結）、天罡破邪（化功）、神霄雷罰（破甲）隨機 2 招。
  - 負面狀態存在 `state.js`（`duelWeakenTimer`/`duelSilenceTimer`/`duelArmorTimer`，不存檔），以**你的回合**倒數；化功由 `stats.js` 的攻擊公式乘 `getDuelWeakenMult()`，破甲由 `getPlayerCombatAttrs()` 乘 `getDuelArmorMult()`。對決結束即清除。
- **結果**（`endBountyDuel(result)`）：
  - `win`：懸賞標記 `done`、功德 +`BOUNTY_MERIT_MIN`～`BOUNTY_MERIT_MAX`（**1～3000，不論強弱**）、善惡依榜別加減、`bountyKills`/`evilKills` +1，接著 `settleMeritStones()`。
  - `lose`：**視同野外戰死**（呼叫 `onPlayerKilledInField()`：折壽、靈寵陣亡、遺失 10% 靈石、回宗門），懸賞保留可再遇上。
  - `escape`：超過 `BOUNTY_MAX_TURNS`(150) 回合對方遁走，懸賞保留。
  - `flee`：對決中換地圖（`map.js` 的 `changeMap()`）＝逃離，懸賞保留。
- 對決中不能渡劫（`triggerTribulation()` 會擋）；渡劫中也不會遇上懸賞。戰鬥實況面板顯示對手榜別、姓名、稱號、氣血、回合數與你身上的負面狀態。

### 難度驗證（2026-09-25）
以 `bountyDuelTick()` 實際模擬（化神 5 階、戰力 ×2.5 的宗門、無靈根光環技能，對手同境界同階數，每組 200 場）：

| 玩家配置 | 天榜 | 地榜 | 人榜 |
|---|---|---|---|
| 無裝備 | 0% | 4～7% | 100% |
| 減傷 30%、閃避 15% | 0～1% | 56% | 100% |
| 減傷 60%、閃避 40%（上限） | 25～36% | 100% | 100% |

- 勝率曲線很陡（數值型戰鬥的特性），天榜在同境界需要「減傷閃避拉滿＋一點運氣」；再加靈根、仙法光環、符寶、技能會更穩。
- ⚠️ 每差 1 境戰力約差 10 倍：+1 境的天榜幾乎打不贏；最低的 −0.8 境只有約 1/7 實力，很輕鬆。上表是「同境界同階數」的情況，實際勝率依抽到的位置浮動。
- 調難度：整體改 `BOUNTY_TIAN_MULT`；個別榜改 `BOUNTY_RANKS` 的 `ratio`/`def`/`eva`；武學強度改 `bountySkills`。改完請重跑模擬。
- 新制（第 52 節，`NUMERIC_V2`）：對手改為同境界「一般玩家」的鏡像（攻擊 × 0.7、氣血 × 3），勝率表見第 52 節；遭遇機率改乘 `getWaveChanceMult()`。
- **強度 1～5 倍**（2026-09-29，版本 `20261002i`；使用者要求「懸賞邪修比玩家強 1～5 倍，玩家喝水補血、寵物補血與控制應該打得過」，同意我建議的分配）：
  - 刷榜時每名依榜別隨機強度倍率 `entry.str`（`config-bounty.js` 的 `BOUNTY_STR_RANGE`：人榜 1～2、地榜 2～3.5、天榜 3.5～5，`rollBountyStr`）；舊榜單沒有就取中間值（`getBountyStrMult`）。卡片顯示「強度 ×N」。
  - `getBountyStats`（新制）：攻擊＝一般玩家普攻 × `NV2.bountyAtkMult`（0.7 → **0.4**）× √強度、氣血＝一般玩家氣血 × `bountyHpMult` 3 × 強度；舊的榜別比例 `ratio` 在新制不用。
    倍率主要乘在氣血：新制玩家氣血只有攻擊約 3.6 倍，全乘在攻擊會一擊斃命，丹藥（每 5 秒一顆）與靈寵治療、控制都來不及發揮。回合上限 `BOUNTY_MAX_TURNS` 150 → 300。
  - 模擬（元嬰 5 階、對手同境界同階、自動補血 50% 喝培元丹，各 20～30 場；一般＝同階一般玩家、無減傷閃避；好裝＝攻 ×2 血 ×1.5 減傷 30 閃避 20；
    中期寵＝一隻 Lv100 以下的招（護主心切、石化凝視、鐵壁、滌塵、雷光一閃、春風化雨）；後期寵＝兩隻高階治療／控制／增益組合，第 16 節）：

    | 玩家 | ×1 | ×2 | ×3.5 | ×5 |
    |---|---|---|---|---|
    | 一般・無寵 | 50% | 0% | 0% | 0% |
    | 一般・中期寵 | 80% | 10% | 0% | 0% |
    | 一般・後期寵 | 100% | 100% | 15% | 0% |
    | 好裝・無寵 | 100% | 100% | 0% | 0% |
    | 好裝・中期寵 | 100% | 100% | 90% | 45% |
    | 好裝・後期寵 | 100% | 100% | 100% | 100% |

    一場約 8～40 回合、喝 2～7 顆丹。靈寵是天榜的關鍵；攻擊維持 ×0.7 時連「一般・無寵」打 ×1 都 0 勝、丹藥只喝得到 1～2 顆，所以降到 0.4。
    ⇒ 同日懸賞對手加上命中（第 17 節「敵人命中」）後重跑（各 20 場，×1／×2／×3.5／×5）：一般・無寵 25/0/0/0%、一般・中期寵 65/0/0/0%、一般・後期寵 100/75/10/0%、
    好裝・無寵 100/100/5/0%、好裝・中期寵 100/100/90/35%、好裝・後期寵 100/100/100/100%——略難一點，分級不變。
    ⇒ 再加「玩家實際閃避／減傷最多 30%」（第 17 節，版本 `20261002q`）後重跑（各 20 場，×1／×2／×3.5／×5，括號為平均回合與丹藥）：
    一般・無寵 20/0/0/0%、一般・中期寵 90/0/0/0%、一般・後期寵 100/75/0/0%、好裝・無寵 100/100/10/0%、好裝・中期寵 100/100/85/30%（×5 約 42 回合、7 顆丹）、好裝・後期寵 全 100%。
    與上一版差異在隨機誤差內：「好裝」的減傷 30、閃避 20（扣命中後約 14）本來就沒超過 30% 上限；會受影響的是減傷、閃避堆到 40～60 的頂級裝備。
    另測過攻擊 0.35 × 強度^0.35（較寬鬆：一般・後期寵打 ×5 35%、好裝・中期寵打 ×5 100%），沒有採用。
  - 獎勵（功德、賞金、圖紙）沒有跟著強度調整。

## 37. 裝備系統（850 種裝備、強化、職業、天磯錄；2026-09-26）

原本的鍛造閣／千寶閣裝備沒有名字（名稱就是部位）。改版後**所有外界與鍛造的裝備都是這 850 種之一**，不是另一套框架。
裝備物件的 `name` **仍是部位名**（`equipItem` 等處靠它判斷穿哪一格），實際名稱由 `gearId` 查 `gearById`（`getEquipDisplayName()`）。

### 清單與取得管道（`config-gear-catalog.js`、`config-gear.js`、`gear.js`）
- 17 部位 × 50 種 = 850 種：武器 300（劍刀扇弓笛筆）、防具 300（頭 內衣 盔甲 手套 長靴 披風）、飾品 250（腰帶 項鍊 戒指 耳環 腰牌）。
- **id = 「部位-兩位數序號」**（例 `劍-07`），存檔記 id。**上線後不可重排、不可刪列**；改名只改名稱欄。
- 清單來源是 `tools/裝備清單-850種.csv`，改完執行 `tools/csv-to-js.ps1` 重新產生 `config-gear-catalog.js`（腳本存成 UTF-8 BOM）。
- 每部位 50 種的管道固定（可製作 : 外界 = 3 : 7），每個管道內五行平均：

  | 管道 key | 每部位 | 取得方式 |
  |---|---|---|
  | `craft1` 凡俗宗門 | 5 | 鍛造閣 10～100 等 |
  | `craft2` 修真宗門 | 5 | 鍛造閣 200～500 等 |
  | `craft3` 至高宗門 | 5 | 鍛造閣 700～1000 等 |
  | `loot` 奪寶 | 5 | 野外修士、暗殺者、懸賞伏誅掉落（`tryLootDrop`，機率見 `LOOT_DROP`） |
  | `auction` 拍賣 | 5 | 千寶閣刷新格 |
  | `realm` 秘境 | 25 | 30 組套裝全在這裡。2026-09-27 起**開放**：秘境「魔屠天南」守城掉落部件（一次一件，第 49 節）；收藏類稱號仍不含秘境（`getTitleGear`） |

- 外界管道（`external: true`）四維 × `GEAR_EXTERNAL_MULT`(1.15)，隨機詞條只抽範圍上半段。
- 命名：凡俗→修真→至高 由樸素到神話；奪寶血煞風；拍賣珍寶風；秘境上古神話風，含原著名：青竹蜂雲劍、金蚨子母刃、乾藍冰焰扇、風雷翅。

### 一件裝備的五層能力
1. **四維**：基數（鍛造／奪寶／千寶閣（2026-09-27 起）= 裝備等級 × 5 × 品級倍率）× 該裝備的**四維模板**（`GEAR_TEMPLATES` 8 種，係數合計 2.0；飾品再 ×1.25）。
2. **主詞條**：武器 = 五行對應屬性傷害、防具 = 減傷（盔甲 ×1.5）、飾品 = 閃避，數值依品級。
3. **隨機詞條**（`eq.subs = [[key, 值, 分級], …]`）：取得時抽一次，條數 白 0／綠 1／藍 2／紫 2／橙 3／白金 4，從 25 種抽（`gearSubAffixes`）。
   2026-10-03 起暗黑式：分級（天地玄黃凡）、部位權重、前後綴命名、洗煉、遠古／太古、白金傳奇威能，見第 67 節。
4. **特效**：每種裝備 1 個（38 種，`gearEffects`），**紫色以上才生效**，白～藍灰色顯示；紫 ×1、橙 ×1.5、白金 ×2，同名多件相加到 `cap`。
5. **套裝**：秘境裝備中 30 組 × 6 件（名字共用前綴），只算紫色以上件數，2／4／6 件加成（`config-sets.js`）。

### 六個品級
白／綠／藍／紫／橙沿用 `equipQualities`；**白金（先天道器）** 是 `PLATINUM_QUALITY`（倍率 12、主詞條較高），**只能由橙色 +20 進化**，
不在 `equipQualities` 內 → 不會出現在鍛造、千寶閣抽選與依品級批次刪除中。名稱前加「先天・」，`.quality-白金` 銀白流光。

### 特效的實作位置（改效果時照這張表找）
| 類別 | 特效 | 位置 |
|---|---|---|
| 每擊倍率 | 首擊、燃魂、斬殺（＋稱號本命五行、套裝閃避後強擊） | `gear.js` 的 `getGearHitMult()`，由 `combat.js` 的 `playerAttackTurn` 呼叫 |
| 命中判定 | 破甲、洞察、剋敵、寒徹、焚燼、蝕骨 | `getPlayerCombatAttrs()` 帶欄位 → `elements.js` 的 `resolveHit()` |
| 命中連鎖 | 冰封、連雷、毒爆（＋套裝屬性強擊） | `applyGearHitChain()` |
| 出手 | 法爆、聚靈、吸血、追擊、橫掃、疾風（＋套裝之怒、技能連發） | `playerAttackTurn()` |
| 受擊 | 金身（妖獸／一般攻擊）、化勁（修士、心魔、懸賞人物的武學）、反震、閃擊 | `applyGearDefense()`（野外、渡劫、懸賞對決） |
| 防禦 | 護體、先手盾、定神 | `getPlayerCombatAttrs()` |
| 回復 | 回春、回靈 | `applyGearRegen()`（與靈根回復一起） |
| 其他 | 噬魂、聚財（combat.js 擊殺）、延壽（lifespan.js）、丹心（combat.js／bag.js 丹藥）、悟道（leveling.js）、積德（merit.js、bounty.js）、役使（quest.js）、獸魂（beast-combat.js）、通玄（library.js）、奪寶（gear.js）、尋鐵（enhance.js） | 各檔以 `gearFx("名稱")` 取值 |

- 「首擊」「先手盾」「套裝不死」以**每波**計算：`resetGearWave()` 在野外刷新一波、渡劫、懸賞對決開打時呼叫；`gearWaveRound` 在 `playerAttackTurn` 開頭 +1。
- 聚財只影響線上野外靈石；離線不套用。

### 加成彙總 `getBonusTotals()`（gear.js）
隨機詞條＋套裝＋稱號＋職業被動＋天下異火收錄（第 38 節）＋出戰夥伴被動（第 39 節）全部用同一組 key 加總，各處只讀這一個函式：
`statPct/strPct…` 四維 %（`getEquipBonus` 以「本身＋裝備」總量計）、`atkPct/physPct/magPct/hpPct`（`getGearPctBonus` → stats.js）、
`def/eva/…` 百分點、`cap:屬性` 上限、`fx:特效名`（併入 `getGearEffects`，不受特效上限）、`elemDmg:五行`、`elemBoost:屬性`、`enhanceChance`、`special:名稱`。

### 強化、進化、分解（`config-enhance.js`、`enhance.js`）
- 從背包或角色裝備卡片「🔨 強化」開 `#enhance-modal`。每 +1 四維 +5%（+20 = ×2，`getEnhanceMult`），上限 白綠 +10、藍 +12、紫 +15、橙／白金 +20。
- 每次花費：星允鐵 = 目標等級 × 係數（白 1 綠 1 藍 2 紫 3 橙 5）、靈石 = 目標等級 × 5 萬；+11 起有成功率（90%→30%），
  **失敗不掉級不毀裝**，同一級每失敗一次 +5%（`eq.enhancePity`，成功歸零）。期望花費：紫 +15 約 410 顆、橙 +20 約 1,630 顆。
- 進化：橙色 +20 ＋ 300 星允鐵 ＋ 1,000 萬靈石 → 白金，四維 ×1.5、主詞條換白金值、多抽 1 條詞條、保留 +20。
  - **+20 系統通知**（2026-09-26）：`enhanceEquip()` 強化成功且 `canEvolve(eq)` 時呼叫 `promptEvolveEquip(eq)`：寫一筆日誌，
    資源足夠 → `confirm` 詢問是否進階先天道器，確定就 `evolveEquip(true)`（`skipConfirm`，不再問第二次）；
    資源不足 → `alert` 列出缺少的星允鐵／靈石。選取消或不足時，之後仍可在強化視窗按「✨ 進化為先天道器」（`evolveEquip()` 無參數 = 照常確認）。
- 分解：白～紫 → 碎鐵（10/20/40/80，每 500 自動合成 1 顆星允鐵）；橙 3 顆、白金 15 顆星允鐵。白～橙都可一鍵分解勾選品級（`bulkDecomposeEquipment`，2026-09-28 起含橙色）；**白金只能逐件手動**（要按兩次確認）。
- **保留屬性**（2026-09-28，版本 `20260930c`）：背包一鍵刪除／分解列多一列五行勾選（`ui.js` 的 `renderKeepElementRow(className)`，背包用 class `bulk-keep-element`，由 `renderBulkDeleteBar` 的第 8 個參數 `extraRow` 帶入），勾選的屬性（`eq.element`）不會被刪除或分解。穿戴中、🔒 鎖定中的不能分解（一鍵分解會略過鎖定，見第 9 節「裝備鎖定」）。

### 暫存區（`player.gearStash`，上限 50）
- 只有**奪寶掉落**走 `receiveLootEquip()`：背包有空位 → 背包；背包滿 → 橙色以下自動分解成碎鐵、橙色以上進暫存區。
  鍛造、千寶閣、卸下裝備仍是背包滿就擋（`hasEquipInventorySpace`）。
- **暫存區滿了不能外出練功**：`changeMap` 擋下、`combatTick` 每秒 `enforceGearStashLimit()` 送回宗門、離線結算改在宗門靜修（`settleIdleSeconds`）。
- 背包頂端顯示暫存區（移入背包／分解／毀棄）。有未鎖定的橙色時上方多一條「暫存區一鍵處理」：保留屬性勾選（class `stash-keep-element`）＋「一鍵分解橙色／一鍵毀棄橙色」→ `bulkStashEquip('decompose' | 'delete')`（`getStashBulkTargets()` 只取橙色、略過鎖定與保留屬性；白金仍逐件處理）。

### 星允鐵來源
| 來源 | 數值 | 位置 |
|---|---|---|
| 礦脈採礦（傳說僕從，只在線上） | 每趟 2% 得 1～2 | `servant.js` 的 `tickServantQuests` |
| 野外修士（敵對陣營） | 20% 得 1 | `combat.js` |
| 暗殺者 | 必得 1～3 | `combat.js` |
| 懸賞伏誅 | 人榜 1～5、地榜 5～12、天榜 12～20 | `bounty.js` 的 `endBountyDuel` |
| 千寶閣常駐 | 每顆 30 萬靈石，每日限購 10（`player.ironShop`） | `enhance.js` 的 `renderIronShopSection` |
| 千寶閣刷新格 | 每格 5% 星允鐵袋 10～30 顆，每顆 40 萬靈石＋20 聲望 | `auction.js`（`kind: "ironBag"`） |
| 分解碎鐵 | 每 500 碎鐵 1 顆 | `addIronShards` |

「尋鐵」特效與收益套裝會提高 `addStarIron` 的數量（千寶閣購買與分解不套用）。

### 職業（`config-profession.js`、`profession.js`）
- 6 職業對應 6 武器：劍修（劍）、刀修（刀）、扇修（扇）、弓修（弓）、音修（笛）、符修（筆）。在天磯錄「職業」分頁選主修，**人物 Lv.10 起才能選**（`PROFESSION_MIN_LEVEL`，2026-09-27 使用者指定，新舊制都生效；未滿時分頁頂端顯示 🔒 提示、按鈕顯示「Lv.10 解鎖」，已選過的老玩家不受影響），第一次免費、之後每次 10 萬靈石，各職業熟練度分開保存。
- 熟練度只加在主修：野外每擊殺 +1 × 地圖分類倍率（1～4）、懸賞伏誅 +200、離線 ×0.5。10 階門檻 0／500／3,000／1 萬／2.5 萬／6 萬／12 萬／25 萬／50 萬／100 萬。
- 主修武器（該部位那一件）四維 +3%～+30%（`getProfWeaponMult`；新制改為該武器的武器攻擊 +3%～+30%，卡片文字依制度顯示）；職業被動每階累加（`getProfessionPassive`）；第 5／8／10 階各解鎖一招職業技能，每回合出手後依機率自動發動（`professionSkillTurn` → `artifact.js` 的 `castProcSkill`）。
- 階級名稱：劍童 劍徒 劍癡 劍狂 劍魔 劍王 劍尊 劍神 劍仙 劍帝；刀修頂階刀皇、扇修風帝、弓修弓帝、音修樂帝、符修符祖（完整表在 `professions[].ranks`）。

### 天磯錄（`codex.js`，入口：洞府寶塔右側山峰，手機熱點與 PC `pcStageButtons` 的 `codex`）
- 收藏以「種」計：`player.gearCodex[gearId]` 記錄取得過的品級；取得任何圖鑑裝備時由 `createGearEquip`／進化呼叫 `recordGearCollected`，舊存檔讀檔時 `migrateGearCodex` 補記。
- 分頁：器錄（依部位，未取得顯示「？？？」＋ 6 顆品級星）、套裝、**異火**（天下異火榜，`strange-fire.js` 的 `renderCodexFires`，第 38 節）、稱號、職業。
- `describeTitleBonus()` 是稱號、異火、夥伴共用的加成文字函式；新增 bonus key 時要在它的 `labels` 補上中文名。
- **稱號** 60 個（`config-titles.js`：收藏 8、分類部位 9、五行 5、品級強化 9、境界 10、宗門職位 6、其他 3、帝級職業 6、賭運 4（第 40 節））。
  `updateUI()` 每秒 `checkTitleUnlocks()`；加成永久生效、全部疊加（`getTitleBonusTotals`）；可選一個顯示在道號旁（`player.activeTitle`，`'prof'` = 顯示職業階級，`getNameTag` → HUD `#hud-title`/`#pc-hud-title`）。
  「全收」類條件一律不含尚未開放的秘境裝備。宗門職位稱號名稱帶目前宗門（`{sect}`），加成用「技能傷害」（遊戲沒有區分宗門技能）。

### 舊存檔相容
- `migrateGearIds()`（讀檔時）：沒有 `gearId` 的裝備依「部位＋五行」對應——有 `level` 的對到該等級的可製作清單、沒有的對到拍賣清單，**數值不變**（每個管道每種五行只有一件，結果固定）；
  靈寶閣寶物不轉換（沒有 `lingbaoId` 的舊寶物依屬性比對補上），卡片顯示靈寶閣商品名。
- 舊裝備沒有 `subs`／`enhance`，視為無詞條、+0。新欄位由 `DEFAULT_PLAYER_JSON` 補預設值。

### 驗證紀錄（2026-09-26，本機 HTTP 伺服器實際執行）
- 850 種全部展開、名稱不重複；鍛造 10／300／1000 等各抽到對應宗門清單；千寶閣抽拍賣清單。
- 17 格穿滿帶特效的橙裝在野外跑 200 回合：追擊、橫掃、反震、閃擊反擊、回復、套裝之怒、職業技能皆有觸發，無錯誤。
- 強化到 +20 → 進化白金（四維 ×1.5、4 條詞條）；稱號自動解鎖；背包滿時奪寶 → 碎鐵／暫存區，暫存區滿被送回宗門且不能進野外。
- 舊存檔（無新欄位、無 gearId）讀檔正常；懸賞對決、渡劫、離線結算皆無錯誤。
## 38. 異火碎片與天下異火（`config-strange-fire.js`、`strange-fire.js`；2026-09-26）

- **取得碎片**：異火碎片預定由**秘境**掉落。秘境尚未開放（第 37 節 `realm` 管道 `locked: true`）；**目前唯一管道是天星賭坊的賭星隕石**（第 40 節，仙品隕石另有 1% 直接切出整朵異火）。
  秘境實作時，掉落處呼叫 `addFireShards(數量, "來源文字")`（有來源文字時會寫日誌）。
- **合成**：背包的異火碎片卡片有「合成 ×1／合成 最高」按鈕 → `craftStrangeFire(qty)`，每 `STRANGE_FIRE_SHARDS_PER_FIRE`(100) 片合成 1 朵，
  **隨機抽一種天下異火**（`rollStrangeFire`）：先依 `STRANGE_FIRE_TIERS` 的 weight 抽品階，再從該品階平均抽一種。

  | 品階 | 種數 | 機率 | 單種加成量級 |
  |---|---|---|---|
  | 帝焰 | 2 | 1.5% | 攻擊／術法 +5% 級 |
  | 神焰 | 6 | 6.5% | 3～4% 級 |
  | 天焰 | 10 | 14% | 1.5～3% 級 |
  | 地焰 | 14 | 28% | 1～2% 級 |
  | 靈焰 | 18 | 50% | 0.5～1% 級 |

- **兩種效果，計算方式不同**：
  1. **秘境減傷**看「總朵數」`player.strangeFires`（含重複）：每朵 `STRANGE_FIRE_REALM_REDUCE`(3%)，上限 `STRANGE_FIRE_REALM_REDUCE_MAX`(30%)，`getStrangeFireRealmReduction()`。
     ⚠️ **秘境尚未實作，所以減傷目前還沒有生效**。實作秘境時，秘境裡玩家受到的傷害要乘上 `(1 - getStrangeFireRealmReduction())`，只在秘境生效。
  2. **永久加成**看「收錄種類」`player.fireCollection`：每種收錄後加成一次，重複取得不疊加（`getStrangeFireBonusTotals`，併入 `gear.js` 的 `getBonusTotals`）。
     50 種全收的總量：攻擊 +11%、術法攻擊 +8.5%、物理攻擊 +5%、四維 +4.5%、氣血 +8%，外加各屬性傷害與特效。
- **收錄榜**：天磯錄「🔥 異火」分頁（`renderCodexFires`）依品階列出，未收錄顯示「？？？」＋出處＋加成（讓玩家知道在收什麼）；天磯錄頂端統計也列出異火收錄數。
- **存檔**：`player.fireShards`、`player.strangeFires`、`player.fireCollection`（`state.js`）。轉世不會重置。
  `migrateStrangeFires()`（`save.js` 讀檔時）：舊版合成的「未命名」異火（總朵數 > 收錄次數合計），差額補抽成具名異火。
- **資料**：`strangeFireList` 的 `id`（f01～f50）寫進存檔，**上線後不可改 id、不可刪**；名稱、描述、加成可改。檔尾有新增模板。
  bonus key 與稱號相同（見 `config-titles.js` 開頭），新 key 要在 `codex.js` 的 `describeTitleBonus` 補中文名。
- **顯示**：背包（`renderStrangeFireCards()`，兩者皆為 0 時不顯示；異火卡片有「查看異火榜」按鈕 → `openCodexModal('fires')`）。
- 載入順序：`config-strange-fire.js` 放在 `config-spells.js` 之後、`strange-fire.js` 放在 `talisman.js` 之後。`strange-fire.js` 載入時會建 `strangeFireById`（只讀同組設定檔），其餘沒有順序限制。

## 39. 情緣・諸天夥伴（`config-partners.js`、`partner.js`；2026-09-26，好感度與隊伍 2026-09-27）

- **入口**：洞府底部導覽「情緣」（手機 `index.html` 的 nav 按鈕、PC `config-home-pc.js` 的 `boost` 按鈕）→ `openPartnerModal()`，視窗 `#partner-modal`。
- **人物**：44 位名動諸天的高手（至高 11、帝境 17、尊者 6、天驕 10），每位都標註來歷：
  - `native: true`（本界人物，出自《凡人修仙傳》）：道祖韓立（id `hanli`，至高 96.0）、大羅境南宮婉（id `nangongwan`，帝境 91.7）（2026-09-26 玩家指定）、紫靈（天驕）與下列兩位。
    - 「亂星海第一大善人」風希（id `dashanren`）：九級化形妖獸裂風獸，反派，評級尊者。
    - 厲飛雨（id `lifeiyu`）：死後輪迴，於靈界轉世為魔界天煞聖皇石空徹（石穿空之父），戰力以轉世後計，評級尊者。
    （2026-09-26 依玩家提供的原著設定修正；id 不變，舊存檔不受影響）
  - 羅峰（id `luofeng`）：稱號由「時間領主」改為「渾源領主」（人稱羅城主），戰力以渾源領主時期計，綜合 97.7，為目前最高（2026-09-26 玩家修正）。
  - 其餘皆為 **🌌 域外神明**，卡片寫「來自《作品》（作者）的某世界」：蕭炎、林動、牧塵（天蠶土豆）、辰南、葉凡、狠人大帝、無始大帝、段德、鬥戰聖皇、虛空大帝、恆宇大帝、青帝、西皇母、阿彌陀佛大帝、石昊（辰東）、唐三（唐家三少）、羅峰、秦羽、林雷（我吃西紅柿）、王林、孟浩、白小純（耳根）、張小凡（蕭鼎）、李七夜（厭筆蕭生）。
  - 2026-09-26 玩家指定新增：洪、雷神（《吞噬星空2》，永恆真神境，至高）、情緒之神霍雨浩（《斗羅大陸II絕世唐門》，帝境）、
    毀滅之神唐舞麟、生命之神古月娜（帝境）、創世之神唐軒宇（至高）（《斗羅大陸IV終極斗羅》）。
  - 天驕級（綜合 < 82）：奧斯卡、馬紅俊、寧榮榮（《斗羅大陸》，以史萊克七怪時期計）、小醫仙（《鬥破蒼穹》）、紫靈（《凡人修仙傳》，本界）；
    2026-09-27 玩家指定新增 5 位《吞噬星空》人物（皆以地球／前期計）：徐欣 `xuxin`（女，輔助回血減傷）、秦霜 `qinshuang`（女，單體凍結）、
    巴巴塔 `babata`（修為／悟性、回靈）、金角巨獸 `jinjiao`（減傷＋群體物理）、摩雲藤 `moyunteng`（吸血）。天驕共 10 位，於秘境「魔屠天南」第 51 波起有緣相遇（第 49 節）。
    天驕級的絕學以輔助、回復或 1.4～1.6 倍群體為主，強度明顯低於上位夥伴。
- **戰力分析**：六維 0～100（攻伐、防禦、身法、神通、底蘊、成長），**平均值**決定評級（`PARTNER_TIERS`：至高 ≥95、帝境 ≥90、尊者 ≥82、天驕），卡片顯示長條圖、綜合戰力、巔峰境界與文字分析。
  視窗註明「戰力分析與評級為本遊戲設定，僅供娛樂」。分析文字為自行撰寫的概述，不引用原著原文。
- **取得（結識）**：
  - **風希是玩家第一個結識的夥伴**（`first: true`）：天星城坊市的風希人偶（`config-towns.js` 的 figures，`action: "talkToPartner('dashanren')"`）
    第一次點 → `meetPartner` 結識並跳出專屬相遇台詞（`lines.meet`），關閉對話框後打開情緣視窗並捲到他；之後每天第一次點 = 每日問候。
  - **彩蛋（2026-09-27）**：當天已問候過後再點風希人偶 → `askPartnerEaster`：「你想看我跳支舞嗎？」是／否（`partner.easter`）。
    **否** → `reduceBond` 好感 -1、他說「哼！不識好歹……」（💔 反感；降到熟識以下會自動離隊）；**是** → `playPartnerVideo` 在 `#partner-video-modal` 播放 `videos/fengxi-dance.mp4`（關閉時暫停）。
    **看影片的規則**（`partnerVideoCtx`）：完整看完（`ended` 且實際播放 ≥ 90%，`getPlayedSeconds` 加總 `video.played`，拖曳跳過的不算）→ **只有第一次**好感 +5（`bond.danceWatched` 記錄）並顯示「怎麼樣，風某的舞姿不錯吧？」；
    **沒看完就關掉**（含拖到最後）→ 和選否一樣好感 -1、「看到一半就走？不給面子！」。
    每次點都會問，選否或沒看完可以一直扣（最低 0）。對話框支援選項按鈕：`showPartnerDialog` 的第 5 個參數 `choices`。
  - **影片卡頓修正（2026-09-27）**：實測 GitHub Pages 下載影片約 0.8 Mbps，低於影片碼率約 1.9 Mbps，直接串流會邊播邊停。
    改為 `preloadPartnerVideo(src)` 用 `fetch` 把整部影片下載成 Blob（`partnerVideoCache`，同一次遊戲再看不重下載），`askPartnerEaster` 問問題時就開始下載；
    `playPartnerVideo` 在 `#partner-video-status` 顯示「影片載入中… xx%」，下載完 `onPartnerVideoReady` 才以物件網址播放（播放期間不需網路）；fetch 失敗（如 file://）退回直接播原網址；
    手機擋掉非點擊當下的有聲播放時提示「請按播放鍵」。
    ⚠️ 不要改回「先 play 再 pause 等緩衝」：Chrome 在影片暫停時會停止下載（networkState IDLE），進度卡住；`canplaythrough` 在慢網路也估得太樂觀（1 Mbps 模擬仍卡 4 次）。
    同日也把影片壓小：原檔 1280×720／1.78 Mbps／3.9 MB → 854×480／0.52 Mbps／1.35 MB（畫面比對 PSNR 37 dB），慢網路的等待時間約剩 1/3。
    轉檔**不需要 ffmpeg**：用 Windows 內建 Media Foundation（PowerShell 呼叫 WinRT `Windows.Media.Transcoding.MediaTranscoder`，H.264 Main），
    但它輸出的 `moov` 在檔尾，要再把 `moov` 搬到 `mdat` 前面並把 `stco`/`co64` 的偏移量加上 moov 大小（faststart），直接串流時才能邊下邊播。轉檔腳本不在專案內。
  - 其他人：`meetPartner(id, "來源文字")`，重複結識回傳 false。
  - **夥伴碎片**（2026-09-29，版本 `20261002w`；使用者要求「新增夥伴碎片，集滿 100 片激活夥伴」，並指定各評級的境界）：
    - 死守天南城、鎮魔塔不再直接結識，改掉落某位**未結識**夥伴的碎片（`grantPartnerShards(評級陣列, 機率, [最少, 最多], 來源)`，`player.partnerShards = { id: 片數 }`，用到時才建立）。
      掉哪位：`PARTNER_SHARD_FOCUS`（70%）給「還沒湊滿、碎片最多的那位」，其餘隨機；風希（`first`）不在池內；前一個評級都結識完才換下一個。
    - 集滿 `PARTNER_SHARDS_NEED`（100）後，情緣視窗的卡片出現「✨ 激活」→ `activatePartner(id)` 扣 100 片並 `meetPartner`（多的保留）。未結識卡片顯示碎片進度條與取得處（`PARTNER_MEET_HINT`）。
    - **評級與取得處**（`config-partners.js`）：天驕＝合體～渡劫：死守天南城第 11 波起、鎮魔塔第 11～40 層；尊者＝仙人～天仙：死守天南城第 40 波起、鎮魔塔第 41～60 層（風希仍在天星城坊市）。
      **2026-10-01（版本 `20261004r`）起**：尊者、帝境也可在奇遇「強者現身」取得；至高來自三界戰場前四強（第 63 節）。
    - **片數依評級**（2026-10-01 使用者指定）：`PARTNER_SHARDS_NEED_BY_TIER` 天驕／尊者 100、**帝境 300**、**至高 500**；partner.js 的 `getPartnerShardsNeed(p)` 取代原本寫死的 `PARTNER_SHARDS_NEED`
      （grantPartnerShards 的集中判斷、`activatePartner`、情緣卡片進度條、鎮魔塔結算文字）。新增 `addPartnerShards(p, n, source)` 直接給指定夥伴碎片（grantPartnerShards 與強者現身共用）。
      `activatePartner` 碎片不足改用 `gameAlert`。驗證：蕭炎（帝境）299 片擋下、305 片激活剩 5。
    - 掉落量：守城每守住一波 15% 掉 3～8 片（第 49 節）；鎮魔塔每擊敗 BOSS 必掉 8～15 片（`ZHENMO_PARTNER_MEET`，第 51 節）。
    - 驗證：第 11～39 波只掉天驕、第 40 波起掉尊者；集中機制讓一位先湊滿（模擬 50 次中金角巨獸 103 片）；激活後結識、剩 3 片。
  - 未結識的夥伴仍完整顯示資料；風希顯示「可在天星城坊市遇見他」。
  - **奧斯卡另有來源**（2026-10-01，版本 `20261004x`）：天南市集隱藏 NPC，找到他並「吃」大香腸，每天一次碎片 ×20（第 20 節）。情緣卡片的取得處提示（`PARTNER_MEET_HINT`）沒有改，仍只寫天驕的共通來源。
- **好感度（2026-09-27）**：每位夥伴各自累積好感點數 → 等級 `PARTNER_BOND_LEVELS`：

  | 等級 | 名稱 | 所需好感 |
  |---|---|---|
  | LV1 | 初識 | 0（結識時） |
  | LV2 | 略有好感 | 100 |
  | LV3 | 友好 | 300 |
  | LV4 | **熟識**（可邀請入隊） | 700 |
  | LV5 | **道侶**（與玩家異性）／**結拜**（同性） | 1,500（上限） |

  - LV5 名稱依 `partner.gender`（`"f"` = 女，省略 = 男；目前女性：狠人大帝、西皇母、古月娜、南宮婉、小醫仙、寧榮榮、紫靈）與 `player.gender` 判定（`getBondLevelName`）。
  - **每日問候** `greetPartner`：每位每天一次 +20，跳出台詞對話框（有 `lines.greet[等級]` 用專屬台詞，否則用 `PARTNER_GREET_LINES`，`{me}` = 玩家道號）。
  - **贈禮** `giftPartner`：每次 +15，花靈石 `PARTNER_GIFT_COST`（天驕 10 萬／尊者 50 萬／帝境 200 萬／至高 500 萬），每位每天 5 次。
  - **情緣任務**（`PARTNER_BOND_QUESTS`，依目前等級接取，每位同時一個，完成後領取大量好感）：
    LV1「並肩歷練」野外擊殺 300（+80）→ LV2「斬妖除魔」斬殺修士 10（+150）→ LV3「共赴懸賞」懸賞伏誅 3（+250）→ LV4「生死與共」帶他在隊伍中擊殺 1,000（+500）。
    進度 = 接取後的增量：`player.fieldKills`（`combat.js` 擊殺後呼叫 `onPartnerFieldKills`）、`evilKills`、`bountyKills`、各夥伴的 `teamKills`（只有在隊伍中才累計）。
    **離線／背景也會累計**（2026-09-29，版本 `20261002v`，使用者要求）：`save.js` 的 `settleIdleSeconds` 以實際擊殺數（`combatTicks ÷ getKillRewardMult()`，扣掉新制的收益補償倍率）呼叫 `onPartnerFieldKills`，
    結算訊息加一行「💞 情緣任務：野外擊殺 +N」；斬殺修士（`evilKills`）離線本來就會累計；**懸賞伏誅（LV3）仍只有線上**，因為懸賞對決只在線上發生。
  - 光靠問候＋每日贈禮約 7～8 天到熟識，情緣任務可大幅縮短。
- **隊伍**（取代舊版單人出戰）：好感 LV4「熟識」才能 `togglePartnerTeam` 邀請入隊，**最多 `PARTNER_TEAM_MAX`(2) 名**（`player.partnerTeam`；2026-09-29 使用者確認）。
  - **靈力**（2026-09-29，使用者要求「夥伴與寵物設定 MP，用完無法施放技能」）：每位夥伴各 `PARTNER_MP_MAX`(100) 點（state.js 的 `partnerMp`，不存檔、讀檔時補滿），
    每回合 +`PARTNER_MP_REGEN`(4)（`partnerSkillTurn`；野外刷新等待期間每秒也回，`regenCompanionMp`），絕學耗 `PARTNER_SKILL_MP`（天驕 20／尊者 25／帝境 30／至高 35），不夠就不發動。
    驗證：100 回合發動 10 次。卡片顯示耗靈，戰場玩家血條下方 `#bf-companions` 顯示每位夥伴與出戰靈寵的靈力（不夠放時紅字，ui.js 的 `updateCompanionMpLine`）。
  - 被動：隊伍中每位的 `passive` 都併入 `getBonusTotals`（`getPartnerBonusTotals`）；**LV5 ×1.2**。
  - 招牌絕學：玩家每回合出手後 `partnerSkillTurn` 讓隊伍中每位各自依 `skill.chance`（**LV5 +2%**）判定，由 `artifact.js` 的 `castProcSkill` 執行，**傷害以主人的攻擊力為基準**。
    野外（`combat.js`）、渡劫（`tribulation.js`）、懸賞對決（`bounty.js`，封印擋不住）都會觸發；被凍結的回合不會發動（在玩家出手的分支內）。
  - 數值平衡：依評級（至高 18%・×3.0／帝境 17%・×2.6／尊者 16%・×2.2／天驕 15%・×1.8 左右；群體技倍率較低、附帶效果的倍率也較低），與神器技能同一量級。兩人同時入隊約是舊版單人出戰的兩倍戰力。
- **情緣視窗**：分頁 全部／已結識／隊伍／各評級；已結識的排前面。已結識的卡片下方有好感區塊（等級、進度條、問候、贈禮、情緣任務、入隊／離隊）。
  `openPartnerModal(id)` 帶 id 時切到「已結識」並捲到該卡片。對話框 `#partner-dialog-modal`（`showPartnerDialog`／`closePartnerDialog`）。
- **存檔**：`player.partners`（已結識）、`player.partnerTeam`（隊伍）、`player.partnerBond`（`{ id: { pts, greet, giftDate, gifts, quest: { lv, base }, teamKills, danceWatched } }`）、`player.fieldKills`（`state.js`）。轉世不會重置。
  讀檔時 `save.js` 呼叫 `migratePartners()`：補齊欄位；舊版 `activePartner`（單人出戰）若好感已達熟識則放進隊伍，然後刪除該欄位。
- **新增夥伴**：照 `config-partners.js` 檔尾的模板複製一段；`id` 寫進存檔，上線後不可改。評級由六維平均自動算出，被動與絕學請對照 `PARTNER_TIERS` 的 `hint` 維持平衡。
- 載入順序：`config-partners.js` 在 `config-strange-fire.js` 之後、`partner.js` 在 `strange-fire.js` 之後。`partner.js` 載入時會建 `partnerById`（只讀 `partnerList`）。
## 40. 天星賭坊（`config-casino.js`、`casino.js`；2026-09-26）

- **入口**：天星城坊市（城內場景，第 20 節）右側雕花石拱門的傳送點 → `openCasinoModal()`。只在 `CASINO_TOWN`（天星城）營業，所有花費前 `checkCasinoSpend` 都會再檢查人是否在天星城。
- **定位**：靈石回收管道，長期期望值略低於投入、偶爾大賺。實測（2 萬次模擬）：

  | 玩法 | 回收率 |
  |---|---|
  | 凡品隕石（10 萬）／靈品隕石（100 萬）／仙品隕石（1,000 萬） | 約 82% ／ 82% ／ 78%（依 `CASINO_VALUE` 估值） |
  | 擲骰：大／小 | 約 97%（遇豹子算莊家贏，莊家優勢約 2.8%） |
  | 擲骰：押總點 | 約 88% |
  | 擲骰：任意豹子（1 賠 24）／指定豹子（1 賠 150） | 約 70%（高賠率高風險，比照骰寶） |

### 賭星隕石
- 三種隕石，每次「切 1 顆」或「切 10 顆」。結果依 `casinoStones[].odds` 權重抽：廢石、靈石、碎鐵、礦石、星允鐵（含「礦脈」大量）、異火碎片、紫／橙裝備、**整朵天下異火**（只在仙品，1%）。
- 發放：靈石直接加；碎鐵 `addIronShards`；礦石 `player.ore`；星允鐵 `addStarIron`（套用尋鐵）；異火碎片 `addFireShards`；
  裝備 `tryLootDrop('casinoPurple' | 'casinoOrange')`（`config-gear.js` 的 `LOOT_DROP`，走奪寶清單與背包滿的暫存區規則）；整朵異火 `rollStrangeFire` + `gainStrangeFire` 並 `player.strangeFires++`。
- **賭坊是異火碎片目前唯一的取得管道**（秘境尚未開放，第 38 節）。
- 切 1 顆有分段演出（`CASINO_CUT_LINES` 挑 2 句，每句 0.45 秒）再顯示結果；切 10 顆直接列出。演出中 `casinoBusy` 擋連點（結果在演出前已發放完畢）。

### 擲骰比大小
- 三顆骰子，一次押一種：大、小、任意豹子、指定豹子（選 1～6）、押總點（4～17，賠率 `CASINO_TOTAL_PAYOUT`）。`payout` 是淨贏倍數，中了拿回 `押注 × (payout + 1)`。
- 押注：最低 `CASINO_DICE_MIN_BET`(1,000)、單把最高 = 每日上限 × `CASINO_DICE_MAX_RATIO`(20%)；有 +1 萬／+10 萬／+100 萬／+1 千萬／上限／清除快捷鈕。
- 骰子滾動演出 8 格 × 70ms。

### 防呆與紀錄
- **每日下注上限**（買隕石與擲骰合計，每天 0 點重置）依境界：`CASINO_DAILY_LIMIT_BY_REALM`（凡人 100 萬 → 混沌道祖 50 億）。
- **大額二次確認**：單次花費 ≥ 目前靈石的 `CASINO_CONFIRM_RATIO`(25%) 時 `confirm`。
- **紀錄**（`player.casino`，`getCasinoState` 補欄位並跨日重置今日數據）：今日已下注、今日輸贏（估值）、今日最大收穫；累計切石、切出整朵異火、擲骰次數、押中指定豹子、擲骰單把最大淨贏。
  視窗頂端顯示今日數據，「📜 紀錄」分頁顯示全部與賭運稱號進度。輸贏以 `CASINO_VALUE` 估值（星允鐵 30 萬、異火碎片 3 萬、紫裝 100 萬、橙裝 500 萬、整朵異火 3,000 萬），只影響顯示。

### 賭運稱號（`config-titles.js`，條件在 `codex.js` 的 `isTitleConditionMet`）
| 稱號 | 條件 | 加成 |
|---|---|---|
| 賭石大家 | 累計切石 100 顆（`casinoStones`） | 野外靈石 +2% |
| 天選之人 | 切出整朵異火（`casinoFire`） | 裝備掉落率 +10% |
| 豹子頭 | 押中指定豹子（`casinoTriple`） | 四維 +1% |
| 一擲千金 | 擲骰單把淨贏 ≥ 1 億（`casinoBigWin`） | 野外靈石 +2% |

- 圖示：隕石用 🌑／🌗／☄️（2026-09-26 原本的 🪨 在部分裝置顯示成方框，已換掉；新增 emoji 時避免太新的字元）。

## 41. 數字顯示格式（`format.js`；2026-09-27）

- **起因**：玩家反映「10,000,000」這種金額太長不好讀。全遊戲原本用 `.toLocaleString()` 加千分位（約 260 處，分散在 33 個檔案）。
- **做法**：新增 `data/format.js`（第一個載入），定義 `fmtNum(n)`，並替 `Number.prototype`／`String.prototype` 加上不可列舉的 `toWan()`；
  全部 `.toLocaleString()` 一次換成 `.toWan()`，所以金額、價格、經驗、戰力、數量等大數字都統一格式。
- ⚠️ **戰鬥數字另用 `fmtCombat(v)`／`v.toCombat()`**（2026-09-29，版本 `20261002z`）：新制內部是小數字，攻擊、氣血、靈力、傷害、回復量、戰力、耗魔在畫面上 ×100 取整後再用 `fmtNum`；
  HUD 簡寫用 home-ui.js 的 `formatShortCombat`。靈石、經驗、聲望、數量照舊 `toWan()`。詳見第 54 節「戰鬥節奏改版」第 ③ 步。

  | 數值 | 顯示 |
  |---|---|
  | 9,999 以下 | 照舊千分位：`9,999` |
  | 1 萬～1 億 | `1萬`、`1.5萬`、`12.35萬`、`123.5萬`、`1000萬`、`1235萬` |
  | 1 億～1 兆 | `1億`、`1.5億`、`12.35億`、`500億` |
  | 1 兆以上 | `3兆` |

  小數位數：該單位下的值 < 100 → 2 位、< 1000 → 1 位、其餘整數；尾端 0 省略；**不加千分位逗號**（`1000萬` 而不是 `1,000萬`）；進位滿 1 萬會升單位（`9999.99萬` → `1億`）；負數保留負號。
- **注意**：
  - **新寫的顯示一律用 `.toWan()` 或 `fmtNum()`**，不要再用 `.toLocaleString()`（`format.js` 內部除外）。
  - 顯示是近似值（例 123,456,789 → `1.23億`）；需要精確數字的地方（輸入框的 value、存檔）本來就用原始數字，不受影響。
  - 洞府 HUD 另有 `home-ui.js` 的 `formatShortNumber`（1 位小數，版面較窄），維持不變。
  - `String.prototype.toWan` 是保險：萬一對字串呼叫，數字字串照樣格式化、非數字原樣回傳，不會報錯。

## 42. 天下戰力榜（`config-leaderboard.js`、`leaderboard.js`、`tools/firestore.rules`；2026-09-28）

- **榜單外觀改版**（2026-09-28，版本 `20261001o`；玩家提供「飛昇職業人數榜」參考圖）：戰力分頁每列 `.lbx-row`＝金框深色長條、左側大名次圓章（前三名金／銀／銅光）、名字（襯線粗體）＋標籤（境界階、Lv、宗門）、「戰力」數值，
  **最右側是該玩家的頭像**（`.lbx-img`，左緣漸層淡入）。頭像來源 `lbRowAvatar(r, self)`：自己＝目前選用的頭像；別人＝上傳的 `av`（頭像 id，`avatarList`）；舊紀錄沒有 `av` 時依 uid 雜湊固定挑一張。
  上傳多一個選填欄位 `av`（`getPlayerAvatar().id`，≤32 字）。**`tools/firestore.rules` 的 `validEntry()` 已加入 `av`，需發布**；規則還沒發布時上傳會被擋（permission-denied），程式會自動改成不帶 `av` 重傳，並在這次遊戲中不再帶（`lbAvatarOk`），不影響上榜。
  守城榜分頁仍用舊的 `.lb-row` 樣式。
  `20261001r` 玩家反映「大善人臉沒有完整」：正方形頭像塞進寬扁格子被上下切、左側淡出又蓋到臉 → 列高 68→80px（手機 72）、頭像區寬 40%→34%、淡出只留最左 32%，
  對焦 `lbAvatarPos(av)`＝頭像設定的橫向 x＋縱向 28%（臉多在上半部）。舊紀錄在玩家更新前固定分配的頭像多半是可解鎖頭像，所以常看到大善人。

- **目的**：讓所有玩家互相比較戰力。這是專案**第一個連網功能**：後端用 Firebase Firestore（免費 Spark 方案）＋匿名登入，
  前端仍是純靜態 GitHub Pages，不需要建置工具。
- **目前狀態（2026-09-28 已開通）**：Firebase 專案 `k5596101`（擁有者 k559610142@gmail.com）、網頁應用程式 `xiuxian-web`、Firestore 地區 asia-east1、匿名登入已啟用、規則已發布。
  本機實測通過：匿名登入、上傳、讀榜；改別人資料／戰力 1e30／多塞欄位／60 秒內重複上傳皆被規則擋下（permission-denied）。
  測試時在榜上留下一筆「韓立／戰力 55／凡人 1 階」，可到主控台 Firestore → leaderboard 手動刪除。
- **關閉方式**：`LEADERBOARD_FIREBASE_CONFIG = null` → 不載入 SDK、不連網、不上傳；點 HUD 戰力只顯示「尚未開通」（⚠️ 留言板、寄售也會一起關掉）。
- **戰力榜與守城榜已移除**（2026-09-30；使用者先要求「暫停紀錄」（版本 `20261003o`），再要求「刪除戰力排行榜、死守天南城榜單」＝遊戲移除＋雲端清空，版本 `20261003p`；**目前 `LEADERBOARD_RANKS_REMOVED = true`**，config-leaderboard.js）：
  - 不上傳：`uploadLeaderboard` 直接返回、`startLeaderboardSync` 不排程；守城 `submitDefenseRecord` 不排入、`flushDefenseSubmit` 不送審（之前已排隊的 `defensePending` 留在存檔，恢復後才送）。
  - 畫面：大道石碑（`#leaderboard-modal`）的「🏆 戰力榜」「🏯 死守天南城」分頁由 `applyLeaderboardTab` 藏起來，要開這兩頁一律改開留言板，只剩留言板、寄售；
    洞府 HUD（手機 `#hud-power`、PC `#pc-hud-power`）的戰力數字拿掉 onclick 與 🏆（仍顯示戰力）；石碑熱點 aria-label 改「修仙留言板・寄售拍賣」；守城介面不再顯示排行榜狀態與送審說明（`getDefenseRankStatusText` 回空字串、defense.js 說明文字）。
  - 雲端資料：由 GM 在 gm.html「📋 戰力榜」分頁按「💥 新制上線清空全部榜單」刪除（戰力榜、守城榜、守城送審；黑名單保留），要 Google 管理者登入，Claude 不能代登入。**先推送新版再清空**，否則舊版玩家會再上傳；清空後仍有快取舊版的玩家可能再傳幾筆，可再清一次。
  - 只擋玩家端，雲端規則沒改；要完全封住得改 `tools/firestore.rules`。gm.html 功能不受影響。
  - 恢復：`LEADERBOARD_RANKS_REMOVED = false`、index.html 兩個 HUD 戰力加回 `onclick="openLeaderboardModal()"` 與 🏆（HTML 註解有寫）、更新版本號。
  - 驗證（本機，真實 Firebase 唯讀）：上傳被略過、守城 99 波未排入、HUD 戰力無 onclick、大道石碑只剩留言板與寄售、指定開守城榜會改開留言板；Console 無錯誤。

- **戰力榜重新開放**（2026-10-04，版本 `20261005AW`，使用者：「戰力排行榜先開放，我等一下再關閉」）：開關拆成兩個——`LEADERBOARD_POWER_REMOVED = false`（戰力榜：上傳、定時同步、大道石碑分頁、HUD 戰力 🏆 可點、gm.html 自動巡檢）
  與 `LEADERBOARD_RANKS_REMOVED = true`（現在只管死守天南城榜：送審、分頁、守城介面文字，仍關閉）。再關閉戰力榜：`LEADERBOARD_POWER_REMOVED` 改 true、index.html 兩個 HUD 戰力拿掉 onclick 與 🏆、換版本號。
  注意：開放期間每位在線玩家每 5 分鐘上傳一次戰力（Firebase 寫入額度）。
  **同日再次關閉**（版本 `20261005AX`，使用者：「關閉戰力榜」）：`LEADERBOARD_POWER_REMOVED = true`、HUD 戰力恢復不可點；死守天南城榜仍關閉。

### 開通步驟（管理者做一次）
1. 到 https://console.firebase.google.com 建立專案（可關閉 Google Analytics）。
2. 「Authentication」→ 登入方式 → 啟用 **匿名**。
3. 「Firestore Database」→ 建立資料庫（正式版模式、地區選 asia-east1 台灣）。
4. Firestore →「規則」→ 整份貼上 `tools/firestore.rules` → 發布。
5. 專案設定 → 一般 → 新增「網頁應用程式」→ 把 `firebaseConfig` 物件貼到 `data/config-leaderboard.js` 的 `LEADERBOARD_FIREBASE_CONFIG`。
6. 建議：Authentication → 設定 → 授權網域，確認有 GitHub Pages 的網域（`xxx.github.io`）。
- apiKey 等設定本來就是公開資訊，安全性由規則負責；**改規則後一定要在主控台重新發布**。

### 資料流
- `initGame()`（main.js）→ `startLeaderboardSync()`：進遊戲 15 秒後上傳一次，之後在線時每 5 分鐘一次。
- 打開榜單（`openLeaderboardModal`）→ `refreshLeaderboard()`：先 `uploadLeaderboard()`（距上次 < 60 秒自動略過），再讀前 100 名（依 power 由高到低）。
  視窗有兩個分頁（2026-09-27）：🏆 戰力榜／🏯 死守天南城通關榜（第 49 節），`refreshLeaderboard` 只讀目前分頁的榜。
- Firebase SDK（compat 版，`LEADERBOARD_SDK_BASE`）在第一次需要時才用 `<script>` 動態載入，app／auth／firestore 三支**逐一檢查、缺哪支補哪支**（避免上次只載入一半），失敗會在下次重試；上傳失敗只 `console.warn`，不影響遊戲。
- 讀取失敗訊息（2026-09-27）：`permission-denied` 顯示「伺服器設定更新中」（守城分頁：「守城榜尚未開放」），其餘顯示「連線失敗」。
  事故：新版程式推上後主控台還沒發布新規則，大道石碑的守城分頁讀 `defenseBoard` 被拒、顯示「連線失敗」；戰力榜本身正常。**新規則一定要發布**。
- 斷線時 Firestore 的 `set()` 要等連回伺服器才完成：開榜單時上傳與讀取各用 `lbWithTimeout()` 最多等 `LEADERBOARD_TIMEOUT_MS`(8 秒)，逾時顯示「連線失敗」，不會卡在「讀取中」。
- 2026-09-28 以線上真實資料（39 名玩家，境界 0～15）檢查規則的戰力上限：最高只用到上限的 0.00008%，正常玩家不會被擋。
- 集合 `leaderboard`，**文件 id = 匿名登入 uid**（存在瀏覽器 IndexedDB，同一瀏覽器永遠同一筆）。欄位：
  `name`(道號，sanitizePlayerName)、`power`、`realm`(realmIndex)、`stage`、`level`、`sect`(宗門名稱，可空)、`hist`(最近 24 次上傳的 `{p: 戰力, t: 時間}`，規則強制，第 50 節)、`hist2`(兩日紀錄：上一筆距 hist2 最後一筆 ≥ 30 分鐘才接上，保留 96 筆 ≈ 2 天，規則強制；2026-09-27)、`updatedAt`(伺服器時間)。
- hist2 的 30 分鐘判斷用 Timestamp 的秒＋奈秒精確相減（`lbTsDiffNanos`，BigInt），與規則 `o.updatedAt >= last.t + duration(1800s)` 完全一致，避免毫秒誤差讓寫入被擋。
  採「放在同一筆資料」：不增加寫入次數；代價是每筆多約 4～6 KB，開一次榜單（100 筆）多下載約 0.5 MB。玩家變多、流量成問題時再改成另開集合。
- 上傳前先 `get({ source: 'server' })` 讀自己那筆（每次上傳多 1 次讀取），把上一筆的 power／updatedAt 接到 `hist` 尾端再 `set()`；斷線讀不到就略過這次。
- 不上傳的情況：`gameOver`、`saveLoadFailed`（讀檔失敗時畫面上的角色不是真的）、尚未 `gameStarted`。

### 榜上的戰力
- `getRankPower()` = 畫面上的「戰力」（`getPhysAttack()`），但除掉**暫時性**倍率：禁術 `buffMult`、靈寵增益 `petBuffMult`、懸賞對決化功。渡劫失敗的虛弱**有算**（是實際狀態）。
- 若日後改了戰力公式（例如改成物攻法攻取高），只改 `getRankPower()` 即可；規則的上限也要檢查是否仍合理。

### 基本防作弊（`tools/firestore.rules`）
- 只能寫自己 uid 的那筆；玩家不能刪除（管理者可以，第 50 節）；讀取單次最多 100 筆（保護免費額度，管理者不限）。
- 欄位白名單與型別／範圍：道號 1～12 字、宗門 ≤ 20 字、境界 0～15、階 1～10、等級 1～10000。
- 戰力上限（2026-09-27 收緊）＝ `10^境界 × 階 × 7 × 200 ＋ 等級 × 20 萬`（基礎值 200 倍＋裝備額度）。原本的 `10^(境界+9)` 太寬，
  曾讓「化神 3 階、Lv.10000、戰力 63 兆（基礎值 3000 萬倍）」通過；新上限下線上其餘 99 位正常玩家最高只用到 4.66%。細節見第 50 節。
- 被 GM 封鎖（`banned/{uid}` 存在）的 uid 不能再建立／更新紀錄；遊戲 `checkLeaderboardBan()` 查到被封就停止上傳，榜單視窗顯示「已被移出戰力榜」。
- 同一筆兩次寫入至少間隔 60 秒（`updatedAt` 必須等於伺服器時間）。
- 上傳歷史 `hist`（最近 24 次）與 `hist2`（每 30 分鐘、約 2 天）由規則 `nextHist()`／`nextHist2()` 強制接續（不能改、不能清），供 GM 比對戰力暴增與守城審核（第 50 節）。
- **限制**：戰力在玩家端計算，會改存檔的人仍可灌分；要更嚴格得改成雲端函式重算（需付費方案），目前不做。
- 已知現象：換裝置／清除瀏覽器資料／無痕視窗會拿到新 uid → 同一角色可能有多筆；舊筆不會自動刪除（顯示「N 天前」更新時間讓人分辨）。可用 GM 後台（第 50 節）刪除重複或久未更新的紀錄。

### 畫面
- 入口：
  - 洞府 HUD 的「戰力 N 🏆」（手機 `#hud-name .hud-power`、PC `#pc-hud-name .pc-power`，class `lb-entry`；padding＋負 margin 放大點擊範圍）。
  - 洞府「大道石碑」熱點（2026-09-28）：升仙台與天磯錄之間。背景圖上沒有石碑，由牌匾樣式 `.plaque-stele`（index.html，灰石漸層、圓頂、金字，置中於熱點）畫出；
    手機座標在 index.html `#home-hotspots`（第 31 節表格），PC 在 `config-home-pc.js` 的 `stele`（第 34 節表格）。
- 視窗 `#leaderboard-modal`：自己的戰力與名次（未進前 100 顯示「未進前 100 名」）、前 100 名（前三名獎牌、自己那列 `.lb-self` 高亮、境界階數／等級／宗門、多久前更新）、重新整理（冷卻 10 秒）。
- 其他玩家的道號／宗門一律經 `lbEscape()` 才插入 innerHTML（資料來自網路，不能信任）。
- 額度估算（Spark 免費：每日 5 萬讀、2 萬寫）：每位在線玩家每小時 12 次寫入 → 約 1,600 玩家小時／日；每次上傳另有 1 次讀取（hist，2026-09-27 起）→ 同樣 1,600 玩家小時約用掉 1.9 萬讀；每開一次榜單約 100 次讀取 → 其餘約 300 次開榜／日。玩家變多時先調長 `LEADERBOARD_UPLOAD_INTERVAL_MS` 或調小 `LEADERBOARD_TOP_N`。

- **Firebase App Check**（2026-10-04，版本 `20261005AH`，保護 Firebase 額度）：`LEADERBOARD_APP_CHECK_KEY`（config-leaderboard.js，reCAPTCHA v3 網站金鑰，空字串＝不啟用）。
  有金鑰時 `initLeaderboardBackend` 多載入 `firebase-app-check-compat.js`，`initializeApp` 後立刻 `firebase.appCheck().activate(new firebase.appCheck.ReCaptchaV3Provider(金鑰), true)`；gm.html 對 'gm' app 同樣啟用。
  上線順序：① reCAPTCHA 管理頁建立 v3 金鑰（網域 k559610142-art.github.io）② Firebase 主控台 App Check 註冊網頁應用程式（填密鑰）③ 金鑰填進程式並發佈
  ④ 觀察 App Check →「Cloud Firestore」已驗證請求比例接近 100%（舊版快取的玩家更新後）⑤ 按「強制執行」。強制執行前沒有任何效果，也不會擋到玩家。

## 43. 秘境入口與鎮魔塔（`config-secret-realms.js`、`secret-realm.js`；2026-09-28）

- **目前範圍：只做入口**（玩家決定玩法之後再定）。活動選單「🌀 秘境」（`config-activities.js`，聲望 5,000＋煉虛）改為 `implemented: true`、`openFn: openSecretRealmModal`。
- **流程**：秘境列表 `#secret-realm-modal`（海報縮圖卡片 `.secret-card`，境界不足顯示 🔒 並變灰）→ 點卡片 → 全螢幕場景 `#secret-realm-scene`
  → 「⚔️ 入塔挑戰」→ 說明視窗 `#secret-realm-info-modal`（標語、介紹、預定獎勵、每日次數、🚧 敬請期待）。場景「↩ 離開」回到秘境列表。
- **場景版面**：海報完整顯示（`.secret-poster` 以 9:16 比例 contain：寬 = min(100vw, 100dvh × 768/1365)），四周用同一張圖模糊（`.secret-scene-blur`）鋪滿，
  所以手機（上下留一點邊）與 PC（左右模糊）都不會裁掉圖上的標題與標語。「入塔挑戰」按鈕在海報內以 % 定位（右側山崖、靠右 4%、高 64%），
  字級 `clamp(14px, min(2.6vh, 4.4vw), 26px)`，窄螢幕不會超出海報（實測 375 寬手機）。
- 海報圖由 `openSecretRealmScene(id)` 依 `secretRealmList[].img` 換上，**新增秘境只要在 config 加一筆**（建議 9:16 直式海報，重要內容放中間）。
- **2026-09-27 起海報比例可逐秘境設定**：`size: [寬, 高]` 寫進場景的 CSS 變數 `--pw`／`--ph`（沒填 = 768×1365）；有 `imgPc` 且視窗寬 > 高時改用 PC 版海報（`sizePc`）。
  `sceneTitle`／`sceneSub` 在海報上疊標題（`#secret-realm-title`，海報沒有字時用）；`enterLabel` 換按鈕文字；`enterPos: 'bottom'` 按鈕移到海報下方置中（`.secret-enter.bottom`）；
  `mode: 'defense'` 時按鈕直接 `openDefenseBattle()`（第 49 節）、`mode: 'tower'`（鎮魔塔，2026-09-27）直接 `openZhenmoTower()`（第 51 節），不顯示說明視窗。
  鎮魔塔只有在「有 BOSS 資料的樓層」開始問答時才扣次數（第 51 節）。
  說明視窗必須排在場景 DOM 之後才疊得上去。
- **已決定、待實作的設計**（記在 config）：
  - 鎮魔塔獎勵：異火碎片（`addFireShards`）、秘境裝備與套裝（gear.js 的 `realm` 管道，目前 `locked: true`）、結識諸天夥伴（`meetPartner`）、靈石／星允鐵等基本資源。
  - 每日挑戰次數 `SECRET_REALM_DAILY_ATTEMPTS`（2026-09-27 改 **3 次**，每個秘境各自計算，失敗也算；實作見第 49 節）。
  - 玩法（爬塔或掛機地圖）尚未決定；實作時把 `implemented` 改 true，並在秘境戰鬥的受擊計算乘上 `1 - getStrangeFireRealmReduction()`（第 38 節）。

## 44. 歷練日誌分頁（戰鬥／道具／僕從）與日誌字級（`ui.js`、index.html；2026-09-28）

- **結構**：戰鬥分頁的「歷練日誌」下有三顆分頁鈕 `.log-tab`（`data-log-tab` = `battle`／`item`／`servant`）與三個捲動框
  `#log-battle`／`#log-item`／`#log-servant`（class `.log-box`，只有 `.active` 顯示）。舊的單一 `#log` 已移除，CSS 一律寫 `.log-box`。
- **分流規則**（`addLog(msg, type, force, channel)`）：
  1. 有傳 `channel`（`LOG_CHANNELS` 之一）就用它；
  2. 否則查 `LOG_CHANNEL_BY_TYPE`：`servant` → 僕從、`equip` → 道具；
  3. 其餘（combat／skill／heal／system／quest／level-up／reincarnate…）→ 戰鬥。
  `type` 仍只決定顏色；每則訊息只進一個分頁。各分頁各自保留最新 `LOG_MAX_ENTRIES[分頁]` 則（戰鬥 150、道具 50、僕從 50），僕從洗版不會擠掉戰鬥訊息。
- **戰鬥細節**：`FIELD_LOG_DETAIL = true`（ui.js）→ 野外逐回合的技能、屬性效果、妖獸攻勢、凍結、持續傷害都會寫進戰鬥分頁（一般攻擊本來就不寫），
  另有每波遭遇與波末彙總。戰鬥分頁因此保留 150 則。見第 33 節末。
- **道具分頁**：`equip` 類（掉寶、鍛造、分解、千寶閣／靈寶閣裝備、符寶）自動進入；另外這些呼叫明確傳 `channel = "item"`：
  星允鐵 `addStarIron`（enhance.js，含僕從挖礦）、千寶閣星允鐵（enhance.js）、星允鐵袋與壽元丹（auction.js）、異火碎片 `addFireShards`、
  丹藥堂購買（shop.js）、七彩補天石凝結與破障丹（merit.js）、靈田收穫（field.js）、賭坊切石（casino.js）。
  **日後新增「獲得道具」的日誌，請傳 `false, "item"`**（type 照舊決定顏色）。
- **僕從分頁**：`servant.js` 的所有日誌（指派、召回、完成、停工、解僱）與 combat.js 救出／小屋已滿的訊息都用 type `servant`。
- **未讀數**：寫入非目前分頁時 `logUnread[channel]++`，分頁鈕上的紅色 `.log-tab-badge` 顯示數量（>99 顯示 99+），切換過去歸零。
- **記住選擇**：`switchLogTab()` 寫入 `localStorage['xiuxian_log_tab']`（裝置偏好、不進存檔，try/catch）；`main.js` 的 `window.onload` 呼叫 `restoreLogTab()` 還原。
- **字級**（玩家反映太小）：改前實測手機 `#tab-sheet` 14px × `#log` 0.82em（≤900px media）= **11.48px**，PC 面板 15px × 0.85em = 12.75px；
  現在 `.log-box { font-size: 0.94em }` → 手機約 **15px**、PC 約 **16px**（字級「中」；整體字級見第 45 節）。
- 驗證紀錄（2026-09-28，本機 PowerShell 靜態伺服器）：戰鬥／系統訊息進戰鬥、星允鐵與掉寶進道具並顯示未讀 2、一鍵解僱日誌進僕從；
  點分頁鈕時按鈕與顯示框一致；鎖定僕從後單獨解僱被擋、一鍵解僱只刪未鎖定的；Console 無錯誤。

## 45. 介面字級（`--ui-scale`、設定視窗「字級」；2026-09-28）

- **基準字級**（字級「中」）：分頁面板 `#tab-sheet` 手機 **16px**（原 14px）、PC **17px**（原 15px）；所有彈窗 `.modal-content` **16px**（原本繼承 body 16px，現在明寫）。
  面板內大多用 em，會一起等比放大；日誌 0.94em ≈ 15px。
- **字級設定**：`:root { --ui-scale: 1 }`，上面三處都寫成 `calc(基準px * var(--ui-scale))`。
  settings.js 的 `FONT_SCALES`：小 0.875（14px）／中 1（16px，預設）／大 1.125（18px）；`setFontScale(id)` 存 `localStorage['xiuxian_font_scale']`（裝置偏好、不進存檔），
  `applyFontScale()` 設定 CSS 變數，`main.js` 的 `window.onload` 開頭呼叫。設定視窗 `#settings-font-scales` 由 `renderSettingsModal()` 產生三顆按鈕。
- **洞府 HUD 不跟字級設定走**（被背景圖上的框限制），改成**最小 11px**：手機 `.hud-realm`／`.hud-level-line`／`.hud-power`／`#hud-stats`／`.hud-bar > em`／`#btn-settings`
  用 `max(11px, calc(var(--u) * N))`，血條高度 `max(14px, …)`、標籤寬 `max(24px, …)`；`#hud-name > *` 行高 1.15 才塞得進名字框。
  PC 版只調 `.pc-power`、`.pc-stat-label`（最小 11px）；PC 狀態條內的數字 `.pc-stat-bar > em` 仍是 10u（條高只有約 10px，放大會被裁切）。
  改前 390px 寬手機實測：戰力／等級約 8～9px、血條數字 7.8px。
- 驗證紀錄：390×844、360×740 手機，以「混沌道祖 10階／戰力 9999.9兆／9999.9兆/9999.9兆」測試，血條數字剛好不溢出、名字框上下只超出約 4px（仍在圖框內）；
  小／中／大切換後面板、彈窗、日誌字級正確，HUD 維持 11px；Console 無錯誤。
- ⚠️ 新增面板或彈窗時字級請用 em，才會跟著字級設定縮放；不要寫死 px。

## 46. 彈窗右上角 ✕（`ui.js` 的 `initModalTopClose`；2026-09-28）

- 玩家反映：所有彈窗的「關閉／離開」都在最下方，內容長（情緣約 14,800px、靈寶閣、宗門、天磯錄…）要捲到底才能關。
- `main.js` 的 `window.onload` 呼叫 `initModalTopClose()`：替每個 `.modal-bg > .modal-content` 最前面插入
  `.modal-top-close-wrap`（`position: sticky; top: 0; height: 0`，不佔版面）＋ `.modal-top-close` 圓形 ✕（34px，絕對定位在右上角）。
  捲動時 ✕ 一直留在視窗右上角（實測捲動 1500px 後位置不變）。
- **✕ 等同按底部的關閉鈕**：`onclick` 會去點該視窗最後一個 `.close-btn` 或 `[data-modal-close]`，所以每個視窗原本的關閉行為
  （例如千寶閣搶拍的「暫時離開」、影片的 `closePartnerVideo()` 會停止播放）都不變。
  「修改道號」的「取消」與風希影片的「關閉」不是 `.close-btn`，已加上 `data-modal-close`。
- 沒有關閉鈕的視窗**刻意不加**：讀檔失敗 `#load-error-modal`（必須三選一）、選性別 `#gender-modal`、情緣對話 `#partner-dialog-modal`（由對話按鈕結束）。目前共 35 個視窗有 ✕。
- ⚠️ 新增彈窗時：底部關閉鈕用 `class="close-btn"`（或加 `data-modal-close`），就會自動有 ✕；不要直接改寫整個 `.modal-content` 的 innerHTML，否則 ✕ 會被清掉。

## 47. 洞府資源框標籤與說明（2026-09-28）

- 玩家問「右上角寶石是什麼」：手機版右資源框的寶石圖示其實是**聲望**（圖上原為「仙玉」），PC 版三格（藍晶／元寶／藍鑽）又是另一種對應，容易搞混。
- **標籤**：`.hud-pill-text::before`／`.pc-pill::before` 以 `content: attr(title)` 顯示「靈石／聲望／獸丹」，絕對定位在資源框左邊（`right: 100%`），
  深色圓角底**蓋住圖上的圖示**，數字維持原本寬度。數字仍由 `updateHomeHud()` 以 innerText 寫入，不影響 ::before。
  資源框原本的 `overflow: hidden` 改成 `overflow: visible` + `clip-path: inset(-4px 0 -4px -60px)`：只裁右側（數字過長仍被截），左側讓標籤伸出去。
  ⚠️ `.pc-pill` 的主規則在後面，overflow／clip-path 要寫在它自己的規則裡，否則會被蓋回 hidden。
- **點擊說明**：資源框 `onclick="showHudResourceInfo('coins'|'rep'|'core')"`（home-ui.js，`HUD_RESOURCE_INFO`），用 `showStageToast` 顯示「💰 靈石 完整數字｜用途」。
  電腦滑鼠停留仍有 title 提示。
- 驗證：390×844 手機「靈石 123萬／聲望 5.6萬」、1376×768 PC「靈石 123萬／獸丹 3,450／聲望 5.6萬」都完整顯示；Console 無錯誤。

## 48. 天磯錄收藏星星顏色（`codex.js`、index.html；2026-09-28）

- 器錄每張卡片下 6 顆星依序代表 白／綠／藍／紫／橙／白金；`player.gearCodex[gearId]` 有該品級就點亮（取得過一次就永久點亮，見第 37 節）。
- 原本點亮時借用 `.quality-*` 文字色：白色與白金都偏白、白金的 `color: transparent` 讓光暈也透明，很難分辨。
  改由 `formatCodexStars(got)` 產生 `.codex-star.on.s0`～`.s5`，六色各自設計（index.html）：
  s0 白 月白 `#e2e8f0`、s1 綠 `#4ade80`、s2 藍 `#38bdf8`、s3 紫 `#c084fc`、s4 橙 `#fb923c`（各帶同色光暈），
  s5 白金 = 青→粉→金的七彩漸層流光（`rainbow-shift` 動畫，減少動態時停止）。點亮的星放大 1.12 倍；未點亮 `#374151`。
- 器錄分頁的部位按鈕下方有圖例 `formatCodexStarLegend()`：「星星＝取得過的品級：★白 ★綠 ★藍 ★紫 ★橙 ★白金」。
- 星星的 title 會寫「（已取得）／（未取得）」。

## 49. 秘境「魔屠天南」・死守天南城 100 波（`config-defense.js`、`defense.js`；2026-09-27）

- **入口**（照鎮魔塔）：活動「🌀 秘境」→ 列表卡片「魔屠天南」→ 全螢幕海報場景（手機版／PC 版海報，標題「魔屠天南」＋「死守天南城・共 100 波」由程式疊上，第 43 節）
  → 海報下方「⚔️ 死守天南城」→ `challengeSecretRealm()` 見 `mode: 'defense'` → `openDefenseBattle()`。開放境界同鎮魔塔（煉虛，`minRealmIndex: 6`）。
- **守城畫面** `#defense-scene`（z-index 101，疊在秘境場景上）：9:16 舞台 `#defense-stage` 置中，四周用 PC 海報模糊鋪滿。
  舞台內：三支 `<video data-clip>`（`#defense-vwrap`，色調 filter 與鏡頭 transform 套在外框）、特效畫布 `#defense-fx`、左上「↩ 離開」＋速度 ×1/×2/×4、右上波數框、中央波次橫幅、左下戰況（最多 4 則）。
- **載入與預計秒數**（`startLoading`）：以 `fetch` 串流下載三支影片，邊下載邊累計位元組；每 0.25 秒更新進度條與「⏳ 影片載入中，預計約 N 秒後開始」。
  速度 = 本次下載量 ÷ 經過時間（資料不足 150 KB 或 0.5 秒時，先用 `navigator.connection.downlink` 估算；都沒有就顯示「計算所需時間…」），剩餘秒數 = 未下載量 ÷ 速度。
  下載完轉成 blob 網址留在記憶體（`blobUrls`），**同一次遊戲再進入不必重新下載**（顯示「影片已就緒」直接開始）。失敗顯示錯誤與「🔄 重新載入」。
  實測（本機以 fetch 限速每秒 5 MB 模擬，共 39.3 MB）：第 1 秒預估「約 7 秒」，實際 8 秒完成，之後每秒遞減 1。
- **100 波組合**（`waveSpec(w)`）：主題 `DEFENSE_THEMES[(w-1)%10]`（色調、天氣、法術外觀、終結技）、影片 `DEFENSE_CLIPS[(w-1)%3]`（與主題錯開 → 30 種搭配）、
  變化 v = ⌊(w-1)/10⌋（0～9）決定開場招式（`DEFENSE_OPENERS`）、鏡頭（`DEFENSE_CAMERAS`）、慢動作與招式名稱（v ≥ 5 的終結技加「・極」）。
  每 10 波首領（`DEFENSE_BOSSES` 依序 10 名）。驗證：100 組 (主題, v) 與 100 組招式名稱都不重複、相鄰兩波主題必不同；三支影片場次 34／33／33。
- **影片輪播**：每支播到剩 `DEFENSE_CLIP_FADE`（0.6）秒時 `setWave(下一波)`＋`playClip`（新影片從 0 秒播放並淡入、舊的淡出後暫停）。第 100 波播完 → 結算「守城成功」（守住波數、斬殺數）＋「↩ 返回秘境」。
  中途「↩ 離開」會 confirm（已守住的獎勵保留、次數已用），並中止下載（AbortController）。
- **⏭ 一鍵結束**（2026-10-01，版本 `20261005a`；使用者要求「魔屠天南新增一鍵結束」）：守城畫面左側「📜 通關紀錄」下方的紅框按鈕 `#defense-skip`（`top: 116px`；原本放在速度列右邊，窄螢幕會被右上波數框蓋住）。
  只在守城進行中顯示（`start()` 顯示，`settle()`／`close()` 隱藏）。按下 `finishDefenseNow()` → `DefenseBattle.finishNow()`：從目前這一波起，用**同一套** `setWave` → `simulateWave` 判定一路打下去，
  守住就 `grantWave`（獎勵、稱號、首領圖紙、夥伴碎片都照常），守不住或打完第 100 波就 `settle`（結算畫面、日誌、通關紀錄、送審都照常）。不需確認、不另扣次數。
  斬殺數原本來自影片招式（每波約 6～17），跳過時比照補上：一般波 `kill(6, 14)`、首領波 `kill(6, 12)`＋首領 1 隻（demon，斬妖錄）。戰況加一則「⏭ 一鍵結束：從第 N 波直接打到底」。
  驗證：渡劫 10 階裸裝第 1 波就失守 → 立刻「天南失守」；測試頁把攻擊與氣血 ×400 → 0.16 秒打完 100 波「守城成功」、靈石 2740 萬、5 個稱號、斬殺 1013、通關紀錄 1 筆；Console 無錯誤。
- **每日次數**（2026-09-27）：每個秘境各自每天 `SECRET_REALM_DAILY_ATTEMPTS`（3）次，`player.secretRealmDaily = { date, used: { 秘境id: 次數 } }`（跨日自動重置）。
  `secret-realm.js` 的 `getSecretRealmAttemptsLeft(id)`／`useSecretRealmAttempt(id)`；**影片載入完、守城真正開始時才扣**（`start()`），載入失敗不扣。
  列表卡片顯示「可挑戰・今日 N/3」，場景按鈕「⚔️ 死守天南城（今日 N/3）」（`refreshSecretRealmEnterLabel`）；用完時按鈕跳提示不進入。
- **強度**（2026-09-27 玩家指定，`DEFENSE_MILESTONES`）：第 1 波**煉虛 1 階**、10 合體、20 大乘、30 渡劫、40 仙人初境、50 天仙、60 真仙、70 大羅金仙、80 混元大羅金仙、90 混沌道祖（除第 1 波外皆 10 階）。
  第 1 波原本是煉虛 10 階，測得煉虛 1～9 階（秘境開放境界）一波都守不住，玩家同意改 1 階；里程碑可選填 `stage`。第 1～10 波因此每波約 ×1.67（其後每 10 波 ×10）。
  強度標籤（`waveRealmLabel`）：里程碑波次直接顯示指定境界；其他波次從煉虛起找「不超過該強度」的最高境界階數（某境界 10 階與下一境界 1 階數值相同，保留前者）。
  某境界某階的攻擊 = 懸賞人物同一條曲線（`realmAtk`：修為圓滿基礎戰力 × `getBountyRefSectMult`），氣血 = 攻擊 × 20；里程碑之間**等比例遞增**（`waveAtk`），
  91～100 波沿用 80→90 的倍率繼續往上（第 100 波 = 混沌道祖 10 階 ×10）。畫面與戰況顯示「強度：合體 4 階」（`waveRealmLabel`）。
  減傷／閃避／異屬性依波次線性提高（`DEFENSE_ENEMY`：減傷 15→35、閃避 8→20、異屬性 10→35%）。**首領不另外加強**（見下方測試）。
- **勝負**（`simulateWave`）：每波開始時用玩家**當下真實數值**（`getPhysAttack`/`getMagAttack` 取大者 × `DEFENSE_PLAYER_SKILL_MULT` 1.3、`getMaxHp`、`getPlayerCombatAttrs` 的減傷閃避五行異屬性）
  與該波妖潮，以 `resolveHit`＋`tickStatus` 在背後打一場（每波滿血、最多 `DEFENSE_MAX_ROUNDS` 150 回合，逾時算失守；不影響玩家實際氣血狀態）。
  守不住的那一波：戰況先顯示「⚠️ 妖潮勢大…」，影片播到 `DEFENSE_LOSE_AT`（45%）時「天南失守」結算。武學、夥伴絕學、裝備特效沒有計入（1.3 倍是平均估算）。
- **獎勵**（`DEFENSE_REWARDS`，每守住一波在該波影片結束時 `grantWave` 立即發放；首領波 = 每 10 波）：
  - 靈石 = 等強度境界主要練功地圖（`realmPacing[].map`）掛機 2 分鐘的收入（首領 ×3）；功德 3～12（首領 80～200，首領波後 `settleMeritStones` 自動凝結補天石）。
  - 異火碎片：15% 得 1～2（首領必得 3～8）；星允鐵：20% 得 1～2（首領必得 3～6），皆經 `addFireShards`／`addStarIron`（星允鐵吃「尋鐵」特效）。
  - 裝備：一般波 6% 掉器錄**武器／防具**一件（奪寶／拍賣／可製作管道，不含秘境）；**秘境套裝部件**首領波必掉 1 件、第 20 波起一般波 3%（一次一件，不會整套）。
    品級：1～29 波 藍 50／紫 40／橙 10%，30～59 波 紫 60／橙 40%，60 波起 紫 30／橙 70%；裝備等級同奪寶（不超過人物等級的最高 `EQUIP_LEVELS`），背包滿時同 `receiveLootEquip`。
  - 稱號（`config-titles.js` 的 `defenseWave`，依歷史最高 `player.defenseBest`）：10「天南守卒」減傷 +1、30「天南守將」攻 +1%、50「鎮城仙將」血 +2%、80「魔屠天南」攻 +2%、100「天南城守護神」四維 +3%。
  - 夥伴：~~守住第 51 波起每波 4% 遇見一位天驕~~ → 2026-09-29 改為**夥伴碎片**（第 39 節）：第 11 波起每守住一波 15% 掉 3～8 片天驕碎片，第 40 波起改掉尊者碎片（`partnerFromWave`／`partnerZunzheFromWave`／`partnerChance`／`partnerShards`）；
    結算畫面與日誌列出「夥伴碎片」。
  - 結算畫面列出本次總收穫與新稱號；遊戲日誌「🎁 道具」分頁記一筆彙整（`logRun`，中途離開也會記）。
- **通關紀錄**（2026-09-27）：守城畫面左上（速度鈕下方）與結算畫面各有「📜 通關紀錄」→ `#defense-records`（疊在舞台內 z-index 5，守城不暫停）。
  每場結束（`logRun` → `recordRun`，勝／敗／中途離開都記）存 `player.defenseRuns`（最新在前、最多 `DEFENSE_RUN_LOG_MAX` 20 場）：
  `{ at, cleared, win, kills, power, atk, realm, stage, level }`。數值是**最後守住那一波開打時**的快照（`setWave` 存 `spec.snap`、`grantWave` 存到 `D.snap`），
  power = `getRankPower()`（物攻）、atk = `getRankAttack()`（物攻術攻取高，勝負判定用的那個），**都扣掉禁術等暫時增益**，與戰力榜同一標準。
  視窗也顯示歷史最高與守城排行榜狀態（`getDefenseRankStatusText`）。`defenseRuns`／`defenseSubmitted`／`defensePending` 與 `defenseBest` 一樣不在 state.js 預設值裡，用到時才建立（`|| 0`／`|| []`）。
- **守城排行榜**（2026-09-27，大道石碑視窗第二個分頁「🏯 死守天南城」）：
  - 送審：`recordRun` 守住 ≥ 1 波且**超過已送審的最高波數**（`player.defenseSubmitted`）→ `submitDefenseRecord` → `player.defensePending` → `flushDefenseSubmit()` 寫入 `defenseSubmit/{uid}`
    （name／best／atk／power／realm／stage／level／kills／runAt(用戶端達成時間)／updatedAt）。失敗（斷線、60 秒內重送）保留 pending，下次 `uploadLeaderboard` 結尾重試。
  - **玩家不能直接上榜**：公開榜 `defenseBoard/{uid}` 只有管理者能寫；GM 後台「🏯 守城審核」判定通過才登錄（第 50 節）。駁回時原因寫在送審紀錄，遊戲守城榜分頁會顯示「未通過原因」。
  - 視窗：`openLeaderboardModal(tab)` 不給 tab 就停在上次的分頁；`switchLeaderboardTab` 切換（沒資料才讀）。守城榜依波數排序、同波數先達成者在前，顯示境界階數、當時戰力、達成日期，全破顯示「🏆 全破」。
    讀守城榜時順便讀自己的送審紀錄（`lbDefenseMine`，多 1 次讀取）取得審核狀態。
  - 限制：換裝置／清除瀏覽器資料換新 uid 後，`defenseSubmitted` 仍在存檔裡，要打出更高波數才會再送審。
- **秘境裝備管道解鎖**：`config-gear.js` 的 `GEAR_CHANNELS.realm` 拿掉 `locked`（天磯錄的秘境裝備改為可收藏）。
  為了不讓舊稱號變難，收藏類稱號（codexAll／codexPlatinumAll／category／slot／element）改用 `codex.js` 的 `getTitleGear()`（固定**不含秘境**）。
- **難度測試**（2026-09-27，`simulateWave` 連續打到失守，各 30 場；「中等」= 攻擊 ×3＋減傷 40 閃避 25，約等於有裝備四維／靈根／光環的玩家）：

  | 玩家 | 裸裝 | 減傷 60 閃避 40 | 中等 |
  |---|---|---|---|
  | 煉虛 1 階 | 0～1 波 | 1～2 | 2～3 |
  | 煉虛 5 階 | 3～4 | 5 | 5～6 |
  | 煉虛 10 階 | 5 | 6～7 | 7 |
  | 合體 5 階 | 8 | 9～10 | 10～11 |
  | 合體 10 階 | 9～10 | 12～13 | 13～14 |
  | 渡劫 10 階 | 29 | 31～32 | 31～33 |
  | 真仙 10 階 | 58～59 | 61～63 | 62～64 |
  | 混沌道祖 10 階 | 88～89 | 91～92 | 91～93 |

  - 同境界、無裝備大約卡在與自己相同強度的那一波（勝負約五五波）；裝備與攻擊加成約多守 2～4 波。
  - 第 1 波改煉虛 1 階前，煉虛 1～9 階幾乎一波都守不住（第 1 波 = 煉虛 10 階時：煉虛 1 階 0 波、煉虛 10 階 0～5 波），後段不受影響。
  - 首領曾設「攻 ×1.5、血 ×3」，測得每個境界都卡死在自己的首領波（減傷閃避也沒用），違背里程碑而取消；回合上限也由 60 改 150（60 回合時首領幾乎全逾時）。
- **時間軸**（`CUES`，以原片秒數撰寫，實際 = 秒數 − `trim`）：雷戰 0.75 開場／3.9 護體／5.1 劍氣／6.6 劍指法術／7.9 魔將化煙（慢動作）／8.9 終結技；
  佛焰 0.2 法陣／2.8 佛掌／4.9 千手／7.1 掌擊／7.7 業火；巨劍 0.2 巨劍降世／2.6 貫地／3.1 法相／4.5 金環／5.9 光柱／6.9 光爆／8.5 雲開見日。
  轉檔後的影片從原片 0.6 秒開始（頭尾交叉淡入淡出做無縫循環），`trim` 要設 0.6；原檔 `trim: 0`。**換影片檔時務必同步改 trim**，否則特效會早／晚 0.6 秒。
- **浮水印**：三支 Pippit 影片左上角有浮水印，靠 `zoom`（雷戰 1.08、佛焰／巨劍 1.16）放大裁掉；鏡頭運動只會再放大，不會低於 zoom。
- **避免命名衝突**：`defense.js` 內部的 `draw`／`feed`／`kill`／`ring`／`burst` 等全部包在 `DefenseBattle` 閉包裡；對外全域只有 `DefenseBattle`、`openDefenseBattle`、`closeDefenseBattle`、`setDefenseSpeed`、`finishDefenseNow`（一鍵結束）、`openDefenseRecords`、`closeDefenseRecords`。
  `DefenseBattle._sim(w, 秒數)` 可在不播影片的情況下跑某一波的時間軸（測試用，會改動目前狀態）。驗證：100 波各跑 11.5 秒無錯誤，同時粒子最多約 240 個。
- **影片轉檔（瀏覽器，不需 ffmpeg）**：
  - 即時錄影（`MediaRecorder`＋畫布）需要瀏覽器面板全程顯示，Claude 桌面版的預覽面板隱藏時只錄得到 1 格，**不可靠**；錄出的是分段 MP4（mvhd 長度 0），還要另外補 `mehd` 才讀得到長度。
  - 改用**逐格轉檔**：逐格 seek → 畫到 720×1280 畫布（最後 0.6 秒與開頭疊合）→ WebCodecs `VideoEncoder`（avc1.640028、2 Mbps、每 30 格一個關鍵格）→ 自組標準 MP4（ftyp＋mdat＋moov），與面板是否顯示無關。
  - 本機預覽伺服器必須支援 HTTP Range，影片才能 seek（沒有 Range 時 currentTime 永遠停在 0）。
  - 2026-09-27 以此法轉出佛焰（264 格、2.38 MB）與巨劍（262 格、2.34 MB），各約 3 分鐘；與原片同時間點比對差異 8～17（不相干畫面 99～134），trim 0.6 對齊正確。
- 三支合計約 7.5 MB（手機 4G 約 5～15 秒）。videos/ 內的原始大檔（10～18 MB）遊戲不會載入，若不需要保留可以不推上 GitHub。
- 新制（第 52 節，`NUMERIC_V2`）：每波改為該強度「一般玩家」的鏡像（`defenseRealmAtk` 分流、氣血比例 3.6 × 5、模擬時玩家氣血也 × 5、減傷閃避較平緩），難度表與「裝備影響遠大於境界」的待決事項見第 52 節。
- **每波額外成長**（2026-09-29，版本 `20261001v`；玩家回報「隨便都能打到 100 波」）：
  - 原因：新制下 `defenseWaveAtk` 從第 1 波到第 100 波只差約 2 倍（攻擊 22.5 → 46.4），裝備與增益卻能讓攻擊多 2～5 倍，所以煉虛 1 階「攻擊 ×2、減傷 30、閃避 20」就能打到 68～91 波，「攻擊 ×4、減傷 60、閃避 40」必定全破。這不是程式漏洞（勝負判定、失守流程都正常）。
  - 修正：`config-defense.js` 新增 `defenseWaveMult(w)` = `NV2.defenseWaveGrowth`（1.015）^(w−1)（舊制 = 1；第 50 波約 ×2.1、第 100 波 ×4.4）。`waveEnemy` 的攻擊與氣血都要乘上這個倍率。
    `defenseWaveAtk` 仍是基準強度（強度標籤、`waveCoins` 靈石獎勵用它），標籤後面加上「・妖潮 ×N」（≥ 1.05 才顯示）。gm.html 守城審核 ② 的「該波強度」也改成基準 × 倍率。
  - 校準（`simulateWave` 同公式，各 15 場連打到失守；攻／血 = 同境界一般玩家的倍數）：

    | 玩家 | 一般（×1、減 0 閃 8） | 好裝（攻 ×2 血 ×1.5、減 30 閃 20） | 頂配（攻 ×4 血 ×2、減 60 閃 40） |
    |---|---|---|---|
    | 煉虛 1 階 | 2～5 | 25～33 | 58～70 |
    | 合體 10 階 | 5～8 | 32～39 | 70～79 |
    | 渡劫 10 階 | 10～14 | 40～46 | 73～85 |
    | 真仙 10 階 | 17～22 | 50～56 | 76～94 |
    | 混沌道祖 10 階 | 20～29 | 53～64 | 91～100 |

    修改前（倍率 1）：好裝的煉虛 1 階 68～91 波，渡劫 10 階以上好裝全部全破。仍然是裝備大於境界，但全破大約要混沌道祖＋頂配。
    也測過 1.02 和 1.025：混沌道祖頂配分別只到 76～85 和 64～74 波，沒有人能全破，所以沒有採用。
- **命中、實際閃避減傷上限、首領光環、境界壓制**（2026-09-29 同日稍後，版本 `20261002o`～`q`）：
  - 妖潮帶命中（第 17 節「敵人命中」）；玩家實際閃避／減傷最多 30%（第 17 節）。
  - **首領多重光環** `DEFENSE_BOSS_AURAS`（config-defense.js，索引同 `DEFENSE_BOSSES`）：前期首領 2 個光環、中後期 3 個、魔祖真身 4 個（毒涎、寒息、魂火、瘴氣、麻痺、詛咒、業火、天魔寒獄、混沌魔焰…）；
    `waveEnemy` 回傳 `auras`，`simulateWave` 每回合套用；首領波戰況列出光環名稱。守城一波約 20 回合，所以每回合效果比鎮魔塔強（凍結 5～8%、燒傷／中毒 12～18%、持續扣血 1～1.5%、回血 1～1.5%）。
  - **境界壓制**（使用者反映「煉虛怎麼可能通關天仙等級關卡」）：`numeric.js` 的 `nv2SuppressByL(L)`（與野外 `nv2SuppressMult` 同參數：每高 1 個大境界，氣血 +100%、攻擊 +120%）；
    `waveEnemy` 以 `defenseWaveL(w)` 對玩家計算、攻擊與氣血都乘上；差距 ≥ 0.5 境時戰況顯示「⚠️ 境界壓制」。**使用者 9/28 的「裝備大於天賦」決定因此改為：境界是門檻，裝備只多守幾波。**
  - 加了上面幾項後 1.015 太難（混沌道祖頂配只到 79～85 波），`defenseWaveGrowth` 改 **1.008**。模擬（各 12 場連打到失守；一般＝同階一般玩家、好裝＝攻 ×2 血 ×1.5 減 30 閃 20、頂配＝攻 ×4 血 ×2 減 60 閃 40）：

    | 玩家 | 同境界是第幾波 | 一般 | 好裝 | 頂配 |
    |---|---|---|---|---|
    | 煉虛 1 階 | 1 | 1 | 4～5 | 9～12 |
    | 煉虛 10 階 | 6 | 2～5 | 8～9 | 14～18 |
    | 合體 10 階 | 10 | 5～9 | 16～17 | 24～28 |
    | 渡劫 10 階 | 30 | 11～18 | 34～35 | 39～45 |
    | 天仙 10 階 | 50 | 17～23 | 49～53 | 56～59 |
    | 真仙 10 階 | 60 | 19～29 | 49～62 | 67～69 |
    | 混沌道祖 10 階 | 90 | 29～42 | 69～79 | 89～99 |

    上面那張 1.015 的表是加這些之前的紀錄。

## 50. 戰力榜 GM 後台與防作弊（`gm.html`、`tools/firestore.rules`；2026-09-27）

- **目的**：作者（管理者）刪除／封鎖戰力榜上的異常資料。`gm.html` 放在網站根目錄（GitHub Pages 網址 `/gm.html`），遊戲內沒有連結，`<meta name="robots" content="noindex">`。
  **網頁公開沒關係，權限全部由 Firestore 規則把關**：只有 `admins/{uid}` 存在的 Google 帳號能刪除、封鎖、讀完整榜單；其他人打開只看得到公開前 100 名（唯讀、按鈕停用）。
- **開通步驟（作者做一次，主控台操作）**：
  1. Firebase 主控台 → Authentication → 登入方式 → 啟用 **Google**（匿名登入保持啟用）。授權網域要有 GitHub Pages 網域與 `localhost`。
     （2026-09-27 已完成：Google 已啟用；授權網域已加入 `k559610142-art.github.io`。匿名登入不檢查授權網域，Google 登入會，
     缺少時 gm.html 登入會出現 `auth/unauthorized-domain`。GM 頁網址：`https://k559610142-art.github.io/-username-.github.io-/gm.html`）
  2. 整份貼上新版 `tools/firestore.rules` → 發布。（2026-09-27 2:52 已發布）
  3. 打開 `gm.html` → 「Google 登入」→ 頁面顯示你的 uid（可複製）。
  4. Firestore → 資料 → 開始集合 `admins` → 文件 ID = 上一步的 uid（欄位隨意）→ 儲存。重新整理 gm.html，上方顯示「管理者」即完成。
  - 管理者名單只能在主控台新增（規則 `admins` 一律不可寫），所以不需要把 uid 或 email 寫進程式碼。
- **GM 登入與遊戲分開**：gm.html 用 `firebase.initializeApp(設定, 'gm')` 的獨立 app 名稱，登入狀態分開保存；
  在同一個瀏覽器登入 GM 不會讓遊戲的匿名 uid 被換掉（否則榜上會多一筆）。gm.html 直接載入 `data/config-realms.js`（境界名稱）與 `data/config-leaderboard.js`（Firebase 設定、集合名稱）。
- **功能**：
  - 📋 戰力榜：管理者一次讀 1000 筆（依戰力排序）。每筆算出「基礎值倍率」（戰力 ÷ 7×階×10^境界）與「佔規則上限 %」，自動標記：
    🔴 超過規則上限（新規則下已無法再上傳，但舊資料仍在榜上）、🟡 佔上限 ≥ 15% 或 等級 >（境界+1）× 1500、灰「重複」（道號＋境界＋階＋等級＋戰力完全相同，保留最新一筆）、灰「N 天未更新」。
    可篩選；逐筆「刪除」「封鎖」、勾選批次、一鍵「封鎖全部超標」「刪除久未更新」（天數可設，預設 14）。所有破壞性操作都會 confirm／prompt 原因。
  - ⛔ 黑名單：`banned/{uid}` = { name, realm, stage, level, power（封鎖時的快照）, reason, bannedBy, bannedAt }；可解除封鎖。封鎖＝寫黑名單＋刪榜單紀錄＋刪守城榜與守城送審（同一個批次）。
  - 🏯 守城審核（2026-09-27，死守天南城排行榜，第 49 節）：讀 `defenseSubmit`（玩家送審）與 `defenseBoard`（已登錄），逐筆 `verifyDefense()` 判定：
    - **① 前後對比**：用戰力榜同 uid 的 `histPoints`（hist2＋hist＋目前那筆，約 2 天內），找達成時間 `runAt` 前後 ±N 分鐘（預設 30）的上傳；送審戰力不可高於其中最高值 × 倍數（預設 1.2）。表格顯示「前 → 後」兩筆。
      找不到紀錄（沒上戰力榜、或 hist 已被擠掉）→ ❔ 無法比對，留給人工。另外 `runAt` 須落在送出時間前 3 天～後 5 分鐘內。
    - **② 能否守住**：攻擊 ÷（`defenseWaveAtk(波數)` × `defenseWaveMult(波數)`）（config-defense.js，與遊戲同一條強度曲線；2026-09-29 起含新制每波成長，第 49 節）≥ 設定 %（預設 10%）。
    - **③ 數值一致**：攻擊 ≥ 戰力 × 0.99（攻擊取物攻術攻較高者）且 ≤ 戰力 × 倍數（預設 5，規則也限制 5 倍）。
    - 已封鎖、或戰力榜被標 🔴 超標／🟠 暴增 → 不通過。
    - 結果：✅ 通過／❌ 不通過／❔ 無法比對。逐筆「登錄」（判定非通過時 confirm 列出原因）「駁回」（prompt 原因，預填判定結果）；批次「✅ 登錄全部判定通過」「❌ 駁回全部判定不通過」。
      登錄 = 寫 `defenseBoard/{uid}`（name／best／power／atk／realm／stage／level／runAt／approvedBy／approvedAt；榜上已有更高波數則不覆寫）＋送審標 `status: 'ok'`；駁回 = 送審標 `status: 'rejected'`＋`reason`（榜上保留之前通過的）。
    - 自動巡檢勾「自動審核守城紀錄」：待審核的 ✅ 自動登錄、❌ 自動駁回（原因「自動審核：…」）、❔ 留給人工。前後對比依賴約 2 天內的戰力歷史，審核要在 2 天內做。
    - 設定在「守城審核」分頁（`DEF_DEFAULTS`，localStorage `gm_defense_settings`）。gm.html 為此多載入 `config-bounty.js`、`bounty.js`（只用 getBountyRefSectMult，檔案只宣告常數與函式）、`config-defense.js`。
    - **門檻校準**（2026-09-27，用遊戲的 `simulateWave` 二分搜尋「最低攻擊 ÷ 該波強度」，每點 30 場取有贏過的，氣血 = 攻擊 × 20 如真實玩家）：
      裸裝 95～125%、中等（減傷 40 閃避 25＋火雷 20、剋制五行）40～47%、強力（減傷 60 閃避 40＋五種異屬性 20～50、秘典 20%、剋制五行）13～18%（氣血 ×60 時 9～11%）；
      全部上限＋秘典 50% 的理論極限約 1%（太寬不採用）。預設 10% 不會誤擋正常玩家；偽造「渡劫守住 100 波」之類只有 0.0001% 以下。
      日後改了守城強度或戰鬥公式，要重新校準。
    - 抓不到：戰力本身是改存檔灌出來、但沒被 🟠 暴增抓到（例如第一次上傳就灌、或在上限內慢慢灌）——那樣守城在遊戲裡是真的守得住，前後對比也相符。
  - 🟠 戰力暴增（2026-09-27）：比對每筆的 `histPoints(r)`（`hist2` 兩日紀錄＋`hist` 最近 24 次＋目前這筆，依時間排序去重；時數最多可設 48），**任兩次上傳相隔 ≤ H 小時、後者 ÷ 前者 ≥ N 倍、且後者 ≥ M 萬**就標記。
    H／N／M 在「戰力榜」分頁的「📈 戰力暴增判定」列設定（預設 1 小時／30 倍／100 萬，`JUMP_DEFAULTS`），存在 GM 瀏覽器的 localStorage `gm_jump_settings`。
    預設 30 倍的依據（2026-09-27 依 getBasePower＋realmPacing 估算）：純修煉 1 小時最大成長 凡人→煉氣 約 96 倍（戰力 5→480）、煉氣 14、築基 9.6、金丹 7.3、元嬰 5.6、化神 4、煉虛 2.7、合體 2.1、大乘以上約 1.5（升一階）；
    修煉速度快於節奏表 3～5 倍時化神附近可到 7～10 倍。瞬間跳升：換宗門最多 ×6（powerMult 1.0→6.0）、裝備／靈根／仙法／靈寵一次到位最多約 ×13、虛弱解除 ×1.43。
    100 萬以下多為凡人～築基新手（成長本來就快）所以不判定。等線上累積 hist 後，建議以「時窗內最大成長」正常玩家最高值的 2～3 倍重新校準。
    表格「時窗內最大成長」欄不論是否達標都顯示（滑鼠停留看幾分鐘內從多少到多少），用來校準門檻；沒有 hist 的舊紀錄顯示「—」。
    離線多天回來的第一次上傳與前一筆相隔超過時窗，不會誤判。可逐筆封鎖（原因預填漲幅）或「⛔ 封鎖全部暴增」。
    - `hist` 由規則 `nextHist()` 強制：每次更新必須等於「舊 hist ＋ {p: 舊 power, t: 舊 updatedAt}」取最後 24 筆，建立時必須是空的——玩家無法竄改或清掉先前的戰力；
      `hist2` 由 `nextHist2()` 強制：上一筆距 hist2 最後一筆 ≥ 1800 秒才接上（取最後 96 筆），否則必須原封不動；建立時也必須是空的。
      細的證據（每 5 分鐘）約 2 小時後被擠掉，粗的（每 30 分鐘）保留約 2 天，所以巡檢或人工檢查在 2 天內做即可（2026-09-27 本機測：20 小時前的暴增只剩 hist2 仍能抓到）。
    - 抓不到：第一次上傳就灌分（沒有前一筆可比；仍受規則上限限制）、換新 uid 後灌分；緩慢灌分可把時數調長（最多 48）比對，但早期境界正常成長也很快，長時窗的倍數要依境界斟酌。
  - 🟣 境界異常（2026-09-28，版本 `20260930g`；起因：清榜後「666」只上傳 1 次就是混沌道祖、戰力第一，改存檔的機率極高——離線最多結算 12 小時且離線不渡劫，照 realmPacing 渡劫→混沌道祖要 3 年以上）。**只標記、不自動封鎖**，巡檢也不處理：
    - **新面孔**：`histPoints` 最早一筆在 N 小時內（`hist2` 已滿 96 筆的不算）且境界 ≥ 門檻。預設 24 小時／仙人初境（`RX_DEFAULTS`）。清榜前的老存檔也會被標（上線時熙那、左莫都被標），要人工判斷。
    - **跳境**：榜上只有戰力歷史、沒有境界歷史（不改規則），所以用 GM 瀏覽器 localStorage `gm_realm_seen_v1` 記「uid → 上次看到的境界＋時間」；`reloadBoard()` 後 `updateRealmSeen()` 先把舊值掛到 `r._seenPrev` 再更新（超過跳境時數或境界變低＝轉世才換新值）。
      H 小時內升 ≥ K 個大境界且到了門檻以上就標。預設 24 小時／2 個／合體（煉虛 20 時＋合體 2 天，24 小時內正常不可能）。要定期開 GM 頁或開自動巡檢才有比對基準；換一台電腦的 GM 頁從零開始記。
    - 設定在「戰力榜」分頁的「🟣 境界異常判定」列（存 `gm_realm_check_v1`）；篩選多「🟣 境界異常」，統計多一格；守城審核遇到被標的玩家轉為 ❔ 人工（`verifyDefense` 的 `ok: null`），不直接駁回。
  - 🛡️ 自動巡檢：**頁面開著時**每 N 分鐘（預設 10）重讀榜單 → 🔴 自動封鎖＋移除（原因「自動巡檢：超過規則上限」）→ 勾「自動封鎖戰力暴增」時逐筆封鎖 🟠（原因記下漲幅）→ 可選同時刪久未更新；🟡 只標記不處理。
  - 批次寫入每 400 筆一批（Firestore 單批上限 500）。
- **真正的「關掉網頁也定時執行」**需要伺服器排程（Firebase Cloud Functions，需升級 Blaze 付費方案），目前不做。新規則已在寫入時擋下超標資料，巡檢主要清理舊資料與重複紀錄。
- **防作弊能力與限制**：
  - 擋得住：直接改存檔／主控台灌出不合理戰力（超過基礎值 200 倍＋等級額度）、被封鎖的 uid 再上傳、60 秒內重複上傳、亂塞欄位；在上限內改存檔瞬間灌分則由 🟠 戰力暴增抓出（GM 封鎖）。
  - 擋不住：同時偽造境界、階數與戰力（在上限內灌分）；被封後清除瀏覽器資料換新匿名 uid 重新上傳（需再封一次）。
  - 進一步可做（未實作）：Firebase **App Check**（reCAPTCHA，擋掉不是從遊戲網頁發出的請求）；Cloud Functions 在伺服器端依存檔重算戰力（需付費方案）。
- **門檻校準**（2026-09-27 讀取線上前 100 名）：正常玩家基礎值倍率 0.72～9.3（天仙 10 階、至高宗門＋裝備最高），作弊資料「大鵰俠」化神 3 階 Lv.10000 戰力 63 兆 = 3000 萬倍；
  新上限只擋下這一筆。另有大量預設道號「韓立」（41 筆）「南宮婉」（13 筆），多為停在凡人 1 階的新手殘留紀錄，不是作弊，可用「刪除久未更新」清理。
  ⚠️ 日後新增大幅提高戰力的系統（例如更強的稱號、夥伴、異火加成）後，請用 GM 後台看「佔上限 %」最高值，必要時同步調整規則與 gm.html 的 `CAP_BASE_MULT`／`CAP_PER_LEVEL`。
- 驗證紀錄：本機未登入唯讀模式讀到 100 筆，正確標出唯一的超標資料、無誤標，管理按鈕停用，Console 無錯誤。管理者操作（刪除／封鎖／巡檢）需作者完成開通步驟後在線上測試。
  - 戰力暴增（2026-09-27 本機以假資料測）：15 分鐘內 2000萬→50億 標 🟠；1.5 倍正常成長、離線 3 天後回來、無 hist 舊紀錄、低於 100 萬的新手皆未標；改門檻即時重算並存入 localStorage。
    **規則尚未在線上實測**（需作者發布新版 `tools/firestore.rules`）。
- 守城審核驗證（2026-09-27 本機以假資料測）：偽造波數（第 100 波、攻擊只有強度 7e-9%）、送審戰力 1000 兆但戰力榜同時段只有 2.6 億、戰力榜被標暴增者皆 ❌；沒上戰力榜者 ❔；
  攻擊為強度 513% 且與戰力榜相符者 ✅。遊戲端：守住 2 波後 `defenseRuns` 與待送審正確、通關紀錄視窗與大道石碑守城分頁（含道號跳脫）顯示正常，Console 無錯誤。**規則與實際寫入尚未線上實測**。
- ⚠️ **發布順序**：新規則要先發布——GM 的封鎖批次會一併刪 `defenseBoard`／`defenseSubmit`，舊規則下整批會被拒絕。新版 `leaderboard.js` 會送 `hist`、新規則要求 `hist`——舊規則會擋新程式、新規則會擋快取中的舊程式。請**同時**推上 GitHub 與在主控台發布規則；中間短暫上傳失敗只會 `console.warn`，不影響遊戲。
- 順帶修正（2026-09-27）：gm.html 的 `fmt()` 原本把整數尾端的 0 也刪掉（2000萬 顯示成「2萬」），已改為只刪小數尾端的 0。

## 51. 秘境「鎮魔塔」100 層・知識問答（`config-zhenmo.js`、`config-zhenmo-questions.js`、`zhenmo.js`；2026-09-27）

- **目前範圍**：100 層關卡、每層知識問答、結算、BOSS 房；第 1～6 層是手動設計的 BOSS，**第 7～100 層由程式自動產生**（2026-09-29，版本 `20261002s`～`t`，使用者要求「後續關卡每一關持續強化」）：
  - `config-zhenmo.js` 的 `generateZhenmoBosses()`（`ZHENMO_GEN` 參數）：已有手動資料的樓層優先，之後玩家提供新 BOSS 圖與設定時直接加進 `ZHENMO_BOSSES` 即可蓋過。
  - 境界＝煉虛起每層一階（11～20 層合體…91～100 層混沌道祖），另有境界壓制；攻擊每層 +1%、氣血每層 +0.5%（+1% 時第 100 層太久，強力配置 0 勝）；
    個位數 5 的層攻擊 ×1.5（「鎮關者」）、個位數 0 的層攻擊 ×2、光環 +1、獎勵 ×2（「樓主」）。減傷 15→35、閃避 8→25、屬性傷害 15→35 隨樓層提高。
  - 光環：從 10 種範本（威壓、鐵壁、迷蹤、寒獄、焚天、蝕骨、詛咒、噬命、不滅、破甲）選，2～4 個＋大關卡 1 個，強度隨樓層放大到 2 倍（最多 6 個、2.9 倍時第 100 層無人能過）。
  - 名稱＝10 個前綴 × 10 個後綴（每十層錯開一格，100 層不重複）；圖片沿用 6 張 BOSS 圖輪流；獎勵隨樓層提高（靈石 H 的 10＋0.5n 分鐘、功德、碎片、星允鐵）。
  - **夥伴碎片**（2026-09-29，版本 `20261002w`，第 39 節）：擊敗第 11～40 層 BOSS 必掉 8～15 片天驕碎片、第 41～60 層掉尊者碎片（`ZHENMO_PARTNER_MEET`，`grantRewards` 第 3 參數為樓層），結算畫面列出。
  - **種族關卡**（2026-09-30，版本 `20261003m`，第 62 節第 4 期）：樓主層（個位數 0）首次擊敗必得該 BOSS 種族的剋制法寶（≤30 層下品、≤70 中品、其餘上品）。
  - **隨機氣勢**（2026-09-29，版本 `20261002u`）：每次挑戰 BOSS 的攻擊與氣血 × (1 ± `ZHENMO_BOSS_VARIANCE` 0.2) 均勻隨機，開戰時戰況顯示「今日氣勢 +N%」（`startFight`）。
    原因：同樣數值的玩家幾乎必勝或必敗（難度差 5% 勝率就從 100% 掉到 14%），無法校準成使用者指定的「中等約 8 成」；加了浮動後勝率曲線變平滑。
  - **逐層校準**（同日，使用者指定目標勝率）：`ZHENMO_GEN.tune[樓層] = [攻擊倍率, 氣血倍率]`，乘在公式算出的 `atkMult`／`hpMult` 上。以測試頁二分搜尋（含隨機氣勢，各 150～200 場）求得：
    - 7～50 層：中等配置 80%；60、70、80、90、100 樓主與第 95 層：強力配置 80%；其餘 51～99 層：強力 90%。
    - 55、65、75、85 鎮關者：使用者要「中等 60%、強力 85%」，但兩者矛盾（強力配置的攻擊是中等的 2 倍、氣血與減傷閃避都更高，中等能贏 6 成時強力幾乎必勝；
      以強力 85% 為準時中等變 0%）→ 以**中等 60% 為準**，強力為 100%。使用者若改以強力 85% 為準，把這四層的 tune 換成約 [2.07, 1.44]／[2.03, 1.42]／[2.25, 1.50]／[1.66, 1.29]。
    - 驗證（各 200 場）：7～50 層中等 75～89%；樓主 60～90 層強力 80～85%；第 95、100 層強力 81%、85%；其他 51～99 層強力 89～95%；鎮關者中等 60～75%、強力 100%。
    - 校準用的模擬：玩家數值＝該層境界階數的一般玩家 × 配置倍率（`nv2TypNormal`／`nv2TypHp`），走 `bossStats`＋`combineAuras`＋`auraRoundTick`＋`resolveHit`，同 `round()` 的流程；改公式、光環或上限後要重跑。
  - （校準前的紀錄）模擬（玩家與該層同境界同階，各 20 場）：一般玩家第 7 層起 0 勝；中等配置到第 50 層都全勝；強力配置 1～100 層全勝（第 100 層約 136 回合）。
  - ⚠️ **校準模擬的正確玩家數值**（2026-09-30 踩坑）：中等＝攻 `nv2TypNormal × 2`、**氣血 `nv2TypHp × (1 + nv2TypBuff/100) × 1.5`**、減 30 閃 20、連擊固定 5%；強力＝攻 ×4、氣血同式 ×2、減 60 閃 40、連擊 10%。
    漏掉 `(1 + nv2TypBuff)` 那層會讓氣血少三成、勝率只剩 3 成多（曾因此誤判「全塔勝率漂移」）。照原腳本重跑（2026-09-30，各 150～400 場）確認**沒有漂移**：
    魔修／心魔層與校準一致（第 7 層原冰版 83%、50 層 82%、55 鎮關者 58%、其他 51～99 強力 87～96%、95／100 強力 83／76%）；
    妖獸／鬼物層中等 57～73%（第 12、20、25、33、40、47 層），是種族剋制第 2 期特性「沒剋制略降」的預期結果（第 62 節）；第 60 層強力 73% → `tune[60]` 攻擊 1.7 → **1.63** 後 82%。
- **第 7 層「墨大夫・奪舍魔醫」**（2026-09-30，版本 `20261003k`～`l`，玩家提供圖 `images/zhenmo/boss-modaifu.jpg` 687×1024 與名稱）：手動蓋過自動產生的「玄冰魔君」。
  沿用原第 7 層的 煉虛 7 階、`hpMult` 1.443、減傷 15、閃避 8、光環效果（自身減傷 +5／每回合回 0.1% 氣血，改名「奪舍魔瞳」「血煉續命」）與獎勵；種族 😈魔修；
  主題（凡人修仙傳：七玄門神醫、修魔道欲奪舍韓立）把屬性傷害由冰改為**毒**（affixVal 15）。毒比冰溫和（冰會凍住玩家），原攻擊 ×2.08 時中等 99% → **`atkMult` 改 2.5**，中等 77～80%（目標 80%）。
- **第 8 層「墨居仁・血魔真身」**（2026-10-01，版本 `20261004s`，玩家提供圖 `images/zhenmo/boss-moxue.jpg` 848×1264、317KB）：圖是墨大夫的全身魔化形態，
  設計成第 7 層被擊潰後重塑的魔軀（墨居仁＝墨大夫本名，名稱為我暫定）。手動蓋過自動產生的「幽羅魔君」：沿用煉虛 8 階、`hpMult` 1.635、減傷 15 閃避 8、魔修、獎勵；
  主題改血焰——屬性傷害 金重擊 → **燒傷** 15、五行火、光環「血煞封魔陣」（每回合 4% 燒傷、自身減傷 +5）＋「萬魂哀嚎」（詛咒 +5%）。`imgPos` 50% 25%。
  - **校準**（校準腳本原本不在專案內，2026-10-01 依本節描述重寫於測試頁）：玩家＝該層一般玩家 × 配置倍率，並帶一般玩家的**暴擊率與命中**
    （`nv2TypStat × critPer`、`nv2TypHit`）；以此設定第 7 層跑出 78%（紀錄 77～80%），證實與原腳本一致（不帶暴擊命中只有 60%）。
    二分搜尋後 `atkMult` **2.53**：中等 80%（1500 場）、強力 100%、一般玩家 0%。（原自動產生的第 8 層在同一模擬為 73%。）
- **第 9 層「襲胸雙雄・自封紅十字軍」**（2026-10-01，版本 `20261004t`）：使用者指定名稱，圖用使用者提供的**電影劇照**（橫圖約 660×379，兩名披紅十字白袍的怪人、畫面有字幕與浮水印；
  已提醒版權／肖像與構圖問題，使用者選「就用這張劇照」、主題「搞笑魔性雙人組」）。同日玩家改提供**直式插畫** 848×1264、319KB（紅色牛角魔握細劍＋紫色骨爪魔，頭戴方帽、身披紅十字白袍，下方石碑刻「我們是紅十字軍」），存為 `images/zhenmo/boss-xixiong.jpg`，取代劇照；改回一般 cover、`imgPos` 50% 28%，介紹改為魔化外型，數值不變。
  - 雙人合成一個 BOSS 單位；名稱無種族後綴＝人修。沿用自動產生第 9 層的境界（煉虛 9 階）、`hpMult` 1.531、獎勵；主題改滑溜偷襲：減傷 10 閃避 20、金重擊 15、五行金、
    光環「紅十字軍旗號」（你的攻擊 −5%）＋「雙雄夾擊」（詛咒 +6%）、開場台詞 `taunt`「我們是紅十字軍！」。校準 `atkMult` **2.71**：中等 79%（2000 場）、強力 100%、一般 0%。
  - **新增 BOSS 選填欄位**（zhenmo.js `startFight`）：`imgFit`（例 `'contain'`：橫圖完整顯示在直式戰鬥畫面上方，其餘補 `imgBg` 暗色，位置 `imgFitPos` 預設 50% 8%；
    雙人或橫圖 BOSS 用，cover 會裁掉一人）、`taunt`（開場台詞，預設「區區凡人，也敢闖塔？」）。BOSS 房門是 4:3，仍用 cover＋`imgPos`。
- **第 10 層樓主「天狗・鴉羽雙刀」**（2026-10-02，版本 `20261005b`，玩家提供圖 `images/zhenmo/boss-tiangou.jpg` 848×1264 水墨插畫：鴉首天狗、黑紫雙翼、雙手長刀、月下松林與鳥居；
  原檔 456KB 以 JPEG 品質 86 存成 412KB）：手動蓋過自動產生的「赤炎屍王」（鬼物）。沿用煉虛 10 階、`hpMult` 1.214、減傷 17、獎勵（樓主 ×2：靈石 30 分鐘、功德 300～600、異火 8～14、星允鐵 10～18）；
  種族改 🐉**妖獸**（天狗是鴉妖；氣血 +10%，樓主層首勝的剋制法寶變成「下品降妖葫蘆（對妖獸）」）；主題「雙刀颶風」：閃避 10 → 15、屬性傷害 雷 → **金重擊** 17、五行金、
  光環「鴉羽護身」（自身減傷 +5）＋「天狗颶風」（每回合扣 0.1% 氣血）＋「雙刀亂舞」（詛咒 +5%）、開場台詞「膽敢登樓者——斬！」、圖示 🌪️（🪶 羽毛在部分裝置顯示成方框，已換掉）、`imgPos` 50% 30%。
  - **校準**（測試頁重寫的第 51 節模擬，要先把玩家境界設成該層境界，否則 `bossStats` 會帶入境界壓制、勝率全變 0）：先確認第 7／8／9 層中等 81／79／80%（與紀錄一致）、
    原自動第 10 層中等 69%（鬼物層偏低，同上方說明）；天狗二分搜尋後 `atkMult` **2.39**：中等 80.6%（3000 場）、強力 100%、一般玩家 0%。
  - 驗證：BOSS 房顯示「天狗・鴉羽雙刀・第 10 層樓主」、妖獸、三個光環、種族關卡獎勵；戰鬥畫面立繪正常；Console 無錯誤。
- **第 15 層鎮關者「噬月魔子・血翼冥鐮」**（2026-10-02，版本 `20261005b`，玩家提供圖 `images/zhenmo/boss-shiyue.jpg` 848×1264：紫髮雙角紅瞳的魔族少年、血紋蝠翼、鎏金巨鐮、黑月紫雷與燃燒古堡；
  JPEG 品質 86 存成 347KB；名稱「噬月魔子」為我暫定，使用者只說「15 層換這支」）：手動蓋過自動產生的「紫霄屍王」（鬼物）。沿用合體 5 階、`hpMult` 1.445、減傷 17 閃避 10、紫雷屬性傷害 17、獎勵；
  種族改 😈**魔修**（吸血 10%）、五行金 → 火、光環改名不改效果（「血翼魔威」詛咒 +5.4%、「冥月攝魂」凍結 2.2%）、開場台詞「嘻……你的魂，我收下了。」、`imgPos` 50% 22%。
  第 15 層屬於 7～50 層，目標中等 80%（鎮關者 60% 的特例只限 55／65／75／85 層）。校準 `atkMult` **3.00**：中等 81.2%（3000 場）、強力 100%、一般 0%（原自動第 15 層同一模擬 68%）。
  驗證：BOSS 房與戰鬥畫面（立繪、魔修吸血說明、光環）正常；Console 無錯誤。
- **第 20 層樓主「八岐大蛇・八首噬天」**（2026-10-02，版本 `20261005b`，玩家提供圖 `images/zhenmo/boss-yamata.jpg` 848×1264 浮世繪：八首巨蛇破浪吐焰、雷雲新月、鳥居與武士，右上題字「八岐大蛇」；
  品質 86 存成 413KB；使用者寫「八歧」，依圖上題字用「八岐」）：手動蓋過自動產生的「九幽妖皇」（原本就是妖獸）。沿用合體 10 階、`hpMult` 1.284、減傷 19 閃避 12、樓主獎勵；
  屬性傷害 雷 → **燒傷** 19（火焰吐息）、五行金 → 水、光環改名不改效果（「雷雲蔽月」雙方閃避 +3、「怒濤裂甲」你的減傷 −6、「八首齊噬」詛咒 +5.7%）、開場「嘶——又一個送上門的祭品。」、`imgPos` 50% 25%。
  校準：先確認第 10 層天狗中等 81%（同上）、原自動第 20 層 64%；`atkMult` 2.95＝78%、2.92＝80%、2.90＝82.5%（各 3000 場）→ 取 **2.91**；強力 100%、一般 0%。
  樓主層首勝的種族法寶：下品降妖葫蘆（對妖獸 +5%）。驗證：BOSS 房、戰鬥畫面（題字與八首完整入鏡）正常；Console 無錯誤。
- **第 30 層樓主「天照大神・八咫神鏡」**（2026-10-02，版本 `20261005c`，玩家提供圖 `images/zhenmo/boss-amaterasu.jpg` 848×1264 浮世繪：日輪背光的女神手捧八咫鏡立於天岩戶前崖上，右上題字「天照大神」；品質 86 存成 365KB）：
  手動蓋過自動產生的「太虛鬼帝」（鬼物）。沿用大乘 10 階、`hpMult` 1.193、減傷 21 閃避 14、樓主獎勵。
  **種族取 🌀心魔**：四族沒有神祇；八咫鏡照出本心＝「與你一模一樣的鏡像」，心魔沒有額外特性；樓主首勝法寶因此變成「下品清心蓮台（對心魔 +5%）」。
  屬性傷害 雷 → 燒傷 21（烈日）、五行金 → 火、光環改名不改效果（「天岩戶封印」凍結 2.5%、「日輪神威」雙方攻擊 ±6.2%、「八咫鏡照心」每回合扣 0.1% 氣血）、開場「汝心中陰翳，皆在鏡中。」、`imgPos` 50% 22%。
  校準：原自動第 30 層 70%；`atkMult` 2.71＝79.9%、2.73＝80.2%、2.75＝78.4%（各 3000 場）→ 取 **2.72**；強力 100%、一般 0%。驗證：BOSS 房、戰鬥畫面正常；Console 無錯誤。
- **第 40 層樓主「需佐能呼・暴風荒神」**（2026-10-02，版本 `20261005c`，玩家提供圖 `images/zhenmo/boss-susanoo.jpg` 848×1264 浮世繪：披髮武神立於礁石、雙手持發光長劍，雷雲化作巨狼、旭日鳥居，腳下多首巨蛇；
  右上題字「需佐能呼」，名稱照使用者與題字；品質 86 存成 430KB）：手動蓋過自動產生的「血煞魔龍」（妖獸）。沿用渡劫 10 階、`hpMult` 1.19、減傷 23 閃避 16、**雷擊** 23、樓主獎勵；
  種族改 😈**魔修**（被逐出高天原的荒神受塔中魔氣侵染；吸血 10%；樓主首勝法寶變「中品誅魔鏡（對魔修 +10%）」）、五行金 → 水；光環改名不改效果
  （「雷火灼身」燒傷 5.4%、「颶風護體」自身減傷 +7、「荒神不滅」回血 0.1%、「蛇血劍毒」中毒 5.4%）；台詞與介紹呼應第 20 層八岐大蛇、第 30 層天照大神（姊姊）。`imgPos` 55% 22%。
  校準：原自動第 40 層 66%；`atkMult` 2.71＝83%、2.73＝80.7%、2.75＝79.4%（各 3000 場）→ 取 **2.73**；強力 100%、一般 0%。驗證：BOSS 房、戰鬥畫面正常；Console 無錯誤。
- **第 50 層樓主「六道極聖・六道輪迴」＝分水嶺**（2026-10-02，版本 `20261005c`，玩家提供圖 `images/zhenmo/boss-liudao.jpg` 848×1264：銀髮紫袍魔道老祖持七寶虯杖、身後六道漩渦與多臂魔像、紫雷、腳下法陣；278KB）：
  手動蓋過「青冥邪神」（本來就是魔修）；仙人初境 10 階、減傷 25 閃避 18、雷擊 25、樓主獎勵沿用；五行金 → 土；光環改名不改效果（魔魂蝕骨 中毒 5.8%／天道輪轉 雙方閃避 +4／六道破甲 你的減傷 −7／六道輪迴咒 詛咒 +7.3%）。
  **使用者指定「50 層開始是分水嶺，只有上層的修仙者才能戰勝」** → 第 50 層目標由「中等 80%」改為「強力 80%」（同 60～100 層樓主）。原第 50 層中等 80%、強力 100%。
  攻擊與氣血一起放大（氣血 ∝ √攻擊）：`atkMult` **6.95**、`hpMult` **1.9** → 強力 80.3%（2000 場）、中等 0%、一般 0%。獎勵沒有跟著調高。
  - **第 50～100 層一覽**（2026-10-02 模擬，中等各 300 場、強力各 400 場；攻擊／氣血是遊戲畫面數字，玩家與該層同境界同階）：51～99 層守塔魔頭強力 87～97%、中等 0%；
    樓主 60／70／80／90／100 強力 81／87／86／82／82%、中等 0%；**鎮關者 55／65／75／85 中等 59／64／69／67%、強力 100%**（使用者 9/29 指定「中等 60%」）——
    與「50 層起只有上層修仙者能過」不一致，已回報使用者待決定（若要一致，四層 tune 換成本節上方記的「強力 85%」值）；第 95 層鎮關者本來就是強力標準（83%）。
    種族依名稱後綴：51～79 魔修、80～89 心魔（「戰神」）、90～100 魔修。
- **第 60 層樓主「天裁真君・聖羽天罰」**（2026-10-03，版本 `20261005i`，玩家提供圖 `images/zhenmo/boss-tiancai.jpg` 848×1264、245KB 原檔照用：白金長袍、銀髮編髮的六翼天人手持七色寶石金杖、豎指施法，
  頭頂日輪符文光環，四周浮著「天、裁、人、動、龍」金字，兩側跪地天使石像，腳下金色法陣；使用者只說「鎮魔塔 60 層 Boss」，名稱取圖上的「天裁」，為我暫定）：手動蓋過自動產生的「紫霄劍魔」（魔修）。
  **數值與效果全部照抄自動產生的第 60 層**（天仙 10 階、`atkMult` 5.183＝公式 × `tune[60]` 1.63、`hpMult` 1.689、減傷 27 閃避 20、雷擊 27、五行金、四個光環效果、樓主獎勵 靈石 80 分鐘／功德 800～1600／異火 18～26／星允鐵 20～30），
  種族也維持 😈**魔修**（奉天庭之命下界鎮塔的天人，被塔中魔氣侵染、審判走樣；吸血 10%；樓主首勝法寶仍是中品誅魔鏡）→ 2026-09-30 的校準（強力約 82%、中等 0%）不變，沒有重跑模擬。
  光環改名不改效果（「天裁審判」詛咒 +7.8%、「聖光禁錮」凍結 3.1%、「六翼天威」雙方攻擊 ±7.8%、「罪業焚魂」每回合扣 0.2% 氣血）、出手閃光改聖光金 `rgba(253, 224, 71, 0.38)`、圖示 ⚡、
  開場「天道在上——汝罪，當裁。」、招式 七曜神杖／聖羽天罰／天裁神雷／萬罪歸一、`imgPos` 50% 22%（臉在約 22% 高度）。以 Node 載入 config 確認第 60 層各數值與原自動產生版本逐項相同、第 61 層仍是自動產生。
- **天賦樹後的再校準**（2026-10-03，版本 `20261005t`，第 68 節）：一般玩家改為點「該境界等級上限可得點數的一半」（輪流 鋒芒／銅皮／破甲／護魂，最多 20 點）。無天賦時半點天賦讓勝率 76～81% → 97～100%，
  所以同方法對齊改版前勝率，第 5、7～100 層 BOSS 攻擊 ×1.12～1.68（約 1.4，乘進 `ZHENMO_L2_ATK`）。驗證（1000 場）：半點天賦 72～81%（改版前 75～81%）；**完全沒點天賦 36～62%**。
- **魔攻／魔防後的再校準**（2026-10-03，版本 `20261005o`，第 66 節第 4 期 A）：魔修、心魔 BOSS 改術法攻擊（走魔防），同下方方法對齊改版前勝率，倍率多在 0.97～1.05；只套用偏離 ≥ 2% 的 33 層。
  驗證（1000 場）與改版前差 ±3 個百分點內（16 層 68→65、55 層 61→63、85 層 67→69）。BOSS 介紹多「🔮術法攻擊／⚔️物理攻擊」與魔抗（和減傷不同時才顯示）。
- **閃避曲線後的再校準**（2026-10-03，版本 `20261005n`，第 66 節第 4 期）：`ZHENMO_L2_ATK` 改為第 1～100 層都可能有值（兩次校準相乘）。每層先在改版前程式量勝率（1500 場），再於新程式二分搜尋同勝率的倍率（×0.85～1.02，高樓層閃避效果略降所以 BOSS 攻擊調低），
  驗證（1000 場）與改版前差 ±3 個百分點內（例：10 層 81→83、60 層 78→79、100 層 81→83）；全勝／全敗樓層不調。
- **《天堂2》式防禦後的再校準**（2026-10-03，版本 `20261005j`，第 66 節）：config-zhenmo.js 檔尾 `ZHENMO_L2_ATK`（第 50～100 層，鎮關者 55／65／75／85 除外）乘在 atkMult 上，倍率 1.08～1.35（約 1.2）。
  原因：強力配置防禦 60 承受的傷害 80% → 67%，第 50 層以上勝率升到 90～95%。以本節的校準模擬（玩家帶 `petEva／partnerEva` 0）二分搜尋，回到原目標；第 7～49 層以中等配置（防禦 30，改前改後同為減傷 20%）為準，不調。
  驗證（各 600 場、第 50 層 1500 場）：樓主 50／60／70／80／90／100 強力 80／79／81／81／79／80%、第 95 層 79%、其他 51～99 層 88～91%；鎮關者中等 64～67%；第 7～49 層中等 62～83%（與改前相同，妖獸／鬼物層本來就較低）。
- **入口**：活動「🌀 秘境」→「鎮魔塔」卡片 → 海報場景「⚔️ 入塔挑戰」→ `challengeSecretRealm()` 見 `mode: 'tower'` → `openZhenmoTower()`。開放境界同秘境（煉虛）。
- **畫面** `#zhenmo-scene`（z-index 101，疊在秘境場景上）：9:16 舞台 `#zhenmo-stage`（寬 = min(100vw, 100dvh×9/16, 560px)），背景為鎮魔塔海報加暗色漸層、四周模糊；四個面板輪流顯示（`show()`）：
  - **塔廳** `#zm-hall`：目前樓層、「已鎮壓 N / 100 層」、10×10 樓層格（由下往上、第 1 層在左下；紫 = 已通過、金 = 目前）、動作按鈕、規則說明。
    有本層未用的問答成績時按鈕變成「🚪 進入 BOSS 房（問答 x/10，獎勵 ×m）」，不必重答。
  - **問答** `#zm-quiz`：「第 N 層・問答 i / 10」、10 格進度（綠對／紅錯／金目前）、限時條（剩 5 秒轉紅）、出處與題型、題目、選項。
    選擇題 4 個按鈕（A～D，**每次打亂順序**：題庫原始答案 170 題中 154 題是 A）；是非題兩個大按鈕 ○／╳。作答後按鈕標綠／紅、顯示「答對了／答錯了／時間到」，0.9 秒後下一題。
    **不公布正確答案**（`ZHENMO_REVEAL_ANSWER = false`，玩家要求「只給題目」）。
  - **結算** `#zm-result`：答對數、10 題 ○╳、本層 BOSS 獎勵倍率（全對另有提示）、「🚪 開啟 BOSS 房門」「稍後再戰（成績保留）」。
  - **BOSS 房** `#zm-boss`：兩扇門滑開（CSS `zmDoorL/R` 1.6 秒，`prefers-reduced-motion` 時瞬間開）、「第 N 層・BOSS 房」、問答成績與倍率；BOSS 未開放時顯示「塔中 BOSS 尚在甦醒」。
- **出題**（`drawQuestions`）：從 300 題隨機抽 10 題，避開最近出過的 `ZHENMO_RECENT_AVOID`(100) 題（`player.zhenmo.recent`），同一層每次挑戰題目不同，不能背某層答案。
- **限時** `ZHENMO_QUIZ_SECONDS`(30，2026-09-30 使用者由 20 改 30，版本 `20261003q`)：逾時算答錯（避免邊答邊查）；0 = 不限時。
- **獎勵倍率** `ZHENMO_QUIZ_REWARD_MULT`（索引 = 答對數）：0 題 ×1.0，每多對 1 題 +0.1，9 題 ×1.9，10 題全對 ×2.5。BOSS 獎勵實作時乘上這個倍率。
  **一輪 10 題只影響當前這一層 BOSS 的擊敗獎勵**（玩家指定，2026-09-27）：`state()` 發現 `pending.floor ≠ floor` 就作廢；擊敗 BOSS 時呼叫 `ZhenmoTower.clearFloor()`
  （best 記錄、floor +1、pending 清空，回傳本層倍率），進入下一層必須重新答題。塔廳規則說明也寫明「加成只對本層 BOSS 有效」。
- **存檔** `player.zhenmo = { floor, best, pending, recent }`（`state()` 用到時才建立，不在 state.js 預設值）：
  `floor` 目前要挑戰的樓層、`best` 最高通過樓層、`pending = { floor, correct, total, mult, at }` 這一層尚未使用的問答成績。
  答完或**中途離開**（confirm，未作答視為答錯）都會寫入 pending 並記一筆日誌（道具分頁）。重新整理頁面時進行中的問答會消失（未寫入 pending）。
- **次數**：有 BOSS 資料的樓層「開始問答」時扣 1 次秘境每日次數（`useSecretRealmAttempt('zhenmo')`），已有 pending 時進 BOSS 房不再扣。
  目前 false：問答不扣次數、BOSS 房只顯示「尚未開放」、樓層不前進。
- **BOSS 戰**（2026-09-27）：
  - 資料 `ZHENMO_BOSSES[樓層]`（config-zhenmo.js）：name／title／img（戰鬥背景橫圖）／imgPos（手機直式時對準 BOSS）／realm＋stage（強度基準，`defenseRealmAtk`）／atkMult／hpPerAtk／def／eva／affix＋affixVal／element／intro／skills（演出招式名）／rewards。
    **有 BOSS 資料的樓層**開始問答才扣 1 次每日挑戰；沒有的樓層問答免費、成績保留（取代原本的全域 `ZHENMO_BOSS_READY`，secret-realm.js 的特例也拿掉了）。
  - 第 1 層【棄天神】：煉虛 1 階（攻 1750 萬、**氣血 ×300 = 52.5 億**，2026-09-27 玩家指定由 ×30 改 ×300，`hpPerAtk` 沒填的樓層也預設 300）、減傷 20 閃避 10、雷傷 15%、金；獎勵 靈石＝煉虛主要地圖掛機 10 分鐘、功德 120～240、異火碎片 3～6、星允鐵 4～8，全部 × 問答倍率。
    難度實測（氣血 ×300，每組 40 場，皆無逾時）：裸裝 煉虛 1 階 0 勝、5 階 0 勝、10 階 17 勝、合體 3 階起全勝；
    「中等」（攻 ×3、減傷 40 閃避 25）煉虛 1 階 0 勝、5 階全勝（平均 53 回合）；「強力」（攻 ×6、減傷 60 閃避 40）煉虛 5 階全勝（27 回合）。
    （氣血 ×30 時：裸裝煉虛 5 階即全勝、煉虛 1 階＋中等即全勝。）
    ⚠️ 2026-09-27 發現：把第 1 層改成煉虛 1 階時註解吃掉同一行的 hpPerAtk／def／eva／affix／element，線上版本曾以「氣血 ×20、無減傷閃避異屬性」運作，已修正。
  - 流程：BOSS 房開門（門後是 BOSS 圖）→ BOSS 介紹（強度、攻擊是你的幾倍、減傷閃避異屬性、擊敗獎勵）→「⚔️ 挑戰」→ `#zm-fight` 回合制演出 → 結算 `#zm-fight-end`。
  - 戰鬥數值同死守天南城：玩家攻擊 = max(物攻, 術攻) × `ZHENMO_PLAYER_SKILL_MULT`(1.3)、氣血 = `getMaxHp()`、`getPlayerCombatAttrs()`；每回合 玩家狀態 → 出手（`resolveHit`）→ BOSS 狀態 → BOSS 出手；
    滿 `ZHENMO_MAX_ROUNDS`(150) 回合未擊倒算失敗。不影響玩家實際氣血。每回合演出 `ZHENMO_ROUND_MS`(650ms)，×1／×2／×4、⏭ 跳過（直接算完）。
  - 畫面（2026-09-27 改為直向三段）：上 BOSS 血條與回合數／中 `#zm-fight-scene` 戰鬥場景（BOSS 圖 cover＋imgPos、左下主角背影立繪 `ZHENMO_HERO_IMG` 高 82%，`player.gender === 'female'` 用女角）／下 玩家血條、戰況固定 3 行（一行一句、太長省略）、速度鈕；飄字（暴擊橘、異狀綠、閃避灰、受傷紅）、
    玩家出手時劍光斜斬＋立繪前衝、BOSS 出手時全畫面雷光一閃。
  - **勝**：`clearFloor()`（best、floor+1、pending 清空，回傳倍率）→ `grantRewards` 發獎（`addFireShards`／`addStarIron`／功德後 `settleMeritStones`）→ 日誌。
    **敗**（含戰鬥中「↩ 離開」並確認）：pending 清空，重來須重新答題（重新答題再扣 1 次挑戰，避免免費重打）。
  - 事故（2026-09-27）：原本戰況 4 行與血條疊在場景上，PC 或矮螢幕（戰鬥區只有約 400px 高）把主角立繪整個蓋住，玩家回報「看不到人物」；改成三段式後文字不再疊在人物上（實測 230×398 的戰鬥區也完整顯示）。
  - 第 2 層【不滅骨】（皇道殭屍，2026-09-27）：煉虛 2 階（攻 3500 萬、血 105 億）、減傷 25 閃避 5、毒傷 15%、土；戰況圖示 ☠️、出手閃綠光；
    獎勵 靈石 11 分鐘、功德 130～260、異火碎片 3～6、星允鐵 4～8。實測（40 場）：裸裝煉虛 10 階 0 勝、合體 3 階全勝；中等裝備煉虛 5 階起全勝。
  - 第 3 層【主咒之王】（束縛幽冥，2026-09-27）：煉虛 3 階、**攻擊 ×1.5（玩家指定）**＝攻 7875 萬、血 157.5 億（基準攻擊 5250 萬 × 300）；減傷 15 閃避 15、冰凍 18%（束縛咒：被凍結的回合無法出手）、水；
    戰況圖示 📜、出手閃紫光；獎勵 靈石 13 分鐘、功德 150～300、異火碎片 4～7、星允鐵 5～9。
    實測（40 場）：裸裝合體 3 階 0 勝、5 階全勝；中等裝備煉虛 5、7 階 0 勝，10 階全勝；強力裝備煉虛 5 階全勝——比第 2 層明顯高一截（關卡門檻）。
  - 第 4 層【幽冥鬼虎】（冥火凶獸，2026-09-27）：煉虛 4 階（攻 7000 萬、血 210 億）、減傷 10 閃避 20、金暴擊 18%、金；戰況圖示 🐯、出手閃藍紫冥火；
    獎勵 靈石 14 分鐘、功德 160～320、異火碎片 4～7、星允鐵 5～10。實測（40 場）：裸裝合體 5 階全勝；中等裝備煉虛 10 階 38 勝；強力裝備煉虛 5 階全勝（與第 3 層門檻相近）。
  - 第 5 層【青瞑爪龍】（雷雲蒼龍，2026-09-27）：煉虛 5 階、**攻擊 ×3（玩家指定）**＝攻 2.63 億、血 262.5 億；減傷 20 閃避 15、雷擊 18%、木；戰況圖示 🐉、出手閃青色雷光；
    第 5 層關卡獎勵加碼：靈石 20 分鐘、功德 250～500、異火碎片 6～10、星允鐵 8～14。
    實測（40 場）：裸裝合體 8 階 0 勝、合體 10 階全勝；中等裝備煉虛 10 階 0 勝、合體 3 階起全勝；強力裝備煉虛 5 階 0 勝、8 階 8 勝。攻擊 ×3 讓氣血（生存）變成關鍵，比第 4 層約高一個大境界。
  - 第 6 層【黑暗法老王】（封印神王，2026-09-29，版本 `20261001w`）：煉虛 6 階、攻擊倍率 1（一般層，玩家沒指定倍率）；減傷 30 閃避 5（黃金神軀厚重）、燒傷 18%（胸前聖符射出烈日神光）、土；戰況圖示 ☀️、出手閃金光；
    獎勵介於第 4、5 層之間：靈石 15 分鐘、功德 170～340、異火碎片 4～8、星允鐵 6～11。圖 `boss-pharaoh.jpg`，`imgPos` 50% 30%。
    新制實測（40 場；一般＝同境界一般玩家，中等＝攻 ×2 血 ×1.5 減 30 閃 20，強力＝攻 ×4 血 ×2 減 60 閃 40）：一般玩家煉虛 1 階 1 勝、5 階 7 勝、10 階起全勝（約 286 回合）；
    中等、強力配置煉虛 1 階起全勝（約 149／71 回合）。難度和第 4 層差不多（第 4 層一般玩家煉虛 10 階只有 2 勝、第 6 層減傷較高但閃避低），第 5 層仍是門檻關（一般玩家到合體 10 階都 0 勝）。
    手機 375×812 實測：BOSS 房介紹、戰鬥畫面（BOSS 頭部在主角立繪上方）、金色閃光、戰況正常，Console 無錯誤。
  - `atkMult` 只放大攻擊，氣血 = 基準攻擊 × `hpPerAtk` × `hpMult`（2026-09-27 起；原本 atkMult 會連氣血一起放大）。
  - **多重光環**（2026-09-29，版本 `20261002o`，第 17 節）：每個 BOSS 的 `auras` 陣列 2～3 個光環（例：棄天神「劫雷天威」凍結 2%＋「魔神怒嘯」詛咒 5%；黑暗法老王「烈日神威」燒傷 5%、「法老詛咒」、「黃沙蔽日」）。
    一場約 300 回合、沒有丹藥與靈寵，所以每回合的扣血／回血只有 0.1～0.2%、凍結 2～3%、燒傷／中毒 4～5%。`startFight` 套用，`round` 每回合 `auraRoundTick`、BOSS 出手乘詛咒；BOSS 介紹與開場戰況列出全部光環。
  - **命中**與**境界壓制**（同日，版本 `20261002n`／`q`）：BOSS 帶同階一般玩家命中；`bossStats` 乘 `nv2SuppressByL(L)`（BOSS 境界高於玩家時攻擊、氣血放大，介紹顯示「⚠️ 境界壓制」）。
    模擬（各 30 場，一般／中等（攻 ×2 血 ×1.5 減 30 閃 20）／強力（攻 ×4 血 ×2 減 60 閃 40））：第 1 層全都能過；第 2 層起一般玩家 0 勝（第 4 層煉虛 10 階 50%）；
    中等配置煉虛 5 階以上全勝、煉虛 1 階第 5、6 層 0 勝；強力全勝。
  - 新制（第 52 節）：BOSS 氣血改為一般玩家約 300 回合的輸出、攻擊為一般玩家氣血 ÷ 400 × `atkMult`、回合上限 600，`hpPerAtk` 不使用。
  - 強度慣例：第 n 層 = 煉虛起每層一階（1～10 層煉虛 1～10 階、11～20 層合體 1～10 階…91～100 層混沌道祖），特別層用 atkMult 調整。
  - **BOSS 圖建議規格**（2026-09-27 實測戰鬥場景：手機 331×475～383×650、筆電 403×503、1920×1080 為 531×735，寬高比 0.59～0.80）：
    直式 2:3、1024×1536、JPG 400KB 內；手機與 PC 共用（鎮魔塔舞台一律直式）。BOSS 放中間偏右上（頭在上方 15～35%），左下約 6 成寬 8 成高會被主角立繪擋住，四周留一成可能被裁，圖上不放字。
    橫圖（1408×768 這類）只會露出中間約 1/3 寬；第 1、2 層目前都已換成直式圖。
  - BOSS 選填 `icon`（戰況出招圖示，預設 ⚡）、`flash`（出手閃光顏色，CSS 變數 `--zm-flash`，預設淡藍雷光）。
  - 新增其他樓層 BOSS：在 `ZHENMO_BOSSES` 加一筆（圖片放 images/zhenmo/），不用改程式。
  - 驗證（2026-09-27 本機測試頁，手機 375×812）：女角／男角立繪正確、去背乾淨；飄字、血條、戰況正常；勝利後 floor 2／best 1／pending 清空、獎勵入帳；Console 無錯誤。
- **題庫**（`config-zhenmo-questions.js`，玩家提供 300 題）：《凡人修仙傳》110、《吞噬星空》100、《斗羅大陸》90；選擇 170、是非 130（○ 93／╳ 37）。
  轉錄時只修了明顯錯字（「基因基因突變」「參加參加」「綠夜」）與原文重複的第 100 題編號；題目與答案正確性以玩家提供為準，要改直接改檔案。
  ⚠️ 答案寫在前端程式裡，會看原始碼的人查得到（純前端遊戲無法避免）；是非題 ○ 佔 72%，全選 ○ 期望約對 7 成。
- 驗證（2026-09-27，本機測試頁）：300 題格式全部正確、無重複；抽題 10 題不重複、選項已打亂（正確答案出現在 A～D 各位置）；答 7 對 2 錯 1 逾時 → 7/10、×1.7 存入 pending；
  中途離開保留成績、塔廳改顯示「進入 BOSS 房」；開門動畫正常；Console 無錯誤。

## 52. 數值重做（新制，`config-numeric.js`、`numeric.js`；2026-09-27 起，2026-09-28 正式上線）

- **目的**：解決戰力／氣血／傷害無限膨脹（舊制每大境界 ×10，到「京」）與中期以後秒殺小怪的問題，改成傳統 RPG 的小數字制，並新增第六屬性**敏捷**。
  參數由 `tools/數值設計器.html`（Artifact）定案，使用者確認：成長每境界 ×1.05、武器基數 5、屬性起始 5／每階 +1／每大境界 +5、空手 力量×0.05、力量每點攻擊 +0.1%、
  增益相加上限 +200%、暴擊每點 0.01%（上限 30%、×1.5）、連擊每點 0.04%（上限 10%）、命中／閃避每點 0.08%、氣血基數 50、體質每點 +0.2%。
  使用者決定：A 人物等級不再加屬性（每級氣血 +0.005%、靈力 +0.5，等級保留為穿戴門檻）；B 丹藥每顆 +0.1、每種最多 200 顆（其他丹藥、藏書閣同規則）；
  C 武器提供武器攻擊、防具提供氣血、飾品提供增益，屬性點只剩個位數；D 畫面與戰力榜的「戰力」改成每回合期望輸出。
- **開關** `NUMERIC_V2`（config-numeric.js）：**2026-09-28 起預設開啟（正式上線，版本 `20260929r`）**；`localStorage['xiuxian_numeric_v2'] === '0'` 時退回舊制（只影響該瀏覽器，除錯用）。以下「預設關閉」的敘述為上線前的紀錄。
  開發時在 Console `localStorage.setItem('xiuxian_numeric_v2','1')` 後重新整理即可打開（只影響自己的瀏覽器）。三階段完成、使用者確認對照表後，改成 `const NUMERIC_V2 = true` 正式上線。
- **施工階段**：
  1. ✅ **屬性與戰鬥公式**（2026-09-27 完成）：見下方。
  2. ✅ **怪物與內容**（2026-09-27 完成，版本 `20260929k`）：野外妖獸、擊殺收益補償、離線估算、地圖門檻、懸賞、渡劫心魔、死守天南城、鎮魔塔 BOSS、藏書閣、升級日誌、裝備卡片。見下方「第 2 階段內容」。
  3. ✅ **存檔轉換與上線**（2026-09-28，版本 `20260929r`）：見下方「第 3 階段」。
- **第 1 階段內容**（皆只在 `NUMERIC_V2` 時生效，`if (NUMERIC_V2)` 分流，舊制程式路徑完全不變）：
  - 屬性 `nv2Stat(k)` = 境界基本值（`nv2BaseStat`）＋丹藥（`player.pillUsed[k]` ≤ 200 × 0.1）＋藏書閣（`player.studyCounts[k]` ≤ 200 × 0.1）＋裝備（`nv2GearStats`）＋詞條 %；**不讀 `player.stats`**（魅力除外，魅力沿用舊制）。
    裝備屬性：每件 = 四維範本係數 × 0.5 × 品質倍率 × 強化（飾品 ×1.25）；範本「靈動」改為敏捷 1.2＋靈力 0.8（`NV2_TEMPLATE_OVERRIDE`）。
  - 武器攻擊 `nv2WeaponAtk`：身上攻擊最高的一把武器（6 種武器部位不疊加）＝ 5 × 1.05^L × 品質（白 1／綠 1.1／藍 1.25／紫 1.35／橙 1.5／白金 2）× (1 + 強化 × 2.5%) × 主修職業加成；
    L 由裝備等級換算（Lv.10～1000 → 0～10）。⚠️ 裝備等級上限 1000，Lv.1000 以後武器攻擊靠品質與強化成長（混沌道祖普攻會比設計器低約 20%，第 2 階段校準怪物時一併考慮）。
  - 增益 `nv2BuffPct(kind)` **全部相加後封頂 +200%**（2026-10-03 起仙人初境以上依境界提高，見本節最後「後期增益上限與圖紙武器」）：裝備詞條／套裝／稱號／職業／異火／夥伴（getGearPctBonus）、仙法光環、靈根（倍率 −1）、宗門（(powerMult − 1) × 20%）、狼 +15%／龍 +30%、禁術與靈寵增益。
  - 攻擊 = (武器攻擊 ＋ 力量(術法：悟性) × 0.05) × (1 + 力量 × 0.1%) × (1 + 增益) × 對決化功 × 虛弱；氣血 = 50 × 1.05^L × (1 + 體質 × 0.2%) × (1 + 氣血增益) × (1 + 等級 × 0.005%)；靈力 = (50 + 靈力 × 10) × 光環 + 等級 × 0.5。
  - 敏捷：`getPlayerCombatAttrs` 的閃避加 `nv2AgiEva`（仍受上限）、洞察加 `nv2Hit`、新增 `crit`；`resolveHit` 在五行相剋後判定暴擊（×1.5，2026-10-03 起 ×2，第 66 節；tag `crit`「💥暴擊」）；
    `playerAttackTurn` 普攻後以 `nv2Combo` 機率再打一次普攻（tag `combo`「⚡連擊」）。死守天南城、鎮魔塔的模擬戰鬥第 2 階段起也有連擊。
  - 戰力 `nv2CombatPower` = max(物攻, 術攻) × 暴擊期望 × 連擊期望 × 技能期望（40% × 3 倍）；人物面板 `#power-display` 與洞府 HUD 戰力改顯示它（戰力榜上傳仍是舊值，第 3 階段改）。
  - 人物面板新增「敏捷」列 `#stat-agi-row`（新制才顯示）；四維改顯示總值，滑鼠停留看來源。
  - 煉丹房：新制每顆 +0.1、每種上限 200（魅力丹另計：**2026-10-04 起每顆 +0.5、上限 5000 顆**（pillRecipes.cha 的 gain／max，原 +20、無上限；已服用的魅力不回溯，`pillUsed.cha` 自 2026-09-27 起累計，超過 5000 的不能再服），版本 `20261005T`），不改 `player.stats`；新增**身法丹**（敏捷，上品靈草，`#pill-card-agi` 新制才顯示）；卡片顯示「已服用 N / 200 顆（屬性 +X）」，效果行 `#pill-effect-*` 依制度改字。
- **第 1 階段驗證**（2026-09-27 本機測試頁，藍色武器、無增益）：凡人 1 階普攻 7（加 +50% 增益 ≈ 10，符合設計器）、金丹 10 階 11、煉虛 10 階 15、渡劫 10 階 20、混沌道祖 10 階 27；
  氣血 51～169、戰力 13～54；增益疊滿（宗門 ×6＋禁術 ×4）封頂在 +200%；空手 1；暴擊與連擊調高後實測觸發率 28%／10%（上限 30%／10%）；煉丹 200 顆上限、身法丹正常；開關關閉時舊制數值完全不變；Console 無錯誤。
  野外怪物仍是舊數值（例：靈山大川攻擊 100，新制玩家氣血約 100），所以新制下目前無法正常練功——這是第 2 階段的工作（已完成，見下）。
- **第 2 階段內容**（2026-09-27；同樣只在 `NUMERIC_V2` 時生效，參數集中在 `config-numeric.js` 的「第 2 階段」區塊）：
  - **「一般玩家」基準**（`numeric.js` 的 `nv2TypStat／nv2TypNormal／nv2TypHp／nv2TypBuff／nv2TypRoundMult`）：成長位置 L 時同境界一般玩家的屬性（基本值 +10%）、普攻（藍色武器、武器 L 最多 10、
    增益凡人 +10%、每境界 +10%、元嬰起 +50%）、氣血（不含增益）。怪物、懸賞、守城、BOSS **都以它為基準、不看玩家本身**，所以玩家變強就打得比較快。
    （增益改成逐境界遞增：凡俗宗門最多只給 +6%，前期假設 +50% 會讓新手打一隻要 35 下。）
  - **野外妖獸**（`nv2MonsterStats`，`combat.js` 的 `getMapMonsterStats` 分流）：每張戰鬥地圖加 `nv2L`（config-maps.js）：靈山大川 0、深淵險地 2、上古遺跡 3、天南 4、亂星海 5、鬼谷八荒 6、荒古禁地 7、太初古礦 8、
    上蒼 9、不死山 10、神墟 11、仙陵 12、冥界 13、仙界戰場 14、萬界戰場 15、混沌初界 15.9。氣血 = 一般玩家普攻 × `hitsSame` 25；攻擊 = 一般玩家氣血 × `monAtkPct` 0.4%（1 位小數）；靈山大川另有 `nv2AtkMult: 0.7`（新手圖）。
    範例：靈山大川 氣血 180／攻擊 0.1、天南 449／0.3、混沌初界 1105／0.7。地圖卡片的「難度」改顯示「妖獸 氣血 X／攻擊 Y」（map.js 的 `getMapDifficultyText`）。
  - **使用者 2026-09-27 選定「少怪＋調息」**：每波 1～3 隻（`waveMin/waveMax`，舊制 1～5）；刷新等待的 10 秒內每秒回 `restHealPct` 10% 氣血與靈力（等於每波開打前補滿，狀態列顯示「調息回復中」）。
    ⇒ 2026-09-29 改為每秒 3%，同時妖獸改為隨玩家階數、強度 1.5～3 倍（第 54 節「妖獸隨玩家階數」）。
    原本提議的攻擊 1.5% 實測太痛（同境界每小時 150 顆以上補血丹、最低剩 4% 血），且當時傷害會被捨去成 0（見下），改為 0.4%。
  - **小數傷害** `roundDmg()`（elements.js）：舊制照舊無條件捨去；新制保留 1 位小數（妖獸攻擊不到 1，捨去會讓減傷把傷害變 0）。
    2026-09-29：`applyPetDamageReduction` 的護盾／最低傷害保底改過數值時也重新 `roundDmg`，`combat.js` 多隻妖獸加總的 `taken` 也取 1 位小數（原本會出現 7.6000000000000005 這類浮點尾數累積在氣血裡）。`resolveHit`、`tickStatus`、gear.js 的 `applyGearDefense`／反震／首擊連鎖／連雷、鎮魔塔戰況與飄字都改用它。
  - **擊殺收益補償**：`combat.js` 的 `getKillRewardMult()`（舊制 = `KILL_REWARD_MULT`；新制 = `nv2KillRewardMult` =（刷新間隔 11 ＋ 2 × 一般玩家每隻回合數）÷ 2 ÷ 3，約 ×7.6～8.2）乘在每隻的經驗／靈石／聲望／熟練度／救僕從次數；
    `getWaveChanceMult()`（新制 `nv2WaveChanceMult` 約 ×5）乘在每波的野外修士、暗殺者、懸賞遭遇機率（bounty.js 也改用它）。每小時收益因此維持 `realmPacing` 的修煉節奏。
    一般玩家每隻回合數 `nv2TypRoundsPerKill` = 25 ÷ 回合期望倍率 ÷ 妖獸減傷閃避；`typSkillAvg` 取 1.1（實測靈力有限、常「靈力不足」，技能實際只多約 10%，取 1.4 時經驗只有設計的 8 成）。
  - **離線／背景**：`save.js` 的 `estimateIdleCombat` 分流到 `nv2EstimateIdleCombat`（每回合期望輸出含暴擊連擊技能；效率以「同境界一般玩家 = 100%」計，最多 100%），結算文字改成「約需 N 回合斬殺一隻」。
  - **地圖門檻**：`changeMap` 新制看 `nv2MinStat`（上古禁區 100、幽冥禁域 160、諸天戰場 180）與 `nv2Stat` 總值（煉虛 1 階基本值 95，需再多約 5 點）。
  - **懸賞**（`getBountyStats`）：攻擊 = 一般玩家普攻 × `bountyAtkMult` 0.7、氣血 = 一般玩家氣血 × `bountyHpMult` 3（× 天榜倍率 × 榜別比例）。直接鏡像時新制氣血只有攻擊約 7 倍，5 回合就分勝負且太簡單（無裝備天榜 30% 勝）。
  - **渡劫心魔**：本來就是玩家自身攻擊／氣血的鏡像、勝負靠擲骰，新制不用改。
  - **死守天南城**：`defenseRealmAtk` 新制 = 一般玩家普攻（`typeof NUMERIC_V2` 防呆，gm.html 沒載入新制檔案時照舊制算）；每波氣血 = 攻擊 × `defenseHpPerAtk` 3.6 × `defenseHpScale` 5，
    `simulateWave` 裡玩家氣血也 × 5（雙方約 20 下分勝負，結果較穩定）；減傷／閃避改用較平緩的 `defenseEnemy`（15→25、8→14）；模擬加入敏捷連擊。
  - **鎮魔塔 BOSS**（`bossStats`）：氣血 = 一般玩家普攻 × 1.3 × `bossRounds` 300 × (1 − BOSS 減傷) × (1 − BOSS 閃避)；攻擊 = 一般玩家氣血（含增益）÷ `bossHitsToKill` 400 × 樓層 `atkMult`；
    回合上限 `bossMaxRounds` 600（`maxRounds()`）；舊制 `hpPerAtk` 新制不使用。BOSS 介紹的攻擊改顯示「每下約你氣血 X%」。戰鬥加入敏捷連擊（飄字橘色）。
  - **藏書閣**（library.js、ui.js 的 `updateStudyCountsUI`）：新制每次 +0.1、上限 200 次（`studyGainOf／studyMaxOf`），不改 `player.stats`；新增敏捷古籍《凌波微步》`#study-card-agi`（新制才顯示）；
    index.html 的次數、每次增加量、規則文字加上 id（`study-gain-*`、`study-rule`）。
  - **日誌**（leveling.js）：升階「六大屬性 +1（基礎 N）」、突破「六大屬性 +6」、人物升級「氣血上限 +X%、靈力上限 +Y」。
  - **裝備卡片**（gear.js 的 `formatEquipDetails` → numeric.js 的 `nv2FormatEquipStats`）：武器顯示「⚔️武器攻擊 X」，並列出新制屬性點（1 位小數，`nv2GearStatsOf`）；魅力與減傷／閃避／屬性傷害沿用裝備本身數值。
- **第 2 階段驗證**（2026-09-27 本機測試頁，模擬每組 1 小時或 20～100 場）：
  - 野外（藍色武器、無減傷閃避）：同境界一般玩家不吃丹藥也不會陣亡（最低剩 2～17% 血），經驗為設計節奏的 0.89～1.18 倍；凡人 1 階沒宗門技能在靈山大川最低剩 55% 血；
    越級（煉氣去深淵險地、金丹去天南）不吃丹藥每小時陣亡 4～10 次、吃丹藥約 115 顆且不會死——這是刻意的門檻。
  - 懸賞（化神 5 階、宗門 +30%，對手同境界同階）：無裝備 天 0%／地 17%／人 80%；減傷 30 閃避 15 → 13%／57%／95%；減傷 60 閃避 40 → 57%／93%／100%；對決 7～16 回合（舊制表格見第 36 節）。
  - 鎮魔塔（30 場）：一般玩家（+50%）打第 1、2、4 層全勝、約 300 回合；第 3 層（冰凍＋攻 ×1.5）一般玩家 0 勝、中等裝備（+100%、減傷 40 閃避 25）全勝；
    第 5 層（攻 ×3）煉虛 1 階一般 0 勝、煉虛 10 階 19/30、中等全勝；完全沒增益的煉虛 1 階全敗。實際 UI 走完一場（191 回合勝、樓層 +1、獎勵入帳）。
  - 死守天南城（20 場，連打到失守）：一般玩家無減傷 煉虛 1 階 3 波、合體 10 階 8 波、渡劫 10 階 8～23、真仙 10 階 38～58、混沌道祖 10 階 68～98。
    成長只有每境界 ×1.05，100 波的總強度只差約 2 倍，所以**裝備的影響遠大於境界**——減傷 60 閃避 40 的煉虛玩家可守 28～58 波、渡劫 10 階可能全破（舊制不管裝備都只多 2～4 波）。
    ✅ **使用者決定維持現狀**（2026-09-28）：「連番塵戰，這已經不是靠天賦可以決定的，裝備大於天賦」。里程碑（第 N 波 = 某境界）只代表「同境界一般玩家、無減傷閃避」的參考強度，
    獎勵照波次發放（裝備好的低境界玩家能拿到高波次獎勵是刻意的）。之後調整守城時不要再把「讓境界主導」當目標。
    ⇒ 2026-09-29 玩家回報「隨便都能打到 100 波」，使用者選擇「加每波成長倍率」（`defenseWaveGrowth` 1.015）：仍然是裝備主導，只是讓後段也變難，詳見第 49 節最後一項。
  - 開關關閉時舊制數值完全相同（妖獸、懸賞、守城、地圖卡片、藏書閣、裝備卡片皆比對過）；gm.html 載入正常且仍是舊制數值；Console 無錯誤。
- **第 3 階段：存檔轉換與上線**（2026-09-28，版本 `20260929r`）
  - 使用者決定：**丹藥不補償、重新來過**；**舊戰力榜與守城榜由使用者用 GM 後台全部刪除**（沿用同一組集合）；**這版就上線**。
  - **開關**：`NUMERIC_V2` 預設開啟；`localStorage['xiuxian_numeric_v2'] = '0'` 可在單一瀏覽器退回舊制（除錯用，丹藥清空不會還原）。
  - **存檔轉換** `migrateNumericV2()`（save.js，`migrateProgressionFields` 內呼叫，只做一次，記 `player.nv2Converted`）：`pillUsed` 清空；藏書閣次數保留（舊上限 100，本來就在新規則內）；
    `defenseSubmitted` 歸零、`defensePending` 清掉（守城榜要用新制數字重新送審）；`idleProvenMap` 清掉；設 `player.nv2Notice`。新角色在 `chooseGender` 直接記 `nv2Converted`，不跳公告。
  - **改版公告** `#notice-modal`（main.js 的 `showNumericV2Notice`，`initGame` 後 0.8 秒；按「知道了」`closeNumericV2Notice` 清旗標並存檔）：列出小數字制、敏捷、丹藥重來、野外妖獸、等級上限、戰力榜重算與其他新系統。
  - **榜上的數字**（leaderboard.js）：新制 `getRankPower()` = `nv2CombatPower()`、`getRankAttack()` = max(物攻, 術攻)；暫時增益在新制是加進增益池，用除的不準，
    改由 `lbWithoutTempBuffs()` 暫時把禁術／靈寵增益／化功計時歸零再算、算完還原。戰力 ÷ 攻擊 固定約 1.8～2.28。
  - **雲端規則**（`tools/firestore.rules`）：戰力上限改為 **400 ＋ 境界 × 40**（凡人 400、混沌道祖 1000）；守城送審 `atk ≤ power`。依據：本機以「白金 +20 武器、職業滿階＋傳承＋劍體、丹藥藏書閣全滿、至尊靈根、增益 +200%」
    量得理論最高 凡人 163／金丹 210／煉虛 286／渡劫 365／真仙 425／混沌道祖 463。快取中的舊版程式上傳億兆級戰力會被擋下（只在 Console 警告）。
  - **GM 後台**（gm.html）：載入 `config-numeric.js`／`numeric.js`；上限 `CAP_BASE`＋`CAP_PER_REALM`；「基礎值倍率」改「一般玩家倍率」（戰力 ÷ `nv2TypNormal × nv2TypRoundMult`）；🟡 門檻改 60%；
    暴增預設 1 小時／4 倍／新戰力 ≥ 60（儲存鍵改 `gm_jump_settings_v2`，舊的 30 倍／100 萬不會沿用；上線後請用「時窗內最大成長」校準）；
    守城審核 ③ 改為「戰力 ÷ 攻擊 在 1.7～2.4」（`DEF_POWER_ATK_MIN`，設定鍵 `gm_defense_settings_v2`；2026-10-03 暴擊 ×2 後上限預設 2.6、鍵 `v3`，第 66 節）；守城強度 `defenseWaveAtk` 自動用新制曲線；
    新增「💥 新制上線清空全部榜單」按鈕：刪除戰力榜、守城榜、守城送審全部資料（黑名單保留），需 confirm 並輸入「清空」。
  - 其他：gear.js 毒爆、beast-combat.js 靈寵技能的傷害改 `roundDmg`（新制原本會被捨成 0）。
  - ⚠️ **上線順序**：① Firebase 主控台發布新版 `tools/firestore.rules` → ② push → ③ 用 GM 後台「💥 新制上線清空全部榜單」。
    先 push 再發規則的話，新版程式上傳的小數字不受影響，但舊規則不會擋下舊程式的億兆級上傳。
  - 驗證（本機）：預設開啟；舊存檔轉換後丹藥 {}、守城送審 0、藏書閣保留、公告只跳一次；開禁術 ×3 時畫面戰力 278、榜上仍 256；
    gm.html 無錯誤，舊制 5 兆戰力標 🔴、凡人 300 標 🟡、送審戰力 ÷ 攻擊 6.6 倍判不一致。規則與清空按鈕需在線上實測。- **第 2 階段補充**（2026-09-27，版本 `20260929l`，使用者逐項決定）：
  - **轉世**：新制保留此世氣血上限的 `reincarnateHpKeep` 10%，存在 `player.reincarnateBonus.nv2Hp`（`nv2MaxHp` 以固定值加上，再乘虛弱；因為 `getMaxHp` 已含前世保留量，會逐世累積）。
    新制下舊制的 `hp`／`mp` 保留量不更新（避免新舊數字混在一起），四維保留在新制無作用。確認視窗與日誌依制度改字。實測：仙人 5 階氣血 115 → 轉世保留 11.5 → 凡人 1 階氣血 62。
  - **靈寶閣寶物**（含神器）：沒有圖鑑 def、只有 `lingbaoId`，改由 `nv2LingbaoStats` 給屬性點——總量 `lingbaoStatBudget`（初級 2.5／中級 4／高級 6／神器 10，圖鑑橙裝一件約 1.5）× 強化，
    依商品原本四維的比例分配（例：大羅劍胎 力量 5.6、靈力 1.9、體質／悟性 1.3）；武器沒有裝備等級，`nv2WeaponAtkOf` 依兌換階段給成長位置 `lingbaoWeaponL`（初級 4／中級 8／高級 10）。
    實測：誅仙劍武器攻擊 12.2（= 橙色 Lv.1000），減傷閃避屬性傷害沿用商品原本數值。
  - **宗門技能耗魔**：不縮小，**讓玩家買靈力丹藥吃**（使用者決定）。
    ⇒ 2026-09-28 修正（版本 `20261001t`；玩家反映「氣血比靈力值還低」）：使用者改選「靈力與技能耗魔一起縮小 10 倍」——`NV2.mpBase` 50→5、`mpPerSpr` 10→1、`levelMp` 0.5→0.05，
    技能耗魔一律經 `numeric.js` 的 `skillMpCost(base)`（新制 ×`NV2.mpScale` 0.1 無條件進位，例 45→5、150→15、360→36；舊制原值）。施放（combat.js）與顯示（spells.js、lingbao-shop.js、ui.js 技能列表）都改用它。
    靈力上限與耗魔比例不變，所以放技能、吃藥的頻率不變；所有靈力回復（丹藥、打坐、回靈、靈寵、神器）本來就按上限百分比，不用改；舊存檔目前靈力超過新上限時 `updateUI` 會自動夾回。**日後新增會顯示或扣除耗魔的地方都要用 `skillMpCost()`。**
  - **商品預覽**：千寶閣卡片本來就走 `formatEquipDetails`，已是新制顯示；靈寶閣改用 `formatLingbaoItemStats`（lingbao-shop.js，新制組一件兌換後的裝備交給 `nv2FormatEquipStats`）。
  - **符寶**（2026-09-27，版本 `20260929m`，使用者要求改新制）：四維符每枚改為 `talismanFlat` 下品 0.1／中品 0.3／上品 0.6（舊制 100／400／1500），
    由 talisman.js 的 `talismanFlatOf` 回傳；`nv2GearStats` 把身上所有孔位的四維符加進屬性（不併進單件的 `nv2GearStatsOf`，卡片上由孔位那一行顯示「+0.6」）。
    全身橙裝約 30 孔全鑲上品同一種 ≈ +18，與丹藥上限 +20 相當。戰鬥屬性符（%）不變。符寶坊的品階說明依制度顯示。實測：上品＋下品力量符 = 力量 +0.7。
  - **境界等級上限**（版本 `20260929n`）：新制下每個境界有人物等級上限（凡人 50…混沌道祖 10000），詳見第 14 節。
  - 轉世後人物等級回 Lv.1，但**已穿在身上的裝備不會卸下**（穿戴等級只在穿上時檢查，equipment.js），所以高等級武器照樣生效；新制下等級只影響氣血 % 與靈力，歸零損失很小。
- **後期增益上限與圖紙武器**（2026-10-03，版本 `20261005h`；使用者回報「仙人初境裝備 Lv.1500，增益已觸頂，後面怪物血量增加但人物提升跟不上」，並懷疑萬界仙門 +80% 是錯誤）：
  - **萬界仙門 +80% 不是錯誤**：宗門增益 =（戰力倍率 − 1）× `sectBuffPerMult` 20%，萬界仙門 ×5.0 → +80%（上清截教宗 ×6 +100%、九幽黃泉 +90% 更高）；頂級宗門一個就吃掉上限的 4～5 成。
  - **診斷**（仙人初境 1 階、增益 +200%、橙色 Lv.1000 +20，用遊戲公式算）：本境界普通圖（星空古路）3.7 下殺一隻、被打 133 下才死；普通怪血量從仙人到混沌道祖只多約 ×1.3。
    真正卡住的是 ① 跨境界的境界壓制（第四、五區 ×2～6.5）② 挑戰圖強度 15～40 倍（荒古禁地 34 下／被打 14 下死，上蒼 98 下／4 下）③ **圖紙武器 Lv.1000→1500 攻擊只多 3%**（成長位置只 +1 境界＝×1.05）。
    單純把上限 200→300 只多 33%，挑戰圖照樣是牆、普通圖更簡單。提出 A 上限隨境界提高／B 圖紙成長加大／C 宗門增益減半／D 不改，**使用者選 A＋B**。
  - **A**：`NV2.buffCapByRealm` { 仙人初境 220、天仙 240、真仙 255、大羅金仙 270、混元大羅金仙 285、混沌道祖 300 }，其他境界（渡劫以前）照 `buffCap` 200；numeric.js 新增 `nv2BuffCap()`，`nv2BuffPct` 改用它。
    怪物基準（一般玩家增益最多 +50%）不變，所以只有增益多的玩家受惠。改版公告 `#notice-modal` 的「最多 +200%」補上「仙人初境起依境界提高，混沌道祖 +300%」。
  - **B**：`NV2.blueprintWeaponMult` { 1500: 1.25、2500: 1.5、3500: 1.8、5000: 2.1、6500: 2.5、8000: 2.9、10000: 3.4 } 乘在 `nv2WeaponAtkOf`（成長位置 `blueprintWeaponL` 照舊）。
    橙色 +20 武器攻擊：Lv.1000 18.3 → 1500 24.1 → 2500 30.3 → 3500 38.2 → 5000 46.8 → 6500 58.5 → 8000 69.5 → 10000 83.5；每檔總攻擊（含空手）約 +18～21%。只影響玩家武器，怪物基準仍假設 Lv.1000。
  - **C. 圖紙防具加氣血**（同日，使用者：「防具也加血」）：`NV2.blueprintArmorHpPct` 每件防具（頭、內衣、盔甲、手套、長靴、披風）的氣血 %，以橙色 +20 為基準
    { 1500: 3.3、2500: 7.5、3500: 12.5、5000: 17.5、6500: 25、8000: 31.5、10000: 40 }；實際 = 表中值 ×（品質倍率 ÷ 1.5）×（1 + 強化 × 2.5%）÷ 1.5。
    numeric.js 新增 `nv2ArmorHpPctOf(eq, slot)`（非圖紙或非防具回傳 0）、`nv2ArmorHpMult()`（身上六件相加），`nv2MaxHp` 多乘它——**獨立倍率、不進增益池**（不受上限影響）。
    全身橙色 +20 的氣血倍率：1500 ×1.2、2500 ×1.45、3500 ×1.75、5000 ×2.05、6500 ×2.5、8000 ×2.89、10000 ×3.4（與圖紙武器的總攻擊成長一致）；白色 +0 約為一半、白金 +20 約 1.33 倍。
    裝備卡片（`nv2FormatEquipStats`）圖紙防具多一行「🛡️氣血 +7.5%」（Lv.1000 以下防具不顯示）。怪物攻擊基準不變。
    驗證（本機，仙人初境 1 階）：無圖紙 115 → 全身 Lv.1500 137 → 2500 166 → 10000 390；白色 +0 Lv.2500 ×1.2、白金 +20 ×1.6；
    增益 +220% 時被打幾下會死（改前 → Lv.1500 → Lv.2500 防具）：星空古路 133 → 170 → 205、九天仙域 56 → 72 → 87、不死山 34 → 43 → 52、萬界戰場 15 → 19 → 23、荒古禁地 14 → 18 → 22、上蒼 4 → 6 → 7。
  - 驗證（本機，禁術 ×21 讓增益爆表）：凡人／煉虛／渡劫封頂 200%，仙人 220、天仙 240、真仙 255、大羅 270、混元 285、混沌道祖 300；
    仙人初境 1 階攻擊 94.3（改前）→ 100.6（Lv.1000＋上限 220）→ 122（Lv.1500）→ 145（Lv.2500）。殺一隻幾下（改前 → 改後 Lv.1500）：星空古路 3.7 → 2.9、
    九天仙域 7.8 → 6.0、不死山 12.3 → 9.5、萬界戰場 27 → 20.9、荒古禁地 33.8 → 26.1、上蒼 98 → 76；被打死的下數 +5～7%（只有上限提高）。Console 無新錯誤。

## 53. 宗門傳承、資質測試（先天靈根／體質）與變異屬性（2026-09-27，版本 `20260929p`）

使用者要求「門派跟職業掛鉤」「入宗後資質測試擲骰決定靈根」「體質系統」「五行系統調整」。四個決定（使用者選定）：**傳承加成**（不限制主修）、**每階段加 1 個宗門**、**舊靈根改名五行共鳴**、**資質可用道具重測**。
新舊制（`NUMERIC_V2`）都生效；加成走 `getBonusTotals`，新制下 % 加成一樣進增益池（上限 +200%）。

### 一、宗門傳承（config-sects.js、config-profession.js、profession.js、sect.js）
- 每個宗門加 `weapon`（傳承武器），三個階段各 6 個宗門、6 種武器各一：

  | 武器 | 凡俗 | 修真 | 至高 |
  |---|---|---|---|
  | 劍 | 武當 | 蜀山劍派 | 上清截教宗 |
  | 刀 | 少林寺 | 天魔教 | 九幽黃泉 |
  | 扇 | **逍遙派（新）** | 崑崙仙宗 | 太清道德宗 |
  | 弓 | 皇朝 | 御獸仙宗 | 萬界仙門 |
  | 笛 | 峨嵋 | **天音閣（新）** | **天籟仙宮（新）** |
  | 筆 | 全真教 | 丹鼎司 | 玉清闡教宗 |

  新宗門（皆正派）：逍遙派 經驗 ×1.2／戰力 ×1.1（天山折梅手、逍遙扇舞）、天音閣 ×2.0／×1.8（天音破魔曲、裂石音刃）、天籟仙宮 ×4.0／×4.0（天籟九霄、仙音斷魂）。原有宗門的技能名稱不變。
- **傳承加成** `getSectLegacy()`：主修職業的武器 = 目前所屬宗門（`player.sect`）的 `weapon` 時生效，`SECT_LEGACY_BONUS`：凡俗 武器 +10%／熟練度 ×1.3、修真 +20%／×1.6、至高 +30%／×2。
  武器加成加在 `getProfWeaponMult`（舊制＝該武器四維、新制＝武器攻擊），熟練度倍率在 `gainProficiency`。任何職業都能主修，換宗門（回歸已選宗門）就能追加成。
- 顯示：宗門卡片「⚔️ 傳承：🗡️劍修（劍）」與加成（與主修相合標綠，`formatSectLegacyLine`）；拜入／回歸時日誌說明是否相合；天磯錄職業分頁頂端顯示傳承是否生效、每張職業卡列出傳承宗門。
- 驗證：主修劍＋拜入武當 → 劍 ×1.1、熟練度 100 → 130；改到天音閣 → 失效並提示。

### 二、資質測試（config-aptitude.js、aptitude.js）
- **觸發**：第一次拜入宗門後（`joinSect` 延遲 0.3 秒呼叫 `checkAptitudeTest`），以及每次進遊戲（`initGame` 延遲 1.2 秒）時已在宗門但沒有 `player.aptitude` 的老玩家補測。
  視窗 `#aptitude-modal`：「🎲 手按測靈石」→ 名稱輪播約 1.6 秒（`prefers-reduced-motion` 時直接顯示）→ 先天靈根、先天體質各一張卡（等級、說明、加成）。結果一世固定，**轉世也保留**。
  - **再來一次／決定**（2026-09-29，版本 `20261002j`，使用者要求）：擲完後顯示「🎲 再來一次」「✅ 決定」（`#aptitude-choice`）。結果先放在 `aptitudeFirstPending`，
    按「再來一次」（`rerollAptitudeFirst`）靈根與體質一起重抽、顯示「已再來 N 次」，**次數不限、不花費**；按「決定」（`confirmAptitudeFirst`）才寫進 `player.aptitude`、存檔並關閉視窗。
    還沒決定就關掉視窗或重新整理＝沒測，下次開啟重新測。仙府信箱賜予的部分（`player.aptitudeGift`）固定不變，只重抽另一項。
  - **🔁 自動重抽**（同日，版本 `20261002l`，使用者要求）：按鈕下方的開關（`#aptitude-auto`，`toggleAptitudeAuto`）＋停止條件。
    停止條件是「靈根至少」`#aptitude-auto-root`、「體質至少」`#aptitude-auto-phys` 兩個選單，**兩項都達到才停**
    （`APTITUDE_ROOT_RANKS` 偽→真→天→變異→特殊→至尊、`APTITUDE_PHYS_RANKS` 凡→靈→道→神；預設「天靈根以上」「不限」）。
    （版本 `20261002x` 曾改成單一選單只選一種，2026-09-29 使用者要求改回兩個選單；滾動 1 秒與下方 0.05% 保留。）
  - **兩項同時最頂級 0.05%**（版本 `20261002x`，使用者指定）：`rollAptitudeFirstOnce` 每次另有 `APTITUDE_BOTH_TOP_EXTRA`（0.04%）直接給至尊靈根＋神體，
    加上獨立擲骰本來的 0.01%，合計約 0.05%；單項約 1.04%。實測 200 萬次：兩項最頂級 0.049%、至尊靈根 1.04%、神體 1.05%。洗髓／伐骨重測（單項）不受影響。
    開啟後一直用 `rollAptitudeFirstOnce()` 重抽（計入「已再來 N 次」）：**保留滾動畫面**，靈根與體質兩格同時滾動 `APTITUDE_AUTO_FRAMES`(12) 格 × 80 毫秒 ≈ 1 秒（`playAptitudeDice` 第 5 參數），
    停下後判斷，兩項都達到就停並提示「🎯 已抽到目標」，否則停頓 `APTITUDE_AUTO_MS`(150) 毫秒再抽；仍要玩家按「決定」。（同日第一版為 0.3 秒一次、不播動畫，使用者要求改為保留滾動、每次 1 秒，版本 `20261002m`）
    關掉開關、按再來一次或決定、關閉視窗都會停（`stopAptitudeAuto`，滾動途中關掉則顯示完這次的結果就停）；仙府賜予的那項視為已達成、不播滾動。
    實測：每次約 1.1 秒、兩格都有滾動；手動關閉、關視窗都會停；目標「天靈根以上」數次內停下；Console 無錯誤。
- **先天靈根**（`APTITUDE_ROOT_GROUPS`，組機率，組內平均）：

  | 組 | 機率 | 修為（fx:悟道） | 其他 |
  |---|---|---|---|
  | 偽靈根 五靈根／四靈根 | 17%／18% | −25%／−15% | 渡劫勝算 −5% |
  | 真靈根 三靈根／雙靈根 | 30%／17% | 0／+20% | 所含五行各得 20%／40% 親和 |
  | 天靈根（單一五行） | 8% | +50% | 該五行 100% 親和 |
  | 變異 風／雷／冰／暗 | 6% | +40% | 風擊 15＋敏捷 10%／雷傷 20＋攻擊 5%／冰傷 20＋抗凍 30%／暗蝕 15（本質暗） |
  | 特殊 無屬性／日／月／仙 | 3% | +60～80% | 全屬性 8%／物攻 12%＋聖光 12（光）／術攻 12%＋冰傷 15／全屬性 8%＋氣血 10%＋聖光 8（光） |
  | 至尊 混沌、太初、鴻蒙、創世、先天五太、先天五行、空靈、空明、空識 | 1% | +100～130% | 全屬性 10～15% 等 |

  五行親和 `ROOT_ELEMENT_AFFINITY`（×親和比例）：金 金傷 15、木 每回合回血 1%、水 冰傷 15、火 火傷 15、土 減傷 5。名稱例：「火天靈根」「木水雙靈根」「四靈根（金木火土）」。
  實測 2 萬次：偽 34.4%、真 47.2%、天 8.3%、變異 6.4%、特殊 2.9%、至尊 0.9%。
- **先天體質**（`APTITUDE_PHYSIQUE_GROUPS`）：凡體 71%（2026-09-29 神體改 1%，多出的 1% 併入凡體；原 70%）；靈體 22%（庚金／乙木／癸水本源體、九陽赤炎體、戊土本源體（本命五行相同時攻擊 +8%）、天雷之體（渡劫 +5%）、玄冰之體、純陰／純陽之體（術攻／物攻 +10%、暗蝕／聖光 8、暗殺者 ×1.5）、天生藥體（丹藥效果 +50%）、萬毒不侵體（免疫中毒））；
  道體 6%（先天劍體、霸刀戰體、風靈仙體、神射之體、天籟道體、符靈道體：裝備對應武器時該武器 +15%、技能傷害 +10%；劍體為使用者指定，其餘五種補齊六職業）；
  神體 1%（2026-09-29 使用者指定，原 2%；混沌體、荒古聖體、先天聖體道胎、蒼天霸體、重瞳、至尊骨）。至尊靈根維持 1%。實測 10 萬次：神體 0.98%、至尊靈根 0.98%。
- **加成套用**：`getAptitudeBonusTotals()` 併入 gear.js 的 `getBonusTotals`（含條件式：武器體質裝備該武器時的技能傷害、本源體的本命五行攻擊）；
  `getAptitudeSpecial()`：`trib` → tribulation.js 的勝算（確認視窗多一行「先天資質」）、`ambushMult` → combat.js 暗殺者機率、`poisonImmune` → `resolveHit` 與懸賞「蝕骨毒功」不上毒、`weapons` → `getProfWeaponMult`（不論主修）、`nature` → 光暗本質。
- **顯示**：人物面板「資質：木水雙靈根・乙木本源體」（`#aptitude-display`，點擊 `openAptitudeView()` 查看與重測）。
- **凝聚元神後資質鎖定**（第 65 節，2026-10-02）：不能重測、不接受仙府賜予資質；轉世元神消散後解鎖。
- **重測**：千寶閣「珍貴物資」新增【洗髓丹】（重測靈根）、【伐骨丹】（重測體質），各 `APTITUDE_REROLL_COST` 1 顆七彩補天石（2026-09-29 由 10 改 1；`buyAptitudePill`，背包也會顯示）。
  使用後擲出新結果，**玩家選擇保留新的或原本的**（`finishAptitudeReroll`）。存檔：`player.aptitude = { root: { group, id?, elems? }, physique, at }`、`player.rootPills`、`player.physiquePills`（用到時才建立）。

### 三、變異屬性與光暗（config-elements.js、elements.js、combat.js）
- 五行相剋照舊只在金木水火土之間。新增變異屬性（`VARIANT_AFFIX_TYPES`，與屬性傷害一起套 `AFFIX_CAP` 50%，目前來源只有先天資質）：
  - 🌪️**風擊** `wind`：每回合機率追加一擊（普攻 ×`WIND_HIT_MULT` 0.6，combat.js 的 `playerAttackTurn`）。實測 15% → 16%。
  - ☀️**聖光** `light`：該擊 ×1.3 並回復最大氣血 1%（`LIGHT_BONUS`／`LIGHT_HEAL`）。
  - 🌑**暗蝕** `dark`：該擊無視減傷並吸取 20% 傷害（`DARK_LIFESTEAL`）。實測 23% → 23.75%。
  - 雷、冰沿用原本的雷傷、冰傷。
- **光暗互剋**：`attrs.nature`（light／dark）不同的雙方互相攻擊 +30%（`LIGHT_DARK_COUNTER_BONUS`，tag「☯️光暗相剋」）。
  玩家本質來自資質（靈根與體質一光一暗時抵銷）；野外邪修與暗殺者（邪）為暗、正道為光；懸賞人物依陣營；幽冥禁域（`DARK_MAP_CATEGORIES` = [4]）妖獸為暗；心魔鏡像玩家（同本質不相剋）。
- 人物面板戰鬥屬性列：變異屬性有數值才顯示，最後附「☀️本質：光／🌑本質：暗」；五行共鳴說明視窗（「!」）新增「變異屬性與光暗」段落。
- 尚未做：裝備詞條、符寶、仙法還不會提供風／光／暗（只有資質）；鎮魔塔 BOSS 沒有光暗本質。

### 載入順序
`config-aptitude.js` 接在 `config-profession.js` 後、`aptitude.js` 接在 `profession.js` 後（都只在執行期被呼叫，順序不影響）。

## 54. 丹田、金丹、元嬰與地圖推薦練功區（2026-09-27，版本 `20260929q`）

使用者設計：築基期多一條「丹田成長」，進金丹時依丹田凝結五品金丹（影響氣血與靈力）；進元嬰時金丹轉為元嬰（天／地／人三品各分上中下，影響術法傷害）。
使用者選定：**累積靠修為＋待渡劫溢出＋丹藥**、**老玩家補發中等**、**門檻 50／75／100＋超品機率**、**元嬰影響化神勝算，另有天材地寶可加機率**。新舊制都生效。

### 丹田與溫養（config-golden-core.js、golden-core.js）
- 存檔 `player.goldenCore = { dantian, core, nurture, infant }`（dantian／nurture 0～1；core 0～4、infant 0～8，null = 未凝結）。
- **累積**（`gainCoreProgress`，leveling.js 的 `gainExp` 在判斷待渡劫之前呼叫，所以溢出的修為也算）：築基期灌丹田、金丹期灌溫養，
  每獲得「整個境界所需修為」灌 `CORE_FILL_PER_REALM` 50%（`getRealmStageExp × 55`）。正常修完築基約 50%，圓滿後在築基多待同樣時間再 +50%。跨 50／75／100% 時寫日誌。
- **凝元丹**（煉丹房 `#pill-card-core`，只在築基／金丹期顯示）：5 株上品靈草＋1 萬靈石，丹田／溫養 +5%（`craftCorePill`）。
- **金丹**（`onRealmAdvancedCore`，advanceRealm 晉升金丹時）：下品（<50%）／中品（50%）／上品（75%）／極品（100%）＋0／10／20／35% 氣血與靈力上限；
  丹田 100% 時再擲超品（+50%），機率 `getSuperCoreChance` = 10%＋靈根（天／變異 +10%、特殊 +20%、至尊 +40%）＋體質（道體 +10%、神體 +30%）。
- **元嬰**（晉升元嬰時）：起點 `INFANT_BASE_BY_CORE` [0,2,3,5,6]（下品→人下、中品→人上、上品→地下、極品→地上、超品→天下），溫養 ≥ 50% 再 +1、100% 再 +2。
  九品術法傷害 人 0／5／10%、地 15／20／25%、天 35／45／60%；天元嬰出世日誌附天地異象（`INFANT_OMENS`）。
- **加成**：`getGoldenCoreBonusTotals` 併入 `getBonusTotals`（`hpPct`、`mpPct`、`magPct`）；`mpPct` 為新鍵，舊制 `getMaxMp` 與新制 `nv2MaxMp` 都乘上。
- **化神勝算**（元嬰 → 化神，`getCoreTribBonus`）：人元嬰 −10%、地 ±0、天 +10%。
  **化神靈果**（天材地寶，千寶閣珍貴物資 1 顆七彩補天石（2026-09-29 由 3 改 1），`buySpiritFruit`）：元嬰期渡劫化神時自動服用 1 顆 +10%（可抵銷人元嬰）；確認視窗列出元嬰與靈果兩行。背包顯示持有數。
- **老玩家**（`migrateGoldenCore`，save.js 讀檔時；存檔沒有 goldenCore 才做）：金丹期以上補發中品金丹、元嬰期以上補發地元嬰・中。
  ⚠️ 補發只在讀檔時做：advanceRealm 會在晉升後立刻算氣血，若在取值時補發，剛進金丹的新玩家會被誤判成老玩家。
- **轉世**：`goldenCore` 清空，重新累積。
- **凝聚元神後**（第 65 節，2026-10-02）：金丹與元嬰加成**照常保留**（使用者先要求「消失」，同日看過前後對照後改選「全部保留」，版本 `20261005e`）。
- 人物面板「金丹：」一行（`#core-display`，`formatCoreShort`）：築基期顯示丹田 % 與可結成的品級，之後顯示金丹、溫養、元嬰。
- 驗證（本機）：修完築基 丹田 51.5% → 待渡劫再練半個境界 77% → 上品金丹；溫養 62% → 地元嬰・中（術法 +20%）；
  人元嬰化神 −10%、靈果 +10% 並消耗；凝元丹 10 顆 30% → 80%；新制下 下品＋人下 → 超品＋天上：氣血 88 → 123、靈力 952 → 1375、術攻 17 → 25；Console 無錯誤。

### 地圖推薦練功區（config-maps.js、map.js）
- 每張戰鬥地圖加 `suit: [最低境界, 最高境界]`（依 `realmPacing` 的主要練功地圖）：靈山大川 凡人～煉氣、深淵險地 築基、上古遺跡 金丹、天南 元嬰、亂星海 化神、鬼谷八荒 煉虛～渡劫、
  荒古禁地 仙人初境、太初古礦 仙人初境～天仙、上蒼 天仙、不死山／神墟／仙陵／冥界 真仙、仙界戰場 大羅金仙、萬界戰場 混元大羅金仙、混沌初界 混沌道祖。
- `getMapSuitRange`：舊制用 `suit`；新制妖獸強度由 `nv2L` 決定，改用 nv2L 所在境界。`getRecommendedMaps`：目前境界落在範圍內的地圖（沒有就取不超過自己的最高那張）。
- **地圖境界門檻**（2026-09-28，版本 `20261001s`；玩家發現金丹能進煉虛的鬼谷八荒。使用者選「最多越 1 個大境界」）：`map.js` 的 `getMapMinRealm(item)`＝新制 `floor(nv2L) − 1` 與原本 `minRealm` 取較嚴者。
  結果：深淵險地 煉氣、上古遺跡 築基、天南 金丹、亂星海 元嬰、鬼谷八荒 化神、崑吾山 合體（原值）、雷鳴大陸 大乘、天淵戰場／荒古禁地／太初古礦 渡劫、上蒼 仙人初境、不死山～冥界 天仙、仙界戰場 真仙、萬界戰場 大羅金仙、混沌初界 混元大羅金仙
  （原本前 6 張沒門檻、荒古禁地等只要煉虛）。`changeMap` 擋下並提示；地圖卡片顯示「限制：X 以上」（不夠時紅字＋🔒）。
  原因：新制妖獸強度只看地圖，低境界拿高等裝備越級刷高階圖，經驗靈石暴增。**讀檔時** `save.js` 的 `migrateCurrentMap()` 發現境界不夠還待在圖裡 → 送回宗門並寫一則日誌（在離線結算之前，所以那段離線算宗門靜修）。
- **境界壓制**（2026-09-28，版本 `20261001u`；玩家反映「金丹可以打煉虛，怎麼樣都不合理」）：新制每大境界成長只有 ×1.05，一般配置金丹 10 階打煉虛妖獸只要 33 下（同境界 25）、被打 211 下才死（同境界 250），境界幾乎沒有意義。
  `numeric.js` 的 `nv2SuppressMult(map)`：gap＝地圖 `nv2L` −（玩家境界＋(階−1)/10），>0 時妖獸氣血 ×(1＋gap×`NV2.suppressHp` 1.0)、攻擊 ×(1＋gap×`NV2.suppressAtk` 1.2)，直接乘在 `nv2MonsterStats` 裡（刷怪、離線估算、地圖卡片都一致；`nv2KillRewardMult` 仍依一般玩家算，所以越級刷變慢、每小時收益下降）。
  實測（一般配置）：金丹10→煉虛 102 下殺一隻／62 下陣亡；元嬰1→化神 56／99；元嬰10→化神 28／246；同境界不變。地圖卡片會標「⚠️ 境界壓制：高你 X 個境界，氣血 ×A、攻擊 ×B」。
  搭配上面的地圖門檻（最多越 1 個大境界），剛突破時越級很吃力、修到該境界後期才能順利挑戰下一境界地圖。
- **妖獸隨玩家階數＋強度 1.5～3 倍**（2026-09-29，版本 `20261002c`；使用者指定「玩家 1 階遇到 1～2 階、10 階遇到 10 階或下一境界 1 階，平均強度是玩家的 1.5～3 倍，玩家要大量補血」）：
  - 原本妖獸強度只看地圖 `nv2L`，同一張圖 1 階和 10 階玩家遇到的一樣；每波之間調息每秒回 10%，同境界幾乎不用吃藥。
  - 使用者選定：①**地圖定境界、玩家定階數**；②強度以**同階一般玩家**為基準（裝備仍有意義）；③**攻擊與氣血都放大**；④調息 `restHealPct` 10 → **3**（一波間約回 30%）。
  - `numeric.js`：`nv2MonsterLevelAt(map, up)`＝玩家 L ＋ up，夾在 [地圖 `nv2L`, 地圖 `suit` 最高境界 + 0.9]；玩家境界 ≤ suit 最高境界時上限放寬為 +1.0（10 階遇到下一境界 1 階）。
    越級（玩家 L < 地圖 nv2L）固定為地圖 nv2L，境界壓制照舊（`nv2SuppressMult` 仍以地圖 nv2L 對玩家計算）。`nv2MonsterLevel(map, roll)`：roll 時 `NV2.monStageUp`（50%）機率高一階，否則取平均。
    `nv2MonsterStrMult(roll)`：隨機 `monStrMin`～`monStrMax`（1.5～3），平均 2.25。`nv2MonsterStats(map, roll)` 氣血、攻擊都以妖獸自己的 L 算再 × 倍率，回傳多了 `L`、`mult`。
    `nv2LevelLabel(L)`＝「築基5階」；`nv2MonsterLevelRange(map)` 給地圖卡片。
  - `combat.js`：新制刷怪時每隻各自 `getMapMonsterStats(map, true)`，妖獸物件多 `nv2Lv`；野外修士／暗殺者仍用該波的平均值 × 自己的倍率（約 3.4 倍）。
    `ui.js` 戰場名牌等級字改顯示目前這隻的 `nv2Lv`（「築基6階」），修士與舊制仍顯示地圖境界。`map.js` 地圖卡片：「妖獸 築基5階～築基6階（強度 1.5～3 倍）｜平均 氣血／攻擊」。
  - **收益不變**：`nv2TypRoundsPerKill` 乘上平均強度倍率，擊殺收益補償（`nv2KillRewardMult`）、遭遇機率補償、收益速度上限都跟著調，每小時經驗／靈石／聲望維持 `realmPacing`（每隻變慢、每隻給得多）。
  - 模擬（每回合 1 秒、每波 1～3 隻、血量低於 50% 就喝藥補滿；一般＝同階一般玩家、無減傷閃避，好裝＝攻 ×2、減傷 30、閃避 20）：
    一般玩家每隻約 55～60 回合、每小時擊殺約 60 隻，每小時失血約 **30～37 倍氣血上限**；調息約回 9 倍，其餘約 20～25 倍靠丹藥，約等於每小時 220 顆培元丹（4.4 萬靈石）或 440 顆凝血草（2.2 萬）。
    好裝每隻約 32 回合、失血約 15～20 倍。各境界比例相近。
  - **前期減壓**（同日，版本 `20261002e`，使用者同意）：妖獸境界 ≤ 築基（`NV2.monStrEarlyRealm` 2）時強度改為 `monStrEarlyMin`～`Max`（1.0～1.5），`nv2MonsterStrRange(L)` 依妖獸自己的 L 判斷，
    所以築基 10 階遇到金丹 1 階妖獸時會回到 1.5～3 倍（大境界門檻）。收益補償與地圖卡片都跟著用該範圍。
    模擬（一般玩家、血量低於 50% 喝培元丹）：每小時丹藥費占收入 凡人／煉氣 約 20～26%、築基 5 階 8%、築基 10 階 44%（半數遇金丹）、金丹 18%、元嬰 4%。
  - **離線／背景也扣丹藥**（同日，版本 `20261002e`，使用者同意）：`save.js` 的 `settleIdlePotions(est, 秒數, isOffline, 全程收入)`（新制才有）：
    每輪（`IDLE_WAVE_GAP_TICKS` + 平均隻數 × 每隻回合）受傷 `est.waveDamage`，扣掉刷新期間調息（`restHealPct` × `MONSTER_RESPAWN_SECONDS`）後的差額靠丹藥；輪數與收益同比例（離線 × `OFFLINE_REWARD_MULT`）。
    規則同線上 `checkAutoHealAndMana`：背包補血丹先用（回復量高的先，含「丹心」加成），不夠且有開自動補血時買「可自動購買、回復量最高」的（培元丹），可用「原有靈石＋這段收入」支付。
    丹藥與靈石都不夠時算出可戰鬥比例 f，收益 × f，結算訊息列出服用數量與「只撐了約 N% 的時間」。
    `idlePotionCanKeepUp(est)`：有開自動補血、且最好的可用丹藥「回復量 ÷ 5 秒冷卻」≥ 一波戰鬥中的每秒受傷時，即使一波傷害超過氣血上限也不送回宗門。沒開自動補血仍照舊送回宗門（除非線上已撐過 `IDLE_PROVEN_SECONDS`）。
    只補氣血，靈力丹不計。驗證（本機，1 小時離線）：背包 20 顆培元丹用完後自動購買 50 顆，靈石不夠時只撐 59%；沒丹藥也沒靈石 → 0%；沒開自動補血 → 退回宗門。
  - 驗證（本機）：築基 5 階在深淵險地刷出築基 5～6 階、名牌與地圖卡片正確；實際戰鬥 20 秒正常扣血；Console 無錯誤。
- **戰鬥節奏改版（A 方案）＋新手妖獸加強＋傷害浮動＋畫面 ×100**（2026-09-29，版本 `20261002z`；使用者同意三步計畫：① 節奏 ② 傷害浮動 ±10% ③ 畫面顯示 ×100，保底維持 80%）：
  - 第 ① 步：`NV2.hitsSame` 25 → **5**、`monAtkPct` 0.4 → **1.0**（一般玩家約 6～12 下殺一隻、妖獸約 45～70 下打死玩家；原本 30～60 下／100～260 下，太慢又沒打擊感）。
    新增 `NV2.monAtkEarly`（依妖獸自己的大境界：凡人、煉氣 ×1.5、築基 ×1.125；使用者「新手怪物攻擊力太低要增強」），乘在 `nv2MonsterStats` 的攻擊上。
    擊殺收益補償、遭遇機率補償、離線估算、收益速度上限都由 `nv2TypRoundsPerKill` 自動重算。
    實測（本機，同境界一般玩家的攻擊／氣血、靈寵休息、不自動喝藥，每組 15～20 分鐘換算每小時）：每小時擊殺約 ×2.7～4；經驗 ×0.86～1.11、靈石 ×0.87～1.02（等於不變）；
    凡人／築基每小時失血約 39 倍氣血，刷新調息就補得回來（幾乎不用丹藥）；中期原本定 0.75% 時丹藥只剩改版前 6～7 成（殺得快、調息次數多），改 1.0% 後約 8～10 成。
    ⚠️ 測試角色若有高等級靈寵出戰，維持費（依時間扣）會讓前期地圖靈石變負，與本次改動無關。
  - 第 ② 步：傷害浮動 **±10%**（`NV2.dmgVariance` 0.1；elements.js 的 `nv2DmgRoll()`，新制回傳 0.9～1.1、舊制固定 1）。
    套在 `resolveHit` 一開始（所以玩家、妖獸、夥伴、心魔、懸賞、守城、鎮魔塔、閃擊反擊都有，保底也以浮動後的值計算）與 beast-combat.js 靈寵技能的 `hit`；燒傷／中毒／光環持續扣血不浮動。平均不變，離線估算、戰力、收益補償不用改。
    驗證：攻擊 10 打 2 萬次 → 9～11、平均 10.000；守城（15 次連打到失守，有／無浮動）中位數相同（煉虛 1 攻×4：9／9、渡劫 10 攻×2：32／32、混沌 10 攻×4：79／79）；
    鎮魔塔（同階一般玩家攻×2、減傷 40 閃避 25，每層 100 場）20 層 47%／44%、75 層 26%／26%、100 層 0%／0%，差異在抽樣誤差內。
  - 第 ③ 步：**畫面顯示 ×100**（程式內部、存檔、戰力榜存的數值、雲端規則都不變，不用發布規則、不用清榜）。
    - `format.js` 新增 `combatScale()`（新制 100、舊制 1）、`fmtCombat(v)`＝ `fmtNum(Math.round(v × 倍率))`、`Number.prototype.toCombat`；home-ui.js 新增 `formatShortCombat`（HUD 簡寫）。
      **日後顯示攻擊、氣血、靈力、傷害、回復量、戰力、耗魔一律用 `fmtCombat`／`formatShortCombat`，不要直接 toWan／toFixed。**
      屬性點（力量等）、百分比、倍率、靈寵／夥伴自己的 100 點靈力、夥伴「綜合戰力」評分（0～100）不放大。
    - 內部精度 1 位 → **2 位小數**（×100 後剛好整數）：`roundDmg`、妖獸攻擊（numeric.js）、懸賞攻擊（bounty.js）、鎮魔塔 BOSS 攻擊、轉世保留氣血、combat.js 多隻加總。
    - 改用 fmtCombat 的顯示：戰場飄字（battle-fx.js 的 `fmtFxNum`，也用於戰場血條文字）、人物面板戰力／氣血／靈力、洞府 HUD、技能列表與仙法／靈寶閣的耗魔、
      戰鬥日誌（技能耗魔、反噬、持續傷害、法寶技能傷害／吸血／回靈、靈寵技能傷害）、渡劫（確認視窗、心魔氣血、持續傷害、吸靈力）、升級日誌（靈力上限）、轉世、
      地圖卡片妖獸數值、裝備卡武器攻擊、裝備欄與對比（`eqFmt(v, combat)`、`diffRow(..., combat)`，戰鬥數字門檻 0.005）、懸賞榜對手、鎮魔塔 BOSS 介紹／血條／飄字／戰況、
      守城紀錄戰力、戰力榜（你的戰力、榜上戰力）、離線結算（無法久留時的一波傷害與氣血上限）。
    - gm.html：`DISP` 100、`fmtP()` 顯示戰力／攻擊／守城強度；戰力暴增門檻改用顯示值（預設 6000＝內部 60，儲存鍵 `gm_jump_settings_v3`）；規則上限仍是內部值 400 ＋ 境界 × 40（說明文字註明畫面上等於 4 萬 ＋ 境界 × 4000）。
    - 順手修正：渡劫心魔戰力／氣血原本 `Math.floor`（新制 9.7 會捨成 9），改 `roundDmg`（渡劫勝負本來就靠擲骰，只影響心魔實際數值與顯示）。
    - 驗證（本機）：天南實戰飄字 玩家 789～919、受傷 230～416；人物面板 氣血「1.18萬 / 1.25萬」、戰力 1,700；地圖卡片妖獸攻擊 166～194；逐一開 10 個視窗掃「攻擊／氣血／靈力／戰力 + 1～3 位數」沒有漏網（夥伴評分與靈寵靈力是另一套尺度）；
      31 個視窗、野外、懸賞、渡劫、守城、鎮魔塔、存檔匯出匯入、離線全部正常；gm.html 無錯誤；Console 無錯誤。
    - 離線：一般玩家在同境界地圖一波傷害約為氣血的 0.2～0.65 倍（改版前 0.3～1.4 倍，靠丹藥才撐得住），直接可掛；天南 1 小時實測 88.8 萬經驗、56.9 萬靈石、培元丹 211 顆。
      實力不足（一波打不過）時，妖獸每秒傷害比改版前高，較容易「丹藥跟不上」而退回宗門。
- **新地圖「墜魔谷」**（2026-09-30，版本 `20261003a`；使用者指定「開放世界第二區、經驗 1200、煉虛可進、強度煉虛 10 階、5～10 倍」）：
  - config-maps.js 第二區第 4 張：`expRate 1200`、`coins 2550`（每小時約 296 萬，介於鬼谷八荒與崑吾山）、`minRealm 6`、`nv2L 6`（境界壓制從煉虛 1 階起算，煉虛玩家不吃壓制）、`suit [6, 6]`。
  - 新增兩個地圖欄位（numeric.js）：`nv2FixedL`（妖獸固定這個成長位置，不隨玩家階數；6.9 ＝ 煉虛 10 階）→ `nv2MonsterLevelAt` 直接回傳；
    `nv2Str`（這張圖的強度倍率範圍，取代 1.5～3）→ `nv2MonsterStrRange(L, map)`／`nv2MonsterStrMult(roll, L, map)`（map.js 地圖卡片也傳 map）。
    `nv2TypRoundsPerKill` 另乘 `nv2TypNormal(nv2FixedL) / nv2TypNormal(nv2L)`，擊殺收益補償約 ×14（鬼谷八荒 ×5.3），每小時收益照 expRate／coins 的節奏。
  - 數值（畫面 ×100）：妖獸平均氣血 9.07 萬、攻擊 645；一般煉虛玩家約 40 下殺一隻、妖獸 13 下打倒他。
  - 實測（煉虛 10 階、每組 10 分鐘換算每小時失血，×氣血上限）：一般玩家 499、攻×3 298、攻×3 血×1.5 減傷閃避各 20 → 164、攻×5 血×2 → 122（鬼谷八荒約 60）。
    丹藥每小時最多約補 216 倍（5 秒冷卻），所以大約要「攻擊 3 倍＋較厚的防具」才掛得住，一般玩家離線會被退回宗門——這是刻意的高難度圖。
    ✅ 使用者決定**維持現狀**（丹藥錢高、靈石只略高於鬼谷八荒，定位為挑戰圖），日後不要為了「划算」自行調高收益。
- **第三區六張挑戰圖＋五張普通圖**（2026-09-30，版本 `20261003c`；使用者指定）：
  | 地圖 | 經驗（原） | 妖獸（`nv2FixedL`） | 強度 `nv2Str` | 該境界 10 階一般玩家 |
  |---|---|---|---|---|
  | 崑吾山 | 1600（1400） | 合體 10 階 | 5～10 | 38 下殺一隻、被 13 下打倒 |
  | 雷鳴大陸 | 2100（1900） | 大乘 10 階 | 8～15 | 57／8.7 |
  | 天淵戰場 | 3000（2500） | 渡劫 10 階 | 11～20（原 8～20） | 70／7.1（調整前數字） |
  | 荒古禁地 | 5000（3000） | 仙人初境 10 階 | 15～25 | 100／5.0 |
  | 太初古礦 | 6500（4000） | 仙人初境 10 階 | 15～30 | 113／4.4 |
  | 上蒼（葬天島） | 8000（5000） | 天仙 10 階 | 15～40 | 138／3.6 |
  - **天淵戰場強度 8～20 → 11～20**（2026-10-03，版本 `20261005z`，使用者指出「雷鳴 8-15、天淵 8-20」）：下限沒跟著境界升，而且加入怪物型態（第 66 節）後雷鳴大陸多皮厚怪，
    一般玩家實測（每圖 1500 隻、無防禦）天淵每隻 76.8 回合反而比雷鳴 83.2 少、耗血 789% 對 572%。改成 11～20（下限 崑吾 5 → 雷鳴 8 → 天淵 11 → 荒古 15）後天淵 85.6 回合、943%，介於雷鳴（83／568%）與荒古（149／1616%）之間；
    每小時收益由 `nv2TypRoundsPerKill`（含強度平均）自動補償，不變。
  - **九天仙域強度 1.5～3 → 10～15**（2026-10-03，版本 `20261005F`，使用者指定）：只加 `nv2Str: [10, 15]`，妖獸仍隨玩家階數（沒有 `nv2FixedL`）。一般玩家（無防禦）每隻 13.3 → 73.6 回合、耗血 19% → 597%
    （上蒼 147 回合／2989% 仍較難）；每小時經驗／靈石由 `nv2TypRoundsPerKill` 自動補償不變。⚠️ 九天仙域是天仙的主要練功圖（realmPacing），一般配置離線估算撐不住會被送回宗門靜修。
  - **星空古路強度 1.5～3 → 10～15**（2026-10-03，版本 `20261005G`，使用者指定，同九天仙域作法）：一般玩家每隻 12.4 → 65.8 回合、耗血 18% → 569%（荒古禁地 151／1622%）；仙人初境的主要練功圖，一般配置離線同樣撐不住。
  - **血天大陸強度 1.5～3 → 3～8**（2026-10-03，版本 `20261005H`，使用者指定）：一般玩家每隻 12.1 → 29.1 回合、耗血 17% → 108%（天淵戰場 86／945%）；渡劫的主要練功圖，一般配置離線可能撐不住。
  - **血天大陸強度 3～8 → 8～15**（2026-10-04，版本 `20261005Y`，使用者指定，同雷鳴大陸）：config-maps.js 的 `nv2Str`；每小時經驗／靈石照樣由 `nv2TypRoundsPerKill` 自動補償。
  - **九天仙域、太初古礦、上蒼移到第四區**（2026-10-04，版本 `20261005M`，使用者指定）：由無邊海（maps[6]）移到幽冥禁域（maps[4]）最前面；無邊海剩 血天大陸／天淵戰場／星空古路／荒古禁地。
    第四區的分類表（減傷閃避、聲望、熟練度、壽元危險）與第三區相同，數值不變；但第四區在 `DARK_MAP_CATEGORIES`（妖獸本質為暗），三張圖加 `dark: false` 維持原本的本質（elements.js 的 rollMonsterAttrs 檢查 `currentMap.dark !== false`）。
    驗證：三張圖一般玩家每隻回合數／耗血與移動前相同（九天 73.8／594%、太初 179／2533%、上蒼 148／3069%）。
  - **區域改名**（2026-10-04，版本 `20261005L`，使用者指定）：第一區 → **落雲宗周邊**、第二區 → **慕蘭草原**、第三區 → **大晉王朝區域**。
    改了 修仙地圖彈窗（人界地圖右上「地圖列表」開的 #world-map-modal）的按鈕文字、config-maps.js 的 `category`（地圖清單標題，例「慕蘭草原 (高難度戰鬥)」）、config-towns.js 的 worldRegions `name` 與紅點 `label`。分類索引不變。
  - **地圖重整**（2026-10-03，版本 `20261005J`，使用者指定）：
    - **無邊海**：第三區雷鳴大陸之後的 7 張（血天大陸、天淵戰場、星空古路、荒古禁地、九天仙域、太初古礦、上蒼）搬到新分類「無邊海 (渡劫解鎖·高難)」＝`maps[6]`，數值不變；第三區只剩 黑風海域／崑吾山／蠻荒古地／雷鳴大陸。
      ⚠️ 新分類**加在最後**（索引 6）：分類索引被 `monsterAttrsByMapCategory`、`REPUTATION_MAX_BY_MAP_CATEGORY`、`PROF_MAP_MULT`、`LIFESPAN_DANGER_MULT`、`DARK_MAP_CATEGORIES` 使用，各表索引 6 一律同第三區；插在中間會讓第四、五區的索引位移。
      世界地圖的「無邊海」區塊（config-towns.js 的 `worldRegions.wubian`）從「尚未開放」改成 `openMapCategoryModal(6)`；修仙地圖彈窗多一顆「🌊 無邊海」按鈕。
    - **第四區強度 40～80 倍**依地圖排列：不死山 40～50、神墟 50～60、仙陵 60～70、冥界 70～80（`nv2Str`）；**第五區 80～200 倍**：仙界戰場 80～120、萬界戰場 120～160、混沌初界 160～200。
    - **進入條件依排列**：新欄位 `minL`（成長位置＝境界＋(階−1)/10）。第四區 不死山 真仙 1 階／神墟 4 階／仙陵 7 階／冥界 10 階；第五區 仙界戰場 大羅金仙 1 階／萬界戰場 混元大羅金仙 1 階／混沌初界 混沌道祖 1 階（不再能越級）。
      map.js 新增 `getMapMinLevel(item)`、`isBelowMapLevel(item)`；`getMapMinRealm` 也納入 `minL` 的境界；進入檢查、地圖卡片「限制：真仙4階以上」、挑戰模式判定（第 70 節）、讀檔時送回宗門（save.js 的 migrateCurrentMap）都改看等級門檻。等級不夠一樣可以走挑戰模式。
    - 真仙的修煉節奏主圖（realmPacing）原本是冥界（現在真仙 10 階才能進）→ 使用者選 A：改成**不死山**（版本 `20261005K`）。每階經驗照不死山重算 540 億 → 360 億（經驗倍率 6000／9000），升階總時數 150 天不變；
      已在真仙、修為超過新門檻的玩家下次獲得經驗時連續升階（gainExp）。挑戰模式的收益地圖（getMainMapForRealm）也跟著變成不死山。
  靈石、nv2L（境界壓制起點）、進入條件不變。一般玩家在這六張圖掛不住（離線會被送回宗門），定位為強者的高報酬挑戰圖。
  - 使用者選「**升階門檻不變**」＋「**每個境界補一張普通圖**」：第三區最前面新增 黑風海域（合體）、蠻荒古地（大乘）、血天大陸（渡劫）、星空古路（仙人初境）、九天仙域（天仙），
    一般規則（隨玩家階數、1.5～3 倍），經驗與靈石沿用挑戰圖改版前的值（1400／1900／2500／3000／5000；2700／2950／3150／3350／6900）；
    `config-realms.js` 的 `realmPacing` 合體～天仙改指向這五張 → `getRealmStageExp`（依主練功圖 expRate 換算）算出的每階所需經驗與改版前完全相同（實測 合體 4600 萬、大乘 3.2 億、渡劫 12 億、仙人初境 60 億、天仙 200 億）。
    名稱由我取（凡人修仙傳靈界風格），可改；改名時 realmPacing 要一起改。
  - **地圖依經驗排序**（同日，版本 `20261003d`，使用者要求）：config-maps.js 每一區的地圖由經驗低到高排列（同經驗時境界低的在前），第三區因此普通圖、挑戰圖交錯
    （黑風海域 1400、崑吾山 1600、蠻荒古地 1900、雷鳴大陸 2100、血天大陸 2500、天淵戰場 3000、星空古路 3000、荒古禁地 5000、九天仙域 5000、太初古礦 6500、上蒼 8000）。
    地圖都用名稱找，只有 `maps[0].items[0]`（宗門）的位置固定，所以排序不影響存檔。**日後新增地圖照經驗插在對應位置。**
  - ⚠️ 日後改「主要練功圖」的 expRate 會連帶改升階門檻（stats.js 的 `getRealmStageExp`）；要讓某張圖單純變賺，改非主練功圖或另開新圖。
- ⚠️ 2026-09-29 曾試做「鬼谷八荒之後地圖固定 10 階 ×2、二區起妖獸最低攻擊 10～20、戰鬥數字 ×100」，**使用者不要 ×100、要求整批復原**（版本 `20261002y` 已還原成上一版數據）。
  小數字制下最低攻擊 10～20 約等於天南一般玩家氣血（約 69）的 22%／下，妖獸會強 20～40 倍；日後重做時要先和使用者確認做法。
- 修仙地圖視窗頂端「🎯 金丹適合練功：上古遺跡」；地圖卡片「🎯 適合境界：…」，符合時標題加「⭐ 推薦練功」。
- ⚠️ 使用者表示**之後再細分區域**：目前煉虛～渡劫只有鬼谷八荒、真仙有四張，且新制 `nv2L`（第 52 節）與 `suit` 不一致（例：荒古禁地 nv2L 7 ≈ 合體，suit 是仙人初境），分區時一併整理。

## 55. 鍛造圖紙（Lv.1500 以上裝備，2026-09-28，版本 `20260929s`）

- **問題**：裝備等級最高 Lv.1000（約大乘就到頂），人物等級上限一路到 10000，新制武器攻擊在大乘後不再成長。
- ⚠️ 2026-10-03 起圖紙武器另乘 `NV2.blueprintWeaponMult`（Lv.1500 ×1.25 … Lv.10000 ×3.4），每檔總攻擊約 +18～21%（原本每檔只 ×1.05）；
  圖紙防具每件加氣血 %（`NV2.blueprintArmorHpPct`，全身橙色 +20：Lv.1500 ×1.2 … Lv.10000 ×3.4），見第 52 節最後「後期增益上限與圖紙武器」。
- **使用者選定**：鍛造閣新增 **Lv.1500、2500、3500、5000、6500、8000、10000** 七檔（對上渡劫～混沌道祖各境界的等級上限，`BLUEPRINT_LEVELS`），
  **只能用圖紙鍛造**；圖紙**分部位、分等級**（劍的 1500 等圖紙只能打 1500 等的劍）；未來要做**玩家交易、離線寄賣**。Lv.1000 以下維持靈石鍛造，千寶閣／奪寶／秘境掉落仍最高 Lv.1000（`EQUIP_LEVELS` 不變）。
- **鍛造**（equipment.js）：`renderForgeLevelSelect` 在一般等級後面列出「目前所選部位」持有圖紙的檔次（「📜 2500 等・劍圖紙鍛造（持有 N 張）」），部位下拉 `onchange` 會重新列；
  `forgeEquipment` 遇到圖紙檔：每件消耗 1 張該部位該等級圖紙＋`BLUEPRINT_FORGE_COST` 10 萬靈石，批次上限 = min(圖紙、靈石、背包)；不受宗門階段限制；品質照原本機率；清單用至高宗門（`getCraftChannel`）。
- **存檔**：`player.blueprints = { "劍_1500": 張數 }`（`blueprintKey(slot, level)`，用到時才建立）。之後做交易／寄賣時以此 key 當道具識別碼。
  `getBlueprintCount(slot, level)`、`useBlueprints`、`listBlueprints()`（背包「📜 鍛造圖紙」卡片、鍛造閣提示用）。
- **掉落** `grantBlueprint(chance, 來源文字)`：等級 = 不超過人物等級的最高一檔（未滿 1500 給 1500 檔先存著），部位從可鍛造的 17 部位平均隨機；`BLUEPRINT_DROPS`：
  - 天榜懸賞伏誅 30%（bounty.js 的 `endBountyDuel`）
  - 死守天南城首領波（每 10 波）10% ＋ 波數 × 0.5%（第 100 波 60%，defense.js 的 `grantWave`；結算畫面列「📜 鍛造圖紙 ×N」）
  - 鎮魔塔擊敗 BOSS 30% × 問答倍率，最多 75%（zhenmo.js 的 `grantRewards`；結算畫面與日誌）
  - ⚠️ 圖紙分 17 個部位，湊齊一整套要很多張；掉率是預設值，上線後看玩家取得速度再調。
  - **圖紙鍛造橙色 20%**（2026-10-06，版本 `20261005CH`，使用者：「橙色製作率提高成 20%」）：品質機率改成設定表，config-equipment.js 的 `FORGE_QUALITY_ODDS`（一般靈石鍛造，白綠藍紫橙 35／30／20／10／5%，不變）、
    `BLUEPRINT_QUALITY_ODDS`（圖紙 20／30／20／10／20%，多出的 15% 從白色扣）；`forgeOneEquipment(name, level, cost, odds)` 依表抽品質，`forgeEquipment` 圖紙檔傳圖紙表。遠古／太古照舊（橙色中 2%／0.2%）。
    同日再調（版本 `20261005CI`，使用者：「製作機率調整 白30 綠25 藍20 紫15 橙10」）：`BLUEPRINT_QUALITY_ODDS` 改成 30／25／20／15／10%（一般鍛造不變）。
  - **2026-10-06 調整**（版本 `20261005CC`，使用者：「5000 等以下圖紙掉落機率增加」「凡界只能打到 3000 等以內圖紙」；加倍幅度使用者未指定，先用 ×2）：
    config-equipment.js 新增 `BLUEPRINT_DROP_RULES = { lowMaxLevel: 5000, lowMult: 2, mortalMaxLevel: 3000 }`。
    `getBlueprintDropLevel()`：不在靈界（`isInLingjie()` 為否）時只取 ≤ 3000 的檔次（最高 2500 檔）；在靈界照人物等級。
    `grantBlueprint()` 先決定等級，等級 ≤ 5000（1500／2500／3500／5000 檔）時機率 × 2、最高 100%（天榜 60%、守城首領波 20%＋波數 ×1%、鎮魔塔 60%×問答倍率，上限 75% 再 ×2）；6500 以上不變。
- **新制武器成長**：`NV2.blueprintWeaponL`（1500 → 11、2500 → 12、3500 → 13、5000 → 14、6500 → 15、8000 → 15.5、10000 → 16），`nv2WeaponAtkOf` 優先查表。
  藍色武器攻擊：Lv.1000 10.18 → 1500 10.69 → 2500 11.22 → 5000 12.37 → 10000 13.64。「一般玩家」（怪物強度基準）仍假設武器最多 L 10，圖紙裝備是後期額外戰力，怪物不變強。
  理論最高戰力約 ×1.3（仍在雲端上限 400 ＋ 境界 × 40 內）。
- 驗證（本機）：人物 Lv.2600 掉 2500 檔、200 次掉落涵蓋 17 部位；劍 2500 圖紙 3 張「最高」打出 3 把 Lv.2500 劍、扣 30 萬靈石、圖紙歸 0；選「頭」只列頭的 1500 檔；背包卡片正常；Console 無錯誤。

### 新增合體／大乘／渡劫地圖（2026-09-28，版本 `20260929t`）
- 使用者要求：原本煉虛～渡劫都只有鬼谷八荒。「三、上古禁區」最前面新增三張（名稱取自凡人修仙傳靈界篇，可再改）：

  | 地圖 | 適合 | 解鎖 | 經驗倍率 | 靈石／隻 | 新制 nv2L |
  |---|---|---|---|---|---|
  | 崑吾山 | 合體 | 合體 | 1400 | 2700 | 7 |
  | 雷鳴大陸 | 大乘 | 大乘 | 1900 | 2950 | 8 |
  | 天淵戰場 | 渡劫 | 渡劫 | 2500 | 3150 | 9 |

  （四維門檻同上古禁區：舊制 2000、新制 100；沒有縮圖，卡片只顯示文字。）鬼谷八荒的 `suit` 改為只適合煉虛。
- **修煉節奏表**（config-realms.js）：合體／大乘／渡劫的主要地圖改為這三張，**目標時數不變**（2／10／30 天），所以每階經驗門檻依新地圖經驗倍率提高
  （合體 3,300 萬 → 4,600 萬、大乘 1.7 億 → 3.2 億、渡劫 5 億 → 12 億，第 26 節表格已更新）。⚠️ 正在這三個境界的玩家，修為進度百分比會下降，但到新地圖練的速度相應變快。
  死守天南城靈石獎勵依 `realmPacing` 地圖計算，合體～渡劫強度的波次靈石隨之略增。
- **新制 nv2L 對齊 suit**（原本荒古禁地 7、太初古礦 8、上蒼 9 被新地圖取代）：荒古 10、太初 10.5、上蒼 11、幽冥禁域四張 12／12.3／12.6／12.9、仙界戰場 13.5、萬界戰場 14.5、混沌初界 15.5。
  這幾張的妖獸因此比之前強（多約 1～3 個境界），對應它們原本標示的適合境界。
- 驗證（本機，新制、藍色武器、宗門 +50%、不吃丹藥 1 小時）：鬼谷八荒 煉虛 1 階 最低 58%、崑吾山 合體 65%、雷鳴大陸 大乘 59%、天淵戰場 渡劫 44%、荒古禁地 仙人 44%，皆無陣亡，經驗為節奏的 1.12～1.24 倍；
  大乘去天淵戰場最低 0%（越級門檻）；大乘推薦地圖顯示雷鳴大陸；Console 無錯誤。
- **圖紙器錄**（2026-09-28，版本 `20260929v`，使用者同意）：天磯錄新增「📐 圖紙器錄」分頁（codex.js 的 `renderCodexBlueprints`），7 檔 × 17 部位共 119 格。
  - 紀錄 `player.blueprintCodex = { "劍_1500": [取得過的品級] }`：`recordGearCollected` 內呼叫 `recordBlueprintCollected`，所以圖紙鍛造、進化白金、讀舊存檔補記都會點亮（只記 `BLUEPRINT_LEVELS` 等級、可鍛造部位）。
  - 畫面：每檔一列「1500 等 17/17」＋ 17 格（點亮顯示部位名、顏色＝取得過的最高品級；未點亮「？」），頂端「已點亮 N / 119 格｜白金 N」。
    品質色套在格子內層的 `<span class="quality-…">`（白金是漸層文字，和格子背景放在同一個元素會變成空白）；CSS `.bp-row／.bp-cells／.bp-cell`。
  - 稱號 7 個（config-titles.js，條件 `bpCount`／`bpTier`／`bpPlatinum`，我擬的名稱與加成，可再改）：
    天工初成（點亮 17 格，四維 +1%）、渡劫神兵（1500 等全收，攻擊 +1%）、百工造化（60 格，氣血 +2%）、真仙寶庫（5000 等全收，攻擊 +2%）、
    道祖神兵（10000 等全收，四維 +2%）、萬器天工（119 格全收，攻擊 +3%）、先天道器師（白金 17 格，技能傷害 +3%）。
  - 驗證（本機）：1500 等 17 部位各打一件 → 17/17、自動獲得「天工初成」「渡劫神兵」；把劍進化成白金 → 該格記錄 綠色＋白金；各品級顏色與白金格顯示正常；Console 無錯誤。

## 56. 仙府信箱與兌換碼（GM 發放獎勵；`config-mailbox.js`、`mailbox.js`、gm.html；2026-09-28，版本 `20260929w`）

- **目的**：使用者問「能不能用 GM 權限發放獎勵」，選擇**信箱（單人＋全服）與兌換碼都做**。存檔只在玩家瀏覽器，GM 不能直接改存檔，所以改成 GM 把獎勵放到雲端、玩家的遊戲自己來領。
- **雲端集合**（`tools/firestore.rules`）：
  - `mail/{自動 id}`：`{ to: 'all' 或 uid, title, body, rewards, expiresAt, createdBy, createdAt }`；只有 GM 能寫；玩家只能讀寄給全服或自己的信。
  - `mailClaims/{uid}_{mailId}`：`{ uid, mailId, at }`；玩家領取時建立，**只能建立一次**（已存在時 set 會變成 update 被拒絕），不能改、不能刪；信件須存在、寄給全服或自己、未過期，被封鎖的帳號不能領。
  - `codes/{代碼}`：`{ title, rewards, expiresAt, … }`；玩家知道代碼才能 `get`，不能列出全部；只有 GM 能寫。
  - `codeClaims/{uid}_{代碼}`：同上，每組代碼每個帳號一次、代碼須存在且未過期。
- **獎勵格式** `rewards`：數量型 `MAIL_REWARD_FIELDS`（靈石、七彩補天石、星允鐵、功德、聲望、洗髓丹、伐骨丹、化神靈果、破障丹；星允鐵直接加數量，不套「尋鐵」）、
  `blueprints: { "劍_1500": 張數 }`、`servants: { "傳說": 人數 }`（品質同 servantQualities，產生格式同野外救出的僕從）。每項上限 `MAIL_REWARD_MAX`（防手誤）。
  凝元丹是煉好直接服用、背包沒有此道具，所以不能寄。
- **遊戲端**（mailbox.js，共用戰力榜的 Firebase 連線 `initLeaderboardBackend`，戰力榜未開通時不連網）：
  - `startMailboxSync()`（main.js 的 `initGame`）：進遊戲約 20 秒後、之後每 `MAIL_REFRESH_MS` 2 小時（2026-10-04 前為 30 分鐘）`refreshMailbox()`：查 `where('to', 'in', ['all', uid])`，過濾過期與已領
    （本機快取 `player.mailClaimed`；沒有快取的再各讀一次 `mailClaims` 確認），有新信寫日誌提示。
  - 入口：⚙️ 設定視窗「📮 仙府信箱（N 封待領）」→ `#mailbox-modal`：信件卡片（標題、內文、獎勵、全服／個人、期限、🎁 領取）、🔄 重新整理、🎟️ 兌換碼輸入框。
  - 領取 `claimMail(id)`／兌換 `redeemCode()`：先檢查僕從空位（`MAX_SERVANTS`）→ 建立雲端領取紀錄 → 成功才 `grantMailRewards` 加進存檔、寫日誌（道具分頁）並立即存檔；
    被拒（permission-denied）視為已領過／已過期。兌換碼自動轉大寫、去空白，格式英數與 - _、3～40 字。其他玩家的文字一律經 `lbEscape` 才插入畫面。
- **GM 端**（gm.html「📮 發放獎勵」分頁）：選「仙府信件」或「兌換碼」；信件對象為全服或指定 uid（戰力榜每列多一個「📮」按鈕自動帶入並顯示道號）；
  標題、內文、有效天數（0 = 永久）、各項數量、圖紙（部位＋等級＋張數）、僕從（品質＋人數），即時預覽；送出前 confirm。
  一鍵預設 `MAIL_PRESETS`：**「🎁 100 萬靈石＋傳說僕從一名」**（使用者指定，標題「仙府賀禮」）。下方列出已寄信件（可刪除，未領的就領不到）與兌換碼（可刪除、「統計」已兌換人數）。
  gm.html 沒有裝備與僕從設定，圖紙部位／等級與僕從品質清單寫在 config-mailbox.js（`MAIL_BLUEPRINT_SLOTS`／`MAIL_BLUEPRINT_LEVELS`／`MAIL_SERVANT_QUALITIES`），改那邊要一起改。
- **限制**：玩家換瀏覽器、清資料、無痕視窗會變成新 uid，收不到寄給舊 uid 的個人信（全服信與兌換碼仍可領）；從沒上過戰力榜的人沒有 uid 可選。
  獎勵由玩家端加進存檔（純前端遊戲的本質），信箱是「方便發獎勵」，不是防作弊。讀取額度：每位在線玩家每 30 分鐘約「信件數」次讀取，舊信件記得刪除。
  - **節省讀取額度**（2026-10-04 版本 `20261005X`，Firebase 額度用完後）：定時讀信只在分頁在前景時執行（`document.hidden` 時略過，切回前景且超過 `MAIL_REFRESH_MS` 再補讀）；
    沒領的信每次開遊戲只到雲端查一次領取紀錄（`mbCheckedIds`），不再每 30 分鐘重讀。
- **隔日自動刪除**（2026-10-04，版本 `20261005AB`，使用者要求）：信件寄出後 `MAIL_LIFETIME_HOURS` 24 小時過期（gm.html 寄信一律寫 `expiresAt`＝寄出＋24 小時，「有效天數」只用在兌換碼；舊的永久信以 `createdAt`＋24 小時計）。
  - 遊戲 `mailExpireAt(m)`／`isMailExpired(m)`：過期的信不顯示，並**順手刪除**（每封每次開遊戲試一次，`mbDeletedIds`）；信件卡片顯示「M/D HH:MM 前領取（逾時自動刪除）」。
  - 規則 `mail` 的 delete：管理者，或「寄給自己或全服、已過期」的信任何玩家都能刪（**要到 Firebase 主控台發布新版規則才生效**；未發布前遊戲刪除被拒、忽略）。
  - gm.html `reloadRewards()`（開「發放獎勵」分頁、寄信後）：過期信件自動刪除並寫日誌。
- **上線順序**：① 主控台發布新版 `tools/firestore.rules`（含第 52 節的新戰力上限與本節的信箱規則）→ ② push → ③ GM 後台寄信或建兌換碼。規則未發布時，信箱顯示「信箱尚未開放」、兌換顯示「兌換碼功能尚未開放」，不影響遊戲。
- 驗證（本機）：預設禮包發放 → 靈石 +100 萬、多一名傳說僕從（效率 ×3）；圖紙、補天石、星允鐵入帳；僕從小屋滿時擋下並提示；信件卡片與內文跳脫正常、設定按鈕顯示「1 封待領」；
  連線雲端（規則未發布）顯示「信箱尚未開放」、兌換碼格式檢查與「尚未開放」提示正常；gm.html 分頁、預設、圖紙加入、「📮」帶入 uid 正常；Console 無錯誤。**寫入雲端與規則需發布後線上實測**。
- **先天裝備（太古／遠古／一般先天）也能寄**（2026-10-09，版本 `20261005CV`，`MAIL_SCHEMA_VERSION` 4）：`rewards.gear = { "5000_2": 件數 }`，key＝等級_種類（`MAIL_PRIMAL_GEAR_KINDS`：2 先天・太古、1 先天・遠古、0 一般先天；
  只寫等級＝太古），等級只認 `MAIL_PRIMAL_GEAR_LEVELS`（1500／2500／3500／5000），不認得的等級／種類忽略，每項最多 20 件（`mbGearEntries`）；
  部位隨機，由 gear.js 的 `createPrimalPlatinumGear(level, ancient)` 產生（第 67 節）。`checkMailRewardSpace` 多檢查背包裝備空位（`MAX_EQUIP_INVENTORY`）。目前只有 gm.html 世界 Boss 分頁的「名次獎勵」會寄（第 75 節），一般寄信表單沒有這個欄位。
- **讀信快取**（2026-10-09，版本 `20261005CZ`，節省讀取額度）：localStorage `MAIL_CACHE_KEY`（`xiuxian_mail_cache`）＝`{ uid, at, pending, checked }`，**不存信件內容**（獎勵一律以雲端為準）。
  - `mbCheckedIds`（確認過還沒領的信）跨重新整理保留，不再每次開遊戲重查領取紀錄。
  - 開遊戲第一次讀信 `refreshMailbox('startup')`：上次讀信在 `MAIL_STARTUP_CACHE_MS`（30 分鐘）內、而且當時沒有待領的信 → 略過（玩家狂按重新整理不再每次讀信）。打開信箱（`refreshMailbox(false)`）3 分鐘（`LEADERBOARD_AUTO_REFRESH_MS`）內讀過不重讀，按「🔄 重新整理」照樣讀。
- **GM 權限也能寄**（2026-10-04，版本 `20261005AV`）：`rewards.gm`（true 授予／false 撤銷），只限寄給指定 uid 的信，見第 74 節「GM 測試人物」。
- **先天資質也能寄**（2026-09-28，版本 `20260929x`，使用者要求）：`rewards.aptitude = { root: { group, id? 或 elems? }, physique: id }`。
  - GM：「⛩️ 先天靈根」選單列出全部 48 種（有 pick 的組逐一列、五行組合的組列出所有組合：天 5、雙 10、三 10、四 5、五 1），「⛩️ 先天體質」列出 24 種；gm.html 因此多載入 `config-aptitude.js`（只有常數）。
  - 玩家（aptitude.js 的 `offerAptitudeGift`）：**已測過資質** → 逐項跳出「原本 vs 仙府賜予」，按「改用賜予的／保留原本」（沿用重測的 `finishAptitudeReroll`，佇列 `aptitudeGiftQueue` 靈根、體質各問一次，日誌「📮 接受仙府賜予」）；
    **還沒入宗測試** → 存到 `player.aptitudeGift`，測試時該部分直接採用、不擲骰，用完清掉。
  - 驗證（本機）：GM 預覽「⛩️靈根【火天靈根】、⛩️體質【先天劍體】」；已測過的玩家依序選擇後正確套用；未測試的玩家測試結果即為賜予的靈根與體質；Console 無錯誤。

### 2026-09-28 線上回報修正（版本 `20260929y`）
- **經驗過高**（第 52 節）：玩家回報「升得太快」、線上有人衝到 Lv.1080。實測新制每隻收益放大約 8 倍補償「要打多下」，但裝備好的人殺得快、**每小時收益沒有上限**
  （天南・元嬰：一般 1.22 倍、白金 +20＋增益 +200%＋職業滿階 3.92 倍）。新增 `nv2RewardSpeedAdj(map)`（numeric.js）：每波開打時用 `nv2EstimateIdleCombat` 估自己的每隻回合數，
  相對一般玩家的收益速度超過 `NV2.rewardSpeedCap`（1.0）的部分，每隻的經驗／靈石／聲望／熟練度等比例打折（combat.js 的 `waveRewardAdj`，乘在 `getKillRewardMult`）。
  **2026-10-05 修正：改用實測速度**（版本 `20261005BU`，使用者：「修掉，讓仙人以後練功速度下降」）：原本「自己的每隻回合數」只用 `nv2EstimateIdleCombat().hits`（單體估算），沒算群攻技能、出戰靈寵、夥伴、神器，
  強力配置實戰快 3～6 倍，收益超過上限（玩家「糊道友」實測 40 倍，第 72 節）。combat.js 每波結束記 `recordObservedRoundsPerKill(回合數 ÷ 擊殺數)`（`waveObs`，同一張圖指數平均 0.7／0.3，換圖重來，不存檔），
  下一波開打 `nv2RewardSpeedAdj(map, getObservedRoundsPerKill())` 取估算與實測較快的一個。一般配置實測不比估算快，不受影響；離線／背景結算原本就以一般玩家效率為上限，不變。
  驗證：秒殺怪物但估算 20 回合的情境，30 分鐘每秒 0.154 隻、每隻倍率 4.20 → 2.17（每小時收益次數 2270 → 1200＝上限）；Console 無錯誤。
  實測修正後：一般 0.93、中等 1.43、強力 1.36 倍。離線收益本來就以一般玩家為上限（`rateMult ≤ 1`），不受影響。
  註：線上「鹽焗雞腳筋」大乘 6 階 Lv.1080 超過新制大乘上限 1000，應是改版前舊制練到的等級（老玩家等級不降）；「韓立 大乘 1 階 Lv.1000」疑為本機測試角色上傳，清榜時一併清除。
  之後本機測試先把 `isLeaderboardConfigured` 改成回傳 false，避免測試角色上傳到線上榜。
- **GM 贈送靈根體質「領了沒效果」**（第 56 節）：目前版本流程正常（實測信箱領取 → 跳出「📮 仙府賜予」比較 → 套用）。推測原因是玩家用**還沒支援先天資質的舊版遊戲**（推上後已開著的分頁或瀏覽器快取）領取：
  舊版看不懂 `aptitude`，領取紀錄照樣建立卻沒給獎勵，那封信也不能再領（需 GM 重寄）；或玩家尚未入宗測試（賜予先存著）。修正：
  - `MAIL_SCHEMA_VERSION`（config-mailbox.js，目前 2）：GM 寄信／建兌換碼時寫入 `v`（含先天資質為 2，其餘 1）；遊戲 `isMailTooNew()` 發現信件比自己新就擋下並提示「請重新整理（Ctrl＋F5）」，**不建立領取紀錄**，信件保留。新增獎勵種類時要 +1。
  - 人物面板「資質」在有未生效的賜予時顯示「已有仙府賜予，測試時生效」。
  - gm.html 載入的 `data/*.js` 全部加上 `?v=`（原本沒有，GitHub Pages 快取時 GM 頁可能還在用舊設定檔）；**發佈新版時 gm.html 的 `?v=` 也要一起改**（第 30 節）。

## 57. 修仙留言板（`msgboard.js`、gm.html「💬 留言板」；2026-09-28，版本 `20260929z`）

- **更名「修仙卡拉OK歡唱區」**（2026-10-06，版本 `20261005CB`，使用者：「修仙留言板更名 修仙卡拉ok歡唱區」）：只改玩家看得到的名稱，功能、程式名稱（`msgboard.js`、`lbTab = 'board'`、`MSGBOARD_*`）與 Firestore 資料不變。
  視窗標題（leaderboard.js）與設定視窗按鈕＝「🎤 修仙卡拉OK歡唱區」；大道石碑分頁＝「🎤 歡唱區」；主頁左下按鈕（手機 index.html、PC config-home-pc.js 的 `mail`）蓋字＝「歡唱區」（按鈕只放得下 3 個字）；未開放提示、aria-label 同步。gm.html 後台仍叫「💬 留言板」。

- 使用者要「玩家留言對話框」，選擇**留言板**（不是即時聊天）：打開時才讀最新 `MSGBOARD_SHOW_N` 50 則，不即時推送，讀取額度只在開啟時用掉 50 次。
- **入口**：大道石碑（戰力榜視窗）第三個分頁「💬 留言板」（leaderboard.js 的 `lbTab = 'board'`，`applyLeaderboardTab`／`refreshLeaderboard`／`renderLeaderboard` 分流到 `fetchMsgBoard`／`msgBoardHtml`）；⚙️ 設定視窗「💬 修仙留言板」按鈕直接開這個分頁。
  上方輸入框（字數計數、📨 留言），下方留言列表（道號、境界階數、多久前、內容；自己的留言高亮並有 ✕ 可刪）。重繪時保留正在輸入的內容。
- **雲端**（config-leaderboard.js 的 `MSGBOARD_*`、tools/firestore.rules）：
  - `board/{自動 id}`：`{ uid, name, realm, stage, text, createdAt }`；所有人可讀（單次 ≤ 50）；本人或 GM 可刪；不能修改；被封鎖（banned）或禁言（muted）不能建立；文字 1～100 字。
  - `boardLimit/{uid}`：`{ lastAt }`。留言時同一個批次把它更新成現在，規則要求 `getAfter(boardLimit).lastAt == request.time`，而更新本身要距上次 > 60 秒 → **每人每 60 秒最多一則由雲端強制**。
  - `muted/{uid}`：GM 禁言名單（玩家只能查自己）。
- **過濾**：送出前 `filterBoardText` 把換行壓成空白、`MSGBOARD_BLOCKED_WORDS` 換成＊、截到 100 字（玩家端，可被繞過；惡意留言靠 GM 刪除與禁言）。其他玩家的道號與內容一律 `lbEscape`。
- **GM**（gm.html「💬 留言板」，分頁 id `tab-msgboard`，因為 `tab-board` 是戰力榜）：最新 200 則（刪除、禁言；禁言時可選擇一併刪除該則）、禁言名單（解除禁言）。
- 驗證（本機，模擬雲端）：留言送出（「白癡」換成＊＊、換行合併）、列表顯示與 HTML 跳脫、自己的留言可刪、60 秒冷卻提示；gm.html 分頁切換正常；Console 無錯誤。**雲端規則需發布後線上實測**。

- **留言 8 小時後自動刪除**（2026-10-04，版本 `20261005AG`，使用者要求）：`MSGBOARD_LIFETIME_HOURS` 8。`fetchMsgBoard` 只讀 8 小時內的留言（`where createdAt > 現在−8h`＋同欄位排序，不需另建索引）；
  每位玩家每 `MSGBOARD_CLEANUP_GAP_MS`（30 分鐘）最多順手刪 10 則過期留言；規則 `board` 的 delete 增加「超過 28800 秒的留言任何登入者都能刪」（**要發布新版規則才生效**）；
  gm.html 開「💬 留言板」分頁時自動刪除過期留言。驗證：模擬器規則 6 項、遊戲接模擬器（9 小時前 3 則被隱藏並刪除、1 小時前的保留）。

- **留言板彙整文件＋信箱快取（2026-10-09，版本 `20261005CZ`，使用者：「網路儲存空間讀取數一直爆滿」→ 選「改程式減少讀取＋留言板改單一彙整文件，不付費」）**：
  - **彙整文件** `boardFeed/latest = { msgs: [{ id, uid, name, realm, stage, text, createdAt }] }`（新的在前，最多 `MSGBOARD_SHOW_N` 30 則；config-leaderboard.js 的 `MSGBOARD_FEED_COLLECTION`／`MSGBOARD_FEED_DOC`）。
    打開留言板 `fetchMsgBoard` 只讀這 1 份文件（原本 30 次），顯示時濾掉 8 小時前的；文件不存在或規則還沒發布（permission-denied）時退回舊的 `board` 集合查詢。
  - **留言** `postBoardMessage`：一筆交易（`runTransaction`，多 1 次讀取）寫 `board/{id}`＋`boardLimit/{uid}`＋彙整文件；彙整裡的 `createdAt` 用 `gameNow()` 的用戶端時間（陣列裡不能放 serverTimestamp）。
    交易被拒（規則未發布、冷卻、禁言）就改用舊的批次寫入再試一次。送出後直接把自己的留言放到列表最上面，不再重讀。
  - **刪自己的留言** `deleteBoardMessage`：同一筆交易刪 `board/{id}` 並把彙整文件裡那一則拿掉；被拒時只刪留言。
  - **省掉的讀取**：玩家端「每 30 分鐘順手清 10 則過期留言」移除（`MSGBOARD_CLEANUP_GAP_MS` 刪除，過期留言由 gm.html 開分頁時清）；禁言狀態 `mbBoardMuted` 不再一打開就查，只在留言被拒時查 1 次。
  - **規則**（tools/firestore.rules 的 `boardFeed`、`feedEntryOk`）：所有人可 get；玩家新增時 msgs 長度＝舊的 +1（滿 30 維持 30）、`msgs[1:]` 必須照抄舊的前段、`msgs[0]` 必須和同一交易建立的 `board/{id}`（`getAfter`，`createdAt == request.time`）內容一致且是自己、時間誤差 ≤ 10 分鐘；
    玩家刪除時只能拿掉 1 則自己的；GM 任意改寫。**要到 Firebase 主控台貼上發布才生效**，未發布前遊戲自動用舊做法。模擬器實測 14 項（新增、冷卻、竄改內容／刪舊留言／改別人的／時間偏差、滿 30 則捲動、刪自己的、刪別人的、禁言）全部符合。
  - **gm.html**：`reloadBoardMsgs()`（開「💬 留言板」、刪除、禁言後都會跑）用讀到的 200 則重建彙整文件（不多讀），所以 GM 刪的留言也會從玩家畫面消失；舊版遊戲（快取未更新）只寫 `board` 的留言也會在這時補進彙整。
  - **信箱**（第 56 節）見該節「讀信快取」。

## 58. 寄售拍賣＋主頁「留言板」入口（`market.js`；2026-09-28，版本 `20260930b`）
- **Firebase 讀取額度用完後的節省措施**（2026-10-04，版本 `20261005Z`；使用者 Firebase 主控台：讀取 14 萬／日、免費 5 萬，寫入 1,785、刪除 575 都很低）：
  - 使用者指定：寄售每人同時 1 件（`MARKET_MAX_ACTIVE`）、清單數量 30（`MARKET_SHOW_N`、`MSGBOARD_SHOW_N`、`LEADERBOARD_TOP_N`）。
  - 大道石碑重開：同一分頁 `LEADERBOARD_AUTO_REFRESH_MS` 3 分鐘內讀過就直接顯示（`lbTabFetchedAt`），「重新整理」冷卻 10 → 30 秒；寄售上架／出價／領取後照樣重讀。
  - 信箱定時讀取 30 分鐘 → 2 小時（`MAIL_REFRESH_MS`，背景分頁不讀，第 56 節）。
  - gm.html 自動巡檢：`LEADERBOARD_RANKS_REMOVED` 時不執行（原本每次讀整個戰力榜兩次＋守城資料）。
  - tools/firestore.rules：`mail`、`market` list、`marketRefunds` 的 `isAdmin()`（要多讀 1 次 admins）移到條件最後；**要到 Firebase 主控台貼上發布才生效**。

- **主頁左下角**：背景圖上的「郵件」按鈕（原本「興建中」）改為 `openLeaderboardModal('board')`，用 `.nav-label-cover.stage-label-cover` 蓋上「留言板」字樣；
  PC 版 `config-home-pc.js` 的 `mail` 按鈕同樣改動作，新增 `cover` 欄位（home-ui.js 產生蓋字）。大道石碑分頁改成 2×2 排列（`.lb-tabs` grid）。
- **使用者選定規則**：可寄售 鍛造圖紙、背包裝備、材料（星允鐵、七彩補天石、異火碎片）、珍貴道具（洗髓丹、伐骨丹、化神靈果、破障丹）；**出價先扣、被超過退回**；賣家選 **12／24／48 小時**；**成交抽 5%**。
- **畫面**（大道石碑第四個分頁「🏪 寄售」，`marketHtml`）：持有靈石與規則說明 → 「📋 我的寄售與待處理」（出價被超過→領回、得標→領取物品、賣出→領取靈石、流標或寄售中未有人出價→下架領回、寄售中目前價）
  → 「📦 我要寄售」（圖紙／裝備／材料／道具分類、選物品、數量、起標價、時間）→ 拍賣中清單（名稱、裝備卡片、賣家、目前價與出價者、剩餘時間、出價框預填最低可出價）。
- **雲端**（config-leaderboard.js 的 `MARKET_*`、tools/firestore.rules）：
  - `market/{id}`：`{ seller, sellerName, kind, item, label, startPrice, bid, bidder, bidderName, bidCount, createdAt, endsAt }`。`item`：圖紙 `{kind:'blueprint', key:"劍_1500", n}`、裝備 `{kind:'equip', eq:整件裝備}`、數量型 `{kind, key:欄位, n}`。
    上架：賣家＝自己、無出價、結束時間 12～48 小時。**出價**（transaction）：不是賣家、不是目前最高者、未結束；只能改 bid／bidder／bidderName／bidCount／endsAt；bid ≥ 起標價、≥ 原價 +1 且 ≥ 原價 × 1.05；
    最後 5 分鐘可把 endsAt 延到「現在 + 5 分鐘」（規則容許 6 分鐘誤差）；有前一位出價者時，同一交易必須寫好他的退款單（`existsAfter`）。
    刪除：沒人出價時賣家可刪（＝下架領回，結標前後皆可）；成交且兩邊都領完時賣家或得標者可刪；GM 可刪。
  - `marketRefunds/{id}_{被超過時的 bidCount}`：`{ uid, amount, listingId, label, at }`，只能在出價交易中為前一位出價者、以他的出價金額建立；本人刪除＝領回靈石。
  - `marketClaims/{id}_item`／`{id}_coins`：結標後得標者領物品、賣家領 `floor(成交價 × 95%)`；每種只能建立一次。本機快取 `player.marketClaimed` 避免重複顯示；兩邊都領完時順手刪除拍賣品。
- **物品進出**：上架時 `mkTakeItem` 從存檔扣除（鎖定中的裝備不能上架；穿在身上的要先卸下），上架失敗或取消就放回；領取 `mkGiveItem`（裝備換新 id、解除鎖定、記入天磯錄與圖紙器錄；背包裝備滿時先擋下）。
  出價成功才扣靈石；每人同時最多寄售 `MARKET_MAX_ACTIVE` 1 件（玩家端檢查；2026-10-04 由 5 改 1）。
- **限制**：物品與靈石在玩家端加減（純前端遊戲），改存檔的人本來就能自己加；雲端規則保證每一步只能領一次、出價規則正確。GM 目前只能在 Firebase 主控台刪除拍賣品，
  **有人出價的拍賣品被刪時，出價者的靈石不會自動退回**（之後若要 GM 強制下架，需要加「GM 建立退款單」的規則與後台按鈕）。
- 驗證（本機，模擬雲端）：上架圖紙 ×2（存檔扣 2）→ A 出價 1000（扣靈石）→ B 出 1020 被擋「至少 1,050」→ B 出 1100 → A 的退款單 1000、領回 → 結標後 B 領到圖紙 ×2、重複領取被擋 → 賣家領 1,045（95%）→ 兩邊領完拍賣品自動刪除；
  裝備寄售卡片正常；Console 無錯誤。**雲端規則需發布後線上實測**。
- **成功提示**（2026-09-28，版本 `20260930j`，玩家要求「寄售得標加入得標成功提示」；用 ui.js 的 `showToast`，見第 9 節）：出價成功 →「✅ 出價成功」；打開寄售分頁時 `fetchMarket()` 呼叫 `notifyMarketResults()`，
  已結束且自己得標、還沒領的 →「🎉 得標成功（到待處理領取）」＋日誌；自己的寄售品有人得標且已結束 →「💰 寄售成交」。每筆只提示一次（`player.marketNotified`，最多記 200 筆）。
  按領取時再跳「🎉 得標成功：xxx 已入袋」／「💰 寄售成交，入帳 N 靈石」。**只在打開寄售分頁時檢查**（不額外定時讀雲端，省讀取次數）。
- **修正：裝備無法上架**（2026-09-28，版本 `20260930k`，玩家手機上架 Lv.1000 橙色玄女耳墜出現「連線失敗」）：裝備隨機詞條 `eq.subs` 是 `[[屬性, 數值], …]` 巢狀陣列，**Firestore 不支援巢狀陣列**，寫入在送出前就被拒絕（`invalid-argument`），而舊版把所有非權限錯誤都顯示成「連線失敗」。
  改為寄售品的裝備存成 JSON 字串 `item.eqJson`（`mkTakeItem`），讀取一律經 `mkItemEq(item)`（相容舊格式 `item.eq`）；規則只檢查 `item is map`，不用改。上架失敗訊息改為附上錯誤代碼。本機驗證：舊格式 → invalid-argument、新格式通過用戶端驗證，取回後 subs 完整。
  **日後任何寫進 Firestore 的遊戲物件（裝備、存檔片段）都要注意巢狀陣列，最簡單是存成 JSON 字串。**
- **修正：寄售無法出價**（2026-10-01，版本 `20261004l`～`n`，使用者問「寄賣行商品無法出價原因」）。查到兩個原因：
  1. **瀏覽器內建 `confirm()`／`alert()` 不顯示**：Claude 預覽面板（console：「Page dialog suppressed… confirm() returned false」）與 LINE／FB 等 App 內建瀏覽器會擋掉，
     `confirm` 直接回傳 false＝按了取消，出價靜靜結束。→ ui.js 新增遊戲內對話框 `gameConfirm(msg)`（回傳 Promise<boolean>，要 await）／`gameAlert(msg)`（不暫停程式），`#game-dialog` 動態建立、z-index 100001（index.html CSS）；
     - **全面改用遊戲內對話框**（2026-10-04，版本 `20261005AC`，使用者要求「檢查是否有 BUG」時發現）：data/*.js 剩下的 37 處原生 `confirm` 全部改 `await gameConfirm(…)`，所在函式改 `async`
       （渡劫 `triggerTribulation`、拜入宗門 `joinSect`、解僱 `dismissServant`、分解／進化／洗煉／重塑、做裝通貨、頭像光環購買、靈寶閣兌換、職業、賭坊 `checkCasinoSpend`（呼叫端 `cutStone`／`rollDice` 一併 await）、
       守城／鎮魔塔中途離開 `close` 等）；138 處原生 `alert` 改 `gameAlert`。壽元耗盡（lifespan.js）改成 `gameDialog(…, false).then(() => location.reload())`，按確定才重新載入。
       ⚠️ 新程式一律用 `gameConfirm`／`gameAlert`；用到 `await gameConfirm` 的函式回傳 Promise，呼叫端如果要用回傳值也要 await。
     market.js 的 3 個 confirm、17 個 alert 全部改用。上架改成先 `mkTakeItem(f, true)` 只檢查＋給確認框看、確定後才真的扣（等待確認期間物品留在背包，避免自動存檔後關網頁遺失）；出價確認後再檢查一次靈石。
     **新功能一律用 gameConfirm／gameAlert**；其餘 40 個檔案約 160 處 confirm／alert 是既有寫法、這次沒改。
  2. **雲端交易回報額度已滿**：實測一般讀取（get）、寫入（被規則擋下時正常回 permission-denied）都正常，但 `runTransaction`（出價用）一直回 `resource-exhausted: Quota exceeded`（HTTP 429），SDK 重試約 7 秒後放棄，原本只顯示「連線失敗」。
     原因要在 Firebase 主控台（Firestore 用量、配額／帳單）查，遊戲端無法修；leaderboard.js 新增 `LB_QUOTA_MSG`／`lbIsQuota(e)`，寄售各失敗訊息與榜單讀取失敗遇到時改顯示「雲端伺服器回報額度已滿（Firebase：Quota exceeded）…請通知管理者」。
     - 2026-10-04 版本 `20261005X`（使用者回報「寄售榜連線失敗」，實測 Firestore REST 對任何讀取都回 429 Quota exceeded）：開榜讀取時 SDK 還在重試、8 秒逾時先到，只顯示「連線失敗」。
       `lbProbeQuota()`（leaderboard.js）：逾時等非 permission-denied 的失敗，直接打一次 Firestore REST（不登入、帶 apiKey，最多 3 次；額度已滿時部分 429 不帶 CORS 標頭會 Failed to fetch），回 429 就改顯示 `LB_QUOTA_MSG`；`refreshLeaderboard`、`refreshMailbox` 共用。
  - 驗證（本機）：用雲端不存在的假寄售品（不會寫入任何資料）按出價 → 遊戲內確認框；取消 → 無動作；確定 → 顯示額度已滿訊息、靈石沒扣；Console 無其他錯誤。

- **手續費調整＋腐化裝備不可交易**（2026-10-03，版本 `20261005v`，使用者新增規則，目的是回收多餘靈石）：
  - 成交手續費 `MARKET_FEE` 5% → **10%**（賣家領 90%；只在玩家端計算，雲端規則不用改；改版前上架、改版後才領的也按 10%）。
  - **上架登錄費** `MARKET_LIST_FEE`（config-leaderboard.js）：`marketListFee(price)` ＝ max(起標價 × 2%, 每小時收入 × 0.25)，按確定後先扣、成交與否都不退；雲端寫入失敗才連物品一起退回。確認框與規則說明列出金額。
  - **入魔淬煉過的裝備（`eq.corrupt`，第 69 節）不能交易**：`marketItemOptions` 不列出、`mkTakeItem` 擋下「入魔淬煉過的裝備不能交易」。
  - 驗證（本機，假雲端）：入魔裝不出現在清單、直接上架被擋；起標 50 萬扣 1 萬（2%）、低價扣 15 分鐘收入；雲端失敗時登錄費與裝備都退回；Console 無錯誤。

- **開放寄售洗煉石與做裝通貨**（2026-10-03，版本 `20261005x`，使用者同意）：`MARKET_STACKS` 加 🌀洗煉石（`player.refineStones`）與 🔷天機石／💠混元晶／⚫破虛石／🔮造化玉（`key: "craft:xxx"`、`cur` 指向 `player.craftCur` 的那一格），都歸「⛏️ 材料」分類（雲端規則的 kind 不用改）。
  market.js 的數量型物品一律經 `mkStackHave(s)`／`mkStackAdd(s, n)` 讀寫（做裝通貨走 craft.js 的 getCraftCur／addCraftCur／spendCraftCur）。驗證：材料清單列出、上架扣數量、數量不足擋下、退回加回；Console 無錯誤。

- **週末休市**（2026-10-04，版本 `20261005AF`，使用者：「寄賣只開放週一～週五，六日的網路流量要留給世界 Boss」）：`MARKET_OPEN_DAYS` [1～5]（台灣時間星期）；
  market.js 的 `isMarketClosed()`：週六、週日寄售分頁顯示「🏮 寄售週末休市」（`marketClosedHtml`），`refreshLeaderboard` 遇到休市的寄售分頁直接返回、**不讀雲端**；
  上架、出價、領退款、領物品／靈石、下架開頭都 `marketClosedAlert()`。休市期間結束的拍賣照常結束，週一再到「待處理」領取。
- **每週一 15:00～24:00 休市**（2026-10-05，版本 `20261005BN`，使用者：「星期一下午三點賣場關閉、半夜開啟」→ 每週固定、週二 00:00 恢復）：config-leaderboard.js 新增 `MARKET_CLOSED_HOURS = { 1: [15, 24] }`（開放日裡的休市時段，台灣時間）；
  market.js 新增 `marketCloseInfo()`（null＝開放；否則 `{ title, why, reopen }`），`isMarketClosed`／`marketClosedAlert`／`marketClosedHtml` 都改用它，週末與週一時段顯示各自的標題與恢復時間。雲端規則未限制時段（同週末休市，只在玩家端擋）。

## 59. 戰場實況改版：人物立繪＋爆擊血條（`battle-fx.js`；2026-09-28，版本 `20260930f`）
- 玩家要求：戰鬥面板人物區改放人物圖（男角用男、女角用女）、加一條有打擊感的「爆擊血條」，參考圖是金紅圓環＋金框血條（血條上的數字是畫死的，所以血條用 CSS 重做，只裁了圓環當徽章）。
- 版面（`#combat-visual-panel`，桌機 300px 高、手機 260／240px）：**左右對戰構圖**（2026-09-28 玩家反映整張立繪放不下對手而改）——左 56% 我方立繪 `#bf-hero`（`player.gender` 決定，**不跟頭像走**）、右 56% 敵方 `#bf-foe`，兩邊用 clip-path 切成同一條斜線 (56%,0)→(44%,100%)，`svg.bf-divider` 畫金線、中央 `.bf-vs`；上下漸層壓暗。
  **野外小怪圖鑑 `FIELD_MONSTERS`**（2026-10-03 起搬到 config-monsters.js，加型態與各地圖組合，見第 66 節第 2 期；原 config-maps.js，2026-09-28 玩家提供 7 張圖、玩家要求「怪物要命名，不要都顯示上古巨獸」，取代舊的 `monsterIcons`）：青鱗蒼龍、雪紋白虎、焰蹄麒麟、九尾天狐、赤羽火鳳、幽冥鬼將（dark）、青面夜叉（dark），每筆 `{ name, icon, img, pos }`；
  `combat.js` 刷怪時每隻隨機抽一種，寫進妖獸物件的 `name`／`icon`／`img`／`imgPos`（只影響外觀，數值不變）；幽冥禁域（`DARK_MAP_CATEGORIES`）只抽 `dark: true` 的，其餘地圖七種都會出。面板標題顯示「目前在打的那隻」的名字（多隻時加「共 N 隻」），野外修士顯示「正道修士／邪道修士」、暗殺者顯示「暗殺者」。
  敵方圖片 `getBattleFoeImg()` 回傳 `{ src, pos }`：心魔（`HEART_DEMON_IMGS` 依性別，第 7 節）／懸賞對手物件的 `img`（依陣營取 `CULTIVATOR_IMGS`，第 27 節）、野外妖獸的 `e.img`（地圖選填 `monsterImg` 可整張地圖蓋過）、野外修士（正／魔）與暗殺者的 `e.img`（`CULTIVATOR_IMGS`／`AMBUSH_IMG`，第 27 節，2026-09-29）；
  **安全區**（2026-09-29，版本 `20261002d`）顯示 `SAFE_ZONE_IMG`（config-maps.js，宗門景色；個別安全地圖可加 `battleImg`／`battleImgPos` 蓋過），同時 `.bf-scene` 加 `.bf-safe` 隱藏「VS」（渡劫、懸賞對決除外）；換下一隻時圖片淡入（`.bf-foe-in`）；沒有圖就顯示大號 emoji（`#bf-foe-emoji`，取自 `#battle-enemy-icon`）。玩家打中時敵方閃白後退（`.bf-foe-hit`）。**之後要放怪物／BOSS 圖，只要在地圖加 `monsterImg` 或在對手物件加 `img`。**
  敵方飄字落在右半（暴擊固定在 76～79%，避開中央 VS）、受傷字落在左半。
  上方敵方列（徽章＋怪物 emoji `#battle-enemy-icon`、標題、`#bf-enemy-bar` 血條、狀態／五行一行）；下方玩家 HUD（徽章中央是帶光環的頭像 `#battle-player-icon`、名字、氣血／法力／修為三條）；最下一行 `#battle-action-desc`。
  舊的 id（`battle-player-name`、`battle-player-hp`、`battle-enemy-title/icon/info`、`battle-action-desc`）都保留，`ui.js` 的 `updateCombatVisualPanel()` 照舊填字，另外呼叫 `setBattleBar()` 更新血條。
- 爆擊血條：`.bf-fill` 立刻縮、`.bf-trail`（橘白殘影）延遲 0.35 秒再跟上，看得到被打掉的那一截；暴擊／重擊／雷擊時切口 `#bf-enemy-spark` 爆光。多隻怪時是總血量；安全區／休整／索敵時**不隱藏**（2026-09-28 玩家要求「血條置頂、不要被刷新怪物影響」，版本 `20260930i`），改成灰框空條（`.bf-bar-enemy.idle`）並顯示「⏳ N 秒後刷新」「🔍 索敵中」「🕊️ 無敵意目標」，畫面不再一閃一閃。
  同時 `#combat-visual-panel` 改為 `position: sticky; top: 0`：往下捲日誌時戰場（含兩邊血條）黏在捲動區頂端。
- **三段式版面**（2026-09-28，版本 `20260930l`；玩家反映手機上「血條還是被吃掉一半、要完全置頂、不被新圖覆蓋」）：`#combat-visual-panel` 改為直向 flex 三段——
  上 `.bf-enemy`（敵方徽章＋名稱＋爆擊血條＋狀態，實心深色底、金色下框線）／中 `.bf-scene`（桌機 190px、手機 160／145px，只有這段放立繪、敵方圖、VS、飄字、閃光、受傷紅框）／下 `.bf-player`（我方三條）＋ `.bf-desc`。
  血條與狀態列不再疊在圖片上；暴擊震屏只震 `.bf-scene`（`battle-fx.js` 的 `restartAnim(...bf-scene, 'bf-shake')`），血條列不跟著晃。飄字座標改以中段圖片為準。
- **我方頭像不套火焰圓環**（版本 `20260930p`；玩家反映手機版女角頭像被蓋住）：原本我方徽章也套 `emblem.jpg` 火焰圓環，頭像只剩 34px，玩家若裝了頭像光環（frames），兩層框疊在一起把臉擠掉。
  改為 `.bf-player .bf-emblem::before { display: none }`；我方頭像放大到 60px（手機 54px），光環照常顯示。
  同一版稍後（`20260930t`，玩家反映怪物頭像也被蓋住）敵方也拿掉火焰圓環：`#battle-enemy-icon`（`.monster-avatar`）改為 58px（手機 52px）紅金框圓頭像，`updateBattleFoe()` 有怪物圖時設為背景圖（`.has-img` 隱藏 emoji），沒有圖時顯示 emoji。`emblem.jpg` 目前已不使用。
- **閃避動作**（版本 `20260930v`，玩家要求）：我閃掉敵方攻擊（`battleFxHurt` 收到 dodge，多隻怪時部分閃掉也算）→ 立繪 `.bf-hero.bf-evade` 往左閃；敵方閃掉我的攻擊（`battleFxHit` 的 dodge → kind `miss`）→ 敵方圖 `.bf-foe.bf-evade` 往右閃。
  動作是位移 16%＋半透明＋模糊（殘影感）再回位 0.45 秒；閃避優先於受擊動作（`restartAnim(el, cls, clear)` 第三參數同時移除衝突的 class）。
  ⚠️ 立繪同時有無限循環的 `bf-breathe`，多個 animation 改同一個 transform 時**清單後面的優先**，所以 `.bf-evade`／`.bf-lunge` 都寫成 `animation: bf-breathe …, bf-evade-l …`（之前出手前衝寫反了，一直沒生效，這版一併修正）。
- **武器發光＋本命五行特效＋能量旋風**（版本 `20261001a`～`e`，玩家要求）：
  - 立繪改包在 `#bf-hero-box`（`layoutBattleHero()` 依圖片比例算 px 大小：高 96%、寬 ≤ 44%，靠左下；視窗縮放時重算），框內用 % 座標就能對準圖片；呼吸／前衝／閃避動畫作用在框上，特效跟著動。
  - 武器火焰（版本 `20261001j`；玩家要求「武器能量不要光柱，改火焰附著」，取代原本 `svg.bf-weapon` 三層光線）：`buildBladeFire()` 沿 `BATTLE_HERO_BLADE`（男 [72,55,95,80]、女 [66,52,93,88]，立繪框寬高 %）
    等距排 16 團柔焰（`#bf-blade-fire span`，護手端大、劍尖端小、高度三種交錯），screen 混色、顏色依本命五行。**換立繪時要重量這組座標。**
    `20261001n` 玩家反映「生硬、尖銳」：從 clip-path 鋸齒火舌改為圓潤橢圓（border-radius）＋radial 漸層＋blur 2.2px，節奏放慢到 0.85～1.33 秒，動畫改為左右輕輕搖曳、微旋轉、明暗漸變。
  - 屬性特效：`getPlayerElement()`（裝備最多的五行）→ `BATTLE_HERO_ELEM_CLASS` 的 `.el-fire/-water/-wood/-metal/-earth`（沒有則 `.el-none` 淡金），設定 `--wc/--wc2` 顏色；10 顆粒子各有形狀動畫：火＝火星上飄、水＝空心泡泡、木＝葉片旋轉、金＝十字星芒閃爍、土＝塵砂揚起；另有 screen 混色光暈。
  - 氣焰（`.bf-ki` 12 縷，版本 `20261001g` 起；玩家提供超級賽亞人式參考圖，取代原本的 `.bf-whirl` 旋風光環。`20261001l` 玩家反映尖刺像「舞台燈打在人身上」，改為柔和、飄忽不定：
    模糊橢圓氣流（blur 3.5px、radial 漸層）從不同高度升起，`@keyframes bf-ki-wisp` 五段不規則地伸縮、左右飄、微旋轉、忽明忽暗，每縷節奏與相位不同；中間幾縷 `--kmax` 較低）。舊描述：尖刺狀能量火焰（clip-path）從腳下往上竄、scaleY／skew 忽長忽短閃爍，
    兩側較高較亮、中間較淡（opacity 0.14～0.35）避免蓋住人物；screen 混色＋屬性色。`.bf-hero-box::after` 為貼身的環形柔光（氣場底色）。
- **人物區滿版**（版本 `20261001h`，玩家反映「玩家對戰畫面沒有滿版」）：左右分界不再固定在 56%→44%，改由 `layoutBattleHero()` 依中段大小計算——
  立繪高＝中段 96%、寬 w＝高×圖片比例（最多 60%）；斜線底端＝立繪右緣、頂端再往右 `--slant`（中段寬 12%，最多 70px）。以 CSS 變數 `--s`（px）／`--slant`（px）設在 `.bf-scene` 上，
  `.bf-hero-bg` 寬 `calc(--s + --slant)`、`.bf-foe` 從 `left: --s` 開始、`.bf-foe-emoji`／`.bf-vs` 跟著移動，分隔線 `#bf-divider-line` 的座標也由 JS 更新。人物區只剩斜線上方一小塊三角由模糊背景補；怪物區拿剩下的寬度（寬螢幕時怪物圖更大）。
  立繪上緣／右緣淡出改為 6%／5%（原本 12%），避免貼邊時看起來變淡。
  - 女角立繪重裁（x150～1024、y100～936）：上一版把劍尖裁掉了，現在整把劍完整；右上殘留的圓形框邊被右緣／上緣淡出遮掉。
- **VS 置頂**（`20261001c`，手機版 VS 被遮）：`.bf-vs` z-index 5、分隔線 z-index 3、飄字 6。
- **暴擊震動＋畫面破碎**（`20261001e`）：暴擊時整個 `#combat-visual-panel` 加 `.bf-crit-quake`（位移＋微旋轉 0.5 秒，含上下血條）；敵方血條 `crit-hit` 震幅加大到 ±8px、上下撐大 1.4 倍；
  `spawnCritShatter(scene)` 以敵方中央為撞擊點隨機畫 7 條鋸齒裂痕（SVG polyline，白光）＋撞擊圈，並噴出 9 片玻璃碎片（`.bf-shard`，CSS 變數 `--dx/--dy/--rot` 決定飛行方向），約 0.85 秒後移除。
  `prefers-reduced-motion` 時旋風、粒子、流光、震動都關閉。
  重擊／雷擊只有血條切口小爆點＋中段圖片小震（`20261001k` 曾加輕量版金色／紫色裂痕碎片，玩家覺得太假，`20261001m` 移除；破碎只留給暴擊）。
- **敵方血條改參考圖樣式**（版本 `20261001q`，玩家提供「魔焰妖狼 Lv.80」血條圖）：火焰圓環徽章（`emblem.jpg`）回到敵方頭像外圈，但用遮罩只留外環（內半徑 ≈ 頭像半徑，不再蓋住頭像）、徽章壓在血條左端（`margin-right: -18px`）；
  上方深色斜角名牌 `.bf-enemy-plate`＝怪物名（襯線粗體）＋等級字 `#bf-enemy-lv`（野外＝地圖 `nv2L` 對應境界如「化神境」，心魔＝自己的境界，懸賞與空場不顯示）；
  血條 24px、2px 金框＋內黑線、空的部分暗紅、血量帶光澤紅漸層、數值靠左，右端 16px 金色尖角。
- **飄字落點＋屬性色＋暴擊血條**（版本 `20260930s`；玩家反映傷害被蓋住、要把傷害放在受傷的人物上、做參考圖那種暴擊效果、冰藍毒綠火紅）：
  - 落點：打敵人的字在右半敵方圖上、受傷的字在左半立繪上（`spawnBattleFloat`）；同一批依 `slot` 分到不同高度（`ROWS`），暴擊固定在敵方中央偏上；`.bf-float` z-index 6 蓋過閃光／紅框。
  - 屬性色：`battleFxElemOf(tags)` 依 `BATTLE_FX_ELEMS` 優先序（雷＞冰＞火＞毒＞金＞風＞聖光＞暗蝕）取 `resolveHit` 標籤，加 `.bf-el-*`（CSS 變數 `--fx-c1/c2/c3/glow`）與小圖示；受傷字無屬性時為紅、有屬性時用屬性色。
  - 持續傷害：`tickStatus()`（elements.js）多回傳 `burn`／`poison` 分量，`battleFxDot(t, onPlayer)` 顯示燒傷紅字、中毒綠字（野外怪物合計、玩家自身、懸賞對手、心魔）。
  - 暴擊：數字漸層（有屬性時用屬性色）＋先放大再連續彈跳（`@keyframes bf-crit`）；敵方血條 `.crit-hit` 閃白＋震動＋上下撐大，切口 `.bf-spark.big` 放射星芒（`repeating-conic-gradient`）；暴擊字大小用 `clamp(1.5em, 12cqw, 2.8em)`（`.bf-scene` 設 `container-type: inline-size`），窄手機自動縮小。回血或換波時殘影直接對齊（不倒放）。
- 飄字：戰鬥程式只排佇列——`combat.js` 的 `playerAttackTurn` 內 `hitTarget` 呼叫 `battleFxHit(dealt, r.tags)`；怪物回合、懸賞對手（`bounty.js`）、心魔（`tribulation.js`）扣玩家血後呼叫 `battleFxHurt(dmg, dodged)`。
  `updateCombatVisualPanel()` 最後呼叫 `flushBattleFx()` 播放：一次最多約 4～5 個字，多的合併成「×N」；暴擊（tag `crit`，新制敏捷）大字漸層＋「暴擊」＋震屏＋閃光，重擊（`metal`）／雷擊（`thunder`）中字＋爆點，受傷紅字＋畫面紅框，閃避灰字。
  面板看不到（`document.hidden` 或面板 `offsetParent === null`）時不排佇列，只影響畫面、不影響結算。`prefers-reduced-motion` 時不震屏、立繪不動。
- 鎮魔塔（第 51 節）、死守天南城（第 49 節）有各自的戰鬥畫面，不受影響。
- **隱藏畫面開關**（2026-09-30，版本 `20261003s`，使用者要求「仙魔戰場實況加一個小開關可以關閉畫面」）：標題列右側小按鈕 `#bf-scene-toggle`（「🙈 隱藏畫面」／「👁️ 顯示畫面」）→ battle-fx.js 的 `toggleBattleScene()`。
  只收起中間對戰圖 `.bf-scene`（立繪、敵方圖、飄字、閃光；`#combat-visual-panel.bf-scene-off`），敵方血條列、我方狀態列、夥伴列、行動說明照常顯示。
  收起時 `battleFxActive()` 回傳 false（不排飄字佇列，省效能）；重新顯示時 `layoutBattleHero()` 重排立繪。
  是這台裝置的偏好：存在 localStorage `xiuxian_battle_scene_hidden`（'1'＝收起），不寫進遊戲存檔；`DOMContentLoaded` 時 `applyBattleSceneHidden()` 套用。
  ⚠️ 手機版全域 `button` 樣式（寬 100%、padding 12px）會把按鈕撐滿整列蓋住標題，CSS 選擇器用 `#battle-panel .bf-scene-toggle` 並明確設 `left: auto; width: auto; margin: 0`。
  驗證（本機，手機 375×812）：按鈕在標題右側不擋字；收起後圖高 0、血條保留、`battleFxActive` false；再按恢復 145px；重新整理後維持收起；Console 無錯誤。

## 60. 角色裝備視窗改版：人形裝備欄＋裝備對比（`equip-compare.js`；2026-09-28，版本 `20260930n`）
- 玩家反映：換裝很不方便、無法對照屬性；提供暗黑破壞神式的人形裝備欄參考圖，要求「選擇的裝備跟使用中的兩樣顯示，增加什麼減少什麼」。先做模板 `tools/裝備介面模板.html`（假資料）給玩家確認後實作。
- **① 人形裝備欄**（`renderEquipDoll`，由 equipment.js 的 `renderLingbaoUI()` 呼叫；`#equipped-list-container` 不再是 grid-container）：
  `EQ_DOLL_LAYOUT` 左欄 6 武器（劍刀扇弓笛筆）、右欄 6 防具（頭披風盔甲內衣手套長靴）、下排 5 飾品＋神器；中間人物正面圖（`EQUIP_HERO_IMG`，依性別：男＝玩家提供的第二張「屋頂對飲」圖、女＝第一張「伸手」圖，2026-09-28，版本 `20260930o`；`pos` 對準臉部）＋名字、本命五行、戰力、氣血。
  格子外框用品質顏色、顯示 Lv 與強化；背包裡有「能穿、且穿上後戰力更高」的同部位裝備時右上角亮綠色 ▲。圖示 `EQ_SLOT_ICONS`（扇用 🎐、腰牌用 🏷️：🪭🪪 在部分裝置顯示成方框）。
- **② 部位換裝**（`renderEquipSlotSheet`）：選中的部位顯示「🔸 使用中」卡片（原本的強化／鎖定／卸下按鈕都在這裡）＋背包同部位候選（`eqCandidates`），
  每件標「戰力 ▲+N／▼−N」，可穿的在前、依戰力差由高到低；等級不足標 🔒 與原因。點候選開 ③。
- **③ 裝備對比**（`openEquipCompare(id)`，`#equip-compare-modal`，z-index 110 蓋在裝備視窗與背包上）：左「使用中」右「選擇」，數值表 `eqStatMap`（新制：武器攻擊、四維＋敏捷；另有減傷、閃避、各屬性傷害）取聯集逐項比較，較好綠、較差紅，右邊附差值；
  兩張卡都可展開「詞條／特效／孔位」（`formatEquipDetails`）。下方「穿上後變化」＝ `eqSimulate(slot, eq)`：**暫時把 `player.equipment[slot]` 換成該件、用遊戲公式算 `eqSnapshot()`、try/finally 還原**，
  所以套裝、五行共鳴、詞條、特效、孔位、金丹等所有加成都算在內。列出有變化的：戰力、氣血、法力、物理／術法攻擊、減傷、閃避、暴擊、連擊、各屬性傷害（`a → b`）。
  提醒：套裝件數變化、五行共鳴變化、本命五行變化、等級不足（「穿上」變灰）。「穿上」＝ `wearFromCompare()` → `equipItem()` → 提示「✅ 已穿上」→ `refreshEquipViews()`。
- 背包的裝備卡片多一顆「🔍 對比身上 X」（bag.js），直接開 ③。
- 試算成本：開裝備欄時每件背包裝備各試算一次（判斷 ▲ 與排序），背包上限 500 件（2026-10-01 起），實測約 10 毫秒。
- **日後新增會影響角色數值的裝備欄位或加成**，只要走既有的 `getBonusTotals`／`getEquipBonus` 等函式，對比會自動算進去；若新增的加成讀的是快取，要確認試算時快取會跟著變（目前沒有裝備相關快取）。

## 61. 賺錢管道：坊市回收、商隊跑商、洞府產業、職業加成、懸賞賞金（`config-economy.js`、`economy.js`；2026-09-29，版本 `20261002f`）
- 背景：妖獸改為強度 1.5～3 倍、要大量喝藥（第 54 節）後，靈石幾乎只有打怪一個來源，也沒有把用不到的東西換錢的管道。使用者同意我提出的 ①～⑤ 全部實作。
- **共同換算 H**：`getHourlyIncome(realm)`＝`realmPacing[境界].map` 那張地圖的 `coins` × `KILLS_PER_HOUR_ESTIMATE`（凡人／煉氣 2.3 萬、元嬰 116 萬、上蒼以後約 800～1000 萬）；`incomeMinutes(n)`＝H 的 n 分鐘。所有新收入都用它換算並設每日上限。
- **① 坊市回收**（天星城坊市「收購商」傳送點：橫圖 rect [90,330,300,300] 左側木棚攤位、直式 [0,1060,220,360] 左下攤位，`config-towns.js`）→ `#market-sell-modal`：
  - 裝備：H 的 `equipMinutes`（白 0.5／綠 1／藍 2／紫 4／橙 10／白金 30 分鐘）× 等級係數 `getEquipLevelFactor`（0.5 ＋ 0.5 × 裝備等級 ÷ 人物等級可穿的最高檔，`EQUIP_LEVELS`＋`BLUEPRINT_LEVELS`）。依品級一次賣出、「一鍵賣出全部白、綠裝」；🔒 鎖定與神器不賣；超過剩餘額度的那件跳過、便宜的照賣。
  - 丹藥堂丹藥：售價 × 20%；異火碎片 H 的 1 分鐘、星允鐵 2 分鐘（×10／全部）。
  - **每日上限** H × 2 小時（`player.marketSell = { date, total }`，`toDateString` 換日重置）。
  - **背包滿時自動賣出**（勾選 `player.autoSellFull`）：`enhance.js` 的 `receiveLootEquip` 在背包滿、白～紫、額度夠時改呼叫 `tryAutoSellLoot` 賣掉，否則照舊分解；橙色以上照舊進暫存區。
  - ⚠️ 鍛造一件 1 萬靈石，高境界白裝回收價可能高於鍛造費，「鍛造→回收」會有賺頭，但受每日 2 小時 H 上限約束（等於每天多一份固定收入）。
- **② 僕從商隊**（門派任務「🐫 商隊跑商」，詳見第 12 節）：固定 2 小時，帶回 H 的 10～30 分鐘 × 品質倍率（一般 1／優秀 1.2／稀有 1.4／史詩 1.7／傳說 2），30% 另帶回星允鐵 1～3 或異火碎片 1～2；
  出發照舊付 50～300 靈石；**所有僕從合計每日 4 趟**（`player.caravanDaily`）。離線／背景結算（`settleIdleQuests`）照常推進。
- **③ 洞府產業**（宗門分頁「🏞️ 洞府產業」按鈕，不用在宗門也能開；`#estate-modal`）：靈田（靈石＋靈草）、礦脈（靈石＋礦石＋每小時 0.2 顆星允鐵），第一次開啟時各送 1 級。
  - 每小時靈石＝H × `ESTATE.rate`（1 級 5% → 10 級 25%）；累積上限 `capHours`（1 級 8 小時 → 10 級 24 小時），滿了停止累積；依時間戳記 `player.estate[kind].last` 計算，所以關掉遊戲也會累積。
  - 升級花費 H × `upgradeHours`（1→2 級 1 小時 … 9→10 級 3 小時），升級前自動收成。
  - 靈草可到宗門靈田（`field.js`）培育成煉丹材料，等於省丹藥錢；礦石給符寶坊用。
- **④ 煉丹／鍛造賣錢**：自己做的東西可放寄售（第 58 節，原本就能），或賣給坊市回收；主修職業每一階回收價 +2%（`MARKET_SELL.profRankBonus`，`marketProfBonus()`）。
- **⑤ 懸賞賞金**：`bounty.js` 的 `endBountyDuel` 勝利時 `grantBountyCoins(rank)`：天榜 H 30 分鐘、地榜 15、人榜 5，寫在伏誅日誌裡。
- 驗證（2026-09-29 本機，元嬰 Lv.50，H＝116 萬）：
  - 回收：白 Lv.50 9,666、白 Lv.10 5,799、綠 19,333、藍 38,666、紫 77,333、橙 193,333；鎖定的沒被賣；額度剩 5 萬時紫、橙都不賣並提示；背包滿時藍裝自動賣得 3.87 萬、橙色進暫存區、關掉設定改回分解。
  - 產業：靈田放 5 小時可收 29 萬＋靈草 10；礦脈放 30 小時只算 8 小時（46.4 萬＋礦石 8＋星允鐵 1）；升 2 級花 116 萬。
  - 商隊：傳說僕從一趟 44.2 萬，第 4 趟後自動停工。懸賞：天／地／人 58 萬／29 萬／9.7 萬。
  - 手機 375×812：收購商傳送點在左下攤位、不擋風希；回收與產業視窗顯示正常；Console 無錯誤。

## 62. 種族剋制（`config-race.js`、`race.js`；2026-09-30 起分期施工）

- **規劃**（使用者 2026-09-30 定案，參考《天堂》種族特攻）：四族 🐉妖獸 `beast`／👻鬼物 `ghost`／😈魔修 `demon`／🌀心魔 `heart`；正道修士、正派懸賞人物＝人修（沒有種族）。
  剋制來源 A 天磯錄斬妖錄、B 剋制符寶、C 剋制法寶（掉落）、D 裝備特效；敵人另有種族特性（妖獸氣血 +20%、鬼物閃避 +10 且不中毒、魔修吸血 10%、心魔無，數值待第 2 期模擬）；
  對同一族剋制合計上限 `RACE_DMG_CAP` **+50%**；**只加傷害、不算進戰力**（戰力榜、雲端規則不動）。
  分期：① 標籤＋顯示＋傷害接上＋斬妖錄（✅ 版本 `20261003e`）② 種族特性＋勝率校準（✅ `20261003h`）③ 符寶（✅ `20261003i`）④ 法寶＋掉落＋鎮魔塔每 10 層種族關卡（✅ `20261003m`）⑤ 裝備特效（✅ `20261003n`：新掉落＋重鑄＋白金進化三種都留）。**五期全部完成。**
- **第 1 期內容**：
  - 種族標籤（敵人 `attrs.race`）：野外 `FIELD_MONSTERS` 每種加 `race`（龍虎麟狐鳳＝妖獸、幽冥鬼將／青面夜叉＝鬼物；幽冥禁域只出鬼物）；野外邪修與邪派刺客＝魔修、正道＝null；
    懸賞 邪派＝魔修；渡劫心魔＝心魔（鏡像玩家屬性但 `raceDmg` 清掉）；死守天南城 一般波＝妖獸、首領波＝魔修；
    鎮魔塔 1～6 層手動 `race`（棄天神 魔修、不滅骨／主咒之王／幽冥鬼虎／黑暗法老王 鬼物、青瞑爪龍 妖獸），7～100 層依名稱後綴 `ZHENMO_RACE_BY_SUFFIX`（魔君／邪神／劍魔／血尊／魔尊＝魔修、屍王／鬼帝＝鬼物、妖皇／魔龍＝妖獸、戰神＝心魔；後綴每 10 層換一次）。
  - 傷害：`getPlayerCombatAttrs` 多 `raceDmg`（`getRaceDmgBonus()`，各族已套上限）；`resolveHit` 在傷害浮動後 `dmg *= 1 + raceDmg[對方 race]`，所以夥伴絕學、法寶技能、守城／鎮魔塔模擬也吃剋制；靈寵技能不吃（不走 resolveHit）。
  - A 斬妖錄：`player.raceKills`（state.js 預設 {}），`addRaceKill(race, n)` 在 野外擊殺（combat.js）、懸賞勝利、渡劫成功、鎮魔塔勝利、守城 `kill()`（首領伏誅記魔修）時呼叫；
    離線依地圖種族比例計入（save.js → `addFieldRaceKills`）。門檻 `RACE_SLAY_TIERS`（取最高一階）：妖獸／鬼物 100／1000／1 萬、魔修 2000／2 萬／3 萬、心魔 50／100／200 → +2%／+4%／+6%（魔修、心魔 2026-09-30 使用者改，原 20／200／2000、1／5／15，版本 `20261003f`；魔修第三階再改 3 萬，`20261003g`）；達階時寫日誌。
  - 顯示：戰場敵方資訊列「🐉妖獸×2｜…」、人物面板戰鬥屬性列「⚔️剋制 🐉妖獸 +4%」（有加成才顯示）、地圖卡片「種族 🐉妖獸 71%、👻鬼物 29%」、鎮魔塔 BOSS 介紹「・種族 👻鬼物」、天磯錄新分頁「📕 斬妖錄」（`renderCodexRaces`：各族擊殺數、進度條、三階門檻、目前加成）。
  - 驗證（本機）：妖獸 1000 隻 → 攻擊 10 打妖獸 10.4、打鬼物／人修 10；野外 3 回合敵方資訊列正確；懸賞邪派對手 demon、勝後魔修 +1；渡劫心魔 heart、不帶剋制、成功後心魔 +1；
    離線 1 小時天南 妖獸 +76／鬼物 +31（5:2）；鎮魔塔 12 個樓層種族正確；斬妖錄分頁正常；102 個腳本語法檢查通過、Console 無錯誤。
- **第 2 期：敵人種族特性**（2026-09-30，版本 `20261003h`）：`RACE_TRAITS`（config-race.js）＋ race.js 的 `raceTrait`／`raceHpMult`／`applyRaceTraits`／`raceLifestealHeal`／`fieldRaceKillMult`。
  - 最終數值：妖獸 **氣血 +10%**、鬼物 **閃避 +5 且不會中毒**（`attrs.poisonImmune`，resolveHit 本來就認）、魔修 **攻擊吸血 10%**、心魔無。
    原規劃 +20%／+10 模擬後太重（鎮魔塔妖獸／鬼物層、同階一般玩家攻×2 減傷 40 閃避 25：沒剋制勝率 30%→14%、要剋制 20% 才回原水準），改小後：沒剋制略降、剋制 10% 回原水準。
  - 套用處：野外刷怪（combat.js，氣血 × `raceHpMult`、attrs 經 `applyRaceTraits`；邪修／刺客同）、懸賞（bounty.js）、守城 `waveEnemy`（一般波妖獸氣血、首領魔修吸血）、鎮魔塔 `bossStats`
    （⚠️ BOSS 氣血公式的閃避改用 `boss.eva` 本身值，否則特性加的閃避會把氣血扣回去）。吸血：野外怪物出手、懸賞對方出手、守城 `simulateWave`、鎮魔塔 `round` 在玩家受傷後回復。
  - 收益補償：`nv2TypRoundsPerKill` 與 `nv2EstimateIdleCombat` 乘 `fieldRaceKillMult(map, 分類閃避, 命中)`（依地圖種族比例的平均多打倍率；gm.html 沒載 race.js 時視為 1）。
  - 顯示：鎮魔塔 BOSS 介紹「・種族 👻鬼物（閃避 +5、不會中毒）」；斬妖錄每族卡片多一行紅字「種族特性：…」。
  - 驗證（本機）：野外 天南／不死山（一般玩家，特性開關對照 3 輪平均）經驗 ×1.02／0.96、靈石 ×1.03／0.99、每小時擊殺 −4～8%；
    守城（11 次中位數）煉虛 1 攻×4 9→9、渡劫 10 攻×2 32→31、混沌 10 攻×4 79→79（境界壓制斷崖主導，特性幾乎無影響）；
    鎮魔塔（每層 150 場）妖獸／鬼物層 沒剋制 25～36%、剋制 10% 29～47%（改前約 29～48%）；魔修吸血在 BOSS 戰影響很小（BOSS 攻擊遠小於自身氣血），心魔／魔修層有剋制時勝率高於改前（刻意的獎勵）。
    鬼物 200 次中毒判定都沒中毒；102 個腳本語法正確。
  - ⚠️ 測試教訓：測試頁停用 saveLocal 後重新整理，會用凍結的 lastSaveTime 反覆結算越來越長的離線；本機測試角色壽元已在下限，離線戰死觸發「身死道消」把本機存檔刪了（2026-09-30）。之後測試前先備份存檔（見記憶）。
- **第 3 期：剋制符寶**（2026-09-30，版本 `20261003i`）：config-talisman.js 的 `talismanTypes` 新增 `kind: "race"` 四種（key 不可含底線）：
  🐉斬妖符 `rbeast`、👻鎮魂符 `rghost`、😈誅邪符 `rdemon`、🌀清心符 `rheart`；品階 `talismanGrades[].race` 下品 +3%／中品 +6%／上品 +10%（機率同一般符 70／25／5%）。
  - 符寶坊多一張「⚔️ 煉製剋制符」卡（`craftTalisman(qty, true)`，成本同一般符 500 礦石＋100 萬靈石，4 種隨機）；`rollTalisman(race)` 依 kind 分池，一般煉製仍只出原本 11 種，機率不變。
  - 鑲嵌、打掉、孔位文字沿用原本流程（`formatTalisman` 顯示「🐉上品斬妖符（對妖獸 +10%）」）；只有**穿戴中**裝備的剋制符生效：talisman.js 的 `getRaceTalismanBonus()` 合計各族、
    每族上限 `RACE_TALISMAN_CAP` **+20%**（我訂的：避免全身孔位堆剋制符就吃滿 50%、法寶與特效沒意義），再在 race.js 的 `getRaceDmgBonus()` 與斬妖錄相加、套 `RACE_DMG_CAP` 50%。
    剋制符的 key 也會進 stats.js 的 `getEquipBonus`（未使用的鍵，無影響）。
  - 驗證（本機，記憶體內測試、不存檔）：剋制符煉 200 次只出 4 種、品階 138／48／14；一般符 200 次不含剋制符；兩枚上品斬妖符＋中品鎮魂符 → 妖獸 20%（封頂）、鬼物 6%，
    加斬妖錄妖獸 +4% → 合計 24%，攻擊 10 打妖獸 12.4、鬼物 10.6；符寶坊畫面正常。
- **第 4 期：剋制法寶**（2026-09-30，版本 `20261003m`；使用者選「法寶欄 2 格」與掉落來源「鎮魔塔樓主層必掉＋野外稀有＋千寶閣」）：設定在 config-race.js 的 `RACE_TREASURE*`，邏輯在 race.js。
  - 四種：🏺降妖葫蘆（妖獸）、🔔鎮魂鈴（鬼物）、🔮誅魔鏡（魔修）、🌸清心蓮台（心魔）（🪞🪷 在 Windows 10 顯示成方框，改用舊 emoji）；品階 `RACE_TREASURE_GRADES` 下品 +5%／中品 +10%／上品 +15%。
  - 存檔：`player.raceTreasures = [{ id, race, grade }]`（上限 `RACE_TREASURE_MAX` 40，滿了新掉的自動出售）、`player.raceTreasureSlots = [id|null, id|null]`；舊存檔由 `raceTreasureState()` 補欄位並清掉失效 id。
  - **法寶欄**：角色裝備視窗（equip-compare.js 的 `renderEquipDoll`）下方第二個 `.eqd-sheet` 由 `renderRaceTreasurePanel()` 產生：2 格（點格子選取）、背包同族同品疊成一行，按鈕「穿到第 N 格」「合煉↑」「出售」（`.sys-btn.rt-btn` 小按鈕，index.html）。
    只有穿戴中生效，`getRaceTreasureBonus()` 各族合計、上限 `RACE_TREASURE_CAP` **+15%**（我訂的：斬妖錄 6%＋符寶 20%＋法寶 15%，留約 9% 給第 5 期裝備特效），加進 `getRaceDmgBonus()` 再套 50%。
  - 合煉 `mergeRaceTreasure`：3 件未穿戴的同族同品 → 1 件高一品；出售 `sellRaceTreasure`：H 的 5／15／45 分鐘（`sellMinutes`）。
  - **來源**：① 鎮魔塔樓主層（10、20…100，`zhenmoTreasureGrade`：≤30 層下品、≤70 中品、其餘上品）**首次擊敗**必得該 BOSS 種族的法寶（zhenmo.js `endFight` 在 `clearFloor` 前以 `z.best < f.floor` 判斷，第 100 層重打不再給）；
    各樓主種族：10 鬼物、20 妖獸、30 鬼物、40 妖獸、50／60／70 魔修、80 心魔、90／100 魔修。BOSS 介紹多一行「🏺 種族關卡：首次擊敗必得…」，結算畫面列出法寶。
    ② 野外：有種族的敵人每隻 `RACE_TREASURE_FIELD.chance` 1/5000（其中 5% 中品），combat.js 擊殺時 `rollRaceTreasureDrops`；離線 save.js `addFieldRaceTreasureDrops` 依地圖種族比例用期望值（整數必得、小數擲一次）。
    ③ 千寶閣常駐區 `renderRaceTreasureShopSection()`（auction.js，星允鐵之後）：下品四族任選、每日限購 1 件（`player.raceTreasureShop`）、價格 H × 6 小時。
  - 驗證（本機，記憶體內、不存檔）：野外 200 萬隻期望值＋20 萬隻逐隻 → 448 件（期望 440）、中品約 5%；穿中品＋下品降妖葫蘆 → 妖獸 15%（封頂），`getPlayerCombatAttrs().raceDmg` 正確；
    滿 40 件自動出售；合煉 3 下品 → 1 中品；千寶閣扣 H×6、第 2 件提示限購；鎮魔塔第 10 層首勝得下品鎮魂鈴、第 100 層首勝得上品誅魔鏡、第 100 層重打與第 11 層不掉；手機 375×812 法寶欄顯示正常；Console 無錯誤。
- **第 5 期：裝備種族特效（2026-09-30，版本 `20261003n`；使用者先看測試版，再定案「三種取得方式都留」）**：設定 config-race.js 的 `RACE_GEAR`，邏輯 race.js。
  - 資料：裝備物件 `eq.raceFx = { race, v }`（v 小數），只有**穿戴中**生效；`getRaceGearBonus()` 各族相加、上限 `RACE_GEAR.cap` **9%**（50% − 斬妖錄 6% − 符寶 20% − 法寶 15%），加進 `getRaceDmgBonus()`。
    數值：紫 1～2%、橙 2～3%、白金 3～4%，四族隨機。卡片顯示 `formatRaceGearFx`（gear.js `formatEquipDetails`，特效列之後）「⚔️ 種族特效：對🐉妖獸傷害 +2.6%」。
  - ① 新掉落：gear.js `createGearEquip` → `maybeAddRaceGearFx`：紫 10%、橙 20% 帶一條（所有管道：鍛造、奪寶、千寶閣、守城）。
  - ② 重鑄：強化視窗（enhance.js `renderEnhanceModal`）下方「🔮 種族銘刻」`renderRaceReforgeSection`／`reforgeRaceGearFx`：紫色以上，每次 50 星允鐵＋H 1 小時靈石，重抽種族與數值（已有時先確認）。
  - ③ 白金進化：enhance.js `evolveEquip` → `applyEvolveRaceGearFx`：必帶一條白金數值；原本有就保留種族。進化說明多一行提示。
  - 驗證（本機）：紫／橙各 2000 件 → 215／396 件帶特效（10.8%／19.8%）、數值 1～3%、藍色 0；兩件妖獸 5%＋6% → 9% 封頂；重鑄兩次扣 100 鐵、進化後 3.79% 保留魔修；手機強化視窗正常；Console 無錯誤。
- **野外種族比例**（2026-10-03，第 66 節第 2 期）：`fieldRaceCounts` 改依地圖出沒組合的權重（`fieldMonsterPool`），不再是全部 7 種平均；斬妖錄、離線擊殺與法寶掉落跟著變。
- **日後新增來源**（符寶、法寶、裝備特效）一律加在 `race.js` 的 `getRaceDmgBonus()` 裡再套上限；新增敵人時記得給 `attrs.race`（沒有＝人修）。

## 63. 奇遇・異界空間（`config-encounter.js`、`encounter.js`；2026-10-01，版本 `20261004q`）

- **由來**：使用者看過 tools/ 的三個原型（闖關戰棋原型、三界戰場原型，第 1 節）後要求「放進奇遇系統：切換地圖達到某種順序或次數觸發、某個時間點進入地圖跳出通知、進入異界空間強制參加、內含寶物」。
  使用者選擇：**三種一次做完**、觸發後**封存到玩家回來**（點入口才進入，放置遊戲避免掛機時白白失敗）、**每天 1～2 次**。
- **觸發**（map.js `changeMap()` 成功後呼叫 `onEncounterMapChange(地圖, 是否安全區)`；都是玩家操作，不會在離線時觸發）：
  | 來源 | 條件 | 玩法 |
  |---|---|---|
  | 秘密路線 `route` | 依序 宗門 → 天南城 → 天星城 → 宗門，10 分鐘內（`ENCOUNTER_ROUTE`）；進天星城 12% 機率在日誌聽到傳聞（`ENCOUNTER_RUMOR`） | 🏯 虛天殿（闖關） |
  | 累計次數 `count` | 每進入野外 30 次（`ENCOUNTER_COUNT`）；當日額滿時計數停在 30，隔天第一次進野外觸發 | 🩸 血色禁地（戰棋） |
  | 空間裂縫 `rift` | 進入野外時 4%（`ENCOUNTER_RIFT`，實測 3000 次 4.2%） | 闖關或戰棋隨機 |
  | 三界召令 `weekly` | 每週（週一起算）第一次切換地圖；當週有效；不佔每日次數 | ⚔️ 三界戰場 |
  前三種合計每日 `ENCOUNTER_DAILY_MAX` 2 次；同時封存上限 `ENCOUNTER_PENDING_MAX` 3 個；封存 `ENCOUNTER_EXPIRE_HOURS` 24 小時沒進就消散（寫日誌）。
- **封存與入口**：觸發時寫日誌＋`showToast`，畫面左側出現 `#enc-fab`「🌀 異界」（紅色數字＝封存數，z-index 95：在城內場景之上、彈窗之下；手機 375 寬實測位置 左 8px、高 34%）。
  點入口開 `#enc-list`（封存清單、剩餘時間、今日剩餘次數、奇遇紀錄）→「進入異界」。
- **異界畫面** `#enc-scene`（z-index 1000，全螢幕、**沒有關閉鈕**，不是 `.modal-bg` 所以不會被 `initModalTopClose` 加 ✕）：右上只有「認輸」（虛天殿、血色禁地，`gameConfirm` 確認）
  或「略過演出，直接打完」（三界戰場；對決演出中按下會演完當招就收尾）。結束後結算畫面列出獎勵，按「離開異界」才關閉。
  進入時寫 `player.encounter.active` 並存檔；**中途重新整理／關閉頁面＝異界崩塌**，下次 `initEncounters()`（main.js `initGame`）寫日誌並作廢，不給獎勵。
- **實力換算** `powerFactor()`：新制下 攻擊倍率 fa＝`nv2CombatPower()` ÷（一般玩家 `nv2TypNormal(L) × nv2TypRoundMult(L)`）、氣血倍率 fh＝`nv2MaxHp()` ÷ `nv2TypHp(L)`，
  夾在 `ENCOUNTER_POWER_CLAMP` [0.6, 1.8]；f＝√(fa×fh)。舊制一律 1。小遊戲沿用原型的小數字，只把玩家那一方乘上倍率（實測沒穿裝備的測試角色 fa 被夾到 0.6）。
  - 虛天殿：主角 氣血 60×fh、攻擊 10×fa；敵人與原型相同（首領固定 170 氣血／15 攻）。
  - 血色禁地：主角 氣血 42×fh、攻擊 15×fa；隊伍夥伴（`getPartnerTeam()` 前 2 名，power.mag > atk 視為法系、射程 2）與出戰靈寵（前 2 隻）只吃一半的差距 1＋(f−1)×0.5；
    我方不足 3 人補「宗門弟子」；我方每多於 3 人多一隻血狼。夥伴、靈寵的五行依 id 固定（靈寵 fox 火、wolf 木、dragon 水）。主角五行＝`getPlayerElement()`。
  - 三界戰場：999 名 NPC 戰力 lognormal（中位數 1），玩家＝NPC 第 150 名的戰力 × f；畫面顯示的戰力換算成玩家真實戰力的比例（`G.scale`）。
- **獎勵**（`ENCOUNTER_REWARDS`，H＝`getHourlyIncome()`；靈石／星允鐵／補天石經信箱的 `grantMailRewards`，異火 `addFireShards`，夥伴 `grantPartnerShards`，法寶 `grantRaceTreasure`）：
  - 虛天殿：每闖過一層 H×0.25（失敗、認輸也算已闖過的層）；通關再 H×3、星允鐵 30、異火碎片 20～40；**首次通關**中品剋制法寶（種族隨機）。
  - 血色禁地：勝 H×3（6 回合內再 +H×1）、異火碎片 15～30、60% 夥伴碎片 5～10（天驕→尊者）；**首次勝利**中品降妖葫蘆；敗／認輸 H×0.5。
  - 三界戰場：海選每勝 H×0.5；名次 百強 H×4、64 強 6、32 強 8、16 強 12、八強 16＋補天石 1、四強 24＋2、亞軍 32＋3＋中品法寶、冠軍 48＋5＋上品法寶。
- **存檔** `player.encounter`（`st()` 補欄位，舊存檔自動建立）：`pending`、`daily { date, n }`、`fieldEnters`、`route [{ n, t }]`、`week`（週一日期字串）、`active`、
  `stats { rogue/tactics/arena: { runs, clears, wins, best } }`（虛天殿 best＝最深層、禁地 best＝最少回合、戰場 best＝最佳名次數字）。
- **程式結構**：encounter.js 整支包在 IIFE `Encounter`（所有腳本共用全域作用域，原型的 P／T／G／attack 等短名稱會撞名）；對外只有 `onEncounterMapChange`、`initEncounters`、`openEncounterList`，
  除錯用 `Encounter.trigger(type, src[, exp])`、`Encounter._enter(id)`。非同步演出（禁地敵方回合、戰場對決）以 `runToken` 判斷畫面是否已離開。樣式在 index.html 的 `#enc-*`／`.enc-*`／`.rg-*`／`.tc-*`／`.ar-*`；
  異界內 `#enc-scene button { width: auto; margin: 0 }` 蓋掉全域 button 樣式。
- **驗證（本機，停用存檔）**：路線觸發虛天殿＋同時觸發本週三界戰場；計數 29→30 觸發禁地，當日額滿後計數停在 30；封存上限 3；裂縫 3000 次 4.2%；
  虛天殿點擊機器人打完（闖 3 層，靈石 +213 萬）；禁地弱角色陣亡（H×0.5）、實力調到上限 3 回合勝（靈石＋異火 30＋中品降妖葫蘆）；三界戰場實打一場演出後略過到底並領獎（海選第 280 名、3 勝）；
  認輸確認框（z 100001）在異界之上；active 殘留時 init 作廢並寫日誌；手機 375 寬棋盤 330px、無橫向溢出；Console 無錯誤。

### 第二批：機緣小遊戲、機緣任務、秘典碎片、強者（2026-10-01，版本 `20261004r`）
- **使用者要求**：「新增下品武學秘典碎片（100 合成），在奇遇機緣等探索發現；製作更多機緣探索、支線任務、小遊戲，寵物競賽等；奇遇可以碰見尊者或帝境強者；帝境碎片 300、至高 500」。
- **分類與次數**（取代上面「前三種合計每日 2 次」）：`ENCOUNTER_TYPES[].cat` —— `otherworld`（虛天殿、血色禁地）每日 `ENCOUNTER_DAILY_MAX` 2；`chance`（四種機緣）每日 `ENCOUNTER_CHANCE_DAILY_MAX` 3；
  `weekly`（三界戰場）不佔。存檔 `daily`／`chanceDaily`／`questDaily` 各自 `{ date, n }`。封存上限改 4。
- **觸發**：空間裂縫改依權重 `ENCOUNTER_RIFT.pool`（虛天殿 3、禁地 3、強者 2、尋寶 2）；新增 **城中機緣** `ENCOUNTER_TOWN`：進天南城／天星城 8% 依權重（競速 2、丹爐 2、強者 1），來源顯示「城中機緣」。
- **四種機緣**（都在 `#enc-scene` 內、一樣強制參加）：
  | 玩法 | 規則 | 獎勵 |
  |---|---|---|
  | 🌟 強者現身 `master` | 30% 遇帝境、否則尊者（優先未結識、一半機率挑碎片最多那位；都結識了就遇到老朋友）。三選一：虛心請教（穩定）、斗膽切磋（勝率 0.35×實力倍率，帝境再 ×0.8，夾 15～70%）、奉上 H×1 靈石護法 | 該夥伴碎片（尊者 8～12、帝境 10～15 × 倍率 1／勝 2.2 敗 0.6／1.6）＋秘典碎片 5／10／8；已結識改加好感 60×倍率 |
  | 🐎 靈獸競速 `petrace` | 出戰的第一隻靈寵（沒有就借靈狐，等級加速最多 +3%）對 5 隻對手；3 次鞭策（加速 1.2 秒、耗 35 體力，最後 30% 衝刺段效果加倍，體力耗盡力竭）；對手衝刺段必衝一次、一半機率前段再衝一次 | 第 1／2／3 名 H×1.5／0.8／0.5、秘典 20／10／6、獸丹 3000／1500／800；其餘 H×0.2、秘典 2 |
  | ⛏️ 古洞尋寶 `dig` | 6×6，靈鋤 8 把；秘典殘頁 4、靈石袋 3、異火餘燼 1、古修遺寶 1、機關 4（多毀一把）；挖開空地顯示周圍八格未挖寶物數；可「收手離開」 | 殘頁 ×8 秘典、靈石袋 H×0.3、異火 5～10、遺寶 星允鐵 20＋秘典 15 |
  | ⚗️ 丹爐試火 `alch` | 五爐，指針來回擺（每爐加快），綠區 2 分、黃區 1 分；**指針位置由經過時間計算**（分頁被遮住時 rAF 暫停也不影響判定） | 總分 ≥9 極品（H×1、秘典 20、破障丹 1）／≥6 上品／≥3 中品／廢丹 |
  競速平衡（模擬 1500 場）：最佳打法（衝刺段鞭三次）借來的靈狐奪冠約 34%、前三 94%，+3% 等級加成約 65%；完全不鞭策幾乎墊底。
- **機緣任務（支線）** `ENCOUNTER_QUEST`：進天南城／天星城 12% 接到托付（同時一個、每日 2 個、48 小時逾時）；4 種模板，三步由 `visit`（前往某城或某張**進得去**的野外圖）與 `kill`（野外擊殺 40～120，
  以 `player.fieldKills` 增量計、離線也算）組成；第一步若是城鎮不選目前所在城。切換地圖、開清單、每分鐘檢查進度；完成 H×2 靈石＋秘典 25。清單顯示步驟（✔／▶）與擊殺進度，入口在只有任務時顯示「任務」與 📜。
- **既有玩法加秘典碎片**：虛天殿每層 2、通關 +15；禁地勝 12／敗 3；三界戰場海選每勝 2、名次 8～60；**前四強另給至高夥伴碎片**（四強 5～8、亞軍 10～15、冠軍 20～30）。
- `grant()` 新增 `spellShards`、`beastCore`、`breakPills`（經信箱欄位）、`partnerShards: { p, n }`（指定夥伴）。清單「奇遇紀錄」列出秘典碎片進度與七種玩法、機緣任務統計。
- **驗證（本機，停用存檔）**：強者三種應對（段德 尊者 12／6 片、蕭炎 帝境 16/300 片、護法扣 284 萬）；競速鞭策兩次奪冠（獸丹 3000、秘典 20）；尋寶隨機挖完結算；
  丹爐精準計時 10 分極品（破障丹 +1）、隨機亂按 0 分廢丹；機緣任務「古籍殘頁」天南城 → 亂星海 → 擊殺 71 完成（靈石＋秘典 25）；秘典合成；帝境 300 片激活；Console 無錯誤。

### 人界機緣與靈界（2026-10-04，版本 `20261005AA`）
- 使用者：「目前機緣設定人界機緣，靈界的另外設定」。`onMapChange` 開頭 `isLingjieMap(map)`：地圖屬於 `LINGJIE_MAP_CATEGORIES`（[4, 5, 7]，第 74 節）就不觸發任何奇遇
  （秘密路線、累計次數、空間裂縫、三界召令、城中機緣、機緣任務、傳聞都不算；在靈界進出也不累計野外次數）。機緣任務 `questMaps` 不再指定靈界地圖。
- 已封存的奇遇、進行中的機緣任務在靈界照樣可以從「🌀 異界」進入／查看；機緣任務的擊殺步驟以 `player.fieldKills` 增量計，靈界擊殺也算。
- 靈界機緣之後另外設計（新類型請加在 `onMapChange` 的 `isLingjieMap` 分支）。
- **機緣任務清單顯示修正**（2026-10-04，版本 `20261005BI`）：完成獎勵原本顯示內部代號「H×2 靈石」，改成實際靈石數（`H() × ENCOUNTER_REWARDS.quest.h`，`toWan()`）並註明約幾小時練功收入；
  卡片底部加提示「『前往』要從大地圖進入才算，右上快捷清單不算」（第 73 節規則，玩家先前以為任務壞了）。任務邏輯本身未改。

## 64. PWA：安裝到主畫面、離線、自動更新（`manifest.json`、`sw.js`、`data/pwa.js`；2026-10-01，版本 `20261004v`）

- **目的**（使用者問「適合做成 PWA 嗎」→ 提供圖示後實作）：① iPhone Safari 可能清掉 7 天沒開的網站資料，加到主畫面的版本不受此限，並向瀏覽器申請持久儲存（`navigator.storage.persist()`），保護 localStorage 存檔；
  ② 從主畫面開沒有網址列（iOS 不支援全螢幕 API，第 34 節的全螢幕在 iPhone 無效）；③ 不再經過 LINE／FB 內建瀏覽器（原生對話框被擋的問題）；④ 核心玩法離線可玩（信箱、寄售、留言板仍需網路）。
  **不會**讓遊戲在背景繼續跑，背景掛機仍靠離線結算（第 33 節）。
- **圖示**：玩家提供 1024×1024 海報，縮到手機實際大小（約 60px）比較 4 種裁法。第一版海報只取書法標題最清楚；玩家改給第二版（韓立、南宮婉對望，中間直式金色標題）後，取**標題特寫**（裁切 330,20 起 360×360：標題居中、左右各露半張臉，金藍對比），maskable 版取景放寬為 290,0 起 440×440。見第 1 節 images/icons/。
- **sw.js 快取策略**（以 `sw.js?v=版本號` 註冊，版本號取自 pwa.js 自己的 `?v=`）：
  - 頁面（`index.html`、`gm.html`、`/`、帶 `?reload=` 的首頁）：**網路優先**，`fetch(..., { cache: 'no-cache' })` 每次向 GitHub Pages 確認（沒改過只回 304，不重新下載），失敗才用快取。
    ⚠️ index.html 決定所有 JS 的版本號，絕不能先用舊的（第 30 節 9/23 事故）。
  - 帶 `?v=` 的 JS：**快取優先**，存在 `fanchen-core-版本號`。安裝時先抓最新 index.html，把裡面所有 `data/*.js?v=` 預先存好（實測 105 支）。
  - 其他同網域檔案（圖片、manifest）：**先給快取、背景更新**，存在跨版本保留的 `fanchen-assets`（圖片可能同檔名替換，例：鎮魔塔 BOSS 圖）；安裝時預存 index.html 直接引用的 10 張圖（約 1.9MB）。
  - 不攔：影片（10～18MB、有分段請求）、外部網域（Firebase 等）、非 GET。
  - 新 SW 安裝後立刻 `skipWaiting`＋`clients.claim`（頁面本來就網路優先，不會新舊混用）；啟用時刪掉其他版本的 `fanchen-core-*`。
- **pwa.js**（main.js `window.onload` 呼叫 `initPwa()`）：
  - **新版本提示**：每 30 分鐘與切回前景時（至少隔 5 分鐘）抓 index.html，比對 `data/pwa.js?v=` 與目前版本，不同就在畫面下方顯示「🔄 有新版本，點此更新」（`#pwa-update`）；
    按下先 `saveLocal()` 再重新整理。**不自動重新整理**（避免戰鬥、奇遇進行中被打斷）。
  - **📲 安裝到主畫面**（⚙️ 設定視窗）：`openInstallGuide()`——已是主畫面版就提示不用裝；Android／電腦 Chrome 有 `beforeinstallprompt` 就直接跳系統安裝視窗；
    LINE／FB 等內建瀏覽器提示改用預設瀏覽器開；iPhone 顯示「分享 → 加入主畫面」步驟。全部用 `gameAlert`。
  - ⚠️ **iPhone 主畫面版與 Safari 的存檔是分開的**（Android 同網域共用）：安裝說明提醒先匯出存檔代碼；主畫面版第一次開啟且沒有存檔時跳一次說明（`localStorage['xiuxian_pwa_hint']`）。
- **index.html head**：`<link rel="manifest">`、`theme-color`、favicon、`apple-touch-icon`、`apple-mobile-web-app-capable`、標題「凡塵修仙傳」；
  狀態列用 `black`（不用 `black-translucent`：頁面會畫到狀態列底下，頂部 HUD 沒有留安全區會被時鐘蓋住）。
- ⚠️ **事故（2026-10-01）：同一個版本號推送兩次，手機 PWA 不更新**。`20261004x` 推上去後又改了 map.js／town-npc.js／partner.js，版本號沒換就再推一次 →
  手機的 `fanchen-core-20261004x` 已存了舊 JS（快取優先），sw.js?v= 也沒變（不會重裝 SW），pwa.js 比對版本號相同（不會跳更新提示）→ 一直跑舊程式。線上檔案其實是新的。
  處理：版本號換成 `20261004y` 再推。**規則：只要版本號已經推過，之後任何 JS 修改都必須先換新版本號才能再推**（看 GitHub Pages 的 index.html 是不是已經是目前版本號）。
- **替換圖片的規則**（2026-10-02 使用者問「以後替換圖片，檔名一樣丟入資料夾替換就好嗎」）：可以，但圖片走「先給快取、背景更新」（`fanchen-assets`，跨版本保留），
  同檔名替換後玩家**第一次開還是舊圖**、背景抓到新圖後下次才換；瀏覽器本身也可能快取約 10 分鐘。新圖的長寬比要跟舊圖一樣（`imgPos`、人偶 `rect`、熱點座標都依原圖算）。
  要玩家一次就看到新圖 → 改用新檔名（例 `-v2`）並改設定裡的路徑（牧塵立繪、天星城坊市背景都這樣做）。
- **發佈注意**：照舊把所有 `?v=` 換新即可，SW 會跟著版本號換新快取；**不要**讓 sw.js 被瀏覽器長期快取（GitHub Pages 預設 10 分鐘，可接受）。sw.js 必須在網站根目錄。
- **驗證（本機）**：SW 註冊並接管頁面、預存 index＋105 支 JS、3 個 manifest 圖示 200；**停掉伺服器後重新整理，遊戲完整載入**（全部模組存在）；
  模擬換版本號：舊 `fanchen-core-*` 被刪、新的建立、`fanchen-assets` 保留（15 張圖）；版本偵測正確、更新提示置中顯示；安裝說明與設定按鈕正常；恢復連線後 113 個資源無失敗。
  實機安裝（Android 安裝視窗、iPhone 加入主畫面）需推上 GitHub Pages 後用手機測。

## 65. 元神・元嬰化神法（`config-yuanshen.js`、`yuanshen.js`；2026-10-02，版本 `20261005d`）

- **使用者設計**：神體＋至尊靈根合成「天元神」、道體＋特殊靈根合成「地元神」，各依種類分 6 種；能力相加＋基本修為速度、依屬性增加偏好屬性傷害；以「元嬰化神法」凝聚，材料化神訣殘本 1 萬＋破障丹、洗髓丹、伐骨丹、化神靈果各 5。
  使用者對方案的決定：**沒有達標組合就沒有元神**（神體＋特殊、道體＋至尊、靈體等都不行）；**地元神偏好屬性 +10%**（天元神 +30%）；「學元嬰化神法＝凝聚元神」（沒有地→天進化）；**凝聚後資質鎖定**；
  **轉世清空、要重新凝聚**；殘本來源照我提的表；偏好屬性傷害做成**獨立倍率**；另加「合成元神後原有的金丹跟元嬰都會消失」（之後改為**全部保留**，見下方）。
- **種類**（`YUANSHEN_TYPES`，key＝先天體質 id；名稱與屬性對應我暫定）：
  天元神：荒古聖體 庚金（金）、先天聖體道胎 乙木（木）、重瞳 癸水（水）、蒼天霸體 丙火（火）、至尊骨 戊土（土）、混沌體 混沌（雷）；
  地元神：先天劍體 劍心（金）、霸刀戰體 刀魄（火）、風靈仙體 風靈（風）、神射之體 神目（木）、天籟道體 天籟（水）、符靈道體 符籙（雷）。
  資格 `getYuanshenCandidate`：體質所屬組（`describePhysique().grade`）＝ `YUANSHEN_TIERS[tier].physGrade` 且 `aptitude.root.group`＝`rootGroup`（supreme／special）。
- **效果**：
  - 體質與靈根原有能力照常（各自計算，不重複加）。
  - 修為速度：`getYuanshenBonusTotals` → `fx:悟道` +0.5／+0.2（gear.js 的 `getBonusTotals`，進增益池）。
  - 偏好屬性（**獨立倍率，不進增益池**）：五行元神 → `stats.js` 的 `getPlayerElement` 鎖定本命五行為該屬性（五行相剋照舊），
    `resolveHit` 在攻擊方 `attrs.yuanshen.elem` 與 `attrs.element` 相同時傷害 ×(1+pct)（＝自己的普攻、技能等直接傷害都吃），火元神燒傷每層也 ×(1+pct)；
    雷元神 → 雷擊觸發時再 ×(1+pct)；風元神 → combat.js 風擊追加的那一擊 ×(1+pct)。`getPlayerCombatAttrs` 帶 `yuanshen: getYuanshenDmg()`（心魔鏡像複製玩家屬性也會帶，雙方對稱）。
  - **金丹、元嬰加成保留**（版本 `20261005e`）：第一版照使用者「合成元神後原有的金丹跟元嬰都會消失」做成凝聚後加成歸零（golden-core.js 三處判斷 `hasYuanshen`）；
    使用者看了前後對照（極品金丹＋天元嬰・中：氣血 1.04萬→7,900、靈力 1.11萬→8,200、術法 700→500）後選「全部保留」→ 三處判斷已移除，元神效果純粹往上加。
    驗證：凝聚前後氣血 1.04萬／靈力 1.11萬／術法 700／金丹 +35%／元嬰 +45%／化神勝算 +10% 都不變，修為 +100%→+152%；確認框與視窗說明改為「金丹、元嬰加成保留」。
- **凝聚**（人物面板「元神：」一行 `#yuanshen-display` → `openYuanshenModal()`，視窗 `#yuanshen-modal`）：列出天／地規則、可凝聚的元神與效果、境界（元嬰 `YUANSHEN_MIN_REALM` 4 以上）、五項材料持有／需求（綠＝足夠）；
  全部達標按「🔮 凝聚元神」→ `gameConfirm`（列出金丹元嬰消失、資質鎖定、轉世消散）→ 扣材料、`player.yuanshen = { type, tier, at }`、日誌（天元神另有天地異象）、卡片凝聚動畫 `.ys-born`。
  面板文字：已凝聚＝元神名稱；可凝聚＝「可凝聚【X】」；境界未到＝「可凝聚天／地元神（元嬰期學元嬰化神法）」；不達標＝「資質未達（需神體＋至尊靈根或道體＋特殊靈根）」。
- **資質鎖定**（aptitude.js）：`openAptitudeView` 不顯示重測按鈕、改顯示鎖定說明；`rerollAptitude` 擋下並 `gameAlert`；`offerAptitudeGift`（仙府信箱賜予資質）寫日誌後不接受。洗髓丹／伐骨丹仍可購買（是凝聚材料）。
- **轉世**（leveling.js `triggerReincarnate`）：`player.yuanshen = null`（資質隨之解鎖），化神訣殘本保留；確認視窗多一行「元神消散，需重新凝聚」。
- **化神訣殘本**（`player.huashenScrolls`，`HUASHEN_SCROLL_DROPS`；背包有卡片 x/1萬）：
  鎮魔塔擊敗 BOSS 30～80（樓主層 ×2；結算畫面與日誌）、魔屠天南每守住一波 30% 掉 3～8／首領波必掉 20～40（結算彙整）、奇遇每次結算 50～150（`showResult`，勝負都給）、
  懸賞伏誅 天 40／地 25／人 15、每日任務一輪 10 項全部領完 50（`checkDailyHuashenBonus`，標記在該輪第一項 `ysBonus`，每 4 小時一輪）、
  野外：目前地圖 `getMapSuitRange` 下限 ≥ 化神時每隻 0.5% 掉 1～3（`rollFieldHuashenScroll`）。
  **離線／背景也會掉**（同日使用者要求，版本 `20261005e`）：save.js 的 `settleIdleSeconds` 以實際擊殺數（`partnerKills`，同情緣任務）呼叫 `rollFieldHuashenScroll(kills, true)`（silent：不寫日誌），
  結算訊息多一行「📖 斬殺妖獸時翻出【化神訣殘本】×N（x／1萬）」。驗證：化神角色離線 24 小時 亂星海 +14 頁、靈山大川 0。
  - 同日順手修正：save.js 的 `calcOfflineProgress`（關掉遊戲再開的離線結算）原本用原生 `alert()` 跳結算視窗，LINE／FB 內建瀏覽器與預覽面板不顯示（玩家只看得到日誌那一行）→ 改 `gameAlert`；
    `#game-dialog .gd-msg` 加 `max-height: 65vh; overflow-y: auto`（離線結算很長，手機可捲動）。驗證：化神角色在亂星海離線 12 小時 → 遊戲內結算視窗列出「化神訣殘本 ×4（4／1萬）」，背包卡片 x4／1萬。
- **驗證（本機，停用存檔）**：重瞳＋混沌靈根元嬰角色凝聚癸水天元神：材料扣足（殘本 10020→20 等）、修為 1.02→1.52、（第一版）氣血 104→79（極品金丹 +35% 消失）、術法 +45%→0、本命五行→水；
  `resolveHit` 2 萬次平均 水元神 ×1.30、雷元神（雷擊 100%）×1.30；資格：神體＋至尊 ✔、道體＋特殊 ✔、神體＋特殊／道體＋至尊／靈體＋至尊 ✘；
  資質視窗無重測按鈕、`rerollAptitude` 被擋且不扣丹；鎮魔塔第 10 層勝 +152 頁（結算畫面列出）；每日任務最後一項領完才 +50、不重複、新一輪重置；
  亂星海 10 萬隻約每隻 0.009 頁、靈山大川 0；風靈地元神轉世後 `yuanshen` 清空、殘本保留；Console 無錯誤。
- **元神視覺特效**（同日，使用者問「凝鍊元神後人物有什麼特效」，選項四個「全部都做」；顏色／圖示在 `YUANSHEN_FX`，金 #facc15、木 #4ade80、水 #38bdf8、火 #f87171、土 #f59e0b、雷 #a78bfa、風 #5eead4）：
  1. **洞府頭像光暈**：index.html `#hud-avatar-aura`／`#pc-hud-avatar-aura`（`.ys-hud-aura`），home-ui.js 的 `updateHudAvatarFrames` 依 `HUD_AVATAR_BOXES` 放在頭像外、放大 1.3 倍，`--ysc` 屬性色、呼吸脈動；天元神（`.heaven`）多一圈 conic 旋轉符環。
  2. **戰場元神虛影**：`#bf-hero-box` 內 `#bf-ys`（`.bf-ys-glow` 屬性色光暈、`.bf-ys-ring` 天元神旋轉符環、`.bf-ys-glyph` 頭頂浮動元神圖示），battle-fx.js 的 `updateBattleHero` 依 `getYuanshenInfo` 切換。
     立繪是不透明 JPG，所以光暈與符環用 `mix-blend-mode: screen` 疊在上面；圖示不混色（第一版整層混色，圖示太淡看不清，已改）。
  3. **出手飄字**：`resolveHit` 在元神加成生效時加 tag `"yuanshen"`（五行元神：本命五行相同的擊中；雷元神：雷擊；風元神：combat.js 風擊追加那一擊帶 `attrs.ysWind`，加成也移到 resolveHit），
     battle-fx.js 的 `battleFxHit` 帶 `ys: getYuanshenFxLabel()`，飄字數字右邊多一個小標「💧+30%」（`.bf-ys-tag`）。`summarizeTags` 略過沒有名稱的標籤，戰鬥日誌不會多出元神字樣。
  4. **專屬頭像框**：config-avatar-frames.js 新增 7 個「X元神環」（`ys-metal`～`ys-wind`，`images/frames/frame-ys-*.png` 512×512，程式繪製：屬性色雙環＋24 顆符紋＋8 道尖芒＋頂端屬性字徽記，洞 r 0.36），
     解鎖條件 `{ type: "yuanshen", value: 五行或 thunder／wind }`（avatar.js `checkAvatarCondition`：目前元神的偏好屬性相同），凝聚後 `updateUI` 自動解鎖並寫日誌；頭像框永久保留（轉世元神消散也不收回）。
  - 驗證（本機）：癸水天元神 → 洞府頭像外藍色光暈＋旋轉符環；戰場立繪頭頂 💧、藍色光暈與符環；打怪飄字「-443 💧+30%」；癸水元神環自動解鎖、可配戴，其他六個顯示「🔒 凝聚X屬性元神」；Console 無錯誤。
- **遊戲確認框防連點**（同日，ui.js 的 `gameDialog`）：實測點「凝聚元神」時，確認框的「確定」剛好跳在同一位置，同一次點擊就直接確認（奇遇奧斯卡問句也發生過，第 20 節）。
  `gameConfirm`（有取消鈕的）出現後 `GAME_DIALOG_GUARD_MS`（400ms）內不接受「確定」；`gameAlert` 不受影響。所有用 gameConfirm 的地方（轉世、守城離開以外的確認等）一起受惠。
  驗證：點「凝聚元神」→ 確認框停住等玩家 → 按確定 → 凝聚動畫、彩虹字「癸水天元神」；資質視窗顯示鎖定說明、沒有重測按鈕。

## 66. 《天堂2》式戰鬥（防禦點數、暴擊 ×2；2026-10-03 起分期施工，版本 `20261005j`）

- **規劃**（使用者 2026-10-03 定案「我要天堂二的方案」）：比較《天堂》1、2 代後選 2 代（同為乘法系統，接得上現有數值）。分期：
  ① **傷害公式**：防禦改點數＋取消玩家減傷上限＋暴擊 ×2（✅ 本版）② 怪物型態（皮厚／敏捷／猛攻／術法／均衡）＋每張地圖 3～5 種亞種、跨種族、怪物閃避與暴擊（怪物平均攻擊約 −4% 抵銷暴擊）
  ③ 怪物技能（重擊、撕咬、毒牙、寒息、烈焰、破甲、狂暴、自癒、幻身）④（之後）魔攻／魔防分開、命中改點數曲線。
  不做：即時制、逐隻手寫怪物、魂之子彈、盾牌格擋。沿用四族（妖獸、鬼物、魔修、心魔），剋制系統（第 62 節）不動；境界壓制即《天堂2》的等級差懲罰。
- **第 1 期：傷害公式**
  - 玩家的 `def` 改為**防禦點數**：`getPlayerCombatAttrs` 把裝備、靈根、仙法、特效（護體／先手盾）、靈寵增益、夥伴被動全部相加，**拿掉 `DEF_CAP` 60 與 `PLAYER_EFFECTIVE_DEF_MAX` 20＋靈寵 10＋夥伴 10**
    （面板、存檔、裝備數字都不用改，原本的「減傷 N」直接當「防禦 N」）。`resolveHit`：玩家受到傷害 × `defMult(防禦 − 破甲)` ＝ `DEF_K` 120 ÷ (120 + 防禦)
    （防禦 30＝減傷 20%、60＝33%、120＝50%、150＝56%）；**敵人的 def 仍是減傷 %**（`1 − def%`），效果與改版前完全相同。雷擊、暗蝕照舊無視防禦。
  - K＝120 的理由：中等配置（防禦 30）改前改後都是減傷 20%，第 7～49 層的校準不用動；防禦 20 以下的玩家比改前略吃虧（防禦 20：80% → 86%），30 以上越堆越有利。
  - 保底（beast-combat.js 的 `applyPetDamageReduction`／`playerDamageFloor`）：改以 `resolveHit` 新回傳的 `postDef`（防禦後傷害）為準，只限制護盾類：
    傷害 ≥ postDef ×（1 − `PLAYER_SELF_SHIELD_MAX` 20% − 靈寵護盾最多 10% − 夥伴護盾最多 10%）。原本把防禦也算進 20%，會把新防禦夾回去。
  - 暴擊傷害 `NV2.critDmg` 1.5 → **2**（玩家；怪物暴擊在第 2 期）。一般玩家暴擊率只有 2～3%，影響很小；戰力期望跟著變（`nv2CombatPower`、`nv2TypRoundMult` 自動）。
    戰力 ÷ 攻擊 上限 2.28 → 2.58（暴擊 30%、連擊 10%）→ gm.html 守城審核 ③ 預設上限 2.4 → **2.6**，設定鍵 `gm_defense_settings_v3`（舊鍵存的 2.4 不再沿用）。雲端戰力上限（400＋境界×40）仍足夠，不改。
  - 離線估算 `nv2EstimateIdleCombat` 受到的傷害改乘 `defMult(防禦)`。
  - 顯示：新增 `defMult`／`pctToDefPoints`／`formatDefPoints`／`formatEnemyDef`（elements.js）。人物面板「🛡️防禦 45（減傷 27.3%）」；裝備卡片、詞條、套裝、五行共鳴、仙法、靈寵增益、資質、稱號、
    裝備對比、特效（護體／先手盾，`gearEffects` 新 fmt `num`）一律「防禦 +N」不帶 %；光環「你的防禦 −N」、BOSS 自身「減傷 +N%」；鎮魔塔 BOSS 介紹與懸賞對手「🛡️防禦 44（減傷 27%）」（敵人以 `pctToDefPoints` 換算顯示）。
    「破甲：無視目標 N 減傷」照舊（對敵人仍是 %）。
  - 鎮魔塔再校準見第 51 節（`ZHENMO_L2_ATK`）。死守天南城（各 15 次中位數，舊／新）：煉虛 10 中等 9／9、強力 19／19；渡劫 10 35／35、44／46；真仙 10 62／62、69／69；混沌道祖 10 79／79、99／100——幾乎不變，不調。
  - 驗證（本機）：108 個腳本語法正確；人物面板、裝備卡片、詞條、特效、光環、BOSS 房顯示正確（手機 390×844）；新角色在靈山大川實際戰鬥 25 秒、鎮魔塔第 60 層開打與跳過、gm.html 載入皆無錯誤。
- **第 2 期：怪物型態、各地圖出沒組合、怪物閃避與暴擊**（2026-10-03，版本 `20261005k`）
  - 新檔 `config-monsters.js`（資料）＋ `monster.js`（邏輯）；`FIELD_MONSTERS` 由 config-maps.js 搬過來，每筆加 `id`、`type`。index.html 載入順序：config-maps → **config-monsters**、race → **monster**。
  - **五型態** `MONSTER_TYPES`：均衡（氣血 ×1、暴擊 5%）、🛡️皮厚（×1.1、減傷 +15、暴擊 3%）、💨敏捷（×0.8、減傷 −5、閃避 +15、暴擊 8%）、⚔️猛攻（×0.85、暴擊 12%）、🔮術法（×0.9、減傷 −5、閃避 +5、暴擊 5%，帶異屬性機率 ×1.5）。
    - 閃避是「超出一般玩家命中」的部分：`attrs.eva = max(原閃避, nv2TypHit(L)) + eva`（原本地圖分類的 2～8% 幾乎都被一般玩家的命中抵銷，妖獸等於不會閃）→ 命中（敏捷、洞察）變得有用。
    - 暴擊 `attrs.crit`，傷害 × `NV2.critDmg`（2），`resolveHit` 本來就認；戰況「💥暴擊」，玩家受傷飄字加「暴擊」小字（battle-fx.js `battleFxHurt`）。
    - **攻擊倍率自動反推**（`monsterTypeAtkMult`）＝ 1 ÷（一般玩家殺牠的回合倍率 × 暴擊期望），讓每個型態「每隻對一般玩家的總傷害」與改版前相同（皮厚打得久但輕、猛攻死得快但會爆擊）。
      型態造成的擊殺時間差異由收益補償吸收：`nv2TypRoundsPerKill` 乘 `fieldMonsterRoundsFactor(map)`（出沒組合的平均回合倍率；gm.html 沒載入 monster.js 時視為 1），離線估算 `nv2EstimateIdleCombat` 同樣乘、每下傷害 ÷ 同倍率。
  - **圖鑑 14 種**：妖獸 蒼龍（均衡）、白虎（猛攻）、麒麟（皮厚）、九尾天狐（敏捷）、火鳳（術法）、玄甲靈龜（皮厚）、碧眼毒蛛（敏捷）；鬼物 鬼將（術法）、夜叉（猛攻）、百年殭屍（皮厚）、怨魂（敏捷）；
    魔修 血煞魔修（猛攻，借用野外邪修圖）、傀儡魔偶（皮厚）、魔道術士（術法）。靈龜、毒蛛、殭屍、怨魂、傀儡、術士**沒有圖，顯示大號 emoji**——玩家之後提供圖，在 `FIELD_MONSTERS` 補 `img／pos` 即可。
  - **各地圖出沒組合** `FIELD_MONSTER_POOLS`（25 張戰鬥地圖，每張 3～5 種、帶權重）；沒列的地圖走舊規則（幽冥禁域只出鬼物，其餘出妖獸與鬼物）。
    - **血天大陸調整**（2026-10-03，版本 `20261005y`，使用者反映「強度倍率異常」）：原組合 血煞魔修 4／魔道術士 3／青面夜叉 3 全是猛攻＋術法，實際刷怪的平均攻擊倍率 ×1.05、術法（魔防擋）70%，是普通圖最高（蠻荒古地 ×0.83、星空古路 ×0.97），
      防禦高魔防低的玩家特別痛。改成 血煞 2／傀儡 2／夜叉 2／殭屍 2／白虎 2 → 攻擊 ×0.87、氣血 ×0.97、術法 41%。殺一隻被打掉的血量 17.5%（蠻荒 18.2%、星空 18.0%），防禦 60 時 9.75%（9.89%／10.01%）；收益補償自動跟著 `fieldMonsterRoundsFactor` 調整。
      （神墟的組合同樣偏猛攻：攻擊 ×1.05，尚未調整。）
    幽冥禁域只放鬼物（本質為暗）；**魔修只在墜魔谷、血天大陸、天淵戰場、上蒼、仙界／萬界／混沌戰場**（斬妖錄魔修門檻 2000／2 萬／3 萬依野外邪修頻率訂）；**心魔不放野外**（門檻 50／100／200 依渡劫心魔稀有度訂）。
  - 顯示：地圖卡片「出沒 🐅雪紋白虎⚔️、🦊九尾天狐💨…」（`formatFieldMonsterMix`，滑鼠移上去看型態說明）；戰場資訊列最前面是「目前在打的那隻」的型態（例「⚔️猛攻｜🐉妖獸×3｜…」）。
  - 驗證（本機，新舊程式各 1500 隻／地圖，一般玩家無防禦、同境界 5 階）：25 張地圖「每隻對玩家的總傷害」新／舊差 ±2% 內（魔修圖墜魔谷、血天、天淵少 5～9%），
    「實際每隻回合 ÷ 收益補償用的回合」新／舊差 ≤ 2%（每小時收益不變）；每隻回合數依地圖組合 −16%～+23%（例：血天大陸 12 → 9.7、荒古禁地 102 → 126）。
    實戰：靈山大川 40 秒出現麒麟（皮厚）、白虎（猛攻），怪物暴擊 6 次；天南戰場面板「⚔️猛攻｜🐉妖獸×3」；地圖卡片出沒列正常；遊戲與 gm.html 無 Console 錯誤。
- **第 3 期：怪物技能**（2026-10-03，版本 `20261005l`）
  - 設定 config-monsters.js 的 `MONSTER_SKILLS`、`MONSTER_SKILL_CHANCE` 0.15，每種圖鑑 `skills` 1～2 招；邏輯 monster.js。每次出手 15% 從主動技能抽一招，狂暴是被動：
    💢重擊（這一下 ×1.8）、🩸撕咬（吸取 30% 造成傷害）、☠️毒牙／🔥烈焰（中毒／燒傷一層，以牠的攻擊計）、❄️寒息（凍結你 1 回合，抗凍結有效）、
    🔨破甲（你的防禦 ×0.8，3 個怪物回合，每波重置）、😡狂暴（氣血 < 30% 後攻擊 +50%）、💚自癒（回 10% 最大氣血，**每隻最多 2 次**）、👥幻身（閃避 +20，3 回合）。
    各圖鑑：蒼龍 寒息｜白虎 重擊＋狂暴｜麒麟 烈焰＋自癒｜九尾狐 幻身｜火鳳 烈焰｜靈龜 自癒＋寒息｜毒蛛 毒牙｜鬼將 寒息＋破甲｜夜叉 撕咬＋重擊｜殭屍 毒牙＋撕咬｜怨魂 幻身｜
    血煞魔修 狂暴＋撕咬｜傀儡 破甲＋重擊｜術士 烈焰＋毒牙。
  - 接法（combat.js 怪物回合）：`monsterPreAttack(e)`（幻身計時、狂暴、擲技能；自癒、幻身當下生效）→ 攻擊 × `atkMult` → `resolveHit`（被破甲時用 `playerAttrsUnderSunder` 打折後的防禦）→ 護盾保底 →
    `monsterPostHit`（被閃避不生效；推標籤 `msk_技能`）；每波 `resetMonsterSkillWave()`。戰場行動說明顯示「🐅雪紋白虎施展【💢重擊】！」（ui.js 讀 `lastMonsterSkillText`），
    受傷飄字小字顯示技能名／暴擊（battle-fx.js `battleFxHurtLabel`），日誌標籤 `summarizeTags` 認得 `msk_*`；地圖卡片出沒列滑鼠提示列出技能。
  - **補償**：每招的 `comp { dmg, rounds }` 以模擬量得（天南、一般玩家無防禦，每招 6000 隻 vs 無技能 1.2 萬隻）：重擊 1.12／1、毒牙 1.04／1、烈焰 1.06／1、寒息 1.17／1.16、狂暴 1.16／1、
    自癒 1.14／1.13、幻身 1.07／1.065；撕咬、破甲對一般玩家 ±1% 內視為 1（破甲只對高防禦玩家有感，刻意的）。攻擊 ÷ dmg、收益補償 × rounds（`monsterSkillComp`）；
    有 n 招主動技能時每招效果按 1/n 折算（每招只有 1/n 的出手機會），狂暴不折。
  - ⚠️ 自癒原本不限次數：挑戰圖（荒古禁地、太初古礦、雷鳴大陸、崑吾山，強度 5～40 倍、一般玩家要打上百回合）會補得比玩家打得快（荒古禁地 132 → 1281 回合），改為每隻最多 2 次。
  - 驗證（本機）：各地圖每種圖鑑（種族特性另計）對一般玩家每隻總傷害 = 均衡無技能的 0.96～1.08 倍；與第 2 期對照（各 1500 隻／地圖）一般地圖「每隻總傷害」差 ±3%、收益補償比例差 ≤ 3%；
    挑戰圖較難約 5～7%（長時間戰鬥自癒必用滿 2 次）、每小時收益約少同比例——挑戰圖本來就是牆，接受。實戰：天南 60 秒觸發重擊 8、幻身 1、毒牙 1 次，行動說明與飄字正常；Console 無錯誤。
- **6 隻怪物圖**（2026-10-03，版本 `20261005m`）：玩家提供一張合成圖（毒蛛、靈龜、怨魂、殭屍、術士、傀儡，圖上有中文標籤），以 ImageMagick 把 9 個標籤用相鄰背景（羽化遮罩）覆蓋後各自裁切，
  存成 images/monsters/spider／turtle／wraith／zombie／sorcerer／puppet.jpg，`FIELD_MONSTERS` 補上 img／pos。殭屍與術士在原圖重疊，殭屍只取上半身（200×195）。至此 14 種野外妖獸都有圖。
  驗證：戰場實況逐一顯示 6 隻，主體與臉都在畫面內；Console 無錯誤。
- **第 4 期 B：命中／迴避曲線**（2026-10-03，版本 `20261005n`；使用者選第 4 期 A、B 都做，先上 B）
  - 閃避改「迴避值」：被閃掉的機率 `evaDodge(D)`＝D ÷ (D + `NV2.evaK` 100)，D＝防守方 `eva` − 攻擊方 `evaPen`（命中值：敏捷 × 0.08、洞察、靈寵命中）；D ≤ 0 必中。
    迴避 10 → 9%、20 → 17%、40 → 29%、100 → 50%。**玩家與敵人都用同一條曲線**（`resolveHit`；`evaDodge` 放在 numeric.js，gm.html 也載得到）。
  - 取消上限：`EVA_CAP` 40、`PLAYER_EFFECTIVE_EVA_MAX` 20、靈寵／夥伴閃避各 10 的上限全部拿掉；`getPlayerCombatAttrs` 的 eva 直接相加（裝備、仙法、敏捷、靈寵增益、夥伴被動），不再回傳 `petEva／partnerEva`。
    `PLAYER_PET_BONUS_MAX`／`PLAYER_PARTNER_BONUS_MAX` 只剩護盾保底用。套裝「閃避」6 件「閃避上限 +5%」（已無上限可加）改為「閃避 +5」。
  - 所有「1 − 閃避/100」的估算改用 `1 − evaDodge(…)`：妖獸型態回合 `monsterTypeRounds`、種族特性 `fieldRaceKillMult`、收益補償 `nv2TypRoundsPerKill`、離線估算、鎮魔塔 BOSS 氣血 `bossStats`。
  - 顯示：閃避一律點數不加 %（新常數 `POINT_STAT_KEYS`＝def、eva，裝備卡、詞條、套裝、仙法、資質、稱號、裝備對比共用）；人物面板「💨閃避 30.4（迴避 23.3%）」＋新增「🎯命中 N」；BOSS 介紹、懸賞「💨閃避 20」。
  - 校準：鎮魔塔見第 51 節（全部樓層對齊改版前勝率）。死守天南城（各 15 次中位數，舊／新）8 組完全相同；野外 25 張地圖每隻總傷害與收益補償比例新舊差 ±3%。
  - 驗證（本機）：面板、裝備卡、詞條、BOSS 房顯示正確；野外實戰 15 秒、gm.html 無 Console 錯誤。
- **第 4 期 A：魔攻／魔防分開＋魔法暴擊**（2026-10-03，版本 `20261005o`；使用者選「玩家魔防兩種來源都做」「魔法暴擊要做」）
  - **傷害類型**：`resolveHit` 的攻擊方多 `dmgType`（'mag'＝術法，其餘物理）。術法：打玩家走**魔防** `mdef`（同防禦公式 × 120 ÷ (120 + 魔防)），打敵人走**魔抗 %** `mres`（沒填＝同減傷 %），暴擊率用 `magCrit`。
    - 玩家：普攻與物理技能＝物理；技能（宗門、職業、仙法、靈寶、夥伴絕學）依各自 `dmgType`（combat.js 的 `hitTarget` 第 4 參數、artifact.js `castProcSkill`）；術法技能的燒傷／中毒以術攻計。
      鎮魔塔、死守天南城取物攻／術攻較高者，術攻較高時整場算術法（`playerStats().dmgType`、defense.js `pType`）。戰力榜照舊取較高者。
    - 敵人：野外術法型妖獸、**魔修**、野外修士與暗殺者＝術法（`atkType: 'mag'`，術法攻擊吃「化勁」、物理吃「金身」）；懸賞人物施展武學＝術法、一般攻擊＝物理；渡劫心魔＝術法；
      鎮魔塔魔修／心魔 BOSS＝術法（`fight.eType`）；守城首領（魔修）＝術法。
  - **玩家魔防**＝防禦 × `MDEF_FROM_DEF` 0.6 ＋ 靈力（新制屬性點）× `MDEF_PER_SPR` 0.1 ＋ 詞條（`getBonusTotals().mdef`）；破甲光環同時削魔防（`auraPlayerAttrs`）。
    **新詞條「魔防」**（config-enhance.js `gearSubAffixes`，2～5 × 品質倍率，`only: "accessory"`）：`rollGearSubs` 多第 5 參數 category，只有飾品抽得到（新掉落、白金進化多抽的一條）。舊裝備不變。
  - **魔法暴擊** `nv2MagCrit()`＝悟性 × `critPer`（上限同 30%）＋靈寵暴擊增益；術法技能用。戰力 `nv2CombatPower` 依較高的攻擊種類取對應暴擊率。
  - **敵人魔抗**：野外依型態 `MONSTER_TYPES[].mres`（加在地圖分類減傷上）：皮厚 −10（減傷高、魔抗低 → 術法剋制）、術法 +15（魔抗高、減傷低 → 物理剋制），其餘 0。BOSS、懸賞、守城沒填＝同減傷，效果不變。
    實測（攻擊 100、無暴擊，各 4000 下）：打皮厚 物理 85／術法 100；打術法型 物理 100／術法 75。
  - **野外平衡**：一般玩家（無防禦）也有「靈力 × 0.1」的魔防 → 術法攻擊的妖獸與修士攻擊 × `fieldMagicAtkComp(L)`＝1 ÷ 該魔防的減傷倍率，一般玩家受到的傷害不變。
  - 顯示：人物面板「🔮魔防 18.5（減傷 13.4%）」；裝備對比多魔防列；地圖卡片型態說明寫魔抗與術法攻擊；`POINT_STAT_KEYS` 加 mdef。
  - 驗證（本機）：飾品 3000 件抽到魔防 357 件、防具／武器 0；與第 4 期 B 對照——野外 25 張地圖每隻總傷害與收益補償差 ±3%、守城 8 組完全相同、鎮魔塔見第 51 節；
    上古遺跡實戰鬼將＝術法、麒麟／殭屍＝物理；BOSS 房、面板、gm.html 無 Console 錯誤。（測試時直接把新角色設成金丹會在 `formatCoreShort` 報錯——改版前也一樣，是測試捷徑沒有金丹資料造成的。）

## 67. 暗黑式裝備：詞綴分級、前後綴命名、洗煉、遠古／太古、傳奇威能（2026-10-03 起分期施工）

- **規劃**（使用者 2026-10-03 定案）：參考《暗黑破壞神》。四期都做：D1 詞綴分級＋部位詞綴池＋前後綴命名、D2 洗煉（新材料）、D3 遠古／太古、D4 傳奇威能（**只出在白金裝備**）；命名用修仙風。
  原則：**舊裝備照舊**（舊詞條沒有分級、照常生效），新規則只套用到新產生的裝備；整體平均強度與改版前相近。
- **D1：詞綴分級＋部位詞綴池＋前後綴命名**（版本 `20261005p`）
  - 資料（config-enhance.js）：`gearSubAffixes` 每條加 `w`（{ weapon, armor, accessory } 權重，沒寫＝1）、`pre`／`suf`（命名用）；新增 `GEAR_SUB_TIERS`（天 ×1.3、地 ×1.15、玄 ×1.0、黃 ×0.85、凡 ×0.7）、
    `GEAR_SUB_TIER_WEIGHTS`（依裝備等級的 [天地玄黃凡] 權重：Lv.<100 0/0/15/35/50、100～ 0/10/30/35/25、500～ 5/20/35/25/15、1000～ 10/25/35/20/10、2500～ 20/30/30/15/5）、`GEAR_SUB_TIER_NOLEVEL` 500（沒有裝備等級的舊千寶閣商品）。
  - 邏輯（gear.js）：`rollGearSubs(quality, external, count, exclude, category, level, opts)` 依分類權重抽詞條（`gearSubWeight`／`pickGearSubAffix`）、依等級擲分級（`rollGearSubTier`）、
    數值 `rollGearSubValue`＝原本的隨機值 × 品級係數 × 分級倍率；詞條存成 `[key, 值, 分級]`（第三格新加，舊詞條只有兩格）。白金進化多抽的一條也帶等級與分類（enhance.js）。
  - 命名：`getEquipDisplayName` 加 `getGearAffixName(eq)`——最強的詞條給前綴、第二強給後綴（分級高者優先，同級比「數值 ÷ 上限」；舊詞條視為玄級），例「破軍青竹蜂雲劍・不滅」；舊裝備有詞條也會顯示名字（只影響顯示，不改存檔）。
  - 顯示：`formatGearSubs` 每條前面加分級標籤〔天〕〔地〕〔玄〕〔黃〕〔凡〕（各自顏色）。
  - 驗證（本機，橙色 3 條 × 4000 件）：平均分級倍率 Lv.50 0.80、300 0.89、800 0.96、1500 1.01、5000 1.07；「天」級比例 0／0／5.5／9.9／19.9%。
    部位最常出的詞條：武器 攻擊、剋制、雷／毒／火傷；防具 防禦、氣血、體質、回血；飾品 閃避、靈力、靈石、回靈、修為；魔防只出在飾品。背包卡片名字與分級標籤正常（手機名字會換行）；Console 無錯誤。
- **D2：洗煉（新材料 🌀 洗煉石）**（版本 `20261005q`）
  - 存檔：`player.refineStones`（state.js 預設 0；舊存檔讀檔時由預設值補上）。裝備多 `refineIdx`（鎖定的詞條位置）、`refineCount`（已洗次數）、`refinePending`（已付費待選 `{ idx, cands }`，重新整理不會白花）。
  - 來源：分解 `DECOMPOSE_REFINE` 紫 1／橙 2／白金 10（手動、一鍵、暫存區一鍵、背包滿自動分解、鍛造自動分解都給，`getDecomposeYield().refine`、`addRefineStones`）；
    鎮魔塔每層 BOSS `REFINE_ZHENMO`＝(1 ＋ 樓層 ÷ 20) × 問答倍率（結算畫面列出）。
  - 洗煉（enhance.js 強化視窗下方 `renderRefineSection`／`refineEquip`／`chooseRefine`）：選一條詞條 → 花 洗煉石 `REFINE_STONE_BASE` 1 ＋ 已洗次數（最多 `REFINE_STONE_MAX` 10）＋ 靈石 H × 0.5 小時 →
    依該裝備的分類與等級擲 `REFINE_CANDIDATES` 2 條新詞條（不會和其他條重複，可洗回同一種），「保留原本／新 1／新 2」三選一。**第一次洗煉就鎖定該條**，之後只能洗同一條（暗黑 3 規則）。
    只限 850 種圖鑑裝備（有 `gearId` 與詞條；神器、靈寶閣寶物不行）。強化視窗持有列多「🌀 洗煉石」。`gearRollOpts(eq)`（gear.js）傳入遠古／太古的擲骰下限（D3）。
  - 驗證（本機）：分解橙＋紫得 3 顆；洗第 2 條 → 擲出 2 條候選、選第 1 條後詞條更換、鎖定位置 1、下次費用 2 顆；再洗時選第 0 條也只會洗第 1 條；Console 無錯誤。
- **D3：遠古／太古**（版本 `20261005r`）
  - 設定 config-enhance.js 的 `GEAR_ANCIENT`：只對 `GEAR_ANCIENT_QUALITY` 橙色在產生時擲一次（所有管道：鍛造、奪寶、千寶閣、守城…，`createGearEquip` → `rollGearAncient`）。
    遠古 2%：詞條至少「地」級（`minTier` 2）、四維 ×1.1；太古 0.2%：詞條全部「天」級且取範圍上限（`maxRoll`）、多 1 條詞條、四維 ×1.2。存成 `eq.ancient`（1／2）。
  - `gearRollOpts(eq)` 回傳擲骰下限，白金進化多抽的一條、洗煉的候選都套用 → 遠古／太古進化成白金、洗煉後仍維持品質。
  - `createPrimalPlatinumGear(level, ancient)`（2026-10-09，仙府信箱 `rewards.gear` 用，第 56、75 節）：隨機可鍛造部位 → 同等級圖紙鍛造管道的橙裝（`createGearEquip`，noRecord）→ 照 ancient 重擲
    （2 太古：四維 ×1.2、橙 3＋1 條全天級取上限；1 遠古：四維 ×1.1、3 條至少地級；0：不帶遠古／太古、一般 3 條；createGearEquip 隨機擲出的遠古／太古會被蓋掉）
    → 照 `evolveEquip` 進化白金（四維 × `getEvolveStatRatio`、品質屬性、多 1 條、`applyEvolveRaceGearFx`、`ensureGearLegend`）；強化維持 +0、保留橙裝的孔；最後 `recordGearCollected`。改進化或太古規則時這裡要一起改。
  - 顯示：名稱加「遠古・」「太古・」（`gearAncientTag`，在「先天・」之後）；卡片 `getEquipCardClass` 加 `eq-ancient`（金色發光框）／`eq-primal`（赤紅脈動框，`prefers-reduced-motion` 時不動）；
    產生時（非千寶閣上架）寫日誌「🟡 遠古遺寶出土／🔴 太古神兵現世」。
  - **修正：四維倍率在新制沒生效**（2026-10-03，版本 `20261005E`，使用者回報）：`rollGearAncient` 只把 `statMult` 乘在舊制的 `eq.stats`，新制的屬性點由 numeric.js 的 `nv2GearStatsOf`（範本 × 品質 × 強化）算、不讀 `eq.stats`，
    實際只影響魅力。改在 `nv2GearStatsOf` 再乘 `GEAR_ANCIENT[eq.ancient].statMult`（卡片的屬性顯示也跟著變）。驗證：同一件橙甲屬性點合計 1.50 → 遠古 1.65、太古 1.80，人物體質同步增加；Console 無錯誤。
    （武器攻擊 `nv2WeaponAtkOf`、防禦等不受遠古／太古影響，維持原設計「四維」。）
  - 驗證（本機）：橙色 2 萬件 → 遠古 435（2.2%）、太古 34（0.17%）；太古劍 4 條全天級、進化白金後多的一條也是天級（5 條）；遠古戒指 3 條地級；卡片邊框正常；Console 無錯誤。
- **D4：傳奇威能（只出在白金）**（版本 `20261005s`）
  - 設定 config-enhance.js 的 `GEAR_LEGENDS`（20 種，修仙風）：萬劍歸宗（技能連發＋法爆）、不滅金身（每波保 1 血＋氣血）、鏡花水月（閃避後強擊＋閃避）、天罡之怒（普攻群攻＋攻擊）、
    九天玄雷、九幽寒獄、焚天業火、萬毒歸宗（屬性＋對應特效）、破軍殺伐（破甲＋斬殺）、天眼通（洞察＋追擊）、血海魔功（吸血＋噬魂）、太乙回春（回血回靈）、金剛不壞（防禦＋金身）、
    化神護魂（魔防＋化勁）、先發制人（首擊＋燃魂）、疾風迅雷（疾風＋追擊）、五行輪轉（剋敵）、萬獸朝宗（獸魂）、招財進寶（聚財＋奪寶）、悟道通天（悟道＋通玄）。
    **效果全部走既有實作**：`bonus` 的 key（`special:echo／undying／dodgeStrike／rage`、`fx:特效名`、def／eva／mdef／屬性傷害、atkPct／hpPct）由 gear.js 的 `getGearLegendBonusTotals()` 併入 `getBonusTotals()`（fx 不受特效上限，同 fx 多件相加）。
  - 取得：橙色 +20 進化成白金時 `ensureGearLegend(eq)` 隨機一個，存 `eq.legend`（id）；**舊白金**由 save.js 的 `migrateGearLegends()`（`applySaveData` 內）補一個——穿戴中、背包、暫存區都補，已有的不動（只新增欄位）。
  - 重塑：強化視窗「🌟 重塑傳奇威能」`rerollGearLegend()`，花 `LEGEND_REROLL_STONES` 20 洗煉石 ＋ 靈石 H × 2 小時，隨機換成另一種（不會抽到同一個）。
  - 顯示：裝備卡片詞條下方金字「🌟 傳奇威能【🗡️萬劍歸宗】…」（`formatGearLegend`）。
  - 平衡：威能是白金（橙 +20 進化）的終局獎勵，會讓頂尖玩家變強；鎮魔塔／守城的校準配置不含裝備特效，沒有因此重調。
  - 驗證（本機）：橙 +20 進化白金得威能；沒有威能的舊白金存檔、重新整理後自動補上；穿「金剛不壞」防禦 0 → 23.8、金身 22%；重塑換成別種；穿「天罡之怒」野外實戰 15 秒（`hasSetSpecial('rage')` 為 true）；Console 無錯誤。

## 68. 天賦樹（`config-talents.js`、`talent.js`；2026-10-03，版本 `20261005t`）

- **規劃**（使用者 2026-10-03 定案）：依「戰鬥風格」分 6 條路線（不依職業、不依五行——職業已有主修與熟練度、五行已用在本命／共鳴／元神／相剋），讓人物等級重新有意義、build 多樣化。
  防無限膨脹（使用者指出「轉世 100 次就能 6 條點滿」）：轉世點數遞減且封頂、整棵樹點數遠大於可得點數、核心天賦同時最多 2 個。
- **點數**：等級 `TALENT_LEVEL_STEPS`（Lv.1～100 每 10 級、100～1000 每 50 級、1000～10000 每 250 級 → 滿級 64）＋ 轉世 `TALENT_REINCARNATE_POINTS`（第 1～3 次各 +3、第 4～9 次各 +1、之後 0 → 最多 15）＝ **最多 79 點**。
  整棵樹 6 × 28 ＝ 168 點 → 最多點滿約 2.8 條。轉世時 `triggerReincarnate` 清空 `player.talents`；點數不足時（等級降低）`validateTalents()` 全部退回。
- **結構**（`TALENT_BRANCHES`）：⚔️攻伐（暴擊、破甲、斬殺、金傷）／🔮術法（魔法暴擊、法爆、雷冰、連雷）／🛡️金身（防禦、魔防、回血、金身化勁）／💨身法（閃避、命中、追擊、疾風、閃擊、洞察）／
  🐉御靈（獸魂、反震、噬魂、吸血、橫掃）／☯️造化（悟道、聚財、尋鐵、積德、奪寶、丹心）。每條 4 排：第一重 2 個 ×5、第二重 2 個 ×5（需本路線 5 點）、第三重要訣 2 個 ×3（需 12 點）、
  第四重核心 2 個 ×1（需 20 點）。**核心天賦同時最多 `TALENT_KEYSTONE_MAX` 2 個**（全樹合計）。
  核心：血祭（物攻 ×1.35、氣血 ×0.75）、破釜沉舟（暴擊 +10%、防禦減半）、天人合一（術攻 ×1.35、物攻 ×0.7）、萬法歸宗（增益上限 +20%）、金剛（防禦 ×1.5、閃避歸零）、不滅（每波保 1 血、氣血 ×1.1）、
  無相（閃避 ×1.5、防禦歸零）、流光（閃避後強擊、追擊 +8%）、獸神附體（靈寵 +80%、攻擊 ×0.85）、群魔亂舞（普攻群攻、橫掃）、天道酬勤（修為靈石 +15%、攻擊 ×0.9）、點石成金（分解洗煉石 +50%）。
- **加成**：`getTalentBonusTotals()`（以 JSON 字串比對做快取）併入 gear.js 的 `getBonusTotals()`，所以 def／eva／mdef／屬性傷害／fx:特效（不受特效上限）／special: 都走既有實作。
  **天賦不給「攻擊 +%」這類進增益池的加成**（頂尖玩家的增益早已封頂）。新 key：
  `crit`／`magCrit`／`hit`／`critDmg`（elements.js `getPlayerCombatAttrs`；`resolveHit` 暴擊改乘 `attacker.attrs.critDmg`）、`mult:phys／mag／hp／def／eva`（獨立倍率 `talentMult()`：numeric.js 的 `nv2Attack`、`nv2MaxHp`，elements.js 的防禦、閃避）、
  `buffCap`（numeric.js `nv2BuffCap`）、`decomposeRefine`（enhance.js `getDecomposeYield`）。戰力 `nv2CombatPower` 不含天賦暴擊（GM 的戰力 ÷ 攻擊 檢查不受影響）。
- **重置**：`respecTalents()`，前 `TALENT_RESPEC_FREE` 1 次免費，之後 靈石 H × 2 小時 × 已重置次數（最多 ×5）。存檔：`player.talents`、`player.talentRespecs`（state.js 預設值，舊存檔讀檔時補上，只新增欄位）。
- **介面**：人物面板（修仙分頁）「天賦：可用 N 點」→ `#talent-modal`（index.html；6 個分頁按鈕、每排兩格節點卡＋「+1」按鈕，不能點時按鈕顯示原因；核心天賦實線粗框、要訣虛線框）。
- **鎮魔塔**：見第 51 節「天賦樹後的再校準」（以半點天賦為一般玩家，沒點天賦的玩家會變難）。野外、守城的校準基準不含天賦，天賦等於玩家變強。
- 驗證（本機）：點數 Lv.10／50／100／1000／10000 ＝ 1／5／10／28／64，轉世 1／3／9／100 次 ＝ 3／9／15／15，總計最多 79；第二重未投入 5 點時被擋；第 3 個核心被擋；
  血祭 物攻 11 → 15、氣血 189 → 145；金剛 防禦 35 → 52.5、閃避 35 → 0；重置第一次免費、第二次 1,949 萬靈石；轉世後（等級 1、輪迴 100 次）可用 15 點；手機 390×844 視窗正常；Console 無錯誤。
- **修正：天賦面板沒有關閉按鈕**（2026-10-03，版本 `20261005B`，使用者回報）：`#talent-modal` 原本沒有 `.close-btn`，`initModalTopClose`（ui.js）找不到來源按鈕就不會加右上角 ✕。
  index.html 在 `#talent-body` 下方加固定的「關閉」按鈕（`closeModal('talent-modal')`），右上角 ✕ 也跟著出現。⚠️ 新增彈窗時，HTML 裡至少要有一顆 `.close-btn`（或 `[data-modal-close]`），內容由 JS 產生的也一樣。

## 69. 做裝系統（精簡版 POE：四種通貨、鍛紋台、入魔淬煉；`craft.js`；2026-10-03，版本 `20261005u`）

- **規劃**（使用者 2026-10-03 定案）：參考《流亡黯道》做裝，但精簡成 4 種通貨＋鍛紋台；難度選「**C 偏難**」（原提案掉率 ×0.5，一件接近畢業的裝備約 1 個月）；
  **不做毀裝懲罰**（同強化：失敗不掉級、不毀裝），另加可選的賭博「入魔淬煉」（最壞是封印定型，裝備不會消失）。
- **存檔**：`player.craftCur = { tianji, hunyuan, poxu, zaohua }`（state.js 預設；舊存檔讀檔時由預設值補上）。裝備多 `poxuAt`（最後一次破虛石的時間）、`forged`（用過鍛紋台）、`corrupt`（1 入魔／2 走火入魔封印）、`corruptExtra`（入魔大成功多出的詞綴上限）。只新增欄位。
- **通貨**（config-enhance.js 的 `CRAFT_CURRENCIES`；每次使用另扣靈石 H × `CRAFT_COINS_HOURS` 0.5 小時）：
  | 通貨 | 效果 | 野外每隻 | 其他來源 |
  |---|---|---|---|
  | 🔷 天機石 | 整件詞綴重擲品級與數值（種類不變） | 1/4000 | 鎮魔塔每層 10%；分解橙裝 5% |
  | 💠 混元晶 | 整件詞綴全部重洗（種類、品級、數值，條數不變；洗煉鎖定解除） | 1/8000 | 鎮魔塔 30 層起 15%；守城每 20 波 1 顆 |
  | ⚫ 破虛石 | 隨機刪一條詞綴；之後 24 小時（`CRAFT_POXU_LOCK_MS`）這件不能用造化玉／鍛紋台 | 1/20000 | 鎮魔塔樓主層（每 10 層）50% |
  | 🔮 造化玉 | 加一條隨機詞綴（不超過 `craftSubCap`＝品質條數＋太古 1＋入魔 1） | 1/80000 | 鎮魔塔 50 層起樓主層 12.5%；分解太古裝 1 顆 |
  鎮魔塔機率 × 問答倍率（最高 100%，`rollCraftZhenmo`）；野外以實際擊殺數擲（`onCraftFieldKills`，combat.js），離線／背景用同掉率（save.js，結算訊息列出）。
  每天掛機 24 小時（約 2.8 萬隻）期望：天機 7、混元 3.5、破虛 1.4、造化 0.35。
- **鍛紋台**（`forgeCraftSub`）：從該部位可出的詞綴中指定一條（品級依裝備等級隨機），花 🌀 50 洗煉石＋🔮 2 造化玉＋靈石，**每件限一次**；詞綴滿了要先破虛。
- **入魔淬煉**（`corruptEquip`，`CRAFT_CORRUPT`）：花 🌀 20＋💠 1＋靈石，每件限一次。30% 大成功（一半機率多一條詞綴可超過上限，否則隨機一條升為天級）、30% 隨機一條品級 +1（已是天級則數值拉滿）、25% 無事、
  15% 走火入魔：隨機一條降一級並 `corrupt = 2` 封印——之後不能洗煉（`canRefine` 擋下）也不能做裝，屬性照常生效。
- **挑戰模式**（第 70 節）：越級地圖的做裝通貨掉率 × `getChallengeCraftMult()`（`onCraftFieldKills`）。
- **交易**：入魔淬煉過（`corrupt` 1 或 2）的裝備不能寄售；洗煉石與四種通貨可以寄售（「⛏️ 材料」分類，第 58 節）。
- **介面**：強化視窗洗煉區下方 `renderCraftSection`（持有數、四顆通貨按鈕、鍛紋台下拉選單、入魔淬煉）；裝備卡片詞條下方 `formatGearCraftTag`（😈 已入魔／走火入魔・封印、⚒️ 已鍛紋）。
  分解（手動、一鍵、暫存區、背包滿自動、鍛造自動）都會擲做裝通貨並寫在日誌。
- **驗證**（本機）：Lv.2500 橙劍依序用天機／混元／造化（滿了被擋）／破虛（冷卻 24h、造化被擋）／鍛紋台都正常；入魔 2000 次：走火 16%、多一條 15%、其餘符合；封印後洗煉與混元都被擋；
  野外 10 天份擊殺得 天機 69／混元 34／破虛 14／造化 4（符合期望）；鎮魔塔 1～100 層一輪 天機 15／混元 10／破虛 4／造化 1；存檔重新整理後通貨保留；野外實戰 15 秒；Console 無錯誤。

## 70. 挑戰模式（全地圖開放；`map.js`；2026-10-03，版本 `20261005w`）

- **規劃**（使用者 2026-10-03 定案，原「最多越 1 個大境界練功」的門檻改成可確認後越級）：
  1. 進入前跳警告：境界差、妖獸攻擊／氣血是自己主修地圖的幾倍，要按確定。
  2. **戰死照常有死亡懲罰**（折壽、遺失 10% 靈石、回宗門；壽元歸零刪檔），玩家自己承擔——沿用 combat.js 的 `onPlayerKilledInField`，沒有另外處理。
  3. 不能離線／背景掛機：`settleIdleSeconds`（save.js）一開始就把挑戰地圖的玩家退回宗門、沒有野外收益（也堵住線上撐過 60 秒就信任的 `idleProvenMap`）。
  4. 收益不超標：每隻的經驗（`expRate`）、靈石（`rollKillCoins`）、聲望（`rollKillReputation`）、刷新補償（`getKillRewardMult`）、收益速度上限（`nv2RewardSpeedAdj`）、化神訣殘本的境界判定，全部改看 `getRewardMap()`——
     挑戰中＝自己境界的主要練功地圖（`getMainMapForRealm`，config-realms.js 的 `realmPacing[境界].map`），否則＝所在地圖。所以每小時收益最多等於在主要地圖練功。
  5. 專屬獎勵：做裝通貨（第 69 節）掉率 × `CHALLENGE_CRAFT_MULT`（config-maps.js）[1, 1.5, 2, 3]，索引＝越過門檻幾個境界（`getChallengeOver`＝地圖門檻 − 自己境界；越 1 → ×1.5、2 → ×2、3 以上 → ×3）。
- **判定**：`isChallengeMap(item)`＝野外地圖且 `player.realmIndex < getMapMinRealm(item)`（不存旗標，突破境界後自動變回一般地圖）。只放寬境界門檻；四維門檻、暫存區滿照舊擋下。
- **入口**：`getMapEntryBlock` 的境界不足回傳 `{ realm: true, short: '⚔️挑戰' }`；`selectMap`／`changeMap` 遇到時呼叫 `confirmChallengeMap`（遊戲內 `gameConfirm`；取消時留在地圖視窗），確定後 `changeMap(c, i, true)` 再 `afterMapArrive`（從 selectMap 拆出的「關世界地圖、切戰鬥分頁」）。
  靈界地圖紅點（town.js）顯示「⚔️挑戰」，`goToMapByName` 不再擋境界；地圖清單按鈕顯示「⚔️ 挑戰模式進入」／「⚔️ 挑戰中」；奇遇的機緣任務（encounter.js）仍只挑進得去的地圖。
- **驗證**（本機）：金丹選鬼谷八荒（煉虛）→ 警告「境界差 3、攻擊 5.8 倍、氣血 6.1 倍、通貨 ×2」；取消留在地圖視窗；確定進入後收益地圖＝上古遺跡（每隻靈石基數 250，而非鬼谷八荒的 2450），強化角色 20 秒得約 3000 靈石；
  背景結算 →「挑戰模式不能離線／背景掛機，已退回宗門」；弱角色 15 秒內戰死、折壽 5.1 年、回宗門；Console 無錯誤。

- **可掛機＋碎片／圖紙掉率提升**（2026-10-06，版本 `20261005CE`，使用者：「挑戰模式 設定可掛機練功」「挑戰模式下 武學碎片，裝備圖紙掉落機率提升」；倍率與圖紙掉率使用者未指定，先用下面這組）：
  - **取代上面第 3 點**：`settleIdleSeconds`（save.js）不再把挑戰地圖的玩家退回宗門；撐不撐得住照一般的實力估算（妖獸看所在的挑戰地圖、線上撐過 60 秒的 `idleProvenMap` 也信任），撐不住照常退回。
    離線／背景的經驗、靈石、聲望改用 `getRewardMap()`（挑戰中＝自己境界的主要地圖；原本直接用 `player.currentMap`，以前挑戰不能掛機所以沒差），收益不超過在主要地圖掛機。
  - **武學秘典碎片**：`rollSpellShardFieldDrops`（spells.js）× `getChallengeCraftMult()`（越 1 境 ×1.5、2 境 ×2、3 境以上 ×3，同做裝通貨）；離線的做裝通貨也改成乘這個倍率（原本離線固定 ×1）。
  - **鍛造圖紙**：挑戰地圖野外新增掉落 `rollBlueprintChallengeDrops(rolls, silent)`（equipment.js）：每次掉寶 `BLUEPRINT_DROPS.challengeField` 1/6000 × 挑戰倍率，再經 `grantBlueprint`（等級規則與 5000 等以下 ×2，第 55 節）→ 每小時約 0.6～1.2 張；一般地圖不掉。
    線上 combat.js 用掉寶次數、離線 save.js 用收益次數，結算訊息列「📜 挑戰模式斬殺妖獸，獲得鍛造圖紙 ×N」。
  - 進入警告與進入日誌改寫：「可離線／背景掛機（撐不住照常退回）」「做裝通貨、武學秘典碎片掉率 ×N，並有機會掉落鍛造圖紙」。

## 71. 野外掉寶：每小時封頂＋難圖補償（`combat.js`；2026-10-03，版本 `20261005A`）

- **問題**（使用者問「同境界低等地圖掉寶率有比較低嗎」）：經驗／靈石／聲望有「刷新補償 × 收益速度上限」（第 52 節），每小時最多等於該地圖一般玩家；
  但做裝通貨、剋制法寶、化神訣殘本是**每隻固定機率、照實際擊殺數擲**，強者到低等地圖秒怪每小時多掉約 2.7～4 倍，挑戰圖殺得慢反而只有普通圖的約 1/5。
  另外做裝通貨的掉率（第 69 節）是以「每小時約 1160 隻」設計，新制一般玩家實際每小時只殺約 200 隻，等於掉得比定案的難度表少約 6 倍。
- **使用者選 1＋2**（每小時封頂＋難圖補償；不做「低等地圖打折」）：
  - `takeDropRolls(kills)`：想要的掉寶次數＝擊殺數 × `nv2KillRewardMult(所在地圖)`（一般玩家在任何地圖每小時都是 1200 次，難圖每隻多擲），
    但不能超過額度 `dropBudget`——野外每秒 `tickDropBudget()` +1/3、最多存 `DROP_BUDGET_MAX` 60 → **殺再快每小時也最多 1200 次**。用實際秒數封頂，不靠收益速度估算（實測秒怪時估算仍會讓經驗多約 1.5 倍）。
  - 做裝通貨擲 rolls 次（回到難度表的每小時量）；剋制法寶、化神訣殘本擲 rolls ÷ `getDropBaseMult()`（自己境界主要地圖的補償）次，一般玩家在主要地圖每小時掉量和改版前相同。
  - 野外修士、暗殺者的每波遭遇機率再 × `waveRewardAdj`（殺太快不會多遇修士、多掉星允鐵與奪寶裝備）。
  - 挑戰模式（第 70 節）用**所在地圖**補償（經驗則照主要地圖），所以越級的掉寶照實際難度給，再乘做裝通貨 ×1.5～×3。
  - 離線／背景：做裝通貨改用收益次數 `combatTicks` 擲（同線上 1200 次／小時基準 × 離線速率）；法寶、殘本仍用實際擊殺數（離線本來就有速率上限）。
  - `rollFieldHuashenScroll` 的次數可為小數（整數部分必擲、小數部分擲一次）。
- **驗證**（本機，線上實戰）：渡劫一擊必殺去天南（元嬰圖）60 秒：擊殺每小時 540 隻、掉寶次數每小時 1080（上限 1200；改前照擊殺數且通貨不補償）；去天淵戰場 40 秒：870 次／小時（未超過上限）；Console 無錯誤。

## 72. 防竄改：建置混淆、隱藏全域變數、存檔簽章、合理性檢查（`tools/build.js`、`integrity.js`；2026-10-03，版本 `20261005I`）

- **目的**（使用者 2026-10-03「要如何讓玩家無法竄改資料」，選 1～4 全做）：純前端無法 100% 防止，目標是擋住一般玩家用主控台、文字編輯器改資料，並讓被改過的存檔碰不到牽涉其他玩家的功能（戰力榜、寄售）。
- **① 建置＋混淆（`tools/build.js`、`package.json`）**：`npm ci && node tools/build.js` → `dist/`。
  - index.html 的 113＋支 `data/*.js` 依原順序接成一支，包進 `(function(){ … })()`：`player`、`enemies` 與所有函式都變成區域名稱，**主控台打 `player.coins = …` 會出現 player is not defined**。
  - **事件字串**（HTML／模板字串的 `onclick="…"` 等、config 的 `action: "…"`（town.js 用 `new Function` 執行）、活動的 `openFn: "…"`（activity.js 的 `window[act.openFn]`））用到的頂層函式，建置時自動掃描後掛回 `window`
    （約 256 個，都是「按按鈕」本來就能做的事）；**另外，程式裡任何「剛好是頂層函式名稱」的字串字面值（`'bulkDismissServants'` 這種）也一併掛回**——函式名稱以字串傳進去再組成 `onclick="${fn}()"` 的寫法（ui.js 的 `renderBulkDeleteBar(…, deleteFn)`、activity.js 的 `fnName`）掃描不到事件字串，2026-10-04 版本 `20261005W` 起靠這條規則（之前混淆版的「一鍵解僱僕從」「一鍵刪除裝備」按了沒反應）；用到的頂層變數用 getter／setter 掛回（`refineSelIdx`、`craftForgeKey`、`mkForm`、`LINGJIE_SCENE_KEY`、`WORLD_SCENE_KEY`）。
    `player`、`enemies`、`DefenseBattle`、`ZhenmoTower` 列在 `FORBIDDEN`，事件字串裡直接用到會建置失敗（守城的「重新載入」因此改成 `retryDefenseBattle()`）。
  - ⚠️ **寫程式的新規則**：事件字串裡只能呼叫頂層函式（或上述變數），不要寫 `player.xxx`；程式內不要用 `window.某函式 = …` 來替換遊戲函式（包起來後替換不到遊戲用的那個，servant.js 的日誌靜音已改成直接 `addLog = …`）。
  - terser：compress 2 輪＋mangle（函式範圍內名稱全換）、移除註解；1293 KB → 684 KB。HTML 註解一併移除。gm.html 的 data 腳本另接成 `data/gm-lib.js`（只壓縮，不包範圍，GM 頁內嵌程式要用全域名稱）。
  - 不複製到 dist：`*.md`、`tools/`、原始 `data/*.js`、`package*.json`、`.` 開頭的檔案。sw.js 照舊從 index.html 找 `data/…?v=` 預先快取（現在只有 game.js 一支）。pwa.js 的 `document.currentScript` 在 game.js 裡同樣取得版本號。
  - **開發與測試照舊用原始 index.html**（各檔分開、全域），Playwright 測試不用改；發佈前另外 `node tools/build.js`、在 `dist/` 開伺服器跑一次（掃描畫面上所有 on* 事件的函式都存在於 window）。
- **② 發佈（`.github/workflows/pages.yml`）**：main 有新提交 → checkout → `npm ci` → 建置 → `upload-pages-artifact`（dist）→ `deploy-pages`。
  **需要作者一次性設定**：GitHub 倉庫 Settings → Pages → Build and deployment → Source 選「**GitHub Actions**」。在那之前網站照舊直接提供原始檔（不混淆、但功能正常），Actions 的 deploy 步驟會失敗。
  配合「原始碼倉庫改私人」（需 GitHub Pro）就連原始碼也看不到。
  - 實測（2026-10-03 合併 PR #27）：Source 還是「Deploy from a branch」時，push 到 main 會**兩個流程都跑**（內建的 pages build and deployment 發原始檔＋本流程發 dist），哪個最後完成網站就是哪一版（那次剛好是混淆版）。
    切到「GitHub Actions」後只剩本流程。檢查方式：Actions 頁面，最新一次 push 只出現「Build & Deploy Pages」、沒有「pages build and deployment」＝已切換；線上 index.html 只載入 `data/game.js?v=…`＝混淆版。
- **③ 存檔簽章（`integrity.js`）**：`igSign` = 兩次 cyrb53（各帶 `IG_SALT`）共 32 位十六進位。
  - 本機存檔：`saveLocal` 寫入 `igPrepareSave()`＝`JSON.stringify(player)`（含 `_ig: 1`）尾端再嵌 `"_sig":"…"`（同一次寫入，多分頁不會錯開）；`loadLocal` 在 `applySaveData` 前 `igVerifyLocal(data)`（拿掉 `_sig`、重新 stringify 比對）。
    沒有 `_ig` 的改版前存檔直接接受（下次存檔補簽）；有 `_ig` 但簽章不符或遺失 → `flagSave('存檔內容被修改')`。讀檔失敗時顯示的原始存檔代碼也帶 `_sig`，貼回匯入一樣驗證得過。
  - 存檔代碼：`exportSave` 匯出 `igSignedCopy(player)`；`confirmImportSave` 解析後 `igVerifyImport(data)`，第一次按時提示驗證結果，匯入後套用標記。
    沒有簽章的舊代碼：存檔時間早於 `IG_UNSIGNED_UNTIL`（2026-10-06 00:00 台灣時間）才接受，否則視為被修改。攻略試算（openGuideCalc）不簽。
- **④ 合理性檢查**：`player.audit = { play, max, used }`。`play`＝線上每秒（integrity.js 頂層 setInterval，遊戲開始、未結束、讀檔沒失敗時）＋離線／背景結算秒數（`settleIdleSeconds` 開頭）。
  `igProgressHours()`＝realmPacing 節奏時數（已過境界合計＋目前境界的經驗比例：第 k 階需 k 份、一個境界 55 份）。每次存檔 `igAuditCheck()`：進度超過歷史最高 `max` 的部分累加到 `used`（轉世後重爬不計）；
  `used > 2 小時 + 遊玩小時 × IG_SPEED_MAX(60，2026-10-05 前為 10)` → `flagSave('修煉進度過快…')`。改版前的存檔以第一次讀取時的進度為起點。靈石等其他數值目前不檢查（來源太多，容易誤判）。
- **標記的效果**：`player.integrity = { flagged, reason, at }`（存在存檔裡、受簽章保護）。戰力榜上傳與守城送審略過、戰力榜頁顯示原因（leaderboard.js）；寄售上架與出價擋下（market.js）。**不刪檔、不擋單機遊玩**（避免誤判害玩家失去進度）。
- **驗證**（本機）：改版前存檔讀取不標記且補簽；正常重新整理不標記；用文字改本機存檔的靈石 → 標記「存檔內容被修改」；匯出代碼原樣匯入通過、改過靈石再匯入 → 標記；新角色直接改成渡劫 → 標記「修煉進度過快」；標記後寄售被擋。
  建置版：主控台 `typeof player` 為 undefined、`player.coins = …` 失敗；開 28 個畫面後掃描所有 on* 事件，缺少的函式 0 個；野外戰鬥、存讀檔、gm.html 正常；Console 無錯誤（只有沙箱連不到外部的憑證錯誤）。

- **一次性解除標記**（2026-10-05，版本 `20261005BS`，使用者：「把被系統標記的玩家解除標記」）：integrity.js 的 `IG_AMNESTY_AT`（2026-10-05 17:00 台灣時間）＋ `igAmnesty()`，由 save.js 的 `applySaveData`（讀檔與匯入共用）呼叫：
  `player.integrity.at` 早於該時間的標記清除，`audit.max` 重設為目前進度、`audit.used` 歸 0（避免「修煉進度過快」下次存檔又被標回），寫一則系統日誌。之後的新異常（含這次讀檔才發現的簽章不符）照常標記。
  標記存在玩家自己的存檔裡，所以玩家要更新到這版並開一次遊戲才會解除；GM 封鎖（黑名單 `banned`）是另一回事，不受影響。
- **門檻 10 → 60 倍**（2026-10-05，版本 `20261005BT`，使用者：「先把門檻改成 60 倍」）：`IG_SPEED_MAX = 60`。玩家「糊道友」（空靈根＋混沌體、萬界仙門、狐＋蛟龍、全白金 +20、在上蒼掛機）實測 40 倍被標記；
  分析：合法配置（宗門×靈寵×(1＋悟道)、越級進高經驗地圖）中期就有 20～25 倍，再加上 `nv2RewardSpeedAdj` 用單體估算（沒算群攻、靈寵、夥伴）讓實際收益超過上限約 3.6 倍以上。
  「修煉進度過快」標記新增 `speedMax`（判定時的門檻）；`igAmnesty` 另外解除「門檻比現在低時判的」進度過快標記（舊標記沒有 speedMax 視為 10），之後再調高門檻也會自動解除。收益上限漏洞尚未修（待使用者決定）。

## 73. 只有從大地圖進入才觸發特殊事件（`map.js`；2026-10-04，版本 `20261005N`～`O`）

- **規則**（使用者指定：「從右上地圖快捷鍵進入地圖無法觸發特殊事件」→「要從大地圖進入才會觸發」）：只有從**大地圖**進入地圖才呼叫 `onEncounterMapChange`（奇遇的秘密路線、野外累計次數、空間裂縫、三界召令、城中機緣、機緣任務的「前往」步驟，第 63 節）。
  | 進入方式 | 觸發 |
  |---|---|
  | 人界地圖分區（worldRegions 的 `openMapCategoryModal(n)` → 清單的 `selectMap(c, i, true)`）、人界城鎮紅點（`goToTownByName` → `goToTown(i)`）、靈界紅點（`goToMapByName`） | ✅ |
  | 洞府「宗門」鈕回宗門（`returnToSect`；秘密路線 宗門→天南城→天星城→宗門 的起點與終點只能這樣回） | ✅ |
  | 修仙地圖彈窗 `#world-map-modal`（人界地圖右上「地圖列表」、世界導覽、PC 傳送門）的區域按鈕 `openMapCategoryModal(n, true)` 與城鎮卡片 `goToTown(i, true)` | ❌ |
  | 系統傳送 `changeMap(0, 0)`：戰死回宗門、渡劫失敗、暫存區滿 | ❌ |
- **實作**：`changeMap(c, i, challengeOk, bigMap)` 只在 `bigMap` 時呼叫；`selectMap(c, i, bigMap)`、`confirmChallengeMap(c, i, bigMap)` 往下傳；`openMapCategoryModal(catIndex, quick)` 在清單按鈕寫入 `selectMap(c, i, true)`（quick 時不帶）；`goToTown(i, quick)` 傳 `!quick`。
- 驗證（本機）：快捷清單進野外、進城鎮 → 不觸發；人界分區進野外、人界紅點進城、洞府回宗門 → 觸發；戰死回宗門 → 不觸發；建置版正常；Console 無錯誤。
- **快捷清單拿掉第四、五區**（2026-10-04，版本 `20261005P`，使用者指定）：`#world-map-modal` 只剩 落雲宗周邊／慕蘭草原／大晉王朝區域／無邊海 四顆區域按鈕；第四、五區只能從**靈界大地圖**的紅點進入（會觸發特殊事件）。
  第四區新搬入的 九天仙域／太初古礦／上蒼原本沒有靈界紅點，config-towns.js 的靈界 `hotspots` 補上 `lj-jiutian`（玄武境東邊天空海，圖上 (630, 225)）、`lj-taichu`（角蚩族北側，(720, 245)）、`lj-shangcang`（海王族島南岸，(640, 395)，標籤「上蒼」）。
  驗證：靈界地圖十個紅點不重疊（PC 1280 寬截圖）、點九天仙域傳送成功；快捷清單只剩四顆按鈕；Console 無錯誤。

## 74. 靈界進出：五行傳送陣靈石、天元城（`lingjie.js`；2026-10-04，版本 `20261005Q`）

- **規則**（使用者指定）：人界地圖飛升點要 **金、木、水、火、土傳送陣靈石各 1 顆**才能進入靈界；進入後**不能直接離開**，返回人界同樣要一套。靈界地圖人族聚居區新增城池 **天元城**，點了顯示城池圖（使用者提供 1408×768 插畫 `images/maps/tianyuan-city.jpg`）。
- **存檔**：`player.lingStones = { 金, 木, 水, 火, 土 }`、`player.inLingjie`（state.js 預設；`migrateLingjie(data)`：改版前就待在第四、五區的玩家視為已在靈界）。
- **飛升**：CITY_GATES「飛升點」加 `lingjie: true`，town.js 的 `enterCityGate`（改成 async）在播光柱之前 `await prepareLingjieEntry()`——已在靈界直接放行；不夠就遊戲內提示持有數；夠就確認、扣一套、`inLingjie = true`、存檔。提示文字 `hint` 可為函式（顯示持有數）。
- **身在靈界**：世界導覽 `openWorldTab` → `openCurrentWorldScene()` 開靈界地圖；靈界地圖右上「↩ 返回人界（需五行傳送陣靈石）」→ `leaveLingjieToWorldMap()`；洞府「宗門」鈕 `returnToSect` → `tryLeaveLingjie`（付款後回宗門）。
  付款離開時人在第四、五區的地圖會落地回宗門。`getMapEntryBlock`：第四、五區（`LINGJIE_MAP_CATEGORIES`）沒在靈界 →「🔒靈界」；在靈界去人界的地圖（宗門除外）→「🔒人界」（快捷清單也擋）。
  **系統送回宗門**（戰死、渡劫失敗、暫存區滿的 `changeMap(0, 0)`）＝回到人界、不扣靈石（`changeMap` 在目的地不是靈界分類時清掉 `inLingjie`）。
- **取得**（`LINGJIE_STONE_DROP`，config-towns.js）：`nv2L ≥ 9` 的野外（無邊海、第四、五區）每次掉寶（combat.js 的 `takeDropRolls`，第 71 節）每種 1/2400 → 每小時每種約 0.5 顆、約 2 小時湊一套；離線用收益次數同率（結算訊息列出）；鎮魔塔 60 層起每層 BOSS 25% × 問答倍率掉 1 顆（隨機一種）。背包顯示「💎 五行傳送陣靈石」卡片。
- **天元城**：靈界 hotspots `lj-tianyuan`（人族聚居區城堡圖示 (415, 282)）→ `openCityGate('天元城')`；CITY_GATES 新增 `backLabel: "↩ 返回靈界"`（openCityGate 依此改返回鈕文字），點圖目前只提示「城內尚未開放」。
- **天元城內城與靈界復活點**（2026-10-04，版本 `20261005U`，使用者提供 848×1264 內城插畫 `images/towns/tianyuan-inner.jpg`：「設定成天元城內城；玩家復活會回到城外；內城設定少數建築物，如任務榜、茶樓」）：
  - config-maps.js 新增分類 **索引 7「靈界城鎮 (安全區)」**：`天元城外`（復活點）、`天元城`（內城），都 `hidden`、屬於 `LINGJIE_MAP_CATEGORIES`（[4, 5, 7]）——不在靈界進不去，在靈界待在這裡不會被清掉靈界狀態。
  - 靈界地圖天元城紅點 → 城門圖（CITY_GATES）→ 點圖 `enterLingjieTown('天元城')`（傳送＋開城內場景）。`townScenes["天元城"]`：任務榜（內城門前，`openDailyQuestModal()` 每日任務）、茶樓（左側天元茶館，`openTeaHouse()`：回滿氣血靈力＋隨機一則 `LINGJIE_TEA_RUMORS` 傳聞）；右上「↩ 靈界地圖」。
  - **2026-10-04 版本 `20261005V`**（使用者：「任務榜跟人界的分開；新增大道商行，販賣傳送石，一顆一億靈石」）：
    - **靈界任務榜**（`openLingjieQuestModal`／`renderLingjieQuests`／`claimLingjieQuest`，`#lingjie-quest-modal`）：`player.lingQuests = { date, list }`，每天 `LINGJIE_QUEST.count` 3 個（從 4 種模板隨機），和人界每日任務完全分開。
      種類 any（任一靈界野外）／map（從玩家階數夠的靈界野外挑一張）／race（從那些地圖會出現的種族挑一個）；進度只在**身在靈界、靈界分類的野外**線上擊殺時累計（combat.js 呼叫 `onLingjieKills(killedCount, raceKilled)`）；
      獎勵 每小時收入 ×2～4 的靈石＋做裝通貨，部分任務給 1 顆隨機屬性傳送陣靈石。
    - **大道商行**（`openLingjieShop`／`buyLingStones(k, n)`／`buyLingStoneSet`，`#lingjie-shop-modal`）：天元城右側「大道商行」招牌；傳送陣靈石每顆 `LINGJIE_SHOP_PRICE` 1 億靈石，可買 1 顆、5 顆或一套（五種各 1、5 億）。
  - **復活點** `getRespawnPoint()`／`sendToRespawn()`／`respawnPlaceName()`（lingjie.js）：身在靈界＝天元城外（`LINGJIE_RESPAWN_MAP`），否則宗門。戰死（combat.js）、渡劫失敗（tribulation.js）、暫存區滿（enhance.js）、離線／背景撐不住、挑戰模式離線、暫存區滿離線（save.js）都改用它——**在靈界戰死不再免費回人界**。
- 驗證（本機）：沒靈石點飛升台 → 提示、不進；有一套 → 確認後扣除、進靈界地圖；在靈界快捷清單去天南城被擋、洞府回宗門靈石不足被擋、付款後回宗門且第四區再被擋；戰死回宗門清掉靈界狀態；
  世界導覽依狀態開靈界／人界；掉落 2400 次掉寶約各 1 顆；天元城手機／PC 顯示正常、返回靈界；Console 無錯誤。
- **改名：傳送陣靈石**（2026-10-04，版本 `20261005R`，使用者說明「傳送陣靈石，非普通貨幣的靈石；是另外生成的通貨，可放置在背包內」）：畫面文字「極品靈石」全部改成「傳送陣靈石」（例「金屬性傳送陣靈石」），
  避免和貨幣「靈石」混淆；背包改成每種一張道具卡（🟡金／🟢木／🔵水／🔴火／🟤土 屬性傳送陣靈石 ×數量）。存檔欄位 `player.lingStones` 不變。
- **背包圖示**（2026-10-04，版本 `20261005S`）：使用者提供五行靈石合成圖，裁成 `images/items/lingstone-{metal,wood,water,fire,earth}.jpg`（192×192），config-towns.js 的 `LINGJIE_STONE_IMG`；背包卡片頂端顯示 96px 圖。
  （同時詢問的「背包容量 500 格」：裝備背包 `MAX_EQUIP_INVENTORY` 2026-10-01 起已是 500；道具（丹藥、材料、靈石類）沒有上限，未改動。）

- **至高聖地與宗門設施移到天元城**（2026-10-04，版本 `20261005AE`，使用者指定）：
  - 第三段宗門（至高聖地，tier 3）**只能在靈界拜入或回歸**：sect.js 的 `isSectTierHere(tier)`——身在靈界只列 tier 3，人界只列 tier 1、2（`renderSects` 篩選、頂端加說明；`joinSect` 也擋）。已拜入的宗門技能與目前所屬不受影響。
  - `townScenes["天元城"]` 新增熱點：「至高聖地」（上方宮殿 [330, 130, 240, 130]，`openSectModal()`）、「宗門設施」（右上樓房 [555, 300, 130, 110]，lingjie.js 的 `openLingjieFacility()` → `#lingjie-facility-modal`）。
  - 宗門設施只放人界「不在宗門也能用」的五項：尋訪仙門（至高聖地）、丹藥堂、修仙背包、僕從小屋、洞府產業；門派任務、靈田、靈獸園、靈寶閣、藏書閣、鍛造閣、煉丹房、符寶坊在人界本來就要身在宗門（ui.js），靈界不提供。
  - **追加靈獸園**（2026-10-04，版本 `20261005BJ`，使用者：「天元城的宗門設施沒有靈獸園，要新增」）：`#lingjie-facility-modal` 加「🐾 靈獸園」→ `openBeastModal()`（beast.js 只檢查已拜入宗門，不看所在地），靈界也能兌換、復活、出戰／召回靈寵、選技能。

- **青瀾島島景**（2026-10-04，版本 `20261005AJ`，使用者提供 1408×768 插畫 `images/maps/qinglan-island.jpg`：仙人亭、瀑布、雲海、垂釣老者）：人界地圖右下「青瀾島」分區浮起後
  改開 `openCityGate('青瀾島')`（`CITY_GATES["青瀾島"]`），顯示島景圖與「青瀾島・仙人亭（點擊圖片登島）」；點圖目前只提示「青瀾島尚未開放」，島上玩法決定後把 action 換掉即可。
  - **島內**（同日版本 `20261005AK`，使用者提供 1408×768 插畫 `images/towns/qinglan-inner.jpg`：桃花渡口、涼亭、小攤、春和堂、碼頭）：點島景圖 → `openTownScene('青瀾島')`（`townScenes["青瀾島"]`「青瀾島・桃花渡」，不換所在地圖）。
    熱點：春和堂 [900, 255, 220, 235]、涼亭 [360, 100, 300, 260]、小攤 [555, 380, 200, 180] 先提示敬請期待；「⛵ 搭船離島」[70, 520, 500, 220] 回人界地圖。
  - **只能搭船離島**（版本 `20261005AL`，使用者指定）：`townScenes` 新增選填 `noLeave: true`（town.js 的 `openTownScene` 隱藏左上 `#town-scene-leave`「↩ 離開」），
    青瀾島不設 `extraButton`（右上沒有返回人界）；另新增選填 `focusX`（圖寬 0～1，`layoutTownScene` 窄螢幕的起始視角，沒設＝置中），青瀾島 0.3＝手機一開始就看得到碼頭小船。
  - **碼頭確認、涼亭改背景、隱藏仙翁**（版本 `20261005AM`，使用者指定）：「⛵ 搭船離島」改呼叫 town-npc.js 的 `leaveQinglanIsland()`（`gameConfirm`「是否搭船離開青瀾島？」）；涼亭熱點移除（純背景）。
    隱藏仙翁＝青瀾島的 `hiddenNpcs`（`kind: 'xianweng'`、`chance` 0.2、`minCha` 10000）。**去背版**（版本 `20261005AN`，使用者：「去背景，讓玩家不注意會忽略，人物身高比例要正常」）：
    沿島景圖垂釣老者的輪廓（多邊形，含斗笠、鬍鬚、雙袖、雙手）裁出，身高約 117px（同一張圖的路人約 130px），站在涼亭正面兩根前柱之後 [503, 363, 55, 94]：
    前柱（x 500～515、540～552）與欄杆（y 457 以下）擋住的部分直接透明，只露出柱間的上半身；對話視窗另用全身圖 `npc-xianweng-portrait.png`（148×315，`portrait` 欄位）：
    **垂釣版**（版本 `20261005AO`，使用者確認位置：「老翁要面對涼亭角的河面釣魚」；沒有背影圖，使用者選擇沿用正面去背圖）：全身圖左右鏡像（釣竿朝左）、約 117px，
    站在涼亭左前角台基上 [345, 369, 55, 117]（取代上面的前柱遮擋版）；npc 新增 `fishing: { hand, tip, hook }`，town-npc.js 的 `getTownNpcEffects` 畫竿（手→竿尖）、
    釣線（竿尖→水面）SVG 與三圈漣漪（`.tnpc-*`，CSS 動畫），town.js 的 `renderTownHotspots` 併進場景效果層（不擋點擊）。之後有背影圖只要換 `npc-xianweng.png`。
    **暫時隱藏**（版本 `20261005AP`，使用者：「仙翁先隱藏，出現條件等會新增」）：`enabled: false`（`rollTownNpcs` 略過；hiddenNpcs 通用欄位），出現條件定案後改 true。
    **低語**（版本 `20261005AS`，使用者：「仙翁出現有沒有一些低語」）：npc 新增 `whispers: { firstMs, everyMs, showMs, at, lines }`（10 句）；仙翁在場時 town-npc.js 的 `startNpcWhispers` 每 15 秒在頭頂浮出淡色楷體小字、
    6 秒內上飄消散（`.npc-whisper`，與路人閒聊共用 `#town-chatter` 層；路人說話只清自己的對話框）；仙翁離開（`removeTownNpc`）或離島（`closeTownScene`）停止。
    **聽完低語才能對話、兩個小遊戲**（版本 `20261005AT`，使用者指定）：`whispers.inOrder`（依序說）＋`unlockAfterAll`（10 句說完、最後一句飄完才 `hit.heardAll`，重畫人偶變成可點並加 `.awake` 金光呼吸；約 2 分半）；
    之前人偶沒有 action（點了沒反應）。對話選項改為「🎣 仙翁釣魚」「♟️ 玲瓏棋局（五子棋・困難）」「↩ 告辭」：兩個遊戲製作中（提示敬請期待、仙翁留著），告辭＝當天不再出現。
    釣魚畫面先做示意圖給使用者確認（直式：上方仙翁台詞、浮標與漣漪、右側「魚的位置」條＋綠色收線框、收線進度條、漁獲欄、按住收線鈕）。
    **兩個小遊戲上線**（版本 `20261005AU`，使用者指定：「釣魚 3 竿，各種材料，最高等的魚 20% 掉金木水火土極品靈石其中一樣 1 顆；玲瓏棋局輸沒有懲罰（機緣未到），贏 40% 得五行靈石其中一種 1 顆，可下三盤」；
    「極品靈石」＝傳送陣靈石 `player.lingStones`）：新檔 `xianweng-games.js`、設定 `XIANWENG_GAMES`（config-towns.js）；每天次數 `player.xianweng = { date, fish, chess }`（用到才建立，跨日歸零；仙翁還沒出現前不會建立）。
    仙翁對話按鈕顯示今日剩餘次數；次數用完選該遊戲＝提示後回到對話；玩完（還竿／離席）仙翁還在就回到對話，告辭才離開。
    - **開場動畫**：使用者提供的 Gemini 影片（10 秒、5 個鏡頭：遠景垂釣→臉→手→水面→浮標下沉），重新壓成 960 寬、保留 AAC 音效 `videos/xianweng-fishing.mp4`（約 1.1MB，sw.js 不快取 mp4）；
      選「仙翁釣魚」就全螢幕播（`#xw-intro`，z-index 130），右下「略過 ⏭」，播完／略過／載入失敗都直接進釣魚；有聲播放被擋時改靜音播。
    - **仙翁釣魚**（`#xw-fish-modal`）：池塘底圖是影片 6.9 秒的水面截圖 `images/towns/xianweng-pond.jpg`。拋竿（按下就算一竿）→ 1.5～4.5 秒後浮標下沉 → `biteWindowMs` 1.5 秒內按「收竿」（慢了魚跑掉）→
      收線：右側直條裡魚亂竄，**按住**按鈕（滑鼠／觸控／空白鍵）綠框上升、放開下沉；魚在框內進度 +26%/秒、框外 −17%/秒，起始 30%，滿＝釣到、歸零＝跑掉。釣到後 700ms 內不接受拋竿（避免放開收線鈕時誤拋）。
      魚（權重／速度／框高）：青鱗凡魚 50（凡品靈草 6、上品 2）、碧波靈鯉 30（上品 4、極品 1、洗煉石 5）、赤霞寶鯛 15（極品 2、洗煉石 10、星允鐵 5、天機石 1）、
      **金鱗仙鯉** 5（仙品靈草 1、洗煉石 15、星允鐵 10、天機石 2、混元晶 1，另 20% 隨機一種傳送陣靈石 1 顆）；越高級越快、框越小。
    - **玲瓏棋局**（`#xw-chess-modal`）：視窗底圖用使用者提供的棋盤插畫 `images/towns/xianweng-gomoku.jpg`（壓暗），上面是 15 路木紋棋盤（225 個按鈕 `gomokuPlay(i)`），玩家執黑先手、無禁手，連五勝；
      下第一子才算一盤（中途離席＝輸）；贏 `chessWinStoneChance` 40% 得隨機一種傳送陣靈石 1 顆，輸／和局「機緣未到」不扣東西。
      **困難 AI**：棋型評分（連五、活四、衝四、活三、眠三、活二…，雙活三／四三加分）攻 ×1.1＋守；能連五就下、對手要連五就擋；能**連續衝四取勝（VCF，6 層）**就直接走；
      否則前 10 名候選各做 3 層 alpha-beta（仙翁→玩家→仙翁→評估），並扣掉「下完後玩家能 4 層內連續衝四取勝」的點（這段最多算 1.2 秒）。本機測試：對「一層貪心、先手」的電腦約四成勝、約兩成和局，平均每手約 0.1 秒。
    - 驗證（本機）：Playwright 走完 3 竿（漁獲入帳、次數歸零、按鈕停用）、回到對話、3 盤棋（贏得靈石入帳）、手機 390 寬版面；建置版 `dist/` 新增的 onclick 函式都有公開、Console 無錯誤。
      無頭 Chromium 沒有 H.264 解碼器，開場動畫走「載入失敗 → 直接進釣魚」分支；一般 Chrome／Safari／手機都能播 mp4（同目錄其他影片相同格式）。
    **正式出現條件**（版本 `20261005AV`，使用者：「人物含吃藥後魅力 5000、當日線上擊殺怪物滿 2000、一天只會出現一次、每小時出現 10 分鐘、10 分鐘後隱藏」）：
    仙翁改 `enabled` 開放、`chance: 1`、`minCha: 5000`（`getTotalCharm`＝本身＋裝備；駐顏駐魅力丹直接加在 `player.stats.cha`，已含）、`minKillsToday: 2000`、`window: { everyMin: 60, showMin: 10 }`（hiddenNpcs 通用欄位）。
    town-npc.js：`rollTownNpcs` 改呼叫 `trySpawnTownNpc(城名, npc)`；當日線上擊殺 `getTodayFieldKills`／`addTodayFieldKills`（`player.dayKills = { date, n }`，日曆日；combat.js 的線上野外每波擊殺後呼叫，離線／背景補發不算）；
    `getTownNpcWindow(w)`＝裝置時間每小時 :00～:09 為出現時段；`player.townNpcSeen = { id: 日期#時段 }`：今天在別的時段出現過就不再出現（同一時段離島再回來還在）；
    出現時排 `townNpcHideTimer`，時段結束 `hideWindowTownNpc` 讓仙翁消失（對話框開著就關掉，小遊戲可以玩完但不回到對話）；待在島上時 `townNpcClock` 每 30 秒檢查，時段一到自動現身；`closeTownScene` 呼叫 `stopTownNpcClock`。
    低語聽完（約 2 分半）才能對話，所以每個時段實際可對話約 7 分半。驗證：Playwright 假時鐘測魅力／擊殺門檻、同時段重進、10 分鐘後消失、下一小時不再出現、隔天重置、在島上等到整點自動出現。
    **擊殺門檻降為 1000**（2026-10-05，版本 `20261005BL`，使用者：「改成 1000 隻」）：`minKillsToday: 1000`。野外每波 3 隻、刷新 10 秒，一擊斬殺時每秒約 0.21 隻 → 最快約 1 小時 20 分（原 2000 約 2 小時 40 分）。
    **背景補發也算**（2026-10-05，版本 `20261005BM`，使用者：「切換背景也可以」）：save.js 的 `settleIdleSeconds` 在背景補發（`isOffline` 為否）時也 `addTodayFieldKills(實際擊殺數)`；關掉遊戲的離線結算仍不算（避免睡一覺就滿、跨午夜整段算進今天）。背景補發的擊殺＝收益次數 ÷ `getKillRewardMult()`，效率最多等於「同境界一般玩家」（`rateMult` ≤ 1）：一般玩家殺一隻約 9 回合，線上每秒約 0.08 隻、背景約 0.07 隻 → 1000 隻線上約 3.5 小時、背景約 4 小時；能一擊斬殺的強者線上約 1 小時 20 分（背景仍以一般玩家計）。
  驗證：靈山大川背景 1 小時計入 257 隻、離線 1 小時不計入（fieldKills 照常 +393）。
    **修正：時段尾段到島上會白白用掉當天機會**（2026-10-05，版本 `20261005BP`，使用者：「檢查仙翁觸發有無異常」）：原本仙翁一出現就寫 `player.townNpcSeen`，但低語要約 2 分 25 秒才能對話，
  :08 以後才到島上的玩家還沒聽完仙翁就隨時段消失，當天其他時段也不會再出現。改為 `trySpawnTownNpc` 只記 `hit.winKey`，**聽完低語（`heardAll`）時才 `markTownNpcSeen`**；
  同一時段已聽完的，離島再回來 `heardAll` 直接為真（不用重聽）。沒有低語門檻的定時 NPC 仍在出現時就記。
  驗證（假時鐘）：10:08 進島 → 10:10 消失未聽完 → 11:00 再出現 → 11:03 聽完可對話 → 同時段離島再回直接可對話 → 12:00 不再出現；Console 無錯誤。
    **出現時段改為每小時 :00～:19**（2026-10-05，版本 `20261005BQ`，使用者：「仙翁時間改成每小時 00 分～20 分出現」）：`window.showMin` 10 → 20（:20 整消失）；扣掉約 2 分 25 秒低語，每個時段可對話約 17 分半。
  - **GM 測試人物**（版本 `20261005AV`，使用者：「把測試人物設置為 GM，開啟進出任何地圖權限」）：map.js 的 `isGM()`＝`player.gm === true`。GM 時 `getMapEntryBlock` 一律放行（境界、四維、靈界、暫存區），
    `changeMap` 傳送到靈界分類地圖自動 `inLingjie = true`，`prepareLingjieEntry`／`tryLeaveLingjie` 不扣傳送陣靈石，`goToTown` 不看城鎮禁入。
    **取得方式＝GM 後台寄信**（使用者：「可以在 GM 後台製作一隻 GM 人物嗎」）：gm.html「📮 發放獎勵」新增「🛡️ GM 權限」選單（不變／授予／撤銷）→ `rewards.gm = true|false`，
    **只能用仙府信件寄給指定 uid**（兌換碼與全服信會被擋；`MAIL_SCHEMA_VERSION` 3，舊版遊戲提示重新整理）；玩家領信時 mailbox.js 的 `grantMailRewards(r, personal)` 只在個人信才設定 `player.gm`
    （兌換碼、奇遇呼叫不帶 personal，不會改 GM）。寄信只有管理者能寫（firestore.rules 的 mail create），規則不用改。
  - **路人閒聊**（版本 `20261005AQ`，使用者：「周圍路人每 30 秒頭頂出現對話框，傳聞三百年前就有仙翁在此地垂釣……」）：`townScenes` 新增選填 `chatter: { everyMs, firstMs, showMs, heads, lines }`；
    town.js 的 `startTownChatter`（`openTownScene` 啟動、`closeTownScene`／換場景停止）、`showTownChatter`：只挑目前畫面看得到的路人頭頂（手機左右滑動時畫面外的人不說話），
    句子不連續重複，對話框 `#town-chatter .town-chatter-bubble`（不擋點擊、淡入淡出）。青瀾島：第一句進島 3 秒後、之後每 30 秒、停留 7 秒、8 位路人、7 句傳聞（仙翁伏筆）；版本 `20261005AR` 依使用者要求增加到 22 句（仙翁的往事、釣竿、下棋、等人等傳聞）。
    `rollTownNpcs` 新增魅力門檻（`getTotalCharm()`＝本身＋裝備）；`getTownNpcFigures` 依 kind 換成 `talkToXianweng`（函式名寫成字串字面值，建置才會公開）；
    對話 `#xianweng-modal`（沒有 ✕）三選一 `xianwengChoose('guide'|'chess'|'leave')`：當天見過就不再出現（`markTownNpcDone`）；**造化（獎勵）尚未決定**，目前只寫日誌與提示。
  - **路人閒聊加快**（2026-10-04，版本 `20261005BB`，使用者：「NPC 講謠言的速度過慢」）：青瀾島 `chatter` 改為每 10 秒一句（原 30 秒）、進島 2 秒說第一句、對話框停留 6 秒。
  - **手機直式圖**（2026-10-04，版本 `20261005AZ`，使用者提供 848×1264「青瀾島手機版換此圖」→ `images/towns/qinglan-inner-portrait.jpg`）：`townScenes["青瀾島"].portrait`
    （春和堂 [530, 520, 240, 180]、小攤 [560, 850, 288, 400]、⛵ 搭船離島 [0, 790, 440, 420]）；直式圖新增選填 `chatterHeads`（town.js 的 `showTownChatter` 在直式圖改用它，9 位路人）。
    隱藏 NPC 支援直式圖：npc 選填 `portraitSpot`／`portraitFishing`／`whispers.portraitAt`（town-npc.js 的 `getTownNpcSpot`、`isTownPortraitView`；沒設＝直式圖上不出現）。
    仙翁在直式圖：涼亭石台左前角 [164, 632, 42, 90]（約 90px，同深度攤販相當），竿 手 (167, 662) → 竿尖 (100, 617)、釣線落水 (104, 738)，低語 (185, 625)。

## 75. 世界 Boss（`config-world-boss.js`、`world-boss.js`、`tools/firestore.rules`、gm.html「⚔️ 世界 Boss」；2026-10-04，版本 `20261005AD`）

- **使用者選定**（多人 Boss 討論後）：A 世界 Boss（非同步，全服共用一條血）＋四層防作弊——① 雲端規則硬性限制（次數、間隔、單次上限、封鎖帳號）② 獎勵以參加為主、排名只給外觀
  ③ 延後 24 小時發獎＋GM 審核 ④ 不影響單機遊玩。細節照建議：每週六 20:00～週日 20:00（台灣）、每天 3 次、每次 30 回合、倒下不扣壽元、單次上限＝總血量 1%。
- **入口**：活動選單「👹 域外天魔」（`config-activities.js` 的 `demon`，`openFn: openWorldBossModal`，聲望 1 萬＋大乘）。2026-10-04（版本 `20261005AF`）使用者要求「世界 Boss 暫不開放、秘境的世界 Boss 移到域外天魔」：
  `implemented: false`＝點了只顯示敬請期待；**開放時改成 `true`**（並確認 Firebase 已發布新版規則）。原本秘境列表的世界 Boss 卡片已移除。
- **雲端資料**（數字都是「畫面數字」的整數＝內部數值 × `combatScale()`）：
  - `wboss/state`：`{ bid, bossIdx, maxHp, hp, cap, startAt, endAt, killedAt, lastUid, lastName, prev: { bid, maxHp, killed, endAt, lastUid } | null }`。
  - `wbossRuns/{bid}/dmg/{uid}`：`{ uid, name, realm, stage, total, eff, n, day, dayN, lastAt, hist[≤6]: { d, t, r } }`（day＝台灣時間日序 floor((ms+8h)/1 天)）。
  - `wbossClaims/{bid}_{uid}`：`{ uid, bid, at }`。
- **換隻（不需要 GM）**：`wbLoad` 先跑 `wbRollover`——上一隻已結束、現在在本週時段內（`wbWindowStart`＝最近的週六 12:00 UTC）、雲端還不是本週這隻 → 交易寫入新的一隻：
  bid＝開始時間毫秒字串、bossIdx＝週次 % Boss 數（2026-10-05 起 5 隻）、血量＝上一隻被打死 ×2（上限 4 兆）／沒打死 ÷2 取整（下限 400 萬）、第一隻 4 億（2026-10-09 前 4000 萬，見本節末「單次上限改固定 1000 萬」）。
  規則檢查：startAt 毫秒 % 604800000 == 216000000（週六 12:00 UTC）、endAt＝startAt＋24 小時、現在在時段內、bid＝startAt 毫秒、cap＝10000000、prev 必須照抄上一隻、血量推算正確。
- **挑戰**（`startWorldBossFight` → `wbRound`，同鎮魔塔 BOSS 戰的 `resolveHit`／`tickStatus`／光環／連擊）：Boss 強度跟著挑戰者境界（`nv2Level(player)`），
  攻擊＝一般玩家氣血（含增益）÷ `WB.hitsToKill` 24；Boss 血量看雲端，本地只累計你造成的傷害（含 dot）。30 回合或倒下結束（中途「↩ 放棄」＝不送出、不扣次數）。
  結束 `wbSubmit` 交易：自己的紀錄（total／eff／n／day／dayN／lastAt＝serverTimestamp／hist）＋ Boss 扣血（傷害 0 時不更新 Boss）；打到 0 記 killedAt／最後一擊。
- **雲端規則**（`tools/firestore.rules` 的世界 Boss 區塊；Firebase 模擬器實測 35 項：正常流程與各種竄改都符合預期）：
  - 傷害紀錄：只能寫自己的、沒被封鎖、Boss 開放中且沒死、單次 0～cap、eff 只有打滿才 +1、n +1、間隔 ≥ 60 秒、同一天 dayN ≤ 3（換日才歸 1）、day 必須是伺服器時間的日序、
    同一筆交易的 Boss 血量 ＝ max(0, 交易前 − 這次傷害)（`getAfter` 對帳，多扣少扣都拒絕）。
  - Boss 扣血：只能改 hp（歸 0 時加 killedAt＝伺服器時間、lastUid＝自己），且同一筆交易必須寫自己的傷害紀錄。
  - 排行：一次最多讀 20 筆（`limit(20)`），管理者可讀全部。領獎：Boss 結束滿 24 小時、有傷害紀錄、沒被封鎖、每隻每人一次。
- **視窗** `#world-boss-modal`：Boss 圖、雲端血條、狀態（討伐中剩餘時間／已被擊敗＋最後一擊／已結束＋下次開放）、今日次數、累計傷害、⭐有效挑戰、名次（傷害相同並列）、
  挑戰鈕、領獎鈕、前 20 名排行、規則說明。讀取：state 1＋自己 1＋前 20 名（`WB.cacheMs` 3 分鐘內重開不重讀排行）。
- **戰鬥畫面** `#world-boss-scene`（z-index 101，樣式比照鎮魔塔，`.zm-pop` 共用）：上方「本次傷害／上限」進度條（打滿顯示 ⭐）、主角立繪、氣血條、戰況 3 行、×1／×2／×4、略過演出、結算。
- **獎勵** `claimWorldBossReward`：先讀該隻前 20 名算名次 → 建立領獎紀錄（規則把關）→ 發獎：靈石＝每小時收入 ×3、洗煉石 15、星允鐵 10、天機石 2、混元晶 1；Boss 被打死全部 ×2。
  外觀稱號（`config-titles.js` 的 cond `wboss`，`bonus: {}`，天磯錄顯示「外觀稱號（無數值加成）」）：第 1 名【誅天第一】、前 10 名【誅魔先鋒】、最後一擊【斬魔一擊】。
  可領的是「這隻（結束滿 24 小時）」或「上一隻（prev）」，大約有一週可以領；存檔 `player.wboss = { claimed: [最近 20 個 bid], titles: [] }`（state.js 預設）。
  頭像框需要新圖（目前 32 張都已使用），使用者提供後再加。
- **限制與防作弊**：被 `isSaveFlagged()` 判定存檔異常或 `lbBanned` 的玩家不能挑戰、不能領獎（單機照玩）。傷害在玩家端計算，作弊最多每次打滿上限＝跟強者並列。
- **GM 後台**（gm.html「⚔️ 世界 Boss」，載入 config-world-boss.js）：目前狀態（血量、時段、擊敗、上一隻）；手動開一隻（選 Boss、總血量萬、持續小時；目前這隻變 prev）、立即結束；
  傷害紀錄審核（目前／上一隻；可疑：煉虛以下卻打滿上限、紀錄間隔 < 60 秒、境界偏低卻每次都打滿）→ 封鎖（寫入黑名單＋刪紀錄）、刪除紀錄。
- **上線前要做**：把新版 `tools/firestore.rules` 貼到 Firebase 主控台發布；沒發布時視窗會顯示「世界 Boss 尚未開放（伺服器設定更新中）」。
- **驗證**：Firebase 模擬器（Firestore＋Auth）規則測試 35 項全過；遊戲接模擬器實測：秘境卡片 → 視窗 → 挑戰（略過演出）→ 戰果計入（Boss 100 萬 → 99 萬）→ 排行第 1 → 馬上再打被擋（調息中）
  → 上一隻結束後開視窗自動換成本週這隻（100 萬沒打死 ÷2 → 下限 400 萬）→ 領獎（靈石、洗煉石、通貨、稱號【誅天第一】【誅魔先鋒】）；建置版 50 個畫面掃描無錯誤。

- **域外天魔海報**（2026-10-04，版本 `20261005AY`，使用者提供 1024×1536 海報「三界之戰」：「域外天魔選項新增圖片」）：`images/secret/yuwai-tianmo.jpg`（海報，約 490KB）、`yuwai-tianmo-banner.jpg`（海報中段主角裁切 640×263）。
  config-activities.js 的活動新增選填 `img`／`banner`：activity.js 的 `renderActivityList` 有 banner 時按鈕用它當底圖（左側漸層壓暗、鎖定時灰階）；
  `openActivity` 遇到有 img 的活動先開 `#activity-poster-modal`（`openActivityPoster(act)`：海報、名稱、說明；未開放顯示「功能開發中，敬請期待！」、不顯示「⚔️ 進入」），已開放的按「⚔️ 進入」→ `enterActivityPoster()` 呼叫 openFn。
- **正式開放＋GM 預約開啟**（2026-10-05，版本 `20261005BO`，使用者：「今晚 8 點世界 Boss 開啟」）：config-activities.js 的 `demon` 改 `implemented: true`；
  gm.html「手動開一隻」新增「開始時間」（`#wb-start` datetime-local，留空＝立即、不能早於現在；以 GM 電腦時間為準）→ startAt＝該時間、endAt＝startAt＋持續小時；狀態列顯示「⏳ 預約中」。
  玩家端原本就支援未來的 startAt（顯示「尚未開放（還有多久）」）；預約中不再顯示「下一隻：每週六 20:00」。管理者寫入不受規則的週六時段限制；每週六 20:00 的自動換隻照舊（GM 開的這隻結束後才換）。
- **改名「三界之戰」**（2026-10-04，版本 `20261005BA`，使用者：「活動域外天魔改名稱 三界之戰」）：config-activities.js 的活動 `demon` 名稱改為「三界之戰」（id、openFn 不變；世界 Boss 本身的視窗標題仍是「⚔️ 世界 Boss」）。
- **第五隻 Boss「OP王」＋專屬戰鬥動畫**（2026-10-05，版本 `20261005BX`，使用者提供 op1／OP2／OP3：「三個動畫連續處理」→ 選「1→2→3 後循環 2→3 不停」、
  「世界 Boss OP王戰鬥畫面，玩家持續攻擊，無法跳過影片，直到設定的回合或死亡才結束」→「影片專屬 OP王」）：
  - `WB_BOSSES` 最後新增 **OP王・金甲武神**（索引 4；魔修、金、金重擊 20、防 22、閃避 12；光環「金甲護體」玩家攻擊 −5%、自身防 +5）。
    圖 `images/zhenmo/boss-opwang.jpg`：從 OP2 第 1.5 秒截圖（640×480，約 33KB，Media Foundation `MediaComposition.GetThumbnailAsync`）。
    ⚠️ 新 Boss 一律加在陣列最後：雲端存的是 `bossIdx`，插在中間會讓進行中的那隻變成別隻（規則允許 0～15，不必改規則）。
    每週自動換隻改成週次 % 5，GM 後台「手動開一隻」的下拉選單也會自動出現 OP王。舊版程式（還沒更新的玩家）遇到索引 4 會顯示成第 0 隻（八岐大蛇），更新後就正常。
  - Boss 選填欄位 `videos`（依序播放的清單）＋`videoLoopFrom`（播完從第幾支開始循環）。OP王：`[op1, op2, op2]`、`videoLoopFrom: 1`。
    OP2 與 OP3 是同一個檔案（MD5 相同，使用者確認「就是一樣」），兩格都指向 `videos/world-boss/op2.mp4`，只下載一次。沒有 `videos` 的 Boss 照舊顯示 Boss 圖。
  - world-boss.js：`startWorldBossFight` 在玩家點擊的當下呼叫 `wbOpStart(B)`：每個不同的檔案建一個 `<video>` 放進 `#wb-fight-video`（開戰就預載）。
    `wbOpShow(i)` 播第 i 支，同一個檔案重播只把 currentTime 歸 0；`playing` 之後才切換顯示，所以不會黑一下。`ended` 時 `wbOpNext` 播下一支，最後一支播完回到 `videoLoopFrom`。
    有聲播放被擋（`NotAllowedError`）就改成靜音播；影片載入失敗就 `wbOpStop`，留著 Boss 圖。
    `wbEndFight`（30 回合或倒下）與 `closeWorldBossFight`（放棄）都會 `wbOpStop()`：暫停影片、清掉 src、移除元素。
  - 樣式：`#wb-fight-video` 疊在 `#wb-fight-bg` 上、主角立繪下（z-index 1）。黑底＋`object-fit: contain`（影片本身是黑底，直式畫面上下留黑），開始播放才淡入（`.on`）。
  - **不能跳過**：移除「⏭ 略過演出」按鈕和 `skipWorldBossFight`。「↩ 放棄」（不送出、不扣次數）保留。
  - **戰鬥時間跟著動畫走**（使用者看完展示後選 1）：原本一回合 `ZHENMO_ROUND_MS` 650ms，30 回合約 20 秒，第 3 段還沒播戰鬥就結束；×4 只要 5 秒。
    改成 Boss 選填 `roundMs`（OP王 1000），`wbStep` 用 `B.roundMs || ZHENMO_ROUND_MS`，30 回合約 30 秒＝三段動畫各播一次。
    有 `videos` 的 Boss 隱藏 ×1／×2／×4（`startWorldBossFight` 設 `.wb-speed` 的 display），`wbSetSpeed` 也只接受 1。其他四隻照舊可以加速。
  - 影片有聲音，播放時背景音樂會依第 76 節的 `isSoundVideoPlaying` 自動暫停，戰鬥結束後繼續。
  - 驗證（本機，戰果送出改成假的）：OP王 依序播放 0:op1 → 1:op2 → 2:op2 → 1:op2 → 2:op2…，銜接時一直有畫面；撐過 30 回合或倒下時影片停止並移除；
    八岐大蛇不建立影片、照舊顯示 Boss 圖，加速鈕照舊顯示；世界 Boss 視窗橫幅顯示「OP王・金甲武神」；
    OP王 加速鈕隱藏、強制 ×4 無效，第 1 段 0.1 秒、第 2 段 11.1 秒、第 3 段 21.4 秒開始，第 30 回合在 30.0 秒結束（第 3 段播到約 8.6 秒）；Console 無錯誤。
  - **第三段換新影片**（2026-10-06，版本 `20261005CM`，使用者：「op王第三段動畫 換成這個」）：新增 `videos/world-boss/op3.mp4`（20 秒，第 1 節），
    `videos` 改為 `[op1, op2, op3]`（`videoLoopFrom: 1` 不變＝之後循環 op2→op3）。三段共 10＋10＋20＝40 秒，依「戰鬥時間跟著動畫走」把 `roundMs` 1000 → **1340**（30 回合約 40 秒）。
    world-boss.js 不用改（每個不同檔案本來就各建一個 `<video>`）。驗證（本機）：op1 0.1 秒 → op2 10.5 秒 → op3 20.8 秒 → 41.2 秒回到 op2；op3 畫面可正常解碼；Console 無錯誤。
    實戰（假的雲端狀態＋`wbSubmit` 換成只記錄、不連網，從視窗按「挑戰」）：新角色第 18 回合倒下（23.7 秒）→ 影片停止移除、結算顯示已計入；
    撐滿 30 回合在 39.9 秒結束，當時 op3 播到約 19.4 秒（全長 20.1 秒），影片皆為有聲播放；Console 無錯誤。
- **人物攻擊反應**（2026-10-06，版本 `20261005CN`，使用者：「目前玩家打世界王不像仙魔戰場一樣人物有攻擊的反應」；原本 `#wb-fight-hero` 是靜止圖，連鎮魔塔的前衝都沒有）：
  - 樣式（index.html 世界 Boss 區塊）：`#wb-fight-hero` 待機呼吸 `wbBreathe`；`.lunge` 出手前衝（往右上＋發光）、`.hurt` 受擊後仰泛紅、`.evade` 閃避殘影往左。
    動作都寫成 `animation: wbBreathe …, 動作 …`（後列優先，同第 59 節的寫法）。`#wb-fight-scene.boss-hit` 讓背景圖與動畫 `#wb-fight-bg`／`#wb-fight-video` 閃白小震；
    `.shake` 整個戰場震動；新元素 `#wb-fight-slash`（劍光，沿用鎮魔塔 `zmSlash`）、`#wb-fight-flash`（白光）、`#wb-fight-hurt`（四周紅框）。`prefers-reduced-motion` 時關閉。
  - world-boss.js：`wbHeroFx(cls)`（用 battle-fx.js 的 `restartAnim`，同時移除另外兩個動作）、`wbAttackFx(hits)`（每回合出手：前衝＋劍光；有打中 → Boss 閃白；
    暴擊／重擊／雷擊或連擊 → 震動＋白光）、`wbHurtFx(hit)`（閃避 → 殘影；打中 → 受擊＋紅框；Boss 暴擊再震動）。
  - 節奏：Boss 反擊的演出（受傷飄字、人物受擊、戰況文字）延後半回合（`roundMs × 0.45 ÷ 速度`）才播，先看到自己出手、再看到 Boss 打過來；
    氣血條也等那時才扣（`wbFight.shownHp` 暫存扣血前的值，`wbUpdateBars` 優先顯示它；結束時顯示實際值）。飄字的暴擊色多判斷 `crit` 標籤（原本只看連擊、重擊、雷擊）。
  - 驗證（本機，假雲端狀態＋`wbSubmit` 不連網）：OP王 30 回合每回合前衝＋劍光＋Boss 閃白（0.74 秒），約 0.6 秒後受擊＋紅框；手動觸發暴擊 → 震動＋白光、閃避 → 立繪左移半透明；
    八岐大蛇 ×4 加速 6 秒打完 30 回合、動作照常；Console 無錯誤。
- **OP王 動畫對白**（2026-10-06，版本 `20261005CO`，使用者：「影片op王加上一下對白：愚蠢的刁民 吃我一劍!! 登! 龍! 閃!」；三段動畫畫面幾乎靜止，時間點由 Claude 安排）：
  - config-world-boss.js 的 Boss 選填 `videoLines`（跟 `videos` 一一對應，null＝那段沒有對白）：每句 `{ at, end（該段開播後的秒數）, text, cls, hit }`。
    OP王：op2 第 1 秒「愚蠢的刁民」、2.6 秒大字「吃我一劍!!」（到 8.5 秒）；op3 第 1.5／2.5／3.5 秒逐字蹦出「登!」「龍!」「閃!」（到 9 秒），「閃!」帶 `hit`＝畫面震動＋白光。循環重播時對白也重播。
  - world-boss.js：`wbOpShow` 的 `playing` 之後呼叫 `wbSayPlay(i)` 排程該段對白（`wbSayTids`），換段或 `wbOpStop` 時 `wbSayClear()` 清掉計時器與字。
  - index.html：`#wb-op-say`（`#wb-fight-scene` 內、影片之後；上方 9%、z-index 6，在受傷紅框之上、不壓立繪）；`.wb-say`（楷體、黑色陰影勾邊＋紅金外發光，
    ⚠️ 不用 `-webkit-text-stroke`：楷體筆畫細，會把字吃暗）、`.row` 獨立一行、`.big` 大字、`.chant` 40px 放大彈入（`wbChant`）、`.out` 淡出。
  - 驗證（本機手機 375×812）：正常播放時 op2 開播後 1.0／2.6 秒、op3 開播後 1.5／2.5／3.5 秒出現；字在影片上方黑底、清楚不擋人物；「閃!」時震動；放棄後對白與計時器清空；Console 無錯誤。
  - **改成全部放第三段、登龍閃當最後絕招**（同日，版本 `20261005CP`，使用者：「字可以放在第三段影片，登龍閃放在最後絕招使用」）：op2 改為 null；op3 第 1／2.6 秒「愚蠢的刁民」「吃我一劍!!」（到 8 秒），
    第 17.0／17.9／18.8 秒「登!」「龍!」「閃!」（到影片結束）；「閃!」除了震動＋白光，選填 `log` 同時在戰況寫「💥 OP王施展絕招【登龍閃】！」（`wbSayPlay` 在戰鬥進行中才寫）。
    op3 影片本身在 18～19 秒有大爆光，「閃!」剛好落在那裡。實測：戰鬥 21.5／23.1 秒（第 16、17 回合）出現前兩句，37.5／38.4／39.3 秒（第 28～29 回合）登龍閃，第 30 回合約 39.9 秒結束。
  - **登龍閃提早 2 秒**（同日，版本 `20261005CQ`，使用者：「登龍閃可以提早兩秒，因為閃字一出直接回合結束跳出」）：改為 op3 第 15.0／15.9／16.8 秒。
    實測：戰鬥 35.5／36.4／37.3 秒（第 26～28 回合）登龍閃，結算畫面 39.7 秒跳出（「閃!」後約 2.4 秒）；Console 無錯誤。
- **單次上限改固定 1000 萬、⭐改撐滿 30 回合、第一隻 4 億**（2026-10-09，版本 `20261005CV`，使用者：「玩家攻擊上限不侷限 40 萬」＋「計算最頂級裝備配置 30 回合可以打多少傷害」→ 選 固定 1000 萬／撐滿 30 回合就算／第一隻改 4 億）：
  - **模擬**（本機頁面照 `wbRound` 流程，5 隻 Boss 各 2000 場，畫面數字；玩家與 Boss 同境界 10 階）：
    | 境界 | 一般 | 中等（攻×2 血×1.5 減30 閃20） | 強力（攻×4 血×2 減60 閃40，第 51 節的頂配） | 極限頂配 |
    |---|---|---|---|---|
    | 大乘 | 6.5 萬（撐不滿） | 18 萬 | 37 萬（最高 48 萬） | 394 萬（最高 553 萬） |
    | 渡劫 | 7.2 萬 | 20 萬 | 41 萬（54 萬） | 402 萬（545 萬） |
    | 真仙 | 8.8 萬 | 23 萬 | 49 萬（65 萬） | 503 萬（711 萬） |
    | 混沌道祖 | 10 萬 | 27 萬 | 57 萬（77 萬） | 599 萬（829 萬） |
    極限頂配＝Lv.10000 白金 +20 圖紙武器、主修職業 10 階 +30%、力量（境界＋丹藥 20＋藏書 20＋裝備 100）×1.2、增益吃滿境界上限（`buffCapByRealm`）、暴擊 30%、連擊 10%、種族剋制 +50%、減 80 閃 60；
    攻擊約一般玩家的 22 倍（未計天賦獨立倍率、元神、靈根、秘典，實際可能再高一些）。原上限 40 萬＝大乘強力配置就打滿。
  - config-world-boss.js：`capPct` 改 **`WB.cap` 10000000**（固定，不看總血量）；`firstHp` 4000 萬 → **4 億**。
  - world-boss.js：`wbCap()` 一律回傳 `WB.cap`（雲端 `state.cap` 只是紀錄，10/9 前建立的那隻存的是舊的 1%，不再讀它）；
    **⭐有效挑戰＝`wbSurvived(f)`（撐滿 30 回合且沒倒下）**，`wbSubmit(bid, d, star)` 的 eff 依 star +1；戰鬥上方進度條、結算、視窗與規則說明文字同步改。
  - tools/firestore.rules：state 的 `cap == 10000000`、建立第一隻 `maxHp == 400000000`；傷害紀錄單次 `0～10000000`，eff 每次只能 +0 或 +1（規則驗不了是否撐滿，⭐沒有數值獎勵所以不擋）。
    ⚠️ **要貼到 Firebase 主控台發布**；沒發布前新版玩家的戰果會被舊規則以 1% 上限擋下（超過舊上限的會被拒絕）、換隻也會失敗。
    換隻沿用上一隻血量推算（×2／÷2），所以雲端已經有一隻時不會自己變 4 億；要立刻用 4 億就由 GM「手動開一隻」填 40000 萬。
  - gm.html：狀態列、手動開啟的確認文字與寫入的 cap 改用 `WB.cap`；可疑標記改為「單次 ≥ 900 萬」「大乘以下單次 ≥ 600 萬」（依上表極限值）、間隔過短；移除「每次都打滿」。
  - 驗證（本機，假雲端狀態＋`wbSubmit` 換成只記錄）：視窗顯示「單次傷害上限 1000萬；撐滿 30 回合沒倒下記一次 ⭐有效挑戰」；撐滿 30 回合送出 star=true、結算「⭐有效挑戰」，
    第 1 回合倒下送出 star=false；gm.html 載入正常；Console 無錯誤。建置（`node tools/build.js`）這台電腦沒有 node，未跑。
- **GM 名次獎勵：先天・太古裝備**（2026-10-09，版本 `20261005CV`，使用者：「戰力後台新增世界 Boss 發放獎勵專項，內容 1500～5000 等仙天太古裝、隨機部位」→ 選 先天（白金）・太古／依名次分級／每段件數 GM 自己填）：
  - gm.html 世界 Boss 分頁新增「🎁 名次獎勵」卡片：對象＝「傷害紀錄審核」選的那隻（目前／上一隻）全部參加者（n > 0），名次依累計傷害（相同並列）；
    分段表 `wbgTiers`（名次從／到（0＝其餘全部）／等級 1500・2500・3500・5000／件數 0～20），預設 `WB_GIFT_TIERS`（config-mailbox.js）：第 1 名 Lv.5000、2～3 名 Lv.3500、4～10 名 Lv.2500、其餘 Lv.1500，各 1 件。
    每人對到第一個符合的分段；即時預覽每人獎勵（`wbgPlan`／`wbgRender`，`reloadWboss` 後重畫）。
  - 「📮 寄出名次獎勵」：每人一封個人信（`mail`，`to`＝uid、`rewards.gear = { "等級_種類": 件數 }`、`v: 4`、24 小時過期同第 56 節），內文自動加「（第 N 名）」。
    同一隻（bid）寄過會記在 GM 電腦的 localStorage `wbGiftSent_{bid}`，再寄時先確認（換電腦就不會提醒）。不用改雲端規則（mail 本來就只有管理者能寫）。
  - 遊戲端：信箱獎勵新種類 `rewards.gear`（第 56 節，`MAIL_SCHEMA_VERSION` 4），裝備由 gear.js 的 `createPrimalPlatinumGear(level)` 產生（第 67 節）。
  - ⚠️ 玩家要更新到 `20261005CV` 以後才領得到（舊版遇到 v 4 會提示重新整理、信件保留）；信件 24 小時沒領就會被刪，寄完記得公告。
  - 驗證（本機，gm.html 用假的 12 位參加者）：預覽名次與並列（5000 萬兩位都是第 2 名、拿 Lv.3500）正確，改件數即時更新；遊戲端領取 `{ "5000": 1, "1500": 2, "999": 3 }` 得 3 件
    （999 不在清單被忽略），皆為白金・太古 +0、5 條全天級詞條、帶傳奇威能與種族特效、2～3 孔，名稱「先天・太古・…」；背包剩 1 格時提示空位不足、不建立領取紀錄；Console 無錯誤。
  - **新增種類：先天・遠古、一般先天**（同日，版本 `20261005CV`，使用者：「世界 Boss 名次獎勵新增（先天・遠古裝備）、先天裝備」）：分段表多一欄「種類」（`MAIL_PRIMAL_GEAR_KINDS`，新增分段預設一般先天），
    `rewards.gear` 的 key 改為「等級_種類」（`wbgPlan`、`wbgKindText`；舊格式只寫等級仍視為太古）。卡片標題、內文預設、說明一併改。
    驗證：gm.html 預覽各分段種類正確；遊戲領取 `{ "5000_2", "3500_1", "1500_0", "2500", "1500_7" }` 得 太古 ×2（5 條全天級）、遠古（4 條全地級、四維 ×1.1）、一般先天（4 條一般分級），種類 7 被忽略；Console 無錯誤。

## 76. 背景音樂（`bgm.js`；2026-10-04，版本 `20261005BC`）

- **來源**：使用者提供 `videoplayback.mp4`（「能加入當背景音樂嗎」），取音軌、頭 1.5 秒淡入／尾 3 秒淡出（循環接縫較順）：`audio/bgm-main.m4a`（AAC 96kbps，約 1.2MB）＋ `audio/bgm-main.ogg`（Opus 64kbps，約 0.8MB，備用）。
  `canPlayType` 不支援 AAC 就直接用 Opus；m4a 載入失敗（`error`）也自動換 Opus。sw.js 不快取 m4a／mp3／ogg（同影片，分段請求）。
- **播放**：瀏覽器規定要先互動才能播有聲媒體 → 第一次 pointerdown／keydown 時 `playBgm()`（標題畫面點一下就開始），`loop`。
  分頁隱藏（切 App、鎖螢幕）`pauseBgm()`、回來繼續；有聲影片（未靜音的 `<video>`：仙翁開場動畫、夥伴影片）播放時暫停，影片暫停／結束 300ms 後繼續；守城的靜音影片不影響。
- **設定**（⚙️ 設定視窗「背景音樂」）：`toggleBgm()` 開／關、音量滑桿 `setBgmVolume(0～100)`（預設 40%）；偏好存 localStorage `xiuxian_bgm = { on, vol }`（這台裝置，不進存檔），`openSettingsModal` 時 `renderBgmSettings()`。
- 驗證（本機）：點擊前不載入、點擊後開始播放（無頭 Chromium 不支援 AAC → 自動用 Opus，currentTime 前進）、開關與音量即時生效並記住；建置版 on* 掃描無缺漏、Console 無錯誤。
- ⚠️ 音樂版權：檔案由使用者提供（YouTube 下載的檔名），請確認有使用授權。
- **只在特殊地圖播放**（2026-10-04，版本 `20261005BD`，使用者：「是要設定特殊地圖才要的」→ 選「三界之戰」，再追加「靈界地圖」）：`BGM_ZONE = { activities: ['demon'], ids: ['world-boss-modal', 'world-boss-scene'], scenes: () => [LINGJIE_SCENE_KEY] }`，
  `isBgmZone()`＝三界之戰海報（`#activity-poster-modal` 的 `data-act`，activity.js 的 `openActivityPoster` 設定並立即 `playBgm`）、世界 Boss 視窗／戰鬥畫面、靈界大地圖（`currentTownScene` 且 `#town-scene` 顯示中）。
  `playBgm` 不在區域內就不播；`initBgm` 每秒檢查一次，進區域播放、離開暫停。設定視窗標題改「背景音樂（三界之戰、靈界地圖）」。
  驗證：標題畫面、洞府、秘境不播；三界之戰海報、世界 Boss 視窗、靈界地圖播放；關閉或換到人界地圖即暫停；Console 無錯誤。
- **遊戲背景音樂＋檔案改名**（2026-10-04，版本 `20261005BE`，使用者提供 25 分鐘配樂合輯：「只放 1～2 首，到 7 分 48 秒；從遊戲登入頁面開始播放」「不影響遊戲運轉」）：
  - 剪 0:00～7:48、頭尾淡入淡出 → `audio/bgm-game.m4a`（AAC 80kbps，約 4.8MB）＋ `audio/bgm-game.ogg`（Opus 56kbps，約 3.4MB）；原特殊曲改名 `audio/bgm-sanjie.*`（原 `bgm-main.*`）。
  - `BGM_TRACKS = { game, zone }`、`bgmAudios`（各一個 Audio，用到才建立、各自記住進度）；`currentBgmTrack()`＝`isBgmZone()` ? zone : game；`playBgm` 先停掉另一首再放目前這首。
    登入頁（標題畫面）點一下就開始放 game；進三界之戰、靈界地圖換 zone，離開換回 game（每秒檢查）。
  - 不影響遊戲：第一次互動才建立音訊（之前不下載）、串流邊下載邊播、載入失敗就沒有音樂；手機開省數據（`navigator.connection.saveData`）且沒設定過時預設關閉。設定視窗標題改回「背景音樂」。
  - 驗證（本機）：標題點擊→game 播放；洞府、秘境 game；三界之戰海報、世界 Boss、靈界地圖換 zone（game 暫停並保留進度），離開後 game 從原進度接著放；Console 無錯誤。
  - ⚠️ 兩首都是使用者提供的檔案，版權由使用者確認。
- **遊戲主頁一打開就播**（2026-10-04，版本 `20261005BF`，使用者：「音樂可以在遊戲主頁（凡塵修仙傳主頁）開始播放嗎」）：`initBgm` 載入 0.3 秒後直接 `playBgm()`；
  瀏覽器允許自動播放（電腦版常去的網站）就直接響，成功後 `bgmUnlocked = true`（之後換畫面自動接著放）；被擋（手機一律要先點畫面）時，
  標題畫面右上 `#bgm-title-btn` 顯示「🔇 輕觸開啟音樂」並閃爍，點畫面任何地方都會開始；播放中顯示 🔊，點了＝關閉（`bgmTitleTap`，同設定視窗的開關）。
  驗證：允許自動播放的模式載入即播放；要求互動的模式顯示提示、點一下開始；按鈕開關正常；Console 無錯誤。
- **換成三首輪播**（2026-10-04，版本 `20261005BG`，使用者：「移除這兩首歌」→ 再提供三首「加入遊戲背景音樂」）：刪除 `audio/bgm-game.*`、`audio/bgm-sanjie.*`，
  取消「三界之戰、靈界地圖換特殊曲」（`BGM_ZONE`／`isBgmZone` 移除，activity.js 海報不再呼叫 playBgm）。新曲 `audio/bgm-1～3.m4a`（AAC 96kbps，各約 1.4MB、約 2 分鐘）＋ `.ogg`（Opus 64kbps 備用），頭 1 秒淡入、尾 2.5 秒淡出。
  `BGM_PLAYLIST` 依序輪播（`ended` → `switchBgmTrack` 下一首，第三首播完回第一首），一次只載入正在播的那首；載入失敗先換 Opus、再跳下一首。其餘行為（主頁自動嘗試播放、右上音樂鈕、設定開關音量、背景／影片暫停、省數據預設關）不變。
  驗證：要求互動模式下點一下開始播第 1 首，模擬播完依序 1→2→3→1，進遊戲持續播放，設定視窗正常；Console 無錯誤。⚠️ 三首為使用者提供的動畫配樂，版權由使用者確認。
- **追加五首、共 8 首**（2026-10-04，版本 `20261005BH`，使用者：「加入背景音」）：`audio/bgm-4～8.m4a`（AAC 80kbps，各約 2.4～2.9MB、約 4～4.7 分鐘）＋ `.ogg`（Opus 56kbps 備用），同樣頭尾淡入淡出；
  `BGM_TRACK_COUNT = 8`，`BGM_PLAYLIST` 依序 1→8→1。驗證：模擬播完依序換到 2…8 再回 1；Console 無錯誤。audio 資料夾合計約 29MB（玩家一次只下載正在播的那首）。
- **找回 7 分 48 秒那首、放第一首**（2026-10-04，版本 `20261005BK`，使用者：「昨天移除一首音樂 7 分多鐘的找得回來嗎」→ 選「放第 1 首、開頭先播」）：從 commit `dd177a2` 之前的紀錄還原 `audio/bgm-game.m4a`／`.ogg`（原檔，未重新轉檔），
  `BGM_PLAYLIST` 開頭加這首，其後接 `bgm-1～8`（`BGM_TRACK_COUNT` 仍是 8＝編號曲數），共 9 首依序 game→1→…→8→game。原特殊曲 `bgm-sanjie.*` 沒有還原。

- **恢復靈界／三界之戰專屬曲**（2026-10-05，版本 `20261005BW`，使用者問「原本靈界的背景音樂是否被移除」→ 選 A 恢復原本設計）：從 commit `dd177a2` 之前還原 `audio/bgm-sanjie.m4a`／`.ogg`（原檔，約 97 秒循環）。
  bgm.js 新增 `BGM_ZONE_TRACK`、`BGM_ZONE`（活動 `demon` 海報、`#world-boss-modal`、`#world-boss-scene`、靈界大地圖 `LINGJIE_SCENE_KEY`）、`isBgmZone()`（海報改看 activity.js 的 `activityPosterId`）、`getBgmZoneAudio()`／`bgmZoneAudio`；
  `playBgm` 依 isBgmZone 播特殊曲或輪播（另一邊暫停、各自記住進度），`pauseBgm`／`isBgmPlaying`／`setBgmVolume` 兩邊都處理；`initBgm` 每秒檢查，該放的那首沒在放就 `playBgm`。
  驗證：遊戲中輪播 → 開靈界大地圖改播特殊曲 → 關閉回輪播 → 開世界 Boss 特殊曲 → 關閉回輪播；建置版同樣；Console 無錯誤。
- **天元城內城也播特殊曲**（2026-10-05，版本 `20261005BZ`，使用者：「靈界天元城內 背景音樂要跟靈界地圖以及三界戰場一樣」）：`BGM_ZONE.scenes` 加 `"天元城"`（`townScenes["天元城"]` 內城場景）。
  靈界地圖 → 天元城城門圖（疊在靈界地圖上）→ 內城 → 「↩ 靈界地圖」全程同一首特殊曲、不中斷；離開到洞府等畫面回輪播。

## 77. 時間防護：加速器、調系統時間（`timeguard.js`；2026-10-05，版本 `20261005BR`）

- **使用者選定**（問「有判斷加速器的手段嗎」→ 選 ②③＋溫和處理）：② 整個程式加速（Cheat Engine 之類，Date.now／performance.now 一起變快）③ 調裝置時鐘。
  **溫和**＝不標記存檔，只讓多出來的收益不算。原本第 72 節的「修煉進度過快」抓不到加速器（遊玩秒數也是同一個計時器累計，比例不變）。
- **參考時間**：本網站回應的 `Date` 標頭（GitHub Pages／Fastly，玩家改不了、不花 Firebase 額度）。`fetch(location.pathname + '?tg=亂數', { method: 'HEAD', cache: 'no-store' })`；sw.js 只攔 GET，不會拿到快取。
  Date 只到秒 → +500ms 加半個來回時間。`tgOffset`＝伺服器 − Date.now()；`gameNow()`＝Date.now() + tgOffset（還沒對過＝裝置時間）。載入即對時，之後每 `TG_SYNC_MS` 2 分鐘。
- **② 加速器**：每次對時比較 performance.now 經過秒數 ÷ 伺服器經過秒數（窗口至少 100 伺服器秒）；> 1.15 倍 → `tgSpeed`＝該倍率（最多 20），< 1.08 恢復 1。
  combat.js 的 `combatTick` 在 `checkBackgroundCatchUp` 之後問 `tgAllowTick()`：按 1/tgSpeed 放行（每真實秒最多一次，修煉、收益、壽元都回到真實速度）；integrity.js 遊玩秒數每秒加 `tgPlaySecondsPerTick()`。第一次偵測寫一則系統日誌。
  偵測需要約 100 秒真實時間，這段不擋。
- **③ 調系統時間**：
  - **離線結算**（save.js 的 `calcOfflineProgress` → 確認後 `settleOfflineSeconds`）：`saveLocal` 時 `tgSaveStamp()` 記 `player.lastSaveSrv`（估計的伺服器時間；本次還沒對過時保留舊值）。
    讀檔時 `tgVerifyOfflineSeconds(裝置算的秒數, lastSaveSrv)`：真正離線＝伺服器現在 − lastSaveSrv − 等待對時的秒數，取與裝置秒數的較小值（差 5 分鐘以內視為正常）；
    舊存檔沒有 lastSaveSrv → 用「裝置時鐘比伺服器快多少」扣回；兩次都連不上 → 最多算 30 分鐘（`TG_UNVERIFIED_OFFLINE_SEC`）並提示。被調整時結算訊息加一行說明。
    calcOfflineProgress 一開始就把 lastSaveTime 設成現在（對時期間自動存檔不會重複計算）。
  - **背景補發**（`checkBackgroundCatchUp`）：一次間隔超過 1 分鐘（鎖螢幕、切 App、或把時鐘往後調）→ `tgVerifyGap(上次 tick 的 Date, 間隔)` 以「伺服器現在 − (上次 tick + 跳之前的 tgOffset)」確認，只補真的經過的時間；確認不了最多補 10 分鐘。
  - **每日重置**：`new Date().toDateString()` 類的日期鍵（partner.js 的 todayKey、encounter.js 的 todayKey／weekStart、activity、casino、economy、enhance、lingjie、race、secret-realm）改用 `new Date(gameNow())`；
    每日任務刷新（daily-quest.js；`clampRefreshAt` 新增選填 now）、隱藏仙翁出現時段（town-npc.js 的 `getTownNpcWindow`）也用 gameNow()。其他計時（寄售、奇遇期限、懸賞／拍賣刷新等）仍用裝置時間。
- **限制**：沒網路時退回裝置時間（離線結算另有 30 分鐘上限）；只防一般玩家，會改程式的人仍可繞過（純前端的限制）。
- **驗證**（Playwright 攔截 `?tg=` 自訂伺服器時間＋假時鐘）：A 存檔後實際 10 分鐘、時鐘調快 12 小時 → 結算 600 秒並提示；B 舊存檔（無 lastSaveSrv）時鐘快 12 小時 → 約 10 分鐘；C 正常離線 3 小時 → 10800 秒；
  D 連不上 → 1800 秒並提示；E 加速 5 倍 → 偵測 4.84 倍、之後頁面 100 秒只放行 21 次、恢復正常後 tgSpeed 回 1；F 遊戲中時鐘調快 30 小時 → 背景補發只補約 1.5 秒；G 裝置日期調到隔天 → todayKey 仍是伺服器的今天。
  實際伺服器（不攔截）對時 offset −105ms；線上 GitHub Pages 的 HEAD 有 Date 標頭；建置版正常；Console 無錯誤。

## 78. 時空秘境（亂星海；`map.js`、`config-maps.js`；2026-10-06，版本 `20261005CF`）

- **使用者指定**：「亂星海增加時空秘境地圖；仙人初境以下都可以進入；強度為每個境界的 10 階的 30 倍；怪物刷新速度 3 秒，讓玩家沒有足夠的緩衝時間，降低生存率；
  掉落 3000 等裝備製作書、中品武學秘典碎片、金木水火土極品靈石（＝傳送陣靈石，第 74 節改名）、各種材料」。
- **地圖**（config-maps.js 第二區「慕蘭草原」最後一張，`hidden`、`spacetime: true`）：`maxRealm: 10`（仙人初境以下；`getMapEntryBlock` 新增境界上限檢查，短字「🔒仙人初境以下」）、
  `respawnSec: 3`、`nv2Str: [30, 30]`；`nv2L`／`nv2FixedL`／`suit` 是 **getter**：`nv2L`＝玩家境界（最高 10），`nv2FixedL`＝境界＋0.9（該境界 10 階）→ 妖獸＝自己境界 10 階 × 30 倍、沒有境界壓制、不算挑戰模式。
  存檔裡的 currentMap 是當時數值的副本，讀檔時 `migrateCurrentMap` 依名稱改指回這個物件，getter 照常生效。
- **入口**：人界地圖「亂星海」分區（config-towns.js 的 `worldRegions.luanxing`，原本「尚未開放」）→ `enterSpacetimeRealm()`：檢查門檻、`gameConfirm` 說明（強度、3 秒刷新、死亡懲罰、收益、掉落）→ `selectMap`。
- **刷新**：`getMapRespawnSeconds(map)`（地圖 `respawnSec`，沒有＝`MONSTER_RESPAWN_SECONDS` 10 秒）；combat.js 波次全滅後用它；save.js 離線丹藥估算（`settleIdlePotions`）的刷新調息也改用它（3 秒調息少，耗藥多）。
- **收益**：`getRewardMap()` 在時空秘境＝自己境界的主要地圖（同挑戰模式，第 70 節），經驗、靈石、聲望、刷新補償不因 30 倍強度暴增；可離線／背景掛機（撐不住照常退回）。
- **掉落**（`SPACETIME_REALM`，config-maps.js；掉率使用者未指定，先用這組；每次掉寶＝`takeDropRolls` 的次數，每小時最多 1200，離線用收益次數）：
  - `rollSpacetimeDrops(rolls, silent)`（map.js）：鍛造圖紙 1/3000，固定 `getSpacetimeBlueprintLevel()`＝3000 等以內最高檔（**2500 等**；圖紙沒有 3000 等這一檔，第 55 節），再經 `grantBlueprint` 的 5000 等以下 ×2 → 每小時約 0.7 張；
    五行傳送陣靈石每種 1/1200（每小時各約 1 顆）；星允鐵 1/200 × 1～3（約 12 顆）；異火碎片 1/400 × 1～2（約 4.5 片）。
    `grantBlueprint(chance, sourceText, fixedLevel)` 新增選填固定檔次；lingjie.js 的 `rollLingStoneDrops` 在時空秘境不套一般規則（改由這裡掉）。
  - `getChallengeCraftMult()` 在時空秘境回傳 `craftMult` 3 → 做裝通貨（線上、離線）與中品武學秘典碎片（第 35 節，人界野外＝中品）×3，每小時約 12 片。
- **不掉靈石＋每秒能量消耗**（2026-10-06，版本 `20261005CG`，使用者：「時空秘境內不會掉落任何靈石；相反每秒扣 1 萬靈石才足以支撐開啟時空秘境的能量消耗」）：
  - `SPACETIME_REALM.upkeepPerSec` 10000。combat.js 的 `rollKillCoins` 在時空秘境回傳 0；save.js 離線／背景的 `coinPerTick` 也是 0（上面「收益」一條的靈石部分作廢，經驗、聲望仍照主要地圖）。
  - **線上**：`combatTick` 每秒（壽元之後）呼叫 map.js 的 `tickSpacetimeUpkeep()`：夠就扣 1 萬；不夠就 `sendToRespawn()`、系統日誌與提示條「靈石耗盡」，這一秒不再戰鬥。
  - **離線／背景**（`settleIdleSeconds`）：可撐秒數＝靈石 ÷ 1 萬（不超過離線秒數），只有這段算時空秘境的戰鬥與掉落、先扣掉花費；撐不到的秒數送回復活點、照復活點靜修給經驗；
    壽元、門派任務、靈寵維持費仍用全部離線秒數（`totalIdleSeconds` 還原）。結算訊息列「🌀 維持時空秘境能量，消耗 N 靈石」與耗盡時間。
  - 進入時靈石少於 1 萬直接擋下；確認視窗說明不掉靈石、每秒／每小時花費（3,600 萬）與目前靈石可撐多久。
- **讀檔修正（第 70 節相關）**：save.js 的 `migrateCurrentMap` 原本把「境界不夠還待在裡面」的玩家送回宗門——挑戰模式改成可離線掛機後，這會讓關掉遊戲再開的離線掛機無效；
  改成留在原地（離線結算照實力估算），只有超過 `maxRealm`（時空秘境的天仙以上）才送回宗門。
- **驗證**（本機）：亂星海分區跳出說明、確定後進入（原始版與建置版）；凡人妖獸「凡人10階」、倍率 30、氣血為巔峰 1 倍的 30.1 倍；新角色 30 秒內戰死、折壽回宗門；
  妖獸秒殺時「3 秒後刷新」倒數 3→2→1；100 小時模擬：圖紙 0.70 張／小時（全是 2500 等）、靈石各 1.00、星允鐵 12.1、異火 4.5、中品碎片 12.0；
  離線 1 小時留在時空秘境、靈石與主要地圖相同（11,440）並列出專屬掉落；挑戰地圖存檔重載留在原地；天仙存在時空秘境的存檔重載送回宗門；天仙進入被擋、仙人初境可進；Console 無錯誤。
- **經驗異常修正＋收益上限 3 倍**（2026-10-09，版本 `20261005CV`，使用者：「亂星海時空秘境經驗值異常，只有第一波經驗比較多，後面都是固定的」→ 選「秘境上限提高到 3 倍」）：
  - 原因：combat.js 每波開打算 `waveRewardAdj`（第 56 節末「經驗過高」的收益速度上限，最多＝主要地圖一般玩家的 `NV2.rewardSpeedCap` 1 倍）。
    第一波還沒有實測速度（`waveObs` 換圖就清空），只用 `nv2EstimateIdleCombat` 估算——估的是 30 倍妖獸、不含群攻／靈寵／夥伴，判定很慢 → 不打折；第二波起用實測速度 → 被壓回 1 倍，所以之後每波固定。
    地圖的 `expRate: 3` 因為經驗照主要地圖（`getRewardMap`）其實沒用到。
  - **上限 3 倍**：`SPACETIME_REALM.rewardSpeedCap` 3；map.js 新增 `getRewardSpeedCap()`（時空秘境 3、其他 `NV2.rewardSpeedCap`）；numeric.js 的 `nv2RewardSpeedAdj(map, observed, cap)` 多第三個參數。
  - **第一波一致**（所有地圖都套用）：沒有實測時先用最保守的「1 回合殺一隻」算折扣（`waveSummary.provisional`），並累計這波的原始收益 `rawExp／rawCoins／rawRep`；
    敵方全滅、記下實測後重算 `nv2RewardSpeedAdj`，比原本的折扣好就補發差額（經驗、靈石、聲望；只補不扣），彙總日誌顯示補發後的數字。熟練度、救僕從、修士遭遇機率不補（只影響第一波）。
  - 離線／背景結算不變（`rateMult` 本來就最多 1 倍一般玩家）。
  - 驗證（本機，化神 10 階在時空秘境、攻擊改成秒殺／4 下一隻、不存檔）：秒殺時上限 1 倍每隻約 9,945 經驗，3 倍每隻約 2.8 萬（這個速度未達 3 倍，等於不打折）；
    第一波與之後每波的每隻經驗相同（5.55 萬／2 隻、8.41 萬／3 隻、2.8 萬／1 隻）；4 下一隻時第一波經補發後同樣 8.41 萬／3 隻；Console 無錯誤。
  - **離線也 3 倍**（同日，版本 `20261005CV`，使用者：「離線也改成三倍」；上一條「離線／背景結算不變」作廢）：save.js 的 `settleIdleSeconds` 在時空秘境算 `stRewardMult`＝
    min(`getRewardSpeedCap()`，(刷新間隔＋隻數 × 主要地圖一般玩家每隻回合) ÷ (刷新間隔＋隻數 × 自己在秘境的每隻回合 `est.hits`)) ÷ `est.rateMult`，最少 1（原本 `rateMult` 是跟秘境裡的一般玩家比、最多 1）。
    只乘在經驗、聲望、熟練度；掉落（圖紙、靈石、通貨、碎片…）仍用 `combatTicks`，不跟著變 3 倍。離線收益折扣 `OFFLINE_REWARD_MULT`、丹藥不足的比例照舊。
    驗證（化神 10 階離線 1 小時、不存檔）：秒殺配置 經驗 257 萬 → 740 萬（約 2.9 倍，速度沒到 3 倍上限）、聲望 3,460 → 9,759；6 下一隻的配置維持約 1 倍；Console 無錯誤。

## 79. 仙魔戰場（靈界・風元大陸；`map.js`、`config-maps.js`；2026-10-09，版本 `20261005CX`）

- **使用者指定**：「靈界地圖的風元大陸新增仙魔戰場；從仙人初境開始對應到混沌道祖；敵人每個境界 10 階，強度跟適合地圖設定一樣（如果某地圖設定天仙強度 10～20，那裡面怪物也是對應強度）；
  刷怪時間一秒，讓你自顧不暇；沒有設定經驗上限」。「適合地圖」＝各境界的主要練功圖（config-realms.js 的 `realmPacing`，`getMainMapForRealm`）。
- **地圖**（config-maps.js 第五區「諸天至高戰場」最後一張，`hidden`、`xianmo: true`）：`hardMinRealm: 10`（map.js 的 `getMapEntryBlock` 新增硬性門檻：仙人初境以下直接擋，短字「🔒仙人初境」，**不能用挑戰模式越級**）、`respawnSec: 1`；
  `nv2L`／`nv2FixedL`／`suit`／`nv2Str` 是 **getter**：`nv2L`＝玩家境界夾在 10～15，`nv2FixedL`＝境界＋0.9（該境界 10 階，沒有境界壓制），`nv2Str`＝主要練功圖的 `nv2Str`：
  | 境界 | 主要練功圖 | 敵人 | 強度 |
  |---|---|---|---|
  | 仙人初境 | 星空古路 | 仙人初境 10 階 | 10～15 倍 |
  | 天仙 | 九天仙域 | 天仙 10 階 | 10～15 倍 |
  | 真仙 | 不死山 | 真仙 10 階 | 40～50 倍 |
  | 大羅金仙 | 仙界戰場 | 大羅金仙 10 階 | 80～120 倍 |
  | 混元大羅金仙 | 萬界戰場 | 混元大羅金仙 10 階 | 120～160 倍 |
  | 混沌道祖 | 混沌初界 | 混沌道祖 10 階 | 160～200 倍 |
  主要練功圖的強度改了，仙魔戰場自動跟著變。出沒（config-monsters.js 的 `FIELD_MONSTER_POOLS`）：青鱗蒼龍、赤羽火鳳、焰蹄麒麟（仙獸）＋血煞魔修、魔道術士、傀儡魔偶（魔修），各權重 2。
- **入口**：靈界地圖（config-towns.js `townScenes["靈界"]`）紅點 `lj-xianmo`，在圖上「風元大陸」直書字正下方 (118, 325)；`mapName` 讓境界不足時紅點變灰。
  點了 → map.js 的 `enterXianmoBattlefield()`：檢查門檻 → `gameConfirm` 說明（可進境界、你的敵人等級與強度、1 秒刷新、戰死懲罰、收益照主要練功圖且不封頂）→ `selectMap`。屬於第五區，所以要身在靈界（第 74 節）。
- **收益**：地圖 `rewardAsMain: true` → map.js 的 `getRewardMap()` 照主要練功圖（經驗、靈石、聲望、刷新補償）；`rewardSpeedCap: Infinity` → `getRewardSpeedCap()` 回傳地圖自訂值（時空秘境 3、其他 `NV2.rewardSpeedCap`），
  線上 `nv2RewardSpeedAdj` 不打折、離線 save.js 的 `stRewardMult` 同第 78 節算法但不封頂（條件改為 `getRewardSpeedCap() > NV2.rewardSpeedCap`）。掉落照一般規則（每小時掉寶次數本來就封頂 1200，第 71 節）。
  ⚠️ 刷新 1 秒＋不封頂：秒殺的強力配置每小時經驗可達主要練功圖的數十倍；離線結算仍以 10 秒刷新估算，所以離線比線上少。
- 驗證（本機，不存檔）：渡劫被擋（🔒仙人初境），仙人初境～混沌道祖的敵人等級與強度如上表、境界壓制 0；天仙 10 階秒殺配置線上 10 分鐘：九天仙域每小時經驗 8,661 萬（收益上限 ×0.089）、
  仙魔戰場 35.6 億（不打折、收益照九天仙域、刷新 1 秒）；離線 1 小時 4,290 萬 → 4.8 億；靈界地圖紅點位置、點擊跳出說明、取消不進入；Console 無錯誤。
- **專屬掉落**（2026-10-09，版本 `20261005CY`，使用者：「仙魔戰場掉落 2500 等以上裝備製作圖、上品武學秘典碎片、絕學碎片、尊者以上碎片；帝境、至高掉落機率難」→ 選「很難」）：
  - 設定 config-maps.js 的 `XIANMO_DROPS`；map.js 的 `isXianmoMap()`、`rollXianmoDrops(rolls, silent)`：線上 combat.js 掉寶時（`takeDropRolls` 的次數，每小時最多 1200）、離線 save.js 用收益次數（結算訊息「⚔️ 仙魔戰場的敵人遺落 …」）。
  | 掉落 | 每次掉寶機率 | 約多久 |
  |---|---|---|
  | 鍛造圖紙（等級＝max(2500, `getBlueprintDropLevel()`)，部位隨機） | 1/2000（5000 等以下 ×2，照 `grantBlueprint`） | 每小時 0.6～1.2 張 |
  | 上品武學秘典碎片 | 沿用靈界野外 1/600（spells.js 的 `rollSpellShardFieldDrops`） | 約 50 小時一招 |
  | **絕學武學秘典碎片**（新） | 1/6000 | 約 500 小時一招 |
  | 尊者夥伴碎片 ×1～2 | 1/800 | 約 45 小時一位（100 片） |
  | 帝境夥伴碎片 ×1～3 | 1/6000 | 約 750 小時一位（300 片） |
  | 至高夥伴碎片 ×1～3 | 1/15000 | 約 3000 小時一位（500 片） |
  夥伴碎片用 partner.js 的 `grantPartnerShards([該評級], 1, amount, …)`：只掉該評級尚未結識的夥伴（70% 集中給碎片最多的那位），該評級都結識完就不掉、不往上遞補。
  - 絕學碎片：config-spells.js 的 `SPELL_SHARD_KINDS.ultimate`（存檔 `player.spellShardsUltimate`，沒有就當 0，不必改存檔結構）；武學密典視窗的碎片列與合成（100 片隨機習得一招未學會的絕學，20 招）沿用既有的 `synthesizeSpell`，自動多出一列。
  - 說明文字：`enterXianmoBattlefield` 確認視窗多一行專屬掉落；config-partners.js 的 `PARTNER_MEET_HINT` 尊者／帝境／至高加上「靈界仙魔戰場」。
  - 驗證（本機，真仙 10 階 Lv.3000，模擬 100 小時＝12 萬次掉寶，不存檔）：圖紙 130 張（全 2500 等、17 部位都有）、上品碎片 200、絕學碎片 25、尊者碎片 212、帝境 40、至高 23；其他地圖呼叫不掉；確認視窗文字正確；Console 無錯誤。

