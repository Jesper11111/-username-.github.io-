// 煉丹房彈窗：消耗高階靈草煉製神丹，永久提升單項屬性（可 ×1 / ×10 / 最高 批次煉製）
// 每張丹藥卡片顯示已服用顆數（#pill-used-{類型}）；煉成時跳「製作成功」提示（ui.js 的 showCraftSuccess）

const pillRecipes = {
    str: { name: "大力神丸",       herb: "mortal",   herbName: "凡品靈草", coins: 0,    stat: "str", gain: 10,  statName: "力量" },
    con: { name: "洗髓丹",         herb: "high",     herbName: "上品靈草", coins: 0,    stat: "con", gain: 25,  statName: "體質" },
    int: { name: "悟道丹",         herb: "epic",     herbName: "極品靈草", coins: 0,    stat: "int", gain: 50,  statName: "悟性" },
    spr: { name: "九轉聚靈丹",     herb: "immortal", herbName: "仙品靈草", coins: 0,    stat: "spr", gain: 100, statName: "靈力" },
    cha: { name: "駐顏駐魅力丹",   herb: "immortal", herbName: "仙品靈草", coins: 1000, stat: "cha", gain: 20,  statName: "魅力" }
};

function openAlchemyModal() {
    if (!checkSectJoined()) return;
    renderPillUsed();
    document.getElementById('alchemy-modal').style.display = 'flex';
}

// 各丹藥累計服用顆數（player.pillUsed = { str, con, int, spr, cha }；2026-09-27 起記錄，之前服用的不回溯）
function getPillUsed() {
    if (!player.pillUsed || typeof player.pillUsed !== 'object') player.pillUsed = {};
    return player.pillUsed;
}
function renderPillUsed() {
    let used = getPillUsed();
    Object.keys(pillRecipes).forEach(k => {
        let el = document.getElementById(`pill-used-${k}`);
        if (el) el.textContent = `已服用 ${(used[k] || 0).toWan()} 顆（累計 ${pillRecipes[k].statName} +${((used[k] || 0) * pillRecipes[k].gain).toWan()}）`;
    });
}

// qty：1、10 或 'max'
function craftPill(type, qty = 1) {
    let r = pillRecipes[type];
    if (!r) return;

    let affordable = player.herbs[r.herb];
    if (r.coins > 0) affordable = Math.min(affordable, Math.floor(player.coins / r.coins));
    if (affordable <= 0) {
        alert(`材料不足！煉製 1 顆【${r.name}】需要 1 株${r.herbName}${r.coins > 0 ? ` 與 ${r.coins} 靈石` : ''}。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "煉製");
    if (!n) return;

    player.herbs[r.herb] -= n;
    player.coins -= r.coins * n;
    player.stats[r.stat] += r.gain * n;
    let used = getPillUsed();
    used[type] = (used[type] || 0) + n;
    addDailyProgress('craft', n);
    addLog(`🧪 煉製並服用 ${n} 顆【${r.name}】，${r.statName} +${(r.gain * n).toWan()}！`, "heal");
    showCraftSuccess(`煉成【${r.name}】×${n.toWan()}`, `已服用，${r.statName} +${(r.gain * n).toWan()}（累計服用 ${used[type].toWan()} 顆）`);
    renderPillUsed();
    updateUI();
}
