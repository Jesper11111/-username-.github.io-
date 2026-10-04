// 異火碎片與天下異火：取得、合成、收錄、加成、秘境減傷（ARCHITECTURE.md 第 38 節）；資料在 config-strange-fire.js
// 存檔欄位：player.fireShards（異火碎片）、player.strangeFires（持有異火總朵數，含重複）、
//          player.fireCollection（{ 異火 id: 取得次數 }，天磯錄「異火」分頁），皆轉世保留

const strangeFireById = {};
strangeFireList.forEach(f => { strangeFireById[f.id] = f; });

// 取得異火碎片（秘境掉落時呼叫），回傳實際取得數量
function addFireShards(n, source) {
    n = Math.floor(n);
    if (!(n > 0)) return 0;
    player.fireShards = (player.fireShards || 0) + n;
    if (source) addLog(`🔥 ${source}，獲得異火碎片 ×${n}！（持有 ${player.fireShards.toWan()}）`, "level-up", false, "item");
    return n;
}

// 抽一種異火：先依 weight 抽品階，再從該品階平均抽
function rollStrangeFire() {
    let tiers = Object.keys(STRANGE_FIRE_TIERS);
    let total = tiers.reduce((s, t) => s + STRANGE_FIRE_TIERS[t].weight, 0);
    let r = Math.random() * total;
    let tier = tiers[tiers.length - 1];
    for (let t of tiers) { r -= STRANGE_FIRE_TIERS[t].weight; if (r < 0) { tier = t; break; } }
    let pool = strangeFireList.filter(f => f.tier === tier);
    return pool[Math.floor(Math.random() * pool.length)];
}

// 收下一朵異火（合成與舊存檔補發共用），回傳是否為新收錄
function gainStrangeFire(fire) {
    if (!player.fireCollection) player.fireCollection = {};
    let isNew = !player.fireCollection[fire.id];
    player.fireCollection[fire.id] = (player.fireCollection[fire.id] || 0) + 1;
    return isNew;
}

// 合成異火：qty 為數字或 'max'
function craftStrangeFire(qty) {
    let possible = Math.floor((player.fireShards || 0) / STRANGE_FIRE_SHARDS_PER_FIRE);
    if (possible <= 0) {
        gameAlert(`異火碎片不足！合成 1 朵異火需要 ${STRANGE_FIRE_SHARDS_PER_FIRE} 片（目前 ${(player.fireShards || 0).toWan()} 片）。`);
        return;
    }
    let n = qty === 'max' ? possible : Math.min(qty, possible);
    player.fireShards -= n * STRANGE_FIRE_SHARDS_PER_FIRE;
    player.strangeFires = (player.strangeFires || 0) + n;
    let got = [], fresh = [];
    for (let i = 0; i < n; i++) {
        let fire = rollStrangeFire();
        if (gainStrangeFire(fire)) fresh.push(fire);
        got.push(fire);
    }
    // 日誌：單朵寫名字；多朵依品階統計，並列出新收錄的
    let summary = n === 1 ? `【${got[0].tier}・${got[0].name}】`
        : Object.keys(STRANGE_FIRE_TIERS).map(t => [t, got.filter(f => f.tier === t).length]).filter(([, c]) => c > 0).map(([t, c]) => `${t} ×${c}`).join('、');
    addLog(`☄️ ${(n * STRANGE_FIRE_SHARDS_PER_FIRE).toWan()} 片異火碎片重燃，合成異火 ${summary}！`
        + (fresh.length === 1 ? `新收錄【${fresh[0].name}】：${describeTitleBonus(fresh[0].bonus)}！` : '')
        + (fresh.length > 1 ? `新收錄 ${fresh.length} 種：${fresh.map(f => f.name).join('、')}（加成見天磯錄）！` : '')
        + `（秘境受到傷害 -${Math.round(getStrangeFireRealmReduction() * 100)}%）`, "level-up");
    renderBag();
    updateUI();
}

// 秘境中受到傷害的減免比例（0～STRANGE_FIRE_REALM_REDUCE_MAX），依總朵數（含重複）
// ⚠️ 秘境尚未實作：日後秘境的受擊計算要乘上 (1 - getStrangeFireRealmReduction())，只在秘境生效
function getStrangeFireRealmReduction() {
    return Math.min(STRANGE_FIRE_REALM_REDUCE_MAX, (player.strangeFires || 0) * STRANGE_FIRE_REALM_REDUCE);
}

// 已收錄異火的永久加成（每種一次，重複不疊加），併入 gear.js 的 getBonusTotals
function getStrangeFireBonusTotals() {
    let t = {};
    for (let id in (player.fireCollection || {})) {
        let f = strangeFireById[id];
        if (!f || !(player.fireCollection[id] > 0)) continue;
        for (let k in f.bonus) t[k] = (t[k] || 0) + f.bonus[k];
    }
    return t;
}

function countCollectedFires() {
    return Object.keys(player.fireCollection || {}).filter(id => strangeFireById[id] && player.fireCollection[id] > 0).length;
}

// 舊存檔相容（讀檔／匯入時執行）：合成過「未命名」異火的存檔，把沒有對應收錄的朵數補抽成具名異火
function migrateStrangeFires() {
    if (!player.fireCollection || typeof player.fireCollection !== 'object') player.fireCollection = {};
    let recorded = Object.values(player.fireCollection).reduce((s, c) => s + (c || 0), 0);
    for (let i = recorded; i < (player.strangeFires || 0); i++) gainStrangeFire(rollStrangeFire());
}

// 背包卡片（bag.js 的 renderBag 呼叫）；兩者皆為 0 時不顯示
function renderStrangeFireCards() {
    let shards = player.fireShards || 0;
    let fires = player.strangeFires || 0;
    if (shards <= 0 && fires <= 0) return '';
    let possible = Math.floor(shards / STRANGE_FIRE_SHARDS_PER_FIRE);
    let shard = strangeFireItems.fireShard, fire = strangeFireItems.strangeFire;
    let cards = [];
    if (shards > 0) cards.push(`
        <div class="card" style="border-color: #f97316;">
            <h3 style="color: #f97316;">${shard.icon} ${shard.name} <span style="font-size:0.8em;">(x${shards.toWan()})</span></h3>
            <p style="font-size: 0.85em; color: #9ca3af;">${shard.desc}</p>
            <p style="font-size: 0.85em; color: #f97316;">可合成 ${possible} 朵（${shards % STRANGE_FIRE_SHARDS_PER_FIRE} / ${STRANGE_FIRE_SHARDS_PER_FIRE}）</p>
            <div class="batch-btns">
                <button class="sys-btn" ${possible < 1 ? 'disabled' : ''} onclick="craftStrangeFire(1)">合成 ×1</button>
                <button class="sys-btn" ${possible < 1 ? 'disabled' : ''} onclick="craftStrangeFire('max')">合成 最高</button>
            </div>
        </div>`);
    if (fires > 0) cards.push(`
        <div class="card" style="border-color: #ef4444;">
            <h3 style="color: #ef4444;">${fire.icon} ${fire.name} <span style="font-size:0.8em;">(x${fires.toWan()})</span></h3>
            <p style="font-size: 0.85em; color: #9ca3af;">${fire.desc}</p>
            <p style="font-size: 0.85em; color: #ef4444;">目前秘境受到傷害 -${Math.round(getStrangeFireRealmReduction() * 100)}%${getStrangeFireRealmReduction() >= STRANGE_FIRE_REALM_REDUCE_MAX ? '（已達上限）' : ''}｜已收錄 ${countCollectedFires()} / ${strangeFireList.length} 種</p>
            <button class="sys-btn" onclick="openCodexModal('fires')">📜 查看異火榜（天磯錄）</button>
        </div>`);
    return cards.join('');
}

// 天磯錄「異火」分頁（codex.js 的 renderCodexModal 呼叫）
function renderCodexFires() {
    let col = player.fireCollection || {};
    let tierNames = Object.keys(STRANGE_FIRE_TIERS);
    let odds = tierNames.map(t => `<span style="color: ${STRANGE_FIRE_TIERS[t].color};">${t} ${STRANGE_FIRE_TIERS[t].weight}%</span>`).join('｜');
    let sections = tierNames.map(tier => {
        let list = strangeFireList.filter(f => f.tier === tier);
        let color = STRANGE_FIRE_TIERS[tier].color;
        let got = list.filter(f => col[f.id] > 0).length;
        let cards = list.map(f => {
            let n = col[f.id] || 0;
            if (!n) return `<div class="codex-card unknown"><b style="color: ${color};">？？？</b><small>${tier}・${f.origin}</small><small style="color: #4ade80;">${describeTitleBonus(f.bonus)}</small></div>`;
            return `<div class="codex-card" style="border-color: ${color};">
                <b style="color: ${color};">🔥 ${f.name}${n > 1 ? ` <small>×${n}</small>` : ''}</b>
                <small>${tier}・${f.origin}</small>
                <small>${f.desc}</small>
                <small style="color: #4ade80;">${describeTitleBonus(f.bonus)}</small></div>`;
        }).join('');
        return `<h4 style="color: ${color}; margin: 12px 0 6px;">${tier}（${got} / ${list.length}）</h4><div class="codex-grid">${cards}</div>`;
    }).join('');
    return `<p style="color: #9ca3af; font-size: 0.82em; text-align: center;">
            天下異火 <b style="color: var(--accent);">${countCollectedFires()}</b> / ${strangeFireList.length} 種｜持有 ${(player.strangeFires || 0).toWan()} 朵｜碎片 ${(player.fireShards || 0).toWan()}<br>
            每種收錄後永久加成一次（重複不疊加）；每 ${STRANGE_FIRE_SHARDS_PER_FIRE} 片碎片合成 1 朵，品階機率：${odds}<br>
            異火碎片於秘境取得（目前：秘境「魔屠天南」守城）</p>${sections}`;
}
