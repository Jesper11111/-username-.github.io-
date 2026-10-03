// 符寶坊：以礦石＋靈石煉製符寶，並鑲嵌到橙色裝備的孔位（數值見 config-talisman.js）
// 持有的符寶：player.talismans = { "str_3": 數量, ... }（key = 種類_品階）
// 裝備孔位：eq.sockets = [null 或 { type, grade }, ...]（只有橙色、非神器才有）

function talismanKey(type, grade) { return `${type}_${grade}`; }

function getTalismanType(type) { return talismanTypes.find(t => t.key === type); }
function getTalismanGrade(grade) { return talismanGrades.find(g => g.grade === grade); }

// 四維符的點數：舊制 g.flat；新制（第 52 節）改用 NV2.talismanFlat（下品 0.1／中品 0.3／上品 0.6），由 numeric.js 的 nv2GearStats 計入屬性
function talismanFlatOf(g) { return NUMERIC_V2 ? NV2.talismanFlat[g.grade] : g.flat; }

// 單一符寶提供的數值（四維為點數、戰鬥屬性為 %）
function getTalismanValue(type, grade) {
    let t = getTalismanType(type), g = getTalismanGrade(grade);
    if (!t || !g) return 0;
    return t.kind === "flat" ? talismanFlatOf(g) : t.kind === "race" ? g.race : g.pct;
}

function formatTalisman(type, grade) {
    let t = getTalismanType(type), g = getTalismanGrade(grade);
    if (!t || !g) return "未知符寶";
    let v = getTalismanValue(type, grade);
    let gn = g.color ? `<span style="color:${g.color};">${g.icon || ''}${g.name}</span>` : g.name;   // 極品：金字＋🌟
    if (t.kind === "race") return `${t.icon}${gn}${t.name}（對${RACES[t.race].name} +${v}%）`;   // 剋制符（種族剋制，race.js）
    return `${t.icon}${gn}${t.name}（${t.kind === "flat" ? `+${NUMERIC_V2 ? v.toFixed(1) : v.toWan()}` : `+${v}%`}）`;
}

// 穿戴中裝備孔位上的剋制符，對各族的加成合計（小數，已套 RACE_TALISMAN_CAP）；race.js 的 getRaceDmgBonus 呼叫
function getRaceTalismanBonus() {
    const out = {};
    for (const slot in player.equipment) {
        const eq = player.equipment[slot];
        (eq && Array.isArray(eq.sockets) ? eq.sockets : []).forEach(s => {
            const t = s && getTalismanType(s.type);
            if (t && t.kind === "race") out[t.race] = (out[t.race] || 0) + getTalismanValue(s.type, s.grade) / 100;
        });
    }
    for (const k in out) out[k] = Math.min(RACE_TALISMAN_CAP, out[k]);
    return out;
}

// ---- 孔位 ----

// 橙色、非神器、尚未開孔的裝備補上隨機 1~3 孔（重複呼叫不會改變已有孔位）
function ensureSockets(eq) {
    if (!eq || Array.isArray(eq.sockets)) return eq;
    let category = eq.category || equipTypes[eq.name];
    if (eq.quality !== SOCKET_QUALITY || category === "artifact") return eq;
    let n = SOCKET_MIN + Math.floor(Math.random() * (SOCKET_MAX - SOCKET_MIN + 1));
    eq.sockets = Array(n).fill(null);
    return eq;
}

// 裝備上所有符寶的數值加總（stats.js 的 getEquipBonus 會加進去）
function getSocketStats(eq) {
    let stats = {};
    (eq && Array.isArray(eq.sockets) ? eq.sockets : []).forEach(s => {
        if (s) stats[s.type] = (stats[s.type] || 0) + getTalismanValue(s.type, s.grade);
    });
    return stats;
}

// 孔位文字（背包、裝備欄、千寶閣共用），例：「🔮 孔位：[💪上品力量符] [空] [空]」
function formatSockets(eq) {
    if (!eq || !Array.isArray(eq.sockets) || eq.sockets.length === 0) return "";
    let slots = eq.sockets.map(s => s ? `[${formatTalisman(s.type, s.grade)}]` : `[空]`).join(" ");
    return `<p style="font-size: 0.78em; color: #c084fc; margin: 3px 0;">🔮 孔位 ${eq.sockets.length}：${slots}</p>`;
}

// 依 id 找已穿戴或背包中的裝備
function findEquipById(equipId) {
    for (let slot in player.equipment) {
        if (player.equipment[slot] && player.equipment[slot].id === equipId) return player.equipment[slot];
    }
    return player.equipInventory.find(e => e.id === equipId) || null;
}

// ---- 符寶坊視窗 ----

function openTalismanModal() {
    if (!checkSectJoined()) return;
    document.getElementById('talisman-modal').style.display = 'flex';
    renderTalismanWorkshop();
}

function renderTalismanWorkshop() {
    const container = document.getElementById('talisman-container');
    if (!container) return;
    if (!player.talismans) player.talismans = {};

    // 煉製區：種類與品階全部隨機，只選次數
    let c = TALISMAN_CRAFT_COST;
    let gradeText = talismanGrades.filter(g => g.chance > 0).map(g =>
        `${g.name} ${Math.round(g.chance * 100)}%（四維 +${NUMERIC_V2 ? talismanFlatOf(g).toFixed(1) : g.flat.toWan()}／屬性 +${g.pct}%）`).join("｜");
    let craftCard = `
        <div class="card" style="max-width: 460px; margin: 0 auto;">
            <p style="font-size: 0.85em; color: var(--accent); margin: 4px 0;">每次煉製：${c.ore} 礦石 ＋ ${c.coins.toWan()} 靈石</p>
            <p style="font-size: 0.8em; color: #9ca3af; margin: 4px 0;">種類（${talismanTypes.filter(t => t.kind !== "race").length} 種）與品階全部隨機，無法指定</p>
            <p style="font-size: 0.78em; color: #9ca3af; margin: 4px 0;">${gradeText}</p>
            <div class="batch-btns">
                <button class="sys-btn" onclick="craftTalisman(1)">×1</button>
                <button class="sys-btn" onclick="craftTalisman(10)">×10</button>
                <button class="sys-btn" onclick="craftTalisman('max')">最高</button>
            </div>
        </div>`;
    // 剋制符（種族剋制第 3 期）：同樣成本，4 種隨機；鑲在穿戴中的裝備才生效
    let raceTypes = talismanTypes.filter(t => t.kind === "race");
    let raceCard = `
        <div class="card" style="max-width: 460px; margin: 10px auto 0;">
            <p style="font-size: 0.85em; color: var(--accent); margin: 4px 0;">⚔️ 煉製剋制符：${c.ore} 礦石 ＋ ${c.coins.toWan()} 靈石</p>
            <p style="font-size: 0.8em; color: #9ca3af; margin: 4px 0;">${raceTypes.map(t => `${t.icon}${t.name}（剋${RACES[t.race].name}）`).join("、")}，隨機一種</p>
            <p style="font-size: 0.78em; color: #9ca3af; margin: 4px 0;">${talismanGrades.filter(g => g.chance > 0).map(g => `${g.name} ${Math.round(g.chance * 100)}%（對該族傷害 +${g.race}%）`).join("｜")}</p>
            <p style="font-size: 0.75em; color: #9ca3af; margin: 4px 0;">同一族的剋制符合計最多 +${Math.round(RACE_TALISMAN_CAP * 100)}%（再與斬妖錄等一起最多 +${Math.round(RACE_DMG_CAP * 100)}%）</p>
            <div class="batch-btns">
                <button class="sys-btn" onclick="craftTalisman(1, true)">×1</button>
                <button class="sys-btn" onclick="craftTalisman(10, true)">×10</button>
                <button class="sys-btn" onclick="craftTalisman('max', true)">最高</button>
            </div>
        </div>`;

    // 持有的符寶
    let owned = Object.keys(player.talismans).filter(k => player.talismans[k] > 0);
    let ownedHtml = owned.length
        ? owned.map(k => { let [type, grade] = k.split("_"); return `<span style="white-space: nowrap;">${formatTalisman(type, +grade)} ×${player.talismans[k]}</span>`; }).join("　")
        : `<span style="color: #6b7280;">尚無符寶</span>`;
    let ownedOptions = owned.map(k => { let [type, grade] = k.split("_"); return `<option value="${k}">${stripTalismanTags(formatTalisman(type, +grade))} ×${player.talismans[k]}</option>`; }).join("");

    // 鑲嵌區：已穿戴在前、背包在後，只列出有孔的裝備
    let equipped = Object.keys(player.equipment).map(slot => player.equipment[slot]).filter(eq => eq && Array.isArray(eq.sockets));
    let bagged = player.equipInventory.filter(eq => Array.isArray(eq.sockets));
    let equipCards = equipped.map(eq => renderSocketCard(eq, true, ownedOptions))
        .concat(bagged.map(eq => renderSocketCard(eq, false, ownedOptions)));

    container.innerHTML = `
        <p style="color: #9ca3af; font-size: 0.85em;">
            持有：⛏️ 礦石 <b style="color: var(--accent);">${(player.ore || 0).toWan()}</b>｜靈石 <b style="color: var(--accent);">${player.coins.toWan()}</b>
        </p>
        <h3 style="color: #c084fc; margin: 14px 0 6px;">🔥 煉製符寶（隨機）</h3>
        ${craftCard}
        ${raceCard}

        <h3 style="color: #c084fc; margin: 18px 0 6px;">🎴 持有符寶</h3>
        <p style="font-size: 0.85em; line-height: 1.8;">${ownedHtml}</p>

        <h3 style="color: #c084fc; margin: 18px 0 6px;">⚗️ 合成（同種類升一品，一定成功）</h3>
        ${renderTalismanMerge()}

        <h3 style="color: #c084fc; margin: 18px 0 6px;">💠 鑲嵌（橙色裝備 ${SOCKET_MIN}~${SOCKET_MAX} 孔）</h3>
        <p style="color: #9ca3af; font-size: 0.8em;">※ 已鑲嵌的符寶可以打掉換新，但舊符寶會碎裂消失；毀棄裝備時符寶一併消失。</p>
        ${equipCards.length
            ? `<div class="grid-container">${equipCards.join("")}</div>`
            : `<p style="color: #6b7280;">目前沒有可鑲嵌的橙色裝備（鍛造閣、千寶閣、靈寶閣可取得）。</p>`}`;
}

function renderSocketCard(eq, isEquipped, ownedOptions) {
    let slots = eq.sockets.map((s, i) => s
        ? `<div style="display: flex; gap: 6px; align-items: center; margin: 4px 0;">
               <span style="flex: 1; font-size: 0.8em; color: #c084fc;">${formatTalisman(s.type, s.grade)}</span>
               <button class="sys-btn" style="width: auto; padding: 4px 8px; border-color: #ef4444; color: #ef4444;" onclick="removeTalisman('${eq.id}', ${i})">打掉</button>
           </div>`
        : `<div style="display: flex; gap: 6px; align-items: center; margin: 4px 0;">
               <select id="sock-${eq.id}-${i}" ${ownedOptions ? '' : 'disabled'}
                       style="flex: 1; min-width: 0; background: #0b0f19; color: #fff; padding: 4px; border-radius: 6px; border: 1px solid var(--panel-border); font-size: 0.78em;">
                   ${ownedOptions || '<option>（沒有符寶）</option>'}
               </select>
               <button class="sys-btn" style="width: auto; padding: 4px 8px;" ${ownedOptions ? '' : 'disabled'} onclick="inlayTalisman('${eq.id}', ${i})">鑲嵌</button>
           </div>`).join("");
    return `
        <div class="card" style="border-color: var(--equip-color); text-align: left;">
            <h3 class="quality-${eq.quality}" style="text-align: center;">${formatEquipTitle(eq)}${isEquipped ? '（穿戴中）' : ''}</h3>
            <p style="font-size: 0.78em; color: #9ca3af; text-align: center;">屬性：<span class="elem-${eq.element}">${eq.element}</span>｜${eq.sockets.length} 孔</p>
            ${slots}
        </div>`;
}

// 隨機抽一枚符寶：種類平均、品階依 talismanGrades 的 chance；race＝true 只抽剋制符（4 種），否則只抽原本 11 種
function rollTalisman(race) {
    const pool = talismanTypes.filter(t => (t.kind === "race") === !!race);
    let type = pool[Math.floor(Math.random() * pool.length)].key;
    let r = Math.random(), acc = 0, grade = talismanGrades[0].grade;
    for (let g of talismanGrades) {
        acc += g.chance;
        if (r < acc) { grade = g.grade; break; }
    }
    return { type, grade };
}

// ---- 合成（config-talisman.js 的 TALISMAN_MERGE）：同種類 need 枚 → 下一品階 1 枚；鑲在裝備上的不算 ----
function renderTalismanMerge() {
    const rules = Object.keys(TALISMAN_MERGE).map(gr => { const M = TALISMAN_MERGE[gr], a = getTalismanGrade(+gr), b = getTalismanGrade(+gr + 1);
        return `${a.name}×${M.need}→${b.name}（${M.coins.toWan()} 靈石）`; }).join("｜");
    const rows = [];
    talismanTypes.forEach(t => Object.keys(TALISMAN_MERGE).forEach(gr => {
        const M = TALISMAN_MERGE[gr], have = player.talismans[talismanKey(t.key, +gr)] || 0;
        if (have < M.need) return;
        const can = Math.min(Math.floor(have / M.need), Math.floor(player.coins / M.coins));
        rows.push(`<div style="display: flex; gap: 6px; align-items: center; margin: 4px 0; flex-wrap: wrap;">
            <span style="flex: 1; min-width: 160px; font-size: 0.8em;">${formatTalisman(t.key, +gr)} ×${have} → ${formatTalisman(t.key, +gr + 1)}</span>
            <button class="sys-btn" style="width: auto; padding: 4px 8px;" ${can >= 1 ? '' : 'disabled'} onclick="mergeTalisman('${t.key}', ${gr}, 1)">合成 1 次</button>
            <button class="sys-btn" style="width: auto; padding: 4px 8px;" ${can >= 2 ? '' : 'disabled'} onclick="mergeTalisman('${t.key}', ${gr}, 'max')">全部（${can}）</button>
        </div>`);
    }));
    return `<div class="card" style="max-width: 460px; margin: 0 auto; text-align: left;">
        <p style="font-size: 0.78em; color: #9ca3af; margin: 4px 0;">${rules}；🌟極品只能合成取得</p>
        ${rows.length ? rows.join('') : '<p style="font-size: 0.8em; color: #6b7280;">目前沒有數量足夠合成的符寶。</p>'}</div>`;
}
function mergeTalisman(type, grade, qty) {
    const M = TALISMAN_MERGE[grade], t = getTalismanType(type);
    if (!M || !t || !getTalismanGrade(grade + 1)) return;
    const from = talismanKey(type, grade), to = talismanKey(type, grade + 1);
    const can = Math.min(Math.floor((player.talismans[from] || 0) / M.need), Math.floor(player.coins / M.coins));
    if (can < 1) { alert(`需要 ${M.need} 枚同種${getTalismanGrade(grade).name}符寶＋${M.coins.toWan()} 靈石。`); return; }
    const n = qty === 'max' ? can : Math.min(can, qty || 1);
    player.talismans[from] -= M.need * n;
    if (player.talismans[from] <= 0) delete player.talismans[from];
    player.talismans[to] = (player.talismans[to] || 0) + n;
    player.coins -= M.coins * n;
    const txt = `${formatTalisman(type, grade + 1)} ×${n}`;
    addLog(`⚗️ 符寶坊合成：${M.need * n} 枚${stripTalismanTags(formatTalisman(type, grade))} → ${stripTalismanTags(txt)}（${(M.coins * n).toWan()} 靈石）`, "equip");
    showCraftSuccess(`符寶合成成功${n > 1 ? ` ×${n}` : ''}`, txt);
    saveLocal();
    renderTalismanWorkshop();
    updateUI();
}
function stripTalismanTags(h) { return String(h).replace(/<[^>]+>/g, ''); }

// qty：1、10 或 'max'；每次產出的種類與品階都是隨機；race＝true 煉製剋制符（同樣成本）
function craftTalisman(qty = 1, race) {
    let c = TALISMAN_CRAFT_COST;
    let affordable = Math.min(Math.floor((player.ore || 0) / c.ore), Math.floor(player.coins / c.coins));
    if (affordable <= 0) {
        alert(`資源不足！煉製 1 次需要 ${c.ore} 礦石 + ${c.coins.toWan()} 靈石。\n礦石可派遣傳說僕從執行「礦脈採礦」取得。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "煉製");
    if (!n) return;

    player.ore -= c.ore * n;
    player.coins -= c.coins * n;
    if (!player.talismans) player.talismans = {};
    let got = {};
    for (let i = 0; i < n; i++) {
        let t = rollTalisman(race);
        let key = talismanKey(t.type, t.grade);
        player.talismans[key] = (player.talismans[key] || 0) + 1;
        got[key] = (got[key] || 0) + 1;
    }
    let summary = Object.keys(got).map(k => { let [type, grade] = k.split("_"); return `${formatTalisman(type, +grade)}×${got[k]}`; }).join("、");
    addLog(`🔥 於符寶坊煉製 ${n} 次（消耗 ${(c.ore * n).toWan()} 礦石、${(c.coins * n).toWan()} 靈石），煉成：${summary}`, "equip");
    showCraftSuccess(`符寶煉製成功${n > 1 ? ` ×${n}` : ''}`, summary);   // 製作成功提示（ui.js）
    renderTalismanWorkshop();
    updateUI();
}

function inlayTalisman(equipId, socketIndex) {
    let eq = findEquipById(equipId);
    if (!eq || !Array.isArray(eq.sockets) || eq.sockets[socketIndex]) return;
    let select = document.getElementById(`sock-${equipId}-${socketIndex}`);
    let key = select && select.value;
    if (!key || !(player.talismans[key] > 0)) { alert("請先選擇要鑲嵌的符寶！"); return; }

    let [type, grade] = key.split("_");
    player.talismans[key]--;
    if (player.talismans[key] <= 0) delete player.talismans[key];
    eq.sockets[socketIndex] = { type: type, grade: +grade };
    addLog(`💠 將【${formatTalisman(type, +grade)}】鑲嵌到【${eq.quality}·${getEquipDisplayName(eq)}】！`, "equip");
    renderTalismanWorkshop();
    updateUI();
}

// 打掉孔位上的符寶：符寶碎裂消失，孔位恢復為空
function removeTalisman(equipId, socketIndex) {
    let eq = findEquipById(equipId);
    if (!eq || !Array.isArray(eq.sockets) || !eq.sockets[socketIndex]) return;
    let s = eq.sockets[socketIndex];
    if (!confirm(`確定要打掉【${formatTalisman(s.type, s.grade)}】嗎？\n打掉後符寶會碎裂消失，無法取回。`)) return;
    eq.sockets[socketIndex] = null;
    addLog(`💥 打掉了【${getEquipDisplayName(eq)}】上的【${formatTalisman(s.type, s.grade)}】，符寶碎裂消散。`, "equip");
    renderTalismanWorkshop();
    updateUI();
}
