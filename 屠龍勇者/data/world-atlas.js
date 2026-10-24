// 獨立繪製的世界總覽。地標可直接傳送，沿用區域費用與龍穴限制，亦保留實際步行。
const ATLAS_POINTS = SCENE_WORLD_TILES.filter((r, i, a) => a.findIndex(q => q.zone === r.zone) === i).map(r => ({
    id: r.zone, kind: 'zone', x: (r.x + 0.5) / 188 * 100, y: (r.y + 0.5) / 149 * 100, target: r.start,
})).concat([
    { id: 'talking', kind: 'town', x: 9, y: 55 }, { id: 'gludio', kind: 'town', x: 35, y: 55 },
    { id: 'giran', kind: 'town', x: 54, y: 45 }, { id: 'aden', kind: 'town', x: 84, y: 20 },
    { id: 'tower', kind: 'zone', x: 7, y: 23, target: [18, 18] }, { id: 'ivory', kind: 'zone', x: 64, y: 95, target: [110, 126] },
    { id: 'venomNest', kind: 'zone', x: 164.5 / 188 * 100, y: 125.5 / 149 * 100, target: [164, 127], entrance: true, art: 'images/maps/rework/venom-entrance-v1.png' },
    { id: 'lairAntharas', kind: 'zone', x: 66, y: 72 }, { id: 'lairFafurion', kind: 'zone', x: 7, y: 44 },
    { id: 'lairLindvior', kind: 'zone', x: 86, y: 6 }, { id: 'lairValakas', kind: 'zone', x: 94, y: 44 },
]);
let atlasSelected = null, atlasScale = 1, atlasStamp = '';
function atlasPointName(p) {
    const def = p.kind === 'town' ? TOWNS[p.id] : ZONE_BY_ID[p.id];
    return def ? def.name : p.id;
}
function ensureWorldAtlas() {
    if ($('world-atlas')) return;
    const root = document.createElement('div'); root.id = 'world-atlas'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', '黑暗大陸世界地圖');
    root.innerHTML = `<section class="atlas-shell"><header><div><small>黑暗大陸 · 大陸誌</small><h2>世界地圖</h2></div><nav><button onclick="atlasZoom(-1)" aria-label="縮小地圖">−</button><button onclick="atlasZoom(1)" aria-label="放大地圖">＋</button><button onclick="atlasZoom(0)">全圖</button><button onclick="closeWorldAtlas()" aria-label="關閉世界地圖">✕</button></nav></header><div class="atlas-layout"><div class="atlas-scroll"><div class="atlas-paper"><img src="${SCENE_ART_ROOT}world-atlas.jpg?v=${GAME_VERSION}" alt="原創大陸地形圖：森林、海岸、雪原與荒漠"><div class="atlas-points"></div><span class="atlas-player" title="你的位置"></span><span class="atlas-compass">北<br>✦<br>南</span></div></div><aside><label for="atlas-location">目的地</label><select id="atlas-location" aria-label="選擇地圖位置"></select><div id="atlas-detail"></div><p class="atlas-legend"><i>◆</i> 城鎮　<span>●</span> 狩獵區<br>◇ 塔與龍穴　<span class="atlas-dot">●</span> 所在位置</p><p class="atlas-help">可拖動捲動條查看地圖，使用 ＋／− 放大縮小。<br>M 開關地圖 · Esc 關閉</p></aside></div><footer>山脈、海灣、古道與遺跡 · 點選地名傳送前往</footer></section>`;
    document.body.appendChild(root);
    root.querySelector('.atlas-points').innerHTML = ATLAS_POINTS.filter(p => p.art).map(p => `<img class="atlas-landmark" src="${p.art}" alt="" style="left:${p.x}%;top:${p.y}%">`).join('') + ATLAS_POINTS.map((p, i) => `<button class="atlas-pin ${p.kind}${p.target ? '' : ' remote'}" style="left:${p.x}%;top:${p.y}%" data-point="${i}" aria-label="${atlasPointName(p)}" onclick="atlasTravel(${i})"><b>${p.kind === 'town' ? '◆' : p.entrance || p.id === 'tower' || p.id === 'ivory' || !p.target ? '◇' : '●'}</b><span>${atlasPointName(p)}</span></button>`).join('');
    const list = $('atlas-location');
    list.innerHTML = ATLAS_POINTS.map((p, i) => `<option value="${i}">${p.kind === 'town' ? '城鎮 · ' : ''}${atlasPointName(p)}</option>`).join('');
    list.addEventListener('change', () => atlasSelect(Number(list.value)));
    root.addEventListener('click', e => { if (e.target === root) closeWorldAtlas(); });
    root.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeWorldAtlas(); } });
}
function openWorldAtlas() {
    if (!scene || !player || walkHome) return;
    ensureWorldAtlas(); scene.worldOpen = true; sceneKeys.length = 0; $('world-atlas').hidden = false;
    atlasScale = 1; atlasZoom(0);
    const i = ATLAS_POINTS.findIndex(p => p.id === player.loc.id && p.kind === player.loc.type);
    atlasSelect(i >= 0 ? i : 0); atlasStamp = ''; syncWorldAtlas();
    $('world-atlas').querySelector('nav button:last-child').focus({ preventScroll: true });
}
function closeWorldAtlas() {
    if (typeof scene !== 'undefined' && scene) scene.worldOpen = false;
    const el = $('world-atlas'); if (el) el.hidden = true;
}
function toggleWorldAtlas() { if (scene && scene.worldOpen) closeWorldAtlas(); else openWorldAtlas(); }
function atlasZoom(step) {
    const root = $('world-atlas'); if (!root) return;
    atlasScale = step === 0 ? 1 : clamp(atlasScale + step * 0.35, 1, 2.75);
    const paper = root.querySelector('.atlas-paper'), view = root.querySelector('.atlas-scroll');
    const fitWidth = Math.min(view.clientWidth, view.clientHeight * 188 / 149);
    paper.style.width = Math.floor(fitWidth * atlasScale) + 'px';
    root.classList.toggle('atlas-fit', atlasScale === 1 && step <= 0);
}
function atlasSelect(index) {
    const p = ATLAS_POINTS[index]; if (!p) return;
    atlasSelected = index; $('atlas-location').value = String(index);
    const root = $('world-atlas');
    root.querySelectorAll('.atlas-pin').forEach((el, i) => el.classList.toggle('selected', i === index));
    const z = p.kind === 'zone' && ZONE_BY_ID[p.id], here = player.loc.type === p.kind && player.loc.id === p.id;
    const walk = p.target && scene && scene.bg && scene.bg.big;
    const sub = p.kind === 'town' ? '安全城鎮' : z && z.lv ? `建議 Lv.${z.lv[0]}～${z.lv[1]}` : '副本入口';
    const fee = atlasTravelFee(p), why = z ? zoneBlockReason(z) : '';
    const hint = `傳送費 💰${fmt(fee)}。${p.kind === 'town' ? '依目前城鎮或所在地的回城村莊計算城鎮級差。' : z.type === 'tower' ? '直接傳送至 1F，其他樓層仍依原解鎖規則。' : '直接傳送抵達，進入限制維持原設定。'}${why ? ' ' + why : ''}`;
    $('atlas-detail').innerHTML = `<small>${here ? '目前所在地' : p.kind === 'town' ? '城鎮' : '探索地點'}</small><h3>${atlasPointName(p)}</h3><strong>${sub}</strong><p>${hint}</p><button class="atlas-go" onclick="atlasTravel(${index})" ${here || why ? 'disabled' : ''}>${here ? '目前所在地' : '傳送前往'}</button>${walk ? `<button class="atlas-go secondary" onclick="atlasWalkTo(${index})">步行${p.entrance || p.id === 'tower' || p.id === 'ivory' ? '至入口' : '前往'}</button>` : ''}`;
}
function atlasTravelFee(p) {
    if (p.kind === 'zone') return ZONE_BY_ID[p.id].fee;
    const from = inTown() ? player.loc.id : currentZone().town;
    return TOWN_TRAVEL_FEE * Math.abs(TOWNS[p.id].tier - TOWNS[from].tier);
}
function atlasTravel(index) {
    const p = ATLAS_POINTS[index];
    if (!p || !player || !scene || walkHome || player.hp <= 0) return;
    atlasSelect(index);
    if (player.loc.type === p.kind && player.loc.id === p.id) { showToast('已經在這個地點'); return; }
    const z = p.kind === 'zone' && ZONE_BY_ID[p.id], why = z && zoneBlockReason(z), fee = atlasTravelFee(p);
    if (why) { showToast(why); return; }
    if (player.gold < fee) { showToast(`金幣不足（傳送費 ${fmt(fee)}）`); return; }
    const owner = player, origin = JSON.stringify(player.loc), run = player.mapRun;
    closeWorldAtlas();
    gameConfirm('世界地圖傳送', `傳送到${atlasPointName(p)}，費用 ${fmt(fee)} 金幣。${run ? '\n離開會關閉目前異界地圖，地圖排程將暫停。' : ''}`, () => {
        if (player !== owner || JSON.stringify(player.loc) !== origin || player.mapRun !== run || walkHome || player.hp <= 0) { showToast('角色或所在地已變更，請重新選擇目的地'); return; }
        const blocked = z && zoneBlockReason(z);
        if (blocked) { showToast(blocked); return; }
        if (player.gold < fee) { showToast(`金幣不足（傳送費 ${fmt(fee)}）`); return; }
        stopHunt();
        endMapRun('世界地圖傳送離開異界');
        player.gold -= fee;
        player.loc = { type: p.kind, id: p.id };
        if (z && z.type === 'tower') player.loc.floor = 1;
        scene = null; sceneSpawnAt = null; session = null;
        openTabs = []; currentTab = 'hunt';
        addLog(`🌀 世界地圖傳送到${atlasPointName(p)}`, 'sys');
        saveGame(); renderTabs(); refreshUI();
    }, '傳送前往');
}
function atlasWalkTo(index) {
    const p = ATLAS_POINTS[index];
    if (!p || !p.target || !scene || !scene.bg || !scene.bg.big || walkHome) return;
    sceneWalkNear(p.target[0], p.target[1]); closeWorldAtlas();
}
function syncWorldAtlas() {
    if (!scene || !scene.worldOpen) return;
    const root = $('world-atlas'); if (!root || root.hidden) { openWorldAtlas(); return; }
    const stamp = [player.loc.type, player.loc.id, scene.pl.x, scene.pl.y].join(':'); if (stamp === atlasStamp) return;
    atlasStamp = stamp;
    const dot = root.querySelector('.atlas-player'), p = ATLAS_POINTS.find(q => q.id === player.loc.id && q.kind === player.loc.type);
    dot.style.left = (scene.bg && scene.bg.big ? (scene.pl.rx + 0.5) / scene.mw * 100 : p ? p.x : 50) + '%';
    dot.style.top = (scene.bg && scene.bg.big ? (scene.pl.ry + 0.5) / scene.mh * 100 : p ? p.y : 50) + '%';
    root.querySelectorAll('.atlas-pin').forEach((el, i) => el.classList.toggle('here', ATLAS_POINTS[i] === p));
}
