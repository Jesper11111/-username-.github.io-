// 修仙留言板（ARCHITECTURE.md 第 57 節；設定在 config-leaderboard.js 的 MSGBOARD_*，GM 管理在 gm.html「💬 留言板」）
// 放在大道石碑（戰力榜視窗）的第三個分頁；打開時才讀最新 50 則，不即時推送（省 Firebase 讀取額度）
// 送出：同一個批次寫入 留言 ＋ boardLimit/{uid}（最後留言時間），規則要求兩者同時成立，且距上次 ≥ 60 秒 → 每人每 60 秒一則由雲端強制

let mbBoardRows = null;      // 最近一次讀到的留言
let mbBoardMuted = null;     // 自己是否被 GM 禁言（null = 還沒查）
let mbBoardLastPost = 0;     // 本機記錄的上次留言時間（按鈕倒數用；真正限制在雲端規則）

async function fetchMsgBoard() {
    const { db, uid } = await initLeaderboardBackend();
    const snap = await db.collection(MSGBOARD_COLLECTION).orderBy('createdAt', 'desc').limit(MSGBOARD_SHOW_N).get();
    if (mbBoardMuted === null) {
        try { mbBoardMuted = (await db.collection(MSGBOARD_MUTED_COLLECTION).doc(uid).get()).exists; } catch (e) { /* 查不到先當作沒被禁言 */ }
    }
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
}

// 髒話換成＊（玩家端過濾，可被繞過；真的惡意留言靠 GM 刪除與禁言）
function filterBoardText(s) {
    let t = String(s || '').replace(/[\r\n\t]+/g, ' ').trim();
    MSGBOARD_BLOCKED_WORDS.forEach(w => {
        if (!w) return;
        t = t.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '＊'.repeat(w.length));
    });
    return t.slice(0, MSGBOARD_MAX_LEN);
}

async function postBoardMessage() {
    const input = document.getElementById('board-input');
    const text = filterBoardText(input && input.value);
    if (!text) return;
    if (lbBanned || mbBoardMuted) { gameAlert('你已被禁止留言。'); return; }
    const wait = Math.ceil(MSGBOARD_COOLDOWN_SEC - (Date.now() - mbBoardLastPost) / 1000);
    if (wait > 0) { gameAlert(`留言太快了，請 ${wait} 秒後再試。`); return; }
    const btn = document.getElementById('board-send');
    if (btn) btn.disabled = true;
    try {
        const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
        const ts = firebase.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();
        batch.set(db.collection(MSGBOARD_LIMIT_COLLECTION).doc(uid), { lastAt: ts });
        batch.set(db.collection(MSGBOARD_COLLECTION).doc(), {
            uid, name: sanitizePlayerName(player.name) || "無名修士",
            realm: Math.floor(player.realmIndex) || 0, stage: Math.floor(player.stage) || 1,
            text, createdAt: ts
        });
        await lbWithTimeout(batch.commit());
        mbBoardLastPost = Date.now();
        if (input) input.value = '';
        updateBoardCounter();
        mbBoardRows = await lbWithTimeout(fetchMsgBoard());
    } catch (e) {
        console.warn("留言失敗：", e);
        gameAlert(e && e.code === 'permission-denied'
            ? `留言失敗：每 ${MSGBOARD_COOLDOWN_SEC} 秒只能留言一次，或你已被禁止留言。`
            : '連線失敗，請稍後再試。');
    } finally {
        if (btn) btn.disabled = false;
    }
    renderLeaderboard(false);
}

async function deleteBoardMessage(id) {
    if (!(await gameConfirm('刪除這則留言？'))) return;
    try {
        const { db } = await lbWithTimeout(initLeaderboardBackend());
        await lbWithTimeout(db.collection(MSGBOARD_COLLECTION).doc(id).delete());
        mbBoardRows = (mbBoardRows || []).filter(r => r.id !== id);
    } catch (e) { console.warn(e); gameAlert('刪除失敗，請稍後再試。'); }
    renderLeaderboard(false);
}

function updateBoardCounter() {
    const input = document.getElementById('board-input'), cnt = document.getElementById('board-count');
    if (input && cnt) cnt.textContent = `${input.value.length} / ${MSGBOARD_MAX_LEN}`;
}

// 大道石碑「💬 留言板」分頁內容（leaderboard.js 的 renderLeaderboard 呼叫）
function msgBoardHtml(loading) {
    let myUid = null;
    try { myUid = firebase.auth().currentUser.uid; } catch (e) { /* SDK 還沒載入 */ }
    const blocked = lbBanned || mbBoardMuted;
    const form = blocked
        ? `<p class="lb-note" style="color:#f87171;">⛔ 你已被禁止留言。</p>`
        : `<div class="board-form">
               <textarea id="board-input" maxlength="${MSGBOARD_MAX_LEN}" rows="2" placeholder="說點什麼吧…（每 ${MSGBOARD_COOLDOWN_SEC} 秒一則，最多 ${MSGBOARD_MAX_LEN} 字）" oninput="updateBoardCounter()"></textarea>
               <div class="board-form-row"><span id="board-count" class="lb-note">0 / ${MSGBOARD_MAX_LEN}</span>
               <button id="board-send" class="sys-btn" onclick="postBoardMessage()">📨 留言</button></div>
           </div>`;
    let list;
    if (lbError) list = `<p class="lb-note">${lbEscape(lbError)}</p>`;
    else if (loading && !mbBoardRows) list = `<p class="lb-note">讀取中…</p>`;
    else if (!mbBoardRows || !mbBoardRows.length) list = `<p class="lb-note">還沒有人留言，來當第一個吧！</p>`;
    else list = mbBoardRows.map(r => `
        <div class="board-msg${r.uid === myUid ? ' mine' : ''}">
            <div class="board-head"><b>${lbEscape(r.name)}</b><span>${lbEscape(realms[r.realm] || '')} ${Number(r.stage) || 1} 階・${lbTimeAgo(r.createdAt) || '剛剛'}</span>
                ${r.uid === myUid ? `<button class="board-del" onclick="deleteBoardMessage('${lbEscape(r.id)}')" title="刪除">✕</button>` : ''}</div>
            <div class="board-text">${lbEscape(r.text)}</div>
        </div>`).join('');
    return form + `<div class="board-list">${list}</div>
        <p class="lb-note">顯示最新 ${MSGBOARD_SHOW_N} 則；請友善發言，不當留言會被管理者刪除或禁言。</p>`;
}
