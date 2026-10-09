// 屠龍勇者：流亡黯道式異界地圖 T1～T15（ARCHITECTURE.md 第 24 節）（依賴 items、zones、monsters、affix、craft、player）
// 地圖是道具（cat 'map'，id map1～map15，不堆疊、不佔負重），實體帶：
//   q 品質（magic 1～2 條／rare 3～4 條，沒有＝普通）、mm 地圖詞綴 key 陣列、nm 名稱前綴
// 在村莊「地圖」頁的「🌀 異界裝置」放入 → player.mapRun 開始一場異界：
//   { t 階級, zone 地區 id, mods, q, total 怪物總數, left 剩幾隻, boss 首領是否已出現 }
// 怪物總數＝200～300 × 數量倍率（成群 +50%、大軍 +100%…，最多 ×3）；殺光後出現異界首領，打倒就通關、掉地圖並回村。
// 戰鬥中所有「地圖詞綴」只在異界裡生效（mapModsOn），離線收益也會推進異界進度。
const MAP_TIERS = 15;
const MAP_MODS = {
    tough:  { name: '強壯', icon: '💪', desc: '怪物 HP +40%', bonus: 0.15 },
    savage: { name: '兇猛', icon: '🩸', desc: '怪物傷害 +30%', bonus: 0.2 },
    swarm:  { name: '成群', icon: '🐺', desc: '怪群上限 +2、怪物數量 +50%', bonus: 0.15, qty: 0.5 },
    horde:  { name: '大軍', icon: '⚔️', desc: '怪物數量 +100%', bonus: 0.1, qty: 1 },
    elite:  { name: '精英', icon: '⭐', desc: '15% 變精英（HP ×3、傷害 ×1.5，經驗 ×4、必掉裝備）', bonus: 0.1 },
    warded: { name: '抗魔', icon: '🔰', desc: '怪物 MR +25', bonus: 0.1 },
    swift:  { name: '迅捷', icon: '💨', desc: '怪物攻速 +25%', bonus: 0.15 },
    blight: { name: '枯竭', icon: '🥀', desc: '你的自然回復 -40%', bonus: 0.1 },
};
const MAP_MOD_KEYS = Object.keys(MAP_MODS);
const MAP_QTY_MAX = 3;
const MAP_DROP_P = 0.004, MAP_DROP_IN_MAP_P = 0.015;   // 一般地圖每隻 0.4%、異界裡每隻 1.5%

// 階級對應的地區：野外＋地監依建議等級排序（14 個），T15 用最後一個並加強 ×1.4
function mapZones() { return ZONES.filter(z => z.type === 'field' || z.type === 'dungeon').sort((a, b) => a.lv[0] - b.lv[0]); }
function mapZoneFor(t) { const zs = mapZones(); return zs[Math.min(t, zs.length) - 1]; }
function mapTierScale(t) { return t > mapZones().length ? 1.4 : 1; }
// 怪物等級對應掉落的地圖階級：建議等級 ≤ 怪物等級的最高階
function mapTierForLv(lv) { let t = 1; mapZones().forEach((z, i) => { if (z.lv[0] <= lv) t = i + 1; }); return t; }

for (let t = 1; t <= MAP_TIERS; t++) {
    const z = mapZoneFor(t);
    ITEMS['map' + t] = { name: `異界地圖 T${t}`, cat: 'map', tier: t, wt: 0, sell: 150 * t * t,
        desc: `放進「異界裝置」開啟「${z.name}」的異界${t > mapZones().length ? '（強化 ×1.4）' : ''}。` };
}

// ───────── 地圖道具 ─────────
function rollMapMods(n, keep = []) {
    const pool = MAP_MOD_KEYS.filter(k => !keep.includes(k)), out = keep.slice();
    while (out.length < n && pool.length) out.push(pool.splice(rand(0, pool.length - 1), 1)[0]);
    return out;
}
function setMapQuality(x, q, mods) {
    if (!q) { delete x.q; delete x.mm; delete x.nm; return x; }
    x.q = q; x.mm = mods;
    x.nm = q === 'magic' ? MAP_MODS[mods[0]].name + '的' : RARE_NAMES[rand(0, RARE_NAMES.length - 1)];
    return x;
}
function makeMapItem(t, q) {
    const x = { uid: player.nextUid++, id: 'map' + clamp(t, 1, MAP_TIERS), n: 1, ench: 0 };
    if (q === undefined) { const r = Math.random(); q = r < 0.5 ? null : r < 0.85 ? 'magic' : 'rare'; }
    if (q) setMapQuality(x, q, rollMapMods(q === 'magic' ? rand(1, 2) : rand(3, 4)));
    return x;
}
function giveMap(t, q, why) {
    const x = makeMapItem(t, q);
    player.inv.push(x);
    addLog(`🗺️ ${why || '獲得'} ${x.q ? `【${QUALITY[x.q].name}】` : ''}${itemName(x)}`, x.q === 'rare' ? 'rare' : 'loot');
    return x;
}
function mapQtyOf(mods) { return Math.min(MAP_QTY_MAX, 1 + mods.reduce((a, k) => a + (MAP_MODS[k].qty || 0), 0)); }
function mapBonusOf(mods) { return mods.reduce((a, k) => a + MAP_MODS[k].bonus, 0); }

// 通貨用在地圖上（craft.js 的 useCurrency 會轉來這裡）
const MAP_CURRENCY = {
    curAug:    { desc: '普通地圖 → 魔法（1～2 條詞綴）', can: x => !x.q, use: x => setMapQuality(x, 'magic', rollMapMods(rand(1, 2))) },
    curAlt:    { desc: '重新擲魔法地圖的詞綴', can: x => x.q === 'magic', use: x => setMapQuality(x, 'magic', rollMapMods(rand(1, 2))) },
    curRegal:  { desc: '魔法地圖 → 稀有，保留詞綴再加 1 條', can: x => x.q === 'magic', use: x => setMapQuality(x, 'rare', rollMapMods(x.mm.length + 1, x.mm)) },
    curChaos:  { desc: '重新擲稀有地圖的詞綴（3～4 條）', can: x => x.q === 'rare', use: x => setMapQuality(x, 'rare', rollMapMods(rand(3, 4))) },
    curAnnul:  { desc: '隨機移除地圖一條詞綴', can: x => !!(x.mm && x.mm.length), use: x => {
        x.mm.splice(rand(0, x.mm.length - 1), 1);
        if (!x.mm.length) setMapQuality(x, null); else if (x.q === 'magic') x.nm = MAP_MODS[x.mm[0]].name + '的';
    } },
    curChance: { desc: '普通地圖 → 隨機（魔法 70%、稀有 30%）', can: x => !x.q, use: x => { const q = chance(0.3) ? 'rare' : 'magic'; setMapQuality(x, q, rollMapMods(q === 'rare' ? rand(3, 4) : rand(1, 2))); } },
    curOracle: { desc: '稀有地圖再加 1 條詞綴（最多 6 條）', can: x => x.q === 'rare' && x.mm.length < 6, use: x => { x.mm = rollMapMods(x.mm.length + 1, x.mm); } },
};

function mapDescHtml(x) {
    const t = ITEMS[x.id].tier, z = mapZoneFor(t), mods = x.mm || [];
    const L = [`<small class="muted">異界地圖・T${t}</small>`, `地區：${z.icon} ${z.name}（建議 Lv.${z.lv[0]}～${z.lv[1]}）${t > mapZones().length ? '<span class="warn">　怪物強化 ×1.4</span>' : ''}`,
        `怪物數量：200～300 隻${mapQtyOf(mods) > 1 ? ` <b class="warn">×${mapQtyOf(mods)}</b>` : ''}，殺光後出現異界首領`];
    if (x.q) L.push(`<b class="${QUALITY[x.q].cls}">${QUALITY[x.q].name}地圖</b>　<span class="good">獎勵 +${Math.round(mapBonusOf(mods) * 100)}%</span>`);
    for (const k of mods) L.push(`<span class="q-magic">◆ ${MAP_MODS[k].icon} ${MAP_MODS[k].name}：${MAP_MODS[k].desc}</span>`);
    L.push('<small class="muted">獎勵加成作用在經驗、金幣與所有掉落機率。可用通貨改造（🔮）。</small>');
    return L.join('<br>');
}

// ───────── 開啟與進行 ─────────
function openMap(uid) {
    if (!inTown()) { showToast('要在村莊才能開啟異界'); return; }
    if (player.mapRun) { showToast('已經有一張異界地圖開啟中'); return; }
    const x = findInv(uid);
    if (!x || ITEMS[x.id].cat !== 'map') return;
    const t = ITEMS[x.id].tier, z = mapZoneFor(t), mods = (x.mm || []).slice();
    removeInst(uid);
    const total = Math.round(rand(200, 300) * mapQtyOf(mods));
    player.mapRun = { t, zone: z.id, mods, q: x.q || null, name: itemName(x), total, left: total, boss: false };
    player.loc = { type: 'zone', id: z.id, floor: 1 };
    addLog(`🌀 開啟${itemName(x)}：${z.name}的異界（${total} 隻怪物${mods.length ? `、獎勵 +${Math.round(mapBonusOf(mods) * 100)}%` : ''}）`, 'boss');
    closeDialog();
    switchTab('hunt');
    startHunt();
    saveGame();
    refreshUI();
}

// 異界裡生效的詞綴（不在異界＝沒有）
function inMapRun() { const r = player.mapRun; return !!(r && player.loc.type === 'zone' && player.loc.id === r.zone); }
function mapModsOn() { return inMapRun() ? player.mapRun.mods.filter(k => MAP_MODS[k]) : []; }
function mapModOn(k) { return mapModsOn().includes(k); }
function mapBonus() { return mapBonusOf(mapModsOn()); }

// 新出現的怪套用地圖詞綴與 T15 強化（combat.js 的 addMob 呼叫）
function applyMapMods(m) {
    if (!inMapRun()) return m;
    const on = mapModsOn(), sc = mapTierScale(player.mapRun.t);
    if (sc > 1) { m.hp = m.maxHp = Math.round(m.maxHp * sc); m.dmg = m.dmg.map(d => Math.round(d * sc)); m.exp = Math.round(m.exp * sc); }
    if (on.includes('elite') && !m.boss && !m.elite && chance(0.15)) {
        m.elite = true; m.name = '精英・' + m.name;
        m.hp = m.maxHp = Math.round(m.maxHp * 3);
        m.dmg = m.dmg.map(d => Math.round(d * 1.5));
        m.exp *= 4; m.gold = m.gold.map(g => g * 3);
    }
    if (on.includes('tough')) m.hp = m.maxHp = Math.round(m.maxHp * 1.4);
    if (on.includes('savage')) { m.dmg = m.dmg.map(d => Math.round(d * 1.3)); if (m.magic) m.magic = { ...m.magic, dmg: m.magic.dmg.map(d => Math.round(d * 1.3)) }; }
    if (on.includes('warded')) m.mr = (m.mr || 0) + 25;
    if (on.includes('swift')) m.spd = Math.round(m.spd / 1.25);
    return m;
}

// 異界首領：地區的稀有首領（沒有就用最強的怪）強化
function makeMapBoss() {
    const z = currentZone();
    const base = makeMonster(z.rare ? z.rare.id : z.mons[z.mons.length - 1]);
    base.name = '異界首領・' + base.name.replace(/^.*・/, '');
    base.boss = true; base.large = true; base.mapBoss = true;
    base.hp = base.maxHp = Math.round(base.maxHp * (z.rare ? 2 : 8));
    base.dmg = base.dmg.map(d => Math.round(d * 1.3));
    base.exp = Math.round(base.exp * (z.rare ? 3 : 10)); base.gold = base.gold.map(g => g * 5);
    return base;
}

// combat.js 的 onKill 呼叫：計數、通關；回傳 true 代表已通關（已回村）
function mapOnKill(mon) {
    if (!inMapRun()) return false;
    const r = player.mapRun;
    if (mon.mapBoss) { completeMap(); return true; }
    if (r.left > 0) {
        r.left--;
        if (r.left === 0) addLog('🌀 異界的怪物清空了……異界首領即將現身！', 'boss');
    }
    return false;
}
function completeMap() {
    const r = player.mapRun, z = currentZone();
    player.mapRun = null;
    addLog(`🏆 通關 ${r.name}！`, 'boss');
    // 通關獎勵：1 張地圖（同階 55%、高一階 35%、高兩階 10%），另有 50% 再一張同階以下
    const up = Math.random(), t2 = r.t + (up < 0.55 ? 0 : up < 0.9 ? 1 : 2);
    giveMap(Math.min(MAP_TIERS, t2), undefined, '通關獎勵');
    if (chance(0.5)) giveMap(Math.max(1, r.t - rand(0, 1)), undefined, '通關獎勵');
    moveToTown(z.town);
}
// 離開異界（回家卷軸、步行、死亡、瞬移逃離）：地圖消失
function endMapRun(reason) {
    if (!player.mapRun) return;
    addLog(`🌀 ${reason || '離開異界'}，${player.mapRun.name}關閉了`, 'warn');
    player.mapRun = null;
}

// 地圖掉落（combat.js 的 rollDrops 呼叫）
function rollMapDrop(mon, qm) {
    const inMap = inMapRun();
    if (!chance((inMap ? MAP_DROP_IN_MAP_P : MAP_DROP_P) * qm)) return;
    const t = inMap ? clamp(player.mapRun.t + [-1, 0, 0, 1][rand(0, 3)], 1, MAP_TIERS) : mapTierForLv(mon.lv);
    giveMap(t);
}

// ───────── 介面 ─────────
function mapDevicePanelHtml() {
    const r = player.mapRun;
    let h = `<div class="panel map-device"><h4>🌀 異界裝置</h4>`;
    if (r) {
        h += `<div class="map-run"><b>${esc(r.name)}</b>　${ZONE_BY_ID[r.zone].name}<br>
            ${r.left > 0 ? `剩餘怪物 <b>${fmt(r.left)}</b> / ${fmt(r.total)}` : '<b class="warn">異界首領現身中</b>'}
            ${r.mods.length ? `<br><small>${r.mods.map(k => MAP_MODS[k].icon + MAP_MODS[k].name).join('、')}　<span class="good">獎勵 +${Math.round(mapBonusOf(r.mods) * 100)}%</span></small>` : ''}
            <div class="btn-row"><button class="secondary" onclick="abandonMapBtn()">放棄這張地圖</button></div></div>`;
    }
    const maps = player.inv.filter(x => ITEMS[x.id].cat === 'map').sort((a, b) => ITEMS[b.id].tier - ITEMS[a.id].tier || qualityRank(b) - qualityRank(a));
    h += maps.length ? `<div class="list">${maps.map(x => {
        const t = ITEMS[x.id].tier, mods = x.mm || [];
        return `<div class="list-row"><div><b class="${itemClass(x)}">${esc(itemName(x))}</b>
            <small>${mapZoneFor(t).name}${mods.length ? '　' + mods.map(k => MAP_MODS[k].icon).join('') + ` 獎勵 +${Math.round(mapBonusOf(mods) * 100)}%` : ''}${mapQtyOf(mods) > 1 ? `　怪物 ×${mapQtyOf(mods)}` : ''}</small></div>
            <div class="qty-btns"><button class="mini secondary" onclick="openItemDialog(${x.uid})">詳情</button><button class="mini" onclick="openMap(${x.uid})" ${inTown() && !r ? '' : 'disabled'}>開啟</button></div></div>`;
    }).join('')}</div>` : '<small class="muted">還沒有異界地圖。打怪有機率掉落（一般地圖每隻 0.4%、異界裡 1.5%），通關異界首領必掉。</small>';
    return h + `<small class="muted">在村莊放入地圖開啟異界：200～300 隻怪（數量詞綴最多 ×3），殺光後打倒異界首領即通關。中途回城、死亡或瞬移逃離，地圖就會消失。</small></div>`;
}
function abandonMapBtn() {
    gameConfirm('放棄地圖', '確定放棄這張異界地圖？地圖會消失。', () => { endMapRun('放棄地圖'); saveGame(); refreshUI(); }, '放棄');
}
// 異界進度（狩獵畫面左上，每 250ms 更新）
function mapProgressText() {
    if (!inMapRun()) return '';
    const r = player.mapRun;
    return `🌀 T${r.t} ${r.left > 0 ? `剩 ${fmt(r.left)}/${fmt(r.total)}` : '首領現身！'}${r.mods.length ? `　${r.mods.map(k => MAP_MODS[k].icon).join('')} +${Math.round(mapBonusOf(r.mods) * 100)}%` : ''}`;
}
