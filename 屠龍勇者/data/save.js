// 屠龍勇者：存檔／讀檔／匯出匯入（依賴 config、player）
// 存檔格式：{ schema, t, owner, ownerEmail, player }；改存檔結構時把 SAVE_SCHEMA +1，並在 migrateSave 補上轉換
// owner（schema 4）：這個角色屬於哪個雲端帳號（uid；訪客建立的是空字串）。只存在本機，上傳雲端時拿掉（cloudPushSlot）
// 本機文字是加密＋簽章過的（guard.js saveEncode／saveParse），讀寫存檔一律經過這兩個函式（ARCHITECTURE.md 第 60 節）

let lastSaveAt = 0;   // 讀到的存檔是什麼時候存的（離線收益用）

// ───────── 多角色欄位（ARCHITECTURE.md 第 25 節）─────────
// 欄位 0 沿用舊 key（舊存檔不用轉換），其他欄位 key 加 _s 編號；最後玩的欄位記在 SLOT_KEY
// 洗白：WIPE.id 和這台裝置記的不一樣 → 刪掉所有 dragonSlayer_ 開頭的資料（登入狀態、訊息框開關除外）
const WIPE_KEY = 'dragonSlayer_wipe';
(function wipeCheck() {
    if (!WIPE.id) return;
    try {
        if (localStorage.getItem(WIPE_KEY) === WIPE.id) return;
        const keep = k => k.startsWith('dragonSlayer_auth') || k === 'dragonSlayer_logOpen';
        const del = [];
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('dragonSlayer_') && !keep(k)) del.push(k); }
        del.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(WIPE_KEY, WIPE.id);
        if (del.some(k => k.startsWith(SAVE_KEY))) window.__wiped = true;   // 標題畫面提示一次
    } catch (e) {}
})();

let currentSlot = 0;
try { currentSlot = clamp(parseInt(localStorage.getItem(SLOT_KEY), 10) || 0, 0, MAX_SLOTS - 1); } catch (e) {}

function slotKey(i) { return i ? SAVE_KEY + '_s' + i : SAVE_KEY; }
function slotHasSave(i) {
    try { return !!localStorage.getItem(slotKey(i)); } catch (e) { return false; }
}
function setCurrentSlot(i) {
    currentSlot = i;
    try { localStorage.setItem(SLOT_KEY, String(i)); } catch (e) {}
}
function firstEmptySlot() {
    for (let i = 0; i < MAX_SLOTS; i++) if (!slotHasSave(i)) return i;
    return -1;
}

// 人物選單卡片用：讀出某欄位的角色概要（暫時換掉 player 算 calcStats，算完還原）
function readSlotSummary(i) {
    try {
        const raw = localStorage.getItem(slotKey(i));
        if (!raw) return null;
        const data = saveParse(raw);
        if (!data || !data.player || !CLASSES[data.player.cls]) return { broken: true };
        const p = migrateSave(data), keep = player;
        let st;
        try { player = p; st = calcStats(); } finally { player = keep; }
        const loc = p.loc.type === 'town' ? TOWNS[p.loc.id].name : ZONE_BY_ID[p.loc.id].name;
        return { name: p.name, cls: p.cls, lv: p.lv, exp: p.exp, hp: p.hp, mp: p.mp, maxHp: st.maxHp, maxMp: st.maxMp,
            gold: p.gold, loc, hunting: p.hunting && p.loc.type === 'zone', t: data.t || 0,
            locked: slotLocked(i), ownerEmail: data.ownerEmail || '' };
    } catch (e) {
        return { broken: true };
    }
}

function hasSave() {
    for (let i = 0; i < MAX_SLOTS; i++) if (slotHasSave(i)) return true;
    return false;
}

// ───────── 角色歸屬（ARCHITECTURE.md 第 29 節「角色歸屬」）─────────
// 每份存檔自己記屬於哪個帳號，不再只靠整台裝置一個 dragonSlayer_cloud_owner（多帳號／被動登出時會把角色收進別人的帳號）
let playerOwner = '', playerOwnerEmail = '';   // 目前遊戲中角色的 owner
let ownerKickPending = false;

// 這個瀏覽器目前登入的帳號：直接讀 SDK 存的登入狀態（所有分頁共用；SDK 還沒載入、離線也讀得到）
function authUid() {
    try { const s = JSON.parse(localStorage.getItem('dragonSlayer_auth')); return (s && s.user && s.user.id) || ''; } catch (e) { return ''; }
}
function saveOwnerOf(data) { return (data && data.owner) || ''; }
function slotOwnerInfo(i) {
    try { const d = saveParse(localStorage.getItem(slotKey(i))); return d ? { owner: saveOwnerOf(d), email: d.ownerEmail || '' } : null; } catch (e) { return null; }
}
// 角色屬於別的帳號（而且這個瀏覽器正登入別的帳號）→ 不能進入
function slotLocked(i) {
    const o = slotOwnerInfo(i), uid = authUid();
    return !!(o && o.owner && uid && o.owner !== uid);
}
// 舊存檔（schema 3 以前）沒有 owner：用這台裝置記的帳號（dragonSlayer_cloud_owner）補上，訪客角色補空字串。main.js 啟動時呼叫一次
function ownerMigrate() {
    try {
        const legacy = localStorage.getItem('dragonSlayer_cloud_owner') || '';
        for (let i = 0; i < MAX_SLOTS; i++) {
            const raw = localStorage.getItem(slotKey(i));
            if (!raw) continue;
            const d = saveParse(raw);
            if (!d || d.owner !== undefined) continue;
            d.owner = legacy;
            localStorage.setItem(slotKey(i), saveEncode(JSON.stringify(d)));
        }
    } catch (e) {}
}

// 遊戲中的角色和登入帳號對不上（另一個分頁登出／換帳號）：不存檔、回標題
function ownerKick(msg) {
    if (ownerKickPending) return;
    ownerKickPending = true;
    setTimeout(() => {   // 延後：呼叫 saveGame 的地方接下來還會用到 player
        ownerKickPending = false;
        if (!player) return;
        hunt = null; session = null; walkHome = null; player = null;
        showTitle();
        gameAlert('帳號已變更', msg || '這個瀏覽器登入的帳號已經登出或換人，這個角色屬於原本的帳號，已回到標題畫面（沒有存檔）。');
    }, 0);
}

// force：被動登出時先把進度存在本機（cloud.js），不檢查歸屬
function saveGame(force) {
    if (!player || SIM_MODE) return;
    const uid = authUid();
    if (!force) {
        if (ownerKickPending) return;
        // 訪客角色在登入狀態存檔 → 歸到這個帳號（之後會上傳）
        if (!playerOwner && uid && cloudLoggedIn() && cloudUser.id === uid) { playerOwner = uid; playerOwnerEmail = cloudUser.email || ''; }
        if (playerOwner && isCloudConfigured()) {
            if (uid && uid !== playerOwner) { ownerKick(); return; }   // 現在登入的是別的帳號
            if (!uid && !slotHasSave(currentSlot)) { ownerKick(); return; }   // 帳號在別的分頁登出、本機角色已清掉：不要寫回去
        }
    }
    const data = { schema: SAVE_SCHEMA, t: Date.now(), owner: playerOwner, ownerEmail: playerOwnerEmail, player };
    try { localStorage.setItem(slotKey(currentSlot), saveEncode(JSON.stringify(data))); } catch (e) { return; /* 無痕模式等存不了，略過 */ }
    cloudMarkDirty(currentSlot);   // 登入雲端時記號，cloud.js 定時上傳（只上傳屬於目前帳號的角色）
}

function migrateSave(data) {
    const p = data.player;
    // 補齊新版才有的欄位
    const fresh = { statPoints: 0, elixirs: 0, storage: [], buffs: {}, cds: {}, towerMax: 10, towerCleared: {}, towerBossCd: {}, dragons: {}, dragonCd: {}, kills: 0, deaths: 0, mapRun: null,
        quests: { ch: 0, active: false, prog: 0, bossDone: false } };
    for (const k in fresh) if (p[k] == null) p[k] = fresh[k];
    p.settings = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), p.settings || {});
    // 2026-10-15：技能改成用魔法書學（player.skills）＋技能欄（settings.skillSlots）。
    // 舊存檔沒有 skills：照舊規則（等級到就會）把這個職業該會的全部學好；技能欄依舊的自動開關（settings.skills=false 的不放）排好
    if (!Array.isArray(p.skills)) {
        p.skills = classSkillList(p.cls).filter(s => { const n = skillNeedLv(s, p.cls); return n && n <= p.lv; }).map(s => s.id);
        p.settings.skillSlots = defaultSkillSlots(p, p.settings.skills || {});
    }
    if (!Array.isArray(p.settings.skillSlots)) p.settings.skillSlots = [];
    p.settings.skillSlots = p.settings.skillSlots.slice(0, SKILL_SLOTS).map(id => (id && SKILL_BY_ID[id] ? id : ''));
    while (p.settings.skillSlots.length < SKILL_SLOTS) p.settings.skillSlots.push('');
    // 2026-10-15：快捷欄 bar（技能＋道具、各格自動開關）。舊存檔：第一排＝原本技能欄（自動），補給依舊的自動補給設定
    if (!Array.isArray(p.settings.bar) || !p.settings.bar.length) p.settings.bar = defaultBar(p, p.settings.skillSlots);
    normalizeBar(p);
    // 移除已不存在的道具，避免舊存檔讓遊戲壞掉
    const valid = x => x && ITEMS[x.id];
    p.inv = (p.inv || []).filter(valid);
    p.storage = p.storage.filter(valid);
    for (const k in p.equip) if (!valid(p.equip[k])) delete p.equip[k];
    // schema 3：異界地圖（舊的自由開關詞綴 mapMods 移除）
    delete p.mapMods;
    if (p.mapRun && (!ZONE_BY_ID[p.mapRun.zone] || !Array.isArray(p.mapRun.mods))) p.mapRun = null;
    if (p.mapRun) p.mapRun.mods = p.mapRun.mods.filter(k => MAP_MODS[k]);
    // schema 2：詞綴品質不認得（例如之後刪掉的品質）就當普通裝備
    const fixQ = x => { if (x.q && !QUALITY[x.q]) { delete x.q; delete x.af; delete x.nm; } if (x.af) x.af = x.af.filter(a => AFFIXES[a.k]); };
    [...p.inv, ...p.storage, ...Object.values(p.equip)].forEach(fixQ);
    if (p.loc.type === 'zone' && !ZONE_BY_ID[p.loc.id]) p.loc = { type: 'town', id: 'talking' };
    if (p.loc.type === 'town' && !TOWNS[p.loc.id]) p.loc = { type: 'town', id: 'talking' };
    return p;
}

function loadGame() {
    try {
        const d = saveDecode(localStorage.getItem(slotKey(currentSlot)));
        if (!d) return false;
        if (!applySaveData(JSON.parse(d.text))) return false;
        if (d.bad) guardFlag(d.bad);   // 簽章不符：照樣能玩，記標記（guard.js）
        return true;
    } catch (e) {
        console.error('讀檔失敗', e);
        return false;
    }
}

function applySaveData(data) {
    if (!data || !data.player || !CLASSES[data.player.cls]) return false;
    player = guardWrap(migrateSave(data));   // 金幣、經驗等改成偽裝存放（guard.js）
    playerOwner = saveOwnerOf(data); playerOwnerEmail = data.ownerEmail || '';
    lastSaveAt = data.t || Date.now();
    return true;
}

function deleteSave(i = currentSlot) {
    let raw = null;
    try { raw = localStorage.getItem(slotKey(i)); localStorage.removeItem(slotKey(i)); } catch (e) {}
    cloudDeleteSlot(i, raw);   // 登入雲端時也刪雲端那筆
}

function exportSaveText() {
    return saveEncode(JSON.stringify({ schema: SAVE_SCHEMA, t: Date.now(), player }));   // 加密＋簽章（guard.js）
}

function importSaveText(text) {
    try {
        text = text.trim();
        let data, bad = '';
        if (text.slice(0, 3) === 'DS1') { const d = saveDecode(text); data = JSON.parse(d.text); bad = d.bad ? '匯入的存檔代碼被修改' : ''; }
        else {   // 改版前的存檔代碼（base64 JSON，沒有簽章）：只接受改版前存的
            data = JSON.parse(decodeURIComponent(escape(atob(text))));
            if (data && (data.t || 0) >= GUARD_SINCE) bad = '匯入的存檔代碼沒有簽章';
        }
        if (!data || typeof data !== 'object') return false;
        delete data.owner; delete data.ownerEmail;   // 匯入的存檔不帶別人的帳號：當作訪客角色，登入中就歸到目前帳號
        if (!applySaveData(data)) return false;
        if (bad) guardFlag(bad);
        saveGame();
        return true;
    } catch (e) {
        return false;
    }
}
