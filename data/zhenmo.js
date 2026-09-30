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
        const attrs = { def: boss.def || 0, eva: boss.eva || 0, ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0, element: boss.element || null,
                        race: zhenmoBossRace(boss) };   // 種族（race.js）：手動 race 或依名稱後綴
        if (boss.affix) attrs[boss.affix] = boss.affixVal || 0;
        applyRaceTraits(attrs);   // 種族特性（config-race.js 的 RACE_TRAITS）：鬼物閃避、不中毒、魔修吸血；妖獸氣血在下方 × raceHpMult
        // 新制（第 52 節）：氣血 = 同強度一般玩家每回合輸出 × bossRounds（約 300 回合）；攻擊 = 一般玩家氣血（含增益）÷ bossHitsToKill；hpPerAtk 是舊制比例，不使用
        if (NUMERIC_V2) {
            const L = nv2Level(boss.realm, boss.stage);
            attrs.evaPen = nv2TypHit(L);   // 同階一般玩家的命中，抵銷玩家閃避（2026-09-29，numeric.js）
            const sup = nv2SuppressByL(L);   // 境界壓制：BOSS 境界高於玩家時攻擊與氣血放大（同野外、死守天南城）
            // 攻擊以「含增益」的一般玩家氣血計算：一般玩家約 300 回合打完、BOSS 要 400 下才打倒他；atkMult 1.5／3 的關卡層就會變成門檻
            const atk = Math.round(nv2TypHp(L) * (1 + nv2TypBuff(L) / 100) / NV2.bossHitsToKill * (boss.atkMult || 1) * sup.atk * 100) / 100;   // 2 位小數（畫面 ×100）
            // 扣掉 BOSS 減傷、閃避後，一般玩家剛好約 bossRounds 回合打完；閃避用 BOSS 本身的值（不含種族特性加的閃避，否則氣血會被扣回來、特性等於沒有）
            const through = (1 - attrs.def / 100) * (1 - (boss.eva || 0) / 100);
            return { atk, hp: Math.round(nv2TypNormal(L) * ZHENMO_PLAYER_SKILL_MULT * NV2.bossRounds * through * (boss.hpMult || 1) * sup.hp * raceHpMult(attrs.race)), attrs, sup };
        }
        // 攻擊倍率 atkMult 只放大攻擊；氣血 = 基準攻擊 × hpPerAtk × hpMult（兩者可分開調整）
        const baseAtk = defenseRealmAtk(boss.realm, boss.stage);
        const atk = baseAtk * (boss.atkMult || 1);
        return { atk, hp: baseAtk * (boss.hpPerAtk || 300) * (boss.hpMult || 1), attrs };   // 氣血預設基準攻擊 × 300（2026-09-27 玩家指定）
    }
    // 回合上限：新制 BOSS 要打約 300 回合，上限放寬到 bossMaxRounds（600）
    function maxRounds() { return NUMERIC_V2 ? NV2.bossMaxRounds : ZHENMO_MAX_ROUNDS; }
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
            // 新制 BOSS 攻擊很低、氣血很厚，改顯示「每下約扣你氣血幾 %」
            const hitPct = b.atk / Math.max(1, me.hp) * 100;
            const atkNote = NUMERIC_V2
                ? `每下約你氣血 <span style="color:${hitPct >= 0.5 ? '#f87171' : hitPct >= 0.3 ? '#facc15' : '#4ade80'}">${hitPct.toFixed(2)}%</span>`
                : `<span style="color:${ratio >= 1.5 ? '#f87171' : ratio >= 0.8 ? '#facc15' : '#4ade80'}">你的 ${ratio >= 100 ? '100+' : ratio.toFixed(1)} 倍</span>`;
            $('zm-boss-body').innerHTML = `
                <p class="zm-boss-title">「${escapeZm(boss.title)}」強度：${realms[boss.realm]} ${boss.stage} 階${b.attrs.race ? `・種族 ${raceTag(b.attrs.race)}（${raceTrait(b.attrs.race).desc}）` : ''}</p>
                <p class="zm-note">${escapeZm(boss.intro)}</p>
                <p class="zm-boss-stat">攻擊 ${fmtCombat(b.atk)}（${atkNote}）・氣血 ${fmtCombat(b.hp)}<br>
                    🛡️減傷 ${b.attrs.def}% 💨閃避 ${b.attrs.eva}%${boss.affix ? `・${(combatAttrInfo[boss.affix] || {}).label || boss.affix} ${boss.affixVal}%` : ''}・五行 ${boss.element || '無'}</p>
                ${b.sup && b.sup.gap >= 0.05 ? `<p class="zm-note" style="color:#f87171;">⚠️ 境界壓制：BOSS 高你 ${b.sup.gap.toFixed(1)} 個境界，攻擊 ×${b.sup.atk.toFixed(1)}、氣血 ×${b.sup.hp.toFixed(1)}</p>` : ''}
                ${boss.auras && boss.auras.length ? `<p class="zm-note" style="color:#c4b5fd; text-align:left;">🌀 光環（整場有效，效果相加）<br>${(boss.auras || []).map(a => escapeZm(describeAura(a))).join('<br>')}</p>` : ''}
                <p class="zm-note">擊敗獎勵（× ${p.mult}）：💎 靈石・☯️ 功德 ${r.merit ? r.merit.join('～') : 0}・🔥 異火碎片 ${r.shards ? r.shards.join('～') : 0}・🌠 星允鐵 ${r.iron ? r.iron.join('～') : 0}</p>
                ${zhenmoTreasureGrade(z.floor) >= 0 && b.attrs.race ? `<p class="zm-note" style="color:#fb923c;">🏺 種族關卡：${z.best < z.floor ? `首次擊敗必得【${formatRaceTreasure({ race: b.attrs.race, grade: zhenmoTreasureGrade(z.floor) })}】` : '剋制法寶已於首勝取得'}</p>` : ''}
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
        const aura = combineAuras(boss.auras);   // BOSS 多重光環合併（config-zhenmo.js；elements.js）：壓制玩家、強化自身，整場有效
        const mood = 1 + (Math.random() * 2 - 1) * ZHENMO_BOSS_VARIANCE;   // 本次挑戰的隨機氣勢（攻擊、氣血一起浮動）
        fight = {
            floor: z.floor, boss, mult: p.mult, round: 0, over: false, speed: fight && fight.speed || 1, tid: 0, aura,
            e: { atk: b.atk * auraSelfAtkMult(aura) * mood, hp: b.hp * mood, max: b.hp * mood, attrs: auraSelfAttrs(b.attrs, aura), st: newStatus() },
            p: { atk: me.atk * auraPlayerAtkMult(aura), hp: me.hp, max: me.hp, attrs: auraPlayerAttrs(me.attrs, aura), st: newStatus() }
        };
        const bg = $('zm-fight-bg');
        bg.style.backgroundImage = `url(${boss.img})`;
        bg.style.backgroundPosition = boss.imgFit ? (boss.imgFitPos || '50% 8%') : (boss.imgPos || 'center');
        // imgFit: 'contain'＝橫圖完整顯示在戰鬥畫面上方、其餘補暗底色（例：第 9 層雙人 BOSS，cover 會裁掉一人）
        bg.style.backgroundSize = boss.imgFit || '';
        bg.style.backgroundColor = boss.imgFit ? (boss.imgBg || '#120e0b') : '';
        $('zm-fight-hero').src = player.gender === 'female' ? ZHENMO_HERO_IMG.female : ZHENMO_HERO_IMG.male;
        $('zm-fight-boss-name').textContent = `${boss.name}・${realms[boss.realm]} ${boss.stage} 階`;
        $('zm-fight-me-name').textContent = player.name || '你';
        $('zm-fight-log').innerHTML = '';
        $('zm-fight-end').classList.remove('on');
        $('zm-fight').classList.remove('shake');
        setFightSpeed(fight.speed);
        updateBars();
        show('fight');
        fightLog(`⚔️ ${boss.name}：「${boss.taunt || (boss.skills && boss.skills[0] ? '區區凡人，也敢闖塔？' : '來吧！')}」`, 'boss');   // taunt：選填開場台詞
        if (aura) (boss.auras || []).forEach(a => fightLog(`🌀 ${boss.name}展開光環${describeAura(a)}`, 'boss'));
        const moodPct = Math.round((mood - 1) * 100);
        fightLog(`🔥 ${boss.name}今日氣勢 ${moodPct >= 0 ? '+' : ''}${moodPct}%（攻擊與氣血）`, 'boss');
        fight.tid = setTimeout(step, 700 / fight.speed);
    }
    const HERO_MOVES = ['御劍術', '劍氣縱橫', '驚鴻一劍', '青冥劍訣', '萬劍歸宗'];
    // 一回合：玩家狀態 → 玩家出手 → BOSS 狀態 → BOSS 出手（同 defense.js 的 simulateWave）；instant = 跳過演出
    function round(instant) {
        const f = fight, P = f.p, E = f.e;
        f.round++;
        // BOSS 光環：每回合先擲凍結／燒傷／中毒（下面 tickStatus 立刻生效）、扣玩家最大氣血比例、BOSS 回血（elements.js 的 auraRoundTick）
        const at = auraRoundTick(f.aura, P.st, P.max, E.max, E.atk, P.attrs);
        if (at.regen) E.hp = Math.min(E.max, E.hp + at.regen);
        if (!instant && at.tags.length) fightLog(`🌀 光環侵蝕：${at.tags.map(t => ({ ice: '❄️凍結', fire: '🔥燒傷', poison: '☠️中毒' })[t]).join('、')}`, 'boss');
        const st = tickStatus(P.st);
        st.dot += at.dot;
        if (st.dot) { P.hp -= st.dot; if (!instant) popNum('hero', st.dot, 'dot'); }
        if (P.hp <= 0) return endFight(false, '身中異狀，力竭倒下');
        if (!st.frozen) {
            const hit = resolveHit(P.atk, { attrs: P.attrs, power: P.atk }, { attrs: E.attrs, status: E.st });
            E.hp -= hit.dmg;
            // 新制敏捷連擊：再打一下（第 52 節）
            if (NUMERIC_V2 && Math.random() < nv2Combo()) {
                const extra = resolveHit(P.atk, { attrs: P.attrs, power: P.atk }, { attrs: E.attrs, status: E.st });
                E.hp -= extra.dmg;
                if (!instant && !extra.tags.includes('dodge')) popNum('boss', extra.dmg, 'crit');
            }
            if (!instant) {
                const crit = hit.tags.includes('metal') || hit.tags.includes('thunder');
                popNum('boss', hit.tags.includes('dodge') ? '閃避' : hit.dmg, hit.tags.includes('dodge') ? 'miss' : crit ? 'crit' : '');
                slash();
                if (f.round % 3 === 1 || crit) fightLog(`🗡️ 你施展【${HERO_MOVES[f.round % HERO_MOVES.length]}】${hit.tags.includes('dodge') ? '，被閃開了' : `，造成 ${fmtCombat(hit.dmg)} 傷害${crit ? '（暴擊）' : ''}`}`, 'me');
            }
        } else if (!instant) fightLog('❄️ 你被凍結，無法出手', 'me');
        const et = tickStatus(E.st);
        if (et.dot) { E.hp -= et.dot; if (!instant) popNum('boss', et.dot, 'dot'); }
        if (E.hp <= 0) return endFight(true);
        if (!et.frozen) {
            const hit = resolveHit(E.atk, { attrs: E.attrs, power: E.atk }, { attrs: P.attrs, status: P.st });
            hit.dmg *= auraCurseMult(f.aura);   // 光環詛咒：受到的傷害提高
            P.hp -= hit.dmg;
            E.hp = Math.min(E.max, E.hp + raceLifestealHeal(E.attrs, hit.dmg));   // 種族特性：魔修吸血（race.js）
            if (!instant) {
                popNum('hero', hit.tags.includes('dodge') ? '閃避' : hit.dmg, hit.tags.includes('dodge') ? 'miss' : 'hurt');
                bossFlash();
                if (f.round % 3 === 2) fightLog(`${f.boss.icon || '⚡'} ${f.boss.name}施展【${f.boss.skills[f.round % f.boss.skills.length]}】${hit.tags.includes('dodge') ? '，被你閃過' : `，你受到 ${fmtCombat(hit.dmg)} 傷害`}`, 'boss');
            }
        }
        if (P.hp <= 0) return endFight(false, `被${f.boss.name}擊倒`);
        if (f.round >= maxRounds()) return endFight(false, `久戰 ${maxRounds()} 回合未能擊倒${f.boss.name}`);
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
        if (win) addRaceKill(zhenmoBossRace(f.boss), 1);   // 斬妖錄（race.js）
        updateBars();
        const z = state();
        let html;
        if (win) {
            const firstClear = z.best < f.floor;   // clearFloor 前判斷；第 100 層可重打，法寶只給首勝
            const mult = clearFloor();
            const g = grantRewards(f.boss, mult, f.floor);
            // 種族關卡（樓主層）：首次擊敗必得該 BOSS 種族的剋制法寶（race.js）
            const tg = zhenmoTreasureGrade(f.floor), race = zhenmoBossRace(f.boss);
            if (firstClear && tg >= 0 && race) g.treasure = grantRaceTreasure(race, tg, `鎮壓鎮魔塔第 ${f.floor} 層樓主，`);
            html = `<div class="big win">鎮壓成功</div>
                <p>第 ${f.floor} 層【${escapeZm(f.boss.name)}】伏誅（${f.round} 回合）</p>
                <p class="zm-reward">獎勵 ×${mult}<br>💎 靈石 ${g.coins.toWan()}<br>☯️ 功德 ${g.merit.toWan()}${g.shards ? `<br>🔥 異火碎片 ×${g.shards}` : ''}${g.iron ? `<br>🌠 星允鐵 ×${g.iron}` : ''}${g.blueprint ? `<br>📜 鍛造圖紙 ×1` : ''}${g.treasure ? `<br>${formatRaceTreasure(g.treasure, true)}` : ''}${g.partner ? `<br>🧩 ${escapeZm(getPartnerTier(g.partner.p).name)}【${escapeZm(g.partner.p.name)}】碎片 ×${g.partner.n}（${Math.min(getPartnerShards(g.partner.p.id), getPartnerShardsNeed(g.partner.p))}/${getPartnerShardsNeed(g.partner.p)}）` : ''}</p>
                <p class="zm-note">已鎮壓 ${z.best} 層，前往第 ${z.floor} 層須重新答題。</p>`;
            addLog(`🗼 鎮魔塔第 ${f.floor} 層：擊敗【${f.boss.name}】！獎勵 ×${mult}：靈石 ${g.coins.toWan()}、功德 ${g.merit.toWan()}${g.shards ? `、異火碎片 ×${g.shards}` : ''}${g.iron ? `、星允鐵 ×${g.iron}` : ''}`, 'level-up', true, 'item');
            if (g.blueprint) addLog(g.blueprint, 'level-up', true, 'item');
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
    function grantRewards(boss, mult, floor) {
        const r = boss.rewards || {}, g = { coins: 0, merit: 0, shards: 0, iron: 0 };
        const pace = realmPacing[Math.min(boss.realm, realmPacing.length - 1)];
        let mapCoins = 0;
        maps.forEach(cat => cat.items.forEach(m => { if (m.name === pace.map) mapCoins = m.coins; }));
        g.coins = Math.floor(mapCoins * KILLS_PER_HOUR_ESTIMATE / 60 * (r.coinMinutes || 0) * mult);
        player.coins += g.coins;
        if (r.merit) { g.merit = Math.floor(randInt(r.merit) * mult); player.merit = (player.merit || 0) + g.merit; settleMeritStones(); }
        if (r.shards) g.shards = addFireShards(Math.floor(randInt(r.shards) * mult));
        if (r.iron) g.iron = addStarIron(Math.floor(randInt(r.iron) * mult));
        // 鍛造圖紙（Lv.1500 以上，equipment.js）：基礎機率 × 問答倍率，最高 75%
        g.blueprint = grantBlueprint(Math.min(BLUEPRINT_DROPS.zhenmo.max, BLUEPRINT_DROPS.zhenmo.base * mult), `鎮壓【${boss.name}】，`);
        // 夥伴相遇（config-zhenmo.js 的 ZHENMO_PARTNER_MEET）
        const meet = ZHENMO_PARTNER_MEET.find(m => floor >= m.from && floor <= m.to);
        if (meet) g.partner = grantPartnerShards(meet.tiers, meet.chance, meet.shards, `鎮壓鎮魔塔第 ${floor} 層`);   // { p, n } 或 null
        return g;
    }

    // ---- 戰鬥演出 ----
    function updateBars() {
        const f = fight; if (!f) return;
        const pe = Math.max(0, f.e.hp / f.e.max), pp = Math.max(0, f.p.hp / f.p.max);
        $('zm-fight-boss-fill').style.width = `${pe * 100}%`;
        $('zm-fight-boss-hp').textContent = `${fmtCombat(Math.max(0, f.e.hp))} / ${fmtCombat(f.e.max)}`;
        $('zm-fight-me-fill').style.width = `${pp * 100}%`;
        $('zm-fight-me-hp').textContent = `${fmtCombat(Math.max(0, f.p.hp))} / ${fmtCombat(f.p.max)}`;
        $('zm-fight-round').textContent = `第 ${f.round} 回合`;
    }
    function popNum(who, v, cls) {
        const box = $(who === 'boss' ? 'zm-fight-boss-fx' : 'zm-fight-hero-fx');
        const el = document.createElement('span');
        el.className = `zm-pop ${cls || ''}`;
        el.textContent = typeof v === 'number' ? `-${fmtCombat(v)}` : v;   // 舊制取整、新制 ×100（format.js）
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
        el.style.setProperty('--zm-flash', fight && fight.boss.flash || 'rgba(191, 219, 254, 0.35)');   // BOSS 出手閃光顏色（config 的 flash）
        el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    }
    function fightLog(text, cls) {
        const box = $('zm-fight-log');
        const d = document.createElement('div');
        d.className = cls || '';
        d.textContent = text;
        box.appendChild(d);
        while (box.children.length > 3) box.firstChild.remove();   // 戰況在右上、BOSS 血條下方，最多 3 行以免遮住畫面
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
