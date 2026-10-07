// 屠龍勇者：自動掛機戰鬥（依賴 player、items、skills、monsters、zones）
// 執行期狀態（不存檔；重新整理後若 player.hunting 為 true 會自動繼續掛機）
let hunt = null;      // { state:'search'|'fight', timer, mon, pCd, mCd, stunUntil, potCd, warned }
let session = null;   // 本次掛機統計 { start, kills, exp, gold }
let walkHome = null;  // { until, town }

function currentZone() { return player.loc.type === 'zone' ? ZONE_BY_ID[player.loc.id] : null; }
function zoneTitle() {
    const z = currentZone();
    if (!z) return TOWNS[player.loc.id].name;
    return z.type === 'tower' ? `${z.name} ${player.loc.floor}F` : z.name;
}

function startHunt() {
    if (!currentZone()) { showToast('請先傳送到狩獵地點'); return; }
    if (walkHome) { showToast('正在步行回村'); return; }
    player.hunting = true;
    hunt = { state: 'search', timer: 600, mon: null, pCd: 0, mCd: 0, stunUntil: 0, potCd: 0, warned: {} };
    if (!session) session = { start: gameNow, kills: 0, exp: 0, gold: 0 };
    addLog(`▶ 開始在${zoneTitle()}掛機`, 'sys');
}

function stopHunt(msg) {
    player.hunting = false;
    hunt = null;
    if (msg) addLog(msg, 'sys');
    saveGame();
}

function moveToTown(townId) {
    player.hunting = false;
    hunt = null;
    walkHome = null;
    player.loc = { type: 'town', id: townId };
    addLog(`🏡 回到${TOWNS[townId].name}`, 'sys');
    saveGame();
    refreshUI();
}

function useHomeScroll(reason) {
    const z = currentZone();
    if (!z) return false;
    if (!consumeItem('homeScroll')) {
        if (!hunt || !hunt.warned.home) addLog(`⚠️ ${reason ? reason + '，但' : ''}沒有回家卷軸！`, 'warn');
        if (hunt) hunt.warned.home = true;
        return false;
    }
    addLog(`📜 ${reason ? reason + '，' : ''}使用回家卷軸`, 'sys');
    moveToTown(z.town);
    return true;
}

function startWalkHome() {
    const z = currentZone();
    if (!z || walkHome) return;
    if (player.hunting) stopHunt();
    walkHome = { until: gameNow + WALK_HOME_MS, town: z.town };
    addLog(`🚶 步行前往${TOWNS[z.town].name}…`, 'sys');
}
function cancelWalk() { walkHome = null; addLog('取消步行', 'sys'); }

function changeFloor(delta) {
    const z = currentZone();
    if (!z || z.type !== 'tower') return;
    const f = player.loc.floor + delta;
    if (f < 1 || f > player.towerMax) { showToast(f > player.towerMax ? `需先擊敗 ${player.towerMax}F 的守關首領` : '已經是最底層'); return; }
    player.loc.floor = f;
    if (hunt) { hunt.mon = null; hunt.state = 'search'; hunt.timer = 800; }
    addLog(`🏛️ 移動到傲慢之塔 ${f}F`, 'sys');
}

// ───────── 藥水 ─────────
function usePotion(id) {
    const d = ITEMS[id];
    if (d.classes && !d.classes.includes(player.cls)) return '你的職業無法使用';
    if (!consumeItem(id)) return '沒有這個道具';
    if (d.heal) {
        const st = calcStats(), before = player.hp;
        player.hp = Math.min(st.maxHp, player.hp + rand(d.heal[0], d.heal[1]));
        addLog(`🧪 ${d.short || d.name}：HP +${player.hp - before}`, 'heal');
    }
    if (d.buff) {
        player.buffs[d.buff] = { src: 'item', id, until: gameNow + d.sec * 1000 };
        addLog(`🧪 ${d.name}生效（${d.sec / 60} 分鐘）`, 'heal');
    }
    return '';
}

function healPotionIds() { return Object.keys(ITEMS).filter(id => ITEMS[id].heal && countItem(id) > 0); }
function healPotionCount() { return healPotionIds().reduce((a, id) => a + countItem(id), 0); }

// 選「回復量不超過缺血量」裡最大的；都太大就用最小的
function choosePotion(st) {
    const ids = healPotionIds().sort((a, b) => ITEMS[a].heal[1] - ITEMS[b].heal[1]);
    if (!ids.length) return null;
    const missing = st.maxHp - player.hp;
    let pick = ids[0];
    for (const id of ids) if ((ITEMS[id].heal[0] + ITEMS[id].heal[1]) / 2 <= missing) pick = id;
    return pick;
}

function braveItemFor(cls) {
    return Object.keys(ITEMS).find(id => ['brave', 'wisdom'].includes(ITEMS[id].buff) && ITEMS[id].classes.includes(cls)) || null;
}

function autoSupport(st) {
    const s = player.settings, now = gameNow, z = currentZone();
    if (s.teleOn && player.hp < st.maxHp * s.telePct / 100 && countItem('teleScroll') > 0) {
        consumeItem('teleScroll');
        if (z.type === 'dragon') { addLog('📜 使用瞬間移動卷軸逃離巢穴', 'sys'); moveToTown(z.town); return; }
        addLog('📜 使用瞬間移動卷軸脫離戰鬥', 'sys');
        hunt.mon = null; hunt.state = 'search'; hunt.timer = 1500;
        return;
    }
    if (now < hunt.potCd) return;
    if (s.potionOn && player.hp < st.maxHp * s.potionPct / 100) {
        const id = choosePotion(st);
        if (id) { usePotion(id); hunt.potCd = now + POTION_CD_MS; return; }
        if (s.autoHome && useHomeScroll('藥水用完')) return;
    }
    const tryBuff = (key, id) => {
        if (buffActive(key) || !id || countItem(id) <= 0) return false;
        usePotion(id); hunt.potCd = now + POTION_CD_MS; return true;
    };
    if (s.autoHaste && !st.haste && tryBuff('haste', 'greenPotion')) return;
    if (s.autoBrave) { const id = braveItemFor(player.cls); if (id && tryBuff(ITEMS[id].buff, id)) return; }
    if (s.autoBlue && tryBuff('blue', 'bluePotion')) return;
}

// ───────── 主迴圈中的掛機處理 ─────────
function huntTick(dt) {
    if (!player.hunting) return;
    if (!hunt) { startHunt(); if (!hunt) return; }
    if (hunt.state === 'search') {
        hunt.timer -= dt;
        if (hunt.timer <= 0) spawnMonster();
        return;
    }
    const st = calcStats();
    autoSupport(st);
    if (!player.hunting || !hunt || hunt.state !== 'fight') return;
    hunt.pCd -= dt;
    hunt.mCd -= dt;
    if (hunt.pCd <= 0) {
        hunt.pCd = st.atkMs;
        playerAction(st);
        if (!player.hunting || !hunt || !hunt.mon) return;
        if (hunt.mon.hp <= 0) { onKill(); return; }
    }
    if (hunt.mCd <= 0) {
        hunt.mCd = hunt.mon.spd;
        if (gameNow >= hunt.stunUntil) monsterAttack(calcStats());
    }
}

function spawnMonster() {
    const z = currentZone();
    let mon = z.type === 'dragon' ? null : questBossFor(z);   // 職業任務首領優先
    if (mon) { /* 任務首領 */ }
    else if (z.type === 'dragon') mon = makeMonster(z.boss);
    else if (z.type === 'tower') {
        const f = player.loc.floor;
        mon = makeTowerMonster(f, f % 10 === 0 && !player.towerCleared[f]);
    } else if (z.rare && chance(z.rare.p)) mon = makeMonster(z.rare.id);
    else {
        // 只出現不超過「玩家等級 +3」的怪；全都太強就出最弱的
        let pool = z.mons.filter(id => MONSTERS[id].lv <= player.lv + 3);
        if (!pool.length) pool = [z.mons.reduce((a, b) => MONSTERS[a].lv <= MONSTERS[b].lv ? a : b)];
        mon = makeMonster(pool[rand(0, pool.length - 1)]);
    }
    hunt.mon = mon;
    hunt.state = 'fight';
    hunt.pCd = 300;
    hunt.mCd = mon.spd * 0.6;
    hunt.stunUntil = 0;
    hunt.warned.home = false;
    addLog(mon.boss ? `⚠️ ${mon.name}出現了！` : `${mon.name}（Lv.${mon.lv}）出現了`, mon.boss ? 'boss' : '');
}

// 玩家行動優先順序：治癒 → 增益 → 攻擊技能／魔法 → 普攻
function playerAction(st) {
    const s = player.settings, now = gameNow;
    const skills = learnedSkills().filter(k => k.type !== 'passive' && s.skills[k.id] !== false);
    const ready = k => player.mp >= k.mp && !(player.cds[k.id] > now);
    if (player.hp < st.maxHp * s.healPct / 100) {
        const heal = skills.filter(k => k.type === 'heal' && ready(k)).pop();
        if (heal) return castHeal(heal, st);
    }
    for (const k of skills) {
        if (k.type === 'buff' && ready(k) && !buffActive(k.group || k.id)) return castBuff(k);
    }
    const atk = skills.filter(k => (k.type === 'spell' || k.type === 'strike') && ready(k)).pop();
    if (atk) return atk.type === 'spell' ? castSpell(atk, st) : doStrike(atk, st);
    physicalAttack(st, 1, {});
}

function useSkillCost(k) {
    player.mp -= k.mp;
    if (k.cd) player.cds[k.id] = gameNow + k.cd * 1000;
}

function castHeal(k, st) {
    useSkillCost(k);
    const v = rand(k.heal[0], k.heal[1]) + Math.floor(st.sp * k.spK);
    const before = player.hp;
    player.hp = Math.min(st.maxHp, player.hp + v);
    addLog(`✨ ${k.name}：HP +${player.hp - before}`, 'heal');
}

function castBuff(k) {
    useSkillCost(k);
    player.buffs[k.group || k.id] = { src: 'skill', id: k.id, until: gameNow + k.sec * 1000 };
    addLog(`✨ 施放「${k.name}」`, 'heal');
}

function magicDamage(base, spK, st, undeadMul) {
    const mon = hunt.mon;
    let d = rand(base[0], base[1]) + Math.floor(st.sp * spK);
    if (mon.undead && undeadMul) d *= undeadMul;
    d *= slayerMult(mon);
    d *= 1 - clamp(mon.mr, 0, 100) / 200;
    return Math.max(1, Math.round(d));
}

function castSpell(k, st) {
    useSkillCost(k);
    const d = magicDamage(k.dmg, k.spK, st, k.undeadMul);
    hunt.mon.hp -= d;
    lifeSteal(d, st);
    addLog(`🔮 ${k.name}！${hunt.mon.name}受到 ${d} 傷害`, 'magic');
}

function doStrike(k, st) {
    useSkillCost(k);
    for (let i = 0; i < (k.hits || 1); i++) {
        if (!physicalAttack(st, k.mult, { ignoreAc: k.ignoreAc, undeadMul: k.undeadMul, label: k.name })) break;
    }
    if (!hunt || !hunt.mon) return;
    if (k.magic) {
        const d = magicDamage(k.magic.dmg, k.magic.spK, st);
        hunt.mon.hp -= d;
        lifeSteal(d, st);
        addLog(`⚡ ${k.name}的魔力造成 ${d} 傷害`, 'magic');
    }
    if (k.stun) { hunt.stunUntil = gameNow + k.stun; addLog(`${hunt.mon.name}被暈眩了`, 'magic'); }
}

function pickAmmo(type) {
    const list = player.inv.filter(x => ITEMS[x.id].cat === 'ammo' && ITEMS[x.id].ammo === type);
    if (!list.length) return null;
    // 打不死系優先用銀製彈藥
    return (hunt.mon.undead && list.find(x => ITEMS[x.id].silver)) || list.find(x => !ITEMS[x.id].silver) || list[0];
}

function outOfAmmo() {
    if (player.settings.autoHome && useHomeScroll('彈藥用完')) return;
    stopHunt('⚠️ 彈藥用完，停止掛機');
    refreshUI();
}

// 職業剋制（天使：惡魔與不死系；惡魔：人型與神聖系）
function slayerMult(mon) {
    const s = CLASSES[player.cls].slayer;
    return s && s.tags.some(t => mon[t]) ? s.mult : 1;
}

// 吸血：造成傷害的一定比例轉為 HP
function lifeSteal(dmg, st) {
    if (st.lifesteal > 0 && dmg > 0) player.hp = Math.min(st.maxHp, player.hp + Math.max(1, Math.floor(dmg * st.lifesteal)));
}

// 回傳 false 代表無法攻擊（沒彈藥）
function physicalAttack(st, mult, opt) {
    const mon = hunt.mon;
    let ammoDef = null;
    if (st.ranged) {
        const ammo = pickAmmo(st.weaponType.ammo);
        if (!ammo) { outOfAmmo(); return false; }
        ammoDef = ITEMS[ammo.id];
        consumeItem(ammo.id);
    }
    const swings = chance(st.double) ? 2 : 1;
    const def = opt.ignoreAc ? 0 : 10 - mon.ac;
    const hitChance = clamp(0.7 + (st.hit - def) * 0.02, 0.05, 0.95);
    let total = 0, crit = false, hits = 0;
    for (let i = 0; i < swings; i++) {
        if (!chance(hitChance)) continue;
        hits++;
        const maxDie = st.weapon ? st.weapon.dmg[mon.large ? 1 : 0] : 2;
        let d = rand(1, maxDie) + st.dmgBonus + (ammoDef ? ammoDef.dmg : 0);
        if (mon.undead && ((st.weapon && st.weapon.silver) || (ammoDef && ammoDef.silver))) d += rand(1, 10);
        if (mon.undead && opt.undeadMul) d *= opt.undeadMul;
        if (mon.dragon && st.weapon && st.weapon.dragon) d *= st.weapon.dragon;
        d *= slayerMult(mon);
        d *= mult;
        if (chance(st.crit)) { d *= 1.5; crit = true; }
        total += Math.max(1, Math.round(d));
    }
    const label = opt.label ? `「${opt.label}」` : '你';
    if (!hits) { addLog(`${label}沒有命中`, 'miss'); return true; }
    mon.hp -= total;
    lifeSteal(total, st);
    if (st.weapon && st.weapon.drain) player.mp = Math.min(st.maxMp, player.mp + rand(st.weapon.drain[0], st.weapon.drain[1]));
    addLog(`${label}${hits > 1 ? '連擊' : '攻擊'}，${mon.name}受到 ${total} 傷害${crit ? '（爆擊！）' : ''}`, crit ? 'crit' : '');
    return true;
}

function monsterAttack(st) {
    const mon = hunt.mon;
    const magic = mon.magic && chance(mon.magic.p);
    let dmg;
    if (magic) {
        dmg = rand(mon.magic.dmg[0], mon.magic.dmg[1]) * (1 - clamp(st.mr, 0, 150) / 200);
    } else {
        if (chance(st.dodge)) { addLog(`你閃過了${mon.name}的攻擊`, 'miss'); return; }
        const hitChance = clamp(0.7 + (mon.hit - (10 - st.ac)) * 0.02, 0.05, 0.95);
        if (!chance(hitChance)) { addLog(`${mon.name}的攻擊落空`, 'miss'); return; }
        dmg = rand(mon.dmg[0], mon.dmg[1]);
        if (st.ac < 0) dmg -= rand(0, Math.floor(-st.ac / 5));   // AC 負值越多，額外減傷越多
    }
    dmg = Math.max(0, Math.round(dmg - st.reduce));
    if (st.absorb && player.mp > 0) {
        const a = Math.min(player.mp, Math.floor(dmg * st.absorb));
        player.mp -= a;
        dmg -= a;
    }
    player.hp -= dmg;
    addLog(magic ? `${mon.name}施放「${mon.magic.name}」，你受到 ${dmg} 傷害` : `${mon.name}攻擊，你受到 ${dmg} 傷害`, 'hurt');
    if (player.hp <= 0) { onDeath(); return; }
    if (st.counter && dmg > 0 && chance(st.counter)) {
        mon.hp -= dmg;
        addLog(`🛡️ 反擊！${mon.name}受到 ${dmg} 傷害`, 'crit');
        if (mon.hp <= 0) onKill();
    }
}

// ───────── 結果 ─────────
function onKill() {
    const mon = hunt.mon, z = currentZone(), st = calcStats();
    let gold = rand(mon.gold[0], mon.gold[1]);
    if (player.cls === 'royal') gold = Math.round(gold * (1 + Math.max(0, st.cha - 10) * 0.03));
    player.gold += gold;
    player.kills++;
    session.kills++;
    // 狩獵經驗＝怪物經驗 × 倍率 × 高等級遞減（65 級起）
    const exp = Math.max(1, Math.floor(mon.exp * EXP_RATE * huntExpRate(player.lv)));
    session.exp += exp;
    session.gold += gold;
    hunt.mon = null;
    addLog(`☠️ 擊倒${mon.name}！經驗 +${fmt(exp)}、金幣 +${fmt(gold)}`, 'win');
    gainExp(exp);
    rollDrops(mon, z);
    questOnKill(mon, z);

    if (mon.towerFloor) {
        player.towerCleared[mon.towerFloor] = true;
        const next = Math.min(100, mon.towerFloor + 10);
        if (next > player.towerMax) { player.towerMax = next; addLog(`🏛️ 解鎖傲慢之塔 ${next}F！`, 'rare'); }
    }
    if (mon.dragon) {
        const first = !player.dragons[mon.id];
        player.dragons[mon.id] = (player.dragons[mon.id] || 0) + 1;
        player.dragonCd[mon.id] = Date.now() + z.cdH * 3600 * 1000;
        addLog(`🐉 成功討伐${mon.name}！`, 'boss');
        if (first && hasDragonTitle()) {
            addLog('👑 四大龍全數討伐，獲得稱號「屠龍勇者」！', 'boss');
            gameAlert('👑 屠龍勇者', `${player.name}討伐了安塔瑞斯、法利昂、林德拜爾、巴拉卡斯，\n從此被世人稱為「屠龍勇者」！`);
        }
        moveToTown(z.town);
        return;
    }
    hunt.state = 'search';
    hunt.timer = rand(600, 1600);
    checkAutoHome();
}

function rollDrops(mon, z) {
    const st = calcStats();
    const give = (id, nRange) => {
        const d = ITEMS[id];
        const n = nRange ? rand(nRange[0], nRange[1]) : 1;
        if (invWeight() + d.wt * n > st.weightMax) { addLog(`⚠️ 負重已滿，${d.name}撿不起來`, 'warn'); return; }
        addItem(id, n);
        const rare = ['weapon', 'armor', 'elixir'].includes(d.cat) || (d.cat === 'scroll' && d.bless === 1) || d.scroll === 'enchant';
        addLog(`🎁 獲得 ${d.name}${n > 1 ? ' ×' + n : ''}`, rare ? 'rare' : 'loot');
    };
    for (const dr of COMMON_DROPS) {
        if ((dr.minLv && mon.lv < dr.minLv) || (dr.maxLv && mon.lv > dr.maxLv)) continue;
        if (chance(dr.p)) give(dr.id, dr.n);
    }
    if (!mon.boss || mon.towerFloor) for (const dr of (z.drops || [])) if (chance(dr.p)) give(dr.id, dr.n);
    for (const dr of mon.drops) if (chance(dr.p)) give(dr.id, dr.n);
}

function checkAutoHome() {
    const s = player.settings;
    if (!s.autoHome) return;
    const reasons = [];
    if (s.potionOn && healPotionCount() === 0) reasons.push('藥水用完');
    if (invWeight() >= calcStats().weightMax * s.weightPct / 100) reasons.push('負重過高');
    if (reasons.length) useHomeScroll(reasons.join('、'));
}

function onDeath() {
    const z = currentZone(), mon = hunt && hunt.mon;
    player.deaths++;
    let msg = `💀 你被${mon ? mon.name : '敵人'}擊倒了…`;
    if (consumeItem('reviveScroll')) msg += '復活卷軸生效，沒有損失經驗。';
    else {
        const lose = Math.floor(expToNext(player.lv) * deathLossRate(player.lv));
        player.exp = Math.max(0, player.exp - lose);
        msg += `損失 ${fmt(lose)} 經驗（${Math.round(deathLossRate(player.lv) * 100)}%）。`;
    }
    addLog(msg, 'dead');
    player.buffs = {};
    const st = calcStats();
    player.hp = Math.max(1, Math.floor(st.maxHp * 0.3));
    player.mp = Math.floor(st.maxMp * 0.3);
    showToast('💀 你死亡了，已回到村莊', 3000);
    moveToTown(z.town);
}

// ───────── 自然回復與步行（主迴圈呼叫）─────────
function regenTick() {
    const st = calcStats();
    if (invWeight() > st.weightMax * WEIGHT_NO_REGEN) return;
    const mul = player.loc.type === 'town' ? 3 : 1;
    player.hp = Math.min(st.maxHp, player.hp + st.hpRegen * mul);
    player.mp = Math.min(st.maxMp, player.mp + st.mpRegen * mul);
}

function walkTick() {
    if (walkHome && gameNow >= walkHome.until) moveToTown(walkHome.town);
}
