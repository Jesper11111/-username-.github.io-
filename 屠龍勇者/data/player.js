// 屠龍勇者：玩家資料、背包、裝備、能力計算、升級（依賴 config、classes、skills、items）
let player = null;

// 遊戲訊息（狩獵畫面下方的紀錄）
const gameLog = [];
let logSeq = 0;
function addLog(msg, cls = '') {
    gameLog.push({ seq: ++logSeq, msg, cls });
    if (gameLog.length > 120) gameLog.shift();
}

const DEFAULT_SETTINGS = {
    potionOn: true, potionPct: 50,   // HP 低於 % 自動喝水
    healPct: 60,                      // HP 低於 % 自動施放治癒魔法
    teleOn: false, telePct: 15,       // HP 低於 % 自動瞬移脫戰
    autoHaste: true,                  // 自動綠水
    autoBrave: true,                  // 自動勇水／精靈餅乾／慎重藥水
    autoBlue: false,                  // 自動藍水
    autoHome: true, weightPct: 82,    // 沒藥水、沒彈藥或負重過高時自動回家
    autoDodge: true,                  // 首領大招（地上紅圈）自動走出圈外
    skills: {},                       // 技能 id → false 代表關閉自動施放
};

function conHpBonus(con) { return Math.max(0, Math.floor((con - 10) / 2)); }
function wisMpBonus(wis) { return Math.max(0, Math.floor((wis - 10) / 2)); }

function createPlayer(name, cls, stats) {
    const c = CLASSES[cls];
    player = {
        name, cls, lv: 1, exp: 0, gold: 300,
        stats: { ...stats }, statPoints: 0, elixirs: 0,
        baseHp: c.startHp + conHpBonus(stats.con), baseMp: c.startMp + wisMpBonus(stats.wis),
        hp: 1, mp: 0,
        inv: [], equip: {}, storage: [], nextUid: 1,
        buffs: {}, cds: {},
        loc: { type: 'town', id: 'talking' }, hunting: false,
        towerMax: 10, towerCleared: {}, dragons: {}, dragonCd: {},
        kills: 0, deaths: 0,
        quests: { ch: 0, active: false, prog: 0, bossDone: false },
        settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
        created: Date.now(),
    };
    c.start.forEach(id => { const it = addItem(id, 1); equipItem(it.uid, true); });
    addItem('redPotion', 30);
    addItem('homeScroll', 3);
    if (c.ammo) addItem(c.ammo, 500);
    const st = calcStats();
    player.hp = st.maxHp;
    player.mp = st.maxMp;
    return player;
}

// ───────── 背包 ─────────
// 道具實體：{ uid, id, n 數量, ench 強化值 }；裝備中的道具放在 player.equip[slot]，不在 inv 裡
function addItem(id, n = 1, ench = 0, list = player.inv) {
    const def = ITEMS[id];
    if (!def) return null;
    if (isStackable(def)) {
        let it = list.find(x => x.id === id);
        if (it) { it.n += n; return it; }
        it = { uid: player.nextUid++, id, n };
        list.push(it);
        return it;
    }
    let last = null;
    for (let i = 0; i < n; i++) {
        last = { uid: player.nextUid++, id, n: 1, ench };
        list.push(last);
    }
    return last;
}

function findInv(uid, list = player.inv) { return list.find(x => x.uid === uid); }
function removeInst(uid, list = player.inv) {
    const i = list.findIndex(x => x.uid === uid);
    return i >= 0 ? list.splice(i, 1)[0] : null;
}
function countItem(id) { return player.inv.reduce((a, x) => a + (x.id === id ? x.n : 0), 0); }
function consumeItem(id, n = 1) {
    const it = player.inv.find(x => x.id === id);
    if (!it || it.n < n) return false;
    it.n -= n;
    if (it.n <= 0) removeInst(it.uid);
    return true;
}
function equippedList() { return SLOT_KEYS.map(k => player.equip[k]).filter(Boolean); }
function findAnyInst(uid) { return findInv(uid) || equippedList().find(x => x.uid === uid) || null; }
function slotOfEquipped(uid) { return SLOT_KEYS.find(k => player.equip[k] && player.equip[k].uid === uid) || null; }
function invWeight() {
    return [...player.inv, ...equippedList()].reduce((a, x) => a + (ITEMS[x.id].wt || 0) * x.n, 0);
}
function itemName(inst) {
    const d = ITEMS[inst.id];
    const e = inst.ench ? (inst.ench > 0 ? '+' : '') + inst.ench + ' ' : '';
    return e + qualityName(inst, d.name);   // 魔法／稀有／傳說品質的名稱（affix.js）
}

// ───────── 裝備 ─────────
function canEquip(def) {
    const c = CLASSES[player.cls];
    if (def.classes && !def.classes.includes(player.cls)) return '你的職業無法使用';
    if (def.cat === 'weapon' && !c.weapons.includes(def.type)) return `${c.name}無法使用${WEAPON_TYPES[def.type].name}`;
    if (def.slot === 'shield' && !c.shield) return `${c.name}無法使用盾牌`;
    return '';
}

function equipItem(uid, silent) {
    const it = findInv(uid);
    if (!it) return false;
    const def = ITEMS[it.id];
    if (def.cat !== 'weapon' && def.cat !== 'armor') return false;
    const err = canEquip(def);
    if (err) { if (!silent) showToast(err); return false; }
    let slot = def.cat === 'weapon' ? 'weapon' : def.slot;
    if (slot === 'ring') slot = !player.equip.ring1 ? 'ring1' : (!player.equip.ring2 ? 'ring2' : 'ring1');
    if (slot === 'weapon' && WEAPON_TYPES[def.type].two && player.equip.shield) unequipSlot('shield');
    if (slot === 'shield' && player.equip.weapon && WEAPON_TYPES[ITEMS[player.equip.weapon.id].type].two) unequipSlot('weapon');
    if (player.equip[slot]) unequipSlot(slot);
    removeInst(uid);
    player.equip[slot] = it;
    clampHpMp();
    return true;
}

function unequipSlot(slot) {
    const it = player.equip[slot];
    if (!it) return;
    delete player.equip[slot];
    player.inv.push(it);
    clampHpMp();
}

// ───────── 增益 ─────────
function buffActive(key) { const b = player.buffs[key]; return !!(b && b.until > gameNow); }
function buffFx(b) {
    if (b.src === 'skill') { const s = findSkill(b.id); return s ? s.fx : null; }
    const d = ITEMS[b.id];
    return d && BUFF_DEFS[d.buff] ? BUFF_DEFS[d.buff].fx : null;
}
function buffName(b) { return b.src === 'skill' ? (findSkill(b.id) || {}).name : ITEMS[b.id].short || ITEMS[b.id].name; }
function cleanBuffs() {
    const now = gameNow;
    for (const k in player.buffs) if (player.buffs[k].until <= now) delete player.buffs[k];
}

function learnedSkills() { return (SKILLS[player.cls] || []).filter(s => player.lv >= s.lv); }

// ───────── 能力計算 ─────────
const FX_KEYS = ['ac', 'hit', 'dmg', 'sp', 'mr', 'crit', 'dodge', 'reduce', 'double', 'absorb', 'counter', 'hpRegen', 'mpRegen',
    'dmgSp', 'spdMul', 'lifesteal', 'hp', 'mp', 'haste', 'brave', ...STAT_KEYS];

function addFx(acc, fx) {
    if (!fx) return;
    for (const k of FX_KEYS) {
        if (fx[k] == null) continue;
        if (typeof fx[k] === 'boolean') acc[k] = acc[k] || fx[k];
        else acc[k] = (acc[k] || 0) + fx[k];
    }
}

function calcStats() {
    const p = player, c = CLASSES[p.cls], fx = {}, now = gameNow;
    let weaponEnch = 0;
    for (const slot of SLOT_KEYS) {
        const it = p.equip[slot];
        if (!it) continue;
        const d = ITEMS[it.id];
        if (d.cat === 'weapon') { weaponEnch = it.ench || 0; addFx(fx, { sp: d.sp, lifesteal: d.lifesteal }); continue; }
        addFx(fx, d);
        if (d.safe >= 0) fx.ac = (fx.ac || 0) + (it.ench || 0);
    }
    for (const slot of SLOT_KEYS) addFx(fx, affixFx(p.equip[slot]));   // 暗黑式詞綴（affix.js）
    for (const k in p.buffs) if (p.buffs[k].until > now) addFx(fx, buffFx(p.buffs[k]));

    const maxHp = p.baseHp + (fx.hp || 0);
    const maxMp = p.baseMp + (fx.mp || 0);
    for (const s of learnedSkills()) {
        if (s.type === 'passive' && (!s.cond || (s.cond === 'lowHp' && p.hp < maxHp * 0.5))) addFx(fx, s.fx);
    }

    const s = {};
    STAT_KEYS.forEach(k => s[k] = p.stats[k] + (fx[k] || 0));
    const w = p.equip.weapon ? ITEMS[p.equip.weapon.id] : null;
    const wt = WEAPON_TYPES[w ? w.type : 'fist'];
    const ranged = !!wt.ranged;
    const sp = Math.floor(p.lv / c.spDiv) + Math.max(0, s.int - 11) + (fx.sp || 0);
    const statHit = ranged ? Math.floor((s.dex - 8) / 2) : Math.floor((s.str - 8) / 3) + Math.floor((s.dex - 8) / 4);
    const statDmg = ranged ? Math.max(0, Math.floor((s.dex - 10) / 2)) : Math.max(0, Math.floor((s.str - 10) / 2));
    let spdMul = 1;
    if (fx.haste) spdMul *= 0.75;
    if (fx.brave) spdMul *= 0.75;
    if (fx.spdMul) spdMul *= Math.max(0.3, 1 - fx.spdMul);

    return {
        ...s, sp, maxHp, maxMp, ranged, weapon: w, weaponType: wt, weaponEnch,
        hit: p.lv + statHit + ((w && w.hit) || 0) + (fx.hit || 0),
        dmgBonus: statDmg + Math.floor(p.lv / 4) + weaponEnch + (fx.dmg || 0) + Math.floor(sp * (fx.dmgSp || 0)),
        ac: 10 - Math.max(0, Math.floor((s.dex - 9) / 3)) - Math.floor(p.lv / 10) - (fx.ac || 0),
        mr: c.mr + Math.max(0, s.wis - 10) * 2 + (fx.mr || 0),
        crit: 0.05 + ((w && w.crit) || 0) + (fx.crit || 0),
        dodge: clamp(Math.max(0, s.dex - 12) * 0.01 + (fx.dodge || 0), 0, 0.5),
        reduce: fx.reduce || 0,
        double: (wt.double || 0) + (fx.double || 0),
        absorb: fx.absorb || 0,
        counter: fx.counter || 0,
        lifesteal: fx.lifesteal || 0,
        hpRegen: 1 + Math.floor(p.lv / 8) + Math.max(0, s.con - 12) + (fx.hpRegen || 0),
        mpRegen: 1 + Math.floor(p.lv / 12) + Math.max(0, Math.floor((s.wis - 10) * c.mpRegenK)) + (fx.mpRegen || 0),
        weightMax: (s.str + s.con) * 100,
        atkMs: Math.round(wt.spd * spdMul),
        haste: !!fx.haste, brave: !!fx.brave,
    };
}

function clampHpMp() {
    const st = calcStats();
    player.hp = Math.min(player.hp, st.maxHp);
    player.mp = Math.min(player.mp, st.maxMp);
}

// ───────── 經驗與升級 ─────────
function gainExp(n) {
    if (player.lv >= MAX_LEVEL) return;
    player.exp += n;
    const c = CLASSES[player.cls];
    while (player.lv < MAX_LEVEL && player.exp >= expToNext(player.lv)) {
        player.exp -= expToNext(player.lv);
        player.lv++;
        const st = calcStats();
        const hpUp = rand(c.hp[0], c.hp[1]) + conHpBonus(st.con);
        const mpUp = rand(c.mp[0], c.mp[1]) + wisMpBonus(st.wis);
        player.baseHp += hpUp;
        player.baseMp += mpUp;
        if (player.lv >= BONUS_STAT_LEVEL) player.statPoints++;
        const st2 = calcStats();
        player.hp = st2.maxHp;
        player.mp = st2.maxMp;
        addLog(`🎉 升級！Lv.${player.lv}（HP +${hpUp}、MP +${mpUp}）`, 'lvup');
        (SKILLS[player.cls] || []).filter(s => s.lv === player.lv).forEach(s => addLog(`✨ 學會了「${s.name}」`, 'lvup'));
        if (player.lv >= BONUS_STAT_LEVEL) addLog('獲得 1 點能力點數，可在「角色」分配', 'lvup');
    }
    if (player.lv >= MAX_LEVEL) player.exp = 0;
}

function addStatPoint(k) {
    if (player.statPoints <= 0 || player.stats[k] >= STAT_CAP) return;
    player.stats[k]++;
    player.statPoints--;
}

function useElixir(k) {
    if (player.elixirs >= ELIXIR_MAX) { showToast(`萬能藥最多只能吃 ${ELIXIR_MAX} 瓶`); return; }
    if (player.stats[k] >= STAT_CAP) { showToast('這項能力已達上限'); return; }
    if (!consumeItem('elixir')) return;
    player.stats[k]++;
    player.elixirs++;
    showToast(`${STAT_NAMES[k]} +1`);
}

function hasDragonTitle() { return DRAGON_IDS.every(id => player.dragons[id]); }
