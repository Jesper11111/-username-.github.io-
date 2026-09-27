// 秘境「鎮魔塔」100 層（ARCHITECTURE.md 第 51 節）；設定在 config-zhenmo.js、題庫在 config-zhenmo-questions.js
// 流程：秘境場景「⚔️ 入塔挑戰」→ openZhenmoTower()：塔廳（目前樓層、100 層進度）→ 問答 10 題（限時、選項打亂）
//       → 結算（答對數 → 本層 BOSS 獎勵倍率，存 player.zhenmo.pending）→「🚪 開啟 BOSS 房門」→ BOSS 介紹 →「⚔️ 挑戰」→ 回合制戰鬥演出 → 勝／敗
// 存檔 player.zhenmo = { floor: 目前要挑戰的樓層, best: 最高通過樓層, pending: { floor, correct, total, mult, at } | null, recent: [最近出過的題號] }
//   pending 只對同一層有效：擊敗 BOSS（clearFloor）、挑戰失敗或樓層改變時清除，重來要重新答題
// 內部函式包在 ZhenmoTower 閉包裡，對外只開放 onclick 用的函式。

const ZhenmoTower = (() => {
    const $ = id => document.getElementById(id);
    const randInt = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
    let quiz = null;        // 進行中的問答 { floor, list, i, correct, marks, deadline, locked }
    let timer = 0;
    let fight = null;       // 進行中的 BOSS 戰（見 startFight）

    function state() {
        if (!player.zhenmo || typeof player.zhenmo !== 'object') player.zhenmo = {};
        const z = player.zhenmo;
        if (!(z.floor >= 1)) z.floor = 1;
        if (!(z.best >= 0)) z.best = 0;
        if (!Array.isArray(z.recent)) z.recent = [];
        // 問答加成只對「取得成績的那一層」BOSS 有效：樓層已不同就作廢（進入下一層必須重新答題）
        if (z.pending === undefined || (z.pending && z.pending.floor !== z.floor)) z.pending = null;
        return z;
    }
    const bossOf = floor => ZHENMO_BOSSES[floor] || null;
    // 擊敗本層 BOSS 後呼叫：記錄最高樓層、前進一層、清掉本層問答加成；回傳本層使用的獎勵倍率（沒答題 = ×1）
    function clearFloor() {
        const z = state();
        const mult = z.pending ? z.pending.mult : 1;
        z.best = Math.max(z.best, z.floor);
        z.floor = Math.min(ZHENMO_TOTAL_FLOORS, z.floor + 1);
        z.pending = null;
        return mult;
    }
    const multOf = correct => ZHENMO_QUIZ_REWARD_MULT[Math.max(0, Math.min(ZHENMO_QUIZ_REWARD_MULT.length - 1, correct))];

    // ================== 畫面切換 ==================
    function show(panel) {
        ['hall', 'quiz', 'result', 'boss', 'fight'].forEach(p => { $('zm-' + p).style.display = p === panel ? '' : 'none'; });
    }
    function open() {
        $('zhenmo-scene').style.display = 'block';
        renderHall();
    }
    function close() {
        if (quiz && !confirm('問答進行中，確定要離開嗎？\n未作答的題目視為答錯，本次成績會保留給這一層的 BOSS。')) return;
        if (fight && !fight.over && !confirm('BOSS 戰進行中，確定要離開嗎？\n離開視為挑戰失敗，本層問答成績作廢。')) return;
        if (quiz) finishQuiz();
        if (fight && !fight.over) endFight(false, '中途撤離');
        stopFight();
        clearInterval(timer); timer = 0;
        $('zhenmo-scene').style.display = 'none';
        if (typeof refreshSecretRealmEnterLabel === 'function') refreshSecretRealmEnterLabel();
    }

    // ================== 塔廳：目前樓層與 100 層進度 ==================
    function renderHall() {
        stopFight();
        const z = state();
        const done = z.best >= ZHENMO_TOTAL_FLOORS;
        const boss = bossOf(z.floor);
        $('zm-floor-title').textContent = done ? '鎮魔塔・已登頂' : `鎮魔塔・第 ${z.floor} 層`;
        $('zm-hall-floor').textContent = done ? '百層盡破' : `第 ${z.floor} 層`;
        $('zm-hall-progress').textContent = `已鎮壓 ${z.best} / ${ZHENMO_TOTAL_FLOORS} 層${boss && !done ? `・本層 BOSS【${boss.name}】` : ''}`;
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
            + `加成只對本層 BOSS 有效：擊敗 BOSS 進入下一層、或挑戰失敗，都要重新答題。<br>`
            + (boss ? `每次開始問答扣 1 次挑戰（今日剩 ${left}/${SECRET_REALM_DAILY_ATTEMPTS}）。` : '🚧 本層 BOSS 尚在甦醒：目前問答不扣挑戰次數，成績會保留到 BOSS 開放。');
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
        // 有 BOSS 的樓層才扣次數（還沒有 BOSS 資料的樓層只能先答題保留成績）
        if (bossOf(z.floor) && !useSecretRealmAttempt('zhenmo')) {
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

    // ================== BOSS 房：開門 → BOSS 介紹 ==================
    function bossStats(boss) {
        const atk = defenseRealmAtk(boss.realm, boss.stage) * (boss.atkMult || 1);
        const attrs = { def: boss.def || 0, eva: boss.eva || 0, ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0, element: boss.element || null };
        if (boss.affix) attrs[boss.affix] = boss.affixVal || 0;
        return { atk, hp: atk * (boss.hpPerAtk || 20), attrs };
    }
    function playerStats() {
        return { atk: Math.max(getPhysAttack(), getMagAttack()) * ZHENMO_PLAYER_SKILL_MULT, hp: getMaxHp(), attrs: getPlayerCombatAttrs() };
    }
    function enterBoss() {
        const z = state();
        const p = z.pending && z.pending.floor === z.floor ? z.pending : null;
        if (!p) { renderHall(); return; }
        const boss = bossOf(z.floor);
        $('zm-boss-floor').textContent = boss ? `第 ${z.floor} 層・${boss.name}` : `第 ${z.floor} 層・BOSS 房`;
        $('zm-boss-bonus').innerHTML = `問答成績 ${p.correct}/${p.total}・BOSS 獎勵 <b>×${p.mult}</b>`;
        if (boss) {
            const b = bossStats(boss), me = playerStats();
            const r = boss.rewards || {};
            const ratio = b.atk / Math.max(1, me.atk / ZHENMO_PLAYER_SKILL_MULT);
            $('zm-boss-body').innerHTML = `
                <p class="zm-boss-title">「${escapeZm(boss.title)}」強度：${realms[boss.realm]} ${boss.stage} 階</p>
                <p class="zm-note">${escapeZm(boss.intro)}</p>
                <p class="zm-boss-stat">攻擊 ${Math.round(b.atk).toWan()}（<span style="color:${ratio >= 1.5 ? '#f87171' : ratio >= 0.8 ? '#facc15' : '#4ade80'}">你的 ${ratio >= 100 ? '100+' : ratio.toFixed(1)} 倍</span>）・氣血 ${Math.round(b.hp).toWan()}<br>
                    🛡️減傷 ${b.attrs.def}% 💨閃避 ${b.attrs.eva}%${boss.affix ? `・${(combatAttrInfo[boss.affix] || {}).label || boss.affix} ${boss.affixVal}%` : ''}・五行 ${boss.element || '無'}</p>
                <p class="zm-note">擊敗獎勵（× ${p.mult}）：💎 靈石・☯️ 功德 ${r.merit ? r.merit.join('～') : 0}・🔥 異火碎片 ${r.shards ? r.shards.join('～') : 0}・🌠 星允鐵 ${r.iron ? r.iron.join('～') : 0}</p>
                <button class="zm-btn gold" onclick="startZhenmoFight()">⚔️ 挑戰${escapeZm(boss.name)}</button>
                <p class="zm-note">挑戰失敗本層問答成績作廢，須重新答題。</p>`;
        } else {
            $('zm-boss-body').innerHTML = '<p class="zm-boss-wait">房門後魔氣翻湧，塔中 BOSS 尚在甦醒……</p><p class="zm-note">🚧 本層 BOSS 即將開放，問答成績已保留，開放後可直接進房挑戰。</p>';
        }
        const door = $('zm-door');
        door.style.backgroundImage = boss ? `radial-gradient(circle at 50% 60%, rgba(220,38,38,0.35), rgba(5,7,12,0.6) 70%), url(${boss.img})` : '';
        door.style.backgroundPosition = boss ? `center, ${boss.imgPos || 'center'}` : '';
        door.classList.remove('open'); void door.offsetWidth; door.classList.add('open');   // 重播開門動畫
        show('boss');
    }

    // ================== BOSS 戰（回合制；數值同死守天南城：resolveHit／tickStatus，不影響玩家實際氣血）==================
    function startFight() {
        const z = state();
        const boss = bossOf(z.floor);
        const p = z.pending && z.pending.floor === z.floor ? z.pending : null;
        if (!boss || !p || fight) return;
        const b = bossStats(boss), me = playerStats();
        fight = {
            floor: z.floor, boss, mult: p.mult, round: 0, over: false, speed: fight && fight.speed || 1, tid: 0,
            e: { atk: b.atk, hp: b.hp, max: b.hp, attrs: b.attrs, st: newStatus() },
            p: { atk: me.atk, hp: me.hp, max: me.hp, attrs: me.attrs, st: newStatus() }
        };
        const bg = $('zm-fight-bg');
        bg.style.backgroundImage = `url(${boss.img})`;
        bg.style.backgroundPosition = boss.imgPos || 'center';
        $('zm-fight-hero').src = player.gender === 'female' ? ZHENMO_HERO_IMG.female : ZHENMO_HERO_IMG.male;
        $('zm-fight-boss-name').textContent = `${boss.name}・${realms[boss.realm]} ${boss.stage} 階`;
        $('zm-fight-me-name').textContent = player.name || '你';
        $('zm-fight-log').innerHTML = '';
        $('zm-fight-end').classList.remove('on');
        $('zm-fight').classList.remove('shake');
        setFightSpeed(fight.speed);
        updateBars();
        show('fight');
        fightLog(`⚔️ ${boss.name}：「${boss.skills && boss.skills[0] ? '區區凡人，也敢闖塔？' : '來吧！'}」`, 'boss');
        fight.tid = setTimeout(step, 700 / fight.speed);
    }
    const HERO_MOVES = ['御劍術', '劍氣縱橫', '驚鴻一劍', '青冥劍訣', '萬劍歸宗'];
    // 一回合：玩家狀態 → 玩家出手 → BOSS 狀態 → BOSS 出手（同 defense.js 的 simulateWave）；instant = 跳過演出
    function round(instant) {
        const f = fight, P = f.p, E = f.e;
        f.round++;
        const st = tickStatus(P.st);
        if (st.dot) { P.hp -= st.dot; if (!instant) popNum('hero', st.dot, 'dot'); }
        if (P.hp <= 0) return endFight(false, '身中異狀，力竭倒下');
        if (!st.frozen) {
            const hit = resolveHit(P.atk, { attrs: P.attrs, power: P.atk }, { attrs: E.attrs, status: E.st });
            E.hp -= hit.dmg;
            if (!instant) {
                const crit = hit.tags.includes('metal') || hit.tags.includes('thunder');
                popNum('boss', hit.tags.includes('dodge') ? '閃避' : hit.dmg, hit.tags.includes('dodge') ? 'miss' : crit ? 'crit' : '');
                slash();
                if (f.round % 3 === 1 || crit) fightLog(`🗡️ 你施展【${HERO_MOVES[f.round % HERO_MOVES.length]}】${hit.tags.includes('dodge') ? '，被閃開了' : `，造成 ${Math.floor(hit.dmg).toWan()} 傷害${crit ? '（暴擊）' : ''}`}`, 'me');
            }
        } else if (!instant) fightLog('❄️ 你被凍結，無法出手', 'me');
        const et = tickStatus(E.st);
        if (et.dot) { E.hp -= et.dot; if (!instant) popNum('boss', et.dot, 'dot'); }
        if (E.hp <= 0) return endFight(true);
        if (!et.frozen) {
            const hit = resolveHit(E.atk, { attrs: E.attrs, power: E.atk }, { attrs: P.attrs, status: P.st });
            P.hp -= hit.dmg;
            if (!instant) {
                popNum('hero', hit.tags.includes('dodge') ? '閃避' : hit.dmg, hit.tags.includes('dodge') ? 'miss' : 'hurt');
                bossFlash();
                if (f.round % 3 === 2) fightLog(`⚡ ${f.boss.name}施展【${f.boss.skills[f.round % f.boss.skills.length]}】${hit.tags.includes('dodge') ? '，被你閃過' : `，你受到 ${Math.floor(hit.dmg).toWan()} 傷害`}`, 'boss');
            }
        }
        if (P.hp <= 0) return endFight(false, `被${f.boss.name}擊倒`);
        if (f.round >= ZHENMO_MAX_ROUNDS) return endFight(false, `久戰 ${ZHENMO_MAX_ROUNDS} 回合未能擊倒${f.boss.name}`);
        if (!instant) updateBars();
    }
    function step() {
        if (!fight || fight.over) return;
        round(false);
        if (fight && !fight.over) fight.tid = setTimeout(step, ZHENMO_ROUND_MS / fight.speed);
    }
    function skipFight() {
        if (!fight || fight.over) return;
        clearTimeout(fight.tid);
        while (fight && !fight.over) round(true);
    }
    function setFightSpeed(s) {
        if (!fight) return;
        fight.speed = s;
        document.querySelectorAll('#zm-fight .zm-speed button[data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === s));
    }
    function stopFight() {
        if (fight) clearTimeout(fight.tid);
        fight = null;
    }
    // 勝：前進一層並依問答倍率發獎勵；敗：本層問答成績作廢
    function endFight(win, reason) {
        const f = fight;
        if (!f || f.over) return;
        f.over = true;
        clearTimeout(f.tid);
        updateBars();
        const z = state();
        let html;
        if (win) {
            const mult = clearFloor();
            const g = grantRewards(f.boss, mult);
            html = `<div class="big win">鎮壓成功</div>
                <p>第 ${f.floor} 層【${escapeZm(f.boss.name)}】伏誅（${f.round} 回合）</p>
                <p class="zm-reward">獎勵 ×${mult}<br>💎 靈石 ${g.coins.toWan()}<br>☯️ 功德 ${g.merit.toWan()}${g.shards ? `<br>🔥 異火碎片 ×${g.shards}` : ''}${g.iron ? `<br>🌠 星允鐵 ×${g.iron}` : ''}</p>
                <p class="zm-note">已鎮壓 ${z.best} 層，前往第 ${z.floor} 層須重新答題。</p>`;
            addLog(`🗼 鎮魔塔第 ${f.floor} 層：擊敗【${f.boss.name}】！獎勵 ×${mult}：靈石 ${g.coins.toWan()}、功德 ${g.merit.toWan()}${g.shards ? `、異火碎片 ×${g.shards}` : ''}${g.iron ? `、星允鐵 ×${g.iron}` : ''}`, 'level-up', true, 'item');
        } else {
            z.pending = null;   // 挑戰失敗：本層問答成績作廢
            html = `<div class="big lose">挑戰失敗</div>
                <p>${escapeZm(reason || '不敵')}（第 ${f.round} 回合）</p>
                <p class="zm-note">本層問答成績已作廢，重新答題即可再戰（${Math.max(0, Math.round(f.e.hp / f.e.max * 100))}% 氣血殘存）。</p>`;
            addLog(`🗼 鎮魔塔第 ${f.floor} 層：挑戰【${f.boss.name}】失敗（${reason || '不敵'}）。`, 'combat', true, 'item');
        }
        $('zm-fight-end-body').innerHTML = html;
        $('zm-fight-end').classList.add('on');
        updateUI();
    }
    // 獎勵：靈石 = 等強度境界主要練功地圖掛機 coinMinutes 分鐘的收入（同 defense.js 的 waveCoins）× 倍率
    function grantRewards(boss, mult) {
        const r = boss.rewards || {}, g = { coins: 0, merit: 0, shards: 0, iron: 0 };
        const pace = realmPacing[Math.min(boss.realm, realmPacing.length - 1)];
        let mapCoins = 0;
        maps.forEach(cat => cat.items.forEach(m => { if (m.name === pace.map) mapCoins = m.coins; }));
        g.coins = Math.floor(mapCoins * KILLS_PER_HOUR_ESTIMATE / 60 * (r.coinMinutes || 0) * mult);
        player.coins += g.coins;
        if (r.merit) { g.merit = Math.floor(randInt(r.merit) * mult); player.merit = (player.merit || 0) + g.merit; settleMeritStones(); }
        if (r.shards) g.shards = addFireShards(Math.floor(randInt(r.shards) * mult));
        if (r.iron) g.iron = addStarIron(Math.floor(randInt(r.iron) * mult));
        return g;
    }

    // ---- 戰鬥演出 ----
    function updateBars() {
        const f = fight; if (!f) return;
        const pe = Math.max(0, f.e.hp / f.e.max), pp = Math.max(0, f.p.hp / f.p.max);
        $('zm-fight-boss-fill').style.width = `${pe * 100}%`;
        $('zm-fight-boss-hp').textContent = `${Math.max(0, Math.floor(f.e.hp)).toWan()} / ${Math.floor(f.e.max).toWan()}`;
        $('zm-fight-me-fill').style.width = `${pp * 100}%`;
        $('zm-fight-me-hp').textContent = `${Math.max(0, Math.floor(f.p.hp)).toWan()} / ${Math.floor(f.p.max).toWan()}`;
        $('zm-fight-round').textContent = `第 ${f.round} 回合`;
    }
    function popNum(who, v, cls) {
        const box = $(who === 'boss' ? 'zm-fight-boss-fx' : 'zm-fight-hero-fx');
        const el = document.createElement('span');
        el.className = `zm-pop ${cls || ''}`;
        el.textContent = typeof v === 'number' ? `-${Math.floor(v).toWan()}` : v;
        el.style.left = `${35 + Math.random() * 30}%`;
        box.appendChild(el);
        setTimeout(() => el.remove(), 1100);
    }
    function slash() {
        const s = $('zm-fight-slash');
        s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
        const hero = $('zm-fight-hero');
        hero.classList.remove('lunge'); void hero.offsetWidth; hero.classList.add('lunge');
    }
    function bossFlash() {
        const el = $('zm-fight');
        el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    }
    function fightLog(text, cls) {
        const box = $('zm-fight-log');
        const d = document.createElement('div');
        d.className = cls || '';
        d.textContent = text;
        box.appendChild(d);
        while (box.children.length > 4) box.firstChild.remove();
    }

    function escapeZm(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    return { open, close, startQuiz, answer, enterBoss, renderHall, state, clearFloor, startFight, skipFight, setFightSpeed, bossStats,
             _quiz: () => quiz, _fight: () => fight };   // 測試用
})();

// ---- onclick 用（index.html #zhenmo-scene、secret-realm.js）----
function openZhenmoTower() { ZhenmoTower.open(); }
function closeZhenmoTower() { ZhenmoTower.close(); }
function startZhenmoQuiz() { ZhenmoTower.startQuiz(); }
function answerZhenmo(i) { ZhenmoTower.answer(i); }
function enterZhenmoBoss() { ZhenmoTower.enterBoss(); }
function backToZhenmoHall() { ZhenmoTower.renderHall(); }
function startZhenmoFight() { ZhenmoTower.startFight(); }
function skipZhenmoFight() { ZhenmoTower.skipFight(); }
function setZhenmoFightSpeed(s) { ZhenmoTower.setFightSpeed(s); }
