// 屠龍勇者：背景音樂（music/*.m4a）。依賴 sfx.js（共用 AudioContext，第一次點擊後才能出聲）
// 目前只有野外：角色在狩獵地圖（player.loc.type === 'zone'）時兩首輪流播，回村莊／標題畫面淡出停止；頁面在背景時暫停。
// 用 <audio> 串流（不用整首下載完才播），接進 Web Audio 的 GainNode 控制音量（iOS 不能直接改 audio.volume）。
// 開關與音量是這台裝置的設定（localStorage），在「設定 → 🔊 音效」調整。
const BGM_KEY = 'dragonSlayer_bgm';
const BGM_LISTS = { field: ['music/field1.m4a', 'music/field2.m4a'] };   // 使用者給的「遊戲音樂」「遊戲音樂2」
const BGM_FADE = 1.5;   // 淡入淡出秒數

let bgmCfg = { on: true, vol: 40 };
try { Object.assign(bgmCfg, JSON.parse(localStorage.getItem(BGM_KEY) || '{}')); } catch (e) { }
let bgmEl = null, bgmGain = null, bgmList = null, bgmIdx = 0, bgmStopTimer = 0;

function bgmSaveCfg() { try { localStorage.setItem(BGM_KEY, JSON.stringify(bgmCfg)); } catch (e) { } }
// 現在該播哪一組（null＝安靜）
function bgmWant() {
    if (!bgmCfg.on || bgmCfg.vol <= 0 || !player || SIM_MODE || document.hidden) return null;
    if (player.loc.type === 'zone') return 'field';
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
    bgmEl.addEventListener('ended', () => { if (bgmList) { bgmIdx = (bgmIdx + 1) % BGM_LISTS[bgmList].length; bgmPlayCur(); } });
    return true;
}
function bgmRamp(to, sec) {
    const g = bgmGain.gain, t = sfxCtx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(to, t + sec);
}
function bgmPlayCur() {
    bgmEl.src = BGM_LISTS[bgmList][bgmIdx];
    bgmEl.play().catch(() => { });
}
// 每 0.5 秒檢查一次（也在點擊、切回前景、改設定時呼叫）
function bgmUpdate() {
    if (!sfxCtx || sfxCtx.state !== 'running' || !bgmInit()) return;
    const want = bgmWant();
    if (want === bgmList) {
        if (want && bgmEl.paused && !bgmStopTimer) bgmEl.play().catch(() => { });
        return;
    }
    clearTimeout(bgmStopTimer); bgmStopTimer = 0;
    if (!want) {   // 淡出後暫停（下次回到同一組從原本位置繼續）
        bgmRamp(0, BGM_FADE);
        bgmStopTimer = setTimeout(() => { bgmStopTimer = 0; if (!bgmWant()) bgmEl.pause(); }, BGM_FADE * 1000);
        bgmList = null;
        return;
    }
    const resume = bgmEl.src && bgmEl.src.endsWith(BGM_LISTS[want][bgmIdx]) && bgmEl.currentTime > 0;
    bgmList = want;
    if (resume) bgmEl.play().catch(() => { });
    else { bgmIdx = Math.floor(Math.random() * BGM_LISTS[want].length); bgmPlayCur(); }
    bgmRamp(bgmCfg.vol / 100, BGM_FADE);
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
    return `<label class="set-row"><span>背景音樂（野外）</span><input type="checkbox" ${bgmCfg.on ? 'checked' : ''} onchange="setBgmOn(this.checked)"></label>
            <label class="set-row"><span>音樂音量 <b id="bgm-vol-n">${bgmCfg.vol}</b>%</span><input type="range" min="0" max="100" step="5" value="${bgmCfg.vol}"
                oninput="setBgmVol(this.value);$('bgm-vol-n').textContent=this.value"></label>`;
}

setInterval(bgmUpdate, 500);
document.addEventListener('visibilitychange', bgmUpdate);
document.addEventListener('pointerdown', () => setTimeout(bgmUpdate, 0), { capture: true });
