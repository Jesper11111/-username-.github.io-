// 宗門靈田彈窗：消耗靈草+靈石瞬間培育高階靈草（可 ×1 / ×10 / 最高 批次培育）

const herbRecipes = {
    mortal:   { name: "凡品", grass: 10,  coins: 5 },
    high:     { name: "上品", grass: 50,  coins: 10 },
    epic:     { name: "極品", grass: 200, coins: 20 },
    immortal: { name: "仙品", grass: 500, coins: 50 }
};

function openFieldModal() {
    if (!checkSectJoined()) return;
    document.getElementById('field-modal').style.display = 'flex';
}

// qty：1、10 或 'max'
function plantHerb(type, qty = 1) {
    let r = herbRecipes[type];
    if (!r) return;

    let affordable = Math.min(Math.floor(player.spiritGrass / r.grass), Math.floor(player.coins / r.coins));
    if (affordable <= 0) {
        gameAlert(`資源不足！培育 1 株${r.name}靈草需要 ${r.grass} 株靈草 + ${r.coins} 靈石。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "培育");
    if (!n) return;

    player.spiritGrass -= r.grass * n;
    player.coins -= r.coins * n;
    player.herbs[type] += n;
    addDailyProgress('plant', n);
    addLog(`🌾 消耗 ${(r.grass * n).toWan()} 株靈草與 ${(r.coins * n).toWan()} 靈石，在靈田收穫了 ${n} 株【${r.name}靈草】！`, "system", false, "item");
    updateUI();
}
