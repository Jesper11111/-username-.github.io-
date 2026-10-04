// 靈獸園彈窗：兌換靈寵（含魅力折扣）、復活、出戰／召回休息（維持費）、技能欄與抽屜式技能選單（50 招）
// 成長與戰鬥邏輯在 beast-combat.js

function openBeastModal() {
    if (!checkSectJoined()) return;
    document.getElementById('beast-modal').style.display = 'flex';
    renderBeasts();
}

function getBeastDiscountMult() {
    let totalCha = player.stats.cha + getEquipBonus().cha;
    return Math.max(0.5, 1 - (totalCha * 0.001));
}

function renderBeasts() {
    const container = document.getElementById('beast-list-container');
    let discountMult = getBeastDiscountMult();

    container.innerHTML = beastData.map(info => {
        let b = player.beasts.find(x => x.id === info.id);
        let finalCoins = Math.floor(info.costCoins * discountMult);

        if (!b) {
            return `
            <div class="card" style="border-color: #fb923c;">
                <h3 style="color: #fb923c;">${info.name}</h3>
                <p style="font-size: 0.85em; color: #9ca3af;">${info.desc}</p>
                <p style="font-size: 0.8em; color: #facc15;">消耗: ${info.costCore.toWan()} 獸丹 + ${finalCoins.toWan()} 靈石 ${discountMult < 1 ? `(魅力折扣 ${(discountMult*10).toFixed(1)}折)` : ''}</p>
                <button class="sys-btn" onclick="tameBeast('${info.id}')">兌換靈寵 (Lv.1)</button>
            </div>`;
        }

        let need = getLevelExpNeeded(b.level);
        let expText = b.level >= player.level
            ? `<span style="color:#fb923c;">已達人物等級上限</span>`
            : `經驗 ${Math.floor(b.exp).toWan()} / ${need.toWan()}`;
        let active = isBeastActive(b);
        let status = !b.alive
            ? `<span style="color:#ef4444;">已陣亡</span>`
            : active ? `<span style="color:#4ade80;">協戰中</span>` : `<span style="color:#9ca3af;">休息中</span>`;
        let upkeep = getBeastUpkeep(b.level);
        let upkeepText = `維持費：每 ${BEAST_UPKEEP_INTERVAL} 秒 ${upkeep.coins.toWan()} 靈石＋${upkeep.core.toWan()} 獸丹`
            + (active ? '' : '（休息中不收取）');
        let toggleBtn = !b.alive ? ''
            : active ? `<button class="sys-btn" style="border-color:#9ca3af; color:#9ca3af;" onclick="toggleBeastActive('${b.id}')">召回休息</button>`
            : `<button class="sys-btn" style="border-color:#4ade80; color:#4ade80;" onclick="toggleBeastActive('${b.id}')">出戰</button>`;

        let slots = renderBeastSkillSlots(b);

        return `
            <div class="card" style="border-color: ${!b.alive ? '#ef4444' : active ? '#fb923c' : '#6b7280'};${typeof beastPickerSlot[b.id] === 'number' ? ' grid-column: 1 / -1;' : ''}">
                <h3 style="color: #fb923c;">${info.name} <span style="font-size:0.8em; color:var(--accent);">Lv.${b.level}</span></h3>
                <p style="font-size: 0.8em; color: #9ca3af;">${status}｜${expText}</p>
                <p style="font-size: 0.8em; color: #9ca3af;">被動：${info.passive}${!b.alive ? '（陣亡中失效）' : active ? '' : '（休息中失效）'}</p>
                <p style="font-size: 0.8em; color: #facc15;">${upkeepText}</p>
                <p style="font-size: 0.78em; color: #7dd3fc;">💧 靈力 ${Math.floor(getBeastMp(b.id))}/${BEAST_MP_MAX}（每回合 +${BEAST_MP_REGEN}；技能依領悟等級耗 ${Object.values(BEAST_SKILL_MP_BY_LV).join('／')}，不夠就不施展）｜最多同時 ${BEAST_ACTIVE_MAX} 隻出戰</p>
                ${toggleBtn}
                ${b.alive ? '' : `<button class="sys-btn" style="border-color:#ef4444; color:#ef4444;" onclick="reviveBeast('${b.id}')">復活 (${BEAST_REVIVE_COST_CORE.toWan()} 獸丹)</button>`}
                <div style="text-align:left; font-size:0.78em;">${slots}</div>
            </div>`;
    }).join('');
}

function tameBeast(id) {
    let info = beastData.find(b => b.id === id);
    if (!info || player.beasts.some(b => b.id === id)) return;
    let finalCoins = Math.floor(info.costCoins * getBeastDiscountMult());

    if (player.beastCore >= info.costCore && player.coins >= finalCoins) {
        player.beastCore -= info.costCore;
        player.coins -= finalCoins;
        const nb = createBeast(id);
        if (player.beasts.filter(x => isBeastActive(x)).length >= BEAST_ACTIVE_MAX) nb.active = false;   // 出戰已滿（BEAST_ACTIVE_MAX）：新兌換的先休息
        player.beasts.push(nb);
        let upkeep = getBeastUpkeep(1);
        addLog(`🐾 成功兌換靈寵【${info.name}】（Lv.1）！於 Lv${BEAST_SKILL_LEVELS[0]} 可領悟第一招技能。出戰中每 ${BEAST_UPKEEP_INTERVAL} 秒消耗 ${upkeep.coins.toWan()} 靈石＋${upkeep.core.toWan()} 獸丹。`, "system");
        renderBeasts();
        updateUI();
    } else {
        gameAlert(`資源不足！需要 ${info.costCore.toWan()} 獸丹與 ${finalCoins.toWan()} 靈石。`);
    }
}

function reviveBeast(id) {
    let b = player.beasts.find(x => x.id === id);
    if (!b || b.alive) return;
    if (player.beastCore < BEAST_REVIVE_COST_CORE) {
        gameAlert(`獸丹不足！復活需要 ${BEAST_REVIVE_COST_CORE.toWan()} 獸丹。`);
        return;
    }
    player.beastCore -= BEAST_REVIVE_COST_CORE;
    b.alive = true;
    enforceBeastActiveLimit();   // 復活後若會超過出戰上限，排後面的改休息
    let info = beastData.find(d => d.id === id);
    addLog(`🐾 耗費 ${BEAST_REVIVE_COST_CORE.toWan()} 獸丹，靈寵【${info.name}】重獲新生！`, "system");
    renderBeasts();
    updateUI();
}

// 出戰／召回休息：休息中不收維持費，也不提供被動、協助與經驗（維持費計時暫停，再出戰時接續）
function toggleBeastActive(id) {
    let b = player.beasts.find(x => x.id === id);
    if (!b || !b.alive) return;
    if (!isBeastActive(b)) {
        let cost = getBeastUpkeep(b.level);
        if (player.coins < cost.coins || player.beastCore < cost.core) {
            gameAlert(`資源不足！出戰需能支付維持費：每 ${BEAST_UPKEEP_INTERVAL} 秒 ${cost.coins.toWan()} 靈石＋${cost.core.toWan()} 獸丹。`);
            return;
        }
        // 出戰上限 BEAST_ACTIVE_MAX（config-beasts.js，三隻）：已滿時請玩家先召回一隻
        if (player.beasts.filter(x => x !== b && isBeastActive(x)).length >= BEAST_ACTIVE_MAX) {
            gameAlert(`最多同時 ${BEAST_ACTIVE_MAX} 隻靈寵出戰，請先召回一隻再出戰。`);
            return;
        }
        b.active = true;
        addLog(`🐾 靈寵【${getBeastName(b)}】出戰！每 ${BEAST_UPKEEP_INTERVAL} 秒消耗 ${cost.coins.toWan()} 靈石＋${cost.core.toWan()} 獸丹。`, "system");
    } else {
        b.active = false;
        addLog(`🐾 靈寵【${getBeastName(b)}】已召回靈獸園休息，暫停收取維持費。`, "system");
    }
    renderBeasts();
    updateUI();
}

// ==================== 技能欄與抽屜式選單（2026-09-29 技能改版）====================
// 每隻靈寵 6 個技能欄；點空欄的「📖 選擇技能」會在下方展開選單：5 類各一個抽屜（<details>），每類 10 招，
// 點一招即領悟（同一隻靈寵不能重複、靈寵等級未達 minLv 的招式鎖住）。
let beastPickerSlot = {};   // { 靈寵 id: 正在選的欄位 }（只影響畫面，不存檔）

function renderBeastSkillSlots(b) {
    const learnedIds = b.skills.filter(Boolean);
    const rows = BEAST_SKILL_LEVELS.map((lv, slot) => {
        const sk = getBeastSkill(b.skills[slot]);
        if (sk) {
            const c = beastSkillCategories[sk.cat];
            return `<div class="beast-skill-slot"><span style="color:${c.color};">${c.icon}${c.name}</span> 第 ${slot + 1} 欄【${sk.name}】<br><span style="color:#9ca3af;">${describeBeastSkill(sk)}</span></div>`;
        }
        if (b.level < lv) return `<div class="beast-skill-slot" style="color:#6b7280;">第 ${slot + 1} 欄・Lv${lv} 解鎖</div>`;
        const picking = beastPickerSlot[b.id] === slot;
        return `<div class="beast-skill-slot" style="border-color: var(--accent);">第 ${slot + 1} 欄・可領悟
            <button class="beast-pick-btn ${picking ? 'on' : ''}" onclick="toggleBeastPicker('${b.id}', ${slot})">${picking ? '▲ 收起選單' : '📖 選擇技能'}</button></div>`;
    }).join('');

    let picker = '';
    const slot = beastPickerSlot[b.id];
    if (typeof slot === 'number' && !b.skills[slot] && b.level >= BEAST_SKILL_LEVELS[slot]) {
        picker = `<div class="beast-picker"><div class="beast-picker-title">第 ${slot + 1} 欄：展開類別，點一招領悟</div>` + Object.keys(beastSkillCategories).map(cat => {
            const c = beastSkillCategories[cat];
            const list = beastSkills.filter(s => s.cat === cat);
            const ok = list.filter(s => s.minLv <= b.level && !learnedIds.includes(s.id)).length;
            const items = list.map(s => {
                const learned = learnedIds.includes(s.id), locked = s.minLv > b.level;
                const why = learned ? '已領悟' : locked ? `需 Lv${s.minLv}` : `Lv${s.minLv}`;
                return `<button class="beast-skill-opt" ${learned || locked ? 'disabled' : ''} onclick="learnBeastSkill('${b.id}', ${slot}, '${s.id}')">
                    <b>${s.name}</b><span class="bso-lv">${why}</span><br><span class="bso-desc">${describeBeastSkill(s)}</span></button>`;
            }).join('');
            return `<details class="beast-skill-cat"><summary><span style="color:${c.color};">${c.icon} ${c.name}</span>
                <small>${c.desc}｜可選 ${ok} / ${list.length}</small></summary><div class="beast-skill-list">${items}</div></details>`;
        }).join('') + `</div>`;
    }

    const notice = b.skillsRevamped ? `<div class="beast-revamp">📢 靈寵技能已全面改版（控制、攻擊、增益、治療、淨化共 50 招），舊技能已清除，請重新選擇。</div>` : '';
    const reset = learnedIds.length ? `<button class="beast-reset-btn" onclick="resetBeastSkills('${b.id}')">🔄 重新領悟全部技能（${BEAST_SKILL_RESET_CORE.toWan()} 獸丹）</button>` : '';
    return notice + rows + picker + reset;
}

function toggleBeastPicker(id, slot) {
    beastPickerSlot[id] = beastPickerSlot[id] === slot ? undefined : slot;
    renderBeasts();
}

async function learnBeastSkill(id, slot, skillId) {
    let b = player.beasts.find(x => x.id === id);
    let sk = getBeastSkill(skillId);
    if (!b || !sk || b.skills[slot] || b.level < BEAST_SKILL_LEVELS[slot]) return;
    if (sk.minLv > b.level) { gameAlert(`【${sk.name}】需要靈寵 Lv${sk.minLv} 才能領悟。`); return; }
    if (b.skills.includes(skillId)) { gameAlert(`這隻靈寵已經會【${sk.name}】了。`); return; }
    if (!(await gameConfirm(`確定讓【${getBeastName(b)}】在第 ${slot + 1} 欄領悟【${beastSkillCategories[sk.cat].name}】${sk.name}？\n${describeBeastSkill(sk)}\n\n之後要更換，需花 ${BEAST_SKILL_RESET_CORE.toWan()} 獸丹重新領悟全部技能。`))) return;
    b.skills[slot] = skillId;
    delete b.skillsRevamped;
    beastPickerSlot[id] = undefined;
    addLog(`🐾 靈寵【${getBeastName(b)}】領悟了${beastSkillCategories[sk.cat].icon}【${sk.name}】！`, "skill");
    renderBeasts();
}

// 重新領悟：清空這隻靈寵的全部技能欄（花獸丹），之後可重新挑選
async function resetBeastSkills(id) {
    let b = player.beasts.find(x => x.id === id);
    if (!b || !b.skills.some(Boolean)) return;
    if (player.beastCore < BEAST_SKILL_RESET_CORE) { gameAlert(`獸丹不足！重新領悟需要 ${BEAST_SKILL_RESET_CORE.toWan()} 獸丹。`); return; }
    if (!(await gameConfirm(`花費 ${BEAST_SKILL_RESET_CORE.toWan()} 獸丹，清除【${getBeastName(b)}】已領悟的全部技能並重新挑選？`))) return;
    player.beastCore -= BEAST_SKILL_RESET_CORE;
    b.skills = BEAST_SKILL_LEVELS.map(() => null);
    addLog(`🐾 靈寵【${getBeastName(b)}】遺忘了所有技能，可重新領悟。`, "skill");
    renderBeasts();
    updateUI();
}
