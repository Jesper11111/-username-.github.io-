// 共用 UI 更新：頂部狀態列、戰鬥實況面板、技能列表、日誌、彈窗開關

// 角色頭像與預設道號（戰鬥實況與開場性別選擇共用）
// 頭像為本地檔案（images/）；原圖是橫式，裁成圓形時用 pos（CSS object-position）對準臉部
const PLAYER_AVATARS = {
    male:   { img: "images/avatar-male.jpg",   pos: "49% center", defaultName: "韓立",   label: "男修" },
    female: { img: "images/avatar-female.jpg", pos: "29% center", defaultName: "南宮婉", label: "女修" }
};

function updateAutoSettings() {
    player.autoHp.enabled = document.getElementById('auto-hp-enabled').checked;
    player.autoHp.threshold = parseInt(document.getElementById('auto-hp-threshold').value) || 50;
    player.autoMp.enabled = document.getElementById('auto-mp-enabled').checked;
    player.autoMp.threshold = parseInt(document.getElementById('auto-mp-threshold').value) || 30;
}

function syncAutoSettingsUI() {
    document.getElementById('auto-hp-enabled').checked = player.autoHp.enabled;
    document.getElementById('auto-hp-threshold').value = player.autoHp.threshold;
    document.getElementById('auto-mp-enabled').checked = player.autoMp.enabled;
    document.getElementById('auto-mp-threshold').value = player.autoMp.threshold;
}

function updateSectFacilitiesUI() {
    const questBtn = document.getElementById('btn-sect-quest');
    const fieldBtn = document.getElementById('btn-sect-field');
    const beastBtn = document.getElementById('btn-sect-beast');

    const forbiddenLingbao = document.getElementById('btn-forbidden-lingbao');
    const forbiddenLibrary = document.getElementById('btn-forbidden-library');
    const forbiddenForge = document.getElementById('btn-forbidden-forge');
    const forbiddenAlchemy = document.getElementById('btn-forbidden-alchemy');
    const talismanBtn = document.getElementById('btn-sect-talisman');

    // 身在宗門時，所有宗門設施一律開放
    const display = isInSect() ? 'block' : 'none';
    [questBtn, fieldBtn, beastBtn, forbiddenLingbao, forbiddenLibrary, forbiddenForge, forbiddenAlchemy, talismanBtn]
        .forEach(btn => { btn.style.display = display; });
}

// 五行相剋說明文字（滑鼠提示用），例：「火剋金（傷害 +30%）；被水剋（傷害 -30%）」
function formatWuxingCounterTip(elem) {
    let beatenBy = Object.keys(WUXING_COUNTERS).find(k => WUXING_COUNTERS[k] === elem);
    return `${elem}剋${WUXING_COUNTERS[elem]}（對其傷害 +${Math.round(WUXING_COUNTER_BONUS * 100)}%）；`
        + `被${beatenBy}剋（對其傷害 -${Math.round(WUXING_COUNTERED_PENALTY * 100)}%）`;
}

function updateCombatVisualPanel() {
    let playerElem = getPlayerElement();
    document.getElementById('battle-player-name').innerText = (player.name || (player.gender === 'female' ? "南宮婉" : "韓立"))
        + (playerElem ? `【${playerElem}】` : '');
    let playerSt = formatStatus(playerStatus);
    // 玩家 HUD（battle-fx.js 的血條）：氣血／法力／修為三條
    document.getElementById('battle-player-hp').innerText = `${fmtFxNum(Math.max(0, player.hp))} / ${fmtFxNum(player.maxHp)}${playerSt ? ' ' + playerSt : ''}${player.weakened ? ' 😵虛弱' : ''}`;
    setBattleBar('bf-hp-fill', 'bf-hp-trail', player.hp, player.maxHp);
    document.getElementById('bf-mp-text').innerText = `${fmtFxNum(Math.max(0, player.mp))} / ${fmtFxNum(player.maxMp)}`;
    setBattleBar('bf-mp-fill', null, player.mp, player.maxMp);
    document.getElementById('bf-exp-text').innerText = player.pendingTribulation ? '⚡ 修為圓滿・待渡劫' : `${Math.floor(player.exp).toWan()} / ${getNextExp().toWan()}`;
    setBattleBar('bf-exp-fill', null, player.exp, getNextExp());
    updateBattleHero();

    const avatarContainer = document.getElementById('battle-player-icon');
    const avatar = getPlayerAvatar();   // 玩家選用的頭像（avatar.js），未選則依性別
    // 帶頭像光環（avatar.js），放在 HUD 徽章中央；大小由 CSS 的 #battle-player-icon .framed-avatar 決定。
    // 內容沒變就不重寫，避免每秒重新載入圖片
    const battleAvatarHtml = renderFramedAvatar(avatar, getPlayerFrame(), '60px', 'battle-avatar');
    if (avatarContainer.dataset.html !== battleAvatarHtml) {
        avatarContainer.innerHTML = battleAvatarHtml;
        avatarContainer.dataset.html = battleAvatarHtml;
    }

    // 敵方爆擊血條：固定顯示在最上方，不因怪物刷新而消失或跳動（2026-09-28 玩家要求）
    // 有對手時顯示氣血；休整／索敵／安全區時變成灰色空條，文字改成狀態（例：「⏳ 3 秒後刷新」）
    const enemyBar = document.getElementById('bf-enemy-bar');
    const showEnemyBar = (cur, max) => {
        enemyBar.classList.remove('idle');
        setBattleBar('bf-enemy-fill', 'bf-enemy-trail', cur, max);
        document.getElementById('bf-enemy-hptext').innerText = `${fmtFxNum(Math.max(0, cur))} / ${fmtFxNum(max)}`;
    };
    const idleEnemyBar = text => {
        enemyBar.classList.add('idle');
        setBattleBar('bf-enemy-fill', 'bf-enemy-trail', 0, 1);
        document.getElementById('bf-enemy-hptext').innerText = text;
    };

    if (inTribulation && heartDemon) {
        document.getElementById('battle-enemy-title').innerText = "心魔";
        document.getElementById('battle-enemy-icon').innerText = heartDemon.icon;
        let demonSt = formatStatus(heartDemon.status);
        showEnemyBar(heartDemon.hp, heartDemon.maxHp);
        document.getElementById('battle-enemy-info').innerText = demonSt;
        document.getElementById('battle-action-desc').innerText = `☯️ 渡劫中！正在與心魔生死對決...`;
    } else if (inBountyDuel && duelOpponent) {
        let o = duelOpponent;
        let debuffs = [duelWeakenTimer > 0 ? '化功' : '', duelSilenceTimer > 0 ? '封印' : '', duelArmorTimer > 0 ? '破甲' : ''].filter(Boolean);
        document.getElementById('battle-enemy-title').innerText = `${BOUNTY_RANKS[o.rank].name}・${o.name}`;
        document.getElementById('battle-enemy-icon').innerText = o.icon;
        let oppSt = formatStatus(o.status);
        showEnemyBar(o.hp, o.maxHp);
        document.getElementById('battle-enemy-info').innerText = `${oppSt ? oppSt + ' ' : ''}「${o.title}」五行 ${o.attrs.element}｜第 ${o.turn}/${BOUNTY_MAX_TURNS} 回合`;
        document.getElementById('battle-action-desc').innerText = `⚔️ 懸賞對決中！${debuffs.length ? `你身中：${debuffs.join('、')}` : '生死一線，全力以赴！'}`;
    } else if (player.currentMapIsSafe) {
        document.getElementById('battle-enemy-title').innerText = "安全區域";
        document.getElementById('battle-enemy-icon').innerText = "🕊️";
        document.getElementById('battle-enemy-info').innerText = "無敵意目標";
        idleEnemyBar("🕊️ 無敵意目標");
        document.getElementById('battle-action-desc').innerText = `🧘‍♂️ 正在 ${player.currentMap.name} 靜修打坐中`;
    } else if (respawnTimer > 0) {
        document.getElementById('battle-enemy-title').innerText = "休整中";
        document.getElementById('battle-enemy-icon').innerText = "⏳";
        document.getElementById('battle-enemy-info').innerText = `剩餘 ${respawnTimer} 秒`;
        idleEnemyBar(`⏳ ${respawnTimer} 秒後刷新`);
        document.getElementById('battle-action-desc').innerText = `⏳ 敵方全滅，等待下一波妖獸刷新...`;
    } else if (enemies.length > 0) {
        let totalEnemyHp = 0;
        let totalMaxEnemyHp = 0;
        enemies.forEach(e => {
            totalEnemyHp += e.hp;
            totalMaxEnemyHp += e.maxHp;
        });
        let cultN = enemies.filter(e => e.cultivator).length;
        // 標題與圖示跟著「目前在打的那隻」（第一隻還活著的）；妖獸名稱來自 FIELD_MONSTERS（config-monsters.js）
        let front = enemies.find(e => e.hp > 0) || enemies[0];
        let frontName = front.name || (front.ambush ? "暗殺者" : front.cultivator ? `${front.cultivator}道修士` : "妖獸");
        document.getElementById('battle-enemy-title').innerText = `${frontName}${enemies.length > 1 ? `（共 ${enemies.length} 隻${cultN ? `｜修士×${cultN}` : ''}）` : ''}`;
        document.getElementById('battle-enemy-icon').innerText = front.icon || "🐉";
        // 彙整全體怪物身上的狀態：凍結隻數、燒傷/中毒總層數
        let frozenN = enemies.filter(e => e.status && e.status.frozen > 0).length;
        let burnN = enemies.reduce((s, e) => s + (e.status && e.status.burn ? e.status.burn.stacks : 0), 0);
        let poisonN = enemies.reduce((s, e) => s + (e.status && e.status.poison ? e.status.poison.stacks : 0), 0);
        let enemySt = [frozenN ? `❄️×${frozenN}` : '', burnN ? `🔥×${burnN}` : '', poisonN ? `☠️×${poisonN}` : ''].filter(Boolean).join(' ');
        // 彙整怪物的五行與異屬性，例：「五行 火×2 金×1｜⚡雷×1」
        let elemCounts = wuxingElements.map(el => [el, enemies.filter(e => e.attrs && e.attrs.element === el).length]).filter(([, c]) => c > 0);
        let affixCounts = MONSTER_AFFIX_TYPES.map(k => [k, enemies.filter(e => e.attrs && e.attrs[k] > 0).length]).filter(([, c]) => c > 0);
        let enemyAttrText = (elemCounts.length ? '五行 ' + elemCounts.map(([el, c]) => `${el}×${c}`).join(' ') : '')
            + (affixCounts.length ? '｜' + affixCounts.map(([k, c]) => `${combatAttrInfo[k].icon}${combatAttrInfo[k].label.charAt(0)}×${c}`).join(' ') : '');
        showEnemyBar(totalEnemyHp, totalMaxEnemyHp);   // 多隻時為總血量
        // 種族（race.js），例：「🐉妖獸×2 😈魔修×1」；人修（正道修士）不列
        let raceText = RACE_KEYS.map(k => [k, enemies.filter(e => e.attrs && e.attrs.race === k).length]).filter(([, c]) => c > 0).map(([k, c]) => `${raceTag(k)}×${c}`).join(' ');
        let typeText = front.mtype ? monsterTypeTag({ type: front.mtype }) : '';   // 目前在打的那隻的型態（monster.js，第 66 節）
        document.getElementById('battle-enemy-info').innerText = [typeText, raceText, enemySt, enemyAttrText].filter(Boolean).join('｜');
        document.getElementById('battle-action-desc').innerText = lastMonsterSkillText || `⚔️ 劍氣縱橫！正在 ${player.currentMap.name} 與巨獸殊死搏鬥！`;   // 怪物放技能時顯示（monster.js）
    } else {
        document.getElementById('battle-enemy-title').innerText = "索敵中";
        document.getElementById('battle-enemy-icon').innerText = "🔍";
        document.getElementById('battle-enemy-info').innerText = "尋找目標";
        idleEnemyBar("🔍 索敵中");
        document.getElementById('battle-action-desc').innerText = `🔍 正在 ${player.currentMap.name} 探索四周...`;
    }
    // 名牌右側的等級字（2026-09-28 血條改參考圖樣式）：野外妖獸＝目前這隻的境界階數（新制每隻各自的 nv2Lv，2026-09-29），
    // 沒有 nv2Lv（修士、暗殺者、舊制）＝地圖對應境界（config-maps.js 的 nv2L）；心魔＝自己的境界
    const lvEl = document.getElementById('bf-enemy-lv');
    if (lvEl) {
        let lv = '';
        if (inTribulation && heartDemon) lv = (realms[player.realmIndex] || '') + '境';
        else if (!inBountyDuel && !player.currentMapIsSafe && respawnTimer <= 0 && enemies.length > 0) {
            const cur = enemies.find(x => x.hp > 0) || enemies[0];
            const L = player.currentMap && player.currentMap.nv2L;
            if (cur && typeof cur.nv2Lv === 'number') lv = nv2LevelLabel(cur.nv2Lv);
            else if (typeof L === 'number' && realms[Math.floor(L)]) lv = realms[Math.floor(L)] + '境';
        }
        if (lvEl.textContent !== lv) lvEl.textContent = lv;
    }
    updateBattleFoe();   // 右半邊敵方圖片／大 emoji（battle-fx.js）
    updateCompanionMpLine();   // 出戰靈寵、隊伍夥伴的靈力
    flushBattleFx();   // 播放這段期間累積的飄字／爆擊特效（battle-fx.js）
}

// 戰場下方一行：出戰靈寵與隊伍夥伴的靈力（2026-09-29；不夠放最便宜的技能時標紅）
function updateCompanionMpLine() {
    const el = document.getElementById('bf-companions');
    if (!el) return;
    const parts = [];
    (player.beasts || []).filter(isBeastActive).forEach(b => {
        const mp = Math.floor(getBeastMp(b.id));
        const costs = b.skills.map(getBeastSkill).filter(Boolean).map(beastSkillMp);
        const low = costs.length && mp < Math.min(...costs);
        parts.push(`<span class="${low ? 'low' : ''}">🐾 ${getBeastName(b)} 靈力 ${mp}/${BEAST_MP_MAX}</span>`);
    });
    getPartnerTeam().forEach(p => {
        const mp = Math.floor(getPartnerMp(p.id));
        parts.push(`<span class="${mp < partnerSkillMp(p) ? 'low' : ''}">💞 ${p.name} 靈力 ${mp}/${PARTNER_MP_MAX}</span>`);
    });
    const html = parts.join('');
    if (el.innerHTML !== html) el.innerHTML = html;
}

function updateUI() {
    if (!player.name) player.name = (player.gender === 'female' ? "南宮婉" : "韓立");
    if (!player.stats.cha) player.stats.cha = 10;
    if (!player.studyCounts) player.studyCounts = { str: 0, con: 0, int: 0, spr: 0 };

    document.getElementById('player-name-display').innerText = player.name;

    player.maxHp = getMaxHp();
    player.maxMp = getMaxMp();
    if (player.hp > player.maxHp) player.hp = player.maxHp;
    if (player.mp > player.maxMp) player.mp = player.maxMp;

    const realmEl = document.getElementById('realm-display');
    realmEl.innerText = `${realms[player.realmIndex]} ${player.stage}階`;
    // 渡劫失敗的虛弱狀態（stats.js 的 getWeaknessMult）
    if (player.weakened) realmEl.innerHTML += ` <span class="weak-tag" title="攻擊、氣血與靈力上限 -${Math.round((1 - WEAKNESS_STAT_MULT) * 100)}%，修回 10 階後解除">虛弱 -${Math.round((1 - WEAKNESS_STAT_MULT) * 100)}%</span>`;
    let levelPct = player.level >= MAX_PLAYER_LEVEL ? 100 : Math.min(player.levelExp / getLevelExpNeeded(player.level) * 100, 100);
    // 新制：到達境界的等級上限時顯示「已達上限」（leveling.js 的 getLevelCap）
    let atCap = NUMERIC_V2 && player.level >= getLevelCap() && player.level < MAX_PLAYER_LEVEL;
    document.getElementById('level-display').innerText = atCap
        ? `Lv.${player.level.toWan()}（已達${realms[player.realmIndex]}上限，突破後再升）`
        : `Lv.${player.level.toWan()} (${levelPct.toFixed(1)}%)${NUMERIC_V2 && getLevelCap() < MAX_PLAYER_LEVEL ? `／上限 ${getLevelCap().toWan()}` : ''}`;
    let lifespanEl = document.getElementById('lifespan-display');
    let atFloor = player.lifespan <= getLifespanFloor();
    let perMin = getAgingPerMinute();
    lifespanEl.innerText = `${formatLifespan(player.lifespan)} 年`;
    lifespanEl.style.color = atFloor ? '#ef4444' : (player.lifespan <= getLifespanFloor() * 2 ? '#facc15' : '#4ade80');
    lifespanEl.title = `此境界每死亡一次折壽 ${getDeathLifespanCost()} 年；壽元剩 ${formatLifespan(getLifespanFloor())} 年時歲月停止流逝`;
    document.getElementById('age-display').innerText = `${formatLifespan(player.age || LIFESPAN_START_AGE)} 歲`;
    let rateEl = document.getElementById('lifespan-rate');
    // 後期境界流逝很慢（每分鐘不到 0.1 年），改以「年/時」顯示
    let rateText = perMin >= 10 ? `${Math.round(perMin).toWan()}年/分`
                 : perMin >= 0.1 ? `${perMin.toFixed(1)}年/分`
                 : `${(perMin * 60).toFixed(1)}年/時`;
    rateEl.innerText = atFloor ? '（歲月已止）' : `⌛-${rateText}`;
    rateEl.style.color = atFloor ? '#ef4444' : (getAgingMultiplier() > 1 ? '#fb923c' : '#9ca3af');
    document.getElementById('power-display').innerText = fmtCombat(NUMERIC_V2 ? nv2CombatPower() : getPhysAttack());   // 畫面 ×100（format.js）
    let talentEl = document.getElementById('talent-display');   // 天賦樹（talent.js，第 68 節）
    if (talentEl) talentEl.innerText = formatTalentLine();
    let aptEl = document.getElementById('aptitude-display');   // 先天靈根・體質（aptitude.js），點擊查看／重測
    if (aptEl) aptEl.innerText = formatAptitudeShort();
    let coreEl = document.getElementById('core-display');   // 丹田／金丹／元嬰（golden-core.js）
    if (coreEl) coreEl.innerHTML = formatCoreShort();
    let ysEl = document.getElementById('yuanshen-display');   // 元神（yuanshen.js），點擊開元神視窗
    if (ysEl) ysEl.innerHTML = formatYuanshenShort();
    document.getElementById('sect-display').innerText = player.sect ? player.sect.name : "散修 (無技能)";
    document.getElementById('coins-display').innerText = player.coins.toWan();
    document.getElementById('reputation-display').innerText = (player.reputation || 0).toWan();

    let eqBonus = getEquipBonus();
    if (NUMERIC_V2) {
        // 新制：顯示總值（小數一位）；滑鼠停留看來源（境界／丹藥／藏書閣／裝備）
        const gear = nv2GearStats(), base = nv2BaseStat();
        ["str", "con", "int", "spr", "agi"].forEach(k => {
            const el = document.getElementById('stat-' + k);
            el.innerText = (Math.round(nv2Stat(k) * 10) / 10).toString();
            el.parentElement.title = `境界 ${base}｜丹藥 +${nv2PillStat(k).toFixed(1)}｜藏書閣 +${nv2StudyStat(k).toFixed(1)}｜裝備 +${(gear[k] || 0).toFixed(1)}`;
        });
        document.getElementById('stat-agi-row').hidden = false;
    } else {
        document.getElementById('stat-str').innerText = `${player.stats.str} (+${eqBonus.str})`;
        document.getElementById('stat-con').innerText = `${player.stats.con} (+${eqBonus.con})`;
        document.getElementById('stat-int').innerText = `${player.stats.int} (+${eqBonus.int})`;
        document.getElementById('stat-spr').innerText = `${player.stats.spr} (+${eqBonus.spr})`;
    }
    document.getElementById('stat-cha').innerText = `${player.stats.cha} (+${eqBonus.cha})`;

    let attrs = getPlayerCombatAttrs();
    let elemHtml = attrs.element
        ? `<span title="${formatWuxingCounterTip(attrs.element)}">☯️本命 <b><span class="elem-${attrs.element}">${attrs.element}</span></b></span>`
        : `<span title="穿戴裝備後，數量最多的五行即為本命五行">☯️本命 <b>無</b></span>`;
    // 變異屬性（風／光／暗）有數值才顯示；光暗本質附在最後
    let variantKeys = VARIANT_AFFIX_TYPES.filter(k => attrs[k] > 0);
    let natureHtml = attrs.nature ? `<span title="與相反本質互剋 +30%">${attrs.nature === 'light' ? '☀️本質：光' : '🌑本質：暗'}</span>` : '';
    document.getElementById('combat-attr-display').innerHTML = elemHtml + ["def", "mdef", "eva"].concat(AFFIX_TYPES, variantKeys).map(k => {
        let info = combatAttrInfo[k];
        let tip = info.desc ? ` title="${info.desc}"` : '';
        if (k === 'def' || k === 'mdef') return `<span${tip}>${info.icon}${info.label} <b>${formatDefPoints(attrs[k])}</b></span>`;   // 防禦／魔防點數（第 66 節）
        if (k === 'eva') return `<span${tip}>${info.icon}${info.label} <b>${formatEvaPoints(attrs.eva)}</b></span>`   // 迴避值（第 66 節第 4 期）
            + `<span title="命中值：抵銷對方的迴避值（敏捷、洞察、靈寵）">🎯命中 <b>${+(attrs.evaPen || 0).toFixed(1)}</b></span>`;
        return `<span${tip}>${info.icon}${info.label} <b>${+attrs[k].toFixed(1)}%</b></span>`;
    }).join('') + natureHtml
        + (formatRaceDmgLine() ? `<span title="種族剋制：對該族的傷害加成（天磯錄・斬妖錄等，合計上限 +${Math.round(RACE_DMG_CAP * 100)}%）">⚔️剋制 <b>${formatRaceDmgLine()}</b></span>` : '');
    document.getElementById('reincarnate-count').innerText = player.reincarnations;

    document.getElementById('res-grass').innerText = player.spiritGrass;
    document.getElementById('res-beastcore').innerText = player.beastCore;
    document.getElementById('res-martial').innerText = player.martialPoints;
    document.getElementById('res-ore').innerText = (player.ore || 0).toWan();
    document.getElementById('res-merit').innerText = (player.merit || 0).toWan();
    document.getElementById('karma-display').innerHTML = formatKarmaTag();   // 善惡只顯示善／中立／惡（merit.js）
    document.getElementById('res-butian').innerText = (player.butianStones || 0).toWan();
    document.getElementById('res-breakpill').innerText = (player.breakPills || 0).toWan();
    document.getElementById('res-iron').innerText = (player.starIron || 0).toWan();   // 星允鐵（enhance.js）
    document.getElementById('herb-mortal').innerText = player.herbs.mortal;
    document.getElementById('herb-high').innerText = player.herbs.high;
    document.getElementById('herb-epic').innerText = player.herbs.epic;
    document.getElementById('herb-immortal').innerText = player.herbs.immortal;

    let expPercent = Math.min((player.exp / getNextExp()) * 100, 100);
    document.getElementById('exp-bar').style.width = expPercent + '%';
    document.getElementById('exp-text').innerText = player.pendingTribulation
        ? `⚡ 修為圓滿・待渡劫 (${Math.floor(player.exp).toWan()} / ${getNextExp().toWan()})`
        : `${Math.floor(player.exp).toWan()} / ${getNextExp().toWan()}`;

    updateTribulationUI();
    updatePotionCooldownUI();
    renderActivityList();

    let hpPercent = Math.max((player.hp / player.maxHp) * 100, 0);
    document.getElementById('hp-bar').style.width = hpPercent + '%';
    document.getElementById('hp-text').innerText = `${fmtCombat(Math.max(0, player.hp))} / ${fmtCombat(player.maxHp)}`;

    let mpPercent = Math.max((player.mp / player.maxMp) * 100, 0);
    document.getElementById('mp-bar').style.width = mpPercent + '%';
    document.getElementById('mp-text').innerText = `${fmtCombat(Math.max(0, player.mp))} / ${fmtCombat(player.maxMp)}`;

    renderSkillList();
    updateStudyCountsUI();
    updateCombatVisualPanel();
    checkAvatarUnlocks();   // 達成條件的頭像自動解鎖（avatar.js）
    checkTitleUnlocks();    // 達成條件的稱號（codex.js）
    updateHomeHud();   // 洞府主畫面的 HUD（home-ui.js）
}

// 修為圓滿時顯示渡劫按鈕；渡劫進行中則改為狀態提示並鎖住按鈕
function updateTribulationUI() {
    const btn = document.getElementById('btn-tribulation');
    if (!btn) return;

    if (inTribulation) {
        btn.style.display = 'block';
        btn.disabled = true;
        btn.innerText = `☯️ 渡劫中…心魔氣血 ${heartDemon ? fmtCombat(Math.max(0, heartDemon.hp)) : 0}`;
    } else if (player.pendingTribulation) {
        btn.style.display = 'block';
        btn.disabled = false;
        btn.innerText = `⚡ 天劫將至！點此渡劫晉升【${realms[player.realmIndex + 1] || ''}】（勝算 ${formatChance(getTribulationChance().total)}）`;
    } else {
        btn.style.display = 'none';
        btn.disabled = false;
    }
}

function updatePotionCooldownUI() {
    const display = document.getElementById('potion-cd-display');
    if (!display) return;
    const hpText = potionCooldownHp > 0 ? `${potionCooldownHp} 秒` : '就緒';
    const mpText = potionCooldownMp > 0 ? `${potionCooldownMp} 秒` : '就緒';
    display.innerHTML = `丹藥冷卻（每 ${POTION_COOLDOWN_SECONDS} 秒）：`
        + `<span style="color:${potionCooldownHp > 0 ? '#f87171' : '#4ade80'};">氣血 ${hpText}</span> / `
        + `<span style="color:${potionCooldownMp > 0 ? '#f87171' : '#4ade80'};">靈力 ${mpText}</span>`;
}

// 藏書閣次數／每次增加量／規則文字（新制上限 200、每次 +0.1，並顯示敏捷古籍，見 library.js）
function updateStudyCountsUI() {
    const max = studyMaxOf(), gain = studyGainOf();
    const names = { str: '力量', con: '體質', int: '悟性', spr: '靈力', agi: '敏捷' };
    const agiCard = document.getElementById('study-card-agi');
    if (agiCard) agiCard.hidden = !NUMERIC_V2;
    const rule = document.getElementById('study-rule');
    if (rule) rule.innerText = `消耗【武學積分】永久提升${NUMERIC_V2 ? '屬性' : '四維'}（每種書籍學習上限 ${max} 次）`;
    for (const k in names) {
        const cnt = document.getElementById('study-count-' + k);
        if (cnt) cnt.innerText = `已學習: ${(player.studyCounts && player.studyCounts[k]) || 0} / ${max}`;
        const g = document.getElementById('study-gain-' + k);
        if (g) g.innerText = `每次 ${names[k]} +${NUMERIC_V2 ? gain.toFixed(1) : gain}`;
    }
}

// 修仙分頁「⚔️ 當前可用技能」按鈕：彈出 #skill-modal
function openSkillModal() {
    renderSkillList();
    document.getElementById('skill-modal').style.display = 'flex';
}

function renderSkillList() {
    let skills = getAllSkills();

    if (skills.length === 0) {
        document.getElementById('skill-list').innerHTML = "尚未領悟門派技能。";
        return;
    }

    let html = "";
    skills.forEach(sk => {
        let typeName = {"single":"單體", "aoe":"範圍", "heal":"補血", "buff":"增益", "shield":"守護", "control":"牽制"}[sk.type];
        let source = sk.tier ? SECT_TIER_NAMES[sk.tier] : sk.isSpell ? "仙法" : "靈寶閣";
        let detail = (sk.type === "single" || sk.type === "aoe" || sk.type === "control")
            ? `${typeName}・${sk.dmgType === 'mag' ? '悟性' : '力量'}・威力 ${Math.round(sk.mult * 100)}%`
            : typeName;
        if (sk.effect) detail += `・${combatAttrInfo[sk.effect.type].icon}${Math.round(sk.effect.chance * 100)}%`;
        html += `・[${source}] ${sk.name} (${detail}, 耗魔:${fmtCombat(skillMpCost(sk.mpCost))})<br>`;
    });
    document.getElementById('skill-list').innerHTML = html;
}

// 日誌減量（2026-09-28）：野外戰鬥回合進行中（combat.js 的 fieldCombatRound）設為 true，
// 逐回合的出手、技能、屬性效果、妖獸攻勢等訊息（type 在 FIELD_MUTED_LOG_TYPES）不寫入，改由每波結束的彙總取代。
// 掉寶（equip）、功德／升級（level-up）、任務（quest）、系統（system）照常即時顯示；需要強制顯示時傳 force = true。
// 2026-09-28 玩家要求加回戰鬥細節：日誌已分頁（戰鬥／道具／僕從），逐回合訊息只會擠在戰鬥分頁，
// 所以 FIELD_LOG_DETAIL = true 時不再靜音；改回 false 即恢復「只寫每波彙總」。
const FIELD_LOG_DETAIL = true;
let fieldLogMuted = false;
const FIELD_MUTED_LOG_TYPES = ["normal", "combat", "skill", "heal"];

// 日誌分頁（2026-09-28）：戰鬥／道具／僕從三個分頁各自保留最新 LOG_MAX_ENTRIES 則，互不擠掉。
// 分頁由 addLog 的第 4 個參數 channel 指定；沒給就依 type 決定（LOG_CHANNEL_BY_TYPE），其餘一律進「戰鬥」（含系統、任務、升級）。
const LOG_CHANNELS = ["battle", "item", "servant"];
const LOG_CHANNEL_BY_TYPE = { servant: "servant", equip: "item" };
// 各分頁保留筆數：戰鬥分頁含逐回合細節，保留較多
const LOG_MAX_ENTRIES = { battle: 150, item: 50, servant: 50 };
const LOG_TAB_STORAGE_KEY = "xiuxian_log_tab";
let activeLogTab = "battle";
let logUnread = { battle: 0, item: 0, servant: 0 };

function addLog(msg, type = "normal", force = false, channel = null) {
    if (fieldLogMuted && !FIELD_LOG_DETAIL && !force && FIELD_MUTED_LOG_TYPES.includes(type)) return;
    if (!LOG_CHANNELS.includes(channel)) channel = LOG_CHANNEL_BY_TYPE[type] || "battle";
    const logBox = document.getElementById(`log-${channel}`);
    if (!logBox) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `[${new Date().toLocaleTimeString('zh-TW', { hour12: false })}] ${msg}`;
    logBox.prepend(entry);
    if (logBox.children.length > LOG_MAX_ENTRIES[channel]) logBox.removeChild(logBox.lastChild);
    if (channel !== activeLogTab) {
        logUnread[channel]++;
        renderLogBadge(channel);
    }
}

function renderLogBadge(channel) {
    const badge = document.getElementById(`log-badge-${channel}`);
    if (!badge) return;
    const n = logUnread[channel];
    badge.textContent = n > 0 ? (n > 99 ? "99+" : String(n)) : "";
}

// 切換日誌分頁；選擇記在 localStorage（裝置偏好，不進存檔）
function switchLogTab(channel) {
    if (!LOG_CHANNELS.includes(channel)) channel = "battle";
    activeLogTab = channel;
    document.querySelectorAll('.log-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.logTab === channel));
    LOG_CHANNELS.forEach(c => {
        const box = document.getElementById(`log-${c}`);
        if (box) box.classList.toggle('active', c === channel);
    });
    logUnread[channel] = 0;
    renderLogBadge(channel);
    try { localStorage.setItem(LOG_TAB_STORAGE_KEY, channel); } catch (e) {}
}

function restoreLogTab() {
    let saved = null;
    try { saved = localStorage.getItem(LOG_TAB_STORAGE_KEY); } catch (e) {}
    switchLogTab(saved || "battle");
}

// 依目前所在地圖重設頂部「當前狀態」列（切換地圖、渡劫結束後呼叫）
function refreshCombatStatusText() {
    const el = document.getElementById('combat-status');
    if (player.currentMapIsSafe) {
        el.innerText = `當前狀態：在 ${player.currentMap.name} 靜修 (安全區)`;
        el.style.color = '#38bdf8';
    } else {
        el.innerText = `當前狀態：在 ${player.currentMap.name} 探索中...`;
        el.style.color = '#fb923c';
    }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// 「製作成功」提示（2026-09-27）：煉丹（alchemy.js）、鍛造（equipment.js）、符寶（talisman.js）成功時在畫面中央跳出，約 2 秒後淡出，點一下提早關閉
// title 為純文字；detail 可含遊戲內部產生的 HTML（品質顏色 span），不可放玩家輸入的文字
function showCraftSuccess(title, detail) {
    let box = document.getElementById('craft-toast');
    if (!box) {
        box = document.createElement('div');
        box.id = 'craft-toast';
        box.onclick = () => box.classList.remove('on');
        document.body.appendChild(box);
    }
    box.innerHTML = `<div class="ct-head">✅ 製作成功</div><div class="ct-title"></div>${detail ? `<div class="ct-detail">${detail}</div>` : ''}`;
    box.querySelector('.ct-title').textContent = title;
    box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
    clearTimeout(showCraftSuccess.t);
    showCraftSuccess.t = setTimeout(() => box.classList.remove('on'), 2200);
}

// 彈窗右上角 ✕（2026-09-28）：啟動時替每個 .modal-content 插入一顆，按下去等同按底部的關閉鈕
// （最後一個 .close-btn 或 [data-modal-close]），所以各視窗原本的關閉行為不變。
// 沒有關閉鈕的視窗（讀檔失敗、選性別、情緣對話）不會加。
function initModalTopClose() {
    document.querySelectorAll('.modal-bg > .modal-content').forEach(mc => {
        if (mc.querySelector('.modal-top-close')) return;
        const src = [...mc.querySelectorAll('.close-btn, [data-modal-close]')].pop();
        if (!src) return;
        const wrap = document.createElement('div');
        wrap.className = 'modal-top-close-wrap';
        wrap.innerHTML = '<button class="modal-top-close" title="關閉" aria-label="關閉">✕</button>';
        wrap.firstChild.onclick = () => src.click();
        mc.prepend(wrap);
    });
}

// 批次操作（藏書閣／煉丹房／鍛造閣／宗門靈田的 ×1、×10、最高）共用：
// qty 為 1、10 或 'max'；affordable 為目前資源（與上限）允許的最多次數。
// 回傳實際要執行的次數；0 代表不執行（呼叫端需先自行處理 affordable 為 0 的提示）。
// ×10 資源不足時不做部分執行，而是提示可改按「最高」。
function resolveBatchCount(qty, affordable, actionName) {
    if (affordable <= 0) return 0;
    if (qty === 'max') return affordable;
    let n = parseInt(qty) || 1;
    if (affordable < n) {
        alert(`目前最多只能${actionName} ${affordable} 次（受資源或次數上限限制），無法一次${actionName} ${n} 次。\n可改按「最高」一次完成 ${affordable} 次。`);
        return 0;
    }
    return n;
}

// 把剩餘毫秒數格式化成「3 小時 12 分」，供每日任務／千寶閣倒數使用
// 刷新時間軸保護（千寶閣／懸賞榜／每日任務）：存檔轉移到時鐘不同的裝置、或系統時間被調過，
// 「下次刷新」的時間戳可能遠在未來（倒數出現幾百小時、長時間不刷新）。超過一個週期就壓回「現在 + 一個週期」；
// 非數字（壞掉的存檔）視為 0 = 立即刷新。
function clampRefreshAt(at, hours) {
    if (typeof at !== 'number' || !isFinite(at)) return 0;
    return Math.min(at, Date.now() + hours * 3600 * 1000);
}

function formatCountdown(ms) {
    if (!ms || ms <= 0) return "即將刷新";
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours} 小時 ${minutes} 分`;
    if (minutes > 0) return `${minutes} 分`;
    return "不到 1 分鐘";
}

// 抽屜式區塊展開/收合（命運與系統）
function toggleDrawer(id, btn) {
    const body = document.getElementById(id);
    if (!body) return;
    const opened = body.classList.toggle('open');
    if (btn) btn.classList.toggle('open', opened);
}

// --- 依品級批次刪除的共用小工具（背包裝備與僕從共用） ---
function getCheckedBulkQualities(className) {
    return Array.from(document.querySelectorAll('.' + className + ':checked')).map(el => el.value);
}

function toggleAllBulkQualities(className) {
    const boxes = Array.from(document.querySelectorAll('.' + className));
    const allChecked = boxes.length > 0 && boxes.every(b => b.checked);
    boxes.forEach(b => { b.checked = !allChecked; });
}

// 畫面上方的短暫提示（例：「✅ 購買成功」），蓋在所有視窗之上，約 2 秒後淡出；連續觸發會往下堆疊
function showToast(msg, kind) {
    let box = document.getElementById('toast-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toast-box';
        document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' toast-' + kind : '');
    t.textContent = msg;
    box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 1800);
    setTimeout(() => t.remove(), 2200);
}
// ---- 遊戲內的確認框／提示框（2026-10-01）----
// 瀏覽器內建的 confirm()／alert() 在部分環境不會顯示（Claude 預覽面板、LINE／Facebook 等 App 內建瀏覽器）：
//   confirm() 會直接回傳 false（等於按了取消）、alert() 直接略過，玩家會覺得「按了沒反應」（使用者回報寄售無法出價）。
// gameConfirm(msg) 回傳 Promise<boolean>，呼叫端要 await；gameAlert(msg) 不會暫停程式（跟 alert 不同），適合放在 return 前。
// 視窗動態建立（#game-dialog），疊在所有視窗與提示條之上；新功能請用這兩個，不要再用 confirm／alert。
const GAME_DIALOG_GUARD_MS = 400;
function gameDialog(msg, withCancel) {
    return new Promise(resolve => {
        let box = document.getElementById('game-dialog');
        if (!box) {
            box = document.createElement('div');
            box.id = 'game-dialog';
            box.innerHTML = `<div class="gd-card"><div class="gd-msg"></div><div class="gd-btns">
                <button class="sys-btn gd-cancel">取消</button><button class="sys-btn gd-ok">確定</button></div></div>`;
            document.body.appendChild(box);
        }
        box.querySelector('.gd-msg').textContent = String(msg == null ? '' : msg);
        const ok = box.querySelector('.gd-ok'), cancel = box.querySelector('.gd-cancel');
        cancel.style.display = withCancel ? '' : 'none';
        const done = v => { box.style.display = 'none'; ok.onclick = cancel.onclick = null; resolve(v); };
        // 防連點（2026-10-02）：確認框的「確定」常剛好跳在剛才按的按鈕位置，手機連點兩下會直接確認（例：凝聚元神、轉世這類不能反悔的操作）
        //   → 確認框出現後 GAME_DIALOG_GUARD_MS 內不接受「確定」
        const shownAt = Date.now();
        ok.onclick = () => { if (withCancel && Date.now() - shownAt < GAME_DIALOG_GUARD_MS) return; done(true); };
        cancel.onclick = () => done(false);
        box.style.display = 'flex';
        ok.focus();
    });
}
function gameConfirm(msg) { return gameDialog(msg, true); }
function gameAlert(msg) { gameDialog(msg, false); }

// 購買成功提示（各商店的購買函式成交後呼叫）
function toastBought(name) {
    showToast(`✅ 購買成功：${name}`, 'ok');
}

// 「保留屬性」勾選列（背包／暫存區一鍵刪除、分解用）：勾選的五行屬性裝備不會被處理
function renderKeepElementRow(className) {
    const boxes = wuxingElements.map(el =>
        `<label><input type="checkbox" class="${className}" value="${el}"> <span class="elem-${el}">${el}</span></label>`
    ).join("");
    return `<div class="bulk-qualities"><span style="color:#9ca3af; font-size:0.85em;">🛡️ 保留屬性：</span>${boxes}</div>`;
}

// 產生「依品級勾選 + 刪除」的工具列
// qualityNames: 品級名稱陣列；counts: { 品級: 數量 }
// extraButtons：額外按鈕的 HTML（例：背包的「分解勾選品級」）
// extraRow：品級列下方額外一列的 HTML（例：背包的「保留屬性」）
function renderBulkDeleteBar(title, className, qualityNames, counts, deleteFn, note, extraButtons = '', extraRow = '') {
    const boxes = qualityNames.map(name =>
        `<label><input type="checkbox" class="${className}" value="${name}">
            <span class="quality-${name}">${name}</span> (${counts[name] || 0})</label>`
    ).join("");
    return `
        <div class="bulk-bar">
            <div class="bulk-title">🗑️ ${title}</div>
            <div class="bulk-qualities">${boxes}</div>
            ${extraRow}
            <div class="bulk-actions">
                <button class="sys-btn" onclick="toggleAllBulkQualities('${className}')">全選 / 全不選</button>
                <button style="border-color:#ef4444; color:#ef4444; background:rgba(239,68,68,0.12);" onclick="${deleteFn}()">刪除勾選品級</button>
                ${extraButtons}
            </div>
            <div style="font-size:0.75em; color:#6b7280; text-align:center; margin-top:6px;">${note}</div>
        </div>`;
}
