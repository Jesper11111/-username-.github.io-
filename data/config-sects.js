// 宗門資料：分類、境界門檻、經驗/戰力倍率與技能組
// weapon：宗門傳承的武器（config-profession.js 的 professions[].slot）。主修同武器的職業且身在此宗門時有「傳承加成」（SECT_LEGACY_BONUS，profession.js）；
//         三個階段各 6 個宗門，6 種武器各一（2026-09-27 使用者要求門派與職業掛鉤）
//
// 宗門技能規則（詳見 ARCHITECTURE.md 第 13 節）：
//   - 三個階段（凡俗 / 修真 / 至高）各只能拜入「一個」宗門，選定後該階段永久鎖定。
//   - 拜入即學會該宗門的 2 招技能；之後換到下一階段的宗門，舊技能「保留」不會消失。
//   - 最終可同時擁有 初級 + 中級 + 高級 三個門派、共 6 招宗門技能。
//
// 技能傷害 = 對應攻擊力 × (1 + 階段加成)
//   dmgType "phys" → 物理攻擊（受【力量】影響）
//   dmgType "mag"  → 法術攻擊（受【悟性】影響）
//   ※ 若實測傷害過高，只需調整下方 SECT_SKILL_BONUS，所有宗門技能會一起生效。
//
// 野外平均輸出提升（技能觸發率 40%、單體）：初級約 +20%、中級 +40%、高級 +80%，不會出現異常爆量。
// ※ 渡劫勝負已改為「勝算擲骰」（config-tribulation.js），不再受這裡的倍率影響；
//   學會宗門技能對渡劫的幫助是固定的勝算加成（最多 +10%）。
const SECT_SKILL_BONUS = { 1: 0.50, 2: 1.00, 3: 2.00 };   // 初級 150% / 中級 200% / 高級 300%
const SECT_TIER_NAMES = { 1: "初級", 2: "中級", 3: "高級" };
// 宗門武學收錄進武學密典的品階（2026-10-06 使用者：「宗門武學最高級設定成上品武學」）：初級→下品、中級→中品、高級→上品（只是分類，威力仍照 SECT_SKILL_BONUS）
const SECT_SKILL_GRADE = { 1: "low", 2: "mid", 3: "high" };

const sectData = [
    { category: "一、凡俗宗門 (金丹期以前可加入)", tier: 1, minRealm: 0, maxRealm: 3, items: [
        { name: "武當", weapon: "劍", buff: "經驗x1.1, 戰力x1.1", expMult: 1.1, powerMult: 1.1,
          skills: [{name:"太極拳", type:"single", dmgType:"phys", mpCost:45, msg:"施展【太極拳】，借力打力反震敵手！"},
                   {name:"純陽無極功", type:"single", dmgType:"mag", mpCost:60, msg:"運轉【純陽無極功】，純陽真氣透體而出！"}] },
        { name: "峨嵋", weapon: "笛", buff: "經驗x1.2, 戰力x1.0", expMult: 1.2, powerMult: 1.0,
          skills: [{name:"峨嵋劍法", type:"single", dmgType:"phys", mpCost:60, msg:"劍光如水，【峨嵋劍法】直取敵害！"},
                   {name:"清心普善咒", type:"aoe", dmgType:"mag", mpCost:75, msg:"彈奏【清心普善咒】，音波震盪群敵！"}] },
        { name: "少林寺", weapon: "刀", buff: "經驗x1.0, 戰力x1.3", expMult: 1.0, powerMult: 1.3,
          skills: [{name:"金剛伏魔", type:"single", dmgType:"phys", mpCost:75, msg:"大喝一聲，施展【金剛伏魔】杖法！"},
                   {name:"獅子吼", type:"aoe", dmgType:"mag", mpCost:75, msg:"運起佛門【獅子吼】，聲浪橫掃四方！"}] },
        { name: "全真教", weapon: "筆", buff: "經驗x1.3, 戰力x1.0", expMult: 1.3, powerMult: 1.0,
          skills: [{name:"全真劍法", type:"single", dmgType:"phys", mpCost:60, msg:"【全真劍法】靈動飄逸刺向敵人！"},
                   {name:"先天功", type:"single", dmgType:"mag", mpCost:75, msg:"運轉【先天功】，先天罡氣破空而至！"}] },
        { name: "皇朝", weapon: "弓", faction: "邪", buff: "經驗x1.2, 戰力x1.2", expMult: 1.2, powerMult: 1.2,
          skills: [{name:"真龍拳", type:"single", dmgType:"phys", mpCost:75, msg:"攜帶帝王之氣，【真龍拳】震撼全場！"},
                   {name:"皇極經世", type:"aoe", dmgType:"mag", mpCost:90, msg:"【皇極經世】大範圍威壓掃過群敵！"}] },
        // 逍遙派（2026-09-27 新增）：補齊凡俗宗門的「扇」傳承
        { name: "逍遙派", weapon: "扇", buff: "經驗x1.2, 戰力x1.1", expMult: 1.2, powerMult: 1.1,
          skills: [{name:"天山折梅手", type:"single", dmgType:"phys", mpCost:60, msg:"【天山折梅手】變化萬千，拆盡敵招！"},
                   {name:"逍遙扇舞", type:"aoe", dmgType:"mag", mpCost:75, msg:"羽扇一展，【逍遙扇舞】清風化刃席捲群敵！"}] }
    ]},
    { category: "二、修真仙門 (金丹期以上可加入)", tier: 2, minRealm: 3, maxRealm: 10, items: [
        { name: "崑崙仙宗", weapon: "扇", buff: "經驗x1.5, 戰力x1.5", expMult: 1.5, powerMult: 1.5,
          skills: [{name:"玉清仙法", type:"aoe", dmgType:"mag", mpCost:120, msg:"施展【玉清仙法】，清光如瀑傾瀉而下！"},
                   {name:"崑崙印", type:"single", dmgType:"phys", mpCost:105, msg:"祭出【崑崙印】砸向敵人！"}] },
        { name: "蜀山劍派", weapon: "劍", buff: "經驗x1.0, 戰力x2.5", expMult: 1.0, powerMult: 2.5,
          skills: [{name:"萬劍訣", type:"aoe", dmgType:"mag", mpCost:150, msg:"劍氣化萬，【萬劍訣】橫掃全場！"},
                   {name:"天劍", type:"single", dmgType:"phys", mpCost:120, msg:"人劍合一，化為【天劍】貫穿強敵！"}] },
        { name: "丹鼎司", weapon: "筆", buff: "經驗x3.0, 戰力x0.8", expMult: 3.0, powerMult: 0.8,
          skills: [{name:"三昧真火", type:"aoe", dmgType:"mag", mpCost:135, msg:"吐出【三昧真火】焚燒周圍妖獸！"},
                   {name:"丹爐撼岳", type:"single", dmgType:"phys", mpCost:105, msg:"掄起丹爐，【丹爐撼岳】當頭砸下！"}] },
        { name: "御獸仙宗", weapon: "弓", buff: "經驗x1.2, 戰力x2.2", expMult: 1.2, powerMult: 2.2,
          skills: [{name:"獸王怒", type:"single", dmgType:"phys", mpCost:105, msg:"激發【獸王怒】，猛撲撕咬強敵！"},
                   {name:"萬獸奔騰", type:"aoe", dmgType:"mag", mpCost:150, msg:"召喚靈獸【萬獸奔騰】踐踏敵人！"}] },
        // faction: 陣營（沒寫 = 正），用於判定玩家屬於正派或邪派（merit.js 的 getPlayerFaction）
        { name: "天魔教", weapon: "刀", faction: "邪", buff: "經驗x1.5, 戰力x3.5", expMult: 1.5, powerMult: 3.5,
          skills: [{name:"噬血斬", type:"single", dmgType:"phys", mpCost:105, msg:"【噬血斬】劈出，魔氣滔天！"},
                   {name:"天魔解體", type:"aoe", dmgType:"mag", mpCost:150, msg:"【天魔解體大法】！魔氣爆散吞噬群敵！"}] },
        // 天音閣（2026-09-27 新增）：補齊修真宗門的「笛」傳承
        { name: "天音閣", weapon: "笛", buff: "經驗x2.0, 戰力x1.8", expMult: 2.0, powerMult: 1.8,
          skills: [{name:"天音破魔曲", type:"aoe", dmgType:"mag", mpCost:150, msg:"笛聲激越，【天音破魔曲】震碎群敵心神！"},
                   {name:"裂石音刃", type:"single", dmgType:"phys", mpCost:120, msg:"音波凝刃，【裂石音刃】穿石而過！"}] }
    ]},
    { category: "三、至高聖地 (仙人初境解鎖)", tier: 3, minRealm: 10, maxRealm: 99, items: [
        { name: "太清道德宗", weapon: "扇", buff: "經驗x4.0, 戰力x3.0", expMult: 4.0, powerMult: 3.0,
          skills: [{name:"太極陰陽圖", type:"aoe", dmgType:"mag", mpCost:240, msg:"奉太上老君之令，【太極陰陽圖】化解萬敵攻勢！"},
                   {name:"九轉金丹掌", type:"single", dmgType:"phys", mpCost:180, msg:"【九轉金丹掌】挾丹火之威轟出！"}] },
        { name: "玉清闡教宗", weapon: "筆", buff: "經驗x3.0, 戰力x4.5", expMult: 3.0, powerMult: 4.5,
          skills: [{name:"翻天印", type:"single", dmgType:"phys", mpCost:210, msg:"奉元始天尊法旨，祭出【翻天印】鎮壓世間！"},
                   {name:"金光神咒", type:"aoe", dmgType:"mag", mpCost:240, msg:"【金光神咒】開啟，金霞萬道灼燒群敵！"}] },
        { name: "上清截教宗", weapon: "劍", buff: "經驗x2.5, 戰力x6.0", expMult: 2.5, powerMult: 6.0,
          skills: [{name:"誅仙劍陣", type:"aoe", dmgType:"phys", mpCost:300, msg:"奉通天教主之意，【誅仙劍陣】一出，煞氣撕裂天地！"},
                   {name:"上清雷法", type:"single", dmgType:"mag", mpCost:180, msg:"引動九天【上清雷法】轟殺至強敵手！"}] },
        { name: "萬界仙門", weapon: "弓", buff: "經驗x5.0, 戰力x5.0", expMult: 5.0, powerMult: 5.0,
          skills: [{name:"萬界穿梭", type:"single", dmgType:"phys", mpCost:180, msg:"掌控【萬界穿梭】奧義，自虛空中一擊斃敵！"},
                   {name:"諸天寂滅", type:"aoe", dmgType:"mag", mpCost:300, msg:"打出【諸天寂滅】掌印，萬法歸宗！"}] },
        // 九幽黃泉：至高聖地唯一的邪派（2026-09-25 新增），戰力偏高、經驗中等
        { name: "九幽黃泉", weapon: "刀", faction: "邪", buff: "經驗x3.5, 戰力x5.5", expMult: 3.5, powerMult: 5.5,
          skills: [{name:"九幽冥掌", type:"single", dmgType:"phys", mpCost:210, msg:"一掌拍出九幽之氣，【九幽冥掌】直貫敵心！"},
                   {name:"黃泉引魂", type:"aoe", dmgType:"mag", mpCost:270, msg:"黃泉之水倒灌人間，【黃泉引魂】拘走群敵魂魄！"}] },
        // 天籟仙宮（2026-09-27 新增）：補齊至高聖地的「笛」傳承
        { name: "天籟仙宮", weapon: "笛", buff: "經驗x4.0, 戰力x4.0", expMult: 4.0, powerMult: 4.0,
          skills: [{name:"天籟九霄", type:"aoe", dmgType:"mag", mpCost:270, msg:"仙樂自九霄而降，【天籟九霄】滌盪萬敵！"},
                   {name:"仙音斷魂", type:"single", dmgType:"phys", mpCost:210, msg:"一聲清音直貫神魂，【仙音斷魂】！"}] }
    ]}
];

// 依階段補上技能的 tier 與傷害倍率（mult），調整數值請改上方 SECT_SKILL_BONUS
sectData.forEach(cat => {
    cat.items.forEach(sect => {
        sect.tier = cat.tier;
        sect.skills.forEach(sk => {
            sk.tier = cat.tier;
            sk.mult = 1 + SECT_SKILL_BONUS[cat.tier];
            sk.grade = SECT_SKILL_GRADE[cat.tier];
        });
    });
});

function findSectByName(name) {
    for (let cat of sectData) {
        for (let s of cat.items) {
            if (s.name === name) return s;
        }
    }
    return null;
}
