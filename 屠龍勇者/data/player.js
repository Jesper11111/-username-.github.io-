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
    lootFilter: 1,                    // 戰利品過濾：0 全撿、1 普通自動賣、2 魔法以下自動賣、3 只撿傳說（affix.js）
    lootKeepAf: [],                   // 戰利品過濾例外：有這些詞綴（AFFIXES 代號）的裝備一律保留
    skills: {},                       // 舊版：技能 id → false 代表關閉自動施放（2026-10-15 起改用技能欄，只在舊存檔轉換時參考）
    skillSlots: [],                   // 舊版技能欄 8 格（2026-10-15 改用 bar，只在舊存檔轉換時參考）
    bar: [],                          // 快捷欄 22 格 { id, a }（技能或道具＋自動開關，第 40 節）；potionOn／autoHaste／autoBrave／autoBlue／teleOn 改由這裡決定
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
        towerMax: 10, towerCleared: {}, towerBossCd: {}, dragons: {}, dragonCd: {},
        kills: 0, deaths: 0,
        quests: { ch: 0, active: false, prog: 0, bossDone: false },
        settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), mapRun: null,
        created: Date.now(),
        skills: [],
    };
    // Lv.1 就能學的（法師、天使的 1 級魔法與惡魔的血之渴望等）直接學會，其他要魔法書
    player.skills = classSkillList(cls).filter(s => skillNeedLv(s, cls) <= 1).map(s => s.id);
    player.settings.bar = defaultBar(player);
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
    clockSanity();
}

// 冷卻／增益剩餘時間不可能超過原本的長度：別台裝置（或舊版時鐘落後）存的時間戳比現在的 gameNow 快很多時，夾回上限（2026-10-12 暗影斬冷卻 6946 秒）
function clockSanity() {
    const now = gameNow, p = player;
    for (const id in p.cds) {
        const r = id.startsWith('res_') && RESONANCE[id.slice(4)], k = !r && learnedSkillById(id);
        const max = ((r ? r.cd : k ? k.cd : 0) || 180) * 1000;
        if (p.cds[id] - now > max) p.cds[id] = now + max;
    }
    for (const key in p.buffs) {
        const b = p.buffs[key], d = b.src === 'item' ? ITEMS[b.id] : learnedSkillById(b.id);
        const max = ((d && d.sec) || 600) * 1000;
        if (b.until - now > max) b.until = now + max;
    }
}
function learnedSkillById(id) { return SKILL_BY_ID[id] || null; }

// ───────── 技能（2026-10-15 起：用魔法書學，存在 player.skills；ARCHITECTURE.md 第 40 節）─────────
// 已學會、而且這個職業用得了的技能（被動學會就生效）
function learnedSkills(p = player) {
    return (p.skills || []).map(id => SKILL_BY_ID[id]).filter(s => s && skillNeedLv(s, p.cls));
}
function hasSkill(id) { return (player.skills || []).includes(id); }
// ───────── 快捷欄（player.settings.bar，2026-10-15 起取代 skillSlots；第 40 節）─────────
// 22 格 { id, a }：id＝技能 id 或道具 id（'' 空格），a＝1 自動使用（格子往下拉切換）。
//   0～7  第一排（PC 底部骷髏頭左邊、手機地圖下方第一排；鍵盤 1～8）
//   8～15 第二排（PC 底部右邊、手機第二排；鍵盤 Q E R F Z X C V）
//   16～21 PC 上排原本藥水、卷軸的 6 格（手機不顯示，但自動照樣生效）
// 自動技能＝依格子順序施放（治癒 → 增益 → 攻擊）；自動道具：治癒藥水 HP 低於設定時喝、增益藥水效果沒了就喝、瞬移卷軸 HP 危險時用。
const SKILL_SLOTS = 8;
const BAR_N = 22;
const BAR_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', 'q', 'e', 'r', 'f', 'z', 'x', 'c', 'v'];   // WASD 是移動鍵，第二排避開
function barItemOk(id) { const d = ITEMS[id]; return !!d && (!!d.heal || !!d.buff || id === 'homeScroll' || id === 'teleScroll'); }
function barCanAuto(id) {
    const s = SKILL_BY_ID[id];
    if (s) return s.type !== 'passive';
    return barItemOk(id) && id !== 'homeScroll';   // 自動回家在設定頁
}
function barList(p = player) { return (p.settings.bar || []); }
function barAutoItemIds(p = player) { return new Set(barList(p).filter(b => b.a && b.id && !SKILL_BY_ID[b.id] && barItemOk(b.id)).map(b => b.id)); }
function barHealAuto() { return [...barAutoItemIds()].some(id => ITEMS[id].heal); }
// 自動施放的技能（已學會、主動），格子順序＝優先順序
function slotSkills() {
    const out = [];
    for (const b of barList()) {
        const s = b.a && b.id && hasSkill(b.id) ? SKILL_BY_ID[b.id] : null;
        if (s && s.type !== 'passive' && !out.includes(s)) out.push(s);
    }
    return out;
}
// 預設快捷欄：第一排＝預設技能（自動）；第二排＝補給（照舊的自動補給設定）；PC 上排＝同樣的補給（手動）
function defaultBar(p = player, skillIds) {
    const s = p.settings, brave = braveItemFor(p.cls) || '';
    const E = (id, a) => ({ id: id || '', a: id && a ? 1 : 0 });
    const skills = (skillIds || defaultSkillSlots(p)).slice(0, SKILL_SLOTS);
    while (skills.length < SKILL_SLOTS) skills.push('');
    const sup = [['redPotion', s.potionOn !== false], ['greenPotion', s.autoHaste !== false], [brave, s.autoBrave !== false], ['bluePotion', !!s.autoBlue], ['homeScroll', 0], ['teleScroll', !!s.teleOn]];
    return [...skills.map(id => E(id, 1)), ...sup.map(([id, a]) => E(id, a)), E(''), E(''), ...sup.map(([id]) => E(id, 0))];
}
function normalizeBar(p) {
    const bar = Array.isArray(p.settings.bar) ? p.settings.bar : [];
    p.settings.bar = Array.from({ length: BAR_N }, (_, i) => {
        const b = bar[i] || {}, id = b.id && (SKILL_BY_ID[b.id] || barItemOk(b.id)) ? b.id : '';
        return { id, a: id && b.a && barCanAuto(id) ? 1 : 0 };
    });
}
// 預設技能欄（新角色、舊存檔轉換、「自動排好」）：最強的治癒 → 增益最多 3 個 → 攻擊技能，排滿 8 格。
// 職業技能優先；攻擊魔法只給施法職業（能學到 4 級以上魔法：法師、天使、妖精、魔鬥士、聖騎士），物理系增益只給非施法職業
const MAGIC_BUFF_PREF = ['haste', 'mageBarrier', 'holyBarrier', 'meditate', 'bodyBless', 'armorBless', 'mShield', 'enchantDex', 'enchantStr', 'holyWeapon', 'berserkSpell', 'absBarrier'];
const PHYSICAL_BUFFS = ['holyWeapon', 'enchantStr', 'berserkSpell'];
function defaultSkillSlots(p = player, skip = {}) {
    const L = learnedSkills(p).filter(s => s.type !== 'passive' && skip[s.id] !== false);
    const caster = (MAGIC_CLASS[p.cls] || { max: 0 }).max >= 4;
    const lvOf = s => skillNeedLv(s, p.cls);
    const heal = L.filter(s => s.type === 'heal').sort((a, b) => b.heal[1] - a.heal[1])[0];
    const classBuffs = L.filter(s => s.type === 'buff' && s.kind === 'class').sort((a, b) => lvOf(b) - lvOf(a));
    const magicBuffs = L.filter(s => s.type === 'buff' && s.kind === 'magic' && !(caster && PHYSICAL_BUFFS.includes(s.id)))
        .sort((a, b) => MAGIC_BUFF_PREF.indexOf(a.id) - MAGIC_BUFF_PREF.indexOf(b.id));
    const atkOrder = (a, b) => (!!(b.aoe || b.spread) - !!(a.aoe || a.spread)) || lvOf(b) - lvOf(a);
    const classAtk = L.filter(s => (s.type === 'spell' || s.type === 'strike') && s.kind === 'class').sort(atkOrder);
    const magicAtk = caster ? L.filter(s => s.type === 'spell' && s.kind === 'magic').sort(atkOrder) : [];
    const buffs = [...classBuffs, ...magicBuffs];
    // 還有空格：補剩下的增益（舊版所有增益都會自動施放）
    const ids = [heal, ...buffs.slice(0, 3), ...classAtk, ...magicAtk, ...buffs.slice(3)].filter(Boolean).map(s => s.id).slice(0, SKILL_SLOTS);
    while (ids.length < SKILL_SLOTS) ids.push('');
    return ids;
}

// ───────── 能力計算 ─────────
const FX_KEYS = ['ac', 'hit', 'dmg', 'sp', 'mr', 'crit', 'dodge', 'reduce', 'double', 'absorb', 'counter', 'hpRegen', 'mpRegen',
    'dmgSp', 'spdMul', 'lifesteal', 'hp', 'mp', 'haste', 'brave', 'wise', 'weight', ...STAT_KEYS];
// 攻速規則（毫秒）：見 calcStats 的 atkMs／castMs
const ATK_BASE_MS = 1000, ATK_MIN_MS = 400, POTION_SPD_MS = 300, SPD_EXTRA_MAX_MS = 300, SPD_PCT_TO_MS = 700;
const CAST_BASE_MS = 1200, CAST_MIN_MS = 600;

function addFx(acc, fx) {
    if (!fx) return;
    for (const k of FX_KEYS) {
        if (fx[k] == null) continue;
        if (typeof fx[k] === 'boolean') acc[k] = acc[k] || fx[k];
        else acc[k] = (acc[k] || 0) + fx[k];
    }
}

// 防禦（顯示用，2026-10-12 使用者要求改成正數、越高越好）＝10 − AC；內部戰鬥公式仍用天堂式 AC（越低越好）
function defenseOf(st) { return 10 - st.ac; }

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
    // 攻擊間隔（2026-10-18 改成加減秒數，使用者定的規則）：基礎 1 秒＋武器揮舞加值 − 綠水 0.3 − 勇水 0.3 − 其他加速（最多 0.3），最快 0.4 秒
    // 其他加速：技能／詞綴／共鳴的 spdMul（攻速比例）每 1% 換成 7ms（15%→0.105 秒）
    const extraMs = Math.min(SPD_EXTRA_MAX_MS, Math.round((fx.spdMul || 0) * SPD_PCT_TO_MS));
    const atkMs = Math.max(ATK_MIN_MS, ATK_BASE_MS + wt.add * 1000 - (fx.haste ? POTION_SPD_MS : 0) - (fx.brave ? POTION_SPD_MS : 0) - extraMs);
    // 施法間隔（攻擊魔法用，不看武器）：1.2 秒 − 綠水 0.3 − 慎重藥水 0.3（法師、魔鬥士、天使），最快 0.6 秒
    const castMs = Math.max(CAST_MIN_MS, CAST_BASE_MS - (fx.haste ? POTION_SPD_MS : 0) - (fx.wise ? POTION_SPD_MS : 0));

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
        // 負重（2026-10-16 改版）：底值 1200＋（力量＋體質）×80＋等級×20＋裝備（腰帶 weight）；原本 (力量＋體質)×100，1～50 級不會成長
        weightMax: 1200 + (s.str + s.con) * 80 + p.lv * 20 + (fx.weight || 0),
        atkMs, castMs,
        haste: !!fx.haste, brave: !!fx.brave, wise: !!fx.wise,
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
        sfx('levelup');
        classSkillList(player.cls).filter(s => skillNeedLv(s, player.cls) === player.lv && !hasSkill(s.id))
            .forEach(s => addLog(`📖 可以學習「${s.name}」了（需要${skillBookName(s)}）`, 'lvup'));
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
