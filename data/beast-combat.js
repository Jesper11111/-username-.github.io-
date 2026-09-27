// 靈寵的成長與戰鬥：經驗/升級、陣亡、出戰維持費、每回合協助出手、輔助效果（增益/減傷/持續回復）
// 設定數值見 config-beasts.js；兌換、復活、選技能的彈窗在 beast.js。

function createBeast(id) {
    return { id: id, level: 1, exp: 0, alive: true, active: true, upkeepTimer: 0, skills: BEAST_SKILL_LEVELS.map(() => null) };
}

function getBeastName(b) {
    let info = beastData.find(d => d.id === b.id);
    return info ? info.name : b.id;
}

// 出戰中＝存活且未召回休息；只有出戰中的靈寵會提供被動、協助出手、累積經驗與支付維持費
function isBeastActive(b) {
    return b.alive && b.active !== false;
}

// 依靈寵等級取得每 BEAST_UPKEEP_INTERVAL 秒的維持費 { coins, core }
function getBeastUpkeep(level) {
    return beastUpkeepTiers.find(t => level <= t.maxLevel) || beastUpkeepTiers[beastUpkeepTiers.length - 1];
}

// 支付一次維持費；付不起回傳 false（不扣任何資源）
function payBeastUpkeep(b) {
    let cost = getBeastUpkeep(b.level);
    if (player.coins < cost.coins || player.beastCore < cost.core) return false;
    player.coins -= cost.coins;
    player.beastCore -= cost.core;
    return true;
}

function restBeastForUpkeep(b) {
    let cost = getBeastUpkeep(b.level);
    b.active = false;
    b.upkeepTimer = 0;
    addLog(`🐾 靈石或獸丹不足（需 ${cost.coins.toWan()} 靈石＋${cost.core.toWan()} 獸丹），靈寵【${getBeastName(b)}】已自動召回靈獸園休息。`, "combat");
}

// 由 combatTick() 每秒呼叫：各出戰靈寵各自計時，滿 BEAST_UPKEEP_INTERVAL 秒扣一次維持費
// （計時存在靈寵身上，召回後暫停、再出戰時接續，避免反覆切換躲費用）
function tickBeastUpkeep() {
    let changed = false;
    player.beasts.forEach(b => {
        if (!isBeastActive(b)) return;
        b.upkeepTimer = (b.upkeepTimer || 0) + 1;
        if (b.upkeepTimer < BEAST_UPKEEP_INTERVAL) return;
        b.upkeepTimer = 0;
        if (!payBeastUpkeep(b)) restBeastForUpkeep(b);
        changed = true;
    });
    if (changed && document.getElementById('beast-modal').style.display === 'flex') renderBeasts();
}

// 離線結算：依離線秒數逐次扣費，付不起就從那一刻起召回休息；回傳結算說明文字（無出戰靈寵時為空字串）
function settleOfflineBeastUpkeep(seconds) {
    let totalCoins = 0, totalCore = 0, rested = [];
    player.beasts.forEach(b => {
        if (!isBeastActive(b)) return;
        let elapsed = (b.upkeepTimer || 0) + seconds;
        let times = Math.floor(elapsed / BEAST_UPKEEP_INTERVAL);
        b.upkeepTimer = elapsed % BEAST_UPKEEP_INTERVAL;
        let cost = getBeastUpkeep(b.level);
        for (let i = 0; i < times; i++) {
            if (!payBeastUpkeep(b)) {
                b.active = false;
                b.upkeepTimer = 0;
                rested.push(getBeastName(b));
                break;
            }
            totalCoins += cost.coins;
            totalCore += cost.core;
        }
    });
    if (totalCoins === 0 && rested.length === 0) return '';
    return `🐾 靈寵維持費共 ${totalCoins.toWan()} 靈石＋${totalCore.toWan()} 獸丹`
        + (rested.length > 0 ? `；資源不足，【${rested.join('、')}】已召回休息。` : '。');
}

// 靈寵第 slot 格選了 element 屬性時學到的技能
function getBeastSkill(element, slot) {
    return beastSkillTree[element] ? beastSkillTree[element][slot] : null;
}

function describeBeastSkill(sk) {
    if (sk.kind === "single") return `單體傷害 ${Math.round(sk.mult * 100)}% 攻擊力`;
    if (sk.kind === "aoe") return `群體傷害 每隻 ${Math.round(sk.mult * 100)}% 攻擊力`;
    if (sk.kind === "buff") return `攻擊力 ×${sk.mult}，持續 ${sk.duration} 回合`;
    if (sk.kind === "shield") return `受到傷害 -${Math.round(sk.reduce * 100)}%，持續 ${sk.duration} 回合`;
    let parts = [];
    if (sk.heal) parts.push(`立即回復 ${Math.round(sk.heal * 100)}% 氣血`);
    if (sk.mpHeal) parts.push(`${Math.round(sk.mpHeal * 100)}% 靈力`);
    if (sk.regen) parts.push(`每回合回復 ${Math.round(sk.regen * 100)}% 氣血 ×${sk.regenTurns} 回合`);
    return parts.join('、');
}

// 與人物共用經驗來源；等級不可超過人物等級，已陣亡或休息中的靈寵不累積經驗
function gainBeastExp(amount) {
    if (!(amount > 0)) return;
    player.beasts.forEach(b => {
        if (!isBeastActive(b) || b.level >= player.level) return;
        let info = beastData.find(d => d.id === b.id);
        let startLevel = b.level;
        b.exp += amount;
        let need = getLevelExpNeeded(b.level);
        while (b.exp >= need && b.level < player.level) {
            b.exp -= need;
            b.level++;
            need = getLevelExpNeeded(b.level);
        }
        if (b.level >= player.level) b.exp = 0;
        if (b.level > startLevel) {
            let newSlots = BEAST_SKILL_LEVELS.filter(lv => lv > startLevel && lv <= b.level);
            let hint = newSlots.length > 0 ? `，可至靈獸園為其選擇 Lv${newSlots.join('/Lv')} 的新技能` : '';
            addLog(`🐾 靈寵【${info ? info.name : b.id}】成長至 Lv.${b.level}${hint}！`, "system");
        }
    });
}

// 玩家死亡：所有靈寵立即陣亡，輔助效果一併消失
function killAllBeasts() {
    let died = player.beasts.filter(b => b.alive);
    died.forEach(b => { b.alive = false; });
    petBuffTimer = 0; petShieldTimer = 0; petRegenTimer = 0;
    if (died.length > 0) {
        let names = died.map(b => { let d = beastData.find(x => x.id === b.id); return d ? d.name : b.id; });
        addLog(`🐾 靈寵【${names.join('、')}】隨主人一同陣亡！需至靈獸園以 ${BEAST_REVIVE_COST_CORE} 獸丹復活。`, "combat");
    }
}

// 受到的傷害套用土屬性減傷
function applyPetDamageReduction(dmg) {
    return petShieldTimer > 0 ? dmg * (1 - petShieldRate) : dmg;
}

// 每回合由 combatTick()／tribulationTick() 呼叫；targets 為本回合可攻擊的目標（需有 hp 屬性）
function petAssistTick(targets) {
    if (petBuffTimer > 0) petBuffTimer--;
    if (petShieldTimer > 0) petShieldTimer--;
    if (petRegenTimer > 0) {
        petRegenTimer--;
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * petRegenRate);
    }

    player.beasts.forEach(b => {
        if (!isBeastActive(b)) return;
        let learned = b.skills.map((elem, slot) => elem ? getBeastSkill(elem, slot) : null).filter(Boolean);
        if (learned.length === 0 || Math.random() >= BEAST_SKILL_CHANCE) return;

        let sk = learned[Math.floor(Math.random() * learned.length)];
        let info = beastData.find(d => d.id === b.id);
        let who = `🐾 ${info ? info.name : b.id}`;
        let living = targets.filter(t => t.hp > 0);

        if (sk.kind === "single" || sk.kind === "aoe") {
            if (living.length === 0) return;
            let dmg = roundDmg(getPhysAttack() * sk.mult * (1 + gearFx("獸魂")));   // 獸魂（裝備特效，gear.js）；新制保留 1 位小數
            if (sk.kind === "aoe") living.forEach(t => t.hp -= dmg);
            else living[0].hp -= dmg;
            addLog(`${who} 施展【${sk.name}】，造成 ${dmg.toWan()} 點${sk.kind === "aoe" ? "群體" : ""}傷害！`, "skill");
        } else if (sk.kind === "buff") {
            petBuffMult = petBuffTimer > 0 ? Math.max(petBuffMult, sk.mult) : sk.mult;
            petBuffTimer = Math.max(petBuffTimer, sk.duration);
            addLog(`${who} 施展【${sk.name}】，主人攻擊力提升至 ×${petBuffMult}！`, "skill");
        } else if (sk.kind === "shield") {
            petShieldRate = petShieldTimer > 0 ? Math.max(petShieldRate, sk.reduce) : sk.reduce;
            petShieldTimer = Math.max(petShieldTimer, sk.duration);
            addLog(`${who} 施展【${sk.name}】，主人受到的傷害降低 ${Math.round(petShieldRate * 100)}%！`, "skill");
        } else if (sk.kind === "heal") {
            if (sk.heal) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * sk.heal);
            if (sk.mpHeal) player.mp = Math.min(player.maxMp, player.mp + player.maxMp * sk.mpHeal);
            if (sk.regen) {
                petRegenRate = petRegenTimer > 0 ? Math.max(petRegenRate, sk.regen) : sk.regen;
                petRegenTimer = Math.max(petRegenTimer, sk.regenTurns);
            }
            addLog(`${who} 施展【${sk.name}】，${describeBeastSkill(sk)}！`, "heal");
        }
    });
}
