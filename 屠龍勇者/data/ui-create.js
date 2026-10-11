// 屠龍勇者：標題畫面、人物選單（多角色欄位）、創角（依賴 ui、classes、player、save）
let createState = null;
let createSlot = 0;   // 新角色要放進哪個欄位
let selSlot = 0;      // 人物選單目前選中的欄位

function showTitle() {
    $('version').textContent = 'v' + GAME_VERSION;
    const any = hasSave();
    if (any && !slotHasSave(currentSlot)) setCurrentSlot(nextFilledSlot());
    const sum = any ? readSlotSummary(currentSlot) : null;
    $('btn-continue').classList.toggle('hidden', !any);
    $('btn-continue').innerHTML = '📜 繼續冒險' + (sum && !sum.broken ? `<br><small>${esc(sum.name)}・${CLASSES[sum.cls].name} Lv.${sum.lv}</small>` : '');
    $('btn-select').classList.toggle('hidden', !any);
    $('btn-new').classList.toggle('hidden', any);
    renderCloudEntry();
    showScreen('title');
}

function nextFilledSlot() {
    for (let i = 0; i < MAX_SLOTS; i++) if (slotHasSave(i)) return i;
    return 0;
}

// ───────── 人物選單（ARCHITECTURE.md 第 25 節）─────────
// 遊戲中開啟會先存檔、離開目前角色；其他角色若在掛機，下次進入時照常結算離線收益
function openCharSelect() {
    if (player) {
        saveGame();
        cloudFlush(true);
        hunt = null; session = null; walkHome = null;
        player = null;
    }
    selSlot = slotHasSave(currentSlot) ? currentSlot : nextFilledSlot();
    renderCharSelect();
    showScreen('select');
}

function agoText(t) {
    const m = Math.floor((Date.now() - t) / 60000);
    if (!t || m < 1) return '剛剛';
    if (m < 60) return `${m} 分鐘前`;
    if (m < 1440) return `${Math.floor(m / 60)} 小時前`;
    return `${Math.floor(m / 1440)} 天前`;
}

function charCardHtml(i, s) {
    if (!s) return `<button class="char-card empty" onclick="openCreate(${i})"><span class="char-plus">＋</span>建立新角色<small>欄位 ${i + 1}</small></button>`;
    if (s.broken) return `<button class="char-card broken ${i === selSlot ? 'sel' : ''}" onclick="pickSlot(${i})"><span class="char-plus">⚠️</span>存檔損毀<small>欄位 ${i + 1}</small></button>`;
    const c = CLASSES[s.cls];
    const next = s.lv >= MAX_LEVEL ? 'MAX' : fmt(expToNext(s.lv) - s.exp);
    const pct = (a, b) => b > 0 ? clamp(a / b * 100, 0, 100) : 0;
    const face = c.art
        ? `<img src="${c.art}?v=${GAME_VERSION}" alt="${c.name}" loading="lazy">`
        : `<span class="char-emoji">${c.icon}</span>`;
    return `<button class="char-card ${i === selSlot ? 'sel' : ''}" onclick="pickSlot(${i})" ondblclick="playSlot(${i})">
        <div class="char-face">${face}</div>
        <div class="char-top">
            <div class="char-name">${esc(s.name)}</div>
            <div class="char-cls">${c.name}</div>
            <div class="char-row"><i>Lv</i><b>${s.lv}</b></div>
            <div class="char-row"><i>Next</i><b>${next}</b></div>
        </div>
        <div class="char-bottom">
            <div class="char-bar hp"><div style="width:${pct(s.hp, s.maxHp)}%"></div><i>HP</i><b>${fmt(Math.max(0, s.hp))}/${fmt(s.maxHp)}</b></div>
            <div class="char-bar mp"><div style="width:${pct(s.mp, s.maxMp)}%"></div><i>MP</i><b>${fmt(Math.max(0, s.mp))}/${fmt(s.maxMp)}</b></div>
            <div class="char-loc">${s.hunting ? '⚔️' : '📍'} ${s.loc}</div>
            <div class="char-loc muted">💰 ${fmt(s.gold)}・${agoText(s.t)}</div>
        </div>
    </button>`;
}

function renderCharSelect() {
    const sums = [];
    for (let i = 0; i < MAX_SLOTS; i++) sums.push(readSlotSummary(i));
    const used = sums.filter(Boolean).length;
    $('select-count').textContent = `${used} / ${MAX_SLOTS}`;
    // 已有角色全部列出，空欄位只顯示第一個（＋建立新角色）
    const empty = sums.indexOf(null);
    $('char-grid').innerHTML = sums.map((s, i) => s || i === empty ? charCardHtml(i, s) : '').join('');
    const s = sums[selSlot];
    $('btn-play').disabled = !s || !!s.broken;
    $('btn-delchar').disabled = !s;
    $('select-hint').textContent = s && !s.broken ? `選中：${s.name}（${CLASSES[s.cls].name} Lv.${s.lv}）` : '點選角色卡片，或點空欄位建立新角色';
}

function pickSlot(i) { selSlot = i; renderCharSelect(); }

function playSlot(i) {
    if (!slotHasSave(i)) return;
    setCurrentSlot(i);
    continueGame();
}

function playSelected() { playSlot(selSlot); }

function deleteSelectedChar() {
    const s = readSlotSummary(selSlot);
    if (!s) return;
    const who = s.broken ? `欄位 ${selSlot + 1} 的損毀存檔` : `「${s.name}」（${CLASSES[s.cls].name} Lv.${s.lv}）`;
    gameConfirm('刪除角色', `${who}與所有道具會永久刪除，無法復原！確定刪除？`, () => {
        deleteSave(selSlot);
        if (!hasSave()) { showTitle(); return; }
        selSlot = nextFilledSlot();
        renderCharSelect();
        showToast('已刪除角色');
    }, '永久刪除');
}

function openCreate(slot) {
    const i = slot != null ? slot : (slotHasSave(0) ? firstEmptySlot() : 0);
    if (i < 0) { showToast(`角色欄位已滿（${MAX_SLOTS} 個），請先刪除一個角色`); return; }
    createSlot = i;
    createState = null;
    stageCls = null;
    $('create-name').value = '';
    renderCreate();
    showScreen('create');
}

function createBack() {
    if (hasSave()) openCharSelect();
    else showTitle();
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

// 創角舞台（ARCHITECTURE.md 第 18 節）：十二職業合照 all.jpg 上，選中的職業用去背圖 stage/職業.webp 疊在原位置「走出來」，其他人變暗
// 數值是角色在原圖（2000×1493）的範圍 [左, 上, 右, 下]；陣列順序＝由後往前（後面的蓋在前面，點擊優先）
const CLASS_STAGE = {
    demon: [644, 149, 1220, 707], warrior: [1326, 247, 1681, 770], shura: [1128, 345, 1336, 765], angel: [175, 172, 683, 762],
    paladin: [615, 353, 824, 791], elf: [38, 466, 355, 1158], gunner: [675, 642, 973, 1241], magicfighter: [1027, 669, 1331, 1178],
    darkelf: [1693, 607, 1970, 1216], royal: [1460, 560, 1758, 1242], knight: [329, 638, 726, 1317], mage: [1231, 915, 1651, 1360],
};
const STAGE_W = 2000, STAGE_H = 1493;
// 立繪（images/classes/職業.jpg，960×536）去背的全身像 images/classes/hero/職業.webp 在立繪中的範圍 [左, 上, 右, 下]（tools/stage/artcut.py 印出）
const CLASS_FRONT = {
    royal: [273, 18, 721, 535], knight: [188, 17, 772, 535], mage: [204, 18, 787, 535], elf: [287, 43, 712, 535],
    darkelf: [267, 49, 700, 482], shura: [395, 21, 617, 459], warrior: [320, 1, 737, 536], gunner: [208, 35, 768, 535],
    magicfighter: [330, 67, 621, 523], paladin: [235, 0, 739, 532], angel: [149, 0, 844, 437], demon: [86, 2, 913, 481],
};
const ART_W = 960, ART_H = 536, FRONT_H = 0.8;   // 整張立繪高度＝舞台高的 80%
let stageCls = null;

function stagePos(b, shrink = 0) {
    const w = b[2] - b[0], h = b[3] - b[1];
    return `left:${(b[0] + w * shrink) / STAGE_W * 100}%;top:${(b[1] + h * shrink) / STAGE_H * 100}%;width:${w * (1 - 2 * shrink) / STAGE_W * 100}%;height:${h * (1 - 2 * shrink) / STAGE_H * 100}%`;
}

// 舞台左右箭頭：照 CLASSES 順序切換職業
function stageStep(d) {
    const ids = Object.keys(CLASSES), i = ids.indexOf(createState.cls);
    selectClass(ids[(i + d + ids.length) % ids.length]);
}

function renderStage() {
    const el = $('class-stage');
    if (!el) return;
    const cls = createState.cls, c = CLASSES[cls], b = CLASS_STAGE[cls], f = CLASS_FRONT[cls];
    if (!el.dataset.ready) {
        el.dataset.ready = '1';
        el.innerHTML = `<img class="stage-bg" src="images/classes/all.jpg?v=2" alt="十二職業">
            <img class="stage-pick" id="stage-pick" alt="">
            <div class="stage-glow" id="stage-glow"></div>
            <img class="stage-front" id="stage-front" alt="">
            ${Object.keys(CLASS_STAGE).map(id => `<button class="stage-hit" style="${stagePos(CLASS_STAGE[id], 0.12)}" onclick="selectClass('${id}')" aria-label="${CLASSES[id].name}"></button>`).join('')}
            <button class="stage-arrow l" onclick="stageStep(-1)" aria-label="上一個職業">‹</button>
            <button class="stage-arrow r" onclick="stageStep(1)" aria-label="下一個職業">›</button>
            <div class="stage-title"><small>選擇英雄職業・點人物或左右切換</small><b id="stage-name"></b><span id="stage-desc"></span></div>`;
        for (const id in CLASS_FRONT) new Image().src = `images/classes/hero/${id}.webp?v=1`;   // 預先載入，切換時不會閃
    }
    if (stageCls === cls) return;
    stageCls = cls;
    $('stage-name').textContent = c.name;
    $('stage-desc').textContent = c.desc.split('。')[0] + '。';
    const pick = $('stage-pick'), front = $('stage-front'), glow = $('stage-glow');
    // ① 合照上原位置的人亮起來
    pick.style.cssText = b ? stagePos(b) : 'display:none';
    if (b) pick.src = `images/classes/stage/${cls}.webp?v=1`;
    if (!f) { front.style.display = glow.style.display = 'none'; return; }
    // ② 立繪去背的全身像走到舞台前方：把整張立繪（960×536）想成高 FRONT_H 的框，腳底貼舞台底部，水平中心跟著合照位置（限制在 28%～72%）
    const k = FRONT_H * STAGE_H / ART_H;                 // 立繪 1px ＝ 原圖幾 px
    const g = b ? (b[0] + b[2]) / 2 : STAGE_W / 2;
    const cx = Math.max(STAGE_W * 0.28, Math.min(STAGE_W * 0.72, g));
    const L = cx + (f[0] - ART_W / 2) * k, T = STAGE_H - (ART_H - f[1]) * k, W = (f[2] - f[0]) * k, H = (f[3] - f[1]) * k;
    front.style.cssText = `left:${L / STAGE_W * 100}%;top:${T / STAGE_H * 100}%;width:${W / STAGE_W * 100}%;height:${H / STAGE_H * 100}%`;
    front.src = `images/classes/hero/${cls}.webp?v=1`;
    const gw = Math.min(W, 260 * k * 2);
    glow.style.cssText = `left:${(cx - gw / 2) / STAGE_W * 100}%;top:${(STAGE_H - 70) / STAGE_H * 100}%;width:${gw / STAGE_W * 100}%;height:${110 / STAGE_H * 100}%`;
    // 走出來：從合照上的位置（腳底、身高）放大移到前方
    const r = el.getBoundingClientRect(), px = r.width / STAGE_W;
    const fx = L + W / 2, fy = T + H;                     // 前方全身像的腳底中心
    const sx = b ? (b[0] + b[2]) / 2 : fx, sy = b ? b[3] : fy, s0 = b ? Math.min(1, (b[3] - b[1]) / (ART_H * k)) : 0.6;
    for (const x of [pick, glow]) { x.classList.remove('step'); void x.offsetWidth; x.classList.add('step'); }
    if (front.animate) front.animate([
        { transform: `translate(${(sx - fx) * px}px, ${(sy - fy) * px}px) scale(${s0})`, opacity: 0.15, filter: 'brightness(.5)' },
        { opacity: 1, offset: 0.35 },
        { transform: 'none', opacity: 1, filter: 'brightness(1)' },
    ], { duration: 750, easing: 'cubic-bezier(.25,.75,.3,1)' });
}

function renderCreate() {
    if (!createState) createState = { cls: 'knight', stats: { ...CLASSES.knight.base }, name: '' };
    if ($('create-name').value) createState.name = $('create-name').value;   // 重繪前保留已輸入的名字
    const c = CLASSES[createState.cls], left = createPointsLeft();
    renderStage();
    $('create-desc').innerHTML =   // 立繪已移到上方舞台（全身像走出來），這裡只留介紹
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
    if (slotHasSave(createSlot)) { showToast('這個欄位已經有角色，請選空欄位'); return; }
    setCurrentSlot(createSlot);
    resetSessionState();
    createPlayer(name, createState.cls, createState.stats);
    saveGame();
    addLog(`歡迎來到低語海岸，${name}！先去「地圖」傳送到低語海岸狩獵吧。Lv.15 起可以在「📜 任務」接職業任務。`, 'sys');
    enterGame();
    gameAlert('序章', `四大龍甦醒，黑暗大陸陷入恐懼。\n\n${CLASS_STORIES[createState.cls].story}\n\n小提示：掛機會自動戰鬥、喝水、施法，記得帶足紅水與回家卷軸。Lv.15 起到「📜 任務」接職業任務。`);
}
