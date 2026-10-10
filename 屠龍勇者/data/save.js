// 屠龍勇者：存檔／讀檔／匯出匯入（依賴 config、player）
// 存檔格式：{ schema, t, player }；改存檔結構時把 SAVE_SCHEMA +1，並在 migrateSave 補上轉換

let lastSaveAt = 0;   // 讀到的存檔是什麼時候存的（離線收益用）

// ───────── 多角色欄位（ARCHITECTURE.md 第 25 節）─────────
// 欄位 0 沿用舊 key（舊存檔不用轉換），其他欄位 key 加 _s 編號；最後玩的欄位記在 SLOT_KEY
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
        const data = JSON.parse(raw);
        if (!data || !data.player || !CLASSES[data.player.cls]) return { broken: true };
        const p = migrateSave(data), keep = player;
        let st;
        try { player = p; st = calcStats(); } finally { player = keep; }
        const loc = p.loc.type === 'town' ? TOWNS[p.loc.id].name : ZONE_BY_ID[p.loc.id].name;
        return { name: p.name, cls: p.cls, lv: p.lv, exp: p.exp, hp: p.hp, mp: p.mp, maxHp: st.maxHp, maxMp: st.maxMp,
            gold: p.gold, loc, hunting: p.hunting && p.loc.type === 'zone', t: data.t || 0 };
    } catch (e) {
        return { broken: true };
    }
}

function hasSave() {
    for (let i = 0; i < MAX_SLOTS; i++) if (slotHasSave(i)) return true;
    return false;
}

function saveGame() {
    if (!player || SIM_MODE) return;
    try { localStorage.setItem(slotKey(currentSlot), JSON.stringify({ schema: SAVE_SCHEMA, t: Date.now(), player })); } catch (e) { return; /* 無痕模式等存不了，略過 */ }
    cloudMarkDirty(currentSlot);   // 登入雲端時記號，cloud.js 定時上傳
}

function migrateSave(data) {
    const p = data.player;
    // 補齊新版才有的欄位
    const fresh = { statPoints: 0, elixirs: 0, storage: [], buffs: {}, cds: {}, towerMax: 10, towerCleared: {}, dragons: {}, dragonCd: {}, kills: 0, deaths: 0, mapRun: null,
        quests: { ch: 0, active: false, prog: 0, bossDone: false } };
    for (const k in fresh) if (p[k] == null) p[k] = fresh[k];
    p.settings = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), p.settings || {});
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
        const raw = localStorage.getItem(slotKey(currentSlot));
        if (!raw) return false;
        return applySaveData(JSON.parse(raw));
    } catch (e) {
        console.error('讀檔失敗', e);
        return false;
    }
}

function applySaveData(data) {
    if (!data || !data.player || !CLASSES[data.player.cls]) return false;
    player = migrateSave(data);
    lastSaveAt = data.t || Date.now();
    return true;
}

function deleteSave(i = currentSlot) {
    let raw = null;
    try { raw = localStorage.getItem(slotKey(i)); localStorage.removeItem(slotKey(i)); } catch (e) {}
    cloudDeleteSlot(i, raw);   // 登入雲端時也刪雲端那筆
}

function exportSaveText() {
    return btoa(unescape(encodeURIComponent(JSON.stringify({ schema: SAVE_SCHEMA, t: Date.now(), player }))));
}

function importSaveText(text) {
    try {
        const data = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
        if (!applySaveData(data)) return false;
        saveGame();
        return true;
    } catch (e) {
        return false;
    }
}
