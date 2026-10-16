// 屠龍勇者：世界首領（ARCHITECTURE.md 第 35 節）
// 依賴 monsters（buildMonster）、raid（raidSimulate／raidSnapshot）、cloud、ui-panels（TABS／PANEL_FNS 在載入時加分頁）。
// 全服共用一條血（Supabase dragon_wb）。每個帳號每天 3 次挑戰：用目前角色的快照快轉模擬 60 秒戰鬥，把傷害送到伺服器 wb_attack；
// 伺服器依雲端存檔最高等級限制單次傷害上限、計次數、扣血。首領被打倒（或 48 小時到）後，有打過的人各領一次獎勵（wb_claim 回傳名次，獎勵在這裡計算）。

const WB_FIGHT_MS = 60 * 1000;
const WB_REFRESH_MS = 15 * 1000;
// 伺服器只存 kind／名稱／圖示；種族與招式在這裡（影響職業剋制、屠龍劍、銀武器）
const WB_KINDS = {
    drake:  { tags: ['dragon'], large: true, magic: '大地崩裂' },
    balrog: { tags: ['demon'], large: true, magic: '地獄烈焰' },
    frost:  { tags: ['dragon'], large: true, magic: '冰霜吐息' },
    lich:   { tags: ['undead'], large: false, magic: '亡者詛咒' },
    roc:    { tags: [], large: true, magic: '暴風之翼' },
};

let wbState = null, wbRankRows = [], wbUnclaimedList = [], wbLast = null;
let wbLoading = false, wbBusy = false, wbErr = '', wbLoadedAt = 0;

function wbErrText(e) {
    const m = String((e && e.message) || e || '');
    if (/no attempts/.test(m)) return '今天的挑戰次數用完了（每天 3 次，台灣時間零點重置）';
    if (/boss gone/.test(m)) return '首領已經被打倒或離開了';
    if (/no cloud save/.test(m)) return '雲端還沒有你的存檔，請先到設定「☁️ 立即上傳」';
    if (/not ended/.test(m)) return '首領還沒被打倒，結束後才能領獎';
    if (/not participated/.test(m)) return '你沒有挑戰過這隻首領';
    if (/duplicate key|claims_pkey/.test(m)) return '這隻首領的獎勵已經領過了';
    if (/banned/.test(m)) return '帳號已停權';
    return cloudErrText(e);
}

async function wbRpc(fn, args) {
    const r = await cloudTimeout(cloudSb.rpc(fn, args || {}));
    if (r.error) throw r.error;
    return r.data;
}

async function wbLoad() {
    if (!isCloudConfigured() || !cloudLoggedIn() || wbLoading) return;
    wbLoading = true;
    try {
        wbState = await wbRpc('wb_current');
        wbRankRows = wbState && wbState.id ? await wbRpc('wb_rank', { p_wb: wbState.id }) : [];
        wbUnclaimedList = await wbRpc('wb_unclaimed');
        wbErr = '';
        wbLoadedAt = Date.now();
    } catch (e) { wbErr = wbErrText(e); }
    wbLoading = false;
    wbRender();
}

function wbRender() { if (typeof currentTab !== 'undefined' && tabOpen('wb') && player && !SIM_MODE) renderPanel(); }

// 依挑戰者等級做出首領（等級 +3，血量無限，打 60 秒）
function wbMakeBoss(kind, name, icon, lv) {
    const k = WB_KINDS[kind] || WB_KINDS.roc, L = lv + 3;
    const m = buildMonster('wb_' + kind, {
        name, icon, lv: L, boss: true, large: k.large, undead: k.tags.includes('undead'), tags: k.tags.filter(t => t !== 'dragon' && t !== 'undead'),
        hp: 1e12, dmgMul: 1.3, acAdd: -10, magic: { p: 0.25, dmg: [Math.round(L * 1.2), Math.round(L * 2)], name: k.magic },
    });
    m.dragon = k.tags.includes('dragon');
    return m;
}

async function wbAttack() {
    const w = wbState;
    if (!w || !player || wbBusy) return;
    if (w.ended || w.hp <= 0) { showToast('首領已經被打倒或離開了'); return; }
    if (w.attempts_left <= 0) { showToast(wbErrText('no attempts')); return; }
    if (cloudBan) { showToast('帳號已停權'); return; }
    wbBusy = true;
    try {
        saveGame();
        await cloudFlush(true);   // 伺服器用雲端存檔的等級算傷害上限，先把最新進度傳上去
        const boss = wbMakeBoss(w.kind, w.name, w.icon, player.lv);
        const res = raidSimulate({ id: 'wb', boss: boss.id, zone: ZONES[0].id }, [{ uid: cloudUser.id, name: player.name, snap: raidSnapshot() }], { boss, limitMs: WB_FIGHT_MS });
        const me = res.members[0];
        const r = await wbRpc('wb_attack', { p_wb: w.id, p_dmg: Math.round(me.dmg), p_name: player.name, p_cls: player.cls });
        // 戰鬥中用掉的藥水、彈藥照扣
        for (const id in me.used) consumeItem(id, Math.min(me.used[id], countItem(id)));
        addLog(`👹 挑戰世界首領「${w.name}」：造成 ${fmt(r.dmg)} 傷害${r.killed ? '，給了最後一擊！' : ''}`, r.killed ? 'boss' : 'sys');
        saveGame(); refreshUI();
        wbLast = { dmg: me.dmg, applied: r.dmg, died: me.died, used: me.used, killed: r.killed, capped: r.capped, events: res.events.slice(-10) };
        if (r.killed) showToast(`🏆 你給了「${w.name}」最後一擊！`, 3000);
    } catch (e) { showToast(wbErrText(e)); }
    wbBusy = false;
    await wbLoad();
}

// 依伺服器回傳的名次計算獎勵，發給目前的角色
function wbReward(c) {
    const share = c.total > 0 ? c.my_dmg / c.total : 0, factor = c.killed ? 1 : 0.3;
    const exp = Math.max(1, Math.floor(expToNext(player.lv) * (0.03 + 0.3 * share) * factor * huntExpRate(player.lv) * EXP_RATE));
    const gold = Math.round((20000 + 300000 * share) * factor);
    const items = [];
    if (c.killed) {
        if (c.rank === 1) items.push(['elixir', 1]);
        else if (c.rank <= 3) items.push(['bWeaponScroll', 1]);
        if (c.killer_me) items.push(['bArmorScroll', 1]);
    }
    return { exp, gold, items, share };
}

async function wbClaim(id) {
    if (!player || wbBusy) return;
    wbBusy = true;
    try {
        const c = await wbRpc('wb_claim', { p_wb: id });
        const r = wbReward(c);
        player.gold += r.gold;
        gainExp(r.exp);
        for (const [it, n] of r.items) addItem(it, n);
        addLog(`👹 世界首領「${c.name}」獎勵：經驗 +${fmt(r.exp)}、金幣 +${fmt(r.gold)}${r.items.length ? '、' + r.items.map(([it, n]) => ITEMS[it].name + ' ×' + n).join('、') : ''}`, 'boss');
        saveGame(); refreshUI();
        gameAlert(`${c.icon} ${c.name}`, `${c.killed ? '首領被打倒了！' : '首領逃走了（時間到），獎勵只有 30%。'}\n` +
            `你的傷害：${fmt(c.my_dmg)}（第 ${c.rank} 名／${c.participants} 人，佔 ${(r.share * 100).toFixed(1)}%）${c.killer_me ? '\n🗡️ 最後一擊是你！' : ''}\n\n` +
            `經驗 +${fmt(r.exp)}\n金幣 +${fmt(r.gold)}${r.items.map(([it, n]) => `\n${ITEMS[it].name} ×${n}`).join('')}`);
    } catch (e) { showToast(wbErrText(e)); }
    wbBusy = false;
    await wbLoad();
}

function wbTimeLeft(ms) {
    if (ms <= 0) return '0 分';
    const m = Math.ceil(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : `${m} 分`;
}

function renderWb() {
    if (!isCloudConfigured()) return `<div class="panel notice">世界首領需要雲端伺服器，目前尚未開通。</div>`;
    if (!cloudLoggedIn()) return `<div class="panel notice">世界首領要先登入帳號。
        <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div></div>`;
    if (cloudBan) return `<div class="panel notice">⛔ 帳號已被管理者停權，無法挑戰世界首領。</div>`;
    if (!wbState && !wbLoading && !wbErr) setTimeout(wbLoad, 0);
    if (wbErr && !wbState) return `<div class="panel notice">讀取失敗：${esc(wbErr)} <button class="mini secondary" onclick="wbLoad()">重試</button></div>`;
    if (!wbState) return '<div class="panel muted">讀取中…</div>';
    const w = wbState, skew = Date.parse(w.now) - wbLoadedAt;   // 用伺服器時間算倒數
    const now = Date.now() + skew;
    const pct = w.max_hp > 0 ? clamp(w.hp / w.max_hp * 100, 0, 100) : 0;
    let status;
    if (w.killed_at) status = `<span class="good">🏆 已被打倒（最後一擊：${esc(w.killer_name || '?')}）</span>`;
    else if (w.ended) status = '<span class="warn">⌛ 時間到，首領離開了</span>';
    else status = `剩餘時間 ${wbTimeLeft(Date.parse(w.ends_at) - now)}`;
    const next = w.ended && w.next_at ? `<p class="muted">下一隻首領約 ${wbTimeLeft(Date.parse(w.next_at) - now)} 後出現（重新整理就會看到）。</p>` : '';
    const alive = !w.ended && w.hp > 0;
    const claim = wbUnclaimedList.length ? `<div class="panel"><h4>🎁 可以領取的獎勵</h4><div class="list">${wbUnclaimedList.map(u =>
        `<div class="list-row"><b>${esc(u.icon)} ${esc(u.name)}</b><button class="mini" onclick="wbClaim(${u.id})" ${wbBusy ? 'disabled' : ''}>領取</button></div>`).join('')}</div>
        <small class="muted">獎勵發給目前的角色。</small></div>` : '';
    const last = wbLast ? `<div class="panel"><h4>⚔️ 上次挑戰</h4><p style="margin:0">造成 <b>${fmt(wbLast.applied)}</b> 傷害${wbLast.died ? '（中途倒下）' : ''}${wbLast.killed ? '，給了最後一擊！🏆' : ''}${wbLast.capped ? '<br><small class="warn">超過伺服器的單次上限，只計上限值。</small>' : ''}</p>
        ${Object.keys(wbLast.used).length ? `<small class="muted">消耗：${Object.keys(wbLast.used).map(id => `${ITEMS[id] ? ITEMS[id].name : id} ×${wbLast.used[id]}`).join('、')}</small>` : ''}
        <div class="raid-log">${wbLast.events.map(e => `<div class="log-line ${e[2]}">[${Math.floor(e[0] / 1000)} 秒] ${esc(e[1])}</div>`).join('')}</div></div>` : '';
    const rank = wbRankRows.length ? wbRankRows.map(r => {
        const c = CLASSES[r.cls] || {};
        return `<div class="list-row rank-row ${r.is_me ? 'rank-me' : ''}"><span class="rank-no">${rankMedal(Number(r.rk))}</span><div><b>${c.icon || ''} ${esc(r.name)}</b><small>${c.name || ''} Lv.${r.lv}</small></div><span class="rank-val">${fmt(r.dmg)}</span></div>`;
    }).join('') : '<small class="muted">還沒有人挑戰。</small>';
    return `${claim}<div class="panel"><div class="clan-title">${esc(w.icon)} ${esc(w.name)}</div>
            <div class="raid-bar boss"><div style="width:${pct}%"></div><b>${fmt(w.hp)} / ${fmt(w.max_hp)}</b></div>
            <small class="muted">${status}｜${w.participants} 人參戰｜你造成 ${fmt(w.my_dmg)}</small>${next}
            <div class="btn-row"><button onclick="wbAttack()" ${!alive || w.attempts_left <= 0 || wbBusy ? 'disabled' : ''}>⚔️ 挑戰（今天剩 ${w.attempts_left} 次）</button>
                <button class="secondary" onclick="wbLoad()">🔄 重新整理</button></div>
            <small class="muted">全服一起打同一條血。每天 3 次（台灣時間零點重置），每次自動戰鬥 60 秒，用你目前的裝備與藥水（用掉的會扣）；倒下不扣經驗。
            首領被打倒後，有挑戰過的人都能領獎：傷害越多獎勵越多，第 1 名得萬能藥、第 2～3 名得祝福武器卷、最後一擊得祝福防具卷；時間到沒打倒只給 30%。</small></div>
        ${last}
        <div class="panel"><h4>📊 傷害排行</h4><div class="list">${rank}</div></div>`;
}

setInterval(() => {
    if (typeof currentTab !== 'undefined' && tabOpen('wb') && player && !document.hidden && !SIM_MODE && !wbBusy) wbLoad();
}, WB_REFRESH_MS);

TABS.wb = ['👹', '世界首領'];
PANEL_FNS.wb = renderWb;
