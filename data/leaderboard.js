// 天下戰力榜（第 42 節）：定時把自己的戰力上傳到 Firebase Firestore，視窗顯示所有玩家前 N 名
// 設定在 config-leaderboard.js；未設定 Firebase 時完全不連網。Firebase SDK 在第一次需要時才動態載入，不拖慢開遊戲。
// 入口：洞府 HUD（手機與 PC）的「戰力」數字 → openLeaderboardModal()

let lbBackend = null;          // Promise<{ db, uid }>，失敗會清掉以便下次重試
let lbLastUploadAt = 0;
let lbLastRefreshAt = 0;
let lbRows = null;             // 最近一次讀到的榜單
let lbError = "";
let lbBanned = null;           // null = 尚未查過；true = 被 GM 封鎖（banned/{uid}，第 50 節），不再上傳

function isLeaderboardConfigured() {
    return !!(LEADERBOARD_FIREBASE_CONFIG && LEADERBOARD_FIREBASE_CONFIG.apiKey);
}

// 榜上的戰力：與畫面「戰力」同一個數字（getPhysAttack），但扣掉暫時性的增益（禁術、靈寵增益、對決化功），避免開技能瞬間灌分
// 新制（第 52 節）：戰力 = 每回合期望輸出（nv2CombatPower）；暫時增益在新制是加進增益池（有上限），用除的不準，改成暫時關掉再算
function getRankPower() {
    if (NUMERIC_V2) return lbWithoutTempBuffs(() => nv2CombatPower());
    return lbStripTempBuffs(getPhysAttack());
}
// 守城排行榜用的攻擊：死守天南城以 max(物攻, 術攻) 判定勝負（defense.js 的 simulateWave），同樣扣掉暫時性增益
function getRankAttack() {
    if (NUMERIC_V2) return lbWithoutTempBuffs(() => Math.max(nv2PhysAttack(), nv2MagAttack()));
    return lbStripTempBuffs(Math.max(getPhysAttack(), getMagAttack()));
}
// 暫時把禁術、靈寵增益、對決化功的計時歸零來計算，算完還原
function lbWithoutTempBuffs(fn) {
    const saved = [player.buffTimer, petBuffTimer, duelWeakenTimer];
    player.buffTimer = 0; petBuffTimer = 0; duelWeakenTimer = 0;
    try { return Math.max(0, Math.floor(fn())); } finally { [player.buffTimer, petBuffTimer, duelWeakenTimer] = saved; }
}
function lbStripTempBuffs(p) {
    if (player.buffTimer > 0 && player.buffMult) p /= player.buffMult;
    if (petBuffTimer > 0 && petBuffMult) p /= petBuffMult;
    p /= getDuelWeakenMult() || 1;
    return Math.max(0, Math.floor(p));
}

function lbLoadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error("無法載入 " + src));
        document.head.appendChild(s);
    });
}

function initLeaderboardBackend() {
    if (!isLeaderboardConfigured()) return Promise.reject(new Error("戰力榜尚未開通"));
    if (lbBackend) return lbBackend;
    lbBackend = (async () => {
        // 逐一檢查三個 SDK 是否已載入（上次可能只載入一半就斷線），缺哪個補哪個
        const loaded = {
            app: () => typeof firebase !== 'undefined',
            auth: () => typeof firebase !== 'undefined' && typeof firebase.auth === 'function',
            firestore: () => typeof firebase !== 'undefined' && typeof firebase.firestore === 'function'
        };
        for (const f of ['app', 'auth', 'firestore']) {
            if (!loaded[f]()) await lbLoadScript(`${LEADERBOARD_SDK_BASE}/firebase-${f}-compat.js`);
        }
        if (!firebase.apps.length) firebase.initializeApp(LEADERBOARD_FIREBASE_CONFIG);
        const auth = firebase.auth();
        // 等匿名登入狀態從瀏覽器還原；沒有才新登入（同一個瀏覽器會一直是同一個 uid＝同一筆榜單資料）
        let user = await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
        if (!user) user = (await auth.signInAnonymously()).user;
        return { db: firebase.firestore(), uid: user.uid };
    })();
    lbBackend.catch(() => { lbBackend = null; });
    return lbBackend;
}

// 上傳自己的戰力；遊戲結束、讀檔失敗（角色不是真的）或距上次不到 60 秒時不上傳
async function uploadLeaderboard() {
    if (!isLeaderboardConfigured() || !gameStarted || gameOver || saveLoadFailed) return;
    if (lbBanned || Date.now() - lbLastUploadAt < LEADERBOARD_MIN_GAP_MS) return;
    lbLastUploadAt = Date.now();
    try {
        const { db, uid } = await initLeaderboardBackend();
        if (lbBanned === null) await checkLeaderboardBan(db, uid);
        if (lbBanned) return;
        // 先讀自己上一筆（1 次讀取）：規則要求把上一次的戰力與時間原封不動接到 hist 尾端，GM 後台據此比對戰力暴增（第 50 節）
        // 一定要讀伺服器版本，快取的舊值會被規則擋下；斷線時讀不到就跳過這次上傳
        const ref = db.collection(LEADERBOARD_COLLECTION).doc(uid);
        const prev = await ref.get({ source: 'server' });
        let hist = [], hist2 = [];
        if (prev.exists) {
            const o = prev.data(), entry = { p: o.power, t: o.updatedAt };
            hist = (Array.isArray(o.hist) ? o.hist : []).concat([entry]).slice(-LEADERBOARD_HISTORY_SIZE);
            // 兩日紀錄：距最後一筆 ≥ 30 分鐘才接上（用秒＋奈秒精確比較，與規則的時間戳比較一致）
            hist2 = Array.isArray(o.hist2) ? o.hist2 : [];
            const last = hist2[hist2.length - 1];
            if (!last || lbTsDiffNanos(o.updatedAt, last.t) >= LEADERBOARD_HISTORY2_GAP_SEC * 1e9) {
                hist2 = hist2.slice(-(LEADERBOARD_HISTORY2_SIZE - 1)).concat([entry]);
            }
        }
        await ref.set({
            name: sanitizePlayerName(player.name) || "無名修士",
            power: getRankPower(),
            realm: Math.floor(player.realmIndex) || 0,
            stage: Math.floor(player.stage) || 1,
            level: Math.floor(player.level) || 1,
            sect: player.sect ? String(player.sect.name || "").slice(0, 20) : "",
            hist,
            hist2,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn("戰力榜上傳失敗：", e);
    }
    flushDefenseSubmit();   // 上次送審失敗（斷線、60 秒內重複）的守城紀錄順便補送
}

// ================== 死守天南城排行榜（第 49、50 節）==================
// 守城刷新個人最佳 → submitDefenseRecord() 寫入 defenseSubmit/{uid}（送審）→ GM 後台比對戰力榜紀錄與該波強度，通過才寫入 defenseBoard/{uid}
// player.defensePending：尚未送出的最佳紀錄；player.defenseSubmitted：已送審的最高波數（不重複送同樣或更低的）
let lbDefenseRows = null;      // 最近一次讀到的守城榜
let lbDefenseMine = null;      // 自己送審紀錄的審核狀態（defenseSubmit/{uid}：status 'ok'／'rejected'／沒有 = 審核中）
let lbTab = 'power';

function submitDefenseRecord(run) {
    if (run.cleared <= (player.defenseSubmitted || 0)) return;
    if (player.defensePending && player.defensePending.cleared >= run.cleared) return;
    player.defensePending = run;
    flushDefenseSubmit();
}

async function flushDefenseSubmit() {
    const run = player.defensePending;
    if (!run || !isLeaderboardConfigured() || !gameStarted || gameOver || saveLoadFailed || lbBanned) return;
    if (flushDefenseSubmit.busy) return;
    flushDefenseSubmit.busy = true;
    try {
        const { db, uid } = await initLeaderboardBackend();
        if (lbBanned === null) await checkLeaderboardBan(db, uid);
        if (lbBanned) return;
        await db.collection(LEADERBOARD_DEFENSE_SUBMIT_COLLECTION).doc(uid).set({
            name: sanitizePlayerName(player.name) || "無名修士",
            best: Math.min(DEFENSE_TOTAL_WAVES, Math.floor(run.cleared)),
            atk: Math.floor(run.atk) || 0,
            power: Math.floor(run.power) || 0,
            realm: Math.floor(run.realm) || 0,
            stage: Math.floor(run.stage) || 1,
            level: Math.floor(run.level) || 1,
            kills: Math.floor(run.kills) || 0,
            runAt: Math.floor(run.at) || Date.now(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        player.defenseSubmitted = run.cleared;
        if (player.defensePending === run) player.defensePending = null;
        lbDefenseMine = null;
    } catch (e) {
        console.warn("守城紀錄送審失敗（下次上傳戰力時重試）：", e);
    } finally {
        flushDefenseSubmit.busy = false;
    }
}

// 守城介面「通關紀錄」上的一行狀態
function getDefenseRankStatusText() {
    if (!isLeaderboardConfigured()) return '';
    if (lbBanned) return '⛔ 已被移出排行榜';
    if (player.defensePending) return `🏯 守城排行榜：第 ${player.defensePending.cleared} 波紀錄等待上傳`;
    if (!player.defenseSubmitted) return '🏯 守城排行榜：尚未送審（守住至少 1 波後自動送審）';
    const m = lbDefenseMine;
    if (m && m.best === player.defenseSubmitted && m.status === 'ok') return `🏯 守城排行榜：第 ${m.best} 波已登錄`;
    if (m && m.best === player.defenseSubmitted && m.status === 'rejected') return `🏯 守城排行榜：第 ${m.best} 波未通過審核`;
    return `🏯 守城排行榜：第 ${player.defenseSubmitted} 波審核中（通過後登上大道石碑）`;
}

async function fetchDefenseBoard() {
    const { db, uid } = await initLeaderboardBackend();
    const snap = await db.collection(LEADERBOARD_DEFENSE_BOARD_COLLECTION)
        .orderBy('best', 'desc').limit(LEADERBOARD_TOP_N).get();
    // 同波數：先達成的排前面
    const rows = snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
        .sort((a, b) => (b.best - a.best) || ((a.runAt || 0) - (b.runAt || 0)));
    try {
        const mine = await db.collection(LEADERBOARD_DEFENSE_SUBMIT_COLLECTION).doc(uid).get();
        lbDefenseMine = mine.exists ? mine.data() : null;
    } catch (e) { /* 查不到審核狀態不影響榜單 */ }
    return rows;
}

function switchLeaderboardTab(tab) {
    applyLeaderboardTab(tab);
    renderLeaderboard(false);
    if (lbTab === 'defense' ? !lbDefenseRows : !lbRows) refreshLeaderboard(false);
}
function applyLeaderboardTab(tab) {
    lbTab = tab === 'defense' ? 'defense' : 'power';
    document.querySelectorAll('#leaderboard-modal [data-lb-tab]').forEach(b => b.classList.toggle('on', b.dataset.lbTab === lbTab));
    const title = document.getElementById('leaderboard-title');
    if (title) title.textContent = lbTab === 'defense' ? '🏯 死守天南城・通關榜' : '🏆 天下戰力榜';
}

// 兩個 Firestore Timestamp 相差幾奈秒（a − b）；BigInt 以免奈秒精度被浮點數吃掉
function lbTsDiffNanos(a, b) {
    return Number((BigInt(a.seconds) - BigInt(b.seconds)) * 1000000000n + BigInt(a.nanoseconds - b.nanoseconds));
}

// 查自己有沒有被 GM 封鎖（規則允許玩家讀自己的 banned/{uid}）；查不到（斷線等）先當作沒被封，下次再查
async function checkLeaderboardBan(db, uid) {
    try {
        const snap = await db.collection(LEADERBOARD_BANNED_COLLECTION).doc(uid).get();
        lbBanned = snap.exists;
    } catch (e) {
        console.warn("戰力榜黑名單查詢失敗：", e);
    }
}

// 由 main.js 的 initGame() 呼叫
function startLeaderboardSync() {
    if (!isLeaderboardConfigured()) return;
    setTimeout(uploadLeaderboard, LEADERBOARD_FIRST_UPLOAD_DELAY_MS);
    setInterval(uploadLeaderboard, LEADERBOARD_UPLOAD_INTERVAL_MS);
}

async function fetchLeaderboard() {
    const { db } = await initLeaderboardBackend();
    const snap = await db.collection(LEADERBOARD_COLLECTION)
        .orderBy('power', 'desc').limit(LEADERBOARD_TOP_N).get();
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
}

// tab：'power'（戰力榜，預設）／'defense'（死守天南城通關榜）；不給就停在上次看的分頁
function openLeaderboardModal(tab) {
    document.getElementById('leaderboard-modal').style.display = 'flex';
    applyLeaderboardTab(tab || lbTab);
    refreshLeaderboard(false);
}

async function refreshLeaderboard(manual) {
    if (!isLeaderboardConfigured()) { renderLeaderboard(); return; }
    if (manual && Date.now() - lbLastRefreshAt < LEADERBOARD_REFRESH_COOLDOWN_MS) return;
    lbLastRefreshAt = Date.now();
    lbError = "";
    renderLeaderboard(true);
    try {
        // 先交自己的最新戰力，名次才準（60 秒內已上傳過會自動略過）。
        // 斷線時 Firestore 的寫入要等連回伺服器才會完成，最多等 LEADERBOARD_TIMEOUT_MS，避免視窗卡在「讀取中」
        await lbWithTimeout(uploadLeaderboard()).catch(() => {});
        if (lbTab === 'defense') lbDefenseRows = await lbWithTimeout(fetchDefenseBoard());
        else lbRows = await lbWithTimeout(fetchLeaderboard());
    } catch (e) {
        console.warn("戰力榜讀取失敗：", e);
        // permission-denied：伺服器規則不允許（多半是新榜單上線但主控台還沒發布新版 tools/firestore.rules）
        lbError = e && e.code === 'permission-denied'
            ? (lbTab === 'defense' ? "守城榜尚未開放（伺服器設定更新中），請稍後再試。" : "榜單暫時無法讀取（伺服器設定更新中）。")
            : "連線失敗，請稍後再試。";
    }
    renderLeaderboard(false);
}

function lbWithTimeout(promise) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("連線逾時")), LEADERBOARD_TIMEOUT_MS))
    ]);
}

function lbEscape(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function lbTimeAgo(ts) {
    if (!ts || !ts.toMillis) return "";
    const min = Math.floor((Date.now() - ts.toMillis()) / 60000);
    if (min < 1) return "剛剛";
    if (min < 60) return `${min} 分鐘前`;
    if (min < 1440) return `${Math.floor(min / 60)} 小時前`;
    return `${Math.floor(min / 1440)} 天前`;
}

function renderLeaderboard(loading) {
    const box = document.getElementById('leaderboard-body');
    if (!box) return;
    if (!isLeaderboardConfigured()) {
        box.innerHTML = `<p class="lb-note">戰力榜尚未開通（管理者需在 data/config-leaderboard.js 填入 Firebase 設定）。</p>`;
        return;
    }
    if (lbTab === 'defense') { box.innerHTML = defenseBoardHtml(loading); return; }
    const myPower = getRankPower();
    let myUid = null;
    try { myUid = firebase.auth().currentUser.uid; } catch (e) { /* SDK 還沒載入 */ }

    let html = `<div class="lb-me">你的戰力：<b>${myPower.toWan()}</b>`;
    if (lbRows && myUid) {
        const idx = lbRows.findIndex(r => r.id === myUid);
        html += idx >= 0 ? `　目前第 <b>${idx + 1}</b> 名` : `　未進前 ${LEADERBOARD_TOP_N} 名`;
    }
    html += `</div>`;
    if (lbBanned) html += `<p class="lb-note" style="color:#f87171;">⛔ 你的戰力紀錄因資料異常已被移出戰力榜，無法再上榜。</p>`;
    if (loading) html += `<p class="lb-note">讀取中…</p>`;
    if (lbError) html += `<p class="lb-note" style="color:#f87171;">${lbError}</p>`;

    if (lbRows) {
        if (!lbRows.length) html += `<p class="lb-note">目前還沒有人上榜。</p>`;
        html += `<div class="lb-list">` + lbRows.map((r, i) => {
            const realm = realms[r.realm] || "？";
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
            return `<div class="lb-row${r.id === myUid ? ' lb-self' : ''}">
                <span class="lb-rank">${medal}</span>
                <span class="lb-name">${lbEscape(r.name)}<small>${lbEscape(realm)} ${Number(r.stage) || 1}階・Lv.${Number(r.level) || 1}${r.sect ? '・' + lbEscape(r.sect) : ''}</small></span>
                <span class="lb-power">${Number(r.power || 0).toWan()}<small>${lbTimeAgo(r.updatedAt)}</small></span>
            </div>`;
        }).join("") + `</div>`;
    }
    html += `<p class="lb-note">在線時每 5 分鐘自動回報一次戰力（不含禁術等暫時增益）。</p>`;
    box.innerHTML = html;
}

// 死守天南城通關榜（defenseBoard：GM 審核通過的紀錄）
function defenseBoardHtml(loading) {
    let myUid = null;
    try { myUid = firebase.auth().currentUser.uid; } catch (e) { /* SDK 還沒載入 */ }
    let html = `<div class="lb-me">你的最佳：守住第 <b>${player.defenseBest || 0}</b> 波`;
    if (lbDefenseRows && myUid) {
        const idx = lbDefenseRows.findIndex(r => r.id === myUid);
        if (idx >= 0) html += `　目前第 <b>${idx + 1}</b> 名`;
    }
    html += `</div><p class="lb-note">${getDefenseRankStatusText()}</p>`;
    if (lbDefenseMine && lbDefenseMine.status === 'rejected' && lbDefenseMine.best === player.defenseSubmitted && lbDefenseMine.reason) {
        html += `<p class="lb-note" style="color:#fca5a5;">未通過原因：${lbEscape(lbDefenseMine.reason)}</p>`;
    }
    if (loading) html += `<p class="lb-note">讀取中…</p>`;
    if (lbError) html += `<p class="lb-note" style="color:#f87171;">${lbError}</p>`;
    if (lbDefenseRows) {
        if (!lbDefenseRows.length) html += `<p class="lb-note">目前還沒有通過審核的守城紀錄。</p>`;
        html += `<div class="lb-list">` + lbDefenseRows.map((r, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
            const d = r.runAt ? new Date(r.runAt) : null;
            return `<div class="lb-row${r.id === myUid ? ' lb-self' : ''}">
                <span class="lb-rank">${medal}</span>
                <span class="lb-name">${lbEscape(r.name)}<small>${lbEscape(realms[r.realm] || "？")} ${Number(r.stage) || 1}階・戰力 ${Number(r.power || 0).toWan()}</small></span>
                <span class="lb-power">${Number(r.best) >= DEFENSE_TOTAL_WAVES ? '🏆 全破' : `第 ${Number(r.best) || 0} 波`}<small>${d ? `${d.getMonth() + 1}/${d.getDate()} 達成` : ''}</small></span>
            </div>`;
        }).join("") + `</div>`;
    }
    html += `<p class="lb-note">秘境「魔屠天南」刷新個人最佳時自動送審；管理者比對當時戰力與該波強度，確認能守住才登錄。</p>`;
    return html;
}
