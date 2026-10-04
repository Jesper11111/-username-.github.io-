// ==================== 背景音樂（2026-10-04 使用者提供 videoplayback.mp4：「能加入當背景音樂嗎」）====================
// 取影片音軌 → audio/bgm-main.m4a（AAC 96kbps、約 1.2MB）＋ audio/bgm-main.ogg（Opus 64kbps，備用）；約 97 秒、頭尾淡入淡出，循環播放。
// 只在「三界之戰」與「靈界地圖」播放（2026-10-04 使用者：「是要設定特殊地圖才要的」→ 三界之戰（世界 Boss）、靈界地圖）：
//   三界之戰海報（activity.js 的 #activity-poster-modal，活動 id 在 BGM_ZONE.activities）、世界 Boss 視窗與戰鬥畫面（BGM_ZONE.ids）、
//   靈界大地圖（town.js 的城內場景 LINGJIE_SCENE_KEY，BGM_ZONE.scenes）顯示時播放，離開就暫停。
// 瀏覽器規定有聲音的媒體要使用者先點過畫面才能播（點開三界之戰本身就算）。
// 開關與音量是「這台裝置」的偏好（localStorage 的 BGM_PREF_KEY），不寫進存檔；設定視窗「🎵 背景音樂」調整。
// 切到背景（分頁隱藏、App 切走）暫停、回來繼續；有聲影片播放時（仙翁開場動畫、夥伴影片）暫停，影片停了再繼續。

const BGM_SRC = "audio/bgm-main.m4a";
const BGM_SRC_FALLBACK = "audio/bgm-main.ogg";   // Opus：不支援 AAC 的瀏覽器（例：部分 Linux 版瀏覽器）自動改用
const BGM_PREF_KEY = "xiuxian_bgm";
// 2026-10-04 使用者追加：「三界之戰、靈界地圖」→ scenes＝town.js 的城內場景名稱（靈界大地圖 LINGJIE_SCENE_KEY）
const BGM_ZONE = { activities: ["demon"], ids: ["world-boss-modal", "world-boss-scene"], scenes: () => [LINGJIE_SCENE_KEY] };
const BGM_DEFAULT_VOL = 0.4;
let bgmAudio = null;

function getBgmPref() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(BGM_PREF_KEY) || 'null'); } catch (e) {}
    const vol = o && typeof o.vol === 'number' ? Math.min(1, Math.max(0, o.vol)) : BGM_DEFAULT_VOL;
    return { on: !(o && o.on === false), vol };
}
function saveBgmPref(p) { try { localStorage.setItem(BGM_PREF_KEY, JSON.stringify(p)); } catch (e) {} }

// 目前畫面是不是三界之戰（要放音樂的地方）
function isBgmZone() {
    const shown = id => { const e = document.getElementById(id); return !!(e && getComputedStyle(e).display !== 'none'); };
    const poster = document.getElementById('activity-poster-modal');
    if (typeof currentTownScene !== 'undefined' && currentTownScene && BGM_ZONE.scenes().includes(currentTownScene) && shown('town-scene')) return true;
    return (shown('activity-poster-modal') && BGM_ZONE.activities.includes(poster.dataset.act)) || BGM_ZONE.ids.some(shown);
}
// 有聲影片正在播（這時不放背景音樂）
function isSoundVideoPlaying() {
    return [...document.querySelectorAll('video')].some(v => !v.paused && !v.ended && !v.muted && v.volume > 0);
}
function playBgm() {
    const p = getBgmPref();
    if (!p.on || p.vol <= 0 || document.hidden || isSoundVideoPlaying() || !isBgmZone()) return;
    if (!bgmAudio) {
        // 先看瀏覽器能不能播 AAC，不能就直接用 Opus；載入失敗時也換一次
        const aac = new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"');
        bgmAudio = new Audio(aac ? BGM_SRC : BGM_SRC_FALLBACK);
        bgmAudio.loop = true;
        bgmAudio.preload = 'auto';
        bgmAudio.addEventListener('error', () => {
            if (bgmAudio.src.endsWith(BGM_SRC_FALLBACK)) return;
            bgmAudio.src = BGM_SRC_FALLBACK;
            playBgm();
        });
    }
    bgmAudio.volume = p.vol;
    if (!bgmAudio.paused) return;
    const r = bgmAudio.play();
    if (r && r.catch) r.catch(() => {});   // 還沒互動過或載入失敗：等下次點擊再試
}
function pauseBgm() { if (bgmAudio && !bgmAudio.paused) bgmAudio.pause(); }

// 設定視窗
function toggleBgm() {
    const p = getBgmPref();
    p.on = !p.on;
    saveBgmPref(p);
    if (p.on) playBgm(); else pauseBgm();
    renderBgmSettings();
}
function setBgmVolume(v) {
    const p = getBgmPref();
    p.vol = Math.min(1, Math.max(0, Number(v) / 100 || 0));
    saveBgmPref(p);
    if (bgmAudio) bgmAudio.volume = p.vol;
    if (p.vol <= 0) pauseBgm(); else playBgm();
    renderBgmSettings();
}
function renderBgmSettings() {
    const p = getBgmPref(), btn = document.getElementById('bgm-toggle-btn'), vol = document.getElementById('bgm-volume'), lab = document.getElementById('bgm-volume-label');
    if (btn) btn.textContent = p.on ? '🎵 背景音樂：開' : '🔇 背景音樂：關';
    if (vol) { vol.value = Math.round(p.vol * 100); vol.disabled = !p.on; }
    if (lab) lab.textContent = Math.round(p.vol * 100) + '%';
}

// 啟動：只綁事件（第一次互動才真的載入音樂）
function initBgm() {
    const kick = () => { if (!bgmAudio || bgmAudio.paused) setTimeout(playBgm, 0); };   // 點擊的那一下可能正好打開三界之戰
    // 進出三界之戰：每秒檢查一次，在就播、離開就停
    setInterval(() => { if (isBgmZone()) { if (!bgmAudio || bgmAudio.paused) playBgm(); } else pauseBgm(); }, 1000);
    ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, kick, true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseBgm(); else playBgm(); });
    // 有聲影片：開始播就暫停背景音樂，停了再接著放（play／pause／ended 不會冒泡，用捕獲階段）
    document.addEventListener('play', e => { if (e.target.tagName === 'VIDEO' && !e.target.muted) pauseBgm(); }, true);
    ['pause', 'ended'].forEach(t => document.addEventListener(t, e => { if (e.target.tagName === 'VIDEO') setTimeout(playBgm, 300); }, true));
}
initBgm();
