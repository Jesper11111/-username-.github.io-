// ==================== 做裝系統（精簡版 POE，第 69 節）====================
// 通貨：🔷天機石（重擲品級數值）、💠混元晶（整件重洗）、⚫破虛石（隨機刪一條）、🔮造化玉（加一條）；設定在 config-enhance.js 的 CRAFT_*
// 另有「鍛紋台」（指定加一條，每件一次）與「入魔淬煉」（賭博，每件一次，失敗封印但不毀裝）。介面在強化視窗（enhance.js 的 renderEnhanceModal）
// 裝備欄位：eq.poxuAt（最後一次破虛石時間）、eq.forged（用過鍛紋台）、eq.corrupt（1 入魔、2 走火入魔封印）、eq.corruptExtra（入魔多出的詞綴上限）

function getCraftCur(k) { return (player.craftCur && player.craftCur[k]) || 0; }
function addCraftCur(k, n) {
    if (!(n > 0) || !CRAFT_CURRENCIES[k]) return 0;
    if (!player.craftCur || typeof player.craftCur !== 'object') player.craftCur = {};
    player.craftCur[k] = (player.craftCur[k] || 0) + n;
    return n;
}
function spendCraftCur(k, n) { player.craftCur[k] = getCraftCur(k) - n; }
function formatCraftCur(k, n) { const C = CRAFT_CURRENCIES[k]; return `${C.icon} ${C.name} ×${n}`; }
// { tianji: 2, ... } → 「🔷 天機石 ×2、…」
function formatCraftGain(g) { return CRAFT_CUR_KEYS.filter(k => g && g[k] > 0).map(k => formatCraftCur(k, g[k])).join('、'); }

// 野外擊殺掉落：kills＝實際擊殺數（線上逐隻、離線一次結算）；mult＝掉率倍數（挑戰模式越級用）。回傳 { key: 數量 }
function rollCraftFieldDrops(kills, mult) {
    const g = {};
    if (!(kills > 0)) return g;
    CRAFT_CUR_KEYS.forEach(k => {
        const exp = kills * CRAFT_CURRENCIES[k].field * (mult || 1);
        let n = Math.floor(exp);
        if (Math.random() < exp - n) n++;
        if (n > 0) g[k] = addCraftCur(k, n);
    });
    return g;
}
// 線上野外（combat.js）：掉到才寫日誌
function onCraftFieldKills(kills) {
    const g = rollCraftFieldDrops(kills, typeof getChallengeCraftMult === 'function' ? getChallengeCraftMult() : 1);
    const t = formatCraftGain(g);
    if (t) addLog(`✨ 從妖獸遺骸中拾得 ${t}！`, "level-up", false, "item");
    return g;
}
// 鎮魔塔每層 BOSS（zhenmo.js 的 grantRewards）
function rollCraftZhenmo(floor, mult) {
    const D = CRAFT_DROPS.zhenmo, g = {}, gate = floor % 10 === 0;
    const hit = p => Math.random() < Math.min(1, p * (mult || 1));
    if (hit(D.tianji)) g.tianji = addCraftCur('tianji', 1);
    if (floor >= D.hunyuanFrom && hit(D.hunyuan)) g.hunyuan = addCraftCur('hunyuan', 1);
    if (gate && hit(D.poxuGate)) g.poxu = addCraftCur('poxu', 1);
    if (gate && floor >= D.zaohuaFrom && hit(D.zaohuaGate)) g.zaohua = addCraftCur('zaohua', 1);
    return g;
}
// 分解（enhance.js 的 getDecomposeYield 之後呼叫）
function rollCraftDecompose(eq) {
    const g = {};
    const p = CRAFT_DROPS.decomposeTianji[eq.quality] || 0;
    if (p && Math.random() < p) g.tianji = addCraftCur('tianji', 1);
    if (eq.ancient === 2) g.zaohua = addCraftCur('zaohua', CRAFT_DROPS.decomposePrimalZaohua);
    return g;
}

// 多件一起分解：合併成一個 { key: 數量 }
function rollCraftDecomposeMany(list) {
    const g = {};
    (list || []).forEach(eq => { const one = rollCraftDecompose(eq); for (let k in one) g[k] = (g[k] || 0) + one[k]; });
    return g;
}
function craftGainSuffix(g) { const t = formatCraftGain(g); return t ? `、${t}` : ''; }

// ---- 共用 ----
function canCraft(eq) { return !!(eq && eq.gearId && Array.isArray(eq.subs) && getGearDef(eq)); }
function craftSubCap(eq) {
    const A = GEAR_ANCIENT[eq.ancient];
    return (GEAR_SUB_COUNT[eq.quality] || 0) + (A ? A.extraSubs : 0) + (eq.corruptExtra || 0);
}
function craftCoins() { return Math.floor(getHourlyIncome() * CRAFT_COINS_HOURS); }
function craftPoxuLockLeft(eq) { return eq.poxuAt ? Math.max(0, eq.poxuAt + CRAFT_POXU_LOCK_MS - Date.now()) : 0; }
function isCraftSealed(eq) { return !!(eq && eq.corrupt === 2); }
function craftCtx(eq) {
    const def = getGearDef(eq);
    return { def, external: !!(def && GEAR_CHANNELS[def.channel].external), opts: gearRollOpts(eq) || {} };
}
// 詞條改到指定分級，數值依分級倍率等比換算
function setSubTier(sub, tier) {
    const s = gearSubAffixes.find(x => x.key === sub[0]);
    const from = (gearSubTierInfo(sub[2] || 3) || { mult: 1 }).mult, to = (gearSubTierInfo(tier) || { mult: 1 }).mult;
    const v = sub[1] * to / from;
    return [sub[0], s && s.fmt === 'pct' ? +v.toFixed(4) : +v.toFixed(1), tier];
}
function stripTags(h) { return String(h).replace(/<[^>]+>/g, ''); }
function craftLocate() {
    const loc = enhanceEquipId && locateEquip(enhanceEquipId);
    if (!loc || !canCraft(loc.eq)) return null;
    if (loc.eq.refinePending) { alert('請先完成洗煉的三選一。'); return null; }
    if (isCraftSealed(loc.eq)) { alert('這件裝備已走火入魔被封印，無法再做裝。'); return null; }
    return loc.eq;
}
function craftAfter(eq, text) {
    addLog(`🔮 【${getEquipDisplayName(eq)}】${text}`, "equip");
    if (typeof saveLocal === 'function') saveLocal();
    renderEnhanceModal();
    refreshEquipViews();
    updateUI();
}
// 刪掉第 idx 條後，洗煉鎖定的位置要跟著調整
function fixRefineIdxAfterRemove(eq, idx) {
    if (typeof eq.refineIdx !== 'number') return;
    if (eq.refineIdx === idx) delete eq.refineIdx;
    else if (eq.refineIdx > idx) eq.refineIdx--;
}
function payCraft(eq, k, n) {
    const coins = craftCoins();
    if (getCraftCur(k) < n || player.coins < coins) { alert(`${CRAFT_CURRENCIES[k].name}或靈石不足！`); return false; }
    spendCraftCur(k, n);
    player.coins -= coins;
    return true;
}

// ---- 四種通貨 ----
function useCraftCur(k) {
    const eq = craftLocate();
    if (!eq) return;
    const C = craftCtx(eq);
    const before = stripTags(formatGearSubs(eq)).replace(/^◆ /, '');
    if (k === 'tianji') {
        if (!eq.subs.length) return;
        if (!payCraft(eq, k, 1)) return;
        eq.subs = eq.subs.map(sub => {
            const s = gearSubAffixes.find(x => x.key === sub[0]);
            if (!s) return sub;
            const tier = rollGearSubTier(eq.level, C.opts.minTier);
            return [sub[0], rollGearSubValue(s, eq.quality, C.external, tier, C.opts.maxRoll), tier];
        });
    } else if (k === 'hunyuan') {
        if (!eq.subs.length) return;
        if (!confirm('混元晶會把整件詞綴全部重洗（種類、品級、數值），確定？')) return;
        if (!payCraft(eq, k, 1)) return;
        eq.subs = rollGearSubs(eq.quality, C.external, eq.subs.length, null, eq.category, eq.level, C.opts);
        delete eq.refineIdx;   // 詞綴全換了，洗煉鎖定解除（已洗次數保留）
    } else if (k === 'poxu') {
        if (eq.subs.length < 1) return;
        if (!confirm('破虛石會「隨機」刪掉一條詞綴，可能刪到好的；之後 24 小時這件不能用造化玉／鍛紋台。確定？')) return;
        if (!payCraft(eq, k, 1)) return;
        const idx = Math.floor(Math.random() * eq.subs.length);
        const gone = stripTags(formatOneSub(eq.subs[idx]));
        eq.subs.splice(idx, 1);
        fixRefineIdxAfterRemove(eq, idx);
        eq.poxuAt = Date.now();
        craftAfter(eq, `⚫ 破虛石：刪去「${gone}」。`);
        return;
    } else if (k === 'zaohua') {
        if (eq.subs.length >= craftSubCap(eq)) { alert('詞綴已達上限。'); return; }
        if (craftPoxuLockLeft(eq)) { alert('剛用過破虛石，冷卻中。'); return; }
        const add = rollGearSubs(eq.quality, C.external, 1, eq.subs.map(s => s[0]), eq.category, eq.level, C.opts);
        if (!add.length) { alert('沒有可加的詞綴了。'); return; }
        if (!payCraft(eq, k, 1)) return;
        eq.subs.push(add[0]);
        craftAfter(eq, `🔮 造化玉：新增「${stripTags(formatOneSub(add[0]))}」。`);
        return;
    }
    craftAfter(eq, `${CRAFT_CURRENCIES[k].icon} ${CRAFT_CURRENCIES[k].name}：${before} → ${stripTags(formatGearSubs(eq)).replace(/^◆ /, '')}。`);
}

// ---- 鍛紋台：指定加一條（品級隨機），每件一次 ----
let craftForgeKey = '';
function craftForgeOptions(eq) {
    const have = eq.subs.map(s => s[0]);
    return gearSubAffixes.filter(s => !have.includes(s.key) && gearSubWeight(s, eq.category) > 0);
}
function forgeCraftSub() {
    const eq = craftLocate();
    if (!eq) return;
    if (eq.forged) { alert('這件已用過鍛紋台。'); return; }
    if (eq.subs.length >= craftSubCap(eq)) { alert('詞綴已達上限，請先用破虛石刪掉一條。'); return; }
    if (craftPoxuLockLeft(eq)) { alert('剛用過破虛石，冷卻中。'); return; }
    const s = craftForgeOptions(eq).find(x => x.key === craftForgeKey);
    if (!s) { alert('請先選擇要鍛上的詞綴。'); return; }
    const F = CRAFT_FORGE, coins = craftCoins();
    if ((player.refineStones || 0) < F.stones || getCraftCur('zaohua') < F.zaohua || player.coins < coins) { alert('材料或靈石不足！'); return; }
    if (!confirm(`鍛紋台每件只能用一次，確定把「${s.label}」鍛上這件裝備？（品級隨機）`)) return;
    player.refineStones -= F.stones;
    spendCraftCur('zaohua', F.zaohua);
    player.coins -= coins;
    const C = craftCtx(eq), tier = rollGearSubTier(eq.level, C.opts.minTier);
    const sub = [s.key, rollGearSubValue(s, eq.quality, C.external, tier, C.opts.maxRoll), tier];
    eq.subs.push(sub);
    eq.forged = 1;
    craftForgeKey = '';
    craftAfter(eq, `⚒️ 鍛紋台：鍛上「${stripTags(formatOneSub(sub))}」。`);
}

// ---- 入魔淬煉：每件一次 ----
function corruptEquip() {
    const eq = craftLocate();
    if (!eq) return;
    if (eq.corrupt) { alert('這件已入魔淬煉過。'); return; }
    if (!eq.subs.length) return;
    const R = CRAFT_CORRUPT, coins = craftCoins();
    if ((player.refineStones || 0) < R.stones || getCraftCur('hunyuan') < R.hunyuan || player.coins < coins) { alert('材料或靈石不足！'); return; }
    if (!confirm(`入魔淬煉（每件限一次）：\n・${Math.round(R.big * 100)}% 大成功：多一條詞綴（可超過上限）或一條升為天級\n・${Math.round(R.small * 100)}% 小成功：一條詞綴品級 +1\n・${Math.round(R.none * 100)}% 沒有變化\n・${Math.round((1 - R.big - R.small - R.none) * 100)}% 走火入魔：一條詞綴降一級，並且「封印」，之後不能再洗煉或做裝（裝備不會消失）\n確定？`)) return;
    player.refineStones -= R.stones;
    spendCraftCur('hunyuan', R.hunyuan);
    player.coins -= coins;
    const C = craftCtx(eq), r = Math.random(), i = Math.floor(Math.random() * eq.subs.length);
    const name = idx => stripTags(formatOneSub(eq.subs[idx]));
    let text;
    eq.corrupt = 1;
    if (r < R.big) {
        const add = Math.random() < 0.5 ? rollGearSubs(eq.quality, C.external, 1, eq.subs.map(s => s[0]), eq.category, eq.level, C.opts) : [];
        if (add.length) {
            eq.subs.push(add[0]);
            eq.corruptExtra = 1;
            text = `大成功！多出一條「${name(eq.subs.length - 1)}」。`;
        } else {
            const before = name(i);
            const s = gearSubAffixes.find(x => x.key === eq.subs[i][0]);
            eq.subs[i] = (eq.subs[i][2] || 3) === 1 && s ? [s.key, rollGearSubValue(s, eq.quality, C.external, 1, true), 1] : setSubTier(eq.subs[i], 1);
            text = `大成功！「${before}」→「${name(i)}」。`;
        }
    } else if (r < R.big + R.small) {
        const before = name(i), t = eq.subs[i][2] || 3;
        const s = gearSubAffixes.find(x => x.key === eq.subs[i][0]);
        eq.subs[i] = t === 1 && s ? [s.key, rollGearSubValue(s, eq.quality, C.external, 1, true), 1] : setSubTier(eq.subs[i], t - 1);
        text = `小成功，「${before}」→「${name(i)}」。`;
    } else if (r < R.big + R.small + R.none) {
        text = '魔氣散去，沒有變化。';
    } else {
        const before = name(i), t = eq.subs[i][2] || 3;
        if (t < 5) eq.subs[i] = setSubTier(eq.subs[i], t + 1);
        eq.corrupt = 2;
        delete eq.refinePending;
        text = `走火入魔！「${before}」→「${name(i)}」，裝備被封印。`;
    }
    craftAfter(eq, `😈 入魔淬煉：${text}`);
    alert(`入魔淬煉：${text}`);
}

// ---- 卡片標籤（gear.js 的 formatEquipDetails）----
function formatGearCraftTag(eq) {
    if (!eq || !(eq.corrupt || eq.forged)) return '';
    const parts = [];
    if (eq.corrupt === 2) parts.push('<span style="color:#f87171;">😈 走火入魔・封印</span>');
    else if (eq.corrupt) parts.push('<span style="color:#c084fc;">😈 已入魔</span>');
    if (eq.forged) parts.push('<span style="color:#fbbf24;">⚒️ 已鍛紋</span>');
    return `<p style="font-size: 0.75em;">${parts.join('　')}</p>`;
}

// ---- 強化視窗區塊 ----
function renderCraftSection(eq) {
    if (!canCraft(eq) || (!eq.subs.length && !craftSubCap(eq))) return '';
    const hold = CRAFT_CUR_KEYS.map(k => `${CRAFT_CURRENCIES[k].icon}${CRAFT_CURRENCIES[k].name} <b>${getCraftCur(k)}</b>`).join('｜');
    const head = `<div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 10px; padding-top: 8px;">
        <p style="color: #c4b5fd;">🔮 做裝（詞綴 ${eq.subs.length} / ${craftSubCap(eq)}）</p>
        <p style="color: #9ca3af; font-size: 0.85em;">持有：${hold}</p>`;
    if (isCraftSealed(eq)) return head + `<p style="color: #f87171;">😈 這件已走火入魔被封印，不能再洗煉或做裝（屬性照常生效）。</p></div>`;
    if (eq.refinePending) return head + `<p style="color: #9ca3af;">請先完成上方洗煉的三選一。</p></div>`;
    const coins = craftCoins(), lock = craftPoxuLockLeft(eq), full = eq.subs.length >= craftSubCap(eq);
    const lockText = lock ? `（破虛冷卻 ${Math.ceil(lock / 3600000)} 小時）` : '';
    const btn = (k, extraOk, note) => {
        const C = CRAFT_CURRENCIES[k], ok = getCraftCur(k) >= 1 && player.coins >= coins && extraOk;
        return `<button class="sys-btn" style="margin: 2px;" ${ok ? '' : 'disabled'} title="${C.desc}" onclick="useCraftCur('${k}')">${C.icon} ${C.name}${note || ''}</button>`;
    };
    const hasSubs = eq.subs.length > 0;
    let html = head + `<div class="batch-btns" style="flex-wrap: wrap;">
            ${btn('tianji', hasSubs)}${btn('hunyuan', hasSubs)}${btn('poxu', hasSubs)}${btn('zaohua', !full && !lock, lockText)}
        </div>
        <p style="color: #9ca3af; font-size: 0.75em;">天機：重擲品級數值｜混元：整件重洗｜破虛：隨機刪一條｜造化：加一條。每次另扣 ${coins.toWan()} 靈石</p>`;
    // 鍛紋台
    const F = CRAFT_FORGE;
    if (eq.forged) html += `<p style="color: #9ca3af; font-size: 0.85em;">⚒️ 鍛紋台：這件已用過。</p>`;
    else {
        const opts = craftForgeOptions(eq);
        if (!opts.some(s => s.key === craftForgeKey)) craftForgeKey = '';
        const ok = !full && !lock && craftForgeKey && (player.refineStones || 0) >= F.stones && getCraftCur('zaohua') >= F.zaohua && player.coins >= coins;
        html += `<p style="color: #fbbf24; margin-top: 6px;">⚒️ 鍛紋台：指定加一條詞綴（品級隨機，每件限一次）${full ? '——詞綴已滿，先用破虛石刪一條' : lockText}</p>
            <select onchange="craftForgeKey=this.value; renderEnhanceModal();" style="max-width: 100%;">
                <option value="">— 選擇詞綴 —</option>
                ${opts.map(s => `<option value="${s.key}" ${s.key === craftForgeKey ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
            <button class="sys-btn" ${ok ? '' : 'disabled'} onclick="forgeCraftSub()">⚒️ 鍛紋（🌀 ${F.stones} ＋ 🔮 ${F.zaohua}）</button>`;
    }
    // 入魔淬煉
    const R = CRAFT_CORRUPT;
    if (eq.corrupt) html += `<p style="color: #9ca3af; font-size: 0.85em;">😈 入魔淬煉：這件已淬煉過。</p>`;
    else {
        const ok = hasSubs && (player.refineStones || 0) >= R.stones && getCraftCur('hunyuan') >= R.hunyuan && player.coins >= coins;
        html += `<p style="color: #c084fc; margin-top: 6px;">😈 入魔淬煉（賭博，每件一次）：30% 大成功／30% 品級 +1／25% 無事／15% 走火入魔（降一級＋封印，不毀裝）</p>
            <button class="sys-btn" ${ok ? '' : 'disabled'} onclick="corruptEquip()">😈 入魔淬煉（🌀 ${R.stones} ＋ 💠 ${R.hunyuan}）</button>`;
    }
    return html + '</div>';
}
