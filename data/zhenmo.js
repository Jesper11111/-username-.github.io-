// 秘境「鎮魔塔」100 層（ARCHITECTURE.md 第 51 節）；設定在 config-zhenmo.js、題庫在 config-zhenmo-questions.js
// 流程：秘境場景「⚔️ 入塔挑戰」→ openZhenmoTower()：塔廳（目前樓層、100 層進度）→ 問答 10 題（限時、選項打亂）
//       → 結算（答對數 → 本層 BOSS 獎勵倍率，存 player.zhenmo.pending）→「🚪 開啟 BOSS 房門」→ BOSS 房（BOSS 資料待新增）
// 存檔 player.zhenmo = { floor: 目前要挑戰的樓層, best: 最高通過樓層, pending: { floor, correct, total, mult, at } | null, recent: [最近出過的題號] }
// 內部函式包在 ZhenmoTower 閉包裡，對外只開放 onclick 用的函式。

const ZhenmoTower = (() => {
    const $ = id => document.getElementById(id);
    let quiz = null;        // 進行中的問答 { floor, list, i, correct, marks, deadline, locked }
    let timer = 0;

    function state() {
        if (!player.zhenmo || typeof player.zhenmo !== 'object') player.zhenmo = {};
        const z = player.zhenmo;
        if (!(z.floor >= 1)) z.floor = 1;
        if (!(z.best >= 0)) z.best = 0;
        if (!Array.isArray(z.recent)) z.recent = [];
        if (z.pending === undefined) z.pending = null;
        return z;
    }
    const multOf = correct => ZHENMO_QUIZ_REWARD_MULT[Math.max(0, Math.min(ZHENMO_QUIZ_REWARD_MULT.length - 1, correct))];

    // ================== 畫面切換 ==================
    function show(panel) {
        ['hall', 'quiz', 'result', 'boss'].forEach(p => { $('zm-' + p).style.display = p === panel ? '' : 'none'; });
    }
    function open() {
        $('zhenmo-scene').style.display = 'block';
        renderHall();
    }
    function close() {
        if (quiz && !confirm('問答進行中，確定要離開嗎？\n未作答的題目視為答錯，本次成績會保留給這一層的 BOSS。')) return;
        if (quiz) finishQuiz();
        clearInterval(timer); timer = 0;
        $('zhenmo-scene').style.display = 'none';
        if (typeof refreshSecretRealmEnterLabel === 'function') refreshSecretRealmEnterLabel();
    }

    // ================== 塔廳：目前樓層與 100 層進度 ==================
    function renderHall() {
        const z = state();
        const done = z.best >= ZHENMO_TOTAL_FLOORS;
        $('zm-floor-title').textContent = done ? '鎮魔塔・已登頂' : `鎮魔塔・第 ${z.floor} 層`;
        $('zm-hall-floor').textContent = done ? '百層盡破' : `第 ${z.floor} 層`;
        $('zm-hall-progress').textContent = `已鎮壓 ${z.best} / ${ZHENMO_TOTAL_FLOORS} 層`;
        // 100 格：已通過／目前／未開啟（由下往上：第 1 層在最下面一列左邊）
        let cells = '';
        for (let row = ZHENMO_TOTAL_FLOORS / 10 - 1; row >= 0; row--) {
            for (let c = 1; c <= 10; c++) {
                const f = row * 10 + c;
                const cls = f <= z.best ? 'done' : f === z.floor ? 'cur' : '';
                cells += `<span class="zm-cell ${cls}" title="第 ${f} 層">${f % 10 === 0 ? f : ''}</span>`;
            }
        }
        $('zm-grid').innerHTML = cells;
        const p = z.pending && z.pending.floor === z.floor ? z.pending : null;
        const left = typeof getSecretRealmAttemptsLeft === 'function' ? getSecretRealmAttemptsLeft('zhenmo') : 0;
        $('zm-hall-actions').innerHTML = done ? '<p class="zm-note">塔中群魔已盡數鎮壓。</p>'
            : p ? `<button class="zm-btn gold" onclick="enterZhenmoBoss()">🚪 進入 BOSS 房（問答 ${p.correct}/${p.total}，獎勵 ×${p.mult}）</button>`
            : `<button class="zm-btn" onclick="startZhenmoQuiz()">📜 開始問答（${ZHENMO_QUIZ_COUNT} 題）</button>`;
        $('zm-hall-rule').innerHTML =
            `每層先通過<b>知識問答</b>（${ZHENMO_QUIZ_COUNT} 題${ZHENMO_QUIZ_SECONDS ? `，每題限時 ${ZHENMO_QUIZ_SECONDS} 秒` : ''}），才能開啟 BOSS 房門。<br>`
            + `答對越多，本層 BOSS 獎勵越高：${ZHENMO_QUIZ_REWARD_MULT.map((m, i) => i % 5 === 0 || i === ZHENMO_QUIZ_COUNT ? `${i} 題 ×${m}` : '').filter(Boolean).join('、')}。<br>`
            + (ZHENMO_BOSS_READY ? `每次開始問答扣 1 次挑戰（今日剩 ${left}/${SECRET_REALM_DAILY_ATTEMPTS}）。` : '🚧 塔中 BOSS 尚在甦醒：目前問答不扣挑戰次數，成績會保留到 BOSS 開放。');
        show('hall');
    }

    // ================== 問答 ==================
    // 抽題：避開最近出過的題目；選擇題選項打亂（答案原本多在 A）
    function drawQuestions() {
        const z = state();
        let pool = zhenmoQuestions.map((q, id) => id).filter(id => !z.recent.includes(id));
        if (pool.length < ZHENMO_QUIZ_COUNT) pool = zhenmoQuestions.map((q, id) => id);
        const ids = [];
        while (ids.length < ZHENMO_QUIZ_COUNT && pool.length) ids.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        z.recent = z.recent.concat(ids).slice(-ZHENMO_RECENT_AVOID);
        return ids.map(id => {
            const [src, text, opts, ans] = zhenmoQuestions[id];
            if (!opts) return { id, src, text, tf: true, choices: [{ label: '○', ok: ans === 'O' }, { label: '╳', ok: ans === 'X' }] };
            const idx = 'ABCD'.indexOf(ans);
            const choices = opts.map((t, i) => ({ text: t, ok: i === idx })).sort(() => Math.random() - 0.5);
            choices.forEach((c, i) => { c.label = 'ABCD'[i]; });
            return { id, src, text, tf: false, choices };
        });
    }
    function startQuiz() {
        const z = state();
        if (quiz || z.best >= ZHENMO_TOTAL_FLOORS) return;
        if (z.pending && z.pending.floor === z.floor) { renderHall(); return; }   // 已有本層成績，直接進 BOSS 房
        if (ZHENMO_BOSS_READY && !useSecretRealmAttempt('zhenmo')) {
            alert(`【鎮魔塔】今日 ${SECRET_REALM_DAILY_ATTEMPTS} 次挑戰已用完，明日再來。`);
            return;
        }
        quiz = { floor: z.floor, list: drawQuestions(), i: 0, correct: 0, marks: [], locked: false };
        show('quiz');
        renderQuestion();
    }
    function renderQuestion() {
        const q = quiz.list[quiz.i];
        $('zm-quiz-head').textContent = `第 ${quiz.floor} 層・問答 ${quiz.i + 1} / ${quiz.list.length}`;
        $('zm-quiz-src').textContent = `《${ZHENMO_SOURCES[q.src] || q.src}》${q.tf ? '是非題' : '選擇題'}`;
        $('zm-quiz-text').textContent = q.text;
        $('zm-quiz-opts').className = q.tf ? 'tf' : '';
        $('zm-quiz-opts').innerHTML = q.choices.map((c, i) =>
            `<button class="zm-opt" data-i="${i}" onclick="answerZhenmo(${i})">${q.tf ? c.label : `<b>${c.label}</b>${escapeZm(c.text)}`}</button>`).join('');
        $('zm-quiz-marks').innerHTML = quiz.list.map((x, i) => `<span class="${quiz.marks[i] === true ? 'ok' : quiz.marks[i] === false ? 'ng' : i === quiz.i ? 'cur' : ''}"></span>`).join('');
        $('zm-quiz-feedback').textContent = '';
        quiz.locked = false;
        clearInterval(timer);
        if (ZHENMO_QUIZ_SECONDS > 0) {
            quiz.deadline = Date.now() + ZHENMO_QUIZ_SECONDS * 1000;
            tickTimer();
            timer = setInterval(tickTimer, 100);
        } else {
            $('zm-quiz-timer').style.display = 'none';
        }
    }
    function tickTimer() {
        if (!quiz) return;
        const left = Math.max(0, quiz.deadline - Date.now());
        $('zm-quiz-timer').style.display = '';
        $('zm-quiz-timer-fill').style.width = `${left / (ZHENMO_QUIZ_SECONDS * 1000) * 100}%`;
        $('zm-quiz-timer-fill').classList.toggle('low', left < 5000);
        $('zm-quiz-timer-text').textContent = `${Math.ceil(left / 1000)} 秒`;
        if (left <= 0 && !quiz.locked) answer(-1);   // 逾時算答錯
    }
    function answer(i) {
        if (!quiz || quiz.locked) return;
        quiz.locked = true;
        clearInterval(timer);
        const q = quiz.list[quiz.i];
        const ok = i >= 0 && q.choices[i].ok;
        quiz.marks[quiz.i] = ok;
        if (ok) quiz.correct++;
        document.querySelectorAll('#zm-quiz-opts .zm-opt').forEach(b => {
            b.disabled = true;
            const bi = +b.dataset.i;
            if (bi === i) b.classList.add(ok ? 'ok' : 'ng');
            if (ZHENMO_REVEAL_ANSWER && !ok && q.choices[bi].ok) b.classList.add('ok');
        });
        $('zm-quiz-feedback').textContent = i < 0 ? '⌛ 時間到！' : ok ? '✅ 答對了！' : '❌ 答錯了';
        $('zm-quiz-feedback').className = ok ? 'ok' : 'ng';
        setTimeout(() => {
            if (!quiz) return;
            quiz.i++;
            if (quiz.i >= quiz.list.length) finishQuiz(); else renderQuestion();
        }, 900);
    }
    // 結算（答完或中途離開）：成績存成本層待戰的 BOSS 加成
    function finishQuiz() {
        clearInterval(timer); timer = 0;
        const z = state(), q = quiz;
        quiz = null;
        const total = q.list.length, correct = q.correct, mult = multOf(correct);
        z.pending = { floor: q.floor, correct, total, mult, at: Date.now() };
        addLog(`🗼 鎮魔塔第 ${q.floor} 層問答：答對 ${correct}/${total}，本層 BOSS 獎勵 ×${mult}。`, 'quest', true, 'item');
        $('zm-result-score').textContent = `${correct} / ${total}`;
        $('zm-result-marks').innerHTML = q.list.map((x, i) => `<span class="${q.marks[i] ? 'ok' : 'ng'}">${q.marks[i] ? '○' : '╳'}</span>`).join('');
        $('zm-result-mult').innerHTML = `本層 BOSS 獎勵 <b>×${mult}</b>${correct === total ? '<br>🌟 全數答對！天道嘉許，獎勵大幅提升' : ''}`;
        show('result');
    }

    // ================== BOSS 房 ==================
    function enterBoss() {
        const z = state();
        const p = z.pending && z.pending.floor === z.floor ? z.pending : null;
        if (!p) { renderHall(); return; }
        $('zm-boss-floor').textContent = `第 ${z.floor} 層・BOSS 房`;
        $('zm-boss-bonus').innerHTML = `問答成績 ${p.correct}/${p.total}・BOSS 獎勵 <b>×${p.mult}</b>`;
        $('zm-boss-body').innerHTML = ZHENMO_BOSS_READY ? ''
            : '<p class="zm-boss-wait">房門後魔氣翻湧，塔中 BOSS 尚在甦醒……</p><p class="zm-note">🚧 BOSS 資料即將開放，問答成績已保留，開放後可直接進房挑戰。</p>';
        const door = $('zm-door');
        door.classList.remove('open'); void door.offsetWidth; door.classList.add('open');   // 重播開門動畫
        show('boss');
    }

    function escapeZm(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    return { open, close, startQuiz, answer, enterBoss, renderHall, state,
             _quiz: () => quiz };   // 測試用
})();

// ---- onclick 用（index.html #zhenmo-scene、secret-realm.js）----
function openZhenmoTower() { ZhenmoTower.open(); }
function closeZhenmoTower() { ZhenmoTower.close(); }
function startZhenmoQuiz() { ZhenmoTower.startQuiz(); }
function answerZhenmo(i) { ZhenmoTower.answer(i); }
function enterZhenmoBoss() { ZhenmoTower.enterBoss(); }
function backToZhenmoHall() { ZhenmoTower.renderHall(); }
