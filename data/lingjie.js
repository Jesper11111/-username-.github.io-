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
    if (isGM()) { player.inLingjie = true; addLog('🛡️ GM：免傳送陣靈石飛升靈界', 'system'); saveLocal(); updateUI(); return true; }
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
    if (isGM()) {   // GM：免靈石返回人界
        player.inLingjie = false;
        const g = typeof getMapCategoryIndex === 'function' ? getMapCategoryIndex(player.currentMap.name) : -1;
        if (isLingjieMapCategory(g)) changeMap(0, 0);
        saveLocal(); if (then) then(); updateUI();
        return;
    }
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

// ---- 天元城（靈界的安全區城鎮，config-maps.js 索引 7）----
// 復活點：身在靈界＝天元城外（使用者指定「玩家復活會回到城外」），否則＝宗門；戰死、渡劫失敗、暫存區滿、離線撐不住都用這裡
function getRespawnPoint() {
    const f = isInLingjie() && findMapByName(LINGJIE_RESPAWN_MAP);
    return f || { c: 0, i: 0 };
}
function sendToRespawn() { const r = getRespawnPoint(); changeMap(r.c, r.i); }
function respawnPlaceName() { return isInLingjie() ? LINGJIE_RESPAWN_MAP : '宗門'; }
// 天元城城門圖（CITY_GATES）點下去：傳送到城內並開城內場景
function enterLingjieTown(name) {
    const f = findMapByName(name);
    if (!f) return;
    if (player.currentMap.name !== name) selectMap(f.c, f.i, true);
    if (player.currentMap.name !== name) return;   // 被擋下（例：不在靈界）
    closeCityGate();
    openTownScene(name);
}
// 茶樓：歇息回滿氣血靈力，順便聽一則傳聞（LINGJIE_TEA_RUMORS）
function openTeaHouse() {
    player.hp = getMaxHp();
    if (typeof getMaxMp === 'function') player.mp = getMaxMp();
    const r = LINGJIE_TEA_RUMORS[Math.floor(Math.random() * LINGJIE_TEA_RUMORS.length)];
    addLog('🍵 在天元茶館歇息片刻，氣血與靈力恢復了。', "heal");
    gameAlert(`🍵 天元茶館\n\n你點了一壺靈茶，歇息片刻，氣血與靈力全數恢復。\n\n鄰桌的修士壓低聲音：\n「${r}」`);
    updateUI();
}

// ---- 大道商行（天元城）：傳送陣靈石每顆 LINGJIE_SHOP_PRICE 靈石 ----
function openLingjieShop() { renderLingjieShop(); document.getElementById('lingjie-shop-modal').style.display = 'flex'; }
function renderLingjieShop() {
    const box = document.getElementById('lingjie-shop-body');
    if (!box) return;
    const P = LINGJIE_SHOP_PRICE;
    box.innerHTML = `<p style="color: #9ca3af; font-size: 0.85em;">持有靈石 <b style="color: var(--accent);">${player.coins.toWan()}</b>｜每顆 ${P.toWan()} 靈石</p>
        <div class="grid-container">${LINGJIE_STONE_KEYS.map(k => `<div class="card" style="border-color: #fbbf24;">
            <img src="${LINGJIE_STONE_IMG[k]}" alt="" style="display:block; width:72px; height:72px; margin:0 auto 4px; border-radius:10px; object-fit:cover;">
            <h3 style="margin: 4px 0;"><span class="elem-${k}">${k}</span>屬性傳送陣靈石</h3>
            <p style="font-size: 0.8em; color: #9ca3af;">持有 ${getLingStone(k)} 顆</p>
            <div class="batch-btns"><button class="sys-btn" ${player.coins >= P ? '' : 'disabled'} onclick="buyLingStones('${k}', 1)">買 1 顆</button>
            <button class="sys-btn" ${player.coins >= P * 5 ? '' : 'disabled'} onclick="buyLingStones('${k}', 5)">買 5 顆</button></div></div>`).join('')}</div>
        <button class="sys-btn" style="margin-top: 8px;" ${player.coins >= P * 5 ? '' : 'disabled'} onclick="buyLingStoneSet()">🌀 買一套（五種各 1，共 ${(P * 5).toWan()}）</button>`;
}
function buyLingStones(k, n) {
    const cost = LINGJIE_SHOP_PRICE * n;
    if (!LINGJIE_STONE_KEYS.includes(k) || !(n > 0)) return;
    if (player.coins < cost) { gameAlert(`靈石不足！需要 ${cost.toWan()} 靈石。`); return; }
    player.coins -= cost;
    addLingStone(k, n);
    addLog(`🏪 在大道商行買下 ${k}屬性傳送陣靈石 ×${n}（${cost.toWan()} 靈石）。`, "system");
    toastBought(`${k}屬性傳送陣靈石 ×${n}`);
    saveLocal(); renderLingjieShop(); updateUI();
}
function buyLingStoneSet() {
    const cost = LINGJIE_SHOP_PRICE * LINGJIE_STONE_KEYS.length;
    if (player.coins < cost) { gameAlert(`靈石不足！一套需要 ${cost.toWan()} 靈石。`); return; }
    player.coins -= cost;
    LINGJIE_STONE_KEYS.forEach(k => addLingStone(k, 1));
    addLog(`🏪 在大道商行買下一套五行傳送陣靈石（${cost.toWan()} 靈石）。`, "system");
    toastBought('五行傳送陣靈石一套');
    saveLocal(); renderLingjieShop(); updateUI();
}

// ---- 靈界任務榜（天元城，和人界的每日任務分開）：player.lingQuests = { date, list: [{ t, title, kind, target, need, prog, reward, claimed }] } ----
function lingjieWildMaps() {
    const out = [];
    LINGJIE_MAP_CATEGORIES.forEach(c => { if (maps[c] && !maps[c].isSafe) maps[c].items.forEach(m => out.push(m)); });
    return out;
}
function rollLingjieQuests() {
    const today = new Date().toDateString();
    const Q = player.lingQuests;
    if (Q && Q.date === today && Array.isArray(Q.list)) return Q;
    const pool = LINGJIE_QUEST.templates.slice(), list = [];
    const mapsOk = lingjieWildMaps().filter(m => !isBelowMapLevel(m));
    const mapList = mapsOk.length ? mapsOk : lingjieWildMaps().slice(0, 1);
    while (list.length < LINGJIE_QUEST.count && pool.length) {
        const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const q = { title: t.title, kind: t.kind, need: t.need, prog: 0, reward: t.reward, claimed: false, target: null };
        if (t.kind === 'map' && mapList.length) q.target = mapList[Math.floor(Math.random() * mapList.length)].name;
        if (t.kind === 'race') {   // 從玩家進得去的靈界野外會出現的種族挑一個
            const races = [...new Set(mapList.flatMap(m => fieldMonsterPool(m).map(x => x.m.race)))].filter(r => RACES[r]);
            q.target = races.length ? races[Math.floor(Math.random() * races.length)] : 'ghost';
        }
        list.push(q);
    }
    player.lingQuests = { date: today, list };
    return player.lingQuests;
}
function lingjieQuestDesc(q) {
    if (q.kind === 'map') return `在【${q.target}】擊殺妖獸 ${q.need} 隻`;
    if (q.kind === 'race') return `在靈界野外擊殺${(RACES[q.target] || {}).name || q.target} ${q.need} 隻`;
    return `在靈界野外（第四、五區）擊殺妖獸 ${q.need} 隻`;
}
function lingjieRewardText(r) {
    const H = getHourlyIncome(), parts = [];
    if (r.coinsH) parts.push(`${Math.floor(H * r.coinsH).toWan()} 靈石`);
    if (r.craft) parts.push(formatCraftGain(r.craft));
    if (r.ling) parts.push(`傳送陣靈石 ×${r.ling}（隨機屬性）`);
    return parts.join('、');
}
// combat.js 野外擊殺後呼叫：raceKilled＝{ 種族: 隻數 }
function onLingjieKills(n, raceKilled) {
    if (!(n > 0) || !isInLingjie() || player.currentMapIsSafe) return;
    const c = getMapCategoryIndex(player.currentMap.name);
    if (!isLingjieMapCategory(c)) return;
    const Q = player.lingQuests;
    if (!Q || Q.date !== new Date().toDateString()) return;
    let done = false;
    Q.list.forEach(q => {
        if (q.claimed || q.prog >= q.need) return;
        let add = 0;
        if (q.kind === 'any') add = n;
        else if (q.kind === 'map' && player.currentMap.name === q.target) add = n;
        else if (q.kind === 'race') add = (raceKilled && raceKilled[q.target]) || 0;
        if (!add) return;
        q.prog = Math.min(q.need, q.prog + add);
        if (q.prog >= q.need) done = true;
    });
    if (done) addLog('📜 靈界任務完成！回天元城任務榜領取獎勵。', "level-up", false, "item");
}
function openLingjieQuestModal() { rollLingjieQuests(); renderLingjieQuests(); document.getElementById('lingjie-quest-modal').style.display = 'flex'; }
function renderLingjieQuests() {
    const box = document.getElementById('lingjie-quest-body');
    if (!box) return;
    const Q = rollLingjieQuests();
    box.innerHTML = `<p style="color: #9ca3af; font-size: 0.85em;">每天 ${LINGJIE_QUEST.count} 個，只有在靈界野外擊殺才算（和人界的每日任務分開）；明天刷新。</p>`
        + Q.list.map((q, i) => `<div class="card" style="text-align: left; border-color: ${q.claimed ? '#4b5563' : q.prog >= q.need ? '#4ade80' : '#fbbf24'};">
            <h3 style="margin: 2px 0; color: #fde68a;">📜 ${q.title}</h3>
            <p style="font-size: 0.85em;">${lingjieQuestDesc(q)}　<b>${q.prog} / ${q.need}</b></p>
            <p style="font-size: 0.8em; color: #9ca3af;">獎勵：${lingjieRewardText(q.reward)}</p>
            <button class="sys-btn" ${!q.claimed && q.prog >= q.need ? '' : 'disabled'} onclick="claimLingjieQuest(${i})">${q.claimed ? '已領取' : q.prog >= q.need ? '領取獎勵' : '進行中'}</button></div>`).join('');
}
function claimLingjieQuest(i) {
    const Q = rollLingjieQuests(), q = Q.list[i];
    if (!q || q.claimed || q.prog < q.need) return;
    q.claimed = true;
    const r = q.reward, got = [];
    if (r.coinsH) { const c = Math.floor(getHourlyIncome() * r.coinsH); player.coins += c; got.push(`${c.toWan()} 靈石`); }
    if (r.craft) { for (const k in r.craft) addCraftCur(k, r.craft[k]); got.push(formatCraftGain(r.craft)); }
    for (let n = 0; n < (r.ling || 0); n++) { const k = LINGJIE_STONE_KEYS[Math.floor(Math.random() * LINGJIE_STONE_KEYS.length)]; addLingStone(k, 1); got.push(`${k}屬性傳送陣靈石 ×1`); }
    addLog(`📜 完成靈界任務【${q.title}】，獲得 ${got.join('、')}！`, "level-up", false, "item");
    showCraftSuccess('靈界任務完成', got.join('、'));
    saveLocal(); renderLingjieQuests(); updateUI();
}

// ---- 天元城・宗門設施（2026-10-04 使用者：「天元城新增一般宗門選單，在靈界也能使用尋訪仙門、背包、僕從等設施，不用回人界」）----
//   人界「不在宗門也能用」的五項＋靈獸園（2026-10-04 使用者追加）；門派任務、靈田、藏書閣等在人界本來就要身在宗門，靈界不提供
function openLingjieFacility() { document.getElementById('lingjie-facility-modal').style.display = 'flex'; }
