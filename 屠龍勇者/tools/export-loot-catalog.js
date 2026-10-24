// 從正式規則產生後端資料快照；不讀玩家存檔，不連網。
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,Image:function(){},setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},localStorage:{getItem:()=>null},document:{addEventListener(){},getElementById:()=>null,querySelector:()=>null,documentElement:{style:{}}},window:{addEventListener(){},innerWidth:1280,innerHeight:720},navigator:{}});
for(const[,f]of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(data\/[^"?]+\.js)\?v=/g))if(!['data/main.js','data/pwa.js'].includes(f))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
vm.runInContext('let lootExportSeed=17891;Math.random=()=>((lootExportSeed=(1664525*lootExportSeed+1013904223)>>>0)/4294967296);',ctx);
const catalog=vm.runInContext(`(()=>{
 const items=Object.fromEntries(Object.entries(ITEMS).map(([id,d])=>[id,{...d,sellValue:sellPriceOf(id),stack:isStackable(d),affixes:(d.cat==='weapon'||d.cat==='armor')?Object.keys(AFFIXES).filter(k=>affixAllowed(k,d)):[],bookLv:d.cat==='book'?bookMinLv(d):null}]));
 const quests={};for(const[cls,qs]of Object.entries(CLASS_QUESTS))quests[cls]=qs.map(q=>q.goal);
 return {version:GAME_VERSION,items,monsters:Object.fromEntries(Object.keys(MONSTERS).map(id=>[id,makeMonster(id)])),zones:ZONE_BY_ID,
 tower:Object.fromEntries(Array.from({length:100},(_,i)=>[String(i+1),{names:TOWER_THEMES[Math.min(9,Math.floor(i/10))],normal:makeTowerMonster(i+1,false),boss:(i+1)%10===0?makeTowerMonster(i+1,true):null}])),
 quests,questBosses:Object.fromEntries(Object.entries(quests).map(([cls,qs])=>[cls,qs.map(g=>g.type==='boss'?buildMonster('questBoss',g.boss):null)])),
 common:COMMON_DROPS,currency:Object.entries(CURRENCY).map(([id,c])=>c.minLv?{id,w:c.w,minLv:c.minLv}:{id,w:c.w}),quality:QUALITY,rareNames:RARE_NAMES,
 affixes:Object.fromEntries(Object.entries(AFFIXES).map(([k,a])=>[k,{pre:a.pre,min:a.min,pct:!!a.pct,max:Array.from({length:111},(_,lv)=>Math.max(a.min,a.max(lv)))}])),legend:LEGEND_AFFIXES,
 mapZones:mapZones().map(z=>({id:z.id,lv:z.lv[0]})),mapMods:MAP_MODS,raids:RAID_BY_ID,resonance:RESONANCE,
 resTiers:Array.from({length:16},(_,t)=>resMaxTierForMap(t)),resMapBossP:RES_MAP_BOSS_P,bossMaterialP:BOSS_MATERIAL_DROP_P};
})()`,ctx);
catalog.version+='-'+require('crypto').createHash('sha256').update(JSON.stringify(catalog)).digest('hex').slice(0,12);
const json=JSON.stringify(catalog);fs.writeFileSync(path.join(__dirname,'loot-catalog.json'),json+'\n');
const sql=`-- 自動產生；node tools/export-loot-catalog.js。先執行 server-loot.sql，再執行本檔。\ninsert into public.dragon_loot_rules select version,data from public.dragon_loot_catalog on conflict do nothing;\ninsert into public.dragon_loot_rules(version,data) values('${catalog.version}',$loot_catalog$${json}$loot_catalog$::jsonb) on conflict do nothing;\ninsert into public.dragon_loot_catalog(id,version,data) select 1,version,data from public.dragon_loot_rules where version='${catalog.version}' on conflict(id) do update set version=excluded.version,data=excluded.data;\n`;
fs.writeFileSync(path.join(__dirname,'loot-catalog.sql'),sql);
fs.writeFileSync(path.join(__dirname,'server-loot-install.sql'),fs.readFileSync(path.join(__dirname,'server-loot.sql'),'utf8').replace(/commit;\s*$/,'')+'\n'+sql+'\ncommit;\n');
console.log('Loot catalog:',Object.keys(catalog.items).length,'items,',Object.keys(catalog.monsters).length,'monsters,',Object.keys(catalog.zones).length,'zones');
