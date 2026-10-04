// 秘境（活動選單「🌀 秘境」，secret-realm.js，ARCHITECTURE.md 第 43 節）
// 目前只做入口：秘境列表 → 全螢幕場景；implemented: false 的秘境按「入塔挑戰」只顯示預定玩法與獎勵（敬請期待）。
// 新增秘境：在 secretRealmList 加一筆即可出現在列表（img 建議 9:16 直式海報，重要內容放中間）。
// 選填欄位：size [寬, 高]（海報像素，決定場景比例；沒填 = 768×1365）、imgPc＋sizePc（橫向螢幕改用的海報）、
//           sceneTitle／sceneSub（海報上沒有字時疊上標題）、enterLabel（按鈕文字）、enterPos: 'bottom'（按鈕在海報下方置中）、
//           mode: 'defense'（按鈕直接開啟守城玩法 openDefenseBattle，defense.js）／'tower'（鎮魔塔塔廳 openZhenmoTower，zhenmo.js）／'worldboss'（點卡片直接開世界 Boss 視窗，world-boss.js）

const SECRET_REALM_DAILY_ATTEMPTS = 3;   // 每個秘境各自每日可挑戰次數（開始挑戰即扣，失敗或中途離開也算；2026-09-27 由 5 改 3）

const secretRealmList = [
    {
        id: "zhenmo",
        name: "鎮魔塔",
        img: "images/secret/zhenmo-tower.jpg",   // 768×1365（9:16），玩家提供的水墨海報（圖上已有「鎮魔塔」標題與底部標語）
        minRealmIndex: 6,                         // 同活動「秘境」的開放境界（煉虛）
        implemented: true,                        // 2026-09-27：100 層＋知識問答＋BOSS 戰（BOSS 資料在 config-zhenmo.js 的 ZHENMO_BOSSES，目前只有第 1 層）
        mode: "tower",                            // 按鈕直接進入鎮魔塔塔廳（zhenmo.js，第 51 節）
        tagline: "諸天鎮魔！凡人速速離去",
        desc: "上古諸天大能合力鎮壓群魔之塔，塔中魔頭層層盤踞。傳聞塔頂封存著異火與諸天遺寶，亦有域外高人在此出沒。",
        // 預定獎勵（顯示用；玩法實作時接上：異火碎片 addFireShards、秘境裝備 gear.js 的 realm 管道、夥伴 meetPartner、基本資源）
        rewards: [
            { icon: "🔥", text: "異火碎片（集滿可合成天下異火）" },
            { icon: "⚔️", text: "秘境裝備與 30 組套裝" },
            { icon: "💞", text: "有緣結識諸天夥伴" },
            { icon: "💎", text: "靈石、星允鐵等資源" }
        ]
    },
    {
        id: "motu",
        name: "魔屠天南",
        img: "images/secret/motu-tiannan.jpg",        // 852×1846 手機版海報（玩家提供，圖上無字）
        size: [852, 1846],
        imgPc: "images/secret/motu-tiannan-pc.jpg",   // 1024×1536 PC 版海報（橫向螢幕使用）
        sizePc: [1024, 1536],
        minRealmIndex: 6,
        implemented: true,
        mode: "defense",                              // 按鈕直接進入死守天南城（defense.js，第 49 節）
        sceneTitle: "魔屠天南",
        sceneSub: "死守天南城・共 100 波",
        enterLabel: "⚔️ 死守天南城",
        enterPos: "bottom",
        tagline: "妖潮壓境，天南城危！",
        desc: "萬千妖魔夜襲天南城，一人一劍鎮守城關，以飛劍、法術與法相死守 100 波妖潮。",
        // 每守住一波發放（數值見 config-defense.js 的 DEFENSE_REWARDS）
        rewards: [
            { icon: "💎", text: "靈石（依波次強度）" },
            { icon: "☯️", text: "功德" },
            { icon: "🔥", text: "異火碎片" },
            { icon: "🌠", text: "星允鐵" },
            { icon: "⚔️", text: "器錄武器、防具；秘境套裝部件（一次一件）" },
            { icon: "🏅", text: "守城稱號（10／30／50／80／100 波）" },
            { icon: "💞", text: "第 51 波起有緣遇見天驕級夥伴" }
        ]
    },
    {
        id: "worldboss",
        name: "世界 Boss",
        img: "images/zhenmo/boss-yamata.jpg",   // 卡片縮圖（沿用鎮魔塔 BOSS 圖；世界 Boss 不走海報場景，點卡片直接開視窗）
        minRealmIndex: 6,
        implemented: true,
        mode: "worldboss",                       // 點卡片直接 openWorldBossModal()（world-boss.js，第 75 節）；次數由雲端記錄，不用 SECRET_REALM_DAILY_ATTEMPTS
        tagline: "諸天共伐，一戰定名",
        desc: "每週六 20:00～週日 20:00，全服修士共同討伐一隻世界 Boss。",
        rewards: []
    }
];
