// 夥伴（情緣系統，ARCHITECTURE.md 第 39 節）；資料與模板在 config-partners.js
// 存檔欄位：
//   player.partners      已結識的夥伴 id 陣列
//   player.partnerTeam   隊伍中的夥伴 id（最多 PARTNER_TEAM_MAX 名，好感度需達 PARTNER_TEAM_MIN_LV「熟識」）
//   player.partnerBond   { 夥伴 id: { pts 好感點數, greet 最後問候日期, giftDate, gifts 當日贈禮次數, quest 進行中的情緣任務 } }
//   player.fieldKills    累計野外擊殺（情緣任務用，combat.js 呼叫 onPartnerFieldKills）
//   以上皆轉世保留。舊版 player.activePartner（單人出戰）已改為隊伍，讀檔時由 migratePartners 轉換
// 入口：洞府底部導覽「情緣」→ openPartnerModal()；天星城坊市的風希人偶 → talkToPartner('dashanren')

const partnerById = {};
partnerList.forEach(p => { partnerById[p.id] = p; });

function getPartnerPowerAvg(p) {
    let keys = Object.keys(PARTNER_POWER_LABELS);
    return keys.reduce((s, k) => s + (p.power[k] || 0), 0) / keys.length;
}

function getPartnerTier(p) {
    let avg = getPartnerPowerAvg(p);
    return PARTNER_TIERS.find(t => avg >= t.min) || PARTNER_TIERS[PARTNER_TIERS.length - 1];
}

function isPartnerMet(id) {
    return (player.partners || []).includes(id);
}

// ==================== 好感度 ====================
function getBond(id) {
    if (!player.partnerBond || typeof player.partnerBond !== 'object') player.partnerBond = {};
    if (!player.partnerBond[id]) player.partnerBond[id] = { pts: 0, greet: '', giftDate: '', gifts: 0, quest: null };
    return player.partnerBond[id];
}

function getBondLevel(id) {
    let pts = isPartnerMet(id) ? getBond(id).pts : 0;
    let lv = PARTNER_BOND_LEVELS[0];
    PARTNER_BOND_LEVELS.forEach(l => { if (pts >= l.min) lv = l; });
    return lv;
}

// 等級名稱：LV5 依雙方性別 → 異性「道侶」、同性「結拜」
function getBondLevelName(id, lvObj) {
    let lv = lvObj || getBondLevel(id);
    if (!lv.name.includes('|')) return lv.name;
    let [opposite, same] = lv.name.split('|');
    let p = partnerById[id];
    let partnerFemale = p && p.gender === 'f';
    let playerFemale = player.gender === 'female';
    return partnerFemale !== playerFemale ? opposite : same;
}

// 增加好感（上限 PARTNER_BOND_MAX），升級時寫日誌；回傳實際增加量
function addBond(id, n, source) {
    let p = partnerById[id];
    if (!p || !isPartnerMet(id)) return 0;
    let b = getBond(id);
    let before = getBondLevel(id).lv;
    let add = Math.max(0, Math.min(n, PARTNER_BOND_MAX - b.pts));
    b.pts += add;
    let after = getBondLevel(id);
    if (after.lv > before) {
        addLog(`💗 與【${p.title}・${p.name}】的好感提升至 LV${after.lv}「${getBondLevelName(id, after)}」！`
            + (after.lv === PARTNER_TEAM_MIN_LV ? '現在可以邀請他加入隊伍了。' : '')
            + (after.lv === 5 ? `入隊時被動 ×${PARTNER_LV5_PASSIVE_MULT}、絕學機率 +${Math.round(PARTNER_LV5_SKILL_BONUS * 100)}%。` : ''), "level-up");
    } else if (add > 0 && source) {
        addLog(`💗 ${source}，【${p.name}】好感 +${add}（${b.pts} / ${nextBondMin(id)}）`, "system");
    }
    return add;
}

// 降低好感（不低於 0）；掉到熟識以下時自動離開隊伍。回傳實際減少量
function reduceBond(id, n, reason) {
    let p = partnerById[id];
    if (!p || !isPartnerMet(id)) return 0;
    let b = getBond(id);
    let before = getBondLevel(id).lv;
    let sub = Math.min(n, b.pts);
    b.pts -= sub;
    let after = getBondLevel(id);
    addLog(`💔 ${reason ? reason + '，' : ''}【${p.name}】好感 -${sub}（${b.pts} / ${nextBondMin(id)}）`
        + (after.lv < before ? `，降為 LV${after.lv}「${getBondLevelName(id, after)}」` : ''), "combat");
    if (after.lv < PARTNER_TEAM_MIN_LV && isInTeam(id)) {
        player.partnerTeam = player.partnerTeam.filter(x => x !== id);
        addLog(`💔 【${p.name}】不再是熟識，離開了隊伍。`, "combat");
    }
    return sub;
}

function nextBondMin(id) {
    let lv = getBondLevel(id).lv;
    let next = PARTNER_BOND_LEVELS.find(l => l.lv === lv + 1);
    return next ? next.min : PARTNER_BOND_MAX;
}

function todayKey() { return new Date().toDateString(); }

// 每日問候：每位每天一次，顯示台詞並加好感
function greetPartner(id) {
    let p = partnerById[id];
    if (!p || !isPartnerMet(id)) return;
    let b = getBond(id);
    if (b.greet === todayKey()) { showPartnerDialog(p, [pickGreetLine(p)], '今天已經問候過了，明天再來吧。'); return; }
    b.greet = todayKey();
    let line = pickGreetLine(p);
    let add = addBond(id, PARTNER_GREET_PTS, '每日問候');
    showPartnerDialog(p, [line], add > 0 ? `💗 好感 +${add}` : '💗 好感已滿');
    renderPartnerModal();
}

function pickGreetLine(p) {
    let lv = getBondLevel(p.id).lv;
    let pool = (p.lines && p.lines.greet && p.lines.greet[lv]) || PARTNER_GREET_LINES[lv] || PARTNER_GREET_LINES[1];
    return pool[Math.floor(Math.random() * pool.length)].replace(/\{me\}/g, player.name);
}

function getGiftCost(p) {
    return PARTNER_GIFT_COST[getPartnerTier(p).name] || PARTNER_GIFT_COST["天驕"];
}

function getGiftsLeft(id) {
    let b = getBond(id);
    if (b.giftDate !== todayKey()) { b.giftDate = todayKey(); b.gifts = 0; }
    return PARTNER_GIFT_DAILY - b.gifts;
}

function giftPartner(id) {
    let p = partnerById[id];
    if (!p || !isPartnerMet(id)) return;
    if (getBond(id).pts >= PARTNER_BOND_MAX) { alert(`與【${p.name}】的好感已滿。`); return; }
    if (getGiftsLeft(id) <= 0) { alert(`今天已經送【${p.name}】${PARTNER_GIFT_DAILY} 次禮了，明天再來吧。`); return; }
    let cost = getGiftCost(p);
    if (player.coins < cost) { alert(`靈石不足！送【${p.name}】一份禮需要 ${cost.toWan()} 靈石。`); return; }
    player.coins -= cost;
    getBond(id).gifts++;
    addBond(id, PARTNER_GIFT_PTS, `花費 ${cost.toWan()} 靈石贈禮`);
    renderPartnerModal();
    updateUI();
}

// ---- 情緣任務 ----
function getQuestStat(stat, id) {
    switch (stat) {
        case 'fieldKills': return player.fieldKills || 0;
        case 'evilKills': return player.evilKills || 0;
        case 'bountyKills': return player.bountyKills || 0;
        case 'teamKills': return getBond(id).teamKills || 0;
    }
    return 0;
}

function describeBondQuest(p, q) {
    return q.desc.replace('{n}', q.target.toWan()).replace('{who}', p.name);
}

function acceptBondQuest(id) {
    let p = partnerById[id];
    if (!p || !isPartnerMet(id)) return;
    let b = getBond(id);
    if (b.quest) return;
    let lv = getBondLevel(id).lv;
    let q = PARTNER_BOND_QUESTS[lv];
    if (!q) { alert('好感已達最高，沒有新的情緣任務了。'); return; }
    b.quest = { lv, base: getQuestStat(q.stat, id) };
    addLog(`📜 接下【${p.name}】的情緣任務「${q.name}」：${describeBondQuest(p, q)}。`, "system");
    renderPartnerModal();
}

function getBondQuestProgress(id) {
    let b = getBond(id);
    if (!b.quest) return null;
    let q = PARTNER_BOND_QUESTS[b.quest.lv];
    if (!q) { b.quest = null; return null; }
    let done = Math.min(q.target, getQuestStat(q.stat, id) - b.quest.base);
    return { q, done, complete: done >= q.target };
}

function claimBondQuest(id) {
    let p = partnerById[id];
    let prog = getBondQuestProgress(id);
    if (!p || !prog || !prog.complete) return;
    getBond(id).quest = null;
    addBond(id, prog.q.reward, `完成情緣任務「${prog.q.name}」`);
    renderPartnerModal();
}

function abandonBondQuest(id) {
    let b = getBond(id);
    if (!b.quest || !confirm('放棄這個情緣任務？進度會清除。')) return;
    b.quest = null;
    renderPartnerModal();
}

// combat.js 每次野外擊殺後呼叫：累計野外擊殺，隊伍中的夥伴累計「並肩擊殺」
function onPartnerFieldKills(n) {
    player.fieldKills = (player.fieldKills || 0) + n;
    getPartnerTeam().forEach(p => { let b = getBond(p.id); b.teamKills = (b.teamKills || 0) + n; });
}

// ---- 夥伴碎片（config-partners.js 的 PARTNER_SHARDS_*）----
function getPartnerShards(id) { return (player.partnerShards || {})[id] || 0; }
// 依評級掉落一位尚未結識夥伴的碎片（死守天南城、鎮魔塔呼叫）；tiers 依序嘗試（前一個評級都結識完就換下一個），風希（first）不在池內
// amount＝[最少, 最多]；回傳 { p, n }（沒掉或沒有可掉的夥伴回傳 null）
function grantPartnerShards(tiers, chance, amount, source) {
    if (Math.random() >= chance) return null;
    for (const tier of tiers) {
        const pool = partnerList.filter(p => !p.first && getPartnerTier(p).name === tier && !isPartnerMet(p.id));
        if (!pool.length) continue;
        // 集中：大多數時候給碎片最多的那位（還沒湊滿的），其餘隨機
        const need = pool.filter(p => getPartnerShards(p.id) < PARTNER_SHARDS_NEED);
        const list = need.length ? need : pool;
        const best = list.slice().sort((a, b) => getPartnerShards(b.id) - getPartnerShards(a.id))[0];
        const p = Math.random() < PARTNER_SHARD_FOCUS && getPartnerShards(best.id) > 0 ? best : list[Math.floor(Math.random() * list.length)];
        const n = amount[0] + Math.floor(Math.random() * (amount[1] - amount[0] + 1));
        if (!player.partnerShards) player.partnerShards = {};
        player.partnerShards[p.id] = getPartnerShards(p.id) + n;
        const full = player.partnerShards[p.id] >= PARTNER_SHARDS_NEED;
        addLog(`🧩 ${source}，獲得${getPartnerTier(p).name}【${p.title}・${p.name}】碎片 ×${n}（${Math.min(player.partnerShards[p.id], PARTNER_SHARDS_NEED)}/${PARTNER_SHARDS_NEED}）${full ? '——已集滿，可到情緣視窗激活！' : ''}`, "level-up", false, "item");
        return { p, n };
    }
    return null;
}
// 碎片集滿：激活（＝結識）；多出的碎片保留不用
function activatePartner(id) {
    const p = partnerById[id];
    if (!p || isPartnerMet(id)) return;
    if (getPartnerShards(id) < PARTNER_SHARDS_NEED) { alert(`碎片不足！需要 ${PARTNER_SHARDS_NEED} 片（目前 ${getPartnerShards(id)}）。`); return; }
    player.partnerShards[id] -= PARTNER_SHARDS_NEED;
    meetPartner(id, `以 ${PARTNER_SHARDS_NEED} 片碎片凝聚元神`);
    renderPartnerModal();
    updateUI();
}

// ==================== 結識 ====================
// 結識夥伴（天星城坊市點人偶、未來秘境相遇）；回傳是否為新結識
function meetPartner(id, source) {
    let p = partnerById[id];
    if (!p || isPartnerMet(id)) return false;
    if (!Array.isArray(player.partners)) player.partners = [];
    player.partners.push(id);
    getBond(id);
    addLog(`💞 ${source ? source + '，' : ''}結識了${p.native ? '' : '域外神明'}【${p.title}・${p.name}】！（好感 LV1「初識」，可在「情緣」中問候、贈禮、接情緣任務）`, "level-up");
    return true;
}

// 場景人偶點擊（config-towns.js 的 figures action）：第一次 = 相遇並結識；之後每天第一次 = 問候；
// 當天已問候再點、且有彩蛋（p.easter）→ 詢問彩蛋
function talkToPartner(id) {
    let p = partnerById[id];
    if (!p) return;
    if (!isPartnerMet(id)) {
        meetPartner(id, `在${player.currentMap.name}偶遇`);
        showPartnerDialog(p, (p.lines && p.lines.meet) || [`在下${p.name}，幸會。`], `💞 結識了【${p.title}・${p.name}】！到「情緣」可問候、贈禮、接情緣任務。`, id);
        return;
    }
    if (p.easter && getBond(id).greet === todayKey()) { askPartnerEaster(id); return; }
    greetPartner(id);
}

// ---- 彩蛋（風希：想看我跳支舞嗎？）----
function askPartnerEaster(id) {
    let p = partnerById[id];
    if (!p || !p.easter) return;
    preloadPartnerVideo(p.easter.video);   // 玩家考慮「是／否」時先在背景下載影片
    showPartnerDialog(p, [p.easter.ask], '', null, [
        { label: '是', action: `answerPartnerEaster('${id}', true)` },
        { label: '否', action: `answerPartnerEaster('${id}', false)` }
    ]);
}

function answerPartnerEaster(id, yes) {
    let p = partnerById[id];
    if (!p || !p.easter) return;
    closeModal('partner-dialog-modal');
    if (yes) {
        addLog(`💃 ${p.name}：「${p.easter.yes}」`, "system");
        partnerVideoCtx = { id, finished: false };
        playPartnerVideo(p.easter.video, `${p.title}・${p.name}`);
        return;
    }
    let sub = reduceBond(id, p.easter.noPenalty || 1, '你拒絕看他跳舞，他心生反感');
    showPartnerDialog(p, [p.easter.no], sub > 0 ? `💔 反感：好感 -${sub}` : '💔 反感（好感已經是 0 了）');
    renderPartnerModal();
}

// 彩蛋影片的觀看狀態：{ id 夥伴, finished 是否已完整看完 }；null = 不是彩蛋影片
let partnerVideoCtx = null;
const PARTNER_VIDEO_WATCH_RATIO = 0.9;   // 實際播放過的長度 ≥ 90% 才算看完（避免直接拖到最後）

// 影片放在 GitHub Pages，網路慢時下載速度（實測約 0.8 Mbps）低於影片碼率（約 1.9 Mbps）→ 邊播邊停像卡住。
// 做法：問彩蛋時就用 fetch 把整部影片下載成 Blob（顯示進度 %），下載完才從記憶體播放，播放中完全不需要網路。
// ⚠️ 不能用「先 play 再 pause 等緩衝」：Chrome 在影片暫停時會自己停止下載（networkState = IDLE），進度卡住不動；
//    canplaythrough 在慢網路下也估得太樂觀（實測 1 Mbps 照樣卡 4 次）。
// 下載好的 Blob 留在 partnerVideoCache，同一次遊戲再看不用重新下載；fetch 失敗（例如直接開 file://）就退回直接播放原網址。
const partnerVideoCache = {};   // src → { url 物件網址, loaded, total, done, failed }

function preloadPartnerVideo(src) {
    if (!src || partnerVideoCache[src]) return;
    let c = partnerVideoCache[src] = { url: null, loaded: 0, total: 0, done: false, failed: false };
    fetch(src).then(async res => {
        if (!res.ok) throw new Error(res.status);
        c.total = Number(res.headers.get('content-length')) || 0;
        let chunks = [];
        if (res.body && res.body.getReader) {
            const reader = res.body.getReader();
            for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                c.loaded += value.length;
                updatePartnerVideoLoading(src);
            }
        } else chunks.push(new Uint8Array(await res.arrayBuffer()));
        c.url = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
        c.done = true;
    }).catch(() => { c.failed = true; }).then(() => onPartnerVideoReady(src));
}

let partnerVideoPending = null;   // 等待下載完成、準備播放的影片 src

function setPartnerVideoStatus(text) {
    const el = document.getElementById('partner-video-status');
    if (!el) return;
    el.innerText = text || '';
    el.style.display = text ? 'block' : 'none';
}

function updatePartnerVideoLoading(src) {
    if (partnerVideoPending !== src) return;
    let c = partnerVideoCache[src];
    let pct = c.total ? Math.min(99, Math.floor(c.loaded / c.total * 100)) : 0;
    setPartnerVideoStatus(`⏳ 影片載入中… ${c.total ? pct + '%' : (c.loaded / 1048576).toFixed(1) + ' MB'}（載完才播放，避免卡頓）`);
}

function onPartnerVideoReady(src) {
    if (partnerVideoPending !== src) return;
    partnerVideoPending = null;
    let c = partnerVideoCache[src];
    const v = document.getElementById('partner-video');
    v.src = c.done ? c.url : src;
    v.currentTime = 0;
    setPartnerVideoStatus('');
    let p = v.play();
    // 手機瀏覽器可能擋掉非點擊當下的有聲播放 → 提示玩家自己按播放
    if (p && p.catch) p.catch(() => setPartnerVideoStatus('▶️ 影片已載入，請按播放鍵'));
}

function playPartnerVideo(src, title) {
    const v = document.getElementById('partner-video');
    document.getElementById('partner-video-title').innerText = title || '';
    v.onended = onPartnerVideoEnded;
    v.pause();
    v.removeAttribute('src');
    v.load();
    document.getElementById('partner-video-modal').style.display = 'flex';
    preloadPartnerVideo(src);
    partnerVideoPending = src;
    let c = partnerVideoCache[src];
    if (c.done || c.failed) onPartnerVideoReady(src);
    else updatePartnerVideoLoading(src);
}

// 實際播放過的秒數（played 各區段加總，拖曳跳過的部分不算）
function getPlayedSeconds(v) {
    let s = 0;
    for (let i = 0; i < v.played.length; i++) s += v.played.end(i) - v.played.start(i);
    return s;
}

function onPartnerVideoEnded() {
    const v = document.getElementById('partner-video');
    let ctx = partnerVideoCtx;
    if (!ctx || ctx.finished) return;
    if (!(v.duration > 0) || getPlayedSeconds(v) < v.duration * PARTNER_VIDEO_WATCH_RATIO) return;   // 拖到最後的不算看完
    ctx.finished = true;
    let p = partnerById[ctx.id];
    let b = getBond(ctx.id);
    let note;
    if (!b.danceWatched) {
        b.danceWatched = true;
        let add = addBond(ctx.id, p.easter.firstWatchBonus || 0, '第一次看完他跳舞');
        note = add > 0 ? `💗 第一次看完：好感 +${add}` : '💗 第一次看完（好感已滿）';
    } else note = '（好感只有第一次看完會增加）';
    closePartnerVideo();
    showPartnerDialog(p, [p.easter.watched], note);
    renderPartnerModal();
}

// 關閉影片：彩蛋影片還沒看完就關掉 → 和選「否」一樣反感扣好感
function closePartnerVideo() {
    const v = document.getElementById('partner-video');
    partnerVideoPending = null;
    setPartnerVideoStatus('');
    v.pause();
    closeModal('partner-video-modal');
    let ctx = partnerVideoCtx;
    partnerVideoCtx = null;
    if (!ctx || ctx.finished) return;
    let p = partnerById[ctx.id];
    if (!p || !p.easter) return;
    let sub = reduceBond(ctx.id, p.easter.noPenalty || 1, '影片沒看完就走，他心生反感');
    showPartnerDialog(p, [p.easter.quit || p.easter.no], sub > 0 ? `💔 反感：好感 -${sub}` : '💔 反感（好感已經是 0 了）');
    renderPartnerModal();
}

// ==================== 隊伍 ====================
function getPartnerTeam() {
    return (player.partnerTeam || []).map(id => partnerById[id]).filter(p => p && isPartnerMet(p.id));
}

function isInTeam(id) {
    return (player.partnerTeam || []).includes(id);
}

function togglePartnerTeam(id) {
    let p = partnerById[id];
    if (!p || !isPartnerMet(id)) return;
    if (!Array.isArray(player.partnerTeam)) player.partnerTeam = [];
    if (isInTeam(id)) {
        player.partnerTeam = player.partnerTeam.filter(x => x !== id);
        addLog(`💞 【${p.title}・${p.name}】離開隊伍，回到情緣閣休息。`, "system");
    } else {
        if (getBondLevel(id).lv < PARTNER_TEAM_MIN_LV) { alert(`好感度需達 LV${PARTNER_TEAM_MIN_LV}「熟識」才能邀請【${p.name}】入隊。`); return; }
        if (player.partnerTeam.length >= PARTNER_TEAM_MAX) { alert(`隊伍最多 ${PARTNER_TEAM_MAX} 名夥伴，請先讓一位離隊。`); return; }
        player.partnerTeam.push(id);
        addLog(`💞 【${p.title}・${p.name}】加入隊伍，與你並肩作戰！`, "level-up");
    }
    renderPartnerModal();
    updateUI();
}

// 隊伍夥伴的被動加成（併入 gear.js 的 getBonusTotals）；LV5 × PARTNER_LV5_PASSIVE_MULT
function getPartnerBonusTotals() {
    let t = {};
    getPartnerTeam().forEach(p => {
        let mult = getBondLevel(p.id).lv >= 5 ? PARTNER_LV5_PASSIVE_MULT : 1;
        for (let k in p.passive) t[k] = (t[k] || 0) + p.passive[k] * mult;
    });
    return t;
}

// 玩家出手之後呼叫（野外 combat.js、渡劫 tribulation.js、懸賞對決 bounty.js）：隊伍中的夥伴各自依機率發動絕學
// 夥伴靈力（config-partners.js 的 PARTNER_MP_*；state.js 的 partnerMp，不存檔）：每回合回靈，發動絕學扣該評級的消耗，不夠就不發動
function getPartnerMp(id) { if (typeof partnerMp[id] !== 'number') partnerMp[id] = PARTNER_MP_MAX; return partnerMp[id]; }
function partnerSkillMp(p) { return PARTNER_SKILL_MP[getPartnerTier(p).name] || 20; }
function partnerSkillTurn(targets, tags) {
    getPartnerTeam().forEach(p => {
        partnerMp[p.id] = Math.min(PARTNER_MP_MAX, getPartnerMp(p.id) + PARTNER_MP_REGEN);
        let chance = p.skill.chance + (getBondLevel(p.id).lv >= 5 ? PARTNER_LV5_SKILL_BONUS : 0);
        if (Math.random() >= chance || partnerMp[p.id] < partnerSkillMp(p)) return;
        partnerMp[p.id] -= partnerSkillMp(p);
        castProcSkill(p.skill, targets, tags, 'partner');   // artifact.js；護盾算在夥伴那 10%
    });
}

// 舊存檔相容：單人出戰（activePartner）→ 隊伍；補齊欄位
function migratePartners() {
    if (!Array.isArray(player.partners)) player.partners = [];
    if (!Array.isArray(player.partnerTeam)) player.partnerTeam = [];
    if (!player.partnerBond || typeof player.partnerBond !== 'object') player.partnerBond = {};
    if (player.activePartner) {
        let id = player.activePartner;
        if (isPartnerMet(id) && getBondLevel(id).lv >= PARTNER_TEAM_MIN_LV && !isInTeam(id) && player.partnerTeam.length < PARTNER_TEAM_MAX) player.partnerTeam.push(id);
        delete player.activePartner;
    }
    player.partnerTeam = player.partnerTeam.filter(id => isPartnerMet(id)).slice(0, PARTNER_TEAM_MAX);
}

// ==================== 對話框 ====================
// lines = 台詞陣列；note = 底部提示；afterId = 關閉後打開情緣視窗並捲到該夥伴；
// choices = 選項按鈕 [{ label, action（onclick 字串）}]，省略則只有「好」
function showPartnerDialog(p, lines, note, afterId, choices) {
    const box = document.getElementById('partner-dialog-body');
    if (!box) return;
    let lv = isPartnerMet(p.id) ? `LV${getBondLevel(p.id).lv}「${getBondLevelName(p.id)}」` : '';
    box.innerHTML = `
        <h3 style="color: ${getPartnerTier(p).color}; margin: 0 0 4px;">${p.title}・${p.name}</h3>
        <p class="partner-origin" style="margin-bottom: 10px;">${formatPartnerOrigin(p)}${lv ? `｜💗 ${lv}` : ''}</p>
        ${lines.map(l => `<p class="partner-line">「${l}」</p>`).join('')}
        ${note ? `<p class="partner-note">${note}</p>` : ''}`;
    document.getElementById('partner-dialog-after').value = afterId || '';
    document.getElementById('partner-dialog-actions').innerHTML = choices && choices.length
        ? `<div class="partner-choices">${choices.map(c => `<button class="sys-btn" onclick="${c.action}">${c.label}</button>`).join('')}</div>`
        : `<button class="sys-btn" style="border-color: #f472b6; color: #f472b6;" onclick="closePartnerDialog()">好</button>`;
    document.getElementById('partner-dialog-modal').style.display = 'flex';
}

function closePartnerDialog() {
    closeModal('partner-dialog-modal');
    let id = document.getElementById('partner-dialog-after').value;
    if (id) openPartnerModal(id);
}

// ==================== 情緣視窗 ====================
let partnerFilter = 'all';   // all / met / team / 評級名稱

// focusId：開啟後切到「已結識」並捲到該夥伴
function openPartnerModal(focusId) {
    if (focusId) partnerFilter = 'met';
    document.getElementById('partner-modal').style.display = 'flex';
    renderPartnerModal();
    if (focusId) {
        let el = document.getElementById('partner-card-' + focusId);
        if (el) el.scrollIntoView({ block: 'center' });
    }
}

function setPartnerFilter(f) { partnerFilter = f; renderPartnerModal(); }

function formatPartnerOrigin(p) {
    return p.native
        ? `🏯 本界人物｜出自《${p.work}》（${p.author}）・${p.world}`
        : `🌌 域外神明｜來自《${p.work}》（${p.author}）的${p.world}`;
}

function renderBondSection(p) {
    let id = p.id;
    let b = getBond(id);
    let lv = getBondLevel(id);
    let next = PARTNER_BOND_LEVELS.find(l => l.lv === lv.lv + 1);
    let pct = next ? (b.pts - lv.min) / (next.min - lv.min) * 100 : 100;
    let greeted = b.greet === todayKey();
    let giftsLeft = getGiftsLeft(id);
    let full = b.pts >= PARTNER_BOND_MAX;
    let prog = getBondQuestProgress(id);
    let questHtml;
    if (prog) {
        questHtml = `<div class="bond-quest">📜 ${prog.q.name}：${describeBondQuest(p, prog.q)}
            <b>${prog.done.toWan()} / ${prog.q.target.toWan()}</b>（好感 +${prog.q.reward}）
            ${prog.complete ? `<button class="sys-btn" onclick="claimBondQuest('${id}')">✅ 完成領取</button>` : `<button class="sys-btn bond-small" onclick="abandonBondQuest('${id}')">放棄</button>`}</div>`;
    } else if (PARTNER_BOND_QUESTS[lv.lv] && !full) {
        let q = PARTNER_BOND_QUESTS[lv.lv];
        questHtml = `<div class="bond-quest">📜 可接情緣任務「${q.name}」：${describeBondQuest(p, q)}（好感 +${q.reward}）
            <button class="sys-btn" onclick="acceptBondQuest('${id}')">接取</button></div>`;
    } else questHtml = '';
    let inTeam = isInTeam(id);
    let canTeam = lv.lv >= PARTNER_TEAM_MIN_LV;
    let teamBtn = inTeam
        ? `<button class="sys-btn" onclick="togglePartnerTeam('${id}')">🛌 離開隊伍</button>`
        : `<button class="sys-btn" ${canTeam ? '' : 'disabled'} onclick="togglePartnerTeam('${id}')">${canTeam ? '⚔️ 邀請入隊' : `🔒 好感 LV${PARTNER_TEAM_MIN_LV}「熟識」可入隊`}</button>`;
    return `
        <div class="bond-box">
            <div class="bond-head">💗 LV${lv.lv}「${getBondLevelName(id, lv)}」<span>${b.pts.toWan()} / ${next ? next.min.toWan() : 'MAX'}</span></div>
            <div class="partner-bar-track bond-track"><div class="partner-bar-fill" style="width: ${pct}%; background: #f472b6;"></div></div>
            <div class="bond-actions">
                <button class="sys-btn" ${greeted ? 'disabled' : ''} onclick="greetPartner('${id}')">${greeted ? '今日已問候' : `💬 問候 +${PARTNER_GREET_PTS}`}</button>
                <button class="sys-btn" ${giftsLeft > 0 && !full ? '' : 'disabled'} onclick="giftPartner('${id}')">🎁 贈禮 ${getGiftCost(p).toWan()}（${giftsLeft}/${PARTNER_GIFT_DAILY}）</button>
            </div>
            ${questHtml}
            <p style="font-size: 0.78em; color: #7dd3fc; margin: 4px 0;">💧 絕學耗靈力 ${partnerSkillMp(p)}（每位 ${PARTNER_MP_MAX} 點、每回合 +${PARTNER_MP_REGEN}，不夠就不發動）</p>
            ${teamBtn}
        </div>`;
}

function renderPartnerCard(p) {
    let met = isPartnerMet(p.id);
    let inTeam = met && isInTeam(p.id);
    let tier = getPartnerTier(p);
    let avg = getPartnerPowerAvg(p);
    let bars = Object.keys(PARTNER_POWER_LABELS).map(k => `
        <div class="partner-bar"><span>${PARTNER_POWER_LABELS[k]}</span>
            <div class="partner-bar-track"><div class="partner-bar-fill" style="width: ${p.power[k]}%; background: ${tier.color};"></div></div>
            <b>${p.power[k]}</b></div>`).join('');
    let lv5 = met && getBondLevel(p.id).lv >= 5;
    let bottom = met ? renderBondSection(p)
        : p.first ? `<button class="sys-btn" disabled>未結識・可在天星城坊市遇見他</button>`
        : (() => {   // 夥伴碎片：顯示進度，集滿可激活
            const s = getPartnerShards(p.id), pct = Math.min(100, s / PARTNER_SHARDS_NEED * 100);
            return `<div class="bond-box"><div class="bond-head">🧩 碎片 <span>${Math.min(s, PARTNER_SHARDS_NEED)} / ${PARTNER_SHARDS_NEED}</span></div>
                <div class="partner-bar-track bond-track"><div class="partner-bar-fill" style="width: ${pct}%; background: #facc15;"></div></div>
                ${s >= PARTNER_SHARDS_NEED ? `<button class="sys-btn" style="border-color:#facc15; color:#facc15;" onclick="activatePartner('${p.id}')">✨ 激活（消耗 ${PARTNER_SHARDS_NEED} 片）</button>`
                    : `<p style="font-size:0.78em; color:#9ca3af; margin:4px 0 0;">${PARTNER_MEET_HINT[tier.name] || ''}</p>`}</div>`;
        })();
    return `
        <div id="partner-card-${p.id}" class="card partner-card${met ? '' : ' unmet'}" style="border-color: ${inTeam ? 'var(--accent)' : tier.color};">
            <h3 style="color: ${tier.color}; margin-bottom: 2px;">${inTeam ? '⚔️ ' : ''}${p.title}・${p.name}</h3>
            <p class="partner-origin">${formatPartnerOrigin(p)}</p>
            <p class="partner-meta">巔峰：${p.peak}｜評級 <b style="color: ${tier.color};">${tier.name}</b>｜綜合戰力 <b style="color: ${tier.color};">${avg.toFixed(1)}</b></p>
            <div class="partner-bars">${bars}</div>
            <p class="partner-analysis">📖 ${p.analysis}</p>
            <p class="partner-effect">🌟 入隊被動：${describeTitleBonus(p.passive)}${lv5 ? `（LV5 ×${PARTNER_LV5_PASSIVE_MULT}）` : ''}</p>
            <p class="partner-effect">⚡ 招牌絕學【${p.skill.name}】：${p.skill.desc}（以主人攻擊力計算${lv5 ? `；LV5 機率 +${Math.round(PARTNER_LV5_SKILL_BONUS * 100)}%` : ''}）</p>
            ${bottom}
        </div>`;
}

function renderPartnerModal() {
    let box = document.getElementById('partner-container');
    if (!box || document.getElementById('partner-modal').style.display !== 'flex') return;
    let metCount = partnerList.filter(p => isPartnerMet(p.id)).length;
    let team = getPartnerTeam();
    let filters = [['all', '全部'], ['met', '已結識'], ['team', '隊伍']].concat(PARTNER_TIERS.map(t => [t.name, t.name]))
        .map(([k, label]) => `<button class="codex-tab${partnerFilter === k ? ' active' : ''}" onclick="setPartnerFilter('${k}')">${label}</button>`).join('');
    let list = partnerList
        .filter(p => partnerFilter === 'all' || (partnerFilter === 'met' ? isPartnerMet(p.id) : partnerFilter === 'team' ? isInTeam(p.id) : getPartnerTier(p).name === partnerFilter))
        .sort((a, b) => (isPartnerMet(b.id) - isPartnerMet(a.id)) || (getPartnerPowerAvg(b) - getPartnerPowerAvg(a)));
    let levels = PARTNER_BOND_LEVELS.map(l => `LV${l.lv} ${l.name.replace('|', '／')}`).join('・');
    box.innerHTML = `
        <p style="text-align: center; color: #9ca3af; font-size: 0.85em; margin: 0 0 8px;">
            已結識 <b style="color: var(--accent);">${metCount}</b> / ${partnerList.length} 位｜隊伍 <b style="color: var(--accent);">${team.length} / ${PARTNER_TEAM_MAX}</b>：${team.length ? team.map(p => `${p.title}・${p.name}`).join('、') : '無'}<br>
            好感度：${levels}。每日問候、贈禮、情緣任務可提升好感；達 LV${PARTNER_TEAM_MIN_LV}「熟識」才能邀請入隊，隊伍中的夥伴提供被動加成並在戰鬥中施展招牌絕學。<br>
            亂星海的風希就在天星城坊市；其餘諸天高手會在秘境中與你相遇（秘境尚未開放）。<br>
            <span style="font-size: 0.85em; color: #6b7280;">※ 戰力分析與評級為本遊戲設定，僅供娛樂，並非原著官方設定。</span>
        </p>
        <div class="codex-tabs">${filters}</div>
        <div class="grid-container">${list.length ? list.map(renderPartnerCard).join('') : '<p style="grid-column: 1 / -1; text-align: center; color: #6b7280;">尚無符合條件的夥伴。</p>'}</div>`;
}
