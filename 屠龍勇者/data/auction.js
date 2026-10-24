// 鑽石拍賣：道具與鑽石由伺服器保管，沿用 vaultOp 存取序號。
const AUCTION_MIN = 5, AUCTION_LIST_FEE = 1, AUCTION_HOURS = 3;
let auctionView = 'browse', auctionRows = null, auctionUid = null, auctionBusy = false, auctionError = '', auctionLoading = false;
let auctionStatus = null, auctionRegistered = false, auctionQueueCount = 0, auctionClockOffset = 0;
function auctionFee(price, starting) { return price === starting ? 1 : Math.max(1, Math.ceil(price * 0.05)); }
function auctionErrText(e) {
    const m = String(e && e.message || e || '');
    const errors = {
        'auction not installed': '拍賣功能尚未安裝，請管理者先執行 auction.sql。',
        'not enough diamonds': '鑽石不足（以帳號錢包餘額為準）', 'bad starting price': '拍賣底價至少 5 鑽石',
        'bid too low': '出價已被超過，請重新整理後再出價', 'own auction': '不能競標自己的拍賣',
        'auction ended': '拍賣已結束，請重新整理', 'auction has bids': '已有出價，不能取消拍賣',
        'nothing to claim': '目前沒有可領取的拍賣物品或收入', 'not in town': '請回到村莊操作拍賣',
        'wallet full': '鑽石錢包已達上限，請先使用部分鑽石再領取',
        'already registered': '每個帳號只能登記一件待拍或拍賣中的物品',
        'auction quality too low': '物品不符合目前拍賣場最低級別設定',
    };
    if (m.includes('auction_') && (m.includes('schema cache') || m.includes('does not exist') || m.includes('Could not find'))) return errors['auction not installed'];
    for (const k in errors) if (m.includes(k)) return errors[k];
    return marketErrText(e);
}
async function auctionLoad() {
    if (auctionLoading || !vaultOnline() || marketView !== 'auction') return;
    auctionLoading = true; auctionError = '';
    const owner = player, view = auctionView;
    try {
        const r = await marketRpc('auction_browse', { p_mine: view === 'mine' });
        if (player === owner && auctionView === view) {
            auctionRows = r.rows; diaCount = r.diamonds; auctionStatus = r.status;
            auctionRegistered = !!r.registered; auctionQueueCount = r.queue_count || 0;
            auctionClockOffset = r.status && r.status.server_now ? Date.parse(r.status.server_now) - Date.now() : 0;
        }
    } catch (e) { if (player === owner) { auctionError = auctionErrText(e); auctionRows = []; } }
    auctionLoading = false; marketRender();
}
function auctionSetView(view) { auctionView = view; auctionUid = null; auctionRows = null; auctionError = ''; renderPanel(); auctionLoad(); }
function auctionRefresh() { auctionRows = null; auctionLoad(); }
function auctionPick(uid) { auctionUid = uid; renderPanel(); }
function auctionRowsHtml() {
    if (auctionRows === null) { setTimeout(auctionLoad, 0); return '<p class="muted">讀取中…</p>'; }
    return auctionRows.map(r => {
        const it = Object.assign({ uid: 0 }, r.item), queued = r.state === 'queued';
        const ended = !queued && (Date.parse(r.ends_at) <= Date.now() + auctionClockOffset || r.state !== 'active');
        const price = r.bid_amount || r.start_price, next = r.bid_amount ? r.bid_amount + 1 : r.start_price;
        let action = '';
        if (!queued && !ended && !r.is_seller) action = `<button class="mini" onclick="auctionBidDialog(${r.id})" ${auctionBusy || !inTown() ? 'disabled' : ''}>${r.is_bidder ? '提高出價' : '出價'} 💎${fmt(next)}</button>`;
        if (!ended && r.is_seller && !r.bid_amount) action = `<button class="mini secondary" onclick="auctionCancel(${r.id})" ${auctionBusy || !inTown() ? 'disabled' : ''}>取消取回</button>`;
        if (['sold','unsold'].includes(r.state) && ((r.is_seller && !r.seller_claimed) || (r.is_bidder && !r.buyer_claimed))) action = `<button class="mini" onclick="auctionClaim(${r.id})" ${auctionBusy || !inTown() ? 'disabled' : ''}>${r.is_seller && r.bid_amount ? '領取收入' : '領取物品'}</button>`;
        const state = queued ? `排隊中｜號碼牌 ${r.ticket}（未入選保留）` : r.state === 'cancelled' ? '已取消取回' : ended ? r.bid_amount ? `已成交｜服務費 💎${fmt(auctionFee(price,r.start_price))}｜賣家實收 💎${fmt(price - auctionFee(price,r.start_price))}` : '已流標' : `剩 ${fmtDuration(Date.parse(r.ends_at) - Date.now() - auctionClockOffset)}${r.is_bidder ? '｜你目前最高標' : ''}`;
        return `<div class="list-row"><div class="item-info">${itemThumbHtml(it.id)}<b class="${itemClass(it)}">${esc(itemName(it))}${r.n > 1 ? ' ×' + fmt(r.n) : ''}</b><small>賣家 ${esc(r.seller_name || '?')}｜${r.bid_amount ? '目前出價' : '底價'} 💎${fmt(price)}<br>${state}</small></div>${action}</div>`;
    }).join('') || '<p class="muted">目前沒有拍賣紀錄。</p>';
}
function auctionSellHtml() {
    if (auctionRegistered) return '<p class="notice">你已有一件排隊或拍賣中的物品，請到「我的拍賣／出價」查看號碼牌。</p>';
    if (!auctionStatus) { if (!auctionError) setTimeout(auctionLoad,0); return '<p class="muted">請先讀取拍賣場設定。</p>'; }
    const it = auctionUid == null ? null : findInv(auctionUid);
    if (!it) return `<h4>選擇拍賣物品（每次一件）</h4><div class="list">${sortedInv(player.inv).filter(auctionEligible).map(x => `<button class="item-row" onclick="auctionPick(${x.uid})">${itemIconHtml(x.id)}<span class="${itemClass(x)}">${esc(itemName(x))}</span></button>`).join('') || '<p class="muted">背包沒有符合拍賣門檻的物品。</p>'}</div>`;
    return `<h4>拍賣 ${esc(itemName(it))} ×1</h4>${itemDescHtml(it)}<label class="set-row">拍賣底價（鑽石）<input id="auction-price" type="number" min="5" max="1000000" value="5"></label><div class="btn-row"><button onclick="auctionList()" ${auctionBusy || !inTown() ? 'disabled' : ''}>登記抽號碼牌（💎1）</button><button class="secondary" onclick="auctionPick(null)">換一件</button></div>`;
}
function auctionEligible(it) {
    const s=auctionStatus;
    return marketTradeable(it) && !!s && ((s.allowed_ids||[]).includes(it.id) || (s.allowed_cats||[]).includes(ITEMS[it.id].cat) || (qualityRank(it)>=s.min_rank && (it.il||0)>=s.min_il && (!s.equipment_only || ['weapon','armor','accessory'].includes(ITEMS[it.id].cat))));
}
function auctionHtml() {
    const s=auctionStatus, phase=s ? `${s.phase==='active'?'拍賣進行中':'拍賣場休息中'}｜${s.phase==='active'?'本輪結束':'下輪開始'}：${new Date(s.ends_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}｜排隊 ${auctionQueueCount} 件` : '拍賣場資料讀取中';
    const threshold=s ? `${['普通','魔法','稀有（黃裝）','傳說'][s.min_rank]}品質以上${s.equipment_only?'裝備':'物品'}${s.min_il?'／物品等級 '+s.min_il+'以上':''}；另有祝福卷軸、BOSS材料、頂級通貨與娃娃白名單` : '讀取中';
    return `<div class="panel"><div class="chips">${[['browse','競標'],['sell','刊登拍賣'],['mine','我的拍賣／出價']].map(([v,n]) => `<button class="chip-btn ${auctionView === v ? 'active' : ''}" onclick="auctionSetView('${v}')">${n}</button>`).join('')}<button class="mini secondary" onclick="auctionRefresh()" ${auctionLoading ? 'disabled' : ''}>🔄</button>${s&&s.is_admin?'<button class="mini secondary" onclick="auctionConfigDialog()">管理門檻</button>':''}</div><p>${phase}</p><p>最低刊登級別：${threshold}</p><p>💎 ${diaCount == null ? '讀取中' : fmt(diaCount)}｜底價至少 5 鑽｜刊登費 1 鑽（不退）</p><small class="muted">每輪3小時、最多10件，休息2小時。每帳號登記一件、抽號碼牌排隊，未入選保留。每次加價1鑽；成交5%進位、最低1鑽，僅以底價成交收1鑽。出價先保留，被超標退回；已有出價不能取消。</small>${auctionError ? `<p class="bad">${esc(auctionError)}</p>` : ''}${auctionView === 'sell' ? auctionSellHtml() : `<div class="list">${auctionRowsHtml()}</div>`}</div>`;
}
async function auctionOp(fn, args, apply) {
    if (auctionBusy || !player) return;
    if (!inTown()) { showToast('請回到村莊操作拍賣'); return; }
    auctionBusy = true;
    try { await vaultOp(fn, args, r => { diaCount = r.diamonds; if (r.item) marketGiveItem(r.item); if (apply) apply(r); }); auctionRows = null; }
    catch (e) { showToast(auctionErrText(e)); }
    finally { auctionBusy = false; if (marketView === 'auction') { if (auctionView !== 'sell') await auctionLoad(); marketRender(); } }
}
function auctionList() {
    const it = findInv(auctionUid); if (!it || auctionBusy) return;
    const price = Number(($('auction-price') || {}).value), n = 1;
    if (!auctionEligible(it)) { showToast('物品不符合拍賣場最低級別設定'); return; }
    if (!Number.isSafeInteger(price) || price < 5 || price > 1000000 || !Number.isSafeInteger(n) || n < 1 || n > it.n) { showToast('底價需為 5～100萬的整數，數量不能超過持有數量'); return; }
    const owner = player, uid = it.uid, name = itemName(it);
    gameConfirm('登記拍賣', `以底價 ${price} 鑽登記「${name}」×1，立即支付 1 鑽刊登費（不退），物品由拍賣場保管。抽號碼牌排隊，每輪最多10件、3小時後休息2小時；未入選保留。成交收5%進位、最低1鑽，僅底價成交收1鑽。`, () => {
        if (player !== owner) return;
        auctionOp('auction_list', { p_uid: uid, p_n: n, p_start: price, p_name: name }, r => {
            const cur = findInv(uid); if (cur) { if (cur.n > r.n) cur.n -= r.n; else removeInst(uid); }
            auctionUid = null; auctionView = 'mine'; showToast('已登記，號碼牌 '+r.ticket);
        });
    }, '刊登');
}
function auctionBidDialog(id) {
    const r = (auctionRows || []).find(x => x.id === id); if (!r || r.is_seller || auctionBusy) return;
    const owner = player;
    const next = r.bid_amount ? r.bid_amount + 1 : r.start_price;
    openDialog('鑽石競標', `<p>${esc(r.name)}｜本次出價 💎${fmt(next)}</p><input type="hidden" id="auction-bid" value="${next}"><p class="muted">每次固定加1鑽。出價先保留鑽石，被超標後退回；得標後到「我的拍賣／出價」領物品。</p>`, [{text:'取消',cls:'secondary'},{text:'確認出價',keep:true,onClick:()=>{
        if (player !== owner) { closeDialog(); return; }
        const amount = Number(($('auction-bid') || {}).value);
        if (!Number.isSafeInteger(amount) || amount !== next || amount > 1000000) { showToast('請重新整理後出價'); return; }
        closeDialog(); auctionOp('auction_bid', { p_id: id, p_amount: amount }, () => showToast('出價成功'));
    }}]);
}
function auctionCancel(id) { const owner = player; gameConfirm('取消拍賣', '取回物品，已付的 1 鑽刊登費不退。已有出價的拍賣不能取消。', () => { if (player === owner) auctionOp('auction_cancel', { p_id: id }, () => showToast('已取回拍賣物品')); }); }
function auctionClaim(id) { auctionOp('auction_claim', { p_id: id }, r => showToast(r.item ? '拍賣物品已領取' : '拍賣收入已入帳')); }
function auctionConfigDialog() {
    const s=auctionStatus;if(!s||!s.is_admin)return;
    const owner=player;
    openDialog('拍賣最低刊登級別', `<label>裝備最低品質<select id="auction-rank">${['普通','魔法','稀有（黃裝）','傳說'].map((n,i)=>`<option value="${i}" ${s.min_rank===i?'selected':''}>${n}</option>`).join('')}</select></label><label>最低物品等級<input id="auction-il" type="number" min="0" max="999" value="${s.min_il}"></label><label>額外開放道具ID（逗號分隔）<textarea id="auction-ids">${esc((s.allowed_ids||[]).join(','))}</textarea></label><label>額外開放分類（例如doll、未來mercenary）<input id="auction-cats" value="${esc((s.allowed_cats||[]).join(','))}"></label><p class="muted">裝備門檻與額外白名單擇一符合即可。任務道具仍不能拍賣；已排隊物品不追溯下架。</p>`,[{text:'取消',cls:'secondary'},{text:'儲存設定',keep:true,onClick:async()=>{
        if(player!==owner||auctionBusy)return;
        const rank=Number($('auction-rank').value),il=Number($('auction-il').value),ids=$('auction-ids').value.split(',').map(x=>x.trim()).filter(Boolean),cats=$('auction-cats').value.split(',').map(x=>x.trim()).filter(Boolean);
        if(!Number.isInteger(rank)||rank<0||rank>3||!Number.isInteger(il)||il<0||il>999){showToast('門檻數值不正確');return;}
        auctionBusy=true;
        try{await marketRpc('auction_configure',{p_rank:rank,p_equipment:true,p_il:il,p_draw:'round',p_ids:ids,p_cats:cats});closeDialog();await auctionLoad();showToast('拍賣門檻已更新');}
        catch(e){showToast(auctionErrText(e));}finally{auctionBusy=false;}
    }}]);
}
// 拍賣是伺服器真實時間；只在拍賣分頁前景每30秒重新整理，不依遊戲加速時鐘。
setInterval(()=>{if(player&&!SIM_MODE&&!document.hidden&&tabOpen('market')&&marketView==='auction'&&auctionView!=='sell'&&!auctionBusy&&!auctionLoading)auctionLoad();},30000);
