// 數值重做（新制）公式（ARCHITECTURE.md 第 52 節）；參數在 config-numeric.js，開關 NUMERIC_V2
// 只有 NUMERIC_V2 為 true 時才會被呼叫（stats.js／elements.js／combat.js／ui.js／alchemy.js 內以 if (NUMERIC_V2) 分流），舊制完全不受影響。
//
// 設計：屬性由境界、階數決定（起始 5、每階 +1、每大境界 +5），加上丹藥、藏書閣、裝備的少量屬性；
//      攻擊以武器為主（空手只有 力量 × 0.05），所有增益相加後最多 +200%，所以數字全遊戲只到幾十～幾百，不會秒殺。

// 成長曲線位置：境界 + (階 − 1) / 10（凡人 1 階 = 0、混沌道祖 10 階 = 15.9）
function nv2Level(realmIndex, stage) {
    return realmIndex + (stage - 1) / 10;
}
function nv2Growth(L) { return Math.pow(NV2.growth, L); }

// ---- 屬性 ----
// 境界、階數給的基本屬性（六大屬性相同；魅力沿用舊制，不在這裡算）
function nv2BaseStat() {
    return NV2.statStart + NV2.statPerStage * (player.realmIndex * 10 + player.stage - 1) + NV2.statPerRealm * player.realmIndex;
}
// 丹藥（player.pillUsed，最多 200 顆 × 0.1）與藏書閣（player.studyCounts，最多 200 次 × 0.1）
function nv2PillStat(key) {
    const n = Math.min(NV2.pillMax, (player.pillUsed && player.pillUsed[key]) || 0);
    return n * NV2.pillGain;
}
function nv2StudyStat(key) {
    const n = Math.min(NV2.studyMax, (player.studyCounts && player.studyCounts[key]) || 0);
    return n * NV2.studyGain;
}
// 裝備的屬性點：依四維範本（NV2_TEMPLATE_OVERRIDE 可覆寫），每件 = 係數 × 0.5 × 品質倍率 × 強化
function nv2GearStatsOf(eq) {
    const out = {};
    const def = eq && getGearDef(eq);
    if (!def) return eq && eq.lingbaoId ? nv2LingbaoStats(eq) : out;   // 靈寶閣寶物（含神器）另有規則
    const tpl = NV2_TEMPLATE_OVERRIDE[def.template] || GEAR_TEMPLATES[def.template] || GEAR_TEMPLATES["均衡"];
    const m = NV2.gearStatPerPiece * nv2QualityMult(eq.quality) * (1 + (eq.enhance || 0) * NV2.enhancePerLevel)
            * (def.category === 'accessory' ? GEAR_ACCESSORY_BUDGET : 1);
    for (const k in tpl) out[k] = tpl[k] * m;
    return out;
}
function nv2GearStats() {
    const total = { str: 0, con: 0, int: 0, spr: 0, agi: 0, cha: 0 };
    for (const slot in player.equipment) {
        const eq = player.equipment[slot];
        const s = nv2GearStatsOf(eq);
        for (const k in s) total[k] = (total[k] || 0) + s[k];
        // 孔位上的四維符（talisman.js 的 getSocketStats，新制點數見 NV2.talismanFlat）；卡片上由孔位那一行顯示，不併進 nv2GearStatsOf
        const sock = getSocketStats(eq);
        ["str", "con", "int", "spr"].forEach(k => { if (sock[k]) total[k] += sock[k]; });
    }
    return total;
}
// 某屬性的總值（未含百分比加成的四維會再乘裝備詞條的 statPct／xxxPct）
function nv2Stat(key) {
    if (key === 'cha') return (player.stats.cha || 0) + (getEquipBonus().cha || 0);   // 魅力不參與戰鬥，沿用舊制
    const extra = getBonusTotals();
    const pct = (extra[key + "Pct"] || 0) + (extra.statPct || 0);
    const raw = nv2BaseStat() + nv2PillStat(key) + nv2StudyStat(key) + (nv2GearStats()[key] || 0);
    return raw * (1 + pct);
}

// 靈寶閣寶物（沒有圖鑑 def，只有 lingbaoId）：屬性點總量依階段（神器另計），按原本四維的比例分配，× 強化
function nv2LingbaoItem(eq) {
    return eq && eq.lingbaoId ? lingbaoShopItems.find(i => i.id === eq.lingbaoId) || null : null;
}
function nv2LingbaoStats(eq) {
    const out = {};
    const item = nv2LingbaoItem(eq);
    if (!item) return out;
    const src = item.itemData.stats, keys = ["str", "con", "int", "spr"];
    const sum = keys.reduce((a, k) => a + (src[k] || 0), 0);
    if (!sum) return out;
    const budget = (item.itemData.category === 'artifact' ? NV2.lingbaoStatBudget.artifact : NV2.lingbaoStatBudget[item.tier] || 0)
                 * (1 + (eq.enhance || 0) * NV2.enhancePerLevel);
    keys.forEach(k => { if (src[k]) out[k] = budget * src[k] / sum; });
    return out;
}

// ---- 武器攻擊 ----
function nv2QualityMult(q) { return NV2.quality[q] || 1; }
// 單把武器的攻擊：武器基數 × 成長(裝備等級對應的位置) × 品質 × 強化 × 主修職業加成
function nv2WeaponAtkOf(eq, slot) {
    if (!eq) return 0;
    const idx = Math.max(0, EQUIP_LEVELS.indexOf(eq.level || EQUIP_LEVELS[0]));
    let L = idx / Math.max(1, EQUIP_LEVELS.length - 1) * NV2.weaponLevelSpan;
    if (NV2.blueprintWeaponL[eq.level]) L = NV2.blueprintWeaponL[eq.level];   // 圖紙裝備（Lv.1500 以上）
    const lb = !eq.level && nv2LingbaoItem(eq);   // 靈寶閣武器沒有裝備等級：依兌換階段給固定成長位置
    if (lb) L = NV2.lingbaoWeaponL[lb.tier] || 0;
    return NV2.weaponBase * nv2Growth(L) * nv2QualityMult(eq.quality) * (1 + (eq.enhance || 0) * NV2.enhancePerLevel)
         * (slot ? getProfWeaponMult(slot) : 1);
}
// 主武器 = 身上攻擊最高的一把（6 種武器部位不疊加，其他武器只提供屬性）
function nv2WeaponAtk() {
    let best = 0;
    for (const slot in player.equipment) {
        if (equipTypes[slot] !== 'weapon') continue;
        best = Math.max(best, nv2WeaponAtkOf(player.equipment[slot], slot));
    }
    return best;
}

// ---- 增益：全部相加，最多 +200% ----
// kind：'phys'／'mag'／'hp'；回傳比例（0.5 = +50%）
function nv2BuffPct(kind) {
    let p = getGearPctBonus(kind);                                   // 裝備詞條、套裝、稱號、職業、異火、夥伴
    const aura = getSpellAuraBonus();                                // 仙法光環
    p += kind === 'hp' ? aura.hpPct : kind === 'mag' ? aura.magPct : aura.physPct;
    const root = getRootBonus();                                     // 靈根（倍率換成 %）
    p += kind === 'hp' ? (root.hpMult - 1) + (root.conMult - 1) : (root.atkMult - 1);
    if (player.sect) p += (player.sect.powerMult - 1) * NV2.sectBuffPerMult / 100;   // 宗門
    if (hasLiveBeast('wolf')) p += 0.15;                             // 靈寵被動
    if (hasLiveBeast('dragon')) p += 0.3;
    if (kind !== 'hp') {                                             // 暫時增益（禁術、靈寵增益）也算在同一個池子
        if (player.buffTimer > 0 && player.buffMult) p += player.buffMult - 1;
        if (petBuffTimer > 0 && petBuffMult) p += petBuffMult - 1;
    }
    return Math.max(-0.9, Math.min(NV2.buffCap / 100, p));
}

// ---- 攻擊、氣血、靈力 ----
function nv2Attack(statKey, kind) {
    const st = nv2Stat(statKey);
    const base = (nv2WeaponAtk() + st * NV2.fistCoef) * (1 + st * NV2.atkPctPerPoint / 100);
    const v = base * (1 + nv2BuffPct(kind)) * getDuelWeakenMult() * getWeaknessMult();
    return Math.max(1, Math.round(v));
}
function nv2PhysAttack() { return nv2Attack('str', 'phys'); }
function nv2MagAttack() { return nv2Attack('int', 'mag'); }
function nv2MaxHp() {
    const L = nv2Level(player.realmIndex, player.stage);
    const reinc = (player.reincarnateBonus && player.reincarnateBonus.nv2Hp) || 0;   // 轉世保留的氣血上限（leveling.js）
    const v = (NV2.weaponBase * NV2.hpBaseMult * nv2Growth(L) * (1 + nv2Stat('con') * NV2.conPct / 100)
            * (1 + nv2BuffPct('hp')) * (1 + player.level * NV2.levelHpPct / 100) + reinc) * getWeaknessMult();
    return Math.max(1, Math.round(v));
}
function nv2MaxMp() {
    const v = (NV2.mpBase + nv2Stat('spr') * NV2.mpPerSpr) * Math.max(0.1, 1 + getSpellAuraBonus().mpPct) * (1 + (getBonusTotals().mpPct || 0)) + player.level * NV2.levelMp;   // mpPct：金丹品級
    return Math.max(1, Math.round(v * getWeaknessMult()));
}

// ---- 敏捷 ----
function nv2Crit() { return Math.min(NV2.critCap, nv2Stat('agi') * NV2.critPer) / 100; }
function nv2Combo() { return Math.min(NV2.comboCap, nv2Stat('agi') * NV2.comboPer) / 100; }
function nv2Hit() { return nv2Stat('agi') * NV2.hitPer; }        // 百分點，抵銷對方閃避
function nv2AgiEva() { return nv2Stat('agi') * NV2.evaPer; }     // 百分點，加進閃避（仍受上限）

// ---- 戰力（畫面、戰力榜）：每回合期望輸出 ----
function nv2CombatPower() {
    const atk = Math.max(nv2PhysAttack(), nv2MagAttack());
    const v = atk * (1 + nv2Crit() * (NV2.critDmg - 1)) * (1 + nv2Combo()) * (1 + NV2.powerSkillRate * (NV2.powerSkillMult - 1));
    return Math.round(v);
}

// ================= 第 2 階段：怪物與內容 =================
// 「一般玩家」參考值：成長位置 L（可為小數）時，同境界一般玩家的屬性、普攻、氣血（設計器的「一般」欄）。
// 怪物、懸賞、心魔、BOSS 都以此為基準，不看玩家本身的數值，所以玩家變強就會打得比較快。
function nv2TypStat(L) {
    const r = Math.floor(L + 1e-9), s = Math.round((L - r) * 10) + 1;
    return (NV2.statStart + NV2.statPerStage * (r * 10 + s - 1) + NV2.statPerRealm * r) * (1 + NV2.typStatExtra);
}
function nv2TypNormal(L) {
    const st = nv2TypStat(L);
    const weapon = NV2.weaponBase * nv2Growth(Math.min(L, NV2.weaponLevelSpan)) * NV2.typQuality;   // 武器等級上限 Lv.1000 ≈ L 10
    return (weapon + st * NV2.fistCoef) * (1 + st * NV2.atkPctPerPoint / 100) * (1 + nv2TypBuff(L) / 100);
}
// 一般玩家的增益 %（凡人 +10%，每境界 +10%，最多 +50%）；宗門等增益同時加攻擊與氣血
function nv2TypBuff(L) {
    return Math.min(NV2.typBuff, NV2.typBuffStart + L * NV2.typBuffPerL);
}
function nv2TypHp(L) {
    return NV2.weaponBase * NV2.hpBaseMult * nv2Growth(L) * (1 + nv2TypStat(L) * NV2.conPct / 100);
}
// 一般玩家每回合的期望倍率（暴擊、連擊、技能）
function nv2TypRoundMult(L) {
    const st = nv2TypStat(L);
    const crit = Math.min(NV2.critCap, st * NV2.critPer) / 100, combo = Math.min(NV2.comboCap, st * NV2.comboPer) / 100;
    return (1 + crit * (NV2.critDmg - 1)) * (1 + combo) * NV2.typSkillAvg;
}

// 野外妖獸：氣血 = 一般玩家普攻 × 25 下；攻擊 = 一般玩家氣血 × 1.5%
function nv2MonsterStats(map) {
    const L = typeof map.nv2L === 'number' ? map.nv2L : 0;
    return {
        hp: Math.max(1, Math.round(nv2TypNormal(L) * NV2.hitsSame)),
        atk: Math.max(0.1, Math.round(nv2TypHp(L) * NV2.monAtkPct * (map.nv2AtkMult || 1) / 10) / 10)   // 保留 1 位小數（elements.js 的 roundDmg）；nv2AtkMult 選填（新手圖 0.7）
    };
}
// 一般玩家殺一隻要幾回合（含妖獸減傷、閃避）
function nv2TypRoundsPerKill(map) {
    const L = typeof map.nv2L === 'number' ? map.nv2L : 0;
    const a = monsterAttrsByMapCategory[getMapCategoryIndex(map.name)] || monsterAttrsByMapCategory[1];
    const eva = Math.max(0, a.eva - nv2TypStat(L) * NV2.hitPer);
    return NV2.hitsSame / nv2TypRoundMult(L) / (1 - a.def / 100) / (1 - eva / 100);
}
// 擊殺收益補償：舊制設計是「一波 3 隻、一擊一隻、每波 6 秒」＝每秒 1/3 隻；
// 新制一般玩家每秒擊殺 = 每波隻數 ÷ (刷新間隔 + 每波隻數 × 每隻回合數)，每隻收益乘上兩者比例，讓每小時經驗／靈石／聲望維持 realmPacing 的節奏
function nv2KillRewardMult(map) {
    const n = NV2.waveAvg;
    return (IDLE_WAVE_GAP_TICKS + n * nv2TypRoundsPerKill(map)) / n / 3;
}
// 離線／背景的野外估算（取代 save.js 的舊制 estimateIdleCombat，回傳欄位相同）：
//   hits     = 玩家殺一隻平均要幾回合（每回合期望輸出含暴擊、連擊、技能，扣妖獸減傷與未被閃避率）
//   rateMult = 相對「同境界一般玩家」的效率，最多 100%（離線每秒戰鬥次數 OFFLINE_COMBAT_RATE 本來就是一般水準的收益）
//   waveDamage = 一波（平均隻數，依序擊殺）期間妖獸造成的總傷害；survivable = 小於氣血上限
function nv2EstimateIdleCombat() {
    const map = player.currentMap;
    const a = monsterAttrsByMapCategory[getMapCategoryIndex(map.name)] || monsterAttrsByMapCategory[1];
    const ms = nv2MonsterStats(map);
    const round = Math.max(nv2PhysAttack(), nv2MagAttack()) * (1 + nv2Crit() * (NV2.critDmg - 1)) * (1 + nv2Combo()) * NV2.typSkillAvg;
    const eva = Math.max(0, a.eva - nv2Hit());
    const hits = Math.max(1, ms.hp / Math.max(0.01, round * (1 - a.def / 100)) / (1 - eva / 100));
    const n = NV2.waveAvg, gap = IDLE_WAVE_GAP_TICKS;
    const rateMult = Math.min(1, (gap + n * nv2TypRoundsPerKill(map)) / (gap + n * hits));
    const pAttrs = getPlayerCombatAttrs();
    const hitTaken = ms.atk * (1 - pAttrs.eva / 100) * (1 - pAttrs.def / 100);
    let monsterTurns = 0;
    for (let k = 1; k <= n; k++) monsterTurns += Math.max(0, k * hits - 1);
    const waveDamage = hitTaken * monsterTurns;
    const maxHp = getMaxHp();
    return { hits, rateMult, waveDamage, maxHp, survivable: waveDamage < maxHp };
}
// 收益速度上限（2026-09-28 修正「經驗過高」：強力配置每小時經驗曾達設計的 3.9 倍，線上有人很快衝到 Lv.1000 以上）：
//   每小時收益 ∝ (刷新間隔 + 隻數 × 一般玩家每隻回合) ÷ (刷新間隔 + 隻數 × 自己每隻回合)，殺得越快越高、沒有上限（舊制最多一擊一隻，天生有上限）。
//   每波開打時算一次自己的每隻回合數（nv2EstimateIdleCombat 的 hits），超過 NV2.rewardSpeedCap 倍的部分，每隻收益按比例打折
function nv2RewardSpeedAdj(map) {
    const n = NV2.waveAvg, gap = IDLE_WAVE_GAP_TICKS;
    const mine = nv2EstimateIdleCombat().hits, typ = nv2TypRoundsPerKill(map);
    const speed = (gap + n * typ) / (gap + n * mine);   // 相對一般玩家的每小時收益倍數
    return Math.min(1, NV2.rewardSpeedCap / speed);
}
// 「每波」遭遇機率的補償：舊制設計每波 6＋3 秒，新制一般玩家每波 = 刷新間隔 + 每波隻數 × 每隻回合數
function nv2WaveChanceMult(map) {
    return (IDLE_WAVE_GAP_TICKS + NV2.waveAvg * nv2TypRoundsPerKill(map)) / (6 + IDLE_WAVE_AVG_MONSTERS);
}

// ---- 裝備卡片（gear.js 的 formatEquipDetails）：新制顯示武器攻擊與新制屬性點，魅力與減傷／閃避／屬性傷害沿用裝備本身的數值 ----
function nv2FormatEquipStats(eq) {
    const parts = [];
    const isWeapon = eq.category === 'weapon' || equipTypes[eq.name] === 'weapon';
    if (isWeapon) parts.push(`⚔️武器攻擊 ${nv2WeaponAtkOf(eq, equipTypes[eq.name] === 'weapon' ? eq.name : null).toFixed(1)}`);
    const s = nv2GearStatsOf(eq);
    NV2_STAT_KEYS.forEach(k => { if (k !== 'cha' && s[k] > 0) parts.push(`${NV2_STAT_LABELS[k]}+${s[k].toFixed(1)}`); });
    const old = getEquipEffectiveStats(eq), rest = { cha: old.cha };
    ["def", "eva"].concat(AFFIX_TYPES).forEach(k => { rest[k] = old[k]; });
    const restText = formatEquipStats(rest);
    if (restText !== '無') parts.push(restText);
    return parts.join('、') || '無';
}