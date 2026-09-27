// 仙府信箱與兌換碼（ARCHITECTURE.md 第 56 節；設定在 config-mailbox.js，GM 在 gm.html「📮 發放獎勵」寄信／建代碼）
// 共用戰力榜的 Firebase 連線（leaderboard.js 的 initLeaderboardBackend）；戰力榜未開通時信箱也不連網。
// 領取流程：先在雲端建立領取紀錄（規則保證每封信／每組代碼每個帳號只能建立一次）→ 成功才把獎勵加進存檔並立即存檔
// 存檔：player.mailClaimed = [已領的信 id]（本機快取，少讀雲端；真正防重複靠雲端規則）

let mbMails = [];            // 目前可領的信（未過期、未領）
let mbLoading = false;
let mbError = "";
let mbLastRefresh = 0;

function isMailboxAvailable() {
    return isLeaderboardConfigured();
}

// ---- 讀信 ----
async function refreshMailbox(force) {
    if (!isMailboxAvailable() || !gameStarted || gameOver || saveLoadFailed) return;
    if (mbLoading || (!force && Date.now() - mbLastRefresh < 60000)) return;
    mbLoading = true; mbError = "";
    try {
        const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
        const snap = await lbWithTimeout(db.collection(MAIL_COLLECTION).where('to', 'in', ['all', uid]).get());
        const now = Date.now(), claimed = new Set(player.mailClaimed || []);
        const list = snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
            .filter(m => !claimed.has(m.id) && !(m.expiresAt && m.expiresAt.toMillis && m.expiresAt.toMillis() < now));
        // 本機沒有領取紀錄的（換過瀏覽器、清過資料），再到雲端確認一次
        const checks = await Promise.all(list.map(m => db.collection(MAIL_CLAIMS_COLLECTION).doc(`${uid}_${m.id}`).get().then(s => s.exists).catch(() => false)));
        list.forEach((m, i) => { if (checks[i]) markMailClaimed(m.id); });
        const before = new Set(mbMails.map(m => m.id));
        mbMails = list.filter((m, i) => !checks[i]).sort((a, b) => mbTime(b.createdAt) - mbTime(a.createdAt));
        const fresh = mbMails.filter(m => !before.has(m.id));
        if (fresh.length && mbLastRefresh) addLog(`📮 仙府信箱收到 ${fresh.length} 封新信！（右上 ⚙️ 設定 →「📮 仙府信箱」領取）`, "system");
        else if (fresh.length) addLog(`📮 仙府信箱有 ${mbMails.length} 封信待領取（右上 ⚙️ 設定 →「📮 仙府信箱」）`, "system");
        mbLastRefresh = Date.now();
    } catch (e) {
        mbError = e && e.code === 'permission-denied' ? '信箱尚未開放（伺服器設定更新中）' : '連線失敗，請稍後再試';
        console.warn("仙府信箱讀取失敗：", e);
    } finally {
        mbLoading = false;
        updateMailboxBadge();
        if (document.getElementById('mailbox-modal').style.display === 'flex') renderMailbox();
    }
}
function mbTime(ts) { return ts && ts.toMillis ? ts.toMillis() : 0; }
function markMailClaimed(id) {
    if (!Array.isArray(player.mailClaimed)) player.mailClaimed = [];
    if (!player.mailClaimed.includes(id)) player.mailClaimed.push(id);
}
function startMailboxSync() {
    if (!isMailboxAvailable()) return;
    setTimeout(() => refreshMailbox(true), LEADERBOARD_FIRST_UPLOAD_DELAY_MS + 5000);
    setInterval(() => refreshMailbox(true), MAIL_REFRESH_MS);
}

// ---- 獎勵 ----
function mbAmount(v) {
    const n = Math.floor(Number(v));
    return isFinite(n) && n > 0 ? Math.min(n, MAIL_REWARD_MAX) : 0;
}
// 獎勵文字（信件、兌換碼、日誌共用），例：「💎 靈石 100萬、👤 傳說僕從 ×1」
function formatMailRewards(r) {
    r = r || {};
    const parts = MAIL_REWARD_FIELDS.filter(f => mbAmount(r[f.key])).map(f => `${f.icon} ${f.label} ${mbAmount(r[f.key]).toWan()}`);
    Object.entries(r.blueprints || {}).forEach(([k, n]) => { if (mbAmount(n)) parts.push(`📜 ${k.replace('_', '・')} 等圖紙 ×${mbAmount(n)}`); });
    Object.entries(r.servants || {}).forEach(([q, n]) => { if (mbAmount(n)) parts.push(`👤 ${q}僕從 ×${mbAmount(n)}`); });
    // 先天資質（aptitude：{ root: { group, id?, elems? }, physique: id }）
    const apt = r.aptitude || {};
    const rd = apt.root && describeRoot(apt.root), pd = apt.physique && describePhysique(apt.physique);
    if (rd) parts.push(`⛩️ 先天靈根【${rd.name}】`);
    if (pd) parts.push(`⛩️ 先天體質【${pd.name}】`);
    return parts.join('、') || '（無獎勵）';
}
function countMailServants(r) {
    return Object.values((r && r.servants) || {}).reduce((a, n) => a + mbAmount(n), 0);
}
// 領取前檢查：僕從要有空位
function checkMailRewardSpace(r) {
    const n = countMailServants(r);
    if (n && (player.servants || []).length + n > MAX_SERVANTS) return `僕從小屋空位不足（需要 ${n} 個，上限 ${MAX_SERVANTS} 名），請先解僱一些僕從再領取。`;
    return '';
}
function grantMailRewards(r) {
    r = r || {};
    MAIL_REWARD_FIELDS.forEach(f => { const n = mbAmount(r[f.key]); if (n) player[f.field] = (player[f.field] || 0) + n; });
    if (mbAmount(r.merit)) settleMeritStones();   // 功德滿額自動凝結七彩補天石
    Object.entries(r.blueprints || {}).forEach(([k, n]) => {
        n = mbAmount(n);
        if (!n) return;
        if (!player.blueprints || typeof player.blueprints !== 'object') player.blueprints = {};
        player.blueprints[k] = (player.blueprints[k] || 0) + n;
    });
    Object.entries(r.servants || {}).forEach(([q, n]) => {
        const quality = servantQualities.find(x => x.name === q);
        if (!quality) return;
        for (let i = 0; i < mbAmount(n); i++) player.servants.push(createMailServant(quality));
    });
    // 先天資質：已測過的跳出比較讓玩家選；還沒測的存起來，測試時直接採用（aptitude.js）
    if (r.aptitude) setTimeout(() => offerAptitudeGift(r.aptitude), 300);
}
// 同 combat.js 的 tryRescueServant 產生的僕從格式
function createMailServant(quality) {
    return {
        id: Date.now() + "_" + Math.random().toString(36).slice(2, 10),
        name: servantNames[Math.floor(Math.random() * servantNames.length)] + " (僕從)",
        quality: quality.name, mult: quality.mult, quest: null, timer: 0
    };
}

// ---- 領信 ----
async function claimMail(id) {
    const m = mbMails.find(x => x.id === id);
    if (!m) return;
    const space = checkMailRewardSpace(m.rewards);
    if (space) { alert(space); return; }
    try {
        const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
        // 規則：只能建立一次（已存在會變成「更新」而被拒絕）
        await lbWithTimeout(db.collection(MAIL_CLAIMS_COLLECTION).doc(`${uid}_${id}`).set({
            uid, mailId: id, at: firebase.firestore.FieldValue.serverTimestamp()
        }));
    } catch (e) {
        console.warn("領取失敗：", e);
        if (e && e.code === 'permission-denied') {   // 已領過（或信件已過期、被刪除）
            markMailClaimed(id);
            mbMails = mbMails.filter(x => x.id !== id);
            alert('這封信已經領取過，或已過期失效。');
        } else alert('連線失敗，請稍後再試。');
        renderMailbox(); updateMailboxBadge();
        return;
    }
    grantMailRewards(m.rewards);
    markMailClaimed(id);
    mbMails = mbMails.filter(x => x.id !== id);
    addLog(`📮 領取信件【${m.title || '仙府來信'}】：${formatMailRewards(m.rewards)}`, "level-up", false, "item");
    saveLocal();
    updateUI();
    renderMailbox(); updateMailboxBadge();
}

// ---- 兌換碼 ----
function normalizeRedeemCode(s) {
    return String(s || '').trim().toUpperCase().replace(/\s+/g, '');
}
async function redeemCode() {
    const input = document.getElementById('redeem-code-input');
    const code = normalizeRedeemCode(input && input.value);
    if (!code) return;
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) { alert('兌換碼格式不正確（英文、數字、- 或 _，3～40 字）。'); return; }
    let db, uid, info;
    try {
        ({ db, uid } = await lbWithTimeout(initLeaderboardBackend()));
        const snap = await lbWithTimeout(db.collection(CODE_COLLECTION).doc(code).get());
        if (!snap.exists) { alert('兌換碼無效。'); return; }
        info = snap.data();
    } catch (e) { console.warn(e); alert(e && e.code === 'permission-denied' ? '兌換碼功能尚未開放。' : '連線失敗，請稍後再試。'); return; }
    if (info.expiresAt && info.expiresAt.toMillis && info.expiresAt.toMillis() < Date.now()) { alert('此兌換碼已過期。'); return; }
    const space = checkMailRewardSpace(info.rewards);
    if (space) { alert(space); return; }
    try {
        await lbWithTimeout(db.collection(CODE_CLAIMS_COLLECTION).doc(`${uid}_${code}`).set({
            uid, code, at: firebase.firestore.FieldValue.serverTimestamp()
        }));
    } catch (e) {
        console.warn(e);
        alert(e && e.code === 'permission-denied' ? '此兌換碼你已經兌換過了。' : '連線失敗，請稍後再試。');
        return;
    }
    grantMailRewards(info.rewards);
    addLog(`🎟️ 兌換碼【${code}】${info.title ? `（${info.title}）` : ''}：${formatMailRewards(info.rewards)}`, "level-up", false, "item");
    if (input) input.value = '';
    saveLocal();
    updateUI();
    alert(`兌換成功！\n${formatMailRewards(info.rewards)}`);
}

// ---- 畫面 ----
function openMailbox() {
    document.getElementById('mailbox-modal').style.display = 'flex';
    renderMailbox();
    refreshMailbox(false);
}
function renderMailbox() {
    const box = document.getElementById('mailbox-list');
    if (!box) return;
    if (!isMailboxAvailable()) { box.innerHTML = '<p class="mb-note">仙府信箱尚未開通。</p>'; return; }
    const head = mbLoading ? '<p class="mb-note">讀取中…</p>' : mbError ? `<p class="mb-note" style="color:#f87171;">${lbEscape(mbError)}</p>` : '';
    const cards = mbMails.map(m => `
        <div class="card" style="text-align:left; border-color: var(--accent);">
            <h3 style="margin:0 0 4px; color: var(--accent);">📜 ${lbEscape(m.title || '仙府來信')}</h3>
            ${m.body ? `<p style="font-size:0.85em; color:#e5e7eb; white-space:pre-wrap; margin:4px 0;">${lbEscape(m.body)}</p>` : ''}
            <p style="font-size:0.85em; color:#facc15; margin:4px 0;">${lbEscape(formatMailRewards(m.rewards))}</p>
            <p style="font-size:0.75em; color:#6b7280; margin:2px 0;">${m.to === 'all' ? '全服信件' : '個人信件'}${m.expiresAt && m.expiresAt.toMillis ? `｜${new Date(m.expiresAt.toMillis()).toLocaleDateString('zh-TW')} 前領取` : ''}</p>
            <button class="sys-btn" onclick="claimMail('${lbEscape(m.id)}')">🎁 領取</button>
        </div>`).join('');
    box.innerHTML = head + (cards || (mbLoading || mbError ? '' : '<p class="mb-note">目前沒有待領取的信件。</p>'));
}
function updateMailboxBadge() {
    const btn = document.getElementById('mailbox-open-btn');
    if (btn) btn.innerText = `📮 仙府信箱${mbMails.length ? `（${mbMails.length} 封待領）` : ''}`;
}
