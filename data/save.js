// 存讀檔：localStorage 本地存檔、匯出/匯入代碼、離線掛機收益結算、完全重置

function calcOfflineProgress() {
    if (!player.lastSaveTime) return;

    let now = Date.now();
    let offlineSeconds = Math.floor((now - player.lastSaveTime) / 1000);

    // 離線上限 OFFLINE_MAX_SECONDS（12 小時，config-maps.js）
    let rawSeconds = offlineSeconds;
    if (offlineSeconds > OFFLINE_MAX_SECONDS) {
        offlineSeconds = OFFLINE_MAX_SECONDS;
    }

    if (offlineSeconds < 10) return; // 離線小於10秒不觸發

    let msg = settleIdleSeconds(offlineSeconds, "離線", true);   // true = 真正離線：練功收益約為線上 50%
    if (rawSeconds > OFFLINE_MAX_SECONDS) msg += `\n⏰ 離線 ${formatIdleDuration(rawSeconds)}，最多結算 ${OFFLINE_MAX_SECONDS / 3600} 小時。`;
    player.lastSaveTime = Date.now();
    addLog(`🌙 ${msg}`, "system");
    // 遊戲內提示框（ui.js 的 gameAlert）：原生 alert 在 LINE／FB 內建瀏覽器、預覽面板不會顯示，玩家看不到結算（2026-10-02 改）
    setTimeout(() => { gameAlert(`【離線掛機收益結算】\n${msg}`); }, 500);
}

// 背景補發：分頁縮小／切到其他 App／鎖螢幕時，瀏覽器會放慢甚至暫停 setInterval，
// combatTick() 每秒呼叫本函式，偵測兩次 tick 的間隔，把沒跑到的秒數以離線公式補發（不重複計算已跑過的 tick）。
// 間隔 ≤ BACKGROUND_TICK_SLACK_MS 視為正常抖動不計；累積滿 BACKGROUND_SETTLE_MIN_SECONDS 秒才結算一次，避免日誌洗版。
const BACKGROUND_TICK_SLACK_MS = 1500;
const BACKGROUND_SETTLE_MIN_SECONDS = 10;

function checkBackgroundCatchUp() {
    let now = Date.now();
    let prev = lastTickAt;
    lastTickAt = now;
    if (!prev) return;
    let gap = now - prev;
    if (gap > BACKGROUND_TICK_SLACK_MS) missedTickMs += gap - 1000;

    // 渡劫／懸賞對決中、已死亡或遊戲結束時不補發（對決數十秒內就會分出勝負），丟棄累積的時間
    if (gameOver || inTribulation || inBountyDuel || player.hp <= 0) { missedTickMs = 0; return; }

    let seconds = Math.floor(missedTickMs / 1000);
    if (seconds < BACKGROUND_SETTLE_MIN_SECONDS) return;
    missedTickMs -= seconds * 1000;
    seconds = Math.min(seconds, OFFLINE_MAX_SECONDS);   // 與離線上限相同
    addLog(`🌙 ${settleIdleSeconds(seconds, "背景掛機時")}`, "system");
    updateUI();
}

// 離線／背景共用的收益結算：依秒數給經驗、靈石、聲望、功德、救僕從，並扣壽元與靈寵維持費；回傳結算說明
// label 只影響文字（"離線"／"背景掛機時"）
// isOffline：true = 關掉遊戲的離線（練功收益打折，OFFLINE_REWARD_MULT）；背景補發不傳，維持原比例
function settleIdleSeconds(offlineSeconds, label, isOffline) {
    let expEarned = 0;
    let coinsEarned = 0;
    let msg = "";
    let prefix = "";

    // 修為已圓滿待渡劫時，離線期間同樣無法再累積經驗
    let wasPending = player.pendingTribulation;

    // 依實力估算野外戰鬥：撐不住就退回宗門靜修；打得慢則按比例降低戰鬥次數（防止進高階地圖後直接離線刷收益）
    let est = null;
    // 暫存區滿了不能外出練功（enhance.js）：離線期間改在宗門靜修，沒有野外收益
    if (!player.currentMapIsSafe && isGearStashFull()) {
        let fromName = player.currentMap.name;
        player.currentMap = maps[0].items[0];
        player.currentMapIsSafe = maps[0].isSafe;
        prefix = `📦 暫存區已滿，無法在【${fromName}】歷練，已退回【${player.currentMap.name}】靜修（請先處理暫存區的裝備）。\n`;
    }
    if (!player.currentMapIsSafe) {
        est = estimateIdleCombat();
        // 估算不計自動補血、吸血、回血、護盾、靈寵，常把線上打得過的玩家誤判成撐不住（曾造成「縮小畫面回來人在宗門」）。
        // 線上已在這張地圖實際撐過 IDLE_PROVEN_SECONDS 秒（combat.js 記錄的 idleProvenMap）就信任玩家，留在原地結算。
        if (!est.survivable && player.idleProvenMap === player.currentMap.name) est.survivable = true;
        // 新制（2026-09-29 離線也扣丹藥）：有開自動補血、且丹藥回復速度跟得上妖獸輸出，就算一波傷害超過氣血上限也留在原地（實際消耗見 settleIdlePotions）
        if (!est.survivable && NUMERIC_V2 && idlePotionCanKeepUp(est)) est.survivable = true;
        if (!est.survivable) {
            let fromName = player.currentMap.name;
            player.currentMap = maps[0].items[0];
            player.currentMapIsSafe = maps[0].isSafe;
            prefix = `⚠️ 以目前實力無法在【${fromName}】久留（一波妖獸約造成 ${formatShortCombat(est.waveDamage)} 傷害，氣血上限 ${formatShortCombat(est.maxHp)}），已退回【${player.currentMap.name}】靜修。\n`;
        }
    }

    if (player.currentMapIsSafe) {
        let ticks = Math.floor(offlineSeconds / 5);
        expEarned = ticks * (player.currentMap.expRate * 50);
        let gained = gainExp(expEarned) || 0;
        msg = wasPending
            ? `🧘‍♂️ ${label}於【${player.currentMap.name}】靜修 ${formatIdleDuration(offlineSeconds)}，但修為已圓滿待渡劫，未能再累積經驗。`
            : `🧘‍♂️ ${label}於【${player.currentMap.name}】靜修打坐 ${formatIdleDuration(offlineSeconds)}，獲得 ${Math.floor(gained)} 點經驗！`;
    } else {
        // OFFLINE_COMBAT_RATE = 離線每秒的戰鬥次數（見 config-maps.js，刻意低於線上滿速的每秒 0.32 隻）
        // 再乘上實力效率 est.rateMult（能秒殺 = 1；打得越久越低）
        let combatTicks = Math.floor(offlineSeconds * OFFLINE_COMBAT_RATE * est.rateMult * (isOffline ? OFFLINE_REWARD_MULT : 1));
        let coinPerTick = typeof player.currentMap.coins === 'number' ? player.currentMap.coins : player.currentMap.diff * 10;
        // 新制：離線／背景也消耗丹藥（背包優先、不夠再以靈石自動購買）；丹藥不夠時只算撐得住的那一段
        let potion = NUMERIC_V2 ? settleIdlePotions(est, offlineSeconds, isOffline, combatTicks * coinPerTick) : null;
        if (potion && potion.f < 1) combatTicks = Math.floor(combatTicks * potion.f);
        expEarned = combatTicks * (player.currentMap.expRate * 15);
        coinsEarned = combatTicks * coinPerTick;

        let gained = gainExp(expEarned) || 0;
        player.coins += coinsEarned;
        if (potion && potion.cost) player.coins = Math.max(0, player.coins - potion.cost);   // 自動購買丹藥的花費（收入入帳後再扣）
        gainKillProficiency(combatTicks * PROF_OFFLINE_RATE);   // 主修職業熟練度（離線打折，profession.js）
        // 情緣任務（2026-09-29 使用者要求離線也能完成）：野外擊殺與隊伍夥伴的並肩擊殺也累計（partner.js 的 onPartnerFieldKills）。
        // combatTicks 是「收益次數」（新制含每隻收益補償 getKillRewardMult），換回實際擊殺數，與線上同樣速度
        let partnerKills = Math.floor(combatTicks / (NUMERIC_V2 ? getKillRewardMult() : 1));
        if (partnerKills > 0) onPartnerFieldKills(partnerKills);
        if (partnerKills > 0) addFieldRaceKills(player.currentMap, partnerKills);   // 斬妖錄：依這張圖的種族比例計入（race.js）
        if (partnerKills > 0) addFieldRaceTreasureDrops(player.currentMap, partnerKills);   // 剋制法寶掉落（期望值，race.js）
        // 化神訣殘本（2026-10-02 使用者要求離線也能掉）：同線上規則，化神以上地圖每隻 0.5% 掉 1～3（yuanshen.js；不另寫日誌，列在結算訊息）
        let idleScrolls = partnerKills > 0 ? rollFieldHuashenScroll(partnerKills, true) : 0;

        // 離線聲望：以該區「平均擊殺聲望 × OFFLINE_REPUTATION_RATE」計算，刻意低於線上掛機
        let repMax = REPUTATION_MAX_BY_MAP_CATEGORY[getMapCategoryIndex(player.currentMap.name)] || 1;
        let repEarned = Math.floor(combatTicks * ((repMax + 1) / 2) * (isOffline ? OFFLINE_REPUTATION_RATE_OFFLINE : OFFLINE_REPUTATION_RATE));
        player.reputation = (player.reputation || 0) + repEarned;

        // 離線拯救僕從機率發放
        let rescueRolls = Math.floor(combatTicks / 30);
        let rescuedCount = 0;
        for (let i = 0; i < rescueRolls; i++) {
            // 只計算真的救出的人數（tryRescueServant 內還有一次機率判定與上限檢查）
            if (Math.random() < 0.05 && tryRescueServant()) rescuedCount++;
        }

        // 離線斬殺野外修士：波數（戰鬥 tick ÷ 每波平均隻數）× 出現機率，其中一半是敵對陣營、給平均功德（需已解鎖獵殺邪修）
        // 離線不計善惡值、不會遇到暗殺者與懸賞人物（對決只在線上發生）
        let meritEarned = 0;
        if (isEvilHuntUnlocked()) {
            let cultivators = Math.floor(combatTicks / IDLE_WAVE_AVG_MONSTERS * FIELD_CULTIVATOR_WAVE_CHANCE);
            meritEarned = Math.floor(cultivators * 0.5 * (FIELD_MERIT_MIN + FIELD_MERIT_MAX) / 2);
            player.evilKills = (player.evilKills || 0) + cultivators;
            player.merit = (player.merit || 0) + meritEarned;
            settleMeritStones();
        }

        let expText = wasPending ? "修為已滿(待渡劫，無經驗)" : `${Math.floor(gained)} 經驗`;
        msg = `⚔️ ${label}於【${player.currentMap.name}】歷練 ${formatIdleDuration(offlineSeconds)}，獲得 ${expText}、${coinsEarned.toWan()} 靈石與 ${repEarned.toWan()} 點聲望`
            + (meritEarned > 0 ? `、${meritEarned.toWan()} 點功德` : '')
            + (rescuedCount > 0 ? `，並拯救了 ${rescuedCount} 名受困修士！` : '！');
        if (potion && potion.text) msg += `\n${potion.text}`;
        if (idleScrolls > 0) msg += `\n📖 斬殺妖獸時翻出【化神訣殘本】×${idleScrolls}（${player.huashenScrolls.toWan()}／${YUANSHEN_COST[0].n.toWan()}）`;
        if (partnerKills > 0 && (player.partners || []).length) msg += `\n💞 情緣任務：野外擊殺 +${partnerKills.toWan()}${getPartnerTeam().length ? '（隊伍夥伴的並肩擊殺同步累計）' : ''}`;
        if (est.rateMult < 0.995) {
            msg += NUMERIC_V2
                ? `\n⚔️ 以目前實力約需 ${est.hits.toFixed(1)} 回合才能斬殺一隻，戰鬥效率 ${Math.round(est.rateMult * 100)}%（達到同境界一般水準時為 100%）。`
                : `\n⚔️ 以目前實力約需 ${est.hits.toFixed(1)} 擊才能斬殺一隻，戰鬥效率 ${Math.round(est.rateMult * 100)}%（能一擊斬殺時為 100%）。`;
        }
    }
    msg = prefix + msg;

    // 離線期間的門派任務（僕從照常工作；身在宗門時自己的任務也推進，servant.js）
    let questText = settleIdleQuests(offlineSeconds);
    if (questText) msg += `\n${questText}`;

    // 離線期間的歲月流逝（半速，同樣受底線保護）
    let aged = ageLifespan(offlineSeconds, LIFESPAN_OFFLINE_RATE);
    if (aged >= 1) msg += `\n⏳ 歲月流逝，壽元減少 ${formatLifespan(aged)} 年（剩餘 ${formatLifespan(player.lifespan)} 年）。`;

    // 離線期間的靈寵維持費（在離線靈石入帳後結算；經驗加成以離線開始時的出戰狀態計）
    let upkeepText = settleOfflineBeastUpkeep(offlineSeconds);
    if (upkeepText) msg += `\n${upkeepText}`;

    return msg;
}

// 離線／背景的野外戰鬥估算（與 combat.js 的實際規則對應，只取期望值、不擲骰）：
//   妖獸：氣血／攻擊取 getMapMonsterStats（預設 難度 × 500／× 50，地圖可自訂），減傷／閃避依地圖分類（monsterAttrsByMapCategory）
//   hits      = 普攻殺一隻平均要出手幾次 = 無條件進位(妖獸氣血 ÷ (玩家物理攻擊 × (1 − 妖獸減傷))) ÷ 未閃避率
//               （差一點血也要再打一下，所以要進位；實測與模擬誤差約 ±2%）
//   rateMult  = 每秒擊殺相對「一擊斬殺」的比例。一波平均 IDLE_WAVE_AVG_MONSTERS 隻、普攻一次打一隻，
//               波與波之間固定 IDLE_WAVE_GAP_TICKS 秒（刷新 MONSTER_RESPAWN_SECONDS 秒＋生成 1 秒）：
//               每秒擊殺 = N ÷ (GAP + N × hits)，除以「一擊斬殺」時的值即為 rateMult
//   waveDamage = 一波（N 隻依序擊殺）期間妖獸打在玩家身上的總傷害：第 k 隻會出手 k×hits−1 次
//   survivable = waveDamage < 氣血上限（線上還有自動補血，這裡只擋「一波就會被打死」的情況）
// 技能、屬性傷害、靈寵協助都不計，所以估算偏保守（實際通常略快）。
function estimateIdleCombat() {
    if (NUMERIC_V2) return nv2EstimateIdleCombat();   // 新制（numeric.js）
    let map = player.currentMap;
    let mAttrs = monsterAttrsByMapCategory[getMapCategoryIndex(map.name)] || monsterAttrsByMapCategory[1];
    let ms = getMapMonsterStats(map);
    let monsterHp = ms.hp;
    let monsterAtk = ms.atk;
    let dmgPerHit = Math.max(1, getPhysAttack() * (1 - mAttrs.def / 100));
    let hits = Math.ceil(monsterHp / dmgPerHit) / (1 - mAttrs.eva / 100);

    let n = IDLE_WAVE_AVG_MONSTERS, gap = IDLE_WAVE_GAP_TICKS;
    let minHits = 1 / (1 - mAttrs.eva / 100);   // 一擊斬殺時（只受閃避影響）＝ 效率 100%，與舊版離線收益相同
    let rateMult = Math.min(1, (gap + n * minHits) / (gap + n * hits));

    let pAttrs = getPlayerCombatAttrs();
    let hitTaken = monsterAtk * (1 - pAttrs.eva / 100) * (1 - pAttrs.def / 100);
    let monsterTurns = 0;
    for (let k = 1; k <= n; k++) monsterTurns += Math.max(0, k * hits - 1);
    let waveDamage = hitTaken * monsterTurns;
    let maxHp = getMaxHp();

    return { hits, rateMult, waveDamage, maxHp, survivable: waveDamage < maxHp };
}

// ---- 離線／背景的丹藥消耗（新制，2026-09-29 使用者要求「離線也扣丹藥」）----
// 每輪（刷新間隔＋一波戰鬥）妖獸造成 est.waveDamage，刷新期間調息回 restHealPct × MONSTER_RESPAWN_SECONDS，差額靠丹藥補。
// 規則同線上的 checkAutoHealAndMana：背包裡的補血丹先用（回復量高的先），不夠且有開自動補血時以靈石買「可自動購買、回復量最高」的那種。
function idlePotionHealOf(item) { return item.amount * (1 + gearFx("丹心")) * getMaxHp(); }
function idleBuyablePotion() {
    return shopItems.filter(s => s.type === 'heal' && !s.noAutoBuy).sort((a, b) => b.amount - a.amount)[0] || null;
}
// 丹藥回復速度（每秒，受服用冷卻限制）是否跟得上一波戰鬥中的受傷速度；沒開自動補血＝跟不上
function idlePotionCanKeepUp(est) {
    if (!player.autoHp || !player.autoHp.enabled) return false;
    const best = shopItems.filter(s => s.type === 'heal' && ((player.bag[s.id] || 0) > 0 || !s.noAutoBuy)).sort((a, b) => b.amount - a.amount)[0];
    if (!best) return false;
    const fightSec = Math.max(1, NV2.waveAvg * est.hits);
    return est.waveDamage / fightSec <= idlePotionHealOf(best) / POTION_COOLDOWN_SECONDS;
}
// 回傳 { f：可戰鬥比例 0～1, cost：購買花費（由呼叫端在收入入帳後扣）, text：結算說明 }；會直接扣背包丹藥
// coinsFull：假設全程都打得下去時的靈石收入（購買可用「原有靈石＋收入」支付）
function settleIdlePotions(est, seconds, isOffline, coinsFull) {
    const maxHp = getMaxHp();
    const cycle = IDLE_WAVE_GAP_TICKS + NV2.waveAvg * est.hits;                // 一輪秒數
    const rest = Math.min(maxHp, maxHp * NV2.restHealPct / 100 * MONSTER_RESPAWN_SECONDS);
    const perCycle = Math.max(0, est.waveDamage - rest);                       // 每輪要靠丹藥補的氣血
    const cycles = seconds * (isOffline ? OFFLINE_REWARD_MULT : 1) / cycle;    // 與收益同比例（離線打折的部分也不耗藥）
    const need = perCycle * cycles;
    if (need <= 0) return { f: 1, cost: 0, text: '' };
    // 背包丹藥（回復量高的先用）
    const bagItems = shopItems.filter(s => s.type === 'heal' && (player.bag[s.id] || 0) > 0).sort((a, b) => b.amount - a.amount);
    const bagHeal = bagItems.reduce((s, it) => s + player.bag[it.id] * idlePotionHealOf(it), 0);
    // 自動購買
    const buy = player.autoHp && player.autoHp.enabled ? idleBuyablePotion() : null;
    let f = 1;
    if (bagHeal < need) {
        if (!buy) f = bagHeal / need;
        else {
            const cph = buy.cost / idlePotionHealOf(buy);                      // 每點氣血的靈石成本
            const budgetHeal = (player.coins + coinsFull) / cph;
            if (bagHeal + budgetHeal < need) {
                // 收入隨可戰鬥比例 f 變動：bagHeal + (原有靈石 + 收入 × f) / cph = need × f
                const den = need - coinsFull / cph;
                f = den > 0 ? Math.min(1, (bagHeal + player.coins / cph) / den) : 1;
            }
        }
    }
    f = Math.max(0, Math.min(1, f));
    // 實際扣背包與購買
    let remain = need * f;
    const used = [];
    bagItems.forEach(it => {
        if (remain <= 0) return;
        const heal = idlePotionHealOf(it);
        const n = Math.min(player.bag[it.id], Math.ceil(remain / heal));
        player.bag[it.id] -= n; if (player.bag[it.id] <= 0) delete player.bag[it.id];
        remain -= n * heal;
        if (n) used.push(`${it.name} ×${n}`);
    });
    let cost = 0, bought = 0;
    if (remain > 0 && buy) {
        bought = Math.ceil(remain / idlePotionHealOf(buy));
        cost = bought * buy.cost;
    }
    const parts = [];
    if (used.length) parts.push(`背包 ${used.join('、')}`);
    if (bought) parts.push(`自動購買 ${buy.name} ×${bought}（${cost.toWan()} 靈石）`);
    let text = parts.length ? `💊 歷練期間服用丹藥：${parts.join('；')}` : '';
    if (f < 0.999) text += `${text ? '\n' : ''}⚠️ 丹藥${buy ? '與靈石' : ''}不足，只撐了約 ${Math.round(f * 100)}% 的時間，之後無法再戰（${buy ? '請備妥丹藥或靈石' : '請開啟自動補血或備妥丹藥'}）。`;
    return { f, cost, text };
}

function formatIdleDuration(seconds) {
    if (seconds < 60) return `${seconds} 秒`;
    const min = Math.floor(seconds / 60);
    if (min < 60) return `${min} 分鐘`;
    return `${Math.floor(min / 60)} 小時${min % 60 ? ` ${min % 60} 分鐘` : ''}`;
}

// 舊存檔相容：早期版本是「一份 activeQuest + assignedServantIds 共同加速」，
// 新版改為每位僕從各自負責一項任務，這裡把舊資料轉成新結構。
function migrateServantAssignments() {
    if (!Array.isArray(player.servants)) player.servants = [];

    // 舊版僕從 id 可能重複（同一毫秒救出多名），重複者換發新 id，避免解僱時連帶刪掉別人
    let seenIds = new Set();
    player.servants.forEach(s => {
        if (typeof s.quest === 'undefined') s.quest = null;
        if (typeof s.timer !== 'number') s.timer = 0;
        if (!s.id || seenIds.has(s.id)) s.id = Date.now() + "_" + Math.random().toString(36).slice(2, 10);
        seenIds.add(s.id);
    });

    if (Array.isArray(player.assignedServantIds)) {
        let fallbackQuest = player.activeQuest || 'clean';
        player.assignedServantIds.forEach(id => {
            let s = player.servants.find(serv => serv.id === id);
            if (s && !s.quest) {
                s.quest = fallbackQuest;
                s.timer = 0;
            }
        });
        delete player.assignedServantIds;
    }
}

// 舊存檔相容：補齊之後版本新增的裝備部位（例如神器），避免欄位缺漏
function migrateEquipmentSlots() {
    if (!player.equipment || typeof player.equipment !== 'object') player.equipment = {};
    for (let slot in equipTypes) {
        if (!(slot in player.equipment)) player.equipment[slot] = null;
    }
    // 舊版靈寶閣「降魔伏虎杖」的部位是不存在的「杖」，穿上會多出一格，卸下後留下的空格會干擾靈根判定。
    // 移除 equipTypes 以外的部位，原本穿著的裝備退回背包（不受背包上限限制，避免物品消失）。
    for (let slot in player.equipment) {
        if (slot in equipTypes) continue;
        if (player.equipment[slot]) {
            if (!Array.isArray(player.equipInventory)) player.equipInventory = [];
            player.equipInventory.push(player.equipment[slot]);
        }
        delete player.equipment[slot];
    }
}

// 舊存檔相容：補上活動相關欄位（每日任務／千寶閣）
function migrateActivityFields() {
    if (!Array.isArray(player.dailyQuests)) player.dailyQuests = [];
    if (typeof player.dailyRefreshAt !== 'number') player.dailyRefreshAt = 0;
    if (!player.dailyStats || typeof player.dailyStats !== 'object') player.dailyStats = {};
    if (!Array.isArray(player.auctionItems)) player.auctionItems = [];
    if (typeof player.auctionRefreshAt !== 'number') player.auctionRefreshAt = 0;
}

// 舊存檔相容：存檔內的 currentMap 是當時的地圖物件副本，改指向最新設定（倍率調整才會生效）。
// 已不存在的地圖（例如合併進「宗門」的洞府 / 弟子居、演武學宮、後山禁地）一律回到宗門。
// 改名／併入其他地圖的舊名稱 → 新名稱（找不到的名稱才回宗門）
const MAP_RENAMES = { "天南市集": "天南城" };   // 2026-09-30 天南市集併入天南城的城內場景
function migrateCurrentMap() {
    let name = player.currentMap && player.currentMap.name;
    if (MAP_RENAMES[name]) name = MAP_RENAMES[name];
    for (let cat of maps) {
        let found = cat.items.find(item => item.name === name);
        if (found) {
            // 2026-09-28 地圖境界門檻（map.js 的 getMapMinRealm，最多越 1 個大境界）：境界不夠還待在裡面的舊存檔送回宗門
            // （在離線結算之前執行，所以這段離線時間算宗門靜修）
            const need = getMapMinRealm(found);
            if (!cat.isSafe && need && player.realmIndex < need) {
                addLog(`⛩️ 【${found.name}】需【${realms[need]}】以上才能練功（最多越一個大境界），你已被送回宗門。`, "system");
                break;
            }
            player.currentMap = found;
            player.currentMapIsSafe = cat.isSafe;
            return;
        }
    }
    player.currentMap = maps[0].items[0];
    player.currentMapIsSafe = maps[0].isSafe;
}

// 數值重做上線（第 52 節第 3 階段，2026-09-28）：新制下第一次讀到舊存檔時轉換一次，記在 player.nv2Converted
//   使用者決定「不補償、重新來過」：丹藥服用紀錄清空（新制每種最多 200 顆、每顆 +0.1，從 0 開始吃）；藏書閣次數舊制上限 100，本來就在新規則內，保留
//   守城排行榜改用新制數字：已送審的最高波數歸零（player.defenseSubmitted／defensePending），新制下重新送審；氣血靈力夾在新上限內
//   player.nv2Notice = true：進遊戲後跳一次改版公告（main.js 的 showNumericV2Notice）
function migrateNumericV2() {
    if (!NUMERIC_V2 || player.nv2Converted) return;
    player.pillUsed = {};
    player.defenseSubmitted = 0;
    player.defensePending = null;
    player.idleProvenMap = null;   // 戰鬥強度全變，線上實戰證明重新計算
    player.nv2Converted = Date.now();
    player.nv2Notice = true;
}

// 舊存檔相容：人物等級、壽元、分階段宗門技能、靈寵等級制
// savedData 是存檔原始內容：player 已被 Object.assign 合併過預設值（lifespan 60），
// 必須看原始存檔才知道壽元欄位是否真的不存在。
function migrateProgressionFields(savedData) {
    if (typeof player.level !== 'number' || player.level < 1) player.level = 1;
    if (typeof player.levelExp !== 'number') player.levelExp = 0;
    if (typeof savedData.lifespan !== 'number') player.lifespan = getInitialLifespanForRealm(player.realmIndex);
    if (!Array.isArray(savedData.lingbaoSold)) player.lingbaoSold = [];
    migrateGoldenCore(savedData);   // 丹田／金丹／元嬰：老玩家補發中品金丹、地元嬰・中（golden-core.js）
    migrateNumericV2();   // 數值重做上線：舊存檔清空丹藥、重置守城送審（第 52 節）

    // 存檔內的 player.sect 是舊版整包物件，改指向最新設定，技能/倍率調整才會生效
    if (!player.sectSkills || typeof player.sectSkills !== 'object') player.sectSkills = { 1: null, 2: null, 3: null };
    if (player.sect) {
        let sect = findSectByName(player.sect.name);
        player.sect = sect;
        if (sect && !player.sectSkills[sect.tier]) player.sectSkills[sect.tier] = sect.name;
    }

    // 舊版靈獸只存 id 字串，轉成 Lv1 的靈寵物件
    if (!Array.isArray(player.beasts)) player.beasts = [];
    player.beasts = player.beasts.map(b => {
        if (typeof b === 'string') return createBeast(b);
        if (!Array.isArray(b.skills)) b.skills = BEAST_SKILL_LEVELS.map(() => null);
        // 2026-09-29 靈寵技能改版：舊版存的是五行字串（金木水火土），新版存技能 id → 清空讓玩家重新挑選（靈獸園顯示提示）
        if (b.skills.some(s => s && !beastSkillById[s])) {
            b.skills = b.skills.map(s => (s && beastSkillById[s]) ? s : null);
            b.skillsRevamped = true;
        }
        if (typeof b.level !== 'number') b.level = 1;
        if (typeof b.exp !== 'number') b.exp = 0;
        if (typeof b.alive !== 'boolean') b.alive = true;
        if (typeof b.active !== 'boolean') b.active = true;   // 維持費改版前的靈寵預設出戰中
        if (typeof b.upkeepTimer !== 'number') b.upkeepTimer = 0;
        return b;
    });
}

function resetGameCompletely() {
    if (confirm("確定要完全重置遊戲嗎？這將清除所有存檔進度！")) {
        // 重新整理時會觸發 pagehide／visibilitychange 自動存檔（main.js），不擋住的話目前角色又會被寫回去
        gameOver = true;
        localStorage.removeItem('xiuxian_save');
        location.reload();
    }
}

function saveLocal() {
    if (gameOver) return;   // 壽元耗盡後存檔已清除，不可再寫回
    if (saveLoadFailed) return;   // 讀檔失敗期間禁止寫入，保護原本的存檔
    player.lastSaveTime = Date.now();
    localStorage.setItem('xiuxian_save', JSON.stringify(player));
    addLog("💾 遊戲存檔成功！", "system");
}

// 舊版靈寶閣禁術（大羅天經／神魔九變）下修到新標準，數值見 config-lingbao.js 的 legacySkillAdjustments。
// 現行靈寶閣武學兌換時是複製一份 skillData 存進存檔，因此耗魔改用最新設定（例：耗魔調為 3 倍後，舊存檔也會生效）。
// 每次讀檔都套用（結果固定，重複套用不會越改越低）
function migrateLegacySkills() {
    if (!Array.isArray(player.learnedSkills)) { player.learnedSkills = []; return; }
    player.learnedSkills.forEach(sk => {
        let fix = legacySkillAdjustments[sk.name];
        if (fix) Object.assign(sk, fix);
        let current = lingbaoShopItems.find(it => it.skillData && it.skillData.name === sk.name);
        if (current) sk.mpCost = current.skillData.mpCost;
    });
}

// 讀檔與匯入共用：合併預設值 → 各項舊存檔相容 → 清除執行期戰鬥狀態 → 離線收益結算 → 更新畫面
// ⚠️ 必須合併到「全新角色的預設值」（DEFAULT_PLAYER_JSON），不能合併到目前的 player：
//    否則遊戲中匯入缺欄位的舊存檔，會沿用目前角色的等級、宗門技能、靈寶閣購買紀錄等。
// 經驗曲線改版（config-realms.js 的 realmPacing）後，舊存檔的修為可能遠超過新門檻：
// 待渡劫者直接壓回滿格；其餘保留，下次獲得經驗時由 gainExp() 連續升階（大境界仍需渡劫）
function migrateRealmExp() {
    if (player.pendingTribulation && player.exp > getNextExp()) player.exp = getNextExp();
}

// 符寶系統：只補上 talismans 欄位。舊裝備「不補孔」——只有更新後新鍛造／購買／兌換的橙裝才有孔
function migrateEquipSockets() {
    if (!player.talismans || typeof player.talismans !== 'object') player.talismans = {};
}

function applySaveData(data) {
    player = Object.assign(JSON.parse(DEFAULT_PLAYER_JSON), data);
    if (!player.gender) player.gender = "male";
    player.name = sanitizePlayerName(player.name);   // 別人分享的存檔代碼可能夾帶 HTML，道號會被插進日誌
    if (!player.name) player.name = (player.gender === 'female' ? "南宮婉" : "韓立");
    if (!player.stats.cha) player.stats.cha = 10;
    if (!player.studyCounts) player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };
    if (typeof player.pendingTribulation !== 'boolean') player.pendingTribulation = false;
    if (!player.tribulationCount) player.tribulationCount = 0;
    // 舊存檔可能在築基以前就被標記待渡劫，依現行規則清除
    if (player.pendingTribulation && player.realmIndex < TRIBULATION_MIN_REALM_INDEX) player.pendingTribulation = false;
    migrateServantAssignments();
    migrateEquipmentSlots();
    migrateActivityFields();
    migrateCurrentMap();
    migrateProgressionFields(data);
    migrateLegacySkills();
    migrateRealmExp();
    migrateEquipSockets();
    migrateArtifactIds();   // 更新前兌換的神器補上 lingbaoId（artifact.js）
    migrateGearIds();       // 舊裝備依「部位＋五行」對應到圖鑑，數值不變（gear.js）
    migrateGearCodex();     // 持有的圖鑑裝備補記進天磯錄、補齊新欄位（codex.js）
    migrateStrangeFires();  // 未命名的異火補抽成天下異火（strange-fire.js）
    migratePartners();      // 夥伴：舊版單人出戰轉為隊伍、補齊好感欄位（partner.js）
    enforceBeastActiveLimit();   // 出戰上限 BEAST_ACTIVE_MAX（2026-09-30 起三隻）：超過的保留排前面的（beast-combat.js）
    beastMp = {}; partnerMp = {};   // 靈寵、夥伴靈力從滿的開始

    // 換了一份存檔，原本進行中的戰鬥、渡劫、身上狀態都不該延續
    enemies = [];
    respawnTimer = 0;
    inTribulation = false;
    heartDemon = null;
    inBountyDuel = false;
    duelOpponent = null;
    clearDuelDebuffs();
    playerStatus = newStatus();

    // 功德改為滿 MERIT_PER_BUTIAN_STONE 自動凝結（舊存檔若已超過，讀檔時直接凝結）
    settleMeritStones();
    calcOfflineProgress();
    updateUI();
    updateSectFacilitiesUI();
}

// ---- 讀檔失敗保護 ----
// 本地已有存檔但讀取出錯時設為 true：saveLocal() 一律不寫入，避免「開新角色／自動存檔」覆蓋掉原本的存檔。
// ⚠️ 舊版把任何錯誤都報成「格式損毀」並直接跳性別選擇，選了就會覆蓋原存檔。實際最常見的原因不是存檔壞掉，
//    而是更新後瀏覽器快取到「舊 index.html＋新 JS」，畫面元素對不上而拋錯（見 ARCHITECTURE.md 第 30 節）。
let saveLoadFailed = false;
let failedRawSave = null;
const SAVE_BACKUP_KEY = 'xiuxian_save_backup';

function loadLocal() {
    let save = localStorage.getItem('xiuxian_save');
    if (!save) return false;

    let data;
    try {
        data = JSON.parse(save);
    } catch (e) {
        reportLoadFailure(save, `存檔內容無法解析（${e.message}）`, false);
        return false;
    }
    try {
        applySaveData(data);
    } catch (e) {
        console.error("讀檔失敗：", e);
        // 找不到畫面元素（null）幾乎都是新舊版本檔案混用，重新整理即可
        let versionMismatch = e instanceof TypeError && /null|undefined/.test(e.message);
        reportLoadFailure(save, `${e.name}: ${e.message}`, versionMismatch);
        return false;
    }
    saveLoadFailed = false;
    addLog("📂 成功讀取本地存檔！", "system");
    return true;
}

// 備份原始存檔、封鎖寫入，並顯示讀檔失敗視窗（不用 alert/confirm，App 內建瀏覽器可能擋掉）
function reportLoadFailure(raw, reason, versionMismatch) {
    saveLoadFailed = true;
    failedRawSave = raw;
    try {
        localStorage.setItem(SAVE_BACKUP_KEY, raw);
        localStorage.setItem(SAVE_BACKUP_KEY + '_at', String(Date.now()));
    } catch (e) { console.error("備份存檔失敗：", e); }

    let hint = versionMismatch
        ? "這通常是遊戲剛更新、瀏覽器還留著舊版檔案造成的，存檔本身沒有問題。請按「重新整理再試一次」；若仍失敗，電腦請按 Ctrl+F5，手機請清除此網站的快取後再開啟。"
        : "存檔內容可能不完整。請先「顯示原始存檔代碼」複製保存，再回報給開發者協助救回。";

    const modal = document.getElementById('load-error-modal');
    if (!modal) {
        // 快取到舊版 index.html 時頁面上沒有這個視窗：退回用 alert，寫入一樣被封鎖
        alert(`【存檔讀取失敗】\n你的存檔沒有被刪除，也已另外備份。\n\n錯誤原因：${reason}\n\n${hint}\n\n在問題排除前，本次遊戲不會寫入存檔。`);
        return;
    }
    document.getElementById('load-error-reason').innerText = `錯誤原因：${reason}`;
    document.getElementById('load-error-hint').innerText = hint;
    document.getElementById('load-error-raw').style.display = 'none';
    resetAbandonConfirm();
    modal.style.display = 'flex';
}

// 以新網址重新載入，避免拿到快取的舊 index.html
function retryLoadAfterFailure() {
    location.href = location.pathname + '?reload=' + Date.now();
}

function showRawSaveForCopy() {
    const box = document.getElementById('load-error-raw');
    box.value = failedRawSave || localStorage.getItem(SAVE_BACKUP_KEY) || '';
    box.style.display = 'block';
    box.focus();
    box.select();
    try { document.execCommand('copy'); } catch (e) {}
    addLog("📋 已顯示原始存檔代碼（若沒有自動複製，請長按文字框全選複製）。", "system");
}

// 放棄存檔：按兩次才生效（第一次變成確認狀態），備份保留在 xiuxian_save_backup
let abandonArmed = false;
function resetAbandonConfirm() {
    abandonArmed = false;
    const btn = document.getElementById('load-error-newgame');
    if (btn) btn.innerText = "🗑️ 放棄這個存檔，開新角色";
}
function abandonSaveAndStartNew() {
    const btn = document.getElementById('load-error-newgame');
    if (!abandonArmed) {
        abandonArmed = true;
        btn.innerText = "⚠️ 再按一次確認：開新角色（原存檔保留在備份中，但目前進度會被新角色取代）";
        return;
    }
    saveLoadFailed = false;
    player = JSON.parse(DEFAULT_PLAYER_JSON);
    closeModal('load-error-modal');
    if (!gameStarted) document.getElementById('gender-modal').style.display = 'flex';
}

// 「命運與系統 → 讀取本地存檔」按鈕：沒有存檔時也要給回應（loadLocal 本身在開場時需保持安靜）
function reloadLocalSave() {
    if (!loadLocal()) addLog("📂 找不到本地存檔（或存檔已損毀）。", "system");
}

// ---- 存檔代碼（匯出/匯入）----
// 格式（新）："FS2:" + Base64(deflate-raw 壓縮的 UTF-8 JSON)。重度存檔約 4 千字（未壓縮 Base64 約 4 萬字），
//   可以完整貼進 LINE 等通訊軟體（LINE 單則訊息上限約 1 萬字，過長會被截斷或拆開，導致匯入失敗）。
//   瀏覽器沒有 CompressionStream（iOS 16.3 以前）時退回未壓縮的 Base64。
// 匯入相容：FS2 壓縮代碼、未壓縮 Base64、%7B 開頭的最舊版代碼、直接貼上的 JSON。
// ⚠️ 此視窗內「不使用」alert/confirm/prompt：LINE、Facebook 等 App 內建瀏覽器常會擋掉這些原生對話框，
//    confirm 被擋時會直接回傳 false，造成「按了確認匯入卻什麼事都沒發生」。所有訊息都顯示在 #save-code-status，
//    覆蓋進度改為「按兩次確認」。

const SAVE_CODE_PREFIX = "FS2:";

function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

function base64ToBytes(b64) {
    return Uint8Array.from(atob(b64.replace(/\s+/g, "")), c => c.charCodeAt(0));
}

async function pipeBytes(bytes, stream) {
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

async function encodeSaveCode(obj) {
    let bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') {
        return SAVE_CODE_PREFIX + bytesToBase64(await pipeBytes(bytes, new CompressionStream('deflate-raw')));
    }
    return bytesToBase64(bytes);
}

async function decodeSaveCode(code) {
    let text = (code || "").trim();
    if (text.startsWith(SAVE_CODE_PREFIX)) {
        if (typeof DecompressionStream !== 'function') {
            throw new Error("此瀏覽器版本過舊，無法讀取壓縮存檔代碼，請更新瀏覽器（iOS 需 16.4 以上）後再試。");
        }
        let bytes = await pipeBytes(base64ToBytes(text.slice(SAVE_CODE_PREFIX.length)), new DecompressionStream('deflate-raw'));
        return JSON.parse(new TextDecoder().decode(bytes));
    }
    if (text.startsWith("{")) return JSON.parse(text);                        // 直接貼 JSON
    if (text.startsWith("%7B")) return JSON.parse(decodeURIComponent(text));  // 最舊版代碼
    return JSON.parse(new TextDecoder().decode(base64ToBytes(text)));         // 未壓縮 Base64
}

function setSaveCodeStatus(msg, type) {
    const el = document.getElementById('save-code-status');
    el.innerText = msg;
    el.style.color = type === 'error' ? '#ef4444' : (type === 'warn' ? '#facc15' : '#4ade80');
}

let pendingImportData = null;   // 已解析、等待第二次確認的存檔

function resetImportConfirm() {
    pendingImportData = null;
    document.getElementById('save-code-confirm-btn').innerText = "✅ 確認匯入";
}

function openSaveCodeModal(mode) {
    const isExport = mode === 'export';
    document.getElementById('save-code-title').innerText = isExport ? "📤 匯出存檔代碼" : "📥 匯入存檔代碼";
    document.getElementById('save-code-hint').innerText = isExport
        ? "請按「複製代碼」後貼到安全的地方保存（例如傳給自己的 LINE），或下載成檔案。換裝置時用「匯入存檔代碼」還原。"
        : "請把先前匯出的存檔代碼貼到下方（可按「從剪貼簿貼上」），或選擇存檔檔案，再按「確認匯入」。目前的進度會被覆蓋！";
    document.getElementById('save-code-export-actions').style.display = isExport ? 'flex' : 'none';
    document.getElementById('save-code-import-actions').style.display = isExport ? 'none' : 'flex';
    const box = document.getElementById('save-code-text');
    // 匯出時不用 readOnly：iOS 無法用程式選取 readOnly 文字框，改用 inputmode="none" 避免跳出鍵盤
    box.readOnly = false;
    box.setAttribute('inputmode', isExport ? 'none' : 'text');
    box.value = "";
    setSaveCodeStatus("", "ok");
    resetImportConfirm();
    document.getElementById('save-code-modal').style.display = 'flex';
    return box;
}

async function exportSave() {
    let box = openSaveCodeModal('export');
    setSaveCodeStatus("產生代碼中…", "warn");
    try {
        player.lastSaveTime = Date.now();
        box.value = await encodeSaveCode(player);
        setSaveCodeStatus(`代碼長度：${box.value.length.toWan()} 字${box.value.startsWith(SAVE_CODE_PREFIX) ? '（已壓縮）' : ''}`, "ok");
    } catch(e) {
        setSaveCodeStatus("匯出存檔失敗：" + e.message, "error");
    }
}

// 攻略站「屬性與技能」頁（網址中的中文已編碼，請原樣保留；2026-10-01 使用者提供，ARCHITECTURE.md 第 19 節）
// 存檔代碼放在網址的 #（不會送到伺服器），由攻略頁的程式讀取後試算
const GUIDE_CALC_URL = "https://jtnhrbpvvm-spec.github.io/taiwan_game2/%E5%87%A1%E5%A1%B5%E4%BF%AE%E4%BB%99%E5%82%B3/%E5%B1%AC%E6%80%A7%E8%88%87%E6%8A%80%E8%83%BD.html";
function openGuideCalc() {
    // 先同步開視窗，再等代碼產生完才導向；
    // 如果等 await 之後才 window.open，手機瀏覽器會當成彈出視窗擋掉
    const win = window.open("about:blank", "_blank");
    player.lastSaveTime = Date.now();
    encodeSaveCode(player).then(code => {
        const url = GUIDE_CALC_URL + "#save=" + encodeURIComponent(code);   // Base64 有 + / =，一定要編碼
        if (win) win.location.href = url; else location.href = url;
    }).catch(e => {
        if (win) win.close();
        addLog("開啟攻略試算失敗：" + e.message, "system");
    });
}

function selectSaveCodeText() {
    const box = document.getElementById('save-code-text');
    box.focus();
    box.select();
    box.setSelectionRange(0, box.value.length);   // iOS 需要這行才會全選
}

function copySaveCode() {
    const box = document.getElementById('save-code-text');
    // 先同步嘗試 execCommand（仍在點擊事件內，iOS 舊版只接受這種方式），失敗再用 Clipboard API
    selectSaveCodeText();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch(e) {}
    if (ok) { setSaveCodeStatus("✅ 已複製到剪貼簿！", "ok"); return; }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(box.value).then(
            () => setSaveCodeStatus("✅ 已複製到剪貼簿！", "ok"),
            () => { selectSaveCodeText(); setSaveCodeStatus("⚠️ 瀏覽器不允許自動複製，文字已全選，請長按文字框選「複製」。", "warn"); }
        );
    } else {
        setSaveCodeStatus("⚠️ 瀏覽器不允許自動複製，文字已全選，請長按文字框選「複製」。", "warn");
    }
}

function downloadSaveCode() {
    const text = document.getElementById('save-code-text').value;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `fanchen-save_${stamp}.txt`;   // 檔名用英數字，部分手機瀏覽器遇到中文檔名會變亂碼或下載失敗
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    // App 內建瀏覽器常不支援下載，無法偵測是否成功，因此只提示「若沒反應請改用複製」
    setSaveCodeStatus("已送出下載。若沒有出現下載（LINE 等 App 內建瀏覽器不支援），請改用「複製代碼」。", "warn");
}

function importSave() {
    openSaveCodeModal('import');
}

async function pasteSaveCodeFromClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
        setSaveCodeStatus("⚠️ 此瀏覽器無法讀取剪貼簿，請長按文字框選「貼上」。", "warn");
        return;
    }
    try {
        document.getElementById('save-code-text').value = await navigator.clipboard.readText();
        resetImportConfirm();
        setSaveCodeStatus("已貼上，請按「確認匯入」。", "ok");
    } catch(e) {
        setSaveCodeStatus("⚠️ 無法讀取剪貼簿（可能未允許權限），請長按文字框選「貼上」。", "warn");
    }
}

// 「從檔案讀取」：把檔案內容放進文字框，玩家確認後再按「確認匯入」
// （input 不限制檔案類型：部分 Android 會把 .txt 標成 application/octet-stream，限制後反而選不到）
function importSaveFromFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        document.getElementById('save-code-text').value = reader.result;
        resetImportConfirm();
        setSaveCodeStatus(`已讀取檔案：${file.name}，請按「確認匯入」。`, "ok");
    };
    reader.onerror = () => setSaveCodeStatus("讀取檔案失敗，請改用貼上代碼。", "error");
    reader.readAsText(file);
    input.value = "";
}

// 第一次按：解析並顯示存檔資訊；第二次按：真正覆蓋（取代原生 confirm）
async function confirmImportSave() {
    const code = document.getElementById('save-code-text').value;
    const btn = document.getElementById('save-code-confirm-btn');

    if (!pendingImportData) {
        if (!code.trim()) { setSaveCodeStatus("請先貼上存檔代碼或選擇存檔檔案！", "error"); return; }
        let data;
        try {
            data = await decodeSaveCode(code);
            if (!data || typeof data !== 'object' || typeof data.realmIndex === 'undefined') throw new Error("存檔結構不符");
        } catch(e) {
            let reason = e.message && e.message.startsWith("此瀏覽器") ? e.message : "請確認完整複製了整段代碼（可能只複製到一部分，或通訊軟體把它拆成好幾則訊息）。";
            setSaveCodeStatus("「存檔代碼無效」！" + reason, "error");
            return;
        }
        pendingImportData = data;
        btn.innerText = "⚠️ 再按一次，覆蓋目前進度";
        setSaveCodeStatus(`讀取到【${sanitizePlayerName(data.name) || '無名修士'}】（${realms[data.realmIndex] || ''}）的存檔。再按一次按鈕即匯入，目前的進度會被覆蓋。`, "warn");
        return;
    }

    let data = pendingImportData;
    let backup = JSON.stringify(player);
    try {
        applySaveData(data);
        saveLocal();   // 立刻寫入本地存檔，避免重新整理後又回到舊進度
        resetImportConfirm();
        closeModal('save-code-modal');
        addLog("📥 匯入存檔成功！", "system");
    } catch(e) {
        player = JSON.parse(backup);   // 失敗時還原，不留下半套資料
        resetImportConfirm();
        setSaveCodeStatus("匯入存檔失敗：存檔內容有誤。目前進度未受影響。", "error");
    }
}
