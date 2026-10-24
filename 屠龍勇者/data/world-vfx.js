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
const WORLD_VFX_LEGEND_WEAPONS = {
    dragonSlayer: 'class-a-0', earthRender: 'boss-1', tidalStaff: 'class-c-0', galeBow: 'class-a-2', infernoBlade: 'class-a-3',
    eclipseDual: 'class-a-1', rakshasaClaw: 'class-c-3', starfallGun: 'boss-2', thunderRuneSword: 'class-b-3',
    dawnJudgmentHammer: 'class-c-1', seraphSpear: 'class-c-2', infernalSoulScythe: 'class-a-3',
};
// 原圖部分列距略有不同；只調整取樣範圍，避免把上一列的光芒切進下一種技能。
const WORLD_VFX_ROW_CUTS = {
    attack: [0,314,661,940,1254], boss: [0,314,641,952,1254],
    'class-a': [0,314,619,940,1254], 'class-b': [0,332,643,940,1254], 'class-c': [0,314,627,924,1254],
    impact: [0,314,627,940,1254], loot: [0,314,627,926,1254], progress: [0,314,631,946,1254],
    status: [0,346,659,976,1254], support: [0,320,651,942,1254],
    'weapon-element': [0,314,627,940,1254], 'weapon-glow': [0,314,627,938,1254]
};
const WORLD_VFX_DEFS = {};
for (const sheet in WORLD_VFX_ROWS) WORLD_VFX_ROWS[sheet].forEach((name, row) => {
    const ground = ['loot', 'progress'].includes(sheet) || (sheet === 'support' && row === 2);
    WORLD_VFX_DEFS[sheet + '-' + row] = { name, sheet, row, layer: ground ? 'ground' : 'front',
        size: sheet === 'loot' ? 78 : sheet === 'boss' ? 120 : sheet.startsWith('class') ? 86 : 64,
        dur: sheet === 'loot' ? 2600 : sheet === 'progress' ? 1800 : sheet === 'boss' ? 900 : 600,
        previewOnly: (sheet === 'impact' && row === 1) || (sheet === 'progress' && row === 1) };
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
        const cuts = WORLD_VFX_ROW_CUTS[d.sheet], w = im.naturalWidth / 4;
        const top = cuts[d.row] / 1254 * im.naturalHeight, h = (cuts[d.row + 1] - cuts[d.row]) / 1254 * im.naturalHeight, height = size * h / w;
        const progress = k * (loop ? 4 : 3), frame = Math.min(3, Math.floor(progress)), mix = progress - frame;
        const draw = (f, a) => { ctx.globalAlpha = opacity * a; ctx.drawImage(im, f * w, top, w, h, -size / 2, -height * .72, size, height); };
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
    if (SIM_MODE) return;
    if (String(k.id).startsWith('res_')) {
        const id = WORLD_VFX_LEGEND_WEAPONS[String(k.id).slice(4)];
        if (id) worldVfxEmit(id, mon);
        return;
    }
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
// 武器區域以原角色格子的比例定義，再依該格的實際像素／色彩裁切；不再把光圈掛在估算手邊。
const WORLD_WEAPON_AREAS = {
    royal: { tone:'steel', walk:[[[.30,.65,.21,.99,.025]],[[.5,.5,.49,.46]],[[.02,.45,.25,.43],[.74,.45,.25,.43]]] },
    knight: { tone:'steel', walk:[[[.06,.46,.3,.52]],[[.5,.5,.49,.45]],[[.65,.46,.34,.47]]] },
    mage: { tone:'blue', walk:[[[.65,.08,.34,.68]],[[.58,.4,.41,.5]],[[.64,.02,.35,.6]]] },
    elf: { tone:'wood', walk:[[[.08,.57,.85,.23]],[[.35,.36,.62,.47]],[[.58,.48,.4,.37]]], attack:[[[.66,.12,.22,.69]],[[.65,.1,.29,.68]],[[.57,.12,.29,.64]]] },
    darkelf: { tone:'purple', walk:[[[.48,.48,.51,.45]],[[.48,.48,.51,.45]],[[.48,.48,.51,.45]]] },
    shura: { tone:'red', walk:[[[.5,.49,.49,.45]],[[.5,.49,.49,.45]],[[.16,.48,.75,.39]]] },
    warrior: { tone:'steel', walk:[[[.08,.52,.23,.43],[.69,.52,.25,.43]],[[.39,.57,.58,.39]],[[.16,.52,.2,.34],[.65,.52,.23,.34]]] },
    gunner: { tone:'blue', walk:[[[.13,.48,.2,.36],[.67,.48,.2,.36]],[[.45,.47,.52,.38]],[[.14,.48,.2,.38],[.65,.48,.24,.38]]], attack:[[[.08,.22,.35,.36],[.58,.22,.35,.36]],[[.06,.12,.84,.3]],[[.23,.07,.55,.39]]] },
    magicfighter: { tone:'arcane', walk:[[[.14,.38,.25,.36],[.64,.38,.25,.36]],[[.45,.36,.4,.4]],[[.12,.38,.23,.35],[.65,.38,.23,.35]]], attack:[[[.12,.22,.76,.47]],[[.3,.21,.6,.48]],[[.15,.18,.72,.49]]] },
    paladin: { tone:'gold', walk:[[[.32,.52,.17,.44]],[[.5,.5,.47,.43]],[[.66,.5,.31,.43]]] },
    angel: { tone:'gold', walk:[[[.12,.38,.22,.49]],[[.55,.28,.3,.56]],[[.64,.43,.31,.44]]] },
    demon: { tone:'red', walk:[[[.07,.46,.34,.52]],[[.48,.45,.51,.5]],[[.64,.44,.34,.48]]] }
};
const worldWeaponMasks = new Map();
function worldWeaponPixel(tone, r, g, b) {
    const steel = Math.max(r,g,b) - Math.min(r,g,b) < 48 && (r+g+b)/3 > 95;
    if (tone === 'steel') return steel;
    if (tone === 'gold') return r > 100 && g > 65 && b < r * .85;
    if (tone === 'blue') return steel || (b > 80 && b > r * 1.18 && g > 45);
    if (tone === 'purple') return r > 65 && b > 85 && b > g * 1.2;
    if (tone === 'red') return r > 95 && r > g * 1.45 && r > b * 1.12;
    if (tone === 'wood') return r > 65 && g > 50 && r >= g * .97 && r > b * 1.15;
    return (b > 95 && b > r * 1.15) || (r > 110 && r > b * 1.25);
}
function worldWeaponMask(info, dir) {
    const spec = WORLD_WEAPON_AREAS[player.cls];
    if (!spec || !info || !info.image || !info.image.complete || !info.image.naturalWidth || !document.createElement) return null;
    const a = info.sprite, key = player.cls + ':' + a.src + ':' + info.row + ':' + info.frame;
    if (worldWeaponMasks.has(key)) return worldWeaponMasks.get(key);
    const canvas = document.createElement('canvas'); canvas.width = a.cellW; canvas.height = a.cellH;
    const g = canvas.getContext('2d', {willReadFrequently:true});
    g.drawImage(info.image, info.frame*a.cellW, info.row*a.cellH, a.cellW, a.cellH, 0, 0, a.cellW, a.cellH);
    const im = g.getImageData(0,0,a.cellW,a.cellH), di = dir === 'up' ? 2 : dir === 'down' ? 0 : 1;
    let areas = spec.walk[di];
    if (info.action === 'attack') areas = spec.attack ? spec.attack[di] : [
        [0,.34,.35,.59],[.65,.23,.35,.7],[.2,0,.6,.28],[.22,.72,.56,.28]
    ];
    // 施法／受傷的角色格可能空手或帶全身法陣，僅保留手側可辨識的武器像素。
    if (info.action === 'cast') areas = [[0,.17,.29,.59],[.71,.13,.29,.6]];
    if (info.action === 'hit') areas = [[0,.35,.35,.56],[.65,.28,.35,.6]];
    for (let y=0;y<a.cellH;y++) for (let x=0;x<a.cellW;x++) {
        const i=(y*a.cellW+x)*4, u=(x+.5)/a.cellW, v=(y+.5)/a.cellH;
        const inside=areas.some(q=>{
            if(q.length===4)return u>=q[0]&&v>=q[1]&&u<=q[0]+q[2]&&v<=q[1]+q[3];
            const dx=q[2]-q[0],dy=q[3]-q[1],t=Math.max(0,Math.min(1,((u-q[0])*dx+(v-q[1])*dy)/(dx*dx+dy*dy)));
            return Math.hypot(u-q[0]-t*dx,v-q[1]-t*dy)<=q[4];
        });
        if (!inside || !worldWeaponPixel(spec.tone,im.data[i],im.data[i+1],im.data[i+2])) im.data[i+3]=0;
        im.data[i]=im.data[i+1]=im.data[i+2]=255;
    }
    g.putImageData(im,0,0);
    if (worldWeaponMasks.size >= 192) worldWeaponMasks.delete(worldWeaponMasks.keys().next().value);
    worldWeaponMasks.set(key,canvas);
    return canvas;
}
function drawWorldWeapon(ctx, x, y, dir, anim, info) {
    if (worldVfxQuality === 'low' || player.hp <= 0) return;
    const w = player.equip.weapon;
    if (!w) return;
    const power = Math.max(0, w.ench || 0), element = w.bossEnchant;
    if (!power && !element) return;
    const mask = worldWeaponMask(info, dir);
    if (!mask) return;
    let color = ['#e5efff','#ffd56a','#72dfff','#c28bff'][power >= 12 ? 3 : power >= 9 ? 2 : power >= 6 ? 1 : 0];
    if (element) {
        const name = (BOSS_ENCHANTS[element] || {}).name || '';
        const row = /火|炎|燃|吐息/.test(name) ? 0 : /冰|寒|水龍/.test(name) ? 1 : /風|震|雷/.test(name) ? 2 : 3;
        if (!power || Math.sin(gameNow/700) > .35) color = ['#ff8a35','#8eeaff','#7ac8ff','#b278ff'][row];
    }
    // 著色只在武器遮罩裡，外緣的小幅柔光也與同一格武器同步縮放／鏡像。
    if (!mask.weaponTints) mask.weaponTints = {};
    let tint = mask.weaponTints[color];
    if (!tint) {
        tint = document.createElement('canvas'); tint.width=mask.width; tint.height=mask.height;
        const g=tint.getContext('2d'); g.drawImage(mask,0,0); g.globalCompositeOperation='source-in'; g.fillStyle=color; g.fillRect(0,0,tint.width,tint.height);
        mask.weaponTints[color]=tint;
    }
    const swing = info.action === 'attack' ? .15 : 0;
    ctx.save(); ctx.globalAlpha *= .28 + Math.min(15,power)*.023 + swing + Math.sin(gameNow/250)*.06;
    ctx.shadowColor=color; ctx.shadowBlur=power>=12?3:power>=6?2:1;
    ctx.drawImage(tint,x-info.dw/2,y+14-info.dh,info.dw,info.dh);
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
        if (player.hp > 0 && rt && rt.owner === player && weapon && rt.uid === weapon.uid && rt.id === weapon.bossEnchant && rt.jobs.some(j => j.mon === m.inst && j.type === 'dot' && BOSS_ENCHANTS[j.id].poison)) worldVfxPaint(ctx, 'status-0', x, y, gameNow, 44, .55, true);
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
