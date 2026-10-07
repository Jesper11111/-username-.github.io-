// 每秒戰鬥 tick：安全區打坐、野外遭遇/戰鬥結算、自動補血補魔、僕從救援判定

function combatTick() {
    if (potionCooldownHp > 0) potionCooldownHp--;
    if (potionCooldownMp > 0) potionCooldownMp--;

    // 分頁在背景被瀏覽器放慢／暫停時，補發沒跑到的秒數（離線公式，見 save.js）
    checkBackgroundCatchUp();
    // 加速器（timeguard.js，第 77 節）：時間流速異常時按比例跳過，讓每真實秒最多跑一次
    if (typeof tgAllowTick === 'function' && !tgAllowTick()) return;

    if (gameOver || player.hp <= 0) return;

    // 歲月流逝：每秒依所在地危險度消耗壽元（觸及底線後停止，見 lifespan.js）
    ageLifespan(1);

    // 時空秘境：每秒消耗靈石維持秘境能量，付不起送回復活點（map.js，第 78 節）
    if (!tickSpacetimeUpkeep()) return;

    // 出戰靈寵每 BEAST_UPKEEP_INTERVAL 秒扣維持費（渡劫中同樣計費，付不起自動召回，見 beast-combat.js）
    tickBeastUpkeep();

    if (player.buffTimer > 0) player.buffTimer--;

    // 渡劫期間由 tribulation.js 接管戰鬥，暫停掛機與任務流程
    if (inTribulation) {
        tribulationTick();
        return;
    }
    // 懸賞對決期間由 bounty.js 接管（同樣暫停刷怪與任務流程）
    if (inBountyDuel) {
        bountyDuelTick();
        return;
    }

    checkAutoHealAndMana();

    // 玩家親自執行的門派任務：必須待在宗門
    if (player.activeQuest && isInSect()) {
        let def = getQuestDef(player.activeQuest, getSectTier());
        // 任務在目前宗門等級不存在，或限定僕從執行（例：換了宗門）→ 自動中止
        if (!def || def.requiredQuality || def.servantOnly) {
            player.activeQuest = null;
            player.questTimer = 0;
        } else {
            player.questTimer += getQuestSpeed(def, null);
            let required = getQuestRequiredProgress(def);
            if (player.questTimer >= required) {
                player.questTimer -= required;
                let got = grantQuestRewards(def);
                addDailyProgress('sectQuest');
                addLog(`${def.icon} 任務完成【${def.name}】：獲得 ${got}`, "quest");
                updateUI();
            }
        }
    }

    // 僕從各自執行被指派的任務（不受玩家所在地點限制）
    tickServantQuests();

    // 暫存區滿了不能待在野外（enhance.js），直接送回宗門
    enforceGearStashLimit();

    if (player.currentMapIsSafe) {
        playerStatus = newStatus();   // 回到安全區即解除凍結、燒傷、中毒
        let healRate = 0.1 * getRootBonus().healMult;

        if (player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * healRate);
        if (player.mp < player.maxMp) player.mp = Math.min(player.maxMp, player.mp + player.maxMp * 0.1);

        safeZoneTimer++;
        if (safeZoneTimer >= 5) {
            safeZoneTimer = 0;
            meditateSummary.exp += gainExp(player.currentMap.expRate * 50) || 0;
            meditateSummary.seconds += 5;
            // 日誌減量：經驗仍每 5 秒入帳，日誌每 MEDITATE_LOG_SECONDS 秒彙總一則
            if (meditateSummary.seconds >= MEDITATE_LOG_SECONDS) {
                if (player.pendingTribulation && meditateSummary.exp === 0) {
                    addLog(`🧘‍♂️ 打坐調息中…但修為已然圓滿，唯有渡劫方能更進一步。`);
                } else {
                    addLog(`🧘‍♂️ 於安全區打坐 ${meditateSummary.seconds} 秒，吸收天地靈氣，獲得 ${Math.floor(meditateSummary.exp).toWan()} 點經驗。`);
                }
                meditateSummary = { seconds: 0, exp: 0 };
            }
        }
        updateUI();
        return;
    }

    // 線上實戰證明（背景／離線結算用，save.js）：同一張野外地圖連續撐過 IDLE_PROVEN_SECONDS 秒就記下這張地圖
    fieldOnlineTicks++;
    tickDropBudget();   // 掉寶額度（第 71 節）
    if (fieldOnlineTicks >= IDLE_PROVEN_SECONDS) player.idleProvenMap = player.currentMap.name;

    if (enemies.length === 0) {
        if (respawnTimer > 0) {
            document.getElementById('combat-status').innerText = `⏳ 擊殺完畢，${NUMERIC_V2 ? '調息回復中，' : ''}等待怪物刷新中... (${respawnTimer}秒)`;
            document.getElementById('combat-status').style.color = '#fb923c';
            respawnTimer--;
            regenCompanionMp();   // 出戰靈寵與隊伍夥伴每秒也回靈（beast-combat.js）
            // 新制：刷新等待期間調息，每秒回復一定比例的氣血與靈力（config-numeric.js 的 restHealPct）
            if (NUMERIC_V2) {
                let r = NV2.restHealPct / 100;
                player.hp = Math.min(player.maxHp, player.hp + player.maxHp * r);
                player.mp = Math.min(player.maxMp, player.mp + player.maxMp * r);
                updateUI();
            }
            updateCombatVisualPanel();
            return;
        }

        // 已接取懸賞時，有機率遇上目標而進入一對一對決（bounty.js），本波不刷妖獸
        if (tryStartBountyDuel()) return;

        let count = NUMERIC_V2 ? randInt(NV2.waveMin, NV2.waveMax) : Math.floor(Math.random() * 5) + 1;   // 新制每波 1～3 隻（config-numeric.js）
        let ms = getMapMonsterStats(player.currentMap);
        resetGearWave();   // 首擊、先手盾以「每波」計算（gear.js）
        resetMonsterSkillWave();   // 怪物技能的破甲計時（monster.js）
        waveSummary = { kills: 0, exp: 0, coins: 0, rep: 0, rounds: 0 };
        waveRewardAdj = NUMERIC_V2 ? nv2RewardSpeedAdj(getRewardMap(), getObservedRoundsPerKill()) : 1;   // 新制收益速度上限：每波算一次（numeric.js）；挑戰模式以主要地圖的一般玩家為準（第 70 節）
        // 依這張圖的出沒組合抽圖鑑（config-monsters.js 的 FIELD_MONSTER_POOLS），再套型態（皮厚／敏捷／猛攻／術法／均衡，monster.js；第 66 節）
        for (let i = 0; i < count; i++) {
            let look = pickFieldMonster(player.currentMap);
            let one = NUMERIC_V2 ? getMapMonsterStats(player.currentMap, true) : ms;   // 新制每隻各自擲階數與強度（numeric.js）
            let attrs = applyRaceTraits(Object.assign(rollMonsterAttrs(one.L), { race: look.race }));   // 新制帶同階一般玩家的命中（elements.js）；種族與特性（race.js）
            let tm = applyMonsterType(attrs, look, one.L, player.currentMap);   // 型態：減傷、閃避、暴擊，回傳氣血／攻擊倍率
            let hp = one.hp * raceHpMult(look.race) * tm.hp;   // 種族特性：妖獸氣血加成（config-race.js 的 RACE_TRAITS）
            enemies.push({ hp, maxHp: hp, attack: one.atk * tm.atk, nv2Lv: one.L, mtype: look.type, mskills: look.skills || [], atkType: tm.atkType,
                           name: look.name, icon: look.icon, img: look.img, imgPos: look.pos, attrs, status: newStatus() });
        }
        // 獵殺邪修解鎖後：每波有機率混入一名野外修士（正道／魔道各半），善／惡時另有機率混入暗殺者（merit.js）
        let extraText = [];
        if (isEvilHuntUnlocked()) {
            let addCultivator = (faction, ambush) => {
                let mult = ambush ? AMBUSH_POWER_MULT : FIELD_CULTIVATOR_POWER_MULT;
                let look = ambush ? AMBUSH_IMG : CULTIVATOR_IMGS[faction];   // 戰場實況的圖（config-merit.js，只影響外觀）
                enemies.push({ hp: ms.hp * mult, maxHp: ms.hp * mult, attack: ms.atk * mult * fieldMagicAtkComp(ms.L), atkType: 'mag',   // 修士為術法攻擊（魔防；攻擊補回一般玩家魔防，monster.js）
                               icon: ambush ? AMBUSH_ICON : CULTIVATOR_ICONS[faction], cultivator: faction, ambush: ambush,
                               img: look ? look.img : undefined, imgPos: look ? look.pos : undefined,
                               attrs: applyRaceTraits(Object.assign(rollMonsterAttrs(ms.L), { nature: faction === "邪" ? "dark" : "light", race: faction === "邪" ? "demon" : null })),   // 邪修為暗、正道為光（光暗互剋）；邪修＝魔修（種族剋制），正道＝人修無種族
                               status: newStatus() });
            };
            // 每波機率乘 getWaveChanceMult()：刷新變慢（新制另有每波變長）、波數變少，每小時遇到的次數維持原設計（config-maps.js）
            if (Math.random() < FIELD_CULTIVATOR_WAVE_CHANCE * getWaveChanceMult() * waveRewardAdj) {   // × waveRewardAdj：殺太快（低等地圖秒怪）不會多遇修士、多掉裝備（第 71 節）
                let faction = Math.random() < 0.5 ? "正" : "邪";
                addCultivator(faction, false);
                extraText.push(`一名${CULTIVATOR_ICONS[faction]}${faction === "邪" ? "魔道" : "正道"}修士`);
            }
            let karma = getKarmaState().key;
            if (karma !== "neutral" && Math.random() < AMBUSH_WAVE_CHANCE * getWaveChanceMult() * waveRewardAdj * getAptitudeSpecial().ambushMult) {
                let faction = karma === "good" ? "邪" : "正";
                addCultivator(faction, true);
                extraText.push(`一名${AMBUSH_ICON}${faction === "邪" ? "邪派刺客（衝著你的善名而來）" : "正道獵魔人（前來為民除害）"}`);
            }
        }
        document.getElementById('combat-status').innerText = `⚔️ 遭遇 ${count} 隻妖獸！戰鬥中！`;
        document.getElementById('combat-status').style.color = '#f87171';
        // 戰鬥細節開啟時（ui.js 的 FIELD_LOG_DETAIL）每波都寫遭遇；關閉時只在混入修士／暗殺者時提示
        if (extraText.length) addLog(`⚠️ 遭遇 ${count} 隻妖獸攔路，其中還有${extraText.join("、")}！`, "combat");
        else if (FIELD_LOG_DETAIL) addLog(`⚠️ 遭遇 ${count} 隻妖獸攔路！`, "combat");
        updateCombatVisualPanel();
    } else {
        // 野外戰鬥回合：逐回合訊息不寫日誌（ui.js 的 fieldLogMuted），一波結束寫一則彙總
        fieldLogMuted = true;
        try { fieldCombatRound(); } finally { fieldLogMuted = false; }
    }
}

function fieldCombatRound() {
    petPreTurn();   // 靈寵淨化技能的持續淨化（beast-combat.js）
    // ---- 玩家回合：先結算自身的燒傷/中毒，被凍結則本回合無法出手 ----
    let selfTick = tickStatus(playerStatus);
    if (selfTick.dot > 0) {
        player.hp -= selfTick.dot;
        battleFxDot(selfTick, true);   // 戰鬥面板：燒傷紅字／中毒綠字（battle-fx.js）
        addLog(`🩸 身上的${formatStatus(playerStatus) || '異常狀態'}發作，損失 ${fmtCombat(selfTick.dot)} 點氣血！`, "combat");
        if (player.hp <= 0 && !tryGearUndying()) { player.idleProvenMap = null; onPlayerKilledInField(); return; }
    }

    let playerTags = [];
    if (selfTick.frozen) {
        addLog(`❄️ 你被凍結，本回合無法行動！`, "combat");
    } else {
        playerAttackTurn(getAllSkills(), enemies, playerTags);
        artifactSkillTurn(enemies, playerTags);   // 神器專屬技能（artifact.js）
        professionSkillTurn(enemies, playerTags); // 職業技能（profession.js）
        partnerSkillTurn(enemies, playerTags);    // 出戰夥伴絕學（partner.js）
    }

    // 存活的靈寵各自判定是否出手協助
    petAssistTick(enemies);

    // ---- 怪物身上的燒傷/中毒發作，並記錄誰被凍結 ----
    let dotTotal = 0;
    const dotSum = { burn: 0, poison: 0 };
    enemies.forEach(e => {
        if (e.hp <= 0) return;
        let t = tickStatus(e.status);
        e.hp -= t.dot;
        dotTotal += t.dot;
        dotSum.burn += t.burn; dotSum.poison += t.poison;
        e.skipTurn = t.frozen;
    });
    battleFxDot(dotSum, false);   // 戰鬥面板：怪物身上的燒傷／中毒（全體合計，battle-fx.js）
    let regen = applyRootRegen() + applyGearRegen();
    if (playerTags.length > 0 || dotTotal > 0 || regen > 0) {
        let parts = [];
        if (playerTags.length > 0) parts.push(summarizeTags(playerTags, "💨被閃避"));
        if (dotTotal > 0) parts.push(`持續傷害 ${fmtCombat(dotTotal)}`);
        if (regen > 0) parts.push(`🌿回復 ${regen.toWan()}`);
        addLog(`✨ 屬性效果：${parts.join("｜")}`, "skill");
    }

    let expEarned = 0;
    let coinsEarned = 0;
    let repEarned = 0;
    let killedCount = 0;
    let slainCultivators = [];
    let raceKilled = {};

    enemies = enemies.filter(e => {
        if (e.hp <= 0) {
            expEarned += getRewardMap().expRate * 15;   // 挑戰模式照自己境界的主要地圖（map.js，第 70 節）
            coinsEarned += rollKillCoins();
            repEarned += rollKillReputation();
            killedCount++;
            if (e.attrs && e.attrs.race) { addRaceKill(e.attrs.race, 1); raceKilled[e.attrs.race] = (raceKilled[e.attrs.race] || 0) + 1; }   // 斬妖錄（剋制法寶掉落在下面依掉寶次數擲，第 71 節）
            if (e.cultivator) slainCultivators.push(e);
            return false;
        }
        return true;
    });

    if (expEarned > 0) {
        let fx = getGearEffects();
        // 刷新變慢的補償（getKillRewardMult：舊制 KILL_REWARD_MULT、新制 nv2KillRewardMult）：每隻的經驗／靈石／聲望／熟練度加成，每小時收益維持原設計
        let rewardMult = getKillRewardMult();
        expEarned *= rewardMult;
        coinsEarned = Math.floor(coinsEarned * rewardMult * (1 + (fx["聚財"] || 0)));   // 聚財（裝備特效）
        repEarned = Math.round(repEarned * rewardMult);
        // 噬魂（裝備特效）：每擊殺一隻回復一定比例氣血
        if (fx["噬魂"] && player.hp > 0) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * fx["噬魂"] * killedCount);
        let gainedExp = gainExp(expEarned) || 0;
        player.coins += coinsEarned;
        player.reputation = (player.reputation || 0) + repEarned;
        addDailyProgress('kill', killedCount);
        addTodayFieldKills(killedCount);   // 當日線上擊殺（town-npc.js；青瀾島隱藏仙翁的出現條件）
        onPartnerFieldKills(killedCount);   // 情緣任務的野外擊殺／並肩擊殺（partner.js）
        // 掉寶（第 71 節）：rolls＝這批擊殺換算的掉寶次數（每小時最多 1200 次；難圖每隻多擲補回）
        let rolls = takeDropRolls(killedCount), base = getDropBaseMult();
        Object.keys(raceKilled).forEach(r => rollRaceTreasureDrops(r, rolls * raceKilled[r] / killedCount / base));   // 剋制法寶（race.js）
        rollFieldHuashenScroll(rolls / base);   // 化神訣殘本：化神以上地圖每隻 0.5%（yuanshen.js）
        onCraftFieldKills(rolls);               // 做裝通貨（craft.js，第 69 節）
        rollLingStoneDrops(rolls);              // 五行傳送陣靈石（lingjie.js，第 74 節）
        rollSpellShardFieldDrops(rolls);        // 中品（凡界＋靈界）／上品（靈界）武學秘典碎片（spells.js，第 35 節；挑戰模式 ×1.5～×3）
        rollBlueprintChallengeDrops(rolls);     // 挑戰模式才有的野外鍛造圖紙（equipment.js，第 70 節）
        rollSpacetimeDrops(rolls);              // 時空秘境專屬掉落（map.js，第 78 節）
        onLingjieKills(killedCount, raceKilled);   // 靈界任務榜進度（lingjie.js，第 74 節）
        gainKillProficiency(killedCount * rewardMult);   // 主修職業熟練度（profession.js）
        if (waveSummary) {
            waveSummary.kills += killedCount;
            waveSummary.exp += gainedExp;
            waveSummary.coins += coinsEarned;
            waveSummary.rep += repEarned;
        }
        // 斬殺修士：善惡值變化，敵對陣營另給功德（merit.js 的 onCultivatorKilled）
        slainCultivators.forEach(e => {
            let who = e.ambush ? (e.cultivator === "邪" ? "邪派刺客" : "正道獵魔人") : (e.cultivator === "邪" ? "魔道修士" : "正道修士");
            let merit = onCultivatorKilled(e.cultivator, e.ambush);
            player.merit = (player.merit || 0) + merit;
            addLog(merit > 0
                ? `🙏 斬殺${e.icon}${who}，${getPlayerFaction() === "邪" ? "吸取" : "積累"} ${merit} 點功德！（目前 ${player.merit.toWan()}）`
                : `🗡️ 斬殺${e.icon}${who}（同為${getFactionLabel(e.cultivator)}，不得功德）`, merit > 0 ? "level-up" : "combat");
            // 星允鐵與奪寶（enhance.js／gear.js）：暗殺者必掉星允鐵；野外修士只有敵對陣營才有
            if (e.ambush) {
                addStarIron(randInt(IRON_AMBUSH_AMOUNT[0], IRON_AMBUSH_AMOUNT[1]), `從${who}身上搜出星允鐵`);
                let loot = tryLootDrop('ambush');
                if (loot) addLog(loot, "equip");
            } else if (merit > 0) {
                if (Math.random() < IRON_FIELD_CULTIVATOR_CHANCE) addStarIron(1, `從${who}身上搜出星允鐵`);
                let loot = tryLootDrop('cultivator');
                if (loot) addLog(loot, "equip");
            }
        });
        if (slainCultivators.length > 0) settleMeritStones();
        // 救援判定次數同樣乘補償倍率（小數部分以機率補一次），每小時救到的人數維持原設計
        let rescueRolls = killedCount * rewardMult;
        rescueRolls = Math.floor(rescueRolls) + (Math.random() < rescueRolls % 1 ? 1 : 0);
        for (let k = 0; k < rescueRolls; k++) {
            tryRescueServant();
        }
    }
    if (waveSummary) waveSummary.rounds++;

    if (enemies.length === 0) {
        respawnTimer = getMapRespawnSeconds();   // 時空秘境 3 秒（map.js，第 78 節）
        document.getElementById('combat-status').innerText = `⚔️ 敵方全滅！${respawnTimer}秒後刷新下一波怪物...`;
        document.getElementById('combat-status').style.color = '#fb923c';
        // 日誌減量：一波一則彙總（取代逐回合的出手／斬殺訊息）
        if (waveSummary && waveSummary.kills > 0) {
            let s = waveSummary;
            recordObservedRoundsPerKill(s.rounds / s.kills);   // 收益速度上限用實測速度（numeric.js 的 nv2RewardSpeedAdj）
            let expText = (player.pendingTribulation && s.exp === 0) ? "修為已滿(待渡劫)" : `${Math.floor(s.exp).toWan()} 經驗`;
            addLog(`⚔️ ${s.rounds} 回合擊退 ${s.kills} 名敵手，獲得 ${expText}、${s.coins.toWan()} 靈石、${s.rep.toWan()} 聲望。`, "combat", true);
        }
        waveSummary = null;
    } else {
        // ---- 怪物回合：每隻各自命中判定（玩家的閃避/防禦生效，怪物的屬性傷害可施加在玩家身上；妖獸會暴擊，第 66 節）----
        let basePlayerAttrs = getPlayerCombatAttrs();
        let playerDef = { attrs: playerAttrsUnderSunder(basePlayerAttrs), status: playerStatus };   // 被怪物「破甲」時防禦打折（monster.js）
        let totalDmg = 0;
        let enemyTags = [];
        let frozenCount = 0;
        lastMonsterSkillText = '';
        enemies.forEach(e => {
            if (e.hp <= 0) return;   // 被反震／閃擊反擊打倒的，下一回合才結算擊殺
            if (e.skipTurn) { frozenCount++; return; }
            let ms = monsterPreAttack(e);   // 怪物技能：狂暴、重擊、自癒、幻身（monster.js，第 66 節第 3 期）
            let atk = e.attack * petEnemyAtkMult(e) * ms.atkMult;   // 被靈寵削弱時攻擊降低（beast-combat.js）
            let r = resolveHit(atk, { attrs: e.attrs || {}, power: atk, dmgType: e.atkType }, playerDef);   // 術法型、魔修、修士為術法攻擊（走魔防，第 66 節第 4 期 A）
            // 裝備特效：物理攻擊吃金身、術法攻擊吃化勁；反震、閃擊反擊（gear.js）；護盾與最低傷害保底逐擊計算（beast-combat.js）
            let dealt = applyPetDamageReduction(applyGearDefense(r, e, e.atkType === 'mag', r.tags), r);
            totalDmg += dealt;
            if (e.hp > 0) e.hp = Math.min(e.maxHp, e.hp + raceLifestealHeal(e.attrs, dealt));   // 種族特性：魔修吸血（race.js）
            monsterPostHit(e, ms.skill, r, dealt, atk, basePlayerAttrs);   // 撕咬、毒牙、烈焰、寒息、破甲
            enemyTags = enemyTags.concat(r.tags);
        });
        if (fieldSunderTurns > 0) fieldSunderTurns--;
        let taken = NUMERIC_V2 ? roundDmg(totalDmg) : totalDmg;   // 多隻加總後去掉浮點尾數（新制 2 位小數）
        player.hp -= taken;
        battleFxHurt(taken, taken <= 0 && enemyTags.includes("dodge"), enemyTags);   // 戰鬥面板飄字（battle-fx.js；依妖獸屬性上色）
        if (enemyTags.length > 0 || frozenCount > 0) {
            let parts = [];
            if (frozenCount > 0) parts.push(`${frozenCount} 隻妖獸被凍結無法出手`);
            if (enemyTags.length > 0) parts.push(`妖獸攻勢：${summarizeTags(enemyTags, "💨你閃避了")}`);
            addLog(`⚠️ ${parts.join("｜")}`, "combat");
        }

        if (player.hp <= 0 && !tryGearUndying()) { player.idleProvenMap = null; onPlayerKilledInField(); return; }
    }
    updateUI();
}

// 妖獸的攻擊與氣血：預設 攻擊 = 難度 × 50、氣血 = 攻擊 × 10；地圖可用 monsterAtk／monsterHp 直接指定（config-maps.js）
// 野外修士／暗殺者再乘上各自倍率；離線估算（save.js 的 estimateIdleCombat）也用這裡
// roll = true（新制刷怪時）：每隻隨機階數與強度倍率；不給＝平均值
function getMapMonsterStats(map, roll) {
    if (NUMERIC_V2) return nv2MonsterStats(map, roll);   // 新制：地圖定境界、玩家定階數，× 強度倍率（numeric.js）
    let atk = typeof map.monsterAtk === 'number' ? map.monsterAtk : map.diff * 50;
    let hp = typeof map.monsterHp === 'number' ? map.monsterHp : map.diff * 500;
    return { atk, hp };
}

// 每隻擊殺收益的補償倍率：舊制為刷新變慢的 KILL_REWARD_MULT（config-maps.js）；新制妖獸要打很多下，改用 nv2KillRewardMult（numeric.js）
// 新制另乘 waveRewardAdj：殺得比同境界一般玩家快太多時打折，每小時收益最多 NV2.rewardSpeedCap 倍（numeric.js 的 nv2RewardSpeedAdj）
let waveRewardAdj = 1;
// 實測速度（2026-10-05）：這張地圖最近幾波的「每隻回合數」（一波回合數 ÷ 擊殺數，指數平均），換圖就重來；不存檔
let waveObs = { map: null, rpk: null };
function recordObservedRoundsPerKill(rpk) {
    if (!(rpk > 0) || !player.currentMap) return;
    const name = player.currentMap.name;
    waveObs = waveObs.map === name && waveObs.rpk != null ? { map: name, rpk: waveObs.rpk * 0.7 + rpk * 0.3 } : { map: name, rpk };
}
function getObservedRoundsPerKill() { return player.currentMap && waveObs.map === player.currentMap.name ? waveObs.rpk : null; }
function getKillRewardMult() {
    return NUMERIC_V2 ? nv2KillRewardMult(getRewardMap()) * waveRewardAdj : KILL_REWARD_MULT;   // 挑戰模式用主要地圖的補償（第 70 節）
}
// 掉寶次數（第 71 節，2026-10-03 使用者選「每小時封頂＋難圖補償」）：
//   想要的次數＝擊殺數 × 所在地圖的刷新補償（nv2KillRewardMult：一般玩家在任何地圖每小時都是 1200 次，難圖殺得慢、每隻多擲）；
//   但不能超過「野外實際經過秒數 ÷ 3」累積的額度 dropBudget（每秒 +1/3、最多存 DROP_BUDGET_MAX）→ 殺再快每小時也最多 1200 次（低等地圖秒怪不再多掉）。
//   用所在地圖而非挑戰模式的主要地圖，所以越級挑戰的掉寶照實際難度補償（經驗則照主要地圖）
let dropBudget = 0;
const DROP_BUDGET_MAX = 60;
function tickDropBudget() { dropBudget = Math.min(DROP_BUDGET_MAX, dropBudget + 1 / 3); }
function takeDropRolls(kills) {
    if (!NUMERIC_V2) return kills;
    const got = Math.min(kills * nv2KillRewardMult(player.currentMap), dropBudget);
    dropBudget -= got;
    return got;
}
// 法寶、化神訣殘本原本以「實際擊殺數」校準：除以自己境界主要地圖的補償，一般玩家在主要地圖每小時掉量不變
function getDropBaseMult() {
    const m = typeof getMainMapForRealm === 'function' && getMainMapForRealm();
    return NUMERIC_V2 && m ? nv2KillRewardMult(m) : 1;
}
// 「每波」遭遇機率（野外修士、暗殺者、懸賞人物）的補償倍率：每小時波數變少多少就放大多少
function getWaveChanceMult() {
    return NUMERIC_V2 ? nv2WaveChanceMult(player.currentMap) : KILL_REWARD_MULT;
}

// 擊殺一隻妖獸的靈石：該地圖的 coins ±20%（數值表與每小時上限見 config-maps.js）
function rollKillCoins() {
    if (isSpacetimeMap()) return 0;   // 時空秘境不掉靈石（第 78 節）
    const m = getRewardMap();   // 挑戰模式照自己境界的主要地圖（map.js，第 70 節）
    let base = m.coins;
    if (typeof base !== 'number') base = m.diff * 10;   // 保險：舊資料沒有 coins 時沿用舊公式
    return Math.floor(base * (0.8 + Math.random() * 0.4));
}

// 擊殺一隻妖獸的聲望：依所在地圖分類隨機 1 ~ 上限（見 config-maps.js 的 REPUTATION_MAX_BY_MAP_CATEGORY）
function rollKillReputation() {
    let max = REPUTATION_MAX_BY_MAP_CATEGORY[getMapCategoryIndex(getRewardMap().name)] || 1;
    return Math.floor(Math.random() * max) + 1;
}

// 木系靈根（生／榮）的每回合回復：野外與渡劫共用，回傳實際回復量
function applyRootRegen() {
    let rate = getRootBonus().regen;
    if (rate <= 0 || player.hp <= 0 || player.hp >= player.maxHp) return 0;
    let heal = Math.min(player.maxHp - player.hp, player.maxHp * rate);
    player.hp += heal;
    return Math.floor(heal);
}

// 玩家本回合出手（普攻或技能）；每一擊都經過 resolveHit()，觸發的效果標籤推進 tags
// 裝備特效（gear.js）：首擊／燃魂／斬殺（每擊倍率）、冰封／連雷／毒爆（命中連鎖）、法爆、聚靈、吸血、追擊、橫掃、疾風
//   isExtra：疾風觸發的第二次出手（不會再觸發疾風）
function playerAttackTurn(availableSkills, targets, tags, isExtra) {
    if (!isExtra) gearWaveRound++;
    let fx = getGearEffects();
    let usedSkill = false;
    let dealtTotal = 0;
    let baseAttrs = getPlayerCombatAttrs();
    let firstAlive = () => targets.find(t => t.hp > 0) || targets[0];
    // dmgType：'mag'＝術法技能（走敵人魔抗、魔法暴擊，第 66 節第 4 期 A）；普攻與物理技能不給
    let hitTarget = (target, dmg, attrs, dmgType) => {
        if (!target) return 0;
        // petVulnMult：目標被靈寵施加「破綻」時受到的傷害提高（beast-combat.js）
        let r = resolveHit(dmg * getGearHitMult(fx, target) * petVulnMult(target), { attrs, power: dmgType === 'mag' ? getMagAttack() : getPhysAttack(), dmgType }, { attrs: target.attrs || {}, status: target.status || newStatus() });
        target.hp -= r.dmg;
        r.tags.forEach(t => tags.push(t));
        let dealt = r.dmg + applyGearHitChain(fx, target, targets, r, tags);
        dealtTotal += dealt;
        battleFxHit(dealt, r.tags);   // 戰鬥面板飄字／爆擊特效（battle-fx.js）
        // 變異屬性（config-elements.js）：聖光回復最大氣血、暗蝕吸取該擊傷害
        if (r.tags.includes("light") && player.hp > 0) player.hp = Math.min(player.maxHp, player.hp + player.maxHp * LIGHT_HEAL);
        if (r.tags.includes("dark") && player.hp > 0 && r.dmg > 0) player.hp = Math.min(player.maxHp, player.hp + r.dmg * DARK_LIFESTEAL);
        return dealt;
    };

    if (availableSkills.length > 0 && Math.random() < 0.4) {
        let skill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
        let mpCost = Math.ceil(skillMpCost(skill.mpCost) * (1 - (fx["聚靈"] || 0)));   // 聚靈：技能耗魔降低；新制耗魔 ×0.1（numeric.js）
        if (player.mp >= mpCost) {
            player.mp -= mpCost;
            usedSkill = true;

            let skillDmg = (skill.dmgType === 'mag' ? getMagAttack() * skill.mult : getPhysAttack() * skill.mult)
                * getRootBonus().skillMult * (1 + (fx["法爆"] || 0));
            let attrs = withSkillEffect(baseAttrs, skill);
            let cost = ` (消耗 ${fmtCombat(mpCost)} 靈力`;
            // 魔功反噬：扣最大氣血的 hpCost 比例，不會因此死亡（仙法，spells.js）
            if (skill.hpCost) {
                let lost = Math.min(Math.max(0, player.hp - 1), Math.floor(player.maxHp * skill.hpCost));
                player.hp -= lost;
                cost += `，反噬 ${fmtCombat(lost)} 氣血`;
            }
            cost += `)`;
            let dealt = 0;
            let skillHits = null;   // 造成傷害的技能：記下出手方式，套裝「連發」時再打一次

            if (skill.type === "aoe") {
                addLog(skill.msg + cost, "skill");
                skillHits = () => targets.forEach(e => { dealt += hitTarget(e, skillDmg, attrs, skill.dmgType); });
            } else if (skill.type === "heal") {
                player.hp = Math.min(player.maxHp, player.hp + player.maxHp * skill.mult);
                addLog(skill.msg + cost, "heal");
            } else if (skill.type === "buff") {
                player.buffTimer = skill.duration;
                player.buffMult = skill.mult;
                addLog(skill.msg + cost, "skill");
            } else if (skill.type === "shield") {
                // 守護：玩家本身的護盾（selfShield*，applyPetDamageReduction 套用；與裝備減傷一起受「玩家本身 20%」上限）
                selfShieldRate = selfShieldTimer > 0 ? Math.max(selfShieldRate, skill.reduce) : skill.reduce;
                selfShieldTimer = Math.max(selfShieldTimer, skill.duration);
                addLog(skill.msg + cost + ` 受到傷害 -${Math.round(selfShieldRate * 100)}%`, "skill");
            } else if (skill.type === "control") {
                // 牽制：造成傷害並以 freeze 機率定身（沿用冰凍狀態）
                let ctrlAttrs = Object.assign({}, attrs, { ice: Math.max(attrs.ice || 0, skill.freeze * 100) });
                addLog(skill.msg + cost, "skill");
                skillHits = () => (skill.aoe ? targets : [firstAlive()]).forEach(e => { dealt += hitTarget(e, skillDmg, ctrlAttrs, skill.dmgType); });
            } else {
                addLog(skill.msg + cost, "skill");
                skillHits = () => { dealt += hitTarget(firstAlive(), skillDmg, attrs, skill.dmgType); };
            }
            if (skillHits) {
                skillHits();
                // 套裝（法攻 6 件）：技能 15% 機率連發一次
                if (hasSetSpecial("echo") && Math.random() < 0.15 && targets.some(t => t.hp > 0)) { tags.push("echo"); skillHits(); }
            }
            // 吸血（木、血屬性仙法）
            if (skill.lifesteal && dealt > 0) {
                player.hp = Math.min(player.maxHp, player.hp + dealt * skill.lifesteal);
            }
        } else {
            addLog(`💦 靈力不足 (需 ${fmtCombat(mpCost)} 靈力)，無法施展【${skill.name}】，改以普通攻擊迎敵！`, "skill");
        }
    }

    if (!usedSkill) {
        let main = firstAlive();
        hitTarget(main, getPhysAttack(), baseAttrs);
        // 套裝（物攻 6 件）：普攻 15% 機率觸發「○○之怒」全體 ×1.5
        if (hasSetSpecial("rage") && Math.random() < 0.15 && targets.some(t => t.hp > 0)) {
            targets.filter(t => t.hp > 0).forEach(t => hitTarget(t, getPhysAttack() * 1.5, baseAttrs));
            tags.push("rage");
        }
        // 橫掃：普攻波及其他敵人
        if (fx["橫掃"] && Math.random() < fx["橫掃"]) {
            let others = targets.filter(t => t !== main && t.hp > 0);
            if (others.length) { others.forEach(t => hitTarget(t, getPhysAttack() * 0.4, baseAttrs)); tags.push("cleave"); }
        }
        // 新制敏捷：連擊，本回合再打一次普攻（numeric.js）
        if (NUMERIC_V2 && targets.some(t => t.hp > 0) && Math.random() < nv2Combo() + petFxVal('combo') / 100) {   // 靈寵增益「連擊率」另外加
            hitTarget(firstAlive(), getPhysAttack(), baseAttrs);
            tags.push("combo");
        }
    }
    // 風擊（變異屬性）：每回合機率追加一擊 ×WIND_HIT_MULT
    if (baseAttrs.wind > 0 && Math.random() < baseAttrs.wind / 100 && targets.some(t => t.hp > 0)) {
        hitTarget(firstAlive(), getPhysAttack() * WIND_HIT_MULT, Object.assign({}, baseAttrs, { ysWind: true }));   // ysWind：風元神加成（resolveHit）
        tags.push("wind");
    }
    // 追擊：追加一次攻擊 ×0.6
    if (fx["追擊"] && Math.random() < fx["追擊"] && targets.some(t => t.hp > 0)) {
        hitTarget(firstAlive(), getPhysAttack() * 0.6, baseAttrs);
        tags.push("chase");
    }
    // 吸血（裝備特效）：本回合造成傷害的一定比例回復氣血
    if (fx["吸血"] && dealtTotal > 0 && player.hp > 0) {
        player.hp = Math.min(player.maxHp, player.hp + dealtTotal * fx["吸血"]);
    }
    // 吸血（靈寵增益「血祭」等，beast-combat.js）
    if (petFxVal('lifesteal') && dealtTotal > 0 && player.hp > 0) {
        player.hp = Math.min(player.maxHp, player.hp + dealtTotal * petFxVal('lifesteal'));
    }
    // 疾風：本回合再出手一次（不會連鎖）
    if (!isExtra && fx["疾風"] && Math.random() < fx["疾風"] && targets.some(t => t.hp > 0)) {
        tags.push("haste");
        playerAttackTurn(availableSkills, targets, tags, true);
    }
}

// 野外戰死：折壽、靈寵陣亡、損失靈石並被送回宗門
function onPlayerKilledInField() {
    fieldLogMuted = false;   // 戰死、折壽、靈寵陣亡等訊息一定要顯示（野外回合中日誌是靜音的，ui.js）
    waveSummary = null;
    playerStatus = newStatus();
    if (handlePlayerDeath()) return;
    player.hp = 1;
    enemies = [];
    respawnTimer = 0;
    let lostCoins = Math.floor(player.coins * 0.1);
    player.coins -= lostCoins;
    addLog(`💀 寡不敵眾，身受重傷！被路過修士救回${respawnPlaceName()}，遺失了 ${lostCoins} 靈石... (當前氣血：1 滴殘血，開始靜修療傷)`, "combat");
    sendToRespawn();   // 身在靈界＝天元城外，否則宗門（lingjie.js，第 74 節）
    updateUI();
}

// 自動補血/補魔：優先消耗背包藥品（由高階往低階），背包沒有才以靈石自動購買。
// 受 POTION_COOLDOWN_SECONDS 冷卻限制；標記 noAutoBuy 的丹藥永遠不會被自動購買（但可手動買來讓自動服用）。
function checkAutoHealAndMana() {
    if (player.hp <= 0) return;

    if (player.autoHp.enabled && potionCooldownHp <= 0) {
        let hpPercent = (player.hp / player.maxHp) * 100;
        if (hpPercent <= player.autoHp.threshold && player.hp < player.maxHp) {
            let bagItem = shopItems
                .filter(s => s.type === 'heal' && player.bag[s.id] > 0)
                .sort((a, b) => b.amount - a.amount)[0];

            if (bagItem) {
                player.bag[bagItem.id]--;
                if (player.bag[bagItem.id] <= 0) delete player.bag[bagItem.id];
                player.hp = Math.min(player.maxHp, player.hp + player.maxHp * bagItem.amount * (1 + gearFx("丹心")));
                potionCooldownHp = POTION_COOLDOWN_SECONDS;
                addDailyProgress('potion');
                addLog(`⚡ [自動補血] 服用背包中的【${bagItem.name}】，氣血回復 ${Math.round(bagItem.amount * 100)}%！`, "heal");
            } else {
                let buyItem = shopItems
                    .filter(s => s.type === 'heal' && !s.noAutoBuy && player.coins >= s.cost)
                    .sort((a, b) => b.amount - a.amount)[0];
                if (buyItem) {
                    player.coins -= buyItem.cost;
                    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * buyItem.amount * (1 + gearFx("丹心")));
                    potionCooldownHp = POTION_COOLDOWN_SECONDS;
                addDailyProgress('potion');
                    addLog(`⚡ [自動補血] 自動購買並服下【${buyItem.name}】，氣血回復 ${Math.round(buyItem.amount * 100)}%！`, "heal");
                }
            }
        }
    }

    if (player.autoMp.enabled && potionCooldownMp <= 0) {
        let mpPercent = (player.mp / player.maxMp) * 100;
        if (mpPercent <= player.autoMp.threshold && player.mp < player.maxMp) {
            let bagItem = shopItems
                .filter(s => s.type === 'mp' && player.bag[s.id] > 0)
                .sort((a, b) => b.amount - a.amount)[0];

            if (bagItem) {
                player.bag[bagItem.id]--;
                if (player.bag[bagItem.id] <= 0) delete player.bag[bagItem.id];
                player.mp = Math.min(player.maxMp, player.mp + player.maxMp * bagItem.amount * (1 + gearFx("丹心")));
                potionCooldownMp = POTION_COOLDOWN_SECONDS;
                addDailyProgress('potion');
                addLog(`✨ [自動補魔] 服用背包中的【${bagItem.name}】，靈力回復 ${Math.round(bagItem.amount * 100)}%！`, "skill");
            } else {
                let buyItem = shopItems
                    .filter(s => s.type === 'mp' && !s.noAutoBuy && player.coins >= s.cost)
                    .sort((a, b) => b.amount - a.amount)[0];
                if (buyItem) {
                    player.coins -= buyItem.cost;
                    player.mp = Math.min(player.maxMp, player.mp + player.maxMp * buyItem.amount * (1 + gearFx("丹心")));
                    potionCooldownMp = POTION_COOLDOWN_SECONDS;
                addDailyProgress('potion');
                    addLog(`✨ [自動補魔] 自動購買並服下【${buyItem.name}】，靈力回復 ${Math.round(buyItem.amount * 100)}%！`, "skill");
                }
            }
        }
    }
}

// 野外擊殺後機率觸發拯救僕從（魅力提升史詩/傳說機率）；回傳是否真的救出
function tryRescueServant() {
    if (Math.random() < 0.05) {
        if (player.servants.length >= MAX_SERVANTS) {
            addLog(`🆘 遇見一名受困修士，但僕從小屋已滿（${MAX_SERVANTS} 名），只能目送其離去…`, "servant");
            return false;
        }
        let totalCha = player.stats.cha + getEquipBonus().cha;
        let epicBonus = Math.min(totalCha * 0.0005, 0.05);
        let legendBonus = Math.min(totalCha * 0.0001, 0.01);

        let adjustedQualities = servantQualities.map(q => {
            let copy = { ...q };
            if (q.name === "史詩") copy.weight += epicBonus;
            if (q.name === "傳說") copy.weight += legendBonus;
            return copy;
        });

        let totalWeight = adjustedQualities.reduce((acc, cur) => acc + cur.weight, 0);
        let rand = Math.random() * totalWeight;
        let cumWeight = 0;
        let selectedQuality = adjustedQualities[0];

        for (let q of adjustedQualities) {
            cumWeight += q.weight;
            if (rand <= cumWeight) {
                selectedQuality = q;
                break;
            }
        }

        let sName = servantNames[Math.floor(Math.random() * servantNames.length)] + " (僕從)";
        let newServant = {
            // 離線結算會在同一毫秒內救出多名僕從，隨機段需夠長以免 id 重複（重複會導致解僱時連帶刪掉別人）
            id: Date.now() + "_" + Math.random().toString(36).slice(2, 10),
            name: sName,
            quality: selectedQuality.name,
            mult: selectedQuality.mult,
            quest: null,    // 負責的任務代號，於僕從小屋指派
            timer: 0        // 該僕從自身的任務進度
        };

        player.servants.push(newServant);
        addDailyProgress('rescue');
        addLog(`🆘 在野外歷練時，憑藉高超氣質與魅力拯救了一名受困修士【${newServant.name}】！品質：<span class="quality-${newServant.quality}">${newServant.quality}</span> (任務速度 x${newServant.mult})！`, "servant");
        return true;
    }
    return false;
}
