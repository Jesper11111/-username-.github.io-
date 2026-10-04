// 煉丹房彈窗：消耗高階靈草煉製神丹，永久提升單項屬性（可 ×1 / ×10 / 最高 批次煉製）
// 每張丹藥卡片顯示已服用顆數（#pill-used-{類型}）；煉成時跳「製作成功」提示（ui.js 的 showCraftSuccess）
// 新制（NUMERIC_V2，第 52 節）：每顆只 +0.1、每種最多 200 顆，屬性由 numeric.js 依服用顆數計算（不再直接改 player.stats）；多一種敏捷丹

const pillRecipes = {
    str: { name: "大力神丸",       herb: "mortal",   herbName: "凡品靈草", coins: 0,    stat: "str", gain: 10,  statName: "力量" },
    con: { name: "洗髓丹",         herb: "high",     herbName: "上品靈草", coins: 0,    stat: "con", gain: 25,  statName: "體質" },
    int: { name: "悟道丹",         herb: "epic",     herbName: "極品靈草", coins: 0,    stat: "int", gain: 50,  statName: "悟性" },
    spr: { name: "九轉聚靈丹",     herb: "immortal", herbName: "仙品靈草", coins: 0,    stat: "spr", gain: 100, statName: "靈力" },
    cha: { name: "駐顏駐魅力丹",   herb: "immortal", herbName: "仙品靈草", coins: 1000, stat: "cha", gain: 0.5, max: 5000, statName: "魅力" },   // 2026-10-04 使用者指定：每顆 +0.5、上限 5000 顆（原 +20、無上限；之前服用的不回溯）
    agi: { name: "身法丹",         herb: "high",     herbName: "上品靈草", coins: 0,    stat: "agi", gain: 0,   statName: "敏捷", v2Only: true }   // 新制才有
};

// 每顆的增加量與上限：新制一律 +0.1、200 顆；魅力丹不影響戰鬥，用自己的 gain／max（2026-10-04 起 +0.5、5000 顆，pillUsed.cha 從 2026-09-27 起累計）
function pillGainOf(type) { return NUMERIC_V2 && type !== 'cha' ? NV2.pillGain : pillRecipes[type].gain; }
function pillMaxOf(type) { return NUMERIC_V2 && type !== 'cha' ? NV2.pillMax : (pillRecipes[type].max || Infinity); }

function openAlchemyModal() {
    if (!checkSectJoined()) return;
    renderPillUsed();
    document.getElementById('alchemy-modal').style.display = 'flex';
}

// 各丹藥累計服用顆數（player.pillUsed = { str, con, int, spr, agi, cha }；2026-09-27 起記錄，之前服用的不回溯）
function getPillUsed() {
    if (!player.pillUsed || typeof player.pillUsed !== 'object') player.pillUsed = {};
    return player.pillUsed;
}
function renderPillUsed() {
    let used = getPillUsed();
    renderCorePillCard();   // 凝元丹：築基／金丹期才顯示（golden-core.js）
    const agiCard = document.getElementById('pill-card-agi');
    if (agiCard) agiCard.hidden = !NUMERIC_V2;
    Object.keys(pillRecipes).forEach(k => {
        let el = document.getElementById(`pill-used-${k}`);
        if (!el) return;
        const n = used[k] || 0, max = pillMaxOf(k), gain = pillGainOf(k);
        const counted = Math.min(n, max);
        el.textContent = max < Infinity
            ? `已服用 ${counted} / ${max} 顆（${pillRecipes[k].statName} +${(counted * gain).toFixed(1)}）`
            : `已服用 ${n.toWan()} 顆（累計 ${pillRecipes[k].statName} +${(n * gain).toWan()}）`;
        const eff = document.getElementById(`pill-effect-${k}`);
        if (eff) eff.textContent = `效果: ${pillRecipes[k].statName} +${NUMERIC_V2 && k !== 'cha' ? gain.toFixed(1) : gain}${k === 'cha' ? `（上限 ${max.toWan()} 顆）` : ''}`;
    });
}

// qty：1、10 或 'max'
function craftPill(type, qty = 1) {
    let r = pillRecipes[type];
    if (!r || (r.v2Only && !NUMERIC_V2)) return;
    let used = getPillUsed();
    const max = pillMaxOf(type), gain = pillGainOf(type);
    const room = max - (used[type] || 0);
    if (room <= 0) {
        gameAlert(`【${r.name}】已服用 ${max} 顆，藥力已達極限，再服也無效。`);
        return;
    }

    let affordable = Math.min(player.herbs[r.herb], room);
    if (r.coins > 0) affordable = Math.min(affordable, Math.floor(player.coins / r.coins));
    if (affordable <= 0) {
        gameAlert(`材料不足！煉製 1 顆【${r.name}】需要 1 株${r.herbName}${r.coins > 0 ? ` 與 ${r.coins} 靈石` : ''}。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "煉製");
    if (!n) return;

    player.herbs[r.herb] -= n;
    player.coins -= r.coins * n;
    if (!NUMERIC_V2 || type === 'cha') player.stats[r.stat] += gain * n;   // 新制的戰鬥屬性由服用顆數計算（numeric.js），不改 player.stats
    used[type] = (used[type] || 0) + n;
    const gainText = (NUMERIC_V2 && type !== 'cha') || !Number.isInteger(gain * n) ? (+(gain * n).toFixed(1)).toWan() : (gain * n).toWan();
    addDailyProgress('craft', n);
    addLog(`🧪 煉製並服用 ${n} 顆【${r.name}】，${r.statName} +${gainText}！`, "heal");
    showCraftSuccess(`煉成【${r.name}】×${n.toWan()}`, `已服用，${r.statName} +${gainText}（累計服用 ${used[type].toWan()}${max < Infinity ? ` / ${max}` : ''} 顆）`);
    renderPillUsed();
    updateUI();
}
