// 屠龍勇者：主畫面外框（ARCHITECTURE.md 第 15 節）（依賴 ui、ui-panels、combat、player）
// images/frame.jpg 以九宮格（CSS border-image）鋪滿整個畫面：上方拱門、下方法球與欄杆維持比例，左右柱子隨高度延伸。
// 所有位置都用「原圖座標 × --s」換算（原圖 1342×2000，--s = 外框寬度 ÷ 1342），由 layoutFrame() 設定。
//   左柱：抽屜（人物狀態、技能、任務）　右柱：抽屜（地圖、設定）
//   紅球：HP（點一下喝治癒藥水）　藍球：MP（點一下喝藍色藥水）
//   底部 6 格：背包、村莊、治癒藥水、加速藥水、回家卷軸、瞬間移動卷軸
const FRAME_W = 1342, FRAME_H = 2000;
const FRAME_MAX_W = 560;          // 電腦上的最大寬度
const FRAME_MIN_RATIO = 0.62;     // 寬度不超過高度 × 0.62，避免矮螢幕上內容區太小

const DRAWERS = {
    left:  [['char', '🧝', '人物狀態'], ['skill', '✨', '技能'], ['quest', '📜', '任務']],
    right: [['map', '🗺️', '地圖'], ['set', '⚙️', '設定']],
};

const SLOT_DEFS = [
    { icon: '🎒', name: '背包',         tab: 'bag' },
    { icon: '🏘️', name: '村莊',         tab: 'town' },
    { icon: '🧪', name: '治癒藥水',     count: () => healPotionCount(), use: quickHeal },
    { icon: '💨', name: '自我加速藥水', count: () => countItem('greenPotion'), use: () => quickPotion('greenPotion') },
    { icon: '📜', name: '回家卷軸',     count: () => countItem('homeScroll'), use: () => homeScrollBtn() },
    { icon: '🌀', name: '瞬間移動卷軸', count: () => countItem('teleScroll'), use: quickTele },
];
const SLOT_X = [410, 500, 590, 680, 770, 858];   // 原圖中 6 個格子的左邊 x

// ───────── PC 橫式外框（images/frame-pc.jpg＋frame-pc-mask.png，原圖 2000×1116）─────────
// 底部一排：左 2 圓鈕、12 方格、右 2 圓鈕（x、y、w、h 是原圖座標）
const PC_W = 2000, PC_H = 1116;
const PC_SQ = k => ({ x: 590 + k * 70, y: 936, w: 62, h: 60 });
const PC_SLOTS = [
    { icon: '🧝', name: '人物狀態', tab: 'char',  x: 347, y: 933, w: 66, h: 66, round: true },
    { icon: '✨', name: '技能',     tab: 'skill', x: 447, y: 933, w: 66, h: 66, round: true },
    { icon: '📜', name: '任務',     tab: 'quest', ...PC_SQ(0) },
    { icon: '🎒', name: '背包',     tab: 'bag',   ...PC_SQ(1) },
    { icon: '🏘️', name: '村莊',     tab: 'town',  ...PC_SQ(2) },
    { icon: '🧪', name: '治癒藥水', count: () => healPotionCount(), use: quickHeal, ...PC_SQ(3) },
    { icon: '💨', name: '自我加速藥水', count: () => countItem('greenPotion'), use: () => quickPotion('greenPotion'), ...PC_SQ(4) },
    { icon: '⚡', name: '勇敢藥水類', count: () => { const id = braveItemFor(player.cls); return id ? countItem(id) : 0; }, use: () => { const id = braveItemFor(player.cls); if (id) quickPotion(id); }, ...PC_SQ(5) },
    { icon: '💧', name: '藍色藥水', count: () => countItem('bluePotion'), use: () => quickPotion('bluePotion'), ...PC_SQ(6) },
    { icon: '📜', name: '回家卷軸', count: () => countItem('homeScroll'), use: () => homeScrollBtn(), ...PC_SQ(7) },
    { icon: '🌀', name: '瞬間移動卷軸', count: () => countItem('teleScroll'), use: quickTele, ...PC_SQ(8) },
    { icon: '🚶', name: '步行回村', use: () => { if (currentZone()) startWalkHome(); else showToast('你已經在村莊裡'); }, ...PC_SQ(9) },
    { icon: '💾', name: '手動存檔', use: () => manualSave(), ...PC_SQ(10) },
    { icon: '🗺️', name: '地圖', tab: 'map', x: 1487, y: 933, w: 66, h: 66, round: true },
    { icon: '⚙️', name: '設定', tab: 'set', x: 1583, y: 933, w: 66, h: 66, round: true },
];
function isPcFrame() { return displayMode === 'pc'; }
function currentSlotDefs() { return isPcFrame() ? PC_SLOTS : SLOT_DEFS; }
// 底部中間骷髏頭＝開始／停止掛機（原本的「▶ 開始掛機」按鈕搬到這裡）；眼睛黑＝沒在掛機、發紅光＝掛機中
function skullHuntClick() {
    if (!player) return;
    if (!currentZone()) { showToast('先從地圖前往狩獵地點'); return; }
    if (player.hunting) { stopHunt('⏸ 停止掛機'); showToast('⏸ 停止掛機'); }
    else { startHunt(); if (player.hunting) showToast('▶ 開始掛機'); }
    renderStatus();
    if (huntVisible()) updateHuntLive();
}
function renderSkull() {
    const b = $('skull-hunt');
    if (!b || !player) return;
    const on = !!player.hunting;
    if (b.classList.contains('on') === on && b.dataset.init) return;
    b.dataset.init = '1';
    b.classList.toggle('on', on);
    const label = on ? '掛機中（點骷髏頭停止）' : '開始掛機（點骷髏頭）';
    b.title = label;
    b.setAttribute('aria-label', label);
}

// ───────── 畫面尺寸（設定 →「🖥️ 畫面尺寸」；存在這台裝置，不進角色存檔）─────────
//   auto  自動尺寸：外框寬 = min(螢幕寬, 560, 螢幕高 × 0.62)，高度滿版
//   phone 手機 9:16：遊戲區固定 9:16，置中、四周黑邊
//   pc    PC 16:9：改用橫式外框（frame-pc），中間大地圖一直顯示狩獵，其他分頁疊在地圖右側的視窗
//   full  全螢幕：進入瀏覽器全螢幕，外框寬度不設 560 上限
const DISPLAY_KEY = 'dragonSlayer_display';
const DISPLAY_MODES = { auto: '自動尺寸', phone: '手機 9:16', pc: 'PC 16:9', full: '全螢幕' };
const DISPLAY_MODE_ICONS = { auto: '🔄', phone: '📱', pc: '🖥️', full: '⛶' };
let displayMode = 'auto';
try { displayMode = localStorage.getItem(DISPLAY_KEY) || 'auto'; } catch (e) {}
if (!DISPLAY_MODES[displayMode]) displayMode = 'auto';

function isSideLayout() { return displayMode === 'pc'; }

function layoutFrame() {
    const f = $('frame'), stage = $('stage'), side = $('side');
    if (!f) return;
    const W = window.innerWidth, H = window.innerHeight;
    let sw, sh, fw;
    if (displayMode === 'phone') {
        sh = Math.min(H, W * 16 / 9); sw = sh * 9 / 16; fw = sw;
    } else if (displayMode === 'pc') {
        sh = Math.min(H, W * PC_H / PC_W); sw = sh * PC_W / PC_H; fw = sw;
    } else {
        sh = H;
        fw = Math.min(W, displayMode === 'full' ? W : FRAME_MAX_W, Math.floor(H * FRAME_MIN_RATIO));
        sw = fw;
    }
    sw = Math.floor(sw); sh = Math.floor(sh); fw = Math.floor(fw);
    stage.style.width = sw + 'px';
    stage.style.height = sh + 'px';
    f.style.width = fw + 'px';
    f.style.height = sh + 'px';
    f.style.setProperty('--s', (fw / (isPcFrame() ? PC_W : FRAME_W)).toFixed(5));
    f.classList.toggle('pc', isPcFrame());
    side.classList.add('hidden');
}
window.addEventListener('resize', layoutFrame);
document.addEventListener('fullscreenchange', layoutFrame);
document.addEventListener('webkitfullscreenchange', layoutFrame);

function setDisplayMode(mode) {
    if (!DISPLAY_MODES[mode]) return;
    const wasSide = isSideLayout();
    displayMode = mode;
    try { localStorage.setItem(DISPLAY_KEY, mode); } catch (e) {}
    if (mode === 'full') enterFullscreen(); else exitFullscreen();
    // 從 PC 版面切回單欄時，回到狩獵畫面
    if (wasSide && !isSideLayout()) currentTab = 'hunt';
    layoutFrame();
    renderTabs();
    refreshUI();
    showToast(`畫面尺寸：${DISPLAY_MODES[mode]}`);
    if (mode === 'pc' && window.innerWidth < window.innerHeight) showToast('PC 16:9 適合電腦或橫放的手機，直拿手機建議用「自動尺寸」', 3500);
}

function enterFullscreen() {
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!fn) { showToast('這個瀏覽器不支援全螢幕，可改用「📲 安裝到主畫面」', 3000); return; }
    try {
        const p = fn.call(el);
        if (p && p.catch) p.catch(() => showToast('無法進入全螢幕'));
    } catch (e) { showToast('無法進入全螢幕'); }
}

function exitFullscreen() {
    if (!(document.fullscreenElement || document.webkitFullscreenElement)) return;
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    try { const p = fn.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}

// ───────── 左右柱子抽屜 ─────────
function toggleDrawer(side) {
    const el = $('drawer-' + side), open = !el.classList.contains('open');
    closeDrawers();
    if (open) { el.classList.add('open'); $('pillar-' + side).classList.add('open'); }
}
function closeDrawers() {
    ['left', 'right'].forEach(s => { $('drawer-' + s).classList.remove('open'); $('pillar-' + s).classList.remove('open'); });
}

function renderFrameNav() {
    for (const side in DRAWERS) {
        $('drawer-' + side).innerHTML = DRAWERS[side].map(([tab, icon, name]) =>
            `<button class="${currentTab === tab ? 'active' : ''}" onclick="switchTab('${tab}')"><span>${icon}</span>${name}</button>`).join('');
    }
    renderSlots(true);
}

// ───────── 底部格子 ─────────
let slotSig = '';
function renderSlots(force) {
    const box = $('slots');
    if (!box || !player) return;
    const defs = currentSlotDefs(), pc = isPcFrame();
    const counts = defs.map(d => d.count ? d.count() : '');
    const sig = [pc, currentTab, player.hunting, counts.join(',')].join('|');
    if (!force && sig === slotSig) return;
    slotSig = sig;
    box.innerHTML = defs.map((d, i) => {
        const n = counts[i];
        const empty = d.count && n <= 0;
        const icon = typeof d.icon === 'function' ? d.icon() : d.icon;
        const pos = pc
            ? `left:calc(var(--s) * ${d.x}px);top:calc(var(--s) * ${d.y}px);width:calc(var(--s) * ${d.w}px);height:calc(var(--s) * ${d.h}px)`
            : `left:calc(var(--s) * ${SLOT_X[i] - SLOT_X[0]}px)`;
        return `<button class="slot ${d.round ? 'round' : ''} ${d.tab === currentTab ? 'active' : ''} ${empty ? 'empty' : ''}" style="${pos}"
            onclick="slotClick(${i})" title="${d.name}" aria-label="${d.name}">${icon}${d.count ? `<b>${n > 999 ? '999+' : n}</b>` : ''}</button>`;
    }).join('');
}

function slotClick(i) {
    const d = currentSlotDefs()[i];
    if (d.tab) { switchTab(currentTab === d.tab ? 'hunt' : d.tab); return; }
    d.use();
    renderSlots(true);
    renderStatus();
    if (huntVisible()) updateHuntLive();
}

// ───────── 快捷使用 ─────────
function quickHeal() {
    const st = calcStats();
    if (player.hp >= st.maxHp) { showToast('HP 已經是滿的'); return; }
    const id = choosePotion(st);
    if (!id) { showToast('沒有治癒藥水'); return; }
    usePotion(id);
}

function quickPotion(id) {
    const err = usePotion(id);
    if (err) showToast(err === '沒有這個道具' ? `沒有${ITEMS[id].name}` : err);
}

function quickTele() {
    const z = currentZone();
    if (!z) { showToast('在村莊裡不需要瞬移'); return; }
    if (!consumeItem('teleScroll')) { showToast('沒有瞬間移動卷軸'); return; }
    if (z.type === 'dragon') { addLog('📜 使用瞬間移動卷軸逃離巢穴', 'sys'); moveToTown(z.town); return; }
    addLog('📜 使用瞬間移動卷軸脫離戰鬥', 'sys');
    if (hunt) { hunt.mon = null; hunt.state = 'search'; hunt.timer = 1500; }
}

function orbHpClick() { quickHeal(); renderStatus(); }
function orbMpClick() { quickPotion('bluePotion'); renderStatus(); }
