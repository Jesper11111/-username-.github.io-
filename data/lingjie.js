// ==================== 靈界進出與五行傳送陣靈石（第 74 節，2026-10-04 使用者指定）====================
// 「飛升點無法直接進入：要金木水火土傳送陣靈石各 1 顆才可進入靈界；進入靈界無法直接離開，也要五行傳送陣靈石各 1 顆才能離開」
//   存檔：player.lingStones = { 金, 木, 水, 火, 土 }、player.inLingjie（身在靈界）
//   身在靈界：世界導覽開靈界地圖；人界的地圖（宗門以外）不能進；回人界（靈界地圖「返回人界」、洞府「宗門」鈕）要付一套靈石。
//   第四、五區（LINGJIE_MAP_CATEGORIES）只有身在靈界才能進。戰死、渡劫失敗、暫存區滿等系統傳送回宗門＝被送回人界（不扣靈石，changeMap 會清掉 inLingjie）。
//   取得：渡劫以上野外（無邊海、第四、五區）依掉寶次數掉落、鎮魔塔 60 層起 BOSS（config-towns.js 的 LINGJIE_STONE_DROP）。

function getLingStone(k) { return (player.lingStones && player.lingStones[k]) || 0; }
function addLingStone(k, n) {
    if (!(n > 0) || !LINGJIE_STONE_KEYS.includes(k)) return 0;
    if (!player.lingStones || typeof player.lingStones !== 'object') player.lingStones = {};
    player.lingStones[k] = (player.lingStones[k] || 0) + n;
    return n;
}
function hasLingStoneSet() { return LINGJIE_STONE_KEYS.every(k => getLingStone(k) >= 1); }
function payLingStoneSet() { LINGJIE_STONE_KEYS.forEach(k => { player.lingStones[k] -= 1; }); }
function formatLingStones() { return LINGJIE_STONE_KEYS.map(k => `${k}×${getLingStone(k)}`).join(' '); }
function lingStoneShortText() { return `五行傳送陣靈石各 1（持有 ${formatLingStones()}）`; }
function isInLingjie() { return !!(player && player.inLingjie); }
function isLingjieMapCategory(c) { return LINGJIE_MAP_CATEGORIES.includes(c); }

// 飛升點（CITY_GATES 的 lingjie: true，town.js 的 enterCityGate 在播光柱之前呼叫）：已在靈界直接放行；否則檢查並扣一套靈石。回傳是否放行
async function prepareLingjieEntry() {
    if (isInLingjie()) return true;
    if (!hasLingStoneSet()) {
        gameAlert(`🌀 飛升台的五行大陣沒有回應……\n需要金、木、水、火、土傳送陣靈石各 1 顆才能飛升靈界。\n持有：${formatLingStones()}\n（傳送陣靈石在渡劫以上的野外、鎮魔塔 60 層起掉落）`);
        return false;
    }
    if (!(await gameConfirm(`以五行傳送陣靈石各 1 顆催動大陣，飛升靈界？\n持有：${formatLingStones()}\n⚠️ 進入靈界後不能直接離開，返回人界同樣需要五行傳送陣靈石各 1 顆。`))) return false;
    if (!hasLingStoneSet()) return false;
    payLingStoneSet();
    player.inLingjie = true;
    addLog(`🌌 五行大陣光芒沖天，你飛升靈界！（剩餘 ${formatLingStones()}）`, "reincarnate");
    saveLocal();
    updateUI();
    return true;
}
// 回人界：付一套靈石；身在靈界的地圖（第四、五區）會先回宗門。then＝付款後要做的事（開人界地圖、回宗門）
async function tryLeaveLingjie(then) {
    if (!isInLingjie()) { if (then) then(); return; }
    if (!hasLingStoneSet()) {
        gameAlert(`🌌 你身在靈界，空間壁壘阻隔，無法直接返回人界。\n需要金、木、水、火、土傳送陣靈石各 1 顆。\n持有：${formatLingStones()}（靈界的野外也會掉落）`);
        return;
    }
    if (!(await gameConfirm(`以五行傳送陣靈石各 1 顆破開空間壁壘，返回人界？\n持有：${formatLingStones()}`))) return;
    if (!hasLingStoneSet()) return;
    payLingStoneSet();
    player.inLingjie = false;
    addLog(`🌠 破開空間壁壘，返回人界。（剩餘 ${formatLingStones()}）`, "system");
    const f = typeof getMapCategoryIndex === 'function' ? getMapCategoryIndex(player.currentMap.name) : -1;
    if (isLingjieMapCategory(f)) changeMap(0, 0);   // 人在靈界的地圖：落地回宗門
    saveLocal();
    if (then) then();
    updateUI();
}
function leaveLingjieToWorldMap() { tryLeaveLingjie(() => openTownScene(WORLD_SCENE_KEY)); }
// 世界導覽：身在靈界開靈界地圖
function openCurrentWorldScene() { openTownScene(isInLingjie() ? LINGJIE_SCENE_KEY : WORLD_SCENE_KEY); }

// 掉落（combat.js：rolls＝takeDropRolls 的掉寶次數；離線用收益次數）；只在 LINGJIE_STONE_DROP.minMapL 以上的野外
function rollLingStoneDrops(rolls, silent) {
    const D = LINGJIE_STONE_DROP, m = player.currentMap;
    if (!(rolls > 0) || !m || player.currentMapIsSafe || !(typeof m.nv2L === 'number' && m.nv2L >= D.minMapL)) return '';
    const got = {};
    LINGJIE_STONE_KEYS.forEach(k => {
        const exp = rolls * D.field;
        let n = Math.floor(exp); if (Math.random() < exp - n) n++;
        if (n > 0) got[k] = addLingStone(k, n);
    });
    const t = Object.keys(got).map(k => `${k}屬性傳送陣靈石×${got[k]}`).join('、');
    if (t && !silent) addLog(`💎 從妖獸體內取出 ${t}！`, "level-up", false, "item");
    return t;
}
// 鎮魔塔 BOSS（zhenmo.js 的 grantRewards）：fromFloor 層起 chance × 問答倍率，隨機一種
function rollLingStoneZhenmo(floor, mult) {
    const D = LINGJIE_STONE_DROP.zhenmo;
    if (floor < D.fromFloor || Math.random() >= Math.min(1, D.chance * (mult || 1))) return '';
    const k = LINGJIE_STONE_KEYS[Math.floor(Math.random() * LINGJIE_STONE_KEYS.length)];
    addLingStone(k, 1);
    return `${k}屬性傳送陣靈石×1`;
}
// 舊存檔：改版前就待在第四、五區的玩家視為已在靈界（save.js 的 applySaveData）
function migrateLingjie(data) {
    if (data && typeof data.inLingjie === 'boolean') return;
    const c = player.currentMap ? getMapCategoryIndex(player.currentMap.name) : -1;
    player.inLingjie = isLingjieMapCategory(c);
}
