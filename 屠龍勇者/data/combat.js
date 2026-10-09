// 屠龍勇者：自動掛機戰鬥（依賴 player、items、skills、monsters、zones）（ARCHITECTURE.md 第 6 節）
// 執行期狀態（不存檔；重新整理後若 player.hunting 為 true 會自動繼續掛機）
// 多怪戰鬥（2026-10-09「中度 ARPG」）：hunt.mobs 是同時圍上來的怪（各自 atkCd 攻擊間隔、stunUntil 暈眩），
// hunt.mon 是玩家正在打的目標（mobs 之一）；範圍技能（aoe）打全部、分散技能（spread）每一發打不同隻。
// 戰鬥結果全部在這裡算（地圖 ui-scene.js 只負責畫），所以離線收益的快轉模擬照樣適用。
let hunt = null;      // { state:'search'|'fight', timer, mon, mobs, pCd, joinCd, potCd, warned, tele }
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
    hunt = { state: 'search', timer: 600, mon: null, mobs: [], pCd: 0, joinCd: 0, potCd: 0, warned: {} };
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
    if (hunt) leaveFight(800);
    addLog(`🏛️ 移動到永夜之塔 ${f}F`, 'sys');
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
        leaveFight(1500);
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
    if (hunt.pCd <= 0) {
        hunt.pCd = st.atkMs;
        playerAction(st);
        if (!fightAlive()) return;
        reapMobs();
        if (!fightAlive()) return;
    }
    // 首領大招：蓄力時地上出現紅圈，時間到沒離開就吃重擊
    bossSkillTick(dt);
    if (!fightAlive()) return;
    // 每隻圍上來的怪各自計時攻擊
    for (const m of hunt.mobs.slice()) {
        if (m.hp <= 0 || !hunt.mobs.includes(m)) continue;
        m.atkCd -= dt;
        if (m.atkCd > 0) continue;
        m.atkCd = m === hunt.mon ? m.spd : m.spd * MOB_SIDE_SLOW;
        if (gameNow >= m.stunUntil) monsterAttack(calcStats(), m);
        if (!fightAlive()) return;
    }
    reapMobs();
    if (!fightAlive()) return;
    // 打到一半，附近的怪可能被吸引過來加入戰鬥
    hunt.joinCd -= dt;
    if (hunt.joinCd <= 0) {
        hunt.joinCd = MOB_JOIN_MS;
        if (hunt.mobs.length < packMax() && !hunt.mobs.some(m => m.boss) && chance(MOB_JOIN_P)) {
            const add = makeZoneMob(currentZone());
            if (add) { addMob(weakenForPack(add, hunt.mobs.length + 1)); addLog(`${add.name}（Lv.${add.lv}）加入戰鬥！`, 'warn'); }
        }
    }
}

// ───────── 多怪戰鬥 ─────────
const MOB_JOIN_MS = 3000;    // 每 3 秒檢查一次有沒有新的怪加入
const MOB_JOIN_P = 0.15;     // 加入機率
const MOB_SIDE_SLOW = 1.6;   // 非目標的怪出手間隔 ×1.6（圍著輪流進攻，避免多怪時傷害暴增）
// 同時最多幾隻：龍穴 1、永夜之塔 3、其他 6
function packMax() {
    const z = currentZone();
    return !z || z.type === 'dragon' ? 1 : z.type === 'tower' ? 3 : 6;
}
// 一開始出現幾隻（受 packMax 限制）
const PACK_WEIGHTS = [30, 25, 20, 12, 8, 5];   // 1～6 隻的權重
function packRoll() {
    let r = Math.random() * PACK_WEIGHTS.reduce((a, b) => a + b, 0), n = 1;
    for (const w of PACK_WEIGHTS) { if (r < w) break; r -= w; n++; }
    return Math.min(packMax(), n);
}
// 群越大每隻越弱：第 n 隻成群的怪 HP／經驗／金幣 ÷(1+0.2(n−1))、傷害 ÷(1+0.3(n−1))（6 隻：HP 約 50%、傷害 40%）
function weakenForPack(m, n) {
    if (n <= 1 || m.boss) return m;
    const hk = 1 / (1 + 0.2 * (n - 1)), dk = 1 / (1 + 0.3 * (n - 1));
    m.hp = m.maxHp = Math.max(1, Math.round(m.maxHp * hk));
    m.exp = Math.max(1, Math.round(m.exp * hk));
    m.gold = m.gold.map(g => Math.max(0, Math.round(g * hk)));
    m.dmg = m.dmg.map(d => Math.max(1, Math.round(d * dk)));
    if (m.magic) m.magic = { ...m.magic, dmg: m.magic.dmg.map(d => Math.max(1, Math.round(d * dk))) };
    return m;
}

// ───────── 首領大招（地上紅圈預警）─────────
// 首領／龍每 7～11 秒蓄力 1.6 秒，紅圈半徑 1.5 格（以蓄力開始時角色的位置為中心）；
// 地圖畫面開著時由 ui-scene.js 判斷角色是否還在圈內（hunt.tele.dodged／seenAt）；
// 畫面沒開（背景、離線模擬）就用機率：自動閃避開 60%、關 20%。
const TELE_MS = 1600, TELE_CD = [7000, 11000], TELE_MUL = 2.5;
function bossSkillTick(dt) {
    const t = hunt.tele;
    if (t) {
        if (gameNow < t.until) return;
        hunt.tele = null;
        const m = t.mob;
        if (!hunt.mobs.includes(m)) return;
        const live = t.seenAt != null && t.seenAt >= t.until - 300;
        const dodged = live ? !!t.dodged : chance(player.settings.autoDodge ? 0.6 : 0.2);
        if (dodged) { addLog(`💨 你閃開了${m.name}的「${t.name}」！`, 'miss'); return; }
        const st = calcStats();
        let dmg = Math.round(rand(m.dmg[0], m.dmg[1]) * TELE_MUL) - st.reduce;
        dmg = Math.max(1, dmg);
        player.hp -= dmg;
        addLog(`💥 ${m.name}的「${t.name}」命中！你受到 ${dmg} 傷害`, 'hurt');
        if (player.hp <= 0) onDeath(m);
        return;
    }
    for (const m of hunt.mobs) {
        if (!m.boss && !m.dragon) continue;
        if (m.teleCd == null) m.teleCd = rand(...TELE_CD) / 2;
        m.teleCd -= dt;
        if (m.teleCd > 0 || gameNow < m.stunUntil) continue;
        m.teleCd = rand(...TELE_CD);
        const name = m.dragon ? '龍之吐息' : '重擊';
        hunt.tele = { mob: m, name, start: gameNow, until: gameNow + TELE_MS, dodged: null, seenAt: null };
        addLog(`⚠️ ${m.name}正在蓄力「${name}」！快離開紅圈`, 'boss');
        return;
    }
}

// ───────── 玩家手動操作（只在畫面上即時遊玩時用；離線模擬不會呼叫）─────────
// 點怪：在戰鬥中的怪 → 改打牠；地圖上還沒參戰的怪 → 拉進戰鬥（沒在掛機就順便開始掛機）。回傳戰鬥中的怪物物件。
function focusMob(inst) {
    if (hunt && hunt.mobs.includes(inst)) { hunt.mon = inst; return inst; }
    return null;
}
function pullMob(mid) {
    const z = currentZone();
    if (!z || walkHome) return null;
    if (!player.hunting) startHunt();
    if (!hunt) return null;
    if (hunt.state === 'fight' && (hunt.mobs.length >= packMax() || hunt.mobs.some(m => m.boss))) return null;
    let mon = z.type === 'tower' ? makeTowerMonster(player.loc.floor, false) : mid && MONSTERS[mid] ? makeMonster(mid) : makeZoneMob(z);
    if (!mon) return null;
    if (hunt.state !== 'fight') {
        hunt.mobs = []; hunt.mon = null; hunt.state = 'fight'; hunt.pCd = 200; hunt.joinCd = MOB_JOIN_MS; hunt.warned.home = false;
        addMob(mon);
        addLog(`⚔️ 你攻擊了${mon.name}（Lv.${mon.lv}）`, '');
    } else {
        addMob(weakenForPack(mon, hunt.mobs.length + 1));
        addLog(`⚔️ 你引來了${mon.name}（Lv.${mon.lv}）`, '');
    }
    hunt.mon = mon;
    return mon;
}
// 快捷鍵施放技能：戰鬥中立刻出手（重設普攻計時）；治癒、增益在戰鬥外也能用。回傳錯誤訊息（成功回傳 ''）
function manualCast(id) {
    const k = learnedSkills().find(s => s.id === id);
    if (!k || k.type === 'passive') return '尚未學會';
    if (player.cds[k.id] > gameNow) return `冷卻中（${Math.ceil((player.cds[k.id] - gameNow) / 1000)} 秒）`;
    if (player.mp < k.mp) return 'MP 不足';
    const st = calcStats();
    if (k.type === 'heal') { castHeal(k, st); return ''; }
    if (k.type === 'buff') { castBuff(k); return ''; }
    if (!fightAlive()) return '沒有戰鬥目標';
    if (k.type === 'spell') castSpell(k, st); else doStrike(k, st);
    if (!fightAlive()) return '';
    hunt.pCd = st.atkMs;
    reapMobs();
    return '';
}

function fightAlive() { return player.hunting && hunt && hunt.state === 'fight' && hunt.mon; }

function addMob(mon) {
    mon.atkCd = mon.spd * (0.5 + Math.random() * 0.5);
    mon.stunUntil = 0;
    hunt.mobs.push(mon);
    if (!hunt.mon) hunt.mon = mon;
}

// 地區的一般怪（不含稀有、任務首領）
function makeZoneMob(z) {
    if (!z || z.type === 'dragon') return null;
    if (z.type === 'tower') return makeTowerMonster(player.loc.floor, false);
    let pool = z.mons.filter(id => MONSTERS[id].lv <= player.lv + 3);
    if (!pool.length) pool = [z.mons.reduce((a, b) => MONSTERS[a].lv <= MONSTERS[b].lv ? a : b)];
    return makeMonster(pool[rand(0, pool.length - 1)]);
}

// 離開戰鬥（瞬移、換樓層）：全部的怪都放掉
function leaveFight(searchMs) {
    hunt.mon = null; hunt.mobs = []; hunt.tele = null; hunt.state = 'search'; hunt.timer = searchMs;
}

// 把 HP 歸零的怪結算掉；目標死了就換剩下 HP 最少的那隻
function reapMobs() {
    for (const m of hunt.mobs.slice()) {
        if (m.hp > 0) continue;
        onKill(m);
        if (!player.hunting || !hunt || hunt.state !== 'fight') return;
    }
}

// 範圍／分散攻擊的對象：目標排第一，其他依 HP 由少到多
function mobTargets() {
    const rest = hunt.mobs.filter(m => m !== hunt.mon && m.hp > 0).sort((a, b) => a.hp - b.hp);
    return [hunt.mon, ...rest];
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
        mon = makeZoneMob(z);
    }
    hunt.mon = null;
    hunt.mobs = [];
    hunt.state = 'fight';
    hunt.pCd = 300;
    hunt.joinCd = MOB_JOIN_MS;
    hunt.warned.home = false;
    addMob(mon);
    mon.atkCd = mon.spd * 0.6;
    // 一般怪成群出現（首領、龍單獨出現）
    const n = mon.boss ? 1 : packRoll();
    weakenForPack(mon, n);
    for (let i = 1; i < n; i++) addMob(weakenForPack(makeZoneMob(z), n));
    if (mon.boss) addLog(`⚠️ ${mon.name}出現了！`, 'boss');
    else addLog(n > 1 ? `${hunt.mobs.map(m => `${m.name}（Lv.${m.lv}）`).join('、')} 一起圍了上來` : `${mon.name}（Lv.${mon.lv}）出現了`, n > 1 ? 'warn' : '');
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

function magicDamage(base, spK, st, undeadMul, mon = hunt.mon) {
    let d = rand(base[0], base[1]) + Math.floor(st.sp * spK);
    if (mon.undead && undeadMul) d *= undeadMul;
    d *= slayerMult(mon);
    d *= 1 - clamp(mon.mr, 0, 100) / 200;
    return Math.max(1, Math.round(d));
}

function castSpell(k, st) {
    useSkillCost(k);
    // 範圍魔法：打全部圍上來的怪
    const targets = k.aoe ? mobTargets() : [hunt.mon];
    const parts = targets.map(m => {
        const d = magicDamage(k.dmg, k.spK, st, k.undeadMul, m);
        m.hp -= d;
        lifeSteal(d, st);
        return `${m.name} ${d}`;
    });
    addLog(targets.length > 1 ? `🔮 ${k.name}（範圍）！${parts.join('、')} 傷害` : `🔮 ${k.name}！${hunt.mon.name}受到 ${parts[0].split(' ').pop()} 傷害`, 'magic');
}

function doStrike(k, st) {
    useSkillCost(k);
    const opt = { ignoreAc: k.ignoreAc, undeadMul: k.undeadMul, label: k.name };
    const targets = mobTargets();
    const hit = k.aoe ? targets : [hunt.mon];
    if (k.aoe && targets.length > 1) addLog(`💥 ${k.name}（範圍）`, 'magic');
    for (let i = 0; i < (k.hits || 1); i++) {
        // 分散：每一發打不同的怪；範圍：每一發打全部
        const list = k.spread ? [targets[i % targets.length]] : hit;
        for (const m of list) if (!physicalAttack(st, k.mult, opt, m)) return;
        if (!hunt || !hunt.mon) return;
    }
    if (k.magic) {
        for (const m of hit) {
            const d = magicDamage(k.magic.dmg, k.magic.spK, st, 0, m);
            m.hp -= d;
            lifeSteal(d, st);
            addLog(`⚡ ${k.name}的魔力，${m.name}受到 ${d} 傷害`, 'magic');
        }
    }
    if (k.stun) for (const m of hit) { m.stunUntil = gameNow + k.stun; addLog(`${m.name}被暈眩了`, 'magic'); }
}

function pickAmmo(type, mon = hunt.mon) {
    const list = player.inv.filter(x => ITEMS[x.id].cat === 'ammo' && ITEMS[x.id].ammo === type);
    if (!list.length) return null;
    // 打不死系優先用銀製彈藥
    return (mon.undead && list.find(x => ITEMS[x.id].silver)) || list.find(x => !ITEMS[x.id].silver) || list[0];
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
function physicalAttack(st, mult, opt, mon = hunt.mon) {
    let ammoDef = null;
    if (st.ranged) {
        const ammo = pickAmmo(st.weaponType.ammo, mon);
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

function monsterAttack(st, mon) {
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
    if (player.hp <= 0) { onDeath(mon); return; }
    if (st.counter && dmg > 0 && chance(st.counter)) {
        mon.hp -= dmg;
        addLog(`🛡️ 反擊！${mon.name}受到 ${dmg} 傷害`, 'crit');
        if (mon.hp <= 0) onKill(mon);
    }
}

// ───────── 結果 ─────────
function onKill(mon) {
    if (!hunt.mobs.includes(mon)) return;   // 已經結算過
    const z = currentZone(), st = calcStats();
    let gold = rand(mon.gold[0], mon.gold[1]);
    if (player.cls === 'royal') gold = Math.round(gold * (1 + Math.max(0, st.cha - 10) * 0.03));
    player.gold += gold;
    player.kills++;
    session.kills++;
    // 狩獵經驗＝怪物經驗 × 倍率 × 高等級遞減（65 級起）
    const exp = Math.max(1, Math.floor(mon.exp * EXP_RATE * huntExpRate(player.lv)));
    session.exp += exp;
    session.gold += gold;
    hunt.mobs = hunt.mobs.filter(m => m !== mon);
    if (hunt.mon === mon) hunt.mon = hunt.mobs.slice().sort((a, b) => a.hp - b.hp)[0] || null;
    addLog(`☠️ 擊倒${mon.name}！經驗 +${fmt(exp)}、金幣 +${fmt(gold)}`, 'win');
    gainExp(exp);
    rollDrops(mon, z);
    questOnKill(mon, z);

    if (mon.towerFloor) {
        player.towerCleared[mon.towerFloor] = true;
        const next = Math.min(100, mon.towerFloor + 10);
        if (next > player.towerMax) { player.towerMax = next; addLog(`🏛️ 解鎖永夜之塔 ${next}F！`, 'rare'); }
    }
    if (mon.dragon) {
        const first = !player.dragons[mon.id];
        player.dragons[mon.id] = (player.dragons[mon.id] || 0) + 1;
        player.dragonCd[mon.id] = Date.now() + z.cdH * 3600 * 1000;
        addLog(`🐉 成功討伐${mon.name}！`, 'boss');
        if (first && hasDragonTitle()) {
            addLog('👑 四大龍全數討伐，獲得稱號「屠龍勇者」！', 'boss');
            gameAlert('👑 屠龍勇者', `${player.name}討伐了格爾莫斯、瑟拉恩、維斯塔爾、莫爾加斯，\n從此被世人稱為「屠龍勇者」！`);
        }
        moveToTown(z.town);
        return;
    }
    if (hunt.mon) { hunt.pCd = Math.min(hunt.pCd, 300); return; }   // 還有怪圍著：直接打下一隻
    hunt.tele = null;
    hunt.state = 'search';
    hunt.timer = rand(600, 1600);
    checkAutoHome();
}

function rollDrops(mon, z) {
    const st = calcStats();
    // q：武器／防具的品質（undefined＝依怪物擲；null＝普通）；暗黑式詞綴見 affix.js
    const give = (id, nRange, q) => {
        const d = ITEMS[id];
        const n = nRange ? rand(nRange[0], nRange[1]) : 1;
        const gear = d.cat === 'weapon' || d.cat === 'armor';
        // 裝備先擲品質；被戰利品過濾擋下的直接自動賣掉（不進背包、不佔負重）
        const rolled = gear ? applyAffixes({ uid: 0, id, n: 1, ench: 0 }, q === undefined ? rollQuality(mon.boss, false) : q, mon.lv) : null;
        if (rolled && lootFiltered(rolled, player.settings.lootFilter)) {
            const g = instSellPrice(rolled) * n;
            player.gold += g;
            if (session) session.gold += g;
            addLog(`🪙 自動賣出 ${rolled.q ? `【${QUALITY[rolled.q].name}】` : ''}${itemName(rolled)}（+${fmt(g)}）`, 'loot');
            return;
        }
        if (invWeight() + d.wt * n > st.weightMax) { addLog(`⚠️ 負重已滿，${d.name}撿不起來`, 'warn'); return; }
        const inst = addItem(id, n);
        if (rolled && inst) for (const k of ['q', 'af', 'il', 'nm']) if (rolled[k] != null) inst[k] = rolled[k];
        const rare = ['weapon', 'armor', 'elixir'].includes(d.cat) || (d.cat === 'scroll' && d.bless === 1) || d.scroll === 'enchant';
        const tag = gear && inst && inst.q ? `【${QUALITY[inst.q].name}】` : '';
        addLog(`🎁 獲得 ${tag}${gear && inst ? itemName(inst) : d.name}${n > 1 ? ' ×' + n : ''}`, inst && inst.q === 'legend' ? 'boss' : rare ? 'rare' : 'loot');
    };
    for (const dr of COMMON_DROPS) {
        if ((dr.minLv && mon.lv < dr.minLv) || (dr.maxLv && mon.lv > dr.maxLv)) continue;
        if (chance(dr.p)) give(dr.id, dr.n);
    }
    if (!mon.boss || mon.towerFloor) for (const dr of (z.drops || [])) if (chance(dr.p)) give(dr.id, dr.n);
    for (const dr of mon.drops) if (chance(dr.p)) give(dr.id, dr.n);
    // 隨機裝備掉落（至少魔法品質）：一般怪 1.5%、首領 50%
    if (chance(mon.boss ? 0.5 : RANDOM_EQUIP_P)) {
        const id = randomEquipFor(mon.lv);
        if (id) give(id, null, rollQuality(mon.boss, true));
    }
}
const RANDOM_EQUIP_P = 0.015;

function checkAutoHome() {
    const s = player.settings;
    if (!s.autoHome) return;
    const reasons = [];
    if (s.potionOn && healPotionCount() === 0) reasons.push('藥水用完');
    if (invWeight() >= calcStats().weightMax * s.weightPct / 100) reasons.push('負重過高');
    if (reasons.length) useHomeScroll(reasons.join('、'));
}

function onDeath(killer) {
    const z = currentZone(), mon = killer || (hunt && hunt.mon);
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
