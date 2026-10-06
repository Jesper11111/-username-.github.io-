// 屠龍勇者：PWA（ARCHITECTURE.md 第 12 節）—— 註冊 Service Worker、安裝說明、新版本提示、持久儲存
// main.js 啟動時呼叫 initPwa()；設定分頁「📲 安裝到主畫面」→ openInstallGuide()
// 新版本：每 30 分鐘與切回前景時抓 index.html 比對 ?v=，有新版在畫面下方顯示「🔄 有新版本，點此更新」（讓玩家自己按）

const PWA_UPDATE_CHECK_MS = 30 * 60 * 1000;
let pwaInstallEvent = null;   // Android／電腦 Chrome、Edge 的安裝事件，按按鈕時才跳出
let pwaLastCheck = 0;

function isStandaloneApp() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}
function pwaIsIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function pwaInAppBrowser() { return /Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(navigator.userAgent); }

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pwaInstallEvent = e; });
window.addEventListener('appinstalled', () => { pwaInstallEvent = null; showToast('📲 已安裝屠龍勇者'); });

function initPwa() {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(GAME_VERSION), { scope: './' })
            .catch(e => console.warn('Service Worker 註冊失敗：', e));
    }
    // 請瀏覽器不要在空間不足時清掉存檔（localStorage）
    try {
        if (navigator.storage && navigator.storage.persisted) {
            navigator.storage.persisted().then(p => { if (!p && navigator.storage.persist) navigator.storage.persist(); }).catch(() => {});
        }
    } catch (e) {}
    setInterval(checkNewVersion, PWA_UPDATE_CHECK_MS);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkNewVersion(); });
    // iPhone 主畫面版與 Safari 的存檔是分開的：第一次從主畫面開、沒有存檔時提醒一次
    try {
        if (isStandaloneApp() && pwaIsIOS() && !hasSave() && !localStorage.getItem('dragonSlayer_pwa_hint')) {
            localStorage.setItem('dragonSlayer_pwa_hint', '1');
            setTimeout(() => gameAlert('📲 歡迎使用主畫面版', 'iPhone 的主畫面版和 Safari 的存檔是分開的。\n如果你在 Safari 已經有角色：先在 Safari 的「⚙️ 設定 → 匯出存檔」複製文字，\n再回到這裡建立畫面的「⚙️ 設定 → 匯入存檔」貼上。\n（要先進遊戲才看得到設定，可以先建一個暫時角色再匯入覆蓋）'), 1200);
        }
    } catch (e) {}
}

// 抓最新的 index.html 比對版本號（至少間隔 5 分鐘）
async function checkNewVersion() {
    if (Date.now() - pwaLastCheck < 5 * 60 * 1000) return;
    pwaLastCheck = Date.now();
    try {
        const html = await (await fetch('index.html', { cache: 'no-cache' })).text();
        const m = html.match(/data\/config\.js\?v=([^"'&]+)/);
        if (m && m[1] !== GAME_VERSION) showUpdateBanner(m[1]);
    } catch (e) {}
}

function showUpdateBanner(ver) {
    if ($('pwa-update')) return;
    const b = document.createElement('button');
    b.id = 'pwa-update';
    b.textContent = '🔄 有新版本，點此更新';
    b.title = `新版本 ${ver}`;
    b.onclick = () => {
        b.disabled = true;
        b.textContent = '更新中…';
        saveGame();
        location.reload();
    };
    document.body.appendChild(b);
}

async function openInstallGuide() {
    if (isStandaloneApp()) { gameAlert('📲 安裝到主畫面', '你現在就是從主畫面開啟的版本，不需要再安裝。'); return; }
    if (pwaInstallEvent) {
        const ev = pwaInstallEvent;
        pwaInstallEvent = null;
        ev.prompt();
        try { await ev.userChoice; } catch (e) {}
        return;
    }
    let msg;
    if (pwaInAppBrowser()) {
        msg = '目前是在 LINE／Facebook 等 App 內建的瀏覽器，無法安裝。\n\n請按右上角「⋯」選「用預設瀏覽器開啟」（iPhone 用 Safari、Android 用 Chrome），再按一次「📲 安裝到主畫面」。';
    } else if (pwaIsIOS()) {
        msg = 'iPhone／iPad 安裝方式（請用 Safari）：\n1. 按畫面下方的「分享」按鈕（方框加向上箭頭）\n2. 往下找「加入主畫面」\n3. 按右上角「新增」\n\n⚠️ 主畫面版和 Safari 的存檔是分開的：安裝前先到「⚙️ 設定 → 匯出存檔」複製文字，打開主畫面版後再「匯入存檔」。';
    } else {
        msg = '安裝方式：\n・Android Chrome：按右上角「⋮」→「安裝應用程式」或「加到主畫面」\n・電腦 Chrome／Edge：網址列右側的安裝圖示，或選單 →「安裝屠龍勇者」\n\n找不到安裝選項的話，可能是瀏覽器還在準備，玩一下再試一次。';
    }
    gameAlert('📲 安裝到主畫面', msg);
}
