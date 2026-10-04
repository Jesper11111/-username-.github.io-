// 每日任務：每 4 小時刷新 10 項任務，各功能透過 addDailyProgress() 回報進度
// 解鎖條件（聲望 1000）由 activity.js 統一把關

function openDailyQuestModal() {
    refreshDailyQuestsIfDue();
    document.getElementById('daily-quest-modal').style.display = 'flex';
    renderDailyQuests();
}

// 時間到就重新產生任務；未完成的進度一併清空
function refreshDailyQuestsIfDue(force) {
    const now = Date.now();
    // 縮短刷新間隔（12 → 4 小時）時，舊存檔的 dailyRefreshAt 仍是照舊間隔算的，
    // 不修掉的話玩家得先等完舊的一輪。超出新間隔就直接壓回上限。
    // 同一個保護也處理存檔轉移／系統時間被調過造成的時間軸異常（ui.js 的 clampRefreshAt）
    player.dailyRefreshAt = clampRefreshAt(player.dailyRefreshAt, DAILY_REFRESH_HOURS);

    if (!force && player.dailyRefreshAt && now < player.dailyRefreshAt
        && Array.isArray(player.dailyQuests) && player.dailyQuests.length > 0) {
        return false;
    }

    // 任務池剛好 10 項，全部採用並各自隨機難度，確保每次都有 10 樣且不重複
    player.dailyQuests = dailyQuestPool.map(def => {
        const tier = Math.floor(Math.random() * def.targets.length);
        return {
            type: def.type,
            tier: tier,
            target: def.targets[tier],
            progress: 0,
            claimed: false
        };
    });
    player.dailyStats = {};
    player.dailyRefreshAt = now + DAILY_REFRESH_HOURS * 3600 * 1000;

    addLog(`📅 每日任務已刷新，共 ${player.dailyQuests.length} 項任務可挑戰！`, "quest");
    return true;
}

// 各功能完成動作時呼叫，累加對應類型的任務進度
function addDailyProgress(type, amount) {
    amount = amount || 1;
    if (!player.dailyStats) player.dailyStats = {};
    player.dailyStats[type] = (player.dailyStats[type] || 0) + amount;

    if (!Array.isArray(player.dailyQuests)) return;
    let changed = false;
    player.dailyQuests.forEach(q => {
        if (q.type === type && !q.claimed && q.progress < q.target) {
            q.progress = Math.min(q.target, q.progress + amount);
            changed = true;
        }
    });

    // 任務面板開著時即時更新進度
    if (changed && document.getElementById('daily-quest-modal').style.display === 'flex') {
        renderDailyQuests();
    }
}

function claimDailyQuest(index) {
    const q = player.dailyQuests[index];
    if (!q) return;
    if (q.claimed) { gameAlert("此任務獎勵已領取。"); return; }
    if (q.progress < q.target) { gameAlert("任務尚未完成！"); return; }

    const def = dailyQuestPool.find(d => d.type === q.type);
    const reward = dailyQuestRewards[q.tier];
    player.coins += reward.coins;
    player.reputation = (player.reputation || 0) + reward.reputation;
    player.martialPoints += reward.martialPoints;
    q.claimed = true;

    addLog(`📅 完成每日任務【${def.name}】：獲得 ${reward.coins.toWan()} 靈石、${reward.reputation} 聲望、${reward.martialPoints} 武學積分`, "quest");
    checkDailyHuashenBonus();   // 一輪全部領完：化神訣殘本（yuanshen.js）
    renderDailyQuests();
    updateUI();
}

// 一次領取所有已完成的任務獎勵
function claimAllDailyQuests() {
    const ready = player.dailyQuests.filter(q => !q.claimed && q.progress >= q.target);
    if (ready.length === 0) { gameAlert("目前沒有可領取的任務獎勵。"); return; }

    let coins = 0, rep = 0, mp = 0;
    ready.forEach(q => {
        const reward = dailyQuestRewards[q.tier];
        coins += reward.coins;
        rep += reward.reputation;
        mp += reward.martialPoints;
        q.claimed = true;
    });
    player.coins += coins;
    player.reputation = (player.reputation || 0) + rep;
    player.martialPoints += mp;

    addLog(`📅 一次領取 ${ready.length} 項每日任務獎勵：${coins.toWan()} 靈石、${rep} 聲望、${mp} 武學積分`, "quest");
    checkDailyHuashenBonus();   // 一輪全部領完：化神訣殘本（yuanshen.js）
    renderDailyQuests();
    updateUI();
}

function renderDailyQuests() {
    const container = document.getElementById('daily-quest-container');
    if (!container) return;

    refreshDailyQuestsIfDue();

    const done = player.dailyQuests.filter(q => q.progress >= q.target).length;
    const claimable = player.dailyQuests.filter(q => !q.claimed && q.progress >= q.target).length;

    const cards = player.dailyQuests.map((q, i) => {
        const def = dailyQuestPool.find(d => d.type === q.type);
        const reward = dailyQuestRewards[q.tier];
        const complete = q.progress >= q.target;
        const percent = Math.floor((q.progress / q.target) * 100);
        const tierName = ["普通", "困難", "艱鉅"][q.tier];

        return `
            <div class="card" style="text-align: left; border-color: ${q.claimed ? 'rgba(255,255,255,0.07)' : (complete ? '#4ade80' : 'rgba(34,211,238,0.3)')};
                        opacity: ${q.claimed ? 0.5 : 1};">
                <h3 style="color: #22d3ee; text-align: center; font-size: 0.95em;">${def.icon} ${def.name}
                    <span style="font-size: 0.75em; color: #9ca3af;">(${tierName})</span></h3>
                <p style="font-size: 0.82em; color: #9ca3af; margin: 4px 0;">${def.desc.replace('{n}', q.target)}</p>
                <div class="bar-container" style="height: 14px; margin: 6px 0;">
                    <div style="background: linear-gradient(90deg, #0e7490, #22d3ee); width: ${percent}%; height: 100%; transition: width .3s;"></div>
                    <div class="bar-text" style="line-height: 14px; font-size: 0.72em;">${q.progress} / ${q.target}</div>
                </div>
                <p style="font-size: 0.76em; color: #4ade80; margin: 4px 0;">
                    獎勵：${reward.coins.toWan()} 靈石、${reward.reputation} 聲望、${reward.martialPoints} 武學積分
                </p>
                <button class="sys-btn" ${(!complete || q.claimed) ? 'disabled' : ''} onclick="claimDailyQuest(${i})">
                    ${q.claimed ? '✅ 已領取' : (complete ? '🎁 領取獎勵' : '進行中')}
                </button>
            </div>`;
    }).join("");

    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 20px; margin-bottom: 14px; font-size: 0.88em;">
            <span style="color: var(--accent);">完成進度：${done} / ${player.dailyQuests.length}</span>
            <span style="color: #9ca3af;">下次刷新：${formatCountdown(player.dailyRefreshAt - Date.now())}</span>
        </div>
        <button class="sys-btn" ${claimable === 0 ? 'disabled' : ''} onclick="claimAllDailyQuests()" style="margin-bottom: 14px;">
            🎁 一鍵領取全部獎勵${claimable > 0 ? `（${claimable} 項）` : ''}
        </button>
        <div class="grid-container">${cards}</div>`;
}
