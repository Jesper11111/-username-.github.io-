// 屠龍勇者：聊天（ARCHITECTURE.md 第 32 節）
// 依賴 cloud（cloudSb／cloudUser／cloudBan）、raid（raidRoom）、ui-panels（TABS／PANEL_FNS 在載入時加分頁）。
// 頻道：world 世界、room:<隊伍id> 隊伍（只有團隊副本隊員）。資料在 Supabase dragon_chat；每則 1～100 字、每人 3 秒一則、保留 3 天（規則在 tools/supabase.sql）。
// 聊天分頁（或左下角聊天框）開著時才抓新訊息（只抓比手上最新一則更新的），沒開時不連網。
// 抓的間隔依活躍程度（省 Supabase 傳輸量，2026-10-19）：最近 1 分鐘有新訊息／自己打字／剛打開 → 4 秒；安靜 1～5 分鐘 → 10 秒；更久 → 30 秒。

const CHAT_MAX_LEN = 100;
const CHAT_COOLDOWN_MS = 3000;
const CHAT_POLL_MS = 4000;
const CHAT_POLL_IDLE_MS = 10000;
const CHAT_POLL_AWAY_MS = 30000;
const CHAT_SHOW = 60;          // 每個頻道畫面上留幾則

let chatChannel = 'world';
let chatMsgs = {};             // 頻道 → 訊息陣列（舊→新）
let chatLastSent = 0;
let chatDraft = '';
let chatLoading = false;
let chatErr = '';
let chatMute = null;           // 自己被禁言：{ until, reason }
let chatMuteChecked = false;
let chatActiveAt = 0, chatPollAt = 0;   // 最近一次「有動靜」的時間、上次抓的時間
function chatTouch() { chatActiveAt = Date.now(); }
function chatPollGap() {
    const idle = Date.now() - chatActiveAt;
    return idle < 60 * 1000 ? CHAT_POLL_MS : idle < 5 * 60 * 1000 ? CHAT_POLL_IDLE_MS : CHAT_POLL_AWAY_MS;
}
const LOG_TAB_KEY = 'dragonSlayer_logTab';
let logPopTab = 'log';      // 左下角訊息框：log 戰鬥訊息／chat 聊天／loot 掉落紀錄
try { const t = localStorage.getItem(LOG_TAB_KEY); if (t === 'chat' || t === 'loot') logPopTab = t; } catch (e) { }

function chatRoomChannel() { return raidRoom ? 'room:' + raidRoom.id : null; }
function chatValid(c) { return c === 'world' || (c && (c === chatRoomChannel() || c === clanChannel())); }
function chatReady() { return isCloudConfigured() && cloudLoggedIn(); }

function chatOpen(ch) {
    if (ch === 'room') ch = chatRoomChannel() || 'world';
    if (ch === 'clan') ch = clanChannel() || 'world';
    if (ch) chatChannel = ch;
    chatTouch();
    switchTab('chat');
}

function chatSwitch(ch) {
    chatChannel = ch === 'room' ? (chatRoomChannel() || 'world') : ch === 'clan' ? (clanChannel() || 'world') : 'world';
    chatTouch();
    if (tabOpen('chat')) renderPanel();
    renderPopChat();
    chatFetch();
}

// ───────── 左下角訊息框的聊天分頁（PC 與手機共用；框是 index.html 的靜態元素，不隨分頁重畫）─────────
function chatPopOpen() { return typeof logDrawerOpen !== 'undefined' && logDrawerOpen && logPopTab === 'chat'; }

function setLogPopTab(t) {
    logPopTab = t === 'chat' || t === 'loot' ? t : 'log';
    try { localStorage.setItem(LOG_TAB_KEY, logPopTab); } catch (e) { }
    syncLogPopTab();
    if (logPopTab === 'chat') { chatTouch(); renderPopChat(); chatFetch(); }
    else { lastLogRendered = 0; lastLootRendered = -1; renderLogPop(); }
}

function syncLogPopTab() {
    const log = document.getElementById('hunt-log'), pc = document.getElementById('pop-chat'), loot = document.getElementById('hunt-loot');
    if (!log || !pc || !loot) return;
    log.classList.toggle('hidden', logPopTab !== 'log');
    pc.classList.toggle('hidden', logPopTab !== 'chat');
    loot.classList.toggle('hidden', logPopTab !== 'loot');
    const a = document.getElementById('lp-tab-log'), b = document.getElementById('lp-tab-chat');
    if (a) a.classList.toggle('on', logPopTab === 'log');
    if (b) b.classList.toggle('on', logPopTab === 'chat');
    const c = document.getElementById('lp-tab-loot');
    if (c) c.classList.toggle('on', logPopTab === 'loot');
}

function chatChipsHtml() {
    const room = chatRoomChannel(), clan = clanChannel();
    return `<div class="chips"><button class="chip-btn ${chatChannel === 'world' ? 'active' : ''}" onclick="chatSwitch('world')">🌏 世界</button>
        <button class="chip-btn ${room && chatChannel === room ? 'active' : ''}" onclick="chatSwitch('room')" ${room ? '' : 'disabled title="加入團隊副本隊伍後才能用"'}>🐉 隊伍</button>
        <button class="chip-btn ${clan && chatChannel === clan ? 'active' : ''}" onclick="chatSwitch('clan')" ${clan ? '' : 'disabled title="加入血盟後才能用"'}>🏰 血盟</button></div>`;
}

function chatBlockedText() {
    return cloudBan ? '帳號已停權，無法發言' : chatMute && Date.parse(chatMute.until) > Date.now() ? `禁言中，到 ${new Date(chatMute.until).toLocaleString('zh-TW', { hour12: false })}` : '';
}

function chatPlaceholder() { return chatChannel === 'world' ? '對全世界說…' : chatChannel.startsWith('clan:') ? '對血盟說…' : '對隊友說…'; }

function renderPopChat() {
    const box = document.getElementById('pop-chat');
    if (!box) return;
    syncLogPopTab();
    if (logPopTab !== 'chat') return;
    if (!isCloudConfigured() || !cloudLoggedIn()) { box.innerHTML = '<div class="muted">登入帳號後才能聊天（標題畫面「☁️ 登入／註冊」）。</div>'; return; }
    if (!chatValid(chatChannel)) chatChannel = 'world';
    const keep = document.getElementById('pop-chat-input'), draft = keep ? keep.value : '';
    const blocked = chatBlockedText();
    box.innerHTML = `${chatChipsHtml()}<div id="pop-chat-list" class="chat-list">${chatListHtml()}</div>
        ${blocked ? `<div class="muted">⛔ ${esc(blocked)}</div>` : `<div class="chat-input-row"><input type="text" id="pop-chat-input" maxlength="${CHAT_MAX_LEN}" placeholder="${chatPlaceholder()}" autocomplete="off"
            onkeydown="chatKey(event,'pop-chat-input')"><button onclick="chatSend('pop-chat-input')">發送</button></div>`}`;
    const el = document.getElementById('pop-chat-input');
    if (el) el.value = draft;
    const list = document.getElementById('pop-chat-list');
    if (list) list.scrollTop = list.scrollHeight;
    if (!chatMsgs[chatChannel]) chatFetch();
}

async function chatFetch() {
    if (!chatReady() || chatLoading) return;
    if (!chatValid(chatChannel)) chatChannel = 'world';   // 離開隊伍／血盟了
    const ch = chatChannel, list = chatMsgs[ch] || [];
    chatLoading = true;
    chatPollAt = Date.now();
    try {
        let q = cloudSb.from('dragon_chat').select('id, user_id, name, cls, lv, text, at').eq('channel', ch);
        const rows = list.length
            ? await raidQ(q.gt('id', list[list.length - 1].id).order('id', { ascending: true }).limit(50))
            : (await raidQ(q.order('id', { ascending: false }).limit(CHAT_SHOW))).reverse();
        if (rows.length && chatMsgs[ch]) chatTouch();   // 有人說話（不是第一次載入）：回到 4 秒
        if (rows.length || !chatMsgs[ch]) {
            chatMsgs[ch] = list.concat(rows).slice(-CHAT_SHOW);
            chatRenderList();
        }
        chatErr = '';
    } catch (e) {
        chatErr = cloudErrText(e);
        chatRenderList();
    }
    chatLoading = false;
}

async function chatCheckMute() {
    try {
        const { data } = await cloudTimeout(cloudSb.from('dragon_mutes').select('until, reason').eq('user_id', cloudUser.id).maybeSingle());
        chatMute = data && Date.parse(data.until) > Date.now() ? data : null;
    } catch (e) { chatMute = null; }
}

async function chatSend(inputId = 'chat-input') {
    const el = document.getElementById(inputId);
    const text = ((el && el.value) || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LEN);
    if (!text || !chatReady() || !player) return;
    if (cloudBan) { showToast('帳號已停權，無法發言'); return; }
    if (text[0] === '/') { if (await chatCommand(text) && el) { el.value = ''; if (inputId === 'chat-input') chatDraft = ''; } return; }   // 指令不送進聊天
    const wait = CHAT_COOLDOWN_MS - (Date.now() - chatLastSent);
    if (wait > 0) { showToast(`說話太快了，${Math.ceil(wait / 1000)} 秒後再試`); return; }
    chatLastSent = Date.now();
    try {
        await raidQ(cloudSb.from('dragon_chat').insert({ channel: chatChannel, user_id: cloudUser.id, name: player.name, cls: player.cls, lv: player.lv, text }));
        chatTouch();
        if (inputId === 'chat-input') chatDraft = '';
        if (el) el.value = '';
        chatFetch();
    } catch (e) {
        const m = String((e && e.message) || '');
        if (/too fast/.test(m)) showToast('說話太快了，3 秒後再試');
        else if (/row-level security/.test(m)) {
            await chatCheckMute();
            showToast(chatMute ? `你被禁言到 ${new Date(chatMute.until).toLocaleString('zh-TW', { hour12: false })}` : '無法在這個頻道發言');
            renderPanel();
        } else showToast('發送失敗：' + cloudErrText(e));
    }
}

// ───────── GM 指令（ARCHITECTURE.md 第 128 節）─────────
// /give 道具id或名稱 [數量] [Email]：沒有 Email＝直接放進自己目前角色的背包；有 Email＝伺服器 gm_give_item 放進對方帳號的共用倉庫（tools/gm-give.sql）
// GM＝這次登入由 dragon_is_admin 確認過的帳號（cloudMorphAdminUid，同變身等級豁免），一般玩家打指令只會看到提示、不會送出
const GM_GIVE_MAX_STACK = 99999, GM_GIVE_MAX_EQUIP = 50;   // 和 gm-give.sql 的上限一致
function gmCmdOk() { return morphGmOk(); }
function gmFindItem(key) {
    if (ITEMS[key]) return [key];
    const k = key.toLowerCase();
    const ids = Object.keys(ITEMS).filter(id => id.toLowerCase() === k || ITEMS[id].name === key);
    return ids.length ? ids : Object.keys(ITEMS).filter(id => ITEMS[id].name.includes(key)).slice(0, 8);
}
async function chatCommand(text) {
    const [cmd, ...args] = text.split(' ');
    if (!['/give', '/發放'].includes(cmd.toLowerCase())) { showToast('沒有這個指令'); return false; }
    if (!gmCmdOk()) { showToast('只有 GM 可以使用這個指令'); return false; }
    const email = args.find(a => a.includes('@'));
    const rest = args.filter(a => a !== email);
    const item = rest[0], n = rest[1] == null ? 1 : Number(rest[1]);
    if (!item) { gameAlert('GM 指令', '/give 道具id或名稱 [數量] [對方Email]\n不填 Email＝發給自己目前的角色（放進背包）\n填 Email＝放進對方帳號的共用倉庫'); return false; }
    const ids = gmFindItem(item);
    if (ids.length !== 1) { gameAlert('找不到唯一的道具', ids.length ? `「${item}」符合多個道具，請改用 id：\n${ids.map(id => `${id}　${ITEMS[id].name}`).join('\n')}` : `沒有「${item}」這個道具`); return false; }
    const id = ids[0], d = ITEMS[id], max = isStackable(d) ? GM_GIVE_MAX_STACK : GM_GIVE_MAX_EQUIP;
    if (!Number.isSafeInteger(n) || n < 1 || n > max) { showToast(`數量要是 1～${max} 的整數`); return false; }
    if (!email) {
        addItem(id, n);
        showToast(`GM：${d.name} ×${n} 已放進背包`);
        refreshUI();
        saveGame();
        return true;
    }
    try {
        const { data, error } = await cloudTimeout(cloudSb.rpc('gm_give_item', { p_target: email, p_item: id, p_n: n, p_reason: '遊戲內 /give' }));
        if (error) throw error;
        showToast(`GM：已發 ${data.name} ×${data.n} 到 ${data.email} 的共用倉庫（剩 ${data.free} 格）`);
        return true;
    } catch (e) {
        const m = String((e && e.message) || e);
        showToast('發放失敗：' + (/no such player/.test(m) ? '找不到這個 Email 的帳號' : /unknown item/.test(m) ? '伺服器道具目錄沒有這個道具（或是任務道具）'
            : /vault full/.test(m) ? '對方共用倉庫格數不夠' : /not admin/.test(m) ? '伺服器不承認 GM 權限' : /gm_give_item|function/.test(m) ? '伺服器還沒安裝 tools/gm-give.sql' : cloudErrText(e)));
        return false;
    }
}

function chatKey(ev, inputId) {
    ev.stopPropagation();   // 打字時不要觸發地圖的 WASD／方向鍵移動
    chatTouch();
    if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); chatSend(inputId || 'chat-input'); }
}

function chatTime(at) {
    const d = new Date(at), now = new Date();
    const hm = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
    return d.toDateString() === now.toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

function chatListHtml() {
    if (chatErr) return `<div class="muted">⚠️ ${esc(chatErr)}</div>`;
    const list = chatMsgs[chatChannel];
    if (!list) return '<div class="muted">讀取中…</div>';
    if (!list.length) return `<div class="muted">還沒有人說話，打個招呼吧！</div>`;
    return list.map(m => {
        const c = CLASSES[m.cls] || {}, mine = cloudUser && m.user_id === cloudUser.id;
        return `<div class="chat-line ${mine ? 'mine' : ''}"><span class="chat-time">${chatTime(m.at)}</span>
            <b class="chat-name">${c.icon || ''}${esc(m.name)}<small> Lv.${m.lv || '?'}</small></b><span class="chat-text">${esc(m.text)}</span></div>`;
    }).join('');
}

// 只更新訊息列表（不重畫整個分頁，打到一半的字不會不見）
function chatRenderList() {
    for (const id of ['chat-list', 'pop-chat-list']) {
        const box = document.getElementById(id);
        if (!box) continue;
        const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
        box.innerHTML = chatListHtml();
        if (atBottom) box.scrollTop = box.scrollHeight;
    }
}

function renderChat() {
    if (!isCloudConfigured()) return `<div class="panel notice">聊天需要雲端伺服器，目前尚未開通。</div>`;
    if (!cloudLoggedIn()) return `<div class="panel notice">聊天要先登入帳號。
        <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div></div>`;
    if (!chatValid(chatChannel)) chatChannel = 'world';
    // 分頁重畫（例如打怪時畫面更新）前輸入框有焦點，畫完要還回去
    const hadFocus = !!(document.activeElement && document.activeElement.id === 'chat-input');
    const chips = chatChipsHtml();
    const blocked = chatBlockedText();
    const input = blocked ? `<div class="muted">⛔ ${esc(blocked)}</div>`
        : `<div class="chat-input-row"><input type="text" id="chat-input" maxlength="${CHAT_MAX_LEN}" placeholder="${chatPlaceholder()}" value="${esc(chatDraft)}"
            oninput="chatDraft = this.value" onkeydown="chatKey(event)" autocomplete="off">
            <button onclick="chatSend()">發送</button></div>`;
    if (!chatMsgs[chatChannel]) setTimeout(chatFetch, 0);
    if (!chatMuteChecked) { chatMuteChecked = true; chatCheckMute().then(() => { if (chatMute) renderPanel(); }); }
    setTimeout(() => {
        const box = document.getElementById('chat-list');
        if (box) box.scrollTop = box.scrollHeight;
        const el = document.getElementById('chat-input');
        if (el && hadFocus) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 0);
    return `<div class="panel chat-panel">${chips}<div id="chat-list" class="chat-list">${chatListHtml()}</div>${input}
        <small class="muted">${chatChannel === 'world' ? '所有玩家都看得到。' : chatChannel.startsWith('clan:') ? '只有血盟成員看得到。' : '只有隊伍裡的人看得到。'}每則最多 ${CHAT_MAX_LEN} 字、3 秒一則，訊息保留 3 天。請友善發言，管理者可以禁言。</small></div>`;
}

function chatShown() { return typeof currentTab !== 'undefined' && (tabOpen('chat') || chatPopOpen()) && player && !document.hidden && !SIM_MODE; }
setInterval(() => { if (chatShown() && cloudCanCall() && Date.now() - chatPollAt >= chatPollGap()) chatFetch(); }, 2000);   // 伺服器忙碌退避中不抓（cloud.js）
document.addEventListener('visibilitychange', () => { if (chatShown()) chatFetch(); });   // 從背景切回來馬上抓一次

TABS.chat = ['💬', '聊天'];
PANEL_FNS.chat = renderChat;
