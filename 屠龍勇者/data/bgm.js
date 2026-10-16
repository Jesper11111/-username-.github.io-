// 屠龍勇者：背景音樂（music/*.m4a）。依賴 sfx.js（共用 AudioContext，第一次點擊後才能出聲）
// 野外（player.loc.type === 'zone'）兩首輪流、村莊（'town'）一首循環，換區時淡出再淡入；標題畫面、頁面在背景時淡出暫停。
// 用 <audio> 串流（不用整首下載完才播），接進 Web Audio 的 GainNode 控制音量（iOS 不能直接改 audio.volume）。
// 開關與音量是這台裝置的設定（localStorage），在「設定 → 🔊 音效」調整。
const BGM_KEY = 'dragonSlayer_bgm';
const BGM_LISTS = {
    field: ['music/field1.m4a', 'music/field2.m4a'],   // 使用者給的「遊戲音樂」「遊戲音樂2」
    town: ['music/town1.m4a'],                         // 「城鎮音樂」
};
const BGM_FADE = 1.5;   // 淡入淡出秒數

let bgmCfg = { on: true, vol: 40 };
try { Object.assign(bgmCfg, JSON.parse(localStorage.getItem(BGM_KEY) || '{}')); } catch (e) { }
// bgmList＝現在該播的組（null＝安靜）；bgmCur＝<audio> 目前載入的組；bgmPos＝每組上次播到哪
let bgmEl = null, bgmGain = null, bgmList = null, bgmCur = null, bgmIdx = 0, bgmStopTimer = 0;
const bgmPos = {};

function bgmSaveCfg() { try { localStorage.setItem(BGM_KEY, JSON.stringify(bgmCfg)); } catch (e) { } }
// 現在該播哪一組（null＝安靜）
function bgmWant() {
    if (!bgmCfg.on || bgmCfg.vol <= 0 || !player || SIM_MODE || document.hidden) return null;
    if (player.loc.type === 'zone') return 'field';
    if (player.loc.type === 'town') return 'town';
    return null;
}
function bgmInit() {
    if (bgmEl || !sfxCtx) return !!bgmEl;
    bgmEl = new Audio();
    bgmEl.preload = 'auto';
    bgmGain = sfxCtx.createGain();
    bgmGain.gain.value = 0;
    sfxCtx.createMediaElementSource(bgmEl).connect(bgmGain);
    bgmGain.connect(sfxCtx.destination);
    bgmEl.addEventListener('ended', () => { if (bgmCur) { bgmIdx = (bgmIdx + 1) % BGM_LISTS[bgmCur].length; bgmPlayCur(0); } });
    return true;
}
function bgmRamp(to, sec) {
    const g = bgmGain.gain, t = sfxCtx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(to, t + sec);
}
function bgmPlayCur(t) {
    bgmEl.src = BGM_LISTS[bgmCur][bgmIdx];
    if (t) bgmEl.currentTime = t;
    bgmEl.play().catch(() => { });
}
// 換組：先淡出目前的，再換成 bgmList 那組淡入；每組記住播到哪（回村再出城從原位置繼續）
function bgmSwap() {
    bgmStopTimer = 0;
    const w = bgmList;
    if (!w) { bgmEl.pause(); return; }
    if (bgmCur !== w) {
        if (bgmCur) bgmPos[bgmCur] = { idx: bgmIdx, t: bgmEl.currentTime };
        const p = bgmPos[w] || { idx: Math.floor(Math.random() * BGM_LISTS[w].length), t: 0 };   // 第一次隨機挑一首
        bgmCur = w; bgmIdx = p.idx;
        bgmPlayCur(p.t);
    } else bgmEl.play().catch(() => { });
    bgmRamp(bgmCfg.vol / 100, BGM_FADE);
}
// 每 0.5 秒檢查一次（也在點擊、切回前景、改設定時呼叫）
function bgmUpdate() {
    if (!sfxCtx || sfxCtx.state !== 'running' || !bgmInit()) return;
    const want = bgmWant();
    if (want === bgmList) {
        if (want && bgmEl.paused && !bgmStopTimer) bgmEl.play().catch(() => { });
        return;
    }
    bgmList = want;
    clearTimeout(bgmStopTimer); bgmStopTimer = 0;
    if (want && want === bgmCur && !bgmEl.paused) { bgmRamp(bgmCfg.vol / 100, BGM_FADE); return; }   // 淡出途中又回來
    if (bgmCur && !bgmEl.paused) {
        bgmRamp(0, BGM_FADE);
        bgmStopTimer = setTimeout(bgmSwap, BGM_FADE * 1000);
    } else bgmSwap();
}

// 設定頁（sfxSettingsHtml 的音效區塊裡）
function setBgmOn(v) { bgmCfg.on = !!v; bgmSaveCfg(); sfxUnlock(); bgmUpdate(); }
function setBgmVol(v) {
    bgmCfg.vol = clamp(parseInt(v, 10) || 0, 0, 100);
    bgmSaveCfg();
    if (bgmGain && bgmList) bgmRamp(bgmCfg.vol / 100, 0.1);
    bgmUpdate();
}
function bgmSettingsHtml() {
    return `<label class="set-row"><span>背景音樂</span><input type="checkbox" ${bgmCfg.on ? 'checked' : ''} onchange="setBgmOn(this.checked)"></label>
            <label class="set-row"><span>音樂音量 <b id="bgm-vol-n">${bgmCfg.vol}</b>%</span><input type="range" min="0" max="100" step="5" value="${bgmCfg.vol}"
                oninput="setBgmVol(this.value);$('bgm-vol-n').textContent=this.value"></label>`;
}

setInterval(bgmUpdate, 500);
document.addEventListener('visibilitychange', bgmUpdate);
document.addEventListener('pointerdown', () => setTimeout(bgmUpdate, 0), { capture: true });
