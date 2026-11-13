// M2.9. Printed UT74/83/163/165/166 and Basic B208/271/273.
// One physical equipment ID per configuration family; no Actor/equipment writes.
import {htMeleeSkillOptions} from './ht-ordinary-melee-source.js';
import {UT_ORDINARY_ORIGINAL_FIELDS} from './ut-ordinary-original-fields.js';
import {meleeWeaponTL} from './lt-melee-quality-data.js';
const profiles={},items=[];
const forceOptions=[{sourceHeader:'FORCE SWORD (DX-5 or any sword skill at -3)',unmodifiedSkills:['Force Sword'],defaults:[
 {from:'DX',modifier:-5,type:'attribute',recursive:false},{from:'any sword skill',modifier:-3,type:'skill',recursive:false}]}];
const forceHints=['Только уже включённый и стабилизированный клинок. Ready на включение (или успешный Fast-Draw), затем 1 секунда стабилизации – вручную. Выбор режима не включает питание. UT166.',
 'Фиксированный tight-beam burn с AD(5), без прибавления sw/thr. Клинок не ломается; при Parry наносит свой Damage оружию/части тела. При парировании или блоке клинка защищающее оружие/часть тела также получает Damage, кроме critical success. Другой force sword или sonic blade не повреждается. Force Parry и применение Damage – вручную, без скрытых бросков. UT166.'];
function item(modelId,equipmentId,name,tl,cost,mass,pages){const e={modelId:'ut:'+modelId,equipmentId,name,book:'UT',techLevel:tl,cost,mass,sourcePages:pages};items.push(e);return e;}
function mode(e,id,usage,damage,reach,parry,st,skills,extra={}){
 const p={...e,modeId:id,usage,stats:{damage,reach,parry,st},primarySkills:skills,sourceOptions:skills[0]==='Force Sword'?forceOptions:htMeleeSkillOptions(skills),
  utOrdinary:true,tooltipHints:true,displayUsage:true,attackModifier:0,hands:/[†‡]/.test(st??'')?2:1,baselineQuality:'Good',fixedPublishedQuality:true,qualityOptions:[{level:'Good',damageBonus:0}],
  damagePart:'device-body',martialGrips:[],balanceOptions:[],baselineMaterial:'published',hints:[],...extra};
 p.ltConstruction={domain:'UT-M2.9',construction:'fixed',modelId:p.modelId,metal:false,qualityClass:'fixed',damageTypes:[damage.split(' ').at(-1)]};profiles[id]=p;return p;
}
let e=item('heavy-flashlight','eRArfUwOeI_v9CrIX','Heavy Flashlight',9,20,1,['UT74','B273']);
for(const [id,d,name]of [['w3vSCNftOrywWou49','sw cr','Swing'],['wI0oYbRdlvRyfiyHY','thr cr','Thrust']])mode(e,id,name+' – корпус фонаря',d,'1','0','6',['Shortsword'],{hints:['Корпус как Baton. Удар не включает свет и не расходует питание. Освещение 2B/24 часа и dazzle-применение UT113 не являются этой атакой. UT74; B273.']});
e=item('karatand','ef55nM_NrfAgS_Cam','Karatand',9,100,0,['UT163','B271','B182','B203']);
mode(e,'wQn8_zVA--bjjKSQp','Punch – Karatand','thr cr','C','0',null,['Boxing','Brawling','Karate','DX'],{unarmedSkillBonus:true,handParry:true,damagePart:'fist-load',hints:['Как Brass Knuckles, уже включает +1 к обычному thr−1 удару кулаком. Boxing/Brawling/Karate даёт один штатный unarmed bonus; итог GGA повторно не усиливается. Другие fist-loads, перчатки и усилители автоматически не складываются. UT163; B271.']});
e=item('morph-axe','eZnSkabiAi4plvxxt','Morph Axe',10,500,2,['UT83','B271']);
for(const [id,type,name]of [['wg9K3Yi69WdSCaeKP','cut','Режущая'],['wUTM29MorphImp','imp','Колюще-пробивная'],['wUTM29MorphCr','cr','Ударная']])mode(e,id,name+' форма – Morph Axe','sw+1 '+type,'1','0','8',['Axe/Mace'],{morph:true,damagePart:'morph-head',hints:['Одна memory-metal конструкция; sw+1 cut/imp/cr по фактической форме, остальное как Hatchet. Трансформация, команда, Ready и реальная форма – вручную; выбор списка ничего не трансформирует. Цена $500 и масса 2 lb от формы не зависят. ST12 для резки камня – условие работы, не боевой штраф. UT83; B271.','Superfine применяется только к cut/imp: итоговые +2 и AD(2), без дополнительного Fine. Monowire, Vibro, Hyperdense, Nanothorn, Rocket Striker и их сочетания для memory-metal формы требуют отдельной проверки; не включаются по аналогии. UT163–164.']});
e=item('force-blade','e7poIKy12yiMyWYib','Force Blade','11^',2000,0.5,['UT166','B208']);
mode(e,'wDySTsgiygu6nSRFu','Активный Force Blade','6d(5) burn','C,1','-1','2',['Force Sword'],{energy:true,hints:[...forceHints,'C/300 секунд, учёт вручную. Fine/Superfine и материалы обычного лезвия силовому полю не назначаются. UT166.']});
e=item('force-sword','e_rq2Zic5k-zlkaDV','Force Sword','11^',10000,2,['UT166','B208']);
const swordHints=[...forceHints,'C/300 секунд, учёт вручную. Variable Force Sword – только явно выбранная модификация этого экземпляра за +$500; длина C/1/2 меняется вручную с Ready. У обычного Force Sword Reach1,2. Fine/Superfine к полю не применяются. UT166.'];
mode(e,'wKrl1D1iujaCX9ssm','Активный Force Sword – штатный Reach','8d(5) burn','1,2','0','3',['Force Sword'],{energy:true,variableCapable:true,hints:swordHints});
for(const reach of ['C','1','2'])mode(e,'wUTM29VariableForce'+reach,'Variable Force Sword – Reach '+reach+' (+$500)','8d(5) burn',reach,'0','3',['Force Sword'],{energy:true,variableCapable:true,requiresVariable:true,hints:swordHints});
e=item('force-glaive','epO78WVzy60-BI_IB','Force Glaive','11^',14000,6,['UT166','B208','B273']);
mode(e,'wKaBftlfcmfO4Q3ph','Активный Force Glaive','9d(5) burn','2,3','0','7†',['Force Sword'],{energy:true,hints:[...forceHints,'2C/420 секунд, учёт вручную. Выключенный корпус имеет отдельные Baton/Staff режимы. UT166.']});
for(const [id,d,reach,parry,st,skill,label]of [
 ['wUTM29GlaiveBatonSw','sw cr','1','0','6','Shortsword','Baton Swing'],['wUTM29GlaiveBatonThr','thr cr','1','0','6','Shortsword','Baton Thrust'],
 ['wUTM29GlaiveStaffSw','sw+2 cr','1,2','+2','7†','Staff','Staff Swing'],['wUTM29GlaiveStaffThr','thr+2 cr','1,2','+2','7†','Staff','Staff Thrust']])
 mode(e,id,'Выключенный Force Glaive – '+label,d,reach,parry,st,[skill],{unpowered:true,hints:['Только фактически выключенный и сложенный силовой клинок: обычный Baton/Staff по UT166 и B273. Выбор списка не выключает питание и не меняет корпус. ST-based crushing, без 9d burn, AD(5), Force Parry и расхода энергии. Цена/масса остаются свойствами одного Force Glaive.']});
e=item('electric-stun-wand','eZeVIFqv3gxBGSIUZ','Electric Stun Wand',9,100,1,['UT164','UT165']);
for(const [id,d,name]of [['w7bLtfJugrIOJS70U','sw cr','Swing'],['wmZbVhgow5v78qhsX','thr cr','Thrust']])mode(e,id,name+' – механический удар Wand',d,'1','0','5',['Shortsword'],{partialSpecial:true,hints:['M2.9: только механический sw/thr cr. Контактный HT-5, knockdown/paralysis, recovery HT-5, Concentrate и B/20 разрядов переданы M2.10; автоматического эффекта/списания нет. UT165.','Утверждённая эррата E30 (UT165) исправляет таблицу: linked HT-5(0.5) aff; неметаллический DR1 даёт +2 к HT. Исходное (2) не применяется. HT-3 от High-Tech сюда не переносится. Электрическое исполнение остаётся для M2.10.']});
export const UT_ORDINARY_PROFILES=profiles,UT_ORDINARY_EQUIPMENT=items;
export const utOrdinarySource=id=>profiles[id]??null;
export const utOrdinaryAllowed=(p,s={})=>!p?.requiresVariable||s.blade==='variable-force-sword';
export const utOrdinaryHints=p=>[...p.hints,'Опубликованный ТУ '+p.techLevel+'; индивидуальный ТУ экземпляра не берётся из ТУ кампании. Ready, питание, защита и физическая конфигурация – вручную; снимок фиксирует выбранные условия. '+p.sourcePages.join('; ')+'.'];
export function utOrdinaryQuality(p,s={}, {imported=false,manualDamage=false,publishedInput=false}={}){
 const blade=s.blade||'',weaponTL=meleeWeaponTL(s);
 if(s.quality&&!['Good'].includes(s.quality)||s.balance||s.coating||s.material&&!['published'].includes(s.material))throw Error('Для этого UT-устройства такое качество/материал не подтверждены.');
 if(blade&&!['standard',...(p.morph?['superfine']:[]),...(p.variableCapable?['variable-force-sword']:[])].includes(blade))throw Error('Эта модификация не подтверждена для выбранной части UT.');
 if(blade==='superfine'&&(weaponTL===null||weaponTL<9))throw Error('Superfine требует индивидуальный ТУ оружия 9+ (UT163).');
 if(imported&&blade==='superfine'&&!publishedInput)throw Error('Для изменения импортированной конструкции выберите подтверждённый источниковый режим; исходный Damage не переписывается.');
 if(manualDamage&&blade==='superfine')throw Error('Superfine не пересчитывается поверх ручного Damage.');
 const edge=blade==='superfine'&&/ (cut|imp)$/.test(p.stats.damage);
 return {level:'Good',baseline:imported?'imported':'published',damageBonus:edge?2:0,damageTypes:['cut','imp'],armorDivisor:edge?2:null,
  materialTransform:edge?{type:p.stats.damage.split(' ').at(-1),divisor:2,replaceDivisor:true}:null,skillBonus:0,
  price:p.cost*(blade==='superfine'?6:1)+(blade==='variable-force-sword'?500:0),mass:p.mass,weaponTL,blade,material:'published',
  inputSource:publishedInput?'published-selected-mode':imported?'gga-import':'published',hints:utOrdinaryHints(p),sourcePages:p.sourcePages};
}
export function applyUTOrdinaryMode(m,e,{snapshot=false}={}){
 const p=profiles[m?.weapon_mode_id];if(!p||e?.source!=='UT'||e.equipment_id!==p.equipmentId)return m;
 const before=UT_ORDINARY_ORIGINAL_FIELDS[p.modeId],accept=(key,value,desired)=>!snapshot||before&&[before[key],desired].some(v=>JSON.stringify(v)===JSON.stringify(value));
 m.stats??={};m.raw_calc??={};
 if(accept('damage',m.raw_calc.damage,p.stats.damage)){const a=/^(sw|thr)([+-]\d+)? (\S+)$/.exec(p.stats.damage),b=/^(\d+d(?:[+-]\d+)?)\(([\d.]+)\) (\S+)$/.exec(p.stats.damage);
  m.raw_calc.damage=p.stats.damage;m.stats.damage=a?{st:a[1],...(a[2]?{base:a[2].replace(/^\+/,'')}:{}),type:a[3]}:{base:b[1],armor_divisor:Number(b[2]),type:b[3]};}
 for(const [field,key]of [['reach','reach'],['parry','parry'],['strength','st']])if(accept(key,m.stats[field],p.stats[key]))m.stats[field]=p.stats[key];
 if(accept('usage',m.usage,p.usage))m.usage=p.usage;
 m.ut_ordinary_contract={version:1,modelId:p.modelId,requiresVariable:p.requiresVariable===true,partialSpecial:p.partialSpecial===true};m.hand_use={value:p.hands===2?'two-handed':'one-handed',basis:'printed-source'};return m;
}
export function projectUTOrdinaryData(book,data){
 if(book!=='weapons')return data;
 for(const e of data.equipment.filter(e=>e.source==='UT')){
  const rows=Object.values(profiles).filter(p=>p.equipmentId===e.equipment_id);for(const p of rows)if(!e.modes.some(m=>m.weapon_mode_id===p.modeId))e.modes.push({weapon_mode_id:p.modeId,index:e.modes.length,usage:p.usage,combat_type:'melee',role:'attack',hidden:false,stats:{},raw_calc:{},defaults:[],action_hints:[],resolution_flags:[],weapon_family:'melee'});
  for(const m of e.modes)applyUTOrdinaryMode(m,e);
 }return data;
}
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};freeze(profiles);freeze(items);
