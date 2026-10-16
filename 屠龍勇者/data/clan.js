// 屠龍勇者：血盟（ARCHITECTURE.md 第 33 節）
// 依賴 cloud（cloudSb／cloudUser／cloudBan）、raid（raidQ）、ui-panels（TABS／PANEL_FNS 在載入時加分頁）。
// 一個帳號同時只能在一個血盟；所有修改都呼叫 Supabase 的 clan_* 函式（規則在伺服器，tools/supabase.sql），這裡只負責畫面。
// 好處：團隊副本同血盟 2 人以上，經驗與金幣各 +10%（raid.js）；聊天多一個「🏰 血盟」頻道（chat.js）。

const CLAN_COST = 20000;        // 建立血盟的金幣（伺服器不檢查金幣，由遊戲扣）
const CLAN_MIN_LV = 15;
const CLAN_MAX = 50;
const CLAN_RAID_BONUS = 0.1;    // 團隊副本同血盟加成
const CLAN_ICONS = ['🛡️', '⚔️', '🐉', '🔥', '🌙', '⭐', '🦅', '🐺', '💀', '👑', '🌊', '🍀'];
const CLAN_ROLE_NAMES = { leader: '👑 盟主', officer: '⚔️ 副盟主', member: '盟員' };
const CLAN_ERRORS = {
    'name taken': '這個血盟名稱已經有人用了', 'bad name': '血盟名稱要 2～12 個字', 'level too low': `要 Lv.${CLAN_MIN_LV} 以上才能建立血盟`,
    'already in clan': '你已經在血盟裡了', 'clan full': `血盟已滿（${CLAN_MAX} 人）`, 'no clan': '找不到這個血盟（可能已解散）',
    'too many apps': '同時最多申請 3 個血盟，請先取消其他申請', 'no permission': '你沒有這個權限', 'no member': '找不到這位成員',
    'no application': '這個申請已經處理過了', 'transfer first': '血盟還有其他成員，請先讓位給別人再退出（或解散血盟）', banned: '帳號已停權',
};

let myClan = null;          // 自己的血盟（dragon_clans 一列）；null＝沒有
let myClanRole = null;      // leader / officer / member
let clanMembers = [];
let clanApps = [];          // 盟主／副盟主看到的入盟申請
let clanList = null;        // 沒有血盟時：血盟列表
let clanMyApps = [];        // 自己送出的申請
let clanLoaded = false, clanViewLoaded = false, clanBusy = false, clanMsg = '', clanQuery = '';
let clanNewIcon = CLAN_ICONS[0];

function clanErr(e) {
    const m = String((e && e.message) || e || '');
    for (const k in CLAN_ERRORS) if (m.includes(k)) return CLAN_ERRORS[k];
    return cloudErrText(e);
}
function clanReady() { return isCloudConfigured() && cloudLoggedIn() && !cloudBan; }
function clanCanManage() { return myClanRole === 'leader' || myClanRole === 'officer'; }
function clanChannel() { return myClan ? 'clan:' + myClan.id : null; }

async function clanRpc(fn, args) {
    const r = await cloudTimeout(cloudSb.rpc(fn, args || {}));
    if (r.error) throw r.error;
    return r.data;
}

function clanMeArgs() { return { p_cname: player ? player.name : '', p_cls: player ? player.cls : '', p_lv: player ? player.lv : 1 }; }

// 讀自己的血盟狀態（silent：登入時背景讀，不重畫）
async function clanLoad(silent) {
    if (!clanReady()) return;
    try {
        const mine = await raidQ(cloudSb.from('dragon_clan_members').select('*').eq('user_id', cloudUser.id).limit(1));
        const me = mine && mine[0];
        if (me) {
            const cl = await raidQ(cloudSb.from('dragon_clans').select('*').eq('id', me.clan_id).limit(1));
            myClan = cl[0] || null; myClanRole = me.role;
            if (!silent || tabOpen('clan')) {
                clanMembers = await raidQ(cloudSb.from('dragon_clan_members').select('*').eq('clan_id', me.clan_id).limit(CLAN_MAX + 5));
                clanApps = clanCanManage() ? await raidQ(cloudSb.from('dragon_clan_apps').select('*').eq('clan_id', me.clan_id).order('at', { ascending: true })) : [];
            }
            if (player) clanRpc('clan_touch', clanMeArgs()).catch(() => { });
        } else {
            myClan = null; myClanRole = null; clanMembers = []; clanApps = [];
            if (!silent || tabOpen('clan')) {
                clanList = await raidQ(cloudSb.from('dragon_clans').select('*').order('member_count', { ascending: false }).limit(60));
                clanMyApps = await raidQ(cloudSb.from('dragon_clan_apps').select('clan_id, at').eq('user_id', cloudUser.id));
            }
        }
        clanMsg = '';
    } catch (e) { clanMsg = '⚠️ ' + clanErr(e); }
    clanLoaded = true;
    clanRender();
}

function clanRender() {
    if (typeof currentTab !== 'undefined' && tabOpen('clan') && player && !SIM_MODE) renderPanel();
}

// 執行一個動作，成功後重新讀取
async function clanDo(fn, args, okMsg) {
    if (clanBusy) return false;
    clanBusy = true;
    let ok = false;
    try { await clanRpc(fn, args); ok = true; if (okMsg) showToast(okMsg); }
    catch (e) { showToast(clanErr(e)); }
    clanBusy = false;
    await clanLoad();
    return ok;
}

// ───────── 動作 ─────────
async function clanCreate() {
    const name = ((document.getElementById('clan-name') || {}).value || '').trim();
    const mode = (document.getElementById('clan-mode') || {}).value || 'approve';
    if (name.length < 2 || name.length > 12) { showToast('血盟名稱要 2～12 個字'); return; }
    if (player.lv < CLAN_MIN_LV) { showToast(`要 Lv.${CLAN_MIN_LV} 以上才能建立血盟`); return; }
    if (player.gold < CLAN_COST) { showToast(`金幣不足（建立血盟要 ${fmt(CLAN_COST)}）`); return; }
    gameConfirm('建立血盟', `花費 ${fmt(CLAN_COST)} 金幣建立血盟「${name}」？`, async () => {
        if (await clanDo('clan_create', Object.assign({ p_name: name, p_icon: clanNewIcon, p_mode: mode }, clanMeArgs()), `🏰 血盟「${name}」成立了！`)) {
            player.gold -= CLAN_COST;
            addLog(`🏰 建立血盟「${name}」（-${fmt(CLAN_COST)} 金幣）`, 'sys');
            saveGame(); refreshUI();
        }
    }, '建立');
}

function clanPickIcon(i) { clanNewIcon = CLAN_ICONS[i] || CLAN_ICONS[0]; renderPanel(); }

function clanJoin(id) {
    const c = (clanList || []).find(x => x.id === id);
    if (!c) return;
    if (c.join_mode === 'open') { clanDo('clan_join', Object.assign({ p_clan: id, p_msg: '' }, clanMeArgs()), `🏰 加入了血盟「${c.name}」`); return; }
    openDialog(`申請加入「${c.name}」`, `<p>這個血盟需要盟主或副盟主審核。可以留一句話給他們（最多 60 字）：</p>
        <input type="text" id="clan-app-msg" maxlength="60" style="width:100%" placeholder="例如：每天晚上都在線，想一起打龍">`,
        [{ text: '取消', cls: 'secondary' }, { text: '送出申請', onClick: () => {
            const msg = ((document.getElementById('clan-app-msg') || {}).value || '').trim();
            clanDo('clan_join', Object.assign({ p_clan: id, p_msg: msg }, clanMeArgs()), '已送出申請，等待審核');
        } }]);
}

function clanCancelApp(id) { clanDo('clan_cancel_app', { p_clan: id }, '已取消申請'); }
function clanDecide(uid, accept) { clanDo('clan_decide', { p_user: uid, p_accept: !!accept }, accept ? '已同意加入' : '已拒絕申請'); }
function clanMemberName(uid) { const m = clanMembers.find(x => x.user_id === uid); return m ? m.name : ''; }
function clanKick(uid) { gameConfirm('請出血盟', `確定把 ${clanMemberName(uid)} 請出血盟？`, () => clanDo('clan_kick', { p_user: uid }, '已請出血盟'), '請出'); }
function clanSetRole(uid, role) { clanDo('clan_set_role', { p_user: uid, p_role: role }, role === 'officer' ? '已任命為副盟主' : '已改為盟員'); }
function clanTransfer(uid) { gameConfirm('讓位', `把盟主讓給 ${clanMemberName(uid)}？你會變成副盟主。`, () => clanDo('clan_transfer', { p_user: uid }, '已讓位'), '讓位'); }
function clanLeave() {
    const alone = clanMembers.length <= 1;
    gameConfirm(alone && myClanRole === 'leader' ? '解散血盟' : '退出血盟', alone && myClanRole === 'leader' ? '只剩你一個人，退出就會解散血盟。確定？' : `確定退出血盟「${myClan.name}」？`,
        () => clanDo('clan_leave', {}, '已退出血盟'), '確定');
}
function clanDisband() { gameConfirm('解散血盟', `解散「${myClan.name}」？所有成員都會離開，無法復原！`, () => clanDo('clan_disband', {}, '血盟已解散'), '解散'); }
function clanSaveNotice() {
    const v = ((document.getElementById('clan-notice') || {}).value || '').slice(0, 200);
    clanDo('clan_update', { p_notice: v, p_mode: null, p_icon: null }, '公告已更新');
}
function clanSetMode(mode) { clanDo('clan_update', { p_notice: null, p_mode: mode, p_icon: null }, mode === 'open' ? '改為自由加入' : '改為申請制'); }
function clanSetIcon(i) { clanDo('clan_update', { p_notice: null, p_mode: null, p_icon: CLAN_ICONS[i] }, '徽章已更新'); }
function clanSearch(v) { clanQuery = v; renderPanel(); const el = document.getElementById('clan-search'); if (el) { el.focus(); el.setSelectionRange(v.length, v.length); } }

// ───────── 畫面 ─────────
function renderClan() {
    if (!isCloudConfigured()) return `<div class="panel notice">血盟需要雲端伺服器，目前尚未開通。</div>`;
    if (!cloudLoggedIn()) return `<div class="panel notice">血盟要先登入帳號。
        <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div></div>`;
    if (cloudBan) return `<div class="panel notice">⛔ 帳號已被管理者停權，無法使用血盟。</div>`;
    if (!clanViewLoaded) { clanViewLoaded = true; clanLoad(); }   // 第一次打開分頁讀完整資料（登入時只在背景讀了自己的血盟）
    if (!clanLoaded) return '<div class="panel muted">讀取中…</div>';
    const msg = clanMsg ? `<div class="panel notice">${esc(clanMsg)}</div>` : '';
    return msg + (myClan ? clanHomeHtml() : clanListHtml());
}

function clanListHtml() {
    const q = clanQuery.trim().toLowerCase();
    const applied = id => clanMyApps.some(a => a.clan_id === id);
    const rows = (clanList || []).filter(c => !q || c.name.toLowerCase().includes(q)).map(c => {
        const full = c.member_count >= CLAN_MAX;
        const btn = applied(c.id) ? `<button class="mini secondary" onclick="clanCancelApp('${c.id}')">取消申請</button>`
            : `<button class="mini" onclick="clanJoin('${c.id}')" ${full ? 'disabled' : ''}>${c.join_mode === 'open' ? '加入' : '申請'}</button>`;
        return `<div class="list-row"><div><b>${esc(c.icon)} ${esc(c.name)}</b><small>${c.member_count}/${CLAN_MAX} 人｜${c.join_mode === 'open' ? '自由加入' : '需審核'}${applied(c.id) ? '｜<span class="warn">申請中</span>' : ''}${c.notice ? '｜' + esc(c.notice.slice(0, 40)) : ''}</small></div>${btn}</div>`;
    }).join('') || '<small class="muted">還沒有血盟，成為第一個盟主吧！</small>';
    const icons = CLAN_ICONS.map((ic, i) => `<button class="chip-btn ${clanNewIcon === ic ? 'active' : ''}" onclick="clanPickIcon(${i})">${ic}</button>`).join('');
    const can = player.lv >= CLAN_MIN_LV;
    return `<div class="panel"><h4>🏰 血盟</h4><small class="muted">和朋友組成血盟：有專屬聊天頻道與公告；團隊副本裡同血盟 2 人以上，經驗與金幣各 +${CLAN_RAID_BONUS * 100}%。一個帳號同時只能加入一個血盟。</small></div>
        <div class="panel"><h4>📋 血盟列表 <button class="mini secondary" onclick="clanLoad()">重新整理</button></h4>
            <input type="text" id="clan-search" placeholder="搜尋血盟名稱" value="${esc(clanQuery)}" oninput="clanSearch(this.value)" style="width:100%;margin-bottom:8px">
            <div class="list">${rows}</div></div>
        <div class="panel"><h4>✨ 建立血盟</h4>
            <div class="clan-form"><input type="text" id="clan-name" maxlength="12" placeholder="血盟名稱（2～12 字）">
            <div class="chips">${icons}</div>
            <label class="set-row"><span>加入方式</span><select id="clan-mode"><option value="approve">需要審核</option><option value="open">自由加入</option></select></label>
            <button onclick="clanCreate()" ${can ? '' : 'disabled'}>建立（💰${fmt(CLAN_COST)}）</button></div>
            <small class="muted">${can ? '' : `<span class="bad">需要 Lv.${CLAN_MIN_LV}</span>｜`}建立後你就是盟主，可以任命副盟主幫忙審核。</small></div>`;
}

function clanHomeHtml() {
    const c = myClan, manage = clanCanManage(), leader = myClanRole === 'leader';
    const order = { leader: 0, officer: 1, member: 2 };
    const members = clanMembers.slice().sort((a, b) => order[a.role] - order[b.role] || (b.lv || 0) - (a.lv || 0)).map(m => {
        const cls = CLASSES[m.cls] || {}, me = m.user_id === cloudUser.id;
        const acts = [];
        if (!me && leader) {
            acts.push(m.role === 'officer' ? `<button class="mini secondary" onclick="clanSetRole('${m.user_id}','member')">取消副盟主</button>`
                : `<button class="mini secondary" onclick="clanSetRole('${m.user_id}','officer')">任命副盟主</button>`);
            acts.push(`<button class="mini secondary" onclick="clanTransfer('${m.user_id}')">讓位</button>`);
        }
        if (!me && (leader || (myClanRole === 'officer' && m.role === 'member'))) acts.push(`<button class="mini danger" onclick="clanKick('${m.user_id}')">請出</button>`);
        return `<div class="list-row ${me ? 'clan-me' : ''}"><div><b>${cls.icon || '🧝'} ${esc(m.name || '?')}</b>
            <small>${CLAN_ROLE_NAMES[m.role]}｜${cls.name || ''} Lv.${m.lv || '?'}｜${agoText(Date.parse(m.last_seen))}上線</small></div>
            ${acts.length ? `<div class="btn-row" style="margin:0">${acts.join('')}</div>` : ''}</div>`;
    }).join('');
    const apps = manage && clanApps.length ? `<div class="panel"><h4>📨 入盟申請（${clanApps.length}）</h4><div class="list">${clanApps.map(a => {
        const cls = CLASSES[a.cls] || {};
        return `<div class="list-row"><div><b>${cls.icon || '🧝'} ${esc(a.name || '?')}</b><small>${cls.name || ''} Lv.${a.lv || '?'}${a.msg ? '｜「' + esc(a.msg) + '」' : ''}</small></div>
            <div class="btn-row" style="margin:0"><button class="mini" onclick="clanDecide('${a.user_id}',true)">同意</button><button class="mini secondary" onclick="clanDecide('${a.user_id}',false)">拒絕</button></div></div>`;
    }).join('')}</div></div>` : '';
    const notice = manage
        ? `<textarea id="clan-notice" maxlength="200" style="height:70px" placeholder="例如：每週六晚上九點一起打龍">${esc(c.notice)}</textarea>
           <div class="btn-row"><button class="mini" onclick="clanSaveNotice()">儲存公告</button></div>`
        : `<p style="margin:0">${c.notice ? esc(c.notice) : '<span class="muted">（盟主還沒寫公告）</span>'}</p>`;
    const settings = leader ? `<div class="panel"><h4>⚙️ 血盟設定</h4>
        <div class="chips">${CLAN_ICONS.map((ic, i) => `<button class="chip-btn ${c.icon === ic ? 'active' : ''}" onclick="clanSetIcon(${i})">${ic}</button>`).join('')}</div>
        <div class="btn-row"><button class="${c.join_mode === 'open' ? '' : 'secondary'}" onclick="clanSetMode('open')">自由加入</button>
            <button class="${c.join_mode === 'approve' ? '' : 'secondary'}" onclick="clanSetMode('approve')">需要審核</button>
            <button class="danger" onclick="clanDisband()">解散血盟</button></div></div>` : '';
    return `<div class="panel"><div class="clan-title">${esc(c.icon)} ${esc(c.name)}</div>
            <small class="muted">${c.member_count}/${CLAN_MAX} 人｜${c.join_mode === 'open' ? '自由加入' : '需審核'}｜你是${CLAN_ROLE_NAMES[myClanRole]}</small>
            <div class="btn-row"><button onclick="chatOpen('clan')">💬 血盟聊天</button><button class="secondary" onclick="clanLoad()">🔄 重新整理</button>
            <button class="danger" onclick="clanLeave()">退出血盟</button></div></div>
        <div class="panel"><h4>📢 公告</h4>${notice}</div>
        ${apps}
        <div class="panel"><h4>👥 成員</h4><div class="list">${members}</div>
            <small class="muted">團隊副本裡同血盟 2 人以上，經驗與金幣各 +${CLAN_RAID_BONUS * 100}%。</small></div>
        ${settings}`;
}

TABS.clan = ['🏰', '血盟'];
PANEL_FNS.clan = renderClan;
