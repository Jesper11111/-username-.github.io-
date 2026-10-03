// 資質測試：先天靈根＋先天體質（ARCHITECTURE.md 第 53 節；設定在 config-aptitude.js）
// 存檔：player.aptitude = { root: { group, id?, elems? }, physique: id, at }（沒有 = 尚未測試）、player.rootPills、player.physiquePills
// 觸發：第一次拜入宗門後（sect.js 的 joinSect）與每次進入遊戲時（main.js 的 initGame）檢查 checkAptitudeTest()
// 加成：getAptitudeBonusTotals() 併入 gear.js 的 getBonusTotals（新舊制都吃）；特殊效果 getAptitudeSpecial() 由各處讀取

// ---- 擲骰 ----
function aptitudeRollGroup(groups) {
    let r = Math.random(), acc = 0;
    for (const g of groups) { acc += g.chance; if (r < acc) return g; }
    return groups[groups.length - 1];
}
function rollAptitudeRoot() {
    const g = aptitudeRollGroup(APTITUDE_ROOT_GROUPS);
    if (g.pick) return { group: g.id, id: g.pick[Math.floor(Math.random() * g.pick.length)].id };
    const elems = wuxingElements.slice().sort(() => Math.random() - 0.5).slice(0, g.elems);
    elems.sort((a, b) => wuxingElements.indexOf(a) - wuxingElements.indexOf(b));
    return { group: g.id, elems };
}
function rollAptitudePhysique() {
    const g = aptitudeRollGroup(APTITUDE_PHYSIQUE_GROUPS);
    return g.pick[Math.floor(Math.random() * g.pick.length)].id;
}

// ---- 查表：回傳 { name, grade, color, rainbow, icon, desc, bonus, special } ----
function describeRoot(root) {
    const g = root && APTITUDE_ROOT_GROUPS.find(x => x.id === root.group);
    if (!g) return null;
    const base = { grade: g.grade, color: g.color, rainbow: !!g.rainbow };
    if (g.pick) {
        const r = g.pick.find(x => x.id === root.id) || g.pick[0];
        return Object.assign(base, { name: r.name, icon: r.icon, desc: r.desc, bonus: Object.assign({}, r.bonus), special: r.special || {} });
    }
    const elems = root.elems || [];
    const bonus = Object.assign({}, g.bonus);
    if (g.affinity) elems.forEach(e => {
        const aff = ROOT_ELEMENT_AFFINITY[e] || {};
        for (const k in aff) bonus[k] = (bonus[k] || 0) + aff[k] * g.affinity;
    });
    const name = g.elems >= 4 ? `${g.name}（${elems.join('')}）` : `${elems.join('')}${g.name}`;
    return Object.assign(base, { name, icon: g.elems === 1 ? '🔷' : g.elems >= 4 ? '🔘' : '🔹', desc: g.desc, bonus, special: g.special || {} });
}
function describePhysique(id) {
    for (const g of APTITUDE_PHYSIQUE_GROUPS) {
        const p = g.pick.find(x => x.id === id);
        if (p) return { name: p.name, grade: g.grade, color: g.color, rainbow: !!g.rainbow, icon: p.icon, desc: p.desc, bonus: Object.assign({}, p.bonus), special: p.special || {} };
    }
    return null;
}

// ---- 加成 ----
function getAptitudeParts() {
    const a = player.aptitude;
    if (!a) return [];
    return [describeRoot(a.root), describePhysique(a.physique)].filter(Boolean);
}
// 併入 getBonusTotals：靈根與體質的 bonus，加上條件式的「武器體質技能傷害」與「本命五行相同時攻擊」
function getAptitudeBonusTotals() {
    const t = {};
    getAptitudeParts().forEach(p => {
        for (const k in p.bonus) t[k] = (t[k] || 0) + p.bonus[k];
        const s = p.special;
        if (s.weapon && s.skillPct && player.equipment && player.equipment[s.weapon]) t["fx:法爆"] = (t["fx:法爆"] || 0) + s.skillPct;
        if (s.elem && s.elemAtk && getPlayerElement() === s.elem) t.atkPct = (t.atkPct || 0) + s.elemAtk;
    });
    return t;
}
// 特殊效果彙總：trib 相加、ambushMult 相乘、poisonImmune 任一為真、weapons { 部位: 加成 }
function getAptitudeSpecial() {
    const out = { trib: 0, ambushMult: 1, poisonImmune: false, weapons: {}, nature: null };
    const natures = new Set();
    getAptitudeParts().forEach(p => {
        const s = p.special;
        if (s.trib) out.trib += s.trib;
        if (s.ambushMult) out.ambushMult *= s.ambushMult;
        if (s.poisonImmune) out.poisonImmune = true;
        if (s.weapon && s.weaponPct) out.weapons[s.weapon] = (out.weapons[s.weapon] || 0) + s.weaponPct;
        if (s.nature) natures.add(s.nature);
    });
    if (natures.size === 1) out.nature = [...natures][0];   // 一光一暗互相抵銷
    return out;
}
// 武器體質：該部位的武器加成（profession.js 的 getProfWeaponMult 使用）
function getAptitudeWeaponPct(slot) {
    return getAptitudeSpecial().weapons[slot] || 0;
}

// 加成說明文字（例：「修為 +50%、火傷 +15%」）
const APTITUDE_BONUS_LABELS = {
    "fx:悟道": ["修為速度", "pct"], atkPct: ["攻擊", "pct"], physPct: ["物理攻擊", "pct"], magPct: ["術法攻擊", "pct"], hpPct: ["氣血上限", "pct"],
    statPct: ["全屬性", "pct"], strPct: ["力量", "pct"], conPct: ["體質", "pct"], intPct: ["悟性", "pct"], sprPct: ["靈力", "pct"], agiPct: ["敏捷", "pct"],
    def: ["防禦", "num"], eva: ["閃避", "pt"], ice: ["冰傷", "pt"], fire: ["火傷", "pt"], poison: ["毒傷", "pt"], metal: ["金傷", "pt"], thunder: ["雷傷", "pt"],
    "fx:回春": ["每回合回血", "pct"], "fx:法爆": ["技能傷害", "pct"], "fx:吸血": ["吸血", "pct"], "fx:破甲": ["無視減傷", "pt"], "fx:洞察": ["無視閃避", "pt"],
    "fx:定神": ["抗凍結", "pct"], "fx:丹心": ["丹藥效果", "pct"], "fx:剋敵": ["剋制傷害", "pct"], "fx:噬魂": ["擊殺回血", "pct"],
    wind: ["風擊", "pt"], light: ["聖光", "pt"], dark: ["暗蝕", "pt"]
};
function formatAptitudeEffects(d) {
    const parts = [];
    for (const k in d.bonus) {
        const [label, fmt] = APTITUDE_BONUS_LABELS[k] || [k, "pt"];
        const v = d.bonus[k];
        parts.push(`${label} ${v > 0 ? '+' : ''}${fmt === 'pct' ? +(v * 100).toFixed(1) + '%' : +v.toFixed(1) + (fmt === 'num' ? '' : '%')}`);
    }
    const s = d.special;
    if (s.weapon) parts.push(`裝備${s.weapon}時：${s.weapon}的${NUMERIC_V2 ? '武器攻擊' : '四維'} +${Math.round(s.weaponPct * 100)}%、技能傷害 +${Math.round(s.skillPct * 100)}%`);
    if (s.elem) parts.push(`本命五行為${s.elem}時攻擊 +${Math.round(s.elemAtk * 100)}%`);
    if (s.trib) parts.push(`渡劫勝算 ${s.trib > 0 ? '+' : ''}${Math.round(s.trib * 100)}%`);
    if (s.ambushMult) parts.push(`暗殺者出現機率 ×${s.ambushMult}`);
    if (s.poisonImmune) parts.push('免疫中毒');
    if (s.nature) parts.push(s.nature === 'light' ? '本質為光（與暗互剋 +30%）' : '本質為暗（與光互剋 +30%）');
    return parts.join('、') || '無特殊加成';
}
function formatAptitudeName(d) {
    return `<span class="${d.rainbow ? 'rainbow-text' : ''}" style="${d.rainbow ? '' : `color:${d.color};`} font-weight:bold;">${d.icon} ${d.name}</span>`;
}
// 人物面板「資質」一行
function formatAptitudeShort() {
    const a = player.aptitude;
    const giftNote = player.aptitudeGift ? '・已有仙府賜予，測試時生效' : '';   // mailbox.js 送來、尚未測試時先存著的資質
    if (!a) return (player.sect ? '待測試（點此測試）' : '拜入宗門後測試') + giftNote;
    const r = describeRoot(a.root), p = describePhysique(a.physique);
    return `${r ? r.name : '?'}・${p ? p.name : '?'}`;
}

// ---- 流程 ----
let aptitudeRolling = false;
function checkAptitudeTest() {
    if (player.sect && !player.aptitude && !aptitudeRolling) openAptitudeTest();
}
function aptitudeCard(label, d) {
    return `<div class="card" style="text-align:left; margin:8px 0; border-color:${d.color};">
        <p style="margin:0; font-size:0.8em; color:#9ca3af;">${label}・${d.grade}</p>
        <p style="margin:4px 0; font-size:1.15em;">${formatAptitudeName(d)}</p>
        <p style="margin:2px 0; font-size:0.82em; color:#9ca3af;">${d.desc}</p>
        <p style="margin:2px 0; font-size:0.82em; color:#facc15;">${formatAptitudeEffects(d)}</p></div>`;
}
function setAptitudeBody(title, html) {
    document.getElementById('aptitude-title').innerText = title;
    document.getElementById('aptitude-body').innerHTML = html;
    document.getElementById('aptitude-modal').style.display = 'flex';
}
// 擲骰動畫：名稱快速輪播 frames 格（每格 80 毫秒，預設 20 格約 1.6 秒）後停在結果（prefers-reduced-motion 時直接顯示）
function playAptitudeDice(boxId, pool, finalHtml, done, frames) {
    const box = document.getElementById(boxId);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!box || reduce) { if (box) box.innerHTML = finalHtml; done(); return; }
    let n = 0;
    const total = frames || 20;
    const tid = setInterval(() => {
        box.innerHTML = `<p style="font-size:1.2em; margin:18px 0;">🎲 ${pool[Math.floor(Math.random() * pool.length)]}</p>`;
        if (++n >= total) { clearInterval(tid); box.innerHTML = finalHtml; done(); }
    }, 80);
}
function rootNamePool() {
    return APTITUDE_ROOT_GROUPS.flatMap(g => g.pick ? g.pick.map(p => p.name) : [g.name]);
}
function physiqueNamePool() {
    return APTITUDE_PHYSIQUE_GROUPS.flatMap(g => g.pick.map(p => p.name));
}

// 第一次測試：先擲靈根、再擲體質
function openAptitudeTest() {
    stopAptitudeAuto();
    aptitudeRolling = true;
    aptitudeFirstPending = null; aptitudeFirstRerolls = 0;   // 中途關掉視窗再打開＝重新測（還沒按決定就不會存）
    setAptitudeBody('⛩️ 入門資質測試', `
        <p style="color:#e5e7eb; font-size:0.9em;">拜入宗門的弟子，須先於測靈石前測出<b>先天靈根</b>與<b>先天體質</b>。<br>資質一經測出便伴隨終生（可用千寶閣的洗髓丹／伐骨丹重測）。</p>
        <div id="aptitude-root-box"></div><div id="aptitude-phys-box"></div>
        <button id="aptitude-btn" class="sys-btn" onclick="rollAptitudeStep()">🎲 手按測靈石</button>
        <div id="aptitude-choice" style="display:none;">
            <div class="batch-btns">
                <button class="sys-btn" onclick="rerollAptitudeFirst()">🎲 再來一次</button>
                <button class="sys-btn" style="border-color:#4ade80; color:#4ade80;" onclick="confirmAptitudeFirst()">✅ 決定</button>
            </div>
            <p style="color:#9ca3af; font-size:0.78em; margin:4px 0 0;">「再來一次」會把靈根與體質一起重新抽；按「決定」後才會定下來。<span id="aptitude-reroll-count"></span></p>
            <div class="aptitude-auto">
                <label><input type="checkbox" id="aptitude-auto" onchange="toggleAptitudeAuto(this.checked)"> 🔁 自動重抽</label>
                <span>抽到 靈根至少
                    <select id="aptitude-auto-root">${APTITUDE_ROOT_RANKS.map((g, i) => `<option value="${i}" ${i === 2 ? 'selected' : ''}>${i ? g + (i < APTITUDE_ROOT_RANKS.length - 1 ? '以上' : '') : '不限'}</option>`).join('')}</select>
                    、體質至少
                    <select id="aptitude-auto-phys">${APTITUDE_PHYS_RANKS.map((g, i) => `<option value="${i}" ${i === 0 ? 'selected' : ''}>${i ? g + (i < APTITUDE_PHYS_RANKS.length - 1 ? '以上' : '') : '不限'}</option>`).join('')}</select>
                    就停</span>
                <p id="aptitude-auto-msg"></p>
            </div>
        </div>`);
}
// 第一次測試的結果先放在這裡，按「✅ 決定」才寫進 player.aptitude；按「🎲 再來一次」靈根與體質一起重抽（2026-09-29 使用者要求，次數不限）
let aptitudeFirstPending = null, aptitudeFirstRerolls = 0;
// 擲一次（仙府信箱賜予的資質：尚未測試時先存在 player.aptitudeGift，mailbox.js；該部分直接用賜予的，不擲骰，再來一次也不會換掉）
// 回傳 { root, physique, rootCard, physCard, giftRoot, giftPhys }
function rollAptitudeFirstOnce() {
    const gift = player.aptitudeGift || {};
    const giftRoot = !!(gift.root && describeRoot(gift.root)), giftPhys = !!(gift.physique && describePhysique(gift.physique));
    // 兩項同時最頂級另有一道機率（APTITUDE_BOTH_TOP_EXTRA，合計約 0.05%，config-aptitude.js）；有仙府賜予的那項不受影響
    const bothTop = Math.random() < APTITUDE_BOTH_TOP_EXTRA;
    const topRoot = () => { const g = APTITUDE_ROOT_GROUPS[APTITUDE_ROOT_GROUPS.length - 1]; return { group: g.id, id: g.pick[Math.floor(Math.random() * g.pick.length)].id }; };
    const topPhys = () => { const g = APTITUDE_PHYSIQUE_GROUPS[APTITUDE_PHYSIQUE_GROUPS.length - 1]; return g.pick[Math.floor(Math.random() * g.pick.length)].id; };
    const root = giftRoot ? gift.root : bothTop ? topRoot() : rollAptitudeRoot();
    const physique = giftPhys ? gift.physique : bothTop ? topPhys() : rollAptitudePhysique();
    const giftNote = '<p style="color:#facc15; font-size:0.78em; margin:0;">📮 仙府賜予（再來一次不會換掉）</p>';
    return { root, physique, giftRoot, giftPhys,
        rootCard: aptitudeCard('先天靈根', describeRoot(root)) + (giftRoot ? giftNote : ''),
        physCard: aptitudeCard('先天體質', describePhysique(physique)) + (giftPhys ? giftNote : '') };
}
function showAptitudeRerollCount() {
    const n = document.getElementById('aptitude-reroll-count');
    if (n) n.innerText = aptitudeFirstRerolls ? `已再來 ${aptitudeFirstRerolls} 次` : '';
}
function rollAptitudeStep() {
    const btn = document.getElementById('aptitude-btn');
    if (btn) btn.disabled = true;
    const choice = document.getElementById('aptitude-choice');
    if (choice) choice.style.display = 'none';
    const r = rollAptitudeFirstOnce();
    aptitudeFirstPending = { root: r.root, physique: r.physique };
    playAptitudeDice('aptitude-root-box', rootNamePool(), r.rootCard, () => {
        playAptitudeDice('aptitude-phys-box', physiqueNamePool(), r.physCard, () => {
            if (btn) btn.style.display = 'none';
            if (choice) choice.style.display = '';
            showAptitudeRerollCount();
        });
    });
}
function rerollAptitudeFirst() {
    if (!aptitudeFirstPending || player.aptitude) return;
    stopAptitudeAuto();
    aptitudeFirstRerolls++;
    rollAptitudeStep();
}

// ---- 🔁 自動重抽（2026-09-29 使用者要求）：開啟後一直重抽，每次靈根與體質同時滾動 APTITUDE_AUTO_FRAMES 格（約 1 秒）後停在結果，
//      靈根、體質都達到選單上的「至少」等級時自動停下（仙府賜予的那項視為已達成），也可隨時關閉 ----
const APTITUDE_AUTO_FRAMES = 12;   // × 80 毫秒 ≈ 1 秒（使用者要求保留滾動畫面、每次約 1 秒）
const APTITUDE_AUTO_MS = 150;      // 兩次之間的停頓
const APTITUDE_ROOT_RANKS = ["偽靈根", "真靈根", "天靈根", "變異靈根", "特殊靈根", "至尊靈根"];
const APTITUDE_PHYS_RANKS = ["凡體", "靈體", "道體", "神體"];
let aptitudeAutoTid = 0, aptitudeAutoOn = false;
// 停止條件：靈根、體質都達到選單上的「至少」等級才停（仙府賜予的那項視為已達成）
function aptitudeAutoTargetMet(r) {
    const rootMin = +document.getElementById('aptitude-auto-root').value, physMin = +document.getElementById('aptitude-auto-phys').value;
    const rootOk = r.giftRoot || APTITUDE_ROOT_RANKS.indexOf(describeRoot(r.root).grade) >= rootMin;
    const physOk = r.giftPhys || APTITUDE_PHYS_RANKS.indexOf(describePhysique(r.physique).grade) >= physMin;
    return rootOk && physOk;
}
function toggleAptitudeAuto(on) {
    if (!on) { stopAptitudeAuto(); return; }
    if (!aptitudeFirstPending || player.aptitude) return;
    document.getElementById('aptitude-auto-msg').innerText = '🔁 自動重抽中…';
    aptitudeAutoOn = true;
    const step = () => {
        // 視窗關掉、已決定、或開關被關 → 停
        if (!aptitudeAutoOn || document.getElementById('aptitude-modal').style.display !== 'flex' || !aptitudeFirstPending || player.aptitude) { stopAptitudeAuto(); return; }
        const r = rollAptitudeFirstOnce();
        aptitudeFirstPending = { root: r.root, physique: r.physique };
        aptitudeFirstRerolls++;
        showAptitudeRerollCount();
        // 靈根、體質同時滾動約 1 秒；仙府賜予的那項不動畫
        let left = 2;
        const done = () => {
            if (--left > 0) return;
            if (!aptitudeAutoOn) return;   // 滾動途中被關掉：結果照樣顯示，不再繼續
            if (aptitudeAutoTargetMet(r)) {
                stopAptitudeAuto('🎯 已抽到目標，自動停止。滿意就按「決定」，不滿意可再開自動或按「再來一次」。');
                return;
            }
            aptitudeAutoTid = setTimeout(step, APTITUDE_AUTO_MS);
        };
        if (r.giftRoot) { document.getElementById('aptitude-root-box').innerHTML = r.rootCard; done(); }
        else playAptitudeDice('aptitude-root-box', rootNamePool(), r.rootCard, done, APTITUDE_AUTO_FRAMES);
        if (r.giftPhys) { document.getElementById('aptitude-phys-box').innerHTML = r.physCard; done(); }
        else playAptitudeDice('aptitude-phys-box', physiqueNamePool(), r.physCard, done, APTITUDE_AUTO_FRAMES);
    };
    clearTimeout(aptitudeAutoTid);
    aptitudeAutoTid = setTimeout(step, APTITUDE_AUTO_MS);
}
function stopAptitudeAuto(msg) {
    aptitudeAutoOn = false;
    clearTimeout(aptitudeAutoTid);
    aptitudeAutoTid = 0;
    const cb = document.getElementById('aptitude-auto');
    if (cb) cb.checked = false;
    const m = document.getElementById('aptitude-auto-msg');
    if (m) m.innerText = msg || '';
}

function confirmAptitudeFirst() {
    const pend = aptitudeFirstPending;
    if (!pend || player.aptitude) return;
    stopAptitudeAuto();
    player.aptitude = { root: pend.root, physique: pend.physique, at: Date.now() };
    player.aptitudeGift = null;
    aptitudeFirstPending = null;
    aptitudeRolling = false;
    const r = describeRoot(pend.root), p = describePhysique(pend.physique);
    addLog(`⛩️ 資質測試：先天靈根【${r.name}】（${r.grade}）、先天體質【${p.name}】（${p.grade}）！${aptitudeFirstRerolls ? `（再來了 ${aptitudeFirstRerolls} 次）` : ''}`, "level-up");
    aptitudeFirstRerolls = 0;
    closeModal('aptitude-modal');
    saveLocal();
    updateUI();
}

// 人物面板點「資質」：查看目前資質，並可用道具重測
function openAptitudeView() {
    if (!player.aptitude) { if (player.sect) openAptitudeTest(); else alert('拜入宗門後才會進行資質測試。'); return; }
    const r = describeRoot(player.aptitude.root), p = describePhysique(player.aptitude.physique);
    const rp = player.rootPills || 0, pp = player.physiquePills || 0;
    const locked = typeof hasYuanshen === 'function' && hasYuanshen();   // 凝聚元神後資質鎖定（yuanshen.js）
    setAptitudeBody('⛩️ 先天資質', `${aptitudeCard('先天靈根', r)}${aptitudeCard('先天體質', p)}
        ${locked ? `<p style="color:#f472b6; font-size:0.85em;">🔮 已凝聚元神，先天資質已鎖定，不能再重測（轉世後元神消散才解鎖）。</p>` : `
        <div class="batch-btns">
            <button class="sys-btn" ${rp > 0 ? '' : 'disabled'} onclick="rerollAptitude('root')">🧪 洗髓丹重測靈根（持有 ${rp}）</button>
            <button class="sys-btn" ${pp > 0 ? '' : 'disabled'} onclick="rerollAptitude('physique')">🦴 伐骨丹重測體質（持有 ${pp}）</button>
        </div>`}
        <p style="color:#6b7280; font-size:0.78em;">洗髓丹、伐骨丹可在千寶閣「珍貴物資」以 ${APTITUDE_REROLL_COST} 顆七彩補天石購買。</p>
        <button class="close-btn" onclick="closeModal('aptitude-modal')">關閉</button>`);
}
// 重測：消耗 1 顆，擲出新結果後由玩家選擇保留新或舊
function rerollAptitude(part) {
    const isRoot = part === 'root', key = isRoot ? 'rootPills' : 'physiquePills';
    if (typeof hasYuanshen === 'function' && hasYuanshen()) { gameAlert('已凝聚元神，先天資質已鎖定，不能再重測。'); return; }
    if (!(player[key] > 0) || !player.aptitude) return;
    player[key]--;
    const label = isRoot ? '先天靈根' : '先天體質';
    const oldD = isRoot ? describeRoot(player.aptitude.root) : describePhysique(player.aptitude.physique);
    const nv = isRoot ? rollAptitudeRoot() : rollAptitudePhysique();
    const newD = isRoot ? describeRoot(nv) : describePhysique(nv);
    aptitudeRerollPending = { part, value: nv };
    setAptitudeBody(`${isRoot ? '🧪 洗髓' : '🦴 伐骨'}重測`, `
        <p style="color:#9ca3af; font-size:0.85em;">原本</p>${aptitudeCard(label, oldD)}
        <p style="color:#9ca3af; font-size:0.85em;">重測結果</p><div id="aptitude-reroll-box"></div>
        <div id="aptitude-reroll-btns" class="batch-btns" style="display:none;">
            <button class="sys-btn" onclick="finishAptitudeReroll(true)">保留新的</button>
            <button class="sys-btn" onclick="finishAptitudeReroll(false)">保留原本</button>
        </div>`);
    playAptitudeDice('aptitude-reroll-box', isRoot ? rootNamePool() : physiqueNamePool(), aptitudeCard(label, newD), () => {
        document.getElementById('aptitude-reroll-btns').style.display = '';
    });
    saveLocal();
}
let aptitudeRerollPending = null;
function finishAptitudeReroll(keepNew) {
    const pend = aptitudeRerollPending;
    aptitudeRerollPending = null;
    if (pend && keepNew) {
        player.aptitude[pend.part] = pend.value;
        const d = pend.part === 'root' ? describeRoot(pend.value) : describePhysique(pend.value);
        const how = pend.gift ? '📮 接受仙府賜予' : pend.part === 'root' ? '🧪 洗髓重測' : '🦴 伐骨重測';
        addLog(`${how}，先天${pend.part === 'root' ? '靈根' : '體質'}改為【${d.name}】（${d.grade}）！`, "level-up");
        saveLocal();
        updateUI();
    }
    if (aptitudeGiftQueue.length) { showNextAptitudeGift(); return; }   // 仙府賜予還有下一項（靈根與體質各一）
    openAptitudeView();
}

// ---- 仙府信箱賜予的資質（mailbox.js 的 grantMailRewards 呼叫）----
// 已測過：逐項跳出「原本 vs 仙府賜予」由玩家選擇保留哪個；尚未測試：存到 player.aptitudeGift，測試時直接採用
let aptitudeGiftQueue = [];
function offerAptitudeGift(gift) {
    const parts = [];
    if (gift && gift.root && describeRoot(gift.root)) parts.push({ part: 'root', value: gift.root });
    if (gift && gift.physique && describePhysique(gift.physique)) parts.push({ part: 'physique', value: gift.physique });
    if (!parts.length) return;
    if (typeof hasYuanshen === 'function' && hasYuanshen()) {   // 凝聚元神後資質鎖定（yuanshen.js）
        addLog(`📮 仙府賜予了先天資質，但你已凝聚元神、資質鎖定，無法接受。`, "system");
        return;
    }
    if (!player.aptitude) {
        player.aptitudeGift = Object.assign(player.aptitudeGift || {}, ...parts.map(x => ({ [x.part]: x.value })));
        addLog(`📮 仙府賜予的先天資質已記下，拜入宗門測試資質時直接生效。`, "system");
        return;
    }
    aptitudeGiftQueue.push(...parts);
    if (!aptitudeRerollPending) showNextAptitudeGift();
}
function showNextAptitudeGift() {
    const g = aptitudeGiftQueue.shift();
    if (!g) return;
    const isRoot = g.part === 'root', label = isRoot ? '先天靈根' : '先天體質';
    const oldD = isRoot ? describeRoot(player.aptitude.root) : describePhysique(player.aptitude.physique);
    const newD = isRoot ? describeRoot(g.value) : describePhysique(g.value);
    aptitudeRerollPending = { part: g.part, value: g.value, gift: true };
    setAptitudeBody('📮 仙府賜予', `
        <p style="color:#9ca3af; font-size:0.85em;">原本</p>${aptitudeCard(label, oldD)}
        <p style="color:#9ca3af; font-size:0.85em;">仙府賜予</p>${aptitudeCard(label, newD)}
        <div class="batch-btns">
            <button class="sys-btn" onclick="finishAptitudeReroll(true)">改用賜予的</button>
            <button class="sys-btn" onclick="finishAptitudeReroll(false)">保留原本</button>
        </div>`);
}

// ---- 千寶閣購買洗髓丹／伐骨丹（merit.js 的 renderPreciousSection 嵌入）----
function buyAptitudePill(part, qty = 1) {
    const key = part === 'root' ? 'rootPills' : 'physiquePills', item = aptitudeItems[part === 'root' ? 'rootPill' : 'physiquePill'];
    const affordable = Math.floor((player.butianStones || 0) / APTITUDE_REROLL_COST);
    if (affordable <= 0) { alert(`七彩補天石不足！購買 1 顆${item.name}需要 ${APTITUDE_REROLL_COST} 顆（目前 ${player.butianStones || 0}）。`); return; }
    const n = resolveBatchCount(qty, affordable, "購買");
    if (!n) return;
    player.butianStones -= APTITUDE_REROLL_COST * n;
    player[key] = (player[key] || 0) + n;
    addLog(`${item.icon} 於千寶閣以 ${APTITUDE_REROLL_COST * n} 顆七彩補天石購得 ${n} 顆【${item.name}】！（人物面板點「資質」使用）`, "level-up", false, "item");
    toastBought(`${item.name} ×${n}`);
    renderAuction();
    updateUI();
}
function renderAptitudePillCards() {
    const can = Math.floor((player.butianStones || 0) / APTITUDE_REROLL_COST);
    return [['root', 'rootPill', 'rootPills'], ['physique', 'physiquePill', 'physiquePills']].map(([part, id, key]) => {
        const item = aptitudeItems[id];
        return `<div class="card rainbow-glow">
            <h3 class="rainbow-text">${item.icon} ${item.name}</h3>
            <p style="font-size: 0.8em; color: #9ca3af;">${item.desc}</p>
            <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${APTITUDE_REROLL_COST} 顆七彩補天石｜持有 ${(player[key] || 0).toWan()}</p>
            <div class="batch-btns">
                <button class="sys-btn" ${can < 1 ? 'disabled' : ''} onclick="buyAptitudePill('${part}', 1)">×1</button>
                <button class="sys-btn" ${can < 10 ? 'disabled' : ''} onclick="buyAptitudePill('${part}', 10)">×10</button>
            </div></div>`;
    }).join('');
}
