'use strict';
window.resolveFaxiangAsset=path=>window.DEMO_ASSETS?.[path]??path;
// Visual mapping only. Source: game's config-yuanshen.js (12 types, seven affinities).
window.FAXIANG_CONFIG=Object.freeze({
 goddess:{name:'太初劍母',element:'金 · 劍意',desc:'萬劍朝宗，一念開天',color:'#facc15',effect:'lotus',img:'assets/goddess.png',affinity:'金',weapon:'金蓮神劍',durationMs:10000},
 wood:{name:'青帝萬生',element:'木 · 生機',desc:'神木參天，萬葉成弓',color:'#4ade80',effect:'leaves',img:'assets/wood.png',affinity:'木',weapon:'建木靈弓',durationMs:10000},
 water:{name:'六慾幻姬',element:'水 · 幻魅',desc:'六鏡照心，幻海沉魂',color:'#38bdf8',effect:'mirrors',img:'assets/water.png',affinity:'水',weapon:'照心鏡・幻音笛',durationMs:10000},
 fire:{name:'赤焰焚天',element:'火 · 焚滅',desc:'鳳焰化刃，赤煉焚天',color:'#f87171',effect:'flame',img:'assets/fire.png',affinity:'火',weapon:'焚天炎刀',durationMs:10000},
 earth:{name:'玄嶽鎮世',element:'土 · 鎮守',desc:'玄嶽為甲，一印鎮世',color:'#f59e0b',effect:'stones',img:'assets/earth.png',affinity:'土',weapon:'鎮岳印・玄石杖',durationMs:10000},
 demon:{name:'紫霄天魔',element:'雷 · 天罰',desc:'四臂擎雷，紫霄降罰',color:'#a78bfa',effect:'lightning',img:'assets/thunder.png',affinity:'thunder',weapon:'天罰雷戟',durationMs:10000},
 wind:{name:'九霄御風',element:'風 · 流嵐',desc:'羽扇引嵐，長風裂空',color:'#5eead4',effect:'wind',img:'assets/wind.png',affinity:'wind',weapon:'九霄翎羽扇',durationMs:10000}
});
window.FAXIANG_YUANSHEN=Object.freeze({
 holyBody:{name:'庚金天元神',tier:'heaven',faxiang:'goddess'},daoBody:{name:'乙木天元神',tier:'heaven',faxiang:'wood'},doublePupil:{name:'癸水天元神',tier:'heaven',faxiang:'water'},tyrantBody:{name:'丙火天元神',tier:'heaven',faxiang:'fire'},supremeBone:{name:'戊土天元神',tier:'heaven',faxiang:'earth'},chaosBody:{name:'混沌天元神',tier:'heaven',faxiang:'demon'},swordBody:{name:'劍心地元神',tier:'earth',faxiang:'goddess'},bladeBody:{name:'刀魄地元神',tier:'earth',faxiang:'fire'},fanBody:{name:'風靈地元神',tier:'earth',faxiang:'wind'},bowBody:{name:'神目地元神',tier:'earth',faxiang:'wood'},fluteBody:{name:'天籟地元神',tier:'earth',faxiang:'water'},brushBody:{name:'符籙地元神',tier:'earth',faxiang:'demon'}
});

// Gender changes appearance only; both variants inherit the same affinity, effects and duration.
window.FAXIANG_VARIANTS=Object.freeze({
 goddess:{male:{name:'太初劍尊',img:'assets/metal-male.png'},female:{name:'太初劍母',img:'assets/goddess.png'}},
 wood:{male:{name:'青帝萬生',img:'assets/wood.png'},female:{name:'碧落花神',img:'assets/wood-female.png'}},
 water:{male:{name:'六慾幻君',img:'assets/water-male.png'},female:{name:'六慾幻姬',img:'assets/water.png'}},
 fire:{male:{name:'赤焰焚天',img:'assets/fire.png'},female:{name:'紅蓮炎后',img:'assets/fire-female.png'}},
 earth:{male:{name:'玄嶽鎮世',img:'assets/earth.png'},female:{name:'后土鎮元',img:'assets/earth-female.png'}},
 demon:{male:{name:'紫霄天魔',img:'assets/thunder.png'},female:{name:'紫霄魔后',img:'assets/thunder-female.png'}},
 wind:{male:{name:'九霄御風',img:'assets/wind.png'},female:{name:'九天玄風',img:'assets/wind-female.png'}}
});
