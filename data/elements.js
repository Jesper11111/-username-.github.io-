// 戰鬥屬性引擎：減傷、閃避、屬性傷害（冰凍 / 燒傷 / 中毒 / 金重擊 / 雷擊）、五行相剋與持續傷害
// 玩家→怪物、怪物→玩家、玩家↔心魔 全部走 resolveHit()，規則完全對稱。數值見 config-elements.js
// attrs.element 是該單位的五行（"金"/"木"/"水"/"火"/"土" 或 null），用於五行相剋

function newStatus() {
    return { frozen: 0, burn: null, poison: null };
}

// 玩家目前的戰鬥屬性：裝備 + 靈根加成（一起套上限）＋本命五行
function getPlayerCombatAttrs() {
    let b = getEquipBonus();
    let r = getRootBonus();
    let a = getSpellAuraBonus();   // 仙法被動光環（spells.js），與裝備、靈根一起套上限
    const cap = (v, max) => Math.max(0, Math.min(max, v));
    let armor = getDuelArmorMult();   // 懸賞對決中被「破甲」：減傷與閃避減半（bounty.js）
    // 裝備特效（gear.js）：護體（低血量）、先手盾（每波前 2 回合）加減傷，一起套上限
    let fx = getGearEffects();
    let gearDef = (fx["護體"] && player.hp < player.maxHp * 0.3 ? fx["護體"] : 0)
                + (fx["先手盾"] && gearWaveRound <= 2 ? fx["先手盾"] : 0);
    let extra = getBonusTotals();   // 套裝可提高上限（cap:屬性，gear.js）
    let capOf = (k, base) => base + (extra["cap:" + k] || 0);
    // 新制（numeric.js）：敏捷提供閃避（一起套上限）、命中（加在洞察上）、暴擊率
    let agiEva = NUMERIC_V2 ? nv2AgiEva() : 0;
    return {
        // 靈寵增益（beast-combat.js 的 petFxVal）：減傷、閃避一起套上限；暴擊、命中、破甲直接加
        def: cap(b.def + r.def + a.def + gearDef + petFxVal('def'), capOf("def", DEF_CAP)) * armor,
        eva: cap(b.eva + a.eva + agiEva + petFxVal('eva'), capOf("eva", EVA_CAP)) * armor,
        crit: (NUMERIC_V2 ? nv2Crit() : 0) + petFxVal('crit') / 100,
        ice: cap(b.ice + r.ice + a.ice, capOf("ice", AFFIX_CAP)),
        fire: cap(b.fire + r.fire + a.fire, capOf("fire", AFFIX_CAP)),
        poison: cap(b.poison + r.poison + a.poison, capOf("poison", AFFIX_CAP)),
        metal: cap(b.metal + r.metal + a.metal, capOf("metal", AFFIX_CAP)),
        thunder: cap(b.thunder + r.thunder + a.thunder, capOf("thunder", AFFIX_CAP)),
        // 變異屬性（config-elements.js）：目前來自先天資質（getBonusTotals 的 wind／light／dark），同樣套 AFFIX_CAP
        wind: cap(extra.wind || 0, capOf("wind", AFFIX_CAP)),
        light: cap(extra.light || 0, capOf("light", AFFIX_CAP)),
        dark: cap(extra.dark || 0, capOf("dark", AFFIX_CAP)),
        nature: getAptitudeSpecial().nature,   // 光／暗本質（光暗互剋），沒有則為 null
        element: getPlayerElement(),
        // 以下由靈根提供（怪物沒有這些欄位，會取 resolveHit 內的預設值）
        freezeResist: 1 - (1 - (r.freezeResist || 0)) * (1 - (fx["定神"] || 0)),   // 靈根與「定神」特效相乘疊加
        burnMax: r.burnMax,
        poisonMax: r.poisonMax,
        ignoreCounter: r.ignoreCounter,
        // 藏書閣屬性秘典的傷害加成（library.js），怪物沒有此欄位
        book: getElementBookBonus(),
        // 裝備特效（gear.js），怪物沒有這些欄位（視為 0）
        armorPen: (fx["破甲"] || 0) + petFxVal('armorPen'),
        evaPen: (fx["洞察"] || 0) + (NUMERIC_V2 ? nv2Hit() : 0) + petFxVal('hit'),
        counterBonus: fx["剋敵"] || 0,
        frozenBonus: fx["寒徹"] || 0,
        burnBonus: fx["焚燼"] || 0,
        poisonBonus: fx["蝕骨"] || 0,
        poisonImmune: getAptitudeSpecial().poisonImmune   // 萬毒不侵體（aptitude.js），怪物沒有此欄位
    };
}

// 五行相剋倍率：回傳 { mult, tag }，tag 為 "counter"（剋制）/"countered"（被剋）/null
function getWuxingCounterMult(atkElem, defElem) {
    if (!atkElem || !defElem) return { mult: 1, tag: null };
    if (WUXING_COUNTERS[atkElem] === defElem) return { mult: 1 + WUXING_COUNTER_BONUS, tag: "counter" };
    if (WUXING_COUNTERS[defElem] === atkElem) return { mult: 1 - WUXING_COUNTERED_PENALTY, tag: "countered" };
    return { mult: 1, tag: null };
}

// 技能自帶的屬性效果（skill.effect = { type, chance }）會與裝備取較高者
function withSkillEffect(attrs, skill) {
    if (!skill || !skill.effect) return attrs;
    let copy = Object.assign({}, attrs);
    copy[skill.effect.type] = Math.max(copy[skill.effect.type] || 0, skill.effect.chance * 100);
    return copy;
}

// 依地圖分類產生怪物的戰鬥屬性
function getMapCategoryIndex(mapName) {
    return maps.findIndex(cat => cat.items.some(m => m.name === mapName));
}

function rollMonsterAttrs() {
    let profile = monsterAttrsByMapCategory[getMapCategoryIndex(player.currentMap.name)] || monsterAttrsByMapCategory[1];
    let attrs = { def: profile.def, eva: profile.eva, ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0,
                  element: wuxingElements[Math.floor(Math.random() * wuxingElements.length)] };
    if (Math.random() < profile.affixProb) {
        attrs[MONSTER_AFFIX_TYPES[Math.floor(Math.random() * MONSTER_AFFIX_TYPES.length)]] = profile.affixChance;
    }
    if (DARK_MAP_CATEGORIES.includes(getMapCategoryIndex(player.currentMap.name))) attrs.nature = "dark";   // 幽冥禁域妖獸本質為暗（光暗互剋）
    return attrs;
}

// 單次命中結算（依序）：閃避 → 金重擊 → 雷擊 → 五行相剋 → 減傷（雷擊時略過）→ 附加冰/火/毒狀態
//   attacker = { attrs, power }  power 為計算燒傷/中毒的攻擊力基準
//   defender = { attrs, status }
// 回傳 { dmg, tags }，tags 為本次觸發的效果（供日誌彙整），呼叫端自行扣 hp
function resolveHit(rawDmg, attacker, defender) {
    let tags = [];
    let eva = (defender.attrs.eva || 0) - (attacker.attrs.evaPen || 0);   // 洞察：無視部分閃避
    if (eva > 0 && Math.random() < eva / 100) {
        return { dmg: 0, tags: ["dodge"] };
    }

    let dmg = rawDmg;
    // 藏書閣屬性秘典：本命五行的直接傷害、對凍結中目標的傷害（其餘在各效果觸發時套用）
    let book = attacker.attrs.book;
    if (book) {
        if (attacker.attrs.element) dmg *= 1 + (book.wuxing[attacker.attrs.element] || 0);
        if (defender.status && defender.status.frozen > 0) dmg *= 1 + book.ice;
    }
    // 寒徹：對凍結中的目標傷害提高（裝備特效）
    if (attacker.attrs.frozenBonus && defender.status && defender.status.frozen > 0) dmg *= 1 + attacker.attrs.frozenBonus;
    if (attacker.attrs.metal > 0 && Math.random() < attacker.attrs.metal / 100) {
        dmg *= (1 + METAL_BONUS) * (1 + (book ? book.metal : 0));
        tags.push("metal");
    }
    let thunder = attacker.attrs.thunder > 0 && Math.random() < attacker.attrs.thunder / 100;
    if (thunder) {
        dmg *= (1 + THUNDER_BONUS) * (1 + (book ? book.thunder : 0));
        tags.push("thunder");
    }
    // 五行聖靈根：任一方持有即不受相剋影響（雙向都不生效）
    let wx = (attacker.attrs.ignoreCounter || defender.attrs.ignoreCounter)
        ? { mult: 1, tag: null }
        : getWuxingCounterMult(attacker.attrs.element, defender.attrs.element);
    if (wx.tag) {
        dmg *= wx.mult;
        if (wx.tag === "counter") dmg *= 1 + (attacker.attrs.counterBonus || 0);   // 剋敵（裝備特效）
        tags.push(wx.tag);
    }
    // 光暗互剋：雙方都有光／暗本質且不同（config-elements.js）
    if (attacker.attrs.nature && defender.attrs.nature && attacker.attrs.nature !== defender.attrs.nature) {
        dmg *= 1 + LIGHT_DARK_COUNTER_BONUS;
        tags.push("lightdark");
    }
    // 變異屬性：聖光（增傷，回血由呼叫端依 tag 處理）、暗蝕（無視減傷，吸血由呼叫端處理）
    if (attacker.attrs.light > 0 && Math.random() < attacker.attrs.light / 100) {
        dmg *= 1 + LIGHT_BONUS;
        tags.push("light");
    }
    let darkHit = attacker.attrs.dark > 0 && Math.random() < attacker.attrs.dark / 100;
    if (darkHit) tags.push("dark");
    // 新制：敏捷暴擊（attrs.crit 為機率 0～0.3，只有新制的玩家有此欄位）
    if (attacker.attrs.crit > 0 && Math.random() < attacker.attrs.crit) {
        dmg *= NV2.critDmg;
        tags.push("crit");
    }
    if (!thunder && !darkHit) dmg *= 1 - Math.max(0, (defender.attrs.def || 0) - (attacker.attrs.armorPen || 0)) / 100;   // 雷擊、暗蝕無視減傷   // 破甲：無視部分減傷

    let st = defender.status;
    // 冰靈根等提供的 freezeResist 會折減「被凍結」的機率
    let iceChance = attacker.attrs.ice / 100 * (1 - (defender.attrs.freezeResist || 0));
    if (attacker.attrs.ice > 0 && Math.random() < iceChance) {
        st.frozen = Math.max(st.frozen, FREEZE_TURNS);
        tags.push("ice");
    }
    if (attacker.attrs.fire > 0 && Math.random() < attacker.attrs.fire / 100) {
        st.burn = addDotStack(st.burn, attacker.attrs.burnMax || BURN_MAX_STACKS, BURN_TURNS,
            attacker.power * BURN_RATE * (1 + (book ? book.fire : 0)) * (1 + (attacker.attrs.burnBonus || 0)));
        tags.push("fire");
    }
    if (attacker.attrs.poison > 0 && !defender.attrs.poisonImmune && Math.random() < attacker.attrs.poison / 100) {
        st.poison = addDotStack(st.poison, attacker.attrs.poisonMax || POISON_MAX_STACKS, POISON_TURNS,
            attacker.power * POISON_RATE * (1 + (book ? book.poison : 0)) * (1 + (attacker.attrs.poisonBonus || 0)));
        tags.push("poison");
    }
    return { dmg: roundDmg(dmg), tags };
}

// 傷害取整：舊制無條件捨去；新制數字很小（凡人氣血約 50、妖獸攻擊不到 1），保留 1 位小數，否則減傷會把傷害捨成 0
function roundDmg(v) {
    return NUMERIC_V2 ? Math.round(v * 10) / 10 : Math.floor(v);
}

// 疊一層持續傷害：層數 +1（有上限）、回合數刷新、每層傷害取較高者
function addDotStack(dot, maxStacks, turns, perStack) {
    if (!dot) return { stacks: 1, turns: turns, perStack: perStack };
    return { stacks: Math.min(maxStacks, dot.stacks + 1), turns: turns, perStack: Math.max(dot.perStack, perStack) };
}

// 行動前結算自身狀態：扣持續傷害、判斷是否被凍結（凍結會消耗 1 回合）
// 回傳 { dot, frozen, burn, poison }，呼叫端自行扣 hp（burn／poison 為各自的量，戰鬥畫面飄字依此上色）
function tickStatus(st) {
    let dot = 0;
    const part = { burn: 0, poison: 0 };
    ["burn", "poison"].forEach(k => {
        if (!st[k]) return;
        part[k] = st[k].stacks * st[k].perStack;
        dot += part[k];
        st[k].turns--;
        if (st[k].turns <= 0) st[k] = null;
    });
    let frozen = st.frozen > 0;
    if (frozen) st.frozen--;
    return { dot: roundDmg(dot), frozen, burn: part.burn, poison: part.poison };
}

// 狀態圖示文字（戰鬥實況面板用），例：「❄️ 🔥×2 ☠️×3」
function formatStatus(st) {
    if (!st) return "";
    let parts = [];
    if (st.frozen > 0) parts.push("❄️凍結");
    if (st.burn) parts.push(`🔥×${st.burn.stacks}`);
    if (st.poison) parts.push(`☠️×${st.poison.stacks}`);
    return parts.join(" ");
}

// 把一回合內的觸發標籤彙整成一小段日誌文字，例：「❄️凍結×1 🔥燒傷×2 💨被閃避×1 ☯️五行剋制×3」
function summarizeTags(tags, dodgeLabel) {
    let names = { ice: "❄️凍結", fire: "🔥燒傷", poison: "☠️中毒", metal: "⚔️重擊", thunder: "⚡雷擊",
                  counter: "☯️五行剋制", countered: "☯️五行被剋", dodge: dodgeLabel,
                  // 裝備特效（gear.js）
                  chase: "✦追擊", cleave: "✦橫掃", haste: "✦疾風", poisonBurst: "✦毒爆", reflect: "✦反震", counterHit: "✦閃擊反擊",
                  // 套裝特殊效果
                  rage: "❖套裝之怒", echo: "❖技能連發",
                  // 新制敏捷（numeric.js）
                  crit: "💥暴擊", combo: "⚡連擊",
                  // 變異屬性與光暗互剋（config-elements.js）
                  wind: "🌪️風擊", light: "☀️聖光", dark: "🌑暗蝕", lightdark: "☯️光暗相剋" };
    let counts = {};
    tags.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    return Object.keys(counts).map(t => `${names[t]}${counts[t] > 1 ? '×' + counts[t] : ''}`).join(" ");
}

// 裝備屬性文字（背包、裝備欄、千寶閣、靈寶閣共用），只列出非 0 的項目
function formatEquipStats(stats) {
    let base = [["str", "力量"], ["con", "體質"], ["int", "悟性"], ["spr", "靈力"], ["cha", "魅力"]]
        .filter(([k]) => stats[k]).map(([k, label]) => `${label}+${stats[k].toWan()}`);
    let attrs = ["def", "eva"].concat(AFFIX_TYPES)
        .filter(k => stats[k]).map(k => `${combatAttrInfo[k].icon}${combatAttrInfo[k].label}+${stats[k]}%`);
    return base.concat(attrs).join("、") || "無";
}
