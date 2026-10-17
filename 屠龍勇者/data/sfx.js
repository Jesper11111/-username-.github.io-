// 屠龍勇者：音效（sounds/*.mp3，來源見 sounds/CREDITS.md）
// sfx(name) 播放一個音效；離線模擬／團戰模擬（SIM_MODE）、頁面在背景、設定關閉時不播。
// 開關與音量是這台裝置的設定（localStorage，不進存檔），在「設定 → 🔊 音效」調整。
// 用 Web Audio：第一次點擊／按鍵時才建立 AudioContext（手機瀏覽器規定要使用者操作後才能出聲），音檔第一次用到才下載。
const SFX_KEY = 'dragonSlayer_sfx';
// kind：combat 戰鬥／ui 介面（各自有開關）；vol 個別音量；off／dur 只播其中一段（秒，尾巴淡出；mon-die 原檔有 3 聲）；gap 同一個音效最短間隔 ms
const SFX_DEFS = {
    'hit-slash':  { kind: 'combat', vol: 0.55 },
    'hit-slash2': { kind: 'combat', vol: 0.55 },
    'hit-swing':  { kind: 'combat', vol: 0.5 },
    'hit-body':   { kind: 'combat', vol: 0.6 },
    'hit-pierce': { kind: 'combat', vol: 0.45, dur: 0.6 },
    'crit':       { kind: 'combat', vol: 0.6 },
    'block':      { kind: 'combat', vol: 0.35, dur: 0.6 },
    'hurt':       { kind: 'combat', vol: 0.45, gap: 250 },
    'mon-die':    { kind: 'combat', vol: 0.5, off: 0.18, dur: 0.5 },   // 原檔第一聲（後面兩聲較大）
    'magic-ice':  { kind: 'combat', vol: 0.5, dur: 1.0 },
    'magic-cast': { kind: 'combat', vol: 0.45, dur: 1.2 },
    'buff':       { kind: 'combat', vol: 0.4, dur: 1.3 },
    'player-die': { kind: 'combat', vol: 0.6 },
    'loot-gold':  { kind: 'combat', vol: 0.4, gap: 300 },
    'treasure':   { kind: 'combat', vol: 0.55, gap: 600 },
    'levelup':    { kind: 'ui', vol: 0.6, gap: 1500 },
    'quest-done': { kind: 'ui', vol: 0.6, gap: 800 },
    'coin':       { kind: 'ui', vol: 0.5 },
    'ui-click':   { kind: 'ui', vol: 0.45 },
    'ui-open':    { kind: 'ui', vol: 0.4 },
    'ui-back':    { kind: 'ui', vol: 0.4 },
    'ui-error':   { kind: 'ui', vol: 0.45, gap: 300 },
    'notify':     { kind: 'ui', vol: 0.45, gap: 500 },
};
const SFX_HITS = ['hit-slash', 'hit-slash2', 'hit-swing', 'hit-body'];   // 一般近戰命中輪流隨機
const SFX_MAX_VOICES = 8;

let sfxCfg = { combat: true, ui: true, vol: 70 };
try { Object.assign(sfxCfg, JSON.parse(localStorage.getItem(SFX_KEY) || '{}')); } catch (e) { }
let sfxCtx = null, sfxGain = null, sfxVoices = 0, sfxUiAt = 0, sfxAnyAt = 0;
const sfxBuf = {}, sfxLoading = {}, sfxLast = {};

function sfxSaveCfg() { try { localStorage.setItem(SFX_KEY, JSON.stringify(sfxCfg)); } catch (e) { } }
function sfxUnlock() {
    if (!sfxCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        // iOS 17+：設成 playback，手機切到靜音（側邊靜音鍵）時網頁聲音照樣出來（跟影片一樣）；舊版 iOS 沒有這個 API
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
        sfxCtx = new AC();
        sfxGain = sfxCtx.createGain();
        sfxGain.gain.value = sfxCfg.vol / 100;
        sfxGain.connect(sfxCtx.destination);
    }
    if (sfxCtx.state !== 'running') {
        sfxCtx.resume().catch(() => { });
        // 舊版 iOS Safari：要在使用者操作當下真的播一個聲音才會解鎖，播一段無聲的極短音
        try { const s = sfxCtx.createBufferSource(); s.buffer = sfxCtx.createBuffer(1, 1, 22050); s.connect(sfxCtx.destination); s.start(0); } catch (e) { }
    }
}
function sfxLoad(name) {
    if (sfxBuf[name] || sfxLoading[name] || !sfxCtx) return;
    sfxLoading[name] = fetch(`sounds/${name}.mp3`).then(r => r.arrayBuffer())
        .then(a => new Promise((ok, ng) => sfxCtx.decodeAudioData(a, ok, ng)))
        .then(b => { sfxBuf[name] = b; }).catch(() => { }).finally(() => { delete sfxLoading[name]; });
}
function sfxPreload() { if (sfxCtx) Object.keys(SFX_DEFS).filter(n => sfxCfg[SFX_DEFS[n].kind]).forEach(sfxLoad); }

// soft：前 150ms 內已經有別的音效（例如衝裝成功後跳出結果視窗）就不播
function sfx(name, soft) {
    const d = SFX_DEFS[name];
    if (!d || SIM_MODE || document.hidden || !sfxCfg[d.kind] || sfxCfg.vol <= 0 || !sfxCtx || sfxCtx.state !== 'running') return;
    const now = performance.now();
    if (now - (sfxLast[name] || 0) < (d.gap || 70) || sfxVoices >= SFX_MAX_VOICES || (soft && now - sfxAnyAt < 150)) return;
    const buf = sfxBuf[name];
    if (!buf) { sfxLoad(name); return; }
    sfxLast[name] = sfxAnyAt = now;
    if (d.kind === 'ui') sfxUiAt = now;
    const src = sfxCtx.createBufferSource(), g = sfxCtx.createGain();
    src.buffer = buf;
    g.gain.value = d.vol;
    src.connect(g); g.connect(sfxGain);
    sfxVoices++;
    src.onended = () => { sfxVoices--; };
    if (d.dur) {   // 只播前段：尾巴 0.08 秒淡出避免「啪」一聲
        const t = sfxCtx.currentTime;
        g.gain.setValueAtTime(d.vol, t + Math.max(0, d.dur - 0.08));
        g.gain.linearRampToValueAtTime(0, t + d.dur);
        src.start(0, d.off || 0, d.dur);
    } else src.start();
}
// 普攻命中：遠程穿刺、爆擊、其他隨機一種斬擊
function sfxHit(crit, ranged) { sfx(crit ? 'crit' : ranged ? 'hit-pierce' : SFX_HITS[Math.floor(Math.random() * SFX_HITS.length)]); }

// 設定頁
function setSfxOn(kind, v) { sfxCfg[kind] = !!v; sfxSaveCfg(); if (v) { sfxUnlock(); sfxPreload(); } }
function setSfxVol(v) {
    sfxCfg.vol = clamp(parseInt(v, 10) || 0, 0, 100);
    sfxSaveCfg();
    if (sfxGain) sfxGain.gain.value = sfxCfg.vol / 100;
}
function sfxTest() { sfxUnlock(); sfxPreload(); setTimeout(() => sfx('levelup'), sfxBuf.levelup ? 0 : 400); }
function sfxSettingsHtml() {
    return `<div class="panel"><h4>🔊 音效與音樂</h4>
            <label class="set-row"><span>戰鬥音效</span><input type="checkbox" ${sfxCfg.combat ? 'checked' : ''} onchange="setSfxOn('combat',this.checked)"></label>
            <label class="set-row"><span>介面音效</span><input type="checkbox" ${sfxCfg.ui ? 'checked' : ''} onchange="setSfxOn('ui',this.checked)"></label>
            <label class="set-row"><span>音量 <b id="sfx-vol-n">${sfxCfg.vol}</b>%</span><input type="range" min="0" max="100" step="5" value="${sfxCfg.vol}"
                oninput="setSfxVol(this.value);$('sfx-vol-n').textContent=this.value" onchange="sfxTest()"></label>
            ${bgmSettingsHtml()}
            <small class="muted">戰鬥：攻擊、受傷、擊倒、掉寶、施法；介面：按鈕、視窗、升級、任務、買賣；背景音樂分野外、村莊。這台裝置的設定，不影響存檔；遊戲在背景或離線結算時不出聲。</small>
        </div>`;
}

// 第一次點擊／按鍵後才能出聲；之後所有按鈕點擊都有「喀」一聲（同一下已經播過介面音效，例如開視窗，就不重複）
// 手機觸控要等手指「放開」（touchend／pointerup／click）才算使用者操作，pointerdown 不算——只聽 pointerdown 時手機一直沒聲音（2026-10-17）
function sfxGesture(e) {
    sfxUnlock(); sfxPreload();
    // 這次是不是瀏覽器承認的「使用者操作」（觸控的 pointerdown 不算）
    const act = navigator.userActivation ? navigator.userActivation.isActive : (e.type !== 'pointerdown' || e.pointerType === 'mouse');
    if (typeof bgmGesture === 'function') bgmGesture(act);   // 背景音樂也要在使用者操作當下先播一次（bgm.js）
}
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, sfxGesture, { capture: true, passive: true }));
document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button, .tab-btn, [onclick]');
    if (b && !b.disabled && performance.now() - sfxUiAt > 60) sfx('ui-click');
});
