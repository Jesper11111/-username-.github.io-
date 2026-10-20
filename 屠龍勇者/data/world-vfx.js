// 黑暗大陸：十類視覺特效（ARCHITECTURE.md 第 74 節）。只畫圖，不參與戰鬥或存檔。
const WORLD_VFX_ROWS = {
    'weapon-glow': ['微光', '金色流光', '青藍光芒', '紫金光輝'],
    'weapon-element': ['火焰纏刃', '寒霜纏刃', '雷光纏刃', '幽冥纏刃'],
    attack: ['劍刃殘影', '重擊斧光', '槍口火光', '箭矢拖尾'],
    impact: ['暴擊碎光', '盾牌格擋', '閃避風痕', '反擊刃光'],
    'class-a': ['騎士十字劍氣', '黑妖雙刃殘影', '妖精精靈箭', '惡魔血焰'],
    'class-b': ['王族王冠光印', '戰士崩擊', '槍手彈幕', '魔鬥士雷刃'],
    'class-c': ['法師奧術', '聖騎士聖裁', '天使羽光', '修羅爪影'],
    support: ['治癒光點', '回魔符文', '加速風紋', '護盾光罩'],
    status: ['中毒綠霧', '燃燒火苗', '冰霜結晶', '暈眩星環'],
    boss: ['龍息爆發', '裂地震波', '隕石落點', '冰霜擴散'],
    loot: ['裝備光柱', '首領材料光環', '稀有星芒', '傳說光柱'],
    progress: ['升級光陣', '突破法陣', '羽翼展開', '成長星環']
};
const WORLD_VFX_GROUPS = {
    'weapon-glow': '武器強化', 'weapon-element': '附魔外觀', attack: '普通攻擊', impact: '暴擊與防禦',
    'class-a': '職業技能', 'class-b': '職業技能', 'class-c': '職業技能', support: '治癒與增益',
    status: '負面狀態', boss: '首領大招', loot: '稀有掉落', progress: '升級與成長'
};
const WORLD_VFX_CLASS = {
    knight: 'class-a-0', darkelf: 'class-a-1', elf: 'class-a-2', demon: 'class-a-3',
    royal: 'class-b-0', warrior: 'class-b-1', gunner: 'class-b-2', magicfighter: 'class-b-3',
    mage: 'class-c-0', paladin: 'class-c-1', angel: 'class-c-2', shura: 'class-c-3'
};
const WORLD_VFX_DEFS = {};
for (const sheet in WORLD_VFX_ROWS) WORLD_VFX_ROWS[sheet].forEach((name, row) => {
    const ground = ['loot', 'progress'].includes(sheet) || (sheet === 'support' && row === 2);
    WORLD_VFX_DEFS[sheet + '-' + row] = { name, sheet, row, layer: ground ? 'ground' : 'front',
        size: sheet === 'loot' ? 78 : sheet === 'boss' ? 120 : sheet.startsWith('class') ? 86 : 64,
        dur: sheet === 'loot' ? 2600 : sheet === 'progress' ? 1800 : sheet === 'boss' ? 900 : 600,
        previewOnly: (sheet === 'impact' && row === 1) || (sheet === 'status' && row === 0) || (sheet === 'progress' && row === 1) };
});
const worldVfxImages = {};
let worldVfxQuality = 'medium', worldVfxPreviewRun = 0;
try { const q = localStorage.getItem('dragonSlayer_vfxQuality'); if (['low', 'medium', 'high'].includes(q)) worldVfxQuality = q; } catch (e) {}
function worldVfxImage(sheet) {
    if (!worldVfxImages[sheet]) { const im = new Image(); im.src = 'images/vfx/world/' + sheet + '.png?v=' + GAME_VERSION; worldVfxImages[sheet] = im; }
    const im = worldVfxImages[sheet];
    return im.complete && im.naturalWidth ? im : null;
}
function worldVfxPaint(ctx, id, x, y, elapsed, size, alpha = 1, loop = false, angle = 0) {
    const d = WORLD_VFX_DEFS[id];
    if (!d || elapsed < 0 || (!loop && elapsed >= d.dur)) return;
    const im = worldVfxImage(d.sheet), k = loop ? (elapsed % 1000) / 1000 : elapsed / d.dur;
    const fade = loop ? 1 : Math.min(1, elapsed / 50) * Math.min(1, (d.dur - elapsed) / (d.dur * .25));
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const opacity = ctx.globalAlpha * alpha * fade;
    if (im) {
        const w = im.naturalWidth / 4, h = im.naturalHeight / 4, height = size * h / w;
        const progress = k * (loop ? 4 : 3), frame = Math.min(3, Math.floor(progress)), mix = progress - frame;
        const draw = (f, a) => { ctx.globalAlpha = opacity * a; ctx.drawImage(im, f * w, d.row * h, w, h, -size / 2, -height * .72, size, height); };
        draw(frame, 1 - mix); if (mix > 0) draw(loop ? (frame + 1) % 4 : Math.min(3, frame + 1), mix);
    } else {
        ctx.globalAlpha = opacity * .45; ctx.strokeStyle = '#c1d8f2'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, -5, size * (.12 + k * .12), size * .08, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
}
function worldVfxPosition(mon) {
    if (!scene || !scene.pl) return null;
    if (!mon) return { x: scene.pl.rx, y: scene.pl.ry };
    const m = scene.mons.find(m => m.inst === mon);
    return m ? { x: m.rx, y: m.ry } : null;
}
function worldVfxEmit(id, mon, options = {}) {
    if (SIM_MODE || typeof scene === 'undefined' || !scene || !player || !WORLD_VFX_DEFS[id] || WORLD_VFX_DEFS[id].previewOnly) return;
    const pos = options.pos || worldVfxPosition(mon);
    if (!pos) return;
    const list = scene.worldVfx || (scene.worldVfx = []);
    list.push({ id, pos: { ...pos }, from: options.from, follow: !!options.follow, at: gameNow, owner: player });
    const cap = worldVfxQuality === 'low' ? 8 : worldVfxQuality === 'high' ? 24 : 16;
    if (list.length > cap) list.splice(0, list.length - cap);
}
function worldVfxAttack(st, mon, crit) {
    if (SIM_MODE) return;
    const type = st.weapon && st.weapon.type;
    const id = type === 'bow' ? 'attack-3' : type === 'gun' ? 'attack-2' : type === 'axe' || type === 'blunt' ? 'attack-1' : 'attack-0';
    const from = st.ranged && typeof scene !== 'undefined' && scene ? worldVfxPosition(null) : null;
    worldVfxEmit(id, mon, { from });
    if (crit) worldVfxEmit('impact-0', mon);
}
function worldVfxSkill(k, mon) {
    if (SIM_MODE || String(k.id).startsWith('res_')) return;
    const id = /隕|流星/.test(k.name || '') ? 'boss-2' : k.kind === 'magic' && /冰|霜|雪|凍/.test(k.name || '') ? 'boss-3' : WORLD_VFX_CLASS[k.cls || player.cls];
    worldVfxEmit(id, mon);
}
function worldVfxSupport(k) {
    if (SIM_MODE) return;
    const fx = k.fx || {}, id = k.heal ? 'support-0' : fx.absorb || fx.reduce || fx.ac ? 'support-3' : fx.haste || fx.brave || fx.spdMul ? 'support-2' : 'support-1';
    worldVfxEmit(id, null, { follow: true });
    if (/翼|熾天使/.test(k.name || '')) worldVfxEmit('progress-2', null, { follow: true });
}
function worldVfxBoss(t) {
    if (SIM_MODE || typeof scene === 'undefined' || !scene || !scene.pl) return;
    const c = scene.tele && scene.tele.ref === t ? scene.tele : scene.pl;
    worldVfxEmit(t.mob.dragon ? 'boss-0' : 'boss-1', null, { pos: { x: c.x, y: c.y } });
}
function worldVfxEnemy(mon, magic) {
    if (!magic || (!mon.boss && !mon.dragon)) return;
    const name = mon.magic.name || '';
    worldVfxEmit(/冰|霜|雪|凍/.test(name) ? 'boss-3' : /隕|流星/.test(name) ? 'boss-2' : mon.dragon ? 'boss-0' : 'boss-1', null);
}
function worldVfxLoot(mon, item, inst) {
    if (SIM_MODE) return;
    const gear = item.cat === 'weapon' || item.cat === 'armor';
    const id = inst && inst.q === 'legend' ? 'loot-3' : mon.boss && item.cat === 'material' ? 'loot-1' : gear ? 'loot-0' : ['elixir', 'book'].includes(item.cat) || item.bless === 1 ? 'loot-2' : null;
    if (!id) return;
    const pos = worldVfxPosition(mon);
    if (pos && scene.worldVfx && scene.worldVfx.some(f => f.id === id && gameNow - f.at < 100 && Math.hypot(f.pos.x - pos.x, f.pos.y - pos.y) < .5)) return;
    worldVfxEmit(id, mon);
}
function drawWorldWeapon(ctx, x, y, dir, anim) {
    if (worldVfxQuality === 'low' || player.hp <= 0) return;
    const w = player.equip.weapon;
    if (!w) return;
    const power = Math.max(0, w.ench || 0), element = w.bossEnchant;
    if (!power && !element) return;
    const d = dir === 'up' ? [-8, -18, -.6] : dir === 'down' ? [9, -7, .2] : [13, -11, -.15];
    const swing = anim && anim.name === 'attack' ? Math.sin(Math.min(1, anim.t / anim.dur) * Math.PI) * .35 : 0;
    ctx.save(); ctx.translate(x + d[0], y + d[1]); ctx.rotate(d[2] + swing);
    if (power) worldVfxPaint(ctx, 'weapon-glow-' + (power >= 12 ? 3 : power >= 9 ? 2 : power >= 6 ? 1 : 0), 0, 0, gameNow, 22, .16 + Math.min(15, power) * .025, true);
    if (element) {
        const name = (BOSS_ENCHANTS[element] || {}).name || '';
        const row = /火|炎|燃|吐息/.test(name) ? 0 : /冰|寒|水龍/.test(name) ? 1 : /風|震|雷/.test(name) ? 2 : 3;
        worldVfxPaint(ctx, 'weapon-element-' + row, 0, 0, gameNow, 25, .4, true);
    }
    ctx.restore();
}
function drawWorldVfx(ctx, camX, camY, layer) {
    if (SIM_MODE || !scene || !scene.pl || !player) return;
    const list = scene.worldVfx || [];
    scene.worldVfx = list.filter(f => f.owner === player && gameNow - f.at < WORLD_VFX_DEFS[f.id].dur);
    for (const f of scene.worldVfx) {
        const d = WORLD_VFX_DEFS[f.id]; if (d.layer !== layer) continue;
        let p = f.follow ? { x: scene.pl.rx, y: scene.pl.ry } : f.pos;
        if (f.from) { const k = Math.min(1, (gameNow - f.at) / 220); p = { x: f.from.x + (p.x - f.from.x) * k, y: f.from.y + (p.y - f.from.y) * k }; }
        worldVfxPaint(ctx, f.id, p.x * TILE + TILE / 2 - camX, p.y * TILE + TILE / 2 - camY, gameNow - f.at, d.size, worldVfxQuality === 'low' ? .65 : .85);
    }
    if (layer === 'ground' && scene.tele && scene.tele.ref) {
        const t = scene.tele, id = t.ref.mob.dragon ? 'boss-0' : 'boss-1';
        worldVfxPaint(ctx, id, t.x * TILE + TILE / 2 - camX, t.y * TILE + TILE / 2 - camY, 100, 108, .18);
    }
    if (layer !== 'front' || worldVfxQuality === 'low') return;
    const px = scene.pl.rx * TILE + TILE / 2 - camX, py = scene.pl.ry * TILE + TILE / 2 - camY;
    if (player.hp > 0) {
        const fx = Object.values(player.buffs).filter(b => b.until > gameNow).map(b => buffFx(b) || {});
        if (fx.some(f => f.absorb || f.reduce || f.ac)) worldVfxPaint(ctx, 'support-3', px, py, gameNow, 62, .2, true);
        if (fx.some(f => f.haste || f.brave || f.spdMul)) worldVfxPaint(ctx, 'support-2', px, py + 7, gameNow, 36, .25, true);
    }
    const cap = worldVfxQuality === 'high' ? 6 : 4;
    for (const m of scene.mons.filter(m => !m.dead && m.inst && m.inst.hp > 0).slice(0, cap)) {
        const x = m.rx * TILE + TILE / 2 - camX, y = m.ry * TILE + TILE / 2 - camY;
        if (m.inst.stunUntil > gameNow) worldVfxPaint(ctx, 'status-3', x, y - 32, gameNow, 30, .7, true);
        const weapon = player.equip.weapon;
        const debuffs = (m.inst.bossEnchantDebuffs || []).filter(b => b.until > gameNow && b.owner === player && weapon && b.uid === weapon.uid && b.id === weapon.bossEnchant);
        if (debuffs.some(b => b.type === 'slow' || b.type === 'atkSlow')) worldVfxPaint(ctx, 'status-2', x, y + 5, gameNow, 42, .4, true);
        const rt = hunt && hunt.bossEnchantRuntime;
        if (rt && rt.owner === player && weapon && rt.uid === weapon.uid && rt.id === weapon.bossEnchant && rt.jobs.some(j => j.mon === m.inst && j.type === 'dot' && /火|炎|燃|吐息/.test(BOSS_ENCHANTS[j.id].name))) worldVfxPaint(ctx, 'status-1', x, y, gameNow, 40, .45, true);
    }
}
function setWorldVfxQuality(q) {
    if (!['low', 'medium', 'high'].includes(q)) return;
    worldVfxQuality = q;
    try { localStorage.setItem('dragonSlayer_vfxQuality', q); } catch (e) {}
    refreshUI();
}
function worldVfxSettingsHtml() {
    return '<div class="panel"><h4>✨ 視覺特效</h4><div class="btn-row">' + ['low', 'medium', 'high'].map((q, i) => '<button class="' + (worldVfxQuality === q ? '' : 'secondary') + '" onclick="setWorldVfxQuality(\'' + q + '\')">' + ['低', '中', '高'][i] + '</button>').join('') + '</div><small class="muted">低：減少同時特效與常駐光效。只影響這台裝置畫面。</small><div class="btn-row"><button class="secondary" onclick="openWorldVfxPreview(\'weapon-glow-0\')">🎬 十類特效預覽</button></div></div>';
}
function worldVfxPreviewButtons() {
    return '<div class="btn-row" style="max-height:150px;overflow-y:auto">' + Object.keys(WORLD_VFX_DEFS).map(id => '<button class="mini secondary" onclick="openWorldVfxPreview(\'' + id + '\')">' + esc(WORLD_VFX_DEFS[id].name) + '</button>').join('') + '</div>';
}
function openWorldVfxPreview(id) {
    const d = WORLD_VFX_DEFS[id]; if (!d) return;
    const token = ++worldVfxPreviewRun;
    openDialog(WORLD_VFX_GROUPS[d.sheet] + '・' + d.name, '<canvas id="world-vfx-preview" width="420" height="260" style="display:block;width:100%;background:#18151e;border-radius:8px"></canvas><p class="muted">' + (d.previewOnly ? '圖片已製作，目前僅供預覽，尚無對應玩法。' : '循環預覽，不扣道具、不修改角色。') + '</p>' + worldVfxPreviewButtons(), [{ text: '關閉', cls: 'secondary' }]);
    const canvas = document.getElementById('world-vfx-preview'); if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let start = null;
    const draw = now => { if (token !== worldVfxPreviewRun || !canvas.isConnected) return; if (start === null) start = now; drawWorldVfxPreview(ctx, id, (now - start) % (d.dur + 450)); requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
}
function drawWorldVfxPreview(ctx, id, elapsed) {
    const d = WORLD_VFX_DEFS[id];
    ctx.clearRect(0, 0, 420, 260); ctx.fillStyle = '#18151e'; ctx.fillRect(0, 0, 420, 260);
    ctx.strokeStyle = '#302b3b'; ctx.lineWidth = 1;
    for (let y = 20; y < 260; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(420, y); ctx.stroke(); }
    const weapon = d.sheet.startsWith('weapon');
    if (weapon) { ctx.strokeStyle = '#aeb4bf'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(180, 180); ctx.lineTo(235, 105); ctx.stroke(); }
    worldVfxPaint(ctx, id, 210, 195, elapsed, weapon ? 130 : 170, .9, weapon);
    ctx.fillStyle = '#dfd3bb'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.name, 210, 27);
}
