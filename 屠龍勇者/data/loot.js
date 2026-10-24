// 後端掉寶：伺服器抽選、持久重試、原子本機收據。依賴save/cloud/market/vault，執行期呼叫combat。
// 不新增player欄位；收據在存檔外層lootCursor，正式規則見tools/SERVER-LOOT.md。
const LOOT_PROTOCOL = 1;
// 緊急開關（第 103 節）：Supabase 卡死、連 SQL 都執行不了時，改成 true 推上線，遊戲就不再找後端掉寶、改用一般掉寶，玩家可以照常掛機。恢復後改回 false
const LOOT_FORCE_LOCAL = false;   // 2026-10-23 l 版開、n 版關（第 105、107 節）
let lootMode = 'legacy', lootBusy = false, lootProbeAt = 0, lootNoticeAt = 0, lootPendingAt = 0, lootSyncFailAt = 0;
// 批次結算（第 104 節，tools/loot-batch.sql）：擊殺先排隊，同一角色滿 10 隻或最早那隻等了 30 秒才一起結算（一批最多 50 隻）
const LOOT_BATCH_N = 10, LOOT_BATCH_MS = 30000, LOOT_BATCH_MAX = 50;
let lootFlushWanted = false;
let lootBatchMissing = false;   // 伺服器還沒執行 loot-batch.sql（找不到 loot_finish_batch）：改回一隻一隻結算，先推遊戲也不會卡住   // 停止掛機、離開畫面、使用倉庫／交易所前：不等湊滿，下次就結算
function lootActive() { return !SIM_MODE && lootMode === 'active'; }
function lootRequired() { return !SIM_MODE && lootMode !== 'legacy'; }
function lootChar(p = player) { return p ? String(p.created) + '|' + p.cls : ''; }
function lootNotice(msg) { if (gameNow >= lootNoticeAt) { lootNoticeAt = gameNow + 5000; showToast(msg, 4000); } }
// 伺服器生怪（loot_spawn）讀雲端存檔的這些欄位判斷資格；只有它們變了才需要先上傳整份存檔（第 100 節）。
// 背包、金幣、經驗不影響生怪，照一般 60 秒上傳即可（原本每隻怪都強制上傳，玩家一多資料庫就撐不住）
function lootSnapKey(p) {
    if (!p) return '';
    const mr = p.mapRun, q = p.quests || {};
    return JSON.stringify([p.cls, p.lv, p.loc && [p.loc.type, p.loc.id, p.loc.floor], p.towerMax, p.towerCleared, p.towerBossCd, p.dragons, p.dragonCd,
        mr ? [mr.zone, mr.t, mr.mods, mr.left <= 0] : null, [q.ch, q.active, q.bossDone, q.prog]]);
}
// 這一格的雲端存檔已經有角色、生怪資格欄位也跟目前一樣（cloud.js 上傳成功時記 cloudSnapKey）
function lootCloudFresh(slot) { return cloudKnown[slot] != null && !cloudConflict[slot] && cloudSnapKey[slot] === lootSnapKey(player); }

// 暫時性的連線問題（剛從背景回來網路還沒恢復、逾時、雲端存檔還沒傳完）：掛機暫停等它恢復，不要直接停止（第 99 節）
function lootTransient(e) { return /timeout|Failed to fetch|NetworkError|network|Load failed|請先完成雲端同步/i.test(String((e && e.message) || e || '')); }
// 已登入、沒被停權，只是後端狀態還在確認／剛才連不上：等下一次 lootProbe 恢復
function lootWaiting() { return !SIM_MODE && (lootMode === 'checking' || lootMode === 'blocked') && cloudLoggedIn() && !cloudBan; }
function lootCanPlay() {
    if (SIM_MODE || lootMode === 'legacy') return true;
    if (lootMode !== 'active') { lootNotice('後端掉寶連線尚未就緒，請稍後再試'); return false; }
    if (!cloudLoggedIn() || cloudBan) { lootNotice('線上掉寶需要登入帳號'); return false; }
    return true;
}
function lootEnvelope(data, previous) {
    data.lootProtocol = LOOT_PROTOCOL;
    data.lootCursor = previous && lootChar(previous.player) === lootChar(data.player) ? Number(previous.lootCursor) || 0 : 0;
    return data;
}
function lootQueueKey() { return 'dragonSlayer_loot_jobs_' + cloudUser.id; }
function lootJobs() { const raw = localStorage.getItem(lootQueueKey()); return raw ? saveParse(raw) : []; }
function lootStore(jobs) { localStorage.setItem(lootQueueKey(), saveEncode(JSON.stringify(jobs))); }
function lootEnqueue(job) {
    const jobs = lootJobs();
    if (!jobs.some(j => j.key === job.key)) { jobs.push(job); lootStore(jobs); }
    lootPump();
}
async function lootProbe() {
    if (!cloudSb || lootBusy) return;
    try {
        const r = await marketRpc('loot_status');
        if (!r || r.protocol !== LOOT_PROTOCOL || (r.enabled && !r.rules)) throw Error('掉寶規則尚未安裝');
        // 管理者明確停用（enabled=false）才改用一般掉寶，不用重新整理就能繼續掛機（第 103 節）；連不上、回應錯誤一律不退回本機抽獎
        if (lootMode === 'active' && !r.enabled) lootNotice('後端掉寶已暫停，改用一般掉寶');
        lootMode = r.enabled ? 'active' : 'legacy';
    } catch (e) {
        if (lootMode !== 'active') lootMode = 'blocked';
        if (lootTransient(e)) { lootProbeAt = gameNow + 5000; return; }   // 連不上：5 秒後再查，掛機只暫停
        if (player && player.hunting) stopHunt('⚠️ 後端掉寶連線失敗，已停止掛機；沒有改用本機抽獎');
    }
}
function lootStart() {
    if (!isCloudConfigured() || LOOT_FORCE_LOCAL) return;   // lootMode 維持 legacy
    lootMode = 'checking';
    setInterval(() => { if (!cloudCanCall()) return; if (gameNow >= lootProbeAt) { lootProbeAt = gameNow + 30000; lootProbe(); } lootPump(); }, 5000);   // 伺服器忙碌退避中先不查（cloud.js，第 102 節）
    lootProbe();
}
async function lootSpawn(join = false, mid = null, sceneTarget = null) {
    if (!lootCanPlay() || !hunt || hunt.lootWait) return;
    if (!cloudCanCall()) {   // 伺服器忙碌退避中：等退避結束再找怪，不停止掛機（第 102 節）
        if (!join) { hunt.state = 'search'; hunt.timer = Math.max(3000, cloudBackoffUntil - Date.now()); }
        lootNotice('⏳ 雲端伺服器忙碌，稍後自動繼續掛機');
        return;
    }
    const h = hunt, p = player, slot = currentSlot, char = lootChar(), dir = player.loc.id, floor = player.loc.floor, uid = cloudUser.id;
    h.lootWait = true;
    const previousScene = typeof scene === 'undefined' ? null : scene;
    try {
        if (!lootCloudFresh(slot)) { saveGame(); if (!await cloudSyncedSlot(slot)) throw Error('請先完成雲端同步'); }
        if (!cloudUser || cloudUser.id !== uid || player !== p || hunt !== h) return;
        const keep = [...h.mobs.map(m => m.lootTicket), ...lootJobs().filter(j => j.kind === 'kill' && j.char === char).map(j => j.ticket)].filter(Boolean);
        if (!h.lootReleased) { await marketRpc('loot_release', { p_slot:slot,p_char:char,p_keep:keep }); h.lootReleased = true; }   // 每次掛機（換地圖會重新開始）只釋放一次（第 104 節）
        if (!cloudUser || cloudUser.id !== uid || player !== p || hunt !== h) return;
        const rows = await marketRpc('loot_spawn', { p_slot: slot, p_char: char, p_key: crypto.randomUUID(), p_join: join, p_mid: mid });
        if (player !== p || hunt !== h || !p.hunting || p.loc.id !== dir || p.loc.floor !== floor) return;
        if (!Array.isArray(rows) || !rows.length || rows.length > 8 || rows.some(r => !r.ticket || !r.monster || !MONSTERS[r.monster.id] && !/^tower(Boss)?\d+$/.test(r.monster.id) && r.monster.id !== 'questBoss')) throw Error('掉寶怪物資料不正確');
        if (!join) { h.mobs = []; h.mon = null; h.state = 'fight'; h.pCd = 300; h.joinCd = MOB_JOIN_MS; h.warned.home = false; }
        for (const row of rows) {
            const mon = row.monster; mon.lootTicket = row.ticket;
            // 精英資格由後端抽選；其餘地圖戰鬥倍率沿用既有規則。
            addMob(weakenForPack(mon, join ? h.mobs.length + 1 : rows.length));
        }
        if (sceneTarget && scene === previousScene && scene && scene.mons.includes(sceneTarget)) {
            const mon = rows[0].monster;
            sceneTarget.inst = mon; sceneTarget.icon = mon.icon; sceneTarget.name = mon.name; sceneTarget.lastHp = mon.hp;
            h.mon = mon; scene.manualUntil = 0; scene.focusUntil = gameNow + RELOCK_MS;
            scene.effects.push({ x:sceneTarget.rx,y:sceneTarget.ry,t:0,dur:350,color:'#ffe7a8' });
            updateHuntLive();
        }
        if (rows[0].monster.mapBoss && inMapRun()) {
            const mon = h.mobs[0]; if (p.mapRun.bossHp > 0) mon.hp = Math.min(mon.maxHp, p.mapRun.bossHp);
            p.mapRun.boss = true;
        }
        addLog(join ? '⚔️ 附近的怪物加入戰鬥' : `⚔️ 遭遇${rows[0].monster.name}（後端掉寶）`, '');
    } catch (e) {
        if (player !== p || hunt !== h) return;
        if (/loot disabled/.test(String(e && e.message))) { lootProbeAt = 0; lootProbe(); }   // 管理者剛停用：馬上重查，改用一般掉寶
        if (/loot encounters full/.test(String(e && e.message))) { h.lootReleased = false; lootSettleNow(); }   // 沒結算的太多：下次先釋放、並馬上結算
        if (lootTransient(e) || /loot disabled|loot encounters full/.test(String(e && e.message))) {   // 連線暫時不通：3 秒後自動再找怪，不停止掛機
            if (!join) { h.state = 'search'; h.timer = 3000; }
            lootNotice('⏳ 後端掉寶連線中，恢復後自動繼續掛機');
        } else stopHunt('⚠️ 後端掉寶尚未就緒：' + cloudErrText(e));
    } finally { h.lootWait = false; }
}
function lootKill(mon) {
    if (!mon.lootTicket) { stopHunt('⚠️ 怪物沒有後端掉寶憑證，請重新開始掛機'); return; }
    try { lootEnqueue({ key: mon.lootTicket, kind: 'kill', ticket: mon.lootTicket, slot: currentSlot, char: lootChar(), at: Date.now() }); }
    catch (e) { stopHunt('⚠️ 無法保存掉寶重試紀錄，已停止掛機'); }
}
function lootRaid(runKey, char) {
    const split = runKey.lastIndexOf(':'), room = runKey.slice(0, split), round = Number(runKey.slice(split + 1));
    let slot = currentSlot;
    for (let i = 0; i < MAX_SLOTS; i++) {
        const raw = localStorage.getItem(slotKey(i));
        if (raw && lootChar(saveParse(raw).player) === char) { slot = i; break; }
    }
    lootEnqueue({ key: runKey + ':' + char, kind: 'raid', room, round, slot, char });
}
// 同步修改背包與外層收據後只寫一次localStorage；寫入失敗即還原，不留半套入帳。
function lootApply(result) {
    if (!result || !Number.isSafeInteger(result.cursor) || result.cursor < 1 || !Number.isInteger(result.slot) || result.slot < 0 || result.slot >= MAX_SLOTS || !Array.isArray(result.items)) throw Error('不正確的後端獎勵收據');
    const raw = localStorage.getItem(slotKey(result.slot)); if (!raw) return false;
    const data = saveParse(raw);
    if (saveOwnerOf(data) !== cloudUser.id || lootChar(data.player) !== result.char) return false;
    if ((Number(data.lootCursor) || 0) >= result.cursor) return true;
    if ((Number(data.lootCursor) || 0) + 1 !== result.cursor) return false;
    const live = player && currentSlot === result.slot && lootChar() === result.char, keep = player;
    const target = live ? player : guardWrap(migrateSave(data));
    const before = { inv: JSON.parse(JSON.stringify(target.inv)), nextUid: target.nextUid, gold: target.gold };
    const messages = [];
    try {
        player = target;
        for (const source of result.items) {
            const it = JSON.parse(JSON.stringify(source)), d = ITEMS[it.id];
            if (!d || !Number.isSafeInteger(it.n) || it.n < 1) throw Error('不正確的後端物品');
            if (it.questMax) it.n = Math.min(it.n, Math.max(0, it.questMax - countItem(it.id)));
            delete it.questMax; if (!it.n) continue;
            if (lootFiltered(it, target.settings.lootFilter)) {
                const gold = instSellPrice(it) * it.n; target.gold += gold;
                messages.push([`🪙 自動賣出 ${itemName(it)}（+${fmt(gold)}）`, 'loot']); continue;
            }
            if (invWeight() + (d.wt || 0) * it.n > calcStats().weightMax) { messages.push([`⚠️ 負重已滿，${d.name}撿不起來`, 'warn']); continue; }
            marketGiveItem(it);
            messages.push([`🎁 獲得 ${itemName(it)} ×${it.n}`, it.q === 'legend' ? 'boss' : it.q ? 'rare' : 'loot']);
        }
        data.player = target; data.schema = SAVE_SCHEMA; data.t = Date.now(); data.lootProtocol = LOOT_PROTOCOL; data.lootCursor = result.cursor;
        if (live) vaultEnvelope(data);   // 目前的角色：倉庫序號用這個分頁自己的，不沿用 localStorage 那份（第 120 節）
        localStorage.setItem(slotKey(result.slot), saveEncode(JSON.stringify(data)));
    } catch (e) { target.inv = before.inv; target.nextUid = before.nextUid; target.gold = before.gold; throw e; }
    finally { player = keep; }
    cloudMarkDirty(result.slot);
    if (result.diamonds && Number.isFinite(result.diamonds.diamonds)) diaCount = result.diamonds.diamonds;
    if (live) { if (session) session.gold += target.gold - before.gold; for (const [msg,cls] of messages) addLootLog(msg,cls); if (messages.length) sfx('treasure'); refreshUI(); }
    return true;
}
// 把還沒分批的擊殺湊成批：同一角色滿 10 隻、最早那隻超過 30 秒、或要求馬上結算時，給最多 50 隻一個批次編號（存進佇列，重送用同一個編號）
function lootFormBatches() {
    const jobs = lootJobs(), groups = {};
    for (const j of jobs) if (j.kind === 'kill' && !j.batch) (groups[j.slot + '|' + j.char] = groups[j.slot + '|' + j.char] || []).push(j);
    let changed = false;
    for (const k in groups) {
        const g = groups[k];
        if (!lootFlushWanted && !lootBatchMissing && g.length < LOOT_BATCH_N && Date.now() - Math.min(...g.map(j => j.at || 0)) < LOOT_BATCH_MS) continue;
        const id = crypto.randomUUID();
        for (const j of g.slice(0, LOOT_BATCH_MAX)) j.batch = id;
        changed = true;
    }
    lootFlushWanted = false;
    if (changed) lootStore(jobs);
}
function lootSettleNow() { lootFlushWanted = true; lootPump(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) lootSettleNow(); });
async function lootPump() {
    if (!lootActive() || !cloudLoggedIn() || cloudBan || lootBusy || !cloudCanCall()) return;
    lootBusy = true;
    const uid = cloudUser.id;
    try {
        lootFormBatches();
        const units = [], seen = new Set();
        for (const j of lootJobs()) {
            if (j.kind === 'kill' && !j.batch) continue;   // 還沒湊滿的擊殺
            const k = j.kind === 'kill' ? 'b:' + j.batch : j.key;
            if (!seen.has(k)) { seen.add(k); units.push(j); }
        }
        for (const job of units) {
            if (!cloudUser || cloudUser.id !== uid) return;
            const raw = localStorage.getItem(slotKey(job.slot));
            if (!raw || lootChar(saveParse(raw).player) !== job.char || saveOwnerOf(saveParse(raw)) !== uid) continue;
            // 結算只需要雲端已有這個角色（loot_player 核對角色），不必每筆都先上傳整份存檔（第 100 節）；
            // 雲端還沒有這一格才先上傳。從背景切回來時第一次上傳常會逾時：佇列保留、5 秒後再試，連續 60 秒都傳不上去才提示
            if (cloudKnown[job.slot] == null && !await cloudSyncedSlot(job.slot)) {
                if (!lootSyncFailAt) lootSyncFailAt = Date.now();
                if (Date.now() - lootSyncFailAt < 60000) return;
                throw Error('雲端存檔尚未同步');
            }
            if (job.kind === 'raid') await marketRpc('loot_raid', { p_slot:job.slot,p_char:job.char,p_room:job.room,p_round:job.round });
            else {
                const tickets = lootJobs().filter(j => j.batch === job.batch).map(j => j.ticket);
                try { if (lootBatchMissing) throw Error('loot_finish_batch missing'); await marketRpc('loot_finish_batch', { p_batch:job.batch,p_tickets:tickets }); }
                catch (e) {
                    if (!/loot_finish_batch|PGRST202|Could not find the function/i.test(String((e && (e.message || e.code)) || e))) throw e;
                    lootBatchMissing = true;   // 舊版伺服器：逐張結算
                    for (const t of tickets) {
                        try { await marketRpc('loot_finish', { p_ticket:t }); }
                        catch (e2) { if (!/loot ticket (cancelled|missing|expired)/.test(String(e2 && e2.message))) throw e2; }   // 作廢／過期的略過
                    }
                }
            }
            if (!cloudUser || cloudUser.id !== uid) return;
            const pending = await marketRpc('loot_pending', { p_slot:job.slot,p_char:job.char });
            for (const r of pending) if (!lootApply(r)) throw Error('掉寶收據需要同步，請到設定確認雲端進度');
            // 合併讀取，避免await期間新擊殺進佇列後被舊快照覆蓋。
            lootStore(lootJobs().filter(j => job.kind === 'kill' ? j.batch !== job.batch : j.key !== job.key));
            lootSyncFailAt = 0;   // 整筆成功才重設（網路一直不通時 60 秒後仍會提示）
        }
        // 回應遺失後，後端已決定的獎勵仍可按原順序補領。
        if (player && playerOwner === uid && gameNow >= lootPendingAt) {
            lootPendingAt = gameNow + 30000;
            const char = lootChar(), slot = currentSlot;
            const pending = await marketRpc('loot_pending', { p_slot:slot,p_char:char });
            if (!cloudUser || cloudUser.id !== uid) return;
            for (const r of pending) lootApply(r);
        }
    } catch (e) {
        // 網路暫時斷（剛從背景回來）：佇列保留自動重試，連續 60 秒都失敗才提示
        if (/timeout|Failed to fetch|NetworkError|network|Load failed/i.test(String((e && e.message) || e))) {
            if (!lootSyncFailAt) lootSyncFailAt = Date.now();
            if (Date.now() - lootSyncFailAt < 60000) return;
        }
        lootNotice('掉寶結算待重試：' + cloudErrText(e));
    }
    finally { lootBusy = false; if (lootFlushWanted) setTimeout(lootPump, 0); }   // 忙碌時要求的馬上結算：這輪跑完接著再跑一次
}
