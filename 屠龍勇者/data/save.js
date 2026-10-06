// 屠龍勇者：存檔／讀檔／匯出匯入（依賴 config、player）
// 存檔格式：{ schema, t, player }；改存檔結構時把 SAVE_SCHEMA +1，並在 migrateSave 補上轉換

function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

function saveGame() {
    if (!player) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ schema: SAVE_SCHEMA, t: Date.now(), player })); } catch (e) { /* 無痕模式等存不了，略過 */ }
}

function migrateSave(data) {
    const p = data.player;
    // 補齊新版才有的欄位
    const fresh = { statPoints: 0, elixirs: 0, storage: [], buffs: {}, cds: {}, towerMax: 10, towerCleared: {}, dragons: {}, dragonCd: {}, kills: 0, deaths: 0 };
    for (const k in fresh) if (p[k] == null) p[k] = fresh[k];
    p.settings = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), p.settings || {});
    // 移除已不存在的道具，避免舊存檔讓遊戲壞掉
    const valid = x => x && ITEMS[x.id];
    p.inv = (p.inv || []).filter(valid);
    p.storage = p.storage.filter(valid);
    for (const k in p.equip) if (!valid(p.equip[k])) delete p.equip[k];
    if (p.loc.type === 'zone' && !ZONE_BY_ID[p.loc.id]) p.loc = { type: 'town', id: 'talking' };
    if (p.loc.type === 'town' && !TOWNS[p.loc.id]) p.loc = { type: 'town', id: 'talking' };
    return p;
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
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
    return true;
}

function deleteSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
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
