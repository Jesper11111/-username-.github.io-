// 經驗獲取、小境界升階、大境界突破（需渡劫）與轉世輪迴

const REINCARNATE_KEEP_RATE = 0.05;   // 轉世時保留前世四維／魅力、氣血上限、靈力上限的比例

// 回傳實際獲得的「境界修為」；若修為已圓滿待渡劫則回傳 0（境界經驗暫停累積）
// 人物等級與靈寵等級不受渡劫限制，仍會持續成長。
function gainExp(amount) {
    let finalAmount = amount * (player.sect ? player.sect.expMult : 1.0);
    if (hasLiveBeast('fox')) finalAmount *= 1.1;
    if (hasLiveBeast('dragon')) finalAmount *= 1.2;
    finalAmount *= 1 + gearFx("悟道");   // 悟道（裝備特效，gear.js）

    gainLevelExp(finalAmount);
    gainBeastExp(finalAmount);
    gainCoreProgress(finalAmount);   // 築基期灌丹田、金丹期溫養（含待渡劫時溢出的修為，golden-core.js）

    if (player.pendingTribulation) { updateUI(); return 0; }
    if (player.realmIndex >= realms.length - 1 && player.stage >= 10) { updateUI(); return 0; }

    player.exp += finalAmount;

    let maxExp = getNextExp();
    while (player.exp >= maxExp) {
        // 小境界已達 10 階：準備晉升下一個大境界
        if (player.stage >= 10) {
            // 已是最高境界，修為封頂
            if (player.realmIndex >= realms.length - 1) {
                player.exp = maxExp;
                break;
            }
            // 築基以上：封頂並等待渡劫
            if (player.realmIndex >= TRIBULATION_MIN_REALM_INDEX) {
                player.exp = maxExp;
                player.pendingTribulation = true;
                addLog(`☁️ 修為已臻【${realms[player.realmIndex]} 10階】圓滿，天劫將至！經驗暫停累積，需渡劫方能晉升【${realms[player.realmIndex + 1]}】。`, "reincarnate");
                break;
            }
            // 築基以前：直接突破，不需渡劫（保留溢出的經驗值）
            let carryExp = player.exp - maxExp;
            advanceRealm();
            player.exp = carryExp;
            maxExp = getNextExp();
            continue;
        }

        player.exp -= maxExp;
        player.stage++;

        player.stats.str += 5;
        player.stats.con += 5;
        player.stats.int += 5;
        player.stats.spr += 5;
        player.stats.cha += 2;

        addDailyProgress('breakthrough');
        // 新制（第 52 節）：屬性由境界階數計算（numeric.js 的 nv2BaseStat），每階六大屬性 +1；player.stats 照舊累加但戰鬥不讀（魅力除外）
        addLog(NUMERIC_V2
            ? `✨ 修為精進，達到【${realms[player.realmIndex]} ${player.stage}階】！六大屬性 +${NV2.statPerStage}（基礎 ${nv2BaseStat()}），魅力 +2。`
            : `✨ 修為精進，達到【${realms[player.realmIndex]} ${player.stage}階】！四維屬性 +5，魅力 +2。`, "level-up");
        // 渡劫失敗造成的虛弱：重新修回 10 階即解除
        if (player.weakened && player.stage >= 10) {
            player.weakened = false;
            addLog(`🌟 道基重固，重回【${realms[player.realmIndex]} 10階】，「虛弱」狀態解除！戰力會隨修為進度回升，10 階修為修滿即完全恢復。`, "level-up");
        }

        player.hp = getMaxHp();
        player.mp = getMaxMp();
        maxExp = getNextExp();
    }
    updateUI();
    return finalAmount;
}

// 人物等級：每升 1 級四維各 +1、生命上限 +10、靈力上限 +5（後兩者由 getMaxHp/getMaxMp 依等級計算）
function gainLevelExp(amount) {
    if (player.level >= MAX_PLAYER_LEVEL || !(amount > 0)) return;
    player.levelExp += amount;
    processLevelUps();
}

// 人物等級上限：新制依境界（config-level.js 的 LEVEL_CAP_BY_REALM），舊制只有 MAX_PLAYER_LEVEL
function getLevelCap() {
    if (!NUMERIC_V2) return MAX_PLAYER_LEVEL;
    return Math.min(MAX_PLAYER_LEVEL, LEVEL_CAP_BY_REALM[player.realmIndex] || MAX_PLAYER_LEVEL);
}
// 到達境界上限時最多能存的經驗：從目前等級升到「下一境界上限」所需的總量（最高境界時為 0）
let levelBankCache = { key: '', value: 0 };
function getLevelBankLimit() {
    let nextCap = Math.min(MAX_PLAYER_LEVEL, LEVEL_CAP_BY_REALM[player.realmIndex + 1] || 0);
    let key = player.level + '_' + nextCap;
    if (levelBankCache.key !== key) {
        let sum = 0;
        for (let lv = player.level; lv < nextCap; lv++) sum += getLevelExpNeeded(lv);
        levelBankCache = { key, value: sum };
    }
    return levelBankCache.value;
}

// 依已累積的經驗連續升級（受 getLevelCap 限制）；突破境界後 advanceRealm 也會呼叫，把存著的經驗補升
function processLevelUps() {
    let cap = getLevelCap();
    let startLevel = player.level;
    let need = getLevelExpNeeded(player.level);
    while (player.levelExp >= need && player.level < cap) {
        player.levelExp -= need;
        player.level++;
        need = getLevelExpNeeded(player.level);
    }
    if (player.level >= MAX_PLAYER_LEVEL) player.levelExp = 0;
    else if (player.level >= cap) player.levelExp = Math.min(player.levelExp, getLevelBankLimit());   // 到頂：經驗先存著（有上限）

    let gained = player.level - startLevel;
    if (gained > 0) {
        let statGain = gained * LEVEL_UP_STAT_GAIN;
        player.stats.str += statGain;
        player.stats.con += statGain;
        player.stats.int += statGain;
        player.stats.spr += statGain;
        // 新制：等級不再加屬性，只加氣血 %（NV2.levelHpPct）與靈力上限（NV2.levelMp），見 numeric.js
        addLog(NUMERIC_V2
            ? `🆙 人物等級提升至【Lv.${player.level}】${gained > 1 ? `（連升 ${gained} 級）` : ''}！氣血上限 +${+(gained * NV2.levelHpPct).toFixed(3)}%，靈力上限 +${fmtCombat(gained * NV2.levelMp)}。`
            : `🆙 人物等級提升至【Lv.${player.level}】${gained > 1 ? `（連升 ${gained} 級）` : ''}！四維各 +${statGain}，生命上限 +${gained * LEVEL_UP_HP_GAIN}，靈力上限 +${gained * LEVEL_UP_MP_GAIN}。`, "level-up");
        if (NUMERIC_V2 && player.level >= cap && cap < MAX_PLAYER_LEVEL) {
            addLog(`🔒 人物等級已達【${realms[player.realmIndex]}】上限 Lv.${cap}，突破境界後才能繼續提升（期間的經驗會先存著）。`, "level-up");
        }
    }
}

// 晉升下一個大境界（僅由渡劫成功時呼叫，見 tribulation.js）
function advanceRealm() {
    player.realmIndex++;
    player.stage = 1;
    player.exp = 0;

    let realmName = realms[player.realmIndex];
    let statBonus = 100;

    if (realmName === "渡劫") statBonus = 200;
    else if (realmName === "仙人初境") statBonus = 300;
    else if (realmName === "天仙") statBonus = 400;
    else if (realmName === "真仙") statBonus = 500;
    else if (realmName === "大羅金仙") statBonus = 1000;
    else if (realmName === "混元大羅金仙") statBonus = 2000;
    else if (realmName === "混沌道祖") statBonus = 3000;

    player.stats.str += statBonus;
    player.stats.con += statBonus;
    player.stats.int += statBonus;
    player.stats.spr += statBonus;
    player.stats.cha += Math.floor(statBonus / 5);

    player.hp = getMaxHp();
    player.mp = getMaxMp();

    addLog(NUMERIC_V2
        ? `⚡ 突破成功！境界晉升至【${realmName}】！六大屬性 +${NV2.statPerStage + NV2.statPerRealm}（基礎 ${nv2BaseStat()}），氣血成長再上一層！${getLevelCap() < MAX_PLAYER_LEVEL ? `人物等級上限提高到 Lv.${getLevelCap()}。` : ''}`
        : `⚡ 突破成功！境界晉升至【${realmName}】！四維與魅力屬性全面暴增！`, "level-up");
    onRealmAdvancedCore();   // 進金丹凝金丹、進元嬰成元嬰（golden-core.js）
    processLevelUps();   // 新制：等級上限隨境界提高，存著的經驗補升
    gainRealmLifespan();
}

async function triggerReincarnate() {
    if (player.realmIndex < 10) {
        gameAlert("境界未達【仙人初境】，無法進行轉世輪迴！");
        return;
    }

    let pct = Math.round(REINCARNATE_KEEP_RATE * 100);
    // 新制（第 52 節）：屬性由境界計算，轉世只保留氣血上限的 NV2.reincarnateHpKeep（10%）
    let keepText = NUMERIC_V2
        ? `・保留：氣血上限的 ${Math.round(NV2.reincarnateHpKeep * 100)}%（目前約 +${fmtCombat(getMaxHp() * NV2.reincarnateHpKeep)}，可逐世累積）\n`
        : `・保留：四維與魅力的 ${pct}%、氣血上限與靈力上限的 ${pct}%\n`;
    if (await gameConfirm(`轉世輪迴將洗去此世修為：\n` +
        keepText +
        `・遺忘：境界、人物等級、宗門（須重新拜入）與宗門技能、藏書閣古籍與屬性秘典\n` +
        `・身上的裝備全部卸下，放回背包（人物等級回到 Lv.1，要重新達到裝備等級才能再穿）\n` +
        `・壽元回到凡人的 ${lifespanByRealm[0].gain} 年\n` +
        (typeof hasYuanshen === 'function' && hasYuanshen() ? `・元神消散，需重新凝聚（資質解鎖；化神訣殘本保留）\n` : '') +
        `此操作無法復原，是否確定輪迴？`)) {
        // 先記下此世的數值，再依比例保留（上一世留下的部分已包含在內，會自然累積）
        player.weakened = false;   // 轉世洗去虛弱，且保留值以未虛弱的上限計算
        let oldStats = player.stats;
        let keptHp = Math.floor(getMaxHp() * REINCARNATE_KEEP_RATE);
        let keptMp = Math.floor(getMaxMp() * REINCARNATE_KEEP_RATE);
        // 新制：保留此世氣血上限的 10%（getMaxHp 已含前世保留量，所以會逐世累積）；舊制的 hp／mp 保留量不動，避免新舊數字混在一起
        let oldBonus = player.reincarnateBonus || {};
        let keptNv2Hp = NUMERIC_V2 ? Math.round(getMaxHp() * NV2.reincarnateHpKeep * 100) / 100 : (oldBonus.nv2Hp || 0);
        if (NUMERIC_V2) { keptHp = oldBonus.hp || 0; keptMp = oldBonus.mp || 0; }
        let keep = v => 10 + Math.floor((v || 0) * REINCARNATE_KEEP_RATE);

        player.reincarnations++;
        player.realmIndex = 0;
        player.stage = 1;
        player.exp = 0;
        player.level = 1;
        player.levelExp = 0;
        player.pendingTribulation = false;
        player.idleProvenMap = null;   // 實力大減，線上實戰證明作廢（save.js 背景／離線結算）
        fieldOnlineTicks = 0;
        player.lifespan = lifespanByRealm[0].gain;
        player.age = LIFESPAN_START_AGE;
        player.stats = { str: keep(oldStats.str), con: keep(oldStats.con), int: keep(oldStats.int), spr: keep(oldStats.spr), cha: keep(oldStats.cha) };
        player.reincarnateBonus = { hp: keptHp, mp: keptMp, nv2Hp: keptNv2Hp };
        player.sect = null;
        player.sectSkills = { 1: null, 2: null, 3: null };
        player.activeQuest = null;
        player.questTimer = 0;
        player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
        player.elementStudy = {};
        player.goldenCore = null;   // 丹田／金丹／元嬰隨轉世重來（golden-core.js）
        player.yuanshen = null;     // 元神隨轉世消散、資質解鎖（yuanshen.js；化神訣殘本保留）
        // 裝備全部卸下放回背包（2026-10-01 使用者指定）；強制卸下不受背包上限限制，超過上限的照舊保留（見 config-equipment.js）
        let takenOff = 0;
        Object.keys(player.equipment).forEach(slot => {
            if (!player.equipment[slot]) return;
            player.equipInventory.push(player.equipment[slot]);
            player.equipment[slot] = null;
            takenOff++;
        });
        player.hp = getMaxHp();
        player.mp = getMaxMp();
        addLog(NUMERIC_V2
            ? `🌀 成功轉世輪迴！第 ${player.reincarnations} 次輪迴，前世修為化為底蘊（氣血上限 +${fmtCombat(keptNv2Hp)}），其餘盡數遺忘。`
            : `🌀 成功轉世輪迴！第 ${player.reincarnations} 次輪迴，前世修為化為 ${pct}% 的底蘊（氣血上限 +${keptHp.toWan()}、靈力上限 +${keptMp.toWan()}），其餘盡數遺忘。`, "reincarnate");
        if (takenOff) addLog(`🛡️ 輪迴之際，身上 ${takenOff} 件裝備盡數卸下，已放回背包。`, "equip");
        updateUI();
        updateSectFacilitiesUI();
    }
}
