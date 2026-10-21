// 整套原創場景、世界配置與塔怪美術（僅畫面，版本 20261022b）。
const SCENE_ART_ROOT = 'images/maps/rework/';
const SCENE_WORLD_TILES = [
    ['forgottenIsle', '紫霧遺跡', 'swamp'], ['elvenForest', '迷霧古林', 'forest'], ['orenSnow', '永凍荒原', 'snow'], ['orenSnow', '霜峰山道', 'snow'],
    ['pirateIsle', '沉船海灣', 'pirate'], ['elvenForest', '古林河畔', 'meadow'], ['dragonValley', '焦骨峽谷', 'desert'], ['fireCave', '熔火煉獄', 'lava'],
    ['island', '低語海岸', 'coast'], ['gludio1', '腐朽礦坑・上層', 'mine-upper'], ['pyramid', '黃沙王陵', 'pyramid'], ['giantTomb', '泰坦墓穴', 'titan'],
    ['islandDungeon', '低語墓窟', 'crypt'], ['sleepingCave', '沉眠龍窟', 'cavern'], ['gludio2', '腐朽礦坑・深層', 'mine-deep'], ['elvenForest', '南境林道', 'forest'],
].map(([zone, name, art], i) => {
    const col = i % 4, row = Math.floor(i / 4), x0 = col * 47, y0 = row * 37, x1 = x0 + 46, y1 = row === 3 ? 148 : y0 + 36;
    const x = x0 + 23, y = Math.floor((y0 + y1) / 2);
    return { zone, name, art, x, y, rect: [x0, y0, x1, y1], start: [x, y] };
});
const SCENE_WORLD_WALK = SCENE_WORLD_TILES.flatMap(r => {
    const [x0, y0, x1, y1] = r.rect;
    return [[x0 + 12, y0 + 10, x1 - 12, y1 - 10], [x0, r.y - 2, x1, r.y + 2], [r.x - 2, y0, r.x + 2, y1]];
});
const SCENE_TOWN_ROLES = [['商店', 'shop'], ['回收', 'sell'], ['倉庫', 'storage'], ['鍛造', 'forge'], ['旅館', 'inn'], ['傳送師', 'teleport']];
const SCENE_ART_BGS = {
    wild: { src: SCENE_ART_ROOT + 'world-play.jpg', mini: SCENE_ART_ROOT + 'world-mini.jpg', w: 188, h: 149, start: [23, 92], big: true,
        walk: SCENE_WORLD_WALK, block: [], regions: SCENE_WORLD_TILES,
        fieldNpcs: [
            { name: '永夜之塔傳送師', role: '對話', to: 'tower', zone: 'forgottenIsle', x: 18, y: 16, front: [18, 18], img: 'images/npc/tower-keeper.png', face: 'images/npc/tower-keeper-face.jpg', h: 2.4, say: '永夜之塔的入口就在紫霧遺跡。你要進去嗎？', act: () => openKeeper('tower') },
            { name: '暮光法師塔傳送師', role: '對話', to: 'ivory', zone: 'gludio2', x: 110, y: 124, front: [110, 126], img: 'images/npc/ivory-keeper.png', face: 'images/npc/ivory-keeper-face.jpg', h: 2.4, say: '礦坑深處的道路通往暮光法師塔。你要過去嗎？', act: () => openKeeper('ivory') },
        ],
    },
};
for (const [id, key] of [['talking', 'village'], ['gludio', 'ash'], ['giran', 'darkgold'], ['aden', 'aden']]) {
    SCENE_ART_BGS[key] = { src: SCENE_ART_ROOT + 'town-' + id + '.jpg', w: 30, h: 18, start: [15, 14],
        walk: [[3, 9, 26, 15], [13, 2, 17, 15], [1, 12, 28, 15]], block: [],
        npcs: SCENE_TOWN_ROLES.map(([role, art], i) => ({ role, x: 5 + i * 4, y: 12, painted: false, h: 1.65, img: 'images/npc/rework/npc-' + art + '.png' })),
        lights: [[4, 8, 100], [25, 8, 100], [15, 3, 80]],
    };
}
for (const id of ['tower', 'ivory', 'earth-lair', 'water-lair', 'wind-lair', 'fire-lair']) {
    SCENE_ART_BGS['art-' + id] = { src: SCENE_ART_ROOT + 'arena-' + id + '.jpg', w: 40, h: 24, start: [20, 9],
        walk: [[4, 4, 35, 20], [18, 2, 22, 4]], block: [], lights: [[4, 4, 110], [35, 4, 110], [5, 19, 75], [34, 19, 75]],
    };
}
const SCENE_DRAGON_BGS = { lairAntharas: 'art-earth-lair', lairFafurion: 'art-water-lair', lairLindvior: 'art-wind-lair', lairValakas: 'art-fire-lair' };
const SCENE_TOWER_ART = {
    '骷髏神射手': 'archer', '死亡騎士的隨從': 'guard', '石像鬼': 'gargoyle', '暗影刺客': 'assassin',
    '火焰之影': 'flame', '熔岩高崙': 'golem', '冰原狼人': 'wolf', '冰之魔女': 'mage', '巫妖': 'mage', '死靈法師': 'mage',
    '墮落天使': 'angel', '地獄騎士': 'guard', '混沌戰士': 'guard', '混沌法師': 'mage', '深淵魔物': 'beast', '虛空行者': 'wraith',
    '冥界守衛': 'guard', '冥界死神': 'wraith', '冥法親衛': 'guard', '冥法巫師': 'mage',
    '巨大牛人': 'bull-boss', '黑暗女妖': 'banshee-boss', '炎魔之影': 'flame-boss', '冰之女王': 'ice-boss', '巫妖王': 'lich-boss',
    '墮落的大天使': 'angel-boss', '混沌之主': 'chaos-boss', '深淵領主': 'abyss-boss', '死神': 'reaper-boss', '冥法軍王': 'king-boss',
};
const SCENE_ART_MONSTERS = Object.fromEntries([...new Set(Object.values(SCENE_TOWER_ART))].map(art => ['art-' + art, {
    src: 'images/monsters/rework/mon-' + art + '.png', cw: 192, ch: 224, body: 168, n: [2, 2, 2, 2, 2, 2], cols: 4, size: art.endsWith('-boss') ? 74 : 48,
}]));
function sceneMonsterArt(m) {
    if (!m) return null;
    if (m.mid && SCENE_ART_MONSTERS[m.mid]) return m.mid;
    const name = (m.inst ? m.inst.name : m.name) || '', art = SCENE_TOWER_ART[name.replace(/\s*[（(].*$/, '')];
    return art && (!m.mid || /^tower/.test(m.mid) || m.inst && m.inst.towerFloor) ? 'art-' + art : m.mid;
}
function drawSceneAtmosphere(ctx, W, H, camX, camY) {
    // 只處理地面，人物、警示圈、名牌與飄字後畫，維持對比。
    ctx.save();
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.55);
    v.addColorStop(0, 'rgba(9,15,22,0)'); v.addColorStop(1, 'rgba(5,9,15,0.38)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'screen';
    for (const [x, y, size] of scene.bg.lights || []) {
        const sx = (x + 0.5) * TILE - camX, sy = (y + 0.5) * TILE - camY, r = size * (1 + 0.025 * Math.sin(gameNow / 370 + x));
        if (sx < -r || sx > W + r || sy < -r || sy > H + r) continue;
        const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, r); g.addColorStop(0, 'rgba(239,150,62,0.17)'); g.addColorStop(1, 'rgba(239,150,62,0)');
        ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.restore();
}
