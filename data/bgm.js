// ==================== 背景音樂（第 76 節）====================
// 2026-10-04 使用者：先後換過兩首，後來「移除這兩首歌」，改提供三首配樂「加入遊戲背景音樂」，再追加五首 → 8 首依序輪播、播完最後一首回到第一首。
//   audio/bgm-1～3.m4a（AAC 96kbps，各約 1.4MB，約 2 分鐘）＋ .ogg（Opus 64kbps，備用）；頭 1 秒淡入、尾 2.5 秒淡出。
// 全部畫面都播（從遊戲主頁開始）。一次只載入正在播的那一首（不會一次下載三首）。
// 不影響遊戲運轉：頁面載入就試著播（瀏覽器允許自動播放時直接響）；被擋時主頁右上「🔇 輕觸開啟音樂」，點畫面任何地方開始；
//   串流邊下載邊播，載入失敗就跳下一首、都失敗就沒有音樂。手機開「省數據」（navigator.connection.saveData）且沒設定過時預設關閉。
// 開關與音量是「這台裝置」的偏好（localStorage 的 BGM_PREF_KEY），不寫進存檔；設定視窗「背景音樂」、主頁右上音樂鈕調整。
// 切到背景（分頁隱藏、App 切走）暫停、回來繼續；有聲影片播放時（仙翁開場動畫、夥伴影片）暫停，影片停了再繼續。

// 2026-10-04 使用者再追加五首「加入背景音」→ bgm-4～8（AAC 80kbps，各約 2.4～2.9MB，約 4～4.7 分鐘；.ogg Opus 56kbps 備用），共 8 首依序輪播
const BGM_TRACK_COUNT = 8;
const BGM_PLAYLIST = Array.from({ length: BGM_TRACK_COUNT }, (_, i) => ({ src: `audio/bgm-${i + 1}.m4a`, fallback: `audio/bgm-${i + 1}.ogg` }));
const BGM_PREF_KEY = "xiuxian_bgm";
const BGM_DEFAULT_VOL = 0.4;
let bgmAudio = null, bgmIndex = 0, bgmFails = 0;
let bgmUnlocked = false;   // 已經成功播放過（之後回到前景、影片結束可以自動接著放）

function getBgmPref() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(BGM_PREF_KEY) || 'null'); } catch (e) {}
    const vol = o && typeof o.vol === 'number' ? Math.min(1, Math.max(0, o.vol)) : BGM_DEFAULT_VOL;
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    return { on: o && typeof o.on === 'boolean' ? o.on : !saveData, vol };
}
function saveBgmPref(p) { try { localStorage.setItem(BGM_PREF_KEY, JSON.stringify(p)); } catch (e) {} }

// 有聲影片正在播（這時不放背景音樂）
function isSoundVideoPlaying() {
    return [...document.querySelectorAll('video')].some(v => !v.paused && !v.ended && !v.muted && v.volume > 0);
}
// 第 i 首的網址：瀏覽器能播 AAC 用 m4a，否則用 Opus
function bgmTrackSrc(i, useFallback) {
    const t = BGM_PLAYLIST[i];
    const aac = new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"');
    return useFallback || !aac ? t.fallback : t.src;
}
function getBgmAudio() {
    if (bgmAudio) return bgmAudio;
    const a = new Audio(bgmTrackSrc(bgmIndex));
    a.preload = 'auto';
    // 一首播完換下一首（三首輪流）
    a.addEventListener('ended', () => { bgmFails = 0; switchBgmTrack((bgmIndex + 1) % BGM_PLAYLIST.length); });
    // 載入失敗：m4a 先換 Opus，再不行跳下一首；整份清單都失敗就放棄
    a.addEventListener('error', () => {
        const t = BGM_PLAYLIST[bgmIndex];
        if (!a.src.endsWith(t.fallback)) { a.src = t.fallback; playBgm(); return; }
        if (++bgmFails >= BGM_PLAYLIST.length) return;
        switchBgmTrack((bgmIndex + 1) % BGM_PLAYLIST.length);
    });
    return (bgmAudio = a);
}
function switchBgmTrack(i) {
    bgmIndex = i;
    getBgmAudio().src = bgmTrackSrc(i);
    playBgm();
}
function playBgm() {
    const p = getBgmPref();
    if (!p.on || p.vol <= 0 || document.hidden || isSoundVideoPlaying()) return;
    const a = getBgmAudio();
    a.volume = p.vol;
    if (!a.paused) return;
    const r = a.play();
    if (r && r.then) r.then(() => { bgmUnlocked = true; renderBgmTitleBtn(); }, () => renderBgmTitleBtn());   // 被瀏覽器擋（還沒互動過）或載入失敗：等下次點擊再試
}
function pauseBgm() { if (bgmAudio && !bgmAudio.paused) bgmAudio.pause(); }
function isBgmPlaying() { return !!(bgmAudio && !bgmAudio.paused); }

// 遊戲主頁（標題畫面）右上的音樂鈕 #bgm-title-btn：被擋時顯示「🔇 輕觸開啟音樂」，播放中顯示 🔊（點了＝關）
function bgmTitleTap() {
    const p = getBgmPref();
    if (p.on && isBgmPlaying()) toggleBgm();   // 播放中：關掉
    else if (!p.on) toggleBgm(); else playBgm();
    renderBgmTitleBtn();
}
function renderBgmTitleBtn() {
    const btn = document.getElementById('bgm-title-btn');
    if (!btn) return;
    const p = getBgmPref(), playing = isBgmPlaying();
    btn.textContent = playing ? '🔊' : (p.on ? '🔇 輕觸開啟音樂' : '🔇');
    btn.classList.toggle('pulse', !playing && p.on);
}

// 設定視窗
function toggleBgm() {
    const p = getBgmPref();
    p.on = !p.on;
    saveBgmPref(p);
    if (p.on) playBgm(); else pauseBgm();
    renderBgmSettings();
    renderBgmTitleBtn();
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

// 啟動：綁事件，並在遊戲主頁一打開就試著播（2026-10-04 使用者：「音樂可以在遊戲主頁開始播放嗎」）
function initBgm() {
    let interacted = false;
    const kick = () => { interacted = true; if (!isBgmPlaying()) setTimeout(playBgm, 0); };
    ['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, kick, true));
    setTimeout(() => { playBgm(); renderBgmTitleBtn(); }, 300);
    setInterval(renderBgmTitleBtn, 1000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pauseBgm(); else if (interacted || bgmUnlocked) playBgm(); });
    // 有聲影片：開始播就暫停背景音樂，停了再接著放（play／pause／ended 不會冒泡，用捕獲階段）
    document.addEventListener('play', e => { if (e.target.tagName === 'VIDEO' && !e.target.muted) pauseBgm(); }, true);
    ['pause', 'ended'].forEach(t => document.addEventListener(t, e => { if (e.target.tagName === 'VIDEO' && (interacted || bgmUnlocked)) setTimeout(playBgm, 300); }, true));
}
initBgm();
