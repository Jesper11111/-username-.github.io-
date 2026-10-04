// 功德、陣營與善惡值：斬殺敵對陣營修士取得功德 → 滿額自動凝結七彩補天石 → 千寶閣購買珍貴物資（破障丹）
// 數值見 config-merit.js；野外修士的生成在 combat.js，懸賞榜與對決在 bounty.js，破障丹的效果在 tribulation.js

// 「獵殺邪修」活動是否已解鎖（聲望＋境界，條件在 config-activities.js）
// implemented: false（暫停開放）時一律視為未解鎖：野外不會出現修士、離線也不累積功德
function isEvilHuntUnlocked() {
    const act = activityData.find(a => a.id === "evil");
    return !!act && act.implemented && getActivityLockReason(act) === null;
}

// 功德系統是否開放（獵殺邪修活動 implemented）。暫停時千寶閣不顯示珍貴物資區、渡劫也不提醒破障丹，
// 避免引導玩家去買拿不到的東西；已持有的破障丹仍會在渡劫時生效
function isMeritSystemOpen() {
    const act = activityData.find(a => a.id === "evil");
    return !!act && act.implemented;
}

// ---- 陣營：依已拜入的宗門（config-sects.js 的 faction）與學會的仙法（config-spells.js 的 faction）判定 ----
// 回傳 "正" 或 "邪"；同分（含散修、什麼都沒學）算正派
function getPlayerFaction() {
    let score = { "正": 0, "邪": 0 };
    [1, 2, 3].forEach(tier => {
        let sect = player.sectSkills && player.sectSkills[tier] ? findSectByName(player.sectSkills[tier]) : null;
        if (sect) score[sect.faction === "邪" ? "邪" : "正"] += FACTION_SECT_WEIGHT;
    });
    (player.spells || []).forEach(id => {
        let sp = getSpell(id);
        if (sp) score[sp.faction === "邪" ? "邪" : "正"] += 1;
    });
    return score["邪"] > score["正"] ? "邪" : "正";
}

function getOpposingFaction(faction) {
    return faction === "邪" ? "正" : "邪";
}

function getFactionLabel(faction) {
    return faction === "邪" ? "邪派" : "正派";
}

// ---- 善惡值 ----
function getKarmaState() {
    let k = player.karma || 0;
    if (k >= KARMA_GOOD_THRESHOLD) return { key: "good", label: "善", color: "#60a5fa" };
    if (k <= KARMA_EVIL_THRESHOLD) return { key: "evil", label: "惡", color: "#f87171" };
    return { key: "neutral", label: "中立", color: "#9ca3af" };
}

// 介面只顯示「善／中立／惡」，不顯示數值
function formatKarmaTag() {
    let s = getKarmaState();
    return `<span class="karma-tag karma-${s.key}" title="善惡：殺邪派人士偏善、殺正派人士偏惡">${s.label}</span>`;
}

// 善惡值變化；跨過門檻時寫日誌提醒（善 → 邪派會來暗殺；惡 → 正派會來獵殺）
function addKarma(delta) {
    let before = getKarmaState().key;
    player.karma = Math.max(-KARMA_MAX, Math.min(KARMA_MAX, (player.karma || 0) + delta));
    let after = getKarmaState();
    if (after.key === before) return;
    if (after.key === "good") addLog(`🔵 你斬妖除魔之名傳遍四方，善名遠揚！邪派人士開始暗中派人刺殺你……`, "level-up");
    else if (after.key === "evil") addLog(`🔴 你殺孽深重，已被正道視為魔頭！正派人士將會進入野外獵殺你……`, "combat");
    else addLog(`⚪ 你的善惡歸於中立，不再有人專程追殺你。`, "system");
}

// ---- 野外修士 ----
function rollFieldMerit() {
    let merit = FIELD_MERIT_MIN + Math.floor(Math.random() * (FIELD_MERIT_MAX - FIELD_MERIT_MIN + 1));
    return Math.floor(merit * (1 + gearFx("積德")));   // 積德（裝備特效，gear.js）
}

// 斬殺一名修士（野外修士、暗殺者；懸賞人物另由 bounty.js 結算）：
// 殺邪派 → 善、殺正派 → 惡；只有「敵對陣營」才給功德（邪派玩家的說法是吸取對方功德）
function onCultivatorKilled(faction, isAmbush) {
    let k = isAmbush ? KARMA_PER_AMBUSH_KILL : KARMA_PER_FIELD_KILL;
    addKarma(faction === "邪" ? k : -k);
    player.evilKills = (player.evilKills || 0) + 1;
    return faction !== getPlayerFaction() ? rollFieldMerit() : 0;
}

// 功德每滿 MERIT_PER_BUTIAN_STONE 自動凝結一顆七彩補天石；回傳凝結的顆數
function settleMeritStones() {
    let n = Math.floor((player.merit || 0) / MERIT_PER_BUTIAN_STONE);
    if (n <= 0) return 0;
    player.merit -= n * MERIT_PER_BUTIAN_STONE;
    player.butianStones = (player.butianStones || 0) + n;
    addLog(`💎 功德圓滿，${(n * MERIT_PER_BUTIAN_STONE).toWan()} 點功德凝結為 ${n} 顆【七彩補天石】！（持有 ${player.butianStones} 顆）`, "level-up", false, "item");
    return n;
}

// ---- 獵殺邪修（活動選單的視窗）：陣營與善惡說明 + 懸賞榜（bounty.js）----
// 殺手殿堂場景（活動「獵殺邪修」的入口）：全螢幕背景圖＋中央匾額，點匾額開啟懸賞榜 openEvilHuntModal()
function openEvilHallScene() {
    document.getElementById('evil-hall-scene').style.display = 'block';
}

function closeEvilHallScene() {
    document.getElementById('evil-hall-scene').style.display = 'none';
}

function openEvilHuntModal() {
    refreshBountyIfDue();
    renderEvilHunt();
    document.getElementById('evil-hunt-modal').style.display = 'flex';
}

function renderEvilHunt() {
    const container = document.getElementById('evil-hunt-container');
    if (!container) return;
    let faction = getPlayerFaction();
    let foe = getOpposingFaction(faction);
    let karma = getKarmaState();
    let title = document.getElementById('evil-hunt-title');
    if (title) title.innerText = faction === "邪" ? "🗡️ 截殺正道・懸賞榜" : "🗡️ 獵殺邪修・懸賞榜";

    let ambushText = karma.key === "good" ? `<b style="color:#f87171;">你已是「善」：邪派人士會潛入野外暗殺你！</b>`
                   : karma.key === "evil" ? `<b style="color:#f87171;">你已是「惡」：正派人士會進入野外獵殺你！</b>`
                   : `目前中立，沒有人專程追殺你。`;
    let meritWord = faction === "邪" ? "吸取對方功德" : "積累功德";

    container.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 20px; margin-bottom: 10px; font-size: 0.92em;">
            <span>陣營 <b style="color: ${faction === "邪" ? '#f87171' : '#60a5fa'};">${getFactionLabel(faction)}</b></span>
            <span>善惡 ${formatKarmaTag()}</span>
            <span>🙏 功德 <b style="color: #facc15;">${(player.merit || 0).toWan()}</b> / ${MERIT_PER_BUTIAN_STONE.toWan()}</span>
            <span class="rainbow-text">💎 七彩補天石 ${(player.butianStones || 0).toWan()}</span>
            <span class="rainbow-text">🔮 破障丹 ${(player.breakPills || 0).toWan()}</span>
        </div>
        <details class="evil-hunt-rules">
            <summary>📜 規則說明</summary>
            <p>・陣營依所屬宗門與學會的仙法判定（${sectData.flatMap(c => c.items).filter(s => s.faction === "邪").map(s => s.name).join('、')}與邪道魔功偏邪派），你是<b>${getFactionLabel(faction)}</b>，懸賞榜列出的是 <b>${getFactionLabel(foe)}</b> 人物。</p>
            <p>・懸賞榜每 ${BOUNTY_REFRESH_HOURS} 小時刷新 6 名（天榜 1、地榜 2、人榜 3），境界在你目前境界的 ${BOUNTY_REALM_OFFSET_MIN}～+${BOUNTY_REALM_OFFSET_MAX} 境之間隨機（0.1 境 = 1 階）。<b>點擊「接取」後</b>，在野外歷練時才有機會遇上對方並展開一對一對決；斬殺可${meritWord} ${BOUNTY_MERIT_MIN}～${BOUNTY_MERIT_MAX.toWan()}（不論強弱）。落敗視同戰死，懸賞保留可再挑戰。</p>
            <p>・天榜比心魔更強，擅長吸血、退魔（吸走靈力）與各種削弱武學；地榜約天榜 8 成、人榜約 6 成實力。</p>
            <p>・野外偶爾會遇到正道或魔道修士（不是每波都有）：斬殺敵對陣營可得 ${FIELD_MERIT_MIN}～${FIELD_MERIT_MAX} 功德，同陣營不給功德。</p>
            <p>・善惡：殺邪派人士偏「善」、殺正派人士偏「惡」。${ambushText}</p>
            <p>・身上功德每滿 ${MERIT_PER_BUTIAN_STONE.toWan()} 自動凝結 1 顆七彩補天石，可到千寶閣購買破障丹（渡劫勝算 +10%）。</p>
        </details>
        ${renderBountyBoard()}
        <p style="color: #9ca3af; font-size: 0.8em; margin-top: 10px;">累計斬殺修士 ${(player.evilKills || 0).toWan()} 名｜懸賞伏誅 ${(player.bountyKills || 0).toWan()} 名</p>`;
}

// ---- 千寶閣「珍貴物資」區（由 auction.js 的 renderAuction 嵌入）----
function renderPreciousSection() {
    if (!isMeritSystemOpen()) return '';
    const stone = preciousItems.butianStone;
    const pill = preciousItems.breakPill;
    const canPill = Math.floor(player.butianStones / BREAK_PILL_STONE_COST);
    return `
        <h3 class="rainbow-text" style="margin: 22px 0 6px;">✨ 珍貴物資（常駐）</h3>
        <p style="color: #9ca3af; font-size: 0.82em; margin: 0 0 10px;">
            持有：🙏 功德 <b style="color: #facc15;">${(player.merit || 0).toWan()}</b> / ${MERIT_PER_BUTIAN_STONE.toWan()}｜💎 七彩補天石 <b>${player.butianStones.toWan()}</b>｜🔮 破障丹 <b>${player.breakPills.toWan()}</b>
        </p>
        <div class="grid-container">
            <div class="card rainbow-glow">
                <h3 class="rainbow-text">${stone.icon} ${stone.name}</h3>
                <p style="font-size: 0.8em; color: #9ca3af;">${stone.desc}</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">功德滿 ${MERIT_PER_BUTIAN_STONE.toWan()} 自動凝結</p>
            </div>
            <div class="card rainbow-glow">
                <h3 class="rainbow-text">${pill.icon} ${pill.name}</h3>
                <p style="font-size: 0.8em; color: #9ca3af;">${pill.desc}</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">價格：${BREAK_PILL_STONE_COST} 顆七彩補天石</p>
                <div class="batch-btns">
                    <button class="sys-btn" ${canPill < 1 ? 'disabled' : ''} onclick="buyBreakPill(1)">×1</button>
                    <button class="sys-btn" ${canPill < 10 ? 'disabled' : ''} onclick="buyBreakPill(10)">×10</button>
                    <button class="sys-btn" ${canPill < 1 ? 'disabled' : ''} onclick="buyBreakPill('max')">最高</button>
                </div>
            </div>
            ${renderAptitudePillCards()}
            ${renderSpiritFruitCard()}
        </div>`;
}

// qty：1、10 或 'max'
function buyBreakPill(qty = 1) {
    let affordable = Math.floor(player.butianStones / BREAK_PILL_STONE_COST);
    if (affordable <= 0) {
        gameAlert(`七彩補天石不足！購買 1 顆破障丹需要 ${BREAK_PILL_STONE_COST} 顆（目前 ${player.butianStones}）。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "購買");
    if (!n) return;
    player.butianStones -= BREAK_PILL_STONE_COST * n;
    player.breakPills += n;
    addLog(`🔮 於千寶閣以 ${BREAK_PILL_STONE_COST * n} 顆七彩補天石購得 ${n} 顆【破障丹】！渡劫時將自動服用。`, "level-up", false, "item");
    toastBought(`破障丹 ×${n}`);
    renderAuction();
    updateUI();
}
