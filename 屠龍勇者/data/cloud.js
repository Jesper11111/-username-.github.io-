// 屠龍勇者：帳號登入＋雲端存檔（Supabase；ARCHITECTURE.md 第 29 節）
// 依賴 config、save（slotKey／hasSave…），執行期才呼叫 ui（openDialog／showToast）與 ui-create（showTitle）。
// 原則：localStorage 仍是主要存檔（遊戲每次存檔照舊寫本機），登入後再「定時上傳」到雲端；
//       雲端連不上時遊戲完全不受影響。安全性靠資料表的 RLS 規則（tools/supabase.sql），不靠隱藏金鑰。

// ⚠️ 兩個設定都填好才啟用；空字串＝不載入 SDK、不連網、標題畫面沒有登入按鈕
// （Project URL 與 publishable／anon key 本來就是公開的，可以放在程式裡）
const CLOUD_SUPABASE_URL = 'https://bzozxhkalyuijsrqkmto.supabase.co';   // 2026-10-10 開通（專案 dragon-slayer，東京）
const CLOUD_SUPABASE_KEY = 'sb_publishable_Huf2gR7MAeBCFhlhQ3DjFA_k0R5PBDZ';
const CLOUD_GOOGLE = false;          // 啟用 Google 登入（要先在 Supabase 主控台設定 Google 提供者）
const CLOUD_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
const CLOUD_TABLE = 'dragon_saves';
const CLOUD_AUTH_KEY = 'dragonSlayer_auth';         // 登入狀態（SDK 自己存，與修仙同網域所以要有前綴）
const CLOUD_OWNER_KEY = 'dragonSlayer_cloud_owner'; // 這台裝置的角色屬於哪個帳號（uid）
const CLOUD_DEL_KEY = 'dragonSlayer_cloud_del';     // 還沒成功刪除雲端的角色（created 清單）
const CLOUD_BAK_KEY = 'dragonSlayer_cloud_bak';     // 同步改寫本機存檔前的備份（只留最近一次）
const CLOUD_SEEN_KEY = 'dragonSlayer_cloud_seen';   // 上次同步時雲端有哪些角色（雲端不見了＝在別台裝置刪掉）
const CLOUD_PUSH_MS = 60 * 1000;     // 兩次上傳至少間隔（同一角色）
const CLOUD_TIMEOUT_MS = 10 * 1000;

let cloudSb = null;          // Supabase client
let cloudUser = null;        // { id, email }
let cloudBan = null;         // 被管理者封鎖：{ reason, at }（第 31 節）；封鎖中不上傳
let cloudReady = false;      // 已經讀過登入狀態
let cloudBusy = false;       // 同步中
let cloudKnown = {};         // slot → 雲端那筆的 client_t（null＝雲端沒有）；上傳時用來檢查有沒有被別台裝置改過
let cloudDirty = new Set();  // 有新存檔還沒上傳的欄位
let cloudConflict = {};      // slot → true：雲端有別台裝置的新進度，暫停上傳等玩家選擇
let cloudLastPush = 0, cloudLastSync = 0, cloudError = '';

function isCloudConfigured() { return !!(CLOUD_SUPABASE_URL && CLOUD_SUPABASE_KEY); }
function cloudLoggedIn() { return !!(cloudSb && cloudUser); }

function cloudLs(k, v) {   // v 省略＝讀，null＝刪
    try {
        if (v === undefined) return localStorage.getItem(k);
        if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { }
    return null;
}

function cloudTimeout(p) {
    return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), CLOUD_TIMEOUT_MS))]);
}

function cloudErrText(e) {
    const m = String((e && (e.message || e.error_description)) || e || '');
    if (/Invalid login credentials/i.test(m)) return 'Email 或密碼錯誤';
    if (/already registered|already exists/i.test(m)) return '這個 Email 已經註冊過，請直接登入';
    if (/Email not confirmed/i.test(m)) return 'Email 尚未驗證，請到信箱點確認連結';
    if (/Password should be at least/i.test(m)) return '密碼至少 6 個字元';
    if (/valid email|invalid format|Unable to validate email/i.test(m)) return 'Email 格式不正確';
    if (/rate limit|too many/i.test(m)) return '嘗試太多次，請稍後再試';
    if (/signups not allowed|Signups not allowed/i.test(m)) return '目前暫停註冊新帳號';
    if (/timeout|Failed to fetch|NetworkError|network/i.test(m)) return '連不上雲端伺服器，請確認網路';
    if (/client too old/i.test(m)) return '遊戲版本太舊，請重新整理或按「有新版本」更新';
    if (/stat cap exceeded/i.test(m)) return '能力值超過上限（單項最高 40），雲端不接受這份存檔';   // tools/stat-cap.sql
    return m || '未知錯誤';
}

// ───────── 啟動：載入 SDK、讀登入狀態 ─────────
function cloudLoadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = CLOUD_SDK_URL;
        s.onload = () => res();
        s.onerror = () => { s.remove(); rej(new Error('Failed to fetch SDK')); };
        document.head.appendChild(s);
    });
}

async function initCloud() {
    if (!isCloudConfigured()) return;
    renderCloudEntry();
    try {
        await cloudLoadSdk();
        cloudSb = window.supabase.createClient(CLOUD_SUPABASE_URL, CLOUD_SUPABASE_KEY, {
            auth: { storageKey: CLOUD_AUTH_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }   // pkce：Google 登入／確認信回來的網址只帶一次性代碼（要搭配這個瀏覽器存的驗證碼），網址被複製分享也登不進去
        });
        const { data } = await cloudSb.auth.getSession();
        cloudCleanUrl();
        cloudReady = true;
        if (data && data.session) await cloudOnSignedIn(data.session.user, true);
        else if (cloudOwnedSlots()) showToast('☁️ 帳號未登入：這台裝置的角色重新登入後才會繼續同步', 3500);
        // Google 登入跳轉回來、或在其他分頁登出時
        cloudSb.auth.onAuthStateChange((ev, session) => {
            const u = session && session.user;
            if (u && !onlineBlocked && (!cloudUser || cloudUser.id !== u.id)) setTimeout(() => cloudOnSignedIn(u, false), 0);
            else if (ev === 'SIGNED_OUT' && cloudUser && !cloudSigningOut) cloudOnPassiveSignOut();
        });
    } catch (e) {
        cloudReady = true;
        cloudError = cloudErrText(e);
        console.warn('雲端存檔無法啟用', e);
    }
    renderCloudEntry();
    setInterval(cloudAutoPush, 15 * 1000);
}

// 網址上的登入參數（?code=、#error=…）用完就拿掉，不留在網址列被複製分享；#access_token 舊格式在 index.html 開頭就清掉了
function cloudCleanUrl() {
    const u = new URL(location.href);
    let dirty = false;
    for (const k of ['code', 'error', 'error_code', 'error_description']) if (u.searchParams.has(k)) { u.searchParams.delete(k); dirty = true; }
    if (/(^#|&)(error|error_code|error_description)=/.test(u.hash)) { u.hash = ''; dirty = true; }
    if (dirty) history.replaceState(history.state, '', u.toString());
}
function cloudRedirectUrl() { return location.origin + location.pathname; }

function cloudOwnedSlots() { let n = 0; for (let i = 0; i < MAX_SLOTS; i++) { const o = slotOwnerInfo(i); if (o && o.owner) n++; } return n; }

// 被動登出（別的分頁／裝置按了登出、登入過期、被踢）：角色留在本機（屬於原帳號），遊戲中就先存檔再回標題
let cloudSigningOut = false;   // 自己按登出（cloudDoSignOut）時不走這裡
function cloudOnPassiveSignOut() {
    onlineStop();
    const email = cloudUser ? cloudUser.email : '';
    cloudUser = null; cloudBan = null;
    cloudKnown = {}; cloudSentT = {}; cloudDirty = new Set(); cloudConflict = {}; cloudError = '';
    if (player) {
        if (slotHasSave(currentSlot)) saveGame(true);   // 本機欄位已被別的分頁清掉（主動登出）就不寫回去
        hunt = null; session = null; walkHome = null; player = null;
        showTitle();
    } else cloudRefreshScreen();
    renderCloudEntry();
    gameAlert('帳號已登出', `帳號${email ? `「${email}」` : ''}已登出（可能在別的分頁或裝置登出、或登入過期）。\n這台裝置上的角色仍保留，屬於原本的帳號；重新登入後才會繼續同步。`);
}

// 別的分頁改了登入狀態：這個分頁的角色不屬於新帳號就回標題（不存檔）
window.addEventListener('storage', e => {
    if (e.key !== CLOUD_AUTH_KEY || !player || !playerOwner) return;
    const uid = authUid();
    if (uid && uid !== playerOwner) ownerKick();
});

// ───────── 單一裝置登入（tools/single-login.sql；ARCHITECTURE.md 第 29 節）─────────
// 帳號在別台裝置使用中（90 秒內有心跳）→ 拒絕這次登入，可選「強制登入」（登出其他所有裝置後接手）；
// 登入後每 30 秒心跳，被別台強制登入搶走就把這台登出。伺服器還沒執行 single-login.sql、或網路錯誤時不擋（照舊可以玩）。
const ONLINE_BEAT_MS = 30 * 1000;
let onlineTimer = null, onlineBlocked = false;

function onlineDevice() {
    const ua = navigator.userAgent || '';
    const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '裝置';
    const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Line\//.test(ua) ? 'LINE' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : '';
    return (os + ' ' + br).trim();
}
function onlineMissing(e) { return !!e && (e.code === 'PGRST202' || /Could not find the function|does not exist/i.test(e.message || '')); }

// 回傳 true＝可以使用；{ device, ago }＝別台使用中
async function onlineClaim(force) {
    try {
        const r = await cloudTimeout(cloudSb.rpc('online_claim', { p_device: onlineDevice(), p_force: !!force }));
        if (r.error) { if (!onlineMissing(r.error)) console.warn('online_claim', r.error); return true; }
        return r.data && r.data.ok === false ? { device: r.data.device || '', ago: r.data.ago | 0 } : true;
    } catch (e) { return true; }   // 連不上：不擋
}

function onlineStart() {
    clearInterval(onlineTimer);
    onlineTimer = setInterval(onlinePing, ONLINE_BEAT_MS);
}
function onlineStop() { clearInterval(onlineTimer); onlineTimer = null; }

async function onlinePing() {
    if (!cloudLoggedIn() || onlineBlocked) return;
    try {
        const r = await cloudTimeout(cloudSb.rpc('online_ping'));
        if (!r.error && r.data === false) onlineKicked();
    } catch (e) { }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) onlinePing(); });

// 被別台強制登入：這台存檔、回標題、登出（角色留在本機）
async function onlineKicked() {
    if (!cloudUser) return;
    onlineStop();
    if (player) {
        saveGame();
        hunt = null; session = null; walkHome = null; player = null;
        showTitle();
    }
    cloudUser = null; cloudKnown = {}; cloudSentT = {}; cloudDirty = new Set(); cloudConflict = {};
    cloudSigningOut = true;
    try { await cloudTimeout(cloudSb.auth.signOut({ scope: 'local' })); } catch (e) { } finally { cloudSigningOut = false; }
    renderCloudEntry(); cloudRefreshScreen();
    gameAlert('已在其他裝置登入', '這個帳號在另一台裝置登入了，這台已自動登出（角色留在這台，重新登入後會同步）。\n如果不是你本人，請馬上改密碼。');
}

// 登入被拒：先不登出，讓玩家選「取消」（登出這台）或「強制登入」
function onlineReject(u, info) {
    onlineBlocked = true;
    if (player) {
        saveGame();
        hunt = null; session = null; walkHome = null; player = null;
        showTitle();
    }
    cloudUser = null;
    renderCloudEntry();
    const ago = info.ago < 60 ? `${info.ago} 秒前` : `${Math.floor(info.ago / 60)} 分鐘前`;
    openDialog('⛔ 帳號使用中', `<p>帳號 <b>${esc(u.email || '')}</b> 正在另一台裝置使用中${info.device ? `（${esc(info.device)}，${ago}還在線上）` : `（${ago}還在線上）`}，已拒絕這次登入。</p>
        <p class="muted">那台裝置離開遊戲約 1～2 分鐘後就能在這裡登入。<br>如果那<b>不是你本人</b>：按「強制登入」會把其他所有裝置登出，接著請馬上改密碼。</p>`,
        [{ text: '取消', cls: 'secondary', onClick: onlineCancel }, { text: '強制登入', cls: 'danger', onClick: () => onlineForce(u) }]);
}

async function onlineCancel() {
    cloudSigningOut = true;
    try { await cloudTimeout(cloudSb.auth.signOut({ scope: 'local' })); } catch (e) { } finally { cloudSigningOut = false; onlineBlocked = false; }
    renderCloudEntry();
}

async function onlineForce(u) {
    showToast('登出其他裝置中…');
    try { await cloudTimeout(cloudSb.auth.signOut({ scope: 'others' })); } catch (e) { console.warn('登出其他裝置失敗', e); }
    await onlineClaim(true);
    onlineBlocked = false;
    await cloudOnSignedIn(u, false, true);
}

async function cloudOnSignedIn(u, silent, claimed) {
    if (onlineBlocked) return;   // 「帳號使用中」對話框還開著
    cloudUser = { id: u.id, email: u.email || '' };
    renderCloudEntry();
    if (await cloudCheckBan()) return;
    if (!claimed) {
        const c = await onlineClaim(false);
        if (c !== true) { onlineReject(u, c); return; }
    }
    if (!cloudUser || cloudUser.id !== u.id) return;
    onlineStart();
    const r = await cloudSync();
    if (!silent && r) showToast(r);
    raidResume();   // 團隊副本：回到原本的隊伍、補領離線時打完的獎勵（raid.js）
    clanLoad(true); // 血盟：背景讀自己的血盟（聊天頻道、團隊副本加成要用；clan.js）
    diaRefresh();   // 鑽石、每日登入獎勵（vault.js）
}

// 有沒有被管理者封鎖（dragon_bans 自己那一列；被封鎖的人看得到原因）。封鎖中：不上傳、不能組隊，本機照常遊玩
let cloudBanShown = false;
async function cloudCheckBan() {
    if (!cloudLoggedIn()) return false;
    try {
        const { data, error } = await cloudTimeout(cloudSb.from('dragon_bans').select('reason, at').eq('user_id', cloudUser.id).maybeSingle());
        if (error) throw error;
        cloudBan = data || null;
    } catch (e) { console.warn('查詢封鎖狀態失敗', e); }
    renderCloudEntry();
    if (cloudBan && !cloudBanShown) {
        cloudBanShown = true;
        gameAlert('⛔ 帳號已停權', `這個帳號被管理者停權，無法使用雲端存檔與團隊副本。\n原因：${cloudBan.reason || '（未填寫）'}\n\n角色仍可以在這台裝置上單機遊玩。如有疑問請聯絡管理者。`);
    }
    return !!cloudBan;
}

// ───────── 登入後合併：本機角色與雲端角色 ─────────
// 用角色的 created（創角時間）辨認是不是同一個角色：同一角色取較新的進度；只有一邊有的保留下來，
// 位置被佔走就放到空欄位。本機若是「另一個帳號」的角色（換帳號登入），改成只下載這個帳號的雲端角色。
function cloudCharId(data) {
    const p = data && data.player;
    return p ? `${p.created || 0}|${p.cls}` : '';
}

function cloudReadLocal(i) {
    const raw = cloudLs(slotKey(i));
    if (!raw) return null;
    try { const data = saveParse(raw); return data && data.player ? { raw, data, id: cloudCharId(data), t: data.t || 0, owner: saveOwnerOf(data) } : null; }
    catch (e) { return null; }
}

async function cloudSync() {
    if (!cloudLoggedIn() || cloudBusy || cloudBan) return '';
    cloudBusy = true;
    cloudError = '';
    renderCloudEntry();
    try {
        // 一定要限定自己的帳號：管理者帳號有「可以查看任何人的存檔」權限（dragon_saves_select_admin），不加條件會把所有玩家的角色當成自己的下載（2026-10-15）
        const { data: rows, error } = await cloudTimeout(cloudSb.from(CLOUD_TABLE).select('slot, client_t, data').eq('user_id', cloudUser.id));
        if (error) throw error;
        for (const r of rows || []) await guardCheckCloud(cloudUser.id, r.slot, r.data, r.client_t);   // 雲端存檔被改過 → 那份記上標記（guard.js）
        const uid = cloudUser.id, owner = cloudLs(CLOUD_OWNER_KEY);
        let playing = player ? currentSlot : -1;   // 遊戲中的角色本機為準，不覆蓋
        const cloud = [];
        for (const r of rows || []) if (r.slot >= 0 && r.slot < MAX_SLOTS && r.data && r.data.player && !(WIPE.at && r.client_t < WIPE.at)) cloud[r.slot] = { data: r.data, t: r.client_t, id: cloudCharId(r.data) };
        cloudKnown = {};
        for (let i = 0; i < MAX_SLOTS; i++) cloudKnown[i] = cloud[i] ? cloud[i].t : null;
        // 這個帳號的待刪除（沒登入時刪的、雲端刪除失敗的、在別的帳號登入時刪的）：刪雲端、寫墓碑；刪不掉的留著下次再試
        // 刪不掉（網路、伺服器規則）的也不下載回來，留著下次再刪
        const delMap = cloudDelMap(), pend = delMap[uid] || [], keepPend = [];
        for (const id of pend) {
            const i = cloud.findIndex(c => c && c.id === id);
            if (i < 0) continue;   // 雲端已經沒有了
            if (i === playing) { keepPend.push(id); continue; }
            const p = cloud[i].data.player;
            cloudTombAdd(p);
            let ok = false;
            try { const { data: dd, error: de } = await cloudTimeout(cloudSb.from(CLOUD_TABLE).delete().eq('slot', i).select('slot')); ok = !de && dd && dd.length > 0; } catch (e) { }
            if (!ok) { keepPend.push(id); console.warn('雲端刪除沒有成功，這台先不顯示、下次再刪', p.name); }
            else cloudKnown[i] = null;
            cloud[i] = null;
        }
        if (keepPend.length) delMap[uid] = keepPend; else delete delMap[uid];
        cloudDelSave(delMap);

        const tomb = await cloudTombIds();
        // 每個本機角色看自己的 owner（save.js 角色歸屬）：自己帳號的照常合併；訪客角色（owner 空）收進目前帳號；
        // 別的帳號的角色＝foreign：不上傳、不覆蓋、不刪除，那個欄位保留給它（reserved），雲端角色不寫進那些欄位
        const local = [], reserved = new Set(), foreignEmails = new Set();
        let kicked = null;
        for (let i = 0; i < MAX_SLOTS; i++) {
            local[i] = cloudReadLocal(i);
            const L = local[i];
            if (!L) continue;
            if (L.owner && L.owner !== uid) {
                reserved.add(i);
                if (L.data.ownerEmail) foreignEmails.add(L.data.ownerEmail);
                if (i === playing) {   // 遊戲中的角色屬於別的帳號：先存在本機、回標題，不上傳
                    saveGame(true);
                    hunt = null; session = null; walkHome = null; player = null;
                    kicked = L.data.player.name; playing = -1;
                }
                continue;
            }
            if (tomb.has(L.id) && L.owner === uid) { cloudDropDeleted(i, true); local[i] = null; }   // 這個帳號已刪除的角色
        }
        for (let i = 0; i < MAX_SLOTS; i++) if (cloud[i] && tomb.has(cloud[i].id)) cloud[i] = null;
        // 本機文字要帶 owner＝目前帳號；已經是自己帳號的那份就沿用（jsonb 會改變欄位順序，避免每次都判定有變動）
        const mineRaw = L => L && L.owner === uid && L.data.owner === uid ? L.raw : null;
        const final = [];
        let hidden = 0, dup = 0;
        // 本機已經有、但屬於別的帳號的角色（🔒）：這個帳號雲端裡同一個角色（以前混進來或匯入的）這台不重複下載
        const foreignIds = new Set([...reserved].map(i => local[i].id));
        for (let i = 0; i < MAX_SLOTS; i++) {
            const c = cloud[i];
            if (c && reserved.has(i)) { final[i] = null; hidden++; continue; }   // 欄位被別帳號的角色佔著：這台先不顯示（雲端照舊）
            if (c && foreignIds.has(c.id)) { final[i] = null; dup++; continue; }
            final[i] = c ? { data: c.data, t: c.t, id: c.id, raw: local[i] && local[i].id === c.id && local[i].t === c.t ? mineRaw(local[i]) : null } : null;
        }
        const freeSlot = () => { for (let k = 0; k < MAX_SLOTS; k++) if (!final[k] && !reserved.has(k)) return k; return -1; };
        const upload = new Set(), conflicts = [];
        let added = 0, newer = 0, lost = 0, gone = 0;
        const seen = owner === uid ? JSON.parse(cloudLs(CLOUD_SEEN_KEY) || '[]') : [];
        for (let i = 0; i < MAX_SLOTS; i++) {
            const L = local[i];
            if (!L || reserved.has(i)) continue;
            const mine = L.owner === uid;   // 否則是訪客角色
            if (i === playing) {   // 遊戲中的角色固定在原欄位
                if (final[i] && final[i].id !== L.id) {
                    const j = freeSlot();
                    if (j >= 0) final[j] = final[i]; else lost++;
                }
                const same = final[i] && final[i].id === L.id;
                if (same && final[i].t > L.t) conflicts.push(i);   // 別台裝置有更新的進度：不能直接蓋掉
                else if (cloudKnown[i] !== L.t) upload.add(i);
                final[i] = { data: L.data, t: L.t, id: L.id, raw: L.raw };
                if (!mine) { playerOwner = uid; playerOwnerEmail = cloudUser.email || ''; saveGame(); }   // 訪客角色歸到這個帳號（存檔補上 owner 才會上傳）
                continue;
            }
            const j = final.findIndex(f => f && f.id === L.id);
            if (j >= 0) {
                if (L.t > final[j].t) { final[j] = { data: L.data, t: L.t, id: L.id, raw: mineRaw(L) }; upload.add(j); newer++; }
            } else if (mine && seen.includes(L.id)) {
                gone++;   // 上次同步時雲端還有、現在沒了：在別台裝置刪掉的，這台也移除（改寫前會備份）
            } else {
                const k = !final[i] ? i : freeSlot();
                if (k < 0) { lost++; continue; }
                final[k] = { data: L.data, t: L.t, id: L.id, raw: mineRaw(L) };
                upload.add(k); added++;
            }
        }
        if (lost) {   // 欄位不夠放：不改本機，請玩家先刪角色
            cloudError = `角色超過 ${MAX_SLOTS} 個欄位，無法合併`;
            gameAlert('雲端存檔', `這台裝置與雲端的角色加起來超過 ${MAX_SLOTS} 個欄位，這次沒有合併。\n請先在人物選單刪除不需要的角色，或登出後再登入。`);
            return '';
        }
        // 寫進本機的文字：帶 owner＝目前帳號（雲端那份不含 owner）
        const wantRaw = f => f ? (f.raw || saveEncode(JSON.stringify(Object.assign(cloudStripOwner(f.data), { owner: uid, ownerEmail: cloudUser.email || '' })))) : null;
        // 改寫本機前先備份整份
        let changed = false;
        for (let i = 0; i < MAX_SLOTS; i++) {
            if (i === playing || reserved.has(i)) continue;
            if ((local[i] ? local[i].raw : null) !== wantRaw(final[i])) changed = true;
        }
        if (changed) {
            const bak = {};
            for (let i = 0; i < MAX_SLOTS; i++) if (local[i]) bak[i] = local[i].raw;
            cloudLs(CLOUD_BAK_KEY, JSON.stringify({ t: Date.now(), owner, saves: bak }));
            for (let i = 0; i < MAX_SLOTS; i++) {
                if (i === playing || reserved.has(i)) continue;
                const want = wantRaw(final[i]);
                if ((local[i] ? local[i].raw : null) === want) continue;
                if (want) cloudLs(slotKey(i), want); else cloudLs(slotKey(i), null);
            }
        }
        cloudLs(CLOUD_OWNER_KEY, uid);   // 只剩舊存檔轉換（ownerMigrate）與刪除重試會用到
        if (kicked || reserved.size) {
            const who = foreignEmails.size ? `（${[...foreignEmails].join('、')}）` : '';
            const lines = [];
            if (kicked) lines.push(`「${kicked}」屬於其他帳號${who}，目前登入的帳號和這個角色不同，已回到標題畫面（進度留在這台裝置）。`);
            lines.push(`這台裝置有 ${reserved.size} 個角色屬於其他帳號${who}，不會上傳到目前的帳號，也不能用這個帳號遊玩；要玩請登入原本的帳號。`);
            if (hidden) lines.push(`這個帳號有 ${hidden} 個雲端角色因為欄位被佔用，這台暫時不顯示（雲端資料不受影響）。`);
            if (dup) lines.push(`這個帳號的雲端也有 ${dup} 個和上面（其他帳號）相同的角色，這台不重複顯示。在人物選單刪除 🔒 的那個角色時，這個帳號雲端裡的同一個角色會一起刪除（原帳號的不受影響）。`);
            setTimeout(() => { if (kicked) showTitle(); gameAlert('角色屬於其他帳號', lines.join('\n\n')); }, 0);
        }
        cloudLs(CLOUD_SEEN_KEY, JSON.stringify(final.filter(Boolean).map(f => f.id)));
        cloudConflict = {};
        cloudDirty = upload;
        await cloudFlush(true);
        cloudLastSync = Date.now();
        conflicts.forEach(cloudOnConflict);
        if (!player) {
            if (hasSave() && !slotHasSave(currentSlot)) setCurrentSlot(nextFilledSlot());
            cloudRefreshScreen();
        }
        const down = final.filter((f, i) => f && !f.raw).length;
        const msg = [];
        if (added) msg.push(`上傳 ${added} 個角色`);
        if (newer) msg.push(`更新 ${newer} 個角色`);
        if (down) msg.push(`下載 ${down} 個角色`);
        if (gone) msg.push(`移除 ${gone} 個已在別台刪除的角色`);
        return '☁️ 已同步' + (msg.length ? '：' + msg.join('、') : '');
    } catch (e) {
        cloudError = cloudErrText(e);
        console.warn('雲端同步失敗', e);
        return '☁️ 同步失敗：' + cloudError;
    } finally {
        cloudBusy = false;
        renderCloudEntry();
    }
}

// 標題畫面／人物選單開著時，同步完重畫
function cloudRefreshScreen() {
    const sel = document.getElementById('screen-select');
    if (sel && sel.classList.contains('active')) {
        if (!hasSave()) showTitle();
        else { if (!slotHasSave(selSlot)) selSlot = nextFilledSlot(); renderCharSelect(); }
    } else {
        const t = document.getElementById('screen-title');
        if (t && t.classList.contains('active')) showTitle();
    }
}

// ───────── 上傳 ─────────
// saveGame 每次存檔後呼叫：只做記號，cloudAutoPush 定時上傳
function cloudMarkDirty(i) {
    if (cloudLoggedIn()) cloudDirty.add(i);
}

function cloudAutoPush() {
    if (!cloudLoggedIn() || cloudBusy || !cloudDirty.size) return;
    if (Date.now() - cloudLastPush < CLOUD_PUSH_MS) return;
    cloudFlush(false);
}

// 上傳所有有記號的欄位；force＝不管間隔（同步、手動、離開畫面時）。回傳是否全部成功
let cloudFlushing = null;   // 上傳進行中（避免同時跑兩次）
async function cloudFlush(force) {
    if (!cloudLoggedIn() || !cloudDirty.size || cloudBan) return true;
    if (cloudFlushing) { await cloudFlushing.catch(() => { }); if (!cloudDirty.size) return true; }
    if (!force && Date.now() - cloudLastPush < CLOUD_PUSH_MS) return false;
    cloudFlushing = cloudFlushRun();
    try { return await cloudFlushing; } finally { cloudFlushing = null; }
}

async function cloudFlushRun() {
    cloudLastPush = Date.now();
    let ok = true;
    for (const i of [...cloudDirty]) {
        if (cloudConflict[i]) { ok = false; continue; }
        if (typeof vaultRpcBusy !== 'undefined' && vaultRpcBusy && i === currentSlot) { ok = false; continue; }   // 伺服器正在改這個角色的雲端存檔（共用倉庫，vault.js）
        try {
            const r = await cloudPushSlot(i, false);
            if (r) cloudDirty.delete(i); else ok = false;
        } catch (e) {
            ok = false;
            cloudError = cloudErrText(e);
            console.warn('雲端上傳失敗', e);
            if (e && e.code === '42501' && await cloudCheckBan()) break;   // 被 RLS 擋下：可能剛被封鎖
        }
    }
    if (ok) { cloudError = ''; cloudLastSync = Date.now(); }
    renderCloudEntry();
    return ok;
}

// 雲端那份存檔不含 owner／ownerEmail（只在本機用）
function cloudStripOwner(d) { const o = Object.assign({}, d); delete o.owner; delete o.ownerEmail; return o; }

// 這台送出過的 client_t（每格最近 20 個）。手機縮小／切到背景時，上傳已經寫進雲端，但 App 被暫停沒收到回應，
// cloudKnown 還是舊的 → 下次上傳對不上。對不上時先查雲端那筆是不是這台送的（cloudOwnOrConflict），是就接著傳，不跳「進度衝突」
let cloudSentT = {};
function cloudSentAdd(i, t) {
    const list = cloudSentT[i] || (cloudSentT[i] = []);
    if (!list.includes(t)) list.push(t);
    while (list.length > 20) list.shift();
}
async function cloudOwnOrConflict(i, retry) {
    if (!retry) {
        try {
            const { data, error } = await cloudTimeout(cloudSb.from(CLOUD_TABLE).select('client_t').eq('user_id', cloudUser.id).eq('slot', i).maybeSingle());
            if (!error && data && (cloudSentT[i] || []).includes(Number(data.client_t))) {
                cloudKnown[i] = Number(data.client_t);
                return cloudPushSlot(i, false, true);
            }
        } catch (e) { }
    }
    return cloudOnConflict(i);
}

// 上傳一個欄位。雲端那筆必須還是上次看到的版本（client_t），否則代表別台裝置有新進度 → 衝突（先排除是這台自己先前送出的）
async function cloudPushSlot(i, overwrite, retry) {
    const raw = cloudLs(slotKey(i));
    if (!raw) return true;
    const full = saveParse(raw);
    if (saveOwnerOf(full) !== cloudUser.id) return true;   // 不是目前帳號的角色（別的帳號或還沒歸屬的訪客角色）一律不上傳
    const data = cloudStripOwner(full), p = data.player, t = data.t || 0;
    data.schema = SAVE_SCHEMA;   // 伺服器用它擋掉沒有角色歸屬的舊版遊戲（tools/client-version.sql）；從雲端下載後沒再存檔的舊格式也照樣上傳得了
    data.lootProtocol = LOOT_PROTOCOL;
    data.sig = await guardCloudSig(cloudUser.id, i, p);   // 雲端存檔簽章，伺服器重算（guard.js、tools/anticheat.sql）
    if (!data.sig) delete data.sig;
    const row = { slot: i, client_t: t, name: String(p.name || '').slice(0, 40), cls: p.cls, lv: p.lv | 0, data };
    const known = cloudKnown[i];
    cloudSentAdd(i, t);
    let res;
    if (overwrite) {
        res = await cloudTimeout(cloudSb.from(CLOUD_TABLE).upsert(Object.assign({ user_id: cloudUser.id }, row)).select('slot'));
    } else if (known == null) {
        res = await cloudTimeout(cloudSb.from(CLOUD_TABLE).insert(Object.assign({ user_id: cloudUser.id }, row)).select('slot'));
        if (res.error && (res.error.code === '23505' || /duplicate/i.test(res.error.message))) return cloudOwnOrConflict(i, retry);
    } else {
        res = await cloudTimeout(cloudSb.from(CLOUD_TABLE).update(row).eq('slot', i).eq('client_t', known).select('slot'));
        if (!res.error && (!res.data || !res.data.length)) return cloudOwnOrConflict(i, retry);
    }
    if (res.error && cloudIsTombErr(res.error)) { cloudDropDeleted(i); return true; }
    if (res.error && cloudIsVaultSeqErr(res.error)) return cloudVaultAdopt(i);
    if (res.error) throw res.error;
    cloudKnown[i] = t;
    delete cloudConflict[i];
    return true;
}

// 已刪除的角色（tools/char-tombstone.sql 墓碑）：伺服器拒收 → 這台也移除，正在玩就回標題
function cloudIsTombErr(e) { return !!e && (e.hint === 'dragon_char_deleted' || /char deleted/.test(e.message || '')); }
function cloudDropDeleted(i, inSync) {
    const raw = cloudLs(slotKey(i));
    let name = '';
    try { name = saveParse(raw).player.name; } catch (e) { }
    if (raw) cloudLs(CLOUD_BAK_KEY, JSON.stringify({ t: Date.now(), owner: cloudUser && cloudUser.id, saves: { [i]: raw } }));
    cloudLs(slotKey(i), null);
    cloudDirty.delete(i); delete cloudConflict[i];
    if (!inSync) cloudKnown[i] = null;
    if (player && i === currentSlot) {
        hunt = null; session = null; walkHome = null; player = null;
        showTitle();
    }
    gameAlert('角色已刪除', `「${name || '這個角色'}」已經在這個帳號刪除，這台裝置上的資料也一併移除。`);
}
async function cloudTombIds() {
    try {
        const { data, error } = await cloudTimeout(cloudSb.from('dragon_deleted_chars').select('char_created, cls').eq('user_id', cloudUser.id));   // 管理者看得到所有人的墓碑，要限定自己
        if (error) throw error;
        return new Set((data || []).map(d => `${d.char_created}|${d.cls}`));
    } catch (e) { return new Set(); }   // 還沒執行 char-tombstone.sql：當作沒有墓碑
}

let cloudAutoFixAt = 0;
function cloudOnConflict(i) {
    cloudConflict[i] = true;
    cloudError = '雲端有其他裝置的新進度';
    // 不是正在玩的角色：重新同步一次（同一角色取較新的一邊），例如重新整理時舊頁面的上傳比新頁面晚到
    if (!(player && i === currentSlot)) {
        if (Date.now() - cloudAutoFixAt > 60 * 1000) { cloudAutoFixAt = Date.now(); setTimeout(() => cloudSync(), 500); }
        return false;
    }
    openDialog('☁️ 進度衝突', `<p>「${esc(player.name)}」在<b>另一台裝置</b>有比較新的雲端進度（可能同時在兩台裝置玩）。</p>
        <p>請選擇要保留哪一邊，另一邊的進度會被覆蓋。</p>`,
        [{ text: '用雲端的進度', onClick: cloudUseCloudSlot }, { text: '用這台的進度', cls: 'secondary', onClick: cloudUseLocalSlot }]);
    return false;
}

async function cloudUseLocalSlot() {
    const i = currentSlot;
    saveGame();
    try { await cloudPushSlot(i, true); cloudDirty.delete(i); showToast('☁️ 已用這台的進度覆蓋雲端'); }
    catch (e) { showToast('☁️ 上傳失敗：' + cloudErrText(e)); }
    renderCloudEntry();
}

// 把雲端的這個欄位寫進本機（改寫前備份）。回傳是否有下載到
async function cloudFetchSlot(i) {
    const { data, error } = await cloudTimeout(cloudSb.from(CLOUD_TABLE).select('client_t, data').eq('user_id', cloudUser.id).eq('slot', i).maybeSingle());
    if (error) throw error;
    if (!data) return false;
    await guardCheckCloud(cloudUser.id, i, data.data, data.client_t);
    cloudLs(CLOUD_BAK_KEY, JSON.stringify({ t: Date.now(), owner: cloudUser.id, saves: { [i]: cloudLs(slotKey(i)) } }));
    if (player && i === currentSlot) { hunt = null; session = null; walkHome = null; player = null; }
    cloudLs(slotKey(i), saveEncode(JSON.stringify(Object.assign(cloudStripOwner(data.data), { owner: cloudUser.id, ownerEmail: cloudUser.email || '' }))));
    cloudKnown[i] = data.client_t;
    delete cloudConflict[i];
    cloudDirty.delete(i);
    return true;
}

async function cloudUseCloudSlot() {
    const i = currentSlot;
    try {
        if (!await cloudFetchSlot(i)) { showToast('雲端沒有這個角色'); return; }
        continueGame();
        showToast('☁️ 已載入雲端進度');
    } catch (e) { showToast('☁️ 下載失敗：' + cloudErrText(e)); }
    renderCloudEntry();
}

// 共用倉庫序號不符（tools/vault-v2.sql）：本機是存取共用倉庫之前的舊進度（斷線、別台裝置、還原備份），不能蓋掉雲端 → 改用雲端進度
function cloudIsVaultSeqErr(e) { return !!e && (e.hint === 'dragon_vault_seq' || /vault seq conflict/.test(e.message || '')); }
function cloudVaultAdopt(i) {
    if (cloudConflict[i] === 'vault') return false;
    cloudConflict[i] = 'vault';   // 下載完成前不再上傳這一格
    setTimeout(async () => {
        const playing = player && i === currentSlot;
        try {
            if (!await cloudFetchSlot(i)) delete cloudConflict[i];
            else if (!playing) cloudRefreshScreen();
            else {
                continueGame();
                gameAlert('☁️ 已載入雲端進度', '這個角色在帳號共用倉庫有比較新的存取紀錄（可能在別台裝置、或存取時斷線），這台的進度比較舊，已改用雲端的進度，避免道具重複。');
            }
        } catch (e) { delete cloudConflict[i]; showToast('☁️ 下載失敗：' + cloudErrText(e)); }
        renderCloudEntry();
    }, 0);
    return false;
}

// ───────── 刪除角色（ARCHITECTURE.md 第 29 節「刪除角色」）─────────
// 待刪除清單依帳號分開：{ uid: [角色id…] }。沒登入、雲端刪除失敗、或刪的是別的帳號的角色時記在這裡，
// 那個帳號下次登入同步（cloudSync）時才刪雲端並寫墓碑；登出也不會清掉（舊版是一個陣列，登出後就永遠不會重試）
function cloudDelMap() {
    let m = null;
    try { m = JSON.parse(cloudLs(CLOUD_DEL_KEY) || '{}'); } catch (e) { }
    if (Array.isArray(m)) { const legacy = cloudLs(CLOUD_OWNER_KEY); m = legacy ? { [legacy]: m } : {}; }   // 舊格式：屬於這台裝置記的帳號
    return m && typeof m === 'object' ? m : {};
}
function cloudDelSave(m) { cloudLs(CLOUD_DEL_KEY, Object.keys(m).length ? JSON.stringify(m) : null); }
function cloudDelAdd(uid, id) {
    if (!uid || !id) return;
    const m = cloudDelMap();
    m[uid] = m[uid] || [];
    if (!m[uid].includes(id)) m[uid].push(id);
    cloudDelSave(m);
}
function cloudDelRemove(uid, id) {
    const m = cloudDelMap();
    if (!m[uid]) return;
    m[uid] = m[uid].filter(x => x !== id);
    if (!m[uid].length) delete m[uid];
    cloudDelSave(m);
}
// 墓碑：其他還開著這個角色的裝置不能再傳回這個帳號（tools/char-tombstone.sql；只擋同一個帳號）
function cloudTombAdd(p) {
    if (!cloudLoggedIn() || !p || !p.created) return;
    cloudSb.from('dragon_deleted_chars').insert({ char_created: p.created, cls: p.cls, name: String(p.name || '').slice(0, 40) }).then(() => { }, () => { });
}
// 刪掉目前帳號雲端裡的這個角色（用角色的建立時間＋職業找，不管在哪個欄位；只照欄位刪可能刪到換過位置的別的角色）
async function cloudRemoveChar(p) {
    const { data, error } = await cloudTimeout(cloudSb.from(CLOUD_TABLE).delete()
        .eq('data->player->>created', String(p.created)).eq('cls', p.cls).select('slot'));
    if (error) throw error;
    for (const r of data || []) cloudKnown[r.slot] = null;
    return data || [];
}

// 刪除角色時（save.js deleteSave）：
//   自己帳號的角色（或訪客角色）＋登入中 → 刪雲端、寫墓碑；失敗記待刪除
//   現在沒有登入任何帳號 → 記在角色所屬帳號的待刪除，那個帳號下次登入時刪（被動登出後刪角色）
//   登入中刪的是別的帳號的角色（🔒）→ 只刪這台的那份，原帳號雲端不動（不能讓 A 刪掉 B 帳號的角色）；
//     目前帳號雲端如果也有同一個角色（以前混進來的），一起刪掉並寫墓碑
function cloudDeleteSlot(i, raw) {
    cloudDirty.delete(i);
    delete cloudConflict[i];
    if (!raw) return;
    let d = null;
    try { d = saveParse(raw); } catch (e) { return; }
    const p = d && d.player, id = cloudCharId(d), owner = saveOwnerOf(d);
    if (!p || !p.created || !id) return;
    const me = cloudLoggedIn() ? cloudUser.id : '';
    if (!me) { if (owner) cloudDelAdd(owner, id); return; }
    const mine = !owner || owner === me;
    // 先記待刪除、再送出刪除：刪完馬上關頁面（請求被瀏覽器中斷）、網路失敗、伺服器沒刪到，下次登入同步都會補刪，同步也不會再把它下載回來（2026-10-15）
    cloudDelAdd(me, id);
    if (mine) {
        cloudKnown[i] = null;
        cloudLs(CLOUD_SEEN_KEY, JSON.stringify(JSON.parse(cloudLs(CLOUD_SEEN_KEY) || '[]').filter(x => x !== id)));
        cloudTombAdd(p);
    }
    cloudRemoveChar(p).then(rows => {
        if (!rows.length) return;   // 沒刪到任何一列（雲端本來就沒有，或被伺服器規則擋下）：留著待刪除，下次同步確認
        if (!mine) cloudTombAdd(p);
        cloudDelRemove(me, id);
    }).catch(e => console.warn('雲端刪除失敗，下次登入再刪', e));
}

// ───────── 登入／註冊／登出 ─────────
function openCloudDialog() {
    if (!isCloudConfigured()) return;
    if (!cloudReady) { showToast('雲端連線中，請稍候…'); return; }
    if (!cloudSb) { gameAlert('雲端存檔', '目前連不上雲端伺服器：' + (cloudError || '未知錯誤') + '\n不登入也能照常遊玩，存檔留在這台裝置。'); return; }
    if (cloudUser) return openCloudAccount();
    const google = CLOUD_GOOGLE ? '<button class="secondary" style="width:100%;margin-top:8px" onclick="cloudSignInGoogle()">使用 Google 登入</button>' : '';
    openDialog('☁️ 帳號登入', `<p class="muted" style="margin-top:0">登入後角色會自動存到雲端，換手機、換電腦都能接著玩。不登入也能照常遊玩（存檔只在這台裝置）。</p>
        <label class="cloud-field"><span>Email</span><input type="text" id="cloud-email" autocomplete="username" inputmode="email" placeholder="you@example.com"></label>
        <label class="cloud-field"><span>密碼</span><input type="password" id="cloud-pass" autocomplete="current-password" placeholder="至少 6 個字元"></label>
        <div id="cloud-msg" class="cloud-msg"></div>${google}`,
        [{ text: '取消', cls: 'secondary' }, { text: '註冊新帳號', cls: 'secondary', keep: true, onClick: cloudSignUp }, { text: '登入', keep: true, onClick: cloudSignIn }]);
    const em = document.getElementById('cloud-email');
    if (em) em.focus();
}

function cloudFormValues() {
    const email = (document.getElementById('cloud-email') || {}).value || '';
    const pass = (document.getElementById('cloud-pass') || {}).value || '';
    return { email: email.trim(), pass };
}

function cloudFormMsg(t, bad) {
    const el = document.getElementById('cloud-msg');
    if (el) { el.textContent = t; el.classList.toggle('bad', !!bad); }
}

async function cloudSignIn() {
    const { email, pass } = cloudFormValues();
    if (!email || !pass) { cloudFormMsg('請輸入 Email 和密碼', true); return; }
    cloudFormMsg('登入中…');
    try {
        const { data, error } = await cloudTimeout(cloudSb.auth.signInWithPassword({ email, password: pass }));
        if (error) throw error;
        closeDialog();
        await cloudOnSignedIn(data.user, false);
    } catch (e) { cloudFormMsg(cloudErrText(e), true); }
}

async function cloudSignUp() {
    const { email, pass } = cloudFormValues();
    if (!email || !pass) { cloudFormMsg('請輸入 Email 和密碼', true); return; }
    if (pass.length < 6) { cloudFormMsg('密碼至少 6 個字元', true); return; }
    cloudFormMsg('註冊中…');
    try {
        const { data, error } = await cloudTimeout(cloudSb.auth.signUp({ email, password: pass, options: { emailRedirectTo: cloudRedirectUrl() } }));
        if (error) throw error;
        if (data.session) {   // 主控台關閉「Confirm email」時，註冊完直接登入
            closeDialog();
            await cloudOnSignedIn(data.user, false);
        } else if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) {
            cloudFormMsg('這個 Email 已經註冊過，請直接登入', true);
        } else {
            cloudFormMsg('註冊成功！請用這台裝置的這個瀏覽器打開信箱裡的確認連結（用別台開啟也會完成驗證，回來這裡登入即可）。');
        }
    } catch (e) { cloudFormMsg(cloudErrText(e), true); }
}

async function cloudSignInGoogle() {
    try {
        const { error } = await cloudSb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: cloudRedirectUrl() } });
        if (error) throw error;
    } catch (e) { cloudFormMsg(cloudErrText(e), true); }
}

function cloudStatusText() {
    if (!cloudLoggedIn()) return '';
    if (cloudBan) return '⛔ 帳號已停權';
    if (cloudBusy) return '同步中…';
    if (Object.keys(cloudConflict).length) return '⚠️ 有角色的雲端進度衝突';
    if (cloudError) return '⚠️ ' + cloudError;
    if (cloudDirty.size) return '有新進度，稍後自動上傳';
    return cloudLastSync ? '已同步（' + agoText(cloudLastSync) + '）' : '已登入';
}

function openCloudAccount() {
    openDialog('☁️ 雲端帳號', `<p>帳號：<b>${esc(cloudUser.email)}</b></p>
        <p>狀態：${esc(cloudStatusText())}</p>
        <p class="muted">遊戲每分鐘自動上傳進度，回標題畫面或關閉頁面時也會上傳。<br>
        同一個角色請不要在兩台裝置同時玩，否則會出現「進度衝突」要你選擇保留哪一邊。</p>
        <p class="muted">⚠️ 不要把網址列很長、帶有 <code>access_token</code> 或 <code>code=</code> 的網址傳給別人。懷疑別人登入過你的帳號：按「登出所有裝置」並改密碼。</p>`,
        [{ text: '關閉', cls: 'secondary' }, { text: '🚪 登出所有裝置', cls: 'danger', onClick: () => cloudSignOut(true) }, { text: '登出', cls: 'danger', onClick: () => cloudSignOut(false) }, { text: '立即同步', onClick: cloudSyncNow }]);
}

async function cloudSyncNow() {
    if (!cloudLoggedIn()) return;
    if (player) {
        saveGame();
        cloudDirty.add(currentSlot);
        const ok = await cloudFlush(true);
        showToast(ok ? '☁️ 已上傳目前進度' : '☁️ 上傳失敗：' + (cloudError || '請稍後再試'));
        refreshUI();
    } else {
        const r = await cloudSync();
        if (r) showToast(r);
    }
}

// 登出：先上傳，再把這台裝置的角色移除（都在雲端，下次登入自動下載）
// all＝登出所有裝置（signOut scope global：這個帳號在每台裝置的登入一起失效，別人拿到的登入狀態也會被踢掉）
async function cloudSignOut(all) {
    if (!cloudLoggedIn()) return;
    if (player) { showToast('請先回標題畫面再登出'); return; }
    showToast('上傳進度中…');
    const ok = await cloudFlush(true);
    const what = all ? '所有裝置（包含這台）都會登出，別人登入中的也會被踢掉。' : '';
    const msg = ok ? what + '登出後，這台裝置上的角色會移除（都已存在雲端，下次登入會自動下載）。\n確定登出？'
        : '⚠️ 有進度還沒上傳成功（' + (cloudError || '網路問題') + '），現在登出會遺失這些進度！\n' + what + '確定登出？';
    gameConfirm(all ? '登出所有裝置' : '登出', msg, () => cloudDoSignOut(all), '登出');
}

async function cloudDoSignOut(all) {
    cloudSigningOut = true;
    try { await cloudDoSignOutRun(all); } finally { cloudSigningOut = false; }
}
async function cloudDoSignOutRun(all) {
    onlineStop();
    try { await cloudTimeout(cloudSb.rpc('online_release')); } catch (e) { }   // 讓別台馬上可以登入
    const bak = {};
    for (let i = 0; i < MAX_SLOTS; i++) { const raw = cloudLs(slotKey(i)); if (raw) bak[i] = raw; }
    cloudLs(CLOUD_BAK_KEY, JSON.stringify({ t: Date.now(), owner: cloudUser.id, saves: bak }));
    try {
        const { error } = await cloudTimeout(cloudSb.auth.signOut({ scope: all ? 'global' : 'local' }));
        if (error) throw error;
    } catch (e) {
        console.warn('登出失敗', e);
        if (all) { gameAlert('登出所有裝置', '沒有成功（' + cloudErrText(e) + '），其他裝置可能還在登入中。請確認網路後再試一次。'); return; }
    }
    for (let i = 0; i < MAX_SLOTS; i++) cloudLs(slotKey(i), null);
    cloudLs(CLOUD_OWNER_KEY, null);
    cloudLs(CLOUD_SEEN_KEY, null);
    cloudUser = null; cloudBan = null; cloudBanShown = false;
    myClan = null; myClanRole = null; clanLoaded = false; clanViewLoaded = false; clanList = null;
    cloudKnown = {}; cloudSentT = {}; cloudDirty = new Set(); cloudConflict = {}; cloudError = '';
    showTitle();
    showToast(all ? '已登出所有裝置，建議順便改密碼' : '已登出');
}

// ───────── 畫面 ─────────
// 標題畫面的帳號按鈕
function renderCloudEntry() {
    const b = document.getElementById('btn-cloud');
    if (!b) return;
    b.classList.toggle('hidden', !isCloudConfigured());
    if (!isCloudConfigured()) return;
    if (!cloudReady) b.innerHTML = '☁️ 雲端連線中…';
    else if (cloudUser) b.innerHTML = `☁️ 雲端帳號<br><small>${esc(cloudUser.email)}・${esc(cloudStatusText())}</small>`;
    else b.innerHTML = '☁️ 登入／註冊<br><small>雲端存檔，換裝置也能玩</small>';
}

// 設定分頁的「雲端存檔」區塊
function cloudSettingsHtml() {
    if (!isCloudConfigured()) return '';
    const body = cloudLoggedIn()
        ? `<p style="margin:0">帳號：<b>${esc(cloudUser.email)}</b><br>狀態：${esc(cloudStatusText())}</p>
           <div class="btn-row"><button onclick="cloudSyncNow()">☁️ 立即上傳</button></div>
           <small class="muted">每分鐘自動上傳。要登出請回標題畫面按「☁️ 雲端帳號」。</small>`
        : `<p style="margin:0">尚未登入，存檔只在這台裝置。</p>
           <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div>
           <small class="muted">登入後目前所有角色會自動上傳到雲端。</small>`;
    return `<div class="panel"><h4>☁️ 雲端存檔</h4>${body}</div>`;
}

function cloudLoginFromGame() {
    backToTitle();
    openCloudDialog();
}

// 離開頁面／切到背景時盡量上傳（不保證完成，下次開啟同步時會補上）
document.addEventListener('visibilitychange', () => { if (document.hidden) cloudFlush(true); });
