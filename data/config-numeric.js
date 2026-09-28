// 數值重做（新制，ARCHITECTURE.md 第 52 節）：小數字 RPG 制＋第六屬性「敏捷」
// 參數由 tools/數值設計器.html 定案（2026-09-27，使用者確認）。公式在 numeric.js。
//
// 開關 NUMERIC_V2：2026-09-28 第 3 階段完成，**正式上線、預設開啟**（版本 20260929r）。
//    緊急退回舊制（只影響自己的瀏覽器，除錯用）：Console 執行 localStorage.setItem('xiuxian_numeric_v2', '0') 後重新整理；恢復：removeItem。
//    ⚠️ 已轉換過的存檔丹藥已清空（save.js 的 migrateNumericV2），退回舊制不會還原。
//    gm.html 也載入本檔（守城審核、戰力上限用新制算法）。
const NUMERIC_V2 = (() => { try { return localStorage.getItem('xiuxian_numeric_v2') !== '0'; } catch (e) { return true; } })();

const NV2 = {
    // ---- 成長曲線 ----
    growth: 1.05,               // 每個大境界 ×1.05（階數內平滑：境界 + (階−1)/10）
    weaponBase: 5,              // 凡人白色武器攻擊
    // 武器品質倍率（設計器的「一般玩家品質」1.25 ≈ 藍色）
    quality: { "白色": 1, "綠色": 1.1, "藍色": 1.25, "紫色": 1.35, "橙色": 1.5, "白金": 2 },
    weaponLevelSpan: 10,        // 裝備等級 10～1000（EQUIP_LEVELS 共 10 檔）對應成長曲線的 0～10 個大境界（Lv.1000 ≈ 仙人初境）
    // 圖紙裝備（Lv.1500 以上，config-equipment.js 的 BLUEPRINT_LEVELS）接在 Lv.1000 後繼續成長：各檔的成長位置 L
    //   「一般玩家」（怪物強度基準）仍假設武器最多 L 10，圖紙裝備是後期額外的戰力，不會讓怪物變強
    blueprintWeaponL: { 1500: 11, 2500: 12, 3500: 13, 5000: 14, 6500: 15, 8000: 15.5, 10000: 16 },
    enhancePerLevel: 0.025,     // 強化每 +1：武器攻擊 +2.5%（+20 = +50%）

    // ---- 六大屬性 ----
    statStart: 5,               // 起始屬性
    statPerStage: 1,            // 每升一階 +1
    statPerRealm: 5,            // 每突破一個大境界 +5
    pillGain: 0.1,              // 丹藥每顆 +0.1（使用者指定：大力神丸一顆 +0.1 力量，最多 200 顆；其他丹藥同規則）
    pillMax: 200,
    studyGain: 0.1,             // 藏書閣每次研讀 +0.1，最多 200 次（同丹藥規則）
    studyMax: 200,
    gearStatPerPiece: 0.5,      // 每件裝備的屬性點 = 四維範本係數（合計 2.0）× 0.5 × 品質倍率（全身約 +5／屬性，對齊設計器「額外 10%」）

    // ---- 力量／悟性 ----
    fistCoef: 0.05,             // 空手傷害 = 力量 × 0.05（術法用悟性）
    atkPctPerPoint: 0.1,        // 每點力量（術法：悟性）攻擊 +0.1%

    // ---- 增益（全部相加後封頂）----
    buffCap: 200,               // 增益上限 +200%（攻擊、氣血各自計算）
    sectBuffPerMult: 20,        // 宗門戰力倍率換算：(倍率 − 1) × 20%（×2.5 → +30%、×6 → +100%）

    // ---- 敏捷 ----
    critPer: 0.01, critCap: 30, critDmg: 1.5,   // 暴擊率每點 +0.01%（上限 30%），暴擊傷害 ×1.5
    comboPer: 0.04, comboCap: 10,              // 連擊（本回合多一次普攻）每點 +0.04%（上限 10%）
    hitPer: 0.08,                              // 命中每點 +0.08%（抵銷對方閃避）
    evaPer: 0.08,                              // 閃避每點 +0.08%（與裝備合計仍受 EVA_CAP 40% 限制）

    // ---- 氣血／靈力 ----
    hpBaseMult: 10,             // 氣血基數 = 武器基數 × 10 × 成長（凡人 50）
    conPct: 0.2,                // 每點體質氣血 +0.2%
    levelHpPct: 0.005,          // 人物等級：每級氣血 +0.005%（Lv.1000 +5%、Lv.10000 +50%；等級不再加屬性）
    // 2026-09-28 使用者選「靈力與技能耗魔一起縮小 10 倍」（原本 50＋靈力×10、耗魔 45～360，氣血卻只有幾十，看起來氣血比靈力低很奇怪）：
    //   比例不變 → 放技能、吃藥的頻率完全不變；靈力回復本來就全是按上限百分比，不用改
    mpBase: 5, mpPerSpr: 1,     // 靈力上限 = 5 + 靈力 × 1
    levelMp: 0.05,              // 人物等級：每級靈力 +0.05
    mpScale: 0.1,               // 技能耗魔倍率（numeric.js 的 skillMpCost：原耗魔 × 0.1 無條件進位，例 45→5、150→15、360→36）

    // ---- 戰力（畫面與戰力榜顯示的綜合數字）----
    powerSkillRate: 0.4, powerSkillMult: 3,  // 戰力 = 攻擊 × 暴擊期望 × 連擊期望 × 技能期望（40% 機率 ×3）

    // ==== 第 2 階段：怪物與內容 ====
    // 「一般玩家」參考值（numeric.js 的 nv2Typ*）：怪物強度以此為基準，與設計器的「一般」欄相同
    typStatExtra: 0.1,          // 屬性額外 +10%（丹藥、藏書閣、裝備的一般水準）
    typQuality: 1.25,           // 一般玩家武器品質（藍色）
    typBuffStart: 10, typBuffPerL: 10, typBuff: 50,   // 一般玩家增益：凡人 +10%，每個大境界 +10%，元嬰起 +50%（凡俗宗門最多只給 +6%，前期不能假設 +50%）
    typSkillAvg: 1.1,           // 技能期望倍率：只用來估算擊殺速度與收益補償（實測靈力有限、常「靈力不足」，技能實際只多約 10%）
    // 野外（使用者 2026-09-27 選定「少怪＋調息」；攻擊與調息比例由模擬實測定案，見 ARCHITECTURE.md 第 52 節）
    hitsSame: 25,               // 同境界小怪：一般玩家普攻 25 下
    monAtkPct: 0.4,             // 小怪攻擊 = 同境界一般玩家氣血 × 0.4%（保留 1 位小數，傷害也是，見 elements.js 的 roundDmg）
                                //   實測：同境界不吃丹藥也撐得住（最低約 10% 血）；越一個境界打沒丹藥會陣亡，吃丹藥約每小時 100 顆
    waveMin: 1, waveMax: 3, waveAvg: 2,   // 每波隻數（舊制 1～5）
    // 境界壓制（numeric.js 的 nv2SuppressMult，2026-09-28）：地圖妖獸境界比玩家高 gap 個大境界時，妖獸氣血 ×(1+gap×1.0)、攻擊 ×(1+gap×1.2)
    //   例：金丹 10 階打煉虛（gap 2.1）→ 要約 100 下殺一隻、約 60 下就陣亡；同境界 10 階打下一境界（gap 0.1）只強 1 成
    suppressHp: 1.0,
    suppressAtk: 1.2,
    // 每小時收益（經驗、靈石、聲望、熟練度）的速度上限（numeric.js 的 nv2RewardSpeedAdj，2026-09-28 修正經驗過高）：
    //   以估算公式計算「相對同境界一般玩家」的速度，超過此倍數的部分打折。實際殺怪比估算快約 1.2～1.4 倍，
    //   所以設 1.0 時，實測一般玩家 1.22 倍、強力配置約 1.3～1.4 倍（未修正前強力配置 3.9 倍）
    rewardSpeedCap: 1.0,
    restHealPct: 10,            // 刷新等待（10 秒）期間調息：每秒回復 10% 氣血與靈力，等於每波開打前補滿
    // 懸賞對決（bounty.js 的 getBountyStats）：以同境界一般玩家為鏡像，再乘下列倍率（× 天榜倍率 × 榜別比例）
    //   新制氣血只有攻擊的約 7 倍，直接鏡像 5 回合就分勝負且太簡單；氣血 ×3 讓對決回到約 8～16 回合，攻擊 ×0.7 讓勝率接近舊制（第 36 節表格）
    bountyHpMult: 3, bountyAtkMult: 0.7,
    // 死守天南城（config-defense.js 的 defenseRealmAtk、defense.js 的 waveEnemy／simulateWave）：每波妖潮 = 該強度「一般玩家」的鏡像
    //   攻擊 = 一般玩家普攻、氣血 = 攻擊 × defenseHpPerAtk（一般玩家氣血約是普攻的 3.6 倍）× defenseHpScale；
    //   模擬時玩家氣血也 × defenseHpScale：雙方約 20 下分勝負（同舊制），結果不會大起大落
    //   妖潮減傷／閃避改用較平緩的 defenseEnemy（舊制 15→35／8→20，新制 100 波整體強度只差約 2 倍，照舊會蓋過境界差距）
    defenseHpPerAtk: 3.6, defenseHpScale: 5,
    defenseEnemy: { def: [15, 25], eva: [8, 14] },
    //   每波額外成長（2026-09-29，config-defense.js 的 defenseWaveMult）：第 w 波攻擊與氣血 × defenseWaveGrowth^(w−1)（第 100 波約 ×4.4）。
    //   沒有這一項時 100 波只差約 2 倍，煉虛 1 階好裝就能全破；1.015 時全破約需混沌道祖頂配（對照表見 ARCHITECTURE.md 第 49 節）
    defenseWaveGrowth: 1.015,
    // 鎮魔塔 BOSS（zhenmo.js 的 bossStats）：氣血 = 同強度一般玩家每回合輸出（普攻 × 1.3，扣 BOSS 減傷閃避）× bossRounds；攻擊 = 一般玩家氣血（含增益）÷ bossHitsToKill × 樓層 atkMult
    bossRounds: 300, bossHitsToKill: 400, bossMaxRounds: 600,
    // 靈寶閣寶物（numeric.js 的 nv2LingbaoStats／nv2WeaponAtkOf，2026-09-27 使用者要求「增加」）：
    //   屬性點總量（依原本四維比例分配）：圖鑑橙裝一件約 1.5 點，靈寶閣初級 2.5／中級 4／高級 6，神器（獨立神器欄、1 億靈石）10
    //   武器沒有裝備等級，攻擊依兌換階段給固定成長位置：初級 4（≈ Lv.200）、中級 8（≈ Lv.700）、高級 10（= Lv.1000），品質皆橙色
    lingbaoStatBudget: { 1: 2.5, 2: 4, 3: 6, artifact: 10 },
    lingbaoWeaponL: { 1: 4, 2: 8, 3: 10 },
    // 轉世（leveling.js 的 triggerReincarnate，2026-09-27 使用者指定）：保留此世氣血上限的 10%（累加在 reincarnateBonus.nv2Hp，不動舊制的 hp／mp）
    reincarnateHpKeep: 0.1,
    // 符寶（talisman.js 的 talismanFlatOf）：四維符每枚的新制點數（舊制 100／400／1500）。全身橙裝約 30 孔全鑲上品同一種 ≈ +18，與丹藥上限 +20 相當
    talismanFlat: { 1: 0.1, 2: 0.3, 3: 0.6 }
};

// 第六屬性：敏捷（舊制沒有，新制才顯示）
const NV2_STAT_KEYS = ["str", "con", "int", "spr", "agi", "cha"];
const NV2_STAT_LABELS = { str: "力量", con: "體質", int: "悟性", spr: "靈力", agi: "敏捷", cha: "魅力" };

// 新制下裝備四維範本的覆寫：「靈動」改為敏捷型（其餘範本不變；之後 850 種裝備可再逐步指定敏捷範本）
const NV2_TEMPLATE_OVERRIDE = {
    "靈動": { agi: 1.2, spr: 0.8 }
};
