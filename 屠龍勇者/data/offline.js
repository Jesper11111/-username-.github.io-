// 屠龍勇者：離線收益（ARCHITECTURE.md 第 14 節）（依賴 player、combat、save）
// 關掉網頁（或分頁在背景被瀏覽器暫停）再回來時，依離開時間結算掛機成果：
//   1. 用目前的地圖、裝備、補給「快轉模擬」10 分鐘掛機（不影響真正的存檔，模擬完還原）
//   2. 量出每毫秒的經驗、金幣、擊殺、消耗品用量
//   3. 有效時間 = 離開時間（最多 12 小時）× 50%，再受補給限制：藥水／彈藥不夠就提早結束
//   4. 模擬中陣亡 → 只結算到陣亡為止，並照死亡規則扣經驗、回村
// 離線期間不撿道具、不累積任務進度；龍穴不算離線掛機

function totalExpOf(p) {
    let t = p.exp;
    for (let l = 1; l < p.lv; l++) t += expToNext(l);
    return t;
}

// 會被持續消耗、需要按比例扣的補給（回家卷軸只在結束時用一張）
function isOfflineConsumable(id) {
    const d = ITEMS[id];
    return d.cat === 'potion' || d.cat === 'ammo' || id === 'teleScroll';
}

function consumableCounts() {
    const m = {};
    for (const x of player.inv) if (isOfflineConsumable(x.id)) m[x.id] = (m[x.id] || 0) + x.n;
    return m;
}

// 快轉模擬一段掛機並回傳結果；結束後完全還原玩家狀態
function measureHunt(sampleMs) {
    const snap = JSON.stringify(player);
    // 遊戲訊息要整份備份：訊息滿 120 行時模擬會把舊訊息擠掉，只切回長度會留下模擬的訊息（編號比 logSeq 大，地圖每幀重讀 → 頭頂一直冒 LEVEL UP）
    const saved = { hunt, session, walkHome, gameNow, log: gameLog.slice(), logSeq };
    const before = { exp: totalExpOf(player), gold: player.gold, kills: player.kills, deaths: player.deaths, items: consumableCounts() };
    SIM_MODE = true;
    hunt = null; walkHome = null;
    session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
    player.hunting = true;
    let t = 0, died = false, ended = false, expBeforeDeath = before.exp;
    try {
        while (t < sampleMs) {
            const expNow = totalExpOf(player);
            gameNow += 100; t += 100;
            huntTick(100);
            cleanBuffs();
            if (t % REGEN_MS === 0) regenTick();
            if (player.deaths > before.deaths) { died = true; expBeforeDeath = expNow; break; }
            if (!player.hunting) { ended = true; break; }
        }
        const after = consumableCounts(), used = {};
        for (const id in before.items) {
            const d = before.items[id] - (after[id] || 0);
            if (d > 0) used[id] = d;
        }
        return {
            ms: t, died, ended, used,
            exp: Math.max(0, (died ? expBeforeDeath : totalExpOf(player)) - before.exp),
            gold: player.gold - before.gold,
            kills: player.kills - before.kills,
        };
    } finally {
        player = JSON.parse(snap);
        hunt = saved.hunt; session = saved.session; walkHome = saved.walkHome; gameNow = saved.gameNow;
        gameLog.length = 0; gameLog.push(...saved.log); logSeq = saved.logSeq;
        SIM_MODE = false;
    }
}

// 結算離線收益；回傳報告（沒有在掛機則回傳 null）
function applyOffline(awayMs) {
    if (!player || !player.hunting || player.loc.type !== 'zone') return null;
    const z = currentZone();
    if (!z || z.type === 'dragon') return null;
    const capped = Math.min(awayMs, OFFLINE_MAX_MS);
    let eff = capped * OFFLINE_RATE;
    const s = measureHunt(Math.min(OFFLINE_SAMPLE_MS, eff));
    if (s.ms <= 0) return null;

    let end = '';
    // 補給限制：每種消耗品夠撐多久
    for (const id in s.used) {
        const canLast = countItem(id) / (s.used[id] / s.ms);
        if (canLast < eff) { eff = canLast; end = 'supply'; }
    }
    // 模擬中就陣亡或回村：有效時間超過模擬長度時，照模擬結果結束
    if ((s.died || s.ended) && eff >= s.ms) { eff = s.ms; end = s.died ? 'died' : 'home'; }

    const k = eff / s.ms;
    const lv0 = player.lv;
    const exp = Math.floor(s.exp * k), gold = Math.floor(s.gold * k), kills = Math.floor(s.kills * k);
    const usedText = [];
    for (const id in s.used) {
        const n = Math.min(countItem(id), Math.round(s.used[id] * k));
        if (n > 0) { consumeItem(id, n); usedText.push(`${ITEMS[id].short || ITEMS[id].name} ×${fmt(n)}`); }
    }
    player.gold += gold;
    player.kills += kills;
    gainExp(exp);

    let endText = `仍在${zoneTitle()}掛機中`;
    if (end === 'died') {
        player.deaths++;
        let msg = '離線掛機途中陣亡';
        if (consumeItem('reviveScroll')) msg += '，復活卷軸生效、沒有損失經驗';
        else {
            const lose = Math.floor(expToNext(player.lv) * deathLossRate(player.lv));
            player.exp = Math.max(0, player.exp - lose);
            msg += `，損失 ${fmt(lose)} 經驗`;
        }
        player.buffs = {};
        const st = calcStats();
        player.hp = Math.max(1, Math.floor(st.maxHp * 0.3));
        player.hunting = false;
        player.loc = { type: 'town', id: z.town };
        endText = msg + `，已回到${TOWNS[z.town].name}`;
    } else if (end === 'supply' || end === 'home') {
        player.hunting = false;
        if (consumeItem('homeScroll')) { player.loc = { type: 'town', id: z.town }; endText = `補給用完，使用回家卷軸回到${TOWNS[z.town].name}`; }
        else endText = '補給用完，停止掛機（沒有回家卷軸，留在原地）';
    }
    hunt = null;
    session = null;
    const st = calcStats();
    player.hp = Math.min(player.hp, st.maxHp);

    const report = {
        awayMs, effMs: eff, exp, gold, kills, lvUp: player.lv - lv0, used: usedText, endText, capped: awayMs > OFFLINE_MAX_MS,
    };
    addLog(`🌙 離線收益：擊倒 ${fmt(kills)}、經驗 +${fmt(exp)}、金幣 +${fmt(gold)}`, 'rare');
    saveGame();
    return report;
}

function fmtHM(ms) {
    const m = Math.floor(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)} 小時 ${m % 60} 分` : `${m} 分`;
}

function showOfflineReport(r) {
    const lines = [
        `離開 ${fmtHM(r.awayMs)}${r.capped ? '（最多結算 12 小時）' : ''}，以 ${OFFLINE_RATE * 100}% 效率結算 ${fmtHM(r.effMs)}`,
        '',
        `擊倒：${fmt(r.kills)} 隻`,
        `經驗：+${fmt(r.exp)}${r.lvUp > 0 ? `（升了 ${r.lvUp} 級！）` : ''}`,
        `金幣：+${fmt(r.gold)}`,
        `消耗：${r.used.length ? r.used.join('、') : '無'}`,
        '',
        r.endText,
        '',
        '※ 離線期間不撿道具、不累積任務進度。',
    ];
    gameAlert('🌙 離線收益', lines.join('\n'));
}
