// Source profiles: Ultra-Tech 2007, printed pages. No inferred launcher interfaces.
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const DISPLACERS=freeze({
 WNboKomyNHyWF3Mcn:{modeId:'WNboKomyNHyWF3Mcn',equipmentId:'eOx3EbvgPbfmpZ1pP',name:'Portable Displacer',radius:2,range:200,acc:18,rof:1,shots:8,reload:5,cellSize:'D',cells:2,weightLb:70,cost:100000,lc:1,tl:12,source:'UT131–132'},
 WSJbILujPYtyjYlnp:{modeId:'WSJbILujPYtyjYlnp',equipmentId:'eFyKPROoJjN5fmHwx',name:'Displacer Cannon',radius:10,range:1000,acc:18,rof:1,shots:8,reload:5,cellSize:'F',cells:1,weightLb:8000,cost:12000000,lc:1,tl:12,source:'UT131–132'}
});
export const LADARS=freeze(Object.fromEntries([
 ['Small',10,'B',1,10000],['Medium',30,'C',10,100000],['Large',100,'D',100,1000000],['Smartskin',null,null,null,null]
].map(([size,miles,cellSize,weightLb,cost])=>['WUTMilitaryLadar'+size,{modeId:'WUTMilitaryLadar'+size,equipmentId:'eUTMilitaryLadar'+size,name:size==='Smartskin'?'Tactical Ladar Smartskin':'Tactical '+size+' Ladar',size,miles,cellSize,weightLb,cost,tl:9,lc:2,source:'UT64,113–114'}])));
export const AESA=freeze({modeId:'WUTTacticalAESA',equipmentId:'eUTTacticalAESA',name:'Tactical Active Electromagnetic Sensor Array (AESA)',tl:9,source:'UT65,121',host:{id:'armored-hovercraft-ut227',name:'Armored Hovercraft',tl:9,detectionMiles:10,source:'UT227'},blockedReason:'AESA: UT227 задаёт носитель и дальность обнаружения 10 миль, но не задаёт полные Acc, HT-поправку и боевую дальность disruption. Наведение и воздействие по UT65,121 учитываются вручную; автоматическая атака недоступна.'});
export const AESA_MANUAL_PROCEDURE='Узкий направленный microwave-луч: электроника и цели с Electrical. После определения попадания вручную используйте HT с поправкой конкретного массива и SM цели; за подтверждённой ½D +3. Sealed защищает, но неэкранированные антенны, линии питания и связи могут проводить импульс. Длительность отключения — минуты по степени провала; состояние применяется вручную. UT65,121.';
const commonTraits=['Absolute Direction','Aerial','AI','Automaton','Blindness','Deafness','Detect (Lasers, Radio, and Radar, Signal Detection)','Electrical','Injury Tolerance (No Head, No Neck)','Mute','No Manipulators','No Sense of Taste/Smell','Noisy 4','Numb','Radio (Burst, Secure)'];
export const ROBOTS=freeze({
 hunter:{id:'hunter',name:'Hunter Missile',modeId:'WUTHunterMissile',equipmentId:'eUTHunterMissile',tl:9,versions:[9,10],lc:2,costByTL:{9:2500,10:500},weightLb:5,attributes:{ST:3,DX:14,IQ:5,HT:12,HP:6,Will:5,Per:12,Speed:6,Dodge:9,Move:0,SM:-4},traits:[...commonTraits,'Enhanced Move 2 (Air speed 480)','Flight (Cannot Hover; 1 minute; Air Move 120)','Payload 3','Radar (LPI, Multi-Mode)'],skills:{},airMove:120,airSpeed:480,minimumSpeedFraction:0.25,speedMph:1000,minutes:1,rangeMiles:16,radarYards:2000,warheadMm:64,familyId:'64mm_missile',launcherModeIds:['WInB0nYjRLMJm5Ha-','WuZRkhqwMzX3gyVWL','WHv4EWlz3Tg6-cvQn','W7v0_whpuR9MtD4tH'],source:'UT168'},
 striker:{id:'striker',name:'Striker Missile',modeId:'WUTStrikerMissile',equipmentId:'eUTStrikerMissile',tl:9,versions:[9,10],lc:1,costByTL:{9:17000,10:3400},weightLb:17,attributes:{ST:6,DX:14,IQ:6,HT:12,HP:12,Will:5,Per:12,Speed:6,Dodge:9,Move:0,SM:-2},traits:[...commonTraits.filter(t=>t!=='Blindness'),'Hyperspectral Vision','Enhanced Move 3 (Air speed 480)','Flight (Cannot Hover; 1 minute; Air Move 120)','Payload 3','Radar (LPI, Multi-Mode, Increased Range ×2)'],skills:{Aerobatics:10,Observation:11},airMove:120,airSpeed:480,speedMph:2000,speedConflict:'UT168: prose 2,000 mph; trait prints Air speed 480 with Enhanced Move 3. Preserved; terminal speed chosen manually.',minutes:1,rangeMiles:32,radarYards:4000,warheadMm:100,familyId:'100mm_missile',launcherModeIds:['WpvG7-bGWCtwNOPFf','WNK4gk21iQ4le2Lxr'],source:'UT168'},
 floater:{id:'floater',name:'Floater Missile',modeId:'WUTFloaterMissile',equipmentId:'eUTFloaterMissile',tl:10,superscience:true,versions:[10,11],lc:1,costByTL:{10:5000,11:1000},weightLb:5,attributes:{ST:3,DX:14,IQ:6,HT:12,HP:6,Will:6,Per:13,Speed:8,Dodge:11,Move:0,SM:-4},traits:[...commonTraits,'Enhanced Move 2 (Air speed 480)','Flight (10 minutes; Air Move 120)','Payload 3','Radar (LPI, Multi-Mode)'],skills:{Aerobatics:12,Observation:11},airMove:120,airSpeed:480,minutes:10,rangeMiles:320,radarYards:2000,propulsion:'reactionless/contragravity',launcherModeIds:[],source:'UT168–169',blockedReason:'Floater: UT168–169 не определяет интерфейс пусковой установки и калибр боевой части. Программирование и полёт — вручную; загрузка в 100mm и автоматический запуск запрещены.'},
 shuriken:{id:'shuriken',name:'Smart Shuriken',modeId:'WUTSmartShuriken',equipmentId:'eUTSmartShuriken',tl:11,superscience:true,versions:[11],lc:2,costByTL:{11:500},weightLb:0.1,attributes:{ST:1,DX:14,IQ:5,HT:12,HP:1,Will:5,Per:10,Speed:6,Dodge:9,Move:0,SM:-10},traits:['Aerial','AI','Automaton','Blindness','Electrical','Enhanced Move 3 (Air speed 96)','Flight (10 minutes; Air Move 12)','Injury Tolerance (No Head, No Neck)','Machine','Mute','No Manipulators','No Sense of Taste/Smell','Noisy 4','Numb','Radar (LPI, Imaging)'],skills:{Brawling:12,Stealth:10},airMove:12,airSpeed:96,speedMph:200,minutes:10,cellSize:'C',radarYards:null,launcherMm:25,launcherModeIds:[],launchMethods:['25mm missile launcher','thrown'],collision:{hp:1,damageMultiplier:0.5,damageType:'cut',source:'B430'},source:'UT169',blockedReason:'Smart Shuriken: метание и полёт выполняются вручную; штатного подтверждённого 25mm missile launcher в каталоге нет. Для тарана нужны фактическая скорость и условия B430; формула HP-урона не подставляется.'}
});
export const displacerProfile=id=>DISPLACERS[id]??null;
export const ladarProfile=id=>LADARS[id]??null;
export const nextElevenProfile=id=>displacerProfile(id)??ladarProfile(id)??(id===AESA.modeId?AESA:null)??Object.values(ROBOTS).find(p=>p.modeId===id)??null;
export const nextElevenWeapon=w=>nextElevenProfile(w?.standaloneModeId??w?.catalogModeId);
export function ladarRange(p,{sensorTL=9,installation}={}){
 if(!p)return null;
 if(p.size==='Smartskin')return installation==='nightwing-ut230'?{detectionMiles:10,half:1760,maximum:5280,tl:11,host:'Nightwing',source:'UT64,114,230'}:null;
 const tl=Number(sensorTL),factor={9:1,10:2,11:5,12:10}[tl];
 return factor?{detectionMiles:p.miles*factor,half:p.miles*factor*176,maximum:p.miles*factor*528,tl,source:p.source}:null;
}
export function nextElevenPlatform(mode){
 const p=nextElevenProfile(mode?.weapon_mode_id);if(!p)return null;
 if(displacerProfile(p.modeId))return {kind:'displacer-area',source:p.source,hitLocationNotApplicable:true,areaAttack:true};
 if(ladarProfile(p.modeId))return {kind:'military-ladar',source:p.source,hitLocationNotApplicable:true,bulkNotApplicable:true,instruction:p.size==='Smartskin'?'Встроенная Tactical Ladar Smartskin: выберите носитель Nightwing (UT230); питание — от машины.':'Сенсорный ресурс — 8 часов; время работы списывается вручную в минутах. Отдельной цены импульса нет. UT64,114.'};
 if(p.id==='shuriken')return {kind:'robot-thrown-launch',source:p.source,hitLocationNotApplicable:true,bulkNotApplicable:true,accNotApplicable:true,rclNotApplicable:true,instruction:'Метание регистрирует запуск одной Smart Shuriken; команды Artillery (Guided Missile), полёт, возврат и замена C cell после 10 минут — вручную. Таран: B430, половина обычного collision damage, cutting. UT169.'};
 return {kind:'source-manual',source:p.source,hitLocationNotApplicable:true,bulkNotApplicable:true,...(p.modeId===AESA.modeId?{instruction:AESA_MANUAL_PROCEDURE}:{}),blockedReason:p.blockedReason??'Выберите этот роботизированный боеприпас у совместимой установки в окне «Патроны». Команды Artillery (Guided Missile), поведение и попадание — вручную. '+p.source};
}
export function nextElevenDamage(raw,id,configuration={}){
 const p=displacerProfile(id)??ladarProfile(id);if(!p)return null;
 const d=!!displacerProfile(id),range=d?{half:null,maximum:p.range}:ladarRange(p,configuration);
 const display=d?`spec. (${p.radius} yd.)`:'HT-10 aff';
 const valid=!!range&&(d?/^spec\.\s*\((2|10)\s*yd\.?\)$/i.test(raw.damage)&&Number(raw.damage.match(/\d+/)?.[0])===p.radius:raw.damage==='HT-10 aff');
 const lines=d?[
  `Область ${p.radius} ярд.; промах — Scatter (B414), уход из области — Dodge and Drop.`,
  'Наименьшее измерение объекта должно быть не больше радиуса; Reality Stabilizer/стабилизированный экран сопротивляется своим HT (обычно 12).',
  'Обычная DR не защищает; стазис не мешает. Назначение переноса определяет ведущий.'
 ]:['Цель должна смотреть на лазер; провал HT — crippling Blindness, разрешается вручную.','После ½D +3; Protected Vision +5, Nictitating Membrane +1/уровень.'];
 return {status:valid?'resolved':'unresolved',nativeSafe:valid,reason:valid?null:'Нужны источниковый профиль и выбранный носитель Ladar.',rawFormula:raw.damage,formula:null,components:[],transformations:[],effectiveChanges:{damage:display,range:d?String(p.range):range?`${range.half}/${range.maximum}`:null},
  rules:{instructionOnly:true,nextEleven:{modeId:id,kind:d?'displacer':'ladar',...(!d?{sensor:range}:{radius:p.radius})},ammunitionSource:p.source,ballisticRange:range?{minimum:null,halfDamage:range.half,maximum:range.maximum,source:p.source}:null,
   resistanceEffect:{version:1,id,name:p.name,attribute:'HT',modifier:d?0:-10,condition:d?'reality-stabilizer':'vision-laser',halfRange:d?null:range?.half,outcome:d?'displacement':'crippling-blindness',source:p.source}},support:{manual:lines.map(text=>({id:'SpecializedPlatform',text}))}};
}
export function projectNextElevenCatalog(book,data){
 if(book==='ut'){
  const p=ROBOTS.shuriken,id='smart_shuriken_robot';
  if(data.ammo_families.some(f=>f.id===id))return data;
  return {...data,ammo_families:[...data.ammo_families,{id,name:'Smart Shuriken',category:'robot',tl:11,caliber_mm:null,wps_lb:0.1,cps_usd:500,lc:2,source_ref:'UT169',supports_exotic_warheads:false,linked_weapon_modes:[{equipment_id:p.equipmentId,weapon_mode_id:p.modeId,weapon_name:p.name,native_tl:'11^'}]}],
   indexes:{...data.indexes,ammo_family_ids:[...data.indexes.ammo_family_ids,id],ammo_family_ids_with_linked_weapons:[...data.indexes.ammo_family_ids_with_linked_weapons,id]}};
 }
 if(book!=='weapons')return data;
 const equipment=data.equipment.map(e=>!Object.values(DISPLACERS).some(p=>p.equipmentId===e.equipment_id)?e:{...e,modes:e.modes.map(m=>({...m,ut_next_eleven:displacerProfile(m.weapon_mode_id)}))});
 for(const p of [...Object.values(LADARS),AESA,...Object.values(ROBOTS)]){
  if(equipment.some(e=>e.equipment_id===p.equipmentId))continue;
  const ladar=ladarProfile(p.modeId),r=ladar&&ladarRange(p),skill=ladar?{name:'Beam Weapons',specialization:'Projector',modifier:0}:p.id==='shuriken'?{name:'Artillery',specialization:'Guided Missile',modifier:0}:null;
  equipment.push({equipment_id:p.equipmentId,name:p.name,source:'UT',book:'Ultra-Tech',reference:p.source,tech_level:String(p.tl)+(p.superscience?'^':''),tags:['Weaponry'],local_notes:p.blockedReason??'',modes:[{weapon_mode_id:p.modeId,index:0,combat_type:'ranged',role:'attack',hidden:false,usage:null,ut_next_eleven:p,
   governing_skill:skill?{status:'resolved',skill,candidates:[skill],basis:ladar?'UT114 table':'UT168 command skill'}:{status:'unresolved',skill:null,candidates:[]},governing_skill_selection:{strategy:'fixed',candidates:skill?[skill]:[],fallback_attribute:null},defaults:skill?[{type:'skill',...skill},{type:ladar?'dx':'iq',modifier:ladar?-4:-5},{type:'skill',name:skill.name,specialization:null,modifier:-4}]:[],
   ...(p.id==='shuriken'?{ammunition_profile:{status:'linked',catalog_kind:'olegurps-ut-ammunition-catalog-v2',primary_ammo_family_id:'smart_shuriken_robot',alternate_ammo_family_ids:[],special_load_ids:[],default_warhead_id:null,suggested_warhead_ids:[],supports_exotic_warheads:false,native_weapon_tl:'11^'}}:{}),
   raw_calc:{damage:ladar?'HT-10 aff':'spec.'},stats:{damage:{type:ladar?'HT-10 aff':'spec.'},accuracy:ladar?'24':null,range:r?`${r.half}/${r.maximum}`:null,rate_of_fire:ladar?'1':null,shots:null,recoil:ladar?'1':null,bulk:null,strength:null},attack_resolution:{primary:'special',geometry:null,special_flags:[],raw:ladar?'HT-10 aff':'spec.'}}]});
 }
 return {...data,equipment};
}
