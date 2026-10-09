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

// 外框 HUD：上方角色資訊、紅藍法球（HP／MP）、下方地點與經驗條、底部格子數量（ui-frame.js）
function renderStatus() {
    if (!player || SIM_MODE || !$('hud-stats')) return;
    const st = calcStats();
    const expPct = player.lv >= MAX_LEVEL ? 100 : player.exp / expToNext(player.lv) * 100;
    // 上方人物狀態（名稱、職業、負重）已移除（2026-10-09 使用者要求）；金幣、AC、MR 顯示在經驗條上方 #hud-stats
    const hs = $('hud-stats');
    if (hs) hs.innerHTML = `<span class="gold">💰${fmt(player.gold)}</span><span class="hud-lv-gap"></span><span>AC ${st.ac}</span><span>MR ${st.mr}</span>`;
    setOrb('orb-hp', player.hp, st.maxHp, 'HP');
    setOrb('orb-mp', player.mp, st.maxMp, 'MP');
    const where = player.loc.type === 'town' ? `${TOWNS[player.loc.id].icon} ${TOWNS[player.loc.id].name}`
        : `📍 ${zoneTitle()}${walkHome ? '・步行回村中' : player.hunting ? '・<span class="good">掛機中</span>' : '・停止'}`;
    $('hud-bottom').innerHTML = `<div class="hud-where">${where}</div>`;
    // 經驗條在欄杆下方的石條、等級在欄杆中間（index.html 的 #exp-strip／#lv-badge）
    const strip = $('exp-strip');
    if (strip) {
        strip.firstElementChild.style.width = expPct + '%';
        strip.lastElementChild.textContent = `EXP ${expPct.toFixed(2)}%`;
    }
    const lv = $('lv-badge');
    if (lv) lv.textContent = 'Lv.' + player.lv;
    renderSlots();
    renderSkull();
    renderLogPop();
}

function setOrb(id, cur, max, label) {
    const el = $(id);
    if (!el) return;
    const pct = max > 0 ? clamp(cur / max, 0, 1) : 0;
    el.querySelector('.orb-empty').style.height = `${(1 - pct) * 100}%`;
    el.querySelector('span').innerHTML = `${label}<br>${Math.max(0, Math.floor(cur))}/${max}`;
}

function showToast(msg, ms = 1800) {
    if (SIM_MODE) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    $('toast-layer').appendChild(el);
    setTimeout(() => el.remove(), ms);
}

// 通用對話框：buttons = [{ text, cls, onClick, keep }]；keep 為 true 時按了不關閉
function openDialog(title, html, buttons) {
    if (SIM_MODE) return;
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
