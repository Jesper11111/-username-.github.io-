// 世界 Boss（ARCHITECTURE.md 第 75 節；設定 config-world-boss.js，雲端規則 tools/firestore.rules，GM 後台 gm.html）
// 全服共用 wboss/state 一條血；每人每天 WB.dailyMax 次、每次 WB.rounds 回合，傷害（畫面數字的整數）送雲端累加，單次最多 cap（總血量 1%）。
// 防作弊靠雲端規則：次數、間隔、上限、封鎖帳號、延後領獎都由規則檢查（改本機存檔繞不過）；傷害本身在玩家端計算，所以上限是關鍵——作弊最多跟強者並列。
// 被判定存檔異常（integrity.js 的 isSaveFlagged）的玩家不能參加，但單機遊玩不受影響。世界 Boss 不改玩家的數值，只發獎勵。
// 讀取額度：開視窗讀 wboss/state＋自己的紀錄＋前 20 名（WB.cacheMs 內不重讀排行榜）。

let wbState = null;        // wboss/state 的內容（沒有 Boss 時 null）
let wbMine = null;         // 自己在目前這隻的紀錄
let wbTop = [];            // 前 20 名
let wbTopAt = 0, wbTopBid = '';
let wbClaimable = null;    // { bid, killed, lastUid, mine } 可領獎的那隻
let wbError = '';
let wbLoading = false;
let wbFight = null;
let wbUid = '';

function wbMs(ts) { return ts && ts.toMillis ? ts.toMillis() : 0; }
function wbTs(ms) { return firebase.firestore.Timestamp.fromMillis(ms); }
function wbWeekMs() { return 7 * 24 * 3600 * 1000; }
// 最近一次（≤ now）的週六 12:00 UTC
function wbWindowStart(now) { const w = wbWeekMs(); return now - (((now - WB.weekOffsetMs) % w) + w) % w; }
function wbDayIdx(ms) { return Math.floor((ms + 8 * 3600 * 1000) / 86400000); }   // 台灣時間的日序（規則同樣算）
function wbBossDef(st) { return WB_BOSSES[((st && st.bossIdx) || 0) % WB_BOSSES.length]; }
function wbIsActive(st, now) { now = now || Date.now(); return !!st && now >= wbMs(st.startAt) && now < wbMs(st.endAt) && st.hp > 0; }
function wbCap(maxHp) { return Math.floor(maxHp / 100); }
function wbTodayLeft(mine) {
    if (!mine || mine.day !== wbDayIdx(Date.now())) return WB.dailyMax;
    return Math.max(0, WB.dailyMax - (mine.dayN || 0));
}
function wbFmtLeft(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 3600) return `${Math.ceil(s / 60)} 分鐘`;
    if (s < 86400) return `${Math.floor(s / 3600)} 小時 ${Math.floor(s % 3600 / 60)} 分`;
    return `${Math.floor(s / 86400)} 天 ${Math.floor(s % 86400 / 3600)} 小時`;
}
function wbNextOpen(now) { const s = wbWindowStart(now); return now < s + WB.durationMs ? s : s + wbWeekMs(); }
function wbEsc(s) { return typeof lbEscape === 'function' ? lbEscape(s) : String(s); }

// ---- 雲端 ----
// 換新的一隻：上一隻已結束、現在在本週開放時段內、雲端還不是本週這隻 → 用交易換成本週的 Boss（規則檢查時段與血量的推算）
async function wbRollover(db) {
    const ref = db.collection(WB_STATE_COLLECTION).doc('state');
    await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const now = Date.now(), start = wbWindowStart(now);
        if (now >= start + WB.durationMs) return;   // 不在開放時段
        const old = snap.exists ? snap.data() : null;
        if (old && (old.bid === String(start) || now < wbMs(old.endAt))) return;   // 已是本週這隻，或上一隻（GM 手動開的）還沒結束
        let maxHp = WB.firstHp;
        if (old) maxHp = old.killedAt ? Math.min(WB.maxHp, old.maxHp * 2) : Math.max(WB.minHp, Math.floor(old.maxHp / 2));
        tx.set(ref, {
            bid: String(start), bossIdx: Math.floor(start / wbWeekMs()) % WB_BOSSES.length,
            maxHp, hp: maxHp, cap: wbCap(maxHp), startAt: wbTs(start), endAt: wbTs(start + WB.durationMs),
            killedAt: null, lastUid: '', lastName: '',
            prev: old ? { bid: old.bid, maxHp: old.maxHp, killed: !!old.killedAt, endAt: old.endAt, lastUid: old.lastUid || '' } : null
        });
    });
}
function wbRunRef(db, bid, uid) { return db.collection(WB_RUNS_COLLECTION).doc(bid).collection('dmg').doc(uid); }
async function wbFetchTop(db, bid) {
    const snap = await db.collection(WB_RUNS_COLLECTION).doc(bid).collection('dmg').orderBy('total', 'desc').limit(WB.topN).get();
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
}
async function wbLoad(force) {
    if (!isLeaderboardConfigured()) { wbError = '世界 Boss 需要連線功能（尚未開通）。'; return; }
    wbLoading = true; wbError = '';
    try {
        const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
        wbUid = uid;
        try { await lbWithTimeout(wbRollover(db)); } catch (e) { console.warn('世界 Boss 換隻失敗：', e); }
        const st = await lbWithTimeout(db.collection(WB_STATE_COLLECTION).doc('state').get());
        wbState = st.exists ? st.data() : null;
        wbMine = null; wbClaimable = null;
        if (wbState) {
            const m = await lbWithTimeout(wbRunRef(db, wbState.bid, uid).get());
            wbMine = m.exists ? m.data() : null;
            if (force || wbTopBid !== wbState.bid || Date.now() - wbTopAt > WB.cacheMs) {
                wbTop = await lbWithTimeout(wbFetchTop(db, wbState.bid)); wbTopAt = Date.now(); wbTopBid = wbState.bid;
            }
            // 可領獎：這隻（已結束滿 24 小時）或上一隻（prev）
            const now = Date.now(), claimed = (player.wboss && player.wboss.claimed) || [];
            const cands = [];
            if (now >= wbMs(wbState.endAt) + WB.claimDelayMs) cands.push({ bid: wbState.bid, killed: !!wbState.killedAt, lastUid: wbState.lastUid || '', endAt: wbState.endAt, mine: wbMine });
            const pv = wbState.prev;
            if (pv && now >= wbMs(pv.endAt) + WB.claimDelayMs) cands.push({ bid: pv.bid, killed: !!pv.killed, lastUid: pv.lastUid || '', endAt: pv.endAt });
            for (const c of cands) {
                if (claimed.includes(c.bid)) continue;
                if (!c.mine) { const s = await lbWithTimeout(wbRunRef(db, c.bid, uid).get()); c.mine = s.exists ? s.data() : null; }
                if (c.mine && c.mine.n > 0) { wbClaimable = c; break; }
            }
        }
    } catch (e) {
        console.warn('世界 Boss 讀取失敗：', e);
        wbError = (lbIsQuota(e) || (e && e.code !== 'permission-denied' && await lbProbeQuota())) ? LB_QUOTA_MSG
            : e && e.code === 'permission-denied' ? '世界 Boss 尚未開放（伺服器設定更新中），請稍後再試。' : '連線失敗，請稍後再試。';
    } finally { wbLoading = false; }
}

// ---- 視窗 ----
async function openWorldBossModal() {
    document.getElementById('world-boss-modal').style.display = 'flex';
    renderWorldBoss();
    await wbLoad(false);
    renderWorldBoss();
}
async function refreshWorldBoss() {
    if (wbLoading) return;
    renderWorldBoss();
    await wbLoad(true);
    renderWorldBoss();
}
function renderWorldBoss() {
    const box = document.getElementById('world-boss-body');
    if (!box) return;
    if (wbLoading && !wbState) { box.innerHTML = '<p class="lb-note">讀取中……</p>'; return; }
    if (wbError) { box.innerHTML = `<p class="lb-note" style="color:#f87171;">${wbEsc(wbError)}</p><button class="sys-btn" onclick="refreshWorldBoss()">🔄 重新整理</button>`; return; }
    const now = Date.now();
    const st = wbState;
    if (!st) {
        box.innerHTML = `<p class="lb-note">目前沒有世界 Boss。下次開放：每週六 20:00（還有 ${wbFmtLeft(wbNextOpen(now) - now)}）。</p>${wbRulesHtml()}`;
        return;
    }
    const B = wbBossDef(st), active = wbIsActive(st, now);
    const pct = st.maxHp > 0 ? Math.max(0, st.hp / st.maxHp * 100) : 0;
    const status = st.killedAt ? `💀 已被擊敗${st.lastName ? `（最後一擊：${wbEsc(st.lastName)}）` : ''}`
        : now < wbMs(st.startAt) ? `尚未開放（${wbFmtLeft(wbMs(st.startAt) - now)} 後）`
        : active ? `⚔️ 討伐中・剩 ${wbFmtLeft(wbMs(st.endAt) - now)}` : '⌛ 討伐時間已結束';
    const nextLine = !active && now >= wbMs(st.startAt) ? `<p class="lb-note">下一隻：每週六 20:00 開放（還有 ${wbFmtLeft(wbNextOpen(now) - now)}）</p>` : '';
    const left = wbTodayLeft(wbMine);
    const gapLeft = wbMine ? WB.gapSec * 1000 - (now - wbMs(wbMine.lastAt)) : 0;
    const myRank = wbMine ? wbRankOf(wbTop, wbMine.total) : 0;
    const canFight = active && left > 0;
    box.innerHTML = `
        <div class="wb-banner" style="background-image:url(${B.img}); background-position:${B.imgPos || 'center'};">
            <div class="wb-banner-text"><b>${wbEsc(B.name)}</b><span>${wbEsc(B.title)}・${raceTag(B.race)}</span></div>
        </div>
        <p class="lb-note" style="text-align:left;">${wbEsc(B.intro)}</p>
        <div class="wb-hp"><div class="wb-hp-fill" style="width:${pct}%"></div><span>${fmtNum(Math.max(0, st.hp))} / ${fmtNum(st.maxHp)}</span></div>
        <p class="wb-status">${status}</p>${nextLine}
        <div class="wb-me">
            <div>今日次數 <b>${left}/${WB.dailyMax}</b></div>
            <div>累計傷害 <b>${fmtNum(wbMine ? wbMine.total : 0)}</b></div>
            <div>有效挑戰 <b>⭐${wbMine ? wbMine.eff : 0}</b></div>
            <div>名次 <b>${myRank ? (myRank <= WB.topN ? '第 ' + myRank + ' 名' : WB.topN + ' 名外') : '—'}</b></div>
        </div>
        <p class="lb-note">單次傷害上限 ${fmtNum(st.cap)}（總血量 1%）；打滿上限記一次 ⭐有效挑戰。</p>
        <button class="sys-btn wb-go" ${canFight ? '' : 'disabled'} onclick="startWorldBossFight()">⚔️ 挑戰（${WB.rounds} 回合）${!active ? '' : left <= 0 ? '・今日次數已用完' : gapLeft > 0 ? `・${Math.ceil(gapLeft / 1000)} 秒後` : ''}</button>
        ${wbClaimable ? `<button class="sys-btn wb-claim" onclick="claimWorldBossReward()">🎁 領取世界 Boss 獎勵${wbClaimable.killed ? '（Boss 已被擊敗 ×' + WB.killMult + '）' : ''}</button>` : ''}
        <div class="panel-title" style="margin-top:12px;">🏆 傷害排行（前 ${WB.topN} 名）</div>
        ${wbTop.length ? `<table class="wb-rank"><tr><th>名次</th><th>道號</th><th>⭐</th><th>傷害</th></tr>${wbTop.map(r => `<tr${wbMine && r.id === wbMineId() ? ' class="me"' : ''}><td>${wbRankOf(wbTop, r.total)}</td><td>${wbEsc(r.name || '無名修士')}<small>${realms[r.realm] || ''}</small></td><td>${r.eff || 0}</td><td>${fmtNum(r.total || 0)}</td></tr>`).join('')}</table>` : '<p class="lb-note">還沒有人挑戰。</p>'}
        <button class="sys-btn" style="margin-top:8px;" onclick="refreshWorldBoss()">🔄 重新整理</button>
        ${wbRulesHtml()}`;
}
function wbMineId() { return wbUid; }
// 名次：傷害相同並列
function wbRankOf(rows, total) { return rows.filter(r => (r.total || 0) > (total || 0)).length + 1; }
function wbRulesHtml() {
    const r = WB.rewards;
    return `<details class="wb-rules"><summary>📜 規則與獎勵</summary>
        <p>・每週六 20:00～週日 20:00 開放（GM 也可能臨時開放），全服共用一條血量。</p>
        <p>・每天 ${WB.dailyMax} 次、每次 ${WB.rounds} 回合或倒下為止，兩次至少間隔 ${WB.gapSec} 秒；倒下不扣壽元。Boss 強度跟著你的境界調整。</p>
        <p>・單次傷害最多算總血量 1%，打滿記一次 ⭐有效挑戰。排名依累計傷害（相同並列）。</p>
        <p>・參加獎（打過就有）：💎 每小時收入 ×${r.coinsH} 靈石、🌀 洗煉石 ${r.refine}、🌠 星允鐵 ${r.iron}、${formatCraftGain(r.craft)}；Boss 被打死全服 ×${WB.killMult}。</p>
        <p>・外觀稱號：第 1 名【誅天第一】、前 10 名【誅魔先鋒】、最後一擊【斬魔一擊】。</p>
        <p>・Boss 結束 24 小時後才能領獎（管理者審核期間）；存檔驗證異常或被封鎖的帳號不能參加與領獎。</p></details>`;
}

// ---- 挑戰（回合制，同鎮魔塔 BOSS 戰的 resolveHit／tickStatus；Boss 血量看雲端，這裡只算你造成的傷害）----
function wbBossStats(B) {
    const L = nv2Level(player.realmIndex, player.stage || 1);
    const attrs = { def: B.def || 0, eva: B.eva || 0, ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0, element: B.element || null, race: B.race || null };
    if (B.affix) attrs[B.affix] = B.affixVal || 0;
    applyRaceTraits(attrs);
    attrs.evaPen = nv2TypHit(L);
    const atk = nv2TypHp(L) * (1 + nv2TypBuff(L) / 100) / WB.hitsToKill * (B.atkMult || 1);
    return { atk, attrs };
}
async function startWorldBossFight() {
    if (wbFight) return;
    if (isSaveFlagged()) { gameAlert('存檔驗證異常，無法參加世界 Boss（單機遊玩不受影響）。'); return; }
    if (typeof lbBanned !== 'undefined' && lbBanned) { gameAlert('此帳號已被管理者停權，無法參加世界 Boss。'); return; }
    const st = wbState, now = Date.now();
    if (!wbIsActive(st, now)) { gameAlert('目前沒有可挑戰的世界 Boss。'); return; }
    if (wbTodayLeft(wbMine) <= 0) { gameAlert(`今天 ${WB.dailyMax} 次挑戰已用完，明天再來。`); return; }
    const gap = wbMine ? WB.gapSec * 1000 - (now - wbMs(wbMine.lastAt)) : 0;
    if (gap > 0) { gameAlert(`調息中，${Math.ceil(gap / 1000)} 秒後才能再次挑戰。`); return; }
    const B = wbBossDef(st), b = wbBossStats(B);
    const phys = getPhysAttack(), mag = getMagAttack();
    const aura = combineAuras(B.auras);
    wbFight = {
        B, bid: st.bid, cap: st.cap, round: 0, over: false, speed: 1, tid: 0, aura, dealt: 0,
        e: { atk: b.atk * auraSelfAtkMult(aura), attrs: auraSelfAttrs(b.attrs, aura), st: newStatus(), max: st.maxHp / combatScale() },
        p: { atk: Math.max(phys, mag) * ZHENMO_PLAYER_SKILL_MULT * auraPlayerAtkMult(aura), hp: getMaxHp(), max: getMaxHp(), attrs: auraPlayerAttrs(getPlayerCombatAttrs(), aura), st: newStatus(), dmgType: mag > phys ? 'mag' : undefined },
        eType: ['demon', 'heart'].includes(B.race) ? 'mag' : undefined
    };
    const $ = id => document.getElementById(id);
    $('wb-fight-bg').style.backgroundImage = `url(${B.img})`;
    $('wb-fight-bg').style.backgroundPosition = B.imgPos || 'center';
    $('wb-fight-name').textContent = `${B.name}・${B.title}`;
    $('wb-fight-hero').src = player.gender === 'female' ? ZHENMO_HERO_IMG.female : ZHENMO_HERO_IMG.male;
    $('wb-fight-log').innerHTML = '';
    $('wb-fight-end').classList.remove('on');
    wbSetSpeed(1);
    document.querySelector('#world-boss-scene .wb-speed').style.display = B.videos ? 'none' : '';   // 有專屬動畫的 Boss 不能加速
    closeModal('world-boss-modal');
    $('world-boss-scene').style.display = 'block';
    wbOpStart(B);
    wbUpdateBars();
    wbLog(`⚔️ ${B.name}：「區區凡人，也敢犯我？」`, 'boss');
    (B.auras || []).forEach(a => wbLog(`🌀 ${B.name}展開光環${describeAura(a)}`, 'boss'));
    wbFight.tid = setTimeout(wbStep, 700);
}
// ---- Boss 專屬動畫（B.videos 依序播，播完從 B.videoLoopFrom 循環，直到戰鬥結束；不能跳過。目前只有 OP王 有）----
// 每個不同的檔案一個 <video>（開戰就預載），同一個檔案重播只把 currentTime 歸 0，換支時才切換顯示，銜接不會黑一下。
// 開戰是玩家點擊的當下就呼叫 play()（手機才允許有聲播放）；被擋就改靜音播。載入失敗就留著 Boss 圖。
let wbOp = null;   // { list, loopFrom, idx, els: { src: video }, cur }
function wbOpStart(B) {
    wbOpStop();
    const list = (B && B.videos) || [];
    const box = document.getElementById('wb-fight-video');
    if (!list.length || !box) return;
    wbOp = { list, loopFrom: B.videoLoopFrom || 0, idx: 0, els: {}, cur: null, lines: B.videoLines || [] };
    [...new Set(list)].forEach(src => {
        const v = document.createElement('video');
        v.src = src; v.preload = 'auto'; v.playsInline = true;
        v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
        v.addEventListener('ended', wbOpNext);
        v.addEventListener('error', () => { if (wbOp && wbOp.cur === v) wbOpStop(); });
        box.appendChild(v);
        wbOp.els[src] = v;
    });
    wbOpShow(0);
}
function wbOpShow(i) {
    if (!wbOp) return;
    const src = wbOp.list[i], v = wbOp.els[src];
    wbOp.idx = i;
    if (wbOp.cur && wbOp.cur !== v) wbOp.cur.pause();
    wbOp.cur = v;
    try { v.currentTime = 0; } catch (e) {}
    const p = v.play();
    if (p && p.catch) p.catch(e => {
        if (e && e.name === 'NotAllowedError' && !v.muted) { v.muted = true; v.play().catch(() => {}); }
    });
    v.addEventListener('playing', function on() {
        v.removeEventListener('playing', on);
        if (!wbOp || wbOp.cur !== v) return;
        Object.values(wbOp.els).forEach(x => x.classList.toggle('on', x === v));
        document.getElementById('wb-fight-video').classList.add('on');
        wbSayPlay(i);
    });
}
// 動畫對白（B.videoLines[i]）：該段開始播放時排程，換段或停止時清掉
let wbSayTids = [];
function wbSayClear() {
    wbSayTids.forEach(clearTimeout); wbSayTids = [];
    const box = document.getElementById('wb-op-say');
    if (box) box.innerHTML = '';
}
function wbSayPlay(i) {
    wbSayClear();
    const lines = wbOp && wbOp.lines[i], box = document.getElementById('wb-op-say');
    if (!lines || !box) return;
    lines.forEach(L => wbSayTids.push(setTimeout(() => {
        if (!wbOp) return;
        const s = document.createElement('span');
        s.className = 'wb-say ' + (L.cls || '');
        s.textContent = L.text;
        box.appendChild(s);
        if (L.hit) { restartAnim(document.getElementById('wb-fight-scene'), 'shake'); restartAnim(document.getElementById('wb-fight-flash'), 'on'); }
        if (L.log && wbFight && !wbFight.over) wbLog(L.log, 'boss');
        wbSayTids.push(setTimeout(() => { s.classList.add('out'); setTimeout(() => s.remove(), 300); }, Math.max(0, L.end - L.at) * 1000));
    }, L.at * 1000)));
}
function wbOpNext() {
    if (!wbOp) return;
    const n = wbOp.list.length;
    wbOpShow(wbOp.idx + 1 < n ? wbOp.idx + 1 : Math.min(wbOp.loopFrom, n - 1));
}
function wbOpStop() {
    const box = document.getElementById('wb-fight-video');
    if (wbOp) Object.values(wbOp.els).forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
    wbOp = null;
    wbSayClear();
    if (box) { box.innerHTML = ''; box.classList.remove('on'); }
}

function wbRound(instant) {
    const f = wbFight, P = f.p, E = f.e;
    f.round++;
    const at = auraRoundTick(f.aura, P.st, P.max, E.max, E.atk, P.attrs);
    const st = tickStatus(P.st);
    st.dot += at.dot;
    if (st.dot) { P.hp -= st.dot; if (!instant) wbPop('hero', st.dot, 'dot'); }
    if (P.hp <= 0) return wbEndFight('身中異狀，力竭倒下');
    if (!st.frozen) {
        const hits = [resolveHit(P.atk, { attrs: P.attrs, power: P.atk, dmgType: P.dmgType }, { attrs: E.attrs, status: E.st })];
        if (Math.random() < nv2Combo()) hits.push(resolveHit(P.atk, { attrs: P.attrs, power: P.atk, dmgType: P.dmgType }, { attrs: E.attrs, status: E.st }));
        hits.forEach((hit, i) => {
            f.dealt += hit.dmg;
            if (!instant) wbPop('boss', hit.tags.includes('dodge') ? '閃避' : hit.dmg, hit.tags.includes('dodge') ? 'miss' : (i || hit.tags.includes('crit') || hit.tags.includes('metal') || hit.tags.includes('thunder')) ? 'crit' : '');
        });
        if (!instant) wbAttackFx(hits);
        if (!instant && (f.round % 3 === 1)) wbLog(`🗡️ 第 ${f.round} 回合，你造成 ${fmtCombat(hits.reduce((s, h) => s + h.dmg, 0))} 傷害`, 'me');
    } else if (!instant) wbLog('❄️ 你被凍結，無法出手', 'me');
    const et = tickStatus(E.st);
    if (et.dot) { f.dealt += et.dot; if (!instant) wbPop('boss', et.dot, 'dot'); }
    if (!et.frozen) {
        const hit = resolveHit(E.atk, { attrs: E.attrs, power: E.atk, dmgType: f.eType }, { attrs: P.attrs, status: P.st });
        hit.dmg *= auraCurseMult(f.aura);
        if (!instant) f.shownHp = P.hp;   // 氣血條等 Boss 的攻擊演出到了才扣
        P.hp -= hit.dmg;
        if (!instant) {
            // Boss 反擊晚半回合才演出（先看到自己出手、再看到 Boss 打過來）
            const lag = Math.round((f.B.roundMs || ZHENMO_ROUND_MS) * 0.45 / f.speed);
            const msg = f.round % 3 === 2 ? `${f.B.icon || '⚡'} ${f.B.name}施展【${f.B.skills[f.round % f.B.skills.length]}】${hit.tags.includes('dodge') ? '，被你閃過' : `，你受到 ${fmtCombat(hit.dmg)} 傷害`}` : '';
            setTimeout(() => {
                if (wbFight !== f) return;
                wbPop('hero', hit.tags.includes('dodge') ? '閃避' : hit.dmg, hit.tags.includes('dodge') ? 'miss' : 'hurt');
                wbHurtFx(hit);
                if (msg) wbLog(msg, 'boss');
                f.shownHp = null;
                wbUpdateBars();
            }, lag);
        }
    }
    if (P.hp <= 0) return wbEndFight(`被${f.B.name}擊倒`);
    if (f.round >= WB.rounds) return wbEndFight(`撐過 ${WB.rounds} 回合`);
    if (!instant) wbUpdateBars();
}
// 人物攻擊反應（2026-10-06 使用者：「打世界王不像仙魔戰場一樣人物有攻擊的反應」；樣式在 index.html 的 #wb-fight-hero.lunge／hurt／evade）
// restartAnim 在 battle-fx.js（移除再加回 class 讓動畫重播，第三參數同時移除衝突的動作）
const WB_HERO_FX = ['lunge', 'hurt', 'evade'];
function wbHeroFx(cls) { restartAnim(document.getElementById('wb-fight-hero'), cls, WB_HERO_FX.filter(c => c !== cls)); }
// 出手：前衝＋劍光；打中 Boss 閃白小震；暴擊／重擊／雷擊／連擊整個戰場震動＋白光
function wbAttackFx(hits) {
    wbHeroFx('lunge');
    restartAnim(document.getElementById('wb-fight-slash'), 'on');
    if (!hits.some(h => !h.tags.includes('dodge') && h.dmg > 0)) return;
    restartAnim(document.getElementById('wb-fight-scene'), 'boss-hit');
    if (hits.length > 1 || hits.some(h => ['crit', 'metal', 'thunder'].some(t => h.tags.includes(t)))) {
        restartAnim(document.getElementById('wb-fight-scene'), 'shake');
        restartAnim(document.getElementById('wb-fight-flash'), 'on');
    }
}
// Boss 打過來：閃掉＝殘影往左閃；打中＝後仰泛紅＋四周紅框，Boss 暴擊再加震動
function wbHurtFx(hit) {
    if (hit.tags.includes('dodge')) { wbHeroFx('evade'); return; }
    if (!(hit.dmg > 0)) return;
    wbHeroFx('hurt');
    restartAnim(document.getElementById('wb-fight-hurt'), 'on');
    if (hit.tags.includes('crit')) restartAnim(document.getElementById('wb-fight-scene'), 'shake');
}
function wbStep() {
    if (!wbFight || wbFight.over) return;
    wbRound(false);
    if (wbFight && !wbFight.over) wbFight.tid = setTimeout(wbStep, (wbFight.B.roundMs || ZHENMO_ROUND_MS) / wbFight.speed);
}
function wbSetSpeed(s) {
    if (!wbFight || (wbFight.B.videos && s !== 1)) return;
    wbFight.speed = s;
    document.querySelectorAll('#world-boss-scene .wb-speed button[data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === s));
}
function setWorldBossSpeed(s) { wbSetSpeed(s); }
function wbScore(f) { return Math.max(0, Math.round(f.dealt * combatScale())); }   // 畫面數字的整數
function wbUpdateBars() {
    const f = wbFight; if (!f) return;
    const dealt = wbScore(f), $ = id => document.getElementById(id);
    $('wb-fight-dmg-fill').style.width = `${Math.min(100, dealt / Math.max(1, f.cap) * 100)}%`;
    $('wb-fight-dmg').textContent = `本次傷害 ${fmtNum(Math.min(dealt, f.cap))} / 上限 ${fmtNum(f.cap)}${dealt >= f.cap ? ' ⭐' : ''}`;
    const hp = f.shownHp != null && !f.over ? f.shownHp : f.p.hp;   // Boss 反擊演出前先顯示扣血前的氣血（wbRound）
    $('wb-fight-me-fill').style.width = `${Math.max(0, hp / f.p.max) * 100}%`;
    $('wb-fight-me-hp').textContent = `${fmtCombat(Math.max(0, hp))} / ${fmtCombat(f.p.max)}`;
    $('wb-fight-round').textContent = `第 ${f.round} / ${WB.rounds} 回合`;
}
function wbPop(who, v, cls) {
    const box = document.getElementById(who === 'boss' ? 'wb-fight-boss-fx' : 'wb-fight-hero-fx');
    if (!box) return;
    const el = document.createElement('span');
    el.className = `zm-pop ${cls || ''}`;
    el.textContent = typeof v === 'number' ? `-${fmtCombat(v)}` : v;
    el.style.left = `${35 + Math.random() * 30}%`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 1100);
}
function wbLog(text, cls) {
    const box = document.getElementById('wb-fight-log');
    const d = document.createElement('div');
    d.className = cls || '';
    d.textContent = text;
    box.appendChild(d);
    while (box.children.length > 3) box.firstChild.remove();
}
// 結束：把傷害送雲端（交易：自己的紀錄＋Boss 血量），規則檢查次數、間隔、上限
async function wbEndFight(reason) {
    const f = wbFight;
    if (!f || f.over) return;
    f.over = true;
    clearTimeout(f.tid);
    wbOpStop();
    wbUpdateBars();
    const raw = wbScore(f), d = Math.min(raw, f.cap);
    const endBody = document.getElementById('wb-fight-end-body');
    endBody.innerHTML = `<div class="big">${reason}</div><p>本次傷害 ${fmtNum(raw)}${raw > f.cap ? `（計入上限 ${fmtNum(f.cap)}）` : ''}</p><p class="zm-note">傳送戰果中……</p>`;
    document.getElementById('wb-fight-end').classList.add('on');
    let msg;
    try {
        const r = await wbSubmit(f.bid, d);
        msg = `<p class="zm-reward">✅ 已計入：${fmtNum(d)}${d >= f.cap ? '（⭐有效挑戰）' : ''}${r.killed ? '<br>💀 你給了 Boss 最後一擊！' : ''}</p>`;
        addLog(`⚔️ 世界 Boss【${f.B.name}】：造成 ${fmtNum(d)} 傷害${d >= f.cap ? '（⭐有效挑戰）' : ''}${r.killed ? '，給了最後一擊！' : ''}`, 'level-up', true, 'item');
    } catch (e) {
        console.warn('世界 Boss 戰果送出失敗：', e);
        const m = String(e && e.message || '');
        msg = `<p class="zm-note" style="color:#f87171;">${lbIsQuota(e) ? LB_QUOTA_MSG : m === 'dead' ? 'Boss 已被其他修士擊敗，這次戰果未計入（不扣次數）。'
            : m === 'ended' ? '討伐時間已結束，這次戰果未計入。' : m === 'daily' ? '今天的次數已用完。' : m === 'gap' ? '挑戰太頻繁，請稍後再試。'
            : e && e.code === 'permission-denied' ? '戰果被伺服器拒絕（帳號受限或伺服器設定更新中）。' : '連線失敗，這次戰果未計入（不扣次數）。'}</p>`;
    }
    endBody.innerHTML = `<div class="big">${reason}</div><p>本次傷害 ${fmtNum(raw)}${raw > f.cap ? `（計入上限 ${fmtNum(f.cap)}）` : ''}</p>${msg}`;
    wbTopAt = 0;   // 下次開視窗重讀排行
}
async function wbSubmit(bid, d) {
    const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
    const sref = db.collection(WB_STATE_COLLECTION).doc('state'), mref = wbRunRef(db, bid, uid);
    let killed = false;
    await lbWithTimeout(db.runTransaction(async tx => {
        const ss = await tx.get(sref), ms = await tx.get(mref);
        if (!ss.exists) throw new Error('ended');
        const st = ss.data(), now = Date.now();
        if (st.bid !== bid || now >= wbMs(st.endAt)) throw new Error('ended');
        if (!(st.hp > 0)) throw new Error('dead');
        const old = ms.exists ? ms.data() : null;
        const day = wbDayIdx(now);
        if (old && old.day === day && old.dayN >= WB.dailyMax) throw new Error('daily');
        if (old && now - wbMs(old.lastAt) < WB.gapSec * 1000) throw new Error('gap');
        const dd = Math.min(d, st.cap);
        const hist = ((old && old.hist) || []).slice(-5).concat([{ d: dd, t: now, r: player.realmIndex }]);
        tx.set(mref, {
            uid, name: sanitizePlayerName(player.name) || '無名修士', realm: player.realmIndex, stage: player.stage || 1,
            total: (old ? old.total : 0) + dd, eff: (old ? old.eff : 0) + (dd === st.cap ? 1 : 0), n: (old ? old.n : 0) + 1,
            day, dayN: old && old.day === day ? old.dayN + 1 : 1, lastAt: firebase.firestore.FieldValue.serverTimestamp(), hist
        });
        if (dd > 0) {   // 傷害 0 時 Boss 不更新（規則：扣血必須讓血量變少）
            const hp = Math.max(0, st.hp - dd);
            const upd = { hp };
            if (hp === 0) { killed = true; Object.assign(upd, { killedAt: firebase.firestore.FieldValue.serverTimestamp(), lastUid: uid, lastName: sanitizePlayerName(player.name) || '無名修士' }); }
            tx.update(sref, upd);
        }
    }));
    return { killed };
}
function closeWorldBossFight() {
    if (wbFight && !wbFight.over) {   // 中途離開＝放棄這次（不送出、不扣次數）
        clearTimeout(wbFight.tid);
    }
    wbOpStop();
    wbFight = null;
    document.getElementById('world-boss-scene').style.display = 'none';
    openWorldBossModal();
}

// ---- 領獎（規則：Boss 結束滿 24 小時、有參加、沒被封鎖、每隻每人一次）----
async function claimWorldBossReward() {
    const c = wbClaimable;
    if (!c) return;
    if (isSaveFlagged()) { gameAlert('存檔驗證異常，無法領取世界 Boss 獎勵。'); return; }
    let rank = 0, top = [];
    try {
        const { db, uid } = await lbWithTimeout(initLeaderboardBackend());
        top = await lbWithTimeout(wbFetchTop(db, c.bid));
        const me = top.find(r => r.id === uid);
        rank = me ? wbRankOf(top, me.total) : 0;
        await lbWithTimeout(db.collection(WB_CLAIM_COLLECTION).doc(`${c.bid}_${uid}`).set({ uid, bid: c.bid, at: firebase.firestore.FieldValue.serverTimestamp() }));
        c.lastHit = c.lastUid === uid;
    } catch (e) {
        console.warn('世界 Boss 領獎失敗：', e);
        if (e && e.code === 'permission-denied') {   // 已領過（另一台裝置）或帳號受限
            if (!player.wboss) player.wboss = { claimed: [], titles: [] };
            if (!player.wboss.claimed.includes(c.bid)) player.wboss.claimed.push(c.bid);
            gameAlert('這隻世界 Boss 的獎勵已領過，或帳號受限無法領取。');
        } else gameAlert(lbIsQuota(e) ? LB_QUOTA_MSG : '連線失敗，請稍後再試。');
        wbClaimable = null; renderWorldBoss();
        return;
    }
    if (!player.wboss) player.wboss = { claimed: [], titles: [] };
    player.wboss.claimed = player.wboss.claimed.concat([c.bid]).slice(-20);
    const mult = c.killed ? WB.killMult : 1, R = WB.rewards, got = [];
    const coins = Math.floor(getHourlyIncome(player.realmIndex) * R.coinsH * mult);
    player.coins += coins; got.push(`💎 靈石 ${coins.toWan()}`);
    got.push(`🌀 洗煉石 ×${addRefineStones(R.refine * mult)}`);
    got.push(`🌠 星允鐵 ×${addStarIron(R.iron * mult)}`);
    const craft = {};
    Object.keys(R.craft || {}).forEach(k => { craft[k] = R.craft[k] * mult; addCraftCur(k, craft[k]); });
    if (Object.keys(craft).length) got.push(formatCraftGain(craft));
    const T = WB.titles, newTitles = [];
    if (rank === 1) newTitles.push(T.top1);
    if (rank >= 1 && rank <= 10) newTitles.push(T.top10);
    if (c.lastHit) newTitles.push(T.lastHit);
    newTitles.forEach(t => { if (!player.wboss.titles.includes(t)) player.wboss.titles.push(t); });
    if (typeof checkTitleUnlocks === 'function') checkTitleUnlocks();
    addLog(`🎁 世界 Boss 獎勵${mult > 1 ? `（Boss 被擊敗 ×${mult}）` : ''}：${got.join('、')}${rank ? `；最終第 ${rank} 名` : ''}`, 'level-up', true, 'item');
    showToast('🎁 已領取世界 Boss 獎勵', 'ok');
    gameAlert(`🎁 世界 Boss 獎勵${mult > 1 ? `（Boss 被擊敗 ×${mult}）` : ''}\n${got.join('\n')}${rank ? `\n最終名次：第 ${rank} 名` : ''}${newTitles.length ? '\n🏅 獲得稱號（可在天磯錄選擇顯示）' : ''}`);
    if (typeof saveLocal === 'function') saveLocal();
    updateUI();
    wbClaimable = null;
    renderWorldBoss();
}
