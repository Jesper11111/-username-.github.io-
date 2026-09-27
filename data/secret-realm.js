// 秘境入口（ARCHITECTURE.md 第 43 節）：活動「🌀 秘境」→ 秘境列表 → 全螢幕秘境場景（海報）→ 入塔挑戰
// 資料在 config-secret-realms.js；目前各秘境玩法尚未實作（implemented: false），挑戰視窗只顯示預定玩法與獎勵

let currentSecretRealm = null;

function getSecretRealm(id) {
    return secretRealmList.find(r => r.id === id) || null;
}

// ---- 每日次數：每個秘境各自 SECRET_REALM_DAILY_ATTEMPTS 次（存檔 player.secretRealmDaily = { date, used: { 秘境id: 次數 } }）----
function getSecretRealmDaily() {
    const today = new Date().toDateString();
    if (!player.secretRealmDaily || player.secretRealmDaily.date !== today) player.secretRealmDaily = { date: today, used: {} };
    return player.secretRealmDaily;
}
function getSecretRealmAttemptsLeft(id) {
    return Math.max(0, SECRET_REALM_DAILY_ATTEMPTS - (getSecretRealmDaily().used[id] || 0));
}
// 開始挑戰時呼叫：還有次數就扣 1 並回傳 true
function useSecretRealmAttempt(id) {
    if (getSecretRealmAttemptsLeft(id) <= 0) return false;
    const d = getSecretRealmDaily();
    d.used[id] = (d.used[id] || 0) + 1;
    return true;
}
// 場景按鈕文字：「⚔️ 死守天南城（今日 2/3）」
function refreshSecretRealmEnterLabel() {
    const r = currentSecretRealm;
    if (!r) return;
    const left = getSecretRealmAttemptsLeft(r.id);
    const enter = document.getElementById('secret-realm-enter');
    enter.textContent = `${r.enterLabel || '⚔️ 入塔挑戰'}${r.implemented ? `（今日 ${left}/${SECRET_REALM_DAILY_ATTEMPTS}）` : ''}`;
}

// 活動選單的 openFn（config-activities.js）
function openSecretRealmModal() {
    renderSecretRealmList();
    document.getElementById('secret-realm-modal').style.display = 'flex';
}

function renderSecretRealmList() {
    const box = document.getElementById('secret-realm-list');
    if (!box) return;
    box.innerHTML = secretRealmList.map(r => {
        const locked = player.realmIndex < r.minRealmIndex;
        return `
            <button class="secret-card${locked ? ' locked' : ''}" onclick="openSecretRealmScene('${r.id}')">
                <img src="${r.img}" alt="">
                <span class="secret-card-info">
                    <b>${r.name}</b>
                    <small>${locked ? `🔒 需【${realms[r.minRealmIndex]}】以上` : r.implemented ? `可挑戰・今日 ${getSecretRealmAttemptsLeft(r.id)}/${SECRET_REALM_DAILY_ATTEMPTS}` : '🚧 即將開放'}</small>
                </span>
            </button>`;
    }).join("");
}

function openSecretRealmScene(id) {
    const r = getSecretRealm(id);
    if (!r) return;
    if (player.realmIndex < r.minRealmIndex) {
        alert(`【${r.name}】需境界【${realms[r.minRealmIndex]}】以上才能進入。`);
        return;
    }
    currentSecretRealm = r;
    const scene = document.getElementById('secret-realm-scene');
    // 橫向螢幕且有 PC 版海報就用 PC 版；海報比例寫進 --pw／--ph（CSS 依此計算海報大小）
    const pc = r.imgPc && window.innerWidth > window.innerHeight;
    const [pw, ph] = (pc ? r.sizePc : r.size) || [768, 1365];
    scene.style.setProperty('--pw', pw);
    scene.style.setProperty('--ph', ph);
    scene.querySelectorAll('img').forEach(img => { img.src = pc ? r.imgPc : r.img; });
    const title = document.getElementById('secret-realm-title');
    title.classList.toggle('on', !!r.sceneTitle);
    title.querySelector('b').textContent = r.sceneTitle || '';
    title.querySelector('span').textContent = r.sceneSub || '';
    title.querySelector('span').style.display = r.sceneSub ? '' : 'none';
    const enter = document.getElementById('secret-realm-enter');
    refreshSecretRealmEnterLabel();
    enter.classList.toggle('bottom', r.enterPos === 'bottom');
    enter.setAttribute('aria-label', `${r.name}（${r.enterLabel ? r.enterLabel.replace(/^\S+\s/, '') : '入塔挑戰'}）`);
    closeModal('secret-realm-modal');
    scene.style.display = 'block';
}

function closeSecretRealmScene() {
    document.getElementById('secret-realm-scene').style.display = 'none';
    closeModal('secret-realm-info-modal');
    currentSecretRealm = null;
    openSecretRealmModal();   // 回到秘境列表
}

// 場景中的「入塔挑戰」：玩法實作前顯示預定內容
function challengeSecretRealm() {
    const r = currentSecretRealm;
    if (!r) return;
    if (r.mode === 'defense') {   // 魔屠天南：直接進入守城（defense.js）；次數在守城真正開始時才扣
        if (getSecretRealmAttemptsLeft(r.id) <= 0) { alert(`【${r.name}】今日 ${SECRET_REALM_DAILY_ATTEMPTS} 次挑戰已用完，明日再來。`); return; }
        openDefenseBattle(r.id);
        return;
    }
    if (r.mode === 'tower') {     // 鎮魔塔：進塔廳（zhenmo.js）；次數在「有 BOSS 的樓層」開始問答時才扣
        openZhenmoTower();
        return;
    }
    document.getElementById('secret-realm-info-title').innerText = `🗼 ${r.name}`;
    document.getElementById('secret-realm-info-body').innerHTML = `
        <p style="color: #fca5a5; text-align: center; margin: 0 0 10px;">「${r.tagline}」</p>
        <p style="color: #d1d5db; font-size: 0.9em; line-height: 1.7;">${r.desc}</p>
        <div class="panel-title" style="margin-top: 12px;">塔中機緣</div>
        ${r.rewards.map(x => `<div class="secret-reward">${x.icon} ${x.text}</div>`).join("")}
        <p style="color: #9ca3af; font-size: 0.82em; margin-top: 10px;">每日可挑戰 ${SECRET_REALM_DAILY_ATTEMPTS} 次（失敗也計入）。</p>
        <p style="color: #facc15; text-align: center; font-weight: bold; margin-bottom: 0;">
            ${r.implemented ? '' : '🚧 塔門封印未解，秘境即將開放，敬請期待！'}</p>`;
    document.getElementById('secret-realm-info-modal').style.display = 'flex';
}
