// 屠龍勇者：交易所（ARCHITECTURE.md 第 36 節）
// 依賴 player、items、affix（品質名稱）、ui-panels（itemDescHtml／itemClass、TABS／PANEL_FNS）、cloud。
// 寄賣制：在村莊把背包道具標價上架，別人用金幣買，成交收 5% 手續費。
// 2026-10-23 起（第 95 節，tools/market-v2.sql）上架／下架／購買由伺服器直接改雲端存檔＋存取序號（同共用倉庫 vault.js 的 vaultOp）。
// 賣家收入仍是兩段式：伺服器先記帳（market_pending），遊戲把金幣加進角色、存檔後再確認（market_ack）；
// player.marketGot 記已入帳的編號，就算確認沒送到也不會重複領（v1 時買到還沒交貨的道具也走這裡）。

const MARKET_FEE = 0.05;
const MARKET_MAX = 10;
const MARKET_CATS = [['', '全部'], ['weapon', '武器'], ['armor', '防具'], ['potion', '藥水'], ['scroll', '卷軸'], ['currency', '通貨'], ['map', '地圖'], ['material', '材料'], ['elixir', '萬能藥'], ['ammo', '彈藥']];

let marketView = 'buy', marketCat = '', marketQ = '', marketSort = 'new', marketPage = 0;
let marketRows = null, marketMine = null, marketBusy = false, marketErr = '', marketSellUid = null;
// 購買頁的列表快取（省 Supabase 傳輸量）：同樣的分類／搜尋／排序／頁數 60 秒內不重抓；自己買、上架、下架後清掉，「🔄」強制重抓
const MARKET_CACHE_MS = 60 * 1000;
let marketCache = {};

function marketErrText(e) {
    const m = String((e && e.message) || e || '');
    const map = {
        'item not in cloud save': '雲端存檔裡找不到這件道具（請稍等幾秒再試，或到設定「☁️ 立即上傳」）',
        'not enough gold': '金幣不足（以雲端存檔為準，剛賺的錢要等上傳）', 'no cloud save': '雲端還沒有這個角色的存檔',
        'not available': '這件商品已經賣出、下架或過期了', 'own listing': '不能買自己上架的東西', 'too many listings': `同時最多上架 ${MARKET_MAX} 件`,
        'already listed': '這件道具已經在上架中', 'bad price': '價格要在 1～20 億之間', 'not tradeable': '這件道具不能交易', banned: '帳號已停權',
        'market hold': '帳號有待管理者確認的異常紀錄，暫時不能使用交易所與共用倉庫（確認沒問題後會自動恢復）',
        'save signature': '雲端存檔驗證沒有通過：請重新整理（更新遊戲）後到設定按「☁️ 立即上傳」再試',
        'market client outdated': '遊戲版本太舊，請重新整理（更新遊戲）後再使用交易所', 'bad amount': '數量不正確',
    };
    for (const k in map) if (m.includes(k)) return map[k];
    return cloudErrText(e);
}

async function marketRpc(fn, args) {
    const r = await cloudTimeout(cloudSb.rpc(fn, args || {}));
    if (r.error) throw r.error;
    return r.data;
}

function marketTradeable(inst) {
    const d = ITEMS[inst.id];
    return d && d.cat !== 'quest' && !(inst.ench > 15);
}

function marketRender() { if (typeof currentTab !== 'undefined' && tabOpen('market') && player && !SIM_MODE) renderPanel(); }

// 把交易所的道具實體放進背包（裝備保留品質、詞綴、地圖詞綴等所有欄位；堆疊道具直接加數量）
function marketGiveItem(it) {
    const d = ITEMS[it.id];
    if (!d) return null;
    const inst = addItem(it.id, it.n || 1, it.ench || 0);
    if (inst && !isStackable(d)) for (const k in it) if (!['uid', 'id', 'n', 'ench'].includes(k)) inst[k] = JSON.parse(JSON.stringify(it[k]));
    return inst;
}

// ───────── 交貨：把伺服器記帳的道具、金幣加進目前角色 ─────────
let marketPendingBusy = false, marketDeliverAt = 0;
const MARKET_DELIVER_MS = 3 * 60 * 1000;   // 遊戲進行中每 3 分鐘查一次有沒有賣出
async function marketDeliver(silent) {
    if (!isCloudConfigured() || !cloudLoggedIn() || !player || cloudBan || marketPendingBusy) return;
    marketPendingBusy = true;
    marketDeliverAt = Date.now();
    const who = player, slot = currentSlot;
    try {
        const p = await marketRpc('market_pending');
        if (!player.marketGot) player.marketGot = [];
        const got = player.marketGot, ackB = [], ackS = [], msgs = [];
        for (const b of p.bought || []) {
            const key = 'b' + b.id;
            if (!got.includes(key)) {
                marketGiveItem(b.item);
                got.push(key);
                msgs.push(`🛍️ 買到 ${b.name}`);
            }
            ackB.push(b.id);
        }
        for (const s of p.sold || []) {
            const key = 's' + s.id;
            if (!got.includes(key)) {
                const net = s.price - s.fee;
                player.gold += net;
                got.push(key);
                msgs.push(`💰 ${s.name} 賣給 ${s.buyer_name || '玩家'}，入帳 ${fmt(net)}（手續費 ${fmt(s.fee)}）`);
            }
            ackS.push(s.id);
        }
        while (got.length > 200) got.shift();
        if (msgs.length) {
            msgs.forEach(m => addLog(m, 'loot'));
            saveGame(); refreshUI();
            if (!silent || msgs.length) showToast(msgs.length > 1 ? `交易所：${msgs.length} 筆交易入帳` : msgs[0], 3000);
        }
        // 存檔確定上傳到雲端才確認入帳；沒傳上去（忙碌、被拒收、之後改用雲端進度）就留到下次，marketGot 擋重複入帳（2026-10-24，第 117 節）
        if ((ackB.length || ackS.length) && player === who && await cloudSyncedSlot(slot)) await marketRpc('market_ack', { p_bought: ackB, p_sold: ackS });
    } catch (e) { if (!silent) showToast('交易所：' + marketErrText(e)); }
    marketPendingBusy = false;
}

// ───────── 讀資料 ─────────
async function marketLoad(force) {
    if (!isCloudConfigured() || !cloudLoggedIn()) return;
    marketErr = '';
    if (marketView === 'mine') await marketDeliver(true);   // 看「我的上架」時順便入帳
    try {
        if (marketView === 'buy') {
            const key = JSON.stringify([marketCat, marketQ.trim(), marketSort, marketPage]), c = marketCache[key];
            if (!force && c && Date.now() - c.t < MARKET_CACHE_MS) marketRows = c.rows;
            else {
                marketRows = await marketRpc('market_browse', { p_cat: marketCat || null, p_q: marketQ.trim() || null, p_sort: marketSort, p_offset: marketPage * 50 });
                marketCache[key] = { t: Date.now(), rows: marketRows };
            }
        }
        else if (marketView === 'mine') marketMine = await marketRpc('market_mine');
    } catch (e) { marketErr = marketErrText(e); }
    marketRender();
}

function marketSetView(v) { marketView = v; marketSellUid = null; marketRows = null; marketMine = null; renderPanel(); marketLoad(); }
function marketSetCat(c) { marketCat = c; marketPage = 0; marketRows = null; renderPanel(); marketLoad(); }
function marketSetSort(s) { marketSort = s; marketPage = 0; marketLoad(); }
function marketSearch() { marketQ = ((document.getElementById('market-q') || {}).value || ''); marketPage = 0; marketLoad(); }
function marketSearchKey(ev) { ev.stopPropagation(); if (ev.key === 'Enter' && !ev.isComposing) marketSearch(); }
function marketPageGo(d) { marketPage = Math.max(0, marketPage + d); marketLoad(); }
function marketRefresh() { marketCache = {}; marketLoad(true); }

// ───────── 購買 ─────────
function marketInfo(id) {
    const r = (marketRows || []).find(x => x.id === id);
    if (!r) return;
    const inst = Object.assign({ uid: 0 }, r.item);
    const btns = r.is_mine ? [{ text: '關閉', cls: 'secondary' }]
        : [{ text: '取消', cls: 'secondary' }, { text: `購買（💰${fmt(r.price)}）`, onClick: () => marketBuy(id) }];
    openDialog(`${itemName(inst)}${r.n > 1 ? ' ×' + fmt(r.n) : ''}`, `${itemDescHtml(inst)}<p>賣家：${esc(r.seller_name || '?')}｜售價 💰${fmt(r.price)}</p>${r.is_mine ? '<p class="muted">這是你上架的商品。</p>' : ''}`, btns);
}

async function marketBuy(id) {
    const r = (marketRows || []).find(x => x.id === id);
    if (!r || marketBusy) return;
    if (!inTown()) { showToast('要在村莊裡才能使用交易所'); return; }
    if (player.gold < r.price) { showToast('金幣不足'); return; }
    marketBusy = true;
    try {
        // 伺服器直接扣雲端存檔的金幣、把道具放進去（vault.js vaultOp）
        await vaultOp('market_buy2', { p_id: id, p_buyer_name: player.name }, res => {
            player.gold += res.gold;
            marketGiveItem(res.item);
            addLog(`🛍️ 交易所購買 ${res.name}（-${fmt(res.price)} 金幣）`, 'sys');
            showToast(`買到了 ${res.name}！`);
        });
    } catch (e) { showToast(marketErrText(e)); }
    marketBusy = false;
    marketCache = {};
    marketLoad();
}

// ───────── 出售 ─────────
function marketOpenSell(uid) { closeDialog(); marketView = 'sell'; marketSellUid = uid; switchTab('market'); }
function marketPickSell(uid) { marketSellUid = uid; renderPanel(); }

async function marketListItem() {
    const inst = findInv(marketSellUid);
    if (!inst || marketBusy) return;
    if (!inTown()) { showToast('要在村莊裡才能使用交易所'); return; }
    const price = Math.floor(Number((document.getElementById('market-price') || {}).value) || 0);
    const n = isStackable(ITEMS[inst.id]) ? clamp(Math.floor(Number((document.getElementById('market-n') || {}).value) || 1), 1, inst.n) : 1;
    if (price < 1 || price > 2e9) { showToast('請輸入 1～20 億的價格'); return; }
    if (!marketTradeable(inst)) { showToast('這件道具不能交易'); return; }
    const uid = inst.uid, name = itemName(inst) + (n > 1 ? ' ×' + n : '');
    gameConfirm('上架', `以 💰${fmt(price)} 上架「${name}」？\n成交後收 5% 手續費（${fmt(Math.ceil(price * MARKET_FEE))}），實收 ${fmt(price - Math.ceil(price * MARKET_FEE))}。上架 48 小時，期間可以下架取回。`, async () => {
        marketBusy = true;
        try {
            // 伺服器直接從雲端存檔拿掉（交易所存的是存檔裡那一件），本機照樣扣掉上架的數量
            await vaultOp('market_list2', { p_uid: uid, p_n: n, p_price: price, p_seller_name: player.name, p_name: name, p_cat: ITEMS[inst.id].cat }, r => {
                const cur = findInv(uid);
                if (cur) { if (cur.n > r.n) cur.n -= r.n; else removeInst(uid); }
                addLog(`🏪 上架 ${name}（💰${fmt(price)}）`, 'sys');
                showToast('已上架');
            });
            marketSellUid = null;
            marketCache = {};
        } catch (e) { showToast(marketErrText(e)); }
        marketBusy = false;
        marketRender();
    }, '上架');
}

async function marketCancel(id) {
    if (marketBusy) return;
    if (!inTown()) { showToast('要在村莊裡才能下架取回'); return; }
    marketBusy = true;
    try {
        // 伺服器直接把道具放回目前角色的雲端存檔
        await vaultOp('market_cancel2', { p_id: id }, r => {
            marketGiveItem(r.item);
            addLog(`🏪 下架取回 ${r.name}`, 'sys');
            showToast('已下架，道具回到背包');
        });
    } catch (e) { showToast(marketErrText(e)); }
    marketBusy = false;
    marketCache = {};
    marketLoad();
}

// ───────── 畫面 ─────────
function renderMarket() {
    if (!isCloudConfigured()) return `<div class="panel notice">交易所需要雲端伺服器，目前尚未開通。</div>`;
    if (!cloudLoggedIn()) return `<div class="panel notice">交易所要先登入帳號。
        <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div></div>`;
    if (cloudBan) return `<div class="panel notice">⛔ 帳號已被管理者停權，無法使用交易所。</div>`;
    if (Date.now() - marketDeliverAt > 20000) marketDeliver(true);   // 打開交易所時入帳（20 秒內不重複查）
    const tabs = `<div class="chips">${[['buy', '🛍️ 購買'], ['sell', '🏷️ 出售'], ['mine', '📋 我的上架']].map(([v, n]) =>
        `<button class="chip-btn ${marketView === v ? 'active' : ''}" onclick="marketSetView('${v}')">${n}</button>`).join('')}</div>`;
    const town = inTown() ? '' : `<div class="panel notice">交易所在村莊裡，可以瀏覽，但要回到村莊才能購買、上架、下架。</div>`;
    const err = marketErr ? `<div class="panel notice">⚠️ ${esc(marketErr)}</div>` : '';
    return tabs + town + err + (marketView === 'sell' ? marketSellHtml() : marketView === 'mine' ? marketMineHtml() : marketBuyHtml());
}

function marketBuyHtml() {
    if (marketRows === null) setTimeout(marketLoad, 0);
    const cats = `<div class="chips">${MARKET_CATS.map(([c, n]) => `<button class="chip-btn ${marketCat === c ? 'active' : ''}" onclick="marketSetCat('${c}')">${n}</button>`).join('')}</div>`;
    const rows = marketRows === null ? '<p class="muted">讀取中…</p>' : marketRows.length ? marketRows.map(r => {
        const inst = Object.assign({ uid: 0 }, r.item);
        return `<div class="list-row"><div class="clickable item-info" onclick="marketInfo(${r.id})">${itemThumbHtml(inst.id)}<b class="${itemClass(inst)}">${esc(itemName(inst))}${r.n > 1 ? ' ×' + fmt(r.n) : ''}</b>
            <small>賣家 ${esc(r.seller_name || '?')}${r.is_mine ? '（你）' : ''}｜${agoText(Date.parse(r.listed_at))}上架</small></div>
            <button class="mini" onclick="marketInfo(${r.id})" ${r.is_mine ? 'disabled' : ''}>💰${fmt(r.price)}</button></div>`;
    }).join('') : '<p class="muted">沒有符合的商品。</p>';
    const pager = marketRows && (marketPage > 0 || marketRows.length >= 50) ? `<div class="btn-row"><button class="mini secondary" onclick="marketPageGo(-1)" ${marketPage ? '' : 'disabled'}>上一頁</button>
        <span class="muted">第 ${marketPage + 1} 頁</span><button class="mini secondary" onclick="marketPageGo(1)" ${marketRows.length >= 50 ? '' : 'disabled'}>下一頁</button></div>` : '';
    return `<div class="panel">${cats}
        <div class="btn-row"><input type="text" id="market-q" placeholder="搜尋道具名稱" value="${esc(marketQ)}" onkeydown="marketSearchKey(event)" style="flex:1;min-width:0">
            <button class="mini" onclick="marketSearch()">搜尋</button>
            <select onchange="marketSetSort(this.value)"><option value="new" ${marketSort === 'new' ? 'selected' : ''}>最新</option>
                <option value="price" ${marketSort === 'price' ? 'selected' : ''}>價格低→高</option><option value="price_desc" ${marketSort === 'price_desc' ? 'selected' : ''}>價格高→低</option></select>
            <button class="mini secondary" onclick="marketRefresh()" title="重新整理">🔄</button></div>
        <div class="list">${rows}</div>${pager}
        <small class="muted">你的金幣：💰${fmt(player.gold)}。買到的道具直接放進目前角色的背包。</small></div>`;
}

function marketSellHtml() {
    const inst = marketSellUid != null ? findInv(marketSellUid) : null;
    if (inst) {
        const d = ITEMS[inst.id], stack = isStackable(d);
        const ref = sellPriceOf(inst.id);
        return `<div class="panel"><h4>🏷️ 上架 <span class="${itemClass(inst)}">${esc(itemName(inst))}</span>${inst.n > 1 ? ' ×' + fmt(inst.n) : ''}</h4>
            ${itemDescHtml(inst)}
            ${stack ? `<label class="set-row"><span>數量（最多 ${fmt(inst.n)}）</span><input type="number" id="market-n" min="1" max="${inst.n}" value="${inst.n}" style="width:100px"></label>` : ''}
            <label class="set-row"><span>總價（金幣）</span><input type="number" id="market-price" min="1" max="2000000000" value="${Math.max(1, ref * (stack ? inst.n : 1) * 2)}" style="width:140px"></label>
            <small class="muted">參考：商店回收價每個 ${fmt(ref)}。成交收 5% 手續費；上架 48 小時，沒賣掉可以在「我的上架」取回。</small>
            <div class="btn-row"><button onclick="marketListItem()" ${marketBusy ? 'disabled' : ''}>上架</button><button class="secondary" onclick="marketPickSell(null)">換一件</button></div></div>`;
    }
    const list = sortedInv(player.inv).filter(marketTradeable).map(x => `<button class="item-row" onclick="marketPickSell(${x.uid})">
        <span class="item-face">${itemIconHtml(x.id)}<span class="${itemClass(x)}">${esc(itemName(x))}</span></span><span class="muted">${x.n > 1 ? '×' + fmt(x.n) : ''}</span></button>`).join('');
    return `<div class="panel"><h4>選擇要上架的道具</h4><small class="muted">只能賣背包裡的道具（穿在身上的要先卸下）；任務道具不能交易。同時最多上架 ${MARKET_MAX} 件。</small>
        <div class="list">${list || '<p class="muted">背包裡沒有可以交易的道具。</p>'}</div></div>`;
}

function marketMineHtml() {
    if (marketMine === null) { setTimeout(marketLoad, 0); return '<div class="panel muted">讀取中…</div>'; }
    const now = Date.now();
    const rows = marketMine.map(r => {
        const inst = Object.assign({ uid: 0 }, r.item), expired = r.state === 'active' && Date.parse(r.expires_at) <= now;
        const status = r.state === 'sold' ? `<span class="good">已賣給 ${esc(r.buyer_name || '玩家')}（實收 ${fmt(r.price - r.fee)}）</span>`
            : expired ? '<span class="warn">已過期，請取回</span>' : `上架中・剩 ${fmtDuration(Date.parse(r.expires_at) - now)}`;
        return `<div class="list-row"><div class="item-info">${itemThumbHtml(inst.id)}<b class="${itemClass(inst)}">${esc(itemName(inst))}${r.n > 1 ? ' ×' + fmt(r.n) : ''}</b><small>💰${fmt(r.price)}｜${status}</small></div>
            ${r.state === 'active' ? `<button class="mini secondary" onclick="marketCancel(${r.id})">${expired ? '取回' : '下架'}</button>` : ''}</div>`;
    }).join('');
    return `<div class="panel"><div class="row-between"><small class="muted">賣出的金幣會自動加進目前的角色（打開交易所或登入時）。</small>
        <button class="mini secondary" onclick="marketDeliver(false).then(marketLoad)">🔄 重新整理</button></div>
        <div class="list">${rows || '<p class="muted">你目前沒有上架的商品。</p>'}</div></div>`;
}

setInterval(() => {
    if (player && !document.hidden && !SIM_MODE && cloudCanCall() && Date.now() - marketDeliverAt > MARKET_DELIVER_MS) marketDeliver(true).then(() => { if (tabOpen('market')) marketLoad(); });
}, 30 * 1000);

TABS.market = ['🏪', '交易所'];
PANEL_FNS.market = renderMarket;
