// 懸賞榜與一對一對決（ARCHITECTURE.md 第 36 節），設定在 config-bounty.js
//   存檔：player.bountyBoard（當期 6 名）、bountyRefreshAt、bountyFaction（榜單列的是哪個陣營）、activeBountyIds（已接取，可多名）、bountyKills
//   執行期（不存檔，state.js）：inBountyDuel、duelOpponent、duelWeakenTimer/duelWeakenMult、duelSilenceTimer、duelArmorTimer
// 流程：活動「獵殺邪修」→ 接取懸賞 → 野外每刷新一波有 BOUNTY_ENCOUNTER_CHANCE 機率遇上（combat.js 呼叫 tryStartBountyDuel）
//       → combatTick 由 bountyDuelTick 接管，直到一方倒下、對方遁走或玩家換地圖逃離

// ---- 懸賞人物的數值 ----
function getBountyRefSectMult(realmIndex) {
    let mult = BOUNTY_REF_SECT_MULT[0].mult;
    BOUNTY_REF_SECT_MULT.forEach(t => { if (realmIndex >= t.minRealm) mult = t.mult; });
    return mult;
}

// 攻擊力：同境界同階數、修為圓滿的修士基礎戰力（getBasePower 同曲線）× 該境界一般宗門倍率 × 天榜倍率 × 各榜比例
// 氣血：攻擊力 × 20（與玩家的氣血公式同比例）
// 新制（第 52 節）：攻擊＝同境界同階數「一般玩家」的普攻 × bountyAtkMult × √強度、氣血＝一般玩家氣血 × bountyHpMult × 強度（強度見 config-bounty.js 的 BOUNTY_STR_RANGE）
function getBountyStats(entry) {
    let r = entry.realmIndex, s = entry.stage;
    if (typeof NUMERIC_V2 !== 'undefined' && NUMERIC_V2) {   // gm.html 也載入本檔但沒有新制檔案
        // 強度倍率 m（config-bounty.js 的 BOUNTY_STR_RANGE，刷榜時存進 entry.str；舊榜單沒有就取該榜中間值）：氣血 × m、攻擊 × √m
        let L = nv2Level(r, s), m = getBountyStrMult(entry);
        return { attack: Math.round(nv2TypNormal(L) * NV2.bountyAtkMult * Math.sqrt(m) * 100) / 100, hp: Math.round(nv2TypHp(L) * NV2.bountyHpMult * m) };
    }
    let base = Math.pow(10, r) * 5 * s + (r === 0 ? 1 : 2 * Math.pow(10, r)) * s;
    let rank = BOUNTY_RANKS[entry.rank];
    let attack = Math.floor(base * getBountyRefSectMult(r) * BOUNTY_TIAN_MULT * rank.ratio);
    return { attack, hp: attack * 20 };
}

function getBountyStrMult(entry) {
    if (typeof entry.str === 'number') return entry.str;
    const [lo, hi] = BOUNTY_STR_RANGE[entry.rank] || [1, 1];
    return (lo + hi) / 2;
}
function rollBountyStr(rank) {
    const [lo, hi] = BOUNTY_STR_RANGE[rank] || [1, 1];
    return Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;
}

function getBountyNpc(entry) {
    return (bountyRoster[entry.faction] || []).find(n => n.id === entry.npcId) || null;
}

function getBountyIcon(entry) {
    let npc = getBountyNpc(entry);
    return (BOUNTY_ICONS[entry.faction] || BOUNTY_ICONS["邪"])[npc ? npc.gender : "male"];
}

// ---- 榜單刷新（每 BOUNTY_REFRESH_HOURS 小時；陣營改變時立即換成對應陣營的榜單）----
function refreshBountyIfDue(force) {
    let foe = getOpposingFaction(getPlayerFaction());
    let now = Date.now();
    player.bountyRefreshAt = clampRefreshAt(player.bountyRefreshAt, BOUNTY_REFRESH_HOURS);   // 時間軸保護（ui.js）
    let factionChanged = player.bountyFaction && player.bountyFaction !== foe;
    if (!force && !factionChanged && player.bountyRefreshAt && now < player.bountyRefreshAt
        && Array.isArray(player.bountyBoard) && player.bountyBoard.length > 0) {
        return false;
    }
    player.bountyBoard = rollBountyBoard(foe);
    player.bountyFaction = foe;
    player.activeBountyIds = [];
    player.bountyRefreshAt = now + BOUNTY_REFRESH_HOURS * 3600 * 1000;
    addLog(factionChanged
        ? `📜 你的陣營已改變，懸賞榜改列 ${getFactionLabel(foe)} 人物！`
        : `📜 懸賞榜已更新，${player.bountyBoard.length} 名${getFactionLabel(foe)}人物上榜！`, "system");
    return true;
}

// 付費立即刷新：重抽 6 名（追蹤中的懸賞會取消），定時刷新的時間軸不變
function paidRefreshBounty() {
    if (inBountyDuel) { alert("對決進行中，無法刷新懸賞榜！"); return; }
    // 次數或靈石不足就不必先問要不要取消追蹤（payForRefresh 會跳對應提示）
    let canPay = getPaidRefreshLeft('bounty', BOUNTY_PAID_REFRESH_DAILY) > 0 && (player.coins || 0) >= BOUNTY_PAID_REFRESH_COST;
    if (canPay && getActiveBounties().length && !confirm("刷新後，目前追蹤中的懸賞會一併取消。確定要刷新嗎？")) return;
    if (!payForRefresh('bounty', BOUNTY_PAID_REFRESH_COST, BOUNTY_PAID_REFRESH_DAILY, '懸賞榜')) return;
    let keepAt = player.bountyRefreshAt;
    refreshBountyIfDue(true);
    if (keepAt > Date.now()) player.bountyRefreshAt = keepAt;
    addLog(`💰 花費 ${BOUNTY_PAID_REFRESH_COST.toWan()} 靈石，懸賞榜提前換上新名單。`, "system");
    updateUI();
    renderEvilHunt();
}

function rollBountyBoard(faction) {
    let pool = (bountyRoster[faction] || []).slice();
    let set = BOUNTY_SKILL_SETS[faction];
    let board = [];
    BOUNTY_RANK_ORDER.forEach(rank => {
        for (let i = 0; i < BOUNTY_RANKS[rank].count && pool.length > 0; i++) {
            let npc = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
            // 以「階」為單位偏移（1 境 = 10 階），落點換回大境界＋小境界
            let minStep = Math.round(BOUNTY_REALM_OFFSET_MIN * 10), maxStep = Math.round(BOUNTY_REALM_OFFSET_MAX * 10);
            let pos = player.realmIndex * 10 + (player.stage - 1) + minStep + Math.floor(Math.random() * (maxStep - minStep + 1));
            pos = Math.max(0, Math.min(realms.length * 10 - 1, pos));
            let extra = set.pool.slice().sort(() => Math.random() - 0.5).slice(0, 2);
            board.push({
                id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
                npcId: npc.id,
                faction,
                rank,
                realmIndex: Math.floor(pos / 10),
                stage: pos % 10 + 1,
                element: wuxingElements[Math.floor(Math.random() * wuxingElements.length)],
                affix: MONSTER_AFFIX_TYPES[Math.floor(Math.random() * MONSTER_AFFIX_TYPES.length)],
                skills: set.fixed.concat(extra),
                str: rollBountyStr(rank),   // 新制強度倍率（getBountyStats）
                status: "open"   // open／done
            });
        }
    });
    return board;
}

// 追蹤中的懸賞 id 清單（2026-09-27 起可同時追蹤多名）；舊存檔的單一 activeBountyId 在這裡轉換
function getTrackedBountyIds() {
    if (!Array.isArray(player.activeBountyIds)) player.activeBountyIds = [];
    if (player.activeBountyId) {
        if (!player.activeBountyIds.includes(player.activeBountyId)) player.activeBountyIds.push(player.activeBountyId);
        delete player.activeBountyId;
    }
    return player.activeBountyIds;
}

// 追蹤中、尚未伏誅的懸賞
function getActiveBounties() {
    let ids = getTrackedBountyIds();
    return (player.bountyBoard || []).filter(b => ids.includes(b.id) && b.status === "open");
}

function acceptBounty(id) {
    refreshBountyIfDue();
    let entry = (player.bountyBoard || []).find(b => b.id === id);
    if (!entry || entry.status !== "open") return;
    let ids = getTrackedBountyIds();
    if (!ids.includes(id)) ids.push(id);
    let npc = getBountyNpc(entry);
    addLog(`📜 接取懸賞：【${BOUNTY_RANKS[entry.rank].name}】${npc.title}・${npc.name}（${realms[entry.realmIndex]} ${entry.stage}階）。前往野外歷練，便有機會遇上此人！`, "quest");
    renderEvilHunt();
}

// 一次接取榜上所有尚未伏誅、尚未追蹤的懸賞
function acceptAllBounties() {
    refreshBountyIfDue();
    let ids = getTrackedBountyIds();
    let add = (player.bountyBoard || []).filter(b => b.status === "open" && !ids.includes(b.id));
    if (!add.length) return;
    add.forEach(b => ids.push(b.id));
    addLog(`📜 一次接取 ${add.length} 份懸賞：${add.map(b => { let npc = getBountyNpc(b); return npc ? npc.name : '?'; }).join('、')}。前往野外歷練，便有機會遇上其中一人！`, "quest");
    renderEvilHunt();
}

// id 不給 = 放棄全部追蹤
function abandonBounty(id) {
    if (inBountyDuel) { alert("對決進行中，無法放棄懸賞！"); return; }
    let ids = getTrackedBountyIds();
    player.activeBountyIds = id ? ids.filter(x => x !== id) : [];
    addLog(id ? `📜 你放棄了一份追蹤中的懸賞。` : `📜 你放棄了所有追蹤中的懸賞。`, "system");
    renderEvilHunt();
}

// ---- 懸賞榜畫面（嵌在獵殺邪修視窗內，merit.js 的 renderEvilHunt）----
function renderBountyBoard() {
    refreshBountyIfDue();
    let myAtk = Math.max(1, getPhysAttack());
    let myHp = Math.max(1, getMaxHp());
    let ids = getTrackedBountyIds();
    let cards = (player.bountyBoard || []).map(entry => {
        let npc = getBountyNpc(entry);
        if (!npc) return '';
        let rank = BOUNTY_RANKS[entry.rank];
        let st = getBountyStats(entry);
        let done = entry.status === "done";
        let tracking = ids.includes(entry.id) && !done;
        let ratio = st.attack / myAtk;
        let ratioColor = ratio >= 1.5 ? '#f87171' : ratio >= 0.8 ? '#facc15' : '#4ade80';
        let skillNames = entry.skills.map(k => bountySkills[k] ? bountySkills[k].name : k).join('、');
        let affix = combatAttrInfo[entry.affix];
        let btn = done ? `<button class="shop-btn" disabled>☠️ 已伏誅</button>`
            : tracking ? `<button class="shop-btn" disabled>🔍 追蹤中（野外歷練時可能遇上）</button>
                          <button class="sys-btn" style="margin-top: 4px;" onclick="abandonBounty('${entry.id}')">放棄懸賞</button>`
            : `<button class="shop-btn" onclick="acceptBounty('${entry.id}')">📜 接取懸賞</button>`;
        return `
            <div class="card bounty-card" style="border-color: ${done ? 'rgba(255,255,255,0.07)' : tracking ? 'var(--accent)' : rank.color}; opacity: ${done ? 0.45 : 1};">
                <div class="bounty-rank" style="color: ${rank.color};">${rank.icon} ${rank.name}</div>
                <h3 style="margin: 4px 0;">${getBountyIcon(entry)} ${npc.name}</h3>
                <p style="font-size: 0.8em; color: #9ca3af; margin: 0;">「${npc.title}」・${npc.gender === 'female' ? '女' : '男'}・${getFactionLabel(entry.faction)}</p>
                <p style="font-size: 0.85em; color: var(--accent); margin: 6px 0 2px;">${realms[entry.realmIndex]} ${entry.stage}階${NUMERIC_V2 ? `・<span style="color: ${rank.color};">強度 ×${getBountyStrMult(entry).toFixed(1)}</span>` : ''}</p>
                <p style="font-size: 0.78em; margin: 2px 0;">攻擊 ${formatShortCombat(st.attack)}（<span style="color: ${ratioColor};">你的 ${ratio >= 100 ? '100+' : ratio.toFixed(1)} 倍</span>）｜氣血 ${formatShortCombat(st.hp)}（你的 ${(st.hp / myHp).toFixed(1)} 倍）</p>
                <p style="font-size: 0.75em; color: #9ca3af; margin: 2px 0;">🛡️減傷 ${rank.def}% 💨閃避 ${rank.eva}% ${affix ? affix.icon + affix.label + ' ' + rank.affix + '%' : ''} 五行 ${entry.element}</p>
                <p style="font-size: 0.75em; color: #fca5a5; margin: 2px 0 6px;">武學：${skillNames}</p>
                ${btn}
            </div>`;
    }).join('');
    return `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; margin: 12px 0 8px; font-size: 0.86em;">
            <span style="color: #9ca3af;">每 ${BOUNTY_REFRESH_HOURS} 小時刷新</span>
            <span style="color: var(--accent);">下次刷新：${formatCountdown(player.bountyRefreshAt - Date.now())}</span>
        </div>
        ${renderPaidRefreshButton('bounty', BOUNTY_PAID_REFRESH_COST, BOUNTY_PAID_REFRESH_DAILY, 'paidRefreshBounty')}
        ${renderBountyBulkButtons()}
        <div class="grid-container">${cards}</div>`;
}

// 一次接取全部／放棄全部追蹤（榜單上方）
function renderBountyBulkButtons() {
    let ids = getTrackedBountyIds();
    let open = (player.bountyBoard || []).filter(b => b.status === "open");
    let untracked = open.filter(b => !ids.includes(b.id)).length;
    let tracked = open.length - untracked;
    if (!open.length) return '';
    return `
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 4px 0 10px;">
            ${untracked ? `<button class="shop-btn" style="width: auto; padding: 6px 16px;" onclick="acceptAllBounties()">📜 一次接取全部（${untracked} 份）</button>` : ''}
            ${tracked ? `<button class="sys-btn" style="width: auto; padding: 6px 16px;" onclick="abandonBounty()">放棄全部追蹤（${tracked} 份）</button>` : ''}
        </div>
        ${tracked > 1 ? `<p style="text-align: center; font-size: 0.78em; color: #9ca3af; margin: 0 0 8px;">追蹤 ${tracked} 份懸賞：野外遇上的機率不變，遇上時從追蹤中隨機一人現身</p>` : ''}`;
}

// ---- 對決 ----
// combat.js 在野外刷新新一波之前呼叫；遇上懸賞目標就開打並回傳 true（本波不刷妖獸）
function tryStartBountyDuel() {
    if (inBountyDuel || inTribulation || player.currentMapIsSafe) return false;
    let list = getActiveBounties();
    // 每波機率乘 getWaveChanceMult()（combat.js）：怪物刷新變慢、波數變少，遇上的平均時間維持原設計（config-maps.js）
    // 同時追蹤多名時機率不變（不會因為接越多遇越快），遇上時隨機其中一人
    if (!list.length || Math.random() >= BOUNTY_ENCOUNTER_CHANCE * getWaveChanceMult()) return false;
    startBountyDuel(list[Math.floor(Math.random() * list.length)]);
    return true;
}

function startBountyDuel(entry) {
    let npc = getBountyNpc(entry);
    let rank = BOUNTY_RANKS[entry.rank];
    let st = getBountyStats(entry);
    let attrs = { def: rank.def, eva: rank.eva, ice: 0, fire: 0, poison: 0, metal: 0, thunder: 0, element: entry.element,
                  nature: entry.faction === "邪" ? "dark" : "light",   // 光暗互剋（config-elements.js）
                  race: entry.faction === "邪" ? "demon" : null };   // 邪派懸賞＝魔修（種族剋制，race.js），正派＝人修無種族
    attrs[entry.affix] = rank.affix;
    if (NUMERIC_V2) attrs.evaPen = nv2TypHit(nv2Level(entry.realmIndex, entry.stage));   // 同階一般玩家的命中，抵銷玩家閃避（numeric.js）
    applyRaceTraits(attrs);   // 種族特性：邪派＝魔修吸血（race.js）

    enemies = [];
    respawnTimer = 0;
    clearDuelDebuffs();
    playerStatus = newStatus();
    resetGearWave();   // 首擊、先手盾（gear.js）
    inBountyDuel = true;
    let look = CULTIVATOR_IMGS[entry.faction];   // 戰場實況的圖：與野外修士同一張（config-merit.js，邪修＝魔道修士、正道＝正道修士）
    duelOpponent = {
        entryId: entry.id,
        name: npc.name, title: npc.title, faction: entry.faction, rank: entry.rank,
        icon: getBountyIcon(entry),
        img: look ? look.img : undefined, imgPos: look ? look.pos : undefined,
        attack: st.attack, maxHp: st.hp, hp: st.hp,
        attrs, status: newStatus(),
        skills: entry.skills, skillChance: rank.skillChance,
        turn: 0
    };
    addLog(`⚔️ 【懸賞對決】${rank.name}「${npc.title}」${npc.name}（${realms[entry.realmIndex]} ${entry.stage}階）現身攔路！生死一戰，就在此刻！`, "reincarnate");
    document.getElementById('combat-status').innerText = `⚔️ 懸賞對決：${npc.name}`;
    document.getElementById('combat-status').style.color = 'var(--reincarnate-color)';
    updateUI();
}

function clearDuelDebuffs() {
    duelWeakenTimer = 0; duelWeakenMult = 1;
    duelSilenceTimer = 0;
    duelArmorTimer = 0;
}

// 化功：stats.js 的 getPhysAttack／getMagAttack 乘上此倍率
function getDuelWeakenMult() {
    return inBountyDuel && duelWeakenTimer > 0 ? duelWeakenMult : 1;
}

// 破甲：elements.js 的 getPlayerCombatAttrs 減傷與閃避乘上此倍率
function getDuelArmorMult() {
    return inBountyDuel && duelArmorTimer > 0 ? 0.5 : 1;
}

// 由 combatTick() 每秒呼叫（對決期間接管整個戰鬥流程，結構同 tribulation.js 的 tribulationTick）
function bountyDuelTick() {
    let opp = duelOpponent;
    if (!opp) { inBountyDuel = false; return; }
    opp.turn++;

    checkAutoHealAndMana();
    petPreTurn();   // 靈寵淨化技能的持續淨化（beast-combat.js）

    // ---- 玩家回合 ----
    let selfTick = tickStatus(playerStatus);
    if (selfTick.dot > 0) {
        player.hp -= selfTick.dot;
        addLog(`🩸 身上的異常狀態發作，損失 ${selfTick.dot.toWan()} 點氣血！`, "combat");
        if (player.hp <= 0 && !tryGearUndying()) { endBountyDuel("lose"); return; }
    }
    let tags = [];
    if (selfTick.frozen) {
        addLog(`❄️ 你被${opp.name}定住，本回合無法行動！`, "combat");
    } else {
        if (duelSilenceTimer > 0) addLog(`🔇 你被封印，只能以普通攻擊迎敵！`, "combat");
        playerAttackTurn(duelSilenceTimer > 0 ? [] : getAllSkills(), [opp], tags);
        artifactSkillTurn([opp], tags);   // 神器專屬技能：屬於法寶，封印擋不住（artifact.js）
        professionSkillTurn([opp], tags); // 職業技能（profession.js）
        partnerSkillTurn([opp], tags);    // 出戰夥伴絕學（partner.js）：夥伴不受封印影響
    }
    // 負面狀態以「你的回合」計算持續時間
    if (duelWeakenTimer > 0) duelWeakenTimer--;
    if (duelSilenceTimer > 0) duelSilenceTimer--;
    if (duelArmorTimer > 0) duelArmorTimer--;

    petAssistTick([opp]);

    let oppTick = tickStatus(opp.status);
    opp.hp -= oppTick.dot;
    battleFxDot(oppTick, false);   // 戰鬥面板：燒傷／中毒飄字（battle-fx.js）
    let regen = applyRootRegen() + applyGearRegen();
    if (tags.length > 0 || oppTick.dot > 0 || regen > 0) {
        addLog(`✨ 屬性效果：${[tags.length ? summarizeTags(tags, `💨被${opp.name}閃避`) : '',
            oppTick.dot ? `${opp.name}受持續傷害 ${fmtCombat(oppTick.dot)}` : '',
            regen ? `🌿回復 ${regen.toWan()}` : ''].filter(Boolean).join("｜")}`, "skill");
    }
    if (opp.hp <= 0) { endBountyDuel("win"); return; }
    if (opp.turn >= BOUNTY_MAX_TURNS) { endBountyDuel("escape"); return; }

    // ---- 對方回合 ----
    if (oppTick.frozen) {
        addLog(`❄️ ${opp.name}被凍結，本回合無法出手！`, "skill");
        updateUI();
        return;
    }
    let dmgMult = petEnemyAtkMult(opp);   // 被靈寵削弱（beast-combat.js）
    let sk = null;
    if (petIsSilenced(opp)) {
        // 被靈寵封印：本回合只能普攻
    } else if (Math.random() < opp.skillChance) {
        sk = bountySkills[opp.skills[Math.floor(Math.random() * opp.skills.length)]];
        if (sk.mult) dmgMult *= sk.mult;
        if (sk.type === "weaken") {
            duelWeakenTimer = sk.duration; duelWeakenMult = sk.weaken;
        } else if (sk.type === "silence") {
            duelSilenceTimer = sk.duration;
        } else if (sk.type === "armor") {
            duelArmorTimer = sk.duration;
        } else if (sk.type === "heal") {
            let heal = Math.min(opp.maxHp - opp.hp, opp.maxHp * sk.heal);
            opp.hp += heal;
        } else if (sk.type === "drain") {
            let drained = Math.min(player.mp, player.maxMp * sk.drain);
            player.mp -= drained;
        }
        addLog(`${opp.icon} ${opp.name}${sk.msg}`, "combat");
    }

    let r = resolveHit(opp.attack * dmgMult, { attrs: opp.attrs, power: opp.attack }, { attrs: getPlayerCombatAttrs(), status: playerStatus });
    // 施展武學時算術法、一般攻擊算物理（金身／化勁）；反震、閃擊反擊（gear.js）
    let dealt = applyPetDamageReduction(applyGearDefense(r, opp, !!sk, r.tags), r);   // 護盾＋最低傷害保底（beast-combat.js）
    player.hp -= dealt;
    opp.hp = Math.min(opp.maxHp, opp.hp + raceLifestealHeal(opp.attrs, dealt));   // 種族特性：魔修吸血（race.js）
    battleFxHurt(dealt, r.tags.includes("dodge"), r.tags);   // 戰鬥面板飄字（battle-fx.js）
    if (sk && dealt > 0) {
        if (sk.type === "lifesteal") opp.hp = Math.min(opp.maxHp, opp.hp + dealt * sk.steal);
        if (sk.type === "poison" && !getAptitudeSpecial().poisonImmune) {   // 萬毒不侵體（aptitude.js）
            for (let i = 0; i < sk.stacks; i++) playerStatus.poison = addDotStack(playerStatus.poison, POISON_MAX_STACKS, POISON_TURNS, opp.attack * POISON_RATE);
        }
        if (sk.type === "freeze") playerStatus.frozen = Math.max(playerStatus.frozen, FREEZE_TURNS);
    }
    if (r.tags.length > 0) addLog(`${opp.icon} ${opp.name}攻勢：${summarizeTags(r.tags, "💨你閃避了")}`, "combat");

    if (player.hp <= 0 && !tryGearUndying()) { endBountyDuel("lose"); return; }
    updateUI();
}

// result：win 斬殺／lose 戰死／escape 對方遁走（回合上限）／flee 玩家換地圖逃離
function endBountyDuel(result) {
    let opp = duelOpponent;
    inBountyDuel = false;
    duelOpponent = null;
    clearDuelDebuffs();
    playerStatus = newStatus();
    if (!opp) return;
    let entry = (player.bountyBoard || []).find(b => b.id === opp.entryId);
    let rank = BOUNTY_RANKS[opp.rank];

    if (result === "win") {
        if (opp.attrs && opp.attrs.race) addRaceKill(opp.attrs.race, 1);   // 斬妖錄（race.js）
        if (entry) entry.status = "done";
        player.activeBountyIds = getTrackedBountyIds().filter(x => x !== opp.entryId);
        let merit = Math.floor((BOUNTY_MERIT_MIN + Math.floor(Math.random() * (BOUNTY_MERIT_MAX - BOUNTY_MERIT_MIN + 1)))
                               * (1 + gearFx("積德")));   // 積德（裝備特效，gear.js）
        player.merit = (player.merit || 0) + merit;
        player.bountyKills = (player.bountyKills || 0) + 1;
        player.evilKills = (player.evilKills || 0) + 1;
        addKarma(opp.faction === "邪" ? rank.karma : -rank.karma);
        let how = getPlayerFaction() === "邪" ? `吸取其一身功德 ${merit.toWan()} 點` : `積累功德 ${merit.toWan()} 點`;
        let bountyCoins = grantBountyCoins(opp.rank);   // 懸賞賞金（economy.js：H 的 30／15／5 分鐘）
        addLog(`🏆 【懸賞伏誅】${rank.name}「${opp.title}」${opp.name}授首！${how}${bountyCoins ? `，領得賞金 ${bountyCoins.toWan()} 靈石` : ''}！（功德 ${player.merit.toWan()}）`, "level-up");
        settleMeritStones();
        // 星允鐵與奪寶（enhance.js／gear.js）：依榜給星允鐵、必掉一件奪寶裝備
        let ironRange = IRON_BOUNTY_AMOUNT[opp.rank];
        if (ironRange) addStarIron(randInt(ironRange[0], ironRange[1]), `從${opp.name}的遺物中取得星允鐵`);
        gainProficiency(PROF_BOUNTY_GAIN);   // 主修職業熟練度（profession.js）
        let loot = tryLootDrop(opp.rank);
        if (loot) addLog(loot, "equip");
        // 天榜：鍛造圖紙（Lv.1500 以上，equipment.js）
        if (opp.rank === "tian") { let bp = grantBlueprint(BLUEPRINT_DROPS.tian, `從${opp.name}的遺物中`); if (bp) addLog(bp, "level-up"); }
        respawnTimer = 3;
        refreshCombatStatusText();
        updateUI();
    } else if (result === "lose") {
        addLog(`💀 【懸賞對決落敗】你倒在${opp.name}手下……（懸賞仍在，養好傷可再尋此人）`, "combat");
        onPlayerKilledInField();
    } else if (result === "escape") {
        addLog(`💨 久戰不下，${opp.name}見勢不妙化作遁光逃走了！（懸賞仍在，可再遇上）`, "combat");
        respawnTimer = 3;
        refreshCombatStatusText();
        updateUI();
    } else {
        addLog(`🏃 你捨棄對決，逃離了${opp.name}的追殺！（懸賞仍在）`, "combat");
    }
}
