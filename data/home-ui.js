// 洞府主畫面（ARCHITECTURE.md 第 31、34 節）
// 手機版背景圖 images/home-bg.jpg、PC 版 images/home-bg-pc.jpg，圖上已畫好頭像框、名字框、資源框、按鈕與導覽；
// 這裡負責：舞台縮放與手機／PC 切換、PC 版按鈕產生、HUD 數值、分頁切換、建築熱點與「興建中」提示。

const STAGE_IMG_W = 704;    // 背景圖原始尺寸（換圖時要一起改，並重新量 index.html 內各元素的 % 座標）
const STAGE_IMG_H = 1520;

const TAB_TITLES = { cultivate: "修仙", battle: "戰鬥", sect: "宗門", task: "任務", world: "世界" };

// 版面（顯示尺寸在 settings.js 設定，第 34 節）：
//   phone：#app-stage（直式圖）滿版填滿（最寬 9:16），背景圖以 fill 伸縮，疊加元素都是 % 座標所以仍對齊
//   pc   ：#pc-stage（橫式圖 home-bg-pc.jpg，config-home-pc.js）等比塞進視窗，#app-stage 隱藏
// #tab-sheet 只有一份，搬到目前使用的舞台內（只搬 DOM 節點，id 與事件不變）
// --u = 每個圖片像素對應的螢幕像素（字級與間距用），舞台被壓扁時取寬高較小的比例，文字不會溢出
function layoutStage() {
    const frame = document.getElementById('app-frame');
    const stage = document.getElementById('app-stage');
    const pcStage = document.getElementById('pc-stage');
    const sheet = document.getElementById('tab-sheet');
    if (!frame || !stage || !pcStage || !sheet) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const pc = resolveDisplayLayout(vw, vh) === 'pc';
    document.body.classList.toggle('layout-pc', pc);
    // 寬螢幕（自動尺寸會選 PC）卻被設成手機版時，顯示明顯的「切換回 PC 版」按鈕；手機版的 ⚙️ 設定鈕太小，玩家常找不到
    const switchBtn = document.getElementById('layout-switch-btn');
    if (switchBtn) switchBtn.classList.toggle('show', !pc && vw >= AUTO_PC_MIN_WIDTH && vw / vh >= AUTO_PC_MIN_RATIO);

    let w, h, target, imgW, imgH;
    if (pc) {
        w = vw; h = vw * PC_STAGE_IMG_H / PC_STAGE_IMG_W;
        if (h > vh) { h = vh; w = vh * PC_STAGE_IMG_W / PC_STAGE_IMG_H; }
        target = pcStage; imgW = PC_STAGE_IMG_W; imgH = PC_STAGE_IMG_H;
        if (sheet.parentNode !== pcStage) pcStage.appendChild(sheet);
    } else {
        h = vh; w = Math.min(vw, vh * 9 / 16);
        target = stage; imgW = STAGE_IMG_W; imgH = STAGE_IMG_H;
        if (sheet.parentNode !== stage) stage.insertBefore(sheet, document.getElementById('bottom-nav'));
    }
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    target.style.width = w + 'px';
    target.style.height = h + 'px';
    target.style.setProperty('--u', Math.min(w / imgW, h / imgH) + 'px');
}

// PC 版舞台：依 config-home-pc.js 產生按鈕、建築熱點與牌匾，並把分頁面板放到 PC_SHEET_RECT
function renderPcStage() {
    const pct = (v, total) => (v / total * 100).toFixed(3) + '%';
    const place = (el, r) => {
        el.style.left = pct(r[0], PC_STAGE_IMG_W);
        el.style.top = pct(r[1], PC_STAGE_IMG_H);
        el.style.width = pct(r[2], PC_STAGE_IMG_W);
        el.style.height = pct(r[3], PC_STAGE_IMG_H);
    };
    const hotspots = document.getElementById('pc-hotspots');
    const buttons = document.getElementById('pc-buttons');
    if (!hotspots || !buttons) return;
    hotspots.innerHTML = '';
    buttons.innerHTML = '';
    pcStageButtons.forEach(b => {
        if (b.enabled === false) return;
        const el = document.createElement('button');
        el.className = b.kind === 'hotspot' ? 'hotspot' : (b.nav ? 'stage-btn nav-btn' : 'stage-btn');
        if (b.nav) el.dataset.nav = b.nav;
        el.setAttribute('aria-label', b.label);
        el.setAttribute('onclick', b.action);
        place(el, b.rect);
        if (b.plaque) el.innerHTML = `<span id="pc-plaque-${b.id}" class="plaque plaque-${b.plaque}">${b.label}</span>`;
        if (b.cover) el.innerHTML = `<span class="nav-label-cover stage-label-cover">${b.cover}</span>`;   // 圖上的字改名：深色底蓋掉原字（config-home-pc.js 的 cover）
        (b.kind === 'hotspot' ? hotspots : buttons).appendChild(el);
    });
    document.documentElement.style.setProperty('--pc-sheet-left', pct(PC_SHEET_RECT[0], PC_STAGE_IMG_W));
    document.documentElement.style.setProperty('--pc-sheet-top', pct(PC_SHEET_RECT[1], PC_STAGE_IMG_H));
    document.documentElement.style.setProperty('--pc-sheet-width', pct(PC_SHEET_RECT[2], PC_STAGE_IMG_W));
    document.documentElement.style.setProperty('--pc-sheet-height', pct(PC_SHEET_RECT[3], PC_STAGE_IMG_H));
}

function initHomeUi() {
    renderPcStage();
    layoutStage();
    window.addEventListener('resize', layoutStage);
    window.addEventListener('orientationchange', layoutStage);
    switchTab('home');
}

// 底部導覽：home（洞府）只顯示背景與熱點；其他分頁在 #tab-sheet 顯示 data-tab 相符的面板
// 手機版與 PC 版的導覽按鈕都帶 .nav-btn[data-nav]，一起更新選中光暈
function switchTab(tab) {
    document.body.dataset.tab = tab;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.nav === tab);
    });
    if (TAB_TITLES[tab]) {
        document.getElementById('sheet-title').innerText = TAB_TITLES[tab];
        document.getElementById('sheet-body').scrollTop = 0;
    }
}

// 「世界」導覽（手機底部「世界」、PC 版「福袋」）：切到世界分頁並跳出修仙地圖（map.js）
function openWorldTab() {
    switchTab('world');
    openWorldMapModal();
}

// 命運與系統（存檔管理、轉世、重置）：手機洞府丹藥堂上方的齒輪、設定視窗內的按鈕
function openSystemModal() {
    document.getElementById('system-modal').style.display = 'flex';
}

// 圖上有、遊戲尚未實作的功能（郵件、充值…）
let stageToastTimer = null;
function showStageToast(msg) {
    const el = document.getElementById('stage-toast');
    if (!el) return;
    el.innerText = msg;
    el.classList.add('show');
    clearTimeout(stageToastTimer);
    stageToastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}
// 點洞府右上資源框：顯示資源名稱、完整數字與用途（手機沒有滑鼠停留的 title 提示）
const HUD_RESOURCE_INFO = {
    coins: { icon: '💰', name: '靈石', get: () => player.coins, use: '購物、鍛造、派遣' },
    rep:   { icon: '💎', name: '聲望', get: () => player.reputation || 0, use: '解鎖活動、兌換' },
    core:  { icon: '🔮', name: '獸丹', get: () => player.beastCore || 0, use: '靈寵兌換與維持費' }
};
function showHudResourceInfo(key) {
    const r = HUD_RESOURCE_INFO[key];
    if (!r) return;
    showStageToast(`${r.icon} ${r.name} ${fmtNum(r.get())}｜${r.use}`);
}
function showUnderConstruction(name) {
    showStageToast(`🏗️【${name}】興建中，敬請期待！`);
}

// 升仙台：修為圓滿時渡劫；否則提示進度（轉世在「世界」分頁的命運抉擇）
function openAscensionPlatform() {
    if (player.pendingTribulation) {
        triggerTribulation();
        if (inTribulation) switchTab('battle');   // 確認渡劫後直接跳到戰鬥分頁看心魔對決（取消則留在洞府）
        return;
    }
    let pct = Math.min(100, player.exp / getNextExp() * 100);
    let tip = player.realmIndex >= 10 ? "（已可於「⚙️ 系統 → 命運抉擇」轉世輪迴）" : "";
    showStageToast(`☁️ ${realms[player.realmIndex]} ${player.stage}階・修為 ${pct.toFixed(1)}%，圓滿後方可渡劫${tip}`);
}

// 數字縮寫：125.6萬、3.2億
// 戰鬥數字（攻擊、氣血、靈力、戰力、傷害）的簡寫：先 ×100（format.js 的 combatScale）再簡寫
function formatShortCombat(n) { return formatShortNumber((n || 0) * combatScale()); }
function formatShortNumber(n) {
    n = Math.floor(n || 0);
    if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e10 ? 0 : 1) + "億";
    if (n >= 1e4) return (n / 1e4).toFixed(n >= 1e6 ? 0 : 1) + "萬";
    return n.toWan();
}

// 修煉效率：宗門經驗倍率 × 靈寵經驗加成（與 leveling.js 的 gainExp 相同）
function getCultivationRate() {
    let mult = player.sect ? player.sect.expMult : 1;
    if (hasLiveBeast('fox')) mult *= 1.1;
    if (hasLiveBeast('dragon')) mult *= 1.2;
    return mult;
}

// 洞府頭像的位置（舞台的 %：left, top, width, height）⚠️ 必須與 index.html 的 #hud-avatar／#pc-hud-avatar CSS 同步
const HUD_AVATAR_BOXES = { 'hud-avatar': [3.98, 2.24, 17.61, 8.16], 'pc-hud-avatar': [1.890, 3.255, 7.558, 13.542] };

// 頭像光環（avatar.js 的 getPlayerFrame）：#hud-avatar-frame／#pc-hud-avatar-frame 依頭像方框換算位置，讓框內的洞對準頭像
function updateHudAvatarFrames() {
    const fr = getPlayerFrame();
    for (let id in HUD_AVATAR_BOXES) {
        const el = document.getElementById(id + '-frame');
        if (!el) continue;
        if (!fr) { el.style.display = 'none'; continue; }
        const [l, t, w, h] = HUD_AVATAR_BOXES[id];
        const b = getFrameOverlayBox(fr);
        if (el.getAttribute('src') !== fr.img) el.setAttribute('src', fr.img);
        el.style.display = 'block';
        el.style.left = (l + w * b.left / 100) + '%';
        el.style.top = (t + h * b.top / 100) + '%';
        el.style.width = (w * b.size / 100) + '%';
        el.style.height = (h * b.size / 100) + '%';
    }
}

// 由 ui.js 的 updateUI() 每次呼叫：把數值寫進疊在圖上的 HUD
// 手機版 id 為 hud-xxx，PC 版為 pc-hud-xxx（index.html 的 #pc-stage），兩邊同時寫入，切換版面不必重算
function updateHomeHud() {
    const both = id => [document.getElementById(id), document.getElementById('pc-' + id)].filter(Boolean);
    const set = (id, text) => both(id).forEach(el => { el.innerText = text; });
    const width = (id, pct) => both(id).forEach(el => { el.style.width = Math.max(0, Math.min(100, pct)) + '%'; });

    const avatarInfo = getPlayerAvatar();   // 玩家選用的頭像（avatar.js），點頭像可更換
    both('hud-avatar').forEach(avatar => {
        if (avatar.getAttribute('src') === avatarInfo.img) return;
        avatar.setAttribute('src', avatarInfo.img);
        avatar.style.objectPosition = avatarInfo.pos;
    });
    updateHudAvatarFrames();

    set('hud-player-name', player.name);
    let nameTag = getNameTag();   // 稱號或職業階級（codex.js）
    both('hud-title').forEach(el => { el.innerText = nameTag; el.style.display = nameTag ? '' : 'none'; });
    let karma = getKarmaState();   // 善惡標籤（merit.js）：善藍、惡紅、中立灰
    both('hud-karma').forEach(el => {
        el.innerText = karma.label;
        el.className = `karma-tag karma-${karma.key}`;
    });
    set('hud-realm', `${realms[player.realmIndex]} ${player.stage}階${player.pendingTribulation ? '・待渡劫' : ''}${player.weakened ? '・虛弱' : ''}`);
    both('hud-realm').forEach(realmBadge => {
        realmBadge.classList.toggle('weak', !!player.weakened);
        realmBadge.title = player.weakened ? `虛弱：攻擊、氣血與靈力上限 -${Math.round((1 - WEAKNESS_STAT_MULT) * 100)}%，修回 10 階後解除` : '';
    });
    let levelPct = player.level >= MAX_PLAYER_LEVEL ? 100 : player.levelExp / getLevelExpNeeded(player.level) * 100;
    set('hud-level', `Lv.${player.level.toWan()}`);
    width('hud-level-bar', levelPct);
    set('hud-power', formatShortCombat(NUMERIC_V2 ? nv2CombatPower() : getPhysAttack()));   // 新制戰力＝每回合期望輸出（numeric.js）

    set('hud-coins', formatShortNumber(player.coins));
    set('hud-rep', formatShortNumber(player.reputation || 0));   // 圖上的「仙玉」欄位改顯示聲望
    set('hud-core', formatShortNumber(player.beastCore || 0));   // 只有 PC 版有這一欄（元寶圖示的資源框）

    width('hud-hp-bar', player.hp / player.maxHp * 100);
    set('hud-hp-text', `${formatShortCombat(Math.max(0, player.hp))}/${formatShortCombat(player.maxHp)}`);
    width('hud-mp-bar', player.mp / player.maxMp * 100);
    set('hud-mp-text', `${formatShortCombat(Math.max(0, player.mp))}/${formatShortCombat(player.maxMp)}`);
    let expPct = Math.min(100, player.exp / getNextExp() * 100);
    width('hud-exp-bar', expPct);
    set('hud-exp-text', player.pendingTribulation ? '圓滿・待渡劫' : `${expPct.toFixed(1)}%`);
    set('hud-rate', `${Math.round(getCultivationRate() * 100)}%`);

    // 待渡劫時升仙台牌匾亮紅點
    [document.getElementById('plaque-ascend'), document.getElementById('pc-plaque-ascend')].forEach(plaque => {
        if (plaque) plaque.classList.toggle('alert', !!player.pendingTribulation);
    });
}
