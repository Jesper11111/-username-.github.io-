// 天星賭坊：賭星隕石、擲骰比大小、每日上限、紀錄、稱號條件（ARCHITECTURE.md 第 40 節）；數值在 config-casino.js
// 入口：天星城坊市的石拱門（config-towns.js 的傳送點 → openCasinoModal）
// 存檔欄位 player.casino：
//   今日（跨日重置）date／wagered 已下注／net 估值輸贏／bestText、bestValue 今日最大收穫
//   累計 stones 切石顆數／rolls 擲骰次數／fires 切出整朵異火次數／triples 押中指定豹子次數／maxDiceWin 單把最大淨贏

let casinoTab = 'stone';
let casinoBusy = false;          // 切石／擲骰演出中，避免連點
let casinoResultHtml = '';       // 最近一次結果（重繪視窗時保留）
const casinoDice = { type: 'big', pick: 6, total: 10, amount: 10000 };

function getCasinoState() {
    let today = new Date(gameNow()).toDateString();
    if (!player.casino || typeof player.casino !== 'object') player.casino = {};
    let c = player.casino;
    if (c.date !== today) { c.date = today; c.wagered = 0; c.net = 0; c.bestText = ''; c.bestValue = 0; }
    ['stones', 'rolls', 'fires', 'triples', 'maxDiceWin'].forEach(k => { c[k] = c[k] || 0; });
    return c;
}

function getCasinoDailyLimit() {
    return CASINO_DAILY_LIMIT_BY_REALM[Math.min(player.realmIndex, CASINO_DAILY_LIMIT_BY_REALM.length - 1)];
}

function getCasinoRemaining() {
    return Math.max(0, getCasinoDailyLimit() - getCasinoState().wagered);
}

function getDiceMaxBet() {
    return Math.floor(getCasinoDailyLimit() * CASINO_DICE_MAX_RATIO);
}

function isInCasinoTown() {
    return !!player.currentMap && player.currentMap.name === CASINO_TOWN;
}

// 花費前的共用檢查：人在天星城、靈石足夠、未超過每日上限、大額二次確認
async function checkCasinoSpend(amount, what) {
    if (!isInCasinoTown()) { gameAlert(`天星賭坊只在【${CASINO_TOWN}】營業。`); return false; }
    if (player.coins < amount) { gameAlert(`靈石不足！${what}需要 ${amount.toWan()} 靈石（目前 ${player.coins.toWan()}）。`); return false; }
    if (amount > getCasinoRemaining()) {
        gameAlert(`已接近今日下注上限！\n今日上限 ${getCasinoDailyLimit().toWan()}（依境界），還能下注 ${getCasinoRemaining().toWan()} 靈石。\n明天再來，或提升境界提高上限。`);
        return false;
    }
    if (amount >= player.coins * CASINO_CONFIRM_RATIO &&
        !(await gameConfirm(`⚠️ ${what}要花費 ${amount.toWan()} 靈石，佔你目前靈石的 ${Math.round(amount / player.coins * 100)}%。\n確定要下注嗎？`))) return false;
    return true;
}

function recordCasino(spent, gainValue, bestText) {
    let c = getCasinoState();
    c.wagered += spent;
    c.net += gainValue - spent;
    if (bestText && gainValue > c.bestValue) { c.bestValue = gainValue; c.bestText = bestText; }
}

// ==================== 賭星隕石 ====================
function randCasino(range) {
    return range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
}

function rollStoneOutcome(stone) {
    let total = stone.odds.reduce((s, o) => s + o.w, 0);
    let r = Math.random() * total;
    for (let o of stone.odds) { r -= o.w; if (r < 0) return o; }
    return stone.odds[stone.odds.length - 1];
}

// 發放一次切石結果，回傳 { text（HTML）, plain, value 估值, rare }
function grantStoneOutcome(o) {
    let n = o.amount ? randCasino(o.amount) : 0;
    switch (o.type) {
        case 'waste':
            return { text: '💨 滿刀廢料，只是一塊頑石', plain: '廢石', value: 0 };
        case 'coins':
            player.coins += n;
            return { text: `💰 石中夾著靈石 ×${n.toWan()}`, plain: `靈石 ×${n.toWan()}`, value: n };
        case 'shards':
            addIronShards(n);
            return { text: `🔩 碎鐵 ×${n}`, plain: `碎鐵 ×${n}`, value: n * CASINO_VALUE.shards };
        case 'ore':
            player.ore = (player.ore || 0) + n;
            return { text: `⛏️ 礦石 ×${n}`, plain: `礦石 ×${n}`, value: n * CASINO_VALUE.ore };
        case 'iron': {
            let got = addStarIron(n);   // 套用「尋鐵」特效（enhance.js）
            return { text: `🌠 ${o.big ? '星允鐵礦脈！' : ''}星允鐵 ×${got}`, plain: `星允鐵 ×${got}`, value: got * CASINO_VALUE.iron, rare: !!o.big };
        }
        case 'fireShards':
            addFireShards(n);
            return { text: `🔥 異火碎片 ×${n}`, plain: `異火碎片 ×${n}`, value: n * CASINO_VALUE.fireShards };
        case 'gear': {
            let msg = tryLootDrop(o.quality === '橙色' ? 'casinoOrange' : 'casinoPurple');   // gear.js，背包滿走暫存區規則
            return { text: `✨ 石中藏寶！${msg.replace(/^🎁 奪得/, '')}`, plain: `${o.quality}裝備`, value: CASINO_VALUE.gear[o.quality] || 0, rare: o.quality === '橙色' };
        }
        case 'fire': {
            let fire = rollStrangeFire();
            let isNew = gainStrangeFire(fire);
            player.strangeFires = (player.strangeFires || 0) + 1;
            getCasinoState().fires++;
            return { text: `☄️ 天地異象！石中孕育一朵【${fire.tier}・${fire.name}】${isNew ? '（新收錄！）' : ''}`, plain: `整朵異火【${fire.name}】`, value: CASINO_VALUE.fire, rare: true };
        }
    }
    return { text: '？', plain: '？', value: 0 };
}

async function cutStone(stoneId, count) {
    if (casinoBusy) return;
    let stone = casinoStones.find(s => s.id === stoneId);
    if (!stone) return;
    let cost = stone.price * count;
    if (!(await checkCasinoSpend(cost, `購買 ${count} 顆${stone.name}`))) return;

    player.coins -= cost;
    let results = [];
    for (let i = 0; i < count; i++) results.push(grantStoneOutcome(rollStoneOutcome(stone)));
    let st = getCasinoState();
    st.stones += count;
    let gain = results.reduce((s, r) => s + r.value, 0);
    let best = results.reduce((b, r) => r.value > b.value ? r : b, results[0]);
    recordCasino(cost, gain, best.value > 0 ? `${stone.name}：${best.plain}` : '');

    let summary = count === 1 ? results[0].plain : results.map(r => r.plain).join('、');
    addLog(`☄️ 天星賭坊切開 ${count} 顆${stone.name}（${cost.toWan()} 靈石）：${summary}`, results.some(r => r.rare) ? "level-up" : "system", false, "item");
    checkTitleUnlocks();
    updateUI();

    let listHtml = results.map(r => `<div class="casino-line${r.rare ? ' rare' : r.value === 0 ? ' waste' : ''}">${r.text}</div>`).join('');
    let footer = `<div class="casino-sum">花費 ${cost.toWan()}｜估值 ${gain.toWan()}（${gain >= cost ? '<b style="color:#4ade80;">賺</b>' : '<b style="color:#f87171;">虧</b>'} ${Math.abs(gain - cost).toWan()}）</div>`;
    if (count > 1) { casinoResultHtml = listHtml + footer; renderCasino(); return; }

    // 單顆：分段演出切石過程
    casinoBusy = true;
    let steps = CASINO_CUT_LINES.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    let shown = [`${stone.icon} 你挑了一顆${stone.name}，交給切石師傅……`];
    const box = () => document.getElementById('casino-result');
    const draw = () => { casinoResultHtml = shown.map(t => `<div class="casino-line dim">${t}</div>`).join(''); if (box()) box().innerHTML = casinoResultHtml; };
    draw();
    steps.forEach((t, i) => setTimeout(() => { shown.push(t); draw(); }, 450 * (i + 1)));
    setTimeout(() => {
        casinoResultHtml = shown.map(t => `<div class="casino-line dim">${t}</div>`).join('') + listHtml + footer;
        casinoBusy = false;
        renderCasino();
    }, 450 * (steps.length + 1));
}

// ==================== 擲骰比大小 ====================
function setDiceType(t) { casinoDice.type = t; renderCasino(); }
function setDicePick(n) { casinoDice.pick = n; renderCasino(); }
function setDiceTotal(n) { casinoDice.total = n; renderCasino(); }
function setDiceAmount(v) {
    let n = Math.floor(Number(v) || 0);
    casinoDice.amount = Math.max(0, Math.min(n, getDiceMaxBet()));
    renderCasino();
}
function addDiceAmount(n) { setDiceAmount(casinoDice.amount + n); }
function setDiceMax() { setDiceAmount(Math.min(getDiceMaxBet(), getCasinoRemaining(), player.coins)); }

function getDicePayout() {
    let b = CASINO_DICE_BETS[casinoDice.type];
    return casinoDice.type === 'total' ? CASINO_TOTAL_PAYOUT[casinoDice.total] : b.payout;
}

function describeDiceBet() {
    let t = casinoDice.type;
    if (t === 'triple') return `指定豹子 ${CASINO_DICE_FACES[casinoDice.pick - 1]}×3`;
    if (t === 'total') return `總點 ${casinoDice.total}`;
    return CASINO_DICE_BETS[t].name;
}

function judgeDice(d) {
    let sum = d[0] + d[1] + d[2];
    let triple = d[0] === d[1] && d[1] === d[2];
    switch (casinoDice.type) {
        case 'big': return !triple && sum >= 11;
        case 'small': return !triple && sum <= 10;
        case 'anyTriple': return triple;
        case 'triple': return triple && d[0] === casinoDice.pick;
        case 'total': return sum === casinoDice.total;
    }
    return false;
}

async function rollDice() {
    if (casinoBusy) return;
    let bet = casinoDice.amount;
    if (bet < CASINO_DICE_MIN_BET) { gameAlert(`最低押注 ${CASINO_DICE_MIN_BET.toWan()} 靈石。`); return; }
    if (bet > getDiceMaxBet()) { gameAlert(`單把最多押 ${getDiceMaxBet().toWan()} 靈石（每日上限的 ${Math.round(CASINO_DICE_MAX_RATIO * 100)}%）。`); return; }
    if (!(await checkCasinoSpend(bet, `押【${describeDiceBet()}】`))) return;

    player.coins -= bet;
    let dice = [0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6));
    let win = judgeDice(dice);
    let payout = getDicePayout();
    let back = win ? bet * (payout + 1) : 0;
    player.coins += back;
    let st = getCasinoState();
    st.rolls++;
    if (win && casinoDice.type === 'triple') st.triples++;
    if (win) st.maxDiceWin = Math.max(st.maxDiceWin, back - bet);
    recordCasino(bet, back, win ? `擲骰【${describeDiceBet()}】贏 ${(back - bet).toWan()}` : '');
    let sum = dice[0] + dice[1] + dice[2];
    let faces = dice.map(n => CASINO_DICE_FACES[n - 1]).join(' ');
    addLog(`🎲 天星賭坊擲骰 ${faces}（${sum} 點）：押【${describeDiceBet()}】${bet.toWan()} → ${win ? `贏 ${(back - bet).toWan()} 靈石！` : '輸了。'}`, win ? "level-up" : "system");
    checkTitleUnlocks();
    updateUI();

    // 骰子滾動演出
    casinoBusy = true;
    let frame = 0;
    const box = () => document.getElementById('casino-result');
    let timer = setInterval(() => {
        frame++;
        let fake = [0, 0, 0].map(() => CASINO_DICE_FACES[Math.floor(Math.random() * 6)]).join(' ');
        casinoResultHtml = `<div class="casino-dice rolling">${fake}</div>`;
        if (box()) box().innerHTML = casinoResultHtml;
        if (frame >= 8) {
            clearInterval(timer);
            let triple = dice[0] === dice[1] && dice[1] === dice[2];
            casinoResultHtml = `<div class="casino-dice">${faces}</div>
                <div class="casino-line">${sum} 點${triple ? '（豹子！）' : sum >= 11 ? '（大）' : '（小）'}｜押【${describeDiceBet()}】${bet.toWan()}</div>
                <div class="casino-line ${win ? 'rare' : 'waste'}">${win ? `🎉 贏了！拿回 ${back.toWan()}（淨贏 ${(back - bet).toWan()}）` : `💸 莊家通殺，輸 ${bet.toWan()}`}</div>`;
            casinoBusy = false;
            renderCasino();
        }
    }, 70);
}

// ==================== 視窗 ====================
function openCasinoModal(tab) {
    if (!isInCasinoTown()) { gameAlert(`天星賭坊只在【${CASINO_TOWN}】營業。`); return; }
    if (tab) casinoTab = tab;
    casinoResultHtml = '';
    document.getElementById('casino-modal').style.display = 'flex';
    renderCasino();
}

function setCasinoTab(t) { casinoTab = t; casinoResultHtml = ''; renderCasino(); }

function renderCasino() {
    const box = document.getElementById('casino-container');
    if (!box || document.getElementById('casino-modal').style.display !== 'flex') return;
    let st = getCasinoState();
    let limit = getCasinoDailyLimit();
    let tabs = [['stone', '☄️ 賭星隕石'], ['dice', '🎲 擲骰比大小'], ['record', '📜 紀錄']]
        .map(([k, l]) => `<button class="codex-tab${casinoTab === k ? ' active' : ''}" onclick="setCasinoTab('${k}')">${l}</button>`).join('');
    let head = `<p class="casino-head">持有靈石 <b>${player.coins.toWan()}</b>｜今日已下注 ${st.wagered.toWan()} / ${limit.toWan()}
        <br><small>今日輸贏（估值）<b style="color: ${st.net >= 0 ? '#4ade80' : '#f87171'};">${st.net >= 0 ? '+' : ''}${st.net.toWan()}</b>${st.bestText ? `｜今日最大收穫：${st.bestText}` : ''}</small></p>`;
    let body = casinoTab === 'dice' ? renderCasinoDice() : casinoTab === 'record' ? renderCasinoRecord() : renderCasinoStones();
    box.innerHTML = `${head}<div class="codex-tabs">${tabs}</div>${body}
        ${casinoTab !== 'record' ? `<div id="casino-result" class="casino-result">${casinoResultHtml || '<div class="casino-line dim">（結果會顯示在這裡）</div>'}</div>` : ''}`;
}

function renderCasinoStones() {
    let remain = getCasinoRemaining();
    return `<div class="grid-container">${casinoStones.map(s => {
        let can1 = player.coins >= s.price && remain >= s.price;
        let can10 = player.coins >= s.price * 10 && remain >= s.price * 10;
        let table = s.odds.map(o => {
            let label = { waste: '廢石', coins: '靈石', shards: '碎鐵', ore: '礦石', iron: o.big ? '星允鐵礦脈' : '星允鐵', fireShards: '異火碎片', gear: `${o.quality}裝備`, fire: '整朵異火' }[o.type];
            return `<span>${label}${o.amount ? ` ${o.amount[0].toWan()}～${o.amount[1].toWan()}` : ''} <b>${o.w}%</b></span>`;
        }).join('');
        return `<div class="card casino-stone">
            <h3>${s.icon} ${s.name}</h3>
            <p style="font-size: 0.8em; color: #9ca3af;">${s.desc}</p>
            <p style="color: var(--accent);">每顆 ${s.price.toWan()} 靈石</p>
            <div class="casino-odds">${table}</div>
            <div class="batch-btns">
                <button class="sys-btn" ${can1 ? '' : 'disabled'} onclick="cutStone('${s.id}', 1)">切 1 顆</button>
                <button class="sys-btn" ${can10 ? '' : 'disabled'} onclick="cutStone('${s.id}', 10)">切 10 顆</button>
            </div>
        </div>`;
    }).join('')}</div>`;
}

function renderCasinoDice() {
    let t = casinoDice.type;
    let types = Object.keys(CASINO_DICE_BETS).map(k => {
        let b = CASINO_DICE_BETS[k];
        let p = k === 'total' ? '依點數' : `1 賠 ${b.payout}`;
        return `<button class="casino-bet${t === k ? ' active' : ''}" onclick="setDiceType('${k}')"><b>${b.name}</b><small>${b.desc}｜${p}</small></button>`;
    }).join('');
    let extra = '';
    if (t === 'triple') {
        extra = `<div class="casino-picks">${[1, 2, 3, 4, 5, 6].map(n =>
            `<button class="casino-pick${casinoDice.pick === n ? ' active' : ''}" onclick="setDicePick(${n})">${CASINO_DICE_FACES[n - 1]}</button>`).join('')}</div>`;
    } else if (t === 'total') {
        extra = `<div class="casino-picks">${Object.keys(CASINO_TOTAL_PAYOUT).map(n =>
            `<button class="casino-pick${casinoDice.total === +n ? ' active' : ''}" onclick="setDiceTotal(${n})">${n}<small>賠${CASINO_TOTAL_PAYOUT[n]}</small></button>`).join('')}</div>`;
    }
    let max = getDiceMaxBet();
    let chips = [10000, 100000, 1000000, 10000000].filter(c => c <= max)
        .map(c => `<button class="sys-btn" onclick="addDiceAmount(${c})">+${c >= 10000000 ? c / 10000000 + '千萬' : c >= 10000 ? c / 10000 + '萬' : c}</button>`).join('');
    let payout = getDicePayout();
    return `<div class="casino-bets">${types}</div>${extra}
        <div class="casino-amount">
            <label>押注靈石 <input type="number" min="0" step="1000" value="${casinoDice.amount}" onchange="setDiceAmount(this.value)"></label>
            <div class="casino-chips">${chips}<button class="sys-btn" onclick="setDiceMax()">上限</button><button class="sys-btn" onclick="setDiceAmount(0)">清除</button></div>
            <small>單把 ${CASINO_DICE_MIN_BET.toWan()}～${max.toWan()}｜押【${describeDiceBet()}】中了拿回 ${(casinoDice.amount * (payout + 1)).toWan()}</small>
        </div>
        <button class="sys-btn casino-roll" onclick="rollDice()">🎲 擲骰！</button>`;
}

function renderCasinoRecord() {
    let st = getCasinoState();
    let rows = [
        ['今日已下注', `${st.wagered.toWan()} / ${getCasinoDailyLimit().toWan()}（依境界，每天 0 點重置）`],
        ['今日輸贏（估值）', `${st.net >= 0 ? '+' : ''}${st.net.toWan()}`],
        ['今日最大收穫', st.bestText || '—'],
        ['累計切石', `${st.stones.toWan()} 顆`],
        ['切出整朵異火', `${st.fires} 次`],
        ['累計擲骰', `${st.rolls.toWan()} 把`],
        ['押中指定豹子', `${st.triples} 次`],
        ['擲骰單把最大淨贏', st.maxDiceWin.toWan()]
    ];
    let titles = titleList.filter(t => t.cond.type.startsWith('casino')).map(t => {
        let has = (player.titles || []).includes(t.id);
        return `<div class="casino-line${has ? ' rare' : ' dim'}">${has ? '🏅' : '🔒'} 【${t.name}】${describeTitleCondition(t.cond)}｜${describeTitleBonus(t.bonus)}</div>`;
    }).join('');
    return `<table class="casino-table">${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</table>
        <h4 style="color: var(--accent); margin: 14px 0 6px;">賭運稱號</h4>${titles}
        <p style="font-size: 0.75em; color: #6b7280;">※ 輸贏以估值計算：星允鐵 ${CASINO_VALUE.iron.toWan()}／顆、異火碎片 ${CASINO_VALUE.fireShards.toWan()}／片、紫裝 ${CASINO_VALUE.gear['紫色'].toWan()}、橙裝 ${CASINO_VALUE.gear['橙色'].toWan()}、整朵異火 ${CASINO_VALUE.fire.toWan()}。</p>`;
}
