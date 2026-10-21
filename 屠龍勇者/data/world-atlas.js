// 獨立繪製的世界總覽。地標只負責資訊與實際步行，不繞過傳送費用／副本入口。
const ATLAS_POINTS = SCENE_WORLD_TILES.filter((r, i, a) => a.findIndex(q => q.zone === r.zone) === i).map(r => ({
    id: r.zone, kind: 'zone', x: (r.x + 0.5) / 188 * 100, y: (r.y + 0.5) / 149 * 100, target: r.start,
})).concat([
    { id: 'talking', kind: 'town', x: 9, y: 55 }, { id: 'gludio', kind: 'town', x: 35, y: 55 },
    { id: 'giran', kind: 'town', x: 54, y: 45 }, { id: 'aden', kind: 'town', x: 84, y: 20 },
    { id: 'tower', kind: 'zone', x: 7, y: 23, target: [18, 18] }, { id: 'ivory', kind: 'zone', x: 64, y: 95, target: [110, 126] },
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
    root.innerHTML = `<section class="atlas-shell"><header><div><small>黑暗大陸 · 大陸誌</small><h2>世界地圖</h2></div><nav><button onclick="atlasZoom(-1)" aria-label="縮小地圖">−</button><button onclick="atlasZoom(1)" aria-label="放大地圖">＋</button><button onclick="atlasZoom(0)">全圖</button><button onclick="closeWorldAtlas()" aria-label="關閉世界地圖">✕</button></nav></header><div class="atlas-layout"><div class="atlas-scroll"><div class="atlas-paper"><img src="${SCENE_ART_ROOT}world-atlas.jpg?v=${GAME_VERSION}" alt="原創大陸地形圖：森林、海岸、雪原與荒漠"><div class="atlas-points"></div><span class="atlas-player" title="你的位置"></span><span class="atlas-compass">北<br>✦<br>南</span></div></div><aside><label for="atlas-location">目的地</label><select id="atlas-location" aria-label="選擇地圖位置"></select><div id="atlas-detail"></div><p class="atlas-legend"><i>◆</i> 城鎮　<span>●</span> 狩獵區<br>◇ 塔與龍穴　<span class="atlas-dot">●</span> 所在位置</p><p class="atlas-help">可拖動捲動條查看地圖，使用 ＋／− 放大縮小。<br>M 開關地圖 · Esc 關閉</p></aside></div><footer>山脈、海灣、古道與遺跡 · 點選地標查看詳情</footer></section>`;
    document.body.appendChild(root);
    root.querySelector('.atlas-points').innerHTML = ATLAS_POINTS.map((p, i) => `<button class="atlas-pin ${p.kind}${p.target ? '' : ' remote'}" style="left:${p.x}%;top:${p.y}%" data-point="${i}" aria-label="${atlasPointName(p)}" onclick="atlasSelect(${i})"><b>${p.kind === 'town' ? '◆' : p.target && p.id !== 'tower' && p.id !== 'ivory' ? '●' : '◇'}</b><span>${atlasPointName(p)}</span></button>`).join('');
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
    const hint = p.kind === 'town' ? '請透過傳送師前往城鎮。' : p.id === 'tower' || p.id === 'ivory' ? '步行到野外傳送師後，交談進入塔內。' : p.target ? '沿道路步行前往；路上會穿越其他狩獵區。' : '請由地圖面板／對應入口進入，條件與費用維持原設定。';
    $('atlas-detail').innerHTML = `<small>${here ? '目前所在地' : p.kind === 'town' ? '城鎮' : '探索地點'}</small><h3>${atlasPointName(p)}</h3><strong>${sub}</strong><p>${hint}</p>${walk ? `<button class="atlas-go" onclick="atlasWalkTo(${index})">步行${p.id === 'tower' || p.id === 'ivory' ? '至入口' : '前往'}</button>` : '<p class="atlas-note">目前所在場景無法直接步行至此。</p>'}`;
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
    dot.style.left = (scene.bg.big ? (scene.pl.rx + 0.5) / scene.mw * 100 : p ? p.x : 50) + '%';
    dot.style.top = (scene.bg.big ? (scene.pl.ry + 0.5) / scene.mh * 100 : p ? p.y : 50) + '%';
    root.querySelectorAll('.atlas-pin').forEach((el, i) => el.classList.toggle('here', ATLAS_POINTS[i] === p));
}
