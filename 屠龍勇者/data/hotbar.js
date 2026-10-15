// 屠龍勇者：快捷欄（ARCHITECTURE.md 第 40 節）（依賴 player、combat、ui、ui-panels、ui-frame）
// 22 格 player.settings.bar，每格放技能或道具：點一下＝手動使用、按住往下拉再放開＝切換自動、點空格／長按／右鍵＝選要放什麼。
//   手機：地圖下方兩排（0～7、8～15；村莊裡不顯示）
//   PC：底部骷髏頭左邊 0～7（鍵盤 1～8）、右邊 8～15（Q E R F Z X C V）、上排原本藥水卷軸的 6 格 16～21

// 圖示在 icons.js（skillIconHtml／itemIconHtml，第 41 節）
function barName(id) { return SKILL_BY_ID[id] ? SKILL_BY_ID[id].name : ITEMS[id] ? ITEMS[id].name : ''; }
function barKeyLabel(i) { return i < BAR_KEYS.length ? BAR_KEYS[i].toUpperCase() : ''; }

// 一格的 HTML（data-i＝格子編號，事件在下方 pointer 監聽處理）
function barSlotHtml(i, cls = '', style = '') {
    const b = player.settings.bar[i], key = barKeyLabel(i);
    const keyHtml = key ? `<span class="hb-key">${key}</span>` : '';
    if (!b || !b.id) return `<div class="hb empty ${cls}" style="${style}" data-i="${i}" title="點一下放技能或道具"><div class="hb-face">${keyHtml}</div></div>`;
    const now = gameNow, s = SKILL_BY_ID[b.id];
    let ic, face = 'svg', tl = '', tr = '', br = '', pct = 0, cdTxt = '', dim = false, tip;
    if (s) {
        ic = skillIconHtml(s);
        const left = player.cds[s.id] > now ? (player.cds[s.id] - now) / 1000 : 0;
        if (left) { cdTxt = Math.ceil(left) + 's'; pct = s.cd ? Math.min(100, Math.round(left / s.cd * 100)) : 0; }
        tl = s.mp ? `<span class="hb-tl">${s.mp}</span>` : '';
        tr = s.cd ? `<span class="hb-tr">${s.cd}s</span>` : '';
        dim = !hasSkill(s.id) || player.mp < (s.mp || 0);
        tip = `${s.name}（${s.mp || 0} MP${s.cd ? '・冷卻 ' + s.cd + ' 秒' : ''}）${hasSkill(s.id) ? '' : '尚未學會'}`;
    } else {
        const n = countItem(b.id);
        ic = itemIconHtml(b.id);
        tr = `<span class="hb-tr">${n > 999 ? '999+' : n}</span>`;   // 數量放右上，底部留給 AUTO
        dim = n <= 0;
        tip = `${ITEMS[b.id].name}（${n} 個）`;
    }
    tip += b.a ? '｜自動中，往下拉關閉' : barCanAuto(b.id) ? '｜往下拉開啟自動' : '';
    return `<div class="hb ${b.a ? 'auto' : ''} ${dim ? 'dim' : ''} ${cls}" style="${style}" data-i="${i}" title="${esc(tip)}">
        <div class="hb-face ${face}" style="--cd:${pct}%"><span class="hb-ic">${ic}</span>${tl}${tr}${br}${keyHtml}${cdTxt ? `<span class="hb-cd">${cdTxt}</span>` : ''}</div>
        <div class="hb-pull">▼ ${b.a ? '關閉自動' : '自動'}</div><span class="hb-auto">AUTO</span></div>`;
}

// PC 外框上的位置（原圖 2000×1116 座標）：底部石條左右各 8 格、上排第 3～8 格
function barPcPos(i) {
    const P = (x, y, w, h) => `left:calc(var(--s) * ${x}px);top:calc(var(--s) * ${y}px);width:calc(var(--s) * ${w}px);height:calc(var(--s) * ${h}px)`;
    if (i < 8) return P(318 + i * 72, 1036, 62, 62);
    if (i < 16) return P(1114 + (i - 8) * 72, 1036, 62, 62);
    return P(590 + (i - 14) * 70, 936, 62, 60);
}

function renderHotbar() {
    if (!player || !player.settings.bar || barDrag) return;
    const pcBox = $('hotbar'), mapBar = $('skill-bar');
    const set = (el, html) => {
        if (!el) return;
        el.classList.toggle('editing', barEditMode);
        if (el.dataset.html !== html) { el.dataset.html = html; el.innerHTML = html; }
    };
    if (isPcFrame()) {
        set(pcBox, player.settings.bar.map((b, i) => barSlotHtml(i, 'abs', barPcPos(i))).join(''));
        set(mapBar, '');
        return;
    }
    set(pcBox, '');
    if (!mapBar) return;
    if (inTown()) { set(mapBar, ''); return; }
    const row = from => `<div class="sk-row">${[...Array(8).keys()].map(k => {
        const i = from + k, id = player.settings.bar[i].id;
        return `<div class="sk-cell">${barSlotHtml(i)}<div class="sk-name">${esc(barName(id)) || ' '}</div></div>`;
    }).join('')}</div>`;
    set(mapBar, row(0) + row(8));
}

// ───────── 使用、切換自動、放置 ─────────
function barUse(i) {
    const b = player.settings.bar[i];
    if (!b || !b.id) return;
    const s = SKILL_BY_ID[b.id];
    if (s) {
        const err = manualCast(s.id);
        if (err) showToast(`${s.name}：${err}`, 1200);
    } else if (ITEMS[b.id].heal) {
        if (player.hp >= calcStats().maxHp) showToast('HP 已經是滿的');
        else if (countItem(b.id) > 0) usePotion(b.id);
        else quickHeal();   // 這種藥水用完了：改喝身上其他治癒藥水
    } else if (b.id === 'homeScroll') homeScrollBtn();
    else if (b.id === 'teleScroll') quickTele();
    else quickPotion(b.id);
    refreshHotbarUI();
}
function barToggleAuto(i) {
    const b = player.settings.bar[i];
    if (!b || !b.id) return;
    if (!barCanAuto(b.id)) { showToast(b.id === 'homeScroll' ? '回家卷軸不能設自動（自動回家在「設定」裡）' : '這個不能自動使用'); return; }
    if (SKILL_BY_ID[b.id] && !hasSkill(b.id)) { showToast('還沒學會這個技能'); return; }
    b.a = b.a ? 0 : 1;
    showToast(`${barName(b.id)}：自動${b.a ? '開啟' : '關閉'}`, 1200);
    saveGame();
    refreshHotbarUI();
}
function refreshHotbarUI() {
    renderHotbar();
    renderStatus();
    if (huntVisible()) updateHuntLive();
}

// 選擇這格要放什麼：已學會的主動技能＋身上的藥水卷軸（常用補給沒有也列出來）
function openBarPicker(i) {
    const b = player.settings.bar[i];
    const skills = learnedSkills().filter(s => s.type !== 'passive');
    const base = ['redPotion', 'orangePotion', 'whitePotion', 'ancientPotion', 'greenPotion', braveItemFor(player.cls), 'bluePotion', 'homeScroll', 'teleScroll'];
    const items = [...new Set([...base.filter(id => id && (countItem(id) > 0 || ['redPotion', 'greenPotion', 'bluePotion', 'homeScroll', 'teleScroll', braveItemFor(player.cls)].includes(id))),
        ...player.inv.map(x => x.id).filter(barItemOk)])];
    const opt = (id, ic, sub) => `<button class="hb-opt ${b.id === id ? 'cur' : ''}" onclick="barPick(${i}, '${id}')"><span>${ic}</span>${esc(barName(id))}<small>${sub}</small></button>`;
    const html = `${b.id ? `<div class="hb-now">目前：<b>${esc(barName(b.id))}</b>${b.a ? '（自動）' : '（手動）'}　點下方選項換掉，或按「清空這格」</div>` : ''}
        <small class="muted">點一下＝手動使用；<b>按住格子往下拉再放開</b>＝切換自動（綠框＋AUTO）。${barKeyLabel(i) ? `鍵盤 ${barKeyLabel(i)}。` : ''}</small>
        <h4>⚔️ 技能</h4><div class="hb-opts">${skills.map(s => opt(s.id, skillIconHtml(s), s.mp ? `MP ${s.mp}` : '')).join('') || '<small class="muted">還沒學會主動技能</small>'}</div>
        <h4>🎒 道具</h4><div class="hb-opts">${items.map(id => opt(id, itemIconHtml(id), `${countItem(id)} 個`)).join('')}</div>`;
    const btns = [{ text: barEditMode ? '返回' : '關閉', cls: 'secondary' }];
    if (b.id) btns.unshift({ text: '清空這格', cls: 'danger', onClick: () => barPick(i, '') });
    openDialog(`快捷欄第 ${i + 1} 格`, html, btns);
}
function barPick(i, id) {
    const bar = player.settings.bar;
    if (id && !(SKILL_BY_ID[id] ? hasSkill(id) : barItemOk(id))) return;
    let a = 0;
    // 同一招技能只放一格：從原本的格子移過來（保留自動開關）
    if (id && SKILL_BY_ID[id]) bar.forEach((x, j) => { if (j !== i && x.id === id) { a = x.a; bar[j] = { id: '', a: 0 }; } });
    bar[i] = { id: id || '', a: id ? a : 0 };
    closeDialog();
    saveGame();
    refreshHotbarUI();
    if (currentTab === 'skill') renderPanel();
}
// 技能頁「放進快捷欄」：放進前兩排第一個空格並開自動
function barPlaceSkill(id) {
    const bar = player.settings.bar;
    if (!hasSkill(id) || bar.some(x => x.id === id)) return;
    const i = bar.findIndex((x, j) => j < 16 && !x.id);
    if (i < 0) { showToast('快捷欄前兩排滿了，先清空一格'); return; }
    bar[i] = { id, a: 1 };
    saveGame();
    showToast(`已放進快捷欄第 ${i + 1} 格（自動施放）`);
    refreshHotbarUI();
    renderPanel();
}
// 技能頁「↺ 第一排自動排好」
function resetSkillSlots() {
    defaultSkillSlots().forEach((id, i) => {
        player.settings.bar.forEach((x, j) => { if (j >= 8 && id && x.id === id) player.settings.bar[j] = { id: '', a: 0 }; });
        player.settings.bar[i] = { id, a: id ? 1 : 0 };
    });
    saveGame(); refreshHotbarUI(); renderPanel();
    showToast('第一排已依目前學會的技能自動排好');
}

// ───────── 編輯模式（手機沒有右鍵，長按又不好找：按「✎ 編輯快捷欄」後點任何格子都是更換／清空）─────────
let barEditMode = false;
function toggleBarEdit() {
    barEditMode = !barEditMode;
    showToast(barEditMode ? '編輯快捷欄：點格子更換或清空，完成後按「✔ 完成」' : '快捷欄編輯完成', 2000);
    refreshHotbarUI();
}
// 手指放開的瞬間打開選單時，瀏覽器接著補發的 click 會點到選單裡手指下的選項（還沒選就被放進去）→ 打開後 0.6 秒內忽略對話框上的 click
let barIgnoreClickUntil = 0;
function openBarPickerSafe(i) { barIgnoreClickUntil = Date.now() + 600; openBarPicker(i); }
document.addEventListener('click', e => {
    if (Date.now() < barIgnoreClickUntil && e.target.closest && e.target.closest('#dialog-layer')) { e.stopPropagation(); e.preventDefault(); }
}, true);

// ───────── 手勢：點一下、往下拉、長按 ─────────
const BAR_PULL = 16;   // 往下拉超過這個距離（px）放開就切換自動
let barDrag = null;
function barDragEnd() {
    if (!barDrag) return;
    clearTimeout(barDrag.long);
    const { el } = barDrag;
    barDrag = null;
    el.classList.remove('dragging', 'armed');
    const f = el.querySelector('.hb-face');
    if (f) f.style.transform = '';
}
document.addEventListener('pointerdown', e => {
    const el = e.target.closest && e.target.closest('.hb');
    if (!el || !player || e.button === 2) return;
    e.preventDefault();
    const i = +el.dataset.i;
    barDrag = { el, i, x0: e.clientX, y0: e.clientY, dy: 0, moved: false,
        long: setTimeout(() => { if (barDrag && !barDrag.moved) { barDragEnd(); openBarPickerSafe(i); } }, 550) };
    try { el.setPointerCapture(e.pointerId); } catch (err) { }
});
document.addEventListener('pointermove', e => {
    if (!barDrag) return;
    const d = barDrag, raw = e.clientY - d.y0;
    if (Math.abs(raw) > 4 || Math.abs(e.clientX - d.x0) > 4) { d.moved = true; clearTimeout(d.long); }
    if (d.el.classList.contains('empty')) return;
    d.dy = clamp(raw, 0, 26);
    d.el.classList.add('dragging');
    d.el.querySelector('.hb-face').style.transform = `translateY(${d.dy}px)`;
    d.el.classList.toggle('armed', d.dy >= BAR_PULL);
});
document.addEventListener('pointerup', () => {
    if (!barDrag) return;
    const { i, dy, moved } = barDrag;
    barDragEnd();
    const b = player.settings.bar[i];
    if (dy >= BAR_PULL && b.id) barToggleAuto(i);
    else if (!moved) { if (b.id && !barEditMode) barUse(i); else openBarPickerSafe(i); }
    else renderHotbar();
});
document.addEventListener('pointercancel', () => { barDragEnd(); renderHotbar(); });
document.addEventListener('contextmenu', e => {
    const el = e.target.closest && e.target.closest('.hb');
    if (!el || !player) return;
    e.preventDefault();
    if (document.getElementById('dialog-layer').classList.contains('active')) return;   // 長按計時已經打開了
    openBarPickerSafe(+el.dataset.i);
});
