// 屠龍勇者：魔法書／技能書（ARCHITECTURE.md 第 40 節）（依賴 config、classes、skills、items）
// 每招技能一本書，道具 id＝'book_' + 技能 id（cat 'book'、可堆疊、可交易）。用了就學會（要符合職業與等級，存在 player.skills）。
// 低級的在村莊商店賣（price＋tier），高級的只有怪物掉落（沒有 price，回收價 sell）。

// 書名：共用魔法＝魔法書；職業技能＝妖精「精靈水晶」、黑妖「黑暗精靈水晶」、其他「技能書」（參考天堂）
const BOOK_PREFIX = { elf: '精靈水晶', darkelf: '黑暗精靈水晶' };
function skillBookName(s) { return s.kind === 'magic' ? `${MAGIC_TIER_NAMES[s.tier]}級魔法書（${s.name}）` : `${BOOK_PREFIX[s.cls] || '技能書'}（${s.name}）`; }
function bookIdOf(skillId) { return 'book_' + skillId; }

// 商店販售（2026-10-18 使用者改）：魔法只賣 1～3 級（村莊等級 1：1～2 級、2：3 級）；職業技能每個職業只賣第 1 本（學習等級最低的那本）
// 其他（魔法 4～10 級、職業技能第 2 本以後）只有怪物掉落
const MAGIC_BOOK_PRICE = [0, 100, 300, 900];
const MAGIC_SHOP_MAX_TIER = 3;
for (const s of MAGIC) {
    const shop = s.tier <= MAGIC_SHOP_MAX_TIER;
    ITEMS[bookIdOf(s.id)] = { name: skillBookName(s), cat: 'book', skill: s.id, wt: 1,
        ...(shop ? { price: MAGIC_BOOK_PRICE[s.tier], tier: Math.ceil(s.tier / 2) } : { sell: s.tier * 3000 }),
        desc: `學習${MAGIC_TIER_NAMES[s.tier]}級魔法「${s.name}」` };
}
for (const cls in SKILLS) {
    const books = SKILLS[cls].filter(s => s.lv > 1);   // Lv.1 的創角就會，沒有書
    const first = books.reduce((a, s) => (!a || s.lv < a.lv ? s : a), null);
    for (const s of books) {
        const shop = s === first;
        ITEMS[bookIdOf(s.id)] = { name: skillBookName(s), cat: 'book', skill: s.id, wt: 1, classes: [cls],
            ...(shop ? { price: s.lv * s.lv * 4 + 200, tier: s.lv <= 15 ? 1 : s.lv <= 35 ? 2 : 3 } : { sell: s.lv * 400 }),
            desc: `${CLASSES[cls].name}專屬技能「${s.name}」` };
    }
}
// 書最低可以學的角色等級（任何職業；掉落挑書用）
function bookMinLv(d) {
    const s = SKILL_BY_ID[d.skill];
    if (s.kind === 'class') return s.lv;
    return Math.min(...Object.keys(MAGIC_CLASS).map(c => skillNeedLv(s, c)).filter(Boolean));
}

// ───────── 學習 ─────────
// 不能學的原因（'' 表示可以學）
function bookLearnError(d) {
    const s = SKILL_BY_ID[d.skill];
    if (!s) return '這本書已經失效';
    const need = skillNeedLv(s, player.cls);
    if (!need) return s.kind === 'magic' ? `${CLASSES[player.cls].name}學不了${MAGIC_TIER_NAMES[s.tier]}級魔法` : `只有${CLASSES[s.cls].name}能學`;
    if (hasSkill(s.id)) return '已經學會了';
    if (player.lv < need) return `需要 Lv.${need}（目前 Lv.${player.lv}）`;
    return '';
}
function learnBook(uid) {
    const inst = player.inv.find(x => x.uid === uid);
    if (!inst) return;
    const d = ITEMS[inst.id], err = bookLearnError(d);
    if (err) { showToast(err); return; }
    const s = SKILL_BY_ID[d.skill];
    consumeItem(inst.id);
    player.skills.push(s.id);
    // 主動技能：放進第一排第一個空格並開自動（第一排滿了就不放，玩家自己點空格放）
    const bar = player.settings.bar;
    let placed = -1;
    if (s.type !== 'passive') { placed = bar.findIndex((b, i) => i < SKILL_SLOTS && !b.id); if (placed >= 0) bar[placed] = { id: s.id, a: 1 }; }
    addLog(`✨ 學會了「${s.name}」`, 'lvup');
    showToast(`✨ 學會了「${s.name}」${s.type === 'passive' ? '（被動，已生效）' : placed >= 0 ? `（已放進快捷欄第 ${placed + 1} 格，自動施放）` : '（第一排滿了，點快捷欄空格放進去）'}`, 3000);
    saveGame();
    refreshUI();
}
// 道具說明：這本書的技能資訊與自己能不能學
function bookInfoHtml(d) {
    const s = SKILL_BY_ID[d.skill];
    if (!s) return '';
    const need = skillNeedLv(s, player.cls), err = bookLearnError(d);
    const lines = [`<b>${esc(s.name)}</b>　${SKILL_TYPE_NAMES[s.type] || ''}${s.mp ? `｜MP ${s.mp}` : ''}${s.type !== 'passive' && skillCd(s) ? `｜冷卻 ${skillCd(s)} 秒` : ''}`, esc(s.desc)];
    lines.push(hasSkill(s.id) ? '<span class="good">已學會</span>' : err ? `<span class="bad">${esc(err)}</span>` : `<span class="good">可以學習（${CLASSES[player.cls].name} Lv.${need}）</span>`);
    return `<div class="res-box res-1">${lines.join('<br>')}</div>`;
}

// ───────── 掉落（combat.js rollDrops 呼叫）─────────
// 只掉「商店沒賣」的高級書：一般怪 0.3%、首領 25%；挑最低學習等級不超過怪物等級 +5 的書（任何職業的都會掉，可以賣或交易）
const BOOK_DROP_P = 0.003, BOOK_BOSS_P = 0.25;
let bookDropPool = null;
function rollBookDrop(mon) {
    if (!chance(mon.boss ? BOOK_BOSS_P : BOOK_DROP_P)) return null;
    if (!bookDropPool) bookDropPool = Object.keys(ITEMS).filter(id => ITEMS[id].cat === 'book' && !ITEMS[id].price).map(id => ({ id, lv: bookMinLv(ITEMS[id]) }));
    const pool = bookDropPool.filter(b => b.lv <= mon.lv + 5);
    return pool.length ? pool[rand(0, pool.length - 1)].id : null;
}
