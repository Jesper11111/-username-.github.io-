// 元神（ARCHITECTURE.md 第 65 節）：天元神／地元神、元嬰化神法、化神訣殘本；設定在 config-yuanshen.js
// 存檔：player.yuanshen = { type: 先天體質 id, tier: 'heaven'|'earth', at }（沒有＝未凝聚）、player.huashenScrolls（化神訣殘本數）
// 對外：hasYuanshen／getYuanshenInfo／getYuanshenBonusTotals（gear.js 的 getBonusTotals）／getYuanshenElement（stats.js 的 getPlayerElement）／
//       getYuanshenDmg（elements.js 的 getPlayerCombatAttrs → resolveHit）／addHuashenScroll／rollHuashenScroll／openYuanshenModal／condenseYuanshen／formatYuanshenShort

function hasYuanshen() { return !!(player.yuanshen && YUANSHEN_TYPES[player.yuanshen.type]); }

// 已凝聚的元神：{ ...種類, tierInfo }；沒有回傳 null
function getYuanshenInfo() {
    if (!hasYuanshen()) return null;
    const t = YUANSHEN_TYPES[player.yuanshen.type];
    return Object.assign({ id: player.yuanshen.type, tierInfo: YUANSHEN_TIERS[t.tier] }, t);
}

// 依目前資質判斷可凝聚哪一種元神：只有「神體＋至尊靈根」「道體＋特殊靈根」兩種組合，其餘回傳 null
function getYuanshenCandidate() {
    const a = player.aptitude;
    if (!a || !a.root || !a.physique) return null;
    const t = YUANSHEN_TYPES[a.physique];
    if (!t) return null;
    const tier = YUANSHEN_TIERS[t.tier];
    const phys = describePhysique(a.physique);
    if (!phys || phys.grade !== tier.physGrade || a.root.group !== tier.rootGroup) return null;
    return Object.assign({ id: a.physique, tierInfo: tier }, t);
}

// ---- 加成 ----
function getYuanshenBonusTotals() {
    const y = getYuanshenInfo();
    return y ? { "fx:悟道": y.tierInfo.cultivate } : {};
}
// 五行偏好的元神：本命五行鎖定為該屬性
function getYuanshenElement() {
    const y = getYuanshenInfo();
    return y && y.elem ? y.elem : null;
}
// 給 resolveHit 的偏好屬性傷害：{ elem, affix, pct }（獨立倍率，不進增益池）
function getYuanshenDmg() {
    const y = getYuanshenInfo();
    return y ? { elem: y.elem || null, affix: y.affix || null, pct: y.tierInfo.dmg } : null;
}
// ---- 視覺特效（config-yuanshen.js 的 YUANSHEN_FX）----
function getYuanshenFx() {
    const y = getYuanshenInfo();
    return y ? YUANSHEN_FX[y.elem || y.affix] || null : null;
}
// 戰場飄字的元神標記，例「💧+30%」（battle-fx.js）
function getYuanshenFxLabel() {
    const y = getYuanshenInfo(), fx = getYuanshenFx();
    return y && fx ? `${fx.icon}+${Math.round(y.tierInfo.dmg * 100)}%` : '';
}
function yuanshenPrefLabel(y) {
    return y.elem ? `${y.elem}屬性` : `${YUANSHEN_AFFIX_LABELS[y.affix]}屬性`;
}
function yuanshenEffectText(y) {
    const pct = Math.round(y.tierInfo.dmg * 100);
    const pref = y.elem ? `本命五行鎖定為【${y.elem}】，造成的傷害 +${pct}%${y.elem === '火' ? '（含燒傷）' : ''}`
               : y.affix === 'thunder' ? `雷擊觸發時傷害 +${pct}%` : `風擊追加的那一擊傷害 +${pct}%`;
    return `基本修為速度 +${Math.round(y.tierInfo.cultivate * 100)}%、${pref}`;
}

// ---- 化神訣殘本 ----
function addHuashenScroll(n, source) {
    n = Math.floor(n || 0);
    if (n <= 0) return 0;
    player.huashenScrolls = (player.huashenScrolls || 0) + n;
    if (source) addLog(`📖 ${source}，獲得【化神訣殘本】×${n}（${player.huashenScrolls.toWan()}／${YUANSHEN_COST[0].n.toWan()}）`, "level-up", false, "item");
    return n;
}
function rollHuashenScroll([a, b]) { return a + Math.floor(Math.random() * (b - a + 1)); }
// 野外擊殺（combat.js）：適合境界化神以上的地圖，每隻機率掉落；回傳掉落頁數
function rollFieldHuashenScroll(kills) {
    const D = HUASHEN_SCROLL_DROPS, suit = typeof getMapSuitRange === 'function' ? getMapSuitRange(player.currentMap) : null;
    if (!suit || suit[0] < D.fieldMinRealm || !(kills > 0)) return 0;
    let n = 0;
    for (let i = 0; i < kills; i++) if (Math.random() < D.fieldChance) n += rollHuashenScroll(D.field);
    return n ? addHuashenScroll(n, '斬殺妖獸，從遺骸中翻出殘頁') : 0;
}
// 每日任務一輪 10 項全部領完（daily-quest.js）：每一輪只給一次（記在第一項上，刷新後是新陣列）
function checkDailyHuashenBonus() {
    const qs = player.dailyQuests || [];
    if (!qs.length || qs[0].ysBonus || !qs.every(q => q.claimed)) return;
    qs[0].ysBonus = true;
    addHuashenScroll(HUASHEN_SCROLL_DROPS.dailyAll, '每日任務全數完成');
}

// ---- 人物面板「元神」一行 ----
function formatYuanshenShort() {
    const y = getYuanshenInfo();
    if (y) return `<span class="${y.tierInfo.rainbow ? 'rainbow-text' : ''}" style="${y.tierInfo.rainbow ? '' : `color:${y.tierInfo.color};`} font-weight:bold;">${y.icon} ${y.name}</span>`;
    const c = getYuanshenCandidate();
    if (!c) return '<span style="color:#6b7280;">資質未達（需神體＋至尊靈根或道體＋特殊靈根）</span>';
    if (player.realmIndex < YUANSHEN_MIN_REALM) return `<span style="color:#9ca3af;">可凝聚${c.tierInfo.name}（元嬰期學元嬰化神法）</span>`;
    return `<span style="color:#facc15;">可凝聚【${c.name}】（點此查看）</span>`;
}

// ---- 元神視窗 ----
function yuanshenCostRows() {
    return YUANSHEN_COST.map(c => {
        const have = player[c.key] || 0, ok = have >= c.n;
        return `<div class="ys-cost${ok ? ' ok' : ''}"><span>${c.icon} ${c.name}</span><b>${have.toWan()} / ${c.n.toWan()}</b></div>`;
    }).join('');
}
function openYuanshenModal() {
    const box = document.getElementById('yuanshen-body');
    if (!box) return;
    const y = getYuanshenInfo();
    let html;
    if (y) {
        html = `<div class="ys-card ${y.tierInfo.rainbow ? 'rainbow-glow' : ''}">
                <div class="ys-icon">${y.icon}</div>
                <h3 class="${y.tierInfo.rainbow ? 'rainbow-text' : ''}" style="${y.tierInfo.rainbow ? '' : `color:${y.tierInfo.color};`}">${y.name}</h3>
                <p class="ys-sub">${y.tierInfo.name}・偏好${yuanshenPrefLabel(y)}</p>
                <p>${yuanshenEffectText(y)}</p>
                <p class="ys-note">先天靈根與體質的能力照常生效；原有金丹、元嬰已化入元神。資質已鎖定，轉世時元神消散、需重新凝聚。</p>
            </div>`;
    } else {
        const c = getYuanshenCandidate();
        const realmOk = player.realmIndex >= YUANSHEN_MIN_REALM;
        const costOk = YUANSHEN_COST.every(k => (player[k.key] || 0) >= k.n);
        const tiers = Object.values(YUANSHEN_TIERS).map(t => `<li><b style="color:${t.color}">${t.name}</b>：${t.physGrade}＋${t.rootGroup === 'supreme' ? '至尊靈根' : '特殊靈根'} → 修為 +${Math.round(t.cultivate * 100)}%、偏好屬性傷害 +${Math.round(t.dmg * 100)}%</li>`).join('');
        html = `<p class="ys-sub">學習【元嬰化神法】，以神識凝聚元神。</p>
            <ul class="ys-rules">${tiers}<li>其他資質組合無法凝聚元神。</li></ul>
            ${c ? `<div class="ys-card"><div class="ys-icon">${c.icon}</div><h3 style="color:${c.tierInfo.color}">${c.name}</h3>
                    <p class="ys-sub">${c.tierInfo.name}・偏好${yuanshenPrefLabel(c)}</p><p>${yuanshenEffectText(c)}</p></div>`
                 : `<p class="ys-warn">你的資質（${formatAptitudeShort()}）無法凝聚元神。</p>`}
            <div class="ys-req${realmOk ? ' ok' : ''}">境界：元嬰期以上（目前 ${realms[player.realmIndex]}）</div>
            <div class="ys-costs">${yuanshenCostRows()}</div>
            <p class="ys-note">⚠️ 凝聚後：原有金丹與元嬰化入元神（其加成消失）、資質鎖定不能再重測；轉世時元神消散。</p>
            <button class="sys-btn ys-go" ${c && realmOk && costOk ? '' : 'disabled'} onclick="condenseYuanshen()">🔮 凝聚元神</button>`;
    }
    box.innerHTML = html + `<button class="close-btn" onclick="closeModal('yuanshen-modal')">關閉</button>`;
    document.getElementById('yuanshen-modal').style.display = 'flex';
}
async function condenseYuanshen() {
    const c = getYuanshenCandidate();
    if (!c || hasYuanshen() || player.realmIndex < YUANSHEN_MIN_REALM) return;
    if (!YUANSHEN_COST.every(k => (player[k.key] || 0) >= k.n)) { gameAlert('材料不足！'); return; }
    if (!(await gameConfirm(`確定以【元嬰化神法】凝聚【${c.name}】嗎？\n\n・原有金丹與元嬰會化入元神，加成消失\n・先天資質從此鎖定，不能再重測\n・轉世時元神消散`))) return;
    YUANSHEN_COST.forEach(k => { player[k.key] -= k.n; });
    player.yuanshen = { type: c.id, tier: c.tier, at: Date.now() };
    addLog(`🔮 修成【元嬰化神法】，金丹元嬰盡化神識，凝聚【${c.name}】！${yuanshenEffectText(c)}。`, "reincarnate");
    if (c.tier === 'heaven') addLog('🌈 天地異象：九天之上星河倒懸，一尊天元神破識海而出！', "reincarnate");
    if (typeof saveLocal === 'function') saveLocal();
    updateUI();
    openYuanshenModal();
    const card = document.querySelector('#yuanshen-body .ys-card');
    if (card) card.classList.add('ys-born');   // 凝聚動畫（index.html 的 .ys-born）
}
