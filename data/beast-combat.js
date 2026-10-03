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
// 技能欄存的是技能 id（config-beasts.js 的 beastSkills）；舊版五行字串由 save.js 的 migrateBeastSkills 清空
function getBeastSkill(id) {
    return id ? beastSkillById[id] || null : null;
}

const beastPct = v => `${Math.round(v * 100)}%`;
function describeBeastBuff(key, v) {
    if (key === 'atk') return `攻擊 ×${v}`;
    if (key === 'reduce' || key === 'lifesteal') return `${BEAST_BUFF_LABELS[key]} ${beastPct(v)}`;
    if (key === 'crit' || key === 'combo') return `${BEAST_BUFF_LABELS[key]} +${v}%`;
    return `${BEAST_BUFF_LABELS[key]} +${v}`;
}
function describeBeastSkill(sk) {
    const p = [];
    if (sk.cat === 'control') {
        if (sk.freeze) p.push(`${sk.aoe ? '全體' : ''}凍結 ${sk.freeze} 回合`);
        if (sk.silence) p.push(`封印武學 ${sk.silence} 回合`);
        if (sk.weaken) p.push(`敵人攻擊 −${beastPct(sk.weaken)} ${sk.turns} 回合`);
        if (sk.vuln) p.push(`敵人受到傷害 +${beastPct(sk.vuln)} ${sk.turns} 回合`);
    } else if (sk.cat === 'attack') {
        p.push(`${sk.aoe ? '全體各' : '單體'}造成物攻 ${beastPct(sk.mult)} 傷害`);
        if (sk.splash) p.push(`再對全體造成 ${beastPct(sk.splash)}`);
        if (sk.burn) p.push(`燒傷 ${sk.burn} 層`);
        if (sk.poison) p.push(`中毒 ${sk.poison} 層`);
        if (sk.execute) p.push('目標氣血低於 30% 時傷害 ×2');
        if (sk.drain) p.push(`傷害的 ${beastPct(sk.drain)} 回復主人氣血`);
    } else if (sk.cat === 'buff') {
        p.push(Object.keys(sk.effects).map(k => describeBeastBuff(k, sk.effects[k])).join('、') + `，持續 ${sk.turns} 回合`);
    } else if (sk.cat === 'heal') {
        if (sk.heal) p.push(`回復氣血 ${beastPct(sk.heal)}${sk.emergency ? `（主人氣血低於 40% 時 ${beastPct(sk.emergency)}）` : ''}`);
        if (sk.mp) p.push(`回復靈力 ${beastPct(sk.mp)}`);
        if (sk.regen) p.push(`每回合回血 ${beastPct(sk.regen)} ×${sk.turns} 回合`);
        if (sk.mpRegen) p.push(`每回合回靈 ${beastPct(sk.mpRegen)} ×${sk.turns} 回合`);
    } else if (sk.cat === 'cleanse') {
        p.push(`解除${sk.remove.map(k => BEAST_DEBUFF_LABELS[k]).join('、')}`);
        if (sk.immune) p.push(`之後 ${sk.immune} 回合內持續淨化`);
        if (sk.heal) p.push(`回復氣血 ${beastPct(sk.heal)}`);
    }
    return p.join('，');
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
    petBuffTimer = 0; petShieldTimer = 0; petRegenTimer = 0; petFx = {}; partnerShieldTimer = 0; selfShieldTimer = 0;
    if (died.length > 0) {
        let names = died.map(b => { let d = beastData.find(x => x.id === b.id); return d ? d.name : b.id; });
        addLog(`🐾 靈寵【${names.join('、')}】隨主人一同陣亡！需至靈獸園以 ${BEAST_REVIVE_COST_CORE} 獸丹復活。`, "combat");
    }
}

// ==================== 施加在主人身上的效果 ====================
// 受到的傷害套用「受傷減少」護盾（靈寵 petShield*、夥伴 partnerShield*、玩家本身 selfShield*，state.js），
// 再保底：傷害 ≥ 防禦後的傷害 ×（1 − 本身護盾最多 20% − 靈寵護盾最多 10% − 夥伴護盾最多 10%）
//   2026-10-03 起（第 66 節）防禦改《天堂2》式、沒有上限，保底只管護盾類，不再把防禦夾回 20%
// r＝resolveHit 的結果（有 postDef 才保底；被閃避的沒有）。金身／化勁等裝備特效也在保底範圍內
function applyPetDamageReduction(dmg, r) {
    let d = dmg;
    if (petShieldTimer > 0) d *= 1 - petShieldRate;
    if (partnerShieldTimer > 0) d *= 1 - partnerShieldRate;
    if (selfShieldTimer > 0) d *= 1 - selfShieldRate;
    if (r && typeof r.postDef === 'number' && r.postDef > 0 && d > 0) d = Math.max(d, r.postDef * playerDamageFloor());
    return d === dmg ? d : roundDmg(d);   // 護盾／保底改過才重新取整（新制 2 位小數），避免 7.6000000000000005 這類尾數
}
// 敵人打玩家的最低傷害比例（相對防禦後的傷害，見 config-elements.js）
function playerDamageFloor() {
    const petPart = Math.min(PLAYER_PET_BONUS_MAX, petShieldTimer > 0 ? petShieldRate * 100 : 0);
    const parPart = Math.min(PLAYER_PARTNER_BONUS_MAX, partnerShieldTimer > 0 ? partnerShieldRate * 100 : 0);
    return 1 - (PLAYER_SELF_SHIELD_MAX + petPart + parPart) / 100;
}
// 其他增益的目前數值（沒有或已結束 = 0）：elements.js 的 getPlayerCombatAttrs（def／eva／crit／hit／armorPen）、
// combat.js 的 playerAttackTurn（combo、lifesteal）
function petFxVal(key) {
    const e = petFx[key];
    return e && e.t > 0 ? e.v : 0;
}
// 同種類取較高值、持續時間取較長（不同種類各自存在，所以多隻靈寵的增益可以疊在一起）
function addPetBuff(key, v, turns) {
    if (key === 'atk') {
        petBuffMult = petBuffTimer > 0 ? Math.max(petBuffMult, v) : v;
        petBuffTimer = Math.max(petBuffTimer, turns);
    } else if (key === 'reduce') {
        petShieldRate = petShieldTimer > 0 ? Math.max(petShieldRate, v) : v;
        petShieldTimer = Math.max(petShieldTimer, turns);
    } else {
        const e = petFx[key];
        petFx[key] = e && e.t > 0 ? { v: Math.max(e.v, v), t: Math.max(e.t, turns) } : { v, t: turns };
    }
}

// 主人身上的負面狀態：poison／burn／freeze（playerStatus，elements.js）、silence／weaken／armor（懸賞對決，bounty.js）
function playerHasDebuff(k) {
    if (k === 'poison') return !!(playerStatus.poison && playerStatus.poison.stacks > 0);
    if (k === 'burn') return !!(playerStatus.burn && playerStatus.burn.stacks > 0);
    if (k === 'freeze') return playerStatus.frozen > 0;
    if (k === 'silence') return duelSilenceTimer > 0;
    if (k === 'weaken') return duelWeakenTimer > 0;
    if (k === 'armor') return duelArmorTimer > 0;
    return false;
}
// 清除指定的負面狀態，回傳實際清掉的名稱
function removePlayerDebuffs(list) {
    const removed = list.filter(playerHasDebuff);
    removed.forEach(k => {
        if (k === 'poison') playerStatus.poison = null;
        else if (k === 'burn') playerStatus.burn = null;
        else if (k === 'freeze') playerStatus.frozen = 0;
        else if (k === 'silence') duelSilenceTimer = 0;
        else if (k === 'weaken') { duelWeakenTimer = 0; duelWeakenMult = 1; }
        else if (k === 'armor') duelArmorTimer = 0;
    });
    return removed.map(k => BEAST_DEBUFF_LABELS[k]);
}
// 每回合主人行動前呼叫（野外 fieldCombatRound、懸賞 bountyDuelTick、渡劫 tribulationTick）：淨化技能的持續淨化
function petPreTurn() {
    const im = petFx.immune;
    if (!im || im.t <= 0) return;
    const removed = removePlayerDebuffs(im.v);
    if (removed.length) addLog(`🌸 靈寵的淨化之力化解了${removed.join('、')}！`, "heal");
}

// ==================== 施加在敵人身上的效果（t.petCc）====================
function petCcOf(t) { if (!t.petCc) t.petCc = { weakT: 0, weakV: 0, silenceT: 0, vulnT: 0, vulnV: 0, freezeCd: 0 }; return t.petCc; }
// 敵人攻擊倍率（被削弱時 < 1）：combat.js 妖獸回合、bounty.js 對手出手、tribulation.js 心魔出手
function petEnemyAtkMult(t) { return t && t.petCc && t.petCc.weakT > 0 ? 1 - t.petCc.weakV : 1; }
// 敵人是否被封印武學：bounty.js、tribulation.js 擲武學前檢查
function petIsSilenced(t) { return !!(t && t.petCc && t.petCc.silenceT > 0); }
// 敵人受到的傷害倍率（破綻）：combat.js 的 hitTarget 與靈寵攻擊
function petVulnMult(t) { return t && t.petCc && t.petCc.vulnT > 0 ? 1 + t.petCc.vulnV : 1; }

// ==================== 每回合協助 ====================
// 依戰況挑招：主人氣血 < 50% 優先治療、身上有可解的負面狀態優先淨化；其餘隨機（治療只在未滿血、淨化只在有狀態時才列入）
function pickBeastSkill(learned, living) {
    const hpRatio = player.hp / Math.max(1, player.maxHp), mpRatio = player.mp / Math.max(1, player.maxMp);
    const heals = learned.filter(s => s.cat === 'heal');
    const cleans = learned.filter(s => s.cat === 'cleanse' && s.remove.some(playerHasDebuff));
    if (hpRatio < 0.5) {
        const h = heals.filter(s => s.heal || s.regen);
        if (h.length) return h[Math.floor(Math.random() * h.length)];
    }
    if (cleans.length) return cleans[Math.floor(Math.random() * cleans.length)];
    const pool = learned.filter(s => {
        if (s.cat === 'cleanse') return false;
        if (s.cat === 'heal') return ((s.heal || s.regen) && hpRatio < 0.85) || ((s.mp || s.mpRegen) && mpRatio < 0.6);
        if (s.cat === 'control' || s.cat === 'attack') return living.length > 0;
        return true;
    });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function castBeastSkill(sk, who, living) {
    const dmgBase = () => getPhysAttack() * (1 + gearFx("獸魂"));   // 獸魂（裝備特效，gear.js）
    if (sk.cat === 'attack') {
        const hit = (t, mult) => {
            let d = dmgBase() * mult * petVulnMult(t) * nv2DmgRoll();   // 傷害浮動 ±10%（elements.js）
            if (sk.execute && t.hp < (t.maxHp || t.hp) * 0.3) d *= 2;
            d = roundDmg(d);   // 新制保留 2 位小數
            t.hp -= d;
            if (sk.burn && t.status) t.status.burn = addDotStack(t.status.burn, BURN_MAX_STACKS, BURN_TURNS, getPhysAttack() * BURN_RATE);
            if (sk.poison && t.status) for (let i = 0; i < sk.poison; i++) t.status.poison = addDotStack(t.status.poison, POISON_MAX_STACKS, POISON_TURNS, getPhysAttack() * POISON_RATE);
            return d;
        };
        let total = 0;
        (sk.aoe ? living : [living[0]]).forEach(t => { total += hit(t, sk.mult); });
        if (sk.splash) living.forEach(t => { if (t.hp > 0) total += hit(t, sk.splash); });
        if (sk.drain && total > 0) player.hp = Math.min(player.maxHp, player.hp + total * sk.drain);
        addLog(`${who} 施展【${sk.name}】，造成 ${fmtCombat(total)} 點${sk.aoe || sk.splash ? '群體' : ''}傷害！`, "skill");
    } else if (sk.cat === 'control') {
        const parts = [];
        (sk.aoe ? living : [living[0]]).forEach(t => {
            const cc = petCcOf(t);
            if (sk.freeze && t.status) {
                if (cc.freezeCd <= 0) { t.status.frozen = Math.max(t.status.frozen || 0, sk.freeze); cc.freezeCd = sk.freeze + BEAST_FREEZE_COOLDOWN; }
                else if (!sk.aoe) parts.push('（目標剛解凍，暫時凍不住）');
            }
            if (sk.silence) cc.silenceT = Math.max(cc.silenceT, sk.silence);
            if (sk.weaken) { cc.weakV = cc.weakT > 0 ? Math.max(cc.weakV, sk.weaken) : sk.weaken; cc.weakT = Math.max(cc.weakT, sk.turns); }
            if (sk.vuln) { cc.vulnV = cc.vulnT > 0 ? Math.max(cc.vulnV, sk.vuln) : sk.vuln; cc.vulnT = Math.max(cc.vulnT, sk.turns); }
        });
        addLog(`${who} 施展【${sk.name}】，${describeBeastSkill(sk)}${parts.join('')}！`, "skill");
    } else if (sk.cat === 'buff') {
        Object.keys(sk.effects).forEach(k => addPetBuff(k, sk.effects[k], sk.turns));
        addLog(`${who} 施展【${sk.name}】，主人${describeBeastSkill(sk)}！`, "skill");
    } else if (sk.cat === 'heal') {
        const low = player.hp < player.maxHp * 0.4;
        const heal = sk.emergency && low ? sk.emergency : sk.heal;
        if (heal) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * heal);
        if (sk.mp) player.mp = Math.min(player.maxMp, player.mp + player.maxMp * sk.mp);
        if (sk.regen) { petRegenRate = petRegenTimer > 0 ? Math.max(petRegenRate, sk.regen) : sk.regen; petRegenTimer = Math.max(petRegenTimer, sk.turns); }
        if (sk.mpRegen) addPetBuff('mpRegen', sk.mpRegen, sk.turns);
        addLog(`${who} 施展【${sk.name}】，${describeBeastSkill(sk)}${sk.emergency && low ? '（護主！）' : ''}！`, "heal");
    } else if (sk.cat === 'cleanse') {
        const removed = removePlayerDebuffs(sk.remove);
        if (sk.immune) petFx.immune = { v: sk.remove, t: Math.max((petFx.immune && petFx.immune.t) || 0, sk.immune) };
        if (sk.heal) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * sk.heal);
        addLog(`${who} 施展【${sk.name}】，${removed.length ? `解除了${removed.join('、')}` : '靈光護體'}${sk.immune ? `，${sk.immune} 回合內持續淨化` : ''}！`, "heal");
    }
}

// 出戰上限（BEAST_ACTIVE_MAX）：超過的改為休息，保留 keep（剛指定出戰的那隻）或排前面的；回傳被召回的靈寵
function enforceBeastActiveLimit(keep) {
    const active = (player.beasts || []).filter(b => b.alive && b.active);
    const ordered = keep && active.includes(keep) ? [keep].concat(active.filter(b => b !== keep)) : active;
    const off = ordered.slice(BEAST_ACTIVE_MAX);
    off.forEach(b => { b.active = false; });
    return off;
}

// ---- 靈寵靈力（config-beasts.js 的 BEAST_MP_*；state.js 的 beastMp，不存檔）----
function beastSkillMp(sk) { return BEAST_SKILL_MP_BY_LV[sk.minLv] || 10; }
function getBeastMp(id) { if (typeof beastMp[id] !== 'number') beastMp[id] = BEAST_MP_MAX; return beastMp[id]; }
// 出戰靈寵與隊伍夥伴回靈（每回合、野外刷新等待的每秒；combat.js）
function regenCompanionMp() {
    (player.beasts || []).forEach(b => { if (isBeastActive(b)) beastMp[b.id] = Math.min(BEAST_MP_MAX, getBeastMp(b.id) + BEAST_MP_REGEN); });
    if (typeof getPartnerTeam === 'function') getPartnerTeam().forEach(p => { partnerMp[p.id] = Math.min(PARTNER_MP_MAX, getPartnerMp(p.id) + PARTNER_MP_REGEN); });
}

// 每回合由 fieldCombatRound／bountyDuelTick／tribulationTick 呼叫；targets 為本回合可攻擊的目標（需有 hp 屬性）
function petAssistTick(targets) {
    // 主人身上的效果倒數
    if (petBuffTimer > 0) petBuffTimer--;
    if (petShieldTimer > 0) petShieldTimer--;
    if (partnerShieldTimer > 0) partnerShieldTimer--;
    if (selfShieldTimer > 0) selfShieldTimer--;
    if (petRegenTimer > 0) {
        petRegenTimer--;
        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * petRegenRate);
    }
    if (petFxVal('mpRegen')) player.mp = Math.min(player.maxMp, player.mp + player.maxMp * petFxVal('mpRegen'));
    Object.keys(petFx).forEach(k => { if (petFx[k].t > 0) petFx[k].t--; });
    // 敵人身上的效果倒數
    targets.forEach(t => {
        const cc = t.petCc;
        if (!cc) return;
        ['weakT', 'silenceT', 'vulnT', 'freezeCd'].forEach(k => { if (cc[k] > 0) cc[k]--; });
    });

    player.beasts.forEach(b => {
        if (!isBeastActive(b)) return;
        beastMp[b.id] = Math.min(BEAST_MP_MAX, getBeastMp(b.id) + BEAST_MP_REGEN);   // 每回合回靈
        // 只從「靈力夠」的招式裡挑；一招都放不起就這回合不出手
        const learned = b.skills.map(getBeastSkill).filter(sk => sk && beastSkillMp(sk) <= beastMp[b.id]);
        if (learned.length === 0 || Math.random() >= BEAST_SKILL_CHANCE) return;
        const living = targets.filter(t => t.hp > 0);
        const sk = pickBeastSkill(learned, living);
        if (!sk) return;
        beastMp[b.id] -= beastSkillMp(sk);
        castBeastSkill(sk, `🐾 ${getBeastName(b)}`, living);
    });
}

