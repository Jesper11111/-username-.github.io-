// 屠龍勇者：共用介面工具（畫面切換、狀態列、對話框、提示）
// 不用原生 alert/confirm（手機 PWA 可能被擋），一律用 showToast / gameAlert / gameConfirm

function $(id) { return document.getElementById(id); }

function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showScreen(name) {
    document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === 'screen-' + name));
}

function bar(cur, max, cls, label) {
    const pct = max > 0 ? clamp(cur / max * 100, 0, 100) : 0;
    return `<div class="bar ${cls}"><div class="bar-fill" style="width:${pct}%"></div><span>${label != null ? label : `${Math.max(0, Math.floor(cur))} / ${max}`}</span></div>`;
}

function renderStatus() {
    if (!player || !$('status')) return;
    const st = calcStats(), c = CLASSES[player.cls];
    const expPct = player.lv >= MAX_LEVEL ? 100 : player.exp / expToNext(player.lv) * 100;
    const wp = invWeight() / st.weightMax * 100;
    $('status').innerHTML = `
        <div class="st-top">
            <b>${c.icon} ${esc(player.name)}</b>
            ${hasDragonTitle() ? '<span class="title-badge">屠龍勇者</span>' : ''}
            <span class="muted">${c.name} Lv.${player.lv}</span>
            <span class="st-gold">💰 ${fmt(player.gold)}</span>
        </div>
        <div class="st-bars">${bar(player.hp, st.maxHp, 'hp')}${bar(player.mp, st.maxMp, 'mp')}</div>
        <div class="st-row">
            <span>EXP ${expPct.toFixed(2)}%</span><span>AC ${st.ac}</span><span>MR ${st.mr}</span>
            <span class="${wp >= 82 ? 'bad' : wp >= 50 ? 'warn' : ''}">負重 ${Math.floor(wp)}%</span>
        </div>
        <div class="bar exp thin"><div class="bar-fill" style="width:${expPct}%"></div></div>`;
}

function showToast(msg, ms = 1800) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    $('toast-layer').appendChild(el);
    setTimeout(() => el.remove(), ms);
}

// 通用對話框：buttons = [{ text, cls, onClick, keep }]；keep 為 true 時按了不關閉
function openDialog(title, html, buttons) {
    const layer = $('dialog-layer');
    layer.innerHTML = `<div class="dialog"><h3>${esc(title)}</h3><div class="dialog-body">${html}</div><div class="dialog-btns"></div></div>`;
    const box = layer.querySelector('.dialog-btns');
    (buttons || [{ text: '關閉', cls: 'secondary' }]).forEach(b => {
        const btn = document.createElement('button');
        btn.textContent = b.text;
        btn.className = b.cls || '';
        btn.onclick = () => { if (!b.keep) closeDialog(); if (b.onClick) b.onClick(); };
        box.appendChild(btn);
    });
    layer.classList.add('active');
}

function closeDialog() {
    $('dialog-layer').classList.remove('active');
    $('dialog-layer').innerHTML = '';
}

function gameAlert(title, msg, onOk) {
    openDialog(title, esc(msg).replace(/\n/g, '<br>'), [{ text: '確定', onClick: onOk }]);
}

function gameConfirm(title, msg, onYes, yesText = '確定') {
    openDialog(title, esc(msg).replace(/\n/g, '<br>'), [{ text: '取消', cls: 'secondary' }, { text: yesText, onClick: onYes }]);
}
