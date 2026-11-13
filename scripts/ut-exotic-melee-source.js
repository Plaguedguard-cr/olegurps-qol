// M2.10. Printed Ultra-Tech 2007; E30 and the two explicit user decisions.
// Source data and projections only. Never writes GCS, GGA or Actor.system.
import {UT_EXOTIC_ROWS} from './ut-exotic-melee-data.js';
import {htMeleeSkillOptions} from './ht-ordinary-melee-source.js';
import {utOrdinaryQuality} from './ut-ordinary-melee-source.js';
const profiles={},equipment=[];
const options=(skill,dx,defaults=[])=>[{sourceHeader:skill,unmodifiedSkills:[skill],defaults:[{from:'DX',modifier:dx,type:'attribute',recursive:false},...defaults.map(([from,modifier])=>({from,modifier,type:'skill',recursive:false}))]}];
const force=options('Force Sword',-5,[['any sword skill',-3]]);
const mono=options('Monowire Whip',-6,[['Kusari',-3],['Whip',-3]]);
const whip=options('Whip',-5,[['Kusari',-3],['Monowire Whip',-3]]);
const beam=options('Beam Weapons (Projector)',-4,[['Beam Weapons',-4]]);
const unarmed=['Boxing','Brawling','Karate','DX'];
export const UT_NEURAL_SETTINGS=Object.freeze({agony:'Agony',ecstasy:'Ecstasy',stun:'Neural Stun',paralysis:'Paralysis',seizure:'Seizure',death:'Heart Attack'});
export function utContactEffect(kind,modifier,armorDivisor,name,setting='agony'){
 return {version:1,id:'ut-melee-'+kind+'-'+setting,name,attribute:'HT',modifier,condition:'ut-contact',outcome:'ut-contact',kind,armorDivisor,setting,source:kind==='inhibitor'?'UT201':kind==='extinguisher'?'UT87':kind==='lethal'?'UT165; B432':kind==='neural'?'UT165-166; UT121-122':'UT165',eligible:true};
}
const temporal=(cellSize,capacity,source)=>({cellSize,cells:1,capacity,chargePerPhysicalShot:1,stateKey:'utMeleeBattery',completeSet:true,source,unit:'с',accounting:'one-second-per-completed-use; other elapsed time explicit'});
const impulses=(capacity,cost=1)=>({...temporal('B',capacity,'UT165'),unit:'зарядов',chargePerPhysicalShot:cost,accounting:'published-contact-discharges'});
function add(row,id,usage,damage,reach,parry,st,skills,extra={}){
 const p={modelId:row.modelId,equipmentId:row.equipmentIds[0],name:row.sourceName,book:'UT',techLevel:row.techLevel,cost:row.cost,mass:row.mass,sourcePages:row.sourcePages,modeId:id,usage,stats:{damage,reach,parry,st},primarySkills:skills,
 sourceOptions:extra.sourceOptions??htMeleeSkillOptions(skills),attackModifier:0,hands:/[†‡]/.test(st??'')?2:1,utExotic:true,utOrdinary:true,fixedPublishedQuality:true,qualityOptions:[{level:'Good',damageBonus:0}],baselineQuality:'Good',baselineMaterial:'published',martialGrips:[],balanceOptions:[],displayUsage:true,tooltipHints:true,damagePart:'published-device',hints:[],...extra};
 p.ltConstruction={domain:'UT-M2.10',construction:'fixed',modelId:p.modelId,metal:false,qualityClass:'fixed',damageTypes:[damage.split(' ').at(-1)]};profiles[id]=p;return p;
}
for(const row of UT_EXOTIC_ROWS){
 if(!row.equipmentIds.length)continue;
 const key=row.modelId.slice(3),ms=row.modes;
 equipment.push({modelId:row.modelId,equipmentId:row.equipmentIds[0],name:row.sourceName,sourcePages:row.sourcePages});
 if(key.includes('torch')||key==='industrial-water-knife'){
  const m=ms[0],water=key==='industrial-water-knife';
  add(row,m.modeId,'Рабочая струя – боевая атака',m.damage,m.reach,m.parry,m.st,[water?'Axe/Mace':'Beam Weapons (Projector)'],{sourceOptions:water?options('Axe/Mace',-5):beam,
   power:temporal(row.cellSize,row.seconds,row.sourcePages.join('; ')),water,tightBeam:!water,
   hints:[water?'Нужен реальный подключённый запас воды; 1 галлон/час, штатный ранец 2 галлона. Фильтр медицинской версии заменяется с батареей. UT81.':'Непрерывная tight-beam струя; парируется только force blade. rad/sur сохраняются там, где опубликованы. UT80; UT85.',
    'Завершённая боевая атака учитывает 1 секунду работы. Остальное время работы списывается явно; фонового таймера нет.']});
 }else if(key==='force-whip'){
  const m=ms[0];add(row,m.modeId,'Активный Force Whip',m.damage,m.reach,m.parry,m.st,['Force Whip'],{sourceOptions:options('Force Whip',-5,[['Kusari',-3],['Monowire Whip',-3],['Whip',-3]]),power:temporal('B',100,'UT166'),tightBeam:true,
   hints:['Гибкое поле: Ready и фактическая длина вручную. Фиксированные 4d(5) burn, без ST-derived прибавок. 1 секунда питания на завершённую атаку; прочее время списывается явно. UT166.']});
 }else if(['monowire-switchblade','stasis-switchblade','monowire-whip'].includes(key)){
  const stasis=key==='stasis-switchblade',switchblade=key!=='monowire-whip',flex=ms.at(-1),max=stasis?30:5;
  const hints=['Изменение длины/жёсткости – Ready вручную. Натяжение только уже захваченной цели, каждый ход вручную; обычный Swing не повторяется. Критический «drop weapon» может ранить владельца или друга. UT163-164.',...(stasis?['Stasis web: клинок не ломается и парирует force/energy. UT164.']:[])];
 if(switchblade)for(let r=0;r<=max;r++)add(row,r===0?ms[0].modeId:ms[0].modeId+'R'+r,'Жёсткий – Reach '+(r||'C'),'sw+1d'+(r?'+'+r:'')+'(10) cut',String(r||'C'),'0','5',['Force Sword'],{sourceOptions:force,nanothornCapable:!stasis,power:stasis?null:temporal('B',36000,'UT164'),powerUnspecified:stasis,hints:[...hints,'R равен фактическому Reach (C=0). Только Swing; нужно место по длине клинка. Без питания жёсткий режим недоступен; гибкий выбирается вручную. UT164.',...(stasis?['Отдельные тип cell и длительность питания Stasis в UT164 не опубликованы. Номинал B/10 часов соседней модели не присваивается; питание stasis web проверяется вручную.']:[])]});
  add(row,flex.modeId,'Гибкий – Swing',flex.damage,flex.reach,flex.parry,flex.st,['Monowire Whip'],{sourceOptions:mono,nanothornCapable:!stasis,hints});
  add(row,flex.modeId+'Taut','Натяжение захваченной цели','thr+1d(10) cut',flex.reach,flex.parry,flex.st,['Monowire Whip'],{sourceOptions:mono,nanothornCapable:!stasis,contactOnly:true,contactProcedure:true,hints});
 }else if(['electric-stun-wand','neurolash-baton','neurolash-whip'].includes(key)){
  const neural=key!=='electric-stun-wand';
  for(const m of ms)add(row,m.modeId,m.damage.startsWith('thr')?'Thrust – связанный контакт':'Swing – связанный контакт',m.damage,m.reach,m.parry,m.st,[key==='neurolash-whip'?'Whip':'Shortsword'],{sourceOptions:key==='neurolash-whip'?whip:htMeleeSkillOptions(['Shortsword']),power:impulses(20),neural,
   linked:true,resistanceEffect:utContactEffect(neural?'neural':'emd',-5,neural?2:0.5,row.sourceName),
   hints:[neural?'Связанный HT-5(2) aff по тому же попаданию; не второй удар. Версию neural выбирают для экземпляра. Force/sonic/vibro/monowire несовместимы. UT165-166.':'Связанный HT-5(0.5) aff по тому же попаданию (утверждённая эррата E30). При провале knockdown/paralysis; HT-5 каждую секунду на восстановление без DR. Concentrate с контактом запрещает восстановление и расходует ещё заряд/секунду вручную. UT165.']});
 }else if(key==='zap-glove'||key==='neuroglove'){
  const neuro=key==='neuroglove';
  for(const m of ms){const lethal=m.damage==='2d burn',skills=neuro?unarmed:[...unarmed,'Judo','Wrestling'];add(row,m.modeId,lethal?'Kill – электрический контакт':neuro?'Нервный контакт':'Stun – электрический контакт',lethal?'2d burn':'spec.',m.reach,m.parry,m.st,skills,{sourceOptions:[...htMeleeSkillOptions(unarmed),...(!neuro?['Judo','Wrestling'].map(skill=>({unmodifiedSkills:[skill],defaults:[]})):[])],instructionOnly:!lethal,power:impulses(neuro?20:10,lethal?2:1),neural:neuro,resistanceEffect:utContactEffect(neuro?'neural':lethal?'lethal':'emd',lethal?0:-6,lethal?1:2,row.sourceName),
   hints:[neuro?'DR2 руки; проникающий урон: 1 из 6 шанс поломки, вручную. Версия neural выбирается для экземпляра. UT165.':'DR5 руки. Stun: точный GCS HT-6(2) aff; Kill: 2d burn, B432 по фактической травме. Смена – Ready. UT165.',
    'Контакт и физический удар различаются: дополнительный удар не создаётся автоматически. Boxing/Brawling/Karate может нанести обычный unarmed Damage по тому же попаданию; grapple/рукопожатие разрешаются вручную. UT165.']});}
 }else if(key==='limpet-mine-dispenser'){
  const m=ms[0];add(row,m.modeId,'Установить мину – без немедленного Damage','spec.',m.reach,'No',null,['Brawling','DX'],{instructionOnly:true,resource:{id:'mines',capacity:10,unit:'мин',cost:1},hints:['Попадание прикрепляет одну настоящую 25mm мину; немедленного Damage нет. Задержка 0–100 секунд и снятие Ready + ST (−min(DR/10,20)) вручную. При отрыве от плоти 1 HP. Детонация и система мин остаются DEFERRED. UT163.']});
 }else if(key==='neural-inhibitor'){
  add(row,ms[0].modeId,'Контакт – без Attack','spec.','C','No',null,[],{sourceOptions:[],instructionOnly:true,contactProcedure:true,power:temporal('A',36000,'UT201'),resistanceEffect:utContactEffect('inhibitor',-6,1,row.sourceName),hints:['Только реальный контакт голой кожи живого существа с подходящей нервной системой. Установка и место подтверждаются вручную; навыка боевой атаки источник не задаёт. Каждая секунда контакта: HT-6, расход 1 секунды питания. UT201.']});
 }else if(key==='pneumohypo'){
  add(row,ms[0].modeId,'Ввести установленную дозу','spec.','C','No',null,['Knife'],{sourceOptions:options('Knife',-4),instructionOnly:true,resource:{id:'air',capacity:100,unit:'применений',cost:1},payload:true,hints:['Только одна фактически установленная доза. Проникает DR1 / обычную одежду; иной DR и введение решаются вручную. Замена дозы или воздуха – 3 секунды. Препарат не создаётся; эффекты по содержимому дозы. UT199.']});
 }
}
for(const [key,name,cost,mass,source]of [['disposable-hypo','Disposable Hypo',0.5,0.01,'UT197'],['stinger','Stinger',500,0,'UT211; UT212']]){
 const row=UT_EXOTIC_ROWS.find(r=>r.modelId==='ut:'+key),e={...row,equipmentIds:['eUTM210'+key.replaceAll('-','')],techLevel:9,cost,mass};equipment.push({modelId:e.modelId,equipmentId:e.equipmentIds[0],name});
 add(e,'wUTM210'+key.replaceAll('-',''),'Ввести установленную дозу','spec.','C','No',null,[],{sourceOptions:[],instructionOnly:true,contactProcedure:true,payload:true,resource:{id:'dose',capacity:1,cost:1,unit:'доз'},hints:[key==='stinger'?'Только уже установленный имплант и внешний Disposable Hypo. 1 HP только для penetration, без wounding; агент – follow-up. Коготь/укус и само попадание разрешаются вручную. Замена 10 секунд. UT211-212.':'Одна настоящая предварительно заправленная доза drug/poison/nanoagent. Боевой skill этой записи не опубликован; подтверждается уже установленный контакт. Цена +$0.50 только для препаратов дешевле $5, иначе hypo включён. UT197.','Препарат не создаётся и не выбирается по белому списку; содержимое и последствия задаёт владелец.']});
}
// Glove punch is the same hit plus the chosen contact effect, never a second Attack.
for(const p of Object.values(profiles).filter(p=>['ut:zap-glove','ut:neuroglove'].includes(p.modelId))){
 const row=UT_EXOTIC_ROWS.find(r=>r.modelId===p.modelId),lethal=p.stats.damage==='2d burn';
 add(row,p.modeId+'Punch',p.usage+' + удар кулаком','thr-1 cr','C','No',null,unarmed,{unarmedSkillBonus:true,power:p.power,neural:p.neural,linked:true,resistanceEffect:p.resistanceEffect,manualLinkedAction:lethal?{type:'damage',formula:'2d',damagetype:'burn'}:null,hints:p.hints});
 add(row,p.modeId+'Contact',p.usage+' – установленный контакт',p.stats.damage,'C','No','2',[],{sourceOptions:[],instructionOnly:!lethal,contactProcedure:true,power:p.power,neural:p.neural,resistanceEffect:p.resistanceEffect,hints:[...p.hints,'Без Attack только при подтверждённом контакте, например рукопожатии. В бою сначала разрешите попадание/захват. UT165.']});
}
for(const [key,name,range,seconds,cost,mass]of [['fire-extinguisher-tube','Fire Extinguisher Tube',2,4,10,1],['small-fire-extinguisher','Small Fire Extinguisher',3,10,50,3],['large-fire-extinguisher','Large Fire Extinguisher',3,30,200,10]]){
 const row=UT_EXOTIC_ROWS.find(r=>r.modelId==='ut:'+key),e={...row,equipmentIds:['eUTM210'+key.replaceAll('-','')],techLevel:9,cost,mass};equipment.push({modelId:e.modelId,equipmentId:e.equipmentIds[0],name});
 add(e,'wUTM210'+key.replaceAll('-',''),'Струя в лицо – контактный агент','spec.','1-'+range,'No',null,['Liquid Projector (Sprayer)'],{sourceOptions:options('Liquid Projector (Sprayer)',-4,[['Liquid Projector',-4]]),instructionOnly:true,resource:{id:'extinguisher',capacity:seconds,unit:'с',cost:1,tlDuration:true},resistanceEffect:utContactEffect('extinguisher',-3,1,name),hints:['Только попадание в лицо; Contact Agent, применимую защиту проверяют вручную. Провал HT-3: Stun и Blindness на MoF секунд. Длительность ресурса ×1.5/2/3 при индивидуальном ТУ10/11/12. UT87.']});
}
export const UT_EXOTIC_PROFILES=profiles,UT_EXOTIC_EQUIPMENT=equipment;
export const utExoticSource=id=>profiles[id]??null;
export const utExoticHints=p=>[...p.hints,'Ready, реальное включение, защиты и последствия – вручную. '+p.sourcePages.join('; ')+'.'];
// M0 saved this upgrade as quality. Keep that explicit choice readable without
// treating an ordinary grade as a blade or changing historical snapshots.
export const normalizeUTExoticSelection=(p,s={})=>p?.nanothornCapable&&s.quality==='Nanothorn'?
 {...s,quality:'',blade:'nanothorn',weaponTL:s.weaponTL??11}:s;
export function utExoticQuality(p,s={},options={}){
 s=normalizeUTExoticSelection(p,s);
 if(s.blade!=='nanothorn')return utOrdinaryQuality(p,s,options);
 if(!p.nanothornCapable)throw Error('Nanothorn не подтверждён для этой конструкции.');
 if((s.weaponTL??Number.parseInt(p.techLevel))<11)throw Error('Nanothorn требует ТУ11+ (UT164).');
 if(options.manualDamage||options.imported&&!options.publishedInput)throw Error('Для Nanothorn выберите опубликованный исходный режим; импорт и ручной Damage не переписываются.');
 const q=utOrdinaryQuality(p,{...s,blade:''},options);return {...q,blade:'nanothorn',requiredTL:11,superscience:true,price:p.cost*4,materialTransform:{type:'cor',divisor:10,replaceDivisor:true},hints:[...utExoticHints(p),'Nanothorn: cut заменяется на cor с AD(10), цена monowire whip/switchblade ×4. UT164.']};
}
export function utExoticEffect(p,selection={}){
 if(!p.resistanceEffect)return null;
 const effect=structuredClone(p.resistanceEffect);
 if(p.neural){if(!Object.hasOwn(UT_NEURAL_SETTINGS,selection.neuralSetting??''))throw Error('Выберите установленную версию Neural в редакторе экземпляра.');effect.setting=selection.neuralSetting;}
 return effect;
}
export function applyUTExoticMode(m,e,{snapshot=false}={}){
 const p=profiles[m?.weapon_mode_id];if(!p||e.source!=='UT'||e.equipment_id!==p.equipmentId)return m;
 const old=UT_EXOTIC_ROWS.flatMap(r=>r.modes).find(r=>r.modeId===m.weapon_mode_id);
 const accept=(key,current,value)=>!snapshot||[old?.[key],key==='damage'?old?.gcs?.calc?.damage:old?.gcs?.[key],value].some(v=>JSON.stringify(current)===JSON.stringify(v));
 m.stats??={};m.raw_calc??={};
 if(accept('damage',m.raw_calc.damage,p.stats.damage)){
  const d=/^(sw|thr)((?:[+-]\d+d?)*)?(?:\(([\d.]+)\))? (.+)$/.exec(p.stats.damage),f=/^(\d+d(?:[+-]\d+)?)(?:\(([\d.]+)\))? (.+)$/.exec(p.stats.damage);
  m.raw_calc.damage=p.stats.damage;m.stats.damage=d?{st:d[1],base:(d[2]??'').replace(/^\+/,''),type:d[4],...(d[3]?{armor_divisor:Number(d[3])}:{})}:f?{base:f[1],type:f[3],...(f[2]?{armor_divisor:Number(f[2])}:{})}:{type:'spec.'};
 }
 for(const [key,field]of [['reach','reach'],['parry','parry'],['strength','st']])if(accept(field,m.stats[key],p.stats[field]))m.stats[key]=p.stats[field];
 if(!snapshot||m.usage===old?.usage||!old)m.usage=p.usage;
 m.ut_exotic_contract={version:1,modelId:p.modelId,instructionOnly:!!p.instructionOnly};return m;
}
export function projectUTExoticData(book,data){
 if(book!=='weapons')return data;
 for(const p of Object.values(profiles)){
  let e=data.equipment.find(e=>e.equipment_id===p.equipmentId);
  if(!e){e={equipment_id:p.equipmentId,source:'UT',name:p.name,description:p.name,reference:p.sourcePages.join('; '),tech_level:String(p.techLevel),base_value:p.cost,base_weight:p.mass+' lb',categories:['Melee Weapon'],modes:[]};data.equipment.push(e);}
  let m=e.modes.find(m=>m.weapon_mode_id===p.modeId);if(!m){m={weapon_mode_id:p.modeId,index:e.modes.length,combat_type:'melee',role:'attack',usage:p.usage,hidden:false,stats:{},raw_calc:{},defaults:[],action_hints:[],resolution_flags:[],weapon_family:'melee'};e.modes.push(m);}applyUTExoticMode(m,e);
 }
 return data;
}
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};freeze(profiles);freeze(equipment);
