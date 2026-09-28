// 宗門門派任務：顯示各任務獎勵、接取/停止玩家自己的任務
// 僕從的任務指派在 servant.js（每位僕從可各自負責不同任務）

// 取得指定任務在目前宗門等級下的定義（該等級沒有此任務時回傳 null）
function getQuestDef(questId, tier) {
    let quest = questData[questId];
    return (quest && quest[tier]) || null;
}

// 目前宗門等級可用的任務代號清單（例：初級宗門沒有礦脈採礦）
function getAvailableQuestIds(tier) {
    return Object.keys(questData).filter(questId => getQuestDef(questId, tier));
}

// 完成一次所需進度：有 duration 的任務為固定秒數，其餘沿用 QUEST_REQUIRED_PROGRESS
function getQuestRequiredProgress(def) {
    return def && def.duration ? def.duration * QUEST_PROGRESS_PER_TICK : QUEST_REQUIRED_PROGRESS;
}

// 每秒進度：玩家本人為基礎值；僕從乘上自身效率（固定耗時的任務不受效率影響）
function getQuestSpeed(def, servant) {
    if (!servant || (def && def.duration)) return QUEST_PROGRESS_PER_TICK;
    return QUEST_PROGRESS_PER_TICK * servant.mult * (1 + gearFx("役使"));   // 役使（裝備特效，gear.js）
}

// 此僕從能否接這個任務（requiredQuality 限定品質）
function canServantTakeQuest(servant, def) {
    return !!def && (!def.requiredQuality || servant.quality === def.requiredQuality);
}

// 將獎勵格式化為「5 靈石、1~30 礦石」這類文字
function formatQuestRewards(def) {
    return Object.keys(def.rewards)
        .map(key => {
            if (key === 'caravan') return formatCaravanReward();   // 商隊：依境界換算的靈石（economy.js）
            let v = def.rewards[key];
            return `${Array.isArray(v) ? `${v[0]}~${v[1]}` : v} ${questRewardInfo[key].label}`;
        })
        .join("、");
}

// 實際把獎勵加到 player 身上（[最小, 最大] 每次隨機），回傳實際獲得的文字供日誌使用
// servant：由僕從完成時傳入（商隊收益依僕從品質）
function grantQuestRewards(def, servant) {
    let parts = [];
    for (let key in def.rewards) {
        if (key === 'caravan') { parts.push(grantCaravanReward(servant)); continue; }   // 商隊（economy.js）
        let v = def.rewards[key];
        let amount = Array.isArray(v) ? v[0] + Math.floor(Math.random() * (v[1] - v[0] + 1)) : v;
        let field = questRewardInfo[key].field;
        player[field] = (player[field] || 0) + amount;
        parts.push(`${amount} ${questRewardInfo[key].label}`);
    }
    return parts.join("、");
}

function openQuestModal() {
    if (!checkSectJoined()) return;
    if (!isInSect() && !player.servants.some(s => s.quest)) {
        alert("你必須回到【宗門】才能接取任務，或先到「僕從小屋」指派僕從代為執行！");
        return;
    }
    document.getElementById('quest-modal').style.display = 'flex';
    renderQuestButtons();
    updateQuestUI();
}

function renderQuestButtons() {
    let tier = getSectTier();
    let container = document.getElementById('quest-buttons-container');
    let atSect = isInSect();

    let cards = getAvailableQuestIds(tier).map(questId => {
        let def = getQuestDef(questId, tier);
        let isActive = player.activeQuest === questId;
        let workers = player.servants.filter(s => s.quest === questId);
        let workerText = workers.length > 0
            ? `<p style="font-size:0.78em; color:var(--servant-color); margin:4px 0;">僕從代勞：${workers.map(s => s.name).join("、")}</p>`
            : "";
        let seconds = getQuestRequiredProgress(def) / QUEST_PROGRESS_PER_TICK;
        let timeText = def.duration ? (seconds >= 3600 ? `固定 ${+(seconds / 3600).toFixed(1)} 小時／次` : `固定 ${seconds} 秒／次`) : `基礎 ${seconds} 秒／次`;
        let limitText = def.requiredQuality
            ? `<p style="font-size: 0.8em; color: #fb923c; margin: 4px 0;">限【<span class="quality-${def.requiredQuality}">${def.requiredQuality}</span>】僕從代勞（至僕從小屋指派）</p>`
            : def.servantOnly ? `<p style="font-size: 0.8em; color: #fb923c; margin: 4px 0;">只能由僕從執行（至僕從小屋指派）</p>` : "";
        let button = def.requiredQuality
            ? `<button class="sys-btn" disabled>僅限${def.requiredQuality}僕從</button>`
            : def.servantOnly ? `<button class="sys-btn" disabled>僅限僕從</button>`
            : `<button class="sys-btn ${isActive ? 'active' : ''}" ${atSect ? '' : 'disabled'} onclick="startQuest('${questId}')">
                    ${isActive ? '✅ 執行中' : (atSect ? '接取任務' : '需在宗門')}
               </button>`;

        return `
            <div class="card" style="text-align: left; border-color: ${isActive ? '#22d3ee' : 'rgba(255,255,255,0.08)'};">
                <h3 style="color: #22d3ee; text-align: center;">${def.icon} ${def.name}</h3>
                <p style="font-size: 0.82em; color: #9ca3af; margin: 4px 0;">耗時：${timeText}</p>
                <p style="font-size: 0.85em; color: #4ade80; margin: 4px 0;">獎勵：${formatQuestRewards(def)}</p>
                ${limitText}
                ${workerText}
                ${button}
            </div>`;
    }).join("");

    container.innerHTML = `<div class="grid-container">${cards}</div>`;
}

function startQuest(questId) {
    if (!isInSect()) {
        alert("你必須待在【宗門】才能親自接取任務！（或指派僕從代為執行）");
        return;
    }
    let def = getQuestDef(questId, getSectTier());
    if (!def) return;
    if (def.requiredQuality || def.servantOnly) {
        alert(`【${def.name}】只有${def.requiredQuality ? def.requiredQuality + '品質的' : ''}僕從才能執行，請到僕從小屋指派。`);
        return;
    }

    player.activeQuest = questId;
    player.questTimer = 0;
    renderQuestButtons();
    updateQuestUI();
    addLog(`📜 接取了門派任務【${def.name}】，獎勵：${formatQuestRewards(def)}。`, "quest");
}

function stopQuest() {
    player.activeQuest = null;
    player.questTimer = 0;
    updateQuestUI();
    addLog("中斷了門派任務。", "system");
}

function updateQuestUI() {
    let display = document.getElementById('current-quest-display');
    let servantDisp = document.getElementById('assigned-servant-display');
    if (!display || !servantDisp) return;

    let tier = getSectTier();

    if (player.activeQuest) {
        let def = getQuestDef(player.activeQuest, tier);
        let percent = Math.floor((player.questTimer / getQuestRequiredProgress(def)) * 100);
        display.innerHTML = def
            ? `當前任務：${def.icon} ${def.name}（進度 ${percent}%｜獎勵 ${formatQuestRewards(def)}）`
            : "當前未接取任務";
    } else {
        display.innerText = "當前未接取任務";
    }

    let workers = player.servants.filter(s => s.quest);
    if (workers.length > 0) {
        servantDisp.innerHTML = `派遣僕從（${workers.length}/${MAX_ASSIGNED_SERVANTS}）：<br>` + workers.map(s => {
            let def = getQuestDef(s.quest, tier);
            let percent = Math.floor(((s.timer || 0) / getQuestRequiredProgress(def)) * 100);
            return `・${s.name} → ${def ? def.icon + ' ' + def.name : '未知任務'}（效率 x${s.mult}，進度 ${percent}%，每趟 ${getServantTripCost(s)} 靈石）`;
        }).join("<br>");
    } else {
        servantDisp.innerText = "派遣僕從：無（可至僕從小屋分別指派）";
    }
}
