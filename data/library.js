// 藏書閣彈窗：消耗武學積分參悟古籍，永久提升四維（每項上限 100 次，可 ×1 / ×10 / 最高 批次參悟；新制每次 +0.1、上限 200 次，多一本敏捷）
// 第二階段（需拜入中級宗門）：五行屬性秘典，每次提升對應屬性傷害 0.01%（每本上限 1000 次）

const STUDY_COST = 10;        // 每次消耗的武學積分
const STUDY_GAIN = 20;        // 每次提升的屬性
const STUDY_MAX_COUNT = 100;  // 每本古籍參悟上限

// ===== 第二階段：屬性秘典 =====
const ELEMENT_BOOK_TIER = 2;           // 需已拜入此階段的宗門（player.sectSkills[2]）
const ELEMENT_BOOK_GAIN = 0.0001;      // 每次 +0.01% 傷害（倍率 +0.0001）
const ELEMENT_BOOK_MAX = 1000;         // 每本上限 1000 次（滿級 +10%）
const ELEMENT_BOOK_COST = { martialPoints: 50, spiritGrass: 100, coins: 1000 };   // 每次消耗

// wuxing：本命五行（stats.js 的 getPlayerElement）為此屬性時，所有直接命中傷害提升
// effect：對應的屬性效果（elements.js 的 resolveHit）
//   metal 重擊該次傷害、thunder 雷擊該次傷害、ice 對凍結中目標的傷害、fire 燒傷每層傷害、poison 中毒每層傷害
const elementBooks = [
    { key: "metal",   name: "《庚金劍典》",   icon: "⚔️", wuxing: "金", effect: "metal",   desc: "本命五行為金時傷害提升；⚔️重擊傷害提升" },
    { key: "wood",    name: "《乙木長生訣》", icon: "🌿", wuxing: "木",                    desc: "本命五行為木時傷害提升" },
    { key: "water",   name: "《癸水真經》",   icon: "💧", wuxing: "水",                    desc: "本命五行為水時傷害提升" },
    { key: "fire",    name: "《丙火焚天錄》", icon: "🔥", wuxing: "火", effect: "fire",    desc: "本命五行為火時傷害提升；🔥燒傷傷害提升" },
    { key: "earth",   name: "《戊土玄黃功》", icon: "⛰️", wuxing: "土",                    desc: "本命五行為土時傷害提升" },
    { key: "ice",     name: "《玄冰寒魄訣》", icon: "❄️",               effect: "ice",     desc: "對❄️凍結中的目標傷害提升" },
    { key: "thunder", name: "《九霄雷典》",   icon: "⚡",               effect: "thunder", desc: "⚡雷擊傷害提升" },
    { key: "poison",  name: "《萬毒真經》",   icon: "☠️",               effect: "poison",  desc: "☠️中毒傷害提升" }
];

function openLibraryModal() {
    if (!checkSectJoined()) return;
    renderElementBooks();
    document.getElementById('library-modal').style.display = 'flex';
}

// 每次提升量與上限：新制（第 52 節）一律 +0.1、200 次（同丹藥），屬性由 numeric.js 依研讀次數計算，不改 player.stats；多一本敏捷古籍
function studyGainOf() { return NUMERIC_V2 ? NV2.studyGain : STUDY_GAIN; }
function studyMaxOf() { return NUMERIC_V2 ? NV2.studyMax : STUDY_MAX_COUNT; }

// qty：1、10 或 'max'
function studyBook(statType, qty = 1) {
    if (!player.studyCounts) player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
    if (statType === 'agi' && !NUMERIC_V2) return;
    if (typeof player.studyCounts[statType] !== 'number') player.studyCounts[statType] = 0;   // 敏捷（新制）舊存檔沒有此欄位
    const max = studyMaxOf(), gain = studyGainOf();
    let remaining = max - player.studyCounts[statType];
    if (remaining <= 0) {
        gameAlert(`該古籍已達參悟上限 (${max} 次)，無法繼續參悟！`);
        return;
    }

    let affordable = Math.min(Math.floor(player.martialPoints / STUDY_COST), remaining);
    if (affordable <= 0) {
        gameAlert(`武學積分不足 ${STUDY_COST} 點！可在宗門完成【整理武學秘典】任務獲得。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "參悟");
    if (!n) return;

    player.martialPoints -= STUDY_COST * n;
    player.studyCounts[statType] += n;
    if (!NUMERIC_V2) player.stats[statType] += gain * n;
    addDailyProgress('study', n);

    let names = { str: '力量', con: '體質', int: '悟性', spr: '靈力', agi: '敏捷' };
    let gainText = NUMERIC_V2 ? (gain * n).toFixed(1) : gain * n;
    addLog(`📚 在藏書閣研讀秘典 ${n} 次 (${player.studyCounts[statType]}/${max})，【${names[statType]}】永久提升 ${gainText} 點！`, "skill");
    renderElementBooks();
    updateUI();
}

function isElementBookUnlocked() {
    return !!(player.sectSkills && player.sectSkills[ELEMENT_BOOK_TIER]);
}

// 各屬性秘典目前提供的傷害加成（倍率增量，例 0.05 = +5%），供 elements.js 的 getPlayerCombatAttrs 使用
function getElementBookBonus() {
    let lv = player.elementStudy || {};
    let bonus = { wuxing: {}, metal: 0, fire: 0, ice: 0, thunder: 0, poison: 0 };
    let boost = 1 + gearFx("通玄");   // 通玄（裝備特效，gear.js）
    elementBooks.forEach(book => {
        let v = (lv[book.key] || 0) * ELEMENT_BOOK_GAIN * boost;
        if (book.wuxing) bonus.wuxing[book.wuxing] = v;
        if (book.effect) bonus[book.effect] = v;
    });
    return bonus;
}

function formatElementBookPercent(level) {
    return `+${(level * ELEMENT_BOOK_GAIN * 100).toFixed(2)}%`;
}

function renderElementBooks() {
    let container = document.getElementById('element-book-section');
    if (!container) return;
    let c = ELEMENT_BOOK_COST;
    let intro = `<p style="text-align: center; color: #9ca3af; font-size: 0.85em; margin: 4px 0;">
        每次參悟消耗 ${c.martialPoints} 武學積分 + ${c.spiritGrass} 株靈草 + ${c.coins.toWan()} 靈石，
        該屬性傷害 +${(ELEMENT_BOOK_GAIN * 100).toFixed(2)}%（每本上限 ${ELEMENT_BOOK_MAX.toWan()} 次 = ${formatElementBookPercent(ELEMENT_BOOK_MAX)}）</p>`;

    if (!isElementBookUnlocked()) {
        container.innerHTML = intro + `<p style="text-align: center; color: #f87171; font-size: 0.9em;">🔒 需先拜入【${SECT_TIER_NAMES[ELEMENT_BOOK_TIER]}】宗門，方可參悟屬性秘典。</p>`;
        return;
    }

    let owned = `<p style="text-align: center; color: #facc15; font-size: 0.85em; margin: 4px 0;">
        目前持有：武學積分 ${player.martialPoints.toWan()}｜靈草 ${player.spiritGrass.toWan()}｜靈石 ${player.coins.toWan()}</p>`;
    let lv = player.elementStudy || {};
    let cards = elementBooks.map(book => {
        let level = lv[book.key] || 0;
        let maxed = level >= ELEMENT_BOOK_MAX;
        let buttons = maxed
            ? `<p style="font-size: 0.85em; color: #4ade80;">已參悟圓滿</p>`
            : `<div class="batch-btns">
                    <button class="sys-btn" onclick="studyElementBook('${book.key}', 1)">×1</button>
                    <button class="sys-btn" onclick="studyElementBook('${book.key}', 10)">×10</button>
                    <button class="sys-btn" onclick="studyElementBook('${book.key}', 'max')">最高</button>
               </div>`;
        return `<div class="card">
                <h3>${book.icon} ${book.name}</h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${book.desc}</p>
                <p style="font-size: 0.85em; color: var(--accent);">已學習: ${level.toWan()} / ${ELEMENT_BOOK_MAX.toWan()}</p>
                <p style="font-size: 0.85em; color: #4ade80;">目前加成 ${formatElementBookPercent(level)}</p>
                ${buttons}
            </div>`;
    });
    container.innerHTML = intro + owned + `<div class="grid-container" style="margin-top: 12px;">${cards.join("")}</div>`;
}

// qty：1、10 或 'max'
function studyElementBook(key, qty = 1) {
    let book = elementBooks.find(b => b.key === key);
    if (!book) return;
    if (!isElementBookUnlocked()) {
        gameAlert(`屬性秘典需先拜入【${SECT_TIER_NAMES[ELEMENT_BOOK_TIER]}】宗門才能參悟！`);
        return;
    }
    if (!player.elementStudy) player.elementStudy = {};
    let current = player.elementStudy[key] || 0;
    let remaining = ELEMENT_BOOK_MAX - current;
    if (remaining <= 0) {
        gameAlert(`${book.name}已達參悟上限 (${ELEMENT_BOOK_MAX} 次)，無法繼續參悟！`);
        return;
    }

    let c = ELEMENT_BOOK_COST;
    let affordable = Math.min(remaining,
        Math.floor(player.martialPoints / c.martialPoints),
        Math.floor(player.spiritGrass / c.spiritGrass),
        Math.floor(player.coins / c.coins));
    if (affordable <= 0) {
        gameAlert(`資源不足！參悟 1 次需要 ${c.martialPoints} 武學積分 + ${c.spiritGrass} 株靈草 + ${c.coins.toWan()} 靈石。`);
        return;
    }
    let n = resolveBatchCount(qty, affordable, "參悟");
    if (!n) return;

    player.martialPoints -= c.martialPoints * n;
    player.spiritGrass -= c.spiritGrass * n;
    player.coins -= c.coins * n;
    player.elementStudy[key] = current + n;
    addDailyProgress('study', n);

    addLog(`📚 在藏書閣參悟${book.name} ${n} 次 (${player.elementStudy[key]}/${ELEMENT_BOOK_MAX})，${book.icon}屬性傷害加成達 ${formatElementBookPercent(player.elementStudy[key])}！`, "skill");
    renderElementBooks();
    updateUI();
}
