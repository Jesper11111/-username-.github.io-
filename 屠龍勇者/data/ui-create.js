// 屠龍勇者：標題畫面與創角（依賴 ui、classes、player、save）
let createState = null;

function showTitle() {
    $('version').textContent = 'v' + GAME_VERSION;
    $('btn-continue').classList.toggle('hidden', !hasSave());
    showScreen('title');
}

function openCreate() {
    if (hasSave()) {
        gameConfirm('建立新角色', '目前只有一個存檔位置，建立新角色會覆蓋舊角色，確定嗎？', () => { createState = null; renderCreate(); showScreen('create'); }, '覆蓋並建立');
        return;
    }
    createState = null;
    renderCreate();
    showScreen('create');
}

function selectClass(cls) {
    createState = { cls, stats: { ...CLASSES[cls].base }, name: $('create-name').value || (createState ? createState.name : '') };
    renderCreate();
}

function createPointsLeft() {
    return CREATE_TOTAL - STAT_KEYS.reduce((a, k) => a + createState.stats[k], 0);
}

function adjustCreateStat(k, d) {
    const v = createState.stats[k] + d;
    if (v < CLASSES[createState.cls].base[k] || v > CREATE_STAT_MAX) return;
    if (d > 0 && createPointsLeft() <= 0) return;
    createState.stats[k] = v;
    renderCreate();
}

function renderCreate() {
    if (!createState) createState = { cls: 'knight', stats: { ...CLASSES.knight.base }, name: '' };
    if ($('create-name').value) createState.name = $('create-name').value;   // 重繪前保留已輸入的名字
    const c = CLASSES[createState.cls], left = createPointsLeft();
    $('create-classes').innerHTML = Object.keys(CLASSES).map(id =>
        `<button class="class-card ${id === createState.cls ? 'active' : ''}" onclick="selectClass('${id}')">
            <span class="class-icon">${CLASSES[id].icon}</span>${CLASSES[id].name}</button>`).join('');
    $('create-desc').innerHTML = (c.art ? `<img class="class-art" src="${c.art}?v=${GAME_VERSION}" alt="${c.name}">` : '') +
        `<b>${c.icon} ${c.name}</b><p>${c.desc}</p><p class="story-text">${CLASS_STORIES[createState.cls].story}</p>
        <small class="muted">可用武器：${c.weapons.map(w => WEAPON_TYPES[w].name).join('、')}${c.shield ? '、盾牌' : '（不能用盾）'}</small>`;
    $('create-stats').innerHTML = STAT_KEYS.map(k => `
        <div class="stat-row">
            <span>${STAT_NAMES[k]}</span>
            <button class="mini secondary" onclick="adjustCreateStat('${k}',-1)">−</button>
            <b>${createState.stats[k]}</b>
            <button class="mini" onclick="adjustCreateStat('${k}',1)" ${left <= 0 ? 'disabled' : ''}>＋</button>
        </div>`).join('') + `<div class="points-left">剩餘點數：<b>${left}</b></div>`;
    $('create-name').value = createState.name;
}

function confirmCreate() {
    const name = $('create-name').value.trim().slice(0, 12);
    createState.name = name;
    if (!name) { showToast('請輸入角色名稱'); return; }
    if (createPointsLeft() > 0) { showToast('能力點數還沒分配完'); return; }
    deleteSave();
    createPlayer(name, createState.cls, createState.stats);
    saveGame();
    addLog(`歡迎來到說話之島，${name}！先去「地圖」傳送到說話之島狩獵吧。Lv.15 起可以在「📜 任務」接職業任務。`, 'sys');
    enterGame();
    gameAlert('序章', `四大龍甦醒，亞丁大陸陷入恐懼。\n\n${CLASS_STORIES[createState.cls].story}\n\n小提示：掛機會自動戰鬥、喝水、施法，記得帶足紅水與回家卷軸。Lv.15 起到「📜 任務」接職業任務。`);
}
