// 屠龍勇者：村莊看得到其他在線玩家（ARCHITECTURE.md 第 39 節）
// 依賴 cloud（cloudSb／cloudUser）、raid（raidRoom／raidJoin）、chat（chatOpen／chatDraft）、ui-scene（scene／TILE／spriteImage／drawLabel）。
// 用 Supabase Realtime 的 presence＋broadcast（不用資料表、不用跑 SQL）：每個村莊一個頻道 dragon-town:<村莊id>，
// 自己的狀態（名字、職業、等級、格子位置、方向）用 presence.track 廣播，移動時最多每 0.35 秒更新一次；別人的狀態畫在村莊地圖上。
// 點別人：💬 聊天（世界頻道、輸入框帶 @名字）／👥 邀請組隊（broadcast invite，對方確認後 raidJoin）。野外不連線、看不到別人。

const PRES_MAX = 40;           // 畫面上最多畫幾個其他玩家
const PRES_SEND_MS = 350;      // 位置更新間隔
let presCh = null, presTown = null, presKey = '', presOthers = {}, presLastSent = 0, presLastPos = '', presJoining = false;

function presEnabled() { return isCloudConfigured() && cloudLoggedIn() && !cloudBan && player && !SIM_MODE; }

// 主迴圈每 250ms 呼叫（ui.js renderStatus）：依目前位置加入／離開頻道、送出位置
function presTick() {
    const want = presEnabled() && player.loc.type === 'town' ? player.loc.id : null;
    if (want !== presTown) { presLeave(); if (want) presJoin(want); return; }
    if (!presCh || presJoining || !scene) return;
    const pl = scene.pl, pos = `${pl.x},${pl.y},${pl.dir}`;
    if (pos !== presLastPos && Date.now() - presLastSent >= PRES_SEND_MS) presSend();
}

function presMyState() {
    const pl = scene ? scene.pl : { x: 0, y: 0, dir: 'down' };
    return { n: player.name, c: player.cls, l: player.lv, x: pl.x, y: pl.y, d: pl.dir, cl: (typeof myClan !== 'undefined' && myClan) ? myClan.name : '' };
}

function presSend() {
    if (!presCh) return;
    presLastSent = Date.now();
    presLastPos = scene ? `${scene.pl.x},${scene.pl.y},${scene.pl.dir}` : '';
    presCh.track(presMyState()).catch(() => {});
}

function presJoin(townId) {
    presTown = townId; presOthers = {}; presJoining = true;
    presKey = cloudUser.id + ':' + currentSlot;
    const ch = cloudSb.channel('dragon-town:' + townId, { config: { presence: { key: presKey }, broadcast: { self: false } } });
    presCh = ch;
    ch.on('presence', { event: 'sync' }, () => { if (presCh === ch) presSync(); })
      .on('broadcast', { event: 'invite' }, ({ payload }) => { if (presCh === ch) presOnInvite(payload); })
      .subscribe(st => {
          if (presCh !== ch) return;
          if (st === 'SUBSCRIBED') { presJoining = false; presSend(); }
      });
}

function presLeave() {
    const ch = presCh;
    presCh = null; presTown = null; presOthers = {}; presJoining = false; presLastPos = '';
    if (ch && cloudSb) { ch.untrack().catch(() => {}); cloudSb.removeChannel(ch); }
}

// presence 狀態 → 其他玩家清單（保留插值用的目前位置 rx／ry）
function presSync() {
    const st = presCh.presenceState(), next = {};
    let n = 0;
    for (const key in st) {
        if (key === presKey || key.startsWith(cloudUser.id + ':') || n >= PRES_MAX) continue;
        const s = st[key][st[key].length - 1];
        if (!s || !CLASSES[s.c]) continue;
        const old = presOthers[key];
        next[key] = { key, uid: key.split(':')[0], name: String(s.n || '').slice(0, 20), cls: s.c, lv: s.l | 0, clan: String(s.cl || '').slice(0, 20),
            x: s.x | 0, y: s.y | 0, dir: s.d || 'down', rx: old ? old.rx : s.x | 0, ry: old ? old.ry : s.y | 0, walk: old ? old.walk : 0 };
        n++;
    }
    presOthers = next;
}

// 每幀：位置往目標平滑移動（ui-scene sceneUpdate 呼叫）
function presUpdate(dt) {
    const k = Math.min(1, dt / 180);
    for (const key in presOthers) {
        const o = presOthers[key], moving = Math.abs(o.x - o.rx) + Math.abs(o.y - o.ry) > 0.05;
        o.rx += (o.x - o.rx) * k; o.ry += (o.y - o.ry) * k;
        o.walk = moving ? o.walk + dt : 0;
    }
}

// 畫其他玩家（ui-scene 依 y 排序後呼叫）；名字用綠色，有血盟加在後面
function presDraw(ctx, o, camX, camY, labels) {
    const px = o.rx * TILE - camX + TILE / 2, py = o.ry * TILE - camY + TILE / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(px, py + 12, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    const sp = CLASSES[o.cls].sprite, anim = sp && sp.walk, img = anim && spriteImage(anim.src);
    let labelY = py - 32;
    if (img) {
        const d = o.dir === 'left' ? 'right' : o.dir, row = { down: 0, right: 1, up: 2 }[d] ?? 0, n = anim.frames[d] || 1;
        const frame = o.walk > 0 ? Math.floor(o.walk / anim.ms) % n : Math.floor(n / 2);
        const k = sp.drawH / sp.charH, dw = anim.cellW * k, dh = anim.cellH * k;
        ctx.save();
        if (o.dir === 'left') { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
        ctx.drawImage(img, frame * anim.cellW, row * anim.cellH, anim.cellW, anim.cellH, px - dw / 2, py + 14 - dh, dw, dh);
        ctx.restore();
        labelY = py + 14 - sp.drawH - 6;
    } else {
        ctx.font = '36px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
        ctx.fillText(CLASSES[o.cls].icon, px, py - 6);
    }
    labels.push(() => drawLabel(ctx, `${o.name} Lv.${o.lv}${o.clan ? '［' + o.clan + '］' : ''}`, px, labelY, '#9dffa8'));
}

// 點地圖時找最近的其他玩家（ui-scene sceneClick 呼叫）
function presHit(wx, wy) {
    let best = null, bd = 0.9;
    for (const key in presOthers) {
        const o = presOthers[key], d = Math.hypot(wx / TILE - (o.rx + 0.5), wy / TILE - (o.ry + 0.1));
        if (d < bd) { bd = d; best = o; }
    }
    return best;
}

function presMenu(o) {
    const t = `${CLASSES[o.cls].icon} ${o.name}　Lv.${o.lv} ${CLASSES[o.cls].name}${o.clan ? `<br><small class="muted">血盟：${esc(o.clan)}</small>` : ''}`;
    openDialog('👤 ' + esc(o.name), t, [
        { text: '💬 聊天', onClick: () => presChat(o.name) },
        { text: '👥 邀請組隊', onClick: () => presInvite(o.key) },
        { text: '關閉', cls: 'secondary' },
    ]);
}

function presChat(name) {
    chatDraft = '@' + name + ' ';
    chatOpen('world');
    setTimeout(() => { const el = document.getElementById('chat-input'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 50);
}

// 邀請組隊：要先在團隊副本建立（或加入）隊伍，把房間資訊廣播給對方
function presInvite(key) {
    if (!presCh) return;
    if (!raidRoom) { showToast('先到「🐉 團隊副本」建立隊伍，再邀請別人'); return; }
    if (raidRoom.status !== 'open') { showToast('隊伍已經開打，等這場結束再邀請'); return; }
    const def = RAID_BY_ID[raidRoom.raid];
    presCh.send({ type: 'broadcast', event: 'invite', payload: { to: key, from: player.name, fromLv: player.lv, room: raidRoom.id, code: raidRoom.code, raid: def ? def.name : '' } });
    showToast('已送出組隊邀請');
}

function presOnInvite(p) {
    if (!p || p.to !== presKey || !player) return;
    if (raidRoom && raidRoom.id === p.room) return;
    gameConfirm('👥 組隊邀請', `${p.from}（Lv.${p.fromLv | 0}）邀請你加入團隊副本${p.raid ? `「${p.raid}」` : ''}（房號 ${p.code}）。\n要加入嗎？`, async () => {
        await raidJoin(p.room);
        if (raidRoom && raidRoom.id === p.room) switchTab('raid');
    }, '加入');
}
