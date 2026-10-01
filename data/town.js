// 城內場景（第二頁面）：全螢幕城內畫面與傳送點；資料在 config-towns.js（ARCHITECTURE.md 第 20 節）
// 版面：場景圖高度填滿畫面、寬度依比例延伸；比畫面寬時可左右滑動，比畫面窄時改以寬度填滿、可上下捲動。
//       畫面直向且該城有 portrait（直式圖）時改用直式圖，手機上剛好滿版。
//       傳送點以「圖上像素」換算成 %，任何尺寸都對得準；橫圖與直式圖各有一組傳送點。

let currentTownScene = null;   // 目前開著的城鎮名稱（null = 沒開）
let currentTownView = null;    // 目前使用的圖（橫圖設定本身，或其 portrait）

function hasTownScene(name) {
    return !!townScenes[name];
}

// 依畫面方向選圖：直向（寬 < 高）且有直式圖 → portrait，否則橫圖
function pickTownView(scene) {
    return scene.portrait && window.innerWidth < window.innerHeight ? scene.portrait : scene;
}

function openTownScene(name) {
    const scene = townScenes[name];
    if (!scene) return;
    hideWorldRegionNow();   // 從人界地圖進城：分區效果與城池圖畫面先收掉
    closeCityGate();
    currentTownScene = name;
    currentTownView = null;   // 強制 applyTownView 重新套用
    document.getElementById('town-scene-title').innerText = scene.title;
    // 場景右上角的額外按鈕（config-towns.js 的 extraButton，例：人界地圖的「地圖列表」）
    const extra = document.getElementById('town-scene-extra');
    if (extra) {
        extra.style.display = scene.extraButton ? '' : 'none';
        if (scene.extraButton) { extra.innerText = scene.extraButton.label; extra.setAttribute('onclick', scene.extraButton.action); }
    }
    document.getElementById('town-scene').style.display = 'block';
    rollTownNpcs(name);   // 隱藏 NPC：這次進城有沒有躲在角落（town-npc.js）
    applyTownView(true);
}

function closeTownScene() {
    hideWorldRegionNow();
    closeCityGate();
    currentTownScene = null;
    currentTownView = null;
    document.getElementById('town-scene').style.display = 'none';
}

// 換圖（第一次開啟或轉向時）＋重排；recenter = 視角置中
function applyTownView(recenter) {
    const scene = townScenes[currentTownScene];
    if (!scene) return;
    const view = pickTownView(scene);
    if (view !== currentTownView) {
        currentTownView = view;
        const img = document.getElementById('town-scene-img');
        if (img.getAttribute('src') !== view.img) img.setAttribute('src', view.img);
        renderTownHotspots(view);
        recenter = true;
    }
    layoutTownScene(recenter);
}

function renderTownHotspots(view) {
    const layer = document.getElementById('town-scene-hotspots');
    const pct = (v, total) => (v / total * 100).toFixed(3) + '%';
    // 人偶（figures）畫在傳送點底下；有 action 的才可點；隨機躲在角落的 NPC（town-npc.js）一起畫，cls 加額外樣式
    const figures = (view.figures || []).filter(f => f.enabled !== false).concat(getTownNpcFigures(currentTownScene, view)).map(f => {
        const [x, y, w, hh] = f.rect;
        const cls = 'town-figure' + (f.action ? ' clickable' : '') + (f.cls ? ' ' + f.cls : '');
        const click = (f.action ? `onclick="${f.action}" ` : '') + `class="${cls}"`;
        return `<img ${click} src="${f.img}" alt="${f.name || ''}" title="${f.name || ''}"
                    style="left: ${pct(x, view.imgW)}; top: ${pct(y, view.imgH)}; width: ${pct(w, view.imgW)}; height: ${pct(hh, view.imgH)};">`;
    }).join('');
    layer.innerHTML = figures + (view.hotspots || []).filter(h => h.enabled !== false).map(h => {
        const [x, y, w, hh] = h.rect;
        // pin：小紅點樣式（人界地圖用）＝ rect 正中央一顆會呼吸發光的紅點，不顯示名稱（label 只當 title／aria-label）
        // showLabel：紅點下方加小字（靈界地圖：圖上沒有這些地名）
        // mapName：這個紅點傳送到哪張地圖；還進不去時紅點變灰、小字後面加「🔒境界」（map.js 的 getMapLockShort；每次開地圖重算）
        const lock = h.mapName && typeof getMapLockShort === 'function' ? getMapLockShort(h.mapName) : '';
        const inner = h.pin ? `<span class="town-dot"></span>${h.showLabel ? `<span class="town-dot-label">${h.label}${lock ? ` <small>${lock}</small>` : ''}</span>` : ''}` : `<span class="town-plaque">${h.label}</span>`;
        return `<button class="town-hotspot${h.pin ? ' pin' : ''}${lock ? ' locked' : ''}" style="left: ${pct(x, view.imgW)}; top: ${pct(y, view.imgH)}; width: ${pct(w, view.imgW)}; height: ${pct(hh, view.imgH)};"
                    onclick="${h.action}" aria-label="${h.label}"${h.pin ? ` title="${h.label}"` : ''}>${inner}</button>`;
    }).join('');
}

// 依視窗大小設定舞台尺寸
function layoutTownScene(recenter) {
    const v = currentTownView;
    if (!v) return;
    const box = document.getElementById('town-scene-view');
    const stage = document.getElementById('town-scene-stage');
    const vw = box.clientWidth, vh = box.clientHeight;
    const ratio = v.imgW / v.imgH;
    let h = vh, w = vh * ratio;
    if (w < vw) { w = vw; h = vw / ratio; }
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    if (recenter) {
        box.scrollLeft = (w - vw) / 2;
        box.scrollTop = (h - vh) / 2;
    }
    const hint = document.getElementById('town-scene-hint');
    hint.innerText = '↔ 左右滑動瀏覽';
    hint.style.display = w > vw + 4 ? '' : 'none';
}

window.addEventListener('resize', () => { if (currentTownScene) applyTownView(false); });

// ---- 人界地圖的分區點擊效果（config-towns.js 的 worldRegions）----
// 2026-09-30 使用者要求：點天南地區紅點 → 「不要彈出新視窗，就原畫面一個點擊效果」，範圍（shape）由使用者畫出。
// 做法：#town-scene-stage 裡疊一層同一張人界地圖（#world-region-lift-img），以 clip-path 只留下分區多邊形；
//       外層 #world-region-lift 做浮起（以分區中心微放大、上移、金色光邊＋陰影；filter 放外層才不會被 clip-path 裁掉），
//       #world-region-dim 讓其他地方變暗。WORLD_REGION_MS 後執行分區的 action（進城），進城／離開時 hideWorldRegionNow 收掉。
let worldRegionKey = null;      // 正在播效果的分區（null = 沒有）
let worldRegionTimer = null;
const WORLD_REGION_MS = 750;    // 浮起後停留多久才執行 action（浮起動畫本身 0.35 秒，index.html 的 #world-region-lift）

function openWorldRegion(key) {
    const reg = worldRegions[key], scene = townScenes[currentTownScene];
    if (!reg || !scene || worldRegionKey) return;   // 效果播放中重複點擊不理會
    worldRegionKey = key;
    const W = scene.imgW, H = scene.imgH;
    const lift = document.getElementById('world-region-lift'), img = document.getElementById('world-region-lift-img'), dim = document.getElementById('world-region-dim');
    img.style.backgroundImage = `url('${scene.img}')`;
    img.style.clipPath = `polygon(${reg.shape.map(([x, y]) => `${(x / W * 100).toFixed(3)}% ${(y / H * 100).toFixed(3)}%`).join(', ')})`;
    // 以分區外框中心放大，看起來是那一塊原地浮起
    const xs = reg.shape.map(p => p[0]), ys = reg.shape.map(p => p[1]);
    lift.style.transformOrigin = `${((Math.min(...xs) + Math.max(...xs)) / 2 / W * 100).toFixed(2)}% ${((Math.min(...ys) + Math.max(...ys)) / 2 / H * 100).toFixed(2)}%`;
    lift.classList.remove('on'); dim.classList.remove('on');
    lift.style.display = dim.style.display = 'block';
    void lift.offsetWidth;                               // 強制套用起點，下一步才有動畫
    lift.classList.add('on'); dim.classList.add('on');
    clearTimeout(worldRegionTimer);
    worldRegionTimer = setTimeout(() => {
        try { new Function(reg.action)(); } finally { if (worldRegionKey === key) hideWorldRegionNow(); }   // action 沒有換畫面（例：傳送被擋）也要收掉效果
    }, WORLD_REGION_MS);
}
// ---- 城池圖畫面（2026-09-30 使用者指定「紅點 → 天南城圖 → 點了進市集」）----
// 人界地圖分區浮起後開啟：全螢幕顯示該城的圖（修仙地圖城鎮卡片的縮圖，map.js 的 getMapThumb，天南城依性別），點圖才傳送並開城內場景（goToTownByName）；
// 「↩ 返回人界」回到人界地圖。疊在 #town-scene 裡（人界地圖還在底下），進城時 openTownScene 會收掉。
let cityGateName = null;
function openCityGate(name) {
    const item = maps[0].items.find(it => it.name === name);
    if (!item) return;
    cityGateName = name;
    const img = getMapThumb(item) || '';
    document.getElementById('city-gate-img').src = img;
    document.getElementById('city-gate-img').alt = name;
    document.getElementById('city-gate-bg').style.backgroundImage = img ? `url('${img}')` : '';
    document.getElementById('city-gate-name').innerText = name;
    const box = document.getElementById('city-gate');
    box.classList.remove('on');
    box.style.display = 'block';
    void box.offsetWidth;
    box.classList.add('on');
}
function enterCityGate() { if (cityGateName) goToTownByName(cityGateName); }
function closeCityGate() {
    cityGateName = null;
    const box = document.getElementById('city-gate');
    if (box) { box.style.display = 'none'; box.classList.remove('on'); }
}

// 收掉效果（進城、離開人界地圖時）
function hideWorldRegionNow() {
    clearTimeout(worldRegionTimer);
    worldRegionKey = null;
    ['world-region-lift', 'world-region-dim'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('on'); el.style.display = 'none'; }
    });
}

// 電腦版瀏覽：滑鼠滾輪改成左右平移（畫面只有左右可捲時）、按住拖曳平移；手機直接用手指滑動（瀏覽器原生捲動）
(function initTownScenePan() {
    const view = document.getElementById('town-scene-view');
    if (!view) return;
    view.addEventListener('wheel', e => {
        const canX = view.scrollWidth > view.clientWidth, canY = view.scrollHeight > view.clientHeight;
        if (canX && !canY && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { view.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
    let drag = null;
    view.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, left: view.scrollLeft, top: view.scrollTop, moved: false };
    });
    window.addEventListener('mousemove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 10) return;   // 小於 10px 視為點擊，不拖曳（原 6px，點紅點時手一抖就被當成拖曳而不觸發）
        drag.moved = true;
        view.scrollLeft = drag.left - dx;
        view.scrollTop = drag.top - dy;
        view.style.cursor = 'grabbing';
    });
    let suppressClick = false;
    window.addEventListener('mouseup', () => {
        if (!drag) return;
        view.style.cursor = '';
        suppressClick = drag.moved;          // 拖曳後放開，不要觸發傳送點
        drag = null;
        setTimeout(() => { suppressClick = false; }, 0);
    });
    view.addEventListener('click', e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

    // 座標工具：網址加 ?townedit=1，點城內畫面任一處會顯示「圖上像素座標」（目前是橫圖或直式圖會一併標示），用來設定傳送點 rect
    if (/[?&]townedit=1/.test(location.search)) {
        view.addEventListener('click', e => {
            const v = currentTownView;
            if (!v || suppressClick) return;
            const r = document.getElementById('town-scene-stage').getBoundingClientRect();
            const x = Math.round((e.clientX - r.left) / r.width * v.imgW);
            const y = Math.round((e.clientY - r.top) / r.height * v.imgH);
            const which = v === townScenes[currentTownScene] ? '橫圖' : '直式圖';
            const hint = document.getElementById('town-scene-hint');
            hint.style.display = '';
            hint.innerText = `📍 ${which}座標 (${x}, ${y})`;
            console.log(`[townedit] ${currentTownScene} ${which} (${x}, ${y})`);
        });
    }
})();
