// 屠龍勇者：排行榜（ARCHITECTURE.md 第 34 節）
// 依賴 cloud（cloudSb）、ui-panels（TABS／PANEL_FNS 在載入時加分頁）。
// 名次由伺服器函式 dragon_leaderboard 直接從雲端存檔計算（tools/supabase.sql），玩家不用另外上傳；被封鎖的帳號不上榜。
// 想上榜：登入帳號（角色會自動上傳）。存檔每分鐘上傳一次，所以名次會晚一點更新。

const RANK_KINDS = [
    { id: 'level',  name: '⭐ 等級',     col: '總經驗', fmtVal: v => fmt(v) },
    { id: 'dragon', name: '🐉 屠龍',     col: '討伐次數', fmtVal: v => fmt(v) + ' 次' },
    { id: 'tower',  name: '🏛️ 永夜之塔', col: '守關樓層', fmtVal: v => v + 'F' },
    { id: 'kills',  name: '⚔️ 擊殺',     col: '擊倒數', fmtVal: v => fmt(v) },
    { id: 'clan',   name: '🏰 血盟',     col: '平均等級', fmtVal: v => 'Lv.' + v },
];
const RANK_TOP = 50;
const RANK_CACHE_MS = 60 * 1000;   // 同一個榜 1 分鐘內再看直接用上次的結果

let rankKind = 'level', rankCls = '';
let rankData = {};                 // `${kind}|${cls}` → { rows, at }
let rankLoading = false, rankErr = '';

function rankKey() { return rankKind + '|' + (rankKind === 'level' ? rankCls : ''); }

async function rankLoad(force) {
    if (!isCloudConfigured() || !cloudLoggedIn() || rankLoading) return;
    const key = rankKey(), hit = rankData[key];
    if (!force && hit && Date.now() - hit.at < RANK_CACHE_MS) return;
    rankLoading = true; rankErr = '';
    rankRender();
    try {
        const r = await cloudTimeout(cloudSb.rpc('dragon_leaderboard', { p_kind: rankKind, p_cls: rankKind === 'level' ? rankCls || null : null, p_limit: RANK_TOP }));
        if (r.error) throw r.error;
        rankData[key] = { rows: r.data || [], at: Date.now() };
    } catch (e) { rankErr = cloudErrText(e); }
    rankLoading = false;
    rankRender();
}

function rankRender() { if (typeof currentTab !== 'undefined' && tabOpen('rank') && player && !SIM_MODE) renderPanel(); }
function rankSetKind(k) { rankKind = k; rankLoad(); rankRender(); }
function rankSetCls(c) { rankCls = c; rankLoad(); rankRender(); }

function rankMedal(n) { return n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : n; }

function renderRank() {
    if (!isCloudConfigured()) return `<div class="panel notice">排行榜需要雲端伺服器，目前尚未開通。</div>`;
    if (!cloudLoggedIn()) return `<div class="panel notice">登入帳號後角色會自動上傳，就能上排行榜。
        <div class="btn-row"><button onclick="cloudLoginFromGame()">☁️ 回標題畫面登入</button></div></div>`;
    const kind = RANK_KINDS.find(k => k.id === rankKind) || RANK_KINDS[0];
    const hit = rankData[rankKey()];
    if (!hit && !rankLoading && !rankErr) setTimeout(rankLoad, 0);
    const chips = `<div class="chips">${RANK_KINDS.map(k => `<button class="chip-btn ${k.id === rankKind ? 'active' : ''}" onclick="rankSetKind('${k.id}')">${k.name}</button>`).join('')}</div>`;
    const clsSel = rankKind === 'level' ? `<label class="set-row"><span>職業</span><select onchange="rankSetCls(this.value)">
        <option value="">全部職業</option>${Object.keys(CLASSES).map(c => `<option value="${c}" ${rankCls === c ? 'selected' : ''}>${CLASSES[c].name}</option>`).join('')}</select></label>` : '';
    let body;
    if (rankErr) body = `<p class="bad">讀取失敗：${esc(rankErr)}</p>`;
    else if (!hit) body = '<p class="muted">讀取中…</p>';
    else if (!hit.rows.length) body = '<p class="muted">還沒有人上榜。</p>';
    else {
        const top = hit.rows.filter(r => r.rk <= RANK_TOP), mine = hit.rows.filter(r => r.is_me && r.rk > RANK_TOP);
        const row = r => {
            const c = CLASSES[r.cls] || {};
            const who = rankKind === 'clan' ? `<b>${esc(r.name)}</b><small>${r.lv} 人</small>`
                : `<b>${c.icon || ''} ${esc(r.name)}</b><small>${c.name || ''} Lv.${r.lv}${r.clan ? '｜' + esc(r.clan) : ''}</small>`;
            return `<div class="list-row rank-row ${r.is_me ? 'rank-me' : ''}"><span class="rank-no">${rankMedal(Number(r.rk))}</span><div>${who}</div><span class="rank-val">${kind.fmtVal(Number(r.val))}</span></div>`;
        };
        body = `<div class="list">${top.map(row).join('')}</div>` + (mine.length ? `<h4>你的角色</h4><div class="list">${mine.map(row).join('')}</div>` : '');
    }
    const ago = hit ? Math.max(0, Math.round((Date.now() - hit.at) / 1000)) : 0;
    return `<div class="panel">${chips}${clsSel}
        <div class="row-between"><small class="muted">${kind.col}排名・前 ${RANK_TOP} 名${hit ? `・${ago < 5 ? '剛剛' : ago + ' 秒前'}更新` : ''}</small>
        <button class="mini secondary" onclick="rankLoad(true)" ${rankLoading ? 'disabled' : ''}>🔄 重新整理</button></div>
        ${body}
        <small class="muted">名次依雲端存檔計算（約每分鐘上傳一次），被停權的帳號不會上榜。屠龍榜計團隊副本與單人龍穴的討伐次數；永夜之塔以擊敗的守關首領樓層計。</small></div>`;
}

TABS.rank = ['🏆', '排行榜'];
PANEL_FNS.rank = renderRank;
