<!-- AI-ONLY dense handoff. Human-readable not required. Self-contained. Src of truth: ARCHITECTURE.md(§N refs) > this. Update §STATE/§TODO on every change. last=2026-10-18 by Claude -->
# 黑暗大陸(dir 屠龍勇者/) AI_HANDOFF
## META
game=天堂1-style idle auto-hunt RPG|pure HTML+JS,no build,no framework,globals,<script> sequential|repo k559610142-art/-username-.github.io- branch main→GH Pages|url https://k559610142-art.github.io/-username-.github.io-/屠龍勇者/|parent dir=凡塵修仙傳(other game,DO NOT touch/reference;root sw.js,tools/serve.ps1 shared)|raw:https://raw.githubusercontent.com/k559610142-art/-username-.github.io-/main/屠龍勇者/<file>
user=non-engineer,zh-TW ONLY replies,plain words|prefers:sample-side-by-side before big UI change;ask when ambiguous(past fail:"only nameplate click"→wrongly enlarged body hitbox)|pushes via GitHub Desktop "Push origin" on main,no PR
## RULES(hard)
R1 any JS change→bump ALL index.html `data/*.js?v=` + data/config.js `GAME_VERSION` (fmt YYYYMMDD+[a-z],next letter;new day→a);pushed ver never reused(SW cache-first on ?v=→phones stuck old)|image ?v=N separate(bump N when image size/content changes,e.g. wild.jpg ?v=4)
R2 update ARCHITECTURE.md(§1 file table,§2 load order,feature §;new feature=new § "## N. 標題（date，版本 `ver`；files）")+HANDOFF.md+this file
R3 no native alert/confirm/prompt→gameAlert/gameConfirm/showToast/openDialog(ui.js)
R4 onclick="" strings: top-level fn + literals only,never `player`
R5 save struct change→SAVE_SCHEMA+1 & migrateSave(save.js);ask user first(risky)
R6 time:gameNow(game clock,main loop adds real gap)for buffs/cds/walk;Date.now() only real-time cds(dragonCd,towerBossCd,raidCd)|clockSanity clamps cds/buffs
R7 after merge grep `<<<<<<<`(2026-10-09 broke game)
R8 match surrounding style;touch only needed files;git add explicit files(no -A)
R9 no official 天堂/天堂M/我獨自升級 art;only original/user-generated/CC0
R10 cloud.js Supabase cfg+tools/*.sql=prod;don't edit w/o ask;SQL run by user in Supabase SQL Editor;new queries on admin-readable tables(dragon_saves,dragon_deleted_chars,dragon_bans,dragon_mutes)MUST .eq('user_id',cloudUser.id)(admin RLS sees all→bug 20261015b)
R11 local test:don't upload test chars online;backup localStorage dragonSlayer_* first
R12 no force-push/reset --hard/branch switch
## WORKFLOW
edit→`powershell -NoProfile -ExecutionPolicy Bypass -File tools\check.ps1`(node --check all js,?v==GAME_VERSION,all data/*.js loaded,no conflict markers;need "ALL CHECKS PASSED")→serve `powershell -NoProfile -ExecutionPolicy Bypass -File ..\tools\serve.ps1 -Root . -Port 8790`(blocking;own window)→http://localhost:8790/ Console 0 errors+walk the screen(no browser?→give user numbered click steps+ask F12 red text)→user OK→git commit main msg "黑暗大陸：<what>，<ver>"→tell user Push in GitHub Desktop
launcher:`Gemini改遊戲.bat`(server+browser+gemini-cli auto_edit,PATH node+git)|`ChatGPT改遊戲.bat`(same+codex cli 0.163,reads AGENTS.md)
env:Win10 PS5.1|git NOT in PATH→C:\Users\User\AppData\Local\GitHubDesktop\app-3.6.6\resources\app\git\cmd\git.exe(ver dir may change)|no push creds|node C:\Program Files\nodejs|NO python/ffmpeg→img tools=PowerShell+inline C#(scripts w/ non-ASCII need UTF-8 BOM;var名不可與param同名不分大小寫)|video→WinRT MediaTranscoder(§44.1)|test tip:preview not foreground→no rAF→call sceneUpdate(50) manually;fast-forward:gameNow+=100;huntTick(100)
## FILES(load order=§2,index.html bottom)
config→classes→skills→items→spellbook→monsters→zones→quests→resonance→player→enchant→affix→craft→maps→combat→town→save→cloud→offline→ui→sfx→bgm→ui-create→ui-panels→codex→raid→clan→chat→rank→wb→market→vault→presence→ui-frame→icons→hotbar→ui-scene→pwa→main
load-time deps only matter(quests/resonance mutate ITEMS/MONSTERS/RECIPES);runtime cross-calls fine|modules self-register tabs: push to TABS/PANEL_FNS
config:GAME_VERSION,SAVE keys prefix dragonSlayer_,expToNext,huntExpRate,deathLossRate,EXP_RATE=1,OFFLINE_*,SIM_MODE,rand/chance/clamp/fmt|classes:STAT_KEYS,CLASSES(12,slayer)|skills:MAGIC(34,tier1-10),MAGIC_CLASS,SKILLS[cls],SKILL_BY_ID,findSkill,skillNeedLv,classSkillList|items:WEAPON_TYPES(spd),SLOTS,BUFF_DEFS,ITEMS,RECIPES|spellbook:book_<skillId>,learnBook,rollBookDrop|monsters:monBase,MONSTERS,MONSTER_TAGS,makeMonster/makeTowerMonster,towerBossUp,COMMON_DROPS|zones:TOWNS(4),ZONES,ZONE_BY_ID,DRAGON_IDS|quests:CLASS_STORIES,CLASS_QUESTS(4ch),QUEST_REWARD_ITEMS|resonance:RESONANCE(31w+23a),resonanceOnHit/OnHurt,castResonance|player:player,addLog,DEFAULT_SETTINGS,calcStats,atkMs,castMs|affix:AFFIXES,QUALITY,rollQuality|craft:CURRENCY(8)|maps:異界T1-15,MAP_MODS|enchant:doEnchant|combat:hunt,playerAction,autoSupport,onKill,bossSkillTick,SKILL_GCD_MS|town:shops/inn/storage/forge|save:migrateSave,currentSlot,slotKey,saveGame,ownerMigrate|cloud:Supabase,cloudSync,cloudPushSlot,cloudDeleteSlot,onlineClaim|offline:measureHunt,applyOffline|ui:$,esc,showScreen,renderStatus,showToast,dialogs|sfx/bgm:§44|ui-create:title,openCharSelect(8 slots),create|ui-panels:tabs,openTabs/tabOpen(multiwindow PC3/mobile2),renderChar(三欄裝備窗),renderMap,keeper fns|ui-frame:displayMode(auto/mobile9:16/pc16:9/full),layoutFrame,orbs|icons:ICON_SYM,iconSvg,SKILL_IMG→images/icons/sk/|hotbar:22 slots player.settings.bar{id,a}|ui-scene:canvas top-down grid map,SCENE_BGS,SCENE_THEMES,findPath,drawOccPatch,bigMapGates,sceneTeleport,inHuntZone,fieldNpcs|pwa:SW reg,update prompt|main:gameTick 100ms
other:gm.html(admin)|sw.js(cache dragon-*)|manifest.json|images/(sprites,classes,maps,npc,icons)|sounds/(CREDITS.md)|music/(m4a)|tools/(supabase.sql,client-version.sql,vault.sql,wipe.sql,cut-sprites.ps1+sprite-src/*.json,monsters/cut-sheet.ps1+specH.json,stage/npc-cut.ps1,stage/art-cut.ps1,cut-icons.ps1,bigmap/{build-map,build-occ,check-mask}.ps1+walk.json,check.ps1)
## MECHANICS(core;details §4-§14)
stats 力敏體智精魅;create 75pts,cap18;lv51+ +1pt/lv cap35;elixir max5|12cls:王族 騎士 法師 妖精 黑暗妖精 修羅 戰士 槍手 魔鬥士 聖騎士 天使 惡魔;diff weapons/shield/hp-mp growth/MR/spDiv/skills;妖精槍手 ranged need ammo;天使×1.3 vs demon/undead;惡魔 lifesteal,×1.3 vs human/holy
calc:meleeHit=lv+(str-8)/3+(dex-8)/4+…;dmgBonus=(str-10)/2+lv/4+ench+SP×dmgSp;AC=10-(dex-9)/3-lv/10-armor(display 防禦=10-AC);crit5%×1.5;dodge(dex-12)%≤50;weight=1200+(str+con)×80+lv×20+belt
atkMs=weapon spd×CLASS_ATK_K÷1.33(haste)÷1.33(brave)/1.15(wafer 妖精槍手)×(1-extra≤30%),min400|castMs=1200-300haste-300wise,min600
combat:hit=0.7+(hit-(10-AC))×0.02 clamp5-95%;magic=dmg+SP×spK×(1-MR/200) always hit;multi-mob pack1-6(weights30/25/20/12/8/5),weakenForPack;boss tele red circle 1.6s ×2.5;melee range1,ranged 4(LOS);target lock:nearest reachable,5s no attack→relock;priority heal→buff→resonance→bar skills in slot order→basic;GCD 3s(heal yes,buff no,res_ no)
exp:天堂 original table(EXP_RATE=1,user chose);65+ diminishing;mob exp lv²+1;death lose 5-10% of level exp
enchant:<safe always;≥safe 0.5/(over+1.25),fail evaporate;max+15
offline:login req,last char only,min(away,12h)×50%,sim 10min sample,supply-limited,no drops
tower 永夜之塔1-100F boss each10F,6h respawn;4 dragons lairs 6h;quests 4ch Lv15/30/45/60
## BIGMAP(§45-57)
images/maps/wild.jpg ?v=4 188×112 cells 32px;11 zones merged(低語海岸 迷霧古林 沉船海灣 紫霧遺跡 焦骨峽谷 永凍荒原 黃沙王陵 腐朽礦坑上層 沉眠龍窟 腐朽礦坑深層 熔火煉獄)=zones with bg:'wild';SCENE_BGS.wild{walk,block,regions[rect,start],occ,fieldNpcs};walk.json master→copy into ui-scene.js;wild-occ.png depth(R=row+1);rebuild map→bump img ?v;regions order matters(first rect match);auto gates;hunt restricted to current zone;keepers:永夜之塔@紫霧遺跡(5,6)、暮光法師塔@深層(132,98)→openKeeper(to)|tower uses images/maps/tower.jpg 40×20 separate scene|known bug:低語海岸 start 63,78 inside block
## STATE
live ver 20261019k(local main==origin after handoff-docs commit)|all 12 classes have sprites(walk/attack/cast/hit)+portraits;黑暗妖精 uses v1 darkelf-*.png(v2-v5 unused),portrait v4|presence OFF(PRES_ON=false,Realtime quota)|systems done:cloud saves,raid,chat,clan,rank,world boss,market,vault/diamonds,sfx/bgm,PWA,multi-char,hotbar,spellbooks,resonance,affix,maps T1-15,bigmap
## TODO(ask user before starting any)
bigmap phase3 獸潮,phase4 UI|monster art missing:火龍,~30 tower mobs,~24 quest bosses(user supplies sheets;cut-sheet.ps1)|root sw.js caches subpath index.html as root(may show this game at 修仙 root offline)→needs user OK(touches 修仙)|ARCHITECTURE §11 ideas:pets/summons,transform scrolls,new-zone quests&material recipes|Gemini key free-tier(Pro gemini-3.1-pro-preview needs AI Studio billing)
## AI FILES
AGENTS.md(rules,all AIs)|HANDOFF.md(human-readable state)|AI_HANDOFF.min.md(this)|CLAUDE.md/GEMINI.md(entry→AGENTS+HANDOFF)|new AI w/ other auto-file(.cursorrules etc)→one line "read AGENTS.md, AI_HANDOFF.min.md"
