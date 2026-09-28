// 僕從小屋：每位僕從可各自被指派到不同的門派任務，並獨立累積進度
// 僕從資料結構：{ id, name, quality, mult, quest: 任務代號或 null, timer: 進度, locked: 鎖定（可省略 = 未鎖定） }
// 僕從相關日誌一律寫進「🤝 僕從」日誌分頁（type "servant"，ui.js 的 LOG_CHANNEL_BY_TYPE）

function openServantModal() {
    if (!checkSectJoined()) return;
    document.getElementById('servant-modal').style.display = 'flex';
    renderServants();
}

function getAssignedServantCount() {
    return player.servants.filter(s => s.quest).length;
}

// 派遣此僕從跑一趟任務的靈石花費（依品質，見 config-servants.js）
function getServantTripCost(servant) {
    return SERVANT_TRIP_COST[servant.quality] || 0;
}

// 開始新的一趟：付得起就扣靈石並回傳 true；questId 不給 = 目前任務
// 商隊（caravan）另受每日趟數限制（economy.js），出發時就計入今日趟數
function payServantTrip(servant, questId) {
    let q = questId || servant.quest;
    if (q === 'caravan' && caravanTripsLeft() <= 0) return false;
    let cost = getServantTripCost(servant);
    if (player.coins < cost) return false;
    player.coins -= cost;
    if (q === 'caravan') reserveCaravanTrip();
    return true;
}
// payServantTrip 失敗的原因（日誌、提示用）
function servantTripFailText(servant, questId) {
    let q = questId || servant.quest;
    if (q === 'caravan' && caravanTripsLeft() <= 0) return `今日商隊 ${CARAVAN.dailyTrips} 趟已跑完`;
    return `靈石不足 ${getServantTripCost(servant)}`;
}

// ⚠️ 僕從數量沒有上限（長期掛機可累積上千名），一律先組好整段 HTML 再一次寫入。
// 不可在迴圈內使用 container.innerHTML +=：每次都會重新解析整個列表，600 名僕從就會卡住約 12 秒。
function renderServants() {
    const container = document.getElementById('servant-list-container');

    if (player.servants.length === 0) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #6b7280; padding: 20px;">您目前沒有僕從，去野外戰鬥拯救受困修士吧！</div>`;
        return;
    }

    let tier = getSectTier();
    let assignedCount = getAssignedServantCount();
    let parts = [];

    parts.push(`<div style="grid-column: 1 / -1; text-align: center; color: var(--accent); font-size: 0.9em;">
        目前派遣中：${assignedCount} / ${MAX_ASSIGNED_SERVANTS} 名（每位僕從可負責不同任務，且不受你所在地點限制）｜僕從 ${player.servants.length} / ${MAX_SERVANTS} 名${player.servants.length >= MAX_SERVANTS ? '（已滿，野外不會再收留新僕從）' : ''}
        <div style="font-size: 0.85em; color: #9ca3af; margin-top: 4px;">
            每趟任務開始時依品質支付靈石：${servantQualities.map(q => `<span class="quality-${q.name}">${q.name}</span> ${SERVANT_TRIP_COST[q.name]}`).join("／")}（靈石不足時僕從會停工）
        </div>
    </div>`);

    // 依品級一鍵解僱（數量不含鎖定的僕從）
    let counts = {};
    player.servants.forEach(s => { if (!s.locked) counts[s.quality] = (counts[s.quality] || 0) + 1; });
    parts.push(renderBulkDeleteBar(
        "一鍵解僱僕從（依品級）",
        "bulk-servant-quality",
        servantQualities.map(q => q.name),
        counts,
        "bulkDismissServants",
        "※ 正在執行任務的僕從一併解僱，其任務會中止；🔒 鎖定的僕從不會被解僱"
    ));

    // 任務選項只算一次；限定品質的任務（例：礦脈採礦限傳說）只出現在符合的僕從選單
    let questOptions = getAvailableQuestIds(tier).map(questId => {
        let def = getQuestDef(questId, tier);
        let dur = def.duration ? (def.duration >= 3600 ? `｜${+(def.duration / 3600).toFixed(1)} 小時` : `｜${def.duration} 秒`) : '';
        return { questId, def, label: `${def.icon} ${def.name}（${formatQuestRewards(def)}${dur}）` };
    });

    // 派遣中的僕從排在最前面，方便管理
    let sorted = player.servants.filter(s => s.quest).concat(player.servants.filter(s => !s.quest));

    sorted.forEach(s => {
        let options = `<option value="">— 不指派 —</option>` + questOptions
            .filter(o => canServantTakeQuest(s, o.def))
            .map(o => `<option value="${o.questId}" ${s.quest === o.questId ? 'selected' : ''}>${o.label}</option>`)
            .join("");

        let percent = Math.floor(((s.timer || 0) / getQuestRequiredProgress(getQuestDef(s.quest, tier))) * 100);
        let statusText = s.quest
            ? `<p style="font-size: 0.8em; color: #4ade80; margin: 6px 0;">執行中・進度 ${percent}%</p>`
            : `<p style="font-size: 0.8em; color: #6b7280; margin: 6px 0;">閒置中</p>`;

        parts.push(`
            <div class="card" style="border-color: var(--servant-color);">
                <h3 class="quality-${s.quality}">${s.name}${s.locked ? ' 🔒' : ''}</h3>
                <p style="font-size: 0.85em; margin: 5px 0; color:#9ca3af;">品質：<span class="quality-${s.quality}">${s.quality}</span></p>
                <p style="font-size: 0.85em; color: #facc15; margin-bottom: 8px;">任務效率：x${s.mult}｜每趟 ${getServantTripCost(s)} 靈石</p>
                <select onchange="assignServantQuest('${s.id}', this.value)"
                        style="width: 100%; background: #0b0f19; color: #fff; padding: 6px; border-radius: 6px; border: 1px solid var(--panel-border); font-size: 0.82em;">
                    ${options}
                </select>
                ${statusText}
                <button onclick="toggleServantLock('${s.id}')">${s.locked ? '🔒 已鎖定' : '🔓 鎖定'}</button>
                <button style="border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.1);" onclick="dismissServant('${s.id}')" ${s.locked ? 'disabled title="已鎖定，解鎖後才能解僱"' : ''}>解僱僕從</button>
            </div>`);
    });

    container.innerHTML = parts.join("");
}

// 指派（或取消指派）單一僕從的任務
function assignServantQuest(servantId, questId) {
    let servant = player.servants.find(s => s.id === servantId);
    if (!servant) return;

    if (questId) {
        // 從「閒置」變成「執行任務」時才需檢查派遣上限；單純更換任務不受限
        if (!servant.quest && getAssignedServantCount() >= MAX_ASSIGNED_SERVANTS) {
            alert(`最多只能同時派遣 ${MAX_ASSIGNED_SERVANTS} 名僕從執行任務！\n請先將其他僕從設為「不指派」。`);
            renderServants();
            return;
        }
        let def = getQuestDef(questId, getSectTier());
        if (!def) return;
        if (!canServantTakeQuest(servant, def)) {
            alert(`【${def.name}】只有${def.requiredQuality}品質的僕從才能執行！`);
            renderServants();
            return;
        }
        if (servant.quest === questId) { renderServants(); return; }

        // 換任務或從閒置出發都是新的一趟：先付這趟的靈石
        let cost = getServantTripCost(servant);
        if (!payServantTrip(servant, questId)) {
            alert(questId === 'caravan' && caravanTripsLeft() <= 0
                ? `今日商隊 ${CARAVAN.dailyTrips} 趟已經跑完，明天再派吧！`
                : `靈石不足！派遣【${servant.quality}】僕從每趟需要 ${cost} 靈石（目前 ${player.coins.toWan()}）。`);
            renderServants();
            return;
        }
        servant.timer = 0;
        servant.quest = questId;
        addLog(`🤝 指派僕從【${servant.name}】負責【${def.name}】（每趟 ${cost} 靈石），每次完成可得 ${formatQuestRewards(def)}。`, "servant");
        updateUI();
    } else {
        servant.quest = null;
        servant.timer = 0;
        addLog(`🤝 召回了僕從【${servant.name}】，暫停其任務。`, "servant");
    }

    renderServants();
    updateQuestUI();
}

// 一鍵解僱：把所有勾選品級的僕從一次遣散
function bulkDismissServants() {
    let selected = getCheckedBulkQualities('bulk-servant-quality');
    if (selected.length === 0) { alert("請先勾選要解僱的品級！"); return; }

    // 鎖定的僕從一律略過
    let targets = player.servants.filter(s => selected.includes(s.quality) && !s.locked);
    if (targets.length === 0) { alert("沒有符合勾選品級、且未鎖定的僕從。"); return; }

    let working = targets.filter(s => s.quest).length;
    let warn = working > 0 ? `\n（其中 ${working} 名正在執行任務，解僱後任務將中止）` : "";
    let lockedSkipped = player.servants.filter(s => selected.includes(s.quality) && s.locked).length;
    let lockNote = lockedSkipped > 0 ? `\n（另有 ${lockedSkipped} 名已鎖定，不會被解僱）` : "";
    if (!confirm(`確定要解僱 ${targets.length} 名【${selected.join('、')}】僕從嗎？${warn}${lockNote}\n此操作無法復原。`)) return;

    let targetIds = new Set(targets.map(s => s.id));
    player.servants = player.servants.filter(s => !targetIds.has(s.id));
    addLog(`🗑️ 一鍵解僱了 ${targets.length} 名僕從（${selected.join('、')}）${lockedSkipped > 0 ? `，略過 ${lockedSkipped} 名鎖定` : ''}。`, "servant");
    renderServants();
    updateQuestUI();
    updateUI();
}

function dismissServant(servantId) {
    let servant = player.servants.find(s => s.id === servantId);
    if (!servant) return;
    if (servant.locked) { alert(`僕從【${servant.name}】已鎖定，請先解除鎖定再解僱。`); return; }
    if (!confirm(`確定要解僱僕從【${servant.name}】嗎？`)) return;
    player.servants = player.servants.filter(s => s.id !== servantId);
    addLog(`解僱了僕從【${servant.name}】。`, "servant");
    renderServants();
    updateQuestUI();
}

// 鎖定／解鎖僕從：鎖定後無法單獨解僱，一鍵解僱也會略過（避免誤刪）
function toggleServantLock(servantId) {
    let servant = player.servants.find(s => s.id === servantId);
    if (!servant) return;
    servant.locked = !servant.locked;
    renderServants();
}

// 由 combatTick() 每秒呼叫：每位有任務的僕從各自累積進度並結算獎勵
function tickServantQuests() {
    if (!player.servants || player.servants.length === 0) return;

    let tier = getSectTier();
    let anyCompleted = false;

    player.servants.forEach(s => {
        if (!s.quest) return;
        let def = getQuestDef(s.quest, tier);
        // 換了宗門後任務不存在或品質不符 → 回到閒置
        if (!canServantTakeQuest(s, def)) { s.quest = null; s.timer = 0; anyCompleted = true; return; }

        s.timer = (s.timer || 0) + getQuestSpeed(def, s);
        let required = getQuestRequiredProgress(def);

        while (s.quest && s.timer >= required) {
            s.timer -= required;
            let got = grantQuestRewards(def, s);
            addDailyProgress('sectQuest');
            addLog(`${def.icon} 僕從【${s.name}】完成【${def.name}】：獲得 ${got}`, "servant");
            anyCompleted = true;
            // 礦脈採礦偶爾挖到星允鐵（enhance.js）
            if (s.quest === 'mine' && Math.random() < IRON_MINE_CHANCE) {
                addStarIron(randInt(IRON_MINE_AMOUNT[0], IRON_MINE_AMOUNT[1]), `僕從【${s.name}】在礦脈深處挖到星允鐵`);
            }

            // 接著出發下一趟：付不起靈石就停工
            if (!payServantTrip(s)) {
                addLog(`💸 ${servantTripFailText(s)}，僕從【${s.name}】停止【${def.name}】，回到閒置。`, "servant");
                s.quest = null;
                s.timer = 0;
            }
        }
    });

    if (anyCompleted) updateUI();
}

// 離線／背景補發（save.js 的 settleIdleSeconds）：一次推進 seconds 秒的門派任務進度（2026-09-28 修正：原本離線期間僕從與自己的任務完全停擺）
//   僕從：不論玩家在哪裡都照常工作（同 tickServantQuests），每趟結束扣下一趟的靈石，付不起就停工
//   自己：身在宗門時才會推進（同 combatTick）
//   逐趟的日誌不寫（避免洗版），改回傳一行彙總文字；獎勵以前後差額計算
function settleIdleQuests(seconds) {
    if (!(seconds > 0)) return '';
    const tier = getSectTier();
    const fields = Object.values(questRewardInfo).map(info => info.field);
    const before = {};
    fields.concat(['starIron']).forEach(f => { before[f] = player[f] || 0; });
    let servantTrips = 0, ownTrips = 0, stopped = 0;
    const savedLog = window.addLog;
    window.addLog = () => {};   // 逐趟日誌（含星允鐵、每日任務）不寫，最後彙總
    try {
        (player.servants || []).forEach(s => {
            if (!s.quest) return;
            const def = getQuestDef(s.quest, tier);
            if (!canServantTakeQuest(s, def)) { s.quest = null; s.timer = 0; return; }
            s.timer = (s.timer || 0) + getQuestSpeed(def, s) * seconds;
            const required = getQuestRequiredProgress(def);
            while (s.quest && s.timer >= required) {
                s.timer -= required;
                grantQuestRewards(def, s);
                addDailyProgress('sectQuest');
                servantTrips++;
                if (s.quest === 'mine' && Math.random() < IRON_MINE_CHANCE) addStarIron(randInt(IRON_MINE_AMOUNT[0], IRON_MINE_AMOUNT[1]), '');
                if (!payServantTrip(s)) { s.quest = null; s.timer = 0; stopped++; }
            }
        });
        if (player.activeQuest && isInSect()) {
            const def = getQuestDef(player.activeQuest, tier);
            if (!def || def.requiredQuality || def.servantOnly) { player.activeQuest = null; player.questTimer = 0; }
            else {
                player.questTimer = (player.questTimer || 0) + getQuestSpeed(def, null) * seconds;
                const required = getQuestRequiredProgress(def);
                while (player.questTimer >= required) {
                    player.questTimer -= required;
                    grantQuestRewards(def);
                    addDailyProgress('sectQuest');
                    ownTrips++;
                }
            }
        }
    } finally {
        window.addLog = savedLog;
    }
    if (!servantTrips && !ownTrips) return '';
    const gains = Object.values(questRewardInfo)
        .map(info => [info.label, (player[info.field] || 0) - before[info.field]]).filter(([, v]) => v > 0)
        .map(([label, v]) => `${v.toWan()} ${label}`);
    const iron = (player.starIron || 0) - before.starIron;
    if (iron > 0) gains.push(`${iron} 星允鐵`);
    return `📜 門派任務：${servantTrips ? `僕從完成 ${servantTrips.toWan()} 趟` : ''}${servantTrips && ownTrips ? '、' : ''}${ownTrips ? `你完成 ${ownTrips.toWan()} 趟` : ''}`
        + (gains.length ? `，獲得 ${gains.join('、')}` : '') + (stopped ? `（${stopped} 名僕從因靈石不足停工）` : '') + '。';
}