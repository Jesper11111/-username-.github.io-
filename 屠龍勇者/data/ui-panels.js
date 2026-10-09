// 屠龍勇者：遊戲主畫面各分頁（狩獵、地圖、角色、背包、技能、村莊、設定）
// 依賴 ui、player、combat、town、enchant、save
let currentTab = 'hunt';
let bagFilter = 'all';
let townSub = 'shop';
let lastLogRendered = 0;
// 戰鬥訊息抽屜：預設收起，開關狀態記在這台裝置（不進存檔）
const LOG_OPEN_KEY = 'dragonSlayer_logOpen';
let logDrawerOpen = false;
try { logDrawerOpen = localStorage.getItem(LOG_OPEN_KEY) === '1'; } catch (e) { }

// 各分頁名稱（狩獵是預設主畫面；其他分頁從左右柱子抽屜或底部格子打開）
const TABS = {
    hunt: ['⚔️', '狩獵'], map: ['🗺️', '地圖'], char: ['🧝', '人物狀態'], bag: ['🎒', '背包'],
    skill: ['✨', '技能'], quest: ['📜', '任務'], town: ['🏘️', '村莊'], set: ['⚙️', '設定'],
};

function enterGame() {
    showScreen('game');
    currentTab = 'hunt';
    layoutFrame();
    renderTabs();
    refreshUI();
}

// 更新抽屜、底部格子的「目前分頁」標示（ui-frame.js）
function renderTabs() { renderFrameNav(); }

function switchTab(tab) {
    currentTab = tab;
    closeDrawers();
    renderTabs();
    renderPanel();
    $(isSideLayout() ? 'overlay' : 'panel').scrollTop = 0;
}

// 狩獵畫面目前是否顯示中（PC 16:9 版面時狩獵一直在外框中間）
function huntVisible() { return currentTab === 'hunt' || isSideLayout(); }

const PANEL_FNS = { hunt: renderHunt, map: renderMap, char: renderChar, bag: renderBag, skill: renderSkills, quest: renderQuest, town: renderTown, set: renderSettings };

function panelHead(tab, withBack) {
    const back = isSideLayout() ? '✖ 關閉' : '✖ 返回狩獵';
    return `<div class="panel-head"><b>${TABS[tab][0]} ${TABS[tab][1]}</b>${withBack ? `<button class="mini secondary" onclick="switchTab('hunt')">${back}</button>` : ''}</div>`;
}

function refreshUI() {
    if (!player || SIM_MODE || !$('panel')) return;
    renderStatus();
    renderPanel();
}

function renderPanel() {
    const ov = $('overlay');
    if (isSideLayout()) {
        // PC 橫式外框：中間大地圖固定狩獵；其他分頁疊在地圖右側的視窗（按「關閉」回到只看地圖）
        $('panel').innerHTML = renderHunt();
        const open = currentTab !== 'hunt';
        ov.classList.toggle('hidden', !open);
        ov.innerHTML = open ? panelHead(currentTab, true) + PANEL_FNS[currentTab]() : '';
        lastLogRendered = 0;
        updateHuntLive();
        return;
    }
    ov.classList.add('hidden');
    ov.innerHTML = '';
    // 非狩獵分頁加上標題列與「返回狩獵」
    const head = currentTab === 'hunt' ? '' : panelHead(currentTab, true);
    $('panel').innerHTML = head + PANEL_FNS[currentTab]();
    if (currentTab === 'hunt') { lastLogRendered = 0; updateHuntLive(); }
}

// ───────── 狩獵 ─────────
function renderHunt() {
    if (inTown()) {
        const t = currentTown();
        return huntViewHtml(`${t.icon} ${t.name}<small>　點地圖走路・方向鍵／WASD 移動</small>`);
    }
    return huntViewHtml(`📍 ${zoneTitle()}<small id="map-prog" class="map-prog"></small>`);
}

// 中間的即時地圖（ui-scene.js 畫在 canvas 上）＋下方操作列、補給、精簡訊息
function huntViewHtml(title) {
    return `<div class="hunt-view">
        <div class="scene-wrap">
            <canvas id="scene-canvas" onclick="sceneClick(event)"></canvas>
            <div class="scene-top">${title}</div>
            <div id="hunt-buffs" class="buffs scene-buffs"></div>
            <div id="skill-bar" class="skill-bar"></div>
        </div>
        <div class="hunt-ctrl">
            <div class="btn-row scene-btns" id="hunt-btns"></div>
            <div id="hunt-session" class="session"></div>
        </div>
    </div>`;
}

// 戰鬥訊息抽屜：外框左下（紅球下方）骷髏頭是開關，抽屜 #log-pop 從下往上滑出（index.html 靜態元素，不隨分頁重畫）
function toggleLogDrawer() {
    logDrawerOpen = !logDrawerOpen;
    try { localStorage.setItem(LOG_OPEN_KEY, logDrawerOpen ? '1' : '0'); } catch (e) { }
    lastLogRendered = 0;
    renderLogPop();
}
function renderLogPop() {
    const pop = $('log-pop'), btn = $('skull-log');
    if (!pop || !player) return;
    pop.classList.toggle('open', logDrawerOpen);
    if (btn) btn.classList.toggle('open', logDrawerOpen);
    // 狩獵畫面看得到時，抽屜貼在操作列（回家卷軸、步行回村）上方，不蓋住按鈕；其他分頁用 CSS 預設位置
    const ctrl = document.querySelector('#panel .hunt-ctrl'), fr = $('frame');
    if (logDrawerOpen && ctrl && fr && ctrl.offsetParent) {
        pop.style.bottom = Math.round(fr.getBoundingClientRect().bottom - ctrl.getBoundingClientRect().top + 4) + 'px';
    } else pop.style.bottom = '';
    const logBox = $('hunt-log');
    if (!logDrawerOpen || !logBox || lastLogRendered === logSeq) return;
    lastLogRendered = logSeq;
    logBox.innerHTML = gameLog.slice(-30).map(l => `<div class="log-line ${l.cls}">${esc(l.msg)}</div>`).join('');
    logBox.scrollTop = logBox.scrollHeight;
}

function huntButtonsHtml() {
    // PC 橫式外框：地圖、村莊、回家卷軸、步行回村都在底部格子，不顯示操作框（2026-10-09 使用者要求）；只留取消步行與永夜之塔上下樓
    if (isPcFrame()) {
        if (inTown()) return '';
        if (walkHome) return `<button class="secondary" onclick="cancelWalkBtn()">取消步行</button>`;
        const z = currentZone();
        return z && z.type === 'tower' ? `<button class="secondary" onclick="changeFloorBtn(-1)">⬇ 下樓</button><button class="secondary" onclick="changeFloorBtn(1)">⬆ 上樓</button>` : '';
    }
    if (inTown()) return `<button onclick="switchTab('map')">🗺️ 前往狩獵地點</button><button class="secondary" onclick="switchTab('town')">🏘️ 村莊設施</button>`;
    if (walkHome) return `<button class="secondary" onclick="cancelWalkBtn()">取消步行</button>`;
    const z = currentZone();
    // 開始／停止掛機改由底部中間骷髏頭控制（skullHuntClick）
    let h = `<button class="secondary" onclick="homeScrollBtn()">📜 回家卷軸（${countItem('homeScroll')}）</button>`;
    h += `<button class="secondary" onclick="walkHomeBtn()">🚶 步行回村</button>`;
    if (z && z.type === 'tower') {
        h += `<button class="secondary" onclick="changeFloorBtn(-1)">⬇ 下樓</button><button class="secondary" onclick="changeFloorBtn(1)">⬆ 上樓</button>`;
    }
    return h;
}

function updateHuntLive() {
    const btns = $('hunt-btns');
    if (btns) {
        const sig = [isPcFrame(), inTown(), player.hunting, !!walkHome, countItem('homeScroll'), player.loc.floor].join('|');
        if (btns.dataset.sig !== sig) {
            btns.dataset.sig = sig;
            btns.innerHTML = huntButtonsHtml();
            const ctrl = btns.closest('.hunt-ctrl');
            if (ctrl) ctrl.classList.toggle('empty', !btns.innerHTML);
        }
    }
    startScene();
    renderSkillBar();
    const mp = $('map-prog');
    if (mp) { const t = mapProgressText(); if (mp.textContent !== t) mp.textContent = t; }
    const buffs = $('hunt-buffs');
    if (buffs) {
        const now = gameNow;
        buffs.innerHTML = Object.keys(player.buffs).filter(k => player.buffs[k].until > now).map(k => {
            const b = player.buffs[k], sec = Math.ceil((b.until - now) / 1000);
            return `<span class="chip">${esc(buffName(b))} ${sec >= 60 ? Math.ceil(sec / 60) + '分' : sec + '秒'}</span>`;
        }).join('');
    }
    const ses = $('hunt-session');
    if (ses && !inTown()) {
        const st = calcStats();
        const supplies = [`💊 藥水 ${healPotionCount()}`, `📜 回家 ${countItem('homeScroll')}`, `🌀 瞬移 ${countItem('teleScroll')}`];
        if (st.ranged) supplies.push(`🏹 彈藥 ${player.inv.filter(x => ITEMS[x.id].ammo === st.weaponType.ammo).reduce((a, x) => a + x.n, 0)}`);
        let line = '';
        if (session) {
            const hrs = Math.max(1 / 60, (gameNow - session.start) / 3600000);
            line = `<div>擊殺 ${session.kills}｜經驗 ${fmt(session.exp)}（${fmt(session.exp / hrs)}／小時）｜金幣 ${fmt(session.gold)}</div>`;
        }
        ses.innerHTML = line + `<div>${supplies.join('　')}</div>`;
    } else if (ses) ses.innerHTML = '<div>村莊裡很安全（自然回復 ×3），補給好再出發吧。</div>';
}

// ───────── 技能快捷列（野外地圖右下 4 格，鍵盤 1～4；ARCHITECTURE.md 第 17 節）─────────
// 自動挑：攻擊技能（範圍／分散優先、等級高優先）最多 3 個＋治癒（沒有就增益）
function skillBarSkills() {
    const L = learnedSkills().filter(k => k.type !== 'passive');
    const atk = L.filter(k => k.type === 'spell' || k.type === 'strike').reverse();
    const pick = [...atk.filter(k => k.aoe || k.spread), ...atk.filter(k => !k.aoe && !k.spread)].slice(0, 3);
    const heal = L.filter(k => k.type === 'heal').pop();
    if (heal) pick.push(heal);
    for (const k of L.filter(k => k.type === 'buff').reverse()) { if (pick.length >= 4) break; if (!pick.includes(k)) pick.push(k); }
    return pick.slice(0, 4);
}
function renderSkillBar() {
    const bar = $('skill-bar');
    if (!bar) return;
    if (inTown()) { if (bar.innerHTML) bar.innerHTML = ''; return; }
    const list = skillBarSkills(), now = gameNow;
    const html = list.map((k, i) => {
        const cd = player.cds[k.id] > now ? Math.ceil((player.cds[k.id] - now) / 1000) : 0;
        const pct = cd && k.cd ? Math.round((player.cds[k.id] - now) / (k.cd * 1000) * 100) : 0;
        const tag = k.aoe ? '範圍' : k.spread ? '分散' : k.type === 'heal' ? '治癒' : k.type === 'buff' ? '增益' : '';
        return `<button class="sk ${player.mp < k.mp ? 'nomp' : ''} ${cd ? 'cd' : ''}" style="--cd:${pct}%" onclick="skillBarCast(${i})" title="${esc(k.name)}（${k.mp} MP）${esc(k.desc || '')}">
            <span class="sk-n">${esc(k.name.slice(0, 2))}</span>${tag ? `<span class="sk-t">${tag}</span>` : ''}<span class="sk-k">${i + 1}</span>${cd ? `<span class="sk-cd">${cd}</span>` : ''}</button>`;
    }).join('');
    if (bar.dataset.html !== html) { bar.dataset.html = html; bar.innerHTML = html; }
}
function skillBarCast(i) {
    const k = skillBarSkills()[i];
    if (!k) return;
    const err = manualCast(k.id);
    if (err) showToast(`${k.name}：${err}`, 1200);
    renderStatus();
    updateHuntLive();
}

function homeScrollBtn() { if (!useHomeScroll('')) showToast('沒有回家卷軸'); }
function walkHomeBtn() { startWalkHome(); updateHuntLive(); }
function cancelWalkBtn() { cancelWalk(); updateHuntLive(); }
function changeFloorBtn(d) { changeFloor(d); refreshUI(); }

// ───────── 地圖 ─────────
function renderMap() {
    const town = inTown();
    let h = town ? '' : `<div class="panel notice">目前在${zoneTitle()}，要先回到村莊才能使用傳送師。</div>`;
    h += `<h4>🌀 村莊</h4><div class="grid2">` + Object.keys(TOWNS).map(id => {
        const t = TOWNS[id], here = town && player.loc.id === id;
        return `<button class="${here ? '' : 'secondary'}" onclick="travelTown('${id}')" ${!town || here ? 'disabled' : ''}>
            ${t.icon} ${t.name}<br><small>${here ? '目前位置' : '傳送 💰' + fmt(townTravelFee(id))}</small></button>`;
    }).join('') + `</div>`;

    h += mapDevicePanelHtml();
    h += `<h4>⚔️ 狩獵地點</h4>`;
    for (const z of ZONES) {
        const why = zoneBlockReason(z);
        let action;
        if (z.type === 'tower') {
            action = `<span class="tower-pick">樓層 <input id="tower-floor" type="number" min="1" max="${player.towerMax}" value="${Math.max(1, player.towerMax - 9)}"> / ${player.towerMax}F</span>
                <button onclick="travelTowerBtn()" ${town ? '' : 'disabled'}>前往</button>`;
        } else {
            action = `<button onclick="travelZone('${z.id}')" ${town && !why ? '' : 'disabled'}>前往</button>`;
        }
        const extra = z.type === 'dragon'
            ? `<small class="${player.dragons[z.boss] ? 'good' : 'muted'}">${player.dragons[z.boss] ? `已討伐 ${player.dragons[z.boss]} 次` : '尚未討伐'}${why ? '｜' + why : ''}</small>`
            : '';
        h += `<div class="zone-card ${z.type}">
            <div class="zone-head"><span class="zone-icon">${z.icon}</span><b>${z.name}</b>
                <small class="${player.lv < z.lv[0] ? 'bad' : 'muted'}">${z.type === 'dragon' ? '需求' : '建議'} Lv.${z.lv[0]}${z.type === 'dragon' ? '' : '～' + z.lv[1]}</small></div>
            <small class="muted">${z.desc}</small>${extra}
            <div class="zone-foot"><small>傳送費 💰${fmt(z.fee)}・回城：${TOWNS[z.town].name}</small>${action}</div>
        </div>`;
    }
    return h;
}

function travelTowerBtn() {
    const v = parseInt($('tower-floor').value, 10) || 1;
    travelZone('tower', clamp(v, 1, player.towerMax));
}

// ───────── 角色 ─────────
function renderChar() {
    const st = calcStats(), c = CLASSES[player.cls];
    let h = `<div class="panel">
        ${c.art ? `<img class="class-art" src="${c.art}?v=${GAME_VERSION}" alt="${c.name}">` : ''}
        <div class="loc">${c.icon} ${esc(player.name)} <small class="muted">${c.name} Lv.${player.lv}</small></div>
        <small class="muted">${c.desc}</small>
        <div class="exp-line">經驗 ${fmt(player.exp)} / ${fmt(expToNext(player.lv))}</div>
    </div>`;
    h += `<div class="panel"><h4>能力值 ${player.statPoints ? `<span class="good">（可分配 ${player.statPoints} 點）</span>` : ''}</h4><div class="stat-grid">`;
    for (const k of STAT_KEYS) {
        const bonus = st[k] - player.stats[k];
        h += `<div class="stat-cell"><span>${STAT_NAMES[k]}</span><b>${st[k]}</b>${bonus ? `<small class="good">(+${bonus})</small>` : ''}
            ${player.statPoints && player.stats[k] < STAT_CAP ? `<button class="mini" onclick="addStatBtn('${k}')">＋</button>` : ''}</div>`;
    }
    h += `</div><small class="muted">51 級起每升一級 +1 點；萬能藥 ${player.elixirs}/${ELIXIR_MAX}</small></div>`;

    const rows = [
        ['AC', st.ac], ['MR', st.mr], ['命中', st.hit], ['傷害加成', '+' + st.dmgBonus], ['SP', st.sp],
        ['爆擊', Math.round(st.crit * 100) + '%'], ['閃避', Math.round(st.dodge * 100) + '%'], ['減傷', st.reduce],
        ['攻擊間隔', (st.atkMs / 1000).toFixed(2) + ' 秒'], ['回血／5秒', st.hpRegen], ['回魔／5秒', st.mpRegen],
        ['負重', `${Math.floor(invWeight())} / ${st.weightMax}`],
    ];
    h += `<div class="panel"><h4>戰鬥數值</h4><div class="kv-grid">${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div></div>`;

    h += `<div class="panel"><h4>裝備</h4><div class="equip-grid">`;
    for (const slot of SLOT_KEYS) {
        const it = player.equip[slot];
        h += it
            ? `<button class="equip-slot filled" onclick="openItemDialog(${it.uid})"><small>${SLOTS[slot]}</small>${esc(itemName(it))}</button>`
            : `<div class="equip-slot"><small>${SLOTS[slot]}</small><span class="muted">—</span></div>`;
    }
    h += `</div></div>`;

    const dragons = DRAGON_IDS.map(id => `${player.dragons[id] ? '✅' : '⬜'} ${MONSTERS[id].name}`).join('<br>');
    h += `<div class="panel"><h4>冒險紀錄</h4><div class="kv-grid">
        <span>擊殺數</span><b>${fmt(player.kills)}</b><span>死亡數</span><b>${player.deaths}</b>
        <span>永夜之塔</span><b>可到 ${player.towerMax}F</b></div>
        <p class="dragon-list">${dragons}</p>${hasDragonTitle() ? '<p class="good">👑 稱號：屠龍勇者</p>' : ''}</div>`;
    return h;
}

function addStatBtn(k) { addStatPoint(k); saveGame(); refreshUI(); }

// ───────── 背包 ─────────
const BAG_FILTERS = [['all', '全部'], ['gear', '裝備'], ['potion', '藥水'], ['scroll', '卷軸'], ['map', '地圖'], ['other', '其他']];
const CAT_ORDER = ['quest', 'map', 'weapon', 'armor', 'potion', 'scroll', 'currency', 'ammo', 'elixir', 'material'];

function bagMatch(def) {
    if (bagFilter === 'all') return true;
    if (bagFilter === 'gear') return def.cat === 'weapon' || def.cat === 'armor';
    if (bagFilter === 'other') return ['ammo', 'elixir', 'material', 'quest', 'currency'].includes(def.cat);
    return def.cat === bagFilter;
}

function itemClass(inst) {
    const d = ITEMS[inst.id];
    if (d.safe >= 0 && (inst.ench || 0) > d.safe) return 'ench-hi';
    if ((inst.ench || 0) < 0) return 'cursed';
    if (inst.q) return QUALITY[inst.q].cls;
    if (d.cat === 'elixir' || ((d.cat === 'weapon' || d.cat === 'armor') && !d.price) || (d.cat === 'scroll' && d.bless === 1)) return 'rare-item';
    return '';
}

function sortedInv(list) {
    return [...list].sort((a, b) => CAT_ORDER.indexOf(ITEMS[a.id].cat) - CAT_ORDER.indexOf(ITEMS[b.id].cat) || ITEMS[a.id].name.localeCompare(ITEMS[b.id].name));
}

function renderBag() {
    const st = calcStats(), w = invWeight();
    let h = `<div class="panel">${bar(w, st.weightMax, 'wt', `負重 ${Math.floor(w)} / ${st.weightMax}`)}
        <small class="muted">超過 50% 不會自然回復；點道具可裝備、使用或衝裝。</small></div>`;
    h += `<div class="chips">${BAG_FILTERS.map(([id, n]) => `<button class="chip-btn ${bagFilter === id ? 'active' : ''}" onclick="setBagFilter('${id}')">${n}</button>`).join('')}</div>`;
    const list = sortedInv(player.inv).filter(x => bagMatch(ITEMS[x.id]));
    h += `<div class="list">` + (list.map(x => `<button class="item-row" onclick="openItemDialog(${x.uid})">
            <span class="${itemClass(x)}">${esc(itemName(x))}</span><span class="muted">${x.n > 1 ? '×' + fmt(x.n) : ''}</span></button>`).join('')
        || '<p class="muted">沒有道具</p>') + `</div>`;
    return h;
}

function setBagFilter(f) { bagFilter = f; renderPanel(); }

function itemDescHtml(inst) {
    if (ITEMS[inst.id].cat === 'map') return mapDescHtml(inst);   // 異界地圖（maps.js）
    const d = ITEMS[inst.id], L = [], ench = inst.ench || 0;
    let kind = CAT_NAMES[d.cat];
    if (d.cat === 'weapon') kind = WEAPON_TYPES[d.type].name + (WEAPON_TYPES[d.type].two ? '（雙手）' : '');
    if (d.cat === 'armor') kind = SLOTS[d.slot === 'ring' ? 'ring1' : d.slot];
    L.push(`<small class="muted">${kind}</small>`);
    if (d.cat === 'weapon') {
        L.push(`傷害：小型 1～${d.dmg[0]}　大型 1～${d.dmg[1]}${ench ? `（強化 ${ench > 0 ? '+' : ''}${ench}）` : ''}`);
        L.push(`攻擊間隔：${(WEAPON_TYPES[d.type].spd / 1000).toFixed(2)} 秒`);
        if (d.hit) L.push(`命中 +${d.hit}`);
        if (d.sp) L.push(`SP +${d.sp}`);
        if (d.crit) L.push(`爆擊 +${Math.round(d.crit * 100)}%`);
        if (d.silver) L.push('銀製：對不死系額外傷害');
        if (d.dragon) L.push(`對龍族傷害 ×${d.dragon}`);
        if (WEAPON_TYPES[d.type].double) L.push(`雙擊率 ${WEAPON_TYPES[d.type].double * 100}%`);
        if (WEAPON_TYPES[d.type].ranged) L.push(`需要${WEAPON_TYPES[d.type].ammo === 'arrow' ? '箭' : '子彈'}`);
    }
    if (d.cat === 'armor') {
        const ac = (d.ac || 0) + (d.safe >= 0 ? ench : 0);
        if (ac) L.push(`AC ${ac > 0 ? '-' : '+'}${Math.abs(ac)}`);
        if (d.mr) L.push(`MR +${d.mr}`);
        if (d.sp) L.push(`SP +${d.sp}`);
        STAT_KEYS.forEach(k => { if (d[k]) L.push(`${STAT_NAMES[k]} +${d[k]}`); });
        if (d.hp) L.push(`HP +${d.hp}`);
        if (d.reduce) L.push(`減傷 ${d.reduce}`);
        if (d.haste) L.push('加速效果');
    }
    if (d.cat === 'weapon' || d.cat === 'armor') L.push(d.safe >= 0 ? `安定值 +${d.safe}` : '不可強化');
    if (d.heal) L.push(`回復 HP ${d.heal[0]}～${d.heal[1]}`);
    if (d.buff) L.push(`${BUFF_DEFS[d.buff].name}效果 ${d.sec / 60} 分鐘`);
    if (d.cat === 'ammo') L.push(`傷害 +${d.dmg}${d.silver ? '，對不死系額外傷害' : ''}`);
    if (d.classes) L.push(`限定：${d.classes.map(c => CLASSES[c].name).join('、')}`);
    if (d.desc) L.push(d.desc);
    if (inst.q) {   // 暗黑式詞綴
        L.push(`<b class="${QUALITY[inst.q].cls}">${QUALITY[inst.q].name}品質</b><small class="muted">（物品等級 ${inst.il || 1}）</small>`);
        for (const a of inst.af || []) L.push(`<span class="${a.lg ? 'q-legend' : 'q-magic'}">◆ ${affixText(a)}${a.lg ? '（傳說）' : ''}</span>`);
    }
    L.push(`<small class="muted">重量 ${d.wt}｜回收價 ${fmt(instSellPrice(inst))}</small>`);
    return L.join('<br>');
}

// ───────── 裝備比較（背包裝備 vs 裝備中）─────────
// 模擬「換上這件」後的 calcStats，和目前比較；戒指兩格都比；雙手武器會把盾卸下、盾會把雙手武器卸下（同 equipItem）
const COMPARE_ROWS = [
    ['avgS', '平均傷害（小型）', 1], ['avgL', '平均傷害（大型）', 1], ['atkMs', '攻擊間隔（秒）', -1, v => (v / 1000).toFixed(2)],
    ['hit', '命中', 1], ['crit', '爆擊', 1, v => Math.round(v * 100) + '%'], ['ac', 'AC（越低越好）', -1], ['mr', 'MR', 1],
    ['maxHp', 'HP 上限', 1], ['maxMp', 'MP 上限', 1], ['sp', 'SP', 1], ['reduce', '減傷', 1], ['dodge', '閃避', 1, v => Math.round(v * 100) + '%'],
    ['lifesteal', '吸血', 1, v => Math.round(v * 100) + '%'], ['hpRegen', '回血', 1], ['mpRegen', '回魔', 1],
    ['str', '力量', 1], ['dex', '敏捷', 1], ['con', '體質', 1], ['int', '智力', 1], ['wis', '精神', 1], ['weightMax', '負重上限', 1],
];
function compareStats() {
    const st = calcStats(), w = st.weapon;
    return { ...st, avgS: (w ? (1 + w.dmg[0]) / 2 : 1.5) + st.dmgBonus, avgL: (w ? (1 + w.dmg[1]) / 2 : 1.5) + st.dmgBonus };
}
// 把 inst 放進 slot 後算能力，算完還原（不改任何存檔資料）
function statsWithEquip(inst, slot) {
    const saved = { ...player.equip }, def = ITEMS[inst.id];
    try {
        if (slot === 'weapon' && WEAPON_TYPES[def.type].two) delete player.equip.shield;
        if (slot === 'shield' && player.equip.weapon && WEAPON_TYPES[ITEMS[player.equip.weapon.id].type].two) delete player.equip.weapon;
        player.equip[slot] = inst;
        return compareStats();
    } finally { player.equip = saved; }
}
function compareHtml(inst) {
    const def = ITEMS[inst.id];
    if (def.cat !== 'weapon' && def.cat !== 'armor') return '';
    const err = canEquip(def);
    if (err) return `<div class="cmp-box"><b>⚖️ 與裝備中比較</b><div class="bad">${esc(err)}，無法裝備</div></div>`;
    const slots = def.cat === 'weapon' ? ['weapon'] : def.slot === 'ring' ? ['ring1', 'ring2'] : [def.slot];
    const cur = compareStats();
    return slots.map(slot => {
        const old = player.equip[slot], next = statsWithEquip(inst, slot);
        const extra = [];
        if (slot === 'weapon' && WEAPON_TYPES[def.type].two && player.equip.shield) extra.push(`會卸下盾牌 ${itemName(player.equip.shield)}`);
        if (slot === 'shield' && player.equip.weapon && WEAPON_TYPES[ITEMS[player.equip.weapon.id].type].two) extra.push(`會卸下雙手武器 ${itemName(player.equip.weapon)}`);
        let better = 0, worse = 0;
        const rows = COMPARE_ROWS.map(([k, label, dir, f]) => {
            const a = cur[k] || 0, b = next[k] || 0, d = b - a;
            if (Math.abs(d) < 1e-9) return '';
            const good = d * dir > 0; good ? better++ : worse++;
            const show = f || (v => Number.isInteger(v) ? fmt(v) : v.toFixed(1));
            const ds = f ? (d > 0 ? '+' : '−') + f(Math.abs(d)) : (d > 0 ? '+' : '−') + show(Math.abs(d));
            return `<tr><td>${label}</td><td>${show(a)}</td><td>${show(b)}</td><td class="${good ? 'good' : 'bad'}">${good ? '▲' : '▼'} ${ds}</td></tr>`;
        }).join('');
        const verdict = !rows ? '<span class="muted">能力沒有變化</span>' : `<span class="good">▲ ${better} 項變好</span>　<span class="bad">▼ ${worse} 項變差</span>`;
        return `<div class="cmp-box"><b>⚖️ 與裝備中比較${slots.length > 1 ? `（${slot === 'ring1' ? '戒指 1' : '戒指 2'}）` : ''}</b>
            <div class="cmp-cur">目前：${old ? `<span class="${itemClass(old)}">${esc(itemName(old))}</span>` : '<span class="muted">（空）</span>'}</div>
            ${extra.map(t => `<div class="warn">⚠️ ${esc(t)}</div>`).join('')}
            <div>${verdict}</div>
            ${rows ? `<table class="cmp-tbl"><tr><th>項目</th><th>目前</th><th>換上後</th><th>差異</th></tr>${rows}</table>` : ''}
            ${old ? `<details class="cmp-old"><summary>查看裝備中的詳細</summary>${itemDescHtml(old)}</details>` : ''}</div>`;
    }).join('');
}

function openItemDialog(uid) {
    const inst = findAnyInst(uid);
    if (!inst) return;
    const d = ITEMS[inst.id], slot = slotOfEquipped(uid), btns = [];
    if (d.cat === 'weapon' || d.cat === 'armor') {
        btns.push(slot
            ? { text: '卸下', onClick: () => { unequipSlot(slot); saveGame(); refreshUI(); } }
            : { text: '裝備', onClick: () => { if (equipItem(uid)) showToast(`裝備了 ${itemName(inst)}`); saveGame(); refreshUI(); } });
        btns.push({ text: '🔮 改造', cls: 'secondary', onClick: () => openCraftDialog(uid) });
    }
    if (d.cat === 'map') {
        if (inTown() && !player.mapRun) btns.push({ text: '🌀 開啟', onClick: () => openMap(uid) });
        btns.push({ text: '🔮 改造', cls: 'secondary', onClick: () => openCraftDialog(uid) });
    }
    if (d.cat === 'currency') btns.push({ text: '選擇裝備', onClick: () => { bagFilter = 'gear'; switchTab('bag'); showToast('點一件裝備 →「🔮 改造」使用通貨'); } });
    if (d.cat === 'potion') btns.push({ text: '使用', onClick: () => { const e = usePotion(inst.id); if (e) showToast(e); refreshUI(); } });
    if (d.scroll === 'enchant') btns.push({ text: '選擇裝備', onClick: () => openEnchantPicker(uid) });
    if (d.scroll === 'home') btns.push({ text: '使用', onClick: () => { if (!currentZone()) showToast('你已經在村莊裡'); else useHomeScroll(''); } });
    if (d.cat === 'elixir') btns.push({ text: '使用', onClick: () => openElixirDialog() });
    if (!slot) btns.push({ text: '丟棄', cls: 'danger', onClick: () => gameConfirm('丟棄道具', `確定丟棄 ${itemName(inst)}${inst.n > 1 ? ' ×' + inst.n : ''}？丟掉就找不回來了。`, () => { removeInst(uid); saveGame(); refreshUI(); }, '丟棄') });
    btns.push({ text: '關閉', cls: 'secondary' });
    openDialog(itemName(inst) + (inst.n > 1 ? ` ×${fmt(inst.n)}` : ''), itemDescHtml(inst) + (slot ? '' : compareHtml(inst)), btns);
}

function openEnchantPicker(scrollUid) {
    const sc = findInv(scrollUid);
    if (!sc) return;
    const sd = ITEMS[sc.id];
    const rows = enchantTargets(sd).map(x => {
        const d = ITEMS[x.id], cur = x.ench || 0;
        const rate = sd.bless < 0 ? '必定 -1' : cur >= ENCHANT_MAX ? '已達上限' : cur < d.safe ? '安全' : `成功率 ${Math.round(enchantSuccessRate(cur, d.safe) * 100)}%`;
        return `<div class="list-row"><div><b class="${itemClass(x)}">${esc(itemName(x))}</b>${slotOfEquipped(x.uid) ? ' <small class="good">裝備中</small>' : ''}
            <small>安定值 +${d.safe}｜${rate}</small></div><button onclick="enchantPick(${scrollUid},${x.uid})">施法</button></div>`;
    }).join('');
    openDialog(sd.name, `<div class="list">${rows || '<p class="muted">沒有可以強化的裝備</p>'}</div>`, [{ text: '取消', cls: 'secondary' }]);
}

function enchantPick(scrollUid, targetUid) {
    const t = findAnyInst(targetUid), sc = findInv(scrollUid);
    if (!t || !sc) return;
    const d = ITEMS[t.id], sd = ITEMS[sc.id], cur = t.ench || 0;
    const go = () => {
        const r = doEnchant(scrollUid, targetUid);
        saveGame();
        refreshUI();
        gameAlert(r.gone ? '💥 蒸發了' : r.ok ? '✨ 衝裝結果' : '衝裝', r.msg);
    };
    closeDialog();
    if (sd.bless >= 0 && cur >= d.safe && cur < ENCHANT_MAX) {
        gameConfirm('⚠️ 超過安定值', `${itemName(t)} 已達安定值 +${d.safe}。\n成功率 ${Math.round(enchantSuccessRate(cur, d.safe) * 100)}%，失敗裝備會蒸發消失！\n確定要衝嗎？`, go, '衝了！');
    } else go();
}

function openElixirDialog() {
    const rows = STAT_KEYS.map(k => `<button class="secondary" onclick="useElixirBtn('${k}')">${STAT_NAMES[k]} ${player.stats[k]} → ${player.stats[k] + 1}</button>`).join('');
    openDialog('萬能藥', `<p>選擇要提升的能力（已使用 ${player.elixirs}/${ELIXIR_MAX}）</p><div class="grid2">${rows}</div>`, [{ text: '取消', cls: 'secondary' }]);
}
function useElixirBtn(k) { closeDialog(); useElixir(k); saveGame(); refreshUI(); }

// ───────── 技能 ─────────
const SKILL_TYPE_NAMES = { spell: '攻擊魔法', strike: '技能', heal: '治癒', buff: '增益', passive: '被動' };

function renderSkills() {
    const list = SKILLS[player.cls] || [];
    let h = `<div class="panel"><small class="muted">掛機時依序自動施放：治癒（HP 低於設定）→ 增益（效果結束時）→ 攻擊技能。可個別關閉。</small></div><div class="list">`;
    for (const s of list) {
        const learned = player.lv >= s.lv, on = player.settings.skills[s.id] !== false;
        const info = [`Lv.${s.lv}`, SKILL_TYPE_NAMES[s.type], s.mp ? `MP ${s.mp}` : '', s.cd ? `冷卻 ${s.cd} 秒` : '', s.sec ? `持續 ${s.sec / 60} 分` : ''].filter(Boolean).join('｜');
        const btn = !learned ? '<span class="muted">未學會</span>'
            : s.type === 'passive' ? '<span class="good">生效中</span>'
            : `<button class="${on ? '' : 'secondary'}" onclick="toggleSkill('${s.id}')">${on ? '自動：開' : '自動：關'}</button>`;
        h += `<div class="list-row ${learned ? '' : 'locked'}"><div><b>${s.name}</b><small>${info}</small><small>${s.desc}</small></div>${btn}</div>`;
    }
    return h + `</div>`;
}

function toggleSkill(id) {
    player.settings.skills[id] = player.settings.skills[id] === false;
    saveGame();
    renderPanel();
}

// ───────── 職業任務 ─────────
function renderQuest() {
    const st = CLASS_STORIES[player.cls], c = CLASSES[player.cls], list = questList(), s = questState();
    let h = `<div class="panel story"><div class="loc">${c.icon} ${c.name}的故事</div><p>${st.story}</p>
        <small class="muted">任務 NPC：${st.npc}（在任何村莊都找得到）</small>${questTitleEarned() ? `<p class="good">🏅 稱號：${st.title}</p>` : ''}</div>`;
    list.forEach((q, i) => {
        const head = `<div class="quest-head"><b>第 ${i + 1} 章　${q.title}</b><small class="muted">Lv.${q.lv}</small></div>`;
        const reward = `<small class="muted">獎勵：${ITEMS[q.reward.item].name}、${fmt(q.reward.gold)} 金幣${q.reward.elixir ? `、萬能藥 ×${q.reward.elixir}` : ''}</small>`;
        if (i < s.ch) { h += `<div class="quest-card done">${head}<p class="muted">${q.outro}</p></div>`; return; }
        if (i > s.ch) { h += `<div class="quest-card locked">${head}<small class="muted">🔒 完成上一章後開放</small></div>`; return; }
        let body = `<p>${st.npc}：${q.intro}</p><div class="quest-goal">🎯 ${questGoalText(q)}</div>${reward}`;
        if (player.lv < q.lv) body += `<div class="quest-act"><span class="bad">需要 Lv.${q.lv}（目前 Lv.${player.lv}）</span></div>`;
        else if (!s.active) body += `<div class="quest-act"><button onclick="acceptQuest()" ${inTown() ? '' : 'disabled'}>接受任務</button>${inTown() ? '' : '<small class="muted">回到村莊才能接任務</small>'}</div>`;
        else {
            const g = q.goal;
            let prog;
            if (g.type === 'boss') prog = s.bossDone ? '首領已討伐' : s.prog >= g.after ? `「${g.boss.name}」即將出現，繼續在${ZONE_BY_ID[g.zone].name}狩獵` : `擊倒魔物 ${s.prog}/${g.after}`;
            else prog = `進度 ${questProgress(q)}/${g.n}`;
            const pct = g.type === 'boss' ? (s.bossDone ? 100 : Math.min(99, s.prog / g.after * 99)) : questProgress(q) / g.n * 100;
            body += `<div class="quest-act">${bar(pct, 100, 'exp', prog)}</div>`;
            if (questReady(q)) body += `<div class="quest-act"><button onclick="turnInQuest()" ${inTown() ? '' : 'disabled'}>回報任務</button>${inTown() ? '' : '<small class="muted">回到村莊才能回報</small>'}</div>`;
        }
        h += `<div class="quest-card current">${head}${body}</div>`;
    });
    return h;
}

// ───────── 村莊 ─────────
const TOWN_SUBS = [['shop', '🏪 商店'], ['sell', '💰 回收'], ['storage', '📦 倉庫'], ['craft', '🔨 鍛造'], ['inn', '🛏️ 旅館']];

function renderTown() {
    if (!inTown()) {
        return `<div class="panel notice">目前在${zoneTitle()}，回到村莊才能使用商店、倉庫等設施。
            <div class="btn-row"><button onclick="homeScrollBtn()">📜 回家卷軸（${countItem('homeScroll')}）</button>
            <button class="secondary" onclick="walkHomeBtn();switchTab('hunt')">🚶 步行回村</button></div></div>`;
    }
    const t = currentTown();
    let h = `<div class="panel"><div class="loc">${t.icon} ${t.name}</div><small class="muted">村莊等級 ${t.tier}：越大的城鎮賣的東西越多。</small></div>`;
    h += `<div class="chips">${TOWN_SUBS.map(([id, n]) => `<button class="chip-btn ${townSub === id ? 'active' : ''}" onclick="setTownSub('${id}')">${n}</button>`).join('')}</div>`;
    return h + ({ shop: renderShop, sell: renderSell, storage: renderStorage, craft: renderCraft, inn: renderInn }[townSub])();
}

function setTownSub(s) { townSub = s; renderPanel(); }

function renderShop() {
    return `<div class="list">` + shopItemIds().map(id => {
        const d = ITEMS[id];
        const usable = !d.classes || d.classes.includes(player.cls);
        const qty = isStackable(d) ? [1, 10, 100] : [1];
        return `<div class="list-row ${usable ? '' : 'locked'}"><div onclick="shopInfo('${id}')" class="clickable"><b>${d.name}</b><small>💰 ${fmt(d.price)}｜${shortDesc(d)}</small></div>
            <div class="qty-btns">${qty.map(n => `<button class="mini" onclick="buyItem('${id}',${n})" ${player.gold < d.price * n ? 'disabled' : ''}>×${n}</button>`).join('')}</div></div>`;
    }).join('') + `</div>`;
}

function shortDesc(d) {
    if (d.cat === 'weapon') return `${WEAPON_TYPES[d.type].name} ${d.dmg[0]}/${d.dmg[1]}${d.sp ? ' SP+' + d.sp : ''}`;
    if (d.cat === 'armor') return `${SLOTS[d.slot === 'ring' ? 'ring1' : d.slot]}${d.ac ? ' AC-' + d.ac : ''}${d.mr ? ' MR+' + d.mr : ''}${d.hp ? ' HP+' + d.hp : ''}`;
    if (d.heal) return `回復 ${d.heal[0]}～${d.heal[1]}`;
    if (d.buff) return `${BUFF_DEFS[d.buff].name} ${d.sec / 60} 分`;
    return d.desc || CAT_NAMES[d.cat];
}

function shopInfo(id) { openDialog(ITEMS[id].name, itemDescHtml({ id, n: 1, ench: 0 }), [{ text: '關閉', cls: 'secondary' }]); }

// 一鍵賣出：背包裡品質低於 level 的一般貨裝備（沒強化、不含稀有基底的普通品質；規則同戰利品過濾）
function bulkSellList(level) { return player.inv.filter(x => lootFiltered(x, level) && !(x.ench > 0)); }
function bulkSellBtn(level) {
    const list = bulkSellList(level);
    if (!list.length) { showToast('沒有符合的裝備'); return; }
    const total = list.reduce((a, x) => a + instSellPrice(x) * x.n, 0);
    gameConfirm('一鍵賣出', `賣出 ${list.length} 件${level >= 2 ? '普通與魔法' : '普通'}裝備，共 💰${fmt(total)}？\n（已強化的裝備不會賣）`, () => {
        for (const x of list) removeInst(x.uid);
        player.gold += total;
        showToast(`賣出 ${list.length} 件（+${fmt(total)}）`);
        saveGame(); refreshUI();
    }, '賣出');
}

function renderSell() {
    const list = sortedInv(player.inv).filter(x => instSellPrice(x) > 0);
    const n1 = bulkSellList(1).length, n2 = bulkSellList(2).length;
    return `<div class="panel"><small class="muted">裝備中的道具不會出現在這裡。</small>
        <div class="btn-row"><button class="secondary" onclick="bulkSellBtn(1)" ${n1 ? '' : 'disabled'}>🪙 賣出普通裝備（${n1}）</button>
        <button class="secondary" onclick="bulkSellBtn(2)" ${n2 ? '' : 'disabled'}>🪙 賣出魔法以下（${n2}）</button></div></div><div class="list">` + (list.map(x =>
        `<div class="list-row"><div><b class="${itemClass(x)}">${esc(itemName(x))}</b>${x.n > 1 ? ` ×${fmt(x.n)}` : ''}<small>單價 💰${fmt(instSellPrice(x))}</small></div>
        <div class="qty-btns">${x.n > 1 ? `<button class="mini secondary" onclick="sellBtn(${x.uid},false)">賣 1</button>` : ''}<button class="mini" onclick="sellBtn(${x.uid},true)">${x.n > 1 ? '全部' : '賣出'}</button></div></div>`).join('')
        || '<p class="muted">沒有可以賣的東西</p>') + `</div>`;
}

function sellBtn(uid, all) {
    const it = findInv(uid);
    if (!it) return;
    const valuable = (it.ench || 0) > 0 || !!it.q || instSellPrice(it) >= 5000;
    if (valuable) gameConfirm('確認賣出', `確定賣出 ${itemName(it)}${all && it.n > 1 ? ' ×' + it.n : ''}？`, () => sellItem(uid, all), '賣出');
    else sellItem(uid, all);
}

function renderStorage() {
    const row = (x, btn) => `<div class="list-row"><div><b class="${itemClass(x)}">${esc(itemName(x))}</b>${x.n > 1 ? ` ×${fmt(x.n)}` : ''}</div>${btn}</div>`;
    const inv = sortedInv(player.inv).map(x => row(x, `<button class="mini" onclick="depositItem(${x.uid})">存入</button>`)).join('') || '<p class="muted">背包是空的</p>';
    const sto = sortedInv(player.storage).map(x => row(x, `<button class="mini" onclick="withdrawItem(${x.uid})">取出</button>`)).join('') || '<p class="muted">倉庫是空的</p>';
    return `<h4>📦 倉庫（${player.storage.length} 格）</h4><div class="list">${sto}</div><h4>🎒 背包</h4><div class="list">${inv}</div>`;
}

function renderCraft() {
    return `<div class="list">` + RECIPES.map((r, i) => {
        const miss = recipeMissing(r);
        const need = Object.keys(r.need).map(id => `${ITEMS[id].name}×${r.need[id]}`).join('、');
        return `<div class="list-row"><div><b class="rare-item clickable" onclick="shopInfo('${r.out}')">${ITEMS[r.out].name}</b>
            <small>材料：${need}＋💰${fmt(r.gold)}</small>${miss.length ? `<small class="bad">缺少：${miss.join('、')}</small>` : ''}</div>
            <button onclick="craftItem(${i})" ${miss.length ? 'disabled' : ''}>鍛造</button></div>`;
    }).join('') + `</div>`;
}

function renderInn() {
    return `<div class="panel"><p>住一晚可以讓 HP、MP 全滿。</p><button onclick="innRest()">🛏️ 休息（💰${fmt(innPrice())}）</button></div>`;
}

// ───────── 設定 ─────────
function renderSettings() {
    const s = player.settings;
    const num = (key, label, min, max) => `<label class="set-row"><span>${label}</span><input type="number" min="${min}" max="${max}" value="${s[key]}" onchange="setSettingNum('${key}',this.value,${min},${max})"></label>`;
    const chk = (key, label) => `<label class="set-row"><span>${label}</span><input type="checkbox" ${s[key] ? 'checked' : ''} onchange="setSettingBool('${key}',this.checked)"></label>`;
    const modes = Object.keys(DISPLAY_MODES).map(m =>
        `<button class="${displayMode === m ? '' : 'secondary'}" onclick="setDisplayMode('${m}')">${DISPLAY_MODE_ICONS[m]} ${DISPLAY_MODES[m]}</button>`).join('');
    return `<div class="panel"><h4>🖥️ 畫面尺寸</h4>
            <div class="grid2">${modes}</div>
            <small class="muted">這台裝置的顯示設定，不影響存檔。PC 16:9 時，狩獵固定在左邊外框，其他頁面顯示在右側。</small>
        </div>
        <div class="panel"><h4>💊 自動補給</h4>
            ${chk('potionOn', '自動喝治癒藥水')}${num('potionPct', 'HP 低於 % 喝水', 5, 95)}
            ${num('healPct', 'HP 低於 % 施放治癒魔法', 5, 95)}
            ${chk('autoHaste', '自動喝綠水（加速）')}${chk('autoBrave', '自動喝勇水／精靈餅乾／慎重藥水')}${chk('autoBlue', '自動喝藍水')}${chk('autoDodge', '首領大招自動閃避（走出紅圈）')}
        </div>
        <div class="panel"><h4>🎒 戰利品過濾</h4>
            <label class="set-row"><span>撿到裝備時</span><select onchange="setSettingNum('lootFilter',this.value,0,3)">
                ${LOOT_FILTERS.map((n, i) => `<option value="${i}" ${s.lootFilter === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <small class="muted">被過濾的裝備會直接換成金幣，不進背包、不佔負重。武士刀、屠龍劍這類商店沒賣的稀有裝備一律保留。</small>
        </div>
        <div class="panel"><h4>🛡️ 安全</h4>
            ${chk('teleOn', '危險時自動使用瞬間移動卷軸')}${num('telePct', 'HP 低於 % 瞬移', 5, 90)}
            ${chk('autoHome', '藥水／彈藥用完或負重過高時自動回家')}${num('weightPct', '負重超過 % 回家', 30, 100)}
        </div>
        <div class="panel"><h4>📲 App</h4>
            <div class="btn-row"><button onclick="openInstallGuide()">📲 安裝到主畫面</button></div>
            <small class="muted">安裝後有自己的圖示、全螢幕開啟，沒網路也能玩。</small>
        </div>
        <div class="panel"><h4>💾 存檔</h4>
            <div class="btn-row">
                <button onclick="manualSave()">手動存檔</button>
                <button class="secondary" onclick="openExport()">匯出存檔</button>
                <button class="secondary" onclick="openImport()">匯入存檔</button>
            </div>
            <div class="btn-row">
                <button class="secondary" onclick="backToTitle()">回標題畫面</button>
                <button class="danger" onclick="confirmDeleteChar()">刪除角色</button>
            </div>
            <small class="muted">${GAME_TITLE} v${GAME_VERSION}</small>
        </div>`;
}

function setSettingNum(key, v, min, max) { player.settings[key] = clamp(parseInt(v, 10) || min, min, max); saveGame(); }
function setSettingBool(key, v) { player.settings[key] = !!v; saveGame(); }
function manualSave() { saveGame(); showToast('已存檔'); }

function openExport() {
    openDialog('匯出存檔', `<p>複製下面的文字保存，換裝置時用「匯入存檔」貼上。</p><textarea id="export-text" readonly>${exportSaveText()}</textarea>`,
        [{ text: '複製', keep: true, onClick: copyExport }, { text: '關閉', cls: 'secondary' }]);
}
function copyExport() {
    const ta = $('export-text');
    ta.select();
    try { navigator.clipboard.writeText(ta.value).then(() => showToast('已複製')); } catch (e) { document.execCommand('copy'); showToast('已複製'); }
}
function openImport() {
    openDialog('匯入存檔', `<p>貼上匯出的存檔文字（會覆蓋目前角色）。</p><textarea id="import-text"></textarea>`,
        [{ text: '取消', cls: 'secondary' }, { text: '匯入', keep: true, onClick: doImport }]);
}
function doImport() {
    const text = $('import-text').value;
    hunt = null; session = null; walkHome = null;
    if (importSaveText(text)) { closeDialog(); showToast('匯入成功'); enterGame(); }
    else showToast('存檔文字無效');
}

function backToTitle() {
    saveGame();
    hunt = null; session = null; walkHome = null;
    player = null;
    showTitle();
}

function confirmDeleteChar() {
    gameConfirm('刪除角色', '角色與所有道具會永久刪除，無法復原！\n建議先「匯出存檔」備份。確定刪除？', () => {
        deleteSave();
        hunt = null; session = null; walkHome = null;
        player = null;
        showTitle();
    }, '永久刪除');
}
