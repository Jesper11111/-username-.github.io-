// 渡劫：小境界滿 10 階後，擊敗心魔才能晉升下一個大境界
// 勝敗由開打前的「勝算」擲骰決定（基礎 60%，丹藥與宗門技能最多各 +10%，上限 80%；
// 持有破障丹時自動服用 1 顆：再 +10%、上限 90%、心魔戰力 -10%，見 config-merit.js；
// 合體期起每高一境基礎再 -5%、最多 -30%，見 getTribulationHardPenalty()），
// 戰鬥過程照常進行；若戰況與天命相反，會在關鍵一刻以「絕處逢生／心魔反噬」收尾。
// 數值見 config-tribulation.js

// 計算目前的渡劫勝算與各項加成（渡劫按鈕與確認視窗共用）
function getTribulationChance() {
    // 丹藥：必須開啟自動補血才會在渡劫中服用，否則不計
    let healStock = 0;
    if (player.autoHp.enabled) {
        shopItems.filter(s => s.type === 'heal').forEach(s => { healStock += s.amount * (player.bag[s.id] || 0); });
    }
    let potion = TRIBULATION_POTION_BONUS * Math.min(1, healStock / TRIBULATION_POTION_FULL_STOCK);

    // 技能：目前境界已開放的宗門階段中，已學會的比例
    let openTiers = sectData.filter(cat => player.realmIndex >= cat.minRealm).map(cat => cat.tier);
    let learnedTiers = openTiers.filter(t => player.sectSkills && player.sectSkills[t]);
    let skill = openTiers.length > 0 ? TRIBULATION_SKILL_BONUS * learnedTiers.length / openTiers.length : 0;

    // 破障丹：持有時渡劫會自動服用 1 顆，勝算 +10% 且上限提高到 90%（config-merit.js）
    let hasPill = (player.breakPills || 0) > 0;
    let pill = hasPill ? BREAK_PILL_CHANCE_BONUS : 0;
    let cap = hasPill ? BREAK_PILL_MAX_CHANCE : TRIBULATION_MAX_CHANCE;

    let hard = getTribulationHardPenalty();
    let apt = getAptitudeSpecial().trib;   // 先天資質：偽靈根 −5%、天雷之體 +5%（aptitude.js）
    let core = getCoreTribBonus();          // 化神：人元嬰 −10%、天元嬰 +10%（golden-core.js）
    let fruit = willUseSpiritFruit() ? SPIRIT_FRUIT.trib : 0;   // 化神靈果（天材地寶）
    let total = Math.max(0, Math.min(cap, TRIBULATION_BASE_CHANCE - hard + potion + skill + pill + apt + core + fruit));
    return { total, cap, base: TRIBULATION_BASE_CHANCE, hard, potion, skill, pill, apt, core, fruit, hasPill, openTiers: openTiers.length, learnedTiers: learnedTiers.length };
}

// 合體期起天劫加劇：基礎勝算的扣除量（未達合體為 0）
function getTribulationHardPenalty() {
    if (player.realmIndex < TRIBULATION_HARD_REALM_INDEX) return 0;
    let steps = player.realmIndex - TRIBULATION_HARD_REALM_INDEX + 1;
    return Math.min(TRIBULATION_HARD_PENALTY_MAX, steps * TRIBULATION_HARD_PENALTY_PER_REALM);
}

function formatChance(rate) { return `${Math.round(rate * 100)}%`; }

function triggerTribulation() {
    if (!player.pendingTribulation) {
        alert("目前修為尚未圓滿，無需渡劫。\n（小境界修練至 10 階且經驗滿格時，才會引來天劫）");
        return;
    }
    if (inTribulation) return;
    if (inBountyDuel) { alert("正在與懸賞人物對決，無法分心渡劫！"); return; }

    let chance = getTribulationChance();
    let demonPower = Math.floor(getPhysAttack() * HEART_DEMON_POWER_MULT * (1 + chance.hard) * (chance.hasPill ? BREAK_PILL_DEMON_POWER_MULT : 1));
    let demonHp = Math.floor(getMaxHp() * HEART_DEMON_HP_MULT);

    let tips = "";
    if (!player.autoHp.enabled) tips += "\n・開啟【自動補血】並備妥氣血丹藥，最多可再 +10%";
    else if (chance.potion < TRIBULATION_POTION_BONUS) tips += `\n・再多備氣血丹藥（約 10 顆九轉還魂丹即可拿滿），最多可再 +${formatChance(TRIBULATION_POTION_BONUS - chance.potion)}`;
    if (chance.skill < TRIBULATION_SKILL_BONUS) tips += `\n・拜入目前可加入的宗門學得技能，最多可再 +${formatChance(TRIBULATION_SKILL_BONUS - chance.skill)}`;
    // 沒把握（未帶破障丹）時提醒可準備破障丹
    if (!chance.hasPill && isMeritSystemOpen()) tips += `\n・🔮 沒把握？可至千寶閣以七彩補天石購買【破障丹】：心魔戰力 -10%、勝算 +10%（上限提高到 ${formatChance(BREAK_PILL_MAX_CHANCE)}）`;

    if (!confirm(
        `即將渡劫，晉升【${realms[player.realmIndex + 1]}】！\n\n`
        + `【渡劫勝算：${formatChance(chance.total)}】（上限 ${formatChance(chance.cap)}）\n`
        + `・基礎 ${formatChance(chance.base)}\n`
        + (chance.hard > 0 ? `・⚡ 合體期後天劫加劇 -${formatChance(chance.hard)}（心魔戰力 +${formatChance(chance.hard)}）\n` : '')
        + `・丹藥準備 +${formatChance(chance.potion)}\n`
        + `・宗門技能 +${formatChance(chance.skill)}（已學 ${chance.learnedTiers} / ${chance.openTiers} 階）\n`
        + (chance.core ? `・👶 元嬰品級【${INFANT_GRADES[getGoldenCore().infant].name}】 ${chance.core > 0 ? '+' : '-'}${formatChance(Math.abs(chance.core))}\n` : '')
        + (chance.fruit ? `・${SPIRIT_FRUIT.icon} ${SPIRIT_FRUIT.name} +${formatChance(chance.fruit)}（將服用 1 顆，剩 ${player.spiritFruits - 1} 顆）\n` : '')
        + (chance.apt ? `・⛩️ 先天資質 ${chance.apt > 0 ? '+' : '-'}${formatChance(Math.abs(chance.apt))}\n` : '')
        + (chance.hasPill ? `・🔮 破障丹 +${formatChance(chance.pill)}（將服用 1 顆，剩 ${player.breakPills - 1} 顆；心魔戰力 -10%）\n` : '')
        + (tips ? `\n提升勝算：${tips}\n` : '')
        + `\n心魔戰力 ${demonPower.toWan()}／氣血 ${demonHp.toWan()}，會施展魔功並吸取靈力。\n`
        + `渡劫失敗會重傷跌回安全區並折壽 ${getDeathLifespanCost()} 年（剩餘 ${formatLifespan(player.lifespan)} 年，渡劫期間歲月流逝加快），靈寵也會陣亡；\n`
        + `且境界跌落 ${TRIBULATION_FAIL_STAGE_DROP} 階（10 階 → ${10 - TRIBULATION_FAIL_STAGE_DROP} 階），陷入「虛弱」（攻擊、氣血與靈力上限 -${Math.round((1 - WEAKNESS_STAT_MULT) * 100)}%）直到修回 10 階。\n\n是否開始渡劫？`
    )) return;

    if (chance.fruit) {
        player.spiritFruits--;
        addLog(`${SPIRIT_FRUIT.icon} 服下【${SPIRIT_FRUIT.name}】，元嬰靈光大盛，化神把握更增！（剩餘 ${player.spiritFruits} 顆）`, "level-up");
    }
    if (chance.hasPill) {
        player.breakPills--;
        addLog(`🔮 服下【破障丹】，靈台一片清明，心魔之力削弱一成！（剩餘 ${player.breakPills} 顆）`, "level-up");
    }

    enemies = [];
    respawnTimer = 0;
    inTribulation = true;
    tribulationFatedWin = Math.random() < chance.total;

    heartDemon = {
        name: "心魔",
        icon: HEART_DEMON_ICON,
        attack: demonPower,
        maxHp: demonHp,
        hp: demonHp,
        buffTimer: 0,
        buffMult: 1,
        attrs: getPlayerCombatAttrs(),   // 鏡像：與玩家相同的減傷/閃避/屬性傷害/五行（同五行不相剋）
        status: newStatus()
    };
    playerStatus = newStatus();
    resetGearWave();   // 首擊、先手盾（gear.js）

    addLog(`☯️ 【渡劫開始】天地變色，心魔自你識海中走出，化作與你一模一樣的魔身！（勝算 ${formatChance(chance.total)}｜戰力 ${demonPower.toWan()}／氣血 ${demonHp.toWan()}）`, "reincarnate");
    document.getElementById('combat-status').innerText = `☯️ 渡劫中：與心魔生死對決！`;
    document.getElementById('combat-status').style.color = 'var(--reincarnate-color)';
    updateUI();
}

// 由 combatTick() 每秒呼叫（渡劫期間會接管整個戰鬥流程）
function tribulationTick() {
    if (!heartDemon) { inTribulation = false; return; }

    checkAutoHealAndMana();

    // ---- 玩家回合：自身持續傷害 → 凍結判定 → 出手（與野外相同，範圍技也只打心魔）----
    let selfTick = tickStatus(playerStatus);
    if (selfTick.dot > 0) {
        player.hp -= selfTick.dot;
        addLog(`🩸 身上的異常狀態發作，損失 ${selfTick.dot.toWan()} 點氣血！`, "combat");
        if (player.hp <= 0 && !tryGearUndying()) { resolvePlayerFall(); return; }
    }

    let tags = [];
    if (selfTick.frozen) addLog(`❄️ 你被心魔凍結，本回合無法行動！`, "combat");
    else {
        playerAttackTurn(getAllSkills(), [heartDemon], tags);
        artifactSkillTurn([heartDemon], tags);   // 神器專屬技能（artifact.js）
        professionSkillTurn([heartDemon], tags); // 職業技能（profession.js）
        partnerSkillTurn([heartDemon], tags);    // 出戰夥伴絕學（partner.js）
    }

    // 靈寵協助（渡劫為一對一，群體技能也只打在心魔身上）
    petAssistTick([heartDemon]);

    // 心魔身上的燒傷/中毒發作
    let demonTick = tickStatus(heartDemon.status);
    heartDemon.hp -= demonTick.dot;
    battleFxDot(demonTick, false);   // 戰鬥面板：燒傷／中毒飄字（battle-fx.js）
    let regen = applyRootRegen() + applyGearRegen();
    if (tags.length > 0 || demonTick.dot > 0 || regen > 0) {
        addLog(`✨ 屬性效果：${[tags.length ? summarizeTags(tags, "💨被心魔閃避") : '',
            demonTick.dot ? `心魔受持續傷害 ${demonTick.dot.toWan()}` : '',
            regen ? `🌿回復 ${regen.toWan()}` : ''].filter(Boolean).join("｜")}`, "skill");
    }

    if (heartDemon.hp <= 0) {
        if (!tribulationFatedWin) {
            addLog(`🧍 心魔即將潰散之際，你心神一時失守，被心魔抓住破綻反噬！`, "combat");
            endTribulation(false);
            return;
        }
        endTribulation(true);
        return;
    }

    // ---- 心魔回合（被凍結則跳過）----
    if (demonTick.frozen) {
        addLog(`❄️ 心魔被凍結，本回合無法出手！`, "skill");
        updateUI();
        return;
    }
    if (heartDemon.buffTimer > 0) heartDemon.buffTimer--;
    let demonBase = heartDemon.attack * (heartDemon.buffTimer > 0 ? heartDemon.buffMult : 1);
    let demonDmg = demonBase;

    if (Math.random() < HEART_DEMON_SKILL_CHANCE) {
        let sk = heartDemonSkills[Math.floor(Math.random() * heartDemonSkills.length)];
        if (sk.type === "buff") {
            heartDemon.buffTimer = sk.duration;
            heartDemon.buffMult = sk.mult;
            addLog(`🧍 ${sk.msg}`, "combat");
        } else if (sk.type === "drain") {
            let drained = Math.min(player.mp, player.maxMp * sk.drain);
            player.mp -= drained;
            demonDmg = demonBase * sk.mult;
            addLog(`🧍 ${sk.msg}（靈力 -${Math.floor(drained)}）`, "combat");
        } else {
            demonDmg = demonBase * sk.mult;
            addLog(`🧍 ${sk.msg}`, "combat");
        }
    }

    // 心魔是你的鏡像，帶有與你相同的減傷/閃避/屬性傷害
    let r = resolveHit(demonDmg, { attrs: heartDemon.attrs, power: heartDemon.attack }, { attrs: getPlayerCombatAttrs(), status: playerStatus });
    let taken = applyGearDefense(r, heartDemon, true, r.tags);   // 心魔的魔功算術法（化勁）；反震、閃擊反擊（gear.js）
    if (r.tags.length > 0) addLog(`🧍 心魔攻勢：${summarizeTags(r.tags, "💨你閃避了")}`, "combat");
    let tribTaken = applyPetDamageReduction(taken);
    player.hp -= tribTaken;
    battleFxHurt(tribTaken, r.tags.includes("dodge"), r.tags);   // 戰鬥面板飄字（battle-fx.js）

    if (player.hp <= 0 && !tryGearUndying()) { resolvePlayerFall(); return; }

    updateUI();
}

// 玩家氣血歸零：依天命判定「絕處逢生」或「渡劫失敗」
function resolvePlayerFall() {
    if (tribulationFatedWin) {
        player.hp = 1;
        addLog(`⚡ 生死一線，你道心通明、絕處逢生，斬出最後一劍將心魔劈散！`, "level-up");
        endTribulation(true);
        return;
    }
    endTribulation(false);
}

// 渡劫失敗的境界懲罰：小境界掉 TRIBULATION_FAIL_STAGE_DROP 階（不低於 1 階，大境界不倒退）、修為歸零、
// 扣回這幾階升階時加的屬性（每階四維 +5、魅力 +2，見 leveling.js 的 gainExp），並進入虛弱
function applyTribulationFailDrop() {
    let drop = Math.min(TRIBULATION_FAIL_STAGE_DROP, player.stage - 1);
    player.stage -= drop;
    player.exp = 0;
    player.pendingTribulation = false;   // 不再是 10 階圓滿，要重新修回 10 階才能再渡劫
    ['str', 'con', 'int', 'spr'].forEach(k => { player.stats[k] = Math.max(1, player.stats[k] - 5 * drop); });
    player.stats.cha = Math.max(1, player.stats.cha - 2 * drop);
    player.weakened = true;
}

function endTribulation(success) {
    inTribulation = false;
    heartDemon = null;
    playerStatus = newStatus();

    if (success) {
        player.pendingTribulation = false;
        player.tribulationCount = (player.tribulationCount || 0) + 1;
        addLog(`☯️ 【渡劫成功】心魔潰散，你斬去心中執念，天劫已渡！（累計渡劫 ${player.tribulationCount} 次）`, "reincarnate");
        advanceRealm();
        refreshCombatStatusText();
        updateUI();
    } else {
        // 渡劫失敗視同死亡：折壽並使靈寵陣亡，壽元耗盡則遊戲結束
        if (handlePlayerDeath()) return;
        let lostCoins = Math.floor(player.coins * TRIBULATION_FAIL_COIN_LOSS);
        player.coins -= lostCoins;
        let fromStage = player.stage;
        applyTribulationFailDrop();
        player.hp = 1;
        addLog(`💀 【渡劫失敗】心魔反噬，你身受重傷跌落凡塵，遺失了 ${lostCoins.toWan()} 靈石。`, "combat");
        addLog(`📉 道基受損，境界跌落【${realms[player.realmIndex]} ${fromStage}階 → ${player.stage}階】，並陷入「虛弱」：攻擊、氣血與靈力上限 -${Math.round((1 - WEAKNESS_STAT_MULT) * 100)}%，直到重新修回 10 階才會解除；戰力要等 10 階修為修滿才會完全恢復。`, "combat");
        changeMap(0, 0);
        updateUI();
    }
}
