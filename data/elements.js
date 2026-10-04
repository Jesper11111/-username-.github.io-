// 戰鬥屬性引擎：減傷、閃避、屬性傷害（冰凍 / 燒傷 / 中毒 / 金重擊 / 雷擊）、五行相剋與持續傷害
// 玩家→怪物、怪物→玩家、玩家↔心魔 全部走 resolveHit()，規則完全對稱。數值見 config-elements.js
// attrs.element 是該單位的五行（"金"/"木"/"水"/"火"/"土" 或 null），用於五行相剋

function newStatus() {
    return { frozen: 0, burn: null, poison: null };
}

// ---- 防禦（《天堂2》式，config-elements.js 的 DEF_K；ARCHITECTURE.md 第 66 節）----
// 防禦點數 → 受到傷害的倍率（0 防禦 = 1，DEF_K 防禦 = 0.5）
function defMult(points) { return DEF_K / (DEF_K + Math.max(0, points || 0)); }
// 敵人的減傷 % ↔ 等效防禦點數（顯示用；敵人的實際計算仍用 %，效果與改版前相同）
function pctToDefPoints(pct) { const p = Math.min(95, Math.max(0, pct || 0)); return DEF_K * p / (100 - p); }
// 顯示：玩家「防禦 60（減傷 33%）」
function formatDefPoints(points) { return `${+(points || 0).toFixed(1)}（減傷 ${+((1 - defMult(points)) * 100).toFixed(1)}%）`; }
// 顯示：玩家「閃避 25（對命中 0 的敵人迴避 20%）」
function formatEvaPoints(points) { return `${+(points || 0).toFixed(1)}（迴避 ${+(evaDodge(points) * 100).toFixed(1)}%）`; }
// 顯示：敵人「防禦 44（減傷 27%）」
function formatEnemyDef(pct) { return `${Math.round(pctToDefPoints(pct))}（減傷 ${+(pct || 0).toFixed(1)}%）`; }

// 玩家目前的戰鬥屬性：裝備 + 靈根加成（一起套上限）＋本命五行
function getPlayerCombatAttrs() {
    let b = getEquipBonus();
    let r = getRootBonus();
    let a = getSpellAuraBonus();   // 仙法被動光環（spells.js），與裝備、靈根一起套上限
    const cap = (v, max) => Math.max(0, Math.min(max, v));
    let armor = getDuelArmorMult();   // 懸賞對決中被「破甲」：防禦與閃避減半（bounty.js）
    // 裝備特效（gear.js）：護體（低血量）、先手盾（每波前 2 回合）加防禦
    let fx = getGearEffects();
    let gearDef = (fx["護體"] && player.hp < player.maxHp * 0.3 ? fx["護體"] : 0)
                + (fx["先手盾"] && gearWaveRound <= 2 ? fx["先手盾"] : 0);
    let extra = getBonusTotals();   // 套裝可提高上限（cap:屬性，gear.js）
    let capOf = (k, base) => base + (extra["cap:" + k] || 0);
    // 新制（numeric.js）：敏捷提供閃避（一起套上限）、命中（加在洞察上）、暴擊率
    let agiEva = NUMERIC_V2 ? nv2AgiEva() : 0;
    // 閃避裡屬於靈寵、夥伴的部分（敵人打玩家時各自另有上限，resolveHit）；夥伴被動已含在 b（getEquipBonus → getBonusTotals）
    let pb = typeof getPartnerBonusTotals === 'function' ? getPartnerBonusTotals() : {};
    return {
        // 防禦點數（第 66 節）：裝備、靈根、仙法、特效、靈寵增益、夥伴被動全部相加，沒有上限（套裝的 cap:def 已無作用）
        // 靈寵增益（beast-combat.js 的 petFxVal）：閃避一起套上限；暴擊、命中、破甲直接加
        def: Math.max(0, b.def + r.def + a.def + gearDef + petFxVal('def')) * armor * (typeof talentMult === 'function' ? talentMult('def') : 1),   // 天賦核心（金剛、無相…）的獨立倍率
        // 魔防（第 66 節第 4 期 A）：防禦 × 0.6 ＋ 靈力 × 0.1 ＋ 飾品詞條（config-elements.js）
        mdef: Math.max(0, (b.def + r.def + a.def + gearDef + petFxVal('def')) * MDEF_FROM_DEF + (NUMERIC_V2 ? nv2Stat('spr') : 0) * MDEF_PER_SPR + (extra.mdef || 0)) * armor,
        eva: Math.max(0, b.eva + a.eva + agiEva + petFxVal('eva')) * armor * (typeof talentMult === 'function' ? talentMult('eva') : 1),   // 迴避值（第 66 節第 4 期）：沒有上限，夥伴被動已含在 b
        crit: (NUMERIC_V2 ? nv2Crit() : 0) + petFxVal('crit') / 100 + (extra.crit || 0),            // 天賦 crit／magCrit（第 68 節）
        magCrit: (NUMERIC_V2 ? nv2MagCrit() : 0) + petFxVal('crit') / 100 + (extra.magCrit || 0),
        critDmg: (NUMERIC_V2 ? NV2.critDmg : 2) + (extra.critDmg || 0),                             // 暴擊傷害倍率（天賦「劍意」）   // 魔法暴擊（悟性，第 66 節第 4 期 A）：術法技能用
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
        evaPen: (fx["洞察"] || 0) + (NUMERIC_V2 ? nv2Hit() : 0) + petFxVal('hit') + (extra.hit || 0),   // 天賦「鷹眼」命中
        counterBonus: fx["剋敵"] || 0,
        frozenBonus: fx["寒徹"] || 0,
        burnBonus: fx["焚燼"] || 0,
        poisonBonus: fx["蝕骨"] || 0,
        poisonImmune: getAptitudeSpecial().poisonImmune,  // 萬毒不侵體（aptitude.js），怪物沒有此欄位
        raceDmg: typeof getRaceDmgBonus === 'function' ? getRaceDmgBonus() : null,   // 種族剋制（race.js）：{ beast, ghost, demon, heart }，對方 attrs.race 對上時增傷
        yuanshen: typeof getYuanshenDmg === 'function' ? getYuanshenDmg() : null,   // 元神偏好屬性傷害（yuanshen.js）：{ elem, affix, pct }，獨立倍率
        isPlayer: true   // resolveHit：敵人打玩家時閃避、減傷實際最多 PLAYER_EFFECTIVE_*_MAX（心魔鏡像也帶，雙方對稱）
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

// L（選填，新制）：妖獸的成長位置 → 帶同階一般玩家的命中 evaPen（numeric.js 的 nv2TypHit），抵銷玩家閃避
function rollMonsterAttrs(L) {
    let profile = monsterAttrsByMapCategory[getMapCategoryIndex(player.currentMap.name)] || monsterAttrsByMapCategory[1];
    let attrs = { def: profile.def, eva: profile.eva, ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0,
                  element: wuxingElements[Math.floor(Math.random() * wuxingElements.length)] };
    if (NUMERIC_V2 && typeof L === 'number') attrs.evaPen = nv2TypHit(L);
    if (Math.random() < profile.affixProb) {
        attrs[MONSTER_AFFIX_TYPES[Math.floor(Math.random() * MONSTER_AFFIX_TYPES.length)]] = profile.affixChance;
    }
    if (player.currentMap.dark !== false && DARK_MAP_CATEGORIES.includes(getMapCategoryIndex(player.currentMap.name))) attrs.nature = "dark";   // 幽冥禁域妖獸本質為暗（光暗互剋）；地圖 dark: false 不套用（2026-10-04 移入第四區的三張圖）
    return attrs;
}

// ---- BOSS 光環（2026-09-29 使用者要求「BOSS 自帶多個光環，有負面效果也有增益效果；對玩家詛咒、冰凍、持續扣血、燒傷、中毒」）----
// 鎮魔塔 zhenmo.js、死守天南城首領波 defense.js。BOSS 的 auras 是陣列，每個光環 = { name, player: {...}, self: {...} }，多個光環同種效果相加：
//   player（壓制玩家）：atk −攻擊比例、def −減傷點、eva −閃避點、curse 詛咒＝受到傷害 +比例、dot 每回合扣最大氣血比例、
//                       freeze／burn／poison 每回合各以該機率使玩家凍結 1 回合／疊 1 層燒傷／疊 1 層中毒（每層傷害以 BOSS 攻擊計）
//   self（強化自身）：atk +攻擊比例、def +減傷點、eva +閃避點、regen 每回合回最大氣血比例
const AURA_PLAYER_KEYS = ['atk', 'def', 'eva', 'curse', 'dot', 'freeze', 'burn', 'poison'];
const AURA_SELF_KEYS = ['atk', 'def', 'eva', 'regen'];
// 把多個光環合併成一個 { player, self }（沒有光環回傳 null）
function combineAuras(auras) {
    const list = (Array.isArray(auras) ? auras : [auras]).filter(Boolean);
    if (!list.length) return null;
    const sum = (part, keys) => { const o = {}; keys.forEach(k => { o[k] = list.reduce((s, a) => s + ((a[part] && a[part][k]) || 0), 0); }); return o; };
    return { player: sum('player', AURA_PLAYER_KEYS), self: sum('self', AURA_SELF_KEYS), count: list.length };
}
function auraPlayerAtkMult(ag) { return ag ? Math.max(0.1, 1 - ag.player.atk) : 1; }
function auraSelfAtkMult(ag) { return ag ? 1 + ag.self.atk : 1; }
function auraCurseMult(ag) { return ag ? 1 + ag.player.curse : 1; }   // 敵人打玩家的傷害倍率
// 回傳套上光環後的屬性（新物件，不改原本的）
function auraPlayerAttrs(attrs, ag) {
    if (!ag) return attrs;
    return Object.assign({}, attrs, { def: Math.max(0, (attrs.def || 0) - ag.player.def), mdef: Math.max(0, (attrs.mdef || 0) - ag.player.def), eva: Math.max(0, (attrs.eva || 0) - ag.player.eva) });   // 破甲光環也削魔防（第 66 節第 4 期 A）
}
function auraSelfAttrs(attrs, ag) {
    if (!ag) return attrs;
    return Object.assign({}, attrs, { def: (attrs.def || 0) + ag.self.def, eva: (attrs.eva || 0) + ag.self.eva });
}
// 每回合開始時的光環效果：對玩家狀態 pSt 擲凍結／燒傷／中毒，回傳 { dot：這回合光環直接扣的氣血, regen：BOSS 回的氣血, tags }
//   pMax＝玩家最大氣血、eMax＝BOSS 最大氣血、bossAtk＝BOSS 攻擊（燒傷／中毒每層傷害的基準）；freezeResist 同 resolveHit
function auraRoundTick(ag, pSt, pMax, eMax, bossAtk, pAttrs) {
    const out = { dot: 0, regen: 0, tags: [] };
    if (!ag) return out;
    if (ag.player.dot) out.dot = roundDmg(pMax * ag.player.dot);
    if (ag.self.regen) out.regen = eMax * ag.self.regen;
    if (ag.player.freeze && Math.random() < ag.player.freeze * (1 - ((pAttrs && pAttrs.freezeResist) || 0))) { pSt.frozen = Math.max(pSt.frozen, FREEZE_TURNS); out.tags.push('ice'); }
    if (ag.player.burn && Math.random() < ag.player.burn) { pSt.burn = addDotStack(pSt.burn, BURN_MAX_STACKS, BURN_TURNS, bossAtk * BURN_RATE); out.tags.push('fire'); }
    if (ag.player.poison && !(pAttrs && pAttrs.poisonImmune) && Math.random() < ag.player.poison) { pSt.poison = addDotStack(pSt.poison, POISON_MAX_STACKS, POISON_TURNS, bossAtk * POISON_RATE); out.tags.push('poison'); }
    return out;
}
function describeAura(aura) {
    if (!aura) return '';
    const p = aura.player || {}, s = aura.self || {}, pc = v => +(v * 100).toFixed(1);
    const neg = [p.atk && `你的攻擊 −${pc(p.atk)}%`, p.def && `你的防禦 −${p.def}`, p.eva && `你的閃避 −${p.eva}`, p.curse && `詛咒：你受到的傷害 +${pc(p.curse)}%`,
                 p.dot && `每回合扣你 ${pc(p.dot)}% 氣血`, p.freeze && `每回合 ${pc(p.freeze)}% 凍結你`, p.burn && `每回合 ${pc(p.burn)}% 使你燒傷`, p.poison && `每回合 ${pc(p.poison)}% 使你中毒`].filter(Boolean);
    const pos = [s.atk && `攻擊 +${pc(s.atk)}%`, s.def && `減傷 +${s.def}%`, s.eva && `閃避 +${s.eva}`, s.regen && `每回合回 ${pc(s.regen)}% 氣血`].filter(Boolean);
    return `【${aura.name}】${neg.length ? neg.join('、') : ''}${neg.length && pos.length ? '；' : ''}${pos.length ? '自身' + pos.join('、') : ''}`;
}
function describeAuras(auras) { return (Array.isArray(auras) ? auras : [auras]).filter(Boolean).map(describeAura).join('<br>'); }

// 單次命中結算（依序）：閃避 → 金重擊 → 雷擊 → 五行相剋 → 暴擊 → 防禦（雷擊、暗蝕時略過）→ 附加冰/火/毒狀態
//   attacker = { attrs, power }  power 為計算燒傷/中毒的攻擊力基準
//   defender = { attrs, status }
//   attacker.dmgType：'mag'＝術法（走魔防／魔抗、魔法暴擊），其餘＝物理（第 66 節第 4 期 A）
// 回傳 { dmg, tags, preDef, postDef }，tags 為本次觸發的效果（供日誌彙整），呼叫端自行扣 hp
function resolveHit(rawDmg, attacker, defender) {
    let tags = [];
    // 閃避：迴避值 − 命中值（洞察、敏捷），被閃掉的機率 evaDodge＝D ÷ (D + 100)（numeric.js；第 66 節第 4 期，玩家與敵人相同）
    const eva = (defender.attrs.eva || 0) - (attacker.attrs.evaPen || 0);
    if (eva > 0 && Math.random() < evaDodge(eva)) {
        return { dmg: 0, tags: ["dodge"] };
    }

    let dmg = rawDmg * nv2DmgRoll();   // 新制傷害浮動 ±10%（config-numeric.js 的 dmgVariance），平均不變
    // 種族剋制（race.js）：攻擊方對防守方種族的傷害加成（已套上限 RACE_DMG_CAP）
    if (attacker.attrs.raceDmg && defender.attrs.race) dmg *= 1 + (attacker.attrs.raceDmg[defender.attrs.race] || 0);
    // 元神偏好屬性（yuanshen.js）：五行元神鎖定本命五行，帶該五行的傷害 ×(1+pct)；雷元神在雷擊觸發時另乘（下方）
    //   風元神：combat.js 的風擊追加那一擊帶 attrs.ysWind；有加成的擊中都加 tag "yuanshen"（battle-fx.js 飄字顯示「💧+30%」）
    const ys = attacker.attrs.yuanshen;
    if (ys && ((ys.elem && attacker.attrs.element === ys.elem) || (ys.affix === 'wind' && attacker.attrs.ysWind))) { dmg *= 1 + ys.pct; tags.push("yuanshen"); }
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
        if (ys && ys.affix === 'thunder') { dmg *= 1 + ys.pct; tags.push("yuanshen"); }   // 雷元神
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
    // 新制：暴擊（attrs.crit 為機率 0～0.3）；術法攻擊用魔法暴擊 magCrit（悟性，第 66 節第 4 期 A；敵人沒有 magCrit 就用 crit）
    const mag = attacker.dmgType === 'mag';
    const critRate = mag && typeof attacker.attrs.magCrit === 'number' ? attacker.attrs.magCrit : attacker.attrs.crit;
    if (critRate > 0 && Math.random() < critRate) {
        dmg *= attacker.attrs.critDmg || NV2.critDmg;   // 玩家的暴擊倍率可被天賦提高（第 68 節）
        tags.push("crit");
    }
    const preDef = dmg;   // 防禦前的傷害
    if (!thunder && !darkHit) {   // 雷擊、暗蝕無視防禦；破甲：無視部分防禦
        const pen = attacker.attrs.armorPen || 0;
        const da = defender.attrs;
        if (da.isPlayer) dmg *= defMult((mag ? (da.mdef || 0) : (da.def || 0)) - pen);   // 玩家：防禦／魔防點數，《天堂2》式（第 66 節）
        else dmg *= 1 - Math.max(0, (mag && typeof da.mres === 'number' ? da.mres : (da.def || 0)) - pen) / 100;   // 敵人：減傷 %／魔抗 %（沒填魔抗＝同減傷）
    }
    const postDef = dmg;   // 防禦後的傷害：敵人打玩家時，護盾類的最後保底以它為準（beast-combat.js 的 applyPetDamageReduction）

    let st = defender.status;
    // 冰靈根等提供的 freezeResist 會折減「被凍結」的機率
    let iceChance = attacker.attrs.ice / 100 * (1 - (defender.attrs.freezeResist || 0));
    if (attacker.attrs.ice > 0 && Math.random() < iceChance) {
        st.frozen = Math.max(st.frozen, FREEZE_TURNS);
        tags.push("ice");
    }
    if (attacker.attrs.fire > 0 && Math.random() < attacker.attrs.fire / 100) {
        st.burn = addDotStack(st.burn, attacker.attrs.burnMax || BURN_MAX_STACKS, BURN_TURNS,
            attacker.power * BURN_RATE * (1 + (book ? book.fire : 0)) * (1 + (attacker.attrs.burnBonus || 0)) * (ys && ys.elem === '火' ? 1 + ys.pct : 1));   // 火元神：燒傷也加成
        tags.push("fire");
    }
    if (attacker.attrs.poison > 0 && !defender.attrs.poisonImmune && Math.random() < attacker.attrs.poison / 100) {
        st.poison = addDotStack(st.poison, attacker.attrs.poisonMax || POISON_MAX_STACKS, POISON_TURNS,
            attacker.power * POISON_RATE * (1 + (book ? book.poison : 0)) * (1 + (attacker.attrs.poisonBonus || 0)));
        tags.push("poison");
    }
    return { dmg: roundDmg(dmg), tags, preDef, postDef };
}

// 傷害浮動倍率：新制回傳 1 ± NV2.dmgVariance 之間的隨機值（平均 1）；舊制固定 1
function nv2DmgRoll() {
    return NUMERIC_V2 && NV2.dmgVariance ? 1 + (Math.random() * 2 - 1) * NV2.dmgVariance : 1;
}
// 傷害取整：舊制無條件捨去；新制數字很小（凡人氣血約 50、妖獸攻擊不到 1），保留 2 位小數（畫面 ×100 後剛好是整數，format.js 的 fmtCombat）
function roundDmg(v) {
    return NUMERIC_V2 ? Math.round(v * 100) / 100 : Math.floor(v);
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
    // 怪物技能（monster.js，第 66 節第 3 期）：標籤 msk_重擊等
    if (typeof MONSTER_SKILLS !== 'undefined') Object.keys(MONSTER_SKILLS).forEach(k => { names['msk_' + k] = MONSTER_SKILLS[k].icon + MONSTER_SKILLS[k].name; });
    let counts = {};
    tags.forEach(t => { if (names[t] !== undefined) counts[t] = (counts[t] || 0) + 1; });   // 沒有名稱的標籤（例：元神 yuanshen，只給飄字用）不寫進日誌
    return Object.keys(counts).map(t => `${names[t]}${counts[t] > 1 ? '×' + counts[t] : ''}`).join(" ");
}

// 裝備屬性文字（背包、裝備欄、千寶閣、靈寶閣共用），只列出非 0 的項目
function formatEquipStats(stats) {
    let base = [["str", "力量"], ["con", "體質"], ["int", "悟性"], ["spr", "靈力"], ["cha", "魅力"]]
        .filter(([k]) => stats[k]).map(([k, label]) => `${label}+${stats[k].toWan()}`);
    let attrs = ["def", "eva"].concat(AFFIX_TYPES)
        .filter(k => stats[k]).map(k => `${combatAttrInfo[k].icon}${combatAttrInfo[k].label}+${stats[k]}${POINT_STAT_KEYS.includes(k) ? '' : '%'}`);   // 防禦是點數（第 66 節）
    return base.concat(attrs).join("、") || "無";
}
