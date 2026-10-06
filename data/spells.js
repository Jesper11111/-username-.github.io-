// 仙法系統與「武學密典」彈窗（ARCHITECTURE.md 第 35 節）；資料表在 config-spells.js
//   player.spells     = 已學會的仙法 id（下品／中品／上品：秘典碎片合成 synthesizeSpell；絕學尚無取得方式）
//   player.spellShards／spellShardsMid／spellShardsHigh = 下品／中品／上品武學秘典碎片（config-spells.js 的 SPELL_SHARD_KINDS）
//   player.spellSlots = 技能格內放的主動仙法 id（格數 = 1 + 人物等級 ÷ SPELL_SLOT_LEVEL_STEP）
// 被動光環學會即生效（getSpellAuraBonus，stats.js／elements.js 讀取）；主動仙法放進技能格才會施放（getAllSkills 讀取）

// ---- 由 config-spells.js 組出 200 招（載入時執行一次，只讀同檔之前載入的設定）----
const spellList = (function buildSpellList() {
    const list = [];
    const gradeKeys = ["low", "mid", "high"];
    const slotKinds = ["single", "aoe", "control", null, "heal", "aura"];   // null = 依屬性的 support（buff / shield）

    const make = (base, kind, grade, attr, auraValues, controlAoe) => {
        let g = SPELL_GRADE_STATS[grade];
        let evil = base.faction === "邪";
        let s = Object.assign(base, {
            grade, kind,
            attr: attr ? attr.key : null,
            attrName: attr ? attr.name : "法則",
            dmgType: attr ? attr.dmgType : "mag",
            role: kind === "single" || kind === "aoe" ? "atk" : kind === "control" ? "control"
                : kind === "buff" || kind === "shield" ? "support" : kind,
            active: kind !== "aura"
        });
        if (s.active) {
            s.mpCost = g.mp;
            if (evil) s.hpCost = g.hpCost;
        }
        let power = evil ? SPELL_EVIL_POWER : 1;
        if (kind === "single" || kind === "aoe") {
            s.mult = +(g[kind] * power).toFixed(2);
            if (attr && attr.effect) s.effect = { type: attr.effect, chance: g.effectChance };
            if (attr && attr.lifesteal) s.lifesteal = attr.lifesteal;
        } else if (kind === "control") {
            s.mult = +(g.control * power).toFixed(2);
            s.freeze = g.freeze;
            s.aoe = controlAoe;
        } else if (kind === "buff") {
            s.mult = g.buff; s.duration = g.duration;
        } else if (kind === "shield") {
            s.reduce = g.shield; s.duration = g.duration;
        } else if (kind === "heal") {
            s.heal = g.heal;
        } else if (kind === "aura") {
            s.aura = auraValues;
        }
        return s;
    };

    spellAttributes.forEach(attr => {
        gradeKeys.forEach((grade, gi) => {
            attr.names[gi].forEach((name, slot) => {
                let kind = slotKinds[slot] || attr.support;
                list.push(make({ id: `${attr.key}-${grade}-${slot + 1}`, name, faction: attr.faction },
                    kind, grade, attr, attr.aura[gi], grade !== "low"));
            });
        });
    });
    spellUltimates.forEach(u => {
        let attr = u.attr ? spellAttributes.find(a => a.key === u.attr) : null;
        list.push(make({ id: u.id, name: u.name, faction: u.faction, ultimate: true }, u.kind, "ultimate", attr, u.aura, !!u.aoe));
    });
    return list;
})();
const spellById = {};
spellList.forEach(s => { spellById[s.id] = s; });

function getSpell(id) { return spellById[id] || null; }

function isSpellLearned(id) {
    return Array.isArray(player.spells) && player.spells.includes(id);
}

// 技能格數：Lv1 起 1 格，每 SPELL_SLOT_LEVEL_STEP 級多 1 格
function getSpellSlotCount() {
    return 1 + Math.floor((player.level || 1) / SPELL_SLOT_LEVEL_STEP);
}

// 目前技能格內、已學會的主動仙法（超過格數的部分不生效，例如轉世等級重置後）
function getEquippedSpells() {
    let slots = Array.isArray(player.spellSlots) ? player.spellSlots.slice(0, getSpellSlotCount()) : [];
    return slots.map(getSpell).filter(s => s && s.active && isSpellLearned(s.id));
}

// 所有已學會的被動光環加總（負值是魔功的代價）
function getSpellAuraBonus() {
    let total = { physPct: 0, magPct: 0, hpPct: 0, mpPct: 0, def: 0, eva: 0, fire: 0, ice: 0, poison: 0, metal: 0, thunder: 0 };
    (player.spells || []).forEach(id => {
        let s = getSpell(id);
        if (!s || !s.aura) return;
        for (let k in s.aura) total[k] += s.aura[k];
    });
    return total;
}

// 轉成戰鬥用的技能物件（combat.js 的 playerAttackTurn 讀取；渡劫共用）
function spellToCombatSkill(s) {
    let icon = SPELL_ROLES[s.role].icon;
    return {
        isSpell: true,
        name: s.name, type: s.kind === "single" ? "single" : s.kind, dmgType: s.dmgType, mpCost: s.mpCost,
        mult: s.kind === "heal" ? s.heal : (s.mult || 1),
        duration: s.duration, reduce: s.reduce, freeze: s.freeze, aoe: s.aoe,
        effect: s.effect, lifesteal: s.lifesteal, hpCost: s.hpCost,
        msg: `${icon} 施展${s.faction === "邪" ? "魔功" : "仙法"}【${s.name}】！`
    };
}

function getSpellTypeLabel(s) {
    if (s.ultimate) return s.faction === "正" ? "法則大道" : "禁忌法";
    return s.faction === "正" ? "正道仙法" : "邪道魔功";
}

// 效果說明（密典卡片與詳細資訊共用）
function describeSpell(s) {
    const pct = v => `${Math.round(v * 100)}%`;
    const dmgStat = s.dmgType === "phys" ? "物理攻擊" : "術法攻擊";
    const effectNames = { metal: "金重擊", fire: "燒傷", ice: "冰凍", poison: "中毒", thunder: "雷擊" };
    let parts = [];
    if (s.kind === "single" || s.kind === "aoe") {
        parts.push(`${s.kind === "aoe" ? "對全部敵人各" : "對單一敵人"}造成 ${dmgStat} × ${s.mult} 傷害`);
        if (s.effect) parts.push(`${pct(s.effect.chance)} 機率觸發${effectNames[s.effect.type]}`);
        if (s.lifesteal) parts.push(`依傷害回復 ${pct(s.lifesteal)} 氣血`);
    } else if (s.kind === "control") {
        parts.push(`${s.aoe ? "對全部敵人各" : "對單一敵人"}造成 ${dmgStat} × ${s.mult} 傷害，${pct(s.freeze)} 機率使其定身 1 回合`);
    } else if (s.kind === "buff") {
        parts.push(`攻擊力 × ${s.mult}，持續 ${s.duration} 回合`);
    } else if (s.kind === "shield") {
        parts.push(`受到傷害 -${pct(s.reduce)}，持續 ${s.duration} 回合`);
    } else if (s.kind === "heal") {
        parts.push(`立即回復 ${pct(s.heal)} 最大氣血`);
    } else if (s.kind === "aura") {
        parts.push("被動：" + Object.keys(s.aura).map(k => {
            let v = s.aura[k];
            let isPct = /Pct$/.test(k);
            return `${SPELL_AURA_LABELS[k]} ${v >= 0 ? '+' : ''}${isPct ? pct(v) : v + (POINT_STAT_KEYS.includes(k) ? '' : '%')}`;   // 防禦是點數（第 66 節）
        }).join("、"));
    }
    if (s.active) parts.push(`耗魔 ${fmtCombat(skillMpCost(s.mpCost))}${s.hpCost ? `、反噬氣血 ${pct(s.hpCost)}` : ''}`);
    return parts.join("；");
}

// ---- 武學秘典碎片（第 35 節末）：下品來自奇遇／機緣（encounter.js）；中品＝凡界野外、上品＝靈界野外（rollSpellShardFieldDrops）----
function spellShardName(grade) { return `${SPELL_GRADES[grade].name}武學秘典碎片`; }
function getSpellShards(grade) { return player[SPELL_SHARD_KINDS[grade].key] || 0; }
function addSpellShards(n, source, grade) {
    grade = SPELL_SHARD_KINDS[grade] ? grade : SPELL_SHARD_GRADE;
    n = Math.floor(n);
    if (!(n > 0)) return 0;
    const key = SPELL_SHARD_KINDS[grade].key;
    player[key] = (player[key] || 0) + n;
    if (source) addLog(`📜 ${source}，獲得${spellShardName(grade)} ×${n}（${player[key]} / ${SPELL_SHARD_NEED}）`, "level-up", false, "item");
    return n;
}
function unlearnedShardSpells(grade) {
    grade = SPELL_SHARD_KINDS[grade] ? grade : SPELL_SHARD_GRADE;
    return spellList.filter(s => s.grade === grade && !isSpellLearned(s.id));
}
// 野外掉落（combat.js：rolls＝takeDropRolls 的掉寶次數；離線用收益次數，save.js）：所在野外是靈界分類＝上品，否則（凡界）＝中品
function rollSpellShardFieldDrops(rolls, silent) {
    const m = player.currentMap;
    if (!(rolls > 0) || !m || player.currentMapIsSafe) return '';
    const inLing = typeof isLingjieMapCategory === 'function' && isLingjieMapCategory(getMapCategoryIndex(m.name));
    const grade = inLing ? 'high' : 'mid';
    const cm = typeof getChallengeCraftMult === 'function' ? getChallengeCraftMult() : 1;   // 挑戰模式（第 70 節）：越 1 境 ×1.5、2 境 ×2、3 境以上 ×3
    const exp = rolls * SPELL_SHARD_FIELD_DROP[grade] * cm;
    let n = Math.floor(exp); if (Math.random() < exp - n) n++;
    if (!(n > 0)) return '';
    addSpellShards(n, null, grade);
    const t = `${spellShardName(grade)}×${n}`;
    if (!silent) addLog(`📜 妖獸身上掉出 ${t}（${getSpellShards(grade)} / ${SPELL_SHARD_NEED}）`, "level-up", false, "item");
    return t;
}
// 集滿 SPELL_SHARD_NEED 片：隨機習得一招尚未學會的該品仙法
function synthesizeSpell(grade) {
    grade = SPELL_SHARD_KINDS[grade] ? grade : SPELL_SHARD_GRADE;
    const gname = SPELL_GRADES[grade].name, key = SPELL_SHARD_KINDS[grade].key;
    const pool = unlearnedShardSpells(grade);
    if (!pool.length) { gameAlert(`${gname}仙法已全部習得。`); return; }
    if (getSpellShards(grade) < SPELL_SHARD_NEED) { gameAlert(`${spellShardName(grade)}不足！需要 ${SPELL_SHARD_NEED} 片（目前 ${getSpellShards(grade)}）。`); return; }
    const s = pool[Math.floor(Math.random() * pool.length)];
    player[key] -= SPELL_SHARD_NEED;
    if (!Array.isArray(player.spells)) player.spells = [];
    player.spells.push(s.id);
    spellSelectedId = s.id;
    addLog(`📜 秘典碎片拼合成冊，習得${SPELL_GRADES[s.grade].name}仙法【${s.name}】（${s.attrName}・${SPELL_ROLES[s.role].name}）！`, "level-up", false, "item");
    if (typeof showToast === 'function') showToast(`📜 習得【${s.name}】`, 'ok');
    renderSpellModal();
    updateUI();
    if (typeof saveLocal === 'function') saveLocal();
}

// ---- 武學密典彈窗 ----
let spellFilter = { attr: "all", faction: "all", role: "all", grade: "all" };
let spellSelectedId = null;

function openSpellModal() {
    document.getElementById('spell-modal').style.display = 'flex';
    renderSpellModal();
}

function setSpellFilter(key, value) {
    spellFilter[key] = value;
    renderSpellModal();
}

function selectSpell(id) {
    spellSelectedId = spellSelectedId === id ? null : id;
    renderSpellModal();
}

function renderSpellModal() {
    const box = document.getElementById('spell-modal-body');
    if (!box) return;
    let learnedCount = spellList.filter(s => isSpellLearned(s.id)).length;
    let slotCount = getSpellSlotCount();
    let slots = Array.isArray(player.spellSlots) ? player.spellSlots : [];

    // 技能格
    let slotHtml = '';
    for (let i = 0; i < slotCount; i++) {
        let s = getSpell(slots[i]);
        let valid = s && isSpellLearned(s.id);
        slotHtml += `<div class="spell-slot${valid ? ' filled' : ''}">
            <span class="spell-slot-no">${i + 1}</span>
            ${valid ? `${SPELL_ROLES[s.role].icon} ${s.name}<button class="spell-slot-x" onclick="unequipSpell(${i})" aria-label="卸下">✕</button>` : '<span class="spell-slot-empty">空格</span>'}
        </div>`;
    }
    let nextLv = slotCount * SPELL_SLOT_LEVEL_STEP;

    // 篩選列
    const chip = (key, value, label) => `<button class="spell-chip${spellFilter[key] === value ? ' on' : ''}" onclick="setSpellFilter('${key}', '${value}')">${label}</button>`;
    let filters = `
        <div class="spell-filter-row">${chip('attr', 'all', '全部屬性')}${spellAttributes.map(a => chip('attr', a.key, a.name)).join('')}${chip('attr', 'law', '法則')}</div>
        <div class="spell-filter-row">${chip('faction', 'all', '正邪不限')}${chip('faction', '正', '☯️ 正道')}${chip('faction', '邪', '😈 邪道')}
            ${chip('role', 'all', '全部類型')}${Object.keys(SPELL_ROLES).map(r => chip('role', r, SPELL_ROLES[r].icon + SPELL_ROLES[r].name)).join('')}</div>
        <div class="spell-filter-row">${chip('grade', 'all', '全部品階')}${Object.keys(SPELL_GRADES).map(g => chip('grade', g, SPELL_GRADES[g].name)).join('')}</div>`;

    let shown = spellList.filter(s =>
        (spellFilter.attr === "all" || (spellFilter.attr === "law" ? !s.attr : s.attr === spellFilter.attr)) &&
        (spellFilter.faction === "all" || s.faction === spellFilter.faction) &&
        (spellFilter.role === "all" || s.role === spellFilter.role) &&
        (spellFilter.grade === "all" || s.grade === spellFilter.grade));

    let cards = shown.map(s => {
        let learned = isSpellLearned(s.id);
        let g = SPELL_GRADES[s.grade];
        return `<button class="spell-card${learned ? ' learned' : ''}${spellSelectedId === s.id ? ' selected' : ''}" onclick="selectSpell('${s.id}')">
            <span class="spell-card-name">${s.name}</span>
            <span class="spell-card-meta"><span style="color:${learned ? g.color : '#6b7280'};">${g.name}</span>・${s.attrName}・${SPELL_ROLES[s.role].icon}${SPELL_ROLES[s.role].name}${s.faction === "邪" ? '・魔' : ''}</span>
        </button>`;
    }).join('');

    // 選中的詳細資訊
    let detail = '';
    let sel = getSpell(spellSelectedId);
    if (sel) {
        let learned = isSpellLearned(sel.id);
        let action = '';
        if (!learned) action = `<p class="spell-detail-note">🔒 尚未習得（${SPELL_SHARD_KINDS[sel.grade] ? `集滿${spellShardName(sel.grade)}合成時隨機習得（${SPELL_SHARD_KINDS[sel.grade].from}）` : '取得方式尚未開放'}）</p>`;
        else if (!sel.active) action = `<p class="spell-detail-note">🌟 被動光環，已永久生效</p>`;
        else if (slots.slice(0, slotCount).includes(sel.id)) action = `<p class="spell-detail-note">✅ 已放入技能格</p>`;
        else action = `<button class="sys-btn" onclick="equipSpell('${sel.id}')">放入技能格</button>`;
        detail = `<div class="spell-detail">
            <div class="spell-detail-title" style="color:${SPELL_GRADES[sel.grade].color};">${sel.name}</div>
            <div class="spell-detail-tags">${SPELL_GRADES[sel.grade].name}｜${getSpellTypeLabel(sel)}｜${sel.attrName}屬性｜${SPELL_ROLES[sel.role].icon}${SPELL_ROLES[sel.role].name}${sel.active ? '（主動）' : '（被動）'}</div>
            <div class="spell-detail-desc">${describeSpell(sel)}</div>
            ${action}
        </div>`;
    }

    // 秘典碎片合成
    // 下品／中品／上品各一列（中品、上品沒有碎片時也顯示，讓玩家知道去哪裡打）
    const shardHtml = Object.keys(SPELL_SHARD_KINDS).map(grade => {
        const shards = getSpellShards(grade), left = unlearnedShardSpells(grade).length, gname = SPELL_GRADES[grade].name;
        const shardPct = Math.min(100, shards / SPELL_SHARD_NEED * 100);
        return `<div class="spell-shard-box">
        <div>📜 <span style="color:${SPELL_GRADES[grade].color};">${spellShardName(grade)}</span> <b>${shards}</b> / ${SPELL_SHARD_NEED}<span class="spell-shard-note">（${SPELL_SHARD_KINDS[grade].from}；${gname}仙法尚有 ${left} 招未習得）</span></div>
        <div class="spell-shard-track"><i style="width:${shardPct}%"></i></div>
        <button class="sys-btn" onclick="synthesizeSpell('${grade}')" ${shards >= SPELL_SHARD_NEED && left ? '' : 'disabled'}>🔮 合成${gname}武學（消耗 ${SPELL_SHARD_NEED} 片，隨機習得一招）</button></div>`;
    }).join('');

    box.innerHTML = `
        <div class="spell-summary">已收錄 <b>${learnedCount}</b> / ${spellList.length} 種仙法｜技能格 ${slotCount} 格（Lv${nextLv} 開下一格）</div>
        ${shardHtml}
        <div class="spell-slots">${slotHtml}</div>
        ${filters}
        ${detail}
        <div class="spell-count">顯示 ${shown.length} 種（金色 = 已學會、灰色 = 未學會，點選可看效果）</div>
        <div class="spell-grid">${cards}</div>`;
}

// 放入第一個空格；格子都滿時替換最後一格
function equipSpell(id) {
    let s = getSpell(id);
    if (!s || !s.active || !isSpellLearned(id)) return;
    if (!Array.isArray(player.spellSlots)) player.spellSlots = [];
    let count = getSpellSlotCount();
    let slots = player.spellSlots.slice(0, count);
    if (slots.includes(id)) return;
    let idx = -1;
    for (let i = 0; i < count; i++) {
        let cur = getSpell(slots[i]);
        if (!cur || !isSpellLearned(cur.id)) { idx = i; break; }
    }
    if (idx === -1) idx = count - 1;
    player.spellSlots[idx] = id;
    addLog(`📜 將仙法【${s.name}】放入第 ${idx + 1} 格技能格。`, "skill");
    renderSpellModal();
    updateUI();
}

function unequipSpell(idx) {
    if (!Array.isArray(player.spellSlots)) return;
    player.spellSlots[idx] = null;
    renderSpellModal();
    updateUI();
}
