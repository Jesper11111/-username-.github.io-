// 活動選單：統一處理各活動的解鎖條件（聲望 + 境界）與開啟

// 回傳未達成的條件說明；已解鎖則回傳 null
function getActivityLockReason(act) {
    if ((player.reputation || 0) < act.minRep) {
        return `聲望不足（需 ${act.minRep.toWan()}，目前 ${(player.reputation || 0).toWan()}）`;
    }
    if (player.realmIndex < act.minRealmIndex) {
        return `境界不足（需【${realms[act.minRealmIndex]}】以上）`;
    }
    return null;
}

// 由 updateUI() 每秒呼叫，讓解鎖狀態即時反映聲望與境界的變化
function renderActivityList() {
    const container = document.getElementById('activity-list');
    if (!container) return;

    container.innerHTML = activityData.map(act => {
        const lock = getActivityLockReason(act);
        const locked = lock !== null;
        // 有橫幅（config-activities.js 的 banner／img）：按鈕底圖＋左側漸層壓暗，字疊在上面
        const bg = act.banner || act.img;
        const bgStyle = bg ? `background: linear-gradient(90deg, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.7) 45%, rgba(10,10,15,0.15) 100%), url('${bg}') center 30% / cover;${locked ? ' filter: grayscale(0.8);' : ''} min-height: 64px; text-shadow: 0 1px 3px #000;` : '';
        return `
            <button class="sys-btn" style="border-color: ${locked ? 'rgba(255,255,255,0.12)' : 'rgba(34,211,238,0.45)'};
                        color: ${locked ? '#6b7280' : '#22d3ee'}; text-align: left; line-height: 1.5; ${bgStyle}"
                    onclick="openActivity('${act.id}')">
                ${locked ? '🔒' : act.icon} ${act.name}
                <div style="font-size: 0.72em; color: ${locked ? '#6b7280' : '#9ca3af'}; font-weight: normal;">
                    ${locked ? lock : act.desc}
                </div>
            </button>`;
    }).join("");
}

// ---- 付費立即刷新（千寶閣、懸賞榜共用）----
// 每日次數用「當地日期字串」判斷換日，不用時間戳：存檔轉移到其他裝置時不會算錯。kind：'auction'／'bounty'
function getPaidRefreshState() {
    const today = new Date().toDateString();
    if (!player.paidRefresh || typeof player.paidRefresh !== 'object' || player.paidRefresh.date !== today) {
        player.paidRefresh = { date: today };
    }
    return player.paidRefresh;
}

function getPaidRefreshLeft(kind, limit) {
    return Math.max(0, limit - (getPaidRefreshState()[kind] || 0));
}

// 檢查次數與靈石並扣款；成功回傳 true
function payForRefresh(kind, cost, limit, name) {
    if (getPaidRefreshLeft(kind, limit) <= 0) {
        gameAlert(`【${name}】今日刷新次數已用完（每日 ${limit} 次），明天再來吧！`);
        return false;
    }
    if ((player.coins || 0) < cost) {
        gameAlert(`靈石不足！立即刷新【${name}】需要 ${cost.toWan()} 靈石。`);
        return false;
    }
    player.coins -= cost;
    const state = getPaidRefreshState();
    state[kind] = (state[kind] || 0) + 1;
    return true;
}

function renderPaidRefreshButton(kind, cost, limit, fnName) {
    const left = getPaidRefreshLeft(kind, limit);
    return `<button class="sys-btn" style="margin: 0 0 14px;" ${left <= 0 ? 'disabled' : ''} onclick="${fnName}()">
        🔄 立即刷新（${cost.toWan()} 靈石｜今日剩 ${left}/${limit} 次）</button>`;
}

function openActivity(id) {
    const act = activityData.find(a => a.id === id);
    if (!act) return;

    const lock = getActivityLockReason(act);
    if (lock) {
        gameAlert(`【${act.name}】尚未開啟\n\n${lock}\n\n開啟條件：聲望 ${act.minRep.toWan()}`
            + (act.minRealmIndex > 0 ? `、境界【${realms[act.minRealmIndex]}】以上` : ""));
        return;
    }

    if (act.img) { openActivityPoster(act); return; }   // 有海報：先看海報，再按「進入」（未開放＝敬請期待）
    if (!act.implemented) {
        gameAlert(`【${act.name}】\n\n${act.desc}\n\n功能開發中，敬請期待！`);
        return;
    }

    // 已實作的活動交由各自模組開啟
    window[act.openFn]();
}

// 活動海報（config-activities.js 的 img，例：域外天魔「三界之戰」）：#activity-poster-modal；已開放的活動按「進入」才開啟
let activityPosterId = null;
function openActivityPoster(act) {
    activityPosterId = act.id;
    document.getElementById('activity-poster-img').src = act.img;
    document.getElementById('activity-poster-img').alt = act.name;
    document.getElementById('activity-poster-title').textContent = `${act.icon} ${act.name}`;
    document.getElementById('activity-poster-desc').textContent = act.desc + (act.implemented ? '' : '\n功能開發中，敬請期待！');
    const btn = document.getElementById('activity-poster-enter');
    btn.style.display = act.implemented ? '' : 'none';
    document.getElementById('activity-poster-modal').style.display = 'flex';
}
function enterActivityPoster() {
    const act = activityData.find(a => a.id === activityPosterId);
    closeModal('activity-poster-modal');
    if (act && act.implemented && !getActivityLockReason(act)) window[act.openFn]();
}
