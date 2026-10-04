// ==================== 隱藏仙翁的兩個小遊戲（第 74 節「青瀾島」；2026-10-04 使用者指定）====================
// 「與仙翁對話出現兩個遊戲：仙翁釣魚、玲瓏棋局（五子棋）難度困難」
//   仙翁釣魚：選了先播開場動畫（videos/xianweng-fishing.mp4，保留音效、可略過）→ 釣魚畫面；每天 3 竿，釣到各種材料，
//            最高等的魚（金鱗仙鯉）20% 再掉金木水火土傳送陣靈石其中一種 1 顆
//   玲瓏棋局：五子棋 15 路，玩家執黑先手、仙翁困難 AI；每天 3 盤；贏 40% 得傳送陣靈石其中一種 1 顆，輸沒有懲罰（機緣未到）
//   設定 config-towns.js 的 XIANWENG_GAMES；每天次數 player.xianweng = { date, fish, chess }（用到才建立）
//   進入點：town-npc.js 的 xianwengChoose('fishing'|'gomoku')；玩完回到仙翁對話（仙翁還在的話）

function getXianwengDaily() {
    const t = todayKey();
    if (!player.xianweng || typeof player.xianweng !== 'object' || player.xianweng.date !== t) player.xianweng = { date: t, fish: 0, chess: 0 };
    return player.xianweng;
}
function xianwengFishLeft() { return Math.max(0, XIANWENG_GAMES.fishCasts - (getXianwengDaily().fish || 0)); }
function xianwengChessLeft() { return Math.max(0, XIANWENG_GAMES.chessGames - (getXianwengDaily().chess || 0)); }

// 隨機一種傳送陣靈石 1 顆，回傳文字
function grantXianwengStone() {
    const k = LINGJIE_STONE_KEYS[Math.floor(Math.random() * LINGJIE_STONE_KEYS.length)];
    addLingStone(k, 1);
    return `💎 ${k}屬性傳送陣靈石 ×1`;
}

// 玩完一個遊戲：仙翁還在就回到對話
function backToXianweng(sceneName) {
    if (sceneName && townNpcSpots[sceneName]) talkToXianweng(sceneName);
}

// ---------------- 開場動畫 ----------------
let xwIntroThen = null;
function playXianwengIntro(then) {
    const box = document.getElementById('xw-intro'), v = document.getElementById('xw-intro-video');
    xwIntroThen = then;
    if (!box || !v) { finishXianwengIntro(); return; }
    box.style.display = 'flex';
    v.onended = finishXianwengIntro;
    v.onerror = finishXianwengIntro;
    if (!v.getAttribute('src')) v.src = XIANWENG_GAMES.introVideo;
    v.currentTime = 0;
    v.muted = false;
    const p = v.play();
    // 瀏覽器不讓有聲自動播放時改成靜音播
    if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(finishXianwengIntro); });
}
function finishXianwengIntro() {
    const box = document.getElementById('xw-intro'), v = document.getElementById('xw-intro-video');
    if (v) { v.onended = null; v.onerror = null; try { v.pause(); } catch (e) {} }
    if (box) box.style.display = 'none';
    const then = xwIntroThen;
    xwIntroThen = null;
    if (then) then();
}

// ---------------- 仙翁釣魚 ----------------
// 流程：拋竿 → 靜待（1.5～4.5 秒）→ 浮標下沉，biteWindowMs 內按「收竿」→ 收線：按住讓綠框上升、放開下沉，框住亂竄的魚讓進度條滿＝釣到；進度歸零＝魚跑了
let xwFish = null;
function openXianwengFishing(sceneName) {
    xwFish = { scene: sceneName, phase: 'idle', caught: [], timers: [] };
    initXianwengFishControls();
    document.getElementById('xw-fish-catch').innerHTML = '';
    setXianwengFishSay('仙翁將釣竿遞給你：「心急釣不得好魚。浮標一沉，便是收竿之時。」');
    setXianwengFishPhase('idle');
    document.getElementById('xw-fish-modal').style.display = 'flex';
}
function setXianwengFishSay(t) { document.getElementById('xw-fish-say').innerText = t; }
function clearXianwengFishTimers() {
    if (!xwFish) return;
    xwFish.timers.forEach(clearTimeout);
    xwFish.timers = [];
    if (xwFish.raf) cancelAnimationFrame(xwFish.raf);
    xwFish.raf = 0;
}
function setXianwengFishPhase(phase) {
    xwFish.phase = phase;
    const modal = document.getElementById('xw-fish-modal'), btn = document.getElementById('xw-fish-btn');
    modal.dataset.phase = phase;
    const left = xianwengFishLeft();
    document.getElementById('xw-fish-left').innerText = `今日剩 ${left} / ${XIANWENG_GAMES.fishCasts} 竿`;
    btn.disabled = false;
    if (phase === 'idle') {
        btn.innerText = left > 0 ? '🎣 拋竿' : '今日竿數已盡';
        btn.disabled = left <= 0;
    } else if (phase === 'wait') { btn.innerText = '靜待魚兒上鉤……'; btn.disabled = true; }
    else if (phase === 'bite') btn.innerText = '❗ 收竿！';
    else if (phase === 'reel') btn.innerText = '按住收線';
}
// 按鈕 click：拋竿、收竿（收線用按住，見 initXianwengFishControls）
function xianwengFishAction() {
    if (!xwFish) return;
    // 收線時一直按著，魚釣起來的瞬間放開也會算一次 click：剛結束 700ms 內不接受拋竿
    if (xwFish.phase === 'idle') { if (Date.now() - (xwFish.idleAt || 0) > 700) xianwengCast(); }
    else if (xwFish.phase === 'bite') xianwengHook();
}
function xianwengCast() {
    if (xianwengFishLeft() <= 0) return;
    const d = getXianwengDaily();
    d.fish = (d.fish || 0) + 1;   // 拋竿就算一竿（中途關掉也算）
    saveLocal();
    setXianwengFishPhase('wait');
    setXianwengFishSay('你屏息凝神，看著浮標在水面輕輕起伏……');
    const wait = 1500 + Math.random() * 3000;
    xwFish.timers.push(setTimeout(() => {
        if (!xwFish || xwFish.phase !== 'wait') return;
        setXianwengFishPhase('bite');
        setXianwengFishSay('浮標猛地一沉！');
        xwFish.timers.push(setTimeout(() => {
            if (!xwFish || xwFish.phase !== 'bite') return;
            endXianwengCast(null, '收竿慢了一步，魚兒脫鉤而去。仙翁：「可惜，可惜。」');
        }, XIANWENG_GAMES.biteWindowMs));
    }, wait));
}
function rollXianwengFish() {
    const list = XIANWENG_GAMES.fish, total = list.reduce((s, f) => s + f.w, 0);
    let r = Math.random() * total;
    for (const f of list) { if ((r -= f.w) < 0) return f; }
    return list[0];
}
function xianwengHook() {
    clearXianwengFishTimers();
    const fish = rollXianwengFish();
    Object.assign(xwFish, { fish, fishPos: 0.5, fishTarget: 0.5, nextTurn: 0, boxPos: 0.35, boxV: 0, progress: 0.3, holding: false, last: 0 });
    document.getElementById('xw-bar-box').style.height = (fish.box * 100) + '%';
    document.getElementById('xw-bar-fish').innerText = fish.icon;
    setXianwengFishPhase('reel');
    setXianwengFishSay(fish.id === 'xian' ? '水下金光一閃——是條大傢伙！按住收線，別讓牠跑了！' : '魚上鉤了！按住收線讓綠框跟住魚。');
    xwFish.raf = requestAnimationFrame(xianwengReelFrame);
}
function xianwengReelFrame(ts) {
    const F = xwFish;
    if (!F || F.phase !== 'reel') return;
    const dt = F.last ? Math.min(0.05, (ts - F.last) / 1000) : 0;
    F.last = ts;
    const fish = F.fish, boxH = fish.box;
    // 魚：每隔一陣子換一個目標點亂竄
    F.nextTurn -= dt;
    if (F.nextTurn <= 0) { F.fishTarget = Math.random(); F.nextTurn = (0.5 + Math.random()) / fish.speed; }
    const step = fish.speed * 0.9 * dt, diff = F.fishTarget - F.fishPos;
    F.fishPos += Math.abs(diff) <= step ? diff : Math.sign(diff) * step;
    // 綠框：按住往上加速、放開往下
    F.boxV += (F.holding ? 2.4 : -2.0) * dt;
    F.boxV = Math.max(-1.1, Math.min(1.1, F.boxV));
    F.boxPos += F.boxV * dt;
    if (F.boxPos < 0) { F.boxPos = 0; F.boxV = Math.max(0, F.boxV) * 0; }
    if (F.boxPos > 1 - boxH) { F.boxPos = 1 - boxH; F.boxV = Math.min(0, F.boxV); }
    const inside = F.fishPos >= F.boxPos && F.fishPos <= F.boxPos + boxH;
    F.progress += (inside ? 0.26 : -0.17) * dt;
    // 畫面（bottom 0＝條的最下面）
    document.getElementById('xw-bar-box').style.bottom = (F.boxPos * 100) + '%';
    document.getElementById('xw-bar-box').classList.toggle('on', inside);
    document.getElementById('xw-bar-fish').style.bottom = `calc(${(F.fishPos * 100).toFixed(2)}% - 0.6em)`;
    document.getElementById('xw-prog-fill').style.width = (Math.max(0, Math.min(1, F.progress)) * 100) + '%';
    if (F.progress >= 1) { endXianwengCast(fish); return; }
    if (F.progress <= 0) { endXianwengCast(null, `${fish.name}掙脫了魚鉤，翻身潛回深處。仙翁：「魚有魚道，不必強求。」`); return; }
    F.raf = requestAnimationFrame(xianwengReelFrame);
}
// 一竿結束：fish＝釣到的魚（null＝跑了）
function endXianwengCast(fish, failText) {
    clearXianwengFishTimers();
    if (!xwFish) return;
    xwFish.holding = false;
    if (fish) {
        const got = grantXianwengFishLoot(fish);
        xwFish.caught.push(fish);
        document.getElementById('xw-fish-catch').insertAdjacentHTML('beforeend', `<span class="xw-catch-item" title="${got.join('、')}">${fish.icon} ${fish.name}</span>`);
        setXianwengFishSay(`🎉 釣到 ${fish.icon} ${fish.name}！\n${got.join('、')}`);
        addLog(`🎣 青瀾島仙翁釣魚：釣到${fish.name}，獲得 ${got.join('、')}`, 'level-up', true, 'item');
        updateUI();
    } else setXianwengFishSay(failText || '魚兒跑了。');
    saveLocal();
    xwFish.idleAt = Date.now();
    setXianwengFishPhase('idle');
    if (xianwengFishLeft() <= 0) setXianwengFishSay(document.getElementById('xw-fish-say').innerText + '\n\n仙翁收回釣竿：「今日的魚，就到這裡吧。」');
}
function grantXianwengFishLoot(fish) {
    const L = fish.loot || {}, got = [];
    const herbName = { mortal: '凡品靈草', high: '上品靈草', epic: '極品靈草', immortal: '仙品靈草' };
    if (!player.herbs) player.herbs = { mortal: 0, high: 0, epic: 0, immortal: 0 };
    Object.keys(L.herbs || {}).forEach(k => { player.herbs[k] = (player.herbs[k] || 0) + L.herbs[k]; got.push(`🌿 ${herbName[k]} ×${L.herbs[k]}`); });
    if (L.refine) got.push(`🌀 洗煉石 ×${addRefineStones(L.refine)}`);
    if (L.iron) got.push(`🌠 星允鐵 ×${addStarIron(L.iron)}`);
    if (L.craft) { Object.keys(L.craft).forEach(k => addCraftCur(k, L.craft[k])); got.push(formatCraftGain(L.craft)); }
    if (fish.stoneChance && Math.random() < fish.stoneChance) got.push(grantXianwengStone());
    return got;
}
function closeXianwengFishing() {
    if (xwFish && xwFish.phase === 'reel') endXianwengCast(null, '');
    clearXianwengFishTimers();
    document.getElementById('xw-fish-modal').style.display = 'none';
    const scene = xwFish && xwFish.scene;
    xwFish = null;
    backToXianweng(scene);
}
// 收線鈕：按住（滑鼠、觸控、空白鍵）
let xwFishControlsReady = false;
function initXianwengFishControls() {
    if (xwFishControlsReady) return;
    xwFishControlsReady = true;
    const btn = document.getElementById('xw-fish-btn');
    const hold = (on) => (e) => {
        if (!xwFish || xwFish.phase !== 'reel') return;
        if (e && e.cancelable) e.preventDefault();
        xwFish.holding = on;
    };
    btn.addEventListener('pointerdown', hold(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, hold(false)));
    btn.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if (e.code !== 'Space' || !xwFish || document.getElementById('xw-fish-modal').style.display !== 'flex') return;
        e.preventDefault();
        if (xwFish.phase === 'reel') xwFish.holding = true; else if (!e.repeat) xianwengFishAction();
    });
    document.addEventListener('keyup', e => { if (e.code === 'Space' && xwFish) xwFish.holding = false; });
}

// ---------------- 玲瓏棋局（五子棋）----------------
// 玩家 1＝黑（先手），仙翁 2＝白；困難 AI＝棋型評分（攻守兼顧）＋前幾名候選再看一步對手最強回應
const GOMOKU_N = 15;
let xwChess = null;
function openXianwengGomoku(sceneName) {
    xwChess = { scene: sceneName, board: new Array(GOMOKU_N * GOMOKU_N).fill(0), over: false, started: false, last: -1, busy: false, win: [] };
    document.getElementById('xw-chess-modal').style.setProperty('--xw-chess-bg', `url('${XIANWENG_GAMES.chessBg}')`);
    setXianwengChessSay('仙翁拈起一枚白子：「小友執黑先行。這盤棋，老夫等了三百年。」');
    renderXianwengGomoku();
    document.getElementById('xw-chess-modal').style.display = 'flex';
}
function setXianwengChessSay(t) { document.getElementById('xw-chess-say').innerText = t; }
function renderXianwengGomoku() {
    const C = xwChess;
    if (!C) return;
    let html = '';
    for (let i = 0; i < C.board.length; i++) {
        const v = C.board[i];
        const cls = 'xw-cell' + (v === 1 ? ' b' : v === 2 ? ' w' : '') + (i === C.last ? ' last' : '') + (C.win.includes(i) ? ' win' : '');
        html += `<button class="${cls}" onclick="gomokuPlay(${i})" aria-label="${Math.floor(i / GOMOKU_N) + 1}-${i % GOMOKU_N + 1}"></button>`;
    }
    document.getElementById('xw-board').innerHTML = html;
    const left = xianwengChessLeft();
    document.getElementById('xw-chess-left').innerText = `今日剩 ${left} / ${XIANWENG_GAMES.chessGames} 盤${C.started && !C.over ? '（對局中）' : ''}`;
    const again = document.getElementById('xw-chess-again');
    again.style.display = C.over && left > 0 ? '' : 'none';
}
function gomokuPlay(i) {
    const C = xwChess;
    if (!C || C.over || C.busy || C.board[i]) return;
    if (!C.started) {
        if (xianwengChessLeft() <= 0) { setXianwengChessSay('仙翁搖頭：「今日已對弈三盤，明日再來吧。」'); return; }
        const d = getXianwengDaily();
        d.chess = (d.chess || 0) + 1;   // 落下第一子就算一盤（中途離開＝認輸）
        C.started = true;
        saveLocal();
    }
    C.board[i] = 1; C.last = i;
    if (endXianwengGomokuIfDone(i, 1)) return;
    C.busy = true;
    setXianwengChessSay('仙翁撚鬚沉吟……');
    renderXianwengGomoku();
    setTimeout(() => {
        if (xwChess !== C || C.over) return;
        const m = gomokuAiMove(C.board);
        C.busy = false;
        if (m < 0) { endXianwengGomoku(0); return; }
        C.board[m] = 2; C.last = m;
        if (endXianwengGomokuIfDone(m, 2)) return;
        setXianwengChessSay(pickXianwengChessLine(C.board, m));
        renderXianwengGomoku();
    }, 350 + Math.random() * 350);
}
function pickXianwengChessLine(board, m) {
    const threat = gomokuCellScore(board, m, 2, true);
    if (threat >= 10000) return '仙翁落子如飛：「小友，這一手可看清了？」';
    if (threat >= 1000) return '仙翁輕笑：「棋如人生，一步緩，步步緩。」';
    const lines = ['仙翁落子無聲。', '仙翁：「不急，慢慢想。」', '仙翁端起茶盞，抿了一口。', '桃花瓣飄落在棋盤邊上。', '仙翁：「這一手，有點意思。」'];
    return lines[Math.floor(Math.random() * lines.length)];
}
// 下完一手檢查勝負／和局
function endXianwengGomokuIfDone(i, who) {
    const line = gomokuFive(xwChess.board, i, who);
    if (line) { xwChess.win = line; endXianwengGomoku(who); return true; }
    if (xwChess.board.every(v => v)) { endXianwengGomoku(0); return true; }
    return false;
}
// winner：1 玩家、2 仙翁、0 和局（和局算沒贏）
function endXianwengGomoku(winner) {
    const C = xwChess;
    C.over = true; C.busy = false;
    if (winner === 1) {
        if (Math.random() < XIANWENG_GAMES.chessWinStoneChance) {
            const got = grantXianwengStone();
            setXianwengChessSay(`仙翁哈哈大笑：「後生可畏！這枚靈石，算老夫輸給你的。」\n🎁 ${got}`);
            addLog(`♟️ 青瀾島玲瓏棋局：勝過仙翁，獲得 ${got}`, 'level-up', true, 'item');
            updateUI();
        } else {
            setXianwengChessSay('仙翁拱手：「好棋！只是今日造化未至，小友改日再來。」');
            addLog('♟️ 青瀾島玲瓏棋局：勝過仙翁，可惜機緣未到', 'normal', true, 'item');
        }
    } else setXianwengChessSay(winner === 2 ? '仙翁收子入盒：「機緣未到，小友莫要氣餒。」' : '滿盤無處落子。仙翁：「平分秋色……機緣未到。」');
    saveLocal();
    renderXianwengGomoku();
}
function restartXianwengGomoku() { if (xwChess) openXianwengGomoku(xwChess.scene); }
function closeXianwengGomoku() {
    if (xwChess && xwChess.started && !xwChess.over) addLog('♟️ 青瀾島玲瓏棋局：中途離席（算一盤）', 'normal', true, 'item');
    document.getElementById('xw-chess-modal').style.display = 'none';
    const scene = xwChess && xwChess.scene;
    xwChess = null;
    backToXianweng(scene);
}

// 連五：回傳那五子的位置（沒有＝null）
function gomokuFive(board, i, who) {
    const N = GOMOKU_N, r = Math.floor(i / N), c = i % N;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const line = [i];
        for (const s of [1, -1]) {
            let rr = r + dr * s, cc = c + dc * s;
            while (rr >= 0 && rr < N && cc >= 0 && cc < N && board[rr * N + cc] === who) { line.push(rr * N + cc); rr += dr * s; cc += dc * s; }
        }
        if (line.length >= 5) return line;
    }
    return null;
}
// 棋型分數（把 who 下在 i 之後，四個方向各取最好的棋型相加）
const GOMOKU_PATTERNS = [
    ['11111', 100000],
    ['011110', 10000],
    ['011112', 1100], ['211110', 1100], ['10111', 1100], ['11101', 1100], ['11011', 1100],
    ['01110', 1000], ['010110', 900], ['011010', 900],
    ['001112', 150], ['211100', 150], ['010112', 150], ['211010', 150], ['011012', 150], ['210110', 150], ['10011', 150], ['11001', 150], ['10101', 150],
    ['001100', 120], ['01010', 100], ['010010', 80],
    ['000112', 15], ['211000', 15], ['001012', 15], ['210100', 15]
];
function gomokuCellScore(board, i, who, alreadyPlaced) {
    const N = GOMOKU_N, r = Math.floor(i / N), c = i % N;
    let total = 0, big = 0;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        let s = '';
        for (let k = -5; k <= 5; k++) {
            const rr = r + dr * k, cc = c + dc * k;
            if (rr < 0 || rr >= N || cc < 0 || cc >= N) { s += '2'; continue; }
            const v = k === 0 && !alreadyPlaced ? who : board[rr * N + cc];
            s += v === who ? '1' : v === 0 ? '0' : '2';
        }
        let best = 0;
        for (const [p, sc] of GOMOKU_PATTERNS) {
            if (sc <= best) continue;
            // 棋型必須包含中心這一子（位置 5）
            let from = s.indexOf(p);
            while (from >= 0) {
                if (from <= 5 && from + p.length > 5 && p[5 - from] === '1') { best = sc; break; }
                from = s.indexOf(p, from + 1);
            }
        }
        if (best >= 900) big++;
        total += best;
    }
    if (big >= 2 && total < 10000) total += 8000;   // 雙活三、四三等必勝組合
    return total;
}
function gomokuCandidates(board) {
    const N = GOMOKU_N, out = [];
    let any = false;
    for (let i = 0; i < board.length; i++) {
        if (board[i]) { any = true; continue; }
        const r = Math.floor(i / N), c = i % N;
        let near = false;
        for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2; dc++) {
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < N && cc >= 0 && cc < N && board[rr * N + cc]) { near = true; break; }
        }
        if (near) out.push(i);
    }
    if (!any) out.push(Math.floor(N / 2) * N + Math.floor(N / 2));
    return out;
}
// 候選排序：who 下這裡的進攻分 ×1.1＋擋掉對手的分；對手下一手就能連五時只留擋點
function gomokuOrdered(board, who, K) {
    const opp = 3 - who;
    let list = gomokuCandidates(board).filter(i => !board[i]).map(i => {
        const atk = gomokuCellScore(board, i, who), def = gomokuCellScore(board, i, opp);
        return { i, atk, def, s: atk * 1.1 + def };
    });
    const mustBlock = list.filter(x => x.def >= 100000);
    if (mustBlock.length && !list.some(x => x.atk >= 100000)) list = mustBlock;
    list.sort((a, b) => b.s - a.s);
    return list.slice(0, K);
}
// 負極大值搜尋（alpha-beta）：回傳 who 這一方的局面分
function gomokuNegamax(board, who, depth, alpha, beta) {
    const list = gomokuOrdered(board, who, depth >= 2 ? 8 : 6);
    if (!list.length) return 0;
    const win = list.find(x => x.atk >= 100000);
    if (win) return 1000000 + depth;
    if (depth === 0) return list[0].atk - Math.max(...list.map(x => x.def)) * 0.5;
    let best = -Infinity;
    for (const x of list) {
        board[x.i] = who;
        const v = -gomokuNegamax(board, 3 - who, depth - 1, -beta, -alpha);
        board[x.i] = 0;
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
    }
    return best;
}
// 下在 i 之後，who 能直接連五的點（只看 i 的四個方向 4 格內）
function gomokuWinCells(board, i, who) {
    const N = GOMOKU_N, r = Math.floor(i / N), c = i % N, out = [];
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) for (let k = -4; k <= 4; k++) {
        const rr = r + dr * k, cc = c + dc * k, j = rr * N + cc;
        if (!k || rr < 0 || rr >= N || cc < 0 || cc >= N || board[j] || out.includes(j)) continue;
        board[j] = who;
        if (gomokuFive(board, j, who)) out.push(j);
        board[j] = 0;
    }
    return out;
}
// 連續衝四取勝（VCF）：who 一直下「下一手就能連五」的棋逼對手擋，直到同時有兩個連五點。回傳第一手（沒有＝-1）
function gomokuVCF(board, who, depth) {
    if (depth <= 0) return -1;
    for (const i of gomokuCandidates(board)) {
        if (board[i] || gomokuCellScore(board, i, who) < 1000) continue;
        board[i] = who;
        let ok = false;
        if (gomokuFive(board, i, who)) ok = true;
        else {
            const w = gomokuWinCells(board, i, who);
            if (w.length >= 2) ok = true;
            else if (w.length === 1) {
                const blk = w[0];
                board[blk] = 3 - who;
                // 對手擋的這一手自己連五、或擋完反衝四，這條路就不算
                if (!gomokuFive(board, blk, 3 - who) && !gomokuWinCells(board, blk, 3 - who).length) ok = gomokuVCF(board, who, depth - 1) >= 0;
                board[blk] = 0;
            }
        }
        board[i] = 0;
        if (ok) return i;
    }
    return -1;
}
// 仙翁（白＝2）下哪裡：能連續衝四取勝就直接走；否則前 10 名候選各往下算 4 層（仙翁→玩家→仙翁→玩家），並避開下完後玩家能連續衝四取勝的點（困難：對一層貪心的電腦先手約四成勝率，對一般玩家更高）
function gomokuAiMove(board) {
    const list = gomokuOrdered(board, 2, 10);
    if (!list.length) return -1;
    const win = list.find(x => x.atk >= 100000);
    if (win) return win.i;
    if (list.length === 1) return list[0].i;
    if (!list.some(x => x.def >= 100000)) {
        const vcf = gomokuVCF(board, 2, 6);
        if (vcf >= 0) return vcf;
    }
    let best = null, bestVal = -Infinity, alpha = -Infinity;
    const t0 = Date.now();   // 手機比較慢：檢查玩家衝四最多花 1.2 秒
    for (const x of list) {
        board[x.i] = 2;
        let v = -gomokuNegamax(board, 1, 2, -Infinity, -alpha) + Math.random() * 2;
        if (v > -500000 && Date.now() - t0 < 1200 && gomokuVCF(board, 1, 4) >= 0) v -= 500000;
        board[x.i] = 0;
        if (v > bestVal) { bestVal = v; best = x; }
        if (v > alpha) alpha = v;
    }
    return (best || list[0]).i;
}
