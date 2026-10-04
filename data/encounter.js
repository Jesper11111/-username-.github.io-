// 奇遇・異界空間（ARCHITECTURE.md 第 63 節；設定在 config-encounter.js）
// 觸發：map.js 的 changeMap() 成功後呼叫 onEncounterMapChange(地圖, 是否安全區)
//   ① 秘密路線 → 虛天殿（闖關）② 累計進入野外次數 → 血色禁地（戰棋）③ 空間裂縫（隨機）④ 每週一次三界戰場
// 觸發後「封存」：右側出現 🌀 入口（#enc-fab），玩家點了才進入全螢幕異界（#enc-scene），進入後不能離開，只能認輸／略過。
// 存檔欄位 player.encounter = { pending: [{ id, type, src, at, exp }], daily: { date, n }, fieldEnters, route: [{ n, t }],
//   week, active, stats: { rogue: { runs, clears, best }, tactics: { runs, wins, best }, arena: { runs, best } } }
// 三個小遊戲的程式包在 IIFE 內（全部腳本共用全域作用域，避免撞名），對外只有下面三個全域函式。

const Encounter = (() => {
    const $ = id => document.getElementById(id);
    const rnd = n => Math.floor(Math.random() * n);
    const pick = a => a[rnd(a.length)];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    let runToken = 0;   // 每次進入異界 +1；非同步演出（戰棋敵方回合、三界戰場對決）看到 token 變了就停止
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ==================== 存檔狀態 ====================
    function st() {
        let s = player.encounter;
        if (!s || typeof s !== 'object') s = player.encounter = {};
        if (!Array.isArray(s.pending)) s.pending = [];
        if (!s.daily || typeof s.daily !== 'object') s.daily = { date: '', n: 0 };
        if (typeof s.fieldEnters !== 'number') s.fieldEnters = 0;
        if (!Array.isArray(s.route)) s.route = [];
        if (!s.chanceDaily || typeof s.chanceDaily !== 'object') s.chanceDaily = { date: '', n: 0 };
        if (!s.questDaily || typeof s.questDaily !== 'object') s.questDaily = { date: '', n: 0 };
        if (!s.stats || typeof s.stats !== 'object') s.stats = {};
        Object.keys(ENCOUNTER_TYPES).forEach(k => { if (!s.stats[k]) s.stats[k] = { runs: 0, clears: 0, wins: 0, best: null }; });
        if (!s.stats.quest) s.stats.quest = { runs: 0, clears: 0, wins: 0, best: null };
        return s;
    }
    const catOf = type => (ENCOUNTER_TYPES[type] || {}).cat || 'otherworld';
    function counterOf(cat) {
        const s = st(), key = cat === 'chance' ? 'chanceDaily' : cat === 'quest' ? 'questDaily' : 'daily';
        if (s[key].date !== todayKey()) s[key] = { date: todayKey(), n: 0 };
        return s[key];
    }
    function capOf(cat) { return cat === 'chance' ? ENCOUNTER_CHANCE_DAILY_MAX : cat === 'quest' ? ENCOUNTER_QUEST.daily : ENCOUNTER_DAILY_MAX; }
    function pickWeighted(pool) {
        const keys = Object.keys(pool);
        let r = Math.random() * keys.reduce((a, k) => a + pool[k], 0);
        for (const k of keys) { if ((r -= pool[k]) < 0) return k; }
        return keys[0];
    }
    function todayKey() { return new Date().toDateString(); }
    function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; }
    function weekKey() { return weekStart().toDateString(); }
    function weekEndTs() { return weekStart().getTime() + 7 * 86400000; }
    function dailyLeft(cat) { return capOf(cat || 'otherworld') - counterOf(cat || 'otherworld').n; }

    // ==================== 觸發 ====================
    function trigger(type, src, exp) {
        const s = st(), cat = catOf(type);
        if (cat !== 'weekly' && dailyLeft(cat) <= 0) return false;
        if (s.pending.length >= ENCOUNTER_PENDING_MAX) return false;
        const now = Date.now();
        s.pending.push({ id: now + '_' + rnd(1e6), type, src, at: now, exp: exp || now + ENCOUNTER_EXPIRE_HOURS * 3600000 });
        if (cat !== 'weekly') counterOf(cat).n++;
        const T = ENCOUNTER_TYPES[type];
        addLog(`🌀 【${ENCOUNTER_SOURCES[src]}】${T.title}！${T.desc}點畫面右側的「🌀 異界」進入（${src === 'weekly' ? '本週內' : ENCOUNTER_EXPIRE_HOURS + ' 小時內'}有效）。`, 'level-up');
        if (typeof showToast === 'function') showToast(`🌀 ${T.title}！點右側「異界」進入`, 'ok');
        renderFab();
        return true;
    }
    function routeMatch(route) {
        const want = ENCOUNTER_ROUTE.maps;
        if (route.length < want.length) return false;
        const tail = route.slice(-want.length);
        if (!tail.every((r, i) => r.n === want[i])) return false;
        return tail[tail.length - 1].t - tail[0].t <= ENCOUNTER_ROUTE.routeMinutes * 60000;
    }
    // 目前的奇遇＝人界機緣（2026-10-04 使用者：「目前機緣設定人界機緣，靈界的另外設定」）：靈界分類（LINGJIE_MAP_CATEGORIES）的地圖不觸發
    function isLingjieMap(map) {
        if (typeof LINGJIE_MAP_CATEGORIES === 'undefined' || !map) return false;
        return LINGJIE_MAP_CATEGORIES.some(c => maps[c] && maps[c].items.some(m => m.name === map.name));
    }
    function onMapChange(map, isSafe) {
        if (typeof player === 'undefined' || !player || !map) return;
        if (isLingjieMap(map)) return;
        const s = st();
        expire();
        const now = Date.now();
        // ④ 三界戰場：每週第一次切換地圖（封存成功才記這週）
        if (s.week !== weekKey() && trigger('arena', 'weekly', weekEndTs())) s.week = weekKey();
        // ① 秘密路線
        s.route.push({ n: map.name, t: now });
        s.route = s.route.slice(-ENCOUNTER_ROUTE.maps.length);
        if (routeMatch(s.route) && trigger('rogue', 'route')) s.route = [];
        if (!isSafe) {
            // ② 累計次數（今天額滿時停在門檻，隔天第一次進野外觸發）；③ 空間裂縫
            s.fieldEnters++;
            if (s.fieldEnters >= ENCOUNTER_COUNT.fieldEnters) {
                if (trigger('tactics', 'count')) s.fieldEnters = 0;
                else s.fieldEnters = ENCOUNTER_COUNT.fieldEnters;
            } else if (Math.random() < ENCOUNTER_RIFT.chance) trigger(pickWeighted(ENCOUNTER_RIFT.pool), 'rift');
        }
        // ④ 城中機緣、機緣任務（天南城／天星城）
        if (ENCOUNTER_TOWN.maps.includes(map.name)) {
            if (Math.random() < ENCOUNTER_TOWN.chance) trigger(pickWeighted(ENCOUNTER_TOWN.pool), 'town');
            if (!s.quest && dailyLeft('quest') > 0 && Math.random() < ENCOUNTER_QUEST.chance) offerQuest(map.name);
        }
        questProgress(map, isSafe);
        if (map.name === ENCOUNTER_RUMOR.map && Math.random() < ENCOUNTER_RUMOR.chance) addLog(ENCOUNTER_RUMOR.text, 'system');
        renderFab();
    }

    // ==================== 機緣任務（支線，三步） ====================
    // s.quest = { name, intro, steps: [{ kind: 'visit', map } | { kind: 'kill', n, base }], i, exp }
    function questMaps(safe) {
        const out = [];
        maps.forEach((cat, c) => cat.items.forEach((m, i) => {
            if (m.hidden || !!cat.isSafe !== safe) return;
            if (typeof LINGJIE_MAP_CATEGORIES !== 'undefined' && LINGJIE_MAP_CATEGORIES.includes(c)) return;   // 機緣任務只指定人界地圖
            if (safe && !ENCOUNTER_TOWN.maps.includes(m.name)) return;
            if (!safe && typeof getMapEntryBlock === 'function' && getMapEntryBlock(c, i)) return;
            out.push(m.name);
        }));
        return out;
    }
    function offerQuest(here) {
        const s = st(), tpl = pick(ENCOUNTER_QUEST.templates);
        const fields = questMaps(false), towns = questMaps(true);
        if (!fields.length || !towns.length) return;
        // 第一步若是城鎮，不選玩家現在所在的城（否則一接就完成）
        const steps = tpl.steps.map((k, i) => k === 'kill' ? { kind: 'kill', n: randIn(ENCOUNTER_QUEST.killN) }
            : { kind: 'visit', map: pick(k === 'town' ? (i === 0 && towns.filter(n => n !== here).length ? towns.filter(n => n !== here) : towns) : fields) });
        // 同一張地圖不要連續出現兩次（到了就直接完成兩步）
        for (let i = 1; i < steps.length; i++) if (steps[i].kind === 'visit' && steps[i - 1].kind === 'visit' && steps[i].map === steps[i - 1].map) {
            const alt = (fields.includes(steps[i].map) ? fields : towns).filter(n => n !== steps[i].map);
            if (alt.length) steps[i].map = pick(alt);
        }
        s.quest = { name: tpl.name, intro: tpl.intro, steps, i: 0, exp: Date.now() + ENCOUNTER_QUEST.expireHours * 3600000 };
        counterOf('quest').n++;
        s.stats.quest.runs++;
        startStep(s.quest);
        addLog(`📜 【機緣任務・${tpl.name}】${tpl.intro}第一步：${stepText(steps[0])}。（點左側「🌀 異界」查看進度）`, 'level-up');
        if (typeof showToast === 'function') showToast(`📜 接到機緣任務「${tpl.name}」`, 'ok');
    }
    function startStep(q) { const stp = q.steps[q.i]; if (stp && stp.kind === 'kill') stp.base = player.fieldKills || 0; }
    function stepText(stp, withProgress) {
        if (stp.kind === 'visit') return `前往【${stp.map}】`;
        const done = Math.max(0, (player.fieldKills || 0) - (stp.base || 0));
        return `在野外擊殺 ${stp.n} 隻妖獸${withProgress && typeof stp.base === 'number' ? `（${Math.min(done, stp.n)}/${stp.n}）` : ''}`;
    }
    // 檢查目前步驟（切換地圖時、每分鐘、開清單時）；可一次推進多步
    function questProgress(map) {
        const s = st(), q = s.quest;
        if (!q) return;
        if (q.exp <= Date.now()) { s.quest = null; addLog(`🌫️ 機緣任務「${q.name}」逾時，托付之人已離去。`, 'system'); return; }
        let moved = false;
        for (;;) {
            const stp = q.steps[q.i];
            if (!stp) break;
            const ok = stp.kind === 'visit' ? !!(map && map.name === stp.map) : (player.fieldKills || 0) - (stp.base || 0) >= stp.n;
            if (!ok) break;
            q.i++; moved = true; map = null;   // 同一次換圖只算一個前往步驟
            startStep(q);
        }
        if (!moved) return;
        if (q.i >= q.steps.length) {
            s.quest = null;
            s.stats.quest.clears++;
            const R = ENCOUNTER_REWARDS.quest;
            const lines = grant({ coins: H() * R.h, spellShards: R.spell }, `機緣任務「${q.name}」完成`);
            if (typeof showToast === 'function') showToast(`📜 機緣任務「${q.name}」完成！`, 'ok');
            if (!lines.length) addLog(`📜 機緣任務「${q.name}」完成。`, 'level-up');
        } else addLog(`📜 機緣任務「${q.name}」進展：下一步 ${stepText(q.steps[q.i])}。`, 'system');
    }
    function expire() {
        const s = st(), now = Date.now();
        const gone = s.pending.filter(p => p.exp <= now);
        if (!gone.length) return;
        s.pending = s.pending.filter(p => p.exp > now);
        gone.forEach(p => addLog(`🌫️ 封存的奇遇「${ENCOUNTER_TYPES[p.type].title}」已經消散。`, 'system'));
        renderFab();
    }

    // ==================== 入口與清單 ====================
    function renderFab() {
        if (typeof player === 'undefined' || !player) return;
        let b = $('enc-fab');
        if (!b) {
            b = document.createElement('button');
            b.id = 'enc-fab';
            b.onclick = openList;
            document.body.appendChild(b);
        }
        const n = st().pending.length, q = st().quest;
        const inScene = $('enc-scene') && $('enc-scene').style.display === 'block';
        b.style.display = (n || q) && !inScene && (typeof gameStarted === 'undefined' || gameStarted) ? 'flex' : 'none';
        b.innerHTML = `<span class="enc-fab-icon">🌀</span><span class="enc-fab-text">${n ? '異界' : '任務'}</span>${n ? `<span class="enc-fab-badge">${n}</span>` : ''}${q ? '<span class="enc-fab-quest">📜</span>' : ''}`;
    }
    function leftText(ms) {
        const h = Math.floor(ms / 3600000), m = Math.max(1, Math.floor(ms % 3600000 / 60000));
        return h >= 24 ? `${Math.floor(h / 24)} 天 ${h % 24} 小時` : h ? `${h} 小時 ${m} 分` : `${m} 分鐘`;
    }
    function openList() {
        expire();
        questProgress(null);
        const s = st(), now = Date.now();
        let box = $('enc-list');
        if (!box) { box = document.createElement('div'); box.id = 'enc-list'; document.body.appendChild(box); }
        const rows = s.pending.map(p => {
            const T = ENCOUNTER_TYPES[p.type];
            return `<div class="enc-card"><div class="enc-card-main"><b>${T.icon} ${T.title}</b>
                <small>${ENCOUNTER_SOURCES[p.src]}・剩 ${leftText(p.exp - now)}</small><small>${T.desc}</small></div>
                <button class="sys-btn enc-go" data-id="${p.id}">進入異界</button></div>`;
        }).join('') || '<p class="enc-muted">目前沒有封存的奇遇。</p>';
        const S = s.stats, q = s.quest;
        const questHtml = q ? `<div class="enc-card enc-quest"><div class="enc-card-main"><b>📜 機緣任務・${q.name}</b><small>${q.intro}剩 ${leftText(q.exp - now)}</small>
            ${q.steps.map((stp, i) => `<small class="${i < q.i ? 'c-jade' : i === q.i ? 'c-gold' : ''}">${i < q.i ? '✔' : i === q.i ? '▶' : '・'} ${stepText(stp, i === q.i)}</small>`).join('')}
            <small>完成獎勵：靈石 ${Math.floor(H() * ENCOUNTER_REWARDS.quest.h).toWan()}（約 ${ENCOUNTER_REWARDS.quest.h} 小時練功收入）、秘典碎片 ×${ENCOUNTER_REWARDS.quest.spell}</small>
            <small class="enc-muted">※「前往」要從大地圖（人界地圖分區／城鎮紅點）進入才算，右上快捷清單不算。</small></div></div>`
            : '<p class="enc-muted">目前沒有機緣任務（到天南城、天星城走走，也許有人托付）。</p>';
        box.innerHTML = `<div class="enc-list-card">
            <h3>🌀 異界與機緣</h3>
            <p class="enc-muted">進入後會被強制留在異界，直到分出結果（可以認輸）。今天還能觸發：異界 ${Math.max(0, dailyLeft('otherworld'))}／${ENCOUNTER_DAILY_MAX}、機緣 ${Math.max(0, dailyLeft('chance'))}／${ENCOUNTER_CHANCE_DAILY_MAX}。</p>
            ${rows}
            <h4>機緣任務</h4>${questHtml}
            <h4>奇遇紀錄</h4>
            <div class="enc-muted">📜 下品武學秘典碎片：${player.spellShards || 0}／${SPELL_SHARD_NEED}（到武學密典合成）<br>
            🏯 虛天殿：${S.rogue.runs} 次、通關 ${S.rogue.clears} 次${S.rogue.best ? `、最深第 ${S.rogue.best} 層` : ''}<br>
            🩸 血色禁地：${S.tactics.runs} 次、勝 ${S.tactics.wins} 次${S.tactics.best ? `、最快 ${S.tactics.best} 回合` : ''}<br>
            ⚔️ 三界戰場：${S.arena.runs} 屆${S.arena.best ? `、最佳 ${placeName(S.arena.best)}` : ''}<br>
            🌟 強者現身：${S.master.runs} 次｜🐎 靈獸競速：${S.petrace.runs} 場、奪冠 ${S.petrace.wins} 次｜⛏️ 古洞尋寶：${S.dig.runs} 次｜⚗️ 丹爐試火：${S.alch.runs} 次${S.alch.best ? `（最高 ${S.alch.best} 分）` : ''}<br>
            📜 機緣任務：完成 ${S.quest.clears}／${S.quest.runs}</div>
            <button class="sys-btn close-btn" id="enc-list-close">關閉</button></div>`;
        box.style.display = 'flex';
        box.querySelectorAll('.enc-go').forEach(b => b.onclick = () => enter(b.dataset.id));
        $('enc-list-close').onclick = () => { box.style.display = 'none'; };
    }
    function enter(id) {
        const s = st();
        const i = s.pending.findIndex(p => p.id === id);
        if (i < 0) return;
        const p = s.pending.splice(i, 1)[0];
        s.active = { type: p.type, at: Date.now() };
        s.stats[p.type].runs++;
        if ($('enc-list')) $('enc-list').style.display = 'none';
        if (typeof saveLocal === 'function') saveLocal();
        runToken++;
        openScene(p.type);
        ({ rogue: rgStart, tactics: tcStart, arena: arStart, master: msStart, petrace: prStart, dig: dgStart, alch: alStart }[p.type] || rgStart)();
    }

    // ==================== 異界畫面（全螢幕，沒有關閉鈕） ====================
    function openScene(type) {
        let el = $('enc-scene');
        if (!el) { el = document.createElement('div'); el.id = 'enc-scene'; document.body.appendChild(el); }
        const T = ENCOUNTER_TYPES[type];
        el.className = 'enc-' + type;
        el.innerHTML = `<div class="enc-wrap"><div class="enc-head">
            <div><div class="enc-title">${T.icon} ${T.name}</div><div class="enc-muted" id="enc-sub">異界空間・無法離開</div></div>
            <button class="sys-btn enc-act" id="enc-act"></button></div><div id="enc-body"></div></div>`;
        el.style.display = 'block';
        renderFab();
    }
    function setAction(label, fn) {
        const b = $('enc-act');
        if (!b) return;
        b.style.display = label ? '' : 'none';
        b.textContent = label || '';
        b.onclick = fn || null;
    }
    function closeScene() {
        runToken++;
        const el = $('enc-scene');
        if (el) { el.style.display = 'none'; el.innerHTML = ''; }
        st().active = null;
        if (typeof saveLocal === 'function') saveLocal();
        renderFab();
    }
    // 結算畫面：win＝勝負樣式，lines＝獎勵文字
    function showResult(win, title, msg, lines) {
        setAction(null);
        // 化神訣殘本（元神，config-yuanshen.js）：每次異界結算 50～150（勝負都給）
        if (typeof addHuashenScroll === 'function') {
            const n = addHuashenScroll(rollHuashenScroll(HUASHEN_SCROLL_DROPS.encounter));
            if (n) { lines = lines.concat(`📖 化神訣殘本 ×${n}`); addLog(`🌀 異界結算：化神訣殘本 ×${n}`, 'level-up', false, 'item'); }
        }
        $('enc-body').innerHTML = `<div class="enc-result ${win ? 'win' : 'lose'}">${title}</div>
            <p class="enc-muted" style="text-align:center">${msg}</p>
            <div class="enc-rewards">${lines.length ? lines.map(l => `<div>${l}</div>`).join('') : '<div class="enc-muted">沒有獲得獎勵。</div>'}</div>
            <div style="text-align:center"><button class="sys-btn enc-primary" id="enc-leave">離開異界</button></div>`;
        $('enc-leave').onclick = closeScene;
    }

    // ==================== 實力換算與獎勵 ====================
    // 對「同境界一般玩家」的倍率：fa 攻擊、fh 氣血、f 綜合（舊制一律 1）
    function powerFactor() {
        try {
            if (typeof NUMERIC_V2 === 'undefined' || !NUMERIC_V2) return { fa: 1, fh: 1, f: 1 };
            const L = nv2Level(player.realmIndex, player.stage);
            const [lo, hi] = ENCOUNTER_POWER_CLAMP;
            const fa = clamp(nv2CombatPower() / (nv2TypNormal(L) * nv2TypRoundMult(L)), lo, hi);
            const fh = clamp(nv2MaxHp() / nv2TypHp(L), lo, hi);
            return { fa, fh, f: Math.sqrt(fa * fh) };
        } catch (e) { return { fa: 1, fh: 1, f: 1 }; }
    }
    const H = () => (typeof getHourlyIncome === 'function' ? getHourlyIncome() : 10000);
    const randIn = ([a, b]) => a + rnd(b - a + 1);
    // r = { coins, starIron, butianStones, breakPills, beastCore, spellShards, fire, partner: { tiers, chance, amount },
    //       partnerShards: { p, n }（指定夥伴）, treasure: { race?, grade } }；回傳顯示用文字陣列
    function grant(r, label) {
        const lines = [], mail = {};
        ['coins', 'starIron', 'butianStones', 'breakPills'].forEach(k => { if (r[k] > 0) mail[k] = Math.floor(r[k]); });
        if (Object.keys(mail).length) { grantMailRewards(mail); lines.push(formatMailRewards(mail)); }
        if (r.beastCore > 0) { player.beastCore = (player.beastCore || 0) + Math.floor(r.beastCore); lines.push(`🐾 獸丹 ${Math.floor(r.beastCore).toWan()}`); }
        if (r.spellShards > 0 && typeof addSpellShards === 'function') { addSpellShards(r.spellShards); lines.push(`📜 下品武學秘典碎片 ×${Math.floor(r.spellShards)}（${player.spellShards}／${SPELL_SHARD_NEED}）`); }
        if (r.fire > 0) { addFireShards(r.fire, label); lines.push(`🔥 異火碎片 ×${r.fire}`); }
        if (r.partner && typeof grantPartnerShards === 'function') {
            const g = grantPartnerShards(r.partner.tiers, r.partner.chance, r.partner.amount, label);
            if (g) lines.push(`🧩 【${g.p.title}・${g.p.name}】碎片 ×${g.n}`);
        }
        if (r.partnerShards && typeof addPartnerShards === 'function') {
            const g = addPartnerShards(r.partnerShards.p, r.partnerShards.n, label);
            if (g) lines.push(`🧩 ${getPartnerTier(g.p).name}【${g.p.title}・${g.p.name}】碎片 ×${g.n}（${Math.min(getPartnerShards(g.p.id), getPartnerShardsNeed(g.p))}／${getPartnerShardsNeed(g.p)}）`);
        }
        if (r.treasure && typeof grantRaceTreasure === 'function') {
            const race = r.treasure.race || pick(Object.keys(RACE_TREASURES));
            const t = grantRaceTreasure(race, r.treasure.grade, label + '，');
            if (t) lines.push(`🏺 剋制法寶【${formatRaceTreasure(t)}】`);
        }
        if (lines.length) addLog(`🌀 ${label}：${lines.join('、')}`, 'level-up', false, 'item');
        if (typeof updateUI === 'function') updateUI();
        if (typeof saveLocal === 'function') saveLocal();
        return lines;
    }

    // =====================================================================
    // 闖關・虛天殿（Roguelike 八層）
    // =====================================================================
    const ARTS = [
        { id: 'qy', name: '青元劍訣', desc: '攻擊 +25%', apply: p => p.atkPct += 0.25 },
        { id: 'ly', name: '羅煙步', desc: '15% 機率閃避攻擊', apply: p => p.evade += 0.15 },
        { id: 'dy', name: '大衍訣', desc: '法術消耗 −5 靈力', apply: p => p.mpDisc += 5 },
        { id: 'cc', name: '長春功', desc: '每場勝利回復 12% 氣血', apply: p => p.postHeal += 0.12 },
        { id: 'xb', name: '玄冰甲', desc: '防禦 +3', apply: p => p.def += 3 },
        { id: 'sj', name: '噬金蟲', desc: '每回合額外造成 4 點傷害', apply: p => p.extra += 4 },
        { id: 'xl', name: '血靈鑽', desc: '劍訣傷害的 20% 轉為氣血', apply: p => p.steal += 0.2 },
        { id: 'zy', name: '紫羅極火', desc: '法術倍率 1.8 → 2.4', apply: p => p.spellMult = 2.4 },
        { id: 'gl', name: '乾藍冰焰', desc: '每場戰鬥開場獲得 10 點護體', apply: p => p.startBlock += 10 },
        { id: 'ds', name: '大庚劍陣', desc: '劍訣無視 3 點防禦並 +2 傷害', apply: p => p.pierce += 3 },
    ];
    const RG_FOES = {
        normal: [
            { name: '噬金蟲群', hp: 22, atk: 6, def: 0, pat: ['atk', 'atk', 'multi'] },
            { name: '血線蛟', hp: 28, atk: 7, def: 1, pat: ['atk', 'guard', 'heavy'] },
            { name: '鬼靈門弟子', hp: 26, atk: 8, def: 0, pat: ['atk', 'charge', 'heavy'] },
            { name: '陰羅宗傀儡', hp: 30, atk: 6, def: 2, pat: ['guard', 'atk', 'multi'] },
        ],
        elite: [
            { name: '金背蒼猿', hp: 52, atk: 9, def: 3, pat: ['atk', 'guard', 'atk', 'heavy'] },
            { name: '化形火蟒', hp: 48, atk: 10, def: 1, pat: ['charge', 'heavy', 'atk', 'multi'] },
        ],
        boss: { name: '虛天殿・守鼎傀儡', hp: 170, atk: 15, def: 3, pat: ['atk', 'guard', 'charge', 'heavy', 'multi'] },
    };
    const RG_ROWS = 8, RG_COLS = 4;
    let P, MAP, C, RMODE, RDATA;

    function rgStart() {
        const pf = powerFactor();
        const hp = Math.round(60 * pf.fh);
        P = { hp, maxHp: hp, atk: Math.max(6, Math.round(10 * pf.fa)), def: 2, mp: 30, maxMp: 30, pills: 2, stones: 0, arts: [],
              atkPct: 0, evade: 0, mpDisc: 0, postHeal: 0, extra: 0, steal: 0, spellMult: 1.8, startBlock: 0, pierce: 0, block: 0, pos: null };
        MAP = rgBuildMap(); C = null; RMODE = 'map'; RDATA = null;
        $('enc-sub').textContent = '八層殿堂・由上往下闖';
        $('enc-body').innerHTML = `<div class="enc-grid"><div class="enc-box"><div class="rg-map" id="rg-map"></div>
            <div class="enc-legend"><span><b>戰</b>妖獸</span><span><b class="c-violet">精</b>精英</span><span><b class="c-azure">奇</b>奇遇</span>
            <span><b class="c-gold">寶</b>寶箱</span><span><b class="c-jade">息</b>調息</span><span><b class="c-red">王</b>首領</span></div></div>
            <div class="enc-box enc-stack"><div id="rg-stat" class="enc-stack"></div><div class="enc-scene-box" id="rg-scene"></div><div class="enc-log" id="rg-log"></div></div></div>`;
        setAction('認輸', async () => { if (await gameConfirm('確定要認輸離開虛天殿嗎？已闖過的層數仍有獎勵。')) rgEnd(false, true); });
        rgLog(`踏入<b>虛天殿</b>。實力換算：攻擊 ×${pf.fa.toFixed(2)}、氣血 ×${pf.fh.toFixed(2)}（對同境界一般修士）。`);
        rgRender();
    }
    function rgLog(html) { const d = document.createElement('div'); d.innerHTML = html; $('rg-log').prepend(d); }
    function rgBuildMap() {
        const rows = [];
        for (let r = 0; r < RG_ROWS; r++) {
            if (r === RG_ROWS - 1) { rows.push([{ r, c: 1.5, type: '王' }]); continue; }
            const n = r === 0 ? 3 : 2 + rnd(3);
            const cols = shuffle([0, 1, 2, 3]).slice(0, n).sort((a, b) => a - b);
            rows.push(cols.map(c => ({ r, c, type: rgNodeType(r) })));
        }
        const nodes = [];
        rows.forEach(row => row.forEach(nd => { nd.id = nodes.length; nd.next = []; nd.prev = 0; nodes.push(nd); }));
        const link = (a, b) => { if (!a.next.includes(b.id)) { a.next.push(b.id); b.prev++; } };
        for (let r = 0; r < RG_ROWS - 1; r++) {
            const nxt = rows[r + 1];
            rows[r].forEach(a => {
                let cand = nxt.filter(b => Math.abs(b.c - a.c) <= 1);
                if (!cand.length) { const m = Math.min(...nxt.map(b => Math.abs(b.c - a.c))); cand = nxt.filter(b => Math.abs(b.c - a.c) === m); }
                shuffle(cand).slice(0, 1 + (cand.length > 1 && Math.random() < 0.45 ? 1 : 0)).forEach(b => link(a, b));
            });
            nxt.forEach(b => {
                if (b.prev) return;
                const m = Math.min(...rows[r].map(a => Math.abs(b.c - a.c)));
                link(pick(rows[r].filter(a => Math.abs(b.c - a.c) === m)), b);
            });
        }
        return { rows, nodes };
    }
    function rgNodeType(r) {
        if (r === 0) return '戰';
        if (r === RG_ROWS - 2) return '息';
        const pool = [['戰', 45], ['奇', 22], ['寶', 10]];
        if (r >= 2) pool.push(['精', 14]);
        if (r >= 3) pool.push(['息', 9]);
        let t = rnd(pool.reduce((s, x) => s + x[1], 0));
        for (const [k, w] of pool) { if ((t -= w) < 0) return k; }
        return '戰';
    }
    function rgOpen() {
        if (RMODE !== 'map') return [];
        if (P.pos === null) return MAP.rows[0].map(n => n.id);
        return MAP.nodes[P.pos].next;
    }
    const rgStats = () => ({ atk: Math.round(P.atk * (1 + P.atkPct)), def: P.def });
    const rgSpellCost = () => Math.max(4, 14 - P.mpDisc);
    function rgHeal(n) { const b = P.hp; P.hp = Math.min(P.maxHp, P.hp + n); return P.hp - b; }
    function rgRender() { rgRenderMap(); rgRenderStat(); rgRenderScene(); }
    function rgRenderMap() {
        const open = rgOpen();
        const X = n => (n.c + 0.5) / RG_COLS * 100, Y = n => (n.r + 0.5) / RG_ROWS * 100;
        let svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">';
        MAP.nodes.forEach(a => a.next.forEach(bid => {
            const b = MAP.nodes[bid];
            const cls = a.done && b.done ? 'done' : (a.id === P.pos && open.includes(bid) ? 'open' : '');
            svg += `<line class="${cls}" x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" vector-effect="non-scaling-stroke"/>`;
        }));
        svg += '</svg>';
        const btns = MAP.nodes.map(n => {
            const isOpen = open.includes(n.id);
            const cls = ['rg-node', 't-' + n.type, n.type === '王' ? 'boss' : '', isOpen ? 'open' : '', n.done ? 'done' : '',
                n.id === P.pos ? 'here' : '', !isOpen && !n.done ? 'lock' : ''].join(' ');
            return `<button class="${cls}" style="left:${X(n)}%;top:${Y(n)}%" data-id="${n.id}" ${isOpen ? '' : 'tabindex="-1"'}>${n.type}</button>`;
        }).join('');
        $('rg-map').innerHTML = svg + btns;
        $('rg-map').querySelectorAll('.rg-node.open').forEach(b => b.onclick = () => rgEnter(+b.dataset.id));
    }
    function rgRenderStat() {
        const s = rgStats();
        $('rg-stat').innerHTML = `
            <div class="enc-stat"><span>氣血</span><div class="enc-bar"><i style="width:${P.hp / P.maxHp * 100}%"></i></div><span>${P.hp}/${P.maxHp}</span></div>
            <div class="enc-stat"><span>靈力</span><div class="enc-bar mp"><i style="width:${P.mp / P.maxMp * 100}%"></i></div><span>${P.mp}/${P.maxMp}</span></div>
            <div class="enc-row enc-muted">
              <span>攻擊 <b>${s.atk}</b></span><span>防禦 <b>${s.def}</b></span><span>丹藥 <b>${P.pills}</b></span>
              <span>第 <b>${P.pos === null ? 0 : MAP.nodes[P.pos].r + 1}</b>／${RG_ROWS} 層</span></div>
            <div class="enc-chips">${P.arts.length ? P.arts.map(a => `<span class="enc-chip art" title="${a.desc}">${a.name}</span>`).join('') : '<span class="enc-chip">尚未習得功法</span>'}</div>`;
    }
    function rgEnter(id) {
        const n = MAP.nodes[id];
        P.pos = id; n.done = true;
        if (n.type === '戰' || n.type === '精' || n.type === '王') rgStartFight(n);
        else if (n.type === '奇') { RMODE = 'event'; RDATA = pick(RG_EVENTS); rgLog(`奇遇：<b>${RDATA.title}</b>`); }
        else if (n.type === '寶') {
            let msg = '打開古修遺寶';
            if (Math.random() < 0.6) { P.pills++; msg += '，得到一顆<span class="c-jade">回春丹</span>'; }
            else { P.atk += 1; msg += '，參悟殘卷，攻擊 +1'; }
            rgLog(msg + '。'); RMODE = 'map';
        }
        else if (n.type === '息') RMODE = 'rest';
        rgRender();
    }
    function rgStartFight(n) {
        const tpl = n.type === '王' ? RG_FOES.boss : pick(n.type === '精' ? RG_FOES.elite : RG_FOES.normal);
        const k = n.type === '王' ? 0 : n.r;   // 首領數值固定，不吃層數成長
        const hp = Math.round(tpl.hp * (1 + 0.15 * k));
        C = { e: { ...tpl, hp, maxHp: hp, atk: Math.round(tpl.atk * (1 + 0.1 * k)), block: 0, charged: false, i: 0 }, kind: n.type, over: false };
        P.block = P.startBlock;
        RMODE = 'fight';
        rgLog(`遭遇 <b>${C.e.name}</b>！`);
    }
    function rgIntent(e) {
        const t = e.pat[e.i % e.pat.length];
        if (t === 'atk') return { t, text: `攻擊 ${e.atk}` };
        if (t === 'heavy') return { t, text: `重擊 ${Math.round(e.atk * (e.charged ? 2.2 : 1.6))}` };
        if (t === 'multi') return { t, text: `連擊 ${Math.max(1, Math.round(e.atk * 0.5))}×3` };
        if (t === 'guard') return { t, text: `護體 ${6 + e.def * 2}` };
        return { t, text: '蓄力（下次重擊大幅提升）' };
    }
    function rgHitEnemy(d) { const e = C.e, ab = Math.min(e.block, d); e.block -= ab; e.hp -= d - ab; return d - ab; }
    function rgHitPlayer(raw) {
        if (Math.random() < P.evade) { rgLog('<span class="c-jade">羅煙步閃過一擊。</span>'); return; }
        let d = Math.max(1, raw - P.def);
        const ab = Math.min(P.block, d); P.block -= ab; d -= ab;
        P.hp -= d;
        rgLog(`受到 <span class="c-red">${d}</span> 點傷害${ab ? `（護體擋下 ${ab}）` : ''}。`);
    }
    const rgSwordDmg = () => Math.max(1, rgStats().atk - Math.max(0, C.e.def - P.pierce) + (P.pierce ? 2 : 0));
    function rgAct(kind) {
        if (!C || C.over) return;
        const s = rgStats(), e = C.e;
        if (kind === 'pill') {
            if (P.pills <= 0) return;
            P.pills--; rgLog(`服下回春丹，回復 <span class="c-jade">${rgHeal(Math.round(P.maxHp * 0.35))}</span> 氣血。`);
            return rgRender();
        }
        if (kind === 'sword') {
            const d = rgHitEnemy(rgSwordDmg());
            rgLog(`劍訣斬出 <b>${d}</b> 點傷害。`);
            if (P.steal && d > 0) rgHeal(Math.round(d * P.steal));
        } else if (kind === 'spell') {
            if (P.mp < rgSpellCost()) return;
            P.mp -= rgSpellCost();
            rgLog(`法術轟出 <b>${rgHitEnemy(Math.round(s.atk * P.spellMult))}</b> 點傷害（無視防禦）。`);
        } else if (kind === 'guard') {
            P.block += s.def * 2 + 6; P.mp = Math.min(P.maxMp, P.mp + 8);
            rgLog(`運轉護體靈光，護體 <span class="c-jade">${P.block}</span>，靈力 +8。`);
        }
        if (P.extra && e.hp > 0) rgLog(`噬金蟲啃咬 ${rgHitEnemy(P.extra)} 點。`);
        if (e.hp <= 0) return rgWinFight();
        rgEnemyTurn();
        if (P.hp <= 0) { P.hp = 0; C.over = true; rgLog('<span class="c-red">氣血耗盡，被逐出虛天殿……</span>'); return rgEnd(false); }
        P.block = 0;
        P.mp = Math.min(P.maxMp, P.mp + 3);
        rgRender();
    }
    function rgEnemyTurn() {
        const e = C.e, it = rgIntent(e);
        e.block = 0;
        if (it.t === 'atk') rgHitPlayer(e.atk);
        else if (it.t === 'heavy') { rgHitPlayer(Math.round(e.atk * (e.charged ? 2.2 : 1.6))); e.charged = false; }
        else if (it.t === 'multi') { for (let i = 0; i < 3 && P.hp > 0; i++) rgHitPlayer(Math.max(1, Math.round(e.atk * 0.5))); }
        else if (it.t === 'guard') { e.block = 6 + e.def * 2; rgLog(`${e.name} 築起護體（${e.block}）。`); }
        else { e.charged = true; rgLog(`${e.name} 正在蓄力！`); }
        e.i++;
    }
    function rgWinFight() {
        C.over = true;
        rgLog(`擊敗 <b>${C.e.name}</b>。`);
        if (P.postHeal) rgHeal(Math.round(P.maxHp * P.postHeal));
        if (C.kind === '王') return rgEnd(true);
        if (C.kind === '精') { P.pills++; rgLog('精英身上搜出一顆<span class="c-jade">回春丹</span>。'); }
        const owned = new Set(P.arts.map(a => a.id));
        RDATA = shuffle(ARTS.filter(a => !owned.has(a.id))).slice(0, 3);
        RMODE = 'reward';
        rgRender();
    }
    function rgTakeArt(i) {
        if (i < 0) { P.pills++; rgLog('放棄功法，改拿一顆回春丹。'); }
        else { const a = RDATA[i]; P.arts.push(a); a.apply(P); rgLog(`習得 <span class="c-gold">${a.name}</span>：${a.desc}。`); }
        RMODE = 'map'; C = null; rgRender();
    }
    function rgGiveArt() {
        const owned = new Set(P.arts.map(a => a.id));
        const left = ARTS.filter(a => !owned.has(a.id));
        if (!left.length) { P.pills++; rgLog('功法已全數習得，改得一顆回春丹。'); return; }
        const a = pick(left); P.arts.push(a); a.apply(P); rgLog(`習得 <span class="c-gold">${a.name}</span>：${a.desc}。`);
    }
    const RG_EVENTS = [
        { title: '散修求救', text: '一名散修被血線蛟圍住，向你大喊救命。', opts: [
            { t: '出手相救', d: '失去 12 氣血，得到一門功法', f: () => { P.hp = Math.max(1, P.hp - 12); rgGiveArt(); } },
            { t: '視而不見', d: '什麼都不發生', f: () => rgLog('你默默繞路離開。') }] },
        { title: '古修洞府', text: '石門上的禁制已經殘破，裡面隱約有靈光。', opts: [
            { t: '強行破禁', d: '一半機率得兩顆丹藥，一半機率受傷 15', f: () => {
                if (Math.random() < 0.5) { P.pills += 2; rgLog('禁制破開！得到兩顆<span class="c-jade">回春丹</span>。'); }
                else { P.hp = Math.max(1, P.hp - 15); rgLog('<span class="c-red">禁制反噬，氣血 −15。</span>'); } } },
            { t: '離開', d: '什麼都不發生', f: () => rgLog('你沒有冒險。') }] },
        { title: '神秘商販', text: '一個戴斗笠的老者擺著小攤：「道友，拿一滴精血換點東西？」', opts: [
            { t: '換回春丹', d: '失去 8 氣血', f: () => { P.hp = Math.max(1, P.hp - 8); P.pills++; rgLog('換到一顆<span class="c-jade">回春丹</span>。'); } },
            { t: '換一門功法', d: '失去 18 氣血', f: () => { P.hp = Math.max(1, P.hp - 18); rgGiveArt(); } },
            { t: '離開', d: '', f: () => rgLog('老者笑了笑，收起攤子。') }] },
        { title: '地底靈泉', text: '一汪泛著綠光的泉水，靈氣濃郁。', opts: [
            { t: '飲用', d: '回復 20 氣血', f: () => rgLog(`回復 <span class="c-jade">${rgHeal(20)}</span> 氣血。`) },
            { t: '以泉淬體', d: '最大氣血 +8', f: () => { P.maxHp += 8; P.hp += 8; rgLog('筋骨更加堅韌，最大氣血 +8。'); } }] },
        { title: '心魔低語', text: '「只要放下顧忌，你會更強……」', opts: [
            { t: '接受', d: '攻擊 +3，最大氣血 −8', f: () => { P.atk += 3; P.maxHp -= 8; P.hp = Math.min(P.hp, P.maxHp); rgLog('<span class="c-red">心魔入體</span>，攻擊 +3。'); } },
            { t: '抵抗', d: '最大靈力 +5', f: () => { P.maxMp += 5; P.mp += 5; rgLog('道心更堅，最大靈力 +5。'); } }] },
    ];
    function rgRenderScene() {
        const el = $('rg-scene');
        if (RMODE === 'map') {
            el.innerHTML = `<h3>${P.pos === null ? '入殿' : '選擇下一步'}</h3><p class="enc-muted">在地圖上點亮起的節點。</p>`;
        } else if (RMODE === 'fight') {
            const e = C.e, it = rgIntent(e), cost = rgSpellCost(), s = rgStats();
            el.innerHTML = `
                <h3>${e.name}${C.kind === '精' ? '（精英）' : C.kind === '王' ? '（首領）' : ''}</h3>
                <div class="enc-stat"><span>氣血</span><div class="enc-bar"><i style="width:${Math.max(0, e.hp) / e.maxHp * 100}%"></i></div><span>${Math.max(0, e.hp)}/${e.maxHp}</span></div>
                <div class="c-gold">下一步：${it.text}${e.block ? `｜護體 ${e.block}` : ''}${P.block ? `｜你的護體 ${P.block}` : ''}</div>
                <div class="enc-acts">
                    <button class="sys-btn enc-primary" data-act="sword">劍訣<small>${rgSwordDmg()} 傷害</small></button>
                    <button class="sys-btn" data-act="spell" ${P.mp < cost ? 'disabled' : ''}>法術<small>${Math.round(s.atk * P.spellMult)} 傷害・${cost} 靈力</small></button>
                    <button class="sys-btn" data-act="guard">護體<small>擋 ${s.def * 2 + 6}・靈力 +8</small></button>
                    <button class="sys-btn" data-act="pill" ${P.pills ? '' : 'disabled'}>服丹<small>回 35%・不耗回合</small></button></div>`;
            el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => rgAct(b.dataset.act));
        } else if (RMODE === 'reward') {
            el.innerHTML = `<h3>戰利品：三選一功法</h3><div class="enc-stack">${RDATA.map((a, i) =>
                `<button class="sys-btn enc-choice" data-i="${i}">${a.name}<small>${a.desc}</small></button>`).join('')}
                <button class="sys-btn enc-choice" data-i="-1">不要功法<small>改拿一顆回春丹</small></button></div>`;
            el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => rgTakeArt(+b.dataset.i));
        } else if (RMODE === 'event') {
            el.innerHTML = `<h3>${RDATA.title}</h3><p class="enc-muted">${RDATA.text}</p><div class="enc-stack">${RDATA.opts.map((o, i) =>
                `<button class="sys-btn enc-choice" data-o="${i}">${o.t}${o.d ? `<small>${o.d}</small>` : ''}</button>`).join('')}</div>`;
            el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { RDATA.opts[+b.dataset.o].f(); RMODE = 'map'; rgRender(); });
        } else if (RMODE === 'rest') {
            el.innerHTML = `<h3>洞府調息</h3><p class="enc-muted">找到一處安全的石室。</p><div class="enc-stack">
                <button class="sys-btn enc-choice" data-r="heal">打坐調息<small>回復 35% 氣血與全部靈力</small></button>
                <button class="sys-btn enc-choice" data-r="train">參悟劍意<small>攻擊永久 +2</small></button></div>`;
            el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
                if (b.dataset.r === 'heal') { const h = rgHeal(Math.round(P.maxHp * 0.35)); P.mp = P.maxMp; rgLog(`調息完畢，回復 <span class="c-jade">${h}</span> 氣血。`); }
                else { P.atk += 2; rgLog('劍意更進一步，攻擊 +2。'); }
                RMODE = 'map'; rgRender();
            });
        }
    }
    // 結算：通關 floors＝8；失敗／認輸＝倒下那層之前闖過的層數
    function rgEnd(win, surrender) {
        RMODE = 'end';
        const S = st().stats.rogue, R = ENCOUNTER_REWARDS.rogue, h = H();
        const floors = win ? RG_ROWS : (P.pos === null ? 0 : MAP.nodes[P.pos].r);
        S.best = Math.max(S.best || 0, floors);
        const r = { coins: h * R.perFloorH * floors, spellShards: R.perFloorSpell * floors };
        if (win) {
            r.coins += h * R.clearH; r.starIron = R.clearIron; r.fire = randIn(R.clearFire); r.spellShards += R.clearSpell;
            if (!S.clears) r.treasure = { grade: R.firstClearTreasure };
            S.clears++;
        }
        const lines = grant(r, win ? '虛天殿通關' : `虛天殿闖過 ${floors} 層`);
        showResult(win, win ? '虛天殿・通關' : surrender ? '認輸離殿' : '被逐出虛天殿',
            win ? `擊敗守鼎傀儡，帶著 ${P.arts.length} 門功法走出殿堂。${r.treasure ? '首次通關，額外獲得剋制法寶！' : ''}` : `闖過 ${floors} 層。`, lines);
    }

    // =====================================================================
    // 戰棋・血色禁地
    // =====================================================================
    const TMAP = ['..^..~~.', '.#..^.~.', '....#...', '..*....^', '^...~...', '..#.~.#.', '........', '.^...*..'];
    const TER = { '.': { n: '', cost: 1 }, '^': { n: '山', cost: 2, def: 3 }, '~': { n: '河', cost: 99 }, '#': { n: '林', cost: 1, cut: 0.25 }, '*': { n: '泉', cost: 1, heal: 6 } };
    const BEATS = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };
    const ELEMS = ['金', '木', '水', '火', '土'];
    const BEAST_ELEM = { fox: '火', wolf: '木', dragon: '水' };
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let T;
    const hashElem = s => ELEMS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % 5];

    function tcTeam(pf) {
        const U = o => ({ acted: false, ...o, maxHp: o.hp });
        const cf = 1 + (pf.f - 1) * 0.5;   // 夥伴、靈寵只吃一半的實力差
        const name = player.name || '你';
        const list = [U({ id: 'hero', name, g: name[0], side: 'ally', cls: '主角', elem: (typeof getPlayerElement === 'function' && getPlayerElement()) || '金',
            hp: Math.round(42 * pf.fh), atk: Math.round(15 * pf.fa), def: 5, mv: 4, rmin: 1, rmax: 1, lead: true })];
        (typeof getPartnerTeam === 'function' ? getPartnerTeam() : []).slice(0, 2).forEach((p, i) => {
            const mag = p.power && p.power.mag > p.power.atk;
            list.push(U({ id: 'pt' + i, name: p.name, g: p.name[0], side: 'ally', cls: mag ? '夥伴・法' : '夥伴・武', elem: hashElem(p.id),
                hp: Math.round((mag ? 30 : 38) * cf), atk: Math.round(14 * cf), def: mag ? 2 : 4, mv: mag ? 3 : 4, rmin: mag ? 2 : 1, rmax: mag ? 2 : 1 }));
        });
        (player.beasts || []).filter(b => typeof isBeastActive === 'function' ? isBeastActive(b) : b.alive).slice(0, 2).forEach((b, i) => {
            const nm = typeof getBeastName === 'function' ? getBeastName(b) : '靈寵';
            list.push(U({ id: 'bt' + i, name: nm, g: nm[0], side: 'ally', cls: '靈寵', elem: BEAST_ELEM[b.id] || hashElem(b.id),
                hp: Math.round(36 * cf), atk: Math.round(11 * cf), def: 4, mv: 5, rmin: 1, rmax: 1 }));
        });
        let k = 0;
        while (list.length < 3) list.push(U({ id: 'hp' + k++, name: '宗門弟子', g: '弟', side: 'ally', cls: '援手', elem: pick(ELEMS), hp: 30, atk: 12, def: 3, mv: 4, rmin: 1, rmax: 1 }));
        const spots = [[2, 7], [3, 7], [4, 6], [6, 7], [1, 6]];
        list.forEach((u, i) => { u.x = spots[i][0]; u.y = spots[i][1]; });
        return list;
    }
    function tcStart() {
        const pf = powerFactor();
        const U = o => ({ acted: false, ...o, maxHp: o.hp });
        const allies = tcTeam(pf);
        const foes = [
            U({ id: 'w1', name: '血狼', g: '狼', side: 'foe', cls: '妖獸', elem: '木', hp: 22, atk: 10, def: 1, mv: 4, rmin: 1, rmax: 1, x: 1, y: 0 }),
            U({ id: 'w2', name: '血狼', g: '狼', side: 'foe', cls: '妖獸', elem: '木', hp: 22, atk: 10, def: 1, mv: 4, rmin: 1, rmax: 1, x: 3, y: 1 }),
            U({ id: 'sc', name: '毒蠍', g: '蠍', side: 'foe', cls: '妖獸', elem: '火', hp: 18, atk: 9, def: 1, mv: 3, rmin: 1, rmax: 2, x: 5, y: 2 }),
            U({ id: 'bs', name: '墨蛟', g: '蛟', side: 'foe', cls: '首領', elem: '水', hp: 55, atk: 14, def: 4, mv: 3, rmin: 1, rmax: 1, x: 4, y: 0, boss: true }),
        ];
        const extra = [[7, 1], [0, 1]];
        for (let i = 3; i < allies.length && i - 3 < extra.length; i++)   // 我方超過 3 人，每多 1 人多一隻血狼
            foes.push(U({ id: 'wx' + i, name: '血狼', g: '狼', side: 'foe', cls: '妖獸', elem: '木', hp: 22, atk: 10, def: 1, mv: 4, rmin: 1, rmax: 1, x: extra[i - 3][0], y: extra[i - 3][1] }));
        T = { turn: 1, phase: 'player', sel: null, mode: 'idle', reach: [], targets: [], prev: null, danger: false, info: null, over: null, flash: [], units: allies.concat(foes), token: runToken };
        $('enc-sub').textContent = '擊敗墨蛟即勝・你陣亡即敗';
        $('enc-body').innerHTML = `<div class="enc-grid"><div class="enc-box"><div class="tc-board" id="tc-board"></div>
            <div class="enc-legend"><span><b>山</b>移動 2、防禦 +3</span><span><b class="c-jade">林</b>受傷 −25%</span><span><b class="c-azure">河</b>無法通過</span><span><b class="c-jade">泉</b>回合開始回 6</span></div></div>
            <div class="enc-box enc-stack"><div class="enc-row" style="justify-content:space-between"><b id="tc-turn"></b>
              <span class="enc-row"><button class="sys-btn" id="tc-danger">敵方範圍</button><button class="sys-btn enc-primary" id="tc-end">結束回合</button></span></div>
              <div class="enc-scene-box" id="tc-info"></div>
              <div class="enc-muted">五行相剋 攻方 +30%／被剋 −20%：金→木→土→水→火→金</div>
              <div class="enc-log" id="tc-log"></div></div></div>`;
        $('tc-end').onclick = () => { if (T.phase === 'player' && !T.over) { if (T.prev) tcCancel(); tcEnemyPhase(); } };
        $('tc-danger').onclick = () => { T.danger = !T.danger; tcRender(); };
        setAction('認輸', async () => { if (await gameConfirm('確定要認輸撤出血色禁地嗎？')) tcFinish('lose', true); });
        tcLog(`你帶著 ${allies.filter(u => !u.lead).map(u => u.name).join('、')} 踏入血色禁地。<b>先清血狼，再合力圍殺墨蛟。</b>`);
        tcRender();
    }
    function tcLog(html) { const el = $('tc-log'); if (!el) return; const d = document.createElement('div'); d.innerHTML = html; el.prepend(d); }
    const alive = () => T.units.filter(u => u.hp > 0);
    const allies = () => alive().filter(u => u.side === 'ally');
    const foes = () => alive().filter(u => u.side === 'foe');
    const unitAt = (x, y) => alive().find(u => u.x === x && u.y === y);
    const byId = id => T.units.find(u => u.id === id);
    const ter = (x, y) => TER[TMAP[y][x]];
    function elemMult(a, b) { if (BEATS[a] === b) return 1.3; if (BEATS[b] === a) return 0.8; return 1; }
    function dmgCalc(att, tgt) {
        const t = ter(tgt.x, tgt.y);
        let d = att.atk * elemMult(att.elem, tgt.elem);
        if (t.cut) d *= 1 - t.cut;
        d -= tgt.def + (t.def || 0);
        return Math.max(1, Math.round(d));
    }
    function inRange(u, x, y, t) { const d = Math.abs(x - t.x) + Math.abs(y - t.y); return d >= u.rmin && d <= u.rmax; }
    function reach(u) {
        const best = { [u.x + ',' + u.y]: 0 }, q = [[u.x, u.y, 0]];
        while (q.length) {
            q.sort((a, b) => a[2] - b[2]);
            const [x, y, c] = q.shift();
            for (const [dx, dy] of DIRS) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx > 7 || ny > 7) continue;
                const cost = ter(nx, ny).cost; if (cost >= 99) continue;
                const o = unitAt(nx, ny); if (o && o.side !== u.side) continue;
                const nc = c + cost; if (nc > u.mv) continue;
                const k = nx + ',' + ny; if (best[k] !== undefined && best[k] <= nc) continue;
                best[k] = nc; q.push([nx, ny, nc]);
            }
        }
        return Object.keys(best).map(k => k.split(',').map(Number)).filter(([x, y]) => { const o = unitAt(x, y); return !o || o === u; });
    }
    function dangerSet() {
        const s = new Set();
        foes().forEach(f => reach(f).forEach(([x, y]) => {
            for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) if (inRange(f, x, y, { x: tx, y: ty })) s.add(tx + ',' + ty);
        }));
        return s;
    }
    function tcAttack(a, t) {
        const d = dmgCalc(a, t), m = elemMult(a.elem, t.elem);
        t.hp -= d; T.flash.push(t.x + ',' + t.y);
        tcLog(`${a.name} 攻擊 ${t.name}，造成 <b class="${a.side === 'ally' ? 'c-jade' : 'c-red'}">${d}</b>${m > 1 ? '（剋制）' : m < 1 ? '（被剋）' : ''}。`);
        if (t.hp <= 0) { t.hp = 0; tcLog(`<span class="c-gold">${t.name} 倒下。</span>`); return; }
        if (inRange(t, t.x, t.y, a)) {
            const c = dmgCalc(t, a); a.hp -= c; T.flash.push(a.x + ',' + a.y);
            tcLog(`${t.name} 反擊，造成 <b class="${t.side === 'ally' ? 'c-jade' : 'c-red'}">${c}</b>。`);
            if (a.hp <= 0) { a.hp = 0; tcLog(`<span class="c-gold">${a.name} 倒下。</span>`); }
        }
    }
    function tcCheckEnd() {
        if (T.over) return true;
        if (byId('bs').hp <= 0) tcFinish('win');
        else if (byId('hero').hp <= 0) tcFinish('lose');
        return !!T.over;
    }
    function tcSpring(side) {
        alive().filter(u => u.side === side && ter(u.x, u.y).heal).forEach(u => {
            const h = Math.min(u.maxHp - u.hp, ter(u.x, u.y).heal);
            if (h > 0) { u.hp += h; tcLog(`${u.name} 在靈泉回復 <span class="c-jade">${h}</span>。`); }
        });
    }
    function tcClick(x, y) {
        if (T.phase !== 'player' || T.over) return;
        const u = unitAt(x, y), s = T.sel ? byId(T.sel) : null;
        if (T.mode === 'target') { if (u && T.targets.includes(u)) tcDoAttack(s, u); return; }
        if (T.mode === 'move' && T.reach.some(([a, b]) => a === x && b === y)) {
            T.prev = { x: s.x, y: s.y }; s.x = x; s.y = y;
            T.mode = 'target'; T.targets = foes().filter(f => inRange(s, s.x, s.y, f));
            return tcRender();
        }
        if (u && u.side === 'ally' && !u.acted) {
            T.sel = u.id; T.info = u.id; T.mode = 'move'; T.reach = reach(u); T.targets = [];
            return tcRender();
        }
        T.sel = null; T.mode = 'idle'; T.reach = []; T.info = u ? u.id : null;
        tcRender();
    }
    function tcDoAttack(s, u) { tcAttack(s, u); s.acted = true; tcFinishUnit(); }
    function tcFinishUnit() {
        T.sel = null; T.mode = 'idle'; T.reach = []; T.targets = []; T.prev = null;
        if (tcCheckEnd()) return;
        tcRender();
        if (allies().every(a => a.acted)) setTimeout(tcEnemyPhase, 350);
    }
    function tcWait() { const s = byId(T.sel); if (!s) return; s.acted = true; tcLog(`${s.name} 待命。`); tcFinishUnit(); }
    function tcCancel() {
        const s = byId(T.sel); if (!s) return;
        if (T.prev) { s.x = T.prev.x; s.y = T.prev.y; }
        T.mode = 'move'; T.prev = null; T.reach = reach(s); T.targets = [];
        tcRender();
    }
    function tcPlan(f) {
        const tiles = reach(f); let best = null;
        for (const [x, y] of tiles) {
            for (const a of allies()) {
                if (!inRange(f, x, y, a)) continue;
                const d = dmgCalc(f, a);
                let sc = d + (d >= a.hp ? 40 : 0) + (a.lead ? 4 : 0);
                if (d < a.hp && inRange(a, a.x, a.y, { x, y })) sc -= dmgCalc(a, { ...f, x, y }) * 0.6;
                const t = ter(x, y); sc += (t.def || 0) * 0.5 + (t.cut ? 2 : 0);
                if (!best || sc > best.sc) best = { x, y, t: a, sc };
            }
        }
        if (best) return best;
        if (f.boss && T.turn < 3) return { x: f.x, y: f.y, t: null };
        let mv = null;
        for (const [x, y] of tiles) {
            const dist = Math.min(...allies().map(a => Math.abs(a.x - x) + Math.abs(a.y - y)));
            if (!mv || dist < mv.dist) mv = { x, y, dist };
        }
        return { x: mv.x, y: mv.y, t: null };
    }
    async function tcEnemyPhase() {
        if (!T || T.over || T.phase !== 'player') return;
        const tok = T.token;
        T.phase = 'enemy'; T.sel = null; T.mode = 'idle'; T.reach = []; T.targets = [];
        tcSpring('foe'); tcRender();
        for (const f of foes()) {
            await sleep(420);
            if (tok !== runToken || T.over) return;
            if (f.hp <= 0) continue;
            const p = tcPlan(f);
            f.x = p.x; f.y = p.y; tcRender();
            if (p.t) { await sleep(300); if (tok !== runToken || T.over) return; tcAttack(f, p.t); tcRender(); }
            if (tcCheckEnd()) return;
        }
        await sleep(300);
        if (tok !== runToken || T.over) return;
        T.turn++; T.phase = 'player';
        allies().forEach(a => a.acted = false);
        tcSpring('ally');
        tcLog(`— 第 ${T.turn} 回合 —`);
        tcRender();
    }
    function tcRender() {
        if (!$('tc-board') || T.over) return;
        const reachSet = new Set(T.reach.map(([x, y]) => x + ',' + y));
        const danger = T.danger ? dangerSet() : new Set();
        const flash = new Set(T.flash); T.flash = [];
        let html = '';
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            const k = x + ',' + y, t = ter(x, y), u = unitAt(x, y);
            const cls = ['tc-cell', t.n ? 'ter-' + t.n : '', T.mode === 'move' && reachSet.has(k) ? 'reach' : '', danger.has(k) ? 'danger' : '',
                u && T.targets.includes(u) ? 'target' : '', u && u.id === T.sel ? 'sel' : '', flash.has(k) ? 'hit' : ''].join(' ');
            let tok = '';
            if (u) {
                const c = ['tc-tok', u.side === 'foe' ? (u.boss ? 'boss' : 'foe') : '', u.side === 'ally' && u.acted && T.phase === 'player' ? 'acted' : ''].join(' ');
                tok = `<div class="${c}">${u.g}<span class="tc-el">${u.elem}</span><div class="tc-hp"><i style="width:${u.hp / u.maxHp * 100}%"></i></div></div>`;
            }
            html += `<button class="${cls}" data-x="${x}" data-y="${y}">${t.n ? `<span class="tc-tl">${t.n}</span>` : ''}${tok}</button>`;
        }
        $('tc-board').innerHTML = html;
        $('tc-board').querySelectorAll('.tc-cell').forEach(c => c.onclick = () => tcClick(+c.dataset.x, +c.dataset.y));
        $('tc-turn').textContent = `第 ${T.turn} 回合・${T.phase === 'player' ? '我方行動' : '敵方行動中…'}`;
        $('tc-end').disabled = T.phase !== 'player';
        $('tc-danger').textContent = T.danger ? '隱藏範圍' : '敵方範圍';
        tcRenderInfo();
    }
    function tcCard(u) {
        const t = ter(u.x, u.y);
        return `<h3>${u.name} <small class="enc-muted">${u.cls}・${u.elem}</small></h3>
            <div class="enc-stat"><span>氣血</span><div class="enc-bar ${u.side === 'ally' ? 'jade' : ''}"><i style="width:${u.hp / u.maxHp * 100}%"></i></div><span>${u.hp}/${u.maxHp}</span></div>
            <div class="enc-muted">攻擊 ${u.atk}｜防禦 ${u.def}${t.def ? `＋${t.def}（山）` : ''}${t.cut ? '｜林中減傷' : ''}｜移動 ${u.mv}｜射程 ${u.rmin === u.rmax ? u.rmin : u.rmin + '～' + u.rmax}${u.rmin >= 2 ? '（近身無法反擊）' : ''}</div>`;
    }
    function tcRenderInfo() {
        const el = $('tc-info');
        const s = T.sel ? byId(T.sel) : null;
        if (s && T.mode === 'target') {
            const list = T.targets.map((f, i) => {
                const d = dmgCalc(s, f), m = elemMult(s.elem, f.elem);
                const back = d < f.hp && inRange(f, f.x, f.y, s) ? dmgCalc(f, s) : 0;
                return `<button class="sys-btn enc-choice" data-t="${i}">攻擊 ${f.name}（${f.hp}/${f.maxHp}）<small>造成 ${d}${m > 1 ? '・剋制' : m < 1 ? '・被剋' : ''}${d >= f.hp ? '・擊殺' : ''}${back ? `｜反擊 ${back}` : '｜不會被反擊'}</small></button>`;
            }).join('');
            el.innerHTML = tcCard(s) + `<div class="enc-stack">${list || '<p class="enc-muted">射程內沒有敵人。</p>'}
                <div class="enc-row"><button class="sys-btn" id="tc-wait">待命</button><button class="sys-btn" id="tc-cancel">取消移動</button></div></div>`;
            el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => tcDoAttack(s, T.targets[+b.dataset.t]));
            $('tc-wait').onclick = tcWait; $('tc-cancel').onclick = tcCancel;
            return;
        }
        if (s && T.mode === 'move') {
            el.innerHTML = tcCard(s) + `<p class="enc-muted">點綠色格子移動（點自己＝原地）。</p><button class="sys-btn" id="tc-wait">原地待命</button>`;
            $('tc-wait').onclick = tcWait;
            return;
        }
        const info = T.info ? byId(T.info) : null;
        if (info && info.hp > 0) { el.innerHTML = tcCard(info); return; }
        const left = allies().filter(a => !a.acted).map(a => a.name).join('、');
        el.innerHTML = `<h3>${T.phase === 'player' ? '選擇單位' : '敵方行動中'}</h3>
            <p class="enc-muted">${T.phase === 'player' ? (left ? `還能行動：${left}` : '全員已行動') : '墨蛟在前兩回合會守在巢穴不動。'}</p>`;
    }
    function tcFinish(result, surrender) {
        if (T.over) return;
        T.over = result;
        const S = st().stats.tactics, R = ENCOUNTER_REWARDS.tactics, h = H();
        let lines, msg;
        if (result === 'win') {
            const r = { coins: h * (R.winH + (T.turn <= R.fastTurns ? R.fastH : 0)), fire: randIn(R.winFire), partner: R.partner, spellShards: R.winSpell };
            if (!S.wins) r.treasure = { race: 'beast', grade: R.firstWinTreasure };
            S.wins++;
            S.best = S.best ? Math.min(S.best, T.turn) : T.turn;
            lines = grant(r, '血色禁地擊敗墨蛟');
            msg = `用了 ${T.turn} 回合。${T.turn <= R.fastTurns ? `${R.fastTurns} 回合內速勝，額外獎勵！` : ''}${r.treasure ? '首次勝利，額外獲得剋制法寶！' : ''}`;
        } else {
            lines = grant({ coins: h * R.loseH, spellShards: R.loseSpell }, '血色禁地撤退');
            msg = surrender ? '你認輸撤出了禁地。' : '你陣亡了，被傳送出禁地。';
        }
        showResult(result === 'win', result === 'win' ? '墨蛟伏誅' : '撤出禁地', msg, lines);
    }

    // =====================================================================
    // 三界戰場（千人淘汰：海選 5 輪瑞士制 → 百強單淘汰）
    // =====================================================================
    const AR_REALMS = {
        人界: ['黃楓谷', '掩月宗', '靈獸山', '鬼靈門', '合歡宗', '天闕堡', '落雲宗', '星宮', '太一門', '天道盟'],
        靈界: ['天淵城', '木族', '天鵬族', '九仙宮', '萬寶閣', '天鼎宮', '天雲十三族'],
        魔界: ['元剎宗', '血魂殿', '噬靈教', '玄陰魔宮', '六道門', '天魔宗'],
    };
    const STANCES = [{ n: '猛攻', d: '全力搶攻', beats: 2 }, { n: '穩守', d: '先守後攻', beats: 0 }, { n: '奇襲', d: '身法遊鬥', beats: 1 }];
    const STYLES = [
        { n: '劍修', pref: 0, moves: ['青元劍芒', '萬劍歸宗', '劍氣縱橫', '飛劍穿雲'] },
        { n: '體修', pref: 1, moves: ['金剛不壞', '崩山拳', '明王訣', '銅皮鐵骨'] },
        { n: '法修', pref: 2, moves: ['紫雷破空', '冰魄寒光', '三昧真火', '五行遁法'] },
        { n: '魔修', pref: 2, moves: ['血影遁', '噬魂魔音', '天魔解體', '陰羅幡'] },
        { n: '陣修', pref: 1, moves: ['顛倒五行陣', '困龍陣', '周天星斗陣', '玄武陣'] },
        { n: '符修', pref: 0, moves: ['雷火符', '金光符', '千劍符', '定身符'] },
    ];
    const SUR = '韓南厲李王張陳墨董紅向田呂葉林蕭慕容宋孟白凌趙秦魏柳沈雲寒陸顧溫蘇紫青玄'.split('');
    const GIV = '天元青玄明雪星月寒霜風雷雲山海靈清虛道真嵐凌峰塵淵陽華松鶴烈焰影幽夜冰蓮瑤夢璃瀾若輕逸'.split('');
    const LEGENDS = ['大衍神君', '元剎聖祖', '寶花老祖', '銀月仙子', '天瀾聖獸', '向之禮', '蟹道人', '玄骨上人', '極陰老祖', '萬天明'];
    const SWISS_ROUNDS = 5, TOP = 100;
    const KO_NAMES = { 100: '百強賽', 64: '六十四強', 32: '三十二強', 16: '十六強', 8: '八強賽', 4: '準決賽', 2: '決賽' };
    const PLACE_NAMES = { 100: '百強', 64: '六十四強', 32: '三十二強', 16: '十六強', 8: '八強', 4: '四強', 2: '亞軍', 1: '三界至尊' };
    const placeName = n => PLACE_NAMES[n] || (n > 100 ? '海選' : n + ' 強');
    let G, AVIEW;
    function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function genName(used) { for (;;) { const n = pick(SUR) + pick(GIV) + (Math.random() < 0.7 ? pick(GIV) : ''); if (!used.has(n)) { used.add(n); return n; } } }
    const showPow = p => { const v = p * G.scale; return typeof fmtCombat === 'function' ? fmtCombat(v) : Math.round(v).toWan(); };

    function arStart() {
        const pf = powerFactor();
        const pows = Array.from({ length: 999 }, () => Math.exp(0.55 * gauss())).sort((a, b) => b - a);
        const used = new Set(LEGENDS), keys = Object.keys(AR_REALMS);
        const ents = pows.map((pow, i) => {
            const realm = i < 10 ? pick(['靈界', '魔界']) : pick(keys);
            return { id: i + 1, name: i < 10 ? LEGENDS[i] : genName(used), realm, sect: pick(AR_REALMS[realm]), style: pick(STYLES), pow, w: 0, l: 0, opps: [] };
        });
        const sectName = player.sect ? (player.sect.name || String(player.sect)) : '散修';
        const me = { id: 0, name: player.name || '你', realm: '人界', sect: sectName, style: STYLES[0], pow: pows[149] * pf.f, w: 0, l: 0, opps: [], me: true };
        ents.push(me);
        const real = typeof nv2CombatPower === 'function' && NUMERIC_V2 ? nv2CombatPower() : 10000;
        G = { ents, me, phase: 'swiss', round: 1, pairs: [], cur: null, path: [], alive: [], koHist: [], place: null, placeN: null, champion: null,
              busy: false, done: false, out: false, scale: real / me.pow, token: runToken, swissWins: 0 };
        AVIEW = 'board';
        arSwissPairs();
        $('enc-sub').textContent = '千人海選五輪・前百名晉級百強';
        $('enc-body').innerHTML = `<div class="enc-grid"><div class="enc-stack">
              <div class="enc-box enc-stack"><div class="enc-row" style="justify-content:space-between"><b id="ar-title"></b><span class="enc-muted" id="ar-sub"></span></div>
                <div class="ar-stages" id="ar-stages"></div><div id="ar-match"></div></div>
              <div class="enc-box"><b>晉級之路</b><div class="ar-path" id="ar-path"></div></div></div>
            <div class="enc-box enc-stack"><div class="enc-row"><button class="sys-btn ar-tab" data-v="board">積分榜</button><button class="sys-btn ar-tab" data-v="ko">淘汰賽</button><button class="sys-btn ar-tab" data-v="realm">三界</button></div>
              <div id="ar-view"></div></div></div>`;
        document.querySelectorAll('.ar-tab').forEach(b => b.onclick = () => { AVIEW = b.dataset.v; arRenderView(); });
        setAction('略過演出，直接打完', () => { if (G.busy) G.skipAfter = true; else arSimToEnd(); });   // 對決演出中按：演完這一招就收尾再略過
        arRender();
    }
    const stanceMult = (a, b) => STANCES[a].beats === b ? 1.12 : STANCES[b].beats === a ? 1 / 1.12 : 1;
    const winProb = (pa, pb) => 1 / (1 + Math.pow(pa / pb, -4));
    const npcStance = e => Math.random() < 0.7 ? e.style.pref : rnd(3);
    function decide(a, b, sa) {
        if (sa === undefined) sa = npcStance(a);
        const sb = npcStance(b);
        return { aWins: Math.random() < winProb(a.pow * stanceMult(sa, sb), b.pow), sa, sb };
    }
    function arSwissPairs() {
        const groups = {};
        G.ents.forEach(e => (groups[e.w] = groups[e.w] || []).push(e));
        const pairs = []; let carry = [];
        Object.keys(groups).map(Number).sort((a, b) => b - a).forEach(w => {
            const g = carry.concat(groups[w].sort((a, b) => b.pow - a.pow));
            carry = g.length % 2 ? [g.pop()] : [];
            const half = g.length / 2, top = g.slice(0, half), bot = g.slice(half);
            top.forEach(a => { let j = bot.findIndex(b => !a.opps.includes(b.id)); if (j < 0) j = 0; pairs.push([a, bot.splice(j, 1)[0]]); });
        });
        G.pairs = pairs;
        G.cur = pairs.find(p => p[0].me || p[1].me) || null;
        if (G.cur && G.cur[1].me) G.cur.reverse();
    }
    function standing() {
        G.ents.forEach(e => { e.bh = e.opps.reduce((s, id) => s + G.ents.find(x => x.id === id).w, 0); });
        return G.ents.slice().sort((a, b) => b.w - a.w || b.bh - a.bh || b.pow - a.pow);
    }
    const recSwiss = (w, l) => { w.w++; l.l++; w.opps.push(l.id); l.opps.push(w.id); };
    function arSettleSwissOthers() {
        G.pairs.forEach(([a, b]) => { if (a.me || b.me) return; const r = decide(a, b); recSwiss(r.aWins ? a : b, r.aWins ? b : a); });
    }
    function arStartKO() {
        const s = standing();
        G.seedOf = new Map(s.map((e, i) => [e.id, i + 1]));
        G.alive = s.slice(0, TOP);
        G.phase = 'ko';
        if (!G.alive.includes(G.me)) { G.out = true; G.place = `海選第 ${G.seedOf.get(G.me.id)} 名`; G.placeN = 1000; }
        arKOPairs();
    }
    function arKOPairs() {
        const n = G.alive.length;
        let next = 1; while (next * 2 < n) next *= 2;
        const byes = n - (n - next) * 2;
        const s = G.alive.slice().sort((a, b) => G.seedOf.get(a.id) - G.seedOf.get(b.id));
        G.byes = s.slice(0, byes);
        const pool = s.slice(byes);
        G.pairs = [];
        for (let i = 0; i < pool.length / 2; i++) G.pairs.push([pool[i], pool[pool.length - 1 - i]]);
        G.roundName = KO_NAMES[n] || `${n} 強`;
        G.cur = G.out ? null : G.pairs.find(p => p[0].me || p[1].me) || null;
        if (G.cur && G.cur[1].me) G.cur.reverse();
        G.myBye = !G.out && G.byes.includes(G.me);
    }
    function arSettleKO(meRes) {
        const winners = G.byes.slice(), hist = [];
        G.pairs.forEach(p => {
            let w, l;
            if (p === G.cur && meRes) { w = meRes.w; l = meRes.l; }
            else { const r = decide(p[0], p[1]); w = r.aWins ? p[0] : p[1]; l = r.aWins ? p[1] : p[0]; }
            winners.push(w); hist.push({ a: p[0], b: p[1], w });
            if (l.me) { G.out = true; G.placeN = G.alive.length; G.place = placeName(G.placeN); }
        });
        G.koHist.push({ n: G.alive.length, name: G.roundName, matches: hist, byes: G.byes.slice() });
        G.alive = winners;
        if (G.alive.length === 1) { G.champion = G.alive[0]; G.done = true; if (G.champion.me) { G.placeN = 1; G.place = placeName(1); } }
        else arKOPairs();
    }
    async function arDuel(stance) {
        if (G.busy || !G.cur) return;
        G.busy = true;
        const tok = runToken, [me, op] = G.cur;
        const r = decide(me, op, stance);
        $('ar-match').innerHTML = `<div class="ar-vs">${arFighter(me, '', 'ar-hpme')}<span class="ar-mid">戰</span>${arFighter(op, 'right', 'ar-hpop')}</div><div class="enc-log ar-dlog" id="ar-dlog"></div>`;
        const line = h => { const el = $('ar-dlog'); if (!el) return; const d = document.createElement('div'); d.innerHTML = h; el.append(d); el.scrollTop = el.scrollHeight; };
        const sm = stanceMult(stance, r.sb);
        line(`你以<b>${STANCES[stance].n}</b>迎戰，${op.name} 使出<b>${STANCES[r.sb].n}</b>${sm > 1 ? '，<span class="c-jade">戰法剋制！</span>' : sm < 1 ? '，<span class="c-red">被對方剋制。</span>' : '。'}`);
        const steps = 3 + rnd(3), winEnd = 12 + rnd(55);
        let hMe = 100, hOp = 100;
        for (let i = 1; i <= steps; i++) {
            const lose = i === steps ? 0 : Math.max(4, Math.round(100 * (1 - i / steps) + (Math.random() * 14 - 7)));
            const keep = Math.round(100 - (100 - winEnd) * (i / steps) + (i === steps ? 0 : Math.random() * 8 - 4));
            const [nMe, nOp] = r.aWins ? [keep, lose] : [lose, keep];
            const hits = [[me, op, hOp - nOp, () => hOp = nOp], [op, me, hMe - nMe, () => hMe = nMe]];
            if (Math.random() < 0.5) hits.reverse();
            if (G.skipAfter) break;
            for (const [a, b, d, apply] of hits) {
                if (d <= 0) continue;
                await sleep(420);
                if (tok !== runToken) return;
                if (G.skipAfter) break;
                apply();
                line(`${a.me ? '你' : a.name} 施展「${pick(a.style.moves)}」，${b.me ? '你' : b.name} 氣血 −${d}%`);
                if ($('ar-hpme')) $('ar-hpme').style.width = Math.max(0, hMe) + '%';
                if ($('ar-hpop')) $('ar-hpop').style.width = Math.max(0, hOp) + '%';
            }
        }
        if (!G.skipAfter) await sleep(300);
        if (tok !== runToken) return;
        arRecordMine(r.aWins);
        G.busy = false; G.last = r.aWins;
        if (G.skipAfter) { G.skipAfter = false; return arSimToEnd(); }
        arRender();
    }
    function arRecordMine(win) {
        const [me, op] = G.cur;
        G.path.push({ round: G.phase === 'swiss' ? `海選第 ${G.round} 輪` : G.roundName, op, win });
        if (G.phase === 'swiss') { recSwiss(win ? me : op, win ? op : me); if (win) G.swissWins++; arSettleSwissOthers(); }
        else arSettleKO({ w: win ? me : op, l: win ? op : me });
        G.cur = null;
    }
    function arNext() {
        G.last = undefined;
        if (G.phase === 'swiss') { if (G.round < SWISS_ROUNDS) { G.round++; arSwissPairs(); } else arStartKO(); }
        else if (G.myBye) { G.path.push({ round: G.roundName, op: null, win: true }); arSettleKO(null); }
        arRender();
    }
    // 略過演出：自己的每場也用擲骰（戰法依對手慣用自動選剋制的那招）
    function arSimToEnd() {
        const counter = op => STANCES.findIndex(s => s.beats === op.style.pref);
        while (G.phase === 'swiss') {
            if (G.cur) arRecordMine(decide(G.me, G.cur[1], counter(G.cur[1])).aWins);
            if (G.round < SWISS_ROUNDS) { G.round++; arSwissPairs(); } else arStartKO();
        }
        while (!G.done) {
            if (G.cur) arRecordMine(decide(G.me, G.cur[1], counter(G.cur[1])).aWins);
            else { if (G.myBye) G.path.push({ round: G.roundName, op: null, win: true }); arSettleKO(null); }
        }
        G.last = undefined; AVIEW = 'ko';
        arRender();
    }
    const realmTag = e => `<span class="ar-realm r-${e.realm}">${e.realm}</span>`;
    function arFighter(e, side, hpId) {
        const seed = G.seedOf ? G.seedOf.get(e.id) : null;
        return `<div class="ar-fighter ${side}"><b>${e.me ? e.name + '（你）' : e.name}</b>
            <small>${realmTag(e)} ${e.sect}・${e.style.n}</small>
            <small>戰力 ${showPow(e.pow)}${G.phase === 'swiss' ? `・${e.w} 勝 ${e.l} 敗` : seed ? `・種子 ${seed}` : ''}</small>
            <div class="enc-bar ${side ? '' : 'jade'}"><i id="${hpId}" style="width:100%"></i></div></div>`;
    }
    function arExpected(s) {
        const [me, op] = G.cur;
        let p = 0;
        for (let o = 0; o < 3; o++) p += (o === op.style.pref ? 0.8 : 0.1) * winProb(me.pow * stanceMult(s, o), op.pow);
        return p;
    }
    function arRender() {
        if (!$('ar-match')) return;
        $('ar-title').textContent = G.phase === 'swiss' ? `海選第 ${G.round}／${SWISS_ROUNDS} 輪` : G.done ? '爭霸結束' : G.roundName;
        $('ar-sub').textContent = G.phase === 'swiss' ? `戰績 ${G.me.w} 勝 ${G.me.l} 敗` : G.done ? '' : `剩 ${G.alive.length} 人`;
        const sizes = [1000, 100, 64, 32, 16, 8, 4, 2], labels = ['海選', '百強', '64', '32', '16', '8強', '4強', '決賽'];
        const cur = G.phase === 'swiss' ? 1000 : G.done ? 1 : G.alive.length;
        $('ar-stages').innerHTML = sizes.map((s, i) => `<span class="ar-stg ${s > cur ? 'done' : s === cur ? 'now' : ''}">${labels[i]}</span>`).join('');
        $('ar-path').innerHTML = G.path.map(p => `<div><span>${p.round}</span><span>${p.op ? `${p.op.name} ${realmTag(p.op)}` : '輪空'}</span><span class="${p.win ? 'c-jade' : 'c-red'}">${p.win ? '勝' : '敗'}</span></div>`).join('') || '<span class="enc-muted">還沒開打。</span>';
        arRenderMatch(); arRenderView();
    }
    function arRenderMatch() {
        const el = $('ar-match');
        // 爭霸結束，或自己已淘汰：結算
        if (G.done || (G.out && G.last === undefined)) {
            if (!G.done) { el.innerHTML = `<p class="enc-muted">你止步${G.place}。</p><button class="sys-btn enc-primary" id="ar-fin">觀戰到決賽並結算</button>`; $('ar-fin').onclick = arSimToEnd; return; }
            el.innerHTML = `<p class="enc-muted">冠軍：<b>${G.champion.name}</b>（${G.champion.realm}${G.champion.sect}）。你的最終名次：<b>${G.place}</b>。</p>
                <button class="sys-btn enc-primary" id="ar-fin">領取名次獎勵</button>`;
            $('ar-fin').onclick = arFinish; return;
        }
        if (G.last !== undefined) {
            const last = G.path[G.path.length - 1];
            let msg;
            if (G.phase === 'swiss') msg = G.round < SWISS_ROUNDS ? `目前 ${G.me.w} 勝 ${G.me.l} 敗，暫列第 ${standing().indexOf(G.me) + 1} 名。` : '海選五輪結束，公布百強名單。';
            else msg = G.out ? `止步${G.place}。` : `晉級${G.roundName}。`;
            el.innerHTML = `<div class="enc-result ${last.win ? 'win' : 'lose'}">${last.win ? '勝' : '敗'}・${last.op.name}</div><p class="enc-muted">${msg}</p>
                <button class="sys-btn enc-primary" id="ar-next">${G.phase === 'swiss' ? (G.round < SWISS_ROUNDS ? '下一輪' : '公布百強') : G.out ? '繼續' : '進入' + G.roundName}</button>`;
            $('ar-next').onclick = () => { if (G.phase === 'swiss') arNext(); else { G.last = undefined; arRender(); } };
            return;
        }
        if (G.phase === 'ko' && G.myBye) {
            el.innerHTML = `<p class="enc-muted">你是第 ${G.seedOf.get(G.me.id)} 號種子，本輪<b class="c-gold">輪空</b>。</p><button class="sys-btn enc-primary" id="ar-bye">晉級下一輪</button>`;
            $('ar-bye').onclick = arNext; return;
        }
        const [me, op] = G.cur;
        el.innerHTML = `<div class="ar-vs">${arFighter(me, '', 'ar-hpme')}<span class="ar-mid">戰</span>${arFighter(op, 'right', 'ar-hpop')}</div>
            <p class="c-gold">探子回報：${op.name} 是${op.style.n}，慣用「${STANCES[op.style.pref].n}」。猛攻剋奇襲、奇襲剋穩守、穩守剋猛攻。</p>
            <div class="enc-acts">${STANCES.map((s, i) => `<button class="sys-btn" data-s="${i}">${s.n}<small>勝率 ${Math.round(arExpected(i) * 100)}%</small></button>`).join('')}</div>`;
        el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => arDuel(+b.dataset.s));
    }
    function arRenderView() {
        document.querySelectorAll('.ar-tab').forEach(t => t.classList.toggle('active', t.dataset.v === AVIEW));
        const el = $('ar-view');
        if (!el) return;
        if (AVIEW === 'board') {
            const s = standing(), my = s.indexOf(G.me);
            const show = [...new Set([...Array(12).keys(), 98, 99, 100, my - 1, my, my + 1].filter(i => i >= 0 && i < s.length))].sort((a, b) => a - b);
            let rows = '', prev = -1;
            show.forEach(i => {
                if (prev >= 0 && i > prev + 1) rows += `<tr><td colspan="4" class="enc-muted" style="text-align:center">⋯</td></tr>`;
                const e = s[i];
                rows += `<tr class="${e.me ? 'me' : ''} ${i === TOP - 1 ? 'cut' : ''}"><td>${i + 1}</td><td>${e.name} ${realmTag(e)}</td><td>${e.w}–${e.l}</td><td>${showPow(e.pow)}</td></tr>`;
                prev = i;
            });
            el.innerHTML = `<p class="enc-muted">依勝場、對手勝場和、戰力排序。紅線以上晉級百強。</p><div class="ar-tbl"><table><tbody>${rows}</tbody></table></div>`;
        } else if (AVIEW === 'ko') {
            if (G.phase === 'swiss') { el.innerHTML = '<p class="enc-muted">海選結束後公布百強對陣：前 28 名種子輪空，其餘最高種子對最低種子，每輪依種子重排。</p>'; return; }
            const done = G.koHist.map(h => {
                const my = h.matches.find(m => m.a.me || m.b.me);
                return `<div class="ar-kor"><b>${h.name}</b> ${h.matches.length} 場${h.n <= 8 ? '：' + h.matches.map(m => `<span class="${m.a.me || m.b.me ? 'c-gold' : ''}">${m.w.name}</span>`).join('、') + ' 勝出' : my ? `，你 ${my.w.me ? '<span class="c-jade">勝</span>' : '<span class="c-red">敗</span>'}` : ''}</div>`;
            }).join('');
            el.innerHTML = done + (G.done ? `<div class="ar-kor c-gold">🏆 三界至尊：${G.champion.name}（${G.champion.realm}）</div>` : `<div class="ar-kor">進行中：${G.roundName}，${G.pairs.length} 場${G.byes.length ? `、${G.byes.length} 人輪空` : ''}</div>`);
        } else {
            const pool = G.phase === 'swiss' ? G.ents : G.alive;
            const cnt = { 人界: 0, 靈界: 0, 魔界: 0 }; pool.forEach(e => cnt[e.realm]++);
            el.innerHTML = `<p class="enc-muted">${G.phase === 'swiss' ? '報名總數' : G.done ? '冠軍所屬' : '還在場上'}</p><div class="ar-realms">${Object.keys(cnt).map(k => `<div class="r-${k}">${k}<b>${cnt[k]}</b></div>`).join('')}</div>`;
        }
    }
    function arFinish() {
        const S = st().stats.arena, R = ENCOUNTER_REWARDS.arena, h = H();
        const n = G.placeN || 1000;
        if (n <= 100) S.best = S.best ? Math.min(S.best, n) : n;
        const pr = R.place[n];
        const r = { coins: h * (R.swissWinH * G.swissWins + (pr ? pr.h : 0)), butianStones: pr && pr.butian,
                    spellShards: R.swissWinSpell * G.swissWins + (pr ? pr.spell : 0) };
        if (pr && pr.treasure) r.treasure = { grade: pr.treasure };
        if (pr && pr.supreme) r.partner = { tiers: ['至高'], chance: 1, amount: pr.supreme };   // 前四強：至高夥伴碎片（500 片激活）
        const lines = grant(r, `三界戰場・${G.place}`);
        showResult(n <= 100, n === 1 ? '三界至尊' : G.place, n === 1 ? `一路過關斬將，你就是本屆三界至尊！` : `冠軍是 ${G.champion.name}。海選 ${G.swissWins} 勝。`, lines);
    }

    // =====================================================================
    // 機緣・強者現身（遇見尊者或帝境夥伴，三選一）
    // =====================================================================
    let MS;
    function msPickMaster() {
        const R = ENCOUNTER_REWARDS.master;
        const order = Math.random() < R.emperorChance ? ['帝境', '尊者'] : ['尊者', '帝境'];
        for (const tier of order) {
            const pool = partnerList.filter(p => !p.first && getPartnerTier(p).name === tier && !isPartnerMet(p.id));
            if (!pool.length) continue;
            const best = pool.slice().sort((a, b) => getPartnerShards(b.id) - getPartnerShards(a.id))[0];
            return Math.random() < 0.5 && getPartnerShards(best.id) > 0 ? best : pick(pool);
        }
        return pick(partnerList.filter(p => ['尊者', '帝境'].includes(getPartnerTier(p).name)));   // 都結識了：遇到老朋友
    }
    function msStart() {
        const R = ENCOUNTER_REWARDS.master, p = msPickMaster(), tier = getPartnerTier(p), met = isPartnerMet(p.id);
        const pf = powerFactor();
        const winP = clamp(R.duel.baseWin * pf.f * (tier.name === '帝境' ? R.duel.emperorWin : 1), 0.15, 0.7);
        const cost = Math.floor(H() * R.guard.costH);
        const [a, b] = R.shards[tier.name] || [8, 12];
        MS = { p, tier: tier.name, met, winP, cost, range: [a, b] };
        $('enc-sub').textContent = `${tier.name}強者・${p.native ? '本界人物' : '域外神明'}`;
        const gain = m => met ? `好感 +${Math.round(R.metBond * m)}` : `碎片 ${Math.round(a * m)}～${Math.round(b * m)} 片`;
        $('enc-body').innerHTML = `<div class="enc-box enc-stack ms-card" style="max-width:640px;margin:0 auto;border-color:${tier.color}">
            <div class="ms-name" style="color:${tier.color}">${p.title}・${p.name}</div>
            <div class="enc-muted">${tier.name}｜${p.native ? '出身本界' : `來自《${p.work}》（${p.author}）的${p.world || '某世界'}`}${p.peak ? `｜巔峰 ${p.peak}` : ''}</div>
            <p class="ms-line">「${met ? `${player.name || '小友'}，又見面了。這一趟，陪我走走？` : '小友，你我萍水相逢，也算有緣。'}」</p>
            <div class="enc-muted">${p.analysis || ''}</div>
            ${met ? '' : `<div class="enc-muted">目前碎片 ${getPartnerShards(p.id)}／${getPartnerShardsNeed(p)}（集滿可在情緣視窗激活結識）</div>`}
            <div class="enc-stack">
              <button class="sys-btn enc-choice" data-k="ask">🙏 虛心請教<small>穩定：${gain(R.ask.mult)}、秘典碎片 ×${R.ask.spell}</small></button>
              <button class="sys-btn enc-choice" data-k="duel">⚔️ 斗膽切磋<small>勝率約 ${Math.round(winP * 100)}%：勝 ${gain(R.duel.winMult)}、秘典碎片 ×${R.duel.spell}；敗 ${gain(R.duel.loseMult)}</small></button>
              <button class="sys-btn enc-choice" data-k="guard" ${player.coins >= cost ? '' : 'disabled'}>🛡️ 奉上靈石為其護法<small>花費 ${cost.toWan()} 靈石：${gain(R.guard.mult)}、秘典碎片 ×${R.guard.spell}</small></button>
            </div></div>`;
        document.querySelectorAll('#enc-body [data-k]').forEach(b => b.onclick = () => msChoose(b.dataset.k));
        setAction(null);
    }
    function msChoose(kind) {
        const R = ENCOUNTER_REWARDS.master, { p, met, winP, cost, range } = MS;
        let mult, spell, line, win = true;
        if (kind === 'ask') { mult = R.ask.mult; spell = R.ask.spell; line = `${p.name}指點你幾句修行關竅，你茅塞頓開。`; }
        else if (kind === 'duel') {
            win = Math.random() < winP;
            mult = win ? R.duel.winMult : R.duel.loseMult; spell = win ? R.duel.spell : 0;
            line = win ? `數十招後，${p.name}收手大笑：「好！後生可畏！」` : `你三招之內便落敗，${p.name}搖頭：「根基尚淺，再練練。」`;
        } else {
            if (player.coins < cost) return;
            player.coins -= cost;
            mult = R.guard.mult; spell = R.guard.spell; line = `你奉上 ${cost.toWan()} 靈石，為${p.name}護法一夜，對方頗為感念。`;
        }
        const S = st().stats.master;
        if (win) S.wins++;
        const label = `強者現身・${p.name}`;
        let lines;
        if (met) {
            const add = typeof addBond === 'function' ? addBond(p.id, Math.round(R.metBond * mult), label) : 0;
            lines = grant({ spellShards: spell }, label);
            if (add) lines.unshift(`💞 【${p.name}】好感 +${add}`);
        } else {
            const n = Math.max(1, Math.round(randIn(range) * mult));
            lines = grant({ partnerShards: { p, n }, spellShards: spell }, label);
        }
        showResult(win, `${p.name}`, line, lines);
    }

    // =====================================================================
    // 機緣・靈獸競速（六匹同場，三次鞭策，最後 30% 衝刺段效果加倍）
    // =====================================================================
    let PR;
    const PR_RIVALS = [['雪紋白虎', '🐯'], ['赤羽火鳳', '🦅'], ['青鱗蒼龍', '🐉'], ['焰蹄麒麟', '🦄'], ['九尾天狐', '🦊'], ['金睛神猿', '🐒']];
    function prStart() {
        const b = (player.beasts || []).find(x => typeof isBeastActive === 'function' ? isBeastActive(x) : x.alive);
        const name = b ? getBeastName(b) : '借來的靈狐';
        const lv = b ? (b.level || 1) : 1;
        // 靈寵等級加成最多 +3%（模擬 1500 場：最佳打法 借來的靈狐 奪冠約 34%、+3% 約 65%；完全不鞭策幾乎墊底）
        const racers = [{ name, icon: '⭐', me: true, spd: 1 + Math.min(0.03, lv / 5000), pos: 0, boost: 0, tired: 0 }];
        // 對手：衝刺段必衝一次，另有一半機率在前段多衝一次
        shuffle(PR_RIVALS.slice()).slice(0, 5).forEach(([n, ic]) => racers.push({ name: n, icon: ic, spd: 0.97 + Math.random() * 0.1, pos: 0, boost: 0, tired: 0,
            aiBoosts: (Math.random() < 0.5 ? [0.2 + Math.random() * 0.4] : []).concat([0.7 + Math.random() * 0.25]) }));
        shuffle(racers);
        PR = { racers, me: racers.find(r => r.me), whips: 3, stamina: 100, running: false, finish: [], token: runToken, timer: null, t: 0 };
        $('enc-sub').textContent = b ? `出賽：${name}（Lv.${lv}）` : '你沒有出戰靈寵，向主辦方借了一隻靈狐';
        $('enc-body').innerHTML = `<div class="enc-box enc-stack" style="max-width:720px;margin:0 auto">
            <div class="pr-track-wrap" id="pr-lanes">${racers.map((r, i) => `<div class="pr-lane${r.me ? ' me' : ''}"><span class="pr-name">${r.me ? '⭐ ' : ''}${r.name}</span>
                <div class="pr-track"><div class="pr-sprint"></div><span class="pr-runner" id="pr-r${i}">${r.me ? '🐾' : r.icon}</span></div></div>`).join('')}</div>
            <div class="enc-stat"><span>體力</span><div class="enc-bar jade"><i id="pr-sta" style="width:100%"></i></div><span id="pr-sta-t">100</span></div>
            <div class="enc-muted">每次鞭策加速約 1.2 秒、消耗 35 體力；在最後 30% 的<b class="c-gold">衝刺段</b>鞭策效果加倍。體力耗盡靈寵會力竭減速。</div>
            <div class="enc-row"><button class="sys-btn enc-primary" id="pr-go">開跑</button><button class="sys-btn" id="pr-whip" disabled>🪄 鞭策（剩 3）</button></div>
            <div class="enc-log" id="pr-log"></div></div>`;
        $('pr-go').onclick = prRun;
        $('pr-whip').onclick = prWhip;
        setAction(null);
    }
    function prLog(t) { const el = $('pr-log'); if (el) { const d = document.createElement('div'); d.innerHTML = t; el.prepend(d); } }
    function prRun() {
        if (PR.running) return;
        PR.running = true;
        $('pr-go').disabled = true; $('pr-whip').disabled = false;
        prLog('鑼聲一響，六匹靈獸衝出柵門！');
        PR.timer = setInterval(prTick, 100);
    }
    function prWhip() {
        if (!PR.running || PR.whips <= 0 || PR.me.pos >= 100) return;
        PR.whips--; PR.stamina -= 35;
        if (PR.stamina < 0) { PR.stamina = 0; PR.me.tired = 2; PR.me.boost = 0; prLog('<span class="c-red">過度鞭策，靈寵力竭了！</span>'); }
        else { PR.me.boost = 1.2; prLog(PR.me.pos >= 70 ? '<span class="c-gold">衝刺段鞭策，一馬當先！</span>' : '鞭策！靈寵加速。'); }
        $('pr-whip').textContent = `🪄 鞭策（剩 ${PR.whips}）`;
        if (!PR.whips) $('pr-whip').disabled = true;
    }
    function prTick() {
        if (PR.token !== runToken) { clearInterval(PR.timer); return; }
        const dt = 0.1;
        PR.t += dt;
        PR.racers.forEach((r, i) => {
            if (r.pos >= 100) return;
            if (!r.me && r.boost <= 0 && r.aiBoosts.length && r.pos >= r.aiBoosts[0] * 100) { r.aiBoosts.shift(); r.boost = 1.2; }   // 對手在預定時點加速
            let m = 1;
            if (r.boost > 0) { m += r.pos >= 70 ? 1.0 : 0.5; r.boost -= dt; }
            if (r.tired > 0) { m *= 0.6; r.tired -= dt; }
            if (r.me && PR.stamina < 20) m *= 0.85;
            r.pos = Math.min(100, r.pos + r.spd * m * (0.85 + Math.random() * 0.3) * dt * 7);
            if (r.pos >= 100) { PR.finish.push(r); if (r.me) prLog(`🏁 你的靈寵第 <b>${PR.finish.length}</b> 個衝過終點！`); }
            const el = $('pr-r' + i); if (el) el.style.left = `calc(${r.pos}% - ${r.pos * 0.24}px)`;
        });
        PR.stamina = Math.min(100, PR.stamina + 3 * dt);
        if ($('pr-sta')) { $('pr-sta').style.width = PR.stamina + '%'; $('pr-sta-t').textContent = Math.round(PR.stamina); }
        if (PR.finish.length === PR.racers.length || (PR.me.pos >= 100 && PR.t > 30)) { clearInterval(PR.timer); PR.running = false; setTimeout(prEnd, 600); }
    }
    function prEnd() {
        if (PR.token !== runToken) return;
        const place = PR.finish.indexOf(PR.me) + 1 || PR.racers.length;
        const S = st().stats.petrace, R = ENCOUNTER_REWARDS.petrace, h = H();
        if (place === 1) S.wins++;
        S.best = S.best ? Math.min(S.best, place) : place;
        const pr = R.place[place] || R.other;
        const lines = grant({ coins: h * pr.h, spellShards: pr.spell, beastCore: pr.core || 0 }, `靈獸競速第 ${place} 名`);
        showResult(place <= 3, place === 1 ? '奪得頭名！' : `第 ${place} 名`, `名次：${PR.finish.map((r, i) => `${i + 1}. ${r.me ? '⭐' + r.name : r.name}`).join('　')}`, lines);
    }

    // =====================================================================
    // 機緣・古洞尋寶（6×6，靈鋤 8 把；空格顯示周圍寶物數，機關多毀一把鋤）
    // =====================================================================
    let DG;
    const DG_ITEMS = { page: { n: 4, icon: '📜', name: '秘典殘頁' }, bag: { n: 3, icon: '💰', name: '靈石袋' }, fire: { n: 1, icon: '🔥', name: '異火餘燼' },
                       relic: { n: 1, icon: '🏺', name: '古修遺寶' }, trap: { n: 4, icon: '💥', name: '機關' } };
    function dgStart() {
        const cells = Array(36).fill(null);
        const slots = shuffle([...Array(36).keys()]);
        let k = 0;
        Object.keys(DG_ITEMS).forEach(t => { for (let i = 0; i < DG_ITEMS[t].n; i++) cells[slots[k++]] = t; });
        DG = { cells, dug: Array(36).fill(false), shovels: 8, haul: { page: 0, bag: 0, fire: 0, relic: 0 }, over: false };
        $('enc-sub').textContent = '靈鋤 8 把・挖到的寶物離開時結算';
        setAction('收手離開', dgEnd);
        dgRender();
    }
    function dgNear(i) {
        const x = i % 6, y = Math.floor(i / 6); let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if ((dx || dy) && nx >= 0 && ny >= 0 && nx < 6 && ny < 6) { const c = DG.cells[ny * 6 + nx]; if (c && c !== 'trap' && !DG.dug[ny * 6 + nx]) n++; }
        }
        return n;
    }
    function dgRender(msg) {
        const H_ = DG.haul;
        $('enc-body').innerHTML = `<div class="enc-box enc-stack" style="max-width:520px;margin:0 auto">
            <div class="enc-row"><span>⛏️ 靈鋤 <b>${DG.shovels}</b></span><span>📜 ${H_.page}</span><span>💰 ${H_.bag}</span><span>🔥 ${H_.fire}</span><span>🏺 ${H_.relic}</span></div>
            <div class="dg-grid">${DG.cells.map((c, i) => {
                if (!DG.dug[i] && !DG.over) return `<button class="dg-cell" data-i="${i}"></button>`;
                if (!DG.dug[i]) return `<button class="dg-cell show" disabled>${c ? DG_ITEMS[c].icon : ''}</button>`;
                return `<button class="dg-cell dug${c === 'trap' ? ' trap' : ''}" disabled>${c ? DG_ITEMS[c].icon : (dgNear(i) || '')}</button>`;
            }).join('')}</div>
            <div class="enc-muted">${msg || '挖開空地會顯示周圍八格還藏著幾件寶物（不含機關）。碰到機關會多毀一把靈鋤。'}</div></div>`;
        document.querySelectorAll('#enc-body .dg-cell[data-i]').forEach(b => b.onclick = () => dgDig(+b.dataset.i));
    }
    function dgDig(i) {
        if (DG.over || DG.dug[i] || DG.shovels <= 0) return;
        DG.dug[i] = true; DG.shovels--;
        const c = DG.cells[i];
        let msg;
        if (c === 'trap') { DG.shovels = Math.max(0, DG.shovels - 1); msg = '<span class="c-red">💥 觸發機關，又毀了一把靈鋤！</span>'; }
        else if (c) { DG.haul[c]++; msg = `<span class="c-gold">挖到 ${DG_ITEMS[c].icon} ${DG_ITEMS[c].name}！</span>`; }
        else msg = dgNear(i) ? `空地，但周圍還藏著 ${dgNear(i)} 件寶物。` : '空地，周圍什麼都沒有。';
        if (DG.shovels <= 0) return dgEnd();
        dgRender(msg);
    }
    function dgEnd() {
        if (DG.over) return;
        DG.over = true;
        const R = ENCOUNTER_REWARDS.dig, Hh = DG.haul, h = H();
        const found = Hh.page + Hh.bag + Hh.fire + Hh.relic;
        const S = st().stats.dig;
        S.best = Math.max(S.best || 0, found);
        dgRender();
        const r = { spellShards: Hh.page * R.spellPage + Hh.relic * R.relicSpell, coins: Hh.bag * h * R.bagH, starIron: Hh.relic * R.relicIron };
        let fire = 0; for (let i = 0; i < Hh.fire; i++) fire += randIn(R.fire);
        r.fire = fire;
        const lines = grant(r, '古洞尋寶');
        const grid = document.querySelector('#enc-body .dg-grid').outerHTML;
        showResult(found > 0, found >= 6 ? '滿載而歸' : found ? '有所收穫' : '空手而回', `挖到 ${found} 件寶物。`, lines);
        $('enc-body').insertAdjacentHTML('afterbegin', `<div style="max-width:320px;margin:0 auto 10px">${grid}</div>`);
    }

    // =====================================================================
    // 機緣・丹爐試火（五爐，指針來回擺動，在綠區收火＝完美 2 分、黃區 1 分）
    // =====================================================================
    let AL;
    function alStart() {
        AL = { round: 0, scores: [], token: runToken, pos: 0, dir: 1, raf: 0, moving: false };
        $('enc-sub').textContent = '五爐火候・定丹品';
        setAction(null);
        $('enc-body').innerHTML = `<div class="enc-box enc-stack" style="max-width:560px;margin:0 auto">
            <div class="enc-row"><b id="al-round"></b><span id="al-score" class="enc-muted"></span></div>
            <div class="al-bar" id="al-bar"><div class="al-yellow" id="al-y"></div><div class="al-green" id="al-g"></div><div class="al-needle" id="al-n"></div></div>
            <div class="enc-muted">指針在<b class="c-jade">綠區</b>收火＝完美（2 分）、<b class="c-gold">黃區</b>＝尚可（1 分）；一爐比一爐快。</div>
            <div class="enc-row"><button class="sys-btn enc-primary" id="al-btn">起火</button></div>
            <div class="enc-log" id="al-log"></div></div>`;
        $('al-btn').onclick = alPress;
        alSetup();
    }
    function alSetup() {
        AL.zone = 12 + Math.random() * 66;   // 綠區左緣（%），寬 10；黃區左右各多 8
        AL.pos = 0; AL.dir = 1; AL.moving = false;
        $('al-g').style.left = AL.zone + '%'; $('al-g').style.width = '10%';
        $('al-y').style.left = (AL.zone - 8) + '%'; $('al-y').style.width = '26%';
        $('al-n').style.left = '0%';
        $('al-round').textContent = `第 ${AL.round + 1}／5 爐`;
        $('al-score').textContent = `目前 ${AL.scores.reduce((a, b) => a + b, 0)} 分`;
        $('al-btn').textContent = '起火';
    }
    function alPress() {
        if (AL.token !== runToken) return;
        // 指針位置由經過時間算出（來回三角波），收火當下重算，不依賴畫面更新（分頁被遮住時 requestAnimationFrame 會暫停）
        const posAt = now => { const d = AL.speed * (now - AL.t0) / 1000 % 200; return d <= 100 ? d : 200 - d; };
        if (!AL.moving) {   // 起火：指針開始擺動
            AL.moving = true; $('al-btn').textContent = '收火！';
            AL.speed = 55 + AL.round * 20;   // %／秒
            AL.t0 = performance.now();
            const step = now => {
                if (AL.token !== runToken || !AL.moving) return;
                const n = $('al-n'); if (n) n.style.left = posAt(now) + '%';
                AL.raf = requestAnimationFrame(step);
            };
            AL.raf = requestAnimationFrame(step);
            return;
        }
        AL.moving = false; cancelAnimationFrame(AL.raf);
        AL.pos = posAt(performance.now());
        if ($('al-n')) $('al-n').style.left = AL.pos + '%';
        const p = AL.pos, z = AL.zone;
        const sc = p >= z && p <= z + 10 ? 2 : p >= z - 8 && p <= z + 18 ? 1 : 0;
        AL.scores.push(sc);
        const log = $('al-log'); const d = document.createElement('div');
        d.innerHTML = `第 ${AL.round + 1} 爐：${sc === 2 ? '<span class="c-jade">火候完美</span>' : sc === 1 ? '<span class="c-gold">火候尚可</span>' : '<span class="c-red">火候失準</span>'}`;
        log.prepend(d);
        AL.round++;
        $('al-btn').disabled = true;
        setTimeout(() => {
            if (AL.token !== runToken) return;
            if (AL.round >= 5) return alEnd();
            $('al-btn').disabled = false; alSetup();
        }, 700);
    }
    function alEnd() {
        const total = AL.scores.reduce((a, b) => a + b, 0);
        const R = ENCOUNTER_REWARDS.alch, g = R.grades.find(x => total >= x.min), S = st().stats.alch;
        S.best = Math.max(S.best || 0, total);
        if (total >= 6) S.wins++;
        const lines = grant({ coins: H() * g.h, spellShards: g.spell, breakPills: g.breakPills || 0 }, `丹爐試火・${g.name}`);
        showResult(total >= 6, g.name === '廢丹' ? '煉成廢丹' : `${g.name}靈丹`, `五爐共 ${total} 分（${AL.scores.join('・')}）。`, lines);
    }

    // ==================== 初始化 ====================
    function init() {
        const s = st();
        if (s.active) {   // 上次在異界中關掉頁面：異界崩塌，這次奇遇作廢
            addLog(`🌫️ 上次的「${ENCOUNTER_TYPES[s.active.type] ? ENCOUNTER_TYPES[s.active.type].title : '奇遇'}」中斷，異界空間已經崩塌。`, 'system');
            s.active = null;
        }
        expire();
        renderFab();
        setInterval(() => { if (typeof player !== 'undefined' && player) { expire(); questProgress(null); renderFab(); } }, 60000);   // 機緣任務的擊殺步驟每分鐘檢查
    }

    return { onMapChange, renderFab, openList, init, trigger, _enter: enter };
})();

// ---- 全域入口（map.js、main.js 呼叫）----
function onEncounterMapChange(map, isSafe) { Encounter.onMapChange(map, isSafe); }
function initEncounters() { Encounter.init(); }
function openEncounterList() { Encounter.openList(); }
