// 人物頭像更換（設定見 config-avatars.js）
// player.avatarId：目前使用的頭像 id（null = 依性別使用預設的韓立／南宮婉）
// player.unlockedAvatars：已解鎖的頭像 id；達成條件時自動加入並永久保留（轉世不會失去）

// 目前應顯示的頭像（洞府頭像框、戰鬥實況共用）
function getPlayerAvatar() {
    let chosen = avatarList.find(a => a.id === player.avatarId);
    if (chosen && isAvatarUnlocked(chosen)) return chosen;
    return avatarList.find(a => a.id === (player.gender === 'female' ? 'female' : 'male'));
}

function isAvatarUnlocked(av) {
    return !av.unlock || (player.unlockedAvatars || []).includes(av.id);
}

// 解鎖條件是否已達成，以及進度文字（例：「境界達【金丹】（目前 築基）」）
function checkAvatarCondition(unlock) {
    let v = unlock.value;
    switch (unlock.type) {
        case "coins":       return { ok: player.coins >= v, text: `${v.toWan()} 靈石解鎖`, now: `${player.coins.toWan()} 靈石` };
        case "realm":       return { ok: player.realmIndex >= v, text: `境界達【${realms[v]}】`, now: realms[player.realmIndex] };
        case "level":       return { ok: player.level >= v, text: `人物等級 Lv.${v.toWan()}`, now: `Lv.${player.level.toWan()}` };
        case "reputation":  return { ok: (player.reputation || 0) >= v, text: `聲望達 ${v.toWan()}`, now: (player.reputation || 0).toWan() };
        case "tribulation": return { ok: (player.tribulationCount || 0) >= v, text: `累計渡劫成功 ${v} 次`, now: `${player.tribulationCount || 0} 次` };
        default:            return { ok: false, text: "未知條件", now: "" };
    }
}

// 由 ui.js 的 updateUI() 呼叫：達成條件的頭像自動解鎖（只在新解鎖時寫一筆日誌）
function checkAvatarUnlocks() {
    if (!Array.isArray(player.unlockedAvatars)) player.unlockedAvatars = [];
    avatarList.forEach(av => {
        if (!av.unlock || player.unlockedAvatars.includes(av.id)) return;
        if (av.unlock.type === "coins") return;   // 靈石解鎖要玩家自己購買（buyAvatar），不自動解鎖
        if (checkAvatarCondition(av.unlock).ok) {
            player.unlockedAvatars.push(av.id);
            addLog(`🎭 解鎖新頭像【${av.name}】！點洞府左上的頭像即可更換。`, "level-up");
        }
    });
    checkFrameUnlocks();   // 頭像光環
}

function openAvatarModal() {
    checkAvatarUnlocks();
    renderAvatarModal();
    renderFrameList();
    document.getElementById('avatar-modal').style.display = 'flex';
}

function renderAvatarModal() {
    const container = document.getElementById('avatar-list');
    if (!container) return;
    const current = getPlayerAvatar();
    const unlockedCount = avatarList.filter(isAvatarUnlocked).length;
    document.getElementById('avatar-count').innerText = `已解鎖 ${unlockedCount} / ${avatarList.length}`;

    container.innerHTML = avatarList.map(av => {
        let unlocked = isAvatarUnlocked(av);
        let inUse = current && current.id === av.id;
        let buyable = !unlocked && av.unlock.type === "coins";
        let status, action;
        if (inUse) { status = `<span class="avatar-status in-use">使用中</span>`; action = `onclick="selectAvatar('${av.id}')"`; }
        else if (unlocked) { status = `<span class="avatar-status">點擊更換</span>`; action = `onclick="selectAvatar('${av.id}')"`; }
        else if (buyable) {
            let enough = player.coins >= av.unlock.value;
            status = `<span class="avatar-status ${enough ? 'buyable' : 'locked'}">💰 ${av.unlock.value.toWan()} 靈石解鎖${enough ? '' : '<br><small>靈石不足</small>'}</span>`;
            action = `onclick="buyAvatar('${av.id}')"`;
        } else {
            let c = checkAvatarCondition(av.unlock);
            status = `<span class="avatar-status locked">🔒 ${c.text}<br><small>目前：${c.now}</small></span>`;
            action = 'disabled';
        }
        return `
            <button class="avatar-card ${inUse ? 'in-use' : ''} ${unlocked ? '' : 'locked'} ${buyable ? 'buyable' : ''}" ${action}>
                <img src="${av.img}" alt="${av.name}" style="object-position: ${av.pos};">
                <span class="avatar-name">${av.name}</span>
                ${status}
            </button>`;
    }).join("");
}

// 花靈石解鎖頭像（unlock.type === "coins"）：扣款、永久解鎖並立即換上
function buyAvatar(id) {
    let av = avatarList.find(a => a.id === id);
    if (!av || isAvatarUnlocked(av) || !av.unlock || av.unlock.type !== "coins") return;
    let cost = av.unlock.value;
    if (player.coins < cost) {
        alert(`靈石不足！解鎖頭像【${av.name}】需要 ${cost.toWan()} 靈石（目前 ${player.coins.toWan()}）。`);
        return;
    }
    if (!confirm(`確定花費 ${cost.toWan()} 靈石解鎖頭像【${av.name}】嗎？\n解鎖後永久可用，轉世也不會失去。`)) return;

    player.coins -= cost;
    if (!Array.isArray(player.unlockedAvatars)) player.unlockedAvatars = [];
    player.unlockedAvatars.push(av.id);
    addLog(`🎭 花費 ${cost.toWan()} 靈石解鎖頭像【${av.name}】！`, "level-up");
    toastBought(`頭像【${av.name}】`);
    selectAvatar(av.id);   // 解鎖後直接換上（內含重繪、updateUI 與存檔）
}

function selectAvatar(id) {
    let av = avatarList.find(a => a.id === id);
    if (!av || !isAvatarUnlocked(av)) return;
    player.avatarId = id;
    addLog(`🎭 更換頭像為【${av.name}】。`, "system");
    renderAvatarModal();
    renderFrameList();   // 光環預覽用的是目前頭像
    updateUI();
    saveLocal();
}

// ==================== 頭像光環（config-avatar-frames.js）====================
// player.avatarFrameId：目前使用的光環 id（null = 不戴光環）；player.unlockedFrames：已解鎖的光環 id，永久保留

function isFrameUnlocked(fr) {
    return !fr.unlock || (player.unlockedFrames || []).includes(fr.id);
}

// 目前戴著的光環（沒有或未解鎖則 null）
function getPlayerFrame() {
    let fr = avatarFrameList.find(f => f.id === player.avatarFrameId);
    return fr && isFrameUnlocked(fr) ? fr : null;
}

// 達成條件的光環自動解鎖（checkAvatarUnlocks 一併呼叫；coins 類要自己買）
function checkFrameUnlocks() {
    if (!Array.isArray(player.unlockedFrames)) player.unlockedFrames = [];
    avatarFrameList.forEach(fr => {
        if (!fr.unlock || fr.unlock.type === "coins" || player.unlockedFrames.includes(fr.id)) return;
        if (checkAvatarCondition(fr.unlock).ok) {
            player.unlockedFrames.push(fr.id);
            addLog(`💫 解鎖頭像光環【${fr.name}】！點洞府左上的頭像即可配戴。`, "level-up");
        }
    });
}

// 光環疊在頭像上的位置：回傳相對於「頭像方框」的百分比（寬高、left、top），讓框內的洞對準頭像
function getFrameOverlayBox(fr) {
    let size = 100 * AVATAR_FRAME_HOLE_FIT / (2 * fr.ring.r);   // 光環圖的邊長（頭像邊長 = 100）
    return { size, left: 50 - fr.ring.cx * size, top: 50 - fr.ring.cy * size };
}

// 帶光環的頭像 HTML（戰場實況、選擇視窗共用）；外層 .framed-avatar 的寬高決定大小
function renderFramedAvatar(avatar, fr, sizeCss, extraClass) {
    let frameImg = '';
    if (fr) {
        let b = getFrameOverlayBox(fr);
        frameImg = `<img class="fa-frame" src="${fr.img}" alt="" style="width: ${b.size}%; height: ${b.size}%; left: ${b.left}%; top: ${b.top}%;">`;
    }
    return `<span class="framed-avatar${fr ? ' has-frame' : ''}${extraClass ? ' ' + extraClass : ''}" style="width: ${sizeCss}; height: ${sizeCss};">
        <img class="fa-face" src="${avatar.img}" alt="" style="object-position: ${avatar.pos};">${frameImg}</span>`;
}

function renderFrameList() {
    const container = document.getElementById('avatar-frame-list');
    if (!container) return;
    const current = getPlayerFrame();
    const avatar = getPlayerAvatar();
    const count = avatarFrameList.filter(isFrameUnlocked).length;
    document.getElementById('avatar-frame-count').innerText = `已解鎖 ${count} / ${avatarFrameList.length}`;
    let none = `<button class="avatar-card frame-card ${current ? '' : 'in-use'}" onclick="selectFrame(null)">
            ${renderFramedAvatar(avatar, null, '56px')}
            <span class="avatar-name">不戴光環</span>
            <span class="avatar-status${current ? '' : ' in-use'}">${current ? '點擊卸下' : '使用中'}</span>
        </button>`;
    container.innerHTML = none + avatarFrameList.map(fr => {
        let unlocked = isFrameUnlocked(fr);
        let inUse = current && current.id === fr.id;
        let buyable = !unlocked && fr.unlock.type === "coins";
        let status, action;
        if (inUse) { status = `<span class="avatar-status in-use">配戴中</span>`; action = `onclick="selectFrame('${fr.id}')"`; }
        else if (unlocked) { status = `<span class="avatar-status">點擊配戴</span>`; action = `onclick="selectFrame('${fr.id}')"`; }
        else if (buyable) {
            let enough = player.coins >= fr.unlock.value;
            status = `<span class="avatar-status ${enough ? 'buyable' : 'locked'}">💰 ${fr.unlock.value.toWan()} 靈石${enough ? '' : '<br><small>靈石不足</small>'}</span>`;
            action = `onclick="buyFrame('${fr.id}')"`;
        } else {
            let c = checkAvatarCondition(fr.unlock);
            status = `<span class="avatar-status locked">🔒 ${c.text}<br><small>目前：${c.now}</small></span>`;
            action = 'disabled';
        }
        return `
            <button class="avatar-card frame-card ${inUse ? 'in-use' : ''} ${unlocked ? '' : 'locked'} ${buyable ? 'buyable' : ''}" ${action}>
                ${renderFramedAvatar(avatar, fr, '56px')}
                <span class="avatar-name">${fr.name}</span>
                ${status}
            </button>`;
    }).join("");
}

function selectFrame(id) {
    let fr = id ? avatarFrameList.find(f => f.id === id) : null;
    if (id && (!fr || !isFrameUnlocked(fr))) return;
    player.avatarFrameId = fr ? fr.id : null;
    addLog(fr ? `💫 配戴頭像光環【${fr.name}】。` : `💫 卸下頭像光環。`, "system");
    renderFrameList();
    updateUI();
    saveLocal();
}

function buyFrame(id) {
    let fr = avatarFrameList.find(f => f.id === id);
    if (!fr || isFrameUnlocked(fr) || !fr.unlock || fr.unlock.type !== "coins") return;
    let cost = fr.unlock.value;
    if (player.coins < cost) {
        alert(`靈石不足！解鎖頭像光環【${fr.name}】需要 ${cost.toWan()} 靈石（目前 ${player.coins.toWan()}）。`);
        return;
    }
    if (!confirm(`確定花費 ${cost.toWan()} 靈石解鎖頭像光環【${fr.name}】嗎？\n解鎖後永久可用，轉世也不會失去。`)) return;
    player.coins -= cost;
    if (!Array.isArray(player.unlockedFrames)) player.unlockedFrames = [];
    player.unlockedFrames.push(fr.id);
    addLog(`💫 花費 ${cost.toWan()} 靈石解鎖頭像光環【${fr.name}】！`, "level-up");
    toastBought(`頭像光環【${fr.name}】`);
    selectFrame(fr.id);
}
