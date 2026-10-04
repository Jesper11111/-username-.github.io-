// 設定視窗（洞府右上 ⚙️）：顯示尺寸與全螢幕（ARCHITECTURE.md 第 34 節）
// 顯示尺寸是「這台裝置」的偏好，存在 localStorage 的 DISPLAY_MODE_KEY，不寫進遊戲存檔（換裝置、匯入存檔都不受影響）。
// 版面實際計算在 home-ui.js 的 layoutStage()。

const DISPLAY_MODE_KEY = 'xiuxian_display_mode';
const DISPLAY_MODES = [
    { id: 'phone', label: '📱 手機 9:16', desc: '直式滿版，適合手機' },
    { id: 'pc',    label: '🖥️ PC 16:9',  desc: '左邊洞府、右邊大面板，適合電腦' },
    { id: 'auto',  label: '自動尺寸',     desc: '依視窗比例自動切換（寬螢幕用 PC 版）' }
];
// 自動尺寸：視窗寬 ≥ 900px 且寬高比 ≥ 1.2 才用 PC 版
const AUTO_PC_MIN_WIDTH = 900;
const AUTO_PC_MIN_RATIO = 1.2;

function getDisplayMode() {
    let mode = null;
    try { mode = localStorage.getItem(DISPLAY_MODE_KEY); } catch (e) {}
    return DISPLAY_MODES.some(m => m.id === mode) ? mode : 'auto';
}

// 回傳實際使用的版面：'phone' 或 'pc'
function resolveDisplayLayout(vw, vh) {
    let mode = getDisplayMode();
    if (mode !== 'auto') return mode;
    return (vw >= AUTO_PC_MIN_WIDTH && vw / vh >= AUTO_PC_MIN_RATIO) ? 'pc' : 'phone';
}

// 字級（2026-09-28，第 45 節）：改 :root 的 --ui-scale，放大分頁面板與彈窗；洞府 HUD 不受影響
const FONT_SCALE_KEY = 'xiuxian_font_scale';
const FONT_SCALES = [
    { id: 's', label: '小', scale: 0.875, px: 14 },
    { id: 'm', label: '中', scale: 1,     px: 16 },
    { id: 'l', label: '大', scale: 1.125, px: 18 }
];

function getFontScaleId() {
    let id = null;
    try { id = localStorage.getItem(FONT_SCALE_KEY); } catch (e) {}
    return FONT_SCALES.some(f => f.id === id) ? id : 'm';
}

function applyFontScale() {
    let f = FONT_SCALES.find(x => x.id === getFontScaleId());
    document.documentElement.style.setProperty('--ui-scale', f.scale);
}

function setFontScale(id) {
    try { localStorage.setItem(FONT_SCALE_KEY, id); } catch (e) {}
    applyFontScale();
    renderSettingsModal();
}

function setDisplayMode(mode) {
    try { localStorage.setItem(DISPLAY_MODE_KEY, mode); } catch (e) {}
    layoutStage();
    renderSettingsModal();
}

function openSettingsModal() {
    document.getElementById('settings-modal').style.display = 'flex';
    renderSettingsModal();
}

function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function renderSettingsModal() {
    const box = document.getElementById('settings-display-modes');
    if (!box) return;
    let mode = getDisplayMode();
    let current = resolveDisplayLayout(window.innerWidth, window.innerHeight) === 'pc' ? 'PC 16:9' : '手機 9:16';
    box.innerHTML = DISPLAY_MODES.map(m => `
        <button class="settings-option${m.id === mode ? ' active' : ''}" onclick="setDisplayMode('${m.id}')">
            <b>${m.label}</b><small>${m.desc}${m.id === 'auto' && mode === 'auto' ? `（目前：${current}）` : ''}</small>
        </button>`).join('')
        + `<button class="settings-option${isFullscreen() ? ' active' : ''}" onclick="toggleFullscreen()">
            <b>⛶ 全螢幕</b><small>${isFullscreen() ? '已開啟，再按一次（或按 Esc）離開' : '隱藏瀏覽器網址列與工具列'}</small>
        </button>`;

    const fontBox = document.getElementById('settings-font-scales');
    if (fontBox) {
        let fid = getFontScaleId();
        fontBox.innerHTML = FONT_SCALES.map(f => `
            <button class="settings-option${f.id === fid ? ' active' : ''}" onclick="setFontScale('${f.id}')">
                <b>${f.label}</b><small>${f.px}px</small>
            </button>`).join('');
    }
}

function toggleFullscreen() {
    const el = document.documentElement;
    if (isFullscreen()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
    }
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!request) {
        gameAlert('此瀏覽器不支援全螢幕。\niPhone 可用 Safari 的「分享 → 加入主畫面」，從主畫面開啟即為全螢幕。');
        return;
    }
    let result = request.call(el);
    if (result && result.catch) result.catch(() => gameAlert('瀏覽器拒絕進入全螢幕，請再試一次。'));
}

// 進出全螢幕（含按 Esc）時更新按鈕狀態；版面由 resize 事件自動重算
document.addEventListener('fullscreenchange', renderSettingsModal);
document.addEventListener('webkitfullscreenchange', renderSettingsModal);
