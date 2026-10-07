// 屠龍勇者：職業故事與職業任務線（依賴 config、classes、items、monsters、zones；載入時會把任務道具與獎勵裝備加進 ITEMS）
// 每個職業 4 章：Lv15 收集 → Lv30 討伐首領 → Lv45 收集 → Lv60 討伐首領（完成得到職業稱號）
// goal.type：
//   collect  在 zone 打怪有 p 機率掉落任務道具，收集 n 個
//   kill     在 zone 擊倒 n 隻怪物
//   boss     在 zone 擊倒 after 隻怪物後，任務首領出現；擊倒首領即完成
// 接任務、回報都要在村莊（找 NPC）；進度只在指定地圖累積

// ───────── 職業故事 ─────────
const CLASS_STORIES = {
    royal: {
        npc: '宰相阿爾文', title: '亞丁之王',
        story: '你是亞丁王國最後的王族血脈。十年前叛軍與四大龍勾結，王城陷落、王族四散。忠心的宰相阿爾文將你藏在說話之島長大。如今你已成年——是時候召集騎士、奪回王座，終結巨龍的陰影。',
    },
    knight: {
        npc: '紅騎士團長甘特', title: '紅騎士團長',
        story: '你出身騎士世家，父親是紅騎士團的副團長，在對抗地龍安塔瑞斯的戰役中戰死。你帶著父親留下的長劍來到說話之島，立誓成為能守護一切的騎士。',
    },
    mage: {
        npc: '象牙塔賢者塔拉斯', title: '大賢者',
        story: '你是象牙塔最年輕的學徒，天生能看見魔力的流動。象牙塔被惡魔佔據的那天，導師塔拉斯帶著你逃到說話之島。他說：「四大龍的力量來自失落的古代魔法，只有找回它，才有機會對抗巨龍。」',
    },
    elf: {
        npc: '妖精森林長老艾瑞雅', title: '世界樹守護者',
        story: '你誕生於妖精森林的世界樹下。巨龍甦醒後，世界樹開始枯萎，森林的精靈之力一天天衰退。長老艾瑞雅派你前往人類的土地，尋找讓世界樹重生的方法。',
    },
    darkelf: {
        npc: '暗影神殿祭司布魯迪卡', title: '暗影之刃',
        story: '你是暗影神殿培養的刺客，為了族人的生存在黑暗中執行任務。這一次神殿的指令很簡單：潛入人類世界，查明是誰在背後喚醒了四大龍，然後——除掉他。',
    },
    shura: {
        npc: '修羅道場師父拳聖烈', title: '阿修羅',
        story: '你是修羅道場的弟子，從小在戰鬥中長大。師父拳聖烈常說：「修羅之道，就是不斷超越昨天的自己。」當巨龍甦醒的消息傳來，你知道——最強的對手出現了。',
    },
    warrior: {
        npc: '戰士公會長巴魯德', title: '泰坦戰神',
        story: '你曾是北方部落最強的戰士。火龍巴拉卡斯的龍息將部落化為焦土，只有你在灰燼中活了下來。你扛起父親的巨斧南下，只為了一件事——親手斬下火龍的頭顱。',
    },
    gunner: {
        npc: '矮人工匠哈克', title: '神射手',
        story: '你是矮人工匠哈克唯一的人類學徒，從小在鍛造爐邊長大。哈克一直在研究能射穿龍鱗的火槍，卻總差一步。你決定帶著他的槍走上戰場，用實戰證明它的威力。',
    },
    magicfighter: {
        npc: '魔導學院院長薇薇安', title: '魔導劍聖',
        story: '魔導學院教導學生同時駕馭劍與魔法，但大多數人兩樣都學不好，你是少數的例外。院長薇薇安看中你的天賦，交給你一項任務：重現傳說中「魔導劍聖」的劍技。',
    },
    paladin: {
        npc: '聖殿大主教席恩', title: '聖光守護者',
        story: '你在聖殿的孤兒院長大，被大主教席恩撫養成人。聖殿的預言書寫著：「當四龍甦醒，聖光將選擇一名守護者。」席恩相信，那個人就是你。',
    },
    angel: {
        npc: '熾天使拉斐爾', title: '熾天使',
        story: '你曾是天界的守護天使。巨龍甦醒的那一夜，天界之門被深淵的力量撕裂，你在墜落中失去了翅膀與大部分的力量，醒來時躺在說話之島的海邊。熾天使拉斐爾的聲音在心中響起：「找回你的光，守護這片大地。」',
    },
    demon: {
        npc: '深淵領主墨菲斯特', title: '魔王',
        story: '你是被深淵放逐的惡魔。你的舊主人與巨龍締結契約，你拒絕成為巨龍的奴僕，因此被剝奪力量、丟進人類世界。深淵領主墨菲斯特找上了你：「想奪回力量、向舊主人復仇嗎？那就和我簽約吧。」',
    },
};

// ───────── 任務首領模板 ─────────
const QUEST_BOSS_BASE = {
    2: { lv: 34, hpMul: 8, dmgMul: 1.4, acAdd: -8, expMul: 10, goldMul: 5 },
    4: { lv: 62, hpMul: 7, dmgMul: 1.15, acAdd: -6, expMul: 12, goldMul: 6 },   // 比第一隻龍（安塔瑞斯）稍弱
};
function qBoss(ch, name, icon, extra) {
    return { name, icon, boss: true, large: true, ...QUEST_BOSS_BASE[ch], ...(extra || {}) };
}
const QB_MAGIC_2 = { p: 0.2, dmg: [40, 70], name: '暗黑魔法' };
const QB_MAGIC_4 = { p: 0.25, dmg: [90, 150], name: '毀滅魔法' };

// ───────── 各職業任務 ─────────
const CLASS_QUESTS = {
    royal: [
        { lv: 15, title: '王族的信物',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '王族紋章碎片', n: 10, p: 0.3 },
          intro: '「王族紋章在王城陷落時碎裂，散落在說話之島地監的魔物手中。集齊碎片，你的身分才能得到諸侯承認。」',
          outro: '紋章重新拼合，發出淡淡金光。阿爾文單膝跪下：「殿下，您已是名正言順的王位繼承人。」',
          reward: { item: 'royalCloak', gold: 3000 } },
        { lv: 30, title: '叛軍的將軍',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '叛軍將軍・格倫', '🗡️', { tags: ['human'] }) },
          intro: '「當年打開王城大門的叛將格倫，正躲在古魯丁地監深處招兵買馬。親手討回公道吧。」',
          outro: '格倫倒下前喃喃說出：「龍……答應給我們永生……」叛亂的背後，果然有巨龍的影子。',
          reward: { item: 'royalSword', gold: 10000 } },
        { lv: 45, title: '諸侯的誓約',
          goal: { type: 'collect', zone: 'ivory', itemName: '諸侯誓約書', n: 8, p: 0.2 },
          intro: '「象牙塔的魔法師們扣押了各地諸侯的誓約書。取回它們，諸侯就會重新向王族效忠。」',
          outro: '八位諸侯在誓約書上重新落印。亞丁的旗幟，再次在各地城堡升起。',
          reward: { item: 'royalAmulet', gold: 30000 } },
        { lv: 60, title: '王座之戰',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '篡位者・黑暗之王', '👑', { tags: ['human'], magic: QB_MAGIC_4 }) },
          intro: '「篡位者據守傲慢之塔，他手中握著與安塔瑞斯締結的契約。擊敗他，王國才能團結起來對抗巨龍。」',
          outro: '篡位者的契約化為灰燼。你登上王座，向全亞丁宣告：「下一個，就是巨龍。」',
          reward: { item: 'royalKingSword', gold: 80000, elixir: 1 } },
    ],
    knight: [
        { lv: 15, title: '見習騎士的試煉',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '骷髏的頭骨', n: 10, p: 0.3 },
          intro: '「想加入紅騎士團，先證明你的勇氣。到說話之島地監帶回十個骷髏頭骨。」',
          outro: '「不錯的眼神，和你父親一模一樣。從今天起，你就是紅騎士團的見習騎士。」',
          reward: { item: 'knightCloak', gold: 3000 } },
        { lv: 30, title: '叛變的騎士',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '叛變騎士・維克', '🛡️', { tags: ['human'] }) },
          intro: '「騎士團出了叛徒。維克帶走團裡的聖劍逃進古魯丁地監，把他帶回來——活的死的都行。」',
          outro: '你從維克身上取回了紅騎士之劍。甘特把劍交到你手上：「它現在屬於你了。」',
          reward: { item: 'knightSword', gold: 10000 } },
        { lv: 45, title: '父親的遺志',
          goal: { type: 'collect', zone: 'pyramid', itemName: '父親的戰記殘頁', n: 8, p: 0.2 },
          intro: '「你父親戰死前把戰記藏在金字塔，裡面記載了安塔瑞斯的弱點。把殘頁找回來。」',
          outro: '戰記最後一頁寫著：「地龍的鱗甲在心臟附近最薄。我的孩子，替我完成這件事。」',
          reward: { item: 'knightRing', gold: 30000 } },
        { lv: 60, title: '騎士的誓約',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '死亡騎士', '💀', { undead: true, tags: ['demon'] }) },
          intro: '「墮落的死亡騎士在傲慢之塔徘徊，他曾是最強的紅騎士。擊敗他，你將繼承團長之位。」',
          outro: '死亡騎士消散前露出微笑：「終於……有人能接下這份重擔了。」甘特將團長披風披在你肩上。',
          reward: { item: 'knightOathSword', gold: 80000, elixir: 1 } },
    ],
    mage: [
        { lv: 15, title: '魔力結晶',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '魔力結晶', n: 10, p: 0.3 },
          intro: '「學徒，先學會收集魔力。地監的魔物體內會凝結魔力結晶，帶十顆回來。」',
          outro: '「你對魔力的感知比我年輕時還敏銳。這件斗篷就交給你。」',
          reward: { item: 'mageCloak', gold: 3000 } },
        { lv: 30, title: '被盜的禁書',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '黑魔法師・卡斯特', '🧙', { tags: ['human'], magic: QB_MAGIC_2 }) },
          intro: '「叛逃的黑魔法師卡斯特偷走了象牙塔的禁書，躲在古魯丁地監研究死靈術。阻止他。」',
          outro: '你奪回禁書，書頁間夾著一張地圖，標示著象牙塔深處的封印。',
          reward: { item: 'mageStaff', gold: 10000 } },
        { lv: 45, title: '象牙塔的封印',
          goal: { type: 'collect', zone: 'ivory', itemName: '封印石碎片', n: 8, p: 0.2 },
          intro: '「惡魔佔據象牙塔，是為了解開地下的古代封印。收集封印石碎片，我們要搶先修復它。」',
          outro: '封印重新亮起，惡魔們發出不甘的嘶吼。塔拉斯欣慰地說：「象牙塔，終於要回來了。」',
          reward: { item: 'mageAmulet', gold: 30000 } },
        { lv: 60, title: '古代魔法',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '古代魔導師的亡靈', '👻', { undead: true, magic: QB_MAGIC_4 }) },
          intro: '「古代魔法的最後一卷，被創造者的亡靈守在傲慢之塔。說服不了，就只能擊敗他。」',
          outro: '亡靈將最後一卷交給你：「用這份力量……讓巨龍回到沉睡吧。」你已成為新一代的大賢者。',
          reward: { item: 'mageArchStaff', gold: 80000, elixir: 1 } },
    ],
    elf: [
        { lv: 15, title: '森林的哀鳴',
          goal: { type: 'collect', zone: 'gludio1', itemName: '被污染的樹液', n: 10, p: 0.3 },
          intro: '「古魯丁地監的魔物體內流著被污染的樹液，那是從世界樹根部被偷走的。把它們帶回來淨化。」',
          outro: '淨化後的樹液流回世界樹，枯黃的葉子冒出一點新綠。',
          reward: { item: 'elfCloak', gold: 3000 } },
        { lv: 30, title: '盜獵者首領',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '盜獵者首領・薩克', '🏹', { tags: ['human'] }) },
          intro: '「人類盜獵者在獵殺森林的守護獸，首領薩克躲在古魯丁地監。替森林討回公道。」',
          outro: '薩克的營地裡堆滿了守護獸的角。你將它們埋回森林，艾瑞雅送你一把妖精女王的弓。',
          reward: { item: 'elfBow', gold: 10000 } },
        { lv: 45, title: '世界樹的種子',
          goal: { type: 'collect', zone: 'ivory', itemName: '世界樹種子', n: 8, p: 0.2 },
          intro: '「象牙塔曾收藏過世界樹的種子，現在落在惡魔手裡。只要種下它們，世界樹就能重生。」',
          outro: '種子在森林中發芽，精靈們的歌聲再次響起。',
          reward: { item: 'elfRing', gold: 30000 } },
        { lv: 60, title: '枯萎的根源',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '腐化樹妖', '🌳', { magic: QB_MAGIC_4 }) },
          intro: '「世界樹枯萎的根源找到了——一隻吸收巨龍之力的腐化樹妖，盤踞在傲慢之塔。」',
          outro: '樹妖倒下的瞬間，遠方的世界樹綻放耀眼的光。艾瑞雅：「你是森林的英雄，世界樹的守護者。」',
          reward: { item: 'elfWorldBow', gold: 80000, elixir: 1 } },
    ],
    darkelf: [
        { lv: 15, title: '暗殺者的資格',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '情報捲軸', n: 10, p: 0.3 },
          intro: '「先證明你的潛行技巧。地監的妖魔正在傳遞情報，把捲軸全部攔截下來。」',
          outro: '捲軸上反覆出現一個名字：「喚龍教團」。',
          reward: { item: 'darkCloak', gold: 3000 } },
        { lv: 30, title: '教團的爪牙',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '喚龍教團執事', '🕯️', { tags: ['human'], magic: QB_MAGIC_2 }) },
          intro: '「喚龍教團的執事在古魯丁地監主持儀式。殺了他，不要留下痕跡。」',
          outro: '執事至死都在念誦巨龍的名字。你從他身上找到一把淬毒的鋼爪。',
          reward: { item: 'darkElfClaw', gold: 10000 } },
        { lv: 45, title: '叛徒的名單',
          goal: { type: 'collect', zone: 'pyramid', itemName: '教團成員名冊', n: 8, p: 0.2 },
          intro: '「教團的成員名冊藏在金字塔。名冊上……可能有我們族人的名字。」',
          outro: '名冊上果然有暗影神殿的長老。布魯迪卡沉默許久：「神殿的清理交給我，巨龍交給你。」',
          reward: { item: 'darkRing', gold: 30000 } },
        { lv: 60, title: '教主',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '喚龍教主', '🐍', { tags: ['human'], magic: QB_MAGIC_4 }) },
          intro: '「教主就在傲慢之塔準備最後的儀式。這是你最重要的一次任務。」',
          outro: '教主倒下，儀式中斷。從此暗影神殿多了一個傳說——暗影之刃。',
          reward: { item: 'darkDualBlades', gold: 80000, elixir: 1 } },
    ],
    shura: [
        { lv: 15, title: '百人斬',
          goal: { type: 'kill', zone: 'islandDungeon', n: 100 },
          intro: '「修羅的第一課——在說話之島地監擊倒一百隻魔物。」',
          outro: '「哼，還算有點樣子。」師父丟給你一條舊腰帶，那是他年輕時用的。',
          reward: { item: 'shuraBelt', gold: 3000 } },
        { lv: 30, title: '道場破門者',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '破門者・鬼刃', '👺', { tags: ['human'] }) },
          intro: '「有人砸了道場的招牌，自稱鬼刃，就在古魯丁地監等你。去把招牌拿回來。」',
          outro: '鬼刃倒地大笑：「痛快！」他把愛用的鋼爪交給你：「下次，換我來挑戰你。」',
          reward: { item: 'shuraClaw', gold: 10000 } },
        { lv: 45, title: '修羅之魂',
          goal: { type: 'collect', zone: 'pyramid', itemName: '戰魂結晶', n: 8, p: 0.2 },
          intro: '「金字塔的戰士亡魂都在等待強者。擊敗他們、收集戰魂結晶，讓修羅之魂與你同在。」',
          outro: '戰魂結晶融入你的身體，你感覺到古代戰士們的意志。',
          reward: { item: 'shuraRing', gold: 30000 } },
        { lv: 60, title: '超越師父',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '拳聖烈（全力）', '👊', { tags: ['human'] }) },
          intro: '「最後的試煉——在傲慢之塔，和全力以赴的我一戰。」',
          outro: '師父倒在地上，卻笑得比誰都開心：「你已經是阿修羅了。去吧，去打倒那些巨龍。」',
          reward: { item: 'shuraDualBlades', gold: 80000, elixir: 1 } },
    ],
    warrior: [
        { lv: 15, title: '公會的入門',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '妖魔的獠牙', n: 10, p: 0.3 },
          intro: '「想進戰士公會？帶十顆妖魔獠牙來，證明你不是只會說大話。」',
          outro: '「北方來的，力氣不小嘛。」巴魯德扔給你一件戰士斗篷。',
          reward: { item: 'warCloak', gold: 3000 } },
        { lv: 30, title: '遠古石巨人',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '遠古石巨人', '🗿', { acAdd: -14, hpMul: 10 }) },
          intro: '「古魯丁地監深處醒來一個遠古石巨人，連公會的老手都打不過。你上吧。」',
          outro: '石巨人碎裂，裡面藏著一把古老的戰斧。',
          reward: { item: 'warAxe', gold: 10000 } },
        { lv: 45, title: '部落的遺物',
          goal: { type: 'collect', zone: 'ivory', itemName: '部落圖騰碎片', n: 8, p: 0.2 },
          intro: '「有商人說在象牙塔看見刻著你們部落圖騰的碎片。也許……還有族人活著？」',
          outro: '圖騰拼合後浮現一行字：「倖存者在亞丁等你」。你握緊了拳頭。',
          reward: { item: 'warAmulet', gold: 30000 } },
        { lv: 60, title: '火之先鋒',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '炎魔將軍', '🔥', { tags: ['demon'], magic: { p: 0.3, dmg: [100, 160], name: '炎魔之息' } }) },
          intro: '「巴拉卡斯的先鋒炎魔將軍出現在傲慢之塔——正是當年燒毀你部落的那一隻。」',
          outro: '炎魔將軍化為灰燼。下一個，就是巴拉卡斯本人。',
          reward: { item: 'warTitanAxe', gold: 80000, elixir: 1 } },
    ],
    gunner: [
        { lv: 15, title: '火藥原料',
          goal: { type: 'collect', zone: 'gludio1', itemName: '硫磺石', n: 10, p: 0.3 },
          intro: '「新槍需要上好的火藥。古魯丁地監的魔物身上有硫磺石，給我帶十顆回來。」',
          outro: '「哈哈！這批火藥夠勁！」哈克笑得鬍子都在抖。',
          reward: { item: 'gunCloak', gold: 3000 } },
        { lv: 30, title: '偷設計圖的賊',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '強盜頭目・鐵手', '🦾', { tags: ['human'] }) },
          intro: '「該死，有人偷走了我的設計圖！強盜頭目鐵手躲在古魯丁地監。」',
          outro: '你奪回設計圖，哈克連夜打造出一把精工火槍給你。',
          reward: { item: 'gunRifle', gold: 10000 } },
        { lv: 45, title: '龍鱗研究',
          goal: { type: 'collect', zone: 'pyramid', itemName: '堅硬的鱗片', n: 8, p: 0.2 },
          intro: '「要射穿龍鱗，得先研究鱗片。金字塔的沙漠巨蠍外殼跟龍鱗很像，帶些回來。」',
          outro: '「我懂了！子彈要在命中的瞬間旋轉！」哈克興奮得一夜沒睡。',
          reward: { item: 'gunRing', gold: 30000 } },
        { lv: 60, title: '屠龍之槍',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '古代機械魔像', '🤖', { acAdd: -12 }) },
          intro: '「最後一個零件——傲慢之塔的古代機械魔像核心。拿到它，屠龍之槍就完成了。」',
          outro: '哈克把完成的槍交給你，眼眶泛紅：「去吧，讓那些巨龍見識矮人的工藝。」',
          reward: { item: 'gunDragonGun', gold: 80000, elixir: 1 } },
    ],
    magicfighter: [
        { lv: 15, title: '魔力迴路',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '符文石', n: 10, p: 0.3 },
          intro: '「劍技要承載魔力，需要符文石。說話之島地監的侏儒很愛收集它們。」',
          outro: '符文石在你手中發光。「你的魔力迴路很穩定，很好。」',
          reward: { item: 'mfCloak', gold: 3000 } },
        { lv: 30, title: '失控的魔導兵',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '失控魔導兵', '⚙️', { magic: QB_MAGIC_2 }) },
          intro: '「學院的實驗魔導兵失控逃進古魯丁地監。用你的劍與魔法讓它停下來。」',
          outro: '你從魔導兵殘骸中取出符文核心，薇薇安把它鑲進一把劍裡。',
          reward: { item: 'mfSword', gold: 10000 } },
        { lv: 45, title: '劍聖的手記',
          goal: { type: 'collect', zone: 'ivory', itemName: '劍聖手記', n: 8, p: 0.2 },
          intro: '「魔導劍聖的手記被收藏在象牙塔，裡面記載著真正的劍技。」',
          outro: '手記最後寫著：「劍為形，魔為魂，兩者合一，方能斬龍。」',
          reward: { item: 'mfAmulet', gold: 30000 } },
        { lv: 60, title: '劍聖的試煉',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '魔導劍聖的殘影', '⚔️', { magic: QB_MAGIC_4 }) },
          intro: '「劍聖的殘影仍在傲慢之塔等待繼承者。擊敗他，你就是新的劍聖。」',
          outro: '殘影收劍，向你點頭致意後消散。你手中的劍閃耀著前所未有的光芒。',
          reward: { item: 'mfHolySword', gold: 80000, elixir: 1 } },
    ],
    paladin: [
        { lv: 15, title: '淨化不死者',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '不死者的灰燼', n: 10, p: 0.3 },
          intro: '「說話之島地監的不死者是邪惡的殘渣。淨化它們，把灰燼帶回聖殿安息。」',
          outro: '灰燼在聖壇上化為光點升天。「你做得很好，孩子。」',
          reward: { item: 'palCloak', gold: 3000 } },
        { lv: 30, title: '墮落的神官',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '墮落神官・莫德', '🧟', { tags: ['human'], magic: QB_MAGIC_2 }) },
          intro: '「聖殿的神官莫德背叛了聖光，在古魯丁地監製造殭屍。去審判他。」',
          outro: '莫德臨死前懺悔：「是巴風特的低語……原諒我……」你為他做了最後的祈禱。',
          reward: { item: 'palHammer', gold: 10000 } },
        { lv: 45, title: '聖物的回歸',
          goal: { type: 'collect', zone: 'pyramid', itemName: '聖殿遺物', n: 8, p: 0.2 },
          intro: '「金字塔的盜墓者帶走了聖殿的遺物，它們必須回到聖壇。」',
          outro: '遺物歸位，聖殿的鐘聲響徹亞丁。',
          reward: { item: 'palAmulet', gold: 30000 } },
        { lv: 60, title: '聖光的選擇',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '巫妖王', '☠️', { undead: true, magic: QB_MAGIC_4 }) },
          intro: '「預言中的最後試煉——擊敗傲慢之塔的巫妖王，證明聖光選擇了你。」',
          outro: '聖光從天而降籠罩著你。席恩含淚說道：「預言成真了，聖光守護者。」',
          reward: { item: 'palJudgeHammer', gold: 80000, elixir: 1 } },
    ],
    angel: [
        { lv: 15, title: '失落的羽毛',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '天使的羽毛', n: 10, p: 0.3 },
          intro: '「你墜落時，羽毛散落在地監的魔物身上。每找回一片，你就會想起一點自己的力量。」',
          outro: '羽毛融入你的背後，一對微弱的光之翼若隱若現。',
          reward: { item: 'angelCloak', gold: 3000 } },
        { lv: 30, title: '深淵的使者',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '深淵使者・巴爾', '👿', { tags: ['demon'], magic: QB_MAGIC_2 }) },
          intro: '「撕裂天界之門的，是深淵使者巴爾。他正在古魯丁地監打開另一道裂縫，阻止他！」',
          outro: '巴爾消散前冷笑：「你以為只有我嗎？深淵之主已經醒了。」',
          reward: { item: 'angelStaff', gold: 10000 } },
        { lv: 45, title: '天界之門的碎片',
          goal: { type: 'collect', zone: 'ivory', itemName: '天界之門碎片', n: 8, p: 0.2 },
          intro: '「天界之門的碎片落在象牙塔，被惡魔拿來強化封印。取回碎片，你就能聽見天界的聲音。」',
          outro: '你聽見了——天界的歌聲，以及同伴們呼喚你名字的聲音。',
          reward: { item: 'angelAmulet', gold: 30000 } },
        { lv: 60, title: '光之翼',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '墮落天使長・路西法', '🖤', { tags: ['holy', 'demon'], magic: QB_MAGIC_4 }) },
          intro: '「傲慢之塔頂端，是當年背叛天界的墮落天使長。他身上有你被奪走的光之翼。」',
          outro: '光之翼回到你的背上，六翼展開的瞬間，你成為了熾天使。拉斐爾：「歡迎回來。現在，讓巨龍見識天界的審判。」',
          reward: { item: 'angelSpear', gold: 80000, elixir: 1 } },
    ],
    demon: [
        { lv: 15, title: '靈魂的代價',
          goal: { type: 'collect', zone: 'islandDungeon', itemName: '迷途的靈魂', n: 10, p: 0.3 },
          intro: '「契約需要代價。收集十個迷途的靈魂，證明你還是個惡魔。」',
          outro: '靈魂被你吸收，深淵的力量在血管裡甦醒。',
          reward: { item: 'demonCloak', gold: 3000 } },
        { lv: 30, title: '天界的獵人',
          goal: { type: 'boss', zone: 'gludio2', after: 20, boss: qBoss(2, '天界獵人・加百列', '😇', { tags: ['holy'], magic: QB_MAGIC_2 }) },
          intro: '「天界派來的獵人在追殺你，他在古魯丁地監設下了陷阱。先下手為強。」',
          outro: '獵人倒下，他的聖光反而成了你的養分。你用他的聖槍熔鑄出一把鐮刀。',
          reward: { item: 'demonScythe', gold: 10000 } },
        { lv: 45, title: '血之契約書',
          goal: { type: 'collect', zone: 'pyramid', itemName: '血之契約書', n: 8, p: 0.2 },
          intro: '「你舊主人與巨龍的契約書散落在金字塔。撕毀它們，巨龍就少了一份力量。」',
          outro: '契約書在你手中燃燒，遠方似乎傳來巨龍憤怒的咆哮。',
          reward: { item: 'demonRing', gold: 30000 } },
        { lv: 60, title: '舊主人',
          goal: { type: 'boss', zone: 'tower', after: 30, boss: qBoss(4, '深淵之主・阿斯莫德', '😈', { tags: ['demon'], magic: QB_MAGIC_4 }) },
          intro: '「你的舊主人阿斯莫德就在傲慢之塔，他已經完全成為巨龍的傀儡。」',
          outro: '阿斯莫德倒下，他的王冠滾到你腳邊。墨菲斯特鞠躬：「恭喜，新的魔王陛下。」',
          reward: { item: 'demonDeathScythe', gold: 80000, elixir: 1 } },
    ],
};

// ───────── 任務獎勵裝備（職業限定）─────────
const QUEST_REWARD_ITEMS = {
    royalCloak:      { name: '王族斗篷',     cat: 'armor', slot: 'cloak', ac: 2, cha: 1, mr: 5, safe: 4, wt: 15, sell: 1500, classes: ['royal'] },
    royalSword:      { name: '王者之劍',     cat: 'weapon', type: 'sword', dmg: [13, 14], hit: 2, safe: 6, wt: 50, sell: 5000, classes: ['royal'] },
    royalAmulet:     { name: '王族項鍊',     cat: 'armor', slot: 'amulet', str: 1, cha: 1, safe: -1, wt: 5, sell: 10000, classes: ['royal'] },
    royalKingSword:  { name: '君主之劍',     cat: 'weapon', type: 'sword', dmg: [22, 24], hit: 4, crit: 0.05, safe: 6, wt: 60, sell: 40000, classes: ['royal'] },
    knightCloak:     { name: '紅騎士斗篷',   cat: 'armor', slot: 'cloak', ac: 3, safe: 4, wt: 20, sell: 1500, classes: ['knight'] },
    knightSword:     { name: '紅騎士之劍',   cat: 'weapon', type: 'twohand', dmg: [16, 20], hit: 2, safe: 6, wt: 120, sell: 5000, classes: ['knight'] },
    knightRing:      { name: '騎士之戒',     cat: 'armor', slot: 'ring', con: 1, hp: 30, safe: -1, wt: 2, sell: 10000, classes: ['knight'] },
    knightOathSword: { name: '誓約之劍',     cat: 'weapon', type: 'twohand', dmg: [25, 29], hit: 4, safe: 6, wt: 140, sell: 40000, classes: ['knight'] },
    mageCloak:       { name: '法師斗篷',     cat: 'armor', slot: 'cloak', ac: 1, mr: 15, safe: 4, wt: 10, sell: 1500, classes: ['mage'] },
    mageStaff:       { name: '智慧之杖',     cat: 'weapon', type: 'staff', dmg: [7, 7], sp: 3, safe: 6, wt: 25, sell: 5000, classes: ['mage'] },
    mageAmulet:      { name: '魔力項鍊',     cat: 'armor', slot: 'amulet', int: 1, mp: 50, safe: -1, wt: 5, sell: 10000, classes: ['mage'] },
    mageArchStaff:   { name: '大賢者之杖',   cat: 'weapon', type: 'staff', dmg: [12, 12], sp: 7, safe: 6, wt: 30, sell: 40000, classes: ['mage'] },
    elfCloak:        { name: '精靈斗篷',     cat: 'armor', slot: 'cloak', ac: 2, dex: 1, safe: 4, wt: 10, sell: 1500, classes: ['elf'] },
    elfBow:          { name: '妖精女王之弓', cat: 'weapon', type: 'bow', dmg: [12, 12], hit: 3, safe: 6, wt: 40, sell: 5000, classes: ['elf'] },
    elfRing:         { name: '森林之戒',     cat: 'armor', slot: 'ring', dex: 1, hit: 2, safe: -1, wt: 2, sell: 10000, classes: ['elf'] },
    elfWorldBow:     { name: '世界樹之弓',   cat: 'weapon', type: 'bow', dmg: [19, 19], hit: 6, safe: 6, wt: 40, sell: 40000, classes: ['elf'] },
    darkCloak:       { name: '暗影斗篷',     cat: 'armor', slot: 'cloak', ac: 2, dodge: 0.03, safe: 4, wt: 10, sell: 1500, classes: ['darkelf'] },
    darkElfClaw:     { name: '淬毒鋼爪',     cat: 'weapon', type: 'claw', dmg: [12, 12], crit: 0.05, safe: 6, wt: 40, sell: 5000, classes: ['darkelf'] },
    darkRing:        { name: '暗殺者之戒',   cat: 'armor', slot: 'ring', dex: 1, crit: 0.03, safe: -1, wt: 2, sell: 10000, classes: ['darkelf'] },
    darkDualBlades:  { name: '夜影雙刀',     cat: 'weapon', type: 'dual', dmg: [18, 18], crit: 0.08, safe: 6, wt: 55, sell: 40000, classes: ['darkelf'] },
    shuraBelt:       { name: '修羅腰帶',     cat: 'armor', slot: 'belt', str: 1, hp: 30, safe: -1, wt: 10, sell: 1500, classes: ['shura'] },
    shuraClaw:       { name: '鬼刃之爪',     cat: 'weapon', type: 'claw', dmg: [13, 13], hit: 2, safe: 6, wt: 45, sell: 5000, classes: ['shura'] },
    shuraRing:       { name: '戰神之戒',     cat: 'armor', slot: 'ring', str: 1, dmg: 2, safe: -1, wt: 2, sell: 10000, classes: ['shura'] },
    shuraDualBlades: { name: '阿修羅雙刀',   cat: 'weapon', type: 'dual', dmg: [19, 19], crit: 0.05, safe: 6, wt: 55, sell: 40000, classes: ['shura'] },
    warCloak:        { name: '戰士斗篷',     cat: 'armor', slot: 'cloak', ac: 2, hp: 30, safe: 4, wt: 20, sell: 1500, classes: ['warrior'] },
    warAxe:          { name: '遠古戰斧',     cat: 'weapon', type: 'axe', dmg: [15, 19], hit: 1, safe: 6, wt: 100, sell: 5000, classes: ['warrior'] },
    warAmulet:       { name: '狂戰士項鍊',   cat: 'armor', slot: 'amulet', str: 1, con: 1, safe: -1, wt: 5, sell: 10000, classes: ['warrior'] },
    warTitanAxe:     { name: '泰坦巨斧',     cat: 'weapon', type: 'axe', dmg: [24, 28], hit: 3, safe: 6, wt: 130, sell: 40000, classes: ['warrior'] },
    gunCloak:        { name: '槍手斗篷',     cat: 'armor', slot: 'cloak', ac: 2, dex: 1, safe: 4, wt: 10, sell: 1500, classes: ['gunner'] },
    gunRifle:        { name: '精工火槍',     cat: 'weapon', type: 'gun', dmg: [13, 13], hit: 3, safe: 6, wt: 70, sell: 5000, classes: ['gunner'] },
    gunRing:         { name: '鷹眼之戒',     cat: 'armor', slot: 'ring', dex: 1, hit: 3, safe: -1, wt: 2, sell: 10000, classes: ['gunner'] },
    gunDragonGun:    { name: '屠龍之槍',     cat: 'weapon', type: 'gun', dmg: [20, 20], hit: 6, crit: 0.05, dragon: 1.3, safe: 6, wt: 80, sell: 40000, classes: ['gunner'], desc: '對龍族傷害 ×1.3' },
    mfCloak:         { name: '魔鬥斗篷',     cat: 'armor', slot: 'cloak', ac: 2, mr: 10, safe: 4, wt: 15, sell: 1500, classes: ['magicfighter'] },
    mfSword:         { name: '符文之劍',     cat: 'weapon', type: 'sword', dmg: [12, 13], sp: 2, safe: 6, wt: 50, sell: 5000, classes: ['magicfighter'] },
    mfAmulet:        { name: '元素項鍊',     cat: 'armor', slot: 'amulet', int: 1, str: 1, safe: -1, wt: 5, sell: 10000, classes: ['magicfighter'] },
    mfHolySword:     { name: '魔導聖劍',     cat: 'weapon', type: 'sword', dmg: [20, 22], sp: 5, hit: 3, safe: 6, wt: 60, sell: 40000, classes: ['magicfighter'] },
    palCloak:        { name: '聖騎士斗篷',   cat: 'armor', slot: 'cloak', ac: 2, mr: 10, safe: 4, wt: 15, sell: 1500, classes: ['paladin'] },
    palHammer:       { name: '光明之錘',     cat: 'weapon', type: 'blunt', dmg: [14, 16], silver: true, safe: 6, wt: 90, sell: 5000, classes: ['paladin'] },
    palAmulet:       { name: '聖徽',         cat: 'armor', slot: 'amulet', wis: 1, con: 1, safe: -1, wt: 5, sell: 10000, classes: ['paladin'] },
    palJudgeHammer:  { name: '審判之錘',     cat: 'weapon', type: 'blunt', dmg: [22, 25], hit: 3, silver: true, safe: 6, wt: 100, sell: 40000, classes: ['paladin'] },
    angelCloak:      { name: '天使羽衣',     cat: 'armor', slot: 'cloak', ac: 2, mr: 15, safe: 4, wt: 5, sell: 1500, classes: ['angel'] },
    angelStaff:      { name: '聖光之杖',     cat: 'weapon', type: 'staff', dmg: [8, 8], sp: 3, silver: true, safe: 6, wt: 25, sell: 5000, classes: ['angel'] },
    angelAmulet:     { name: '光環',         cat: 'armor', slot: 'amulet', wis: 1, int: 1, safe: -1, wt: 1, sell: 10000, classes: ['angel'] },
    angelSpear:      { name: '熾天使之槍',   cat: 'weapon', type: 'spear', dmg: [21, 25], sp: 4, hit: 4, silver: true, safe: 6, wt: 70, sell: 40000, classes: ['angel'] },
    demonCloak:      { name: '深淵披風',     cat: 'armor', slot: 'cloak', ac: 2, lifesteal: 0.03, safe: 4, wt: 15, sell: 1500, classes: ['demon'], desc: '吸血 +3%' },
    demonScythe:     { name: '魂之鐮',       cat: 'weapon', type: 'scythe', dmg: [15, 18], hit: 2, safe: 6, wt: 80, sell: 5000, classes: ['demon'] },
    demonRing:       { name: '魔王之戒',     cat: 'armor', slot: 'ring', str: 1, con: 1, safe: -1, wt: 2, sell: 10000, classes: ['demon'] },
    demonDeathScythe:{ name: '冥界之鐮',     cat: 'weapon', type: 'scythe', dmg: [25, 28], hit: 3, lifesteal: 0.05, safe: 6, wt: 90, sell: 40000, classes: ['demon'], desc: '吸血 +5%' },
};
Object.assign(ITEMS, QUEST_REWARD_ITEMS);

// 收集型任務的任務道具：自動建立 q_職業_章節
for (const cls in CLASS_QUESTS) {
    CLASS_QUESTS[cls].forEach((q, i) => {
        if (q.goal.type !== 'collect') return;
        q.goal.item = `q_${cls}_${i}`;
        ITEMS[q.goal.item] = { name: q.goal.itemName, cat: 'quest', wt: 0, sell: 0, desc: `任務道具：${q.title}` };
    });
}

// ───────── 任務邏輯 ─────────
function questState() {
    if (!player.quests) player.quests = { ch: 0, active: false, prog: 0, bossDone: false };
    return player.quests;
}
function questList() { return CLASS_QUESTS[player.cls] || []; }
function currentQuest() { return questList()[questState().ch] || null; }
function questTitleEarned() { return questState().ch >= questList().length && questList().length > 0; }

function questProgress(q) {
    const s = questState();
    if (!s.active) return 0;
    if (q.goal.type === 'collect') return Math.min(q.goal.n, countItem(q.goal.item));
    if (q.goal.type === 'boss') return s.bossDone ? 1 : 0;
    return s.prog;
}
function questNeed(q) { return q.goal.type === 'boss' ? 1 : q.goal.n; }
function questReady(q) { return questState().active && questProgress(q) >= questNeed(q); }

function questGoalText(q) {
    const z = ZONE_BY_ID[q.goal.zone].name, g = q.goal;
    if (g.type === 'collect') return `在${z}打倒魔物，收集「${g.itemName}」×${g.n}`;
    if (g.type === 'kill') return `在${z}擊倒 ${g.n} 隻魔物`;
    return `在${z}擊倒 ${g.after} 隻魔物，引出並討伐「${g.boss.name}」`;
}

function acceptQuest() {
    const q = currentQuest(), s = questState();
    if (!q || s.active) return;
    if (player.lv < q.lv) { showToast(`需要 Lv.${q.lv}`); return; }
    if (!inTown()) { showToast(`回到村莊找${CLASS_STORIES[player.cls].npc}接任務`); return; }
    s.active = true; s.prog = 0; s.bossDone = false;
    addLog(`📜 接受任務「${q.title}」：${questGoalText(q)}`, 'sys');
    saveGame();
    refreshUI();
}

function turnInQuest() {
    const q = currentQuest(), s = questState();
    if (!q || !questReady(q)) return;
    if (!inTown()) { showToast(`回到村莊找${CLASS_STORIES[player.cls].npc}回報`); return; }
    if (q.goal.type === 'collect') consumeItem(q.goal.item, q.goal.n);
    const r = q.reward, got = [];
    if (r.item) { addItem(r.item, 1); got.push(ITEMS[r.item].name); }
    if (r.gold) { player.gold += r.gold; got.push(`${fmt(r.gold)} 金幣`); }
    if (r.elixir) { addItem('elixir', r.elixir); got.push(`萬能藥 ×${r.elixir}`); }
    s.ch++; s.active = false; s.prog = 0; s.bossDone = false;
    addLog(`📜 完成任務「${q.title}」，獲得 ${got.join('、')}`, 'rare');
    let msg = `${q.outro}\n\n獲得：${got.join('、')}`;
    if (questTitleEarned()) {
        const t = CLASS_STORIES[player.cls].title;
        msg += `\n\n🏅 職業任務全部完成，獲得稱號「${t}」！`;
        addLog(`🏅 獲得稱號「${t}」`, 'boss');
    }
    saveGame();
    refreshUI();
    gameAlert(`📜 ${q.title}`, msg);
}

// 擊倒怪物時呼叫（combat.js onKill）
function questOnKill(mon, z) {
    const s = questState(), q = currentQuest();
    if (!q || !s.active || z.id !== q.goal.zone) return;
    const g = q.goal;
    if (g.type === 'boss') {
        if (mon.questBoss) { s.bossDone = true; addLog(`📜 討伐「${g.boss.name}」成功！回村莊向${CLASS_STORIES[player.cls].npc}回報`, 'rare'); return; }
        if (s.prog < g.after) {
            s.prog++;
            if (s.prog === g.after) addLog(`⚠️ 你感覺到「${g.boss.name}」的氣息正在接近…`, 'boss');
        }
    } else if (g.type === 'kill') {
        if (s.prog < g.n && ++s.prog === g.n) addLog(`📜 任務目標達成！回村莊向${CLASS_STORIES[player.cls].npc}回報`, 'rare');
    } else if (g.type === 'collect') {
        const have = countItem(g.item);
        if (have < g.n && chance(g.p)) {
            addItem(g.item, 1);
            addLog(`📜 獲得任務道具「${g.itemName}」（${have + 1}/${g.n}）`, 'rare');
            if (have + 1 === g.n) addLog(`📜 任務目標達成！回村莊向${CLASS_STORIES[player.cls].npc}回報`, 'rare');
        }
    }
}

// 尋怪時呼叫：達成條件就讓任務首領出現（combat.js spawnMonster）
function questBossFor(z) {
    const s = questState(), q = currentQuest();
    if (!q || !s.active || s.bossDone || q.goal.type !== 'boss' || z.id !== q.goal.zone || s.prog < q.goal.after) return null;
    const m = buildMonster('questBoss', q.goal.boss);
    m.questBoss = true;
    return m;
}
