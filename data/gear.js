// 裝備圖鑑（ARCHITECTURE.md 第 37 節）：850 種有名字的裝備
// 資料：config-gear-catalog.js（清單）、config-gear.js（管道、模板、特效、白金）
// 裝備物件的 name 仍是「部位」（equipItem 等處靠它判斷穿到哪一格），實際名稱由 gearId 查 gearById

// 載入時展開清單（必須排在 config-gear-catalog.js、config-equipment.js 之後）
const gearList = [];
const gearById = {};
const gearBySlot = {};
(function buildGearList() {
    for (let slot in gearCatalog) {
        gearBySlot[slot] = gearCatalog[slot].map((row, i) => {
            let def = {
                id: `${slot}-${String(i + 1).padStart(2, '0')}`,
                slot: slot, category: equipTypes[slot],
                name: row[0], element: row[1], channel: row[2], template: row[3], effect: row[4], set: row[5] || ''
            };
            gearList.push(def);
            gearById[def.id] = def;
            return def;
        });
    }
})();

function getGearDef(eq) {
    return eq && eq.gearId ? gearById[eq.gearId] || null : null;
}

// 品級物件（含第六品級白金）
function getQualityObj(name) {
    return name === PLATINUM_QUALITY.name ? PLATINUM_QUALITY : equipQualities.find(q => q.name === name) || null;
}

// 鍛造等級對應的可製作管道（10～100 凡俗、200～500 修真、700～1000 至高）
function getCraftChannel(level) {
    let keys = ['craft1', 'craft2', 'craft3'];
    return keys.find(k => level >= GEAR_CHANNELS[k].minLevel && level <= GEAR_CHANNELS[k].maxLevel)
        || (level > GEAR_CHANNELS.craft3.maxLevel ? 'craft3' : level > GEAR_CHANNELS.craft1.maxLevel ? 'craft2' : 'craft1');
}

// 從某部位、某管道的清單隨機抽一種
function pickGearDef(slot, channel) {
    let pool = (gearBySlot[slot] || []).filter(d => d.channel === channel);
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// 依圖鑑產生裝備屬性：四維依模板分配、主詞條依部位與五行（鍛造閣、千寶閣共用）
//   base = 四維基數（鍛造：裝備等級 × 5 × 品級倍率；千寶閣：依境界）
function buildGearStats(def, qualityObj, base) {
    let stats = { str: 0, con: 0, int: 0, spr: 0, cha: 0 };
    let budget = base * (GEAR_CHANNELS[def.channel].external ? GEAR_EXTERNAL_MULT : 1)
                      * (def.category === 'accessory' ? GEAR_ACCESSORY_BUDGET : 1);
    let tpl = GEAR_TEMPLATES[def.template] || GEAR_TEMPLATES["均衡"];
    for (let k in tpl) stats[k] = Math.floor(budget * tpl[k]);
    if (def.category === 'weapon') stats[GEAR_ELEMENT_AFFIX[def.element]] = qualityObj.affix;
    else if (def.category === 'armor') stats.def = qualityObj.def * (def.slot === '盔甲' ? GEAR_ARMOR_DEF_MULT : 1);
    else stats.eva = qualityObj.eva;
    return stats;
}

// 產生一件圖鑑裝備（尚未放進背包）；level 為 null 時不帶裝備等級（2026-09-27 前的千寶閣商品）
// noRecord：不記入天磯錄（千寶閣上架時；買下才記，見 auction.js）
function createGearEquip(def, qualityObj, base, level, noRecord) {
    let eq = {
        // 連續開爐會在同一毫秒產生多件，隨機段需夠長以免 id 重複
        id: Date.now() + "_" + Math.random().toString(36).slice(2, 10),
        name: def.slot,
        category: def.category,
        quality: qualityObj.name,
        element: def.element,
        gearId: def.id,
        stats: buildGearStats(def, qualityObj, base),
        subs: rollGearSubs(qualityObj.name, !!GEAR_CHANNELS[def.channel].external, GEAR_SUB_COUNT[qualityObj.name] || 0, null, def.category, level),
        enhance: 0
    };
    if (level) eq.level = level;   // 裝備等級：穿戴需人物等級 ≥ level
    rollGearAncient(eq, def);      // 橙裝機率成為遠古／太古（第 67 節 D3）
    if (eq.ancient && !noRecord) addLog(`${eq.ancient === 2 ? '🔴 太古神兵現世' : '🟡 遠古遺寶出土'}！獲得【${getEquipDisplayName(eq)}】！`, "reincarnate");
    maybeAddRaceGearFx(eq);        // 紫／橙裝機率帶種族特效（race.js，第 62 節第 5 期）
    if (!noRecord) recordGearCollected(eq);   // 天磯錄收藏紀錄（codex.js）
    return ensureSockets(eq);      // 橙裝隨機 1~3 孔（talisman.js）
}

// ---- 遠古／太古（config-enhance.js 的 GEAR_ANCIENT，第 67 節 D3）----
function rollGearAncient(eq, def) {
    if (eq.quality !== GEAR_ANCIENT_QUALITY) return;
    const r = Math.random();
    const a = r < GEAR_ANCIENT[2].chance ? 2 : r < GEAR_ANCIENT[2].chance + GEAR_ANCIENT[1].chance ? 1 : 0;
    if (!a) return;
    const A = GEAR_ANCIENT[a];
    eq.ancient = a;
    BASE_STAT_KEYS.forEach(k => { if (eq.stats[k]) eq.stats[k] = Math.floor(eq.stats[k] * A.statMult); });
    eq.subs = rollGearSubs(eq.quality, !!GEAR_CHANNELS[def.channel].external, (GEAR_SUB_COUNT[eq.quality] || 0) + A.extraSubs, null, def.category, eq.level, gearRollOpts(eq));
}
// 先天（白金）・太古裝備，部位隨機（仙府信箱 rewards.gear，2026-10-09 世界 Boss 名次獎勵）：
//   同等級圖紙鍛造的橙裝 → 強制太古（同 rollGearAncient）→ 進化白金（同 enhance.js 的 evolveEquip，但不扣材料、強化維持 +0）。放進背包前由呼叫端檢查空位
function createPrimalPlatinumGear(level) {
    const slots = Object.keys(equipTypes).filter(n => !NON_FORGEABLE_SLOTS.includes(n));
    let def = null;
    for (let i = 0; i < 20 && !def; i++) def = pickGearDef(slots[Math.floor(Math.random() * slots.length)], getCraftChannel(level));
    if (!def) return null;
    const orange = equipQualities.find(q => q.name === GEAR_ANCIENT_QUALITY);
    const base = level * EQUIP_LEVEL_STAT_MULT * orange.mult;
    const eq = createGearEquip(def, orange, base, level, true);
    const external = !!GEAR_CHANNELS[def.channel].external, A = GEAR_ANCIENT[2];
    eq.stats = buildGearStats(def, orange, base);   // createGearEquip 可能已擲出遠古，重來
    eq.ancient = 2;
    BASE_STAT_KEYS.forEach(k => { if (eq.stats[k]) eq.stats[k] = Math.floor(eq.stats[k] * A.statMult); });
    eq.subs = rollGearSubs(orange.name, external, (GEAR_SUB_COUNT[orange.name] || 0) + A.extraSubs, null, def.category, level, gearRollOpts(eq));
    const ratio = getEvolveStatRatio();
    BASE_STAT_KEYS.forEach(k => { if (eq.stats[k]) eq.stats[k] = Math.floor(eq.stats[k] * ratio); });
    if (def.category === 'weapon') eq.stats[GEAR_ELEMENT_AFFIX[def.element]] = PLATINUM_QUALITY.affix;
    else if (def.category === 'armor') eq.stats.def = PLATINUM_QUALITY.def * (def.slot === '盔甲' ? GEAR_ARMOR_DEF_MULT : 1);
    else eq.stats.eva = PLATINUM_QUALITY.eva;
    eq.quality = PLATINUM_QUALITY.name;
    eq.subs = eq.subs.concat(rollGearSubs(eq.quality, external, 1, eq.subs.map(s => s[0]), def.category, level, gearRollOpts(eq)));
    applyEvolveRaceGearFx(eq);
    ensureGearLegend(eq);
    recordGearCollected(eq);
    return eq;
}
// 這件裝備擲詞條的下限（遠古、太古；新抽詞條、白金進化、洗煉共用）；一般裝備回傳 undefined
function gearRollOpts(eq) {
    const A = eq && GEAR_ANCIENT[eq.ancient];
    return A ? { minTier: A.minTier, maxRoll: !!A.maxRoll } : undefined;
}
function gearAncientTag(eq) { const A = eq && GEAR_ANCIENT[eq.ancient]; return A ? A.name + '・' : ''; }

// ---- 傳奇威能（config-enhance.js 的 GEAR_LEGENDS，只出在白金，第 67 節 D4）----
function getGearLegend(eq) { return eq && eq.legend ? GEAR_LEGENDS.find(l => l.id === eq.legend) || null : null; }
function rollGearLegendId(exclude) {
    const pool = GEAR_LEGENDS.filter(l => l.id !== exclude);
    return pool[Math.floor(Math.random() * pool.length)].id;
}
// 白金且是圖鑑裝備才有威能（神器、靈寶閣寶物沒有）
function canHaveLegend(eq) { return !!(eq && eq.quality === PLATINUM_QUALITY.name && eq.gearId); }
function ensureGearLegend(eq) { if (canHaveLegend(eq) && !getGearLegend(eq)) eq.legend = rollGearLegendId(); return eq; }
// 穿戴中白金的威能加成總和（併入 getBonusTotals）
function getGearLegendBonusTotals() {
    const t = {};
    for (let key in player.equipment) {
        const L = getGearLegend(player.equipment[key]);
        if (L) for (let k in L.bonus) t[k] = (t[k] || 0) + L.bonus[k];
    }
    return t;
}
function formatGearLegend(eq) {
    const L = getGearLegend(eq);
    return L ? `<p style="font-size: 0.8em; color: #fde68a; text-shadow: 0 0 6px rgba(251,191,36,0.6);">🌟 傳奇威能【${L.icon}${L.name}】${L.desc}</p>` : '';
}

// ---- 隨機詞條（config-enhance.js 的 gearSubAffixes）----
// 抽 count 條不重複的詞條，回傳 [[key, value, 分級], ...]；exclude = 已有的 key（進化時多抽 1 條用）
//   category＝裝備分類：依詞條的 w 權重抽（武器偏攻擊、防具偏生存、飾品偏輔助；only 限定分類），level＝裝備等級：決定能抽到的分級（第 67 節 D1）
//   opts.minTier／opts.maxRoll：遠古、太古用（D3）
function gearSubWeight(s, category) {
    if (s.only && s.only !== category) return 0;
    const w = s.w || {};
    return typeof w[category] === 'number' ? w[category] : 1;
}
function rollGearSubTier(level, minTier) {
    const lv = typeof level === 'number' ? level : GEAR_SUB_TIER_NOLEVEL;
    const band = GEAR_SUB_TIER_WEIGHTS.filter(b => lv >= b.minLv).pop() || GEAR_SUB_TIER_WEIGHTS[0];
    const w = band.w.map((x, i) => (minTier && i + 1 > minTier ? 0 : x));
    let tot = w.reduce((a, b) => a + b, 0);
    if (!tot) return minTier || 3;
    let r = Math.random() * tot;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i + 1; }
    return 3;
}
function gearSubTierInfo(tier) { return GEAR_SUB_TIERS.find(t => t.id === tier) || null; }
// 單條詞條的數值（重鑄 D2 也用）
function rollGearSubValue(s, quality, external, tier, maxRoll) {
    const scale = GEAR_SUB_QUALITY_SCALE[quality] || 0;
    const r = maxRoll ? 1 : external ? 0.5 + Math.random() * 0.5 : Math.random();
    const v = (s.min + (s.max - s.min) * r) * scale * ((gearSubTierInfo(tier) || { mult: 1 }).mult);
    return s.fmt === 'pct' ? +v.toFixed(4) : +v.toFixed(1);
}
function pickGearSubAffix(pool, category) {
    let tot = pool.reduce((a, s) => a + gearSubWeight(s, category), 0);
    if (tot <= 0) return -1;
    let r = Math.random() * tot;
    for (let i = 0; i < pool.length; i++) { r -= gearSubWeight(pool[i], category); if (r < 0) return i; }
    return pool.length - 1;
}
function rollGearSubs(quality, external, count, exclude, category, level, opts) {
    opts = opts || {};
    let pool = gearSubAffixes.filter(s => !(exclude || []).includes(s.key) && gearSubWeight(s, category) > 0);
    let subs = [];
    for (let i = 0; i < count && pool.length; i++) {
        let idx = pickGearSubAffix(pool, category);
        if (idx < 0) break;
        let s = pool.splice(idx, 1)[0];
        let tier = rollGearSubTier(level, opts.minTier);
        subs.push([s.key, rollGearSubValue(s, quality, external, tier, opts.maxRoll), tier]);
    }
    return subs;
}

// ---- 前綴／後綴命名（第 67 節 D1）：依最強的兩條詞綴，例「破軍青竹蜂雲劍・不滅」 ----
//   強弱：分級高者優先（舊詞條沒有分級視為「玄」），同級比「數值 ÷ 該詞條上限」
function rankGearSubs(eq) {
    if (!eq || !Array.isArray(eq.subs)) return [];
    return eq.subs.map(([k, v, t]) => {
        const s = gearSubAffixes.find(x => x.key === k);
        return s ? { s, score: (6 - (t || 3)) * 10 + v / (s.max || 1) } : null;
    }).filter(Boolean).sort((a, b) => b.score - a.score);
}
function getGearAffixName(eq) {
    const r = rankGearSubs(eq);
    return { pre: r[0] ? r[0].s.pre : '', suf: r[1] ? r[1].s.suf : '' };
}

function formatGearSubs(eq) {
    if (!eq || !Array.isArray(eq.subs) || eq.subs.length === 0) return '';
    let parts = eq.subs.map(([key, v, tier]) => {
        let info = gearSubAffixes.find(s => s.key === key);
        if (!info) return '';
        let t = gearSubTierInfo(tier);   // 分級標籤〔天〕〔地〕…（第 67 節 D1；舊詞條沒有）
        return `${t ? `<span style="color:${t.color}">〔${t.name}〕</span>` : ''}${info.label} +${info.fmt === 'pct' ? +(v * 100).toFixed(1) : +v.toFixed(1)}${POINT_STAT_KEYS.includes(key) ? '' : '%'}`;   // 防禦是點數（第 66 節）
    }).filter(Boolean);
    return `<p class="gear-subs">◆ ${parts.join('、')}</p>`;
}

// 已穿戴裝備的隨機詞條加總 { key: 值 }
function getGearSubTotals() {
    let t = {};
    for (let key in player.equipment) {
        let eq = player.equipment[key];
        if (!eq || !Array.isArray(eq.subs)) continue;
        eq.subs.forEach(([k, v]) => { t[k] = (t[k] || 0) + v; });
    }
    return t;
}

// ---- 加成彙總：隨機詞條＋套裝＋稱號（codex.js）＋職業被動（profession.js）----
// 共用的 key：
//   strPct/conPct/intPct/sprPct/chaPct/statPct 四維 %（以本身＋裝備總量計，statPct = 四維全部）
//   atkPct 攻擊 %、physPct 物攻 %、magPct 術攻 %、hpPct 氣血 %
//   def/eva/ice/fire/poison/metal/thunder 戰鬥屬性百分點；cap:屬性 = 該屬性上限提高
//   fx:特效名 併入同名特效；elemDmg:五行 本命為該五行時傷害 %；elemBoost:屬性 該屬性觸發時該擊傷害 %
//   enhanceChance 強化成功率；special:名稱 套裝特殊效果（值 1）
function getBonusTotals() {
    let t = getGearSubTotals();
    let add = obj => { for (let k in obj) t[k] = (t[k] || 0) + obj[k]; };
    add(getSetBonusTotals());
    add(getTitleBonusTotals());
    add(getProfessionPassive());
    add(getStrangeFireBonusTotals());   // 天下異火收錄加成（strange-fire.js）
    add(getPartnerBonusTotals());       // 出戰夥伴被動（partner.js）
    add(getAptitudeBonusTotals());      // 先天靈根與體質（aptitude.js）
    add(getGoldenCoreBonusTotals());    // 金丹（氣血／靈力 %）、元嬰（術法 %）（golden-core.js）；凝聚元神後為空
    add(getYuanshenBonusTotals());      // 元神：修為速度（yuanshen.js）；偏好屬性傷害是獨立倍率，在 resolveHit
    add(getGearLegendBonusTotals());    // 白金傳奇威能（第 67 節 D4）
    if (typeof getTalentBonusTotals === 'function') add(getTalentBonusTotals());   // 天賦樹（talent.js，第 68 節）
    return t;
}

// 攻擊／氣血的 % 加成（stats.js 的 getPhysAttack／getMagAttack／getMaxHp 使用）：kind = 'phys' | 'mag' | 'hp'
function getGearPctBonus(kind) {
    let t = getBonusTotals();
    if (kind === 'hp') return t.hpPct || 0;
    return (t.atkPct || 0) + (t[kind + "Pct"] || 0);
}

// ---- 套裝（config-sets.js）----
// 已穿戴、紫色以上、屬於某套裝的件數 { 套裝名: 件數 }
function getEquippedSetCounts() {
    let counts = {};
    for (let key in player.equipment) {
        let eq = player.equipment[key];
        let def = getGearDef(eq);
        if (!def || !def.set || !GEAR_SET_MIN_QUALITY.includes(eq.quality)) continue;
        counts[def.set] = (counts[def.set] || 0) + 1;
    }
    return counts;
}

// 套裝某一階的加成：把 {elem} 換成該套五行對應的屬性（金 → metal…）
function resolveSetTier(setName, tier) {
    let elemKey = GEAR_ELEMENT_AFFIX[gearSets[setName].element];
    let bonus = {};
    for (let k in tier.bonus) bonus[k.replace('{elem}', elemKey)] = tier.bonus[k];
    let desc = tier.desc.replace('{set}', setName).replace('{elemLabel}', combatAttrInfo[elemKey].label);
    return { bonus, desc };
}

function getSetBonusTotals() {
    let t = {};
    let counts = getEquippedSetCounts();
    for (let name in counts) {
        let set = gearSets[name];
        if (!set) continue;
        gearSetThemes[set.theme].forEach(tier => {
            if (counts[name] < tier.pieces) return;
            let b = resolveSetTier(name, tier).bonus;
            for (let k in b) t[k] = (t[k] || 0) + b[k];
        });
    }
    return t;
}

function formatSetInfo(eq) {
    let def = getGearDef(eq);
    if (!def || !def.set || !gearSets[def.set]) return '';
    let count = getEquippedSetCounts()[def.set] || 0;
    return `<p class="gear-set">❖ ${def.set}套（${gearSets[def.set].theme}）穿戴 ${count}/6</p>`;
}

// ---- 強化 ----
// 強化等級的四維倍率（+20 = ×2）
function getEnhanceMult(eq) {
    return 1 + (eq && eq.enhance ? eq.enhance : 0) * ENHANCE_STAT_PER_LEVEL;
}

// 卡片顯示用：套上強化倍率後的屬性
function getEquipEffectiveStats(eq) {
    let s = Object.assign({}, eq.stats || {});
    let m = getEnhanceMult(eq);
    if (m !== 1) ["str", "con", "int", "spr", "cha"].forEach(k => { if (s[k]) s[k] = Math.floor(s[k] * m); });
    return s;
}

// ---- 奪寶掉落（config-gear.js 的 LOOT_DROP）----
// source：cultivator／ambush／ren／di／tian；掉落時回傳日誌文字，沒掉回傳 ''
function tryLootDrop(source) {
    let rule = LOOT_DROP[source];
    if (!rule) return '';
    let chance = rule.chance >= 1 ? 1 : rule.chance * (1 + gearFx("奪寶"));
    if (Math.random() >= chance) return '';

    let r = Math.random(), acc = 0, qualityName = null;
    for (let q in rule.odds) { acc += rule.odds[q]; if (r < acc) { qualityName = q; break; } }
    let qualityObj = getQualityObj(qualityName || Object.keys(rule.odds).pop());
    let levels = EQUIP_LEVELS.filter(l => l <= player.level);
    let level = levels.length ? levels[levels.length - 1] : EQUIP_LEVELS[0];
    let slots = Object.keys(gearBySlot);
    let def = pickGearDef(slots[Math.floor(Math.random() * slots.length)], 'loot');
    let eq = createGearEquip(def, qualityObj, level * EQUIP_LEVEL_STAT_MULT * qualityObj.mult, level);
    let where = receiveLootEquip(eq);
    return `🎁 奪得【Lv.${level}·<span class="quality-${eq.quality}">${eq.quality}</span>·${getEquipDisplayName(eq)}】！（${where}）`;
}

// ---- 顯示 ----
// 裝備名稱：圖鑑名稱 → 靈寶閣商品名稱 → 部位名（舊資料）
function getEquipDisplayName(eq) {
    if (!eq) return '';
    let def = getGearDef(eq);
    if (def) {
        const an = getGearAffixName(eq);   // 前綴／後綴（第 67 節 D1）
        return (eq.quality === PLATINUM_QUALITY.name ? EVOLVE_NAME_PREFIX : '') + gearAncientTag(eq) + an.pre + def.name + (an.suf ? '・' + an.suf : '');
    }
    if (eq.lingbaoId) {
        let item = lingbaoShopItems.find(i => i.id === eq.lingbaoId);
        if (item) return item.name.replace(/^神器・/, '');
    }
    return eq.name;
}

// 卡片標題：「Lv.500 太白劍 +12」
function formatEquipTitle(eq) {
    let plus = eq && eq.enhance ? ` <span class="enhance-tag">+${eq.enhance}</span>` : '';
    let lock = eq && eq.locked ? ' <span title="已鎖定">🔒</span>' : '';
    return `${formatEquipLevel(eq)}${getEquipDisplayName(eq)}${plus}${lock}`;
}

// 卡片的屬性、詞條、特效、孔位（背包、角色裝備欄、千寶閣、強化視窗共用）
function formatEquipDetails(eq) {
    let statsText = NUMERIC_V2 ? nv2FormatEquipStats(eq) : formatEquipStats(getEquipEffectiveStats(eq));   // 新制顯示武器攻擊與新屬性點（numeric.js）
    return `<p style="font-size: 0.8em; color: #facc15;">加成: ${statsText}</p>
            ${formatGearSubs(eq)}${typeof formatGearCraftTag === 'function' ? formatGearCraftTag(eq) : ''}${formatGearLegend(eq)}${formatGearEffect(eq)}${formatRaceGearFx(eq)}${formatSetInfo(eq)}${formatSockets(eq)}`;
}

// 卡片副標：部位・四維模板・來源
function formatGearSubline(eq) {
    let def = getGearDef(eq);
    if (def) return `${def.slot}・${def.template}・${GEAR_CHANNELS[def.channel].short}`;
    if (eq && eq.lingbaoId && eq.category !== 'artifact') return `${eq.name}・靈寶閣`;
    return eq ? eq.name : '';
}

// 特效說明：數值依品級換算（白～藍顯示紫色時的數值）
function describeGearEffect(name, quality) {
    let info = gearEffects[name];
    if (!info) return '';
    let v = info.value * (GEAR_EFFECT_TIER_MULT[quality] || 1);
    let text = info.fmt === 'pct' ? `${+(v * 100).toFixed(1)}%` : info.fmt === 'pt' ? `${+v.toFixed(1)}%` : info.fmt === 'num' ? `${+v.toFixed(1)}` : `×${+v.toFixed(2)}`;
    return info.desc.replace('{v}', text);
}

// 卡片特效列：紫色以上亮色，白～藍灰色並註明
function formatGearEffect(eq) {
    let def = getGearDef(eq);
    if (!def || !def.effect) return '';
    let active = !!GEAR_EFFECT_TIER_MULT[eq.quality];
    return `<p class="gear-effect${active ? '' : ' inactive'}">✦ 特效【${def.effect}】${describeGearEffect(def.effect, eq.quality)}${active ? '' : '（紫色以上生效）'}</p>`;
}

// ---- 特效（紫色以上生效）----
// 已穿戴裝備的特效總和：同名相加、各自有上限（config-gear.js 的 gearEffects）
function getGearEffects() {
    let fx = {};
    for (let key in player.equipment) {
        let eq = player.equipment[key];
        let def = getGearDef(eq);
        let mult = eq && GEAR_EFFECT_TIER_MULT[eq.quality];
        let info = def && gearEffects[def.effect];
        if (!mult || !info) continue;
        fx[def.effect] = Math.min(info.cap, (fx[def.effect] || 0) + info.value * mult);
    }
    // 隨機詞條、套裝、稱號、職業被動中的「fx:特效名」直接加上去（不受特效上限限制）
    let t = getBonusTotals();
    for (let k in t) if (k.startsWith("fx:")) fx[k.slice(3)] = (fx[k.slice(3)] || 0) + t[k];
    return fx;
}

function gearFx(name) {
    return getGearEffects()[name] || 0;
}

// 每波戰鬥的狀態（不存檔）：野外刷新一波、渡劫、懸賞對決開打時歸零
//   gearWaveRound 回合數（先手盾）、gearFirstStrikeUsed 首擊、gearUndyingUsed 套裝不死、gearDodgeStrikeReady 套裝閃避後強擊
let gearWaveRound = 0;
let gearFirstStrikeUsed = false;
let gearUndyingUsed = false;
let gearDodgeStrikeReady = false;
function resetGearWave() {
    gearWaveRound = 0;
    gearFirstStrikeUsed = false;
    gearUndyingUsed = false;
    gearDodgeStrikeReady = false;
}

function hasSetSpecial(name) {
    return !!getBonusTotals()["special:" + name];
}

// 套裝（防禦 6 件）：受到致命傷時保留 1 點氣血，每波一次。玩家氣血 ≤ 0 時呼叫，救回則回傳 true
function tryGearUndying() {
    if (player.hp > 0 || gearUndyingUsed || !hasSetSpecial("undying")) return false;
    gearUndyingUsed = true;
    player.hp = 1;
    addLog(`🛡️ 套裝之力護住心脈，你以 1 點氣血撐了下來！（本波戰鬥限一次）`, "heal", true);   // 野外回合日誌靜音時也要顯示（ui.js）
    return true;
}

// 玩家每一擊的額外倍率（combat.js 的 playerAttackTurn 內呼叫）：首擊、燃魂、斬殺、本命五行稱號、閃避後強擊
function getGearHitMult(fx, target) {
    let mult = 1;
    if (!gearFirstStrikeUsed) {
        gearFirstStrikeUsed = true;
        mult *= 1 + (fx["首擊"] || 0);
    }
    if (fx["燃魂"] && player.hp > player.maxHp * 0.8) mult *= 1 + fx["燃魂"];
    if (fx["斬殺"] && target && target.maxHp && target.hp < target.maxHp * 0.2) mult *= 1 + fx["斬殺"];
    let el = getPlayerElement();
    let t = getBonusTotals();
    if (el && t["elemDmg:" + el]) mult *= 1 + t["elemDmg:" + el];
    if (gearDodgeStrikeReady) { gearDodgeStrikeReady = false; mult *= 1.3; }
    return mult;
}

// 命中後的連鎖效果（冰封擴散、連雷、毒爆、套裝屬性強擊），回傳額外造成的傷害
function applyGearHitChain(fx, target, targets, r, tags) {
    let extra = 0;
    // 套裝（屬性 4 件）：對應屬性觸發時，該擊傷害再 +20%
    let totals = getBonusTotals();
    r.tags.forEach(tag => {
        let boost = totals["elemBoost:" + tag];
        if (boost && r.dmg > 0) { let d = roundDmg(r.dmg * boost); target.hp -= d; extra += d; }
    });
    let others = () => targets.filter(t => t !== target && t.hp > 0);
    if (fx["冰封"] && r.tags.includes("ice") && Math.random() < fx["冰封"]) {
        let pool = others().filter(t => t.status && !(t.status.frozen > 0));
        if (pool.length) { pool[0].status.frozen = Math.max(pool[0].status.frozen, FREEZE_TURNS); tags.push("ice"); }
    }
    if (fx["連雷"] && r.tags.includes("thunder") && r.dmg > 0) {
        let pool = others();
        if (pool.length) { let d = roundDmg(r.dmg * fx["連雷"]); pool[0].hp -= d; extra += d; tags.push("thunder"); }
    }
    let st = target.status;
    let maxStacks = getPlayerCombatAttrs().poisonMax || POISON_MAX_STACKS;
    if (fx["毒爆"] && st && st.poison && st.poison.stacks >= maxStacks) {
        let d = roundDmg(getPhysAttack() * fx["毒爆"]);   // 新制保留 1 位小數（elements.js）
        target.hp -= d;
        extra += d;
        st.poison = null;
        tags.push("poisonBurst");
    }
    return extra;
}

// 敵人打到玩家之後（野外、渡劫、懸賞對決）：金身／化勁減傷、反震、閃擊反擊
//   attacker 要有 hp（反震、閃擊直接扣它的 hp）；isMagic = 術法攻擊（修士、心魔、懸賞人物的武學）
//   回傳減傷後的傷害（之後仍會經過靈寵的 applyPetDamageReduction）
function applyGearDefense(r, attacker, isMagic, tags) {
    let fx = getGearEffects();
    let dmg = r.dmg * (1 - (isMagic ? (fx["化勁"] || 0) : (fx["金身"] || 0)));
    if (fx["反震"] && dmg > 0 && attacker) {
        attacker.hp -= roundDmg(dmg * fx["反震"]);
        tags.push("reflect");
    }
    if (r.tags.includes("dodge") && hasSetSpecial("dodgeStrike")) gearDodgeStrikeReady = true;   // 套裝（閃避 4 件）
    if (fx["閃擊"] && r.tags.includes("dodge") && attacker && attacker.hp > 0) {
        let hit = resolveHit(getPhysAttack() * fx["閃擊"], { attrs: getPlayerCombatAttrs(), power: getPhysAttack() },
                             { attrs: attacker.attrs || {}, status: attacker.status || newStatus() });
        attacker.hp -= hit.dmg;
        tags.push("counterHit");
    }
    return roundDmg(dmg);   // 舊制捨去、新制保留 1 位小數（elements.js）
}

// 每回合回復（回春、回靈）：野外、渡劫、懸賞對決與靈根回復一起結算，回傳回復的氣血
function applyGearRegen() {
    let fx = getGearEffects();
    let heal = 0;
    if (fx["回春"] && player.hp > 0 && player.hp < player.maxHp) {
        heal = Math.min(player.maxHp - player.hp, player.maxHp * fx["回春"]);
        player.hp += heal;
    }
    if (fx["回靈"] && player.mp < player.maxMp) {
        player.mp = Math.min(player.maxMp, player.mp + player.maxMp * fx["回靈"]);
    }
    return Math.floor(heal);
}

// ---- 舊存檔相容（讀檔／匯入時執行）----
// 更新前的裝備沒有 gearId：依「部位＋五行」對應到圖鑑中的一種，數值不變。
//   有裝備等級（鍛造）→ 該等級的可製作清單；沒有（千寶閣／更早的鍛造）→ 拍賣清單。每個管道每種五行各一件，所以結果固定。
//   靈寶閣的寶物不轉換：沒有 lingbaoId 的舊寶物依「部位＋屬性完全相同」補上 lingbaoId。
function migrateGearIds() {
    let lingbaoEquips = lingbaoShopItems.filter(i => i.type === 'equip' && i.itemData.category !== 'artifact');
    let sameStats = (a, b) => {
        let keys = new Set(Object.keys(a || {}).concat(Object.keys(b || {})));
        for (let k of keys) if (((a || {})[k] || 0) !== ((b || {})[k] || 0)) return false;
        return true;
    };
    let fix = eq => {
        if (!eq || eq.gearId || eq.category === 'artifact' || !gearBySlot[eq.name]) return;
        if (!eq.lingbaoId) {
            let match = lingbaoEquips.find(i => i.itemData.name === eq.name && sameStats(i.itemData.stats, eq.stats));
            if (match) eq.lingbaoId = match.id;
        }
        if (eq.lingbaoId) return;
        let channel = eq.level ? getCraftChannel(eq.level) : 'auction';
        let list = gearBySlot[eq.name];
        let def = list.find(d => d.channel === channel && d.element === eq.element) || list.find(d => d.element === eq.element);
        if (def) eq.gearId = def.id;
    };
    Object.values(player.equipment || {}).forEach(fix);
    (player.equipInventory || []).forEach(fix);
    (player.auctionItems || []).forEach(item => { if (item && item.equip) fix(item.equip); });
}
