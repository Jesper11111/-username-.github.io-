// ==================== 背景音樂（第 76 節）====================
// 兩首（2026-10-04 使用者提供）：
//   game＝遊戲背景音樂：「只放 1～2 首，到 7 分 48 秒；從遊戲登入頁面開始播放」→ audio/bgm-game.m4a（AAC 80kbps，約 4.8MB）＋ .ogg（Opus 56kbps，約 3.4MB，備用）
//   zone＝特殊地圖音樂：videoplayback.mp4 的音軌（約 97 秒）→ audio/bgm-sanjie.m4a（AAC 96kbps，約 1.2MB）＋ .ogg（備用）；
//         只在「三界之戰」與「靈界地圖」播放（BGM_ZONE：三界之戰海報 #activity-poster-modal、世界 Boss 視窗與戰鬥畫面、靈界大地圖 LINGJIE_SCENE_KEY）
// 目前畫面在 BGM_ZONE 放 zone，其他畫面（含登入頁）放 game；兩首各自記住播到哪，換回來接著放。都循環播放、頭尾淡入淡出。
// 不影響遊戲運轉：瀏覽器規定要先點過畫面才能播有聲媒體 → 第一次點擊／按鍵才建立音訊（之前不下載）；邊下載邊播（串流），載入失敗就是沒有音樂。
//   手機開「省數據」（navigator.connection.saveData）且沒設定過時，預設關閉。
// 開關與音量是「這台裝置」的偏好（localStorage 的 BGM_PREF_KEY），不寫進存檔；設定視窗「🎵 背景音樂」調整。
// 切到背景（分頁隱藏、App 切走）暫停、回來繼續；有聲影片播放時（仙翁開場動畫、夥伴影片）暫停，影片停了再繼續。

const BGM_TRACKS = {
    game: { src: "audio/bgm-game.m4a", fallback: "audio/bgm-game.ogg" },
    zone: { src: "audio/bgm-sanjie.m4a", fallback: "audio/bgm-sanjie.ogg" }   // fallback＝Opus：不支援 AAC 的瀏覽器自動改用
};
const BGM_PREF_KEY = "xiuxian_bgm";
// 2026-10-04 使用者：「三界之戰、靈界地圖」→ scenes＝town.js 的城內場景名稱（靈界大地圖 LINGJIE_SCENE_KEY）
const BGM_ZONE = { activities: ["demon"], ids: ["world-boss-modal", "world-boss-scene"], scenes: () => [LINGJIE_SCENE_KEY] };
const BGM_DEFAULT_VOL = 0.4;
const bgmAudios = {};   // { game: Audio, zone: Audio }（用到才建立）

function getBgmPref() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(BGM_PREF_KEY) || 'null'); } catch (e) {}
    const vol = o && typeof o.vol === 'number' ? Math.min(1, Math.max(0, o.vol)) : BGM_DEFAULT_VOL;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    return { on: o && typeof o.on === 'boolean' ? o.on : !saveData, vol };
}
function saveBgmPref(p) { try { localStorage.setItem(BGM_PREF_KEY, JSON.stringify(p)); } catch (e) {} }

// 目前畫面是不是特殊地圖（三界之戰、靈界地圖）
function isBgmZone() {
    const shown = id => { const e = document.getElementById(id); return !!(e && getComputedStyle(e).display !== 'none'); };
    const poster = document.getElementById('activity-poster-modal');
    if (typeof currentTownScene !== 'undefined' && currentTownScene && BGM_ZONE.scenes().includes(currentTownScene) && shown('town-scene')) return true;
    return (shown('activity-poster-modal') && BGM_ZONE.activities.includes(poster.dataset.act)) || BGM_ZONE.ids.some(shown);
}
function currentBgmTrack() { return isBgmZone() ? 'zone' : 'game'; }
// 有聲影片正在播（這時不放背景音樂）
function isSoundVideoPlaying() {
    return [...document.querySelectorAll('video')].some(v => !v.paused && !v.ended && !v.muted && v.volume > 0);
}
function getBgmAudio(key) {
    if (bgmAudios[key]) return bgmAudios[key];
    const t = BGM_TRACKS[key];
    // 先看瀏覽器能不能播 AAC，不能就直接用 Opus；載入失敗時也換一次
    const aac = new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"');
    const a = new Audio(aac ? t.src : t.fallback);
    a.loop = true;
    a.preload = 'auto';
    a.addEventListener('error', () => {
        if (a.src.endsWith(t.fallback)) return;
        a.src = t.fallback;
        playBgm();
    });
    return (bgmAudios[key] = a);
}
function playBgm() {
    const p = getBgmPref(), key = currentBgmTrack();
    // 不是這個畫面的那首先停
    Object.keys(bgmAudios).forEach(k => { if (k !== key && !bgmAudios[k].paused) bgmAudios[k].pause(); });
    if (!p.on || p.vol <= 0 || document.hidden || isSoundVideoPlaying()) return;
    const a = getBgmAudio(key);
    a.volume = p.vol;
    if (!a.paused) return;
    const r = a.play();
    if (r && r.catch) r.catch(() => {});   // 還沒互動過或載入失敗：等下次點擊再試
}
function pauseBgm() { Object.values(bgmAudios).forEach(a => { if (!a.paused) a.pause(); }); }

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
    Object.values(bgmAudios).forEach(a => { a.volume = p.vol; });
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
    let interacted = false;
    const kick = () => { interacted = true; setTimeout(playBgm, 0); };   // 點擊的那一下可能正好打開三界之戰
    // 換畫面（進出三界之戰、靈界地圖）：每秒檢查一次，該放哪首就換哪首
    setInterval(() => {
        if (!interacted || document.hidden) return;
        const a = bgmAudios[currentBgmTrack()];
        if (!a || a.paused) playBgm();
    }, 1000);
    ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, kick, true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseBgm(); else if (interacted) playBgm(); });
    // 有聲影片：開始播就暫停背景音樂，停了再接著放（play／pause／ended 不會冒泡，用捕獲階段）
    document.addEventListener('play', e => { if (e.target.tagName === 'VIDEO' && !e.target.muted) pauseBgm(); }, true);
    ['pause', 'ended'].forEach(t => document.addEventListener(t, e => { if (e.target.tagName === 'VIDEO' && interacted) setTimeout(playBgm, 300); }, true));
}
initBgm();
