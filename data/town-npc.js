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
    const scene = townScenes[sceneName];
    for (const npc of (scene && scene.hiddenNpcs) || []) {
        if (isTownNpcDoneToday(npc.id) || Math.random() >= npc.chance) continue;
        townNpcSpots[sceneName] = { npc, spot: npc.spots[Math.floor(Math.random() * npc.spots.length)] };
        return;
    }
}

// 目前要多畫的人偶（town.js 的 renderTownHotspots 併進 figures）；只畫在主圖上（hiddenNpcs 的座標是主圖像素）
function getTownNpcFigures(sceneName, view) {
    const hit = townNpcSpots[sceneName];
    if (!hit || view !== townScenes[sceneName]) return [];
    return [{ id: 'npc-' + hit.npc.id, name: hit.npc.name, img: hit.spot.img, rect: hit.spot.rect, cls: 'town-npc', action: `talkToTownNpc('${sceneName}')` }];
}

// 從畫面上拿掉（處理完畢）
function removeTownNpc(sceneName) {
    delete townNpcSpots[sceneName];
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
