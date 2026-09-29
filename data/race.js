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
    const through = e => 1 - Math.max(0, Math.min(95, e - hit)) / 100;
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
// 之後的來源（符寶、法寶、裝備特效）都加在這裡
function getRaceDmgBonus() {
    const out = {};
    RACE_KEYS.forEach(k => { out[k] = Math.min(RACE_DMG_CAP, getRaceSlayBonus(k)); });
    return out;
}

// 人物面板的一行，例：「剋制 🐉妖獸 +4%｜👻鬼物 +2%」；全部 0 時回傳空字串
function formatRaceDmgLine() {
    const b = getRaceDmgBonus();
    const parts = RACE_KEYS.filter(k => b[k] > 0).map(k => `${raceTag(k)} +${Math.round(b[k] * 100)}%`);
    return parts.join('｜');
}

// 野外妖獸的種族比例（依這張圖會出現的 FIELD_MONSTERS，combat.js 同規則）：例 { beast: 5, ghost: 2 }
function fieldRaceCounts(map) {
    const dark = DARK_MAP_CATEGORIES.includes(getMapCategoryIndex(map.name));
    const out = {};
    FIELD_MONSTERS.filter(m => !dark || m.dark).forEach(m => { out[m.race] = (out[m.race] || 0) + 1; });
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
        妖獸、鬼物：野外；魔修：邪修、暗殺者、邪派懸賞、守城首領、鎮魔塔魔頭；心魔：渡劫與鎮魔塔。剋制只增加傷害，不計入戰力。</p>
        <div class="grid-container">${cards}</div>`;
}
