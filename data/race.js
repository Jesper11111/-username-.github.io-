// 種族剋制（config-race.js；ARCHITECTURE.md 第 62 節）：種族標籤、剋制加成、斬妖錄（擊殺數）與顯示

// 種族文字，例：「👻鬼物」；沒有種族（人修）回傳空字串
function raceTag(race) { const r = RACES[race]; return r ? `${r.icon}${r.name}` : ''; }

// ---- 敵人的種族特性（config-race.js 的 RACE_TRAITS，第 2 期）----
function raceTrait(race) { return (race && RACE_TRAITS[race]) || {}; }
function raceHpMult(race) { return raceTrait(race).hpMult || 1; }
// 把特性加到敵人的 attrs 上（閃避、不中毒、吸血）；氣血倍率由呼叫端乘（raceHpMult）。回傳同一個 attrs
function applyRaceTraits(attrs) {
    const t = raceTrait(attrs && attrs.race);
    if (t.eva) attrs.eva = (attrs.eva || 0) + t.eva;
    if (t.poisonImmune) attrs.poisonImmune = true;
    if (t.lifesteal) attrs.lifesteal = t.lifesteal;
    return attrs;
}
// 魔修吸血：敵人打中玩家 dealt 點後回復的氣血（沒有吸血回傳 0）
function raceLifestealHeal(attrs, dealt) { return attrs && attrs.lifesteal && dealt > 0 ? dealt * attrs.lifesteal : 0; }
// 野外收益補償用：這張圖的種族特性讓「殺一隻要幾回合」平均變成幾倍（依出現比例；baseEva＝地圖分類的妖獸閃避、hit＝一般玩家命中）
function fieldRaceKillMult(map, baseEva, hit) {
    const c = fieldRaceCounts(map), total = Object.values(c).reduce((s, v) => s + v, 0);
    if (!total) return 1;
    const through = e => 1 - evaDodge(e - hit);   // 閃避曲線（numeric.js，第 66 節第 4 期）
    let sum = 0;
    Object.keys(c).forEach(k => { const t = raceTrait(k); sum += c[k] / total * raceHpMult(k) * through(baseEva) / through(baseEva + (t.eva || 0)); });
    return sum;
}

// ---- A 斬妖錄：player.raceKills = { beast, ghost, demon, heart } ----
function getRaceKills(race) { return (player.raceKills && player.raceKills[race]) || 0; }
function addRaceKill(race, n) {
    if (!RACES[race] || !(n > 0)) return;
    if (!player.raceKills) player.raceKills = {};
    const before = getRaceSlayTier(race);
    player.raceKills[race] = getRaceKills(race) + n;
    const after = getRaceSlayTier(race);
    if (after > before) {
        const t = RACE_SLAY_TIERS[race][after - 1];
        addLog(`📕 斬妖錄：累計斬殺${raceTag(race)} ${t.kills.toWan()}，對${RACES[race].name}傷害永久 +${Math.round(t.bonus * 100)}%！`, "level-up");
    }
}
// 已達成第幾階（0＝未達成）
function getRaceSlayTier(race) {
    const k = getRaceKills(race);
    return (RACE_SLAY_TIERS[race] || []).filter(t => k >= t.kills).length;
}
function getRaceSlayBonus(race) {
    const tier = getRaceSlayTier(race);
    return tier ? RACE_SLAY_TIERS[race][tier - 1].bonus : 0;
}

// 對各族的剋制加成（合計後套 RACE_DMG_CAP）；elements.js 的 getPlayerCombatAttrs 放進 attrs.raceDmg，resolveHit 依對方 attrs.race 套用
// 來源：A 斬妖錄、B 剋制符（talisman.js，自己上限 +20%）、C 剋制法寶（法寶欄，自己上限 +15%）；之後的裝備特效也加在這裡
function getRaceDmgBonus() {
    const out = {};
    const tal = typeof getRaceTalismanBonus === 'function' ? getRaceTalismanBonus() : {};
    const tr = getRaceTreasureBonus(), gr = getRaceGearBonus();
    RACE_KEYS.forEach(k => { out[k] = Math.min(RACE_DMG_CAP, getRaceSlayBonus(k) + (tal[k] || 0) + (tr[k] || 0) + (gr[k] || 0)); });
    return out;
}

// ---- D 裝備種族特效（config-race.js 的 RACE_GEAR，第 5 期）：eq.raceFx = { race, v } ----
function rollRaceGearFx(quality) {
    const range = RACE_GEAR.value[quality];
    if (!range) return null;
    const race = RACE_KEYS[Math.floor(Math.random() * RACE_KEYS.length)];
    return { race, v: +(range[0] + (range[1] - range[0]) * Math.random()).toFixed(4) };
}
// ① 新掉落：createGearEquip 產生紫／橙裝時呼叫
function maybeAddRaceGearFx(eq) {
    const c = RACE_GEAR.dropChance[eq.quality];
    if (c && Math.random() < c) eq.raceFx = rollRaceGearFx(eq.quality);
    return eq;
}
// ③ 白金進化：必定帶一條；已有的保留種族、數值換成白金範圍
function applyEvolveRaceGearFx(eq) {
    const fx = rollRaceGearFx(eq.quality);
    if (!fx) return;
    if (eq.raceFx && RACES[eq.raceFx.race]) fx.race = eq.raceFx.race;
    eq.raceFx = fx;
}
// 穿戴中裝備的合計，各族上限 RACE_GEAR.cap
function getRaceGearBonus() {
    const out = {};
    if (typeof player === 'undefined' || !player || !player.equipment) return out;
    for (const slot in player.equipment) {
        const fx = player.equipment[slot] && player.equipment[slot].raceFx;
        if (fx && RACES[fx.race]) out[fx.race] = (out[fx.race] || 0) + fx.v;
    }
    for (const k in out) out[k] = Math.min(RACE_GEAR.cap, out[k]);
    return out;
}
// 裝備卡片的一行（gear.js 的 formatEquipDetails）
function formatRaceGearFx(eq) {
    const fx = eq && eq.raceFx;
    if (!fx || !RACES[fx.race]) return '';
    return `<p style="font-size: 0.8em; color: #fb7185;">⚔️ 種族特效：對${raceTag(fx.race)}傷害 +${+(fx.v * 100).toFixed(1)}%</p>`;
}
// ② 重鑄（強化視窗）：紫色以上可銘刻，重抽種族與數值
function raceReforgeCost() { return { iron: RACE_GEAR.reforge.iron, coins: Math.floor(getHourlyIncome() * RACE_GEAR.reforge.coinsHours) }; }
function renderRaceReforgeSection(eq) {
    if (!RACE_GEAR.value[eq.quality]) return '';
    const c = raceReforgeCost(), ok = (player.starIron || 0) >= c.iron && player.coins >= c.coins;
    const r = RACE_GEAR.value[eq.quality];
    return `<div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 10px; padding-top: 8px;">
        <p style="color: #fb7185;">🔮 種族銘刻：${eq.raceFx ? '重抽' : '刻上'}一條種族特效（四族隨機，${formatQualityLabel(eq.quality)} +${r[0] * 100}～${r[1] * 100}%）</p>
        <p>每次花費：🌠 ${c.iron} 星允鐵 ＋ ${c.coins.toWan()} 靈石</p>
        <button class="sys-btn" ${ok ? '' : 'disabled'} onclick="reforgeRaceGearFx()">🔮 ${eq.raceFx ? '重新銘刻' : '銘刻'}</button>
    </div>`;
}
async function reforgeRaceGearFx() {
    const loc = enhanceEquipId && locateEquip(enhanceEquipId);
    if (!loc || !RACE_GEAR.value[loc.eq.quality]) return;
    const eq = loc.eq, c = raceReforgeCost();
    if ((player.starIron || 0) < c.iron || player.coins < c.coins) { gameAlert('星允鐵或靈石不足！'); return; }
    if (eq.raceFx && !(await gameConfirm(`重新銘刻會取代目前的「對${raceTag(eq.raceFx.race)} +${+(eq.raceFx.v * 100).toFixed(1)}%」，確定？`))) return;
    player.starIron -= c.iron;
    player.coins -= c.coins;
    player.ironUsed = (player.ironUsed || 0) + c.iron;
    eq.raceFx = rollRaceGearFx(eq.quality);
    addLog(`🔮 【${getEquipDisplayName(eq)}】銘刻種族特效：對${raceTag(eq.raceFx.race)}傷害 +${+(eq.raceFx.v * 100).toFixed(1)}%。`, "system", false, "item");
    renderEnhanceModal();
    refreshEquipViews();
    updateUI();
}

// ---- C 剋制法寶（config-race.js 的 RACE_TREASURES；角色裝備視窗的法寶欄 2 格）----
// 舊存檔沒有欄位時補上；順便清掉法寶欄裡已不存在的 id
function raceTreasureState() {
    if (!Array.isArray(player.raceTreasures)) player.raceTreasures = [];
    if (!Array.isArray(player.raceTreasureSlots)) player.raceTreasureSlots = [];
    for (let i = 0; i < RACE_TREASURE_SLOTS; i++) {
        const id = player.raceTreasureSlots[i];
        if (id == null || !player.raceTreasures.some(t => t.id === id)) player.raceTreasureSlots[i] = null;
    }
    player.raceTreasureSlots.length = RACE_TREASURE_SLOTS;
    return player.raceTreasures;
}
function raceTreasureName(t) {
    const g = RACE_TREASURE_GRADES[t.grade] || RACE_TREASURE_GRADES[0], r = RACE_TREASURES[t.race];
    return `${r.icon}${g.name}${r.name}`;
}
// 例：「🏺下品降妖葫蘆（對🐉妖獸 +5%）」；html＝品階上色
function formatRaceTreasure(t, html) {
    const g = RACE_TREASURE_GRADES[t.grade] || RACE_TREASURE_GRADES[0];
    const txt = `${raceTreasureName(t)}（對${raceTag(t.race)} +${Math.round(g.bonus * 100)}%）`;
    return html ? `<span style="color:${g.color}">${txt}</span>` : txt;
}
function isRaceTreasureWorn(id) { return raceTreasureState() && player.raceTreasureSlots.includes(id); }
// 法寶欄穿戴中的加成，各族合計後套 RACE_TREASURE_CAP
function getRaceTreasureBonus() {
    const out = {};
    if (typeof player === 'undefined' || !player) return out;
    const list = raceTreasureState();
    player.raceTreasureSlots.forEach(id => {
        const t = id != null && list.find(x => x.id === id);
        if (t) out[t.race] = (out[t.race] || 0) + (RACE_TREASURE_GRADES[t.grade] || RACE_TREASURE_GRADES[0]).bonus;
    });
    Object.keys(out).forEach(k => { out[k] = Math.min(RACE_TREASURE_CAP, out[k]); });
    return out;
}
// 取得一件法寶（source 寫在日誌，例：「鎮壓鎮魔塔第 10 層，」）；持有已滿時自動出售。回傳法寶物件或 null
function grantRaceTreasure(race, grade, source) {
    if (!RACE_TREASURES[race]) return null;
    const list = raceTreasureState();
    const t = { id: `rt${Date.now()}_${Math.floor(Math.random() * 1e6)}`, race, grade: Math.max(0, Math.min(RACE_TREASURE_GRADES.length - 1, grade | 0)) };
    if (list.length >= RACE_TREASURE_MAX) {
        const coins = raceTreasureSellPrice(t);
        player.coins += coins;
        addLog(`🏺 ${source || ''}得到${formatRaceTreasure(t)}，但法寶已滿 ${RACE_TREASURE_MAX} 件，自動出售得 ${coins.toWan()} 靈石。`, "system", false, "item");
        return null;
    }
    list.push(t);
    addLog(`🏺 ${source || ''}得到剋制法寶【${formatRaceTreasure(t)}】！可在角色裝備視窗的法寶欄穿上。`, "level-up", false, "item");
    return t;
}
// 野外掉落：擊殺 n 隻 race 族的敵人（線上 n＝1 逐隻擲；離線用期望值，整數部分必得、小數部分擲一次）
function rollRaceTreasureDrops(race, n) {
    if (!RACE_TREASURES[race] || !(n > 0)) return;
    const F = RACE_TREASURE_FIELD, exp = n * F.chance;
    const drops = Math.floor(exp) + (Math.random() < exp - Math.floor(exp) ? 1 : 0);
    for (let i = 0; i < drops; i++) grantRaceTreasure(race, Math.random() < F.midChance ? 1 : 0, '野外斬殺' + RACES[race].name + '，');
}
// 離線依這張圖的種族比例擲法寶（save.js，同 addFieldRaceKills）
function addFieldRaceTreasureDrops(map, n) {
    const c = fieldRaceCounts(map), total = Object.values(c).reduce((s, v) => s + v, 0);
    if (!total || !(n > 0)) return;
    RACE_KEYS.forEach(k => { if (c[k]) rollRaceTreasureDrops(k, n * c[k] / total); });
}
// 鎮魔塔樓主層（個位數 0）的首勝法寶品階；不是樓主層回傳 -1
function zhenmoTreasureGrade(floor) {
    if (floor % 10 !== 0) return -1;
    const g = RACE_TREASURE_ZHENMO.find(x => floor <= x.to);
    return g ? g.grade : RACE_TREASURE_GRADES.length - 1;
}
function raceTreasureSellPrice(t) {
    return Math.floor(incomeMinutes((RACE_TREASURE_GRADES[t.grade] || RACE_TREASURE_GRADES[0]).sellMinutes));
}

// ---- 法寶欄操作（角色裝備視窗，equip-compare.js 的 renderEquipDoll 呼叫 renderRaceTreasurePanel）----
let raceTreasureSel = 0;   // 目前選的法寶欄格子
function refreshRaceTreasureUI() {
    if (typeof renderEquipDoll === 'function') renderEquipDoll();
    updateUI();
}
function selectRaceTreasureSlot(i) { raceTreasureSel = i; refreshRaceTreasureUI(); }
function wearRaceTreasure(id) {
    raceTreasureState();
    const slots = player.raceTreasureSlots;
    const old = slots.indexOf(id);
    if (old >= 0) slots[old] = null;   // 從另一格移過來
    slots[raceTreasureSel] = id;
    refreshRaceTreasureUI();
}
function unwearRaceTreasure(i) { raceTreasureState(); player.raceTreasureSlots[i] = null; refreshRaceTreasureUI(); }
async function sellRaceTreasure(id) {
    const list = raceTreasureState(), t = list.find(x => x.id === id);
    if (!t || isRaceTreasureWorn(id)) return;
    const coins = raceTreasureSellPrice(t);
    if (!(await gameConfirm(`出售 ${formatRaceTreasure(t)}，得 ${coins.toWan()} 靈石？`))) return;
    player.raceTreasures = list.filter(x => x.id !== id);
    player.coins += coins;
    addLog(`🏺 出售${formatRaceTreasure(t)}，得 ${coins.toWan()} 靈石。`, "system", false, "item");
    refreshRaceTreasureUI();
}
// 合煉：未穿戴的同族同品 RACE_TREASURE_MERGE 件 → 高一品 1 件
function raceTreasureMergeable(race, grade) {
    return raceTreasureState().filter(t => t.race === race && t.grade === grade && !isRaceTreasureWorn(t.id));
}
function mergeRaceTreasure(race, grade) {
    if (grade >= RACE_TREASURE_GRADES.length - 1) return;
    const pool = raceTreasureMergeable(race, grade);
    if (pool.length < RACE_TREASURE_MERGE) return;
    const use = pool.slice(0, RACE_TREASURE_MERGE).map(t => t.id);
    player.raceTreasures = player.raceTreasures.filter(t => !use.includes(t.id));
    grantRaceTreasure(race, grade + 1, `合煉 ${RACE_TREASURE_MERGE} 件${RACE_TREASURE_GRADES[grade].name}${RACE_TREASURES[race].name}，`);
    refreshRaceTreasureUI();
}
function renderRaceTreasurePanel() {
    const list = raceTreasureState(), slots = player.raceTreasureSlots;
    if (raceTreasureSel >= RACE_TREASURE_SLOTS) raceTreasureSel = 0;
    const bonus = getRaceTreasureBonus();
    const slotHtml = slots.map((id, i) => {
        const t = id != null && list.find(x => x.id === id);
        return `<div class="card" onclick="selectRaceTreasureSlot(${i})" style="cursor:pointer; flex:1; min-width:140px; margin:0; padding:8px; border-color:${i === raceTreasureSel ? 'var(--accent)' : 'rgba(255,255,255,0.08)'};">
            <div style="font-size:0.75em; color:#9ca3af;">法寶欄 ${i + 1}${i === raceTreasureSel ? '・選取中' : ''}</div>
            <div style="font-size:0.88em; margin:4px 0;">${t ? formatRaceTreasure(t, true) : '<span style="color:#6b7280;">（空）</span>'}</div>
            ${t ? `<button class="sys-btn rt-btn" onclick="event.stopPropagation(); unwearRaceTreasure(${i})">卸下</button>` : ''}
        </div>`;
    }).join('');
    // 背包：同族同品疊成一行（未穿戴的件數）
    const groups = [];
    RACE_KEYS.forEach(race => RACE_TREASURE_GRADES.forEach((g, grade) => {
        const items = list.filter(t => t.race === race && t.grade === grade && !isRaceTreasureWorn(t.id));
        if (items.length) groups.push({ race, grade, items });
    }));
    const rows = groups.length ? groups.map(({ race, grade, items }) => {
        const t = items[0], canMerge = grade < RACE_TREASURE_GRADES.length - 1 && items.length >= RACE_TREASURE_MERGE;
        return `<div class="eqd-cand" style="cursor:default;">
            <div class="eqd-nm">${formatRaceTreasure(t, true)} ×${items.length}<small>出售每件 ${raceTreasureSellPrice(t).toWan()} 靈石</small></div>
            <span style="display:flex; gap:4px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="sys-btn rt-btn" onclick="wearRaceTreasure('${t.id}')">穿到第 ${raceTreasureSel + 1} 格</button>
                ${canMerge ? `<button class="sys-btn rt-btn" onclick="mergeRaceTreasure('${race}', ${grade})">合煉↑</button>` : ''}
                <button class="sys-btn rt-btn" onclick="sellRaceTreasure('${t.id}')">出售</button>
            </span></div>`;
    }).join('') : `<div class="eqd-hint">還沒有剋制法寶：鎮魔塔樓主層（10、20…100 層）首次擊敗必得、野外擊殺妖獸／鬼物／邪修稀有掉落、千寶閣每日限購。</div>`;
    const bonusTxt = RACE_KEYS.filter(k => bonus[k]).map(k => `${raceTag(k)} +${Math.round(bonus[k] * 100)}%`).join('｜');
    return `<div class="eqd-sheet-head">🏺 剋制法寶欄<span>持有 ${list.length} / ${RACE_TREASURE_MAX}</span></div>
        <div class="eqd-hint">穿上才生效，對該族傷害提高（法寶對同一族合計上限 +${Math.round(RACE_TREASURE_CAP * 100)}%，不計入戰力）。${RACE_TREASURE_MERGE} 件同族同品可合煉成高一品。${bonusTxt ? `<br>目前：<b style="color:#4ade80">${bonusTxt}</b>` : ''}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin:6px 0;">${slotHtml}</div>
        <div class="eqd-list">${rows}</div>`;
}

// ---- 千寶閣常駐：剋制法寶（auction.js 的 renderAuction 呼叫）----
function raceTreasureShopState() {
    const today = new Date(gameNow()).toDateString();
    if (!player.raceTreasureShop || player.raceTreasureShop.date !== today) player.raceTreasureShop = { date: today, bought: 0 };
    return player.raceTreasureShop;
}
function raceTreasureShopPrice() { return Math.floor(getHourlyIncome() * RACE_TREASURE_SHOP.priceHours); }
function renderRaceTreasureShopSection() {
    const S = RACE_TREASURE_SHOP, st = raceTreasureShopState(), left = S.dailyLimit - st.bought, price = raceTreasureShopPrice();
    const g = RACE_TREASURE_GRADES[S.grade];
    const can = left > 0 && player.coins >= price;
    const btns = RACE_KEYS.map(k => `<button class="sys-btn" ${can ? '' : 'disabled'} onclick="buyRaceTreasure('${k}')">${RACE_TREASURES[k].icon}${RACE_TREASURES[k].name}</button>`).join('');
    return `
        <h3 style="margin: 22px 0 6px; color: var(--accent);">🏺 剋制法寶（常駐・每日限購）</h3>
        <div class="grid-container">
            <div class="card" style="border-color: ${g.color};">
                <h3 style="color: ${g.color};">🏺 ${g.name}剋制法寶</h3>
                <p style="font-size: 0.8em; color: #9ca3af;">穿在角色裝備視窗的法寶欄，對該族傷害 +${Math.round(g.bonus * 100)}%。四族任選：${RACE_KEYS.map(k => `${RACE_TREASURES[k].name}＝${raceTag(k)}`).join('、')}。</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0;">每件 ${price.toWan()} 靈石｜今日剩 ${Math.max(0, left)} / ${S.dailyLimit} 件</p>
                <div class="batch-btns">${btns}</div>
            </div>
        </div>`;
}
function buyRaceTreasure(race) {
    const S = RACE_TREASURE_SHOP, st = raceTreasureShopState(), price = raceTreasureShopPrice();
    if (st.bought >= S.dailyLimit) { gameAlert('今日限購已滿，明天再來！'); return; }
    if (player.coins < price) { gameAlert('靈石不足！'); return; }
    if (raceTreasureState().length >= RACE_TREASURE_MAX) { gameAlert(`法寶已滿 ${RACE_TREASURE_MAX} 件，請先出售或合煉。`); return; }
    player.coins -= price;
    st.bought++;
    const t = grantRaceTreasure(race, S.grade, `於千寶閣以 ${price.toWan()} 靈石購得，`);
    if (t) toastBought(raceTreasureName(t));
    renderAuction();
    updateUI();
}

// 人物面板的一行，例：「剋制 🐉妖獸 +4%｜👻鬼物 +2%」；全部 0 時回傳空字串
function formatRaceDmgLine() {
    const b = getRaceDmgBonus();
    const parts = RACE_KEYS.filter(k => b[k] > 0).map(k => `${raceTag(k)} +${Math.round(b[k] * 100)}%`);
    return parts.join('｜');
}

// 野外妖獸的種族比例（依這張圖的出沒組合權重，monster.js 的 fieldMonsterPool，combat.js 同規則）：例 { beast: 7, ghost: 3 }
function fieldRaceCounts(map) {
    const out = {};
    fieldMonsterPool(map).forEach(x => { out[x.m.race] = (out[x.m.race] || 0) + x.w; });
    return out;
}
function formatFieldRaceMix(map) {
    const c = fieldRaceCounts(map), total = Object.values(c).reduce((s, v) => s + v, 0);
    return RACE_KEYS.filter(k => c[k]).map(k => `${raceTag(k)} ${Math.round(c[k] / total * 100)}%`).join('、');
}
// 離線擊殺依比例計入斬妖錄（save.js）
function addFieldRaceKills(map, n) {
    const c = fieldRaceCounts(map), total = Object.values(c).reduce((s, v) => s + v, 0);
    if (!total || !(n > 0)) return;
    RACE_KEYS.forEach(k => { if (c[k]) addRaceKill(k, Math.round(n * c[k] / total)); });
}

// 鎮魔塔 BOSS 的種族：手動設定的 race 優先，否則依名稱後綴（config-race.js）
function zhenmoBossRace(boss) {
    if (!boss) return null;
    if (boss.race) return boss.race;
    const key = Object.keys(ZHENMO_RACE_BY_SUFFIX).find(s => (boss.name || '').endsWith(s));
    return key ? ZHENMO_RACE_BY_SUFFIX[key] : null;
}

// ---- 天磯錄「📕 斬妖錄」分頁（codex.js）----
function renderCodexRaces() {
    const bonus = getRaceDmgBonus();
    const cards = RACE_KEYS.map(k => {
        const r = RACES[k], kills = getRaceKills(k), tiers = RACE_SLAY_TIERS[k], tier = getRaceSlayTier(k);
        const next = tiers[tier];
        const rows = tiers.map((t, i) => `<div style="font-size: 0.8em; color: ${i < tier ? '#4ade80' : '#6b7280'};">${i < tier ? '✅' : '⬜'} 斬殺 ${t.kills.toWan()}：對${r.name}傷害 +${Math.round(t.bonus * 100)}%</div>`).join('');
        const pct = next ? Math.min(100, kills / next.kills * 100) : 100;
        return `<div class="card" style="border-color: ${tier ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.06)'};">
            <h3 style="color: var(--accent);">${r.icon} ${r.name}</h3>
            <p style="font-size: 0.78em; color: #9ca3af;">${r.desc}</p>
            <p style="font-size: 0.78em; color: #f87171;">種族特性：${raceTrait(k).desc}</p>
            <p style="font-size: 0.85em;">累計斬殺 <b>${kills.toWan()}</b>${next ? `／下一階 ${next.kills.toWan()}` : '（已滿階）'}</p>
            <div class="partner-bar-track" style="margin: 4px 0 6px;"><div class="partner-bar-fill" style="width: ${pct}%; background: var(--accent);"></div></div>
            ${rows}
            <p style="font-size: 0.82em; color: #4ade80; margin-top: 6px;">目前對${r.name}傷害 +${Math.round(bonus[k] * 100)}%（所有來源合計上限 +${Math.round(RACE_DMG_CAP * 100)}%）</p>
        </div>`;
    }).join('');
    return `<p style="color: #9ca3af; font-size: 0.82em; text-align: center;">斬殺四族敵人會記錄在斬妖錄，達到門檻後對該族的傷害永久提高（取最高一階）。<br>
        妖獸、鬼物：野外；魔修：邪修、暗殺者、邪派懸賞、守城首領、鎮魔塔魔頭；心魔：渡劫與鎮魔塔。<br>
        另可在符寶坊煉製剋制符（斬妖符、鎮魂符、誅邪符、清心符）鑲在穿戴的裝備上；<br>
        剋制法寶（降妖葫蘆、鎮魂鈴、誅魔鏡、清心蓮台）穿在角色裝備視窗的法寶欄，來自鎮魔塔樓主層首勝、野外掉落、千寶閣。剋制只增加傷害，不計入戰力。</p>
        <div class="grid-container">${cards}</div>`;
}
