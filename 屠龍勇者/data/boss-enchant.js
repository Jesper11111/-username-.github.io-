// 黑暗大陸：BOSS 附魔與封魂（ARCHITECTURE.md 第 68 節）
// 載入時依賴 items；執行期使用 player、combat、ui。戰鬥狀態放 hunt，武器只儲存材料 id。
const BOSS_ENCHANTS = {
    treantHeart: { name: '古樹荊棘', p: .08, cd: 8, kind: 'magic', main: .9, splash: .45, root: 1, slow: .1, sec: 2 },
    drakeFang: { name: '裂地岩刺', p: .07, cd: 7, kind: 'physical', main: 1.5, splash: .5, cap: 3, pierce: .15 },
    baphometHorn: { name: '地獄火柱', p: .06, cd: 9, kind: 'magic', main: 1.8, splash: .7 },
    pirateTreasure: { name: '幽靈砲擊', p: .06, cd: 10, kind: 'physical', area: 1.2, delay: 800 },
    demonHeart: { name: '噬魂黑炎', p: .07, cd: 9, kind: 'magic', main: .6, dot: .4, ticks: 4, finishHeal: .02 },
    wyvernWing: { name: '疾風連刃', p: .08, cd: 7, kind: 'physical', hit: .6, hits: 3, spread: true },
    osirisSeal: { name: '冥界封咒', p: .08, cd: 10, kind: 'magic', main: 1.3, weaken: .08, sec: 4 },
    frostCrystal: { name: '冰王碎晶', p: .07, cd: 8, kind: 'magic', main: 1.7, atkSlow: .12, sec: 3 },
    ifritFlame: { name: '煉獄火域', p: .06, cd: 12, kind: 'magic', field: .4, ticks: 4 },
    forgottenRelic: { name: '遺忘烙印', p: .07, cd: 10, kind: 'magic', main: 1.4, mark: .12, sec: 5 },
    giantSoul: { name: '巨人崩擊', p: .05, cd: 12, kind: 'physical', main: 2.6, splash: .8, stun: .8 },
    antharasScale: { name: '地龍震怒', p: .06, cd: 14, kind: 'physical', area: 1.3, shield: .05, sec: 4, selfArea: true },
    fafurionScale: { name: '水龍海嘯', p: .06, cd: 14, kind: 'magic', area: 1.4, regen: .01, healTicks: 3 },
    lindviorScale: { name: '風龍風暴', p: .07, cd: 12, kind: 'physical', hit: .45, hits: 5, spread: true },
    valakasScale: { name: '火龍吐息', p: .05, cd: 15, kind: 'magic', area: 1.2, dot: .3, ticks: 3 },
    towerBullHorn: { name: '蠻牛震擊', p: .08, cd: 8, kind: 'physical', main: 1.4, splash: .6, stun: .5 },
    towerBansheeTear: { name: '女妖哀嚎', p: .07, cd: 10, kind: 'magic', area: .8, weaken: .06, sec: 3 },
    towerFlameCore: { name: '炎魔爆燃', p: .07, cd: 9, kind: 'magic', area: .6, dot: .25, ticks: 4 },
    towerIceCrown: { name: '冰后寒獄', p: .07, cd: 10, kind: 'magic', area: 1.1, slow: .3, sec: 3 },
    towerLichCrystal: { name: '死亡纏繞', p: .07, cd: 9, kind: 'magic', main: .9, dot: .3, ticks: 5, antiheal: .3, sec: 5 },
    towerFallenFeather: { name: '墮天裁決', p: .06, cd: 10, kind: 'magic', main: 2.1, splash: .5 },
    towerChaosCore: { name: '混沌裂爆', p: .06, cd: 13, kind: 'magic', area: 1.7, delay: 1000 },
    towerAbyssEye: { name: '深淵侵蝕', p: .1, cd: 4, kind: 'magic', dot: .12, ticks: 10, stacks: 3 },
    towerDeathShard: { name: '死神收割', p: .07, cd: 10, kind: 'physical', main: 1.5, execute: 3 },
    towerKingSeal: { name: '冥王追擊', p: .06, cd: 12, kind: 'magic', hit: .65, hits: 4 }
};
const BOSS_ENCHANT_SOUL_COST = 500000;
const BOSS_ENCHANT_TEXT = {
    treantHeart: '主目標 90% B、附近各 45% B；一般怪定身 1 秒，BOSS 緩速 10%／2 秒。',
    drakeFang: '主目標 150% B、另外最多兩個目標各 50% B；忽略此次正數物理減傷量的 15%。',
    baphometHorn: '主目標 180% B、附近各 70% B。',
    pirateTreasure: '0.8 秒後砲擊原位置，範圍各 120% B；敵人離開範圍可避開。',
    demonHeart: '立即 60% B，之後 4 秒每秒 40% B；目標存活至燃燒結束時回復自身 HP 2%。',
    wyvernWing: '三道風刃各 60% B，優先分散；只有一個目標時集中。',
    osirisSeal: '主目標 130% B；造成傷害降低 8%／4 秒，BOSS 降低 4%。',
    frostCrystal: '主目標 170% B；攻擊速度降低 12%／3 秒，BOSS 降低 6%。',
    ifritFlame: '原位置留下火域 4 秒，每秒範圍各 40% B；離開火域不受傷。',
    forgottenRelic: '主目標 140% B；之後 5 秒受到附魔傷害提高 12%，不提高普攻或職業技能；團隊共享首領時隊友也受益，同類取最高。',
    giantSoul: '主目標 260% B、附近各 80% B；一般怪暈眩 0.8 秒，BOSS 免疫。',
    antharasScale: '自身周圍各 130% B；獲得 HP 上限 5% 護盾／4 秒，不疊加。',
    fafurionScale: '範圍各 140% B；自身接著 3 秒每秒回復 HP 上限 1%。',
    lindviorScale: '五道風刃各 45% B，優先分散；只有一個目標時集中。',
    valakasScale: '範圍立即各 120% B，之後 3 秒每秒 30% B，不疊層。',
    towerBullHorn: '主目標 140% B、附近各 60% B；一般怪暈眩 0.5 秒，BOSS 免疫。',
    towerBansheeTear: '範圍各 80% B；造成傷害降低 6%／3 秒，BOSS 降低 3%。',
    towerFlameCore: '範圍立即各 60% B，之後 4 秒每秒 25% B，燃燒跟隨敵人、不疊層。',
    towerIceCrown: '範圍各 110% B；移動速度降低 30%／3 秒，BOSS 降低 10%。',
    towerLichCrystal: '立即 90% B，之後 5 秒每秒 30% B；治療效果降低 30%，BOSS 降低 15%，不影響脫戰回血。',
    towerFallenFeather: '主目標 210% B、附近各 50% B。',
    towerChaosCore: '1 秒後在原位置爆炸，範圍各 170% B；敵人離開範圍可避開。',
    towerAbyssEye: '每層每秒 12% B，持續 10 秒；同一施放者最多三層，各自計時。',
    towerDeathShard: '主目標 150% B；命中時 HP 低於 25% 改為 300% B，並非直接處決。',
    towerKingSeal: '1 秒內追擊主目標四次，每次 65% B；目標死亡後停止，不轉移。'
};
for (const id in BOSS_ENCHANTS) {
    const r = BOSS_ENCHANTS[id];
    r.cost = id.endsWith('Scale') ? 5000000 : id.startsWith('tower') ? (TOWER_BOSS_MATERIALS.indexOf(id) < 5 ? 2000000 : 4000000) : 1000000;
    ITEMS['soul_' + id] = { name: r.name + '封魂石', cat: 'material', wt: 1, sell: 0, soulEnchant: id,
        desc: '封存「' + r.name + '」的力量。在村莊鍛造師裝回武器，費用 500,000 金幣，成功後消耗此石。' };
}

function bossEnchantInfo(id) {
    const r = BOSS_ENCHANTS[id];
    if (!r) return '';
    return '<div class="res-box"><b>🔱 BOSS 附魔・' + esc(r.name) + '</b><br>' + esc(BOSS_ENCHANT_TEXT[id]) +
        '<br><small>' + Math.round(r.p * 100) + '% 命中觸發｜冷卻 ' + r.cd + ' 秒｜' + (r.kind === 'physical' ? '物理' : '魔法') +
        '傷害｜不耗 MP<br>B＝等級＋物理／魔法換算基準；範圍最多 5 個目標，無暴擊、無吸血、不連鎖。' +
        (typeof player !== 'undefined' && player ? '<br>目前角色 B：' + fmt(bossEnchantBase(calcStats())) + '（實際傷害另計防禦／MR）' : '') + '</small></div>';
}
function bossEnchantItemHtml(inst) {
    const d = ITEMS[inst.id];
    if (d.soulEnchant) return bossEnchantInfo(d.soulEnchant);
    if (BOSS_ENCHANTS[inst.id]) return bossEnchantInfo(inst.id) + '<small>附魔材料 ×1＋💰' + fmt(BOSS_ENCHANTS[inst.id].cost) + '；村莊鍛造師辦理，必定成功。</small>';
    if (inst.id === 'towerSoul') return '<small>封魂材料：永夜之魂 ×1＋💰500,000，將武器附魔取出成對應技能封魂石；裝回另收 💰500,000。</small>';
    return inst.bossEnchant ? bossEnchantInfo(inst.bossEnchant) : '';
}
function bossEnchantWeapons() { return [...player.inv, ...equippedList()].filter(x => ITEMS[x.id].cat === 'weapon'); }
function bossEnchantForgeError(uid) {
    if (!player || !inTown()) return '回到村莊才能附魔或封魂';
    const it = findAnyInst(uid);
    return !it || ITEMS[it.id].cat !== 'weapon' ? '找不到這把武器' : '';
}
function renderBossEnchantForge() {
    const rows = bossEnchantWeapons().map(x => '<div class="list-row"><div><b>' + esc(itemName(x)) + '</b>' +
        (slotOfEquipped(x.uid) ? ' <small class="good">裝備中</small>' : '') + '<small>目前附魔：' +
        (BOSS_ENCHANTS[x.bossEnchant] ? esc(BOSS_ENCHANTS[x.bossEnchant].name) : '無') + '</small></div><button onclick="openBossEnchantWeapon(' + x.uid + ')">選擇</button></div>').join('');
    return '<div class="panel"><h4>🔱 BOSS 附魔與封魂</h4><p>每把武器限一種附魔，必定成功。更換會覆蓋原附魔；想保留請先封魂。</p>' +
        '<small>一般 BOSS：100 萬｜塔 10～50F：200 萬｜塔 60～100F：400 萬｜四龍：500 萬。封魂、裝回各 50 萬。</small><h4>🎬 特效預覽（不消耗材料）</h4>' + bossVfxPreviewButtons() + '</div><div class="list">' +
        (rows || '<p class="muted">背包與身上沒有武器。</p>') + '</div>';
}
function openBossEnchantWeapon(uid) {
    const err = bossEnchantForgeError(uid);
    if (err) { showToast(err); return; }
    const it = findAnyInst(uid), current = BOSS_ENCHANTS[it.bossEnchant];
    const rows = Object.keys(BOSS_ENCHANTS).map(id => {
        const r = BOSS_ENCHANTS[id], n = countItem(id), stones = countItem('soul_' + id);
        return '<details class="panel"><summary>' + esc(r.name) + '｜' + esc(ITEMS[id].name) + ' ×' + n + (stones ? '｜封魂石 ×' + stones : '') + '</summary>' + bossEnchantInfo(id) +
            '<div class="btn-row"><button onclick="bossEnchantAsk(' + uid + ',\'' + id + '\',false)" ' + (!n || player.gold < r.cost || it.bossEnchant === id ? 'disabled' : '') + '>材料附魔（💰' + fmt(r.cost) + '）</button>' +
            '<button onclick="bossEnchantAsk(' + uid + ',\'' + id + '\',true)" ' + (!stones || player.gold < BOSS_ENCHANT_SOUL_COST || it.bossEnchant === id ? 'disabled' : '') + '>封魂石裝回（💰500,000）</button></div></details>';
    }).join('');
    openDialog('🔱 ' + itemName(it), '<p>目前：' + (current ? esc(current.name) : '尚無附魔') + '</p>' + (current ? bossEnchantInfo(it.bossEnchant) +
        '<button onclick="bossEnchantSealAsk(' + uid + ')" ' + (!countItem('towerSoul') || player.gold < BOSS_ENCHANT_SOUL_COST ? 'disabled' : '') + '>封存（永夜之魂 ×1＋💰500,000）</button><p class="muted">封魂後武器保留，附魔變成對應封魂石。</p>' : '') + rows, [{ text: '關閉', cls: 'secondary' }]);
}
function bossEnchantApply(uid, id, stone, expected) {
    const err = bossEnchantForgeError(uid), r = BOSS_ENCHANTS[id];
    if (err || !r) return err || '找不到附魔';
    const it = findAnyInst(uid), cost = stone ? BOSS_ENCHANT_SOUL_COST : r.cost, mat = stone ? 'soul_' + id : id;
    if ((it.bossEnchant || '') !== expected) return '武器附魔已改變，請重新選擇';
    if (it.bossEnchant === id) return '這把武器已經有相同附魔';
    if (player.gold < cost) return '金幣不足';
    if (!consumeItem(mat)) return '缺少' + ITEMS[mat].name;
    player.gold -= cost;
    it.bossEnchant = id;
    addLog('🔱 ' + itemName(it) + '附魔「' + r.name + '」（-' + fmt(cost) + ' 金幣）', 'sys');
    return '';
}
function bossEnchantAsk(uid, id, stone) {
    const err = bossEnchantForgeError(uid), r = BOSS_ENCHANTS[id];
    if (err || !r) { showToast(err || '找不到附魔'); return; }
    const owner = player, it = findAnyInst(uid), expected = it.bossEnchant || '', cost = stone ? BOSS_ENCHANT_SOUL_COST : r.cost;
    gameConfirm(stone ? '裝回封魂石' : 'BOSS 附魔', '消耗 ' + ITEMS[stone ? 'soul_' + id : id].name + ' ×1＋' + fmt(cost) + ' 金幣，將「' + r.name + '」附到 ' + itemName(it) + '。' +
        (expected ? '原附魔會被覆蓋且無法取回，若要保留請先封魂。' : '') + '必定成功。', () => {
        if (player !== owner) { showToast('角色已切換，請重新操作'); return; }
        const e = bossEnchantApply(uid, id, stone, expected);
        if (e) { showToast(e); return; }
        saveGame(); refreshUI(); showToast('附魔完成：' + r.name); sfx('treasure');
    }, '確認');
}
function bossEnchantSeal(uid, expected) {
    const err = bossEnchantForgeError(uid);
    if (err) return err;
    const it = findAnyInst(uid), id = it.bossEnchant;
    if (!BOSS_ENCHANTS[id] || id !== expected) return '武器附魔已改變，請重新選擇';
    if (player.gold < BOSS_ENCHANT_SOUL_COST) return '金幣不足';
    // 永夜之魂與封魂石重量相同；先完成所有檢查，再同步移轉，沒有非同步空窗。
    if (!consumeItem('towerSoul')) return '缺少永夜之魂';
    player.gold -= BOSS_ENCHANT_SOUL_COST;
    delete it.bossEnchant;
    addItem('soul_' + id);
    addLog('🔮 封存「' + BOSS_ENCHANTS[id].name + '」為封魂石（-500,000 金幣）', 'sys');
    return '';
}
function bossEnchantSealAsk(uid) {
    const err = bossEnchantForgeError(uid);
    if (err) { showToast(err); return; }
    const owner = player, it = findAnyInst(uid), id = it.bossEnchant;
    if (!BOSS_ENCHANTS[id]) return;
    gameConfirm('封存 BOSS 附魔', '消耗永夜之魂 ×1＋500,000 金幣，移除武器附魔並獲得「' + ITEMS['soul_' + id].name + '」。武器、強化、詞綴與共鳴保留。', () => {
        if (player !== owner) { showToast('角色已切換，請重新操作'); return; }
        const e = bossEnchantSeal(uid, id);
        if (e) { showToast(e); return; }
        saveGame(); refreshUI(); showToast('已獲得' + ITEMS['soul_' + id].name); sfx('treasure');
    }, '封存');
}
function openBossSoulPicker(uid) {
    const stone = findInv(uid);
    if (!stone || !ITEMS[stone.id].soulEnchant) return;
    if (!inTown()) { showToast('回到村莊鍛造師才能裝回封魂石'); return; }
    const id = ITEMS[stone.id].soulEnchant;
    const rows = bossEnchantWeapons().map(x => '<div class="list-row"><b>' + esc(itemName(x)) + '</b><button onclick="bossEnchantAsk(' + x.uid + ',\'' + id + '\',true)">裝回（💰500,000）</button></div>').join('');
    openDialog(ITEMS[stone.id].name, bossEnchantInfo(id) + '<p>選擇武器；成功後消耗一個封魂石。</p>' + (rows || '<p>沒有武器。</p>'), [{ text: '關閉', cls: 'secondary' }]);
}

// ───────── 戰鬥：冷卻存在角色 cds，換武器不會重置；短期效果只在當次戰鬥存活 ─────────
function bossEnchantCurrent() {
    const w = player && player.equip.weapon;
    return w && BOSS_ENCHANTS[w.bossEnchant] ? w : null;
}
function bossEnchantRuntime() {
    if (!hunt) return null;
    const w = bossEnchantCurrent(), old = hunt.bossEnchantRuntime;
    if (!w) { hunt.bossEnchantRuntime = null; return null; }
    if (!old || old.owner !== player || old.uid !== w.uid || old.id !== w.bossEnchant) {
        hunt.bossEnchantRuntime = { owner: player, uid: w.uid, id: w.bossEnchant, jobs: [], shield: 0, shieldUntil: 0 };
    }
    return hunt.bossEnchantRuntime;
}
function bossEnchantBase(st) {
    const w = st.weapon;
    const physical = (w ? (w.dmg[0] + w.dmg[1] + 2) / 4 : 1.5) + (st.dmgBonus || 0);
    const magical = (st.sp || 0) * 3;
    return Math.max(1, Math.round(player.lv + Math.max(physical, magical)));
}
function bossEnchantPosition(mon) {
    if (SIM_MODE || typeof scene === 'undefined' || !scene || !scene.mons) return null;
    const m = scene.mons.find(x => !x.dead && x.inst === mon);
    return m ? { x: m.x, y: m.y } : null;
}
function bossEnchantCenter(mon, self) {
    if (self && !SIM_MODE && typeof scene !== 'undefined' && scene && scene.pl) return { x: scene.pl.x, y: scene.pl.y };
    return bossEnchantPosition(mon);
}
function bossEnchantTargets(primary, center, cap) {
    if (!hunt) return [];
    return hunt.mobs.filter(m => m.hp > 0 && (!center || (() => {
        const p = bossEnchantPosition(m);
        return p && Math.hypot(p.x - center.x, p.y - center.y) <= 2.5;
    })())).sort((a, b) => (a === primary ? -1 : b === primary ? 1 : 0)).slice(0, cap || 5);
}
function bossEnchantDebuff(mon, type, value, sec) {
    const list = mon.bossEnchantDebuffs || (mon.bossEnchantDebuffs = []);
    const old = list.find(x => x.owner === player && x.type === type);
    if (old) { old.value = value; old.until = gameNow + sec * 1000; old.uid = player.equip.weapon.uid; old.id = player.equip.weapon.bossEnchant; }
    else list.push({ owner: player, uid: player.equip.weapon.uid, id: player.equip.weapon.bossEnchant, type, value, until: gameNow + sec * 1000 });
}
function bossEnchantDebuffValue(mon, type, owner) {
    if (!mon || !mon.bossEnchantDebuffs) return 0;
    mon.bossEnchantDebuffs = mon.bossEnchantDebuffs.filter(x => x.until > gameNow && bossEnchantOwnerActive(x.owner) && x.owner.equip.weapon.uid === x.uid && x.owner.equip.weapon.bossEnchant === x.id);
    return mon.bossEnchantDebuffs.filter(x => x.type === type && (!owner || x.owner === owner)).reduce((n, x) => Math.max(n, x.value), 0);
}
function bossEnchantOwnerActive(p) { return p && p.hp > 0 && p.equip.weapon && BOSS_ENCHANTS[p.equip.weapon.bossEnchant]; }
function bossEnchantMoveFactor(mon) {
    if (bossEnchantDebuffValue(mon, 'root')) return 0;
    return 1 - bossEnchantDebuffValue(mon, 'slow');
}
function bossEnchantAttackFactor(mon) { return 1 / (1 - bossEnchantDebuffValue(mon, 'atkSlow')); }
function bossEnchantEnemyDamage(mon, damage) { return damage * (1 - bossEnchantDebuffValue(mon, 'weaken')); }
function bossEnchantEnemyHeal(mon, amount) { return amount * (1 - bossEnchantDebuffValue(mon, 'antiheal')); }
function bossEnchantAbsorb(damage) {
    const rt = bossEnchantRuntime();
    if (!rt || rt.shieldUntil <= gameNow) return damage;
    const n = Math.min(rt.shield, damage);
    rt.shield -= n;
    return damage - n;
}
function bossEnchantDamage(mon, amount, id) {
    if (!mon || mon.hp <= 0 || !hunt.mobs.includes(mon)) return 0;
    const r = BOSS_ENCHANTS[id];
    let d = amount;
    if (r.kind === 'magic') d *= 1 - clamp(mon.mr || 0, 0, 100) / 200;
    else d -= Math.max(0, -(mon.ac || 0) / 5) * (1 - (r.pierce || 0));
    d *= 1 + bossEnchantDebuffValue(mon, 'mark');
    d = Math.max(1, Math.round(d));
    mon.hp -= d;
    addLog('🔱 附魔・' + r.name + '！' + mon.name + '受到 ' + d + ' 傷害', 'magic');
    return d;
}
// 同一次物理技能（範圍／多段）只抽一次；共鳴、附魔、反擊不進此入口。
function bossEnchantBegin() { if (hunt) hunt.bossEnchantAction = { target: null }; }
function bossEnchantEnd(st) {
    if (!hunt) return;
    const a = hunt.bossEnchantAction;
    hunt.bossEnchantAction = null;
    if (a && a.target) bossEnchantOnHit(a.target, st);
}
function bossEnchantHit(mon, st) {
    if (hunt.bossEnchantAction) { if (mon.hp > 0 && !hunt.bossEnchantAction.target) hunt.bossEnchantAction.target = mon; }
    else bossEnchantOnHit(mon, st);
}
function bossEnchantOnHit(mon, st) {
    const rt = bossEnchantRuntime();
    if (!rt || !mon || mon.hp <= 0 || (player.cds._bossEnchant || 0) > gameNow) return;
    const id = rt.id, r = BOSS_ENCHANTS[id];
    if (!chance(r.p)) return;
    player.cds._bossEnchant = gameNow + r.cd * 1000;
    const base = bossEnchantBase(st), center = bossEnchantCenter(mon, r.selfArea);
    const targets = r.area || r.splash ? bossEnchantTargets(mon, center, r.cap) : [mon];
    bossEnchantVisual(id, mon, { phase: 'start', pos: center, targets, execute: !!(r.execute && mon.hp < mon.maxHp * .25) });
    if (r.delay) rt.jobs.push({ type: 'blast', id, mon, center, base, at: gameNow + r.delay });
    else if (r.hits) {
        const list = r.spread ? bossEnchantTargets(mon, null, 5) : [mon];
        for (let i = 0; i < r.hits; i++) {
            const target = r.spread ? list[i % list.length] : mon;
            if (r.spread) bossEnchantDamage(target, base * r.hit, id);
            else rt.jobs.push({ type: 'hit', id, mon: target, base: base * r.hit, index: i, at: gameNow + i * 250 });
        }
    } else {
        for (const m of targets) {
            const mult = r.area || (m === mon ? (r.execute && m.hp < m.maxHp * .25 ? r.execute : r.main || 0) : r.splash || 0);
            if (mult) bossEnchantDamage(m, base * mult, id);
            if (m.hp <= 0) continue;
            if (r.stun && !m.boss) m.stunUntil = Math.max(m.stunUntil || 0, gameNow + r.stun * 1000);
            if (r.root && !m.boss) bossEnchantDebuff(m, 'root', 1, r.root);
            if (r.slow && (m.boss || !r.root)) bossEnchantDebuff(m, 'slow', m.boss ? .1 : r.slow, r.sec);
            for (const type of ['weaken', 'atkSlow', 'antiheal', 'mark']) if (r[type]) bossEnchantDebuff(m, type, m.boss && type !== 'mark' ? r[type] / 2 : r[type], r.sec);
            if (r.dot) {
                const old = rt.jobs.filter(x => x.type === 'dot' && x.mon === m && x.id === id);
                if (old.length >= (r.stacks || 1)) rt.jobs.splice(rt.jobs.indexOf(old[0]), 1);
                rt.jobs.push({ type: 'dot', id, mon: m, base: base * r.dot, left: r.ticks, at: gameNow + 1000 });
            }
        }
        if (r.field) rt.jobs.push({ type: 'field', id, mon, center, base: base * r.field, left: r.ticks, at: gameNow + 1000 });
    }
    if (r.shield) { rt.shield = Math.floor(st.maxHp * r.shield); rt.shieldUntil = gameNow + r.sec * 1000; }
    if (r.regen) rt.jobs.push({ type: 'regen', id, base: Math.max(1, Math.round(st.maxHp * r.regen)), left: r.healTicks, at: gameNow + 1000 });
    addLog('🔱 發動附魔「' + r.name + '」', 'magic');
    sfx(/冰|寒/.test(r.name) ? 'magic-ice' : 'magic-cast');
}
function bossEnchantTick(st) {
    const rt = bossEnchantRuntime();
    if (!rt || player.hp <= 0) return;
    for (const job of rt.jobs.slice()) {
        while (job.at <= gameNow && rt.jobs.includes(job)) {
            if (job.type === 'blast' || job.type === 'field') {
                if (job.type === 'blast') bossEnchantVisual(job.id, job.mon, { phase: 'impact', pos: job.center });
                for (const m of bossEnchantTargets(job.mon, job.center, 5)) bossEnchantDamage(m, job.base * (job.type === 'blast' ? BOSS_ENCHANTS[job.id].area : 1), job.id);
            } else if (job.type === 'regen') player.hp = Math.min(st.maxHp, player.hp + job.base);
            else if (job.mon.hp > 0 && hunt.mobs.includes(job.mon)) {
                if (job.type === 'hit' && job.id === 'towerKingSeal') bossEnchantVisual(job.id, job.mon, { phase: 'slash', index: job.index });
                bossEnchantDamage(job.mon, job.base, job.id);
                if (job.type === 'dot' && job.left === 1 && job.mon.hp > 0 && BOSS_ENCHANTS[job.id].finishHeal) player.hp = Math.min(st.maxHp, player.hp + Math.max(1, Math.round(st.maxHp * BOSS_ENCHANTS[job.id].finishHeal)));
            } else { rt.jobs.splice(rt.jobs.indexOf(job), 1); break; }
            if (job.left && --job.left > 0) job.at += 1000;
            else rt.jobs.splice(rt.jobs.indexOf(job), 1);
        }
    }
}
function bossEnchantVisual(id, mon, options = {}) {
    if (SIM_MODE || typeof scene === 'undefined' || !scene) return;
    if (!scene.bossEnchantFx) scene.bossEnchantFx = [];
    const phase = options.phase || 'start';
    if (phase === 'impact') for (const f of scene.bossEnchantFx) if (f.id === id && f.phase === 'start') f.done = true;
    scene.bossEnchantFx.push({ id, phase, pos: options.pos || bossEnchantPosition(mon),
        origin: scene.pl ? { x: scene.pl.x, y: scene.pl.y } : null, targets: options.targets,
        index: options.index || 0, execute: !!options.execute, at: gameNow });
    if (scene.bossEnchantFx.length > 16) scene.bossEnchantFx.shift();
}
function bossEnchantChip() {
    const w = bossEnchantCurrent();
    if (!w) return '';
    const left = Math.ceil(Math.max(0, (player.cds._bossEnchant || 0) - gameNow) / 1000);
    return '<span class="chip res-chip" title="' + esc(BOSS_ENCHANT_TEXT[w.bossEnchant]) + '">🔱 ' + esc(BOSS_ENCHANTS[w.bossEnchant].name) + ' ' + (left ? left + '秒' : '待命') + '</span>';
}
