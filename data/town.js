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
    rollTownFigures(scene);
    applyTownView(true);
}

function closeTownScene() {
    clearTimeout(townFigureTimer);
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

// 有 chance／schedule 的人偶：每次進城判斷一次這次在不在（以 id 為準，橫圖與直式圖同一個 id 結果相同，轉向不會忽隱忽現）
//   chance：機率；schedule：定時出現（town-npc.js 的 isScheduledFigureHere，例：牧塵每 2 天出現一次、停留 30 分鐘）
//   有 schedule 的人偶在場景開著時到點會自己離開（townFigureTimer 重判一次）
let townFigureShown = {};
let townFigureTimer = null;
function rollTownFigures(scene) {
    townFigureShown = {};
    clearTimeout(townFigureTimer);
    let leaveIn = Infinity;
    [...(scene.figures || []), ...((scene.portrait && scene.portrait.figures) || [])].forEach(f => {
        if (f.id in townFigureShown) return;
        if (f.schedule) {
            townFigureShown[f.id] = isScheduledFigureHere(f);
            if (townFigureShown[f.id]) leaveIn = Math.min(leaveIn, getScheduledFigureLeftMs(f));
        } else if (f.chance != null) townFigureShown[f.id] = Math.random() < f.chance;
    });
    if (leaveIn < Infinity) {
        const name = currentTownScene;
        townFigureTimer = setTimeout(() => {
            if (currentTownScene !== name) return;
            rollTownFigures(scene);
            if (currentTownView) renderTownHotspots(currentTownView);
        }, leaveIn + 500);
    }
}

function renderTownHotspots(view) {
    const layer = document.getElementById('town-scene-hotspots');
    const pct = (v, total) => (v / total * 100).toFixed(3) + '%';
    // 人偶（figures）畫在傳送點底下；有 action 的才可點；有 chance 的看這次進城擲的結果；隨機躲在角落的 NPC（town-npc.js）一起畫，cls 加額外樣式
    const figures = (view.figures || []).filter(f => f.enabled !== false && ((f.chance == null && !f.schedule) || townFigureShown[f.id])).concat(getTownNpcFigures(currentTownScene, view)).map(f => {
        const [x, y, w, hh] = f.rect;
        const cls = 'town-figure' + (f.action ? ' clickable' : '') + (f.cls ? ' ' + f.cls : '');
        const click = (f.action ? `onclick="${f.action}" ` : '') + `class="${cls}"`;
        return `<img ${click} src="${f.img}" alt="${f.name || ''}" title="${f.name || ''}"
                    style="left: ${pct(x, view.imgW)}; top: ${pct(y, view.imgH)}; width: ${pct(w, view.imgW)}; height: ${pct(hh, view.imgH)};">`;
    }).join('');
    // 場景異象（effects，例：人界地圖飛升點上方雷電交加）：畫在最底層、不擋點擊
    const effects = (view.effects || []).map(e => TOWN_SCENE_FX[e.fx] ? TOWN_SCENE_FX[e.fx](view, e.at, e) : '').join('');
    layer.innerHTML = effects + figures + (view.hotspots || []).filter(h => h.enabled !== false).map(h => {
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

// 場景異象（config-towns.js 的 effects：{ fx, at: [圖上 x, y] }）：回傳疊在場景上的 HTML，位置一律換成圖上百分比
const TOWN_SCENE_FX = {
    // 雷電交加（2026-10-02 使用者：「外面的世界地圖能做點異相嗎，比如該地圖上方雷電交加」）：
    //   at＝被劈的點（飛升點三角標記）；正上方一團旋轉烏雲，三道閃電週期不同（看起來不規則）劈下來，打雷時烏雲內部跟著亮、落點閃光
    thunderStorm(view, [x, y]) {
        const W = view.imgW, H = view.imgH;
        const box = (l, t, w, h) => `left: ${(l / W * 100).toFixed(3)}%; top: ${(t / H * 100).toFixed(3)}%; width: ${(w / W * 100).toFixed(3)}%; height: ${(h / H * 100).toFixed(3)}%;`;
        const cloudY = y - 95, boltTop = cloudY + 22, boltH = y - boltTop;
        // 閃電：viewBox 寬 120、高 100，中間那道劈到落點（x 60、y 100）
        const bolts = [
            { d: 'M58 0 L49 22 L62 27 L50 52 L61 56 L52 78 L60 100', branch: 'M50 52 L38 64 L42 70', cls: 'b1' },
            { d: 'M28 0 L35 16 L24 26 L33 44 L22 64', branch: 'M33 44 L42 52', cls: 'b2' },
            { d: 'M96 0 L88 18 L99 27 L86 48 L93 56 L87 70', branch: 'M99 27 L108 36', cls: 'b3' }
        ];
        // 烏雲＝多團雲塊（雲框內的 中心 x%、y%、寬%、高%），各自緩慢起伏
        const puffs = [[50, 52, 70, 80], [28, 58, 44, 62], [72, 58, 44, 62], [40, 40, 40, 56], [62, 38, 42, 58], [14, 66, 28, 40], [86, 66, 28, 40], [50, 70, 60, 46]];
        return `<div class="tfx-storm" aria-hidden="true">
            <div class="tfx-cloud" style="${box(x - 115, cloudY - 50, 230, 100)}">
                ${puffs.map(([cx, cy, w, h], i) => `<i style="left: ${cx}%; top: ${cy}%; width: ${w}%; height: ${h}%; animation-delay: ${(-i * 0.9).toFixed(1)}s"></i>`).join('')}
                <div class="tfx-cloud-swirl"></div><div class="tfx-cloud-glow"></div></div>
            <svg class="tfx-bolts" style="${box(x - 60, boltTop, 120, boltH)}" viewBox="0 0 120 100" preserveAspectRatio="none">
                ${bolts.map(b => `<g class="tfx-bolt ${b.cls}"><path d="${b.d}"/><path d="${b.branch}"/></g>`).join('')}
            </svg>
            <div class="tfx-strike" style="${box(x - 30, y - 18, 60, 36)}"></div>
        </div>`;
    },
    // 漩渦（2026-10-03 使用者：「亂星海也加入漩渦意象」）：at＝漩渦中心、opt.r＝半徑（圖上像素）；整個壓扁成透視橢圓，
    //   深色渦眼＋兩組螺旋浪紋（白色快轉、藍色慢轉）＋反轉的浪花虛線圈＋往外擴散的水紋
    whirlpool(view, [x, y], opt) {
        const W = view.imgW, H = view.imgH, r = (opt && opt.r) || 45;
        const style = `left: ${((x - r) / W * 100).toFixed(3)}%; top: ${((y - r) / H * 100).toFixed(3)}%; width: ${(2 * r / W * 100).toFixed(3)}%; height: ${(2 * r / H * 100).toFixed(3)}%;`;
        // 螺旋臂：r = 5 + 41 × 進度，轉 2.6 圈（viewBox 100、中心 50）
        const arm = (k, n, turns) => {
            const pts = [];
            for (let i = 0; i <= 60; i++) {
                const t = i / 60, a = t * turns * Math.PI * 2 + k * Math.PI * 2 / n, rr = 5 + 41 * t;
                pts.push(`${(50 + rr * Math.cos(a)).toFixed(1)},${(50 + rr * Math.sin(a)).toFixed(1)}`);
            }
            return `<polyline points="${pts.join(' ')}"/>`;
        };
        const grad = (id, color) => `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="50" cy="50" r="47">
            <stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset=".25" stop-color="${color}" stop-opacity=".9"/>
            <stop offset=".7" stop-color="${color}" stop-opacity=".6"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>`;
        // opt.seeThrough：底下的地名要透出來（混色模式，index.html 的 .tfx-wp.see-through）
        // 每一層各自壓扁（.tfx-wp-flat），不包在同一個 transform 容器裡：容器有 transform 會自成一組，裡面的混色模式就混不到底下的地圖
        return `<div class="tfx-wp${opt && opt.seeThrough ? ' see-through' : ''}" style="${style}" aria-hidden="true">
            <div class="tfx-wp-water"></div>
            <i class="tfx-wp-ripple"></i><i class="tfx-wp-ripple r2"></i>
            <div class="tfx-wp-flat"><svg class="tfx-wp-arms slow" viewBox="0 0 100 100">${grad('tfx-wp-b', '#7dd3fc')}<g stroke="url(#tfx-wp-b)">${[0, 1, 2, 3].map(k => arm(k, 4, 1.4)).join('')}</g></svg></div>
            <div class="tfx-wp-flat"><svg class="tfx-wp-arms" viewBox="0 0 100 100">${grad('tfx-wp-w', '#f0f9ff')}<g stroke="url(#tfx-wp-w)">${[0, 1, 2].map(k => arm(k, 3, 2.2)).join('')}</g></svg></div>
            <div class="tfx-wp-flat"><svg class="tfx-wp-foam" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="27"/></svg></div>
            <div class="tfx-wp-eye"></div>
        </div>`;
    }
};

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
// 不是城鎮的入口（config-towns.js 的 CITY_GATES，例：飛升點）用自己的圖、提示、action 與特效（fx）。
let cityGateName = null;
let cityGateBusy = false;   // 飛升演出中，重複點擊不理會
const CITY_GATE_ASCEND_MS = 900;   // 點飛升台後光柱爆亮多久才進靈界（index.html 的 #city-gate.ascend）
function openCityGate(name) {
    const gate = CITY_GATES[name];
    const item = gate ? null : maps[0].items.find(it => it.name === name);
    if (!gate && !item) return;
    cityGateName = name;
    cityGateBusy = false;
    const img = gate ? gate.img : (getMapThumb(item) || '');
    document.getElementById('city-gate-img').src = img;
    document.getElementById('city-gate-img').alt = name;
    document.getElementById('city-gate-bg').style.backgroundImage = img ? `url('${img}')` : '';
    document.getElementById('city-gate-name').innerText = name;
    document.getElementById('city-gate-hint').innerText = (gate && gate.hint) || '✨ 點擊圖片進城';
    document.getElementById('city-gate-fx').innerHTML = gate && CITY_GATE_FX[gate.fx] ? CITY_GATE_FX[gate.fx]() : '';
    const box = document.getElementById('city-gate');
    box.classList.remove('on', 'ascend');
    box.classList.toggle('portrait', !!(gate && gate.imgH > gate.imgW));
    box.style.display = 'block';
    void box.offsetWidth;
    box.classList.add('on');
}
function enterCityGate() {
    if (!cityGateName || cityGateBusy) return;
    const gate = CITY_GATES[cityGateName];
    if (!gate) { goToTownByName(cityGateName); return; }
    if (!gate.fx) { new Function(gate.action)(); return; }
    // 有特效的入口：光柱爆亮、畫面轉白，再執行 action
    cityGateBusy = true;
    document.getElementById('city-gate').classList.add('ascend');
    setTimeout(() => { cityGateBusy = false; if (cityGateName) new Function(gate.action)(); }, CITY_GATE_ASCEND_MS);
}
function closeCityGate() {
    cityGateName = null;
    const box = document.getElementById('city-gate');
    if (box) { box.style.display = 'none'; box.classList.remove('on', 'ascend'); }
    const fx = document.getElementById('city-gate-fx');
    if (fx) fx.innerHTML = '';
}

// 入口圖上的特效（CITY_GATES 的 fx）：座標是圖上的百分比
const CITY_GATE_FX = {
    // 飛升台（600×894）：中央大陣中心約 (330, 505)、寬約 250；五個小陣依圖上位置配五行；光柱從大陣中心往上直衝天頂漩渦
    feisheng() {
        const nodes = [['金', '#facc15', 30, 58.4], ['木', '#4ade80', 47.2, 49.9], ['火', '#f87171', 77, 53], ['水', '#38bdf8', 80.8, 61.1], ['土', '#f59e0b', 67, 66]];
        // 大陣：外圈符紋（虛線）、五行五角星、五個屬性色的頂點
        const pts = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; return [100 + 62 * Math.cos(a), 100 + 62 * Math.sin(a)]; });
        const star = [0, 2, 4, 1, 3].map(i => pts[i].map(v => v.toFixed(1)).join(',')).join(' ');
        const big = `<svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="96" fill="none" stroke="#fbbf24" stroke-width="3.5"/>
            <circle cx="100" cy="100" r="86" fill="none" stroke="#7dd3fc" stroke-width="8" stroke-dasharray="2 6"/>
            <circle cx="100" cy="100" r="62" fill="none" stroke="#e0f2fe" stroke-width="2.5"/>
            <polygon points="${star}" fill="none" stroke="#fcd34d" stroke-width="3.5"/>
            <circle cx="100" cy="100" r="26" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6 4"/>
            ${pts.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${nodes[i][1]}"/>`).join('')}
        </svg>`;
        const ring = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="4"/>
            <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="3 6"/>
            <circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" stroke-width="2" opacity=".7"/></svg>`;   // 中央留空給貼地的屬性字
        const sparks = Array.from({ length: 12 }, (_, i) =>
            `<span style="left: ${(49 + Math.random() * 13).toFixed(1)}%; animation-delay: ${(-i * 0.35).toFixed(2)}s; animation-duration: ${(2.6 + Math.random() * 1.6).toFixed(2)}s"></span>`).join('');
        return `<div class="fs-glow"></div>
            <div class="fs-pillar"><i></i></div>
            <div class="fs-array"><div class="fs-spin">${big}</div></div>
            ${nodes.map(([n, c, x, y], i) => `<div class="fs-node" style="left: ${x}%; top: ${y}%; --c: ${c}; --d: ${(-i * 0.5).toFixed(1)}s">
                <div class="fs-node-ring"><div class="fs-spin">${ring}</div></div><b class="fs-node-glyph">${n}</b><i class="fs-node-beam"></i></div>`).join('')}
            <div class="fs-sparks">${sparks}</div>
            <div class="fs-flash"></div>`;
    }
};

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
