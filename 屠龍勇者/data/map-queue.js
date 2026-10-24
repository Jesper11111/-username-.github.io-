// 異界地圖排程：最多五種地圖，各列依張數刷完才換下一列（第126節）。
// 載入於ui-frame後；maps／combat只在執行期呼叫本檔，排程不參與離線模擬。
const MAP_QUEUE_MAX = 5;
function mapQueueGet() {
    if (!player.mapQueue) player.mapQueue = { slots: [], state: 'idle', index: 0, active: false, reason: '' };
    return player.mapQueue;
}
function mapQueueNormalize(p) {
    const q = p.mapQueue;
    if (!q || !Array.isArray(q.slots)) { p.mapQueue = null; return; }
    const seen = new Set();
    q.slots = q.slots.slice(0, MAP_QUEUE_MAX).map(s => {
        if (!s || typeof s.key !== 'string' || !Array.isArray(s.uids)) return null;
        const uids = s.uids.filter(u => {
            if (!Number.isSafeInteger(u) || u < 1 || seen.has(u)) return false;
            seen.add(u); return true;
        });
        return { key: s.key, name: String(s.name || '異界地圖'), uids,
            done: Math.max(0, Math.floor(Number(s.done) || 0)), failed: Math.max(0, Math.floor(Number(s.failed) || 0)) };
    });
    q.index = clamp(Math.floor(Number(q.index) || 0), 0, MAP_QUEUE_MAX);
    q.active = q.active === true;
    const wasRunning = q.state === 'running';
    q.state = ['idle', 'paused', 'done'].includes(q.state) ? q.state : 'paused';
    q.reason = wasRunning ? '重新進入角色，請按繼續' : String(q.reason || '');
    if (q.active || wasRunning) p.hunting = false;
    if (q.active && (!q.slots[q.index] || !(p.mapRun || p.mapPortal) || (p.mapRun || p.mapPortal).queueSlot !== q.index)) {
        q.active = false; q.state = 'paused'; q.reason = '目前地圖已關閉，請確認後繼續';
    }
}
function mapQueueChoices(index) {
    const q = mapQueueGet(), used = new Set(q.slots.filter((s, i) => s && i !== index).map(s => s.key));
    return groupMaps(player.inv.filter(x => ITEMS[x.id] && ITEMS[x.id].cat === 'map')).filter(g => !used.has(mapKindKey(g.x)));
}
function mapQueueSet(index) {
    const q = mapQueueGet();
    if (q.state !== 'idle' || !Number.isInteger(index) || index < 0 || index >= MAP_QUEUE_MAX) return;
    const sel = $('map-queue-select-' + index), qty = $('map-queue-qty-' + index);
    const x = sel && findInv(Number(sel.value)), n = qty && Number(qty.value);
    if (!x || !ITEMS[x.id] || ITEMS[x.id].cat !== 'map') { showToast('請先選擇地圖'); return; }
    const key = mapKindKey(x), g = mapQueueChoices(index).find(g => mapKindKey(g.x) === key);
    if (!g || !Number.isSafeInteger(n) || n < 1 || n > g.count) { showToast('張數需為整數，且不能超過背包持有數量'); return; }
    const uids = player.inv.filter(x => ITEMS[x.id].cat === 'map' && mapKindKey(x) === key).slice(0, n).map(x => x.uid);
    q.slots[index] = { key, name: itemName(x) + '・' + mapZoneFor(ITEMS[x.id].tier).name, uids, done: 0, failed: 0 };
    saveGame(); refreshUI();
}
function mapQueueSelectChanged(index) {
    const sel = $('map-queue-select-' + index), qty = $('map-queue-qty-' + index);
    if (!sel || !qty) return;
    const g = mapQueueChoices(index).find(g => g.x.uid === Number(sel.value));
    qty.max = g ? g.count : 1;
    qty.value = Math.max(1, Math.min(Number(qty.value) || 1, Number(qty.max)));
}
function mapQueueRemove(index) {
    const q = mapQueueGet();
    if (q.state !== 'idle') return;
    q.slots[index] = null; saveGame(); refreshUI();
}
function mapQueueMove(index, delta) {
    const q = mapQueueGet(), to = index + delta;
    if (q.state !== 'idle' || to < 0 || to >= MAP_QUEUE_MAX) return;
    [q.slots[index], q.slots[to]] = [q.slots[to] || null, q.slots[index] || null];
    saveGame(); refreshUI();
}
function mapQueueAutoPause(reason) {
    const q = player && player.mapQueue;
    if (SIM_MODE || !q || q.state !== 'running') return;
    q.state = 'paused'; q.reason = reason || '掛機已停止';
    addLog('📋 地圖排程暫停：' + q.reason, 'warn');
}
function mapQueueLost(reason) {
    const q = player && player.mapQueue;
    if (SIM_MODE || !q || !q.active) return;
    const s = q.slots[q.index];
    if (s) s.failed++;
    q.active = false;
    mapQueueAutoPause(reason || '目前地圖已關閉');
    if (q.state === 'paused') q.reason = reason || '目前地圖已關閉';
}
function mapQueueCompleted(r) {
    const q = player && player.mapQueue;
    if (SIM_MODE || !q || !q.active || r.queueSlot !== q.index) return;
    const s = q.slots[q.index];
    if (s) s.done++;
    q.active = false;
}
function mapQueueSupplyReason() {
    if (barHealAuto() && healPotionCount() === 0) return '藥水用完，請先補給';
    const st = calcStats();
    if (invWeight() >= st.weightMax * player.settings.weightPct / 100) return '負重過高，請先整理背包';
    const w = st.weapon && WEAPON_TYPES[st.weapon.type];
    if (w && w.ranged && countItem(w.ammo) + countItem(w.ammo === 'arrow' ? 'silverArrow' : 'silverBullet') === 0) return '彈藥用完，請先補給';
    return '';
}
function mapQueueStart() {
    const q = mapQueueGet();
    if (q.state === 'running' || q.state === 'done') return;
    if (!q.active && !q.slots.some(s => s && s.uids.length)) {
        if (q.slots.some(s => s && (s.done || s.failed))) {
            q.state = 'done'; q.reason = '安排的卷軸已全部使用'; saveGame(); refreshUI();
        } else showToast('請先安排地圖與張數');
        return;
    }
    const r = player.mapRun || player.mapPortal;
    if (r && (!q.active || r.queueSlot !== q.index)) { showToast('請先完成或關閉目前的異界地圖'); return; }
    if (!r && !inTown()) { showToast('請先回村莊開始地圖排程'); return; }
    if (walkHome) { showToast('正在步行回村'); return; }
    const why = mapQueueSupplyReason();
    if (why) { showToast(why); return; }
    if (!lootCanPlay()) return;
    q.state = 'running'; q.reason = '';
    if (q.active && r) {
        if (player.mapPortal) enterMapPortal(); else startHunt();
    } else {
        q.active = false;
        mapQueueTick();
    }
    saveGame(); refreshUI();
}
function mapQueuePause() {
    const q = player.mapQueue;
    if (!q || q.state !== 'running') return;
    mapQueueAutoPause('手動暫停');
    if (q.active && player.hunting) stopHunt('⏸ 暫停地圖排程');
    saveGame(); refreshUI();
}
function mapQueueCancel() {
    if (!player.mapQueue) return;
    const owner = player, expected = player.mapQueue;
    gameConfirm('取消地圖排程', '清除全部排程？未使用的卷軸仍在背包，目前地圖進度會保留並停止掛機。', () => {
        if (player !== owner || player.mapQueue !== expected) return;
        const q = player.mapQueue;
        if (!q) return;
        if (q.active && player.hunting) stopHunt('⏹ 取消地圖排程');
        for (const r of [player.mapRun, player.mapPortal]) if (r) delete r.queueSlot;
        player.mapQueue = null;
        saveGame(); refreshUI();
    }, '取消排程');
}
function mapQueueTick() {
    const q = player && player.mapQueue;
    if (SIM_MODE || !q || q.state !== 'running') return;
    if (q.active) {
        if (!player.mapRun && !player.mapPortal) mapQueueLost('目前地圖已關閉');
        else if (player.mapPortal || !player.hunting) mapQueueAutoPause('已回村或停止掛機，請按繼續');
        return;
    }
    while (q.index < MAP_QUEUE_MAX && (!q.slots[q.index] || !q.slots[q.index].uids.length)) q.index++;
    if (q.index >= MAP_QUEUE_MAX) {
        q.state = 'done'; q.reason = '全部地圖已刷完';
        addLog('📋 地圖排程完成！', 'boss'); saveGame(); return;
    }
    if (!inTown() || player.mapRun || player.mapPortal || walkHome) { mapQueueAutoPause('要在村莊且沒有其他異界，才能開下一張'); saveGame(); return; }
    const why = mapQueueSupplyReason();
    if (why) { mapQueueAutoPause(why); saveGame(); return; }
    if (!lootCanPlay()) { mapQueueAutoPause('後端掉寶連線尚未就緒，請稍後繼續'); saveGame(); return; }
    const s = q.slots[q.index], uid = s.uids[0], x = findInv(uid);
    if (!x || !ITEMS[x.id] || ITEMS[x.id].cat !== 'map' || mapKindKey(x) !== s.key) {
        mapQueueAutoPause('安排的卷軸已不在背包或已被改造，請取消後重新安排'); saveGame(); return;
    }
    q.active = true;
    s.uids.shift();
    openMap(uid, true);
    if (player.mapRun) player.mapRun.queueSlot = q.index;
    else { s.uids.unshift(uid); q.active = false; mapQueueAutoPause('無法開啟地圖'); }
    saveGame();
}
function mapQueueLiveHtml() {
    const q = mapQueueGet(), names = { idle: '尚未開始', running: '執行中', paused: '已暫停', done: '已完成' };
    const r = q.active && (player.mapRun || player.mapPortal);
    return `<b>📋 ${names[q.state]}</b>${q.reason ? `<small>${esc(q.reason)}</small>` : ''}${r ? `<small>目前第 ${q.index + 1} 格・${esc(r.name)}・${r.left > 0 ? `剩 ${fmt(r.left)} / ${fmt(r.total)} 隻` : '等待擊倒首領'}</small>` : ''}
        <div class="btn-row"><button onclick="mapQueueStart()" ${q.state === 'running' || q.state === 'done' ? 'disabled' : ''}>▶ ${q.state === 'paused' ? '繼續' : '開始'}</button><button class="secondary" onclick="mapQueuePause()" ${q.state === 'running' ? '' : 'disabled'}>⏸ 暫停</button><button class="danger" onclick="mapQueueCancel()">⏹ 取消</button></div>`;
}
function mapQueueRowStatus(i) {
    const q = mapQueueGet(), s = q.slots[i];
    const active = q.active && q.index === i;
    return s ? `共 ${s.done + s.failed + s.uids.length + (active ? 1 : 0)} 張・完成 ${s.done} 次${s.failed ? `・中斷 ${s.failed} 次` : ''}・${active ? '進行中 1 張・' : ''}待刷 ${s.uids.length} 張` : '尚未安排';
}
function updateMapQueueLive() {
    const el = $('map-queue-live');
    if (!el || !player) return;
    setHtmlStable(el, mapQueueLiveHtml());
    for (let i = 0; i < MAP_QUEUE_MAX; i++) { const row = $('map-queue-status-' + i); if (row) row.textContent = mapQueueRowStatus(i); }
}
function renderMapQueue() {
    const q = mapQueueGet(), editable = q.state === 'idle';
    let h = `<div class="panel"><small>最多安排 5 種地圖，依第 1～5 格順序刷完。相同區域、階級、品質與詞綴的卷軸可放多張；每次進圖才扣 1 張。</small><small class="muted">死亡、回村或補給不足會暫停；重開遊戲保留排程，需按繼續。取消不會扣掉未使用的卷軸。</small></div><div id="map-queue-live" class="panel">${mapQueueLiveHtml()}</div>`;
    for (let i = 0; i < MAP_QUEUE_MAX; i++) {
        const s = q.slots[i], groups = mapQueueChoices(i);
        h += `<div class="panel map-queue-row"><b>地圖 ${i + 1}${s ? '：' + esc(s.name) : ''}</b><small id="map-queue-status-${i}">${esc(mapQueueRowStatus(i))}</small>
            <fieldset ${editable ? '' : 'disabled hidden'}><select id="map-queue-select-${i}" aria-label="地圖 ${i + 1}" onchange="mapQueueSelectChanged(${i})"><option value="">選擇背包地圖</option>${groups.map(g => `<option value="${g.x.uid}" ${s && s.key === mapKindKey(g.x) ? 'selected' : ''}>${esc(itemName(g.x))}・${esc(mapZoneFor(ITEMS[g.x.id].tier).name)}（${g.count} 張）</option>`).join('')}</select>
            <div class="btn-row"><input id="map-queue-qty-${i}" type="number" inputmode="numeric" min="1" value="${s ? Math.max(1, s.uids.length) : 1}" aria-label="地圖 ${i + 1} 張數"><span>張</span><button class="mini" onclick="mapQueueSet(${i})">設定</button><button class="mini secondary" onclick="mapQueueMove(${i},-1)" ${i ? '' : 'disabled'}>↑</button><button class="mini secondary" onclick="mapQueueMove(${i},1)" ${i < MAP_QUEUE_MAX - 1 ? '' : 'disabled'}>↓</button><button class="mini secondary" onclick="mapQueueRemove(${i})">清空</button></div></fieldset></div>`;
    }
    return h + '<small class="muted">開始後要更換地圖或張數，請先取消排程再重新設定。排程中的卷軸請留在背包。</small>';
}
TABS.mapQueue = ['📋', '地圖排程'];
PANEL_FNS.mapQueue = renderMapQueue;
