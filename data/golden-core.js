// 丹田、金丹、元嬰（ARCHITECTURE.md 第 54 節；設定在 config-golden-core.js）
// 累積：leveling.js 的 gainExp 呼叫 gainCoreProgress（含待渡劫時溢出的修為）；凝元丹 craftCorePill（煉丹房）
// 凝結：leveling.js 的 advanceRealm 呼叫 onRealmAdvancedCore（進金丹凝金丹、進元嬰成元嬰）
// 加成：getGoldenCoreBonusTotals 併入 gear.js 的 getBonusTotals（hpPct／mpPct／magPct）；化神勝算由 tribulation.js 讀 getCoreTribBonus

function getGoldenCore() {
    if (!player.goldenCore || typeof player.goldenCore !== 'object') player.goldenCore = { dantian: 0, core: null, nurture: 0, infant: null };
    return player.goldenCore;
}
// 讀檔時呼叫（save.js 的 migrateProgressionFields）：存檔裡沒有 goldenCore 的老玩家補發（使用者選「補發中等」）
//   金丹期以上 → 中品金丹；元嬰期以上 → 地元嬰・中。只在讀檔時做，遊戲中晉升不會被誤判成老玩家
function migrateGoldenCore(savedData) {
    if (savedData && savedData.goldenCore) return;
    const g = getGoldenCore();
    if (player.realmIndex > CORE_FILL_REALM && g.core === null) g.core = LEGACY_CORE_GRADE;
    if (player.realmIndex > NURTURE_FILL_REALM && g.infant === null) g.infant = LEGACY_INFANT_GRADE;
}

// 目前正在累積哪一條：'dantian'（築基期）／'nurture'（金丹期）／null
function getCoreFillKind() {
    if (player.realmIndex === CORE_FILL_REALM) return 'dantian';
    if (player.realmIndex === NURTURE_FILL_REALM) return 'nurture';
    return null;
}

// 修為灌入丹田／溫養：amount 為這次獲得的修為（待渡劫時也算）
function gainCoreProgress(amount) {
    const kind = getCoreFillKind();
    if (!kind || !(amount > 0)) return;
    const g = getGoldenCore();
    const before = g[kind];
    if (before >= 1) return;
    const realmTotal = getRealmStageExp(player.realmIndex) * 55;   // 修完整個境界所需的修為（stats.js，10 階合計 55 倍基數）
    g[kind] = Math.min(1, before + amount / realmTotal * CORE_FILL_PER_REALM);
    // 跨過品級門檻時提示
    const label = kind === 'dantian' ? '丹田' : '金丹溫養';
    [0.5, 0.75, 1].forEach(t => {
        if (before < t && g[kind] >= t) addLog(`🔥 ${label}充盈至 ${Math.round(t * 100)}%！${kind === 'dantian' ? `此時結丹可成【${CORE_GRADES[coreGradeByFill(t, true)].name}】` : ''}`, "level-up");
    });
}

// 依丹田決定金丹品級；preview = 只看門檻、不擲超品
function coreGradeByFill(fill, preview) {
    let grade = 0;
    CORE_GRADES.forEach((c, i) => { if (i < 4 && fill >= c.minFill) grade = i; });
    if (grade === 3 && !preview && Math.random() < getSuperCoreChance()) grade = 4;
    return grade;
}
function getSuperCoreChance() {
    const c = SUPER_CORE_CHANCE;
    let chance = c.base;
    const a = player.aptitude;
    if (a) {
        chance += c.root[a.root && a.root.group] || 0;
        const p = describePhysique(a.physique);
        if (p) chance += c.physique[p.grade] || 0;
    }
    return Math.min(1, chance);
}
function infantGradeOf(core, nurture) {
    let steps = NURTURE_STEPS.filter(t => nurture >= t).length;
    return Math.min(INFANT_GRADES.length - 1, INFANT_BASE_BY_CORE[core] + steps);
}

// 渡劫晉升後呼叫（leveling.js 的 advanceRealm）：進金丹凝金丹、進元嬰成元嬰
function onRealmAdvancedCore() {
    const g = getGoldenCore();

    if (player.realmIndex === CORE_FILL_REALM + 1 && g.core === null) {
        g.core = coreGradeByFill(g.dantian, false);
        const c = CORE_GRADES[g.core];
        addLog(`🟡 丹田靈氣凝聚成丹（丹田 ${Math.round(g.dantian * 100)}%），結成【${c.name}】！氣血與靈力上限 +${Math.round(c.hpMpPct * 100)}%。`, "reincarnate");
    }
    if (player.realmIndex === NURTURE_FILL_REALM + 1 && g.infant === null) {
        if (g.core === null) g.core = LEGACY_CORE_GRADE;
        g.infant = infantGradeOf(g.core, g.nurture);
        const inf = INFANT_GRADES[g.infant];
        addLog(`👶 【${CORE_GRADES[g.core].name}】破丹成嬰（溫養 ${Math.round(g.nurture * 100)}%），修成【${inf.name}】！術法傷害 +${Math.round(inf.magPct * 100)}%。`, "reincarnate");
        if (inf.tier === "天元嬰") addLog(`🌈 天地異象：${INFANT_OMENS[Math.floor(Math.random() * INFANT_OMENS.length)]}！天元嬰出世！`, "reincarnate");
    }
}


// ---- 加成 ----
// 凝聚元神後金丹與元嬰化入元神（2026-10-02 使用者指定「合成元神後原有的金丹跟元嬰都會消失」，yuanshen.js）：加成與化神勝算都不再計算
function getGoldenCoreBonusTotals() {
    if (typeof hasYuanshen === 'function' && hasYuanshen()) return {};
    const g = getGoldenCore(), t = {};
    if (g.core !== null && CORE_GRADES[g.core]) { const c = CORE_GRADES[g.core]; if (c.hpMpPct) { t.hpPct = c.hpMpPct; t.mpPct = c.hpMpPct; } }
    if (g.infant !== null && INFANT_GRADES[g.infant] && INFANT_GRADES[g.infant].magPct) t.magPct = INFANT_GRADES[g.infant].magPct;
    return t;
}
// 化神渡劫（元嬰 → 化神）時元嬰品級的勝算加減
function getCoreTribBonus() {
    if (player.realmIndex !== SPIRIT_FRUIT.realmIndex) return 0;
    if (typeof hasYuanshen === 'function' && hasYuanshen()) return 0;   // 元嬰已化入元神
    const g = getGoldenCore();
    return g.infant !== null && INFANT_GRADES[g.infant] ? INFANT_GRADES[g.infant].trib : 0;
}

// ---- 顯示 ----
function formatCoreName(item) {
    return `<span class="${item.rainbow ? 'rainbow-text' : ''}" style="${item.rainbow ? '' : `color:${item.color};`} font-weight:bold;">${item.name}</span>`;
}
// 人物面板「金丹」一行
function formatCoreShort() {
    if (typeof hasYuanshen === 'function' && hasYuanshen()) return '<span style="color:#9ca3af;">已化入元神（金丹、元嬰加成消失）</span>';
    const g = getGoldenCore(), kind = getCoreFillKind();
    const parts = [];
    if (kind === 'dantian') parts.push(`丹田 ${Math.floor(g.dantian * 100)}%（結丹可成${CORE_GRADES[coreGradeByFill(g.dantian, true)].name}）`);
    if (g.core !== null) parts.push(`${formatCoreName(CORE_GRADES[g.core])}（氣血靈力 +${Math.round(CORE_GRADES[g.core].hpMpPct * 100)}%）`);
    if (kind === 'nurture') parts.push(`溫養 ${Math.floor(g.nurture * 100)}%（成嬰可達${INFANT_GRADES[infantGradeOf(g.core, g.nurture)].name}）`);
    if (g.infant !== null) parts.push(`${formatCoreName(INFANT_GRADES[g.infant])}（術法 +${Math.round(INFANT_GRADES[g.infant].magPct * 100)}%）`);
    return parts.join('・') || '築基期開啟丹田';
}

// ---- 凝元丹（煉丹房）----
function craftCorePill(qty = 1) {
    const kind = getCoreFillKind(), p = CORE_PILL;
    if (!kind) { alert(`${p.name}只在築基期（充盈丹田）與金丹期（溫養金丹）有效。`); return; }
    const g = getGoldenCore();
    const need = Math.ceil((1 - g[kind]) / p.gain - 1e-9);
    if (need <= 0) { alert(`${kind === 'dantian' ? '丹田' : '溫養'}已滿，不需要再服用。`); return; }
    const herbs = (player.herbs && player.herbs[p.herb]) || 0;
    const affordable = Math.min(need, Math.floor(herbs / p.herbCost), Math.floor(player.coins / p.coins));
    if (affordable <= 0) { alert(`材料不足！煉製 1 顆${p.name}需要 ${p.herbCost} 株${p.herbName}＋${p.coins.toWan()} 靈石。`); return; }
    const n = resolveBatchCount(qty, affordable, "煉製");
    if (!n) return;
    player.herbs[p.herb] -= p.herbCost * n;
    player.coins -= p.coins * n;
    gainCoreProgress(getRealmStageExp(player.realmIndex) * 55 / CORE_FILL_PER_REALM * p.gain * n);   // 換算成等量修為，沿用門檻提示
    addLog(`🧪 煉製並服用 ${n} 顆【${p.name}】，${kind === 'dantian' ? '丹田' : '金丹溫養'}提升至 ${Math.floor(g[kind] * 100)}%！`, "heal");
    renderCorePillCard();
    updateUI();
}
function renderCorePillCard() {
    const card = document.getElementById('pill-card-core');
    if (!card) return;
    const kind = getCoreFillKind();
    card.hidden = !kind;
    if (!kind) return;
    const g = getGoldenCore();
    document.getElementById('pill-core-status').innerText = `${kind === 'dantian' ? '丹田' : '金丹溫養'}：${Math.floor(g[kind] * 100)}%`;
}

// ---- 化神靈果（千寶閣珍貴物資）----
function buySpiritFruit(qty = 1) {
    const f = SPIRIT_FRUIT;
    const affordable = Math.floor((player.butianStones || 0) / f.stoneCost);
    if (affordable <= 0) { alert(`七彩補天石不足！購買 1 顆${f.name}需要 ${f.stoneCost} 顆（目前 ${player.butianStones || 0}）。`); return; }
    const n = resolveBatchCount(qty, affordable, "購買");
    if (!n) return;
    player.butianStones -= f.stoneCost * n;
    player.spiritFruits = (player.spiritFruits || 0) + n;
    addLog(`${f.icon} 於千寶閣以 ${f.stoneCost * n} 顆七彩補天石購得 ${n} 顆【${f.name}】！元嬰期渡劫化神時自動服用。`, "level-up", false, "item");
    toastBought(`${f.name} ×${n}`);
    renderAuction();
    updateUI();
}
function renderSpiritFruitCard() {
    const f = SPIRIT_FRUIT, can = Math.floor((player.butianStones || 0) / f.stoneCost);
    return `<div class="card rainbow-glow">
        <h3 class="rainbow-text">${f.icon} ${f.name}</h3>
        <p style="font-size: 0.8em; color: #9ca3af;">${f.desc}</p>
        <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${f.stoneCost} 顆七彩補天石｜持有 ${(player.spiritFruits || 0).toWan()}</p>
        <div class="batch-btns">
            <button class="sys-btn" ${can < 1 ? 'disabled' : ''} onclick="buySpiritFruit(1)">×1</button>
            <button class="sys-btn" ${can < 10 ? 'disabled' : ''} onclick="buySpiritFruit(10)">×10</button>
        </div></div>`;
}
// 化神渡劫是否會服用靈果（tribulation.js）
function willUseSpiritFruit() {
    return player.realmIndex === SPIRIT_FRUIT.realmIndex && (player.spiritFruits || 0) > 0;
}
