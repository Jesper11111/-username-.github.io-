// 角色裝備視窗改版（第 60 節，2026-09-28 玩家提供暗黑破壞神式裝備欄參考圖）：
//   ① 人形裝備欄：左 6 武器、右 6 防具、下排 5 飾品＋神器，中間人物立繪；背包有更好的同部位裝備時格子亮綠色 ▲
//   ② 點格子 → 下方顯示「使用中」卡片（強化／鎖定／卸下）＋背包同部位候選，每件標「穿上後戰力 ±」並由好到差排序
//   ③ 點候選（或背包卡片的「🔍 對比」）→ #equip-compare-modal：左「使用中」右「選擇」逐項比較，
//      下方「穿上後變化」＝暫時換上後用遊戲公式實算整個角色（戰力、氣血、攻擊、減傷、閃避…），並提醒套裝、五行共鳴、本命五行、等級
// 試算只暫時改 player.equipment[slot]，算完立刻還原（try/finally），不存檔、不重繪。

const EQ_DOLL_LAYOUT = {
    left:   ["劍", "刀", "扇", "弓", "笛", "筆"],
    right:  ["頭", "披風", "盔甲", "內衣", "手套", "長靴"],
    bottom: ["項鍊", "耳環", "戒指", "腰帶", "腰牌", "神器"]
};
const EQ_SLOT_ICONS = {
    "劍": "🗡️", "刀": "🔪", "扇": "🎐", "弓": "🏹", "笛": "🎋", "筆": "🖌️",
    "頭": "⛑️", "披風": "🧣", "盔甲": "🛡️", "內衣": "👘", "手套": "🧤", "長靴": "👢",
    "項鍊": "📿", "耳環": "💠", "戒指": "💍", "腰帶": "🎗️", "腰牌": "🏷️", "神器": "🔱"
};
// 裝備欄中間的人物正面圖（2026-09-28 玩家提供，縮成 520 寬；與戰鬥畫面的背影立繪不同）；pos＝在窄長格子裡對準臉部
const EQUIP_HERO_IMG = {
    male:   { src: "images/equip/hero-male.jpg",   pos: "44% 20%" },
    female: { src: "images/equip/hero-female.jpg", pos: "56% 22%" }
};
let eqDollSlot = "劍";       // 裝備欄目前選的部位
let eqCompareId = null;       // 對比視窗裡「選擇」那件的 id

// ---- 試算 ----
// 角色目前的整體數值（對比「穿上後變化」用）
function eqSnapshot() {
    const a = getPlayerCombatAttrs();
    const roots = getSpiritRoots();
    return {
        power: NUMERIC_V2 ? nv2CombatPower() : getPhysAttack(),
        hp: getMaxHp(), mp: getMaxMp(),
        phys: getPhysAttack(), mag: getMagAttack(),
        def: a.def, eva: a.eva,
        crit: NUMERIC_V2 ? nv2Crit() * 100 : 0, combo: NUMERIC_V2 ? nv2Combo() * 100 : 0,
        affix: Object.fromEntries(AFFIX_TYPES.map(k => [k, a[k] || 0])),
        element: getPlayerElement(),
        sets: getEquippedSetCounts(),
        resonance: roots.singles.map(e => wuxingArrayEffects[e].title).concat(roots.special ? [roots.special.name] : [])
    };
}
// 暫時把 slot 換成 eq（null＝空著）算一次，算完還原
function eqSimulate(slot, eq) {
    const prev = player.equipment[slot];
    player.equipment[slot] = eq;
    try { return eqSnapshot(); } finally { player.equipment[slot] = prev; }
}
function eqCanWear(eq) {
    if (!eq) return { ok: false, why: '' };
    if (!(eq.name in equipTypes)) return { ok: false, why: '部位已停用，無法穿戴' };
    if (eq.level && player.level < eq.level) return { ok: false, why: `需要人物等級 Lv.${eq.level}（目前 Lv.${player.level}）` };
    return { ok: true, why: '' };
}
// 背包裡某部位的候選，附「穿上後戰力差」，由好到差
function eqCandidates(slot) {
    const base = eqSnapshot().power;
    return player.equipInventory.filter(e => e.name === slot)
        .map(e => ({ eq: e, d: eqSimulate(slot, e).power - base, can: eqCanWear(e) }))
        .sort((x, y) => (y.can.ok - x.can.ok) || (y.d - x.d));
}
// 單件裝備的數值表（對比卡片逐項比較用）：{ key: [標籤, 數值, 單位] }
function eqStatMap(eq) {
    const m = {};
    if (!eq) return m;
    if (NUMERIC_V2) {
        if (equipTypes[eq.name] === 'weapon' || eq.category === 'weapon')
            m.watk = ['武器攻擊', nv2WeaponAtkOf(eq, equipTypes[eq.name] === 'weapon' ? eq.name : null), '', true];   // 第 4 欄 true＝戰鬥數字（畫面 ×100）
        const s = nv2GearStatsOf(eq);
        NV2_STAT_KEYS.forEach(k => { if (k !== 'cha' && s[k] > 0) m[k] = [NV2_STAT_LABELS[k], s[k], ''] ; });
    }
    const old = getEquipEffectiveStats(eq);
    if (!NUMERIC_V2) [["str", "力量"], ["con", "體質"], ["int", "悟性"], ["spr", "靈力"]].forEach(([k, l]) => { if (old[k]) m[k] = [l, old[k], '']; });
    ["def", "eva"].concat(AFFIX_TYPES).forEach(k => { if (old[k]) m[k] = [combatAttrInfo[k].label, old[k], k === 'def' ? '' : '%']; });   // 防禦是點數（第 66 節）
    return m;
}

// ---- ① ② 裝備欄（equipment.js 的 renderLingbaoUI 呼叫）----
// combat＝攻擊、氣血、靈力、戰力這類戰鬥數字：畫面 ×100 取整（format.js 的 fmtCombat）；其餘（屬性點、%）照原本 1 位小數
function eqFmt(v, combat) { if (combat) return fmtCombat(v); return Math.abs(v) >= 10000 ? Math.round(v).toWan() : (Math.round(v * 10) / 10).toString(); }
function eqSign(v, combat) { return (v > 0 ? '+' : v < 0 ? '−' : '') + eqFmt(Math.abs(v), combat); }

function renderEquipDoll() {
    const container = document.getElementById('equipped-list-container');
    if (!container) return;
    if (!(eqDollSlot in player.equipment)) eqDollSlot = "劍";
    const base = eqSnapshot();
    const better = slot => player.equipInventory.some(e => e.name === slot && eqCanWear(e).ok && eqSimulate(slot, e).power > base.power);
    const qColor = q => q === PLATINUM_QUALITY.name ? PLATINUM_QUALITY.color : ((equipQualities.find(x => x.name === q) || {}).color || '#f0d588');
    const cell = slot => {
        const eq = player.equipment[slot];
        return `<div class="eqd-slot ${eq ? 'filled' : ''} ${slot === eqDollSlot ? 'sel' : ''}" style="${eq ? `border-color:${qColor(eq.quality)}` : ''}" onclick="selectEquipSlot('${slot}')" title="${slot}">
            ${better(slot) ? '<span class="eqd-up">▲</span>' : ''}
            <span class="eqd-ic">${EQ_SLOT_ICONS[slot] || '▫️'}</span>
            <span class="eqd-lv ${eq ? 'quality-' + eq.quality : ''}">${eq ? (eq.level ? 'Lv.' + eq.level : slot) + (eq.enhance ? ' +' + eq.enhance : '') : slot}</span></div>`;
    };
    const hero = EQUIP_HERO_IMG[player.gender === 'female' ? 'female' : 'male'];
    container.innerHTML = `
        <div class="eqd-doll">
            <div class="eqd-col">${EQ_DOLL_LAYOUT.left.map(cell).join('')}</div>
            <div class="eqd-hero" style="background-image:url(${hero.src}); background-position:${hero.pos}">
                <div class="eqd-sum">${lbEscape(player.name || '')}${base.element ? `【<span class="elem-${base.element}">${base.element}</span>】` : ''}<br>
                    戰力 <b>${eqFmt(base.power, true)}</b>　氣血 ${eqFmt(base.hp, true)}</div>
            </div>
            <div class="eqd-col">${EQ_DOLL_LAYOUT.right.map(cell).join('')}</div>
            <div class="eqd-row">${EQ_DOLL_LAYOUT.bottom.map(cell).join('')}</div>
        </div>
        <div class="eqd-hint">點部位換裝；綠色 <b style="color:#4ade80">▲</b>＝背包裡有穿上後戰力更高的同部位裝備</div>
        <div class="eqd-sheet">${renderEquipSlotSheet(eqDollSlot)}</div>
        <div class="eqd-sheet">${renderRaceTreasurePanel()}</div>`;
}

function selectEquipSlot(slot) { eqDollSlot = slot; renderEquipDoll(); }

function renderEquipSlotSheet(slot) {
    const eq = player.equipment[slot];
    const isArtifact = equipTypes[slot] === 'artifact';
    const curCard = eq ? `
        <div class="${getEquipCardClass(eq)} eqd-cur" style="border-color: var(--equip-color);">
            <div class="eqd-tag">🔸 使用中</div>
            <h3 class="quality-${eq.quality}">${formatEquipTitle(eq)}</h3>
            <p style="font-size:0.85em; color:#9ca3af;">${formatGearSubline(eq)} | <span class="quality-${eq.quality}">${formatQualityLabel(eq.quality)}</span> | 屬性：<span class="elem-${eq.element}">${eq.element}</span></p>
            ${formatEquipDetails(eq)}
            ${formatArtifactSkill(eq)}
            ${ENHANCE_CAP[eq.quality] ? `<button class="sys-btn" onclick="openEnhanceModal('${eq.id}')">🔨 強化</button>` : ''}
            ${formatLockButton(eq)}
            <button class="sys-btn" onclick="unequipItem('${slot}')">卸下裝備</button>
        </div>`
        : `<div class="card" style="color:#6b7280; background: rgba(10,14,22,0.3);"><h3 style="${isArtifact ? 'color: var(--accent);' : ''}">${isArtifact ? '✨ ' : ''}${slot}</h3>
            <p style="font-size:0.85em;">${isArtifact ? '(未裝備・可於靈寶閣高級宗門兌換)' : '(未裝備)'}</p></div>`;
    const list = eqCandidates(slot);
    const rows = list.length ? list.map(({ eq: c, d, can }) => `
        <div class="eqd-cand" onclick="openEquipCompare('${c.id}')">
            <div class="eqd-nm"><span class="quality-${c.quality}">${formatEquipTitle(c)}</span>
                <small>${formatQualityLabel(c.quality)}・<span class="elem-${c.element}">${c.element}</span>${can.ok ? '' : '・🔒 ' + can.why}</small></div>
            <span class="eqd-chip ${d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'eq'}">戰力 ${d > 0.05 ? '▲' : d < -0.05 ? '▼' : ''}${eqSign(d, true)}</span>
        </div>`).join('')
        : `<div class="eqd-hint">背包裡沒有「${slot}」部位的裝備。</div>`;
    return `<div class="eqd-sheet-head">更換【${slot}】<span>背包 ${list.length} 件</span></div>${curCard}
        <div class="eqd-list">${rows}</div>`;
}

// ---- ③ 對比視窗 ----
function openEquipCompare(equipId) {
    const pick = player.equipInventory.find(e => e.id === equipId);
    if (!pick) return;
    eqCompareId = equipId;
    const slot = pick.name, cur = player.equipment[slot] || null;
    const before = eqSnapshot(), after = eqSimulate(slot, pick);
    const can = eqCanWear(pick);

    // 逐項比較：兩件的數值表取聯集，較好標綠、較差標紅
    const ma = eqStatMap(cur), mb = eqStatMap(pick);
    const keys = Object.keys(Object.assign({}, ma, mb));
    const cls = (x, y) => x > y ? 'better' : x < y ? 'worse' : '';
    const rowsA = keys.map(k => { const a = ma[k] ? ma[k][1] : 0, b = mb[k] ? mb[k][1] : 0, lab = (ma[k] || mb[k]);
        return `<div class="eqc-kv"><span>${lab[0]}</span><span class="${a ? cls(a, b) : 'none'}">${a ? eqFmt(a, lab[3]) + lab[2] : '—'}</span></div>`; }).join('');
    const rowsB = keys.map(k => { const a = ma[k] ? ma[k][1] : 0, b = mb[k] ? mb[k][1] : 0, lab = (ma[k] || mb[k]);
        return `<div class="eqc-kv"><span>${lab[0]}</span><span class="${b ? cls(b, a) : 'none'}">${b ? eqFmt(b, lab[3]) + lab[2] : '—'}${Math.abs(b - a) > (lab[3] ? 0.005 : 0.05) ? ` <small>(${eqSign(b - a, lab[3])}${lab[2]})</small>` : ''}</span></div>`; }).join('');
    const card = (eq, tag, isPick) => eq ? `
        <div class="eqc-card ${isPick ? 'pick' : ''}"><div class="eqd-tag">${tag}</div>
            <div class="eqc-title quality-${eq.quality}">${formatEquipTitle(eq)}</div>
            <div class="eqd-tag">${formatQualityLabel(eq.quality)}・<span class="elem-${eq.element}">${eq.element}</span></div>
            ${isPick ? rowsB : rowsA}
            <details class="eqc-more"><summary>詞條／特效／孔位</summary>${formatEquipDetails(eq)}${formatArtifactSkill(eq)}</details>
        </div>` : `<div class="eqc-card"><div class="eqd-tag">${tag}</div><div class="eqc-title" style="color:#6b7280;">（空）</div></div>`;

    // 穿上後的整體變化（實算）
    const diffRow = (label, a, b, unit, big, combat) => {   // combat＝戰鬥數字（畫面 ×100）
        const d = b - a;
        if (Math.abs(d) < (combat ? 0.005 : 0.05)) return '';
        return `<div class="eqc-drow ${big ? 'big' : ''}"><span>${label}</span><span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${eqSign(d, combat)}${unit || ''}　<small>${eqFmt(a, combat)}${unit || ''} → ${eqFmt(b, combat)}${unit || ''}</small></span></div>`;
    };
    let delta = diffRow('戰力', before.power, after.power, '', true, true)
        + diffRow('氣血', before.hp, after.hp, '', false, true) + diffRow('法力', before.mp, after.mp, '', false, true)
        + diffRow('物理攻擊', before.phys, after.phys, '', false, true) + diffRow('術法攻擊', before.mag, after.mag, '', false, true)
        + diffRow('防禦', before.def, after.def, '') + diffRow('閃避', before.eva, after.eva, '%')
        + (NUMERIC_V2 ? diffRow('暴擊', before.crit, after.crit, '%') + diffRow('連擊', before.combo, after.combo, '%') : '')
        + AFFIX_TYPES.map(k => diffRow(combatAttrInfo[k].label, before.affix[k], after.affix[k], '%')).join('');
    if (!delta) delta = '<div class="eqc-drow"><span>整體數值沒有變化</span></div>';

    // 提醒：套裝、五行共鳴、本命五行、等級
    const warns = [];
    Object.keys(Object.assign({}, before.sets, after.sets)).forEach(name => {
        const a = before.sets[name] || 0, b = after.sets[name] || 0;
        if (a !== b) warns.push(`${b > a ? '✨' : '⚠️'} 【${name}】套裝 ${a} → ${b} 件`);
    });
    const ra = before.resonance.join('、') || '無', rb = after.resonance.join('、') || '無';
    if (ra !== rb) warns.push(`☯️ 五行共鳴：${ra} → ${rb}`);
    if (before.element !== after.element) warns.push(`☯️ 本命五行：${before.element || '無'} → ${after.element || '無'}（影響五行相剋）`);
    if (!can.ok) warns.push(`🔒 ${can.why}`);

    document.getElementById('equip-compare-body').innerHTML = `
        <div class="eqc-two">${card(cur, '🔸 使用中', false)}${card(pick, '🔹 選擇', true)}</div>
        <div class="eqc-delta"><h4>穿上後變化</h4>${delta}${warns.map(w => `<div class="eqc-warn">${w}</div>`).join('')}</div>
        <div class="eqc-acts">
            <button class="sys-btn" onclick="closeModal('equip-compare-modal')">取消</button>
            <button class="equip-btn" ${can.ok ? '' : 'disabled style="opacity:0.4"'} onclick="wearFromCompare()">穿上</button>
        </div>`;
    document.getElementById('equip-compare-title').innerText = `裝備對比・${slot}`;
    document.getElementById('equip-compare-modal').style.display = 'flex';
}

function wearFromCompare() {
    const pick = player.equipInventory.find(e => e.id === eqCompareId);
    if (!pick) { closeModal('equip-compare-modal'); return; }
    eqDollSlot = pick.name;
    equipItem(pick.id);
    closeModal('equip-compare-modal');
    if (player.equipment[pick.name] === pick) showToast(`✅ 已穿上：${getEquipDisplayName(pick)}`, 'ok');
    refreshEquipViews();
}
