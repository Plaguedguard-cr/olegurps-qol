// M2.8: exact HT27/30/91/180/198-200 source contracts. No Actor/equipment writes.
import {htMeleeSkillOptions} from './ht-ordinary-melee-source.js';
import {HT_SPECIAL_ORIGINAL_FIELDS} from './ht-special-original-fields.js';
const profiles={},items=[],slug=s=>s.replace(/[^a-zA-Z0-9]/g,'');
function item(modelId,equipmentId,name,techLevel,cost,mass,sourcePages,extra={}){
 const e={modelId:'ht:'+modelId,equipmentId,name,techLevel,cost,mass,sourcePages,baselineQuality:'Good',construction:'fixed',qualityClass:'crushing',fixedPublishedQuality:true,...extra};items.push(e);return e;
}
function mode(e,modeId,usage,damage,reach,parry,st,skills,extra={}){
 const p={...e,book:'HT',modeId,usage,stats:{damage,reach,parry,st},primarySkills:skills,sourceOptions:extra.sourceOptions??htMeleeSkillOptions(skills),attackModifier:0,hands:/[†‡]/.test(st??'')?2:1,
  htSpecial:true,tooltipHints:true,displayUsage:true,damagePart:'device-body',martialGrips:[],balanceOptions:[],baselineMaterial:'published',qualityOptions:[{level:'Good',damageBonus:0}],...extra};
 if(!p.fixedPublishedQuality)p.qualityOptions=[{level:'Good',damageBonus:0},{level:'Cheap',damageBonus:0,breakage:2},{level:'Fine',damageBonus:1,damageTypes:['cut','imp'],breakage:-1}];
 p.ltConstruction={domain:'HT',construction:p.construction,qualityClass:p.qualityClass,modelId:p.modelId,shortBlade:p.qualityClass==='knife',metal:p.construction==='blade',damageTypes:[damage.split(' ').at(-1)]};profiles[modeId]=p;return p;
}
export const HT_CONTACT_EFFECT=Object.freeze({version:1,id:'ht-contact-shock',name:'Контактный разряд',attribute:'HT',modifier:-3,armorDivisor:0.5,condition:'none',outcome:'contact-electrical',source:'HT199-200; B432',
 brief:'Сначала подтвердите фактический электрический контакт и защиту. HT−3; неметаллический DR даёт +2×DR из-за AD(0.5). Металлическая броня: DR1; при заземлении даёт атакующему +2 к электрической атаке, не −2 к HT. Применимая защита и поправки Modifier Bucket – вручную. При провале Stun во время контакта и ещё max(1,20−HT) секунд, затем HT−3 каждый ход без бонуса DR. Воспламенение горючего – вручную.'});
export function htSprayEffect(pepper=false){
 const modifier=pepper?-4:-2,name=pepper?'Pepper Spray':'Tear Gas Spray';
 const brief=pepper?'Два независимых HT−4: кашель и слепота до удаления раствора большим количеством воды и полотенцами.':'Два независимых HT−2: кашель и слепота, каждый эффект на MoF минут.';
 const chemical={version:1,id:pepper?'ht-pepper-spray':'ht-tear-spray',name,delivery:'spray',route:'respiratory/vision',source:'HT180; B428; B124',brief,
  protection:'Лицо −5, широкая струя +2 (итог −3): назначает пользователь. Reach 1,2, без штрафов дальности. Защита глаз/дыхания и применимость воздействия проверяются вручную. Кашель: −3 DX, −1 IQ, нельзя Stealth; слепота: B124, −6 combat skills, последствия вручную.',
  checks:[{id:'breathing',modifier,label:'Кашель – дыхание'},{id:'eyes',modifier,label:'Слепота – глаза'}],manualConsequences:true,penetrationConfirmationRequired:false};
 return {version:1,id:pepper?'ht-pepper-spray':'ht-tear-spray',name,attribute:'HT',modifier,condition:'fluid',outcome:'fluid-exposure',halfRange:0,source:'HT180',brief,chemical};
}
const chainsawIds=[['e3Q0yEd8FcjmFpRm-','wCqDJeFrsa89Srp2B',7,'11‡',25],['ekL0jdgQgscxD85sl','w290SmH6F4RcvB53D',8,'10‡',13],['exU9mGlA5F9VfY6xD','w96LrgSujNkWxD4Fx',7,'11‡',25],['estPzif3b0oJq_WXs','wnGzvaraC07stjOaT',8,'10‡',13]];
for(const [eid,id,tl,st,mass]of chainsawIds){const e=item('chainsaw',eid,'Chainsaw',tl,150,mass,['HT27','B274']);
 const hints=['Только уже работающая цепь. Выбор режима не запускает и не останавливает двигатель. HT27 не задаёт число Ready для запуска/перезапуска; решение и действие – вручную.',
  'Против бетона, металла и сравнимой твёрдости нужен AD(0.5); дерево, пластик, плоть и кость не относятся к этому условию. Выберите реальную поверхность вручную. HT27.',
  'Если твёрдая цель не пробита: вручную 1d; 1–2 ничего, 3–5 двигатель заглох, 6 цепь оборвалась. При TL7 оборванная цепь наносит владельцу 1d cut; TL8 только ломает пилу. Ремонт и повторный запуск – вручную. HT27.',
  'Одна атака и одно явное Damage; дополнительных циклов при контакте нет. Топливо, остановленная цепь, застревание и последствия не автоматизируются.'];
 mode(e,id,'Работающая цепь – мягкий материал','sw+1d cut','1','0U',st,['Two-Handed Axe/Mace'],{hints});
 mode(e,'wHTM28Hard'+slug(id),'Работающая цепь – бетон / металл','sw+1d(0.5) cut','1','0U',st,['Two-Handed Axe/Mace'],{hints,templateModeId:id,chainTarget:'hard'});
}
let e=item('cattle-prod','eFSgCLs3crezPsgLz','Cattle Prod',7,50,2,['HT199','HT200','B432']);
mode(e,'wj_F3_STE7-LTGd0Z','Контакт – ожог и HT-сопротивление','1d-3 burn','1','0','3',['Shortsword'],{resistanceEffect:HT_CONTACT_EFFECT,hints:['Ожог 1d−3 burn – только по незащищённой локации; это отдельная часть от HT−3(0.5) aff. Подтверждение контакта и применимости ожога – вручную. HT199.',HT_CONTACT_EFFECT.brief,'6×S, тысячи применений; точное число и списание питания не опубликованы, учёт вручную. Не является подтверждённым обычным crushing-ударом.']});
e=item('stun-baton','eans6bBBgJpA61jl4','Stun Baton',8,60,1.5,['HT199','HT200','B432']);
for(const [id,key,damage]of [['w1zkFGwJ7YaiXlcH-','Swing','sw-1 cr'],['wSoNZld9Ji9t-m7y8','Thrust','thr-1 cr']])mode(e,id,key+' – удар и контакт',damage,'C,1','0','6',['Shortsword'],{resistanceEffect:HT_CONTACT_EFFECT,hints:[HT_CONTACT_EFFECT.brief,'Механический Damage и электрическое сопротивление независимы; HT не бросается скрыто. 2×S на тысячи применений, питание вручную.']});
e=item('stun-gun','eW-zph_pMipl-ErCS','Stun Gun',8,25,0.5,['HT199','HT200','B432']);
mode(e,'wWTX_8slOTBzVDG7f','Электрический контакт – HT−3','HT-3(0.5) aff','C','No','2',['Brawling','DX'],{instructionOnly:true,resistanceEffect:HT_CONTACT_EFFECT,hints:[HT_CONTACT_EFFECT.brief,'Только контактная affliction, обычный punch/cr Damage не опубликован. 2×S на тысячи применений, учёт питания вручную.']});
const knife=(e,ids,penalty=0)=>{for(const [i,damage,reach]of [[0,'sw-2 cut','C,1'],[1,'thr imp','C']])mode(e,ids[i],i?'Thrust – клинок':'Swing – клинок',damage,reach,'-1','6',['Knife'],{attackModifier:penalty,fixedPublishedQuality:false,construction:'blade',qualityClass:'knife',damagePart:'blade',martialGrips:['defensive','reversed'],combined:true,hints:e.hints});};
e=item('elgin-cutlass-pistol-54-caplock','eN7A1S-7ZzuakCP-u','Elgin Cutlass Pistol, .54 Caplock',5,300,3,['HT91','HT198','HT199','B272'],{hints:['Одно физическое устройство: клинок как Large Knife при Knife−1 и капсюльный пистолет. Заряжание, направление, хват и риск – вручную. Мelee не расходует патрон, стрельба использует общий ranged/GGA.']});knife(e,['wICNkuQO9i_FxUxf4','wk0vCihcCMUm3nBat'],-1);
e=item('tsniitochmash-nrs-2-7-62x42mm','eF9wvH1Tq9TV2nh8V','TsNIITochMash NRS-2, 7.62x42mm',8,100,1.4,['HT91','HT199','B272'],{hints:['Одно устройство. Клинок как Large Knife; выстрел выходит из конца рукояти. Перед стрельбой вручную развернуть нож (Ready или подтверждённый Shtick), снять предохранитель и направить рукоять. Выбор списка ничего не разворачивает. Один 7.62×42mm, расход только штатным ranged-путём.']});knife(e,['wFo4UA8LwlZXWjQda','wi2aw3XWqi2XEckOq']);
for(const [eid,ids]of [['eYVTJmA7RUE6xrlls',['wMAtvC24PXfeg5608','wxIDhFCs6QryHr69k']],['eWE4YEdoLeULeD938',['w5qTNrQOgk1w0mJdI','wHtHMiYarJ_DzMXuN']]]){
 e=item('condor-am-402-12g-2-75',eid,'Condor AM-402, 12G 2.75"',8,100,1.4,['HT91','HT199','B273']);
 for(const [i,d]of [[0,'sw cr'],[1,'thr cr']])mode(e,ids[i],i?'Thrust – корпус':'Swing – корпус',d,'1','0','6',['Shortsword'],{combined:true,hints:['Один физический Condor. Удар Baton не стреляет и не расходует заряд. Встроенный 12G 2.75" использует ranged/GGA и одну общую камору. Газовый патрон: как Tear Gas Spray, Shots 1; сопротивления и последствия – вручную. HT199.']});
}
e=item('condor-am-402t','eHTM28CondorAM402T','Condor AM-402T',8,100,1.6,['HT199','HT200']);
for(const [id,key,d,r]of [['wHTM28CondorTonfaSwing','Swing','sw cr','1'],['wHTM28CondorTonfaThrust','Thrust','thr cr','C,1']])mode(e,id,key+' – Tonfa',d,r,'0','7',['Tonfa'],{combined:true,betterHandParry:true,hints:['Tonfa-форма AM-402T прямо подтверждена HT199, масса 1.6 lb. Заряд и выстрел отдельны от удара; общий 12G-носитель. Исключения обычного Tonfa не придуманы.']});
mode(e,'wHTM28CondorTonfaPunch','Punch – рукоять','thr cr','C','0',null,['Brawling','Boxing','Karate','DX'],{combined:true,unarmedSkillBonus:true,handParry:true,hints:['Рукоять как Tonfa, HT199–200; MA111. Удар не стреляет и не расходует патрон.']});
e=item('sedgley-glove-pistol-mk-2','eHTM28SedgleyGlove','Sedgley Glove Pistol MK 2',6,50,0.5,['HT199','B271','B389']);
mode(e,'wHTM28SedgleyPunch','Punch – связанный выстрел вручную','thr-1 cr','C','0',null,['Brawling','Boxing','Karate','DX'],{unarmedSkillBonus:true,handParry:true,combined:true,
 manualLinkedAction:{type:'damage',formula:'2d-1',damagetype:'pi'},
 hints:['Перчатка имеет DR1, применяется вручную без изменения защиты Actor. Один бросок попадания DX/Boxing/Brawling/Karate. Одна явная проверка Damage удара; связанную пулю 2d−1 pi разрешить вручную по тому же попаданию и локации. Независимого второго Attack нет. HT199.',
 'Если удар dodged, выстрела нет. Если parried, пуля может попасть в парирующую руку или оружие по B389. Решение о срабатывании, цели и явный GGA Damage пули принимает пользователь. Патрон один; учёт/перезарядка 6 секунд вручную. Автоматического списания и скрытого linked Damage нет.']});
for(const [eid,id,name,pepper]of [['e2vXMSkbcMkh-72iy','w6R_sr11lEsrygm0K','Tear Gas Spray',false],['eEgRMvkjtY_eQ3bLa','wphfSIVv80OHomve0','Pepper Spray',true]]){
 e=item(pepper?'pepper-spray':'tear-gas-spray',eid,name,pepper?8:7,10,0.1,['HT180','B428','B124']);
 mode(e,id,'Струя в лицо – химическое воздействие','spec.','1,2','No','3',['Liquid Projector (Sprayer)'],{sourceOptions:[{sourceHeader:'LIQUID PROJECTOR (SPRAYER)',unmodifiedSkills:['Liquid Projector (Sprayer)'],defaults:[{from:'DX',modifier:-4,type:'attribute',recursive:false},{from:'Liquid Projector',modifier:-4,type:'skill',recursive:false}]}],instructionOnly:true,resistanceEffect:htSprayEffect(pepper),spray:true,
  hints:[htSprayEffect(pepper).chemical.protection,htSprayEffect(pepper).brief,'20 применений в опубликованном баллончике. Расход явный; существующий Tear Gas Spray сохраняет штатный учёт, Pepper Spray учитывается вручную. Не подменять воздействие burn/tox Damage.']});
}
for(const e of items.filter(e=>['ht:condor-am-402-12g-2-75','ht:condor-am-402t'].includes(e.modelId)))mode(e,'wHTM28CondorGas'+slug(e.equipmentId),'Газовый 12G – процедура HT180','spec.','1,2','No','3',['Liquid Projector (Sprayer)'],{
 sourceOptions:[{sourceHeader:'LIQUID PROJECTOR (SPRAYER)',unmodifiedSkills:['Liquid Projector (Sprayer)'],defaults:[{from:'DX',modifier:-4,type:'attribute',recursive:false},{from:'Liquid Projector',modifier:-4,type:'skill',recursive:false}]}],combined:true,instructionOnly:true,spray:true,resistanceEffect:htSprayEffect(false),
 hints:[htSprayEffect(false).chemical.protection,htSprayEffect(false).brief,'Только фактически установленный газовый 12G-заряд: как Tear Gas Spray, Shots1 (HT199). Подтвердить заряд и применимость вручную. Одна процедура Attack без пулевого Damage. Расход одной каморы выполнить явно штатной операцией «Списать»; дополнительно ranged-выстрел не выполнять. Выбор режима сам заряд не расходует.']});
export const HT_SPECIAL_PROFILES=profiles,HT_SPECIAL_EQUIPMENT=items;
export const HT_COMBINED_EQUIPMENT=Object.freeze(['eN7A1S-7ZzuakCP-u','eF9wvH1Tq9TV2nh8V','eYVTJmA7RUE6xrlls','eWE4YEdoLeULeD938','eHTM28CondorAM402T']);
export const htCombinedEquipment=id=>HT_COMBINED_EQUIPMENT.includes(id);
export const htSpecialSource=id=>profiles[id]??null;
export const htSpecialGripPolicy=p=>p?.htSpecial?{grips:p.martialGrips??[],twoHanded:p.hands===2}:null;
export const htSpecialHints=p=>[...(p.hints??[]),'Ready, физическое состояние, защита, питание, поломка и последствия проверяются вручную; выбор режима их не меняет. '+p.sourcePages.join('; ')+'.'];
export const HT_WORK_PROCEDURES=[
 {modelId:'ht:circular-saw',name:'Circular Saw',sourcePages:['HT27'],modeIds:['w97_uEiMUqcFVpfJ-','wOHIhliBGjYJKge6m','wkuw7NCOcOmCIFJlp'],damage:'sw+3(2) cut / s',hints:'Рабочее пиление. TL6 внешнее питание, TL8 масса/цена ×0.5; cordless M/30 минут. Навык обычной атаки, Reach, ST и Parry не опубликованы.'},
 {modelId:'ht:cutting-torch',name:'Cutting Torch',sourcePages:['HT27'],modeIds:['wYstTcATjL8Paidyz'],damage:'1d+3(2) burn / s',hints:'Рабочая резка, 30 секунд на баллон; запасной $50, 5 lb. Применение этой формулы против персонажа не опубликовано.'},
 {modelId:'ht:drill',name:'Drill',sourcePages:['HT27'],modeIds:['wflnXSn-N842a_IQ6'],damage:'6d(2) pi++ / s',hints:'Штативный паровой бур TL5 по бетону/камню: 500 lb, внешнее питание. Не ручное боевое оружие.'},
 {modelId:'ht:power-drill',name:'Power Drill',sourcePages:['HT27'],modeIds:['wSLBM4cOvxbGUGddB','wdNSXATftsRhxldVJ'],damage:'1d+2(2) pi++ / s',hints:'Рабочее сверление дерева, пластика и металла; TL6 внешнее питание, TL8 M/30 минут. Обычный боевой профиль не опубликован.'},
 {modelId:'ht:rotary-hammer',name:'Rotary Hammer',sourcePages:['HT27'],modeIds:['wj3S12NiNIJQ6W6x8','wVie_2KxErcQeMUaG'],damage:'2d+2(2) pi++ / s',hints:'Рабочее сверление бетона/камня; цена Power Drill ×10, масса ×5. Обычный боевой профиль не опубликован.'},
 {modelId:'ht:jackhammer',name:'Jackhammer',sourcePages:['HT27'],modeIds:[],damage:'7d(2) pi++ / s',hints:'Демонтаж бетона, камня и асфальта. TL6 компрессор/шланг, 160 lb; TL8 масса вдвое меньше, питание от здания. Боевого профиля нет.'},
 {modelId:'ht:pocket-torch',name:'Pocket Torch',sourcePages:['HT27'],modeIds:[],damage:'1d-2 burn / s',hints:'Рабочая горелка на 20 минут, заправка $1. Плавление материалов не подтверждает обычную атаку против персонажа.'},
 {modelId:'ht:plasma-torch',name:'Plasma Torch',sourcePages:['HT27'],modeIds:[],damage:'3d+6(2) burn / s',hints:'Рабочая плазменная резка; баллон сжатого воздуха каждые 10 минут либо компрессор. Боевые skill/Reach/ST/Parry не опубликованы.'},
 {modelId:'ht:rescue-spreader-cutter',name:'Rescue Spreader/Cutter',sourcePages:['HT30'],modeIds:['wxBDv-EZaY9iEhu-A','wM-IloFzOSMLUuolU'],damage:'TL7 6d×4(2) cr; TL8 6d×5(2) cr / activation',hints:'Рабочие челюсти: 4 Ready открыть и 4 закрыть. Reach1 и ST16† (TL7)/14† (TL8) опубликованы для работы; боевой навык и Parry отсутствуют. Arm ST36/45, BL259/405 для распора, не ST владельца. Гидролиния 5 ярдов, силовой блок и топливо вручную.'},
 {modelId:'ht:hydraulic-door-opener',name:'Hydraulic Door Opener',sourcePages:['HT30'],modeIds:[],damage:'10d cr vs door/doorjamb',hints:'Ручной гидравлический распор: после трёх Ready накачивания повреждает дверь/косяк. Не обычная боевая атака; разрушение и повторные циклы вручную.'},
 {modelId:'ht:doorbuster',name:'Doorbuster',sourcePages:['HT30'],modeIds:[],damage:'4d(2) pi++ vs lock/hinge/bolt',hints:'Головка упирается в замок, петлю или засов; удар зубила после спуска. Стрипы на 10 зарядов как Nail Gun HT28, ресурс вручную. Форма пистолета не подтверждает боевой профиль.'},
 {modelId:'ht:lock-buster',name:'Lock Buster',sourcePages:['HT30'],modeIds:[],damage:'×2 sledgehammer Damage vs padlock',hints:'Насадка на висячий замок; по ней бьют Sledgehammer. Удваивает урон именно замку, не является отдельной атакой. Защита и разрушение вручную.'}
];
export const htWorkSource=id=>HT_WORK_PROCEDURES.find(p=>p.modeIds.includes(id))??null;
export function applyHTSpecialMode(m,e,{snapshot=false}={}){
 const work=htWorkSource(m?.weapon_mode_id);if(work&&e.source==='HT'){m.ht_work_only=true;m.hidden=true;m.ht_tool_manual=work.damage+'. '+work.hints+' '+work.sourcePages.join('; ')+'.';return m;}
 const p=profiles[m?.weapon_mode_id];if(!p||e.source!=='HT'||e.equipment_id!==p.equipmentId)return m;
 const before=HT_SPECIAL_ORIGINAL_FIELDS[p.modeId],accept=(key,current,value)=>!snapshot||before&&[before[key],value].some(v=>JSON.stringify(v)===JSON.stringify(current));
 if(!p.instructionOnly&&accept('damage',m.raw_calc?.damage,p.stats.damage)){
  const d=/^(sw|thr)((?:[+-]\d+d?)*)?(?:\(([\d.]+)\))? (\S+)$/.exec(p.stats.damage);
  const f=/^(\d+d(?:[+-]\d+)?)(?:\(([\d.]+)\))? (\S+)$/.exec(p.stats.damage);
  if(!d&&!f)throw Error('Invalid HT special numeric Damage');
  m.stats={...m.stats,damage:d?{st:d[1],...(d[2]?{base:d[2].replace(/^\+/,'')}:{}),...(d[3]?{armor_divisor:Number(d[3])}:{}),type:d[4]}:{base:f[1],...(f[2]?{armor_divisor:Number(f[2])}:{}),type:f[3]}};m.raw_calc={...m.raw_calc,damage:p.stats.damage};
 }
 for(const [key,field]of [['reach','reach'],['parry','parry'],['strength','st']])if(accept(field,m.stats[key],p.stats[field]))m.stats[key]=p.stats[field];
 if(accept('usage',m.usage,p.usage))m.usage=p.usage;
 m.ht_special_contract={version:1,modelId:p.modelId,sourcePages:p.sourcePages,instructionOnly:p.instructionOnly===true};m.hand_use={...m.hand_use,value:p.hands===2?'two-handed':'one-handed',basis:'printed-source'};
 delete m.ht_tool_manual;return m;
}
export function projectHTSpecialData(book,data){
 if(book==='ht'){
  for(const id of ['ht_12_gauge_2_75_18_5x70mmr','ht_12_gauge_2_75_18_5x70mmr_heavy_load']){const a=data.ammo_items?.find(a=>a.id===id);if(a)for(const key of ['weapon_mode_ids','compatible_weapon_mode_ids'])if(Array.isArray(a[key])&&!a[key].includes('WHTM28CondorTonfaFired'))a[key].push('WHTM28CondorTonfaFired');}
  for(const f of data.ammo_families??[])if(f.ammo_item_ids?.some(id=>['ht_12_gauge_2_75_18_5x70mmr','ht_12_gauge_2_75_18_5x70mmr_heavy_load'].includes(id))&&!f.compatible_weapon_mode_ids.includes('WHTM28CondorTonfaFired'))f.compatible_weapon_mode_ids.push('WHTM28CondorTonfaFired');return data;
 }
 if(book!=='weapons')return data;
 for(const spec of items){let e=data.equipment.find(e=>e.equipment_id===spec.equipmentId);if(!e){e={source:'HT',book:'High-Tech',equipment_id:spec.equipmentId,name:spec.name,reference:spec.sourcePages[0],tech_level:String(spec.techLevel),tags:['Melee Weapon'],local_notes:null,modes:[],ht_special_origin:'module-printed-source-overlay'};data.equipment.push(e);}
  for(const p of Object.values(profiles).filter(p=>p.equipmentId===e.equipment_id))if(!e.modes.some(m=>m.weapon_mode_id===p.modeId)){
   const m={weapon_mode_id:p.modeId,index:e.modes.length,usage:p.usage,usage_notes:null,hidden:false,combat_type:'melee',role:'attack',stats:{},raw_calc:{damage:p.stats.damage},defaults:[],weapon_family:'melee',hand_use:{value:p.hands===2?'two-handed':'one-handed',basis:'printed-source'},action_hints:[],resolution_flags:[]};e.modes.push(m);
  }
 }
 const condor=data.equipment.find(e=>e.equipment_id==='eHTM28CondorAM402T');if(!condor.modes.some(m=>m.weapon_mode_id==='WHTM28CondorTonfaFired')){
  const parent=data.equipment.find(e=>e.equipment_id==='eYVTJmA7RUE6xrlls')?.modes.find(m=>m.weapon_mode_id==='Wx10NaVSr1cp1bwKv');if(parent){const m=structuredClone(parent);m.weapon_mode_id='WHTM28CondorTonfaFired';m.index=condor.modes.length;m.usage='Fired – 12G';m.ht_combined_source={source:'HT199',exactParentModeId:parent.weapon_mode_id,condition:'AM-402T similar to AM-402; only Tonfa shape and 1.6 lb weight differ'};condor.modes.push(m);}
 }
 for(const e of data.equipment.filter(e=>e.source==='HT'))for(const m of e.modes){applyHTSpecialMode(m,e);if(htCombinedEquipment(e.equipment_id)&&m.role==='attack')m.ht_combined_equipment_id=e.equipment_id;}
 const stun=data.equipment.find(e=>e.equipment_id==='eW-zph_pMipl-ErCS');if(stun)stun.tech_level='8';
 const nrs=data.equipment.find(e=>e.equipment_id==='eF9wvH1Tq9TV2nh8V')?.modes.find(m=>m.weapon_mode_id==='Wr_7MnorYDlPSb2qW');if(nrs&&nrs.stats.accuracy==null)nrs.stats.accuracy='0';
 return data;
}
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(profiles);freeze(items);
