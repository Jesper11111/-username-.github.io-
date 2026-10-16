// 屠龍勇者：帳號共用倉庫、鑽石、離線掛機扣鑽石（ARCHITECTURE.md 第 38 節）
// 依賴 player、items、market（marketRpc／marketErrText／marketGiveItem／marketTradeable）、cloud、offline、ui-panels。
// 共用倉庫：同帳號所有角色共用 200 格＋金幣，存、取各收 100 金幣；伺服器以雲端存檔確認道具／金幣（vault_put），取出走兩段式交貨（vault_take → vault_pending／vault_ack）。
// 鑽石存在伺服器（dragon_wallet）：每日登入 +5、打怪 0.1% 掉 1 顆（每天 10）、首領／龍 +3（每天 15）、管理者發放。
// 離線掛機要登入，只有最後上傳存檔的角色能結算（2026-10-12 起不消耗鑽石；伺服器的 offline_claim 不再使用）。

const VAULT_MAX = 200, VAULT_FEE = 100;
const DIA_MOB_P = 0.001;      // 一般怪掉鑽石機率

let diaCount = null;          // 目前鑽石（null＝還沒讀到）
let vaultData = null, vaultBusy = false, vaultErr = '', storageMode = 'char';

function vaultErrText(e) {
    const m = String((e && e.message) || e || '');
    if (m.includes('vault full')) return `共用倉庫滿了（最多 ${VAULT_MAX} 格）`;
    if (m.includes('already stored')) return '這件道具已經存進共用倉庫了';
    if (m.includes('bad amount')) return '金額不正確';
    if (m.includes('not enough gold')) return `金幣不足（每次收 ${VAULT_FEE} 金幣手續費，以雲端存檔為準）`;
    return marketErrText(e);
}
function vaultOnline() { return isCloudConfigured() && cloudLoggedIn() && !cloudBan; }

// ───────── 鑽石 ─────────
async function diaRefresh() {
    if (!vaultOnline()) return;
    try {
        const r = await marketRpc('dia_status');
        diaCount = r.diamonds;
        if (r.daily > 0) { showToast(`💎 每日登入獎勵：鑽石 +${r.daily}`, 3000); if (player) addLog(`💎 每日登入獎勵：鑽石 +${r.daily}`, 'rare'); }
        if (player) refreshUI();
    } catch (e) {}
}

// 打倒怪物時擲骰（combat.js onKill 呼叫；離線模擬不掉）
function diaRoll(mon) {
    if (SIM_MODE || !vaultOnline()) return;
    const src = mon.boss || mon.dragon ? 'boss' : chance(DIA_MOB_P) ? 'mob' : null;
    if (!src) return;
    marketRpc('dia_drop', { p_src: src }).then(r => {
        diaCount = r.diamonds;
        if (r.got > 0) { addLog(`💎 獲得鑽石 +${r.got}（目前 ${r.diamonds}）`, 'rare'); showToast(`💎 鑽石 +${r.got}`); }
    }).catch(() => {});
}

// ───────── 離線掛機 ─────────
function offlineEligible() {
    if (!player || !player.hunting || player.loc.type !== 'zone') return false;
    const z = currentZone();
    return !!z && z.type !== 'dragon';
}

let offlineHold = false;   // 向伺服器結算中：主迴圈暫停，避免角色先動
// 有離線時間要結算：登入才算，向伺服器扣鑽石換可結算的時間，再用 applyOffline 模擬
async function offlineSettle(awayMs) {
    if (awayMs < OFFLINE_MIN_MS || !offlineEligible()) return;
    if (!vaultOnline()) { addLog('🌙 登入帳號才有離線掛機收益', 'sys'); return; }
    offlineHold = true;
    try {
        saveGame();
        // 2026-10-12 使用者要求：離線掛機不再消耗鑽石。仍要登入、只有帳號裡最後上傳存檔的角色能結算（直接讀自己的 dragon_saves，不扣鑽石）
        const { data: last, error } = await cloudTimeout(cloudSb.from('dragon_saves').select('slot').eq('user_id', cloudUser.id).order('updated_at', { ascending: false }).limit(1));   // 限定自己（管理者看得到所有人的存檔）
        if (error) throw error;
        if (last && last.length && last[0].slot !== currentSlot) {
            addLog('🌙 沒有離線收益：只有最後離線的角色才能離線掛機', 'sys');
            showToast('🌙 沒有離線收益：只有最後離線的角色才能離線掛機', 3500);
            return;
        }
        const rep = applyOffline(awayMs);
        if (rep) { refreshUI(); showOfflineReport(rep); }
    } catch (e) {
        addLog('🌙 離線收益結算失敗：' + vaultErrText(e), 'sys');
    } finally {
        offlineHold = false;
        lastTick = Date.now();
    }
}

// ───────── 共用倉庫 ─────────
async function vaultLoad() {
    if (!vaultOnline()) return;
    try { vaultData = await marketRpc('vault_get'); diaCount = vaultData.diamonds; vaultErr = ''; }
    catch (e) { vaultErr = vaultErrText(e); }
    vaultRender();
}
function vaultRender() { if (player && !SIM_MODE && tabOpen('town') && townSub === 'storage' && storageMode === 'vault') renderPanel(); }
function setStorageMode(m) { storageMode = m; renderPanel(); if (m === 'vault') vaultLoad(); }

function vaultHtml() {
    if (!isCloudConfigured()) return '<p class="muted">這個版本沒有雲端功能。</p>';
    if (!cloudLoggedIn()) return `<div class="panel notice">共用倉庫要登入帳號才能使用（同帳號的所有角色共用）。<div class="btn-row"><button onclick="openCloudDialog()">☁️ 登入／註冊</button></div></div>`;
    if (cloudBan) return '<p class="bad">帳號已停權。</p>';
    if (!vaultData) return `<p class="muted">${vaultErr ? esc(vaultErr) : '讀取中…'}</p>`;
    const row = (x, btn) => `<div class="list-row"><div><b class="${itemClass(x)}">${esc(itemName(x))}</b>${x.n > 1 ? ` ×${fmt(x.n)}` : ''}</div>${btn}</div>`;
    const items = vaultData.items.map(v => row(v.item, `<button class="mini" onclick="vaultTake(${v.id})" ${vaultBusy ? 'disabled' : ''}>取出</button>`)).join('') || '<p class="muted">共用倉庫是空的</p>';
    const inv = sortedInv(player.inv).filter(marketTradeable).map(x => row(x, `<button class="mini" onclick="vaultPut(${x.uid})" ${vaultBusy ? 'disabled' : ''}>存入</button>`)).join('') || '<p class="muted">背包沒有可以存的道具</p>';
    return `<div class="panel"><b>🏦 帳號共用倉庫</b>（${vaultData.items.length}／${VAULT_MAX} 格）　💎 鑽石 ${fmt(diaCount || 0)}
        <small class="muted" style="display:block">同帳號所有角色共用。每次存入、取出各收 💰${VAULT_FEE} 手續費。存取前會先上傳存檔，伺服器以雲端存檔為準。</small>
        ${vaultErr ? `<p class="bad">${esc(vaultErr)}</p>` : ''}
        <div class="list-row"><div>💰 倉庫金幣：<b>${fmt(vaultData.gold)}</b></div>
        <div class="row"><input id="vault-gold" type="number" min="1" placeholder="金額" style="width:110px">
        <button class="mini" onclick="vaultGold(1)" ${vaultBusy ? 'disabled' : ''}>存入</button><button class="mini secondary" onclick="vaultGold(-1)" ${vaultBusy ? 'disabled' : ''}>取出</button></div></div></div>
        <h4>🏦 共用倉庫</h4><div class="list">${items}</div><h4>🎒 背包</h4><div class="list">${inv}</div>`;
}

async function vaultRun(fn) {
    if (vaultBusy) return;
    if (!inTown()) { showToast('要在村莊裡才能使用倉庫'); return; }
    vaultBusy = true; vaultErr = ''; vaultRender();
    try { await fn(); } catch (e) { vaultErr = vaultErrText(e); showToast(vaultErr); }
    vaultBusy = false;
    await vaultLoad();
}

function vaultPut(uid) {
    const inst = findInv(uid);
    if (!inst || !marketTradeable(inst)) return;
    if (player.gold < VAULT_FEE) { showToast(`金幣不足，存入要 💰${VAULT_FEE} 手續費`); return; }
    const name = itemName(inst) + (inst.n > 1 ? ' ×' + inst.n : '');
    gameConfirm('存入共用倉庫', `把「${name}」存進帳號共用倉庫？\n手續費 💰${VAULT_FEE}。`, () => vaultRun(async () => {
        const item = JSON.parse(JSON.stringify(inst));
        saveGame(); await cloudFlush(true);
        await marketRpc('vault_put', { p_slot: currentSlot, p_item: item, p_gold: null, p_name: name });
        removeInst(inst.uid);   // 伺服器收下後才從背包拿走
        player.gold -= VAULT_FEE;
        addLog(`🏦 存入共用倉庫：${name}（手續費 ${VAULT_FEE}）`, 'sys');
        saveGame(); await cloudFlush(true); refreshUI();
    }), '存入');
}

function vaultGold(dir) {
    const n = Math.floor(Number((document.getElementById('vault-gold') || {}).value) || 0);
    if (n < 1) { showToast('請輸入金額'); return; }
    if (dir > 0) {
        if (player.gold < n + VAULT_FEE) { showToast(`金幣不足（存入 ${fmt(n)}＋手續費 ${VAULT_FEE}）`); return; }
        vaultRun(async () => {
            saveGame(); await cloudFlush(true);
            await marketRpc('vault_put', { p_slot: currentSlot, p_item: null, p_gold: n, p_name: null });
            player.gold -= n + VAULT_FEE;
            addLog(`🏦 存入共用倉庫：金幣 ${fmt(n)}（手續費 ${VAULT_FEE}）`, 'sys');
            saveGame(); await cloudFlush(true); refreshUI();
        });
    } else {
        if (vaultData && n > vaultData.gold) { showToast('共用倉庫的金幣不夠'); return; }
        if (player.gold < VAULT_FEE) { showToast(`金幣不足，取出要 💰${VAULT_FEE} 手續費`); return; }
        vaultRun(async () => { saveGame(); await cloudFlush(true); await marketRpc('vault_take', { p_slot: currentSlot, p_id: null, p_gold: n }); await vaultDeliver(); });
    }
}

function vaultTake(id) {
    if (player.gold < VAULT_FEE) { showToast(`金幣不足，取出要 💰${VAULT_FEE} 手續費`); return; }
    vaultRun(async () => { saveGame(); await cloudFlush(true); await marketRpc('vault_take', { p_slot: currentSlot, p_id: id, p_gold: null }); await vaultDeliver(); });
}

// 交貨：伺服器記帳的取出（這個角色欄位）→ 加進角色、扣手續費；player.vaultGot 記已入帳編號，ack 沒送到也不會重複領
let vaultDeliverBusy = false;
async function vaultDeliver() {
    if (!vaultOnline() || !player || vaultDeliverBusy) return;
    vaultDeliverBusy = true;
    try {
        const list = await marketRpc('vault_pending', { p_slot: currentSlot });
        if (!player.vaultGot) player.vaultGot = [];
        const ack = [];
        for (const o of list || []) {
            if (!player.vaultGot.includes(o.id)) {
                if (o.item) marketGiveItem(o.item); else player.gold += o.gold;
                player.gold -= VAULT_FEE;
                player.vaultGot.push(o.id);
                addLog(`🏦 從共用倉庫取出：${o.item ? o.name : '金幣 ' + fmt(o.gold)}（手續費 ${VAULT_FEE}）`, 'loot');
            }
            ack.push(o.id);
        }
        while (player.vaultGot.length > 200) player.vaultGot.shift();
        if (ack.length) { saveGame(); refreshUI(); await cloudFlush(true); await marketRpc('vault_ack', { p_ids: ack }); }
    } catch (e) {}
    vaultDeliverBusy = false;
}
