// 屠龍勇者：團隊副本（最多 8 人組隊打龍；ARCHITECTURE.md 第 30 節）
// 依賴 config、monsters、zones、player、combat、offline（isOfflineConsumable）、save、cloud、ui、ui-panels（TABS／PANEL_FNS 在載入時加分頁）。
// 流程：建立隊伍（得到 6 碼房號）→ 朋友輸入房號或從公開列表加入 → 每人按「準備」上傳角色快照 → 隊長按「開始」
//   → 隊長的瀏覽器用每個人的快照「快轉模擬」整場團戰（沿用 combat.js 的戰鬥規則，輪流把 player 換成各隊員）
//   → 結果寫回雲端，所有隊員同時觀看重播，結束時各自領取獎勵（經驗、金幣、個人掉落，扣掉戰鬥中用掉的藥水）。
// 後端是 Supabase 的 raid_rooms／raid_members（tools/supabase.sql），雲端存檔沒啟用時整個功能隱藏。

const RAIDS = [
    { id: 'drake',    boss: 'wakingDrake', zone: 'sleepingCave', reqLv: 25, cdH: 2, hpMul: 1.6, dmgMul: 1.0, reward: 3, desc: '沉眠龍窟最深處被吵醒的地龍。適合第一次組隊。' },
    { id: 'wyvern',   boss: 'wyvern',      zone: 'dragonValley', reqLv: 45, cdH: 3, hpMul: 1.1, dmgMul: 0.85, reward: 3, desc: '盤旋在焦骨峽谷上空的巨大飛龍，烈焰俯衝會燒到整隊。' },
    { id: 'antharas', boss: 'antharas',    zone: 'lairAntharas', reqLv: 55, cdH: 6, hpMul: 1.5, dmgMul: 1.0, reward: 1, desc: '大地之龍。單人要 Lv.60，組隊 Lv.55 就能挑戰。' },
    { id: 'fafurion', boss: 'fafurion',    zone: 'lairFafurion', reqLv: 65, cdH: 6, hpMul: 1.3, dmgMul: 0.9, reward: 1, desc: '水之龍，海嘯會淹沒整隊。' },
    { id: 'lindvior', boss: 'lindvior',    zone: 'lairLindvior', reqLv: 75, cdH: 6, hpMul: 1.0, dmgMul: 0.8, reward: 1, desc: '風之龍，攻擊又快又重。' },
    { id: 'valakas',  boss: 'valakas',     zone: 'lairValakas',  reqLv: 85, cdH: 6, hpMul: 0.9, dmgMul: 0.7, reward: 1, desc: '火之龍，四大龍之首。' },
];
const RAID_BY_ID = Object.fromEntries(RAIDS.map(r => [r.id, r]));
const RAID_MAX = 8;                     // 隊伍上限
const RAID_LIMIT_MS = 6 * 60 * 1000;    // 6 分鐘打不倒＝失敗
const RAID_ENRAGE_MS = 4 * 60 * 1000;   // 4 分鐘後首領狂暴（傷害 ×1.5、攻速 ×1.33）
const RAID_FRAME_MS = 500;              // 重播的血條每 0.5 秒一格
const RAID_REPLAY_SPEED = 2;            // 重播速度（6 分鐘的戰鬥看 3 分鐘）
const RAID_BREATH_CD = [9000, 13000];   // 全體吐息間隔
const RAID_BREATH_TELE = 1600;          // 吐息蓄力時間
const RAID_BREATH_MUL = 1.4;            // 吐息傷害 ×（首領魔法傷害）
const RAID_RETARGET_MS = 8000;          // 首領每 8 秒重新挑一次目標
// 首領挑目標的權重（× 最大 HP）：坦職容易被盯上，遠程與法師比較不會
const RAID_TANK = { knight: 3, paladin: 3, warrior: 3, royal: 2, shura: 2, magicfighter: 2, demon: 1.5, darkelf: 1, angel: 1, elf: 0.6, gunner: 0.6, mage: 0.5 };
const RAID_POLL_MS = 3000;              // 隊伍大廳每 3 秒更新一次
const RAID_LIST_MAX_AGE_MS = 2 * 3600 * 1000;   // 公開列表只顯示 2 小時內建立的隊伍
const RAID_ROOM_KEY = 'dragonSlayer_raid_room'; // 重新整理後回到原本的隊伍
const RAID_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// 隊伍人數 → 首領 HP 倍率（1 人 ×1、8 人 ×3.8）；每人分到的經驗／金幣比例（人越多總獎勵越多，每人分到的越少）
function raidPartyHp(n) { return 0.6 + 0.4 * n; }
function raidShare(n) { return (1 + 0.25 * (n - 1)) / n; }

function raidBoss(def, n) {
    const m = makeMonster(def.boss);
    m.hp = m.maxHp = Math.round(m.maxHp * def.hpMul * raidPartyHp(n));
    m.dmg = m.dmg.map(v => Math.round(v * def.dmgMul));
    if (m.magic) m.magic = Object.assign({}, m.magic, { dmg: m.magic.dmg.map(v => Math.round(v * def.dmgMul)) });
    m.atkCd = m.spd;
    m.stunUntil = 0;
    return m;
}

function raidConsumables(p) {
    const m = {};
    for (const x of p.inv) if (isOfflineConsumable(x.id)) m[x.id] = (m[x.id] || 0) + x.n;
    return m;
}

// 隊伍快照：整份角色，倉庫不需要（也比較小）
function raidSnapshot() {
    const p = JSON.parse(JSON.stringify(player));
    p.storage = [];
    return p;
}

// 目前角色能不能參加某個副本（空字串＝可以）
function raidBlockReason(def, p = player) {
    if (!p) return '沒有角色';
    if (p.lv < def.reqLv) return `需要 Lv.${def.reqLv}`;
    const cd = (p.raidCd && p.raidCd[def.id]) || 0;
    if (cd > Date.now()) return `冷卻中（${fmtDuration(cd - Date.now())}）`;
    return '';
}

// ───────── 團戰模擬（隊長的瀏覽器執行）─────────
// list：[{ uid, name, snap }]；回傳可以重播的結果。全程 SIM_MODE，結束後還原所有全域狀態
function raidSimulate(def, list) {
    const keep = { player, hunt, session, walkHome, gameNow, log: gameLog.slice(), logSeq };
    SIM_MODE = true;
    session = { start: gameNow, kills: 0, exp: 0, gold: 0 };   // onKill（反擊打倒首領）會用到
    walkHome = null;
    const t0 = gameNow;
    let t = 0;
    const events = [], frames = [];
    const ev = (msg, cls = '') => { if (events.length < 600) events.push([t, msg, cls]); };
    try {
        const n = list.length, boss = raidBoss(def, n);
        const ms = list.map((x, i) => {
            const p = migrateSave({ player: JSON.parse(JSON.stringify(x.snap)) });
            p.buffs = {}; p.cds = {}; p.mapRun = null; p.hunting = true;
            p.loc = { type: 'zone', id: def.zone };
            p.settings.teleOn = false; p.settings.autoHome = false;   // 團戰中不瞬移、不回家
            player = p;
            const st = calcStats();
            p.hp = st.maxHp; p.mp = st.maxMp;   // 進副本前補滿
            return {
                i, uid: x.uid, name: p.name, cls: p.cls, lv: p.lv, p, alive: true, dmg: 0, heal: 0, maxHp: st.maxHp,
                hunt: { state: 'fight', timer: 0, mon: boss, mobs: [boss], pCd: rand(200, 1200), joinCd: 1e15, potCd: 0, warned: {} },
                deaths: p.deaths, inv0: raidConsumables(p), say: -99999,
            };
        });
        const alive = () => ms.filter(m => m.alive);
        const down = (m, by) => {
            if (!m.alive) return;
            m.alive = false; m.p.hp = 0;
            ev(`💀 ${m.name} 被${by}擊倒了`, 'dead');
        };
        const frame = () => frames.push([t, Math.max(0, Math.round(boss.hp)), ...ms.map(m => m.alive ? Math.max(0, Math.round(m.p.hp)) : 0)]);
        ev(`🐉 ${boss.name}（Lv.${boss.lv}）出現了！HP ${fmt(boss.maxHp)}`, 'boss');
        frame();
        let target = null, retarget = 0, breathIn = rand(RAID_BREATH_CD[0], RAID_BREATH_CD[1]), tele = 0, enraged = false, win = false;
        while (t < RAID_LIMIT_MS) {
            t += TICK_MS;
            gameNow = t0 + t;
            // 隊員行動
            for (const m of ms) {
                if (!m.alive) continue;
                player = m.p; hunt = m.hunt;
                if (!player.hunting || !hunt) continue;   // 彈藥用完等：停在旁邊
                const st = calcStats();
                autoSupport(st);
                hunt.pCd -= TICK_MS;
                if (hunt.pCd <= 0) {
                    hunt.pCd = st.atkMs;
                    const hb = boss.hp, logN = logSeq;
                    if (!raidAllyHeal(m, st, ms, ev, t)) playerAction(st);
                    if (hunt && hunt.mon) resonanceFlush(st);
                    m.dmg += Math.max(0, hb - boss.hp);
                    // 技能訊息挑一些放進重播（每人最多 4 秒一則）
                    if (t - m.say >= 4000) {
                        const line = gameLog.filter(l => l.seq > logN && /magic|crit|heal/.test(l.cls)).pop();
                        if (line) { ev(line.msg.includes('你') ? line.msg.replace(/你/g, m.name) : `${m.name}：${line.msg}`, line.cls); m.say = t; }
                    }
                }
                if (m.p.deaths > m.deaths) down(m, boss.name);
                if (t % REGEN_MS === 0 && m.alive) regenTick();
                cleanBuffs();
                if (boss.hp <= 0) break;
            }
            if (boss.hp <= 0) { win = true; break; }
            if (!alive().length) break;
            // 狂暴
            if (!enraged && t >= RAID_ENRAGE_MS) {
                enraged = true;
                boss.dmg = boss.dmg.map(v => Math.round(v * 1.5));
                if (boss.magic) boss.magic = Object.assign({}, boss.magic, { dmg: boss.magic.dmg.map(v => Math.round(v * 1.5)) });
                boss.spd = Math.round(boss.spd * 0.75);
                ev(`😡 ${boss.name}狂暴了！攻擊變得更猛烈`, 'boss');
            }
            // 首領挑目標
            retarget -= TICK_MS;
            if (!target || !target.alive || retarget <= 0) {
                const pool = alive(), w = pool.map(m => m.maxHp * (RAID_TANK[m.cls] || 1));
                let r = Math.random() * w.reduce((a, b) => a + b, 0), pick = pool[pool.length - 1];
                for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { pick = pool[i]; break; } }
                if (pick !== target) ev(`👁️ ${boss.name}盯上了 ${pick.name}`, 'warn');
                target = pick; retarget = RAID_RETARGET_MS;
            }
            // 首領普攻
            boss.atkCd -= TICK_MS;
            if (boss.atkCd <= 0) {
                boss.atkCd = boss.spd;
                if (gameNow >= boss.stunUntil) {
                    player = target.p; hunt = target.hunt;
                    monsterAttack(calcStats(), boss);
                    if (target.p.deaths > target.deaths) down(target, boss.name);
                    if (boss.hp <= 0) { win = true; break; }   // 反擊打倒
                }
            }
            // 全體吐息：蓄力 1.6 秒，時間到每人依「自動閃避」設定判定躲開
            if (tele > 0) {
                tele -= TICK_MS;
                if (tele <= 0) {
                    const name = boss.magic ? boss.magic.name : '龍之吐息';
                    let hit = 0, dodged = 0;
                    for (const m of alive()) {
                        player = m.p; hunt = m.hunt;
                        if (chance(player.settings.autoDodge ? 0.6 : 0.2)) { dodged++; continue; }
                        const st = calcStats(), base = boss.magic ? boss.magic.dmg : boss.dmg;
                        let d = rand(base[0], base[1]) * RAID_BREATH_MUL * (1 - clamp(st.mr, 0, 150) / 200);
                        d = Math.max(0, Math.round(d - st.reduce));
                        if (st.absorb && player.mp > 0) { const a = Math.min(player.mp, Math.floor(d * st.absorb)); player.mp -= a; d -= a; }
                        player.hp -= d;
                        hit++;
                        if (player.hp <= 0) down(m, `「${name}」`);
                    }
                    ev(`🔥 ${boss.name}的「${name}」！${hit} 人中招${dodged ? `、${dodged} 人閃開` : ''}`, 'boss');
                    breathIn = rand(RAID_BREATH_CD[0], RAID_BREATH_CD[1]);
                }
            } else {
                breathIn -= TICK_MS;
                if (breathIn <= 0) { tele = RAID_BREATH_TELE; ev(`⚠️ ${boss.name}正在蓄力…`, 'warn'); }
            }
            if (t % RAID_FRAME_MS === 0) frame();
            if (!alive().length) break;
        }
        frame();
        if (win) ev(`🏆 成功討伐${boss.name}！`, 'win');
        else ev(alive().length ? `⌛ 時間到，${boss.name}逃回巢穴深處…討伐失敗` : '☠️ 全員倒下…討伐失敗', 'dead');
        const members = ms.map(m => {
            const now = raidConsumables(m.p), used = {};
            for (const id in m.inv0) {
                if (id === 'reviveScroll') continue;
                const d = m.inv0[id] - (now[id] || 0);
                if (d > 0) used[id] = d;
            }
            return { uid: m.uid, name: m.name, cls: m.cls, lv: m.lv, maxHp: m.maxHp, dmg: Math.round(m.dmg), heal: Math.round(m.heal), died: !m.alive, used };
        });
        return {
            v: 1, raid: def.id, n: list.length, win, ms: t, enraged,
            boss: { id: boss.id, name: boss.name, icon: boss.icon, lv: boss.lv, maxHp: boss.maxHp },
            members, frames, events,
        };
    } finally {
        player = keep.player; hunt = keep.hunt; session = keep.session; walkHome = keep.walkHome; gameNow = keep.gameNow;
        gameLog.length = 0; gameLog.push(...keep.log); logSeq = keep.logSeq;
        SIM_MODE = false;
    }
}

// 補師幫隊友補血：有治癒魔法、隊友 HP 低於 50%、自己不危險時，補最危險的那位（回傳 true＝這回合用掉了）
function raidAllyHeal(m, st, ms, ev, t) {
    const s = player.settings;
    if (player.hp < st.maxHp * s.healPct / 100) return false;   // 先顧自己（playerAction 會補自己）
    const k = learnedSkills().filter(k => k.type === 'heal' && s.skills[k.id] !== false && player.mp >= k.mp && !(player.cds[k.id] > gameNow)).pop();
    if (!k) return false;
    const hurt = ms.filter(o => o.alive && o !== m && o.p.hp < o.maxHp * 0.5).sort((a, b) => a.p.hp / a.maxHp - b.p.hp / b.maxHp)[0];
    if (!hurt) return false;
    useSkillCost(k);
    const v = rand(k.heal[0], k.heal[1]) + Math.floor(st.sp * k.spK);
    const before = hurt.p.hp;
    hurt.p.hp = Math.min(hurt.maxHp, hurt.p.hp + v);
    m.heal += hurt.p.hp - before;
    if (t - m.say >= 4000) { ev(`✨ ${m.name}對 ${hurt.name} 施放「${k.name}」：HP +${fmt(hurt.p.hp - before)}`, 'heal'); m.say = t; }
    return true;
}

// ───────── 獎勵（各自在自己的瀏覽器領取）─────────
// 勝利：經驗、金幣依人數分配；掉落每人各自擲一次（沿用 rollDrops）；龍類算一次討伐。不論輸贏都扣掉戰鬥中用掉的藥水與彈藥。
function raidApplyReward(res, uid, runKey) {
    const me = res.members.find(m => m.uid === uid);
    if (!me) return null;
    if (!player.raidRuns) player.raidRuns = [];
    if (player.raidRuns.includes(runKey)) return null;   // 已經領過
    player.raidRuns.push(runKey);
    if (player.raidRuns.length > 30) player.raidRuns.shift();
    const def = RAID_BY_ID[res.raid];
    const out = { win: res.win, exp: 0, gold: 0, items: [], used: me.used };
    for (const id in me.used) consumeItem(id, Math.min(me.used[id], countItem(id)));
    if (!res.win || !def) { addLog(`🐉 團隊副本：討伐${res.boss.name}失敗`, 'warn'); return out; }
    const boss = makeMonster(def.boss), share = raidShare(res.n);
    out.exp = Math.max(1, Math.floor(boss.exp * def.reward * share * EXP_RATE * huntExpRate(player.lv)));
    out.gold = Math.round(rand(boss.gold[0], boss.gold[1]) * def.reward * share);
    player.gold += out.gold;
    if (!player.raidCd) player.raidCd = {};
    player.raidCd[def.id] = Date.now() + def.cdH * 3600 * 1000;
    addLog(`🏆 團隊副本：討伐${boss.name}！經驗 +${fmt(out.exp)}、金幣 +${fmt(out.gold)}`, 'boss');
    gainExp(out.exp);
    const seq = logSeq;
    rollDrops(boss, { drops: [] });
    out.items = gameLog.filter(l => l.seq > seq && /^🎁|^🪙/.test(l.msg)).map(l => l.msg);
    if (boss.dragon) {
        const first = !player.dragons[boss.id];
        player.dragons[boss.id] = (player.dragons[boss.id] || 0) + 1;
        if (first && hasDragonTitle()) {
            addLog('👑 四大龍全數討伐，獲得稱號「屠龍勇者」！', 'boss');
            out.title = true;
        }
    }
    return out;
}

// 把獎勵發給「參加的那個角色」：正在玩就直接給，不然打開那個欄位的存檔給完再存回去
function raidClaim(res, runKey, charId) {
    const uid = cloudUser && cloudUser.id;
    if (!uid) return null;
    if (player && cloudCharId({ player }) === charId) {
        const out = raidApplyReward(res, uid, runKey);
        if (out) { saveGame(); refreshUI(); }
        return out;
    }
    for (let i = 0; i < MAX_SLOTS; i++) {
        const raw = cloudLs(slotKey(i));
        if (!raw) continue;
        let data;
        try { data = JSON.parse(raw); } catch (e) { continue; }
        if (cloudCharId(data) !== charId) continue;
        const keep = player;
        let out;
        try {
            player = migrateSave(data);
            out = raidApplyReward(res, uid, runKey);
            if (out) {
                cloudLs(slotKey(i), JSON.stringify({ schema: SAVE_SCHEMA, t: Date.now(), player }));
                cloudMarkDirty(i);
            }
        } finally { player = keep; }
        return out;
    }
    return null;
}

// ───────── 雲端：隊伍資料 ─────────
let raidRoom = null;       // 目前所在隊伍（raid_rooms 一列）
let raidMembers = [];      // 隊員（raid_members）
let raidPollTimer = null;
let raidBusy = false;
let raidList = null;       // 公開隊伍列表（null＝還沒讀）
let raidMsg = '';
let raidPick = 'drake';    // 建立隊伍時選的副本
let raidReplay = null;     // { res, key, start, claimed, reward }

function raidReady() { return isCloudConfigured() && cloudLoggedIn(); }
function raidRunKey(room) { return `${room.id}:${room.round}`; }
function raidIsLeader() { return !!(raidRoom && cloudUser && raidRoom.leader === cloudUser.id); }
function raidMe() { return cloudUser ? raidMembers.find(m => m.user_id === cloudUser.id) : null; }
function raidMemberReady(m) { return !!(raidRoom && m.ready_round === raidRoom.round && m.snap); }

function raidErr(e) {
    const m = String((e && e.message) || e || '');
    if (/room full/i.test(m)) return '隊伍已滿（8 人）';
    if (/room closed|not open/i.test(m)) return '隊伍已經開始或解散了';
    return cloudErrText(e);
}

function raidSetMsg(t) { raidMsg = t; raidRender(); }

async function raidQ(p) {
    const r = await cloudTimeout(p);
    if (r.error) throw r.error;
    return r.data;
}

function raidCode() {
    let s = '';
    for (let i = 0; i < 6; i++) s += RAID_CODE_CHARS[Math.floor(Math.random() * RAID_CODE_CHARS.length)];
    return s;
}

async function raidCreate(raidId) {
    const def = RAID_BY_ID[raidId];
    if (!raidReady() || raidBusy || !def || !player) return;
    const why = raidBlockReason(def);
    if (why) { showToast(why); return; }
    raidBusy = true; raidSetMsg('建立隊伍中…');
    try {
        let room = null;
        for (let i = 0; i < 5 && !room; i++) {
            const r = await cloudTimeout(cloudSb.from('raid_rooms').insert({
                code: raidCode(), raid: def.id, leader: cloudUser.id, leader_name: player.name, status: 'open', round: 1, version: GAME_VERSION, is_public: true,
            }).select().single());
            if (r.error && r.error.code === '23505') continue;   // 房號重複，換一個
            if (r.error) throw r.error;
            room = r.data;
        }
        if (!room) throw new Error('建立失敗，請再試一次');
        await raidQ(cloudSb.from('raid_members').insert(raidMemberRow(room.id)));
        await raidEnter(room.id);
        raidMsg = '';
        showToast(`已建立隊伍，房號 ${room.code}`);
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    raidRender();
}

function raidMemberRow(roomId) {
    return { room_id: roomId, user_id: cloudUser.id, name: player.name, cls: player.cls, lv: player.lv, char_id: cloudCharId({ player }), ready_round: 0, snap: null };
}

async function raidJoinCode() {
    const el = document.getElementById('raid-code');
    const code = ((el && el.value) || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { showToast('請輸入 6 碼房號'); return; }
    if (!raidReady() || raidBusy) return;
    raidBusy = true; raidSetMsg('尋找隊伍中…');
    try {
        const rows = await raidQ(cloudSb.from('raid_rooms').select('*').eq('code', code).limit(1));
        if (!rows || !rows.length) throw new Error('找不到這個房號');
        raidBusy = false;
        await raidJoin(rows[0].id);
        return;
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    raidRender();
}

async function raidJoin(roomId) {
    if (!raidReady() || raidBusy || !player) return;
    raidBusy = true; raidSetMsg('加入隊伍中…');
    try {
        const rows = await raidQ(cloudSb.from('raid_rooms').select('*').eq('id', roomId).limit(1));
        const room = rows && rows[0];
        if (!room || room.status !== 'open') throw new Error('room closed');
        if (room.version !== GAME_VERSION) throw new Error(`隊長的遊戲版本不同（${room.version}），請雙方都重新整理到最新版`);
        const def = RAID_BY_ID[room.raid];
        const why = def ? raidBlockReason(def) : '未知的副本';
        if (why) throw new Error(why);
        await raidQ(cloudSb.from('raid_members').upsert(raidMemberRow(room.id)));
        await raidEnter(room.id);
        raidMsg = '';
        showToast('已加入隊伍');
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    raidRender();
}

// 進入隊伍：記住房號、開始定時更新
async function raidEnter(roomId) {
    cloudLs(RAID_ROOM_KEY, roomId);
    await raidRefresh(roomId);
    raidStartPoll();
}

function raidStartPoll() {
    if (raidPollTimer) return;
    raidPollTimer = setInterval(() => { if (raidRoom && !document.hidden) raidRefresh(raidRoom.id); }, RAID_POLL_MS);
}

function raidStopPoll() {
    if (raidPollTimer) clearInterval(raidPollTimer);
    raidPollTimer = null;
}

function raidReset(msg) {
    raidRoom = null; raidMembers = []; raidReplay = null;
    cloudLs(RAID_ROOM_KEY, null);
    raidStopPoll();
    if (msg) raidMsg = msg;
}

let raidRefreshing = false;
async function raidRefresh(roomId) {
    if (!raidReady() || raidRefreshing) return;
    raidRefreshing = true;
    try {
        const rooms = await raidQ(cloudSb.from('raid_rooms').select('*').eq('id', roomId).limit(1));
        const room = rooms && rooms[0];
        if (!room || room.status === 'closed') { raidReset(room ? '隊長解散了隊伍' : '隊伍已不存在'); return; }
        const members = await raidQ(cloudSb.from('raid_members').select('*').eq('room_id', roomId).order('joined_at'));
        if (!members.some(m => m.user_id === cloudUser.id)) { raidReset('你已離開隊伍（或被隊長請出）'); return; }
        const was = raidRoom;
        raidRoom = room; raidMembers = members;
        // 開戰：拿到結果就先發獎勵（重播只是觀看）
        if ((room.status === 'fighting' || room.status === 'done') && room.result) {
            const key = raidRunKey(room);
            if (!raidReplay || raidReplay.key !== key) {
                const me = raidMe();
                raidReplay = { res: room.result, key, start: Date.parse(room.started_at) || Date.now(), reward: null, skip: false };
                if (me && room.result.members.some(m => m.uid === cloudUser.id)) raidReplay.reward = raidClaim(room.result, key, me.char_id);
                if (!was || was.status === 'open') showToast('⚔️ 團隊副本開戰！');
            }
        } else if (room.status === 'open' && raidReplay) {
            raidReplay = null;   // 隊長開了下一場
        }
    } catch (e) {
        raidMsg = '⚠️ ' + raidErr(e);
    } finally {
        raidRefreshing = false;
        raidRender();
    }
}

async function raidToggleReady() {
    const me = raidMe();
    if (!raidRoom || !me || raidBusy || raidRoom.status !== 'open') return;
    const ready = raidMemberReady(me);
    if (!ready) {
        if (!player) return;
        if (cloudCharId({ player }) !== me.char_id) { showToast('請用加入隊伍時的角色準備，或離開隊伍重新加入'); return; }
        const why = raidBlockReason(RAID_BY_ID[raidRoom.raid]);
        if (why) { showToast(why); return; }
        if (player.loc.type !== 'town') { showToast('請先回到村莊再準備（準備時會記錄目前的裝備與藥水）'); return; }
    }
    raidBusy = true;
    try {
        saveGame();
        const row = ready ? { ready_round: 0 } : { ready_round: raidRoom.round, snap: raidSnapshot(), name: player.name, lv: player.lv, cls: player.cls };
        await raidQ(cloudSb.from('raid_members').update(row).eq('room_id', raidRoom.id).eq('user_id', cloudUser.id));
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    await raidRefresh(raidRoom.id);
}

async function raidLeave() {
    if (!raidRoom || raidBusy) return;
    const leader = raidIsLeader();
    gameConfirm('離開隊伍', leader ? '你是隊長，離開後隊伍會解散。確定離開？' : '確定離開隊伍？', async () => {
        raidBusy = true;
        try {
            if (leader) await raidQ(cloudSb.from('raid_rooms').update({ status: 'closed' }).eq('id', raidRoom.id));
            await raidQ(cloudSb.from('raid_members').delete().eq('room_id', raidRoom.id).eq('user_id', cloudUser.id));
        } catch (e) { console.warn('離開隊伍失敗', e); }
        raidBusy = false;
        raidReset('');
        raidRender();
    }, '離開');
}

async function raidKick(uid) {
    if (!raidIsLeader() || raidBusy) return;
    const m = raidMembers.find(x => x.user_id === uid);
    if (!m) return;
    gameConfirm('請出隊伍', `確定把 ${m.name} 請出隊伍？`, async () => {
        try { await raidQ(cloudSb.from('raid_members').delete().eq('room_id', raidRoom.id).eq('user_id', uid)); }
        catch (e) { showToast(raidErr(e)); }
        raidRefresh(raidRoom.id);
    }, '請出');
}

async function raidTogglePublic() {
    if (!raidIsLeader() || raidBusy) return;
    try { await raidQ(cloudSb.from('raid_rooms').update({ is_public: !raidRoom.is_public }).eq('id', raidRoom.id)); }
    catch (e) { showToast(raidErr(e)); }
    raidRefresh(raidRoom.id);
}

// 隊長開戰：讀最新的隊員快照 → 模擬 → 結果寫回（status＝fighting，伺服器記下開戰時間）
async function raidStart() {
    if (!raidIsLeader() || raidBusy || raidRoom.status !== 'open') return;
    raidBusy = true; raidSetMsg('開戰中…');
    try {
        const members = await raidQ(cloudSb.from('raid_members').select('*').eq('room_id', raidRoom.id).order('joined_at'));
        const ready = members.filter(m => m.ready_round === raidRoom.round && m.snap);
        if (ready.length !== members.length) throw new Error('還有隊員沒準備好');
        if (!ready.length) throw new Error('沒有隊員');
        const def = RAID_BY_ID[raidRoom.raid];
        for (const m of ready) {
            const why = raidBlockReason(def, m.snap);
            if (why) throw new Error(`${m.name}：${why}`);
        }
        const res = raidSimulate(def, ready.map(m => ({ uid: m.user_id, name: m.name, snap: m.snap })));
        await raidQ(cloudSb.from('raid_rooms').update({ status: 'fighting', result: res }).eq('id', raidRoom.id).eq('status', 'open'));
        raidMsg = '';
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidBusy = false;
    await raidRefresh(raidRoom.id);
}

// 隊長：同一隊再打一場（大家要重新準備）
async function raidAgain() {
    if (!raidIsLeader() || raidBusy) return;
    raidBusy = true;
    try { await raidQ(cloudSb.from('raid_rooms').update({ status: 'open', round: raidRoom.round + 1, result: null }).eq('id', raidRoom.id)); }
    catch (e) { showToast(raidErr(e)); }
    raidBusy = false;
    raidReplay = null;
    raidRefresh(raidRoom.id);
}

async function raidLoadList() {
    if (!raidReady()) return;
    raidList = raidList || [];
    try {
        const since = new Date(Date.now() - RAID_LIST_MAX_AGE_MS).toISOString();
        raidList = await raidQ(cloudSb.from('raid_rooms').select('id, code, raid, leader_name, member_count, created_at')
            .eq('status', 'open').eq('is_public', true).eq('version', GAME_VERSION).gt('created_at', since)
            .order('created_at', { ascending: false }).limit(20));
    } catch (e) { raidMsg = '⚠️ ' + raidErr(e); }
    raidRender();
}

// 重新整理頁面後，自動回到原本的隊伍
function raidResume() {
    const id = cloudLs(RAID_ROOM_KEY);
    if (id && raidReady() && !raidRoom) { raidRefresh(id).then(() => { if (raidRoom) raidStartPoll(); }); }
}

// ───────── 畫面 ─────────
function raidRender() {
    if (typeof currentTab !== 'undefined' && currentTab === 'raid' && player && !SIM_MODE) renderPanel();
}

function renderRaid() {
    if (!isCloudConfigured()) return `<div class="panel notice">團隊副本需要雲端伺服器，目前尚未開通。</div>`;
    if (!cloudLoggedIn()) return `<div class="panel notice">團隊副本要先登入帳號（和朋友組隊需要知道你是誰）。
        <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div></div>`;
    if (!raidRoom) raidResume();
    const msg = raidMsg ? `<div class="panel notice">${esc(raidMsg)}</div>` : '';
    if (raidRoom && raidReplay) return msg + raidReplayHtml();
    if (raidRoom) return msg + raidLobbyHtml();
    if (raidList === null) raidLoadList();
    return msg + raidHomeHtml();
}

function raidHomeHtml() {
    const cards = RAIDS.map(def => {
        const m = MONSTERS[def.boss], why = raidBlockReason(def);
        return `<div class="list-row ${raidPick === def.id ? 'raid-pick' : ''} ${why ? 'locked' : ''}">
            <div class="clickable" onclick="raidPickRaid('${def.id}')"><b>${m.icon || '🐉'} ${m.name}</b>
            <small>需求 Lv.${def.reqLv}｜冷卻 ${def.cdH} 小時｜${esc(def.desc)}${why ? `<br><span class="bad">${esc(why)}</span>` : ''}</small></div>
            <button class="mini" onclick="raidCreate('${def.id}')" ${why ? 'disabled' : ''}>建立隊伍</button></div>`;
    }).join('');
    const list = (raidList || []).map(r => {
        const def = RAID_BY_ID[r.raid], m = def ? MONSTERS[def.boss] : null;
        return `<div class="list-row"><div><b>${m ? m.icon + ' ' + m.name : r.raid}</b><small>隊長 ${esc(r.leader_name || '')}｜${r.member_count}/${RAID_MAX} 人｜房號 ${esc(r.code)}</small></div>
            <button class="mini" onclick="raidJoin('${r.id}')" ${r.member_count >= RAID_MAX ? 'disabled' : ''}>加入</button></div>`;
    }).join('') || '<small class="muted">目前沒有公開的隊伍，自己建立一個吧！</small>';
    return `<div class="panel"><h4>🐉 團隊副本</h4>
            <small class="muted">最多 ${RAID_MAX} 人組隊打龍。建立隊伍後把 6 碼房號傳給朋友；大家在村莊按「準備」，隊長按「開始」就會一起開打（自動戰鬥，全隊同步觀看）。
            人越多龍越硬，但經驗、金幣、掉落都有份。</small></div>
        <div class="panel"><h4>🔑 用房號加入</h4>
            <div class="btn-row"><input type="text" id="raid-code" maxlength="6" placeholder="例如 K7QX2M" style="text-transform:uppercase;width:140px">
            <button onclick="raidJoinCode()">加入</button></div></div>
        <div class="panel"><h4>⚔️ 建立隊伍</h4><div class="list">${cards}</div></div>
        <div class="panel"><h4>📋 公開隊伍 <button class="mini secondary" onclick="raidLoadList()">重新整理</button></h4><div class="list">${list}</div></div>`;
}

function raidPickRaid(id) { raidPick = id; raidRender(); }

function raidLobbyHtml() {
    const r = raidRoom, def = RAID_BY_ID[r.raid], boss = MONSTERS[def.boss], leader = raidIsLeader(), me = raidMe();
    const rows = [];
    for (let i = 0; i < RAID_MAX; i++) {
        const m = raidMembers[i];
        if (!m) { rows.push(`<div class="raid-slot empty">空位</div>`); continue; }
        const c = CLASSES[m.cls] || {};
        const ok = raidMemberReady(m);
        rows.push(`<div class="raid-slot ${ok ? 'ready' : ''}"><span>${c.icon || '🧝'} <b>${esc(m.name)}</b> <small>${c.name || ''} Lv.${m.lv}</small>${m.user_id === r.leader ? ' 👑' : ''}</span>
            <span>${ok ? '✅ 準備' : '⌛ 未準備'}${leader && m.user_id !== cloudUser.id ? ` <button class="mini secondary" onclick="raidKick('${m.user_id}')">請出</button>` : ''}</span></div>`);
    }
    const allReady = raidMembers.length > 0 && raidMembers.every(raidMemberReady);
    const mine = me && raidMemberReady(me);
    const wrongChar = me && player && cloudCharId({ player }) !== me.char_id;
    return `<div class="panel"><h4>${boss.icon || '🐉'} ${boss.name}（需求 Lv.${def.reqLv}）</h4>
            <div class="raid-code">房號 <b>${esc(r.code)}</b></div>
            <small class="muted">把房號傳給朋友，在「🐉 團隊副本 → 用房號加入」輸入。${raidMembers.length}/${RAID_MAX} 人。
            ${leader ? `隊伍目前${r.is_public ? '公開（任何人都能從列表加入）' : '不公開（只能用房號加入）'}。` : ''}</small>
            ${wrongChar ? `<p class="bad">你現在用的角色不是加入隊伍時的角色，請切換回去或離開隊伍。</p>` : ''}
        </div>
        <div class="panel raid-slots">${rows.join('')}</div>
        <div class="panel"><div class="btn-row">
            <button onclick="raidToggleReady()" ${raidBusy ? 'disabled' : ''}>${mine ? '取消準備' : '✅ 準備'}</button>
            ${leader ? `<button onclick="raidStart()" ${!allReady || raidBusy ? 'disabled' : ''}>⚔️ 開始</button>
                <button class="secondary" onclick="raidTogglePublic()">${r.is_public ? '改為不公開' : '改為公開'}</button>` : ''}
            <button class="danger" onclick="raidLeave()">${leader ? '解散隊伍' : '離開隊伍'}</button></div>
            <small class="muted">按「準備」會記錄你目前的能力、裝備、技能與藥水（要在村莊）。戰鬥中會自動喝水、施法；用掉的藥水會從背包扣除。
            ${leader ? '全員準備好後就能開始。' : '等隊長開始。'}</small></div>`;
}

// 重播：依開戰時間算出現在播到哪裡（所有人看到同一刻）
function raidReplayPos() {
    const rp = raidReplay, total = rp.res.ms;
    if (rp.skip) return total;
    return clamp((Date.now() - rp.start) * RAID_REPLAY_SPEED, 0, total);
}

function raidReplayHtml() {
    const rp = raidReplay, res = rp.res, pos = raidReplayPos(), done = pos >= res.ms;
    let f = res.frames[0];
    for (const x of res.frames) { if (x[0] <= pos) f = x; else break; }
    const pct = (a, b) => b > 0 ? clamp(a / b * 100, 0, 100) : 0;
    const bossHp = f[1];
    const mem = res.members.map((m, i) => {
        const hp = f[2 + i], c = CLASSES[m.cls] || {};
        const me = cloudUser && m.uid === cloudUser.id;
        return `<div class="raid-mem ${hp <= 0 ? 'down' : ''} ${me ? 'me' : ''}"><span>${c.icon || '🧝'} ${esc(m.name)}</span>
            <div class="raid-bar hp"><div style="width:${pct(hp, m.maxHp)}%"></div><b>${hp <= 0 ? '倒下' : fmt(hp) + '/' + fmt(m.maxHp)}</b></div></div>`;
    }).join('');
    const evs = res.events.filter(e => e[0] <= pos).slice(-14).reverse()
        .map(e => `<div class="log-line ${e[2]}">[${Math.floor(e[0] / 60000)}:${String(Math.floor(e[0] / 1000) % 60).padStart(2, '0')}] ${esc(e[1])}</div>`).join('');
    let foot = '';
    if (done) {
        const rank = res.members.slice().sort((a, b) => b.dmg - a.dmg)
            .map((m, i) => `<div class="list-row"><span>${i + 1}. ${esc(m.name)}${m.died ? ' 💀' : ''}</span><small>傷害 ${fmt(m.dmg)}${m.heal ? `｜治療 ${fmt(m.heal)}` : ''}</small></div>`).join('');
        foot = `<div class="panel"><h4>${res.win ? '🏆 討伐成功！' : '☠️ 討伐失敗'}</h4>${raidRewardHtml(rp.reward)}
            <h4>📊 傷害排行</h4><div class="list">${rank}</div>
            <div class="btn-row">${raidIsLeader() ? '<button onclick="raidAgain()">🔁 同一隊再打一場</button>' : '<small class="muted">等隊長決定要不要再打一場。</small>'}
            <button class="danger" onclick="raidLeave()">${raidIsLeader() ? '解散隊伍' : '離開隊伍'}</button></div></div>`;
    }
    return `<div class="panel"><h4>${res.boss.icon || '🐉'} ${esc(res.boss.name)}（Lv.${res.boss.lv}）・${res.n} 人</h4>
            <div class="raid-bar boss"><div style="width:${pct(bossHp, res.boss.maxHp)}%"></div><b>${fmt(bossHp)} / ${fmt(res.boss.maxHp)}</b></div>
            <small class="muted">${done ? '戰鬥結束' : `戰鬥中…${Math.floor(pos / 1000)} 秒`}</small>
            ${done ? '' : '<div class="btn-row"><button class="mini secondary" onclick="raidSkip()">⏩ 直接看結果</button></div>'}</div>
        <div class="panel raid-mems">${mem}</div>
        <div class="panel raid-log">${evs}</div>${foot}`;
}

function raidRewardHtml(r) {
    if (!r) return '<p class="muted">（這場的獎勵已經領過，或你沒有參加這場）</p>';
    const used = Object.keys(r.used || {}).map(id => `${ITEMS[id] ? ITEMS[id].name : id} ×${r.used[id]}`).join('、');
    if (!r.win) return `<p>沒有獲得獎勵。${used ? `<br><small class="muted">消耗：${esc(used)}</small>` : ''}</p>`;
    return `<p>經驗 +${fmt(r.exp)}、金幣 +${fmt(r.gold)}</p>${r.items.length ? `<p>${r.items.map(esc).join('<br>')}</p>` : ''}
        ${r.title ? '<p class="good">👑 獲得稱號「屠龍勇者」！</p>' : ''}${used ? `<small class="muted">消耗：${esc(used)}</small>` : ''}`;
}

function raidSkip() { if (raidReplay) { raidReplay.skip = true; raidRender(); } }

// 重播中每秒重畫一次（只在團隊副本分頁開著時）
setInterval(() => {
    if (raidReplay && !raidReplay.shown && currentTab === 'raid' && player) {
        if (raidReplayPos() >= raidReplay.res.ms) raidReplay.shown = true;
        renderPanel();
    }
}, 1000);

TABS.raid = ['🐉', '團隊副本'];
PANEL_FNS.raid = renderRaid;
