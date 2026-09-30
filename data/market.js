// 寄售拍賣（ARCHITECTURE.md 第 58 節；設定在 config-leaderboard.js 的 MARKET_*，雲端權限在 tools/firestore.rules）
// 大道石碑第四個分頁「🏪 寄售」。流程：
//   上架：物品從存檔移出 → 建立 market/{id}（起標價、12／24／48 小時）
//   出價：交易（transaction）更新最高價；前一位出價者的靈石寫成 marketRefunds/{id}_{第幾次}，他在「待處理」按領回（刪除該筆＝領回）
//         出價的靈石當下從存檔扣除；每次至少多 5%；最後 5 分鐘有人出價就延長到出價後 5 分鐘
//   結標：得標者建立 marketClaims/{id}_item 領物品；賣家建立 marketClaims/{id}_coins 領 95% 靈石；兩邊都領完可刪除該拍賣品
//         沒人出價：賣家刪除拍賣品＝下架並領回物品（結標前後都可以）
// 每一步的「領取」由雲端規則保證只能一次（建立已存在的文件會被拒絕）。物品與靈石在玩家端加減，改存檔的人本來就能自己加（純前端遊戲的限制）。

let mkActive = null, mkMine = [], mkWins = [], mkRefunds = [];
let mkForm = { kind: 'blueprint' };

function mkTs(ms) { return firebase.firestore.Timestamp.fromMillis(ms); }
function mkMs(ts) { return ts && ts.toMillis ? ts.toMillis() : 0; }
function mkLeft(ts) {
    const s = Math.floor((mkMs(ts) - Date.now()) / 1000);
    if (s <= 0) return '已結束';
    if (s < 3600) return `剩 ${Math.ceil(s / 60)} 分鐘`;
    return `剩 ${Math.floor(s / 3600)} 小時 ${Math.floor(s % 3600 / 60)} 分`;
}
function mkMinBid(d) {
    return d.bidder ? Math.max(d.bid + 1, Math.ceil(d.bid * (1 + MARKET_MIN_RAISE))) : d.startPrice;
}

async function fetchMarket() {
    const { db, uid } = await initLeaderboardBackend();
    const col = db.collection(MARKET_COLLECTION);
    const [act, mine, wins, refs] = await Promise.all([
        col.where('endsAt', '>', mkTs(Date.now())).orderBy('endsAt').limit(MARKET_SHOW_N).get(),
        col.where('seller', '==', uid).get(),
        col.where('bidder', '==', uid).get(),
        db.collection(MARKET_REFUND_COLLECTION).where('uid', '==', uid).get()
    ]);
    const map = s => s.docs.map(d => Object.assign({ id: d.id }, d.data()));
    mkActive = map(act); mkMine = map(mine); mkWins = map(wins); mkRefunds = map(refs);
    notifyMarketResults();
    return mkActive;
}

// 結標提示（2026-09-28 玩家要求「寄售得標加入得標成功提示」）：每筆只提示一次（player.marketNotified）
//   得標（自己是最高出價且已結束、還沒領）→「🎉 得標成功」；自己的寄售品有人得標且已結束 →「💰 寄售成交」
function notifyMarketResults() {
    if (!Array.isArray(player.marketNotified)) player.marketNotified = [];
    const now = Date.now(), seen = player.marketNotified;
    const fresh = (d, type) => mkMs(d.endsAt) <= now && !isMarketClaimed(d.id, type) && !seen.includes(`${d.id}_${type}`);
    const won = mkWins.filter(d => fresh(d, 'item'));
    const sold = mkMine.filter(d => d.bidder && fresh(d, 'coins'));
    won.forEach(d => {
        showToast(`🎉 得標成功：${d.label}（到「待處理」領取）`, 'ok');
        addLog(`🎉 寄售得標【${d.label}】（${Number(d.bid).toWan()} 靈石），到大道石碑「🏪 寄售」的待處理領取。`, "level-up", false, "item");
        seen.push(`${d.id}_item`);
    });
    sold.forEach(d => {
        showToast(`💰 寄售成交：${d.label}（${Number(d.bid).toWan()} 靈石）`, 'ok');
        seen.push(`${d.id}_coins`);
    });
    if (seen.length > 200) player.marketNotified = seen.slice(-200);
}

// ---- 物品：說明、從存檔取出、放回存檔 ----
function mkStack(key) { return MARKET_STACKS.find(s => s.key === key); }
// 寄售品裡的裝備：雲端存成 JSON 字串 eqJson（2026-09-28 修正：裝備詞條 subs 是 [[屬性, 數值], …] 巢狀陣列，
// Firestore 不支援巢狀陣列，直接存物件會被拒絕、上架失敗）；舊格式 item.eq 仍可讀
function mkItemEq(item) {
    if (!item) return null;
    if (item.eq) return item.eq;
    try { return item.eqJson ? JSON.parse(item.eqJson) : null; } catch (e) { return null; }
}
function mkLabel(item) {
    if (!item) return '？';
    if (item.kind === 'blueprint') return `📜 ${item.key.replace('_', '・')} 等鍛造圖紙 ×${item.n}`;
    if (item.kind === 'equip') {
        const eq = mkItemEq(item) || {};
        return `⚔️ ${eq.level ? `Lv.${eq.level} ` : ''}${eq.quality || ''}・${getEquipDisplayName(eq)}${eq.enhance ? ` +${eq.enhance}` : ''}`;
    }
    const s = mkStack(item.key);
    return s ? `${s.icon} ${s.label} ×${item.n}` : '？';
}
// 上架前檢查並從存檔扣掉；回傳 { item } 或 { error }
// dryRun＝只檢查、組出 item 給確認框看，不扣（2026-10-01 確認框改成遊戲內非同步視窗：等玩家按確定的期間物品要留在背包，避免自動存檔後關網頁就遺失）
function mkTakeItem(f, dryRun) {
    const n = Math.floor(Number(f.n) || 0);
    if (f.kind === 'blueprint') {
        const [slot, level] = String(f.key || '').split('_');
        if (!slot || n < 1 || getBlueprintCount(slot, Number(level)) < n) return { error: '圖紙數量不足。' };
        if (!dryRun) useBlueprints(slot, Number(level), n);
        return { item: { kind: 'blueprint', key: f.key, n } };
    }
    if (f.kind === 'equip') {
        const i = player.equipInventory.findIndex(e => e.id === f.key);
        if (i < 0) return { error: '背包裡找不到這件裝備（穿在身上的要先卸下）。' };
        if (isEquipLocked(player.equipInventory[i])) return { error: '鎖定中的裝備不能上架，請先解除鎖定。' };
        const eq = dryRun ? player.equipInventory[i] : player.equipInventory.splice(i, 1)[0];
        return { item: { kind: 'equip', eqJson: JSON.stringify(eq) } };
    }
    const s = mkStack(f.key);
    if (!s || n < 1 || (player[s.key] || 0) < n) return { error: '數量不足。' };
    if (!dryRun) player[s.key] -= n;
    return { item: { kind: s.kind, key: s.key, n } };
}
// 放回／交給玩家；背包裝備滿時回傳錯誤（不放）
function mkCheckSpace(item) {
    if (item && item.kind === 'equip' && player.equipInventory.length >= MAX_EQUIP_INVENTORY) return `背包裝備已滿（${MAX_EQUIP_INVENTORY} 件），請先清出空位再領取。`;
    return '';
}
function mkGiveItem(item) {
    if (item.kind === 'blueprint') {
        if (!player.blueprints || typeof player.blueprints !== 'object') player.blueprints = {};
        player.blueprints[item.key] = (player.blueprints[item.key] || 0) + item.n;
    } else if (item.kind === 'equip') {
        const eq = Object.assign({}, mkItemEq(item), { id: Date.now() + "_" + Math.random().toString(36).slice(2, 10), locked: false });
        player.equipInventory.push(eq);
        recordGearCollected(eq);   // 天磯錄（含圖紙器錄）
    } else {
        const s = mkStack(item.key);
        if (s) player[s.key] = (player[s.key] || 0) + item.n;
    }
}
function mkDone(msg) {
    if (msg) addLog(msg, "level-up", false, "item");
    saveLocal();
    updateUI();
}

// ---- 上架 ----
async function marketCreate() {
    const f = mkForm;
    const price = Math.floor(Number(document.getElementById('mk-price').value) || 0);
    const hours = Number(document.getElementById('mk-hours').value) || 24;
    f.key = document.getElementById('mk-item') ? document.getElementById('mk-item').value : '';
    f.n = document.getElementById('mk-n') ? document.getElementById('mk-n').value : 1;
    if (!f.key) { gameAlert('請選擇要寄售的物品。'); return; }
    if (price < 1 || price > MARKET_MAX_PRICE) { gameAlert('起標價要是 1 以上的整數靈石。'); return; }
    if (!MARKET_HOURS.includes(hours)) return;
    if (lbBanned) { gameAlert('你已被禁止交易。'); return; }
    const active = mkMine.filter(d => mkMs(d.endsAt) > Date.now()).length;
    if (active >= MARKET_MAX_ACTIVE) { gameAlert(`同時最多寄售 ${MARKET_MAX_ACTIVE} 件。`); return; }
    const preview = mkTakeItem(f, true);   // 先只檢查，確認後才扣
    if (preview.error) { gameAlert(preview.error); return; }
    const label = mkLabel(preview.item);
    if (!(await gameConfirm(`寄售【${label}】\n起標價 ${price.toWan()} 靈石、${hours} 小時\n成交抽 ${Math.round(MARKET_FEE * 100)}% 手續費；沒人出價可下架領回。\n確定上架？`))) return;
    const taken = mkTakeItem(f);           // 等待確認期間背包可能變了，重新檢查一次
    if (taken.error) { gameAlert(taken.error); return; }
    try {
        const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
        await lbWithTimeout(db.collection(MARKET_COLLECTION).add({
            seller: uid, sellerName: sanitizePlayerName(player.name) || "無名修士",
            kind: taken.item.kind, item: taken.item, label: label.slice(0, 80),
            startPrice: price, bid: 0, bidder: null, bidderName: '', bidCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), endsAt: mkTs(Date.now() + hours * 3600000)
        }));
    } catch (e) {
        console.warn('上架失敗：', e);
        mkGiveItem(taken.item);   // 失敗就放回
        // 附上錯誤代碼，方便玩家截圖回報（例：invalid-argument＝資料格式被雲端拒絕，不是網路問題）
        gameAlert(lbIsQuota(e) ? LB_QUOTA_MSG : e && e.code === 'permission-denied' ? '上架失敗（寄售尚未開放，或你已被禁止交易）。' : `上架失敗，請稍後再試。（${(e && (e.code || e.message)) || '未知錯誤'}）`);
        saveLocal(); renderLeaderboard(false);
        return;
    }
    mkDone(`🏪 寄售上架【${label}】，起標 ${price.toWan()} 靈石、${hours} 小時。`);
    refreshLeaderboard(false);
}

// ---- 出價 ----
async function marketBid(id) {
    const d = (mkActive || []).find(x => x.id === id);
    if (!d) return;
    const input = document.getElementById('mk-bid-' + id);
    const amount = Math.floor(Number(input && input.value) || 0);
    const min = mkMinBid(d);
    if (amount < min) { gameAlert(`出價至少 ${min.toWan()} 靈石。`); return; }
    if (amount > player.coins) { gameAlert(`靈石不足（持有 ${player.coins.toWan()}）。出價會先扣除，被超過時退回。`); return; }
    // 2026-10-01：原本用 confirm()，在預覽面板／App 內建瀏覽器會直接回傳「取消」，玩家按出價沒反應（使用者回報）→ 改遊戲內確認框
    if (!(await gameConfirm(`出價 ${amount.toWan()} 靈石競標【${d.label}】？\n靈石會先扣除；被別人超過時退回（到「待處理」領回）。`))) return;
    if (amount > player.coins) { gameAlert(`靈石不足（持有 ${player.coins.toWan()}）。`); return; }   // 等待確認期間靈石可能變少
    try {
        const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
        const ref = db.collection(MARKET_COLLECTION).doc(id);
        await lbWithTimeout(db.runTransaction(async tx => {
            const snap = await tx.get(ref);
            if (!snap.exists) throw new Error('gone');
            const cur = Object.assign({}, snap.data());   // 複製一份：後面的退款單要用「更新前」的出價者與金額
            if (mkMs(cur.endsAt) <= Date.now()) throw new Error('ended');
            if (cur.seller === uid) throw new Error('self');
            if (cur.bidder === uid) throw new Error('top');
            if (amount < mkMinBid(cur)) throw new Error('low:' + mkMinBid(cur));
            const upd = { bid: amount, bidder: uid, bidderName: sanitizePlayerName(player.name) || "無名修士", bidCount: (cur.bidCount || 0) + 1 };
            if (mkMs(cur.endsAt) - Date.now() < MARKET_EXTEND_SEC * 1000) upd.endsAt = mkTs(Date.now() + MARKET_EXTEND_SEC * 1000);
            tx.update(ref, upd);
            if (cur.bidder) tx.set(db.collection(MARKET_REFUND_COLLECTION).doc(`${id}_${cur.bidCount}`), {
                uid: cur.bidder, amount: cur.bid, listingId: id, label: String(cur.label || '').slice(0, 80),
                at: firebase.firestore.FieldValue.serverTimestamp()
            });
        }));
    } catch (e) {
        console.warn('出價失敗：', e);
        const m = String(e && e.message || '');
        gameAlert(lbIsQuota(e) ? LB_QUOTA_MSG : m === 'ended' ? '拍賣已結束。' : m === 'self' ? '不能競標自己的寄售品。' : m === 'top' ? '你已經是目前最高出價。'
            : m.startsWith('low:') ? `有人搶先出價了，現在至少要 ${Number(m.slice(4)).toWan()} 靈石。`
            : m === 'gone' ? '此寄售品已下架。' : e && e.code === 'permission-denied' ? '出價失敗（可能剛好被超過或已結束），請重新整理後再試。' : '連線失敗，請稍後再試。');
        refreshLeaderboard(false);
        return;
    }
    player.coins -= amount;
    showToast(`✅ 出價成功：${d.label}（${amount.toWan()} 靈石，目前最高）`, 'ok');
    mkDone(`🏪 出價 ${amount.toWan()} 靈石競標【${d.label}】（被超過時退回）。`);
    refreshLeaderboard(false);
}

// ---- 待處理：退款、得標領取、賣出領錢、下架領回 ----
async function marketClaimRefund(rid) {
    const r = mkRefunds.find(x => x.id === rid);
    if (!r) return;
    try {
        const { db } = await lbWithTimeout(initLeaderboardBackend());
        await lbWithTimeout(db.collection(MARKET_REFUND_COLLECTION).doc(rid).delete());
    } catch (e) { console.warn(e); gameAlert(lbIsQuota(e) ? LB_QUOTA_MSG : '領回失敗，請稍後再試。'); return; }
    player.coins += Math.floor(Number(r.amount) || 0);
    mkRefunds = mkRefunds.filter(x => x.id !== rid);
    mkDone(`🏪 出價被超過，領回 ${Number(r.amount).toWan()} 靈石（${r.label}）。`);
    renderLeaderboard(false);
}
async function marketClaim(id, type) {
    const d = mkMine.concat(mkWins).find(x => x.id === id);
    if (!d) return;
    if (type === 'item') { const sp = mkCheckSpace(d.item); if (sp) { gameAlert(sp); return; } }
    try {
        const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
        await lbWithTimeout(db.collection(MARKET_CLAIM_COLLECTION).doc(`${id}_${type}`).set({
            uid, listingId: id, type, at: firebase.firestore.FieldValue.serverTimestamp()
        }));
        markMarketClaimed(id, type);
        // 兩邊都領完就刪掉拍賣品（失敗沒關係，不影響領取）
        const other = type === 'item' ? 'coins' : 'item';
        db.collection(MARKET_CLAIM_COLLECTION).doc(`${id}_${other}`).get()
            .then(s => { if (s.exists) return db.collection(MARKET_COLLECTION).doc(id).delete(); }).catch(() => {});
    } catch (e) {
        console.warn(e);
        if (e && e.code === 'permission-denied') { markMarketClaimed(id, type); gameAlert('已經領取過了。'); renderLeaderboard(false); }
        else gameAlert(lbIsQuota(e) ? LB_QUOTA_MSG : '連線失敗，請稍後再試。');
        return;
    }
    if (type === 'item') { mkGiveItem(d.item); showToast(`🎉 得標成功：${d.label} 已入袋`, 'ok'); mkDone(`🏪 得標領取【${d.label}】（${Number(d.bid).toWan()} 靈石）！`); }
    else { const got = Math.floor(d.bid * (1 - MARKET_FEE)); player.coins += got; showToast(`💰 寄售成交，入帳 ${got.toWan()} 靈石`, 'ok'); mkDone(`🏪 寄售【${d.label}】成交 ${Number(d.bid).toWan()} 靈石，扣手續費後入帳 ${got.toWan()}。`); }
    renderLeaderboard(false);
}
// 下架（沒人出價時，結標前後都可以）：刪除拍賣品成功才把物品放回
async function marketCancel(id) {
    const d = mkMine.find(x => x.id === id);
    if (!d || d.bidder) return;
    const sp = mkCheckSpace(d.item); if (sp) { gameAlert(sp); return; }
    if (!(await gameConfirm(`下架【${d.label}】並領回？`))) return;
    try {
        const { db } = await lbWithTimeout(initLeaderboardBackend());
        await lbWithTimeout(db.collection(MARKET_COLLECTION).doc(id).delete());
    } catch (e) { console.warn(e); gameAlert(lbIsQuota(e) ? LB_QUOTA_MSG : e && e.code === 'permission-denied' ? '已經有人出價，不能下架。' : '連線失敗，請稍後再試。'); refreshLeaderboard(false); return; }
    mkGiveItem(d.item);
    mkMine = mkMine.filter(x => x.id !== id);
    mkDone(`🏪 下架領回【${d.label}】。`);
    renderLeaderboard(false);
}
function markMarketClaimed(id, type) {
    if (!Array.isArray(player.marketClaimed)) player.marketClaimed = [];
    const k = `${id}_${type}`;
    if (!player.marketClaimed.includes(k)) player.marketClaimed.push(k);
    if (player.marketClaimed.length > 200) player.marketClaimed = player.marketClaimed.slice(-200);
}
function isMarketClaimed(id, type) { return (player.marketClaimed || []).includes(`${id}_${type}`); }

// ---- 畫面 ----
function marketSetKind(kind) { mkForm = { kind, open: true }; renderLeaderboard(false); }
function marketItemOptions(kind) {
    if (kind === 'blueprint') return listBlueprints().map(b => [`${b.slot}_${b.level}`, `${b.slot}・${b.level} 等（持有 ${b.count}）`]);
    if (kind === 'equip') return player.equipInventory.filter(e => !isEquipLocked(e))
        .map(e => [e.id, `${e.level ? `Lv.${e.level} ` : ''}${e.quality}・${getEquipDisplayName(e)}${e.enhance ? ` +${e.enhance}` : ''}`]);
    return MARKET_STACKS.filter(s => s.kind === kind && (player[s.key] || 0) > 0).map(s => [s.key, `${s.icon} ${s.label}（持有 ${(player[s.key] || 0).toWan()}）`]);
}
function marketHtml(loading) {
    let myUid = null;
    try { myUid = firebase.auth().currentUser.uid; } catch (e) { /* SDK 還沒載入 */ }
    const now = Date.now();
    // 上架
    const kinds = [['blueprint', '📜 圖紙'], ['equip', '⚔️ 裝備'], ['material', '⛏️ 材料'], ['item', '💊 道具']];
    const opts = marketItemOptions(mkForm.kind);
    const form = `<details class="mk-box"${mkForm.open ? ' open' : ''} ontoggle="mkForm.open = this.open"><summary>📦 我要寄售</summary>
        <div class="mk-kinds">${kinds.map(([k, l]) => `<button class="${mkForm.kind === k ? 'on' : ''}" onclick="marketSetKind('${k}')">${l}</button>`).join('')}</div>
        ${opts.length ? `<select id="mk-item">${opts.map(([v, l]) => `<option value="${lbEscape(v)}">${lbEscape(l)}</option>`).join('')}</select>
        ${mkForm.kind !== 'equip' ? `<label>數量 <input id="mk-n" type="number" min="1" value="1"></label>` : ''}
        <label>起標價 <input id="mk-price" type="number" min="1" placeholder="靈石"></label>
        <label>時間 <select id="mk-hours">${MARKET_HOURS.map(h => `<option value="${h}"${h === 24 ? ' selected' : ''}>${h} 小時</option>`).join('')}</select></label>
        <button class="sys-btn" onclick="marketCreate()">🏪 上架</button>` : `<p class="lb-note">沒有可寄售的${kinds.find(k => k[0] === mkForm.kind)[1].slice(3)}。</p>`}
        <p class="lb-note">同時最多 ${MARKET_MAX_ACTIVE} 件；成交抽 ${Math.round(MARKET_FEE * 100)}%；沒人出價可隨時下架領回。</p></details>`;
    // 待處理
    const todo = [];
    mkRefunds.forEach(r => todo.push(`<div class="mk-todo">↩️ 出價被超過：${lbEscape(r.label)}｜退回 ${Number(r.amount).toWan()} 靈石 <button onclick="marketClaimRefund('${lbEscape(r.id)}')">領回</button></div>`));
    mkWins.filter(d => mkMs(d.endsAt) <= now && !isMarketClaimed(d.id, 'item')).forEach(d =>
        todo.push(`<div class="mk-todo">🎉 得標：${lbEscape(d.label)}（${Number(d.bid).toWan()} 靈石） <button onclick="marketClaim('${lbEscape(d.id)}', 'item')">領取物品</button></div>`));
    mkMine.filter(d => d.bidder && mkMs(d.endsAt) <= now && !isMarketClaimed(d.id, 'coins')).forEach(d =>
        todo.push(`<div class="mk-todo">💰 賣出：${lbEscape(d.label)} → ${lbEscape(d.bidderName)}（${Number(d.bid).toWan()}，實得 ${Math.floor(d.bid * (1 - MARKET_FEE)).toWan()}） <button onclick="marketClaim('${lbEscape(d.id)}', 'coins')">領取靈石</button></div>`));
    mkMine.filter(d => !d.bidder).forEach(d =>
        todo.push(`<div class="mk-todo">${mkMs(d.endsAt) <= now ? '⌛ 流標' : '🏷️ 寄售中'}：${lbEscape(d.label)}（起標 ${Number(d.startPrice).toWan()}，${mkLeft(d.endsAt)}） <button onclick="marketCancel('${lbEscape(d.id)}')">下架領回</button></div>`));
    mkMine.filter(d => d.bidder && mkMs(d.endsAt) > now).forEach(d =>
        todo.push(`<div class="mk-todo">🏷️ 寄售中：${lbEscape(d.label)}｜目前 ${Number(d.bid).toWan()}（${lbEscape(d.bidderName)}），${mkLeft(d.endsAt)}</div>`));
    const todoHtml = todo.length ? `<div class="mk-box"><b>📋 我的寄售與待處理</b>${todo.join('')}</div>` : '';
    // 拍賣中
    let list;
    if (lbError) list = `<p class="lb-note">${lbEscape(lbError)}</p>`;
    else if (loading && !mkActive) list = `<p class="lb-note">讀取中…</p>`;
    else if (!mkActive || !mkActive.length) list = `<p class="lb-note">目前沒有寄售品。</p>`;
    else list = mkActive.map(d => {
        const mine = d.seller === myUid, top = d.bidder === myUid;
        const eqObj = d.kind === 'equip' ? mkItemEq(d.item) : null;
        const eqInfo = eqObj ? `<div class="mk-eq">${formatEquipDetails(eqObj)}</div>` : '';
        return `<div class="mk-card${top ? ' top' : ''}">
            <div class="mk-title">${lbEscape(d.label)}</div>${eqInfo}
            <div class="mk-meta">賣家 ${lbEscape(d.sellerName)}｜${d.bidder ? `目前 <b>${Number(d.bid).toWan()}</b>（${lbEscape(d.bidderName)}${top ? '・你' : ''}）` : `起標 <b>${Number(d.startPrice).toWan()}</b>`}｜${mkLeft(d.endsAt)}</div>
            ${mine ? '<div class="lb-note">你的寄售品</div>' : top ? '<div class="lb-note">你目前出價最高</div>'
                : `<div class="mk-bid"><input id="mk-bid-${lbEscape(d.id)}" type="number" min="${mkMinBid(d)}" value="${mkMinBid(d)}"><button onclick="marketBid('${lbEscape(d.id)}')">出價</button></div>`}
        </div>`;
    }).join('');
    return `<p class="lb-note">持有 💎 ${player.coins.toWan()} 靈石｜出價先扣、被超過退回；每次至少多 ${Math.round(MARKET_MIN_RAISE * 100)}%；最後 ${MARKET_EXTEND_SEC / 60} 分鐘出價會延長</p>
        ${todoHtml}${form}<div class="mk-list">${list}</div>`;
}
