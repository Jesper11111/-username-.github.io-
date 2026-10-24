// 黑暗大陸：25 種 BOSS 附魔圖片特效（ARCHITECTURE.md 第 73 節）
// 預覽不改遊戲狀態，正式戰鬥的命中事件由 boss-enchant.js 發送。
// 各圖按需載入並快取；下載失敗時仍使用程序動畫。
const BOSS_VFX_SHEETS = {
    spiderVenom: 'venom-burst-v1',
    treantHeart: 'treant', drakeFang: 'rock-spikes', baphometHorn: 'hell-pillar',
    demonHeart: 'soul-flame', wyvernWing: 'gale-blades', osirisSeal: 'nether-seal',
    frostCrystal: 'ice-shards', ifritFlame: 'inferno-field', forgottenRelic: 'forgotten-mark',
    giantSoul: 'giant-smash', antharasScale: 'earth-dragon', fafurionScale: 'water-dragon',
    lindviorScale: 'wind-dragon', valakasScale: 'fire-dragon', towerBansheeTear: 'banshee',
    towerFlameCore: 'flame-burst', towerLichCrystal: 'death-coils',
    towerFallenFeather: 'fallen-judgment', towerChaosCore: 'chaos-burst', towerAbyssEye: 'abyss',
    towerBullHorn: 'bull', towerIceCrown: 'ice', pirateTreasure: 'ghost',
    towerDeathShard: 'death', towerKingSeal: 'king'
};
const BOSS_VFX_IDS = Object.keys(BOSS_VFX_SHEETS);
const bossVfxImages = {};
function bossVfxSprite(ctx, f, elapsed, camX, camY, tile, layer) {
    const sheet = BOSS_VFX_SHEETS[f.id];
    if (!sheet || (f.id === 'towerKingSeal' && f.phase === 'slash')) return false;
    if (layer !== (f.id === 'towerKingSeal' ? 'behind' : 'front')) return false;
    if (!bossVfxImages[sheet]) {
        bossVfxImages[sheet] = new Image();
        bossVfxImages[sheet].src = 'images/vfx/' + sheet + '.png?v=' + GAME_VERSION;
    }
    const atlas = bossVfxImages[sheet];
    if (!atlas.complete || !atlas.naturalWidth) return false;
    const duration = bossVfxDuration(f), k = elapsed / duration;
    let start = 0, count = 16, progress = k;
    if (f.id === 'towerDeathShard') { start = f.execute ? 8 : 0; count = 8; }
    if (f.id === 'pirateTreasure' || f.id === 'towerChaosCore') {
        start = f.phase === 'impact' ? 4 : 0; count = f.phase === 'impact' ? 12 : 4;
        if (f.phase !== 'impact') progress = Math.min(1, elapsed / (f.id === 'pirateTreasure' ? 800 : 1000));
    }
    const frame = start + Math.min(count - 1, Math.floor(progress * count));
    const sw = atlas.naturalWidth / 4, sh = atlas.naturalHeight / 4;
    const p = bossVfxPoint(f.id === 'towerKingSeal' && f.origin ? f.origin : f.pos, camX, camY, tile);
    const size = tile * (f.id === 'towerKingSeal' ? 5.4 : 6);
    const height = size * sh / sw;
    ctx.save();
    const alpha = Math.min(1, elapsed / 60) * Math.min(1, (duration - elapsed) / 180);
    ctx.globalAlpha = alpha;
    ctx.drawImage(atlas, (frame % 4) * sw, Math.floor(frame / 4) * sh, sw, sh, p.x - size / 2, p.y - height * .7, size, height);
    ctx.restore();
    return true;
}
function bossVfxDuration(f) {
    if (f.id === 'towerIceCrown') return 3000;
    if (f.id === 'pirateTreasure') return f.phase === 'impact' ? 900 : 1800;
    if (f.id === 'towerChaosCore') return f.phase === 'impact' ? 1400 : 2000;
    if (f.id === 'towerKingSeal') return f.phase === 'slash' ? 340 : 1200;
    return f.id === 'towerBullHorn' || f.id === 'towerDeathShard' ? 1100 : 1400;
}
function bossVfxPoint(p, camX, camY, tile) { return { x: (p.x + .5) * tile - camX, y: (p.y + .5) * tile - camY }; }
function bossVfxEllipse(ctx, x, y, rx, ry, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width || 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); ctx.stroke();
}
function bossVfxRay(ctx, x, y, angle, length, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width || 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length * .55); ctx.stroke();
}
function bossVfxPaint(ctx, f, elapsed, camX, camY, tile, layer) {
    if (!f.pos || elapsed < 0 || elapsed >= bossVfxDuration(f) || f.done) return;
    if (layer === 'behind' && !(f.id === 'towerKingSeal' && f.phase !== 'slash')) return;
    if (bossVfxSprite(ctx, f, elapsed, camX, camY, tile, layer)) return;
    const p = bossVfxPoint(f.pos, camX, camY, tile), x = p.x, y = p.y;
    const k = elapsed / bossVfxDuration(f), radius = tile * 2.5;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 光暈獨立成層，透明邊緣不遮住地圖；只在爆發前段出現。
    if (layer === 'front' && elapsed < 420 && !(f.id === 'pirateTreasure' && f.phase !== 'impact')) {
        const flash = Math.pow(1 - elapsed / 420, 2);
        const color = f.id === 'towerBullHorn' ? '255,195,95' : f.id === 'towerIceCrown' ? '130,225,255' : f.id === 'pirateTreasure' ? '130,255,220' : f.execute ? '230,55,85' : '180,135,255';
        const glow = ctx.createRadialGradient(x, y - 10, 0, x, y - 10, tile * 1.8);
        glow.addColorStop(0, 'rgba(' + color + ',' + flash * .65 + ')'); glow.addColorStop(1, 'rgba(' + color + ',0)');
        ctx.fillStyle = glow; ctx.fillRect(x - tile * 1.8, y - 10 - tile * 1.8, tile * 3.6, tile * 3.6);
    }
    if (f.id === 'towerBullHorn') {
        if (layer === 'ground') {
            ctx.globalAlpha = Math.pow(1 - k, .7) * .9;
            bossVfxEllipse(ctx, x, y + 5, radius * Math.min(1, k * 2.7), radius * .5 * Math.min(1, k * 2.7), '#d7a45c', 3 * (1 - k) + .5);
            bossVfxEllipse(ctx, x, y + 5, radius * Math.min(1, k * 3.2), radius * .5 * Math.min(1, k * 3.2), '#ffe6a3', 1);
            for (let i = 0; i < 9; i++) {
                const a = i * Math.PI * 2 / 9, reach = radius * (.6 + .3 * Math.sin(i * 7 + 1)) * Math.min(1, k * 5);
                ctx.strokeStyle = '#24180d'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a + .12) * reach * .45, y + Math.sin(a + .12) * reach * .23); ctx.lineTo(x + Math.cos(a) * reach, y + Math.sin(a) * reach * .5); ctx.stroke();
                ctx.strokeStyle = '#e6b765'; ctx.lineWidth = 1; ctx.stroke();
            }
        } else {
            ctx.globalAlpha = (1 - k) * .8;
            // 一圈低矮塵霧在碎石後方擴散。
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4, travel = radius * k;
                ctx.fillStyle = 'rgba(181,139,83,' + (1 - k) * .22 + ')';
                ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * travel, y + 5 + Math.sin(a) * travel * .5, 7 + k * 12, 3 + k * 5, 0, 0, Math.PI * 2); ctx.fill();
            }
            for (let i = 0; i < 12; i++) {
                const a = i * 2.399, travel = (10 + i % 4 * 7) * k;
                const sx = x + Math.cos(a) * travel * 2, sy = y + Math.sin(a) * travel - Math.sin(k * Math.PI) * (12 + i % 3 * 6);
                ctx.fillStyle = i % 2 ? '#9c7546' : '#e7ba70'; ctx.beginPath(); ctx.moveTo(sx, sy - 3); ctx.lineTo(sx + 3, sy + 1); ctx.lineTo(sx - 2, sy + 4); ctx.closePath(); ctx.fill();
            }
        }
    } else if (f.id === 'towerIceCrown') {
        if (layer === 'ground') {
            ctx.globalAlpha = Math.min(1, elapsed / 150) * (1 - k) * .75;
            bossVfxEllipse(ctx, x, y + 5, radius, radius * .5, '#9fefff', 2);
            bossVfxEllipse(ctx, x, y + 5, radius * .8, radius * .4, '#d1fbff', 1);
            for (let i = 0; i < 12; i++) {
                const a = i * Math.PI / 6 + elapsed / 15000;
                bossVfxRay(ctx, x + Math.cos(a) * radius * .78, y + 5 + Math.sin(a) * radius * .39, a, radius * .18, '#b6f4ff');
                if (i % 2 === 0) bossVfxRay(ctx, x, y + 5, a, radius * .65, '#71c8e8');
            }
            for (const pos of f.frost || []) {
                bossVfxEllipse(ctx, (pos.x + .5) * tile - camX, (pos.y + .5) * tile - camY + 5, 11, 5, '#c9f9ff', 2);
            }
        } else {
            const rise = Math.min(1, elapsed / 220), fade = Math.min(1, (3000 - elapsed) / 700);
            ctx.globalAlpha = fade * .72;
            for (let i = 0; i < 9; i++) {
                const a = i * Math.PI * 2 / 9, sx = x + Math.cos(a) * radius * .85, sy = y + Math.sin(a) * radius * .42 + 5;
                const ht = (18 + i % 3 * 8) * rise;
                ctx.fillStyle = i % 2 ? '#93dbf6' : '#d0f7ff'; ctx.beginPath(); ctx.moveTo(sx - 5, sy); ctx.lineTo(sx - 1, sy - ht); ctx.lineTo(sx + 6, sy); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#e4ffff'; ctx.lineWidth = 1; ctx.stroke();
                ctx.fillStyle = '#4886b5'; ctx.beginPath(); ctx.moveTo(sx - 1, sy - ht); ctx.lineTo(sx + 1, sy); ctx.lineTo(sx + 6, sy); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#f2ffff'; ctx.beginPath(); ctx.moveTo(sx - 1, sy - ht); ctx.lineTo(sx - 3, sy - 3); ctx.stroke();
            }
            for (let i = 0; i < 8; i++) { const a = i * 2.4; const sx = x + Math.cos(a) * radius * .7, sy = y - 8 - (elapsed / 70 + i * 9) % 45; ctx.fillStyle = '#d9fdff'; ctx.fillRect(sx, sy, 1.5, 1.5); }
        }
    } else if (f.id === 'pirateTreasure') {
        if (f.phase !== 'impact') {
            if (layer !== 'ground') { ctx.restore(); return; }
            const charge = Math.min(1, elapsed / 800);
            ctx.globalAlpha = .65 + .2 * Math.sin(elapsed / 70);
            bossVfxEllipse(ctx, x, y + 4, radius, radius * .5, '#68f7e3', 1.5);
            bossVfxEllipse(ctx, x, y + 4, radius * charge, radius * .5 * charge, '#b6fff3');
            for (let i = 0; i < 4; i++) bossVfxRay(ctx, x, y + 4, i * Math.PI / 2, 12, '#cafff5', 2);
        } else if (layer === 'ground') {
            ctx.globalAlpha = (1 - k) * .7;
            bossVfxEllipse(ctx, x, y + 5, radius * Math.min(1, k * 3), radius * .5 * Math.min(1, k * 3), '#73e7d3', 3);
        } else {
            ctx.globalAlpha = Math.pow(1 - k, 1.4) * .9;
            const g = ctx.createRadialGradient(x, y - 7, 1, x, y - 7, 25 + 25 * k);
            g.addColorStop(0, '#fff2bc'); g.addColorStop(.3, '#ffae51'); g.addColorStop(1, 'rgba(255,100,20,0)');
            ctx.fillStyle = g; ctx.fillRect(x - 55, y - 65, 110, 110);
            for (let i = 0; i < 8; i++) {
                const a = i * 2.399, len = 20 + k * 30;
                ctx.fillStyle = 'rgba(83,210,190,.32)'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * len, y - 10 + Math.sin(a) * len * .5 - k * 20, 7 + k * 8, 10 + k * 8, 0, 0, Math.PI * 2); ctx.fill();
                bossVfxRay(ctx, x, y, a, 20 + k * 45, '#e8bf7e', 1);
            }
        }
    } else if (f.id === 'towerDeathShard') {
        if (layer !== 'front') { ctx.restore(); return; }
        const color = f.execute ? '#dd3d5b' : '#ae87ec';
        ctx.globalAlpha = Math.sin(Math.min(1, k * 1.25) * Math.PI) * .75;
        ctx.translate(x, y - 13); ctx.rotate(-.8 + k * 1.6);
        // 三道逐漸淡出的刀鋒拖影。
        for (let i = 3; i > 0; i--) {
            ctx.save(); ctx.rotate(-i * .13); ctx.globalAlpha *= .22 / i;
            ctx.strokeStyle = color; ctx.lineWidth = 5 + i * 2;
            ctx.beginPath(); ctx.moveTo(18, -43); ctx.bezierCurveTo(62, -40, 66, 12, 18, 37); ctx.stroke(); ctx.restore();
        }
        // 鐮刀長柄與弧形刀刃。
        ctx.strokeStyle = '#574968'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-32, 30); ctx.lineTo(20, -40); ctx.stroke();
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(18, -43); ctx.bezierCurveTo(62, -40, 66, 12, 18, 37); ctx.bezierCurveTo(49, 4, 36, -24, 18, -32); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = f.execute ? '#ffbac4' : '#eadbff'; ctx.lineWidth = 1; ctx.stroke();
        for (let i = 0; i < 3; i++) { ctx.globalAlpha *= .65; ctx.beginPath(); ctx.ellipse(0, 0, 48 + i * 5, 24 + i * 3, 0, -.9, 2.2); ctx.stroke(); }
        // 半透明兜帽殘影，保留敵人身體可見。
        ctx.rotate(.8 - k * 1.6); ctx.globalAlpha = (1 - k) * .35; ctx.fillStyle = '#30203f';
        ctx.beginPath(); ctx.moveTo(-24, -2); ctx.lineTo(-18, -52); ctx.quadraticCurveTo(0, -78, 18, -52); ctx.lineTo(26, -2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = color; ctx.fillRect(-7, -43, 4, 2); ctx.fillRect(4, -43, 4, 2);
    } else if (f.id === 'towerKingSeal') {
        if (layer !== (f.phase === 'slash' ? 'front' : 'behind')) { ctx.restore(); return; }
        if (f.phase === 'slash') {
            const sign = f.index % 2 ? -1 : 1;
            ctx.globalAlpha = (1 - k) * .85; ctx.translate(x, y - 13); ctx.scale(sign, 1); ctx.rotate(-.45 + f.index * .22);
            // 寬幅紫色外光與金色刃心，共用命中事件，不多觸發傷害。
            ctx.strokeStyle = 'rgba(141,82,230,.28)'; ctx.lineWidth = 15 * (1 - k) + 2;
            ctx.beginPath(); ctx.moveTo(-37, -22); ctx.quadraticCurveTo(0, 25 + k * 12, 39, -8); ctx.stroke();
            ctx.strokeStyle = '#ba8eff'; ctx.lineWidth = 5 * (1 - k) + 1;
            ctx.beginPath(); ctx.moveTo(-37, -22); ctx.quadraticCurveTo(0, 25 + k * 12, 39, -8); ctx.stroke();
            ctx.strokeStyle = '#ffe1a0'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#fff2cb'; ctx.fillRect(-2, -3, 4, 4);
        } else {
            const origin = f.origin ? bossVfxPoint(f.origin, camX, camY, tile) : { x: x - 40, y: y + 28 };
            ctx.translate(origin.x - 5, origin.y - 24);
            const appear = Math.min(1, elapsed / 160), fade = Math.min(1, (1200 - elapsed) / 350);
            ctx.globalAlpha = appear * fade * .48;
            const g = ctx.createLinearGradient(0, -85, 0, 20); g.addColorStop(0, '#7251b6'); g.addColorStop(1, 'rgba(70,40,110,0)'); ctx.fillStyle = g;
            ctx.beginPath(); ctx.moveTo(-16, -49); ctx.lineTo(-33, -37); ctx.lineTo(-25, -21); ctx.lineTo(-18, -31); ctx.lineTo(-29, 20); ctx.lineTo(26, 20); ctx.lineTo(17, -31); ctx.lineTo(29, -22); ctx.lineTo(34, -39); ctx.lineTo(15, -49); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#d3ab61'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.fillStyle = '#34214f'; ctx.beginPath(); ctx.moveTo(-11, -63); ctx.lineTo(11, -63); ctx.lineTo(9, -45); ctx.lineTo(0, -39); ctx.lineTo(-9, -45); ctx.closePath(); ctx.fill();
            // 三尖王冠、面甲、肩甲與靈體長劍。
            ctx.strokeStyle = '#ffe1a0'; ctx.beginPath(); ctx.moveTo(-12, -63); ctx.lineTo(-15, -77); ctx.lineTo(-5, -69); ctx.lineTo(0, -86); ctx.lineTo(5, -69); ctx.lineTo(15, -77); ctx.lineTo(12, -63); ctx.closePath(); ctx.stroke();
            ctx.fillStyle = '#e5cfff'; ctx.fillRect(-7, -55, 4, 2); ctx.fillRect(3, -55, 4, 2);
            ctx.beginPath(); ctx.moveTo(-17, -45); ctx.lineTo(0, -29); ctx.lineTo(17, -45); ctx.moveTo(0, -29); ctx.lineTo(0, 0); ctx.moveTo(27, -34); ctx.lineTo(52, -68); ctx.stroke();
            ctx.strokeStyle = '#b697f1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(49, -65); ctx.lineTo(62, -84); ctx.stroke();
        }
    } else if (layer === 'front') {
        // 圖片尚未載入時，保留火柱、冰晶、弧光與技能名作備援。
        const r = BOSS_ENCHANTS[f.id], fire = /火|炎|燃/.test(r.name), ice = /冰|寒/.test(r.name), wind = /風/.test(r.name);
        const color = ice ? '#a5edff' : fire ? '#ff9a46' : wind ? '#8effc0' : r.kind === 'physical' ? '#ffd37a' : '#c5a0ff';
        ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
        bossVfxEllipse(ctx, x, y + 5, 18 + k * 42, 8 + k * 18, color, 2);
        if (fire || /裁決/.test(r.name)) {
            const g = ctx.createLinearGradient(x, y - 72, x, y + 8); g.addColorStop(0, 'transparent'); g.addColorStop(1, color); ctx.fillStyle = g; ctx.fillRect(x - 9, y - 72, 18, 80);
        } else if (ice) {
            for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; bossVfxRay(ctx, x, y, a, 32, color); }
        } else if (r.hits) {
            for (let i = 0; i < r.hits; i++) { ctx.beginPath(); ctx.arc(x, y - 10, 18 + i * 5, k * 5 + i, k * 5 + i + 1.3); ctx.stroke(); }
        } else { ctx.beginPath(); ctx.moveTo(x - 22, y - 25); ctx.lineTo(x, y + 4); ctx.lineTo(x + 20, y - 35); ctx.stroke(); }
        ctx.fillStyle = color; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(r.name, x, y - 38 - k * 18);
    }
    ctx.restore();
}
function drawBossEnchantEffects(ctx, camX, camY, layer) {
    if (!scene || !scene.bossEnchantFx) return;
    scene.bossEnchantFx = scene.bossEnchantFx.filter(f => !f.done && gameNow - f.at < bossVfxDuration(f));
    for (const f of scene.bossEnchantFx) {
        // 冰霜附著腳下，隨怪物移動，死亡後移除；不更動減益或戰鬥數值。
        if (f.id === 'towerIceCrown' && f.targets) f.frost = f.targets.filter(m => m.hp > 0).map(m => bossEnchantPosition(m)).filter(Boolean);
        bossVfxPaint(ctx, f, gameNow - f.at, camX, camY, TILE, layer || 'front');
    }
}

// 遊戲內無消耗預覽：只畫示範場景，沒有角色生成、傷害、物品或存檔修改。
let bossVfxPreviewRun = 0;
function bossVfxPreviewButtons() {
    return '<div class="btn-row" style="max-height:180px;overflow-y:auto">' + BOSS_VFX_IDS.map(id => '<button class="secondary mini" onclick="openBossEnchantPreview(\'' + id + '\')">▶ ' + esc(BOSS_ENCHANTS[id].name) + '</button>').join('') + '</div>';
}
function openBossEnchantPreview(id) {
    if (!BOSS_VFX_IDS.includes(id)) return;
    const token = ++bossVfxPreviewRun;
    openDialog('特效預覽・' + BOSS_ENCHANTS[id].name, '<canvas id="boss-vfx-preview" width="420" height="280" style="display:block;width:100%;max-width:420px;margin:auto;background:#16151b;border-radius:8px"></canvas><p class="muted">循環預覽，不消耗材料與金幣。' + (id === 'towerDeathShard' ? '交替顯示一般紫色與低血量暗紅色。' : id === 'pirateTreasure' ? '落點預警後 0.8 秒爆炸。' : id === 'towerKingSeal' ? '四次斬擊跟隨實際命中節奏。' : '') + '</p>' + bossVfxPreviewButtons(), [{ text: '關閉', cls: 'secondary' }]);
    const canvas = document.getElementById('boss-vfx-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let start = null;
    const draw = now => {
        if (token !== bossVfxPreviewRun || !canvas.isConnected) return;
        if (start === null) start = now;
        const total = now - start, duration = 4000, age = total % duration;
        drawBossVfxPreview(ctx, id, age, Math.floor(total / duration) % 2 === 1);
        requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
}
function drawBossVfxPreview(ctx, id, elapsed, execute) {
    const tile = 32, pos = { x: 7, y: 5 }, origin = { x: 3, y: 6 };
    const f = { id, pos, origin, phase: 'start', execute, frost: [pos, { x: 8, y: 4 }] };
    ctx.clearRect(0, 0, 420, 280); ctx.fillStyle = '#17151b'; ctx.fillRect(0, 0, 420, 280);
    for (let y = 0; y < 280; y += 24) for (let x = -(y % 48); x < 420; x += 48) { ctx.strokeStyle = '#302c35'; ctx.lineWidth = 1; ctx.strokeRect(x, y, 48, 24); }
    const pass = layer => {
        const delay = id === 'pirateTreasure' ? 800 : id === 'towerChaosCore' ? 1000 : 0;
        if (delay && elapsed >= delay) bossVfxPaint(ctx, { ...f, phase: 'impact' }, elapsed - delay, 0, 0, tile, layer);
        else bossVfxPaint(ctx, f, elapsed, 0, 0, tile, layer);
        if (id === 'towerKingSeal') for (let i = 0; i < 4; i++) bossVfxPaint(ctx, { ...f, phase: 'slash', index: i }, elapsed - Math.max(TICK_MS, Math.ceil(i * 250 / TICK_MS) * TICK_MS), 0, 0, tile, layer);
    };
    pass('ground');
    pass('behind');
    // 簡單原創剪影僅作比例參考，與實際角色模型無關。
    for (const [p, enemy] of [[origin, false], [pos, true], [{ x: 8, y: 4 }, true]]) {
        const q = bossVfxPoint(p, 0, 0, tile);
        ctx.fillStyle = '#09090c'; ctx.beginPath(); ctx.ellipse(q.x, q.y + 5, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = enemy ? '#b2aa98' : '#9daabd'; ctx.beginPath(); ctx.arc(q.x, q.y - 27, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = enemy ? '#9d9586' : '#aab9ce'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(q.x, q.y - 20); ctx.lineTo(q.x, q.y - 6); ctx.moveTo(q.x - 8, q.y - 16); ctx.lineTo(q.x + 8, q.y - 16); ctx.moveTo(q.x, q.y - 6); ctx.lineTo(q.x - 5, q.y + 3); ctx.moveTo(q.x, q.y - 6); ctx.lineTo(q.x + 5, q.y + 3); ctx.stroke();
    }
    pass('front');
    // 血條最後繪製，示範正式遊戲相同的遮擋順序。
    ctx.fillStyle = '#09090c'; ctx.fillRect(224, 131, 32, 5); ctx.fillStyle = execute ? '#cf4c5c' : '#b75d4d'; ctx.fillRect(225, 132, execute ? 6 : 23, 3);
    ctx.fillStyle = '#dfd3bb'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(BOSS_ENCHANTS[id].name, 210, 22);
}
