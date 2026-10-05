// 城內隱藏 NPC（ARCHITECTURE.md 第 20 節）：設定在 config-towns.js 的 hiddenNpcs
// 每次進城（openTownScene）依 chance 擲骰，出現就從 spots 隨機挑一處，畫成可點的場景人偶（town.js 的 renderTownHotspots）；
// 當天處理過（吃了或打過）就不再出現，紀錄在 player.townNpc = { NPC id: 日期 }。
// 目前只有天南市集的香腸大師・奧斯卡（2026-10-01 使用者要求）。

let townNpcSpots = {};   // { 城名: { npc, spot } }：本次進城擲出的結果（轉向重畫時沿用；沒出現就沒有這個 key）
let townNpcDuelTimers = [];     // 決鬥演出的計時器（關閉時全部取消）
let townNpcDuelPlace = null;    // 在哪個城內場景發生的決鬥（離開時關掉該場景）
let townNpcAskAt = 0;           // 問「要不要吃」的時間（防連點誤選）
const TOWN_NPC_CHOICE_GUARD_MS = 400;
let townNpcAutoTimer = null;    // 「吃」按鈕 eatWindowMs 後消失、自動選「不吃」的計時器
let townNpcAsking = null;       // 正在問「吃不吃」的城名（還沒選）；關掉對話框時用來判斷要不要強制開打

function isTownNpcDoneToday(id) {
    return !!(player.townNpc && player.townNpc[id] === todayKey());
}
function markTownNpcDone(id) {
    if (!player.townNpc || typeof player.townNpc !== 'object') player.townNpc = {};
    player.townNpc[id] = todayKey();
}

// 被打爆後的禁入（penalty.banMinutes）：player.townBan = { 城名: 解禁時間戳 }；回傳剩幾分鐘（0 = 可以進）
// map.js 的 goToTown 在傳送前檢查，進不去就提示、不傳送
function getTownBanLeftMin(name) {
    const until = player.townBan && player.townBan[name];
    const left = until ? until - Date.now() : 0;
    return left > 0 ? Math.ceil(left / 60000) : 0;
}

// ---- 定時出現的場景人偶（config-towns.js figures 的 schedule: { everyHours, stayMinutes }）----
// 例：天星城賭坊前的大主宰・牧塵（2026-10-01 使用者指定「2 天出現一次，出現後停留 30 分鐘；相逢即是有緣，贈 20 碎片」）
// 紀錄 player.townFigureSched[id] = { shownAt 這次出現的時間, nextAt 下次可以出現的時間, gift 這次出現是否已送過 }
// 「出現」＝到了 nextAt 之後玩家第一次進城：從那一刻起停留 stayMinutes，下次要等 everyHours 之後
function getFigureSched(id) {
    if (!player.townFigureSched || typeof player.townFigureSched !== 'object') player.townFigureSched = {};
    if (!player.townFigureSched[id]) player.townFigureSched[id] = { shownAt: 0, nextAt: 0, gift: false };
    return player.townFigureSched[id];
}
function getScheduledFigureLeftMs(f) {
    const s = getFigureSched(f.id);
    return Math.max(0, s.shownAt + f.schedule.stayMinutes * 60000 - Date.now());
}
// town.js 的 rollTownFigures 呼叫：這次進城他在不在（到時間就開始新的一次停留）
function isScheduledFigureHere(f) {
    const s = getFigureSched(f.id), now = Date.now();
    if (s.shownAt && getScheduledFigureLeftMs(f) > 0) return true;
    if (now >= (s.nextAt || 0)) {
        s.shownAt = now;
        s.nextAt = now + f.schedule.everyHours * 3600000;
        s.gift = false;
        addLog(`✨ ${f.name}出現在${townScenes[currentTownScene] ? townScenes[currentTownScene].title : '城中'}，只停留 ${f.schedule.stayMinutes} 分鐘。`, "system");
        return true;
    }
    return false;
}
// 點定時人偶：每次出現第一次點送碎片（已結識改加好感），之後只打招呼；停留時間過了就提示他已離開
function talkToScheduledFigure(id) {
    const scene = townScenes[currentTownScene];
    if (!scene) return;
    const f = [...(scene.figures || []), ...((scene.portrait && scene.portrait.figures) || [])].find(x => x.id === id && x.schedule);
    if (!f) return;
    const p = partnerById[f.partnerId];
    const left = getScheduledFigureLeftMs(f);
    if (!p || left <= 0) {
        showToast(`${f.name}已經離開了……`);
        rollTownFigures(scene);
        if (currentTownView) renderTownHotspots(currentTownView);
        return;
    }
    const s = getFigureSched(id), mins = Math.ceil(left / 60000);
    // 對話框上方加立繪（f.portraitImg）
    const withPortrait = () => {
        if (!f.portraitImg) return;
        document.getElementById('partner-dialog-body').insertAdjacentHTML('afterbegin', `<img class="partner-portrait" src="${f.portraitImg}" alt="${f.name}">`);
    };
    if (s.gift) { showPartnerDialog(p, f.linesAgain || f.lines, `（他還會在這裡停留約 ${mins} 分鐘）`); withPortrait(); return; }
    s.gift = true;
    let note;
    if (!isPartnerMet(p.id)) {
        addPartnerShards(p, f.gift, `在${scene.title}偶遇${p.title}・${p.name}，相逢即是有緣`);
        note = `🧩 獲贈【${p.title}・${p.name}】碎片 ×${f.gift}（${Math.min(getPartnerShards(p.id), getPartnerShardsNeed(p))}/${getPartnerShardsNeed(p)}）`;
    } else {
        const add = addBond(p.id, f.gift, `在${scene.title}偶遇${p.name}`);
        note = add > 0 ? `💗 好感 +${add}` : '💗 好感已滿';
    }
    showPartnerDialog(p, f.lines, note);
    withPortrait();
    saveLocal();
    updateUI();
}

// 進城時擲骰（town.js 的 openTownScene 呼叫）
function rollTownNpcs(sceneName) {
    delete townNpcSpots[sceneName];
    stopTownNpcClock();
    const scene = townScenes[sceneName];
    const list = ((scene && scene.hiddenNpcs) || []).filter(npc => npc.enabled !== false);   // 暫時隱藏（config-towns.js 的 enabled: false）
    for (const npc of list) if (trySpawnTownNpc(sceneName, npc)) return;
    // 有定時出現的 NPC（window）：待在城裡時每 30 秒檢查一次，時段一到就現身
    if (list.some(npc => npc.window)) townNpcClock = setInterval(() => {
        if (typeof currentTownScene === 'undefined' || currentTownScene !== sceneName) { stopTownNpcClock(); return; }
        if (townNpcSpots[sceneName]) return;
        for (const npc of list) if (npc.window && trySpawnTownNpc(sceneName, npc)) {
            if (currentTownView) renderTownHotspots(currentTownView);
            setTimeout(() => startNpcWhispers(sceneName), 0);
            return;
        }
    }, 30000);
}
let townNpcClock = null, townNpcHideTimer = null;
function stopTownNpcClock() { clearInterval(townNpcClock); townNpcClock = null; clearTimeout(townNpcHideTimer); townNpcHideTimer = null; }
// 當日（日曆日）線上野外擊殺數：combat.js 每波擊殺後、save.js 背景補發（切 App、鎖螢幕；關掉遊戲的離線不算）時呼叫 addTodayFieldKills；存 player.dayKills = { date, n }（用到才建立）
function getTodayFieldKills() { const d = player.dayKills; return d && d.date === todayKey() ? (d.n || 0) : 0; }
function addTodayFieldKills(n) {
    if (!(n > 0)) return;
    const t = todayKey();
    if (!player.dayKills || player.dayKills.date !== t) player.dayKills = { date: t, n: 0 };
    player.dayKills.n += n;
}
// 定時出現（npc.window = { everyMin, showMin }）：目前在不在出現時段；在＝回傳 { key: 這個時段的代號, leftMs: 還剩多久 }
function getTownNpcWindow(w, now) {
    const d = new Date(now || gameNow());   // 伺服器校正後的時間（timeguard.js），調裝置時鐘叫不出仙翁
    const m = d.getHours() * 60 + d.getMinutes(), pos = m % w.everyMin;
    if (pos >= w.showMin) return null;
    return { key: todayKey() + '#' + Math.floor(m / w.everyMin), leftMs: (w.showMin - pos) * 60000 - d.getSeconds() * 1000 - d.getMilliseconds() };
}
// 判斷一位隱藏 NPC 這次會不會出現；出現就放進 townNpcSpots 並回傳 true
function trySpawnTownNpc(sceneName, npc) {
    if (npc.minCha && getTotalCharm() < npc.minCha) return false;   // 魅力門檻（本身含丹藥＋裝備）
    if (npc.minKillsToday && getTodayFieldKills() < npc.minKillsToday) return false;   // 當日線上擊殺門檻
    if (isTownNpcDoneToday(npc.id)) return false;
    let win = null;
    if (npc.window) {
        win = getTownNpcWindow(npc.window);
        if (!win) return false;
        // 一天只出現一次：今天已經在別的時段出現過就不再出現（同一個時段內離開再回來還在）
        const seen = player.townNpcSeen && player.townNpcSeen[npc.id];
        if (seen && seen.split('#')[0] === todayKey() && seen !== win.key) return false;
    }
    if (Math.random() >= npc.chance) return false;
    const hit = townNpcSpots[sceneName] = { npc, spot: npc.spots[Math.floor(Math.random() * npc.spots.length)] };
    if (win) {
        // 「今天見過」要等真的見到才算（2026-10-05 修正：原本一出現就記，時段尾段才到島上的玩家低語還沒聽完仙翁就消失，當天也不會再出現）：
        //   有低語門檻（unlockAfterAll）的，聽完低語、可以對話時才記（startNpcWhispers）；同一時段已聽完的，離島再回來直接可以對話
        hit.winKey = win.key;
        const W = npc.whispers;
        if (W && W.unlockAfterAll) { if (player.townNpcSeen && player.townNpcSeen[npc.id] === win.key) hit.heardAll = true; }
        else markTownNpcSeen(npc.id, win.key);
        clearTimeout(townNpcHideTimer);
        townNpcHideTimer = setTimeout(() => hideWindowTownNpc(sceneName, npc), win.leftMs);   // 時段結束就隱藏
    }
    if (npc.whispers) setTimeout(() => startNpcWhispers(sceneName), 0);   // 仙翁低語（openTownScene 之後才啟動）
    return true;
}
function markTownNpcSeen(id, key) {
    if (!player.townNpcSeen || typeof player.townNpcSeen !== 'object') player.townNpcSeen = {};
    player.townNpcSeen[id] = key;
}
// 定時 NPC 的時段結束：從畫面上消失（正在對話就關掉對話框；小遊戲玩到一半可以玩完，只是不會再回到對話）
function hideWindowTownNpc(sceneName, npc) {
    const hit = townNpcSpots[sceneName];
    if (!hit || hit.npc !== npc) return;
    const modal = document.getElementById('xianweng-modal');
    if (modal && modal.style.display === 'flex' && modal.dataset.scene === sceneName) modal.style.display = 'none';
    removeTownNpc(sceneName);
    if (currentTownScene === sceneName) showToast(`🍃 ${(npc.lines && npc.lines.bye) || '仙翁飄然而去'}`);
}

// 隱藏 NPC 在這張圖上的位置：主圖用擲到的 spot；手機直式圖（scene.portrait）用 npc.portraitSpot（沒有就不畫）
function getTownNpcSpot(hit, sceneName, view) {
    const scene = townScenes[sceneName];
    if (view === scene) return hit.spot;
    if (scene && view === scene.portrait) return hit.npc.portraitSpot || null;
    return null;
}
function isTownPortraitView(sceneName, view) { const s = townScenes[sceneName]; return !!(s && s.portrait && view === s.portrait); }
// 目前要多畫的人偶（town.js 的 renderTownHotspots 併進 figures）；主圖用 spots、直式圖用 portraitSpot
function getTownNpcFigures(sceneName, view) {
    const hit = townNpcSpots[sceneName], spot = hit && getTownNpcSpot(hit, sceneName, view);
    if (!spot) return [];
    // 函式名寫成字串字面值：建置（tools/build.js）才會把它們掛回 window（點人偶的 onclick 要用）
    const fn = hit.npc.kind === 'xianweng' ? 'talkToXianweng' : 'talkToTownNpc';
    // 仙翁：低語還沒聽完（whispers.unlockAfterAll）不能點；聽完加 awake（淡淡光暈提示可以點了）
    const locked = hit.npc.whispers && hit.npc.whispers.unlockAfterAll && !hit.heardAll;
    return [{ id: 'npc-' + hit.npc.id, name: locked ? '' : hit.npc.name, img: spot.img, rect: spot.rect, cls: 'town-npc' + (locked ? '' : hit.npc.whispers ? ' awake' : ''),
        action: locked ? '' : `${fn}('${sceneName}')` }];
}

// NPC 的場景演出（例：隱藏仙翁垂釣＝竿、釣線、水面漣漪）：畫在人偶底下、不擋點擊；npc 沒有 fishing 就不畫
// 低語（config-towns.js 的 whispers）：仙翁在場時頭頂偶爾浮出淡色小字、慢慢上飄消散；畫在 #town-chatter 層（與路人閒聊共用，不擋點擊）
let npcWhisperTimer = null, npcWhisperLast = -1;
function stopNpcWhispers() { clearTimeout(npcWhisperTimer); npcWhisperTimer = null; }
function startNpcWhispers(sceneName) {
    stopNpcWhispers();
    const hit = townNpcSpots[sceneName], W = hit && hit.npc.whispers;
    if (!W || !W.lines || !W.lines.length) return;
    hit.whisperIdx = 0;
    const tick = () => {
        if (currentTownScene !== sceneName || townNpcSpots[sceneName] !== hit) return;   // 離開或仙翁已消失
        showNpcWhisper(W, W.inOrder ? hit.whisperIdx % W.lines.length : null);
        hit.whisperIdx++;
        // 依序說完最後一句：解鎖對話（等最後一句飄完再亮起，重畫人偶讓它可以點）
        if (W.unlockAfterAll && !hit.heardAll && hit.whisperIdx >= W.lines.length) {
            setTimeout(() => {
                if (currentTownScene !== sceneName || townNpcSpots[sceneName] !== hit) return;
                hit.heardAll = true;
                if (hit.winKey) markTownNpcSeen(hit.npc.id, hit.winKey);   // 聽完低語＝今天見過（一天只出現一次從這裡算）
                if (currentTownView) renderTownHotspots(currentTownView);
            }, W.showMs || 6000);
        }
        npcWhisperTimer = setTimeout(tick, W.everyMs || 15000);
    };
    npcWhisperTimer = setTimeout(tick, W.firstMs != null ? W.firstMs : (W.everyMs || 15000));
}
function showNpcWhisper(W, idx) {
    const stage = document.getElementById('town-scene-stage');
    if (!stage || !currentTownView) return;
    let box = document.getElementById('town-chatter');
    if (!box) { box = document.createElement('div'); box.id = 'town-chatter'; stage.appendChild(box); }
    let i = idx != null ? idx : Math.floor(Math.random() * W.lines.length);   // inOrder：依序；否則隨機不連續重複
    if (idx == null && W.lines.length > 1 && i === npcWhisperLast) i = (i + 1) % W.lines.length;
    npcWhisperLast = i;
    const el = document.createElement('div');
    el.className = 'npc-whisper';
    const at = isTownPortraitView(currentTownScene, currentTownView) ? W.portraitAt : W.at;   // 手機直式圖用 portraitAt
    if (!at) return;
    el.style.left = (at[0] / currentTownView.imgW * 100).toFixed(3) + '%';
    el.style.top = (at[1] / currentTownView.imgH * 100).toFixed(3) + '%';
    el.style.animationDuration = ((W.showMs || 6000) / 1000) + 's';
    el.textContent = W.lines[i];
    box.querySelectorAll('.npc-whisper').forEach(e => e.remove());
    box.appendChild(el);
    setTimeout(() => el.remove(), W.showMs || 6000);
}

function getTownNpcEffects(sceneName, view) {
    const hit = townNpcSpots[sceneName];
    if (!hit || !getTownNpcSpot(hit, sceneName, view)) return '';
    const F = isTownPortraitView(sceneName, view) ? hit.npc.portraitFishing : hit.npc.fishing;
    if (!F) return '';
    const W = view.imgW, H = view.imgH, [hx, hy] = F.hand, [tx, ty] = F.tip, [kx, ky] = F.hook;
    const pos = (x, y) => `left: ${(x / W * 100).toFixed(3)}%; top: ${(y / H * 100).toFixed(3)}%;`;
    return `<svg class="tnpc-fishing" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <line x1="${hx}" y1="${hy}" x2="${tx}" y2="${ty}" class="rod"/>
            <path d="M${tx} ${ty} Q ${tx - 4} ${(ty + ky) / 2} ${kx} ${ky}" class="line"/></svg>
        <div class="tnpc-ripple" style="${pos(kx, ky)}" aria-hidden="true"><i></i><i></i><i></i></div>`;
}

// 從畫面上拿掉（處理完畢）
function removeTownNpc(sceneName) {
    delete townNpcSpots[sceneName];
    stopNpcWhispers();
    document.querySelectorAll('#town-chatter .npc-whisper').forEach(e => e.remove());
    if (currentTownScene === sceneName && currentTownView) renderTownHotspots(currentTownView);
}

// 被玩家發現：問要不要吃大香腸
function talkToTownNpc(sceneName) {
    const hit = townNpcSpots[sceneName];
    if (!hit) return;
    const p = partnerById[hit.npc.partnerId];
    if (!p) return;
    const npc = hit.npc;
    townNpcAskAt = Date.now();
    townNpcAsking = sceneName;
    showPartnerDialog(p, [npc.lines.ask], '', null, [
        { label: '🌭 吃', action: `answerTownNpc('${sceneName}', true)` },
        { label: '不吃', action: `answerTownNpc('${sceneName}', false)` }
    ]);
    // 旁白（不加「」）＋「吃」按鈕刻意縮小，eatWindowMs 後消失、自動當成「不吃」進入戰鬥（2026-10-01 使用者指定）
    document.getElementById('partner-dialog-body').insertAdjacentHTML('beforeend',
        (npc.lines.tease || []).map((l, i) => `<p class="town-npc-tease${i === 1 ? ' shock' : ''}">${l}</p>`).join(''));   // 第二行（黑色的香腸！）放大紅字
    const box = document.querySelector('#partner-dialog-actions .partner-choices');
    if (!box || !(npc.eatWindowMs > 0)) return;
    box.classList.add('town-npc-choices');
    const [eatBtn, noBtn] = box.querySelectorAll('button');
    eatBtn.classList.add('town-npc-eat');
    clearTimeout(townNpcAutoTimer);
    const stillAsking = () => townNpcAsking === sceneName && townNpcSpots[sceneName];
    townNpcAutoTimer = setTimeout(() => {
        if (!stillAsking()) return;   // 已經選了（關掉對話框也算選了「不吃」，見 onTownNpcDialogClosed）
        eatBtn.classList.add('gone');
        noBtn.classList.add('picked');
        townNpcAutoTimer = setTimeout(() => { if (stillAsking()) answerTownNpc(sceneName, false); }, 500);
    }, npc.eatWindowMs);
}

// 問句對話框被關掉（點背景；partner.js 的 closePartnerDialog 呼叫）＝逃不掉，直接當成「不吃」開打（2026-10-01 使用者指定）
function onTownNpcDialogClosed() {
    if (!townNpcAsking) return;
    townNpcAskAt = 0;   // 跳過防連點
    answerTownNpc(townNpcAsking, false);
}

function answerTownNpc(sceneName, eat) {
    // 「不吃」按鈕剛好跳在人偶的位置：連點（手機雙擊）時第二下會直接選到，對話框出現後 TOWN_NPC_CHOICE_GUARD_MS 內不理會
    if (Date.now() - townNpcAskAt < TOWN_NPC_CHOICE_GUARD_MS) return;
    clearTimeout(townNpcAutoTimer);
    townNpcAsking = null;
    const hit = townNpcSpots[sceneName];
    if (!hit) { closeModal('partner-dialog-modal'); return; }
    const npc = hit.npc, p = partnerById[npc.partnerId];
    closeModal('partner-dialog-modal');
    markTownNpcDone(npc.id);
    removeTownNpc(sceneName);
    if (eat) {
        // 見面禮：還沒結識給碎片（集滿到情緣視窗激活），已結識改加好感
        if (!isPartnerMet(p.id)) {
            addPartnerShards(p, npc.gift, `在${npc.place}吃了${p.name}的大香腸`);
            const have = Math.min(getPartnerShards(p.id), getPartnerShardsNeed(p));
            showPartnerDialog(p, npc.lines.eat, `🧩 見面禮：【${p.title}・${p.name}】碎片 ×${npc.gift}（${have}/${getPartnerShardsNeed(p)}）`);
        } else {
            const add = addBond(p.id, npc.gift, `吃了${p.name}的大香腸`);
            showPartnerDialog(p, npc.lines.eatAgain, add > 0 ? `💗 好感 +${add}` : '💗 好感已滿');
        }
        saveLocal();
        updateUI();
        return;
    }
    startTownNpcDuel(sceneName, npc, p);
}

// 不吃 → 決鬥：跳出戰鬥畫面 #town-duel（海報＝npc.duelImg，2026-10-01 使用者提供，圖上已有台詞）。
// NPC 戰力＝玩家目前戰力 × duelMult，必敗。結果一開始就套用（中途重新整理也一樣），演出依時間軸逐步顯示，最後按鈕＝被轟出市集
function startTownNpcDuel(sceneName, npc, p) {
    const myPow = Math.max(1, NUMERIC_V2 ? nv2CombatPower() : getPhysAttack());
    const hitDmg = getMaxHp() * npc.duelMult;
    player.hp = 1;   // 打爆：氣血剩 1（不算戰死，不折壽）
    // 小懲罰：被收走一點靈石（香腸錢）＋一段時間進不了這個城
    const pen = npc.penalty || {};
    const lost = Math.floor((player.coins || 0) * (pen.coinPct || 0));
    if (lost > 0) player.coins -= lost;
    if (pen.banMinutes > 0) {
        if (!player.townBan || typeof player.townBan !== 'object') player.townBan = {};
        player.townBan[sceneName] = Date.now() + pen.banMinutes * 60000;
    }
    const penText = [lost > 0 ? `被收走香腸錢 ${lost.toWan()} 靈石` : '', pen.banMinutes > 0 ? `${pen.banMinutes} 分鐘內沒臉回${npc.place}` : ''].filter(Boolean).join('，');
    addLog(`⚔️ 你拒絕了${p.name}的大香腸，被他發起決鬥——${p.name}戰力是你的 ${npc.duelMult} 倍，你被打爆了（氣血剩 1${penText ? '，' + penText : ''}）。`, "combat", true);
    saveLocal();
    updateUI();

    const $ = id => document.getElementById(id);
    const box = $('town-duel'), stage = $('town-duel-stage'), flash = stage.querySelector('.td-flash'), log = $('td-log');
    $('town-duel-img').src = npc.duelImg;
    $('town-duel-bg').style.backgroundImage = `url('${npc.duelImg}')`;
    $('td-name-me').innerText = player.name || '你';
    $('td-name-foe').innerText = `${p.title}・${p.name}`;
    $('td-pow-me').innerHTML = '戰力 ？';
    $('td-pow-foe').innerHTML = '戰力 ？';
    $('td-hp-me').style.width = $('td-hp-foe').style.width = '100%';
    $('td-stamp').classList.remove('on');
    $('td-leave').style.display = 'none';
    $('td-leave').innerText = `↩ 被轟出${npc.place}`;
    townNpcDuelPlace = sceneName;
    log.innerHTML = '';
    box.classList.remove('on');
    box.style.display = 'block';
    void box.offsetWidth;
    box.classList.add('on');

    const line = (html, cls) => { log.insertAdjacentHTML('beforeend', `<p${cls ? ` class="${cls}"` : ''}>${html}</p>`); while (log.children.length > 2) log.removeChild(log.firstChild); };
    const fx = (kind) => { flash.className = 'td-flash'; stage.classList.remove('shake'); void stage.offsetWidth; flash.classList.add(kind); if (kind === 'big') stage.classList.add('shake'); };
    const timeline = [
        [300,  () => line(`⚔️ ${p.title}・${p.name}向你發起決鬥！`)],
        [1300, () => { $('td-pow-me').innerHTML = `戰力 ${fmtCombat(myPow)}`; $('td-pow-foe').innerHTML = `戰力 <b>${fmtCombat(myPow * npc.duelMult)}</b>（×${npc.duelMult}）`;
                       line(`📊 對方戰力是你的 <b style="color:#f87171">${npc.duelMult} 倍</b>！`); }],
        [2400, () => { fx('small'); $('td-hp-foe').style.width = (100 - 100 / npc.duelMult / 20) + '%';
                       line(`🗡️ 你搶先出手，造成 ${fmtCombat(myPow)} 點傷害……${p.name}拍了拍衣服上的灰。`); }],
        [3600, () => line(`「${npc.lines.shout}」`, 'shout')],
        [4300, () => { fx('big'); $('td-hp-me').style.width = '0.5%';
                       line(`💥 一根巨大的香腸迎面噴來，造成 ${fmtCombat(hitDmg)} 點傷害！`, 'hit'); }],
        [5300, () => { $('td-stamp').classList.add('on');
                       line(`😵 你被打爆了，滿臉都是香腸油……（氣血剩 1）`, 'hit');
                       if (penText) line(`💸 ${penText}！`, 'hit');
                       $('td-leave').style.display = 'block'; }]
    ];
    townNpcDuelTimers.forEach(clearTimeout);
    townNpcDuelTimers = timeline.map(([ms, fn]) => setTimeout(fn, ms));
}

// 離開決鬥畫面＝被轟出市集（城內畫面一併關掉，回到洞府）
function closeTownNpcDuel() {
    townNpcDuelTimers.forEach(clearTimeout);
    townNpcDuelTimers = [];
    const box = document.getElementById('town-duel');
    box.classList.remove('on');
    box.style.display = 'none';
    if (townNpcDuelPlace && currentTownScene === townNpcDuelPlace) closeTownScene();
    townNpcDuelPlace = null;
    updateUI();
}

// ---- 青瀾島（config-towns.js 的 townScenes["青瀾島"]，2026-10-04）----
function getTotalCharm() { return (player.stats.cha || 0) + (getEquipBonus().cha || 0); }   // 本身＋裝備（同 numeric.js 的 cha）
// 碼頭小船：唯一出口，先問是否離開
async function leaveQinglanIsland() {
    if (!(await gameConfirm('⛵ 是否搭船離開青瀾島？'))) return;
    openTownScene(WORLD_SCENE_KEY);
}
// 隱藏仙翁：出現條件見 config-towns.js（魅力 5000、當日線上擊殺 1000、每小時前 20 分鐘、一天一次）；對話三選一（兩個小遊戲在 xianweng-games.js、告辭＝當天不再出現）
function talkToXianweng(sceneName) {
    const hit = townNpcSpots[sceneName];
    if (!hit) return;
    const L = hit.npc.lines || {};
    document.getElementById('xianweng-img').src = hit.npc.portrait || hit.spot.img;
    document.getElementById('xianweng-text').innerText = `「${L.greet || ''}」`;
    document.getElementById('xianweng-fish-n').innerText = `今日剩 ${xianwengFishLeft()} 竿`;
    document.getElementById('xianweng-chess-n').innerText = `今日剩 ${xianwengChessLeft()} 盤`;
    document.getElementById('xianweng-modal').dataset.scene = sceneName;
    document.getElementById('xianweng-modal').style.display = 'flex';
}
function xianwengChoose(kind) {
    const modal = document.getElementById('xianweng-modal');
    const sceneName = modal.dataset.scene, hit = townNpcSpots[sceneName];
    modal.style.display = 'none';
    if (!hit) return;
    const L = hit.npc.lines || {};
    // 兩個小遊戲（xianweng-games.js）：仙翁留在原地（不算見過），玩完回到這個對話；每天各 3 次
    if (kind === 'fishing') {
        if (xianwengFishLeft() <= 0) { gameDialog('🎣 仙翁釣魚\n\n仙翁收著釣竿：「今日的魚已經釣夠了，明日再來吧。」', false).then(() => talkToXianweng(sceneName)); return; }
        playXianwengIntro(() => openXianwengFishing(sceneName));   // 先播開場動畫（可略過）
        return;
    }
    if (kind === 'gomoku') {
        if (xianwengChessLeft() <= 0) { gameDialog('♟️ 玲瓏棋局\n\n仙翁搖頭：「今日已對弈三盤，明日再來吧。」', false).then(() => talkToXianweng(sceneName)); return; }
        openXianwengGomoku(sceneName);
        return;
    }
    // 告辭：仙翁飄然而去，當天不再出現
    markTownNpcDone(hit.npc.id);
    removeTownNpc(sceneName);
    showToast(`🍃 ${L.bye || '仙翁飄然而去'}`);
}
