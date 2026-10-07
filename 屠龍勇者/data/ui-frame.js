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

// ───────── 畫面尺寸（設定 →「🖥️ 畫面尺寸」；存在這台裝置，不進角色存檔）─────────
//   auto  自動尺寸：外框寬 = min(螢幕寬, 560, 螢幕高 × 0.62)，高度滿版
//   phone 手機 9:16：遊戲區固定 9:16，置中、四周黑邊
//   pc    PC 16:9：遊戲區固定 16:9；左邊外框（9:16）一直顯示狩獵，右邊側欄顯示其他分頁
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
        sh = Math.min(H, W * 9 / 16); sw = sh * 16 / 9; fw = sh * 9 / 16;
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
    f.style.setProperty('--s', (fw / FRAME_W).toFixed(5));
    side.classList.toggle('hidden', !isSideLayout());
    side.style.width = (sw - fw) + 'px';
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
    const counts = SLOT_DEFS.map(d => d.count ? d.count() : '');
    const sig = currentTab + '|' + counts.join(',');
    if (!force && sig === slotSig) return;
    slotSig = sig;
    box.innerHTML = SLOT_DEFS.map((d, i) => {
        const n = counts[i];
        const empty = d.count && n <= 0;
        return `<button class="slot ${d.tab === currentTab ? 'active' : ''} ${empty ? 'empty' : ''}" style="left:calc(var(--s) * ${SLOT_X[i] - SLOT_X[0]}px)"
            onclick="slotClick(${i})" title="${d.name}" aria-label="${d.name}">${d.icon}${d.count ? `<b>${n > 999 ? '999+' : n}</b>` : ''}</button>`;
    }).join('');
}

function slotClick(i) {
    const d = SLOT_DEFS[i];
    if (d.tab) { switchTab(currentTab === d.tab && !isSideLayout() ? 'hunt' : d.tab); return; }
    d.use();
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
