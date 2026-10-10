// 屠龍勇者：帳號登入＋雲端存檔（Supabase；ARCHITECTURE.md 第 29 節）
// 依賴 config、save（slotKey／hasSave…），執行期才呼叫 ui（openDialog／showToast）與 ui-create（showTitle）。
// 原則：localStorage 仍是主要存檔（遊戲每次存檔照舊寫本機），登入後再「定時上傳」到雲端；
//       雲端連不上時遊戲完全不受影響。安全性靠資料表的 RLS 規則（tools/supabase.sql），不靠隱藏金鑰。

// ⚠️ 兩個設定都填好才啟用；空字串＝不載入 SDK、不連網、標題畫面沒有登入按鈕
// （Project URL 與 publishable／anon key 本來就是公開的，可以放在程式裡）
const CLOUD_SUPABASE_URL = '';
const CLOUD_SUPABASE_KEY = '';
const CLOUD_GOOGLE = false;          // 啟用 Google 登入（要先在 Supabase 主控台設定 Google 提供者）
const CLOUD_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js';
const CLOUD_TABLE = 'dragon_saves';
const CLOUD_AUTH_KEY = 'dragonSlayer_auth';         // 登入狀態（SDK 自己存，與修仙同網域所以要有前綴）
const CLOUD_OWNER_KEY = 'dragonSlayer_cloud_owner'; // 這台裝置的角色屬於哪個帳號（uid）
const CLOUD_DEL_KEY = 'dragonSlayer_cloud_del';     // 還沒成功刪除雲端的角色（created 清單）
const CLOUD_BAK_KEY = 'dragonSlayer_cloud_bak';     // 同步改寫本機存檔前的備份（只留最近一次）
const CLOUD_PUSH_MS = 60 * 1000;     // 兩次上傳至少間隔（同一角色）
const CLOUD_TIMEOUT_MS = 10 * 1000;

let cloudSb = null;          // Supabase client
let cloudUser = null;        // { id, email }
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
            auth: { storageKey: CLOUD_AUTH_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        const { data } = await cloudSb.auth.getSession();
        cloudReady = true;
        if (data && data.session) await cloudOnSignedIn(data.session.user, true);
        // Google 登入跳轉回來、或在其他分頁登出時
        cloudSb.auth.onAuthStateChange((ev, session) => {
            const u = session && session.user;
            if (u && (!cloudUser || cloudUser.id !== u.id)) setTimeout(() => cloudOnSignedIn(u, false), 0);
            else if (ev === 'SIGNED_OUT' && cloudUser) { cloudUser = null; renderCloudEntry(); }
        });
    } catch (e) {
        cloudReady = true;
        cloudError = cloudErrText(e);
        console.warn('雲端存檔無法啟用', e);
    }
    renderCloudEntry();
    setInterval(cloudAutoPush, 15 * 1000);
}

async function cloudOnSignedIn(u, silent) {
    cloudUser = { id: u.id, email: u.email || '' };
    renderCloudEntry();
    const r = await cloudSync();
    if (!silent && r) showToast(r);
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
    try { const data = JSON.parse(raw); return data && data.player ? { raw, data, id: cloudCharId(data), t: data.t || 0 } : null; }
    catch (e) { return null; }
}

async function cloudSync() {
    if (!cloudLoggedIn() || cloudBusy) return '';
    cloudBusy = true;
    cloudError = '';
    renderCloudEntry();
    try {
        const { data: rows, error } = await cloudTimeout(cloudSb.from(CLOUD_TABLE).select('slot, client_t, data'));
        if (error) throw error;
        const uid = cloudUser.id, owner = cloudLs(CLOUD_OWNER_KEY);
        const playing = player ? currentSlot : -1;   // 遊戲中的角色本機為準，不覆蓋
        const pendingDel = JSON.parse(cloudLs(CLOUD_DEL_KEY) || '[]');
        const cloud = [];
        for (const r of rows || []) if (r.slot >= 0 && r.slot < MAX_SLOTS && r.data && r.data.player) cloud[r.slot] = { data: r.data, t: r.client_t, id: cloudCharId(r.data) };
        cloudKnown = {};
        for (let i = 0; i < MAX_SLOTS; i++) cloudKnown[i] = cloud[i] ? cloud[i].t : null;
        // 上次在這台裝置刪掉、雲端還沒刪成功的角色
        for (let i = 0; i < MAX_SLOTS; i++) if (cloud[i] && pendingDel.includes(cloud[i].id) && owner === uid && i !== playing) {
            await cloudSb.from(CLOUD_TABLE).delete().eq('slot', i);
            cloud[i] = null; cloudKnown[i] = null;
        }
        cloudLs(CLOUD_DEL_KEY, null);

        const local = [];
        for (let i = 0; i < MAX_SLOTS; i++) local[i] = cloudReadLocal(i);
        const final = [];
        for (let i = 0; i < MAX_SLOTS; i++) {
            const c = cloud[i];
            // 本機同欄位就是同一份（同角色、同時間）：沿用本機文字，不必改寫（jsonb 會改變欄位順序）
            final[i] = c ? { data: c.data, t: c.t, id: c.id, raw: local[i] && local[i].id === c.id && local[i].t === c.t ? local[i].raw : null } : null;
        }
        const upload = new Set(), conflicts = [];
        let added = 0, newer = 0, lost = 0;
        const sameOwner = !owner || owner === uid;
        for (let i = 0; i < MAX_SLOTS; i++) {
            const L = local[i];
            if (!L) continue;
            if (i === playing) {   // 遊戲中的角色固定在原欄位
                if (final[i] && final[i].id !== L.id) {
                    const j = final.indexOf(null);
                    if (j >= 0) final[j] = final[i]; else lost++;
                }
                const same = final[i] && final[i].id === L.id;
                if (same && final[i].t > L.t) conflicts.push(i);   // 別台裝置有更新的進度：不能直接蓋掉
                else if (cloudKnown[i] !== L.t) upload.add(i);
                final[i] = { data: L.data, t: L.t, id: L.id, raw: L.raw };
                continue;
            }
            if (!sameOwner) continue;
            const j = final.findIndex(f => f && f.id === L.id);
            if (j >= 0) {
                if (L.t > final[j].t) { final[j] = { data: L.data, t: L.t, id: L.id, raw: L.raw }; upload.add(j); newer++; }
            } else {
                const k = !final[i] ? i : final.indexOf(null);
                if (k < 0) { lost++; continue; }
                final[k] = { data: L.data, t: L.t, id: L.id, raw: L.raw };
                upload.add(k); added++;
            }
        }
        if (lost) {   // 欄位不夠放：不改本機，請玩家先刪角色
            cloudError = `角色超過 ${MAX_SLOTS} 個欄位，無法合併`;
            gameAlert('雲端存檔', `這台裝置與雲端的角色加起來超過 ${MAX_SLOTS} 個欄位，這次沒有合併。\n請先在人物選單刪除不需要的角色，或登出後再登入。`);
            return '';
        }
        // 改寫本機前先備份整份
        let changed = false;
        for (let i = 0; i < MAX_SLOTS; i++) {
            const want = final[i] ? (final[i].raw || JSON.stringify(final[i].data)) : null;
            if ((local[i] ? local[i].raw : null) !== want) changed = true;
        }
        if (changed) {
            const bak = {};
            for (let i = 0; i < MAX_SLOTS; i++) if (local[i]) bak[i] = local[i].raw;
            cloudLs(CLOUD_BAK_KEY, JSON.stringify({ t: Date.now(), owner, saves: bak }));
            for (let i = 0; i < MAX_SLOTS; i++) {
                if (i === playing) continue;
                const want = final[i] ? (final[i].raw || JSON.stringify(final[i].data)) : null;
                if ((local[i] ? local[i].raw : null) === want) continue;
                if (want) cloudLs(slotKey(i), want); else cloudLs(slotKey(i), null);
            }
        }
        cloudLs(CLOUD_OWNER_KEY, uid);
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
    if (!cloudLoggedIn() || !cloudDirty.size) return true;
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
        try {
            const r = await cloudPushSlot(i, false);
            if (r) cloudDirty.delete(i); else ok = false;
        } catch (e) {
            ok = false;
            cloudError = cloudErrText(e);
            console.warn('雲端上傳失敗', e);
        }
    }
    if (ok) { cloudError = ''; cloudLastSync = Date.now(); }
    renderCloudEntry();
    return ok;
}

// 上傳一個欄位。雲端那筆必須還是上次看到的版本（client_t），否則代表別台裝置有新進度 → 衝突
async function cloudPushSlot(i, overwrite) {
    const raw = cloudLs(slotKey(i));
    if (!raw) return true;
    const data = JSON.parse(raw), p = data.player, t = data.t || 0;
    const row = { slot: i, client_t: t, name: String(p.name || '').slice(0, 40), cls: p.cls, lv: p.lv | 0, data };
    const known = cloudKnown[i];
    let res;
    if (overwrite) {
        res = await cloudTimeout(cloudSb.from(CLOUD_TABLE).upsert(Object.assign({ user_id: cloudUser.id }, row)).select('slot'));
    } else if (known == null) {
        res = await cloudTimeout(cloudSb.from(CLOUD_TABLE).insert(Object.assign({ user_id: cloudUser.id }, row)).select('slot'));
        if (res.error && (res.error.code === '23505' || /duplicate/i.test(res.error.message))) return cloudOnConflict(i);
    } else {
        res = await cloudTimeout(cloudSb.from(CLOUD_TABLE).update(row).eq('slot', i).eq('client_t', known).select('slot'));
        if (!res.error && (!res.data || !res.data.length)) return cloudOnConflict(i);
    }
    if (res.error) throw res.error;
    cloudKnown[i] = t;
    delete cloudConflict[i];
    return true;
}

function cloudOnConflict(i) {
    cloudConflict[i] = true;
    cloudError = '雲端有其他裝置的新進度';
    if (player && i === currentSlot) {
        openDialog('☁️ 進度衝突', `<p>「${esc(player.name)}」在<b>另一台裝置</b>有比較新的雲端進度（可能同時在兩台裝置玩）。</p>
            <p>請選擇要保留哪一邊，另一邊的進度會被覆蓋。</p>`,
            [{ text: '用雲端的進度', onClick: cloudUseCloudSlot }, { text: '用這台的進度', cls: 'secondary', onClick: cloudUseLocalSlot }]);
    }
    return false;
}

async function cloudUseLocalSlot() {
    const i = currentSlot;
    saveGame();
    try { await cloudPushSlot(i, true); cloudDirty.delete(i); showToast('☁️ 已用這台的進度覆蓋雲端'); }
    catch (e) { showToast('☁️ 上傳失敗：' + cloudErrText(e)); }
    renderCloudEntry();
}

async function cloudUseCloudSlot() {
    const i = currentSlot;
    try {
        const { data, error } = await cloudTimeout(cloudSb.from(CLOUD_TABLE).select('client_t, data').eq('slot', i).maybeSingle());
        if (error) throw error;
        if (!data) { showToast('雲端沒有這個角色'); return; }
        cloudLs(CLOUD_BAK_KEY, JSON.stringify({ t: Date.now(), owner: cloudUser.id, saves: { [i]: cloudLs(slotKey(i)) } }));
        hunt = null; session = null; walkHome = null;
        player = null;
        cloudLs(slotKey(i), JSON.stringify(data.data));
        cloudKnown[i] = data.client_t;
        delete cloudConflict[i];
        cloudDirty.delete(i);
        continueGame();
        showToast('☁️ 已載入雲端進度');
    } catch (e) { showToast('☁️ 下載失敗：' + cloudErrText(e)); }
    renderCloudEntry();
}

// 刪除角色時：雲端也刪；失敗記下來，下次同步再刪
function cloudDeleteSlot(i, raw) {
    cloudDirty.delete(i);
    delete cloudConflict[i];
    if (!cloudLoggedIn() || !raw) return;
    let id = '';
    try { id = cloudCharId(JSON.parse(raw)); } catch (e) { }
    cloudKnown[i] = null;
    cloudTimeout(cloudSb.from(CLOUD_TABLE).delete().eq('slot', i)).then(r => { if (r.error) throw r.error; }).catch(e => {
        console.warn('雲端刪除失敗', e);
        const list = JSON.parse(cloudLs(CLOUD_DEL_KEY) || '[]');
        if (id && !list.includes(id)) list.push(id);
        cloudLs(CLOUD_DEL_KEY, JSON.stringify(list));
    });
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
        const { data, error } = await cloudTimeout(cloudSb.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.href.split('#')[0] } }));
        if (error) throw error;
        if (data.session) {   // 主控台關閉「Confirm email」時，註冊完直接登入
            closeDialog();
            await cloudOnSignedIn(data.user, false);
        } else if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) {
            cloudFormMsg('這個 Email 已經註冊過，請直接登入', true);
        } else {
            cloudFormMsg('註冊成功！請到信箱點確認連結，再回來登入。');
        }
    } catch (e) { cloudFormMsg(cloudErrText(e), true); }
}

async function cloudSignInGoogle() {
    try {
        const { error } = await cloudSb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('#')[0] } });
        if (error) throw error;
    } catch (e) { cloudFormMsg(cloudErrText(e), true); }
}

function cloudStatusText() {
    if (!cloudLoggedIn()) return '';
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
        同一個角色請不要在兩台裝置同時玩，否則會出現「進度衝突」要你選擇保留哪一邊。</p>`,
        [{ text: '關閉', cls: 'secondary' }, { text: '登出', cls: 'danger', onClick: cloudSignOut }, { text: '立即同步', onClick: cloudSyncNow }]);
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
async function cloudSignOut() {
    if (!cloudLoggedIn()) return;
    if (player) { showToast('請先回標題畫面再登出'); return; }
    showToast('上傳進度中…');
    const ok = await cloudFlush(true);
    const msg = ok ? '登出後，這台裝置上的角色會移除（都已存在雲端，下次登入會自動下載）。\n確定登出？'
        : '⚠️ 有進度還沒上傳成功（' + (cloudError || '網路問題') + '），現在登出會遺失這些進度！\n確定登出？';
    gameConfirm('登出', msg, cloudDoSignOut, '登出');
}

async function cloudDoSignOut() {
    const bak = {};
    for (let i = 0; i < MAX_SLOTS; i++) { const raw = cloudLs(slotKey(i)); if (raw) bak[i] = raw; }
    cloudLs(CLOUD_BAK_KEY, JSON.stringify({ t: Date.now(), owner: cloudUser.id, saves: bak }));
    try { await cloudTimeout(cloudSb.auth.signOut()); } catch (e) { console.warn('登出失敗', e); }
    for (let i = 0; i < MAX_SLOTS; i++) cloudLs(slotKey(i), null);
    cloudLs(CLOUD_OWNER_KEY, null);
    cloudUser = null;
    cloudKnown = {}; cloudDirty = new Set(); cloudConflict = {}; cloudError = '';
    showTitle();
    showToast('已登出');
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
