// 天賦樹（設定 config-talents.js；ARCHITECTURE.md 第 68 節）：點數計算、加點、重置、加成彙總、視窗
//   存檔：player.talents = { 節點 id: 點數 }、player.talentRespecs（已重置次數）——舊存檔讀檔時由 state.js 預設值補上
//   加成由 getTalentBonusTotals() 併入 gear.js 的 getBonusTotals()；mult:*／buffCap／crit 等新 key 在 numeric.js、elements.js、enhance.js 讀取

const TALENT_NODE_BY_ID = {};
TALENT_BRANCHES.forEach(b => b.nodes.forEach(n => { n.branch = b.id; TALENT_NODE_BY_ID[n.id] = n; }));

function talentState() {
    if (!player.talents || typeof player.talents !== 'object') player.talents = {};
    return player.talents;
}
// 人物等級給的點數（滿級 64）
function talentPointsFromLevel(level) {
    let pts = 0, prev = 0;
    TALENT_LEVEL_STEPS.forEach(([upto, every]) => {
        const L = Math.min(level, upto);
        if (L > prev) pts += Math.floor((L - prev) / every);
        prev = upto;
    });
    return pts;
}
function talentPointsFromReincarnation(n) { return TALENT_REINCARNATE_POINTS.slice(0, Math.max(0, n || 0)).reduce((a, b) => a + b, 0); }
function talentPointsTotal() { return talentPointsFromLevel(player.level || 1) + talentPointsFromReincarnation(player.reincarnations); }
function talentPointsSpent() { const t = talentState(); return Object.keys(t).reduce((s, k) => s + (TALENT_NODE_BY_ID[k] ? t[k] : 0), 0); }
function talentBranchSpent(branchId) { const t = talentState(); return Object.keys(t).reduce((s, k) => s + (TALENT_NODE_BY_ID[k] && TALENT_NODE_BY_ID[k].branch === branchId ? t[k] : 0), 0); }
function talentKeystonesActive() { const t = talentState(); return Object.keys(t).filter(k => TALENT_NODE_BY_ID[k] && TALENT_NODE_BY_ID[k].keystone && t[k] > 0).length; }
// 點數不夠（例：轉世後等級回 1）就全部退回
function validateTalents() {
    if (talentPointsSpent() > talentPointsTotal()) {
        player.talents = {};
        talentCacheKey = null;
        if (typeof addLog === 'function') addLog('🌳 天賦點數不足（等級降低或轉世），已全部退回，請重新分配。', 'system');
    }
}

// 這個節點現在能不能 +1：回傳 null（可以）或原因
function talentAddBlock(node) {
    const t = talentState(), cur = t[node.id] || 0;
    if (cur >= node.max) return '已點滿';
    if (talentPointsSpent() >= talentPointsTotal()) return '沒有可用點數';
    const need = TALENT_ROW_REQ[node.row] || 0;
    if (talentBranchSpent(node.branch) < need) return `本路線需先投入 ${need} 點`;
    if (node.keystone && cur === 0 && talentKeystonesActive() >= TALENT_KEYSTONE_MAX) return `核心天賦最多同時 ${TALENT_KEYSTONE_MAX} 個`;
    return null;
}
function addTalent(id) {
    const node = TALENT_NODE_BY_ID[id];
    if (!node || talentAddBlock(node)) return;
    const t = talentState();
    t[id] = (t[id] || 0) + 1;
    talentCacheKey = null;
    renderTalentModal();
    updateUI();
}
function talentRespecCost() {
    const n = player.talentRespecs || 0;
    if (n < TALENT_RESPEC_FREE) return 0;
    return Math.floor(getHourlyIncome() * TALENT_RESPEC_COINS_HOURS * Math.min(5, n - TALENT_RESPEC_FREE + 1));
}
async function respecTalents() {
    if (!talentPointsSpent()) return;
    const cost = talentRespecCost();
    if (player.coins < cost) { gameAlert(`靈石不足！重置需要 ${cost.toWan()} 靈石。`); return; }
    if (!(await gameConfirm(`重置全部天賦、退回 ${talentPointsSpent()} 點？${cost ? `\n花費 ${cost.toWan()} 靈石。` : '\n（本次免費）'}`))) return;
    player.coins -= cost;
    player.talentRespecs = (player.talentRespecs || 0) + 1;
    player.talents = {};
    talentCacheKey = null;
    addLog(`🌳 重置天賦${cost ? `，花費 ${cost.toWan()} 靈石` : '（免費）'}。`, 'system');
    renderTalentModal();
    updateUI();
}

// ---- 加成彙總（快取：天賦沒變就不重算；getBonusTotals 每回合會被呼叫很多次）----
let talentCacheKey = null, talentCacheVal = {};
function getTalentBonusTotals() {
    const t = talentState();
    const key = JSON.stringify(t);
    if (key === talentCacheKey) return talentCacheVal;
    const out = {};
    for (const id in t) {
        const n = TALENT_NODE_BY_ID[id], r = t[id] || 0;
        if (!n || r <= 0) continue;
        for (const k in n.per) out[k] = (out[k] || 0) + n.per[k] * (k.startsWith('special:') ? 1 : r);
    }
    talentCacheKey = key; talentCacheVal = out;
    return out;
}
// 獨立倍率（numeric.js 的攻擊、氣血；elements.js 的防禦、閃避）：kind＝phys／mag／hp／def／eva；最低 0
function talentMult(kind) { return Math.max(0, 1 + (getTalentBonusTotals()['mult:' + kind] || 0)); }

// ---- 視窗 ----
let talentTab = TALENT_BRANCHES[0].id;
function openTalentModal() {
    validateTalents();
    document.getElementById('talent-modal').style.display = 'flex';
    renderTalentModal();
}
function setTalentTab(id) { talentTab = id; renderTalentModal(); }
function formatTalentPer(n, r) { return n.desc + (n.max > 1 ? `（每點，目前 ${r} / ${n.max}）` : ''); }
function renderTalentModal() {
    const box = document.getElementById('talent-body');
    if (!box) return;
    const total = talentPointsTotal(), spent = talentPointsSpent(), t = talentState();
    const b = TALENT_BRANCHES.find(x => x.id === talentTab) || TALENT_BRANCHES[0];
    const tabs = TALENT_BRANCHES.map(x => `<button class="sys-btn talent-tab ${x.id === b.id ? 'on' : ''}" style="--tc:${x.color}" onclick="setTalentTab('${x.id}')">${x.icon}${x.name}<small>${talentBranchSpent(x.id)}</small></button>`).join('');
    const rows = [0, 1, 2, 3].map(row => {
        const nodes = b.nodes.filter(n => n.row === row);
        const need = TALENT_ROW_REQ[row];
        const head = `<div class="talent-row-head">${['第一重', '第二重', '第三重・要訣', '第四重・核心（最多同時 ' + TALENT_KEYSTONE_MAX + ' 個）'][row]}${need ? `（需本路線 ${need} 點）` : ''}</div>`;
        return head + `<div class="talent-row">${nodes.map(n => {
            const r = t[n.id] || 0, block = talentAddBlock(n);
            return `<div class="talent-node ${r > 0 ? 'got' : ''} ${n.keystone ? 'key' : n.notable ? 'notable' : ''}" style="--tc:${b.color}">
                <div class="talent-name">${n.keystone ? '◆ ' : n.notable ? '◇ ' : ''}${n.name} <span>${r}/${n.max}</span></div>
                <div class="talent-desc">${formatTalentPer(n, r)}</div>
                <button class="sys-btn" ${block ? 'disabled title="' + block + '"' : ''} onclick="addTalent('${n.id}')">${block && r < n.max ? block : r >= n.max ? '已點滿' : '+1'}</button>
            </div>`;
        }).join('')}</div>`;
    }).join('');
    const lvPts = talentPointsFromLevel(player.level || 1), rePts = talentPointsFromReincarnation(player.reincarnations);
    const cost = talentRespecCost();
    box.innerHTML = `<p class="talent-points">可用 <b>${total - spent}</b> 點（等級 ${lvPts}＋轉世 ${rePts}，已用 ${spent}）・核心天賦 ${talentKeystonesActive()} / ${TALENT_KEYSTONE_MAX}</p>
        <div class="talent-tabs">${tabs}</div>
        <p class="talent-branch-desc" style="color:${b.color}">${b.icon} ${b.name}：${b.desc}</p>
        ${rows}
        <button class="sys-btn" ${spent ? '' : 'disabled'} onclick="respecTalents()" style="margin-top:10px;">↺ 重置全部天賦（${cost ? cost.toWan() + ' 靈石' : '免費'}）</button>
        <p style="color:#6b7280; font-size:0.75em;">點數：Lv.1～100 每 10 級 1 點、100～1000 每 50 級、1000～10000 每 250 級（滿級 64 點）；轉世第 1～3 次各 +3、第 4～9 次各 +1（最多 +15）。
        轉世時等級回 1，天賦會全部退回重新分配。</p>`;
}
// 人物面板一行：「天賦：可用 3 點」
function formatTalentLine() {
    const free = talentPointsTotal() - talentPointsSpent();
    return free > 0 ? `可用 ${free} 點` : `已分配 ${talentPointsSpent()} 點`;
}
