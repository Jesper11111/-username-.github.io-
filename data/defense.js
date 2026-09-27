// 秘境「魔屠天南」：死守天南城 100 波（ARCHITECTURE.md 第 49 節）
// 流程：秘境場景按「⚔️ 死守天南城」→ openDefenseBattle()：全螢幕守城畫面，先下載三支影片（顯示預計秒數）→ 自動開始 100 波 → 結算。
// 設定（波數、影片、主題、首領）在 config-defense.js。
// 內部函式全部包在 DefenseBattle 裡（避免 draw／feed／kill 等名稱和遊戲其他全域函式衝突），只對外開放 onclick 用的三個函式。

const DefenseBattle = (() => {
    const $ = id => document.getElementById(id);
    const rand = (a, b) => a + Math.random() * (b - a);
    const blobUrls = {};                 // 影片下載後的 blob 網址：留在記憶體，同一次遊戲再進入不必重新下載
    const D = { wave: 0, total: DEFENSE_TOTAL_WAVES, kills: 0, active: false };
    let video = null, spec = null, baseRate = 1, rafId = 0, last = 0, aborter = null, opened = false;
    let parts = [], caption = null, flash = 0, punch = 0, slowT = 0, weatherAcc = 0;
    const fired = new Set();
    const clipEls = {};

    // ================== 每一波的組合（100 波都不同）==================
    // 主題 = (w-1)%10、影片 = (w-1)%3（兩者錯開）、變化 v = floor((w-1)/10) 決定開場招式、鏡頭、慢動作與招式名稱
    function waveSpec(w) {
        const i = w - 1, th = DEFENSE_THEMES[i % DEFENSE_THEMES.length], v = Math.floor(i / 10), hi = Math.floor(v / 5);
        const boss = w % DEFENSE_BOSS_EVERY === 0;
        const sp = k => th.spells[(v + k) % th.spells.length];
        return {
            w, th, v, boss,
            bossName: boss ? DEFENSE_BOSSES[(w / DEFENSE_BOSS_EVERY - 1) % DEFENSE_BOSSES.length] : null,
            clip: DEFENSE_CLIPS[i % DEFENSE_CLIPS.length].id,
            opener: DEFENSE_OPENERS[(v + hi * 2) % DEFENSE_OPENERS.length],
            camera: (v * 3 + hi) % DEFENSE_CAMERAS.length,
            slowmo: (v + hi) % 2 === 1 || boss,
            names: { open: sp(0), guard: sp(1), slash: sp(2), strike: sp(3), fin: th.finals[v % th.finals.length] + (hi ? '・極' : '') }
        };
    }
    const clipOf = id => DEFENSE_CLIPS.find(c => c.id === id);

    // ================== 強度（config-defense.js 的 DEFENSE_MILESTONES）==================
    // 強度曲線在 config-defense.js（gm.html 審核排行榜也要用）
    const realmAtk = defenseRealmAtk, waveAtk = defenseWaveAtk;
    // 換算成「相當於某境界某階」（顯示用）；超過混沌道祖 10 階顯示倍數
    function waveRealmLabel(w) {
        // 里程碑波次直接顯示指定的境界（某境界 10 階與下一境界 1 階數值相同，比對會混淆）
        const ms = DEFENSE_MILESTONES.find(m => m.wave === w);
        if (ms) return `${realms[ms.realm]} ${ms.stage || DEFENSE_MILESTONE_STAGE} 階`;
        const atk = waveAtk(w), top = realmAtk(realms.length - 1, 10);
        if (atk > top * 1.05) return `${realms[realms.length - 1]} 10 階 ×${(atk / top).toFixed(1)}`;
        let best = null;
        for (let r = DEFENSE_MILESTONES[0].realm; r < realms.length; r++) for (let s = 1; s <= 10; s++) {   // 從第 1 波的境界（煉虛）起算
            const v = realmAtk(r, s);
            // 數值相同時保留較低境界的 10 階（例：合體 10 階 = 大乘 1 階，顯示合體 10 階）
            if (v <= atk * 1.001 && (!best || v > best.v * 1.001)) best = { r, s, v };
        }
        return best ? `${realms[best.r]} ${best.s} 階` : `${realms[0]} 1 階`;
    }
    // 第 w 波妖潮的數值（首領波攻擊、氣血加成；減傷／閃避／異屬性隨波次線性提高）
    function waveEnemy(w) {
        const t = (w - 1) / Math.max(1, DEFENSE_TOTAL_WAVES - 1), lerp = ([a, b]) => a + (b - a) * t;
        const boss = w % DEFENSE_BOSS_EVERY === 0, E = DEFENSE_ENEMY;
        const atk = waveAtk(w) * (boss ? E.bossAtk : 1);
        const attrs = { def: lerp(E.def), eva: lerp(E.eva), ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0,
                        element: wuxingElements[(w * 7) % wuxingElements.length] };
        attrs[MONSTER_AFFIX_TYPES[w % MONSTER_AFFIX_TYPES.length]] = lerp(E.affix);
        return { atk, hp: waveAtk(w) * E.hpPerAtk * (boss ? E.bossHp : 1), attrs, boss };
    }
    // 以玩家當下真實數值，用遊戲的 resolveHit／tickStatus 在背後打一場（不影響玩家實際氣血與狀態）
    function simulateWave(w) {
        const e = waveEnemy(w), pa = getPlayerCombatAttrs();
        const pAtk = Math.max(getPhysAttack(), getMagAttack()) * DEFENSE_PLAYER_SKILL_MULT;
        const pMax = getMaxHp();
        let pHp = pMax, eHp = e.hp;
        const ps = newStatus(), es = newStatus();
        for (let r = 1; r <= DEFENSE_MAX_ROUNDS; r++) {
            const st = tickStatus(ps); pHp -= st.dot;
            if (pHp <= 0) return { win: false, rounds: r };
            if (!st.frozen) eHp -= resolveHit(pAtk, { attrs: pa, power: pAtk }, { attrs: e.attrs, status: es }).dmg;
            const et = tickStatus(es); eHp -= et.dot;
            if (eHp <= 0) return { win: true, rounds: r, hpLeft: pHp / pMax };
            if (!et.frozen) pHp -= resolveHit(e.atk, { attrs: e.attrs, power: e.atk }, { attrs: pa, status: ps }).dmg;
            if (pHp <= 0) return { win: false, rounds: r };
        }
        return { win: false, rounds: DEFENSE_MAX_ROUNDS, timeout: true };
    }

    // ================== 影片時間軸（原片秒數，實際觸發 = 秒數 − trim）==================
    const HERO = [0.63, 0.47];
    const CUES = {
        // 城牆雷戰：約 4.3 魔將飛撲＋護盾、5.3 劍氣放射、7 天雷轟飛、7.9 化煙、9.5 立於城牆
        battle: [
            [0.75, () => { cast(spec.names.open, '左手捏劍訣！'); fingerMotes(HERO); opener(); }],
            [3.9,  () => { cast(spec.names.guard, '魔將飛撲，法光護體擋下一擊！'); ring([0.6, 0.55], 0.28); }],
            [5.1,  () => { cast(spec.names.slash, '一劍橫斬！'); slashArc([0.5, 0.52], spec.v % 2 === 1); kill(2, 4); }],
            [6.6,  () => { cast(spec.names.strike, '劍指一引，法術轟向魔將！'); fingerMotes([0.6, 0.55]); strike(); }],
            [7.9,  () => { feed(spec.boss ? `👹 首領【${spec.bossName}】伏誅！` : '💥 魔將化為黑煙！', 'kill'); kill(1, spec.boss ? 1 : 2); punch = 0.06; if (spec.slowmo) slowmo(0.8); }],
            [8.9,  () => { cast(spec.names.fin, spec.boss ? '首領已誅，大招清場！' : '終結一擊！'); fingerMotes([0.56, 0.52]); finisher(); kill(3, spec.boss ? 9 : 6); }],
            [10.5, () => { feed('☯ 收劍凝神，靈力回轉…', 'skill'); }]
        ],
        // 佛焰金身：0.8 法陣光柱、2.9 佛掌、5.0 千手金身、7.2 掌擊、7.7 金色火環
        flame: [
            [0.2, () => { cast(spec.names.open, '左手結印，法陣降臨！'); fingerMotes([0.66, 0.52]); ring([0.45, 0.14], 0.3); opener(); }],
            [2.8, () => { cast(spec.names.guard, '金色佛掌現世，鎮壓妖潮！'); ring([0.4, 0.3], 0.35); parts.push({ k: 'glow', nx: 0.4, ny: 0.3, life: 1.2, max: 1.2 }); }],
            [4.9, () => { cast(spec.names.slash, '千手齊出！'); slashArc([0.45, 0.4], true); kill(2, 5); }],
            [7.1, () => { cast(spec.names.strike, '一掌轟落！'); strike(); punch = 0.07; kill(1, spec.boss ? 1 : 3); if (spec.slowmo) slowmo(0.7);
                          if (spec.boss) feed(`👹 首領【${spec.bossName}】被佛掌鎮壓！`, 'kill'); }],
            [7.7, () => { cast(spec.names.fin, spec.boss ? '業火輪轉，清場！' : '業火焚魔！'); finisher(); kill(3, spec.boss ? 9 : 6); }]
        ],
        // 巨劍劍氣：0～2.3 巨劍降下、2.7 落地爆光、3.1 金色法相、5.1 光柱、7.0 光球、8.6 雲開見日
        sword: [
            [0.2, () => { cast(spec.names.open, '劍指蒼穹，巨劍降世！'); fingerMotes([0.62, 0.52]); ring([0.45, 0.73], 0.25); opener(); }],
            [2.6, () => { feed('💥 巨劍貫地，妖潮潰散！', 'kill'); ring([0.45, 0.72], 0.4); punch = 0.06; flash = Math.max(flash, 0.25); kill(3, 6); }],
            [3.1, () => { cast(spec.names.guard, '法相天地，金身現世！'); parts.push({ k: 'glow', nx: 0.42, ny: 0.35, life: 1.4, max: 1.4 }); }],
            [4.5, () => { cast(spec.names.slash, '法相揮劍，金環橫掃！'); slashArc([0.42, 0.6], spec.v % 2 === 0); ring([0.42, 0.72], 0.45); kill(2, 5); }],
            [5.9, () => { cast(spec.names.strike, '劍指引光，直貫天穹！'); fingerMotes([0.6, 0.6]); strike(); }],
            [6.9, () => { cast(spec.names.fin, spec.boss ? '光爆清場，首領伏誅！' : '光爆清場！'); finisher(); kill(3, spec.boss ? 9 : 6); if (spec.slowmo) slowmo(0.7);
                          if (spec.boss) feed(`👹 首領【${spec.bossName}】灰飛煙滅！`, 'kill'); }],
            [8.5, () => { feed('☀ 雲開見日，城關暫安…', 'skill'); }]
        ]
    };

    // ================== 開啟／載入 ==================
    let realmId = 'motu';
    function open(id) {
        realmId = id || 'motu';
        opened = true;
        $('defense-scene').style.display = 'block';
        $('defense-result').classList.remove('on');
        closeRecords();
        $('defense-feed').innerHTML = '';
        D.active = false; D.wave = 0; D.kills = 0;
        spec = waveSpec(1); updateWaveBox();
        $('defense-wavebox').style.visibility = 'hidden';
        resize();
        if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(tick); }
        startLoading();
    }

    // 下載三支影片並依實際速度估算「約 N 秒後開始」；已下載過的直接開始
    async function startLoading() {
        const box = $('defense-loading');
        box.classList.add('on');
        $('defense-load-error').style.display = 'none';
        const jobs = DEFENSE_CLIPS.map(c => ({ c, loaded: blobUrls[c.id] ? c.sizeHint : 0, total: c.sizeHint, done: !!blobUrls[c.id], cached: !!blobUrls[c.id] }));
        const t0 = performance.now();
        const need = jobs.filter(j => !j.done);
        const render = () => renderLoading(jobs, t0, need.length === 0);
        render();
        const timer = setInterval(render, 250);
        aborter = new AbortController();
        try {
            await Promise.all(need.map(async j => {
                const res = await fetch(j.c.src, { signal: aborter.signal });
                if (!res.ok) throw new Error(`${j.c.name}（HTTP ${res.status}）`);
                const len = +res.headers.get('content-length'); if (len > 0) j.total = len;
                const reader = res.body.getReader(), chunks = [];
                for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); j.loaded += value.length; }
                blobUrls[j.c.id] = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
                j.total = j.loaded; j.done = true;
            }));
        } catch (e) {
            clearInterval(timer);
            if (e.name === 'AbortError') return;
            $('defense-load-status').textContent = '❌ 影片載入失敗';
            $('defense-load-error').style.display = 'block';
            $('defense-load-error-msg').textContent = String(e.message || e);
            return;
        }
        clearInterval(timer);
        render();
        $('defense-load-status').textContent = '✅ 載入完成，守城開始！';
        await new Promise(r => setTimeout(r, 700));
        if (!opened) return;
        box.classList.remove('on');
        start();
    }

    function renderLoading(jobs, t0, cached) {
        const total = jobs.reduce((s, j) => s + j.total, 0), loaded = jobs.reduce((s, j) => s + Math.min(j.loaded, j.total), 0);
        const pct = total ? loaded / total * 100 : 100;
        $('defense-load-fill').style.width = `${pct.toFixed(1)}%`;
        $('defense-load-bytes').textContent = `${(loaded / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB（${pct.toFixed(0)}%）`;
        $('defense-load-clips').innerHTML = jobs.map(j => `<span>${j.done ? '✅' : '⏳'} ${j.c.name}</span>`).join('');
        if (cached || loaded >= total) { $('defense-load-status').textContent = '✅ 影片已就緒'; return; }
        // 速度 = 本次已下載 ÷ 經過時間；剛開始資料太少時先用瀏覽器回報的網速（navigator.connection.downlink，Mbps）
        const elapsed = (performance.now() - t0) / 1000;
        const freshLoaded = jobs.reduce((s, j) => s + (j.cached ? 0 : j.loaded), 0);   // 只算這次真的在下載的量
        let speed = elapsed > 0.5 && freshLoaded > 150000 ? freshLoaded / elapsed : 0;
        if (!speed && navigator.connection && navigator.connection.downlink) speed = navigator.connection.downlink * 125000;
        $('defense-load-status').textContent = speed
            ? `⏳ 影片載入中，預計約 ${Math.max(1, Math.ceil((total - loaded) / speed))} 秒後開始`
            : '⏳ 影片載入中，計算所需時間…';
    }

    function start() {
        // 每日次數：真正開始守城時才扣（secret-realm.js）
        if (!useSecretRealmAttempt(realmId)) {
            $('defense-loading').classList.add('on');
            $('defense-load-status').textContent = `❌ 今日 ${SECRET_REALM_DAILY_ATTEMPTS} 次挑戰已用完，明日再來`;
            return;
        }
        if (typeof refreshSecretRealmEnterLabel === 'function') refreshSecretRealmEnterLabel();
        DEFENSE_CLIPS.forEach(c => {
            const el = clipEls[c.id];
            if (el.src !== blobUrls[c.id]) el.src = blobUrls[c.id];
            el.pause(); el.classList.remove('on'); el.playbackRate = baseRate;
        });
        D.active = true; D.kills = 0; D.cleared = 0; D.lost = false; D.partnerMet = false; D.snap = null;
        closeRecords();
        D.gain = { coins: 0, merit: 0, shards: 0, iron: 0, gear: [], titles: [], partners: [] };
        D.titlesBefore = (player.titles || []).slice();
        parts = []; caption = null;
        $('defense-wavebox').style.visibility = 'visible';
        feed(`🏯 妖潮壓境！死守天南城，共 ${D.total} 波（今日剩 ${getSecretRealmAttemptsLeft(realmId)} 次）`, 'wave');
        setWave(1);
        playClip(spec.clip);
    }

    // ================== 波次與影片切換 ==================
    function setWave(w) {
        D.wave = w; spec = waveSpec(w);
        spec.result = simulateWave(w);                  // 這一波守不守得住（以玩家當下數值，在背後打一場）
        spec.realmLabel = waveRealmLabel(w);
        // 這一波開打時的數值（守住後記入通關紀錄、送守城排行榜審核；扣掉禁術等暫時增益，與戰力榜同一標準）
        spec.snap = { power: getRankPower(), atk: getRankAttack(), realm: player.realmIndex, stage: player.stage, level: player.level };
        $('defense-vwrap').style.filter = spec.th.filter;
        updateWaveBox();
        $('defense-bn1').textContent = spec.boss ? `第 ${w} 波・首領來襲` : `第 ${w} 波`;
        $('defense-bn2').textContent = spec.boss ? `👹 ${spec.bossName}` : `${spec.th.icon} ${spec.th.name}妖潮`;
        $('defense-bn2').style.color = spec.boss ? '#f87171' : spec.th.c;
        const bn = $('defense-banner'); bn.classList.add('on');
        clearTimeout(setWave.t); setWave.t = setTimeout(() => bn.classList.remove('on'), 1600);
        feed(spec.boss ? `👹 第 ${w} 波・首領【${spec.bossName}】來襲！（${spec.realmLabel}）` : `🌊 第 ${w} 波・${spec.th.name}妖潮（${spec.realmLabel}）`, 'wave');
        if (!spec.result.win) feed(spec.result.timeout ? '⚠️ 妖潮源源不絕，久戰難下……' : '⚠️ 妖潮勢大，城牆岌岌可危……', 'kill');
        weatherAcc = 0;
    }
    function updateWaveBox() {
        $('defense-wave-no').textContent = D.wave;
        $('defense-wave-total').textContent = D.total;
        $('defense-kill-no').textContent = `斬殺 ${D.kills.toWan()}`;
        $('defense-wave-fill').style.width = `${D.wave / D.total * 100}%`;
        $('defense-theme').innerHTML = `🎬 ${clipOf(spec.clip).name}・<span style="color:${spec.th.c}">${spec.th.icon} ${spec.th.name}</span>`
            + (spec.realmLabel ? `<br>強度：${spec.realmLabel}` : '');
    }

    // ================== 獎勵（每守住一波立即發放，config-defense.js 的 DEFENSE_REWARDS）==================
    const R = DEFENSE_REWARDS;
    const randInt = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
    // 靈石 = 等強度境界的主要練功地圖掛機 coinMinutes 分鐘的收入（config-realms.js 的 realmPacing → 該地圖 coins × 每小時擊殺數）
    function waveCoins(w) {
        let r = 0;
        for (let i = 0; i < realms.length; i++) if (realmAtk(i, 1) <= waveAtk(w)) r = i;
        const pace = realmPacing[Math.min(r, realmPacing.length - 1)];
        let coins = 0;
        maps.forEach(cat => cat.items.forEach(m => { if (m.name === pace.map) coins = m.coins; }));
        return Math.floor(coins * KILLS_PER_HOUR_ESTIMATE / 60 * R.coinMinutes * (w % DEFENSE_BOSS_EVERY === 0 ? 3 : 1));
    }
    function rollQuality(w) {
        const band = R.gearOdds.filter(b => w >= b.from).pop();
        let r = Math.random(), acc = 0;
        for (const q in band.odds) { acc += band.odds[q]; if (r < acc) return q; }
        return Object.keys(band.odds).pop();
    }
    // setPiece：秘境套裝部件（一次一件）；否則器錄武器／防具（奪寶、拍賣、可製作管道，不含秘境）
    function dropGear(w, setPiece) {
        const pool = setPiece ? gearList.filter(d => d.channel === 'realm' && d.set)
                              : gearList.filter(d => (d.category === 'weapon' || d.category === 'armor') && d.channel !== 'realm');
        const def = pool[Math.floor(Math.random() * pool.length)];
        const qualityObj = getQualityObj(rollQuality(w));
        const levels = EQUIP_LEVELS.filter(l => l <= player.level);
        const level = levels.length ? levels[levels.length - 1] : EQUIP_LEVELS[0];
        const eq = createGearEquip(def, qualityObj, level * EQUIP_LEVEL_STAT_MULT * qualityObj.mult, level);
        const where = receiveLootEquip(eq);   // 背包滿：白～紫自動分解、橙色進暫存區（enhance.js）
        const text = `${setPiece ? '❖' : '⚔️'}【Lv.${level}·${eq.quality}·${getEquipDisplayName(eq)}${def.set ? `（${def.set}套）` : ''}】`;
        D.gain.gear.push(text);
        feed(`🎁 獲得${text}（${where}）`, 'kill');
    }
    function grantWave(w) {
        const boss = w % DEFENSE_BOSS_EVERY === 0, g = D.gain;
        const coins = waveCoins(w); player.coins += coins; g.coins += coins;
        const merit = randInt(boss ? R.bossMerit : R.merit); player.merit = (player.merit || 0) + merit; g.merit += merit;
        if (boss || Math.random() < R.shardChance) g.shards += addFireShards(randInt(boss ? R.bossShard : R.shard));
        if (boss || Math.random() < R.ironChance) g.iron += addStarIron(randInt(boss ? R.bossIron : R.iron));
        if (Math.random() < R.gearChance) dropGear(w, false);
        if (boss || (w >= 20 && Math.random() < R.setChance)) dropGear(w, true);
        // 天驕級夥伴：守住第 partnerFromWave 波起，每波有機率遇見一位尚未結識的（每次守城最多 1 位）
        if (w >= R.partnerFromWave && !D.partnerMet && Math.random() < R.partnerChance) {
            const pool = partnerList.filter(p => getPartnerTier(p).name === '天驕' && !isPartnerMet(p.id));
            if (pool.length) {
                const p = pool[Math.floor(Math.random() * pool.length)];
                meetPartner(p.id, `於秘境「魔屠天南」第 ${w} 波並肩守城`);
                D.partnerMet = true; g.partners.push(`${p.title}・${p.name}`);
                feed(`💞 天驕【${p.title}・${p.name}】前來助陣，結識了！`, 'kill');
            }
        }
        D.cleared = w; D.snap = spec.snap;
        if (w > (player.defenseBest || 0)) { player.defenseBest = w; checkTitleUnlocks(); }
        if (boss) settleMeritStones();   // 功德滿額自動凝結七彩補天石（merit.js）
    }
    function rewardSummaryHtml() {
        const g = D.gain;
        const newTitles = (player.titles || []).filter(id => !D.titlesBefore.includes(id))
            .map(id => titleList.find(t => t.id === id)).filter(Boolean).map(t => `「${getTitleName(t)}」`);
        const rows = [
            `💎 靈石 ${g.coins.toWan()}`, `☯️ 功德 ${g.merit.toWan()}`,
            g.shards ? `🔥 異火碎片 ×${g.shards}` : '', g.iron ? `🌠 星允鐵 ×${g.iron}` : '',
            g.gear.length ? `⚔️ 裝備 ${g.gear.length} 件` : '',
            newTitles.length ? `🏅 新稱號 ${newTitles.join('、')}` : '',
            g.partners.length ? `💞 結識 ${g.partners.join('、')}` : ''
        ].filter(Boolean);
        return rows.join('<br>');
    }
    // 結束（勝或敗）：結算畫面＋遊戲日誌（道具分頁）一筆彙整
    function settle(win) {
        D.active = false;
        $('defense-result-title').textContent = win ? '守城成功' : '天南失守';
        $('defense-result-title').style.color = win ? '' : '#fca5a5';
        const head = win ? `守住全部 ${D.total} 波妖潮` : `守住 ${D.cleared} 波，第 ${D.wave} 波失守`;
        $('defense-result-sum').innerHTML = `${head}<br>斬殺 ${D.kills.toWan()} 隻妖魔<br><br>${D.cleared ? rewardSummaryHtml() : '（未守住任何一波，沒有獎勵）'}`
            + `<br><span style="color:#9ca3af;font-size:0.85em">歷史最高：第 ${player.defenseBest || 0} 波</span>`;
        $('defense-result').classList.add('on');
        feed(win ? `🏆 守城成功！共斬殺 ${D.kills.toWan()} 隻妖魔` : `💀 第 ${D.wave} 波失守……`, 'kill');
        logRun(win);
        updateUI();
    }
    function logRun(win) {
        if (!D.gain) return;
        const g = D.gain;
        addLog(`🏯 秘境「魔屠天南」${win ? '守城成功' : `守住 ${D.cleared} 波`}：靈石 ${g.coins.toWan()}、功德 ${g.merit.toWan()}`
            + `${g.shards ? `、異火碎片 ×${g.shards}` : ''}${g.iron ? `、星允鐵 ×${g.iron}` : ''}${g.gear.length ? `、裝備 ${g.gear.length} 件` : ''}`
            + `${g.partners.length ? `、結識 ${g.partners.join('、')}` : ''}`, 'level-up', true, 'item');
        D.gain = null;   // 只記一次（離開時不重複）
        recordRun(win);
    }

    // ================== 通關紀錄（player.defenseRuns，最新在前）＋送守城排行榜審核（leaderboard.js）==================
    // 數值取「最後守住的那一波開打時」的快照；一波都沒守住則取當下數值（不送排行榜）
    function recordRun(win) {
        const s = D.snap || { power: getRankPower(), atk: getRankAttack(), realm: player.realmIndex, stage: player.stage, level: player.level };
        const run = { at: Date.now(), cleared: D.cleared || 0, win: !!win, kills: D.kills || 0,
                      power: s.power, atk: s.atk, realm: s.realm, stage: s.stage, level: s.level };
        player.defenseRuns = [run].concat(player.defenseRuns || []).slice(0, DEFENSE_RUN_LOG_MAX);
        if (run.cleared > 0) submitDefenseRecord(run);
    }
    function openRecords() {
        const runs = player.defenseRuns || [];
        const two = n => String(n).padStart(2, '0');
        const when = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${two(d.getHours())}:${two(d.getMinutes())}`; };
        $('defense-records-body').innerHTML =
            `<div class="dr-best">歷史最高：守住第 <b>${player.defenseBest || 0}</b> 波</div>`
            + `<div class="dr-rank">${getDefenseRankStatusText()}</div>`
            + (runs.length ? runs.map(r => `<div class="dr-row${r.win ? ' win' : ''}">
                    <span class="dr-when">${when(r.at)}</span>
                    <span class="dr-res">${r.win ? `🏆 全數守住 ${r.cleared} 波` : r.cleared ? `守住 ${r.cleared} 波` : '一波未守住'}</span>
                    <small>${realms[r.realm] || '？'} ${r.stage} 階・戰力 ${Number(r.power || 0).toWan()}・斬殺 ${Number(r.kills || 0).toWan()}</small>
                </div>`).join('')
              : '<div class="dr-empty">尚無守城紀錄</div>')
            + `<div class="dr-note">保留最近 ${DEFENSE_RUN_LOG_MAX} 場。刷新個人最佳時自動送審，審核通過才會登上洞府「大道石碑」的守城排行榜。</div>`;
        $('defense-records').classList.add('on');
    }
    function closeRecords() { $('defense-records').classList.remove('on'); }
    function playClip(id) {
        const next = clipEls[id], prev = video;
        next.currentTime = 0; next.playbackRate = baseRate; next.play().catch(() => {});
        next.classList.add('on');
        if (prev && prev !== next) { prev.classList.remove('on'); setTimeout(() => { if (prev !== video) prev.pause(); }, 700); }
        video = next; fired.clear();
    }

    // ================== 戰況文字 ==================
    function kill(a, b) { if (!D.active) return; D.kills += a + Math.floor(Math.random() * (b - a + 1)); $('defense-kill-no').textContent = `斬殺 ${D.kills.toWan()}`; }
    function feed(text, cls) {
        const f = $('defense-feed'), d = document.createElement('div'); d.className = cls; d.textContent = text;
        f.appendChild(d); while (f.children.length > 4) f.firstChild.remove();
    }
    function cast(name, line) { caption = { text: `${spec.th.icon} ${name}`, color: spec.th.c, life: 1.5, max: 1.5 }; feed(`${spec.th.icon} ${name}　${line}`, 'skill'); }

    // ================== 招式組合 ==================
    const TARGETS = [[0.12, 0.62], [0.22, 0.72], [0.3, 0.66], [0.08, 0.78], [0.35, 0.8], [0.18, 0.86], [0.42, 0.74]];
    function opener() {
        const k = spec.th.proj;
        if (spec.opener === 'volley') for (let i = 0; i < 6; i++) proj(k, HERO, TARGETS[i], 0.25 + i * 0.08);
        else if (spec.opener === 'rain') for (let i = 0; i < 10; i++) { const x = rand(0.05, 0.6); proj(k, [x + 0.15, -0.05], [x, rand(0.62, 0.9)], i * 0.07, true); }
        else if (spec.opener === 'pillars') TARGETS.slice(0, 5).forEach((t, i) => parts.push({ k: 'pillar', nx: t[0], ny: t[1], delay: 0.2 + i * 0.12, life: 0.6, max: 0.6 }));
        else if (spec.opener === 'spiral') { parts.push({ k: 'spiral', nx: 0.25, ny: 0.72, life: 1.4, max: 1.4, delay: 0.2 }); for (let i = 0; i < 4; i++) proj(k, HERO, TARGETS[i], 0.3 + i * 0.1); }
        else TARGETS.slice(0, 6).forEach((t, i) => parts.push({ k: 'ring', nx: t[0], ny: t[1], r: 0.08, delay: 0.2 + i * 0.1, life: 0.5, max: 0.5 }));
    }
    function strike() {
        if (spec.th.fin === 'bolt' || spec.v % 5 === 2) for (let i = 0; i < 3; i++) parts.push({ k: 'bolt', nx: 0.28 + i * 0.08, ny: 0.5, delay: i * 0.12, life: 0.3, max: 0.3 });
        else for (let i = 0; i < 4; i++) proj(spec.th.proj, [0.6, 0.55], [0.3 + rand(-0.08, 0.08), 0.45 + rand(-0.08, 0.08)], i * 0.08);
        ring([0.3, 0.45], 0.2);
    }
    function finisher() {
        const f = spec.th.fin, n = spec.boss ? 20 : 12;
        if (f === 'meteor') for (let i = 0; i < (spec.boss ? 7 : 4); i++) { const x = rand(0.1, 0.8); proj('meteor', [x + 0.35, -0.1], [x, rand(0.65, 0.9)], i * 0.18, true); }
        else if (f === 'pillar') for (let i = 0; i < n / 2; i++) parts.push({ k: 'pillar', nx: rand(0.05, 0.95), ny: rand(0.65, 0.92), delay: i * 0.08, life: 0.6, max: 0.6 });
        else if (f === 'spiral') { parts.push({ k: 'spiral', nx: 0.35, ny: 0.72, life: 1.8, max: 1.8 }); parts.push({ k: 'spiral', nx: 0.7, ny: 0.8, life: 1.8, max: 1.8, delay: 0.3 }); }
        else if (f === 'bolt') for (let i = 0; i < n / 2; i++) parts.push({ k: 'bolt', nx: rand(0.05, 0.95), ny: rand(0.6, 0.9), delay: i * 0.09, life: 0.28, max: 0.28 });
        const kind = f === 'rainShard' ? 'shard' : f === 'rainOrb' ? 'orb' : spec.th.proj;
        for (let i = 0; i < n; i++) { const x = rand(0.02, 0.98); proj(kind, [x + 0.12, -0.06], [x - rand(0, 0.05), rand(0.7, 0.96)], 0.1 + i * 0.05, true); }
        if (spec.boss) flash = 0.4;
    }

    // ================== 特效引擎（座標 0～1 = 影片畫面比例）==================
    function cv() { return $('defense-fx'); }
    function resize() {
        const c = cv(), stage = $('defense-stage');
        c.width = stage.clientWidth * devicePixelRatio; c.height = stage.clientHeight * devicePixelRatio;
        parts.forEach(p => { if (p.trail) p.trail.length = 0; if (p.pts || p.k === 'wx' || p.k === 'spark') p.life = 0; });   // 新舊比例混在同一條拖尾會連成長線
    }
    function map(nx, ny) {
        const c = cv(), s = Math.max(c.width / 720, c.height / 1280);
        return [(c.width - 720 * s) / 2 + nx * 720 * s, (c.height - 1280 * s) / 2 + ny * 1280 * s];
    }
    function proj(kind, from, to, delay, straight) {
        parts.push({ k: 'proj', kind, fx: from[0], fy: from[1] - 0.03, tx: to[0], ty: to[1],
            cx: straight ? (from[0] + to[0]) / 2 : (from[0] + to[0]) / 2 + rand(-0.08, 0.08), cy: straight ? (from[1] + to[1]) / 2 : Math.min(from[1], to[1]) - rand(0.1, 0.2),
            t: 0, dur: kind === 'meteor' ? rand(0.8, 1.1) : rand(0.5, 0.75), delay, trail: [], life: 4, max: 4 });
    }
    function fingerMotes([nx, ny]) {
        for (let i = 0; i < 20; i++) { const a = rand(0, Math.PI * 2), d = rand(0.05, 0.13);
            parts.push({ k: 'mote', nx: nx + Math.cos(a) * d, ny: ny + Math.sin(a) * d * 0.6, tx: nx, ty: ny, life: 0.8, max: 0.8 }); }
        parts.push({ k: 'glow', nx, ny, life: 0.9, max: 0.9 });
    }
    function ring([nx, ny], r) { parts.push({ k: 'ring', nx, ny, r, life: 0.5, max: 0.5 }); }
    function slashArc([nx, ny], cross) { parts.push({ k: 'arc', nx, ny, rot: 0, life: 0.35, max: 0.35 }); if (cross) parts.push({ k: 'arc', nx, ny, rot: 1.2, life: 0.35, max: 0.35, delay: 0.1 }); }
    function burst(x, y, n) { for (let i = 0; i < n; i++) parts.push({ k: 'spark', x, y, vx: rand(-1, 1) * 170 * devicePixelRatio, vy: rand(-1, 0.4) * 170 * devicePixelRatio, life: rand(0.25, 0.55), max: 0.55 }); }
    function slowmo(sec) { slowT = sec; if (video) video.playbackRate = baseRate * 0.35; }
    function jag(x1, y1, x2, y2, d) { if (d < 5 * devicePixelRatio) return [[x1, y1], [x2, y2]]; const mx = (x1 + x2) / 2 + rand(-d, d), my = (y1 + y2) / 2 + rand(-d / 3, d / 3); return jag(x1, y1, mx, my, d / 2).concat(jag(mx, my, x2, y2, d / 2).slice(1)); }

    const WEATHER_RATE = { rain: 60, snow: 18, embers: 14, sparkle: 10, leaves: 5, spores: 10, wind: 14, ash: 12, blood: 45 };
    function spawnWeather(dt) {
        const c = cv(), W = c.width, H = c.height, dpr = devicePixelRatio, type = spec.th.weather;
        weatherAcc += (WEATHER_RATE[type] || 10) * dt;
        while (weatherAcc >= 1) {
            weatherAcc--;
            const p = { k: 'wx', type, life: 3, max: 3 };
            if (type === 'rain' || type === 'blood') Object.assign(p, { x: rand(-0.1, 1.1) * W, y: -10, vx: -60 * dpr, vy: rand(700, 900) * dpr, life: 1.4, max: 1.4 });
            else if (type === 'snow') Object.assign(p, { x: rand(0, W), y: -10, vx: rand(-20, 20) * dpr, vy: rand(40, 80) * dpr, s: rand(1.2, 3) * dpr, life: 8, max: 8 });
            else if (type === 'embers') Object.assign(p, { x: rand(0, W), y: H + 10, vx: rand(-15, 15) * dpr, vy: -rand(40, 90) * dpr, s: rand(1, 2.5) * dpr, life: 5, max: 5 });
            else if (type === 'sparkle') Object.assign(p, { x: rand(0, W), y: rand(0, H), vx: 0, vy: -10 * dpr, s: rand(1, 2.4) * dpr, life: rand(0.8, 1.6), max: 1.6 });
            else if (type === 'leaves') Object.assign(p, { x: rand(-0.1, 1) * W, y: -20, vx: rand(20, 60) * dpr, vy: rand(50, 90) * dpr, s: rand(4, 7) * dpr, rot: rand(0, 6), life: 9, max: 9 });
            else if (type === 'spores') Object.assign(p, { x: rand(0, W), y: rand(0.4, 1) * H, vx: rand(-10, 10) * dpr, vy: -rand(8, 25) * dpr, s: rand(2, 5) * dpr, life: 4, max: 4 });
            else if (type === 'wind') Object.assign(p, { x: -40, y: rand(0, H), vx: rand(700, 1000) * dpr, vy: rand(-30, 30) * dpr, life: 1.2, max: 1.2 });
            else if (type === 'ash') Object.assign(p, { x: rand(0, W), y: -10, vx: rand(-15, 15) * dpr, vy: rand(25, 50) * dpr, s: rand(1.2, 2.6) * dpr, life: 9, max: 9 });
            parts.push(p);
        }
    }

    function drawProjectile(ctx, p, x, y, ang) {
        const dpr = devicePixelRatio, c = spec.th.c;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.shadowColor = c; ctx.shadowBlur = 16;
        if (p.kind === 'sword' || p.kind === 'goldsword' || p.kind === 'redsword') {
            ctx.scale(dpr * 0.8, dpr * 0.8);
            ctx.fillStyle = p.kind === 'goldsword' ? '#fffbeb' : p.kind === 'redsword' ? '#fee2e2' : '#f0f9ff';
            ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-4, -4); ctx.lineTo(-20, -2); ctx.lineTo(-20, 2); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = p.kind === 'redsword' ? '#7f1d1d' : '#fbbf24'; ctx.fillRect(-24, -5, 4, 10);
        } else if (p.kind === 'fire' || p.kind === 'meteor') {
            const r = (p.kind === 'meteor' ? 22 : 12) * dpr;
            const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r); g.addColorStop(0, '#fff7ed'); g.addColorStop(0.45, '#fb923c'); g.addColorStop(1, 'rgba(234,88,12,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        } else if (p.kind === 'shard') {
            ctx.fillStyle = '#f0fdff'; ctx.beginPath(); ctx.moveTo(18 * dpr, 0); ctx.lineTo(-8 * dpr, -4 * dpr); ctx.lineTo(-8 * dpr, 4 * dpr); ctx.closePath(); ctx.fill();
        } else if (p.kind === 'leaf') {
            ctx.rotate(p.t * 12); ctx.fillStyle = '#86efac'; ctx.beginPath(); ctx.ellipse(0, 0, 10 * dpr, 4 * dpr, 0, 0, Math.PI * 2); ctx.fill();
        } else {   // orb
            const r = 10 * dpr, g = ctx.createRadialGradient(0, 0, 1, 0, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, c); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    const WEATHER_COLOR = { snow: '#ffffff', embers: '#fb923c', sparkle: '#fde68a', spores: '#bef264', ash: '#a78bfa' };
    function draw(dt) {
        const c = cv(), ctx = c.getContext('2d'), W = c.width, H = c.height, dpr = devicePixelRatio, col = spec.th.c;
        ctx.clearRect(0, 0, W, H);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        parts.forEach(p => {
            if (p.delay > 0) { p.delay -= dt; return; }
            p.life -= dt; const a = Math.max(0, Math.min(1, p.life / p.max));
            if (p.k === 'proj') {
                p.t = Math.min(1, p.t + dt / p.dur); const t = p.t, u = 1 - t;
                const [x, y] = map(u * u * p.fx + 2 * u * t * p.cx + t * t * p.tx, u * u * p.fy + 2 * u * t * p.cy + t * t * p.ty);
                p.trail.push([x, y]); if (p.trail.length > (p.kind === 'meteor' ? 16 : 10)) p.trail.shift();
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.strokeStyle = col; ctx.globalAlpha = i / p.trail.length * 0.7; ctx.lineWidth = i / p.trail.length * (p.kind === 'meteor' ? 12 : 5) * dpr;
                    ctx.beginPath(); ctx.moveTo(...p.trail[i - 1]); ctx.lineTo(...p.trail[i]); ctx.stroke();
                }
                ctx.globalAlpha = 1;
                const prev = p.trail[p.trail.length - 2] || [x - 1, y];
                drawProjectile(ctx, p, x, y, Math.atan2(y - prev[1], x - prev[0]));
                if (p.t >= 1) { burst(x, y, p.kind === 'meteor' ? 26 : 9); if (p.kind === 'meteor') parts.push({ k: 'ringpx', x, y, life: 0.5, max: 0.5 }); p.life = 0; }
            } else if (p.k === 'mote') {
                p.nx += (p.tx - p.nx) * Math.min(1, dt * 4); p.ny += (p.ty - p.ny) * Math.min(1, dt * 4);
                const [x, y] = map(p.nx, p.ny); ctx.globalAlpha = a; ctx.fillStyle = spec.th.c2;
                ctx.beginPath(); ctx.arc(x, y, 2.4 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            } else if (p.k === 'glow') {
                const [x, y] = map(p.nx, p.ny), r = (14 + (1 - a) * 22) * dpr;
                const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, spec.th.c2); g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            } else if (p.k === 'arc') {
                const [x, y] = map(p.nx, p.ny);
                ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = (10 * a + 2) * dpr; ctx.shadowColor = col; ctx.shadowBlur = 20 * dpr;
                ctx.beginPath(); ctx.arc(x, y, W * 0.42 * (1.25 - a * 0.25), Math.PI + p.rot - 0.9, Math.PI + p.rot + 0.9); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            } else if (p.k === 'ring' || p.k === 'ringpx') {
                const [x, y] = p.k === 'ring' ? map(p.nx, p.ny) : [p.x, p.y];
                ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = (5 * a + 1) * dpr;
                ctx.beginPath(); ctx.arc(x, y, W * (p.r || 0.12) * (1.4 - a * 0.9), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
            } else if (p.k === 'pillar') {
                const [x, y] = map(p.nx, p.ny), w = 22 * dpr * (0.4 + a);
                const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, col); g.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - w, 0, w * 2, y); ctx.globalAlpha = 1;
                if (!p.hit) { p.hit = true; burst(x, y, 10); }
            } else if (p.k === 'bolt') {
                if (!p.pts) { const [x, y] = map(p.nx, p.ny); p.pts = jag(x + rand(-40, 40) * dpr, 0, x, y, 60 * dpr); flash = Math.max(flash, 0.2); burst(x, y, 10); }
                ctx.strokeStyle = spec.th.c2; ctx.globalAlpha = a; ctx.lineWidth = 3 * dpr; ctx.shadowColor = col; ctx.shadowBlur = 18 * dpr;
                ctx.beginPath(); p.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            } else if (p.k === 'spiral') {
                const [x, y] = map(p.nx, p.ny), prog = 1 - a;
                ctx.strokeStyle = col; ctx.lineWidth = 3 * dpr; ctx.globalAlpha = Math.min(1, a * 2);
                for (let j = 0; j < 5; j++) { const r = (20 + j * 16 + prog * 60) * dpr, st = prog * 14 + j * 1.3;
                    ctx.beginPath(); ctx.ellipse(x, y - j * 18 * dpr * prog, r, r * 0.35, 0, st, st + 2.2); ctx.stroke(); }
                ctx.globalAlpha = 1;
            } else if (p.k === 'spark') {
                p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dpr * dt;
                ctx.globalAlpha = a; ctx.fillStyle = spec.th.c2; ctx.beginPath(); ctx.arc(p.x, p.y, 2 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
            } else if (p.k === 'wx') {
                p.x += p.vx * dt; p.y += p.vy * dt;
                if (p.type === 'rain' || p.type === 'blood') {
                    ctx.strokeStyle = p.type === 'blood' ? 'rgba(248,113,113,0.45)' : 'rgba(191,219,254,0.35)'; ctx.lineWidth = 1.2 * dpr;
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
                } else if (p.type === 'wind') {
                    ctx.strokeStyle = `rgba(240,249,255,${0.35 * a})`; ctx.lineWidth = 1.5 * dpr;
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 80 * dpr, p.y - p.vy * 0.08); ctx.stroke();
                } else if (p.type === 'leaves') {
                    p.rot += dt * 3; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = 0.8; ctx.fillStyle = '#4ade80';
                    ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                } else {
                    ctx.globalAlpha = p.type === 'sparkle' ? Math.sin(a * Math.PI) : Math.min(1, a * 2) * 0.8;
                    ctx.fillStyle = WEATHER_COLOR[p.type]; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
                }
            }
        });
        ctx.restore();
        parts = parts.filter(p => p.life > 0 && !(p.k === 'wx' && (p.y > H + 40 || p.x > W + 120)));
        if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.4})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 2); }
        if (caption) {
            caption.life -= dt;
            const a = Math.min(1, caption.life / caption.max * 3), rise = (1 - caption.life / caption.max) * 14 * dpr;
            ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
            ctx.font = `bold ${Math.round(W / dpr * 0.082) * dpr}px KaiTi, DFKai-SB, "Microsoft JhengHei", serif`;
            ctx.lineWidth = 6 * dpr; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(caption.text, W / 2, H * 0.24 - rise);
            ctx.fillStyle = caption.color; ctx.shadowColor = caption.color; ctx.shadowBlur = 10 * dpr;
            ctx.fillText(caption.text, W / 2, H * 0.24 - rise); ctx.restore();
            if (caption.life <= 0) caption = null;
        }
    }

    // 鏡頭運動（依變化）＋擊中衝擊縮放；基本倍率依影片（裁掉浮水印）
    function camera(t) {
        const p = Math.min(1, t / ((video && video.duration) || 10));
        let f = 1, x = 0, r = 0;
        if (spec.camera === 1) f = 1 + 0.09 * p;
        else if (spec.camera === 2) { f = 1.065; x = (p - 0.5) * 6; }
        else if (spec.camera === 3) f = 1.11 - 0.11 * p;
        else if (spec.camera === 4) { f = 1.04; r = -1.5 + 3 * p; }
        const s = clipOf(spec.clip).zoom * f + punch;
        $('defense-vwrap').style.transform = `scale(${s.toFixed(3)}) translateX(${x.toFixed(2)}%) rotate(${r.toFixed(2)}deg)`;
    }

    // ================== 主迴圈 ==================
    function tick(now) {
        rafId = 0;
        if (!opened) return;
        const real = Math.min(0.05, (now - last) / 1000); last = now;
        if (D.active && video) {
            const t = video.currentTime, dur = video.duration || 99;
            if (!spec.result.win && t >= dur * DEFENSE_LOSE_AT) {   // 守不住：播到一半城牆失守（在終結技之前）
                punch = 0.08; flash = 0.5; settle(false);
            } else if (t >= dur - DEFENSE_CLIP_FADE || video.ended) {   // 守住：發這一波的獎勵，接下一波（另一支影片交叉淡入）
                grantWave(D.wave);
                if (D.wave < D.total) { setWave(D.wave + 1); playClip(spec.clip); }
                else settle(true);
            }
            const trim = clipOf(spec.clip).trim, tt = video.currentTime;
            CUES[spec.clip].forEach(([raw, run], i) => {
                const at = Math.max(0.05, raw - trim);
                if (!fired.has(i) && tt >= at && tt < at + 1.2) { fired.add(i); run(); }
            });
        } else if (!D.active && video && video.ended) { video.currentTime = 0; video.play().catch(() => {}); }   // 結算後背景繼續循環
        if (slowT > 0) { slowT -= real; if (slowT <= 0 && video) video.playbackRate = baseRate; }
        punch = Math.max(0, punch - real * 0.12);
        const dt = real * (video ? video.playbackRate : 1);
        if (video) camera(video.currentTime);
        spawnWeather(dt);
        draw(dt);
        rafId = requestAnimationFrame(tick);
    }

    function close() {
        if (D.active && !confirm(`確定要離開嗎？\n已守住的 ${D.cleared || 0} 波獎勵會保留，但今日這次挑戰次數已使用。`)) return;
        if (D.active) logRun(false);
        opened = false; D.active = false;
        if (aborter) aborter.abort();
        if (rafId) cancelAnimationFrame(rafId); rafId = 0;
        Object.values(clipEls).forEach(v => { v.pause(); v.classList.remove('on'); });
        video = null; parts = []; caption = null;
        $('defense-loading').classList.remove('on');
        $('defense-scene').style.display = 'none';
    }

    function setSpeed(r) {
        baseRate = r;
        Object.values(clipEls).forEach(v => v.playbackRate = r);
        document.querySelectorAll('.defense-speed button').forEach(b => b.classList.toggle('on', +b.dataset.r === r));
    }

    function init() {
        DEFENSE_CLIPS.forEach(c => { clipEls[c.id] = document.querySelector(`#defense-vwrap video[data-clip="${c.id}"]`); });
        addEventListener('resize', () => { if (opened) resize(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    // 測試用：不播影片，直接把第 w 波的時間軸跑 sec 秒（觸發招式＋畫特效），回傳最多同時粒子數
    function _sim(w, sec) {
        spec = waveSpec(w); parts = []; caption = null;
        const trim = clipOf(spec.clip).trim; let maxParts = 0;
        for (let s = 0; s < sec * 30; s++) {
            const t = s / 30;
            CUES[spec.clip].forEach(([raw, run]) => { if (Math.abs(t - Math.max(0.05, raw - trim)) < 1 / 60) run(); });
            spawnWeather(1 / 30); draw(1 / 30); maxParts = Math.max(maxParts, parts.length);
        }
        return maxParts;
    }

    return { open, close, setSpeed, retry: startLoading, openRecords, closeRecords, waveSpec, waveAtk, waveRealmLabel, waveEnemy, simulateWave, _sim,
             _grantWave: grantWave, _settle: settle, _setWave: setWave,   // 測試用：直接發某一波的獎勵／結算／切波（不播影片）
             _state: () => ({ D, spec, parts: parts.length, video: video && video.dataset.clip }) };
})();

// ---- onclick 用（index.html #defense-scene、secret-realm.js）----
function openDefenseBattle(realmId) { DefenseBattle.open(realmId); }
function closeDefenseBattle() { DefenseBattle.close(); }
function setDefenseSpeed(r) { DefenseBattle.setSpeed(r); }
function openDefenseRecords() { DefenseBattle.openRecords(); }
function closeDefenseRecords() { DefenseBattle.closeRecords(); }
